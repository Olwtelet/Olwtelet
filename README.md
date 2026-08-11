<!--
  ══════════════════════════════════════════════════════════════════
  OLWTELET — profile README · broadcast control-room theme
  Sections are numbered as channels. Local assets in assets/
  (see assets/README.md for maintenance). No JS, no external stats
  services — the only remote image is the contribution snake, which
  this repo's own workflow generates.
  ══════════════════════════════════════════════════════════════════
-->

<!-- ═══ HERO ═══ -->

<div align="center">

<img src="assets/header.svg" width="100%" alt="Broadcast control room: SMPTE color bars, a terminal boot sequence identifying Isaac Rodrigues Barros — computer science student working on AI, automation and full-stack web from Brasília, Brazil — VU meters, and a red ON AIR light. Station ID: OLWTELET." />

<sub><code>░▒▓ LIVE FEED · CH 001 · SIGNAL ORIGIN: BRASÍLIA, BR ▓▒░</code></sub>

<br><br>

<a href="https://olwtelet.vercel.app"><kbd> ▶ PORTFOLIO </kbd></a>&ensp;<a href="https://www.linkedin.com/in/isaac-r-a8a777368/"><kbd> LINKEDIN </kbd></a>&ensp;<a href="mailto:olwtelet@outlook.com"><kbd> ✉ EMAIL </kbd></a>

</div>

<img src="assets/signal-divider.svg" width="100%" alt="" />

<!-- ═══ IDENTITY ═══ -->

## `100` ▸ IDENTITY

```text
CALL SIGN   OLWTELET — Isaac Rodrigues Barros
PROGRAM     Computer Science student
BROADCAST   agent tooling · geospatial systems · automation pipelines ·
            full-stack web, deployed for real clients
UPLINK      Brasília, Brazil
```

I'm drawn to the part of software that starts after the demo works: architecture, tests, maintainability. The open-source repos below are where I take systems apart to learn how they hold together; the client sites are where that work has to survive contact with real users.

<!-- ═══ FEATURED PROJECTS ═══ -->

## `200` ▸ MISSION LOG

### `FEED A` — open source

#### `CH 201` · [ARGUS](https://github.com/Olwtelet/Argus)

<sub><code>Python · FastAPI · Next.js · React · MapLibre GL · Tauri · Rust · AGPL-3.0</code></sub>

**Objective** — watch what's happening across the planet without routing the question through anyone else's cloud.<br>
**Build** — a self-hosted geospatial intelligence platform that pulls aircraft, vessel, satellite, seismic, weather and news feeds into a single live map. A FastAPI backend normalizes every source, a Next.js and MapLibre GL front end renders them as toggleable layers, Tauri packages the whole thing as a desktop app, and an encrypted peer-to-peer mesh lets instances sync directly with each other. Nothing leaves the machine except the requests to each configured source.

#### `CH 202` · [AURORACORE](https://github.com/Olwtelet/AuroraCore)

<sub><code>Rust · Bazel · MCP · Agent Client Protocol · Apache-2.0</code></sub>

**Objective** — pull frontier-agent behavior out of models that cost a fraction of frontier prices.<br>
**Build** — a coding agent in Rust, forked from OpenAI's Codex and rebuilt around the harness that low-cost models actually respond to. Providers and harnesses swap mid-session from the TUI, commands run inside OS-native sandboxes on macOS, Linux and Windows, and portability comes from shared standards — `AGENTS.md`, MCP, the Agent Client Protocol — rather than lock-in to any one vendor.

#### `CH 203` · [AGENTFORGE](https://github.com/Olwtelet/AgentForge)

<sub><code>Python · LangGraph · CrewAI · AutoGen · Pydantic-AI · Streamlit</code></sub>

**Objective** — answer "which agent framework should I use?" with measurements instead of opinions.<br>
**Build** — ten frameworks implemented side by side behind one standardized interface, then benchmarked on latency, token cost and tool efficiency. A Streamlit dashboard runs them head to head, so the trade-offs show up as numbers rather than as claims from each project's README.

#### `CH 204` · [RESUMEX](https://github.com/Olwtelet/Resumex)

<sub><code>Python · PRAW · Selenium · MoviePy · OpenCV · gTTS</code></sub>

**Objective** — take a Reddit thread all the way to a published Short with nobody in the edit bay.<br>
**Build** — a single pipeline that scrapes posts, scores them for viral potential, writes the script, generates TTS narration, composites vertical video over gameplay footage, and uploads straight to YouTube. Subreddits, voices and pacing are configurable, so the same pipeline drives different channels.

