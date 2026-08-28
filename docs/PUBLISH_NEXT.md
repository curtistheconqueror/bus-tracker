# Publish next

**STATUS: PENDING — Sites Version 118 is validated and awaiting publication approval.**

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
| Last code-bearing commit | `cd97a16` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 117, `ff62fa3` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline cd97a16..origin/main` that
nothing but `docs/` changed after `cd97a16`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed.

Gate: 118 tests passing, ESLint clean, production build succeeds.

## What changed

### A Down Sheet entry now reaches Fixed Repairs with the repair on it

The Defect Log has a straight path to Fixed Repairs through SAVE AS FIXED. The
Down Sheet had none. Flipping workflow to **Completed** set the state and a
timestamp and wrote nothing else, so a scheduled repair arrived in Fixed Repairs
as an empty shell — no technician, no fix, no time, no cause.

Choosing Completed now opens the same fields the Defect Log completion uses, **on each repair**:

- FIX / STEPS TAKEN
- WHAT WAS FOUND, with the learned-cause chips
- REPAIR HOURS and DIAGNOSTIC HOURS

**Every field is optional**, and a test holds that none is required. A foreman
closing out ten buses at end of shift must not be made to fill in a form to move
a dropdown.

**FIXED BY sits on the entry, and the assigned mechanic stands in for it.** This was the worst of it:
the sheet already knew who had the bus, in the very field it schedules work
with, and dropped it, so every completed entry was unattributed. A **vendor**
does not stand in — their name in that field would read as somebody in this shop
having done the work.

The cause is learned into the same memory the other two surfaces feed, so a Down
Sheet diagnosis teaches the catalog exactly as a Defect Log one does.

### Diagnostic time starts at one hour

Shop policy: finding a fault takes an hour before it takes anything else, and a
fifteen-minute figure is somebody guessing rather than reading a meter. Typing
`0.25` now yields `1`. Applied in all three editors where time is typed, and
deliberately **not** inside `normalizeDefects` — running it there would round
every historical half-hour up and rewrite what those repairs say they cost.
Blank still means no time recorded, not one hour.

### A doubled repair line in Fixed Repairs

One repair on an entry produced a reason of "Brakes — Air brake fault", which
became the defect's details and read back as that phrase twice over. A single
repair's details are now just its details; the category and issue already say
the rest.

### One repair on the sheet is now one defect on the bus

An entry with three repairs used to become **one** record — the first card's
category and repair, with the other two joined into its details. A bus scheduled
for brakes, A/C and a door arrived in Fixed Repairs as a single record filed
under brakes, and the other two could not be filtered, counted, or given their
own parts and hours. Each card now writes its own defect.

That forced the completion fields onto the **card** rather than the entry:
recorded once on the entry, two hours would have been billed three times over as
each repair became its own record. FIXED BY stays on the entry, because one
person signs an entry off.

**Identity is the delicate part, and it is worth checking after publish.** An
entry stored before repair cards existed gets a freshly generated card id on
every read, so keying its defect on that id would mint a new defect on every
save. The first card adopts the defect already on the bus instead, which keeps
every live record's history and holds still across those regenerated ids.

**Taking a repair off the sheet does not delete its defect.** Coming off a sheet
is not being repaired, and the bus still has the fault.

### The estimate is one line, with the breakdown behind a tick

Seven buckets under every repair made an entry with three repairs a page nobody
would read. The line carries the whole estimate — `repairTimeTotal`, not just the
main bucket — so keeping the breakdown shut hides no number, and typing into it
moves the main bucket and leaves the catalog's seeded diagnosis and access
minutes alone.

Opening the breakdown automatically wherever one of the other six was non-zero
was tried first and did nothing: the catalog seeds those minutes the moment a
repair is picked, so every card opened and the form was exactly as long as
before.

## Migration and data safety

No LocalStorage key renamed and no stored record rewritten. The Down Sheet entry gains
one optional field (`completedBy`) and each repair card gains four
(`actionTaken`, `finding`, `repairHours`, `diagnosticHours`); an entry saved
before this release simply has none of them and reads exactly as it did. The one-hour diagnostic floor is
applied at entry only, never on read.

## Validation

- Production build passed
- All 118 regression tests passed, including a legacy-entry case that saves twice with two different generated card ids and checks the original record's created date survives both
- ESLint passed
- Verified end to end in a browser at phone width: scheduled a brake repair,
  assigned CJ, set workflow to Completed, confirmed FIXED BY prefilled with CJ,
  typed `0.25` diagnostic hours and watched it become `1`, saved, and confirmed
  the bus record carried state, completedBy, actionTaken, finding, repairHours
  and diagnosticHours, that the cause was learned, and that Fixed Repairs showed
  the fix and the technician with no doubled line

## After it is live

1. On the **Down Sheet**, open an entry, assign a mechanic, and set REPAIR
   WORKFLOW to **Completed**. A green WHAT WAS DONE block should appear.
2. Confirm **FIXED BY** is already filled with the assigned mechanic, and that
   changing ASSIGNMENT TYPE to Vendor leaves it blank instead.
3. Type `0.25` into DIAGNOSTIC HOURS and confirm it becomes `1`.
4. Save with the block left completely empty and confirm it still saves — none
   of those fields may be required.
5. Open **Fixed Repairs** and confirm the entry shows FIX / STEPS TAKEN, FIXED
   BY, and the finding, with the repair line reading once rather than twice.
6. Log a different bus with the same repair in the **Defect Log** and confirm
   the cause learned from the Down Sheet is offered as a chip.
7. Put **three different repairs** on one entry, complete it, and confirm
   **three** separate cards appear in Fixed Repairs with their own hours — not
   one card filed under the first repair.
8. **Open an entry that already existed before this release, save it, and save
   it again.** The bus must still show the same number of defects, with their
   original logged dates. A duplicate appearing here means the first card is not
   adopting the existing record and the release should be pulled.
9. Confirm each repair shows **ESTIMATED HOURS** as a single line, with the
   seven-way breakdown appearing only after ticking BREAK THE ESTIMATE DOWN.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 118 | Live | <published tip hash> | Each Down Sheet repair is now its own defect and its own Fixed Repairs record, closing out with the fix, finding, hours and technician on it; the estimate collapses to one line with the breakdown behind a tick; diagnostic time starts at one hour |
```
