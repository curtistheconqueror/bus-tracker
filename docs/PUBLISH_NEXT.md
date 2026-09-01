# Publish next

**STATUS: PENDING — one release is queued, frozen to its exact SHA. Version 134 is live.**

| Order | Version | Publish from | What it is |
| --- | --- | --- | --- |
| 1st | **135** | `d3c05c3` | MERGE DUPES actually merges instead of silently doing nothing, and a repair can record that it was test driven and how its brake test went |

**Version 134 is live from reconciled source `43ddeae`.** Publish **135** from
`d3c05c3`.

This file always describes the unpublished releases, and it lives at this exact
path on `main` so nobody has to be told where to look. Curtis approves a release
by pointing Codex at this file rather than pasting a summary out of a chat
window.

- **Claude Code** keeps this file current with every push to `main`: the source
  commit, what changed, any migration, and what to check once it is live. Claude
  Code never publishes and never marks a version live.
- **Codex** publishes from here, then in the same follow-up commit updates
  `docs/RELEASES.md` and `PROJECT_HANDOFF.md` and replaces this file with the
  next handoff, or resets it to `STATUS: NONE PENDING`.
- **STATUS: NONE PENDING** means everything on `main` is already live and there
  is nothing to publish. Read the status line before anything else.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` for the lifecycle itself; this file
supplies only what that runbook asks for — the exact source, what changed, and
what to check once it is live.

---

# Version 135 — A cleanup that actually saves, and two things a mechanic can record

**Publish this next, after Version 134.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`d3c05c3`** |
| Last code-bearing commit | `d3c05c3` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 134, published from reconciled source `43ddeae` |

One commit, four files, and for once nothing to explain away — no
documentation-only commit sits inside this range:

```
git log --oneline 72d58be..d3c05c3
d3c05c3 Fix MERGE DUPES silently doing nothing, and add TEST DRIVEN and BRAKE TEST

git diff --name-only 72d58be d3c05c3
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/repair-catalog.ts
tests/rendered-html.test.mjs
```

No dependency, database, or CI change. The filter returns nothing:

```
git diff --name-only 72d58be d3c05c3 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 176 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration, no dependency change.** `supabase/`, `package.json`
and `package-lock.json` are untouched.

**No LocalStorage key added, renamed or removed.** Nothing already stored is
rewritten on read.

**Two new work-state keys and one new optional field on a stamp:**

| Addition | Shape | Notes |
| --- | --- | --- |
| `test-driven` | a work-state key like the existing three | stamps who and when |
| `brake-test` | a work-state key | stamps who and when |
| `result` | `"pass" \| "fail"` on a `WorkStateStamp` | only ever set on `brake-test` |

Verified against the real module rather than asserted: a record written by an
earlier build — carrying only `inspected` / `diagnosed` / `parts-on-order` —
reads back untouched, and a record carrying the two new keys round-trips with
its result intact.

**A result is only accepted if it is one of the two values the brake test can
mean.** Anything else a hand-edited file or a newer build put there is dropped
on read rather than carried, so a result can never be a value the app does not
know how to render.

## Known issue this release does not fix

**Work states do not survive being read by an older build.** `normalizeWorkStates`
whitelists the keys the running build knows, so any key it does not recognise is
dropped on read. Confirmed by running an unknown key through it: it comes back
gone.

In practice: a brake test recorded on an updated device and carried to a device
still running Version 134 by the Shop Cloud will not show there, and if that
older device then writes the bus back, the brake-test stamp is lost. This is not
new behaviour and it is not specific to these two keys — it is how work states
have always read — but it is the first time it can cost a safety record, so it
is named here rather than discovered. **Update every device that sees these
records.** The defect itself, its availability, and every other field are
unaffected; only the work-state ticks are lossy across versions.

## What changed

### 1. MERGE DUPES never actually merged anything — the reason to publish

Reported from the floor as "it doesn't seem to work… as if I didn't select it,"
and reproduced in a browser before anything was touched. On a board of 21 buses
each carrying the same fault twice:

| | |
| --- | --- |
| Defects in storage before | **42** |
| Defects in storage after | **42** — nothing was written |
| What the mechanic was told | *"21 duplicate records merged on 21 buses"* |
| Shop Cloud tombstones written | **21**, for records that were never merged |

Three faults in one path:

- The **bulk-loss safety stop** refuses any write that drops five or more
  records. That is exactly right for a bad sync or a bug, and exactly wrong for
  a cleanup whose entire purpose is to end with fewer records — and whose count
  was shown in the confirm prompt before anybody agreed to it.
- The handler **never checked whether the write succeeded**, so it showed a
  success alert over a save that had been refused.
- It then **wrote tombstones anyway**. This is the dangerous one: the tombstone
  ledger tells the Shop Cloud to drop those ids on the way out and refuse them
  on the way in, so the cloud could lose records the device still holds.

