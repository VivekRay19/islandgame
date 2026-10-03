//! cargo run --release -p island-core --example balance [games]
//! Plays many seeded seasons with three skill levels and prints win rates.
use island_core::bot::{play, Skill};
use island_core::*;

fn main() {
    let n: u64 = std::env::args()
        .nth(1)
        .and_then(|s| s.parse().ok())
        .unwrap_or(300);
    println!(
        "{:<9} {:<8} {:>4} {:>6} {:>6} {:>6} {:>5} {:>6} {:>7}",
        "skill", "island", "heat", "win%", "dead%", "score", "tiles", "lost", "clean%"
    );
    for skill in [Skill::Expert, Skill::Casual, Skill::Random] {
        for island in ALL_ISLANDS {
            for heat in [0u8, 2, 5] {
                if skill != Skill::Expert && heat == 2 {
                    continue;
                }
                let (mut wins, mut dead, mut score, mut tiles, mut lost, mut haz, mut clean) =
                    (0, 0, 0i64, 0i64, 0i64, 0i64, 0i64);
                for s in 0..n {
                    let mut cfg = Config::new(1000 + s, island);
                    cfg.heat = heat;
                    let g = play(cfg, skill, s);
                    let o = g.outcome.as_ref().unwrap();
                    wins += o.won as u64;
                    dead += (g.round < g.cfg.rounds
                        || o.reason.contains("fell to zero")
                        || o.reason.contains("Abandoned")
                        || o.reason.contains("Barren")) as u64;
                    score += o.score as i64;
                    tiles += g.alive_tiles() as i64;
                    lost += g.stats.tiles_lost as i64;
                    haz += g.stats.hazards_total as i64;
                    clean += g.stats.hazards_clean as i64;
                }
                let f = |x: i64| x as f64 / n as f64;
                println!(
                    "{:<9} {:<8} {:>4} {:>5.0}% {:>5.0}% {:>6.0} {:>5.1} {:>6.1} {:>6.0}%",
                    format!("{:?}", skill),
                    island.id(),
                    heat,
                    100.0 * wins as f64 / n as f64,
                    100.0 * dead as f64 / n as f64,
                    f(score),
                    f(tiles),
                    f(lost),
                    100.0 * clean as f64 / haz.max(1) as f64
                );
            }
        }
    }
}
