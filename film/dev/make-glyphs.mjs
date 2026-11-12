// Regenerates film/data/glyphs.json, the outline cache the build reads instead of font files.
// Run by hand when a font or a character changes, then rebuild. Not used by CI. No font file lives in the repo, and this
// script downloads nothing: the four font files must already sit in FILM_FONTS.
//
//   FILM_TOOLS=<dir holding node_modules/fontkit> FILM_FONTS=<dir holding the .ttf files> node film/dev/make-glyphs.mjs
//
// Every face is SIL OFL 1.1 (see data/FONT-LICENSES.md). The cache is a Modified Version of each: outlines only, for the
// characters the page draws.
//
// Per face it writes {name, upm, em, capHeight, kern, glyphs: {char: [advance in font units, path at the face's em]}}:
// integer coordinates, y flipped (y down, baseline at 0), a quadratic flattened to a line when its control point is under
// 1.6 units off the chord (0.5 for the wide face, whose capitals stand up to 230u tall: at 1.6 their counters show facets),
// cubics kept, one glyph per line. `kern` is pair kerning in font units, for pairs of 8 units or
// more read off the font's own layout of the pair; only the Archivo faces carry it. The LED face also records `pixel`, the
// font's dot grid at its em ({pitch, x, y}: the centre of the first dot from the glyph origin), so that a dot pattern can be
// laid exactly on it.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as content from '../content.mjs';

const tools = process.env.FILM_TOOLS, fonts = process.env.FILM_FONTS;
if (!tools || !fonts) { console.error('set FILM_TOOLS and FILM_FONTS'); process.exit(2); }
const require = createRequire(path.join(path.resolve(tools), 'x.js'));
const fontkit = require('fontkit');

const FLAT = 1.6;
const KERN_MIN = 8;

