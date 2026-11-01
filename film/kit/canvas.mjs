// The continuous canvas: one page coordinate system, sliced into tiles at emit time.
import { polyD, bboxOf, C, polyArea, rng, W } from './draw.mjs';
import { GLYPH_EM, advance, outline, measure, wrap } from './type.mjs';

const GRAIN_COL = { [C.verm]: 'pv', [C.blue]: 'pb', [C.graphite]: 'pg' };
function grainPattern(col, id) {
  const R = rng(col.length + id.charCodeAt(1)); const T = 25; let d = `M-1-1h${T + 2}v${T + 2}h-${T + 2}z`;
  for (let i = 0; i < 15; i++) { const x = R() * T, y = R() * T, a = 0.7 + R() * 1.5, b = 0.5 + R() * 1.1; d += `M${x.toFixed(1)} ${y.toFixed(1)}l${a.toFixed(1)} ${(b * 0.4).toFixed(1)}l${(-a * 0.3).toFixed(1)} ${b.toFixed(1)}l${(-a).toFixed(1)} ${(-b * 0.5).toFixed(1)}z`; }
  // every number here has a decimal point, so the leading zeros and the spaces before a point or a sign are not needed
  d = d.replace(/(?<![\d.])0\./g, '.').replace(/ (?=[.-])/g, '');
  return `<pattern id="${id}" width="${T}" height="${T}" patternUnits="userSpaceOnUse"><path fill="${col}" fill-rule="evenodd" d="${d}"/></pattern>`;
}
const thin = (p) => { let per = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; per += Math.hypot(a[0] - b[0], a[1] - b[1]); } return Math.abs(polyArea(p)) / (per || 1) < 2.4; };

// The phone thickening: a path that carries a stroke of its own colour at width 0, in a group of class pl, is widened by this
// rule on a phone. The kit's pencil polys do not carry the stroke: turning it on for them adds 34 B per pencil path and changes
// every pencil line at 293. The rings in sections/lights.mjs do, so the rule is live for them. Do not delete it. A tile with no
// such path does not pay for it, and with the switch off a pencil poly does not pay for the group.
const PENCIL_THICKENS = false;
const STROKED = 'stroke-width="0"';
const PHONE_CSS = '.pl path{stroke-width:2.4}';
const PHONE_COLUMN = 700; // below this column width the tile shows its phone composition

