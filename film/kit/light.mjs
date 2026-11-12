// The episode grammar (scenes only): the night camera and the tower as a solid, light as flat rim bands with a thin halo
// outside, practicals that blow out to a tinted core, hard-band skies, windows lit in runs, tube and box signs, LED letters,
// the impact's bolts, and static. Light is only ever drawn: hard bands inside an edge, translucent copies outside it. No
// gradient, filter, mask or blend: every halo is a few wide translucent strokes of the light's own colour, drawn once in defs
// and reused with <use>.
import { C, rng, camera, polyD, taper, bboxOf, polyArea, lerp, lerpP, clipConvex, lineSpans, dist, n2, tint, line, openD } from './draw.mjs';
import { logo } from './scene.mjs';
import { faces, capOf, measure } from './type.mjs';
import { GuardError } from './letters.mjs';

const unit = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const grow = (b, m) => [b[0] - m, b[1] - m, b[2] + m, b[3] + m];

// ---------- the night camera: on the street at the tower's foot, looking up 40 degrees, rolled 15 ----------
export const NIGHT = { s: 0.2, z0: 150, depth: 45, pos: [-30, 1.6, 0], pitch: 0.7, roll: -0.26, f: 1003.2, cx: 439, cy: 247.9 };
export const ncam = camera({ pos: NIGHT.pos, pitch: NIGHT.pitch, roll: NIGHT.roll, f: NIGHT.f, cx: NIGHT.cx, cy: NIGHT.cy });
// a logo point on the tower's face (d = 0) or pushed back d into its depth, in world units
export const N3 = (p, d = 0) => [(p[0] - 512) * NIGHT.s, (911 - p[1]) * NIGHT.s, NIGHT.z0 + d];
// a world point on the page, and a logo point on the page (a1's framing: the tower fills 1200 x 1040)
export const NW = (P) => { const q = ncam.project(P); return [q[0], q[1]]; };
export const NT = (p, d = 0) => NW(N3(p, d));
export const UP = NW([0, 1e6, NIGHT.z0]); // where every vertical of the set meets, far above the frame
// the lights of the night set, as directions toward them on the page: cyan from a sign off the right, violet from the sky
// gap above the left
export const KEY = unit([1, 0.12]);
export const FILL = unit([-1, -0.45]);

// The same tower framed for another tile: NT scaled by s and moved by (tx, ty). The returned map(p, d = 0) also carries
// .up, the set's vertical vanishing point under that framing, and .s.
export function nightMap({ s = 1, tx = 0, ty = 0 } = {}) {
  const map = (p, d = 0) => { const q = NT(p, d); return [q[0] * s + tx, q[1] * s + ty]; };
  map.up = [UP[0] * s + tx, UP[1] * s + ty]; map.s = s;
  return map;
}

// ---------- geometry helpers ----------
export function inside(poly, p) {
  let n = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) n++;
  }
  return n % 2 === 1;
}
export function hull(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// the unit normal of edge i pointing into the polygon
export const inward = (poly, i) => {
  const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
  const m = lerpP(a, b, 0.5);
  if (!inside(poly, [m[0] + nx * 2, m[1] + ny * 2])) { nx = -nx; ny = -ny; }
  return [nx, ny];
};

// ---------- the tower as a megastructure ----------
export const FACE_KEYS = ['slab', 'blade', 'beam', 'top', 'side', 'foot'];
// The tower's six faces and the depth walls the camera sees, through a map (nightMap(), or NT for a1's framing).
// Returns {fronts: [six polygons, in FACE_KEYS order], walls: [{k, i, q, down}], slit}. Walls come far first: paint them in
// order, then the fronts. `down` marks a wall facing the street (an underside).
export function towerSolid(map = NT) {
  const fronts = logo.slice(0, 6).map((poly) => poly.map((p) => map(p, 0)));
  const walls = [];
  const cam = NIGHT.pos;
  logo.slice(0, 6).forEach((poly, k) => {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const A = N3(a), B = N3(b);
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
      const mid = lerpP(a, b, 0.5), probe = [mid[0] + (-(b[1] - a[1]) / L) * 3, mid[1] + ((b[0] - a[0]) / L) * 3];
      const outLogo = inside(poly, probe) ? -1 : 1; // logo-space normal sign; logo y is flipped in the world
      const nx = (-(b[1] - a[1]) / L) * outLogo, ny = -((b[0] - a[0]) / L) * outLogo;
      const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, A[2] + NIGHT.depth / 2];
      if (nx * (cam[0] - M[0]) + ny * (cam[1] - M[1]) <= 0) continue;
      const q = [map(a, 0), map(b, 0), map(b, NIGHT.depth), map(a, NIGHT.depth)];
      walls.push({ k, i, q, n: [nx, ny], dist: Math.hypot(cam[0] - M[0], cam[1] - M[1], cam[2] - M[2]), down: ny < -0.5 });
    }
  });
  walls.sort((x, y) => y.dist - x.dist);
  return { fronts, walls, slit: logo[6].map((p) => map(p, 0)) };
}

