// QA specimen of the tv/lib design system (SPEC §7 WP0): every color token, the §3.2 type sizes in both tunings,
// drawn vs font glyphs on baseline guides, chroma at each §3.6 size, outlined labels over rainbow focus, the SMPTE
// pieces, and one small looping swatch per §3.7 keyframe. It is never part of the README:
//   node tv/build.mjs --only _specimen --out <directory outside the repo>
import { COLOR, TYPE, CHROMA, BAND_H, r2 } from '../lib/tokens.mjs';
import { line, measure, cell, CAP, ADV, assertGap, assertBelow } from '../lib/text.mjs';
import { DRAWN } from '../lib/glyphs.mjs';
import * as fx from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { KF, kf, animate, hidden, focusBase, ambientB, focus, twitch, retune, tuner, typeReveal, standBy, slotSwitch, eq, beam, powerOff } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

export const family = '_specimen';

const FILE = '_specimen.svg';
const W = 1200, H = 900;
const { g, chroma, outlined, focusRect } = fx;
const gray = (s, x, y, size = 18, ls = 1) => g(line(s, { x, y, size, ls }), COLOR.text);
const white = (s, x, y, size, ls = 0, anchor = 'start') => g(line(s, { x, y, size, ls, anchor }), COLOR.white);

/** All sizes named for one tuning ('d' or 'm') across the three width classes of tokens.TYPE, ascending. */
const sizesOf = (tuningKey) => [...new Set(Object.values(TYPE).flatMap((t) => Object.values(t[tuningKey]).flat()))].sort((a, b) => a - b);

// ── static sections ─────────────────────────────────────────────────────────────────────────────
const COLOR_ROWS = [
  ['SCREEN', [COLOR.glass, COLOR.bezel, COLOR.bezelInner, COLOR.rule, COLOR.dot, COLOR.dotV, COLOR.text, COLOR.white, COLOR.favStroke, COLOR.rec]],
  ['CHROMA/FAV', [COLOR.cyan, COLOR.red, ...COLOR.fav]],
  ['BARS', COLOR.bars],
  ['BARS 75%', COLOR.bars75],
  ['CASTELLATION', COLOR.cast],
  ['PLUGE', COLOR.pluge],
  ['RAINBOW', [...COLOR.rainbow, COLOR.rainbowSmear]],
  ['STATIC/BURST', [...COLOR.staticTints, COLOR.burst.base, ...COLOR.burst.hues]],
];

/** Swatch rows in two columns of four: label then 22u squares on a 28u pitch. */
function colorRows() {
  return COLOR_ROWS.map(([name, colors], i) => {
    const [labelX, swatchX] = i < 4 ? [40, 190] : [620, 790];
    const cy = 88 + (i % 4) * 30;
    return gray(name, labelX, r2(cy + (CAP * 18) / 2)) + colors.map((c, k) =>
      `<rect x="${swatchX + k * 28}" y="${cy - 11}" width="22" height="22" fill="${c}" stroke="${COLOR.rule}"/>`).join('');
  }).join('');
}

/** Each size rendered as its own numeral, baseline-aligned. Returns the markup and the right edge. */
function numerals(sizes, x0, baseline, gap) {
  let x = x0;
  const out = sizes.map((size) => {
    const s = white(String(size), x, baseline, size);
    x += measure(String(size), size) + gap;
    return s;
  }).join('');
  return { markup: out, right: x - gap };
}

/** Drawn glyphs next to font glyphs, each in its em box with a red baseline and a gray cap-height guide. */
function glyphCells({ x0, baseline, size, pitch, groupGap, labelY, labelSize, font }) {
  const drawn = Object.keys(DRAWN);
  const xs = [...drawn.map((_, k) => x0 + k * pitch), ...font.map((_, k) => x0 + drawn.length * pitch + groupGap + k * pitch)];
  const right = xs.at(-1) + ADV * size;
  const guides = `<rect x="${x0 - 4}" y="${baseline}" width="${r2(right - x0 + 8)}" height="1" fill="${COLOR.rec}"/>` +
    `<rect x="${x0 - 4}" y="${r2(baseline - CAP * size)}" width="${r2(right - x0 + 8)}" height="1" fill="${COLOR.dot}"/>`;
  const boxes = xs.map((x) => `<rect x="${r2(x)}" y="${baseline - size}" width="${r2(ADV * size)}" height="${size}" fill="none" stroke="${COLOR.bezel}"/>`).join('');
  const glyphs = [...drawn, ...font].map((ch, k) => white(ch, xs[k], baseline, size)).join('');
  assertBelow(labelY, baseline - size + CAP * size, size, 'specimen glyph labels vs cells');
  return guides + boxes + glyphs + gray('DRAWN', x0, labelY, labelSize, 1) + gray('FONT', xs[drawn.length], labelY, labelSize, 1);
}

