//! The year's weather: the plan, the omens, and what each hazard does.
//!
//! Design rules taken from the rulebook:
//!  * events create a decision, not a random punishment  -> every hazard is
//!    foretold (omen) a round ahead, with its target;
//!  * every event has a trigger, an effect and a response  -> `Problem`;
//!  * fire is the fully-defined showcase  -> burning tiles, spread, water cost.

use crate::data::*;
use crate::game::*;
use crate::hex::*;
use crate::rng::Rng;

// ───────────────────────────── the plan ─────────────────────────────

fn weight(island: IslandKind, k: HazardKind) -> u32 {
    use HazardKind::*;
    use IslandKind::*;
    match (island, k) {
        (Forest, Fire)
        | (Farming, Drought)
        | (Coastal, Flood)
        | (Coastal, Storm)
        | (Mountain, Landslide) => 6,
        (Mountain, Flood) => 1,
        (_, Landslide) => 0,
        _ => 3,
    }
}

fn pick(rng: &mut Rng, island: IslandKind, pool: &[HazardKind]) -> HazardKind {
    let total: u32 = pool.iter().map(|k| weight(island, *k)).sum();
    if total == 0 {
        return pool[0];
    }
    let mut roll = rng.below(total);
    for k in pool {
        let w = weight(island, *k);
        if roll < w {
            return *k;
        }
        roll -= w;
    }
    pool[0]
}

const SPRING: [HazardKind; 2] = [HazardKind::Drought, HazardKind::Storm];
const SUMMER: [HazardKind; 2] = [HazardKind::Fire, HazardKind::Drought];
const MONSOON: [HazardKind; 3] = [HazardKind::Flood, HazardKind::Storm, HazardKind::Landslide];
const HARVEST: [HazardKind; 5] = [
    HazardKind::Fire,
    HazardKind::Drought,
    HazardKind::Flood,
    HazardKind::Storm,
    HazardKind::Landslide,
];

pub fn plan_year(cfg: &Config) -> Vec<Slot> {
    let mut rng = Rng::stream(cfg.seed, 0, 2);
    let n = cfg.rounds.max(1) as usize;
    let mut plan = vec![Slot::Calm; n];
    let isl = cfg.island;
    let put = |plan: &mut Vec<Slot>, i: usize, s: Slot| {
        if i < plan.len() {
            plan[i] = s;
        }
    };
    // Spring: a breath, the tutorial fire, then a caravan to restock before summer.
    put(&mut plan, 0, Slot::Calm);
    put(&mut plan, 1, Slot::Hazard(HazardKind::Fire));
    put(&mut plan, 2, Slot::Boon(BoonKind::Caravan));
    // Summer
    let mut s = vec![
        Slot::Hazard(pick(&mut rng, isl, &SUMMER)),
        Slot::Hazard(pick(&mut rng, isl, &SUMMER)),
        Slot::Boon(if rng.pct(50) {
            BoonKind::Harvest
        } else {
            BoonKind::Festival
        }),
    ];
    rng.shuffle(&mut s);
    for (k, sl) in s.into_iter().enumerate() {
        put(&mut plan, 3 + k, sl);
    }
    // Monsoon
    let mut s = vec![
        Slot::Hazard(pick(&mut rng, isl, &MONSOON)),
        Slot::Hazard(pick(&mut rng, isl, &MONSOON)),
        Slot::Boon(BoonKind::Harvest),
    ];
    rng.shuffle(&mut s);
    for (k, sl) in s.into_iter().enumerate() {
        put(&mut plan, 6 + k, sl);
    }
    // Harvest Moon
    let mut s = vec![
        Slot::Boon(BoonKind::Festival),
        Slot::Hazard(pick(&mut rng, isl, &HARVEST)),
        Slot::Calm,
    ];
    rng.shuffle(&mut s);
    for (k, sl) in s.into_iter().enumerate() {
        put(&mut plan, 9 + k, sl);
    }
    // Heat: every level converts one gentle round into a hazard.
    for _ in 0..cfg.heat {
        let cands: Vec<usize> = (1..n)
            .filter(|&i| matches!(plan[i], Slot::Boon(_) | Slot::Calm))
            .collect();
        if cands.is_empty() {
            break;
        }
        let i = cands[rng.below(cands.len() as u32) as usize];
        let k = match season_of(i as u32 + 1) {
            0 => pick(&mut rng, isl, &SPRING),
            1 => pick(&mut rng, isl, &SUMMER),
            2 => pick(&mut rng, isl, &MONSOON),
            _ => pick(&mut rng, isl, &HARVEST),
        };
        plan[i] = Slot::Hazard(k);
    }
    plan
}

