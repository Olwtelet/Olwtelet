// The CRT set every asset is drawn on (SPEC §3.4, §3.5, §3.9): bezel, glass clip, the effect layers in the
// site's order (scanlines → grain → vignette → band, all under the content), the phone tuning switch, and the
// SVG document boilerplate.
import { COLOR, BEZEL, SCAN, GRAIN, r2 } from './tokens.mjs';
import { attr, esc, unescapeAttr } from './text.mjs';
import { fontFace } from './font.mjs';
import { NO_PREFERENCE, REDUCE, dedupeKeyframes } from './motion.mjs';
import { scanPattern, bandGradient, vignetteGradient, grainPattern } from './fx.mjs';

/**
 * A TV screen of size W×H.
 *   bezel      a tokens.BEZEL preset name ('card') or an object { rx, stroke, inset }
 *   bandH      rolling band height (tokens.BAND_H)
 *   seed       grain tile seed, e.g. seedOf('on-air.svg#grain')
 *   grain      resting grain opacity (tokens.GRAIN)
 *   scanPhone  [period, line] of the phone scanlines (tokens.SCAN.heroPhone / buttonPhone for those assets)
 * Returns the defs (ids glass, sd, sm, bg, vg, gr), the bezel `back`, the `effects` layers, the glass rect
 * (gx, gy, gw, gh) and compose(content, events) = back + <g clip-path="url(#glass)">effects content events</g>.
 * @example
 *   const t = tv({ bezel: 'card', W: 600, H: 400, bandH: BAND_H.card, seed: seedOf('file-01-argus.svg#grain') });
 *   svgDoc({ W: 600, H: 400, label, css, motion, defs: t.defs + extraDefs, body: t.compose(content, events) })
 */
export function tv({ bezel, W, H, bandH, seed, grain = GRAIN.default, scanPhone = [SCAN.m.period, SCAN.m.line] }) {
  const preset = typeof bezel === 'string' ? BEZEL[bezel] : bezel;
  if (!preset) throw new Error(`tv: unknown bezel "${bezel}" (use one of ${Object.keys(BEZEL).join(', ')})`);
  if (!Number.isInteger(seed)) throw new Error('tv: seed must be an integer, e.g. seedOf("file.svg#grain")');
  const { rx, stroke, inset } = preset;
  const gx = inset, gy = inset, gw = W - 2 * inset, gh = H - 2 * inset;
  const glassRect = `x="${gx}" y="${gy}" width="${gw}" height="${gh}"`;

  const defs = `<clipPath id="glass"><rect ${glassRect} rx="${Math.max(4, rx - 8)}"/></clipPath>` +
    scanPattern('sd', SCAN.d.period, SCAN.d.line, SCAN.d.op) + scanPattern('sm', scanPhone[0], scanPhone[1], SCAN.m.op) +
    bandGradient('bg') + vignetteGradient('vg') + grainPattern('gr', seed);

  const back = `<rect x="${r2(stroke / 2)}" y="${r2(stroke / 2)}" width="${r2(W - stroke)}" height="${r2(H - stroke)}" rx="${rx}" fill="${COLOR.glass}" stroke="${COLOR.bezel}" stroke-width="${stroke}"/>` +
    `<rect x="${gx - 2}" y="${gy - 2}" width="${gw + 4}" height="${gh + 4}" rx="${Math.max(4, rx - 6)}" fill="none" stroke="${COLOR.bezelInner}" stroke-width="2"/>`;

  const effects = `<rect class="scan-d" ${glassRect} fill="url(#sd)"/><rect class="scan-m" ${glassRect} fill="url(#sm)"/>` +
    `<rect class="grain" x="${gx - 180}" y="${gy - 180}" width="${gw + 360}" height="${gh + 360}" fill="url(#gr)" opacity="${grain}"/>` +
    `<rect ${glassRect} fill="url(#vg)"/>` +
    `<rect class="band" x="${gx}" y="0" width="${gw}" height="${bandH}" fill="url(#bg)"/>`;

  const compose = (content, events = '') => `${back}<g clip-path="url(#glass)">${effects}${content}${events}</g>`;
  return { defs, back, effects, compose, gx, gy, gw, gh };
}

/**
 * Phone tuning switch (SPEC §3.2), evaluated against the image's own rendered width: desktop composition in
 * <g class="d">, phone composition in <g class="m">. Breakpoints: tokens.TYPE[1200|600|300].tuning.
 * @example tuning(520)
 */
export const tuning = (maxWidthPx) =>
  `.m,.scan-m{display:none}@media (max-width:${maxWidthPx}px){.d,.scan-d{display:none}.m,.scan-m{display:inline}}`;

/** Every character drawn by <text> elements in `markup` (what the embedded font must cover). */
export const renderedText = (markup) => [...markup.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => unescapeAttr(m[1])).join('');

/**
 * The complete SVG file (SPEC §3.9): root attributes, <title>, the embedded font, settled CSS, motion wrapped in
 * the no-preference block (keyframes de-duplicated), the reduce block, defs and body. Ends with a newline.
 *   label     alt text: aria-label and <title>
 *   css       settled frame + tuning (no animation here: lint rejects it)
 *   motion    output of motion.mjs builders
 *   fontText  characters to keep when subsetting (default: everything drawn by <text> in body)
 *   font      'full' | 'subset' override (default: the mode chosen by selectFontMode)
 *   attrs     extra root attributes, e.g. { 'data-total': 388 }
 */
export function svgDoc({ W, H, label, css = '', motion = '', defs = '', body = '', fontText, font, attrs = {} }) {
  if (!label || !String(label).trim()) throw new Error('svgDoc: label (the alt text) is required');
  if (!(W > 0 && H > 0)) throw new Error('svgDoc: W and H must be positive');
  const extra = Object.entries(attrs).map(([k, v]) => ` ${k}="${attr(v)}"`).join('');
  const face = fontFace({ mode: font, text: fontText ?? renderedText(body) });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${attr(label)}" font-family="VCR, monospace"${extra}>\n` +
    `<title>${esc(label)}</title>\n` +
    `<style>${face}\ntext{white-space:pre}\n${css}\n${NO_PREFERENCE}\n${dedupeKeyframes(motion)}\n}\n${REDUCE}\n</style>\n` +
    `<defs>${defs}</defs>\n${body}\n</svg>\n`;
}

/**
 * QA copy of an svgDoc() file with motion disabled and the reduce block forced on: what a viewer with
 * "reduce motion" sees. Throws if the boilerplate is not found.
 */
export function reducedPreview(svg) {
  const reduce = '@media (prefers-reduced-motion:reduce){';
  if (svg.split(NO_PREFERENCE).length !== 2 || svg.split(reduce).length !== 2) {
    throw new Error('reducedPreview: expected exactly one no-preference block and one reduce block');
  }
  return svg.replace(NO_PREFERENCE, '@media not all{').replace(reduce, '@media all{');
}
