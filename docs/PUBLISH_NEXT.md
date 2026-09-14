# Publish next

**STATUS: 174 IS LIVE. UNPUBLISHED WORK SITS ON TOP OF IT — build the next
release from `main`'s head.**

Sites Version 174 was published from `2c0646397785270b491c22d2abc0be239e14d29a`
on 2026-09-14. The rollback tag is `sites-v174` at that exact source commit. The
prior production rollback point is Version 173 from `3de6dab`.

Whatever number comes next — 175 unless Codex has taken it — should be built
from `main`'s head, not from `2c06463`.

```
git log --oneline sites-v174..origin/main -- app/ tests/
```

---

## 1. Fixed Repairs is themed all the way into the card

Reported from the floor as an unreadable repair title on the Tactical theme.
Measured in Chromium on all four themes rather than read off the CSS, the
problem was larger than the title: **14 elements under AA on Tactical, 12 on
Dark, 12 on Midnight, 1 on Light. Zero on all four now.**

The theme section only ever repainted the OUTSIDE of a card. Three things
inside it were still light-theme constants:

- **The FIX / STEPS TAKEN panel** carried a hard-coded `#f3fbf6`, a pale green
  chosen for the light theme, so a dark theme drew its themed cream text on a
  near-white box. **1.13:1** — the sentence that page exists to show,
  effectively invisible.
- **The card head** mixed 10% of the accent into the surface and then drew the
  bus number, the category and the timestamp in that same accent — a colour set
  against a background it had just been blended into. Self-defeating by
  construction; Tactical had the least headroom at **3.92:1**. It tints from
  the page now, which every theme has spare, and that holds for a CUSTOM theme
  where the accent is whatever the user picked.
- **The tallies and the completion stamp** used `--fixed-green`, a dark green
  on a dark surface, **1.86:1**.

The active nav tab was themed and still wrong: surface behind HEADER text puts
near-black on dark olive, **1.63:1**. It reads as ink now.

Card small print is mixed 68% toward the ink rather than left at the theme's
muted value, which self-corrects per theme instead of hard-coding a second
muted colour a custom theme would never get.

**No storage key, no data shape, nothing to migrate.** CSS only.

## 2. On the down sheet means not pending — a road-call rule change

**This one changes behaviour on the bus record, so read it before publishing.**

Curtis: *"any bus that is added to the downsheet while it is in roadcall status
should not be counted here. Once its placed on downsheet the roadcall status is
canceled (although still logged per our design already)... Anyone taking counts
and see a bus that is on property that just came in from roadcall, marks it
down on sheet it is no longer in the roadcall count."*

It inverts half of `reconcileRoadCallsFromSheet`, with his explicit
confirmation, because the EVENT and the STATUS were being conflated:

- The **event** is the breakdown and stays on the bus forever. That reconciler
  exists because the shop's cloud held 109 buses with zero `roadcall` flags and
  four live `Roadcall` sheet rows — every road call there arrives on paper — so
  the sheet must go on logging what the paper says.
- The **flag** says the bus is out on one RIGHT NOW. A bus somebody is standing
  next to, writing up, is back. So a sheet row now CANCELS the status the same
  row used to raise.

Any active entry counts, not only a `Roadcall`-section one: a bus that came in
off a road call and was written up for brakes is still written up. The flag
comes off the bus record, so the **Facility Map's ROADCALL badge agrees with the
report** — Curtis chose that when asked, over filtering the report alone.

Taking the row back off does NOT re-raise the call. Re-raising would be the app
deciding a bus is out on the road because somebody deleted a row, and every
reader that goes by events rather than status still has the breakdown.

`standingRoadCalls` is unchanged, and so is the 36-hour window — he confirmed
36 again rather than the 48 he first said.

**No storage key changed.** `roadcall` and `roadCalls` already existed and keep
their shapes. A device on an older build reading a board written by this one
sees a bus whose flag is off and whose history is intact, which is exactly what
it would see after somebody unticked the box by hand.

## 3. SCOREBOARD is now the FLEET STATUS REPORT

Curtis asked for a term that holds up when a superintendent forwards it upward,
where "scoreboard" reads as an in-house nickname. The button says STATUS
REPORT; the modal, the message and the PDF all say Fleet Status Report.

Renamed through the code as well as the interface, on purpose: this repo has
been bitten twice by one thing carrying two names (five copies of the location
table, two road-call records that had drifted). `fleet-scoreboard.ts`,
`fleet-scoreboard-print.ts` and `scoreboard-modal.tsx` become
`fleet-status-report.ts`, `fleet-status-report-print.ts` and
`status-report-modal.tsx`; the exported symbols and every `.scoreboard-*` CSS
class follow. **No storage key is involved** — none of this was ever persisted.

## 4. The report is shorter, and has a counts-only version

Curtis: *"I think its still too much info."*

Because "not on the sheet" is now the DEFINITION of pending, the two road-call
lists collapse into one: the `*` against each row and the footnote counting
them underneath both go. It reads `ROADCALLS PENDING` with the qualifier said
once under the heading.

Three trims he named:

- the per-bus **open-repair count** is gone from the mystery rows;
- **`(downed buses only)`** is gone from the message, the PDF and the modal tile
  — it repeated the heading back. `(not counted above)` under INSPECTIONS
  stays, because that one says what the heading does not;
- a **blank line** separates `MYSTERY BUSES` from `PENDING CONFIRMATION OF
  STATUS`, which were reading as one wrapped sentence.

Both blocks also run in the SAME ORDER in both versions now — roadcalls
pending, then mystery. They were opposite ways round, and Curtis asked for
them matched.

A **counts-only checkbox** sits above the defects one, and disables it rather
than hiding it. The split is by what the reader does with each number: downed
and inspections are figures to quote, so no bus numbers; roadcalls pending and
mystery buses are errands somebody walks out to, so those carry their numbers
and nothing else. Both the message and the PDF honour it.

## Gates

`npm test` — **313 pass, 0 fail** · `npm run lint` — clean · `npm run build` —
clean.

Measured in Chromium, not read:

- Fixed Repairs on light / dark / midnight / tactical: **0 elements under AA**
  (from 1 / 12 / 12 / 14).
- The report at 390px on a seeded board: a bus carrying a live road call AND a
  sheet row is **absent** from ROADCALLS PENDING while two with road calls and
  no row are present; both versions fit the lock-screen width with no
  horizontal overflow.

## What to check once it is live

1. Open **Fixed Repairs** on Tactical and read a completed repair's FIX / STEPS
   TAKEN panel. That is the text that was invisible.
2. On the **Facility Map**, tick ROADCALL on a bus, then add that bus to the
   Down Sheet. The badge should clear and the bus should leave ROADCALLS
   PENDING on the report.
3. Confirm the bus still shows its road call on the **Defect Log** card and in
   the ROAD CALLS quick filter — the history must survive the status being
   cancelled.

## The way back

Nothing here migrates data, so rolling back to `sites-v174` is a straight
redeploy. The one asymmetry: buses whose `roadcall` flag was cleared by a sheet
write under this build stay cleared after a rollback. Their events are intact,
so 174 would show them in ROAD CALLS (36H) again only if somebody re-ticked the
box, which is the same position as any bus fixed and returned to service.
