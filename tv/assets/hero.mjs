// CHANNEL 00 — the hero (SPEC §2 channel-00 row, §2.1 layout sheet, §3.7 tier A motion).
//
// The only asset with a one-shot intro. A white line opens the tube (LINE + PWR), channel static and a dimmed
// full-frame SMPTE field collapse into the bottom strip (BURST + BARS), and the home OG card writes itself line
// by line (FLICK, CHROMA-IN, TYPE, POP). Everything is settled at 2.4 s and the settled frame is og-home-en.png:
// header, the site's "NOW RECEIVING" line, the chromatic title with the favicon station bug, name, role, tagline,
// city, bar strip. After that only the tier-A ambient loops run (rolling band, .48 s grain drift, REC) plus one
// tracking error every 7 s from 2.6 s: the chroma copies jump, a slice of the title tears, the grain lifts.
import { COLOR, BAND_H, GRAIN, SCAN, TYPE, r2 } from '../lib/tokens.mjs';
import { line, measure, cell, chars, assertWidth, assertGap, assertBelow } from '../lib/text.mjs';
import { g, spans, chroma, chromaFor, caret, recLabel, favicon, bars, stripNoise, burstPattern } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { KF, kf, animate, hidden, ambientA, typeReveal } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';

export const family = 'hero';

const FILE = 'channel-00.svg';
const W = 1200, H = 640;
/** Hero glass (tokens.BEZEL.hero, inset 17): the rect every full-frame layer covers. */
const GX = 17, GY = 17, GW = W - 2 * GX, GH = H - 2 * GY;
/** Content inset and the right edge every right-aligned run ends at (SPEC §3.4: 72u on 1200-wide assets). */
const LEFT = 72, RIGHT = W - LEFT;
/** The home channel: the site calls its index "CHANNEL 00". */
const CHANNEL = '00';
/** Bottom SMPTE strip and its castellation row (SPEC §2.1). */
const STRIP = { x: 60, y: 552, w: 1080, h: 36, castH: 10 };
/**
 * BARS collapse (SPEC §2.1): during the power-on the strip is scaled about (W/2, OY) so it fills the glass,
 * then it snaps back to its own rect. OY solves oy + s·(STRIP.y − oy) = GY for the vertical scale s.
 */
const SX = GW / STRIP.w, SY = GH / STRIP.h, OY = (GY - STRIP.y * SY) / (1 - SY);
/** Station bug: the site favicon (64-unit grid) at 2.5×, with the offsets of its antenna tip and body. */
const BUG = { x: 968, y: 286, scale: 2.5, top: 4, left: 6 };
/** The slice of the title the tracking error tears out, shifted by `slice` u while it shows. */
const TEAR = { x: 40, y: 350, w: 760, h: 24, slice: 26 };

/** SPEC §2 timeline, in seconds from the moment the image loads. Nothing moves the picture after `settled`. */
const T = {
  line: 0, // LINE: the white power-on line
  power: 0.12, // PWR opens the picture, FLASH veils it
  burst: 0, // BURST static and the BARS collapse
  header: 0.95, // FLICK
  chroma: 1, // CHROMA-IN: the title's cyan and red copies converge
  title: 1.05, // TW flicker + TYPE line 1
  cast: 1.16, // POP: the castellation row
  name: 1.45, // FLICK
  bug: 1.55, // POP3: the station bug
  tagline: 1.6, // FLICK + TYPE line 2
  caret: 2.35, // the caret starts blinking
  settled: 2.4, // the picture is complete; ambient loops take over
  twitch: 2.6, // first tracking error, then every TWITCH_PERIOD seconds
};
const TWITCH_PERIOD = 7;
const CHROMA_EASE = 'cubic-bezier(.2,.8,.2,1)';
/**
 * TWITCH (SPEC §3.7): three jumps inside 0.3 s. The red copy is not a pure mirror of the cyan one at the second
 * step — that asymmetry is what makes the glitch read as a tracking error instead of a wobble.
 */
