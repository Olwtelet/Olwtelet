// Websites program guide (SPEC §2, §2.1 "guide-websites"): the six client sites as one 1200×470 channel index
// instead of six more cards. A TUNER loop walks the list — seven 2.4 s slots (rows 05–10, then OPEN INDEX ↗) —
// growing the site's rainbow link-hover behind the tuned title, which is why every highlighted label is
// outlined() (SPEC §3.6). Desktop renders at 832 px, the phone composition at 356 px (SPEC §3.2).
import { BAND_H, BEZEL, COLOR, GRID, TYPE, r2 } from '../lib/tokens.mjs';
import { CAP, assertBelow, assertGap, assertWidth, cell, chars, line, measure, wrapStrict } from '../lib/text.mjs';
import { DOTS, focusRect, g, outlined, rainbowNoise, rule, segWidth, spans } from '../lib/fx.mjs';
import { svgDoc, tuning, tv } from '../lib/screen.mjs';
import { ambientB, focusBase, hidden, tuner } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';
import { pad2 } from '../content.mjs';

export const family = 'guide';

const FILE = 'guide-websites.svg';
const W = 1200, H = 470;
/** Seconds per tuner slot; the cycle is (rows + 1) × SLOT = 16.8 s. */
const SLOT = 2.4;
const ACTION = 'OPEN INDEX ↗';
/** Left inset of the rows and right edge of every right-aligned run (SPEC §2.1). */
const LEFT = 66, RIGHT = 1160;
/** The lowest baseline that still sits inside the glass. */
const BOTTOM = H - BEZEL.guide.inset - 8;
/** Desktop one-liners must fit the row width at 18u (SPEC §2.1). */
const COPY_MAX = 1094;

/**
 * Layout sheets (SPEC §2.1). The two tunings are the same list at two sizes: the phone drops the year and
 * keeps its text at ≥ 34u, the §3.2 phone minimum (the prototype's 30u status is below it).
 * `litStatus` is on in both: the tuned row's status turning white is half the "this one is selected" cue, and
 * without it a phone reader sees the cursor move but the status column never react.
 *
 * `copy` sets each one-liner under its own row (desktop, 832 px: six rows of two lines fit). `synopsis` puts
 * it in a bar under the list instead, showing only the tuned row's — which is how a phone can carry them at
 * all. Six 34u one-liners inline would need 71u more than this 470u image has (six rows of a 34u title and a
 * 34u one-liner at the §3.4 minimum lead is 541u), and those 71u cost 49 px of desktop page height against
 * the 19 px SPEC §1.1 leaves. One bar costs nothing: the rows tighten from 56u to 46u to make room for it.
 */
const SHEETS = [
  {
    who: 'desktop', cls: 'd', name: 'CHANNEL INDEX — WEBSITES',
    headY: 58, headSize: 22, headLs: 3, actSize: 20, actLs: 2, actSw: 4, actH: 34, ruleY: 76,
    rowY: 116, step: 58, titleSize: 30, titleLs: 1, titleSw: 5, focusH: 40,
    cursorX: 38, cursorDy: -2, cursorSize: 26, cursorSw: 4,
    statusSize: 20, statusLs: 2, year: true, litStatus: true,
    copy: { size: 18, dy: 25 }, synopsis: null,
  },
  {
    who: 'phone', cls: 'm', name: 'WEBSITES',
    headY: 76, headSize: 40, headLs: 2, actSize: 34, actLs: 1, actSw: 5, actH: 48, ruleY: 96,
    rowY: 138, step: 44, titleSize: 40, titleLs: 1, titleSw: 6, focusH: 44,
    cursorX: 36, cursorDy: -3, cursorSize: 34, cursorSw: 5,
    statusSize: 34, statusLs: 1, year: false, litStatus: true,
    copy: null, synopsis: { x: 40, size: 34, lines: 2, gap: 8 },
  },
];

/** Highlight layers of tuner slot k: the rainbow block (`hb`) under the label, the outlined label (`ht`) over it. */
const slot = (k, back, top) => `<g class="hb h${k}">${back}</g><g class="ht h${k}">${top}</g>`;

/**
 * One tuning: header, dotted rule and one row per website, followed by the highlight layers (drawn last so
 * they cover the resting text). Slot k highlights row k; the last slot highlights OPEN INDEX ↗.
 */