pub fn base_sev(round: u32, heat: u8) -> u8 {
    let b = if round <= 5 {
        1
    } else if round <= 10 {
        2
    } else {
        3
    };
    (b + (heat >= 3) as u8 + (heat >= 5) as u8).min(3)
}

/// Severity after the land's health is taken into account (live, so the
/// player can see healing the island make the next hazard softer).
pub fn adjusted_sev(g: &Game, kind: HazardKind, base: u8) -> u8 {
    let mut s = base as i32;
    if g.degraded() {
        s += 1;
    }
    if g.verdant()
        && matches!(
            kind,
            HazardKind::Flood | HazardKind::Landslide | HazardKind::Drought
        )
    {
        s -= 1;
    }
    s.clamp(1, 3) as u8
}

// ───────────────────────────── omens ─────────────────────────────

fn weighted(rng: &mut Rng, items: &[(usize, u32)]) -> Option<usize> {
    let total: u32 = items.iter().map(|x| x.1).sum();
    if total == 0 {
        return None;
    }
    let mut roll = rng.below(total);
    for (i, w) in items {
        if roll < *w {
            return Some(*i);
        }
        roll -= w;
    }
    items.last().map(|x| x.0)
}

fn pick_epicentre(g: &Game, kind: HazardKind, round: u32) -> Option<usize> {
    let mut rng = Rng::stream(g.cfg.seed, round, 11);
    let n = g.tiles.len();
    let mut items: Vec<(usize, u32)> = Vec::new();
    match kind {
        HazardKind::Fire => {
            for i in 0..n {
                if let Some(t) = g.tiles[i] {
                    let f = tile_def(t.kind).flam;
                    if f > 0 && t.hp >= 1 && !t.burning {
                        items.push((i, f as u32));
                    }
                }
            }
        }
        HazardKind::Drought => return None,
        HazardKind::Flood => {
            for i in 0..n {
                let ter = g.board[i].terrain;
                let has = g.tiles[i].is_some();
                let w = match (ter, has) {
                    (Terrain::Shore, true) => 6,
                    (Terrain::Shore, false) => 2,
                    (Terrain::Meadow, true) => 2,
                    _ => 0,
                };
                if w > 0 {
                    items.push((i, w));
                }
            }
        }
        HazardKind::Storm => {
            for i in 0..n {
                items.push((i, if g.tiles[i].is_some() { 3 } else { 1 }));
            }
        }
        HazardKind::Landslide => {
            for i in 0..n {
                if g.board[i].terrain == Terrain::Hill {
                    let near =
                        g.tiles[i].is_some() || g.nbrs[i].iter().any(|&j| g.tiles[j].is_some());
                    items.push((i, if near { 4 } else { 1 }));
                }
            }
        }
    }
    weighted(&mut rng, &items)
}

impl Game {
    pub(crate) fn make_omens(&mut self) {
        let mut wanted = vec![self.round + 1];
        if self.has(Blessing::ElderCounsel) {
            wanted.push(self.round + 2);
        }
        let cur = self.round;
        self.omens.retain(|o| o.round > cur);
        for r in wanted {
            if r > self.cfg.rounds || self.omens.iter().any(|o| o.round == r) {
                continue;
            }
            if let Some(Slot::Hazard(kind)) = self.plan.get(r as usize - 1).copied() {
                let epi = pick_epicentre(self, kind, r);
                self.omens.push(Omen {
                    round: r,
                    kind,
                    sev: base_sev(r, self.cfg.heat),
                    epi,
                });
            }
        }
    }

