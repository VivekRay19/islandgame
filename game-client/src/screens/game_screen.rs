//! Main game board screen — hex island, HUD, event panel, tile picker, trade.
use macroquad::prelude::*;
use crate::ui::{colors::*, draw::*};
use crate::ui::hud::draw_hud;
use crate::types::*;

// Tile picker entries (all 10 tiles)
const TILE_PICKER: [(&str, &str); 10] = [
    ("tile_farm",             "FARM"),
    ("tile_sacred_forest",    "TREE"),
    ("tile_river_bend",       "RIVR"),
    ("tile_textile_workshop", "LOOM"),
    ("tile_haat_market",      "HAAT"),
    ("tile_community_house",  "HALL"),
    ("tile_sacred_shrine",    "SHRE"),
    ("tile_clay_pit",         "CLAY"),
    ("tile_music_pavilion",   "MUSC"),
    ("tile_quarry",           "MINE"),
];

pub struct GameScreenState {
    pub selected_tile:    Option<String>,
    pub selected_rotation: i32,
    pub hovered_q:        Option<i32>,
    pub hovered_r:        Option<i32>,
    pub show_trade:       bool,
    pub show_tasks:       bool,
    pub show_rules:       bool,
    pub show_log:         bool,
    pub last_message:     String,
    pub message_timer:    f32,
    pub camera_offset:    (f32, f32),
    pub is_my_turn:       bool,
}

impl Default for GameScreenState {
    fn default() -> Self {
        Self {
            selected_tile: None, selected_rotation: 0,
            hovered_q: None, hovered_r: None,
            show_trade: false, show_tasks: false,
            show_rules: false, show_log: false,
            last_message: String::new(), message_timer: 0.0,
            camera_offset: (0.0, 0.0), is_my_turn: false,
        }
    }
}

pub enum GameAction {
    None,
    PlaceTile     { q: i32, r: i32, tile_id: String, rotation: i32 },
    RespondEvent  { action: String, water: Option<i32> },
    Trade         { trader_id: String },
    CompleteTask  { task_id: String },
    EndTurn,
    Leave,
    PollState,
}

// ── Hex coord → screen ───────────────────────────────────────────────────────
const HEX_R:     f32 = 44.0;
const HEX_SPC_X: f32 = 76.0;
const HEX_SPC_Y: f32 = 46.0;

fn hex_to_screen(q: i32, r: i32, origin_x: f32, origin_y: f32) -> (f32, f32) {
    (
        origin_x + q as f32 * HEX_SPC_X + r as f32 * (HEX_SPC_X / 2.0),
        origin_y + r as f32 * HEX_SPC_Y,
    )
}

fn screen_to_hex(mx: f32, my: f32, origin_x: f32, origin_y: f32) -> (i32, i32) {
    let r_approx = (my - origin_y) / HEX_SPC_Y;
    let q_approx = (mx - origin_x - r_approx * HEX_SPC_X / 2.0) / HEX_SPC_X;
    let r = r_approx.round() as i32;
    let q = q_approx.round() as i32;
    (q, r)
}

fn point_in_hex(mx: f32, my: f32, cx: f32, cy: f32) -> bool {
    let dx = (mx - cx).abs();
    let dy = (my - cy).abs();
    dx < HEX_R * 0.88 && dy < HEX_R * 0.55
}

fn get_valid_slots(tiles: &[HexTile]) -> Vec<(i32,i32)> {
    const DIRS: [(i32,i32);6] = [(1,0),(1,-1),(0,-1),(-1,0),(-1,1),(0,1)];
    let mut slots = std::collections::HashSet::new();
    if tiles.is_empty() {
        slots.insert((0,0));
    } else {
        for t in tiles {
            for (dq,dr) in DIRS {
                let nq = t.q + dq;
                let nr = t.r + dr;
                if !tiles.iter().any(|t2| t2.q==nq && t2.r==nr) {
                    slots.insert((nq, nr));
                }
            }
        }
    }
    slots.into_iter().collect()
}

