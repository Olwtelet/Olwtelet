// The guards that fail the build. Run by `node film/build.mjs --check`. Node only, no browser.
// One function per guard, plus the section-purity rule.
// Each returns a list of failures in plain words; an empty list is a pass.
import fs from 'node:fs';
import { C, W } from '../kit/draw.mjs';
import { CUT } from '../kit/letters.mjs';
import { faces } from '../kit/type.mjs';
import * as content from '../content.mjs';

const { L, COPY, ALT, OWN_WORDS, NOTICE, PLAIN } = content;

// Known departures from a floor, each with its reason and owner. Do not add to this list to make a build pass.
const CUT_FLOOR_WAIVERS = new Map([]);

// ---------------------------------------------------------------- helpers
const walkStrings = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkStrings(x, out)); return out; };
const contentStrings = () => Object.values(content).flatMap((v) => walkStrings(v));
const styleOf = (svg) => (svg.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];

// split a stylesheet into what is inside prefers-reduced-motion:no-preference and what is outside it
function splitMotion(css) {
  const head = '@media (prefers-reduced-motion:no-preference){';
  let inside = '', outside = '', i = 0;
  while (i < css.length) {
    const at = css.indexOf(head, i);
    if (at < 0) { outside += css.slice(i); break; }
    outside += css.slice(i, at);
    let depth = 1, j = at + head.length;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    inside += css.slice(at + head.length, j - 1);
    i = j;
  }
  return { inside, outside };
}

// walk the element tree of an emitted SVG. cb(tag, classes, ancestorsClasses)
function walkTree(svg, cb) {
  const src = svg.replace(/<style>[\s\S]*?<\/style>/, '');
  const stack = [], errors = [];
  for (const m of src.matchAll(/<(\/?)([a-zA-Z]+)([^<>]*?)(\/?)>/g)) {
    const [, close, tag, attrs, self] = m;
    if (close) { const top = stack.pop(); if (!top || top.tag !== tag) errors.push(`unbalanced </${tag}>`); continue; }
    const cm = /\bclass="([^"]*)"/.exec(attrs);
    const classes = cm ? cm[1].split(/\s+/).filter(Boolean) : [];
    cb(tag, classes, stack.flatMap((e) => e.classes), attrs);
    if (!self) stack.push({ tag, classes });
  }
  if (stack.length) errors.push(`unclosed <${stack[stack.length - 1].tag}>`);
  return errors;
}

// bounding box of the first subpath of a path made by polyD: M x y, then relative l segments, then z
function firstSubpathBox(d) {
  const end = d.indexOf('z');
  const part = end < 0 ? d : d.slice(0, end);
  let x = 0, y = 0, a = 1e9, b = 1e9, c = -1e9, e = -1e9, first = true;
  for (const m of part.matchAll(/([Ml])(-?\d*\.?\d+)[ ]?(-?\d*\.?\d+)/g)) {
    const dx = +m[2], dy = +m[3];
    if (first) { x = dx; y = dy; first = false; } else { x += dx; y += dy; }
    if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > e) e = y;
  }
  return first ? null : [a, b, c, e];
}

// ---------------------------------------------------------------- Overflow
function overflow({ film }) {
  const fails = [];
  // a cut line past the margin without bleed: true has already stopped the build, in kit/letters.mjs
  for (const p of film.page.log.paras) {
    if (p.width > p.measure + 0.01) fails.push(`para line "${p.line}" is ${p.width.toFixed(1)}u wide against a measure of ${p.measure.toFixed(1)}u`);
    if (p.x < 0) fails.push(`para line "${p.line}" starts left of the column at x ${p.x.toFixed(1)}`);
  }
  // a text in a tile passes its right edge unless declared crossing
  const texts = film.page.items.filter((it) => it.kind === 'text');
  for (const t of film.tiles) {
    const right = t.x + t.w;
    for (const it of texts) {
      if (it.crossing) continue;
      const inside = it.gl.some((g) => g.ax >= t.x && g.ax < right && g.ay >= t.y && g.ay < t.y + t.h);
      if (!inside) continue;
      const reach = it.x + Math.cos((it.rot * Math.PI) / 180) * it.width;
      if (reach > right + 0.5) fails.push(`text "${it.str}" in ${t.name} reaches x ${reach.toFixed(1)} past the tile's right edge ${right}`);
    }
  }
  return fails;
}

