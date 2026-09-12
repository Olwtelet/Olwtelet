# assets/tv — the generated broadcast images

## 1. What this is

The profile `README.md` is **generated**. Everything between `<!-- tv:begin ID -->` and `<!-- tv:end ID -->`
is written by `node tv/build.mjs` from `tv/content.mjs`; everything outside the markers (the header comment,
`<a id="top">` and the bio paragraph) is hand-written and left alone by the build.

The images in `assets/tv/` are SVGs built by the same command. They copy the look of
[olwtelet.vercel.app](https://olwtelet.vercel.app/en/): a CRT screen in a dark bezel, VCR OSD Mono type,
SMPTE ECR 1-1978 colour bars, chromatic aberration and rolling-band effects. No external requests, no
scripts, no raster images — each file embeds the font it needs and paints everything else with shapes.

GitHub serves them inside `<img>`, so links and scripts inside an SVG never run: the clickable link is the
`<a>` around the image in the README.

## 2. Editing content

```sh
node tv/build.mjs            # rebuild assets/tv/*.svg and the README regions
node tv/build.mjs --check    # must print "clean" before committing
```

1. Edit `tv/content.mjs` — it is the single source for every image, every alt text and every README link.
   Counts (`10 FILES`, `GOOGLE 04 · ANTHROPIC 03 · UDEMY 01`, `CH n/4`) are computed, never typed.
   A new open-source file also needs a `short`: the phone card renders at 172 px, where 34-unit type holds
   about 26 characters to the line and the card has room for one or two of them. No one-liner on the site is
   that short, and a card with only a name and a status tells a phone reader nothing, so `short` is that
   file's own one-liner reduced — the same claim in the site's words, never a new one. The build refuses to
   draw a card without it, and `wrapStrict` refuses one that does not fit.
2. Run `node tv/build.mjs`. It aborts, naming the offending string, when text overflows its box, when two
   runs would collide, when a character is missing from the font, or when a file fails lint.
3. Run `node tv/build.mjs --check`; it prints `clean` when the working tree matches a fresh build.
4. The bio paragraph under the remote keys is hand-written markdown: edit it in `README.md` directly.

Other flags: `--only hero,cards` (build named families), `--list` (byte and lint table, writes nothing),
`--font full|subset`, `--hinting on|off`, `--out DIR`, `--reduced-preview DIR`, `--contact-sheet FILE`.
`--out`, `--reduced-preview` and `--contact-sheet` refuse paths inside the repository: QA output stays outside it.

`--only … --readme` also rewrites the README regions those families feed, so a one-family change does not
need a full build. A region is written only when every image it shows was built: `archive` needs the slate,
the four cards *and* the websites guide, so `--only cards --readme` refuses rather than write half a region.

`tv/assets/_specimen.mjs` is a QA family, not part of the profile: one sheet holding every colour token, the
type sizes in both tunings, the drawn glyphs on baseline guides, the SMPTE pieces and one looping swatch per
motion keyframe. A normal build never finds it (families starting with `_` are skipped) and it refuses to be
written into `assets/tv/`, so it only runs as `node tv/build.mjs --only _specimen --out ../qa/spec`. It is the
fastest way to see what a change to a token, a primitive or a keyframe did, before rebuilding the fifteen
real images.

## 3. The files

| file | what it shows | links to |
|:--|:--|:--|
| `channel-00.svg` | hero: the TV switching on — colour bars collapse into the strip, `▸ NOW RECEIVING:` types itself, chromatic `OLWTELET`, name, student line, tagline, city, station bug | `/en/` |
| `btn-portfolio.svg` | remote key `PORTFOLIO` | `/en/` |
| `btn-resume.svg` | remote key `RESUME` | `/en/resume/` |
| `btn-email.svg` | remote key `EMAIL` | `mailto:olwtelet@outlook.com` |
| `btn-linkedin.svg` | remote key `LINKEDIN` | `/in/olwtelet/` |
| `on-air.svg` | current roles: Ordfall and Integratek with role, dates and terms, plus the `STACK ·` row | `/en/resume/` |
| `slate-archive.svg` | section slate `▮ SIGNAL ARCHIVE · 10 FILES` with a mini test card; PLEASE STAND BY every 18 s | `/en/projects/` |
| `file-01-argus.svg` | signal file 01: Argus | `github.com/Olwtelet/Argus` |
| `file-02-agentforge.svg` | signal file 02: AgentForge | `github.com/Olwtelet/AgentForge` |
| `file-03-resumex.svg` | signal file 03: Resumex | `github.com/Olwtelet/Resumex` |
| `file-04-obsidian-second-brain.svg` | signal file 04: Obsidian Second Brain | `github.com/Olwtelet/Obsidian-Second-Brain` |
| `guide-websites.svg` | programme guide: the six client and personal websites with status and one-liner, one row highlighted at a time; on a phone the one-liner moves to a bar under the list and follows the highlight | `/en/websites/` |
| `slate-certificates.svg` | section slate `▮ CERTIFICATES · 08 FILES` with the issuer tally and the topic line | `/en/certificates/` |
| `now-playing.svg` | playlists deck: SMPTE VU meter and the four playlists switching channel every 4 s | `/en/playlists/` |
| `sign-off.svg` | full SMPTE test card, `END OF TRANSMISSION`, and a CRT power-off/on cycle every 14 s | `/en/` |
| `signal-log.svg` | **not in this folder** — see below | `github.com/Olwtelet?tab=repositories` |

## 4. The signal log

`signal-log.svg` is the only image that changes on its own, so it is **not** committed here. It lives at the
root of the orphan `output` branch and the README loads it from
`raw.githubusercontent.com/Olwtelet/Olwtelet/output/signal-log.svg`.

- **Job:** `.github/workflows/signal-log.yml`, daily at 03:17 UTC, plus **Run workflow** in the Actions tab
  (`force` publishes even when the all-time total dropped by more than 10 %). It also runs on a push that
  touches the job itself, so the first commit that lands this README publishes the image instead of leaving a
  broken one until the first scheduled run.
- **Data:** the public contributions calendar HTML first, GraphQL with `GITHUB_TOKEN` as the fallback; the
  source used is recorded in `signal-log.json`. The HTML source is the primary one so the numbers match the
  calendar visitors see on the profile.
- **Validation before publishing:** per-year day sums equal GitHub's own year totals; dates contiguous from
  2022-01-01 with no gaps or duplicates; the last date is no more than two days old; 53 weeks derived; the
  all-time total is at least 90 % of the last published one. Then the rendered file is linted, checked for
  well-formed XML, for `data-total`, and for 53 trace steps.
- **On failure** the job prints `::warning::signal-log not published: …`, exits 0 and leaves the last good
  file in place — its visible `SYNC` date is what exposes staleness.
- **Stand-by card:** if the `output` branch has never held a good file, the job publishes an ECR test card
  reading `PLEASE STAND BY` / `SIGNAL LOG · NO DATA YET`, with no numbers and no date.
- **Start year:** `signalLog.since` in `tv/content.mjs`, and nowhere else — the job's default `--since`, the
  drawn `SINCE <year>` readout and the alt text under the image all read it, and the job refuses to publish a
  card whose readout disagrees with the year it was given.
- **No current streak.** The readouts are `TOTAL · SINCE 2022`, `LAST 365 DAYS` and `LONGEST STREAK`.
  A current streak reads as a guilt meter and goes stale the first day off; it is deliberately absent.
  This job replaced the two third-party contribution images this profile used to embed, along with the
  daily commits they pushed to `main`.

Locally, without touching the network:

```sh
node tv/jobs/signal-log.mjs --from-json tv/fixtures/days-2026-09-11.json --out dist --prev /dev/null
```

## 5. Design tokens and motion

- **Colours** — `tv/lib/tokens.mjs`. Glass `#060606`, bezel `#354444`/`#1b2525`, text `#a0a0a0`, white
  `#ffffff`, chroma cyan `#02b7b6` / red `#b70202`, REC `#980000`, OG-muted SMPTE bars, rainbow static,
  grain tints. Lint rejects any other chromatic hue, plus gradients, glows and emoji.
- **Type** — VCR OSD Mono only (advance 0.5859375 em, cap height 0.7324 em). Sizes and the per-asset
  minimums live in `TYPE`.
- **Phone tunings** — every image carries both compositions and switches on its own rendered width with an
  in-SVG `@media (max-width: …)`: 672 px for full-width images, 329 px for the 49 % cards, 161 px for the
  24 % keys. Desktop markup sits in `<g class="d">`, phone in `<g class="m">`; phone text is never below
  34 units (≈10 px). The 672 is derived, not chosen: a unit renders at `size × width ÷ viewBox`, so the
  desktop composition's smallest run (18 u, 12.5 px at its design width of 832 px) shrinks with the column
  and reaches 10 px — the smallest type the phone composition ever shows — at 673 px. Below that the phone
  composition is the *larger* of the two, so that is where it takes over. 329 and 161 are 49 % and 24 % of
  672, so every image in a row changes composition at the same browser width instead of one at a time.
- **Motion** — `tv/lib/motion.mjs` holds the named vocabulary (VLINE, GRAIN, BURST, BARS, TYPE, FOCUS,
  RETUNE, TUNER, SLOT/SWITCH, EQ, BEAM, STAND-BY, OFF). Only the hero has an intro; it is settled after
  2.4 s. Everything below is loops of 7–18 s with at most one event per cycle, staggered so neighbouring
  images never fire together.
- **Reduced motion** — the base CSS *is* the settled frame. Every `animation` lives inside
  `@media (prefers-reduced-motion: no-preference)`, followed by
  `@media (prefers-reduced-motion: reduce){.band,.ev{display:none}.grain{opacity:.06}}`. A renderer that
  ignores media queries still shows the complete picture.
- **Flash safety** — no full-frame layer brighter than 0.22 opacity (dimmed bars 0.5, dark-based static
  excepted), white only in thin lines, at most one bright/dark pair per image per 7 s. Measured: peak mean
  relative luminance ≤ 0.12 and frame-to-frame delta ≤ 0.08 on every asset.

## 6. Budgets and lint

`node tv/build.mjs --list` prints bytes against the budget. A file over 150 KB is an error; over its own
budget is a warning. The last row is the one that decides the page: `page total` measures the fifteen
committed images against 282 KB, which is the 330 KB budget for the whole README minus the 48 KB the signal
log is allowed to spend — so the number a visitor pays is accounted for even though that file is built
elsewhere.

Measured on this build: **267 KB committed + 42 KB signal log = 309 KB raw**. Raw serves SVGs gzipped, so a
visitor actually downloads about **115 KB**. With the whole font embedded in each image instead of a
per-asset subset the fifteen would be about 563 KB on their own — subsetting is what buys the budget.

Subsetting has one lever, `--hinting on|off`. Off is the default and is what the committed files are built
with: it drops each glyph's TrueType program (about 70 % of this font's outline table), worth ~16 % of the
page, which is what brings it inside the budget at all. The cost is how Chrome grid-fits the same outlines,
and nothing else: build both ways and the fifteen files are byte-identical outside the embedded font
payload, so every coordinate, line break and advance width is the same and no run moves or re-wraps.
Rendered inside an `<img>` at the width the README gives each image and diffed pixel by pixel, the eleven
images that reproduce frame-to-frame differ on 0.5–5.5 % of their pixels — sub-pixel edges, invisible side
by side. (The other four carry ambient grain that never settles, so their diff measures the grain, not the
hinting.) `--hinting on` restores the programs and then reports thirteen of the fifteen files, and the
page, over budget — truthfully.

