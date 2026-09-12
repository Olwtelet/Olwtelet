// ON AIR (assets/tv/on-air.svg): the two current roles with their terms and dates, plus the core stack, on a
// 1200×400 CRT screen that opens the resume. Layout sheet: SPEC §2.1 "on-air"; motion: §3.7 FOCUS (tier B, so
// ambient loops plus one 12 s highlight on the RESUME ↗ action, nothing else).
import { COLOR, BAND_H, TYPE } from '../lib/tokens.mjs';
import { line, measure, assertGap, assertBelow, assertWidth } from '../lib/text.mjs';
import { g, chroma, outlined, focusRect, rainbowNoise, rule, DOTS } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { ambientB, focus, focusBase } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

export const family = 'on-air';

const FILE = 'on-air.svg';
const W = 1200, H = 400;
/** Content inset and the right edge every right-aligned run ends at (SPEC §3.4: 72u on 1200-wide assets). */
const L = 72, R = 1128;
const ACTION = 'RESUME ↗';
/**
 * FOCUS on RESUME ↗ (SPEC §3.7). The remote runs the same 12 s period (tv/assets/buttons.mjs RIPPLE): its keys
 * are lit from 2.6 s to 10.96 s, so this one fires at 11.5 s — inside the remote's dark window — and the two
 * link-hovers visible in one viewport never grow at the same time. Change one period and change both.
 */
const FOCUS = { period: 12, delay: 11.5 };

/** The ON AIR lamp: the REC dot (class `rec`, dimmed every other second by ambientB) left of the label. */
const lamp = (cx, cy, r) => `<circle class="rec" cx="${cx}" cy="${cy}" r="${r}" fill="${COLOR.rec}"/>`;

/**
 * RESUME ↗ right-aligned at R over its collapsed focus rectangle (§3.6 outlined + focusRect, §3.7 FOCUS).
 * Returns the markup and the left edge of the highlight, so the caller can keep ON AIR clear of it.
 */
function action({ y, size, ls, padX, h, sw }) {
  const w = measure(ACTION, size, ls);
  return {
    left: R - w - padX,
    markup: focusRect(R - w, y, size, w, { padX, h }) + outlined(line(ACTION, { x: R, y, size, ls, anchor: 'end' }), sw),
  };
}

/** "SEP 2026 → PRESENT" from a work record. */
const dateRange = (work) => `${work.since.toUpperCase()} → PRESENT`;
/** "MOSTLY TYPESCRIPT / PYTHON / REACT / NODE.JS" from C.mostly (resume: "I work mostly with …"). */
const stackLine = (C) => `MOSTLY ${C.mostly.join(' / ').toUpperCase()}`;

/**
 * Desktop composition (SPEC §2.1): header at y 66, dotted rules at 90 / 206 / 322, one work row per band with
 * company · role · dates on the baseline and the terms 32u under it, then the STACK row at y 364.
 */
