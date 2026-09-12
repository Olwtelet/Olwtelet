// Per-asset font subsetting (SPEC §4.4): decode the committed WOFF2, keep only the glyphs one SVG draws, and
// re-encode a WOFF2 small enough to inline in every image. Zero dependencies — node:zlib supplies brotli.
//
//   decodeWoff2(buf)                   → { flavor, tables }   plain sfnt tables; glyf/loca are un-transformed here
//   subsetTables(tables, codepoints)   → tables               a new Map; the input map and its buffers are read-only
//   encodeWoff2(tables)                → Buffer               WOFF2, null transforms (glyf/loca version 3) + brotli
//
// `tables` is a Map<4-char tag, Buffer>. tv/lib/font.mjs decodes the font once and subsets it per file, so
// subsetTables() must never write into what it was given. tv/lib/woff2.test.mjs proves both round trips.
//
// References: WOFF2 (W3C REC-WOFF2-20180301) §4 (container) and §5.1 (glyf transform); OpenType glyf/loca/cmap/post.
import zlib from 'node:zlib';

/** WOFF2 known-table index: the low 6 bits of a directory entry's flags byte (0x3f = the tag follows inline). */
const KNOWN_TAGS = Object.freeze(['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf',
  'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE',
  'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat',
  'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill']);

/** Table order inside the re-encoded file. glyf is written immediately before loca, as WOFF2 encoders do. */
const WRITE_ORDER = Object.freeze(['head', 'hhea', 'maxp', 'OS/2', 'hmtx', 'cmap', 'fpgm', 'prep', 'cvt ', 'gasp', 'name', 'post']);

// Tables a profile image never needs: OpenType layout, FontForge's timestamps, and a signature that any edit
// invalidates anyway. SPEC §4.4 names the first four.
const DROP = Object.freeze(new Set(['GSUB', 'GPOS', 'GDEF', 'FFTM', 'DSIG']));

/** Tables that only matter while TrueType instructions run, dropped together with them. */
const HINT_TABLES = Object.freeze(['fpgm', 'prep', 'cvt ']);

const SIGNATURE = 0x774f4632; // 'wOF2'
const TRUETYPE = 0x00010000;
const fail = (msg) => { throw new Error(`woff2: ${msg}`); };

// ── little readers ──────────────────────────────────────────────────────────────────────────────
/** A forward cursor over one buffer; every read advances it. Used for the WOFF2 streams. */
function cursor(buf, who) {
  let pos = 0;
  const need = (n) => { if (pos + n > buf.length) fail(`${who} stream ran out of data`); };
  return {
    get pos() { return pos; },
    get done() { return pos >= buf.length; },
    /** The bytes between two cursor positions, for data that is copied through unchanged. */
    between: (from, to) => Buffer.from(buf.subarray(from, to)),
    u8: () => { need(1); return buf[pos++]; },
    u16: () => { need(2); const v = buf.readUInt16BE(pos); pos += 2; return v; },
    i16: () => { need(2); const v = buf.readInt16BE(pos); pos += 2; return v; },
    u32: () => { need(4); const v = buf.readUInt32BE(pos); pos += 4; return v; },
    take: (n) => { need(n); const v = buf.subarray(pos, pos + n); pos += n; return v; },
    /** UIntBase128: 7 bits per byte, most significant first, high bit = "one more byte" (WOFF2 §4.1). */
    base128() {
      let v = 0;
      for (let i = 0; i < 5; i++) {
        const byte = this.u8();
        if (i === 0 && byte === 0x80) fail('UIntBase128 with a leading zero');
        if (v > 0x01ffffff) fail('UIntBase128 overflow');
        v = (v << 7) | (byte & 0x7f);
        if (!(byte & 0x80)) return v >>> 0;
      }
      return fail('UIntBase128 longer than 5 bytes');
    },
    /** 255UInt16: one byte for 0–252, or an escape byte plus 1–2 more (WOFF2 §4.2). */
    pack255() {
      const code = this.u8();
      if (code === 253) return this.u16();
      if (code === 254) return this.u8() + 253 * 2;
      if (code === 255) return this.u8() + 253;
      return code;
    },
  };
}

