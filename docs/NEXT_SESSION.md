# Start here

You are a Claude Code session on the Pace South Bus Tracker. This file is the
entry point: read it, then start working. It exists so a fresh session does not
have to reconstruct the state of the project from a chat transcript.

Two files answer "what is going on":

- **This file** — what is done, what is next, and the procedure for each thing.
- **`docs/PUBLISH_NEXT.md`** — what is waiting to be published. Read its STATUS
  line before saying anything is or is not live.

Two files answer "how does this project work": **`CLAUDE.md`** (the rules that
will get you in trouble) and **`PROJECT_HANDOFF.md`** (domain ownership,
surface by surface). Read `CLAUDE.md` before touching code.

---

## The 60-second orientation

An **offline-first** fleet maintenance app for the Pace South garage. Shop
foremen and mechanics use it on phones and one shop computer, on the floor, on
wifi that drops. Six pages: Facility Map, Down Sheet, Defect Log, Fixed Repairs,
Fleet Campaigns, Settings.

Everything lives in the device's LocalStorage and works with the wifi down.
Supabase ("Shop Cloud") is a copy going somewhere else — it is never where the
data lives. A sync failure is a status line, never a broken board.

**Curtis is the user, and he is a working foreman.** He reports things in shop
language, usually from the floor, usually mid-shift. When he says "bay" he means
a lane running front to back, numbered 1–12. When he says "line 25" he means a
line on a printed sheet he is holding. Take the words literally and check them
against the code; more than one bug in this project has been the app naming
something the shop does not have.

---

## Where things stand

| | |
| --- | --- |
| Branch | `main`, linear history, no force-pushes ever |
| Live | Sites Version 154 = repository release 158 = commit `a444242` |
| Pending publication | See the STATUS line of `docs/PUBLISH_NEXT.md` |
| Working tree at handoff | Clean. Nothing stashed, nothing uncommitted. |
| Gate at handoff | 230 tests passing, ESLint clean, production build succeeds |

**There is no stash and there are no uncommitted changes.** If you find some,
somebody left them there after this file was written — read them before doing
anything else, because this container is disposable and a stash does not
survive it.

---

## The workflow with Codex — read this before pushing anything

This project has two agents and they do different jobs. Getting this wrong is
the single easiest way to break something.

**You write code. Codex publishes it. You never publish.**

Specifically, you never: run a deploy, tag a release, edit
`.openai/hosting.json`, touch Sites credentials, or mark anything live. Not once,
not "just to check", not because a build succeeded.

The two of you communicate through exactly one file, at exactly one path:
**`docs/PUBLISH_NEXT.md`** on `main`. Curtis approves a release by pointing
Codex at that file. That is the whole protocol.

### Your half of it, step by step

1. Do the work on `main`. Small, coherent commits.
2. Run the gates (below). All three.
3. Commit and push to `main`.
4. **In a separate commit, add a new version section to
   `docs/PUBLISH_NEXT.md`** and update its STATUS line, the summary table, and
   the "N releases are pending" paragraph. Push that too.
5. Tell Curtis what you did and that it is queued. Stop.

### What a version section must contain

Codex publishes from it, so every mechanical claim in it has to be true. Do not
quote a number from memory or from earlier in your own session — re-run the
command and paste what it says.

```
## Source
  Release source: the exact short SHA
  The commit list:      git log --oneline <previous>..<yours>
  The changed files:    git diff --name-only <previous>..<yours> -- app tests
  The size:             git diff --shortstat <previous>..<yours>
  Proof of no infra change — this must return nothing:
    git diff --name-only <previous>..<yours> -- supabase package.json package-lock.json .github public worker

## Migrations
  Say "None" only if it is true. A NEW LocalStorage key is not a migration but
  must be named. A renamed key is forbidden outright.

## What was wrong / What changed
  In Curtis's language, not in function names.

## Verified
  What you actually measured, with the numbers.

## What to check once it is live
  A numbered list Curtis can walk through on his phone in the shop.
```

### When Codex has published while you were working

