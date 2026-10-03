//! Static game data: tiles, islands, projects, blessings, traders, levels.
//! Everything the rulebook calls "to be fixed in playtesting" lives HERE, in
//! one place, so balancing never means hunting through game logic.

use serde::{Deserialize, Serialize};

// ───────────────────────────── resources ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Res {
    Grain,
    Fibre,
    Wood,
    Stone,
    Clay,
    Water,
    Music,
    Ore,
}

pub const ALL_RES: [Res; 8] = [
    Res::Grain,
    Res::Fibre,
    Res::Wood,
    Res::Stone,
    Res::Clay,
    Res::Water,
    Res::Music,
    Res::Ore,
];

impl Res {
    pub fn idx(self) -> usize {
        self as usize
    }
    pub fn name(self) -> &'static str {
        match self {
            Res::Grain => "grain",
            Res::Fibre => "fibre",
            Res::Wood => "wood",
            Res::Stone => "stone",
            Res::Clay => "clay",
            Res::Water => "water",
            Res::Music => "music",
            Res::Ore => "ore",
        }
    }
}

pub type Cost = &'static [(Res, i32)];

// ───────────────────────────── terrain ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Terrain {
    Meadow,
    Woods,
    Hill,
    Shore,
}

// ───────────────────────────── tiles ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
pub enum TileKind {
    #[serde(rename = "tile_farm")]
    Farm,
    #[serde(rename = "tile_textile_workshop")]
    TextileWorkshop,
    #[serde(rename = "tile_haat_market")]
    HaatMarket,
    #[serde(rename = "tile_community_house")]
    CommunityHouse,
    #[serde(rename = "tile_music_pavilion")]
    MusicPavilion,
    #[serde(rename = "tile_sacred_shrine")]
    SacredShrine,
    #[serde(rename = "tile_clay_pit")]
    ClayPit,
    #[serde(rename = "tile_river_bend")]
    RiverBend,
    #[serde(rename = "tile_sacred_forest")]
    SacredForest,
    #[serde(rename = "tile_quarry")]
    Quarry,
    #[serde(rename = "tile_stepwell")]
    Stepwell,
    #[serde(rename = "tile_bund")]
    Bund,
    #[serde(rename = "tile_granary")]
    Granary,
}

pub const ALL_TILES: [TileKind; 13] = [
    TileKind::Farm,
    TileKind::SacredForest,
    TileKind::RiverBend,
    TileKind::CommunityHouse,
    TileKind::TextileWorkshop,
    TileKind::HaatMarket,
    TileKind::ClayPit,
    TileKind::Stepwell,
    TileKind::MusicPavilion,
    TileKind::Quarry,
    TileKind::Bund,
    TileKind::SacredShrine,
    TileKind::Granary,
];

pub struct TileDef {
    pub kind: TileKind,
    pub id: &'static str,
    pub name: &'static str,
    pub blurb: &'static str,
    pub cost: Cost,
    pub prod: Cost,
    /// Chance (%) that this tile catches fire from a burning neighbour. 0 = fireproof.
    pub flam: i32,
    /// Base water needed to put out a fire here.
    pub douse: i32,
    /// Empty = any terrain.
    pub terrain: &'static [Terrain],
    /// Player level at which the tile unlocks.
    pub unlock_level: u32,
    /// Counts as a water source for irrigation / firefighting / flood relief.
    pub water_source: bool,
    pub art: &'static str,
}

use Res::*;
use Terrain::*;

