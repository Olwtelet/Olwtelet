// Contribution data for the daily signal log (SPEC §5.1, decision §11.1).
//
// Primary source: the public contributions calendar HTML — the same numbers a visitor sees under the README,
// and every year page carries GitHub's own total in its header, which the validator checks the days against.
// Fallback: the GraphQL contributionsCollection (needs GITHUB_TOKEN).
//
// Nothing here reads the clock, the file system or the environment: the caller passes `today`, and every network
// call goes through injectable `fetch` / `sleep` so the job's failure paths can be exercised offline. Fetchers
// throw only on transport-level failures; data problems come back from validate() as reasons the caller prints
// while it keeps the last good file.

export const DAY_MS = 86_400_000;
const MONTHS = Object.freeze(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']);
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** User-Agent sent with every request (GitHub rejects requests without one). */
export const USER_AGENT = 'olwtelet-signal-log';
/** Backoff before retry 1 and retry 2 of a failed request (SPEC §5.1: two retries, 5 s then 20 s). */
export const BACKOFF_MS = Object.freeze([5_000, 20_000]);
/**
 * Deadline for one request. Without it a connection that is accepted and never answered waits out undici's
 * 300 s header timeout, and three attempts plus backoff (925 s) overrun the workflow's `timeout-minutes: 10`
 * — the job would be killed as FAILED instead of exiting 0 and keeping the last good card. An AbortError is
 * an ordinary transport failure here, so the retries and the source fallback already handle it.
 */
export const REQUEST_TIMEOUT_MS = 20_000;

// ── dates (UTC only, string in / string out) ─────────────────────────────────────────────────────
/** 'YYYY-MM-DD' → epoch ms at 00:00 UTC. Throws on anything that is not an ISO date. */
export function toMs(iso) {
  if (!ISO.test(iso)) throw new Error(`not an ISO date: ${JSON.stringify(iso)}`);
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`not a real date: ${iso}`);
  return ms;
}
/** Epoch ms → 'YYYY-MM-DD' (UTC). */
export const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
/** Shift an ISO date by whole days. */
export const addDays = (iso, days) => toIso(toMs(iso) + days * DAY_MS);
/** Whole days between two ISO dates (b − a). */
export const daysBetween = (a, b) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
/** Today in UTC, as 'YYYY-MM-DD'. The only clock read in this module, and only when the caller asks. */
export const todayUtc = (now = new Date()) => now.toISOString().slice(0, 10);

const SYNC_FORMAT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
/** '2026-09-11' → 'SEP 11, 2026' (the SYNC readout, SPEC §5.1 step 4). */
export const syncLabel = (iso) => SYNC_FORMAT.format(new Date(toMs(iso))).toUpperCase();

// ── retries ──────────────────────────────────────────────────────────────────────────────────────
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** An HTTP failure carrying its status, so withRetries can tell "come back later" from "never". */
const httpError = (message, status) => Object.assign(new Error(message), { status });

/** 404 (user renamed), 401/403 (bad token) and friends cannot change between attempts; 429 can. */
const permanent = (err) => Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 && err.status !== 429;

/**
 * Run `attempt` once, then retry after each BACKOFF_MS delay. Rejects with the last error. A permanent 4xx
 * is rethrown at once instead of burning 25 s of backoff on a result that could never change.
 * @example await withRetries(() => get(url), { sleep, log })
 */
export async function withRetries(attempt, { backoff = BACKOFF_MS, sleep = wait, log = () => {} } = {}) {
  let last;
  for (let tries = 0; tries <= backoff.length; tries++) {
    try {
      return await attempt();
    } catch (err) {
      last = err;
      if (permanent(err)) break;
      if (tries < backoff.length) {
        log(`retry in ${backoff[tries] / 1000}s: ${err.message}`);
        await sleep(backoff[tries]);
      }
    }
  }
  throw last;
}

/**
 * The first few reasons on one line, the rest as a count. A markup change that nulls every day produces one
 * reason per day (~1,700 of them, 86 KB); unsummarized that becomes a single `::warning::` annotation in which
 * the actual cause is unreadable. Callers print the full list separately.
 * @example summarize(['a', 'b', 'c'], 2) → 'a; b (+1 more)'
 */