/** UIntBase128 bytes for a directory length. */
function uintBase128(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0x7fffffff) fail(`cannot encode ${value} as UIntBase128`);
  const out = [];
  let v = value >>> 0;
  do { out.unshift(v & 0x7f); v >>>= 7; } while (v);
  for (let i = 0; i < out.length - 1; i++) out[i] |= 0x80;
  return Buffer.from(out);
}

const pad4 = (n) => (n + 3) & ~3;

// ── decode ──────────────────────────────────────────────────────────────────────────────────────
/**
 * Read a WOFF2 file into plain sfnt tables. The glyf transform (WOFF2 §5.1) is undone here, so `glyf` and
 * `loca` come back exactly as an OpenType consumer expects them; every other table is stored verbatim.
 * The buffers are views into one decompressed block: treat them as read-only.
 * @example const { tables } = decodeWoff2(fs.readFileSync('tv/fonts/VCROSDMono.woff2'));
 */
export function decodeWoff2(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  if (buf.length < 48 || buf.readUInt32BE(0) !== SIGNATURE) fail('not a WOFF2 file (bad signature)');
  const flavor = buf.readUInt32BE(4);
  if (flavor === 0x74746366) fail('font collections (ttcf) are not supported');
  const numTables = buf.readUInt16BE(12);
  const totalCompressedSize = buf.readUInt32BE(20);
  if (buf.readUInt32BE(8) !== buf.length) fail(`header length ${buf.readUInt32BE(8)} does not match the ${buf.length} B file`);

  // Table directory: flags byte (tag index + transform version), optional 4-byte tag, then the lengths.
  const dir = cursor(buf.subarray(48), 'table directory');
  const entries = [];
  for (let i = 0; i < numTables; i++) {
    const flags = dir.u8();
    const index = flags & 0x3f;
    const tag = index === 0x3f ? dir.take(4).toString('latin1') : KNOWN_TAGS[index];
    if (!tag) fail(`unknown table index ${index}`);
    const version = flags >> 6;
    // Only glyf and loca define a transform; for them version 3 means "stored as-is", for everything else 0 does.
    const transformed = tag === 'glyf' || tag === 'loca' ? version !== 3 : version !== 0;
    const origLength = dir.base128();
    entries.push({ tag, version, transformed, length: transformed ? dir.base128() : origLength });
  }

  const start = 48 + dir.pos;
  const stream = zlib.brotliDecompressSync(buf.subarray(start, start + totalCompressedSize));
  const total = entries.reduce((sum, e) => sum + e.length, 0);
  if (stream.length !== total) fail(`decompressed ${stream.length} B for ${total} B of tables`);

  const raw = new Map();
  let offset = 0;
  for (const e of entries) { raw.set(e.tag, { ...e, data: stream.subarray(offset, offset + e.length) }); offset += e.length; }

  const tables = new Map();
  for (const [tag, e] of raw) {
    if (tag === 'loca') continue; // rebuilt together with glyf below
    if (e.transformed && tag !== 'glyf') fail(`table ${tag} uses transform version ${e.version}, which this decoder does not implement`);
    tables.set(tag, e.data);
  }
  const glyf = raw.get('glyf');
  if (glyf?.transformed) {
    const head = tables.get('head') ?? fail('transformed glyf without a head table');
    const rebuilt = reconstructGlyf(glyf.data, head.readInt16BE(50) === 1);
    tables.set('glyf', rebuilt.glyf);
    tables.set('loca', rebuilt.loca);
  } else if (glyf) {
    const loca = raw.get('loca') ?? fail('glyf without loca');
    tables.set('loca', loca.data);
  }
  return { flavor, tables };
}

/**
 * Undo the WOFF2 glyf transform (§5.1): per-glyph contour counts, point counts, flags, delta-coded coordinates,
 * composite data, optional bounding boxes and instructions live in seven separate streams. Returns the plain
 * `glyf` table plus the matching `loca` (short or long, as head.indexToLocFormat says).
 */
