// a1 to a4. The tower, the light through its name, the shadow falling down the page, the contact words on the street.
import { C, W, ANG, rng, taper, pencil, hatch, swell, flick, lerpP, clipHalf, clipConvex } from '../kit/draw.mjs';
import { cutLine, fitH, layWord } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { P, T, S, logo, slab, blade, beam, top, side, foot, slit, nameLetters } from '../kit/scene.mjs';
import { STRIP } from '../kit/strip.mjs';

const RIGHT_EDGE = 1168; // where the name and the phone's right-aligned lines stop: past this they look about to clip at 293

function ground(page) {
  const R = rng(21);
  const v = (x, z) => { const q = P([x, 0, z]); return [q[0], q[1]]; };
  // three strokes and no grid: the kerb, the far kerb, one line across. Heavy near, flicked off far.
  const near = (t) => Math.pow(1 - t, 0.5) * 0.96 + 0.04;
  const strokes = [
    taper([v(150, 40), v(150, 900)], { w: 13, prof: near, wob: 1.2, R, n: 4 }),
    taper([v(330, 40), v(330, 1400)], { w: 15, prof: near, wob: 1.2, R, n: 4 }),
    taper([v(-900, 900), v(900, 900)], { w: 5, prof: swell, wob: 0.8, R, n: 5 }),
  ];
  page.polys(strokes, `fill="${C.graphite}"`, { cls: 'gr' });
}

// The three contact words stand on one edge of the shadow, each cut once by it, in the gap between two letters: EM AIL,
// LINK EDIN, RES UME. EMAIL's foot stays inside its tile and its top runs parallel under the block's shadow, so no other
// edge reaches its letters, and its gap is opened so the red pencil on that edge runs clear of both feet.
const EMAIL = { x0: 708, x1: 1126, yt: 1177, yb: 1243, kern: { MA: 10 }, foot: (x) => 1241 - (x - 590) * ANG.roll };
const RESUME = { x0: 944, x1: 1188, yt: 1476, yb: 1570, top: (x) => 1476 - (x - 590) * ANG.roll };

// the cast shadow with the light letters in it
function castShadow(page) {
  const polys = logo.slice(0, 6).map((p) => p.map(S));
  page.polys(polys, `fill="${C.sumi}"`, { cls: 'sh' });
  // The sliver between the shadows of the blade and the block is closed from its tip, or paper shows through AIL and a
  // needle of it stands on the A. The shadow's far edge runs off under the strip: the paper left of it goes dark too, so no
  // flat cut hangs beside the T. Both overlap the ink, except at the sliver's tip, where the shadows have no width to lap.
  const a = S(slab[4]), b = S(slab[0]), at = a[1] + (b[1] - a[1]) * (STRIP - a[0]) / (b[0] - a[0]);
  const bl0 = S(blade[3]), bl1 = S(blade[2]), tp0 = S(top[0]), tp1 = S(top[1]), lap = (p, dy) => [p[0], p[1] + dy];
  const seal = [bl0, lap(lerpP(bl0, bl1, 0.05), 3), lap(bl1, 3), lap(tp1, -3), lap(lerpP(tp0, tp1, 0.05), -3), tp0];
  page.polys([seal, [[-14, at], [STRIP + 30, at], [b[0] + 30, b[1]], [-14, b[1]]]], `fill="${C.sumi}"`, { cls: 'sh' });
  // the slit's light comes out from under the foot of EMAIL and stops short of RESUME, so nothing lies in the letters' gaps
  const lit = clipHalf(clipHalf(slit.map(S), [0, EMAIL.foot(0)], [W, EMAIL.foot(W)]), [W, RESUME.top(W) - 14], [0, RESUME.top(0) - 14]);
  page.polys([lit], `fill="${C.toka}"`, { cls: 'sh' });
  nameLetters.forEach((rs, i) => {
    page.polys([rs[0].map(S)], `fill="${C.toka}"`, { cls: `sh l${i}` });
    if (rs.length > 1) page.polys(rs.slice(1).map((r) => r.map(S)), `fill="${C.sumi}"`, { cls: `sh l${i}` });
  });
}

