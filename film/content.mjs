// Every fact, link and sentence on the page lives here. Nothing in a drawing module may contain copy.
export const L = {
  portfolio: 'https://olwtelet.vercel.app/en/',
  resume: 'https://olwtelet.vercel.app/en/resume/',
  email: 'mailto:olwtelet@outlook.com',
  linkedin: 'https://www.linkedin.com/in/olwtelet/',
  github: 'https://github.com/Olwtelet',
  konect: 'https://konect.gg/olwtelet',
  orcid: 'https://orcid.org/0009-0008-2485-7398',
  projects: 'https://olwtelet.vercel.app/en/projects/',
  certificates: 'https://olwtelet.vercel.app/en/certificates/',
  filmes: 'https://filmeshdonlinegratis.vercel.app/',
  brain: 'https://github.com/Olwtelet/Obsidian-Second-Brain',
};

export const COPY = {
  name: 'Isaac Rodrigues',
  who: ['Computer Science student and full-stack', 'developer in Brasília, Brazil, focused', 'on applied AI and cybersecurity.', 'I make games, software and websites', 'at my studio, Olwtelet', 'Productions.'],
  whoPhone: ['CS student and full-stack', 'developer in Brasília,', 'Brazil. Applied AI and', 'cybersecurity.'],
  handle: ['Olwtelet is my gaming handle', 'and the name I put on my work.'],
  whoPhone2: ['My studio is', 'Olwtelet', 'Productions.'],
  legendTop: 'one row, one day',
  legendFull: ['One row is one day, Oct 31, 2025', 'to Oct 30, 2026. A number is that', 'day\'s contributions. Red is a hold:', 'none that day. 269 in all, longest', 'run 8 days.'],
  legendPhone: ['One row, one day.', '269 contributions', 'to Oct 30, 2026.'],
  demoA: 'A demo proves',
  demoB: 'that software',
  demoC: 'works once.',
  careA: 'What I care about is whether',
  careB: 'it keeps working with',
  hit1: ['Bad', 'data,'],
  hit2: ['Unexpected', 'use'],
  hit3: ['and someone trying', 'to break in.'],
  noteWrong: 'wrong order',
  noteUp: 'this way up',
  ok: 'OK',
  withAI: ['With AI, I use only', 'what I can test, observe', 'and constrain.'],
  securityRole: ['Freelance cybersecurity', 'analyst at Ordfall.'],
  securityBody: ['I analyze vulnerabilities and review', 'code, dependencies and configurations.'],
  securityPhone: ['Freelance', 'cybersecurity analyst', 'at Ordfall.'],
  review: ['vulnerabilities', 'dependencies', 'code', 'configurations'],
  productionsLead: 'Games, software and websites.',
  noteGame: ['Veil is', 'coming'], // no wider than the old note: the tower's hop passes just left of it
  diseensLead: 'An academic passport platform.',
  passportHead: 'Academic passport',
  passportMrz: 'P<DISEENS<<COMING<SOON<<<<<<<<',
  noteStamp: 'first stamp',
  brainTitle: 'Obsidian Second Brain',
  brainNotes: ['CS fundamentals', 'code snippets', 'daily logs'],
  brainPhone: ['A public study vault,', 'all cross-linked.'],
  studyTitle: 'MIT OpenCourseWare',
  studyNumbers: ['6.0001', '6.006', '6.033', '6.036', '6.867'],
  studyWhen: 'Independent coursework, 2024 to 2026.',
  studyBody: ['TypeScript, Python, React, Next.js, Node.js, FastAPI.', 'Certificates: 4 Google, 3 Anthropic, 1 Udemy.', 'Portuguese native, English advanced.'],
  studyPhone: ['TypeScript, Python,', 'React, Next.js,', 'Node.js, FastAPI.'],
  wallLead: 'Directed by Isaac Rodrigues.',
  stripEnd: 'Oct 30, 2026',
  emailAddress: 'olwtelet@outlook.com',

  // Everything below is drawn rather than written: names in cut letters, targets, marks. A section may not hold a readable string.
  towerName: 'OLWTELET',
  wrongLetters: 'TLOEWTLE',
  chartThrees: 'on threes',
  chartName: 'name',
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  words: { email: 'Email', linkedin: 'LinkedIn', resume: 'Resume', portfolio: 'Portfolio', projects: 'Projects', konect: 'Konect', orcid: 'Orcid' },
  securityTitle: 'Security',
  productionsTitle: ['Olwtelet', 'Productions'],
  diseensTitle: 'Diseens',
  soon: ['Coming', 'soon'],
  brainTarget: 'Olwtelet/Obsidian-Second-Brain',
  studyTitlePhone: 'Independent: MIT OCW',
};

