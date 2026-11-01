// Hand-cut wedge alphabet. Height 140, y down. Stems flare to the foot like the logo's slab; ends cut on the slant.
// {o: outer polygon, h: [holes], w: advance}
import { rng, lerp, clipConvex, bboxOf, ANG } from './draw.mjs';

// A build-stopping fault raised while drawing. `guard` names the row of the guard table it belongs to.
export class GuardError extends Error {
  constructor(guard, message) { super(message); this.guard = guard; }
}

export const CUT = {
  A: { w: 122, o: [[46, 0], [72, 0], [120, 140], [80, 140], [74, 112], [40, 112], [30, 140], [-4, 140]], h: [[[56, 48], [47, 88], [66, 88]]] },
  B: { w: 108, o: [[0, 0], [72, 3], [96, 22], [92, 58], [78, 68], [102, 84], [98, 122], [76, 140], [-3, 140]], h: [[[38, 26], [56, 27], [58, 52], [38, 54]], [[38, 82], [60, 82], [62, 112], [38, 114]]] },
  C: { w: 104, o: [[16, 0], [92, 5], [88, 38], [46, 32], [40, 100], [92, 104], [98, 138], [14, 140], [-2, 110], [0, 24]] },
  D: { w: 110, o: [[0, 0], [70, 0], [102, 30], [104, 112], [78, 140], [-3, 140]], h: [[[40, 30], [60, 32], [64, 104], [40, 110]]] },
  E: { w: 106, o: [[0, 0], [94, 5], [90, 32], [42, 30], [42, 56], [80, 56], [80, 84], [42, 86], [42, 110], [98, 106], [104, 140], [-3, 140]] },
  F: { w: 100, o: [[0, 0], [96, 5], [92, 34], [42, 32], [42, 60], [82, 60], [80, 90], [42, 92], [46, 140], [-2, 140]] },
  G: { w: 112, o: [[16, 0], [94, 5], [90, 36], [46, 32], [42, 104], [66, 106], [66, 88], [52, 88], [52, 62], [104, 62], [106, 140], [14, 140], [-2, 110], [0, 24]] },
  H: { w: 118, o: [[0, 0], [36, 0], [38, 54], [70, 54], [72, 0], [108, 0], [112, 140], [72, 140], [70, 88], [38, 88], [38, 140], [-3, 140]] },
  I: { w: 50, o: [[1, 0], [38, 0], [46, 140], [-3, 140]] },
  J: { w: 98, o: [[40, 0], [84, 0], [88, 112], [66, 140], [10, 140], [-2, 100], [38, 96], [44, 106], [50, 100]] },
  K: { w: 122, o: [[0, 0], [38, 0], [38, 52], [72, 0], [116, 0], [70, 62], [120, 140], [74, 140], [40, 84], [38, 140], [-3, 140]] },
  L: { w: 106, o: [[2, 0], [40, 6], [44, 104], [92, 100], [106, 140], [-3, 140]] },
  M: { w: 146, o: [[0, 0], [40, 0], [68, 62], [96, 0], [136, 0], [142, 140], [102, 140], [100, 58], [76, 112], [58, 112], [38, 58], [38, 140], [-4, 140]] },
  N: { w: 128, o: [[0, 0], [40, 0], [84, 84], [84, 0], [120, 0], [124, 140], [86, 140], [38, 54], [38, 140], [-4, 140]] },
  O: { w: 114, o: [[18, 0], [84, 4], [108, 34], [106, 112], [80, 140], [14, 136], [-2, 104], [2, 28]], h: [[[42, 30], [64, 36], [68, 100], [56, 112], [40, 100]]] },
  P: { w: 106, o: [[0, 0], [76, 3], [102, 24], [100, 66], [74, 90], [40, 90], [44, 140], [-3, 140]], h: [[[40, 28], [60, 28], [62, 58], [40, 62]]] },
  Q: { w: 114, o: [[18, 0], [84, 4], [108, 34], [106, 112], [96, 124], [116, 140], [64, 142], [56, 138], [14, 136], [-2, 104], [2, 28]], h: [[[42, 30], [64, 36], [68, 100], [56, 112], [40, 100]]] },
  R: { w: 116, o: [[0, 0], [76, 3], [102, 24], [100, 62], [80, 78], [114, 140], [68, 140], [44, 84], [40, 84], [42, 140], [-3, 140]], h: [[[40, 28], [62, 28], [62, 54], [40, 58]]] },
  S: { w: 110, o: [[14, 0], [94, 5], [92, 36], [44, 32], [44, 50], [96, 58], [106, 84], [100, 124], [82, 140], [4, 138], [2, 104], [62, 108], [62, 90], [8, 82], [-2, 56], [2, 18]] },
  T: { w: 112, o: [[0, 0], [112, 7], [108, 36], [74, 32], [82, 140], [30, 140], [38, 32], [4, 36]] },
  U: { w: 114, o: [[0, 0], [40, 0], [42, 100], [64, 104], [68, 0], [106, 0], [110, 112], [84, 140], [20, 140], [-2, 114]] },
  V: { w: 118, o: [[0, 0], [42, 0], [60, 88], [78, 0], [118, 0], [78, 140], [40, 140]] },
  W: { w: 138, o: [[0, 0], [36, 0], [44, 76], [56, 26], [76, 26], [88, 76], [98, 0], [134, 0], [106, 140], [72, 140], [66, 92], [58, 140], [24, 140]] },
  X: { w: 122, o: [[0, 0], [44, 0], [60, 42], [78, 0], [118, 0], [80, 66], [122, 140], [78, 140], [58, 96], [40, 140], [-3, 140], [38, 68]] },
  Y: { w: 118, o: [[0, 0], [44, 0], [60, 50], [76, 0], [118, 0], [78, 82], [84, 140], [36, 140], [42, 82]] },
  Z: { w: 116, o: [[4, 0], [106, 3], [106, 30], [50, 106], [110, 102], [114, 140], [-3, 140], [-3, 108], [56, 34], [2, 36]] },
  'É': { w: 106, o: [[0, 0], [38, 0], [74, -30], [100, -26], [62, 4], [94, 5], [90, 32], [42, 30], [42, 56], [80, 56], [80, 84], [42, 86], [42, 110], [98, 106], [104, 140], [-3, 140]] },
  'Á': { w: 122, o: [[46, 0], [54, 0], [84, -30], [108, -26], [70, 0], [72, 0], [120, 140], [80, 140], [74, 112], [40, 112], [30, 140], [-4, 140]], h: [[[56, 48], [47, 88], [66, 88]]] },
  '&': { w: 124, o: [[20, 0], [80, 3], [96, 22], [92, 50], [70, 66], [92, 90], [104, 66], [130, 66], [112, 112], [130, 140], [88, 140], [80, 130], [62, 140], [12, 140], [-2, 110], [4, 84], [28, 66], [8, 42], [6, 18]], h: [[[42, 26], [60, 26], [60, 42], [50, 50], [40, 40]], [[34, 96], [46, 84], [66, 108], [46, 114]]] },
  ' ': { w: 44, o: [] },
  '-': { w: 70, o: [[0, 56], [62, 52], [60, 84], [2, 86]] },
  '.': { w: 46, o: [[2, 104], [38, 100], [42, 140], [0, 140]] },
  ',': { w: 46, o: [[2, 104], [38, 100], [42, 140], [18, 168], [12, 164], [20, 140], [0, 140]] },
  '?': { w: 96, o: [[8, 0], [84, 4], [100, 26], [96, 62], [62, 78], [60, 96], [28, 96], [28, 62], [62, 48], [62, 32], [8, 34]] },
};

