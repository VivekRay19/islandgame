use actix_web::{web, Error, HttpRequest, HttpResponse};
use actix_ws::Message;
use futures_util::StreamExt;
use std::time::{Duration, Instant};

use crate::ws::messages::WsMessage;
use crate::AppState;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(15);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(60);

pub async fn ws_handler(
    req: HttpRequest,
    stream: web::Payload,
    _state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let (res, mut session, mut msg_stream) = actix_ws::handle(&req, stream)?;
    let query = req.query_string();
    let game_id = extract_query(query, "game_id").unwrap_or_default();

    actix_web::rt::spawn(async move {
        let mut last_heartbeat = Instant::now();

        while let Some(Ok(msg)) = msg_stream.next().await {
            if last_heartbeat.elapsed() > CLIENT_TIMEOUT {
                break;
            }

            match msg {
                Message::Text(text) => {
                    if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                        match ws_msg {
                            WsMessage::Ping => {
                                let _ = session
                                    .text(serde_json::to_string(&WsMessage::Pong).unwrap())
                                    .await;
                                last_heartbeat = Instant::now();
                            }
                            WsMessage::Chat { player_id, message } => {
                                let echo = serde_json::to_string(&WsMessage::Chat {
                                    player_id: player_id.clone(),
                                    message: message.clone(),
                                })
                                .unwrap();
                                let _ = session.text(echo).await;
                            }
                            _ => {
                                tracing::debug!("WS [{game_id}]: {:?}", ws_msg);
                            }
                        }
                    }
                }
                Message::Ping(bytes) => {
                    last_heartbeat = Instant::now();
                    let _ = session.pong(&bytes).await;
                }
                Message::Close(reason) => {
                    let _ = session.close(reason).await;
                    break;
                }
                _ => {}
            }
        }
        tracing::info!("WS session closed for game {}", game_id);
    });

    Ok(res)
}

fn extract_query(qs: &str, key: &str) -> Option<String> {
    qs.split('&').find_map(|p| {
        let mut kv = p.splitn(2, '=');
        let k = kv.next()?;
        let v = kv.next()?;
        if k == key {
            Some(v.to_string())
        } else {
            None
        }
    })
}
