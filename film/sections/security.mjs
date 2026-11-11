// c2. Security: the correction sheet, as loud as the street. A reviewer's red pencil is the most thematic thing on the page.
// The one place the page names the company the work is done for: in the text, never as the title or a link.
import { C, W, rng, taper, swell, clipHalf, redLine } from '../kit/draw.mjs';
import { cutLine, fitH } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { towerQuad, towerPencil } from '../kit/scene.mjs';
import { STRIP } from '../kit/strip.mjs';

const RAD = Math.PI / 180;

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.security, y1 = Y.productions;
  const R = rng(909);
  for (let i = 0; i < 56; i++) R(); // the tower, the rings and the arrows keep the very lines they were drawn with
  // the acid sheet hangs flat from the row; its left edge runs on the slab's lean, measured off the logo, and on down into the
  // next tile until the blue field there cuts it on the beam's angle
  const lean = Math.tan(9.3 * RAD), yt = y0 + 10, yEnd = y1 + 340;
  const sheet = [[482 - 10 * lean, y0], [W + 14, y0], [W + 14, yEnd], [482 + (yEnd - yt) * lean, yEnd]];
  page.polys([sheet], `fill="${C.toka}"`);
  const qa = towerQuad([[520, y0 + 14], [1168, y0 + 14], [1190, y1 - 16], [560, y1 - 8]]);
  // the tower's overshoots stop at the line above them: they do not poke through into the vermilion field
  const below = { polys: (list, attrs, opt) => page.polys(list.map((p) => clipHalf(p, [0, y0 + 3], [W, y0 + 3])), attrs, opt) };
  towerPencil(below, qa, { R, w: 9, gap: 12.5, over: 26, restate: 0.3, hatchSlab: true });
  // the red line on the top edge, painted after the sheet so nothing covers it. It is the stroke that has always stood at the
  // foot of the hold, from its own generator: its top edge shows in the tile above, and that tile does not move by a pixel.
  redLine(page, [STRIP + 2, y0 + 3], [W + 4, y0 + 3], rng(404), 5);

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

  const hO = fitH(COPY.securityTitle, 372, 6, SHEAR.lean);
  cutLine(page, COPY.securityTitle, L0, y0 + 66, hO, C.sumi, { seed: 110, skew: SHEAR.lean });
  const yy = y0 + 66 + hO + 44;
  para(page, Zen, COPY.securityRole, L0, yy, 30, 36, { cls: 'd' });
  para(page, Zen, COPY.securityBody, L0, yy + (COPY.securityRole.length - 1) * 36 + 52, 21, 29, { cls: 'd' });
  para(page, Zen, COPY.securityPhone, L0, yy + 12, 41, 48, { cls: 'm' });
}
