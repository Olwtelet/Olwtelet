// The page's bones: the Y table, the rows and tiles, the row minimum, the byte budgets. Every tile in one place.
import { C, W } from './kit/draw.mjs';
import { cutWidth } from './kit/letters.mjs';
import { yOfDay, STRIP } from './kit/strip.mjs';
import { L, COPY, ALT, WALL } from './content.mjs';

export const L0 = STRIP + 34; // left margin of content
export const MIN_ROW = 150; // a row under this opens a line-strut gap on narrow columns

// ---- byte budgets, one line per tile: measured size plus 6 percent, rounded up to the next 100 B ----
export const FILE_LIMIT = 80000; // the hard limit for any file, and the budget of a tile not listed here
export const PAGE_LIMIT = 400000;
export const BUDGET = {
  'a1-tower': 44900,
  'a2-shadow-1': 3600,
  'a2-email': 6700,
  'a3-shadow-2': 4000,
  'a3-linkedin': 4600,
  'a4-shadow-3': 2800,
  'a4-resume': 3900,
  'b1-demo': 24300,
  'b2-bad-data': 12900,
  'b3-unexpected': 11900,
  'b4-break-in': 10300,
  'c1-hold': 14500,
  'c2-integratek': 19800,
  'c3-agentforge': 45400,
  'c4-argus': 30400,
  'c5-resumex': 25000,
  'c6-anticheat': 25700,
  'c7-ordfall': 33700,
  'c8-brain': 21500,
  'c8-study': 22500,
  'd0-credits': 10800,
  'd1-ordfall': 8200,
  'd2-integratek': 8700,
  'd3-rocha-sa': 5600,
  'd4-thalita': 6200,
  'd5-instituto': 6100,
  'z1-email': 5600,
  'z2-portfolio': 1300,
  'z2-resume': 1400,
  'z2-linkedin': 1700,
  'z3-projects': 1300,
  'z3-konect': 1100,
  'z3-orcid': 1100,
};

// ---- the Y table: every section boundary, in u. The two date rows are computed, never typed. ----
const JUN = yOfDay('2026-06-01'), SEP = yOfDay('2026-09-01');
export const Y = {
  towerEnd: 1040, shadowRowH: 200, shadowEnd: 1640,
  demoInk0: 2040, demoLine: 2030, legend: 2110, acid: 2240, care: 2500, t: 2670,
  d1: 356, d2: 880, h3words: 366,
};
Y.hitsEnd = Y.t + 1690;
Y.jun = JUN; Y.afTop = JUN + 170; Y.argus = Y.afTop + 640; Y.resumex = Y.argus + 480; Y.anticheat = Y.resumex + 390; Y.sep = SEP;
Y.study = SEP + 640; Y.credits = Y.study + 300; Y.courses = Y.credits + 150;

