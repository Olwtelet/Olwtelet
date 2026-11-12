// c1. The hold: the AI rule in daylight, calm and controlled, caught as a beat on the move. The camera lies on the road
// with a wide lens, tipped up and rolled hard, so the horizon falls away to the right and the road is a wedge of streaks
// in the lower left. One light: the sun, low in the frame, half eclipsed by the tower's blade; every shadow is thrown
// along the line from it. The rule is printed on a billboard raised on posts at the left, seen from below in steep
// perspective and plunging toward the lower right: a lightbox lit from inside, its frame, underside, catwalk and lamp arms
// in shade against the sun, which catches only the yellow lip along its top and the rim of its far end; its long shadow
// falls down the road toward the lens, weathering streaks run down the blank end of its face. Behind it a straight
// elevated road crosses the city. Beyond it the tower rises out of the bottom of the frame as one dark silhouette in its
// own two blues: a cream rim with a white core on every edge that faces the sun, a thinner cyan rim from the sky on the
// edges turned away. The far city is blocks a step off the sky, their sunward sides lit, their floors in ledges with rows
// of dark panes, tanks, plant boxes and railings on the roofs, balconies, sign boxes, masts and cables; under the elevated
// road a darker middle layer.
import { C, rng, camera, lerp, lerpP, clipHalf, taper } from '../kit/draw.mjs';
import { measure, capOf } from '../kit/type.mjs';
import { skyBands, rimLights, hull, inside } from '../kit/light.mjs';
import { towerQuad, logo } from '../kit/scene.mjs';

const centroid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const unit = (v) => { const l = Math.hypot(...v); return v.map((c) => c / l); };
const ring = (c, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos(a0 + (i / n) * Math.PI * 2), c[1] + r * Math.sin(a0 + (i / n) * Math.PI * 2)]);
// the height of a stepped roof at t across its block: [t, k] corners, the lower side at a step
const roofAt = (r, t) => { let k = Infinity; for (let i = 0; i + 1 < r.length; i++) { const [ta, ka] = r[i], [tb, kb] = r[i + 1]; if (tb > ta && t >= ta && t <= tb) k = Math.min(k, lerp(ka, kb, (t - ta) / (tb - ta))); } return k === Infinity ? r[r.length - 1][1] : k; };

