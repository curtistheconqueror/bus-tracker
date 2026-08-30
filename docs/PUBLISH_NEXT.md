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
| Last code-bearing commit | `07d55bb` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 122, `cd6b649` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 07d55bb..origin/main` that
nothing but `docs/` changed after `07d55bb`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed. This work was written before Version 122 landed and was replayed on top
of it rather than merged over it, so nothing published is disturbed.

Gate: 126 tests passing, ESLint clean, production build succeeds.

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

EXPORT / SHARE BACKUP ->  EXPORT ALL DATA          (Facility Map settings)
IMPORT BACKUP         ->  IMPORT ALL DATA          (Facility Map settings)
```

Each report also carries the long version as a tooltip, drawn from one shared
string that lives beside the backup itself, so three buttons cannot drift into
describing the same limitation three different ways.

The files themselves are unchanged and the reports stay useful — a report is how
the log reaches another device, or somebody else's hands to read. Restoring is
the only thing it cannot do, and the import already refuses one safely with
**"This file is not a valid fleet board backup. No changes were made."**

### A section can move between devices on its own

The full backup is all or nothing, which is the wrong shape for what actually
happens: a phone holding today's Defect Log and last week's map, an iPad holding
today's map and last week's log. Importing either whole backup throws away the
half the other device did better, so in practice neither ever gets imported and
both devices drift. That is the position the shop is in today.

Each section now exports and imports on its own:

```
Defect Log settings     EXPORT / IMPORT DEFECT LOG
Down Sheet settings     EXPORT / IMPORT DOWN SHEET
Facility Map settings   EXPORT / IMPORT FLEET MAP
```

The Defect Log and the Fleet Map are **not separate stores** — they are
different fields on the same bus record — so "send me only the defects" merges
field-wise into records the other device already has rather than replacing a
file. Nothing replaces wholesale:

- Defects merge by their own id; incoming wins where both have the same one, and
  a defect only the receiving device has is **kept**.
- Sending a map never touches defects. Sending defects never moves a bus.
- A bus the receiving device has never seen is **added** by a map transfer,
  which carries a location, and **reported** by a defect transfer, which does
  not — guessing a parking space that may be full is not its call.
- Buses match on **fleet number** first, because two devices seeded separately
  give the same bus different ids.

A wrong file now names the right page instead of "not valid": a Fleet Map file
on the Defect Log says to import it on the Fleet Map, a report says it is a
report, and a full backup points at IMPORT ALL DATA.

**The Down Sheet keeps deciding what is down.** Active Down Sheet rows are the
source of truth for the DS badge — entries arrive off a photographed sheet or
typed by hand, and the map reads that membership rather than deciding it. A
Fleet Map transfer therefore carries **no** opinion about down status: `down`,
`onDownSheet` and `downSheetReady` are stripped on the way out and again on the
way in, so an older or hand-edited file cannot assert one. A bus arriving with a
map lands not-down and gets its badge when a Down Sheet transfer brings the
entry.

This is the single most important behaviour in the release. Two bugs were found
and fixed against it, both reproduced in a browser:

- A map exported **before** a bus went on the sheet said `down:false`, and
  importing it stripped the badge off a bus whose Down Sheet entry was sitting
  right there — the map reconciles only when entries change, and an import does
  not change them.
- Imported Down Sheet entries went into state raw rather than through the
  normalizer hydration uses, so an entry without a `timeEstimate` **crashed the
  page** and the import took nothing at all.

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

One new optional setting, one layout fix, label text, and a new pair of buttons
per section that write and read their own file kind. No LocalStorage key renamed, no stored record touched, no export payload
altered, and no catalog entry added, renamed or retired. A file written by the
previous version imports exactly as it did before.

The Defect Log settings record gains one optional field, `backupInterval`. A
device that has never seen it reads as twenty, which is the interval it has been
using all along, so nobody's reminder changes cadence on publish.

The section transfers add three new file kinds and read nothing that already
exists on disk differently. **An import merges; it never truncates.** The two
ways it could have gone wrong — a map import clearing the receiving device's
Defect Log, and a map import clearing its DS badges — are both covered by tests
and were both checked in a browser.

## Validation

- Production build passed
- All 126 regression tests passed, including a new one asserting that each of the
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
- Ran the transfer as **two devices** end to end: a phone exported its Defect
  Log, the iPad imported it and kept its own map and mechanic; the iPad exported
  its Fleet Map, the phone imported it and took the positions while keeping every
  one of its own defects and gaining a bus it had never seen. Both halves matched
  afterwards, which is the whole point of the feature
- Confirmed a Fleet Map file dropped on the Defect Log importer says so by name
- Drove the new setting in a browser: raising it to 50 with 25 defects logged
  hid the banner, lowering it to 5 brought it straight back, the choice survived
  a reload, and a junk value written into storage fell back to 20

## After it is live

1. Open **Defect Log → ⚙ settings** and confirm the button reads **EXPORT LOG
   REPORT**.
2. Confirm **Fixed Repairs** reads **EXPORT HISTORY REPORT**, and **Fleet
   Campaigns** with a list open reads **DOWNLOAD REPORT (.TXT)**.
3. Confirm none of the three is clipped on a phone.
4. Confirm **Facility Map → ⚙ settings** reads **EXPORT ALL DATA** and
   **IMPORT ALL DATA**, and still exports and imports the whole board.
5. **On the iPad**, where the overlap was reported: log enough defects to raise
   the OFFLINE BACKUP DUE banner and confirm it is one full-width card with
   EXPORT FULL BACKUP sitting below the sentence, not across it.
6. In **Defect Log → ⚙ settings**, set **REMIND ME TO BACK UP EVERY** to a
   smaller number and confirm the banner appears without needing another save,
   then to a larger one and confirm it goes away.
7. **The transfer, on the two devices that actually differ.** From the phone,
   EXPORT DEFECT LOG and import it on the iPad; confirm the iPad's bus positions
   did **not** move and its defects now match the phone's. Then from the iPad,
   EXPORT FLEET MAP and import it on the phone; confirm the phone's positions
   now match the iPad's and **its defects are still there**. A defect list that
   empties after a map import is the one failure worth pulling the release for.
8. Import a Fleet Map file on the Defect Log page and confirm it says to import
   it on the Fleet Map page rather than "not valid".
9. **The Down Sheet rule, which matters more than the rest of this release.**
   Put a bus on the Down Sheet. Then import an older Fleet Map taken before it
   went on. Confirm the bus **moves to its new spot and keeps its DS badge**. A
   badge that disappears here means the map is overruling the sheet and the
   release should be pulled.
10. On a device with an empty sheet, import a Down Sheet from another device and
    confirm the entries land, the rows render, and the buses pick up the badge.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 123 | Live | <published tip hash> | Per-section export and import so the Defect Log, Down Sheet and Fleet Map move between devices independently and merge rather than replace; the whole-app pair renamed to ALL DATA; the three reports renamed so only restorable files read like backups; and the backup reminder rebuilt as one card with a settable cadence |
```