// The credits: one array entry is one course of the wall. Adding a project is adding a line here. A name with no site of its own says in `goes` where its alt leads.
export const WALL = [
  { name: 'Olwtelet Productions', slug: 'productions', cap: 'My studio for games, software and websites.', capPhone: 'Games, software, websites.', goes: 'Links to the portfolio.', href: L.portfolio },
  { name: 'Veil', slug: 'veil', cap: 'A chess-like strategy game for the browser. In development.', capPhone: 'Strategy game. In development.', goes: 'Links to the portfolio.', href: L.portfolio },
  { name: 'Diseens', slug: 'diseens', cap: 'Academic passport platform. In development.', capPhone: 'Academic passport.', goes: 'Links to the portfolio.', href: L.portfolio },
  { name: 'Filmes HD Online Grátis', slug: 'filmes', cap: 'Film curation. Screenings live on Discord, no films hosted.', capPhone: 'Film curation site.', href: L.filmes },
];

// Two sentences, word for word from the owner's portfolio. Compared by code in the guards.
export const OWN_WORDS = {
  demo: 'A demo proves that software works once. What I care about is whether it keeps working with bad data, unexpected use and someone trying to break in.',
  ai: 'With AI, I use only what I can test, observe and constrain.',
};

// Read aloud in order, as a list of links: what it is first, then one short clause of the drawing, then where it goes.
export const ALT = {
  tower: 'Isaac Rodrigues. Computer Science student and full-stack developer in Brasília, Brazil, focused on applied AI and cybersecurity. I make games, software and websites at my studio, Olwtelet Productions. Olwtelet is my gaming handle and the name I put on my work. The Olwtelet logo drawn as a tower seen from the street, half painted, with the name OLWTELET cut through it and yellow-green light coming through the letters. The black strip down the left edge has one row for each day of the year. Links to the portfolio.',
  shadow: 'Portfolio. The tower\'s shadow falling down the page, the letters of the name in light, growing as they come.',
  email: 'Email: olwtelet@outlook.com.',
  shadow2: 'Portfolio. The letters of the name, larger.',
  linkedin: 'LinkedIn.',
  shadow3: 'Portfolio. The letters of the name, larger again.',
  resume: 'Resume.',
  demo: `${OWN_WORDS.demo} Beside it, the strip's legend: one row is one day, Oct 31, 2025 to Oct 30, 2026; a number is that day's contributions; red is a hold, none that day; 269 in all, longest run 8 days. Links to the portfolio.`,
  hit1: 'Bad data: the tower on a red field with the letters of its name in the wrong order, ringed in pencil. Links to projects.',
  hit2: 'Unexpected use: the tower standing on its head on a blue field, with the note: this way up. Links to projects.',
  hit3: 'Someone trying to break in: a crack shaped like the logo\'s slit splits the words, and a red wedge driven into it splinters the blue. Links to the portfolio.',
  hold: 'With AI, I use only what I can test, observe and constrain. The tower again, in pencil, on empty paper, marked OK in red. Three holes are punched through the sheet. Links to the portfolio.',
  security: 'Security. Freelance cybersecurity analyst at Ordfall: I analyze vulnerabilities and review code, dependencies and configurations. The tower in pencil on a yellow-green correction sheet, with heavy red rings on vulnerabilities, dependencies, code and configurations. Links to the resume.',
  productions: 'Olwtelet Productions, my studio for games, software and websites. Veil, a chess-like strategy game that runs in the browser, is in development: the words COMING SOON drawn in pencil as a game level, with the tower jumping across the letters and a pencil note: Veil is coming. Links to the portfolio.',
  diseens: 'Diseens, an academic passport platform from Olwtelet Productions. In development. An open passport with the tower as its photo and one blue stamp that says COMING SOON, noted in pencil: first stamp. Links to the portfolio.',
  brain: 'Obsidian Second Brain. A public study vault: CS fundamentals, code snippets and daily logs, all cross-linked, drawn as three pegged sheets joined by red pencil links. Work in progress. Links to the repository.',
  study: 'Independent coursework through MIT OpenCourseWare, 2024 to 2026: five sheets fanned up out of the ink, numbered in pencil 6.0001, 6.006, 6.033, 6.036 and 6.867. Core stack: TypeScript, Python, React, Next.js, Node.js, FastAPI. Certificates: 4 Google, 3 Anthropic, 1 Udemy. Portuguese native, English advanced. Links to the resume.',
  wallLead: 'End credits on black. Directed by Isaac Rodrigues. Links to the portfolio.',
  lightsEmail: 'Email: olwtelet@outlook.com. The tower with its lights off, only its slit still lit.',
  portfolio: 'Portfolio',
  resumeLink: 'Resume',
  linkedinLink: 'LinkedIn',
  projects: 'Projects',
  konect: 'Konect, gaming profile',
  orcid: 'ORCID',
};

