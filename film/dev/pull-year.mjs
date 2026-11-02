// Reads the public contribution calendar and writes film/data/year.json. Run by hand, about once a year. Nothing schedules
// it and the build never calls it. It reads no clock: the window is always stated. It needs no Playwright and no token.
//
//   node film/dev/pull-year.mjs [root] <from> <to> [--user Olwtelet] [--out FILE] [--compare]
//
// root     the build root; defaults to the folder this file's film/ sits in
// --out    write there instead of <root>/film/data/year.json
// --compare  write nothing; print every day that differs from the file already there, and exit 1 if any does
//
// The file holds 365 rows of {date, n}. The window must be 365 days, because the strip is 365 rows.
// A rebuild for a later window changes only what the strip prints: see film/README.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const DAY_MS = 86_400_000;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const USER_AGENT = 'olwtelet-film-pull-year';
const BACKOFF_MS = [5_000, 20_000]; // before retry 1 and retry 2 of a failed request
const REQUEST_TIMEOUT_MS = 20_000;

export function toMs(iso) {
  if (!ISO.test(iso)) throw new Error(`not an ISO date: ${JSON.stringify(iso)}`);
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== iso) throw new Error(`not a real date: ${iso}`);
  return ms;
}
export const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY_MS);

export const calendarUrl = (user, year) =>
  `https://github.com/users/${encodeURIComponent(user)}/contributions?from=${year}-01-01&to=${year}-12-31`;

// One calendar page: `<td data-date … id …>` cells joined to their `<tool-tip for=…>` text, plus the header total
// ("263 contributions in 2026" / "No contributions in 2023"). Days outside `year`, the padding cells of the first and last
// week, are dropped. A cell without a tooltip keeps `count: null`, so validation reports it instead of counting it as zero.
export function parseCalendarHtml(html, year) {
  const prefix = `${year}-`;
  const dateOf = new Map(); // cell id to date
  for (const [tag] of String(html).matchAll(/<td\b[^>]*>/g)) {
    const date = /\bdata-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (date?.startsWith(prefix) && id) dateOf.set(id, date);
  }
  const counts = new Map();
  for (const m of String(html).matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const date = dateOf.get(m[1]);
    if (!date) continue;
    const text = m[2].trim();
    const digits = /^([\d,]+)\s+contribution/.exec(text)?.[1];
    counts.set(date, digits ? Number(digits.replace(/,/g, '')) : /^No contributions/i.test(text) ? 0 : null);
  }
  const days = [...dateOf.values()].sort().map((date) => ({ date, count: counts.has(date) ? counts.get(date) : null }));
  const header = new RegExp(String.raw`(?:([\d,]+)|No)\s+contributions?\s+in\s+${year}\b`).exec(html);
  return { year, total: header ? (header[1] ? Number(header[1].replace(/,/g, '')) : 0) : null, days };
}

// Run `attempt`, then retry after each delay. A 4xx other than 429 cannot change between attempts, so it is rethrown at once.
async function withRetries(attempt, sleep) {
  let last;
  for (let tries = 0; tries <= BACKOFF_MS.length; tries++) {
    try { return await attempt(); } catch (err) {
      last = err;
      if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500 && err.status !== 429) break;
      if (tries < BACKOFF_MS.length) { console.error(`retry in ${BACKOFF_MS[tries] / 1000} s: ${err.message}`); await sleep(BACKOFF_MS[tries]); }
    }
  }
  throw last;
}

export async function fetchYear(user, year, { fetchImpl = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const url = calendarUrl(user, year);
  const html = await withRetries(async () => {
    const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) throw Object.assign(new Error(`${url}: HTTP ${res.status}`), { status: res.status });
    return res.text();
  }, sleep);
  const parsed = parseCalendarHtml(html, year);
  if (!parsed.days.length) throw new Error(`${url}: no day cells (page layout changed?)`);
  return parsed;
}