function composition(web, s, indexUrl) {
  const base = [], lit = [];
  const where = `${FILE} ${s.who}`;
  /**
   * The synopsis bar: the tuned row's one-liner, verbatim, under the list. It rides the same slot classes as
   * the highlight, so it changes with the cursor; the rest frame (and any renderer that ignores the
   * no-preference block) shows row 1's, the way the deck rests on playlist 1.
   */
  const syn = s.synopsis && (() => {
    const pitch = CAP * s.synopsis.size + GRID.minLead;
    // The bar sits under the whole list, so it starts at the header's own 40u inset rather than the rows' 66u
    // and hangs the file number in that margin: a band of its own, and a number that says which row it is
    // describing — without it the copy reads as a description of the last row instead of the tuned one.
    const indent = 3 * cell(s.synopsis.size);
    const y = s.rowY + (web.length - 1) * s.step + pitch + s.synopsis.gap;
    const last = y + (s.synopsis.lines - 1) * pitch;
    if (last > BOTTOM) throw new Error(`overflow in ${where}: the synopsis bar ends at ${r2(last)}u, past the glass (${BOTTOM}u)`);
    return { pitch, indent, y, x: s.synopsis.x, width: RIGHT - s.synopsis.x - indent };
  })();

  const head = [['▮ ', COLOR.white], [s.name, COLOR.white], [` · ${pad2(web.length)} FILES`, COLOR.text]];
  const actionW = measure(ACTION, s.actSize, s.actLs);
  assertGap(40 + segWidth(head, s.headSize, s.headLs), RIGHT - actionW, `${where} header vs action`);
  base.push(spans(40, s.headY, s.headSize, s.headLs, head));
  base.push(`<g class="idx">${g(line(ACTION, { x: RIGHT, y: s.headY, size: s.actSize, ls: s.actLs, anchor: 'end' }), COLOR.white)}</g>`);
  base.push(rule(40, s.ruleY, 1120));
  // the last slot tunes OPEN INDEX ↗; its "synopsis" is where it goes, the way the site tooltips an external
  // link with its own URL, so the bar never blanks while the cursor is parked on the action
  let indexLine = '';
  if (syn) {
    assertWidth(indexUrl, s.synopsis.size, 0, syn.width, `${where} index URL`);
    indexLine = g(line(indexUrl, { x: syn.x + syn.indent, y: syn.y, size: s.synopsis.size }), COLOR.text);
  }
  lit.push(slot(web.length,
    focusRect(RIGHT - actionW, s.headY, s.actSize, actionW, { padX: 10, h: s.actH, cls: 'f' }),
    outlined(line(ACTION, { x: RIGHT, y: s.headY, size: s.actSize, ls: s.actLs, anchor: 'end' }), s.actSw) + indexLine));

  let previous = s.ruleY;
  web.forEach((f, k) => {
    const y = s.rowY + k * s.step;
    const title = `${f.no} / ${f.title.toUpperCase()}`, titleW = measure(title, s.titleSize, s.titleLs);
    const status = s.year ? `${f.status} · ${f.year}` : f.status;
    const statusW = measure(status, s.statusSize, s.statusLs);
    assertBelow(previous, y, s.titleSize, `${where} row ${f.no} vs the row above`);
    assertGap(LEFT + titleW, RIGHT - statusW, `${where} row ${f.no} title vs status`);
    base.push(g(line(title, { x: LEFT, y, size: s.titleSize, ls: s.titleLs }), COLOR.white) +
      g(line(status, { x: RIGHT, y, size: s.statusSize, ls: s.statusLs, anchor: 'end' }), COLOR.text));
    previous = y;

    if (s.copy) {
      const copyY = y + s.copy.dy;
      assertWidth(f.oneLiner, s.copy.size, 0, COPY_MAX, `${where} one-liner ${f.no}`);
      assertBelow(y, copyY, s.copy.size, `${where} row ${f.no} title vs one-liner`);
      base.push(g(line(f.oneLiner, { x: LEFT, y: copyY, size: s.copy.size }), COLOR.text));
      previous = copyY;
    }

    // the synopsis of this row, drawn in its highlight layer so it is on screen exactly while the row is tuned
    let synopsis = '';
    if (syn) {
      const lines = wrapStrict(f.oneLiner, s.synopsis.size, syn.width, s.synopsis.lines, 0, `${where} synopsis ${f.no}`);
      synopsis = g(line(f.no, { x: syn.x, y: syn.y, size: s.synopsis.size }), COLOR.white) +
        lines.map((text, j) => g(line(text, { x: syn.x + syn.indent, y: syn.y + j * syn.pitch, size: s.synopsis.size }), COLOR.text)).join('');
    }

    lit.push(slot(k,
      focusRect(LEFT, y, s.titleSize, titleW, { padX: 8, h: s.focusH, cls: 'f' }),
      outlined(line('►', { x: s.cursorX, y: y + s.cursorDy, size: s.cursorSize }), s.cursorSw) +
      outlined(line(title, { x: LEFT, y, size: s.titleSize, ls: s.titleLs }), s.titleSw) +
      (s.litStatus ? g(line(status, { x: RIGHT, y, size: s.statusSize, ls: s.statusLs, anchor: 'end' }), COLOR.white) : '') +
      synopsis));
  });

  if (previous > BOTTOM) throw new Error(`overflow in ${where}: the last row ends at ${previous}u, past the glass (${BOTTOM}u)`);
  if (syn) assertBelow(previous, syn.y, s.synopsis.size, `${where} last row vs synopsis bar`);
  return `<g class="${s.cls}">${base.join('')}${lit.join('')}</g>`;
}

export function build(C) {
  const web = C.files.filter((f) => f.kind === 'web');
  const seed = (purpose) => seedOf(`${FILE}#${purpose}`);
  const t = tv({ bezel: 'guide', W, H, bandH: BAND_H.guide, seed: seed('grain') });
  // `Number(f.no)`: the guide draws "05", but an alt is spoken, and "zero five" is not how anyone says it.
  const alt = `Websites, ${web.length} files: ` +
    `${web.map((f) => `${Number(f.no)}. ${f.title}, ${f.status.toLowerCase()}, ${f.year}`).join('; ')}. Opens the websites index.`;

  const svg = svgDoc({
    W, H, label: alt,
    // `.ht.h0`: slot 0 is what the tuner shows at t = 0, so the rest frame shows it too — the first row tuned
    // and its synopsis in the bar, instead of a list with an empty bar under it (SPEC §3.8 fail-safe).
    css: tuning(TYPE[1200].tuning) + hidden('hb', 'ht') + focusBase('hb', '50% 100%') + '.ht.h0{opacity:1}',
    motion: ambientB({ H, bandH: BAND_H.guide, bandDelay: -3 }) + tuner({ slots: web.length + 1, slot: SLOT }),
    defs: t.defs + DOTS + rainbowNoise('rn', seed('rainbow')),
    body: t.compose(SHEETS.map((s) => composition(web, s, C.links.websites.replace(/^https?:\/\//, '').toUpperCase())).join('')),
  });
  return [{ file: FILE, svg, alt, href: C.links.websites, region: 'archive' }];
}