pub static TILES: [TileDef; 13] = [
    TileDef {
        kind: TileKind::Farm,
        id: "tile_farm",
        name: "Terraced Farm",
        blurb: "Grain for the island. Thrives beside water.",
        cost: &[(Grain, 1), (Water, 1)],
        prod: &[(Grain, 1)],
        flam: 30,
        douse: 1,
        terrain: &[],
        unlock_level: 1,
        water_source: false,
        art: "farm",
    },
    TileDef {
        kind: TileKind::SacredForest,
        id: "tile_sacred_forest",
        name: "Sacred Forest",
        blurb: "Wood, shade and a windbreak. Heals the land, but burns.",
        cost: &[(Wood, 1)],
        prod: &[(Wood, 1)],
        flam: 55,
        douse: 2,
        terrain: &[Woods, Meadow, Shore],
        unlock_level: 1,
        water_source: false,
        art: "forest",
    },
    TileDef {
        kind: TileKind::RiverBend,
        id: "tile_river_bend",
        name: "River Bend",
        blurb: "Fresh water, and a reason for farms to cluster.",
        cost: &[(Water, 1)],
        prod: &[(Water, 1)],
        flam: 0,
        douse: 1,
        terrain: &[Shore, Meadow],
        unlock_level: 1,
        water_source: true,
        art: "river",
    },
    TileDef {
        kind: TileKind::CommunityHouse,
        id: "tile_community_house",
        name: "Community Hall",
        blurb: "Where people live. More halls mean more hands each round.",
        cost: &[(Wood, 2), (Stone, 1)],
        prod: &[],
        flam: 40,
        douse: 2,
        terrain: &[],
        unlock_level: 1,
        water_source: false,
        art: "hall",
    },
    TileDef {
        kind: TileKind::TextileWorkshop,
        id: "tile_textile_workshop",
        name: "Textile Workshop",
        blurb: "Handloom fibre. Sells better beside a market.",
        cost: &[(Fibre, 1), (Wood, 1)],
        prod: &[(Fibre, 1)],
        flam: 40,
        douse: 2,
        terrain: &[],
        unlock_level: 1,
        water_source: false,
        art: "workshop",
    },
    TileDef {
        kind: TileKind::HaatMarket,
        id: "tile_haat_market",
        name: "Haat Market",
        blurb: "Cheaper trades and a free haggle each round.",
        cost: &[(Wood, 2), (Clay, 1)],
        prod: &[],
        flam: 40,
        douse: 2,
        terrain: &[],
        unlock_level: 1,
        water_source: false,
        art: "market",
    },
    TileDef {
        kind: TileKind::ClayPit,
        id: "tile_clay_pit",
        name: "Clay Pit",
        blurb: "Clay for markets and granaries. Fireproof.",
        cost: &[(Water, 1)],
        prod: &[(Clay, 1)],
        flam: 0,
        douse: 1,
        terrain: &[],
        unlock_level: 2,
        water_source: false,
        art: "clay",
    },
    TileDef {
        kind: TileKind::Stepwell,
        id: "tile_stepwell",
        name: "Stepwell",
        blurb: "Deep reserve of water. Cheapens fires and droughts nearby.",
        cost: &[(Stone, 2), (Water, 1)],
        prod: &[(Water, 1)],
        flam: 0,
        douse: 1,
        terrain: &[],
        unlock_level: 2,
        water_source: true,
        art: "river",
    },
    TileDef {
        kind: TileKind::MusicPavilion,
        id: "tile_music_pavilion",
        name: "Music Pavilion",
        blurb: "Drums and song. Keeps spirits up and hosts festivals.",
        cost: &[(Wood, 1), (Music, 1)],
        prod: &[(Music, 1)],
        flam: 35,
        douse: 1,
        terrain: &[],
        unlock_level: 3,
        water_source: false,
        art: "music",
    },
    TileDef {
        kind: TileKind::Quarry,
        id: "tile_quarry",
        name: "Stone Quarry",
        blurb: "Stone and ore from the hills. Scars the land.",
        cost: &[(Stone, 1), (Ore, 1)],
        prod: &[(Stone, 1), (Ore, 1)],
        flam: 0,
        douse: 1,
        terrain: &[Hill],
        unlock_level: 4,
        water_source: false,
        art: "quarry",
    },
    TileDef {
        kind: TileKind::Bund,
        id: "tile_bund",
        name: "Flood Bund",
        blurb: "An earthen wall. Shields neighbours from flood and landslide.",
        cost: &[(Stone, 2), (Clay, 1)],
        prod: &[],
        flam: 0,
        douse: 1,
        terrain: &[Shore, Meadow],
        unlock_level: 4,
        water_source: false,
        art: "quarry",
    },
    TileDef {
        kind: TileKind::SacredShrine,
        id: "tile_sacred_shrine",
        name: "Heritage Shrine",
        blurb: "Memory of the ancestors. Harmony, a little stone, healthier land.",
        cost: &[(Stone, 2), (Music, 1)],
        prod: &[(Stone, 1)],
        flam: 0,
        douse: 1,
        terrain: &[],
        unlock_level: 5,
        water_source: false,
        art: "shrine",
    },
    TileDef {
        kind: TileKind::Granary,
        id: "tile_granary",
        name: "Granary",
        blurb: "Storage. Raises the ceiling on every reserve (twice at most).",
        cost: &[(Wood, 2), (Clay, 2)],
        prod: &[],
        flam: 45,
        douse: 2,
        terrain: &[],
        unlock_level: 5,
        water_source: false,
        art: "hall",
    },
];

