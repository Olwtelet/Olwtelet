// b1. The sentence lands at the end of the shadow.
import { C, W, taper } from '../kit/draw.mjs';
import { cutLine, fitH } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { STRIP } from '../kit/strip.mjs';

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen } = faces;
  // ink carries on past the shadow's far edge so the sentence sits inside the shadow
  const ink0 = Y.demoInk0 + 6; // on the strip's February rule
  page.polys([[[-14, ink0], [W + 14, ink0], [W + 14, Y.acid + 40], [-14, Y.acid + 40]]], `fill="${C.sumi}"`, { cls: 'sh' });
  const x0 = 520, maxW = 660;
  const h1 = Math.min(fitH(COPY.demoA, maxW, 6, SHEAR.lean), fitH(COPY.demoB, maxW, 6, SHEAR.lean));
  cutLine(page, COPY.demoA, x0, Y.demoLine, h1, C.douga, { seed: 15, skew: SHEAR.lean, cls: 'sh' });
  cutLine(page, COPY.demoB, x0, Y.demoLine + h1 + 10, h1, C.douga, { seed: 16, skew: SHEAR.lean, cls: 'sh' });
  // the legend, where the eye now knows what the strip is doing
  para(page, Zen, COPY.legendFull, L0, Y.legend, 20, 26, { fill: C.douga, cls: 'd sh', measure: x0 - L0 });
  para(page, Zen, COPY.legendPhone, L0, Y.legend + 10, 41, 48, { fill: C.douga, cls: 'm sh', measure: x0 - L0 });
  // one short stroke from the legend to what it explains
  const ya = Y.legend - 7, xa = STRIP + 5;
  page.polys([taper([[L0 - 7, ya], [xa + 10, ya]], { w: 3.4, prof: () => 1 }), [[xa, ya], [xa + 12, ya - 8], [xa + 12, ya + 8]]], `fill="${C.douga}"`, { cls: 'sh' });
  // WORKS ONCE: the punch, ink on acid, the widest thing in the sentence
  const a0 = Y.acid, a1 = Y.care;
  page.polys([[[-14, a0 + 43], [W + 14, a0 - 43], [W + 14, a1 + 43], [-14, a1 + 43]]], `fill="${C.toka}"`, { cls: 'sh' });
  const hP = Math.min(fitH(COPY.demoC, W - L0 - 28, 6, SHEAR.lean), a1 - a0 - 56);
  cutLine(page, COPY.demoC, L0, a0 + 68, hP, C.sumi, { seed: 17, skew: SHEAR.lean, cls: 'sh' });
}
