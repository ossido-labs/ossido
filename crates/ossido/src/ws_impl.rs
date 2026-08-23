//! WebSocket runtime support for Ossido applications.
//!
//! This module lives at the axum/tokio layer — **not** in the V8 SSR runtime,
//! which deliberately forbids live I/O. It provides:
//!
//! - A directional, typed JSON event protocol ([`WsEvent`], [`ServerWsEvent`],
//!   [`ClientWsEvent`]) with an adjacently-tagged wire envelope
//!   `{"event": "<name>", "data": { .. }}` and [`encode`] / [`decode`] helpers.
//! - A framework-owned, keyed connection store ([`SocketManager`]) reachable
//!   globally via [`sockets`], plus a per-socket [`Connection`] handle.
//!
//! See `crates/ossido/src/ws_impl.rs` referenced from the plan; the public
//! surface is re-exported from [`crate::ws`].

use std::any::{Any, TypeId};
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::sync::{Arc, RwLock};

use axum::extract::ws::{CloseFrame, Message, Utf8Bytes, WebSocket};
use futures_util::stream::{SplitSink, SplitStream};
use futures_util::{SinkExt, StreamExt};
use once_cell::sync::Lazy;
use serde::Serialize;
use serde::de::DeserializeOwned;
use serde_json::value::RawValue;
use tokio::sync::mpsc;

/// Per-connection outbound buffer. A bounded channel gives backpressure: when a
/// client is too slow to drain, further sends are dropped rather than growing an
/// unbounded queue.
const SEND_BUFFER: usize = 64;

/// Opaque, framework-assigned connection identifier. Unique for the lifetime of
/// the process; addressing by app **key** (see [`SocketManager::send_to_key`]) is
/// usually preferable.
pub type ConnId = u64;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/// Errors surfaced by the WebSocket runtime.
#[derive(Debug)]
pub enum WsError {
    /// (De)serializing the JSON envelope failed.
    Json(serde_json::Error),
    /// [`Incoming::parse`] was asked for an event whose name does not match the
    /// frame's `event` field.
    EventMismatch { expected: &'static str, got: String },
    /// A control/close frame was passed where a data frame was expected.
    NotADataFrame,
    /// The peer closed the connection (or the socket errored).
    Closed,
    /// The outbound buffer was full or the writer task has gone away.
    Send,
}

impl std::fmt::Display for WsError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WsError::Json(err) => write!(f, "websocket JSON error: {err}"),
            WsError::EventMismatch { expected, got } => {
                write!(f, "expected event '{expected}', got '{got}'")
            }
            WsError::NotADataFrame => write!(f, "expected a text/binary data frame"),
            WsError::Closed => write!(f, "websocket connection closed"),
            WsError::Send => write!(f, "failed to send websocket message"),
        }
    }
}

impl std::error::Error for WsError {}

impl From<serde_json::Error> for WsError {
    fn from(err: serde_json::Error) -> Self {
        WsError::Json(err)
    }
}

// ---------------------------------------------------------------------------
// Directional, typed events
// ---------------------------------------------------------------------------

/// A named JSON event. Implemented by structs annotated with
/// `#[ossido::server_ws_event("name")]` or `#[ossido::client_ws_event("name")]`.
/// The `EVENT` name is the discriminant in the `{"event", "data"}` wire envelope.
pub trait WsEvent: Serialize + DeserializeOwned {
    /// The event name (wire discriminant).
    const EVENT: &'static str;
}

/// An event the **server sends** to the client (server → client). Only these can
/// be passed to [`SocketManager`]/[`Connection`] send methods, so the server can
/// never send a client-only event.
pub trait ServerWsEvent: WsEvent {}

/// An event the **client sends** to the server (client → server). Only these can
/// be produced by [`Incoming::parse`], so the server can never decode a
/// server-only event.
pub trait ClientWsEvent: WsEvent {}

/// The outbound envelope, serialized as `{"event": "<name>", "data": <ev>}`.
#[derive(Serialize)]
struct OutEnvelope<'a, T: Serialize> {
    event: &'static str,
    data: &'a T,
}

/// The inbound envelope: the event name plus its still-raw `data`, parsed on
/// demand into a concrete [`ClientWsEvent`].
#[derive(serde::Deserialize)]
struct InEnvelope {
    event: String,
    data: Box<RawValue>,
}

/// A received event frame: its `event` name and the raw `data`, deserialized into
/// a concrete type on demand via [`Incoming::parse`].
pub struct Incoming {
    event: String,
    data: Box<RawValue>,
}

