//! Runtime-provided `Event` / `MessageEvent` / `MessagePort` /
//! `MessageChannel`, replacing the bundle-side polyfills.
//!
//! `MessageChannel` is how React's Fizz renderer schedules work in
//! non-`setImmediate` environments, so it must exist before any bundle
//! evaluates. Delivery rides the runtime's native virtual-time timer queue
//! (`setTimeout`, installed by `install_timers`) — a `postMessage` is one
//! macrotask, exactly the semantics the previous JS shim had, minus the
//! bundle needing to ship it.
//!
//! Classic-script isolates (`Ssr::from`) are timerless by design; there the
//! bootstrap leaves the channel undefined rather than lying about async
//! delivery it cannot provide.

/// Spec-lite but honest event + channel classes. Installed with `||` guards so
/// an environment (or bundle) that already defines them wins.
pub(crate) const MESSAGE_CHANNEL_BOOTSTRAP: &str = r#"
(function () {
  "use strict";
  // No macrotask source, no channel: classic-script isolates are
  // microtask-only and cannot deliver `postMessage` asynchronously.
  if (typeof setTimeout !== "function") return;

  class Event {
    constructor(type, init) {
      if (arguments.length === 0) {
        throw new TypeError("Failed to construct 'Event': 1 argument required, but only 0 present.");
      }
      this.type = String(type);
      this.bubbles = !!(init && init.bubbles);
      this.cancelable = !!(init && init.cancelable);
      this.composed = !!(init && init.composed);
      this.defaultPrevented = false;
      this.target = null;
      this.currentTarget = null;
      this.eventPhase = 0;
      this.isTrusted = false;
      this.timeStamp = Date.now();
    }
    preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
    stopPropagation() {}
    stopImmediatePropagation() {}
  }

  class MessageEvent extends Event {
    constructor(type, init) {
      super(type, init);
      this.data = init && "data" in init ? init.data : null;
      this.origin = (init && init.origin) || "";
      this.lastEventId = (init && init.lastEventId) || "";
      this.source = (init && init.source) || null;
      this.ports = (init && init.ports) || [];
    }
  }

  class MessagePort {
    constructor() {
      this.onmessage = null;
      this.onmessageerror = null;
      this._other = null;
      this._closed = false;
      this._listeners = [];
    }
    postMessage(data) {
      const target = this._other;
      if (!target || this._closed || target._closed) return;
      setTimeout(function () {
        if (target._closed) return;
        const event = new MessageEvent("message", { data: data });
        event.target = target;
        event.currentTarget = target;
        if (typeof target.onmessage === "function") target.onmessage(event);
        const listeners = target._listeners.slice();
        for (let i = 0; i < listeners.length; i++) listeners[i].call(target, event);
      }, 0);
    }
    addEventListener(type, listener) {
      if (type === "message" && typeof listener === "function" && this._listeners.indexOf(listener) === -1) {
        this._listeners.push(listener);
      }
    }
    removeEventListener(type, listener) {
      const index = this._listeners.indexOf(listener);
      if (index !== -1) this._listeners.splice(index, 1);
    }
    start() {}
    close() { this._closed = true; }
  }

  class MessageChannel {
    constructor() {
      this.port1 = new MessagePort();
      this.port2 = new MessagePort();
      this.port1._other = this.port2;
      this.port2._other = this.port1;
    }
  }

  globalThis.Event = globalThis.Event || Event;
  globalThis.MessageEvent = globalThis.MessageEvent || MessageEvent;
  globalThis.MessagePort = globalThis.MessagePort || MessagePort;
  globalThis.MessageChannel = globalThis.MessageChannel || MessageChannel;
})();
"#;
