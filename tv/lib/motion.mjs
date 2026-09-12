// Motion vocabulary (SPEC §3.7, §3.8).
//
// Three kinds of export:
//   KF.name        a fixed @keyframes block
//   kf.name({…})   a parametric @keyframes block
//   builder({…})   complete CSS (rules + the keyframes they use) for the `motion` argument of svgDoc()
// svgDoc() wraps `motion` in @media (prefers-reduced-motion:no-preference), so the base CSS is the settled
// frame: reduced-motion viewers and renderers that ignore media queries see a complete still image.
// Keyframe names equal the class names they animate; the defaults match the reference prototypes. Pass other
// names only to run two variants in one file. svgDoc() keeps one copy of identical @keyframes and throws when
// two different bodies share a name. Later rules override earlier ones, so call ambientB() before retune().
import { r2 } from './tokens.mjs';

/** The block every animation must live in. */
export const NO_PREFERENCE = '@media (prefers-reduced-motion:no-preference){';
/** Fail-safe reduced-motion block appended to every SVG (SPEC §3.8). */
export const REDUCE = '@media (prefers-reduced-motion:reduce){.band,.ev{display:none}.grain{opacity:.06}}';

/** Seconds → percentage of a period, rounded to 2 decimals: pct(9.6, 10) → 96 */
export const pct = (s, period) => r2((s / period) * 100);
const sec = (s) => `${r2(s)}s`;
const px = (v) => (v === 0 ? '0' : `${r2(v)}px`);

/**
 * `selector{animation:a,b}`. Use it to run several animations on one element.
 * @example animate('.cyT', 'cyin .45s cubic-bezier(.2,.8,.2,1) 1s backwards', 'twcT 7s steps(1,end) 2.6s infinite')
 */
export const animate = (selector, ...animations) => `${selector}{animation:${animations.join(',')}}`;

/**
 * Settled-frame CSS (for svgDoc's `css`, not `motion`): hide transient layers at rest.
 * @example hidden('tear', 'burst') → '.tear,.burst{opacity:0}'
 */
export const hidden = (...classes) => `${classes.map((c) => `.${c}`).join(',')}{opacity:0}`;

/**
 * Settled-frame CSS for a focus highlight: collapsed rainbow static that FOCUS grows.
 * @example focusBase() → '.rb{transform-box:fill-box;transform-origin:50% 50%;transform:scaleY(0)}'
 */
export const focusBase = (cls = 'rb', origin = '50% 50%') => `.${cls}{transform-box:fill-box;transform-origin:${origin};transform:scaleY(0)}`;

