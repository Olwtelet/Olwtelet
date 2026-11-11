# film

The generator behind this profile's README. It draws one continuous picture, cuts it into 29 linked SVG tiles in
`assets/film/`, and writes `README.md` with the same page as plain text under the art. This file is not shown on the profile.

## Rebuild

    node film/build.mjs           # writes README.md and assets/film/*.svg
    node film/build.mjs --check   # builds twice, compares with disk, runs the guards, writes nothing

Node 24, no dependencies, no clock. `README.md` and the SVGs are output: change the source and rebuild. CI runs the check
on every change (`.github/workflows/film-check.yml`).

## Where the copy lives

`film/content.mjs` holds every fact, link, sentence, note and alt text, and the plain text. Drawing code holds none. Rows,
tiles and byte budgets are in `film/layout.mjs`, the film's timing in `film/score.mjs`, the drawings in `film/sections/`. The
tower's run and the stamp, which one list has to give to both a drawing and the score, are in `film/kit/route.mjs`.

## Refreshing the year

The strip is a frozen snapshot in `film/data/year.json`, 365 rows from the public contribution calendar. No job updates it,
and the page prints its window, so it stays true as it gets old. To move the window, by hand:

1. Run `node film/dev/pull-year.mjs <from> <to>` with a 365-day window. It prints the new total and longest run.
2. Put the new dates and numbers in `film/content.mjs` (`legendFull`, `legendPhone`, `stripEnd`, `ALT.demo`, the strip
   paragraph of `PLAIN`). The Strip guard reads them back from the data, and the check fails until they agree.
3. Run `node film/build.mjs`, then `--check`, and look at the whole page. A tile the strip's digits push over its line in
   `BUDGET` (`film/layout.mjs`) gets measured size plus 6 percent.

Nothing on the page hangs from a date: the rows are fixed in `film/layout.mjs`, and a refresh changes only what the strip prints.
The strip's length does not change either, so where it stops stays where it was looked at. One thing is lined up by eye: the
ink edge in `film/sections/demo.mjs` sits on the strip's February rule. After a refresh nothing breaks, but the two stop meeting.

## Fonts and browser checks

No font file ships. `film/data/glyphs.json` caches the outlines, and `film/data/FONT-LICENSES.md` has both licences and
sources. If a character changes, run `film/dev/make-glyphs.mjs`, then rebuild. It also holds the two hand digits redrawn from the font. The render, seam, flash and live-page checks
in `film/dev/` are not used by CI and need Playwright from outside the repo:
`FILM_TOOLS=<folder with node_modules> node film/dev/preview.mjs .`. The first lines of each file give its usage.
