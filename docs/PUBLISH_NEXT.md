# Publish next

**STATUS: PENDING — Sites Version 119 is validated and awaiting publication approval.**

This file always describes the next unpublished release, and it lives at this
exact path on `main` so nobody has to be told where to look. Curtis approves a
release by pointing Codex at this file rather than pasting a summary out of a
chat window.

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

## Source

| Field | Value |
| --- | --- |
| Release source | the current tip of `origin/main` |
| Last code-bearing commit | `4a307f0` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 118, `6f45d14` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 4a307f0..origin/main` that
nothing but `docs/` changed after `4a307f0`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed.

Gate: 119 tests passing, ESLint clean, production build succeeds.

## What changed

### A repair on the Down Sheet finishes on its own day

Version 118 split an entry into one defect per repair but left the workflow on
the entry, so the repairs still could not finish apart. Brakes done Monday and
the A/C still open meant the whole entry stayed open, none of Monday's work could
be written down, and its fix fields did not appear until the last repair closed.

Each repair card now carries its own **MARK THIS REPAIR FINISHED** tick, and its
fix, finding and hours appear the moment it is ticked.

- The bus stays down while any repair on it is still open.
- Each defect keeps the day it was **actually** finished, not the day the entry
  was closed.
- Ticking the **last** repair closes the entry, because a bus with everything
  done must not sit on the sheet as active work. Unticking one reopens it.
- Setting the entry to **Completed** still marks every card, which is what keeps
  closing out ten buses at end of shift a dropdown rather than a checklist.

The sheet row reads **1 OF 2 DONE**. Without it a bus with half its work finished
looked exactly like one nobody had touched, which is the thing a foreman scans
the sheet for.

## Migration and data safety

No LocalStorage key renamed and no stored record rewritten. Each repair card
gains one optional field (`done`). **An entry saved before this release reads as
all repairs done wherever its workflow was already Completed**, so publishing
does not reopen every finished repair on the sheet — that is the one behaviour
worth confirming first after publish.

## Validation

- Production build passed
- All 119 regression tests passed, including a two-day case: one repair finished
  Monday keeps Monday's completion date after the second finishes on Wednesday
- ESLint passed
- Verified end to end in a browser at phone width: two repairs on one entry,
  ticked only the brakes, confirmed its fix block appeared alone, saved, and
  confirmed the brake defect completed with CJ and 2 hours while the A/C stayed
  open and the bus stayed down; then ticked the second and watched the workflow
  roll up to Completed and the bus come off

## After it is live

1. **Open a Down Sheet entry that was already Completed before this release and
   confirm every repair on it still reads finished.** If any reopened, the
   migration is wrong and the release should be pulled.
2. Put two repairs on an entry. Tick **MARK THIS REPAIR FINISHED** on one only.
3. Confirm the fix fields appear on that repair alone, and that the other repair
   shows none.
4. Save, and confirm in Fixed Repairs that the finished repair is there while the
   other is still open on the sheet, with the bus still down.
5. Confirm the sheet row reads **1 OF 2 DONE**.
6. Tick the second repair and confirm REPAIR WORKFLOW moves to **Completed** by
   itself and the bus comes off the down list.
7. Untick one and confirm the entry reopens as **In Progress**.
8. On a different entry, set REPAIR WORKFLOW straight to **Completed** and
   confirm every repair on it is marked finished in one move.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 119 | Live | <published tip hash> | Each Down Sheet repair finishes on its own day with its own fix, hours and completion date; the entry's workflow rolls up from its repairs and the row shows how many are done |
```
