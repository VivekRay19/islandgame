//! Deterministic RNG (SplitMix64). Same seed => same numbers on every platform.
//!
//! Every random decision in the game draws from a *stream* derived from
//! (seed, round, salt). Because streams are independent, a player's choices can
//! never shift what happens later: the Daily Island gives everyone the same
//! year, and replay verification on the server stays exact.

#[derive(Clone, Debug)]
pub struct Rng {
    s: u64,
}

#[inline]
fn mix(mut z: u64) -> u64 {
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^ (z >> 31)
}

impl Rng {
    pub fn new(seed: u64) -> Self {
        Rng {
            s: mix(seed ^ 0x9E37_79B9_7F4A_7C15),
        }
    }

    /// Independent stream for (seed, round, salt).
    pub fn stream(seed: u64, round: u32, salt: u32) -> Self {
        let a = mix(seed);
        let b = mix(a ^ ((round as u64) << 32 | salt as u64));
        Rng { s: b }
    }

    pub fn next_u64(&mut self) -> u64 {
        self.s = self.s.wrapping_add(0x9E37_79B9_7F4A_7C15);
        mix(self.s)
    }

    pub fn next_u32(&mut self) -> u32 {
        (self.next_u64() >> 32) as u32
    }

    /// Uniform in 0..n (n > 0).
    pub fn below(&mut self, n: u32) -> u32 {
        if n <= 1 {
            return 0;
        }
        ((self.next_u32() as u64 * n as u64) >> 32) as u32
    }

    /// True with probability `p` percent (clamped to 0..=100).
    pub fn pct(&mut self, p: i32) -> bool {
        let p = p.clamp(0, 100) as u32;
        self.below(100) < p
    }

    pub fn shuffle<T>(&mut self, v: &mut [T]) {
        for i in (1..v.len()).rev() {
            let j = self.below((i + 1) as u32) as usize;
            v.swap(i, j);
        }
    }

    pub fn pick<'a, T>(&mut self, v: &'a [T]) -> Option<&'a T> {
        if v.is_empty() {
            None
        } else {
            Some(&v[self.below(v.len() as u32) as usize])
        }
    }
}

/// FNV-1a over bytes, masked to 52 bits so the result survives a round trip
/// through a JavaScript `number` (2^53 safe integer limit).
pub fn hash_seed(text: &str) -> u64 {
    let mut h: u64 = 0xcbf2_9ce4_8422_2325;
    for b in text.as_bytes() {
        h ^= *b as u64;
        h = h.wrapping_mul(0x0000_0100_0000_01B3);
    }
    mix(h) & ((1u64 << 52) - 1)
}

/// Seed for the Daily Island, e.g. "2026-10-03".
pub fn daily_seed(date: &str) -> u64 {
    hash_seed(&format!("cultural-islands/daily/{}", date.trim()))
}
