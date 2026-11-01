// Injects the sanitized README HTML into the real github.com/Olwtelet page in a throwaway browser context, logged out.
// Nothing is published or changed anywhere: images are answered locally by route interception at the path the real page
// would request, with the raw host's real headers, and the README is replaced in that tab only.
//
// Captures use a viewport as tall as the page. A full-page capture from a normal viewport shows off-screen tiles on a stale
// frame: it once printed the impact frame as a black band across the shadow and the sentence. To keep that out of evidence,
// every capture is compared with the same art settled in the local harness, and staleRows counts the rows of the art that
// disagree. Anything but 0 fails the run and that PNG is not evidence.
//
// usage: node live-inject.mjs <root> <out> [--engine chromium|webkit] [--themes dark,light]
import fs from 'node:fs';
import path from 'node:path';
import { argv, buildRoot, engineOf, githubBody, openTall, opt, PNG, RAW_HEADERS, readmeRows, rowsOf, serve } from './lib.mjs';

const root = buildRoot('live-inject.mjs <root> <out> [--engine chromium|webkit] [--themes dark,light]');
const out = path.resolve(argv[1]);
fs.mkdirSync(out, { recursive: true });
const engineName = opt('--engine', 'chromium');
const themes = opt('--themes', 'dark,light').split(',');
const body = (await githubBody(root)).replace(/src="assets\/film\//g, 'src="/Olwtelet/Olwtelet/raw/main/assets/film/');
const tileCount = readmeRows(root).flat().length;
const viewports = [
  { tag: 'desk', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  { tag: 'tablet', viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2 },
  { tag: 'phone', viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: engineName === 'chromium', hasTouch: true },
];
const srv = await serve(root);
const browser = await engineOf(engineName).launch({ headless: true });

// the art settled in the local harness at this column, in device pixels, cropped to the art
async function settledArt(theme, column, dpr) {
  const ctx = await browser.newContext({ viewport: { width: column + 60, height: 1000 }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await openTall(page, `http://127.0.0.1:${srv.port}/page?t=${theme}&w=${column}`, 3400);
  const at = await page.evaluate(() => { const b = document.images[0].getBoundingClientRect(); return { l: b.left, t: b.top + scrollY }; });
  const png = PNG.sync.read(await page.screenshot());
  await ctx.close();
  return { png, x: Math.round(at.l * dpr), y: Math.round(at.t * dpr) };
}

// rows of the art where a large share of the pixels is a different colour: a stale frame, not antialiasing
function staleRows(shot, x0, y0, ref, wPx, hPx) {
  let rows = 0, first = -1;
  for (let y = 0; y < hPx; y++) {
    if (y0 + y >= shot.height || ref.y + y >= ref.png.height) break;
    let differ = 0;
    for (let x = 0; x < wPx; x++) {
      const a = ((y0 + y) * shot.width + x0 + x) * 4, b = ((ref.y + y) * ref.png.width + ref.x + x) * 4;
      if (Math.abs(shot.data[a] - ref.png.data[b]) + Math.abs(shot.data[a + 1] - ref.png.data[b + 1]) + Math.abs(shot.data[a + 2] - ref.png.data[b + 2]) > 60) differ++;
    }
    if (differ > 0.4 * wPx) { rows++; if (first < 0) first = y; }
  }
  return { rows, first };
}

const report = [];
for (const theme of themes) for (const v of viewports) {
  const { tag, ...o } = v;
  const ctx = await browser.newContext({ ...o, colorScheme: theme });
  const page = await ctx.newPage();
  const served = new Set();
  await page.route('**/Olwtelet/Olwtelet/raw/main/assets/film/**', (route) => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop());
    const f = path.join(root, 'assets', 'film', name);
    if (!fs.existsSync(f)) return route.fulfill({ status: 404 });
    served.add(name);
    return route.fulfill({ status: 200, headers: RAW_HEADERS, body: fs.readFileSync(f) });
  });
  await page.goto('https://github.com/Olwtelet', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('article.markdown-body', { timeout: 30000 });
  await page.evaluate((html) => { document.querySelector('article.markdown-body').innerHTML = html; }, body);
  await page.waitForFunction(() => [...document.querySelectorAll('article.markdown-body img')].every((i) => i.complete), null, { timeout: 30000 });
  const pageH = () => page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: o.viewport.width, height: await pageH() });
  await page.waitForTimeout(4500);
  // GitHub lazy-loads the sections under the README, so the page can have grown past the viewport by now
  for (let H = await pageH(); H > page.viewportSize().height; H = await pageH()) {
    await page.setViewportSize({ width: o.viewport.width, height: H });
    await page.waitForTimeout(500);
  }
  const geo = await page.evaluate(() => {
    const a = document.querySelector('article.markdown-body');
    const r = a.getBoundingClientRect();
    const ims = [...a.querySelectorAll('img')].map((i) => { const b = i.getBoundingClientRect(); return { src: i.getAttribute('src').split('/').pop(), l: b.left, t: b.top + scrollY, w: b.width, h: b.height, n: i.naturalWidth }; });
    return { col: { l: r.left, t: r.top + scrollY, w: r.width }, sh: document.documentElement.scrollHeight, ih: innerHeight, theme: document.documentElement.getAttribute('data-color-mode'), bg: getComputedStyle(document.body).backgroundColor, ims, links: [...a.querySelectorAll('a')].length };
  });
  const rows = rowsOf(geo.ims);
  const gaps = [];
  for (let i = 1; i < rows.length; i++) { const prev = Math.max(...rows[i - 1].map((x) => x.t + x.h)); const g = rows[i][0].t - prev; if (Math.abs(g) > 0.05) gaps.push([rows[i][0].src, +g.toFixed(3)]); }
  const wrapped = rows.filter((r) => Math.abs(r.reduce((s, i) => s + i.w, 0) - geo.col.w) > 1).map((r) => r.map((i) => i.src).join('+'));
  const artEnd = Math.max(...rows.at(-1).map((x) => x.t + x.h));
  const broken = geo.ims.filter((i) => !i.n).map((i) => i.src);
  const pth = path.join(out, `live-${engineName}-${theme}-${tag}.png`);
  const buf = await page.screenshot();
  fs.writeFileSync(pth, buf);
  const dpr = o.deviceScaleFactor;
  const stale = staleRows(PNG.sync.read(buf), Math.round(geo.ims[0].l * dpr), Math.round(geo.ims[0].t * dpr), await settledArt(theme, Math.round(geo.col.w), dpr), Math.round(geo.col.w * dpr), Math.round((artEnd - geo.ims[0].t) * dpr));
  report.push({ engine: engineName, theme, tag, column: geo.col.w, rows: rows.length, images: geo.ims.length, served: served.size, broken, gaps, wrapped, artTop: geo.ims[0].t, artLeft: geo.ims[0].l, artHeight: Math.round(artEnd - geo.col.t), viewportH: geo.ih, pageH: geo.sh, staleRows: stale.rows, firstStaleRow: stale.first, colorMode: geo.theme, bodyBg: geo.bg, links: geo.links, shot: pth });
  await ctx.close();
}
await browser.close();
srv.close();
console.log(JSON.stringify(report, null, 1));
if (report.some((r) => r.images !== tileCount || r.served !== tileCount || r.broken.length || r.gaps.length || r.wrapped.length || r.staleRows || r.viewportH < r.pageH)) process.exitCode = 1;
