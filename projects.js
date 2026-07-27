// The whole site's content. Add a project by appending an object here.
//
//   name      required
//   tagline   required — one line, the pitch
//   blurb     required — 1–3 sentences, what it does and why
//   tags      required — short, lowercase-ish; shown as chips
//   platform  required — browser | macos | ios | tools  (drives the filter row)
//   repo      required — full URL
//   image     optional — path under img/. Omit and the card renders text-only.

const PROJECTS = [
  {
    name: "WebTime",
    tagline: "Track and take control of your time.",
    blurb:
      "A Firefox extension that tracks how long you spend on each site and puts a small timer in the corner of the screen. It uses session-based browsing — focused sessions, gentle nudges, and a cooldown when a limit is reached.",
    tags: ["Firefox extension", "TypeScript"],
    platform: "browser",
    repo: "https://github.com/Id3arium/WebTime",
    image: "img/webtime.png",
  },
  {
    name: "Momus",
    tagline: "Read Google Maps reviews with a skeptical eye.",
    blurb:
      "A Firefox extension that scrapes every review from a Google Maps location and scores it for fake-review patterns — bimodal star distributions, date clustering, spelling anomalies. Built for apartment hunting; it ranks locations side by side once you've gathered a few.",
    tags: ["Firefox extension", "JavaScript", "statistics"],
    platform: "browser",
    repo: "https://github.com/Id3arium/Momus",
    image: "img/momus.png",
  },
  {
    name: "Chronicle",
    tagline: "A personal encyclopedia of your Claude conversations.",
    blurb:
      "Captures your Claude.ai history and turns it into a durable, searchable record: every conversation gets a markdown summary, and those roll up into half-month, quarter, and year entries. An MCP server lets Claude read back through it. Everything runs locally.",
    tags: ["Python", "MCP", "Firefox extension"],
    platform: "tools",
    repo: "https://github.com/Id3arium/Chronicle",
  },
  {
    name: "Ansa",
    tagline: "Break tasks down until the leaves are small enough to do.",
    blurb:
      "A Workflowy-style outliner backed by a single SQLite source of truth. The React app and an MCP server are both just clients of the same REST API, so a Claude and a person can edit the same tree at once and see each other's changes live over SSE.",
    tags: ["React", "TypeScript", "Fastify", "MCP"],
    platform: "tools",
    repo: "https://github.com/Id3arium/Ansa",
  },
  {
    name: "Winnow",
    tagline: "Find the company whose Glassdoor reviews are real.",
    blurb:
      "A high average rating is cheap — most things north of 4.0 are propped up by review pushes. Winnow scores each company on whether its review distribution looks organically produced, then lets the genuine outlier fall out: high average and a trustworthy statistical signature.",
    tags: ["Python", "statistics", "scraping"],
    platform: "tools",
    repo: "https://github.com/Id3arium/Winnow",
  },
  {
    name: "Etymon",
    tagline: "The true root hiding beneath the surface.",
    blurb:
      "A word-connection engine built on GloVe embeddings. Give it a set of words and it surfaces the strongest shared association across all of them — running fast set intersection and deeper graph traversal in parallel, then ranking every candidate by its strongest link.",
    tags: ["Python", "embeddings", "NLP"],
    platform: "tools",
    repo: "https://github.com/Id3arium/Etymon",
    image: "img/etymon.png",
  },
  {
    name: "Sundial",
    tagline: "Your screen, matched to the room.",
    blurb:
      "A macOS menu bar app that schedules monitor brightness, contrast, and Night Shift by time of day, interpolating smoothly between presets. It drives the real hardware backlight over DDC rather than dimming with a software overlay.",
    tags: ["Swift", "SwiftUI", "DDC"],
    platform: "macos",
    repo: "https://github.com/Id3arium/Sundial",
  },
  {
    name: "ReSign",
    tagline: "Keep your sideloaded iOS apps from expiring.",
    blurb:
      "A macOS menu bar app that watches your Xcode projects and automatically rebuilds and reinstalls them to your iPhone before their signatures expire. It checks on launch, every two hours, and whenever the Mac wakes.",
    tags: ["Swift", "SwiftUI", "devicectl"],
    platform: "macos",
    repo: "https://github.com/Id3arium/ReSign",
  },
  {
    name: "Somnya",
    tagline: "Measured, not scored.",
    blurb:
      "An on-device iPhone sleep tracker that senses movement, breathing, and heartbeat overnight and reports what it actually measured. Lying awake still looks identical to deep sleep on an accelerometer, so every stat carries a tier: sensor fact, honest estimate, or not enough data.",
    tags: ["Swift", "SwiftData", "signal processing"],
    platform: "ios",
    repo: "https://github.com/Id3arium/Somnya",
  },
  {
    name: "Timekeep",
    tagline: "Screen time that keeps the timestamps.",
    blurb:
      "Apple's Screen Time says you spent 47 minutes in a messaging app. It won't say whether that was one stretch at 2am or six check-ins. Timekeep reconstructs the real timeline from Shortcuts automations, and nothing leaves the phone.",
    tags: ["Swift", "SwiftData", "Shortcuts"],
    platform: "ios",
    repo: "https://github.com/Id3arium/Timekeep",
  },
  {
    name: "Almanac",
    tagline: "Never miss an ex-dividend date.",
    blurb:
      "STRC pays a dividend twice a month, and the date you have to buy by shifts around weekends and NYSE holidays. Almanac computes those buy dates and schedules local notifications at market open. Offline, no dependencies, no account.",
    tags: ["Swift", "SwiftUI"],
    platform: "ios",
    repo: "https://github.com/Id3arium/Almanac",
  },
];
