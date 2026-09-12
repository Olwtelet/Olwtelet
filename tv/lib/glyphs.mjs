// Glyph coverage of VCR OSD Mono and vector stand-ins for the characters it lacks (SPEC §3.3).
// The cmap and metrics are read from the committed font file, so replacing the font can never silently break
// layout: line() fails on any code point that is neither in the font nor drawn here.
import zlib from 'node:zlib';
import { r2 } from './tokens.mjs';
import { FONT_BYTES } from './font.mjs';

// ── read the sfnt tables we need out of the WOFF2 container ──────────────────────────────────────
// WOFF2 table directory: a flags byte (known-tag index + transform version), an optional 4-byte tag, then
// UIntBase128 lengths. All table data is one brotli stream, stored in directory order without padding.
const KNOWN_TAGS = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep',
  'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln',
  'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf',
  'Silf', 'Glat', 'Gloc', 'Feat', 'Sill'];

function readTables(buf) {
  if (buf.toString('latin1', 0, 4) !== 'wOF2') throw new Error('tv/fonts/VCROSDMono.woff2 is not a WOFF2 file');
  let pos = 48;
  const base128 = () => {
    let v = 0;
    for (let i = 0; i < 5; i++) {
      const byte = buf[pos++];
      v = (v << 7) | (byte & 0x7f);
      if (!(byte & 0x80)) return v >>> 0;
    }
    throw new Error('woff2: malformed UIntBase128');
  };
  const directory = [];
  for (let i = 0, n = buf.readUInt16BE(12); i < n; i++) {
    const flags = buf[pos++];
    let tag = KNOWN_TAGS[flags & 0x3f];
    if ((flags & 0x3f) === 63) { tag = buf.toString('latin1', pos, pos + 4); pos += 4; }
    const version = flags >> 6;
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    const origLength = base128();
    directory.push({ tag, transformed, length: transformed ? base128() : origLength });
  }
  const stream = zlib.brotliDecompressSync(buf.subarray(pos, pos + buf.readUInt32BE(20)));
  const tables = new Map();
  let offset = 0;
  for (const t of directory) {
    tables.set(t.tag, { data: stream.subarray(offset, offset + t.length), transformed: t.transformed });
    offset += t.length;
  }
  return tables;
}

/** code point → glyph id from every format 4 / format 12 cmap subtable */
function readCmap(cmap) {
  const map = new Map();
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const o = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(o);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(o + 6);
      const ends = o + 14, starts = ends + segX2 + 2, deltas = starts + segX2, rangeOffsets = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(rangeOffsets + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let gid = ro === 0 ? c + delta : cmap.readUInt16BE(rangeOffsets + s * 2 + ro + (c - start) * 2);
          if (ro !== 0 && gid) gid += delta;
          if (gid & 0xffff) map.set(c, gid & 0xffff);
        }
      }
    } else if (format === 12) {
      for (let g = 0, groups = cmap.readUInt32BE(o + 12); g < groups; g++) {
        const b = o + 16 + g * 12;
        for (let c = cmap.readUInt32BE(b), end = cmap.readUInt32BE(b + 4), gid = cmap.readUInt32BE(b + 8); c <= end; c++, gid++) map.set(c, gid);
      }
    }
  }
  return map;
}

const tables = readTables(FONT_BYTES);
const table = (tag) => {
  const t = tables.get(tag);
  if (!t) throw new Error(`VCR OSD Mono: missing ${tag} table`);
  if (t.transformed) throw new Error(`VCR OSD Mono: ${tag} table is WOFF2-transformed, cannot read metrics`);
  return t.data;
};
const hhea = table('hhea'), hmtx = table('hmtx'), os2 = table('OS/2');
const hMetrics = hhea.readUInt16BE(34);
const advanceOf = (gid) => hmtx.readUInt16BE(4 * Math.min(gid, hMetrics - 1));
const glyphIds = readCmap(table('cmap'));

/** Font metrics in font units, read from head / hmtx / OS/2. */
export const METRICS = Object.freeze({
  upm: table('head').readUInt16BE(18),
  advance: advanceOf(glyphIds.get(0x4d)), // 'M'
  cap: os2.readInt16BE(88),
  xHeight: os2.readInt16BE(86),
});

