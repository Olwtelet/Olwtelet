// The drawing kit. Zero runtime deps. Everything is polygons; lines are filled, tapered shapes.
export const C = {
  douga: '#ECE6D6', graphite: '#24242C', verm: '#F2381C', blue: '#1B2FD6', toka: '#D6FF1E', sumi: '#0B0A14', sumi2: '#1C1A30',
};
export const W = 1200; // the canvas is 1200u wide; u is 1/1200 of the column

// angles measured off the logo: nothing on the page tilts by feel
export const SHEAR = { lean: 0.164, roll: 0.07 };
export const ANG = {
  beam: Math.tan((20.6 * Math.PI) / 180), // beam edge, falling to the right
  roll: Math.tan((4.01 * Math.PI) / 180), // the set's horizon, rising to the right (camera roll)
};

// the end credits run on the set's roll: how far a point at x lies off the middle of the wall, which stops where the wall does
export const WALL_END = W - 28;
export const wallRoll = (x, left) => ((left + WALL_END) / 2 - x) * ANG.roll;

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const r1 = (n) => { const v = Math.round(n); return Object.is(v, -0) ? 0 : v; };
const num = (n) => { const s = String(r1(n)); return s.replace(/^0\./, '.').replace(/^-0\./, '-.'); };
const pair = (a, b) => { const y = num(b); return num(a) + (y[0] === '-' ? '' : ' ') + y; };

// compact relative polygon path
export function polyD(pts, close = true) {
  if (!pts.length) return '';
  let d = 'M' + pair(pts[0][0], pts[0][1]);
  let px = r1(pts[0][0]), py = r1(pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const x = r1(pts[i][0]), y = r1(pts[i][1]);
    d += 'l' + pair(x - px, y - py); px = x; py = y;
  }
  return d + (close ? 'z' : '');
}
export const bboxOf = (pts) => { let a = 1e9, b = 1e9, c = -1e9, e = -1e9; for (const p of pts) { if (p[0] < a) a = p[0]; if (p[0] > c) c = p[0]; if (p[1] < b) b = p[1]; if (p[1] > e) e = p[1]; } return [a, b, c, e]; };

