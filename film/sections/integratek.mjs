// c2. The June row: Integratek, on the row where its month starts, stacked the way the September row is: note, then cut name.
import { C, W, rng, redLine } from '../kit/draw.mjs';
import { cutLine, fitH, KERN } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { STRIP } from '../kit/strip.mjs';

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.jun, y1 = Y.afTop;
  const R = rng(404);
  page.polys([[[-14, y0], [W + 14, y0], [W + 14, y1 + 40], [-14, y1 + 40]]], `fill="${C.douga}"`);
  redLine(page, [STRIP + 2, y0 + 3], [W + 4, y0 + 3], R, 5);
  page.text(Hand, COPY.juneNote, L0, y0 + 42, { size: 32, fill: C.graphite, R, jit: 6, cls: 'd' });
  // the two jobs are the same height on the strip
  const h = fitH(COPY.ordfallTitle, 372, 6, SHEAR.lean), x = 640;
  cutLine(page, COPY.integratekTitle, L0, y0 + 54, h, C.sumi, { seed: 112, skew: SHEAR.lean, kern: KERN });
  page.text(Zen, COPY.integratekTarget, L0, y0 + 54 + h + 24, { size: 18, fill: C.blue, cls: 'd' });
  para(page, Zen, COPY.integratekRole, x, y0 + 34, 18.5, 25, { cls: 'd' });
  para(page, Zen, COPY.integratekPhone, x, y0 + 72, 41, 48, { cls: 'm' });
}