// the copy: every character of every content.mjs string except the Japanese signs, plus the digits, the space and the whole
// Latin alphabet with ? & ", so a section can write new alt or note wording without regenerating this cache
const copy = new Set('0123456789 ' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' + '?&"');
const walk = (v, set) => { if (typeof v === 'string') { for (const ch of v) if (ch >= ' ') set.add(ch); } else if (v && typeof v === 'object') Object.values(v).forEach((x) => walk(x, set)); };
for (const [k, v] of Object.entries(content)) if (k !== 'SIGNS') walk(v, copy);
const signs = new Set(); walk(content.SIGNS, signs);
const sorted = (s) => [...new Set(s)].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');

const AZ = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', DIGITS = '0123456789';
// One family at three widths, as the cards use one grotesque: wide black for display capitals, a bold label for small print,
// condensed black for the strip. Rajdhani for the interface, DotGothic16 for LED words, Dela Gothic One for the four signs.
// The strip's end date is drawn in the condensed face as written, so its characters join that face's set.
const FACES = {
  label: { file: 'Archivo-VF.ttf', v: { wdth: 100, wght: 800 }, em: 100, chars: sorted(copy), kern: true },
  ui: { file: 'Rajdhani-Bold.ttf', em: 100, chars: sorted(copy) },
  wide: { file: 'Archivo-VF.ttf', v: { wdth: 125, wght: 900 }, em: 200, flat: 0.5, chars: sorted(AZ + 'ÁÉÍÓÇÃ' + DIGITS + '.,&-?\':' + ' '), kern: true },
  cond: { file: 'Archivo-VF.ttf', v: { wdth: 62, wght: 900 }, em: 100, chars: sorted(AZ + 'ÁÉ' + DIGITS + '.,:-' + ' ' + content.COPY.stripEnd), kern: true },
  led: { file: 'DotGothic16-Regular.ttf', em: 160, chars: sorted(content.COPY.towerName + content.COPY.wrongLetters), pixel: true },
  jp: { file: 'DelaGothicOne-Regular.ttf', em: 100, chars: sorted(signs) },
  // The tube sign's letters: Archivo's thinnest extended cut, each stroke drawn as its centre line (see `centreline`), only the
  // letters a tube sign spells. A tube is that line stroked fat with round joins: one monoline tube with round ends.
  tube: { file: 'Archivo-VF.ttf', v: { wdth: 125, wght: 100 }, em: 200, flat: 0.5, chars: sorted(content.COPY.words.email.toUpperCase()), kern: true, centre: 25.5 },
};

// A thin glyph's centre lines. Every contour of a hairline glyph runs round a stroke of nearly one width, so moved toward the
// ink by half that width (`centre`, in font units: Archivo wght 100 has stems of 58 and bars of 51; half a bar, so a bar closes exactly) it closes onto the stroke's
// middle: a stem becomes a sliver, a bowl one ring, and a sharp 180-degree turn at each end. Each straight leg (a line, or
// one arm of a quadratic's control polygon) is moved along its normal toward the ink (on the right of the travel, as TrueType
// winds its outlines) and the corners are re-cut where neighbouring legs meet; a corner that would run off past three times
// the offset (a spike at a sharp tip) is held at three times. The result is a path in the same commands, stroked, never filled.
function centreline(cmds, d) {
  const contours = []; let cur = null, last = null;
  for (const k of cmds) {
    const a = k.args;
    if (k.command === 'moveTo') { cur = { start: [a[0], a[1]], segs: [] }; contours.push(cur); last = cur.start; }
    else if (k.command === 'lineTo') { cur.segs.push({ c: null, p1: [a[0], a[1]] }); last = [a[0], a[1]]; }
    else if (k.command === 'quadraticCurveTo') { cur.segs.push({ c: [a[0], a[1]], p1: [a[2], a[3]] }); last = [a[2], a[3]]; }
    else if (k.command === 'closePath') { if (last[0] !== cur.start[0] || last[1] !== cur.start[1]) cur.segs.push({ c: null, p1: cur.start }); }
    else throw new Error(`centreline: ${k.command} is not handled`);
  }
  const lines = [];
  for (const ct of contours) {
    const pts = [], on = []; // the control polygon, cyclic: on-curve points and quadratic controls
    let p = ct.start;
    for (const s of ct.segs) {
      if (s.c && !(s.c[0] === p[0] && s.c[1] === p[1]) && !(s.c[0] === s.p1[0] && s.c[1] === s.p1[1])) { pts.push(p); on.push(true); pts.push(s.c); on.push(false); }
      else { pts.push(p); on.push(true); }
      p = s.p1;
    }
    const n = pts.length; if (n < 2) continue;
    const leg = (i) => { const a = pts[i], b = pts[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { a, u: [(b[0] - a[0]) / L, (b[1] - a[1]) / L] }; };
    const legs = pts.map((_, i) => leg(i));
    const moved = pts.map((v, i) => {
      const A = legs[(i - 1 + n) % n], B = legs[i];
      const nA = [A.u[1], -A.u[0]], nB = [B.u[1], -B.u[0]];
      const pa = [A.a[0] + nA[0] * d, A.a[1] + nA[1] * d], pb = [B.a[0] + nB[0] * d, B.a[1] + nB[1] * d];
      const cr = A.u[0] * B.u[1] - A.u[1] * B.u[0];
      const avg = [v[0] + (nA[0] + nB[0]) / 2 * d, v[1] + (nA[1] + nB[1]) / 2 * d];
      if (Math.abs(cr) < 1e-3) return avg;
      const t = ((pb[0] - pa[0]) * B.u[1] - (pb[1] - pa[1]) * B.u[0]) / cr;
      const q = [pa[0] + A.u[0] * t, pa[1] + A.u[1] * t], off = Math.hypot(q[0] - v[0], q[1] - v[1]);
      return off > 3 * d ? [v[0] + (q[0] - v[0]) * 3 * d / off, v[1] + (q[1] - v[1]) * 3 * d / off] : q;
    });
    // A stroke's end: a short straight edge between two legs that run back the way they came (the stroke's two sides). Cut
    // square to a slanted stroke (the A's feet) it stays a short bar after the move; it is pulled to its middle, so the stroke
    // turns back on itself there and the tube ends round.
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, A = legs[(i - 1 + n) % n], B = legs[j];
      if (!on[i] || !on[j] || Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]) > 4 * d) continue;
      if (A.u[0] * B.u[0] + A.u[1] * B.u[1] > -0.966) continue;
      const mid = [(moved[i][0] + moved[j][0]) / 2, (moved[i][1] + moved[j][1]) / 2];
      moved[i] = mid; moved[j] = mid;
    }
    lines.push({ moved, on, n });
  }
  // The two sides of a stroke close onto one line, except at a corner the font cuts flat (the M's top corners, where a stem
  // meets a diagonal): there each side keeps its own short flat, the two a bar apart, and the tube's thin core showed both
  // as a tick. So the on-curve points of all the glyph's contours within `snap` of each other become one point (their
  // middle; a corner with a point on the glyph's top or bottom line stays on that line, so the letters keep one cap line),
  // and both sides of every stroke run through the same corners.
  const snap = 1.2 * d, all = lines.flatMap((l) => l.moved.map((p, i) => (l.on[i] ? p : null)).filter(Boolean));
  const ys = all.map((p) => p[1]), yTop = Math.max(...ys), yBot = Math.min(...ys), onLine = (y) => [yTop, yBot].find((e) => Math.abs(y - e) < 3);
  const root = all.map((_, i) => i), find = (i) => (root[i] === i ? i : (root[i] = find(root[i])));
  for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) if (Math.hypot(all[a][0] - all[b][0], all[a][1] - all[b][1]) < snap) root[find(a)] = find(b);
  const sum = new Map();
  all.forEach((p, i) => { const r = find(i), s = sum.get(r) ?? [0, 0, 0, undefined]; sum.set(r, [s[0] + p[0], s[1] + p[1], s[2] + 1, s[3] ?? onLine(p[1])]); });
  all.forEach((p, i) => { const s = sum.get(find(i)); p.splice(0, 2, s[0] / s[2], s[3] ?? s[1] / s[2]); });
  // Every contour is written closed, its last edge drawn by the close itself: an open one ends in butt caps (the A's left
  // foot showed a flat slanted cut), a closed one turns back on itself with a round join.
  const out = [];
  for (const { moved, on, n } of lines) {
    out.push({ command: 'moveTo', args: moved[0] });
    for (let i = 1; i <= n; i++) {
      const j = i % n;
      if (!on[j]) { out.push({ command: 'quadraticCurveTo', args: [...moved[j], ...moved[(j + 1) % n]] }); i++; }
      else if (j) out.push({ command: 'lineTo', args: moved[j] });
    }
    out.push({ command: 'closePath', args: [] });
  }
  return out;
}

