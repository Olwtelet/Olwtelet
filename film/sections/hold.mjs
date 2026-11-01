// c1. The hold: the long silence. The tower is still there, in pencil. The peg holes are in the base paper (layout.mjs).
import { C, rng, pencil, ring } from '../kit/draw.mjs';
import { para } from '../kit/type.mjs';
import { towerQuad, towerPencil } from '../kit/scene.mjs';

export function draw(page, ctx) {
  const { Y, COPY, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.hitsEnd, y1 = Y.jun;
  const R = rng(202);
  const h = 200, x = 880, yb = y1 - 104;
  para(page, Zen, COPY.withAI, L0, y0 + 96, 41, 50, { measure: x - L0 });
  const q = towerQuad([[x, yb - h - 4], [x + h * 0.8, yb - h + 2], [x + h * 0.8, yb - 2], [x, yb + 8]]);
  towerPencil(page, q, { R, w: 3.8, gap: 6, over: 9, hatchSlab: true });
  page.polys(pencil([x - 46, yb + 10], [x + h * 0.8 + 90, yb - 2], { w: 4.6, over: 10, R, restate: 1, wander: 1 }), `fill="${C.graphite}"`, { cls: 'pl' });
  ring(page, x + h * 0.8 + 56, yb - h + 34, 44, 38, C.verm, R, 6.5);
  page.text(Hand, COPY.ok, x + h * 0.8 + 36, yb - h + 50, { size: 50, fill: C.verm, R });
}
