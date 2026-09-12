// The generated parts of README.md (SPEC §1.2, §1.3): one markup block per region id.
//
// Everything here is derived from tv/content.mjs and from the build records, so a content edit can never
// leave a stale string behind: image alt text and links come from `record.alt` / `record.href` (the build
// already checks that a record's alt equals the SVG's own aria-label), and every count is computed.
// The hand-written parts of the README — the header comment, <a id="top"> and the bio paragraph — live
// outside the markers and are preserved by replaceRegions().
import { count, pad2 } from './content.mjs';
// SPEC §1.2: attribute values escape &, markdown text keeps a plain &. The README alt text written here is
// compared back against the build records by lintReadme(), so this must be the same escape the lint unescapes.
import { attr } from './lib/text.mjs';

/** The image file a signal-file card is built into, e.g. `file-01-argus.svg`. */
const cardFile = (f) => `file-${f.no}-${f.slug}.svg`;

/**
 * Keep a name on one line. GitHub strips `style` and `class`, so inside the centred footer lines the only
 * lever over wrapping is the space itself: without this, a 390 px column breaks the last playlist after
 * "WITH" and leaves "GRACE" alone on a line of its own.
 */
const nowrap = (s) => s.replace(/ /g, '&nbsp;');

/** Link one word of a sentence, e.g. "… curating playlists." → "… curating [playlists](url)." */
function linkify(sentence, word, url) {
  if (!sentence.includes(word)) throw new Error(`regions: "${word}" is no longer in "${sentence}"`);
  return sentence.replace(word, `[${word}](${url})`);
}

/** `**ORDFALL** · Full-Stack Developer & Cybersecurity Analyst · freelance, remote · Sep 2026 – present` */
const jobHeading = (w) => `**${w.company.toUpperCase()}** · ${w.role} · ${w.terms} · ${w.since} – present`;

/** The `<sub>` meta line of one signal file: category, status, year, role, stack, licence, then both links. */
function fileMeta(C, f) {
  const parts = [f.category, `STATUS: ${f.status}`];
  if (f.year) parts.push(f.year);
  if (f.role) parts.push(`ROLE: ${f.role}`);
  parts.push(f.stack);
  if (f.license) parts.push(f.license);
  parts.push(`<a href="${attr(C.fileUrl(f))}">[OPEN FILE ►]</a>`,
    `<a href="${attr(f.url)}">${f.kind === 'oss' ? 'VIEW SOURCE ↗' : 'OPEN WEBSITE ↗'}</a>`);
  return `<sub>${parts.join(' · ')}</sub>`;
}

/** Two lines per signal file: the bold number and title with its one-liner, then the meta line. */
const fileEntry = (C, f) => `**${f.no} / ${f.title.toUpperCase()}** — ${f.oneLiner}.<br>\n${fileMeta(C, f)}`;

/** `**▸ OPEN SOURCE · 04 FILES** · <a …>channel index</a>` */
const groupHeading = (label, n, href) => `**▸ ${label} · ${pad2(n)} FILES** · <a href="${attr(href)}">channel index</a>`;

/**
 * The markup of every README region, keyed by region id.
 *
 * A region is produced only when every image it shows was built, so `--only <family> --readme` rewrites the
 * regions those families feed and leaves the rest alone. A region fed only in part is never half-written:
 * it is dropped, and if that leaves nothing at all to write the call throws, because then the README rewrite
 * the caller asked for cannot happen. (`--only slates` feeds "certificates" completely and "archive" in part:
 * the certificates region is written and the archive region is left for a full build. `--only cards` feeds
 * only "archive", and only in part, so it throws.)
 *
 * @param C              the frozen content object (tv/content.mjs default export)
 * @param recordsByFile  { 'channel-00.svg': { file, alt, href, … } } from the build
 * @example replaceRegions(md, regions(C, byFile))
 */