const pr = (a, b) => String(a) + (b < 0 ? '' : ' ') + String(b);
// `closed`: keep every contour's z (a stroked centre-line glyph), and drop a last line that comes back to the contour's start, so
// the z draws that edge and the join there is a real one (a z of no length left the A's left foot cut flat). A filled glyph
// drops the z before a moveTo (it closes anyway).
function glyphPath(cmds, scale, flat = FLAT, closed = false) {
  const T = (x, y) => [Math.round(x * scale), Math.round(-y * scale)];
  let d = '', cx = 0, cy = 0, sx = 0, sy = 0, lastL = -1;
  for (const k of cmds) {
    const a = k.args;
    if (k.command === 'moveTo') { const [x, y] = T(a[0], a[1]); d += (d && !d.endsWith('z') ? 'z' : '') + 'M' + pr(x, y); cx = sx = x; cy = sy = y; }
    else if (k.command === 'lineTo') { const [x, y] = T(a[0], a[1]); if (x === cx && y === cy) continue; lastL = d.length; d += 'l' + pr(x - cx, y - cy); cx = x; cy = y; continue; }
    else if (k.command === 'quadraticCurveTo') {
      const [x1, y1] = T(a[0], a[1]), [x, y] = T(a[2], a[3]);
      if (x === cx && y === cy) continue;
      const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1, off = Math.abs((x1 - cx) * dy - (y1 - cy) * dx) / L;
      d += off < flat ? 'l' + pr(dx, dy) : 'q' + pr(x1 - cx, y1 - cy) + (dx < 0 ? '' : ' ') + pr(dx, dy);
      cx = x; cy = y;
    } else if (k.command === 'bezierCurveTo') {
      const [x1, y1] = T(a[0], a[1]), [x2, y2] = T(a[2], a[3]), [x, y] = T(a[4], a[5]);
      d += 'c' + pr(x1 - cx, y1 - cy) + (x2 - cx < 0 ? '' : ' ') + pr(x2 - cx, y2 - cy) + (x - cx < 0 ? '' : ' ') + pr(x - cx, y - cy); cx = x; cy = y;
    } else if (k.command === 'closePath') { if (closed && cx === sx && cy === sy && lastL >= 0) d = d.slice(0, lastL); if (!d.endsWith('z')) d += 'z'; cx = sx; cy = sy; }
    lastL = -1;
  }
  if (d && !d.endsWith('z')) d += 'z';
  return closed ? d : d.replace(/zM/g, 'M');
}

