// Design tokens of the CHANNEL 00 theme (SPEC §3.1 colors, §3.2 type scale and tunings, §3.4 grid and bezels,
// §2 byte budgets) plus the two tiny helpers every module shares. Leaf module: it imports nothing.
// Sources: the site CSS (olwtelet.vercel.app), pixel samples of its OG cards, and SMPTE ECR 1-1978.

/** Round to 2 decimals: the only number format allowed in generated SVG (SPEC §3.9). */
export const r2 = (v) => Math.round(v * 100) / 100;

/** Recursively freeze plain objects and arrays (content and tokens are read-only). */
export function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

// ── §3.1 colors ─────────────────────────────────────────────────────────────────────────────
export const COLOR = deepFreeze({
  glass: '#060606', // OG glass fill (the site body itself is #000)
  bezel: '#354444', // OG outer bezel stroke
  bezelInner: '#1b2525', // inner bezel ring
  text: '#a0a0a0', // site --text-primary (gray body text)
  white: '#ffffff', // site --text-secondary (titles, labels)
  rule: '#28272a', // site scrollbar and solid rules
  dot: '#4a4a4a', // dotted horizontal rules: a 2×2 dot every 8u
  dotV: '#3a3a3a', // dotted vertical ticks
  cyan: '#02b7b6', // site --glitchy-blue, chroma copy
  red: '#b70202', // site --glitchy-red, chroma copy
  rec: '#980000', // OG REC dot
  favStroke: '#f1f2f6', // favicon outline
  fav: ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0'], // favicon screen bars
  // OG-muted SMPTE bars, used for every bar strip in the README
  bars: ['#727070', '#939302', '#04a3a3', '#01a502', '#a402a4', '#950203', '#01016f'],
  // SMPTE ECR 1-1978 75% bars, reference only (too bright next to the OG palette)
  bars75: ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'],
  // castellation row under the bars (ECR order, OG-muted)
  cast: ['#01016f', '#131313', '#a402a4', '#131313', '#04a3a3', '#131313', '#727070'],
  // PLUGE row as seven equal cells (mini test card): -I, white (dimmed for flash safety), +Q, black, -4%, +4%, black
  pluge: ['#00214c', '#c8c8c8', '#32006a', '#131313', '#090909', '#1d1d1d', '#131313'],
  // PLUGE row with true ECR widths, in bar units (7 bars wide in total): used by the full sign-off card
  plugeRow: [[1.25, '#00214c'], [1.25, '#c8c8c8'], [1.25, '#32006a'], [1.25, '#131313'],
    [1 / 3, '#090909'], [1 / 3, '#131313'], [1 / 3, '#1d1d1d'], [1, '#131313']],
  // the site's link-hover "rainbow static" texture: bar colors, their width shares, the smear band and specks
  rainbow: ['#98b858', '#00a0e8', '#28a030', '#e030b0', '#f00800', '#1828c8'],
  rainbowShare: [0.22, 0.17, 0.15, 0.18, 0.18, 0.1],
  rainbowSmear: '#304028',
  rainbowSpeck: ['#304028', '#1828c8'],
  // grain specks (the site's violet/blue effect-static texture)
  staticTints: ['#ffffff', '#e030b0', '#1828c8', '#00a0e8', '#b070ff'],
  // channel-change static: dark violet base keeps the luminance low
  burst: { base: '#0c0616', hues: ['#c000c0', '#0000c0', '#6a2cc0', '#00c0c0', '#ffffff', '#c00000'] },
  band: { color: '#fffafa', peak: 0.15 }, // site --crt:before rolling band (#fffafa26)
  vignette: { r: 0.75, clear: 0.6, alpha: 0.8 }, // site --vignette radial gradient
});

