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
      "A browser extension that breaks your browsing into sessions and shows how much time goes where. The limits are strict enough to actually lower usage and loose enough that you keep the extension installed. When a session ends, the site is blocked for a cooldown; end a session early and the unused time rolls over to the next. A chart tracks each day against a seven-day average.",
    tags: ["TypeScript", "browser extension"],
    repo: "https://github.com/andres-al-campos/WebTime",
    image: "img/webtime.png",
  },
  {
    name: "Ansa",
    tagline: "Break big tasks down until the next step is small enough to do.",
    blurb:
      "A to-do list where every task is a tree. Break a task into subtasks, then those into smaller ones, and progress rolls up from the leaves, so each branch shows how far along it is. It runs on the web, iOS, and desktop against the same tree, and an MCP server lets Claude read and edit it too.",
    tags: ["TypeScript", "React", "Swift", "Electron", "SQLite", "MCP"],
    repo: "https://github.com/andres-al-campos/Ansa",
  },
  {
    name: "Momus",
    tagline: "Read Google Maps reviews with a skeptical eye.",
    blurb:
      "A browser extension that pulls every review for a place and asks whether they are real. Genuine ratings spread across the scale while bought ones pile up at five stars, so the shape of the ratings says a lot. It also finds what people talk about most and which reviews it shows up in, so you know whether the pros are big enough and the cons small enough.",
    tags: ["JavaScript", "browser extension", "distribution analysis"],
    repo: "https://github.com/andres-al-campos/Momus",
    image: "img/momus.png",
  },
  {
    name: "Winnow",
    tagline: "Find the company whose Glassdoor reviews are real.",
    blurb:
      "Almost every company above 4.0 has had a review push behind it, so the average alone proves nothing. Winnow scores many companies on whether their reviews look organic: the shape of the ratings, how former employees compare to current ones, whether the sub-ratings agree, and how the score has moved over time.",
    tags: ["Python", "CLI", "SQLite", "sentiment analysis", "scraping"],
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