// The first line of README.md. The sanitizer strips it, so it adds nothing above the art.
export const NOTICE = '<!-- Generated by node film/build.mjs from film/content.mjs. Do not edit by hand. -->';

// The real text under the art: one line of links, then the whole page in a disclosure.
export const PLAIN = `Isaac Rodrigues. [Portfolio](${L.portfolio}), [resume](${L.resume}), [${COPY.emailAddress}](${L.email}).

<details>
<summary>The same page, as plain text</summary>

**Isaac Rodrigues.** Computer Science student and full-stack developer in Brasília, Brazil, focused on applied AI and cybersecurity. I make games, software and websites at my studio, Olwtelet Productions. Olwtelet is my gaming handle and the name I put on my work.

${OWN_WORDS.demo}

${OWN_WORDS.ai}

**Security.** Freelance cybersecurity analyst at Ordfall: I analyze vulnerabilities and review code, dependencies and configurations.

**Olwtelet Productions.** My studio for games, software and websites. Live: [Filmes HD Online Grátis](${L.filmes}), a film curation site; screenings happen live on Discord, and the site hosts no films. In development: Veil, a chess-like strategy game that runs in the browser, and Diseens, an academic passport platform.

**Open source.** [Obsidian Second Brain](${L.brain}): a public study vault of CS fundamentals, code snippets and daily logs, all cross-linked. Work in progress.

**Stack and study.** TypeScript, Python, React, Next.js, Node.js, FastAPI. Independent CS coursework through MIT OpenCourseWare: 6.0001, 6.006, 6.033, 6.036, 6.867 (2024 to 2026). [Certificates](${L.certificates}): Google (Linux and SQL; Networks and Network Security; Manage Security Risks; Foundations of Cybersecurity), Anthropic (Claude with Vertex AI; Claude with Amazon Bedrock; Building with the Claude API), Udemy (Algoritmos e Lógica de Programação). Portuguese (native), English (advanced).

**Elsewhere.** [LinkedIn](${L.linkedin}), [GitHub](${L.github}), [Konect](${L.konect}), [ORCID](${L.orcid}), [projects](${L.projects}).

**The strip.** The black strip down the left edge of the art has one row for each day from October 31, 2025 to October 30, 2026. A number is that day's contributions on GitHub; a red line is a day without any. 269 in all, longest run 8 days.

</details>
`;
