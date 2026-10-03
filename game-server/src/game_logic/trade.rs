use crate::models::game::PlayerIsland;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Trader {
    pub id: &'static str,
    pub name: &'static str,
    pub island_name: &'static str,
    pub specialty: &'static str,
    pub avatar: &'static str,
    pub offered_resource: &'static str,
    pub offered_qty: i32,
    pub requested_resource: &'static str,
    pub requested_qty: i32,
}

pub fn all_traders() -> Vec<Trader> {
    vec![
        Trader {
            id: "trader_maya",
            name: "Maya",
            island_name: "Wood Isle",
            specialty: "wood",
            avatar: "🪵",
            offered_resource: "wood",
            offered_qty: 2,
            requested_resource: "ore",
            requested_qty: 1,
        },
        Trader {
            id: "trader_kabir",
            name: "Kabir",
            island_name: "Water Haven",
            specialty: "water",
            avatar: "💧",
            offered_resource: "water",
            offered_qty: 2,
            requested_resource: "grain",
            requested_qty: 1,
        },
        Trader {
            id: "trader_leela",
            name: "Leela",
            island_name: "Fibre Atoll",
            specialty: "fibre",
            avatar: "🧵",
            offered_resource: "fibre",
            offered_qty: 2,
            requested_resource: "water",
            requested_qty: 1,
        },
        Trader {
            id: "trader_dev",
            name: "Dev",
            island_name: "Ore Summit",
            specialty: "ore",
            avatar: "⛏️",
            offered_resource: "ore",
            offered_qty: 1,
            requested_resource: "wood",
            requested_qty: 2,
        },
        Trader {
            id: "trader_anita",
            name: "Anita",
            island_name: "Grain Terraces",
            specialty: "grain",
            avatar: "🌾",
            offered_resource: "grain",
            offered_qty: 2,
            requested_resource: "fibre",
            requested_qty: 1,
        },
    ]
}

pub const MAX_TRADES_PER_ROUND: i32 = 2;

pub fn get_trader(id: &str) -> Option<Trader> {
    all_traders().into_iter().find(|t| t.id == id)
}

pub fn execute_trade(trader_id: &str, island: &mut PlayerIsland) -> (bool, String) {
    if island.trades_this_round >= MAX_TRADES_PER_ROUND {
        return (false, "Maximum 2 trades per round reached.".into());
    }
    let Some(trader) = get_trader(trader_id) else {
        return (false, "Trader not found.".into());
    };
    // Filter out trader who specialises in the same resource as the player
    if trader.specialty == island.specialty_res {
        return (
            false,
            format!("{} doesn't need your specialty.", trader.name),
        );
    }
    if island.resources.get(trader.requested_resource) < trader.requested_qty {
        return (
            false,
            format!(
                "You need {} {} to trade with {}.",
                trader.requested_qty, trader.requested_resource, trader.name
            ),
        );
    }
    island
        .resources
        .add(trader.requested_resource, -trader.requested_qty);
    island
        .resources
        .add(trader.offered_resource, trader.offered_qty);
    island.trades_this_round += 1;
    (
        true,
        format!(
            "✅ Traded {} {} for {} {} with {} from {}.",
            trader.requested_qty,
            trader.requested_resource,
            trader.offered_qty,
            trader.offered_resource,
            trader.name,
            trader.island_name,
        ),
    )
}
