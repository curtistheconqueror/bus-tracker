# Publish next

**STATUS: PENDING — Sites Version 117 is validated and awaiting publication approval.**

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
| Last code-bearing commit | `e554edb` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 116, `54b5322` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. The tip is named rather than hard-coded because this handoff
cannot contain the hash of the commit that adds it; confirm with
`git log --oneline e554edb..origin/main` that nothing but `docs/` changed after
`e554edb`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed, so `origin/main` fast-forwards cleanly from Version 116.

Gate: 116 tests passing, ESLint clean, production build succeeds.

## What changed

### NVH added to Suspension and Steering

Noise, vibration and harshness is now the first choice in **Suspension and
Steering**, ahead of the components, because it is the complaint that arrives
before anyone knows which part is at fault — the same reason the dash lights lead
Engine and Transmission.

**One entry, not a dropdown of every combination.** Front, rear, curbside,
roadside, turning, straight and speed would swamp the category, and they are what
the description field is for. So the entry carries a defect note asking for them
at the moment the defect is chosen, which is the only moment somebody still
remembers:

> Say where and when in the description: front or rear, curbside or roadside,
> turning or straight, and at what speed. A vibration at 45 straight and a clunk
> on a left turn are different repairs, and the noise itself is rarely where the
> fault is.

Left to itself, "NVH" is a record nobody can act on later. This is the sixth
entry in the catalog to carry a note; the mechanism shipped in Version 116.

Also in this change: a hardcoded option count in the suspension test was replaced
with a duplicate check. The count broke on this addition and proved nothing about
the category merge it was written for — what that merge had to guarantee is that
no option arrived twice.

## Migration and data safety

No storage migration, no LocalStorage key change, and no stored record rewritten.
This is one additive catalog entry and one additive note. Existing defects,
parts associations, filters, locations, Down Sheet records and user data are
untouched, and a Version 116 backup imports unchanged.

## Validation

- Production build passed
- All 116 regression tests passed
- ESLint passed
- Verified in a real browser at phone width: NVH is first in the category, the
  note renders directly under the picker at 436px in a 647px form, and a
  neighbouring entry shows no note

## After it is live

1. Open the Defect Log and choose **Suspension and Steering**.
2. Confirm **NVH (noise, vibration, harshness)** is the first choice.
3. Confirm an amber note appears directly under the picker asking for front or
   rear, turning or straight, and speed.
4. Choose *Air bag* and confirm no note appears — most entries carry none.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 117 | Live | <published tip hash> | NVH added to Suspension and Steering as a single symptom entry, with a defect note asking for the location, condition and speed that make it actionable |
```
