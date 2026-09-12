// Section slates (assets/tv/slate-archive.svg, assets/tv/slate-certificates.svg): the two 1200×142 title cards
// that open the SIGNAL ARCHIVE and CERTIFICATES sections. Layout sheet: SPEC §2.1 "slate-archive /
// slate-certificates". Motion (tier B, one event per cycle, staggered against each other): §3.7 STAND-BY on the
// archive slate (18 s) and RETUNE, slate variant, on the certificates slate (14 s).
import { COLOR, BAND_H, TYPE, r2 } from '../lib/tokens.mjs';
import { CAP, line, measure, chars, cell, assertGap, assertBelow, assertWidth } from '../lib/text.mjs';
import { g, spans, segWidth, caret, bars, testCard, rainbow, rainbowNoise, burstPattern, stripNoise } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { ambientB, standBy, retune, hidden } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';
import { count, pad2 } from '../content.mjs';

export const family = 'slates';

// 142u, not the prototype's 150: a slate is two rows of text and the sheet left 8u of empty glass over them
// that neither tuning used. Across the two slates that is 11 px of the page's desktop height budget
// (SPEC §1.1), spent on the six website links the README gained under the programme guide. Every baseline
// below is the §2.1 sheet lifted by the same 8u, so both tunings keep the clearance they had.
const W = 1200, H = 142;
/** Content inset, the right edge of right-aligned runs, and the caption inset (SPEC §2.1: 74u, 2u inside L). */
const L = 72, R = 1128, CAP_X = 74;
/** Baselines: the title and the caption, desktop then phone (SPEC §2.1 minus 8u). */
const Y = { title: 64, caption: 110, titleM: 76, rowM: 120 };
/** STAND-BY loop (SPEC §3.7); the event is pushed half a cycle so it never lands on the first painted frame. */
const STAND_BY_PERIOD = 18;

/** A slate screen: both slates share the bezel, the band height and the effect stack. */
const slateScreen = (file) => tv({ bezel: 'slate', W, H, bandH: BAND_H.slate, seed: seedOf(`${file}#grain`) });

/**
 * RETUNE tear geometry, same policy as the signal-file cards (tv/assets/cards.mjs): an opaque rainbow band may
 * never land on a word, so its stops are computed from the rows this slate leaves empty in BOTH tunings.
 * A slate this short only affords two such rows, so the three steps wrap — high, low, high.
 */
const TEAR = { min: 14, pad: 4, hMin: 10, hMax: 16 };

/** Vertical ink extent of a text run: cap top → baseline. */
const inkBand = (baseline, size) => [baseline - CAP * size, baseline];

/** The rows of `top`…`bottom` that no ink occupies, given unsorted, overlapping [top, bottom] extents. */
function freeRows(ink, top, bottom) {
  const rows = [];
  let y = top;
  for (const [a, b] of [...ink].sort((p, q) => p[0] - q[0])) {
    if (a > y) rows.push([y, Math.min(a, bottom)]);
    y = Math.max(y, b);
    if (y >= bottom) break;
  }
  if (bottom > y) rows.push([y, bottom]);
  return rows.filter(([a, b]) => b > a);
}

/** The rows the tear jumps between and how tall it is; the build fails when fewer than two rows are free. */
function tearStops(ink, top, bottom, who) {
  const rows = freeRows(ink, top, bottom).filter(([a, b]) => b - a >= TEAR.min);
  if (rows.length < 2) {
    throw new Error(`${who}: the RETUNE tear needs text-free rows of ${TEAR.min}u inside the glass, ` +
      `this layout leaves ${rows.length} — shorten a line or move a baseline`);
  }
  const n = rows.length;
  const pick = [...new Set([0, Math.round((n - 1) / 2), n - 1])].map((k) => rows[k]);
  const h = Math.min(TEAR.hMax, Math.max(TEAR.hMin, Math.min(...pick.map(([a, b]) => b - a)) - TEAR.pad));
  const centre = ([a, b]) => r2((a + b - h) / 2);
  return { h, tearY: [1, 2, 0].map((k) => centre(pick[k % pick.length])) };
}

