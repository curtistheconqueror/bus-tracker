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
| Last code-bearing commit | `8b7bfe3` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 124, `39a7275` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline --name-only 8b7bfe3..origin/main`
that nothing outside `docs/`, `supabase/` and `CLAUDE.md` changed after
`8b7bfe3`, and publish the tip.

Those three are not application code and change nothing about the site:
`supabase/` holds database migrations that have not been applied to any
database, and `CLAUDE.md` is repository orientation for future sessions.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed.

Gate: 133 tests passing, ESLint clean, production build succeeds.

## What changed

Two things. The mirror switch naming was already queued as Version 125 and has
not been published; the phone map fix landed after it.

### 1. Both mirror switches say which mirror and which side

`C/S adjuster switch` did not say adjuster of **what**, and the heater switch did
not say which side. Both are curbside:

```
Mirror heater switch   ->  Mirror heater switch - C/S
C/S adjuster switch    ->  Mirror adjuster switch - C/S
```

### 2. The phone stopped slicing the badges off its own bus markers

Curtis reported that he could barely see the DS badge on his phone, and that the
numbers and the badge did not sit squarely inside the lines of each parking
space. Measured in a real browser at 390px, 360px and 430px before anything was
changed, both claims hold and one was worse than reported:

- **41% of the DS badge was visible.** 59% of it was cut away.
- **25% of the roadcall dot was visible**, which had not been reported.
- Every instance, at every phone width. The sliver that survived sat on the
  parking space's own border line rather than inside it.

One rule met another. Both indicators sit at `top:-5px` so they hang off the
token's corner and do not crowd the number — fine anywhere nothing clips them.
The phone block later gave the token `overflow:hidden`, to stop a five-digit
fleet number spilling out of a narrow space, and it clipped its own children.

On a phone the indicators now sit inside the token and are big enough to read:
the DS badge goes from 6px to 8px type, and from 16.5x12 to 21.5x14. Room is
reserved for them with padding so they do not land on top of the bus — without
that, a 64px garage slot showed the badge covering the icon completely with only
the wheels visible underneath. The garage row gets a smaller badge because it
cannot spare the full reservation.

Separately, tokens in the pit, brake and foreman spots carried a desktop-era
`translateX(-2px)` that on a phone only pushed them 2px off centre, poking past
the left border with a 3px gap on the right. Cancelled there, untouched
elsewhere.

## Migration and data safety

No data changes and no storage changes in either item.

For the mirror switches, a record already saved under either first wording
**reads as the new one** through the catalog's existing rename map. Nothing
stored is rewritten — the same handling every catalog rename in this project has
used. Both switches shipped in Version 122, so there may be records under the
old wording; they will read correctly and are unchanged on disk.

The phone map fix is stylesheet only.

## Validation

- Production build passed
- All 133 regression tests passed, including a round trip proving a defect saved
  as `System Switches - C/S adjuster switch` reads back as
  `System Switches - Mirror adjuster switch - C/S`
- Two new tests cover the phone badges, both reading the phone block by brace
  counting so they cannot accidentally assert against a desktop rule of the
  same name
- ESLint passed
- Measured in Chromium at 390px, 360px, 430px, 820px and 1440px before and
  after. iPad and desktop measure identically either side of the change; the
  fix is scoped to the 620px block throughout

## After it is live

1. In **Bus Controls → System Switches**, confirm the two entries read
   **Mirror heater switch - C/S** and **Mirror adjuster switch - C/S**, next to
   each other at the end of the group.
2. If any bus already carries one of these under the old wording, open it and
   confirm it now reads with the new name and nothing else about it changed.
3. On a phone, find a bus that is on the Down Sheet and confirm the **DS badge
   reads as two whole letters** inside the white marker, not a sliced purple
   sliver on the border line.
4. Check one in the **main garage row**, the tightest space on the board, and
   confirm the badge, the bus icon and the fleet number are all visible at once.
5. Check a bus in the **pit, brake or foreman spots** and confirm its marker
   sits centred between the space's lines rather than touching the left one.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 125 | Live | <published tip hash> | Both Bus Controls mirror switches named for the mirror they work and the curbside they are on; on a phone the DS badge and roadcall dot no longer clipped away by the marker that holds them, and markers centred in their parking space |
```
