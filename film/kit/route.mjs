// One gag, two tiles: where the tower runs in c3, and where the stamp comes down in c4. One list for the drawing and the motion:
// sections/productions.mjs draws the letters, arcs and ghosts from it, score.mjs the keyframes, so they cannot drift apart.
// Everything here is in u from the top of its field. There is no time in this file: the score gives each drawing its beat.
import { SHEAR, rng, lerp } from './draw.mjs';
import { word } from './letters.mjs';
import { COPY } from '../content.mjs';

const TOWER_H = 124; // about half a letter's height: small enough to read as standing on them
const FEET = [584, 886.5]; // midway between the logo's two feet, slab (431, 911) and block (737, 862)
const FEET_SLOPE = 49 / 306; // the logo's feet do not lie level. This much shear puts both on one line, so they stand on a flat letter

// The logo with both its feet on `foot`. A drawing's origin of scale is this same point.
export const standing = (foot, h = TOWER_H) => {
  const sy = h / 798, sx = (h * 0.8) / 639;
  return (p) => [foot[0] + (p[0] - FEET[0]) * sx, foot[1] + (p[1] - FEET[1] + (p[0] - FEET[0]) * FEET_SLOPE) * sy];
};

// the two tiers of the stage. The first starts at the column's margin, the second ends at the right margin: the drop between them is the staircase.
const tier = (text, seed, y, h, xs, track, place) => {
  const { glyphs } = word(text, rng(seed), { amt: 1.6, track }), s = h / 140;
  const raw = (p) => [p[0] * s * xs + (140 - p[1]) * s * SHEAR.lean, y + p[1] * s];
  const x0 = place.x ?? place.right - Math.max(...glyphs.flatMap((g) => g.o.map((p) => raw(p)[0])));
  return { text, h, xs, glyphs, map: (p) => { const q = raw(p); return [x0 + q[0], q[1]]; } };
};
export const TIERS = [
  tier(COPY.soon[0], 141, 390, 230, 0.72, 12, { x: 96 }),
  tier(COPY.soon[1], 142, 654, 250, 1, 8, { right: 1164 }),
];

// a place to stand: the middle of a letter's flat top, between two corners of its outline
const tread = (t, g, a, b) => { const { o } = TIERS[t].glyphs[g], p = TIERS[t].map(o[a]), q = TIERS[t].map(o[b]); return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]; };
const STATIONS = [tread(0, 0, 0, 1), tread(0, 2, 0, 1), tread(0, 4, 0, 1), tread(0, 5, 0, 1), tread(1, 3, 3, 4)];

// One hop is one parabola: a quadratic in time, as a ball falls. `rise` is how far the apex clears the higher end.
// The two middle hops stay low: on a phone the lead's last word hangs just over the head of the first of them.
const hop = (a, b, rise) => {
  const top = Math.min(a[1], b[1]) - rise, c = top - Math.sqrt((a[1] - top) * (b[1] - top));
  const at = (t) => [lerp(a[0], b[0], t), (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * c + t * t * b[1]];
  return { at, apex: at((a[1] - c) / (a[1] - 2 * c + b[1])) };
};
export const HOPS = [hop(STATIONS[0], STATIONS[1], 40), hop(STATIONS[1], STATIONS[2], 38), hop(STATIONS[2], STATIONS[3], 38), hop(STATIONS[3], STATIONS[4], 20)];
export const GHOSTS = [HOPS[1].apex, HOPS[2].apex]; // sparse: the rough of a set, not a sheet of drawings

export const REST = STATIONS[4];

// the run, one line per drawing, with the foot's place and its scale about the foot. `land` marks the feet coming down.
const SQUASH = [1.14, 0.8], STRETCH = [0.95, 1.06];
export const DRAWINGS = [
  { at: STATIONS[0] },
  { at: STATIONS[0], scale: [1.07, 0.88] },
  { at: HOPS[0].apex, scale: STRETCH },
  { at: STATIONS[1], scale: SQUASH, land: true },
  { at: HOPS[1].apex, scale: STRETCH },
  { at: STATIONS[2], scale: SQUASH, land: true },
  { at: HOPS[2].apex, scale: STRETCH },
  { at: STATIONS[3], scale: SQUASH, land: true },
  { at: HOPS[3].apex, scale: STRETCH },
  { at: HOPS[3].at(0.78), scale: [0.9, 1.12] },
  { at: REST, scale: [1.2, 0.72], land: true },
  { at: REST, scale: [0.96, 1.05] },
  { at: REST },
];

// where the stamp's rubber meets the page: its centre on c4, and what it turns about as it comes down
export const STAMP = { x: 945, y: 420 };
