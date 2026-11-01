// c6. Stardew Anti-Cheat: a spacing chart.
import { C, W, rng, taper, lerp } from '../kit/draw.mjs';
import { cutLine, KERN } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.anticheat, y1 = Y.sep;
  const R = rng(707);
  const cx0 = 610, step = 84, base = y1 - 82;
  const column = cx0 - L0; // the text column stops at the chart
  page.polys([[[-14, y0 + 44], [W + 14, y0 - 42], [W + 14, y1 + 30], [-14, y1 + 30]]], `fill="${C.verm}"`);
  // cut on the lean like every other project's name, in two lines so that it stays in its column
  const hT = 54;
  COPY.acTitleLines.forEach((l, i) => cutLine(page, l, L0, y0 + 46 + i * (hT + 6), hT, C.sumi, { seed: 71 + i, skew: SHEAR.lean, kern: KERN }));
  para(page, Zen, COPY.acLead, L0, y0 + 196, 24, 29, { cls: 'd', measure: column });
  para(page, Zen, COPY.acFacts, L0, y0 + 256, 18, 23, { cls: 'd', measure: column });
  page.text(Zen, COPY.acTarget, L0, y1 - 12, { size: 18, fill: C.sumi, cls: 'd' });
  para(page, Zen, COPY.acPhone, L0, y0 + 212, 41, 47, { cls: 'm', measure: column });
  // chart: the same tooth seven times, a comb. Identical on purpose, to the unit: a diagram of the behaviour, not a reading.
  // Each tooth is two strokes that meet in a point: a rise that thins to the tip, and a decay that swells out of it.
  const lines = [], ticks = [];
  COPY.acChecks.forEach((c, i) => {
    const x0 = cx0 + step * i, x1 = x0 + step;
    const peak = y0 + 92, tip = [x0 + 4, peak];
    const fall = [tip];
    for (let k = 1; k <= 8; k++) { const t = k / 8; fall.push([lerp(x0 + 4, x1 + 2, t), base - (base - peak) * Math.exp(-3.8 * t)]); }
    lines.push(taper([[x0, base], tip], { w: 6.5, prof: (u) => 1 - u, n: 1 }));
    lines.push(taper(fall, { w: 9, prof: (u) => Math.max(0.12, Math.min(1, u * 6) * (1 - u * 0.9)) }));
    for (let k = 0; k <= 10; k++) { const t = 1 - Math.exp(-0.34 * k); const xx = Math.round(lerp(x0, x1, t) * 10) / 10; ticks.push([xx, base + 6, xx, base + 24]); }
    page.text(Zen, c, x0 + 2, base + (i % 2 ? 72 : 50), { size: 18, fill: C.sumi, cls: 'd' });
  });
  page.polys(lines, `fill="${C.sumi}"`);
  page.segs(ticks, `stroke="${C.sumi}" stroke-width="2.4"`);
  page.text(Hand, COPY.acNote, 716, y0 + 68, { size: 46, fill: C.sumi, R: rng(9), jit: 6 });
}
