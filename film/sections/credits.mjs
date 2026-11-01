// d0 to d5. The credits: names forced to one measure, on black, rising on the set's roll like everything else on the street.
// Every course links to a different site, so a name stays inside its own tile. One WALL entry is one course; layout.mjs flows the rest.
import { C, W, rng, bboxOf, wallRoll, WALL_END } from '../kit/draw.mjs';
import { word, noteCut, cutWidth, KERN } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';

const FORCE_CAP = 1.75;
const ROLL = -4.01;
const COS = Math.cos((ROLL * Math.PI) / 180);
const ACCENT = -8; // above this line of a cut letter there is only an accent, and an accent may stand over the seam
const CLEAR = 2; // what a name's high end leaves under its seam

// A course of the wall: the name's cut letters, kerned, and forced back out to the measure the layout gave it.
// It hangs from its own seam, its high end just under it, and says where it landed.
function course(page, r, x) {
  const cutName = (kern) => word(r.name, rng(300 + r.name.length), { amt: 1.2, track: 6, kern });
  let wd = cutName(KERN), xs = r.xs * cutWidth(r.name, 140) / wd.width;
  if (xs > FORCE_CAP) { wd = cutName({}); xs = r.xs; } // the measure outranks the kerning: a short name at the cap keeps its spacing
  const s = r.letter / 140;
  const lay = (p) => { const X = x + p[0] * s * xs; return [X, p[1] * s + wallRoll(X, x)]; };
  const body = wd.glyphs.flatMap((g) => g.o.filter((p) => p[1] > ACCENT).map(lay));
  const y = r.y + CLEAR - Math.min(...body.map((p) => p[1]));
  const map = (p) => { const q = lay(p); return [q[0], y + q[1]]; };
  const insts = wd.glyphs.filter((g) => g.o.length).map((g) => [g.o, ...g.h].map((ring) => ring.map(map)));
  noteCut(page, r.name, insts, r.letter, { xs, tile: r.tile, box: bboxOf(body.map((p) => [p[0], y + p[1]])) });
  page.rings(insts, `fill="${C.douga}"`);
  return y;
}

export function draw(page, ctx) {
  const { Y, COPY, L0, faces, courses } = ctx;
  const { gothic: Zen } = faces;
  const y0 = Y.credits, y1 = Y.lights;
  page.polys([[[-14, y0], [W + 14, y0], [W + 14, y1 + 40], [-14, y1 + 40]]], `fill="${C.sumi}"`);
  const low = wallRoll(L0, L0); // how far the wall's left end drops
  page.text(Zen, COPY.wallLead, L0, y0 + 60 + low, { size: 25, fill: C.douga, cls: 'd', rot: ROLL });
  const pl = page.wrap(Zen, COPY.wallLead, 41, W - L0 - 28);
  para(page, Zen, pl, L0, y0 + 70 + low, 41, 46, { fill: C.douga, cls: 'm', rot: ROLL });
  courses.forEach((r) => {
    const h = r.letter, y = course(page, r, L0);
    // a caption sits against its own name, and twice as far from the next one. It stands under the name's high end: only
    // there does the course leave room above the seam, so it opens the same site as the name.
    const caption = (cap, size, drop, cls) => { const x = WALL_END - page.measure(Zen, cap, size) * COS; page.text(Zen, cap, x, y + h + drop + wallRoll(x, L0), { size, fill: C.douga, cls, rot: ROLL }); };
    caption(r.cap, 19, 25, 'd');
    caption(r.capPhone ?? r.cap, 41, 41, 'm');
  });
}