pub fn tile_def(k: TileKind) -> &'static TileDef {
    TILES.iter().find(|d| d.kind == k).expect("tile def")
}

// ───────────────────────────── islands ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IslandKind {
    Forest,
    Farming,
    Coastal,
    Mountain,
}

pub const ALL_ISLANDS: [IslandKind; 4] = [
    IslandKind::Forest,
    IslandKind::Farming,
    IslandKind::Coastal,
    IslandKind::Mountain,
];

impl IslandKind {
    pub fn id(self) -> &'static str {
        match self {
            IslandKind::Forest => "forest",
            IslandKind::Farming => "farming",
            IslandKind::Coastal => "coastal",
            IslandKind::Mountain => "mountain",
        }
    }
    pub fn specialty(self) -> Res {
        match self {
            IslandKind::Forest => Wood,
            IslandKind::Farming => Grain,
            IslandKind::Coastal => Water,
            IslandKind::Mountain => Stone,
        }
    }
    pub fn unlock_level(self) -> u32 {
        match self {
            IslandKind::Forest | IslandKind::Farming => 1,
            IslandKind::Coastal => 3,
            IslandKind::Mountain => 5,
        }
    }
    /// Terrain weights: Meadow, Woods, Hill, Shore.
    pub fn terrain_weights(self) -> [u32; 4] {
        match self {
            IslandKind::Forest => [3, 5, 1, 2],
            IslandKind::Farming => [6, 2, 1, 2],
            IslandKind::Coastal => [3, 2, 1, 5],
            IslandKind::Mountain => [2, 2, 6, 1],
        }
    }
}

// ───────────────────────────── hazards & boons ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HazardKind {
    Fire,
    Drought,
    Flood,
    Storm,
    Landslide,
}

impl HazardKind {
    pub fn id(self) -> &'static str {
        match self {
            HazardKind::Fire => "fire",
            HazardKind::Drought => "drought",
            HazardKind::Flood => "flood",
            HazardKind::Storm => "storm",
            HazardKind::Landslide => "landslide",
        }
    }
    pub fn title(self) -> &'static str {
        match self {
            HazardKind::Fire => "Fire",
            HazardKind::Drought => "Drought",
            HazardKind::Flood => "Flood",
            HazardKind::Storm => "Storm",
            HazardKind::Landslide => "Landslide",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BoonKind {
    Festival,
    Harvest,
    Caravan,
}

impl BoonKind {
    pub fn title(self) -> &'static str {
        match self {
            BoonKind::Festival => "Seasonal Festival",
            BoonKind::Harvest => "Golden Harvest",
            BoonKind::Caravan => "Traders' Caravan",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "t", content = "k", rename_all = "snake_case")]
pub enum Slot {
    Calm,
    Boon(BoonKind),
    Hazard(HazardKind),
}

pub const SEASONS: [&str; 4] = ["Sowing", "The Dry Months", "Monsoon", "Harvest Moon"];

pub fn season_of(round: u32) -> usize {
    (((round.max(1) - 1) / 3) as usize).min(3)
}

// ───────────────────────────── projects (development tasks) ─────────────────────────────

pub struct ProjectDef {
    pub id: &'static str,
    pub level: u8,
    pub name: &'static str,
    pub symbol: &'static str,
    pub cost: Cost,
    pub points: i32,
    pub blurb: &'static str,
    pub requires: &'static [TileKind],
}

use TileKind as T;

/// Straight from the original `scoring.rs`, plus the tiles each one needs, so
/// projects reward *building the right island*, not just hoarding.
pub static PROJECTS: [ProjectDef; 9] = [
    ProjectDef {
        id: "task_l1_farm",
        level: 1,
        name: "Build a Farm",
        symbol: "🌾",
        cost: &[(Grain, 2), (Water, 1)],
        points: 5,
        blurb: "Irrigated terraces.",
        requires: &[T::Farm],
    },
    ProjectDef {
        id: "task_l1_workshop",
        level: 1,
        name: "Build a Workshop",
        symbol: "🪵",
        cost: &[(Wood, 2), (Ore, 1)],
        points: 5,
        blurb: "Carpentry guild.",
        requires: &[T::TextileWorkshop],
    },
    ProjectDef {
        id: "task_l1_textiles",
        level: 1,
        name: "Create Textiles",
        symbol: "🧵",
        cost: &[(Fibre, 2), (Water, 1)],
        points: 5,
        blurb: "Handloom fabric.",
        requires: &[T::TextileWorkshop],
    },
    ProjectDef {
        id: "task_l2_trading",
        level: 2,
        name: "Trading Centre",
        symbol: "⚖️",
        cost: &[(Wood, 2), (Ore, 1), (Grain, 1)],
        points: 8,
        blurb: "Haat market stalls.",
        requires: &[T::HaatMarket],
    },
    ProjectDef {
        id: "task_l2_textile_mkt",
        level: 2,
        name: "Textile Market",
        symbol: "🏪",
        cost: &[(Fibre, 2), (Water, 1), (Grain, 1)],
        points: 8,
        blurb: "Handloom bazaar.",
        requires: &[T::HaatMarket, T::TextileWorkshop],
    },
    ProjectDef {
        id: "task_l2_processing",
        level: 2,
        name: "Processing Centre",
        symbol: "⚙️",
        cost: &[(Grain, 2), (Water, 1), (Ore, 1)],
        points: 8,
        blurb: "Stone milling.",
        requires: &[T::TextileWorkshop, T::Farm],
    },
    ProjectDef {
        id: "task_l3_grand_haat",
        level: 3,
        name: "Grand Haat",
        symbol: "✨",
        cost: &[(Wood, 1), (Water, 1), (Grain, 1), (Ore, 1), (Fibre, 1)],
        points: 12,
        blurb: "Inter-island bazaar.",
        requires: &[T::HaatMarket, T::CommunityHouse],
    },
    ProjectDef {
        id: "task_l3_craft_hub",
        level: 3,
        name: "Craft Hub",
        symbol: "🏺",
        cost: &[(Fibre, 2), (Wood, 1), (Water, 1), (Ore, 1)],
        points: 12,
        blurb: "Master artisan pavilion.",
        requires: &[T::TextileWorkshop, T::HaatMarket],
    },
    ProjectDef {
        id: "task_l3_integrated",
        level: 3,
        name: "Integrated Market",
        symbol: "🏛️",
        cost: &[(Grain, 2), (Water, 1), (Wood, 1), (Fibre, 1)],
        points: 12,
        blurb: "Waterfront marketplace.",
        requires: &[T::HaatMarket, T::RiverBend],
    },
];

pub fn project_def(id: &str) -> Option<&'static ProjectDef> {
    PROJECTS.iter().find(|p| p.id == id)
}

