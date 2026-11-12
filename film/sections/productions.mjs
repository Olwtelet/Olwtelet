// c3. Olwtelet Productions: the studio's card. A lemon credit card printed in four inks and a halftone: the studio's name set
// wide at the cards' angle, its first line knocked out of a black slab over a pink plate off register; the words COMING SOON
// as a game level for Veil, in clean black; behind SOON a cut-in of light teal printed with a coarse dark teal dot screen;
// the tower just landed on the last letter with a train of flat afterimages stepping back up its run from blue to green, the
// newest overlapping like contour bands and the oldest flat shapes that fade into the lemon; the letter lit pink with a flat
// burst of spikes (a cyan plate off register under them) when it lands; a teal band falling across the foot of the card that
// knocks out the letters it crosses and carries the lead. A looping tile, so everything is flat: the screen is dotted strokes
// cut to its wedge at build time, no pattern, no clip, no translucency, and few dots (the whole tile repaints with the loop,
// and every dot costs idle CPU). Where the run goes comes from kit/route.mjs.
import { C, rng, clipHalf, partsOfClip, lineSpans, line, framed, dist } from '../kit/draw.mjs';
import { capOf } from '../kit/type.mjs';
import { ringsOf, noteCut } from '../kit/letters.mjs';
import { towerFlat, slab, blade, beam, top, side, foot } from '../kit/scene.mjs';
import { TIERS, HOPS, GHOSTS, REST, standing } from '../kit/route.mjs';
import { plate, dots } from '../kit/print.mjs';
import { inside, hull } from '../kit/light.mjs';

const TURN = -12; // the cards' angle for the studio's name
const LIT = 0.6; // how much of the last letter the landing lights (the first 0.4 across is already black)
const BAND_AT = [400, 790], BAND_H = 168; // a point on the band's top edge (c3 units) and its height down the page
const BAND = C.teal; // the band's ink
// the cut-in behind SOON: a wedge of light teal printed with a dark teal dot screen, between the band's top edge and a
// shallower edge above it. CUT: where its top edge starts (just under COMING's feet) and its drop across the card; LEFT: where
// its left side meets the band, the side leaning with the letters, a little left of SOON's S (so lemon shows between the band
// and COMING's first letters). DOTS: the screen's dot diameters on desktop (the phone's are 1.5 times these), small near the
// band and growing up the wedge; NN the pitch between nearest dots (16u desktop, 24u phone). The screen is coarse on purpose:
// this tile loops, the whole tile repaints with it, and an 8u screen here (about 2,900 dots) cost two points of idle CPU
const CUT = [250, 646, 0.11], LEFT = 330;
const DOTS = [4.4, 6.8, 9.2, 11.6, 14], NN = 16;

// the afterimage train, oldest first: where each copy stands along the run (a share of its length: the newest three half a
// copy apart, so each covers half the one behind it, as contour bands do), and its inks [line, shadow, light], stepping
// green, teal, cyan, azure, blue toward the tower. A copy loses detail with age. The newest is two-tone: the tower's
// silhouette in the light tone, its two shaded planes (side and foot) in the shadow tone, a thin line round it in the
// darkest. The next two are one flat tone with a line round the outside only (shadow null). The two oldest are one flat tone
// with no line (line and shadow null), so the ramp fades into the lemon instead of ending in drawn edges
const TRAIN = [
  [0, null, null, C.aTealL],
  [0.33, null, null, C.aTeal],
  [0.62, C.teal, null, C.prog],
  [0.81, C.azure, null, C.aBlueL],
  [1, C.aBlue, C.aBlue, C.cyan],
];

// points along a hop from t0 to t1
const along = (h, t0, t1, n = 12) => Array.from({ length: n + 1 }, (_, k) => h.at(t0 + ((t1 - t0) * k) / n));
// the point at arc length s along a polyline
const atLen = (pts, s) => {
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (s <= d) { const k = d ? s / d : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
    s -= d;
  }
  return pts[pts.length - 1];
};
const lengthOf = (pts) => pts.slice(1).reduce((s, p, i) => s + dist(pts[i], p), 0);

