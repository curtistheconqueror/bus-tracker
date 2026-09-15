# Publish next

**STATUS: 179 PENDING — a deferment can be given an end time, and pushed later
without resetting its alarm.**

Sites Version 178 was published from `531c3f83cc3cce472da92d6e54bc621921a60afb`
on 2026-09-14. The rollback tag is `sites-v178` at that exact source commit. The
prior production rollback point is Version 177 from `c18f635`.

**Publish from `fe467c0`**, the current head of `main`. Derive the range rather
than trusting a count: `git log --oneline 531c3f8..HEAD`.

**ONE user-visible change in this release.** Everything else between 178 and here
is architecture, each step proved with a before/after render — the map's HTML
identical to the character. That work needs no post-publish check because there
is nothing to look at; the deferment controls are the whole of what a person
will notice.

## 179: a deferment gets an end time

Curtis: *"when I hit deferred, I need an option in that pop-up to extend the
time of the deferment."*

A deferment had a START and no END. The only place an end time could be set was
the evening review prompt — and that fires from **20:30**, only for buses already
held over an hour, one bus at a time, and **can be switched off in settings**. A
bus deferred at 09:00 had an open-ended hold for eleven hours, and with the
prompt off it never got one at all.

Both readings of the request are built, because he asked for both.

**HOLD UNTIL — on the DEFERRED tick in the Defect Log editor.** Ticking DEFERRED
reveals a time field beneath it. Revealed by the tick rather than always drawn:
asking for an hour on a decision nobody has made.

**EXTEND — on the held row itself.** Beside UNDO DEFERRED on an expanded card.
Reads **HOLD UNTIL** when no end time is set and **EXTEND** once there is one;
press it, pick a time, press HOLD. So the clock can be pushed at 10am without
waiting for the evening.

**Both are OPTIONAL and that is deliberate.** A hold with no end time is valid and
always has been — *"not fixed yet, not ready to escalate either"* sometimes has
no hour attached. Clearing the field returns to exactly today's behaviour.
Making it required would turn a one-tick decision into a form.

### The invariant, and why it is the whole review

**Extending changes the end time and nothing else.** `deferredAt` is what the
90-minute DEFERRED badge counts from, so restamping it would reset the alarm
every time somebody pushed the clock — a safety net you can silently disarm is
worse than no safety net. The state stays `deferred` and `deferredReturnedAt`
stays clear, so `wasDeferred` history is untouched.

**Two mutations, two caught:** restamping `deferredAt`, and dropping the optional
path.

### One clock, in a file the tests can reach

`app/deferral-clock.ts`. *"Hold until 06:00"* asked at 21:00 means tomorrow
morning, and three places ask that now — the evening review, the editor tick and
the held row. Three copies would eventually disagree about which day somebody
meant.

It is a `.ts` module with no React so the runner can drive it, and that is also
**how it got extracted**: the test could not `import` it from a `.tsx`, and the
failure was the signal that pure clock logic was living in a component.

### Measured

Chromium at 390, clock pinned to `America/Chicago`:

```
control reads HOLD UNTIL with no end set, EXTEND once there is one
reveal gives a 44px time input, 44px HOLD, 44px cancel
16:30 stores as 21:30Z and reads back as 16:30 in the shop's timezone
deferredAt unchanged · state still deferred · deferredReturnedAt still clear
no horizontal scroll at 390
```

The new controls state their own 44px. `.log-form input` gives every other field
in that form 38px — that is the debt issue #11 exists for, not a target to copy.

**Three fixture errors on the way, none of them the app**, recorded because the
browser is where "it works" gets claimed: the seeded defect had no
`source:"defect-log"` so `defectLogRecords` filtered it out; the probe never
expanded the card, and row actions only exist on an expanded one; and the
timezone assertion called `getHours()` in the Node process (UTC) rather than in
the page (Chicago), so a **correct** 16:30 read as 21:00 and failed.

## Also in 179, and invisible: Phases 0 and 1 of the facility config

Issue #21. The yard's shape is now one description rather than five that had to
agree. **Nothing a user sees moves** — each step was proved by rendering the same
seeded board before and after and diffing it, with the facility's innerHTML
identical at 86,943 characters across all sixteen sections.

- **Phase 0** gave the garage one set of dimensions. `mystery-buses.ts` asked
  `slot%12>=10` to mean "the last two columns"; a garage of any other width would
  have gone on returning a confident boolean about the wrong buses.
- **Phase 1** put the whole yard in `app/site-config.ts` and pointed
  `facility-areas.ts`, `location-label.ts` and `fleet-intelligence.ts` at it.
  `map-settings.ts` deliberately still holds its own literal — its `as const`
  array is what types every theme, and reading it at runtime would degrade
  `SectionThemeKey` to plain `string`.

**And `bay-12` is not dead code**, which was nearly the opposite conclusion. The
check in `operational-time.ts` looks like a leftover, but `migrateFacilitySlots`
only feeds React state and never writes the corrected board back, so a legacy bus
stored at `bay-12` reaches it through the Defect Log without ever passing the
migration.

## Gates

`npm test` — **328 pass, 0 fail** in UTC *and* America/Chicago · `npm run lint` —
clean · `npm run build` — clean. CI green on every commit in the range.

## Storage

**Nothing added, renamed or migrated.** `deferredUntil` already existed on the
defect record — it simply had no way to be set outside the evening prompt. A
device that has never set one reads exactly as before.

## What to check once it is live

1. Open a repair in the **Defect Log** and tick **DEFERRED**. A **HOLD UNTIL**
   time field should appear under the tick. Leave it empty — that is the old
   behaviour and must still work.
2. Tick it again on another repair and set a time. Reopen the editor: the field
   should still show that time rather than reading empty.
3. Expand a deferred repair in the feed. Beside UNDO DEFERRED there should be a
   control reading **HOLD UNTIL** (or **EXTEND** if a time is already set).
   Press it, choose a time, press **HOLD**.
4. **The one that matters:** a bus already showing the 🚨 DEFERRED badge should
   still show it after you extend. Extending pushes the end time; it must not
   reset the 90-minute alarm.
5. On a phone, the time field and both buttons should be comfortable to hit.

## The way back

A straight redeploy of `sites-v178`. Nothing migrates. A `deferredUntil` set by
179 is simply not read by 178 — the evening prompt will ask about that bus again,
which is 178's own behaviour, and rolling forward picks the hold back up.

For the next release, document one exact source commit, completed validation, storage or migration impact, and the post-publish checks here before requesting production publication.
