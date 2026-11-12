// The card grammar (the opening credits): dot screens, plates printed off register, torn smears, slabs, knocked-out type,
// words set into planes. For cards only: a1 to a4, b1, c3, c4, d0 to d4. Everything is polygons and <use>; the screens and the
// knockout's clip are the only defs. No gradient, filter, mask or blend.
import { C, lerpP, polyArea, clipHalf, bboxOf, line, openD } from './draw.mjs';
import { capOf } from './type.mjs';

// ---------- dot screens ----------
// A dot screen at 45 degrees: a base colour, a dot colour and the dot's radius as a share of the pitch. Two duotones of the
// cards' cut-ins, each in steps from deep to light, so a plane can carry a tone ramp the way a printed photograph does. The
// desktop pitch is 8u (5.6 px at 846); the phone swaps in 24u (5.9 px at 293), because anything finer turns to moire there.
export const PITCH = { d: 8, m: 24 };
export const SCREENS = {
  zA: [C.tealDk, C.tealLt, 0.14], // teal, deepest
  zB: [C.tealDk, C.tealLt, 0.25],
  zC: [C.tealDk, C.tealLt, 0.36],
  zD: [C.tealLt, C.tealDk, 0.3],
  zE: [C.tealLt, C.tealDk, 0.17], // teal, lightest: dark dots on light
  zF: [C.indigoDk, C.indigo, 0.16], // indigo, deepest
  zG: [C.indigoDk, C.indigo, 0.3],
  zH: [C.indigo, C.indigoDk, 0.28],
};
export const TEAL = ['zA', 'zB', 'zC', 'zD', 'zE'];
export const INDIGO = ['zF', 'zG', 'zH'];
const pattern = (id, [bg, dot, k], p) => `<pattern id="${id}" width="${p}" height="${p}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path fill="${bg}" d="M0 0h${p}v${p}H0z"/><circle cx="${p / 2}" cy="${p / 2}" r="${+(p * k).toFixed(2)}" fill="${dot}"/></pattern>`;
// Registers screen `key` (both pitches and the phone swap) and returns its fill attribute. The phone swap only reaches a path
// in a group of class `key`: draw screens with screenPolys (or grade), which set the class, never with the bare attribute.
export function screen(page, key) {
  const sc = SCREENS[key];
  if (!sc) throw new Error(`no screen ${key}`);
  page.def(key, pattern(key, sc, PITCH.d));
  page.def(key + 'm', pattern(key + 'm', sc, PITCH.m));
  page.swap(key, `.${key} path{fill:url(#${key}m)}`);
  return `fill="url(#${key})"`;
}
// polygons filled with screen `key`, in a group of class `key` (plus opt.cls)
export function screenPolys(page, polys, key, opt = {}) {
  page.polys(polys, screen(page, key), { ...opt, cls: [opt.cls, key].filter(Boolean).join(' ') });
}
// A plane printed as a tone ramp: cut into bands across a..b, each band one step of a screen family, deep at a, light at b.
// The bands share the screen's phase (the patterns live in page units), so only the dots' size steps at a band's edge. Each band
// runs 1.5u into the next, which paints over it: two edges that only meet would show a hairline of the ground between them.
export function grade(page, poly, a, b, keys, opt = {}) {
  const n = keys.length, nx = -(b[1] - a[1]), ny = b[0] - a[0], L = Math.hypot(nx, ny) || 1, lap = [(1.5 * ny) / L, (-1.5 * nx) / L]; // 1.5u along a..b
  keys.forEach((key, i) => {
    const p0 = lerpP(a, b, i / n), q1 = lerpP(a, b, (i + 1) / n), p1 = [q1[0] + lap[0], q1[1] + lap[1]];
    let part = poly;
    if (i > 0) part = clipHalf(part, [p0[0] + nx, p0[1] + ny], p0); // past p0
    if (i < n - 1) part = clipHalf(part, p1, [p1[0] + nx, p1[1] + ny]); // short of p1
    if (part.length > 2) screenPolys(page, [part], key, opt);
  });
}

