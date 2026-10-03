use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

// Used only where we need to pass a Player around (not needed with query! macros)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicPlayer {
    pub id: String,
    pub username: String,
    pub display_name: Option<String>,
    pub avatar_id: i32,
    pub level: i32,
    pub xp: i32,
    pub total_games: i32,
    pub wins: i32,
}
