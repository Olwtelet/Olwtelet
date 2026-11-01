// c4. Argus: a real field guide, in pencil, on paper.
import { C, W, rng, taper, pencil, swell, lerpP, homography } from '../kit/draw.mjs';
import { cutLine, fitH } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.argus, y1 = Y.resumex;
  const R = rng(505);
  page.polys([[[-14, y0 - 4], [W + 14, y0 - 4], [W + 14, y1 + 30], [-14, y1 + 30]]], `fill="${C.douga}"`);
  const k = 0.0701;
  const gx0 = 470, gx1 = 1186, gy0 = y0 + 32, gy1 = y1 - 44; // the foot clears the blue and misses the corner of the Resumex frame
  const roll = (x) => (gx1 - x) * k * 0.6;
  const H = homography([[0, 0], [1, 0], [1, 1], [0, 1]], [[gx0, gy0 + roll(gx0)], [gx1, gy0], [gx1 + 6, gy1], [gx0 + 6, gy1 + roll(gx0)]]);
  const N = COPY.feeds.length, step = 0.05;
  const rect = (t) => [H([t, t * 1.06]), H([1 - t, t * 1.06]), H([1 - t, 1 - t * 1.06]), H([t, 1 - t * 1.06])];
  const lines = [];
  for (let i = 0; i <= N; i++) {
    const q = rect(i * step);
    for (let c = 0; c < 4; c++) lines.push(...pencil(q[c], q[(c + 1) % 4], { w: i === 0 ? 6 : 3.4, over: i === 0 ? 20 : 15, R, restate: 0.25, wander: 0.8 }));
  }
  page.polys(lines, `fill="${C.graphite}"`, { cls: 'pl' });
  // one acid centre
  const inner = N * step;
  const c0 = rect(inner);
  page.polys([c0], `fill="${C.toka}"`);
  page.polys(pencil(c0[0], c0[1], { w: 4, over: 8, R, restate: 0 }).concat(pencil(c0[1], c0[2], { w: 4, over: 8, R, restate: 0 }), pencil(c0[2], c0[3], { w: 4, over: 8, R, restate: 0 }), pencil(c0[3], c0[0], { w: 4, over: 8, R, restate: 0 })), `fill="${C.sumi}"`, { cls: 'pl' });
  // the centre mark: two axes, drawn by hand through every field, that stop at the acid. It is what makes this a chart and not a corridor
  const t0 = inner * 1.06;
  const arms = [[[0.5, -0.02], [0.5, t0 + 0.012]], [[0.5, 1.02], [0.5, 1 - t0 - 0.012]], [[-0.012, 0.5], [inner + 0.006, 0.5]], [[1.012, 0.5], [1 - inner - 0.006, 0.5]]];
  page.polys(arms.map(([a, b]) => taper([H(a), H(b)], { w: 3, prof: swell, wob: 0.8, R, n: 4 })), `fill="${C.graphite}"`, { cls: 'pl' });
  const cc = lerpP(c0[0], c0[2], 0.5);
  const mw = page.measure(Hand, COPY.map, 42);
  page.text(Hand, COPY.map, cc[0] - mw / 2, cc[1] + 12, { size: 42, fill: C.sumi, R, jit: 6 });
  // each name on its own frame, the way a chart prints a field: the pencil lifts for it, and for anything that would reach its letters
  COPY.feeds.forEach((f, i) => {
    const q = rect(i * step), a = q[0], ang = Math.atan2(q[1][1] - a[1], q[1][0] - a[0]), ux = Math.cos(ang), uy = Math.sin(ang);
    const at = (s, n) => [a[0] + ux * s - uy * n, a[1] + uy * s + ux * n];
    const w = page.measure(Zen, f, 17.5), s = 20;
    page.polys([[at(s - 7, -11), at(s + w + 7, -11), at(s + w + 7, 11), at(s - 7, 11)]], `fill="${C.douga}"`, { cls: 'd' });
    const o = at(s, 5.5);
    page.text(Zen, f, o[0], o[1], { size: 17.5, fill: C.graphite, rot: (ang * 180) / Math.PI, cls: 'd' });
  });
  const column = gx0 - L0; // the text column stops short of the guide
  const hA = fitH(COPY.argusTitle, 350, 6, SHEAR.lean);
  cutLine(page, COPY.argusTitle, L0, y0 + 34, hA, C.sumi, { seed: 81, skew: SHEAR.lean });
  para(page, Zen, COPY.argusLead, L0, y0 + 186, 29, 37, { cls: 'd', measure: column });
  para(page, Zen, COPY.argusFacts, L0, y0 + 268, 19, 25, { cls: 'd', measure: column - 24 });
  page.text(Zen, COPY.argusTarget, L0, y1 - 18, { size: 19, fill: C.blue, cls: 'd' });
  para(page, Zen, COPY.argusPhone, L0, y0 + 196, 41, 47, { cls: 'm', measure: column });
}
