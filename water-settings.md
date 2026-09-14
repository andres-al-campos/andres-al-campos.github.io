# water settings

Named versions of the line-rendering tuning. Each block lists its complete set,
so you can read one without opening anything else.

These are the params that control how the lines look. The other ~65 in
`water.js` — wave sim, wind, cliff, haze — are the same in every version here.

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

    width      1.1     widthNear  0.45
    glow       3.0     glowAmt    0.55    glowFloor  0.7
    beamGain   1.6     beamLift   1.6     beamWarm   1.0    beamSat  0.72
    dimFar     0.30    bright     0.95    crest      1.4    lines    70

Lit lines much fatter than unlit — "little worms".

---

## v1

    width      1.1     widthNear  0.45
    glow       3.0     glowAmt    0.75    glowFloor  0.5
    beamGain   1.6     beamLift   1.6     beamWarm   1.0    beamSat  0.72
    dimFar     0.30    bright     0.95    crest      1.4    lines    70

Smoothest of the bunch. Halos are wide, water between lines lifts off black.
Keeps the crest-thick/trough-thin variation.

---

## v2

    width      0.85    widthNear  0.45
    glow       3.0     glowAmt    0.45    glowFloor  0.35
    beamGain   0.8     beamLift   1.6     beamWarm   1.0    beamSat  0.72
    dimFar     0.30    bright     0.95    crest      1.4    lines    70

Too far. Cutting glowAmt removed the halo doing the antialiasing, so lines
went faint and mushy rather than thin and crisp.

---

## v3

    width      0.85    widthNear  0.45
    glow       3.0     glowAmt    0.55    glowFloor  0.5
    beamGain   0.7     beamLift   1.6     beamWarm   1.0    beamSat  0.72
    dimFar     0.30    bright     0.95    crest      1.4    lines    70

Lit/unlit gap much smaller and the core stays sharp, but `width 0.85` thinned
the normal waves too — not just the illuminated ones.

---

## v4

    width      1.1     widthNear  0.45
    glow       3.0     glowAmt    0.55    glowFloor  0.5
    beamGain   0.7     beamLift   1.6     beamWarm   1.0    beamSat  0.72
    dimFar     0.30    bright     0.95    crest      1.4    lines    70

v3 without the `width` change, so the normal waves stay at their v0 thickness
and only the lit ones come down. Approved.