This happens often — you will find your push rejected. It is normal.

```
git fetch origin main
git log --oneline HEAD..origin/main    # look at what it did before reacting
```

Codex may have **taken your version number**. If it did, renumber yours. Then:

```
git checkout -B main origin/main
git cherry-pick <your code commit>
npm test && npm run lint               # re-run the gates on the rebased commit
```

Rewrite the handoff section against the new base — new SHA, new "previous",
new diff ranges — and say in the commit message that the gates were re-run on
the rebased commit rather than carried over. **Rebase onto Codex's work. Never
merge over it and never force-push.**

Codex also owns `PROJECT_HANDOFF.md` and `docs/RELEASES.md` after a publish, and
it resets `docs/PUBLISH_NEXT.md` to `STATUS: NONE PENDING`. Do not fight it for
those files.

---

## The work queue

In the order Curtis asked for it. Each has enough here to start without asking.

### 1. Extend a deferment from the Deferred popup

> "when I hit deferred, I need an option in that pop-up to extend the time of
> the deferment."

The deferral fields and the DEFERRED badge already exist — see
`app/deferred-watch.tsx` and the `deferredAt` / `deferredUntil` fields. Release
158 (Codex) added a persistent **UNDO DEFERRED** action, which is a different
thing: undo returns the repair to Open, this extends the clock without changing
the state.

Put the control in the popup that appears when Deferred is chosen. Extending is
an edit to an existing deferral, so it belongs in the repair's history like any
other edit, and it must not clear `wasDeferred`.

### 2. A DELETE button per Down Sheet entry

> "There is no quick remove as fix or just undo, and just a simply DELETE button
> on the downsheet list like the defect log for each entry... Best is to fold it
> in on face card of each bus."

Fold it into the face card, as he asked. His fallback — buttons at the top with
a search — is worse and he said so; only fall back if the card genuinely cannot
hold it, and say why.

**This one has a trap, and the plumbing for it is already built.** A Down Sheet
removal has to be recorded in the removal ledger or it will not travel, and the
entry will come back from the cloud on the next sync. Call
`rememberRemovedEntries(localStorage, [entry.id], new Date().toISOString())`
from `app/cloud-sync.ts` at the moment of deletion, exactly as
`clearEntireDownSheet` and `importScan` in `app/down-sheet/page.tsx` already do.
If you add an undo for it, call `forgetRemovedEntries` and restamp the entry's
`updatedAt`, or it will lose to its own tombstone on the next pull. Read the
Version 159 section of `docs/PUBLISH_NEXT.md` before writing this — it explains
why in full.

### 3. Parked, older, still open

- **iPad**: `ON CONFLICT DO UPDATE command cannot affect row a second time`.
  Seen on an iPad during sync. Not reproduced since the Version 152 and 159
  tombstone fixes, which changed how rows are batched — **re-check whether it
  still happens before investigating it.**
