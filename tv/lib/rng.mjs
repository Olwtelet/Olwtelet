// Deterministic randomness for generated textures (grain, static, strip noise).
// Nothing in tv/ may call Math.random: identical input must produce byte-identical SVGs.

const encoder = new TextEncoder();

/**
 * FNV-1a 32-bit hash of a stable string, used to derive a seed from a name.
 * @example rng(seedOf('file-01-argus.svg#grain'))
 */
export function seedOf(str) {
  let h = 0x811c9dc5;
  for (const byte of encoder.encode(String(str))) {
    h ^= byte;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * mulberry32 PRNG. Returns a function producing numbers in [0, 1).
 * @example const R = rng(7); const x = Math.floor(R() * 180);
 */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
