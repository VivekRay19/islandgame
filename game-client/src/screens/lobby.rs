use macroquad::prelude::*;
use crate::ui::{colors::*, draw::*};
use crate::types::GameInfo;

pub struct LobbyState {
    pub games:           Vec<GameInfo>,
    pub selected_mode:   usize,   // 0=turn_based 1=real_time
    pub selected_island: usize,   // 0..3
    pub max_players:     i32,
    pub join_code:       String,
    pub tab:             usize,   // 0=create 1=join 2=browse
    pub loading:         bool,
    pub message:         String,
}

pub enum LobbyAction {
    None,
    Create { mode: String, island_type: String, max: i32 },
    Join   { game_id: String, island_type: String },
    JoinByCode { code: String, island_type: String },
    Refresh,
    Back,
}

impl Default for LobbyState {
    fn default() -> Self {
        Self { games: vec![], selected_mode: 0, selected_island: 0,
               max_players: 2, join_code: String::new(), tab: 0,
               loading: false, message: String::new() }
    }
}

const MODES:   [&str; 2] = ["Turn-Based", "Real-Time"];
const ISLANDS: [(&str, &str, &str); 4] = [
    ("farming",  "Farming",  "Starts with Grain"),
    ("forest",   "Forest",   "Starts with Wood"),
    ("coastal",  "Coastal",  "Starts with Water"),
    ("mountain", "Mountain", "Starts with Stone"),
];