// colored-pencil shadow marks on the paper, the way a key animator tells the painter where shadow falls
function shadowMarks(page) {
  const R = rng(13);
  const edges = [];
  const add = (poly, idx) => { for (const i of idx) edges.push([poly[i], poly[(i + 1) % poly.length]]); };
  add(blade.map(S), [0, 1, 3, 4]); add(slab.map(S), [1, 2]); // not the edge along the block's shadow: it would cross AIL
  const lines = [];
  for (const [a, b] of edges) lines.push(...pencil(a, b, { w: 6, over: 28, R, restate: 0.9, wander: 2.4 }));
  page.polys(lines, `fill="${C.verm}"`, { cls: 'pl mk' });
  // hatch band: paper side of the slab's shadow
  const sl = slab.map(S);
  const a = sl[1], b = sl[2];
  const band = (off, t0, t1) => { const A = lerpP(a, b, t0), B = lerpP(a, b, t1); return [A, B, [B[0] + off, B[1] - off * 0.35], [A[0] + off, A[1] - off * 0.35]]; };
  const hs = hatch(band(64, 0.02, 0.5), { angle: 18, gap: 13, w: 5.5, R, miss: 0.06, over: 8, doubleBack: 0.5 });
  page.polys(hs, `fill="${C.verm}"`, { cls: 'mk' });
}

const pivot = () => T([431, 911]);
const rotAbout = (p, c0, deg) => { const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), x = p[0] - c0[0], y = p[1] - c0[1]; return [c0[0] + x * c - y * s, c0[1] + x * s + y * c]; };
const GHOST = [-15, -8.5];

function sky(page) {
  const a = P([-2000, 0, 2e4]), b = P([2000, 0, 2e4]);
  const m = (b[1] - a[1]) / (b[0] - a[0]);
  const yAt = (x) => a[1] + (x - a[0]) * m;
  // the paint stops at the left edge of the first pose, as if the colour had been dragged by the move
  const pv = pivot();
  const g0 = slab.map((p) => rotAbout(T(p), pv, GHOST[0]));
  const tl = g0[0], fl = g0[4];
  const ext = (a0, b0, y) => { const t = (y - a0[1]) / (b0[1] - a0[1]); return [a0[0] + (b0[0] - a0[0]) * t, y]; };
  const topPt = ext(tl, fl, -14), lowPt = ext(tl, fl, yAt(0));
  page.polys([[topPt, [W + 14, -14], [W + 14, yAt(W + 14)], [lowPt[0], yAt(lowPt[0])]]], `fill="${C.toka}"`, { cls: 'sky' });
}

function ghosts(page) {
  const R = rng(31);
  const pv = pivot();
  GHOST.forEach((deg, gi) => {
    const q = slab.map((p) => rotAbout(T(p), pv, deg));
    const hs = hatch(q, { angle: -24 + gi * 8, gap: 15 + gi * 5, w: 5, R, miss: 0.03, over: 10, doubleBack: 0.3 });
    page.polys(hs, `fill="${C.blue}"`, { cls: `gh g${gi}` });
    const lines = [];
    for (let i = 0; i < q.length; i++) lines.push(...pencil(q[i], q[(i + 1) % q.length], { w: 5, over: 26, R, restate: 0.7, wander: 2 }));
    page.polys(lines, `fill="${C.blue}"`, { cls: `pl gh g${gi}` });
  });
}

// the smear: one drawing between A3 and A5. The slab swept along its arc, a true reprojection, not a transform.
function smear(page) {
  const pv = pivot();
  const rot = (p, d) => rotAbout(p, pv, d);
  const q = slab.map(T);
  const sweep = [rot(q[4], -7), rot(q[0], -8.5), rot(q[1], -8.5), rot(q[1], -3.4), rot(q[2], -3.4), rot(q[3], -3.4), rot(q[4], -3.4)];
  page.polys([sweep], `fill="${C.sumi}"`, { cls: 'sm' });
  const R = rng(71);
  const lines = [];
  for (let i = 0; i < 9; i++) { const t = i / 8, a = lerpP(q[0], q[1], t), b = rot(a, -19 - 3 * R()), c = rot(a, -8.5); lines.push(taper([c, b], { w: 7, prof: flick, R, n: 2 })); }
  page.polys(lines, `fill="${C.sumi}"`, { cls: 'sm' });
}

