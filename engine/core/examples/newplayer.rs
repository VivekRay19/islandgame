use island_core::bot::{play, Skill};
use island_core::*;
fn main() {
    for lvl in [1u32, 2, 3, 5] {
        for island in [IslandKind::Forest, IslandKind::Farming] {
            let (mut w, mut tiles, mut proj) = (0, 0, 0);
            let n = 150;
            for s in 0..n {
                let mut c = Config::new(9000 + s, island);
                c.unlocked = Some(tiles_unlocked_at(lvl));
                let g = play(c, Skill::Expert, s);
                w += g.outcome.as_ref().unwrap().won as u32;
                tiles += g.alive_tiles();
                proj += g.claimed.len() as i32;
            }
            println!(
                "level {lvl} {:<8} win {:>3}%  tiles {:.1}  projects {:.1}",
                island.id(),
                100 * w / n as u32,
                tiles as f32 / n as f32,
                proj as f32 / n as f32
            );
        }
    }
}
