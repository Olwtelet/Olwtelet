# film

The generator behind this profile's README. It draws one continuous picture, cuts it into 29 linked SVG tiles in
`assets/film/`, and writes `README.md` with the same page as plain text under the art. This file is not shown on the profile.

## Rebuild

    node film/build.mjs           # writes README.md and assets/film/*.svg
    node film/build.mjs --check   # builds twice, compares with disk, runs the guards, writes nothing

Node 24, no dependencies, no clock. `README.md` and the SVGs are output: change the source and rebuild. CI runs the check
on every change (`.github/workflows/film-check.yml`).

## The look

The page is cut like an animated episode with an opening title sequence. It opens cold on a dark street at night, the owner's
logo streaks in as two flat afterimages, a printed tower snaps in, an impact frame lands, and the frame becomes a title card.
From there it alternates two kinds of picture:

- **Cards**, for who the owner is and what they make: a flat lemon or indigo field, pure black slabs, the widest and heaviest
  capitals set at a slant and knocked out wherever they cross the black, dot screens in teal and indigo that grow toward the
  light, a hot pink plate printed a little off register under the shapes, and in the opening one torn pink smear over a cyan
  plate.
- **Scenes**, for what the owner argues and does: each washed in the one hue its meaning calls for (navy night, a violet daze,
  the red of an attack, aqua daylight, a red hostile interface, a network green, an institution teal). Darks are always
  coloured, never black. Light is drawn as flat rim bands of a pure hue inside an edge, with one spike and a thin halo outside,
  and as small sources that blow out to a tinted core: LED dots, tube and box signs, windows lit in runs, lamps.

It ends back at night, the tower with its lights off and its links lit as shop signs. Static appears in one place only:
where something is under attack. Nothing on the page is a figure or a photograph: every picture is built from the
owner's logo, geometric blocks and their own words.

Everything is drawn with polygons, `<use>`, patterns and clip paths. There is no gradient, filter, mask or blend mode: a glow
is a few wide translucent strokes of the light's own colour, a sky is hard bands, a tone ramp is a dot screen.

**Palette.** Every colour is a key of `C` in `film/kit/draw.mjs`, grouped by the family that owns it: the card colours (lemon,
black, pink, cyan, teal, indigo, azure, white), the night, the afterimages, the impact, the two reds, static, violet, day,
network green and institution teal. Lemon is the only yellow. Pure black belongs to the cards and the strip.

**Faces.** Archivo at three widths (`wide` for display capitals, `label` for small print on cards, `cond` for the strip),
Rajdhani (`ui`, the interface inside scenes), DotGothic16 (`led`, LED words) and Dela Gothic One (`jp`, four Japanese words
listed in `SIGNS`). Lines that need geometry (perspective, a forced measure, the tops the tower stands on) use the same Archivo
capitals as polygons, the cut letters of `film/kit/letters.mjs`.

**Kit.** `film/kit/print.mjs` holds the card grammar (screens, plates, smears, slabs, knockouts, words set into planes),
`film/kit/light.mjs` the scene grammar (the night camera, the tower as a solid, rims, glow, lamps, skies, windows, signs, LED
letters, the impact's bolts, static), `film/kit/ui.mjs` the interface (warning triangles, lock-ons and leaders, plates, scan
sheets, a full bar, a badge, an arrow). Sections call the kit and never write a colour, an opacity or a time themselves.

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
black band in `film/sections/demo.mjs` sits on the strip's February rule. After a refresh nothing breaks, but the two stop
meeting.

## Fonts and browser checks

No font file ships. `film/data/glyphs.json` caches the outlines of the characters the page draws, `film/data/cut.json` the cut
letters, and `film/data/FONT-LICENSES.md` has the four licences and sources. If a character changes, run
`FILM_TOOLS=<folder with node_modules/fontkit> FILM_FONTS=<folder with the .ttf files> node film/dev/make-glyphs.mjs` (and
`film/dev/make-cut.mjs` for the cut letters), then rebuild. Neither downloads anything. The render, seam, flash and live-page
checks in `film/dev/` are not used by CI and need Playwright from outside the repo:
`FILM_TOOLS=<folder with node_modules> node film/dev/preview.mjs .`. The first lines of each file give its usage.
