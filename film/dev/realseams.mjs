// Seam and leak audit with the REAL device scale flag (layout in physical pixels, as on a Windows 125% laptop or an
// Android phone), not Playwright's deviceScaleFactor emulation, which draws fractional edges that real scaling does not.
// The window is as tall as the page, so the capture is one viewport with every tile on screen.
//
// usage: node realseams.mjs <root> [--out DIR] [--only 846x1.25,293x3]
import fs from 'node:fs';
import path from 'node:path';
import { artHeight, buildRoot, chromium, opt, outDir, PNG, rowsOf, serve } from './lib.mjs';

const root = buildRoot('realseams.mjs <root> [--out DIR] [--only 846x1.25,293x3]');
const only = opt('--only')?.split(',');
const combos = [[846, 1], [846, 1.1], [846, 1.25], [846, 1.5], [846, 1.75], [846, 2], [686, 1.25], [606, 1.5], [383, 1.25], [348, 2.625], [330, 2.625], [330, 3.5], [308, 3], [293, 2.75], [293, 3], [238, 2]]
  .filter(([w, d]) => !only || only.includes(`${w}x${d}`));
const srv = await serve(root);
const dir = outDir('realseams');
const results = [];
for (const [w, dsf] of combos) {
  // art plus the plain-text block under it and the column's padding; checked against the real page below
  const windowH = Math.ceil(artHeight(root, w)) + 400;
  const browser = await chromium.launch({ headless: true, args: [`--force-device-scale-factor=${dsf}`, `--window-size=${Math.max(w + 60, 500)},${windowH}`] });
  const shot = async (bg) => {
    const ctx = await browser.newContext({ viewport: null });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${srv.port}/page?t=dark&w=${w}&bg=${bg}`, { waitUntil: 'load' });
    await page.waitForTimeout(3300);
    const info = await page.evaluate(() => ({ dpr: devicePixelRatio, iw: innerWidth, ih: innerHeight, sh: document.documentElement.scrollHeight, ims: [...document.images].map((i) => { const b = i.getBoundingClientRect(); return { src: i.getAttribute('src').split('/').pop(), t: b.top + scrollY, l: b.left, w: b.width, h: b.height }; }) }));
    const artEnd = Math.max(...info.ims.map((i) => i.t + i.h));
    if (info.ih < artEnd) throw new Error(`window ${info.ih} px is shorter than the art, ${artEnd} px`);
    const png = PNG.sync.read(await page.screenshot());
    await ctx.close();
    return { png, info };
  };
  const A = await shot('ff00ff'), B = await shot('00ff00');
  await browser.close();
  const r = A.png.width / A.info.iw;
  const W = A.png.width, H = A.png.height, a = A.png.data, b = B.png.data;
  const rows = rowsOf(A.info.ims);
  const al = (x, y) => { const i = (y * W + x) * 4; const dr = a[i] - b[i], dg = a[i + 1] - b[i + 1], db = a[i + 2] - b[i + 2]; return dr > 6 && dg < -6 && db > 6 ? dr / 255 : 0; };
  const hair = [];
  const x0 = Math.round(rows[0][0].l * r), x1 = Math.round((rows[0][0].l + w) * r);
  for (const row of rows.slice(1)) {
    const yc = Math.round(row[0].t * r); let n = 0, m = 0;
    if (yc < 8 || yc + 8 >= H) continue;
    for (let y = yc - 2; y <= yc + 1; y++) for (let x = x0; x < x1; x++) {
      const v = al(x, y);
      if (v > 0 && al(x, yc - 6) < v / 2 && al(x, yc + 5) < v / 2) { n++; if (v > m) m = v; }
    }
    if (n) hair.push({ k: 'H', at: row[0].src, n, a: +m.toFixed(2) });
  }
  for (const row of rows) for (let i = 1; i < row.length; i++) {
    const xc = Math.round(row[i].l * r); let n = 0, m = 0;
    const y0 = Math.round(row[i].t * r), y1 = Math.min(Math.round((row[i].t + row[i].h) * r), H);
    for (let x = xc - 2; x <= xc + 1; x++) for (let y = y0; y < y1; y++) {
      const v = al(x, y);
      if (v > 0 && al(xc - 6, y) < v / 2 && al(xc + 5, y) < v / 2) { n++; if (v > m) m = v; }
    }
    if (n) hair.push({ k: 'V', at: row[i].src, n, a: +m.toFixed(2) });
  }
  const gaps = [];
  for (let i = 1; i < rows.length; i++) { const pb = Math.max(...rows[i - 1].map((x) => x.t + x.h)); const g = rows[i][0].t - pb; if (Math.abs(g) > 0.02) gaps.push([rows[i][0].src, +g.toFixed(2)]); }
  const wrapped = rows.filter((row) => Math.abs(row.reduce((s, x) => s + x.w, 0) - w) > 1).length;
  const rec = { w, dsf, dpr: A.info.dpr, r: +r.toFixed(3), seams: rows.length - 1, hair, gaps, wrapped };
  results.push(rec);
  console.log(JSON.stringify(rec));
  if ((w === 846 && dsf === 1.25) || (w === 348 && dsf === 2.625)) fs.writeFileSync(path.join(dir, `${w}-${dsf}.png`), PNG.sync.write(A.png));
  fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(results, null, 1));
}
srv.close();
const count = (f) => results.filter(f).length;
const [h, g, wr] = [count((r) => r.hair.length), count((r) => r.gaps.length), count((r) => r.wrapped)];
console.log(`${results.length} combinations: ${h} with hairlines, ${g} with gaps, ${wr} with wraps`);
if (h || g || wr) process.exitCode = 1;
