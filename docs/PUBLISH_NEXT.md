# Publish next

**STATUS: 189 PENDING.**

189: the **DEFECTS LOGGED** count in the quick-filter menu is quoted over a span
somebody picks, and it now says the truth at the moment it is read. Everything
up to and including 188 is already live.

| Version | Publish from | What | Section |
| --- | --- | --- | --- |
| 189 | `5bc0796` | A span picker on the DEFECTS LOGGED count, and the count made live | [189](#189--publish-from-5bc0796) |

Application release 188 is live as Sites platform version 185 from
`3b19e339446a9784898aa1cdd1f37b514c3a9d7d`, published 2026-10-14, and is the
rollback point.

See [release evidence](RELEASES.md) and the preserved
[release 188 handoff](archive/PUBLISH_RELEASE_188.md). Physical Safari/Home
Screen and offline device checks remain for Curtis; no operational data was
changed.

# 189 — publish from `5bc0796`

## Source

```
$ git log --oneline 2f95ad1..5bc0796
5bc0796 Keep the DEFECTS LOGGED count honest about the moment it is read
f30e3f5 DEFECTS LOGGED counts over a span somebody picks

$ git diff --name-only 2f95ad1..5bc0796
app/defect-log/page.tsx
app/globals.css
src/components/defects/quick-filter-menu.tsx
tests/defects.test.mjs

$ git diff --name-only 2f95ad1..5bc0796 -- supabase package.json package-lock.json .github public worker
```

**PUBLISH FROM `5bc0796`, NOT `f30e3f5`.** The feature landed first and then took
one round of fixes. On `f30e3f5` alone the row can read `DEFECTS LOGGED · 2`
while the list it opens shows 1 — measured, both widths — which is the exact
failure the feature exists to prevent. It was never live and should not be.

The last command prints nothing: no schema change, no dependency change, no CI
change, no public asset. Two commits, one screen plus the menu it shares with
two others.

## Migrations

**None, and no storage key is added, renamed or written.** The span lives in
React state for the session only, like the chips it mirrors. Nothing on disk
changes shape.

## What was wrong

The count beside **DEFECTS LOGGED** in the quick-filter menu was answering a
different question from the list it opened. The count came from
`candidateIdsFor`, which narrows by initials and by nothing else; the drawer
behind it opens on THIS SHIFT. So the menu said 108 and the list showed a
morning's work, and neither was wrong about its own question.

Curtis, looking at it reading 108: *"I want a per shift and 24 hour selection
too. Just turn this field into a dropdown so I can pick what I want."*

## What changed

**A span picker on that one row**, offering the same spans as the chips in the
drawer below it — ALL · SHIFT · 1H · 4H · 8H · 24H · 3D · 7D — from the one
list, so a shift that cannot be resolved is offered in neither.

**One window serves the count and the list.** The picker sets it, the drawer's
chips set the same thing while LOGGED is open, and the count is counted over it,
so the number on the row is the number of rows behind it.

**Only this row.** Every other count in that menu answers "what is true right
now", where the age of the record is not the question — the same reason
`time-window.ts` keeps a window off those filters. The aside is an optional prop
on the shared menu and the Down Sheet and Facility Map pass nothing, so their
markup is byte-identical to before.

**THE COUNT IS LIVE, AND THAT WAS THE FIX IN THE SECOND COMMIT.** A span moves
on its own — 14:00 arrives, the 24 hours roll — and nothing else re-renders this
screen, so a frozen number was the default outcome rather than an edge case:
left on a desk through a handover the row kept quoting the morning crew's work.
The half-minute clock the feed's own window already runs now ticks for this span
too, **but only while the popover is open**, because the count is drawn there
and nowhere else and the span starts on SHIFT — ticking whenever it is bounded
would have every Defect Log on every phone re-rendering twice a minute for the
life of the tab.

**The count is computed in the same pass as the list it must agree with.** It
was memoized on the first cut; `fleet` is state and holds its identity across
renders, so that cache held while the drawer was rebuilt from a fresh clock
every render. It only looked right because `shiftWindowMinutes` ticks once a
minute and happened to invalidate it — a dependency that is `null` the moment a
shift cannot be resolved, so the agreement rested on something that is not
always there.

**Nothing else moved.** No storage key, no catalog wording, no sync payload, no
Down Sheet or Facility Map behaviour.

## Verified

- `npm test` **355 pass** (354 before this release), `npm run lint` clean,
  `npm run build` complete — on `5bc0796`, the merged commit. CI green on the
  PR's head.
- **Ten mutations** against the new assertions, all caught: the count
  re-memoized, the clock gated on the feed alone, the effect not re-armed when
  the menu opens, the page never told the menu is open, the menu reporting
  nothing, the report wired to the trigger only (missing all four close paths),
  the bus ids asked a second way, the Down Sheet growing the prop, and the
  open-gate inverted or removed.
- **Measured in Chromium at 1180 and 390**, seeded with defects of known ages:
  the count follows the picker (ALL 5, 24H 4, SHIFT 3, 1H 2) and matches the
  drawer header it opens. 13 unwrapped rows plus 1 wrapped on the Defect Log;
  the Down Sheet's 9 and the Facility Map's 14 rows stay unwrapped and measure
  230×39 as before. Tap targets 44px at 390, 39px at 1180 — matching the rows
  beside them.
- **The live behaviour was measured, not asserted.** With a record seeded 20
  seconds inside the 24H edge and nothing touched afterwards, the count goes
  **2 → 1** as the edge crosses it and the drawer agrees. On `f30e3f5` the same
  measurement reads **2 → 2 with the drawer showing 1**: the count frozen and
  openly disagreeing with its own list. The extra timer fires only while the
  popover is open, counted by hooking `setInterval` before the app loads.
- **The review finding was CodeRabbit's on PR #36**, and it was right about the
  cause. The fix is not its suggested diff: adding the clock to the memo's
  dependencies leaves the cache in place, and gating the tick on the span alone
  would tick always. Both are explained on the thread.
- **Two fixture bugs came before any app finding**, which is this repo's usual
  order and is recorded because the lesson keeps earning its place: a record
  stamped at script start had already aged past the span being tested, so a
  correct count read as a stale one; then a re-stamp was written before a reload
  while `addInitScript` — which runs again on every reload — re-seeded the
  original age straight over it.
- CodeRabbit's one failing pre-merge check is **Docstring Coverage at 50.00%
  against its DEFAULT 80% threshold**, declined for the third release running
  for the reason given on PR #34: `src/lib` has zero JSDoc blocks across 93
  files against 850 plain block comments, so adopting JSDoc to clear a default
  threshold would make the new code the only code in the repository that looks
  different. Its walkthrough is accurate and its other four checks passed.

## What to check once it is live

1. Open the **Defect Log**, expand **ADVANCED ACTIONS**, and open **QUICK
   FILTERS**. The **Defects Logged** row should carry a small drop-down beside
   its count, reading **SHIFT**.
2. Change it to **24H**. The count must change, and the other thirteen rows must
   not.
3. **Tap the row.** The drawer's heading count must equal the number that was on
   the row. Change a chip in the drawer and reopen the menu — the drop-down must
   be on the chip you picked.
4. Press the drop-down itself. It must **not** toggle the filter the row sits
   on; only the number should change.
5. On a phone, check the drop-down and the row are the same height as the rows
   above and below — nothing shorter than a thumb.
6. Open **QUICK FILTERS** on the **Down Sheet** and the **Facility Map**. Those
   menus must look exactly as they always have, with no drop-down on any row.

## Rollback

Roll back to 188, Sites version 185
(`3b19e339446a9784898aa1cdd1f37b514c3a9d7d`).

**Nothing stored is altered**, so no defect, entry, recommendation, deferral,
writeup or repair time is at risk. The drop-down simply is not offered and the
count goes back to the fleet-wide number it was.
