# film

The generator behind this profile's README. It draws one continuous picture, cuts it into 33 linked SVG tiles in
`assets/film/`, and writes `README.md` with the same page as plain text under the art. This file is not shown on the profile.

## Rebuild

    node film/build.mjs           # writes README.md and assets/film/*.svg
    node film/build.mjs --check   # builds twice, compares with disk, runs the guards, writes nothing

Node 24, no dependencies, no clock. `README.md` and the SVGs are output: change the source and rebuild. CI runs the check
on every change (`.github/workflows/film-check.yml`).

## Where the copy lives

`film/content.mjs` holds every fact, link, sentence, note and alt text, and the plain text. Drawing code holds none. Rows,
tiles and byte budgets are in `film/layout.mjs`, the film's timing in `film/score.mjs`, the drawings in `film/sections/`.

## Refreshing the year

The strip is a frozen snapshot in `film/data/year.json`, 365 rows from the public contribution calendar. No job updates it,
and the page prints its window, so it stays true as it gets old. To move the window, by hand:

1. Run `node film/dev/pull-year.mjs <from> <to>` with a 365-day window. It prints the new total and longest run.
2. Put the new dates and numbers in `film/content.mjs` (`legendFull`, `legendPhone`, `stripEnd`, `ALT.demo`, the strip
   paragraph of `PLAIN`). The Strip guard reads them back from the data, and the check fails until they agree.
3. Run `node film/build.mjs`, then `--check`, and look at the whole page. A tile the strip's digits push over its line in
   `BUDGET` (`film/layout.mjs`) gets measured size plus 6 percent.

The sections hang from the June and September rows, so they move with the window. The tile above June (`c1-hold`) has only
8 rows of slack. Past that the check fails and `film/layout.mjs` has to be cut again by hand. A yearly refresh needs that work.

## Fonts and browser checks

No font file ships. `film/data/glyphs.json` caches the outlines, and `film/data/FONT-LICENSES.md` has both licences and
sources. If a character changes, run `film/dev/make-glyphs.mjs`, then rebuild. It also holds the two hand digits redrawn from the font. The render, seam, flash and live-page checks
in `film/dev/` are not used by CI and need Playwright from outside the repo:
`FILM_TOOLS=<folder with node_modules> node film/dev/preview.mjs .`. The first lines of each file give its usage.