function reconstructGlyf(data, longLoca) {
  const head = cursor(data, 'transformed glyf');
  head.u32(); // reserved version
  const numGlyphs = head.u16();
  head.u16(); // indexFormat: head.indexToLocFormat is the one that must agree with the loca we write
  const sizes = [];
  for (let i = 0; i < 7; i++) sizes.push(head.u32());
  const [nContours, nPoints, flags, glyphs, composites, bboxes, instructions] = sizes.map((n) => head.take(n));
  if (!head.done) fail('transformed glyf has trailing bytes');

  const nContourS = cursor(nContours, 'nContour');
  const nPointsS = cursor(nPoints, 'nPoints');
  const flagS = cursor(flags, 'flag');
  const glyphS = cursor(glyphs, 'glyph');
  const compositeS = cursor(composites, 'composite');
  const bitmapLength = ((numGlyphs + 31) >> 5) << 2; // one bit per glyph, padded to 4 bytes
  const bboxBitmap = cursor(bboxes, 'bbox').take(bitmapLength);
  const bboxS = cursor(bboxes.subarray(bitmapLength), 'bbox value');
  const instructionS = cursor(instructions, 'instruction');
  const hasBbox = (gid) => Boolean(bboxBitmap[gid >> 3] & (0x80 >> (gid & 7)));
  const readInstructions = () => instructionS.take(glyphS.pack255());

  const parts = [];
  const offsets = [0];
  let end = 0;
  for (let gid = 0; gid < numGlyphs; gid++) {
    const contours = nContourS.i16();
    let glyph = Buffer.alloc(0);
    if (contours > 0) {
      const ends = [];
      let points = 0;
      for (let c = 0; c < contours; c++) { points += nPointsS.pack255(); ends.push(points - 1); }
      const coords = readTriplets(flagS.take(points), glyphS, points);
      glyph = simpleGlyph(ends, coords, readInstructions(), hasBbox(gid) ? readBbox(bboxS) : boundsOf(coords));
    } else if (contours < 0) {
      if (!hasBbox(gid)) fail(`composite glyph ${gid} has no bounding box`);
      const { body, hasInstructions } = readComponents(compositeS);
      const bbox = readBbox(bboxS);
      const program = hasInstructions ? readInstructions() : null;
      const tail = program ? Buffer.concat([u16be(program.length), program]) : Buffer.alloc(0);
      glyph = Buffer.concat([i16be(-1), bbox, body, tail]);
    } else if (hasBbox(gid)) fail(`empty glyph ${gid} must not carry a bounding box`);
    // sfnt keeps glyphs 4-byte aligned, which also keeps short-loca offsets even
    const padded = pad4(glyph.length);
    if (padded > glyph.length) glyph = Buffer.concat([glyph, Buffer.alloc(padded - glyph.length)]);
    parts.push(glyph);
    end += padded;
    offsets.push(end);
  }
  // Every stream must be spent exactly: anything left over means the glyphs were cut in the wrong places.
  for (const [name, stream] of [['nContour', nContourS], ['nPoints', nPointsS], ['flag', flagS], ['glyph', glyphS],
    ['composite', compositeS], ['bbox', bboxS], ['instruction', instructionS]]) {
    if (!stream.done) fail(`${name} stream has unread bytes after ${numGlyphs} glyphs`);
  }
  return { glyf: Buffer.concat(parts, end), loca: writeLoca(offsets, longLoca) };
}

const u16be = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v & 0xffff); return b; };
const i16be = (v) => { const b = Buffer.alloc(2); b.writeInt16BE(v); return b; };
const readBbox = (stream) => Buffer.from(stream.take(8));

/**
 * WOFF2 triplet decoding (§5.2): one flag byte per point (high bit = off-curve) selecting how many of the
 * following glyph-stream bytes hold the x/y deltas, and which bits carry their signs.
 */
