# Portfolio

The site at [andres-al-campos.github.io](https://andres-al-campos.github.io). Static — no build step,
no dependencies. Push to `main` and GitHub Pages serves it.

## Adding a project

Append an object to the array in `projects.js`. The page builds the cards and the filter
row from that array.

```js
{
  name: "Thing",
  tagline: "One line, the pitch.",
  blurb: "One to three sentences: what it does and why it exists.",
  tags: ["Swift", "SwiftUI"],
  platform: "macos",              // browser | macos | ios | tools
  repo: "https://github.com/andres-al-campos/Thing",
}
```

A new `platform` value needs a label in the `LABELS` map in `index.html` and an entry
in the ordered list just below it. Everything else is automatic.

## Marks

Each project card leads with a small hand-drawn mark instead of a screenshot. The marks
live in `marks.js`, keyed by project name — one 32×32 viewBox, one stroke weight, two
amber tones. A new project needs a matching entry there. `marks.js` is shared by the site
and the local mockups, so edit it there, not in a copy.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Check both color schemes. The layout is a single
column of full-width cards; below 620px the padding tightens and the hover arrow drops.
