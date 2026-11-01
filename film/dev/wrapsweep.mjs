// Resize the column through every width from 200 to 900 px in half-pixel steps: does any row wrap, gap or overlap?
//
// usage: node wrapsweep.mjs <root>
import { buildRoot, chromium, serve, webkit } from './lib.mjs';

const root = buildRoot('wrapsweep.mjs <root>');
const srv = await serve(root);
let bad = 0;
for (const [name, eng] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await eng.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/page?t=dark&w=846`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const res = await page.evaluate(() => {
    const col = document.getElementById('col');
    const out = { wraps: [], gaps: [] };
    const ims = [...document.images];
    for (let w = 200; w <= 900; w += 0.5) {
      col.style.width = w + 'px';
      const rects = ims.map((i) => i.getBoundingClientRect());
      const rows = [];
      rects.forEach((r, k) => { const last = rows.at(-1); if (last && Math.abs(last[0].r.top - r.top) < 0.5) last.push({ r, k }); else rows.push([{ r, k }]); });
      // a wrapped row shows as a row that does not reach the column width
      const widths = rows.map((row) => row.reduce((s, x) => s + x.r.width, 0));
      const wrapped = rows.filter((row, i) => Math.abs(widths[i] - w) > 1);
      if (wrapped.length) out.wraps.push([w, wrapped[0][0].k]);
      for (let i = 1; i < rows.length; i++) {
        const pb = Math.max(...rows[i - 1].map((x) => x.r.bottom));
        const g = rows[i][0].r.top - pb;
        if (Math.abs(g) > 0.1) out.gaps.push([w, rows[i][0].k, +g.toFixed(2)]);
      }
    }
    return out;
  });
  const gapW = [...new Set(res.gaps.map((g) => g[0]))];
  bad += res.wraps.length + gapW.length;
  console.log(name, 'wrap widths:', res.wraps.length, res.wraps.slice(0, 5).join(' / '), '| gap widths:', gapW.length, gapW.length ? `max col with a gap ${Math.max(...gapW)}, worst ${Math.max(...res.gaps.map((g) => g[2]))}px` : '');
  await browser.close();
}
srv.close();
if (bad) process.exitCode = 1;