function readTriplets(flags, glyphS, points) {
  const out = [];
  let x = 0, y = 0;
  for (let i = 0; i < points; i++) {
    const raw = flags[i];
    const onCurve = (raw & 0x80) === 0;
    const flag = raw & 0x7f;
    const size = flag < 84 ? 1 : flag < 120 ? 2 : flag < 124 ? 3 : 4;
    const b = glyphS.take(size);
    const sign = (bit, value) => (bit & 1 ? value : -value);
    let dx, dy;
    if (flag < 10) { dx = 0; dy = sign(flag, ((flag & 14) << 7) + b[0]); }
    else if (flag < 20) { dx = sign(flag, (((flag - 10) & 14) << 7) + b[0]); dy = 0; }
    else if (flag < 84) {
      const n = flag - 20;
      dx = sign(flag, 1 + (n & 0x30) + (b[0] >> 4));
      dy = sign(flag >> 1, 1 + ((n & 0x0c) << 2) + (b[0] & 0x0f));
    } else if (flag < 120) {
      const n = flag - 84;
      dx = sign(flag, 1 + (Math.floor(n / 12) << 8) + b[0]);
      dy = sign(flag >> 1, 1 + (((n % 12) >> 2) << 8) + b[1]);
    } else if (flag < 124) {
      dx = sign(flag, (b[0] << 4) + (b[1] >> 4));
      dy = sign(flag >> 1, ((b[1] & 0x0f) << 8) + b[2]);
    } else {
      dx = sign(flag, (b[0] << 8) + b[1]);
      dy = sign(flag >> 1, (b[2] << 8) + b[3]);
    }
    x += dx;
    y += dy;
    out.push({ x, y, onCurve });
  }
  return out;
}

const boundsOf = (points) => {
  if (!points.length) return Buffer.alloc(8);
  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  for (const { x, y } of points) {
    if (x < xMin) xMin = x;
    if (x > xMax) xMax = x;
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  return Buffer.concat([i16be(xMin), i16be(yMin), i16be(xMax), i16be(yMax)]);
};

/** Assemble one simple glyph: header, contour ends, instructions, point flags, then x and y delta runs. */
function simpleGlyph(ends, points, program, bbox) {
  const flags = [], xs = [], ys = [];
  let px = 0, py = 0;
  for (const p of points) {
    let flag = p.onCurve ? 0x01 : 0;
    for (const [delta, prev, short, same, bytes] of [[p.x, px, 0x02, 0x10, xs], [p.y, py, 0x04, 0x20, ys]]) {
      const d = delta - prev;
      if (d === 0) flag |= same;
      else if (d >= -255 && d <= 255) { flag |= short | (d > 0 ? same : 0); bytes.push(Buffer.from([Math.abs(d)])); }
      else if (d >= -32768 && d <= 32767) bytes.push(i16be(d));
      else fail(`coordinate delta ${d} does not fit in an int16`);
    }
    flags.push(flag);
    px = p.x;
    py = p.y;
  }
  return Buffer.concat([
    i16be(ends.length), bbox,
    Buffer.concat(ends.map(u16be)),
    u16be(program.length), Buffer.from(program),
    Buffer.from(flags), Buffer.concat(xs), Buffer.concat(ys),
  ]);
}

/** Component flags (OpenType glyf): argument width, transform shape, "more follow" and "instructions follow". */
const ARGS_ARE_WORDS = 0x0001, WE_HAVE_A_SCALE = 0x0008, MORE_COMPONENTS = 0x0020;
const X_AND_Y_SCALE = 0x0040, TWO_BY_TWO = 0x0080, WE_HAVE_INSTRUCTIONS = 0x0100;

/** Copy one composite glyph's component records out of a cursor, returning the bytes and the instruction flag. */
function readComponents(stream) {
  const start = stream.pos;
  let hasInstructions = false, more = true;
  while (more) {
    const flags = stream.u16();
    stream.u16(); // glyph index
    stream.take(flags & ARGS_ARE_WORDS ? 4 : 2);
    if (flags & WE_HAVE_A_SCALE) stream.take(2);
    else if (flags & X_AND_Y_SCALE) stream.take(4);
    else if (flags & TWO_BY_TWO) stream.take(8);
    hasInstructions ||= Boolean(flags & WE_HAVE_INSTRUCTIONS);
    more = Boolean(flags & MORE_COMPONENTS);
  }
  return { body: stream.between(start, stream.pos), hasInstructions };
}

const writeLoca = (offsets, longLoca) => {
  const out = Buffer.alloc(offsets.length * (longLoca ? 4 : 2));
  offsets.forEach((o, i) => {
    if (longLoca) out.writeUInt32BE(o, i * 4);
    else if (o % 2 || o / 2 > 0xffff) fail(`offset ${o} does not fit the short loca format`);
    else out.writeUInt16BE(o / 2, i * 2);
  });
  return out;
};

const readLoca = (loca, numGlyphs, longLoca) => Array.from({ length: numGlyphs + 1 },
  (_, i) => (longLoca ? loca.readUInt32BE(i * 4) : loca.readUInt16BE(i * 2) * 2));

// ── subset ──────────────────────────────────────────────────────────────────────────────────────
/** Every code point the font maps, from its format 4 and format 12 cmap subtables. */
function readCmap(cmap) {
  const map = new Map();
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const o = cmap.readUInt32BE(8 + i * 8);
    const format = cmap.readUInt16BE(o);
    if (format === 4) {
      const segX2 = cmap.readUInt16BE(o + 6);
      const ends = o + 14, starts = ends + segX2 + 2, deltas = starts + segX2, rangeOffsets = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = cmap.readUInt16BE(ends + s * 2), first = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(rangeOffsets + s * 2);
        for (let c = first; c <= end && c !== 0xffff; c++) {
          let gid = ro === 0 ? c + delta : cmap.readUInt16BE(rangeOffsets + s * 2 + ro + (c - first) * 2);
          if (ro !== 0 && gid) gid += delta;
          if (gid & 0xffff) map.set(c, gid & 0xffff);
        }
      }
    } else if (format === 12) {
      for (let group = 0, groups = cmap.readUInt32BE(o + 12); group < groups; group++) {
        const b = o + 16 + group * 12;
        for (let c = cmap.readUInt32BE(b), end = cmap.readUInt32BE(b + 4), gid = cmap.readUInt32BE(b + 8); c <= end; c++, gid++) map.set(c, gid);
      }
    }
  }
  return map;
}

