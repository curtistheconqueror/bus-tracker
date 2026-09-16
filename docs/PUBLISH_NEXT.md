# Publish next

**STATUS: 181 PENDING — two Defect Log fixes: a bus already on the Down Sheet
can still raise a recommendation for a different repair, and a stale bus search
no longer hides the defect you just wrote.**

Publish from `3b1e0ca` (`A stale bus search ends itself on the Defect Log`), the
commit directly below this handoff. Derive the range with:

```
git log --oneline 6a98878..HEAD
```

Version 180 was published from `b6e0cba` on 2026-09-15 and is the rollback
point; its tag is `sites-v180`. The one before it is 179 from `fe467c0`.

## What a person will see

Two things, both on the Defect Log side of the app.

**1 — RECOMMENDED FOR DOWN SHEET** — the third board on the Down Sheet, and the
`DS Rec` quick filter on the Defect Log — now lists a bus that is already on the
sheet, when the repair being recommended is **not** the one the sheet carries.

**2 — THE SEARCH BOX ON THE DEFECT LOG** now empties itself when it no longer
describes what somebody is doing: search a bus, press LOG DEFECT, pick a
different bus and save, and the board comes back whole with the new record on
it. Before, the board stayed filtered to the number that had been typed and the
record was invisible behind it.

Nothing else moves. No screen changes, no control is renamed, no wording
changes, nothing is added to or removed from any other list.

## The bug

The board dropped any bus with an active Down Sheet entry, whole. The sheet
carries one row per bus, so a bus already on it for one thing could never put a
second thing forward — the DS REC tick saved correctly and had nowhere to
appear.

Curtis found it on **17555**: on the sheet for an air-tank row, with a ramp that
would not lock recommended underneath it, and the board sitting empty.

> "Doesn't mean the guy that's doing the inspection is gonna come across the
> defect. Although they should."

He described it as an inspection case. **It is not only inspections**, and a
rule written about inspections would have left that exact bus broken — 17555's
own row reads as a FAULT to `downSheetScheduledOnly`, because real complaints
are written into it. Measured before the rule was chosen:

| Row | `downSheetScheduledOnly` |
| --- | --- |
| `IDOT Prep – Hose in Air Tank/Axle Shifted / Repair Lights as Needed` | false |
| `A-6 Inspection` | true |
| `A-6 Inspection / misfire` | false — the fault wins, correctly |

## The rule

The grain moves from the **bus** to the **repair**. A recommendation is hidden
only when the sheet is writing to that same record, asked through
`downSheetDefectIds` — the sheet's own answer, the one the Defect Log's badge
already uses — rather than a second rule beside it. That matters because an
entry names its repairs four ways, and a hand-typed entry states no `defectId`
at all.

This is now a finer grain than `isHeldDeferred` uses one board up, which still
asks per bus. Deliberate: a deferral is a fact about the BUS, a recommendation
is a fact about one REPAIR.

## Storage impact: none

No key written, no key read differently, no migration, no record rewritten. The
recommendation stamp is untouched — putting a repair on the sheet still does not
clear who asked for it and when.

## Blast radius, checked before the change

The exported `activeDownSheetBusIds` was called in exactly one place, inside
this module, and nothing imported it. It is gone with the rule it existed for.
The mystery board, the deferred board and the membership counters carry a
same-named PARAMETER and never read that function, so none of them can move.

## Validation completed

- **328 tests pass** in UTC and `America/Chicago`
- `npm run lint` clean, `npm run build` clean, re-run after rebasing onto 180
- Two mutations fail the new guard: restoring the bus-grain skip, and dropping
  the coverage test altogether

Driven in Chromium on the real Down Sheet, seeded with 17555 exactly as
described plus a control bus whose recommended repair IS the row the sheet
carries:

| | 17555 listed | 16001 listed (control) |
| --- | --- | --- |
| before | false | false |
| after | **true** | false |

The control is the half that proves the rule still bites rather than having been
switched off.

## Post-publish checks

1. Down Sheet → **RECOMMENDED FOR DOWN SHEET**. Bus 17555 should now be there,
   naming the ramp, with a WAITING time and the PUT ON DOWN SHEET / NOT FOR THE
   SHEET buttons.
2. Defect Log → `DS Rec` quick filter. Same bus, same list.
3. The control that matters: take a bus whose sheet row IS the recommended
   repair. It must **not** appear. If everything with a DS REC tick now shows,
   the rule has been switched off rather than narrowed.
4. Tick DS REC on a second repair on a bus already on the sheet. It should
   appear within the same card rather than as a second bus.

## The second fix: a stale search

Measured before changing anything — searched `17544`, logged a defect on
`17520`, saved:

```
SEARCH box still holds -> "17544"
counter                -> 0 BUSES SHOWN · 1 HIDDEN BY THIS SEARCH
bus just written to visible? -> false
saved on disk?               -> yes, correctly
```

The record was never at risk. It was invisible, and the only sign was a counter
line.

> Curtis: "my attention drifted elsewhere and the bus I typed in and hit SEARCH
> on may not even be the bus I'm after... the system should just clear that
> search and default back to the entire list with the most recent thing I did."

This does NOT undo "a search ends when somebody says it ends", which is about
TAPPING a bus and still holds. That rule protects a search somebody is still
using; choosing another bus says they are not.

**Two moments, judged on what each one knows.** Picking the bus happens before
any repair is chosen, so only a BUS-NUMBER search is judged there. The first
draft tested the whole record that early and cleared a `brake` search the
instant a bus was picked, before the brake defect it would have matched existed
— found by driving it in a browser, not by reading it. A text search is now left
alone until the save.

Driven in Chromium on a seeded board:

| Case | Search after |
| --- | --- |
| search 20001, log on 20002, save | cleared, and 20002 is visible |
| pick another bus, then CANCEL | cleared |
| pick the very bus being searched | **survives** |
| text `brake`, log a brake defect | **survives** |
| no search at all | nothing breaks |

The last three are the half that proves this narrows the rule rather than
switching the search off.

Two mutations fail the new guards: dropping the save-time clear, and collapsing
the two moments into one.

## Post-publish checks for the search

6. Defect Log → SEARCH a bus → **+ LOG DEFECT** → pick a **different** bus →
   save. The list should come back whole with your new defect at the top.
7. Same, but pick the **same** bus you searched. The search must **stay** —
   otherwise the rule is switched off rather than narrowed.
8. Type a word rather than a number (`brake`), log a brake defect on any bus.
   The search must stay, because it still describes what you just wrote.

## Rollback

Roll back to `sites-v180` (`b6e0cba`). Neither change writes anything
differently, so a rollback only restores the old hiding rule and the old search
behaviour. Recommendations made in the meantime keep their stamps and reappear
on the next publish, and no defect logged under 181 is lost or altered.
