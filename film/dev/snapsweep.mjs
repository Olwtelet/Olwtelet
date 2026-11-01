// Side-by-side tiles of one row can snap to different device-pixel heights, leaving a 1 device px gap of page colour
// under the shorter one, or a 1 device px jog between rows. Predict it from layout at the real device scale, for every
// column 573 to 846 and 293 to 393, at seven scales.
// Pass: at most 1 percent of combinations, none at 846 at any scale, none at 293 at 2x or 3x.
//
// usage: node snapsweep.mjs <root>
import { buildRoot, chromium, serve } from './lib.mjs';

const root = buildRoot('snapsweep.mjs <root>');
const dsfs = [1, 1.25, 1.5, 1.75, 2, 2.625, 3];
const srv = await serve(root);
let gapRows = 0, combos = 0;
const fails = [];
for (const dsf of dsfs) {
  const browser = await chromium.launch({ headless: true, args: [`--force-device-scale-factor=${dsf}`, '--window-size=1100,900'] });
  const ctx = await browser.newContext({ viewport: null });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${srv.port}/page?t=dark&w=846`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const res = await page.evaluate((dsf) => {
    const col = document.getElementById('col');
    const ims = [...document.images];
    const out = { desk: 0, deskN: 0, phone: 0, phoneN: 0, at846: [], at829: [], at293: [], names: {} };
    const check = (w) => {
      col.style.width = w + 'px';
      const rects = ims.map((i) => i.getBoundingClientRect());
      const rows = [];
      rects.forEach((r, k) => { const last = rows.at(-1); if (last && Math.abs(last[0].r.top - r.top) < 0.5) last.push({ r, k }); else rows.push([{ r, k }]); });
      const bad = [];
      rows.forEach((row) => {
        if (row.length < 2) return;
        const bs = row.map((x) => Math.round(x.r.bottom * dsf));
        if (Math.max(...bs) !== Math.min(...bs)) bad.push(ims[row[0].k].getAttribute('src').split('/').pop().replace('.svg', ''));
      });
      return bad;
    };
    for (let w = 573; w <= 846; w++) { const b = check(w); out.deskN++; if (b.length) out.desk++; if (w === 846) out.at846 = b; if (w === 829) out.at829 = b; b.forEach((n) => { out.names[n] = (out.names[n] || 0) + 1; }); }
    for (let w = 293; w <= 393; w++) { const b = check(w); out.phoneN++; if (b.length) out.phone++; if (w === 293) out.at293 = b; b.forEach((n) => { out.names[n] = (out.names[n] || 0) + 1; }); }
    return out;
  }, dsf);
  console.log(`dsf ${dsf}: desktop cols with a gap row ${res.desk}/${res.deskN}, phone cols ${res.phone}/${res.phoneN}; at846=[${res.at846}] at829=[${res.at829}] at293=[${res.at293}] rows=${JSON.stringify(res.names)}`);
  gapRows += res.desk + res.phone;
  combos += res.deskN + res.phoneN;
  if (res.at846.length) fails.push(`at 846 at scale ${dsf}: ${res.at846}`);
  if ((dsf === 2 || dsf === 3) && res.at293.length) fails.push(`at 293 at scale ${dsf}: ${res.at293}`);
  await browser.close();
}
srv.close();
const percent = 100 * gapRows / combos;
if (percent > 1) fails.push(`${percent.toFixed(1)} percent of combinations`);
console.log(`${gapRows} gap rows in ${combos} combinations, ${percent.toFixed(1)} percent`);
for (const f of fails) console.log(`FAIL ${f}`);
if (fails.length) process.exitCode = 1;
