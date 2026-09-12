// SIGNAL LOG (1200×320, tier B) — the only asset tv/build.mjs does not build: tv/jobs/signal-log.mjs renders it
// every day from the contribution calendar and publishes it to the `output` branch (SPEC §5).
//
// Two compositions share one file (SPEC §2.1): a weekly step trace on a dotted graticule with month ticks and
// three readouts, and a phone tuning with a thicker trace, no months and larger readouts. A stepped BEAM sweeps
// a brightened window across the trace; the last week blinks like a caret.
//
//   render(data)  the live card, from tv/lib/contrib.mjs#derive()
//   standby()     the "no data yet" card, published only while the branch has never held a good file
import { COLOR, BAND_H, GRID, TYPE, r2 } from '../lib/tokens.mjs';
import { line, measure, assertGap, assertWidth, assertBelow } from '../lib/text.mjs';
import { g, spans, segWidth, chroma, caret, recLabel, testCard, rule, tick, stripNoise, DOTS, DOTS_V } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { ambientB, beam } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

/** Published as `signal-log.svg` at the root of the `output` branch. */
export const FILE = 'signal-log.svg';
const W = 1200, H = 320;
const INSET = GRID.inset.wide; // 72u: left edge of the header, the scope and the first readout
const RIGHT = W - INSET; // 1128u: the right edge everything is aligned to
const SCOPE_W = RIGHT - INSET; // 1056u, also the distance the beam travels

/** The two tunings (SPEC §2.1 signal-log); `win` is the clip window the beam drags across the trace. */
const DESKTOP = { top: 84, bottom: 190, stroke: 2.5, months: true, clip: 'beamd', win: [42, 70, 60, 140] };
const PHONE = { top: 104, bottom: 196, stroke: 6, months: false, clip: 'beamm', win: [42, 90, 90, 120] };

/** The clip path that brightens the piece of trace under the beam (`ev`: reduced motion drops the window). */
const beamWindow = ({ clip, win: [x, y, w, h] }) =>
  `<clipPath id="${clip}"><rect class="beam ev" x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`;

/**
 * One scope: dotted graticule, month ticks, the weekly step trace with its chroma copies, the brightened beam
 * window, the playhead, and the blinking marker on the last week.
 */
function scope(weeks, { top, bottom, stroke, months, clip }) {
  const peak = Math.max(1, ...weeks.map((w) => w.count));
  const x = (i) => INSET + (i * SCOPE_W) / (weeks.length - 1);
  const y = (count) => bottom - (count / peak) * (bottom - top);

  let d = `M${r2(x(0))} ${r2(y(weeks[0].count))}`;
  weeks.forEach((week, i) => { if (i) d += `H${r2(x(i))}V${r2(y(week.count))}`; });
  const trace = (color, width, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r2(width)}"${extra}/>`;

  let out = '';
  for (let k = 0; k <= 4; k++) out += rule(INSET, r2(top + ((bottom - top) * k) / 4), SCOPE_W);
  if (months) {
    weeks.forEach((week, i) => {
      if (!week.month) return;
      out += tick(r2(x(i)), top, bottom - top) +
        g(line(week.month, { x: r2(x(i) + 6), y: bottom + 26, size: 18, ls: 1 }), COLOR.text);
    });
  }
  // chroma copies below, the white trace on top, then the window the beam brightens
  out += trace(COLOR.cyan, stroke + 0.5, ` opacity=".45" transform="translate(${r2(stroke)} ${r2(stroke * 0.7)})"`) +
    trace(COLOR.red, stroke + 0.5, ` opacity=".45" transform="translate(${r2(-stroke)} ${r2(-stroke * 0.7)})"`) +
    trace(COLOR.white, stroke) +
    `<g clip-path="url(#${clip})">${trace(COLOR.white, stroke * 2.2)}</g>` +
    `<rect class="beam ev" x="${r2(INSET - 1)}" y="${r2(top - 4)}" width="2" height="${r2(bottom - top + 8)}" ` +
    `fill="${COLOR.white}" opacity=".35"/>`;
  const last = weeks.length - 1;
  return `${out}<rect class="caret" x="${r2(x(last) - stroke * 2)}" y="${r2(y(weeks[last].count) - stroke * 2)}" ` +
    `width="${r2(stroke * 4)}" height="${r2(stroke * 4)}" fill="${COLOR.white}"/>`;
}

