//! Axial hex coordinates (pointy-top, matches the Pixi client's `cell(q, r)`).

use serde::{Deserialize, Serialize};

pub const RADIUS: i32 = 3;

/// Same direction order as the original server (`HEX_DIRS`).
pub const DIRS: [(i32, i32); 6] = [(1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1)];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Coord {
    pub q: i32,
    pub r: i32,
}

impl Coord {
    pub fn new(q: i32, r: i32) -> Self {
        Coord { q, r }
    }
    pub fn dist(self, o: Coord) -> i32 {
        let dq = self.q - o.q;
        let dr = self.r - o.r;
        (dq.abs() + dr.abs() + (dq + dr).abs()) / 2
    }
}

pub fn in_disk(q: i32, r: i32) -> bool {
    q.abs().max(r.abs()).max((q + r).abs()) <= RADIUS
}
