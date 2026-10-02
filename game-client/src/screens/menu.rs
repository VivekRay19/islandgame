use macroquad::prelude::*;
use crate::ui::{colors::*, draw::*};

pub fn draw_menu(t: f32) -> MenuAction {
    let sw = screen_width();
    let sh = screen_height();

    // Animated island background gradient
    clear_background(BG_DARK);
    // Sky fade
    for i in 0..30 {
        let y   = (sh * 0.35 / 30.0) * i as f32;
        let mix = i as f32 / 30.0;
        let c   = Color { r: 0.07+mix*0.2, g:0.12+mix*0.4, b:0.05+mix*0.65, a:1.0 };
        draw_rectangle(0.0, y, sw, sh*0.35/30.0+1.0, c);
    }
    // Grass strip
    draw_rectangle(0.0, sh*0.62, sw, sh*0.38, GRASS_DARK);
    // Horizon line
    draw_rectangle(0.0, sh*0.62, sw, 3.0, GRASS_LIGHT);

    // Animated floating hex tiles in background
    for i in 0..6 {
        let ox  = sw * 0.08 + i as f32 * sw * 0.16;
        let oy  = sh * 0.45 + (t * 0.5 + i as f32 * 1.1).sin() * 12.0;
        let col = [TILE_FARM, TILE_FOREST, TILE_WATER, TILE_CRAFT, TILE_MARKET, TILE_SHRINE][i];
        draw_hex_tile(ox, oy, 38.0, col, "", false, false);
    }

    // Title plate
    let title_y = sh * 0.20;
    draw_rectangle(sw/2.0 - 260.0, title_y - 30.0, 520.0, 70.0,
        Color { r:0.0, g:0.0, b:0.0, a:0.55 });
    draw_rectangle_lines(sw/2.0 - 260.0, title_y - 30.0, 520.0, 70.0, 2.5, GOLD_DARK);
    // Pulsing gold title
    let pulse = 0.85 + 0.15 * (t * 2.0).sin();
    draw_text_centered("CULTURAL ISLANDS",
        sw/2.0, title_y + 14.0, 52.0,
        Color { r: GOLD.r*pulse, g: GOLD.g*pulse, b: 0.0, a:1.0 });
    draw_text_centered("Island Development & Survival",
        sw/2.0, title_y + 36.0, 18.0, STONE_LIGHT);

    // Menu buttons
    let bx = sw/2.0 - 130.0;
    let mut action = MenuAction::None;
    if button("PLAY",         bx, sh*0.52, 260.0, 50.0, GREEN_BTN) { action = MenuAction::Play; }
    if button("LEADERBOARD", bx, sh*0.52+62.0, 260.0, 50.0, BLUE_BTN) { action = MenuAction::Leaderboard; }
    if button("RULES",       bx, sh*0.52+124.0, 260.0, 50.0, PANEL_MID) { action = MenuAction::Rules; }

    // Version tag
    draw_text_shadow("v0.1.0  -  LAN Edition", 8.0, sh - 8.0, 12.0, STONE_MID);
    action
}

pub enum MenuAction { None, Play, Leaderboard, Rules }
