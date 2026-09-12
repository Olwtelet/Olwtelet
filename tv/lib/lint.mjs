// Build guards (SPEC §2 budgets, §3.3–§3.9 SVG contract, §1.2 README rules, §4.5 content schema, §8.3 strings).
// Every linter returns findings [{ level: 'error' | 'warn', rule, message }]; tv/build.mjs aborts on any error.
import { PALETTE, TYPE, typeClass, HARD_CAP, budgetFor } from './tokens.mjs';
import { NO_PREFERENCE, REDUCE, cssBlocks } from './motion.mjs';
import { REGION_IDS, hasRegions, extractRegions } from './readme.mjs';
import { fontMode } from './font.mjs';
import { unescapeAttr } from './text.mjs';

/** Files allowed to use tier A motion (smooth loops, one-shot intro): the hero and the QA specimen. */
export const TIER_A_FILES = Object.freeze(new Set(['channel-00.svg', '_specimen.svg']));
/** Tier B: a changing keyframe interval longer than this is "continuous" and must be stepped. */
export const EVENT_MAX_S = 1;
/** Tier B: continuous intervals must step at most every 0.12 s (≤ 8 repaints/s). */
export const MIN_STEP_S = 0.12;
/** Tier B: smooth (non-stepped) change may fill at most this share of a cycle. */
export const SMOOTH_SHARE_MAX = 0.25;
/** Strings that must never appear in the README (SPEC §8.3). */
export const FORBIDDEN = Object.freeze(['Barros', 'MHz', 'x.com', 'Portfolio-V1', 'isaac-r-a8a777368', 'CURRENT STREAK', 'Reddit', 'Shorts', 'ESC RETURNS', 'TUNE IN', 'AUDIO:']);

const EMOJI = /\p{Emoji_Presentation}|️/u;
const finding = (level, rule, message) => ({ level, rule, message });

/** Keep only the errors of a findings list. */
export const errorsOf = (findings) => findings.filter((f) => f.level === 'error');

// ── markup scanning ─────────────────────────────────────────────────────────────────────────────
const TAG = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>/y;
const ATTR = /\s+([\w:.-]+)="([^"<]*)"/g;
const BAD_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/;

/**
 * Tag-stack well-formedness check. Returns { errors: string[], elements: [{ name, attrs, classes, ctx }] } where
 * ctx is 'd' / 'm' inside the desktop / phone composition and 'shared' elsewhere. <style> content is skipped.
 * @example checkXml(svg).errors.length === 0
 */
export function checkXml(markup) {
  const errors = [], elements = [], stack = [];
  let i = 0, roots = 0;
  const checkAmp = (s, where) => { if (BAD_AMP.test(s)) errors.push(`unescaped "&" in ${where}`); };
  while (i < markup.length) {
    const lt = markup.indexOf('<', i);
    checkAmp(markup.slice(i, lt === -1 ? markup.length : lt), `text near offset ${i}`);
    if (lt === -1) break;
    TAG.lastIndex = lt;
    const m = TAG.exec(markup);
    if (!m) { errors.push(`malformed markup at offset ${lt}: ${JSON.stringify(markup.slice(lt, lt + 48))}`); break; }
    const [whole, closing, name, attrText, selfClosing] = m;
    i = lt + whole.length;
    if (closing) {
      const top = stack.pop();
      if (!top || top.name !== name) { errors.push(`</${name}> closes <${top ? top.name : 'nothing'}>`); break; }
      continue;
    }
    const attrs = new Map();
    for (const [, key, value] of attrText.matchAll(ATTR)) {
      if (attrs.has(key)) errors.push(`<${name}> repeats attribute "${key}"`);
      attrs.set(key, value);
      checkAmp(value, `<${name} ${key}>`);
    }
    const classes = (attrs.get('class') ?? '').split(/\s+/).filter(Boolean);
    const parent = stack.at(-1)?.ctx ?? 'shared';
    const ctx = parent === 'm' || classes.includes('m') ? 'm' : parent === 'd' || classes.includes('d') ? 'd' : 'shared';
    if (!stack.length) roots++;
    elements.push({ name, attrs, classes, ctx });
    if (selfClosing) continue;
    stack.push({ name, ctx });
    if (name === 'style') {
      const end = markup.indexOf('</style>', i);
      if (end === -1) { errors.push('<style> is never closed'); break; }
      i = end;
    }
  }
  if (stack.length) errors.push(`<${stack.at(-1).name}> is never closed`);
  if (roots !== 1) errors.push(`expected exactly one root element, found ${roots}`);
  return { errors, elements };
}

