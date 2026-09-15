# Publish next

**STATUS: 178 PENDING — the CLOSE button on the Fleet Status Report, the home
screen asking one question at a time, and main is red without the first of
these.**

Sites Version 177 was published from `c18f635eef6a44b35ee76c240475d11eeb13ea64`
on 2026-09-14. The rollback tag is `sites-v177` at that exact source commit. The
prior production rollback point is Version 176 from `5e6fd58`.

**Three changes**, on top of the 177 release record (`bc76850`): a bug Curtis hit
on his phone, the reason `main` is currently failing CI, and the home screen
asking its two questions in order.
Derive the range rather than trusting a count: `git log --oneline bc76850..HEAD`.

## 178 first, because main is red

**CI on `main` is FAILING right now** — runs 229 (`c18f635`) and 230 (`bc76850`)
both red. The last green commit on `main` is `2c24e0b`. 177 was published from a
commit whose CI was already failing, so this is not a regression introduced
after the fact.

The failing test is `the FLEET FORECAST refuses before it can count`, and the
cause is a timezone. `shiftAt` resolves a shift through `minuteOfDay`, which
reads `getHours()` — **local** time. The test pinned an absolute instant, so
which shift it lands in depends on where the runner is:

| spelling | UTC runner | Central machine |
| --- | --- | --- |
| `...10:00:00.000Z` (176) | 10:00 → 1st shift, **passes** | 05:00 → 3rd shift, fails |
| `...10:00:00.000-05:00` (177) | 15:00 → 2nd shift, **fails** | 10:00 → 1st shift, passes |

Each spelling is correct in exactly one timezone. The 177 change moved which
one, rather than removing the dependency — it was made on a Central machine,
where it genuinely did turn a red test green.

**The fix is to stop pinning an instant.** `new Date(2026,8,14,10,0,0,0)`
constructs from LOCAL components, so it is 10:00 wherever it runs, which is what
the assertion actually means. Verified green in **UTC, America/Chicago,
Asia/Tokyo and Pacific/Auckland**, and the whole suite re-run in UTC and Central:
**325 pass, 0 fail in both.**

## Also in 178: the CLOSE button you cannot reach

Curtis, on a phone: *"The X button is to the upper right. I can see it unless I
pull the screen down on phone. But even then I can't touch it because while
pulling down screen it's not responsive."*

Two separate faults, both measured rather than read.

**1. The header scrolled away.** The modal is the scroll container
(`overflow:auto`) and `.status-report-head` was `position:static` inside it. On a
41-bus report — 1208px of content in a 745px box — scrolling to the end put
CLOSE at **top:-449px**. The only route back was to overscroll, and a
rubber-band gesture does not deliver taps. Now `position:sticky;top:0;z-index:3`.

**2. The bare `header` rule was still winning.** `globals.css` gives every bare
`<header>` a fixed `height:38px`, and this element is a `<header>`.
`.status-report-head` never declared `height`, so the header measured **38px
while the 44px CLOSE button inside it overflowed its own bottom edge by 20px**.
`min-height` cannot undo a fixed height; only `height:auto` releases it. **Third
time this repository has been bitten by that rule**, so the reason is written
next to it in the file — it looks redundant and it is not.

**3. `100vh` → `100dvh` on the phone breakpoint.** On iOS `100vh` is the LARGE
viewport — the height the page would have with the browser chrome hidden — while
`.shade` next door is `height:100dvh`, the height actually on screen. A modal
capped at the larger of the two is a centred flex item taller than its
container, and a centred item overflows EQUALLY top and bottom. The bottom you
can scroll to; the top is simply unreachable. `100vh` stays first as the
fallback.

### Measured, at five widths, with every section ticked and scrolled to the end

```
                 CLOSE      top   in viewport  not covered  spill  overflowX
phone 360        74x44       14      true         true       -13       0
phone 390        74x44       14      true         true       -13       0
phone 430        74x44       14      true         true       -13       0
iPad portrait    74x40       61      true         true       -17       0
iPad landscape   74x40       47      true         true       -17       0
```

`spill` is the button's bottom minus the header's bottom — negative means it
sits inside its own header. Before the fix it was **+20**. `not covered` is an
`elementFromPoint` hit test at the button's centre, because a control that is
in the viewport but painted under something else is still untappable.

**Two mutations, two caught.** Removing `position:sticky` put CLOSE between
-596px and -2px at all five widths; removing `height:auto` returned the spill to
+20 and +16. Restore clean.

**iPad CLOSE is 40px, not 44**, which is by design above the 620px breakpoint and
is pre-existing. It belongs to the deferred iPad touch-target pass (issue #11)
rather than to this fix, and was left alone.

## Also in 178: MY ROLE is asked after FULL or LITE, not beside it

Curtis: *"On the Home Screen I want the question of MY ROLE to come up next
AFTER u pick Full or Lite version. Not at same time."*

**This reverses where the role picker was put when it was built.** It was folded
up under the mode buttons on purpose — the note in the file said stacking a
second question in front of the first "would turn a gate into a form." Curtis's
sequencing serves that same worry better than hiding one of them did: the screen
still asks one thing at a time, and the optional question is no longer competing
for attention with the one that gates the app.

The welcome gate is now two steps:

1. **Mode** — the name, the kicker, FULL and LITE. Nothing else.
2. **Role** — its own heading (ONE MORE THING), the department → union → job
   walk already built, opened rather than folded, plus **BACK** and
   **SKIP FOR NOW** (which reads DONE once a role is set).

**The ordering is structural, not a check.** The role panel renders only on the
role step, and the only route onto that step is `choose`, which writes the mode
first. So there is no state in which a job title can be picked before the mode
is answered — `chooseRole` needs no guard, and a test asserts the panel's
`step==="role"` gate rather than trusting one.

Re-opening from Settings always starts at the mode step, so the same tap shows
the same screen every time. **The cost:** somebody who wants to change only
their role now re-picks their mode on the way through — two taps, and it writes
the value it already had.

Driven in Chromium at 390 and 820 on a genuinely empty device: role absent from
step 1, the gate staying open on picking a mode, the mode stored *before* step 2
renders, the picker already open, SKIP and BACK both 44px and in view, no
horizontal scroll, the job list for Maintenance / Non-Union reading Foreman /
Asst Supt / Supt, picking Foreman storing the role and closing, BACK keeping the
mode already written, and SKIP closing with no role stored.

**Two mutations, two caught.** Putting the panel back on the mode step, and
closing on mode choice as before — both fail the suite; the first also fails the
browser walk.

## Storage

**Nothing.** No key added, renamed or migrated. `pace-app-mode-v1` and
`pace-role-v1` keep the shapes they already had; only the order they are asked
in changed.

## What to check once it is live

0. In Settings, press **SHOW THE WELCOME AGAIN**. Pick FULL or LITE — **MY ROLE
   should appear next, on its own screen**, not alongside the two buttons. SKIP
   FOR NOW should close it without setting anything.
1. Open the **STATUS REPORT** on a phone with a full sheet. Tick everything so
   the report is long.
2. Scroll to the very bottom of the report. **CLOSE must still be sitting at the
   top of the modal** — that is the whole fix.
3. Tap it without pulling the screen down first. It should close.
4. The dark header should be tall enough to contain the button, rather than the
   button hanging below the navy band.

## The way back

A straight redeploy of `sites-v177`. Nothing migrates. Note that rolling back
also restores the red test — the CI failure on `main` is fixed forward by 178,
not by reverting to 177.

For the next release, document one exact source commit, completed validation, storage or migration impact, and the post-publish checks here before requesting production publication.