pub fn draw_lobby(s: &mut LobbyState, t: f32) -> LobbyAction {
    let sw = screen_width();
    let sh = screen_height();
    clear_background(BG_DARK);

    // Animated tile row at top
    for i in 0..8 {
        let ox = 40.0 + i as f32 * (sw / 8.0);
        let oy = 40.0 + (t * 0.6 + i as f32 * 0.9).sin() * 8.0;
        draw_hex_tile(ox, oy, 26.0, [TILE_FARM,TILE_FOREST,TILE_WATER,TILE_CRAFT,
            TILE_MARKET,TILE_CIVIC,TILE_SHRINE,TILE_QUARRY][i], "", false, false);
    }

    let pw = (sw * 0.70).min(680.0);
    let ph = sh * 0.82;
    let px = sw/2.0 - pw/2.0;
    let py = sh*0.10;
    draw_panel_titled(px, py, pw, ph, "  Game Lobby");

    let mut want_refresh = false;
    // Tabs
    for (i, label) in ["Create Game","Join Game","Browse"].iter().enumerate() {
        let tx = px + 10.0 + i as f32 * (pw/3.0 - 6.0);
        let col = if s.tab == i { GOLD_DARK } else { PANEL_MID };
        if button(label, tx, py+36.0, pw/3.0 - 10.0, 30.0, col) {
            if i == 2 && s.tab != 2 { want_refresh = true; }
            s.tab = i;
        }
    }
    let content_y = py + 80.0;

    let mut action = LobbyAction::None;
    if want_refresh { action = LobbyAction::Refresh; }

    match s.tab {
        0 => {
            // ── Create ──────────────────────────────────────────────
            let lx = px + 20.0;
            draw_text_shadow("Game Mode", lx, content_y + 20.0, 15.0, GOLD_TEXT);
            for (i,m) in MODES.iter().enumerate() {
                let bx = lx + i as f32 * 148.0;
                let col = if s.selected_mode==i { GOLD_DARK } else { PANEL_MID };
                if button(m, bx, content_y+26.0, 140.0, 34.0, col) { s.selected_mode = i; }
            }
            draw_text_shadow("Your Island", lx, content_y+82.0, 15.0, GOLD_TEXT);
            for (i,(_key, label, hint)) in ISLANDS.iter().enumerate() {
                let bx = lx + i as f32 * ((pw-40.0)/4.0);
                let col = if s.selected_island==i { GOLD_DARK } else { PANEL_MID };
                if button(label, bx, content_y+88.0, (pw-40.0)/4.0-4.0, 42.0, col) {
                    s.selected_island = i;
                }
                draw_text_centered(hint, bx+(pw-40.0)/8.0-2.0, content_y+138.0, 12.0, STONE_LIGHT);
            }
            draw_text_shadow("Max Players", lx, content_y+162.0, 15.0, GOLD_TEXT);
            for &n in &[2i32,3,4] {
                let bx = lx + (n-2) as f32 * 80.0;
                let col = if s.max_players==n { GOLD_DARK } else { PANEL_MID };
                if button(&n.to_string(), bx, content_y+168.0, 72.0, 34.0, col) { s.max_players = n; }
            }
            if !s.loading {
                if button("CREATE GAME", lx, content_y+220.0, pw-40.0, 50.0, GREEN_BTN) {
                    let mode = if s.selected_mode==0 { "turn_based" } else { "real_time" };
                    let isl  = ISLANDS[s.selected_island].0;
                    action = LobbyAction::Create { mode: mode.into(), island_type: isl.into(), max: s.max_players };
                    s.loading = true;
                }
            } else {
                draw_text_centered("Creating game...", sw/2.0, content_y+245.0, 20.0, GOLD_TEXT);
            }
        }
        1 => {
            // ── Join by code ─────────────────────────────────────────
            let lx = px + 20.0;
            draw_text_shadow("Game Code (6 chars)", lx, content_y+24.0, 15.0, GOLD_TEXT);
            if mouse_in(lx, content_y+30.0, pw-40.0, 42.0) && is_mouse_button_pressed(MouseButton::Left) {}
            if is_key_pressed(KeyCode::Backspace) { s.join_code.pop(); }
            if let Some(c) = get_char_pressed() {
                if c.is_ascii_alphanumeric() && s.join_code.len() < 6 {
                    s.join_code.push(c.to_ascii_uppercase());
                }
            }
            draw_text_field("Code", &s.join_code, lx, content_y+30.0, pw-40.0, 42.0, true);
            draw_text_shadow("Your Island", lx, content_y+96.0, 15.0, GOLD_TEXT);
            for (i,(_key,label,_)) in ISLANDS.iter().enumerate() {
                let bx = lx + i as f32 * ((pw-40.0)/4.0);
                let col = if s.selected_island==i { GOLD_DARK } else { PANEL_MID };
                if button(label, bx, content_y+102.0, (pw-40.0)/4.0-4.0, 38.0, col) { s.selected_island=i; }
            }
            if button("JOIN GAME", lx, content_y+160.0, pw-40.0, 50.0, GREEN_BTN) {
                if s.join_code.len() == 6 {
                    action = LobbyAction::JoinByCode {
                        code: s.join_code.clone(),
                        island_type: ISLANDS[s.selected_island].0.into(),
                    };
                }
            }
        }
        2 => {
            // ── Browse open games ────────────────────────────────────
            if button("Refresh", px+pw-110.0, content_y+5.0, 100.0, 28.0, BLUE_BTN) {
                action = LobbyAction::Refresh;
            }
            for (i, g) in s.games.iter().enumerate() {
                let gy = content_y + 44.0 + i as f32 * 54.0;
                if gy + 54.0 > py + ph - 20.0 { break; }
                draw_rectangle(px+10.0, gy, pw-20.0, 50.0, PANEL_MID);
                draw_rectangle_lines(px+10.0, gy, pw-20.0, 50.0, 1.0, PANEL_BORDER);
                draw_text_shadow(&format!("[{}] {}  Round {}/6  {}", g.game_code, g.game_mode, g.current_round, g.status),
                    px+18.0, gy+20.0, 15.0, WHITE);
                if button("JOIN", px+pw-100.0, gy+8.0, 80.0, 34.0, GREEN_BTN) {
                    action = LobbyAction::Join {
                        game_id:     g.id.clone(),
                        island_type: ISLANDS[s.selected_island].0.into(),
                    };
                }
            }
            if s.games.is_empty() {
                draw_text_centered("No open games. Create one!", sw/2.0, sh/2.0, 18.0, STONE_MID);
            }
        }
        _ => {}
    }

    if !s.message.is_empty() {
        draw_rectangle(px, py+ph-44.0, pw, 36.0, Color { r:0.0,g:0.0,b:0.0,a:0.7 });
        draw_text_shadow(&s.message, px+10.0, py+ph-20.0, 14.0, GOLD_TEXT);
    }

    if button("Back", px, py+ph+10.0, 80.0, 30.0, PANEL_MID) { action = LobbyAction::Back; }
    action
}
