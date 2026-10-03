//! Cultural Islands rules engine.
pub mod bot;
pub mod data;
pub mod game;
pub mod hazard;
pub mod hex;
pub mod rng;
pub mod view;

pub use data::*;
pub use game::*;
pub use hex::Coord;
pub use rng::{daily_seed, hash_seed, Rng};

/// Rules identity. Browser (WASM) and server (native) must match for scores to verify.
pub const RULES_VERSION: &str = env!("CARGO_PKG_VERSION");
