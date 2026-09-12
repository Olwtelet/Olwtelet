// Theme primitives (SPEC §3.6): pure string builders for text treatments, SMPTE pieces, textures and patterns.
// Builders that define <pattern>/<gradient> take the id as their first argument (ids must be unique per file,
// lint checks it); builders that reference one take its id as an option with the conventional default.
import { COLOR, CHROMA, r2 } from './tokens.mjs';
import { line, measure, cell, CAP } from './text.mjs';
import { rng } from './rng.mjs';

// ── text treatments ────────────────────────────────────────────────────────────────────────────
/**
 * Group with a fill (and optional class) around markup, usually a line().
 * @example g(line('STACK', { x: 72, y: 364, size: 24, ls: 3 }), COLOR.text)
 */
export const g = (inner, fill, cls = '') => `<g${cls ? ` class="${cls}"` : ''} fill="${fill}">${inner}</g>`;

/**
 * Colored segments laid out as one monospace line: segs = [[text, fill], …].
 * @example spans(72, 72, 36, 2, [['▮ ', COLOR.white], ['SIGNAL ARCHIVE', COLOR.white], [' · 10 FILES', COLOR.text]])
 */
export function spans(x, y, size, ls, segs) {
  let offset = 0;
  return segs.map(([text, fill]) => {
    const out = g(line(text, { x: x + offset * cell(size, ls), y, size, ls }), fill);
    offset += [...text].length;
    return out;
  }).join('');
}

/** Width of spans() segments. */
export const segWidth = (segs, size, ls = 0) => measure(segs.map(([text]) => text).join(''), size, ls);

/**
 * §3.6 chroma offsets for a text size: the nearest size in tokens.CHROMA (ties go to the larger size).
 * The SPEC §2.1 layout sheets name the exact pair per element; this is the default for anything else.
 * @example chromaFor(150) → { dx: 6, dy: 4 }
 */
export function chromaFor(size) {
  let best = CHROMA[0];
  for (const entry of CHROMA) if (Math.abs(entry[0] - size) < Math.abs(best[0] - size)) best = entry;
  return { dx: best[1], dy: best[2] };
}

/**
 * Chromatic aberration: cyan copy at (+dx, +dy), red copy at (−dx, −dy), white on top. The copies' inner groups
 * carry classes `cy{j}` / `rd{j}` for TWITCH / RETUNE / CHROMA-IN. `inner` must not set its own fill.
 * @example chroma(line('OLWTELET', { x: 66, y: 414, size: 150 }), { dx: 6, dy: 4, j: 'T' })
 */
export function chroma(inner, { dx, dy, op = 0.5, j = 'j' }) {
  return `<g fill="${COLOR.cyan}" opacity="${op}" transform="translate(${r2(dx)} ${r2(dy)})"><g class="cy${j}">${inner}</g></g>` +
    `<g fill="${COLOR.red}" opacity="${op}" transform="translate(${r2(-dx)} ${r2(-dy)})"><g class="rd${j}">${inner}</g></g>` +
    `<g fill="${COLOR.white}">${inner}</g>`;
}

/**
 * White label over a black stroked copy: mandatory for any label drawn over rainbow static.
 * Stroke width: 4 for text ≤ 26u, 5 for 30–34u, 6 for ≥ 36u.
 * @example outlined(line('VIEW SOURCE ↗', { x: 40, y: 344, size: 20, ls: 1 }), 4)
 */
export const outlined = (inner, sw = 4) =>
  `<g fill="#000" stroke="#000" stroke-width="${sw}" stroke-linejoin="round">${inner}</g><g fill="${COLOR.white}">${inner}</g>`;

/**
 * Blinking caret "_" at an explicit x (a left-anchored line of n characters ends at x + n·cell − ls).
 * @example caret({ x: 74 + chars(sub) * cell(22, 2) + 4, y: 118, size: 22 })
 */