impl Incoming {
    /// The event name from the wire envelope.
    pub fn event(&self) -> &str {
        &self.event
    }

    /// Deserialize the `data` payload into a concrete client event `E`. Errors if
    /// the frame's event name does not match `E::EVENT`.
    pub fn parse<E: ClientWsEvent>(&self) -> Result<E, WsError> {
        if self.event != E::EVENT {
            return Err(WsError::EventMismatch {
                expected: E::EVENT,
                got: self.event.clone(),
            });
        }
        Ok(serde_json::from_str(self.data.get())?)
    }
}

/// Serialize a server event into a text WebSocket [`Message`] carrying the
/// `{"event", "data"}` envelope.
pub fn encode<E: ServerWsEvent>(ev: &E) -> Result<Message, WsError> {
    let envelope = OutEnvelope {
        event: E::EVENT,
        data: ev,
    };
    let text = serde_json::to_string(&envelope)?;
    Ok(Message::Text(Utf8Bytes::from(text)))
}

/// Parse a text/binary WebSocket [`Message`] into an [`Incoming`] envelope.
pub fn decode(message: &Message) -> Result<Incoming, WsError> {
    let envelope: InEnvelope = match message {
        Message::Text(text) => serde_json::from_str(text.as_str())?,
        Message::Binary(bytes) => serde_json::from_slice(bytes)?,
        _ => return Err(WsError::NotADataFrame),
    };
    Ok(Incoming {
        event: envelope.event,
        data: envelope.data,
    })
}

// ---------------------------------------------------------------------------
// Split socket halves
// ---------------------------------------------------------------------------

type WsSink = SplitSink<WebSocket, Message>;
type WsStream = SplitStream<WebSocket>;

/// The write half of a split socket. Sends typed server events (or raw frames).
pub struct TypedSink {
    inner: WsSink,
}

impl TypedSink {
    /// Send a typed server → client event.
    pub async fn send<E: ServerWsEvent>(&mut self, ev: &E) -> Result<(), WsError> {
        self.inner
            .send(encode(ev)?)
            .await
            .map_err(|_| WsError::Send)
    }

    /// Send a raw frame (escape hatch for pings, close frames, binary, …).
    pub async fn send_raw(&mut self, message: Message) -> Result<(), WsError> {
        self.inner.send(message).await.map_err(|_| WsError::Send)
    }

    /// Close the write half.
    pub async fn close(&mut self) {
        let _ = self.inner.close().await;
    }
}

/// The read half of a split socket. Yields inbound [`Incoming`] event frames,
/// transparently skipping ping/pong control frames.
pub struct TypedStream {
    inner: WsStream,
}

impl TypedStream {
    /// Read the next inbound data frame as an [`Incoming`] envelope. Returns
    /// `None` once the peer closes the connection.
    pub async fn recv(&mut self) -> Option<Result<Incoming, WsError>> {
        loop {
            match self.inner.next().await? {
                Ok(message) => match &message {
                    Message::Text(_) | Message::Binary(_) => return Some(decode(&message)),
                    Message::Close(_) => return None,
                    // Ping/Pong are handled by axum; skip them.
                    _ => continue,
                },
                Err(_) => return Some(Err(WsError::Closed)),
            }
        }
    }
}

/// A thin typed wrapper over an un-split axum [`WebSocket`], for handlers that
/// prefer to drive the socket directly instead of storing it in the
/// [`SocketManager`]. Provides typed send/recv and a [`TypedSocket::split`].
pub struct TypedSocket {
    inner: WebSocket,
}

impl TypedSocket {
    /// Wrap a raw upgraded socket.
    pub fn new(socket: WebSocket) -> Self {
        Self { inner: socket }
    }

    /// Send a typed server → client event.
    pub async fn send_event<E: ServerWsEvent>(&mut self, ev: &E) -> Result<(), WsError> {
        self.inner
            .send(encode(ev)?)
            .await
            .map_err(|_| WsError::Send)
    }

    /// Read the next inbound data frame as an [`Incoming`] envelope.
    pub async fn recv(&mut self) -> Option<Result<Incoming, WsError>> {
        loop {
            match self.inner.recv().await? {
                Ok(message) => match &message {
                    Message::Text(_) | Message::Binary(_) => return Some(decode(&message)),
                    Message::Close(_) => return None,
                    _ => continue,
                },
                Err(_) => return Some(Err(WsError::Closed)),
            }
        }
    }

    /// Split into typed write/read halves.
    pub fn split(self) -> (TypedSink, TypedStream) {
        split_socket(self.inner)
    }

    /// Recover the raw axum socket.
    pub fn into_inner(self) -> WebSocket {
        self.inner
    }
}

