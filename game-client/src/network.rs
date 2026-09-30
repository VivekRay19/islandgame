//! HTTP client wrappers using quad-net (works in WASM + native)
use quad_net::http_request::{RequestBuilder, Method};
use serde::de::DeserializeOwned;
use serde_json::Value;

pub const API_BASE: &str = "http://192.168.8.10:8067/api";

pub struct PendingRequest {
    inner: quad_net::http_request::Request,
}

impl PendingRequest {
    pub fn try_recv(&mut self) -> Option<Result<Value, String>> {
        match self.inner.try_recv() {
            Some(Some(body)) => {
                match serde_json::from_str::<Value>(&body) {
                    Ok(v) => Some(Ok(v)),
                    Err(e) => Some(Err(format!("JSON parse: {e}\nBody: {body}"))),
                }
            }
            Some(None) => Some(Err("Empty or failed response".into())),
            None => None,
        }
    }
}

fn get(path: &str, token: Option<&str>) -> PendingRequest {
    let url = format!("{}{}", API_BASE, path);
    let mut b = RequestBuilder::new(&url);
    if let Some(t) = token {
        b = b.header("Authorization", &format!("Bearer {}", t));
    }
    PendingRequest { inner: b.send() }
}

fn post(path: &str, token: Option<&str>, body: &str) -> PendingRequest {
    let url = format!("{}{}", API_BASE, path);
    let mut b = RequestBuilder::new(&url)
        .method(Method::POST)
        .header("Content-Type", "application/json")
        .body(body);
    if let Some(t) = token {
        b = b.header("Authorization", &format!("Bearer {}", t));
    }
    PendingRequest { inner: b.send() }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
pub fn req_register(username: &str, password: &str, display_name: &str) -> PendingRequest {
    let body = serde_json::json!({
        "username": username, "password": password, "display_name": display_name
    }).to_string();
    post("/auth/register", None, &body)
}

pub fn req_login(username: &str, password: &str) -> PendingRequest {
    let body = serde_json::json!({ "username": username, "password": password }).to_string();
    post("/auth/login", None, &body)
}

pub fn req_me(token: &str) -> PendingRequest {
    get("/auth/me", Some(token))
}

// ── Games ────────────────────────────────────────────────────────────────────
pub fn req_list_games(token: &str) -> PendingRequest {
    get("/games", Some(token))
}

pub fn req_create_game(token: &str, mode: &str, island_type: &str, max: i32) -> PendingRequest {
    let body = serde_json::json!({
        "game_mode": mode, "island_type": island_type, "max_players": max
    }).to_string();
    post("/games", Some(token), &body)
}

pub fn req_join_game(token: &str, game_id: &str, island_type: &str) -> PendingRequest {
    let body = serde_json::json!({ "island_type": island_type }).to_string();
    post(&format!("/games/{}/join", game_id), Some(token), &body)
}

pub fn req_start_game(token: &str, game_id: &str) -> PendingRequest {
    post(&format!("/games/{}/start", game_id), Some(token), "{}")
}

pub fn req_get_state(token: &str, game_id: &str) -> PendingRequest {
    get(&format!("/games/{}/state", game_id), Some(token))
}

pub fn req_place_tile(token: &str, game_id: &str, q: i32, r: i32,
                      tile_id: &str, rotation: i32) -> PendingRequest {
    let body = serde_json::json!({
        "q": q, "r": r, "tile_id": tile_id, "rotation": rotation
    }).to_string();
    post(&format!("/games/{}/place-tile", game_id), Some(token), &body)
}

pub fn req_respond_event(token: &str, game_id: &str,
                          action: &str, water: Option<i32>) -> PendingRequest {
    let body = serde_json::json!({ "action": action, "water_spent": water }).to_string();
    post(&format!("/games/{}/respond-event", game_id), Some(token), &body)
}

pub fn req_trade(token: &str, game_id: &str, trader_id: &str) -> PendingRequest {
    let body = serde_json::json!({ "trader_id": trader_id }).to_string();
    post(&format!("/games/{}/trade", game_id), Some(token), &body)
}

pub fn req_complete_task(token: &str, game_id: &str, task_id: &str) -> PendingRequest {
    let body = serde_json::json!({ "task_id": task_id }).to_string();
    post(&format!("/games/{}/complete-task", game_id), Some(token), &body)
}

pub fn req_end_turn(token: &str, game_id: &str) -> PendingRequest {
    post(&format!("/games/{}/end-turn", game_id), Some(token), "{}")
}

pub fn req_leaderboard() -> PendingRequest {
    get("/leaderboard", None)
}

pub fn req_campaign(token: &str) -> PendingRequest {
    get("/campaign", Some(token))
}