// ---------- lines as tapered polygons ----------
const unseeded = () => { throw new Error('taper: a wobbling line needs a seeded R'); };
// centre polyline -> filled polygon. w = max width. prof(t) gives 0..1 width. wob = lateral noise amplitude
export function taper(pts, { w = 3, prof = swell, wob = 0, R = unseeded, n = 0 } = {}) {
  let c = pts;
  if (n > 0) c = resample(pts, n);
  else if (pts.length === 2) c = resample(pts, 2);
  const m = c.length, L = [], Rr = [];
  // cumulative length
  const seg = [0]; for (let i = 1; i < m; i++) seg[i] = seg[i - 1] + dist(c[i], c[i - 1]);
  const tot = seg[m - 1] || 1;
  for (let i = 0; i < m; i++) {
    const a = c[Math.max(i - 1, 0)], b = c[Math.min(i + 1, m - 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const t = seg[i] / tot;
    const o = wob && i > 0 && i < m - 1 ? (R() - 0.5) * 2 * wob : 0;
    const h = (w * prof(t)) / 2;
    L.push([c[i][0] + nx * (o + h), c[i][1] + ny * (o + h)]);
    Rr.push([c[i][0] + nx * (o - h), c[i][1] + ny * (o - h)]);
  }
  return L.concat(Rr.reverse());
}
export function resample(pts, n) {
  const seg = [0]; for (let i = 1; i < pts.length; i++) seg[i] = seg[i - 1] + dist(pts[i], pts[i - 1]);
  const tot = seg[seg.length - 1]; const out = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const s = (tot * i) / n;
    while (j < pts.length - 2 && seg[j + 1] < s) j++;
    const t = (s - seg[j]) / ((seg[j + 1] - seg[j]) || 1);
    out.push(lerpP(pts[j], pts[j + 1], t));
  }
  return out;
}
export const swell = (t) => Math.pow(Math.sin(Math.PI * t), 0.55) * 0.92 + 0.08;
export const pressIn = (t) => Math.min(1, 0.25 + 1.6 * (1 - t)) * (t > 0.92 ? (1 - t) / 0.08 : 1); // heavy start, flick off
export const flick = (t) => Math.pow(1 - t, 0.7);
export const needle = (t) => Math.pow(Math.sin(Math.PI * t), 1.3);

// One pencil pass along a..b: overshoots the corners, swells, slight wander, sometimes restated.
export function pencil(a, b, { w = 2.4, over = 10, R, restate = 0.5, wander = 0.8 } = {}) {
  const L = dist(a, b) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const o1 = over * (0.4 + R() * 1.1), o2 = over * (0.4 + R() * 1.1);
  const A = [a[0] - ux * o1, a[1] - uy * o1], B = [b[0] + ux * o2, b[1] + uy * o2];
  const n = L > 500 ? 4 : L > 140 ? 3 : 2;
  const out = [taper([A, B], { w, prof: swell, wob: wander * Math.min(1.6, L / 200), R, n })];
  if (R() < restate) {
    const off = 0.8 + R() * 2.2, s = R() < 0.5 ? -1 : 1, nx = -uy * off * s, ny = ux * off * s;
    const t0 = R() * 0.35, t1 = 0.6 + R() * 0.4;
    out.push(taper([[lerp(A[0], B[0], t0) + nx, lerp(A[1], B[1], t0) + ny], [lerp(A[0], B[0], t1) + nx * 0.5, lerp(A[1], B[1], t1) + ny * 0.5]], { w: w * 0.6, prof: needle, wob: 0, R, n: 0 }));
  }
  return out;
}

// inked cel line: closed polygon outline as swelling taper segments (no overshoot)
export function inkEdge(a, b, { w = 4, R } = {}) {
  return taper([a, b], { w, prof: swell, R, n: 0 });
}

// the red correction marks: a pencil line and a pencil ring
export function redLine(page, a, b, R, w = 5.5, cls) { page.polys(pencil(a, b, { w, over: 6, R, restate: 0.7, wander: 1.4 }), `fill="${C.verm}"`, { cls: cls ? `pl ${cls}` : 'pl' }); }
export function ring(page, cx, cy, rx, ry, col, R, w = 5.5, cls) {
  const pts = []; const n = 18;
  for (let i = 0; i <= n + 2; i++) { const a = (i / n) * Math.PI * 2 - 2.2; const g = 1 + i * 0.005 + (R() - 0.5) * 0.03; pts.push([cx + Math.cos(a) * rx * g, cy + Math.sin(a) * ry * g]); }
  page.polys([taper(pts, { w, prof: swell, R })], `fill="${col}"`, { cls: cls ? `pl ${cls}` : 'pl' });
}

// the three real holes through the base paper: one round, two slots
export function pegHoles(cx, y) {
  const round = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; round.push([cx + Math.cos(a) * 15, y + Math.sin(a) * 15]); }
  const slot = (x) => { const o = []; for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI; o.push([x + 34 + Math.cos(a) * 11, y + Math.sin(a) * 11]); } for (let i = 0; i <= 8; i++) { const a = Math.PI / 2 + (i / 8) * Math.PI; o.push([x - 34 + Math.cos(a) * 11, y + Math.sin(a) * 11]); } return o; };
  return [round, slot(cx - 250), slot(cx + 250)];
}