    pub(crate) fn erupt(&mut self) {
        let slot = self
            .plan
            .get(self.round as usize - 1)
            .copied()
            .unwrap_or(Slot::Calm);
        match slot {
            Slot::Calm => {
                if self.round > 1 {
                    self.log_say("A quiet round. Build, trade, prepare.");
                }
            }
            Slot::Boon(k) => {
                self.boon = Some(Boon {
                    kind: k,
                    claimed: false,
                });
                if k == BoonKind::Caravan {
                    self.caravan = true;
                    self.log_say("A caravan has arrived: trades are free and cheaper this round.");
                } else {
                    self.log_say(format!("{}: an opportunity this round.", k.title()));
                }
            }
            Slot::Hazard(kind) => {
                let omen = self.omens.iter().find(|o| o.round == self.round).cloned();
                let (epi, base) = match omen {
                    Some(o) => (o.epi, o.sev),
                    None => (
                        pick_epicentre(self, kind, self.round),
                        base_sev(self.round, self.cfg.heat),
                    ),
                };
                let sev = adjusted_sev(self, kind, base);
                self.hazard_strikes(kind, sev, epi);
            }
        }
        let r = self.round;
        self.omens.retain(|o| o.round > r);
    }

    fn hazard_strikes(&mut self, kind: HazardKind, sev: u8, epi: Option<usize>) {
        self.stats.hazards_total += 1;
        let epc = epi.map(|i| self.board[i].c);
        let (eq, er) = (epc.map(|c| c.q), epc.map(|c| c.r));
        if kind == HazardKind::Fire {
            self.fire_sev = sev;
            self.fire_open = true;
            self.fire_lost = false;
            let target = epi.and_then(|e| self.nearest_flammable(e, 2));
            match target {
                None => {
                    self.stats.hazards_clean += 1;
                    self.fire_open = false;
                    self.push_ev(Ev::Hazard {
                        kind,
                        sev,
                        q: eq,
                        r: er,
                        harmless: true,
                    });
                    self.log_say("Sparks fly, but nothing is left to burn.");
                }
                Some(t) => {
                    self.ignite(t);
                    if sev >= 3 {
                        let mut rng = Rng::stream(self.cfg.seed, self.round, 12);
                        let opts: Vec<usize> = self.nbrs[t]
                            .iter()
                            .copied()
                            .filter(|&j| matches!(self.tiles[j], Some(x) if tile_def(x.kind).flam > 0 && !x.burning && x.hp >= 1))
                            .collect();
                        if let Some(&j) = rng.pick(&opts) {
                            self.ignite(j);
                        }
                    }
                    let c = self.board[t].c;
                    self.push_ev(Ev::Hazard {
                        kind,
                        sev,
                        q: Some(c.q),
                        r: Some(c.r),
                        harmless: false,
                    });
                    self.log_say("Fire! Water puts it out; a cleared tile can stop it spreading.");
                }
            }
            return;
        }
        let p = self.build_problem(kind, sev, epi);
        if p.cells.is_empty() {
            self.stats.hazards_clean += 1;
            self.push_ev(Ev::Hazard {
                kind,
                sev,
                q: eq,
                r: er,
                harmless: true,
            });
            self.log_say(format!("{} passes: your island was ready.", kind.title()));
        } else {
            self.push_ev(Ev::Hazard {
                kind,
                sev,
                q: eq,
                r: er,
                harmless: false,
            });
            self.log_say(format!(
                "{} (severity {}) threatens {} tile(s). Respond with {} {}.",
                kind.title(),
                sev,
                p.cells.len(),
                p.cost,
                p.res.name()
            ));
            self.problems.push(p);
        }
    }

    fn nearest_flammable(&self, epi: usize, within: i32) -> Option<usize> {
        let ec = self.board[epi].c;
        let mut best: Option<(i32, usize)> = None;
        for i in 0..self.tiles.len() {
            if let Some(t) = self.tiles[i] {
                if tile_def(t.kind).flam > 0 && t.hp >= 1 && !t.burning {
                    let d = ec.dist(self.board[i].c);
                    if d <= within && best.map_or(true, |b| (d, i) < b) {
                        best = Some((d, i));
                    }
                }
            }
        }
        best.map(|b| b.1)
    }