// the courses of the wall: one WALL entry is one row, and everything below it re-flows
const WALL_MEASURE = W - L0 - 28;
const COURSE_H = 186;
export const COURSES = WALL.map((c, i) => {
  const cw140 = cutWidth(c.name, 140);
  // the stretch is capped both ways: past these the wedge alphabet turns into wood type
  const hMin = WALL_MEASURE / (1.75 * cw140 / 140), hMax = WALL_MEASURE / (0.6 * cw140 / 140);
  const letter = Math.max(hMin * 1.05, Math.min(104, hMax)); // 1.05: at the cap itself a name loses its kerning
  return { ...c, tile: `d${i + 1}-${c.slug}`, letter, xs: WALL_MEASURE / cutWidth(c.name, letter), y: Y.courses + i * COURSE_H };
});
Y.lights = Y.courses + COURSES.length * COURSE_H;
// Firefox lays out to 1/60 px and truncates, so a row's shares must land on it at the real columns or the row stops short of the edge.
export const LIGHT_ROWS = [
  { y: Y.lights, h: 340, letterY: 64, letter: 176, tiles: [{ word: COPY.words.email, share: 1, fg: C.toka, href: L.email, name: 'z1-email', alt: ALT.lightsEmail, print: COPY.emailAddress, printPhone: COPY.emailAddress }] },
  { y: Y.lights + 340, h: 180, letterY: 40, letter: 62, tiles: [{ word: COPY.words.portfolio, share: 0.4, fg: C.douga, href: L.portfolio, name: 'z2-portfolio', alt: ALT.portfolio }, { word: COPY.words.resume, share: 0.3, fg: C.douga, href: L.resume, name: 'z2-resume', alt: ALT.resumeLink }, { word: COPY.words.linkedin, share: 0.3, fg: C.douga, href: L.linkedin, name: 'z2-linkedin', alt: ALT.linkedinLink }] },
  { y: Y.lights + 520, h: 180, letterY: 40, letter: 62, tiles: [{ word: COPY.words.projects, share: 0.4, fg: C.douga, href: L.projects, name: 'z3-projects', alt: ALT.projects }, { word: COPY.words.konect, share: 0.3, fg: C.douga, href: L.konect, name: 'z3-konect', alt: ALT.konect }, { word: COPY.words.orcid, share: 0.3, fg: C.douga, href: L.orcid, name: 'z3-orcid', alt: ALT.orcid }] },
];
Y.end = Y.lights + 700;
// below the opening, nothing settled may show until the sky comes on; the film stops at this seam
Y.filmEnd = Y.t + 1010;

export const PEG = { x: 620, y: Y.jun - 40 }; // the real holes through the base paper, at the foot of the hold

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
  { y: Y.t + H1 + H2, h: Y.hitsEnd - Y.t - H1 - H2, css: 'crk', tiles: [{ share: 1, name: 'b4-break-in', href: L.anticheat, alt: ALT.hit3 }] },
  { y: Y.hitsEnd, h: Y.jun - Y.hitsEnd, tiles: [{ share: 1, name: 'c1-hold', href: L.agentforge, alt: ALT.hold }] },
  { y: Y.jun, h: Y.afTop - Y.jun, tiles: [{ share: 1, name: 'c2-integratek', href: L.integratek, alt: ALT.integratek }] },
  { y: Y.afTop, h: Y.argus - Y.afTop, css: 'af', tiles: [{ share: 1, name: 'c3-agentforge', href: L.agentforge, alt: ALT.agentforge }] },
  { y: Y.argus, h: Y.resumex - Y.argus, tiles: [{ share: 1, name: 'c4-argus', href: L.argus, alt: ALT.argus }] },
  { y: Y.resumex, h: Y.anticheat - Y.resumex, tiles: [{ share: 1, name: 'c5-resumex', href: L.resumex, alt: ALT.resumex }] },
  { y: Y.anticheat, h: Y.sep - Y.anticheat, tiles: [{ share: 1, name: 'c6-anticheat', href: L.anticheat, alt: ALT.anticheat }] },
  { y: Y.sep, h: Y.study - Y.sep, tiles: [{ share: 1, name: 'c7-ordfall', href: L.ordfall, alt: ALT.ordfall }] },
  { y: Y.study, h: Y.credits - Y.study, tiles: [{ share: 0.625, name: 'c8-brain', href: L.brain, alt: ALT.brain }, { share: 0.375, name: 'c8-study', href: L.resume, alt: ALT.study }] },
  { y: Y.credits, h: Y.courses - Y.credits, tiles: [{ share: 1, name: 'd0-credits', href: L.projects, alt: ALT.wallLead }] },
  ...COURSES.map((r, i) => ({ y: r.y, h: COURSE_H, tiles: [{ share: 1, name: r.tile, href: r.href, alt: `${r.name}. ${r.cap}.` }] })),
  ...LIGHT_ROWS.map((r) => ({ y: r.y, h: r.h, tiles: r.tiles.map((t) => ({ share: t.share, name: t.name, href: t.href, alt: t.alt })) })),
];