// The cels' cast shadows on the tower, in logo coordinates: hard, spiky, one tone darker. Map each through the tower's map.
export const CEL = [
  [[456, 170], [450, 300], [426, 290], [440, 360], [412, 352], [446, 430], [441, 484], [420, 520], [436, 380], [404, 395], [420, 300], [396, 262], [430, 220]],
  [[475, 276], [551, 588], [761, 650], [700, 600], [716, 580], [650, 560], [664, 530], [600, 500], [612, 462], [560, 430], [574, 380], [526, 350], [540, 300], [500, 262]],
  [[443, 658], [725, 764], [640, 748], [652, 770], [590, 756], [570, 778], [530, 742], [470, 700]],
];

// ---------- rim light ----------
// One flat band of a pure hue inside edge i of a face, hard on its inner side: its inner edge is offset w, tapered toward the
// ends, and broken by `spikes` spikes of 1.9 to 3.1 w where the cels cut it. No line on that edge: the band is the edge.
export function rimBand(face, i, w, R, { spikes = 1, t0 = 0, t1 = 1, taper = 0.35, clip } = {}) {
  const a = face[i], b = face[(i + 1) % face.length], [nx, ny] = inward(face, i);
  const A = lerpP(a, b, t0), B = lerpP(a, b, t1);
  const n = spikes ? 6 + spikes * 3 : 2, inner = [];
  const at = new Set(); for (let k = 0; k < spikes; k++) at.add(2 + Math.floor(R() * Math.max(1, n - 4)));
  for (let k = 0; k <= n; k++) {
    const t = k / n, e = spikes ? Math.min(1, Math.min(t, 1 - t) / 0.18) : 1;
    let ww = w * (taper + (1 - taper) * e) * (0.92 + R() * 0.16);
    if (at.has(k)) ww *= 1.9 + R() * 1.2;
    const p = lerpP(A, B, t);
    inner.push([p[0] + nx * ww, p[1] + ny * ww]);
  }
  const band = [A, B, ...inner.reverse()];
  return clip ? clipConvex(band, clip) : band;
}
// an edge shared with another face of the same solid: light never falls there
const sharedEdge = (fronts, k, i) => {
  const f = fronts[k], a = f[i], b = f[(i + 1) % f.length], [nx, ny] = inward(f, i), m = lerpP(a, b, 0.5);
  return fronts.some((g, j) => j !== k && inside(g, [m[0] - nx * 5, m[1] - ny * 5]));
};
// The night lights: cyan key from the right, violet fill from the upper left (0.75 as wide). An edge is lit by the first light
// its outward normal turns to by more than `min`.
export const NIGHT_LIGHTS = [{ dir: KEY, col: C.rimCyan, min: 0.42, w: 1 }, { dir: FILL, col: C.rimViolet, min: 0.6, w: 0.75 }];
// Every lit edge of a set of faces, as geometry: [{col, core, bands, cores, edges}] per light. `width` is the band in page
// units, one number or one per face; `skip` lists face indices left dark; a light may carry `core` (a colour) for a thin hot
// band at 0.35 of the width inside its band.
export function rimLights(fronts, { R = rng(1), lights = NIGHT_LIGHTS, width = 12, skip = [], spikes = 1 } = {}) {
  const out = lights.map((l) => ({ col: l.col, core: l.core, bands: [], cores: [], edges: [] }));
  fronts.forEach((f, k) => {
    if (skip.includes(k)) return;
    const clip = hull(f), W = Array.isArray(width) ? width[k] : width;
    for (let i = 0; i < f.length; i++) {
      if (sharedEdge(fronts, k, i)) continue;
      const [nx, ny] = inward(f, i);
      const j = lights.findIndex((l) => -nx * l.dir[0] - ny * l.dir[1] > l.min);
      if (j < 0) continue;
      const w = W * (lights[j].w ?? 1);
      out[j].bands.push(rimBand(f, i, w, R, { spikes, clip }));
      if (lights[j].core) out[j].cores.push(rimBand(f, i, w * 0.35, R, { spikes: 0, clip, taper: 0.2 }));
      out[j].edges.push([f[i], f[(i + 1) % f.length]]);
    }
  });
  return out;
}
// The halo of a rim: the lit edges as one open path, stroked thin and faint, 14u at .14 and 6u at .30 (stroke widths), the
// same in both compositions. On a phone a wider halo outgrows the band (bands are 7.5 to 15u, 2 to 4 px at 293) and the rim
// reads as a glowing outline; at these widths it stays a flat band with a hairline of light outside it. Draw it before the
// faces when it must stay outside them, after them for a spill over the face.
export function rimHalo(page, edges, col, { cls, before, from, z } = {}) {
  const d = openD(edges);
  if (!d) return;
  const id = page.nid();
  page.share(id, `<path id="${id}" d="${d}"/>`);
  const layer = (w, op) => `<use href="#${id}" stroke-width="${n2(w)}" stroke-opacity="${n2(op)}"/>`;
  const m = `<g fill="none" stroke="${col}" stroke-linejoin="round" stroke-linecap="round">${layer(14, 0.14)}${layer(6, 0.3)}</g>`;
  page.raw(m, grow(bboxOf(edges.flat()), 9), { cls, before, from, z });
}
// halos then bands then cores, for every light of rimLights()
export function drawRims(page, rims, { cls, before, from, halo = true } = {}) {
  for (const r of rims) {
    if (!r.bands.length) continue;
    if (halo) rimHalo(page, r.edges, r.col, { cls, before, from });
    page.polys(r.bands, `fill="${r.col}"`, { cls, before, from });
    if (r.cores.length) page.polys(r.cores, `fill="${r.core}"`, { cls, before, from });
  }
}

