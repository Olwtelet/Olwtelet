// tv/build.mjs: generates the profile README images (assets/tv/*.svg) and README regions from tv/content.mjs.
// SPEC §4.3. Zero dependencies, Node ≥ 20, deterministic (identical input gives byte-identical output).
//
//   node tv/build.mjs                          every family → assets/tv/*.svg, then rewrite the README regions
//   node tv/build.mjs --only hero,cards        only the named families (imports nothing else; README untouched)
//   node tv/build.mjs --readme                 with --only: also rewrite the regions fed by those families
//   node tv/build.mjs --out DIR                write SVGs to DIR (outside the repo); README.md is never touched
//   node tv/build.mjs --check                  build in memory; exit 1 if an output or README region differs or lint fails
//                                              (a difference confined to the embedded font payload is a note, not a failure)
//   node tv/build.mjs --font full|subset       font embedding (default: subset when tv/lib/woff2.mjs passes its self-test)
//   node tv/build.mjs --hinting on|off         subset mode only: keep the TrueType programs (default: off, −16% bytes)
//   node tv/build.mjs --reduced-preview DIR    also write reduced-motion copies (QA, outside the repo)
//   node tv/build.mjs --contact-sheet FILE     HTML page: every image at six widths on both backgrounds (QA, outside the repo)
//   node tv/build.mjs --list                   print file, bytes, budget and lint status; write nothing
//
// A family is tv/assets/<name>.mjs exporting `family = '<name>'` and `build(C, ctx)` → records
// [{ file, svg, alt, href, region, budget?, tier? }]. Names starting with "_" are QA families: never discovered,
// only built with --only and always into --out. tv/assets/signal-log.mjs is rendered by the daily job, not here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as tokens from './lib/tokens.mjs';
import * as text from './lib/text.mjs';
import * as glyphs from './lib/glyphs.mjs';
import * as fx from './lib/fx.mjs';
import * as screen from './lib/screen.mjs';
import * as motion from './lib/motion.mjs';
import { seedOf, rng } from './lib/rng.mjs';
import { selectFontMode } from './lib/font.mjs';
import { lintSvg, lintContent, lintReadme, errorsOf } from './lib/lint.mjs';
import { REGION_IDS, hasRegions, extractRegions, replaceRegions, toLF } from './lib/readme.mjs';

const TV = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(TV);
const FAMILIES = path.join(TV, 'assets');
const ASSETS = path.join(ROOT, 'assets', 'tv');
const README = path.join(ROOT, 'README.md');
const REGIONS = path.join(TV, 'regions.mjs');
const CONTACT_WIDTHS = [880, 408, 200, 356, 172, 85];

const USAGE = 'usage: node tv/build.mjs [--only a,b] [--readme] [--out DIR] [--check] [--font full|subset] [--hinting on|off] [--reduced-preview DIR] [--contact-sheet FILE] [--list]';

// ── arguments and paths ──────────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { only: null, readme: false, out: null, check: false, font: undefined, hinting: undefined, reducedPreview: null, contactSheet: null, list: false };
  const valued = { '--only': 'only', '--out': 'out', '--font': 'font', '--hinting': 'hinting', '--reduced-preview': 'reducedPreview', '--contact-sheet': 'contactSheet' };
  const switches = { '--check': 'check', '--readme': 'readme', '--list': 'list' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return null;
    if (arg in switches) opts[switches[arg]] = true;
    else if (arg in valued) {
      const value = argv[++i];
      if (value === undefined || value.startsWith('--')) throw new Error(`${arg} needs a value\n${USAGE}`);
      opts[valued[arg]] = value;
    } else throw new Error(`unknown argument "${arg}"\n${USAGE}`);
  }
  if (opts.hinting !== undefined) {
    if (opts.hinting !== 'on' && opts.hinting !== 'off') throw new Error(`--hinting must be "on" or "off", got "${opts.hinting}"\n${USAGE}`);
    opts.hinting = opts.hinting === 'on';
  }
  if (opts.only !== null) {
    opts.only = [...new Set(opts.only.split(',').map((s) => s.trim()).filter(Boolean))];
    if (!opts.only.length) throw new Error('--only needs at least one family name');
  }
  if (opts.readme && !opts.only) throw new Error('--readme only makes sense with --only (a full build always rewrites the README)');
  return opts;
}

