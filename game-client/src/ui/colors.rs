use macroquad::color::Color;

// ── CoC-inspired palette ─────────────────────────────────────────────────────
pub const BG_DARK:       Color = Color { r: 0.07, g: 0.12, b: 0.05, a: 1.0 }; // dark forest night
pub const GRASS_DARK:    Color = Color { r: 0.13, g: 0.36, b: 0.16, a: 1.0 }; // #225A28
pub const GRASS_LIGHT:   Color = Color { r: 0.27, g: 0.55, b: 0.29, a: 1.0 }; // #448B4A
pub const SKY:           Color = Color { r: 0.28, g: 0.60, b: 0.85, a: 1.0 }; // soft blue

// Gold (primary CoC accent)
pub const GOLD:          Color = Color { r: 1.00, g: 0.78, b: 0.00, a: 1.0 }; // #FFC800
pub const GOLD_DARK:     Color = Color { r: 0.72, g: 0.48, b: 0.00, a: 1.0 }; // #B87A00
pub const GOLD_TEXT:     Color = Color { r: 1.00, g: 0.90, b: 0.45, a: 1.0 }; // #FFE573

// Panel backgrounds (warm dark wood — CoC style)
pub const PANEL_BG:      Color = Color { r: 0.22, g: 0.14, b: 0.08, a: 1.0 }; // #381D14
pub const PANEL_MID:     Color = Color { r: 0.33, g: 0.21, b: 0.12, a: 1.0 }; // #543520
pub const PANEL_BORDER:  Color = Color { r: 0.55, g: 0.35, b: 0.10, a: 1.0 }; // #8C591A

// Stone
pub const STONE_LIGHT:   Color = Color { r: 0.78, g: 0.75, b: 0.67, a: 1.0 }; // #C7BFAB
pub const STONE_MID:     Color = Color { r: 0.50, g: 0.47, b: 0.40, a: 1.0 }; // #807866

// Action colours
pub const GREEN_BTN:     Color = Color { r: 0.14, g: 0.62, b: 0.08, a: 1.0 }; // #239E14
pub const GREEN_BTN_HI:  Color = Color { r: 0.22, g: 0.80, b: 0.14, a: 1.0 }; // #38CC24
pub const RED_BTN:       Color = Color { r: 0.75, g: 0.10, b: 0.06, a: 1.0 }; // #BF1A10
pub const RED_BTN_HI:    Color = Color { r: 0.90, g: 0.18, b: 0.10, a: 1.0 }; // #E62E1A
pub const BLUE_BTN:      Color = Color { r: 0.10, g: 0.48, b: 0.82, a: 1.0 }; // #1A7AD1
pub const DISABLED:      Color = Color { r: 0.30, g: 0.30, b: 0.30, a: 1.0 };

// Text
pub const WHITE:         Color = Color { r: 1.0,  g: 1.0,  b: 1.0,  a: 1.0 };
pub const SHADOW:        Color = Color { r: 0.0,  g: 0.0,  b: 0.0,  a: 0.65 };

// Tile surface colours  (top face)
pub const TILE_FARM:     Color = Color { r: 0.54, g: 0.76, b: 0.29, a: 1.0 }; // golden-green
pub const TILE_FOREST:   Color = Color { r: 0.11, g: 0.40, b: 0.13, a: 1.0 }; // deep green
pub const TILE_WATER:    Color = Color { r: 0.13, g: 0.59, b: 0.86, a: 1.0 }; // river blue
pub const TILE_CRAFT:    Color = Color { r: 0.65, g: 0.40, b: 0.20, a: 1.0 }; // warm amber
pub const TILE_MARKET:   Color = Color { r: 0.54, g: 0.18, b: 0.68, a: 1.0 }; // violet
pub const TILE_CIVIC:    Color = Color { r: 0.85, g: 0.55, b: 0.18, a: 1.0 }; // orange-gold
pub const TILE_SHRINE:   Color = Color { r: 0.44, g: 0.32, b: 0.67, a: 1.0 }; // indigo
pub const TILE_CLAY:     Color = Color { r: 0.78, g: 0.34, b: 0.06, a: 1.0 }; // terracotta
pub const TILE_MUSIC:    Color = Color { r: 0.40, g: 0.16, b: 0.60, a: 1.0 }; // purple
pub const TILE_QUARRY:   Color = Color { r: 0.47, g: 0.43, b: 0.38, a: 1.0 }; // grey-brown
pub const TILE_EMPTY:    Color = Color { r: 0.25, g: 0.40, b: 0.20, a: 0.50 }; // ghost slot