Subsetting is gated on a self-test. `tv/lib/font.mjs` embeds subsets only after `tv/lib/woff2.test.mjs`
passes and otherwise keeps the whole font, so a broken decoder costs bytes instead of shipping every image
in a system font. The build runs that gate itself on every run; run it alone after touching
`tv/lib/woff2.mjs`:

```sh
node --test tv/lib/woff2.test.mjs    # decode, subset, encode, round trip — plus the whole font, not just a subset
```

The signal log is rendered by its own job and never by `build.mjs`, so measure that half separately:

```sh
node tv/jobs/signal-log.mjs --from-json tv/fixtures/days-2026-09-11.json --out ../qa/size --prev /dev/null
```

Bytes are not the only budget: the rendered page has a height one too — **≤ 3,050 px in an 880 px column and
≤ 1,950 px at 390 px**, every `<details>` closed. This build measures **3,035 px and 1,931 px**, so there are
about 15 px and 19 px to spare. A seventh website or a fifth playlist can spend that on its own: those
centred link rows wrap, and the six website links already take three lines at 390 px. Two things to know.
The signal log is not optional height — it is 222 px of the 880 px column, and a local preview only ever
gets the broken-image placeholder for it (the file exists only on the `output` branch), which measures the
page about 180 px short. And the lever, when a new row has to be paid for, is
an image's `viewBox` height: the two slates, the deck and the sign-off card were each trimmed by the empty
glass their layouts were not using, and that is where the six website links came from. There is no cheap
slack left: apart from the hero, whose bottom margin is the OG card's own proportion, every image's lowest
ink now sits within about ten units of its bezel.

