//! JSON views for the client. The client NEVER computes rules: it asks the
//! engine what to draw, what is legal, what a move would do, and what it costs.

use crate::data::*;
use crate::game::*;
use crate::hazard::{adjusted_sev, base_sev};
use serde_json::{json, Map, Value};

fn res_obj(a: &[i32; 8]) -> Value {
    let mut m = Map::new();
    for r in ALL_RES {
        m.insert(r.name().to_string(), json!(a[r.idx()]));
    }
    Value::Object(m)
}

fn cost_obj(c: &[(Res, i32)]) -> Value {
    let mut m = Map::new();
    for (r, n) in c {
        m.insert(r.name().to_string(), json!(n));
    }
    Value::Object(m)
}

fn blessing_json(b: Blessing) -> Value {
    json!({ "id": serde_json::to_value(b).unwrap_or(Value::Null), "name": b.name(), "text": b.text() })
}

fn slot_json(g: &Game, round: u32) -> Value {
    if round > g.cfg.rounds {
        return Value::Null;
    }
    match g
        .plan
        .get(round as usize - 1)
        .copied()
        .unwrap_or(Slot::Calm)
    {
        Slot::Calm => json!({ "round": round, "slot": "calm" }),
        Slot::Boon(b) => json!({ "round": round, "slot": "boon", "title": b.title() }),
        Slot::Hazard(k) => {
            json!({ "round": round, "slot": "hazard", "kind": k.id(), "title": k.title() })
        }
    }
}

fn problem_text(p: &Problem) -> String {
    match p.kind {
        HazardKind::Drought => format!(
            "Unirrigated farms will wither. Spend {} water to see the island through.",
            p.cost
        ),
        HazardKind::Flood => format!(
            "Rising water threatens low ground. Spend {} stone on banks and drains.",
            p.cost
        ),
        HazardKind::Storm => format!(
            "High winds. Spend {} wood to batten down the roofs.",
            p.cost
        ),
        HazardKind::Landslide => format!("The slope is moving. Spend {} stone to hold it.", p.cost),
        HazardKind::Fire => String::new(),
    }
}

