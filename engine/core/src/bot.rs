//! A heuristic player. It has three jobs:
//!   1. balance testing  (examples/balance.rs plays thousands of seeds),
//!   2. fuzz/regression tests (a random player must never crash the engine),
//!   3. the in-game "Advisor" hint for new players.
//! It only ever submits real `Command`s through `Game::apply`, so it can't
//! cheat or find states a human couldn't reach.

use crate::data::*;
use crate::game::*;
use crate::rng::Rng;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Skill {
    /// Plans ahead: keeps water reserves, trades for shortages, fights fire.
    Expert,
    /// Builds and claims, but keeps no reserves and ignores omens.
    Casual,
    /// Picks random legal moves.
    Random,
}

const TARGETS: [(TileKind, i32); 13] = [
    (TileKind::Farm, 3),
    (TileKind::SacredForest, 2),
    (TileKind::RiverBend, 2),
    (TileKind::Stepwell, 1),
    (TileKind::CommunityHouse, 3),
    (TileKind::TextileWorkshop, 2),
    (TileKind::HaatMarket, 2),
    (TileKind::ClayPit, 1),
    (TileKind::MusicPavilion, 1),
    (TileKind::SacredShrine, 1),
    (TileKind::Quarry, 1),
    (TileKind::Bund, 1),
    (TileKind::Granary, 0),
];

fn target_for(k: TileKind) -> i32 {
    TARGETS.iter().find(|t| t.0 == k).map(|t| t.1).unwrap_or(1)
}

fn water_omen(g: &Game) -> bool {
    g.omens
        .iter()
        .any(|o| o.round == g.round + 1 && matches!(o.kind, HazardKind::Fire | HazardKind::Drought))
}

fn reserve_water(g: &Game, skill: Skill) -> i32 {
    if skill != Skill::Expert {
        return 0;
    }
    if water_omen(g) {
        2
    } else {
        1
    }
}

fn best_blessing(g: &Game, skill: Skill) -> usize {
    let mut order = vec![
        Blessing::BountifulHands,
        Blessing::Firewatch,
        Blessing::Rainkeeper,
        Blessing::SilkRoad,
        Blessing::SeedBank,
        Blessing::DeepRoots,
        Blessing::Stonemason,
        Blessing::FestivalSpirit,
        Blessing::SacredGroves,
        Blessing::ElderCounsel,
        Blessing::BundBuilders,
        Blessing::ClayMemory,
    ];
    // Prepare for what the coming season actually holds.
    let r = g.round;
    let ahead: Vec<HazardKind> = (r..r + 3)
        .filter_map(|x| g.plan.get(x as usize - 1))
        .filter_map(|s| {
            if let Slot::Hazard(k) = s {
                Some(*k)
            } else {
                None
            }
        })
        .collect();
    if skill == Skill::Expert {
        if ahead
            .iter()
            .any(|k| matches!(k, HazardKind::Flood | HazardKind::Landslide))
        {
            order.insert(1, Blessing::BundBuilders);
        }
        if ahead.contains(&HazardKind::Drought) {
            order.insert(1, Blessing::Rainkeeper);
        }
        if ahead.contains(&HazardKind::Fire) {
            order.insert(1, Blessing::Firewatch);
        }
    }
    for b in order {
        if let Some(i) = g.draft.iter().position(|d| *d == b) {
            return i;
        }
    }
    0
}

fn total_cost_needed(g: &Game) -> [i32; 8] {
    let mut want = [0i32; 8];
    // The most attractive thing we cannot afford yet.
    if let Some((_, kind, i)) = rank_builds(g, false).first() {
        for (r, n) in g.build_cost(*kind, *i) {
            want[r.idx()] = want[r.idx()].max(n);
        }
    }
    for p in PROJECTS.iter() {
        if g.claimed.contains(&p.id) || p.level > project_level_open(g.round) {
            continue;
        }
        if p.requires.iter().all(|k| g.count(*k) > 0) {
            for (r, n) in p.cost {
                want[r.idx()] = want[r.idx()].max(*n);
            }
        }
    }
    want[Res::Water.idx()] = want[Res::Water.idx()].max(3);
    want[Res::Grain.idx()] = want[Res::Grain.idx()].max(g.upkeep() + 1);
    want
}

