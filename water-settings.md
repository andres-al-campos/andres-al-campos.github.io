# water settings

Named versions of the water tuning. Only the values that differ from the
defaults in `water.js` are listed.

To use one: say "use thin2" (or whichever) and I'll apply it.
To save the current sliders as a new one: say "save this as <name>".

---

## file

What's currently written in `water.js`.

    width      1.1
    glowFloor  0.7
    glowAmt    0.55
    beamGain   1.6

Line thickness varies a lot between lit and unlit — "little worms".

---

## smooth

    glowFloor  0.5
    glowAmt    0.75

Smoothest of the bunch. Halos are wide, water between lines lifts off black.
Keeps the crest-thick/trough-thin variation.

---

## thin

    width      0.85
    glowFloor  0.35
    glowAmt    0.45
    beamGain   0.8

Too far. Cutting glowAmt removed the halo doing the antialiasing, so lines
went faint and mushy rather than thin and crisp.

---

## thin2

    width      0.85
    glowFloor  0.5
    glowAmt    0.55
    beamGain   0.7

Thinner, core stays sharp, lit/unlit gap much smaller. Current live values.
