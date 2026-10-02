//! Drawing primitives with CoC aesthetic — panels, buttons, hex tiles, text with shadow.
use macroquad::prelude::*;
use crate::ui::colors::*;
use std::f32::consts::PI;

// ── Text helpers ─────────────────────────────────────────────────────────────
/// Macroquad's built-in font only contains printable ASCII. Emoji and fancy
/// punctuation render as blank boxes (or nothing), so map the common ones to
/// ASCII look-alikes and drop everything else. Also used on server-provided
/// strings (trader avatars, action log) that may contain emoji.
pub fn ascii_safe(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            ' '..='~' => out.push(c),
            '\u{2014}' | '\u{2013}' => out.push('-'),
            '\u{2192}' | '\u{27F6}' | '\u{25B6}' => out.push('>'),
            '\u{2026}' => out.push_str("..."),
            '\u{2022}' | '\u{00B7}' => out.push('*'),
            '\u{00B0}' => out.push_str(" deg"),
            '\u{2705}' | '\u{2713}' => out.push('+'),
            '\u{26A0}' => out.push('!'),
            '\n' | '\t' => out.push(' '),
            _ => {} // emoji, variation selectors, zero-width joiners, ...
        }
    }
    out
}

// ── Shadow text ──────────────────────────────────────────────────────────────
pub fn draw_text_shadow(text: &str, x: f32, y: f32, size: f32, color: Color) {
    let text = ascii_safe(text);
    draw_text(&text, x + 2.0, y + 2.0, size, SHADOW);
    draw_text(&text, x, y, size, color);
}

pub fn draw_text_centered(text: &str, cx: f32, cy: f32, size: f32, color: Color) {
    let text = ascii_safe(text);
    let dim = measure_text(&text, None, size as u16, 1.0);
    draw_text_shadow(&text, cx - dim.width / 2.0, cy + dim.height / 2.0, size, color);
}

// ── CoC-style beveled panel ──────────────────────────────────────────────────
pub fn draw_panel(x: f32, y: f32, w: f32, h: f32) {
    // Drop shadow
    draw_rectangle(x + 4.0, y + 5.0, w, h, Color { r:0.0, g:0.0, b:0.0, a:0.40 });
    // Dark outer rim
    draw_rectangle(x - 2.0, y - 2.0, w + 4.0, h + 4.0, PANEL_BORDER);
    // Main body
    draw_rectangle(x, y, w, h, PANEL_BG);
    // Inner highlight top
    draw_rectangle(x + 2.0, y + 2.0, w - 4.0, 3.0,
        Color { r:1.0, g:1.0, b:1.0, a:0.08 });
    // Gold border line
    draw_rectangle_lines(x, y, w, h, 2.0, GOLD_DARK);
}

pub fn draw_panel_titled(x: f32, y: f32, w: f32, h: f32, title: &str) {
    draw_panel(x, y, w, h);
    // Title bar
    draw_rectangle(x, y, w, 32.0, Color { r:0.0, g:0.0, b:0.0, a:0.35 });
    draw_text_shadow(title, x + 10.0, y + 22.0, 20.0, GOLD_TEXT);
    draw_rectangle(x, y + 32.0, w, 1.0, GOLD_DARK);
}

// ── CoC-style button (returns true if clicked) ───────────────────────────────
pub fn button(label: &str, x: f32, y: f32, w: f32, h: f32, color: Color) -> bool {
    let (mx, my) = mouse_position();
    let hovered  = mx >= x && mx <= x+w && my >= y && my <= y+h;
    let clicked  = hovered && is_mouse_button_pressed(MouseButton::Left);
    let c = if hovered { Color { r: color.r*1.2, g: color.g*1.2, b: color.b*1.2, a:1.0 } } else { color };

    // Shadow
    draw_rectangle(x+3.0, y+4.0, w, h, Color { r:0.0, g:0.0, b:0.0, a:0.45 });
    // Button bevel outer
    draw_rectangle(x-1.0, y-1.0, w+2.0, h+2.0, GOLD_DARK);
    // Button body
    draw_rectangle(x, y, w, h, c);
    // Top highlight bevel
    draw_rectangle(x+1.0, y+1.0, w-2.0, h/4.0,
        Color { r:1.0, g:1.0, b:1.0, a:0.18 });
    // Bottom shadow bevel
    draw_rectangle(x+1.0, y+h*0.75, w-2.0, h*0.25 - 1.0,
        Color { r:0.0, g:0.0, b:0.0, a:0.20 });
    // Label
    draw_text_centered(label, x + w/2.0, y + h/2.0 + 2.0, (h * 0.45).min(22.0), WHITE);
    clicked
}

