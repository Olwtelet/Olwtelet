// THE SCORE. The opening's @keyframes are generated from this array, and so are the loops'. 24 fps, on threes.
// Nothing else in the film may contain a time.
import { T } from './kit/scene.mjs';
import { DRAWINGS, REST, STAMP } from './kit/route.mjs';
import { Y } from './layout.mjs';

export const FPS = 24;
export const SCORE = [['A1', 12], ['A3', 3], ['A4', 3], ['A5', 3], ['A7', 3], ['A9', 6], ['hit', 3], ['kick', 3], ['back', 3], ['O', 3], ['L', 3], ['W', 3], ['T', 3], ['E', 3], ['L', 3], ['E', 3], ['T', 3]];

// frame math
let f0 = 0;
export const AT = {};
export const STARTS = SCORE.map(([id, n]) => { const s = f0; if (!(id in AT)) AT[id] = s; f0 += n; return s; });
export const D = f0;
const pct = (f) => +((f / D) * 100).toFixed(3);
const kf = (name, stops) => `@keyframes ${name}{${stops.map(([f, css]) => `${pct(f)}%{${css}}`).join('')}}`;

const LETTERS = 8;
export const DUR = (D / FPS).toFixed(3);
const pv = T([431, 911]); // the slab's foot: the pivot of the snap
const has = (body, cls) => new RegExp('class="[^"]*\\b' + cls + '\\b').test(body);

// The opening, once: all of it generated from SCORE, only under no-preference. A tile gets only the rules its body uses.
export const OPEN_CSS = (body) => {
  let kfs = '', rules = '', base = [];
  const add = (name, stops) => { kfs += kf(name, stops); };
  const on = (sel, name, stops) => { add(name, stops); rules += `${sel}{animation:${name} ${DUR}s steps(1) both}`; };
  const lit = ['sky', 'sh'].filter((c) => has(body, c));
  if (lit.length) on(lit.map((c) => '.' + c).join(','), 'lit', [[0, 'opacity:0'], [AT.kick, 'opacity:1'], [D, 'opacity:1']]);
  // the afterimages: film-only, gone once the tower stands (blue from the start, teal joining it at A3)
  if (has(body, 'g0')) { on('.g0', 'g0k', [[0, 'opacity:1'], [AT.A5, 'opacity:0'], [D, 'opacity:0']]); base.push('.g0'); }
  if (has(body, 'g1')) { on('.g1', 'g1k', [[0, 'opacity:0'], [AT.A3, 'opacity:1'], [AT.A5, 'opacity:0'], [D, 'opacity:0']]); base.push('.g1'); }
  if (has(body, 'tw')) { on('.tw', 'tw', [[0, 'opacity:0'], [AT.A5, 'opacity:1;transform:rotate(-3.4deg)'], [AT.A7, 'opacity:1;transform:rotate(1.3deg)'], [AT.A9, 'opacity:1;transform:none'], [AT.kick, 'opacity:1;transform:translate(11px,-8px)'], [AT.back, 'opacity:1;transform:translate(-5px,4px)'], [AT.O, 'opacity:1;transform:none'], [D, 'opacity:1;transform:none']]); rules += `.tw{transform-origin:${pv[0].toFixed(1)}px ${pv[1].toFixed(1)}px}`; }
  if (has(body, 'im')) { on('.im', 'imk', [[0, 'opacity:0'], [AT.hit, 'opacity:1'], [AT.hit + 3, 'opacity:0'], [D, 'opacity:0']]); base.push('.im'); }
  if (has(body, 'sm')) { on('.sm', 'smk', [[0, 'opacity:0'], [AT.A4, 'opacity:1'], [AT.A4 + 3, 'opacity:0'], [D, 'opacity:0']]); base.push('.sm'); }
  if (has(body, 'cv')) { on('.cv', 'cvk', [[0, 'opacity:1'], [AT.kick, 'opacity:0'], [D, 'opacity:0']]); base.push('.cv'); }
  for (let i = 0; i < LETTERS; i++) if (has(body, 'l' + i)) on('.l' + i, 'l' + i, [[0, 'opacity:0'], [AT.O + i * 3, 'opacity:1'], [D, 'opacity:1']]);
  return (base.length ? base.join(',') + '{opacity:0}' : '') + (rules ? `@media (prefers-reduced-motion:no-preference){${kfs}${rules}}` : '');
};

