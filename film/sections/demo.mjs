// b1, above the care band. The thesis on the card: the tower's black shadow becomes the slab the first sentence is knocked
// out of. Each line is yellow where the card behind it is black and black where it is yellow, so letters change colour
// where they cross an edge. The second line lies on a black slab that ends on a cut through its last word, and the shadow
// ends where that slab ends: along its lower edge, up its cut and on along its upper edge, the card is cut back to the
// yellow field. On the field, as on a credit card, a small label (the strip's legend, lemon on a black slab cut on the
// beam angle) sits over the last two words, WORKS ONCE., black, set at the same slash. One clip serves both knocked-out
// lines.
import { C, W, ANG, clipHalf, clipConvex, polyArea } from '../kit/draw.mjs';
import { capOf, measure, wrap } from '../kit/type.mjs';
import { S, slab, blade, nameLetters } from '../kit/scene.mjs';
import { plate } from '../kit/print.mjs';

const ROT = -10; // every line of the card here
const DEG = 180 / Math.PI;
// a point (u along the line, v down from its baseline) of a line whose baseline starts at (x, y), turned deg
const frame = (x, y, deg) => {
  const r = deg / DEG, co = Math.cos(r), si = Math.sin(r);
  return (u, v) => [x + u * co - v * si, y + u * si + v * co];
};
// where line p + t d meets line q + s e
const meet = (p, d, q, e) => {
  const den = d[0] * e[1] - d[1] * e[0], t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
  return [p[0] + t * d[0], p[1] + t * d[1]];
};
// a polygon less a convex quad: the pieces left outside it, one per edge of the quad (they do not overlap)
const minus = (poly, quad) => {
  const q = polyArea(quad) > 0 ? quad : [...quad].reverse(), out = [];
  let rest = poly;
  for (let i = 0; i < q.length && rest.length > 2; i++) {
    const a = q[i], b = q[(i + 1) % q.length], o = clipHalf(rest, b, a);
    if (o.length > 2 && Math.abs(polyArea(o)) > 4) out.push(o);
    rest = clipHalf(rest, a, b);
  }
  return out;
};