/** Title run "▮ NAME · NN FILES": the marker and the name in white, the tally in gray. */
const titleSegs = (name, files) => [['▮ ', COLOR.white], [name, COLOR.white], [` · ${pad2(files)} FILES`, COLOR.text]];

/**
 * Caption row: white text with the blinking caret 4u after its last cell (SPEC §2.1). The guard measures the
 * caption plus one caret cell, so a longer line fails the build instead of running under the bezel.
 */
function caption(text, { y, size, ls, who }) {
  assertWidth(`${text}_`, size, ls, R - CAP_X - 4, `${who} caption`);
  return g(line(text, { x: CAP_X, y, size, ls }), COLOR.white) +
    caret({ x: CAP_X + chars(text) * cell(size, ls) + 4, y, size });
}

/**
 * SIGNAL ARCHIVE. Desktop: title, the typed OPEN SOURCE caption and a mini ECR test card in the right margin.
 * Phone: the same two rows, larger, without the card. Every 18 s the picture drops to PLEASE STAND BY bars.
 */
function archive(C) {
  const file = 'slate-archive.svg';
  const t = slateScreen(file);
  const title = titleSegs('SIGNAL ARCHIVE', count.files(C));
  const sub = `▸ OPEN SOURCE · ${pad2(count.oss(C))} FILES`;

  assertGap(L + segWidth(title, 36, 2), 1002, `${file}: title vs test card`);
  assertBelow(Y.title, Y.caption, 22, `${file}: title vs caption`);
  // the mini card is a picture on the same tube, so its bars and castellation carry the strip noise every
  // other bar surface in the build (and the OG itself) carries — without it it reads as a pasted swatch
  const desktop = spans(L, Y.title, 36, 2, title) + caption(sub, { y: Y.caption, size: 22, ls: 2, who: file }) +
    testCard(1002, 32, 126, 74) + '<rect x="1002" y="32" width="126" height="59.2" fill="url(#sn)"/>';

  assertWidth(sub, 34, 1, R - CAP_X, `${file}: phone caption`);
  assertBelow(Y.titleM, Y.rowM, 34, `${file}: phone title vs caption`);
  const phone = spans(L, Y.titleM, 48, 1, title) + g(line(sub, { x: CAP_X, y: Y.rowM, size: 34, ls: 1 }), COLOR.white);

  // STAND-BY layer (SPEC §2.1): bars, castellation and a dark base bled 18u past the glass so the tear can slide.
  // The caption is tuned like every other line — 30u desktop, 34u phone (§3.2 minimum) — inside the same box.
  const standByCaption = (size) => g(line('PLEASE STAND BY', { x: 600, y: 70, size, ls: 3, anchor: 'middle' }), COLOR.white);
  const standby = '<g class="stby ev"><g class="tearS">' +
    bars(-18, 12, 1236, 84) + bars(-18, 96, 1236, 12, COLOR.cast) +
    '<rect x="-18" y="108" width="1236" height="28" fill="#131313"/></g>' +
    '<rect x="414" y="32" width="372" height="54" fill="#000"/>' +
    `<g class="d">${standByCaption(30)}</g><g class="m">${standByCaption(34)}</g></g>`;
  const burst = '<rect class="burst ev" x="12" y="12" width="1176" height="118" fill="url(#bu)"/>';

  const alt = `Signal archive: ${count.files(C)} files. Open source: ${count.oss(C)} files. Opens the projects index.`;
  return {
    file,
    svg: svgDoc({
      W, H, label: alt,
      css: tuning(TYPE[1200].tuning) + hidden('stby', 'burst'),
      // STAND-BY sits at the head of its own cycle, which would make the broken frame the first one a visitor
      // sees. Every layer shares the 18 s period, so one negative delay moves the event to 9 s after the image
      // paints and leaves t = 0 on the settled picture (SPEC §3.7: a tier-B event may not include t = 0).
      motion: ambientB({ H, bandH: BAND_H.slate, bandDelay: -1 }) + standBy({ period: STAND_BY_PERIOD }) +
        `.stby,.tearS,.burst,.pic{animation-delay:${-STAND_BY_PERIOD / 2}s}`,
      defs: t.defs + stripNoise('sn', seedOf(`${file}#strip`)) +
        burstPattern('bu', { size: 160, count: 200, seed: seedOf(`${file}#burst`) }),
      body: t.compose(`<g class="pic"><g class="d">${desktop}</g><g class="m">${phone}</g></g>`, standby + burst),
    }),
    alt,
    href: C.links.projects,
    region: 'archive',
  };
}

