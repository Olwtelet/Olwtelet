// The gate tv/lib/font.mjs opens before it embeds subset fonts: if anything here throws, the build keeps the
// whole woff2 in every image (SPEC §4.4, §7 WP6). It runs on every build, so the default pass stays cheap —
// one decode of the committed font, one small subset, one container round trip, plus a synthetic font that
// exercises the parts VCR OSD Mono does not have (composite glyphs, explicit bounding boxes, instructions).
//
//   import { selfTest } from './woff2.test.mjs'; await selfTest();     // fast gate, what build.mjs calls
//   node tv/lib/woff2.test.mjs                                         // same plus the full-font round trip
import { pathToFileURL } from 'node:url';
import zlib from 'node:zlib';
import { FONT_BYTES } from './font.mjs';
import { decodeWoff2, subsetTables, encodeWoff2 } from './woff2.mjs';

/** Tables every profile image needs to render text. */
const REQUIRED = ['head', 'hhea', 'maxp', 'hmtx', 'cmap', 'glyf', 'loca', 'name', 'OS/2', 'post'];
/** A line from the sign-off card: uppercase, digits, a space, and "·", which the font does not map (SPEC §3.3). */
const SAMPLE = 'OLWTELET · CH 00';

const check = (ok, what) => { if (!ok) throw new Error(`woff2 self-test: ${what}`); };
const same = (a, b, what) => check(Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0, what);
const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; };
const i16 = (v) => { const b = Buffer.alloc(2); b.writeInt16BE(v); return b; };
const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };
/** UIntBase128, as a WOFF2 table directory writes a length. */
const base128 = (v) => {
  const out = [];
  do { out.unshift(v & 0x7f); v >>>= 7; } while (v);
  for (let i = 0; i < out.length - 1; i++) out[i] |= 0x80;
  return Buffer.from(out);
};

/** Independent format 4 cmap reader, so the test does not trust the module's own parser. */
function readCmap4(cmap) {
  const map = new Map();
  for (let i = 0, n = cmap.readUInt16BE(2); i < n; i++) {
    const o = cmap.readUInt32BE(8 + i * 8);
    if (cmap.readUInt16BE(o) !== 4) continue;
    const segX2 = cmap.readUInt16BE(o + 6);
    const ends = o + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2;
    for (let s = 0; s < segX2 / 2; s++) {
      const end = cmap.readUInt16BE(ends + s * 2), first = cmap.readUInt16BE(starts + s * 2);
      const delta = cmap.readInt16BE(deltas + s * 2), ro = cmap.readUInt16BE(ranges + s * 2);
      for (let c = first; c <= end && c !== 0xffff; c++) {
        let gid = ro === 0 ? c + delta : cmap.readUInt16BE(ranges + s * 2 + ro + (c - first) * 2);
        if (ro !== 0 && gid) gid += delta;
        if (gid & 0xffff) map.set(c, gid & 0xffff);
      }
    }
  }
  return map;
}

const locaOf = (tables) => {
  const numGlyphs = tables.get('maxp').readUInt16BE(4);
  const long = tables.get('head').readInt16BE(50) === 1, loca = tables.get('loca');
  return Array.from({ length: numGlyphs + 1 }, (_, i) => (long ? loca.readUInt32BE(i * 4) : loca.readUInt16BE(i * 2) * 2));
};
const glyphOf = (tables, offsets, gid) => tables.get('glyf').subarray(offsets[gid], offsets[gid + 1]);

/** Glyphs are padded to four bytes, and dropping a program changes how much padding follows the outline. */
const trim = (buf) => { let end = buf.length; while (end && buf[end - 1] === 0) end--; return buf.subarray(0, end); };

/** Split a simple glyph into the parts subsetting must preserve and the TrueType program it may drop. */
function splitGlyph(glyph, who) {
  const contours = glyph.readInt16BE(0);
  check(contours > 0, `${who} is not a simple glyph`);
  const at = 10 + contours * 2;
  const length = glyph.readUInt16BE(at);
  return { shape: glyph.subarray(0, at), program: glyph.subarray(at + 2, at + 2 + length), outline: glyph.subarray(at + 2 + length) };
}