const TWITCH_CYAN = [[51, 9, -2], [53, -4, 3], [55, 12, 1], [57, 0, 0]];
const TWITCH_RED = [[51, -9, 2], [53, 5, -3], [55, -12, -1], [57, 0, 0]];
const TWITCH_BUG = [[51, 3, 0], [53, -2, 0], [55, 4, 0], [57, 0, 0]];

/** `-delay` suffix for an animation shorthand, omitted when the animation starts at 0 s. */
const at = (seconds) => (seconds ? ` ${r2(seconds)}s` : '');
/** Left edge of an fx.recLabel(), dot included (dot centre at xEnd − width − .8·size, radius .36·size). */
const recLeft = (text, xEnd, size, ls) => xEnd - measure(text, size, ls) - 1.16 * size;

/**
 * One typed line: the clip rect TYPE grows (n + 1 cells wide, SPEC §3.7) plus the clipped markup and, when the
 * line ends in the caret, the caret itself. Two guards: the copy must fit inside its own clip (the reference
 * prototypes lost their last glyph to a short clip) and inside the glass, caret included.
 */
function typedLine({ id, text, inner, x, y, size, ls, clipY, clipH, cursor = false }) {
  const n = chars(text);
  const clipX = x - 2; // 2u of slack so the first glyph is never shaved by the clip edge
  const clipW = r2((n + 1) * cell(size, ls));
  assertWidth(text, size, ls, clipW - (x - clipX), `${FILE}: typed line "${text}" vs its clip`);
  assertWidth(cursor ? `${text}_` : text, size, ls, GX + GW - x - (cursor ? 4 : 0), `${FILE}: typed line "${text}" vs the glass`);
  return {
    reveal: [id, n],
    def: `<clipPath id="${id}"><rect class="${id}" x="${r2(clipX)}" y="${clipY}" width="${clipW}" height="${clipH}"/></clipPath>`,
    markup: `<g clip-path="url(#${id})">${inner}</g>` + (cursor ? caret({ x: r2(x + n * cell(size, ls) + 4), y, size }) : ''),
  };
}

/**
 * Desktop composition (SPEC §2.1, desktop column): the OG home card at 1200×640.
 * Returns the markup, the clip paths it needs and the TYPE reveals to animate.
 */