/** One chroma sample per §3.6 size (sizes ≥ minSize), labelled with the size. */
function chromaRow({ x0, baseline, labelY, labelSize, minSize }) {
  const letters = 'OLWTELETCH00';
  let x = x0;
  const out = CHROMA.filter(([size]) => size >= minSize).map(([size, dx, dy], k) => {
    const s = chroma(line(letters[k], { x, y: baseline, size }), { dx, dy, j: 'C' }) + gray(String(size), x, labelY, labelSize, 0);
    x += Math.max(ADV * size, measure(String(size), labelSize)) + 22;
    return s;
  }).join('');
  return { markup: out, right: x - 22 };
}

// ── motion swatches: 128×50 nested viewports, one keyframe family each ─────────────────────────────
const SW = 128, SH = 50;
const half = (x, content) => `<svg x="${x}" y="0" width="63" height="${SH}" viewBox="0 0 63 ${SH}">${content}</svg>`;
const grainRect = (cls, op) => `<rect class="${cls}" x="-90" y="-90" width="308" height="230" fill="url(#gr)" opacity="${op}"/>`;

/** Scale and origin that map a strip rect onto the whole swatch (BARS collapse). */
function collapse(x, y, w, h) {
  const sx = SW / w, sy = SH / h;
  return { sx, sy, ox: r2((0 - sx * x) / (1 - sx)), oy: r2((0 - sy * y) / (1 - sy)) };
}

