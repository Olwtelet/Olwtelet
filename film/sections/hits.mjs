// b1's foot to b4. Hits owns the cut from the card to the episode and the three hits, each washed in the hue its meaning
// calls for, each a still of one beat. The care band (white, on the roll) is the last of the card; under it the night
// begins. b2: bad data, looking up a night street at the tower under a billboard blown out white, its LED sign lit in the
// wrong order. b3: unexpected use, a1's tower upside down and tipped far over, one huge dark shape on a violet field under
// the title, its slit burning white. b4: the break-in, from the floor at the tower's foot in a hall flooded red, its plates
// a wall on a glowing pink floor, its slit cracked open from the floor with static in it and pale light pouring out across
// the floor, a wedge driven in.
// The violet cuts up into b2's lower right corner on the beam angle; b3 to b4 is a hard cut. Each hit's words stay inside
// their own tile.
import { C, W, ANG, rng, lerp, lerpP, dist, clipHalf, clipConvex, partsOfClip, polyArea, bboxOf, baseline, tint, taper, lineSpans, framed } from '../kit/draw.mjs';
import { capOf, measure } from '../kit/type.mjs';
import { word, ringsOf, noteCut } from '../kit/letters.mjs';
import { logo, SLAB_QUAD, T, nameLetters, towerQuad, towerFlat } from '../kit/scene.mjs';
import { nightMap, NW, towerSolid, CEL, rimBand, litZone, skyBands, windows, ledText, ledGrid, hull, inward, rimLights } from '../kit/light.mjs';
import { plateText, arrow } from '../kit/ui.mjs';

const DEG = 180 / Math.PI;
const ROLL = -Math.atan(ANG.roll) * DEG; // the horizon's roll, the care band's angle
const roll = (y590) => (x) => y590 - (x - 590) * ANG.roll; // a line on the roll through (590, y590)
// a point (u along, v down) of a line whose baseline starts at (x, y), turned deg
const frame = (x, y, deg) => {
  const r = deg / DEG, co = Math.cos(r), si = Math.sin(r);
  return (u, v) => [x + u * co - v * si, y + u * si + v * co];
};

export function draw(page, ctx) {
  const { Y, COPY, L0, faces } = ctx;
  const { wide: Wide } = faces;
  const y2 = Y.t, y3 = Y.t + 540, y4 = Y.filmEnd, yE = Y.hitsEnd; // the rows: b2, b3, b4 and the end of the hits
  const cU = roll(Y.care - 43), cL = roll(Y.care + 43);
  // the cut from b2 to b3, on the beam angle: violet rises into b2's lower right corner
  const XA = 1010;
  const cut23 = (x) => (x > XA ? y3 - (x - XA) * ANG.beam : y3);

  night(page, ctx, { top: cL(W + 14) - 1, y2, y3 });
  // the care band: white on the roll, two lines of black capitals inside it; the night shows under its lower edge
  page.polys([[[-14, cU(-14)], [W + 14, cU(W + 14)], [W + 14, cL(W + 14)], [-14, cL(-14)]]], `fill="${C.white}"`);
  const cs = 45, cc = capOf(Wide, cs), gapC = (86 - 2 * cc) / 3;
  const f = frame(L0, cU(L0) + (gapC + cc) / Math.cos(ROLL / DEG), ROLL);
  [COPY.careA, COPY.careB].forEach((s, i) => { const p = f(0, i * (gapC + cc)); page.text(Wide, s.toUpperCase(), p[0], p[1], { size: cs, rot: ROLL, fill: C.black }); });

  violet(page, ctx, { y3, y4, XA, cut23 });
  red(page, ctx, { y4, yE });
}

