// d0 to d4. The end credits printed as the opening's cards, run as a wall: a label card, then one card a course, each on its
// own flat fields (indigo; lemon and indigo; lemon; teal; lemon), cut from the next along the roll. Every name is forced to the
// wall's measure in cut letters and rises on the roll; each card carries the opening's print: a slab, a slash or a climb at a
// hard diagonal, the name switching colour where it crosses it (knocked out), a second plate off register in pink along the
// slab, a dot screen cut in. Every course is its own link, so a name and its caption stay inside their own tile; one WALL entry
// is one course, and layout.mjs flows the rest. Fields and slabs cross the seams between courses (each is drawn in both tiles);
// names, captions and screens do not.
import { C, ANG, WALL_END, line, clipHalf, clipConvex, polyArea, bboxOf } from '../kit/draw.mjs';
import { word, ringsOf, noteCut } from '../kit/letters.mjs';
import { screenPolys, plate, offset } from '../kit/print.mjs';
import { STRIP, STRIP_H } from '../kit/strip.mjs';

const T = ANG.roll, ROLL = -Math.atan(T) * 180 / Math.PI; // the roll every line rises on
const CO = Math.cos(ROLL * Math.PI / 180), SI = Math.sin(ROLL * Math.PI / 180);
const CLEAR = 3; // what a name's highest point leaves under its own seam
const TOL = 0.45; // the cut letters' chords stand at most 0.45u off their curves (fit)
const DROP = 26, PHONE_DROP = 40; // a caption's baseline under the name's (desktop, phone)
const X0 = -14, X1 = 1214; // fields run past the page's edges
const OUTLINE = 6, PHONE_OUTLINE = 11;
// d4's ground climbs from x CLIMB[0] on the ground line to x CLIMB[1] at the card's top edge
const CLIMB = [600, 900];
// d0's screen: a triangle off the top and left edges, its diagonal from x WEDGE[0] on the top edge to WEDGE[1] down the left
const WEDGE = [560, 138];
const DATE = 234; // the strip's end date runs this long under its last row
const BEAM = 2.4; // d1's screen: its far side runs this far right for each unit up

