//! The rules engine. A `Game` is a pure state machine:
//!
//!     Game::new(config)  +  [Command, Command, ...]  =>  state
//!
//! Nothing here touches I/O, time or OS randomness, so the browser (WASM) and
//! the server (native) compute the exact same result from the same inputs.
//! The server verifies a finished run by replaying its commands.

use crate::data::*;
use crate::hex::*;
use crate::rng::Rng;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

pub const START_AP: i32 = 3;
pub const BASE_CAP: i32 = 10;
pub const MAX_TRADES: i32 = 2;
pub const DAWN_UNREST: i32 = 8;

fn default_rounds() -> u32 {
    12
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Config {
    pub seed: u64,
    pub island: IslandKind,
    #[serde(default)]
    pub heat: u8,
    #[serde(default = "default_rounds")]
    pub rounds: u32,
    /// `None` = every tile unlocked (practice). The server always sets this
    /// from the player's real level for ranked runs.
    #[serde(default)]
    pub unlocked: Option<Vec<TileKind>>,
}

impl Config {
    pub fn new(seed: u64, island: IslandKind) -> Self {
        Config {
            seed,
            island,
            heat: 0,
            rounds: 12,
            unlocked: None,
        }
    }
}

// ───────────────────────────── commands ─────────────────────────────

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "cmd", rename_all = "snake_case")]
pub enum Command {
    PickBlessing { index: usize },
    Build { tile: TileKind, q: i32, r: i32 },
    Demolish { q: i32, r: i32 },
    Repair { q: i32, r: i32 },
    ClearFell { q: i32, r: i32 },
    Douse { q: i32, r: i32 },
    Respond { index: usize },
    Trade { offer: usize },
    ClaimProject { id: String },
    ClaimBoon,
    EndRound,
}

// ───────────────────────────── events (for animation) ─────────────────────────────

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "t", rename_all = "snake_case")]
pub enum Ev {
    Built {
        q: i32,
        r: i32,
        kind: TileKind,
    },
    Removed {
        q: i32,
        r: i32,
    },
    Repaired {
        q: i32,
        r: i32,
    },
    Ignite {
        q: i32,
        r: i32,
    },
    Spread {
        fq: i32,
        fr: i32,
        tq: i32,
        tr: i32,
    },
    Doused {
        q: i32,
        r: i32,
    },
    Hit {
        q: i32,
        r: i32,
        ruin: bool,
    },
    Dawn {
        round: u32,
        season: &'static str,
    },
    Hazard {
        kind: HazardKind,
        sev: u8,
        q: Option<i32>,
        r: Option<i32>,
        harmless: bool,
    },
    Yield {
        q: i32,
        r: i32,
        res: Res,
        n: i32,
    },
    Float {
        q: i32,
        r: i32,
        text: String,
        tone: &'static str,
    },
    Project {
        id: &'static str,
    },
    Traded {
        give: Res,
        get: Res,
    },
    Shielded {
        q: i32,
        r: i32,
    },
    Over {
        won: bool,
    },
}

// ───────────────────────────── state ─────────────────────────────

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Draft,
    Play,
    Over,
}

#[derive(Clone, Copy, Debug)]
pub struct Tile {
    pub kind: TileKind,
    /// 2 = healthy, 1 = damaged (no output until repaired).
    pub hp: u8,
    pub burning: bool,
    pub age: u8,
}

#[derive(Clone, Debug)]
pub struct CellInfo {
    pub c: Coord,
    pub terrain: Terrain,
}

#[derive(Clone, Debug)]
pub struct Omen {
    pub round: u32,
    pub kind: HazardKind,
    pub sev: u8,
    pub epi: Option<usize>,
}

#[derive(Clone, Debug)]
pub struct Problem {
    pub kind: HazardKind,
    pub sev: u8,
    pub epi: Option<usize>,
    pub cells: Vec<usize>,
    pub res: Res,
    pub cost: i32,
    pub resolved: bool,
}

#[derive(Clone, Debug)]
pub struct Boon {
    pub kind: BoonKind,
    pub claimed: bool,
}

#[derive(Clone, Debug)]
pub struct Offer {
    pub trader: usize,
    pub sells: Res,
    pub sell_n: i32,
    pub wants: Res,
    pub want_n: i32,
    pub taken: bool,
}

#[derive(Clone, Debug, Default, Serialize)]
pub struct Stats {
    pub hazards_total: i32,
    pub hazards_clean: i32,
    pub tiles_lost: i32,
    pub builds: i32,
    pub trades: i32,
    pub fires_out: i32,
}

#[derive(Clone, Debug, Serialize)]
pub struct Goal {
    pub id: &'static str,
    pub label: String,
    pub have: i32,
    pub need: i32,
    pub met: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct Outcome {
    pub won: bool,
    pub reason: String,
    pub score: i32,
    pub stars: u8,
    pub xp: u32,
    pub goals: Vec<Goal>,
}

#[derive(Clone, Debug)]
pub struct Game {
    pub cfg: Config,
    pub board: Arc<Vec<CellInfo>>,
    pub nbrs: Arc<Vec<Vec<usize>>>,
    grid: [[i16; 7]; 7],
    pub tiles: Vec<Option<Tile>>,
    pub ruin: Vec<bool>,
    /// Native woods that have been cut (ecology already paid).
    pub cleared: Vec<bool>,
    pub res: [i32; 8],
    pub harmony: i32,
    pub ecology: i32,
    pub round: u32,
    pub phase: Phase,
    pub ap: i32,
    pub plan: Vec<Slot>,
    pub omens: Vec<Omen>,
    pub problems: Vec<Problem>,
    pub boon: Option<Boon>,
    pub offers: Vec<Offer>,
    pub trades_done: i32,
    pub free_used: i32,
    pub caravan: bool,
    pub blessings: Vec<Blessing>,
    pub draft: Vec<Blessing>,
    pub claimed: Vec<&'static str>,
    pub stats: Stats,
    pub log: Vec<String>,
    pub outcome: Option<Outcome>,
    pub history: Vec<Command>,
    pub fire_sev: u8,
    pub fire_open: bool,
    pub fire_lost: bool,
    pub(crate) events: Vec<Ev>,
}

impl Game {
    // ───────────── construction ─────────────