// ── fixed keyframes ─────────────────────────────────────────────────────────────────────────────
export const KF = Object.freeze({
  /** GRAIN: 4-offset drift of the grain tile (.48 s hero, 2 s elsewhere, steps(1,end)) */
  grain: '@keyframes grain{0%{transform:translate(0,0)}25%{transform:translate(-61px,37px)}50%{transform:translate(-23px,-71px)}75%{transform:translate(-89px,-17px)}}',
  /** REC: dot dims every other second */
  rec: '@keyframes rec{50%{opacity:.3}}',
  /** BLINK: caret, .8 s step-end */
  blink: '@keyframes blink{50%{opacity:0}}',
  /** BLINK (hero): starts hidden, for a caret that appears after typing (use with backwards fill) */
  blinkIn: '@keyframes blinkIn{0%{opacity:0}50%{opacity:1}}',
  /** LINE: power-on white line expands, thickens and fades (.45 s linear) */
  line: '@keyframes line{0%{transform:scaleX(0);opacity:1}27%{transform:scaleX(1);opacity:1}55%{transform:scale(1,3);opacity:.55}100%{transform:scale(1,7);opacity:0}}',
  /** PWR: picture opens from a line with a skewed overshoot (.75 s cubic-bezier(.25,.8,.3,1)) */
  pwr: '@keyframes pwr{0%{transform:scale(1,.005)}40%{transform:scale(1,1.05)}62%{transform:scale(1,.93) skewX(-2deg)}80%{transform:scale(1,1.015) skewX(1deg)}100%{transform:none}}',
  /** FLASH: dim white veil, never above .22 (.6 s linear) */
  flash: '@keyframes flash{0%{opacity:.22}25%{opacity:.07}100%{opacity:0}}',
  /** BURST: channel-change static (1.15 s steps(1,end)) */
  burst: '@keyframes burst{0%,27%{opacity:0}28%{opacity:.7}40%{opacity:.42}52%{opacity:.6}66%{opacity:.28}82%{opacity:.1}100%{opacity:0}}',
  /** POP: appears at once (.01 s steps(1)) */
  pop: '@keyframes pop{0%{opacity:0}}',
  /** POP3: appears in three steps (.3 s steps(3)) */
  pop3: '@keyframes pop3{0%{opacity:0}}',
  /** FLICK: a line flickers on (.3 s linear, backwards) */
  flick: '@keyframes flick{0%,20%{opacity:0}40%{opacity:1}60%{opacity:.35}80%,100%{opacity:1}}',
  /** TW: title flickers in while its chroma converges */
  tw: '@keyframes tw{0%{opacity:0}35%{opacity:1}55%{opacity:.45}75%,100%{opacity:1}}',
  /** CHROMA-IN, cyan copy: slides in from the right */
  cyin: '@keyframes cyin{0%{transform:translate(46px,0)}100%{transform:none}}',
  /** CHROMA-IN, red copy: slides in from the left */
  rdin: '@keyframes rdin{0%{transform:translate(-46px,0)}100%{transform:none}}',
  /** TYPE: clip rect grows from the left, steps(n+1,end) */
  type: '@keyframes type{0%{transform:scaleX(0)}}',
  /** EQ: VU bar level, steps(5,end) alternate */
  eq: '@keyframes eq{0%{transform:scaleY(.14)}100%{transform:scaleY(1)}}',
});

// ── parametric keyframes ──────────────────────────────────────────────────────────────────────────
export const kf = Object.freeze({
  /** VLINE: the rolling band travels from above the glass to the bottom edge in 80% of the cycle. */
  vline: ({ H, bandH, name = 'vline' }) =>
    `@keyframes ${name}{0%{transform:translateY(-${r2(bandH)}px)}80%,100%{transform:translateY(${r2(H)}px)}}`,

  /** BARS: strip shown full-frame (dimmed .5), then collapsing onto its own rect. (sx, sy) = full-frame scale. */
  bars: ({ sx, sy, name = 'bars' }) => {
    const s = `scale(${r2(sx)},${r2(sy)})`;
    return `@keyframes ${name}{0%,36%{opacity:0;transform:${s}}37%{opacity:.5;transform:${s}}70%{opacity:.5;transform:${s};animation-timing-function:cubic-bezier(.7,0,.3,1)}92%,100%{opacity:1;transform:none}}`;
  },

  /**
   * A value held at `peak` from `on`% to `off`% and at `base` otherwise (use with steps(1,end)).
   * @example kf.pulse({ name: 'tear', on: 52, off: 55, base: 0, peak: 1 })
   */
  pulse: ({ name, on, off, base, peak, prop = 'opacity' }) =>
    `@keyframes ${name}{0%{${prop}:${base}}${r2(on)}%{${prop}:${peak}}${r2(off)}%,100%{${prop}:${base}}}`,

  /**
   * Transform jumps for steps(1,end): keys = [[pct, dx, dy, skewXdeg?], …] in ascending order. The transform is
   * none before the first key; a key with no offset and no skew is `none` and, when last, holds to 100%.
   * @example kf.jumps({ name: 'twcT', keys: [[51, 9, -2], [53, -4, 3], [55, 12, 1], [57, 0, 0]] })
   */
  jumps: ({ name, keys }) => {
    const frame = ([p, dx, dy, skew = 0]) => {
      const parts = [];
      if (dx || dy) parts.push(`translate(${px(dx)},${px(dy)})`);
      if (skew) parts.push(`skewX(${r2(skew)}deg)`);
      return [r2(p), parts.length ? parts.join(' ') : 'none'];
    };
    const frames = keys.map(frame);
    const body = frames.map(([p, t], i) => (i === frames.length - 1 && t === 'none' ? `${p}%,100%{transform:none}` : `${p}%{transform:${t}}`)).join('');
    return `@keyframes ${name}{${frames[0][0] === 0 ? '' : '0%{transform:none}'}${body}}`;
  },
});