/**
 * Keep only the glyphs `codepoints` needs. Glyph ids never move — unused glyphs become empty, which costs a
 * run of identical loca offsets that brotli flattens to nothing — so hmtx, maxp and the rest stay valid as they
 * are. Rebuilds cmap (format 4 over the kept code points) and post (version 3, no glyph names) and drops the
 * OpenType layout tables.
 *   hinting  keep each glyph's TrueType program and the fpgm/prep/cvt tables it runs against (the default).
 *            Those programs are 70% of this font's glyf, so { hinting: false } saves roughly 3 KB per image —
 *            but Chrome then grid-fits the same outlines differently: measured over a sheet of all 205 glyphs,
 *            1.5% of the pixels at 880 px and 3.4% at 356 px. Advance widths are identical either way.
 * Code points the font does not map are skipped: the drawn stand-ins of SPEC §3.3 are shapes, not characters.
 * @example subsetTables(tables, [...new Set('PORTFOLIO 0123456789')].map((c) => c.codePointAt(0)).sort((a, b) => a - b))
 */
export function subsetTables(tables, codepoints, { hinting = true } = {}) {
  const need = (tag) => tables.get(tag) ?? fail(`the font has no ${tag} table, cannot subset it`);
  const head = need('head'), maxp = need('maxp'), glyf = need('glyf'), loca = need('loca');
  const numGlyphs = maxp.readUInt16BE(4);
  const offsets = readLoca(loca, numGlyphs, head.readInt16BE(50) === 1);
  const cmap = readCmap(need('cmap'));

  // .notdef is always kept; composite components are pulled in with the glyph that references them.
  const keep = new Set([0]);
  const pairs = [];
  for (const cp of [...new Set(codepoints)].sort((a, b) => a - b)) {
    const gid = cmap.get(cp);
    if (gid === undefined || gid >= numGlyphs) continue;
    pairs.push([cp, gid]);
    addGlyph(gid, keep, glyf, offsets);
  }

  const out = new Map();
  for (const [tag, data] of tables) {
    if (DROP.has(tag) || (!hinting && HINT_TABLES.includes(tag))) continue;
    if (tag !== 'glyf' && tag !== 'loca' && tag !== 'cmap' && tag !== 'post') out.set(tag, data);
  }
  const parts = [];
  const kept = [0];
  let end = 0;
  for (let gid = 0; gid < numGlyphs; gid++) {
    let data = keep.has(gid) ? glyf.subarray(offsets[gid], offsets[gid + 1]) : Buffer.alloc(0);
    if (!hinting && data.length) data = stripInstructions(data);
    const padded = pad4(data.length);
    parts.push(padded === data.length ? data : Buffer.concat([data, Buffer.alloc(padded - data.length)]));
    end += padded;
    kept.push(end);
  }
  out.set('glyf', Buffer.concat(parts, end));
  out.set('loca', writeLoca(kept, head.readInt16BE(50) === 1));
  out.set('cmap', buildCmap(pairs));
  out.set('post', postV3(need('post')));
  return out;
}