function swatches() {
  const tearText = line('OLWTELET', { x: 8, y: 36, size: 20 });
  const bars = collapse(14, 34, 100, 10);
  const resume = 'RESUME ↗', resumeW = measure(resume, 20, 1);
  return [
    ['VLINE A|B', half(0, `<rect class="vlA" width="63" height="20" fill="url(#bg)"/>`) + half(65, `<rect class="vlB" width="63" height="20" fill="url(#bg)"/>`),
      '', kf.vline({ H: SH, bandH: 20, name: 'vlS' }) + animate('.vlA', 'vlS 3s linear infinite') + animate('.vlB', 'vlS 3s steps(18,end) infinite')],
    ['GRAIN A|B', half(0, grainRect('grA', 0.6)) + half(65, grainRect('grB', 0.6)),
      '', animate('.grA', 'grain .48s steps(1,end) infinite') + animate('.grB', 'grain 2s steps(1,end) infinite') + KF.grain],
    ['REC', fx.recLabel('REC', 100, 32, 20, 1, COLOR.white), '', ''],
    ['BLINK', white('BLINK', 8, 21, 18) + fx.caret({ x: 8 + 5 * cell(18) + 2, y: 21, size: 18 }) +
      white('BLINK IN', 8, 43, 18) + fx.caret({ x: 8 + 8 * cell(18) + 2, y: 43, size: 18, cls: 'caretIn' }),
      '', animate('.caretIn', 'blinkIn .8s step-end infinite') + KF.blinkIn],
    ['LINE·FLASH', `<rect class="flashD" width="${SW}" height="${SH}" fill="#fff"/><rect class="lineD" x="0" y="23" width="${SW}" height="4" fill="#fff"/>`,
      `${hidden('flashD', 'lineD')}.lineD{transform-box:fill-box;transform-origin:50% 50%}`,
      animate('.lineD', 'line 1.5s linear infinite') + KF.line + animate('.flashD', 'flash 1.5s linear infinite') + KF.flash],
    ['PWR', `<g class="pwrD">${white('POWER', 10, 34, 26)}</g>`, '.pwrD{transform-box:view-box;transform-origin:64px 25px}',
      animate('.pwrD', 'pwr 1.5s cubic-bezier(.25,.8,.3,1) infinite') + KF.pwr],
    ['BURST', gray('CH 01', 10, 32, 20) + `<rect class="burstD" width="${SW}" height="${SH}" fill="url(#bu)"/>`, hidden('burstD'),
      animate('.burstD', 'burst 1.15s steps(1,end) infinite') + KF.burst],
    ['BARS', `<g class="barsD">${fx.bars(14, 34, 100, 10)}</g>`, `.barsD{transform-box:view-box;transform-origin:${bars.ox}px ${bars.oy}px}`,
      animate('.barsD', 'barsD 1.5s linear infinite') + kf.bars({ sx: bars.sx, sy: bars.sy, name: 'barsD' })],
    ['POP·POP3', `<g class="popD">${fx.bars(6, 30, 56, 8, COLOR.cast)}</g>${fx.favicon(76, 4, 0.65, 'pop3D')}`, '',
      animate('.popD', 'pop .01s steps(1,end) .8s backwards') + KF.pop + animate('.pop3D', 'pop3 1.2s steps(3,end) infinite') + KF.pop3],
    ['FLICK', `<g class="flickD">${white('ISAAC', 10, 34, 26, 1)}</g>`, '', animate('.flickD', 'flick 1.5s linear infinite') + KF.flick],
    ['CHROMA-IN·TW', `<g class="twD">${chroma(line('OLW', { x: 30, y: 38, size: 36 }), { dx: 2, dy: 1.5, j: 'I' })}</g>`, '',
      animate('.cyI', 'cyin 1.5s cubic-bezier(.2,.8,.2,1) infinite') + KF.cyin + animate('.rdI', 'rdin 1.5s cubic-bezier(.2,.8,.2,1) infinite') + KF.rdin +
      animate('.twD', 'tw 1.5s linear infinite') + KF.tw],
    ['TYPE', `<clipPath id="tyS"><rect class="tyD" x="8" y="14" width="${r2(10 * cell(18))}" height="26"/></clipPath><g clip-path="url(#tyS)">${white('RECEIVING', 10, 34, 18)}</g>`,
      '', typeReveal({ cls: 'tyD', n: 9, duration: 0.9, delay: 0.2 })],
    ['TWITCH', chroma(line('CH 00', { x: 18, y: 36, size: 30 }), { dx: 3, dy: 2, j: 'W' }), '',
      twitch({ j: 'W', period: 1.5, keys: [[40, 9, -2], [53, -4, 3], [66, 12, 1], [80, 0, 0]] })],
    ['TEAR·GBURST', grainRect('gbD', 0.12) + g(tearText, COLOR.white) +
      `<clipPath id="tearS"><rect x="0" y="24" width="${SW}" height="8"/></clipPath><g class="tearD" clip-path="url(#tearS)"><rect x="0" y="24" width="${SW}" height="8" fill="#070707"/><g fill="#fff" transform="translate(10 0)">${tearText}</g></g>`,
      hidden('tearD'),
      animate('.tearD', 'tearD 1.5s steps(1,end) infinite') + kf.pulse({ name: 'tearD', on: 40, off: 55, base: 0, peak: 1 }) +
      animate('.gbD', 'gbD 1.5s steps(1,end) infinite') + kf.pulse({ name: 'gbD', on: 35, off: 60, base: 0.12, peak: 0.3 })],
    ['RETUNE', grainRect('grR', 0.1) + `<g class="rtD">${chroma(line('ARGUS', { x: 20, y: 38, size: 30 }), { dx: 3, dy: 2, j: 'R' })}</g><g class="tearR">${fx.rainbow({ x: 0, y: 0, w: SW, h: 10, cls: 'trR' })}</g>`,
      hidden('tearR'),
      retune({ period: 1.5, at: 0.6, origin: [64, 25], tearY: [8, 30, 18], chroma: { j: 'R', keys: [[10, -2], [-4, 3], [8, 1]] }, rt: 'rtD', tear: 'tearR', gb: 'gbR', grainClass: 'grR' })],
    ['RETUNE SLATE', grainRect('grS', 0.1) + `<g class="rtS">${white('SLATE', 22, 36, 26, 1)}</g><g class="tearL">${fx.rainbow({ x: 0, y: 0, w: SW, h: 5, cls: 'trL' })}</g>`,
      hidden('tearL'),
      retune({ period: 1.5, at: 0.9, origin: [64, 25], shift: [10, -7, 3], skew: [-2, 0, 0], tearY: [14, 30, 8], rt: 'rtS', tear: 'tearL', gb: 'gbS', grainClass: 'grS' })],
    ['STAND-BY', `<g class="picD">${white('SIGNAL', 10, 34, 24)}</g><g class="stbyD ev"><g class="tearSB">${fx.bars(-8, 0, 144, 34)}${fx.bars(-8, 34, 144, 6, COLOR.cast)}` +
      `<rect x="-8" y="40" width="144" height="10" fill="#131313"/></g><rect x="14" y="11" width="100" height="26" fill="#000"/>${white('STAND BY', 64, 30, 18, 0, 'middle')}</g>` +
      `<rect class="burstSB ev" width="${SW}" height="${SH}" fill="url(#bu)"/>`,
      hidden('stbyD', 'burstSB'), standBy({ period: 3, layer: 'stbyD', tear: 'tearSB', burst: 'burstSB', picture: 'picD' })],
    ['FOCUS', focusRect(64 - resumeW / 2, 32, 20, resumeW, { padX: 6, h: 30, cls: 'rbF' }) + outlined(line(resume, { x: 64, y: 32, size: 20, ls: 1, anchor: 'middle' }), 4),
      focusBase('rbF'), focus({ period: 2, start: 0.2, hold: 1, cls: 'rbF' })],
    ['TUNER', [21, 43].map((y, k) => {
      const title = `ROW 0${5 + k}`, w = measure(title, 18);
      return gray(title, 24, y, 18, 0) + `<g class="hbT hT${k}">${focusRect(24, y, 18, w, { padX: 4, h: 20, cls: 'fT' })}</g>` +
        `<g class="htT hT${k}">${outlined(line('►', { x: 6, y: y - 1, size: 18 }), 4)}${outlined(line(title, { x: 24, y, size: 18 }), 4)}</g>`;
    }).join('') + `<g class="idxT">${gray('IDX', 94, 21, 18, 0)}</g>`,
      '.hbT,.htT{opacity:0}.hbT{transform-box:fill-box;transform-origin:50% 100%}',
      tuner({ slots: 2, slot: 1.2, back: 'hbT', top: 'htT', idle: 'idxT', row: 'hT' })],
    ['SLOT·SWITCH', `<g class="tzD">${[1, 2, 3].map((n, k) => `<g class="pkD pkD${k}">${white(`CH ${n}/3`, 22, 34, 24)}</g>`).join('')}</g>` +
      `<rect class="swD ev" width="${SW}" height="${SH}" fill="url(#bu)"/>`,
      `.pkD{opacity:0}.pkD0{opacity:1}${hidden('swD')}`, slotSwitch({ slots: 3, slot: 1, item: 'pkD', flash: 'swD', shift: 'tzD' })],
    ['EQ', COLOR.bars.map((c, i) => `<rect class="eq eq${i}" x="${8 + i * 16}" y="6" width="12" height="40" fill="${c}"/>`).join(''),
      '.eq{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(.6)}', eq()],
    ['BEAM', fx.rule(4, 10, 120) + fx.rule(4, 40, 120) + fx.tick(64, 10, 32) +
      '<path d="M4 38H20V30H36V34H52V16H68V26H84V20H100V32H124" fill="none" stroke="#fff" stroke-width="2"/>' +
      '<rect class="beamD" x="4" y="6" width="2" height="38" fill="#fff" opacity=".6"/>', '', beam({ distance: 118, period: 3, steps: 24, cls: 'beamD' })],
    ['OFF·GLOW·DOT', `<g class="tubeD">${fx.bars(0, 0, SW, 32)}${fx.bars(0, 32, SW, 5, COLOR.cast)}${fx.plugeRow(0, 37, SW, 13)}` +
      `<rect class="glowD ev" width="${SW}" height="${SH}" fill="#fff"/></g><circle class="dotD ev" cx="64" cy="25" r="6" fill="url(#dg)"/>`,
      hidden('glowD', 'dotD'), powerOff({ period: 3, origin: [64, 25], tube: 'tubeD', glow: 'glowD', dot: 'dotD' })],
    ['SCAN·VIG', `<rect width="${SW}" height="${SH}" fill="${COLOR.bars[0]}"/><rect width="64" height="${SH}" fill="url(#sd)"/>` +
      `<rect x="64" width="64" height="${SH}" fill="url(#sm)"/><rect width="${SW}" height="${SH}" fill="url(#vg)"/>`, '', ''],
  ];
}

