# Working on this project

Read this first, then `PROJECT_HANDOFF.md` for the domain detail. This file is
the short version: what will get you in trouble, and how to check your work.

## What it is

An offline-first fleet maintenance app for the Pace South garage, used by shop
foremen and mechanics on phones and one shop computer. Five surfaces: Facility
Map, Down Sheet, Defect Log, Fixed Repairs, Fleet Campaigns.

**Offline-first is not a feature, it is the premise.** Everything lives in the
device's LocalStorage and works with the garage wifi down. Anything that syncs
is a copy going somewhere else, never the place the data lives.

## Who publishes

**Codex publishes. Claude Code does not.** Claude never runs a deploy, never
tags a release, never edits `.openai/hosting.json`, and never touches Sites
credentials.

The handoff between them is `docs/PUBLISH_NEXT.md`, at that exact path, always
describing the next unpublished release. Claude keeps it current with every push
to `main`; Codex publishes from it and then resets it. Read its status line
before assuming anything is or is not live.

Claude pushes to `main` and mirrors the same tree to `claude-contributions`:

```
git checkout claude-contributions && git read-tree --reset -u main
```

## Agent budget

**Never run more than 10 subagents at a time, on any model, under any effort
setting — including ultracode.** Curtis set this after a review workflow ran 88
agents and spent 5.9 million tokens verifying one module. Ten agents on eight
different problems beats eighty agents on one. Prefer a small fan-out, or do the
work directly.

## Skills in this repo

`.claude/skills/` holds skills that travel with the repository rather than the
machine, because these sessions run in containers that are thrown away.

- **`connector-reach`** — what to do when a connector listing comes back empty
  or short. An empty enumeration is evidence about the enumeration, not about
  access. Written after a session spent an hour concluding a Supabase project
  was unreachable; the token could reach it the whole time and `list_projects`
  simply had not enumerated it. Read it before telling Curtis anything is
  inaccessible.
- **`fresh-context-review`** — review your own diff as if somebody else wrote
  it, before pushing and before asserting anything in a handoff. Written after
  three misses that a green test suite did not catch: a commit count quoted
  instead of re-run, an invariant broken in the same change that introduced it,
  and a handler that reported success over a write that had been refused.
- **`browser-verification`** — how to check a UI change here: seeding
  LocalStorage, waiting past the hydration race so you measure the real board
  and not the seed one, measuring boxes rather than trusting screenshots, and
  forcing the failure path on purpose. Read it before writing "verified"
  anywhere. Most surprising browser results in this project have been a broken
  fixture rather than a broken app.
- **`cascade-check`** — find out what already styles an element before adding a
  height, width or colour to it. `globals.css` gives every bare `<header>` a
  fixed `height:38px`, which `min-height` cannot undo; that one cost two
  separate debugging rounds. Also covers broader-selector overrides and
  Tailwind class-name collisions.

## Things that will get you in trouble

- **Never force-push or rewrite published history.** Only clean fast-forwards of
  `main`. Codex publishes concurrently, so rebase onto its work rather than
  merging over it.
- **Never rename an existing LocalStorage key.** They are listed below. A rename
  silently orphans a mechanic's board.
- **Never delete or merge repair records to simplify the UI.** History is the
  point of the app.
- **Never commit** API keys, credentials, fleet backups, photographs, or
  employee-sensitive information.
- **Catalog renames are read-time, never rewrites.** A record saved under an old
  wording must keep reading correctly through the rename maps in
  `app/repair-catalog.ts` (`LEGACY_CATEGORY_RENAMES`, `CATEGORY_ISSUE_RENAMES`,
  `LEGACY_ISSUE_RENAMES`, `RETIRED_ISSUES`). Nothing on disk is ever rewritten.
- **The Down Sheet owns the DS badge.** Entries get there off photographed
  sheets or typed by hand, and the map *reads that membership back* rather than
  deciding it. No import, transfer or sync may assert it — see
  `app/section-transfer.ts`, which deliberately refuses to carry `down`,
  `onDownSheet` and `downSheetReady` on a Fleet Map transfer.

## Storage keys

```
pace-board-v1                 the fleet: buses, locations, status, defects
pace-down-sheet-v1            Down Sheet entries
pace-bus-lists-v1             Fleet Campaigns
pace-bus-list-templates-v1    campaign column formats
pace-parts-memory-v1          learned part numbers
pace-findings-memory-v1       learned causes, per symptom
pace-board-recovery-v1        local undo snapshot, never synced
pace-board-settings-v1        per-device settings, never synced
pace-down-sheet-settings-v1   per-device
pace-defect-log-settings-v1   per-device
pace-board-backup-reminder-v1 per-device
```

Grouped catalog categories are held in **two** structures that must stay in
step: `REPAIR_OPTIONS` (the stored identity, prefixed `"Group - Item"`) and
`REPAIR_OPTION_GROUPS` (the bare names the picker draws).

## Checking your work

```
npm test          # builds, then runs tests/rendered-html.test.mjs
npm run lint
npm run build
```

**Measure the UI in a real browser rather than reading the CSS.** Chromium is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; `npm run dev` serves on
5173. Nearly every significant layout bug in this project was found by
measuring and missed by reading — badges clipped by their own parent, a fixed
element covering a section at one breakpoint, a control rendering 0px wide.
Seed a board with `localStorage.setItem("pace-board-v1", ...)` and reload.

The phone breakpoint is `@media(max-width:620px)`; there is more than one such
block in `app/globals.css`, so match on content, not position. Real phone widths
to check: 360, 390, 430. iPad: 820 portrait, 1180 landscape.

Watch for Tailwind utility-class collisions — a `className="fixed"` once lost to
Tailwind's own `.fixed` and broke a tile at every width.

## Where things are

```
app/repair-catalog.ts      the defect catalog, rename maps, count fields
app/section-transfer.ts    per-section device transfers and their merge rules
app/storage.ts             storage keys, envelopes, recovery snapshots
app/globals.css            the whole facility map, all breakpoints
docs/PUBLISH_NEXT.md       the standing Codex handoff
docs/roadmap/              work that is designed but not built
supabase/                  cloud sync schema, not yet applied to any database
supabase/run-tests.sh      applies the migrations to a throwaway Postgres
PROJECT_HANDOFF.md         domain ownership and surface-by-surface detail
```
