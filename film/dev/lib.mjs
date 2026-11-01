// Shared harness for the browser checks in this folder. The build and CI never load it.
//
// Playwright stays outside the repo: set FILM_TOOLS to a folder whose node_modules holds playwright-core, pngjs and
// github-markdown-css. Every tool takes the build root as its first argument, the folder with README.md and assets/film.
//
// A page here is what GitHub would serve: the README through the real markdown API and sanitizer, GitHub's CSS, real
// <img> elements, and images answered with the raw host's headers.
//
// Optional: FILM_OUT, the folder tools write captures to when not given --out (default: film-dev in the system temp
// folder). FILM_CACHE, the markdown API cache (default: preview-cache beside FILM_TOOLS). FILM_FIREFOX, the Firefox binary.
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

if (!process.env.FILM_TOOLS) {
  console.error('set FILM_TOOLS to a folder whose node_modules holds playwright-core, pngjs and github-markdown-css');
  process.exit(2);
}
const TOOLS = path.resolve(process.env.FILM_TOOLS);
const require = createRequire(path.join(TOOLS, 'package.json'));
export const { chromium, webkit } = require('playwright-core');
export const { PNG } = require('pngjs');
export const engineOf = (name) => (name === 'webkit' ? webkit : chromium);

// ---- command line. Positional arguments come first, flags after them ----
export const argv = process.argv.slice(2);
export const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
export const has = (k) => argv.includes(k);

export function buildRoot(usage) {
  const root = argv[0] && !argv[0].startsWith('--') ? path.resolve(argv[0]) : null;
  if (!root || !fs.existsSync(path.join(root, 'README.md')) || !fs.existsSync(path.join(root, 'assets', 'film'))) {
    console.error(`usage: node ${usage}\n<root> is the folder holding README.md and assets/film`);
    process.exit(2);
  }
  return root;
}

export function outDir(name) {
  const dir = path.resolve(opt('--out', path.join(process.env.FILM_OUT || path.join(os.tmpdir(), 'film-dev'), name)));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ---- the README as GitHub renders it. The API allows 60 calls an hour per machine, so answers are cached by content hash ----
export async function githubBody(root) {
  const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const hash = crypto.createHash('sha1').update(md).digest('hex').slice(0, 12);
  const dir = path.resolve(process.env.FILM_CACHE || path.join(TOOLS, '..', 'preview-cache'));
  const cache = path.join(dir, `md-${hash}.html`);
  if (fs.existsSync(cache)) return fs.readFileSync(cache, 'utf8');
  const res = await fetch('https://api.github.com/markdown', {
    method: 'POST',
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'olwtelet-film-dev' },
    // `markdown` mode is what a README file gets; `gfm` is the comment renderer and turns newlines into <br>.
    body: JSON.stringify({ text: md, mode: 'markdown' }),
  });
  if (!res.ok) throw new Error(`markdown API ${res.status}: ${await res.text()}`);
  const body = await res.text();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cache, body);
  return body;
}

export const RAW_HEADERS = {
  'Content-Type': 'image/svg+xml',
  'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  'X-Content-Type-Options': 'nosniff',
};

// /page?t=dark&w=846 is the README in a column of that width. &bg=ff00ff forces the page colour, for the leak test.
// &box=1 adds the 1 px border GitHub draws around a README.
export async function serve(root, { openDetails = false } = {}) {
  let body = await githubBody(root);
  if (openDetails) body = body.replace(/<details>/g, '<details open>');
  const cssDir = path.join(TOOLS, 'node_modules', 'github-markdown-css');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/page') {
      const theme = url.searchParams.get('t') || 'dark';
      const w = Number(url.searchParams.get('w'));
      const bg = url.searchParams.get('bg');
      const pageBg = bg ? `#${bg}` : (theme === 'dark' ? '#0d1117' : '#ffffff');
      const force = bg ? `<style>html,body,#col,.markdown-body,.markdown-body img{background:${pageBg}!important;background-color:${pageBg}!important}</style>` : '';
      const box = url.searchParams.get('box') ? `;border:1px solid ${theme === 'dark' ? '#30363d' : '#d0d7de'};border-radius:6px` : '';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/_css/${theme}.css">${force}</head>` +
        `<body style="margin:0;background:${pageBg}"><div id="col" style="box-sizing:content-box;width:${w}px;margin:0 auto;padding:${w < 500 ? 16 : 24}px${box}">` +
        `<article class="markdown-body" style="background:transparent">${body}</article></div></body></html>`);
      return;
    }
    if (url.pathname.startsWith('/_css/')) {
      const theme = url.pathname.includes('dark') ? 'dark' : 'light';
      res.setHeader('Content-Type', 'text/css');
      res.end(fs.readFileSync(path.join(cssDir, `github-markdown-${theme}.css`)));
      return;
    }
    const f = path.join(root, decodeURIComponent(url.pathname));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; res.end(); return; }
    for (const [k, v] of Object.entries(RAW_HEADERS)) res.setHeader(k, v);
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, close: () => server.close() };
}