function desktop(C) {
  const id = C.identity, out = [], defs = [], reveals = [];
  const host = new URL(C.site).host.toUpperCase(); // OLWTELET.VERCEL.APP
  const channel = `REC · CH ${CHANNEL}`;

  // header row — the OG card's own labels, flicked on as one line
  assertGap(LEFT + measure(host, 24, 7), recLeft(channel, RIGHT, 24, 5), `${FILE}: desktop header vs REC label`);
  out.push(`<g class="hdr">${g(line(host, { x: LEFT, y: 92, size: 24, ls: 7 }), COLOR.text)}${recLabel(channel, RIGHT, 92, 24, 5)}</g>`);

  // "▸ NOW RECEIVING:" — the site's header line, typed in two passes, the second one keeping the caret
  const receiving = [['▸ NOW RECEIVING: ', COLOR.white], [`${id.handle} · ${id.name.toUpperCase()}`, COLOR.text]];
  const first = typedLine({
    id: 'ty1', text: receiving.map(([text]) => text).join(''), inner: spans(LEFT, 226, 24, 1.5, receiving),
    x: LEFT, y: 226, size: 24, ls: 1.5, clipY: 200, clipH: 34,
  });
  const second = `— ${id.receiving.toUpperCase()}`;
  const rest = typedLine({
    id: 'ty2', text: second, inner: g(line(second, { x: LEFT, y: 262, size: 24, ls: 1.5 }), COLOR.text),
    x: LEFT, y: 262, size: 24, ls: 1.5, clipY: 236, clipH: 34, cursor: true,
  });
  out.push(first.markup, rest.markup);
  defs.push(first.def, rest.def);
  reveals.push([...first.reveal, 0.55, T.title], [...rest.reveal, 0.75, T.tagline]);

  // title — the chromatic handle, plus the slice the tracking error tears out of it
  const offsets = chromaFor(150);
  const title = line(id.handle, { x: 66, y: 414, size: 150 });
  assertGap(66 + measure(id.handle, 150) + offsets.dx, BUG.x + BUG.left * BUG.scale, `${FILE}: title vs station bug`);
  out.push(`<g class="tin">${chroma(title, { ...offsets, j: 'T' })}</g>`);
  defs.push(`<clipPath id="tear"><rect x="${TEAR.x}" y="${TEAR.y}" width="${TEAR.w}" height="${TEAR.h}"/></clipPath>`);
  out.push(`<g class="tear ev" clip-path="url(#tear)"><rect x="${TEAR.x}" y="${TEAR.y}" width="${TEAR.w}" height="${TEAR.h}" fill="#070707"/>` +
    `<g fill="${COLOR.white}" transform="translate(${TEAR.slice} 0)">${title}</g></g>`);

  // station bug — the antenna tip must stay clear of the NOW RECEIVING line above it
  assertBelow(262, BUG.y + BUG.top * BUG.scale, 0, `${FILE}: station bug vs NOW RECEIVING line 2`);
  out.push(favicon(BUG.x, BUG.y, BUG.scale));

  // identity rows — name / student, then tagline / city, each flicked on in turn
  const student = id.student.toUpperCase(), city = id.city.toUpperCase();
  assertGap(LEFT + measure(id.name, 50, 3), RIGHT - measure(student, 26, 2), `${FILE}: name vs student`);
  assertGap(LEFT + measure(id.tagline, 26, 1.5), RIGHT - measure(city, 26, 1.5), `${FILE}: tagline vs city`);
  out.push(`<g class="in in4">${g(line(id.name.toUpperCase(), { x: LEFT, y: 484, size: 50, ls: 3 }), COLOR.white)}` +
    `${g(line(student, { x: RIGHT, y: 484, size: 26, ls: 2, anchor: 'end' }), COLOR.text)}</g>`);
  out.push(`<g class="in in5">${g(line(id.tagline, { x: LEFT, y: 530, size: 26, ls: 1.5 }), COLOR.text)}` +
    `${g(line(city, { x: RIGHT, y: 530, size: 26, ls: 1.5, anchor: 'end' }), COLOR.text)}</g>`);

  return { markup: out.join(''), defs, reveals };
}

/**
 * Phone composition (image ≤ 520 px, SPEC §2.1 phone column): same reading order at ≥ 34u — the header, a short
 * NOW RECEIVING, the title at 180u, the name, and the tagline split over two lines with the role and the city.
 */
