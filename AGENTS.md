# Portfolio

A portfolio where someone deciding whether to work with Alex can see what each tool does
in a few seconds, and go to the code.

## Principles

Look-and-feel calls that hold across the site, with the reason given at the time.

- 2026-10-15. A card's demo clip plays only while it has the reader's attention: on
  hover with a pointer, and on a phone while it is the card on screen. A grid where every
  card autoplays pulls attention off the card being read; with one card across, the card
  in view is the one being read. Tablets with two across keep the poster. (2026-10-17: the
  pointer has to be on the clip, not just the card. A moving picture makes the card's text
  hard to read, and people hover a card to read it; they hover the clip to find out it's a
  video, then likely expand it, watch, and move on.)
- 2026-10-15. The poster is a frame with something happening in it, not the clip's first
  frame. Vault's first frame was its empty "Add a channel" screen, and the user found the
  channel page "way better" even though the card cuts to the empty screen when the clip
  starts. A stopped clip rewinds to the poster's frame, so stopping doesn't jump.
- 2026-10-16. A card isn't a link: the name goes to the repo, and the rest of the card
  can be selected like text. Hovering the card highlights it and underlines the name,
  which says where the link is; on a phone, with no hover, the name is always
  underlined. A "GitHub ↗" label in the corner was tried and dropped. A clip opens
  large, with an expand icon in its corner saying so; the cursor stays the plain
  pointer, since the user found the icon does the job.
- 2026-10-16. Cards highlight on hover but don't rise. A rising card made it feel like
  the pointer would miss the expand icon.
- 2026-10-16. The large view's controls sit under the picture. The browser's own
  darken the frame while they show (all of it in Safari) and cover the recorded app's
  player bar.
- 2026-10-16. On a phone, tapping a clip hands it to the system's full-screen player.
  The large view there was barely bigger than the card; full screen can turn to
  landscape.
- 2026-10-16. A demo clip shows the app as it looks in normal use: WebTime was
  recorded in a real browser window at 100% zoom, with its popup opening from the
  toolbar. The camera may zoom in to make something readable, but nothing is drawn
  larger than it is; a timer enlarged to match a zoomed page made the nudge look
  enormous. Fake sites and data stand in for the user's own browsing.
- 2026-10-16. A sped-up stretch carries a "15×" badge at the bottom right, left of
  where the card's expand icon sits so the icon doesn't cover it.
- 2026-10-16. The large view grows in 0.5 s and shrinks in 0.35 s. The first 0.32 s felt
  a tad quick; the user set the shrink a little quicker than the grow.
- 2026-10-17. A clip's camera moves continuously, zooming in and out between the things
  being shown. Waits are cut only where the screen is still, so the cuts don't show. Ansa's
  first cut gave each piece its own framing, and every time cut became a camera jump.
- 2026-10-17. A clip showing two apps shows them in the same appearance (Ansa's desktop
  and phone are both dark), so they read as one product.
- 2026-10-17. A clip hides details that aren't part of using the app, however small: the
  user's name and session titles in a window title, a promo line in a terminal, a Dock
  tooltip.
- 2026-10-17. A clip may stage what it shows: a drawn pointer, touch dots, typed input,
  a scripted agent prompt with the tree it builds set in advance. These are obviously
  limits of recording, and they don't take away from how the app feels. The line is
  showing something the app can't do.
- 2026-10-17. A fake site in a clip is dark too, like the apps and this site, though not
  pitch black, and has the parts a real one has around its content (nav, sidebars). A
  light, bare TweetBook stood out in WebTime's clip.
- 2026-10-17. The large view's clip holds still while it grows and shrinks, and plays once
  it lands. A card still under the pointer when the view shrinks back plays on from where
  the large view stopped.
- 2026-10-20. An explanation stays only as long as it's needed. Winnow's clip says
  "sample data" in its opening scene and then drops it: after that it's obvious every
  company is made up.
