# Publish next

**STATUS: 188 PENDING.**

188: the LIVE REPAIR FEED can be narrowed to a shift or a day. Everything up to
and including 187 is already live.

| Version | Publish from | What | Section |
| --- | --- | --- | --- |
| 188 | `1b8ab7c` | A WHEN LOGGED drop-down on the Defect Log feed | [188](#188--publish-from-1b8ab7c) |

Application release 187 is live as Sites platform version 184 from
`b182776394e2b3b59ef7b969c58bf35c9c93f6a2`, published 2026-10-11, and is the
rollback point. It includes releases 182-187.

See [release evidence](RELEASES.md) and the preserved [release 187 handoff](archive/PUBLISH_RELEASE_187.md). Physical Safari/Home Screen/device migration checks remain for Curtis; no operational data was changed during publication.
\n

# 188 — publish from 1b8ab7c

## Source

```
$ git log --oneline 5135c39..1b8ab7c
1b8ab7c The LIVE REPAIR FEED can be narrowed to a shift or a day

$ git diff --name-only 5135c39..1b8ab7c
app/defect-log/defect-log.css
app/defect-log/page.tsx
src/lib/defects/feed-window.ts
tests/defects.test.mjs

$ git diff --shortstat 5135c39..1b8ab7c
 4 files changed, 346 insertions(+), 5 deletions(-)

$ git diff --name-only 5135c39..1b8ab7c -- supabase package.json package-lock.json .github public worker
```

The last command prints nothing: no schema change, no dependency change, no CI
change, no public asset. One commit, one screen.

## Migrations

**None, and no storage key is added, renamed or written.** The window lives in
React state for the session only. Nothing on disk changes shape, and nothing
outside the Defect Log is touched.

## What was wrong

The LIVE REPAIR FEED had **no time filter at all**. `time-window.ts` built one
in 184, but it is drawn only inside the quick-filter drawer and on the two Down
Sheet boards — lists of BUSES somebody has already ruled on. The log itself,
every defect on the board, could be narrowed only by state or by typing in the
search box. On a board carrying days of work there was no way to read today.

Curtis: *"filter everything that's being put down ... by the day and by the
shift, so in the last 24 hours, or by the shift ... it should be like a
drop-down somewhere at the work computer."*

## What changed

**A WHEN LOGGED drop-down in VIEW**: ALL · THIS SHIFT · TODAY · LAST 24H · LAST
3 DAYS · LAST 7 DAYS. A drop-down rather than a seventh chip, because that row
is thumb targets that have to stay on one line at 360px and this is one question
asked at a desk.

**Every window is "N minutes back from now."** A rolling span says so outright;
THIS SHIFT is however long the shift has been running; TODAY is however long
since midnight. One number means one comparison and no second code path for a
clock-based window to be wrong in. THIS SHIFT asks the same clock the Down Sheet
and the forecast ask, so the incoming crew owns the handover — at 14:05 it is
five minutes, not 8H's eight hours.

**A search stands the window down**, which was Curtis's own condition: he wants
to reach a bus "no matter what time" it was logged. An active search sets the
limit to null outright and the search bar says SEARCHING EVERY DATE. Clearing
the search puts the chosen window back in force.

**The state and the way out live OUTSIDE the collapsible drawer.** VIEW is shut
by default, so a narrowed board explaining itself only in there would be the
trap this control could have been. A bar sits beside the search bar carrying
the window, how many buses it holds back, and its own SHOW ALL DATES.

**Sticky but not stored.** The shop computer's tab does not reload, so this is
permanent in practice for the person who asked; a storage key would instead mean
somebody reads a short board tomorrow that nobody narrowed today.

**Nothing else moved**, which he asked for explicitly. `TIME_WINDOWS` is
untouched and a test asserts TODAY never reaches it — that list is drawn by four
other lists, and its own header warns about a chip which means ALL on screens
that cannot resolve it. The age is read off `createdAt`, never `updatedAt`.

## Verified

- `npm test` 352 pass (351 before), `npm run lint` clean, `npm run build`
  complete — on `1b8ab7c`, the merged commit.
- **Eight mutations** against the two new tests: zero treated as "no window", an
  undated defect kept in a narrowed one, TODAY made rolling, the age read off
  `updatedAt`, an unresolvable shift claiming a window, TODAY leaked into the
  shared chip row, search no longer standing the window down, and the bar moved
  inside the collapsed drawer. The last initially PASSED, which exposed a weak
  assertion rather than a weak control — it pinned ordering, which stays true
  with the bar moved inside. It now pins what sits between the two bars.
- **Measured in Chromium at 1180, 430 and 360** on a board seeded with defects of
  known ages: ALL 5 buses, TODAY 2, LAST 24H 2, LAST 7 DAYS 3, THIS SHIFT 1. The
  undated defect appears in ALL and in no narrowed window. The select is 44px
  tall at every width. With TODAY on, a week-old bus was absent and came back on
  searching its number, with SEARCHING EVERY DATE on the bar.
- **Failure paths driven**: edited shift hours are followed, a window matching
  nothing empties the board but keeps its bar, and SHOW ALL DATES is visible and
  clickable with VIEW shut and restores the whole board.
- CodeRabbit's one failing pre-merge check is **Docstring Coverage at 66.67%
  against its DEFAULT 80% threshold**. Not acted on, and the reasoning is in a
  comment on PR #34: `src/lib` has zero JSDoc blocks across 93 files against 850
  plain block comments, so adopting JSDoc in one new file to clear a default
  would make it the only file of 93 that looks different. Its walkthrough is
  accurate and its other four checks passed.

## What to check once it is live

1. Open the **Defect Log** and expand **ADVANCED ACTIONS**. Under VIEW there
   should be a **WHEN LOGGED** drop-down, reading ALL.
2. Pick **TODAY**. The feed should narrow, and a bar should appear beside the
   search bar reading `LOGGED TODAY · N OLDER BUSES HIDDEN`.
3. **Collapse ADVANCED ACTIONS.** The bar must still be there, and **SHOW ALL
   DATES** on it must put the whole board back without reopening the drawer.
4. Pick **THIS SHIFT**. The bar should name the shift and its start, e.g.
   `LOGGED 2ND SHIFT · SINCE 14:00` — not the words "THIS SHIFT".
5. With a window on, **search a bus you know is older than it**. The bus must
   appear, and the search bar must read `SEARCHING EVERY DATE`. Clear the search
   and the window comes back.
6. Confirm the **Down Sheet's DEFERRED and RECOMMENDED boards** and the Defect
   Log's own **quick-filter drawer** still show their usual chip row — ALL, 1H,
   4H, 8H, 24H, 3D, 7D, plus SHIFT in the drawer — with no TODAY among them.

## Rollback

Roll back to 187, Sites version 184 (`b182776394e2b3b59ef7b969c58bf35c9c93f6a2`).

**Nothing stored is altered**, so no defect, entry, recommendation, deferral,
writeup or repair time is at risk. The drop-down simply is not offered and the
feed shows everything, which is what it did before this release.
