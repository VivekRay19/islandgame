use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HexTile {
    pub q:               i32,
    pub r:               i32,
    pub tile_id:         String,
    pub rotation:        i32,
    pub is_damaged:      bool,
    pub placed_at_round: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
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
    pub fn add(&mut self, r: &str, amount: i32) {
        match r {
            "grain" => self.grain += amount, "fibre" => self.fibre += amount,
            "wood"  => self.wood  += amount, "stone" => self.stone += amount,
            "clay"  => self.clay  += amount, "water" => self.water += amount,
            "music" => self.music += amount, "ore"   => self.ore   += amount,
            _ => {}
        }
    }
    pub fn can_afford(&self, cost: &HashMap<String, i32>) -> bool {
        cost.iter().all(|(r, &amt)| self.get(r) >= amt)
    }
    pub fn spend(&mut self, cost: &HashMap<String, i32>) -> bool {
        if !self.can_afford(cost) { return false; }
        for (r, &amt) in cost { self.add(r, -amt); }
        true
    }
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

impl PlayerIsland {
    pub fn new(player_id: &str, island_type: &str, specialty: &str) -> Self {
        let mut res = Resources::default();
        res.add(specialty, 3);
        let tiles = vec![
            HexTile { q: 0, r: 0, tile_id: "tile_haat_market".into(),      rotation: 0,   is_damaged: false, placed_at_round: 1 },
            HexTile { q: 1, r: 0, tile_id: "tile_textile_workshop".into(), rotation: 0,   is_damaged: false, placed_at_round: 1 },
            HexTile { q: 0, r:-1, tile_id: "tile_farm".into(),             rotation: 60,  is_damaged: false, placed_at_round: 1 },
            HexTile { q:-1, r: 0, tile_id: "tile_river_bend".into(),       rotation: 120, is_damaged: false, placed_at_round: 1 },
            HexTile { q:-1, r: 1, tile_id: "tile_sacred_forest".into(),    rotation: 0,   is_damaged: false, placed_at_round: 1 },
            HexTile { q: 0, r: 1, tile_id: "tile_community_house".into(),  rotation: 180, is_damaged: false, placed_at_round: 1 },
            HexTile { q: 1, r:-1, tile_id: "tile_sacred_shrine".into(),    rotation: 0,   is_damaged: false, placed_at_round: 1 },
        ];
        PlayerIsland {
            player_id: player_id.to_string(),
            island_type: island_type.to_string(),
            specialty_res: specialty.to_string(),
            tiles, resources: res,
            completed_tasks: vec![], task_score: 0, event_score: 0,
            cultural_harmony: 50, active_event: None, trades_this_round: 0,
        }
    }
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

// Request bodies
#[derive(Debug, Deserialize)]
pub struct CreateGameRequest {
    pub game_mode:    Option<String>,
    pub max_players:  Option<i32>,
    pub island_type:  String,
}

#[derive(Debug, Deserialize)]
pub struct JoinGameRequest {
    pub island_type: String,
}

#[derive(Debug, Deserialize)]
pub struct PlaceTileRequest {
    pub q:        i32,
    pub r:        i32,
    pub tile_id:  String,
    pub rotation: i32,
}

#[derive(Debug, Deserialize)]
pub struct RespondEventRequest {
    pub action:      String,
    pub water_spent: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct TradeRequest {
    pub trader_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CompleteTaskRequest {
    pub task_id: String,
}
