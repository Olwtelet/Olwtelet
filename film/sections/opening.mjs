// a1 to a4: the opening card, and the film that runs over a1 to b3 before it.
// The card: one lemon field from the top of the page to the demo's ink. The tower is printed into it as a night cut-in (a
// black slab with OLWTELET knocked out of it, teal and indigo dot screens that grow toward the light, a pink plate off
// register), ISAAC RODRIGUES runs across it in the widest black capitals, lemon wherever they cross black, and the tower's
// black shadow falls down the page with the name's letters growing in it. The contact words lie on the street, each cut once
// by the shadow's edge.
// The film: a navy street at night, the tower's two afterimages in blue then teal, one torn pink smear, the printed tower
// snapping in, the impact in cream, ink and gold, and on the kick the card.
import { C, W, ANG, rng, dist, lerpP, clipConvex, polyArea } from '../kit/draw.mjs';
import { word, layWord } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { T, S, P, slab, blade, beam, top, side, foot, slit, nameLetters } from '../kit/scene.mjs';
import { STRIP } from '../kit/strip.mjs';
import { grade, screen, screenPolys, plate, smear, tear, knockout, wound, TEAL, INDIGO } from '../kit/print.mjs';
import { skyBands, NIGHT_SKY, hull, bolt, boltDraw } from '../kit/light.mjs';

const RAD = Math.PI / 180;
const TILT = -12; // every line of type on the card runs up at this angle
const PLANES = [slab, blade, beam, top, side, foot];
const PV = T([431, 911]); // the slab's foot: the pivot of the snap
const turn = (p, deg) => { const t = deg * RAD, c = Math.cos(t), s = Math.sin(t), x = p[0] - PV[0], y = p[1] - PV[1]; return [PV[0] + x * c - y * s, PV[1] + x * s + y * c]; };
const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

// The name: two lines at the card's angle, one lead apart, the second as wide as the card and starting `back` u earlier along
// the line, the way the cards stagger a credit's two lines. Every letter the knockout splits keeps 25u or more of each
// colour: ISAAC starts on the slab (I and S lemon, the first A split by the slab's far edge, A and C black), RODRIGUES starts
// in the field (its R split by the slab's near edge, O and D lemon, the second R split by the beam, IGUES black). The place
// was found by measuring every glyph's pieces over a grid of places: the slab's edges run almost along the letters' stems,
// so most places leave a sliver or a fleck; this one keeps 31u or more, with about 1u of play each way.
const NAME = { x: 280, y: 460.3, back: 170.4, size: 128 };
// The handle's black band across the street, from just right of the tower's foot, 130 thick, low enough to cover the tip
// of the tower's side.
const HANDLE = { at: [388, 884], h: 130 };

// ---------------------------------------------------------------- the shadow
// The six planes laid on the street by the light, plus two seals: the sliver between the shadows of the blade and the top,
// closed from its tip, and the street left of the slab's shadow, which runs off under the strip.
function shadowPolys() {
  const polys = PLANES.map((p) => p.map(S));
  const a = S(slab[4]), b = S(slab[0]), at = a[1] + ((b[1] - a[1]) * (STRIP - a[0])) / (b[0] - a[0]);
  const bl0 = S(blade[3]), bl1 = S(blade[2]), tp0 = S(top[0]), tp1 = S(top[1]), lap = (p, dy) => [p[0], p[1] + dy];
  const seal = [bl0, lap(lerpP(bl0, bl1, 0.05), 3), lap(bl1, 3), lap(tp1, -3), lap(lerpP(tp0, tp1, 0.05), -3), tp0];
  return wound([...polys, seal, [[-14, at], [STRIP + 30, at], [b[0] + 30, b[1]], [-14, b[1]]]]);
}
// the shadow edge all three contact words are cut by: the near edge of the blade's shadow (the slab's shadow, on the other
// side of the lit gap, is full of the name's letters, so nothing is cut by it)
const EDGE_BLADE = [S(blade[3]), S(blade[4])];

