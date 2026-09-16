// The whole site's content. Add a project by appending an object here.
//
// A selection, not the full list -- the rest is on GitHub, linked below the grid.
//
//   name      required
//   tagline   required — one line, the pitch
//   blurb     required — 1–3 sentences, what it does and why
//   tags      required — short, lowercase-ish; shown as chips
//   repo      required — full URL
//   image     optional — path under img/. Omit and the card renders text-only.

const PROJECTS = [
  {
    name: "WebTime",
    tagline: "Track and take control of your time.",
    blurb:
      "A Firefox extension that tracks how long you spend on each site and puts a small timer in the corner of the screen. It uses session-based browsing — focused sessions, gentle nudges, and a cooldown when a limit is reached.",
    tags: ["Firefox extension", "TypeScript"],
    repo: "https://github.com/andres-al-campos/WebTime",
    image: "img/webtime.png",
  },
  {
    name: "Ansa",
    tagline: "Break tasks down until the leaves are small enough to do.",
    blurb:
      "A Workflowy-style outliner backed by a single SQLite source of truth. The React app and an MCP server are peer clients of the same REST API, so a Claude and a person can edit the same tree at once, over SSE, without diverging.",
    tags: ["React", "TypeScript", "Fastify", "MCP"],
    repo: "https://github.com/andres-al-campos/Ansa",
  },
  {
    name: "Winnow",
    tagline: "Find the company whose Glassdoor reviews are real.",
    blurb:
      "A high average rating is cheap — most things north of 4.0 are propped up by review pushes. Winnow scores each company on whether its review distribution looks organically produced, then lets the genuine outlier fall out: high average and a trustworthy statistical signature.",
    tags: ["Python", "statistics", "scraping"],
    repo: "https://github.com/andres-al-campos/Winnow",
  },
  {
    name: "Momus",
    tagline: "Read Google Maps reviews with a skeptical eye.",
    blurb:
      "A Firefox extension that scrapes every review from a Google Maps location and scores it for fake-review patterns — bimodal star distributions, date clustering, spelling anomalies. Built for apartment hunting; it ranks locations side by side once you've gathered a few.",
    tags: ["Firefox extension", "JavaScript", "statistics"],
    repo: "https://github.com/andres-al-campos/Momus",
    image: "img/momus.png",
  },
  {
    name: "Chronicle",
    tagline: "A personal encyclopedia of your Claude conversations.",
    blurb:
      "Captures your Claude.ai history and turns it into a durable, searchable record: every conversation gets a markdown summary, and those roll up into half-month, quarter, and year entries. An MCP server lets Claude read back through it. Everything runs locally.",
    tags: ["Python", "MCP", "Firefox extension"],
    repo: "https://github.com/andres-al-campos/Chronicle",
  },
  {
    name: "Somnya",
    tagline: "Sleep measured, not scored.",
    blurb:
      "An on-device iPhone sleep tracker that senses movement, breathing, and heartbeat overnight and reports what it actually measured. Lying awake still looks identical to deep sleep on an accelerometer, so every stat carries a tier: sensor fact, honest estimate, or not enough data.",
    tags: ["Swift", "SwiftData", "signal processing"],
    repo: "https://github.com/andres-al-campos/Somnya",
  },
  {
    name: "Etymon",
    tagline: "Find the word that connects a set of words.",
    blurb:
      "Give it cat and lion and it walks a graph of GloVe embeddings to find the words sitting close to both. Two searches run in parallel, a fast set intersection and a best-first traversal, and every result shows the path it walked to get there.",
    tags: ["Python", "embeddings", "graph search"],
    repo: "https://github.com/andres-al-campos/Etymon",
  },
  {
    name: "ReSign",
    tagline: "Keep sideloaded iOS apps from expiring.",
    blurb:
      "A free Apple developer account signs an app for seven days. ReSign sits in the menu bar, tracks when each profile runs out, and rebuilds and reinstalls two hours before it does. It checks again whenever the Mac wakes.",
    tags: ["Swift", "macOS", "menu bar"],
    repo: "https://github.com/andres-al-campos/ReSign",
  },
  {
    name: "Sundial",
    tagline: "Schedule your monitor's brightness by time of day.",
    blurb:
      "Drives the monitor's real backlight over DDC rather than dimming with an overlay, and interpolates between presets so the change is gradual. It won't let you build a schedule until it has confirmed it can actually read your display.",
    tags: ["Swift", "macOS", "DDC"],
    repo: "https://github.com/andres-al-campos/Sundial",
  },
];