- The backup-reminder interval control sits in the wrong Settings section.
- Rename SORTIE (Curtis's wording; ask him what it should read as).
- A welcome / landing page.
- A live two-device sync test — never actually run with two real devices.
- 15 editor controls below the 44px touch target on iPad. Deliberately deferred;
  do it as an iPad-scoped pass without collapsing the tablet two-column layout.

---

## How to check your work

```
npm test          # builds first, then tests/rendered-html.test.mjs
npm run lint
npm run build
```

All three, every time. `npm test` runs the build itself, so a green suite means
the build is green too.

**Measure the UI in a browser. Do not read the CSS and conclude.** Nearly every
significant layout bug in this project was found by measuring and missed by
reading: a badge clipped by exactly 21px, a fixed element covering a section at
one breakpoint, a control rendering 0px wide.

```
npm run start                        # production build, port 3000
# exactly one server — a second one serves a stale asset manifest
# and you get ERR_EMPTY_RESPONSE on the JS bundle
```

Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
Playwright: `/opt/node22/lib/node_modules/playwright/index.mjs`

Wait past the hydration race or you will measure the seed board instead of the
real one — wait for a selector that only the real board produces. Phone widths
to check: 360, 390, 430. iPad: 820 portrait, 1180 landscape. The phone
breakpoint is `@media(max-width:620px)` and there is more than one such block in
`globals.css`, so match on content rather than position.

The `.claude/skills/` directory has four skills that travel with the repo and
are worth reading before the situations they describe: `browser-verification`,
`fresh-context-review`, `cascade-check`, `connector-reach`.

---

## Traps this project has actually fallen into

Every one of these cost real debugging time. They are here so it is not spent
twice.

**`git push | tail -1` hides a failed push.** A pipeline returns the exit code
of the *last* command, so `tail` reports success over a rejected push. Test the
exit code of `git push` itself.

**`pkill` returning 144 aborts a chained Bash command.** Anything after the
`&&` silently does not run. Run it on its own line.

**Postgres checks NOT NULL on the INSERT half of an upsert before it reaches
the conflict.** Both `bus_defects` and `down_sheet_entries` have
`fleet_number text not null`. A tombstone row carries no fleet number by design,
so it can never ride in an upsert — it takes the whole 200-row chunk down with
it. Tombstones go as `UPDATE ... WHERE <key> = ...`. `pushPlan` in
`app/cloud-client.ts` does this partitioning; do not undo it. This bug kept the
shop cloud failing on every 45-second sweep for a week.

**The merges are additive on purpose.** `mergeDefectLog` and `mergeDownSheet`
keep every record the receiver alone holds and add every incoming one. That is
what lets two devices each add work without erasing the other's — and it means
**a removal can never travel as an absence.** A removal has to be recorded and
pushed as a tombstone. The Down Sheet went without that and a 57-bus sheet read
92 fifteen seconds later.

**`.grow` is `display:contents`.** It paints nothing of its own, so a border
must land on its children (`<strong>` and `.spot`), never on `.grow`.

**Tailwind utility classes collide with our own.** A `className="fixed"` once
lost to Tailwind's `.fixed` and broke a tile at every width.

**`globals.css` gives every bare `<header>` `height:38px`,** which `min-height`
cannot undo. Find out what already styles an element before adding a size to it.

**The Node test runner strips types from `.ts` but not `.tsx`.** Import `.ts`
modules directly in tests; assert on `.tsx` by reading the file as text.

**An empty connector listing is evidence about the listing, not about access.**
A session once spent an hour concluding a Supabase project was unreachable; the
token could reach it the whole time and `list_projects` simply had not
enumerated it. Read `.claude/skills/connector-reach` before telling Curtis
anything is inaccessible.

---

## Things that are never OK

These are in `CLAUDE.md` too. They are repeated because they are absolute.

- **Never force-push or rewrite published history.** Fast-forwards of `main`
  only.
- **Never rename a LocalStorage key.** It silently orphans a mechanic's board.
  Adding a key is fine; renaming one is not.
- **Never delete or merge repair records to simplify the UI.** History is the
  point of the app.
- **Never commit** API keys, credentials, fleet backups, photographs, or
  anything employee-sensitive.
- **Never write to the live shop database without asking Curtis first.** It is
  his running shop's data. Reading to diagnose is fine and has been useful;
  writing is his call, every time.
- **Never run more than 10 subagents at once**, on any model, at any effort
  setting. Curtis set this after a review workflow ran 88 agents and spent
  5.9 million tokens verifying one module.
- **Catalog renames are read-time, never rewrites.** Nothing on disk is ever
  rewritten to match a new wording.
- **The Down Sheet owns the DS badge.** The map reads that membership back
  rather than deciding it. No import, transfer or sync may assert it — there is
  deliberately no `down` column in the `buses` table for this reason.

---

## Writing code here

Match the surrounding style rather than a general one. This codebase is dense —
minimal whitespace, short names in hot paths — and comments carry the *reasons*,
including what went wrong before. When you fix something, say in the comment
what the failure looked like on the floor, not just what the code now does. That
is why the traps above could be written down at all.

Commit messages are the same: what was wrong, why it was wrong, and what changed
— in the words Curtis would use.