`tv/lib/lint.mjs` fails the build on: `<script>`, `<foreignObject>`, `<image>`, filters, SMIL, comments,
external `href`/`url()`, malformed markup, duplicate or dangling ids, more than two decimals in geometry,
off-palette colours, text under the minimum for its tuning, any `animation` outside the no-preference block,
a missing reduce block, a scaled element without `transform-box`/`transform-origin`, hero-only (tier A)
motion in another file, and — below the hero — any continuous animation faster than 8 repaints per second.
`tv/lib/text.mjs` throws on overflow and collisions; `tv/lib/glyphs.mjs` throws on a character that is
neither in the font nor one of the eight glyphs drawn as vectors (`▮ ▸ · — – ● ↗ ×`).

## 7. Visual QA

```sh
node tv/build.mjs --contact-sheet ../qa/contact.html   # every image at 880/408/200/356/172/85 px, dark and light
```

Open the contact sheet in a browser: it is the quickest way to see that both tunings are legible and that
every image still reads as a black TV on a white page. Deeper checks (frame-by-frame renders inside `<img>`,
a GitHub-markdown preview of the whole README, flash/CPU/reduced-motion probes) were run from a scratch
toolchain outside this repository; nothing in `tv/` depends on it.

## 8. Credits

- **VCR OSD Mono** by Riciery Leal, distributed as 100 % free. Committed once at `tv/fonts/VCROSDMono.woff2`
  and embedded (subset per image) in every SVG.
