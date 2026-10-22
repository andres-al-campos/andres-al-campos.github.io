# Portfolio features

Updated 2026-10-22 02:03, at 1.0.0.

What a visitor can do on the site, how to reach it, and the calls made about it. Read
this before adding anything: if it's already here, extend it instead of building it
again.

| Feature | File | Platforms | Driveable headless? |
|---|---|---|---|
| Project cards | [cards.md](cards.md) | Desktop, phone | No check yet |
| Demo clips | [clips.md](clips.md) | Recorded on the Mac | No check yet |

## Each file has

- **A stamp** under the title: `Updated 2026-10-22 01:00, at 1.0.0.` When the description
  last changed, and the site's version (`VERSION`) then. The pre-commit hook in `hooks/`
  writes it; a change only to the Calls leaves it alone.
- **Sub-features**: what a visitor can do inside it, including limits.
- **How to get to it**: the visitor's path.
- **Driving it**: the command that checks it, or why there isn't one yet.
- **Calls**: what was found in one case on this feature, with the reason given at the
  time, ending with the Principle in `AGENTS.md` it applies (`Applies *Theirs to use*.`)
  or none. The hook starts each with the time and version it was made or reworded at.
- **Gotchas**: what has bitten us or will.

Update a feature's file in the same commit that changes the feature.

Before acting on a file, run `git log --since="<stamp time>"` on the code you're about to
touch. Where it moved after the stamp, read the file against it and fix what's no longer
true; the fix moves the stamp. A Call made before its subject changed goes to the owner,
with the case in hand. `./build.sh` turns the hook on. `./build.sh check` (✓
`doc-stamps`) fails when a feature file or the README has no stamp, a stamp, Principle or
Call lacks a time and a version the site has had, or a Call cites a Principle that
doesn't exist.
