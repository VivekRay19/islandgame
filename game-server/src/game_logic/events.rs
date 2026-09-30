use crate::models::game::{ActiveEvent, PlayerIsland};
use rand::Rng;

#[derive(Debug, Clone)]
pub struct EventDef {
    pub id:               &'static str,
    pub title:            &'static str,
    pub event_type:       &'static str, // CHALLENGE | POSITIVE | NEUTRAL
    pub target_building:  &'static str,
    pub time_limit_secs:  i32,
    pub success_points:   i32,
    pub success_harmony:  i32,
    pub success_resources: Vec<(&'static str, i32)>,
    pub failure_damages:  bool,
    pub failure_res_loss: Vec<(&'static str, i32)>,
    pub failure_harmony:  i32,
}

pub fn all_events() -> Vec<EventDef> {
    vec![
        EventDef {
            id: "fire_event", title: "🔥 Fire at the Craft Centre!",
            event_type: "CHALLENGE", target_building: "craft_centre",
            time_limit_secs: 35, success_points: 15, success_harmony: 10,
            success_resources: vec![("fibre", 2), ("clay", 1)],
            failure_damages: true, failure_res_loss: vec![("fibre", 1)],
            failure_harmony: -10,
        },
        EventDef {
            id: "festival_event", title: "🎉 Seasonal Community Festival!",
            event_type: "POSITIVE", target_building: "music_pavilion",
            time_limit_secs: 30, success_points: 20, success_harmony: 15,
            success_resources: vec![("music", 2), ("grain", 1)],
            failure_damages: false, failure_res_loss: vec![],
            failure_harmony: 0,
        },
        EventDef {
            id: "harvest_bounty", title: "🌾 Golden Harvest Day!",
            event_type: "POSITIVE", target_building: "farm",
            time_limit_secs: 25, success_points: 12, success_harmony: 8,
            success_resources: vec![("grain", 3), ("water", 1)],
            failure_damages: false, failure_res_loss: vec![],
            failure_harmony: 0,
        },
        EventDef {
            id: "drought", title: "☀️ The Long Dry Season",
            event_type: "CHALLENGE", target_building: "farm",
            time_limit_secs: 30, success_points: 10, success_harmony: 5,
            success_resources: vec![("water", 2)],
            failure_damages: true, failure_res_loss: vec![("grain", 2)],
            failure_harmony: -8,
        },
        EventDef {
            id: "storm", title: "⛈️ Cyclone Warning!",
            event_type: "CHALLENGE", target_building: "community_house",
            time_limit_secs: 30, success_points: 12, success_harmony: 6,
            success_resources: vec![("stone", 1)],
            failure_damages: true, failure_res_loss: vec![("wood", 1)],
            failure_harmony: -6,
        },
    ]
}

pub fn get_event(id: &str) -> Option<EventDef> {
    all_events().into_iter().find(|e| e.id == id)
}

/// Pick a random event that has a valid target on this island
pub fn trigger_random_event(island: &PlayerIsland, round: i32) -> Option<ActiveEvent> {
    let mut rng = rand::thread_rng();
    let events = all_events();
    // Rounds 1-2: always fire; then random
    let candidates: Vec<&EventDef> = if round <= 2 {
        events.iter().filter(|e| e.id == "fire_event").collect()
    } else {
        events.iter().collect()
    };

    for event_def in candidates.iter() {
        let eligible: Vec<&crate::models::game::HexTile> = island.tiles.iter().filter(|t| {
            !t.is_damaged && match_building(t.tile_id.as_str(), event_def.target_building)
        }).collect();
        if !eligible.is_empty() {
            let target = eligible[rng.gen_range(0..eligible.len())];
            return Some(ActiveEvent {
                event_id:        event_def.id.to_string(),
                target_q:        target.q,
                target_r:        target.r,
                round_triggered: round,
            });
        }
    }
    None
}

fn match_building(tile_id: &str, building: &str) -> bool {
    match building {
        "craft_centre"     => tile_id == "tile_textile_workshop",
        "farm"             => tile_id == "tile_farm",
        "traditional_market" => tile_id == "tile_haat_market",
        "community_house"  => tile_id == "tile_community_house",
        "music_pavilion"   => tile_id == "tile_music_pavilion",
        "sacred_shrine"    => tile_id == "tile_sacred_shrine",
        "any"              => true,
        _                  => false,
    }
}

/// Resolve an event: success=true if player extinguishes/completes it
pub fn resolve_event(
    event_id: &str,
    success:  bool,
    island:   &mut PlayerIsland,
) -> (i32, String) {
    let Some(def) = get_event(event_id) else {
        return (0, "Unknown event".into());
    };
    if success {
        for (res, amt) in &def.success_resources {
            island.resources.add(res, *amt);
        }
        island.event_score       += def.success_points;
        island.cultural_harmony  += def.success_harmony;
        island.active_event       = None;
        (def.success_points, format!("✅ {}", def.title))
    } else {
        // Mark target tile damaged
        if def.failure_damages {
            if let Some(ev) = &island.active_event.clone() {
                if let Some(t) = island.tiles.iter_mut()
                    .find(|t| t.q == ev.target_q && t.r == ev.target_r)
                {
                    t.is_damaged = true;
                }
            }
        }
        for (res, amt) in &def.failure_res_loss {
            island.resources.add(res, -*amt);
        }
        island.cultural_harmony  += def.failure_harmony;
        island.cultural_harmony   = island.cultural_harmony.max(0);
        island.active_event       = None;
        (0, format!("❌ {}", def.title))
    }
}

pub fn extinguish_cost(event_id: &str) -> i32 {
    match event_id {
        "fire_event" => 2,
        "drought"    => 2,
        _            => 1,
    }
}
