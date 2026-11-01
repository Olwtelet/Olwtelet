// Regenerates film/data/glyphs.json, the outline cache the build reads instead of font files.
// Run by hand when a font or a character changes, then rebuild. Not used by CI. No font file lives in the repo.
//
//   FILM_TOOLS=<dir holding node_modules/opentype.js> FILM_FONTS=<dir holding the two .ttf> node film/dev/make-glyphs.mjs
//
// Outlines sit on a 100-unit em with integer coordinates; a quadratic is flattened to a line when its control point
// is under 1.6 units off the chord. Layout is by advance width, one character at a time with charToGlyph: opentype's
// getPath on strings throws on these fonts, so it is never called on a string.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import * as content from '../content.mjs';

const tools = process.env.FILM_TOOLS, fonts = process.env.FILM_FONTS;
if (!tools || !fonts) { console.error('set FILM_TOOLS and FILM_FONTS'); process.exit(2); }
const require = createRequire(path.join(path.resolve(tools), 'x.js'));
const opentype = require('opentype.js');

const FACES = { gothic: 'ZenKakuGothicNew-Bold', hand: 'CoveredByYourGrace' };
const EM = 100;
const FLAT = 1.6;

// every character in any string of content.mjs, plus the digits the strip prints
const chars = new Set('0123456789 ');
const walk = (v) => { if (typeof v === 'string') { for (const ch of v) if (ch >= ' ') chars.add(ch); } else if (v && typeof v === 'object') Object.values(v).forEach(walk); };
Object.values(content).forEach(walk);
const ordered = [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));

function glyphPath(g) {
  const p = g.getPath(0, 0, EM);
  const T = (x, y) => [Math.round(x), Math.round(y)];
  let d = '', cx = 0, cy = 0;
  const n = (v) => String(v);
  const pr = (a, b) => n(a) + (b < 0 ? '' : ' ') + n(b);
  for (const k of p.commands) {
    if (k.type === 'M') { const [x, y] = T(k.x, k.y); d += 'M' + pr(x, y); cx = x; cy = y; }
    else if (k.type === 'L') { const [x, y] = T(k.x, k.y); if (x === cx && y === cy) continue; d += 'l' + pr(x - cx, y - cy); cx = x; cy = y; }
    else if (k.type === 'Q') {
      const [x1, y1] = T(k.x1, k.y1), [x, y] = T(k.x, k.y);
      if (x === cx && y === cy) continue;
      // distance of the control point from the chord
      const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1, off = Math.abs((x1 - cx) * dy - (y1 - cy) * dx) / L;
      if (off < FLAT) { d += 'l' + pr(dx, dy); }
      else d += 'q' + pr(x1 - cx, y1 - cy) + (dx < 0 ? '' : ' ') + pr(dx, dy);
      cx = x; cy = y;
    }
    else if (k.type === 'C') { const [x1, y1] = T(k.x1, k.y1), [x2, y2] = T(k.x2, k.y2), [x, y] = T(k.x, k.y); d += 'c' + pr(x1 - cx, y1 - cy) + (x2 - cx < 0 ? '' : ' ') + pr(x2 - cx, y2 - cy) + (x - cx < 0 ? '' : ' ') + pr(x - cx, y - cy); cx = x; cy = y; }
    else if (k.type === 'Z') d += 'z';
  }
  return d;
}

// Two hand digits read as something else, and on this page they carry dates. The font's 6 is an open stem with a tail, so
// 2026 read as 2024: it is replaced by the font's own 9 turned over and brought down to the other digits' height, its bowl
// opened to over half that height and its stem bent into a short hook, or it would read as b. The font's 1 is a bare stem,
// so A1 read as Al: it gets a flag. Both additions wind the same way as the stem, so that the overlap stays filled.
const pathPoints = (d) => {
  const subs = []; let cx = 0, cy = 0;
  for (const [, cmd, a, b] of d.matchAll(/([Ml])(-?\d+)\s?(-?\d+)/g)) {
    if (cmd === 'M') { cx = +a; cy = +b; subs.push([[cx, cy]]); } else { cx += +a; cy += +b; subs[subs.length - 1].push([cx, cy]); }
  }
  return subs;
};
const polygonsPath = (subs) => subs.map((pts) => 'M' + pts.map(([x, y], i) => {
  const [dx, dy] = i ? [x - pts[i - 1][0], y - pts[i - 1][1]] : [x, y];
  return (i ? 'l' : '') + dx + (dy < 0 ? '' : ' ') + dy;
}).join('') + 'z').join('');
const SIX_HEIGHT = 0.8; // of the 9, which stands taller than its neighbours
const SIX_BOWL = [-25, -31]; // the top of the bowl once turned, and where it goes
const SIX_HOOK = 'M11-55l10-2l5 5l-3 3l-12-1z';
function turnedNine([, nine]) {
  const subs = pathPoints(nine), all = subs.flat(), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const [from, to] = SIX_BOWL, h = Math.round(y0 * SIX_HEIGHT);
  const fold = (y) => (y >= from ? y * to / from : to + (y - from) * (h - to) / (h - from));
  return polygonsPath(subs.map((pts) => pts.map(([x, y]) => {
    const Y = fold((y1 + y0 - y) * SIX_HEIGHT);
    return [Math.round(x0 + x1 - x + Math.max(0, to - Y) * 0.15), Math.round(Y)];
  }))) + SIX_HOOK;
}
const FLAGGED_ONE = 'M7-57l1 8l-7 6l-3-1l-1-3l7-8z';

const out = {};
for (const [key, name] of Object.entries(FACES)) {
  const b = fs.readFileSync(path.join(path.resolve(fonts), `${name}.ttf`));
  const f = opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  const glyphs = {}, missing = [];
  for (const ch of ordered) {
    const g = f.charToGlyph(ch);
    if (!g || g.index === 0) { missing.push(ch); continue; }
    glyphs[ch] = [g.advanceWidth, glyphPath(g)];
  }
  if (key === 'hand') { glyphs['6'] = [glyphs['6'][0], turnedNine(glyphs['9'])]; glyphs['1'] = [glyphs['1'][0], glyphs['1'][1] + FLAGGED_ONE]; }
  out[key] = { name, upm: f.unitsPerEm, glyphs };
  if (missing.length) console.log(`${key}: not in the font: ${missing.join(' ')}`);
  console.log(`${key}: ${Object.keys(glyphs).length} glyphs`);
}
// one glyph per line, so a changed character is a one-line diff
const face = (F) => `{"name":${JSON.stringify(F.name)},"upm":${F.upm},"glyphs":{\n${Object.entries(F.glyphs).map(([c, g]) => `${JSON.stringify(c)}:${JSON.stringify(g)}`).join(',\n')}\n}}`;
const json = `{"gothic":${face(out.gothic)},\n"hand":${face(out.hand)}}\n`;
const file = new URL('../data/glyphs.json', import.meta.url);
fs.writeFileSync(file, json);
console.log(`${file.pathname}: ${Buffer.byteLength(json)} B`);