/** Lay the swatches on an 8-column grid; returns { markup, css, motion }. */
function motionGrid(x0, y0) {
  const cells = swatches();
  return {
    markup: cells.map(([name, content], k) => {
      const x = x0 + (k % 8) * 140, y = y0 + Math.floor(k / 8) * 86;
      return `<svg x="${x}" y="${y + 4}" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}"><rect width="${SW}" height="${SH}" fill="#000"/>${content}` +
        `<rect x=".5" y=".5" width="${SW - 1}" height="${SH - 1}" fill="none" stroke="${COLOR.bezelInner}"/></svg>` + gray(name, x, y + 74, 18, 0);
    }).join(''),
    css: cells.map(([, , css]) => css).join(''),
    motion: cells.map(([, , , m]) => m).join(''),
  };
}

// ── compositions ────────────────────────────────────────────────────────────────────────────────
function desktop() {
  const D = [];
  D.push(fx.spans(40, 52, 22, 2, [['▮ ', COLOR.white], ['TV/LIB SPECIMEN', COLOR.white], [' · 1200×900 · VCR OSD MONO', COLOR.text]]));
  D.push(fx.recLabel('REC · CH 00', 1160, 52, 18, 3), fx.rule(40, 66, 1120));
  D.push(colorRows(), fx.rule(40, 196, 1120));

  const type = numerals(sizesOf('d').filter((s) => s <= 64), 40, 264, 24);
  assertGap(type.right, 560, 'specimen numerals vs body samples');
  D.push(type.markup);
  D.push(gray('Self-hosted situational awareness platform', 560, 238, 20, 0));
  D.push(gray('Python / FastAPI / Next.js / React / …', 560, 264, 18, 0.5));
  D.push(white('A▮B▸C·D—E–F●G↗H×I ÁÉÍÓÚÃÕÇ áéíóúãõç ‘’“” … € ™ ← ↑ → ↓ ↔ ▲ ► ▼ ◄ &', 40, 300, 22));
  D.push(fx.rule(40, 314, 1120));

  D.push(glyphCells({ x0: 40, baseline: 406, size: 56, pitch: 52, groupGap: 28, labelY: 336, labelSize: 18, font: [...'►◄→…ÁÉÍÓÚÃÕÇ'] }));
  D.push(fx.rule(40, 414, 1120));

  const row = chromaRow({ x0: 40, baseline: 576, labelY: 600, labelSize: 18, minSize: 0 });
  assertGap(row.right, 890, 'specimen chroma row vs fx column');
  D.push(row.markup);
  D.push(fx.testCard(890, 426, 120, 66), fx.favicon(1050, 424, 1.1));
  const view = 'VIEW SOURCE ↗', open = 'OPEN INDEX ↗';
  D.push(focusRect(899, 530, 20, measure(view, 20, 1), { padX: 9, h: 34, cls: 'rbs' }) + outlined(line(view, { x: 899, y: 530, size: 20, ls: 1 }), 4));
  D.push(focusRect(900, 574, 20, measure(open, 20, 2), { padX: 10, h: 34 }) + outlined(line(open, { x: 900, y: 574, size: 20, ls: 2 }), 4));
  D.push(fx.bars(890, 590, 270, 14), '<rect x="890" y="590" width="270" height="14" fill="url(#sn)"/>', fx.bars(890, 604, 270, 6, COLOR.cast));
  D.push(fx.rule(40, 614, 1120));
  return D.join('');
}