// ---------- polygon ops ----------
export function polyArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
export function centroid(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
// keep the side of line a->b where cross(b-a, p-a) >= 0
export function clipHalf(poly, a, b) {
  const out = []; const inside = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) >= 0;
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i], d = poly[(i + 1) % poly.length], ci = inside(c), di = inside(d);
    if (ci) out.push(c);
    if (ci !== di) {
      const x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1], x3 = c[0], y3 = c[1], x4 = d[0], y4 = d[1];
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) > 1e-9) { const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den; out.push([x1 + t * (x2 - x1), y1 + t * (y2 - y1)]); }
    }
  }
  return out;
}
// clipHalf keeps a concave shape in one ring: where it left the line and came back, its pieces are joined by edges that run
// along the cut and back again. Zero wide until the rounding opens them into hairlines. This parts them.
export function partsOfClip(ring, a, b) {
  const on = (p) => Math.abs((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) < 1e-6;
  const cuts = ring.map((p, i) => i).filter((i) => on(ring[i]) && on(ring[(i + 1) % ring.length]));
  if (cuts.length < 2) return [ring];
  return cuts.map((c, k) => { const out = [], end = cuts[(k + 1) % cuts.length]; for (let i = (c + 1) % ring.length; ; i = (i + 1) % ring.length) { out.push(ring[i]); if (i === end) return out; } });
}
// polygon clipped by a convex polygon (clockwise on screen => we normalise)
export function clipConvex(poly, conv) {
  let c = conv; if (polyArea(c) < 0) c = [...c].reverse();
  let out = poly;
  for (let i = 0; i < c.length && out.length; i++) out = clipHalf(out, c[i], c[(i + 1) % c.length]);
  return out;
}
// intersections of an infinite line with a (possibly concave) polygon -> sorted param pairs
export function lineSpans(a, b, poly) {
  const ts = [];
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i], d = poly[(i + 1) % poly.length];
    const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
    if (Math.abs(den) < 1e-9) continue;
    const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
    const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
    if (u >= 0 && u < 1) ts.push(t);
  }
  ts.sort((x, y) => x - y);
  const sp = []; for (let i = 0; i + 1 < ts.length; i += 2) sp.push([ts[i], ts[i + 1]]);
  return sp;
}
// coloured-pencil hatch: returns polygons (thin tapered quads) filling `poly`
export function hatch(poly, { angle = -35, gap = 9, w = 3, R, jitter = 0.35, miss = 0.04, over = 4, prof = needle, doubleBack = 0.25 } = {}) {
  const th = (angle * Math.PI) / 180, ux = Math.cos(th), uy = Math.sin(th), nx = -uy, ny = ux;
  let lo = 1e9, hi = -1e9; for (const p of poly) { const s = p[0] * nx + p[1] * ny; if (s < lo) lo = s; if (s > hi) hi = s; }
  const out = [];
  for (let s = lo + gap * 0.5; s < hi; s += gap * (1 + (R() - 0.5) * jitter)) {
    const ox = nx * s, oy = ny * s;
    const a = [ox, oy], b = [ox + ux, oy + uy];
    for (const [t0, t1] of lineSpans(a, b, poly)) {
      if (R() < miss) continue;
      const e0 = (R() - 0.3) * over, e1 = (R() - 0.3) * over, sk = (R() - 0.5) * gap * 0.4;
      const A = [ox + ux * (t0 - e0), oy + uy * (t0 - e0)], B = [ox + ux * (t1 + e1) + nx * sk, oy + uy * (t1 + e1) + ny * sk];
      out.push(taper([A, B], { w: w * (0.7 + R() * 0.5), prof, n: 0, R }));
      if (R() < doubleBack && dist(A, B) > 30) out.push(taper([lerpP(A, B, 0.2 + R() * 0.2), lerpP(A, B, 0.7 + R() * 0.3)], { w: w * 0.6, prof: needle, n: 0, R }));
    }
  }
  return out;
}

// ---------- camera ----------
export function camera({ pos, yaw = 0, pitch = 0, roll = 0, f = 500, cx = 600, cy = 500 }) {
  const cy_ = Math.cos(yaw), sy_ = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  const toCam = (P) => {
    let x = P[0] - pos[0], y = P[1] - pos[1], z = P[2] - pos[2];
    // yaw about y
    let X = cy_ * x - sy_ * z, Z = sy_ * x + cy_ * z, Y = y;
    // pitch about x (positive looks up)
    const Y2 = cp * Y - sp * Z, Z2 = sp * Y + cp * Z;
    // roll
    const X3 = cr * X - sr * Y2, Y3 = sr * X + cr * Y2;
    return [X3, Y3, Z2];
  };
  const project = (P) => { const c = toCam(P); const z = Math.max(c[2], 0.05); return [cx + (f * c[0]) / z, cy - (f * c[1]) / z, c[2]]; };
  return { project, toCam, pos, f, cx, cy };
}
// vanishing point of a world direction
export function vanish(cam, dir) {
  const O = cam.toCam([cam.pos[0] + dir[0], cam.pos[1] + dir[1], cam.pos[2] + dir[2]]);
  return [cam.cx + (cam.f * O[0]) / O[2], cam.cy - (cam.f * O[1]) / O[2]];
}

// ---------- homography ----------
function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;[A[i], A[m]] = [A[m], A[i]];[b[i], b[m]] = [b[m], b[i]]; for (let k = i + 1; k < n; k++) { const c = A[k][i] / A[i][i]; for (let j = i; j < n; j++) A[k][j] -= c * A[i][j]; b[k] -= c * b[i]; } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
export function homography(src, dst) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve(A, b); return (p) => { const d = h[6] * p[0] + h[7] * p[1] + 1; return [(h[0] * p[0] + h[1] * p[1] + h[2]) / d, (h[3] * p[0] + h[4] * p[1] + h[5]) / d]; }; }