    pub fn new(cfg: Config) -> Game {
        let (board, grid) = gen_board(&cfg);
        let n = board.len();
        let mut nbrs = vec![Vec::new(); n];
        for i in 0..n {
            for (dq, dr) in DIRS {
                let (q, r) = (board[i].c.q + dq, board[i].c.r + dr);
                if let Some(j) = lookup(&grid, q, r) {
                    nbrs[i].push(j);
                }
            }
        }
        let plan = crate::hazard::plan_year(&cfg);
        let mut g = Game {
            cfg: cfg.clone(),
            board: Arc::new(board),
            nbrs: Arc::new(nbrs),
            grid,
            tiles: vec![None; n],
            ruin: vec![false; n],
            cleared: vec![false; n],
            res: [0; 8],
            harmony: 50,
            ecology: match cfg.island {
                IslandKind::Forest => 70,
                IslandKind::Mountain => 50,
                _ => 60,
            },
            round: 0,
            phase: Phase::Play,
            ap: 0,
            plan,
            omens: vec![],
            problems: vec![],
            boon: None,
            offers: vec![],
            trades_done: 0,
            free_used: 0,
            caravan: false,
            blessings: vec![],
            draft: vec![],
            claimed: vec![],
            stats: Stats::default(),
            log: vec![],
            outcome: None,
            history: vec![],
            fire_sev: 1,
            fire_open: false,
            fire_lost: false,
            events: vec![],
        };
        g.starting_kit();
        g.begin_round();
        g.events.clear();
        g
    }

    fn starting_kit(&mut self) {
        let base = [
            (Res::Grain, 3),
            (Res::Wood, 3),
            (Res::Water, 2),
            (Res::Stone, 1),
            (Res::Clay, 1),
            (Res::Fibre, 1),
        ];
        for (r, n) in base {
            self.res[r.idx()] += n;
        }
        self.res[self.cfg.island.specialty().idx()] += 3;
        if self.cfg.island == IslandKind::Mountain {
            self.res[Res::Ore.idx()] += 2;
            self.res[Res::Stone.idx()] += 2;
        }
        for (k, q, r) in [
            (TileKind::CommunityHouse, 0, 0),
            (TileKind::Farm, 1, 0),
            (TileKind::SacredForest, -1, 0),
            (TileKind::RiverBend, 0, 1),
        ] {
            if let Some(i) = self.idx(q, r) {
                self.tiles[i] = Some(Tile {
                    kind: k,
                    hp: 2,
                    burning: false,
                    age: 0,
                });
            }
        }
        self.log.push(format!(
            "A new {} island rises from the sea.",
            self.cfg.island.id()
        ));
    }

    // ───────────── small helpers ─────────────

    pub fn idx(&self, q: i32, r: i32) -> Option<usize> {
        lookup(&self.grid, q, r)
    }
    pub fn tile(&self, i: usize) -> Option<&Tile> {
        self.tiles[i].as_ref()
    }
    pub fn has(&self, b: Blessing) -> bool {
        self.blessings.contains(&b)
    }
    pub fn is_unlocked(&self, k: TileKind) -> bool {
        match &self.cfg.unlocked {
            None => true,
            Some(v) => v.contains(&k),
        }
    }
    pub fn count(&self, k: TileKind) -> i32 {
        self.tiles
            .iter()
            .flatten()
            .filter(|t| t.kind == k && t.hp >= 1)
            .count() as i32
    }
    pub fn alive_tiles(&self) -> i32 {
        self.tiles.iter().flatten().count() as i32
    }
    pub fn ruins(&self) -> i32 {
        self.ruin.iter().filter(|r| **r).count() as i32
    }
    pub fn near(&self, i: usize, k: TileKind) -> bool {
        self.nbrs[i]
            .iter()
            .any(|&j| matches!(self.tiles[j], Some(t) if t.kind == k && t.hp >= 1))
    }
    pub fn water_sources_near(&self, i: usize) -> i32 {
        self.nbrs[i]
            .iter()
            .filter(|&&j| matches!(self.tiles[j], Some(t) if tile_def(t.kind).water_source && t.hp >= 1))
            .count() as i32
    }
    pub fn near_water(&self, i: usize) -> bool {
        self.water_sources_near(i) > 0
    }
    pub fn cap(&self) -> i32 {
        BASE_CAP + 6 * self.count(TileKind::Granary).min(2) - if self.cfg.heat >= 2 { 2 } else { 0 }
    }
    pub fn ap_max(&self) -> i32 {
        let halls = self.count(TileKind::CommunityHouse);
        START_AP
            + (halls >= 2) as i32
            + (halls >= 4) as i32
            + self.has(Blessing::BountifulHands) as i32
    }
    pub fn verdant(&self) -> bool {
        self.ecology >= 70
    }
    pub fn degraded(&self) -> bool {
        self.ecology < 35
    }
    fn say(&mut self, s: impl Into<String>) {
        self.log.push(s.into());
        if self.log.len() > 200 {
            self.log.remove(0);
        }
    }
    fn gain(&mut self, r: Res, n: i32) {
        let cap = self.cap();
        let v = &mut self.res[r.idx()];
        *v = (*v + n).min(cap.max(*v)).max(0);
    }
    fn pay(&mut self, cost: &[(Res, i32)]) {
        for (r, n) in cost {
            self.res[r.idx()] -= n;
        }
    }
    pub fn can_afford(&self, cost: &[(Res, i32)]) -> bool {
        cost.iter().all(|(r, n)| self.res[r.idx()] >= *n)
    }
    fn add_harmony(&mut self, d: i32) {
        self.harmony = (self.harmony + d).clamp(0, 100);
    }
    fn add_eco(&mut self, d: i32) {
        self.ecology = (self.ecology + d).clamp(0, 100);
    }

