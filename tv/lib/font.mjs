// VCR OSD Mono embedding (SPEC §4.4). Images shown through <img> cannot load external fonts, so every SVG
// carries the font as a base64 data URI. Two modes:
//   full    the committed woff2 as-is (always available)
//   subset  only the code points one SVG uses, produced by tv/lib/woff2.mjs (WP6) after its self-test passes
// Subset mode has one lever: `hinting` keeps each glyph's TrueType program and the fpgm/prep/cvt tables it
// runs against. Those programs are ~70% of this font's glyf, so dropping them saves ≈16% of the page weight
// and changes only how Chrome grid-fits the same outlines (advance widths are identical, so no layout moves).
// The mode is chosen once per process with selectFontMode(); svgDoc() then calls fontFace() for each file.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const FONT_FAMILY = 'VCR';
export const FONT_PATH = fileURLToPath(new URL('../fonts/VCROSDMono.woff2', import.meta.url));
export const FONT_BYTES = fs.readFileSync(FONT_PATH);

const FULL_BASE64 = FONT_BYTES.toString('base64');
const SUBSETTER = new URL('./woff2.mjs', import.meta.url);
const SELF_TEST = new URL('./woff2.test.mjs', import.meta.url);

/**
 * Default for the `hinting` lever of subset mode. Off: the committed set is 267 KB instead of 316 KB
 * (94 KB instead of 134 KB gzipped, which is what GitHub actually serves; 1 KB = 1000 B, as in
 * tokens.mjs BUDGET), which is what brings the page inside the SPEC §2 budget — `--hinting on` puts
 * thirteen of the fifteen files, and the page, over it.
 *
 * The cost is grid fitting, nothing else: the two builds are byte-identical outside the embedded font
 * payload, so every coordinate, line break and advance is the same and no run changes width. Rendered
 * inside an <img> at the width the README gives each image and diffed pixel by pixel, the eleven images
 * that reproduce frame-to-frame differ on 0.5–5.5% of their pixels (the four that carry ambient grain
 * never settle, so their diff is noise, not hinting). Side by side the two renders are indistinguishable.
 * `--hinting on` restores the programs.
 */
export const DEFAULT_HINTING = false;

let activeMode = 'full';
let activeHinting = DEFAULT_HINTING;
let subsetter = null; // { decodeWoff2, subsetTables, encodeWoff2 } once subsetting is enabled
let decoded = null; // decodeWoff2(FONT_BYTES), computed on first use

/** Import woff2.mjs and run woff2.test.mjs's selfTest(). Resolves { ok, api } or { ok: false, reason }. */
async function loadSubsetter() {
  if (!fs.existsSync(SUBSETTER)) return { ok: false, reason: 'tv/lib/woff2.mjs is not present' };
  if (!fs.existsSync(SELF_TEST)) return { ok: false, reason: 'tv/lib/woff2.test.mjs is not present' };
  try {
    const api = await import(SUBSETTER.href);
    const missing = ['decodeWoff2', 'subsetTables', 'encodeWoff2'].filter((fn) => typeof api[fn] !== 'function');
    if (missing.length) return { ok: false, reason: `tv/lib/woff2.mjs does not export ${missing.join(', ')}` };
    const { selfTest } = await import(SELF_TEST.href);
    if (typeof selfTest !== 'function') return { ok: false, reason: 'tv/lib/woff2.test.mjs does not export selfTest()' };
    await selfTest();
    return { ok: true, api };
  } catch (err) {
    return { ok: false, reason: `woff2 subsetter failed its self-test: ${err.message}` };
  }
}

/**
 * Choose the embedding mode for this process.
 *   'full'     always full
 *   'subset'   subset, or throw when the subsetter is missing or fails its self-test
 *   undefined  subset when available, otherwise full (the reason is returned as `note`)
 * `hinting` (subset mode only) keeps the TrueType programs; false is smaller, see DEFAULT_HINTING.
 * @example const { mode, hinting, note } = await selectFontMode(args.font, { hinting: false });
 */
export async function selectFontMode(requested, { hinting = DEFAULT_HINTING } = {}) {
  if (requested !== undefined && requested !== 'full' && requested !== 'subset') {
    throw new Error(`font mode must be "full" or "subset", got "${requested}"`);
  }
  if (typeof hinting !== 'boolean') throw new Error(`hinting must be true or false, got "${hinting}"`);
  activeHinting = hinting;
  const done = (mode, note = '') => ({ mode: (activeMode = mode), hinting: activeHinting, note });
  if (requested === 'full') return done('full');
  const probe = await loadSubsetter();
  if (probe.ok) {
    subsetter = probe.api;
    return done('subset');
  }
  if (requested === 'subset') throw new Error(`--font subset is unavailable: ${probe.reason}`);
  return done('full', probe.reason);
}

/** The embedding mode fontFace() uses when none is passed ('full' until selectFontMode() says otherwise). */
export const fontMode = () => activeMode;

/** The hinting lever fontFace() uses when none is passed (subset mode only). */
export const fontHinting = () => activeHinting;

/**
 * The @font-face rule for one SVG. In subset mode, `text` is every string the SVG renders; the space and the
 * digits are always kept so a later edit of a number never falls back to a system font.
 * `font-display:fallback` is the load guard: an embedded face is normally ready within the 100 ms block period,
 * but when it is not the browser paints the `monospace` fallback declared on the root instead of painting
 * nothing at all — without it a slow frame shows an image with no text (SPEC §9 risk 2).
 * @example fontFace({ text: 'SIGNAL FILE 01' })
 */
export function fontFace({ mode = activeMode, text = '', hinting = activeHinting } = {}) {
  let base64 = FULL_BASE64;
  if (mode === 'subset') {
    if (!subsetter) throw new Error('fontFace: subset mode needs a successful selectFontMode("subset") first');
    const codepoints = [...new Set([...`${text} 0123456789`].map((ch) => ch.codePointAt(0)))].sort((a, b) => a - b);
    decoded ??= subsetter.decodeWoff2(FONT_BYTES);
    base64 = Buffer.from(subsetter.encodeWoff2(subsetter.subsetTables(decoded.tables, codepoints, { hinting }))).toString('base64');
  } else if (mode !== 'full') {
    throw new Error(`fontFace: unknown mode "${mode}"`);
  }
  return `@font-face{font-family:${FONT_FAMILY};src:url(data:font/woff2;base64,${base64}) format("woff2");font-display:fallback}`;
}
