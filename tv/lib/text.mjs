// Monospace text layout for VCR OSD Mono (SPEC §3.2, §3.3, §3.4).
// Every character occupies one cell: width(str) = n·cell − ls, cell = ADV·size + ls.
// Text is always emitted start-anchored at a computed x, so letter-spacing never shifts right-aligned text.
// The layout guards (wrapStrict, fit, fitTitle, stackFit, assert*) throw with the offending string.
import { r2, GRID } from './tokens.mjs';
import { METRICS, DRAWN, drawGlyph, assertCoverage } from './glyphs.mjs';

/** Advance per em (1200 / 2048 = 0.5859375). */
export const ADV = METRICS.advance / METRICS.upm;
/** Cap height per em (1500 / 2048 ≈ 0.7324). */
export const CAP = METRICS.cap / METRICS.upm;

/** Number of characters (code points, not UTF-16 units). */
export const chars = (str) => [...String(str)].length;

/** Width of one cell in u. */
export const cell = (size, ls = 0) => ADV * size + ls;

/** Width of a string in u: n·cell − ls (0 for the empty string). */
export function measure(str, size, ls = 0) {
  const n = chars(str);
  return n ? n * cell(size, ls) - ls : 0;
}

/** Escape text content. */
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Escape an attribute value (double-quoted). */
export const attr = (s) => esc(s).replace(/"/g, '&quot;');
/**
 * The inverse of attr() (and of esc(), which never produces &quot;): "&amp;" is undone LAST, so "&amp;lt;"
 * comes back as the text "&lt;" and not as "<". The build's alt-text equality checks — the SVG aria-label in
 * build.mjs and the README <img alt> in lint.mjs — only mean something while this round-trips attr() exactly,
 * so both sides import this one function instead of keeping their own copy.
 */
export const unescapeAttr = (s) => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * One line of text as a <g> holding a <text> plus the drawn stand-ins for glyphs the font lacks.
 * No fill is set: wrap it with fx.g(…, color), fx.chroma(…) or fx.outlined(…).
 * `y` is the baseline; `anchor` places the whole string (drawn cells included) at x.
 * @example g(line('REC · CH 00', { x: 1128, y: 92, size: 24, ls: 5, anchor: 'end' }), COLOR.text)
 */
export function line(str, { x, y, size, ls = 0, anchor = 'start', cls = '' }) {
  const text = String(str);
  if (!(size > 0) || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error(`line("${text}"): x, y and size must be finite numbers`);
  if (!['start', 'middle', 'end'].includes(anchor)) throw new Error(`line("${text}"): unknown anchor "${anchor}"`);
  assertCoverage(text, `line("${text}")`);
  const width = measure(text, size, ls);
  const x0 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
  const step = cell(size, ls);
  let plain = '';
  let shapes = '';
  [...text].forEach((ch, i) => {
    if (DRAWN[ch]) {
      plain += ' ';
      shapes += drawGlyph(ch, x0 + i * step, y, size);
    } else {
      plain += ch;
    }
  });
  const lead = [...plain].length - [...plain.trimStart()].length;
  const body = plain.trim();
  const node = body
    ? `<text x="${r2(x0 + lead * step)}" y="${r2(y)}" font-size="${r2(size)}"${ls ? ` letter-spacing="${r2(ls)}"` : ''}>${esc(body)}</text>`
    : '';
  return `<g${cls ? ` class="${cls}"` : ''}>${node}${shapes}</g>`;
}

/** Greedy word wrap; a single word wider than maxW stays on its own line (wrapStrict reports it). */
export function wrap(str, size, maxW, ls = 0) {
  const lines = [];
  let current = '';
  for (const word of String(str).split(' ')) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measure(candidate, size, ls) <= maxW) current = candidate;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Word wrap that throws when the copy needs more than `maxLines` lines or a line is wider than maxW.
 * @example wrapStrict(file.oneLiner, 20, 520, 3, 0, 'file-01 one-liner')
 */
export function wrapStrict(str, size, maxW, maxLines, ls = 0, who = 'text') {
  const lines = wrap(str, size, maxW, ls);
  if (lines.length > maxLines || lines.some((l) => measure(l, size, ls) > maxW)) {
    throw new Error(`overflow in ${who}: "${str}" needs ${lines.length} line(s) at ${size}u in ${maxW}u (max ${maxLines})`);
  }
  return lines;
}

/** Largest even size ≤ max at which `n` cells fit in maxW (0 when nothing fits). */
const evenFit = (n, maxW, max) => Math.max(0, Math.min(max - (max % 2), Math.floor(maxW / (n * ADV) / 2) * 2));

/**
 * Largest even size in [min, max] whose wrap fits `maxLines` lines of maxW. Throws when even `min` does not fit.
 * @example fit('ANGELS FIGHT DEVILS WITH GRACE', 864, { min: 24, max: 52 }) → { size: 48, lines: [...] }
 */
export function fit(str, maxW, { min, max, maxLines = 1, ls = 0, who = 'text' }) {
  for (let size = max - (max % 2); size >= min; size -= 2) {
    const lines = wrap(str, size, maxW, ls);
    if (lines.length <= maxLines && lines.every((l) => measure(l, size, ls) <= maxW)) return { size, lines };
  }
  throw new Error(`overflow in ${who}: "${str}" does not fit ${maxLines} line(s) of ${maxW}u at ${min}u`);
}

/** Balanced split into two lines at a space (minimizes the longer line). Returns [str] for a single word. */
export function split2(str) {
  const words = String(str).split(' ');
  let best = [String(str)];
  let bestMax = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const longest = Math.max(chars(a), chars(b));
    if (longest < bestMax) { bestMax = longest; best = [a, b]; }
  }
  return best;
}

/**
 * Title fitting (letter-spacing 0, even sizes): one line at the largest size ≤ oneMax if that is ≥ oneMin,
 * otherwise a balanced two-line split at the largest size ≤ twoMax, which must be ≥ twoMin. Throws otherwise.
 * @example fitTitle('OBSIDIAN SECOND BRAIN', 520, { oneMin: 48, oneMax: 64, twoMin: 36, twoMax: 46 })
 *          → { size: 46, lines: ['OBSIDIAN', 'SECOND BRAIN'] }
 */
export function fitTitle(str, maxW, { oneMin, oneMax, twoMin, twoMax }) {
  const one = evenFit(chars(str), maxW, oneMax);
  if (one >= oneMin) return { size: one, lines: [String(str)] };
  const lines = split2(str);
  const two = lines.length === 2 ? evenFit(Math.max(...lines.map(chars)), maxW, twoMax) : 0;
  if (two >= twoMin) return { size: two, lines };
  throw new Error(`overflow in title "${str}": no size ≥ ${oneMin}u on one line or ≥ ${twoMin}u on two lines fits ${maxW}u`);
}

/**
 * OG stack truncation: as many " / " items as fit, then " / …". Throws when not even the first item fits.
 * @example stackFit('Python / FastAPI / Next.js / React / MapLibre GL', 520, 18, 0.5) → 'Python / FastAPI / … '
 */
export function stackFit(stack, maxW, size, ls = 0) {
  if (measure(stack, size, ls) <= maxW) return stack;
  const parts = String(stack).split(' / ');
  for (let k = parts.length - 1; k >= 1; k--) {
    const candidate = `${parts.slice(0, k).join(' / ')} / …`;
    if (measure(candidate, size, ls) <= maxW) return candidate;
  }
  throw new Error(`overflow in stack "${stack}": "${parts[0]} / …" is wider than ${maxW}u at ${size}u`);
}

/**
 * Width of `str`, or throw when it is wider than maxW.
 * @example assertWidth(file.oneLiner, 18, 0, 1094, 'guide one-liner 10')
 */
export function assertWidth(str, size, ls, maxW, who = 'text') {
  const w = measure(str, size, ls);
  if (w > maxW + 1e-9) throw new Error(`overflow in ${who}: "${str}" is ${r2(w)}u wide at ${size}u, limit ${maxW}u`);
  return w;
}

/**
 * Throw when two text runs on one line are closer than `min` u (SPEC §3.4: 32u). Pass the two strings when
 * you have them: every other guard here names the copy that has to shrink, and a bare number does not say
 * which of the two runs grew.
 * @example assertGap(72 + titleW, 1128 - issuersW, 'certificates title vs issuers', 48, { left: title, right: issuers })
 */
export function assertGap(aRight, bLeft, who = 'text runs', min = GRID.minGap, { left, right } = {}) {
  const gap = bLeft - aRight;
  if (gap >= min) return gap;
  const runs = left === undefined && right === undefined ? '' : ` between "${left ?? '?'}" and "${right ?? '?'}"`;
  throw new Error(`collision in ${who}${runs}: gap ${r2(gap)}u < ${min}u`);
}

/**
 * Throw when the next line's cap top is less than `min` u below the previous baseline (SPEC §3.4: 10u).
 * @example assertBelow(catY, catY + 33, 20, 'card category vs one-liner')
 */
export function assertBelow(prevBaseline, nextBaseline, nextSize, who = 'lines', min = GRID.minLead) {
  const lead = nextBaseline - CAP * nextSize - prevBaseline;
  if (lead < min) throw new Error(`collision in ${who}: ${r2(lead)}u between baseline and next cap top < ${min}u`);
}