// ── builders ─────────────────────────────────────────────────────────────────────────────────────
/**
 * Tier A ambient loops (hero only): smooth VLINE from `start`, .48 s GRAIN, REC.
 * @example ambientA({ H: 640, bandH: 90 })
 */
export function ambientA({ H, bandH, start = 2.4 }) {
  return `.band{animation:vline 8s linear ${sec(start)} infinite backwards}${kf.vline({ H, bandH })}` +
    `.grain{animation:grain .48s steps(1,end) infinite}${KF.grain}` +
    `.rec{animation:rec 2s steps(1,end) infinite}${KF.rec}`;
}

/**
 * Tier B ambient loops (≤ 8 repaints/s): VLINE steps(52) with a per-asset phase, 2 s GRAIN, REC, caret BLINK.
 * @example ambientB({ H: 400, bandH: 70, bandDelay: -1.9 })
 */
export function ambientB({ H, bandH, bandDelay = 0 }) {
  return `.band{animation:vline 8s steps(52,end) ${sec(bandDelay)} infinite}${kf.vline({ H, bandH })}` +
    `.grain{animation:grain 2s steps(1,end) infinite}${KF.grain}` +
    `.rec{animation:rec 2s steps(1,end) infinite}${KF.rec}` +
    `.caret{animation:blink .8s step-end infinite}${KF.blink}`;
}

/**
 * FOCUS: rainbow static grows behind a label in steps(3) over `grow` s, holds `hold` s, collapses in steps(2)
 * over `collapse` s; `start` is the offset inside the period. Pair with focusBase(cls) in the settled CSS.
 * Keys: focus({ period: 8, hold: 1.4, collapse: .16, delay: 2.6 }) · cards: focus({ period: 10, start: 5,
 * delay: -2.5 * i }) · ON AIR: focus({ period: 12, delay: 3 }).
 */
export function focus({ period, start = 0, grow = 0.2, hold = 1.6, collapse = 0.15, delay = 0, cls = 'rb' }) {
  const a = pct(start, period), b = pct(start + grow, period);
  const c = pct(start + grow + hold, period), d = pct(start + grow + hold + collapse, period);
  return `.${cls}{animation:${cls} ${sec(period)} linear ${sec(delay)} infinite}` +
    `@keyframes ${cls}{${a ? `0%,${a}%` : '0%'}{transform:scaleY(0);animation-timing-function:steps(3,end)}` +
    `${b}%,${c}%{transform:scaleY(1);animation-timing-function:steps(2,end)}${d}%,100%{transform:scaleY(0)}}`;
}

/**
 * TWITCH: the chroma copies of fx.chroma(…, { j }) jump at the given keys (red mirrors cyan unless `red` is given).
 * @example twitch({ j: 'E', period: 9, delay: 3, keys: [[90.6, 12, -2], [91.4, -3, 4], [92, 0, 0]] })
 */
export function twitch({ j, period, delay = 0, keys, red = keys.map(([p, dx, dy]) => [p, -dx, -dy]) }) {
  const timing = `${sec(period)} steps(1,end) ${sec(delay)} infinite`;
  return animate(`.cy${j}`, `twc${j} ${timing}`) + kf.jumps({ name: `twc${j}`, keys }) +
    animate(`.rd${j}`, `twr${j} ${timing}`) + kf.jumps({ name: `twr${j}`, keys: red });
}

/**
 * RETUNE: a 3-step horizontal shift (+ skew) of the content group, a rainbow tear jumping between three rows,
 * a grain burst and (optionally) a chroma split, all inside one `window` starting at `at` s of the period.
 * Markup: content in <g class="rt">, tear in <g class="tear ev"> at y 0, chroma(…, { j }); settled CSS hidden('tear').
 * Card:  retune({ period: 10, at: 9.6, origin: [300, 200], tearY: [150, 236, 96], chroma: { j: 'T', keys: [[10, -2], [-4, 3], [8, 1]] }, delay: -2.5 * i })
 * Slate: retune({ period: 14, at: 7, origin: [600, 75], shift: [10, -7, 3], skew: [-2, 0, 0], tearY: [52, 96, 30] })
 */