const isInside = (child, parent) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};
const samePath = (a, b) => path.relative(a, b) === '';
const shown = (p) => (isInside(p, ROOT) ? path.relative(ROOT, p) : p).replace(/\\/g, '/');
const thousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// ── families and records ─────────────────────────────────────────────────────────────────────────
/** Import the named families only (--only), or every tv/assets/*.mjs except QA families and signal-log.mjs. */
async function loadFamilies(only) {
  const names = only ?? fs.readdirSync(FAMILIES)
    .filter((f) => f.endsWith('.mjs') && !f.startsWith('_') && f !== 'signal-log.mjs')
    .map((f) => f.slice(0, -'.mjs'.length))
    .sort();
  const families = [];
  for (const name of names) {
    if (!/^_?[a-z0-9][a-z0-9-]*$/.test(name) || name === 'signal-log') throw new Error(`"${name}" is not a buildable family`);
    const file = path.join(FAMILIES, `${name}.mjs`);
    if (!fs.existsSync(file)) throw new Error(`family "${name}" not found: expected ${shown(file)}`);
    let mod;
    try {
      mod = await import(pathToFileURL(file).href);
    } catch (err) {
      throw new Error(`${shown(file)} failed to load: ${err.message}`);
    }
    if (mod.family !== name) throw new Error(`${shown(file)} must export const family = '${name}'`);
    if (typeof mod.build !== 'function') throw new Error(`${shown(file)} must export function build(C, ctx)`);
    families.push({ name, build: mod.build });
  }
  return families;
}

/** Check the shape of a family's records and return normalized copies. */
function validateRecords(name, records) {
  const qa = name.startsWith('_');
  if (!Array.isArray(records) || !records.length) throw new Error(`${name}.build() must return a non-empty array of records`);
  return records.map((r, i) => {
    const who = `${name}.build() record ${i}${r?.file ? ` (${r.file})` : ''}`;
    if (!(qa ? /^_[a-z0-9][a-z0-9-]*\.svg$/ : /^[a-z0-9][a-z0-9-]*\.svg$/).test(r?.file ?? '')) throw new Error(`${who}: file must be a bare kebab-case .svg name`);
    if (typeof r.svg !== 'string') throw new Error(`${who}: svg must be the string returned by svgDoc()`);
    if (typeof r.alt !== 'string' || !r.alt.trim()) throw new Error(`${who}: alt text is required`);
    if (!/^(https:\/\/|mailto:)/.test(r.href ?? '')) throw new Error(`${who}: href must be an https or mailto URL`);
    if (qa ? r.region !== null : !REGION_IDS.includes(r.region)) throw new Error(`${who}: region must be ${qa ? 'null for a QA family' : `one of ${REGION_IDS.join(', ')}`}`);
    return { file: r.file, svg: r.svg, alt: r.alt, href: r.href, region: r.region, budget: r.budget ?? null, tier: r.tier ?? 'B' };
  });
}

/** Lint every record; the root aria-label must be the record's alt text (one source for alt text). */
function lintRecords(records, font) {
  return records.map((r) => {
    const findings = lintSvg(r.file, r.svg, { budget: r.budget, tier: r.tier, font });
    const label = /^<svg [^>]*?aria-label="([^"]*)"/.exec(r.svg)?.[1];
    if (label === undefined || text.unescapeAttr(label) !== r.alt) {
      findings.push({ level: 'error', rule: 'alt', message: `${r.file}: svgDoc label must equal the record alt text` });
    }
    return { record: r, findings };
  });
}

function printFindings(list) {
  for (const f of list) console.log(`  ${f.level === 'error' ? 'error' : 'warn '} [${f.rule}] ${f.message}`);
}

function printTable(linted, font, complete) {
  if (!linted.length) return;
  const width = Math.max(28, ...linted.map(({ record }) => record.file.length)) + 2;
  console.log(`${'file'.padEnd(width)}${'bytes'.padStart(9)}${'budget'.padStart(9)}  lint`);
  let total = 0;
  for (const { record, findings } of linted) {
    const budget = record.budget ?? tokens.budgetFor(record.file);
    const limit = budget == null ? null : typeof budget === 'number' ? budget : budget[font];
    const errors = errorsOf(findings).length, warnings = findings.length - errors;
    const status = errors ? `${errors} error(s)` : warnings ? `${warnings} warning(s)` : 'ok';
    total += Buffer.byteLength(record.svg);
    console.log(`${record.file.padEnd(width)}${thousands(Buffer.byteLength(record.svg)).padStart(9)}${(limit == null ? '-' : thousands(limit)).padStart(9)}  ${status}`);
  }
  // The SPEC §2 acceptance is the page, not the file: only a complete build can be measured against it.
  const limit = complete ? tokens.pageBudget(font) : null;
  console.log(`${'page total'.padEnd(width)}${thousands(total).padStart(9)}${(limit == null ? '-' : thousands(limit)).padStart(9)}  ${
    limit == null ? 'partial build' : total > limit ? 'over' : 'ok'}`);
  if (limit != null && total > limit) {
    console.log(`  warn  [budget] assets/tv is ${thousands(total - limit)} B over the page budget ` +
      `(SPEC §2: ${thousands(tokens.PAGE_BUDGET[font])} B for every README image, the signal log's ${thousands(tokens.budgetFor('signal-log.svg').full)} B included)`);
  }
}

