// b2 to b4. The sentence continues on paper, then three hits. The tower keeps two values; colour belongs to the hit.
import { C, W, rng, taper, clipHalf, partsOfClip, ring, polyArea } from '../kit/draw.mjs';
import { word, cutLine, fitH, noteCut } from '../kit/letters.mjs';
import { slab, blade, beam, top, side, foot, towerQuad, towerFlat, letterSet, towerPencil } from '../kit/scene.mjs';

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, ANG, L0, faces } = ctx;
  const { hand: Hand } = faces;
  const R = rng(101);
  const iy = Y.care + 54;
  page.polys([[[-14, Y.care + 43], [W + 14, Y.care - 43], [W + 14, Y.t + 60], [-14, Y.t + 60]]], `fill="${C.douga}"`, { cls: 'hc' });
  // the two lines run with the band, so its edges and the tower's head stay clear of every letter
  cutLine(page, COPY.careA, L0, iy, 50, C.sumi, { seed: 21, skew: SHEAR.roll, rot: -4.01, cls: 'hc' });
  cutLine(page, COPY.careB, L0, iy + 62, 50, C.sumi, { seed: 22, skew: SHEAR.roll, rot: -4.01, cls: 'hc' });

  const t = Y.t;
  const edge = (x0Y, m) => (x) => x0Y + x * m;
  const eT = edge(t + 42, -ANG.roll);
  const e1 = edge(t + Y.d1, ANG.beam);
  const e2 = edge(t + Y.d2, ANG.beam);
  const yEnd = Y.hitsEnd;
  const band = (f, g) => [[-14, f(-14)], [W + 14, f(W + 14)], [W + 14, g(W + 14)], [-14, g(-14)]];
  const b1 = band(eT, e1), b2 = band(e1, e2);
  const b3 = [[-14, e2(-14)], [W + 14, e2(W + 14)], [W + 14, yEnd], [-14, yEnd]];

  // HIT 1: bad data. The structure holds; the letters on it are wrong.
  page.polys([b1], `fill="${C.verm}"`);
  const q1 = towerQuad([[716, t - 24], [1380, t - 42], [1380, t + 770], [716, t + 742]]);
  towerFlat(page, q1, { fill: C.sumi, slitFill: C.verm, planes: { top: C.douga, blade: C.douga, side: C.douga, foot: C.douga } });
  letterSet(page, q1, COPY.wrongLetters, { fg: C.verm, bg: C.sumi }, { seed: 41 });
  towerPencil(page, q1, { R, w: 4.6, col: C.sumi, over: 26, restate: 0.3, noHatch: true, polys: [blade, top, side, foot] });
  cutLine(page, COPY.hit1[0], L0 - 6, t + 58, 150, C.sumi, { seed: 31, skew: SHEAR.lean });
  cutLine(page, COPY.hit1[1], L0 - 6, t + 216, 150, C.sumi, { seed: 32, skew: SHEAR.lean });
  // the correction: which letters
  const Rn = rng(66);
  const c = q1([322, 440]);
  ring(page, c[0], c[1], 112, 236, C.douga, Rn, 9);
  page.text(Hand, COPY.noteWrong, 498, t + 112, { size: 48, fill: C.sumi, R: Rn, jit: 8 });

  // HIT 2: unexpected use. It is on its head, knocked over along the beam's own angle, and the sentence falls with it.
  page.polys([b2], `fill="${C.blue}"`);
  const th = (20.6 * Math.PI) / 180, co = Math.cos(th), si = Math.sin(th);
  const cx = 316, cy = (e1(cx) + e2(cx)) / 2, hw = 178, hh = 222;
  const loc = (a, b) => [cx + a * co - b * si, cy + a * si + b * co];
  const q2 = towerQuad([loc(hw, hh), loc(-hw, hh), loc(-hw, -hh), loc(hw, -hh)]);
  towerFlat(page, q2, { fill: C.sumi, slitFill: C.blue, planes: { blade: C.douga, top: C.douga, side: C.douga, foot: C.douga } });
  letterSet(page, q2, COPY.towerName, { fg: C.blue, bg: C.sumi }, { seed: 11 });
  towerPencil(page, q2, { R, w: 3.6, col: C.sumi, over: 18, restate: 0.2, noHatch: true, polys: [blade, top, side, foot] });
  const L2 = 640, hU = fitH(COPY.hit2[0], L2);
  const ux = 576, uy = e1(ux) + 40;
  cutLine(page, COPY.hit2[0], ux, uy, hU, C.douga, { seed: 33, skew: -SHEAR.roll, rot: 20.6 });
  const dn = hU + 16;
  const sx = ux - dn * si, sy = uy + dn * co;
  cutLine(page, COPY.hit2[1], sx, sy, hU * 1.72, C.toka, { seed: 34, skew: -SHEAR.roll, rot: 20.6 });
  // the note runs into the point of the tower it corrects, in the empty blue beside it; the arrow is the only upright thing in the band
  const nx = 84, ny = e2(nx) - 74;
  page.text(Hand, COPY.noteUp, nx, ny, { size: 46, fill: C.douga, R: Rn, jit: 8, rot: 20.6 });
  const a0 = [nx + 42, ny - 26], a1 = [nx + 42, ny - 110];
  page.polys([taper([[a0[0], a0[1]], [a1[0], a1[1] + 26]], { w: 7, prof: (u) => 1 - u * 0.5, R: Rn }), [[a1[0] - 18, a1[1] + 26], [a1[0], a1[1] - 12], [a1[0] + 18, a1[1] + 26]]], `fill="${C.douga}"`);

  // HIT 3: someone trying to break in. The crack IS the logo's slit, at scale, through pure ink: the words get nothing behind them.
  page.polys([b3], `fill="${C.sumi}"`);
  const yW = yEnd - Y.h3words;
  const sc = 1.7, F0 = [657, yEnd];
  const QS = (p) => [F0[0] + (p[0] - 546) * sc, F0[1] + (p[1] - 692) * sc];
  const cH = QS([455, 306]), cB = QS([481, 354]), cF = QS([546, 692]);
  const h1 = fitH(COPY.hit3[0], 1060), h2 = fitH(COPY.hit3[1], 1060);
  const ly1 = yW, ly2 = ly1 + h1 + 14;
  // the right half slips away along the crack, and the gap it opens sits around the slit, so the wedge fills it.
  // The first line is set so the crack falls between the E and the O: SOMEONE stays whole on both sides of it.
  // There the slip is under a word space, or SOMEONE reads as two words, and the wedge bites both letters as it does in BREAK.
  // In BREAK the right half loses the E's stem too (bite), or a hair of it survives between the arms.
  const lines = [[COPY.hit3[0], ly1, h1, 41, 3, 8, 8, 0], [COPY.hit3[1], ly2, h2, 42, 0, 12, 26, 9]];
  for (const [txt, y, h, seed, dx, gap, slip, bite] of lines) {
    const gB = [cB[0] - gap, cB[1]], gF = [cF[0] - gap, cF[1]], rB = [gB[0] + bite, gB[1]], rF = [gF[0] + bite, gF[1]];
    const wd = word(txt, rng(seed), { amt: 1.6, track: 6 });
    const s = h / 140;
    const map = (p) => [L0 - 4 + dx + p[0] * s + (140 - p[1]) * s * 0.06, y + p[1] * s];
    const instsL = [], instsR = [];
    wd.glyphs.filter((g) => g.o.length).forEach((g) => {
      const rs = [g.o, ...g.h].map((r) => r.map(map));
      const Lf = rs.map((r) => clipHalf(r, gB, gF)).filter((r) => r.length > 2), Rr = rs.flatMap((r) => partsOfClip(clipHalf(r, rF, rB), rF, rB)).filter((r) => r.length > 2);
      // a chip narrower than the wedge would only flash when the wedge moves: it goes
      const whole = (piece) => piece.length && Math.abs(polyArea(piece[0])) > 300;
      if (whole(Lf)) instsL.push(Lf);
      if (whole(Rr)) instsR.push(Rr.map((r) => r.map((p) => [p[0] + slip, p[1] + slip * 0.31])));
    });
    noteCut(page, txt, [...instsL, ...instsR], h);
    page.rings(instsL, `fill="${C.douga}"`);
    page.rings(instsR, `fill="${C.douga}"`, { cls: 'crk' });
  }
  // the wedge is driven down the slit: wide at the head, a needle at the foot
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [-dy / l, dx / l]; };
  const n1 = nrm(cH, cB), n2 = nrm(cB, cF);
  const off = (p, n, w) => [p[0] + n[0] * w, p[1] + n[1] * w];
  // where it goes through, the blue splinters into the ink: one burst, heavy at the edge, needles short of the words,
  // with the third hit's one tone above ink behind them
  const k = (cH[1] - e2(cH[0])) / ((e2(cB[0]) - e2(cH[0])) - (cB[1] - cH[1])), hx = cH[0] + (cB[0] - cH[0]) * k;
  const shard = ([d, w, dx, dy]) => [[hx + d - w, e2(hx + d - w)], [hx + d + w, e2(hx + d + w)], [hx + d + dx, e2(hx + d) + dy]];
  page.polys([[-60, 24, -196, 214], [-210, 18, -300, 136], [128, 16, 170, 136]].map(shard), `fill="${C.sumi2}"`);
  page.polys([[-34, 11, -128, 214], [-84, 8, -176, 146], [-150, 13, -214, 262], [-262, 7, -138, 96], [40, 10, 36, 190], [92, 7, 96, 104], [168, 9, 84, 96]].map(shard), `fill="${C.blue}"`);
  const wedge = [off(cH, n1, 40), off(cB, n2, 22), off(cF, n2, 2), off(cF, n2, -2), off(cB, n2, -22), off(cH, n1, -40)];
  page.polys([wedge], `fill="${C.verm}"`, { cls: 'wed' });
}