// A contact word lying on the street, cut once by a shadow edge in the gap between letters k - 1 and k. The gap is opened
// until the edge passes through it with m to spare at the word's foot and at its top, and the word slides along the street
// to sit the gap on the edge. Returns layWord's arguments.
function onStreet(text, k, edge, { yb, h, w, VP, m = 4 }) {
  const up = text.toUpperCase(), pair = up.slice(k - 1, k + 1), yt = yb - h;
  const [a, b] = edge, L = dist(a, b);
  const sideOf = (p) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / L; // positive: left of the edge
  for (let kern = 0; kern <= 400; kern += 4) {
    const wd = word(up, null, { kern: { [pair]: kern } });
    const u0 = Math.max(...wd.glyphs[k - 1].o.map((p) => p[0])) / wd.width, u1 = Math.min(...wd.glyphs[k].o.map((p) => p[0])) / wd.width;
    let best = null;
    // the word may slide to x 1190 (the cut lines' limit); a word that has no room to slide only gets its gap by kerning
    for (let x0 = 0; x0 + w <= W - 10; x0 += 1) {
      const at = (u, v) => { const y = yt + (yb - yt) * v, s = (y - VP[1]) / (yb - VP[1]), X = VP[0] + (x0 + w * u - VP[0]) * s; return [X, y - (X - VP[0]) * ANG.roll]; };
      const marg = Math.min(sideOf(at(u0, 0)), sideOf(at(u0, 1)), -sideOf(at(u1, 0)), -sideOf(at(u1, 1)));
      if (!best || marg > best.marg) best = { marg, x0 };
    }
    if (best.marg >= m) return { text, x0: best.x0, x1: best.x0 + w, yt, yb, VP, kern: { [pair]: kern } };
  }
  return null;
}

function castShadow(page, Y) {
  const polys = shadowPolys();
  plate(page, polys, C.pink, 10, 8);
  page.polys(polys, `fill="${C.black}"`);
  // the name in the shadow, lemon through black, each letter lit in turn
  nameLetters.forEach((rs, i) => page.rings([rs.map((r) => r.map(S))], `fill="${C.lemon}"`, { cls: `l${i}`, before: Y.demoInk0 + 40 }));
}

function contactWords(page, COPY, faces) {
  const VP = [590, 700];
  // each word is written into its own tile only (the street's roll lifts its right end; each stays clear of its seams)
  const lay = (o, conv, row) => {
    const keep = { from: row, before: row + 200 };
    const insts = layWord(page, o.text, o.x0, o.x1, o.yt, o.yb, o.VP, C.black, { kern: o.kern, ...keep });
    const cut = insts.map((rs) => rs.map((r) => clipConvex(r, conv)).filter((r) => r.length > 2)).filter((rs) => rs.length);
    if (cut.length) page.rings(cut, `fill="${C.lemon}"`, keep);
  };
  // the street right of the blade's shadow edge, from the top of the shadow down past the last word
  const [e0, e1] = EDGE_BLADE, ext = (t) => lerpP(e0, e1, t);
  const right = [ext(-0.12), [W + 14, ext(-0.12)[1]], [W + 14, ext(1)[1]], ext(1)];
  lay(onStreet(COPY.words.email, 2, EDGE_BLADE, { yb: 1243, h: 66, w: 418, VP }), right, 1040);
  lay(onStreet(COPY.words.linkedin, 4, EDGE_BLADE, { yb: 1350, h: 58, w: 455, VP }), right, 1240);
  lay(onStreet(COPY.words.resume, 3, EDGE_BLADE, { yb: 1536, h: 44, w: 272, VP }), right, 1440);
  // the address runs with EMAIL, on the street left between the beam's shadow and the top's
  page.text(faces.label, COPY.emailAddress, 884, 1137, { size: 24, fill: C.black, cls: 'd', rot: -4.01 });
}

