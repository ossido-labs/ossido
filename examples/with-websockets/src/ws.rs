//! The project's single WebSocket handler (served at `/__ossido/ws`): a small
//! broadcast chat. Every inbound `chat_message` is fanned out to every
//! connection in the `"chat"` group as a `message` event.

use ossido::ws::{Connection, SocketManager, WebSocket, WsEvent};
use ossido::{Logger, Request, client_ws_event, server_ws_event, ws};

/// client → server: a chat message to broadcast.
#[client_ws_event("chat_message")]
pub struct ChatMessage {
    pub text: String,
}

/// server → client: a broadcast message, tagged with the sender's connection id.
#[server_ws_event("message")]
pub struct Message {
    pub from: u64,
    pub text: String,
}

#[ws]
pub async fn socket(_req: Request, socket: WebSocket, sockets: SocketManager, logger: Logger) {
    let mut conn: Connection = sockets.store("chat", socket);
    logger.info(format!("chat connected (id {})", conn.id()));

    while let Some(Ok(incoming)) = conn.recv().await {
        if incoming.event() == ChatMessage::EVENT
            && let Ok(ChatMessage { text }) = incoming.parse::<ChatMessage>()
        {
            // Fan out to every open connection in the group (sender included).
            sockets
                .get(&"chat")
                .send(&Message {
                    from: conn.id(),
                    text,
                })
                .await;
        }
    }

    logger.info(format!("chat disconnected (id {})", conn.id()));
}
