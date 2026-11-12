// Regenerates film/data/cut.json: the cut letters, Archivo's capitals as polygons, for every line that needs geometry
// (clipping, perspective, a forced measure, the tops a tower stands on). Run by hand when a character changes, then rebuild.
// Not used by CI, downloads nothing; the font file must already sit in FILM_FONTS. A Modified Version of Archivo (SIL OFL 1.1,
// see data/FONT-LICENSES.md).
//
//   FILM_TOOLS=<dir holding node_modules/fontkit> FILM_FONTS=<dir holding Archivo-VF.ttf> node film/dev/make-cut.mjs
//
// Writes {wide: TABLE, cond: TABLE}. A TABLE is {kern: {pair: units}, glyphs: {char: {w, o, h, e?}}} on a 140-unit cap height,
// y down: the cap line at 0, the baseline at 140. `w` is the advance, `o` the main outer ring, `h` the holes (counters), `e` any
// other outer ring (an accent, the dot of a question mark). Curves are flattened to 0.5 units at most off the true curve.
// Coordinates have one decimal. `kern` holds the font's pair kerning of 8 font units or more, in the same units.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const tools = process.env.FILM_TOOLS, fonts = process.env.FILM_FONTS;
if (!tools || !fonts) { console.error('set FILM_TOOLS and FILM_FONTS'); process.exit(2); }
const require = createRequire(path.join(path.resolve(tools), 'x.js'));
const fontkit = require('fontkit');

const CAP = 140, TOL = 0.5, KERN_MIN = 8;
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÉÁ -.,?&';
const TABLES = { wide: { wdth: 125, wght: 900 }, cond: { wdth: 62, wght: 900 } };

const r1 = (v) => { const n = Math.round(v * 10) / 10; return Object.is(n, -0) ? 0 : n; };
// adaptive flattening: split a curve until its control points lie within TOL of the chord
function flatQuad(p0, p1, p2, out, depth = 0) {
  const d = distLine(p1, p0, p2);
  if (d <= TOL || depth > 10) { out.push(p2); return; }
  const a = mid(p0, p1), b = mid(p1, p2), m = mid(a, b);
  flatQuad(p0, a, m, out, depth + 1); flatQuad(m, b, p2, out, depth + 1);
}
function flatCubic(p0, p1, p2, p3, out, depth = 0) {
  const d = Math.max(distLine(p1, p0, p3), distLine(p2, p0, p3));
  if (d <= TOL || depth > 10) { out.push(p3); return; }
  const a = mid(p0, p1), b = mid(p1, p2), c = mid(p2, p3), ab = mid(a, b), bc = mid(b, c), m = mid(ab, bc);
  flatCubic(p0, a, ab, m, out, depth + 1); flatCubic(m, bc, c, p3, out, depth + 1);
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
function distLine(p, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); return L < 1e-9 ? Math.hypot(p[0] - a[0], p[1] - a[1]) : Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / L; }
const area = (r) => { let s = 0; for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function inside(poly, p) { let n = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < a[0] + ((p[1] - a[1]) * (b[0] - a[0])) / (b[1] - a[1])) n++; } return n % 2 === 1; }

function rings(cmds, s) {
  const T = (x, y) => [x * s, CAP - y * s];
  const out = []; let cur = null, start = null;
  for (const k of cmds) {
    const a = k.args;
    if (k.command === 'moveTo') { if (cur && cur.length > 2) out.push(cur); start = T(a[0], a[1]); cur = [start]; }
    else if (k.command === 'lineTo') cur.push(T(a[0], a[1]));
    else if (k.command === 'quadraticCurveTo') flatQuad(cur[cur.length - 1], T(a[0], a[1]), T(a[2], a[3]), cur);
    else if (k.command === 'bezierCurveTo') flatCubic(cur[cur.length - 1], T(a[0], a[1]), T(a[2], a[3]), T(a[4], a[5]), cur);
    else if (k.command === 'closePath') { if (cur && cur.length > 2) out.push(cur); cur = null; }
  }
  if (cur && cur.length > 2) out.push(cur);
  // rounded, with repeated points and the closing point dropped
  return out.map((r) => {
    const q = [];
    for (const p of r.map(([x, y]) => [r1(x), r1(y)])) { const l = q[q.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) q.push(p); }
    if (q.length > 1 && q[0][0] === q[q.length - 1][0] && q[0][1] === q[q.length - 1][1]) q.pop();
    return q;
  }).filter((r) => r.length > 2 && Math.abs(area(r)) > 0.5);
}

const out = {};
for (const [key, v] of Object.entries(TABLES)) {
  const f = fontkit.openSync(path.join(path.resolve(fonts), 'Archivo-VF.ttf')).getVariation(v);
  const s = CAP / f.capHeight;
  const glyphs = {};
  for (const ch of CHARS) {
    const g = f.glyphForCodePoint(ch.codePointAt(0));
    if (!g || g.id === 0) throw new Error(`${key}: no glyph for ${ch}`);
    const w = r1(g.advanceWidth * s);
    if (ch === ' ') { glyphs[ch] = { w, o: [], h: [] }; continue; }
    const rs = rings(g.path.commands, s);
    // depth by containment: even is ink, odd is a counter
    const depth = rs.map((r, i) => rs.filter((q, j) => j !== i && inside(q, r[0])).length);
    const outer = rs.filter((r, i) => depth[i] % 2 === 0).sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
    const holes = rs.filter((r, i) => depth[i] % 2 === 1);
    glyphs[ch] = { w, o: outer[0], h: holes };
    if (outer.length > 1) glyphs[ch].e = outer.slice(1);
  }
  const kern = {};
  const ks = [...CHARS].filter((c) => c !== ' ');
  for (const a of ks) for (const b of ks) {
    const run = f.layout(a + b);
    if (run.glyphs.length !== 2) continue;
    const k = run.positions[0].xAdvance - run.glyphs[0].advanceWidth;
    if (Math.abs(k) >= KERN_MIN) kern[a + b] = r1(k * s);
  }
  out[key] = { kern, glyphs };
  console.log(`${key}: ${Object.keys(glyphs).length} letters, ${Object.keys(kern).length} kerning pairs, ${Object.values(glyphs).reduce((n, g) => n + g.o.length + g.h.flat().length + (g.e || []).flat().length, 0)} points`);
}
const table = (T) => `{"kern":${JSON.stringify(T.kern)},"glyphs":{\n${Object.entries(T.glyphs).map(([c, g]) => `${JSON.stringify(c)}:${JSON.stringify(g)}`).join(',\n')}\n}}`;
const json = `{"wide":${table(out.wide)},\n"cond":${table(out.cond)}}\n`;
const file = new URL('../data/cut.json', import.meta.url);
fs.writeFileSync(file, json);
console.log(`${file.pathname}: ${Buffer.byteLength(json)} B`);
