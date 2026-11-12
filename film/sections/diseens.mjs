// c4. Diseens: the academic passport's card. An indigo credit card with one name, one cut-in and one hit. The name, DISEENS in
// white wide capitals at the cards' angle over a band of azure dot screen, runs into a close-up of the open passport, which
// looms in from the lower right in a low, wide view, cropped by the card on the right and at the foot. The passport is printed
// in the card's own blues, the way the cards print a cut-in in one hue family: a black cover showing as a slab beyond the
// pages' top edge over a pink plate off register; the holder page in indigo shade, its edge along the fold catching the light
// as one azure band with the screen fading from it; a deep shade in the gutter; the visa page lit azure, the cover's edge
// throwing one hard shadow wedge across its top, and the light stepping down into indigo in two hard steps of screen. Where
// the name crosses the cover it is knocked out in lemon, in the shadow it is white again, on the lit page black. The tower is
// the holder's photo on a lemon ground. The hit is the stamp, square to the page: COMING / SOON on two lines in the name's
// wide capitals, black on a stepped pink slab over a cyan copy off register, and a black slab with 近日公開 in pink under
// SOON; a black tag says first stamp. The stamp is the only thing that moves, on the tower's landing (kit/route.mjs). A
// looping tile: flat fills and plain strokes only (the screens are dotted strokes, cut to their regions at build time; no
// pattern, no clip).
import { C, lineSpans, clipConvex, homography } from '../kit/draw.mjs';
import { capOf } from '../kit/type.mjs';
import { cutLine } from '../kit/letters.mjs';
import { towerQuad, towerFlat } from '../kit/scene.mjs';
import { STAMP } from '../kit/route.mjs';
import { plate, dots } from '../kit/print.mjs';
import { inside } from '../kit/light.mjs';

const RAD = Math.PI / 180;
const TURN = -12, STAMP_TURN = -20; // the cards' angle (the name, the lead and the tag) and the stamp's, close to the page's own
const PW = 560, PH = 760, DIP = 18; // one page, and how far the pages fall into the gutter
const US = PW + 250, VS = 228; // where the stamp's centre lies on the visa page
const COVER = [50, 24]; // how far the black cover shows beyond the pages' top edge, at the left and at the right
const WV = 170; // how far down the fold the cover's shadow reaches on the visa page (it runs out at the outer corner)
// the spread's four corners on the card (holder page's top left, visa page's top right, its foot right, the holder page's foot
// left) before the stamp places it: the camera stands low by the visa page's outer corner, so the spread looms toward the foot
// and the right and recedes toward the holder page's far corner
const CORNERS = [[108, 512], [1147, 93], [1500, 860], [330, 1300]];
// the screen: dots 8u apart on desktop (rows 5.7u apart along the band, a dot every 11.3u, odd rows shifted half a step) and
// 22.6u apart on a phone; five dot sizes in each, the largest almost touching
const GD = 8 * Math.SQRT2, GM = 32, DOT = { d: [2.4, 3.6, 4.8, 6, 7], m: [8, 11.5, 15, 18.5, 21.5] };

