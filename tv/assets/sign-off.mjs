// SIGN-OFF test card (SPEC §2, §2.1 "sign-off", §3.7 OFF / GLOW / DOT) → assets/tv/sign-off.svg.
// A faithful SMPTE ECR 1-1978 card in the OG-muted palette — 75% bars, castellation, PLUGE — with the end
// slate over it. Once per 14 s cycle the set is switched off: the picture collapses to a line, shrinks to a
// dot, fades to black and powers back on with an overshoot (flash-safe: the white glow only ever shows
// through a 1.2%-tall slit). One composition serves both tunings; every line is ≥ 34u.
import { COLOR, BAND_H, GRAIN, TYPE, r2 } from '../lib/tokens.mjs';
import { line, measure, cell, assertBelow, assertWidth } from '../lib/text.mjs';
import { g, caret, chroma, chromaFor, bars, plugeRow, dotGradient } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { ambientB, hidden, twitch, powerOff } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

export const family = 'sign-off';

const FILE = 'sign-off.svg';
// 240u, not the prototype's 260: this card carries no text that grows, and the 20u bought here are 14 px of
// the page's desktop height budget (SPEC §1.1) — spent on the six website links the README gained under the
// programme guide. The three ECR rows keep their proportions (66 / 8 / 26 % of the glass) and the slate box
// keeps its margins inside the bars, so nothing but the scale changes.
const W = 1200, H = 240;

// Layout (SPEC §2.1): the card fills the glass, the slate box sits on the bars.
const GLASS = { x: 16, y: 16, w: 1168, h: 208 };
const CARD = { bars: 137, cast: 16, pluge: 55 }; // row heights, top to bottom (137 + 16 + 55 = 208)
const BOX = { x: 300, y: 28, w: 600, h: 110, pad: 20 };
const EOT = { text: 'END OF TRANSMISSION', y: 81, size: 40, ls: 2, op: 0.6 };
const STATION = { y: 123, size: 34, ls: 3 };
const OFF = { period: 14, origin: [600, 120], dotR: 14 }; // power-off pivot = the middle of the card

const mid = GLASS.x + GLASS.w / 2; // 600: the slate lines and the power-off dot are centered on it

export function build(C) {
  const seed = (purpose) => seedOf(`${FILE}#${purpose}`);
  const t = tv({ bezel: 'signOff', W, H, bandH: BAND_H.signOff, seed: seed('grain'), grain: GRAIN.default });

  // ── the ECR card: bars, castellation, PLUGE, then a still grain pass over all three ──────────────
  const castY = GLASS.y + CARD.bars, plugeY = castY + CARD.cast;
  const card = bars(GLASS.x, GLASS.y, GLASS.w, CARD.bars) +
    bars(GLASS.x, castY, GLASS.w, CARD.cast, COLOR.cast) +
    plugeRow(GLASS.x, plugeY, GLASS.w, CARD.pluge) +
    `<rect x="${GLASS.x}" y="${GLASS.y}" width="${GLASS.w}" height="${GLASS.h}" fill="url(#gr)" opacity=".3"/>`;

  // ── the slate: chromatic END OF TRANSMISSION_ over a black box, station id under it ──────────────
  const eotW = assertWidth(EOT.text, EOT.size, EOT.ls, BOX.w - 2 * BOX.pad, `${FILE} end-of-transmission line`);
  const station = `${C.identity.handle} · CH 00`;
  assertWidth(station, STATION.size, STATION.ls, BOX.w - 2 * BOX.pad, `${FILE} station line`);
  assertBelow(EOT.y, STATION.y, STATION.size, `${FILE}: slate lines`);
  const caretX = mid + eotW / 2 + 4;
  if (caretX + cell(EOT.size) > BOX.x + BOX.w - 4) throw new Error(`${FILE}: the caret runs past the slate box`);

  const slate = `<rect x="${BOX.x}" y="${BOX.y}" width="${BOX.w}" height="${BOX.h}" fill="#000"/>` +
    chroma(line(EOT.text, { x: mid, y: EOT.y, size: EOT.size, ls: EOT.ls, anchor: 'middle' }), { ...chromaFor(EOT.size), op: EOT.op, j: 'E' }) +
    caret({ x: r2(caretX), y: EOT.y, size: EOT.size }) +
    g(line(station, { x: mid, y: STATION.y, size: STATION.size, ls: STATION.ls, anchor: 'middle' }), COLOR.text);

  // ── the tube: everything the power-off collapses, plus the white glow inside it ──────────────────
  const tube = `<g class="tube">${card}${slate}` +
    `<rect class="glow ev" x="${GLASS.x}" y="${GLASS.y}" width="${GLASS.w}" height="${GLASS.h}" fill="#fff"/></g>`;
  const dot = `<circle class="dot ev" cx="${OFF.origin[0]}" cy="${OFF.origin[1]}" r="${OFF.dotR}" fill="url(#dg)"/>`;

  const alt = 'SMPTE color bars test card: end of transmission. OLWTELET, channel 00. Opens olwtelet.vercel.app.';
  const svg = svgDoc({
    W, H, label: alt,
    css: tuning(TYPE[1200].tuning) + hidden('glow', 'dot'),
    motion: ambientB({ H, bandH: BAND_H.signOff, bandDelay: -6 }) +
      twitch({ j: 'E', period: 9, delay: 3, keys: [[90.6, 12, -2], [91.4, -3, 4], [92, 0, 0]] }) +
      powerOff({ period: OFF.period, origin: OFF.origin }),
    defs: t.defs + dotGradient('dg'),
    body: t.compose(tube, dot),
  });
  return [{ file: FILE, svg, alt, href: C.links.home, region: 'sign-off' }];
}
