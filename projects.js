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
      "A browser extension that tracks where your time goes, by session and by day. The limits are strict enough to actually lower usage and loose enough that you keep the extension installed, which most blockers get wrong in one direction or the other. Warnings start well before a limit, with a wind-down in the last minute.",
    tags: ["TypeScript", "browser extension"],
    repo: "https://github.com/andres-al-campos/WebTime",
    image: "img/webtime.png",
  },
  {
    name: "Ansa",
    tagline: "Break tasks down until the leaves are small enough to do.",
    blurb:
      "A to-do list where a task is a tree and progress rolls up from the leaves, so every branch shows how far along it is. On web, iOS, and desktop, all against the same tree.",
    tags: ["TypeScript", "React", "Swift", "Electron", "Cloudflare Workers", "MCP"],
    repo: "https://github.com/andres-al-campos/Ansa",
  },
  {
    name: "Momus",
    tagline: "Read Google Maps reviews with a skeptical eye.",
    blurb:
      "A browser extension that pulls every review for a location and scores it for the marks of a bought one, starting with a bimodal star distribution: a pile of fives and a pile of ones averaging to a respectable 4.2. Built for apartment hunting, and it ranks places side by side once you have gathered a few.",
    tags: ["JavaScript", "browser extension", "distribution analysis"],
    repo: "https://github.com/andres-al-campos/Momus",
    image: "img/momus.png",
  },
  {
    name: "Winnow",
    tagline: "Find the company whose Glassdoor reviews are real.",
    blurb:
      "Almost anything above 4.0 has had a review push behind it, so the average alone proves nothing. Winnow scores the shape of the distribution instead, adding signals Glassdoor exposes and Google Maps does not: ex-employee against current-employee sentiment, sub-rating coherence, and how the rating moved over time.",
    tags: ["Python", "CLI", "sentiment analysis", "scraping"],
    repo: "https://github.com/andres-al-campos/Winnow",
  },
  {
    name: "Chronicle",
    tagline: "A personal encyclopedia of your Claude conversations.",
    blurb:
      "A searchable archive of everything you have said to Claude, built on your own machine from an export of your history. Every conversation gets a markdown summary, and those roll up into half-month, quarter, and year entries, so a question about what you decided six months ago has somewhere to land. An MCP server hands the whole thing back to Claude to read.",
    tags: ["Python", "MCP", "browser extension"],
    repo: "https://github.com/andres-al-campos/Chronicle",
  },
  {
    name: "Somnya",
    tagline: "Sleep measured, not scored.",
    blurb:
      "Lying awake looks identical to deep sleep on an accelerometer, so most sleep scores are confident about something they cannot know. Somnya senses movement, breathing, and heartbeat overnight, then labels every stat with how much it can stand behind it: sensor fact, honest estimate, or not enough data.",
    tags: ["Swift", "iOS", "signal processing"],
    repo: "https://github.com/andres-al-campos/Somnya",
  },
  {
    name: "Etymon",
    tagline: "Find the word that connects a set of words.",
    blurb:
      "Give it cat and lion and it finds the words sitting close to both, then shows the path it walked to get there: lion, leopard, cats. Useful for naming a category, brainstorming, or word games.",
    tags: ["Python", "local server", "CLI", "embeddings", "graph search"],
    repo: "https://github.com/andres-al-campos/Etymon",
  },
  {
    name: "ReSign",
    tagline: "Keep sideloaded iOS apps from expiring.",
    blurb:
      "Sideloaded apps stop opening when their signature runs out, usually on the morning you need one. ReSign watches your Xcode projects from the menu bar and rebuilds and reinstalls to your iPhone two hours before that happens, and checks again every time the Mac wakes.",
    tags: ["Swift", "macOS"],
    repo: "https://github.com/andres-al-campos/ReSign",
  },
  {
    name: "Sundial",
    tagline: "Schedule your monitor's brightness by time of day.",
    blurb:
      "A macOS menu bar app that holds a set of brightness and contrast presets and moves between them through the day, easing each change in over a minute. Bright enough to work by at noon, dim enough to sit with at midnight, and you never touch the buttons on the monitor to get there.",
    tags: ["Swift", "macOS", "monitor control"],
    repo: "https://github.com/andres-al-campos/Sundial",
  },
];