/** Every chromatic color the theme allows. Grays (r = g = b) are always allowed; any other hue is a lint error. */
export const PALETTE = (() => {
  const set = new Set();
  const walk = (v) => {
    if (typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v)) set.add(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(COLOR);
  for (const c of [...set]) if (c.slice(1, 3) === c.slice(3, 5) && c.slice(3, 5) === c.slice(5, 7)) set.delete(c);
  return Object.freeze(set);
})();

// ── §3.2 type scale, tunings and minimums, keyed by asset width class ─────────────────────────
// `d` = desktop composition sizes (u), `m` = phone composition sizes (u); a pair is an inclusive range.
// `tuning` = the image width (CSS px) at or below which the phone composition shows.
//
// Where the breakpoints come from. A unit renders at `size · width / viewBox`, so the desktop composition's
// smallest run (18u) is 12.5 px at its design width of 832 px and shrinks with the column. The floor it may
// not fall under is the phone composition's own smallest run at ITS design width — 34u at 356 px = 10.09 px,
// the smallest type this theme ever shows on purpose. 18u reaches 10.09 px at 673 px, so a full-width image
// narrower than that must switch: below the breakpoint the phone composition is the LARGER type, not the
// smaller one. 672 px is that line. The 49% cards and the 24% keys then take 49% and 24% of it, so every
// image on a README row changes composition at the same browser width instead of one at a time.
export const TYPE = deepFreeze({
  1200: {
    d: { heroTitle: 150, slateTitle: 36, name: 50, row: 30, label: [20, 26], body: [18, 22] },
    m: { title: [44, 180], line: [34, 40] },
    min: { d: 18, m: 34 },
    tuning: 672,
    renders: { d: 832, m: 356 },
  },
  600: {
    d: { title: [36, 64], body: 20, meta: 18 },
    m: { title: [44, 104], meta: [34, 36] },
    min: { d: 18, m: 34 },
    tuning: 329, // 49% of 672
    renders: { d: 408, m: 172 },
  },
  300: {
    d: { label: 26 },
    m: { label: 44 },
    min: { d: 26, m: 44 },
    tuning: 161, // 24% of 672
    renders: { d: 200, m: 85 },
  },
});

/** Width class (1200 | 600 | 300) of a viewBox width: full-width screens, 49% cards, 24% keys. */
export const typeClass = (W) => (W >= 900 ? 1200 : W >= 450 ? 600 : 300);

// ── §3.2 scanlines: [period, line height] in u; desktop opacity .045, phone .04 ─────────────────
export const SCAN = deepFreeze({
  d: { period: 6, line: 2, op: 0.045 },
  m: { period: 14, line: 5, op: 0.04 },
  heroPhone: [16, 6],
  buttonPhone: [12, 4],
});

// ── §3.4 grid, bezels and per-asset effect sizes ────────────────────────────────────────────
export const GRID = deepFreeze({
  unit: 2,
  inset: { wide: 72, deck: 56, guide: 40, card: 40 }, // content inset from the image edge
  minGap: 32, // horizontal gap between two text runs on one line
  minLead: 10, // vertical gap between a baseline and the next line's cap top
});

/** Bezel presets: outer rounded body (rx, stroke width) and the glass inset. */
export const BEZEL = deepFreeze({
  hero: { rx: 30, stroke: 4, inset: 17 },
  screen: { rx: 22, stroke: 3, inset: 12 }, // 1200-wide screens (ON AIR, signal log)
  slate: { rx: 18, stroke: 3, inset: 12 },
  guide: { rx: 22, stroke: 3, inset: 16 },
  signOff: { rx: 24, stroke: 3, inset: 16 },
  deck: { rx: 20, stroke: 3, inset: 12 },
  card: { rx: 20, stroke: 3, inset: 12 },
  button: { rx: 14, stroke: 2.5, inset: 8 },
});

/** Height (u) of the rolling CRT band per asset kind. */
export const BAND_H = deepFreeze({ hero: 90, screen: 70, card: 70, guide: 70, slate: 50, button: 34, deck: 60, signOff: 60 });

/** Resting opacity of the grain layer. */
export const GRAIN = deepFreeze({ hero: 0.12, default: 0.1, button: 0.08 });

/** §3.6 chroma offsets [size, dx, dy] by text size; layout sheets in SPEC §2.1 name the exact pair per element. */
export const CHROMA = deepFreeze([
  [180, 8, 5], [150, 6, 4], [104, 5, 3], [64, 3, 2], [60, 4, 3], [56, 3, 2],
  [50, 3, 2], [48, 3, 2], [46, 3, 2], [40, 3, 2], [36, 2, 1.5], [32, 2, 1.5],
]);

// ── §2 byte budgets (bytes, 1 KB = 1000 B): full font embed → after per-asset subsetting ────────
// Both columns are the largest file the family actually produces plus ~15% headroom, rounded up to 1000 B:
// a budget is a tripwire for a regression, so it has to be reachable — a budget nothing can meet is a
// warning everybody learns to skip. The subset column is measured with the default lean glyf
// (font.mjs DEFAULT_HINTING = false); `--hinting on` costs 3-5 KB a file and can cross it.
export const HARD_CAP = 150_000;
export const BUDGET = deepFreeze([
  [/^channel-00\.svg$/, 50_000, 30_000],
  [/^btn-[a-z]+\.svg$/, 34_000, 13_000],
  [/^on-air\.svg$/, 42_000, 20_000],
  [/^slate-archive\.svg$/, 40_000, 19_000],
  [/^file-\d\d-[a-z0-9-]+\.svg$/, 42_000, 24_000],
  [/^guide-websites\.svg$/, 58_000, 40_000],
  [/^slate-certificates\.svg$/, 36_000, 15_000],
  [/^now-playing\.svg$/, 44_000, 23_000],
  [/^signal-log\.svg$/, 48_000, 26_000],
  [/^sign-off\.svg$/, 36_000, 14_000],
]);

/** SPEC §2 budget of a production file: { full, subset } in bytes, or null for files the spec does not list. */
export function budgetFor(file) {
  const hit = BUDGET.find(([re]) => re.test(file));
  return hit ? { full: hit[1], subset: hit[2] } : null;
}

/**
 * §2 page acceptance: every image the README loads, the daily signal log included. The per-file budgets above
 * do not add up to this on purpose (each carries its own headroom) — this is the number the SPEC promises.
 */
export const PAGE_BUDGET = deepFreeze({ full: 620_000, subset: 330_000 });

/**
 * What the committed set in assets/tv may weigh: the page budget minus the signal log, which the daily job
 * publishes to the `output` branch with the full font embed whatever mode this build runs in.
 * @example pageBudget('subset') → 282000
 */
export const pageBudget = (font) => PAGE_BUDGET[font] - budgetFor('signal-log.svg').full;
