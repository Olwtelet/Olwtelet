// c3. Olwtelet Productions: the notice is the stage. COMING SOON are the only big letters on the page not painted yet, in the film's
// own unfinished state, and the one finished cel on the sheet stands on them. Everything about its run comes from kit/route.mjs.
import { C, W, rng, taper, pencil, hatch, swell, centroid } from '../kit/draw.mjs';
import { cutLine, noteCut } from '../kit/letters.mjs';
import { slab, blade, top, side, foot, towerFlat, towerPencil } from '../kit/scene.mjs';
import { TIERS, HOPS, GHOSTS, REST, standing } from '../kit/route.mjs';

const HATCH_ANGLE = -58;
const STOPPED_AT = 0.4; // how far across the last letter the colouring got
const ARC_ENDS_AT = 0.8;

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, ANG, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.productions, y1 = Y.diseens;
  const R = rng(1101);
  const on = (p) => [p[0], y0 + p[1]];
  // the blue comes in on the beam's angle and cuts the acid sheet that hangs from the row above
  const edge = (x) => y0 - 190 + x * ANG.beam;
  page.polys([[[-14, edge(-14)], [W + 14, edge(W + 14)], [W + 14, y1 + 60], [-14, y1 + 60]]], `fill="${C.blue}"`);

  // the company, cut in paper under the diagonal
  const hT = 59;
  COPY.productionsTitle.forEach((l, i) => cutLine(page, l, L0, y0 + 24 + i * (hT + 8), hT, C.douga, { seed: 151 + i, skew: SHEAR.lean }));
  page.text(Zen, COPY.productionsLead, L0, y0 + 24 + 2 * hT + 8 + 36, { size: 27, fill: C.douga, cls: 'd' });
  page.text(Zen, COPY.productionsLead, L0, y0 + 24 + 2 * hT + 8 + 46, { size: 41, fill: C.douga, cls: 'm' });

  // the stage: hatch, then the counters painted back, then the outline traced ring by ring
  const strokes = [], counters = [], lines = [];
  const th = (HATCH_ANGLE * Math.PI) / 180, nx = -Math.sin(th), ny = Math.cos(th), across = (p) => p[0] * nx + p[1] * ny;
  TIERS.forEach((t, ti) => {
    const insts = t.glyphs.filter((g) => g.o.length).map((g) => [g.o, ...g.h].map((r) => r.map((p) => on(t.map(p)))));
    noteCut(page, t.text, insts, t.h, { xs: t.xs });
    insts.forEach((rs, gi) => {
      let list = hatch(rs[0], { angle: HATCH_ANGLE, gap: 11.5, w: 9, R, jitter: 0.35, miss: 0.07, over: 4, doubleBack: 0.2 });
      if (ti === TIERS.length - 1 && gi === insts.length - 1) {
        // the colouring stops part of the way across the last letter, on its own stroke
        const ss = rs[0].map(across), lo = Math.min(...ss), hi = Math.max(...ss), stop = lo + (hi - lo) * STOPPED_AT;
        list = list.filter((q) => across(centroid(q)) < stop);
      }
      strokes.push(...list);
      counters.push(...rs.slice(1));
      for (const r of rs) r.forEach((p, k) => lines.push(...pencil(p, r[(k + 1) % r.length], { w: 7, over: 8, R, restate: 0.55, wander: 1 })));
    });
  });
  page.polys(strokes, `fill="${C.toka}"`);
  page.polys(counters, `fill="${C.blue}"`);
  page.polys(lines, `fill="${C.toka}"`, { cls: 'pl' });

  // the route, charted the way an animator charts a bouncing ball: the arc, and a tick where each drawing would fall
  const arcs = [];
  HOPS.forEach((h, hi) => {
    const end = hi === HOPS.length - 1 ? ARC_ENDS_AT : 1; // the last arc stops at the head of the tower standing where it lands
    const pts = []; for (let k = 0; k <= 16; k++) pts.push(on(h.at((end * k) / 16)));
    arcs.push(taper(pts, { w: 4.4, prof: swell, wob: 0.5, R }));
    for (let k = 1; k < 6 && k / 6 < end; k++) {
      const a = on(h.at(k / 6 - 0.01)), b = on(h.at(k / 6 + 0.01)), c = on(h.at(k / 6)), l = Math.hypot(b[0] - a[0], b[1] - a[1]), tx = -(b[1] - a[1]) / l * 10, ty = (b[0] - a[0]) / l * 10;
      arcs.push(taper([[c[0] - tx, c[1] - ty], [c[0] + tx, c[1] + ty]], { w: 3.2, prof: swell, R }));
    }
  });
  page.polys(arcs, `fill="${C.douga}"`, { cls: 'pl' });
  for (const g of GHOSTS) towerPencil(page, standing(on(g)), { R, w: 2.6, col: C.douga, over: 5, restate: 0.1, noHatch: true, polys: [slab, blade, top, side, foot] });

  // above the last drop, in the blue that the drop leaves empty, right of where the tower's head passes on its way off the G
  COPY.noteNoGame.forEach((l, i) => page.text(Hand, l, 1168 - page.measure(Hand, l, 46), on(TIERS[0].map([0, 0]))[1] - 80 + i * 48, { size: 46, fill: C.douga, R, jit: 6 }));

  // the one finished thing on the set, standing on the last letter. It has no blue plane: blue would vanish on the field.
  towerFlat(page, standing(on(REST)), { fill: C.sumi, cls: 'hop', planes: { blade: C.douga, top: C.douga, side: C.toka, foot: C.toka } });
}