    // ───────────── costs ─────────────

    pub fn build_cost(&self, kind: TileKind, i: usize) -> Vec<(Res, i32)> {
        let mut out: Vec<(Res, i32)> = Vec::new();
        for (r, n) in tile_def(kind).cost {
            let mut n = *n;
            if *r == Res::Stone {
                if self.has(Blessing::Stonemason) {
                    n -= 1;
                }
            }
            if self.ruin[i] && self.has(Blessing::ClayMemory) {
                n = (n + 1) / 2;
            }
            if n > 0 {
                out.push((*r, n));
            }
        }
        // Mountain island: terracing a hillside is hard work.
        if self.cfg.island == IslandKind::Mountain && self.board[i].terrain == Terrain::Hill {
            match out.iter_mut().find(|(r, _)| *r == Res::Stone) {
                Some(e) => e.1 += 1,
                None => out.push((Res::Stone, 1)),
            }
        }
        out
    }

    pub fn repair_cost(&self, kind: TileKind) -> Vec<(Res, i32)> {
        tile_def(kind)
            .cost
            .iter()
            .map(|(r, n)| (*r, (n + 1) / 2))
            .collect()
    }

    pub fn douse_cost(&self, i: usize) -> i32 {
        let Some(t) = self.tile(i) else { return 0 };
        let mut c = tile_def(t.kind).douse;
        c -= self.water_sources_near(i).min(2);
        if self.has(Blessing::Firewatch) {
            c -= 1;
        }
        if self.cfg.heat >= 5 {
            c += 1;
        }
        c.max(1)
    }

    pub fn trade_cost(&self, o: &Offer) -> i32 {
        let mut n = o.want_n;
        if self.count(TileKind::HaatMarket) > 0 {
            n -= 1;
        }
        if self.has(Blessing::SilkRoad) {
            n -= 1;
        }
        if self.caravan {
            n -= 1;
        }
        n.max(1)
    }

    pub fn free_slots(&self) -> i32 {
        if self.caravan {
            return MAX_TRADES;
        }
        self.count(TileKind::HaatMarket).min(2)
    }

    // ───────────── commands ─────────────

    pub fn apply(&mut self, cmd: &Command) -> Result<Vec<Ev>, String> {
        self.events.clear();
        match self.apply_inner(cmd) {
            Ok(()) => {
                self.history.push(cmd.clone());
                Ok(std::mem::take(&mut self.events))
            }
            Err(e) => {
                self.events.clear();
                Err(e)
            }
        }
    }

    fn need_play(&self) -> Result<(), String> {
        match self.phase {
            Phase::Over => Err("The season is over.".into()),
            Phase::Draft => Err("Choose a blessing first.".into()),
            Phase::Play => Ok(()),
        }
    }

    fn spend_ap(&mut self, n: i32) -> Result<(), String> {
        if self.ap < n {
            return Err("No actions left this round. End the round to continue.".into());
        }
        self.ap -= n;
        Ok(())
    }

    fn apply_inner(&mut self, cmd: &Command) -> Result<(), String> {
        match cmd {
            Command::PickBlessing { index } => {
                if self.phase != Phase::Draft {
                    return Err("No blessing to choose right now.".into());
                }
                let b = *self
                    .draft
                    .get(*index)
                    .ok_or("That blessing is not on offer.")?;
                self.blessings.push(b);
                self.draft.clear();
                self.phase = Phase::Play;
                self.ap = self.ap_max();
                self.say(format!("Blessing received: {}.", b.name()));
                Ok(())
            }
            Command::Build { tile, q, r } => self.do_build(*tile, *q, *r),
            Command::Demolish { q, r } => self.do_demolish(*q, *r),
            Command::Repair { q, r } => self.do_repair(*q, *r),
            Command::ClearFell { q, r } => self.do_clear_fell(*q, *r),
            Command::Douse { q, r } => self.do_douse(*q, *r),
            Command::Respond { index } => self.do_respond(*index),
            Command::Trade { offer } => self.do_trade(*offer),
            Command::ClaimProject { id } => self.do_claim_project(id),
            Command::ClaimBoon => self.do_claim_boon(),
            Command::EndRound => {
                self.need_play()?;
                self.end_round();
                Ok(())
            }
        }
    }

    /// Is this hex a legal site for this tile (ignoring cost)?
    pub fn placement_check(&self, kind: TileKind, i: usize) -> Result<(), String> {
        let def = tile_def(kind);
        if !self.is_unlocked(kind) {
            return Err(format!(
                "{} is not unlocked yet (level {}).",
                def.name, def.unlock_level
            ));
        }
        if self.tiles[i].is_some() {
            return Err("That hex is already built on.".into());
        }
        if !def.terrain.is_empty() && !def.terrain.contains(&self.board[i].terrain) {
            return Err(format!(
                "{} cannot be built on {:?} ground.",
                def.name, self.board[i].terrain
            ));
        }
        if !self.nbrs[i].iter().any(|&j| self.tiles[j].is_some()) {
            return Err("Build next to your existing island.".into());
        }
        Ok(())
    }