/**
 * The three readouts of one tuning: a gray label over a chromatic value, one per column. Every run is guarded
 * against the next column and against the right edge, so a five-digit total or a three-digit streak throws.
 */
function readouts(rows, { columns, label: [labelSize, labelLs], value: [valueSize, valueLs], labelY, valueY, chromaOffset, who }) {
  assertBelow(labelY, valueY, valueSize, `${who} readout label vs value`);
  return rows.map(([text, value], j) => {
    const x = columns[j];
    const labelW = measure(text, labelSize, labelLs);
    const next = columns[j + 1];
    if (next === undefined) {
      assertWidth(text, labelSize, labelLs, RIGHT - x, `${who} readout label "${text}"`);
      assertWidth(value, valueSize, valueLs, RIGHT - x, `${who} readout value "${value}"`);
    } else {
      assertGap(x + Math.max(labelW, measure(value, valueSize, valueLs)), next, `${who} readout "${text}" vs the next column`);
    }
    return g(line(text, { x, y: labelY, size: labelSize, ls: labelLs }), COLOR.text) +
      chroma(line(value, { x, y: valueY, size: valueSize, ls: valueLs }), { ...chromaOffset, j: 'S' });
  }).join('');
}

/** Left edge of a recLabel: the text plus the dot, which sits 0.8·size before it with radius 0.36·size. */
const recLeft = (text, xEnd, size, ls) => xEnd - measure(text, size, ls) - 1.16 * size;

/**
 * The live signal log.
 *   weeks                       53 weekly sums from contrib.weeks(): [{ start, count, month }]
 *   total / last365 / longest   the readout values
 *   sync                        'SEP 11, 2026' (shown); syncDate '2026-09-11' (the data-sync attribute)
 *   since                       first year the total covers, shown as "TOTAL · SINCE 2022" — required rather
 *                               than defaulted, so the year has exactly one home (tv/content.mjs signalLog.since,
 *                               which the job passes and the README's alt text reads)
 * @example render({ ...derive(days, { today: '2026-09-11' }), since: 2022 })
 */
