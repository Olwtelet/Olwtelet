// c5. Two frames cut hard at x 750.
// c5-brain, the vault, mid-run: a white-hot core torn open at the right sprays its light one way, a fan of hard rays to the
// left; behind it the vault's dark planes catch the light only on the edges that face the core. The three notes fly out of
// the core along the spray as dark type on streaks of light, their tails and speed lines toward the core, small near it and
// large where they reach the camera. Torn white shards break off round the core. The vault's name sits on a dark slab tilted
// into the burst, lit on the edges that face the core.
// c5-study, the institution: a teal classroom from a low seat close under the board, looking up, so the verticals meet
// above the frame and the front wall recedes to the corner. A tall casement in the side wall next to the corner is blown
// out; its two panes land on the wall and across the board's end as hard sheared patches, and the air between shows in two
// steps. Index cards are pinned on the wall, cream where the light falls and teal in the shade; the coursework is chalked on
// the board, hot where the light crosses it. Two desks stand before the board, the nearest darkest and rimmed thick.
import { C, rng, clipConvex, homography, dist, tint } from '../kit/draw.mjs';
import { capOf } from '../kit/type.mjs';
import { hull, inward, inside } from '../kit/light.mjs';

const RAD = Math.PI / 180;

export function draw(page, ctx) {
  const { Y, COPY, faces } = ctx;
  const y0 = Y.study, y1 = Y.credits, ui = faces.ui;
  const keep = { from: y0, before: y1 };
  const D = { cls: 'd', ...keep }, M = { cls: 'm', ...keep };
  const P = ([x, y]) => [x, y0 + y], Ps = (poly) => poly.map(P);
  const fill = (col) => `fill="${col}"`;

  // ---- c5-brain: the vault ----
  const frameB = [[-14, -14], [750, -14], [750, 314], [-14, 314]];
  const K = [600, 150];
  const at = (a, r) => [K[0] + Math.cos(a * RAD) * r, K[1] + Math.sin(a * RAD) * r];
  const cuts = (list) => list.map((p) => clipConvex(p, frameB)).filter((p) => p.length > 2).map(Ps);
  // a ray: [angle, half width in degrees, inner radius]; from the core itself when the inner radius is 0
  const ray = ([a, h, r0 = 0]) => [r0 ? at(a, r0) : K, at(a - h, 1100), at(a + h, 1100)];
  // a streak pointed at both ends: [angle, half width, inner radius, outer radius]
  const streak = ([a, h, r0, r1]) => [at(a, r0), at(a - h, (r0 + r1) / 2), at(a, r1), at(a + h, (r0 + r1) / 2)];
  const RB = rng(2417);
  // the spray: n rays inside the fan a0..a1 (angles down from the right, so 180 is straight left), bunched: each gap is
  // drawn from a wide spread, so some rays crowd and some stand alone
  const fan = (n, a0, a1, hLo, hHi, r0Lo, r0Hi) => {
    const g = Array.from({ length: n + 1 }, () => 0.25 + RB() * RB() * 2.6), T = g.reduce((p, q) => p + q, 0);
    let a = a0;
    return g.slice(0, n).map((d) => { a += ((a1 - a0) * d) / T; return [a, hLo + RB() * RB() * (hHi - hLo), r0Lo + RB() * (r0Hi - r0Lo)]; });
  };
  page.polys([Ps(frameB)], fill(C.gDeep), keep);
  // the vault behind the core, in shade: two flat planes, lit only on the edges that face the core
  const PA = [[612, 84], [520, -14], [764, -14], [764, 34]], PB = [[566, 314], [652, 204], [764, 168], [764, 314]];
  page.polys(cuts([PA, PB]), fill(C.gMid), keep);
  // a band inside edge i of a face, w0 wide at its end nearer the core and w1 at the far end
  const lit = (face, i, w0, w1) => { const a = face[i], b = face[(i + 1) % face.length], n = inward(face, i), s = dist(a, K) < dist(b, K) ? [w0, w1] : [w1, w0]; return [a, b, [b[0] + n[0] * s[1], b[1] + n[1] * s[1]], [a[0] + n[0] * s[0], a[1] + n[1] * s[0]]]; };
  page.polys(cuts([lit(PA, 0, 22, 6), lit(PA, 3, 16, 4), lit(PB, 0, 22, 6), lit(PB, 1, 15, 4)]), fill(C.gField), keep);
  page.polys(cuts([[286, 3, 80, 640], [318, 0.6, 70, 560], [342, 2, 90, 500]].map(([a, h, r0, r1]) => streak([a, h, r0, r1]))), fill(C.aTealL), keep);
  // the spray
  page.polys(cuts(fan(10, 144, 242, 2.5, 8, 0, 0).map(ray)), fill(C.gMid), keep);
  page.polys(cuts(fan(9, 148, 238, 1, 4.4, 0, 70).map(ray)), tint(C.gField, 0.5), keep);
  page.polys(cuts(fan(17, 150, 236, 0.3, 2.6, 0, 170).map(ray)), fill(C.gField), keep);
  page.polys(cuts(fan(13, 150, 236, 0.08, 0.3, 50, 220).map(([a, h, r0]) => streak([a, h, r0, r0 + 220 + RB() * 520]))), fill(C.aTealL), keep);
  // the core in hard steps, stretched along the spray: field-green flare, pale flare, white-hot heart, each a torn star whose
  // long points fly with the spray. A step: n points round at radius r (uneven by j), with flares [angle, length, half width]
  const step = (n, r, j, flares, seed) => {
    const Rs = rng(seed), rr = (a) => r * (1 + 0.5 * Math.max(0, Math.cos((a - 190) * RAD)));
    const pts = Array.from({ length: n }, (_, i) => [(360 * i) / n, rr((360 * i) / n) * (1 - j + Rs() * j * 2)]);
    for (const [a, len, h] of flares) pts.push([a - h, rr(a) * 0.9], [a, len], [a + h, rr(a) * 0.9]);
    return pts.sort((p, q) => p[0] - q[0]).map(([a, q]) => at(a, q));
  };
  page.polys(cuts([step(22, 64, 0.12, [[156, 220, 4], [170, 270, 4], [186, 240, 5], [203, 210, 4], [222, 170, 5], [292, 100, 6], [36, 96, 7], [104, 96, 6]], 3)]), fill(C.gField), keep);
  page.polys(cuts([step(18, 42, 0.1, [[164, 150, 6], [182, 170, 5], [200, 130, 6], [226, 104, 6]], 4)]), fill(C.aTealL), keep);
  page.polys(cuts([step(14, 26, 0.1, [[176, 78, 9], [198, 66, 9]], 5)]), fill(C.gWhite), keep);
  // torn shards breaking off round the core along the spray: thin white crescents, ragged on the outside
  const shard = (r, a0, a1, th, spikes, seed) => {
    const Rs = rng(seed), n = 12, out = [], inn = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, a = a0 + (a1 - a0) * t, pr = Math.pow(Math.sin(Math.PI * t), 0.7);
      out.push(at(a, r + th * pr));
      if (spikes.includes(i)) out.push(at(a - (a1 - a0) * 0.07, r + th * pr * (2.6 + Rs())), at(a - (a1 - a0) * 0.04, r + th * pr));
      inn.push(at(a, r - th * 0.3 * pr * (0.7 + Rs() * 0.6)));
    }
    return [...out, ...inn.reverse()];
  };
  page.polys(cuts([shard(92, 198, 240, 8, [4, 8], 1), shard(104, 124, 158, 8, [3, 7], 2), shard(156, 132, 152, 5, [6], 3), shard(74, 240, 266, 5, [6], 4)]), fill(C.gWhite), keep);

  // the name on a dark slab tilted into the burst: its corners [u, v] in its own frame, from the title's baseline start (ox, oy)
  // turned rot degrees; the right end is cut along the rays. No line round it: only the edges that face the core catch the
  // light, the right end (wR) and the bottom, fading away from the core (wB to nothing).
  const slab = (ox, oy, rot, corners, wR, wB, lines, o) => {
    const co = Math.cos(rot * RAD), si = Math.sin(rot * RAD), T = ([u, v]) => [ox + u * co - v * si, oy + u * si + v * co];
    const q = corners.map(T), k = q.length;
    page.polys([Ps(q)], fill(C.gDeep), o);
    page.polys(cuts([...q.slice(1, k - 2).map((_, i) => lit(q, i + 1, wR, wR)), lit(q, k - 2, wB, 1.5)]), fill(C.gField), o);
    for (const [str, v, size, col] of lines) page.text(ui, str, ox - v * si, y0 + oy + v * co, { size, rot, fill: col, ...o });
  };
  slab(92, 84, -5, [[-60, -36], [384, -36], [432, 40], [-60, 40]], 9, 7, [[COPY.brainTitle, 0, 38, C.gWhite], [COPY.brainTarget, 28, 20, C.gField]], D);
  slab(84, 79, -5, [[-60, -33], [398, -33], [366, 44], [312, 80], [-60, 80]], 10, 8, [[COPY.brainTitle, 0, 41, C.gWhite], ...COPY.brainPhone.map((l, i) => [l, 36 * (i + 1), 41, C.gField])], M);

  // the notes: dark type on a streak of light along its ray, slanted for speed. Each flies out of the core: its streak's long
  // tail and its speed lines run back toward the core, its blunt nose points out. Every streak is painted before any word,
  // so no streak crosses a word.
  const SK = -14, words = [];
  const note = (word, s, rot, size, o, lw, tl = 0.6) => {
    const w = page.measure(ui, word, size), c = capOf(ui, size), u = [Math.cos(rot * RAD), Math.sin(rot * RAD)], up = [u[1], -u[0]];
    const sh = c * Math.tan(-SK * RAD), pad = c * 0.42, tail = w * tl, lead = c * 0.9;
    const L = (x, y) => [s[0] + u[0] * x + up[0] * y, s[1] + u[1] * x + up[1] * y];
    const top = [w + pad + sh, c + pad], tip = [w + tail, c * 0.5], bot = [w + pad * 2, -pad];
    page.polys(cuts([[L(-lead, c * 0.5), L(-pad + sh, c + pad), L(...top), L(...tip), L(...bot), L(-pad * 1.5, -pad)]]), fill(C.gField), o);
    // where the tail's edge meets the height y: the speed lines end short of it
    const edge = (y) => { const [a, b] = y > c * 0.5 ? [top, tip] : [bot, tip]; return a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]); };
    const Rn = rng(Math.round(s[0] * 7));
    words.push(() => {
      // speed lines only where the tail is long enough to carry them
      if (tail > c * 2) page.polys(cuts([0.12, 0.36, 0.62, 0.88].map((k) => { const y = c * k, x0 = w + c * (0.3 + Rn() * 0.4) + sh * k, x1 = Math.min(edge(y) - c * 0.3, w + tail * (0.5 + Rn() * 0.45)); return [L(x0, y - lw / 2), L(x0, y + lw / 2), L(x1, y)]; })), fill(C.gDeep), o);
      page.text(ui, word, s[0], y0 + s[1], { size, rot, skew: SK, fill: C.gDeep, ...o });
    });
  };
  // on its ray: the word's inner end r0 from the core at angle a, its middle on the ray
  const onRay = (word, a, r0, size, o, lw, tl) => {
    const w = page.measure(ui, word, size), c = capOf(ui, size), rot = a - 180, e = at(a, r0 + w), n = [Math.sin(rot * RAD), -Math.cos(rot * RAD)];
    note(word, [e[0] - n[0] * c * 0.5, e[1] - n[1] * c * 0.5], rot, size, o, lw, tl);
  };
  const [cs0, code, logs] = COPY.brainNotes.map((w) => w.toUpperCase());
  onRay(cs0, 189, 74, 21, D, 1.6, 0.3);
  onRay(code, 176.5, 116, 32, D, 2.2, 0.45);
  onRay(logs, 165, 180, 54, D, 3.4, 0.6);
  // the phone: too little height for three rays under the slab, so the notes step down and out along the spray, growing
  note(cs0, [262, 186], -5, 41, M, 6, 0.12);
  note(code, [160, 240], -5, 44, M, 6, 0.4);
  note(logs, [72, 294], -5, 48, M, 6, 0.6);
  for (const f of words) f();

  // ---- c5-study: the institution ----
  const frameS = [[750, -14], [1214, -14], [1214, 314], [750, 314]];
  const Fs = (list) => list.map((p) => clipConvex(p, frameS)).filter((p) => p.length > 2).map(Ps);
  // A low seat close under the board, looking up: the verticals meet far above the frame (UPV) and the horizon is the frame's
  // bottom edge, so the front wall recedes along it to the corner at the right (its horizontals meet at VPR, far right) and
  // the side wall's at VPL. H: the front wall (u along it from its left end to the corner at 450, v down from the ceiling to
  // the floor) to the screen; its ceiling line on screen is under 0.6 of its floor line.
  const UPV = [950, -600], VPL = [330, 300], WALL = [[781, -80], [1099, -5], [1195, 381], [619, 420]], RECT = [[0, 0], [450, 0], [450, 300], [0, 300]];
  const H = homography(RECT, WALL), Hi = homography(WALL, RECT);
  const Hs = (list) => Fs(list.map((p) => p.map(H)));
  const meet = (a1, a2, b1, b2) => { const d = (a1[0] - a2[0]) * (b1[1] - b2[1]) - (a1[1] - a2[1]) * (b1[0] - b2[0]), t = ((a1[0] - b1[0]) * (b1[1] - b2[1]) - (a1[1] - b1[1]) * (b1[0] - b2[0])) / d; return [a1[0] + t * (a2[0] - a1[0]), a1[1] + t * (a2[1] - a1[1])]; };
  // the side wall: s from the corner toward the camera (100 is off the frame), v as on the front wall
  const sideAt = (v) => meet(VPL, H([450, v]), UPV, [1330, 150]);
  const S = homography([[0, -40], [100, -40], [100, 330], [0, 330]], [H([450, -40]), sideAt(-40), sideAt(330), H([450, 330])]);
  const Ss = (list) => Fs(list.map((p) => p.map(S)));
  // the window, one tall casement in the side wall next to the corner: its two panes [s0, s1, v0, v1] on the side wall, and
  // where the light through each lands on the front wall, sheared down and away from the corner (u = 450 - s KX, v + s KY)
  const KX = 3.2, KY = 0.55;
  const land = ([s, v]) => [450 - s * KX, v + s * KY];
  const PANES = [[4, 40, 12, 70], [4, 40, 78, 180]];
  const pane = ([s0, s1, v0, v1]) => [[s0, v0], [s1, v0], [s1, v1], [s0, v1]];
  const throws = PANES.map((p) => pane(p).map(land));
  // the front wall, the side wall
  page.polys(Hs([[[-80, -60], [450, -60], [450, 360], [-80, 360]]]), fill(C.iMid), keep);
  page.polys(Ss([[[0, -60], [120, -60], [120, 360], [0, 360]]]), fill(C.iBase), keep);
  // the light on the wall, then the air it crosses in two hard steps (the whole pane, then its middle)
  page.polys(Hs(throws), fill(C.iLit), keep);
  const shaftOf = (p, k) => { const [s0, s1, v0, v1] = p, ds = ((s1 - s0) * (1 - k)) / 2, dv = ((v1 - v0) * (1 - k)) / 2, q = [s0 + ds, s1 - ds, v0 + dv, v1 - dv]; return hull([...pane(q).map(S), ...pane(q).map(land).map(H)]); };
  page.polys(Fs(PANES.map((p) => shaftOf(p, 1))), tint(C.iLit, 0.2), keep);
  page.polys(Fs(PANES.map((p) => shaftOf(p, 0.3))), tint(C.iLit, 0.4), keep);
  // the window: a deep reveal, blown-out glass in a dark frame and transom, and the reveal's inner edges, which face the room,
  // lit thick
  page.polys(Ss([[[0, 4], [46, 4], [46, 190], [0, 190]]]), fill(C.iDeep), keep);
  page.polys(Ss(PANES.map(pane)), fill(C.mintW), keep);
  page.polys(Ss([[[0, 4], [5, 4], [5, 190], [0, 190]], [[0, 180], [46, 180], [46, 190], [0, 190]], [[40, 12], [46, 12], [46, 180], [40, 180]]]), fill(C.iLit), keep);

  // the board: its frame, the slate, the light across it, the frame's lit edges (the side toward the window, its top where
  // the light crosses it), the ledge
  const FRAME = [[0, 146], [442, 146], [442, 256], [0, 256]], BOARD = [[8, 151], [436, 151], [436, 251], [8, 251]];
  const onBoard = throws.map((t) => clipConvex(t, BOARD)).filter((p) => p.length > 2);
  page.polys(Hs([FRAME]), fill(C.iDeep), keep);
  page.polys(Hs([BOARD]), fill(C.iBase), keep);
  // old chalk wiped across the slate, then the light
  page.polys(Hs([[[262, 154], [404, 152], [416, 160], [398, 166], [276, 168], [254, 161]], [[96, 214], [300, 210], [316, 219], [288, 226], [110, 228], [84, 222]]]), tint(C.iMid, 0.55), keep);
  page.polys(Hs(onBoard), fill(C.teal), keep);
  page.polys(Hs([[[436, 146], [442, 146], [442, 256], [436, 256]], ...throws.map((t) => clipConvex([[0, 146], [442, 146], [442, 149], [0, 149]], t))]), fill(C.aTeal), keep);
  page.polys(Hs([[[-10, 256], [446, 256], [446, 262], [-10, 262]]]), fill(C.iDeep), keep);
  page.polys(Hs([[[-10, 256], [446, 256], [446, 258], [-10, 258]]]), fill(C.aTeal), keep);
  const litBoard = onBoard.map((t) => t.map(H));

  // type on the wall: str from the screen point (x, y) along the wall, size its size on screen, turned with the wall there
  // (or by `turn`, so the phone's lines stay parallel) and sheared to its verticals; each letter that touches one of the
  // `lit` shapes (screen) takes the colour `hot` instead of `col`
  const onWall = (str, x, y, size, col, hot, lit, o, { turn, track = 0, flat = false, whole = false } = {}) => {
    // page.text spaces letters by track in the face's own em; the offsets of the runs follow it
    const tk = (track * size) / ui.em, w = page.measure(ui, str, size) + [...str].length * tk, q = Hi([x, y]), k = dist(H(q), H([q[0] + 1, q[1]]));
    const p0 = H(q), p1 = H([q[0] + w / k, q[1]]), pm = H([q[0] + w / k / 2, q[1]]), pu = H([q[0] + w / k / 2, q[1] - 1]);
    const rot = turn ?? Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) / RAD, e = [Math.cos(rot * RAD), Math.sin(rot * RAD)];
    const v = [pm[0] - pu[0], pm[1] - pu[1]], skew = flat ? 0 : Math.atan2(v[0] * e[0] + v[1] * e[1], -v[0] * e[1] + v[1] * e[0]) / RAD, t = Math.tan(skew * RAD), c = capOf(ui, size);
    const at2 = (a, h) => [x + e[0] * (a - t * h) + e[1] * h, y + e[1] * (a - t * h) - e[0] * h];
    const chars = [...str], off = chars.map((_, i) => page.measure(ui, chars.slice(0, i).join(''), size) + i * tk);
    off.push(w);
    const box = (i) => [[off[i], 0], [off[i + 1], 0], [off[i], c], [off[i + 1], c], [(off[i] + off[i + 1]) / 2, c / 2]].map(([a, h]) => at2(a, h));
    const hit = chars.map((_, i) => (whole ? box(i).every((p) => lit.some((L) => inside(L, p))) : box(i).some((p) => lit.some((L) => inside(L, p)))));
    for (let i = 0; i < chars.length;) {
      let j = i; while (j < chars.length && hit[j] === hit[i]) j++;
      page.text(ui, chars.slice(i, j).join(''), x + e[0] * off[i], y0 + y + e[1] * off[i], { size, rot, skew, track, fill: hit[i] ? hot : col, ...o });
      i = j;
    }
  };

  // the index cards pinned to the wall: [numbers, u, v, turn] on the wall, a card `blank` wider than its numbers (the ruled
  // part); lit where a throw falls on it (cream, numbers in ink, a hard shadow cast down and away from the window), teal in
  // the shade with cream numbers. A number sits wholly in the light or wholly out of it.
  const n = COPY.studyNumbers, litWall = throws.map((t) => t.map(H));
  const cards = (list, size, padX, padY, lh, o) => {
    for (const [nums, x, y, deg, bl = 0, br = 0, top = 0] of list) {
      const c = capOf(ui, size), w = Math.max(...nums.map((i) => page.measure(ui, n[i], size))) + padX * 2 + bl + br, h = c + padY * 2 + top + (nums.length - 1) * lh;
      const co = Math.cos(deg * RAD), si = Math.sin(deg * RAD), T = ([a, b]) => [x + a * co - b * si, y + a * si + b * co];
      const face = [[0, 0], [w, 0], [w, h], [0, h]].map(T), sh = face.map(([a, b]) => Hi([a - h * 0.2, b + h * 0.16])), fw = face.map(Hi);
      page.polys(Hs(throws.map((t) => clipConvex(sh, t))), fill(C.iDeep), o);
      page.polys(Hs([fw]), fill(C.teal), o);
      page.polys(Hs(throws.map((t) => clipConvex(fw, t))), fill(C.dCream), o);
      nums.forEach((i, j) => { const b = T([padX + bl, padY + top + c + j * lh]); onWall(n[i], b[0], b[1], size, C.dCream, C.iBase, litWall, o, { turn: deg, flat: true, whole: true }); });
    }
  };
  cards([[[4], 774, 10, -4, 0, 26], [[2], 798, 68, -3, 0, 24], [[0], 922, 20, 4, 0, 34], [[1], 1033, 14, -3], [[3], 1046, 76, 4]], 22, 5, 5, 0, D);
  cards([[[0, 1, 2], 800, -16, 11, 0, 22, 12], [[3, 4], 914, 18, -11, 0, 32]], 41.5, 6, 5, 34, M);

  // what was studied, chalked on the board in the shade; where the light crosses it the chalk shows hot
  onWall(COPY.studyTitle, 778, 120, 27, C.iLit, C.mintW, litBoard, D);
  onWall(COPY.studyWhen, 780, 145, 19, C.iLit, C.mintW, litBoard, D);
  COPY.studyBody.forEach((l, i) => onWall(l, 770, 167 + i * 19.5, 17.5, C.mint, C.mintW, litBoard, D));
  onWall(COPY.studyTitlePhone, 792, 150, 41, C.iLit, C.mintW, litBoard, M, { turn: 5.5, track: -4 });
  COPY.studyPhone.forEach((l, i) => onWall(l, 794, 184 + i * 34, 41, C.mint, C.mintW, litBoard, M, { turn: 5.5 }));

  // two desks before the board: a desk of the row ahead at the right, its top's far edge rimmed thin; the nearest, darkest,
  // thrust in from the bottom left with its corner toward the window and both its top edges rimmed thick. The phone's
  // nearest sits lower, under four lines of chalk.
  const desk = (q, w, col, o) => { const poly = [...q, [q[q.length - 1][0], 314], [q[0][0], 314]]; page.polys(Fs([poly]), fill(col), o); page.polys(Fs(q.slice(1).map((_, i) => lit(poly, i, w, w * 0.6))), fill(C.aTeal), o); };
  desk([[1004, 278], [1214, 262]], 5, C.iBase, D);
  desk([[1084, 284], [1214, 274]], 4, C.iBase, M);
  desk([[736, 214], [936, 236], [1030, 314]], 13, C.iDeep, D);
  desk([[736, 264], [930, 276], [974, 314]], 11, C.iDeep, M);
}
