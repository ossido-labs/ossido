/**
 * A tiny, unopinionated client for a project's single WebSocket endpoint (the
 * `#[ossido::ws]` handler in `src/ws.rs`, served at `/__ossido/ws`).
 *
 * Messages are the directional JSON events declared with
 * `#[ossido::server_ws_event]` / `#[ossido::client_ws_event]`. Their maps are
 * generated into `.ossido/types.ts` as merges into the global interfaces below:
 *
 * ```ts
 * interface OssidoServerWsEvents {
 *   "user_joined": import("@ossido-labs/ossido/types").UserJoined
 * }
 * interface OssidoClientWsEvents {
 *   "chat_message": import("@ossido-labs/ossido/types").ChatMessage
 * }
 * ```
 *
 * ```ts
 * import { connect } from '@ossido-labs/ossido/ws'
 *
 * const socket = connect()
 * socket.on((event) => {
 *   if (event.event === 'user_joined') console.log(event.data.user_id)
 * })
 * socket.send({ event: 'chat_message', data: { text: 'hi' } })
 * ```
 */

declare global {
  /**
   * server → client events (the client **receives** these). The generated
   * `.ossido/types.ts` merges the concrete events into this global interface
   * (event name → data type). Empty until generated.
   *
   * A **global** interface rather than a module-augmentation target on purpose:
   * `.ossido/types.ts` is a global script, so a `declare module` there would
   * *shadow* this module (hiding `connect`) instead of augmenting it — global
   * interfaces merge across files without that hazard.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface OssidoServerWsEvents {}
  /**
   * client → server events (the client **sends** these). Merged from the
   * generated `.ossido/types.ts`; empty until generated.
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface OssidoClientWsEvents {}
}

/** Build a discriminated `{ event, data }` union from an event-name → data map. */
type EventUnion<M> = {
  [K in keyof M & string]: { event: K; data: M[K] };
}[keyof M & string];

/**
 * Events the client receives. Falls back to a permissive shape when a project
 * hasn't generated its types yet (so `connect` stays usable, just untyped).
 */
export type ServerWsEvent = keyof OssidoServerWsEvents extends never
  ? { event: string; data: unknown }
  : EventUnion<OssidoServerWsEvents>;

/** Events the client may send (same fallback behaviour as {@link ServerWsEvent}). */
export type ClientWsEvent = keyof OssidoClientWsEvents extends never
  ? { event: string; data: unknown }
  : EventUnion<OssidoClientWsEvents>;

/** A typed handle over the browser `WebSocket` connected to `/__ossido/ws`. */
export interface OssidoSocket {
  /** The underlying browser `WebSocket`, for any lower-level needs. */
  raw: WebSocket;
  /**
   * Subscribe to inbound server events. Returns an unsubscribe function.
   * Malformed (non-JSON) frames are ignored.
   */
  on(handler: (event: ServerWsEvent) => void): () => void;
  /** Send a typed client event as the `{ event, data }` JSON envelope. */
  send(event: ClientWsEvent): void;
  /** Close the connection. */
  close(code?: number, reason?: string): void;
}

/**
 * Open a connection to the project's WebSocket endpoint. Resolves the
 * `ws(s)://` scheme from the current origin; forwards `protocols` (e.g. for
 * subprotocol-based auth). Same-origin cookies are sent automatically on the
 * handshake.
 */
export function connect(options?: {
  protocols?: string | Array<string>;
}): OssidoSocket {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(
    `${scheme}//${location.host}/__ossido/ws`,
    options?.protocols,
  );

  return {
    raw: socket,
    on(handler) {
      const listener = (message: MessageEvent): void => {
        let parsed: ServerWsEvent;
        try {
          parsed = JSON.parse(message.data as string) as ServerWsEvent;
        } catch {
          return;
        }
        handler(parsed);
      };
      socket.addEventListener('message', listener);
      return () => socket.removeEventListener('message', listener);
    },
    send(event) {
      socket.send(JSON.stringify(event));
    },
    close(code, reason) {
      socket.close(code, reason);
    },
  };
}