function desktop(C) {
  const head = 'ON AIR';
  const act = action({ y: 66, size: 22, ls: 2, padX: 10, h: 36, sw: 4 });
  assertGap(104 + measure(head, 24, 3), act.left, `${FILE}: ${head} vs ${ACTION}`);
  const out = [
    lamp(84, 57, 9) + g(line(head, { x: 104, y: 66, size: 24, ls: 3 }), COLOR.white),
    act.markup,
    rule(L, 90, 1056),
  ];

  [146, 262].forEach((y, i) => {
    const work = C.work[i];
    const company = work.company.toUpperCase(), role = work.role.toUpperCase(), dates = dateRange(work);
    assertGap(L + measure(company, 32, 1), 316, `${FILE}: ${company} vs its role`);
    assertGap(316 + measure(role, 20, 0.5), R - measure(dates, 20, 1), `${FILE}: ${company} role vs dates`);
    assertBelow(y, y + 32, 18, `${FILE}: ${company} vs its terms`);
    out.push(
      chroma(line(company, { x: L, y, size: 32, ls: 1 }), { dx: 2, dy: 1.5 }),
      g(line(role, { x: 316, y, size: 20, ls: 0.5 }), COLOR.white),
      g(line(dates, { x: R, y, size: 20, ls: 1, anchor: 'end' }), COLOR.text),
      g(line(work.terms.toUpperCase(), { x: 316, y: y + 32, size: 18, ls: 1 }), COLOR.text),
    );
  });
  out.push(rule(L, 206, 1056), rule(L, 322, 1056));

  const stack = stackLine(C);
  assertGap(L + measure('STACK', 24, 3), 316, `${FILE}: STACK label vs stack line`);
  assertWidth(stack, 20, 1, R - 316, `${FILE}: stack line`);
  out.push(g(line('STACK', { x: L, y: 364, size: 24, ls: 3 }), COLOR.text) +
    g(line(stack, { x: 316, y: 364, size: 20, ls: 1 }), COLOR.white));
  return out.join('');
}

/**
 * Phone composition (SPEC §2.1, ≥ 34u everywhere): the same rows stacked instead of columned — company with its
 * dates on one line, the role on the next — and the stack line without its label.
 */
function phone(C) {
  const head = 'ON AIR';
  const act = action({ y: 76, size: 40, ls: 1, padX: 10, h: 54, sw: 6 });
  assertGap(116 + measure(head, 44, 2), act.left, `${FILE}: phone ${head} vs ${ACTION}`);
  const out = [
    lamp(88, 62, 14) + g(line(head, { x: 116, y: 76, size: 44, ls: 2 }), COLOR.white),
    act.markup,
    rule(L, 100, 1056),
  ];

  [164, 290].forEach((y, i) => {
    const work = C.work[i];
    const company = work.company.toUpperCase(), role = work.role.toUpperCase(), dates = dateRange(work);
    assertGap(L + measure(company, 56, 1), R - measure(dates, 36), `${FILE}: phone ${company} vs dates`);
    assertBelow(y, y + 44, 34, `${FILE}: phone ${company} vs its role`);
    assertWidth(role, 34, 0, R - L, `${FILE}: phone ${company} role`);
    out.push(
      chroma(line(company, { x: L, y, size: 56, ls: 1 }), { dx: 3, dy: 2 }),
      g(line(dates, { x: R, y: y - 4, size: 36, anchor: 'end' }), COLOR.text),
      g(line(role, { x: L, y: y + 44, size: 34 }), COLOR.white),
    );
  });
  out.push(rule(L, 230, 1056), rule(L, 354, 1056));

  const stack = stackLine(C);
  assertWidth(stack, 34, 0, R - L, `${FILE}: phone stack line`);
  out.push(g(line(stack, { x: L, y: 384, size: 34 }), COLOR.text));
  return out.join('');
}

/** "TypeScript, Python, React and Node.js" for the alt text. */
const listAnd = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

export function build(C) {
  const t = tv({ bezel: 'screen', W, H, bandH: BAND_H.screen, seed: seedOf(`${FILE}#grain`) });
  const alt = `On air: ${C.work.map((w) => `${w.company}, ${w.role}, ${w.terms}, since ${w.since}`).join('; ')}. ` +
    `Stack: mostly ${listAnd(C.mostly)}. Opens the resume.`;
  const svg = svgDoc({
    W, H, label: alt,
    css: tuning(TYPE[1200].tuning) + focusBase(),
    motion: ambientB({ H, bandH: BAND_H.screen, bandDelay: -3 }) + focus(FOCUS),
    defs: t.defs + DOTS + rainbowNoise('rn', seedOf(`${FILE}#rainbow`)),
    body: t.compose(`<g class="d">${desktop(C)}</g><g class="m">${phone(C)}</g>`),
  });
  return [{ file: FILE, svg, alt, href: C.links.resume, region: 'on-air' }];
}
