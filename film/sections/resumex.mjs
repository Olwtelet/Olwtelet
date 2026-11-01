// c5. Resumex: the dialogue track. The 9:16 frame crosses two seams, so it is painted after the Anti-Cheat field.
import { C, W, rng, pencil, lerp } from '../kit/draw.mjs';
import { cutLine, cutWidth } from '../kit/letters.mjs';
import { para } from '../kit/type.mjs';
import { towerQuad, towerFlat } from '../kit/scene.mjs';

function frame(page, ctx) {
  const { Y, COPY, faces } = ctx;
  const { gothic: Zen } = faces;
  const y0 = Y.resumex;
  const R = rng(611);
  const fw = 262, fh = (fw * 16) / 9, fx = 888, fy = y0 - 64;
  const q0 = [[fx, fy], [fx + fw, fy - 6], [fx + fw + 4, fy + fh], [fx + 4, fy + fh + 6]];
  page.polys([q0], `fill="${C.sumi}"`);
  // a shot from the video, not a splash screen: half as large again, the slab leaving through the top and the block through the side
  const qr = towerQuad([[fx + 20, fy - 70], [fx + fw + 108, fy - 76], [fx + fw + 108, fy + fh * 0.68], [fx + 22, fy + fh * 0.68 + 6]]);
  towerFlat(page, qr, { fill: C.toka, slitFill: C.sumi, clip: q0, planes: { blade: C.douga, side: C.blue, foot: C.blue, top: C.douga } });
  // the title stands at the track's own 54u and is forced to the frame's measure: it holds the floor at 293
  const hh = 54, tw = fw - 44, ty = fy + fh * 0.745;
  cutLine(page, COPY.resumexTitle, fx + 22, ty, hh, C.douga, { seed: 91, xs: tw / cutWidth(COPY.resumexTitle, hh) });
  page.text(Zen, COPY.resumexTarget, fx + 24, ty + hh + 36, { size: 19, fill: C.douga, cls: 'd' });
  for (let k = 0; k < 4; k++) page.polys(pencil(q0[k], q0[(k + 1) % 4], { w: 6.5, over: 22, R, restate: 0.7 }), `fill="${C.verm}"`, { cls: 'pl' });
}

export function draw(page, ctx) {
  const { Y, COPY, L0, faces, after } = ctx;
  const { gothic: Zen } = faces;
  const y0 = Y.resumex, y1 = Y.anticheat;
  // the field runs far enough under the red cut that no paper shows between them at the left edge
  page.polys([[[-14, y0], [W + 14, y0], [W + 14, y1 + 60], [-14, y1 + 60]]], `fill="${C.blue}"`);
  const x0 = L0, x1 = 836;
  let y = y0 + 22;
  const ticks = [], reds = []; // reds: an acid tick where a word starts, and nowhere else
  const hh = 54;
  COPY.resumexLines.forEach((l, li) => {
    const xs = (x1 - x0) / cutWidth(l, hh);
    cutLine(page, l, x0, y, hh, li === 3 ? C.toka : C.douga, { seed: 120 + li, xs });
    const yr = y + hh + 6;
    const tail = /,$/.test(l) ? x0 + cutWidth(l.slice(0, -1), hh) * xs : x1; // no tick under a comma's tail
    for (let k = 0; k <= 48; k++) { const x = Math.round(lerp(x0, x1, k / 48)); if (x < tail || x === x1) ticks.push([x, yr, x, yr + (k % 4 === 0 ? 9 : 5)]); }
    const ws = l.split(' '); let pre = '';
    ws.forEach((wd) => { const x = Math.round((x0 + (pre ? cutWidth(pre + ' ', hh) * xs : 0)) * 10) / 10; reds.push([x, yr - 2, x, yr + 12]); pre += (pre ? ' ' : '') + wd; });
    y += hh + 23;
  });
  page.segs(ticks, `stroke="${C.douga}" stroke-width="1.4"`);
  page.segs(reds, `stroke="${C.toka}" stroke-width="2.8"`);
  para(page, Zen, COPY.resumexFacts, x0, y + 16, 17.5, 24, { fill: C.douga, cls: 'd' });
  page.text(Zen, COPY.resumexPhone, x0, y + 36, { size: 41, fill: C.douga, cls: 'm' });

  after('anticheat', () => frame(page, ctx));
}