// ---------- plates and shapes ----------
// A shape is printed twice: the second plate lands off register by dx, dy (about half a percent of the width, as on the cards).
export const offset = (list, dx, dy) => list.map((p) => p.map(([x, y]) => [x + dx, y + dy]));
// Polygons wound one way, so that a clip made of overlapping pieces is their union under the default nonzero rule.
export const wound = (list) => list.filter((p) => p && p.length > 2).map((p) => (polyArea(p) < 0 ? [...p].reverse() : p));
// The second plate: the shapes again in col, offset by (dx, dy), as one path. Call it BEFORE drawing the shapes, so it lies
// under them. Never under type. Returns the offset polygons.
export function plate(page, polys, col, dx = 10, dy = 8, opt = {}) {
  const off = offset(polys.filter((p) => p && p.length > 2), dx, dy);
  page.polys(off, `fill="${col}"`, opt);
  return off;
}

// A torn smear along a..b: the near edge straight, the far edge torn into many short ragged flicks that lean back against
// the stroke (ref48's torn mass, not a comb or a rake), the ends pointed. `w` is the body (120 to 160 reads as a mass), `R` a
// seeded generator. `teeth` flicks (default 10), each `reach` x w long past the body's shoulder (default .32), varied 0.8 to
// 1.2 a flick and every third one 1.6 times as long, each leaning back `lean` x its spacing, varied 0.7 to 1.3. Returns one
// polygon.
export function smear(a, b, w, R, { teeth = 10, reach = 0.32, lean = 0.9, side = 1 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const nx = -uy * side, ny = ux * side;
  const at = (t, h) => [a[0] + ux * L * t + nx * h, a[1] + uy * L * t + ny * h];
  const near = [], far = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12, body = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6; near.push(at(t, -w * 0.18 * body)); }
  far.push(at(1, 0));
  // the body swells and thins like a loaded brush; out of its shoulder go short flicks, each leaning back along the stroke
  const d = 1 / (teeth + 1), phase = R() * 6;
  for (let i = teeth; i >= 1; i--) {
    const t = i * d + (R() - 0.5) * d * 0.6, body = Math.sin(Math.PI * t) ** 0.5, swell = 0.8 + 0.35 * Math.sin(t * 9 + phase);
    const sh = w * body * 0.5 * swell, peak = sh + w * body * reach * (0.8 + R() * 0.4) * (i % 3 === 1 ? 1.6 : 1);
    far.push(at(t + 0.3 * d, sh * (0.9 + R() * 0.2)), at(t - lean * d * (0.7 + R() * 0.6), peak), at(t - 0.05 * d, sh * (0.72 + R() * 0.2)));
  }
  return [...near, ...far];
}