function phone() {
  const M = [];
  M.push(fx.spans(40, 80, 44, 1, [['▮ ', COLOR.white], ['SPECIMEN', COLOR.white], [' · PHONE', COLOR.text]]));
  M.push(fx.recLabel('REC', 1160, 80, 36, 2), fx.rule(40, 104, 1120));
  [[...COLOR.bars, ...COLOR.cast], [...COLOR.rainbow, ...COLOR.pluge]].forEach((colors, rowIndex) => {
    M.push(colors.map((c, k) => `<rect x="${40 + k * 56}" y="${122 + rowIndex * 60}" width="48" height="48" fill="${c}" stroke="${COLOR.rule}"/>`).join(''));
  });
  M.push(fx.favicon(880, 118, 1.6), fx.testCard(1010, 128, 150, 96), fx.rule(40, 246, 1120));

  const type = numerals(sizesOf('m').filter((s) => s <= 64), 40, 310, 28);
  assertGap(type.right, 360, 'specimen phone numerals vs inline glyphs');
  M.push(type.markup, white('A▮B▸C·D—E–F●G↗H×I', 360, 310, 40), white('►◄→…ÁÃÇ', 800, 310, 40));

  M.push(glyphCells({ x0: 40, baseline: 452, size: 64, pitch: 70, groupGap: 0, labelY: 372, labelSize: 34, font: [...'►◄→…ÁÓÕÇ'] }));
  M.push(fx.rule(40, 470, 1120));

  const row = chromaRow({ x0: 40, baseline: 668, labelY: 712, labelSize: 34, minSize: 34 });
  M.push(row.markup, fx.rule(40, 728, 1120));

  const key = 'PORTFOLIO', view = 'VIEW SOURCE ↗', open = 'OPEN INDEX ↗';
  M.push(focusRect(40, 800, 44, measure(key, 44, 1), { padX: 8, h: 56, cls: 'rbs' }) + outlined(line(key, { x: 40, y: 800, size: 44, ls: 1 }), 6));
  M.push(focusRect(340, 800, 36, measure(view, 36, 1), { padX: 10, h: 50, cls: 'rbs' }) + outlined(line(view, { x: 340, y: 800, size: 36, ls: 1 }), 6));
  M.push(fx.bars(680, 752, 480, 40), '<rect x="680" y="752" width="480" height="40" fill="url(#sn)"/>', fx.bars(680, 792, 480, 10, COLOR.cast), fx.plugeRow(680, 802, 480, 30));
  M.push(focusRect(48, 864, 34, measure(open, 34, 1), { padX: 8, h: 48 }) + outlined(line(open, { x: 48, y: 864, size: 34, ls: 1 }), 5));
  M.push(white('CH 00', 520, 864, 40), fx.caret({ x: 520 + 5 * cell(40) + 4, y: 864, size: 40 }));
  return M.join('');
}