export function retune({ period, at, window = 0.3, origin, shift = [8, -6, 3], skew = [-2, 0, 1], tearY, chroma = null,
  grain = [0.1, 0.35], delay = 0, rt = 'rt', tear = 'tear', gb = 'gb', grainClass = 'grain' }) {
  const t = [0, 1, 2, 3].map((k) => pct(at + (window * k) / 3, period));
  const timing = `${sec(period)} steps(1,end) ${sec(delay)} infinite`;
  let css = `.${rt}{transform-box:view-box;transform-origin:${r2(origin[0])}px ${r2(origin[1])}px;animation:${rt} ${timing}}` +
    kf.jumps({ name: rt, keys: [[t[0], shift[0], 0, skew[0]], [t[1], shift[1], 0, skew[1]], [t[2], shift[2], 0, skew[2]], [t[3], 0, 0]] });
  if (chroma) {
    css += twitch({ j: chroma.j, period, delay, keys: [...chroma.keys.map(([dx, dy], k) => [t[k], dx, dy]), [t[3], 0, 0]] });
  }
  const ty = (y) => `translateY(${px(y)})`;
  css += `.${tear}{animation:${tear} ${timing}}@keyframes ${tear}{0%{opacity:0;transform:${ty(tearY[0])}}` +
    `${t[0]}%{opacity:1;transform:${ty(tearY[0])}}${t[1]}%{opacity:1;transform:${ty(tearY[1])}}` +
    `${t[2]}%{opacity:1;transform:${ty(tearY[2])}}${t[3]}%,100%{opacity:0;transform:${ty(tearY[2])}}}`;
  css += animate(`.${grainClass}`, 'grain 2s steps(1,end) infinite', `${gb} ${timing}`) + KF.grain +
    kf.pulse({ name: gb, on: t[0], off: t[3], base: grain[0], peak: grain[1] });
  return css;
}

/**
 * TUNER (websites guide): `slots` highlight windows of `slot` s each. Rows carry classes `hb h{k}` (rainbow,
 * origin 50% 100%) and `ht h{k}` (cursor + outlined title); the idle `OPEN INDEX ↗` label carries `idx` and hides
 * during the last slot. Settled CSS: '.hb,.ht{opacity:0}.hb{transform-box:fill-box;transform-origin:50% 100%}'.
 * @example tuner({ slots: 7, slot: 2.4 })
 */
export function tuner({ slots, slot, back = 'hb', top = 'ht', idle = 'idx', row = 'h' }) {
  const cycle = r2(slot * slots), win = 100 / slots;
  return `.${back}{animation:${back} ${sec(cycle)} linear infinite}.${top}{animation:${top} ${sec(cycle)} steps(1,end) infinite}` +
    `@keyframes ${back}{0%{opacity:1;transform:scaleY(.15);animation-timing-function:steps(3,end)}${r2(win * 0.09)}%{opacity:1;transform:scaleY(1)}` +
    `${r2(win - 0.5)}%{opacity:1;transform:scaleY(1)}${r2(win)}%,100%{opacity:0;transform:scaleY(1)}}` +
    `@keyframes ${top}{0%,${r2(win - 0.5)}%{opacity:1}${r2(win)}%,100%{opacity:0}}` +
    Array.from({ length: slots }, (_, k) => `.${row}${k}{animation-delay:${sec(k * slot)}}`).join('') +
    `.${idle}{animation:${idle} ${sec(cycle)} steps(1,end) infinite}@keyframes ${idle}{0%,${r2(100 - win)}%{opacity:1}${r2(100 - win + 0.01)}%,100%{opacity:0}}`;
}

/**
 * TYPE (hero only, one-shot): a clip rect of width (n+1)·cell grows in n+1 steps. The clip rect carries `cls`.
 * @example typeReveal({ cls: 'ty1', n: 43, duration: .55, delay: 1.05 })
 */
