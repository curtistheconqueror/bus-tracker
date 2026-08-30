# Publish next

**STATUS: PENDING — Sites Version 123 is validated and awaiting publication approval.**

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
| Last code-bearing commit | `936d961` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 122, `cd6b649` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. Confirm with `git log --oneline 936d961..origin/main` that
nothing but `docs/` changed after `936d961`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed. This work was written before Version 122 landed and was replayed on top
of it rather than merged over it, so nothing published is disturbed.

Gate: 123 tests passing, ESLint clean, production build succeeds.

## What changed

### The three reports now say they are reports

No behaviour changed here — this is wording, and it is worth a release on its
own. Four buttons in this app write a file and only one of them can be read back
in, but they read as variations on the same idea, so the difference only
surfaced on the day somebody tried to restore a phone from the wrong one and
found out it had been a report all along.

```
EXPORT LOG            ->  EXPORT LOG REPORT        (Defect Log settings)
EXPORT FIXED HISTORY  ->  EXPORT HISTORY REPORT    (Fixed Repairs)
DOWNLOAD .TXT         ->  DOWNLOAD REPORT (.TXT)   (Fleet Campaigns)

EXPORT / SHARE BACKUP     unchanged — still the only restorable file
```

Each report also carries the long version as a tooltip, drawn from one shared
string that lives beside the backup itself, so three buttons cannot drift into
describing the same limitation three different ways.

The files themselves are unchanged and the reports stay useful — a report is how
the log reaches another device, or somebody else's hands to read. Restoring is
the only thing it cannot do, and the import already refuses one safely with
**"This file is not a valid fleet board backup. No changes were made."**

## Migration and data safety

Label text only. No LocalStorage key renamed, no stored record touched, no export
payload altered, and no catalog entry added, renamed or retired. A file written
by the previous version imports exactly as it did before.

## Validation

- Production build passed
- All 123 regression tests passed, including a new one asserting that each of the
  three report buttons says REPORT, that none of them says BACKUP, that each
  carries the shared hint, and that the Facility Map backup button is unchanged
- ESLint passed
- Verified in a browser at phone (390px) and computer (1280px) width that every
  renamed label fits its button with no clipping and no sideways page scroll —
  the labels got longer, which is the one thing that could have gone wrong
- Verified separately that a full export, a complete `localStorage` wipe, and an
  import brings back buses, their map locations, defects, the Down Sheet, parts
  memory, findings memory and campaign lists

## After it is live

1. Open **Defect Log → ⚙ settings** and confirm the button reads **EXPORT LOG
   REPORT**.
2. Confirm **Fixed Repairs** reads **EXPORT HISTORY REPORT**, and **Fleet
   Campaigns** with a list open reads **DOWNLOAD REPORT (.TXT)**.
3. Confirm none of the three is clipped on a phone.
4. Confirm **Facility Map → ⚙ settings** still reads **EXPORT / SHARE BACKUP**
   and still exports and imports normally. That is the only real backup and
   nothing in this release should have touched it.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 123 | Live | <published tip hash> | The three export reports renamed so only the restorable backup reads like a backup, each carrying a shared hint that it cannot be imported back |
```