// ── CSS parsing ─────────────────────────────────────────────────────────────────────────────────
function parseDecls(body) {
  const decls = new Map();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon > 0) decls.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
  }
  return decls;
}

/** Rules (with selectors and declarations) and keyframes (name → [{ offsets, decls }]) of a CSS string. */
function parseCss(css, out = { rules: [], keyframes: new Map(), duplicates: [] }) {
  for (const block of cssBlocks(css)) {
    if (block.prelude.startsWith('@media')) parseCss(block.body, out);
    else if (block.prelude.startsWith('@keyframes')) {
      const name = block.prelude.slice('@keyframes'.length).trim();
      if (out.keyframes.has(name)) out.duplicates.push(name);
      out.keyframes.set(name, cssBlocks(block.body).map((f) => ({
        offsets: f.prelude.split(',').map((s) => (s.trim() === 'from' ? 0 : s.trim() === 'to' ? 100 : parseFloat(s))),
        decls: parseDecls(f.body),
      })));
    } else if (!block.prelude.startsWith('@')) {
      out.rules.push({ selectors: block.prelude.split(',').map((s) => s.trim()), decls: parseDecls(block.body) });
    }
  }
  return out;
}

const splitTop = (value, sep) => {
  const parts = [];
  let depth = 0, start = 0;
  for (let k = 0; k < value.length; k++) {
    if (value[k] === '(') depth++;
    else if (value[k] === ')') depth--;
    else if (depth === 0 && (sep === ' ' ? /\s/.test(value[k]) : value[k] === sep)) { parts.push(value.slice(start, k)); start = k + 1; }
  }
  parts.push(value.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
};

const TIME = /^-?(?:\d+|\d*\.\d+)m?s$/;
const toSeconds = (t) => (t.endsWith('ms') ? parseFloat(t) / 1000 : parseFloat(t));
const KEYWORDS = new Set(['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end', 'infinite', 'normal', 'reverse',
  'alternate', 'alternate-reverse', 'none', 'forwards', 'backwards', 'both', 'running', 'paused']);

/** One `animation` shorthand value → [{ name, duration, delay, timing, iteration }]. */
function parseAnimations(value) {
  return splitTop(value, ',').map((one) => {
    const a = { name: null, duration: 0, delay: 0, timing: 'ease', iteration: '1' };
    const times = [];
    for (const token of splitTop(one, ' ')) {
      if (TIME.test(token)) times.push(toSeconds(token));
      else if (/^(steps|cubic-bezier)\(/.test(token) || ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'step-start', 'step-end'].includes(token)) a.timing = token;
      else if (token === 'infinite' || /^\d+(\.\d+)?$/.test(token)) a.iteration = token;
      else if (!KEYWORDS.has(token)) a.name = token;
    }
    [a.duration = 0, a.delay = 0] = times;
    return a;
  });
}

/** Steps per interval of a timing function (0 for smooth easing). */
const stepCount = (timing) => {
  if (timing === 'step-start' || timing === 'step-end') return 1;
  const m = /^steps\((\d+)/.exec(timing);
  return m ? Number(m[1]) : 0;
};

const TRANSFORMS_NEEDING_ORIGIN = /scale|skew|rotate|matrix/;

/**
 * Tier B motion policy for one animation: infinite; changing intervals longer than EVENT_MAX_S step at most
 * every MIN_STEP_S; smooth change ≤ SMOOTH_SHARE_MAX of the cycle.
 */
function tierBProblems(anim, frames, duration) {
  const problems = [];
  if (anim.iteration !== 'infinite') problems.push(`"${anim.name}" is a one-shot animation (tier B allows loops only)`);
  if (!(duration > 0)) return problems;
  const byOffset = new Map();
  for (const f of frames) for (const o of f.offsets) byOffset.set(o, new Map([...(byOffset.get(o) ?? []), ...f.decls]));
  if (!byOffset.has(0)) byOffset.set(0, null);
  if (!byOffset.has(100)) byOffset.set(100, null);
  const keys = [...byOffset.keys()].sort((a, b) => a - b);
  const visible = (d) => (d ? JSON.stringify([...d].filter(([k]) => k !== 'animation-timing-function').sort()) : null);
  let smooth = 0;
  for (let k = 0; k + 1 < keys.length; k++) {
    const from = byOffset.get(keys[k]), to = byOffset.get(keys[k + 1]);
    if (from && to && visible(from) === visible(to)) continue;
    const seconds = ((keys[k + 1] - keys[k]) / 100) * duration;
    const steps = stepCount(from?.get('animation-timing-function') ?? anim.timing);
    if (steps) {
      if (seconds > EVENT_MAX_S && seconds / steps < MIN_STEP_S) {
        problems.push(`"${anim.name}" ${keys[k]}%→${keys[k + 1]}% moves every ${(seconds / steps).toFixed(3)} s for ${seconds.toFixed(2)} s (> 8 repaints/s)`);
      }
    } else {
      smooth += seconds;
      if (seconds > EVENT_MAX_S) problems.push(`"${anim.name}" ${keys[k]}%→${keys[k + 1]}% eases smoothly for ${seconds.toFixed(2)} s (use steps())`);
    }
  }
  if (smooth / duration > SMOOTH_SHARE_MAX) problems.push(`"${anim.name}" changes smoothly for ${Math.round((smooth / duration) * 100)}% of its ${duration} s cycle`);
  return problems;
}

// ── SVG lint ────────────────────────────────────────────────────────────────────────────────────
/** Resolve a record budget ({ full, subset } or a number) for a font mode; SPEC §2 caps apply. */
function resolveBudget(file, budget, font, findings) {
  const spec = budgetFor(file);
  const pick = (b) => (b == null ? null : typeof b === 'number' ? b : b[font]);
  const own = pick(budget), cap = pick(spec);
  if (own != null && cap != null && own > cap) findings.push(finding('error', 'budget', `${file}: record budget ${own} B exceeds the SPEC §2 budget ${cap} B`));
  return own ?? cap;
}

/**
 * Lint one generated SVG.
 *   budget  { full, subset } or a number of bytes (defaults to the SPEC §2 budget of the file name)
 *   tier    'A' (hero, specimen) or 'B' (everything else, the default)
 *   font    embedding mode the file was built with (default: the active mode)
 * @example errorsOf(lintSvg('on-air.svg', svg, { budget: { full: 42000, subset: 18000 } }))
 */
export function lintSvg(file, svg, { budget, tier = 'B', font = fontMode() } = {}) {
  const F = [];
  const error = (rule, message) => F.push(finding('error', rule, `${file}: ${message}`));
  const bytes = Buffer.byteLength(svg);

  // document shape, size and budget
  if (!svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" ')) error('doc', 'must start with <svg xmlns="http://www.w3.org/2000/svg" …>');
  if (!svg.endsWith('</svg>\n') || svg.endsWith('\n\n')) error('doc', 'must end with "</svg>" and exactly one newline');
  if (svg.includes('\r')) error('doc', 'contains CR characters (write LF only)');
  if (bytes > HARD_CAP) error('size', `${bytes} B exceeds the ${HARD_CAP} B hard cap`);
  const limit = resolveBudget(file, budget, font, F);
  if (limit == null) error('budget', 'no byte budget (pass `budget` in the record)');
  else if (bytes > limit) F.push(finding('warn', 'budget', `${file}: ${bytes} B is over its ${font}-font budget of ${limit} B`));
  if (tier !== 'A' && tier !== 'B') error('tier', `unknown tier "${tier}"`);
  if (tier === 'A' && !TIER_A_FILES.has(file)) error('tier', `tier A motion is reserved for ${[...TIER_A_FILES].join(', ')}`);

  // everything below reads the file without the base64 font (it can contain any letters)
  // font-display:fallback is required: without it a browser paints no text at all while the face is pending.
  const fontFaces = svg.match(/@font-face\{font-family:VCR;src:url\(data:font\/woff2;base64,[A-Za-z0-9+/=]+\) format\("woff2"\);font-display:fallback\}/g) ?? [];
  if (fontFaces.length !== 1) error('font', `expected one embedded VCR woff2 @font-face with font-display:fallback, found ${fontFaces.length}`);
  const bare = svg.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,');

  // forbidden constructs (SPEC §3.5)
  const banned = [
    [/<script/i, '<script>'], [/<foreignObject/i, '<foreignObject>'], [/<image\b/i, '<image>'], [/<filter\b/i, '<filter>'],
    [/<fe[A-Z]/, 'filter primitives (feTurbulence, feDisplacementMap, …)'], [/<(animate|set|animateTransform|animateMotion)\b/, 'SMIL animation'],
    [/@import/i, '@import'], [/<!--/, 'comments'], [/blur\(/, 'blur()'], [/\b(NaN|undefined|Infinity)\b|\[object /, 'NaN / undefined / Infinity'],
    [/\b(rgb|rgba|hsl|hsla)\(/, 'rgb()/hsl() colors (use hex tokens)'],
  ];
  for (const [re, what] of banned) if (re.test(bare)) error('forbidden', `contains ${what}`);
  for (const m of bare.matchAll(/(?:xlink:)?href="([^"]*)"/g)) if (!m[1].startsWith('#')) error('external', `external href "${m[1]}"`);
  for (const m of bare.matchAll(/url\(([^)]*)\)/g)) if (!/^#[\w-]+$/.test(m[1]) && m[1] !== 'data:font/woff2;base64,') error('external', `url(${m[1]}) is not a local reference`);

  // well-formed markup, root attributes, title
  const { errors: xmlErrors, elements } = checkXml(bare);
  for (const e of xmlErrors) error('xml', e);
  const root = elements[0];
  const viewBox = root?.attrs.get('viewBox')?.split(/\s+/).map(Number) ?? [];
  const [W, H] = [viewBox[2], viewBox[3]];
  if (!(W > 0 && H > 0)) error('doc', 'missing viewBox');
  if (root?.attrs.get('role') !== 'img') error('a11y', 'root needs role="img"');
  const label = root?.attrs.get('aria-label') ?? '';
  if (!label.trim()) error('a11y', 'root needs a non-empty aria-label');
  const title = /<title>([^<]*)<\/title>/.exec(bare)?.[1];
  if (title !== label.replace(/&quot;/g, '"')) error('a11y', '<title> must repeat the aria-label');

  // ids and references
  const ids = new Map();
  for (const el of elements) if (el.attrs.has('id')) ids.set(el.attrs.get('id'), (ids.get(el.attrs.get('id')) ?? 0) + 1);
  for (const [id, n] of ids) if (n > 1) error('ids', `id "${id}" is used ${n} times`);
  for (const m of bare.matchAll(/url\(#([\w-]+)\)|href="#([\w-]+)"/g)) if (!ids.has(m[1] ?? m[2])) error('ids', `reference to missing id "${m[1] ?? m[2]}"`);

  // number format: ≤ 2 decimals in geometry attributes and in CSS lengths, times, angles and keyframe offsets.
  // Unitless scale factors and opacities may keep the 3-decimal values of the motion vocabulary (scale(1,1.015)).
  const GEOMETRY = /\s(x|y|x1|x2|y1|y2|width|height|r|rx|ry|cx|cy|d|transform|points|font-size|letter-spacing|stroke-width|offset)="([^"]*)"/g;
  for (const m of bare.matchAll(GEOMETRY)) if (/\d\.\d{3,}/.test(m[2])) error('numbers', `${m[1]}="${m[2].slice(0, 40)}" has more than 2 decimals`);
  const style = /<style>([\s\S]*?)<\/style>/.exec(bare)?.[1] ?? '';
  const longNumber = style.match(/\d*\.\d{3,}(?:px|%|m?s|deg)/);
  if (longNumber) error('numbers', `CSS value ${longNumber[0]} has more than 2 decimals`);

  // palette: grays are free, any other hue must be a token
  for (const m of bare.matchAll(/(?:fill|stroke|stop-color|flood-color|color)(?:="|:)(#[0-9a-fA-F]{3,8})\b/g)) {
    let hex = m[1].toLowerCase().slice(1);
    if (hex.length <= 4) hex = [...hex.slice(0, 3)].map((c) => c + c).join('');
    hex = `#${hex.slice(0, 6)}`;
    const gray = hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7);
    if (!gray && !PALETTE.has(hex)) error('palette', `color ${m[1]} is not a theme token (SPEC §3.1)`);
  }

  // text size minimums per composition (SPEC §3.2)
  if (W > 0) {
    const min = TYPE[typeClass(W)].min;
    for (const el of elements) {
      if (el.name !== 'text') continue;
      const size = Number(el.attrs.get('font-size'));
      const need = el.ctx === 'd' ? min.d : min.m;
      if (!(size >= need)) error('type', `${el.ctx === 'shared' ? 'shared' : el.ctx === 'd' ? 'desktop' : 'phone'} text at ${el.attrs.get('font-size')}u is below the ${need}u minimum`);
    }
  }

  // motion placement (SPEC §3.8)
  const blocks = cssBlocks(style);
  const noPref = blocks.filter((b) => `${b.prelude}{` === NO_PREFERENCE);
  if (noPref.length !== 1) error('motion', `expected one "${NO_PREFERENCE}…}" block, found ${noPref.length}`);
  if (!style.includes(REDUCE)) error('motion', `missing the reduced-motion block ${REDUCE}`);
  const outside = noPref.length ? style.slice(0, noPref[0].start) + style.slice(noPref[0].end) : style;
  if (/animation|@keyframes/.test(outside)) error('motion', 'animation or @keyframes outside the prefers-reduced-motion:no-preference block');

  // animations: defined keyframes, no filter, transform origins, tier B policy
  const css = parseCss(style);
  for (const name of css.duplicates) error('motion', `@keyframes ${name} is defined more than once`);
  for (const [name, frames] of css.keyframes) if (frames.some((f) => f.decls.has('filter'))) error('motion', `@keyframes ${name} animates filter`);
  const classRules = new Map(); // class → merged declarations of simple `.class` selectors
  const shorthands = []; // { selector, animations }
  for (const rule of css.rules) {
    for (const selector of rule.selectors) {
      const simple = /^\.([\w-]+)$/.exec(selector)?.[1];
      if (simple) classRules.set(simple, new Map([...(classRules.get(simple) ?? []), ...rule.decls]));
      if (rule.decls.has('animation')) shorthands.push({ selector, simple, animations: parseAnimations(rule.decls.get('animation')) });
    }
  }
  const animatedClasses = new Set(shorthands.map((s) => s.simple).filter(Boolean));
  for (const { selector, simple, animations } of shorthands) {
    for (const anim of animations) {
      const frames = css.keyframes.get(anim.name);
      if (!frames) { error('motion', `${selector} uses undefined @keyframes "${anim.name}"`); continue; }
      if (tier !== 'B') continue;
      // durations overridden by `animation-duration` on classes that share an element with this selector
      const durations = new Set([anim.duration]);
      if (simple) {
        for (const el of elements) {
          if (!el.classes.includes(simple)) continue;
          for (const c of el.classes) { const d = classRules.get(c)?.get('animation-duration'); if (d && c !== simple) durations.add(toSeconds(d)); }
        }
      }
      for (const d of durations) for (const p of tierBProblems(anim, frames, d)) error('tier-b', `${selector} ${p}`);
    }
  }
  for (const el of elements) {
    const decls = new Map(el.classes.flatMap((c) => [...(classRules.get(c) ?? [])]));
    const names = el.classes.flatMap((c) => shorthands.filter((s) => s.simple === c).flatMap((s) => s.animations.map((a) => a.name)));
    const reshapes = names.some((n) => (css.keyframes.get(n) ?? []).some((f) => TRANSFORMS_NEEDING_ORIGIN.test(f.decls.get('transform') ?? '')));
    if (reshapes && !(decls.has('transform-box') && decls.has('transform-origin'))) {
      error('motion', `<${el.name} class="${el.classes.join(' ')}"> scales/skews without transform-box and transform-origin`);
    }
  }

  // full-frame animated layers are transient events: they must carry class "ev" (hidden under reduced motion)
  if (W > 0) {
    for (const el of elements) {
      if (el.name !== 'rect' || el.classes.includes('ev')) continue;
      if (el.classes.some((c) => ['scan-d', 'scan-m', 'grain', 'band'].includes(c))) continue;
      const area = Number(el.attrs.get('width')) * Number(el.attrs.get('height'));
      if (area >= 0.5 * W * H && el.classes.some((c) => animatedClasses.has(c))) {
        error('events', `full-frame animated <rect class="${el.classes.join(' ')}"> must carry class "ev"`);
      }
    }
  }
  return F;
}

// ── content lint ────────────────────────────────────────────────────────────────────────────────
/**
 * Schema and hygiene of tv/content.mjs (SPEC §4.5): required fields, formats, uniqueness, no emoji.
 * @example errorsOf(lintContent(C))
 */
export function lintContent(C) {
  const F = [];
  const error = (message) => F.push(finding('error', 'content', message));
  const url = (u, where) => { if (typeof u !== 'string' || !/^(https:\/\/[^\s"<>]+|mailto:[^\s"<>@]+@[^\s"<>]+)$/.test(u)) error(`${where}: "${u}" is not an https or mailto URL`); };
  const str = (s, where) => { if (typeof s !== 'string' || !s.trim()) error(`${where} must be a non-empty string`); };
  const month = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;
  const walk = (v, where) => {
    if (typeof v === 'string') {
      if (EMOJI.test(v)) error(`${where} contains an emoji`);
      if (v !== v.trim() || /\s{2}|[\r\n\t]/.test(v)) error(`${where} has stray whitespace`);
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
  };
  walk(C, 'content');

  if (C.site !== 'https://olwtelet.vercel.app') error('site must be https://olwtelet.vercel.app (no trailing slash)');
  for (const k of ['handle', 'short', 'name', 'role', 'receiving', 'student', 'tagline', 'city']) str(C.identity?.[k], `identity.${k}`);
  if (C.bio?.lead?.length !== 3 || C.bio?.more?.length !== 2) error('bio needs 3 lead and 2 more sentences');
  [...(C.bio?.lead ?? []), ...(C.bio?.more ?? [])].forEach((s, i) => { str(s, `bio sentence ${i + 1}`); if (!/[.!?]$/.test(s)) error(`bio sentence ${i + 1} must end with punctuation`); });
  if (!C.mostly?.length) error('mostly must list the core stack');
  if (!Number.isInteger(C.signalLog?.since) || C.signalLog.since < 2008) error('signalLog.since must be a year like 2022');
  for (const [k, u] of Object.entries(C.links ?? {})) {
    url(u, `links.${k}`);
    if (u.startsWith(C.site) && !u.endsWith('/')) error(`links.${k}: site paths end with "/"`);
  }
  (C.work ?? []).forEach((w, i) => {
    for (const k of ['company', 'role', 'terms']) str(w[k], `work[${i}].${k}`);
    if (!month.test(w.since)) error(`work[${i}].since must look like "Sep 2026"`);
    url(w.url, `work[${i}].url`);
    if (!w.duties?.length) error(`work[${i}] needs its resume duties`);
    w.duties?.forEach((d, j) => str(d, `work[${i}].duties[${j}]`));
  });
  const slugs = new Set();
  (C.files ?? []).forEach((f, i) => {
    const where = `files[${i}] (${f.slug})`;
    if (f.no !== String(i + 1).padStart(2, '0')) error(`${where}: no must be "${String(i + 1).padStart(2, '0')}"`);
    if (!/^[a-z0-9-]+$/.test(f.slug ?? '') || slugs.has(f.slug)) error(`${where}: slug must be unique kebab-case`);
    slugs.add(f.slug);
    if (!['oss', 'web'].includes(f.kind)) error(`${where}: kind must be "oss" or "web"`);
    if (!['OPEN SOURCE', 'CLIENT WORK', 'PERSONAL PROJECT'].includes(f.category)) error(`${where}: unknown category "${f.category}"`);
    if (f.status !== f.status?.toUpperCase()) error(`${where}: status is uppercase`);
    for (const k of ['title', 'status', 'oneLiner', 'stack']) str(f[k], `${where}.${k}`);
    if (/[.]$/.test(f.oneLiner ?? '')) error(`${where}: oneLiner has no final period`);
    if ((f.kind === 'web') !== /^\d{4}$/.test(f.year ?? '')) error(`${where}: year is required for websites only`);
    url(f.url, `${where}.url`);
  });
  if (typeof C.fileUrl !== 'function') error('fileUrl must be a function of a file');
  str(C.certificatesTopic, 'certificatesTopic');
  (C.certificates ?? []).forEach((c, i) => {
    for (const k of ['title', 'issuer']) str(c[k], `certificates[${i}].${k}`);
    if (!month.test(c.date)) error(`certificates[${i}].date must look like "Aug 2026"`);
    url(c.url, `certificates[${i}].url`);
  });
  str(C.playlists?.description, 'playlists.description');
  (C.playlists?.items ?? []).forEach((p, i) => { str(p.name, `playlists.items[${i}].name`); url(p.url, `playlists.items[${i}].url`); });
  if (C.skills?.length !== 5 || C.skills.some((s) => s.length !== 2)) error('skills must be 5 [label, value] pairs');
  str(C.education, 'education');
  str(C.languages, 'languages');
  return F;
}

// ── README lint ─────────────────────────────────────────────────────────────────────────────────
const attrsOf = (tag) => new Map([...tag.matchAll(/\s([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));

/** Every URL string in the content (links, work, files, certificates, playlists) plus each file page. */
function contentUrls(C) {
  const urls = new Set();
  const walk = (v) => {
    if (typeof v === 'string' && /^(https?:|mailto:)/.test(v)) urls.add(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(C);
  for (const f of C.files) urls.add(C.fileUrl(f));
  return urls;
}

/**
 * README rules (SPEC §1.2, §8.3). Without tv markers the README is "not integrated yet": one warning, no errors.
 *   records  build records ({ file, alt, href }) of the local images, checked against the README <img> tags
 * @example lintReadme(fs.readFileSync('README.md', 'utf8'), C, records)
 */
export function lintReadme(md, C, records = []) {
  const F = [];
  const error = (rule, message) => F.push(finding('error', rule, `README: ${message}`));
  if (!hasRegions(md)) return [finding('warn', 'readme', 'README: no tv:begin/tv:end markers, regions not integrated yet')];
  try {
    const ids = Object.keys(extractRegions(md));
    const expected = REGION_IDS.filter((id) => ids.includes(id));
    if (ids.length !== REGION_IDS.length) error('regions', `missing regions: ${REGION_IDS.filter((id) => !ids.includes(id)).join(', ')}`);
    if (ids.join() !== expected.join()) error('regions', `regions out of order: ${ids.join(', ')}`);
  } catch (err) {
    error('regions', err.message);
  }

  const byFile = new Map(records.map((r) => [r.file, r]));
  const urls = contentUrls(C);
  for (const m of md.matchAll(/<img\b[^>]*>/g)) {
    const a = attrsOf(m[0]);
    const src = a.get('src') ?? '';
    if (!a.get('alt')?.trim()) error('img', `<img src="${src}"> needs alt text`);
    if (!/^\d+%$/.test(a.get('width') ?? '')) error('img', `<img src="${src}"> needs a percentage width`);
    if (a.has('height')) error('img', `<img src="${src}"> must not set height (GitHub turns it into max-height)`);
    const before = md.slice(0, m.index), after = md.slice(m.index + m[0].length);
    const open = before.lastIndexOf('<a '), close = before.lastIndexOf('</a>');
    const anchor = open > close ? attrsOf(md.slice(open, md.indexOf('>', open) + 1)) : null;
    if (!anchor || !/^\s*<\/a>/.test(after) || /<img\b/.test(before.slice(open + 2))) error('img', `<img src="${src}"> must be the only content of one <a>`);
    const local = /^assets\/tv\/([\w.-]+\.svg)$/.exec(src)?.[1];
    if (local && records.length) {
      const rec = byFile.get(local);
      if (!rec) error('img', `${src} is not produced by any family`);
      else {
        if (unescapeAttr(a.get('alt') ?? '') !== rec.alt) error('img', `${src} alt differs from its build record`);
        if (anchor && unescapeAttr(anchor.get('href') ?? '') !== rec.href) error('img', `${src} link differs from its build record`);
      }
    } else if (!local && src !== C.links.signalLog) {
      error('img', `unexpected image source ${src}`);
    }
  }
  for (const m of md.matchAll(/<summary>([\s\S]*?)<\/summary>/g)) {
    if (!/^<b>[^<>]+<\/b> · [^<>]+$/.test(m[1]) || /^[▸►]/.test(m[1])) error('summary', `<summary>${m[1]}</summary> must be "<b>LABEL</b> · description"`);
  }
  for (const m of md.matchAll(/<[a-z][^>]*>/g)) {
    for (const [, value] of m[0].matchAll(/="([^"]*)"/g)) if (BAD_AMP.test(value)) error('escape', `attribute value "${value.slice(0, 60)}" needs &amp;`);
  }
  const found = [...md.matchAll(/(?:href|src)="([^"]+)"|\]\(([^)\s]+)\)/g)].map((m) => unescapeAttr(m[1] ?? m[2]));
  for (const u of found) {
    if (u === '#top' || u.startsWith('assets/tv/')) continue;
    if (!urls.has(u)) error('links', `URL ${u} is not in tv/content.mjs`);
    if (u.startsWith(C.site) && !new URL(u).pathname.endsWith('/')) error('links', `${u} must end with "/"`);
  }
  for (const s of FORBIDDEN) if (md.includes(s)) error('strings', `forbidden string "${s}"`);
  if (EMOJI.test(md)) error('strings', 'contains an emoji');
  return F;
}
