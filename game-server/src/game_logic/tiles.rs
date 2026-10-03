use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct TileDef {
    pub id: &'static str,
    pub name: &'static str,
    pub category: &'static str,
    pub symbol: &'static str,
    pub base_edges: [&'static str; 4], // [Top, Right, Bottom, Left]
    pub assoc_resource: Option<&'static str>,
    pub can_host_event: bool,
    pub building_type: Option<&'static str>,
}

pub fn all_tile_defs() -> HashMap<&'static str, TileDef> {
    let mut m = HashMap::new();
    macro_rules! tile {
        ($id:expr, $name:expr, $cat:expr, $sym:expr,
         [$e0:expr,$e1:expr,$e2:expr,$e3:expr],
         $res:expr, $evt:expr, $bld:expr) => {
            m.insert(
                $id,
                TileDef {
                    id: $id,
                    name: $name,
                    category: $cat,
                    symbol: $sym,
                    base_edges: [$e0, $e1, $e2, $e3],
                    assoc_resource: $res,
                    can_host_event: $evt,
                    building_type: $bld,
                },
            );
        };
    }
    tile!(
        "tile_farm",
        "Terraced Grain Farm",
        "Agriculture",
        "🌾",
        ["field", "grass", "field", "water"],
        Some("grain"),
        true,
        Some("farm")
    );
    tile!(
        "tile_textile_workshop",
        "Textile Workshop",
        "Craft",
        "🧵",
        ["village", "grass", "village", "grass"],
        Some("fibre"),
        true,
        Some("craft_centre")
    );
    tile!(
        "tile_haat_market",
        "Haat Trading Square",
        "Trade",
        "🏪",
        ["village", "village", "grass", "water"],
        Some("clay"),
        true,
        Some("traditional_market")
    );
    tile!(
        "tile_community_house",
        "Community Gathering Hall",
        "Civic",
        "🏛️",
        ["village", "forest", "village", "grass"],
        Some("wood"),
        true,
        Some("community_house")
    );
    tile!(
        "tile_music_pavilion",
        "Melodic Music Pavilion",
        "Spiritual",
        "🎵",
        ["grass", "forest", "grass", "water"],
        Some("music"),
        true,
        Some("music_pavilion")
    );
    tile!(
        "tile_sacred_shrine",
        "Ancestral Heritage Shrine",
        "Spiritual",
        "🪔",
        ["mountain", "grass", "mountain", "forest"],
        Some("stone"),
        true,
        Some("sacred_shrine")
    );
    tile!(
        "tile_clay_pit",
        "Riverbed Clay Pit",
        "Craft",
        "🏺",
        ["water", "grass", "water", "field"],
        Some("clay"),
        false,
        Some("clay_pit")
    );
    tile!(
        "tile_river_bend",
        "Scenic River Waterway",
        "Water",
        "💧",
        ["water", "water", "grass", "grass"],
        Some("water"),
        false,
        None
    );
    tile!(
        "tile_sacred_forest",
        "Ancient Banyan Forest",
        "Nature",
        "🪵",
        ["forest", "forest", "grass", "forest"],
        Some("wood"),
        false,
        None
    );
    tile!(
        "tile_quarry",
        "Stone Quarry & Mine",
        "Nature",
        "🪨",
        ["mountain", "mountain", "grass", "mountain"],
        Some("stone"),
        false,
        None
    );
    m
}

pub fn get_tile_def(id: &str) -> Option<TileDef> {
    all_tile_defs().remove(id)
}

/// Produce 1 unit of the tile's associated resource per turn
pub fn tile_production(tile_id: &str) -> Option<(&'static str, i32)> {
    match tile_id {
        "tile_farm" => Some(("grain", 1)),
        "tile_textile_workshop" => Some(("fibre", 1)),
        "tile_sacred_forest" => Some(("wood", 1)),
        "tile_quarry" => Some(("stone", 1)),
        "tile_river_bend" => Some(("water", 1)),
        "tile_clay_pit" => Some(("clay", 1)),
        "tile_music_pavilion" => Some(("music", 1)),
        "tile_sacred_shrine" => Some(("stone", 1)),
        _ => None,
    }
}

pub fn tile_cost(tile_id: &str) -> HashMap<String, i32> {
    let mut c = HashMap::new();
    match tile_id {
        "tile_farm" => {
            c.insert("grain".into(), 1);
            c.insert("water".into(), 1);
        }
        "tile_textile_workshop" => {
            c.insert("fibre".into(), 1);
            c.insert("wood".into(), 1);
        }
        "tile_haat_market" => {
            c.insert("wood".into(), 2);
            c.insert("clay".into(), 1);
        }
        "tile_community_house" => {
            c.insert("wood".into(), 2);
            c.insert("stone".into(), 1);
        }
        "tile_music_pavilion" => {
            c.insert("wood".into(), 1);
            c.insert("music".into(), 1);
        }
        "tile_sacred_shrine" => {
            c.insert("stone".into(), 2);
            c.insert("music".into(), 1);
        }
        "tile_clay_pit" => {
            c.insert("water".into(), 1);
        }
        "tile_river_bend" => {
            c.insert("water".into(), 1);
        }
        "tile_sacred_forest" => {
            c.insert("wood".into(), 1);
        }
        "tile_quarry" => {
            c.insert("stone".into(), 1);
            c.insert("ore".into(), 1);
        }
        _ => {}
    }
    c
}

pub fn get_rotated_edges(base_edges: &[&'static str; 4], rotation: i32) -> [&'static str; 6] {
    let shift = ((rotation / 60) % 6) as usize;
    // Map 4-edge quad to 6 hex edges [E, NE, NW, W, SW, SE]
    let base6: [&'static str; 6] = [
        base_edges[1],
        base_edges[0],
        base_edges[0],
        base_edges[3],
        base_edges[2],
        base_edges[2],
    ];
    let mut out = [""; 6];
    for i in 0..6 {
        out[i] = base6[(i + 6 - shift) % 6];
    }
    out
}