export function typeReveal({ cls, n, duration, delay }) {
  return `.${cls}{transform-box:fill-box;transform-origin:0 50%;animation:type ${sec(duration)} steps(${n + 1},end) ${sec(delay)} backwards}${KF.type}`;
}

/**
 * STAND-BY (archive slate, 18 s): channel-change burst, PLEASE STAND BY bars with a stepped horizontal tear,
 * then the picture locks with a flicker. Settled CSS: hidden(layer, burst).
 * Markup: <g class="pic">content</g><g class="stby ev"><g class="tearS">bars…</g>box</g><rect class="burst ev" …/>
 */
export function standBy({ period = 18, layer = 'stby', tear = 'tearS', burst = 'burst', picture = 'pic' }) {
  const p = (s) => pct(s, period);
  const timing = `${sec(period)} steps(1,end) infinite`;
  return `.${layer}{animation:${layer} ${timing}}@keyframes ${layer}{0%,${p(0.15)}%{opacity:0}${p(0.16)}%,${p(0.62)}%{opacity:1}${p(0.63)}%,100%{opacity:0}}` +
    `.${tear}{animation:${tear} ${timing}}@keyframes ${tear}{0%{transform:none}${p(0.22)}%{transform:translateX(-26px)}${p(0.3)}%{transform:translateX(14px)}${p(0.4)}%{transform:translateX(-6px)}${p(0.48)}%,100%{transform:none}}` +
    `.${burst}{animation:${burst} ${timing}}@keyframes ${burst}{0%{opacity:.75}${p(0.08)}%{opacity:.5}${p(0.16)}%,${p(0.62)}%{opacity:.18}${p(0.63)}%{opacity:.45}${p(0.72)}%{opacity:.12}${p(0.8)}%,100%{opacity:0}}` +
    `.${picture}{animation:${picture} ${timing}}@keyframes ${picture}{0%,${p(0.62)}%{opacity:0}${p(0.63)}%{opacity:1}${p(0.7)}%{opacity:.4}${p(0.76)}%,100%{opacity:1}}`;
}

/**
 * SLOT / SWITCH (NOW PLAYING): `slots` items of `slot` s each (classes `pk pk{k}`), a static burst (`sw`) and a
 * 3-step shift of the title group (`tz`) at every switch. Settled CSS: '.pk{opacity:0}.pk0{opacity:1}.sw{opacity:0}'.
 * @example slotSwitch({ slots: 4, slot: 4 })
 */
export function slotSwitch({ slots, slot, item = 'pk', flash = 'sw', shift = 'tz', offsets = [12, -7, 3] }) {
  const p = (s) => pct(s, slot), share = 100 / slots;
  return `.${item}{animation:${item} ${sec(slot * slots)} steps(1,end) infinite}@keyframes ${item}{0%,${r2(share - 0.01)}%{opacity:1}${r2(share)}%,100%{opacity:0}}` +
    Array.from({ length: slots }, (_, k) => `.${item}${k}{animation-delay:${sec(k * slot)}}`).join('') +
    `.${flash}{animation:${flash} ${sec(slot)} steps(1,end) infinite}@keyframes ${flash}{0%,${r2(p(0.12) - 0.01)}%{opacity:.55}${p(0.12)}%,${r2(p(0.24) - 0.01)}%{opacity:.22}${p(0.24)}%,100%{opacity:0}}` +
    `.${shift}{animation:${shift} ${sec(slot)} steps(1,end) infinite}` +
    kf.jumps({ name: shift, keys: [[0, offsets[0], 0], [p(0.08), offsets[1], 0], [p(0.16), offsets[2], 0], [p(0.24), 0, 0]] });
}

/**
 * EQ: 7 VU bars (classes `eq eq{i}`) bounce at their own rate. Settled CSS:
 * '.eq{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(.6)}'.
 */
export function eq({ durations = [0.9, 1.3, 0.7, 1.1, 1.5, 0.8, 1.2], cls = 'eq' } = {}) {
  return `.${cls}{animation:eq 1s steps(5,end) infinite alternate}${KF.eq}` +
    durations.map((d, i) => `.${cls}${i}{animation-duration:${sec(d)};animation-delay:${sec(-(i * 0.37) % 1.5)}}`).join('');
}