// Two-tone cel light: the second tone along edge i of a convex face, w0 wide at the edge's start and w1 at its end, its inner
// edge cut in teeth the way the show cuts shadow shapes. Clipped to the face. Returns a polygon.
export function litZone(poly, i, w0, w1, { teeth = 9, amp = 14, seed = 1 } = {}) {
  const R = rng(seed);
  const a = poly[i], b = poly[(i + 1) % poly.length];
  const [nx, ny] = inward(poly, i);
  const inner = [];
  for (let k = 0; k <= teeth * 2; k++) {
    const t = Math.min(1, Math.max(0, (k + (k % 2 ? (R() - 0.5) * 1.2 : 0)) / (teeth * 2))), w = lerp(w0, w1, t) + (k % 2 ? amp * (0.2 + R() * 1.4) : -amp * 0.3 * R()), q = lerpP(a, b, t);
    inner.push([q[0] + nx * w, q[1] + ny * w]);
  }
  const zone = [[a[0] - nx * 2, a[1] - ny * 2], [b[0] - nx * 2, b[1] - ny * 2], ...inner.reverse()];
  return clipConvex(zone, hull(poly));
}

// ---------- glow (light sources only) ----------
// Fake glow: the shapes once in defs, halo strokes as <use> (desktop reach 26/12/5u at .07/.16/.35, phone 64/34/14u), then
// the shapes filled (fill: null for none) and an optional core (a fill, or a stroke coreW wide). `open` strokes polylines.
export function glow(page, polys, col, { widths = [26, 12, 5], phone = [64, 34, 14], ops = [0.07, 0.16, 0.35], fill = col, core, coreW = 0, open = false, cls, before, from, z } = {}) {
  const d = (open ? openD(polys) : polys.filter((p) => p && p.length > 2).map((p) => `${openD([p])}z`).join(''));
  if (!d) return;
  const id = page.nid();
  page.share(id, `<path id="${id}" d="${d}"/>`);
  const layers = (ws) => ws.map((w, k) => `<use href="#${id}" stroke-width="${n2(w * 2)}" stroke-opacity="${n2(ops[k])}"/>`).join('');
  let m = `<g fill="none" stroke="${col}" stroke-linejoin="round"${open ? ' stroke-linecap="round"' : ''}><g class="d">${layers(widths)}</g><g class="m">${layers(phone)}</g>${core && coreW ? `<use href="#${id}" stroke="${core}" stroke-width="${n2(coreW)}"/>` : ''}</g>`;
  if (fill && !open) m += `<use href="#${id}" fill="${fill}"/>`;
  if (core && !coreW) m += `<use href="#${id}" fill="${core}"/>`;
  page.raw(m, grow(bboxOf(polys.flat()), Math.max(...widths, ...phone, 0) + 2), { cls, before, from, z });
}

// A practical light: discs of its colour at 9r (.05), 6r (.07), 4r (.12) and 2r (.30), then a tinted-white core disc at r.
export function lamp(page, c, r, col, { core = C.mintW, cls, before, from, z } = {}) {
  const disc = (rr, a) => `<circle cx="${n2(c[0])}" cy="${n2(c[1])}" r="${n2(rr)}"${a}/>`;
  page.raw(`<g fill="${col}">${disc(9 * r, ' fill-opacity=".05"')}${disc(6 * r, ' fill-opacity=".07"')}${disc(4 * r, ' fill-opacity=".12"')}${disc(2 * r, ' fill-opacity=".3"')}</g>${disc(r, ` fill="${core}"`)}`, [c[0] - 9 * r, c[1] - 9 * r, c[0] + 9 * r, c[1] + 9 * r], { cls, before, from, z });
}

