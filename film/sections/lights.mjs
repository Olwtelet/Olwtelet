// z1 to z3. The end: the same tower from the same street as the opening, with its lights off. Only the slit is still lit.
import { C, W, taper, swell, bboxOf, WALL_END, wallRoll } from '../kit/draw.mjs';
import { cutLine, cutWidth } from '../kit/letters.mjs';
import { slab, blade, beam, top, side, foot, slit, T } from '../kit/scene.mjs';

const TOWER_X = 816; // the slab's far corner, clear of the foot of EMAIL's L
const TOWER_K = 0.42; // the set's drawing, drawn taller: it fills the dark between the wall and the links and crosses neither
const PRINT_DROP = 38; // baseline of the address under EMAIL

// The tower's rims. A run of nearly straight edges is one stroke with one swell, and where two planes share an edge
// only one of them draws it, so nothing doubles up into a blur at this size.
const RIMS = [
  [slab[0], slab[1]], [slab[1], slab[2], slab[3]], [slab[3], slab[4]], [slab[4], slab[0]],
  [blade[0], blade[1], blade[2]], [blade[3], blade[4], blade[0]],
  [beam[15], beam[0], beam[1]], [beam[1], beam[2]], [beam[2], beam[3]],
  [top[0], top[1]], [top[1], top[2]], [top[2], top[0]],
  [side[0], side[1]], [side[1], side[2]], [side[2], side[3]],
  [foot[0], foot[1]], [foot[1], foot[2]], [foot[3], foot[0]],
];
// The comb's three teeth are too fine to outline at this size: they are solid, the one dense thing in the drawing.
const TEETH = [beam.slice(3, 7), beam.slice(7, 11), beam.slice(11, 15)];
// The slit's centre line, from its top down to the beam.
const SLIT_RUN = [[(slit[0][0] + slit[6][0]) / 2, (slit[0][1] + slit[6][1]) / 2], [(slit[1][0] + slit[5][0]) / 2, (slit[1][1] + slit[5][1]) / 2], [(slit[2][0] + slit[3][0]) / 2, (slit[2][1] + slit[3][1]) / 2]];

// The phone rule in every tile's style widens a .pl stroke, and on desktop this one stays at nothing, so the rims and the
// slit hold up at 293. Rings, because they carry this stroke as written whatever the kit does with its own pencil polys.
const lit = (col) => `fill="${col}"` + ' ' + `stroke="${col}" stroke-width="0"`;

export function draw(page, ctx) {
  const { Y, SHEAR, L0, faces, lightRows } = ctx;
  const { gothic: Zen } = faces;
  const y0 = Y.lights, y1 = Y.end;
  page.polys([[[-14, y0 - 4], [W + 14, y0 - 4], [W + 14, y1 + 14], [-14, y1 + 14]]], `fill="${C.sumi}"`);

  // the slab's far corner stands on the line EMAIL stands on
  const first = lightRows[0];
  const emailFoot = first.y + first.letterY + first.letter;
  const b = bboxOf([slab, blade, beam, top, side, foot].flat().map(T));
  const kx = (WALL_END - TOWER_X) / (b[2] - b[0]), corner = T(slab[4]);
  const Q = (p) => { const q = T(p); return [TOWER_X + (q[0] - b[0]) * kx, emailFoot + (q[1] - corner[1]) * TOWER_K]; };
  page.rings(RIMS.map((run) => [taper(run.map(Q), { w: 3, prof: swell })]), lit(C.douga), { cls: 'pl' });
  page.polys(TEETH.map((tooth) => tooth.map(Q)), `fill="${C.douga}"`);
  page.rings([[taper(SLIT_RUN.map(Q), { w: 5.5, prof: () => 1 })]], lit(C.toka), { cls: 'pl' });

  lightRows.forEach((row, ri) => {
    let x = 0;
    row.tiles.forEach((t, ti) => {
      const w = W * t.share, left = x === 0 ? L0 : 18;
      const yy = row.y + row.letterY, h = row.letter;
      // the link rows are the wall's last course: one height, each word forced to its column
      const end = ti === row.tiles.length - 1 ? WALL_END : x + w - 18;
      const xs = row.tiles.length > 1 ? (end - x - left) / cutWidth(t.word, h) : 1;
      const onRoll = row.tiles.length > 1 ? { skew: SHEAR.roll, rot: -4.01 } : {};
      cutLine(page, t.word, x + left, yy + (row.tiles.length > 1 ? wallRoll(x + left, L0) : 0), h, t.fg, { seed: 200 + ri * 7 + t.word.length, xs, tile: t.name, ...onRoll });
      if (t.print) page.text(Zen, t.print, x + left, yy + h + PRINT_DROP, { size: 29, fill: t.fg, cls: 'd' });
      if (t.printPhone) page.text(Zen, t.printPhone, x + left, yy + h + 48, { size: 41, fill: t.fg, cls: 'm' });
      x += w;
    });
  });
}