    pub fn build_check(&self, kind: TileKind, i: usize) -> Result<Vec<(Res, i32)>, String> {
        self.placement_check(kind, i)?;
        let cost = self.build_cost(kind, i);
        if !self.can_afford(&cost) {
            return Err("Not enough resources.".into());
        }
        Ok(cost)
    }

    fn do_build(&mut self, kind: TileKind, q: i32, r: i32) -> Result<(), String> {
        self.need_play()?;
        let i = self
            .idx(q, r)
            .ok_or("That hex is not part of the island.")?;
        let cost = self.build_check(kind, i)?;
        self.spend_ap(1)?;
        self.pay(&cost);
        self.ruin[i] = false;
        // Clearing native woods hurts the land; replanting heals it.
        if self.board[i].terrain == Terrain::Woods {
            if kind == TileKind::SacredForest {
                if self.cleared[i] {
                    self.cleared[i] = false;
                    self.add_eco(3);
                    self.events.push(Ev::Float {
                        q,
                        r,
                        text: "+3 🌱".into(),
                        tone: "good",
                    });
                }
            } else if !self.cleared[i] {
                self.cleared[i] = true;
                self.add_eco(-3);
                self.events.push(Ev::Float {
                    q,
                    r,
                    text: "−3 🌳".into(),
                    tone: "bad",
                });
            }
        }
        self.tiles[i] = Some(Tile {
            kind,
            hp: 2,
            burning: false,
            age: 0,
        });
        self.stats.builds += 1;
        self.events.push(Ev::Built { q, r, kind });
        self.say(format!("Built {} at ({},{}).", tile_def(kind).name, q, r));
        Ok(())
    }

    fn do_demolish(&mut self, q: i32, r: i32) -> Result<(), String> {
        self.need_play()?;
        let i = self
            .idx(q, r)
            .ok_or("That hex is not part of the island.")?;
        let t = self.tiles[i].ok_or("Nothing to demolish there.")?;
        self.spend_ap(1)?;
        let def = tile_def(t.kind);
        if let Some((r0, _)) = def.cost.first() {
            self.gain(*r0, 1);
        }
        self.tiles[i] = None;
        self.ruin[i] = false;
        if t.kind == TileKind::CommunityHouse {
            self.add_harmony(-5);
        }
        self.events.push(Ev::Removed { q, r });
        self.say(format!("Cleared {} at ({},{}).", def.name, q, r));
        Ok(())
    }

    fn do_repair(&mut self, q: i32, r: i32) -> Result<(), String> {
        self.need_play()?;
        let i = self
            .idx(q, r)
            .ok_or("That hex is not part of the island.")?;
        let t = self.tiles[i].ok_or("Nothing to repair there.")?;
        if t.hp >= 2 {
            return Err("That building is not damaged.".into());
        }
        if t.burning {
            return Err("Put the fire out first.".into());
        }
        let cost = self.repair_cost(t.kind);
        if !self.can_afford(&cost) {
            return Err("Not enough resources to repair.".into());
        }
        self.spend_ap(1)?;
        self.pay(&cost);
        if let Some(t) = self.tiles[i].as_mut() {
            t.hp = 2;
        }
        self.events.push(Ev::Repaired { q, r });
        self.say(format!("Repaired {}.", tile_def(t.kind).name));
        Ok(())
    }

    fn do_clear_fell(&mut self, q: i32, r: i32) -> Result<(), String> {
        self.need_play()?;
        let i = self
            .idx(q, r)
            .ok_or("That hex is not part of the island.")?;
        let t = self.tiles[i].ok_or("No forest there.")?;
        if t.kind != TileKind::SacredForest {
            return Err("Only a forest can be clear-felled.".into());
        }
        if t.burning {
            return Err("It is on fire.".into());
        }
        self.spend_ap(1)?;
        self.tiles[i] = None;
        if self.board[i].terrain == Terrain::Woods {
            self.cleared[i] = true;
        }
        self.gain(Res::Wood, 4);
        self.add_eco(-8);
        self.events.push(Ev::Removed { q, r });
        self.events.push(Ev::Float {
            q,
            r,
            text: "+4 🪵  −8 🌿".into(),
            tone: "bad",
        });
        self.say("The grove was clear-felled for quick timber. The land will remember.");
        Ok(())
    }

    fn do_douse(&mut self, q: i32, r: i32) -> Result<(), String> {
        self.need_play()?;
        let i = self
            .idx(q, r)
            .ok_or("That hex is not part of the island.")?;
        let t = self.tiles[i].ok_or("Nothing is burning there.")?;
        if !t.burning {
            return Err("That tile is not on fire.".into());
        }
        let need = self.douse_cost(i);
        if self.res[Res::Water.idx()] < need {
            return Err(format!(
                "You need {} water to put this fire out. Trade for water, or clear the tile to make a firebreak.",
                need
            ));
        }
        self.res[Res::Water.idx()] -= need;
        if let Some(t) = self.tiles[i].as_mut() {
            t.burning = false;
        }
        self.stats.fires_out += 1;
        self.events.push(Ev::Doused { q, r });
        self.say(format!("Fire put out at ({},{}) for {} water.", q, r, need));
        Ok(())
    }

