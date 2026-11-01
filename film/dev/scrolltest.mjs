// What does a visitor see when they scroll to a below-the-fold film tile, at different moments after load?
// Real wheel scrolling, real viewport screenshots, real <img>, raw-host headers. The late-paint restart check: everything
// in view at scroll + 0 ms must be the same as at scroll + 3600 ms. Read the sheet too.
//
// usage: node scrolltest.mjs <root> <out> <chromium|webkit> <waitBeforeScrollMs> <scrollToPx>
import fs from 'node:fs';
import path from 'node:path';
import { argv, buildRoot, chromium, engineOf, PNG, serve } from './lib.mjs';

const root = buildRoot('scrolltest.mjs <root> <out> <chromium|webkit> <waitBeforeScrollMs> <scrollToPx>');
const [, outS, engineName, waitS, toS] = argv;
const out = path.resolve(outS); fs.mkdirSync(out, { recursive: true });
const srv = await serve(root);
const b = await engineOf(engineName).launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 900, height: 900 } });
const p = await ctx.newPage();
await p.goto(`http://127.0.0.1:${srv.port}/page?t=dark&w=846`, { waitUntil: 'load' });
await p.waitForTimeout(+waitS);
await p.mouse.move(450, 450);
const target = +toS; let done = 0;
while (done < target) { const step = Math.min(500, target - done); await p.mouse.wheel(0, step); done += step; await p.waitForTimeout(30); }
const stamps = [0, 80, 160, 320, 640, 1200, 2400, 3600];
const t0 = Date.now(); const files = [];
for (const s of stamps) {
  const wait = t0 + s - Date.now(); if (wait > 0) await p.waitForTimeout(wait);
  const f = path.join(out, `${engineName}-w${waitS}-to${toS}-t${String(s).padStart(4, '0')}.png`);
  await p.screenshot({ path: f });
  files.push(f);
}
const scrolled = await p.evaluate(() => scrollY);
await b.close(); srv.close();
// contact sheet
const b2 = await chromium.launch({ headless: true });
const pg = await b2.newPage({ viewport: { width: 1640, height: 900 } });
const imgs = files.map((f, i) => `<figure style="margin:0"><figcaption style="color:#fff;font:13px sans-serif">t+${stamps[i]} ms</figcaption><img style="width:400px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></figure>`).join('');
await pg.setContent(`<!doctype html><body style="margin:0;padding:8px;background:#333;display:grid;grid-template-columns:repeat(4,400px);gap:8px">${imgs}</body>`);
const sheet = path.join(out, `sheet-${engineName}-w${waitS}-to${toS}.png`);
await pg.screenshot({ path: sheet, fullPage: true });
await b2.close();
const first = PNG.sync.read(fs.readFileSync(files[0])), lastShot = PNG.sync.read(fs.readFileSync(files.at(-1)));
let differ = 0;
for (let i = 0; i < first.data.length; i += 4) if (Math.abs(first.data[i] - lastShot.data[i]) + Math.abs(first.data[i + 1] - lastShot.data[i + 1]) + Math.abs(first.data[i + 2] - lastShot.data[i + 2]) > 30) differ++;
console.log(sheet, 'scrollY', scrolled, `px differing between t+0 and t+3600: ${differ}`);