// ---------------------------------------------------------------- Seam geometry
function seams({ film, layout }) {
  const fails = [];
  const { SLICES, MIN_ROW, Y } = layout;
  let yNext = 0;
  SLICES.forEach((s) => {
    if (s.h < MIN_ROW) fails.push(`row at y ${s.y} is ${s.h}u, under the ${MIN_ROW}u minimum`);
    if (Math.abs(s.y - yNext) > 1e-9) fails.push(`row at y ${s.y} leaves ${s.y > yNext ? 'a gap' : 'an overlap'} after y ${yNext}`);
    yNext = s.y + s.h;
    const sum = s.tiles.reduce((acc, t) => acc + +(t.share * 100).toFixed(4), 0);
    if (Math.abs(sum - 100) > 1e-9) fails.push(`row at y ${s.y}: shares sum to ${sum}, not 100`);
    let xNext = 0;
    for (const t of s.tiles) {
      const tile = film.tiles.find((f) => f.name === t.name);
      const vb = /viewBox="([^"]+)"/.exec(film.files.get(`${t.name}.svg`) || '');
      if (!vb) { fails.push(`${t.name}: no viewBox`); continue; }
      const [vx, vy, vw, vh] = vb[1].split(' ').map(Number);
      if (Math.abs(vw / W - t.share) > 1e-9) fails.push(`${t.name}: viewBox width ${vw} is ${vw / W} of the column, share is ${t.share}`);
      if (vh !== s.h || vy !== s.y) fails.push(`${t.name}: viewBox y ${vy} height ${vh} against row y ${s.y} height ${s.h}`);
      if (Math.abs(vx - xNext) > 1e-9) fails.push(`${t.name}: starts at x ${vx}, row is at x ${xNext}: a gap or overlap`);
      xNext = vx + vw;
      if (!tile) fails.push(`${t.name}: in the layout but not emitted`);
    }
    if (Math.abs(xNext - W) > 1e-9) fails.push(`row at y ${s.y} ends at x ${xNext}, not ${W}`);
  });
  if (yNext !== Y.end) fails.push(`the rows end at y ${yNext}, the canvas at ${Y.end}`);
  // each name in the credits and the links is its own link: a letter over its tile's edge opens the wrong one
  for (const c of film.page.log.cuts) {
    if (!c.tile) continue;
    const t = film.tiles.find((f) => f.name === c.tile), [x0, y0, x1, y1] = c.box;
    if (!t) fails.push(`"${c.text}" names a tile that is not emitted, ${c.tile}`);
    else if (x0 < t.x || y0 < t.y || x1 > t.x + t.w || y1 > t.y + t.h) fails.push(`"${c.text}" spans x ${x0.toFixed(1)} to ${x1.toFixed(1)}, y ${y0.toFixed(1)} to ${y1.toFixed(1)}, outside its tile ${t.name} at x ${t.x}, y ${t.y}, ${t.w}x${t.h}`);
  }
  // the markup: one row per line, no whitespace between tiles, widths that sum to 100, align top everywhere
  const body = film.readme.slice(film.readme.indexOf('<p>\n') + 4, film.readme.indexOf('\n</p>'));
  const lines = body.split('\n');
  if (lines.length !== SLICES.length) fails.push(`README has ${lines.length} rows, layout ${SLICES.length}`);
  for (const line of lines) {
    if (/<\/a>\s+<a/.test(line)) fails.push('README: whitespace between tiles of one row');
    const ws = [...line.matchAll(/width="([\d.]+)%"/g)].map((m) => +m[1]);
    if (Math.abs(ws.reduce((a, b) => a + b, 0) - 100) > 1e-9) fails.push(`README row widths ${ws.join('+')} do not sum to 100`);
    if ((line.match(/<img /g) || []).length !== (line.match(/align="top"/g) || []).length) fails.push('README: an image without align="top"');
  }
  return fails;
}