// ---------------------------------------------------------------- the film
// The cold open: the street at night under hard sky bands, unlit blocks at both edges, the shadow to come in deep navy.
function cover(page, Y) {
  const cv = { cls: 'cv', before: Y.filmEnd };
  page.polys([box(-14, -14, W + 14, Y.filmEnd + 14)], `fill="${C.navy}"`, cv);
  const hz = (x) => 696 + (x - 486) * ANG.roll; // the street's horizon in the card's camera
  skyBands(page, [[0, hz(0)], [W, hz(W)]], NIGHT_SKY, [560, 420, 290, 160], { top: -14, foot: 0, cls: 'cv', before: Y.towerEnd });
  // unlit blocks up both edges, their verticals running up to the same point as the tower's
  const blockAt = (x0, x1, z0, z1, hgt) => hull([x0, x1].flatMap((x) => [z0, z1].flatMap((z) => [0, hgt].map((y) => P([x, y, z]))))).map((q) => [q[0], q[1]]);
  page.polys([blockAt(-250, -150, 150, 230, 230), blockAt(150, 260, 160, 260, 260)], `fill="${C.far2}"`, { cls: 'cv', before: Y.towerEnd });
  page.polys([blockAt(-170, -120, 230, 300, 300), blockAt(110, 160, 230, 280, 320)], `fill="${C.far}"`, { cls: 'cv', before: Y.towerEnd });
  page.polys(shadowPolys(), `fill="${C.deep}"`, cv);
}

// The two afterimages: the six planes turned back along the swing, flat two-tone, blue then teal (lit planes light). Each
// pose drags three flat silhouettes of itself, 3.5 degrees back along the swing each, every one a step of the cool ramp (deep
// blue, blue, pale cyan behind the blue pose; blue, pale cyan, teal behind the teal one), so the trail shows as stacked
// contours in stepped tones the way the show's afterimages do. (Copies in the pose's own dark tone merged into one mass.)
const TRAILS = { g0: [C.face2, C.aBlue, C.aBlueL], g1: [C.aBlue, C.aBlueL, C.aTeal] };
function afterimages(page, Y) {
  [[-15, C.aBlue, C.aBlueL, 'g0'], [-8.5, C.aTeal, C.aTealL, 'g1']].forEach(([deg, dark, light, cls]) => {
    const pose = (d) => PLANES.map((p) => p.map((v) => turn(T(v), d)));
    [10.5, 7, 3.5].forEach((back, i) => page.polys(pose(deg - back), `fill="${TRAILS[cls][i]}"`, { cls, before: Y.towerEnd }));
    const q = pose(deg);
    page.polys([q[2], q[4], q[5]], `fill="${dark}"`, { cls, before: Y.towerEnd });
    page.polys([q[0], q[1], q[3]], `fill="${light}"`, { cls, before: Y.towerEnd });
  });
}

// One drawing between the teal pose and the snap: the slab torn into a pink smear along its length, its flicks trailing back
// the way it swung, the cyan plate under it off register.
function smearDrawing(page, Y) {
  const a = turn(T([318, 868]), -6), b = turn(T([505, 128]), -6);
  const sm = smear(a, b, 150, rng(48), { side: -1 });
  plate(page, [sm], C.cyan, -8, 6, { cls: 'sm', before: Y.towerEnd });
  page.polys([sm], `fill="${C.pink}"`, { cls: 'sm', before: Y.towerEnd });
}

// The printed tower: pink plate, black slab and beam, screens, the pink slit, OLWTELET cut through the slab to a teal screen.
// The blade's ramp runs zC to zE: the name crosses the blade's foot (ISAAC's C, RODRIGUES's G and U) and stays black there.
// Black on zC is 5.5:1 (zB 3.8:1, zA 2.7:1, both muddy at the size of the name); knocked out to lemon instead, the foot's
// edge, which runs 27 degrees across the line, would cut U and G into wedges at every place the name can take.
const BLADE_AXIS = [T([656, 619]), T([467, 222])]; // foot to head: the dots grow toward the head
const BLADE_KEYS = TEAL.slice(2);
function tower(page, Y) {
  const tw = { cls: 'tw', before: Y.towerEnd };
  const planes = PLANES.map((p) => p.map(T));
  plate(page, planes, C.pink, 10, 8, tw);
  page.polys([planes[0], planes[2]], `fill="${C.black}"`, tw);
  grade(page, planes[1], BLADE_AXIS[0], BLADE_AXIS[1], BLADE_KEYS, tw);
  grade(page, planes[3], T([553, 590]), T([841, 681]), ['zD', 'zE'], tw);
  grade(page, planes[4], T([737, 862]), T([842, 683]), INDIGO, tw);
  screenPolys(page, [planes[5]], 'zF', tw);
  page.polys([slit.map(T)], `fill="${C.pink}"`, tw);
  // OLWTELET knocked out of the slab down to the printed night behind it: a teal screen, so the name crosses it in lemon
  page.rings(nameLetters.map((rs) => rs.map((r) => r.map(T))), screen(page, 'zC'), { cls: 'tw zC', before: Y.towerEnd });
}

