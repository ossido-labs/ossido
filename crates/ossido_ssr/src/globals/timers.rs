//! The native virtual-time timer globals (`setTimeout` / `setImmediate` /
//! `clearTimeout` / `clearImmediate`) and the macrotask queue behind them.
//!
//! Unlike the registry-installed globals in [`super`], the timers own state
//! with an isolate-slot lifecycle: [`install_timers`] is called explicitly by
//! the module constructor in `ssr.rs`, which owns the returned queue pointer
//! and frees it on drop. The render pump (`pump_until`) drives the queue via
//! [`run_macrotasks`] / [`reset_macrotasks`].

use std::cmp::Reverse;
use std::collections::BinaryHeap;
use std::ffi::c_void;

/// Isolate data slot holding the pointer to this isolate's [`TimerQueue`].
const TIMER_SLOT: u32 = 1;

/// One scheduled timer (a `setTimeout`/`setImmediate` callback).
struct Timer {
    id: u32,
    /// Virtual due time (ms). Timers fire in `due` then insertion order.
    due: f64,
    seq: u64,
    callback: v8::Global<v8::Function>,
}

// Order timers by (due, seq) — the firing order — ignoring the callback, so a
// `BinaryHeap<Reverse<Timer>>` pops the earliest-scheduled timer first without
// re-sorting the whole queue every generation. `seq` is unique per queue, so
// the total order is well-defined even for equal (or NaN-free) `due` values.
impl PartialEq for Timer {
    fn eq(&self, other: &Self) -> bool {
        self.due.total_cmp(&other.due).is_eq() && self.seq == other.seq
    }
}
impl Eq for Timer {}
impl PartialOrd for Timer {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Timer {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        self.due
            .total_cmp(&other.due)
            .then(self.seq.cmp(&other.seq))
    }
}

/// A native, virtual-time macrotask queue backing `setTimeout` /`setImmediate` /
/// `clearTimeout` (and, transitively, `MessageChannel` delivery) inside the
/// isolate — the same shape a real embedded-V8 runtime (e.g. Deno) uses, but on
/// a **virtual clock**: draining jumps time to the earliest pending timer so
/// `setTimeout(fn, 500)` fires instantly and static generation stays fast.
///
/// Owned (boxed) by the [`Ssr`]; a raw pointer is stashed in the isolate's
/// [`TIMER_SLOT`] so the native timer callbacks and the drain can reach it.
#[derive(Default)]
pub(crate) struct TimerQueue {
    /// Min-heap on (due, seq) via [`Reverse`]: the next timer to fire is
    /// `peek()`, with no per-generation re-sort.
    tasks: BinaryHeap<Reverse<Timer>>,
    /// Ids cancelled by `clearTimeout`, dropped lazily as they surface at the
    /// head of the heap. An id that never fires (already ran, or bogus) stays
    /// until [`reset_macrotasks`] clears the set at the next render.
    cleared: std::collections::HashSet<u32>,
    virtual_now: f64,
    next_id: u32,
    seq: u64,
}

/// Borrow the isolate's [`TimerQueue`] via [`TIMER_SLOT`], if installed.
fn timer_queue<'a>(scope: &mut v8::HandleScope) -> Option<&'a mut TimerQueue> {
    let ptr = scope.get_data(TIMER_SLOT) as *mut TimerQueue;
    if ptr.is_null() {
        None
    } else {
        // Safety: the pointer is the address of the `Box<TimerQueue>` the `Ssr`
        // owns for this isolate's lifetime; it is single-threaded and cleared in
        // `Drop` before the isolate is freed.
        Some(unsafe { &mut *ptr })
    }
}

/// `setTimeout(cb, delay?)` / `setImmediate(cb)` — enqueue a callback and return
/// its numeric id. A missing / non-finite delay is treated as `0`.
fn set_timeout_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    mut rv: v8::ReturnValue,
) {
    let Ok(func) = v8::Local::<v8::Function>::try_from(args.get(0)) else {
        return;
    };
    let delay = args
        .get(1)
        .number_value(scope)
        .filter(|delay| delay.is_finite())
        .map(|delay| delay.max(0.0))
        .unwrap_or(0.0);
    let callback = v8::Global::new(scope, func);

    let Some(queue) = timer_queue(scope) else {
        return;
    };
    let id = queue.next_id;
    queue.next_id = queue.next_id.wrapping_add(1);
    let seq = queue.seq;
    queue.seq += 1;
    queue.tasks.push(Reverse(Timer {
        id,
        due: queue.virtual_now + delay,
        seq,
        callback,
    }));

    rv.set(v8::Integer::new(scope, id as i32).into());
}

