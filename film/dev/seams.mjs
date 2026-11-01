// Seam, leak and geometry audit of the full README at many column widths and device pixel ratios.
// The two-colour leak test: two renders with different page colours, and any pixel that moves by (a,-a,a) shows the
// page through the art. The three peg holes are the only real holes, so their area is the expected leak.
//
// In Chromium this uses Playwright's deviceScaleFactor, which paints page-colour hairlines at 1.25, 1.5 and 2.625 that real
// scaling does not. Do not chase those: realseams.mjs is the answer for fractional scales. WebKit stays on whole numbers.
//
// usage: node seams.mjs <root> <chromium|webkit> [--out DIR] [--only 846x1,293x3]
import fs from 'node:fs';
import path from 'node:path';
import { argv, buildRoot, engineOf, openTall, opt, outDir, PNG, rowsOf, serve } from './lib.mjs';

const root = buildRoot('seams.mjs <root> <chromium|webkit> [--out DIR] [--only 846x1,293x3]');
const engineName = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'chromium';
const only = opt('--only')?.split(',');
const combos = (engineName === 'webkit'
  ? [[846, 1], [846, 2], [686, 2], [383, 2], [348, 3], [308, 3], [293, 2], [293, 3], [238, 2]]
  : [[846, 1], [846, 1.25], [846, 1.5], [846, 2], [686, 1], [686, 1.25], [606, 1], [383, 2], [348, 2.625], [330, 2.625], [308, 3], [293, 2], [293, 3], [238, 2]])
  .filter(([w, d]) => !only || only.includes(`${w}x${d}`));

const dir = outDir('seams');
const srv = await serve(root);
const browser = await engineOf(engineName).launch({ headless: true });
const results = [];

