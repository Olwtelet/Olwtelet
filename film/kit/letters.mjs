// Cut letters: Archivo's capitals as polygons (film/data/cut.json, made by film/dev/make-cut.mjs), for every line that needs
// geometry: clipping, perspective, a forced measure, the tops a tower stands on. Two tables: `wide` (wdth 125, wght 900) and
// `cond` (wdth 62, wght 900). Cap height 140, y down: the cap line at 0, the baseline at 140.
// A glyph is {w: advance, o: main outer ring, h: [holes], e: [other outer rings: an accent, a dot]}. Printed type is never
// jittered: every instance of a letter is the same polygon.
import fs from 'node:fs';
import { lerp, clipConvex, bboxOf, ANG } from './draw.mjs';

// A build-stopping fault raised while drawing. `guard` names the row of the guard table it belongs to.
export class GuardError extends Error {
  constructor(guard, message) { super(message); this.guard = guard; }
}

const TABLES = JSON.parse(fs.readFileSync(new URL('../data/cut.json', import.meta.url), 'utf8'));
export const CUT = TABLES.wide.glyphs;
export const CUT_COND = TABLES.cond.glyphs;
export const CUT_KERN = { wide: TABLES.wide.kern, cond: TABLES.cond.kern };
// A face is named 'wide' or 'cond', or given as the type face of that name (faces.wide, faces.cond): a section may not write the
// name as a string, so it passes the face.
export const faceKey = (face = 'wide') => (face && typeof face === 'object' ? face.key : face);
const tableOf = (face) => { const k = faceKey(face); if (k === 'wide') return CUT; if (k === 'cond') return CUT_COND; throw new Error(`no cut face ${k}`); };

// one letter: the table's polygon, unchanged
const letter = (ch, face) => {
  const g = tableOf(face)[ch]; if (!g) throw new GuardError('Floors', `no cut letter for "${ch}" in the ${faceKey(face)} table`);
  return { w: g.w, o: g.o, h: g.h, e: g.e || [] };
};
// every ring of a laid-out glyph, outer first, for an evenodd fill
export const ringsOf = (g) => [g.o, ...(g.e || []), ...g.h];

// lay a word out flat, in table units: [{ch, x, o, h, e}] plus its width. The table's kerning always applies; `kern` adds to it.
// The second argument is unused (it was the old jitter's generator); callers pass null.
export function word(text, R, { track = 0, kern = {}, face = 'wide' } = {}) {
  let x = 0; const out = [];
  const up = text.toUpperCase(), K = CUT_KERN[faceKey(face)];
  for (let i = 0; i < up.length; i++) {
    const c = letter(up[i], face);
    const pair = up.slice(i, i + 2), k = (K[pair] || 0) + (kern[pair] || 0);
    const sh = (r) => r.map((p) => [p[0] + x, p[1]]);
    out.push({ ch: up[i], x, o: sh(c.o), h: c.h.map(sh), e: c.e.map(sh) });
    x += c.w + track + (i < up.length - 1 ? k : 0);
  }
  return { glyphs: out, width: x - (up.length ? track : 0) };
}

export const RIGHT_MARGIN = 1190; // a cut line stops here unless it is declared to bleed

// Every line of cut letters reports here: held to the right margin unless it bleeds, and logged for the height floor and the
// alphabet check (by its face). A line that names its tile also logs its bounds: the Seam geometry guard holds it inside that tile.
export function noteCut(page, text, insts, h, { xs = 1, bleed = false, tile, face = 'wide', box = tile && bboxOf(insts.flat(2)) } = {}) {
  if (!bleed) { const xm = Math.max(...insts.flat(2).map((p) => p[0])); if (xm > RIGHT_MARGIN) throw new GuardError('Overflow', `cut line "${text}" overflows the right margin: x ${xm.toFixed(0)} > ${RIGHT_MARGIN}`); }
  page.log.cuts.push({ text, h, xs, bleed, tile, box, face: faceKey(face) });
}

// One line of cut letters. (x, y) is the top left of the cap line before rotation; h the cap height in page units; xs a
// horizontal stretch; skew a shear (the tops lean right by skew * h); rot degrees about (x, y). `clip` a convex polygon.
// `outline: w` draws the rings as a stroke of `fill`, w wide, in place of the fill. Returns the line's width.
export function cutLine(page, text, x, y, h, fill, { skew = 0, track = 0, cls, clip, z, xs = 1, rot = 0, bleed = false, kern, tile, face = 'wide', outline = 0, before, from } = {}) {
  const wd = word(text, null, { track, kern, face });
  const s = h / 140;
  const rad = (rot * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
  const map = (p) => { const X = p[0] * s * xs + (140 - p[1]) * s * skew, Y = p[1] * s; return [x + X * co - Y * si, y + X * si + Y * co]; };
  let insts = wd.glyphs.filter((g) => g.o.length).map((g) => ringsOf(g).map((r) => r.map(map)));
  if (clip) insts = insts.map((rs) => rs.map((r) => clipConvex(r, clip)).filter((r) => r.length > 2)).filter((rs) => rs.length);
  noteCut(page, text, insts, h, { xs, bleed, tile, face });
  const attrs = outline ? `fill="none" stroke="${fill}" stroke-width="${+outline.toFixed(2)}" stroke-linejoin="round"` : `fill="${fill}"`;
  page.rings(insts, attrs, { cls, z, before, from });
  return wd.width * s * xs;
}
// The natural width of a line at cap height h, and the cap height that fills a width. The face comes last, or the third argument
// is an options object {track, face}: cutWidth(text, h, 0, faces.cond), cutWidth(text, h, { face: faces.cond }),
// fitH(text, maxW, 0, skew, faces.cond).
const opts = (track, face) => {
  if (track && typeof track === 'object' && !track.glyphs) return { track: track.track ?? 0, face: track.face ?? face ?? 'wide' };
  if (track && typeof track === 'object') return { track: 0, face: track }; // a face passed where the track goes
  return { track: track ?? 0, face: face ?? 'wide' };
};
export const cutWidth = (text, h, track = 0, face) => { const o = opts(track, face); return word(text, null, o).width * (h / 140); };
export const fitH = (text, maxW, track = 0, skew = 0, face) => { const o = opts(track, face); const n = word(text, null, o).width; return (maxW * 140) / (n + 140 * skew); };

// A word lying flat on the street: stems run to the vanishing point VP, the horizon's roll is kept. xb0..xb1 is where its
// baseline runs at the near edge, yt and yb its top and baseline. Returns the instances (rings per letter) in page units.
export function layWord(page, text, xb0, xb1, yt, yb, VP, fill, { seed, cls, track = 0, kern, face = 'wide', before, from } = {}) {
  const wd = word(text, null, { track, kern, face });
  const u = (x) => (x / wd.width), rollAt = (x) => (x - VP[0]) * -ANG.roll;
  const map = (p) => {
    const v = p[1] / 140, y = lerp(yt, yb, v), sc = (y - VP[1]) / (yb - VP[1]);
    const xb = lerp(xb0, xb1, u(p[0]));
    const X = VP[0] + (xb - VP[0]) * sc;
    return [X, y + rollAt(X)];
  };
  const insts = wd.glyphs.filter((g) => g.o.length).map((g) => ringsOf(g).map((r) => r.map(map)));
  noteCut(page, text, insts, yb - yt, { bleed: true, face }); // the street's perspective owns its edge
  page.rings(insts, `fill="${fill}"`, { cls, before, from });
  return insts;
}
