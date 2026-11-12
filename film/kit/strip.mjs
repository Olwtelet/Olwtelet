// The exposure strip: 365 rows, one per day of a frozen year, down the left edge of the film. Printed like the cards: a black
// band, white day ticks, lemon month rules and month names in the condensed face, a red bar for every hold.
import fs from 'node:fs';
import { C } from './draw.mjs';

export const ROW = 22, DAYS = 365, STRIP = 62, STRIP_H = ROW * DAYS;
export const days = JSON.parse(fs.readFileSync(new URL('../data/year.json', import.meta.url), 'utf8'));

// Calendar arithmetic on the frozen dates. Sakamoto's weekday, 0 is Sunday: no Date object anywhere in the build.
const MONTH_OFFSET = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
const parts = (iso) => iso.split('-').map(Number);
const dayOfMonth = (iso) => parts(iso)[2];
const monthIndex = (iso) => parts(iso)[1] - 1;
const weekday = (iso) => { let [y, m, d] = parts(iso); if (m < 3) y -= 1; return (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + MONTH_OFFSET[m - 1] + d) % 7; };

export function strip(page, { faces, COPY }) {
  const Cond = faces.cond;
  page.polys([[[-14, -14], [STRIP, -14], [STRIP, STRIP_H + 14], [-14, STRIP_H + 14]]], `fill="${C.black}"`);
  const thin = [], week = [], months = [];
  days.forEach((d, i) => {
    const y = i * ROW;
    if (dayOfMonth(d.date) === 1) { months.push([0, y, STRIP, y]); return; }
    if (weekday(d.date) === 1) { week.push([STRIP - 15, y, STRIP, y]); week.push([0, y, 15, y]); } else thin.push([STRIP - 7, y, STRIP, y]);
  });
  page.segs(thin, `stroke="${C.white}" stroke-width="1.5"`);
  page.segs(week, `stroke="${C.white}" stroke-width="2.6"`);
  page.segs(months, `stroke="${C.lemon}" stroke-width="3.4"`);
  // the last row: the strip stops here
  page.segs([[0, STRIP_H, STRIP, STRIP_H]], `stroke="${C.lemon}" stroke-width="5"`);
  // a hold is a straight red bar down x 24 through every run of days without a contribution
  const X = 24, HW = 1.7;
  const bar = (y0, y1) => [[X - HW, y0], [X + HW, y0], [X + HW, y1], [X - HW, y1]];
  const runs = [], marksBig = [], marksThin = [];
  let start = 0;
  days.forEach((d, i) => {
    const y = i * ROW;
    if (d.n) {
      if (y - 5 > start) runs.push([start + 3, y - 2]);
      start = y + ROW;
      if (d.n >= 5) { const L = Math.min(STRIP - 4, 16 + Math.log2(d.n + 1) * 8); marksBig.push([[4, y + 2], [4 + L, y + 2], [4 + L, y + ROW - 2], [4, y + ROW - 2]]); }
      else marksThin.push([[10, y + 8], [40, y + 8], [40, y + 14], [10, y + 14]]);
    }
  });
  runs.push([start + 3, STRIP_H]);
  // a month name on a day without a number stands on x 16, across the bar: on desktop the bar breaks round its row the way
  // it breaks round a digit; the phone has no month names and keeps the bar whole
  const named = days.flatMap((d, i) => (dayOfMonth(d.date) === 1 && !d.n ? [i * ROW] : []));
  const both = [], phone = [], desk = [];
  for (const [a, b] of runs) {
    const cuts = named.filter((y) => y + ROW > a && y < b);
    if (!cuts.length) { both.push(bar(a, b)); continue; }
    phone.push(bar(a, b));
    let s = a;
    for (const y of cuts) { if (y - 2 - s > 3) desk.push(bar(s, y - 2)); s = y + ROW + 3; }
    if (b - s > 3) desk.push(bar(s, b));
  }
  page.polys(both, `fill="${C.rLine}"`);
  page.polys(phone, `fill="${C.rLine}"`, { cls: 'm' });
  page.polys(desk, `fill="${C.rLine}"`, { cls: 'd' });
  // the phone shows the count as bars: lemon for five or more, white under that
  page.polys(marksBig, `fill="${C.lemon}"`, { cls: 'm' });
  page.polys(marksThin, `fill="${C.white}"`, { cls: 'm' });
  days.forEach((d, i) => {
    const y = i * ROW;
    if (d.n) {
      const s = String(d.n), size = d.n >= 10 ? 21 : 23, w = page.measure(Cond, s, size);
      page.text(Cond, s, X - w / 2, y + 19, { size, fill: d.n >= 10 ? C.lemon : C.white, cls: 'd' });
    }
    // a month whose first day has a number stands beside it, not on it
    if (dayOfMonth(d.date) === 1) page.text(Cond, COPY.months[monthIndex(d.date)].toUpperCase(), d.n ? 30 : 16, y + 19, { size: 20, fill: C.lemon, cls: 'd' });
  });
  // where the strip stops: the date, on it
  page.text(Cond, COPY.stripEnd, 44, STRIP_H + 234, { size: 46, fill: C.lemon, rot: -90 });
}
