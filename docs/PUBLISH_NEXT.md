# Publish next

**STATUS: 177 PENDING — the Fleet Status Report becomes a checkbox list, and the
Fleet Forecast arrives on it.**

Sites Version 176 was published from
`5e6fd58c34e1900301dc3f42850cd2313e42e45e` on 2026-09-14. The rollback tag is
`sites-v176` at that exact source commit. The prior production rollback point is
Version 175 from `9bac8ed`.

**Six commits**, on top of the 176 release record (`07114e5`), oldest first:

- `c4ea1a0` Let the report be picked rather than coded, every time
- `deae2a3` Let the old sheets in, and fix the key they join on
- `51146a0` Count the same buses the forecast is about
- `3f1cdeb` Write down the two queues, and the forms the drivers fill in
- `964275a` Make the forecast one number, and build the second spelling now
- `91025bf` Count the queue standing in the yard, not just the average

## What 177 is

Two fixed versions could not serve two audiences, and every difference between
them came back as a code change. Curtis: *"can we have, like, maybe widen the
user interface of it a little bit so we can include different things to check
mark that I want included... So that way I could just pick what I want sent, and
it'll auto format to that, period. I think that's the better way to do this
instead of coming to you and getting coding every time I need it done."*

And the case that decided the shape: *"when my superintendent sends that list out
to his superiors, they don't need to know about mystery buses. and they don't
need to know about inspection buses."*

The modal is **760px wide** (was 560), two columns above the phone breakpoint and
one at 390. **Seven sections** — inspections, roadcalls pending, mystery buses,
Farebox, Ventra, CUBIC screens, the Fleet Forecast — and **three detail
switches** that compose rather than branch: bus numbers, then locations, then the
specific repairs.

**The COUNTS ONLY version is gone as a thing.** It is now just
numbers-without-locations, and nothing special-cases it. Same for INCLUDE THE
DEFECTS. The selection saves to **`pace-status-report-picks-v1`**, a new
per-device view-state key — the report still writes nothing else, and a test
names the one permitted key.

**DOWNED BUSES is not on the list**: it is the question the report answers.

The three detail switches are a ladder and the modal enforces it — locations
without bus numbers has nothing to hang off, repairs without locations is a list
of repairs with no bus against them. Ticking one brings the ones above it.

### Farebox, Ventra and the CUBIC screens, counted apart

Curtis: *"now the Ventura and the fare boxes have been moved up to critical
levels, period. So they need a count of that as well... Fairbox and Venture
separate. and cubic screen EV or... I'm sorry. MV, bus MV or MREV error.
Whatever those errors say, I forgot."*

He could not remember the wording, which is the clearest sign the app must not
depend on somebody typing "CUBIC": `app/tech-services.ts` matches **BUS ER** and
**MV ER** by name as well. Counted by BUS rather than by defect — one bus with
three farebox faults is one farebox bus — and fleet-wide rather than off the
sheet, because a farebox fault does not down a bus and the question is how many
are out there. The map's own `farebox` / `ibsVentra` flags are the fallback for a
bus flagged but not yet written up, and never double-count a bus whose repair
already names the device.

**One table, two readings.** The quick filter that offers them TOGETHER
(`ibs-ventra`) now reads the same module instead of a regex of its own. That is
the `location-label.ts` rule applied again: two tables that must agree about what
a Ventra is are two tables that will eventually disagree.

### The Fleet Forecast, behind a checkbox on the same list

Curtis asked where it should live: *"I don't know if in your responses, you said
that that should be a separate button or if we wire it into this one so we can
send everything in one shot."* **One shot** — it is a row on the include list
and appends to whatever else is ticked.

`app/fleet-forecast.ts` is pure, like the report module. Road calls are a Poisson
process, so the rate is estimated **per shift** over a 21-day lookback and the
window comes off the shift clock: `expected = λt`, `P(any) = 1 − e^(−λt)`. Every
window Curtis named — the rest of this shift, the next two, before the pullout —
is the same estimator with a different `t`.

**It reports a range, not a number**, from a Poisson interval on the rate. A
forecast that says "3.4 road calls" from a dozen observations is lying about its
own precision.

**Three refusals, and they are the feature.** Below 12 road calls on record it
says what it is waiting for. Below 3 sheet swaps the downed projection does the
same. And — caught in review of the first draft — enough road calls fleet-wide
but **none on the shift being forecast** now reads "none on record", where the
first version quoted a confident *"0 expected, 0% chance of any"* from zero
observations.

