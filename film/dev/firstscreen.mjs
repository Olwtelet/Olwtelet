// The art's own opening at phone width: real <img>, real timelines, screenshots in real time, on a bare page with the art at
// the top of the window. On the real profile GitHub's header fills a phone's first screen, so a visitor there may scroll in
// after the film has ended. Read the PNGs: at 300, 800 and 1200 ms only paper and pencil below the tower, nothing settled
// and no band; at 3000 ms the settled page.
//
// usage: node firstscreen.mjs <root> <chromium|webkit> <dark|light> [--out DIR]
import path from 'node:path';
import { argv, buildRoot, engineOf, outDir, serve } from './lib.mjs';

const root = buildRoot('firstscreen.mjs <root> <chromium|webkit> <dark|light> [--out DIR]');
const eng = argv[1] && !argv[1].startsWith('--') ? argv[1] : 'chromium';
const theme = argv[2] && !argv[2].startsWith('--') ? argv[2] : 'light';
const dir = outDir('first');
const srv = await serve(root);
const browser = await engineOf(eng).launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 325, height: 700 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`http://127.0.0.1:${srv.port}/page?t=${theme}&w=293`, { waitUntil: 'commit' });
const t0 = Date.now();
const stamps = [], files = [];
for (const target of [300, 800, 1200, 3000]) {
  const wait = target - (Date.now() - t0);
  if (wait > 0) await page.waitForTimeout(wait);
  const p = path.join(dir, `${eng}-${theme}-${target}.png`);
  await page.screenshot({ path: p });
  stamps.push(`${target}:${Date.now() - t0}`);
  files.push(p);
}
console.log(eng, theme, stamps.join(' '));
console.log(files.join('\n'));
await browser.close(); srv.close();
