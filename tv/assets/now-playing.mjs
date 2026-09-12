// NOW PLAYING deck (SPEC §2, §2.1 "now-playing", §3.7 SLOT / SWITCH / EQ) → assets/tv/now-playing.svg.
// The four Spotify playlists are four channels of one deck: every SLOT seconds a static burst crosses the
// screen, the title group jumps three times (SWITCH) and the next playlist is on air (SLOT), while the SMPTE
// VU bars bounce at their own rates (EQ). The phone tuning keeps the header, the CH counter and a 60u title.
import { COLOR, BAND_H, GRAIN, TYPE, r2 } from '../lib/tokens.mjs';
import { line, measure, fit, fitTitle, assertGap, assertBelow, assertWidth } from '../lib/text.mjs';
import { g, spans, segWidth, chroma, chromaFor, rule, DOTS, burstPattern } from '../lib/fx.mjs';
import { tv, tuning, svgDoc } from '../lib/screen.mjs';
import { ambientB, slotSwitch, eq } from '../lib/motion.mjs';
import { seedOf } from '../lib/rng.mjs';
import { count } from '../content.mjs';

export const family = 'now-playing';

const FILE = 'now-playing.svg';
// 204u, not the prototype's 220: the deck's lowest ink was the foot of the VU meter with 14u of empty glass
// under it, and those 16u are 11 px of the page's desktop height budget (SPEC §1.1), spent on the six
// website links the README gained under the programme guide. The VU meter loses 8u of throw, nothing else
// moves: the phone title still sits centred in the space under the rule.
const W = 1200, H = 204;
const SLOT = 4; // seconds one playlist stays on air

// Layout (SPEC §2.1). `y` is always a text baseline.
const HEAD = { x: 56, y: 56, size: 24, ls: 3, chX: 1144 };
const HEAD_M = { x: 56, y: 78, size: 44, ls: 2, chSize: 40, chLs: 2 };
const RULE = { x: 56, y: 72, w: 1088 };
const VU = { x: 56, y: 90, w: 20, h: 96, pitch: 26 };
const TITLE = { x: 280, y: 142, maxW: 864, min: 24, max: 52 };
const TITLE_M = { x: 56, size: 60, maxW: 1088, baselines: { 1: [162], 2: [134, 188] } };
const DESC = { x: 282, y: 176, size: 20, ls: 1 };
const BURST = { x: 12, y: 80, w: 1176, h: H - 92 };

/** The VU meter: one bar per OG SMPTE color, scaled from its foot by the EQ keyframes. */
const vuMeter = () => COLOR.bars.map((fill, i) =>
  `<rect class="eq eq${i}" x="${VU.x + i * VU.pitch}" y="${VU.y}" width="${VU.w}" height="${VU.h}" fill="${fill}"/>`).join('');

/** One switching slot: `k` is visible only during its own SLOT-second window (motion.slotSwitch). */
const slot = (k, inner) => `<g class="pk pk${k}">${inner}</g>`;

