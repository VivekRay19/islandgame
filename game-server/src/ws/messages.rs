use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsMessage {
    Join {
        game_id: String,
        player_id: String,
    },
    StateUpdate {
        state: serde_json::Value,
    },
    PlayerAction {
        player_id: String,
        action: String,
        detail: String,
    },
    TurnChanged {
        current_player_id: String,
        round: i32,
    },
    GameOver {
        winner_id: Option<String>,
        scores: serde_json::Value,
    },
    EventTriggered {
        event_id: String,
        target_q: i32,
        target_r: i32,
    },
    Chat {
        player_id: String,
        message: String,
    },
    Ping,
    Pong,
}
