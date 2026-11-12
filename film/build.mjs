// The film, built once: one page coordinate system, sliced into tiles at emit time.
//
//   node film/build.mjs           writes README.md and assets/film/*.svg
//   node film/build.mjs --check   builds twice, compares with disk and runs the guards; writes nothing
import fs from 'node:fs';
import { C, W, ANG, SHEAR } from './kit/draw.mjs';
import { Page } from './kit/canvas.mjs';
import { GuardError } from './kit/letters.mjs';
import { faces } from './kit/type.mjs';
import { strip } from './kit/strip.mjs';
import { L, COPY, ALT, WALL, SIGNS, PLAIN, NOTICE } from './content.mjs';
import * as layout from './layout.mjs';
import * as score from './score.mjs';
import * as opening from './sections/opening.mjs';
import * as demo from './sections/demo.mjs';
import * as hits from './sections/hits.mjs';
import * as hold from './sections/hold.mjs';
import * as security from './sections/security.mjs';
import * as productions from './sections/productions.mjs';
import * as diseens from './sections/diseens.mjs';
import * as study from './sections/study.mjs';
import * as credits from './sections/credits.mjs';
import * as lights from './sections/lights.mjs';

const { Y, L0, SLICES, COURSES, LIGHT_ROWS, BUDGET, FILE_LIMIT, PAGE_LIMIT } = layout;
const ROOT = new URL('../', import.meta.url);
const OUT = new URL('assets/film/', ROOT);
const README = new URL('README.md', ROOT);

// Paint order is call order. A section that must paint over a later one asks for it with ctx.after(name, fn).
const SECTIONS = { opening, demo, hits, hold, security, productions, diseens, study, credits, lights };

export function buildFilm() {
  const page = new Page(W);
  const later = {};
  const ctx = {
    Y, C, faces, COPY, ALT, L, WALL, SIGNS, ANG, SHEAR, L0,
    courses: COURSES, lightRows: LIGHT_ROWS, score,
    after: (name, fn) => { (later[name] ||= []).push(fn); },
  };

  // the base: black, overdrawing the canvas, so no page colour shows at any tile's edge in either theme
  page.rings([[[[-14, -14], [W + 14, -14], [W + 14, Y.end + 14], [-14, Y.end + 14]]]], `fill="${C.black}"`);
  for (const [name, section] of Object.entries(SECTIONS)) {
    section.draw(page, ctx);
    for (const fn of later[name] || []) fn();
  }
  strip(page, ctx);

  // slices
  const files = new Map();
  const tiles = [];
  let md = `${NOTICE}\n<p>\n`;
  for (const s of SLICES) {
    let x = 0, line = '';
    for (const t of s.tiles) {
      const w = W * t.share;
      const tile = page.emit({ file: `${t.name}.svg`, x, y: s.y, w, h: s.h, share: t.share, css: score.TILE_CSS[s.css] || '' });
      files.set(tile.file, tile.svg);
      tiles.push({ ...tile, name: t.name, alt: t.alt, href: t.href, css: s.css });
      const pct = +(t.share * 100).toFixed(4);
      line += `<a href="${t.href}"><img src="assets/film/${t.name}.svg" width="${pct}%" align="top" alt="${t.alt.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"></a>`;
      x += w;
    }
    md += line + '\n';
  }
  md += '</p>\n\n' + PLAIN;
  return { page, files, tiles, readme: md };
}

function report(film) {
  let total = 0;
  for (const t of film.tiles) {
    total += t.bytes;
    console.log(`${t.name.padEnd(22)} ${String(t.bytes).padStart(7)} / ${String(BUDGET[t.name] ?? FILE_LIMIT).padStart(6)}  ${Math.round(t.w)}x${t.h} y${t.y}`);
  }
  console.log(`TOTAL ${total} / ${PAGE_LIMIT}, ${film.tiles.length} tiles`);
}

function write(film) {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const [file, svg] of film.files) fs.writeFileSync(new URL(file, OUT), svg);
  fs.writeFileSync(README, film.readme);
}

async function check() {
  let film, again;
  try { film = buildFilm(); again = buildFilm(); } catch (e) {
    if (!(e instanceof GuardError)) throw e;
    console.log(`FAIL ${e.guard}: ${e.message}`);
    return 1;
  }
  const { runGuards } = await import('./guards/static.mjs');
  const results = runGuards({ film, again, root: ROOT, out: OUT, readmePath: README, layout, score });
  report(film);
  let bad = 0;
  for (const [guard, fails] of results) {
    console.log(`${fails.length ? 'FAIL' : 'pass'} ${guard}${fails.length ? `: ${fails.length}` : ''}`);
    for (const f of fails) console.log(`     ${f}`);
    bad += fails.length;
  }
  console.log(bad ? `${bad} guard failure(s)` : 'all guards pass');
  return bad ? 1 : 0;
}

if (process.argv.includes('--check')) process.exitCode = await check();
else {
  try {
    const film = buildFilm();
    write(film);
    report(film);
  } catch (e) {
    if (!(e instanceof GuardError)) throw e;
    console.log(`FAIL ${e.guard}: ${e.message}`);
    process.exitCode = 1;
  }
}