// ── README regions ──────────────────────────────────────────────────────────────────────────────
/**
 * The README after regeneration: { md, next, ids, findings } or { note } when regions cannot be generated yet
 * (no tv/regions.mjs, no README, or no markers). With --only, only regions fed by the built records change.
 */
async function planReadme(C, records, onlyMode) {
  if (!fs.existsSync(REGIONS)) return { note: 'tv/regions.mjs is not present yet: README regions untouched' };
  if (!fs.existsSync(README)) return { note: 'README.md is missing: regions untouched' };
  const md = toLF(fs.readFileSync(README, 'utf8'));
  if (!hasRegions(md)) return { note: 'README.md has no tv markers: regions not integrated yet' };
  const { regions } = await import(pathToFileURL(REGIONS).href);
  if (typeof regions !== 'function') throw new Error('tv/regions.mjs must export function regions(C, recordsByFile)');
  let markup = regions(C, Object.fromEntries(records.map((r) => [r.file, r])));
  if (onlyMode) {
    const fed = new Set(records.map((r) => r.region));
    markup = Object.fromEntries(Object.entries(markup).filter(([id]) => fed.has(id)));
  }
  const next = replaceRegions(md, markup);
  return { md, next, ids: Object.keys(markup), findings: lintReadme(next, C, onlyMode ? [] : records) };
}

// ── outputs ─────────────────────────────────────────────────────────────────────────────────────
/**
 * SVGs in `dir` that no record produces any more — what a renamed slug or a deleted family leaves behind.
 * Only a complete build can tell: with --only, every file of every other family would look orphaned.
 */
function orphans(dir, records, complete) {
  if (!complete || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((n) => n.endsWith('.svg') && !records.some((r) => r.file === n)).sort();
}

/**
 * A file with its embedded font payload blanked out. The subset face is a brotli stream, and brotli's output
 * can change between encoder versions — Node 22 bundles brotli 1.1.0, Node 24 bundles 1.2.0 — so comparing
 * those bytes would turn a CI runner upgrade into fifteen red files with nothing actually wrong. `--check`
 * compares everything else exactly and reports a payload-only difference as a note instead of a failure; the
 * payload stays guarded by lint's `font` rule (shape and `font-display`) and by the byte budget.
 */
const maskFont = (s) => s.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,');

function writeIfChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return true;
}

function writeContactSheet(file, records, dir) {
  const esc = text.attr; // the QA sheet puts alt text in both an HTML attribute and a heading: escape for both
  const sections = records.map((r) => {
    const [, W, H] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(r.svg) ?? [];
    const src = pathToFileURL(path.join(dir, r.file)).href;
    const row = (bg) => `<div class="row ${bg}">${CONTACT_WIDTHS.map((w) =>
      `<figure><img src="${src}" style="width:${w}px" alt="${esc(r.alt)}"><figcaption>${w} px</figcaption></figure>`).join('')}</div>`;
    return `<section><h2>${esc(r.file)} · ${W}×${H} · ${thousands(Buffer.byteLength(r.svg))} B</h2>${row('dark')}${row('light')}</section>`;
  });
  const css = 'body{margin:0;background:#161b22;color:#8b949e;font:13px/1.4 ui-monospace,monospace}h2{margin:0;padding:12px 16px;font-size:13px}' +
    '.row{display:flex;flex-wrap:wrap;align-items:flex-start;gap:16px;padding:16px}.dark{background:#0d1117}.light{background:#ffffff;color:#57606a}' +
    'figure{margin:0}img{display:block;height:auto}figcaption{padding-top:4px}';
  writeIfChanged(file, `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>tv contact sheet</title><style>${css}</style></head><body>${sections.join('')}</body></html>\n`);
}