- **SMPTE ECR 1-1978** colour bars, castellation and PLUGE, in the muted palette the site itself uses.

## 9. Troubleshooting

| symptom | what it means |
|:--|:--|
| `tv/build: … overflow …` or `… collision …` | new text does not fit its box. Shorten the string in `tv/content.mjs`, or change the layout in the family module named in the message. |
| `U+xxxx … is not in VCR OSD Mono and has no drawn stand-in` | an unsupported character (a bullet, a check mark, an emoji) reached a label. Use one of `▮ ▸ · — – ● ↗ ×` or plain ASCII. |
| `check failed: N difference(s)` | someone edited `tv/` or `tv/content.mjs` without rebuilding. Run `node tv/build.mjs`. |
| `orphan assets/tv/<name>.svg` | a file or a slug was renamed and the old image is still committed. `git rm` it. The build warns about this on the run that causes it, so `--check` should never be the first you hear of it. |
| `font assets/tv/<name>.svg: only the embedded font payload differs` | the same picture with a different font payload: another `--font`/`--hinting`, or a Node whose bundled brotli encoder differs from the one the files were built on. It is a note, not a failure — everything outside the payload matched. Rebuild if you want the bytes refreshed. |
| an over-budget `warn` line in CI | a file (or the `page total`) outgrew its budget. The *TV assets check* job fails on any `warn [budget]` line, because a warning nothing enforces is one everybody learns to scroll past. Shrink the image, or re-baseline `BUDGET` in `tv/lib/tokens.mjs` deliberately. |
| the signal log shows an old `SYNC` date | the daily job has been failing or is disabled. Open the Actions tab, read the newest *Signal log* run, and re-run it. |
| the signal log shows `PLEASE STAND BY` | the `output` branch has never held a valid file. Run the workflow manually once. |
| the *Signal log* workflow stopped running | GitHub disables scheduled workflows after 60 days without repository activity, and a disabled workflow cannot restart itself. Re-enable it from the Actions tab (*Signal log* → **Enable workflow**), then **Run workflow** once. |
| an image is blank on the profile but fine locally | check that the file is committed under `assets/tv/` and that the README points at `assets/tv/<name>.svg` with a percentage `width` and no `height`. |

## 10. Post-merge checklist (owner)

Nothing below was verified from this machine; these are the live checks worth doing once, right after the
commit lands, on the real profile page.