// ---------- skies ----------
// Hard bands parallel to the horizon. `horizon` is a y, two points [[x0, y0], [x1, y1]], or a function x => y (sampled every
// 100u or so). `cols` run from the top band to the band at the horizon; `offs` are the band edges as heights above the
// horizon (one fewer than cols, largest first). The top band starts at `top` (a page y: the scene's top seam), the last ends
// `foot` under the horizon. Every band but the last runs on under the next band to that band's lower edge, and the next band
// paints over it: so the pixel row an edge falls in is always fully covered by the band above before the band below covers
// part of it, and no ground shows through at any scale (a 2u overlap was half a pixel at 293 and left a hairline). The
// polygons have the same number of points either way. Night: [sky0..sky4], darker toward the horizon. Day: [day0..day3],
// lighter toward it.
export const NIGHT_SKY = [C.sky0, C.sky1, C.sky2, C.sky3, C.sky4];
export const DAY_SKY = [C.day0, C.day1, C.day2, C.day3];
export function skyBands(page, horizon, cols, offs, { x0 = -14, x1 = 1214, top, foot = 0, before, from, cls, z } = {}) {
  const curved = typeof horizon === 'function';
  const h = curved ? horizon : typeof horizon === 'number' ? () => horizon : (x) => horizon[0][1] + (x - horizon[0][0]) * (horizon[1][1] - horizon[0][1]) / (horizon[1][0] - horizon[0][0]);
  if (offs.length !== cols.length - 1) throw new Error('skyBands: one band edge fewer than colours');
  const t0 = top ?? Math.min(h(x0), h(x1)) - (offs[0] ?? 0) - 600;
  const edge = (k) => (x) => (k < 0 ? t0 : k >= offs.length ? h(x) + foot : h(x) - offs[k]);
  const n = curved ? Math.max(1, Math.ceil((x1 - x0) / 100)) : 1, xs = Array.from({ length: n + 1 }, (_, j) => lerp(x0, x1, j / n));
  cols.forEach((col, i) => {
    const a = edge(i - 1), b = edge(Math.min(i + 1, offs.length));
    page.polys([[...xs.map((x) => [x, a(x)]), ...xs.slice().reverse().map((x) => [x, b(x)])]], `fill="${col}"`, { cls, before, from, z });
  });
}

// ---------- windows ----------
// Windows on a face: one pattern per colour, laid along the face by its own transform (one window per cell of `cell` page
// units, fx by fy of the cell), filled only inside lit runs of floors. quad is [bottom left, bottom right, top right, top left].
// `col` is a colour or a list (each run takes one). `runs` stretches per lit floor, `p` the share of floors lit. Cells must be
// 18u wide or more. Returns the lit run polygons.
export function windows(page, quad, { cell = [24, 30], fx = 0.5, fy = 0.36, col = C.led, runs = 2, p = 0.5, seed = 1, minLen = 2, cls, before, from, z } = {}) {
  const [BL, BR, TR, TL] = quad;
  const cols = Math.max(1, Math.round(dist(BL, BR) / cell[0])), rows = Math.max(1, Math.round(dist(BL, TL) / cell[1]));
  const u = [(BR[0] - BL[0]) / cols, (BR[1] - BL[1]) / cols], v = [(TL[0] - BL[0]) / rows, (TL[1] - BL[1]) / rows];
  if (Math.hypot(u[0], u[1]) < 18) throw new GuardError('Floors', `windows: cells ${Math.hypot(u[0], u[1]).toFixed(1)}u wide, under 18u`);
  const at = (a, b) => lerpP(lerpP(BL, BR, a), lerpP(TL, TR, a), b);
  const cs = Array.isArray(col) ? col : [col];
  const R = rng(seed), by = cs.map(() => []);
  for (let j = 0; j < rows; j++) {
    if (R() > p) continue;
    let i = Math.floor(R() * cols * 0.4);
    for (let k = 0; k < runs && i < cols; k++) {
      const len = Math.min(cols - i, minLen + Math.floor(R() * cols * 0.6)), ci = Math.floor(R() * cs.length);
      by[ci].push([at(i / cols, j / rows), at((i + len) / cols, j / rows), at((i + len) / cols, (j + 1) / rows), at(i / cols, (j + 1) / rows)]);
      i += len + 1 + Math.floor(R() * 4);
    }
  }
  const mx = [u[0], u[1], v[0], v[1], BL[0], BL[1]].map(n2).join(' ');
  cs.forEach((c, ci) => {
    if (!by[ci].length) return;
    const id = 'p' + page.nid();
    page.def(id, `<pattern id="${id}" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="matrix(${mx})"><path fill="${c}" d="M${n2((1 - fx) / 2)} ${n2((1 - fy) / 2)}h${n2(fx)}v${n2(fy)}h-${n2(fx)}z"/></pattern>`);
    page.polys(by[ci], `fill="url(#${id})"`, { cls, before, from, z });
  });
  return by.flat();
}