// Side wall colours (darker for 3-D depth)
pub const SIDE_DARK:     Color = Color { r: 0.18, g: 0.11, b: 0.05, a: 1.0 };
pub const SIDE_MID:      Color = Color { r: 0.27, g: 0.17, b: 0.08, a: 1.0 };
pub const SIDE_LIGHT:    Color = Color { r: 0.36, g: 0.24, b: 0.12, a: 1.0 };

// Resource colours (match original TS #color values)
pub const RES_GRAIN: Color = Color { r: 0.92, g: 0.70, b: 0.03, a: 1.0 };
pub const RES_FIBRE: Color = Color { r: 0.93, g: 0.28, b: 0.60, a: 1.0 };
pub const RES_WOOD:  Color = Color { r: 0.63, g: 0.38, b: 0.03, a: 1.0 };
pub const RES_STONE: Color = Color { r: 0.44, g: 0.44, b: 0.48, a: 1.0 };
pub const RES_CLAY:  Color = Color { r: 0.92, g: 0.35, b: 0.05, a: 1.0 };
pub const RES_WATER: Color = Color { r: 0.01, g: 0.52, b: 0.78, a: 1.0 };
pub const RES_MUSIC: Color = Color { r: 0.55, g: 0.36, b: 0.96, a: 1.0 };
pub const RES_ORE:   Color = Color { r: 0.39, g: 0.45, b: 0.55, a: 1.0 };

pub fn tile_color(tile_id: &str) -> Color {
    match tile_id {
        "tile_farm"             => TILE_FARM,
        "tile_sacred_forest"    => TILE_FOREST,
        "tile_river_bend"       => TILE_WATER,
        "tile_textile_workshop" => TILE_CRAFT,
        "tile_haat_market"      => TILE_MARKET,
        "tile_community_house"  => TILE_CIVIC,
        "tile_sacred_shrine"    => TILE_SHRINE,
        "tile_clay_pit"         => TILE_CLAY,
        "tile_music_pavilion"   => TILE_MUSIC,
        "tile_quarry"           => TILE_QUARRY,
        _                       => TILE_EMPTY,
    }
}

pub fn tile_symbol(tile_id: &str) -> &'static str {
    match tile_id {
        "tile_farm"             => "FARM",
        "tile_sacred_forest"    => "TREE",
        "tile_river_bend"       => "RIVR",
        "tile_textile_workshop" => "LOOM",
        "tile_haat_market"      => "HAAT",
        "tile_community_house"  => "HALL",
        "tile_sacred_shrine"    => "SHRE",
        "tile_clay_pit"         => "CLAY",
        "tile_music_pavilion"   => "MUSC",
        "tile_quarry"           => "MINE",
        _                       => "????",
    }
}

pub fn res_color(res: &str) -> Color {
    match res {
        "grain" => RES_GRAIN, "fibre" => RES_FIBRE,
        "wood"  => RES_WOOD,  "stone" => RES_STONE,
        "clay"  => RES_CLAY,  "water" => RES_WATER,
        "music" => RES_MUSIC, "ore"   => RES_ORE,
        _       => WHITE,
    }
}

pub fn res_symbol(res: &str) -> &'static str {
    match res {
        "grain" => "GRN", "fibre" => "FBR",
        "wood"  => "WOD", "stone" => "STN",
        "clay"  => "CLY", "water" => "WTR",
        "music" => "MUS", "ore"   => "ORE",
        _       => "???",
    }
}