function phone(C) {
  const id = C.identity, out = [], defs = [], reveals = [];
  const host = new URL(C.site).host.toUpperCase();
  const channel = `REC · CH ${CHANNEL}`;

  assertGap(LEFT + measure(host, 36, 2), recLeft(channel, RIGHT, 36, 2), `${FILE}: phone header vs REC label`);
  out.push(`<g class="hdr">${g(line(host, { x: LEFT, y: 90, size: 36, ls: 2 }), COLOR.text)}${recLabel(channel, RIGHT, 90, 36, 2)}</g>`);

  const receiving = '▸ NOW RECEIVING';
  const typed = typedLine({
    id: 'tym', text: receiving, inner: g(line(receiving, { x: LEFT, y: 152, size: 38, ls: 2 }), COLOR.white),
    x: LEFT, y: 152, size: 38, ls: 2, clipY: 116, clipH: 46, cursor: true,
  });
  out.push(typed.markup);
  defs.push(typed.def);
  reveals.push([...typed.reveal, 0.45, T.title]);

  const offsets = chromaFor(180);
  assertWidth(id.handle, 180, 0, GX + GW - 64 - offsets.dx, `${FILE}: phone title vs the glass`);
  out.push(`<g class="tin">${chroma(line(id.handle, { x: 64, y: 334, size: 180 }), { ...offsets, j: 'T' })}</g>`);
  out.push(`<g class="in in4">${g(line(id.name.toUpperCase(), { x: LEFT, y: 410, size: 56, ls: 3 }), COLOR.white)}</g>`);

  // The tagline is one phrase and gets one line, exactly as the OG card sets it: split over two columns it
  // read as four fragments ("APPLIED AI / WEB" beside "FULL-STACK DEVELOPER", then the other half beside the
  // city), which is four things to reassemble on the smallest screen. The role and the city take the line
  // under it, left and right the way the desktop pairs its rows.
  const role = id.role.toUpperCase(), city = id.city.toUpperCase();
  assertWidth(id.tagline, 38, 1, RIGHT - LEFT, `${FILE}: phone tagline`);
  assertGap(LEFT + measure(role, 38, 1), RIGHT - measure(city, 38, 1), `${FILE}: phone role vs city`);
  out.push(`<g class="in in5">${g(line(id.tagline, { x: LEFT, y: 466, size: 38, ls: 1 }), COLOR.text)}` +
    `${g(line(role, { x: LEFT, y: 516, size: 38, ls: 1 }), COLOR.text)}` +
    `${g(line(city, { x: RIGHT, y: 516, size: 38, ls: 1, anchor: 'end' }), COLOR.text)}</g>`);

  return { markup: out.join(''), defs, reveals };
}

/** The §3.7 tier-A motion: the one-shot power-on, the ambient loops, and the 7 s tracking error. */
function heroMotion(reveals) {
  const twitch = `${TWITCH_PERIOD}s steps(1,end) ${T.twitch}s infinite`;
  return [
    // ambient loops from the settled frame (the .grain rule is replaced at the end, so it comes first)
    ambientA({ H, bandH: BAND_H.hero, start: T.settled }),
    // power-on: line, picture, veil, channel static, bars collapse, castellation
    animate('.line', `line .45s linear${at(T.line)} both`) + KF.line,
    animate('.pic', `pwr .75s cubic-bezier(.25,.8,.3,1)${at(T.power)} both`) + KF.pwr,
    animate('.flash', `flash .6s linear${at(T.power)} both`) + KF.flash,
    animate('.burst', `burst 1.15s steps(1,end)${at(T.burst)} both`) + KF.burst,
    animate('.bars', `bars 1.25s linear${at(T.burst)} both`) + kf.bars({ sx: SX, sy: SY }),
    animate('.cast', `pop .01s steps(1,end)${at(T.cast)} backwards`) + KF.pop,
    // the card writes itself: header, title, typed lines, identity rows, station bug, caret
    animate('.hdr', `flick .3s linear${at(T.header)} backwards`) + KF.flick,
    animate('.tin', `tw .36s linear${at(T.title)} backwards`) + KF.tw,
    reveals.map(([cls, n, duration, delay]) => typeReveal({ cls, n, duration, delay })).join(''),
    animate('.in', 'flick .3s linear backwards') + `.in4{animation-delay:${r2(T.name)}s}.in5{animation-delay:${r2(T.tagline)}s}`,
    animate('.bug', `pop3 .3s steps(3,end)${at(T.bug)} backwards`) + KF.pop3,
    animate('.caret', `blinkIn .8s step-end${at(T.caret)} infinite backwards`) + KF.blinkIn,
    // CHROMA-IN, then the tracking error every 7 s: chroma jumps, torn title slice, bug bars, grain burst
    animate('.cyT', `cyin .45s ${CHROMA_EASE}${at(T.chroma)} backwards`, `twcT ${twitch}`) + KF.cyin + kf.jumps({ name: 'twcT', keys: TWITCH_CYAN }),
    animate('.rdT', `rdin .45s ${CHROMA_EASE}${at(T.chroma)} backwards`, `twrT ${twitch}`) + KF.rdin + kf.jumps({ name: 'twrT', keys: TWITCH_RED }),
    animate('.tear', `tear ${twitch}`) + kf.pulse({ name: 'tear', on: 52, off: 55, base: 0, peak: 1 }),
    animate('.bugbars', `bugtw ${twitch}`) + kf.jumps({ name: 'bugtw', keys: TWITCH_BUG }),
    animate('.grain', 'grain .48s steps(1,end) infinite', `gburst ${twitch}`) + kf.pulse({ name: 'gburst', on: 51, off: 57, base: GRAIN.hero, peak: 0.3 }),
  ].join('');
}

