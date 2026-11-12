// One gag, two tiles: where the tower runs in c3, and where the stamp comes down in c4. One list for the drawing and the motion:
// sections/productions.mjs draws the letters, arcs and ghosts from it, score.mjs the keyframes, so they cannot drift apart.
// Everything here is in u from the top of its field. There is no time in this file: the score gives each drawing its beat.
import { SHEAR, lerp } from './draw.mjs';
import { word, RIGHT_MARGIN } from './letters.mjs';
import { COPY } from '../content.mjs';
import { logo } from './scene.mjs';

const TOWER_H = 124; // about half a letter's height: small enough to read as standing on them
const FEET = [584, 886.5]; // midway between the logo's two feet, slab (431, 911) and block (737, 862)
const FEET_SLOPE = 49 / 306; // the logo's feet do not lie level. This much shear puts both on one line, so they stand on a flat letter

// The logo with both its feet on `foot`. A drawing's origin of scale is this same point.
export const standing = (foot, h = TOWER_H) => {
  const sy = h / 798, sx = (h * 0.8) / 639;
  return (p) => [foot[0] + (p[0] - FEET[0]) * sx, foot[1] + (p[1] - FEET[1] + (p[0] - FEET[0]) * FEET_SLOPE) * sy];
};

// The two tiers of the stage, in the condensed cut letters (CUT_COND), leaning like the set. The second ends at x 1164 and the
// tower comes to rest on its last letter; the first starts at the column's margin and must end short of the tower standing
// there (CLEAR), or the tower would stand inside COMING's last letter and its last hop would fall through it. A tier that
// does not fit at its natural width is narrowed, never under 0.8 of it. Each tier is {text, h, xs, face, glyphs (table units),
// map (table -> c3 units)}.
const LEFT = 96, FACE = 'cond', CLEAR = 24;
const tier = (text, y, h, place) => {
  const { glyphs } = word(text, null, { face: FACE }), s = h / 140, limit = place.limit ?? RIGHT_MARGIN;
  const at = (xs) => (p) => [p[0] * s * xs + (140 - p[1]) * s * SHEAR.lean, y + p[1] * s];
  const span = (xs) => { const xx = glyphs.flatMap((g) => g.o.map((p) => at(xs)(p)[0])); return [Math.min(...xx), Math.max(...xx)]; };
  const fits = (xs) => { const [a, b] = span(xs), x0 = place.x ?? place.right - b; return x0 + a >= LEFT - 1e-9 && x0 + b <= limit; };
  let xs = 1;
  while (!fits(xs) && xs > 0.8) xs = Math.max(0.8, +(xs - 0.005).toFixed(3));
  const raw = at(xs), x0 = place.x ?? place.right - span(xs)[1];
  return { text, h, xs, face: FACE, glyphs, map: (p) => { const q = raw(p); return [x0 + q[0], q[1]]; } };
};

// A place to stand: the middle of the topmost edge of letter g's outer ring that runs within 15 degrees of the tier's
// baseline (level). On a flat top that is the top; on a round letter, the crown of its curve. Of two tops at one height,
// the one nearer the letter's middle.
const LEVEL = Math.tan((15 * Math.PI) / 180);
const treadOn = (T, g) => {
  const o = T.glyphs[g].o.map(T.map);
  const mx = (Math.min(...o.map((p) => p[0])) + Math.max(...o.map((p) => p[0]))) / 2;
  let best = null;
  o.forEach((p, i) => {
    const q = o[(i + 1) % o.length], dx = q[0] - p[0], dy = q[1] - p[1];
    if (Math.abs(dx) < 1e-6 || Math.abs(dy / dx) > LEVEL) return;
    const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    if (!best || m[1] < best[1] - 1 || (Math.abs(m[1] - best[1]) <= 1 && Math.abs(m[0] - mx) < Math.abs(best[0] - mx))) best = m;
  });
  return best;
};
const SOON = tier(COPY.soon[1], 654, 250, { right: 1164 });
const restLeft = Math.min(...logo.slice(0, 6).flat().map(standing(treadOn(SOON, 3))).map((p) => p[0]));
export const TIERS = [tier(COPY.soon[0], 390, 230, { x: LEFT, limit: restLeft - CLEAR }), SOON];
export const tread = (t, g) => treadOn(TIERS[t], g);
export const STATIONS = [tread(0, 0), tread(0, 2), tread(0, 4), tread(0, 5), tread(1, 3)];

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