export function draw(page, ctx) {
  const { Y, COPY, SIGNS, faces } = ctx;
  const y0 = Y.diseens, y1 = Y.study, keep = { from: y0, before: y1 };
  const card = [[62, y0], [1200, y0], [1200, y1], [62, y1]];
  const cut = (p) => clipConvex(p, card);

  // the booklet in its own flat coordinates: u along the spread, v down the page, from the holder page's top left corner,
  // placed so that the stamp's centre (STAMP, frozen with the landing) lies at (US, VS) on the visa page
  const u1 = PW * 2, sx = STAMP.x, sy = y0 + STAMP.y, SRC = [[0, 0], [u1, 0], [u1, PH], [0, PH]];
  const Hf = homography(SRC, CORNERS), Hb = homography(CORNERS, SRC), s0 = Hf([US, VS]), dx = sx - s0[0], dy = sy - s0[1];
  const at = (u, v) => { const p = Hf([u, v]); return [p[0] + dx, p[1] + dy]; };
  const flat = ([x, y]) => Hb([x - dx, y - dy]);
  // the local frame of the spread at (u, v), as a text matrix: one unit along u and one along v
  const frame = (u, v) => { const a = at(u, v), b = at(u + 1, v), c = at(u, v + 1); return [b[0] - a[0], b[1] - a[1], c[0] - a[0], c[1] - a[1], a[0], a[1]]; };
  const fall = (u) => DIP * Math.pow(Math.max(0, 1 - Math.abs(u - PW) / PW), 5);
  const P = (u, v) => at(u, v + fall(u));
  const STEP = u1 / 32;
  const edgeOf = (v, ua = 0, ub = u1) => [ua, ...Array.from({ length: 33 }, (_, k) => k * STEP).filter((u) => u > ua + 1 && u < ub - 1), ub].map((u) => P(u, v));
  const coverTop = (u) => -COVER[0] + ((COVER[0] - COVER[1]) * u) / u1;
  const cover = [at(0, coverTop(0) + 14), at(14, coverTop(0)), at(u1, coverTop(u1)), at(u1 + 20, PH), at(0, PH)];
  const pageL = [...edgeOf(0, 0, PW), at(PW, PH), at(0, PH)], pageR = [...edgeOf(0, PW, u1), at(u1, PH), at(PW, PH)];

  // one dot screen on the card (rows g/2 apart along the direction from a to b, a dot every g, odd rows shifted g/2). A region
  // lays its rows along its own bands, so a row stays in one band and is one dotted stroke; every band is one path per
  // composition. A dot is kept only when it lies whole inside its region.
  const bands = { d: DOT.d.map(() => []), m: DOT.m.map(() => []) };
  const screen = (poly, [a, b], band) => [['d', GD], ['m', GM]].forEach(([cls, g]) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ex = (b[0] - a[0]) / L, ey = (b[1] - a[1]) / L;
    const h = g / 2, across = poly.map((p) => -p[0] * ey + p[1] * ex), lo = Math.min(...across), hi = Math.max(...across);
    const pt = (s, c) => [s * ex - c * ey, s * ey + c * ex];
    for (let k = Math.ceil(lo / h); k * h <= hi; k++) {
      const c = k * h, ph = k % 2 ? h : 0;
      for (const [ta, tb] of lineSpans(pt(0, c), pt(1, c), poly)) {
        let run = null;
        const flush = () => { if (run) bands[cls][run.b].push([pt(run.a, c), pt(run.z + 1, c)]); run = null; };
        for (let j = Math.ceil((ta - ph) / g); ph + j * g <= tb; j++) {
          const s = ph + j * g, p = pt(s, c), b = band(p);
          const r = b >= 0 ? DOT[cls][b] / 2 + 1 : 0;
          const ok = b >= 0 && [[r, 0], [-r, 0], [0, r], [0, -r]].every(([a, e]) => inside(poly, [p[0] + a, p[1] + e]));
          if (!ok) { flush(); continue; }
          if (run && run.b === b) run.z = s; else { flush(); run = { b, a: s, z: s }; }
        }
        flush();
      }
    }
  });
  // the band of a dot d from the light's edge, w the width of one step: the largest dots at the edge, none past five steps
  const step = (d, w) => (d < 0 || d >= w * 5 ? -1 : 4 - Math.floor(d / w));

  // the card: an indigo field, a hard cut at both seams, and a band of the azure screen along the passport's top edge, its dots
  // growing toward the passport. Above the name's cap line the field stays plain, so the lead keeps a solid ground
  page.polys([[[-14, y0], [1214, y0], [1214, y1 + 14], [-14, y1 + 14]]], `fill="${C.indigoDk}"`, { before: y1 });
  const name = COPY.diseensTitle.toUpperCase(), h = 120, nx = 96, ny = y0 + 300;
  const capLine = (p) => -(p[0] - nx) * Math.sin(TURN * RAD) + (p[1] - ny) * Math.cos(TURN * RAD);
  const e0 = at(0, coverTop(0)), e1 = at(u1, coverTop(u1)), far = 6, cA = [e0[0] + (e0[0] - e1[0]) * far, e0[1] + (e0[1] - e1[1]) * far], cB = [e1[0] + (e1[0] - e0[0]) * far, e1[1] + (e1[1] - e0[1]) * far];
  const L01 = Math.hypot(e1[0] - e0[0], e1[1] - e0[1]), toCover = (p) => ((p[0] - e0[0]) * (e1[1] - e0[1]) - (p[1] - e0[1]) * (e1[0] - e0[0])) / L01;
  const up = (q, d) => [q[0] + ((e1[1] - e0[1]) * d) / L01, q[1] - ((e1[0] - e0[0]) * d) / L01];
  screen(cut([up(cA, 4), up(cB, 4), up(cB, 190), up(cA, 190)]), [e0, e1], (p) => (capLine(p) < 0 ? -1 : step(toCover(p) - 4, 30)));

  // the passport: the pink plate off register, the black cover, the pages falling into the gutter. The light comes from above
  // the visa page: its top lies in the light (azure) and steps down into indigo through the screen; the holder page turns away
  // (indigo) and catches the light only along the fold, as one hard azure band with the screen fading from it; between them
  // the gutter lies in deep shade
  plate(page, [cut(cover)], C.pink, -8, -12, keep);
  page.polys([cut(cover)], `fill="${C.black}"`, keep);
  page.polys([cut(pageL)], `fill="${C.indigo}"`, keep);
  page.polys([cut(pageR)], `fill="${C.indigo}"`, keep);
  const VL = 340, G0 = [PW + 70, 0], G1 = [PW + 50, VL];
  page.polys([cut([at(...G0), ...edgeOf(0, G0[0], u1), at(u1, VL), at(...G1)])], `fill="${C.azure}"`, keep);
  page.polys([cut([P(PW, 0), ...edgeOf(0, PW, PW + 40), P(PW + 40, 0), at(PW + 22, PH), at(PW, PH)])], `fill="${C.indigoDk}"`, keep);
  // the cover's edge throws one hard shadow across the top of the visa page, deepest at the fold and running out at the outer
  // corner, so the lit page is a diagonal that grows toward the outer edge, over the stamp
  // (its top runs 1u over the cover, so the few points that draw it never let the lit page show along the edge)
  page.polys([cut([...[0, 1, 2, 3, 4, 6, 8, 16].map((k) => P(PW + k * STEP, -1)), at(PW, WV)])], `fill="${C.indigoDk}"`, keep);
  screen(cut([at(...G1), at(u1, VL), at(u1, PH), at(G1[0] - 20, PH)]), [at(...G1), at(u1, VL)], (p) => { const d = flat(p)[1] - VL; return d < 0 || d >= 60 ? -1 : d < 30 ? 4 : 2; }); // two hard steps of screen under the light
  const RIM = 18; // the holder page's edge along the fold catches the light as one hard band, the screen fading from it
  page.polys([cut([P(PW - RIM, 0), ...edgeOf(0, PW - RIM, PW), at(PW, PH), at(PW - RIM, PH)])], `fill="${C.azure}"`, keep);
  const MRZ = 362; // the machine-readable line's baseline on the holder page (it ends near u 430, short of the screen)
  screen(cut(pageL), [at(PW, 0), at(PW, PH)], (p) => step(PW - RIM - flat(p)[0], 20));
  [['d', GD], ['m', GM]].forEach(([cls, g]) => bands[cls].forEach((lines, b) => lines.length && dots(page, lines, C.azure, { w: DOT[cls][b], gap: g, cls, ...keep })));

  // the name: white wide capitals on the cards' angle, knocked out where they cross the passport: lemon on the black cover,
  // white again on the shaded holder page and in the cover's shadow, black (the cover's own black) on the lit visa page. Cut at
  // build time, so the tile needs no clip; each later piece reaches 1.5u back over the one before, so no hairline opens where
  // two pieces of a letter meet. The lead over it
  [[[cA, cB, [cB[0], cB[1] - 9000], [cA[0], cA[1] - 9000]], C.white],
    [[at(0, coverTop(0) + 12.5), at(14, coverTop(0) - 1.5), at(u1, coverTop(u1) - 1.5), at(u1 + 20, PH), at(0, PH)], C.lemon],
    [[...edgeOf(-1.5, 0, PW), at(PW, DIP - 1.5), at(PW, PH), at(0, PH)], C.white],
    [[at(PW, DIP - 1.5), ...edgeOf(-1.5, PW, u1), at(PW, WV)], C.white],
    [[at(PW, WV - 1.5), at(u1, -1.5), at(u1, PH), at(PW, PH)], C.black]].forEach(([clip, fill]) => cutLine(page, name, nx, ny, h, fill, { rot: TURN, clip, ...keep }));
  const ld = (lift) => [nx + lift * Math.sin(TURN * RAD), ny - lift * Math.cos(TURN * RAD)];
  const ldD = ld(18), ldM = ld(20);
  page.text(faces.label, COPY.diseensLead, ldD[0], ldD[1], { size: 24, rot: TURN, fill: C.white, cls: 'd', from: y0 });
  page.text(faces.label, COPY.diseensLead, ldM[0], ldM[1], { size: 41, rot: TURN, fill: C.white, cls: 'm', from: y0 });

  // the holder page, in the shade: its heading (two lines on a phone), the photo (the tower on a lemon ground) and the
  // machine-readable line (drawn chevrons on a phone)
  const [hw0, hw1] = COPY.passportHead.split(' '), fit = (m, sz) => sz / Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const fh = frame(56, 62);
  page.text(faces.label, COPY.passportHead, fh[4], fh[5], { size: 30, matrix: fh, fill: C.white, cls: 'd' });
  [hw0, hw1].forEach((s, i) => { const m = frame(56, 60 + i * 50); page.text(faces.label, s, m[4], m[5], { size: fit(m, 41), matrix: m, fill: C.white, cls: 'm' }); });
  const box = (ua, va, ub, vb) => [at(ua, va), at(ub, va), at(ub, vb), at(ua, vb)];
  const photo = [60, 120, 230, 318];
  page.polys([box(...photo)], `fill="${C.lemon}"`, keep);
  const inset = 20, tw = photo[2] - photo[0] - inset * 2, tv = photo[1] + 18;
  towerFlat(page, towerQuad([at(photo[0] + inset, tv), at(photo[0] + inset + tw, tv), at(photo[0] + inset + tw, tv + tw * 1.2), at(photo[0] + inset, tv + tw * 1.2)]), { fill: C.black, planes: { blade: C.azure, top: C.azure, side: C.indigo, foot: C.indigo }, slitFill: C.pink, ...keep });
  const mrzV = MRZ, fm = frame(56, mrzV);
  page.text(faces.ui, COPY.passportMrz, fm[4], fm[5], { size: fit(fm, 22), matrix: fm, fill: C.white, cls: 'd', before: y1 });
  const chev = (k) => { const a = 56 + k * 30, t = 9, v = mrzV; return [at(a, v - 14), at(a + 18, v - 30), at(a + 18 + t * 0.7, v - 30 + t * 0.5), at(a + t * 1.3, v - 14), at(a + 18 + t * 0.7, v + 2 - t * 0.5), at(a + 18, v + 2)]; };
  page.polys(Array.from({ length: 10 }, (_, k) => chev(k)), `fill="${C.white}"`, { cls: 'm', ...keep });

  // the tag: first stamp, lemon on a black slab on the visa page under the stamp, on the cards' angle
  const tc = Math.cos(TURN * RAD), ts = Math.sin(TURN * RAD);
  [[30, 'd'], [41, 'm']].forEach(([sz, cls]) => {
    const pad = sz * 0.36, L = page.measure(faces.label, COPY.noteStamp, sz) + pad * 2, x0 = 1030 - L * tc, b0 = y0 + 640 - L * ts;
    const q = (a, b) => [x0 + a * tc - b * ts, b0 + a * ts + b * tc], cap = capOf(faces.label, sz), t0 = q(pad, 0);
    page.polys([[q(0, -cap - pad), q(L, -cap - pad), q(L, pad), q(0, pad)]], `fill="${C.black}"`, { cls, ...keep });
    page.text(faces.label, COPY.noteStamp, t0[0], t0[1], { size: sz, rot: TURN, fill: C.lemon, cls, before: y1 });
  });

  // the stamp (stp): slabs slammed onto the visa page, square to it, stepping down to the left like a stacked credit. COMING /
  // SOON on two lines in the name's wide capitals (placed type, so the glyphs' curves stay smooth at cap 60), knocked out in black from a pink slab (stepped under the short line) over a
  // cyan copy off register, and 近日公開 in pink knocked out of a black slab under SOON. The page turns -20, so a lower line
  // would push right past the card: the slabs step down on the left, where the turn has room
  const sc = Math.cos(STAMP_TURN * RAD), ss = Math.sin(STAMP_TURN * RAD);
  const sa = (u, v) => [sx + (u + 14) * sc - v * ss, sy + (u + 14) * ss + v * sc]; // 14u right of the pivot, clear of the fold
  const sq = (a0, b0, a1, b1) => [sa(a0, b0), sa(a1, b0), sa(a1, b1), sa(a0, b1)];
  const soon = COPY.soon.map((s) => s.toUpperCase()), hS = 60, wz = hS / capOf(faces.wide, 1), pad = 14, lg = 9, [m0, m1] = soon.map((s) => page.measure(faces.wide, s, wz));
  const jp = 60, jpCap = capOf(faces.jp, jp), jw = page.measure(faces.jp, SIGNS.soon, jp), jPad = 14, jIn = 30;
  const row = pad + hS + lg / 2, A = m0 / 2 + pad, B = -A + m1 + pad * 2, top = -(row * 2 + jpCap + jPad * 2) / 2, mid = top + row, bot = mid + row;
  const slabP = [sa(-A, top), sa(A, top), sa(A, mid), sa(B, mid), sa(B, bot), sa(-A, bot)];
  const slabK = sq(-A + jIn, bot - 1, -A + jIn + jw + jPad * 2, bot + jpCap + jPad * 2);
  plate(page, [slabP], C.cyan, -14, 5, { cls: 'stp' });
  page.polys([slabP], `fill="${C.pink}"`, { cls: 'stp' });
  page.polys([slabK], `fill="${C.black}"`, { cls: 'stp' });
  soon.forEach((s, i) => { const t = sa(-A + pad, top + pad + hS + i * (hS + lg)); page.text(faces.wide, s, t[0], t[1], { size: wz, rot: STAMP_TURN, fill: C.black, cls: 'stp' }); });
  const jb = sa(-A + jIn + jPad, bot + jPad + jpCap);
  page.text(faces.jp, SIGNS.soon, jb[0], jb[1], { size: jp, rot: STAMP_TURN, fill: C.pink, cls: 'stp' });
}