    fn do_respond(&mut self, index: usize) -> Result<(), String> {
        self.need_play()?;
        let p = self.problems.get(index).ok_or("No such problem.")?.clone();
        if p.resolved {
            return Err("Already handled.".into());
        }
        if self.res[p.res.idx()] < p.cost {
            return Err(format!("You need {} {} to respond.", p.cost, p.res.name()));
        }
        self.res[p.res.idx()] -= p.cost;
        self.problems[index].resolved = true;
        for &c in &p.cells {
            let cc = self.board[c].c;
            self.events.push(Ev::Shielded { q: cc.q, r: cc.r });
        }
        self.say(format!(
            "{} answered: {} {} spent.",
            p.kind.title(),
            p.cost,
            p.res.name()
        ));
        Ok(())
    }

    fn do_trade(&mut self, index: usize) -> Result<(), String> {
        self.need_play()?;
        let o = self.offers.get(index).ok_or("No such offer.")?.clone();
        if o.taken {
            return Err("That offer is already taken this round.".into());
        }
        if self.trades_done >= MAX_TRADES {
            return Err("The haat only has time for two trades a round.".into());
        }
        let give_n = self.trade_cost(&o);
        if self.res[o.wants.idx()] < give_n {
            return Err(format!(
                "You need {} {} for this trade.",
                give_n,
                o.wants.name()
            ));
        }
        let free = self.free_used < self.free_slots();
        if !free {
            self.spend_ap(1)?;
        } else {
            self.free_used += 1;
        }
        self.res[o.wants.idx()] -= give_n;
        self.gain(o.sells, o.sell_n);
        self.trades_done += 1;
        self.stats.trades += 1;
        self.offers[index].taken = true;
        self.events.push(Ev::Traded {
            give: o.wants,
            get: o.sells,
        });
        let name = TRADERS[o.trader].name;
        self.say(format!(
            "Traded {} {} for {} {} with {}.",
            give_n,
            o.wants.name(),
            o.sell_n,
            o.sells.name(),
            name
        ));
        Ok(())
    }

    pub fn project_status(&self, p: &ProjectDef) -> Result<(), String> {
        if self.claimed.contains(&p.id) {
            return Err("Already completed.".into());
        }
        if p.level > project_level_open(self.round) {
            return Err(format!(
                "Opens in round {}.",
                if p.level == 2 { 5 } else { 9 }
            ));
        }
        for k in p.requires {
            if self.count(*k) == 0 {
                return Err(format!("Needs a {}.", tile_def(*k).name));
            }
        }
        if !self.can_afford(p.cost) {
            return Err("Not enough resources.".into());
        }
        Ok(())
    }

    fn do_claim_project(&mut self, id: &str) -> Result<(), String> {
        self.need_play()?;
        let p = project_def(id).ok_or("Unknown project.")?;
        self.project_status(p)?;
        self.pay(p.cost);
        self.claimed.push(p.id);
        self.add_harmony(5);
        self.events.push(Ev::Project { id: p.id });
        self.say(format!(
            "Project complete: {} (+{} points).",
            p.name, p.points
        ));
        Ok(())
    }

    fn do_claim_boon(&mut self) -> Result<(), String> {
        self.need_play()?;
        let b = self.boon.clone().ok_or("No opportunity right now.")?;
        if b.claimed {
            return Err("Already claimed.".into());
        }
        match b.kind {
            BoonKind::Festival => {
                let pav = self.count(TileKind::MusicPavilion);
                self.add_harmony(8 + 3 * pav);
                self.gain(Res::Music, 2 + pav);
                self.say("The festival fills the island with music.");
            }
            BoonKind::Harvest => {
                let farms = self.count(TileKind::Farm);
                self.gain(Res::Grain, (2 * farms).min(8));
                self.gain(Res::Water, 1);
                self.say("A golden harvest!");
            }
            BoonKind::Caravan => return Err("The caravan is already trading with you.".into()),
        }
        if let Some(b) = self.boon.as_mut() {
            b.claimed = true;
        }
        Ok(())
    }

    // ───────────── economy ─────────────

    /// Everything a tile gives at dawn (before upkeep).
    pub fn tile_yield(&self, i: usize) -> Yield {
        let mut y = Yield::default();
        let Some(t) = self.tiles[i] else { return y };
        if t.burning {
            y.notes.push("Burning: no output".into());
            return y;
        }
        if t.hp < 2 {
            y.notes.push("Damaged: repair to resume".into());
            return y;
        }
        let def = tile_def(t.kind);
        for (r, n) in def.prod {
            y.res[r.idx()] += n;
        }
        let terr = self.board[i].terrain;
        match t.kind {
            TileKind::Farm => {
                if self.near_water(i) {
                    y.res[Res::Grain.idx()] += 1;
                    y.notes.push("+1 grain: irrigated".into());
                }
                if self.has(Blessing::SeedBank) && self.ecology >= 50 {
                    y.res[Res::Grain.idx()] += 1;
                    y.notes.push("+1 grain: Seed Bank".into());
                }
                if self.degraded() {
                    y.res[Res::Grain.idx()] -= 1;
                    y.notes.push("−1 grain: depleted land".into());
                }
            }
            TileKind::TextileWorkshop => {
                if self.near(i, TileKind::HaatMarket) {
                    y.res[Res::Fibre.idx()] += 1;
                    y.notes.push("+1 fibre: sells beside a market".into());
                }
            }
            TileKind::SacredForest => {
                if t.age >= 3 {
                    y.res[Res::Wood.idx()] += 1;
                    y.notes.push("+1 wood: mature grove".into());
                }
                if self.cfg.island == IslandKind::Forest {
                    y.res[Res::Wood.idx()] += 1;
                    y.notes.push("+1 wood: dense timber island".into());
                }
                if self.has(Blessing::SacredGroves) {
                    y.res[Res::Wood.idx()] += 1;
                    y.notes.push("+1 wood: Sacred Groves".into());
                }
            }
            TileKind::RiverBend | TileKind::Stepwell => {
                if self.cfg.island == IslandKind::Coastal {
                    y.res[Res::Water.idx()] += 1;
                    y.notes.push("+1 water: coastal springs".into());
                }
            }
            TileKind::ClayPit => {
                if self.near_water(i) {
                    y.res[Res::Clay.idx()] += 1;
                    y.notes.push("+1 clay: wet pit".into());
                }
            }
            TileKind::Quarry => {
                if self.cfg.island == IslandKind::Mountain {
                    y.res[Res::Stone.idx()] += 1;
                    y.notes.push("+1 stone: mountain island".into());
                }
            }
            TileKind::MusicPavilion => {
                y.harmony += 1;
                if self.near(i, TileKind::HaatMarket) || self.near(i, TileKind::SacredShrine) {
                    y.harmony += 1;
                }
            }
            TileKind::SacredShrine => {
                y.harmony += 2;
                y.eco += 1;
                if terr == Terrain::Hill {
                    y.harmony += 1;
                    y.notes.push("+1 harmony: hilltop shrine".into());
                }
            }
            TileKind::CommunityHouse => {
                y.harmony += 1;
            }
            _ => {}
        }
        for v in y.res.iter_mut() {
            *v = (*v).max(0);
        }
        y
    }