// jitter a letter so no two instances match (hand cut)
export function cut(ch, R, amt = 1.6) {
  const g = CUT[ch]; if (!g) throw new GuardError('Floors', `no cut letter for "${ch}"`);
  const j = (p) => [p[0] + (R() - 0.5) * 2 * amt, p[1] + (R() - 0.5) * 2 * amt];
  return { w: g.w, o: g.o.map(j), h: (g.h || []).map((h) => h.map(j)) };
}

// lay a word out flat. returns [{o,h,x}] polygons in word coords, plus total width
export function word(text, R, { amt = 1.6, track = 4, kern = {} } = {}) {
  let x = 0; const out = [];
  const up = text.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    const c = cut(up[i], R, amt);
    const k = kern[up.slice(i, i + 2)] || 0;
    out.push({ ch: up[i], x, o: c.o.map((p) => [p[0] + x, p[1]]), h: c.h.map((h) => h.map((p) => [p[0] + x, p[1]])) });
    x += c.w + track + k;
  }
  return { glyphs: out, width: x - track };
}

export const RIGHT_MARGIN = 1190; // a cut line stops here unless it is declared to bleed

// Every line of cut letters reports here: held to the right margin unless it bleeds, and logged for the height floor.
// A line that names its tile also logs its bounds: the Seam geometry guard holds it inside that tile.
export function noteCut(page, text, insts, h, { xs = 1, bleed = false, tile, box = tile && bboxOf(insts.flat(2)) } = {}) {
  if (!bleed) { const xm = Math.max(...insts.flat(2).map((p) => p[0])); if (xm > RIGHT_MARGIN) throw new GuardError('Overflow', `cut line "${text}" overflows the right margin: x ${xm.toFixed(0)} > ${RIGHT_MARGIN}`); }
  page.log.cuts.push({ text, h, xs, bleed, tile, box });
}

