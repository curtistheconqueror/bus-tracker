# Publish next

**STATUS: PENDING — Sites Version 123 is validated and awaiting publication approval.**

This file always describes the next unpublished release, and it lives at this
exact path on `main` so nobody has to be told where to look. Curtis approves a
release by pointing Codex at this file rather than pasting a summary out of a
chat window.

- **Claude Code** keeps this file current with every push to `main`: the source
  commit, what changed, any migration, and what to check once it is live. Claude
  Code never publishes and never marks a version live.
- **Codex** publishes from here, then in the same follow-up commit updates
  `docs/RELEASES.md` and `PROJECT_HANDOFF.md` and replaces this file with the
  next handoff, or resets it to `STATUS: NONE PENDING`.
- **STATUS: NONE PENDING** means everything on `main` is already live and there
  is nothing to publish. Read the status line before anything else.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` for the lifecycle itself; this file
supplies only what that runbook asks for — the exact source, what changed, and
what to check once it is live.

---

## Source

| Field | Value |
| --- | --- |
| Release source | the current tip of `origin/main` |
| Last code-bearing commit | `8acf8f1` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 122, `cd6b649` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 8acf8f1..origin/main` that
nothing but `docs/` changed after `8acf8f1`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed. This work was written before Version 122 landed and was replayed on top
of it rather than merged over it, so nothing published is disturbed.

Gate: 124 tests passing, ESLint clean, production build succeeds.

## What changed

### The three reports now say they are reports

No behaviour changed here — this is wording, and it is worth a release on its
own. Four buttons in this app write a file and only one of them can be read back
in, but they read as variations on the same idea, so the difference only
surfaced on the day somebody tried to restore a phone from the wrong one and
found out it had been a report all along.

```
EXPORT LOG            ->  EXPORT LOG REPORT        (Defect Log settings)
EXPORT FIXED HISTORY  ->  EXPORT HISTORY REPORT    (Fixed Repairs)
DOWNLOAD .TXT         ->  DOWNLOAD REPORT (.TXT)   (Fleet Campaigns)

EXPORT / SHARE BACKUP     unchanged — still the only restorable file
```

Each report also carries the long version as a tooltip, drawn from one shared
string that lives beside the backup itself, so three buttons cannot drift into
describing the same limitation three different ways.

The files themselves are unchanged and the reports stay useful — a report is how
the log reaches another device, or somebody else's hands to read. Restoring is
the only thing it cannot do, and the import already refuses one safely with
**"This file is not a valid fleet board backup. No changes were made."**

### The backup reminder is one card, and the shop sets its cadence

The banner was a heading and a button side by side in two colours, and on any
screen wide enough to keep them on one line it read as a second popup shoved on
top of the first. It is now **one card in one colour, read top to bottom** —
what happened, then the thing to press, full width at the bottom. The button
keeps the darker colour because it is the action.

The overlap was not spacing. `globals.css` styles a bare `aside` as a fixed
255px panel pinned top right, and absolutely positions any button directly
inside one into its corner. That is written for the map's floating panel, and
this banner inherited all of it purely by being an `<aside>` — which is why the
card was 255px wide on a 1024px iPad with EXPORT FULL BACKUP flung into its
corner, across the sentence it belongs under. The card and its button now undo
that explicitly.

**The cadence is a setting.** Defect Log settings gains **REMIND ME TO BACK UP
EVERY**, offering 5, 10, 20, 30, 50 or 100 new defects and defaulting to the
twenty it has always used. Changing it re-asks immediately rather than at the
next save, so lowering it brings the banner up and raising it sends it away.

There is deliberately **no "never"** — a backup nobody is ever nudged towards is
the failure this banner exists to prevent, so the loosest setting still asks,
just rarely. Anything not on the list falls back to twenty.

## Migration and data safety

Label text, one layout fix, and one new optional setting. No LocalStorage key renamed, no stored record touched, no export payload
altered, and no catalog entry added, renamed or retired. A file written by the
previous version imports exactly as it did before.

The Defect Log settings record gains one optional field, `backupInterval`. A
device that has never seen it reads as twenty, which is the interval it has been
using all along, so nobody's reminder changes cadence on publish.

## Validation

- Production build passed
- All 124 regression tests passed, including a new one asserting that each of the
  three report buttons says REPORT, that none of them says BACKUP, that each
  carries the shared hint, and that the Facility Map backup button is unchanged
- ESLint passed
- Verified in a browser at phone (390px) and computer (1280px) width that every
  renamed label fits its button with no clipping and no sideways page scroll —
  the labels got longer, which is the one thing that could have gone wrong
- Verified separately that a full export, a complete `localStorage` wipe, and an
  import brings back buses, their map locations, defects, the Down Sheet, parts
  memory, findings memory and campaign lists
- Measured the reminder at 390, 768, 1024 and 1440: the card fills its column at
  every width and the button sits below the text with no overlap. **Before the
  fix all four widths overlapped**, which is the defect this release closes
- Drove the new setting in a browser: raising it to 50 with 25 defects logged
  hid the banner, lowering it to 5 brought it straight back, the choice survived
  a reload, and a junk value written into storage fell back to 20

## After it is live

1. Open **Defect Log → ⚙ settings** and confirm the button reads **EXPORT LOG
   REPORT**.
2. Confirm **Fixed Repairs** reads **EXPORT HISTORY REPORT**, and **Fleet
   Campaigns** with a list open reads **DOWNLOAD REPORT (.TXT)**.
3. Confirm none of the three is clipped on a phone.
4. Confirm **Facility Map → ⚙ settings** still reads **EXPORT / SHARE BACKUP**
   and still exports and imports normally. That is the only real backup and
   nothing in this release should have touched it.
5. **On the iPad**, where the overlap was reported: log enough defects to raise
   the OFFLINE BACKUP DUE banner and confirm it is one full-width card with
   EXPORT FULL BACKUP sitting below the sentence, not across it.
6. In **Defect Log → ⚙ settings**, set **REMIND ME TO BACK UP EVERY** to a
   smaller number and confirm the banner appears without needing another save,
   then to a larger one and confirm it goes away.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 123 | Live | <published tip hash> | The three export reports renamed so only the restorable backup reads like a backup, and the offline backup reminder rebuilt as one card with its cadence set in Defect Log settings |
```