**"Downsheet stick" is computed with right-censoring.** Curtis: *"AC repairs and
Check engine lights tend to stay on the longest."* Averaging `completedAt −
createdAt` over completed repairs only would report A/C as the FASTEST category,
because the A/C jobs that stuck are still open and not in that average. Open
repairs are counted at their current age, and the count of still-open ones is
printed beside each row. The test fixture is built so the naive implementation
gets the answer backwards rather than merely imprecise.

**On a fresh device both numeric halves currently refuse**, which is intended:
the ledger starts recording with this release, and the road-call rate needs a
shift with history behind it. The SLOWEST ON THE SHEET block works today, from
defect stamps already on the board.

**What is NOT built:** the descriptive panel Curtis was to check the numbers
against (Stage 1d), category-weighted clearance, calibration, labour hours, and
the backfill of the eight photographed sheets. `docs/roadmap/fleet-forecast.md`
carries a status table.

## Also in 177: the swap ledger keys on the fleet number now

**A bug fix in shipped code, found by measuring.** The ledger keyed its rows on
the Down Sheet entry's `busId`, and a bus id is DEVICE-LOCAL.
`section-transfer.ts` says so in its own words — *"two devices set up separately
give the same bus different ids"* — and it re-points every arriving Down Sheet
ENTRY by fleet number for exactly that reason. The ledger travels in the same
payload and nothing re-pointed it.

Driven through `snapshotFromEntries`: two devices, the same two buses, still
down, nothing repaired between the swaps. The ledger reported **`added 2, stuck
0`**. It now reports `added 0, stuck 2`.

Curtis: *"I will be scanning from multiple devices, period."* That is the normal
case here, not a corner. The cutover costs exactly one distorted pair — the swap
either side of it compares old keys against new — and that is the whole price.

## Also in 177: LOAD OLD DOWN SHEETS

Settings → LOAD OLD DOWN SHEETS, beside the shift clock. Loads down sheets from
before the app started keeping the swap history, so the Fleet Forecast has
something to measure before the shop has scanned for a month.

**It writes `pace-sheet-ledger-v1` and nothing else.** A scanned sheet REPLACES
the live one — that is what a swap IS — and a backfill must not, because the
sheets being loaded are weeks old and the live sheet is today's. The only
trustworthy way to say that is a path with no access to `pace-down-sheet-v1` at
all, and a test asserts the module cannot name it.

- `planBackfill` computes the whole outcome without writing a byte;
  `applyBackfill` takes the PLAN rather than the text, so what lands is provably
  what was shown.
- **The cap is said before the button.** A backfill is by definition the oldest
  thing in the ledger, so a device near forty drops most of it the instant it
  merges. Counted and shown rather than discovered afterwards.
- Loading the same file twice is a no-op, deduped by swap id.
- A master export or a Down Sheet transfer dropped in here is refused by name.

**New optional field: `SheetSnapshot.gap`.** Set only by the backfill — a scan
always follows the sheet it replaced. `ledgerTempo` returns `sinceHours:null` for
such a pair, which every rate already skips; the escape hatch was there from the
first build and this was the missing input. Without it the baseline's nine-day
hole reads as one swap that added fourteen buses and cleared thirty. Normalised
with `delete`, the spelling `setBusHold` uses.

**No storage key is added.** The backfill writes the ledger key that shipped in
176.

## Also in 177: the downed forecast measures the population it projects

The ledger records the whole sheet, inspections included. The number the
forecast projects is DOWNED buses — the line Curtis drew himself: *"the downed
number normally does not count inspections."* Measuring arrivals over the whole
sheet and charging them to a downed-only base is measuring one population and
billing another.

**Measured against the real nine-sheet baseline: leaving inspections in runs the
arrival rate 49% hot** — 0.330/hour against 0.222/hour. The ledger stores the
catalog category per row for exactly this kind of question, so the strip costs
nothing.

## Also in 177: the two queues the average cannot see

The arrival rate is measured over past windows, so it carries the TYPICAL
conversion of a road call and of an inspection, and knows nothing about what is
standing on the yard tonight. Both queues are now read at forecast time.

**Road calls.** Curtis: *"if a roll call comes in, just the fact that a bus is a
roll call, it should add to the probability of more down buses, depending on the
conversion from roll call to down sheet... if we have 10 roll calls and only two
of them are converted to the down sheet, then that's a 20% chance."*

A road call already on the sheet is a downed bus and needs no predicting; the one
worth forecasting is the one nobody has written up yet, which is exactly the
Status Report's ROADCALLS PENDING. **The conversion rate cannot come off the
sheets at all** — a road call that never converted never appears on one — so the
denominator comes from the board's own `roadCalls` events and the numerator from
the ledger. A **flat probability per bus**, matching how Curtis put it: a
standing road call is a pending decision a foreman resolves inside a shift, not
a slow burn. Forty-eight hours is the window in which a write-up still counts as
that road call's doing; beyond it the bus went back in service and came down
again for something else.

**Only events a snapshot actually looked at are judged.** A road call that fell
in a hole in the ledger is a failure to OBSERVE, not a failure to convert, and
counting it as the latter quietly drags the rate toward zero. That distinction is
its own mutation below.

**Inspections.** Curtis: *"we need inspection also counted in that rate if half
of them are counted as down buses or become downed buses with PM defects. That is
a factor we cannot ignore."*

Measured entirely off the ledger — an inspection row on one snapshot appearing as
a downed row on the next is a conversion — and expressed as a **per-hour hazard**
rather than a flat fraction. An inspection sits on the sheet for days; applying a
whole conversion fraction across a four-hour window to the pullout would claim
half the B-18s in the yard turn into brake jobs before lunch. Conversions over
inspection-hours-at-risk is the unit that scales to the window honestly. `gap`
pairs are skipped, as everywhere else.

**Neither queue is counted twice.** An arrival that was an inspection on the
previous sheet, or that followed a road call inside the conversion window, is
taken OUT of the base arrival rate: the average carries what neither queue
explains, and each queue carries its own.

**The pools are handed over, not recomputed.** `board.inspections` and
`board.roadCallsPending.length` come straight from the Status Report, which
already works both out and is tested on them. A second implementation of "is this
bus on the sheet" is the drift the `location-label.ts` rule exists to stop.

**Both refuse below a floor** — four inspections observed, six judged road calls
— and say what they are waiting for rather than quoting a conversion. The floors
are low on purpose: these are corrections on a number that already reads, so the
cost of a thin one is smaller than the cost of ignoring a queue plainly sitting
in the yard.

**The queues move the number without widening the band.** The interval is the
sampling error in the RATE; a counted pool and a floor-passing conversion are not
a rate. Stretching the band by them would say the forecast got less certain the
moment it learned something new.


## Also in 177: the forecast is one number

Curtis: *"Most important number is Forecasted Total Down buses by pullout
times... So far, I only want this one number for the forecast. I'll let you know
if I'm gonna add more lines or details."*

The block was five rows and a dwell table. It is now:

```
FLEET FORECAST
  (not guaranteed - based on
   work flow and probability
   logistics)

