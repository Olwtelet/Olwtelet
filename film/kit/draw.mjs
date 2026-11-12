// The drawing kit. Zero runtime deps. Geometry: polygons, clipping, the camera, the homography. Plus the palette.
// The palette. A colour exists on the page only if it is here: the Lint guard reads its palette from this object, and sections
// never write a hex value. Values measured off the show's stills (research STYLE.md section 2), grouped by the family that owns them.
export const C = {
  // card (opening-credit) family: cards and the strip only
  black: '#010101', lemon: '#FEFE0C', pink: '#FB225F', cyan: '#06BFE6',
  tealDk: '#054F4B', teal: '#067A7E', tealLt: '#15CBC4', indigoDk: '#131749', indigo: '#2B1C86', azure: '#0377DF', white: '#F8F6F5',
  // night (episode) family
  navy: '#030A22', deep: '#000824', face: '#0B1F4A', face2: '#14306A', shade: '#07122E', wall: '#050E2A',
  sky0: '#143C62', sky1: '#0F3258', sky2: '#0A294D', sky3: '#062043', sky4: '#031836', far: '#0A2147', far2: '#071A3C',
  rimCyan: '#00FEDE', rimViolet: '#A448E8', rimGreen: '#5EFC89', led: '#32EEEF', ledOff: '#0B3A5C', panel: '#05152B',
  mint: '#B2F3DF', mintW: '#E2F7F8', amber: '#E9D474', lavW: '#F8F0FB', pinkW: '#FED2F7', prog: '#08E5F2',
  // afterimages
  aBlue: '#0059E6', aBlueL: '#59CBFB', aTeal: '#00C3A7', aTealL: '#96F7D8',
  // impact (goldD: the burnt amber of the bolt's glow, measured off the impact frame's ramp, STYLE section 3)
  cream: '#FDFDF4', ink: '#05040C', goldW: '#FFFFFB', goldP: '#FCEFB0', gold: '#C7A656', goldD: '#8B4D0F',
  // red: the hostile interface (c2)
  rDeep: '#2A0709', rBase: '#341616', rMid: '#652424', rBody: '#9A2C34', rLine: '#F73836', rPink: '#F69B97', rPinkW: '#FDDCDF',
  // red: the attack (b4)
  atk0: '#451006', atk1: '#6F1008', atk2: '#C52119',
  // static: only in b4's crack and at c2's slit
  stW: '#F4F8F9', stK: '#191616', stP: '#C997B9',
  // violet (b3)
  vField: '#E29AF1', vDeep: '#1B0D2C', vMid: '#9648B0',
  // day (c1)
  day0: '#2BDDE7', day1: '#36E6EC', day2: '#42EFF0', day3: '#4EF7F4', dCream: '#EFF5D0', dCream2: '#F1EEC1', dGrey: '#88A093', dTeal: '#3C6376', dInk: '#15202D', gBadge: '#46EC93',
  // network green (c5-brain)
  gField: '#52EC60', gDeep: '#072D04', gMid: '#095E19', gWhite: '#E8FEFC',
  // institution teal (c5-study)
  iDeep: '#031325', iBase: '#062A23', iMid: '#0D453F', iLit: '#2DE4D4',
};
export const W = 1200; // the canvas is 1200u wide; u is 1/1200 of the column

// angles measured off the logo: nothing on the page tilts by feel
export const SHEAR = { lean: 0.164, roll: 0.07 };
export const ANG = {
  beam: Math.tan((20.6 * Math.PI) / 180), // beam edge, falling to the right
  roll: Math.tan((4.01 * Math.PI) / 180), // the set's horizon, rising to the right (camera roll)
};

// the end credits' wall stops here
export const WALL_END = W - 28;

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
// centre polyline -> filled polygon. w = max width. prof(t) gives 0..1 width (flat by default); n > 0 resamples the line
export function taper(pts, { w = 3, prof = () => 1, n = 0 } = {}) {
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
    const h = (w * prof(t)) / 2;
    L.push([c[i][0] + nx * h, c[i][1] + ny * h]);
    Rr.push([c[i][0] - nx * h, c[i][1] - ny * h]);
  }
  return L.concat(Rr.reverse());
}
function resample(pts, n) {
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

// ---------- polygon ops ----------
export function polyArea(p) { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
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
// ---------- homography ----------
function solve(A, b) { const n = b.length; for (let i = 0; i < n; i++) { let m = i; for (let k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > Math.abs(A[m][i])) m = k;[A[i], A[m]] = [A[m], A[i]];[b[i], b[m]] = [b[m], b[i]]; for (let k = i + 1; k < n; k++) { const c = A[k][i] / A[i][i]; for (let j = i; j < n; j++) A[k][j] -= c * A[i][j]; b[k] -= c * b[i]; } } const x = Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
export function homography(src, dst) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve(A, b); return (p) => { const d = h[6] * p[0] + h[7] * p[1] + 1; return [(h[0] * p[0] + h[1] * p[1] + h[2]) / d, (h[3] * p[0] + h[4] * p[1] + h[5]) / d]; }; }

// ---------- attribute strings ----------
// A section may write only fill="${...}" and stroke="${...}" (+ stroke-width): every opacity, join, cap or dash comes from here.
export const n2 = (v) => { const s = String(+(+v).toFixed(2)); return s.replace(/^0\./, '.').replace(/^-0\./, '-.'); };
// a translucent fill
export const tint = (col, op = 1) => `fill="${col}"${op < 1 ? ` fill-opacity="${n2(op)}"` : ''}`;
// a stroke with no fill: w wide, op its opacity, round joins; cap: round ends; dash: [on, off]
export const line = (col, w, { op = 1, cap = false, dash } = {}) => `fill="none" stroke="${col}" stroke-width="${n2(w)}"${op < 1 ? ` stroke-opacity="${n2(op)}"` : ''} stroke-linejoin="round"${cap || dash ? ' stroke-linecap="round"' : ''}${dash ? ` stroke-dasharray="${dash.map(n2).join(' ')}"` : ''}`;
// a filled shape with a line round it, in one path
export const framed = (fill, col, w, op = 1) => `${tint(fill, op)} stroke="${col}" stroke-width="${n2(w)}" stroke-linejoin="round"`;
// open polylines as one path (polyD without the closing z)
export const openD = (list) => list.filter((p) => p && p.length > 1).map((p) => polyD(p, false)).join('');
// A text matrix for page.text whose baseline runs from a toward b, the caps standing on its left (as seen walking from a to b),
// squash times as tall as wide. page.text scales it by size / em, so one em is `size` page units along the baseline.
export const baseline = (a, b, squash = 1) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; return [ux, uy, -uy * squash, ux * squash, a[0], a[1]]; };