function towerPaint(page) {
  const R = rng(55);
  const tw = (polys, fill) => page.polys(polys, `fill="${fill}"`, { cls: 'tw' });
  tw([slab.map(T)], C.sumi);
  // blade: the paint stops partway. Above the stop it is still paper and blue pencil.
  const bl = blade.map(T);
  const stopA = lerpP(bl[1], bl[2], 0.62), stopB = lerpP(bl[4], bl[3], 0.62);
  const a1 = clipHalf(bl, stopA, stopB), a2 = clipHalf(bl, stopB, stopA);
  const [painted, rough] = (a1.some((p) => p[1] < T([459, 169])[1] + 40) ? [a1, a2] : [a2, a1]);
  tw([rough], C.douga);
  page.polys(hatch(rough, { angle: 62, gap: 11, w: 5, R, miss: 0.02, over: 3, doubleBack: 0.4 }), `fill="${C.blue}"`, { cls: 'tw' });
  tw([painted], C.blue);
  tw([beam.map(T)], C.sumi);
  tw([top.map(T)], C.douga);
  page.polys(hatch(clipHalf(top.map(T), T([700, 640]), T([600, 700])), { angle: 28, gap: 12, w: 3.6, R, miss: 0.08, over: 2 }), `fill="${C.blue}"`, { cls: 'tw' });
  tw([side.map(T)], C.blue);
  tw([foot.map(T)], C.blue);
  tw([slit.map(T)], C.sumi);
  nameLetters.forEach((rs, i) => {
    page.polys([rs[0].map(T)], `fill="${C.toka}"`, { cls: `tw l${i}` });
    if (rs.length > 1) page.polys(rs.slice(1).map((r) => r.map(T)), `fill="${C.sumi}"`, { cls: `tw l${i}` });
  });
}

function towerLines(page) {
  const R = rng(41);
  const lines = [];
  for (const poly of [blade, top, side]) {
    const q = poly.map(T);
    for (let i = 0; i < q.length; i++) lines.push(...pencil(q[i], q[(i + 1) % q.length], { w: 4, over: 30, R, restate: 0.6, wander: 1.4 }));
  }
  page.polys(lines, `fill="${C.graphite}"`, { cls: 'pl tp' });
}

// the score, drawn: one tick each three frames, a mark at each key. Desktop only.
function timingChart(page, Hand, COPY, score) {
  const { D, AT, CHART_MARKS } = score;
  const Rt = rng(17);
  const x = 1090, y0 = 262, fh = 3.6;
  const y = (f) => y0 + f * fh;
  const segs = [];
  for (let f = 0; f <= D; f += 3) segs.push([x - 7, y(f), x + 7, y(f)]);
  page.segs(segs, `stroke="${C.sumi}" stroke-width="2"`, { cls: 'd' });
  page.polys([taper([[x, y(0) - 10], [x, y(D) + 10]], { w: 3.4, prof: swell, R: Rt })], `fill="${C.sumi}"`, { cls: 'd' });
  CHART_MARKS.forEach((k) => {
    const yy = y(k.frame);
    page.polys([[[x - 11, yy - 2.4], [x + 11, yy - 2.4], [x + 11, yy + 2.4], [x - 11, yy + 2.4]]], `fill="${k.hit ? C.verm : C.sumi}"`, { cls: 'd' });
    page.text(Hand, k.id, k.left ? x - 48 : x + 18, yy + 9, { size: 25, fill: k.hit ? C.verm : C.sumi, R: Rt, cls: 'd', mark: true });
  });
  const ly0 = y(AT.O), ly1 = y(D);
  page.polys([taper([[x + 18, ly0], [x + 28, (ly0 + ly1) / 2], [x + 18, ly1]], { w: 4, prof: swell, R: Rt })], `fill="${C.sumi}"`, { cls: 'd' });
  page.text(Hand, COPY.chartThrees, x - 6, y0 - 22, { size: 28, fill: C.sumi, R: Rt, cls: 'd' });
  page.text(Hand, COPY.chartName, x + 34, (ly0 + ly1) / 2 + 8, { size: 25, fill: C.sumi, R: Rt, cls: 'd' });
}

// film cover and impact: painted over the sentence and the hits, so they wait for them
function filmLayers(page, Y) {
  // film cover: below the opening, nothing settled may show until the sky comes on
  page.polys([[[-14, Y.t - 60], [W + 14, Y.t - 60], [W + 14, Y.filmEnd + 14], [-14, Y.filmEnd + 14]]], `fill="${C.douga}"`, { cls: 'cv', before: Y.filmEnd });
  // impact: one drawing, two colours, over everything but the strip
  const imp = [[-14, -14], [W + 14, -14], [W + 14, Y.filmEnd + 14], [-14, Y.filmEnd + 14]];
  page.polys([imp], `fill="${C.sumi}"`, { cls: 'im', before: Y.filmEnd });
  page.polys([slab, blade, beam, top, side, foot].map((p) => p.map(T)), `fill="${C.toka}"`, { cls: 'im', before: Y.filmEnd });
}