/**
 * BEAM (signal log): a playhead and its clip travel `distance` u across the scope in stepped moves.
 * @example beam({ distance: 1056 })
 */
export function beam({ distance, period = 9, steps = 72, cls = 'beam' }) {
  return `.${cls}{animation:${cls} ${sec(period)} steps(${steps},end) infinite}@keyframes ${cls}{0%{transform:translateX(0)}100%{transform:translateX(${px(distance)})}}`;
}

/**
 * OFF / GLOW / DOT (sign-off, 14 s): hold, collapse to a line, shrink to a dot, fade to black, power back on with
 * a 1.04 overshoot. Markup: <g class="tube">card…<rect class="glow ev"/></g><circle class="dot ev"/>;
 * settled CSS: hidden(glow, dot).
 * @example powerOff({ origin: [600, 130] })
 */
export function powerOff({ period = 14, origin, tube = 'tube', glow = 'glow', dot = 'dot' }) {
  return `.${tube}{transform-box:view-box;transform-origin:${r2(origin[0])}px ${r2(origin[1])}px;animation:${tube} ${sec(period)} linear infinite}` +
    `@keyframes ${tube}{0%,82%{transform:none;opacity:1;animation-timing-function:cubic-bezier(.6,0,.9,.5)}85.5%{transform:scale(1,.012)}` +
    '87.5%{transform:scale(.004,.012);opacity:1}94%{transform:scale(.004,.012);opacity:0}95.9%{transform:scale(1,.012);opacity:0}' +
    '96%{transform:scale(1,.012);opacity:1;animation-timing-function:cubic-bezier(.2,.8,.3,1)}98.6%{transform:scale(1,1.04)}100%{transform:none;opacity:1}}' +
    `.${glow}{animation:${glow} ${sec(period)} steps(1,end) infinite}@keyframes ${glow}{0%,84.9%{opacity:0}85.5%,94%{opacity:.9}95.9%,100%{opacity:0}}` +
    `.${dot}{animation:${dot} ${sec(period)} linear infinite}@keyframes ${dot}{0%,87%{opacity:0}88%{opacity:.9}94%,100%{opacity:0}}`;
}

// ── CSS block scanning (shared with lint.mjs) ───────────────────────────────────────────────────
/**
 * Top-level blocks of a CSS string: [{ prelude, body, start, end }] where css.slice(start, end) is the whole
 * `prelude{body}`. Declarations outside blocks are ignored. Throws on unbalanced braces.
 */
export function cssBlocks(css) {
  const blocks = [];
  let depth = 0, open = -1, preludeStart = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      if (depth === 0) open = i;
      depth++;
    } else if (css[i] === '}') {
      if (--depth < 0) throw new Error(`CSS: unbalanced "}" at ${i}`);
      if (depth === 0) {
        const prelude = css.slice(preludeStart, open);
        const lead = prelude.length - prelude.trimStart().length;
        blocks.push({ prelude: prelude.trim(), body: css.slice(open + 1, i), start: preludeStart + lead, end: i + 1 });
        preludeStart = i + 1;
      }
    } else if (css[i] === ';' && depth === 0) {
      preludeStart = i + 1;
    }
  }
  if (depth !== 0) throw new Error('CSS: unbalanced "{"');
  return blocks;
}

/** Keep the first copy of each @keyframes; drop identical repeats; throw when one name has two bodies. */
export function dedupeKeyframes(css) {
  const seen = new Map();
  let out = '', cursor = 0;
  for (const b of cssBlocks(css)) {
    const m = /^@keyframes\s+([\w-]+)$/.exec(b.prelude);
    if (!m) continue;
    const [, name] = m;
    if (!seen.has(name)) { seen.set(name, b.body); continue; }
    if (seen.get(name) !== b.body) throw new Error(`motion: @keyframes ${name} is defined twice with different bodies`);
    out += css.slice(cursor, b.start);
    cursor = b.end;
  }
  return out + css.slice(cursor);
}