// ── Hex tile 3-D rendering ───────────────────────────────────────────────────
fn hex_corners(cx: f32, cy: f32, r: f32, y_squish: f32) -> [(f32,f32);6] {
    let mut pts = [(0.0f32, 0.0f32); 6];
    for i in 0..6 {
        let angle = (30.0 + 60.0 * i as f32) * PI / 180.0;
        pts[i] = (cx + r * angle.cos(), cy + r * angle.sin() * y_squish);
    }
    pts
}

fn draw_quad(v: [(f32,f32);4], color: Color) {
    draw_triangle(
        Vec2::new(v[0].0,v[0].1), Vec2::new(v[1].0,v[1].1), Vec2::new(v[2].0,v[2].1), color);
    draw_triangle(
        Vec2::new(v[0].0,v[0].1), Vec2::new(v[2].0,v[2].1), Vec2::new(v[3].0,v[3].1), color);
}

fn fill_hex(pts: &[(f32,f32);6], color: Color) {
    let cx = pts.iter().map(|p|p.0).sum::<f32>() / 6.0;
    let cy = pts.iter().map(|p|p.1).sum::<f32>() / 6.0;
    for i in 0..6 {
        let j = (i+1)%6;
        draw_triangle(
            Vec2::new(cx,cy),
            Vec2::new(pts[i].0, pts[i].1),
            Vec2::new(pts[j].0, pts[j].1),
            color,
        );
    }
}

/// Draw a 3-D isometric hex tile with CoC depth walls.
/// `label` is the 4-char shortcode drawn on top.
pub fn draw_hex_tile(cx: f32, cy: f32, radius: f32, top_color: Color,
                     label: &str, damaged: bool, selected: bool) {
    let depth    = radius * 0.25;
    let squish   = 0.60; // y-squish for isometric feel

    let top = hex_corners(cx, cy,        radius, squish);
    let bot = hex_corners(cx, cy+depth,  radius, squish);

    // Ground shadow
    draw_circle(cx + 3.0, cy + depth + 4.0, radius * 0.65,
        Color { r:0.0, g:0.0, b:0.0, a:0.18 });

    // ── 3D side walls (bottom-visible faces) ─────────────────────────────
    // Left wall       (corners 1→2)
    draw_quad([top[1], top[2], bot[2], bot[1]], SIDE_DARK);
    // Front-left wall (corners 2→3)
    draw_quad([top[2], top[3], bot[3], bot[2]], SIDE_MID);
    // Front-right wall(corners 3→4)
    draw_quad([top[3], top[4], bot[4], bot[3]], SIDE_LIGHT);

    // ── Top surface ───────────────────────────────────────────────────────
    let surface_color = if damaged {
        Color { r: top_color.r*0.55, g: top_color.g*0.55, b: top_color.b*0.55, a:1.0 }
    } else { top_color };
    fill_hex(&top, surface_color);

    // Surface sheen
    fill_hex(&hex_corners(cx - radius*0.08, cy - radius*0.12, radius*0.55, squish*0.5),
        Color { r:1.0, g:1.0, b:1.0, a:0.07 });

    // ── Rim / outline ─────────────────────────────────────────────────────
    let rim_color = if selected { GOLD } else { Color { r:0.0, g:0.0, b:0.0, a:0.55 } };
    for i in 0..6 {
        let j = (i+1)%6;
        draw_line(top[i].0,top[i].1, top[j].0,top[j].1,
            if selected { 2.5 } else { 1.0 }, rim_color);
    }

    // ── Label text ────────────────────────────────────────────────────────
    let font_sz  = (radius * 0.34).max(11.0).min(18.0);
    draw_text_centered(label, cx, cy + font_sz*0.3, font_sz, WHITE);

    // ── Damaged overlay ───────────────────────────────────────────────────
    if damaged {
        draw_text_centered("!", cx, cy - radius*0.30, (radius*0.55).min(26.0), RED_BTN);
    }
}

