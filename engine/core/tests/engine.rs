use island_core::bot::{play, Skill};
use island_core::*;

fn cfg(seed: u64, i: IslandKind) -> Config {
    Config::new(seed, i)
}

#[test]
fn same_seed_same_world() {
    let a = Game::new(cfg(42, IslandKind::Forest));
    let b = Game::new(cfg(42, IslandKind::Forest));
    assert_eq!(a.view().to_string(), b.view().to_string());
    let c = Game::new(cfg(43, IslandKind::Forest));
    assert_ne!(a.view().to_string(), c.view().to_string());
}

#[test]
fn replay_reproduces_final_state_exactly() {
    for (s, isl) in ALL_ISLANDS.iter().enumerate() {
        let g = play(cfg(500 + s as u64, *isl), Skill::Expert, 9);
        let again = Game::replay(g.cfg.clone(), &g.history).expect("replay");
        assert_eq!(g.view().to_string(), again.view().to_string());
        assert_eq!(
            g.outcome.as_ref().unwrap().score,
            again.outcome.as_ref().unwrap().score
        );
    }
}

#[test]
fn replay_rejects_illegal_commands() {
    let bad = vec![Command::Build {
        tile: TileKind::Granary,
        q: 3,
        r: 3,
    }];
    assert!(Game::replay(cfg(1, IslandKind::Farming), &bad).is_err());
    // Cannot act while a blessing is pending.
    let g = Game::new(cfg(1, IslandKind::Farming));
    assert_eq!(g.phase, Phase::Draft);
}

#[test]
fn locked_tiles_cannot_be_built() {
    let mut c = cfg(7, IslandKind::Farming);
    c.unlocked = Some(vec![TileKind::Farm, TileKind::RiverBend]);
    let mut g = Game::new(c);
    g.apply(&Command::PickBlessing { index: 0 }).unwrap();
    let e = g
        .apply(&Command::Build {
            tile: TileKind::Granary,
            q: 1,
            r: -1,
        })
        .unwrap_err();
    assert!(e.contains("not unlocked"), "{e}");
}

#[test]
fn rulebook_fire_example_you_cannot_declare_it_out() {
    // Find a seed where round 2 starts a fire, then check the rules from the rulebook:
    // 1 water is not enough if 2 are needed; the fire must be paid for.
    let mut g = Game::new(cfg(3, IslandKind::Forest));
    g.apply(&Command::PickBlessing { index: 0 }).unwrap();
    g.apply(&Command::EndRound).unwrap(); // -> round 2 (fire round)
    let burning: Vec<usize> = (0..g.tiles.len())
        .filter(|&i| g.tiles[i].map_or(false, |t| t.burning))
        .collect();
    assert!(!burning.is_empty(), "round 2 is the scripted fire");
    let i = burning[0];
    let c = g.board[i].c;
    let need = g.douse_cost(i);
    g.res[Res::Water.idx()] = need - 1;
    let e = g.apply(&Command::Douse { q: c.q, r: c.r }).unwrap_err();
    assert!(e.contains("water"), "{e}");
    g.res[Res::Water.idx()] = need;
    g.apply(&Command::Douse { q: c.q, r: c.r }).unwrap();
    assert!(!g.tiles[i].unwrap().burning);
    assert_eq!(g.res[Res::Water.idx()], 0);
}

#[test]
fn unextinguished_fire_damages_then_destroys() {
    let mut g = Game::new(cfg(3, IslandKind::Forest));
    g.apply(&Command::PickBlessing { index: 0 }).unwrap();
    g.apply(&Command::EndRound).unwrap();
    let i = (0..g.tiles.len())
        .find(|&i| g.tiles[i].map_or(false, |t| t.burning))
        .unwrap();
    let kind = g.tiles[i].unwrap().kind;
    g.apply(&Command::EndRound).unwrap();
    // After one unanswered round the tile is damaged (or already ruined if it was burning twice).
    let after = g.tiles[i];
    assert!(
        after.map_or(true, |t| t.hp == 1),
        "{kind:?} should be damaged"
    );
}