// ---------- light shafts and streaks ----------
// A shaft of light falling from y0 to y1: three flat translucent wedges, the wide one first, then a narrower one, then a
// narrow bright core that carries the beam. w is its width at the foot. `ops` gives the three opacities (a third left out is
// .5: the core must read as a beam, not a fold).
export function shaft(page, x, y0, y1, w, col, { lean = 0, ops = [0.16, 0.08, 0.5], cls, before, from, z } = {}) {
  const wedge = (a, b) => [[x - w * a, y0], [x + w * a, y0], [x + w * b + lean, y1], [x - w * b + lean, y1]];
  page.polys([wedge(0.3, 0.5)], tint(col, ops[0]), { cls, before, from, z });
  page.polys([wedge(0.12, 0.22)], tint(col, ops[1]), { cls, before, from, z });
  page.polys([wedge(0.035, 0.07)], tint(col, ops[2] ?? 0.5), { cls, before, from, z });
}
// n long horizontal speed streaks inside rect [x0, y0, x1, y1]: fat lenses 10 to 24u thick, pointed at both ends, fattest
// near the leading end, at .85, as one path. The phone copy (m) holds each at 16u or more, so none thins to a hairline at 293.
export function streaks(page, rect, n, col, { op = 0.85, seed = 1, cls, before, from, z } = {}) {
  const R = rng(seed), [x0, y0, x1, y1] = rect, W = x1 - x0, out = [], phone = [];
  const lens = (a, b, y, t) => { const len = b - a, m = a + len * 0.72, s = a + len * 0.4; return [[a, y], [s, y - t * 0.3], [m, y - t / 2], [b, y], [m, y + t / 2], [s, y + t * 0.3]]; };
  for (let k = 0; k < n; k++) {
    const y = lerp(y0, y1, (k + 0.2 + R() * 0.6) / n), len = W * (0.3 + R() * 0.4), a = x0 + R() * (W - len), t = 10 + R() * 14;
    out.push(lens(a, a + len, y, t));
    phone.push(lens(a, a + len, y, Math.max(t, 16)));
  }
  const c = (dm) => [cls, dm].filter(Boolean).join(' ');
  page.polys(out, tint(col, op), { cls: c('d'), before, from, z });
  page.polys(phone, tint(col, op), { cls: c('m'), before, from, z });
  return out;
}

// ---------- signs ----------
// Tube letters, as the show paints a lit tube sign (ref09's HO, ref04's night signs): one fat glass tube per stroke.
//
// Latin letters come from faces.tube, whose glyphs are the centre lines of Archivo's thinnest extended cut. Stroked fat with
// round joins, each stroke is one monoline tube with round ends, TUBE.cap of the cap height wide (TUBE.min at least): the
// tube in its darker shade of the same hue (TUBE_EDGE by colour; `edge` overrides it), its body in `col` TUBE.body as wide and
// set TUBE.lift of the tube up and right, so the shade shows only along the tube's lower-left side, and a near-white `core`
// TUBE.core of the tube down the body. At night it throws a faint halo in the steps of TUBE.halo, each [its reach past the tube
// as a share of the tube, its opacity] (`halo: []` for none, as ref09's signs by day). One copy serves both columns: the tube
// is TUBE.min or more.
//
// Any other face (the kana of Dela Gothic One) is a contour tube: the same three layers laid along the glyph's outline, the
// tube TUBE.w of the size (TUBE.contour at least), the shade TUBE.edge as wide and set TUBE.off of the tube down and left. A
// contour tube has no halo: a halo along both sides of a stem fills the stem with a flat band. Under TUBE.solid u its phone
// copy is the letters filled solid over one short halo (a TUBE.solidHalo stroke at .16, its inner half under the fill): a
// contour tube closes a small letter's stems and counters, kana and kanji most of all. Letters of 46u or more, or the build
// stops. `vstep` sets the word vertically.
export const TUBE = { cap: 0.14, min: 6, body: 0.8, lift: 0.1, core: 0.22, halo: [[0.15, 0.14], [0.45, 0.06]], w: 0.05, contour: 3.4, phone: 6, edge: 1.22, off: 0.17, solid: 90, solidHalo: 16 };
export const TUBE_EDGE = { [C.led]: C.teal, [C.pink]: C.rBody };
export function tube(page, F, str, x, y, size, col, core, { edge, halo = TUBE.halo, rot = 0, vstep = 0, cls, before, from, z } = {}) {
  if (size < 46 - 1e-9) throw new GuardError('Floors', `tube "${str}" is ${+size.toFixed(1)}u, under 46u`);
  const s = size / (F.em || 100), k = (w) => w / s, ed = edge ?? TUBE_EDGE[col] ?? C.deep;
  const o = { size, rot, vstep, before, from, z };
  const c = (dm) => [cls, dm].filter(Boolean).join(' ');
  if (F.centre) {
    const tw = Math.max(TUBE.cap * capOf(F, size), TUBE.min), up = TUBE.lift * tw;
    for (const [reach, op] of halo) page.text(F, str, x, y, { ...o, cls, paint: line(col, k(tw * (1 + 2 * reach)), { op }) });
    page.text(F, str, x, y, { ...o, cls, paint: line(ed, k(tw)) });
    page.text(F, str, x + up, y - up, { ...o, cls, paint: line(col, k(TUBE.body * tw)) });
    page.text(F, str, x + up, y - up, { ...o, cls, paint: line(core, k(TUBE.core * tw)) });
    return;
  }
  const lay = (tw, dm) => {
    const off = TUBE.off * tw;
    page.text(F, str, x - off, y + off, { ...o, cls: c(dm), paint: line(ed, k(TUBE.edge * tw)) });
    page.text(F, str, x, y, { ...o, cls: c(dm), paint: line(col, k(tw)) });
    page.text(F, str, x, y, { ...o, cls: c(dm), paint: line(core, k(TUBE.core * tw)) });
  };
  const tw = Math.max(TUBE.w * size, TUBE.contour);
  if (size < TUBE.solid) {
    lay(tw, 'd');
    page.text(F, str, x, y, { ...o, cls: c('m'), paint: line(col, k(TUBE.solidHalo), { op: 0.16 }) });
    page.text(F, str, x, y, { ...o, cls: c('m'), fill: col });
  } else if (tw >= TUBE.phone) lay(tw); // one tube both columns read
  else { lay(tw, 'd'); lay(TUBE.phone, 'm'); }
}
// A lit box sign: the light is in the box, not round the letters. A panel (`panel`), washed with the sign's own colour at
// `wash` (the light inside it falling on its face), its frame a tube of the light lit through `glow` (BOX.frame u, BOX.phone
// on a phone; a short halo of BOX.widths / BOX.phoneWidths outside it, over the wall: the panel covers its inner half), and
// the letters solid in `col` with no halo of their own (a halo round letters reads as a grey ring, then an olive one). `pad`
// is the margin round the letters as a share of the size, `padX` the side margins if they differ. (x, y) is the baseline
// start. Returns {box, width, cap}.
export const BOX = { wash: 0.1, frame: 2.5, phone: 6, widths: [8, 3.5], phoneWidths: [12, 6], ops: [0.06, 0.3] };
export function boxSign(page, F, str, x, y, size, col, { panel = C.deep, pad = 0.45, padX = pad, upper = false, wash = BOX.wash, cls, before, from, z } = {}) {
  const text = upper ? str.toUpperCase() : str, width = measure(F, text, size), cap = capOf(F, size), p = pad * size, px = padX * size;
  const box = [x - px, y - cap - p, x + width + px, y + p];
  const rect = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
  const c = (dm) => [cls, dm].filter(Boolean).join(' ');
  glow(page, [rect], col, { fill: panel, widths: BOX.widths, phone: BOX.phoneWidths, ops: BOX.ops, cls, before, from, z });
  if (wash) page.polys([rect], tint(col, wash), { cls, before, from, z });
  page.polys([rect], line(col, BOX.frame), { cls: c('d'), before, from, z });
  page.polys([rect], line(col, BOX.phone), { cls: c('m'), before, from, z });
  page.text(F, text, x, y, { size, cls, before, from, z, fill: col });
  return { box, width, cap };
}