`persist()` now takes write options and returns its result. The merge is the
**only** caller that passes `allowBulkDefectLoss` — every other save on the
Defect Log keeps the full guard — and it stops dead if the write fails: no
success alert, no tombstones. The recovery snapshot is deliberately **not**
skipped, so the pre-merge board is still written to `pace-board-recovery-v1`
before anything changes. That snapshot, the confirm count, UNDO LAST, and merge
rules that provably keep every field are the safety net here, rather than a
record-count guard that cannot tell a cleanup from a catastrophe.

Both paths were then measured, not reasoned about:

- **Success:** 42 defects to 21, the MERGE DUPES badge clearing to nothing, one
  success alert, tombstones written correctly, recovery snapshot present.
- **Refused write:** no success alert, **zero** tombstones, and a plain
  `NOT SAVED — THE SAVED BOARD CANNOT BE READ` banner.

### 2. TEST DRIVEN and BRAKE TEST

WORK DONE SO FAR gains two tiles. `repair-catalog.ts` carried a warning against
a fourth work state — *"a fourth invites two mechanics to tick different boxes
for the same job"* — and that warning is about **overlap**: inspected and
diagnosed can blur, because both are judgements about how far the thinking has
got. Test driven and brake test are neither judgements nor stages but discrete
physical acts that either happened or did not, so the warning does not bite. The
comment has been updated to say so rather than left to contradict the code.

**BRAKE TEST is the only state that carries a result**, because "brake test:
done" with the outcome left to prose is exactly the ambiguity that costs most on
a safety item, and a failed brake test is the first thing anybody would want to
pull as a list — which free text cannot answer.

- The tile stays plain until ticked, then reveals **PASS | FAIL** as one
  either/or rather than two checkboxes, so a pass and a fail cannot both be
  recorded, and neither can a result with no test behind it.
- **A fail sets BUS AVAILABILITY to Remove From Service.** The alternative is a
  record saying the brakes failed sitting beside an availability that still says
  the bus may stay in service. The dropdown stays editable, so this is a
  decision made *for* somebody rather than taken away from them.
- **A pass never returns a bus to service on its own**, including after a
  mis-tapped FAIL. Where the bus is still down, the hint says so and points at
  the dropdown.
- Re-signing a brake test keeps the result already recorded; unticking clears
  the whole stamp.

Both stamp who and when like every other work state — the "Aug 31" that already
appears under INSPECTED.

## Data safety

- **No LocalStorage key renamed or removed**, nothing rewritten on read.
- **Change 1 strictly reduces risk.** Before it, a refused merge still wrote
  tombstones instructing the cloud to drop records; now nothing is written
  unless the board itself was written first.
- **The bulk-loss guard is lifted for one operation only** — the merge — and
  the recovery snapshot is still taken, so the pre-merge board remains
  restorable from the existing recovery control.
- **Additive fields only**, verified round-tripping against the real module.
- The cross-version work-state caveat above is the one place this release can
  lose something, and it is a property of how work states have always been read.

## Validation

- 176 regression tests passing, up from 174 at Version 134
- ESLint clean; production build succeeds
- **The merge bug was reproduced before it was fixed and re-measured after** —
  42/42 with a false success message beforehand, 42→21 with the badge clearing
  afterwards
- **The refused-write path was forced deliberately**, by corrupting the stored
  payload after the page had loaded, and confirmed to make no claim and write
  no tombstones
- **The brake test was driven at phone width in a real browser**: five tiles
  present, the result control hidden until the tile is ticked, PASS and FAIL
  rendering, FAIL flipping availability from `service` to `down`, PASS leaving a
  down bus down, and the saved record carrying `{ at, result: "fail" }`

## After it is live

1. **Defect Log → MERGE DUPES.** On a board with duplicates, press it and
   confirm the count in the button actually drops to nothing and the defect
   totals at the top of the page fall by the number it reported. Before this
   release, the number did not move.
2. **Anyone who pressed MERGE DUPES on Version 134** wrote tombstones for
   records that were never merged. Pressing MERGE DUPES once on this version
   reconciles them — the records genuinely merge, and the tombstones become
   accurate rather than stale.
3. **Open any repair → WORK DONE SO FAR** and confirm five tiles:
   INSPECTED, DIAGNOSED, PARTS ON ORDER, **TEST DRIVEN**, **BRAKE TEST**.
4. **Tick BRAKE TEST** and confirm PASS and FAIL appear beneath it. Press
   **FAIL** and confirm BUS AVAILABILITY changes itself to **Remove From
   Service**, with a line saying so.
5. **Press PASS on that same repair** and confirm the bus is *not* silently put
   back in service — the note should point you at the dropdown instead.
6. **Save and reopen** the repair; the tick, the result, and the date should all
   still be there.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 135 | Live | <published tip hash> | MERGE DUPES now actually writes the merge instead of being refused by the bulk-loss guard while reporting success and writing Shop Cloud tombstones for records it never merged; the guard is lifted for that one deliberate, confirmed cleanup only, with the recovery snapshot still taken, and nothing is claimed or tombstoned when a save fails. WORK DONE SO FAR gains TEST DRIVEN and BRAKE TEST, the latter recording PASS or FAIL as one either/or, with a failed brake test setting BUS AVAILABILITY to Remove From Service and a pass never returning a bus to service on its own |
```