// A full-page capture from a normal viewport shows off-screen tiles on a stale frame. It once printed the impact frame as
// a black band across the shadow and the sentence. So: make the viewport as tall as the page, load again with every tile
// on screen, wait, and capture the viewport. Never pass fullPage to a capture of this page.
export async function openTall(page, url, waitMs, { until = 'load' } = {}) {
  await page.goto(url, { waitUntil: until });
  const { width } = page.viewportSize();
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width, height: H });
  await page.reload({ waitUntil: until });
  await page.waitForTimeout(waitMs);
  return H;
}

// ---- reading the page ----
export const lum = (r, g, b) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

// The README's rows and tiles, as written.
export function readmeRows(root) {
  const md = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
  const para = md.slice(md.indexOf('<p>'), md.indexOf('</p>'));
  return para.split('\n').filter((l) => l.includes('<img')).map((l) =>
    [...l.matchAll(/<img src="([^"]+)" width="([\d.]+)%"/g)].map((t) => {
      const file = path.join(root, t[1]);
      const s = fs.readFileSync(file, 'utf8');
      const vb = s.match(/viewBox="([^"]+)"/)[1].split(/[\s,]+/).map(Number);
      return { src: t[1], name: path.basename(t[1]), pct: +t[2], vbW: vb[2], vbH: vb[3], file, svg: s };
    }));
}

// The art's height in px in a column of width w.
export const artHeight = (root, w) => readmeRows(root).reduce((sum, r) => sum + (w * r[0].pct / 100) * (r[0].vbH / r[0].vbW), 0);

// Group measured images ({t, ...}) into rows by their top edge.
export function rowsOf(ims) {
  const rows = [];
  for (const im of ims) { const last = rows.at(-1); if (last && Math.abs(last[0].t - im.t) < 0.6) last.push(im); else rows.push([im]); }
  return rows;
}

// ---- system Firefox over WebDriver BiDi with a raw WebSocket. Playwright cannot drive a stock Firefox ----
const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.on('error', rej);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => res(port)); });
});

export async function launchFirefox({ width, height, prefs = [] }) {
  const exe = process.env.FILM_FIREFOX || { win32: 'C:/Program Files/Mozilla Firefox/firefox.exe', darwin: '/Applications/Firefox.app/Contents/MacOS/firefox' }[process.platform] || 'firefox';
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'film-ff-'));
  fs.writeFileSync(path.join(profile, 'user.js'), [
    'user_pref("browser.shell.checkDefaultBrowser", false);', 'user_pref("datareporting.policy.dataSubmissionEnabled", false);',
    'user_pref("toolkit.telemetry.reportingpolicy.firstRun", false);', 'user_pref("browser.aboutwelcome.enabled", false);',
    'user_pref("remote.prefs.recommended", true);', ...prefs,
  ].join('\n'));
  // a loaded machine can miss the 32 s window, so a launch gets one more try before it counts as a failure
  let proc, ws;
  for (let attempt = 0; attempt < 2 && !ws; attempt++) {
    const port = await freePort();
    proc = spawn(exe, ['--headless', '--no-remote', '--profile', profile, `--remote-debugging-port=${port}`, '--width', String(width), '--height', String(height)], { stdio: 'ignore' });
    for (let i = 0; i < 80 && !ws; i++) {
      await new Promise((r) => setTimeout(r, 400));
      try { ws = await new Promise((res, rej) => { const s = new WebSocket(`ws://127.0.0.1:${port}/session`); s.onopen = () => res(s); s.onerror = rej; }); } catch { /* not listening yet */ }
    }
    if (!ws) proc.kill();
  }
  if (!ws) throw new Error(`no BiDi socket from ${exe}`);
  let id = 0, onEvent = () => {};
  const pending = new Map();
  ws.onmessage = (m) => {
    const j = JSON.parse(m.data);
    if (j.id && pending.has(j.id)) {
      const { res, rej, method } = pending.get(j.id);
      pending.delete(j.id);
      if (j.type === 'error') rej(new Error(`${method}: ${j.error} ${j.message}`)); else res(j.result);
    } else if (j.method) onEvent(j);
  };
  const call = (method, params = {}) => new Promise((res, rej) => { const n = ++id; pending.set(n, { res, rej, method }); ws.send(JSON.stringify({ id: n, method, params })); });
  await call('session.new', { capabilities: {} });
  const tree = await call('browsingContext.getTree', {});
  const context = tree.contexts[0].context;
  return {
    call,
    context,
    on: (cb) => { onEvent = cb; },
    evaluate: (expression) => call('script.evaluate', { expression, target: { context }, awaitPromise: true }),
    capture: async (file, options = {}) => { const r = await call('browsingContext.captureScreenshot', { context, ...options }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; },
    close: async () => {
      await call('session.end', {}).catch(() => {});
      proc.kill();
      await new Promise((r) => setTimeout(r, 600));
      try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* Windows may still hold it; it is in the temp folder */ }
    },
  };
}
