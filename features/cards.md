# Project cards

Updated 2026-10-22 00:49, at 1.0.0.

The grid on the home page: one card per tool, with its name, what it does and a demo
clip.

## Sub-features

- The name links to the repo; the rest of the card can be selected like text.
- With a pointer, the clip plays while the pointer is on it and stops back on the
  poster's frame when it leaves.
- On a phone with one card across, the clip plays while it's the card on screen.
  Tablets with two across keep the poster. Reduced motion keeps the poster everywhere.
- Clicking a clip opens the large view; on a phone it opens the system's full-screen
  player instead.

## How to get to it

Open the site.

## Driving it

No check yet: there are no drive scenarios. Checked by eye in a browser and on a
phone.

## Calls

- 2026-10-15 22:55, 1.0.0. Clips play only while they have the reader's attention: on hover with a
  pointer, on a phone while it's the card on screen. A grid where every card autoplays
  pulls attention off the card being read. (2026-10-17: the pointer has to be on the
  clip, not just the card. People hover a card to read it, and a moving picture makes
  its text hard to read; they hover the clip to find out it's a video, then likely
  expand it, watch, and move on.) Applies *Only the subject draws the eye*.
- 2026-10-15 22:55, 1.0.0. The poster is a frame with something happening in it, not the clip's
  first frame, and a stopped clip rewinds to it. Vault's first frame was its empty "Add
  a channel" screen; the user found the channel page "way better" even though the card
  cuts to the empty screen when the clip starts. Applies *The tool at its best, as it is*.
- 2026-10-16 21:20, 1.0.0. Hovering a card highlights it and underlines the name; on a phone, with no
  hover, the name is always underlined. A "GitHub ↗" label in the corner was tried and
  dropped. A clip's expand icon says it opens large; the cursor stays the plain pointer,
  since the user found the icon does the job. Applies *Only the subject draws the eye*.
- 2026-10-16 00:03, 1.0.0. Cards highlight on hover but don't rise. A rising card made it feel like
  the pointer would miss the expand icon. Applies *Theirs to use*.
- 2026-10-16 00:03, 1.0.0. The large view's controls sit under the picture. The browser's own darken
  the frame while they show (all of it in Safari) and cover the recorded app's player
  bar. Applies *Theirs to use*.
- 2026-10-16 00:44, 1.0.0. On a phone, tapping a clip hands it to the system's full-screen player.
  The large view there was barely bigger than the card; full screen can turn to
  landscape. Applies *Theirs to use*.
- 2026-10-16 19:44, 1.0.0. The large view grows in 0.5 s and shrinks in 0.35 s. The first 0.32 s
  felt a tad quick; the user set the shrink a little quicker than the grow.
- 2026-10-17 16:59, 1.0.0. The large view's clip holds still while it grows and shrinks, and plays
  once it lands. A card still under the pointer when the view shrinks back plays on from
  where the large view stopped. Applies *Only the subject draws the eye*.

## Gotchas

- Back from the system's full screen, a clip has stopped wherever it was left, often on
  its last frame; it has to be restarted or put back on the poster's frame.
