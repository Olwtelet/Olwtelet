// The page's bones: the Y table, the rows and tiles, the row minimum, the byte budgets. Every tile in one place.
import { C, W } from './kit/draw.mjs';
import { cutWidth } from './kit/letters.mjs';
import { STRIP } from './kit/strip.mjs';
import { L, COPY, ALT, WALL } from './content.mjs';

export const L0 = STRIP + 34; // left margin of content
export const MIN_ROW = 150; // a row under this opens a line-strut gap on narrow columns

// ---- byte budgets, one line per tile: measured size plus 6 percent, rounded up to the next 100 B ----
export const FILE_LIMIT = 80000; // the hard limit for any file, and the budget of a tile not listed here
export const PAGE_LIMIT = 400000;
export const BUDGET = {
  'a1-tower': 44100,
  'a2-shadow-1': 3400,
  'a2-email': 6600,
  'a3-shadow-2': 3900,
  'a3-linkedin': 4700,
  'a4-shadow-3': 2800,
  'a4-resume': 3800,
  'b1-demo': 24800,
  'b2-bad-data': 12300,
  'b3-unexpected': 11900,
  'b4-break-in': 8000,
  'c1-hold': 14100,
  'c2-ordfall': 28400,
  'c3-productions': 38100,
  'c4-diseens': 23000,
  'c5-brain': 21300,
  'c5-study': 21100,
  'd0-credits': 7100,
  'd1-ordfall': 8300,
  'd2-productions': 7000,
  'd3-diseens': 9500,
  'z1-email': 6200,
  'z2-portfolio': 1400,
  'z2-resume': 1400,
  'z2-linkedin': 1700,
  'z3-projects': 1300,
  'z3-konect': 1200,
  'z3-orcid': 1200,
};

// ---- the Y table: every section boundary, in u ----
export const Y = {
  towerEnd: 1040, shadowRowH: 200, shadowEnd: 1640,
  demoInk0: 2040, demoLine: 2030, legend: 2110, acid: 2240, care: 2500, t: 2670,
  d1: 356, d2: 880, h3words: 366,
  holdEnd: 4686, // where the hold stops, and with it the first part of the page
};
Y.hitsEnd = Y.t + 1690;
Y.ordfall = Y.holdEnd; Y.productions = Y.ordfall + 640; Y.diseens = Y.productions + 970; Y.study = Y.diseens + 845;
Y.credits = Y.study + 300; Y.courses = Y.credits + 150;

// the courses of the wall: one WALL entry is one row, and everything below it re-flows
const WALL_MEASURE = W - L0 - 28;
const COURSE_ROOM = 88; // over a name's letters: its rise across the wall, and its caption under the high end
const WALL_TAIL = 52; // the tower on the row below stands taller than that row: the last course leaves its head clear of the caption
let courseY = Y.courses;
export const COURSES = WALL.map((c, i) => {
  const cw140 = cutWidth(c.name, 140);
  // the stretch is capped both ways: past these the wedge alphabet turns into wood type
  const hMin = WALL_MEASURE / (1.75 * cw140 / 140), hMax = WALL_MEASURE / (0.6 * cw140 / 140);
  const letter = Math.max(hMin * 1.05, Math.min(104, hMax)); // 1.05: at the cap itself a name loses its kerning
  const y = courseY, h = Math.ceil(letter) + COURSE_ROOM;
  courseY += h;
  return { ...c, tile: `d${i + 1}-${c.slug}`, letter, xs: WALL_MEASURE / cutWidth(c.name, letter), y, h };
});
COURSES.at(-1).h += WALL_TAIL;
Y.lights = courseY + WALL_TAIL;
// Firefox lays out to 1/60 px and truncates, so a row's shares must land on it at the real columns or the row stops short of the edge.
export const LIGHT_ROWS = [
  { y: Y.lights, h: 340, letterY: 64, letter: 176, tiles: [{ word: COPY.words.email, share: 1, fg: C.toka, href: L.email, name: 'z1-email', alt: ALT.lightsEmail, print: COPY.emailAddress, printPhone: COPY.emailAddress }] },
  { y: Y.lights + 340, h: 180, letterY: 40, letter: 62, tiles: [{ word: COPY.words.portfolio, share: 0.4, fg: C.douga, href: L.portfolio, name: 'z2-portfolio', alt: ALT.portfolio }, { word: COPY.words.resume, share: 0.3, fg: C.douga, href: L.resume, name: 'z2-resume', alt: ALT.resumeLink }, { word: COPY.words.linkedin, share: 0.3, fg: C.douga, href: L.linkedin, name: 'z2-linkedin', alt: ALT.linkedinLink }] },
  { y: Y.lights + 520, h: 180, letterY: 40, letter: 62, tiles: [{ word: COPY.words.projects, share: 0.4, fg: C.douga, href: L.projects, name: 'z3-projects', alt: ALT.projects }, { word: COPY.words.konect, share: 0.3, fg: C.douga, href: L.konect, name: 'z3-konect', alt: ALT.konect }, { word: COPY.words.orcid, share: 0.3, fg: C.douga, href: L.orcid, name: 'z3-orcid', alt: ALT.orcid }] },
];
Y.end = Y.lights + 700;
// below the opening, nothing settled may show until the sky comes on; the film stops at this seam
Y.filmEnd = Y.t + 1010;

export const PEG = { x: 620, y: Y.holdEnd - 40 }; // the real holes through the base paper, at the foot of the hold

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
  { y: Y.t + H1 + H2, h: Y.hitsEnd - Y.t - H1 - H2, css: 'crk', tiles: [{ share: 1, name: 'b4-break-in', href: L.ordfall, alt: ALT.hit3 }] },
  { y: Y.hitsEnd, h: Y.holdEnd - Y.hitsEnd, tiles: [{ share: 1, name: 'c1-hold', href: L.portfolio, alt: ALT.hold }] },
  { y: Y.ordfall, h: Y.productions - Y.ordfall, tiles: [{ share: 1, name: 'c2-ordfall', href: L.ordfall, alt: ALT.ordfall }] },
  { y: Y.productions, h: Y.diseens - Y.productions, css: 'hop', tiles: [{ share: 1, name: 'c3-productions', href: L.portfolio, alt: ALT.productions }] },
  { y: Y.diseens, h: Y.study - Y.diseens, css: 'stp', tiles: [{ share: 1, name: 'c4-diseens', href: L.portfolio, alt: ALT.diseens }] },
  { y: Y.study, h: Y.credits - Y.study, tiles: [{ share: 0.625, name: 'c5-brain', href: L.brain, alt: ALT.brain }, { share: 0.375, name: 'c5-study', href: L.resume, alt: ALT.study }] },
  { y: Y.credits, h: Y.courses - Y.credits, tiles: [{ share: 1, name: 'd0-credits', href: L.portfolio, alt: ALT.wallLead }] },
  ...COURSES.map((r) => ({ y: r.y, h: r.h, tiles: [{ share: 1, name: r.tile, href: r.href, alt: [`${r.name}. ${r.cap.replace(/\.$/, '')}.`, r.goes].filter(Boolean).join(' ') }] })),
  ...LIGHT_ROWS.map((r) => ({ y: r.y, h: r.h, tiles: r.tiles.map((t) => ({ share: t.share, name: t.name, href: t.href, alt: t.alt })) })),
];
