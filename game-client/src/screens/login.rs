use macroquad::prelude::*;
use crate::ui::{colors::*, draw::*};

#[derive(Default)]
pub struct LoginState {
    pub username:    String,
    pub password:    String,
    pub display_name:String,
    pub active_field: u8,  // 0=username 1=password 2=display_name
    pub is_register: bool,
    pub error_msg:   String,
    pub loading:     bool,
}

pub enum LoginAction {
    None,
    Login    { username: String, password: String },
    Register { username: String, password: String, display_name: String },
    Back,
}

pub fn update_input(text: &mut String) {
    if let Some(c) = get_char_pressed() {
        if c != '\u{8}' && c != '\r' && c != '\n' { text.push(c); }
    }
    if is_key_pressed(KeyCode::Backspace) { text.pop(); }
}

pub fn draw_login(s: &mut LoginState, t: f32) -> LoginAction {
    let sw = screen_width();
    let sh = screen_height();
    clear_background(BG_DARK);

    // Subtle radial glow
    draw_circle(sw/2.0, sh/2.0, sh*0.55,
        Color { r:0.28, g:0.18, b:0.08, a:0.12 });

    let pw = 400.0;
    let ph = if s.is_register { 420.0 } else { 330.0 };
    let px = sw/2.0 - pw/2.0;
    let py = sh/2.0 - ph/2.0;
    draw_panel_titled(px, py, pw, ph,
        if s.is_register { "  Create Account" } else { "  Login to Your Island" });

    let fx = px + 30.0;
    let fw = pw - 60.0;

    // Keyboard input routing
    match s.active_field {
        0 => update_input(&mut s.username),
        1 => update_input(&mut s.password),
        2 => update_input(&mut s.display_name),
        _ => {}
    }

    // Username
    let uy = py + 55.0;
    if mouse_in(fx, uy, fw, 38.0) && is_mouse_button_pressed(MouseButton::Left) { s.active_field=0; }
    draw_text_field("Username", &s.username, fx, uy, fw, 38.0, s.active_field==0);

    // Password
    let py2 = uy + 68.0;
    if mouse_in(fx, py2, fw, 38.0) && is_mouse_button_pressed(MouseButton::Left) { s.active_field=1; }
    let pw_display = "*".repeat(s.password.len());
    draw_text_field("Password", &pw_display, fx, py2, fw, 38.0, s.active_field==1);

    // Display name (register only)
    if s.is_register {
        let dn_y = py2 + 68.0;
        if mouse_in(fx, dn_y, fw, 38.0) && is_mouse_button_pressed(MouseButton::Left) { s.active_field=2; }
        draw_text_field("Display Name", &s.display_name, fx, dn_y, fw, 38.0, s.active_field==2);
    }

    let btn_y = py + ph - 115.0;
    let mut action = LoginAction::None;

    if !s.loading {
        let btn_label = if s.is_register { "CREATE ACCOUNT" } else { "LOGIN" };
        if button(btn_label, fx, btn_y, fw, 46.0, GREEN_BTN) {
            if s.username.len() < 3 {
                s.error_msg = "Username must be at least 3 characters.".into();
            } else if s.password.len() < 4 {
                s.error_msg = "Password must be at least 4 characters.".into();
            } else if s.is_register {
                let dn = if s.display_name.is_empty() { s.username.clone() } else { s.display_name.clone() };
                action = LoginAction::Register {
                    username: s.username.clone(),
                    password: s.password.clone(),
                    display_name: dn,
                };
                s.loading = true;
            } else {
                action = LoginAction::Login {
                    username: s.username.clone(),
                    password: s.password.clone(),
                };
                s.loading = true;
            }
        }

        let toggle_label = if s.is_register { "Already have an account? Login" } else { "No account? Create one" };
        if button(toggle_label, fx, btn_y + 56.0, fw, 36.0, BLUE_BTN) {
            s.is_register = !s.is_register;
            s.error_msg.clear();
        }
        if button("Back", fx, btn_y + 100.0, fw/2.0 - 4.0, 32.0, PANEL_MID) {
            action = LoginAction::Back;
        }
    } else {
        // Loading spinner
        let dots = ".".repeat(1 + ((t*3.0) as usize % 3));
        draw_text_centered(&format!("Loading{}", dots), sw/2.0, btn_y+30.0, 20.0, GOLD_TEXT);
    }

    if !s.error_msg.is_empty() {
        draw_rectangle(fx, btn_y - 34.0, fw, 28.0,
            Color { r:0.6, g:0.05, b:0.02, a:0.80 });
        draw_text_shadow(&s.error_msg, fx+8.0, btn_y - 14.0, 14.0, WHITE);
    }
    action
}
