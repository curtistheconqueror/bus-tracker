# Publish next

**STATUS: PENDING — Sites Version 119 is validated and awaiting publication approval.**

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
| Last code-bearing commit | `7cdc0f1` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 118, `6f45d14` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 7cdc0f1..origin/main` that
nothing but `docs/` changed after `7cdc0f1`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed.

Gate: 121 tests passing, ESLint clean, production build succeeds.

## What changed

### A repair on the Down Sheet finishes on its own day

Version 118 split an entry into one defect per repair but left the workflow on
the entry, so the repairs still could not finish apart. Brakes done Monday and
the A/C still open meant the whole entry stayed open, none of Monday's work could
be written down, and its fix fields did not appear until the last repair closed.

Each repair card now carries its own **MARK THIS REPAIR FINISHED** tick, and its
fix, finding and hours appear the moment it is ticked.

- The bus stays down while any repair on it is still open.
- Each defect keeps the day it was **actually** finished, not the day the entry
  was closed.
- Ticking the **last** repair closes the entry, because a bus with everything
  done must not sit on the sheet as active work. Unticking one reopens it.
- Setting the entry to **Completed** still marks every card, which is what keeps
  closing out ten buses at end of shift a dropdown rather than a checklist.

The sheet row reads **1 OF 2 DONE**. Without it a bus with half its work finished
looked exactly like one nobody had touched, which is the thing a foreman scans
the sheet for.

### Belts, pulley alignment, and air bags that get counted

A round of catalog additions, and one of them needed a number to go with it.

**Engine** gains heat as a scale, directly under the three dash lights, in the
order it climbs:

```
Engine runs hot (207F+)
Overheating
Overheat shutdown (235-240F)
```

One entry could not tell a bus running eight over from one whose engine shut
itself down on the road, and those are different jobs with the same words. The
numbers live in the labels rather than in a temperature field, because a field
records what somebody already knew while a label teaches the threshold to
whoever is picking — which is the half that narrows the diagnosis.

**The shutdown starts as Remove From Service**; the engine has already taken the
bus off the road at that point. Running hot and Overheating stay in service on
purpose, because eight or ten over finishes the day.

Cooling System keeps its own **Overheating** deliberately — the two are the same
word about different moments, the complaint that came in and the system the
fault turned out to be in — and no stored record is remapped between them.
Causes stay free text; the learned catalog offers back whatever this shop
actually finds under it.

**Engine** also gains **Coolant leak**, directly under Overheating, for the same
reason and with the same deliberate overlap: a seal or a freeze plug is reported
as an engine problem, a radiator or a hose as a cooling one.

**Engine** also gains the accessory drive as one block — **Water pump belt**,
**Alternator belt**, **Water pump pulley**, **Tensioner pulley**, **Fan drive
pulley**, in that order. A pulley listed away from its belt is a pulley nobody
scrolls to while already looking at the belt. The fan drive pulley fails often
enough to deserve its own line instead of arriving as "Other engine repair",
where nothing can count it. Cooling System keeps the water pump itself, so the
belt, the pulley and the pump stay separate jobs rather than one entry that
could mean any of them.

**Battery, Starting and Charging** gains **Voltage regulator** and **Alternator
failure**, placed fourth and fifth — above the no-start symptoms — because they
fail often and burying a frequent failure under the whole list costs a scroll
every time.

The old **Alternator / charging** is **retired from the picker**. Two alternator
entries in one dropdown is a coin flip for somebody standing at a bus, and once
those two exist it has no job left that "Starting / charging diagnosis" and
"Other starting or charging repair" are not already doing. It is dropped rather
than pointed at Alternator failure: a rename would restate every record already
logged under it as a confirmed failure, and nobody made that call. **Records
keep the exact words they were saved with**, and every picker offers the stored
value back as logged — including the Down Sheet repair card, which had no such
option and would have rendered an empty select on an entry carrying a retired
name, which is how somebody ends up picking something else over the top of it.

### The split surge tank, and a winter list built in the warm months

The 17s, 18s and 20s carry a split coolant surge tank: an **engine side** and a
**heating side** that feeds cabin heat, and the two do not drain into each other.
One entry could not say which half was empty, so **Cooling System** now carries
three, directly under Coolant leak:

```
Surge tank - engine side low
Surge tank - heating side low
Surge tank - both sides low
```

Picking the **heating side** shows a note saying the two halves are independent,
because a mechanic who does not know that tops up the side he can see and walks
away from a bus that will have no heat in December. **Both sides low** carries
its own note: two halves that cannot drain into each other going down together
points at a leak somewhere they share, which is a different job from two
top-ups. Where those shared points are is not modelled yet, pending confirmation.

Each side records **COOLANT ADDED** in quarts, optional, on all three surfaces.
Two quarts on Monday and two more on Thursday is a leak; one quart once is a
top-up, and the words alone cannot tell those apart a month later.

**QUICK FILTERS gains "Potential No Cabin Heat"**, which is the point of the
distinction. The heating side can sit empty all summer without anything about
the bus being wrong, and the first cold morning turns that into a queue rather
than a plan. The list copies and shares like the others, so it hands off to
whoever schedules the work.

It matches the **repair**, not the word "heat" — which also appears in Amerex
heat sensors, in Overheating, and in half the estimate notes in the fleet. A
winter list that returns an overheating bus is one somebody checks once and then
stops trusting. It returns heating-side and both-sides tanks plus **Heater /
defroster**, and nothing else.

**A/C and HVAC** gains **A/C belt** and **A/C compressor pulley misaligned**.
The second is why the first keeps coming back: a compressor pulley out of line
with the crank pulley eats belts, so a belt fitted without checking it is a
repeat repair. Picking it shows a note to lay a straight edge across the two
before ordering one.

**Air System** gains **Leaking air bag - Front C/S**, **Front R/S** and
**Rear**, and these are counted. The leak shows at one corner while the bags
come off in pairs, so how many actually went on is a fact nobody can
reconstruct from the words later. The picker offers up to two on the front axle
and four on the rear — the ceiling belongs to the axle, not the bus — and it is
optional, because the number is known when the bags go on rather than when the
leak is found. It records on all three surfaces: the Defect Log, the Down Sheet
repair card, and the Fixed Repairs editor, which is often where the number is
known because the bus is only back together at that point.

The count is not new machinery. Radiator fans were already counted, by a
category test written into the Defect Log form; air bags would have been a
second copy of it in three places. That test is now one row of a table in the
catalog, so every form reads the field from the same place. Fans keep their
1-8 picker and stay required.

## Migration and data safety

No LocalStorage key renamed and no stored record rewritten. Each repair card
gains one optional field (`done`), and a second (`quantity`) for the repairs
that carry a count.

Two ways a count could have read wrong are closed, both at read time:

- The defect label fell back to **quarts** where a record carried no unit, a
  fallback the engine-oil entry left behind. Two air bags would have read as
  "2 quarts". It now asks the catalog for the repair's own unit first.
- A count no longer follows a repair **retyped** as something uncounted — "2
  replaced" left on an air dryer is a lie — while an engine-oil quantity, which
  no count field governs, is left exactly as the Defect Log wrote it.

### A fix that goes beyond the new entries

Both Facility Map defect pickers tested for **Interior Cleaning by name** before
consulting the catalog's downing table. That was written when cleaning was the
only row in it, and stayed narrow as the Amerex entries were added in an earlier
release — so on that surface a **Significant Leak** or a discharged fire
suppression system has been opening on *May Stay In Service* while the Defect
Log had it right. Both pickers now read the table for whatever category is
picked, which is also what makes the new overheat shutdown work there.

Worth knowing because it changes behaviour for repairs that already shipped, not
only the new ones. A defect already saved is untouched; only what the picker
*opens on* changes, and a choice made after picking is still left alone.

**An entry saved before this release reads as all repairs done wherever its
workflow was already Completed**, so publishing does not reopen every finished
repair on the sheet — that is the one behaviour worth confirming first after
publish.

## Validation

- Production build passed
- All 121 regression tests passed, including a two-day case: one repair finished
  Monday keeps Monday's completion date after the second finishes on Wednesday
- ESLint passed
- Verified end to end in a browser at phone width: two repairs on one entry,
  ticked only the brakes, confirmed its fix block appeared alone, saved, and
  confirmed the brake defect completed with CJ and 2 hours while the A/C stayed
  open and the bus stayed down; then ticked the second and watched the workflow
  roll up to Completed and the bus come off
- Verified the new repairs in a browser at phone width: logged **Leaking air bag
  - Rear** with **4** replaced and confirmed the card reads "Air System —
  Leaking air bag - Rear — 4 replaced", not "4 quarts"; scheduled **Front C/S**
  on a Down Sheet entry, confirmed its picker offered only 1 and 2, ticked it
  finished and watched it reach Fixed Repairs reading "2 replaced"; confirmed an
  engine-oil record keeps its 10 quarts across an edit and shows no count field;
  and confirmed retyping an air bag record as an air dryer drops the count

## After it is live

1. **Open a Down Sheet entry that was already Completed before this release and
   confirm every repair on it still reads finished.** If any reopened, the
   migration is wrong and the release should be pulled.
2. Put two repairs on an entry. Tick **MARK THIS REPAIR FINISHED** on one only.
3. Confirm the fix fields appear on that repair alone, and that the other repair
   shows none.
4. Save, and confirm in Fixed Repairs that the finished repair is there while the
   other is still open on the sheet, with the bus still down.
5. Confirm the sheet row reads **1 OF 2 DONE**.
6. Tick the second repair and confirm REPAIR WORKFLOW moves to **Completed** by
   itself and the bus comes off the down list.
7. Untick one and confirm the entry reopens as **In Progress**.
8. On a different entry, set REPAIR WORKFLOW straight to **Completed** and
   confirm every repair on it is marked finished in one move.
9. In the Defect Log, pick **Air System → Leaking air bag - Rear** and confirm
   **AIR BAGS REPLACED** offers 1 through 4, then **Front C/S** and confirm it
   offers only 1 and 2.
10. Save one with a count and confirm the card reads **"— 2 replaced"** and not
    "2 quarts". A record reading quarts means the unit fallback is wrong.
11. Confirm **Cooling System → Radiator fan(s) out** still offers 1 through 8
    and still refuses to save without one.
12. Pick **A/C and HVAC → A/C compressor pulley misaligned** and confirm the
    straight-edge note appears under the picker.
13. Confirm **Engine** lists **Engine runs hot (207F+)**, **Overheating**,
    **Overheat shutdown (235-240F)** then **Coolant leak** just under the three
    dash lights, and that **Cooling System** still lists its own Overheating
    and Coolant leak.
14. Pick **Overheat shutdown (235-240F)** and confirm BUS AVAILABILITY opens on
    **Remove From Service**, then pick **Engine runs hot (207F+)** and confirm it
    opens on **May Stay In Service**. Do this in the Defect Log *and* in the
    Facility Map defect picker, which is the surface the fix above changes.
15. In the Facility Map picker, pick **Amerex - Gas Concentration - Significant
    Leak** and confirm it now opens on **Remove From Service**. Before this
    release it opened on May Stay In Service there.
16. Confirm **Engine** runs **Water pump belt, Alternator belt, Water pump
    pulley, Tensioner pulley, Fan drive pulley** as five consecutive entries.
17. Confirm **Battery, Starting and Charging** lists **Voltage regulator** then
    **Alternator failure** fourth and fifth, above **No crank**, and that
    **Alternator / charging** is no longer offered as a fresh choice.
18. **Open a repair already logged as "Alternator / charging"** — on the Down
    Sheet, in the Defect Log, and in Fixed Repairs — and confirm each one still
    shows those exact words rather than an empty picker, and that saving it
    without editing leaves the record unchanged. This is the one thing worth
    checking first, because it is what retiring an entry could break.
19. In **Cooling System**, confirm the three **Surge tank** entries sit directly
    under Coolant leak, that picking **heating side** or **both sides** shows its
    note, and that each offers **COOLANT ADDED** in quarts.
20. Open **QUICK FILTERS → Potential No Cabin Heat** on a real fleet and read the
    list. It should hold buses with a heating-side or both-sides tank and buses
    with a Heater / defroster defect — **and no overheating buses**. If an
    overheating bus appears, the filter is matching the wrong thing.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 119 | Live | <published tip hash> | Each Down Sheet repair finishes on its own day with its own fix, hours and completion date, and the row shows how many are done; engine heat as a scale from runs hot at 207F to an overheat shutdown that removes the bus from service, engine coolant leak, the accessory drive belts and pulleys, A/C belt and compressor pulley misalignment, voltage regulator and alternator failure replacing the vaguer alternator entry, leaking air bags front and rear with a count of how many were replaced, and the split coolant surge tank as two independent sides with a Potential No Cabin Heat quick filter for the winter list |
```
