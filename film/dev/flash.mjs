// Exact-frame composite of the top of the README: each tile lives in its own iframe (so in-SVG @media sees the tile's
// rendered width, as in an <img>) and every iframe's animations are seeked to t + its own decode skew. Measures WCAG 2.3.1
// style flashes per pixel and optionally writes contact sheets. This is a script, not a certified analyser.
// Pass: at most 3 flashes a second, 0 red.
//
// usage: node flash.mjs <root> <width> <topPx> <tStart> <tEnd> <stepMs> [--skew name.svg=ms,name.svg=ms] [--sheet 100,200] [--thumb 340] [--cols 6] [--tag x] [--out DIR]
import fs from 'node:fs';
import path from 'node:path';
import { argv, buildRoot, chromium, lum, opt, outDir, PNG, readmeRows } from './lib.mjs';

const root = buildRoot('flash.mjs <root> <width> <topPx> <tStart> <tEnd> <stepMs> [--skew name.svg=ms] [--sheet ms,ms] [--tag x] [--out DIR]');
const [, widthS, topS, t0S, t1S, stepS] = argv;
const width = +widthS, top = +topS, t0 = +t0S, t1 = +t1S, step = +stepS;
const tag = opt('--tag', `flash-${width}${opt('--skew') ? '-skew' : ''}`);
const skew = Object.fromEntries((opt('--skew', '') || '').split(',').filter(Boolean).map((s) => { const [n, v] = s.split('='); return [n, +v]; }));
const sheetTimes = (opt('--sheet', '') || '').split(',').filter(Boolean).map(Number);
const thumb = +opt('--thumb', '340');
const cols = +opt('--cols', '6');
const dir = outDir('flash');

const rows = readmeRows(root);
let y = 0;
const tiles = [];
for (const r of rows) {
  let x = 0;
  const h = (width * r[0].pct / 100) * (r[0].vbH / r[0].vbW);
  if (y < top) for (const t of r) {
    const w = width * t.pct / 100;
    tiles.push({ ...t, x, y, w, h: w * t.vbH / t.vbW });
    x += w;
  }
  y += h;
}
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width, height: top }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#0d1117;overflow:hidden">${tiles.map((t, i) =>
  `<iframe id="f${i}" scrolling="no" style="position:absolute;border:0;left:${t.x}px;top:${t.y}px;width:${t.w}px;height:${t.h}px"></iframe>`).join('')}</body></html>`);
await page.evaluate((list) => {
  list.forEach((svg, i) => {
    const d = document.getElementById('f' + i).contentDocument;
    d.open(); d.write(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`); d.close();
    const s = d.querySelector('svg'); s.style.display = 'block'; s.style.width = '100%'; s.style.height = '100%'; s.removeAttribute('width'); s.removeAttribute('height');
    d.documentElement.getBoundingClientRect();
    for (const a of d.getAnimations()) a.pause();
  });
}, tiles.map((t) => t.svg));
await page.waitForTimeout(200);
const seek = async (ms) => page.evaluate(({ ms, offs }) => {
  offs.forEach((o, i) => {
    const d = document.getElementById('f' + i).contentDocument;
    for (const a of d.getAnimations()) { a.pause(); a.currentTime = Math.max(0, ms - o); }
  });
}, { ms, offs: tiles.map((t) => skew[t.name] || 0) });