// The LED face draws each pixel as a dot a little larger than its pitch, its corners cut. The dots' edges are fitted to a
// grid: where two dots meet, the outline jogs across a short chamfer whose middle is the edge between two pixels.
function pixelGrid(f, chars, scale) {
  const xs = [], ys = [];
  for (const ch of chars) {
    const g = f.glyphForCodePoint(ch.codePointAt(0));
    for (const c of g.path.commands) for (let i = 0; i + 1 < c.args.length; i += 2) { xs.push(c.args[i]); ys.push(c.args[i + 1]); }
  }
  // the strokes' outer edges, as listed: the smallest and largest x of the face's ink, and its bottom and cap
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // E is seven pixels wide and thirteen tall (the bars at rows 0, 6 and 12): the grid that fits the ink exactly
  const pitchX = (x1 - x0) / 7.2, pitchY = (y1 - y0) / 13.2; // a dot overhangs its cell by a tenth of the pitch on each side
  const pitch = (pitchX + pitchY) / 2;
  const cx = x0 + 0.1 * pitch + pitch / 2, cy = y1 - 0.1 * pitch - pitch / 2; // the first dot's centre, top left (font units, y up)
  return { pitch: +(pitch * scale).toFixed(3), x: +(cx * scale).toFixed(2), y: +(-cy * scale).toFixed(2) };
}

const out = {};
for (const [key, spec] of Object.entries(FACES)) {
  let f = fontkit.openSync(path.join(path.resolve(fonts), spec.file));
  const name = spec.v ? `${f.postscriptName.replace(/-.*$/, '')} wdth${spec.v.wdth} wght${spec.v.wght}` : f.postscriptName;
  if (spec.v) f = f.getVariation(spec.v);
  const scale = spec.em / f.unitsPerEm;
  const glyphs = {}, missing = [];
  // The LED face's T stands one row under the cap line of its other capitals; on a sign of capitals its bar is brought up one
  // row, so OLWTELET reads level. The only glyph this cache changes (noted in data/FONT-LICENSES.md).
  const grid = spec.pixel && pixelGrid(f, 'E', 1);
  const capTop = grid && Math.max(...[...spec.chars].map((ch) => f.glyphForCodePoint(ch.codePointAt(0)).bbox.maxY));
  for (const ch of spec.chars) {
    const g = f.glyphForCodePoint(ch.codePointAt(0));
    if (!g || g.id === 0) { missing.push(ch); continue; }
    let cmds = spec.centre ? centreline(g.path.commands, spec.centre) : g.path.commands;
    if (grid) {
      const lift = Math.round((capTop - g.bbox.maxY) / grid.pitch) * grid.pitch;
      const mid = (g.bbox.minY + g.bbox.maxY) / 2; // the bar comes up and the stem grows to meet it; the foot stays on the baseline
      if (lift) cmds = cmds.map((c) => ({ command: c.command, args: c.args.map((v, i) => (i % 2 && v > mid ? v + lift : v)) }));
    }
    glyphs[ch] = [Math.round(g.advanceWidth), ch === ' ' ? '' : glyphPath(cmds, scale, spec.flat, !!spec.centre)];
  }
  const kern = {};
  if (spec.kern) {
    const ks = [...spec.chars].filter((c) => c !== ' ' && glyphs[c]);
    for (const a of ks) for (const b of ks) {
      const run = f.layout(a + b);
      if (run.glyphs.length !== 2) continue;
      const k = Math.round(run.positions[0].xAdvance - run.glyphs[0].advanceWidth);
      if (Math.abs(k) >= KERN_MIN) kern[a + b] = k;
    }
  }
  out[key] = { name, upm: f.unitsPerEm, em: spec.em, capHeight: Math.round(f.capHeight), ...(spec.centre ? { centre: spec.centre } : {}), kern, glyphs };
  if (spec.pixel) out[key].pixel = pixelGrid(f, 'E', scale);
  if (missing.length) console.log(`${key}: not in the font: ${missing.join(' ')}`);
  console.log(`${key}: ${Object.keys(glyphs).length} glyphs, ${Object.keys(kern).length} kerning pairs`);
}
// one glyph per line, so a changed character is a one-line diff
const face = (F) => { const { glyphs, ...head } = F; return `{${Object.entries(head).map(([k, v]) => `${JSON.stringify(k)}:${JSON.stringify(v)}`).join(',')},"glyphs":{\n${Object.entries(glyphs).map(([c, g]) => `${JSON.stringify(c)}:${JSON.stringify(g)}`).join(',\n')}\n}}`; };
const json = '{' + Object.entries(out).map(([k, F]) => `${JSON.stringify(k)}:${face(F)}`).join(',\n') + '}\n';
const file = new URL('../data/glyphs.json', import.meta.url);
fs.writeFileSync(file, json);
console.log(`${file.pathname}: ${Buffer.byteLength(json)} B`);
