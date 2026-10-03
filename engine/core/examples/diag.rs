use island_core::bot::{play, Skill};
use island_core::*;
use std::collections::HashMap;
fn main() {
    for skill in [Skill::Expert, Skill::Casual] {
        for island in ALL_ISLANDS {
            let mut miss: HashMap<&str, u32> = HashMap::new();
            let (mut h, mut e, mut p) = (0, 0, 0);
            let n = 200;
            for s in 0..n {
                let g = play(Config::new(1000 + s, island), skill, s);
                let o = g.outcome.as_ref().unwrap();
                for gl in &o.goals {
                    if !gl.met {
                        *miss.entry(gl.id).or_default() += 1;
                    }
                }
                h += g.harmony;
                e += g.ecology;
                p += g.claimed.len() as i32;
            }
            println!(
                "{:?} {} miss={:?} harmony={} eco={} projects={:.1}",
                skill,
                island.id(),
                miss,
                h / n as i32,
                e / n as i32,
                p as f64 / n as f64
            );
        }
    }
}