/** Add `gid` and, when it is a composite, every glyph it is built from. */
function addGlyph(gid, keep, glyf, offsets, depth = 0) {
  if (keep.has(gid) || gid + 1 >= offsets.length) return;
  keep.add(gid);
  const data = glyf.subarray(offsets[gid], offsets[gid + 1]);
  if (data.length < 10 || data.readInt16BE(0) >= 0) return;
  if (depth > 5) fail(`composite glyph ${gid} nests more than 5 levels deep`);
  const stream = cursor(data.subarray(10), `composite glyph ${gid}`);
  let more = true;
  while (more) {
    const flags = stream.u16();
    addGlyph(stream.u16(), keep, glyf, offsets, depth + 1);
    stream.take(flags & ARGS_ARE_WORDS ? 4 : 2);
    if (flags & WE_HAVE_A_SCALE) stream.take(2);
    else if (flags & X_AND_Y_SCALE) stream.take(4);
    else if (flags & TWO_BY_TWO) stream.take(8);
    more = Boolean(flags & MORE_COMPONENTS);
  }
}

/**
 * Drop a simple glyph's TrueType program (the outline is untouched). Composites keep theirs: their instruction
 * flag lives in the component records, and this font has none.
 */
function stripInstructions(glyph) {
  const contours = glyph.readInt16BE(0);
  if (contours < 0) return glyph;
  const at = 10 + contours * 2;
  const length = glyph.readUInt16BE(at);
  if (!length) return glyph;
  return Buffer.concat([glyph.subarray(0, at), u16be(0), glyph.subarray(at + 2 + length)]);
}

/** A cmap with one format 4 subtable, listed for both Unicode (0,3) and Windows (3,1), as the source font does. */
function buildCmap(pairs) {
  // One segment per run of consecutive code points sharing the same glyph-id delta, plus the required 0xFFFF end.
  const segments = [];
  for (const [cp, gid] of pairs) {
    if (cp > 0xffff) fail(`code point U+${cp.toString(16).toUpperCase()} is outside the BMP`);
    const last = segments[segments.length - 1];
    if (last && cp === last.end + 1 && ((gid - cp) & 0xffff) === last.delta) last.end = cp;
    else segments.push({ start: cp, end: cp, delta: (gid - cp) & 0xffff });
  }
  segments.push({ start: 0xffff, end: 0xffff, delta: 1 });

  const count = segments.length;
  const search = 2 * 2 ** Math.floor(Math.log2(count));
  const sub = Buffer.alloc(16 + count * 8);
  sub.writeUInt16BE(4, 0);
  sub.writeUInt16BE(sub.length, 2);
  sub.writeUInt16BE(0, 4); // language
  sub.writeUInt16BE(count * 2, 6);
  sub.writeUInt16BE(search, 8);
  sub.writeUInt16BE(Math.log2(search / 2), 10);
  sub.writeUInt16BE(count * 2 - search, 12);
  segments.forEach((s, i) => {
    sub.writeUInt16BE(s.end, 14 + i * 2);
    sub.writeUInt16BE(s.start, 16 + count * 2 + i * 2);
    sub.writeUInt16BE(s.delta, 16 + count * 4 + i * 2);
    sub.writeUInt16BE(0, 16 + count * 6 + i * 2); // idRangeOffset: glyph ids come from idDelta alone
  });

  const header = Buffer.alloc(20);
  header.writeUInt16BE(0, 0);
  header.writeUInt16BE(2, 2);
  [[0, 3], [3, 1]].forEach(([platform, encoding], i) => {
    header.writeUInt16BE(platform, 4 + i * 8);
    header.writeUInt16BE(encoding, 6 + i * 8);
    header.writeUInt32BE(20, 8 + i * 8);
  });
  return Buffer.concat([header, sub]);
}

