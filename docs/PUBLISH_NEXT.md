# Publish next

**STATUS: 181 PENDING — the Down Sheet stops calling every bus down, plus four
smaller fixes.**

Publish from `148a45e` (`USING THIS ONE: a soft bus put on a run stops counting
against pullout`). Derive the range with:

```
git log --oneline 6a98878..HEAD
```

Version 180 was published from `b6e0cba` on 2026-09-15 and is the rollback
point; its tag is `sites-v180`. The one before it is 179 from `fe467c0`.

## What a person will see

### 1 — The Down Sheet tells the truth about the pullout number

One number became four. On the shop's real sheet of 52 rows:

```
DOWN BUSES     41     cannot run
SOFT DOWN       4     on the sheet, and the sheet says they still run
DOWN + SOFT    45     the shortage
IDOT DUE        5     a date, not a fault — counted nowhere
```

`SOFT` also rides beside the lead number in the collapsed header, so the press
that opens the tiles is not needed to learn that some of those buses can work.

**Two new boards**, beside MYSTERY / DEFERRED / RECOMMENDED and collapsed by
default: **SOFT DOWN — CAN STILL BE USED** and **IDOT — STATE INSPECTION DUE**.

**A switch on each soft row** — `USING THIS ONE` — takes that bus out of the
shortage and stamps who decided. It **travels between devices**.

**IDOT-only rows leave the sheet body.** A bus whose whole entry is PREP FOR
IDOT no longer has a row; it is on the IDOT board instead. A row that is IDOT
*and* a fault keeps its row.

**`IDOT Prep` is now in the Inspection catalog**, so a bus can be put on that
board by hand rather than only by a scan.

**The Status Report** gains, only when something is soft:

```
DOWNED BUSES        41
SOFT DOWN            4
  (on the sheet, still usable)
TOTAL DOWN + SOFT   45
```

### 2 — Four smaller fixes

- A bus already on the sheet can raise a recommendation for a **different**
  repair. Found on 17555.
- A **stale bus search** on the Defect Log ends itself, so a defect logged onto
  another bus is not invisible behind it.
- The **full sweep question** after a scan has a real **NO**, no longer promises
  the Status Report, and warns about map/sheet mismatches — on the NO path and
  on the sweep banner itself.
- A **three-piece refill** counted as a down bus. The catalog's own name for that
  inspection defeated the catalog's own maintenance rule.

## The rule behind the split

**Nothing runs unless the paper says it runs.** Permissions are `short run`,
`hold for`, `can be used`, `ok to run`, `light duty`. Refusals beat permissions:
`accident`, `until repaired`, `do not move/run/release/use`, `quarantine`,
`don't let go`. **Silence is DOWN.**

> Curtis: "if it says HIGH OIL CONSUMPTION with nothing else, then that is where
> the ambiguity comes in and I would not expect the app to make that
> distinction... So if it's on downsheet without any additional notes like hold
> or can use, then add it to downed count."

A first version inferred the other way and put a bus with a **burning smell** and
one with a **flat tire and a failed brake test** into the running column, because
both rows also mentioned oil. Caught by running the classifier over 52 real rows
before any screen was built on it.

## Storage impact

**No key renamed, no migration, nothing rewritten.** Two new per-device keys,
both documented in CLAUDE.md:

```
pace-down-sheet-soft-collapsed-v1
pace-down-sheet-idot-collapsed-v1
```

The `inService` flag lives on the sheet entry. It travels for free —
`cloud-sync.ts` puts every field it has no column for into `detail` and spreads
`detail` back on the way in — so **the Supabase schema does not change.**

## Validation completed

- **331 tests pass** in UTC and `America/Chicago`
- `npm run lint` clean, `npm run build` clean
- **Eleven mutations** fail the new guards across the release. The ones that
  matter: checking permissions before refusals; treating high oil as a
  permission; defaulting to soft rather than down; letting a soft row win over a
  hard one on the same bus; letting the in-service flag excuse a hard down bus;
  stripping every repair card rather than only the ones filed as inspections
  (which takes an accident-damaged bus out of the count).

Driven in Chromium at 390px against a board seeded from the shop's real export:

| Check | Result |
| --- | --- |
| Header | `41 DOWN BUSES` with `4 SOFT` beside it |
| Tiles | DOWN, SOFT DOWN, DOWN + SOFT, IDOT DUE, in that order |
| Boards | both start collapsed |
| SOFT lists | 15512, 17516, 17527, 17559 |
| IDOT lists | 17538, 17542, 17555, 17558, 17563 |
| Rows on the sheet | 51 of 52 entries — the missing one is 17563, only IDOT prep |
| Flip 17527 | SOFT 4 → 3, DOWN stays 41, stamp written |
| Reload | SOFT still 3, button still reads IN SERVICE |
| Flip back | SOFT 4 again, and the key is gone from the record |
| Header at 390px | 364px in a 377px box, nothing cut |

## Post-publish checks

1. Down Sheet header should read **41 DOWN BUSES** with **4 SOFT** beside it, on
   the current sheet.
2. Open the counts. DOWN, SOFT DOWN, DOWN + SOFT, IDOT DUE.
3. **SOFT DOWN — CAN STILL BE USED** should list the three South Holland holds
   and 17559 (`Short Run Only`). If it lists buses with real faults and no
   permission written on them, the rule has been loosened and that is the one
   to report.
4. Press **USING THIS ONE** on one of them. SOFT drops by one, DOWN does not
   move. Close the app, reopen it — it should still be on.
5. **17563** should have no row on the sheet; **17555** and **17558** should.
6. Send a Status Report. SOFT DOWN sits under DOWNED BUSES, then the total.
7. Scan a sheet and press **NO** on the sweep question — mismatch warning. Press
   **YES** — the map banner should say what the walk is for.

## Rollback

Roll back to `sites-v180` (`b6e0cba`). Nothing is stored differently except the
`inService` flag, which 180 does not read — a bus switched to in-service under
181 simply counts as down again, which is the safe direction. No defect, entry
or recommendation logged under 181 is lost or altered.