    fn is_culture(k: TileKind) -> bool {
        matches!(
            k,
            TileKind::CommunityHouse
                | TileKind::HaatMarket
                | TileKind::MusicPavilion
                | TileKind::SacredShrine
        )
    }

    /// Adjacent pairs of *different* culture buildings: +1 harmony each (max 6).
    pub fn culture_links(&self) -> i32 {
        let mut n = 0;
        for i in 0..self.tiles.len() {
            let Some(a) = self.tiles[i] else { continue };
            if !Self::is_culture(a.kind) || a.hp < 2 {
                continue;
            }
            for &j in &self.nbrs[i] {
                if j <= i {
                    continue;
                }
                if let Some(b) = self.tiles[j] {
                    if Self::is_culture(b.kind) && b.kind != a.kind && b.hp >= 2 {
                        n += 1;
                    }
                }
            }
        }
        n.min(4)
    }

    /// Per-dawn production summary used by dawn() and by the preview.
    pub fn economy(&self) -> Yield {
        let mut total = Yield::default();
        for i in 0..self.tiles.len() {
            let y = self.tile_yield(i);
            for k in 0..8 {
                total.res[k] += y.res[k];
            }
            total.harmony += y.harmony;
            total.eco += y.eco;
        }
        total.harmony += self.culture_links();
        let forests = self
            .tiles
            .iter()
            .flatten()
            .filter(|t| t.kind == TileKind::SacredForest && t.hp >= 2 && !t.burning)
            .count() as i32;
        let quarries = self.count(TileKind::Quarry);
        total.eco += forests.min(3) - quarries.min(2) - self.alive_tiles() / 6;
        total
    }

    pub fn upkeep(&self) -> i32 {
        let mut need = self.alive_tiles() / 4;
        if self.cfg.island == IslandKind::Farming {
            need -= 1;
        }
        need.max(0)
    }

    pub(crate) fn dawn(&mut self) {
        for t in self.tiles.iter_mut().flatten() {
            t.age = t.age.saturating_add(1);
        }
        // Production, with floating numbers over the tiles that made them.
        for i in 0..self.tiles.len() {
            let y = self.tile_yield(i);
            let c = self.board[i].c;
            for r in ALL_RES {
                let n = y.res[r.idx()];
                if n > 0 {
                    self.events.push(Ev::Yield {
                        q: c.q,
                        r: c.r,
                        res: r,
                        n,
                    });
                }
            }
        }
        let eco = self.economy();
        for r in ALL_RES {
            let n = eco.res[r.idx()];
            self.res[r.idx()] += n;
        }
        let mut dh = eco.harmony - DAWN_UNREST - if self.cfg.heat >= 5 { 2 } else { 0 }; // restlessness: culture must be fed
        let mut de = eco.eco;
        if self.has(Blessing::Rainkeeper) {
            self.res[Res::Water.idx()] += 1;
        }
        if self.has(Blessing::FestivalSpirit) {
            dh += 2;
        }
        if self.has(Blessing::DeepRoots) && self.count(TileKind::SacredForest) > 0 {
            de += 2;
        }
        let ruins = self.ruins();
        dh -= ruins / 2;
        de -= ruins / 3;
        // Upkeep: the island eats.
        let need = self.upkeep();
        let have = self.res[Res::Grain.idx()];
        let paid = have.min(need);
        self.res[Res::Grain.idx()] -= paid;
        let short = need - paid;
        if short > 0 {
            dh -= 4 * short;
            de -= 1;
            self.say(format!("Hunger: the island is {} grain short.", short));
        }
        // Reserves overflow.
        let cap = self.cap();
        for r in ALL_RES {
            let v = &mut self.res[r.idx()];
            if *v > cap {
                *v = cap;
            }
        }
        self.add_harmony(dh);
        self.add_eco(de);
    }

    // ───────────── rounds ─────────────