impl Game {
    pub fn view(&self) -> Value {
        let n = self.tiles.len();
        let mut cells = Vec::with_capacity(n);
        for i in 0..n {
            let c = self.board[i].c;
            let tile = self.tiles[i].map(|t| {
                let def = tile_def(t.kind);
                let y = self.tile_yield(i);
                json!({
                    "kind": def.id, "name": def.name, "hp": t.hp, "burning": t.burning, "age": t.age,
                    "yield": res_obj(&y.res), "harmony": y.harmony, "eco": y.eco, "notes": y.notes,
                    "douse": if t.burning { json!(self.douse_cost(i)) } else { Value::Null },
                    "repair": if t.hp < 2 { cost_obj(&self.repair_cost(t.kind)) } else { Value::Null },
                    "flam": def.flam,
                    "wet": self.near_water(i),
                })
            });
            cells.push(json!({
                "q": c.q, "r": c.r, "terrain": self.board[i].terrain, "ruin": self.ruin[i],
                "cleared": self.cleared[i], "tile": tile,
            }));
        }

        let problems: Vec<Value> = self
            .problems
            .iter()
            .enumerate()
            .map(|(index, p)| {
                let cs: Vec<Value> = p
                    .cells
                    .iter()
                    .map(|&i| json!({"q": self.board[i].c.q, "r": self.board[i].c.r}))
                    .collect();
                json!({
                    "index": index, "kind": p.kind.id(), "title": p.kind.title(), "sev": p.sev,
                    "epi": p.epi.map(|e| json!({"q": self.board[e].c.q, "r": self.board[e].c.r})),
                    "cells": cs, "res": p.res.name(), "cost": p.cost, "resolved": p.resolved,
                    "affordable": self.res[p.res.idx()] >= p.cost, "text": problem_text(p),
                })
            })
            .collect();

        let omens: Vec<Value> = self
            .omens
            .iter()
            .map(|o| {
                json!({
                    "round": o.round, "kind": o.kind.id(), "title": o.kind.title(),
                    "sev": adjusted_sev(self, o.kind, o.sev), "base_sev": o.sev,
                    "epi": o.epi.map(|e| json!({"q": self.board[e].c.q, "r": self.board[e].c.r})),
                })
            })
            .collect();

        let offers: Vec<Value> = self
            .offers
            .iter()
            .enumerate()
            .map(|(index, o)| {
                let t = &TRADERS[o.trader];
                let give = self.trade_cost(o);
                json!({
                    "index": index,
                    "trader": { "id": t.id, "name": t.name, "island": t.island, "avatar": t.avatar },
                    "sells": { "res": o.sells.name(), "n": o.sell_n },
                    "wants": { "res": o.wants.name(), "n": give, "base_n": o.want_n },
                    "taken": o.taken,
                    "affordable": self.res[o.wants.idx()] >= give,
                    "free": self.free_used < self.free_slots(),
                })
            })
            .collect();

        let build: Vec<Value> = TILES
            .iter()
            .map(|d| {
                json!({
                    "kind": d.id, "name": d.name, "blurb": d.blurb, "cost": cost_obj(d.cost),
                    "unlocked": self.is_unlocked(d.kind), "unlock_level": d.unlock_level,
                    "affordable": self.can_afford(d.cost),
                    "terrain": d.terrain, "art": d.art, "prod": cost_obj(d.prod),
                })
            })
            .collect();

        let projects: Vec<Value> = PROJECTS
            .iter()
            .map(|p| {
                let st = self.project_status(p);
                let claimed = self.claimed.contains(&p.id);
                json!({
                    "id": p.id, "name": p.name, "symbol": p.symbol, "level": p.level, "points": p.points,
                    "blurb": p.blurb, "cost": cost_obj(p.cost),
                    "requires": p.requires.iter().map(|k| tile_def(*k).name).collect::<Vec<_>>(),
                    "claimed": claimed, "ready": st.is_ok(),
                    "reason": st.err().unwrap_or_default(),
                })
            })
            .collect();

        let eco = self.economy();
        let need = self.upkeep();
        let band = if self.verdant() {
            "verdant"
        } else if self.degraded() {
            "degraded"
        } else {
            "steady"
        };
        let log: Vec<&String> = self
            .log
            .iter()
            .rev()
            .take(14)
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect();
        let boon = self.boon.as_ref().map(|b| {
            json!({ "kind": b.kind, "title": b.kind.title(), "claimed": b.claimed,
                    "claimable": !b.claimed && b.kind != BoonKind::Caravan })
        });

        json!({
            "round": self.round, "rounds": self.cfg.rounds,
            "season": SEASONS[season_of(self.round)], "season_index": season_of(self.round),
            "season_round": (self.round.max(1) - 1) % 3 + 1,
            "phase": self.phase, "ap": self.ap, "ap_max": self.ap_max(),
            "island": self.cfg.island.id(), "heat": self.cfg.heat, "heat_name": heat_name(self.cfg.heat),
            "res": res_obj(&self.res), "cap": self.cap(),
            "harmony": self.harmony, "ecology": self.ecology, "eco_band": band,
            "cells": cells, "problems": problems, "omens": omens, "boon": boon,
            "outlook": [slot_json(self, self.round + 1), slot_json(self, self.round + 2)],
            "offers": offers, "trades_left": MAX_TRADES - self.trades_done,
            "free_left": (self.free_slots() - self.free_used).max(0), "caravan": self.caravan,
            "build": build, "projects": projects, "goals": self.goals(),
            "dawn": { "res": res_obj(&eco.res), "harmony": eco.harmony - 3, "eco": eco.eco,
                      "upkeep": need, "culture_links": self.culture_links() },
            "blessings": self.blessings.iter().map(|b| blessing_json(*b)).collect::<Vec<_>>(),
            "draft": self.draft.iter().enumerate().map(|(i, b)| {
                let mut v = blessing_json(*b); v["index"] = json!(i); v }).collect::<Vec<_>>(),
            "score_now": self.score_now(), "stats": self.stats,
            "log": log, "outcome": self.outcome, "moves": self.history.len(),
            "ruins": self.ruins(), "tiles": self.alive_tiles(),
            "base_sev_now": base_sev(self.round, self.cfg.heat),
        })
    }