DOWNED BUSES
BEFORE THE 06:00 PULLOUT
  33-37   (now 35)
```

**Everything else is still computed and simply not drawn** — the road-call rate,
the chance-of-any and the per-category dwell are all on the `FleetForecast`
object and the tests assert them there rather than in the text. Putting a line
back is a change in `forecastTextLines` and nowhere else.

**WHICH PULLOUT needed no new code.** Curtis described the rule as *"if numbers
was updated on 2nd shift then a forecast for am pullout... if it's first shift
then a pm pullout number"*, and that is exactly `nextPullout` off the shift
clock. Verified in Chromium with the context clock set to `America/Chicago`
against the real nine-sheet baseline: **2nd shift 20:00 to the 06:00 pullout, a
10-hour window; 1st shift 09:00 to the 13:00 pullout, a 4-hour window.**

### The single number is already built

A range is what seven swaps can honestly carry, and Curtis took that — *"if it
hasn't beaten my judgement yet based on a lack of samples then I will go with
your recommendation on a range."* And then: *"u can build it for single number
ability now so we don't have to revisit from scratch."*

So `DownedForecast.expected` is computed on every call and
`forecastTextLines(forecast, width, {style:"single"})` prints it. Switching is a
parameter, not a rewrite, and nothing is recomputed to find out what the single
figure would have said.

## Gates

`npm test` — **325 pass, 0 fail** · `npm run lint` — clean · `npm run build` —
clean.

**Seven mutations, seven caught**, each aimed at a decision that would have been
invisible from outside:

- the forecast gate reading the fleet total instead of the shifts the window
  actually covers — the confident-zero bug, caught by its own test;
- the dwell counting completed repairs only, which reports A/C as the fastest
  category in the shop;
- the Ventra flag counting a bus that already has a CUBIC screen written up,
  which would inflate both numbers at once;
- the two queue terms dropped from the projection entirely, which is the whole
  correction and must not pass silently;
- the queues added on top of an UNSTRIPPED base rate, counting every converted
  arrival once in the average and again in the queue;
- the floor removed from the projection, letting a busy clearance rate print a
  negative number of buses;
- an unobservable road call counted as a failure to convert. **This one survived
  the first round** — the fixture had no such case, because every road call in it
  happened to sit inside the ledger's span. Two events 20–30 days before the
  ledger starts were added and it is caught now. A mutation that survives because
  the fixture cannot express it is the failure mode this gate exists to find.

Measured in Chromium at **390, 820 and 1180** on a seeded board: modal 390 / 760
/ 760 wide, one column at 390 and two above it, no horizontal scroll at any width
(`scrollWidth === clientWidth`, document 390 / 820 / 1180), every checkbox row
336x45 with a 22px box, and a 74x44 CLOSE on the phone.

With the forecast and the repairs both ticked, the longest line of the generated
message measures **37** against the 38-character lock-screen budget. The first
draft ran to **44**, with `BEFORE THE 06:00 PULLOUT` set in a labelled row, and
the width test is what caught it rather than reading it.

**The queues were measured in Chromium, not reasoned about.** Same fleet, same
ledger, same window, run twice with only the two pools changed — eight swaps 24
hours apart, twenty buses stuck throughout, four inspections per swap of which
two convert, and ten judged road calls of which five do:

```
queues empty      DOWNED BUSES / BEFORE THE 06:00 PULLOUT /  18-21  (now 20)
queues standing   DOWNED BUSES / BEFORE THE 06:00 PULLOUT /  23-26  (now 20)
```

Ten inspections and six pending road calls standing, and the figure moves by
five: 6 x 0.50 = 3.0 from the road calls, 10 x 0.0208/hour x 9.5 hours = 2.0 from
the inspections. The arithmetic the module claims is the arithmetic the screen
shows. No horizontal scroll at 390 in either run.

The PDF was rendered in Chromium as well: every ticked section present and every
unticked one absent, the forecast set as a definition list rather than a pasted
monospace block, "CUBIC screens" keeping its acronym, no unescaped markup and no
page errors.

## Storage

**One key is added: `pace-status-report-picks-v1`** — which boxes are ticked.
Per-device view state, like every other panel-open key; it never syncs, and
losing it costs one round of ticking. Nothing is renamed and nothing migrates.

The report still writes NOTHING else. A test now names the single permitted key
rather than banning `setItem` outright, and keeps every route to the records
shut.

## What to check once it is live

1. Open the **STATUS REPORT** on the Down Sheet. The modal should be visibly
   wider, with two columns of checkboxes on the shop computer and one on a phone.
2. Untick **Mystery buses** and **Inspections**. Both should leave the message
   AND the PDF, and "not counted above" should leave with the inspections number
   rather than hanging under nothing.
3. Untick **Bus numbers**: every section drops to a bare count.
4. Tick **The specific repairs**: bus numbers and locations come back with it,
   because the three are a ladder.
5. **Farebox**, **Ventra** and **CUBIC screens** should each carry a count, and a
   bus written up for a CUBIC screen should appear under CUBIC screens only.
6. Tick **Fleet forecast**. On a device with no recorded swaps it should say what
   it is waiting for. It must never show a 0% chance.
7. Close the report and reopen it: the boxes are as you left them.
8. With the forecast ticked, note the number, then check it against ROADCALLS
   PENDING and INSPECTIONS on the same report. A yard with a queue standing
   should forecast **above** the current downed count even on a quiet ledger;
   that gap IS the two queues. On a device with too little history either queue
   silently contributes nothing, which is the intended shape rather than a fault.

## The way back

A straight redeploy of `sites-v176`. Nothing migrates.
`pace-status-report-picks-v1` is simply not read by 176 and is left where it is,
so rolling forward again picks the selection back up. The ledger keeps recording
under either version.