const T = [];
for (let t = t0; t <= t1 + 1e-6; t += step) T.push(t);
const S = 3; // analyse every third pixel; area scale S*S
let W, H, n;
let last, lastDir, trans; // per pixel arrays
let redLast, redDir, redTrans;
const meanL = [];
const shots = [];
for (let k = 0; k < T.length; k++) {
  await seek(T[k]);
  const buf = await page.screenshot();
  const png = PNG.sync.read(buf);
  if (!W) {
    W = Math.floor(png.width / S); H = Math.floor(png.height / S); n = W * H;
    last = new Float32Array(n).fill(-1); lastDir = new Int8Array(n); trans = Array.from({ length: n }, () => []);
    redLast = new Float32Array(n).fill(-1); redDir = new Int8Array(n); redTrans = Array.from({ length: n }, () => []);
  }
  let sum = 0;
  for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
    const i = ((yy * S) * png.width + xx * S) * 4;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    const L = lum(r, g, b); sum += L;
    const p = yy * W + xx;
    if (last[p] < 0) { last[p] = L; } else {
      const d = L - last[p];
      if (Math.abs(d) >= 0.1 && Math.min(L, last[p]) < 0.8) {
        const dirNow = Math.sign(d);
        if (dirNow !== lastDir[p]) trans[p].push(T[k]);
        lastDir[p] = dirNow; last[p] = L;
      } else if (lastDir[p] && Math.sign(d) === lastDir[p]) last[p] = L;
    }
    const sumc = r + g + b;
    const isRed = sumc > 0 && r / sumc >= 0.8;
    const sr = isRed ? Math.max(0, (r - g - b) / 255 * 320) : 0;
    if (redLast[p] < 0) redLast[p] = sr; else {
      const d = sr - redLast[p];
      if (Math.abs(d) > 20) {
        const dirNow = Math.sign(d);
        if (dirNow !== redDir[p]) redTrans[p].push(T[k]);
        redDir[p] = dirNow; redLast[p] = sr;
      }
    }
  }
  meanL.push(+(sum / n).toFixed(3));
  if (sheetTimes.some((s) => Math.abs(s - T[k]) < step / 2 + 1e-6)) shots.push({ t: +T[k].toFixed(0), b64: buf.toString('base64') });
}
await browser.close();
// flash counts: pairs of opposing transitions inside any one-second window
const flashHist = (transArr) => {
  const area = {};
  for (let p = 0; p < n; p++) {
    const tr = transArr[p];
    if (tr.length < 2) continue;
    let best = 0;
    for (let i = 0; i < tr.length; i++) {
      let c = 0;
      for (let j = i; j < tr.length && tr[j] - tr[i] < 1000; j++) c++;
      if (c > best) best = c;
    }
    const f = Math.floor(best / 2);
    if (f > 0) area[f] = (area[f] || 0) + S * S;
  }
  return area;
};
const gen = flashHist(trans), red = flashHist(redTrans);
const totalArea = n * S * S;
const THRESH = 21824;
const cum = (h) => { const keys = Object.keys(h).map(Number).sort((a, b) => b - a); let acc = 0, worst = 0; for (const k of keys) { acc += h[k]; if (acc >= THRESH && !worst) worst = k; } return worst; };
// largest frame-to-frame jump in mean luminance
let bigJump = 0, jumpAt = 0;
for (let i = 1; i < meanL.length; i++) { const d = Math.abs(meanL[i] - meanL[i - 1]); if (d > bigJump) { bigJump = d; jumpAt = T[i]; } }
const rep = {
  tag, tiles: tiles.map((t) => t.name), viewport: `${width}x${top}`, totalArea,
  generalFlashAreaByCount: gen, worstGeneralFlashesPerSec: cum(gen),
  redFlashAreaByCount: red, worstRedFlashesPerSec: cum(red),
  bigMeanLumJump: +bigJump.toFixed(3), jumpAtMs: +jumpAt.toFixed(0),
  meanL: meanL.filter((_, i) => i % Math.max(1, Math.round(100 / step)) === 0),
};
console.log(JSON.stringify(rep));
fs.writeFileSync(path.join(dir, `${tag}.json`), JSON.stringify(rep));
if (shots.length) {
  const b2 = await chromium.launch({ headless: true });
  const p2 = await b2.newPage({ viewport: { width: cols * (thumb + 10) + 10, height: 800 } });
  await p2.setContent(`<!doctype html><html><body style="margin:0;padding:10px;background:#3a3a3a;font:12px sans-serif;color:#fff;display:grid;grid-template-columns:repeat(${cols},${thumb}px);gap:10px">${shots.map((s) => `<figure style="margin:0"><figcaption>${s.t} ms</figcaption><img style="display:block;width:100%" src="data:image/png;base64,${s.b64}"></figure>`).join('')}</body></html>`);
  await p2.screenshot({ path: path.join(dir, `${tag}.png`), fullPage: true });
  await b2.close();
}
if (rep.worstGeneralFlashesPerSec > 3 || rep.worstRedFlashesPerSec > 0) process.exitCode = 1;
