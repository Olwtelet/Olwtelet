// The page's bones: the Y table, the rows and tiles, the row minimum, the byte budgets. Every tile in one place.
import { C, W } from './kit/draw.mjs';
import { cutWidth } from './kit/letters.mjs';
import { STRIP } from './kit/strip.mjs';
import { L, COPY, ALT, WALL } from './content.mjs';

export const L0 = STRIP + 34; // left margin of content
export const MIN_ROW = 150; // a row under this opens a line-strut gap on narrow columns

// ---- byte budgets, one line per tile: measured size plus 6 percent, rounded up to the next 100 B (rewritten at integration from
// the integrated build). A drawing that grows past its line fails the Bytes guard; its owner remeasures and rewrites the line. ----
export const FILE_LIMIT = 80000; // the hard limit for any file, and the budget of a tile not listed here
export const PAGE_LIMIT = 400000;
export const BUDGET = {
  'a1-tower': 40100,
  'a2-shadow-1': 3100,
  'a2-email': 5600,
  'a3-shadow-2': 3000,
  'a3-linkedin': 3200,
  'a4-shadow-3': 2100,
  'a4-resume': 3800,
  'b1-demo': 26000,
  'b2-bad-data': 28600,
  'b3-unexpected': 9500,
  'b4-break-in': 11700,
  'c1-hold': 29100,
  'c2-security': 35900,
  'c3-productions': 26600,
  'c4-diseens': 23400,
  'c5-brain': 18500,
  'c5-study': 22000,
  'd0-credits': 5300,
  'd1-productions': 8800,
  'd2-veil': 9100,
  'd3-diseens': 8800,
  'd4-filmes': 8800,
  'z1-email': 18300,
  'z2-portfolio': 6800,
  'z2-resume': 4600,
  'z2-linkedin': 4400,
  'z3-projects': 4700,
  'z3-konect': 4700,
  'z3-orcid': 5000,
};

// ---- the Y table: every section boundary, in u ----
export const Y = {
  towerEnd: 1040, shadowRowH: 200, shadowEnd: 1640,
  demoInk0: 2040, demoLine: 2030, legend: 2110, acid: 2240, care: 2500, t: 2670,
  d1: 356, d2: 880, h3words: 366,
  holdEnd: 4686, // where the hold stops, and with it the first part of the page
};
Y.hitsEnd = Y.t + 1690;
Y.security = Y.holdEnd; Y.productions = Y.security + 640; Y.diseens = Y.productions + 970; Y.study = Y.diseens + 845;
Y.credits = Y.study + 300; Y.courses = Y.credits + 150;

// The courses of the wall: one WALL entry is one row, and everything below it re-flows. Each name is forced to the wall's
// measure in the cut face that needs the least stretch: for wide and condensed, the cap height that fills the measure, held
// to 60..150; then the stretch that fills it at that height, kept only if it is 0.6..1.75; the smallest |ln xs| wins, wide on a tie.
export const WALL_MEASURE = W - L0 - 28;
const COURSE_ROOM = 88; // over a name's letters: its rise across the wall, and its caption under the high end
const WALL_TAIL = 52; // the tower on the row below stands taller than that row: the last course leaves its head clear of the caption
const LETTER = [60, 150];
let courseY = Y.courses;
export const COURSES = WALL.map((c, i) => {
  const fits = ['wide', 'cond'].map((face) => {
    const h1 = (WALL_MEASURE * 140) / cutWidth(c.name, 140, 0, face);
    const letter = Math.min(LETTER[1], Math.max(LETTER[0], h1));
    return { face, letter, xs: WALL_MEASURE / cutWidth(c.name, letter, 0, face) };
  }).filter((f) => f.xs >= 0.6 && f.xs <= 1.75);
  if (!fits.length) throw new Error(`no cut face fits ${c.name} to the wall`);
  const best = fits.reduce((a, b) => (Math.abs(Math.log(b.xs)) < Math.abs(Math.log(a.xs)) - 1e-9 ? b : a));
  const y = courseY, h = Math.ceil(best.letter) + COURSE_ROOM;
  courseY += h;
  return { ...c, tile: `d${i + 1}-${c.slug}`, face: best.face, letter: best.letter, xs: best.xs, y, h };
});
COURSES.at(-1).h += WALL_TAIL;
Y.lights = courseY + WALL_TAIL;
// The end roll's link rows. `fg` is each sign's light: EMAIL and the portfolio in LED cyan, the resume mint, LinkedIn pink,
// projects amber, Konect violet, ORCID green.
// Firefox lays out to 1/60 px and truncates, so a row's shares must land on it at the real columns or the row stops short of the edge.
export const LIGHT_ROWS = [
  { y: Y.lights, h: 340, letterY: 64, letter: 176, tiles: [{ word: COPY.words.email, share: 1, fg: C.led, href: L.email, name: 'z1-email', alt: ALT.lightsEmail, print: COPY.emailAddress, printPhone: COPY.emailAddress }] },
  { y: Y.lights + 340, h: 180, letterY: 40, letter: 62, tiles: [{ word: COPY.words.portfolio, share: 0.4, fg: C.led, href: L.portfolio, name: 'z2-portfolio', alt: ALT.portfolio }, { word: COPY.words.resume, share: 0.3, fg: C.mint, href: L.resume, name: 'z2-resume', alt: ALT.resumeLink }, { word: COPY.words.linkedin, share: 0.3, fg: C.pink, href: L.linkedin, name: 'z2-linkedin', alt: ALT.linkedinLink }] },
  { y: Y.lights + 520, h: 180, letterY: 40, letter: 62, tiles: [{ word: COPY.words.projects, share: 0.4, fg: C.amber, href: L.projects, name: 'z3-projects', alt: ALT.projects }, { word: COPY.words.konect, share: 0.3, fg: C.rimViolet, href: L.konect, name: 'z3-konect', alt: ALT.konect }, { word: COPY.words.orcid, share: 0.3, fg: C.rimGreen, href: L.orcid, name: 'z3-orcid', alt: ALT.orcid }] },
];
Y.end = Y.lights + 700;
// below the opening, nothing settled may show until the sky comes on; the film stops at this seam
Y.filmEnd = Y.t + 1010;