export class Page {
  constructor(width = W) {
    this.width = width; this.items = []; this.defs = {}; this.seq = 0;
    this.glyphIds = new Map(); this.glyphSeq = 0; // one id per glyph, in order of first use
    this.log = { cuts: [], paras: [] }; // what the guards read back
  }
  // add a group of polygons: filtered per tile
  polys(list, attrs = '', opt = {}) {
    const polys = list.filter((p) => p && p.length > 2).map((p) => ({ p, b: bboxOf(p) }));
    if (!polys.length) return;
    const pl = PENCIL_THICKENS && opt.cls && /\bpl\b/.test(opt.cls); const fm = /fill="([^"]+)"/.exec(attrs); let a2 = pl && fm ? attrs + ` stroke="${fm[1]}" stroke-width="0"` : attrs;
    if (fm && GRAIN_COL[fm[1]] && polys.every((q) => thin(q.p))) a2 = a2.replace(`fill="${fm[1]}"`, `fill="url(#${GRAIN_COL[fm[1]]})"`);
    const cls = PENCIL_THICKENS ? opt.cls : (opt.cls || '').replace(/\bpl\b ?/, '');
    this.items.push({ kind: 'polys', polys, attrs: a2, z: opt.z ?? this.seq++, cls, before: opt.before });
  }
  // polygons with holes: rings are grouped per instance so they stay together
  rings(list, attrs = '', opt = {}) {
    const insts = list.map((rs) => ({ rs, b: bboxOf(rs.flat()) }));
    this.items.push({ kind: 'rings', insts, attrs, z: opt.z ?? this.seq++, cls: opt.cls });
  }
  segs(list, attrs = '', opt = {}) { this.items.push({ kind: 'segs', list, attrs, z: opt.z ?? this.seq++, cls: opt.cls }); }
  // text as <use> glyphs. opts: size, rot, fill, cls, track, jit, R. `crossing` declares a line that may run past
  // its tile's right edge; `mark` declares a chart mark, which guards hold to SCORE.
  text(F, str, x, y, { size = 24, rot = 0, fill = C.graphite, cls, track = 0, jit = 0, R = null, z, crossing = false, mark = false } = {}) {
    const em = GLYPH_EM;
    const s = size / em; let cx = 0;
    const rad = (rot * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
    const gl = [];
    for (const ch of str) {
      if (ch === ' ') { cx += advance(F, ' ', em) + track; continue; }
      const k0 = F.key + '_' + ch;
      let id = this.glyphIds.get(k0);
      if (!id) { id = 'g' + (this.glyphSeq++).toString(36); this.glyphIds.set(k0, id); }
      if (!this.defs[id]) this.defs[id] = outline(F, ch);
      const adv = advance(F, ch, em);
      const dx = jit && R ? (R() - 0.5) * jit * em / 1000 : 0, dy = jit && R ? (R() - 0.5) * jit * em / 1000 : 0;
      const lx = (cx + adv / 2) * s;
      gl.push({ id, x: Math.round(cx + dx), y: Math.round(dy), ax: x + co * lx, ay: y + si * lx });
      cx += adv + track;
    }
    const tr = `translate(${+x.toFixed(1)} ${+y.toFixed(1)})${rot ? ` rotate(${rot})` : ''} scale(${String(+s.toFixed(4)).replace(/^0\./, '.')})`;
    this.items.push({ kind: 'text', gl, tr, fill, cls, size, z: z ?? this.seq++, str, face: F.key, x, y, rot, width: cx * s, crossing, mark });
    return cx * s;
  }
  measure(F, str, size, track = 0) { return measure(F, str, size, track); }
  wrap(F, str, size, maxW) { return wrap(F, str, size, maxW); }

  // cut one tile out of the canvas. css is a string or fn(body) => string. Returns the file; the build writes it.
  emit({ file, x, y, w, h, css = '', share = 1 }) {
    const M = 14; const win = [x - M, y - M, x + w + M, y + h + M];
    const hit = (b) => !(b[2] < win[0] || b[0] > win[2] || b[3] < win[1] || b[1] > win[3]);
    const items = this.items.slice().sort((a, b) => a.z - b.z);
    const runs = []; const used = new Set(); // [classes, markup]: items in a row with the same classes share one group
    const put = (s, cls) => { const last = runs[runs.length - 1], key = cls || ''; if (last && last[0] === key) last[1] += s; else runs.push([key, s]); };
    // a display-switching class sits inside any animation class, never on or above it
    const split = (cls) => { const all = (cls || '').split(/\s+/).filter(Boolean); return { sw: all.filter((c) => c === 'd' || c === 'm').join(' '), an: all.filter((c) => c !== 'd' && c !== 'm').join(' ') }; };
    const grp = (s, cls) => { const { sw, an } = split(cls); let out = s; if (sw) out = `<g class="${sw}">${out}</g>`; if (an) out = `<g class="${an}">${out}</g>`; return out; };
    for (const it of items) {
      if (it.before != null && y >= it.before) continue; // film layers never reach a tile below the film, nor anything else its next tile would only paint over
      if (it.kind === 'polys') {
        const d = it.polys.filter((q) => hit(q.b)).map((q) => polyD(q.p)).join('');
        if (d) put(`<path ${it.attrs} d="${d}"/>`, it.cls);
      } else if (it.kind === 'rings') {
        const d = it.insts.filter((q) => hit(q.b)).map((q) => q.rs.map((r) => polyD(r)).join('')).join('');
        if (d) put(`<path fill-rule="evenodd" ${it.attrs} d="${d}"/>`, it.cls);
      } else if (it.kind === 'text') {
        const m = it.size; const gs = it.gl.filter((g) => g.ax > x - m && g.ax < x + w + m && g.ay + m * 0.35 > y && g.ay - m < y + h);
        if (gs.length) { gs.forEach((g) => used.add(g.id)); put(`<g${it.fill ? ` fill="${it.fill}"` : ''} transform="${it.tr}">` + gs.map((g) => `<use href="#${g.id}"${g.x ? ` x="${g.x}"` : ''}${g.y ? ` y="${g.y}"` : ''}/>`).join('') + '</g>', it.cls); }
      } else if (it.kind === 'segs') {
        const d = it.list.filter((q) => hit([Math.min(q[0], q[2]), Math.min(q[1], q[3]), Math.max(q[0], q[2]), Math.max(q[1], q[3])])).map((q) => (q[1] === q[3] ? `M${q[0]} ${q[1]}h${q[2] - q[0]}` : `M${q[0]} ${q[1]}v${q[3] - q[1]}`)).join('');
        if (d) put(`<path fill="none" ${it.attrs} d="${d}"/>`, it.cls);
      }
    }
    const body = runs.map(([cls, s]) => grp(s, cls)).join('');
    let defs = [...used].map((id) => `<path id="${id}" d="${this.defs[id]}"/>`).join('');
    for (const [col, id] of Object.entries(GRAIN_COL)) if (body.includes(`url(#${id})`)) defs += grainPattern(col, id);
    const bp = Math.round(PHONE_COLUMN * share);
    const media = `.m{display:none}@media (max-width:${bp}px){.d{display:none}.m{display:inline}${body.includes(STROKED) ? PHONE_CSS : ''}}`;
    // WebKit floors an image's viewport to a whole px, so any aspect-keeping fit shifts the drawing and forms step at the seams. "none" fills the box
    // exactly. It also drops the ratio a viewBox alone gives, so width and height carry it.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none"><style>${media}${typeof css === 'function' ? css(body) : css}</style>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
    return { file, svg, bytes: Buffer.byteLength(svg), body, x, y, w, h, share };
  }
}
