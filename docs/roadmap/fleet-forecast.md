# Fleet Forecast

Curtis: *"I want to be able to give a forecast of possible status based on
timing the shifts... What is the number of roadcalls likely within the next
shift or over the next 2 shifts or select probability by pull out time... AC
repairs and Check engine lights tend to stay on the longest. Producing a higher
rate of downsheet stick!"*

A checkbox on the Fleet Status Report's include list. The name carries the hedge
he asked for: **FLEET FORECAST (not guaranteed — based on work flow and
probability logistics)**.

---

## WHERE THIS STANDS

**Stage 1 is built. Most of Stage 2 is built, and what is not built is what has
no data behind it yet.**

| | Built | Where |
| --- | --- | --- |
| 1a. The sheet ledger | ✅ | `app/sheet-ledger.ts`, and it travels |
| 1b. Shifts and pullout times | ✅ | `app/shift-clock.ts`, editable in Settings |
| 1c. Road-call rate, censored dwell | ✅ | `app/fleet-forecast.ts` |
| 1d. A descriptive panel to check it against | ❌ | not started |
| 2. Road calls per window, with a range | ✅ | in the report, behind the checkbox |
| 2. Downed = arrivals − clearances | ✅ | refuses until 3 swaps are recorded |
| 2. Category-weighted clearance | ❌ | needs swaps the shop has not recorded yet |
| 3. Calibration, labour hours | ❌ | not started |

**It went in behind the include list rather than as its own button.** Curtis: *"I
don't know if in your responses, you said that that should be a separate button
or if we wire it into this one so we can send everything in one shot."* One
shot: it is a row on the list like the others, and it appends to whatever else
is ticked rather than replacing it.

**Two gates are live and both currently refuse on a fresh device**, which is the
intended behaviour and not a bug: twelve road calls on record before a rate is
quoted, and three sheet swaps before a clearance rate is. Until then the section
names what it is waiting for. A third refusal was added after the first draft
was caught quoting a confident zero: enough road calls fleet-wide but none on
the shift being forecast now reads "none on record", never "0% chance".

---

## The finding that shapes all three stages

**The app is throwing away the data this needs, every time a sheet is scanned.**

`down-sheet-replace.ts` swaps the new sheet in and `pace-down-sheet-scan-undo-v1`
keeps exactly ONE snapshot so the last import can be undone. Nothing retains the
sheet before that. There is no ledger, no archive, no history of what was on
each sheet and what had come off it.

So Curtis's *"we already have around 8 scanned documents or more so far in the
last 2 weeks... not sure if we can start based on that data"* — the honest
answer is **no, not as the app stands.** Those eight exist as photographs. The
app kept the newest and overwrote the rest. Sheet-to-sheet tempo, which is the
heart of what he is describing, has never been recorded.

**But two of the three signals he wants are already in the data:**

| Signal | Where it lives now | Usable today? |
| --- | --- | --- |
| Road-call arrivals, dated | `bus.roadCalls[].at` — append-only, never pruned | **Yes**, retroactively |
| Per-repair dwell time | `defect.createdAt` / `completedAt` / `workStates` stamps | **Yes**, retroactively |
| Sheet-to-sheet tempo | nowhere — overwritten on every scan | **No.** Starts the day Stage 1 ships |

That asymmetry is why Stage 1 is "start keeping the record", not "build the
model". The model cannot be retrofitted onto data that was discarded.

**Recovering the eight scans is possible but not free.** Re-scanning the
photographs in date order would seed the ledger — but each scan REPLACES the
live sheet, so it would have to run in an explicit backfill mode that writes
only to the ledger and never touches `pace-down-sheet-v1`. Worth doing if the
photos are still on the phone; it turns "no history" into two weeks of it. It is
listed as optional in Stage 1 because the feature must not depend on it.

---

## Stage 1 — Start keeping the record, and measure what is already there

Nothing is predicted in Stage 1. It earns the right to predict by first showing
what actually happened, which Curtis can check against what he already knows. A
forecast whose descriptive half he can see is wrong is a forecast nobody will
trust later.

### 1a. The sheet ledger — `pace-sheet-ledger-v1`

