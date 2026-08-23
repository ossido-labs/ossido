use ossido::ws::{Connection, SocketManager, WebSocket, WsEvent};
use ossido::{Logger, Request, client_ws_event, server_ws_event, ws};

/// client → server: a request to echo some text.
#[client_ws_event("echo_request")]
pub struct EchoRequest {
    pub text: String,
}

/// server → client: the echoed text.
#[server_ws_event("echo_reply")]
pub struct EchoReply {
    pub text: String,
}

/// The project's single WebSocket handler. Stores the connection under a key and
/// echoes every `echo_request` back as an `echo_reply`.
#[ws]
pub async fn socket(_req: Request, socket: WebSocket, sockets: SocketManager, logger: Logger) {
    let mut conn: Connection = sockets.store("echo", socket);
    logger.info(&format!("websocket connected (id {})", conn.id()));

    while let Some(Ok(incoming)) = conn.recv().await {
        if incoming.event() == EchoRequest::EVENT
            && let Ok(EchoRequest { text }) = incoming.parse::<EchoRequest>()
        {
            let _ = conn.send(&EchoReply { text }).await;
        }
    }

    logger.info("websocket disconnected");
}