// Every reason the data must not be written. An empty list means write it.
export function validate(years, rows, from, to) {
  const errors = [];
  for (const y of years) {
    if (y.total == null) { errors.push(`${y.year}: GitHub's own year total was not found`); continue; }
    const sum = y.days.reduce((s, d) => s + (d.count || 0), 0);
    if (sum !== y.total) errors.push(`${y.year}: the days sum to ${sum}, GitHub's header says ${y.total}`);
  }
  for (const r of rows) if (!Number.isInteger(r.n) || r.n < 0) errors.push(`${r.date}: count ${JSON.stringify(r.n)} is not a whole number`);
  const want = daysBetween(from, to) + 1;
  if (want !== 365) errors.push(`the window is ${want} days; the strip is 365 rows`);
  if (rows.length !== want) errors.push(`${rows.length} rows for a window of ${want} days`);
  rows.forEach((r, i) => { const d = toIso(toMs(from) + i * DAY_MS); if (r.date !== d) errors.push(`row ${i} is ${r.date}, expected ${d}`); });
  return errors;
}

export const windowRows = (years, from, to) => years.flatMap((y) => y.days)
  .filter((d) => d.date >= from && d.date <= to)
  .map((d) => ({ date: d.date, n: d.count }));

export const serialize = (rows) => `[${rows.map((r) => JSON.stringify(r)).join(',\n')}]\n`;

export function summary(rows) {
  let run = 0, best = 0, sum = 0;
  for (const r of rows) { sum += r.n; run = r.n ? run + 1 : 0; if (run > best) best = run; }
  return { rows: rows.length, sum, longestRun: best, first: rows[0]?.date, last: rows.at(-1)?.date };
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const flagged = new Set(['--user', '--out']);
  const pos = argv.filter((a, i) => !a.startsWith('--') && !flagged.has(argv[i - 1]));
  const root = pos.length === 3 ? path.resolve(pos.shift()) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const [from, to] = pos;
  if (pos.length !== 2 || !ISO.test(from) || !ISO.test(to)) {
    console.error('usage: node film/dev/pull-year.mjs [root] <from> <to> [--user Olwtelet] [--out FILE] [--compare]');
    process.exit(2);
  }
  const user = opt('--user', 'Olwtelet');
  const target = path.join(root, 'film', 'data', 'year.json');
  const years = [];
  for (let y = Number(from.slice(0, 4)); y <= Number(to.slice(0, 4)); y++) years.push(await fetchYear(user, y));
  const rows = windowRows(years, from, to);
  const errors = validate(years, rows, from, to);
  console.log(`calendar ${user}, ${years.map((y) => `${y.year}: ${y.total} in ${y.days.length} days`).join(', ')}`);
  console.log(`window ${JSON.stringify(summary(rows))}`);
  if (errors.length) { for (const e of errors) console.error(`  ${e}`); console.error(`${errors.length} problem(s). Nothing written.`); process.exit(1); }

  if (argv.includes('--compare')) {
    const file = fs.readFileSync(target, 'utf8');
    const old = JSON.parse(file);
    console.log(`on file ${JSON.stringify(summary(old))}`);
    const byDate = new Map(old.map((r) => [r.date, r.n]));
    const differ = rows.filter((r) => byDate.get(r.date) !== r.n);
    for (const r of differ) console.log(`  ${r.date}: on file ${byDate.get(r.date)}, calendar ${r.n}`);
    for (const r of old) if (!rows.some((x) => x.date === r.date)) console.log(`  ${r.date}: on file ${r.n}, outside this window`);
    const same = serialize(rows) === file;
    console.log(same ? `byte-identical to ${target}` : `differs from ${target}: ${differ.length} day(s)`);
    process.exit(same ? 0 : 1);
  }
  const out = path.resolve(opt('--out', target));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, serialize(rows));
  console.log(`wrote ${out}. Now follow "Refreshing the year" in film/README.md: --check fails until the new numbers are stated.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
