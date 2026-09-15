# Publish next

**STATUS: 180 PENDING — a sticking brake can be logged as a symptom instead of
a guessed valve.**

Publish from `b6e0cba` (`Brakes: a sticking brake gets its own wording`), the
commit directly below this handoff. Derive the range with:

```
git log --oneline 546684d..HEAD
```

Version 179 was published from `fe467c0` on 2026-09-15 and is the rollback
point; its tag is `sites-v179`. The one before it is 178 from `531c3f8`.

## What a person will see

Four new options in the **Brakes** category of the Defect Log's DEFECT picker,
and nowhere else:

```
Brakes sticking / dragging
Brakes will not release - service (after pedal)
Brakes will not release - parking brake
Brake chamber leaking
```

Nothing else in the app changes. No screen moves, no control is renamed, no
existing option is reworded or removed.

## Why the wording is a symptom and not a part

The catalog had no way to say a brake is sticking — `sticking`, `dragging` and
`chamber` appeared nowhere in the app at all. R-12 and R-14 already exist under
**Pneumatic System**, worded as parts, and either can hold a rear brake on. The
two are linked, so a fault on the parking-brake valve can keep pressure on the
service side. Logging the symptom therefore meant naming a valve nobody had
confirmed.

Curtis: *"I don't want to mix up actual parts (due to inspection) from symptoms
that is being experienced from whatever the situation is."*

The two "will not release" entries are the split a mechanic can make standing
at the bus, and they narrow the valve without asserting it. A test holds that
no wording in the Brakes category names either valve.

## Storage impact: none

Additive only. No rename, no retirement, no storage key touched, no migration.
Every record already on a device reads back exactly as logged. `REPAIR_OPTIONS`
still holds 21 categories; the Brakes array goes from 11 entries to 15.

All four open on **May Stay In Service**, the same default as every other
Brakes entry. Whether a stuck brake should instead open on Remove From Service
is an open question for Curtis and is deliberately NOT decided in this release.

## Validation completed

- **328 tests pass** in UTC and in `America/Chicago`
- `npm run lint` clean, `npm run build` clean
- CI green on the pre-rebase commit (`Lint, build and test`, 2026-09-15)
- Two mutations confirm the new assertions bite: dropping one of the four
  wordings fails the suite, and naming R-14 inside Brakes fails it

Measured in Chromium at 390px against the real seeded board (62 buses), not
read off the CSS:

| Check | Result |
| --- | --- |
| Type `sticking` cold, no category chosen | Returns the new entry; picking it fills Brakes in behind you |
| Browse the Brakes list | 15 rows, all four present, none naming R-12 or R-14 |
| Longest new row | 364px wide inside a 377px list — unclipped, untruncated |
| Save round trip | Saved on bus 17500; lands in `pace-board-v1` under category `Brakes` with the exact wording; reload reads it back in the feed |

Three fixture errors were hit and fixed on the way, none of them the app: bus
records use `s`/`l` rather than `status`/`loc`; the welcome gate blocks until
`pace-app-mode-v1` is answered; and the Defect Log never seeds `pace-board-v1`
— the Facility Map does, so a probe has to land there first.

## Post-publish checks

1. Defect Log → **+ LOG DEFECT** → type `sticking` in the DEFECT field with no
   category chosen. `Brakes sticking / dragging` should appear, tagged 🛑 Brakes.
2. Pick it. The CATEGORY field should fill in with Brakes on its own.
3. Clear the DEFECT field and browse. The Brakes list should show **15** rows
   with all four new wordings in it.
4. Type `will not release`. You should get **both** new brake entries AND the
   parking brake knob from Operator/Driver Controls, each labelled with its own
   category. That contrast is the point of the change — the knob and the brake
   are different repairs.
5. Save one against a real bus, close the app, reopen it. The repair must read
   back with the same wording, not blank and not a different entry.

## Rollback

Roll back to `sites-v179` (`fe467c0`). A record saved under one of the four new
wordings is simply not offered by 179's picker, but it still READS correctly —
the editor offers an unknown stored wording back as its own choice rather than
blanking the field, so nothing logged on 180 is lost or corrupted by a
rollback to 179.
