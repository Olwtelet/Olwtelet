// Is the fail-safe frame the same picture as the end of the animation? Whole page on screen, real <img>: the
// reduced-motion render (no animation at all) against the same page after the opening has finished.
// Pass: under 5 px of difference at each width.
//
// usage: node settled.mjs <root> [--widths 846,293] [--out DIR]
import fs from 'node:fs';
import path from 'node:path';
import { buildRoot, chromium, openTall, opt, outDir, PNG, serve } from './lib.mjs';

const root = buildRoot('settled.mjs <root> [--widths 846,293] [--out DIR]');
const dir = outDir('settled');
const srv = await serve(root);
let worst = 0;
for (const w of opt('--widths', '846,293').split(',').map(Number)) {
  const pad = (w < 500 ? 16 : 24) * 2;
  const grab = async (reduced, waitMs) => {
    const browser = await chromium.launch({ headless: true, args: reduced ? ['--force-prefers-reduced-motion'] : [] });
    const ctx = await browser.newContext({ viewport: { width: w + pad, height: 1000 } });
    const page = await ctx.newPage();
    await openTall(page, `http://127.0.0.1:${srv.port}/page?t=dark&w=${w}`, waitMs);
    const png = PNG.sync.read(await page.screenshot());
    await browser.close();
    return png;
  };
  const R = await grab(true, 400);
  const N = await grab(false, 3400);
  const n = Math.min(R.data.length, N.data.length);
  let diff = 0, minY = 1e9, maxY = -1;
  const hist = {};
  for (let i = 0; i < n; i += 4) {
    const d = Math.abs(R.data[i] - N.data[i]) + Math.abs(R.data[i + 1] - N.data[i + 1]) + Math.abs(R.data[i + 2] - N.data[i + 2]);
    if (d > 30) { diff++; const y = Math.floor(i / 4 / R.width); if (y < minY) minY = y; if (y > maxY) maxY = y; const b = Math.floor(y / 100) * 100; hist[b] = (hist[b] || 0) + 1; }
  }
  console.log(w, 'reduced vs settled: differing px', diff, diff ? `y ${minY}-${maxY}` : '', JSON.stringify(Object.fromEntries(Object.entries(hist).slice(0, 12))));
  fs.writeFileSync(path.join(dir, `reduced-${w}.png`), PNG.sync.write(R));
  worst = Math.max(worst, diff);
}
srv.close();
if (worst >= 5) process.exitCode = 1;