One compact snapshot per sheet swap, written where the replacement already
happens so it cannot be bypassed by a route that forgets.

Not the whole sheet — a sheet is large and this has to live in LocalStorage
beside everything else. Per swap: the stamp, and per bus its id, catalog
category, section, workflow, and `createdAt`. From two consecutive snapshots the
arithmetic gives what was **added**, what was **cleared**, and what **stuck** —
which is the whole vocabulary of the forecast.

Rolling cap, oldest dropped first. Sized so a busy month fits; a forecast is not
worth a storage failure that costs somebody their board, and the bulk-loss guard
in `writeFleetStorageResult` exists because that has nearly happened before.

**~~Never synced.~~ IT TRAVELS — this was written wrong and Curtis corrected
it:** *"I will be scanning from multiple devices, period."* Left device-local,
each phone would hold only the swaps IT performed. Merging is safe because a
swap is an EVENT that happened once on one device, so the union IS the history —
see `CLAUDE.md` and `app/sheet-ledger.ts`.

### 1b. Shifts and pullout times — `pace-shift-settings-v1`

Curtis: *"A timer must be built in... it must be shift aware and pull out time
aware. Also a settings option to fine tune both of these options in case changes
need to be made without you writing code."*

The app has `Shift = "1st" | "2nd" | "3rd"` as a LABEL on a Down Sheet entry and
nothing that maps a clock time onto it. Pullout times appear nowhere at all.

So: a settings panel holding each shift's start and end, and each pullout time.
Defaults from what he has said — **a.m. pullout 06:00, evening pullout 13:00** —
and every one of them editable without a release. Shift boundaries are a
property of this garage's contract, not of the software, and the contract
changes.

Per device and never synced, for the same reason the sweep is: it is a setting
about the building, and a device that syncs it would overwrite a garage that
runs different hours.

A pure `app/shift-clock.ts`: which shift a timestamp falls in, which pullout is
next, how long until it, how much of the current shift is left. Every forecast
window in Stage 2 is expressed through it, so there is exactly one place that
knows what "next shift" means.

### 1c. The descriptive numbers — `app/fleet-forecast.ts`

Pure functions, no storage, no rendering — the shape `fleet-status-report.ts`
already uses.

**Road-call arrivals by shift.** Every dated event on every bus, bucketed by the
shift clock. Answers "how many road calls does 1st shift actually get" from data
already on the board.

**Per-category dwell, with censoring handled.** How long a repair of each
catalog category stays open, which is Curtis's *"downsheet stick"*.

> **The trap here is worth naming, because the obvious implementation gets the
> answer exactly backwards.** Averaging `completedAt − createdAt` over COMPLETED
> repairs ignores every repair still open — and the ones still open are
> precisely the A/C and check-engine jobs he is asking about. The naive mean
> would report that A/C clears quickly, because the A/C jobs that stuck are not
> in the average yet. Open repairs are **right-censored** observations: all that
> is known is that they have lasted at least this long. They have to be counted
> at their current age, which is what a median-with-censoring (or a
> Kaplan–Meier estimate) does. This single decision is the difference between a
> forecast that confirms what the shop already knows and one that contradicts it
> for no reason.

**Ledger tempo**, once the ledger has anything in it: added, cleared and stuck
per swap, by category.

### 1d. What Stage 1 shows

A panel — Settings, or behind ADVANCED ACTIONS — with the descriptive history
only: road calls per shift, dwell by category with a censored count beside each,
and the ledger's tempo once it has two or more snapshots. Curtis reads it and
tells us whether the numbers match the shop. **That verdict is the gate on
Stage 2.**

---

## Stage 2 — The forecast, behind the third checkbox

### The model, and why each piece is the right one

**Road calls: a Poisson rate per shift-hour.** Road calls are independent count
events arriving in time, which is what Poisson describes. λ is estimated per
shift from the dated events, so a morning pullout spike is carried rather than
averaged away. Then, for a window of `t` hours:

- expected count = `λ × t`
- P(at least one) = `1 − e^(−λt)`

That gives all three things he asked for from one estimator — next shift, next
two shifts, or between now and the next pullout — because each is only a
different `t` off the shift clock.

