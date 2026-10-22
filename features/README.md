# Portfolio features

What a visitor can do on the site, how to reach it, and the calls made about it. Read
this before adding anything: if it's already here, extend it instead of building it
again.

| Feature | File | Platforms | Driveable headless? |
|---|---|---|---|
| Project cards | [cards.md](cards.md) | Desktop, phone | No check yet |
| Demo clips | [clips.md](clips.md) | Recorded on the Mac | No check yet |

## Each file has

- **A stamp** under the title: `Checked 2026-10-22 01:00, at 1.0.0.` When every
  statement was last read against the code, and the site's version (`VERSION`) then.
- **Sub-features**: what a visitor can do inside it, including limits.
- **How to get to it**: the visitor's path.
- **Driving it**: the command that checks it, or why there isn't one yet.
- **Calls**: rulings on this feature, each starting with the time and version it was
  made at, with the reason given at the time. A call
  that holds across the site goes in the Principles in `AGENTS.md` instead.
- **Gotchas**: what has bitten us or will.

Update a feature's file in the same commit that changes the feature.

Check a file's stamp when you read it. If the code you're about to act on changed since
then (`git log --since="<stamp time>" -- <paths>`), reread the file against it, fix
what's no longer true, and re-stamp it. A Call made before its subject changed goes to
the owner, with the case in hand. `./build.sh check` (✓ `doc-stamps`) fails when a
feature file has no stamp, or a stamp, Principle or Call lacks a time and a version the
site has had. The README carries a stamp once someone checks it; until then it's
unchecked.