// A closed ring refitted for a page written in whole units. Its corners and straight edges are kept; along its curves a vertex
// is a point of the curve within LAT of a whole-unit point, and each chord runs as far as the curve stays within TOL of it.
// Rounded when written, the vertices still sit on the curve, so a bowl reads smooth at 2x: rounding the dense outline made it
// lumpy, thinning it made it faceted. Where no such point lies within reach, the nearest one to a whole unit is taken.
const LAT = 0.22, STEP = 0.2, CORNER = 0.6, FLAT = 9, REACH = 16, NEAR = 20; // CORNER in radians; FLAT: an edge this long is straight
function fit(ring) {
  const n = ring.length, R = (p) => [Math.round(p[0]), Math.round(p[1])];
  const off = (p) => Math.hypot(p[0] - Math.round(p[0]), p[1] - Math.round(p[1]));
  const turn = (i) => {
    const a = ring[(i + n - 1) % n], p = ring[i], b = ring[(i + 1) % n];
    const t = Math.atan2(b[1] - p[1], b[0] - p[0]) - Math.atan2(p[1] - a[1], p[0] - a[0]);
    return Math.abs(Math.atan2(Math.sin(t), Math.cos(t)));
  };
  const long = (i) => { const p = ring[i], q = ring[(i + 1) % n]; return Math.hypot(q[0] - p[0], q[1] - p[1]) > FLAT; };
  const must = (i) => turn(i) > CORNER || long(i) || long((i + n - 1) % n); // a corner, or an end of a straight edge
  let first = 0;
  for (let i = 0; i < n; i++) if (must(i)) { first = i; break; }
  const D = []; // samples along the ring from a kept vertex, every STEP along a curve; c: a vertex it must keep
  for (let k = 0; k < n; k++) {
    const i = (first + k) % n, p = ring[i], q = ring[(i + 1) % n], m = Math.max(1, Math.floor(Math.hypot(q[0] - p[0], q[1] - p[1]) / STEP));
    D.push({ p, c: k === 0 || must(i) });
    if (!long(i)) for (let j = 1; j < m; j++) D.push({ p: [p[0] + ((q[0] - p[0]) * j) / m, p[1] + ((q[1] - p[1]) * j) / m], c: false });
  }
  D.push({ p: D[0].p, c: true });
  const out = [R(D[0].p)];
  for (let s = 0; s < D.length - 1;) {
    const A = out[out.length - 1];
    const fits = (j) => {
      const B = R(D[j].p), L = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (L < 1e-6) return j === s + 1; // back where it started: never a chord of no length over the curve
      for (let k = s + 1; k < j; k++) { const P = D[k].p; if (Math.abs((B[0] - A[0]) * (A[1] - P[1]) - (A[0] - P[0]) * (B[1] - A[1])) / L > TOL) return false; }
      return true;
    };
    let best = -1, near = -1, ne = 9;
    for (let j = s + 1; j < D.length; j++) {
      if (best >= 0 && Math.hypot(D[j].p[0] - A[0], D[j].p[1] - A[1]) > REACH) break;
      const e = off(D[j].p);
      if ((D[j].c || e < LAT) && fits(j)) best = j;
      if (j - s <= NEAR && e < ne && fits(j)) { ne = e; near = j; }
      if (D[j].c) break;
    }
    if (best < 0) best = near >= 0 ? near : s + 1;
    const v = R(D[best].p), u = out[out.length - 1];
    if (v[0] !== u[0] || v[1] !== u[1]) out.push(v);
    s = best;
  }
  const z = out[out.length - 1];
  if (out.length > 1 && z[0] === out[0][0] && z[1] === out[0][1]) out.pop();
  return out;
}
// a straight edge through two points, as y at x
const edge = (a, b) => (x) => a[1] + ((x - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
// the field between two edges, a little past the lower one (the next field covers it)
const field = (top, bot, lap = 3) => [[X0, top(X0)], [X1, top(X1)], [X1, bot(X1) + lap], [X0, bot(X0) + lap]];
// a slash: a band leaning k units right for each unit down, w wide, from y0 to y1, its top left at x
const slash = (x, y0, y1, w, k) => [[x, y0], [x + w, y0], [x + w + k * (y1 - y0), y1], [x + k * (y1 - y0), y1]];
const wind = (p) => (polyArea(p) < 0 ? [...p].reverse() : p);
// where the line a..b crosses a ring: [t along a..b, the edge's two ends], in order from a
function crossings(ring, a, b) {
  const out = [];
  ring.forEach((c, i) => {
    const d = ring[(i + 1) % ring.length], den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (!den) return;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    if (u >= 0 && u < 1) out.push([t, c, d]);
  });
  return out.sort((p, q) => p[0] - q[0]);
}
// the part of polygon p on the side of an edge's line (from crossings) that holds point q
const keepSide = (p, [, c, d], q) => ((d[0] - c[0]) * (q[1] - c[1]) - (d[1] - c[1]) * (q[0] - c[0]) >= 0 ? clipHalf(p, c, d) : clipHalf(p, d, c));
// letters (rings per letter) split by a convex shape: [the parts inside it, the parts outside it]
function split(insts, shape) {
  const c = wind(shape), inn = [], out = [];
  for (const rs of insts) {
    const a = rs.map((r) => clipConvex(r, c)).filter((r) => r.length > 2);
    if (a.length) inn.push(a);
    let rest = rs;
    c.forEach((p, i) => {
      const q = c[(i + 1) % c.length];
      const o = rest.map((r) => clipHalf(r, q, p)).filter((r) => r.length > 2);
      if (o.length) out.push(o);
      rest = rest.map((r) => clipHalf(r, p, q)).filter((r) => r.length > 2);
    });
  }
  return [inn, out];
}

// A course's name in cut letters, stretched from x0 to x1 and laid along the roll, hung from its own seam; logged with its tile
// for the seam guard. Returns the rings, where the baseline ends (the high end), and the top and baseline of the name at x.
function lay(page, r, x0, x1 = WALL_END) {
  const { glyphs, width } = word(r.name, null, { face: r.face });
  const s = r.letter / 140, xs = (x1 - x0) / (width * s);
  const at = ([u, v]) => { const X = u * s * xs, V = v * s; return [x0 + X * CO - V * SI, X * SI + V * CO]; };
  const raw = glyphs.filter((g) => g.o.length).map((g) => ringsOf(g).map((ring) => ring.map(at)));
  const dy = r.y + CLEAR - Math.min(...raw.flat(2).map((p) => p[1]));
  const insts = raw.map((rs) => rs.map((ring) => fit(ring.map(([x, y]) => [x, y + dy]))));
  noteCut(page, r.name, insts, r.letter, { xs, tile: r.tile, face: r.face });
  const end = at([width, 140]), start = at([0, 140]), cap = at([0, 0]);
  return { insts, xs, s, dy, end: [end[0], end[1] + dy], start: [start[0], start[1] + dy], capStart: [cap[0], cap[1] + dy], width };
}

// The line through the gap between letter i and the next (spaces not counted), as x at y: midway between them near the cap
// line and near the baseline, so a cut along it splits the name between two letters and through none.
function gap(n, i) {
  const uv = ([x, y]) => [x * CO + y * SI, -x * SI + y * CO], xy = ([u, v]) => [u * CO - v * SI, u * SI + v * CO];
  const a = n.insts[i][0].map(uv), b = n.insts[i + 1][0].map(uv), vs = [...a, ...b].map((p) => p[1]);
  const v0 = Math.min(...vs), v1 = Math.max(...vs), h = v1 - v0;
  const at = (lo, hi) => {
    const m = (P) => P.filter((p) => p[1] >= lo && p[1] <= hi).map((p) => p[0]);
    return xy([(Math.max(...m(a)) + Math.min(...m(b))) / 2, (lo + hi) / 2]);
  };
  const p = at(v0, v0 + h * 0.25), q = at(v1 - h * 0.25, v1);
  return Object.assign((y) => p[0] + ((y - p[1]) * (q[0] - p[0])) / (q[1] - p[1]), { top: p });
}
// the gap whose middle lies nearest x
const gapNear = (n, x) => {
  const mid = (i) => (bboxOf(n.insts[i][0])[2] + bboxOf(n.insts[i + 1][0])[0]) / 2;
  let best = 0;
  for (let i = 1; i < n.insts.length - 1; i++) if (Math.abs(mid(i) - x) < Math.abs(mid(best) - x)) best = i;
  return gap(n, best);
};

// a caption right-aligned to the name's high end, on its roll, `drop` under the name's baseline
function caption(page, F, str, size, c, drop, fill, cls, keep) {
  const t = str.toUpperCase(), w = page.measure(F, t, size);
  page.text(F, t, c.end[0] - w * CO, c.end[1] + drop - w * SI, { size, rot: ROLL, fill, cls, ...keep });
}

export function draw(page, ctx) {
  const { Y, COPY, L0, faces, courses } = ctx;
  const y0 = Y.credits, y1 = Y.lights;
  const small = faces.cond; // the staff roll's small print: condensed capitals
  const poly = (list, col, opt) => page.polys(list, `fill="${col}"`, opt);
  // no black base of its own: the film's base is black under every tile, and the fields below cover the whole wall

  // every name first, so the edges between the fields can run between them
  const names = courses.map((r) => lay(page, r, L0));
  // the edge between course i - 1 and course i: at the left, midway between the upper name's foot and the lower name's top;
  // at the right, midway between the upper caption's foot (the phone's, the larger) and the lower name's top
  const edges = [() => y0];
  for (let i = 0; i < courses.length; i++) {
    const n = names[i], r = courses[i];
    const topL = n.capStart[1] - 4, topR = r.y + CLEAR;
    if (i === 0) { edges.push(edge([L0, (topL + Y.courses) / 2 + 8], [WALL_END, topR - 18])); continue; }
    const p = names[i - 1];
    const footL = p.start[1] + 2, footR = p.end[1] + PHONE_DROP + 6;
    edges.push(edge([L0, (footL + topL) / 2], [WALL_END, (footR + topR) / 2]));
  }
  edges.push(() => y1);
  const keepOf = (r) => ({ before: r.y + r.h, from: r.y });
  // a second plate kept inside its own card's field, for a shape whose plate would otherwise show on the card above
  const plateIn = (p, dx, dy, f, opt) => poly([clipConvex(wind(offset([p], dx, dy)[0]), wind(f))], C.pink, opt);
  // a field and its cut-ins reach into the tiles above and below (the edges cross the seams), never further, nor into the night
  const nearOf = (r) => ({ before: Math.min(r.y + r.h + 60, y1), from: r.y - 60 });

  // a shape kept 15u inside its own tile, so it is written into no other (a dot screen's patterns are dear)
  const inTile = (p, r, lo = 15) => clipConvex(wind(p), wind([[X0, r.y + lo], [X1, r.y + lo], [X1, r.y + r.h - lo], [X0, r.y + r.h - lo]]));
  // a triangle hanging from the edge `top` at the left: its long side runs from (X0, y) up to the edge at x
  const hang = (top, y, x) => [[X0, top(X0) - 4], [x, top(x) - 4], [X0, y]];

  // d0: the label card. Indigo, a teal screen cut into its top left corner along one hard diagonal (it runs off the top and
  // left edges); the credit's label in lemon on a black slab that runs in from the right edge on the roll, its left end cut on a
  // hard slant, its pink plate off register up and to the left, so the pink shows along the slab's top and its cut, never under
  // the line. Small, off centre, no name under it, no rule.
  {
    const keep = { before: Y.courses, from: y0 }, near = { before: Y.courses + 60, from: y0 };
    poly([field(edges[0], edges[1])], C.indigo, near);
    screenPolys(page, [[[X0, y0 - 4], [WEDGE[0], y0 - 4], [X0, y0 + WEDGE[1]]]], 'zB', keep);
    const size = 41, w = page.measure(faces.label, COPY.wallLead, size), xe = 1124, xb = xe - w * CO;
    const yb = Y.credits + 62, by = yb + (xe - xb) * T; // the baseline at its right end, and where it starts, down the roll
    const capH = 0.686 * size, desc = 10, pad = 12;
    const yTopAt = (x) => yb - capH - pad + (xe - x) * T, yFootAt = (x) => yb + desc + pad + (xe - x) * T;
    const xs0 = xb - 34, cut = 34; // the slab's left end, cut on a hard slant
    const sl = [[xs0 + cut, yTopAt(xs0 + cut)], [X1, yTopAt(X1)], [X1, yFootAt(X1)], [xs0, yFootAt(xs0)]];
    plate(page, [sl], C.pink, -10, -8, keep);
    poly([sl], C.black, keep);
    page.text(faces.label, COPY.wallLead, xb, by, { size, rot: ROLL, fill: C.lemon, ...keep });
  }

  const [d1, d2, d3, d4] = courses.map((r, i) => ({ r, n: names[i], top: edges[i + 1], foot: edges[i + 2], keep: keepOf(r), near: nearOf(r) }));

  // d1: two fields cut apart on a steep slant through the gap between the words: the studio's first word black on lemon, the
  // second white on indigo, the pink plate of the lemon showing along the cut. Behind the second word, a screen of the indigo's
  // own dots opens from the cut toward the top: its far side a hard diagonal that clears the captions, which stay on flat ground.
  {
    const { r, n, top, foot, keep, near } = d1;
    const f = field(top, foot);
    poly([f], C.indigoDk, near);
    const xAt = gap(n, r.name.split(' ')[0].length - 1), ya = top(xAt(top(600))) - 4, yb = foot(xAt(foot(600))) + 4;
    // the screen's far side passes 18u left of both captions' top left corners
    const corner = (str, size, drop) => { const w = page.measure(small, str.toUpperCase(), size); return [n.end[0] - w * CO - 18, n.end[1] + drop - w * SI - 0.75 * size]; };
    const cs = [corner(r.cap, 19, DROP), corner(r.capPhone ?? r.cap, 41, PHONE_DROP)];
    const far = (y) => Math.min(...cs.map(([cx, cy]) => cx + (cy - y) * BEAM));
    const sc = [[xAt(ya) - 30, ya], [far(ya), ya], [far(yb), yb], [xAt(yb) - 30, yb]];
    screenPolys(page, [inTile(clipConvex(wind(sc), wind(f)), r, 0)], 'zG', keep);
    const lem = clipConvex(wind([[X0, top(X0) - 4], [xAt(ya), ya], [xAt(yb), yb], [X0, foot(X0) + 4]]), wind(f));
    plate(page, [lem], C.pink, 10, 8, near);
    poly([lem], C.lemon, near);
    const [inn, out] = split(n.insts, lem);
    page.rings(out, `fill="${C.white}"`, keep);
    page.rings(inn, `fill="${C.black}"`, keep);
    caption(page, small, r.cap, 19, n, DROP, C.lemon, 'd', keep);
    caption(page, small, r.capPhone ?? r.cap, 41, n, PHONE_DROP, C.lemon, 'm', keep);
  }

  // d2: lemon. VEIL in a black outline over a pale screen hanging in from the left; a black slash leans through the E, and
  // where the outline crosses the slash it is lemon.
  {
    const { r, n, top, foot, keep, near } = d2;
    const f = field(top, foot);
    poly([f], C.lemon, near);
    // its tip reaches over the seam under the studio's lemon: there it is the screen's own pale ground, solid, so the screen's
    // patterns are written into this tile alone
    const sc = clipConvex(wind(hang(top, r.y + r.h - 15, 600)), wind(f));
    // its plate shows along the long side, and stops at the V's outline: before the V and after it, never through its counter
    const pl = offset([sc], 10, 8)[0], A = [X0 + 10, r.y + r.h - 7], B = [610, top(600) + 4], vs = crossings(n.insts[0][0], A, B);
    poly([keepSide(pl, vs[0], A), keepSide(pl, vs[vs.length - 1], B)], C.pink, near);
    poly([clipConvex(sc, wind([[X0, r.y - 60], [X1, r.y - 60], [X1, r.y + 17], [X0, r.y + 17]]))], C.tealLt, near);
    screenPolys(page, [inTile(sc, r)], 'zE', keep);
    const yA = top(548) - 6, yB = foot(548) + 6;
    const sl = clipConvex(wind(slash(548, yA, yB, 150, -0.42)), wind(f));
    plate(page, [sl], C.pink, 10, 8, near);
    poly([sl], C.black, near);
    const k = page.clip([sl]), [sx0, , sx1] = bboxOf(sl);
    const crossing = n.insts.filter((rs) => { const [a, , b] = bboxOf(rs.flat()); return b > sx0 && a < sx1; }); // only these turn lemon
    // the phone's line is heavier: 6u is 1.5 px there, and the screen behind the V would eat it
    for (const [w, cls] of [[OUTLINE, 'd'], [PHONE_OUTLINE, 'm']]) {
      page.rings(n.insts, line(C.black, w), { ...keep, cls });
      page.rings(crossing, line(C.lemon, w), { ...keep, cls, clip: k });
    }
    caption(page, small, r.cap, 19, n, DROP, C.black, 'd', keep);
    caption(page, small, r.capPhone ?? r.cap, 41, n, PHONE_DROP, C.black, 'm', keep);
  }

  // d3: teal. DISEENS in white; a black slab under its high end carries the caption, and the letters are knocked out of it
  // (the teal shows through them); a darker screen hangs in at its start.
  {
    const { r, n, top, foot, keep, near } = d3;
    const f = field(top, foot);
    poly([f], C.teal, near);
    screenPolys(page, [inTile(hang(top, r.y + r.h - 15, 600), r)], 'zA', keep);
    // the slab's edge leans through the letter before a gap and clears the next at its cap line: the letters wholly on the slab
    // are knocked out of it (teal), the one it cuts stays white
    const g = gapNear(n, 830), k = -0.45, xAt = (y) => g.top[0] - 3 + k * (y - g.top[1]);
    const ya = top(xAt(top(900))) - 6, yb = foot(xAt(foot(900))) + 6;
    const sl = clipConvex(wind([[xAt(ya), ya], [X1, ya], [X1, yb], [xAt(yb), yb]]), wind(f));
    plateIn(sl, -10, -4, f, near); // out to the left, along the slab's edge
    poly([sl], C.black, near);
    const on = (rs) => rs[0].every(([x, y]) => x > xAt(y));
    page.rings(n.insts.filter((rs) => !on(rs)), `fill="${C.white}"`, keep);
    page.rings(n.insts.filter(on), `fill="${C.teal}"`, keep);
    caption(page, small, r.cap, 19, n, DROP, C.lemon, 'd', keep);
    caption(page, small, r.capPhone ?? r.cap, 41, n, PHONE_DROP, C.lemon, 'm', keep);
  }

  // d4: lemon, the last card: the name in black on the yellow cards' black ground, tilted with the roll, which climbs at the
  // right in one hard diagonal; where the name crosses onto the black it is knocked out in lemon, and the caption is lemon on
  // the black. The pink plate of the climb shows along its edge. Then the hard cut to the night.
  {
    const { r, n, top, foot, keep, near } = d4;
    const f = field(top, foot);
    poly([f], C.lemon, near);
    const g = edge([L0, n.start[1] + 36], [WALL_END, n.start[1] + 16]); // the ground: a strip under the name, the night under it
    const xb = CLIMB[0], xt = CLIMB[1], yt = top(xt) - 4;
    const ground = [[X0, g(X0)], [xb, g(xb)], [xt, yt], [X1, top(X1) - 4], [X1, Y.lights + 14], [X0, Y.lights + 14]];
    const climb = [[xb, g(xb)], [xt, yt], [X1, top(X1) - 4], [X1, Y.lights + 14], [xb, Y.lights + 14]];
    plateIn([[xb, g(xb)], [xt, yt], [xt + 40, yt], [xb + 40, g(xb)]], -10, -8, f, near); // along the climb only: never a rule under a line
    poly([ground], C.black, near);
    // under the caption, a dark screen cut into the black along the climb's slant: the last cut-in before the night
    // its top runs on the roll 14u under the phone caption's foot; its left side is the climb's edge 60u further right
    const yTop = (x) => n.end[1] + PHONE_DROP + 14 + (WALL_END - x) * T, xSide = (y) => xb + ((xt - xb) * (g(xb) - y)) / (g(xb) - yt) + 60;
    let cx = xSide(yTop(xt));
    for (let i = 0; i < 4; i++) cx = xSide(yTop(cx));
    const cut = inTile([[cx, yTop(cx)], [X1, yTop(X1)], [X1, Y.lights], [xSide(Y.lights), Y.lights]], r);
    screenPolys(page, [cut], 'zB', keep);
    const [inn, out] = split(n.insts, climb);
    page.rings(out, `fill="${C.black}"`, keep);
    page.rings(inn, `fill="${C.lemon}"`, keep);
    caption(page, small, r.cap, 19, n, DROP, C.lemon, 'd', keep);
    caption(page, small, r.capPhone ?? r.cap, 41, n, PHONE_DROP, C.lemon, 'm', keep);
  }

  // the strip's end date hangs under its last row (kit/strip.mjs, DATE long): the strip's black runs on under it, so the date
  // stays lemon on black across the teal and lemon fields
  poly([[[X0, STRIP_H], [STRIP, STRIP_H], [STRIP, STRIP_H + DATE + 12], [X0, STRIP_H + DATE + 12]]], C.black, { before: y1, from: Y.courses });
}