// ── main ────────────────────────────────────────────────────────────────────────────────────────
async function main(argv) {
  const opts = parseArgs(argv);
  if (!opts) { console.log(USAGE); return 0; }

  const outDir = opts.out ? path.resolve(opts.out) : ASSETS;
  const customOut = !samePath(outDir, ASSETS);
  if (customOut && isInside(outDir, ROOT)) throw new Error(`--out ${opts.out}: QA output must live outside the repository (SPEC §11.10)`);
  for (const [flag, p] of [['--reduced-preview', opts.reducedPreview], ['--contact-sheet', opts.contactSheet]]) {
    if (p && isInside(path.resolve(p), ROOT)) throw new Error(`${flag} ${p}: QA output must live outside the repository (SPEC §11.10)`);
  }

  const { default: C } = await import('./content.mjs');
  const contentFindings = lintContent(C);
  if (errorsOf(contentFindings).length) { printFindings(contentFindings); throw new Error('tv/content.mjs failed its schema check'); }

  const { mode: font, hinting, note } = await selectFontMode(opts.font, opts.hinting === undefined ? {} : { hinting: opts.hinting });
  console.log(`font: ${font}${font === 'subset' ? ` · hinting ${hinting ? 'on' : 'off'}` : ''}${note ? ` (${note})` : ''}`);

  const families = await loadFamilies(opts.only);
  const qa = families.filter((f) => f.name.startsWith('_')).map((f) => f.name);
  if (qa.length && !customOut) throw new Error(`${qa.join(', ')} is a QA family: pass --out DIR outside the repository`);
  if (!families.length) console.log('warn: no families found in tv/assets');

  const ctx = Object.freeze({ font, seedOf, rng, lib: Object.freeze({ tokens, text, glyphs, fx, screen, motion }) });
  const records = [];
  for (const family of families) {
    let built;
    try {
      built = await family.build(C, ctx);
    } catch (err) {
      throw new Error(`tv/assets/${family.name}.mjs build(): ${err.message}`);
    }
    for (const record of validateRecords(family.name, built)) {
      if (records.some((r) => r.file === record.file)) throw new Error(`${record.file} is produced by two families`);
      records.push(record);
    }
  }

  const linted = lintRecords(records, font);
  const findings = linted.flatMap((l) => l.findings);
  printFindings(findings);
  printTable(linted, font, !opts.only && !qa.length);
  if (errorsOf(findings).length) { console.log(`lint failed: ${errorsOf(findings).length} error(s), nothing written`); return 1; }
  if (opts.list) return 0;

  const plan = !customOut && (!opts.only || opts.readme) ? await planReadme(C, records, Boolean(opts.only)) : null;
  if (plan?.note) console.log(`warn: ${plan.note}`);
  if (plan?.findings) printFindings(plan.findings);
  const readmeErrors = plan?.findings ? errorsOf(plan.findings).length : 0;

  if (opts.check) {
    const problems = [], notes = [];
    for (const r of records) {
      const file = path.join(outDir, r.file);
      if (!fs.existsSync(file)) { problems.push(`missing  ${shown(file)}`); continue; }
      const onDisk = toLF(fs.readFileSync(file, 'utf8'));
      if (onDisk === r.svg) continue;
      if (maskFont(onDisk) === maskFont(r.svg)) {
        notes.push(`font     ${shown(file)}: only the embedded font payload differs (a different --font / --hinting, or another brotli encoder) — rebuild to refresh`);
      } else problems.push(`differs  ${shown(file)}`);
    }
    for (const f of orphans(outDir, records, !opts.only)) problems.push(`orphan   ${shown(path.join(outDir, f))}`);
    if (plan?.next !== undefined && plan.next !== plan.md) {
      const [now, want] = [extractRegions(plan.md), extractRegions(plan.next)];
      for (const id of plan.ids) if (now[id] !== want[id]) problems.push(`differs  README.md region "${id}"`);
    }
    if (opts.contactSheet) writeContactSheet(path.resolve(opts.contactSheet), records, outDir);
    for (const n of notes) console.log(n);
    for (const p of problems) console.log(p);
    if (readmeErrors) console.log(`README lint failed: ${readmeErrors} error(s)`);
    if (problems.length || readmeErrors) { console.log(`check failed: ${problems.length} difference(s)`); return 1; }
    console.log('clean');
    return 0;
  }

  const stale = orphans(outDir, records, !opts.only);
  let written = 0;
  for (const r of records) written += writeIfChanged(path.join(outDir, r.file), r.svg) ? 1 : 0;
  console.log(`wrote ${written} of ${records.length} file(s) to ${shown(outDir)}`);
  // Say it here, on the run that caused it (a renamed slug), not one commit later as a CI failure.
  for (const f of stale) console.log(`warn: ${shown(path.join(outDir, f))} is no longer produced by any family — git rm it`);
  if (opts.reducedPreview) {
    const dir = path.resolve(opts.reducedPreview);
    for (const r of records) writeIfChanged(path.join(dir, r.file), screen.reducedPreview(r.svg));
    console.log(`reduced-motion previews in ${shown(dir)}`);
  }
  if (plan?.next !== undefined) {
    if (readmeErrors) { console.log(`README lint failed: ${readmeErrors} error(s), README.md not written`); return 1; }
    if (writeIfChanged(README, plan.next)) console.log('README.md regions updated');
  }
  if (opts.contactSheet) {
    writeContactSheet(path.resolve(opts.contactSheet), records, outDir);
    console.log(`contact sheet ${shown(path.resolve(opts.contactSheet))}`);
  }
  return 0;
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (err) {
  console.error(`tv/build: ${err.message}`);
  process.exitCode = 1;
}
