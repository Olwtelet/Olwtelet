// c3. AgentForge: one pose, ten hands.
import { C, W, rng, taper, pencil, hatch, swell, flick, lerpP, dist, clipHalf } from '../kit/draw.mjs';
import { cutLine, cutWidth, fitH } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { slab, blade, beam, top, side, foot, slit, towerQuad, towerFlat, letterSet } from '../kit/scene.mjs';

export function draw(page, ctx) {
  const { Y, COPY, SHEAR, L0, faces } = ctx;
  const { gothic: Zen } = faces;
  const y0 = Y.afTop, y1 = Y.argus;
  const R = rng(303);
  const yb = y1 - 96; // first tower's foot
  // the foot line climbs toward the far end, a shallow recession so the last tower still shows its hand
  const horizonAt = (x) => yb - (x - 70) * 0.215;
  // sky acid, ground paper with a hard edge along the foot line
  page.polys([[[-14, y0 + 40], [W + 14, y0 - 46], [W + 14, horizonAt(W + 14)], [-14, horizonAt(-14)]]], `fill="${C.toka}"`);
  page.polys([[[-14, horizonAt(-14)], [W + 14, horizonAt(W + 14)], [W + 14, y1 + 14], [-14, y1 + 14]]], `fill="${C.douga}"`);
  const H0 = 472, r = 0.89;
  const sets = (Q) => ({ slab: slab.map(Q), blade: blade.map(Q), beam: beam.map(Q), top: top.map(Q), side: side.map(Q), foot: foot.map(Q), slit: slit.map(Q) });
  const all = (s) => [s.slab, s.blade, s.beam, s.top, s.side, s.foot];
  const edges = (s, w, over, col, c, rr) => { const L = []; for (const q of all(s)) for (let i = 0; i < q.length; i++) L.push(...pencil(q[i], q[(i + 1) % q.length], { w, over, R, restate: rr ?? 0.2, wander: 0.5 })); page.polys(L, `fill="${col}"`, { cls: c ? `pl ${c}` : 'pl' }); };
  const hands = [
    // AG2: fully painted, with the project's name cut through it, the way the owner's name is
    (Q, c, s) => { towerFlat(page, Q, { fill: C.sumi, slitFill: C.toka, planes: { blade: C.blue, top: C.douga, side: C.blue, foot: C.blue }, cls: c }); letterSet(page, Q, COPY.forgeName, { fg: C.toka, bg: C.sumi }, { seed: 7, cls: c }); },
    // Agno: flat silhouette, one colour: the hairline between the block's two faces is closed, or the hatch behind leaks through it in dashes
    (Q, c, s) => page.polys([...all(s), [[841, 681], [737, 739], [738, 741], [842, 683]].map(Q)], `fill="${C.verm}"`, { cls: c }),
    // AutoGen: two-tone cel, every plane lit and shaded
    (Q, c, s) => { page.polys([s.slab, s.top, s.beam], `fill="${C.douga}"`, { cls: c }); page.polys([s.blade, s.side, s.foot], `fill="${C.blue}"`, { cls: c }); const m1 = lerpP(s.slab[0], s.slab[4], 0.42), m2 = lerpP(s.slab[1], s.slab[3], 0.7); page.polys([clipHalf(s.slab, m1, m2)], `fill="${C.blue}"`, { cls: c }); },
    // CrewAI: colored pencil only, no line
    (Q, c, s) => { page.polys(all(s), `fill="${C.douga}"`, { cls: c }); page.polys(hatch(s.slab, { angle: 24, gap: 7, w: 4.6, R, over: 3 }), `fill="${C.blue}"`, { cls: c }); page.polys(hatch(s.blade, { angle: -36, gap: 7, w: 4.4, R, over: 3 }), `fill="${C.blue}"`, { cls: c }); page.polys(hatch(s.beam, { angle: 70, gap: 6, w: 3.6, R, over: 2 }), `fill="${C.blue}"`, { cls: c }); page.polys(hatch(s.side, { angle: -70, gap: 6, w: 3.6, R, over: 2 }), `fill="${C.blue}"`, { cls: c }); },
    // Google ADK: the thumbnail. Three fast strokes
    (Q, c, s) => { page.polys(all(s), `fill="${C.toka}"`, { cls: c }); const L = [taper([Q([322, 113]), Q([205, 825]), Q([431, 911]), Q([456, 170]), Q([322, 113])], { w: 5, prof: swell, R, n: 8 }), taper([Q([443, 658]), Q([734, 863]), Q([844, 690])], { w: 5, prof: flick, R, n: 4 }), taper([Q([459, 169]), Q([761, 650])], { w: 4, prof: flick, R, n: 2 })]; page.polys(L, `fill="${C.verm}"`, { cls: c }); },
    // LangGraph: outline only. This far back it works as texture; in front it only tangled the first three towers
    (Q, c, s) => { page.polys(all(s), `fill="${C.toka}"`, { cls: c }); edges(s, 4.6, 10, C.sumi, c, 0.1); },
    // LlamaIndex: dry brush
    (Q, c, s) => { page.polys(all(s), `fill="${C.douga}"`, { cls: c }); for (const q of all(s)) page.polys(hatch(q, { angle: 2, gap: 8.5, w: 6.5, R, miss: 0.18, over: 7, prof: flick, doubleBack: 0 }), `fill="${C.sumi}"`, { cls: c }); },
    // OpenAI Agents SDK: wireframe with the hidden lines left in
    (Q, c, s) => { page.polys(all(s), `fill="${C.toka}"`, { cls: c }); edges(s, 2.6, 5, C.graphite, c, 0); const seg = []; const hid = [[[443, 658], [431, 911]], [[553, 590], [737, 739]], [[459, 169], [441, 484]], [[737, 739], [737, 862]]]; for (const [a, b] of hid) { const A = Q(a), B = Q(b), n = Math.floor(dist(A, B) / 12); for (let k = 0; k < n; k += 2) seg.push(taper([lerpP(A, B, k / n), lerpP(A, B, (k + 1) / n)], { w: 2.2, prof: () => 1, R })); } page.polys(seg, `fill="${C.verm}"`, { cls: c }); },
    // Pydantic AI: the comb, carried across the whole form
    (Q, c, s) => { page.polys(all(s), `fill="${C.douga}"`, { cls: c }); for (const q of all(s)) page.polys(hatch(q, { angle: 20.6, gap: 7.4, w: 4.4, R, jitter: 0, miss: 0, over: 0, prof: () => 1, doubleBack: 0 }), `fill="${C.sumi}"`, { cls: c }); },
    // smolagents: the negative. The logo's original, white on black, at the end of the street
    (Q, c, s) => { const a = Q([180, 90]), b = Q([870, 90]), d = Q([870, 932]), e = Q([180, 932]); page.polys([[a, b, d, e]], `fill="${C.sumi}"`, { cls: c }); page.polys(all(s), `fill="${C.douga}"`, { cls: c }); page.polys([s.slit], `fill="${C.douga}"`, { cls: c }); },
  ];
  // positions: each tower sits in the notch of the one before
  const xs = [], hs = [];
  let x = 60;
  for (let i = 0; i < 10; i++) { const h = H0 * Math.pow(r, i); hs[i] = h; xs[i] = x; x += h * 0.8 * 0.42; }
  const feet = [];
  for (let i = 9; i >= 0; i--) {
    const h = hs[i], w = h * 0.8, xa = xs[i], foot0 = horizonAt(xa + w * 0.35) + h * 0.03;
    const Q = towerQuad([[xa, foot0 - h], [xa + w, foot0 - h + h * 0.07], [xa + w, foot0 - h * 0.09], [xa, foot0]]);
    hands[i](Q, `t${i}`, sets(Q));
    feet[i] = Q([431, 911]);
  }
  // the owner's sentence in the corner the recession empties
  const hS = fitH(COPY.afHead[1], 762, 6, SHEAR.lean); // the size is the phone's floor
  const hang = [1189, 1184]; // both lines hang from the margin, the comma past the S below it so that it clears
  COPY.afHead.forEach((l, i) => cutLine(page, l, hang[i] - cutWidth(l, hS) - hS * SHEAR.lean, y0 + 1 + i * (hS + 6), hS, C.sumi, { seed: 61 + i, skew: SHEAR.lean }));
  // names at their feet, on the beam's own angle; short names first, so nothing collides
  const rot = 20.6;
  feet.forEach((f, i) => { page.text(Zen, COPY.frameworks[i], f[0] - 18, Math.max(f[1], horizonAt(f[0])) + 27, { size: 19.5, fill: C.sumi, rot, cls: 'd' }); });
  para(page, Zen, COPY.afFacts, 560, y1 - 28 - 2 * 24, 18, 24, { cls: 'd' });
  page.text(Zen, COPY.afTarget, 1186 - page.measure(Zen, COPY.afTarget, 18), y1 - 28, { size: 18, fill: C.blue, cls: 'd' });
  // phone: the ten names as one block, stepping out under the climbing ground
  para(page, Zen, COPY.frameworksPhone, 1168, y1 - 204, 41, 46, { right: true, cls: 'm' });
  para(page, Zen, [COPY.afFactsPhone], 1168, y1 - 20, 41, 46, { right: true, cls: 'm' });
}