/// `clearTimeout(id)` / `clearImmediate(id)` — cancel a pending timer.
fn clear_timeout_callback(
    scope: &mut v8::HandleScope,
    args: v8::FunctionCallbackArguments,
    _rv: v8::ReturnValue,
) {
    let Some(id) = args.get(0).number_value(scope) else {
        return;
    };
    if id.is_finite() && id >= 0.0 {
        if let Some(queue) = timer_queue(scope) {
            queue.cleared.insert(id as u32);
        }
    }
}

/// Install the native timer globals and the isolate's [`TimerQueue`]. Must run
/// before the bundle executes so `setTimeout` exists when it does. Returns the
/// queue pointer for the [`Ssr`] to own and free.
pub(crate) fn install_timers(
    scope: &mut v8::HandleScope,
    isolate: *mut v8::OwnedIsolate,
) -> *mut TimerQueue {
    let queue = Box::into_raw(Box::new(TimerQueue::default()));
    unsafe { (*isolate).set_data(TIMER_SLOT, queue as *mut c_void) };

    // `setImmediate(cb)` is `setTimeout(cb)` with no delay (→ 0); the same
    // callback handles both. Likewise `clearImmediate` == `clearTimeout`.
    super::set_global_fn(scope, "setTimeout", set_timeout_callback);
    super::set_global_fn(scope, "setImmediate", set_timeout_callback);
    super::set_global_fn(scope, "clearTimeout", clear_timeout_callback);
    super::set_global_fn(scope, "clearImmediate", clear_timeout_callback);

    queue
}

/// Run one generation of due timers (the macrotask drain): fire every timer due
/// at the current virtual time, advancing the clock to the earliest pending
/// timer when nothing is due yet. Returns whether any timer ran — the progress
/// signal for [`pump_until`]'s bounded guard. A timer that enqueues more work
/// runs on a later generation, so the host can re-pump microtasks between
/// generations (a real event-loop turn).
pub(crate) fn run_macrotasks(scope: &mut v8::HandleScope) -> bool {
    let due: Vec<v8::Global<v8::Function>> = {
        let Some(queue) = timer_queue(scope) else {
            return false;
        };

        // Drop cancelled timers as they surface at the head, so the earliest
        // *live* timer is the peek. (The heap is a min-heap on (due, seq).)
        while let Some(Reverse(head)) = queue.tasks.peek() {
            if queue.cleared.remove(&head.id) {
                queue.tasks.pop();
            } else {
                break;
            }
        }
        let Some(Reverse(head)) = queue.tasks.peek() else {
            return false;
        };

        if head.due > queue.virtual_now {
            queue.virtual_now = head.due;
        }
        let now = queue.virtual_now;

        // Take the generation due at `now`; a fired timer may enqueue more,
        // which lands in the heap for the next call.
        let mut due = Vec::new();
        while let Some(Reverse(head)) = queue.tasks.peek() {
            if head.due > now {
                break;
            }
            let Some(Reverse(timer)) = queue.tasks.pop() else {
                break;
            };
            if !queue.cleared.remove(&timer.id) {
                due.push(timer.callback);
            }
        }
        due
    };

    if due.is_empty() {
        return false;
    }

    for callback in &due {
        // A `TryCatch` contains (and clears on drop) any exception a timer
        // throws, so it can't leave a pending exception that poisons the next
        // call — which is also what makes draining safe *during* a module's
        // top-level-await evaluation.
        let try_catch = &mut v8::TryCatch::new(scope);
        let function = v8::Local::new(try_catch, callback);
        let undefined = v8::undefined(try_catch).into();
        let _ = function.call(try_catch, undefined, &[]);
    }
    true
}

/// Drop any queued timers before a render so leftover work from a prior
/// aborted/panicked render on a pool-reused isolate can't run during this one.
pub(crate) fn reset_macrotasks(scope: &mut v8::HandleScope) {
    if let Some(queue) = timer_queue(scope) {
        queue.tasks.clear();
        queue.cleared.clear();
        queue.virtual_now = 0.0;
        queue.seq = 0;
        // `next_id` stays monotonic — ids need not be reused across renders.
    }
}