// ---------- LED letters ----------
// The LED face's dot grid at a size, in page units: {pitch, x, y}, the first dot's centre from the glyph origin (y up is
// negative). A dead row of LEDs is a band `pitch` tall on that grid.
export function ledGrid(size) {
  const F = faces.led, k = size / F.em;
  return { pitch: F.pixel.pitch * k, x: F.pixel.x * k, y: F.pixel.y * k, cap: capOf(F, size) };
}
// LED words in DotGothic16 (em 160). Desktop: a dim fill of the letters (col at `dim`), then the lit dots: a pattern laid in
// glyph units on the font's own pixel grid, one dot of radius 3.6 glyph units per pixel, so the dots sit on the grid at any
// rotation or matrix. Phone: a swap makes the dots solid. A halo of one glyph stroke (reach 3u, .18). Only at 110u or more
// (the effective size under a matrix). `colors` maps letter indices to another colour (the wrong letters). Returns
// {width, pitch} in page units along the baseline.
export function ledText(page, str, x, y, size, col, { rot = 0, matrix, dim = 0.22, colors = {}, cls, before, from, z } = {}) {
  const F = faces.led, s = size / F.em;
  const eff = matrix ? size * Math.sqrt(Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])) : size;
  if (eff < 110 - 1e-9) throw new GuardError('Floors', `LED text "${str}" is ${eff.toFixed(1)}u, under 110u`);
  // runs of letters that share a colour, each placed by its offset along the baseline in glyph units
  const runs = []; let off = 0;
  [...str].forEach((ch, i) => {
    const c = colors[i] || col, last = runs[runs.length - 1];
    if (last && last.col === c) last.str += ch; else runs.push({ col: c, str: ch, off });
    off += F.glyphs[ch][0] * F.em / F.upm;
  });
  page._led ||= new Map();
  const r = (rot * Math.PI) / 180, co = Math.cos(r), si = Math.sin(r);
  for (const run of runs) {
    const c = run.col, key = c.slice(1);
    if (!page._led.has(c)) page._led.set(c, 'z' + 'LMNOPQRSTUVWXYZ'[page._led.size]);
    const tok = page._led.get(c), pid = 'pL' + key, P = F.pixel;
    page.def(pid, `<pattern id="${pid}" width="${P.pitch}" height="${P.pitch}" patternUnits="userSpaceOnUse" x="${n2(P.x - P.pitch / 2)}" y="${n2(P.y - P.pitch / 2)}"><circle cx="${n2(P.pitch / 2)}" cy="${n2(P.pitch / 2)}" r="3.6" fill="${c}"/></pattern>`);
    page.swap(tok, `.${tok} g{fill:${c}}`);
    const at = matrix ? { matrix: [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4] + matrix[0] * s * run.off, matrix[5] + matrix[1] * s * run.off] } : {};
    const px = x + co * run.off * s, py = y + si * run.off * s;
    const o = { size, rot, before, from, z, crossing: !!matrix, ...at };
    page.text(F, run.str, px, py, { ...o, cls, paint: line(c, 6 / s, { op: 0.18 }) });
    page.text(F, run.str, px, py, { ...o, cls, paint: tint(c, dim) });
    page.text(F, run.str, px, py, { ...o, cls: [cls, tok].filter(Boolean).join(' '), paint: `fill="url(#${pid})"` });
  }
  return { width: off * s, pitch: F.pixel.pitch * s };
}