/// Project level unlocks by round: 1-4, 5-8, 9-12 (stays claimable afterwards).
pub fn project_level_open(round: u32) -> u8 {
    if round <= 4 {
        1
    } else if round <= 8 {
        2
    } else {
        3
    }
}

// ───────────────────────────── blessings (the per-run draft) ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Blessing {
    Rainkeeper,
    Firewatch,
    BountifulHands,
    SilkRoad,
    SeedBank,
    SacredGroves,
    Stonemason,
    FestivalSpirit,
    BundBuilders,
    ElderCounsel,
    ClayMemory,
    DeepRoots,
}

pub const ALL_BLESSINGS: [Blessing; 12] = [
    Blessing::Rainkeeper,
    Blessing::Firewatch,
    Blessing::BountifulHands,
    Blessing::SilkRoad,
    Blessing::SeedBank,
    Blessing::SacredGroves,
    Blessing::Stonemason,
    Blessing::FestivalSpirit,
    Blessing::BundBuilders,
    Blessing::ElderCounsel,
    Blessing::ClayMemory,
    Blessing::DeepRoots,
];

impl Blessing {
    pub fn name(self) -> &'static str {
        match self {
            Blessing::Rainkeeper => "Rainkeeper",
            Blessing::Firewatch => "Firewatch",
            Blessing::BountifulHands => "Bountiful Hands",
            Blessing::SilkRoad => "Silk Road",
            Blessing::SeedBank => "Seed Bank",
            Blessing::SacredGroves => "Sacred Groves",
            Blessing::Stonemason => "Stonemason's Guild",
            Blessing::FestivalSpirit => "Festival Spirit",
            Blessing::BundBuilders => "Bund Builders",
            Blessing::ElderCounsel => "Elder's Counsel",
            Blessing::ClayMemory => "Clay Memory",
            Blessing::DeepRoots => "Deep Roots",
        }
    }
    pub fn text(self) -> &'static str {
        match self {
            Blessing::Rainkeeper => "+1 water every dawn. Drought responses cost 1 less.",
            Blessing::Firewatch => "Putting out a fire costs 1 less water (minimum 1).",
            Blessing::BountifulHands => "+1 action every round.",
            Blessing::SilkRoad => "Every trade asks 1 less of what you give (minimum 1).",
            Blessing::SeedBank => "Farms yield +1 grain while the land is healthy (ecology 50+).",
            Blessing::SacredGroves => {
                "Forests yield +1 wood and cannot catch fire from neighbours."
            }
            Blessing::Stonemason => "Buildings cost 1 less stone.",
            Blessing::FestivalSpirit => "+2 harmony every dawn.",
            Blessing::BundBuilders => "Floods and landslides threaten one fewer tile.",
            Blessing::ElderCounsel => "The omen shows two rounds ahead, including the target.",
            Blessing::ClayMemory => "Rebuilding on ruins costs half as much.",
            Blessing::DeepRoots => "Ecology recovers +2 every dawn while you have a forest.",
        }
    }
}

