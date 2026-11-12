// The continuous canvas: one page coordinate system, sliced into tiles at emit time.
import { polyD, bboxOf, C, polyArea, W } from './draw.mjs';
import { GLYPH_EM, advance, kernOf, outline, measure, wrap } from './type.mjs';

const PHONE_COLUMN = 700; // below this column width the tile shows its phone composition

const n4 = (v) => String(+v.toFixed(4)).replace(/^(-?)0\./, '$1.');
// polygons wound one way, so that overlapping pieces fill as their union under the default nonzero rule
const wound = (list) => list.filter((p) => p && p.length > 2).map((p) => (polyArea(p) < 0 ? [...p].reverse() : p));

export class Page {
  constructor(width = W) {
    this.width = width; this.items = []; this.defs = {}; this.seq = 0;
    this.glyphIds = new Map(); this.glyphSeq = 0; // one id per glyph, in order of first use
    this.log = { cuts: [], paras: [] }; // what the guards read back
    this.extra = {}; // def(): id -> markup a tile carries when its body (or one of its swaps) names url(#id)
    this.swaps = []; // swap(): [class token, phone css], a rule a tile carries when its body uses the class
    this.shared = {}; // share(): id -> markup a tile carries when its body names url(#id) or href="#id"
    this.clipIds = new Map(); this.clipSeq = 0; this.shareSeq = 0;
  }
  // a definition (pattern, clip path) written into every tile whose body or swaps refer to it by url(#id)
  def(id, markup) { this.extra[id] = markup; return id; }
  // a phone rule, emitted inside the phone media block of any tile whose body uses class `token`
  swap(token, css) { if (!this.swaps.some((s) => s[0] === token)) this.swaps.push([token, css]); return token; }
  // A clip path in page units, the union of the polygons: every tile shares one coordinate system, so one def serves all of
  // them. The same polygons give the same id. Ids are k1, k2, ...
  clip(list) {
    const d = wound(list).map((p) => polyD(p)).join('');
    if (this.clipIds.has(d)) return this.clipIds.get(d);
    const id = 'k' + (++this.clipSeq).toString(36);
    this.clipIds.set(d, id);
    this.def(id, `<clipPath id="${id}"><path d="${d}"/></clipPath>`);
    return id;
  }
  // a shared definition (a path several <use>s draw, a pattern) a `raw` item refers to by href or url
  share(id, markup) { this.shared[id] = markup; return id; }
  // a fresh id for a shared definition: n1, n2, ... (per page, so two builds name alike)
  nid() { return 'n' + (++this.shareSeq).toString(36); }
  // kit-made markup with its own bounding box, for tiling
  raw(markup, b, opt = {}) { this.items.push({ kind: 'raw', markup, b, z: opt.z ?? this.seq++, cls: opt.cls, before: opt.before, from: opt.from }); }

  // add a group of polygons: filtered per tile. opt: {cls, z, before, from, clip}
  polys(list, attrs = '', opt = {}) {
    const polys = list.filter((p) => p && p.length > 2).map((p) => ({ p, b: bboxOf(p) }));
    if (!polys.length) return;
    this.items.push({ kind: 'polys', polys, attrs, z: opt.z ?? this.seq++, cls: opt.cls, before: opt.before, from: opt.from, clip: opt.clip });
  }
  // polygons with holes: rings are grouped per instance so they stay together; evenodd
  rings(list, attrs = '', opt = {}) {
    const insts = list.map((rs) => ({ rs, b: bboxOf(rs.flat()) }));
    this.items.push({ kind: 'rings', insts, attrs, z: opt.z ?? this.seq++, cls: opt.cls, before: opt.before, from: opt.from, clip: opt.clip });
  }
  // axis-aligned lines [[x0, y0, x1, y1]]
  segs(list, attrs = '', opt = {}) { this.items.push({ kind: 'segs', list, attrs, z: opt.z ?? this.seq++, cls: opt.cls, before: opt.before, from: opt.from }); }