export function summarize(reasons, max = 5) {
  const shown = reasons.slice(0, max).join('; ');
  return reasons.length > max ? `${shown} (+${reasons.length - max} more)` : shown;
}

// ── public calendar HTML (primary) ───────────────────────────────────────────────────────────────
/** The public calendar page for one year. */
export const calendarUrl = (user, year) =>
  `https://github.com/users/${encodeURIComponent(user)}/contributions?from=${year}-01-01&to=${year}-12-31`;

/**
 * Parse one calendar page: `<td data-date … id …>` cells joined to their `<tool-tip for=…>` text, plus the
 * header total ("263 contributions in 2026" / "No contributions in 2023"). Days outside `year` — the padding
 * cells of the first and last week — are dropped. A cell without a tooltip keeps `count: null` so validate()
 * reports it instead of silently counting it as zero.
 * @example parseCalendarHtml(html, 2026) → { year: 2026, total: 263, days: [{ date, count }, …] }
 */
export function parseCalendarHtml(html, year) {
  const prefix = `${year}-`;
  const dateOf = new Map(); // cell id → date
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

/** Fetch one URL as text; any non-200 (or a thrown network error) becomes an Error for withRetries. */
async function getText(url, { fetchImpl, headers }) {
  const res = await fetchImpl(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw httpError(`${url} → HTTP ${res.status}`, res.status);
  return res.text();
}

/**
 * Every requested year from the public calendar, newest request last.
 * @example await fetchHtml({ user: 'Olwtelet', years: [2022, 2023] })
 */
export async function fetchHtml({ user, years, fetchImpl = globalThis.fetch, sleep, log = () => {} }) {
  const out = [];
  for (const year of years) {
    const html = await withRetries(() => getText(calendarUrl(user, year), { fetchImpl }), { sleep, log });
    const parsed = parseCalendarHtml(html, year);
    if (!parsed.days.length) throw new Error(`${calendarUrl(user, year)} → no day cells (page layout changed?)`);
    out.push(parsed);
  }
  return { source: 'html', years: out };
}

// ── GraphQL (fallback) ───────────────────────────────────────────────────────────────────────────
export const GRAPHQL_URL = 'https://api.github.com/graphql';
export const GRAPHQL_QUERY =
  'query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to)' +
  '{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}';

/**
 * The same per-year shape from the GraphQL contributionsCollection. One query per calendar year; the current
 * year stops at `to` (usually now) so GitHub does not report future days.
 * @example await fetchGraphql({ user: 'Olwtelet', years: [2026], token, to: '2026-09-11T12:00:00Z' })
 */
export async function fetchGraphql({ user, years, token, to, fetchImpl = globalThis.fetch, sleep, log = () => {} }) {
  if (!token) throw new Error('no GITHUB_TOKEN for the GraphQL fallback');
  const out = [];
  for (const year of years) {
    const variables = { login: user, from: `${year}-01-01T00:00:00Z`, to: to && Number(to.slice(0, 4)) === year ? to : `${year}-12-31T23:59:59Z` };
    const body = JSON.stringify({ query: GRAPHQL_QUERY, variables });
    const json = await withRetries(async () => {
      const res = await fetchImpl(GRAPHQL_URL, {
        method: 'POST',
        headers: { 'User-Agent': USER_AGENT, Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) throw httpError(`GraphQL ${year} → HTTP ${res.status}`, res.status);
      const data = await res.json();
      if (data.errors?.length) throw new Error(`GraphQL ${year} → ${data.errors.map((e) => e.message).join('; ')}`);
      const calendar = data.data?.user?.contributionsCollection?.contributionCalendar;
      if (!calendar) throw new Error(`GraphQL ${year} → no contributionCalendar in the response`);
      return calendar;
    }, { sleep, log });
    const prefix = `${year}-`;
    const days = json.weeks.flatMap((w) => w.contributionDays)
      .filter((d) => String(d.date).startsWith(prefix))
      .map((d) => ({ date: d.date, count: d.contributionCount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    out.push({ year, total: json.totalContributions, days });
  }
  return { source: 'graphql', years: out };
}

/**
 * The calendar from the primary source, falling back to the other one (decision §11.1: HTML first). Throws with
 * both reasons when neither works, so the job can report exactly what failed.
 *
 * A source is judged on its data, not just on whether it threw: the likeliest GitHub change — a renamed
 * `<tool-tip>` element, or a reworded year header — parses "successfully" into all-null counts or a missing
 * year total, which used to be accepted as the answer and froze the card at its last SYNC date forever. Each
 * candidate therefore goes through validate() (without the prev/force guard, which is the caller's business)
 * and an unusable one falls through to the next source.
 * @example await fetchYears({ user: 'Olwtelet', since: 2022, today: '2026-09-11', token })
 */
export async function fetchYears({ user, since, today, token, fetchImpl, sleep, log = () => {} }) {
  const years = [];
  for (let y = Number(since); y <= Number(today.slice(0, 4)); y++) years.push(y);
  const sources = [
    ['calendar HTML', () => fetchHtml({ user, years, fetchImpl, sleep, log })],
    ['GraphQL', () => fetchGraphql({ user, years, token, to: `${today}T23:59:59Z`, fetchImpl, sleep, log })],
  ];
  const failures = [];
  let candidate = null;
  for (const [name, run] of sources) {
    let got;
    try {
      got = await run();
    } catch (err) {
      failures.push(`${name}: ${err.message}`);
      log(`${name} failed: ${err.message}`);
      continue;
    }
    const reasons = validate({ years: got.years, days: normalize(got.years, { today }), since, today });
    if (!reasons.length) return got;
    candidate ??= got;
    failures.push(`${name}: ${summarize(reasons)}`);
    log(`${name} returned unusable data: ${summarize(reasons)}`);
  }
  // Every source answered but none validates: hand back the primary one so the caller reports the real reasons
  // once (and keeps the last good card) instead of a second, doubled copy of them.
  if (candidate) return candidate;
  throw new Error(failures.join(' | '));
}

// ── normalize, validate, derive ──────────────────────────────────────────────────────────────────
/**
 * Union of the per-year day lists, ascending, de-duplicated and trimmed to `today` (SPEC §5.1 step 2).
 * A day repeated across years keeps its first value; duplicates with different counts are reported by validate().
 * @example normalize(fetched.years, { today: '2026-09-11' })
 */
export function normalize(years, { today }) {
  const byDate = new Map();
  for (const year of years) {
    for (const day of year.days) {
      if (!ISO.test(day.date) || day.date > today) continue;
      if (!byDate.has(day.date)) byDate.set(day.date, { date: day.date, count: day.count });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Every reason the data must not be published (SPEC §5.1 step 3). An empty array means "publish".
 *   years  the fetched per-year totals, checked against the day sums
 *   prev   the last published dist/signal-log.json, or null
 *   force  --force / FORCE=true: skip the "total dropped by more than 10%" guard only
 * @example validate({ years, days, since: 2022, today, prev, force: false })
 */
export function validate({ years = [], days, since, today, prev = null, force = false }) {
  const errors = [];
  if (!Array.isArray(days) || !days.length) return ['no contribution days were parsed'];

  for (const day of days) {
    if (!Number.isInteger(day.count) || day.count < 0) errors.push(`${day.date}: count ${JSON.stringify(day.count)} is not a whole number ≥ 0`);
  }
  const first = `${since}-01-01`;
  if (days[0].date !== first) errors.push(`first day is ${days[0].date}, expected ${first}`);
  for (let i = 1; i < days.length; i++) {
    const gap = daysBetween(days[i - 1].date, days[i].date);
    if (gap !== 1) errors.push(`${gap === 0 ? 'duplicate' : `${gap - 1}-day gap`} between ${days[i - 1].date} and ${days[i].date}`);
  }
  const last = days.at(-1).date;
  const lag = daysBetween(last, today);
  if (lag < -1 || lag > 2) errors.push(`calendar ends ${last}, ${lag} day(s) from ${today}`);

  const byYear = new Map();
  for (const day of days) byYear.set(day.date.slice(0, 4), (byYear.get(day.date.slice(0, 4)) ?? 0) + (day.count || 0));
  for (const year of years) {
    if (year.total == null) { errors.push(`${year.year}: GitHub's own year total was not found`); continue; }
    const sum = byYear.get(String(year.year)) ?? 0;
    if (sum !== year.total) errors.push(`${year.year}: day sum ${sum} ≠ reported total ${year.total}`);
  }

  const weekCount = weeks(days).length;
  if (weekCount !== 53) errors.push(`derived ${weekCount} weekly points, expected 53`);

  // A sudden collapse of the all-time total means a broken read, not a lost year: only --force publishes it.
  const total = days.reduce((sum, day) => sum + (day.count || 0), 0);
  if (!force && prev && Number.isFinite(prev.total) && prev.total > 0 && total < prev.total * 0.9) {
    errors.push(`all-time total ${total} is ${Math.round((1 - total / prev.total) * 100)}% below the last published ` +
      `${prev.total} (run with --force to accept)`);
  }
  return errors;
}

/**
 * Readouts of SPEC §2: contributions since `days[0]`, the 365 days ending today, and the longest all-time run.
 * @example stats(days, { today: '2026-09-11' }) → { total: 388, last365: 269, longest: 8 }
 */
export function stats(days, { today }) {
  const from = addDays(today, -364);
  let total = 0, last365 = 0, longest = 0, run = 0;
  for (const day of days) {
    const count = day.count || 0;
    total += count;
    if (day.date >= from && day.date <= today) last365 += count;
    run = count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  return { total, last365, longest };
}

/**
 * The last `count` Sunday-start weekly sums, ending with the week of the last day. `month` is set on the week
 * that contains the 1st of a month (the trace's month ticks).
 * @example weeks(days).at(-1) → { start: '2026-09-06', count: 3, month: 'SEP' }
 */
export function weeks(days, { count = 53 } = {}) {
  const all = [];
  for (const day of days) {
    const ms = toMs(day.date);
    const start = toIso(ms - new Date(ms).getUTCDay() * DAY_MS);
    let week = all.at(-1);
    if (!week || week.start !== start) { week = { start, count: 0, month: null }; all.push(week); }
    week.count += day.count || 0;
    if (day.date.endsWith('-01')) week.month = MONTHS[Number(day.date.slice(5, 7)) - 1];
  }
  return all.slice(-count);
}

/**
 * Everything the renderer needs, from normalized days (SPEC §5.1 step 4).
 * @example derive(days, { today: '2026-09-11' }) → { total, last365, longest, weeks, sync, syncDate }
 */
export function derive(days, { today }) {
  return { ...stats(days, { today }), weeks: weeks(days), sync: syncLabel(today), syncDate: today };
}

/**
 * A saved days file for `--from-json` (no network). `days` is either the explicit list or the compact
 * `{ start, counts }` form the committed fixture uses, where day k is `start + k` — contiguous by construction.
 * @example daysFromJson({ years: [{ year: 2022, total: 2 }], days: { start: '2022-01-01', counts: [0, 1] } })
 */
export function daysFromJson(json) {
  const source = json?.days ?? json;
  let days;
  if (Array.isArray(source)) {
    days = source.map((d) => ({ date: d.date, count: d.count }));
  } else if (source && Array.isArray(source.counts)) {
    days = source.counts.map((count, k) => ({ date: addDays(source.start, k), count }));
  } else {
    throw new Error('days must be [{ date, count }] or { start, counts: [] }');
  }
  if (!days.length) throw new Error('the file holds no days');
  return { days, years: json?.years ?? [], today: json?.today ?? days.at(-1).date, source: json?.source ?? 'json' };
}

/**
 * The compact `{ start, counts }` form of a contiguous day list — the tooling that regenerates
 * `tv/fixtures/days-*.json` by hand, which is why nothing in the build calls it:
 *   node -e "import('./tv/lib/contrib.mjs').then(async(c)=>{const {days,years}=await …;
 *            console.log(JSON.stringify({years,today,days:c.toCompact(days)}))})"
 */
export function toCompact(days) {
  return { start: days[0].date, counts: days.map((d) => d.count) };
}