// ---------------------------------------------------------------- Ground
function ground({ film }) {
  const fails = [];
  for (const t of film.tiles) {
    const m = /^<path [^>]*?\bd="([^"]*)"/.exec(t.body);
    const box = m && firstSubpathBox(m[1]);
    if (!box) { fails.push(`${t.name}: the first thing painted is not a base path`); continue; }
    if (box[0] > t.x - 12 || box[1] > t.y - 12 || box[2] < t.x + t.w + 12 || box[3] < t.y + t.h + 12) fails.push(`${t.name}: base paper ${box.join(' ')} does not overdraw the viewBox by 12u`);
    if (!new RegExp(`^<path [^>]*fill="${C.douga}"`).test(t.body)) fails.push(`${t.name}: the base is not paper`);
  }
  return fails;
}

// ---------------------------------------------------------------- Lint
const BANNED = [[/<text\b/, '<text>'], [/<font\b/, '<font>'], [/@font-face/, '@font-face'], [/filter/i, 'filter'], [/gradient/i, 'gradient'], [/\bmask\b/i, 'mask'], [/mix-blend/i, 'mix-blend'], [/<animate/i, '<animate'], [/<set\b/i, '<set'], [/<script/i, '<script'], [/foreignObject/i, 'foreignObject'], [/<image/i, '<image'], [/will-change/i, 'will-change'], [/@import/i, '@import']];
function lint({ film }) {
  const fails = [];
  const palette = new Set(Object.values(C).map((h) => h.toLowerCase()));
  for (const [file, svg] of film.files) {
    for (const [re, name] of BANNED) if (re.test(svg)) fails.push(`${file}: ${name}`);
    for (const m of svg.matchAll(/url\(([^)]*)\)/g)) if (!/^#p[vbg]$/.test(m[1])) fails.push(`${file}: url(${m[1]}) is not a local pattern`);
    if (/https?:|\/\/www\./i.test(svg.replace('xmlns="http://www.w3.org/2000/svg"', ''))) fails.push(`${file}: an http reference other than the SVG namespace`);
    for (const m of svg.matchAll(/\bhref="([^"]*)"/g)) if (!m[1].startsWith('#')) fails.push(`${file}: href "${m[1]}" is not local`);
    // an id reference has to resolve, and a colour has to be in the palette
    const ids = new Set([...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    for (const m of svg.matchAll(/(?:href="#|url\(#)([^")]+)/g)) if (!ids.has(m[1])) fails.push(`${file}: #${m[1]} is referenced but not defined`);
    for (const m of svg.matchAll(/#[0-9a-fA-F]{6}\b/g)) if (!palette.has(m[0].toLowerCase())) fails.push(`${file}: ${m[0]} is not in the palette`);
    const errors = walkTree(svg, () => {});
    for (const e of errors) fails.push(`${file}: ${e}`);
  }
  return fails;
}

// ---------------------------------------------------------------- Motion
function motion({ film, layout, score }) {
  const fails = [];
  const FILM_LAYERS = ['im', 'sm', 'cv'];
  for (const t of film.tiles) {
    const svg = t.svg, css = styleOf(svg);
    const { inside, outside } = splitMotion(css);
    if (/@keyframes|animation\s*:/.test(outside)) fails.push(`${t.name}: @keyframes or animation outside prefers-reduced-motion:no-preference`);
    if (/\bstyle="/.test(svg.replace(/<style>[\s\S]*?<\/style>/, ''))) fails.push(`${t.name}: an inline style attribute`);
    const animated = new Set();
    for (const m of inside.matchAll(/([^{}]+)\{animation:([^}]*)\}/g)) {
      for (const sel of m[1].split(',')) animated.add(sel.trim().replace(/^\./, ''));
      if (!m[2].includes('steps(')) fails.push(`${t.name}: animation "${m[2]}" has no steps(`);
      if (/\b(linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier)\b/.test(m[2])) fails.push(`${t.name}: animation "${m[2]}" is eased`);
      const dur = /([\d.]+m?s)\b/.exec(m[2]);
      if (!dur || !score.DURATIONS.includes(dur[1])) fails.push(`${t.name}: duration ${dur ? dur[1] : '?'} is not derived from score.mjs`);
    }
    for (const m of inside.matchAll(/@keyframes\s+\w+\{((?:[\d.]+%\{[^}]*\})*)\}/g)) {
      for (const stop of m[1].matchAll(/%\{([^}]*)\}/g)) {
        for (const decl of stop[1].split(';').filter(Boolean)) {
          const prop = decl.split(':')[0].trim();
          if (prop !== 'opacity' && prop !== 'transform') fails.push(`${t.name}: keyframe property ${prop}`);
        }
      }
    }
    // every time and stop in a tile must be what score.mjs generates for it
    const gen = score.TILE_CSS[t.css];
    const expected = typeof gen === 'function' ? gen(t.body) : (gen || '');
    if (!css.endsWith(expected) || /@keyframes/.test(css.slice(0, css.length - expected.length))) fails.push(`${t.name}: its motion CSS is not what score.mjs generates`);
    if (!gen && /@keyframes|animation/.test(css)) fails.push(`${t.name}: motion in a tile the layout says is still`);
    // a display-switching class never sits on, or above, an animated element
    walkTree(svg, (tag, classes, above) => {
      if (!classes.some((c) => animated.has(c))) return;
      if (classes.includes('d') || classes.includes('m')) fails.push(`${t.name}: d or m on an animated element (${classes.join(' ')})`);
      else if (above.includes('d') || above.includes('m')) fails.push(`${t.name}: d or m above an animated element (${classes.join(' ')})`);
    });
    // film-only layers are off in base CSS, and stop at the seam under b3
    for (const c of FILM_LAYERS) {
      const used = new RegExp(`class="[^"]*\\b${c}\\b`).test(t.body);
      if (used && !new RegExp(`\\.${c}\\b[^{}]*\\{opacity:0\\}`).test(outside)) fails.push(`${t.name}: film layer .${c} is not opacity:0 in base CSS`);
      if (used && t.y >= layout.Y.filmEnd) fails.push(`${t.name}: film layer .${c} below the end of the film`);
    }
  }
  return fails;
}