/// Candidate builds, best first. `afford_only` filters by current resources.
pub fn rank_builds(g: &Game, afford_only: bool) -> Vec<(f32, TileKind, usize)> {
    let mut out = Vec::new();
    let flood_risk = g
        .plan
        .iter()
        .skip(g.round as usize - 1)
        .any(|s| matches!(s, Slot::Hazard(HazardKind::Flood | HazardKind::Landslide)));
    for def in TILES.iter() {
        let kind = def.kind;
        if !g.is_unlocked(kind) {
            continue;
        }
        let have = g.count(kind);
        for i in 0..g.tiles.len() {
            if g.placement_check(kind, i).is_err() {
                continue;
            }
            let cost = g.build_cost(kind, i);
            if afford_only && !g.can_afford(&cost) {
                continue;
            }
            let mut v = 0.0f32;
            // Marginal economy of the tile in this exact spot (synergies included).
            let before = g.economy();
            let mut g2 = g.clone();
            g2.tiles[i] = Some(Tile {
                kind,
                hp: 2,
                burning: false,
                age: 0,
            });
            let after = g2.economy();
            let w = [3.0, 2.0, 2.0, 2.0, 1.5, 3.0, 1.5, 3.0];
            for k in 0..8 {
                v += w[k] * (after.res[k] - before.res[k]) as f32;
            }
            v += 2.0 * (after.harmony - before.harmony) as f32
                + 2.0 * (after.eco - before.eco) as f32;
            // Needed to complete a project?
            if have == 0
                && PROJECTS
                    .iter()
                    .any(|p| !g.claimed.contains(&p.id) && p.requires.contains(&kind))
            {
                v += 6.0;
            }
            if kind == TileKind::CommunityHouse && have < 4 {
                v += 5.0;
            }
            if kind == TileKind::HaatMarket && have == 0 {
                v += 5.0;
            }
            if kind == TileKind::Bund && flood_risk && have == 0 {
                v += 6.0;
            }
            if matches!(kind, TileKind::RiverBend | TileKind::Stepwell) && have < 2 {
                v += 3.0;
            }
            if have >= target_for(kind) {
                v -= 9.0;
            }
            // Don't pack fuel next to fuel.
            if def.flam > 0 {
                let fuel = g.nbrs[i]
                    .iter()
                    .filter(|&&j| matches!(g.tiles[j], Some(t) if tile_def(t.kind).flam > 0))
                    .count() as f32;
                v -= 0.8 * fuel;
                if g2.near_water(i) {
                    v += 1.5;
                }
            }
            if g.board[i].terrain == Terrain::Woods && kind != TileKind::SacredForest {
                v -= 2.0;
            }
            let c: i32 = cost.iter().map(|x| x.1).sum();
            v -= 0.4 * c as f32;
            out.push((v, kind, i));
        }
    }
    out.sort_by(|a, b| {
        b.0.partial_cmp(&a.0)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(a.2.cmp(&b.2))
    });
    out
}

fn trade_for(g: &Game, want: Res, keep: &[i32; 8]) -> Option<Command> {
    let free = g.free_used < g.free_slots();
    if !free && g.ap < 1 {
        return None;
    }
    if g.trades_done >= MAX_TRADES {
        return None;
    }
    let mut best: Option<(i32, usize)> = None;
    for (idx, o) in g.offers.iter().enumerate() {
        if o.taken || o.sells != want {
            continue;
        }
        let give = g.trade_cost(o);
        let have = g.res[o.wants.idx()];
        if have - give < keep[o.wants.idx()] {
            continue;
        }
        let score = o.sell_n * 10 - give;
        if best.map_or(true, |b| score > b.0) {
            best = Some((score, idx));
        }
    }
    best.map(|b| Command::Trade { offer: b.1 })
}

