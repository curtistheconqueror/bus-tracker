# Publish next

**STATUS: PENDING — Sites Version 125 is validated and awaiting publication approval.**

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
| Last code-bearing commit | `7c31b22` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 124, `39a7275` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 7c31b22..origin/main` that nothing
but `docs/` changed after `7c31b22`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed.

Gate: 131 tests passing, ESLint clean, production build succeeds.

## What changed

### Both mirror switches say which mirror and which side

`C/S adjuster switch` did not say adjuster of **what**, and the heater switch did
not say which side. Both are curbside:

```
Mirror heater switch   ->  Mirror heater switch - C/S
C/S adjuster switch    ->  Mirror adjuster switch - C/S
```

## Migration and data safety

A record already saved under either first wording **reads as the new one**
through the catalog's existing rename map. Nothing stored is rewritten — the
same handling every catalog rename in this project has used. Both switches
shipped in Version 122, so there may be records under the old wording; they
will read correctly and are unchanged on disk.

## Validation

- Production build passed
- All 131 regression tests passed, including a round trip proving a defect saved
  as `System Switches - C/S adjuster switch` reads back as
  `System Switches - Mirror adjuster switch - C/S`
- ESLint passed

## After it is live

1. In **Bus Controls → System Switches**, confirm the two entries read
   **Mirror heater switch - C/S** and **Mirror adjuster switch - C/S**, next to
   each other at the end of the group.
2. If any bus already carries one of these under the old wording, open it and
   confirm it now reads with the new name and nothing else about it changed.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 125 | Live | <published tip hash> | Both Bus Controls mirror switches named for the mirror they work and the curbside they are on, with records under the earlier wording reading through unchanged |
```
