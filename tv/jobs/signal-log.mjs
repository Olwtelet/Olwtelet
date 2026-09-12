// Daily signal log (SPEC §5.1, decision §11.1): fetch → normalize → validate → render → self-check → dist/.
//
//   node tv/jobs/signal-log.mjs --user Olwtelet --prev prev/signal-log.json --out dist [--force]
//   node tv/jobs/signal-log.mjs --from-json tv/fixtures/days-2026-09-11.json --out dist   (no network)
//   node tv/jobs/signal-log.mjs --standby --out dist                                      (the stand-by card)
//
// The job never publishes a broken or implausible file: the SVG is written to `signal-log.svg.tmp`, linted and
// checked, and only then renamed. Any data or render failure prints `::warning::` and exits 0 with
// `publish=false`, so a bad day leaves the last good file (and its visible SYNC date) in place. The one
// exception is a branch that never held a good file: then the stand-by card is published instead.
// Exit code 2 is reserved for usage errors — a broken workflow must fail loudly, bad data must not.
import fs from 'node:fs';
import path from 'node:path';
import { selectFontMode } from '../lib/font.mjs';
import { lintSvg, checkXml, errorsOf } from '../lib/lint.mjs';
import { fetchYears, normalize, validate, derive, daysFromJson, todayUtc, summarize } from '../lib/contrib.mjs';
import { render, standby, FILE } from '../assets/signal-log.mjs';
// Only for the default start year: the README's alt text reads the same value, so the sentence under the image
// and the "SINCE <year>" readout drawn on it cannot disagree. Nothing else here reads the content file.
import C from '../content.mjs';

/** Hard ceiling for a published file (SPEC §5.1 step 6); the SPEC §2 budget of 48 KB is a lint warning. */
const PUBLISH_MAX = 60_000;
const JSON_FILE = 'signal-log.json';
const USAGE = 'usage: node tv/jobs/signal-log.mjs [--user NAME] [--since YEAR] [--prev FILE] [--out DIR] ' +
  '[--force] [--from-json FILE] [--standby] [--today YYYY-MM-DD] [--font full|subset]';

