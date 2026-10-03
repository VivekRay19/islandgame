use crate::models::game::PlayerIsland;
use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DevelopmentTask {
    pub id: &'static str,
    pub level: u8,
    pub name: &'static str,
    pub symbol: &'static str,
    pub cost: Vec<(&'static str, i32)>,
    pub points: i32,
    pub description: &'static str,
    pub reward_title: &'static str,
}

pub fn all_tasks() -> Vec<DevelopmentTask> {
    vec![
        DevelopmentTask {
            id: "task_l1_farm",
            level: 1,
            name: "Build a Farm",
            symbol: "🌾",
            cost: vec![("grain", 2), ("water", 1)],
            points: 5,
            description: "Irrigated terraces.",
            reward_title: "Agrarian Foundation",
        },
        DevelopmentTask {
            id: "task_l1_workshop",
            level: 1,
            name: "Build a Workshop",
            symbol: "🪵",
            cost: vec![("wood", 2), ("ore", 1)],
            points: 5,
            description: "Carpentry guild.",
            reward_title: "Timber Craftsmanship",
        },
        DevelopmentTask {
            id: "task_l1_textiles",
            level: 1,
            name: "Create Textiles",
            symbol: "🧵",
            cost: vec![("fibre", 2), ("water", 1)],
            points: 5,
            description: "Handloom fabric.",
            reward_title: "Handloom Heritage",
        },
        DevelopmentTask {
            id: "task_l2_trading",
            level: 2,
            name: "Trading Centre",
            symbol: "⚖️",
            cost: vec![("wood", 2), ("ore", 1), ("grain", 1)],
            points: 8,
            description: "Haat market stalls.",
            reward_title: "Commerce Haven",
        },
        DevelopmentTask {
            id: "task_l2_textile_mkt",
            level: 2,
            name: "Textile Market",
            symbol: "🏪",
            cost: vec![("fibre", 2), ("water", 1), ("grain", 1)],
            points: 8,
            description: "Handloom bazaar.",
            reward_title: "Silken Crossroads",
        },
        DevelopmentTask {
            id: "task_l2_processing",
            level: 2,
            name: "Processing Centre",
            symbol: "⚙️",
            cost: vec![("grain", 2), ("water", 1), ("ore", 1)],
            points: 8,
            description: "Stone milling.",
            reward_title: "Artisan Industry",
        },
        DevelopmentTask {
            id: "task_l3_grand_haat",
            level: 3,
            name: "Grand Haat",
            symbol: "✨",
            cost: vec![
                ("wood", 1),
                ("water", 1),
                ("grain", 1),
                ("ore", 1),
                ("fibre", 1),
            ],
            points: 12,
            description: "Inter-island bazaar.",
            reward_title: "Great Sovereign Haat",
        },
        DevelopmentTask {
            id: "task_l3_craft_hub",
            level: 3,
            name: "Craft Hub",
            symbol: "🏺",
            cost: vec![("fibre", 2), ("wood", 1), ("water", 1), ("ore", 1)],
            points: 12,
            description: "Master artisan pavilion.",
            reward_title: "Master Guild Realm",
        },
        DevelopmentTask {
            id: "task_l3_integrated",
            level: 3,
            name: "Integrated Market",
            symbol: "🏛️",
            cost: vec![("grain", 2), ("water", 1), ("wood", 1), ("fibre", 1)],
            points: 12,
            description: "Waterfront marketplace.",
            reward_title: "Vibrant Haat Metropolis",
        },
    ]
}

pub fn get_task(id: &str) -> Option<DevelopmentTask> {
    all_tasks().into_iter().find(|t| t.id == id)
}

pub fn current_level(round: i32) -> u8 {
    if round <= 2 {
        1
    } else if round <= 4 {
        2
    } else {
        3
    }
}

pub fn available_tasks(island: &PlayerIsland, round: i32) -> Vec<DevelopmentTask> {
    let lvl = current_level(round);
    all_tasks()
        .into_iter()
        .filter(|t| t.level == lvl && !island.completed_tasks.contains(&t.id.to_string()))
        .collect()
}

pub fn complete_task(task_id: &str, island: &mut PlayerIsland, round: i32) -> (bool, String, i32) {
    let Some(task) = get_task(task_id) else {
        return (false, "Task not found.".into(), 0);
    };
    let lvl = current_level(round);
    if task.level != lvl {
        return (
            false,
            format!("Task not available in Round {} (Level {}).", round, lvl),
            0,
        );
    }
    if island.completed_tasks.contains(&task_id.to_string()) {
        return (false, "Task already completed.".into(), 0);
    }
    let cost: HashMap<String, i32> = task.cost.iter().map(|(r, a)| (r.to_string(), *a)).collect();
    if !island.resources.spend(&cost) {
        return (false, "Insufficient resources.".into(), 0);
    }
    island.completed_tasks.push(task_id.to_string());
    island.task_score += task.points;
    island.cultural_harmony = (island.cultural_harmony + 5).min(100);
    (
        true,
        format!("✅ Completed {} — +{} points!", task.name, task.points),
        task.points,
    )
}

pub fn produce_resources(island: &mut PlayerIsland) {
    use crate::game_logic::tiles::tile_production;
    // Each tile produces 1 unit of its resource per round
    for tile in &island.tiles {
        if !tile.is_damaged {
            if let Some((res, amt)) = tile_production(&tile.tile_id) {
                island.resources.add(res, amt);
            }
        }
    }
    // Specialty bonus: +2 of specialty resource per round
    let spec = island.specialty_res.clone();
    island.resources.add(&spec, 2);
}

pub fn total_score(island: &PlayerIsland) -> i32 {
    island.task_score + island.event_score + (island.cultural_harmony / 10)
}
