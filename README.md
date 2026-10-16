# Portfolio

The site at [andres-al-campos.github.io](https://andres-al-campos.github.io). Static — no build step,
no dependencies. Push to `main` and GitHub Pages serves it.

## Adding a project

Append an object to the array in `projects.js`. The page builds the cards from that
array.

```js
{
  name: "Thing",
  tagline: "One line, the pitch.",
  blurb: "One to three sentences: what it does and why it exists.",
  tags: ["Swift", "SwiftUI", "macOS"],   // the platform goes in the tags
  repo: "https://github.com/andres-al-campos/Thing",
}
```

## Demo clips

A card can also carry a short demo: `video` and `poster` under `img/`, and `posterAt`, the
second of the clip the poster was taken from. With a pointer the clip plays while the card
is hovered. On a touch screen with one card across it plays while the card is on screen;
with two across it shows the poster. Every play starts from 0, and a stopped clip rewinds
to `posterAt`, so it settles back on the same picture as the poster. Reduced motion shows
the poster only. Encode at 960px wide, silent, with the index up front, and take the poster
from a moment where the screen holds still:

```bash
ffmpeg -i tour.mp4 -an -vf "scale=960:-2:flags=lanczos,format=yuv420p" \
  -c:v libx264 -crf 24 -preset slow -movflags +faststart img/thing.mp4
ffmpeg -ss 3.2 -i img/thing.mp4 -frames:v 1 -q:v 3 img/thing.jpg   # posterAt: 3.2
```

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
