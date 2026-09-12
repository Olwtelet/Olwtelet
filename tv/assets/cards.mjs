// Signal-file cards (SPEC §2, §2.1 "file-0N"): the site's OG signal-file card as a 600×400 CRT screen, one per
// open-source file. The README shows the four of them in a 49% grid, so the desktop composition renders at
// 408 px and the phone one takes over at 172 px (SPEC §3.2). Each card loops for 10 s with exactly two events —
// a FOCUS on the action label and a RETUNE — staggered 2.5 s apart in reading order, so the four cards in the
// grid never fire together (SPEC §3.7 loop policy).
import { BAND_H, COLOR, GRID, TYPE, r2 } from '../lib/tokens.mjs';
import { CAP, assertBelow, assertGap, assertWidth, fitTitle, line, measure, stackFit, wrapStrict } from '../lib/text.mjs';
import { bars, chroma, focusRect, g, outlined, rainbow, rainbowNoise, recLabel, stripNoise } from '../lib/fx.mjs';
import { svgDoc, tuning, tv } from '../lib/screen.mjs';
import { ambientB, focus, focusBase, hidden, retune } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

export const family = 'cards';

const W = 600, H = 400;
/** Every card links to its repository, so the action is the OG card's own label. */
const ACTION = 'VIEW SOURCE ↗';
/** Loop period and the reading-order stagger: four cards × 2.5 s exactly fill one cycle. */
const PERIOD = 10, STAGGER = 2.5;
/** The rolling band is 8 s; a 1.9 s offset per card keeps neighbouring bands out of phase too. */
const BAND_STAGGER = 1.9;
/** Header tracking: the OG wordmark only clears the REC label at 2u (the assert below is the real guard). */
const HEAD_LS = 2;
/**
 * RETUNE tear: an opaque rainbow band must never land on a word, so its three stops are computed from the rows
 * this card leaves empty in BOTH tunings. `min` is the row height a stop needs, `pad` the clearance kept above
 * and below the band, and the band is `hMin`…`hMax` tall — the slate variant's 12u is the middle of that range.
 */
const TEAR = { min: 14, pad: 4, hMin: 10, hMax: 16 };

/** The OG card's 7-bar SMPTE strip with its noise overlay (pattern id `sn`). */
const strip = (y) => bars(40, y, 520, 14) + `<rect x="40" y="${y}" width="520" height="14" fill="url(#sn)"/>`;

/** Left edge of a recLabel's ink: fx.recLabel puts the dot .8·size before the text, with radius .36·size. */
const recLeft = (text, xEnd, size, ls) => xEnd - measure(text, size, ls) - 1.16 * size;

/** Vertical ink extent of a text run: cap top → baseline, widened by `pad` for its chroma copies. */
const inkBand = (baseline, size, pad = 0) => [baseline - CAP * size - pad, baseline + pad];

/** Vertical extent of a focus block: fx.focusRect centres `h` on the cap height of its label. */
const focusBand = (baseline, size, h) => {
  const cy = baseline - (CAP * size) / 2;
  return [cy - h / 2, cy + h / 2];
};

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

/**
 * The three rows the tear jumps between, and how tall it is. They are picked from the rows no text occupies in
 * either tuning — so the tear crosses the picture without hiding a word — spread over the height of the card,
 * with the band sized to the tightest of them. The SMPTE strip is not text: the tear may cross it. The build
 * fails when a layout leaves fewer than two usable rows, which is the assert this event needs. (The certificates
 * slate runs the same computation on its own layout; see tv/assets/slates.mjs.)
 */
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
  // middle → bottom → top, wrapping when a layout affords only two rows: the same downward-then-up jump
  // as the prototype's [150, 236, 96]
  return { h, tearY: [1, 2, 0].map((k) => centre(pick[k % pick.length])) };
}

/**
 * Desktop composition (408 px): the OG header ("OLWTELET · SIGNAL FILE 0N" over "● REC · CH 0N"), chromatic
 * title, category, the verbatim one-liner, the OG stack line, the action over its focus block, the status and
 * the bar strip. Every gap is asserted, so a longer title or one-liner in tv/content.mjs fails the build
 * instead of colliding on screen. Returns the markup and the vertical extent of every run it draws.
 */
