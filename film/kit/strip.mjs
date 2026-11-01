// The exposure strip: 365 rows, one per day of a frozen year, down the left edge of the film.
import fs from 'node:fs';
import { C, rng, taper } from './draw.mjs';

export const ROW = 22, DAYS = 365, STRIP = 62, STRIP_H = ROW * DAYS;
export const days = JSON.parse(fs.readFileSync(new URL('../data/year.json', import.meta.url), 'utf8'));
export const dayIndex = (iso) => days.findIndex((d) => d.date === iso);
export const yOfDay = (iso) => dayIndex(iso) * ROW;

// Calendar arithmetic on the frozen dates. Sakamoto's weekday, 0 is Sunday: no Date object anywhere in the build.
const MONTH_OFFSET = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
const parts = (iso) => iso.split('-').map(Number);
const dayOfMonth = (iso) => parts(iso)[2];
const monthIndex = (iso) => parts(iso)[1] - 1;
const weekday = (iso) => { let [y, m, d] = parts(iso); if (m < 3) y -= 1; return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + MONTH_OFFSET[m - 1] + d) % 7; };

export function strip(page, { faces, COPY, pen }) {
  const { hand: Hand, gothic: Gothic } = faces;
  const R = rng(77);
  page.polys([[[-14, -14], [STRIP, -14], [STRIP, STRIP_H + 14], [-14, STRIP_H + 14]]], `fill="${C.sumi}"`);
  const thin = [], week = [], months = [];
  days.forEach((d, i) => {
    const y = i * ROW;
    if (dayOfMonth(d.date) === 1) { months.push([0, y, STRIP, y]); return; }
    if (weekday(d.date) === 1) { week.push([STRIP - 15, y, STRIP, y]); week.push([0, y, 15, y]); } else thin.push([STRIP - 7, y, STRIP, y]);
  });
  page.segs(thin, `stroke="${C.douga}" stroke-width="1.5"`);
  page.segs(week, `stroke="${C.douga}" stroke-width="2.6"`);
  page.segs(months, `stroke="${C.toka}" stroke-width="3.4"`);
  // the last row: the strip stops here
  page.segs([[0, STRIP_H, STRIP, STRIP_H]], `stroke="${C.toka}" stroke-width="5"`);
  const X = 24;
  const hold = [], marksBig = [], marksThin = [];
  let start = 0;
  days.forEach((d, i) => {
    const y = i * ROW;
    if (d.n) {
      if (y - 5 > start) hold.push(taper([[X, start + 3], [X, y - 2]], { w: 3.4, prof: (t) => 0.95 - 0.3 * Math.sin(Math.PI * t), R }));
      start = y + ROW;
      if (d.n >= 5) { const L = Math.min(STRIP - 4, 16 + Math.log2(d.n + 1) * 8); marksBig.push([[4, y + 2], [4 + L, y + 2], [4 + L, y + ROW - 2], [4, y + ROW - 2]]); }
      else marksThin.push([[10, y + 8], [40, y + 8], [40, y + 14], [10, y + 14]]);
    }
  });
  hold.push(taper([[X, start + 3], [X, STRIP_H]], { w: 3.4, prof: () => 0.8, R }));
  page.polys(hold, `fill="${C.verm}"`);
  page.polys(marksBig, `fill="${C.toka}"`, { cls: 'm' });
  page.polys(marksThin, `fill="${C.douga}"`, { cls: 'm' });
  days.forEach((d, i) => {
    const y = i * ROW;
    if (d.n) {
      const s = String(d.n), size = d.n >= 10 ? 21 : 23;
      page.text(Gothic, s, X - s.length * size * 0.27, y + 19, { size, fill: d.n >= 10 ? C.toka : C.douga, cls: 'd' });
    }
    // a month whose first day has a number stands beside it, not on it
    if (dayOfMonth(d.date) === 1) page.text(Hand, COPY.months[monthIndex(d.date)], d.n ? 28 : 18, y + 20, { size: d.n ? 20 : 22, fill: C.toka, cls: 'd', R, jit: 8 });
  });
  // where the strip stops: the date, on it
  page.text(Hand, COPY.stripEnd, 44, STRIP_H + 234, { size: 46, fill: C.toka, R: pen, jit: 5, rot: -90 });
}