export function build(C) {
  const seed = (purpose) => seedOf(`${FILE}#${purpose}`);
  const t = tv({ bezel: 'hero', W, H, bandH: BAND_H.hero, seed: seed('grain'), grain: GRAIN.hero, scanPhone: SCAN.heroPhone });
  const d = desktop(C), m = phone(C);

  // the strip is shared by both tunings; it is also the layer the power-on collapses out of
  const strip = `<g class="bars">${bars(STRIP.x, STRIP.y, STRIP.w, STRIP.h)}` +
    `<rect x="${STRIP.x}" y="${STRIP.y}" width="${STRIP.w}" height="${STRIP.h}" fill="url(#sn)"/></g>` +
    `<g class="cast">${bars(STRIP.x, STRIP.y + STRIP.h, STRIP.w, STRIP.castH, COLOR.cast)}</g>`;
  // transient full-frame layers (SPEC §3.5): channel static and the power-on veil ride inside the tube,
  // the opening line outside it, so the tube can scale from a line while the line itself stays straight
  const glass = `x="${GX}" y="${GY}" width="${GW}" height="${GH}"`;
  const body = `${t.back}<g clip-path="url(#glass)"><g class="pic">${t.effects}` +
    `<g class="d">${d.markup}</g><g class="m">${m.markup}</g>${strip}` +
    `<rect class="burst ev" ${glass} fill="url(#bu)"/><rect class="flash ev" ${glass} fill="${COLOR.white}"/></g>` +
    `<rect class="line ev" x="${GX}" y="${r2(H / 2 - 2)}" width="${GW}" height="4" fill="${COLOR.white}"/></g>`;

  const id = C.identity;
  // alt prose: lower-case every word longer than two letters, so acronyms (AI) survive
  const spoken = (s) => s.split(' ').map((word) => (word.length > 2 ? word.toLowerCase() : word)).join(' ');
  const strands = id.tagline.split(' / ').map(spoken);
  const summary = `${strands.slice(0, -1).join(', ')} and ${strands.at(-1)}`;
  // The last sentence names the destination: this image is a link, and an alt that only describes the picture
  // leaves a screen-reader user with no idea where activating it goes.
  const alt = `${id.handle} — ${id.name}, ${spoken(id.receiving)}. ${id.student}. ` +
    `${summary[0].toUpperCase()}${summary.slice(1)}. ${id.city}. Opens ${new URL(C.site).host}.`;

  const svg = svgDoc({
    W, H, label: alt,
    css: tuning(TYPE[1200].tuning) + hidden('burst', 'flash', 'line', 'tear') +
      '.line{transform-box:fill-box;transform-origin:50% 50%}' +
      `.pic{transform-box:view-box;transform-origin:${W / 2}px ${H / 2}px}` +
      `.bars{transform-box:view-box;transform-origin:${W / 2}px ${r2(OY)}px}`,
    motion: heroMotion([...d.reveals, ...m.reveals]),
    defs: t.defs + stripNoise('sn', seed('strip')) + burstPattern('bu', { seed: seed('burst') }) + d.defs.join('') + m.defs.join(''),
    body,
  });
  return [{ file: FILE, svg, alt, href: C.links.home, region: 'hero', tier: 'A' }];
}