export function draw(page, ctx) {
  const { Y, COPY, L0, faces } = ctx;
  const { wide: Wide, label: Label } = faces;
  const keep = { from: Y.shadowEnd, before: Y.t };

  // the first sentence: two lines at 96 on the card's slash
  const size = 96, cap = capOf(Wide, size), lead = LEAD * cap;
  const lines = [COPY.demoA, COPY.demoB].map((s) => s.toUpperCase());
  const x0 = L0 + 2, y0 = Y0;
  const f1 = frame(x0, y0, ROT), f2 = frame(...f1(0, lead), ROT);
  // the second line's slab, from under the strip to a cut on the beam angle through its last word's W
  const last = lines[1], kW = last.lastIndexOf(' ') + 5; // the W of SOFTWARE
  const uW = measure(Wide, last.slice(0, kW + 1), size) - measure(Wide, last[kW], size) * (1 - CUT_AT);
  const along = [Math.cos(ROT / DEG), Math.sin(ROT / DEG)], cutD = [ANG.beam, -1];
  const cutP = f2(uW, -cap / 2);
  const top = f2(0, -cap - PAD[0]), bot = f2(0, PAD[1]);
  const slab2 = [f2(-400, -cap - PAD[0]), meet(top, along, cutP, cutD), meet(bot, along, cutP, cutD), f2(-400, PAD[1])];

  // the cut: the shadow ends where the slab ends, along its lower edge, up its cut and on along its upper edge to the
  // card's right edge; the yellow field below, to the night (hits paints the care band and the night over its foot). The
  // edge is printed with the pink plate off register, as every black on the card is
  const yAt = (p, x) => meet(p, along, [x, 0], [0, 1]);
  const edge = [yAt(bot, -14), slab2[2], slab2[1], yAt(top, W + 14)];
  const field = [...edge, [W + 14, Y.t + 14], [-14, Y.t + 14]];
  // the same field as two convex pieces: under the slab's lower edge, and right of its cut under its upper edge
  const under = [edge[0], yAt(bot, W + 14), [W + 14, Y.t + 14], [-14, Y.t + 14]], right = [edge[1], edge[2], edge[3], yAt(bot, W + 14)];
  page.polys([field], `fill="${C.lemon}"`, keep);
  page.polys([[...edge, ...edge.map(([x, y]) => [x + 10, y + 8]).reverse()]], `fill="${C.pink}"`, keep);

  // the black copies: from the first letter that can reach yellow (the slab is black under the second line up to its W)
  const at = (str, i, sz) => measure(Wide, str.slice(0, i + 1), sz) - measure(Wide, str[i], sz);
  const runs = [[lines[0], f1, 0], [lines[1], f2, kW]];
  // the box of letters i to j - 1 of a line, turned with it
  const box = (s, f, i, j) => { const u0 = at(s, i, size), u1 = at(s, j - 1, size) + measure(Wide, s[j - 1], size); return [f(u0, -cap), f(u1, -cap), f(u1, 0), f(u0, 0)]; };
  const reach = runs.map(([s, f, b0]) => box(s, f, b0, s.length));
  const meets = (p, r) => Math.abs(polyArea(clipConvex(p, r))) > 1;

  // the yellow the lines cross: the shadow's letters (those with no counters), the street between the shadows of the slab
  // and the blade, and the field under the cut; less the slab, which is black over them, and the letters less the field,
  // which covers them; only the pieces a line reaches. Each piece keeps the letter it belongs to (-1: the street and the
  // field, yellow from the kick on)
  const open = nameLetters.map((rs, i) => ({ i, p: rs[0].map(S), n: rs.length })).filter((l) => l.n === 1);
  const [sa, sb] = [S(slab[2]), S(slab[1])], [ba, bb] = [S(blade[4]), S(blade[0])];
  const street = clipHalf(clipHalf([[600, Y.shadowEnd], [W + 14, Y.shadowEnd], [W + 14, Y.t], [600, Y.t]], sb, sa), ba, bb);
  const bare = (p) => minus(p, under).flatMap((q) => minus(q, right));
  const pieces = [...open.flatMap(({ i, p }) => bare(p).map((q) => ({ i, p: q }))), ...[street, under, right].map((p) => ({ i: -1, p }))]
    .flatMap(({ i, p }) => minus(p, slab2).map((q) => ({ i, q })))
    .filter(({ q }) => reach.some((r) => meets(q, r)));
  const k = page.clip(pieces.map(({ q }) => q));

  page.polys([slab2], `fill="${C.black}"`, keep);
  // The opening lights the shadow's letters one by one, and until a letter is lit the shadow is black where it lies. So each
  // run of the black copy lights with the last shadow letter it crosses (until then it reads yellow on the black shadow, and
  // the knockout snaps in with that letter); a run that crosses only the street or the field is black from the kick on
  runs.forEach(([s, f, b0]) => {
    page.text(Wide, s, ...f(0, 0), { size, rot: ROT, fill: C.lemon, ...keep });
    const lit = (i) => (s[i] === ' ' ? null : Math.max(-1, ...pieces.filter(({ q }) => meets(q, box(s, f, i, i + 1))).map(({ i: li }) => li)));
    for (let i = b0, j; i < s.length; i = j) {
      const li = lit(i);
      for (j = i + 1; j < s.length && (lit(j) === li || lit(j) === null || li === null); j++);
      page.text(Wide, s.slice(i, j), ...f(at(s, i, size), 0), { size, rot: ROT, fill: C.black, clip: k, cls: li >= 0 ? `l${li}` : undefined, ...keep });
    }
  });

  // WORKS ONCE., black on the field, and over it the card's small print: the strip's legend in lemon on a black slab that
  // runs out from under the strip and ends on the beam angle, its plate pink (the legend in three lines; the phone has its
  // own three, at 41)
  const so = 112, capO = capOf(Wide, so), f3 = frame(L0, Y_ONCE, ROT);
  page.text(Wide, COPY.demoC.toUpperCase(), ...f3(0, 0), { size: so, rot: ROT, fill: C.black, ...keep });
  const label = (ls, sz, pt, pb, cls) => {
    const c = capOf(Label, sz), h = c + pt + pb, n = ls.length, vb = -capO - GAP - pb; // the last line's baseline
    const v = (i) => vb - (n - 1 - i) * h, u0 = Math.tan(-ROT / DEG) * (c - v(0)); // the top line's caps start at L0
    // the end cut clears every line's end by PADX: it runs through the end that lies furthest across the beam angle
    const ends = ls.flatMap((s, i) => { const u = u0 + measure(Label, s, sz) + PADX; return [f3(u, v(i)), f3(u, v(i) - c)]; });
    const cp = ends.reduce((a, p) => (p[0] + p[1] * ANG.beam > a[0] + a[1] * ANG.beam ? p : a));
    const lt = f3(0, v(0) - c - pt), lb = f3(0, v(n - 1) + pb);
    const pts = [f3(-300, v(0) - c - pt), meet(lt, along, cp, cutD), meet(lb, along, cp, cutD), f3(-300, v(n - 1) + pb)];
    plate(page, [pts], C.pink, 10, 8, { cls, ...keep });
    page.polys([pts], `fill="${C.black}"`, { cls, ...keep });
    ls.forEach((s, i) => page.text(Label, s, ...f3(u0, v(i)), { size: sz, rot: ROT, fill: C.lemon, cls, ...keep }));
  };
  label(wrap(Label, COPY.legendFull.join(' '), 22, 540), 22, 8, 9, 'd');
  label(COPY.legendPhone, 41, 11, 11, 'm');
}
// LEAD: line spacing in caps; Y0: the first line's baseline at its start; PAD: the slab over and under its line; CUT_AT: where
// the cut crosses the W; Y_ONCE: WORKS ONCE.'s baseline at its start; GAP: from the label's slab to WORKS ONCE.'s caps; PADX:
// the label's slab past each line's end
const LEAD = 1.25, Y0 = 1954, PAD = [8, 14], CUT_AT = 0.5, Y_ONCE = 2440, GAP = 22, PADX = 16;