fn split_socket(socket: WebSocket) -> (TypedSink, TypedStream) {
    let (sink, stream) = socket.split();
    (TypedSink { inner: sink }, TypedStream { inner: stream })
}

// ---------------------------------------------------------------------------
// SocketManager + Connection (keyed store)
// ---------------------------------------------------------------------------

// --- Generic, type-erased keys ---------------------------------------------

/// Anything usable as a connection key: cheap to store, compare, and hash, and
/// safe to share across tasks. Blanket-implemented, so `u64`, `String`, a custom
/// `#[derive(Clone, PartialEq, Eq, Hash)]` enum, etc. all qualify — no manual
/// impl needed.
pub trait Key: Eq + Hash + Clone + Send + Sync + 'static {}
impl<K: Eq + Hash + Clone + Send + Sync + 'static> Key for K {}

/// Object-safe shim so a single (non-generic) [`SocketManager`] can hold keys of
/// any [`Key`] type at once. The concrete `TypeId` is mixed into the hash and
/// checked on equality, so keys of different types never collide.
trait DynKey: Send + Sync {
    fn dyn_eq(&self, other: &dyn DynKey) -> bool;
    fn dyn_hash(&self, state: &mut dyn Hasher);
    fn dyn_clone(&self) -> Box<dyn DynKey>;
    fn as_any(&self) -> &dyn Any;
}

impl<K: Key> DynKey for K {
    fn dyn_eq(&self, other: &dyn DynKey) -> bool {
        other.as_any().downcast_ref::<K>() == Some(self)
    }
    fn dyn_hash(&self, mut state: &mut dyn Hasher) {
        TypeId::of::<K>().hash(&mut state);
        self.hash(&mut state);
    }
    fn dyn_clone(&self) -> Box<dyn DynKey> {
        Box::new(self.clone())
    }
    fn as_any(&self) -> &dyn Any {
        self
    }
}

/// A type-erased key, used as the registry's `HashMap` key.
struct BoxedKey(Box<dyn DynKey>);

impl BoxedKey {
    fn new<K: Key>(key: K) -> Self {
        BoxedKey(Box::new(key))
    }
}

impl PartialEq for BoxedKey {
    fn eq(&self, other: &Self) -> bool {
        self.0.dyn_eq(other.0.as_ref())
    }
}
impl Eq for BoxedKey {}
impl Hash for BoxedKey {
    fn hash<H: Hasher>(&self, state: &mut H) {
        self.0.dyn_hash(state);
    }
}
impl Clone for BoxedKey {
    fn clone(&self) -> Self {
        BoxedKey(self.0.dyn_clone())
    }
}
impl std::fmt::Debug for BoxedKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("BoxedKey")
    }
}

// --- SocketManager + Connection + handles ----------------------------------

struct ConnState {
    tx: mpsc::Sender<Message>,
    /// The keys this connection is registered under (for cleanup on drop).
    keys: Vec<BoxedKey>,
}

#[derive(Default)]
struct Registry {
    conns: HashMap<ConnId, ConnState>,
    keys: HashMap<BoxedKey, HashSet<ConnId>>,
    next_id: ConnId,
}

/// A cheap, cloneable handle over the framework's keyed connection store.
///
/// Reach it anywhere via [`sockets`]; it is also injectable as a `#[ossido::ws]`
/// (or `#[handler]`/`#[api]`/`#[action]`) parameter. Store a socket with
/// [`SocketManager::store`] under any [`Key`] (a `u64` user id, a `String` room
/// name, a custom enum, …), then look connections back up with
/// [`SocketManager::get`] and send on the returned [`SocketGroup`].
#[derive(Clone, Default)]
pub struct SocketManager(Arc<RwLock<Registry>>);

