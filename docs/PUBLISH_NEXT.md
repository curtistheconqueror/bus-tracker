# Publish next

**STATUS: 178 PENDING — the CLOSE button on the Fleet Status Report, and main is
red without it.**

Sites Version 177 was published from `c18f635eef6a44b35ee76c240475d11eeb13ea64`
on 2026-09-14. The rollback tag is `sites-v177` at that exact source commit. The
prior production rollback point is Version 176 from `5e6fd58`.

**Two commits**, on top of the 177 release record (`bc76850`). One is a bug
Curtis hit on his phone; the other is why `main` is currently failing CI.
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

## Storage

**Nothing.** No key added, renamed or migrated. 178 is one CSS rule block and one
test constant.

## What to check once it is live

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