export const caret = ({ x, y, size, cls = 'caret' }) => g(line('_', { x, y, size }), COLOR.white, cls);

/**
 * "● REC · CH 00"-style label right-aligned at xEnd; the dot (class `rec`) is drawn, the font lacks ●.
 * @example recLabel('REC · CH 01', 560, 58, 18, 3)
 */
export function recLabel(text, xEnd, y, size, ls = 0, fill = COLOR.text) {
  const w = measure(text, size, ls);
  return `<circle class="rec" cx="${r2(xEnd - w - size * 0.8)}" cy="${r2(y - size * 0.37)}" r="${r2(size * 0.36)}" fill="${COLOR.rec}"/>` +
    g(line(text, { x: xEnd - w, y, size, ls }), fill);
}

// ── rainbow static (the site's link hover) ────────────────────────────────────────────────────────
/** Speck tile laid over rainbow bars (dark smear specks + blue specks). */
export function rainbowNoise(id, seed) {
  const R = rng(seed);
  let dark = '', blue = '';
  for (let k = 0; k < 120; k++) {
    const x = Math.floor(R() * 90), y = Math.floor(R() * 40), w = 1 + Math.floor(R() * 4);
    if (R() < 0.6) dark += `M${x} ${y}h${w}v1h-${w}z`; else blue += `M${x} ${y}h${w}v1h-${w}z`;
  }
  return `<pattern id="${id}" width="90" height="40" patternUnits="userSpaceOnUse">` +
    `<path fill="${COLOR.rainbowSpeck[0]}" opacity=".9" d="${dark}"/><path fill="${COLOR.rainbowSpeck[1]}" opacity=".7" d="${blue}"/></pattern>`;
}

/**
 * Rainbow static block: six bars, a dark smear band and the speck tile `noise` (define it with rainbowNoise).
 * @example rainbow({ x: 40, y: 0, w: 520, h: 24, cls: 'tr' })
 */
export function rainbow({ x, y, w, h, cls = 'rb', noise = 'rn' }) {
  let bars = '', cx = x;
  COLOR.rainbow.forEach((fill, i) => {
    bars += `<rect x="${r2(cx)}" y="${r2(y)}" width="${r2(w * COLOR.rainbowShare[i] + 0.6)}" height="${r2(h)}" fill="${fill}"/>`;
    cx += w * COLOR.rainbowShare[i];
  });
  return `<g class="${cls}">${bars}` +
    `<rect x="${r2(x)}" y="${r2(y + h * 0.62)}" width="${r2(w)}" height="${r2(h * 0.18)}" fill="${COLOR.rainbowSmear}" opacity=".85"/>` +
    `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="url(#${noise})"/></g>`;
}

/**
 * Rainbow static sized to a label whose text starts at x0 with baseline `baseline` and width `width`,
 * vertically centered on the cap height. Height defaults to 1.6·size. Pair with outlined() on top.
 * @example focusRect(40, 344, 20, measure('VIEW SOURCE ↗', 20, 1), { padX: 9, h: 34 })
 */
export function focusRect(x0, baseline, size, width, { padX = 10, h = Math.round(size * 1.6), cls = 'rb', noise = 'rn' } = {}) {
  const cy = baseline - (CAP * size) / 2;
  return rainbow({ x: x0 - padX, y: cy - h / 2, w: width + 2 * padX, h, cls, noise });
}

// ── SMPTE pieces ─────────────────────────────────────────────────────────────────────────────────
/**
 * Equal-width vertical bars; neighbours overlap by .5u so no seam shows. With `cls`, bar i gets `cls cls{i}`.
 * @example bars(60, 552, 1080, 36) + `<rect x="60" y="552" width="1080" height="36" fill="url(#sn)"/>`
 */