// ───────────────────────────── traders ─────────────────────────────

pub struct TraderDef {
    pub id: &'static str,
    pub name: &'static str,
    pub island: &'static str,
    pub avatar: &'static str,
    pub sells: Res,
    pub wants: Res,
}

/// The original five (Maya, Kabir, Leela, Dev, Anita) plus three more, so every
/// resource has a seller and every resource has a buyer.
pub static TRADERS: [TraderDef; 8] = [
    TraderDef {
        id: "trader_maya",
        name: "Maya",
        island: "Wood Isle",
        avatar: "🪵",
        sells: Wood,
        wants: Ore,
    },
    TraderDef {
        id: "trader_kabir",
        name: "Kabir",
        island: "Water Haven",
        avatar: "💧",
        sells: Water,
        wants: Grain,
    },
    TraderDef {
        id: "trader_leela",
        name: "Leela",
        island: "Fibre Atoll",
        avatar: "🧵",
        sells: Fibre,
        wants: Water,
    },
    TraderDef {
        id: "trader_dev",
        name: "Dev",
        island: "Ore Summit",
        avatar: "⛏️",
        sells: Ore,
        wants: Wood,
    },
    TraderDef {
        id: "trader_anita",
        name: "Anita",
        island: "Grain Terraces",
        avatar: "🌾",
        sells: Grain,
        wants: Fibre,
    },
    TraderDef {
        id: "trader_ravi",
        name: "Ravi",
        island: "Clay Delta",
        avatar: "🏺",
        sells: Clay,
        wants: Grain,
    },
    TraderDef {
        id: "trader_meera",
        name: "Meera",
        island: "Song Isle",
        avatar: "🥁",
        sells: Music,
        wants: Fibre,
    },
    TraderDef {
        id: "trader_arjun",
        name: "Arjun",
        island: "Quarry Reach",
        avatar: "🪨",
        sells: Stone,
        wants: Clay,
    },
];

// ───────────────────────────── progression ─────────────────────────────

pub const LEVEL_XP: [u32; 10] = [0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200];

pub fn level_for_xp(xp: u32) -> u32 {
    LEVEL_XP.iter().filter(|&&t| xp >= t).count() as u32
}

pub fn xp_for_next_level(xp: u32) -> Option<u32> {
    LEVEL_XP.iter().find(|&&t| t > xp).copied()
}

pub fn tiles_unlocked_at(level: u32) -> Vec<TileKind> {
    ALL_TILES
        .iter()
        .copied()
        .filter(|k| tile_def(*k).unlock_level <= level)
        .collect()
}

pub fn islands_unlocked_at(level: u32) -> Vec<IslandKind> {
    ALL_ISLANDS
        .iter()
        .copied()
        .filter(|i| i.unlock_level() <= level)
        .collect()
}

pub fn heat_name(h: u8) -> &'static str {
    match h {
        0 => "Calm Year",
        1 => "Restless Year",
        2 => "Hard Year",
        3 => "Cruel Year",
        4 => "Long Night",
        _ => "Cataclysm",
    }
}

pub const MAX_HEAT: u8 = 5;

pub fn heat_text(h: u8) -> &'static str {
    match h {
        0 => "The standard season.",
        1 => "One more hazard. Settle 2 more tiles.",
        2 => "Another hazard. Storage holds 2 less.",
        3 => "Hazards strike a step harder.",
        4 => "Yet another hazard. Settle 2 more tiles.",
        _ => "No mercy. Every response costs 1 more; the people grow restless.",
    }
}

/// The Daily Island's (and shared tables') island type comes from the seed so
/// every player in the world gets the identical map.
pub fn island_for_seed(seed: u64) -> IslandKind {
    ALL_ISLANDS[(seed % 4) as usize]
}
