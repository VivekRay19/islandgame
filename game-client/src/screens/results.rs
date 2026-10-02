use macroquad::prelude::*;
use crate::ui::{colors::*, draw::*};
use crate::types::GameStateData;

pub enum ResultsAction { None, MainMenu, PlayAgain }

pub fn draw_results(gs: &GameStateData, my_player_id: &str, t: f32) -> ResultsAction {
    let sw = screen_width();
    let sh = screen_height();
    clear_background(BG_DARK);

    // Victory/defeat background glow
    let is_winner = gs.winner_id.as_deref() == Some(my_player_id);
    let glow_col  = if is_winner {
        Color { r:0.90, g:0.70, b:0.0, a:0.08 }
    } else {
        Color { r:0.20, g:0.20, b:0.35, a:0.12 }
    };
    draw_circle(sw/2.0, sh/2.0, sh*0.65, glow_col);

    // Floating hex tiles
    for i in 0..8 {
        let ox = sw * 0.06 + i as f32 * sw * 0.13;
        let oy = sh * 0.85 + (t * 0.4 + i as f32 * 0.8).sin() * 8.0;
        let c  = [TILE_FARM,TILE_FOREST,TILE_WATER,TILE_CRAFT,
                  TILE_MARKET,TILE_SHRINE,TILE_CIVIC,TILE_QUARRY][i];
        draw_hex_tile(ox, oy, 30.0, c, "", false, false);
    }

    // Title
    let title     = if is_winner { "VICTORY!" } else { "Game Over" };
    let title_col = if is_winner { GOLD } else { STONE_LIGHT };
    draw_text_centered(title, sw/2.0, sh*0.14, 56.0, title_col);
    draw_text_centered("Cultural Islands  -  Final Scores", sw/2.0, sh*0.22, 20.0, STONE_MID);

    // Scores panel
    let mut sorted: Vec<&crate::types::PlayerIsland> = gs.islands.iter().collect();
    sorted.sort_by_key(|i| -(i.task_score + i.event_score + i.cultural_harmony / 10));

    let pw = (sw * 0.72).min(620.0);
    let ph = 50.0 + sorted.len() as f32 * 72.0;
    let px = sw/2.0 - pw/2.0;
    let py = sh*0.28;
    draw_panel(px, py, pw, ph);

    for (rank, island) in sorted.iter().enumerate() {
        let iy    = py + 14.0 + rank as f32 * 72.0;
        let score = island.task_score + island.event_score + island.cultural_harmony / 10;
        let is_me = island.player_id == my_player_id;
        let is_win = gs.winner_id.as_deref() == Some(&island.player_id);

        // Row bg
        let row_col = if is_me {
            Color { r:0.30, g:0.20, b:0.06, a:0.70 }
        } else {
            Color { r:0.0, g:0.0, b:0.0, a:0.30 }
        };
        draw_rectangle(px+8.0, iy+2.0, pw-16.0, 64.0, row_col);
        draw_rectangle_lines(px+8.0, iy+2.0, pw-16.0, 64.0, 1.0, PANEL_BORDER);

        // Rank medal
        let medal = match rank { 0 => "1st", 1 => "2nd", 2 => "3rd", _ => "   " };
        draw_text_shadow(medal, px+18.0, iy+28.0, 22.0, GOLD_TEXT);

        // Island type tag
        let isl_col = match island.island_type.as_str() {
            "forest"   => TILE_FOREST,
            "coastal"  => TILE_WATER,
            "mountain" => TILE_QUARRY,
            _          => TILE_FARM,
        };
        draw_circle(px+60.0, iy+24.0, 12.0, isl_col);

        // Player label
        let label = if is_me { format!("YOU ({})", island.island_type) }
                    else      { island.island_type.clone() };
        draw_text_shadow(&label, px+80.0, iy+26.0, 17.0, if is_me { GOLD_TEXT } else { WHITE });

        // Score breakdown
        draw_text_shadow(
            &format!("Tasks: {}  Events: {}  Harmony: {}  ->  TOTAL: {}",
                island.task_score, island.event_score,
                island.cultural_harmony / 10, score),
            px+80.0, iy+48.0, 13.0, STONE_LIGHT);

        // Winner crown
        if is_win {
            draw_text_shadow("WINNER", px+pw-100.0, iy+28.0, 18.0, GOLD);
        }
    }

    // Action log (last 5 entries)
    let log_y = py + ph + 16.0;
    draw_panel(px, log_y, pw, 110.0);
    draw_text_shadow("Action Log", px+10.0, log_y+18.0, 14.0, GOLD_TEXT);
    for (i, entry) in gs.action_log.iter().rev().take(5).enumerate() {
        draw_text_shadow(entry, px+12.0, log_y+36.0 + i as f32*16.0, 12.0, STONE_LIGHT);
    }

    // Buttons
    let btn_y = log_y + 126.0;
    let mut result = ResultsAction::None;
    if button("MAIN MENU",  px,             btn_y, pw/2.0-6.0, 48.0, PANEL_MID)  { result = ResultsAction::MainMenu; }
    if button("PLAY AGAIN",  px+pw/2.0+6.0,  btn_y, pw/2.0-6.0, 48.0, GREEN_BTN) { result = ResultsAction::PlayAgain; }
    result
}