/**
 * A WOFF2 built by hand whose glyf is transformed: glyph 0 is a triangle whose bounding box the decoder has to
 * compute, glyph 1 is a composite that reuses it and carries both an explicit bounding box and instructions.
 */
function compositeFixture() {
  const nContour = Buffer.concat([i16(1), i16(-1)]);
  const nPoints = Buffer.from([3]); // 255UInt16: one contour of three points
  const flags = Buffer.from([127, 127, 127]); // on-curve, four coordinate bytes, both deltas positive
  const triplets = Buffer.concat([u16(100), u16(100), u16(200), u16(0), u16(0), u16(200)]);
  const glyphStream = Buffer.concat([triplets, Buffer.from([0]), Buffer.from([2])]); // program lengths: 0 then 2
  const composite = Buffer.concat([u16(0x0103), u16(0), i16(10), i16(-10)]); // words + xy offsets + instructions
  const bbox = Buffer.concat([Buffer.from([0x40, 0, 0, 0]), i16(110), i16(90), i16(310), i16(290)]); // bit set for glyph 1
  const program = Buffer.from([0x4b, 0x00]);
  const streams = [nContour, nPoints, flags, glyphStream, composite, bbox, program];
  const glyf = Buffer.concat([u32(0), u16(2), u16(0), ...streams.map((s) => u32(s.length)), ...streams]);

  const head = Buffer.alloc(54); // indexToLocFormat 0 (short loca) at offset 50
  const body = Buffer.concat([head, glyf]); // loca is transformed to zero bytes
  const compressed = zlib.brotliCompressSync(body);
  const dir = Buffer.concat([
    Buffer.from([1]), base128(head.length), // head, no transform
    Buffer.from([10]), base128(48), base128(glyf.length), // glyf, transformed: original length then stream length
    Buffer.from([11]), base128(6), base128(0), // loca, transformed to nothing
  ]);
  const header = Buffer.alloc(48);
  header.write('wOF2', 0, 'latin1');
  header.writeUInt32BE(0x00010000, 4);
  header.writeUInt16BE(3, 12);
  header.writeUInt32BE(12 + 48 + head.length + 64, 16); // totalSfntSize is informational here
  header.writeUInt32BE(compressed.length, 20);
  header.writeUInt16BE(1, 24);
  const file = Buffer.concat([header, dir, compressed]);
  file.writeUInt32BE(file.length, 8);
  return file;
}

/** Decode the fixture and verify every branch of the glyf transform it covers. */
function checkComposite() {
  const { tables } = decodeWoff2(compositeFixture());
  const offsets = [0, 1, 2].map((i) => tables.get('loca').readUInt16BE(i * 2) * 2);
  const glyf = tables.get('glyf');
  check(offsets[2] === glyf.length, 'fixture: loca does not end at the end of glyf');

  const simple = glyf.subarray(offsets[0], offsets[1]);
  check(simple.readInt16BE(0) === 1, 'fixture: glyph 0 lost its contour count');
  same(simple.subarray(2, 10), Buffer.concat([i16(100), i16(100), i16(300), i16(300)]), 'fixture: computed bounding box is wrong');
  check(simple.readUInt16BE(10) === 2, 'fixture: contour does not end at point 2');
  check(simple.readUInt16BE(12) === 0, 'fixture: glyph 0 gained a program');
  // on-curve + short x + short y, with the "positive/same" bits: (+100,+100) (+200,0) (0,+200)
  same(simple.subarray(14, 17), Buffer.from([0x37, 0x33, 0x35]), 'fixture: point flags are wrong');
  same(simple.subarray(17, 21), Buffer.from([100, 200, 100, 200]), 'fixture: coordinate deltas are wrong');
  check(simple.length === 24, `fixture: glyph 0 is ${simple.length} B, expected 21 B padded to 24`);

  const comp = glyf.subarray(offsets[1], offsets[2]);
  check(comp.readInt16BE(0) === -1, 'fixture: glyph 1 is not composite');
  same(comp.subarray(2, 10), Buffer.concat([i16(110), i16(90), i16(310), i16(290)]), 'fixture: explicit bounding box is wrong');
  same(comp.subarray(10, 18), Buffer.concat([u16(0x0103), u16(0), i16(10), i16(-10)]), 'fixture: component record changed');
  check(comp.readUInt16BE(18) === 2, 'fixture: composite program length is wrong');
  same(comp.subarray(20, 22), Buffer.from([0x4b, 0x00]), 'fixture: composite program changed');
}