export function render({ weeks, total, last365, longest, sync, syncDate, since }) {
  if (!Array.isArray(weeks) || weeks.length < 2) throw new Error('render: weeks must be the weekly sums');
  for (const [name, value] of Object.entries({ total, last365, longest })) {
    if (!Number.isInteger(value) || value < 0) throw new Error(`render: ${name} must be a whole number ≥ 0, got ${JSON.stringify(value)}`);
  }
  if (!/^[A-Z]{3} \d{1,2}, \d{4}$/.test(String(sync))) throw new Error(`render: sync must look like "SEP 11, 2026", got ${JSON.stringify(sync)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(syncDate))) throw new Error(`render: syncDate must be an ISO date, got ${JSON.stringify(syncDate)}`);
  if (!Number.isInteger(since) || since < 2008) throw new Error(`render: since must be a year like 2022, got ${JSON.stringify(since)}`);

  const t = tv({ bezel: 'screen', W, H, bandH: BAND_H.screen, seed: seedOf(`${FILE}#grain`) });
  const streak = `${longest} DAYS`;
  const title = [['▮ ', COLOR.white], ['SIGNAL LOG', COLOR.white], [` · WEEKLY CONTRIBUTIONS, LAST ${weeks.length} WEEKS`, COLOR.text]];
  const phoneTitle = [['▮ ', COLOR.white], ['SIGNAL LOG', COLOR.white]];
  const syncText = `SYNC ${sync}`;
  assertGap(INSET + segWidth(title, 24, 1), recLeft(syncText, RIGHT, 20, 2), `${FILE}: header vs SYNC`);
  assertGap(INSET + segWidth(phoneTitle, 44, 1), recLeft(sync, RIGHT, 34, 0), `${FILE}: phone header vs SYNC`);

  const desktop = spans(INSET, 58, 24, 1, title) + recLabel(syncText, RIGHT, 58, 20, 2) +
    scope(weeks, DESKTOP) + rule(INSET, 234, SCOPE_W) +
    readouts([[`TOTAL · SINCE ${since}`, String(total)], ['LAST 365 DAYS', String(last365)], ['LONGEST STREAK', streak]], {
      columns: [72, 452, 832], label: [18, 2], value: [36, 1],
      labelY: 262, valueY: 300, chromaOffset: { dx: 2, dy: 1.5 }, who: `${FILE} desktop`,
    });

  const phone = spans(INSET, 76, 44, 1, phoneTitle) + recLabel(sync, RIGHT, 76, 34) +
    scope(weeks, PHONE) +
    readouts([[`SINCE ${since}`, String(total)], ['LAST 365 DAYS', String(last365)], ['LONGEST STREAK', streak]], {
      columns: [72, 432, 792], label: [34, 0], value: [50, 0],
      labelY: 248, valueY: 300, chromaOffset: { dx: 3, dy: 2 }, who: `${FILE} phone`,
    });

  const label = `Signal log: weekly GitHub contributions over the last ${weeks.length} weeks. ${total} contributions ` +
    `since ${since}, ${last365} in the last 365 days, longest streak ${longest} days. Synced ${sync}.`;
  return svgDoc({
    W, H, label,
    css: tuning(TYPE[1200].tuning),
    motion: ambientB({ H, bandH: BAND_H.screen, bandDelay: -5 }) + beam({ distance: SCOPE_W }),
    defs: t.defs + DOTS + DOTS_V + beamWindow(DESKTOP) + beamWindow(PHONE),
    body: t.compose(`<g class="d">${desktop}</g><g class="m">${phone}</g>`),
    attrs: { 'data-total': total, 'data-sync': syncDate },
  });
}

/**
 * The stand-by card: SMPTE bars behind "PLEASE STAND BY_", published only while the `output` branch has never
 * held a good file (SPEC §2, §5.1 step 8). No numbers and no date — nothing on it can go stale.
 * One composition, every line ≥ 34u, so it needs no phone tuning.
 */
export function standby() {
  const t = tv({ bezel: 'screen', W, H, bandH: BAND_H.screen, seed: seedOf(`${FILE}#standby-grain`) });
  const [x, y, w, h] = [t.gx, t.gy, t.gw, t.gh]; // the full glass of the 'screen' bezel
  const card = testCard(x, y, w, h) + `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#sn)"/>`;

  const headline = 'PLEASE STAND BY', note = 'SIGNAL LOG · NO DATA YET';
  const headlineW = assertWidth(headline, 40, 3, 536, `${FILE}: stand-by headline`);
  assertWidth(note, 34, 2, 536, `${FILE}: stand-by note`);
  assertBelow(162, 206, 34, `${FILE}: stand-by headline vs note`);
  const box = '<rect x="300" y="96" width="600" height="128" fill="#000"/>' +
    g(line(headline, { x: 600, y: 162, size: 40, ls: 3, anchor: 'middle' }), COLOR.white) +
    caret({ x: 600 + headlineW / 2 + 4, y: 162, size: 40 }) +
    g(line(note, { x: 600, y: 206, size: 34, ls: 2, anchor: 'middle' }), COLOR.text);

  const label = 'Signal log: please stand by — no contribution data yet. The daily job publishes the weekly trace once it succeeds.';
  return svgDoc({
    W, H, label,
    css: tuning(TYPE[1200].tuning),
    motion: ambientB({ H, bandH: BAND_H.screen, bandDelay: -5 }),
    defs: t.defs + stripNoise('sn', seedOf(`${FILE}#standby-strip`)),
    body: t.compose(card + box),
  });
}
