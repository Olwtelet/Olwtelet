// Render the README through GitHub's real markdown API and sanitizer, then screenshot it the way a visitor sees it, in
// both themes at each column width, with the whole page on screen so every tile animates in phase. Prints a JSON report.
// Read the PNGs: this tool proves nothing until someone has looked.
//
// usage: node preview.mjs <root> [--out DIR] [--themes dark,light] [--widths 846,293] [--wait 4] [--slice 1500] [--engine chromium|webkit] [--details open]
import path from 'node:path';
import { buildRoot, engineOf, openTall, opt, outDir, serve } from './lib.mjs';

const root = buildRoot('preview.mjs <root> [--out DIR] [--themes dark,light] [--widths 846,293] [--wait 4] [--slice 1500] [--engine chromium|webkit] [--details open]');
const out = outDir('preview');
const themes = opt('--themes', 'dark,light').split(',');
const widths = opt('--widths', '846,293').split(',').map(Number);
const waitS = Number(opt('--wait', '4'));
const sliceH = Number(opt('--slice', '1500'));
const engineName = opt('--engine', 'chromium');

const srv = await serve(root, { openDetails: opt('--details', '') === 'open' });
const report = { root, engine: engineName, shots: [], errors: [], heights: {} };
const browser = await engineOf(engineName).launch({ headless: true });
try {
  for (const theme of themes) for (const w of widths) {
    const pad = (w < 500 ? 16 : 24) * 2 + 2;
    const ctx = await browser.newContext({ viewport: { width: w + pad, height: 1000 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await openTall(page, `http://127.0.0.1:${srv.port}/page?t=${theme}&w=${w}&box=1`, 0, { until: 'networkidle' });
    const broken = await page.evaluate(() => [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.getAttribute('src')));
    if (broken.length) report.errors.push(`[${theme}/${w}] broken images: ${broken.join(', ')}`);
    await page.waitForTimeout(waitS * 1000);
    const H2 = await page.evaluate(() => document.documentElement.scrollHeight);
    report.heights[`${theme}-${w}`] = H2;
    for (let y = 0, n = 0; y < H2; y += sliceH, n++) {
      const p = path.join(out, `readme-${theme}-${w}-part${String(n).padStart(2, '0')}.png`);
      await page.screenshot({ path: p, clip: { x: 0, y, width: w + pad, height: Math.min(sliceH, H2 - y) } });
      report.shots.push(p);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
  srv.close();
}
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