// An edge a..b torn into flames that point out of the shape (side 1 is to the left of a..b on screen) and lean back toward a:
// the trailing edge of something that has just moved. Returns the points between a and b, both excluded: splice them into a
// polygon between its corners a and b.
export function tear(a, b, depth, R, { teeth = 7, lean = 0.6, side = 1 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = uy * side, ny = -ux * side;
  const at = (t, h) => [a[0] + ux * L * t + nx * h, a[1] + uy * L * t + ny * h], d = 1 / teeth, out = [];
  for (let i = 0; i < teeth; i++) {
    const t = (i + 0.5) * d + (R() - 0.5) * d * 0.4, h = depth * (0.35 + R() * 0.65);
    out.push(at(t - 0.45 * d, 0), at(t + lean * d * 0.5, h), at(t + 0.3 * d, depth * 0.08));
  }
  return out;
}

// A slab: the band between two parallel lines at angle deg through the point o, from x0 to x1 and `h` thick (downward).
export function slab(o, deg, x0, x1, h) {
  const m = Math.tan((deg * Math.PI) / 180), y = (x) => o[1] + (x - o[0]) * m;
  return [[x0, y(x0)], [x1, y(x1)], [x1, y(x1) + h], [x0, y(x0) + h]];
}
// the same, under a name that does not clash with the logo's slab in kit/scene.mjs
export const slabBand = slab;

// ---------- type on cards ----------
// Knocked-out type: each line drawn twice, `fill` first, then `inv` clipped to the dark shapes, so the words are black on the
// field and lemon wherever they cross black. One clip per card (the same `dark` gives the same clip). Lines are set from the
// baseline start (x, y), each `lead` page units under the last, all turned `rot` degrees about (x, y). Returns
// {bbox, lines: [{str, x, y, width}], cap, lead, clip}.
export function knockout(page, F, lines, { x, y, size, lead, rot = 0, dark = [], fill = C.black, inv = C.lemon, cls, track = 0, before, from, z } = {}) {
  const cap = capOf(F, size), L = lead ?? 1.16 * cap;
  const r = (rot * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  const clip = dark.length ? page.clip(wound(dark)) : null;
  const out = [], pts = [];
  lines.forEach((str, i) => {
    const bx = x - si * L * i, by = y + co * L * i;
    const width = page.text(F, str, bx, by, { size, rot, fill, cls, track, before, from, z });
    if (clip) page.text(F, str, bx, by, { size, rot, fill: inv, cls, track, clip, before, from, z });
    out.push({ str, x: bx, y: by, width });
    const end = [bx + co * width, by + si * width], up = [si * cap, -co * cap];
    pts.push([bx, by], end, [bx + up[0], by + up[1]], [end[0] + up[0], end[1] + up[1]]);
  });
  return { bbox: bboxOf(pts), lines: out, cap, lead: L, clip };
}

// The em square of one face mapped onto three page points: where its baseline starts, a point further along the baseline
// (`along` em units on), and where the cap line stands above the start. Returns a matrix for page.text.
export function affine(F, base, alongPt, along, capPt) {
  const cap = (F.capHeight * F.em) / F.upm;
  const u = [(alongPt[0] - base[0]) / along, (alongPt[1] - base[1]) / along], v = [(base[0] - capPt[0]) / cap, (base[1] - capPt[1]) / cap];
  return [u[0], u[1], v[0], v[1], base[0], base[1]];
}

// A word set into a plane one letter at a time. map(u, v) takes the word's unit square (u along it, v from the cap line down
// to the baseline) onto the page; each letter gets the affine fitted to its own cell, so a word in perspective grows letter by
// letter. `cls(i)` names each letter's class; `inset` keeps the caps off the plane's edges.
export function setInto(page, F, str, map, { fill, cls = () => undefined, inset = 0.1, track = 0, before, from } = {}) {
  const em = F.em, xs = [];
  let x = 0, prev = '';
  for (const ch of str) { x += ((F.kern[prev + ch] || 0) * em) / F.upm; xs.push([x, x + (F.glyphs[ch][0] * em) / F.upm]); x += (F.glyphs[ch][0] * em) / F.upm + track; prev = ch; }
  const total = x - track, v0 = inset, v1 = 1 - inset;
  [...str].forEach((ch, i) => {
    const [x0, x1] = xs[i], um = (x0 + x1) / 2 / total;
    const base = map(x0 / total, v1), along = map(x1 / total, v1), capP = map(x0 / total, v0);
    const m = affine(F, base, along, x1 - x0, capP);
    // the letter's own middle decides its lean: a cell in strong perspective is not a parallelogram
    const mid = map(um, v1), midCap = map(um, v0), cap = (F.capHeight * em) / F.upm;
    m[2] = (mid[0] - midCap[0]) / cap; m[3] = (mid[1] - midCap[1]) / cap;
    page.text(F, ch, 0, 0, { size: em, matrix: m, fill, cls: cls(i), crossing: true, before, from });
  });
}

// points along a polygon's edge i, for hanging things off a shape
export const edgeAt = (poly, i, t) => lerpP(poly[i], poly[(i + 1) % poly.length], t);

// Dotted strokes (the hop arcs): round dots w wide, one every `gap`, along each polyline, as one path. Flat: fine in a loop.
export function dots(page, lines, col, { w = 4, gap = 14, cls, before, from } = {}) {
  const d = openD(lines);
  if (!d) return;
  page.raw(`<path ${line(col, w, { dash: [0.1, gap] })} d="${d}"/>`, bboxOf(lines.flat()), { cls, before, from });
}