  // Text as <use> glyphs on the face's own em, kerned. (x, y) is the start of the baseline. opts:
  //   size (em in page units), rot (degrees about x, y), fill, cls, track (glyph units), z, before, from;
  //   stroke + sw: outline type, a stroke sw page units wide in place of the fill;
  //   paint: a kit-made attribute string in place of the fill (a tube's stroke, a pattern);
  //   matrix [a, b, c, d, e, f]: the em square mapped straight onto the page (a word set into a plane), page units per em unit;
  //   skew: degrees of shear after the rotation; clip: an id from page.clip(); vstep: vertical setting, one glyph per vstep
  //   page units down the rotated axis, each centred on it; crossing: the line may run past its tile's right edge (exempts
  //   Overflow only).
  text(F, str, x, y, { size = 24, rot = 0, fill = C.black, cls, track = 0, z, crossing = false, stroke, sw = 4, matrix, clip, skew = 0, paint, before, from, vstep = 0 } = {}) {
    const em = F.em || GLYPH_EM;
    const s = size / em; let cx = 0;
    const rad = (rot * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
    const gl = [];
    let prev = '';
    for (const ch of str) {
      cx += kernOf(F, prev, ch) * em / F.upm; prev = ch;
      if (ch === ' ') { cx += advance(F, ' ', em) + track; continue; }
      const k0 = F.key + '_' + ch;
      let id = this.glyphIds.get(k0);
      if (!id) { id = 'g' + (this.glyphSeq++).toString(36); this.glyphIds.set(k0, id); }
      if (!this.defs[id]) this.defs[id] = outline(F, ch);
      const adv = advance(F, ch, em);
      if (vstep) { // set downward: each glyph centred on the axis, one step under the last
        const ly = gl.length * vstep;
        gl.push({ id, x: Math.round(-adv / 2), y: Math.round(ly / s), ax: x - si * ly, ay: y + co * ly });
        continue;
      }
      const lx = (cx + adv / 2) * s;
      gl.push({ id, x: Math.round(cx), y: 0, ax: x + co * lx, ay: y + si * lx });
      cx += adv + track;
    }
    // a matrix maps the em square straight onto the page; otherwise translate, rotate, shear, scale
    const tr = matrix ? `matrix(${matrix.map((v, i) => (i < 4 ? n4(v * s) : +v.toFixed(1))).join(' ')})` : `translate(${+x.toFixed(1)} ${+y.toFixed(1)})${rot ? ` rotate(${+rot.toFixed(3)})` : ''}${skew ? ` skewX(${+skew.toFixed(2)})` : ''} scale(${n4(s)})`;
    const look = paint || (stroke ? `fill="none" stroke="${stroke}" stroke-width="${+(sw / s).toFixed(2)}" stroke-linejoin="round"` : (fill ? `fill="${fill}"` : ''));
    if (matrix) for (const g of gl) { g.ax = matrix[4] + (matrix[0] * g.x + matrix[2] * -em * 0.35) * s; g.ay = matrix[5] + (matrix[1] * g.x + matrix[3] * -em * 0.35) * s; }
    this.items.push({ kind: 'text', gl, tr, fill, paint: look, cls, size, z: z ?? this.seq++, str, face: F.key, x: matrix ? matrix[4] : x, y: matrix ? matrix[5] : y, rot, width: cx * s, crossing, clip, matrix, before, from, vstep });
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
    const put0 = (s, cls) => { const last = runs[runs.length - 1], key = cls || ''; if (last && last[0] === key) last[1] += s; else runs.push([key, s]); };
    const put = (s, cls, clip) => put0(clip ? `<g clip-path="url(#${clip})">${s}</g>` : s, cls);
    // a display-switching class sits inside any animation class, never on or above it
    const split = (cls) => { const all = (cls || '').split(/\s+/).filter(Boolean); return { sw: all.filter((c) => c === 'd' || c === 'm').join(' '), an: all.filter((c) => c !== 'd' && c !== 'm').join(' ') }; };
    const grp = (s, cls) => { const { sw, an } = split(cls); let out = s; if (sw) out = `<g class="${sw}">${out}</g>`; if (an) out = `<g class="${an}">${out}</g>`; return out; };
    for (const it of items) {
      if (it.before != null && y >= it.before) continue; // never in a tile whose top is at or below the line
      if (it.from != null && y + h <= it.from) continue; // nor in a tile whose bottom is at or above the line
      if (it.kind === 'raw') { if (hit(it.b)) put(it.markup, it.cls); continue; }
      if (it.kind === 'polys') {
        const d = it.polys.filter((q) => hit(q.b)).map((q) => polyD(q.p)).join('');
        if (d) put(`<path ${it.attrs} d="${d}"/>`, it.cls, it.clip);
      } else if (it.kind === 'rings') {
        const d = it.insts.filter((q) => hit(q.b)).map((q) => q.rs.map((r) => polyD(r)).join('')).join('');
        if (d) put(`<path fill-rule="evenodd" ${it.attrs} d="${d}"/>`, it.cls, it.clip);
      } else if (it.kind === 'text') {
        const m = it.size * (it.matrix ? 2 : 1); const gs = it.gl.filter((g) => g.ax > x - m && g.ax < x + w + m && g.ay + m * 0.35 > y && g.ay - m < y + h);
        if (gs.length) { gs.forEach((g) => used.add(g.id)); put(`<g${it.paint ? ' ' + it.paint : ''} transform="${it.tr}">` + gs.map((g) => `<use href="#${g.id}"${g.x ? ` x="${g.x}"` : ''}${g.y ? ` y="${g.y}"` : ''}/>`).join('') + '</g>', it.cls, it.clip); }
      } else if (it.kind === 'segs') {
        const d = it.list.filter((q) => hit([Math.min(q[0], q[2]), Math.min(q[1], q[3]), Math.max(q[0], q[2]), Math.max(q[1], q[3])])).map((q) => (q[1] === q[3] ? `M${q[0]} ${q[1]}h${q[2] - q[0]}` : `M${q[0]} ${q[1]}v${q[3] - q[1]}`)).join('');
        if (d) put(`<path fill="none" ${it.attrs} d="${d}"/>`, it.cls);
      }
    }
    const body = runs.map(([cls, s]) => grp(s, cls)).join('');
    let defs = [...used].map((id) => `<path id="${id}" d="${this.defs[id]}"/>`).join('');
    // the phone swaps a tile's body uses, and every def named by the body or by those swaps
    const swaps = this.swaps.filter(([tok]) => new RegExp('class="[^"]*\\b' + tok + '\\b').test(body)).map((s) => s[1]).join('');
    for (const [id, mk] of Object.entries(this.extra)) if (body.includes(`url(#${id})`) || swaps.includes(`url(#${id})`)) defs += mk;
    for (const [id, mk] of Object.entries(this.shared)) if (body.includes(`url(#${id})`) || body.includes(`href="#${id}"`)) defs += mk;
    const bp = Math.round(PHONE_COLUMN * share);
    const media = `.m{display:none}@media (max-width:${bp}px){.d{display:none}.m{display:inline}${swaps}}`;
    // WebKit floors an image's viewport to a whole px, so any aspect-keeping fit shifts the drawing and forms step at the seams. "none" fills the box
    // exactly. It also drops the ratio a viewBox alone gives, so width and height carry it.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="none"><style>${media}${typeof css === 'function' ? css(body) : css}</style>${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
    return { file, svg, bytes: Buffer.byteLength(svg), body, x, y, w, h, share };
  }
}
