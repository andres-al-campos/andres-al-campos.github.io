# water settings

Named versions of the water tuning. Only the values that differ from the
defaults in `water.js` are listed.

To use one: say "use v2" (or whichever) and I'll apply it.
To save the current sliders as a new one: say "save this as <name>".

Which knob does what:

- `width` — geometry, affects **every** line, lit or not
- `beamGain` — how much extra alpha the beam adds. Reads as thickness on the
  **lit** lines only, because a brighter halo clears the visible threshold
  further from the centreline
- `glowAmt` — how much halo there is at all. This is the antialiasing; cutting
  it makes lines faint and mushy rather than thin
- `glowFloor` — how much of the halo ignores shading. 1.0 is uniformly smooth
  but kills the crest-thick/trough-thin variation

---

## v0

What's currently written in `water.js`.

    width      1.1
    glowFloor  0.7
    glowAmt    0.55
    beamGain   1.6

Lit lines much fatter than unlit — "little worms".

---

## v1

    glowFloor  0.5
    glowAmt    0.75

Smoothest of the bunch. Halos are wide, water between lines lifts off black.
Keeps the crest-thick/trough-thin variation.

---

## v2

    width      0.85
    glowFloor  0.35
    glowAmt    0.45
    beamGain   0.8

Too far. Cutting glowAmt removed the halo doing the antialiasing, so lines
went faint and mushy rather than thin and crisp.

---

## v3

    width      0.85
    glowFloor  0.5
    glowAmt    0.55
    beamGain   0.7

Lit/unlit gap much smaller and the core stays sharp, but `width 0.85` thinned
the normal waves too — not just the illuminated ones.

---

## v4

    glowFloor  0.5
    beamGain   0.7

v3 without the `width` change, so the normal waves stay at their v0 thickness
and only the lit ones come down.
