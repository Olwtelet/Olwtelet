// The film's one set: camera, tower (the logo), the light, the cast shadow, and the logo's other drawings.
// Everything computed. These numbers are the set: do not retune.
import fs from 'node:fs';
import { C, camera, lerpP, homography, clipConvex } from './draw.mjs';
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

// The name through the slab: OLWTELET in the wide cut letters (Archivo), mapped into the slab by a homography. Each entry is
// one letter's rings, [outer, ...counters], in logo coordinates: map them through T (the tower) or S (its shadow).
const wd = word(COPY.towerName, null, { track: 7 });
const q = { fl: [205, 825], fr: [431, 911], tr: [456, 170], tl: [322, 113] };
const ins = (a, b, c, d, u, v) => lerpP(lerpP(a, b, u), lerpP(d, c, u), v);
const qd = [ins(q.fl, q.fr, q.tr, q.tl, 0.075, 0.018), ins(q.fl, q.fr, q.tr, q.tl, 0.925, 0.018), ins(q.fl, q.fr, q.tr, q.tl, 0.925, 0.982), ins(q.fl, q.fr, q.tr, q.tl, 0.075, 0.982)];
const hom = homography([[0, 0], [0, 140], [wd.width, 140], [wd.width, 0]], qd);
export const nameLetters = wd.glyphs.map((g) => [g.o, ...g.h].map((r) => r.map(hom)));
// the same quad as a unit square, for a word set in another face: u runs up the slab from its foot, v from the cap line to the baseline
const homUV = homography([[0, 0], [0, 1], [1, 1], [1, 0]], qd);
export const slabUV = (u, v) => homUV([u, v]);
export const SLAB_QUAD = qd; // the quad the name fills, in logo coordinates: foot left, foot right, head right, head left

// ---------- the logo mapped into any quad ----------
export function towerQuad(dst) {
  const H = homography([[205, 113], [844, 113], [844, 911], [205, 911]], dst);
  return (p) => H(p);
}
// The six planes through a map, each in planes[k] or `fill`; planes[k] = null (or false) leaves that plane out.
export function towerFlat(page, Q, { fill = C.black, slitFill, clip, cls, planes = {}, before, from } = {}) {
  const cl = (r) => (clip ? clipConvex(r, clip) : r);
  const parts = { slab, blade, beam, top, side, foot };
  for (const [k, poly] of Object.entries(parts)) if (planes[k] !== null && planes[k] !== false) page.polys([cl(poly.map(Q))], `fill="${planes[k] || fill}"`, { cls, before, from });
  if (slitFill) page.polys([cl(slit.map(Q))], `fill="${slitFill}"`, { cls, before, from });
}