// After the opening, a ration of two: the crack on b4, and the gag across c3 and c4.
const T3 = 9; const p3 = (s) => +((s / T3) * 100).toFixed(3);
export const CRK_CSS = `@media (prefers-reduced-motion:no-preference){@keyframes crk{0%{transform:none}${p3(8.625)}%{transform:translate(9px,4px)}${p3(8.75)}%{transform:translate(16px,7px)}${p3(8.875)}%{transform:translate(5px,2px)}100%{transform:none}}@keyframes wed{0%{transform:none}${p3(8.5)}%{transform:translate(-3px,8px)}${p3(8.625)}%{transform:translate(5px,-12px)}${p3(8.75)}%{transform:translate(3px,-8px)}${p3(8.875)}%{transform:translate(1px,-3px)}100%{transform:none}}.crk{animation:crk ${T3}s steps(1) infinite}.wed{animation:wed ${T3}s steps(1) infinite}}`;

const T4 = 11; const p4 = (s) => +((s / T4) * 100).toFixed(3);
// One gag on this clock, across two tiles: the tower runs the letters of c3 and lands, and on that landing the stamp of c4 comes down.
const GAG_AT = 7, DRAWING = 3 / FPS; // from 7 s, on threes
const px = (n) => +n.toFixed(1);
const beat = (i) => p4(GAG_AT + i * DRAWING);
const hopK = DRAWINGS.map((d, i) => {
  const move = d.at === REST ? '' : `translate(${px(d.at[0] - REST[0])}px,${px(d.at[1] - REST[1])}px)`, size = d.scale ? `scale(${d.scale.join(',')})` : '';
  return `${beat(i)}%{transform:${[move, size].filter(Boolean).join(' ') || 'none'}}`;
}).join('');
// the last landing: it lights the stage's last letter (lnd) and brings the stamp down (stp)
const LAST_LANDING = DRAWINGS.findLastIndex((d) => d.land);
// lnd: the pink that finishes the last letter goes dark when the tower leaves REST and lights when it lands back, 1.25 s later
// (two transitions that far apart are not a flash). Same tile and clock as the hop, so it adds no loop.
const lndK = `@keyframes lnd{0%{opacity:1}${beat(0)}%{opacity:0}${beat(LAST_LANDING)}%{opacity:1}100%{opacity:1}}.lnd{animation:lnd ${T4}s steps(1) infinite}`;
export const HOP_CSS = `@media (prefers-reduced-motion:no-preference){@keyframes hop{0%{transform:none}${hopK}100%{transform:none}}.hop{animation:hop ${T4}s steps(1) infinite}.hop{transform-origin:${px(REST[0])}px ${px(Y.productions + REST[1])}px}${lndK}}`;
// the last landing starts the stamp: gone for one drawing, then too large and turned, then under, then at rest
const stampK = ['opacity:0', 'opacity:1;transform:scale(1.2) rotate(-3.5deg)', 'opacity:1;transform:scale(.97)', 'opacity:1;transform:none'].map((css, i) => `${beat(LAST_LANDING + i)}%{${css}}`).join('');
export const STP_CSS = `@media (prefers-reduced-motion:no-preference){@keyframes stp{0%{opacity:1;transform:none}${stampK}100%{opacity:1;transform:none}}.stp{animation:stp ${T4}s steps(1) infinite}.stp{transform-origin:${STAMP.x}px ${Y.diseens + STAMP.y}px}}`;

// which CSS each kind of tile takes; layout.mjs names the kind per row
export const TILE_CSS = { open: OPEN_CSS, crk: CRK_CSS, hop: HOP_CSS, stp: STP_CSS };
// the only durations any tile may state
export const DURATIONS = [`${DUR}s`, `${T3}s`, `${T4}s`];
