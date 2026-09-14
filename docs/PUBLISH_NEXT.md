# Publish next

**STATUS: 176 PENDING — 175 SHIPPED THE WRONG SHIFT HOURS AND THEY ARE LIVE,
and the sheet ledger starts recording the day this goes out.**

Sites Version 175 was published from `9bac8ed62ae6171b75f1200e0d5e032c4e558d85`
on 2026-09-14. The rollback tag is `sites-v175` at that exact source commit. The
prior production rollback point is Version 174 from `2c06463`.

## ⚠ WHY THIS SHOULD GO OUT SOON

175 shipped the shift clock with **placeholder shift boundaries** — 06:00-14:00,
14:00-22:00, 22:00-06:00. Those were a guess, marked as a guess in the module,
and they are wrong. Curtis gave the real hours one commit later:

| | Start | End |
| --- | --- | --- |
| 1st | 06:00 | **14:30** |
| 2nd | 14:00 | **22:30** |
| 3rd | 22:00 | **06:30** |

Pullouts are unaffected — 06:00 and 13:00 were his from the start and are
correct in 175.

Nothing in 175 is broken by this. The shift clock is not yet read by any
surface — it was built for the Fleet Forecast, which does not exist yet — and
the Settings panel lets anybody correct the hours on their own device. But the
panel's "USE THE SHOP'S HOURS" button restores the WRONG hours in 175, so a
foreman who opens it and presses reset gets the guess back.

## What 176 is

**One commit**, on top of 175, plus the merge that brings 175's own record into
the branch.

### The hours, and the rule the overlap forces

Every shift is 8.5 hours and they **overlap by 30 minutes** at each handover:
14:00-14:30, 22:00-22:30 and 06:00-06:30 each belong to two shifts. That is a
relief window, and it breaks the assumption 175's `shiftAt` was built on — that
at most one window matches a given minute.

175 returns the FIRST window that matches, which would credit every one of those
half-hours to the **outgoing** shift purely because of array order: thirty
minutes of arrivals landing on the wrong crew's tally, three times a day, in a
number nobody would have had reason to double-check.

**The incoming shift wins a handover** — Curtis's call, asked and answered: the
relief has started and they are the crew who will work whatever arrives. Of the
windows that match, the one that STARTED MOST RECENTLY wins, which is what
"incoming" means in a sentence and needs no separate table of handover times to
keep in step.

The overlap breaks a second thing. A two-shift window was "what is left of this
shift plus the length of the next", which double-counts each handover — at 14:15
it reported 16h45m where the clock says 16h15m. It is measured straight through
to the END of the next shift now.

### Also in it

- The reset button reads **USE THE SHOP'S HOURS** rather than "the built-in
  hours", and its summary line is drawn from the defaults rather than typed, so
  it cannot drift from what the button does.
- `CLAUDE.md` no longer calls the hours a guess, and records the handover rule.

**No storage key is added or changed.** `pace-shift-settings-v1` shipped in 175
and keeps its shape. A device that already saved custom hours keeps them; a
device that never opened the panel picks up the corrected defaults.

## Also in 176: the sheet ledger starts keeping the tempo

**The app has been throwing this away.** A scanned sheet REPLACES the live one,
`pace-down-sheet-scan-undo-v1` keeps exactly one snapshot so the last import can
be taken back, and nothing retained the sheet before that. Sheet-to-sheet tempo
— what got added, what cleared, what stuck, and how fast — had never once been
recorded, on a shop that swaps eight or more sheets a fortnight.

Curtis: *"When downsheets are swapped out, there is a tempo to what gets
repaired. The type of repairs that are getting done per downsheet update."* That
tempo is the whole input to the Fleet Forecast, and **it begins existing the day
this ships.** Everything before it is gone unless the photographs are re-scanned
through a backfill path, which is not built yet — Curtis has kept them.

`app/sheet-ledger.ts` writes one compact snapshot per swap into
**`pace-sheet-ledger-v1`**: the bus id and catalog category per row, which buses
came off, and which shift the swap happened in. Rolling cap of 40, dropping the
oldest. Sorted oldest-first so a backfilled swap lands in its own place.