pub fn draw_game(
    gs:         &GameStateData,
    my_island:  &PlayerIsland,
    tasks:      &[serde_json::Value],
    traders:    &[serde_json::Value],
    s:          &mut GameScreenState,
    player_name: &str,
    dt:         f32,
    t:          f32,
) -> GameAction {
    let sw = screen_width();
    let sh = screen_height();
    clear_background(BG_DARK);

    // Sky gradient
    for i in 0..20 {
        let y   = i as f32 * (sh / 20.0);
        let mix = i as f32 / 20.0;
        draw_rectangle(0.0, y, sw, sh/20.0+1.0,
            Color { r:0.07+mix*0.12, g:0.12+mix*0.30, b:0.05+mix*0.55, a:1.0 });
    }
    // Grass floor
    draw_rectangle(0.0, sh*0.55, sw, sh*0.45, GRASS_DARK);
    draw_rectangle(0.0, sh*0.55, sw, 3.0, GRASS_LIGHT);

    // ── HUD (top bar 58px) ───────────────────────────────────────────────
    let is_my_turn = gs.current_player_id == my_island.player_id;
    s.is_my_turn = is_my_turn;
    draw_hud(&my_island.resources, gs.round, 6,
             my_island.cultural_harmony,
             my_island.active_event.as_ref(),
             player_name);

    // ── Island board ─────────────────────────────────────────────────────
    let board_w  = sw * 0.60;
    let origin_x = sw * 0.08 + s.camera_offset.0;
    let origin_y = sh * 0.42 + s.camera_offset.1;
    let (mx, my) = mouse_position();

    // Valid slots
    let slots = get_valid_slots(&my_island.tiles);
    let (hq, hr) = screen_to_hex(mx, my, origin_x, origin_y);

    // Draw slots first (behind tiles)
    if s.selected_tile.is_some() && is_my_turn {
        for &(sq, sr) in &slots {
            let (cx, cy) = hex_to_screen(sq, sr, origin_x, origin_y);
            let hovered  = hq==sq && hr==sr && point_in_hex(mx,my,cx,cy);
            if hovered { s.hovered_q = Some(sq); s.hovered_r = Some(sr); }
            draw_hex_slot(cx, cy, HEX_R * 0.90, hovered);
        }
    }

    // Draw placed tiles
    for tile in &my_island.tiles {
        let (cx, cy) = hex_to_screen(tile.q, tile.r, origin_x, origin_y);
        let sel = s.selected_tile.is_none() &&
            s.hovered_q == Some(tile.q) && s.hovered_r == Some(tile.r);
        let color = crate::ui::colors::tile_color(&tile.tile_id);
        let label = crate::ui::colors::tile_symbol(&tile.tile_id);
        draw_hex_tile(cx, cy, HEX_R, color, label, tile.is_damaged, sel);

        // Fire marker on active event target
        if let Some(ev) = &my_island.active_event {
            if tile.q == ev.target_q && tile.r == ev.target_r {
                let pulse = 0.5 + 0.5 * (t * 4.0).sin();
                draw_circle(cx, cy - HEX_R*0.30, 10.0,
                    Color { r:1.0, g:0.35*pulse, b:0.0, a:0.9 });
            }
        }
    }

    // Hover highlight for placed tiles (no tile selected)
    if s.selected_tile.is_none() {
        for tile in &my_island.tiles {
            let (cx, cy) = hex_to_screen(tile.q, tile.r, origin_x, origin_y);
            if point_in_hex(mx, my, cx, cy) {
                s.hovered_q = Some(tile.q);
                s.hovered_r = Some(tile.r);
            }
        }
    }

    // ── Right panel ───────────────────────────────────────────────────────
    let rp_x = sw * 0.67;
    let rp_w = sw * 0.30;
    let rp_y = 65.0;

    // Turn info
    draw_panel(rp_x, rp_y, rp_w, 80.0);
    let turn_txt = if is_my_turn { "YOUR TURN" } else { "Waiting..." };
    let turn_col = if is_my_turn { GREEN_BTN } else { STONE_MID };
    draw_text_centered(turn_txt, rp_x + rp_w/2.0, rp_y + 24.0, 20.0, turn_col);
    draw_text_centered(&format!("Round {}/6", gs.round), rp_x + rp_w/2.0, rp_y + 46.0, 14.0, GOLD_TEXT);
    draw_text_centered(&format!("Score: {}", my_island.task_score + my_island.event_score),
        rp_x + rp_w/2.0, rp_y + 64.0, 13.0, WHITE);

    // Active event panel
    let mut action = GameAction::None;
    if let Some(ev) = &my_island.active_event {
        let ep_y = rp_y + 88.0;
        draw_panel(rp_x, ep_y, rp_w, 120.0);
        draw_rectangle(rp_x, ep_y, rp_w, 28.0, Color { r:0.65,g:0.08,b:0.02,a:0.85 });
        draw_text_centered("⚠  ACTIVE EVENT", rp_x+rp_w/2.0, ep_y+18.0, 15.0, WHITE);
        let ev_name = match ev.event_id.as_str() {
            "fire_event"     => "FIRE at tile!",
            "festival_event" => "FESTIVAL TIME!",
            "harvest_bounty" => "HARVEST DAY!",
            "drought"        => "DROUGHT!",
            "storm"          => "STORM!",
            _                => "EVENT!",
        };
        draw_text_centered(ev_name, rp_x+rp_w/2.0, ep_y+50.0, 17.0, GOLD);
        if is_my_turn {
            let cost = if ev.event_id == "fire_event" || ev.event_id == "drought" { 2 } else { 0 };
            let btn_label = if cost > 0 {
                format!("RESOLVE (-{} Water)", cost)
            } else {
                "COMPLETE EVENT".into()
            };
            if button(&btn_label, rp_x+4.0, ep_y+62.0, rp_w-8.0, 36.0, GREEN_BTN) {
                action = GameAction::RespondEvent {
                    action: "extinguish".into(),
                    water: if cost > 0 { Some(cost) } else { None },
                };
            }
            if button("IGNORE EVENT", rp_x+4.0, ep_y+104.0, rp_w-8.0, 28.0, RED_BTN) {
                action = GameAction::RespondEvent { action: "ignore".into(), water: None };
            }
        }
    }

    // Action buttons
    let ab_y = rp_y + (if my_island.active_event.is_some() { 218.0 } else { 96.0 });
    if is_my_turn {
        if button("⚖  HAAT TRADE", rp_x+4.0, ab_y, rp_w-8.0, 40.0, BLUE_BTN) {
            s.show_trade = !s.show_trade;
            s.show_tasks = false;
        }
        if button("📜  TASKS", rp_x+4.0, ab_y+48.0, rp_w-8.0, 40.0, PANEL_MID) {
            s.show_tasks = !s.show_tasks;
            s.show_trade = false;
        }
        if button("⏩  END TURN", rp_x+4.0, ab_y+96.0, rp_w-8.0, 44.0, RED_BTN) {
            action = GameAction::EndTurn;
        }
    }
    if button("📖  Rules", rp_x+4.0, ab_y+148.0, rp_w-8.0, 32.0, PANEL_MID) {
        s.show_rules = !s.show_rules;
    }
    if button("🚪  Leave", rp_x+4.0, ab_y+188.0, rp_w/2.0-6.0, 28.0, RED_BTN) {
        action = GameAction::Leave;
    }
    if button("🔄 Refresh", rp_x + rp_w/2.0+2.0, ab_y+188.0, rp_w/2.0-6.0, 28.0, BLUE_BTN) {
        action = GameAction::PollState;
    }

    // ── Bottom tile picker ────────────────────────────────────────────────
    if is_my_turn && my_island.active_event.is_none() {
        let picker_h = 70.0;
        draw_rectangle(0.0, sh - picker_h, sw, picker_h,
            Color { r:0.16, g:0.10, b:0.05, a:0.95 });
        draw_rectangle(0.0, sh - picker_h, sw, 2.0, GOLD_DARK);

        let tile_w  = 62.0;
        let start_x = (sw - tile_w * TILE_PICKER.len() as f32) / 2.0;
        for (i, (tile_id, label)) in TILE_PICKER.iter().enumerate() {
            let tx  = start_x + i as f32 * tile_w;
            let ty  = sh - picker_h + 6.0;
            let selected = s.selected_tile.as_deref() == Some(tile_id);
            let col = crate::ui::colors::tile_color(tile_id);

            // Picker tile preview
            draw_hex_tile(tx + 30.0, ty + 26.0, 24.0, col, label, false, selected);
            if selected {
                draw_rectangle_lines(tx, ty, tile_w - 2.0, picker_h - 8.0, 2.0, GOLD);
            }

            if mouse_in(tx, ty, tile_w-2.0, picker_h-8.0) && is_mouse_button_pressed(MouseButton::Left) {
                if selected { s.selected_tile = None; }
                else        { s.selected_tile = Some(tile_id.to_string()); }
            }
        }
        // Rotation control
        draw_text_shadow(&format!("Rotate: {}°", s.selected_rotation),
            start_x - 100.0, sh - picker_h/2.0 + 6.0, 14.0, GOLD_TEXT);
        if button("<", start_x-100.0, sh - picker_h + 24.0, 28.0, 28.0, PANEL_MID) {
            s.selected_rotation = (s.selected_rotation + 300) % 360;
        }
        if button(">", start_x - 66.0, sh - picker_h + 24.0, 28.0, 28.0, PANEL_MID) {
            s.selected_rotation = (s.selected_rotation + 60) % 360;
        }
    }

    // ── Tile placement click ──────────────────────────────────────────────
    if is_my_turn && s.selected_tile.is_some() && is_mouse_button_pressed(MouseButton::Left) {
        if let (Some(q), Some(r)) = (s.hovered_q, s.hovered_r) {
            if slots.contains(&(q,r)) {
                action = GameAction::PlaceTile {
                    q, r,
                    tile_id:  s.selected_tile.clone().unwrap(),
                    rotation: s.selected_rotation,
                };
                s.selected_tile = None;
            }
        }
    }

    // ── Trade overlay ─────────────────────────────────────────────────────
    if s.show_trade {
        let ow = (sw * 0.55).min(580.0);
        let oh = 340.0;
        let ox = sw/2.0 - ow/2.0;
        let oy = sh/2.0 - oh/2.0;
        draw_panel_titled(ox, oy, ow, oh, "  Haat Traders");
        for (i, trader) in traders.iter().enumerate().take(5) {
            let ty = oy + 46.0 + i as f32 * 52.0;
            draw_rectangle(ox+10.0, ty, ow-20.0, 48.0, PANEL_MID);
            draw_rectangle_lines(ox+10.0, ty, ow-20.0, 48.0, 1.0, PANEL_BORDER);

            let avatar = trader["avatar"].as_str().unwrap_or("?");
            let name   = trader["name"].as_str().unwrap_or("?");
            let offer_r= trader["offered_resource"].as_str().unwrap_or("?");
            let offer_q= trader["offered_qty"].as_i64().unwrap_or(0);
            let want_r = trader["requested_resource"].as_str().unwrap_or("?");
            let want_q = trader["requested_qty"].as_i64().unwrap_or(0);
            let tid    = trader["id"].as_str().unwrap_or("").to_string();

            draw_text_shadow(&format!("{} {}  ⟶  give {} {} → get {} {}",
                avatar, name, want_q, want_r, offer_q, offer_r),
                ox+18.0, ty+20.0, 14.0, WHITE);
            let player_has = my_island.resources.get(want_r);
            let can_trade  = player_has >= want_q as i32 && my_island.trades_this_round < 2;
            let btn_col    = if can_trade { GREEN_BTN } else { DISABLED };
            if button("TRADE", ox+ow-100.0, ty+8.0, 82.0, 32.0, btn_col) && can_trade {
                action = GameAction::Trade { trader_id: tid };
                s.show_trade = false;
            }
        }
        if button("Close", ox + ow/2.0 - 50.0, oy+oh-42.0, 100.0, 32.0, RED_BTN) {
            s.show_trade = false;
        }
    }

    // ── Tasks overlay ─────────────────────────────────────────────────────
    if s.show_tasks {
        let ow = (sw * 0.55).min(580.0);
        let oh = 340.0;
        let ox = sw/2.0 - ow/2.0;
        let oy = sh/2.0 - oh/2.0;
        draw_panel_titled(ox, oy, ow, oh, "  Development Tasks");
        for (i, task) in tasks.iter().enumerate().take(5) {
            let ty = oy + 46.0 + i as f32 * 52.0;
            draw_rectangle(ox+10.0, ty, ow-20.0, 48.0, PANEL_MID);
            draw_rectangle_lines(ox+10.0, ty, ow-20.0, 48.0, 1.0, PANEL_BORDER);

            let name  = task["name"].as_str().unwrap_or("Task");
            let pts   = task["points"].as_i64().unwrap_or(0);
            let tid   = task["id"].as_str().unwrap_or("").to_string();
            let done  = my_island.completed_tasks.contains(&tid);

            draw_text_shadow(&format!("{} — {} pts", name, pts), ox+18.0, ty+22.0, 14.0, WHITE);
            if done {
                draw_text_shadow("✅ DONE", ox+ow-90.0, ty+22.0, 14.0, GREEN_BTN);
            } else if button("BUILD", ox+ow-100.0, ty+8.0, 82.0, 32.0, GREEN_BTN) {
                action = GameAction::CompleteTask { task_id: tid };
                s.show_tasks = false;
            }
        }
        if button("Close", ox + ow/2.0 - 50.0, oy+oh-42.0, 100.0, 32.0, RED_BTN) {
            s.show_tasks = false;
        }
    }

    // ── Rules overlay ─────────────────────────────────────────────────────
    if s.show_rules {
        let ow = (sw * 0.62).min(640.0);
        let oh = 440.0;
        let ox = sw/2.0 - ow/2.0;
        let oy = sh/2.0 - oh/2.0;
        draw_panel_titled(ox, oy, ow, oh, "  Game Rules");
        let rules = [
            "• 6 Rounds total, divided into 3 Levels (2 rounds each).",
            "• Each round: Respond to Event → Build → Trade → Complete Task → End Turn.",
            "• Tiles must connect to your existing island (hex adjacency).",
            "• Matching tile edges with neighbours earns bonus points (+15 each).",
            "• 2+ edges matched: +25 bonus!",
            "• Resources are produced each turn from your tiles.",
            "• Max 2 Haat Trades per round.",
            "• Fire/Drought needs Water to extinguish (2 units).",
            "• Festival and Harvest events give free resources.",
            "• Cultural Harmony affects final score (/10 bonus points).",
            "• Highest total score (Tasks + Events + Harmony) wins!",
        ];
        for (i, r) in rules.iter().enumerate() {
            draw_text_shadow(r, ox+16.0, oy+50.0 + i as f32*34.0, 14.0, STONE_LIGHT);
        }
        if button("Got it!", ox+ow/2.0-55.0, oy+oh-46.0, 110.0, 34.0, GREEN_BTN) {
            s.show_rules = false;
        }
    }

    // ── Floating message ──────────────────────────────────────────────────
    if s.message_timer > 0.0 {
        s.message_timer -= dt;
        let alpha = (s.message_timer / 2.5).min(1.0);
        draw_rectangle(sw/2.0-220.0, sh*0.47, 440.0, 36.0,
            Color { r:0.0, g:0.0, b:0.0, a:alpha*0.75 });
        draw_text_centered(&s.last_message, sw/2.0, sh*0.47+24.0, 17.0,
            Color { r:GOLD_TEXT.r, g:GOLD_TEXT.g, b:GOLD_TEXT.b, a:alpha });
    }

    action
}