// Every layout rule in SPEC §2–§3 is written against these numbers (ADV 0.5859375, CAP 0.7324).
if (METRICS.upm !== 2048 || METRICS.advance !== 1200 || METRICS.cap !== 1500) {
  throw new Error(`VCR OSD Mono metrics changed (${JSON.stringify(METRICS)}); SPEC §3.2 expects upm 2048, advance 1200, cap 1500`);
}

/**
 * Code points the font renders at the monospace advance. Zero-width entries (U+0000, U+001D) are left out,
 * so layout can assume every covered character occupies exactly one cell.
 */
export const CMAP = Object.freeze(new Set([...glyphIds].filter(([cp, gid]) => cp >= 0x20 && advanceOf(gid) === METRICS.advance).map(([cp]) => cp)));

// ── drawn stand-ins ─────────────────────────────────────────────────────────────────────────────
// Geometry in em, origin = left edge of the character cell on the baseline, y grows downward.
// Shapes: { rect: [x, y, w, h] } | { poly: [[x, y], …] } | { circle: [cx, cy, r] }
const ADV_EM = METRICS.advance / METRICS.upm;
const CAP_EM = METRICS.cap / METRICS.upm;

/** A straight bar of width `w` from (x0, y0) to (x1, y1) as a quad, rounded to 3 decimals. */
function bar(x0, y0, x1, y1, w) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const nx = (-(y1 - y0) / len) * (w / 2), ny = ((x1 - x0) / len) * (w / 2);
  const q = (v) => Math.round(v * 1000) / 1000;
  return { poly: [[q(x0 + nx), q(y0 + ny)], [q(x1 + nx), q(y1 + ny)], [q(x1 - nx), q(y1 - ny)], [q(x0 - nx), q(y0 - ny)]] };
}

export const DRAWN = Object.freeze({
  '▮': [{ rect: [0.13, -CAP_EM, 0.33, CAP_EM] }],
  '▸': [{ poly: [[0.16, -0.56], [0.47, -0.37], [0.16, -0.18]] }],
  '·': [{ rect: [0.235, -0.425, 0.115, 0.115] }],
  '—': [{ rect: [0, -0.405, ADV_EM, 0.085] }],
  '–': [{ rect: [0.07, -0.405, ADV_EM - 0.14, 0.085] }],
  '●': [{ circle: [0.293, -0.37, 0.215] }],
  '↗': [{ rect: [0.17, -0.68, 0.33, 0.09] }, { rect: [0.41, -0.68, 0.09, 0.33] },
    { poly: [[0.138, -0.036], [0.498, -0.596], [0.422, -0.644], [0.062, -0.084]] }],
  '×': [bar(0.113, -0.55, 0.473, -0.19, 0.09), bar(0.113, -0.19, 0.473, -0.55, 0.09)],
});

/**
 * Markup for one drawn glyph whose cell starts at (x, baseline y), `size` u tall. No fill: it inherits the
 * parent group's fill exactly like the <text> next to it.
 * @example drawGlyph('●', 72, 92, 24)
 */
export function drawGlyph(ch, x, y, size) {
  const shapes = DRAWN[ch];
  if (!shapes) throw new Error(`drawGlyph: "${ch}" has no drawn stand-in`);
  const X = (v) => r2(x + v * size), Y = (v) => r2(y + v * size), S = (v) => r2(v * size);
  return shapes.map((s) => {
    if (s.rect) return `<rect x="${X(s.rect[0])}" y="${Y(s.rect[1])}" width="${S(s.rect[2])}" height="${S(s.rect[3])}"/>`;
    if (s.circle) return `<circle cx="${X(s.circle[0])}" cy="${Y(s.circle[1])}" r="${S(s.circle[2])}"/>`;
    return `<path d="M${s.poly.map(([px, py]) => `${X(px)} ${Y(py)}`).join('L')}Z"/>`;
  }).join('');
}

/**
 * Throw when `str` contains a code point that is neither in the font nor drawn.
 * @example assertCoverage('▸ NOW RECEIVING', 'hero line 1')
 */
export function assertCoverage(str, who = 'text') {
  for (const ch of String(str)) {
    if (!CMAP.has(ch.codePointAt(0)) && !DRAWN[ch]) {
      const hex = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      throw new Error(`${who}: U+${hex} ${JSON.stringify(ch)} is not in VCR OSD Mono and has no drawn stand-in (SPEC §3.3)`);
    }
  }
}
