# Publish next

**STATUS: 181 PENDING — a bus already on the Down Sheet can still raise a
recommendation for a different repair.**

Publish from `e283c26` (`A bus already on the sheet can still raise a
recommendation`), the commit directly below this handoff. Derive the range with:

```
git log --oneline 6a98878..HEAD
```

Version 180 was published from `b6e0cba` on 2026-09-15 and is the rollback
point; its tag is `sites-v180`. The one before it is 179 from `fe467c0`.

## What a person will see

**RECOMMENDED FOR DOWN SHEET** — the third board on the Down Sheet, and the
`DS Rec` quick filter on the Defect Log — now lists a bus that is already on the
sheet, when the repair being recommended is **not** the one the sheet carries.

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

## Rollback

Roll back to `sites-v180` (`b6e0cba`). Nothing is written differently, so a
rollback only restores the old hiding rule — recommendations made in the
meantime keep their stamps and reappear on the next publish.