impl SocketManager {
    /// Take ownership of an upgraded socket and store it under `key`. Splits the
    /// socket, spawns its writer task, and indexes it; returns a [`Connection`]
    /// for reading inbound events. Dropping the returned `Connection`
    /// unregisters it.
    pub fn store<K: Key>(&self, key: K, socket: WebSocket) -> Connection {
        let (mut sink, stream) = split_socket(socket);
        let (tx, mut rx) = mpsc::channel::<Message>(SEND_BUFFER);
        let boxed = BoxedKey::new(key);

        let id = {
            let mut registry = self.0.write().unwrap();
            let id = registry.next_id;
            registry.next_id = registry.next_id.wrapping_add(1);
            registry.conns.insert(
                id,
                ConnState {
                    tx: tx.clone(),
                    keys: vec![boxed.clone()],
                },
            );
            registry.keys.entry(boxed).or_default().insert(id);
            id
        };

        // One writer task per connection owns the sink and drains the channel.
        tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if sink.send_raw(message).await.is_err() {
                    break;
                }
            }
            sink.close().await;
        });

        Connection {
            id,
            manager: self.clone(),
            stream,
            tx,
        }
    }

    /// Look up the connections stored under `key`. A key may hold several
    /// connections (e.g. one user with multiple tabs), so this returns a
    /// [`SocketGroup`] — send once and it fans out to all of them. The group is
    /// empty if nothing is stored under `key`.
    pub fn get<K: Key>(&self, key: &K) -> SocketGroup {
        let boxed = BoxedKey::new(key.clone());
        let registry = self.0.read().unwrap();
        let handles = registry
            .keys
            .get(&boxed)
            .into_iter()
            .flatten()
            .filter_map(|id| {
                registry.conns.get(id).map(|conn| SocketHandle {
                    id: *id,
                    tx: conn.tx.clone(),
                })
            })
            .collect();
        SocketGroup { handles }
    }

    /// Send a typed server event to every live connection.
    pub async fn broadcast<E: ServerWsEvent>(&self, ev: &E) {
        let Ok(message) = encode(ev) else { return };
        let txs = {
            let registry = self.0.read().unwrap();
            registry
                .conns
                .values()
                .map(|c| c.tx.clone())
                .collect::<Vec<_>>()
        };
        for tx in txs {
            let _ = tx.try_send(message.clone());
        }
    }

    /// The number of live connections.
    pub fn count(&self) -> usize {
        self.0.read().unwrap().conns.len()
    }

    // --- internal helpers -------------------------------------------------

    fn add_key_boxed(&self, id: ConnId, boxed: BoxedKey) {
        let mut registry = self.0.write().unwrap();
        if let Some(conn) = registry.conns.get_mut(&id) {
            conn.keys.push(boxed.clone());
        }
        registry.keys.entry(boxed).or_default().insert(id);
    }

    fn unregister(&self, id: ConnId) {
        let mut registry = self.0.write().unwrap();
        let Some(conn) = registry.conns.remove(&id) else {
            return;
        };
        for key in conn.keys {
            if let Some(ids) = registry.keys.get_mut(&key) {
                ids.remove(&id);
                if ids.is_empty() {
                    registry.keys.remove(&key);
                }
            }
        }
    }
}

/// A cheap, cloneable sender for one live connection — the write side, safe to
/// hold and use from anywhere. Obtained from [`SocketGroup`] / [`Connection`].
#[derive(Clone)]
pub struct SocketHandle {
    id: ConnId,
    tx: mpsc::Sender<Message>,
}

impl SocketHandle {
    /// The connection's id.
    pub fn id(&self) -> ConnId {
        self.id
    }

    /// Send a typed server event to this connection.
    pub async fn send<E: ServerWsEvent>(&self, ev: &E) -> Result<(), WsError> {
        self.tx.try_send(encode(ev)?).map_err(|_| WsError::Send)
    }

    /// Close this connection with a status code.
    pub async fn close(&self, code: u16) {
        let _ = self.tx.try_send(Message::Close(Some(CloseFrame {
            code,
            reason: Utf8Bytes::from_static(""),
        })));
    }
}

/// The connections currently stored under a key (0, 1, or many). Returned by
/// [`SocketManager::get`]. Sending on the group fans out to every connection.
pub struct SocketGroup {
    handles: Vec<SocketHandle>,
}

impl SocketGroup {
    /// Send a typed server event to every connection in the group.
    pub async fn send<E: ServerWsEvent>(&self, ev: &E) {
        let Ok(message) = encode(ev) else { return };
        for handle in &self.handles {
            let _ = handle.tx.try_send(message.clone());
        }
    }

    /// Close every connection in the group with a status code.
    pub async fn close(&self, code: u16) {
        for handle in &self.handles {
            handle.close(code).await;
        }
    }

    /// The number of connections in the group.
    pub fn len(&self) -> usize {
        self.handles.len()
    }

    /// Whether the group has no connections.
    pub fn is_empty(&self) -> bool {
        self.handles.is_empty()
    }

    /// Iterate the individual connection handles.
    pub fn iter(&self) -> std::slice::Iter<'_, SocketHandle> {
        self.handles.iter()
    }
}

impl<'a> IntoIterator for &'a SocketGroup {
    type Item = &'a SocketHandle;
    type IntoIter = std::slice::Iter<'a, SocketHandle>;
    fn into_iter(self) -> Self::IntoIter {
        self.handles.iter()
    }
}

