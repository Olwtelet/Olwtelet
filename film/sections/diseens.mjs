// c4. Diseens: the notice is the passport's first stamp. An open passport lying on the field, on the set's roll, with the tower as
// its holder and one stamp on its visa page. The stamp is the only thing here that moves, on the tower's landing (kit/route.mjs).
import { C, W, rng, taper, pencil, hatch, swell, flick, dist } from '../kit/draw.mjs';
import { cutLine, cutWidth } from '../kit/letters.mjs';
import { towerQuad, towerFlat } from '../kit/scene.mjs';
import { STAMP } from '../kit/route.mjs';

const RAD = Math.PI / 180;
const ROLL = -4.01, STAMP_TURN = 9.3;
const PAGE_W = 540, PAGE_H = 540, RIM = 14, DIP = 15; // one page of the booklet, and how far its ink cover shows round the pages

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen, hand: Hand } = faces;
  const y0 = Y.diseens, y1 = Y.study;
  const R = rng(1207);
  // both cuts rise on the roll, and base paper is left under the lower one: the study row carries it on
  page.polys([[[-14, y0 + 38], [W + 14, y0 - 48], [W + 14, y1 - 91], [-14, y1 - 5]]], `fill="${C.verm}"`);

  const hT = 76;
  cutLine(page, COPY.diseensTitle, L0, y0 + 50, hT, C.sumi, { seed: 161, skew: SHEAR.lean });
  page.text(Zen, COPY.diseensLead, L0, y0 + 50 + hT + 36, { size: 27, fill: C.sumi, cls: 'd' });
  page.text(Zen, COPY.diseensLead, L0, y0 + 50 + hT + 44, { size: 41, fill: C.sumi, cls: 'm' });

  // the booklet, in its own flat coordinates: u along the spread, v down the page, from the left page's top left corner
  const co = Math.cos(ROLL * RAD), si = Math.sin(ROLL * RAD), ox = 140, oy = y0 + 242;
  const at = (u, v) => [ox + u * co - v * si, oy + u * si + v * co];
  const box = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  const rough = (q, opt) => q.flatMap((p, k) => pencil(p, q[(k + 1) % q.length], { R, ...opt }));
  const u1 = PAGE_W * 2;
  const nick = 10; // a booklet's corners are cut, not square
  page.polys([[at(-RIM + nick, -RIM), at(u1 + RIM - nick, -RIM), at(u1 + RIM, -RIM + nick), at(u1 + RIM, PAGE_H + RIM - nick), at(u1 + RIM - nick, PAGE_H + RIM), at(-RIM + nick, PAGE_H + RIM), at(-RIM, PAGE_H + RIM - nick), at(-RIM, -RIM + nick)]], `fill="${C.sumi}"`);
  // the pages fall into the gutter, top and foot, so that this is a booklet lying open and not one sheet with a line down it
  const fall = (u) => DIP * Math.pow(1 - Math.abs(u - PAGE_W) / PAGE_W, 5);
  const edgeAt = (v) => { const o = []; for (let k = 0; k <= 16; k++) { const u = (u1 * k) / 16; o.push(at(u, v + fall(u))); } return o; };
  const topEdge = edgeAt(0), footEdge = edgeAt(PAGE_H);
  page.polys([[...topEdge, ...footEdge.slice().reverse()]], `fill="${C.douga}"`);
  // no stroke shorter than the band is wide: a chip from its corner reads as a slip, not as hatching
  const band = hatch(box(PAGE_W - 40, DIP + 6, PAGE_W, PAGE_H), { angle: -52, gap: 9, w: 3.8, R, miss: 0.05, over: 2, doubleBack: 0 });
  page.polys(band.filter((q) => Math.max(...q.map((p) => dist(p, q[0]))) > 40), `fill="${C.blue}"`);
  page.polys([taper(topEdge, { w: 3.6, prof: swell, wob: 0.6, R }), taper(footEdge, { w: 3.6, prof: swell, wob: 0.6, R }), ...pencil(at(0, 0), at(0, PAGE_H), { w: 3.6, over: 9, R, restate: 0.4, wander: 0.8 }), ...pencil(at(PAGE_W, DIP), at(PAGE_W, PAGE_H + DIP), { w: 5.5, over: 0, R, restate: 1, wander: 0.8 })], `fill="${C.graphite}"`, { cls: 'pl' });

  // the holder's page: its heading, the photo, three ruled lines with nothing on them, and the machine-readable line at its foot
  const pad = 38, photoW = 190, photoH = 250, photoV = 92;
  const head = at(pad, 60);
  page.text(Zen, COPY.passportHead, head[0], head[1], { size: 41, fill: C.sumi, rot: ROLL });
  const photo = box(pad, photoV, pad + photoW, photoV + photoH);
  page.polys([photo], `fill="${C.toka}"`);
  const inset = 16, tw = photoW - inset * 2;
  towerFlat(page, towerQuad([at(pad + inset, photoV + 22), at(pad + inset + tw, photoV + 22), at(pad + inset + tw, photoV + 22 + tw * 1.25), at(pad + inset, photoV + 22 + tw * 1.25)]), { fill: C.sumi, slitFill: C.toka, planes: { blade: C.blue, top: C.douga, side: C.blue, foot: C.blue } });
  page.polys(rough(photo, { w: 4.4, over: 12, restate: 0.6, wander: 0.8 }), `fill="${C.graphite}"`, { cls: 'pl' });
  const ruleL = pad + photoW + 40, ruleR = PAGE_W - 66;
  page.polys([0, 1, 2].flatMap((i) => pencil(at(ruleL, photoV + 92 + i * 72), at(ruleR, photoV + 92 + i * 72), { w: 3.4, over: 7, R, restate: 0.3, wander: 0.8 })), `fill="${C.graphite}"`, { cls: 'pl' });
  const footV = PAGE_H - 44, mrz = at(pad, footV);
  page.text(Zen, COPY.passportMrz, mrz[0], mrz[1], { size: 23, fill: C.sumi, cls: 'd', rot: ROLL });
  // on a phone the line would not fit at its floor: the same chevrons, drawn
  const chevrons = [];
  for (let k = 0; k < 15; k++) { const a = pad + k * 28; chevrons.push(taper([at(a, footV - 14), at(a + 18, footV - 28)], { w: 9, prof: flick, R }), taper([at(a, footV - 14), at(a + 18, footV)], { w: 9, prof: flick, R })); }
  page.polys(chevrons, `fill="${C.sumi}"`, { cls: 'm' });

  // the visa page: one stamp, turned on the slab's lean against the screen, with paper needling through it where the rubber missed
  const cx = STAMP.x, cy = y0 + STAMP.y, sc = Math.cos(STAMP_TURN * RAD), ss = Math.sin(STAMP_TURN * RAD);
  const sa = (u, v) => [cx + u * sc - v * ss, cy + u * ss + v * sc];
  const sq = (a0, b0, a1, b1) => [sa(a0, b0), sa(a1, b0), sa(a1, b1), sa(a0, b1)];
  const mw = 340, hS = 72, gap = 14, framePad = 28;
  const [w0, w1] = COPY.soon;
  const line0 = sa(-mw / 2, -hS - gap / 2), line1 = sa(-mw / 2, gap / 2);
  cutLine(page, w0, line0[0], line0[1], hS, C.blue, { seed: 171, rot: STAMP_TURN, xs: mw / cutWidth(w0, hS), cls: 'stp' });
  cutLine(page, w1, line1[0], line1[1], hS, C.blue, { seed: 172, rot: STAMP_TURN, xs: mw / cutWidth(w1, hS), cls: 'stp' });
  const fu = mw / 2 + framePad, fv = hS + gap / 2 + framePad;
  page.polys([...rough(sq(-fu, -fv, fu, fv), { w: 7, over: 8, restate: 0.7, wander: 1.4 }), ...rough(sq(-fu + 11, -fv + 11, fu - 11, fv - 11), { w: 3.8, over: 6, restate: 0.4, wander: 1 })], `fill="${C.blue}"`, { cls: 'stp' });
  const dry = [sq(40, -fv - 4, fu + 4, -8), sq(-fu - 4, 20, -60, fv + 4)];
  page.polys(dry.flatMap((q) => hatch(q, { angle: 38, gap: 7.5, w: 2.8, R, jitter: 0.6, miss: 0.3, over: 3, doubleBack: 0 })), `fill="${C.douga}"`, { cls: 'stp' });

  // the note, and a red pencil arrow to what it means: thin at the note, heaviest at the head
  const noteU = PAGE_W + 70, noteV = PAGE_H - 38, note = at(noteU, noteV);
  page.text(Hand, COPY.noteStamp, note[0], note[1], { size: 50, fill: C.graphite, R, jit: 6, rot: ROLL });
  const A = at(noteU + 150, noteV - 42), T = sa(-23, fv + 16);
  const dx = T[0] - A[0], dy = T[1] - A[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, e = [T[0] - ux * 24, T[1] - uy * 24];
  page.polys([taper([A, e], { w: 11, prof: (t) => 0.35 + 0.65 * t, n: 1 }), [T, [e[0] + uy * 19 - ux * 8, e[1] - ux * 19 - uy * 8], [e[0] - uy * 19 - ux * 8, e[1] + ux * 19 - uy * 8]]], `fill="${C.verm}"`, { cls: 'pl' });
}
