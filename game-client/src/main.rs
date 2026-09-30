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
        high_dpi:         true,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    #[cfg(target_arch = "wasm32")]
    std::panic::set_hook(Box::new(|info| {
        macroquad::logging::error!("{}", info);
    }));

    let mut app = App::new();
    loop {
        app.frame();
        next_frame().await;
    }
}