<sub>Also transmitting: [Obsidian-Second-Brain](https://github.com/Olwtelet/Obsidian-Second-Brain) — public vault of CS notes, cheatsheets and study logs, wired together with Zettelkasten and PARA · [Portfolio-V1](https://github.com/Olwtelet/Portfolio-V1) — the React and TypeScript build behind [olwtelet.vercel.app](https://olwtelet.vercel.app).</sub>

### `FEED B` — shipped for clients

| `CH` | `PROGRAM` | `TRANSMISSION` |
|:--:|:--|:--|
| `211` | **[Integratek](https://www.integratek.com.br/)** | Business site for a Brasília IT infrastructure company covering networking, security systems, custom builds and web work. Service pages, FAQs and a blog sit alongside quote forms that hand off directly to WhatsApp, where the client's leads already are.<br><sub><code>Astro · Tailwind CSS</code></sub> |
| `212` | **[Rocha & Sá](https://rochaesa.vercel.app/)** | Website for a two-partner law firm practising across six areas, from corporate and labor to family and consumer law. Built for the speed and SEO that decide whether a small firm is found at all, with an articles section the partners can keep publishing into.<br><sub><code>Astro · Tailwind CSS</code></sub> |
| `213` | **[Instituto Politécnico do Brasil](https://instituto-politecnico-do-brasil.vercel.app)** | Institutional site for a nonprofit running free education, sport and civic programs since 2006. Structured so its projects, testimonials and contact routes stay legible to donors, partners and the families it serves alike. |
| `214` | **[CT Thalita Rodrigues](https://thalitacademy.vercel.app/)** | Site for a tennis and beach tennis training centre in Águas Claras, founded by a Para-Standing Tennis world champion. Carries class programs by skill level, the internal tournament circuit with rankings and regulations, instructional articles and video, plus free trial-lesson booking. |

### `FEED C` — side band

#### [FILMES HD ONLINE GRÁTIS](https://filmeshdonlinegratis.vercel.app/) &nbsp;·&nbsp; <sub><code>Astro</code></sub>

One curated feature every Saturday at 20:30, picked by people who actually watched it rather than by what's trending, with watch-alongs coordinated on Discord. Schedule, rankings, dossiers and RSS — and its own station identity, broadcasting at `87.6 MHz` two notches down the dial from this one.

<sub>Full schedule → [all repositories](https://github.com/Olwtelet?tab=repositories)</sub>

<!-- ═══ STACK ═══ -->

## `300` ▸ FREQUENCIES

```text
BAND         CARRIER SIGNAL                               STATUS
───────────  ───────────────────────────────────────────  ────────
LANGUAGES    Python · TypeScript · JavaScript · SQL       ● ON AIR
FRONTEND     React · Next.js · Astro · Tailwind · Vite    ● ON AIR
BACKEND      Node.js · Express · FastAPI                  ● ON AIR
AI / DATA    NumPy · OpenCV · MoviePy · Selenium · PRAW   ● ON AIR
AI AGENTS    LangGraph · CrewAI · AutoGen · Pydantic-AI   ◌ TUNING
SYSTEMS      Rust · Tauri · MapLibre GL                   ◌ TUNING
INFRA        Docker · Google Cloud · GH Actions · Vercel  ◌ TUNING
TOOLING      Git · Vitest · ESLint · Prettier             ● ON AIR
```

<sub><code>● ON AIR</code> — in regular use&ensp;·&ensp;<code>◌ TUNING</code> — actively learning</sub>

<!-- ═══ STATS ═══ -->

## `400` ▸ TELEMETRY

<div align="center">

<img src="profile/streak.svg" alt="GitHub contribution panel: total contributions, current streak, and longest streak" />

<br><br>

<img src="https://raw.githubusercontent.com/Olwtelet/Olwtelet/output/github-contribution-grid-snake.svg" alt="Animated snake tracing a path through this year's GitHub contribution graph" />

</div>

<!-- ═══ CONTACT ═══ -->

## `500` ▸ OPEN CHANNEL

The fastest frequencies to reach me:

<a href="mailto:olwtelet@outlook.com"><kbd> ✉ olwtelet@outlook.com </kbd></a>&ensp;<a href="https://www.linkedin.com/in/isaac-r-a8a777368/"><kbd> LINKEDIN </kbd></a>&ensp;<a href="https://olwtelet.vercel.app"><kbd> PORTFOLIO </kbd></a>&ensp;<a href="https://x.com/Olwtelet"><kbd> X </kbd></a>&ensp;<a href="https://www.instagram.com/olwtelets"><kbd> INSTAGRAM </kbd></a>

<!-- ═══ FOOTER ═══ -->

<img src="assets/signal-divider.svg" width="100%" alt="" />

<div align="center">

<sub><code>█▓▒░ END OF TRANSMISSION ░▒▓█</code></sub>
<br>
<sub><code>SIGNAL MAINTAINED FROM BRASÍLIA, BR · OLW-TV</code></sub>

</div>

<!-- You're reading the raw feed. The carrier never really drops. — O. -->