export function cutLine(page, text, x, y, h, fill, { seed = 1, skew = 0, track = 6, cls, clip, amt = 1.6, z, xs = 1, rot = 0, bleed = false, kern, tile } = {}) {
  const wd = word(text, rng(seed), { amt, track, kern });
  const s = h / 140;
  const rad = (rot * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
  const map = (p) => { const X = p[0] * s * xs + (140 - p[1]) * s * skew, Y = p[1] * s; return [x + X * co - Y * si, y + X * si + Y * co]; };
  let insts = wd.glyphs.filter((g) => g.o.length).map((g) => [g.o, ...g.h].map((r) => r.map(map)));
  if (clip) insts = insts.map((rs) => rs.map((r) => clipConvex(r, clip)).filter((r) => r.length > 2)).filter((rs) => rs.length);
  noteCut(page, text, insts, h, { xs, bleed, tile });
  page.rings(insts, `fill="${fill}"`, { cls, z });
  return wd.width * s * xs;
}
// Stretching a word stretches its holes too: forced this wide, F A broke ORDFALL into two words and A T split INTEGRATEK.
export const KERN = { FA: -32, AT: -26, TA: -22 };
export const cutWidth = (text, h, track = 6) => word(text, rng(1), { track }).width * (h / 140);
export const fitH = (text, maxW, track = 6, skew = 0) => { const n = word(text, rng(1), { track }).width; return (maxW * 140) / (n + 140 * skew); };

// a word lying flat on the street: stems run to the vanishing point, the horizon's roll is kept
export function layWord(page, text, xb0, xb1, yt, yb, VP, fill, { seed = 1, cls, track = 6, kern } = {}) {
  const wd = word(text, rng(seed), { amt: 1.2, track, kern });
  const u = (x) => (x / wd.width), rollAt = (x) => (x - VP[0]) * -ANG.roll;
  const map = (p) => {
    const v = p[1] / 140, y = lerp(yt, yb, v), sc = (y - VP[1]) / (yb - VP[1]);
    const xb = lerp(xb0, xb1, u(p[0]));
    const X = VP[0] + (xb - VP[0]) * sc;
    return [X, y + rollAt(X)];
  };
  const insts = wd.glyphs.filter((g) => g.o.length).map((g) => [g.o, ...g.h].map((r) => r.map(map)));
  noteCut(page, text, insts, yb - yt, { bleed: true }); // the street's perspective owns its edge
  page.rings(insts, `fill="${fill}"`, { cls });
  return insts;
}
