# Portfolio

The site at [id3arium.github.io](https://id3arium.github.io). Static — no build step,
no dependencies. Push to `main` and GitHub Pages serves it.

## Adding a project

Append an object to the array in `projects.js`. Nothing else needs editing; the page
builds the cards and the filter row from that array.

```js
{
  name: "Thing",
  tagline: "One line, the pitch.",
  blurb: "One to three sentences: what it does and why it exists.",
  tags: ["Swift", "SwiftUI"],
  platform: "macos",              // browser | macos | ios | tools
  repo: "https://github.com/Id3arium/Thing",
  image: "img/thing.png",         // optional — omit for a text-only card
}
```

A new `platform` value needs a label in the `LABELS` map in `index.html` and an entry
in the ordered list just below it. Everything else is automatic.

## Screenshots

Drop a PNG in `img/` and point `image:` at it. They're capped at 420px tall and
centered, so any aspect ratio works — a wide dashboard and a tall extension popup
both sit correctly. Downscale to ~1200px on the long edge first:

```bash
sips -Z 1200 img/thing.png
```

Prefer a shot of the app doing its actual job over an empty start screen.

## Local preview

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Check both color schemes and the 720px breakpoint
where the grid drops to one column.