// ---------- the impact ----------
// A jagged bolt from a toward b: n kinks, each thrown sideways by up to amp, less toward b. Returns the polyline.
export function bolt(a, b, { n = 7, amp = 30, seed = 1 } = {}) {
  const R = rng(seed);
  const pts = [a];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
  for (let i = 1; i < n; i++) { const t = i / n, o = (R() - 0.5) * 2 * amp * (1 - t * 0.5); const p = lerpP(a, b, t); pts.push([p[0] + nx * o, p[1] + ny * o]); }
  pts.push(b);
  return pts;
}
// Bolts that read gold with a white-hot core over a burnt-amber glow, as on the show's impact frames. The glow is a ramp of
// goldD (the impact frame's measured glow, #8B4D0F) in three flat steps, 64u at .2, 40u at .45 and 22u at .85: stacked over
// the ink they come out (34,20,13), (81,46,14) and (130,72,15), the frame's own glow at those distances from its core. Then
// three bodies, one inside the other: gold 11u, pale gold 5.5u, white 2.4u. Every layer, the glow included, is tapered to a
// point at both ends (no round cap runs past the body). One path per layer for all the bolts. `bolts` is one polyline or a
// list of them. The glow is dark amber, so it reads only over the ink: lay each bolt on the ink from end to end, its centre
// line 20u or more inside it (the faint 64u step may spill onto cream as a light tan haze; the inner steps over cream read as
// a brown rope), and paint any cream shard that crosses a bolt after the bolts (the frame's bolts fade into the cream).
// BOLT lists the layers: [width, colour key, opacity].
const BOLT_PROFILE = (t) => Math.min(1, Math.sin(Math.PI * t) * 1.6);
export const BOLT = [[64, 'goldD', 0.2], [40, 'goldD', 0.45], [22, 'goldD', 0.85], [11, 'gold', 1], [5.5, 'goldP', 1], [2.4, 'goldW', 1]];
export function boltDraw(page, bolts, { cls, before, from, z } = {}) {
  const list = (typeof bolts[0][0] === 'number' ? [bolts] : bolts).filter((p) => p && p.length > 1);
  if (!list.length) return;
  const body = (w) => list.map((pts) => polyD(taper(pts, { w, prof: BOLT_PROFILE, n: 0 }))).join('');
  const m = BOLT.map(([w, k, op]) => `<path fill="${C[k]}"${op < 1 ? ` fill-opacity="${n2(op)}"` : ''} d="${body(w)}"/>`).join('');
  page.raw(m, grow(bboxOf(list.flat()), BOLT[0][0] / 2 + 2), { cls, before, from, z });
}