export function bars(x, y, w, h, colors = COLOR.bars, cls = '') {
  const bw = w / colors.length;
  return colors.map((fill, i) => `<rect${cls ? ` class="${cls} ${cls}${i}"` : ''} x="${r2(x + i * bw)}" y="${r2(y)}" ` +
    `width="${r2(bw + (i < colors.length - 1 ? 0.5 : 0))}" height="${r2(h)}" fill="${fill}"/>`).join('');
}

/**
 * Mini SMPTE ECR 1-1978 card: bars 70%, castellation 10%, PLUGE (seven equal cells) 20%.
 * @example testCard(1002, 38, 126, 74)
 */
export const testCard = (x, y, w, h) =>
  bars(x, y, w, h * 0.7) + bars(x, y + h * 0.7, w, h * 0.1, COLOR.cast) + bars(x, y + h * 0.8, w, h * 0.2, COLOR.pluge);

/**
 * PLUGE row with the true ECR segment widths (bar width = w / 7), for full-size cards.
 * @example plugeRow(16, 184, 1168, 60)
 */
export function plugeRow(x, y, w, h) {
  const bw = w / 7;
  let cx = x, out = '';
  for (const [units, fill] of COLOR.plugeRow) {
    out += `<rect x="${r2(cx)}" y="${r2(y)}" width="${r2(units * bw + 0.4)}" height="${r2(h)}" fill="${fill}"/>`;
    cx += units * bw;
  }
  return out;
}

/** Speck tile that makes a bar strip look like the OG card's noisy bars (70% dark, 30% light specks). */
export function stripNoise(id, seed, { tw = 120, th = 48 } = {}) {
  const R = rng(seed);
  let dark = '', light = '';
  for (let k = 0; k < 90; k++) {
    const x = Math.floor(R() * tw), y = Math.floor(R() * th), w = 1 + Math.floor(R() * 3);
    if (R() < 0.7) dark += `M${x} ${y}h${w}v1h-${w}z`; else light += `M${x} ${y}h${w}v1h-${w}z`;
  }
  return `<pattern id="${id}" width="${tw}" height="${th}" patternUnits="userSpaceOnUse"><path fill="#000" opacity=".35" d="${dark}"/><path fill="#fff" opacity=".14" d="${light}"/></pattern>`;
}

/**
 * The site favicon (verbatim 64-unit geometry and colors) as a station bug at (x, y), scale s.
 * The bars sit in <g class="bugbars"> for the hero twitch.
 * @example favicon(968, 286, 2.5)
 */
export function favicon(x, y, s, cls = 'bug') {
  const screen = COLOR.fav.map((fill, i) => `<rect x="${12 + i * 8}" y="24" width="8.4" height="28" fill="${fill}"/>`).join('');
  let scan = '';
  for (let yy = 26; yy < 52; yy += 4) scan += `<rect x="12" y="${yy}" width="40" height="1.5"/>`;
  return `<g class="${cls}" transform="translate(${r2(x)} ${r2(y)}) scale(${r2(s)})"><g class="bugbars">${screen}</g><g fill="#000" opacity=".25">${scan}</g>` +
    `<g stroke="${COLOR.favStroke}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 L32 18 L46 4"/><rect x="6" y="18" width="52" height="40" rx="3"/></g></g>`;
}

// ── textures, patterns and gradients ─────────────────────────────────────────────────────────────
/**
 * Channel-change static tile: short colored dashes on a dark violet base (low luminance).
 * @example burstPattern('bu', { size: 160, count: 200, seed: seedOf('slate-archive.svg#burst') })
 */
