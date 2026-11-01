// c7. Ordfall, the September row: the correction sheet, as loud as the street.
import { C, W, rng, taper, pencil, swell, clipHalf } from '../kit/draw.mjs';
import { cutLine, fitH } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { towerQuad, towerPencil } from '../kit/scene.mjs';
import { STRIP } from '../kit/strip.mjs';

const RAD = Math.PI / 180;

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.sep, y1 = Y.study;
  const R = rng(909);
  page.polys([[[-14, y0], [W + 14, y0], [W + 14, y1 + 30], [-14, y1 + 30]]], `fill="${C.douga}"`);
  // the September line, on its row: drawn here, painted after the sheet, so nothing covers it from the strip to the column's
  // edge. Its thin ends lie under the strip and past the edge, so it keeps its weight where it can be seen.
  const line = pencil([STRIP - 76, y0 + 3], [W + 76, y0 + 3], { w: 6, over: 6, R, restate: 0.7, wander: 0.8 });
  page.text(Hand, COPY.septNote, L0, y0 + 42, { size: 32, fill: C.graphite, R, jit: 6, cls: 'd' });
  // the acid sheet hangs flat from the row; its left edge runs on the slab's lean, measured off the logo
  const lean = Math.tan(9.3 * RAD), yt = y0 + 10;
  const sheet = [[482 - 10 * lean, y0], [W + 14, y0], [W + 14, y1 + 30], [482 + (y1 + 30 - yt) * lean, y1 + 30]];
  page.polys([sheet], `fill="${C.toka}"`);
  const qa = towerQuad([[520, y0 + 14], [1168, y0 + 14], [1190, y1 - 16], [560, y1 - 8]]);
  // the tower's overshoots stop at the line above them: they do not poke through into the vermilion field
  const below = { polys: (list, attrs, opt) => page.polys(list.map((p) => clipHalf(p, [0, y0 + 3], [W, y0 + 3])), attrs, opt) };
  towerPencil(below, qa, { R, w: 9, gap: 12.5, over: 26, restate: 0.3, hatchSlab: true });
  page.polys(line, `fill="${C.verm}"`, { cls: 'pl' });

  // A loop, tilted when what it circles is tilted.
  const loop = (cx, cy, rx, ry, tilt) => {
    const pts = [], n = 26, co = Math.cos(tilt * RAD), si = Math.sin(tilt * RAD);
    for (let i = 0; i <= n + 3; i++) {
      const a = (i / n) * Math.PI * 2 - 2.2, g = 1 + i * 0.004 + (R() - 0.5) * 0.016;
      const ex = Math.cos(a) * rx * g, ey = Math.sin(a) * ry * g;
      pts.push([cx + ex * co - ey * si, y0 + cy + ex * si + ey * co]);
    }
    page.polys([taper(pts, { w: 14, prof: swell })], `fill="${C.verm}"`, { cls: 'pl' });
  };
  // An arrow from a note to its loop: thin at the note, heaviest at the head. Shaft and head wind the same way, so their overlap stays filled.
  const arrow = (a, tip) => {
    const A = [a[0], y0 + a[1]], T = [tip[0], y0 + tip[1]];
    const dx = T[0] - A[0], dy = T[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const e = [T[0] - ux * 24, T[1] - uy * 24];
    page.polys([taper([A, e], { w: 11, prof: (t) => 0.35 + 0.65 * t, n: 1 }), [T, [e[0] + uy * 19 - ux * 8, e[1] - ux * 19 - uy * 8], [e[0] - uy * 19 - ux * 8, e[1] + ux * 19 - uy * 8]]], `fill="${C.verm}"`, { cls: 'pl' });
  };
  // The notes stack down the top right, and the loops run left to right along the block and up the slit. Each arrow
  // falls to its own loop in a fan: none crosses another, none passes through a loop that is not its own, none touches a note.
  loop(816, 236, 45, 118, -19); // the slit, a crack already: vulnerabilities
  loop(812, 492, 58, 62, 0); // the comb: dependencies
  loop(972, 517, 72, 50, 15); // along the beam: configurations
  loop(1128, 516, 58, 76, 0); // the block's end: code
  arrow([918, 54], [848, 169]);
  arrow([922, 110], [869, 451]);
  arrow([948, 198], [960, 454]);
  arrow([1096, 256], [1132, 432]);
  [0, 1, 3, 2].forEach((k, i) => { const note = COPY.review[k]; page.text(Hand, note, 1168 - page.measure(Hand, note, 50), y0 + 66 + i * 56, { size: 50, fill: C.sumi, R, jit: 6 }); });

  const hO = fitH(COPY.ordfallTitle, 372, 6, SHEAR.lean);
  cutLine(page, COPY.ordfallTitle, L0, y0 + 66, hO, C.sumi, { seed: 110, skew: SHEAR.lean });
  const yy = y0 + 66 + hO + 40;
  para(page, Zen, COPY.ordfallRole, L0, yy, 25, 32, { cls: 'd' });
  para(page, Zen, COPY.ordfallDatesLines, L0, yy + 72, 18, 24, { cls: 'd' });
  para(page, Zen, COPY.ordfallBody, L0, yy + 142, 21, 29, { cls: 'd' });
  page.text(Zen, COPY.ordfallTarget, L0, yy + 142 + 4 * 29 + 8, { size: 18, fill: C.blue, cls: 'd' });
  para(page, Zen, COPY.ordfallPhone, L0, yy + 22, 41, 48, { cls: 'm' });
}
