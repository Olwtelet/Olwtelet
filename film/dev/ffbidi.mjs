// Drive the system Firefox over WebDriver BiDi: real load, real scrolling, viewport captures of the film and a capture
// of the whole document. Do not use Firefox's own --screenshot mode: it captures before the film has run and looks like a bug.
// Pass: the film plays on load; after the wait, scrolling shows settled art with no replay. --reduced sets the OS flag.
//
// usage: node ffbidi.mjs <root> <out> [--width 846] [--height 900] [--theme dark] [--scroll 1400] [--wait 6000] [--reduced]
import fs from 'node:fs';
import path from 'node:path';
import { argv, buildRoot, chromium, has, launchFirefox, opt, serve } from './lib.mjs';

const root = buildRoot('ffbidi.mjs <root> <out> [--width 846] [--height 900] [--theme dark] [--scroll 1400] [--wait 6000] [--reduced]');
const out = path.resolve(argv[1]);
const W = +opt('--width', 846), theme = opt('--theme', 'dark'), toY = +opt('--scroll', 1400), wait = +opt('--wait', 6000), H = +opt('--height', 900);
const reduced = has('--reduced');
fs.mkdirSync(out, { recursive: true });
const srv = await serve(root);
const fx = await launchFirefox({ width: W + (W < 500 ? 32 : 48), height: H, prefs: reduced ? ['user_pref("ui.prefersReducedMotion", 1);'] : [] });
const { call, context } = fx;
await call('browsingContext.navigate', { context, url: `http://127.0.0.1:${srv.port}/page?t=${theme}&w=${W}`, wait: 'complete' });
const pause = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));
const shot = (name, origin = 'viewport') => fx.capture(path.join(out, name), { origin });
// film at load
const t00 = Date.now(); const early = [];
for (const s of [100, 500, 800, 1100, 1450, 2800]) { await pause(t00 + s - Date.now()); early.push([s, await shot(`load-${W}-${String(s).padStart(4, '0')}.png`)]); }
await pause(wait - (Date.now() - t00));
await fx.evaluate(`window.scrollTo(0, ${toY})`);
const t0 = Date.now(); const later = [];
for (const s of [0, 160, 640, 1200, 1600, 2400, 3600]) { await pause(t0 + s - Date.now()); later.push([s, await shot(`scroll-${W}-to${toY}-${String(s).padStart(4, '0')}.png`)]); }
// really scroll through the whole document first, so the capture of the document cannot catch an off-screen tile on a stale frame
const docH = (await fx.evaluate('document.documentElement.scrollHeight')).result.value;
for (let y = 0; y < docH; y += 400) { await fx.evaluate(`window.scrollTo(0, ${y})`); await pause(60); }
await fx.evaluate('window.scrollTo(0, 0)');
await pause(300);
const full = await shot(`full-${theme}-${W}${reduced ? '-reduced' : ''}.png`, 'document');
await fx.close();
srv.close();
// contact sheet with Chromium
const b = await chromium.launch({ headless: true });
const pg = await b.newPage({ viewport: { width: 1660, height: 900 } });
const fig = ([s, f], lab) => `<figure style="margin:0"><figcaption style="color:#fff;font:13px sans-serif">${lab} ${s} ms</figcaption><img style="width:320px;display:block" src="data:image/png;base64,${fs.readFileSync(f).toString('base64')}"></figure>`;
await pg.setContent(`<!doctype html><body style="margin:0;padding:8px;background:#333;display:grid;grid-template-columns:repeat(5,320px);gap:8px">${early.map((e) => fig(e, 'load +')).join('')}${later.map((e) => fig(e, 'scrolled +')).join('')}</body>`);
const sheet = path.join(out, `sheet-${W}-to${toY}.png`);
await pg.screenshot({ path: sheet, fullPage: true });
await b.close();
console.log(JSON.stringify({ sheet, full }));
process.exit(0);
