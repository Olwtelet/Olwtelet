# Assets

Maintenance notes for the profile README.

## Files

| File | Purpose |
|:--|:--|
| `header.svg` | Hero: SMPTE bars, one-shot terminal boot sequence (~4 s, SMIL clip-path wipes), VU meters, blinking ON AIR/REC, station ID, scrolling waveform. Edit the `<text>`/`<tspan>` elements to change the boot lines or name — keep each line under ~55 characters so the clip reveal covers it. No JS. |
| `signal-divider.svg` | Thin decorative scrolling waveform used between sections. Transparent background, safe on light and dark themes. Referenced with empty `alt=""`. |
| `../profile/streak.svg` | Auto-generated daily by `.github/workflows/streak.yml` — do not edit by hand. |

## Palette (SMPTE 75%)

`#C0C0C0` white · `#C0C000` yellow · `#00C0C0` cyan · `#00C000` green · `#C000C0` magenta · `#C00000` red · `#0000C0` blue · `#050505`/`#0A0A0A` background

## External resources used by the README

- Contribution snake: `raw.githubusercontent.com/Olwtelet/Olwtelet/output/…` — generated daily by `.github/workflows/snake.yml` into the `output` branch.
- Everything else is local. No third-party stat cards, counters, or typing services.

## Checking links

Open the README on GitHub and click through, or run a link checker such as `lychee README.md`.