/// The read side of a stored socket, plus the means to reply to and re-key this
/// connection. Returned by [`SocketManager::store`]. Dropping it unregisters the
/// connection from the manager (its `ConnId` and every key index).
pub struct Connection {
    id: ConnId,
    manager: SocketManager,
    stream: TypedStream,
    tx: mpsc::Sender<Message>,
}

impl Connection {
    /// This connection's id.
    pub fn id(&self) -> ConnId {
        self.id
    }

    /// A cloneable [`SocketHandle`] for sending to this connection from elsewhere.
    pub fn handle(&self) -> SocketHandle {
        SocketHandle {
            id: self.id,
            tx: self.tx.clone(),
        }
    }

    /// Also store this connection under an additional key.
    pub fn add_key<K: Key>(&self, key: K) {
        self.manager.add_key_boxed(self.id, BoxedKey::new(key));
    }

    /// Read the next inbound client event (skips control frames; `None` on close).
    pub async fn recv(&mut self) -> Option<Result<Incoming, WsError>> {
        self.stream.recv().await
    }

    /// Send a typed server event back to this client.
    pub async fn send<E: ServerWsEvent>(&self, ev: &E) -> Result<(), WsError> {
        self.tx.try_send(encode(ev)?).map_err(|_| WsError::Send)
    }

    /// Close this connection with a status code.
    pub async fn close(self, code: u16) {
        let _ = self.tx.try_send(Message::Close(Some(CloseFrame {
            code,
            reason: Utf8Bytes::from_static(""),
        })));
        // `self` drops here → unregister.
    }
}

impl Drop for Connection {
    fn drop(&mut self) {
        self.manager.unregister(self.id);
    }
}

/// The process-global [`SocketManager`]. Always available (no explicit init
/// required); usable from any handler, action, or task.
static MANAGER: Lazy<SocketManager> = Lazy::new(SocketManager::default);

/// The process-global [`SocketManager`] handle.
pub fn sockets() -> SocketManager {
    MANAGER.clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Serialize, serde::Deserialize)]
    struct Ping {
        n: u64,
    }
    impl WsEvent for Ping {
        const EVENT: &'static str = "ping";
    }
    impl ServerWsEvent for Ping {}
    impl ClientWsEvent for Ping {}

    #[test]
    fn encode_produces_the_tagged_envelope() {
        let message = encode(&Ping { n: 7 }).unwrap();
        let Message::Text(text) = message else {
            panic!("expected text frame");
        };
        assert_eq!(text.as_str(), r#"{"event":"ping","data":{"n":7}}"#);
    }

    #[test]
    fn decode_then_parse_round_trips() {
        let message = encode(&Ping { n: 42 }).unwrap();
        let incoming = decode(&message).unwrap();
        assert_eq!(incoming.event(), "ping");
        let parsed: Ping = incoming.parse().unwrap();
        assert_eq!(parsed.n, 42);
    }

    #[test]
    fn boxed_keys_compare_within_a_type_and_differ_across_types() {
        use std::collections::HashMap;

        // Same value, same type → equal.
        assert_eq!(BoxedKey::new(42u64), BoxedKey::new(42u64));
        // Same numeric value, different type → not equal.
        assert_ne!(BoxedKey::new(42u64), BoxedKey::new(42u32));
        // Different values → not equal.
        assert_ne!(BoxedKey::new("a"), BoxedKey::new("b"));

        // Usable as a map key, keyed by (type, value).
        let mut map: HashMap<BoxedKey, u8> = HashMap::new();
        map.insert(BoxedKey::new(1u64), 10);
        map.insert(BoxedKey::new(1u32), 20);
        map.insert(BoxedKey::new("1"), 30);
        assert_eq!(map.get(&BoxedKey::new(1u64)), Some(&10));
        assert_eq!(map.get(&BoxedKey::new(1u32)), Some(&20));
        assert_eq!(map.get(&BoxedKey::new("1")), Some(&30));
        assert_eq!(map.len(), 3);
    }

    #[test]
    fn parse_rejects_a_mismatched_event_name() {
        #[derive(Serialize, serde::Deserialize)]
        struct Other {
            x: u8,
        }
        impl WsEvent for Other {
            const EVENT: &'static str = "other";
        }
        impl ClientWsEvent for Other {}

        let incoming = decode(&encode(&Ping { n: 1 }).unwrap()).unwrap();
        assert!(matches!(
            incoming.parse::<Other>(),
            Err(WsError::EventMismatch { .. })
        ));
    }
}