// What is dark on the card, for the name's knockout: the slab (its letters too: they are a dark screen), the beam, and the
// 8u gap between them where the slab's plate shows, so a letter across the join stays one lemon piece instead of a lemon,
// black, lemon stripe. The gap runs from the beam's top corner to its lowest corner before the comb, 2 to 3u into the slab
// and into the beam on either side. The blade carries black type (see BLADE_KEYS).
function darkOnCard() {
  const s0 = T(slab[2]), s1 = T(slab[3]), onSlab = (y, inset) => [s0[0] + ((y - s0[1]) * (s1[0] - s0[0])) / (s1[1] - s0[1]) - inset, y];
  const b0 = T(beam[0]), b1 = T(beam[beam.length - 1]);
  const gap = [onSlab(b0[1] - 4, 2), [b0[0] + 3, b0[1] + 2], [b1[0] + 3, b1[1]], onSlab(b1[1], 3)];
  return [slab.map(T), beam.map(T), gap];
}

// The impact: one drawing over the whole film. Cream; the tower in ink, its edges torn; gold bolts on the ink; cream slashes
// out of the pivot over them; ink shards along the street, and three more down the page where the shadow will fall.
function impact(page, Y) {
  const R = rng(29), im = { cls: 'im', before: Y.filmEnd }, im1 = { cls: 'im', before: Y.towerEnd };
  page.polys([box(-14, -14, W + 14, Y.filmEnd + 14)], `fill="${C.cream}"`, im);
  const torn = PLANES.map((pl) => {
    const q = pl.map(T), s = Math.sign(polyArea(q)), out = [];
    // teeth no deeper than 14u, so the logo still reads, but never evenly: each edge its own count, depth and lean
    q.forEach((p, i) => { const b = q[(i + 1) % q.length], L = dist(p, b); out.push(p, ...(L > 60 ? tear(p, b, 9 + R() * 5, R, { teeth: Math.max(2, Math.round(L / 75 + R() * 2.4 - 1.2)), lean: 0.3 + R() * 0.7, side: s }) : [])); });
    return out;
  });
  page.polys(wound(torn), `fill="${C.ink}"`, im1);
  const shard = (p, deg, len, w0) => { const u = [Math.cos(deg * RAD), Math.sin(deg * RAD)], n = [-u[1], u[0]]; return [[p[0] + n[0] * w0, p[1] + n[1] * w0], [p[0] + u[0] * len, p[1] + u[1] * len], [p[0] - n[0] * w0, p[1] - n[1] * w0]]; };
  page.polys([shard(PV, 178, 420, 16), shard(PV, 172, 300, 9), shard(PV, 4, 760, 18), shard(PV, 11, 520, 10), shard(PV, 26, 380, 8)], `fill="${C.ink}"`, im1);
  page.polys([shard([300, 1040], 70, 900, 22), shard([620, 1040], 58, 1100, 16), shard([980, 1040], 40, 700, 12)], `fill="${C.ink}"`, { cls: 'im', before: Y.filmEnd, from: Y.towerEnd });
  boltDraw(page, [bolt([492, 72], [300, 610], { n: 8, amp: 26, seed: 5 }), bolt([180, 690], [452, 272], { n: 7, amp: 20, seed: 6 }), bolt([600, 140], [870, 420], { n: 7, amp: 18, seed: 7 }), bolt([590, 590], [930, 760], { n: 6, amp: 18, seed: 8 })], im1);
  const slash = (deg, r0, r1, w) => { const u = [Math.cos(deg * RAD), Math.sin(deg * RAD)], n = [-u[1], u[0]], m = r0 + (r1 - r0) * 0.62; return [[PV[0] + u[0] * r0, PV[1] + u[1] * r0], [PV[0] + u[0] * m + n[0] * w, PV[1] + u[1] * m + n[1] * w], [PV[0] + u[0] * r1, PV[1] + u[1] * r1], [PV[0] + u[0] * m - n[0] * w, PV[1] + u[1] * m - n[1] * w]]; };
  page.polys([slash(-104, 120, 820, 17), slash(-82, 260, 920, 11), slash(-63, 160, 780, 22), slash(-45, 300, 840, 10), slash(-28, 140, 660, 15)], `fill="${C.cream}"`, im1);
}

