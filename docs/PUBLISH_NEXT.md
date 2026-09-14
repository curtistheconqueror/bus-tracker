# Publish next

**STATUS: 176 PENDING — 175 SHIPPED THE WRONG SHIFT HOURS AND THEY ARE LIVE.**

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

## Gates

`npm test` — **315 pass, 0 fail** · `npm run lint` — clean · `npm run build` —
clean.

**4 mutations, 4 caught**: first-match-wins, the overlap removed from the
defaults, the two-shift window summed again, and the evening shift read as
22:00.

Verified in Chromium at 390px against the real clock: 18:29 reads as `2ND
SHIFT`, `4h 1m` left, `11h 31m` to the a.m. pullout; the panel shows all six
edited times and the reset copy matches the defaults.

## What to check once it is live

1. Settings → **SHIFTS & PULLOUT TIMES**. The three windows should read
   06:00-14:30, 14:00-22:30, 22:00-06:30.
2. Press **USE THE SHOP'S HOURS** and confirm it restores those, not the 175
   guess.
3. Between 14:00 and 14:30, the live line should say **2ND SHIFT**, not 1ST.

## The way back

A straight redeploy of `sites-v175`. Nothing migrates. A device that saved its
own hours under 175 is unaffected either way; one running on defaults goes back
to the guess.
