# with-websockets

Ossido's typed WebSocket events, as a small broadcast chat:

- `src/ws.rs` — the project's single `#[ossido::ws]` handler. Events are
  declared directionally with `#[client_ws_event]` / `#[server_ws_event]`;
  the `SocketManager` keyed store broadcasts to every connection in a group.
- `src/routes/page.tsx` — the browser side using `connect()` from
  `@ossido-labs/ossido/ws`. Both event maps are generated into
  `.ossido/types.ts`, so `socket.on` / `socket.send` are fully typed.

Open the page in two tabs and chat between them.

```sh
ossido new my-app --template with-websockets
npm install
ossido dev
```