// ---- the rows. Every tile is one link; slicing follows meaning, never the grid. css names a generator in score.mjs ----
const row3 = (i) => ({ y: Y.towerEnd + i * Y.shadowRowH, h: Y.shadowRowH, css: 'open' });
const H1 = 540, H2 = 470;
export const SLICES = [
  { y: 0, h: Y.towerEnd, css: 'open', tiles: [{ share: 1, name: 'a1-tower', href: L.portfolio, alt: ALT.tower }] },
  { ...row3(0), tiles: [{ share: 0.55, name: 'a2-shadow-1', href: L.portfolio, alt: ALT.shadow }, { share: 0.45, name: 'a2-email', href: L.email, alt: ALT.email }] },
  { ...row3(1), tiles: [{ share: 0.55, name: 'a3-shadow-2', href: L.portfolio, alt: ALT.shadow2 }, { share: 0.45, name: 'a3-linkedin', href: L.linkedin, alt: ALT.linkedin }] },
  { ...row3(2), tiles: [{ share: 0.55, name: 'a4-shadow-3', href: L.portfolio, alt: ALT.shadow3 }, { share: 0.45, name: 'a4-resume', href: L.resume, alt: ALT.resume }] },
  { y: Y.shadowEnd, h: Y.t - Y.shadowEnd, css: 'open', tiles: [{ share: 1, name: 'b1-demo', href: L.portfolio, alt: ALT.demo }] },
  { y: Y.t, h: H1, css: 'open', tiles: [{ share: 1, name: 'b2-bad-data', href: L.projects, alt: ALT.hit1 }] },
  { y: Y.t + H1, h: H2, css: 'open', tiles: [{ share: 1, name: 'b3-unexpected', href: L.projects, alt: ALT.hit2 }] },
  { y: Y.t + H1 + H2, h: Y.hitsEnd - Y.t - H1 - H2, css: 'crk', tiles: [{ share: 1, name: 'b4-break-in', href: L.portfolio, alt: ALT.hit3 }] },
  { y: Y.hitsEnd, h: Y.holdEnd - Y.hitsEnd, tiles: [{ share: 1, name: 'c1-hold', href: L.portfolio, alt: ALT.hold }] },
  { y: Y.security, h: Y.productions - Y.security, tiles: [{ share: 1, name: 'c2-security', href: L.resume, alt: ALT.security }] },
  { y: Y.productions, h: Y.diseens - Y.productions, css: 'hop', tiles: [{ share: 1, name: 'c3-productions', href: L.portfolio, alt: ALT.productions }] },
  { y: Y.diseens, h: Y.study - Y.diseens, css: 'stp', tiles: [{ share: 1, name: 'c4-diseens', href: L.portfolio, alt: ALT.diseens }] },
  { y: Y.study, h: Y.credits - Y.study, tiles: [{ share: 0.625, name: 'c5-brain', href: L.brain, alt: ALT.brain }, { share: 0.375, name: 'c5-study', href: L.resume, alt: ALT.study }] },
  { y: Y.credits, h: Y.courses - Y.credits, tiles: [{ share: 1, name: 'd0-credits', href: L.portfolio, alt: ALT.wallLead }] },
  ...COURSES.map((r) => ({ y: r.y, h: r.h, tiles: [{ share: 1, name: r.tile, href: r.href, alt: [`${r.name}. ${r.cap.replace(/\.$/, '')}.`, r.goes].filter(Boolean).join(' ') }] })),
  ...LIGHT_ROWS.map((r) => ({ y: r.y, h: r.h, tiles: r.tiles.map((t) => ({ share: t.share, name: t.name, href: t.href, alt: t.alt })) })),
];
