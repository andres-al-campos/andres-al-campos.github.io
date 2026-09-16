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
      "A Firefox extension that breaks browsing into sessions instead of daily totals. It warns before a limit rather than at it: a visual pulse early, a popup as you approach your usual amount, a 60-second wind-down near the end. The blocks are loose enough that I still have it installed.",
    tags: ["Firefox extension", "TypeScript"],
    repo: "https://github.com/andres-al-campos/WebTime",
    image: "img/webtime.png",
  },
  {
    name: "Ansa",
    tagline: "Break tasks down until the leaves are small enough to do.",
    blurb:
      "An outliner where a task is a tree and progress rolls up from the leaves, so a branch shows how far along it is. The React app and an MCP server are peer clients of the same API, which means a Claude and a person can edit the same tree at once and both see it change.",
    tags: ["React", "TypeScript", "Cloudflare Workers", "MCP"],
    repo: "https://github.com/andres-al-campos/Ansa",
  },
  {
    name: "Winnow",
    tagline: "Find the company whose Glassdoor reviews are real.",
    blurb:
      "Almost anything above 4.0 has had a review push behind it, so the average alone proves nothing. Winnow scores the shape of the distribution instead, adding signals Glassdoor exposes and Google Maps does not: ex-employee against current-employee sentiment, sub-rating coherence, and how the rating moved over time.",
    tags: ["Python", "statistics", "scraping"],
    repo: "https://github.com/andres-al-campos/Winnow",
  },
  {
    name: "Momus",
    tagline: "Read Google Maps reviews with a skeptical eye.",
    blurb:
      "A Firefox extension that pulls every review for a location and scores it for the marks of a bought one, starting with a bimodal star distribution: a pile of fives and a pile of ones averaging to a respectable 4.2. Built for apartment hunting, and it ranks places side by side once you have gathered a few.",
    tags: ["Firefox extension", "JavaScript", "statistics"],
    repo: "https://github.com/andres-al-campos/Momus",
    image: "img/momus.png",
  },
  {
    name: "Chronicle",
    tagline: "A personal encyclopedia of your Claude conversations.",
    blurb:
      "Every conversation gets a markdown summary, and those roll up into half-month, quarter, and year entries, so a question about what you decided six months ago has somewhere to land. An MCP server hands the archive back to Claude. The summarizing passes are the only time anything leaves the machine.",
    tags: ["Python", "MCP", "Firefox extension"],
    repo: "https://github.com/andres-al-campos/Chronicle",
  },
  {
    name: "Somnya",
    tagline: "Sleep measured, not scored.",
    blurb:
      "Lying awake looks identical to deep sleep on an accelerometer, so most sleep scores are confident about something they cannot know. Somnya senses movement, breathing, and heartbeat overnight, then labels every stat with how much it can stand behind it: sensor fact, honest estimate, or not enough data.",
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
