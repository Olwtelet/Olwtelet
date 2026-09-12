// The remote (SPEC §2 btn-* row, §2.1 btn-* sheet): four keys under the hero, each shown at 24% of the column.
//
// A key is the same CRT screen as every other asset, shrunk to a button: bezel, scanlines, grain, vignette,
// rolling band and one outlined label. Its only motion is the site's own link hover — rainbow static grows
// behind the label in three steps, holds, and collapses again — fired left to right once the hero has settled,
// so the row reads as a ripple across the remote instead of four keys blinking at once. That only holds while
// the step between keys is longer than the time one key stays lit: see RIPPLE and assertRipple below.
import { BAND_H, GRAIN, SCAN, TYPE } from '../lib/tokens.mjs';
import { line, assertWidth } from '../lib/text.mjs';
import { focusRect, outlined, rainbowNoise } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { ambientB, focus, focusBase } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

export const family = 'buttons';

const W = 300, H = 84;
/** Glass width (tokens.BEZEL.button, inset 8): what a label plus its focus padding has to fit into. */
const GW = W - 2 * 8;
/** Label tunings (SPEC §2.1 btn-*): size, letter-spacing, baseline, focus padding and outline stroke. */
const TUNE = {
  d: { size: 26, ls: 3, y: 52, padX: 14, h: 42, stroke: 4 },
  m: { size: 44, ls: 1, y: 58, padX: 8, h: 56, stroke: 6 },
};
/**
 * FOCUS ripple (SPEC §2): one 12 s loop per key, starting once the hero has settled. A key stays lit for
 * grow + hold + collapse = 1.76 s, so the step between two keys has to be LONGER than that or the row lights up
 * as a chord instead of a ripple; `assertRipple` below is the guard. 2.6 + 3 × 2.2 = 9.2 s puts the last key
 * out at 10.96 s and leaves 3.64 s of dark remote before the next pass (ON AIR's own FOCUS lives in that gap).
 */
const RIPPLE = { period: 12, grow: 0.2, hold: 1.4, collapse: 0.16, first: 2.6, step: 2.2 };

/** A URL as a person would read it aloud: "olwtelet.vercel.app/en/resume", no scheme, no trailing slash. */
const host = (url) => `${new URL(url).host}${new URL(url).pathname.replace(/\/$/, '')}`;

/**
 * The four exits, in remote order. Labels are the plain words of SPEC §1 (no idioms, no icons) and every link
 * and alt is derived from tv/content.mjs, so a changed address can never leave stale text on a key.
 */
const KEYS = [
  { slug: 'portfolio', label: 'PORTFOLIO', href: (C) => C.links.home, alt: (C) => `Portfolio: ${new URL(C.site).host}` },
  // Like its neighbours, this alt names where the key goes: "Resume" alone told a screen-reader user the label
  // it can already see and nothing about the destination.
  { slug: 'resume', label: 'RESUME', href: (C) => C.links.resume, alt: (C) => `Resume: ${host(C.links.resume)}` },
  { slug: 'email', label: 'EMAIL', href: (C) => C.links.email, alt: (C) => `Email: ${C.links.email.replace(/^mailto:/, '')}` },
  { slug: 'linkedin', label: 'LINKEDIN', href: (C) => C.links.linkedin, alt: (C) => `LinkedIn: ${new URL(C.links.linkedin).pathname.replace(/^\/|\/$/g, '')}` },
];

/** Seconds one key stays lit. */
const LIT = RIPPLE.grow + RIPPLE.hold + RIPPLE.collapse;

/** The ripple only reads as a ripple while the keys light one at a time, inside one period. */
function assertRipple() {
  const last = RIPPLE.first + RIPPLE.step * (KEYS.length - 1) + LIT;
  if (RIPPLE.step <= LIT) {
    throw new Error(`btn-*: the ripple step (${RIPPLE.step}s) must exceed the lit window (${LIT.toFixed(2)}s), or two keys light together`);
  }
  if (last > RIPPLE.period) {
    throw new Error(`btn-*: the ripple ends at ${last.toFixed(2)}s, past its ${RIPPLE.period}s period`);
  }
}

/** One key. `index` is its place in the remote: it sets the band phase and the focus delay. */
function key(C, { slug, label, href, alt }, index) {
  const file = `btn-${slug}.svg`;
  const t = tv({
    bezel: 'button', W, H, bandH: BAND_H.button,
    seed: seedOf(`${file}#grain`), grain: GRAIN.button, scanPhone: SCAN.buttonPhone,
  });
  // the label is centred on the key; the build fails if one ever outgrows the glass it sits on
  const face = ({ size, ls, y, padX, h, stroke }) => {
    const width = assertWidth(label, size, ls, GW - 2 * padX, `${file}: "${label}" vs the glass`);
    return focusRect(W / 2 - width / 2, y, size, width, { padX, h }) +
      outlined(line(label, { x: W / 2, y, size, ls, anchor: 'middle' }), stroke);
  };
  const text = alt(C);
  const svg = svgDoc({
    W, H, label: text,
    css: tuning(TYPE[300].tuning) + focusBase(),
    motion: ambientB({ H, bandH: BAND_H.button, bandDelay: -1.3 * index }) +
      focus({
        period: RIPPLE.period, grow: RIPPLE.grow, hold: RIPPLE.hold, collapse: RIPPLE.collapse,
        delay: RIPPLE.first + RIPPLE.step * index,
      }),
    defs: t.defs + rainbowNoise('rn', seedOf(`${file}#rainbow`)),
    body: t.compose(`<g class="d">${face(TUNE.d)}</g><g class="m">${face(TUNE.m)}</g>`),
  });
  return { file, svg, alt: text, href: href(C), region: 'remote' };
}

export function build(C) {
  assertRipple();
  return KEYS.map((spec, index) => key(C, spec, index));
}
