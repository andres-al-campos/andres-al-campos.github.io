# Demo clips

Updated 2026-10-22 00:49, at 1.0.0.

The short recordings on each card (`img/<tool>.mp4`, with a poster `img/<tool>.jpg`
and its time in `projects.js` as `posterAt`). Each is recorded live from the real app
and cut with ffmpeg; the scripts and takes live in `designs/<tool>-clip/`, which is
gitignored.

## Sub-features

- A clip shows a tool's main use in 20 to 30 seconds, muted, with a drawn pointer.
- Sped-up stretches carry a speed badge.

## How to get to it

Hover or tap a card's clip, or open it large.

## Driving it

No check yet. Each clip is judged by watching it.

## Calls

- 2026-10-16 23:18, 1.0.0. A clip shows the app as it looks in normal use: WebTime was recorded in a
  real browser window at 100% zoom, with its popup opening from the toolbar. The camera
  may zoom in to make something readable, but nothing is drawn larger than it is. Fake
  sites and data stand in for the user's own browsing. Applies *The tool at its best, as it is*.
- 2026-10-16 23:18, 1.0.0. A sped-up stretch carries a "15×" badge at the bottom right, left of where
  the card's expand icon sits so the icon doesn't cover it.
- 2026-10-17 11:06, 1.0.0. The camera moves continuously, zooming in and out between the things being
  shown. Waits are cut only where the screen is still, so the cuts don't show. Ansa's
  first cut gave each piece its own framing, and every time cut became a camera jump. Applies *Only the subject draws the eye*.
- 2026-10-17 11:06, 1.0.0. A clip showing two apps shows them in the same appearance (Ansa's desktop
  and phone are both dark), so they read as one product. Applies *Only the subject draws the eye*.
- 2026-10-17 11:25, 1.0.0. A clip hides details that aren't part of using the app, however small: the
  user's name and session titles in a window title, a promo line in a terminal, a Dock
  tooltip. Applies *Only the subject draws the eye*.
- 2026-10-17 11:25, 1.0.0. A clip may stage what it shows: a drawn pointer, touch dots, typed input,
  a scripted agent prompt with the tree it builds set in advance. The line is showing
  something the app can't do. Applies *The tool at its best, as it is*.
- 2026-10-17 16:49, 1.0.0. A fake site in a clip is dark too, like the apps and this site, though not
  pitch black, and has the parts a real one has around its content (nav, sidebars). A
  light, bare TweetBook stood out in WebTime's clip. Applies *Only the subject draws the eye*.
- 2026-10-20 20:16, 1.0.0. A clip may use a real, well-known public place: Momus runs on Google Maps
  reviews, and for a popular place those aren't private (the user's call). Fake data
  stays the default where the data would be the user's own.
- 2026-10-20 01:17, 1.0.0. Winnow's clip says "sample data" in its opening scene and then drops it:
  after that it's obvious every company is made up. Applies *Only the subject draws the eye*.
- 2026-10-20 01:32, 1.0.0. A pause runs 2–2.5 s at most; longer ones felt too dramatic.
- 2026-10-20 19:49, 1.0.0. Winnow's clip runs 30 s, and the app's local address (`127.0.0.1:8766`)
  shows in its address bar; the user found both fine. A tool with more to show can run
  longer.
- 2026-10-21 00:02, 1.0.0. A clip shows off every feature it reaches: scrolling through results, it
  stops briefly on each section. "What's the point of making a video if you're not going
  to show off all the features?" Momus's first cut ran past its results to the bottom. Applies *The tool at its best, as it is*.
- 2026-10-21 00:02, 1.0.0. While a tool works on the page in the background, the camera widens to the
  whole window so the work shows (Momus's scrape, with Google's review list scrolling by),
  then closes in on the tool when its results land. Applies *The tool at its best, as it is*.

## Gotchas

- Clicks sent through Playwright don't move the browser's focus, so the address bar
  stays highlighted; `page.bringToFront()` fixes it.
- A scroll wheel scrolls whatever is under the pointer: glide to the column that should
  scroll first.
- Time cuts come out of the raw take before the camera is applied, or they show as jumps.
- Slowing a 30 fps take in the edit repeats frames and judders; interpolating them
  (minterpolate) smears scrolling text. Re-record at the pace the clip needs.
- Chromium's download bubble re-shows recent downloads over a toolbar popup. Erase the
  download history (`chrome.downloads.erase({})`) before the take.