export function burstPattern(id, { size = 220, count = 360, seed = 31 } = {}) {
  const R = rng(seed);
  const { base, hues } = COLOR.burst;
  const paths = Object.fromEntries(hues.map((hue) => [hue, '']));
  for (let i = 0; i < count; i++) {
    const x = Math.floor(R() * size), y = Math.floor(R() * size);
    const w = 2 + Math.floor(R() * R() * 26), h = 1 + Math.floor(R() * 3);
    const hue = hues[Math.min(hues.length - 1, Math.floor(R() * R() * hues.length * 1.4))];
    paths[hue] += `M${x} ${y}h${w}v${h}h-${w}z`;
  }
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"><rect width="${size}" height="${size}" fill="${base}"/>` +
    hues.filter((hue) => paths[hue]).map((hue) => `<path d="${paths[hue]}" fill="${hue}"/>`).join('') + '</pattern>';
}

/** Grain tile: seeded specks grouped by tint, plus a few VHS streaks. */
export function grainPattern(id, seed, { tile = 180, count = 190, streaks = 7 } = {}) {
  const R = rng(seed);
  const byTint = new Map();
  const add = (tint, d) => byTint.set(tint, (byTint.get(tint) ?? '') + d);
  for (let k = 0; k < count; k++) {
    const tint = COLOR.staticTints[Math.floor(R() * COLOR.staticTints.length)];
    const x = Math.floor(R() * tile), y = Math.floor(R() * tile);
    const w = 1 + Math.floor(R() * 3), h = 1 + Math.floor(R() * 2);
    add(tint, `M${x} ${y}h${w}v${h}h-${w}z`);
  }
  for (let k = 0; k < streaks; k++) {
    const tint = COLOR.staticTints[1 + Math.floor(R() * (COLOR.staticTints.length - 1))];
    const x = Math.floor(R() * tile), y = Math.floor(R() * tile), w = 14 + Math.floor(R() * 46);
    add(tint, `M${x} ${y}h${w}v1h-${w}z`);
  }
  return `<pattern id="${id}" width="${tile}" height="${tile}" patternUnits="userSpaceOnUse">` +
    [...byTint].map(([tint, d]) => `<path fill="${tint}" d="${d}"/>`).join('') + '</pattern>';
}

/** Horizontal scanline tile: a white line `lineH` tall every `period` u at opacity `op`. */
export const scanPattern = (id, period, lineH, op) =>
  `<pattern id="${id}" width="8" height="${period}" patternUnits="userSpaceOnUse"><rect width="8" height="${lineH}" fill="#fff" opacity="${op}"/></pattern>`;

/** Rolling band gradient (site --crt:before). */
export const bandGradient = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLOR.band.color}" stop-opacity="0"/>` +
  `<stop offset=".5" stop-color="${COLOR.band.color}" stop-opacity="${COLOR.band.peak}"/><stop offset="1" stop-color="${COLOR.band.color}" stop-opacity="0"/></linearGradient>`;

/** Vignette gradient (site --vignette). */
export const vignetteGradient = (id) =>
  `<radialGradient id="${id}" cx=".5" cy=".5" r="${COLOR.vignette.r}"><stop offset="${COLOR.vignette.clear}" stop-color="#000" stop-opacity="0"/>` +
  `<stop offset="1" stop-color="#000" stop-opacity="${COLOR.vignette.alpha}"/></radialGradient>`;

/** Power-off dot glow (sign-off): a white core fading to transparent. */
export const dotGradient = (id) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;

/** Dotted-rule tiles: DOTS (id "dots", horizontal rules) and DOTS_V (id "dotsv", vertical ticks). Add to defs. */
export const DOTS = `<pattern id="dots" width="8" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${COLOR.dot}"/></pattern>`;
export const DOTS_V = `<pattern id="dotsv" width="2" height="8" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${COLOR.dotV}"/></pattern>`;

/**
 * Dotted horizontal rule (needs DOTS in defs).
 * @example rule(72, 90, 1056)
 */
export const rule = (x, y, w) => `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="2" fill="url(#dots)"/>`;

/** Dotted vertical tick (needs DOTS_V in defs). */
export const tick = (x, y, h) => `<rect x="${r2(x)}" y="${r2(y)}" width="2" height="${r2(h)}" fill="url(#dotsv)"/>`;
