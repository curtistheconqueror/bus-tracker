# Publish handoff — Sites Version 114

Prepared for Codex. Curtis has approved this release.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` for the lifecycle itself; this file
supplies only what that runbook asks for — the exact source, what changed, and
what to check once it is live.

## Source

| Field | Value |
| --- | --- |
| Release source | the current tip of `origin/main` |
| Last code-bearing commit | `b152d59` — everything after it is documentation only |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 113, `6d44097` |
| Code commits in this release | 5 (`fe38bd9`, `ba3919e`, `acdd54d`, `702e33e`, `b152d59`) |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. The tip is named rather than hard-coded because this handoff
cannot contain the hash of the commit that adds it; confirm with
`git log --oneline b152d59..origin/main` that nothing but `docs/` changed after
`b152d59`, and publish the tip.

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed, so `origin/main` fast-forwards cleanly from Version 113.

Gate at `b152d59`: 111 tests passing, ESLint clean, production build succeeds.
The documentation commits after it change no application code.

## What is in it

Five commits, oldest first.

**`fe38bd9` — Billable and diagnostic time on a repair.**
Repair hours and diagnostic hours in decimal, saved with a fixed repair. They
are kept apart because they are different work and often different visits: a bus
can be diagnosed on one shift and fixed on another, or diagnosed and handed on
unfixed, and one figure would lose that. Diagnostic defects — check engine, MOD
light, ABS warning, intermittents — say so and prompt for the time even when the
bus is not fixed. The existing initials setting gained a required mode.

**`ba3919e` — Work time counts Defect Log repairs.**
The Work Time panel on Fleet Campaigns totalled campaign rows only. It now adds
Defect Log repair hours into the same day, because a shift spent half on a
farebox sweep and half on a repair is one shift. Diagnostic and repair time are
added together for the day with the split kept visible. Campaigns read the fleet
for this and never write it.

**`acdd54d` — Work states and findings.**
Three states on any repair — Inspected, Diagnosed, Parts on order — each
stamped with who and when. A finding records the cause in the mechanic's own
words for the causes no picker could list, and it renders through `defectLabel`,
so it reaches the Down Sheet, Fixed Repairs and Quick Filters without any of
them being taught about it.

**`702e33e` — Cummins service intervals ship as defaults.**
1,500 hours or 18 months on plugs, 2,000 hours or 24 months on valves. Curtis
confirmed the L9N valve figure matches the ISL G, which was the open question
that kept them blank. Includes a settings migration described below.

**`b152d59` — Recommend a repair for the Down Sheet.**
A stamped recommendation, separate from Down Sheet membership, plus a
"Recommended for Down Sheet" Quick Filter whose drawer copies and shares the
list like every other filter.

## The one migration in this release

`702e33e` moves the service-interval marker from `engine-hours-v1` to
`engine-hours-v2` in `pace-board-settings-v1`.

It is needed because the board rewrites its whole settings blob on almost every
change, so a device that never had the intervals typed in holds four explicit
nulls rather than an empty record, and those nulls would beat any default that
shipped later. Under v1 a blank means never set and takes the default; under v2
a blank means cleared on purpose and stays blank. Anything a user actually
entered survives either way, and both the board hydrate and the backup import
read through `readSavedServiceIntervals` so an imported backup cannot disagree
with a device that has been running all along.

No storage key was renamed. No stored record is rewritten on read. Every other
field added in this release is additive and optional, so a Version 113 backup
imports unchanged and a Version 114 backup opened on 113 loses only the new
fields.

## After it is live

Check these five things on the live site, in this order:

1. **Administrative Settings → Maintenance Intervals** shows 1500 / 18 / 2000 /
   24 already filled in, without anyone typing them. This is the migration
   working. Clearing one and reloading must leave it cleared.
2. **Defect Log editor** shows WORK DONE SO FAR above WORK STATUS with three
   checkboxes, and a WHAT WAS FOUND field under them.
3. **Defect Log editor, below Advanced Details**, shows RECOMMEND FOR DOWN SHEET
   directly above the existing DOWN SHEET checkbox.
4. **Quick Filters** lists "Recommended for Down Sheet" last, with a count, and
   its drawer's COPY LIST produces a shareable list.
5. **Fleet Campaigns → Work Time** totals a person's day across both campaign
   rows and Defect Log repairs.

Expect existing buses to start showing DUE / OVERDUE / CRITICAL where they
previously showed INTERVAL NOT SET. That is the tracking switching on, not a
data change.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update this table's row in `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the
  same follow-up commit once the version is saved and deployed.

Suggested `docs/RELEASES.md` row:

```
| 114 | Live | <published tip hash> | Billable and diagnostic repair time totalled per person per day, Inspected/Diagnosed/Parts-on-order work states with findings that follow the repair everywhere, shipped Cummins engine-hour service intervals, and a shareable Down Sheet recommendation filter |
```