    pub(crate) fn ignite(&mut self, i: usize) {
        if let Some(t) = self.tiles[i].as_mut() {
            if !t.burning {
                t.burning = true;
                let c = self.board[i].c;
                self.push_ev(Ev::Ignite { q: c.q, r: c.r });
            }
        }
    }

    pub fn bund_protected(&self, i: usize) -> bool {
        matches!(self.tiles[i], Some(t) if t.kind == TileKind::Bund)
            || self.nbrs[i]
                .iter()
                .any(|&j| matches!(self.tiles[j], Some(t) if t.kind == TileKind::Bund && t.hp >= 1))
    }

    pub fn rooted(&self, i: usize) -> bool {
        self.nbrs[i].iter().any(
            |&j| matches!(self.tiles[j], Some(t) if t.kind == TileKind::SacredForest && t.hp >= 1),
        )
    }

    fn build_problem(&self, kind: HazardKind, sev: u8, epi: Option<usize>) -> Problem {
        let n = self.tiles.len();
        let sev_i = sev as i32;
        let mut cells: Vec<usize> = Vec::new();
        let (res, cost);
        match kind {
            HazardKind::Drought => {
                for i in 0..n {
                    if matches!(self.tiles[i], Some(t) if t.kind == TileKind::Farm && t.hp >= 1)
                        && !self.near_water(i)
                    {
                        cells.push(i);
                    }
                }
                let wells = self.count(TileKind::Stepwell).min(2);
                let c = 1 + sev_i + (self.cfg.island == IslandKind::Farming) as i32
                    - wells
                    - self.has(Blessing::Rainkeeper) as i32;
                res = Res::Water;
                cost = c.max(1);
            }
            HazardKind::Flood => {
                let e = epi.map(|e| self.board[e].c).unwrap_or(Coord::new(0, 0));
                let radius = if sev >= 3 { 2 } else { 1 };
                let mut c: Vec<(i32, usize)> = (0..n)
                    .filter(|&i| {
                        matches!(self.tiles[i], Some(t) if t.hp >= 1)
                            && matches!(self.board[i].terrain, Terrain::Shore | Terrain::Meadow)
                            && e.dist(self.board[i].c) <= radius
                            && !self.bund_protected(i)
                    })
                    .map(|i| (e.dist(self.board[i].c), i))
                    .collect();
                c.sort();
                cells = c.into_iter().map(|x| x.1).collect();
                cells.truncate(2 + sev as usize);
                if self.has(Blessing::BundBuilders) {
                    cells.pop();
                }
                res = Res::Stone;
                cost = ((cells.len() as i32 + 1) / 2).max(1);
            }
            HazardKind::Storm => {
                let e = epi.map(|e| self.board[e].c).unwrap_or(Coord::new(0, 0));
                let mut c: Vec<(i32, usize)> = (0..n)
                    .filter(|&i| matches!(self.tiles[i], Some(t) if t.hp >= 1) && !self.rooted(i))
                    .map(|i| (e.dist(self.board[i].c), i))
                    .collect();
                c.sort();
                cells = c.into_iter().map(|x| x.1).take(1 + sev as usize).collect();
                res = Res::Wood;
                cost = ((cells.len() as i32 + 1) / 2).max(1);
            }
            HazardKind::Landslide => {
                let e = epi.map(|e| self.board[e].c).unwrap_or(Coord::new(0, 0));
                let radius = if sev >= 3 { 2 } else { 1 };
                let mut c: Vec<(i32, usize)> = (0..n)
                    .filter(|&i| {
                        matches!(self.tiles[i], Some(t) if t.hp >= 1)
                            && e.dist(self.board[i].c) <= radius
                            && !self.rooted(i)
                            && !self.bund_protected(i)
                    })
                    .map(|i| (e.dist(self.board[i].c), i))
                    .collect();
                c.sort();
                cells = c.into_iter().map(|x| x.1).collect();
                if self.has(Blessing::BundBuilders) {
                    cells.pop();
                }
                res = Res::Stone;
                cost = 1 + sev_i;
            }
            HazardKind::Fire => unreachable!("fire is handled per tile"),
        }
        let cost = cost + (self.cfg.heat >= 5) as i32;
        Problem {
            kind,
            sev,
            epi,
            cells,
            res,
            cost,
            resolved: false,
        }
    }
}

