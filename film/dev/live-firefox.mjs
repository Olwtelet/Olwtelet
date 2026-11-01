// The same live-page check as live-inject.mjs, in the system Firefox over WebDriver BiDi: open the real profile in a
// throwaway headless profile, logged out, answer the image requests locally by network interception, replace the README
// in this tab only. Nothing is published.
//
// The window is as tall as the page from the start and the capture is that viewport, so no tile is ever off-screen on a stale
// frame. Do not scroll this page before capturing: GitHub's sticky bars stay painted over the art. Firefox cannot be
// narrowed below about 450 px here, so phone width uses ffbidi.mjs.
//
// usage: node live-firefox.mjs <root> <out> [--theme dark] [--width 1440] [--height 9600]
import fs from 'node:fs';
import path from 'node:path';
import { argv, buildRoot, githubBody, launchFirefox, opt, RAW_HEADERS, readmeRows } from './lib.mjs';

const root = buildRoot('live-firefox.mjs <root> <out> [--theme dark] [--width 1440] [--height 9600]');
const out = path.resolve(argv[1]);
fs.mkdirSync(out, { recursive: true });
const W = +opt('--width', 1440), H = +opt('--height', 9600), theme = opt('--theme', 'dark');
const body = (await githubBody(root)).replace(/src="assets\/film\//g, 'src="/Olwtelet/Olwtelet/raw/main/assets/film/');
const film = path.join(root, 'assets', 'film');
const tileCount = readmeRows(root).flat().length;
const fx = await launchFirefox({ width: W, height: H, prefs: [
  `user_pref("ui.systemUsesDarkTheme", ${theme === 'dark' ? 1 : 0});`, `user_pref("layout.css.prefers-color-scheme.content-override", ${theme === 'dark' ? 0 : 1});`,
] });
const { call, context } = fx;
const served = new Set();
const headers = Object.entries(RAW_HEADERS).map(([name, value]) => ({ name: name.toLowerCase(), value: { type: 'string', value } }));
fx.on(async (j) => {
  if (j.method !== 'network.beforeRequestSent' || !j.params.isBlocked) return;
  const u = new URL(j.params.request.url);
  const name = decodeURIComponent(u.pathname.split('/').pop());
  const f = path.join(film, name);
  if (u.pathname.includes('/raw/main/assets/film/') && fs.existsSync(f)) {
    served.add(name);
    await call('network.provideResponse', { request: j.params.request.request, statusCode: 200, reasonPhrase: 'OK', headers, body: { type: 'base64', value: fs.readFileSync(f).toString('base64') } }).catch((e) => console.error(String(e)));
  } else await call('network.continueRequest', { request: j.params.request.request }).catch(() => {});
});
await call('session.subscribe', { events: ['network.beforeRequestSent'] });
await call('browsingContext.navigate', { context, url: 'https://github.com/Olwtelet', wait: 'complete' });
await call('network.addIntercept', { phases: ['beforeRequestSent'], urlPatterns: fs.readdirSync(film).map((n) => ({ type: 'string', pattern: 'https://github.com/Olwtelet/Olwtelet/raw/main/assets/film/' + n })) });
await fx.evaluate(`(()=>{const a=document.querySelector('article.markdown-body');a.innerHTML=${JSON.stringify(body)};return a.querySelectorAll('img').length})()`);
await new Promise((r) => setTimeout(r, 6000));
const geoJs = `(()=>{const a=document.querySelector('article.markdown-body');const r=a.getBoundingClientRect();const ims=[...a.querySelectorAll('img')].map(i=>{const b=i.getBoundingClientRect();return{src:i.getAttribute('src').split('/').pop(),l:b.left,t:b.top+scrollY,w:b.width,h:b.height,n:i.naturalWidth}});const rows=[];for(const im of ims){const last=rows.at(-1);if(last&&Math.abs(last[0].t-im.t)<0.6)last.push(im);else rows.push([im])}const gaps=[];for(let i=1;i<rows.length;i++){const p=Math.max(...rows[i-1].map(x=>x.t+x.h));const g=rows[i][0].t-p;if(Math.abs(g)>0.05)gaps.push([rows[i][0].src,+g.toFixed(3)])}const wrapped=rows.filter(x=>Math.abs(x.reduce((s,i)=>s+i.w,0)-r.width)>1).length;const broken=ims.filter(i=>!i.n).map(i=>i.src);return JSON.stringify({column:r.width,images:ims.length,rows:rows.length,gaps,wrapped,broken,height:Math.round(rows.at(-1)[0].t+rows.at(-1)[0].h-(r.top+scrollY)),bg:getComputedStyle(document.body).backgroundColor,viewportW:innerWidth,viewportH:innerHeight,pageH:Math.ceil(Math.max(...[...document.body.children].map(e=>e.getBoundingClientRect().bottom+scrollY)))})})()`;
const geo = JSON.parse((await fx.evaluate(geoJs)).result.value);
const file = await fx.capture(path.join(out, `live-firefox-${theme}-${W}.png`), { origin: 'viewport', clip: { type: 'box', x: 0, y: 0, width: geo.viewportW, height: Math.min(geo.pageH, geo.viewportH) } });
console.log(JSON.stringify({ ...geo, served: served.size, shot: file }));
await fx.close();
const tall = geo.viewportH >= geo.pageH;
if (!tall) console.error(`the window is ${geo.viewportH} px and the page ${geo.pageH} px: pass a larger --height`);
process.exit(tall && geo.images === tileCount && served.size === tileCount && !geo.gaps.length && !geo.wrapped && !geo.broken.length ? 0 : 1);