/**
 * Prove the decoder, the subsetter and the encoder on the committed font. Resolves on success and throws with
 * a specific message on failure.
 *   deep  also round-trip the whole font through the encoder (slower; the standalone run uses it)
 * @example await selfTest();
 */
export async function selfTest({ deep = false } = {}) {
  checkComposite();

  // ── decode ────────────────────────────────────────────────────────────────────────────────────
  const { flavor, tables } = decodeWoff2(FONT_BYTES);
  check(flavor === 0x00010000, 'the font is not TrueType-flavoured');
  for (const tag of REQUIRED) check(tables.has(tag), `the decoded font has no ${tag} table`);
  const numGlyphs = tables.get('maxp').readUInt16BE(4);
  const offsets = locaOf(tables);
  check(offsets.length === numGlyphs + 1, `loca holds ${offsets.length} entries for ${numGlyphs} glyphs`);
  check(offsets[numGlyphs] === tables.get('glyf').length, 'loca does not end at the end of glyf');
  for (let gid = 0; gid < numGlyphs; gid++) check(offsets[gid] <= offsets[gid + 1], `loca offsets fall back at glyph ${gid}`);

  const cmap = readCmap4(tables.get('cmap'));
  const upm = tables.get('head').readUInt16BE(18);
  for (const ch of 'MOW0') {
    const gid = cmap.get(ch.codePointAt(0));
    check(gid !== undefined, `the font does not map "${ch}"`);
    const { shape, outline } = splitGlyph(glyphOf(tables, offsets, gid), `the glyph for "${ch}"`);
    const [xMin, yMin, xMax, yMax] = [2, 4, 6, 8].map((o) => shape.readInt16BE(o));
    check(xMax > xMin && yMax > yMin, `the glyph for "${ch}" has an empty bounding box`);
    check(xMin >= -upm && xMax <= upm && yMin >= -upm && yMax <= upm, `the glyph for "${ch}" is outside the em square`);
    check(outline.length > 0, `the glyph for "${ch}" has no outline data`);
  }

  // ── subset ────────────────────────────────────────────────────────────────────────────────────
  const codepoints = [...new Set(`${SAMPLE} 0123456789`)].map((c) => c.codePointAt(0)).sort((a, b) => a - b);
  const before = new Map([...tables].map(([tag, data]) => [tag, Buffer.from(data)]));
  const subset = subsetTables(tables, codepoints);
  for (const [tag, data] of before) same(tables.get(tag) ?? Buffer.alloc(0), data, `subsetTables() modified the ${tag} table it was given`);

  for (const tag of ['GSUB', 'GPOS', 'GDEF', 'FFTM']) check(!subset.has(tag), `the subset still carries ${tag}`);
  check(subset.get('post').length === 32 && subset.get('post').readUInt32BE(0) === 0x00030000, 'the subset post table is not version 3');
  check(subset.get('maxp').readUInt16BE(4) === numGlyphs, 'the subset renumbered the glyphs');

  const subsetCmap = readCmap4(subset.get('cmap'));
  const mapped = codepoints.filter((cp) => cmap.has(cp));
  check(mapped.length > 10 && mapped.length < codepoints.length, 'the sample should hold both mapped and unmapped code points');
  check(subsetCmap.size === mapped.length, `the subset cmap holds ${subsetCmap.size} of ${mapped.length} code points`);
  for (const cp of mapped) check(subsetCmap.get(cp) === cmap.get(cp), `code point U+${cp.toString(16)} moved to another glyph id`);

  const subsetOffsets = locaOf(subset);
  for (const cp of mapped) {
    const gid = cmap.get(cp);
    const where = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    const original = glyphOf(tables, offsets, gid), kept = glyphOf(subset, subsetOffsets, gid);
    if (original.length < 2 || original.readInt16BE(0) < 0) { // the space has no outline; composites keep their program
      same(trim(kept), trim(original), `the glyph for ${where} changed`);
      continue;
    }
    const before = splitGlyph(original, `the glyph for ${where}`), after = splitGlyph(kept, `the subset glyph for ${where}`);
    same(after.shape, before.shape, `the outline header of ${where} changed`);
    same(trim(after.outline), trim(before.outline), `the outline of ${where} changed`);
    same(after.program, before.program, `the TrueType program of ${where} changed`);
  }

  // The size-first variant keeps the outlines and drops only what grid-fits them.
  const lean = subsetTables(tables, codepoints, { hinting: false });
  for (const tag of ['fpgm', 'prep', 'cvt ']) check(!lean.has(tag), `{ hinting: false } still carries ${tag}`);
  const leanOffsets = locaOf(lean);
  const hintedCp = mapped.find((cp) => {
    const glyph = glyphOf(tables, offsets, cmap.get(cp));
    return glyph.length > 10 && glyph.readInt16BE(0) > 0 && splitGlyph(glyph, 'hinting probe').program.length > 0;
  });
  check(hintedCp !== undefined, 'the sample has no hinted glyph to test { hinting: false } with');
  const hinted = splitGlyph(glyphOf(tables, offsets, cmap.get(hintedCp)), 'the hinted glyph');
  const stripped = splitGlyph(glyphOf(lean, leanOffsets, cmap.get(hintedCp)), 'the lean glyph');
  check(stripped.program.length === 0, '{ hinting: false } kept a TrueType program');
  same(stripped.shape, hinted.shape, '{ hinting: false } changed an outline header');
  same(trim(stripped.outline), trim(hinted.outline), '{ hinting: false } changed an outline');
  const keptGids = new Set(mapped.map((cp) => cmap.get(cp)));
  const dropped = [...new Set(cmap.values())].filter((gid) => !keptGids.has(gid));
  check(dropped.length > 0 && dropped.every((gid) => subsetOffsets[gid] === subsetOffsets[gid + 1]), 'unused glyphs were not emptied');

  // ── encode ────────────────────────────────────────────────────────────────────────────────────
  const encoded = encodeWoff2(subset);
  check(encoded.length < FONT_BYTES.length, `the subset (${encoded.length} B) is not smaller than the font (${FONT_BYTES.length} B)`);
  // Both of these are what Chrome's sanitizer checks first; get them wrong and every image silently falls back
  // to a system font, which no amount of decoding on our side would reveal.
  check(encoded.length % 4 === 0, `the encoded file is ${encoded.length} B, which is not the 4-byte multiple WOFF2 §3 requires`);
  check(encoded.readUInt32BE(8) === encoded.length, 'the header length field does not match the encoded file');
  same(encodeWoff2(subset), encoded, 'two encodes of the same tables differ');
  const back = decodeWoff2(encoded).tables;
  check(back.size === subset.size, `the round trip returned ${back.size} of ${subset.size} tables`);
  for (const [tag, data] of subset) same(back.get(tag) ?? Buffer.alloc(0), data, `the ${tag} table changed in the WOFF2 round trip`);

  if (deep) {
    const whole = decodeWoff2(encodeWoff2(tables)).tables;
    check(whole.size === tables.size, `the full round trip returned ${whole.size} of ${tables.size} tables`);
    for (const [tag, data] of tables) same(whole.get(tag) ?? Buffer.alloc(0), data, `the ${tag} table changed in the full round trip`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const started = Date.now();
  await selfTest({ deep: true });
  console.log(`woff2 self-test: ok (${Date.now() - started} ms, deep)`);
}