**It must report a range, not a number.** Two weeks of data gives a wide
interval, and a forecast that says "3.4 road calls" from eight observations is
lying about its own precision. The output reads **"2–5 road calls expected
before the 06:00 pullout"**, from a Poisson confidence interval on λ. When a
foreman's own judgement is inside the range, the forecast has told him nothing
and should look like it.

**Downed buses: arrivals minus clearances.**

```
downed(next pullout) = downed(now) + arrivals − clearances
```

`arrivals` from the road-call rate plus the ledger's observed rate of new
non-road-call entries per shift. `clearances` from the ledger's observed
clear rate, **weighted by the category mix currently on the sheet** — a sheet
carrying eight A/C jobs clears slower than one carrying eight fluid services,
and the per-category dwell from Stage 1 is exactly the weight. That is the
mechanism behind *"AC repairs and Check engine lights tend to stay on the
longest... producing a higher rate of downsheet stick."*

### The confidence gate

Below a threshold of observations the forecast **refuses to give a number** and
says what it is waiting for: *"Not enough history yet — 3 more sheet swaps."*

This is not politeness. A number produced from four observations will be wrong
in a way that looks authoritative, one foreman will act on it, and the feature
will be dead the moment it costs somebody a bus. Refusing early is what makes
the number mean something later.

### The output

A third checkbox above COUNTS ONLY, and it composes rather than replaces:
tick it and the forecast block is appended to whichever version is selected.

```
FLEET FORECAST
  (not guaranteed — based on work flow
   and probability logistics)
------------------------------
NEXT PULLOUT        06:00
ROAD CALLS EXPECTED 2-5
CHANCE OF ANY       89%

DOWNED AT PULLOUT   12-16
  (now 14, +3 to +5 in, -1 to -3 out)

SLOWEST ON THE SHEET
  A/C and HVAC      6.5 days median
  Engine            4.0 days median
```

Same 38-character lock-screen width, same escaping in the PDF.

---

## Stage 3 — Calibration, and the repair hours

**Score the forecasts against what happened.** Each forecast is written to the
ledger with its window; when that window closes, the actual is recorded beside
it. Mean absolute error for the counts, a Brier score for the probabilities,
shown in Settings.

This is the only honest way to answer "should I trust this". It also turns the
forecast from a fixed formula into something that can be corrected: a λ that is
consistently 30% low is visible and fixable, where an uncalibrated forecast is
just an opinion that never learns.

**Repair hours.** Curtis: *"Repair times will be wired up into this at some
point as well. The accrued labor hours, once i get more info for each."*
`repairHours` and `diagnosticHours` are already recorded per repair item, and
`work-time.ts` already buckets by person and day. Once he has the labour
figures, clearance stops being "how many buses cleared last shift" and becomes
"how many labour hours a shift produces against how many hours are sitting on
the sheet" — which is the version a superintendent can act on, because it says
whether the answer is more mechanics or more parts.

**Per-category weights tuned by outcome** rather than by the raw dwell, once
there is enough scored history to tell the difference.

---

## What it will not do

Said plainly, because a forecast that overreaches gets switched off:

- **It will not predict which bus.** Road calls are random across the fleet;
  the rate is predictable, the vehicle is not.
- **It will not be right about a quiet week.** Poisson assumes a steady rate.
  A snowstorm or a fuel contamination batch is a different process, and the
  forecast will be wrong through it and should not pretend otherwise.
- **It will not replace the foreman's read.** The range is deliberately wide
  enough that his judgement usually sits inside it. When the forecast disagrees
  with the person who walked the yard, the person is probably right.
- **It will not quote a rate for a shift it has not watched.** Enough road calls
  fleet-wide is not enough road calls on 3rd shift, and the first draft answered
  "0 expected, 0% chance" for exactly that case. It says "none on record" now.

## Storage keys this adds

```
pace-sheet-ledger-v1      one compact snapshot per sheet swap, rolling cap
pace-shift-settings-v1    shift boundaries and pullout times, editable
pace-status-report-picks-v1  which sections the report carries, this one included
pace-forecast-scores-v1   Stage 3: forecasts made, and what actually happened
```

All three are new names. Nothing existing is renamed — the rule holds.
