//! Cultural Islands — Macroquad WASM client entry point
#![allow(dead_code)]
use macroquad::prelude::*;
mod types;
mod network;
mod ui;
mod screens;
mod app;

use app::App;

fn window_conf() -> Conf {
    Conf {
        window_title:     "Cultural Islands".to_string(),
        window_width:     1280,
        window_height:    720,
        window_resizable: true,
        high_dpi:         false,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    // NOTE: do NOT use console_error_panic_hook here. It depends on wasm-bindgen and makes the
    // .wasm import `__wbindgen_placeholder__` functions, which Miniquad's gl.js loader does not
    // provide, so the module fails to link and the page stays blank.
    // Route panics to the browser console through Miniquad's own logger instead.
    std::panic::set_hook(Box::new(|info| {
        macroquad::logging::error!("PANIC: {}", info);
    }));

    let mut app = App::new();
    loop {
        app.frame();
        next_frame().await;
    }
}