// ---------------------------------------------------------------- Floors
function floors({ film }) {
  const fails = [];
  for (const it of film.page.items) {
    if (it.kind !== 'text') continue;
    const cls = (it.cls || '').split(/\s+/);
    const onPhone = !cls.includes('d'), onDesktop = !cls.includes('m');
    if (onPhone && it.size < 41) fails.push(`text "${it.str}" is ${it.size}u in the phone composition, under 41u`);
    if (onDesktop && it.size < 17) fails.push(`text "${it.str}" is ${it.size}u on desktop, under 17u`);
  }
  for (const c of film.page.log.cuts) {
    if (c.h < 41 && !CUT_FLOOR_WAIVERS.has(c.text)) fails.push(`cut line "${c.text}" is ${c.h.toFixed(1)}u tall, under 41u`);
    if (c.xs < 0.6 - 1e-9 || c.xs > 1.75 + 1e-9) fails.push(`cut line "${c.text}" is forced to ${c.xs.toFixed(2)} times its natural width, outside 0.6 to 1.75`);
  }
  // a character outside the alphabet or the cache stops the build at draw time; these catch one nothing drew yet
  for (const ch of new Set(contentStrings().join(''))) {
    if (ch < ' ') continue;
    if (!faces.gothic.glyphs[ch]) fails.push(`"${ch}" from content.mjs is not in the gothic glyph cache`);
    if (!faces.hand.glyphs[ch]) fails.push(`"${ch}" from content.mjs is not in the hand glyph cache`);
  }
  for (const c of film.page.log.cuts) for (const ch of c.text.toUpperCase()) if (!CUT[ch]) fails.push(`"${ch}" is not in the cut alphabet`);
  return fails;
}

