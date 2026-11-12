// Type: glyph lookup from the outline cache, kerning, measure, wrap, para. Nothing reads a font file.
// film/data/glyphs.json is made by film/dev/make-glyphs.mjs: each face's outlines on its own em, advances and kerning in font
// units. Faces: wide, label, cond (Archivo at three widths), ui (Rajdhani Bold), led (DotGothic16), jp (Dela Gothic One).
import fs from 'node:fs';
import { C } from './draw.mjs';
import { GuardError } from './letters.mjs';

const CACHE = JSON.parse(fs.readFileSync(new URL('../data/glyphs.json', import.meta.url), 'utf8'));
// every face in the cache, keyed by its name
export const faces = Object.fromEntries(Object.entries(CACHE).map(([key, F]) => [key, { key, kern: {}, ...F }]));

export const GLYPH_EM = 100; // the default em of the cached outlines; a face states its own (wide 200, led 160)
const MEASURE_EM = 200; // the em measure() sums in. Kept apart from the glyph em: its rounding is part of the layout.

export function glyphOf(F, ch) {
  const g = F.glyphs[ch];
  if (!g) throw new GuardError('Floors', `no outline for "${ch}" in the ${F.key} glyph cache`);
  return g;
}
export const advance = (F, ch, em) => glyphOf(F, ch)[0] * em / F.upm;
// pair kerning in font units (the Archivo faces carry it)
export const kernOf = (F, a, b) => (a && b && F.kern[a + b]) || 0;
export const outline = (F, ch) => glyphOf(F, ch)[1];
// the cap height of a face at a size, in page units
export const capOf = (F, size) => (F.capHeight * size) / F.upm;

export function measure(F, str, size, track = 0) { let w = 0, prev = ''; for (const ch of str) { w += advance(F, ch, MEASURE_EM) + kernOf(F, prev, ch) * MEASURE_EM / F.upm + track; prev = ch; } return (w * size) / MEASURE_EM; }

// wrap into lines of at most maxW
export function wrap(F, str, size, maxW) { const out = []; let cur = ''; for (const wd of str.split(' ')) { const t = cur ? cur + ' ' + wd : wd; if (measure(F, t, size) > maxW && cur) { out.push(cur); cur = wd; } else cur = t; } if (cur) out.push(cur); return out; }

// A block of lines. `measure` is the widest a line may run; left-aligned blocks default to the page's right
// margin, right-aligned ones to the space left of their edge. Guards hold every line to it.
export function para(page, F, lines, x, y, size, lh, { fill = C.black, cls, right = false, track = 0, measure: limit, rot = 0, before, from } = {}) {
  const ms = limit ?? (right ? x : 1190 - x);
  lines.forEach((l, i) => {
    const w = measure(F, l, size, track);
    const xx = right ? x - w : x;
    page.log.paras.push({ line: l, x: xx, y: y + i * lh, size, width: w, measure: ms, cls });
    page.text(F, l, xx, y + i * lh, { size, fill, cls, track, rot, before, from });
  });
}