export function build(C) {
  const seed = (name) => seedOf(`${FILE}#${name}`);
  const t = tv({ bezel: 'screen', W, H, bandH: BAND_H.screen, seed: seed('grain') });
  const grid = motionGrid(40, 622);
  const defs = t.defs + fx.rainbowNoise('rn', seed('rainbow')) + fx.burstPattern('bu', { size: 80, count: 120, seed: seed('burst') }) +
    fx.stripNoise('sn', seed('strip')) + fx.DOTS + fx.DOTS_V + fx.dotGradient('dg');
  const alt = 'Design system specimen: color tokens, type sizes in both tunings, drawn and font glyphs, chroma sizes, outlined focus labels, SMPTE pieces and one swatch per motion keyframe.';
  const svg = svgDoc({
    W, H, label: alt, defs,
    css: tuning(TYPE[1200].tuning) + focusBase() + grid.css,
    motion: ambientB({ H, bandH: BAND_H.screen }) + focus({ period: 3, start: 0.2, hold: 1.6 }) + grid.motion,
    body: t.compose(`<g class="d">${desktop()}${grid.markup}</g><g class="m">${phone()}</g>`),
  });
  return [{ file: FILE, svg, alt, href: C.links.home, region: null, budget: { full: 150_000, subset: 150_000 }, tier: 'A' }];
}
