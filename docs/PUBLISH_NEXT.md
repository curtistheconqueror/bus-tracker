# Publish next

**STATUS: 177 PENDING — the Fleet Status Report becomes a checkbox list, and the
Fleet Forecast arrives on it.**

Sites Version 176 was published from
`5e6fd58c34e1900301dc3f42850cd2313e42e45e` on 2026-09-14. The rollback tag is
`sites-v176` at that exact source commit. The prior production rollback point is
Version 175 from `9bac8ed`.

**One commit**, on top of 176.

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

## Gates

`npm test` — **320 pass, 0 fail** · `npm run lint` — clean · `npm run build` —
clean.

**Three mutations, three caught**, each aimed at a decision that would have been
invisible from outside:

- the forecast gate reading the fleet total instead of the shifts the window
  actually covers — the confident-zero bug, caught by its own test;
- the dwell counting completed repairs only, which reports A/C as the fastest
  category in the shop;
- the Ventra flag counting a bus that already has a CUBIC screen written up,
  which would inflate both numbers at once.

Measured in Chromium at **390, 820 and 1180** on a seeded board: modal 390 / 760
/ 760 wide, one column at 390 and two above it, no horizontal scroll at any width
(`scrollWidth === clientWidth`, document 390 / 820 / 1180), every checkbox row
336x45 with a 22px box, and a 74x44 CLOSE on the phone.

With the forecast and the repairs both ticked, the longest line of the generated
message measures **37** against the 38-character lock-screen budget. The first
draft ran to **44**, with `BEFORE THE 06:00 PULLOUT` set in a labelled row, and
the width test is what caught it rather than reading it.

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

## The way back

A straight redeploy of `sites-v176`. Nothing migrates.
`pace-status-report-picks-v1` is simply not read by 176 and is left where it is,
so rolling forward again picks the selection back up. The ledger keeps recording
under either version.
