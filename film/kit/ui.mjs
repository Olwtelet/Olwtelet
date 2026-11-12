// The scene interface (b2, b3, c1, c2): warning triangles, lock-on marks and their leaders, plates with dark type knocked out
// of them, ruled scan sheets, a full bar, a status badge, an arrow. Every mark carries a fact: there is no crosshair, chart,
// corner bracket or partial bar here, on purpose.
import { C, polyD, bboxOf, n2, tint, line, openD } from './draw.mjs';
import { faces, capOf, measure } from './type.mjs';
import { GuardError } from './letters.mjs';

// A warning triangle in thin line (w wide), point up, centred on (cx, cy), side s, with its bar and dot inside.
export function warnTri(page, cx, cy, s, col, { w = 3, cls, before, from, z } = {}) {
  const h = s * 0.87, t = [[cx, cy - h * 0.62], [cx + s / 2, cy + h * 0.38], [cx - s / 2, cy + h * 0.38]];
  const bar = [[cx - s * 0.05, cy - h * 0.24], [cx + s * 0.05, cy - h * 0.24], [cx + s * 0.035, cy + h * 0.1], [cx - s * 0.035, cy + h * 0.1]];
  const dot = [[cx - s * 0.05, cy + h * 0.17], [cx + s * 0.05, cy + h * 0.17], [cx + s * 0.05, cy + h * 0.27], [cx - s * 0.05, cy + h * 0.27]];
  page.raw(`<path ${line(col, w)} d="${polyD(t)}"/><path fill="${col}" d="${polyD(bar)}${polyD(dot)}"/>`, [cx - s, cy - s, cx + s, cy + s], { cls, before, from, z });
}
// A lock-on: a square turned 45 degrees around (cx, cy), r from centre to corner, with a short cross at the point; `double`
// adds an inner diamond.
export function lockOn(page, cx, cy, r, col, { w = 3, double = false, cls, before, from, z } = {}) {
  const sq = (rr) => [[cx, cy - rr], [cx + rr, cy], [cx, cy + rr], [cx - rr, cy]];
  const k = r * 0.32, cross = `M${n2(cx - k)} ${n2(cy)}h${n2(2 * k)}M${n2(cx)} ${n2(cy - k)}v${n2(2 * k)}`;
  page.raw(`<path ${line(col, w)} d="${polyD(sq(r))}${double ? polyD(sq(r * 0.62)) : ''}${cross}"/>`, [cx - r - w, cy - r - w, cx + r + w, cy + r + w], { cls, before, from, z });
}
// Straight leaders, one polyline each ([lock, row anchor] or with a bend), as one stroked path. The caller orders them so that
// no two cross; two leaders that cross stop the build (Overflow).
const cross = (a, b, c, d) => {
  const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
export function leaders(page, list, col, w = 2.5, { cls, before, from, z } = {}) {
  const segs = list.map((p) => p.slice(1).map((q, i) => [p[i], q]));
  for (let i = 0; i < segs.length; i++) for (let j = i + 1; j < segs.length; j++) {
    for (const [a, b] of segs[i]) for (const [c, d] of segs[j]) if (cross(a, b, c, d)) throw new GuardError('Overflow', `leaders ${i} and ${j} cross`);
  }
  page.raw(`<path ${line(col, w, { cap: true })} d="${openD(list)}"/>`, bboxOf(list.flat()), { cls, before, from, z });
}
// a plate: a rectangle as a polygon
export const plate = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// the same, under a name that does not clash with the off-register plate in kit/print.mjs
export const platePoly = plate;
// Dark type knocked out of a coloured plate: the plate sized to the line (pad x size round it), then the type in `ink`.
// (x, y) is the baseline start. `upper` sets the line in capitals. Returns {box, width, cap}.
export function plateText(page, F, str, x, y, { size, plate: col, ink, pad = 0.28, upper = false, rot = 0, cls, before, from, z } = {}) {
  const text = upper ? str.toUpperCase() : str, width = measure(F, text, size), cap = capOf(F, size), p = pad * size;
  const r = (rot * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r), at = ([u, v]) => [x + u * co - v * si, y + u * si + v * co];
  const rect = [[-p, -cap - p], [width + p, -cap - p], [width + p, p], [-p, p]].map(at);
  page.polys([rect], `fill="${col}"`, { cls, before, from, z });
  page.text(F, text, x, y, { size, rot, fill: ink, cls, before, from, z });
  return { box: bboxOf(rect), width, cap, rect };
}
// A ruled translucent panel over rect [x0, y0, x1, y1]: the fill at `op`, a frame and `rules` rules in `line` width (6u on a
// phone).
export function scanSheet(page, rect, col, { rules = 6, op = 0.12, line: lw = 2.5, cls, before, from, z } = {}) {
  const [x0, y0, x1, y1] = rect, box = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  page.polys([box], tint(col, op), { cls, before, from, z });
  const rl = []; for (let k = 1; k <= rules; k++) { const y = y0 + ((y1 - y0) * k) / (rules + 1); rl.push([[x0, y], [x1, y]]); }
  const d = `${polyD(box)}${openD(rl)}`, c = (dm) => [cls, dm].filter(Boolean).join(' ');
  page.raw(`<path ${line(col, lw)} d="${d}"/>`, [x0 - lw, y0 - lw, x1 + lw, y1 + lw], { cls: c('d'), before, from, z });
  page.raw(`<path ${line(col, Math.max(6, lw))} d="${d}"/>`, [x0 - 6, y0 - 6, x1 + 6, y1 + 6], { cls: c('m'), before, from, z });
}
// A full bar: the one state the page can show without inventing data. There is no partial bar.
export function bar(page, x, y, w, h, col, { cls, before, from, z } = {}) {
  page.polys([plate(x, y, w, h)], `fill="${col}"`, { cls, before, from, z });
}
// A small square status badge: a square of `col` at (x, y) top left, `word` centred in it in `ink`, the type `size` (41u or
// more on a phone). Returns {box, side}.
export function badge(page, x, y, size, word, col, ink, { F = faces.ui, pad = 0.3, cls, before, from, z } = {}) {
  const width = measure(F, word, size), cap = capOf(F, size), side = Math.max(width, cap) + 2 * pad * size;
  page.polys([plate(x, y, side, side)], `fill="${col}"`, { cls, before, from, z });
  page.text(F, word, x + (side - width) / 2, y + (side + cap) / 2, { size, fill: ink, cls, before, from, z });
  return { box: [x, y, x + side, y + side], side };
}
// A straight arrow from a to b, w wide, with a triangle head (head x w long, 2.6 x w wide) at b. One polygon.
export function arrow(page, a, b, w, col, { head = 3.2, cls, before, from, z } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
  const hl = Math.min(head * w, L * 0.6), hw = 1.3 * w, m = [b[0] - ux * hl, b[1] - uy * hl];
  const P = (p, k) => [p[0] + nx * k, p[1] + ny * k];
  page.polys([[P(a, w / 2), P(m, w / 2), P(m, hw), b, P(m, -hw), P(m, -w / 2), P(a, -w / 2)]], `fill="${col}"`, { cls, before, from, z });
}
