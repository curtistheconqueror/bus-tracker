# Publish next

**STATUS: 189 AND 190 PENDING, IN THAT ORDER.**

Two releases are stacked. 189 was handed over before 190's work began and has
not been published yet, so this file now carries both; 190 sits on top of 189
in `main`'s history and cannot go first. Everything up to and including 188 is
already live.

| Version | Publish from | What | Section |
| --- | --- | --- | --- |
| 189 | `5bc0796` | A span picker on the DEFECTS LOGGED count, and the count made live | [189](#189--publish-from-5bc0796) |
| 190 | `c9c03d6` | The defect picker opens on group titles, typing stops lagging, AI OPERATOR warns before it leaves | [190](#190--publish-from-c9c03d6) |

**PUBLISHING BOTH AT ONCE IS FINE AND IS PROBABLY WHAT TO DO.** 190's tree
contains 189's work, so one publish from `c9c03d6` ships both, and this file's
own release numbers are the only thing that then needs two entries in
`docs/RELEASES.md`. Publishing 189 alone from `5bc0796` is also valid and is
the smaller step if either release needs to be judged on its own.

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

# 190 — publish from `c9c03d6`

## Source

```
$ git log --oneline 355ff9a..c9c03d6
c9c03d6 Merge pull request #37 from curtistheconqueror/claude/codex-workflow-docs-fn9any
86afbc7 Typing in the defect editor stops redrawing what it is not changing
a7bbd1e The defect picker opens on group titles instead of every defect
905c4e4 The bus picker stops rebuilding the fleet on every character
97ee547 AI OPERATOR names where it is going before it goes

$ git diff --name-only 355ff9a..c9c03d6
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/_components/down-sheet-editor.tsx
src/components/shared/bus-selector.tsx
src/components/shared/combo-field.css
src/components/shared/combo-field.tsx
src/lib/defects/defect-search.ts
tests/defects.test.mjs
tests/down-sheet.test.mjs
tests/shared.test.mjs

$ git diff --name-only 355ff9a..c9c03d6 -- supabase package.json package-lock.json .github public worker
```

**PUBLISH FROM `c9c03d6`, THE MERGE COMMIT ON `main`.** The four commits landed
through PR #37 as one merge; `c9c03d6` is what `main` actually is and the only
point where all four are present together. None of the four is publishable on
its own — `a7bbd1e` removes a row cap that `86afbc7` then depends on not being
re-applied, and `86afbc7` corrects a figure stated in `a7bbd1e`'s own code.

The last command prints nothing: no schema change, no dependency change, no CI
change, no public asset. Three surfaces' files, and the shared picker both the
Defect Log and the Down Sheet draw.

## Migrations

**None, and no storage key is added, renamed, read or written.** Every piece of
this is render-time: a confirm dialog, two memoised lists, and which rows a
drop-down draws first. Nothing on disk changes shape and nothing is persisted
that was not persisted before.

## What was wrong

**THE AI OPERATOR LEFT THE SCREEN WITHOUT SAYING SO.** Curtis: *"When I press
Ai operator and I am on the Defect page it routes me to the map. With no
warning."*

**TYPING LAGGED, IN EVERY FIELD.** Curtis: *"when I'm inputting the bus number,
there's a slight delay or lag. It's not, you know, smooth and consistent."*
Then, widening it himself: *"Not just the bus number input into the bus number
field, but any other text input."*

**AND THE DEFECT DROP-DOWN OPENED ON EVERYTHING AT ONCE.** Curtis: *"when the
person presses that the sub category I only need those titles to show first
those main titles so it's a lot more organized and you can get to what you need
faster instead of scrolling through all the defects."* And on who it is for:
*"if I'm having a hard time passing through it and getting to what I want and
I'm the creator then I know somebody else is gonna have twice as hard of an
issue."*

## What changed

**AI OPERATOR NAMES ITS DESTINATION AND WAITS.** Cancel and the board is
exactly as it was; accept and it goes to the Facility Map as it always did. On
a narrowed board a second line says the search and filters reset. The button is
unchanged — same words, same box to the pixel at 1180, 430, 390 and 360 — and
it stays an `<a>` with its href, so a long-press still opens the map in a
second tab, which leaves this board standing and has nothing to warn about.

It is NOT a block, and that was deliberate: the Operator cannot run here at all,
because `executeOperator` is bound to the map's own state and the plans it
carries out are map actions. Going to the map is the feature; saying so was
what was missing. Removing the control from this screen instead remains the
alternative and is a one-line change.

**THE DEFECT PICKER OPENS ON GROUP TITLES.** Each is a full-width row carrying
how many defects sit behind it; pressing one shows that group and nothing else,
with a sticky header back to the titles. Measured on Operator/Driver Controls,
the case Curtis named: four titles — Driver Seat, Gauges and Dash, System
Switches, Operating Controls — where there had been a scroll.

Done on EVERY category rather than only the crowded ones, which he asked for
outright: *"just do it for everything regardless even if they only have two sub
categories just to keep a consistent looking feel."* The shape follows whether
the rows carry groups at all, so the CATEGORY picker — whose rows carry none —
is the same flat list it always was, and the Down Sheet's SPECIFIC REPAIR field
gets the same drill-down, because it is the same control over the same catalog.

**Typing is untouched.** A query still searches every wording in one ranked flat
list across all categories, and typing leaves the group, or a search would run
inside one group and silently miss most of what matched.

**The titles are bigger** because they are now what is read first: 13px against
the 10px option line on the shop computer, 19px against 16px on a phone.

**TYPING STOPPED REDRAWING WHAT IT IS NOT CHANGING.** Three things, none of them
visible:

- The bus picker's two 84-row option lists and the sort that feeds them derive
  from the fleet and the chosen generation rather than being rebuilt per
  character, through one `Intl.Collator` made once instead of `localeCompare`
  building a fresh one per comparison.
- A closed drop-down ranks nothing. It ranked its whole list open or shut, which
  is once per character typed anywhere else in the same form.
- The bus picker is memoised and its one callback held still, so a character
  typed in DETAILS no longer redraws 174 of the editor's 312 nodes.

## Verified

- `npm test` **359 pass** (355 before this release), `npm run lint` clean,
  `npm run build` complete — re-run on `c9c03d6`, the merge commit, after the
  merge. CI green on the PR's head.
- **Thirty-two mutations** across the four commits' new assertions, every one
  caught — seven on the operator warning, seven on the picker's memoisation,
  fourteen on the drill-down (ten, then four more after the way-back row was
  moved out of the keyboard walk), and four on the last commit. Among them: the picker un-memoised; the collator moved back inside the
  sort; the option lists mapped inline again; the browse re-capped at 40 rows;
  the outside-press listener returned to the bubble phase; the ungrouped
  as-logged row dropped; typing left inside a group; the arrows walking options
  rather than rows; the back row made walkable again; AI OPERATOR warning and
  then navigating anyway; and one that quietly takes a 6ms win by changing
  behaviour.
- **Driven in Chromium at 1180 and 390**, not read: the category picker
  unchanged at 21 rows with no titles; titles with counts; a title giving its
  defects plus the header and no titles; back returning to the titles; typing
  "light" giving 26 flat rows and no titles; clearing returning to titles; a
  defect still logging. Keyboard: ArrowDown/Enter enters a group and lands on
  its first defect, Escape steps out, Enter logs. The bus picker resolves a full
  number, lights its generation, leaves an unknown number unresolved, narrows to
  28 of 84 on a chip, and fills the number from the list. The Down Sheet's copy
  of the picker behaves identically at both widths. No console errors.
- **The latency is measured, not asserted.** 6x-throttled, which stands in for a
  tablet, on an 84-bus board:

  | | bus number field | DETAILS box |
  | --- | --- | --- |
  | before | median 40-45ms, worst 115ms, 25-31% over 50ms | median 33.6ms, worst 63.6ms, 9 of 162 over 50ms |
  | after | median 33ms, worst 58-85ms, 5-7% over 50ms | median 31ms, worst 47.5ms, **0** of 162 over 50ms |

  The medians move about 10ms, which is at the edge of perceptible. The TAIL is
  where it lands, and the tail is the half of the report that said "not smooth
  and consistent".

- **IT IS NOT iOS, AND THAT WAS MEASURED BEFORE ANYTHING WAS CHANGED.** Same
  board, same page, only CPU speed varied: 22ms at full speed, 32ms at 4x
  slower, 46ms at 6x. At full speed, going from 56 defects to 356 moved it about
  1ms — 21.1ms to 22.0ms. (On a throttled CPU a heavier board does cost more,
  54.8ms against 45.6ms at 6x, which is the same finding from the other side:
  the work is per-character and a slower processor is what exposes it.)
  Latency that tracks CPU while ignoring board size is work the app does per
  character. A bare `<input>` in the same browser measured 10ms.
- **WHAT COULD NOT BE TESTED HERE.** There is no WebKit in the build container,
  so none of this ran on Safari's own input pipeline — the engine Curtis's iPad
  and phone actually use. iOS adds latency of its own that none of these changes
  touch. The numbers above are Chromium with a throttled CPU as a stand-in.
- **A profile settled where to stop.** With source maps, typing in DETAILS put
  none of this project's own functions above the 0.2ms sampling floor: the
  remaining cost is React reconciling a 312-node form and the browser painting
  it, not our JavaScript. There is no further easy win in this file.
- **Three findings came out of building it**, all recorded in the commits: a row
  with no group must not be swallowed by grouping (the as-logged wording, the one
  row that keeps an old record editable); the 40-row cap belonged to the ranked
  list and not the browse, where it cut the catalog arbitrarily; and React 18
  flushing `mousedown` synchronously meant a title press detached its own row
  before the outside-press listener judged it, so the list closed on a tap that
  landed inside it.
- **One figure in a code comment was fabricated and then corrected.** The first
  draft of the closed-list comment claimed a gain of 33.6ms to 27.3ms, written
  before the measurement was run; the real result was about a tenth of that. It
  now states what was measured. Recorded here because a handoff that hides it is
  worth less than one that does not.
- **A deliberate 6ms was left on the table.** Only reporting a bus change when
  the resolved bus actually changes measures about 6ms more per character, and it
  IS a behaviour change: today a non-matching digit calls `select("")`, which is
  what clears a page search the chosen bus would hide. Not taken, a test pins the
  call as it was, and it is Curtis's call.
- CodeRabbit reviewed all four commits and generated **no actionable comments**
  on any of them, at ⚪ Minimal merge risk. Its one failing pre-merge check is
  **Docstring Coverage against a default 80% threshold**, declined for the fourth
  release running for the reason given on PR #34: `src/lib` carries zero JSDoc
  blocks across 93 files against 850 plain block comments.

## What to check once it is live

1. On the **Defect Log**, expand **ADVANCED ACTIONS** and press **AI OPERATOR**.
   It must ask before going anywhere. Say no — you should still be on the Defect
   Log with your filters untouched. Say yes and the Operator opens on the map.
2. Narrow the board first (a search, or WHEN LOGGED) and press it again: the
   message should carry a second line about the view resetting.
3. Press **+ LOG DEFECT**, then the **SPECIFIC DEFECT OR SYMPTOM** field. It
   must open on **section titles with counts**, not a wall of defects. Press one
   — only that group's defects, plus **← ALL GROUPS** at the top.
4. **Type** in that same field. It must search across everything in one flat
   list, the way it did before, and not stay stuck inside a group.
5. Check the **DEFECT CATEGORY** field above it is unchanged — a plain list of
   categories, no titles.
6. Open the **Down Sheet**'s add-a-bus editor and check its **SPECIFIC REPAIR**
   field does the same thing.
7. **Type a bus number** into the editor, and type a sentence into DETAILS.
   Watch for stutter rather than for raw speed — the fix removed the occasional
   slow character more than it lowered the average. This is the one item on this
   list that cannot be confirmed from the code, because the engine it matters on
   is Safari's.

## Rollback

Roll back to 189 if it has been published (`5bc0796`), otherwise to 188, Sites
version 185 (`3b19e339446a9784898aa1cdd1f37b514c3a9d7d`).

**Nothing stored is altered by this release**, so no defect, entry,
recommendation, deferral, writeup or repair time is at risk. Rolling back
restores the old drop-down, the old typing cost, and an AI OPERATOR that leaves
without asking.