/**
 * CERTIFICATES. Desktop: title, the issuer tally right-aligned and the typed topic caption. Phone: title with
 * the tally under it. Every 14 s the picture re-tunes: a 3-step shift, a grain burst and a rainbow tear that
 * jumps between the two rows this slate leaves empty — above the title and between the two text rows — instead
 * of bisecting the title and the caption the way the fixed [52, 96, 30] sheet did.
 */
function certificates(C) {
  const file = 'slate-certificates.svg';
  const t = slateScreen(file);
  const title = titleSegs('CERTIFICATES', count.certificates(C));
  const issuers = count.byIssuer(C).map(([name, n]) => `${name.toUpperCase()} ${pad2(n)}`).join(' · ');
  const sub = `▸ ${C.certificatesTopic.toUpperCase()}`;

  // SPEC §2.1: the build throws unless 72 + title + 48 ≤ 1128 − issuers.
  assertGap(L + segWidth(title, 36, 2), R - measure(issuers, 18, 1), `${file}: title vs issuer counts`, 48);
  assertBelow(Y.title, Y.caption, 22, `${file}: title vs caption`);
  const desktop = spans(L, Y.title, 36, 2, title) +
    g(line(issuers, { x: R, y: Y.title - 2, size: 18, ls: 1, anchor: 'end' }), COLOR.text) +
    caption(sub, { y: Y.caption, size: 22, ls: 2, who: file });

  assertWidth(issuers, 34, 1, R - CAP_X, `${file}: phone issuer counts`);
  assertBelow(Y.titleM, Y.rowM, 34, `${file}: phone title vs issuer counts`);
  const phone = spans(L, Y.titleM, 48, 1, title) + g(line(issuers, { x: CAP_X, y: Y.rowM, size: 34, ls: 1 }), COLOR.white);

  // every run of both tunings: title / issuers / caption on desktop, title / issuers on the phone
  const ink = [inkBand(Y.title, 36), inkBand(Y.title - 2, 18), inkBand(Y.caption, 22), inkBand(Y.titleM, 48), inkBand(Y.rowM, 34)];
  const stops = tearStops(ink, t.gy, t.gy + t.gh, file);
  const tear = `<g class="tear ev">${rainbow({ x: 60, y: 0, w: 1080, h: stops.h, cls: 'tr' })}</g>`;
  // Plain integers here, `pad2` only on screen: a screen reader says "zero four" for the drawn "04".
  const alt = `Certificates: ${count.certificates(C)} files in ${C.certificatesTopic}. ` +
    `${count.byIssuer(C).map(([name, n]) => `${name} ${n}`).join(', ')}. Opens the certificates index.`;
  return {
    file,
    svg: svgDoc({
      W, H, label: alt,
      css: tuning(TYPE[1200].tuning) + hidden('tear'),
      motion: ambientB({ H, bandH: BAND_H.slate, bandDelay: -4 }) +
        retune({ period: 14, at: 7, origin: [600, 71], shift: [10, -7, 3], skew: [-2, 0, 0], tearY: stops.tearY }),
      defs: t.defs + rainbowNoise('rn', seedOf(`${file}#rainbow`)),
      body: t.compose(`<g class="rt"><g class="d">${desktop}</g><g class="m">${phone}</g></g>`, tear),
    }),
    alt,
    href: C.links.certificates,
    region: 'certificates',
  };
}

export function build(C) {
  return [archive(C), certificates(C)];
}