1. **Deploy order** — land the README, the workflows and `assets/tv/` in one commit and push. The push itself
   starts *Signal log* (the workflow watches its own path), so within a minute or two
   `https://raw.githubusercontent.com/Olwtelet/Olwtelet/output/signal-log.svg` should render and the image
   should appear in the README; if it does not, run *Signal log* from the Actions tab (**Run workflow**) as a
   backstop. Nothing here goes through camo: the profile page keeps that absolute raw URL as
   written, and the committed `assets/tv/…` paths become `github.com/Olwtelet/Olwtelet/raw/main/…`, which
   redirects to the same raw host. Raw serves SVGs with `cache-control: max-age=300` under
   `content-security-policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, so a newly published
   signal log can take up to five minutes to replace a cached one, and a hard refresh is the way to tell a
   stale cache from a failed publish.
2. **Fonts** — on desktop Chrome, Firefox and Safari: every image shows the VCR face, including images that
   only scroll into view later. If any image shows a system font instead, say so — the fallback is a glyph
   atlas, and the images are otherwise unchanged.
3. **Phone tunings** — on an iPhone (Safari) and in the GitHub Mobile app: the hero, the 49 % card grid and
   the 24 % keys switch to their phone compositions (bigger type, fewer lines). If they do not, the desktop
   composition still renders — smaller but complete. Worth recording either way. While you are there, try
   tapping the four remote keys: at 24 % of a phone column each key is about 86 × 24 px, which is right on
   the 24 × 24 px minimum for a touch target. If they feel fiddly, change `'24%'` to `'49%'` in the `remote`
   region of `tv/regions.mjs` and rebuild — the keys become a 2 × 2 grid at roughly 175 × 49 px on a phone,
   which also puts them above the 161 px breakpoint, so they draw the desktop composition (a 15 px label
   instead of the phone tuning's 13 px). Nothing in `tv/assets/buttons.mjs` has to change.
4. **Return link** — `◄ RETURN TO CHANNEL 00` at the bottom jumps back to the top (GitHub rewrites the
   anchor to `user-content-top`).
5. **Reduced motion** — with the OS "Reduce motion" setting on, nothing animates and every image shows its
   settled frame.
6. **Structure without headings** — this README deliberately has no markdown headings. A `##` in GitHub's own
   font would cut the picture in half, and the section slates (`▮ SIGNAL ARCHIVE`, `▮ CERTIFICATES`,
   `▮ PLAYLISTS`) are the headings a visitor sees. The cost is that GitHub's outline for this page is empty,
   so the structure a screen reader gets comes from the images' `alt` text — each one names its section and
   its destination — and from the three `<summary>` labels: `FULL RESUME`, `OPEN ALL 10 FILES`,
   `OPEN ALL 08 CERTIFICATES`. Worth one pass with VoiceOver or NVDA to hear that the page still reads in
   order. If it does not, the fix is real headings, not longer alt text.
7. **Both themes** — in light and dark mode each image reads as a black TV; the bezel corners stay
   transparent rather than showing a white or dark square.
8. **Four links only you can decide** — the links in `tv/content.mjs` that could not be settled from this
   machine:
   - **LinkedIn** — the footer and the `LINKEDIN` key use `linkedin.com/in/olwtelet/`, taken from the site.
     Your previous README used `linkedin.com/in/isaac-r-a8a777368/`. LinkedIn answers automated requests with
     a block page, so open the first one while signed out and confirm it is your live vanity URL.
   - **Bluesky** — the footer points at `bsky.app/profile/olwtelet.bsky.social`, which resolves to your
     account. Your **site** links `bsky.app/profile/Olwtelet.dev` in its JSON-LD `sameAs` on every page, and
     that handle does not resolve: `olwtelet.dev` is not a registered domain, so neither handle-verification
     path (a DNS `TXT` record or `/.well-known/atproto-did`) can exist. Either fix the site to the
     `.bsky.social` handle, or register `olwtelet.dev`, set it as your Bluesky handle, and then point both
     the site and `links.bluesky` at it.
   - **Instagram** — `instagram.com/olwtelets` is your account, but it is private: a visitor who is not a
     follower sees the profile header and "This profile is private" and nothing else. Like
     Bluesky it is not a visible link anywhere on the site — it only comes from the JSON-LD `sameAs` list.
     Keep it, or drop the `INSTAGRAM` key from the footer list in `tv/regions.mjs` and rebuild.
   - **Ordfall, twice, two different destinations.** The bio paragraph links `ordfall.vercel.app/en`; signal
     file 10 — its card line and the `OPEN WEBSITE:` row under the guide — links `ordfall.vercel.app/`,
     which answers `307 → /pt`. So in an English README one Ordfall link opens in English and the other in
     Portuguese. The bare root is what your own site links, from its English pages too, so neither is
     "wrong"; they just disagree. Pick one and make both match: set `work[0].url` to `https://ordfall.vercel.app/`
     (and the bio link in `README.md`, which is hand-written) to follow the site, or set file 10's `url` to
     `https://ordfall.vercel.app/en` to keep the whole page in English. Then rebuild.