// ---------------------------------------------------------------- Bytes
const GLYPH_CACHE_LIMIT = 60000;
function bytes({ film, layout, root }) {
  const fails = [];
  const { BUDGET, FILE_LIMIT, PAGE_LIMIT } = layout;
  let total = 0;
  for (const t of film.tiles) {
    total += t.bytes;
    const budget = BUDGET[t.name] ?? FILE_LIMIT;
    if (t.bytes > budget) fails.push(`${t.name}: ${t.bytes} B over its budget of ${budget} B`);
    if (t.bytes > FILE_LIMIT) fails.push(`${t.name}: ${t.bytes} B over the ${FILE_LIMIT} B limit`);
  }
  if (total > PAGE_LIMIT) fails.push(`the page is ${total} B, over ${PAGE_LIMIT} B`);
  const cache = fs.statSync(new URL('film/data/glyphs.json', root)).size;
  if (cache > GLYPH_CACHE_LIMIT) fails.push(`glyphs.json is ${cache} B, over ${GLYPH_CACHE_LIMIT} B`);
  return fails;
}

// ---------------------------------------------------------------- Content
const SENTENCES = {
  demo: 'A demo proves that software works once. What I care about is whether it keeps working with bad data, unexpected use and someone trying to break in.',
  ai: 'With AI, I use only what I can test, observe and constrain.',
  ordfall: 'Ordfall builds and secures the systems behind critical operations, enterprise value, and decisions that cannot fail.',
};
// built from pieces so that this file does not trip its own scan
const PRONOUN = new RegExp(`\\b(${['h' + 'e', 'h' + 'im', 'h' + 'is', 'h' + 'imself'].join('|')})\\b`, 'i');
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const OLD_THEME = /\b(channel|signal|broadcast|bezels?|scanlines?|smpte|vcr|vhs|crt|neon|glitch|circuit|binary|hud)\b|\bREC\b/i;
const MONTH_YEAR = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?) (20\d\d)\b/g;
const ALLOWED_MONTHS = new Set([]);

function sourceFiles(dir, types = /\.(mjs|md)$/, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const u = new URL(e.name + (e.isDirectory() ? '/' : ''), dir);
    if (e.isDirectory()) sourceFiles(u, types, out);
    else if (types.test(e.name)) out.push(u);
  }
  return out;
}

