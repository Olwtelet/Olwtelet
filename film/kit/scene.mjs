// The film's one set: camera, tower (the logo), the light, the cast shadow, and the logo's other drawings.
// Everything computed. These numbers are the set: do not retune.
import fs from 'node:fs';
import { C, rng, camera, lerpP, homography, clipConvex, pencil, hatch } from './draw.mjs';
import { word } from './letters.mjs';
import { COPY } from '../content.mjs';

export const logo = JSON.parse(fs.readFileSync(new URL('../data/logo.json', import.meta.url), 'utf8')).map((o) => o.poly);
export const [slab, blade, beam, top, side, foot, slit] = logo;

export const cam = camera({ pos: [0, 24, 0], yaw: 0, pitch: 0.56, roll: -0.07, f: 640, cx: 590, cy: 300 });
export const P = (p) => cam.project(p);
const TS = 0.215, TZ = 96, TX = 0, ty = -0.16;
export const towerWorld = (p) => { const x = (p[0] - 512) * TS, y = (911 - p[1]) * TS; const c = Math.cos(ty), s = Math.sin(ty); return [TX + x * c, y, TZ + x * s]; };
export const LIGHT = [0.2, -1, -0.425];
export const shadowWorld = (w) => { const k = w[1] / -LIGHT[1]; return [w[0] + LIGHT[0] * k, 0, w[2] + LIGHT[2] * k]; };
export const T = (p) => { const q = P(towerWorld(p)); return [q[0], q[1]]; };
export const S = (p) => { const q = P(shadowWorld(towerWorld(p))); return [q[0], q[1]]; };

// the name, cut through the slab
const wd = word(COPY.towerName, rng(11), { amt: 0.8, track: 7 });
const q = { fl: [205, 825], fr: [431, 911], tr: [456, 170], tl: [322, 113] };
const ins = (a, b, c, d, u, v) => lerpP(lerpP(a, b, u), lerpP(d, c, u), v);
const qd = [ins(q.fl, q.fr, q.tr, q.tl, 0.075, 0.018), ins(q.fl, q.fr, q.tr, q.tl, 0.925, 0.018), ins(q.fl, q.fr, q.tr, q.tl, 0.925, 0.982), ins(q.fl, q.fr, q.tr, q.tl, 0.075, 0.982)];
const hom = homography([[0, 0], [0, 140], [wd.width, 140], [wd.width, 0]], qd);
export const nameLetters = wd.glyphs.map((g) => [g.o, ...g.h].map((r) => r.map(hom)));

// ---------- the logo mapped into any quad ----------
export function towerQuad(dst) {
  const H = homography([[205, 113], [844, 113], [844, 911], [205, 911]], dst);
  return (p) => H(p);
}
export function towerFlat(page, Q, { fill = C.sumi, slitFill, clip, cls, planes = {} } = {}) {
  const cl = (r) => (clip ? clipConvex(r, clip) : r);
  const parts = { slab, blade, beam, top, side, foot };
  for (const [k, poly] of Object.entries(parts)) if (planes[k] !== 'none') page.polys([cl(poly.map(Q))], `fill="${planes[k] || fill}"`, { cls });
  if (slitFill) page.polys([cl(slit.map(Q))], `fill="${slitFill}"`, { cls });
}
export function letterSet(page, Q, order, fill, { clip, cls, seed = 3 } = {}) {
  const wd2 = word(order, rng(seed), { amt: 0.8, track: 7 });
  const hom2 = homography([[0, 0], [0, 140], [wd2.width, 140], [wd2.width, 0]], qd);
  const cl = (r) => (clip ? clipConvex(r, clip) : r);
  wd2.glyphs.forEach((g) => {
    if (!g.o.length) return;
    page.polys([cl(g.o.map(hom2).map(Q))], `fill="${fill.fg}"`, { cls });
    if (g.h.length) page.polys(g.h.map((r) => cl(r.map(hom2).map(Q))), `fill="${fill.bg}"`, { cls });
  });
}
// the logo in line: outline passes, optional hatch
export function towerPencil(page, Q, { R, w = 3, col = C.graphite, hatchCol, cls, gap = 9, over = 8, restate = 0.4, hatchSlab = false, noHatch = false, polys = [slab, blade, beam, top, side, foot, slit] } = {}) {
  const lines = [];
  for (const poly of polys) {
    const p = poly.map(Q);
    for (let i = 0; i < p.length; i++) lines.push(...pencil(p[i], p[(i + 1) % p.length], { w, over, R, restate, wander: 0.8 }));
  }
  page.polys(lines, `fill="${col}"`, { cls: cls ? `pl ${cls}` : 'pl' });
  if (noHatch) return;
  const hc = hatchCol || col;
  page.polys(hatch(side.map(Q), { angle: -60, gap, w: w * 0.9, R, over: 2 }), `fill="${hc}"`, { cls });
  page.polys(hatch(foot.map(Q), { angle: -60, gap, w: w * 0.9, R, over: 2 }), `fill="${hc}"`, { cls });
  if (hatchSlab) page.polys(hatch(slab.map(Q), { angle: 28, gap: gap * 1.4, w: w * 0.9, R, over: 3 }), `fill="${hc}"`, { cls });
}
