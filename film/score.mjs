// THE SCORE. The chart on the sheet is drawn from this array, and so are the @keyframes. 24 fps, on threes.
// Nothing else in the film may contain a time.
import { T } from './kit/scene.mjs';

export const FPS = 24;
export const SCORE = [['A1', 12], ['A3', 3], ['A4', 3], ['A5', 3], ['A7', 3], ['A9', 6], ['hit', 3], ['kick', 3], ['back', 3], ['O', 3], ['L', 3], ['W', 3], ['T', 3], ['E', 3], ['L', 3], ['E', 3], ['T', 3]];

// frame math
let f0 = 0;
export const AT = {};
export const STARTS = SCORE.map(([id, n]) => { const s = f0; if (!(id in AT)) AT[id] = s; f0 += n; return s; });
export const D = f0;
const pct = (f) => +((f / D) * 100).toFixed(3);
const kf = (name, stops) => `@keyframes ${name}{${stops.map(([f, css]) => `${pct(f)}%{${css}}`).join('')}}`;

// the marks on the drawn chart: the drawings up to the impact. The smear A4 is a breakdown: a tick and no label.
export const CHART_MARKS = SCORE.slice(0, 7).filter(([id]) => id !== 'A4').map(([id]) => {
  const i = SCORE.findIndex((s) => s[0] === id);
  return { id, frame: STARTS[i], left: ['A1', 'A5', 'A9'].includes(id), hit: id === 'hit' };
});

const LETTERS = 8;
export const DUR = (D / FPS).toFixed(3);
const pv = T([431, 911]); // the slab's foot: the pivot of the snap
const has = (body, cls) => new RegExp('class="[^"]*\\b' + cls + '\\b').test(body);

// The opening, once: all of it generated from SCORE, only under no-preference. A tile gets only the rules its body uses.
export const OPEN_CSS = (body) => {
  let kfs = '', rules = '', base = [];
  const add = (name, stops) => { kfs += kf(name, stops); };
  const on = (sel, name, stops) => { add(name, stops); rules += `${sel}{animation:${name} ${DUR}s steps(1) both}`; };
  const lit = ['sky', 'sh', 'hc'].filter((c) => has(body, c));
  if (lit.length) on(lit.map((c) => '.' + c).join(','), 'lit', [[0, 'opacity:0'], [AT.kick, 'opacity:1'], [D, 'opacity:1']]);
  if (has(body, 'g1')) on('.g1', 'g1k', [[0, 'opacity:0'], [AT.A3, 'opacity:1'], [D, 'opacity:1']]);
  if (has(body, 'tw') || has(body, 'tp')) { on('.tw,.tp', 'tw', [[0, 'opacity:0'], [AT.A5, 'opacity:1;transform:rotate(-3.4deg)'], [AT.A7, 'opacity:1;transform:rotate(1.3deg)'], [AT.A9, 'opacity:1;transform:none'], [AT.kick, 'opacity:1;transform:translate(11px,-8px)'], [AT.back, 'opacity:1;transform:translate(-5px,4px)'], [AT.O, 'opacity:1;transform:none'], [D, 'opacity:1;transform:none']]); rules += `.tw,.tp{transform-origin:${pv[0].toFixed(1)}px ${pv[1].toFixed(1)}px}`; }
  if (has(body, 'im')) { on('.im', 'imk', [[0, 'opacity:0'], [AT.hit, 'opacity:1'], [AT.hit + 3, 'opacity:0'], [D, 'opacity:0']]); base.push('.im'); }
  if (has(body, 'sm')) { on('.sm', 'smk', [[0, 'opacity:0'], [AT.A4, 'opacity:1'], [AT.A4 + 3, 'opacity:0'], [D, 'opacity:0']]); base.push('.sm'); }
  if (has(body, 'cv')) { on('.cv', 'cvk', [[0, 'opacity:1'], [AT.kick, 'opacity:0'], [D, 'opacity:0']]); base.push('.cv'); }
  for (let i = 0; i < LETTERS; i++) if (has(body, 'l' + i)) on('.l' + i, 'l' + i, [[0, 'opacity:0'], [AT.O + i * 3, 'opacity:1'], [D, 'opacity:1']]);
  return (base.length ? base.join(',') + '{opacity:0}' : '') + (rules ? `@media (prefers-reduced-motion:no-preference){${kfs}${rules}}` : '');
};

// After the opening, a ration of two.
const T3 = 9; const p3 = (s) => +((s / T3) * 100).toFixed(3);
export const CRK_CSS = `@media (prefers-reduced-motion:no-preference){@keyframes crk{0%{transform:none}${p3(8.625)}%{transform:translate(9px,4px)}${p3(8.75)}%{transform:translate(16px,7px)}${p3(8.875)}%{transform:translate(5px,2px)}100%{transform:none}}@keyframes wed{0%{transform:none}${p3(8.5)}%{transform:translate(-3px,8px)}${p3(8.625)}%{transform:translate(5px,-12px)}${p3(8.75)}%{transform:translate(3px,-8px)}${p3(8.875)}%{transform:translate(1px,-3px)}100%{transform:none}}.crk{animation:crk ${T3}s steps(1) infinite}.wed{animation:wed ${T3}s steps(1) infinite}}`;

const T4 = 11; const p4 = (s) => +((s / T4) * 100).toFixed(3);
let afK = '', afR = '';
for (let i = 0; i < 10; i++) { const a = 7 + i * 0.125, b = a + 0.125, up = Math.round(22 * Math.pow(0.86, i)); afK += `@keyframes t${i}{0%{transform:none}${p4(a)}%{transform:translateY(-${up}px)}${p4(b)}%{transform:none}100%{transform:none}}`; afR += `.t${i}{animation:t${i} ${T4}s steps(1) infinite}`; }
export const AF_CSS = `@media (prefers-reduced-motion:no-preference){${afK}${afR}}`;

// which CSS each kind of tile takes; layout.mjs names the kind per row
export const TILE_CSS = { open: OPEN_CSS, crk: CRK_CSS, af: AF_CSS };
// the only durations any tile may state
export const DURATIONS = [`${DUR}s`, `${T3}s`, `${T4}s`];