async function shot(w, dpr, bg) {
  const pad = (w < 500 ? 16 : 24) * 2;
  const ctx = await browser.newContext({ viewport: { width: w + pad, height: 1000 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await openTall(page, `http://127.0.0.1:${srv.port}/page?t=dark&w=${w}&bg=${bg}`, 3600);
  const geo = await page.evaluate(() => {
    const col = document.querySelector('.markdown-body').getBoundingClientRect();
    return {
      col: { l: col.left, t: col.top, w: col.width },
      ims: [...document.images].map((i) => { const b = i.getBoundingClientRect(); return { src: i.getAttribute('src').split('/').pop(), l: b.left, t: b.top + scrollY, w: b.width, h: b.height, a: i.parentElement.tagName }; }),
    };
  });
  const buf = await page.screenshot();
  await ctx.close();
  return { png: PNG.sync.read(buf), geo };
}

for (const [w, dpr] of combos) {
  const t0 = Date.now();
  const A = await shot(w, dpr, 'ff00ff');
  const B = await shot(w, dpr, '00ff00');
  const { geo } = A;
  const rows = rowsOf(geo.ims);
  const wrapped = rows.filter((r) => Math.abs(r.reduce((s, i) => s + i.w, 0) - w) > 1).map((r) => r.map((i) => i.src).join('+'));
  const gaps = [];
  for (let i = 1; i < rows.length; i++) {
    const prevBottom = Math.max(...rows[i - 1].map((x) => x.t + x.h));
    const gap = rows[i][0].t - prevBottom;
    if (Math.abs(gap) > 0.02) gaps.push({ at: rows[i][0].src, gap: +gap.toFixed(3) });
  }
  const hMis = rows.map((r) => Math.max(...r.map((x) => x.h)) - Math.min(...r.map((x) => x.h))).reduce((a, b) => Math.max(a, b), 0);
  // leak test
  const { width: W, height: H, data: a } = A.png; const b = B.png.data;
  const artL = Math.round(geo.col.l * dpr), artR = Math.round((geo.col.l + w) * dpr);
  const artT = Math.round(rows[0][0].t * dpr);
  const artB = Math.round(Math.max(...rows.at(-1).map((x) => x.t + x.h)) * dpr);
  const alpha = new Float32Array(W * H);
  let leak = 0;
  for (let y = artT; y < Math.min(artB, H); y++) for (let x = artL; x < Math.min(artR, W); x++) {
    const i = (y * W + x) * 4;
    const dr = a[i] - b[i], dg = a[i + 1] - b[i + 1], db = a[i + 2] - b[i + 2];
    if (dr > 6 && dg < -6 && db > 6 && Math.abs(dr + dg) < 24 && Math.abs(dr - db) < 24) { alpha[y * W + x] = dr / 255; leak++; }
  }
  // hairlines: a leak pixel run sits on a seam and is not part of a thicker hole.
  const hair = [];
  const hSeams = rows.slice(1).map((r) => ({ y: r[0].t, name: r[0].src }));
  for (const s of hSeams) {
    const yc = Math.round(s.y * dpr);
    let n = 0, maxA = 0, first = -1;
    for (let y = yc - 2; y <= yc + 1; y++) {
      if (y < 0 || y >= H) continue;
      for (let x = artL; x < artR; x++) {
        const al = alpha[y * W + x];
        if (al > 0) {
          const up = alpha[(yc - 5) * W + x] || 0, dn = alpha[(yc + 4) * W + x] || 0;
          if (up < 0.5 * al && dn < 0.5 * al) { n++; if (al > maxA) maxA = al; if (first < 0) first = x; }
        }
      }
    }
    if (n) hair.push({ kind: 'H', at: s.name, n, maxA: +maxA.toFixed(2), x: first });
  }
  for (const r of rows) for (let i = 1; i < r.length; i++) {
    const xc = Math.round(r[i].l * dpr);
    let n = 0, maxA = 0, first = -1;
    const y0 = Math.round(r[i].t * dpr), y1 = Math.round((r[i].t + r[i].h) * dpr);
    for (let x = xc - 2; x <= xc + 1; x++) for (let y = y0; y < Math.min(y1, H); y++) {
      const al = alpha[y * W + x];
      if (al > 0) {
        const le = alpha[y * W + xc - 5] || 0, ri = alpha[y * W + xc + 4] || 0;
        if (le < 0.5 * al && ri < 0.5 * al) { n++; if (al > maxA) maxA = al; if (first < 0) first = y; }
      }
    }
    if (n) hair.push({ kind: 'V', at: r[i].src, n, maxA: +maxA.toFixed(2), y: first });
  }
  // Discontinuity at horizontal and vertical seams: colour change across the seam against the two rows either side.
  const px = (x, y) => { const i = (y * W + x) * 4; return [a[i], a[i + 1], a[i + 2]]; };
  const far = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > 60;
  const disc = [];
  for (const s of hSeams) {
    const yc = Math.round(s.y * dpr);
    if (yc < 3 || yc + 3 >= H) continue;
    let across = 0, ref1 = 0, ref2 = 0;
    for (let x = artL; x < artR; x++) {
      if (far(px(x, yc - 1), px(x, yc))) across++;
      if (far(px(x, yc - 2), px(x, yc - 1))) ref1++;
      if (far(px(x, yc), px(x, yc + 1))) ref2++;
    }
    disc.push({ at: s.name, y: yc, across, ref: Math.max(ref1, ref2), ex: across - Math.max(ref1, ref2) });
  }
  const vdisc = [];
  for (const r of rows) for (let i = 1; i < r.length; i++) {
    const xc = Math.round(r[i].l * dpr);
    const y0 = Math.round(r[i].t * dpr) + 1, y1 = Math.min(Math.round((r[i].t + r[i].h) * dpr) - 1, H);
    let across = 0, ref1 = 0, ref2 = 0;
    for (let y = y0; y < y1; y++) {
      if (far(px(xc - 1, y), px(xc, y))) across++;
      if (far(px(xc - 2, y), px(xc - 1, y))) ref1++;
      if (far(px(xc, y), px(xc + 1, y))) ref2++;
    }
    vdisc.push({ at: r[i].src, x: xc, across, ref: Math.max(ref1, ref2), ex: across - Math.max(ref1, ref2) });
  }
  const topDisc = [...disc, ...vdisc].sort((p, q) => q.ex - p.ex).slice(0, 4).filter((d) => d.ex > 2 * dpr);
  // keep the dpr-1 and phone captures for inspection
  const tag = `${engineName}-${w}-dpr${dpr}`;
  if ((w === 846 && dpr === 1) || (w === 293 && dpr === 2) || (w === 846 && dpr === 1.25) || (w === 293 && dpr === 3)) fs.writeFileSync(path.join(dir, `${tag}.png`), PNG.sync.write(A.png));
  const rec = { tag, dpr, H: Math.round(artB / dpr), rows: rows.length, tiles: geo.ims.length, wrapped, gaps, hMis: +hMis.toFixed(3), leak, hair, topDisc, ms: Date.now() - t0 };
  results.push(rec);
  console.log(JSON.stringify(rec));
  fs.writeFileSync(path.join(dir, `result-${engineName}.json`), JSON.stringify(results, null, 1));
}
await browser.close();
srv.close();
const fractional = (r) => !Number.isInteger(r.dpr);
const hairOn = (list) => list.filter((r) => r.hair.length).length;
const whole = results.filter((r) => !fractional(r));
const broke = results.filter((r) => r.gaps.length || r.wrapped.length).length;
console.log(`${engineName}: ${results.length} combinations; hairlines in ${hairOn(whole)} of ${whole.length} at whole scales, ${hairOn(results.filter(fractional))} of ${results.filter(fractional).length} at emulated fractional scales (expected there, see realseams.mjs); ${broke} with a gap or wrap`);
if (hairOn(whole) || broke) process.exitCode = 1;
