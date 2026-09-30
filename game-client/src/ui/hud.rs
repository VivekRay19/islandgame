//! Top HUD bar — resources, round, cultural harmony, active event alert
use macroquad::prelude::*;
use crate::ui::{colors::*, draw::*};
use crate::types::{Resources, ActiveEvent};

pub fn draw_hud(res: &Resources, round: i32, max_round: i32,
                harmony: i32, active_event: Option<&ActiveEvent>,
                player_name: &str) {
    let sw = screen_width();

    // HUD background strip
    draw_rectangle(0.0, 0.0, sw, 58.0,
        Color { r:0.13, g:0.08, b:0.04, a:0.97 });
    draw_rectangle(0.0, 56.0, sw, 2.0, GOLD_DARK);

    // ── Left: resources ───────────────────────────────────────────────────
    let pills = [
        ("GRN", res.grain, RES_GRAIN),
        ("FBR", res.fibre, RES_FIBRE),
        ("WOD", res.wood,  RES_WOOD),
        ("STN", res.stone, RES_STONE),
        ("CLY", res.clay,  RES_CLAY),
        ("WTR", res.water, RES_WATER),
        ("MUS", res.music, RES_MUSIC),
        ("ORE", res.ore,   RES_ORE),
    ];
    for (i,(label, count, color)) in pills.iter().enumerate() {
        draw_resource_pill(label, *count, 8.0 + i as f32 * 74.0, 8.0, 70.0, 40.0, *color);
    }

    // ── Centre: round + harmony ───────────────────────────────────────────
    let cx = sw / 2.0;
    // Round badge
    draw_rectangle(cx - 90.0, 6.0, 180.0, 46.0,
        Color { r:0.0, g:0.0, b:0.0, a:0.55 });
    draw_rectangle_lines(cx - 90.0, 6.0, 180.0, 46.0, 1.5, GOLD_DARK);
    draw_text_centered(&format!("Round {}/{}", round, max_round),
        cx, 25.0, 18.0, GOLD_TEXT);
    // Cultural harmony bar
    draw_progress_bar(cx - 80.0, 32.0, 160.0, 12.0,
        harmony as f32, 100.0, Color { r:0.6, g:0.3, b:0.9, a:1.0 });
    draw_text_centered(&format!("Harmony {}", harmony), cx, 45.0, 12.0, STONE_LIGHT);

    // ── Right: player + event alert ───────────────────────────────────────
    let rx = sw - 240.0;
    draw_text_shadow(player_name, rx, 22.0, 17.0, GOLD_TEXT);

    if let Some(ev) = active_event {
        let label = match ev.event_id.as_str() {
            "fire_event"     => "🔥 FIRE — Use water!",
            "festival_event" => "🎉 FESTIVAL!",
            "harvest_bounty" => "🌾 HARVEST!",
            "drought"        => "☀️ DROUGHT!",
            "storm"          => "⛈️ STORM!",
            _                => "⚠️ EVENT!",
        };
        // Pulsing alert box
        let t       = get_time() as f32;
        let alpha   = 0.55 + 0.45 * ((t * 3.0).sin());
        draw_rectangle(rx - 4.0, 30.0, 236.0, 24.0,
            Color { r:0.8, g:0.15, b:0.0, a:alpha });
        draw_text_shadow(label, rx + 2.0, 46.0, 14.0, WHITE);
    }
}