export function build(C) {
  const items = C.playlists.items;
  const channels = count.playlists(C);
  const seed = (purpose) => seedOf(`${FILE}#${purpose}`);
  const t = tv({ bezel: 'deck', W, H, bandH: BAND_H.deck, seed: seed('grain'), grain: GRAIN.default });

  // ── header: "▮ PLAYLISTS · NOW PLAYING" left, the channel counter right ─────────────────────────
  const head = [['▮ ', COLOR.white], ['PLAYLISTS', COLOR.white], [' · NOW PLAYING', COLOR.text]];
  const headM = [['▮ ', COLOR.white], ['PLAYLISTS', COLOR.white]];
  const ch = (k) => `CH ${k + 1}/${channels}`;
  assertGap(HEAD.x + segWidth(head, HEAD.size, HEAD.ls), HEAD.chX - measure(ch(0), HEAD.size, HEAD.ls), `${FILE}: header vs CH counter`);
  assertGap(HEAD_M.x + segWidth(headM, HEAD_M.size, HEAD_M.ls), HEAD.chX - measure(ch(0), HEAD_M.chSize, HEAD_M.chLs), `${FILE}: phone header vs CH counter`);

  // ── titles: one size for all four playlists, the largest even size at which the longest one fits ──
  const titles = items.map((p) => p.name.toUpperCase());
  const size = Math.min(...titles.map((title) => fit(title, TITLE.maxW, { min: TITLE.min, max: TITLE.max, who: `${FILE} title` }).size));
  assertGap(VU.x + (COLOR.bars.length - 1) * VU.pitch + VU.w, TITLE.x, `${FILE}: VU meter vs title`);
  assertBelow(TITLE.y, DESC.y, DESC.size, `${FILE}: title vs description`);

  const deck = titles.map((title, k) => slot(k, chroma(line(title, { x: TITLE.x, y: TITLE.y, size }), { ...chromaFor(size), j: 'P' })));
  const counter = titles.map((_, k) => slot(k, g(line(ch(k), { x: HEAD.chX, y: HEAD.y, size: HEAD.size, ls: HEAD.ls, anchor: 'end' }), COLOR.text)));
  const description = `▸ ${C.playlists.description.toUpperCase()}`;
  assertWidth(description, DESC.size, DESC.ls, HEAD.chX - DESC.x, `${FILE} description`);

  const desktop = spans(HEAD.x, HEAD.y, HEAD.size, HEAD.ls, head) + counter.join('') +
    rule(RULE.x, RULE.y, RULE.w) + vuMeter() +
    `<g class="tz">${deck.join('')}</g>` +
    g(line(description, { x: DESC.x, y: DESC.y, size: DESC.size, ls: DESC.ls }), COLOR.text);

  // Phone: the title is always 60u; a name that does not fit on one line is split in two balanced lines.
  const deckM = titles.map((title, k) => {
    const { lines } = fitTitle(title, TITLE_M.maxW, { oneMin: TITLE_M.size, oneMax: TITLE_M.size, twoMin: TITLE_M.size, twoMax: TITLE_M.size });
    const ys = TITLE_M.baselines[lines.length];
    const drawn = lines.map((text, j) => line(text, { x: TITLE_M.x, y: ys[j], size: TITLE_M.size })).join('');
    return slot(k, chroma(drawn, { ...chromaFor(TITLE_M.size), j: 'P' }));
  });
  const counterM = titles.map((_, k) => slot(k, g(line(ch(k), { x: HEAD.chX, y: HEAD_M.y, size: HEAD_M.chSize, ls: HEAD_M.chLs, anchor: 'end' }), COLOR.text)));
  const phone = spans(HEAD_M.x, HEAD_M.y, HEAD_M.size, HEAD_M.ls, headM) + counterM.join('') + `<g class="tz">${deckM.join('')}</g>`;

  // ── document ────────────────────────────────────────────────────────────────────────────────────
  const switchBurst = `<rect class="sw ev" x="${BURST.x}" y="${BURST.y}" width="${BURST.w}" height="${BURST.h}" fill="url(#bu)"/>`;
  const alt = `Playlists, now playing: ${items.map((p) => p.name).join(', ')}. ${C.playlists.description}. ` +
    'Opens the playlists page.';
  const svg = svgDoc({
    W, H, label: alt,
    css: tuning(TYPE[1200].tuning) + '.pk{opacity:0}.pk0{opacity:1}.sw{opacity:0}' +
      '.eq{transform-box:fill-box;transform-origin:50% 100%;transform:scaleY(.6)}',
    // slotSwitch puts the channel change at the head of its slot, which would make the static burst the first
    // frame a visitor sees. Half a slot of negative delay on every switching layer keeps the burst married to
    // the title change and lands t = 0 in the middle of playlist 1 (SPEC §3.7: no tier-B event at t = 0).
    motion: ambientB({ H, bandH: BAND_H.deck, bandDelay: -5 }) + slotSwitch({ slots: channels, slot: SLOT }) +
      Array.from({ length: channels }, (_, k) => `.pk${k}{animation-delay:${r2(k * SLOT - SLOT / 2)}s}`).join('') +
      `.sw,.tz{animation-delay:${r2(-SLOT / 2)}s}` + eq(),
    defs: t.defs + DOTS + burstPattern('bu', { size: 180, count: 260, seed: seed('burst') }),
    body: t.compose(`<g class="d">${desktop}</g><g class="m">${phone}</g>`, switchBurst),
  });
  return [{ file: FILE, svg, alt, href: C.links.playlists, region: 'playlists' }];
}