// ───────────────────────────── damage ─────────────────────────────

/// One step of damage: healthy -> damaged -> ruin. Returns true if ruined.
pub fn hit(g: &mut Game, i: usize) -> bool {
    let Some(t) = g.tiles[i] else { return false };
    let c = g.board[i].c;
    if t.hp >= 2 {
        if let Some(x) = g.tiles[i].as_mut() {
            x.hp = 1;
        }
        g.push_ev(Ev::Hit {
            q: c.q,
            r: c.r,
            ruin: false,
        });
        false
    } else {
        g.tiles[i] = None;
        g.ruin[i] = true;
        g.stats.tiles_lost += 1;
        g.mutate_harmony(-3);
        g.mutate_eco(if t.kind == TileKind::SacredForest {
            -5
        } else {
            -3
        });
        g.push_ev(Ev::Hit {
            q: c.q,
            r: c.r,
            ruin: true,
        });
        true
    }
}

// ───────────────────────────── end of round ─────────────────────────────

pub fn resolve_round_end(g: &mut Game) {
    // 1. Problems that were not answered strike.
    let problems = std::mem::take(&mut g.problems);
    for p in &problems {
        if p.resolved {
            g.stats.hazards_clean += 1;
            continue;
        }
        for &i in &p.cells {
            if g.tiles[i].is_some() {
                hit(g, i);
            }
        }
        match p.kind {
            HazardKind::Drought => {
                g.mutate_harmony(-6);
                let have = g.res[Res::Grain.idx()];
                g.res[Res::Grain.idx()] = (have - 2).max(0);
                g.log_say("The drought withers the unwatered farms.");
            }
            HazardKind::Flood => {
                g.mutate_harmony(-6);
                g.mutate_eco(-2);
                g.log_say("The flood waters took their toll.");
            }
            HazardKind::Storm => {
                g.mutate_harmony(-4);
                g.log_say("The storm tore through the unprepared roofs.");
            }
            HazardKind::Landslide => {
                g.mutate_harmony(-6);
                g.mutate_eco(-2);
                g.log_say("The hillside gave way.");
            }
            HazardKind::Fire => {}
        }
    }
    // 2. Fire marches on.
    fire_progress(g);
    // 3. Close the incident.
    let any = g.tiles.iter().flatten().any(|t| t.burning);
    if g.fire_open && !any {
        if !g.fire_lost {
            g.stats.hazards_clean += 1;
        }
        g.fire_open = false;
        g.fire_lost = false;
    }
    // 4. An unclaimed boon is gone.
    g.boon = None;
}

fn fire_progress(g: &mut Game) {
    let burning: Vec<usize> = (0..g.tiles.len())
        .filter(|&i| matches!(g.tiles[i], Some(t) if t.burning))
        .collect();
    if burning.is_empty() {
        return;
    }
    let mut rng = Rng::stream(g.cfg.seed, g.round, 13);
    let mut newly: Vec<(usize, usize)> = Vec::new();
    for &i in &burning {
        let nb = g.nbrs[i].clone();
        for j in nb {
            let Some(t) = g.tiles[j] else { continue };
            let def = tile_def(t.kind);
            if t.burning || def.flam == 0 || t.hp < 1 || newly.iter().any(|x| x.1 == j) {
                continue;
            }
            if t.kind == TileKind::SacredForest && g.has(Blessing::SacredGroves) {
                continue;
            }
            let mut p = def.flam + 10 * (g.fire_sev as i32 - 1);
            if g.cfg.island == IslandKind::Forest {
                p += 10;
            }
            if g.near_water(j) {
                p -= 20;
            }
            if rng.pct(p) {
                newly.push((i, j));
            }
        }
    }
    for &i in &burning {
        g.fire_lost = true;
        hit(g, i);
    }
    for (from, to) in newly {
        let (a, b) = (g.board[from].c, g.board[to].c);
        g.push_ev(Ev::Spread {
            fq: a.q,
            fr: a.r,
            tq: b.q,
            tr: b.r,
        });
        g.ignite(to);
    }
    g.log_say("The fire burns on and spreads.");
}
