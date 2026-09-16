# Publish next

**STATUS: 181 PENDING — three fixes: a bus already on the Down Sheet can still
raise a recommendation for a different repair, a stale bus search no longer
hides the defect you just wrote, and the full-sweep question after a scan has a
real NO.**

Publish from `ef513c3` (`The full sweep question gets a real NO, and says why it
matters`), the commit directly below this handoff. Derive the range with:

```
git log --oneline 6a98878..HEAD
```

Version 180 was published from `b6e0cba` on 2026-09-15 and is the rollback
point; its tag is `sites-v180`. The one before it is 179 from `fe467c0`.

## What a person will see

Three things.

**1 — RECOMMENDED FOR DOWN SHEET** — the third board on the Down Sheet, and the
`DS Rec` quick filter on the Defect Log — now lists a bus that is already on the
sheet, when the repair being recommended is **not** the one the sheet carries.

**2 — THE SEARCH BOX ON THE DEFECT LOG** now empties itself when it no longer
describes what somebody is doing: search a bus, press LOG DEFECT, pick a
different bus and save, and the board comes back whole with the new record on
it. Before, the board stayed filtered to the number that had been typed and the
record was invisible behind it.

**3 — THE FULL SWEEP QUESTION AFTER A SHEET SCAN** is no longer a browser
confirm() with OK and CANCEL. It is an in-app dialog with **NO** and **YES**.
Answering NO now shows a second message — *"Be aware of any mismatches between
buses on the Fleet Map and the new Down Sheet"* and *"A full yard sweep is
recommended"* — because a scan replaces the sheet while the map stays where it
was. The old second line promising the Status Report is gone; the report was
never gated on a sweep.

Nothing else moves. No screen changes, no other control is renamed, no other
wording changes, nothing is added to or removed from any other list.

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

## The third fix: the full sweep question

> Curtis: "There is not a 'no' for an answer if I am not doing a full sweep of
> the yard."

A `confirm()` offers OK and CANCEL and the browser owns both words. Cancel reads
as backing out of the question rather than answering it, and here the two differ
— NO has something to say.

> "The summary report is ALWAYS READY anyway. At anytime I can send it because
> it's real time snap shot of the fleet's health."

So the line promising the Status Report for ending a sweep is gone.

**What the question is actually for.** A scan REPLACES the sheet and the
Facility Map does not move with it, so right after an import the two can
disagree — a bus in the wrong place, one reading as a mystery bus, one carrying
a number since written against another bus. NO is answered with that warning
rather than with silence.

**Asked by the page, not the scanner**, and that is forced rather than tidy:
importing calls `setScannerOpen(false)`, so a dialog the scanner owned would
unmount before anybody could answer. The `confirm()` it replaces only survived
because it blocks the thread. The question still lands after the import, and
still only when not already mid-sweep.

Driven in Chromium at 390px with the scan endpoint answered locally, so no photo
and no model are involved:

| Step | Result |
| --- | --- |
| after a scan | `FULL SWEEP?` with buttons `["NO","YES"]`, no Status Report line |
| press NO | the mismatch warning + "A full yard sweep is recommended"; `pace-sweep-v1` still unset |
| press YES | `pace-sweep-v1` written with `startedFrom:"scan"` |

Both answers measure 44px tall and share a top of 434px, so they sit side by
side on a phone rather than stacking, where NO would land under a thumb aiming
for YES.

Two mutations fail the new guards: making NO a plain dismiss, and putting the
Status Report promise back.

## Post-publish checks for the sweep question

9. Scan a sheet and import it. The question must offer **NO** and **YES**, not
   OK and Cancel, and must not mention the Status Report.
10. Press **NO**. You should get the mismatch warning and the sweep
    recommendation, and the Facility Map must **not** go into sweep mode.
11. Scan again and press **YES**. The Facility Map should show mid-sweep.
12. Start a sweep on the map first, then scan. The question must **not** appear
    at all — it only asks when you are not already walking.

## Rollback

Roll back to `sites-v180` (`b6e0cba`). None of the three changes writes anything
differently, so a rollback only restores the old hiding rule, the old search
behaviour and the old confirm(). Recommendations made in the meantime keep their
stamps and reappear on the next publish, no defect logged under 181 is lost or
altered, and a sweep started from the new dialog is an ordinary `pace-sweep-v1`
record that 180 reads exactly as it always did.