export function regions(C, recordsByFile) {
  const oss = C.files.filter((f) => f.kind === 'oss');
  const web = C.files.filter((f) => f.kind === 'web');

  /** One `<a><img></a>` pair from the build record of `file`. */
  const img = (file, width) => {
    const record = recordsByFile[file];
    if (!record) throw new Error(`regions: no build record for ${file}`);
    return `<a href="${attr(record.href)}"><img src="assets/tv/${file}" width="${width}" alt="${attr(record.alt)}"></a>`;
  };

  // Region id → [images it needs, how it is written]. The two halves stay together so adding an image to a
  // region cannot forget to declare it.
  const SECTIONS = {
    hero: [['channel-00.svg'], () => img('channel-00.svg', '100%')],

    remote: [['btn-portfolio.svg', 'btn-resume.svg', 'btn-email.svg', 'btn-linkedin.svg'], (need) =>
      ['<p align="center">', ...need.map((file) => img(file, '24%')), '</p>'].join('\n')],

    // FULL RESUME: bio sentences 4–5, both work records with their duties, the skills table, education.
    'on-air': [['on-air.svg'], () => [
      img('on-air.svg', '100%'),
      '',
      '<details>',
      '<summary><b>FULL RESUME</b> · bio, on-air duties, skills, education, languages</summary>',
      '<br>',
      '',
      `${C.bio.more[0]} ${linkify(C.bio.more[1], 'playlists', C.links.playlists)}`,
      '',
      ...C.work.flatMap((w) => [jobHeading(w), ...w.duties.map((d) => `- ${d}`), '']),
      '| SKILLS | WHAT I REACH FOR |', // both columns are named: an empty <th> is an unlabelled column for a screen reader
      '|:--|:--|',
      ...C.skills.map(([label, value]) => `| **${label}** | ${value} |`),
      '',
      `**Education** · ${C.education}<br>`,
      `**Spoken languages** · ${C.languages}`,
      '',
      '</details>',
    ].join('\n')],

    // SIGNAL ARCHIVE: the slate, the four open-source cards, the websites guide, then all ten as text.
    archive: [['slate-archive.svg', ...oss.map(cardFile), 'guide-websites.svg'], () => [
      img('slate-archive.svg', '100%'),
      '',
      '<p align="center">',
      ...oss.map((f) => img(cardFile(f), '49%')),
      '</p>',
      '',
      img('guide-websites.svg', '100%'),
      // The guide is a picture: every site in it is a name a reader cannot click. The four repositories above
      // each link straight out of their card, so the six websites get the same — one row of real links, the
      // way the playlists deck is followed by its Spotify row.
      `<p align="center"><sub>${nowrap('OPEN WEBSITE:')} ${web
        .map((f) => `<a href="${attr(f.url)}">${nowrap(f.title.toUpperCase())}</a>`).join(' · ')}</sub></p>`,
      '',
      '<details>',
      // An action, not a label: the slate above already says SIGNAL ARCHIVE · 10 FILES, and a summary that
      // repeats it in GitHub's own font reads as the same heading printed twice (SPEC §1.2). `pad2` because
      // the slate right above it counts in two digits, and two counts of the same files should not disagree.
      `<summary><b>OPEN ALL ${pad2(count.files(C))} FILES</b> · stacks, roles and links</summary>`,
      '<br>',
      '',
      groupHeading('OPEN SOURCE', count.oss(C), C.links.openSource),
      '',
      ...oss.flatMap((f) => [fileEntry(C, f), '']),
      groupHeading('WEBSITES', count.web(C), C.links.websites),
      '',
      ...web.flatMap((f) => [fileEntry(C, f), '']),
      '</details>',
    ].join('\n')],

    certificates: [['slate-certificates.svg'], () => [
      img('slate-certificates.svg', '100%'),
      '',
      '<details>',
      `<summary><b>OPEN ALL ${pad2(count.certificates(C))} CERTIFICATES</b> · issuers, dates and verification links</summary>`,
      '<br>',
      '',
      '| CERTIFICATE | ISSUER · DATE |',
      '|:--|:--|',
      ...C.certificates.map((c) => `| [${c.title}](${c.url})${c.en ? ` (${c.en})` : ''} | ${c.issuer} · ${c.date} |`),
      '',
      '</details>',
    ].join('\n')],

    playlists: [['now-playing.svg'], () => [
      img('now-playing.svg', '100%'),
      `<p align="center"><sub>${nowrap('ON SPOTIFY:')} ${C.playlists.items
        .map((p) => `<a href="${attr(p.url)}">${nowrap(p.name.toUpperCase())}</a>`).join(' · ')}</sub></p>`,
    ].join('\n')],

    // The only remote image: rendered daily onto the `output` branch, so its alt text carries no numbers.
    // The year comes from content, not from a literal, so this line and the card's own "SINCE <year>" readout
    // (which the daily job checks against its `--since`) cannot drift apart.
    'signal-log': [[], () => `<a href="${attr(C.links.repos)}"><img src="${attr(C.links.signalLog)}" width="100%" ` +
      `alt="Signal log: weekly GitHub contributions over the last year, with total since ${C.signalLog.since}, ` +
      'last 365 days and longest streak. Refreshed daily. Opens my repositories on GitHub."></a>'],

    'sign-off': [['sign-off.svg'], () => [
      img('sign-off.svg', '100%'),
      '',
      `<p align="center"><sub>${[
        [C.links.home, 'PORTFOLIO'], [C.links.resume, 'RESUME'],
        // the address itself, not the word: it is the one contact detail a reader may want to read or copy
        // rather than click, and a mailto: href is the only other place this page carries it
        [C.links.email, nowrap(`EMAIL: ${C.links.email.replace(/^mailto:/, '')}`)],
        [C.links.linkedin, 'LINKEDIN'], [C.links.bluesky, 'BLUESKY'], [C.links.instagram, 'INSTAGRAM'],
        [C.links.ptbr, 'SITE IN PORTUGUESE (PT-BR)'],
      ].map(([href, label]) => `<a href="${attr(href)}">${label}</a>`).join(' · ')}` +
      '<br><a href="#top">◄ RETURN TO CHANNEL 00</a></sub></p>',
    ].join('\n')],
  };

  const out = {};
  const partial = [];
  let built = 0; // regions that show at least one image and were written whole
  for (const [id, [need, write]] of Object.entries(SECTIONS)) {
    const missing = need.filter((file) => !recordsByFile[file]);
    if (missing.length === need.length && need.length) continue; // this region's family was not built
    if (missing.length) { partial.push(`"${id}" also needs ${missing.join(', ')}`); continue; }
    out[id] = write(need);
    if (need.length) built++;
  }
  if (!built && partial.length) throw new Error(`regions: region ${partial.join('; ')} — run a full build`);
  return out;
}