It is wired inside `importScan`, the one chokepoint every sheet swap crosses —
a route that forgot to call it would silently stop recording while the ledger
looked healthy. It sits AFTER the undo copy and is deliberately NOT guarded like
it: a failed undo copy stops the import, because replacing a sheet with no way
back is a one-way door, while a failed ledger write is a rounding error in a
forecast and must never cost a foreman the sheet he just photographed.

**THE LEDGER TRAVELS**, which reverses how it was first built. Curtis: *"I will
be scanning from multiple devices, period."* Device-local, each phone would hold
only the swaps IT performed — two half-histories, and a forecast built on either
would read half the shop's tempo as all of it.

Merging is safe here in a way it is not for the fleet or the sheet: **a swap is
an event that happened once, on one device.** Two devices never perform the same
swap — one scans the paper, the other receives the resulting sheet through the
cloud and performs none — so there is nothing to reconcile and the union is the
history. Deduped by swap id, and swap ids carry a random tail so two devices
scanning in the same millisecond cannot mint the same one.

Two carriers, both already in the app: the **Down Sheet section transfer**, and
**MASTER EXPORT**. The ledger is **the one key a whole-app import MERGES instead
of replacing** — everything else in a restore is state and is meant to be
overwritten, while this is history, and restoring a phone onto the iPad must not
throw away the swaps the iPad recorded itself.

**Automatic cloud sync is NOT in this release.** `shop_memory` is constrained to
`kind in ('part','finding')`, so it would need a schema migration against the
live database — Curtis's call, every time, and not taken.

**Nothing reads the ledger yet.** No surface changes, no number moves. This
release only starts the recording.

## Also in 176: the report has a way out you can see

Curtis opened the Fleet Status Report to send it and could not find the close
control: *"I don't see the X button clearly to close the page."*

Measured, the button was never missing — 40x40 and in view at 360, 390, 430 and
820, with the glyph itself around 8.8:1 against the header. What was missing was
any sign that it WAS a button: `border:0` over a 12% white fill on a navy
gradient measures **1.42:1** against the header behind it, so what a person saw
was a bare × floating beside a large white title that pulls the eye past it.

It reads **CLOSE** now, with a real edge. The border is what does the work: at
45% white it measures **3.72:1** against the header — past the 3:1 a control
boundary needs — where the fill alone is still only 1.55:1. 74x44 on a phone,
74x40 above it, in view and clear of the title at every width measured.

## Gates

`npm test` — **317 pass, 0 fail** · `npm run lint` — clean · `npm run build` —
clean.

**19 mutations, 19 caught.** On the hours: first-match-wins, the overlap removed from the
defaults, the two-shift window summed again, and the evening shift read as
22:00. On the ledger: the cap dropping the newest, completed rows counted as
on the sheet, a bus counted twice, phantom removals credited as cleared, the
first snapshot reported as a swap, a ledger failure stopping the import, and
the shift recomputed later instead of stored. On the multi-device paths: the
merge appending instead of interleaving by time, swap ids colliding across
devices, a master import replacing the ledger, a transfer import overwriting
it, the export dropping the ledger, and an empty ledger written as [].

Verified in Chromium at 390px against the real clock: 18:29 reads as `2ND
SHIFT`, `4h 1m` left, `11h 31m` to the a.m. pullout; the panel shows all six
edited times and the reset copy matches the defaults.

## What to check once it is live

1. Settings → **SHIFTS & PULLOUT TIMES**. The three windows should read
   06:00-14:30, 14:00-22:30, 22:00-06:30.
2. Press **USE THE SHOP'S HOURS** and confirm it restores those, not the 175
   guess.
3. Between 14:00 and 14:30, the live line should say **2ND SHIFT**, not 1ST.
5. Open the Fleet Status Report and find the way out without looking for it.
4. Scan a sheet, then check `pace-sheet-ledger-v1` holds one snapshot naming the
   buses that stayed and the ones that came off. Verified in Chromium through
   the real scanner — photo, review, IMPORT APPROVED — with the API response
   stubbed: one snapshot, three surviving buses, `off:["b2"]`, shift `2nd`.

## The way back

A straight redeploy of `sites-v175`. Nothing migrates. A device that saved its
own hours under 175 is unaffected either way; one running on defaults goes back
to the guess.
