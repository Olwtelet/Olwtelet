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
  warning: 'Warning', // generic system words of the hostile interface, drawn in capitals by the kit
  denied: 'Denied',
};

// The only Japanese on the page, each an ordinary dictionary word (checked against JMdict): warning, coming soon (of a film),
// studio, and The End. Drawn in Dela Gothic One; the Floors guard holds their characters to that face.
export const SIGNS = { warning: '警告', soon: '近日公開', studio: 'スタジオ', end: '完' };

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
  tower: 'Isaac Rodrigues. Computer Science student and full-stack developer in Brasília, Brazil, focused on applied AI and cybersecurity. I make games, software and websites at my studio, Olwtelet Productions. Olwtelet is my gaming handle and the name I put on my work. The Olwtelet logo as a tower printed on a yellow opening-credit card: a black slab with OLWTELET knocked out of it, its other faces in teal and indigo dot screens, and ISAAC RODRIGUES set across it in wide black capitals. The black strip down the left edge has one row for each day of the year. Links to the portfolio.',
  shadow: 'Portfolio. The tower\'s black shadow falling down the yellow page, the letters of the name in yellow inside it, growing as they come.',
  email: 'Email: olwtelet@outlook.com.',
  shadow2: 'Portfolio. The letters of the name in the shadow, larger.',
  linkedin: 'LinkedIn.',
  shadow3: 'Portfolio. The letters of the name, larger again.',
  resume: 'Resume.',
  demo: `${OWN_WORDS.demo} Set in wide capitals on a yellow credit card and knocked out across it, yellow where the words cross the tower's black shadow or a black slab and black where they cross the yellow; the shadow ends on the edges of that slab. On the yellow below, the last two words in black, and over them, as a small label on a black slab, the strip's legend: one row is one day, Oct 31, 2025 to Oct 30, 2026; a number is that day's contributions; red is a hold, none that day; 269 in all, longest run 8 days. Links to the portfolio.`,
  hit1: 'Bad data: looking up a night street at the tower, a billboard blown out white high between the buildings showing the tower\'s own mark, its light cyan and mint on the edges that face it, small lights crowded on the far towers, and the tower\'s LED sign lit with the letters of its name in the wrong order, flagged with a red plate: wrong order. Links to projects.',
  hit2: 'Unexpected use: the tower upside down and tipped far over, one huge dark shape hanging into a lavender field from under the words, its name across it reading upside down and its slit burning white, a slit of white light under its point catching its edges, lens streaks running in at it, and a cyan note: this way up. Links to projects.',
  hit3: 'Someone trying to break in: from the floor at the tower\'s foot in a hall flooded red, its two plates stand as a dark red wall on a glowing hot pink floor, pale shafts of light and a few small green lights behind it; its slit is cracked open from the floor up, filled with static, pouring pale light across a cracked floor and biting a letter on each line of the words, a dark wedge driven into its head. Links to the portfolio.',
  hold: 'With AI, I use only what I can test, observe and constrain. The rule printed on a lit roadside billboard with a green OK screen, raised on posts and seen from low on the road with the camera tilted, so the board plunges toward the lower right; the low sun beyond it catches only the yellow lip along its top and throws its shadow down the road. Behind it an elevated road crosses tower blocks with rows of windows, water tanks and cables, and the tower rises out of the bottom of the frame as one dark silhouette half covering a white sun, its edges rimmed in cream. Links to the portfolio.',
  security: 'Security. Freelance cybersecurity analyst at Ordfall: I analyze vulnerabilities and review code, dependencies and configurations. The tower seen close from its foot, a dark silhouette against a red city that steps lighter toward the street, its edges rimmed pink by a red warning beacon haloed in light in the sky above it and pale where they face its slit, red light shafts falling past it. One large lock-on mark holds the slit, which burns white and throws sparks, with static where it is torn open, and a large plate reading DENIED is stamped across the edge of the lock, on the attack. On the right, translucent red warning panels in thin red line, each with a warning triangle, name what the review checks: a large panel for vulnerabilities, flagged WARNING, and smaller ones layered below it for code, dependencies and configurations. A last panel at the lower left holds the role in cyan under a cyan bar that marks the review complete. Links to the resume.',
  productions: 'Olwtelet Productions, my studio for games, software and websites. Veil, a chess-like strategy game that runs in the browser, is in development: the words COMING SOON as a game level on a yellow card, a teal halftone panel behind SOON, the tower hopping across the letters, a trail of blue to green afterimages behind its last jump, and the last letter lighting pink as it lands; a teal band cuts across the foot of the words, and a tag: Veil is coming. Links to the portfolio.',
  diseens: 'Diseens, an academic passport platform from Olwtelet Productions. In development. On an indigo card, the name runs into a close-up of an open passport printed in blues and dot screens, with the tower as its photo, and a pink stamp slammed onto its visa page says COMING SOON in English and Japanese, tagged: first stamp. Links to the portfolio.',
  brain: 'Obsidian Second Brain. A public study vault: CS fundamentals, code snippets and daily logs, all cross-linked, drawn as three dark words flying out of a white-hot core on streaks of light, small near the core and large as they reach the edge, the light spraying one way in a fan of green rays, torn white shards breaking off round the core, and the name on a dark slab tilted into the burst. Work in progress. Links to the repository.',
  study: 'Independent coursework through MIT OpenCourseWare, 2024 to 2026: index cards numbered 6.0001, 6.006, 6.033, 6.036 and 6.867 pinned on the wall of a dim teal classroom seen from a low seat, cream where the light of a tall side window falls and teal in the shade, over the board where the coursework is chalked, the chalk bright where the light crosses it, the nearest desk dark in the foreground. Core stack: TypeScript, Python, React, Next.js, Node.js, FastAPI. Certificates: 4 Google, 3 Anthropic, 1 Udemy. Portuguese native, English advanced. Links to the resume.',
  wallLead: 'End credits as printed title cards. Directed by Isaac Rodrigues, in lemon on a black slab across an indigo field, beside a teal dot screen. Links to the portfolio.',
  lightsEmail: 'Email: olwtelet@outlook.com. The studio\'s street at night, seen from the wet pavement: a cyan tube sign reading EMAIL on its top floor, a pink one reading studio in Japanese on a blade, and over the roofs the tower with its lights off, only its slit still lit.',
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