function contentGuard({ film, root }) {
  const fails = [];
  const strings = contentStrings();
  const md = film.readme;
  const urls = new Set(Object.values(L));
  // G2: the notice
  if (md.split('\n')[0] !== NOTICE || NOTICE !== '<!-- Generated by node film/build.mjs from film/content.mjs. Do not edit by hand. -->') fails.push('README: the first line is not the generated-file notice');
  // URLs in the markup, the markdown and the alts
  for (const m of md.matchAll(/\bhref="([^"]*)"/g)) if (!urls.has(m[1])) fails.push(`README href not in L: ${m[1]}`);
  for (const m of md.matchAll(/\]\(([^)]*)\)/g)) if (!urls.has(m[1])) fails.push(`README link not in L: ${m[1]}`);
  for (const t of film.tiles) {
    if (!urls.has(t.href)) fails.push(`${t.name}: href not in L: ${t.href}`);
    for (const m of (t.alt || '').matchAll(/(?:https?:\/\/|www\.|mailto:)[^\s"]*/g)) if (!urls.has(m[0])) fails.push(`${t.name}: alt URL not in L: ${m[0]}`);
  }
  for (const m of md.replace(/href="[^"]*"|\]\([^)]*\)/g, '').matchAll(/(?:https?:\/\/|www\.)[^\s"<)]*/g)) if (!urls.has(m[0])) fails.push(`README bare URL not in L: ${m[0]}`);
  // alts
  const alts = [...md.matchAll(/<img [^>]*\balt="([^"]*)"/g)].map((m) => m[1]);
  if (alts.length !== film.tiles.length) fails.push(`README has ${alts.length} alts for ${film.tiles.length} tiles`);
  const seen = new Set();
  for (const a of alts) { if (!a.trim()) fails.push('an empty alt'); if (seen.has(a)) fails.push(`a duplicate alt: ${a}`); seen.add(a); }
  for (const a of alts) if (/\bcontinued\b/i.test(a)) fails.push(`an alt that says continued: ${a}`);
  // the old theme
  for (const s of [...strings, md]) { const m = OLD_THEME.exec(s); if (m) fails.push(`a word from the old theme, "${m[0]}", in: ${s.slice(0, 60)}`); }
  // G1: nothing a visitor can read may gender the owner
  for (const s of strings) { const m = PRONOUN.exec(s); if (m) fails.push(`"${m[0]}" in content.mjs: ${s.slice(Math.max(0, m.index - 30), m.index + 30)}`); }
  { const m = PRONOUN.exec(md); if (m) fails.push(`"${m[0]}" in README.md: ${md.slice(Math.max(0, m.index - 30), m.index + 30)}`); }
  // ...and that includes comments that ship
  for (const u of sourceFiles(new URL('film/', root))) { const text = fs.readFileSync(u, 'utf8'), m = PRONOUN.exec(text); if (m) fails.push(`"${m[0]}" in ${u.pathname.split('/film/').pop()}: ${text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\n/g, ' ')}`); }
  // the three sentences, word for word
  for (const [k, s] of Object.entries(SENTENCES)) {
    if (OWN_WORDS[k] !== s) fails.push(`OWN_WORDS.${k} is not the sentence verbatim`);
    if (!PLAIN.includes(s) || !md.includes(s)) fails.push(`the ${k} sentence is not verbatim in the plain text`);
  }
  const down = [COPY.demoA, COPY.demoB, COPY.demoC, COPY.careA, COPY.careB, ...COPY.hit1, ...COPY.hit2, ...COPY.hit3].join(' ');
  if (down.toLowerCase() !== SENTENCES.demo.toLowerCase()) fails.push(`the sentence does not read verbatim down the page: ${down}`);
  if (SENTENCES.ai !== COPY.withAI.join(' ')) fails.push('the hold line is not the sentence about AI');
  if (SENTENCES.ordfall !== COPY.ordfallBody.join(' ')) fails.push('the Ordfall body is not the company\'s sentence');
  if (COPY.wallLead !== `Directed by ${COPY.name}.`) fails.push('the credits lead does not name the director');
  // the owner's title
  const TITLE = 'Director of Ordfall and Olwtelet Productions.';
  if (!COPY.who.join(' ').includes(TITLE)) fails.push('the title is absent from the who block');
  if (!COPY.whoPhone2.join(' ').includes(TITLE)) fails.push('the title is absent from the phone who block');
  if (!PLAIN.includes(TITLE)) fails.push('the title is absent from the plain text');
  for (const s of [...strings, md]) for (const m of s.matchAll(MONTH_YEAR)) if (!ALLOWED_MONTHS.has(m[0])) fails.push(`"${m[0]}" contradicts the dated facts: ${s.slice(0, 60)}`);
  // the mailto against the printed address
  const address = COPY.emailAddress;
  if (L.email !== `mailto:${address}`) fails.push(`L.email ${L.email} differs from the printed address ${address}`);
  for (const m of md.matchAll(/mailto:([^\s")]+)/g)) if (m[1] !== address) fails.push(`mailto:${m[1]} differs from the printed address ${address}`);
  for (const s of [...strings, md]) for (const m of s.matchAll(/[\w.-]+@[\w-]+(?:\.[\w-]+)+/g)) if (m[0] !== address) fails.push(`the address ${m[0]} differs from ${address}`);
  return fails;
}

// ---------------------------------------------------------------- Strip
function stripGuard({ film, root, layout }) {
  const fails = [];
  const year = JSON.parse(fs.readFileSync(new URL('film/data/year.json', root), 'utf8'));
  if (year.length !== 365) fails.push(`${year.length} rows, not 365`);
  const sum = year.reduce((a, d) => a + d.n, 0);
  let run = 0, best = 0; for (const d of year) { run = d.n ? run + 1 : 0; if (run > best) best = run; }
  // what the page prints about the strip is read back from the data, so a refresh that forgets the copy fails here
  const dated = (iso, names) => { const [y, m, d] = iso.split('-').map(Number); return `${names[m - 1]} ${d}, ${y}`; };
  const first = year[0]?.date ?? '0-1-1', last = year[year.length - 1]?.date ?? '0-1-1';
  const printed = [
    ['legendFull', COPY.legendFull.join(' '), [dated(first, COPY.months), dated(last, COPY.months), `${sum} in all, longest run ${best} days`]],
    ['legendPhone', COPY.legendPhone.join(' '), [`${sum} contributions`, dated(last, COPY.months)]],
    ['stripEnd', COPY.stripEnd, [dated(last, COPY.months)]],
    ['ALT.demo', ALT.demo, [dated(first, COPY.months), dated(last, COPY.months), `${sum} in all, longest run ${best} days`]],
    ['the strip paragraph of PLAIN', PLAIN.slice(PLAIN.indexOf('**The strip.**')), [dated(first, MONTH_NAMES), dated(last, MONTH_NAMES), `${sum} in all, longest run ${best} days`]],
  ];
  for (const [where, text, facts] of printed) for (const fact of facts) if (!text.includes(fact)) fails.push(`${where} does not say "${fact}", which is what film/data/year.json says`);
  year.forEach((d, i) => { if (Object.keys(d).join() !== 'date,n' || !Number.isInteger(d.n) || d.n < 0) fails.push(`row ${i} is not {date, n}`); });
  // the strip does not stop at the page's foot: 8030u of rows, and under them its end date, rotated, 234u long
  const end = film.page.items.find((it) => it.kind === 'text' && it.str === COPY.stripEnd);
  if (!end) fails.push('the strip\'s end date is not drawn');
  else if (end.y + 66 > layout.Y.end) fails.push(`the strip's end date reaches y ${end.y}, too close to the page's foot at y ${layout.Y.end}`);
  return fails;
}

// ---------------------------------------------------------------- Score
function scoreGuard({ film, score }) {
  const fails = [];
  const { SCORE, D, CHART_MARKS } = score;
  const frames = SCORE.reduce((a, [, n]) => a + n, 0);
  if (frames !== 63 || D !== 63) fails.push(`${frames} frames, not 63`);
  for (const [id, n] of SCORE) if (n < 3) fails.push(`drawing ${id} is ${n} frames, under 3`);
  const hits = SCORE.filter(([id]) => id === 'hit').length;
  if (hits !== 1) fails.push(`${hits} hits, not 1`);
  const ids = new Set(SCORE.map(([id]) => id));
  const marks = film.page.items.filter((it) => it.kind === 'text' && it.mark);
  for (const m of marks) if (!ids.has(m.str)) fails.push(`chart mark "${m.str}" is not in SCORE`);
  for (const k of CHART_MARKS) if (!marks.some((m) => m.str === k.id)) fails.push(`chart mark ${k.id} is not drawn`);
  return fails;
}

// ---------------------------------------------------------------- Determinism
const CLOCK = /\bMath\.random\b|\bDate\.now\b|\bnew Date\b|\bperformance\.now\b|\bprocess\.hrtime\b|\bcrypto\.random/;
function determinism({ film, again, out, readmePath, root }) {
  const fails = [];
  for (const [file, svg] of film.files) if (again.files.get(file) !== svg) fails.push(`${file}: two builds in one process differ`);
  if (film.readme !== again.readme) fails.push('README: two builds in one process differ');
  const onDisk = fs.existsSync(out) ? fs.readdirSync(out).sort() : [];
  const built = [...film.files.keys()].sort();
  for (const f of built) {
    if (!onDisk.includes(f)) fails.push(`${f}: built but not on disk`);
    else if (fs.readFileSync(new URL(f, out), 'utf8') !== film.files.get(f)) fails.push(`${f}: differs from disk`);
  }
  for (const f of onDisk) if (!built.includes(f)) fails.push(`${f}: on disk but not built`);
  if (!fs.existsSync(readmePath) || fs.readFileSync(readmePath, 'utf8') !== film.readme) fails.push('README.md differs from disk');
  // no clock and no unseeded randomness in anything the build runs; LF only
  const film0 = new URL('film/', root);
  for (const u of sourceFiles(film0, /\.json$/)) if (fs.readFileSync(u, 'utf8').includes('\r')) fails.push(`${u.pathname.split('/film/').pop()}: CRLF`);
  for (const u of sourceFiles(film0)) {
    const rel = u.pathname.split('/film/').pop(), text = fs.readFileSync(u, 'utf8');
    if (text.includes('\r')) fails.push(`${rel}: CRLF`);
    if (rel.startsWith('dev/') || rel === 'guards/static.mjs') continue;
    const m = CLOCK.exec(text);
    if (m) fails.push(`${rel}: ${m[0]}`);
  }
  for (const [file, svg] of film.files) if (svg.includes('\r')) fails.push(`${file}: CRLF`);
  if (film.readme.includes('\r')) fails.push('README.md: CRLF');
  return fails;
}

// ---------------------------------------------------------------- Section purity
// the string literals of a section, with template holes marked. Sections have no regex literals: a slash is a division.
function literals(src) {
  const out = [];
  let i = 0;
  const readTemplate = () => { // at the opening backtick
    let s = ''; i++;
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        s += '\u0000'; i += 2; let depth = 1;
        while (i < src.length && depth) {
          if (src[i] === '`') { readTemplate(); continue; }
          if (src[i] === '\'' || src[i] === '"') { readQuoted(); continue; }
          if (src[i] === '{') depth++; else if (src[i] === '}') depth--;
          i++;
        }
        continue;
      }
      s += src[i++];
    }
    i++; out.push(s);
  };
  const readQuoted = () => { const q = src[i++]; let s = ''; while (i < src.length && src[i] !== q) { if (src[i] === '\\') { s += src[i + 1]; i += 2; continue; } s += src[i++]; } i++; out.push(s); };
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i) + 2; continue; }
    if (c === '`') { readTemplate(); continue; }
    if (c === '\'' || c === '"') { readQuoted(); continue; }
    i++;
  }
  return out;
}
const HOLE = '\u0000';
const CLASS_TOKEN = new RegExp(`^(d|m|pl|sh|hc|cv|im|sm|tw|tp|gr|mk|gh|sky|crk|wed|hop|stp|g\\d|l\\d|g${HOLE}|l${HOLE}|${HOLE})$`);
const ATTRS = new RegExp(`^(fill|stroke)="${HOLE}"( stroke-width="[\\d.]+")?$`);
const allowedLiteral = (s, sectionNames) => s === '' || s === ' ' || sectionNames.includes(s) || ATTRS.test(s) || /^\.\.\/(kit\/\w+|content)\.mjs$/.test(s) || s.split(' ').every((t) => CLASS_TOKEN.test(t));