/** post version 3.0: the same header as the source table with its glyph-name list dropped. */
function postV3(post) {
  const out = Buffer.from(post.subarray(0, 32));
  out.writeUInt32BE(0x00030000, 0);
  return out;
}

// ── encode ──────────────────────────────────────────────────────────────────────────────────────
/**
 * Pack sfnt tables into a WOFF2 file. Both transformable tables are written with the null transform (glyf and
 * loca as-is, version 3), which keeps the encoder small and costs little once brotli has seen the data.
 * Deterministic: the table order is fixed and brotli runs with explicit parameters.
 * @example fs.writeFileSync('out.woff2', encodeWoff2(subsetTables(tables, codepoints)));
 */
export function encodeWoff2(tables) {
  const rest = [...tables.keys()].filter((tag) => tag !== 'glyf' && tag !== 'loca');
  const order = [...WRITE_ORDER.filter((tag) => tables.has(tag)), ...rest.filter((tag) => !WRITE_ORDER.includes(tag)).sort()];
  if (tables.has('glyf')) order.push('glyf', 'loca');
  if (!order.length) fail('nothing to encode');

  const directory = [], blocks = [];
  let sfntSize = 12 + 16 * order.length;
  for (const tag of order) {
    const data = tables.get(tag) ?? fail(`missing ${tag} table`);
    const index = KNOWN_TAGS.indexOf(tag);
    const version = tag === 'glyf' || tag === 'loca' ? 3 : 0; // 3 = null transform for glyf/loca
    const flags = Buffer.from([index < 0 ? 0x3f | (version << 6) : index | (version << 6)]);
    directory.push(Buffer.concat([flags, index < 0 ? Buffer.from(tag, 'latin1') : Buffer.alloc(0), uintBase128(data.length)]));
    blocks.push(data);
    sfntSize += pad4(data.length);
  }

  const body = Buffer.concat(blocks);
  const compressed = zlib.brotliCompressSync(body, {
    params: {
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_FONT,
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_LGWIN]: 22,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: body.length,
    },
  });

  const header = Buffer.alloc(48);
  header.writeUInt32BE(SIGNATURE, 0);
  header.writeUInt32BE(TRUETYPE, 4);
  header.writeUInt16BE(order.length, 12);
  header.writeUInt32BE(sfntSize, 16);
  header.writeUInt32BE(compressed.length, 20);
  header.writeUInt16BE(1, 24); // major version
  // The file is padded to a 4-byte boundary and `length` counts the padding (WOFF2 §3). Chrome's sanitizer
  // refuses an unpadded file outright — "Failed to convert WOFF 2.0 font to SFNT" — and the page silently
  // falls back to a system font, so this is not cosmetic.
  const unpadded = Buffer.concat([header, ...directory, compressed]);
  const file = Buffer.concat([unpadded, Buffer.alloc((4 - (unpadded.length % 4)) % 4)]);
  file.writeUInt32BE(file.length, 8);
  return file;
}