function desktop(f, C) {
  const who = `card ${f.no} desktop`;
  const out = [], ink = [];

  const head = `${C.identity.handle} · SIGNAL FILE ${f.no}`, rec = `REC · CH ${f.no}`;
  assertGap(40 + measure(head, 18, HEAD_LS), recLeft(rec, 560, 18, HEAD_LS), `${who} header`);
  out.push(g(line(head, { x: 40, y: 58, size: 18, ls: HEAD_LS }), COLOR.text) + recLabel(rec, 560, 58, 18, HEAD_LS));
  ink.push(inkBand(58, 18));

  // one line at 48–64u, else a balanced two-liner at 36–46u (fitTitle throws when neither fits)
  const title = fitTitle(f.title.toUpperCase(), 520, { oneMin: 48, oneMax: 64, twoMin: 36, twoMax: 46 });
  const first = 90 + CAP * title.size, lh = title.size * 1.1;
  const last = first + (title.lines.length - 1) * lh;
  out.push(chroma(title.lines.map((l, k) => line(l, { x: 38, y: first + k * lh, size: title.size })).join(''), { dx: 3, dy: 2, j: 'T' }));
  ink.push([first - CAP * title.size - 2, last + 2]); // the cyan copy sits 2u low

  const catY = last + 40;
  assertBelow(last, catY, 20, `${who} title vs category`);
  out.push(g(line(f.category, { x: 40, y: catY, size: 20, ls: 3 }), COLOR.white));
  ink.push(inkBand(catY, 20));

  // one-liner: up to 3 lines under a one-line title, 2 under a two-line one; the stack row at 306 is the floor
  const copy = wrapStrict(f.oneLiner, 20, 520, title.lines.length === 1 ? 3 : 2, 0, `${who} one-liner`);
  copy.forEach((l, k) => {
    out.push(g(line(l, { x: 40, y: catY + 33 + k * 27, size: 20 }), COLOR.text));
    ink.push(inkBand(catY + 33 + k * 27, 20));
  });
  assertBelow(catY + 33 + (copy.length - 1) * 27, 306, 18, `${who} one-liner vs stack`);
  out.push(g(line(stackFit(f.stack, 520, 18, 0.5), { x: 40, y: 306, size: 18, ls: 0.5 }), COLOR.text));
  ink.push(inkBand(306, 18));

  // action and status share a baseline: assert against the focus block, not just the label
  const status = `STATUS: ${f.status}`, actionW = measure(ACTION, 20, 1);
  assertGap(40 + actionW + 9, 560 - measure(status, 18, 1), `${who} action vs status`);
  out.push(focusRect(40, 344, 20, actionW, { padX: 9, h: 34 }) + outlined(line(ACTION, { x: 40, y: 344, size: 20, ls: 1 }), 4));
  out.push(g(line(status, { x: 560, y: 344, size: 18, ls: 1, anchor: 'end' }), COLOR.text));
  ink.push(focusBand(344, 20, 34)); // taller than the status run on the same baseline

  out.push(strip(360));
  return { markup: out.join(''), ink };
}

/**
 * Phone geometry (SPEC §2.1 file-0N, phone column, re-tuned for the copy line). Everything above the status
 * row is packed upwards — the title starts 16u higher and sits 8u closer to its category than the prototype's
 * sheet — because the rows that buys are the only place a 172 px card can say what the project *is*. `copy`
 * is the §3.2 phone minimum: at 34u a line holds 26 characters of the 520u the card is wide.
 */
const M = { head: 70, titleTop: 88, titleGap: 40, copy: 34, status: 304, action: 350, strip: 366 };
/** Baseline-to-baseline pitch of the copy lines: cap height plus the §3.4 minimum lead. */
const COPY_PITCH = CAP * M.copy + GRID.minLead;

/**
 * Phone composition (172 px): the same card with 34–36u meta, a much larger title, no stack line and a status
 * without its "STATUS:" prefix. The one thing it keeps besides the name is the description: `f.short`, the
 * condensed form of the file's own one-liner (tv/content.mjs), set on the one or two lines left between the
 * category and the status. Without it the card is a name and a status, which is not a project.
 */