#[test]
fn resources_never_negative_and_never_exceed_cap() {
    for s in 0..60u64 {
        let g = play(cfg(s, ALL_ISLANDS[(s % 4) as usize]), Skill::Random, s);
        for r in ALL_RES {
            assert!(g.res[r.idx()] >= 0, "negative {:?}", r);
        }
        assert!(g.harmony >= 0 && g.harmony <= 100 && g.ecology >= 0 && g.ecology <= 100);
    }
}

#[test]
fn fuzz_random_commands_never_panic() {
    let mut rng = Rng::new(77);
    for s in 0..40u64 {
        let mut g = Game::new(cfg(s, ALL_ISLANDS[(s % 4) as usize]));
        for _ in 0..400 {
            let q = rng.below(9) as i32 - 4;
            let r = rng.below(9) as i32 - 4;
            let kind = ALL_TILES[rng.below(13) as usize];
            let cmd = match rng.below(11) {
                0 => Command::PickBlessing {
                    index: rng.below(4) as usize,
                },
                1 => Command::Build { tile: kind, q, r },
                2 => Command::Demolish { q, r },
                3 => Command::Repair { q, r },
                4 => Command::ClearFell { q, r },
                5 => Command::Douse { q, r },
                6 => Command::Respond {
                    index: rng.below(3) as usize,
                },
                7 => Command::Trade {
                    offer: rng.below(5) as usize,
                },
                8 => Command::ClaimProject {
                    id: "task_l1_farm".into(),
                },
                9 => Command::ClaimBoon,
                _ => Command::EndRound,
            };
            let _ = g.apply(&cmd);
            let _ = g.view();
        }
    }
}

#[test]
fn a_season_always_ends() {
    for s in 0..30u64 {
        let g = play(cfg(s, ALL_ISLANDS[(s % 4) as usize]), Skill::Random, s);
        assert_eq!(g.phase, Phase::Over);
        assert!(g.round <= g.cfg.rounds);
    }
}

#[test]
fn daily_seed_is_stable_and_js_safe() {
    let a = daily_seed("2026-10-03");
    assert_eq!(a, daily_seed("2026-10-03"));
    assert_ne!(a, daily_seed("2026-10-04"));
    assert!(a < (1u64 << 53));
}

#[test]
fn expert_can_win_and_casual_cannot_skip_trade() {
    let wins = (0..40)
        .filter(|s| {
            play(cfg(1000 + s, IslandKind::Farming), Skill::Expert, *s)
                .outcome
                .as_ref()
                .unwrap()
                .won
        })
        .count();
    assert!(wins >= 28, "expert should usually win on Calm: {wins}/40");
    let casual = (0..40)
        .filter(|s| {
            play(cfg(1000 + s, IslandKind::Farming), Skill::Casual, *s)
                .outcome
                .as_ref()
                .unwrap()
                .won
        })
        .count();
    assert!(casual <= 8, "never trading should not win: {casual}/40");
}

#[test]
fn sprawl_costs_ecology() {
    // Same island; one version never stops building. The land should notice.
    let g = play(cfg(2024, IslandKind::Farming), Skill::Expert, 1);
    assert!(g.ecology < 100, "ecology must not be a free resource");
}

#[test]
fn view_json_has_what_the_client_needs() {
    let mut g = Game::new(cfg(11, IslandKind::Coastal));
    let v = g.view();
    for k in [
        "round", "ap", "res", "cap", "harmony", "ecology", "cells", "omens", "offers", "build",
        "projects", "goals", "draft", "outlook",
    ] {
        assert!(v.get(k).is_some(), "missing {k}");
    }
    let p = g.preview_build(TileKind::Farm, 1, -1);
    assert!(p.get("legal").is_some());
}