pub fn next_command(g: &mut Game, skill: Skill, rng: &mut Rng) -> Command {
    if skill == Skill::Random {
        return random_command(g, rng);
    }
    if g.phase == Phase::Draft {
        return Command::PickBlessing {
            index: best_blessing(g, skill),
        };
    }
    if g.phase == Phase::Over {
        return Command::EndRound;
    }
    let none = [0i32; 8];
    // 1. Fire first.
    let burning: Vec<usize> = (0..g.tiles.len())
        .filter(|&i| matches!(g.tiles[i], Some(t) if t.burning))
        .collect();
    // most valuable first: halls, then anything that can spread
    let mut order = burning.clone();
    order.sort_by_key(|&i| {
        (
            g.tiles[i]
                .map(|t| t.kind != TileKind::CommunityHouse)
                .unwrap_or(true),
            g.douse_cost(i),
        )
    });
    for &i in &order {
        if g.res[Res::Water.idx()] >= g.douse_cost(i) {
            let c = g.board[i].c;
            return Command::Douse { q: c.q, r: c.r };
        }
    }
    if !burning.is_empty() && skill == Skill::Expert {
        if let Some(c) = trade_for(g, Res::Water, &none) {
            return c;
        }
    }
    // 2. Answer problems.
    for (index, p) in g.problems.iter().enumerate() {
        if p.resolved {
            continue;
        }
        if g.res[p.res.idx()] >= p.cost {
            return Command::Respond { index };
        }
    }
    if skill == Skill::Expert {
        let unresolved: Vec<(Res, i32)> = g
            .problems
            .iter()
            .filter(|p| !p.resolved)
            .map(|p| (p.res, p.cost))
            .collect();
        for (r, _) in unresolved {
            if let Some(c) = trade_for(g, r, &none) {
                return c;
            }
        }
    }
    // 3. Repairs.
    if skill == Skill::Expert && g.ap >= 1 {
        for i in 0..g.tiles.len() {
            if let Some(t) = g.tiles[i] {
                if t.hp < 2 && !t.burning && g.can_afford(&g.repair_cost(t.kind)) {
                    let c = g.board[i].c;
                    return Command::Repair { q: c.q, r: c.r };
                }
            }
        }
    }
    // 4. Projects (free actions).
    let reserve = reserve_water(g, skill);
    for p in PROJECTS.iter() {
        if g.project_status(p).is_ok() {
            let water_cost = p
                .cost
                .iter()
                .find(|x| x.0 == Res::Water)
                .map(|x| x.1)
                .unwrap_or(0);
            if g.res[Res::Water.idx()] - water_cost >= reserve {
                return Command::ClaimProject {
                    id: p.id.to_string(),
                };
            }
        }
    }
    // 5. Opportunities.
    if let Some(b) = &g.boon {
        if !b.claimed && b.kind != BoonKind::Caravan {
            return Command::ClaimBoon;
        }
    }
    // 6. Build.
    if g.ap >= 1 {
        let ranked = rank_builds(g, true);
        for (v, kind, i) in ranked.into_iter().take(6) {
            if v < -4.0 {
                break;
            }
            let cost = g.build_cost(kind, i);
            let water_after = g.res[Res::Water.idx()]
                - cost
                    .iter()
                    .find(|x| x.0 == Res::Water)
                    .map(|x| x.1)
                    .unwrap_or(0);
            let water_kind = matches!(
                kind,
                TileKind::RiverBend | TileKind::Stepwell | TileKind::Farm | TileKind::ClayPit
            );
            if water_after < reserve && !water_kind {
                continue;
            }
            let c = g.board[i].c;
            return Command::Build {
                tile: kind,
                q: c.q,
                r: c.r,
            };
        }
    }
    // 7. Trade toward the next purchase.
    if skill == Skill::Expert {
        let want = total_cost_needed(g);
        let mut short: Vec<(i32, Res)> = ALL_RES
            .iter()
            .map(|&r| (want[r.idx()] - g.res[r.idx()], r))
            .filter(|x| x.0 > 0)
            .collect();
        short.sort_by(|a, b| b.0.cmp(&a.0));
        for (_, r) in short {
            let mut keep = want;
            keep[r.idx()] = 0;
            if let Some(c) = trade_for(g, r, &keep) {
                return c;
            }
        }
    }
    Command::EndRound
}

fn random_command(g: &mut Game, rng: &mut Rng) -> Command {
    if g.phase == Phase::Draft {
        return Command::PickBlessing {
            index: rng.below(g.draft.len().max(1) as u32) as usize,
        };
    }
    let mut legal: Vec<Command> = Vec::new();
    for def in TILES.iter() {
        for i in 0..g.tiles.len() {
            if g.build_check(def.kind, i).is_ok() && g.ap >= 1 {
                let c = g.board[i].c;
                legal.push(Command::Build {
                    tile: def.kind,
                    q: c.q,
                    r: c.r,
                });
            }
        }
    }
    for i in 0..g.tiles.len() {
        if let Some(t) = g.tiles[i] {
            let c = g.board[i].c;
            if t.burning && g.res[Res::Water.idx()] >= g.douse_cost(i) {
                legal.push(Command::Douse { q: c.q, r: c.r });
            }
        }
    }
    for (index, p) in g.problems.iter().enumerate() {
        if !p.resolved && g.res[p.res.idx()] >= p.cost {
            legal.push(Command::Respond { index });
        }
    }
    for p in PROJECTS.iter() {
        if g.project_status(p).is_ok() {
            legal.push(Command::ClaimProject {
                id: p.id.to_string(),
            });
        }
    }
    for (offer, o) in g.offers.iter().enumerate() {
        if !o.taken && g.res[o.wants.idx()] >= g.trade_cost(o) && g.trades_done < MAX_TRADES {
            legal.push(Command::Trade { offer });
        }
    }
    // Random players dither: ending the round is always on the menu.
    if legal.is_empty() || rng.pct(25) {
        return Command::EndRound;
    }
    legal[rng.below(legal.len() as u32) as usize].clone()
}

/// Play a whole season. Returns the finished game.
pub fn play(cfg: Config, skill: Skill, bot_seed: u64) -> Game {
    let mut g = Game::new(cfg);
    let mut rng = Rng::new(bot_seed);
    let mut guard = 0;
    while g.phase != Phase::Over && guard < 4000 {
        guard += 1;
        let c = next_command(&mut g, skill, &mut rng);
        if g.apply(&c).is_err() {
            // A bot move the engine refuses must never loop forever.
            let _ = g.apply(&Command::EndRound);
        }
    }
    g
}

/// The Advisor: what would a good player do next?
pub fn hint(g: &mut Game) -> Command {
    let mut rng = Rng::new(1);
    next_command(g, Skill::Expert, &mut rng)
}