export function draw(page, ctx) {
  const { Y, COPY, faces, after } = ctx;
  const Label = faces.label;

  // one flat field, sky and street alike, down to the demo's ink
  page.polys([box(-14, -14, W + 14, Y.demoInk0 + 20)], `fill="${C.lemon}"`);
  castShadow(page, Y);
  contactWords(page, COPY, faces);

  // who: the card's small print, one block flush right in the top corner on the field; every line starts 70u or more right
  // of the blade's outer edge plus 22. On a phone, the same corner: the block starts at y 42 and ends at x 1178 so its fifth
  // line clears the blade's pink plate.
  para(page, Label, COPY.who, 1168, 64, 22, 28, { fill: C.black, cls: 'd', right: true });
  const phone = [...COPY.whoPhone, [COPY.whoPhone2[0], COPY.whoPhone2[1]].join(' '), COPY.whoPhone2[2]];
  para(page, Label, phone, 1178, 42, 41, 46, { fill: C.black, cls: 'm', right: true });
  // the strip's first legend, running up beside it
  page.text(Label, COPY.legendTop, 104, 440, { size: 42, fill: C.black, rot: -90 });

  after('hits', () => {
    cover(page, Y);
    afterimages(page, Y);
    smearDrawing(page, Y);
    tower(page, Y);
    // the name, black on the field and lemon over everything dark
    const [first, last] = COPY.name.toUpperCase().split(' ');
    const dark = darkOnCard(), set = { size: NAME.size, rot: TILT, dark, cls: 'sky', before: Y.towerEnd }; // one clip: the same dark gives the same id
    const kb = knockout(page, faces.wide, [first], { x: NAME.x, y: NAME.y, ...set });
    const co = Math.cos(TILT * RAD), si = Math.sin(TILT * RAD); // one lead down the card's frame, then `back` along the line
    knockout(page, faces.wide, [last], { x: NAME.x - si * kb.lead - co * NAME.back, y: NAME.y + co * kb.lead - si * NAME.back, ...set });
    // the handle, lemon on a black band laid across the street at the card's angle
    // (square at its near end, like a strip of printed tape; it runs off the right edge)
    const u = [Math.cos(TILT * RAD), Math.sin(TILT * RAD)], n = [-u[1], u[0]], o = HANDLE.at;
    const along = (s, t) => [o[0] + u[0] * s + n[0] * t, o[1] + u[1] * s + n[1] * t];
    const band = [along(0, 0), along(900, 0), along(900, HANDLE.h), along(0, HANDLE.h)];
    plate(page, [band], C.pink, 10, 8, { cls: 'sky', before: Y.towerEnd });
    page.polys([band], `fill="${C.black}"`, { cls: 'sky', before: Y.towerEnd });
    COPY.handle.forEach((l, i) => { const p = along(40, HANDLE.h - 36 - (COPY.handle.length - 1 - i) * 46); page.text(Label, l, p[0], p[1], { size: 41, rot: TILT, fill: C.lemon, cls: 'sky' }); });
    impact(page, Y);
  });
}