    /// Where could this tile go, and why not elsewhere?
    pub fn build_map(&self, kind: TileKind) -> Value {
        let out: Vec<Value> = (0..self.tiles.len())
            .filter(|&i| self.tiles[i].is_none())
            .map(|i| {
                let c = self.board[i].c;
                match self.build_check(kind, i) {
                    Ok(cost) => json!({ "q": c.q, "r": c.r, "ok": true, "cost": cost_obj(&cost) }),
                    Err(e) => json!({ "q": c.q, "r": c.r, "ok": false, "reason": e }),
                }
            })
            .collect();
        Value::Array(out)
    }

    /// "What happens if I build this here?" computed by actually doing it, then undoing it.
    pub fn preview_build(&mut self, kind: TileKind, q: i32, r: i32) -> Value {
        let Some(i) = self.idx(q, r) else {
            return json!({ "legal": false, "reason": "Not part of the island." });
        };
        match self.build_check(kind, i) {
            Err(e) => json!({ "legal": false, "reason": e }),
            Ok(cost) => {
                let a = self.economy();
                let upkeep_now = self.upkeep();
                self.tiles[i] = Some(Tile {
                    kind,
                    hp: 2,
                    burning: false,
                    age: 0,
                });
                let b = self.economy();
                let notes = self.tile_yield(i).notes;
                let wet = self.near_water(i);
                let upkeep_after = self.upkeep();
                let fire_exposed = self.nbrs[i]
                    .iter()
                    .filter(|&&j| {
                        j != i && matches!(self.tiles[j], Some(t) if tile_def(t.kind).flam > 0)
                    })
                    .count();
                self.tiles[i] = None;
                let mut d = [0i32; 8];
                for k in 0..8 {
                    d[k] = b.res[k] - a.res[k];
                }
                let def = tile_def(kind);
                json!({
                    "legal": true, "cost": cost_obj(&cost), "ap_ok": self.ap >= 1,
                    "delta": { "res": res_obj(&d), "harmony": b.harmony - a.harmony, "eco": b.eco - a.eco },
                    "notes": notes, "flam": def.flam, "wet": wet, "flammable_neighbours": fire_exposed,
                    "upkeep_after": upkeep_after, "upkeep_now": upkeep_now,
                })
            }
        }
    }
}

pub fn catalog() -> Value {
    let tiles: Vec<Value> = TILES
        .iter()
        .map(|d| {
            json!({
                "kind": d.id, "name": d.name, "blurb": d.blurb, "cost": cost_obj(d.cost), "prod": cost_obj(d.prod),
                "flam": d.flam, "terrain": d.terrain, "unlock_level": d.unlock_level, "art": d.art,
            })
        })
        .collect();
    let islands = json!([
        { "id": "forest", "name": "Forest", "bonus": "WOOD", "risk": "Higher fire risk",
          "desc": "Dense timber and a dangerous dry edge.", "unlock_level": 1 },
        { "id": "farming", "name": "Farming", "bonus": "GRAIN", "risk": "Drought / crop stress",
          "desc": "Abundant harvests, but water becomes precious.", "unlock_level": 1 },
        { "id": "coastal", "name": "Coastal", "bonus": "WATER", "risk": "Floods / storms",
          "desc": "The sea pays well and punishes carelessness.", "unlock_level": 3 },
        { "id": "mountain", "name": "Mountain", "bonus": "STONE", "risk": "Landslides / difficult construction",
          "desc": "Stone and ore come easily; every slope matters.", "unlock_level": 5 },
    ]);
    let heats: Vec<Value> = (0..=MAX_HEAT)
        .map(|h| json!({ "heat": h, "name": heat_name(h), "text": heat_text(h) }))
        .collect();
    let blessings: Vec<Value> = ALL_BLESSINGS.iter().map(|b| blessing_json(*b)).collect();
    json!({
        "tiles": tiles, "islands": islands, "heats": heats, "blessings": blessings,
        "seasons": SEASONS, "level_xp": LEVEL_XP, "max_heat": MAX_HEAT,
    })
}

pub fn unlocks(level: u32) -> Value {
    json!({
        "level": level,
        "tiles": tiles_unlocked_at(level),
        "islands": islands_unlocked_at(level),
    })
}