export function draw(page, ctx) {
  const { Y, COPY, faces, ANG } = ctx;
  const y0 = Y.productions, y1 = Y.diseens;
  const at = ([x, y]) => [x, y0 + y];
  const rad = (TURN * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
  const down = ([x, y], d) => [x - si * d, y + co * d]; // d units down the turned frame
  const turned = (o) => ([u, v]) => [o[0] + u * co - v * si, o[1] + u * si + v * co];
  const R = rng(1303);

  // the card: one flat lemon field, a hard cut at the top seam
  page.polys([[[-14, y0], [1214, y0], [1214, y1 + 14], [-14, y1 + 14]]], `fill="${C.lemon}"`, { before: y1 });

  // a black tag of small print: lemon lines on a slab turned to the name's angle, (x, y) the first baseline's start
  const tag = (lines, x, y, sz, cls) => {
    const lh = sz * 1.17, c = capOf(faces.label, sz), pad = sz * 0.42, w = Math.max(...lines.map((l) => page.measure(faces.label, l, sz)));
    const T = turned([x, y]);
    page.polys([[[-pad, -c - pad], [w + pad, -c - pad], [w + pad, lh * (lines.length - 1) + pad * 1.25], [-pad, lh * (lines.length - 1) + pad * 1.25]].map(T)], `fill="${C.black}"`, { cls });
    lines.forEach((l, i) => { const p = T([0, i * lh]); page.text(faces.label, l, p[0], p[1], { size: sz, rot: TURN, fill: C.lemon, cls }); });
  };

  // the studio's name, wide at the cards' angle, two lines a cap and a little apart: the first knocked out of a black slab
  // that comes in from under the strip, its pink plate printed off register; the second black on the field
  const size = 92, cap = capOf(faces.wide, size), lead = cap + 22;
  const l1 = at([96, 213]), l2 = down(l1, lead);
  const [n1, n2] = COPY.productionsTitle.map((s) => s.toUpperCase());
  const w1 = page.measure(faces.wide, n1, size), padT = 22;
  const bar = [[-260, -cap - padT], [w1 + padT * 1.6, -cap - padT], [w1 + padT * 1.6, 7], [-260, 7]].map(turned(l1));
  plate(page, [bar], C.pink, 10, -8, { from: y0 });
  page.polys([bar], `fill="${C.black}"`, { from: y0 });
  page.text(faces.wide, n1, l1[0], l1[1], { size, rot: TURN, fill: C.lemon, from: y0 });
  page.text(faces.wide, n2, l2[0], l2[1], { size, rot: TURN, fill: C.black, from: y0 });
  // a teal band falling right at the beam's angle across the foot of the card: in from under the strip below COMING's first
  // letters, through the feet of SOON's S and first O (which it knocks out in lemon), and off the bottom edge before the second
  // O. Its pink plate shows as a sliver along its top edge. The lead rides it, lemon, left of the S.
  const ft = ANG.beam, top0 = BAND_AT[1] - BAND_AT[0] * ft, edge = (x, d = 0) => [x, top0 + x * ft + d];
  const out = (d) => (984 - top0 - d) / ft; // where an edge d under the top one leaves the tile's foot
  const band = [edge(-14), [out(0), 984], [out(BAND_H), 984], edge(-14, BAND_H)].map(at);
  // the cut-in behind SOON: the light teal wedge, its foot tucked under the band, then its dark teal screen in rows along the
  // band (rows half a step apart up the wedge, a dot every step along a row, every other row shifted half a step: a 45-degree
  // screen to the rows). The dots grow up the wedge, away from the band; every dot is whole inside the wedge. Each row is one
  // dotted stroke (SOON is printed over it, its counters open), each size one path per composition.
  const th = Math.atan(ft), ux = Math.cos(th), uy = Math.sin(th);
  const topAt = (x) => CUT[1] + (x - CUT[0]) * CUT[2], lx = (y) => LEFT + (edge(LEFT)[1] - y) * 0.164;
  const wedge = [[lx(topAt(LEFT)), topAt(lx(topAt(LEFT)))], [1214, topAt(1214)], [1214, 984], edge(out(0) + 12, 6), edge(LEFT, 6), edge(LEFT)];
  page.polys([wedge.map(at)], `fill="${C.tealLt}"`, { before: y1 });
  const P = (s, c) => [ux * s + uy * c, top0 + uy * s - ux * c]; // s along the band's top edge from x 0, c up from it
  [['d', 1], ['m', 1.5]].forEach(([cls, k]) => {
    const g = NN * k * Math.SQRT2, h = g / 2, runs = DOTS.map(() => []);
    for (let j = 1; j < 80; j++) {
      const c = j * h, ph = j % 2 ? h : 0, b = Math.min(DOTS.length - 1, Math.floor((c / 230) * DOTS.length)), r = (DOTS[b] * k) / 2 + 1;
      const keep = (q) => [[r, 0], [-r, 0], [0, r], [0, -r]].every(([e, f]) => inside(wedge, [q[0] + e, q[1] + f]));
      const kept = [];
      for (const [ta, tb] of lineSpans(P(0, c), P(1, c), wedge)) for (let s = ph + Math.ceil((ta - ph) / g) * g; s <= tb; s += g) if (keep(P(s, c))) kept.push(s);
      if (kept.length) runs[b].push([P(kept[0], c), P(kept[kept.length - 1] + 0.1, c)].map(at));
    }
    runs.forEach((ls, b) => ls.length && dots(page, ls, C.tealDk, { w: DOTS[b] * k, gap: g, cls, before: y1 }));
  });
  plate(page, [band], C.pink, 10, -18, { before: y1 });
  page.polys([band], `fill="${BAND}"`, { before: y1 });
  const fall = (Math.atan(ft) * 180) / Math.PI;
  const rideLead = (sz, maxW, x, cls) => {
    const lines = page.wrap(faces.label, COPY.productionsLead, sz, maxW), lh = sz * 1.17, c = capOf(faces.label, sz);
    const cs = Math.cos(Math.atan(ft)), h = c + lh * (lines.length - 1), v0 = (BAND_H * cs - h) / 2 + c; // centred across the band
    // every line starts at x, straight down the band from the last (so none slips under the strip)
    lines.forEach((l, i) => { const o = edge(x, (v0 + i * lh) / cs); page.text(faces.label, l, o[0], y0 + o[1], { size: sz, rot: fall, fill: C.lemon, cls }); });
  };
  rideLead(30, 280, 100, 'd');
  rideLead(41, 280, 100, 'm');

  // the stage: COMING SOON in the condensed cut, black and clean (display type never carries a plate or a copy of itself), its
  // counters open (they show what lies under them); SOON's feet are knocked out by the band
  const last = [];
  const A = edge(0), B = edge(100), inBand = (r) => partsOfClip(clipHalf(r, A, B), A, B).filter((q) => q.length > 2);
  TIERS.forEach((t, ti) => {
    const live = t.glyphs.filter((g) => g.o.length);
    const insts = live.map((g) => ringsOf(g).map((r) => r.map((p) => at(t.map(p)))));
    noteCut(page, t.text, insts, t.h, { xs: t.xs, face: t.face });
    if (ti === 0) { page.rings(insts, `fill="${C.black}"`); return; }
    live.forEach((g, gi) => {
      if (gi === live.length - 1) { last.push(g, t); return; }
      page.rings([insts[gi]], `fill="${C.black}"`);
      // where the band crosses a letter, the letter is lemon and its counter the band's teal: cut at build time, no clip
      const lit = [g.o, ...(g.e || [])].map((r) => r.map(t.map)).flatMap(inBand), dark = g.h.map((r) => r.map(t.map)).flatMap(inBand);
      if (lit.length) page.polys(lit.map((r) => r.map(at)), `fill="${C.lemon}"`);
      if (dark.length) page.polys(dark.map((r) => r.map(at)), `fill="${BAND}"`);
    });
  });

  // the last letter: black for its first 0.4 across, the rest pink, lit by the landing (lnd), and its outline always there
  const [g, t] = last, xs = g.o.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), xc = x0 + (x1 - x0) * (1 - LIT);
  const map = (r) => r.map((p) => at(t.map(p)));
  const left = partsOfClip(clipHalf(g.o, [xc, 0], [xc, 140]), [xc, 0], [xc, 140]);
  const right = partsOfClip(clipHalf(g.o, [xc, 140], [xc, 0]), [xc, 140], [xc, 0]);
  page.polys(left.map(map), `fill="${C.black}"`);
  page.polys(right.map(map), `fill="${C.pink}"`, { cls: 'lnd' });
  page.polys([map(g.o)], line(C.black, 6));

  // the afterimage train: five flat copies of the tower standing along the run, from the second ghost (the top of the third
  // hop) over the G and down the drop, oldest first so every newer copy covers the one behind it. The two oldest stand apart
  // on the level, the newest three bunch up half a copy apart down the drop, so each shows only a band of the one behind it.
  // Each copy leans along its line of motion (none on the level, most at 45 degrees) and stretches as it falls, so no two
  // copies' edges run parallel and the train never reads as one solid pushed out. A lined copy is a wide line in its darkest
  // tone under its planes (its outline), then its silhouette in the light tone and its side and foot in the shadow tone; an
  // old copy is its whole silhouette in one tone. The beam is its hull (the comb is too fine for a copy). In front of the
  // letters, behind the tower.
  const run = [GHOSTS[1], ...along(HOPS[2], 0.55, 1), ...along(HOPS[3], 0, 0.8).slice(1)];
  const L = lengthOf(run), lit = [slab, blade, hull(beam), top], shade = [side, foot];
  TRAIN.forEach(([k, ink, dark, light]) => {
    const f = atLen(run, L * k), n = atLen(run, Math.min(L, L * k + 6)), p0 = atLen(run, Math.max(0, L * k - 6));
    const v = [n[0] - p0[0], n[1] - p0[1]], lean = (-0.6 * v[0] * v[1]) / (v[0] * v[0] + v[1] * v[1]);
    const cs = Math.cos(lean), sn = Math.sin(lean), sx = 1 - 0.12 * k * k, sy = 1 + 0.18 * k * k, st = standing(f);
    const Q = (p) => { const q = st(p), x = (q[0] - f[0]) * sx, y = (q[1] - f[1]) * sy; return at([f[0] + x * cs - y * sn, f[1] + x * sn + y * cs]); };
    // the line (or, with none, a hairline in the light tone that closes the logo's gaps between its planes) under the planes
    const all = [...lit, ...shade].map((p) => p.map(Q));
    if (ink) page.polys(all, framed(ink, ink, dark ? 5 : 6));
    if (!dark) { page.polys(all, framed(light, light, 2)); return; }
    page.polys(lit.map((p) => p.map(Q)), `fill="${light}"`);
    page.polys(shade.map((p) => p.map(Q)), `fill="${dark}"`);
  });

  // the landing: hard pink spikes thrown out flat from the tower's feet along the letter's top, a cyan plate off register under
  // them (the torn pink masses' second plate on the cards), lit with the letter (lnd), so they come on with the landing and go
  // dark when the tower leaves
  const spikes = [];
  [[-178, 200, 15], [-169, 128, 12], [-15, 150, 13], [-4, 224, 16], [7, 116, 11]].forEach(([deg, len, b]) => {
    const a = ((deg + (R() - 0.5) * 4) * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a) * 0.5, r0 = 44;
    const c = [REST[0] + ux * r0, REST[1] - 4 + uy * r0];
    spikes.push([[c[0] - uy * b, c[1] + ux * b], [c[0] + ux * len, c[1] + uy * len], [c[0] + uy * b, c[1] - ux * b]].map(at));
  });
  plate(page, spikes, C.cyan, -7, 6, { cls: 'lnd' });
  page.polys(spikes, `fill="${C.pink}"`, { cls: 'lnd' });

  // the note: a black tag above the last drop and right of it, where the hop passes on its left
  tag(COPY.noteGame, 1024, y0 + 274, 34, 'd');
  tag(COPY.noteGame, 998, y0 + 280, 41, 'm');

  // the tower at REST, the one thing that moves: printed flat, a pink plate off register under it
  const Q = (p) => at(standing(REST)(p));
  plate(page, [slab, blade, beam, top, side, foot].map((p) => p.map(Q)), C.pink, 5, 4, { cls: 'hop' });
  towerFlat(page, Q, { fill: C.black, planes: { blade: C.teal, top: C.teal, side: C.indigo, foot: C.indigo }, slitFill: C.pink, cls: 'hop' });
}