    pub(crate) fn begin_round(&mut self) {
        self.round += 1;
        let season = SEASONS[season_of(self.round)];
        self.events.push(Ev::Dawn {
            round: self.round,
            season,
        });
        if self.round > 1 {
            self.dawn();
        }
        self.problems.clear();
        self.boon = None;
        self.trades_done = 0;
        self.free_used = 0;
        self.caravan = false;

        self.erupt();
        self.gen_offers();
        self.make_omens();

        self.ap = self.ap_max();
        if (self.round - 1) % 3 == 0 {
            let mut rng = Rng::stream(self.cfg.seed, self.round, 7);
            let mut pool: Vec<Blessing> = ALL_BLESSINGS
                .iter()
                .copied()
                .filter(|b| !self.blessings.contains(b))
                .collect();
            if self.round == 1 {
                // The first draft stays gentle: no action-economy blessing before you know the game.
                pool.retain(|b| !matches!(b, Blessing::BountifulHands | Blessing::ElderCounsel));
            }
            rng.shuffle(&mut pool);
            pool.truncate(3);
            self.draft = pool;
            self.phase = Phase::Draft;
        } else {
            self.phase = Phase::Play;
        }
        self.say(format!("Round {} — {}.", self.round, season));
    }

    fn gen_offers(&mut self) {
        let mut rng = Rng::stream(self.cfg.seed, self.round, 5);
        let mut order: Vec<usize> = (0..TRADERS.len()).collect();
        rng.shuffle(&mut order);
        // Never offer the player their own specialty back (original rule).
        let spec = self.cfg.island.specialty();
        order.retain(|&i| TRADERS[i].sells != spec);
        let mut chosen: Vec<usize> = order.iter().copied().take(4).collect();
        // Trade must be able to solve a real problem: if water is about to matter, someone sells it.
        let water_matters = self
            .omens
            .iter()
            .any(|o| matches!(o.kind, HazardKind::Fire | HazardKind::Drought))
            || self.tiles.iter().flatten().any(|t| t.burning)
            || self.problems.iter().any(|p| p.res == Res::Water);
        let kabir = 1usize;
        if (water_matters || self.round % 3 == 1) && spec != Res::Water && !chosen.contains(&kabir)
        {
            chosen.pop();
            chosen.push(kabir);
        }
        // Everyone needs ore for projects; make sure it is regularly on sale.
        let dev = 3usize;
        if self.round % 2 == 0 && spec != Res::Ore && !chosen.contains(&dev) && chosen.len() >= 2 {
            chosen[0] = dev;
        }
        self.offers = chosen
            .into_iter()
            .map(|t| {
                let dear = rng.pct(35);
                Offer {
                    trader: t,
                    sells: TRADERS[t].sells,
                    sell_n: 2,
                    wants: TRADERS[t].wants,
                    want_n: if dear { 3 } else { 2 },
                    taken: false,
                }
            })
            .collect();
    }

    pub(crate) fn end_round(&mut self) {
        crate::hazard::resolve_round_end(self);
        if self.check_collapse() {
            return;
        }
        if self.round >= self.cfg.rounds {
            self.finish(None);
        } else {
            self.begin_round();
        }
    }

    fn check_collapse(&mut self) -> bool {
        let reason = if self.harmony <= 0 {
            Some("Unrest: harmony fell to zero and the people left.")
        } else if self.count(TileKind::CommunityHouse) == 0 {
            Some("Abandoned: no community hall remains standing.")
        } else if self.ecology <= 0 {
            Some("Barren: the land could no longer sustain the island.")
        } else {
            None
        };
        if let Some(r) = reason {
            self.finish(Some(r.to_string()));
            true
        } else {
            false
        }
    }

    // ───────────── goals & scoring ─────────────

    pub fn goal_tiles_needed(&self) -> i32 {
        let h = self.cfg.heat as i32;
        // Early players have few blueprints; the charter grows with what they can build.
        let base = match self.cfg.unlocked.as_ref().map(|u| u.len()) {
            Some(n) if n <= 6 => 12,
            Some(n) if n <= 8 => 14,
            _ => 16,
        };
        (base + if h >= 1 { 2 } else { 0 } + if h >= 4 { 2 } else { 0 }).min(22)
    }

    pub fn goals(&self) -> Vec<Goal> {
        let tiles = self.alive_tiles();
        let need_tiles = self.goal_tiles_needed();
        let projects = self.claimed.len() as i32;
        let water = self.res[Res::Water.idx()];
        let grain = self.res[Res::Grain.idx()];
        let reserves = water.min(grain);
        vec![
            Goal {
                id: "settle",
                label: format!("Settle {} tiles", need_tiles),
                have: tiles,
                need: need_tiles,
                met: tiles >= need_tiles,
            },
            Goal {
                id: "develop",
                label: "Complete 6 projects".into(),
                have: projects,
                need: 6,
                met: projects >= 6,
            },
            Goal {
                id: "reserves",
                label: "Hold 5 water and 5 grain at season's end".into(),
                have: reserves,
                need: 5,
                met: reserves >= 5,
            },
            Goal {
                id: "balance",
                label: "End with harmony 45+ and ecology 40+".into(),
                have: self.harmony.min(self.ecology + 5),
                need: 45,
                met: self.harmony >= 45 && self.ecology >= 40,
            },
        ]
    }

    pub fn score_now(&self) -> i32 {
        let proj: i32 = self
            .claimed
            .iter()
            .filter_map(|id| project_def(id))
            .map(|p| p.points)
            .sum();
        let tiles = 3 * self.tiles.iter().flatten().filter(|t| t.hp >= 1).count() as i32;
        let hv = self.harmony / 2 + self.ecology / 2;
        let reserves = self.res[Res::Water.idx()].min(6) + self.res[Res::Grain.idx()].min(6);
        let resil = 4 * self.stats.hazards_clean;
        let sum = proj + tiles + hv + reserves + resil;
        sum * (100 + 15 * self.cfg.heat as i32) / 100
    }