// ---------------------------------------------------------------- b2: bad data, at night
// The night camera's own street, built as boxes in its world and seen through it: on the pavement at the tower's foot,
// looking up 40 degrees, rolled 15, so every vertical runs to one point far above the right of the frame. Values step far to
// near in flat bands: the sky in hard bands along the camera's horizon; the far megastructures a step off it, crowded with
// tiny lights in runs of floors, thickest round the billboard; the middle blocks darker, their lights bigger and fewer; the
// near block on the left darkest, rising out of the frame, a silhouette with no window lit. Up the canyon, on the nearest
// megastructure, a billboard is blown out: the light of the frame, a near-white core showing the studio's own mark washed
// pale, two opaque straight-edged steps round it, its cyan then teal, cut by everything in front of it, and one long flat
// streak through it. Its light lands as hard cel shapes: a toothed lit zone down the near block's side and a cyan band down
// the upper part of its edge, a cel wedge along the top of each middle block's face at the corner that faces it and a short
// mint band down that corner, a mint wedge down the tower's slab. The tower's LED sign lights its slab, the name in the
// wrong order.
function night(page, ctx, { top, y2, y3 }) {
  const { COPY, faces } = ctx;
  const { wide: Wide, ui: Ui } = faces;
  const o = { from: y2, before: y3 };
  const tx = 604, ty = y2 - 120, map = nightMap({ s: 1, tx, ty });
  const P3 = (X, H, Z) => { const q = NW([X, H, Z]); return [q[0] + tx, q[1] + ty]; };
  const FR = [[-14, y2 - 14], [W + 14, y2 - 14], [W + 14, y3 + 14], [-14, y3 + 14]], FB = [[-14, top], [W + 14, top], ...FR.slice(2)];
  const fit = (p) => clipConvex(p, FR), fitB = (p) => clipConvex(p, FB), ob = { before: y3 }; // fitB, ob: up into b1, under the care band
  // the sky: hard bands parallel to the camera's horizon (far under the frame, falling 15 degrees to the right)
  const far = (a) => P3(-30 + 1e6 * Math.sin(a), 1.6, 1e6 * Math.cos(a));
  skyBands(page, [far(-0.9), far(0.6)], [C.sky1, C.sky2, C.sky3, C.sky4], SKY_OFFS, { top, foot: 40, before: y3 });
  // a block of the street: [direction (x over depth from the camera), depth, width, length, height]; its face toward the
  // camera and the side toward the street, the right one for a block left of the camera
  const block = ([k, Z, w, d, H], lo = 0) => {
    const x0 = -30 + k * Z - w / 2, x1 = x0 + w;
    return { front: [P3(x0, lo, Z), P3(x1, lo, Z), P3(x1, H, Z), P3(x0, H, Z)], side: [P3(x1, lo, Z), P3(x1, lo, Z + d), P3(x1, H, Z + d), P3(x1, H, Z)], H, Z, x0, x1, d };
  };
  // one block: its face, its side a step lighter, then its lights, one set of windows each over the part of the face that
  // shows (the share of its height lit from, to, colours, seed, share of floors lit, window options, share of its width from,
  // to). A block whose roof rises past the seam goes on up into b1's strip of this sky, under the care band, lights and all.
  const street = ([f, fc, sc, sets]) => {
    const b = block(f), tall = bboxOf(b.front)[1] < y2, ft = tall ? fitB : fit, ot = tall ? ob : o;
    page.polys([ft(b.front)], `fill="${fc}"`, ot);
    page.polys([ft(b.side)], `fill="${sc}"`, ot);
    for (const [lo, hi, cols, seed, p, win, u0 = 0, u1 = 1] of sets) {
      const xa = lerp(b.x0, b.x1, u0), xb = lerp(b.x0, b.x1, u1), h0 = f[4] * lo, h1 = f[4] * hi;
      windows(page, [P3(xa, h0, b.Z), P3(xb, h0, b.Z), P3(xb, h1, b.Z), P3(xa, h1, b.Z)], { cell: [20, 8], fx: 0.27, fy: 0.45, col: cols, runs: 2, p, seed, minLen: 3, ...win, ...ot });
    }
    return b;
  };
  FAR.slice(0, FRONT2).forEach(street);
  // the billboard on the nearest megastructure, blown out: a near-white core showing the studio's own mark washed out to a
  // pale tint, its light spread over the night in two opaque straight-edged steps, cyan then teal, cut by everything in front
  // of it, one long flat streak through it
  const [bi, bu0, bu1, bh0, bh1] = BILL, bk = block(FAR[bi][0]), bH = FAR[bi][0][4];
  const bx0 = lerp(bk.x0, bk.x1, bu0), bx1 = lerp(bk.x0, bk.x1, bu1);
  const bp = (u, v) => P3(lerp(bx0, bx1, u), bH * lerp(bh0, bh1, v), bk.Z - 1), bill = [bp(0, 0), bp(1, 0), bp(1, 1), bp(0, 1)];
  HALO.forEach(([r, col]) => page.polys([fitB(grow(bill, r))], `fill="${col}"`, ob));
  page.polys([fitB(bill)], `fill="${C.mintW}"`, ob);
  const [g0, g1, g2, g3] = BILLART;
  towerFlat(page, towerQuad([bp(g0, g3), bp(g1, g3), bp(g1, g2), bp(g0, g2)]), { fill: C.mint, planes: { blade: C.aTealL, side: C.aTealL }, slitFill: C.mintW, ...ob });
  const bc = bp(0.5, 0.5), [s0, s1, s2, s3] = STREAK2;
  page.polys([flat(bc, s0, s1)], tint(C.led, 0.35), ob);
  page.polys([flat(bc, s2, s3)], `fill="${C.mintW}"`, ob);
  FAR.slice(FRONT2).forEach(street);
  // the middle blocks, dark under it and caught in its light at the corner that faces it: a hard cel wedge along the top
  // of the face, and a short mint band down that corner's edge
  const mids = MID.map(street), RM = rng(17);
  page.polys(mids.map((b, i) => { const [c, a, s, k] = MIDLIT[i], f = b.front, tp = f[c === 2 ? 3 : 2], sd = f[c === 2 ? 1 : 0], m = lerpP(lerpP(f[c], tp, a * 0.5), lerpP(f[c], sd, s * 0.5), 0.5); return [f[c], lerpP(f[c], tp, a), lerpP(m, f[c], k), lerpP(f[c], sd, s)]; }), `fill="${C.teal}"`, o);
  page.polys(mids.map((b, i) => { const [e, t0, t1, w] = MIDRIM[i]; return rimBand(b.front, e, w, RM, { spikes: 0, t0, t1, taper: 1 }); }), `fill="${C.mint}"`, o);
  // the near block on the left, darkest, rising out of the frame: its face toward the camera, its street side a step
  // lighter, its foot a band darker, no window lit: a silhouette; the billboard's light landing on the side's far half in two
  // toothed steps, wider toward the light, and a cyan band down the upper part of its edge, the part that sees the billboard
  const [nx0, nx1, nz0, nz1, nh, nf] = NEAR, R2 = rng(41);
  const sideTo = (h) => [P3(nx1, 0, nz0), P3(nx1, 0, nz1), P3(nx1, h, nz1), P3(nx1, h, nz0)], nside = sideTo(nh);
  page.polys([fitB([P3(nx0, 0, nz0), P3(nx1, 0, nz0), P3(nx1, nh, nz0), P3(nx0, nh, nz0)])], `fill="${C.navy}"`, ob);
  page.polys([fitB(nside)], `fill="${C.wall}"`, ob);
  page.polys([fit(sideTo(nf))], `fill="${C.deep}"`, o);
  NLIT.forEach(([w0, w1, teeth, amp, seed, col]) => page.polys([fitB(litZone(nside, 1, w0, w1, { teeth, amp, seed }))], `fill="${col}"`, ob));
  const [rw, rt0] = NRIM;
  page.polys([fitB(rimBand(nside, 1, rw, R2, { spikes: 0, t0: rt0, t1: 1, taper: 1 })), fitB(rimBand(nside, 2, rw, R2, { spikes: 0 }))].filter((r) => r.length > 2), `fill="${C.rimCyan}"`, ob);

  // the tower: its walls and faces, the cels, and the cyan of the billboard and of the LED on the edges that face them
  const { fronts, walls } = towerSolid(map);
  const R = rng(23);
  const rl = RIMS;
  const up = (p) => bboxOf(p)[1] < y3; // only what reaches above the seam is drawn here
  for (const w of walls) if (up(w.q)) page.polys([w.q], `fill="${w.down ? C.deep : C.wall}"`, o);
  fronts.forEach((fc, k) => up(fc) && page.polys([fc], `fill="${[C.shade, C.face, C.wall, C.face, C.shade, C.wall][k]}"`, o));
  page.polys(CEL.map((pts) => pts.map((p) => map(p))).filter(up), `fill="${C.wall}"`, o);
  page.polys(rl.map(([k, i, t0, t1, w, spikes]) => rimBand(fronts[k], i, w, R, { t0, t1, spikes, clip: hull(fronts[k]) })), `fill="${C.rimCyan}"`, o);

  // the LED sign on the slab: TLOEWTLE, the name in the wrong order, two letters in the wrong colour, two rows dead
  const q = SLAB_QUAD.map((p) => map(p)); // foot left, foot right, head right, head left
  const sq = (u, v) => lerpP(lerpP(q[1], q[0], v), lerpP(q[2], q[3], v), u);
  const ls = 130, g = ledGrid(ls), vb = 0.13;
  let u0 = 0.25;
  while (sq(u0, vb)[1] > y3 - 8) u0 += 0.002;
  const m = baseline(sq(u0, vb), sq(0.95, vb));
  const P = (u, v) => [m[4] + m[0] * u + m[2] * v, m[5] + m[1] * u + m[3] * v];
  const lw = measure(faces.led, COPY.wrongLetters, ls), pad = 14;
  const panel = clipConvex([P(-pad, -g.cap - pad), P(lw + pad, -g.cap - pad), P(lw + pad, pad), P(-pad, pad)], hull(fronts[0]));
  // its light on the slab round it: one hard cel shape, cut in spikes; the panel flat
  page.polys([clipConvex(spill(panel, 74, rng(7)), hull(fronts[0]))], `fill="${C.ledOff}"`, o);
  // the billboard's light down the slab's edge that faces it: one hard mint wedge, widest at the top, under the panel
  page.polys([clipHalf(litZone(fronts[0], 4, WEDGE2[0], WEDGE2[1], { teeth: 3, amp: 16, seed: 9 }), [W, y2 + WEDGE2[2]], [0, y2 + WEDGE2[2]])], `fill="${C.mint}"`, o);
  page.polys([panel], `fill="${C.panel}"`, ob);
  const led = ledText(page, COPY.wrongLetters, 0, 0, ls, C.led, { matrix: m, dim: 0.4, colors: { 2: C.amber, 5: C.amber }, ...o });
  const k = Math.round((-0.25 * g.cap - g.y) / g.pitch), dv0 = g.y + (k - 0.5) * g.pitch, dv1 = dv0 + 2 * g.pitch;
  page.polys([[P(-6, dv0), P(led.width + 6, dv0), P(led.width + 6, dv1), P(-6, dv1)]], `fill="${C.panel}"`, o);

  // BAD / DATA, on the near block's dark in the canyon's dark teal, well under the LED and the billboard, turned against the
  // roll
  const TT = TITLE, hs = TT[4], hl = 1.12 * capOf(Wide, hs);
  const f = frame(TT[0], y2 + TT[1], TT[2]);
  COPY.hit1.forEach((s, i) => { const p = f(i * TT[3], i * hl); page.text(Wide, s.toUpperCase(), p[0], p[1], { size: hs, rot: TT[2], fill: TT[5], ...o }); });

  // the flag: a red plate on the slab beside the second wrong letter
  const at = P(led.width * PLATE[2], -g.cap - pad), pw = measure(Ui, COPY.noteWrong.toUpperCase(), 41), pr = (PLATE[3] * Math.PI) / 180;
  plateText(page, Ui, COPY.noteWrong, at[0] + PLATE[0] - pw * Math.cos(pr), at[1] + PLATE[1] - pw * Math.sin(pr), { size: 41, plate: C.rLine, ink: C.rDeep, upper: true, rot: PLATE[3], ...o });
}
// a convex panel grown by r on every side, its corners mitred: a light's straight-edged step
function grow(poly, r) {
  const c = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length], L = dist(a, b), m = lerpP(a, b, 0.5);
    let n = [(b[1] - a[1]) / L, (a[0] - b[0]) / L];
    if (n[0] * (m[0] - c[0]) + n[1] * (m[1] - c[1]) < 0) n = [-n[0], -n[1]];
    return [[a[0] + n[0] * r, a[1] + n[1] * r], [b[0] - a[0], b[1] - a[1]]];
  });
  return lines.map(([p, d], i) => {
    const [q, e] = lines[(i + lines.length - 1) % lines.length], den = d[0] * e[1] - d[1] * e[0], t = ((q[0] - p[0]) * e[1] - (q[1] - p[1]) * e[0]) / den;
    return [p[0] + d[0] * t, p[1] + d[1] * t];
  });
}
// a flat horizontal streak through c: len either side, w thick at its middle, pointed at both ends
const flat = ([x, y], len, w) => [[x - len, y], [x - len * 0.3, y - w / 2], [x + len * 0.3, y - w / 2], [x + len, y], [x + len * 0.3, y + w / 2], [x - len * 0.3, y + w / 2]];
// a light's hard cel shape round a convex panel: the panel grown by about r, its outline broken into spikes
function spill(poly, r, R) {
  const c = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]), out = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length];
    for (let t = 0; t < 1; t += 0.2) {
      const p = lerpP(a, b, t), d = dist(p, c), g = r * (t % 0.4 < 0.2 ? 0.55 + R() * 0.3 : 1 + R() * 0.6);
      out.push([p[0] + ((p[0] - c[0]) / d) * g, p[1] + ((p[1] - c[1]) / d) * g]);
    }
  });
  return out;
}
// the sky's band edges, as heights above the camera's horizon; the far lights' windows; the far megastructures and the
// middle blocks: [block [direction, depth, width, length, height], face, side, light sets [share of the height lit from, to,
// colours, seed, share of floors lit, window options, share of its width from, to]] (lights only where the face shows); the
// far megastructures drawn behind the billboard (the rest stand in front of it); the billboard [megastructure, share of its
// width from, to, of its height from, to], its halo's opaque steps [reach, colour], widest first, its picture [share of its
// width from, to, of its height from, to] and its streak [reach, thickness of the cyan, of the core]; the middle blocks'
// cel wedges [corner, share of the roof, of the side, the wedge's notch] and mint bands [edge, t0, t1, width]; the near
// block [x0, x1, z0, z1, height, height of its dark foot] in the camera's world, its lit zone's steps [width at the foot, at
// the top, teeth, their reach, seed, colour] and its cyan band [width, from where up the edge]; the slab's mint wedge [width at its foot, at its head]; the title [x, y under the seam, turn, second
// line's offset, size, colour]; the plate [dx, dy from the panel's edge, share along the word, turn]; the tower's rims
// [face, edge, t0, t1, width]
const SKY_OFFS = [660, 540, 430];
const WIN = { cell: [20, 8], fx: 0.22, fy: 0.42, runs: 2, minLen: 4 };
const FAR = [
  [[-0.95, 3600, 1000, 300, 2900], C.sky2, C.sky1, []],
  [[-0.62, 3200, 900, 300, 2600], C.sky2, C.sky1, [[0.5, 1, [C.led], 11, 0.7, WIN, 0.4, 1]]],
  [[-0.14, 3000, 700, 300, 2900], C.sky2, C.sky1, [[0.2, 1, [C.amber, C.mint], 13, 0.9, WIN, 0, 0.75]]],
  [[-0.42, 2500, 520, 200, 2350], C.sky3, C.sky2, [[0.15, 1, [C.mint, C.led], 15, 0.95, WIN, 0.25, 1]]],
  [[-0.24, 2400, 150, 200, 2250], C.far2, C.far, [[0.2, 1, [C.amber, C.led], 16, 0.8, { ...WIN, cell: [24, 8] }]]],
];
const MID = [
  [[-0.5, 900, 120, 120, 560], C.far2, C.wall, [[0.2, 0.9, [C.led, C.amber], 6, 0.85, { cell: [21, 12], fx: 0.45, fy: 0.36, runs: 3, minLen: 1 }]]],
  [[-0.3, 1000, 110, 120, 540], C.far2, C.wall, [[0.2, 0.92, [C.amber, C.mint], 9, 0.85, { cell: [21, 12], fx: 0.45, fy: 0.36, runs: 3, minLen: 1 }]]],
];
const BILL = [3, 0.1, 0.9, 0.62, 0.99];
const FRONT2 = 4;
const HALO = [[40, C.teal], [18, C.led]];
const BILLART = [0.18, 0.82, 0.12, 0.88];
const STREAK2 = [300, 10, 200, 3];
const MIDLIT = [[2, 0.7, 0.18, -0.4], [3, 0.8, 0.16, -0.4]];
const MIDRIM = [[1, 0.86, 1, 14], [3, 0, 0.14, 14]];
const NEAR = [-400, -130, 110, 200, 700, 18];
const NRIM = [12, 0.3];
const NLIT = [[34, 120, 4, 24, 12, C.face], [12, 54, 3, 14, 13, C.face2]];
const WEDGE2 = [0, 52, 190];
const TITLE = [92, 160, -8, 0, 118, C.teal];
const PLATE = [-30, 14, 0.25, 15];
const RIMS = [[0, 1, 0.1, 0.62, 14, 1], [1, 0, 0.18, 0.66, 12, 1], [0, 4, 0.45, 0.95, 16, 0]];
// ---------------------------------------------------------------- b3: unexpected use, violet
// a1's own tower, the hero card's outline, upside down and tipped far over, huge and dark on a lavender field: one flat
// silhouette hanging into the frame from under the title, falling point first toward the bottom left of the middle, its
// slab across the frame with the name up it, reading upside down, cut through to the field, the slab's tip out of the frame
// below. UNEXPECTED runs across the top on the field, USE under it on the field, clear of the mass. Low in the frame, under
// the point, a slit of white light: lens streaks run in at it from both sides, and the edges that face it carry the only
// light on the mass, a crescent of the lit violet and a straight band of lavender white. The tower's own slit burns white in
// a tight pink step. The one upright thing is the cyan note, an arrow pointing straight up.
function violet(page, ctx, { y3, y4, XA, cut23 }) {
  const { COPY, L0, faces } = ctx;
  const { wide: Wide, ui: Ui } = faces;
  const o = { from: y3, before: y4 };
  // the lavender field, cutting up into b2's lower right corner on the beam angle
  const field = [[-14, y3], [XA, y3], [W + 14, cut23(W + 14)], [W + 14, y4 + 14], [-14, y4 + 14]];
  page.polys([field], `fill="${C.vField}"`, { before: y4 });
  // the tower as the hero card draws it (T), turned th, scaled s, its point at (ax, ay) under the row's top; everything of
  // it cut along the title band's lower edge, so it hangs into the frame from under the words
  const [th, s, ax, ay] = MASS, t = th / DEG, co = Math.cos(t), si = Math.sin(t), c0 = T([524.5, 512]);
  const R0 = (p) => { const q = T(p), x = (q[0] - c0[0]) * s, y = (q[1] - c0[1]) * s; return [x * co - y * si, x * si + y * co]; };
  const tip = R0(logo.slice(0, 6).flat().reduce((a, p) => (p[1] < a[1] ? p : a)));
  const Q = (p) => { const q = R0(p); return [q[0] - tip[0] + ax, q[1] - tip[1] + y3 + ay]; };
  const planes = logo.slice(0, 6).map((p) => p.map(Q)), at = (p) => [p[0], y3 + p[1]];
  const A = [-14, y3 + CROP3], B = [W + 14, y3 + CROP3], cut = (list) => list.flatMap((p) => partsOfClip(clipHalf(p, A, B), A, B)).filter((p) => p.length > 2);
  // the light: a slit of white low in the frame under the point, in a tight pink step; lens streaks running in at it from
  // both sides, behind the tower: fat near their heads, long thin tails
  const lens = ([x0, y0, x1, y1, w, k]) => { const a = at([x0, y0]), b = at([x1, y1]), m = lerpP(a, b, k), L = dist(a, b), n = [((a[1] - b[1]) / L) * w / 2, ((b[0] - a[0]) / L) * w / 2]; return [a, [m[0] + n[0], m[1] + n[1]], b, [m[0] - n[0], m[1] - n[1]]]; };
  page.polys([lens(SLIT_LOW[1])], `fill="${C.pinkW}"`, o);
  page.polys([...LINES3, SLIT_LOW[0]].map(lens), `fill="${C.lavW}"`, o);
  // the silhouette: the six planes as one dark mass, its joints closed (the two legs left open on their lit edges, where a
  // closing line would sit on the light)
  page.polys(cut(planes.slice(2)), framed(C.vDeep, C.vDeep, 5), o);
  page.polys(cut(planes.slice(0, 2)), `fill="${C.vDeep}"`, o);
  // the low slit's light on the edges that face it: a crescent of the lit violet inside the blade's long outer edge, and a
  // straight band of lavender white on every edge of the two legs turned down to it
  const [ck, ci, cj, cw, c0t, c1t] = CRES3;
  page.polys(cut([crescent(planes[ck], ci, cj, cw, c0t, c1t)]), `fill="${C.vMid}"`, o);
  const [lit] = rimLights(planes, { R: rng(31), lights: [{ dir: LIGHT3, col: C.lavW, min: 0.4 }], width: RIM3, skip: [2, 3, 4, 5], spikes: 0 });
  page.polys(cut(lit.bands), `fill="${C.lavW}"`, o);
  // the name up the slab, cut through all of it to the field
  page.rings(nameLetters.map((rs) => cut(rs.map((r) => r.map(Q)))).filter((rs) => rs.length), `fill="${C.vField}"`, o);
  // the slit, opened along its axis and burning white in one tight pink step
  const SA = Q(SLIT_AXIS[0]), SM = Q(SLIT_AXIS[1]), SB = Q(SLIT_AXIS[2]), w = SLIT3;
  page.polys([taper([SA, SM, SB], { w: w + 12, prof: (v) => Math.min(1, v * 5) * (1 - v * 0.6), n: 10 })], `fill="${C.pinkW}"`, o);
  page.polys([taper([SA, SM, SB], { w, prof: (v) => Math.min(1, v * 5) * (1 - v * 0.75), n: 10 })], `fill="${C.lavW}"`, o);

  // UNEXPECTED across the top, USE under it, both dark on the field, clear of the mass
  const [b1, s1, b2, s2] = TITLE3;
  page.text(Wide, COPY.hit2[0].toUpperCase(), L0, y3 + b1, { size: s1, fill: C.vDeep, ...o });
  page.text(Wide, COPY.hit2[1].toUpperCase(), L0, y3 + b2, { size: s2, fill: C.vDeep, ...o });
  // the one upright thing: the note on a strip of the tower's dark, cyan type and a cyan arrow pointing straight up
  const N3 = NOTE3, note = COPY.noteUp.toUpperCase(), nw = measure(Ui, note, 41), [nx, ny] = at(N3), nc = capOf(Ui, 41);
  page.polys([[[nx - 14, ny - nc - 14], [nx + nw + 50, ny - nc - 14], [nx + nw + 50, ny + 14], [nx - 14, ny + 14]]], `fill="${C.vDeep}"`, o);
  page.text(Ui, note, nx, ny, { size: 41, fill: C.prog, ...o });
  arrow(page, [nx + nw + 24, ny + 4], [nx + nw + 24, ny - N3[2]], 10, C.prog, o);
}
// a crescent inside the edge of a polygon from its point i to its point j (straight enough to be one edge): its inner edge a
// smooth curve, w at the middle of the stretch t0 to t1 and nothing at its ends; cut to the polygon's hull
function crescent(poly, i, j, w, t0, t1) {
  const a = poly[i], b = poly[j], [nx, ny] = inward(poly, i), out = [];
  for (let k = 0; k <= 16; k++) { const t = k / 16, q = lerpP(a, b, lerp(t0, t1, t)), d = w * Math.sin(Math.PI * t) ** 0.7; out.push([q[0] + nx * d, q[1] + ny * d]); }
  return clipConvex(out, hull(poly));
}
// the tower [turn, scale, its point's x and y under the row's top] and the title band's lower edge it hangs from (under the
// row's top); the light's direction from the mass; the rim's width; the crescent [plate, its points i and j, width, from, to
// along that edge]; the slit's axis (logo) and its widest; the lens streaks and the low slit of light [x, y of the tail, x, y
// of the head (under the row's top), thickness, where it is fattest] (the slit's pink step after it); the title
// [UNEXPECTED's baseline under the row's top, size, USE's baseline, size]; the note [x, baseline under the row's top, arrow
// length]
const MASS = [236, 1.0, 470, 512];
const CROP3 = 122;
const LIGHT3 = [0.1, 1];
const RIM3 = 10;
const CRES3 = [1, 0, 2, 48, 0.03, 0.85];
const SLIT_AXIS = [[455, 302], [484, 353], [546, 692]];
const SLIT3 = 14;
const LINES3 = [[-14, 330, 400, 446, 18, 0.85], [-14, 410, 360, 452, 12, 0.85], [150, 300, 430, 440, 10, 0.85], [1214, 420, 760, 452, 16, 0.85], [1214, 450, 860, 456, 10, 0.85]];
const SLIT_LOW = [[200, 457, 1100, 457, 16, 0.32], [130, 457, 1180, 457, 32, 0.32]];
const TITLE3 = [104, 118, 262, 124];
const NOTE3 = [110, 440, 56];
// ---------------------------------------------------------------- b4: the break-in, red
// The camera on the floor at the tower's foot, in a hall flooded with the attack red's bright step, a dark step high up,
// where wide shafts of pale light fall and a few small green lights burn far off. The tower's two plates, slab and blade,
// stand as one wall in the attack red's middle step, a step under the hall, their outer edges running together far above.
// The floor glows hot pink and its glow climbs the wall's foot in one hard cel step of the rose. The slit between the plates is cracked open from
// the floor up, full of static, a wedge driven into its head. Its light is the light of the frame: a pale core down to its
// foot, pink lips up both sides, and at the foot it spills out across the floor in a hard wedge widening toward us, the
// floor's cracks running out from it, the wall's shadow either side. The words, pale on the wall, are bitten by it at the
// ends of an E's arms on each line: left parts still, right parts (crk) pushed down the crack.
function red(page, ctx, { y4, yE }) {
  const { COPY, faces } = ctx;
  const { wide: Wide } = faces;
  const o = { before: yE, from: y4 }, at = (x, y) => [x, y4 + y], ys = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));
  const top = -14, [FL, VX, VY] = FLOOR4, toV = (x, y) => x + ((VX - x) * (y - FL)) / (VY - FL); // the vertical through (x, FL) at height y
  // the hall: the attack red's bright step, its dark step high up under a slanted line
  page.polys([[[-14, y4], [W + 14, y4], [W + 14, yE + 14], [-14, yE + 14]]], `fill="${C.atk2}"`, { before: yE });
  const [hl, hr] = HIGH4;
  page.polys([[at(-14, top), at(W + 14, top), at(W + 14, hr), at(-14, hl)]], `fill="${C.atk0}"`, o);
  // its shafts: each one wide band of pale light along the hall's verticals, narrow high up, with a narrow paler core
  const shaft = (x, w, k) => { const c = toV(x, top); return [at(c - w * k * 0.24, top), at(c + w * k * 0.24, top), at(x + w * k / 2, FL), at(x - w * k / 2, FL)]; };
  page.polys(SHAFTS4.map(([x, w]) => shaft(x, w, 1)), `fill="${C.rPink}"`, o);
  page.polys(SHAFTS4.map(([x, w]) => shaft(x, w, 0.16)), `fill="${C.rPinkW}"`, o);
  // far off in the dark, a few small green lights, each with a pale core
  const box = (x, y, w, h) => [at(x, y), at(x + w, y), at(x + w, y + h), at(x, y + h)];
  page.polys(LIGHTS4.map(([x, y, w, h]) => box(x, y, w, h)), `fill="${C.aTeal}"`, o);
  page.polys(LIGHTS4.map(([x, y, w, h]) => box(x + w * 0.35, y + 4, w * 0.3, h - 8)), `fill="${C.aTealL}"`, o);

  // the floor, from the wall's foot to the bottom of the frame: glowing hot pink, the wall's shadow cast toward us either
  // side of the crack's light, the light itself a hard wedge in two steps spilling from the crack's foot,
  // and the floor cracked from that foot, its cracks burning with the same light
  const [cfx, ...wedges] = POUR4, foot = at(cfx, FL), R4 = rng(44);
  const fan = (a, b, k, yb) => { const side = (x) => ys(0, 1, 6).map((t, i) => { const p = lerpP(foot, at(x, yb), t); return [p[0] + (i % 2 ? (R4() - 0.5) * k * t : 0), p[1]]; }); return [foot, ...side(a).slice(1), ...side(b).slice(1).reverse()]; };
  page.polys([[at(-14, FL), at(W + 14, FL), at(W + 14, 694), at(-14, 694)]], `fill="${C.pink}"`, o);
  page.polys([...CAST4.map((q) => q.map(([x, y]) => at(x, FL + y)))], `fill="${C.rBody}"`, o);
  wedges.forEach(([a, b, k, yb], i) => page.polys([fan(a, b, k, yb)], `fill="${[C.rPink, C.rPinkW][i]}"`, o));
  const spines = [];
  FLOORCRACKS.forEach(([from, ex, ey, w, seed]) => { const a = from < 0 ? foot : spines[from][2], s = crackLine(a, at(ex, ey), rng(seed)); spines.push(s); page.polys([taper(s, { w, prof: (t) => 1 - t * 0.9, n: 0 })], `fill="${C.rPink}"`, o); });

  // the wall: the slab on the left and the blade on the right, their outer edges running to one point far above; between them
  // the crack, the slit opened from the floor up, a needle at its foot, opening fast near its head where the wedge goes in
  const [hx, hy, w0, w1, pw] = CRACK4, axis = (y) => lerp(cfx, hx, (FL - y) / (FL - hy));
  const wid = (y) => lerp(w0, w1, Math.max(0, Math.min(1, (FL - y) / (FL - hy))) ** pw);
  const lx = (y) => axis(y) - wid(y) * 0.45, rx = (y) => axis(y) + wid(y) * 0.55;
  const edge = (f, a, b, n, g = 0) => ys(a, b, n).map((y) => at(f(y) + g, y));
  const [sl0, bl0] = PLATES4;
  const slab = [at(sl0, FL), ...edge(lx, FL, top, 10), at(toV(sl0, top), top)];
  const blade = [...edge(rx, FL, top, 10), at(toV(bl0, top), top), at(bl0, FL)];
  page.polys([slab, blade], `fill="${C.atk1}"`, o);
  // the floor's glow up the wall's foot: one hard cel step of the rose, tallest at the crack where the pour is brightest
  const [ga, gb] = GLOW4;
  page.polys([litZone(slab, 0, ...ga), litZone(blade, blade.length - 1, ...gb)], `fill="${C.rBody}"`, o);
  // a toothed band along one edge of the crack (side -1 its left, 1 its right) from ya to yb, wa wide at ya and wb at yb
  const along = (side, seed, ya, yb, wa, wb, n) => { const R = rng(seed), f = side < 0 ? lx : rx, pts = ys(ya, yb, n).map((y, i) => at(f(y) + side * lerp(wa, wb, (y - ya) / (yb - ya)) * (i % 2 ? 0.35 + R() * 0.4 : 1 + R() * 0.5), y)); return [...pts, ...edge(f, yb, ya, 2, -side * 2)]; };
  // its light thrown onto the plates either side of its foot as hard cel shapes, uneven so they never mirror
  CEL4.forEach(([side, seed, yb, wa, n, col]) => page.polys([along(side, seed, FL - 2, yb, wa, 0, n)], `fill="${col}"`, o));
  page.polys([along(-1, 21, FL - 8, top, LIP4 * 0.4, LIP4 * 1.2, 18), along(1, 22, FL - 8, top, LIP4 * 0.4, LIP4 * 1.2, 18)], `fill="${C.pink}"`, o);
  // inside: static where it is open; a pale core from there to its foot, burning out onto the floor
  const span = (a, b, n, g = 0) => [...edge(lx, a, b, n, -g), ...edge(rx, b, a, n, g)];
  const yS = STATIC4;
  page.polys([span(FL + 4, yS - 6, 6, 2)], `fill="${C.rPinkW}"`, o);
  blocks(page, span(yS, top, 14), rng(4), o);

  // the words, pale on the wall, each line bitten by the crack at the ends of an E's arms: the E of SOMEONE, the E of BREAK
  const [t1, t2] = COPY.hit3.map((t) => t.toUpperCase());
  const [s1, b1, s2, b2, ek] = TYPE4;
  [[t1, s1, b1, t1.indexOf(' ') + 4], [t2, s2, b2, t2.indexOf(' ') + 3]].forEach(([str, size, bl, k]) => {
    const y = y4 + bl, cap = capOf(Wide, size), wl = measure(Wide, str.slice(0, k), size), wc = measure(Wide, str[k], size);
    const x0 = axis(bl - cap / 2) - wl - wc * ek;
    page.text(Wide, str.slice(0, k), x0, y, { size, fill: C.rPinkW, ...o });
    page.text(Wide, str.slice(k + 1), x0 + wl + wc, y, { size, fill: C.rPinkW, cls: 'crk', ...o });
    // the bitten letter in cut letters: what is left of it either side of the crack
    const g = word(str[k], null).glyphs[0], kk = cap / 140, rs = ringsOf(g).map((r) => r.map((p) => [x0 + wl + p[0] * kk, y - cap + p[1] * kk]));
    const side = (f, s) => { const a = [f(bl - cap - 10), y - cap - 10], b = [f(bl + 10), y + 10], [p, q] = s < 0 ? [a, b] : [b, a]; return rs.flatMap((r) => partsOfClip(clipHalf(r, p, q), p, q)).filter((r) => r.length > 2 && Math.abs(polyArea(r)) > 40); };
    const left = side(lx, -1), right = side(rx, 1);
    noteCut(page, str[k], [left], cap);
    page.rings([left], `fill="${C.rPinkW}"`, o);
    if (right.length) page.rings([right], `fill="${C.rPinkW}"`, { cls: 'crk', ...o });
  });

  // the wedge, driven down into the crack's head from above: the darkest red, the red light on its two long edges
  const [wl0, wr0, wt] = WEDGE4, tip = at(axis(wt), wt);
  const wedge = [at(axis(top) + wl0, top), at(axis(top) + wr0, top), at(rx(wt - 40) + 6, wt - 40), tip, at(lx(wt - 30) - 4, wt - 30)];
  page.polys([wedge], `fill="${C.rDeep}"`, { cls: 'wed', ...o });
  page.polys([1, 4].map((i) => rimBand(wedge, i, 12, rng(9 + i), { spikes: 1, t0: 0.05, t1: 0.95 })), `fill="${C.rLine}"`, { cls: 'wed', ...o });
}
// a crack in the floor from a to b: a jagged line, a few kinks thrown sideways
function crackLine(a, b, R) {
  const n = 5, L = dist(a, b), u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], v = [-u[1], u[0]], mid = [];
  for (let i = 1; i < n; i++) { const t = i / n, k = (R() - 0.5) * L * 0.14; mid.push([a[0] + u[0] * L * t + v[0] * k, a[1] + u[1] * L * t + v[1] * k]); }
  return [a, ...mid, b];
}
// static as sharp blocks: the static's black ground, then rectangles of its white (now and then pink or black), mixed in
// size, laid in rows, every one cut to the area at build time
function blocks(page, area, R, o) {
  const [x0, y0, x1, y1] = bboxOf(area), spans = (yy) => lineSpans([x0 - 1, yy], [x1 + 1, yy], area).map(([a, b]) => [lerp(x0 - 1, x1 + 1, a), lerp(x0 - 1, x1 + 1, b)]);
  const by = [[], [], []];
  for (let y = y0; y < y1 - 3; ) {
    const h = 3 + Math.floor(R() * (R() < 0.3 ? 12 : 6));
    for (let x = x0 + R() * 8; x < x1; ) {
      const w = R() < 0.25 ? 3 + R() * 8 : 8 + R() * 34, c = R() < 0.42 ? 0 : R() < 0.15 ? 2 : -1;
      if (c >= 0) for (const [a0, a1] of spans(y + 0.5)) for (const [b0, b1] of spans(y + h - 0.5)) { const l = Math.max(x, a0, b0), r = Math.min(x + w, a1, b1); if (r - l >= 2.5) by[c].push([[l, y], [r, y], [r, y + h], [l, y + h]]); }
      x += w + (R() < 0.5 ? 1 + R() * 4 : 6 + R() * 18);
    }
    y += h + (R() < 0.6 ? 0 : 1 + Math.floor(R() * 3));
  }
  page.polys([area], `fill="${C.stK}"`, o);
  [C.stW, C.stK, C.stP].forEach((col, i) => by[i].length && page.polys(by[i], `fill="${col}"`, o));
}
// the hall's dark step [its edge under the row's top at the left, at the right]; the floor [the wall's foot under the
// row's top, the point far above where the hall's verticals meet (x, y under the row's top)]; the shafts [x at the floor,
// width there]; the far green lights [x, y, width, height]; the pour [the crack's foot x, then each step's edges where it
// ends, the reach of its teeth, the y it reaches, the widest first]; the shadows cast either side [points, x and depth under
// the foot]; the floor's cracks [the crack it branches from (-1: the crack's foot), x, y of its end, width at its start,
// seed]; the plates [the slab's outer edge at the floor, the blade's]; the crack [its head x, y, its width at the foot, at
// the head, how late it opens]; the lips' width; the floor's glow on the wall [width at the outer corner, at the crack,
// options] for the slab and the blade; the crack's cel light on the plates [side, seed, its top under the row's top, width
// at the foot, teeth, colour]; where the static starts; the words [sizes and baselines under the row's top, where across the
// bitten E the crack runs]; the wedge [its left and right corners at the top from the crack, the tip under the row's top]
const HIGH4 = [70, 34];
const FLOOR4 = [400, 600, -700];
const SHAFTS4 = [[-80, 70], [1240, 90]];
const LIGHTS4 = [[80, 8, 14, 46], [102, 34, 10, 26], [1046, 4, 12, 40], [1072, 22, 9, 24], [1150, 6, 11, 32]];
const POUR4 = [600, [300, 930, 90, 694], [520, 690, 40, 694]];
const CAST4 = [[[-14, 120], [150, 0], [260, 0], [60, 280], [-14, 280]], [[960, 0], [1070, 0], [1214, 150], [1214, 280], [1170, 280]]];
const FLOORCRACKS = [[-1, -14, 476, 5, 3], [-1, 230, 694, 5, 5], [-1, 1214, 470, 5, 6], [-1, 1000, 694, 4, 7], [1, 40, 640, 3, 8]];
const PLATES4 = [110, 1100];
const CRACK4 = [470, 30, 5, 76, 3];
const LIP4 = 7;
const GLOW4 = [[30, 92, { teeth: 2, amp: 8, seed: 71 }], [26, 80, { teeth: 2, amp: 8, seed: 72 }]];
const CEL4 = [[-1, 31, 340, 46, 5, C.rPink], [1, 32, 352, 30, 4, C.rPink]];
const STATIC4 = 230;
const TYPE4 = [60, 200, 100, 318, 0.8];
const WEDGE4 = [-50, 160, 120];
