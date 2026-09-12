// The single content source of the profile README and every generated image.
// Every value is copied verbatim from the live English site (olwtelet.vercel.app/en/, its resume, project
// files, certificates and playlists pages). Visitor text is English; Portuguese proper nouns stay as names.
// Counts are derived (see `count`), never typed. After editing: `node tv/build.mjs` then `node tv/build.mjs --check`.
import { deepFreeze } from './lib/tokens.mjs';

const site = 'https://olwtelet.vercel.app';

export default deepFreeze({
  site,

  identity: {
    handle: 'OLWTELET',
    short: 'OLW',
    name: 'Isaac Rodrigues',
    role: 'Full-Stack Developer',
    receiving: 'Full-Stack Developer focused on applied AI and cybersecurity', // home header "NOW RECEIVING" line
    student: 'Computer Science student',
    tagline: 'APPLIED AI / WEB / AUTOMATION / SECURITY', // OG home card strip
    city: 'Brasília, Brazil',
  },

  // Home bio, one string per sentence. Sentence 6 ("Tune in, explore my work…") is deliberately omitted:
  // on GitHub its calls to action are the remote keys and the footer links.
  bio: {
    lead: [
      "Hi! I'm Isaac Rodrigues, a Computer Science student and full-stack developer based in Brasília, Brazil.",
      'I build web products, automation tools, and applied AI experiments — from client-facing platforms to RAG pipelines and agent-based systems.',
      'These days I also work on cybersecurity at Ordfall, treating security as part of the architecture rather than the last step.',
    ],
    more: [
      'I enjoy taking ideas from the first sketch to a deployed product: shaping the architecture, building the interface, connecting the back end, and polishing the details that make the experience feel alive — ideally in a constant state of Flow.',
      'Outside of code, I spend an unreasonable amount of time curating playlists.',
    ],
  },

  // Resume: "I work mostly with TypeScript, Python, React, and Node.js"
  mostly: ['TypeScript', 'Python', 'React', 'Node.js'],

  // SIGNAL LOG: the first year the all-time total covers. One value, three readers — the README image's alt
  // text (tv/regions.mjs), the daily job's default `--since`, and through it the drawn "TOTAL · SINCE <year>"
  // readout. They used to be three separate literals that could quietly disagree; the job additionally
  // refuses to publish a card whose readout does not match the year it was given.
  signalLog: { since: 2022 },

  links: {
    home: `${site}/en/`,
    ptbr: `${site}/`,
    resume: `${site}/en/resume/`,
    projects: `${site}/en/projects/`,
    openSource: `${site}/en/open-source/`,
    websites: `${site}/en/websites/`,
    certificates: `${site}/en/certificates/`,
    playlists: `${site}/en/playlists/`,
    email: 'mailto:olwtelet@outlook.com',
    linkedin: 'https://www.linkedin.com/in/olwtelet/',
    repos: 'https://github.com/Olwtelet?tab=repositories',
    // The site's JSON-LD sameAs says bsky.app/profile/Olwtelet.dev; that handle does not resolve
    // (olwtelet.dev is not a registered domain), so this uses the account that does: did:plc:etywi6qnpprxflfbnvkodr43.
    bluesky: 'https://bsky.app/profile/olwtelet.bsky.social',
    instagram: 'https://instagram.com/olwtelets',
    signalLog: 'https://raw.githubusercontent.com/Olwtelet/Olwtelet/output/signal-log.svg',
  },

  // ON AIR: resume "Work Experience", duties verbatim (note the typographic apostrophe in "company’s").
  work: [
    {
      company: 'Ordfall',
      role: 'Full-Stack Developer & Cybersecurity Analyst',
      terms: 'freelance, remote',
      since: 'Sep 2026',
      // The English locale, because this README is English end to end: ordfall.vercel.app/ answers 307 → /pt.
      // Note this is NOT what the site does — olwtelet.vercel.app links the bare root from its English bio too,
      // so an English reader there lands in Portuguese. Signal file 10 below keeps the site's own bare root;
      // assets/README.md's post-merge checklist asks the owner which of the two he wants in both places.
      url: 'https://ordfall.vercel.app/en',
      duties: [
        'Built the company’s institutional website, presenting its secure software, cloud, data protection, and cybersecurity services.',
        'Develop and maintain applications at the intersection of software engineering, security, and digital governance.',
        'Help define scalable, maintainable architectures, with security designed in from the start through production.',
        'Perform vulnerability analysis and review code, dependencies, and security configurations; support cloud, identity, and infrastructure controls.',
      ],
    },
    {
      company: 'Integratek',
      role: 'Full-Stack Developer',
      terms: 'ongoing client engagement',
      since: 'Jun 2026',
      url: 'https://www.integratek.com.br/',
      duties: [
        'Designed and developed the business website for an IT infrastructure company working with networking, structured cabling, CCTV, and access control.',
        'Built with Astro and TypeScript; containerized with Docker for reproducible deployment.',
        'Implemented a blog and quote request forms integrated with WhatsApp to support lead generation.',
        'Continuously improve SEO, performance, responsiveness, and accessibility, and ship new sections as the company needs them.',
        'Also contribute to portal, dashboard, automation, AI, and infrastructure projects, from requirements gathering to post-deployment support.',
      ],
    },
  ],

  // SIGNAL ARCHIVE. kind: 'oss' | 'web'. year, role and license appear only where the site shows them.
  // oneLiner is the index-page one-liner without a final period; stack is the file page STACK line.
  //
  // `short` is a phone-only condensation of the `oneLiner` directly above it, and exists only for the four
  // files the README draws as 172 px cards. At that width a card's copy is 34u type (the SPEC §3.2 phone
  // minimum, ≈10 px), which is 26 characters to the line, and a card has room for two such lines — one when
  // its title needs two. No oneLiner here fits that, and a card with no description tells a phone reader
  // nothing about the project, so each `short` is a strict reduction of the sentence above it: the same
  // claim in the site's own words, never a new one. The full sentence still appears on the desktop card,
  // in the image's alt text and in the README's ALL 10 SIGNAL FILES list. The six websites need no `short`:
  // the guide draws their real one-liners (tv/assets/guide.mjs).
  files: [
    { no: '01', slug: 'argus', title: 'Argus', kind: 'oss', category: 'OPEN SOURCE', status: 'WORK IN PROGRESS', role: 'Creator and maintainer', license: 'AGPL-3.0',
      oneLiner: 'Self-hosted situational awareness platform that folds dozens of public feeds into one live map',
      short: 'Folds dozens of public feeds into one live map',
      stack: 'Python / FastAPI / Next.js / React / MapLibre GL / Tauri / Rust / Docker', url: 'https://github.com/Olwtelet/Argus' },
    { no: '02', slug: 'agentforge', title: 'AgentForge', kind: 'oss', category: 'OPEN SOURCE', status: 'WORK IN PROGRESS',
      oneLiner: 'The same agent, built ten different ways — a runnable comparison of agent frameworks',
      short: 'The same agent, built ten different ways',
      stack: 'Python / uv / pytest / LLMs / RAG / MCP / Streamlit', url: 'https://github.com/Olwtelet/AgentForge' },
    { no: '03', slug: 'resumex', title: 'Resumex', kind: 'oss', category: 'OPEN SOURCE', status: 'WORK IN PROGRESS',
      oneLiner: 'Turns a story file into a finished vertical video, entirely offline',
      short: 'Turns a story file into a vertical video, offline',
      stack: 'Python / FFmpeg / Kokoro / SQLite / Ollama', url: 'https://github.com/Olwtelet/Resumex' },
    { no: '04', slug: 'obsidian-second-brain', title: 'Obsidian Second Brain', kind: 'oss', category: 'OPEN SOURCE', status: 'WORK IN PROGRESS',
      oneLiner: 'A public study vault: CS fundamentals, code snippets, and daily logs, all cross-linked',
      short: 'A public study vault',
      stack: 'Obsidian / Markdown / Git', url: 'https://github.com/Olwtelet/Obsidian-Second-Brain' },
    { no: '05', slug: 'instituto-politecnico-do-brasil', title: 'Instituto Politécnico do Brasil', kind: 'web', category: 'CLIENT WORK', status: 'ONLINE', year: '2026', role: 'Full-Stack Developer',
      oneLiner: 'Institutional website for a nonprofit working in education, training, and civic outreach',
      stack: 'Tailwind CSS / JavaScript', url: 'https://instituto-politecnico-do-brasil.vercel.app' },
    { no: '06', slug: 'rocha-e-sa', title: 'Rocha & Sá', kind: 'web', category: 'CLIENT WORK', status: 'ONLINE', year: '2026', role: 'Full-Stack Developer',
      oneLiner: 'Website for a Brazilian law firm working in civil and corporate law',
      stack: 'Astro / TypeScript / Tailwind CSS', url: 'https://rochaesa.vercel.app/' },
    { no: '07', slug: 'integratek', title: 'Integratek', kind: 'web', category: 'CLIENT WORK', status: 'ACTIVE', year: '2026', role: 'Full-Stack Developer',
      oneLiner: 'Business website and lead channel for an IT infrastructure company, still shipping',
      stack: 'Astro / TypeScript / Tailwind CSS / Docker', url: 'https://www.integratek.com.br/' },
    { no: '08', slug: 'thalit-academy', title: 'CT Thalita Rodrigues', kind: 'web', category: 'CLIENT WORK', status: 'ONLINE', year: '2026', role: 'Full-Stack Developer & UI/UX Designer',
      oneLiner: 'Website for a tennis and beach tennis training centre in Brasília',
      stack: 'Next.js / React / TypeScript', url: 'https://thalitacademy.vercel.app/' },
    { no: '09', slug: 'fhdog', title: 'Filmes HD Online Grátis', kind: 'web', category: 'PERSONAL PROJECT', status: 'ACTIVE', year: '2026', role: 'Design, development, and curation',
      oneLiner: 'Film curation platform and community archive built on an SMPTE test-card design system',
      stack: 'Astro / TypeScript / Supabase / PostgreSQL / CSS', url: 'https://filmeshdonlinegratis.vercel.app' },
    { no: '10', slug: 'ordfall', title: 'Ordfall', kind: 'web', category: 'CLIENT WORK', status: 'ACTIVE', year: '2026', role: 'Full-Stack Developer & Cybersecurity Analyst',
      oneLiner: 'Institutional website for a software engineering and cybersecurity company, plus ongoing security work',
      // The English locale, like the bio link above: ordfall.vercel.app/ answers 307 → /pt, and every
      // other link in this README opens in English. The site itself links the bare root.
      stack: 'Next.js', url: 'https://ordfall.vercel.app/en' },
  ],

  /** Signal file page on the site. */
  fileUrl: (f) => `${site}/en/projects/${f.slug}/`,

  // Certificates page description: "Certificates earned … in cybersecurity, building with Claude, and programming logic"
  certificatesTopic: 'cybersecurity, building with Claude, and programming logic',

  // Certificates page order. `en` is an English gloss for a Portuguese course title.
  certificates: [
    { title: 'Tools of the Trade: Linux and SQL', issuer: 'Google', date: 'Sep 2026', url: 'https://www.coursera.org/account/accomplishments/verify/BDM6QII7T7ZT' },
    { title: 'Connect and Protect: Networks and Network Security', issuer: 'Google', date: 'Sep 2026', url: 'https://www.coursera.org/account/accomplishments/verify/LVVYFPCE0OQL' },
    { title: "Claude with Google Cloud's Vertex AI", issuer: 'Anthropic', date: 'Sep 2026', url: 'https://academy.claude.com/verify/4a532fbe6844cb8c1b87be2a988d1fe1' },
    { title: 'Play It Safe: Manage Security Risks', issuer: 'Google', date: 'Aug 2026', url: 'https://www.coursera.org/account/accomplishments/verify/RJ69NOHTV926' },
    { title: 'Foundations of Cybersecurity', issuer: 'Google', date: 'Aug 2026', url: 'https://www.coursera.org/account/accomplishments/verify/LTLWBG6ION9N' },
    { title: 'Claude with Amazon Bedrock', issuer: 'Anthropic', date: 'Aug 2026', url: 'https://academy.claude.com/verify/ee7535c035d529cab753e49b6c751dc8' },
    { title: 'Building with the Claude API', issuer: 'Anthropic', date: 'Aug 2026', url: 'https://academy.claude.com/verify/26984dbc08c3d79418a8b45adc87b1dd' },
    { title: 'Algoritmos e Lógica de Programação - O Curso COMPLETO', en: 'Algorithms & Programming Logic', issuer: 'Udemy', date: 'Aug 2026', url: 'https://www.udemy.com/certificate/UC-733fee17-7de9-4cfe-830f-ceb0865649ee/' },
  ],

  // Playlists page description (no final period) and its four playlists, in page order.
  playlists: {
    description: 'Brazilian rock, road-trip tracks, and late-night radio',
    items: [
      { name: 'Filmes HD Online Grátis', url: 'https://open.spotify.com/playlist/0rOUdPuqoErRWxtTQbRDFD' },
      { name: 'Madrugadas em Rádio FM', url: 'https://open.spotify.com/playlist/1kr8i36jGVEc3VVyXGxgYA' },
      { name: 'Carro Vermelho', url: 'https://open.spotify.com/playlist/5CMmvE78xG3Cn6eyA7yAWh' },
      { name: 'Angels Fight Devils With Grace', url: 'https://open.spotify.com/playlist/04l8q20PHavWBOp6J6ZH6V' },
    ],
  },

  // Resume "Skills", [label, value] verbatim.
  skills: [
    ['Languages & frameworks', 'TypeScript, JavaScript, Python, SQL, React, Next.js, Vue.js, Svelte, Tailwind CSS, Vite, Node.js, Express, FastAPI, Astro; C# and Rust in specific projects'],
    ['Data & infrastructure', 'Supabase/PostgreSQL, MongoDB, Mongoose, SQLite, REST APIs, Docker, GitHub Actions, Google Cloud Platform, Vercel, Linux'],
    ['Applied AI', 'LLM integrations, RAG pipelines, multi-agent systems, MCP, NLP tooling, the Claude API on Amazon Bedrock and Vertex AI'],
    ['Security', 'code and dependency review, Supabase RLS, secret scanning, signed updates, network security and risk management fundamentals'],
    ['Practices', 'testing with Vitest and pytest, modular design, Git-based workflows, CI, accessibility, SEO'],
  ],

  education: 'Independent Computer Science coursework through MIT OpenCourseWare — 6.0001, 6.006, 6.033, 6.036, 6.867 (2024 – 2026)',
  languages: 'Portuguese (native), English (advanced)',
});

/** Counts shown on screen, always derived from the content above. */
export const count = Object.freeze({
  files: (C) => C.files.length,
  oss: (C) => C.files.filter((f) => f.kind === 'oss').length,
  web: (C) => C.files.filter((f) => f.kind === 'web').length,
  certificates: (C) => C.certificates.length,
  playlists: (C) => C.playlists.items.length,
  /** [[issuer, n], …] in order of first appearance, e.g. [['Google', 4], ['Anthropic', 3], ['Udemy', 1]] */
  byIssuer: (C) => {
    const tally = new Map();
    for (const c of C.certificates) tally.set(c.issuer, (tally.get(c.issuer) ?? 0) + 1);
    return [...tally];
  },
});

/** Two-digit display number: pad2(4) → '04'. */
export const pad2 = (n) => String(n).padStart(2, '0');