function phone(f) {
  const who = `card ${f.no} phone`;
  const out = [], ink = [];

  const head = `FILE ${f.no}`;
  assertGap(40 + measure(head, 34, 2), recLeft('REC', 560, 34, 2), `${who} header`);
  out.push(g(line(head, { x: 40, y: M.head, size: 34, ls: 2 }), COLOR.text) + recLabel('REC', 560, M.head, 34, 2));
  ink.push(inkBand(M.head, 34));

  const title = fitTitle(f.title.toUpperCase(), 524, { oneMin: 64, oneMax: 96, twoMin: 44, twoMax: 56 });
  const first = M.titleTop + CAP * title.size, lh = title.size * 1.08;
  const last = first + (title.lines.length - 1) * lh;
  out.push(chroma(title.lines.map((l, k) => line(l, { x: 36, y: first + k * lh, size: title.size })).join(''), { dx: 5, dy: 3, j: 'T' }));
  ink.push([first - CAP * title.size - 3, last + 3]);

  const catY = last + M.titleGap;
  assertBelow(last, catY, 34, `${who} title vs category`);
  out.push(g(line(f.category, { x: 40, y: catY, size: 34, ls: 2 }), COLOR.white));
  ink.push(inkBand(catY, 34));

  // the description: as many lines as fit above the status, filled with the condensed copy (which must fit them)
  if (!f.short) throw new Error(`${who}: tv/content.mjs files[${f.no}] needs a "short" line for the phone card`);
  const floor = M.status - CAP * M.copy - GRID.minLead; // the lowest baseline a copy line may take
  const rows = Math.floor((floor - catY) / COPY_PITCH + 1e-9);
  if (rows < 1) {
    throw new Error(`${who}: no room for the description between the category (${r2(catY)}u) and the status ` +
      `(${M.status}u) — a ${title.size}u title on ${title.lines.length} line(s) leaves ${r2(floor - catY)}u, one needs ${r2(COPY_PITCH)}u`);
  }
  const copy = wrapStrict(f.short, M.copy, 520, rows, 0, `${who} description ("short" in tv/content.mjs)`);
  copy.forEach((l, k) => {
    const y = catY + (k + 1) * COPY_PITCH;
    out.push(g(line(l, { x: 40, y, size: M.copy }), COLOR.text));
    ink.push(inkBand(y, M.copy));
  });

  // the status keeps the "STATUS:" label of the site's file pages here (the desktop card has it too): with a
  // description above it in the same gray, a bare "WORK IN PROGRESS" reads as one more line of the sentence
  const status = `STATUS: ${f.status}`;
  assertWidth(status, 34, 0, 520, `${who} status`);
  assertBelow(catY + copy.length * COPY_PITCH, M.status, 34, `${who} description vs status`);
  out.push(g(line(status, { x: 40, y: M.status, size: 34 }), COLOR.text));
  ink.push(inkBand(M.status, 34));

  assertBelow(M.status, M.action, 36, `${who} status vs action`);
  out.push(focusRect(40, M.action, 36, measure(ACTION, 36, 1), { padX: 10, h: 50 }) + outlined(line(ACTION, { x: 40, y: M.action, size: 36, ls: 1 }), 6));
  ink.push(focusBand(M.action, 36, 50));

  out.push(strip(M.strip));
  return { markup: out.join(''), ink };
}

export function build(C) {
  return C.files.filter((f) => f.kind === 'oss').map((f, i) => {
    const file = `file-${f.no}-${f.slug}.svg`;
    const seed = (purpose) => seedOf(`${file}#${purpose}`);
    const t = tv({ bezel: 'card', W, H, bandH: BAND_H.card, seed: seed('grain') });
    const delay = -i * STAGGER;
    const d = desktop(f, C), m = phone(f);
    const tear = tearStops([...d.ink, ...m.ink], t.gy, t.gy + t.gh, file);
    // `Number(f.no)`: the card draws "01", but an alt is spoken, and "zero one" is not how anyone says it.
    const alt = `Signal file ${Number(f.no)}: ${f.title}, ${f.category.toLowerCase()}. ${f.oneLiner}. ` +
      `Status: ${f.status.toLowerCase()}. Opens the source on GitHub.`;

    const svg = svgDoc({
      W, H, label: alt,
      css: tuning(TYPE[600].tuning) + hidden('tear') + focusBase(),
      motion: ambientB({ H, bandH: BAND_H.card, bandDelay: -i * BAND_STAGGER }) +
        // 9.6–9.9 s of the cycle: shift + chroma split + the rainbow tear jumping across the card's empty rows
        retune({
          period: PERIOD, at: 9.6, origin: [W / 2, H / 2], tearY: tear.tearY,
          chroma: { j: 'T', keys: [[10, -2], [-4, 3], [8, 1]] }, delay,
        }) +
        // 5.0–6.95 s: the site's link hover grows behind VIEW SOURCE ↗
        focus({ period: PERIOD, start: 5, delay }),
      defs: t.defs + stripNoise('sn', seed('strip')) + rainbowNoise('rn', seed('rainbow')),
      body: t.compose(
        `<g class="rt"><g class="d">${d.markup}</g><g class="m">${m.markup}</g></g>`,
        `<g class="tear ev">${rainbow({ x: 40, y: 0, w: 520, h: tear.h, cls: 'tr' })}</g>`,
      ),
    });
    return { file, svg, alt, href: f.url, region: 'archive' };
  });
}