export function draw(page, ctx) {
  const { Y, COPY, faces, score, pen, after } = ctx;
  const { gothic: Zen, hand: Hand } = faces;

  ground(page);
  sky(page);
  castShadow(page);
  shadowMarks(page);
  ghosts(page);
  smear(page);
  towerPaint(page);
  towerLines(page);

  // who
  const nameH = fitH(COPY.name, RIGHT_EDGE - 686);
  cutLine(page, COPY.name, 686, 30, nameH, C.sumi, { seed: 8, skew: 0 });
  const B0 = T([459, 169]), B1 = T([761, 650]);
  const bladeX = (y) => B0[0] + ((y - B0[1]) * (B1[0] - B0[0])) / (B1[1] - B0[1]);
  COPY.who.forEach((l, i) => { const y = 112 + i * 31; page.text(Zen, l, Math.max(686, bladeX(y + 6) + 22), y, { size: 24, fill: C.sumi, cls: 'd' }); });
  // the phone's lines step in with the blade, and the last one stops short of the pencil line running off its tip
  para(page, Zen, COPY.whoPhone, RIGHT_EDGE, 120, 41, 44, { cls: 'm', right: true });
  para(page, Zen, COPY.whoPhone2, RIGHT_EDGE, 120 + COPY.whoPhone.length * 44, 41, 44, { cls: 'm', right: true });

  timingChart(page, Hand, COPY, score);

  // the sentence about the name, in graphite on a clean patch of the street, clear of the point of the block above it
  page.polys([[[574, 894], [1176, 894], [1176, 1002], [604, 1002], [574, 986]]], `fill="${C.douga}"`);
  page.text(Hand, COPY.handle[0], 584, 938, { size: 50, fill: C.graphite, R: pen, jit: 6 });
  page.text(Hand, COPY.handle[1], 584, 988, { size: 50, fill: C.graphite, R: pen, jit: 6 });
  // the strip's first legend, running along it, so nobody takes it for a ruler
  page.text(Hand, COPY.legendTop, 104, 440, { size: 46, fill: C.blue, R: pen, jit: 5, rot: -90 });

  // the contact words lie on the street beside the shadow
  const VP = [590, 700];
  const shadowPieces = [[[459, 169], [761, 650], [551, 588], [475, 276]], top, side, [[443, 658], [725, 764], [734, 863], [497, 766]]].map((p) => p.map(S));
  const counter = (word, x0, x1, yt, yb, seed, pieces = shadowPieces, kern) => {
    const insts = layWord(page, word, x0, x1, yt, yb, VP, C.sumi, { seed, cls: 'sh', kern });
    for (const conv of pieces) {
      const pieces = insts.map((rs) => rs.map((r) => clipConvex(r, conv)).filter((r) => r.length > 2)).filter((rs) => rs.length);
      if (pieces.length) page.rings(pieces, `fill="${C.toka}"`, { cls: 'sh' });
    }
  };
  // EMAIL's right side lies across two shadows: one piece, or the seam between them shows through AIL as a hairline
  const edge0 = S(blade[3]), edge1 = S(blade[4]), up = [edge0[0] - (edge1[0] - edge0[0]) * 0.1, edge0[1] - (edge1[1] - edge0[1]) * 0.1];
  counter(COPY.words.email, EMAIL.x0, EMAIL.x1, EMAIL.yt, EMAIL.yb, 51, [[up, [W + 14, up[1]], [W + 14, edge1[1]], edge1]], EMAIL.kern);
  // the address runs with the word, in the paper left above AIL, between the two shadows
  page.text(Zen, COPY.emailAddress, 886, 1136, { size: 24, fill: C.sumi, cls: 'd sh', rot: -4.01 });
  counter(COPY.words.linkedin, 790, 1188, 1277, 1371, 52);
  counter(COPY.words.resume, RESUME.x0, RESUME.x1, RESUME.yt, RESUME.yb, 53);

  after('hits', () => filmLayers(page, Y));
}
