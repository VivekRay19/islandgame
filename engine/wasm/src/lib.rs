//! Thin WebAssembly wrapper. Every call crosses the boundary as a JSON string
//! (simple, debuggable, stable across wasm-bindgen versions).
use island_core::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct Engine {
    g: Game,
}

fn err(s: impl Into<String>) -> String {
    serde_json::json!({ "ok": false, "error": s.into() }).to_string()
}

#[wasm_bindgen]
impl Engine {
    /// `config_json`: {"seed":123,"island":"forest","heat":0,"rounds":12,"unlocked":[...]|null}
    #[wasm_bindgen(constructor)]
    pub fn new(config_json: &str) -> Result<Engine, JsError> {
        let cfg: Config = serde_json::from_str(config_json)
            .map_err(|e| JsError::new(&format!("bad config: {e}")))?;
        Ok(Engine { g: Game::new(cfg) })
    }

    /// Full renderable state.
    pub fn view(&self) -> String {
        self.g.view().to_string()
    }

    /// Apply a command. Returns {"ok":true,"events":[...]} or {"ok":false,"error":"..."}.
    pub fn apply(&mut self, command_json: &str) -> String {
        let cmd: Command = match serde_json::from_str(command_json) {
            Ok(c) => c,
            Err(e) => return err(format!("bad command: {e}")),
        };
        match self.g.apply(&cmd) {
            Ok(ev) => serde_json::json!({ "ok": true, "events": ev }).to_string(),
            Err(e) => err(e),
        }
    }

    /// Legal sites for a tile kind ("tile_farm", ...).
    pub fn build_map(&self, kind: &str) -> String {
        match serde_json::from_value::<TileKind>(serde_json::json!(kind)) {
            Ok(k) => self.g.build_map(k).to_string(),
            Err(_) => "[]".into(),
        }
    }

    pub fn preview_build(&mut self, kind: &str, q: i32, r: i32) -> String {
        match serde_json::from_value::<TileKind>(serde_json::json!(kind)) {
            Ok(k) => self.g.preview_build(k, q, r).to_string(),
            Err(_) => err("unknown tile"),
        }
    }

    /// The Advisor's suggested next command.
    pub fn hint(&mut self) -> String {
        serde_json::to_string(&bot::hint(&mut self.g)).unwrap_or_default()
    }

    /// Everything played so far, for submitting to the server.
    pub fn history(&self) -> String {
        serde_json::to_string(&self.g.history).unwrap_or_else(|_| "[]".into())
    }

    pub fn config(&self) -> String {
        serde_json::to_string(&self.g.cfg).unwrap_or_default()
    }
}

#[wasm_bindgen]
pub fn catalog() -> String {
    view::catalog().to_string()
}

#[wasm_bindgen]
pub fn unlocks(level: u32) -> String {
    view::unlocks(level).to_string()
}

#[wasm_bindgen]
pub fn level_for_xp(xp: u32) -> u32 {
    data::level_for_xp(xp)
}

/// Seed from a text code ("TABLE-7F2K") or a date for the daily island.
#[wasm_bindgen]
pub fn seed_from_code(code: &str) -> f64 {
    rng::hash_seed(&code.trim().to_uppercase()) as f64
}

#[wasm_bindgen]
pub fn daily_seed_for(date: &str) -> f64 {
    rng::daily_seed(date) as f64
}

#[wasm_bindgen]
pub fn island_for_seed(seed: f64) -> String {
    data::island_for_seed(seed as u64).id().to_string()
}

#[wasm_bindgen]
pub fn rules_version() -> String {
    RULES_VERSION.to_string()
}