    pub(crate) fn finish(&mut self, collapse: Option<String>) {
        let goals = self.goals();
        let survived = collapse.is_none();
        let won = survived && goals.iter().all(|g| g.met);
        let mut score = self.score_now();
        if won {
            score += 30 * (100 + 15 * self.cfg.heat as i32) / 100;
        }
        let stars = if !won {
            0
        } else if score >= 260 && self.stats.tiles_lost == 0 {
            3
        } else if score >= 210 {
            2
        } else {
            1
        };
        let xp = (score.max(0) as u32) / 3 + if won { 50 } else { 0 } + 5 * self.cfg.heat as u32;
        let reason = match collapse {
            Some(r) => r,
            None if won => "Every charter goal met. The island thrives.".into(),
            None => {
                let missed: Vec<String> = goals
                    .iter()
                    .filter(|g| !g.met)
                    .map(|g| g.label.clone())
                    .collect();
                format!(
                    "The island survived, but fell short: {}.",
                    missed.join("; ")
                )
            }
        };
        self.say(reason.clone());
        self.outcome = Some(Outcome {
            won,
            reason,
            score,
            stars,
            xp,
            goals,
        });
        self.phase = Phase::Over;
        self.events.push(Ev::Over { won });
    }

    // ───────────── replay ─────────────

    pub fn replay(cfg: Config, cmds: &[Command]) -> Result<Game, (usize, String)> {
        let mut g = Game::new(cfg);
        for (i, c) in cmds.iter().enumerate() {
            g.apply(c).map_err(|e| (i, e))?;
        }
        Ok(g)
    }

    // internal, used by hazard.rs
    pub(crate) fn push_ev(&mut self, e: Ev) {
        self.events.push(e);
    }
    pub(crate) fn log_say(&mut self, s: impl Into<String>) {
        self.say(s);
    }
    pub(crate) fn mutate_eco(&mut self, d: i32) {
        self.add_eco(d);
    }
    pub(crate) fn mutate_harmony(&mut self, d: i32) {
        self.add_harmony(d);
    }
}

#[derive(Clone, Debug, Default)]
pub struct Yield {
    pub res: [i32; 8],
    pub harmony: i32,
    pub eco: i32,
    pub notes: Vec<String>,
}

// ───────────────────────────── board generation ─────────────────────────────

fn lookup(grid: &[[i16; 7]; 7], q: i32, r: i32) -> Option<usize> {
    if q < -RADIUS || q > RADIUS || r < -RADIUS || r > RADIUS {
        return None;
    }
    let v = grid[(q + RADIUS) as usize][(r + RADIUS) as usize];
    if v < 0 {
        None
    } else {
        Some(v as usize)
    }
}

fn gen_board(cfg: &Config) -> (Vec<CellInfo>, [[i16; 7]; 7]) {
    let mut rng = Rng::stream(cfg.seed, 0, 1);
    let start: [(i32, i32, Terrain); 4] = [
        (0, 0, Terrain::Meadow),
        (1, 0, Terrain::Meadow),
        (-1, 0, Terrain::Woods),
        (0, 1, Terrain::Meadow),
    ];
    // Which outer-ring hexes are drowned by the sea (organic coastline).
    let mut rim: Vec<(i32, i32)> = Vec::new();
    for q in -RADIUS..=RADIUS {
        for r in -RADIUS..=RADIUS {
            if in_disk(q, r) && Coord::new(0, 0).dist(Coord::new(q, r)) == RADIUS {
                rim.push((q, r));
            }
        }
    }
    rng.shuffle(&mut rim);
    let sunk = 3 + rng.below(4) as usize;
    let sunk: Vec<(i32, i32)> = rim.into_iter().take(sunk).collect();

    let w = cfg.island.terrain_weights();
    let total: u32 = w.iter().sum();
    let mut cells: Vec<CellInfo> = Vec::new();
    for q in -RADIUS..=RADIUS {
        for r in -RADIUS..=RADIUS {
            if !in_disk(q, r) || sunk.contains(&(q, r)) {
                continue;
            }
            let c = Coord::new(q, r);
            let terrain = if let Some(s) = start.iter().find(|s| s.0 == q && s.1 == r) {
                s.2
            } else if c.dist(Coord::new(0, 0)) == RADIUS && rng.pct(60) {
                Terrain::Shore
            } else {
                let mut roll = rng.below(total);
                let mut t = Terrain::Meadow;
                for (k, wt) in w.iter().enumerate() {
                    if roll < *wt {
                        t = [
                            Terrain::Meadow,
                            Terrain::Woods,
                            Terrain::Hill,
                            Terrain::Shore,
                        ][k];
                        break;
                    }
                    roll -= wt;
                }
                t
            };
            cells.push(CellInfo { c, terrain });
        }
    }
    // Guarantee a playable mix.
    let mins = [
        (Terrain::Hill, 3usize),
        (Terrain::Woods, 3),
        (Terrain::Shore, 4),
        (Terrain::Meadow, 7),
    ];
    for (want, min) in mins {
        let mut guard = 0;
        while cells.iter().filter(|c| c.terrain == want).count() < min && guard < 200 {
            guard += 1;
            let k = rng.below(cells.len() as u32) as usize;
            let is_start = start
                .iter()
                .any(|s| s.0 == cells[k].c.q && s.1 == cells[k].c.r);
            let cur = cells[k].terrain;
            let cur_count = cells.iter().filter(|c| c.terrain == cur).count();
            let cur_min = mins.iter().find(|m| m.0 == cur).map(|m| m.1).unwrap_or(0);
            if !is_start && cur != want && cur_count > cur_min {
                cells[k].terrain = want;
            }
        }
    }
    let mut grid = [[-1i16; 7]; 7];
    for (i, c) in cells.iter().enumerate() {
        grid[(c.c.q + RADIUS) as usize][(c.c.r + RADIUS) as usize] = i as i16;
    }
    (cells, grid)
}
