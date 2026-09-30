use crate::models::game::HexTile;

pub const HEX_DIRS: [(i32, i32); 6] = [
    (1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1),
];

pub fn is_valid_placement(tiles: &[HexTile], q: i32, r: i32) -> bool {
    if tiles.iter().any(|t| t.q == q && t.r == r) { return false; }
    if tiles.is_empty() { return q == 0 && r == 0; }
    HEX_DIRS.iter().any(|(dq, dr)| {
        tiles.iter().any(|t| t.q == q + dq && t.r == r + dr)
    })
}

/// Edge-matching score bonus (mirrors TS evaluateEdgeMatching)
pub fn edge_match_score(tiles: &[HexTile], q: i32, r: i32,
                         tile_id: &str, rotation: i32) -> i32 {
    use crate::game_logic::tiles::{all_tile_defs, get_rotated_edges};
    let defs = all_tile_defs();
    let Some(new_def) = defs.get(tile_id) else { return 0 };
    let new_edges = get_rotated_edges(&new_def.base_edges, rotation);
    let opposite = [3usize, 4, 5, 0, 1, 2];

    let mut matching = 0i32;
    let mut total    = 0i32;

    for (i, (dq, dr)) in HEX_DIRS.iter().enumerate() {
        if let Some(neighbor) = tiles.iter().find(|t| t.q == q + dq && t.r == r + dr) {
            total += 1;
            if let Some(nd) = defs.get(neighbor.tile_id.as_str()) {
                let ne = get_rotated_edges(&nd.base_edges, neighbor.rotation);
                if new_edges[i] == ne[opposite[i]] { matching += 1; }
            }
        }
    }
    matching * 15 + if matching == total && total >= 2 { 25 } else { 0 }
}