// ---------- static (b4's crack and c2's slit, nowhere else) ----------
// Static as the show draws it (ref23): a field of the static's black, salted all over with a speckle of its white, and
// streaked with short horizontal runs of white (3 to 8u tall, 12 to 60u long), most of them bunched in a few bands that drift
// across the field, a pink run now and then (one in twelve). The speckle is rows of round dots, one row every 3 to 5u, each
// row a plain stroke dashed `.1` on and 3 to 22u off with round caps, in two dot sizes (2.6u, 3.4u) with their own irregular
// gaps, so dots cluster and leave holes as noise does. A dash pattern restarts at the start of every subpath, so a row is two
// subpaths that start at the same random point anywhere in the pattern's length, one running right to the area's edge and
// one running left to the other edge: the dots fall at a random phase in every row and no column of them lines up along an
// edge. The whole speckle is two paths of plain flat strokes (no pattern, no clip), so it works in a looping tile. `area`
// is a rectangle [x0, y0, x1, y1] or a polygon ([[x, y], ...], concave is fine): a polygon is filled as the ground, and every
// run and every row of dots is cut to lie inside it at build time. `n` (runs) defaults to one per STATIC.perRun u2 of area
// (at least 6), so runs and speckle together cover 29 to 38% of an area in white at 846 (ref23's static: 35%). `ground` is
// the field's colour (null for none: then one run in four is black). `speckle: false` leaves the dots out. Returns the runs.
export const STATIC = {
  perRun: 360, rows: [3, 5],
  dots: [[2.6, [0.1, 3.2, 0.1, 12.5, 1.2, 4.1, 0.1, 18.8, 0.1, 3.6, 0.1, 8.3, 2.1, 13.9, 0.1, 5.4, 0.1, 3.1, 0.1, 10.7]], [3.4, [0.1, 4.4, 0.1, 16.3, 0.1, 3.9, 1.6, 9.8, 0.1, 22.2, 0.1, 4.2, 0.1, 6.7, 0.1, 12.4, 2.4, 7.8]]],
};
export function staticBlocks(page, area, R, { n, ground = C.stK, speckle = true, cls, before, from, z } = {}) {
  const poly = typeof area[0] === 'number' ? [[area[0], area[1]], [area[2], area[1]], [area[2], area[3]], [area[0], area[3]]] : area;
  const [x0, y0, x1, y1] = bboxOf(poly), W = x1 - x0, H = y1 - y0;
  const runs = n ?? Math.max(6, Math.round(Math.abs(polyArea(poly)) / STATIC.perRun));
  // the parts of a horizontal line at yy that lie inside the area
  const spans = (yy) => lineSpans([x0 - 1, yy], [x1 + 1, yy], poly).map(([a, b]) => [lerp(x0 - 1, x1 + 1, a), lerp(x0 - 1, x1 + 1, b)]);
  // the parts of xa..xb inside the area both at ya and at yb (a strip's top and bottom)
  const both = (xa, xb, ya, yb) => {
    const out = [];
    for (const [a0, a1] of spans(ya)) for (const [b0, b1] of spans(yb)) { const l = Math.max(xa, a0, b0), r = Math.min(xb, a1, b1); if (r > l) out.push([l, r]); }
    return out;
  };
  const bands = Array.from({ length: 3 + Math.floor(R() * 3) }, () => ({ y: y0 + H * (0.1 + R() * 0.8), drift: (R() - 0.5) * 0.5, spread: 6 + R() * 16 }));
  const cols = [C.stW, C.stK, C.stP], by = [[], [], []], out = [];
  for (let k = 0; k < runs; k++) {
    const h = 3 + R() * 5, w = 12 + R() * 48, b = bands[k % bands.length], inBand = R() < 0.75;
    const cx = x0 + R() * W, cy = inBand ? b.y + (cx - x0 - W / 2) * b.drift + (R() - 0.5) * 2 * b.spread : y0 + R() * H;
    const yy = Math.min(Math.max(cy - h / 2, y0), y1 - h);
    const ci = k % 12 === 5 ? 2 : ground == null && k % 4 === 1 ? 1 : 0;
    for (const [l, r] of both(cx - w / 2, cx + w / 2, yy + 0.01, yy + h - 0.01)) if (r - l >= 4) { const q = [[l, yy], [r, yy], [r, yy + h], [l, yy + h]]; by[ci].push(q); out.push(q); }
  }
  // the speckle: per dot size, pieces [x start, y, x end] in whole units (end < start runs left), each kept a dot's radius
  // inside the edges. A row's two pieces start at one random point p (the right one at p, the left one a gap before it).
  const dots = STATIC.dots.map(() => []);
  if (speckle) {
    const [r0, r1] = STATIC.rows;
    for (let y = Math.round(y0 + 2 + R() * 2); y <= y1 - 2; y += Math.round(r0 + R() * (r1 - r0))) {
      const s = R() < 0.5 ? 0 : 1, rad = STATIC.dots[s][0] / 2, dash = STATIC.dots[s][1], len = dash.reduce((a, b) => a + b, 0);
      for (const [l, r] of both(x0 - 1, x1 + 1, y - rad - 0.5, y + rad + 0.5)) {
        const a = Math.ceil(l + rad), e = Math.floor(r - rad);
        if (e - a < 1) continue;
        const p = a + Math.floor(R() * Math.min(len, e - a + 1)), q = p - 4 - Math.floor(R() * 8);
        if (e - p >= 1) dots[s].push([p, y, e]);
        if (q - a >= 1) dots[s].push([q, y, a]);
      }
    }
  }
  if (ground) page.polys([poly], `fill="${ground}"`, { cls, before, from, z });
  if (dots.some((d) => d.length)) {
    // each piece a relative move from the last one's end and one h: about 8 B a piece
    const d = (list) => list.map(([a, y, e], i) => (i ? `m${pairI(a - list[i - 1][2], y - list[i - 1][1])}` : `M${pairI(a, y)}`) + `h${e - a}`).join('');
    const m = STATIC.dots.map(([w, dash], s) => (dots[s].length ? `<path stroke-width="${n2(w)}" stroke-dasharray="${dash.map(n2).join(' ')}" d="${d(dots[s])}"/>` : '')).join('');
    page.raw(`<g fill="none" stroke="${C.stW}" stroke-linecap="round">${m}</g>`, grow([x0, y0, x1, y1], 2), { cls, before, from, z });
  }
  by.forEach((list, i) => { if (list.length) page.polys(list, `fill="${cols[i]}"`, { cls, before, from, z }); });
  return out;
}
const pairI = (a, b) => `${a}${b < 0 ? '' : ' '}${b}`;