// ── arguments ────────────────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  // The published card is pinned to the full font embed. Subsetting is opt-in here (`--font subset`) rather than
  // following the build-wide default, because this job publishes unattended every day and nothing downstream
  // reviews the result. A subset face the browser rejects fails silently: the text falls back to a system
  // monospace roughly 6% narrower, which slides every line out from under the drawn glyphs (▮ · — ↗) and carets
  // that this layout positions on the fixed 1200/2048 em grid. No check that reads the markup — including this
  // job's self-check — can see that, because the markup is byte-identical in both modes.
  // Flip the default once a subset build renders identically to the full embed at 880 and 356 px.
  const opts = { user: 'Olwtelet', since: C.signalLog.since, prev: null, out: 'dist', force: process.env.FORCE === 'true', fromJson: null, standby: false, today: null, font: 'full' };
  const valued = { '--user': 'user', '--since': 'since', '--prev': 'prev', '--out': 'out', '--from-json': 'fromJson', '--today': 'today', '--font': 'font' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return null;
    if (arg === '--force') opts.force = true;
    else if (arg === '--standby') opts.standby = true;
    else if (arg in valued) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value\n${USAGE}`);
      opts[valued[arg]] = value;
    } else throw new Error(`unknown argument "${arg}"\n${USAGE}`);
  }
  opts.since = Number(opts.since);
  if (!Number.isInteger(opts.since) || opts.since < 2008) throw new Error(`--since must be a year like 2022\n${USAGE}`);
  if (opts.today !== null && !/^\d{4}-\d{2}-\d{2}$/.test(opts.today)) throw new Error(`--today must be YYYY-MM-DD\n${USAGE}`);
  return opts;
}

// ── inputs and outputs ───────────────────────────────────────────────────────────────────────────
/**
 * The previous publication. A missing or *empty* file (including `--prev /dev/null`) counts as "the branch never
 * held a good file", which is what decides between the stand-by card and keeping the last good one.
 *
 * A file that is present but unparseable is deliberately NOT that signal: something was published, we just
 * cannot read its metadata. Reporting "the branch is empty" there would let one bad-data day force-push the
 * PLEASE STAND BY card over a perfectly good card. `data: null` keeps the file and skips the drop guard
 * (validate() already ignores a non-finite `prev.total`).
 */
function readPrev(file) {
  if (!file || !fs.existsSync(file)) return { exists: false, data: null };
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.log(`note: ${file} could not be read (${err.message}); treating the branch as empty`);
    return { exists: false, data: null };
  }
  if (!text.trim()) return { exists: false, data: null };
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object') throw new Error('not a JSON object');
    return { exists: true, data };
  } catch (err) {
    console.log(`note: ${file} is not readable publication metadata (${err.message}); the last published file ` +
      'is kept anyway, and the 10% drop guard is skipped for this run');
    return { exists: true, data: null };
  }
}

/** GitHub Actions step output; printed instead when the job runs outside a workflow. */
function setOutput(key, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (file) fs.appendFileSync(file, `${key}=${value}\n`);
  else console.log(`${key}=${value}`);
}

/** The days to draw, either from a saved file (`--from-json`, no network) or from GitHub. */
async function collect(opts) {
  if (opts.fromJson) {
    const saved = daysFromJson(JSON.parse(fs.readFileSync(opts.fromJson, 'utf8')));
    // A fixture pins its own clock, so the CI smoke run renders the same card forever; --today overrides it.
    const today = opts.today ?? saved.today;
    return { days: normalize([{ days: saved.days }], { today }), years: saved.years, today, source: saved.source };
  }
  const today = opts.today ?? todayUtc();
  const { source, years } = await fetchYears({
    user: opts.user, since: opts.since, today, token: process.env.GITHUB_TOKEN, log: (m) => console.log(`note: ${m}`),
  });
  return { days: normalize(years, { today }), years, today, source };
}

// ── self-check ───────────────────────────────────────────────────────────────────────────────────
/**
 * Everything that must hold before a file may be published (SPEC §5.1 step 6). lintSvg already covers the
 * document shape, the forbidden markup, `NaN`/`undefined`/`Infinity`, the palette, the type minimums and the
 * tier-B motion policy; the rest is checked here.
 *   total     the value that must appear as data-total
 *   weeks     the number of trace points every step path must have
 *   syncDate  'YYYY-MM-DD' that must appear as data-sync
 *   sync      the drawn SYNC readout ('SEP 11, 2026') that must appear as text
 *   since     the start year, which must match the `SINCE <year>` readout label the renderer drew
 */
function selfCheck(svg, { font, total = null, weeks = null, sync = null, syncDate = null, since = null, dateless = false }) {
  const problems = errorsOf(lintSvg(FILE, svg, { font })).map((f) => f.message);
  problems.push(...checkXml(svg).errors.map((e) => `${FILE}: ${e}`));

  const bytes = Buffer.byteLength(svg);
  if (bytes > PUBLISH_MAX) problems.push(`${FILE}: ${bytes} B is over the ${PUBLISH_MAX} B publication ceiling`);
  if (total !== null && !svg.includes(`data-total="${total}"`)) problems.push(`${FILE}: data-total="${total}" is missing`);
  // The SYNC readout is the one thing that tells a visitor — and the owner's troubleshooting table — that the
  // card is stale, and `SINCE <year>` is where the workflow's `--since` becomes visible. Both are literal
  // strings in the markup, so checking them costs nothing and catches a renderer that silently drops them.
  if (syncDate !== null && !svg.includes(`data-sync="${syncDate}"`)) problems.push(`${FILE}: data-sync="${syncDate}" is missing`);
  if (sync !== null && !svg.includes(sync)) problems.push(`${FILE}: the drawn SYNC readout "${sync}" is missing`);
  if (since !== null && !svg.includes(`SINCE ${since}`)) problems.push(`${FILE}: the readout label "SINCE ${since}" does not match --since ${since}`);

  if (weeks !== null) {
    // every step path is one trace: n − 1 horizontal moves for n weekly points
    const steps = [...svg.matchAll(/ d="M[^"]*"/g)].map((m) => m[0].match(/H/g)?.length ?? 0).filter((n) => n > 0);
    if (steps.length < 2) problems.push(`${FILE}: found ${steps.length} step traces, expected one per tuning`);
    for (const n of new Set(steps)) if (n + 1 !== weeks) problems.push(`${FILE}: a trace has ${n + 1} steps, expected ${weeks}`);
  }
  if (dateless) {
    const bare = svg.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,');
    const stale = /\d{4}-\d{2}-\d{2}|SYNC/.exec(bare);
    if (stale) problems.push(`${FILE}: the stand-by card must carry no date or count, found "${stale[0]}"`);
  }
  return [...new Set(problems)];
}

/**
 * The full list into a collapsed group in the raw log, a capped summary into the returned message. That message
 * becomes the `::warning::` annotation, which is the first thing the owner reads in the Actions tab: one markup
 * change that nulls every day produces ~1,700 reasons (86 KB) and would bury the cause on one unreadable line.
 */
function detail(what, reasons) {
  if (reasons.length > 5) {
    console.log(`::group::all ${reasons.length} ${what} reasons`);
    for (const reason of reasons) console.log(reason);
    console.log('::endgroup::');
  }
  return summarize(reasons);
}

/** Write the SVG through a .tmp rename plus its JSON, and tell the workflow to publish. */
function publish(out, svg, meta, note) {
  const tmp = path.join(out, `${FILE}.tmp`);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(tmp, svg);
  fs.renameSync(tmp, path.join(out, FILE));
  fs.writeFileSync(path.join(out, JSON_FILE), `${JSON.stringify({ ...meta, generatedAt: new Date().toISOString() }, null, 2)}\n`);
  console.log(`${note} → ${path.join(out, FILE)} (${Buffer.byteLength(svg)} B)`);
  setOutput('publish', 'true');
  return 0;
}

/**
 * A data or render failure: keep the last good file, or publish the stand-by card when there has never been one.
 * Always exits 0 — a failed run must never fail the workflow (SPEC §5.1 step 8).
 */
function recover(out, prev, reason, font) {
  console.log(`::warning::signal-log not published: ${reason}`);
  if (prev.exists) {
    console.log('the last published signal-log.svg stays in place; its SYNC date shows the staleness');
    setOutput('publish', 'false');
    return 0;
  }
  try {
    const svg = standby();
    const problems = selfCheck(svg, { font, dateless: true });
    if (problems.length) throw new Error(detail('self-check', problems));
    return publish(out, svg, { standby: true, reason }, 'stand-by card (no previous publication)');
  } catch (err) {
    console.log(`::warning::the stand-by card could not be published either: ${err.message}`);
    setOutput('publish', 'false');
    return 0;
  }
}

// ── main ─────────────────────────────────────────────────────────────────────────────────────────
async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts) { console.log(USAGE); return 0; }
  const { mode: font } = await selectFontMode(opts.font);
  const out = path.resolve(opts.out);
  const prev = readPrev(opts.prev);

  try {
    if (opts.standby) {
      const svg = standby();
      const problems = selfCheck(svg, { font, dateless: true });
      if (problems.length) throw new Error(detail('self-check', problems));
      return publish(out, svg, { standby: true, reason: 'requested with --standby' }, 'stand-by card');
    }

    const { days, years, today, source } = await collect(opts);
    const reasons = validate({ years, days, since: opts.since, today, prev: prev.data, force: opts.force });
    if (reasons.length) throw new Error(detail('validation', reasons));

    const data = derive(days, { today });
    const svg = render({ ...data, since: opts.since });
    const problems = selfCheck(svg, {
      font, total: data.total, weeks: data.weeks.length, sync: data.sync, syncDate: data.syncDate, since: opts.since,
    });
    if (problems.length) throw new Error(detail('self-check', problems));

    console.log(`source ${source} · ${days.length} days · total ${data.total} · last365 ${data.last365} · ` +
      `longest ${data.longest} · ${data.weeks.length} weeks · sync ${data.sync}`);
    return publish(out, svg, {
      total: data.total, last365: data.last365, longest: data.longest, sync: data.sync, syncDate: data.syncDate, source,
    }, 'signal log');
  } catch (err) {
    return recover(out, prev, err.message, font);
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  console.error(`signal-log: ${err.message}`);
  process.exitCode = 2;
}