/// Draw an empty placement slot (ghost hex)
pub fn draw_hex_slot(cx: f32, cy: f32, radius: f32, hovered: bool) {
    let squish = 0.60;
    let pts = hex_corners(cx, cy, radius, squish);
    let color = if hovered {
        Color { r:1.0, g:0.85, b:0.0, a:0.35 }
    } else {
        Color { r:1.0, g:1.0, b:1.0, a:0.12 }
    };
    fill_hex(&pts, color);
    let outline = if hovered { GOLD } else { Color { r:1.0, g:1.0, b:1.0, a:0.30 } };
    for i in 0..6 {
        let j = (i+1)%6;
        draw_line(pts[i].0,pts[i].1, pts[j].0,pts[j].1, 1.2, outline);
    }
    if hovered {
        draw_text_centered("+", cx, cy + 5.0, 22.0, GOLD);
    }
}

/// Resource pill — shows coloured dot + count
pub fn draw_resource_pill(label: &str, count: i32, x: f32, y: f32,
                           w: f32, h: f32, color: Color) {
    draw_rectangle(x+2.0, y+2.0, w, h, Color { r:0.0, g:0.0, b:0.0, a:0.4 });
    draw_rectangle(x, y, w, h, PANEL_MID);
    draw_rectangle_lines(x, y, w, h, 1.5, color);
    // Colour dot
    draw_circle(x + 14.0, y + h/2.0, 5.0, color);
    // Label + count
    let text = format!("{} {}", label, count);
    let fs = (h * 0.5).min(16.0);
    draw_text_shadow(&text, x + 24.0, y + h/2.0 + fs*0.35, fs, WHITE);
}

/// Progress bar
pub fn draw_progress_bar(x: f32, y: f32, w: f32, h: f32,
                          value: f32, max: f32, color: Color) {
    draw_rectangle(x, y, w, h, Color { r:0.0, g:0.0, b:0.0, a:0.5 });
    let fill = (value / max).clamp(0.0, 1.0) * (w - 2.0);
    draw_rectangle(x+1.0, y+1.0, fill, h-2.0, color);
    draw_rectangle_lines(x, y, w, h, 1.0, GOLD_DARK);
}

/// Simple text input field (draws box + cursor)
pub fn draw_text_field(label: &str, value: &str, x: f32, y: f32,
                        w: f32, h: f32, active: bool) {
    let border_col = if active { GOLD } else { PANEL_BORDER };
    draw_rectangle(x+2.0, y+2.0, w, h, Color { r:0.0,g:0.0,b:0.0,a:0.35 });
    draw_rectangle(x, y, w, h, Color { r:0.12, g:0.08, b:0.05, a:1.0 });
    draw_rectangle_lines(x, y, w, h, 2.0, border_col);
    let fs = (h * 0.45).min(18.0);
    let display = if active {
        format!("{}|", value)
    } else {
        value.to_string()
    };
    draw_text_shadow(&display, x + 8.0, y + h/2.0 + fs*0.35, fs, WHITE);
    // Floating label
    draw_text_shadow(label, x, y - 16.0, 14.0, GOLD_TEXT);
}

/// Check if (x,y) is inside rect
pub fn mouse_in(x: f32, y: f32, w: f32, h: f32) -> bool {
    let (mx, my) = mouse_position();
    mx >= x && mx <= x+w && my >= y && my <= y+h
}