function purity({ root }) {
  const fails = [];
  const dir = new URL('film/sections/', root);
  const names = fs.readdirSync(dir).filter((f) => f.endsWith('.mjs'));
  const sectionNames = names.map((f) => f.replace('.mjs', '')); // ctx.after('hits', fn) names a section
  for (const name of names) {
    const src = fs.readFileSync(new URL(name, dir), 'utf8');
    const exports_ = [...src.matchAll(/^export\s+(.*)$/gm)].map((m) => m[1]);
    if (exports_.length !== 1 || !exports_[0].startsWith('function draw(page, ctx)')) fails.push(`${name}: must export one function, draw(page, ctx)`);
    for (const m of src.matchAll(/^import\s[^;]*?from\s+'([^']+)'/gm)) if (!/^\.\.\/kit\/\w+\.mjs$/.test(m[1]) && m[1] !== '../content.mjs') fails.push(`${name}: imports ${m[1]}; sections import from kit/ and content.mjs only`);
    if (/#[0-9a-fA-F]{3,8}\b/.test(src)) fails.push(`${name}: a hex value`);
    if (/https?:|mailto:|www\./i.test(src)) fails.push(`${name}: a URL`);
    if (/\b\d+(\.\d+)?m?s\b/.test(src) || /@keyframes|\banimation\b|steps\(/.test(src)) fails.push(`${name}: a time or a piece of motion`);
    for (const s of literals(src)) if (!allowedLiteral(s, sectionNames)) fails.push(`${name}: a string a visitor could read: "${s.replace(/\u0000/g, '${}')}"`);
  }
  return fails;
}

export function runGuards(args) {
  return [
    ['Overflow', overflow(args)],
    ['Seam geometry', seams(args)],
    ['Ground', ground(args)],
    ['Lint', lint(args)],
    ['Motion', motion(args)],
    ['Floors', floors(args)],
    ['Bytes', bytes(args)],
    ['Content', contentGuard(args)],
    ['Strip', stripGuard(args)],
    ['Score', scoreGuard(args)],
    ['Determinism', determinism(args)],
    ['Section purity', purity(args)],
  ];
}