export function draw(page, ctx) {
  const { Y, COPY, faces } = ctx;
  const y0 = Y.hitsEnd, y1 = Y.holdEnd, ft = y1 + 14;
  const keep = { before: y1, from: y0 };
  const P = (col, list, o = {}) => page.polys(list.filter((p) => p && p.length > 2), `fill="${col}"`, { ...keep, ...o });
  const RS = rng(311), RW = rng(53);

  // the camera on the road: a wide lens tipped up and rolled; the world in metres, y up, z down the road
  const H0 = 0.3, F0 = 560, PI0 = 0.3, RO0 = -0.15, CX = 585, CY = y0 + 160;
  const cam = camera({ pos: [0, H0, 0], pitch: PI0, roll: RO0, f: F0, cx: CX, cy: CY });
  const pr = (x, y, z) => { const q = cam.project([x, y, z]); return [q[0], q[1]]; };
  const hA = pr(-1e6, H0, 1e6), hB = pr(1e6, H0, 1e6);
  const hz = (x) => hA[1] + ((x - hA[0]) * (hB[1] - hA[1])) / (hB[0] - hA[0]);
  const UP = pr(0, 1e8, 0), VP = pr(0, H0, 1e8);
  const rise = (b, h) => lerpP(b, UP, h / (b[1] - UP[1])); // a point h up the vertical standing at b
  const hd = unit([hB[0] - hA[0], hB[1] - hA[1]]); // the horizon's direction
  const ground = (x, z) => pr(((x - VP[0]) * z) / F0, 0, z); // the road at depth z, near page x
  const blade = (a, d, L, t, k = 0.22) => { const n = [-d[1], d[0]], p = (s, o) => [a[0] + d[0] * s + n[0] * o, a[1] + d[1] * s + n[1] * o]; return [p(0, 0), p(L * k, -t / 2), p(L, 0), p(L * k, t / 2)]; };
  // the world direction the camera sees a page point in: the sun's, for every shadow
  const toward = (q) => { const X3 = (q[0] - CX) / F0, Y3 = (CY - q[1]) / F0, cr = Math.cos(RO0), sr = Math.sin(RO0), cp = Math.cos(PI0), sp = Math.sin(PI0); const Y2 = -sr * X3 + cr * Y3; return unit([cr * X3 + sr * Y3, cp * Y2 + sp, cp - sp * Y2]); };

  // a building on the horizon from xa to xb, h tall, its sides leaning in with the lens; roof: [t, k] corners
  const base = (x) => [x, hz(x) + 6];
  const on = (x, h) => rise(base(x), h + 6);
  const bld = (xa, xb, h, roof = [[0, 1], [1, 1]]) => [base(xa), base(xb), ...roof.slice().reverse().map(([t, k]) => on(lerp(xa, xb, t), h * k))];
  const band = (xa, xb, h0, h1) => [on(xa, h0), on(xb, h0), on(xb, h1), on(xa, h1)];
  const H = (x, top) => hz(x) + 6 - top; // the height that brings a building at x up to page y top (from y0)

  // the billboard, measured first: a box raised on posts at the roadside, turned toward the road; v runs up its face
  const th = 1.25, sd = Math.sin(th), cd = Math.cos(th), Db = 0.45, fr = 0.16;
  const A = [-5, 2.85, 5];
  const wpt = (u, v, w = 0) => [A[0] + u * sd - w * cd, A[1] + v, A[2] + u * cd + w * sd];
  const at = (u, v, w = 0) => pr(...wpt(u, v, w));
  const quad = (u0, u1, v0, v1, w = 0) => [at(u0, v0, w), at(u1, v0, w), at(u1, v1, w), at(u0, v1, w)];
  const F = faces.label, U = faces.ui, size = 41;
  // a word set on the face between its true ends: its baseline from start to end, its verticals at its middle
  const mx = (fc, str, u, v, sM) => {
    const w = measure(fc, str, sM), o = at(u, v), e = at(u + w, v), m = at(u + w / 2, v), mv = at(u + w / 2, v + 0.01), k = sM / size;
    const ju = [(e[0] - o[0]) / w, (e[1] - o[1]) / w], jv = [(mv[0] - m[0]) * 100, (mv[1] - m[1]) * 100];
    return { w, m: [ju[0] * k, ju[1] * k, -jv[0] * k, -jv[1] * k, o[0], o[1]] };
  };
  const setRule = (capM) => {
    const sM = capM / capOf(F, 1), out = [], lead = capM * 1.45;
    out.ends = []; out.vs = [];
    COPY.withAI.forEach((l, i) => {
      let u = 0.5;
      const v = -capM * 0.6 - capM - i * lead;
      for (const s of l.split(' ')) { const q = mx(F, s, u, v, sM); out.push({ fc: F, s, m: q.m }); u += q.w + measure(F, ' ', sM) * 1.5; }
      out.end = { u, v, sM }; out.ends.push(u); out.vs.push(v);
    });
    const ok = mx(U, COPY.ok, out.end.u + 0.2, out.end.v, sM);
    out.push({ fc: U, s: COPY.ok, m: ok.m });
    out.ok = [out.end.u + 0.08, out.end.u + 0.32 + ok.w];
    return out;
  };
  const eff = (r) => Math.min(...r.map(({ m }) => size * Math.min(Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])), Math.hypot(m[2], m[3]))));
  let cm = 0.4, rule = setRule(cm);
  for (let n = 0; n < 6; n++) { cm *= 41.6 / eff(rule); rule = setRule(cm); }
  const Hb = cm * 5.25, Lb = Math.max(...rule.ends, rule.ok[1]) + 0.8, vb = -Hb - fr, vg = -A[1];
  const boardOut = hull([-0.3, Lb].flatMap((u) => [[fr, 0], [fr, Db], [vb, 0], [vb, Db], [vb - 0.2, -1.05]].map(([v, w]) => at(u, v, w))));

  // the tower: the logo's box stood on the street beyond the elevated road, its foot below the frame; the sun on the blade
  const tx0 = 880, tw = 322, th0 = 402;
  const TQ = towerQuad([on(tx0, H(tx0, y0 + 10)), on(tx0 + tw, H(tx0 + tw, y0 + 10)), on(tx0 + tw, H(tx0 + tw, y0 + 10) - th0), on(tx0, H(tx0, y0 + 10) - th0)]);
  const sun = TQ([548, 268]), sunD = toward(sun);
  const fronts = logo.slice(0, 6).map((pl) => pl.map(TQ));
  // what the board or the tower hides, or the frame cuts, is not drawn
  const hidden = (p) => p.every((q) => q[1] > y1 + 1 || inside(boardOut, q) || fronts.some((f) => inside(f, q)));
  const Pc = (col, list, o) => P(col, list.filter((p) => p && p.length > 2 && !hidden(p)), o);
  // the far city stands behind the middle layer too
  const mids = [[700, 790, H(745, y0 + 236)], [790, 900, H(845, y0 + 226)], [930, 1060, H(995, y0 + 232)], [1060, 1214, H(1137, y0 + 222)]];
  const midBlocks = mids.map(([xa, xb, h]) => bld(xa, xb, h));
  const Pf = (col, list, o) => Pc(col, list.filter((p) => !p.every((q) => midBlocks.some((m) => inside(m, q)))), o);

  // the sky: four hard bands, lighter toward the horizon; the sun in it, a flat white disc in one cream step
  skyBands(page, [[-14, hz(-14)], [1214, hz(1214)]], [C.day0, C.day1, C.day2, C.day3], [330, 240, 150], { top: y0, foot: 30, ...keep });
  P(C.dCream, [ring(sun, 46, 30)]);
  P(C.goldW, [ring(sun, 29, 26)]);

  // the far city. A haze roofline one step off the sky with its tanks and boxes, then the blocks a step darker, their tops
  // broken by setbacks, a slant and masts
  const hazeR = [[0, 0.7], [0.1, 0.7], [0.1, 0.9], [0.22, 0.9], [0.22, 0.8], [0.4, 0.8], [0.4, 1], [0.48, 1], [0.48, 0.85], [0.7, 0.85], [0.7, 0.95], [0.86, 0.95], [0.86, 0.78], [1, 0.78]];
  const hazeH = H(800, y0 + 112), hazeAt = (x) => hazeH * roofAt(hazeR, (x - 380) / 834);
  P(C.day1, [bld(380, 1214, hazeH, hazeR), ...[[446, 9, 7], [470, 5, 4], [575, 12, 5], [610, 4, 14], [742, 8, 9], [760, 6, 4], [1010, 10, 6]].map(([x, w, ht]) => band(x, x + w, hazeAt(x + w / 2) - 1, hazeAt(x + w / 2) + ht))]);
  const megs = [[470, 560, H(515, y0 + 34), [[0, 0.86], [0.2, 0.86], [0.2, 0.93], [0.6, 1], [1, 1]], 13], [600, 690, H(645, y0 + 92), [[0, 1], [0.7, 1], [0.7, 0.93], [1, 0.93]], 12],
    [800, 885, H(840, y0 + 56), [[0, 0.84], [0.35, 0.84], [0.35, 1], [1, 1]], 14], [1105, 1214, H(1160, y0 + 104), [[0, 0.9], [0.4, 0.9], [0.4, 1], [1, 0.97]], 15], [300, 420, H(360, y0 + 16), [[0, 1], [0.55, 1], [1, 0.9]], 12]];
  const roofH = (i, x) => { const [xa, xb, h, r] = megs[i]; return h * roofAt(r, Math.min(1, Math.max(0, (x - xa) / (xb - xa)))); };
  const mast = (x, i, up) => band(x, x + 3, roofH(i, x + 1.5) - 2, roofH(i, x + 1.5) + up);
  // each block in its own material, its sunward side lit; what is drawn on it goes into layers by colour
  const mat = [[C.tealLt, C.day3], [C.aTeal, C.aTealL], [C.cyan, C.mintW], [C.tealLt, C.mintW], [C.cyan, C.day3]];
  const stage = () => new Map(), put = (m, col, ...ps) => { if (!m.has(col)) m.set(col, []); m.get(col).push(...ps); };
  const flush = (m, o) => { for (const [col, l] of m) Pf(col, l, o); };
  const bodies = stage(), sides = stage();
  megs.forEach(([xa, xb, h, r], i) => {
    put(bodies, mat[i][0], bld(xa, xb, h, r));
    const t = 0.72, k = r[r.length - 1][1];
    put(sides, mat[i][1], [base(lerp(xa, xb, t)), base(xb), on(xb, h * k), on(lerp(xa, xb, t), h * k)]);
  });
  [[536, 0, 46], [650, 1, 30], [1180, 3, 34]].forEach(([x, i, up]) => put(bodies, mat[i][0], mast(x, i, up)));
  flush(bodies); flush(sides);

  // the roofs: water tanks, plant boxes and railings in the block's own material, lit on the sunward side, a dark seam on each
  const rBody = stage(), rLit = stage(), rRail = stage(), rDark = [];
  const onRoof = (i, x, w) => Math.min(roofH(i, x), roofH(i, x + w));
  const tank = (i, x, w, ht) => { const r = onRoof(i, x, w); put(rBody, mat[i][0], band(x + 1, x + 2, r - 1, r + 3), band(x + w - 2, x + w - 1, r - 1, r + 3), band(x, x + w, r + 3, r + 3 + ht)); put(rLit, mat[i][1], band(x + w - 2, x + w, r + 3, r + 3 + ht), band(x - 0.5, x + w + 0.5, r + 2 + ht, r + 4 + ht)); rDark.push(band(x, x + w - 2, r + 3 + ht * 0.45, r + 4.2 + ht * 0.45)); };
  const box = (i, x, w, ht) => { const r = onRoof(i, x, w); put(rBody, mat[i][0], band(x, x + w, r - 1, r + ht)); put(rLit, mat[i][1], band(x + w - 1.6, x + w, r - 1, r + ht), band(x, x + w, r + ht - 1.2, r + ht)); rDark.push(band(x + 1, x + w - 2.5, r + ht * 0.3, r + ht * 0.3 + 1.2)); };
  const rail = (i, x, w) => { const r = onRoof(i, x, w); put(rRail, mat[i][0], band(x, x + w, r + 4, r + 5)); for (let px = x; px <= x + w; px += 6) put(rRail, mat[i][0], band(px, px + 1, r, r + 4)); };
  tank(4, 318, 12, 9); box(4, 336, 9, 5); box(4, 348, 6, 4); rail(4, 372, 26); tank(0, 488, 10, 8); box(0, 474, 8, 4); box(0, 545, 10, 5); rail(0, 500, 22);
  tank(1, 612, 14, 10); box(1, 632, 8, 5); box(1, 660, 12, 4); rail(1, 600, 46); tank(2, 840, 11, 9); box(2, 858, 8, 5); box(2, 806, 9, 4); rail(2, 826, 40);
  tank(3, 1125, 13, 10); box(3, 1146, 9, 5); box(3, 1195, 10, 5); rail(3, 1105, 40);
  flush(rBody); flush(rRail, { cls: 'd' }); flush(rLit); Pf(C.dTeal, rDark);

  // the faces: a floor ledge every few metres (a lit lip over a dark line), and under each, rows of dark panes in runs;
  // on the lit side the ledges are shadow lines and the panes the block's own material; panel seams; balconies on the right
  const lips = stage(), sideMarks = stage(), lines = [], panes = [];
  megs.forEach(([xa, xb, h, r, fh], i) => {
    const xe = lerp(xa, xb, 0.72), top = h * Math.min(...r.map(([, k]) => k)) - 8;
    for (let hf = top; on(xa, hf)[1] < y1 + 6; hf -= fh) {
      // the spans of the front under the roof at this floor
      const spans = []; let s0 = null;
      for (let x = xa + 1; x <= xe; x += 2) { const ok = roofH(i, x) > hf + 6; if (ok && s0 === null) s0 = x; if ((!ok || x + 2 > xe) && s0 !== null) { spans.push([s0, ok ? xe : x - 1]); s0 = null; } }
      for (const [a, b] of spans) {
        put(lips, mat[i][1], band(a, b, hf, hf + 1.6)); lines.push(band(a, b, hf - 1.5, hf));
        if (RW() < 0.28) continue;
        // one or two runs of panes along the floor
        const pitch = 7.5, n = Math.floor((b - a - 2) / pitch);
        for (let run = 0; run < 2 && n > 2; run++) {
          const len = 2 + Math.floor(RW() * Math.min(7, n - 1)), st = Math.floor(RW() * (n - len + 1));
          for (let j = st; j < st + len; j++) if (RW() > 0.12) panes.push(band(a + 1 + j * pitch, a + 1 + j * pitch + 4.5, hf - 7.5, hf - 3.5));
          if (RW() < 0.5) break;
        }
      }
      if (roofH(i, xb - 1) > hf + 6) { put(sideMarks, mat[i][0], band(xe, xb, hf - 1.5, hf)); for (let x = xe + 2; x + 4 < xb; x += 6.5) if (RW() < 0.3) put(sideMarks, mat[i][0], band(x, x + 4, hf - 7.5, hf - 3.5)); }
    }
  });
  const seams = [[500, 0, 0.8], [520, 0, 0.84], [640, 1, 0.9], [860, 2, 0.8], [1140, 3, 0.86]].map(([x, i, k]) => band(x, x + 2, 0, megs[i][2] * k));
  // balconies: deep slabs across part of the right block, a lit edge over a band of shade, their rail posts
  const balc = [0.62, 0.5, 0.38].map((k) => megs[3][2] * k), posts = [];
  for (const hb of balc) for (let x = 1108; x < 1180; x += 4) posts.push(band(x, x + 0.9, hb + 1.8, hb + 5.5));
  put(lips, mat[3][1], ...balc.map((hb) => band(1104, 1181, hb, hb + 1.8)));
  flush(lips);
  Pf(C.dTeal, [...lines, ...panes, ...seams, ...balc.map((hb) => band(1104, 1181, hb - 3.5, hb))]);
  Pf(C.dTeal, posts, { cls: 'd' });
  flush(sideMarks);
  // sign boxes, lit from inside, a shade edge on each; the sun on two parapets, the yellow of their trim
  const sign = (xa, xb, h0, h1) => [band(xa, xb, h0, h1), band(xa, xa + 1.5, h0, h1)];
  const signs = [sign(792, 803, megs[2][2] * 0.5, megs[2][2] * 0.74), sign(1112, 1150, megs[3][2] * 0.72, megs[3][2] * 0.79), sign(616, 640, roofH(1, 628) + 3, roofH(1, 628) + 13)];
  Pc(C.dCream2, signs.map((s) => s[0]));
  Pc(C.dTeal, [...signs.map((s) => s[1]), band(626, 627, roofH(1, 628) - 1, roofH(1, 628) + 3), band(633, 634, roofH(1, 628) - 1, roofH(1, 628) + 3), band(803, 808, megs[2][2] * 0.6, megs[2][2] * 0.61)]);
  P(C.lemon, [band(lerp(800, 885, 0.72), 885, megs[2][2] - 5, megs[2][2] - 1), band(lerp(1105, 1214, 0.72), 1214, megs[3][2] * 0.97 - 5, megs[3][2] * 0.97 - 1)]);
  // cables slung between the masts and the roofs
  const sag = (a, b, d) => taper(Array.from({ length: 9 }, (_, k) => { const t = k / 8; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + d * 4 * t * (1 - t)]; }), { w: 1.6 });
  Pc(C.dTeal, [sag(on(537, megs[0][2] + 44), on(651, megs[1][2] + 28), 16), sag(on(651, megs[1][2] + 24), on(828, roofH(2, 828) + 5), 22), sag(on(537, megs[0][2] + 38), on(395, roofH(4, 395) + 5), 12)], { cls: 'd' });

  // the middle layer: blocks in the elevated road's shade, a step darker, their panes darker again
  P(C.teal, midBlocks);
  const mp = [], ml = [];
  mids.forEach(([xa, xb, h]) => { ml.push(band(lerp(xa, xb, 0.8), xb, 0, h)); for (let hf = h - 6; on(xa, hf)[1] < y1 + 6; hf -= 12) for (let x = xa + 3; x + 5 < lerp(xa, xb, 0.78); x += 7) if (RW() < 0.32) mp.push(band(x, x + 4.5, hf - 6, hf - 2)); });
  Pc(C.tealLt, ml); Pc(C.tealDk, mp);

  // the overpass: a straight deck crossing behind the billboard on a diagonal, dark under, a cream rim along its deck,
  // its joints, railing and lamp posts
  const od = (s, y, w = 0) => pr(lerp(-25, 40, s) - w * 0.3, y, lerp(60, 30, s) - w * 0.95);
  const ns = 14, ss = Array.from({ length: ns + 1 }, (_, i) => (i / ns) * 1.3);
  const strip = (ya, yb, w = 0) => [...ss.map((s) => od(s, ya, w)), ...ss.slice().reverse().map((s) => od(s, yb, w))];
  const piers = [0.3, 0.6, 0.9].map((s) => [od(s - 0.008, 8), od(s + 0.008, 8), od(s + 0.008, 0), od(s - 0.008, 0)]);
  const lampPost = (s) => [[od(s, 10.6), od(s + 0.004, 10.6), od(s + 0.004, 16.5), od(s, 16.5)], [od(s, 16.5), od(s + 0.004, 16.5), od(s - 0.02, 16.2, 1.5), od(s - 0.024, 16.2, 1.5)]];
  P(C.dTeal, [...piers, strip(8, 9.6), strip(8, 8, 9)]);
  P(C.tealLt, [strip(9.6, 10.3)]);
  P(C.dCream2, [strip(10.3, 10.6)]);
  Pc(C.dTeal, [0.7, 0.85, 1, 1.15].flatMap(lampPost));
  Pc(C.dTeal, [strip(11.4, 11.6), ...Array.from({ length: 29 }, (_, k) => 0.66 + k * 0.022).map((s) => [od(s, 10.6), od(s + 0.002, 10.6), od(s + 0.002, 11.5), od(s, 11.5)])], { cls: 'd' });

  // the tower against the sun: one dark silhouette, its verticals leaning in with the lens; a cream rim with a white core on
  // every edge that faces the sun (the comb of the beam left dark), its slit dark against the sky in its counter
  [C.navy, C.face, C.navy, C.face2, C.deep, C.deep].forEach((col, i) => P(col, [fronts[i]]));
  P(C.navy, [logo[6].map(TQ)]);
  const rimFronts = fronts.map((f, k) => (k === 2 ? [[443, 658], [725, 764], [734, 863], [497, 766]].map(TQ) : f));
  const rims = rimFronts.map((f, k) => rimLights(rimFronts, { R: rng(78 + k), width: [10, 9, 8, 9, 9, 7], spikes: 0, skip: [0, 1, 2, 3, 4, 5].filter((j) => j !== k), lights: [{ dir: unit([sun[0] - centroid(f)[0], sun[1] - centroid(f)[1]]), col: C.dCream2, min: 0.3, w: 1, core: C.goldW }] })[0]);
  P(C.dCream2, rims.flatMap((r) => r.bands)); P(C.goldW, rims.flatMap((r) => r.cores));
  // the sky's own light on the edges that face away from the sun: a thinner cyan rim
  const [sky] = rimLights(rimFronts, { R: rng(91), width: 6, spikes: 0, skip: [2], lights: [{ dir: unit([-0.9, 0.1]), col: C.rimCyan, min: 0.55, w: 1 }] });
  P(C.rimCyan, sky.bands);

  // the road: asphalt, the far road bright under the sky; the board's long shadow on it, thrown toward the lens
  const gsh = (p) => { const k = p[1] / sunD[1]; return [p[0] - sunD[0] * k, p[2] - sunD[2] * k]; };
  const shade = (p) => { const g = gsh(p); return pr(g[0], 0, g[1]); };
  P(C.dGrey, [[[-14, hz(-14)], [1214, hz(1214)], [1214, ft], [-14, ft]]]);
  P(C.dCream2, [[[-14, hz(-14) - 1], [1214, hz(1214) - 1], [1214, hz(1214) + 4], [-14, hz(-14) + 7]]]);
  const boxPts = [-0.3, Lb].flatMap((u) => [[fr, 0], [fr, Db], [vb, 0], [vb, Db], [vb - 0.1, -0.7]].map(([v, w]) => gsh(wpt(u, v, w))));
  P(C.dTeal, [clipHalf(hull(boxPts), [0, 1.5], [1, 1.5]).map(([x, z]) => pr(x, 0, z))]);

  // the smear: horizontal streaks in three values on the road, thin near the horizon, long and fat at the lens
  const smears = [[], [], []];
  for (let k = 0; k < 70; k++) {
    const z = 1.6 * Math.pow(14, Math.pow(RS(), 0.7)), x0 = lerp(-300, 700, RS()), y = ground(x0, z)[1] + (RS() - 0.5) * 4;
    const near = y > hz(x0) + 34, t = near ? 5 + RS() * 9 : Math.max(1.6, (1 + RS() * 2) * (8 / z)), L = near ? 220 + RS() * 420 : (60 + RS() * 200) * Math.min(3, 8 / z + 0.4);
    smears[RS() < (near ? 0.24 : 0.4) ? 0 : near ? 2 : 1].push(blade([x0, y], hd, L, t, near ? 0.08 : 0.22));
  }
  Pc(C.dCream2, smears[0]); Pc(C.dTeal, smears[1]); Pc(C.dGrey, smears[2]);

  // the posts and their shadows, the braces
  const legs = [1.2, Lb * 0.5, Lb - 0.9];
  const leg = (u, a, b) => [at(u + a, vg, Db / 2), at(u + b, vg, Db / 2), at(u + b, vb, Db / 2), at(u + a, vb, Db / 2)];
  P(C.dTeal, legs.map((u) => [shade(wpt(u - 0.14, vg, Db / 2)), shade(wpt(u + 0.14, vg, Db / 2)), shade(wpt(u + 0.14, vb, Db / 2)), shade(wpt(u - 0.14, vb, Db / 2))]));
  P(C.navy, legs.map((u) => leg(u, -0.14, 0.14)));
  P(C.dCream2, legs.map((u) => leg(u, 0.06, 0.14)));
  const brace = (ua, va, ub, vv) => { const a = wpt(ua, va, Db / 2), b = wpt(ub, vv, Db / 2); return [pr(...a), pr(...b), pr(b[0], b[1] - 0.1, b[2]), pr(a[0], a[1] - 0.1, a[2])]; };
  P(C.navy, [brace(legs[0], vb - 0.2, legs[1], vb - 1.2), brace(legs[1], vb - 0.2, legs[2], vb - 1.2)]);

  // the box against the sun: underside, catwalk and lamp arms dark, the frame round the face in shade
  P(C.navy, [[at(-0.3, vb), at(Lb, vb), at(Lb, vb, Db), at(-0.3, vb, Db)], [at(-0.3, vb), at(Lb, vb), at(Lb, vb - 0.1, -0.7), at(-0.3, vb - 0.1, -0.7)]]);
  const lamps = []; for (let u = 0.9; u < Lb - 0.5; u += Lb / 5) lamps.push([at(u, vb, -0.66), at(u + 0.05, vb, -0.66), at(u + 0.05, vb - 0.06, -1.05), at(u - 0.12, vb - 0.06, -1.05), at(u - 0.12, vb - 0.2, -1.05), at(u + 0.18, vb - 0.2, -1.05)]);
  P(C.navy, lamps);
  P(C.dTeal, [quad(-0.3, Lb, fr, vb)]);
  // the face: a lightbox, lit from inside, in panels; its plastic yellowed where rain runs down from the top frame (only where
  // no word stands: short over the first line, longer past its end, long past the OK) and in a ragged band along its foot
  const sx = [0, Lb * 0.26, Lb * 0.51, Lb * 0.76, Lb - fr];
  P(C.dCream, [quad(-0.3, Lb - fr, 0, -Hb)]);
  const ends = rule.ends, okTop = rule.vs[2] + cm + 0.16, foot = rule.vs[2] + Hb;
  const depth = (u) => (u < ends[0] ? rule.vs[0] + cm + 0.07 : u < ends[1] ? rule.vs[1] + cm + 0.07 : u < rule.ok[1] + 0.08 ? okTop : -Hb + foot * 0.4);
  const drips = [];
  for (let u = 0.15 + RW() * 0.2; u < Lb - fr - 0.12; u += 0.28 + RW() * 0.55) {
    const w = 0.025 + RW() * 0.075, e = lerp(-0.06, Math.max(depth(u - w), depth(u + w)), 0.3 + RW() * 0.7);
    drips.push([at(u - w, 0.01), at(u + w, 0.01), at(u + w * 0.55, e + 0.025), at(u - w * 0.45, e)]);
  }
  const gr = [at(-0.3, -Hb - 0.01)];
  for (let u = -0.3; u < Lb - fr; u += 0.22) gr.push(at(u, -Hb + foot * (0.12 + RW() * 0.3)));
  gr.push(at(Lb - fr, -Hb + foot * 0.2), at(Lb - fr, -Hb - 0.01));
  P(C.dCream2, [...drips, gr]);
  P(C.dGrey, sx.slice(1, 4).map((u) => quad(u - 0.012, u + 0.012, 0, -Hb)));

  // the OK screen, then the words printed on the panels
  const { v: ov, sM } = rule.end, capM = capOf(F, sM);
  P(C.navy, [quad(rule.ok[0] - 0.05, rule.ok[1] + 0.05, ov - 0.12, ov + capM + 0.12)]);
  P(C.gBadge, [quad(rule.ok[0], rule.ok[1], ov - 0.08, ov + capM + 0.08)]);
  for (const { fc, s, m } of rule) page.text(fc, s, 0, 0, { size, fill: C.dInk, matrix: m, ...keep });

  // the sun on the two edges that face it: the yellow paint of the top lip and the far end, a white-hot core on each
  P(C.lemon, [quad(-0.3, Lb, fr, fr - 0.075), quad(Lb - 0.07, Lb, fr, vb)]);
  P(C.goldW, [quad(-0.3, Lb, fr, fr - 0.028), quad(Lb - 0.026, Lb, fr, vb)]);
}
