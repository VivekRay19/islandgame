use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Resources {
    pub grain: i32,
    pub fibre: i32,
    pub wood:  i32,
    pub stone: i32,
    pub clay:  i32,
    pub water: i32,
    pub music: i32,
    pub ore:   i32,
}

impl Resources {
    pub fn get(&self, r: &str) -> i32 {
        match r {
            "grain" => self.grain, "fibre" => self.fibre,
            "wood"  => self.wood,  "stone" => self.stone,
            "clay"  => self.clay,  "water" => self.water,
            "music" => self.music, "ore"   => self.ore,
            _       => 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HexTile {
    pub q:              i32,
    pub r:              i32,
    pub tile_id:        String,
    pub rotation:       i32,
    pub is_damaged:     bool,
    pub placed_at_round: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveEvent {
    pub event_id:        String,
    pub target_q:        i32,
    pub target_r:        i32,
    pub round_triggered: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerIsland {
    pub player_id:         String,
    pub island_type:       String,
    pub specialty_res:     String,
    pub tiles:             Vec<HexTile>,
    pub resources:         Resources,
    pub completed_tasks:   Vec<String>,
    pub task_score:        i32,
    pub event_score:       i32,
    pub cultural_harmony:  i32,
    pub active_event:      Option<ActiveEvent>,
    pub trades_this_round: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameStateData {
    pub round:             i32,
    pub current_player_id: String,
    pub player_order:      Vec<String>,
    pub islands:           Vec<PlayerIsland>,
    pub game_over:         bool,
    pub winner_id:         Option<String>,
    pub action_log:        Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicPlayer {
    pub id:           String,
    pub username:     String,
    pub display_name: Option<String>,
    pub level:        i32,
    pub xp:           i32,
    pub total_games:  i32,
    pub wins:         i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameInfo {
    pub id:           String,
    pub game_code:    String,
    pub game_mode:    String,
    pub status:       String,
    pub max_players:  i32,
    pub current_round: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DevelopmentTask {
    pub id:          String,
    pub level:       u8,
    pub name:        String,
    pub symbol:      String,
    pub cost:        Vec<(String, i32)>,
    pub points:      i32,
    pub description: String,
    pub reward_title: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trader {
    pub id:               String,
    pub name:             String,
    pub island_name:      String,
    pub specialty:        String,
    pub avatar:           String,
    pub offered_resource: String,
    pub offered_qty:      i32,
    pub requested_resource: String,
    pub requested_qty:    i32,
}
