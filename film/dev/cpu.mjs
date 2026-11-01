// CPU cost of the page: main-thread task time from CDP, and whole-browser CPU time from SystemInfo.
// Pass: idle at the top under 1 percent, mid-page under 5 percent, both whole-browser.
//
// usage: node cpu.mjs <root>
import { buildRoot, chromium, serve } from './lib.mjs';

const root = buildRoot('cpu.mjs <root>');

async function measure({ reduced = false, scrollFrac = 0, windowS = 16 } = {}) {
  const srv = await serve(root);
  const browser = await chromium.launch({ headless: true, args: reduced ? ['--force-prefers-reduced-motion'] : [] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const bcdp = await browser.newBrowserCDPSession();
  const procCpu = async () => { const { processInfo } = await bcdp.send('SystemInfo.getProcessInfo'); return processInfo.reduce((s, p) => s + p.cpuTime, 0); };
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  await page.goto(`http://127.0.0.1:${srv.port}/page?t=dark&w=846`, { waitUntil: 'load' });
  const m0 = await metrics(); const c0 = await procCpu(); const w0 = Date.now();
  await page.waitForTimeout(3000);
  const m1 = await metrics(); const c1 = await procCpu(); const w1 = Date.now();
  if (scrollFrac) { await page.evaluate((f) => scrollTo(0, document.documentElement.scrollHeight * f), scrollFrac); }
  await page.waitForTimeout(1500);
  const m2 = await metrics(); const c2 = await procCpu(); const w2 = Date.now();
  await page.waitForTimeout(windowS * 1000);
  const m3 = await metrics(); const c3 = await procCpu(); const w3 = Date.now();
  await browser.close(); srv.close();
  const pct = (a, b, k, wa, wb) => (100 * (b[k] - a[k]) / ((wb - wa) / 1000));
  return {
    openMain: pct(m0, m1, 'TaskDuration', w0, w1), openAll: 100 * (c1 - c0) / ((w1 - w0) / 1000),
    idleMain: pct(m2, m3, 'TaskDuration', w2, w3), idleAll: 100 * (c3 - c2) / ((w3 - w2) / 1000),
    idleStyle: pct(m2, m3, 'RecalcStyleDuration', w2, w3), idleLayout: pct(m2, m3, 'LayoutDuration', w2, w3),
  };
}
const fmt = (r) => `opening main ${r.openMain.toFixed(1)}% all ${r.openAll.toFixed(1)}% | idle main ${r.idleMain.toFixed(1)}% all ${r.idleAll.toFixed(1)}% style ${r.idleStyle.toFixed(2)}% layout ${r.idleLayout.toFixed(2)}%`;
const reduced = await measure({ reduced: true }), top = await measure(), mid = await measure({ scrollFrac: 0.5 });
console.log('reduced   ', fmt(reduced));
console.log('top       ', fmt(top));
console.log('scrolled.5', fmt(mid));
if (top.idleAll >= 1 || mid.idleAll >= 5) process.exitCode = 1;
