# Working on this project

**New session? Read `docs/NEXT_SESSION.md` first.** It is the entry point: where
things stand, what is queued with enough detail to start, the workflow with
Codex, and the traps this project has actually fallen into.

This file is the short version of the rules: what will get you in trouble, and
how to check your work. `PROJECT_HANDOFF.md` has the domain detail, surface by
surface.

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
credentials — not once, not to check, not because a build succeeded.

The handoff between them is `docs/PUBLISH_NEXT.md`, at that exact path, always
describing the next unpublished release. Claude keeps it current with every push
to `main`; Codex publishes from it, updates `PROJECT_HANDOFF.md` and
`docs/RELEASES.md`, and resets it. Read its STATUS line before assuming anything
is or is not live.

The full procedure — what a version section must contain, and what to do when
Codex has published (or taken your version number) while you were working — is
in `docs/NEXT_SESSION.md`. Codex publishing mid-session is normal: rebase onto
its work, re-run the gates, renumber. Never merge over it, never force-push.

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
- **A location is named through `app/location-label.ts`, never by a prefix.**
  Matching `garage-` gets you "Main Garage" for all 84 spaces, including
  TROUBLE BAY 11 and 12, which the move editor treats as separate destinations.
  Five copies of that table existed and all five had the bug; a sixth would
  bring it back, and a test asserts there is one.
- **Never commit** API keys, credentials, fleet backups, photographs, or
  employee-sensitive information.
- **Say before you change the UI or a flow, not after.** Curtis: *"if you make a
  UI change i need to know that explicitly... any flow functions that change,
  like how something works from a user experience perspective or UI please let
  me know before implementation."* Architecture and refactoring do not need
  announcing — but then they have to BE that, proved with a before/after render
  rather than asserted. A change that moves a control, renames a label, reorders
  a list or changes what a tap does is his call first.
- **Catalog renames are read-time, never rewrites.** A record saved under an old
  wording must keep reading correctly through the rename maps in
  `app/repair-catalog.ts` (`LEGACY_CATEGORY_RENAMES`, `CATEGORY_ISSUE_RENAMES`,
  `LEGACY_ISSUE_RENAMES`, `RETIRED_ISSUES`). Nothing on disk is ever rewritten.
- **A HOLD is a fact about the BUS and nothing lifts it but time or a person.**
  `app/bus-hold.ts` stores it as an optional `hold` field on the bus record —
  `{at, by?, until?}` — and `setBusHold` **deletes the key** when clearing, never
  sets it to `undefined`. That rule was written when holds synced, and its
  original reason has since inverted — see below — but it stays: `delete` is
  the only spelling that makes `"hold" in bus` false, and it is the safety net
  if `hold` ever leaves `MAP_HELD_BACK`.
  **A hold is DEVICE-LOCAL and never travels** — `hold` is listed in
  `MAP_HELD_BACK` (`cloud-sync.ts`) and in `MAP_EXCLUDED` (`section-transfer.ts`),
  so it reaches neither the Shop Cloud nor an export, and being in `MAP_EXCLUDED`
  also means an incoming transfer keeps the RECEIVER's own hold. Curtis:
  *"If someone is asked to hold a bus (like bay 12 guy) then they should know.
  It doesn't need to show up on everybody's screen."* It follows that
  `busUpdatedAt` must **not** count the hold's own stamp — it did from the first
  build, when holds still synced, and the reason inverted with the rule.
  Counting it now would stamp a row newer while its `map_fields` were
  byte-identical: a push claiming to be newer while carrying nothing new, which
  is the out-of-order ammunition `updated_at` exists to deny. Placing a hold
  moves no fingerprint and pushes nothing at all.
  No location change ever clears a hold: Curtis chose that after being asked, because the buses in his case were arriving and
  arriving is a move. The `until` time is optional and is an expiry, applied at
  read time — an expired hold is left on the record, not rewritten away.
- **The Down Sheet owns the DS badge.** Entries get there off photographed
  sheets or typed by hand, and the map *reads that membership back* rather than
  deciding it. No import, transfer or sync may assert it — see
  `src/lib/storage/section-transfer.ts`, which deliberately refuses to carry `down`,
  `onDownSheet` and `downSheetReady` on a Fleet Map transfer.

## Storage keys

Adding a key is fine. Renaming one is not, ever.

```
the records
  pace-board-v1                    the fleet: buses, locations, status, defects
  pace-down-sheet-v1               Down Sheet entries
  pace-bus-lists-v1                Fleet Campaigns
  pace-bus-list-templates-v1       campaign column formats

what the shop has taught it
  pace-parts-memory-v1             learned part numbers
  pace-findings-memory-v1          learned causes, per symptom
  pace-scan-notes-v1               notes for the next scan, 500 chars

undo and recovery, never synced
  pace-board-recovery-v1           last known good board
  pace-down-sheet-clear-undo-v1    UNDO CLEAR
  pace-down-sheet-scan-undo-v1     UNDO IMPORT
  pace-down-sheet-entry-undo-v1    PUT BACK, for one deleted Down Sheet row
  pace-scan-batch-undo-v1          PUT BACK, for a Defect Log scan sweep
  pace-facility-defect-clear-undo-v1  UNDO MAP CLEANUP
  pace-crash-report-v1             the last render error, for the next session

the cloud's bookkeeping, per device
  pace-cloud-config-v1             project, account, initials, device label
  pace-cloud-state-v1              sync phase and last error
  pace-cloud-sent-v1               fingerprints of rows already sent
  pace-cloud-auth-v1               Supabase's own session
  pace-cloud-merged-v1             defects this device merged away  (tombstones)
  pace-cloud-removed-entries-v1    Down Sheet entries taken off    (tombstones)

per-device settings, never synced
  pace-app-mode-v1                 FULL or LITE on this device, and whether it was ever asked
  pace-sweep-v1                    FULL SWEEP: when this walk began, and where from
  pace-role-v1                     the job title chosen on the home screen — COSMETIC, never a permission
  pace-shift-settings-v1           when each shift runs, and the pullout times
  pace-sheet-ledger-v1             one compact snapshot per Down Sheet swap
  pace-board-settings-v1
  pace-down-sheet-settings-v1
  pace-defect-log-settings-v1
  pace-board-backup-reminder-v1

per-device view state — which panel is open, what has been dismissed
  pace-tracker-collapsed-sections-v1
  pace-down-sheet-stats-open-v1        NO LONGER READ — SHEET STATS is gone
  pace-down-sheet-advanced-open-v1     ADVANCED ACTIONS on the DOWN SHEET
  pace-down-sheet-counts-open-v1       the DOWN SHEET count tiles, collapsed by default
  pace-down-sheet-deferred-collapsed-v1  the DOWN SHEET's DEFERRED board, collapsed by default
  pace-down-sheet-recommended-collapsed-v1  the DOWN SHEET's RECOMMENDED FOR DOWN SHEET board, collapsed by default
  pace-down-sheet-soft-collapsed-v1    the DOWN SHEET's SOFT DOWN board, collapsed by default
  pace-down-sheet-idot-collapsed-v1    the DOWN SHEET's IDOT board, collapsed by default
  pace-defect-log-stats-open-v1
  pace-defect-log-advanced-open-v1     ADVANCED ACTIONS, open or closed
  pace-defect-log-mystery-collapsed-v1 MYSTERY BUSES — now on the DOWN SHEET
  pace-deferred-review-dismissed-v1
  pace-status-report-picks-v1          which boxes are ticked on the STATUS REPORT
```

**`pace-sweep-v1` is one person's walk, and it never travels.** FULL SWEEP is a
STATE rather than a sequence: the Facility Map can start it and so can the
Down Sheet's scan prompt, because Curtis does them in either order — *"if a
foreman or someone else decide to do the facility map sweep first and then
upload the down sheet that could be a thing"*. Building it as a sequence would
have made one of those two orders work and the other not.

Device-local for the reason a HOLD is: two foremen sweeping on the same morning
are on two different walks, and a sweep that synced would have each of them
ending the other's. It holds no fleet data at all — only when the walk began
and which surface started it — so starting or ending one can never lose
anybody's work. An unended walk is cut off on IDLE, not on total length: twenty quiet minutes
end it, and every board write restarts that clock. Curtis: *"a sweep will never
last that long. If I have not pressed anything then just cut it off within 20
minutes."* A cap on total length would have ended a forty-minute walk somebody
was actively working through while still leaving a pocketed phone looking live.
Expired at READ time and the record is left alone rather than rewritten,
because a read must not be a write.

**`pace-shift-settings-v1` holds the garage's hours, and it is EDITABLE ON THE
DEVICE on purpose.** Curtis: *"a settings option to fine tune both of these
options in case changes need to be made without you writing code."* Shift
boundaries and pullout times are a property of this property's contract rather
than of the software, and a contract changes on a schedule nobody here controls.

The app already had `Shift` as a LABEL on a Down Sheet entry — "1st", "2nd",
"3rd", typed or defaulted by hand — and nothing anywhere that mapped a CLOCK
TIME onto one. Pullout times appeared nowhere at all. `app/shift-clock.ts` is
that missing half and is the only place that knows: every window the Fleet
Forecast quotes — "next shift", "the next two", "before the 06:00 pullout" —
resolves through it, so hours change once.

The times are the shop's own: **1st 06:00-14:30, 2nd 14:00-22:30, 3rd
22:00-06:30**, pullouts at **06:00 and 13:00**. Curtis gave the shifts in mixed
notation — "second is 14:00 to 10:30 and night shift is 10:00 til 6:30", where
the evening 10:30 and 10:00 are 22:30 and 22:00 — and confirmed the reading
before they were written down.

**Every shift is 8.5 hours and they OVERLAP by 30 minutes** at each handover:
14:00-14:30, 22:00-22:30 and 06:00-06:30 each belong to two shifts. That is a
relief window, and it is why `shiftAt` cannot take the first window that
matches. **The INCOMING shift wins a handover** — of the windows that match, the
one that started most recently. Curtis chose that: the relief has started and
they are the crew who will work whatever arrives. Taking the first match instead
would have credited every one of those half-hours to the outgoing crew purely
because of array order, three times a day.

For the same reason a two-shift window is measured straight through to the END
of the next shift rather than summed as "what is left of this one plus the
length of that one" — with overlaps the sum double-counts every handover.

Device-local for the reason the sweep is: it describes the building somebody is
standing in, and a device that synced it would overwrite a garage running
different hours.

**`pace-sheet-ledger-v1` exists because the app was throwing this away.** A
scanned sheet REPLACES the live one, `pace-down-sheet-scan-undo-v1` keeps
exactly one snapshot so the last import can be taken back, and nothing retained
the sheet before that. Sheet-to-sheet tempo — what got added, what cleared, what
stuck, and how fast — had never once been recorded, on a shop that swaps eight
or more sheets a fortnight. Curtis: *"When downsheets are swapped out, there is
a tempo to what gets repaired. The type of repairs that are getting done per
downsheet update."* That tempo is the whole input to the Fleet Forecast.

One snapshot per swap, holding **only the bus id and the catalog category** per
row, plus which buses came off and which shift the swap happened in. The
wording, the mechanic, the estimate and the history are all on the live record
and none of them is a tempo question. Rolling cap of **40 swaps**, dropping the
OLDEST — dropping the newest gives a ledger that never learns anything after its
fortieth swap, which is what a naive `if(length>=LIMIT)return` produces and is
very hard to see from outside.

Sorted **oldest first**, because tempo is read as consecutive pairs and a
backfilled swap from two weeks ago has to land in its own place. Curtis kept the
photographs of the eight sheets the app never did, so a backfill can seed it.

**The write is BEST EFFORT and that is the whole contract.** It runs from the
middle of a sheet import. Losing one swap's tempo is a rounding error in a
forecast; failing an import because a history file could not be written would
cost a foreman the sheet he just photographed — unlike the undo copy beside it,
which genuinely must stop the import.

The shift is resolved once and **stored**, not recomputed later from the stamp:
if somebody edits the shift hours in six weeks, the tempo of a swap that already
happened must not move to a different crew. What shift it WAS is a fact about
that morning.

**IT TRAVELS, and that reversed an earlier decision.** It was built device-local
on the assumption that one device did the scanning. Curtis: *"I will be
scanning from multiple devices, period."* Left local, each phone would hold only
the swaps IT performed — two half-histories, and a forecast built on either
would read half the shop's tempo as all of it.

Merging is safe here in a way it is NOT for the fleet or the sheet, and the
reason is the whole justification: **a swap is an EVENT that happened once, on
one device.** Two devices never perform the same swap — one scans the paper, the
other receives the resulting sheet through the cloud and performs none. So there
is nothing to reconcile and the union IS the history. Same shape as the
road-call events, for the same reason: where two records describe the same
thing this app compares timestamps and picks a winner; where they are separate
events it keeps both.

Deduped by swap id, so a file imported twice does not double-count, and swap ids
carry a random tail precisely so two devices scanning in the same millisecond
with the same row count cannot mint the same one.

**A ROW IS KEYED BY FLEET NUMBER, NOT BY BUS ID**, and that was wrong for two
releases. A bus id is DEVICE-LOCAL — `section-transfer.ts` says so in its own
words, *"two devices set up separately give the same bus different ids"*, and it
re-points every arriving Down Sheet ENTRY by fleet number for exactly that
reason. The ledger rode along in the same payload and nothing re-pointed it, so
a swap scanned on the iPad and merged onto the phone shared no keys with the
phone's own swaps: two buses still sitting on the sheet reported as `added 2,
stuck 0`. Measured through `snapshotFromEntries`, not reasoned about. The fleet
number is the one name both devices agree on, it is what the cloud keys `buses`
on, and it is legible in a stored file. A record thin enough to have lost its
number still falls back to the id rather than vanishing out of the tempo.

The cutover costs exactly one distorted pair — the swap either side of it
compares old keys against new — and that is the whole price of the fix.

**`gap` marks a snapshot with unrecorded swaps in front of it.** Set only by the
backfill; a scan always follows the sheet it replaced, so a snapshot the app
wrote itself never carries one. `ledgerTempo` returns `sinceHours:null` for such
a pair, which every rate already skips — the escape hatch was there from the
first build and this is the missing input to it. Without it the baseline's
nine-day hole reads as one swap that added fourteen buses and cleared thirty.
Normalised with `delete` rather than `undefined`, the spelling `setBusHold`
uses, so a hand-edited `gap:"no"` cannot spread through and read as truthy.

**OLD SHEETS COME IN THROUGH `app/sheet-ledger-backfill.ts`**, behind LOAD OLD
DOWN SHEETS in Settings. It writes `pace-sheet-ledger-v1` and nothing else —
**a scanned sheet REPLACES the live one and a backfill must not**, because the
sheets being loaded are weeks old and the live sheet is today's. The only
trustworthy way to say that is a path with no access to `pace-down-sheet-v1` at
all, and a test asserts the module cannot name it.

`planBackfill` computes the entire outcome without writing a byte — what is new,
what is already held, what the cap will drop — and `applyBackfill` takes the
PLAN rather than the text, so the thing written is provably the thing shown.
**The cap bites at import time**: a backfill is by definition the oldest thing
in the ledger, so a device near forty drops most of it the instant it merges.
Counted and shown before the button rather than discovered afterwards.

Two carriers today, both already in the app: the **Down Sheet section transfer**
(the sheet is what a swap IS), and **MASTER EXPORT**. The ledger is **the one key
a whole-app import MERGES instead of replacing** — everything else in a restore
is STATE and is meant to be overwritten, while this is history, and restoring a
phone onto the iPad must not throw away the swaps the iPad recorded itself.

**Automatic cloud sync would need a schema migration** — `shop_memory` is
constrained to `kind in ('part','finding')` — which is a write to the live
database and therefore Curtis's call. Not done.

**WHY A SWAP AND NOT A REPAIR.** Curtis, on the granularity: *"the reason that
we're not doing it per repair is because we don't have enough users. So
literally, I cannot voucher or validate when a bus gets repaired until actually
I see sheets updated across shifts, because no other mechanic really has this
app except for one."* A completion nobody records is not evidence, and a sheet
that comes back without a bus on it is. When more mechanics carry the app, a
repair marked done by the mechanic who did it becomes the finer signal and the
sheet updates from it — at which point this ledger becomes the coarse check on
that, not the only input.

**`pace-crash-report-v1` is a breadcrumb, not a log.** One record, overwritten
each time. A render error unmounts the whole tree, and saved to a home screen
there is no address bar, no reload button and no pull-to-refresh — so the app
does not misbehave, it VANISHES, and the person holding the phone has no
console to check and no way back in. `app/crash-guard.tsx` catches it, shows a
screen carrying the one control standalone mode cannot otherwise offer, and
writes the fault here so the next session can read it rather than guess from
"it went white".

**`pace-role-v1` names a person's job and must not gate anything yet.** It holds
three things picked on the home screen, in this order: **department**, then
**union or non-union**, then the **job** — and the second narrows the third,
because Curtis gave the actual split:

| | Union | Non-Union |
| --- | --- | --- |
| Transportation | Bus Operator, Relief Supervisor | Dispatch, Asst Supt, Supt |
| Maintenance | Servicer, Mechanic Helper, Mechanic, Master Mechanic, Body & Frame, Building Maintenance | Foreman, Asst Supt, Supt |

**Foreman is on the non-union side, and so is Dispatch** — Dispatch sat on the
union side for one commit purely because it is union at many transit
properties, which is not the same as being union at this one. **Relief
Supervisor** is the union spot beneath Dispatch. **Master Mechanic** is union, at the top of
the mechanic ladder — inferred from the shape of the rest of the list, then
confirmed by Curtis. The title is a top classification at some transit
properties and a management job at others, so it was worth asking. A combination not in that table cannot
be chosen and does not read back, so if the contract changes, it changes in
`app/roles.ts` and any device holding the old pairing reads as "not set" until
its owner picks again. *Bargaining* is the union side, so it can never be the
non-union label; Union / Non-Union is what the floor says.

Curtis asked for it as a label first:
"there will be no special conditions in the app for any of the working roles.
This is all cosmetic. We will wire that up later."

**Where it is going, and why that is not a licence to start.** He has since said
the roles WILL decide access, and named the mechanism: "the distinction will be
made on a person's own login... when a person picks one, it will determine what
they see and have access to," plus a questionnaire that does not exist yet. The
access rules ride on **that login**. This key is an unauthenticated string in
LocalStorage that anybody holding the phone can change from the screen that set
it, so it can be the label a login confirms and never the thing that decides.
Until the login exists, nothing outside `app/roles.ts` may read it, and a test
holds that line.

*Asst Supt* and *Supt* are abbreviated because both exist and both departments
have them — spelled out they differ by one word at the front, which is the
hardest pair to scan on a phone. Both appear in both departments, so the pair is
stored: the role alone does not say which one.

**`pace-status-report-picks-v1` is the Fleet Status Report's include list, and
it replaced two hard-coded versions.** Every audience wanted a different report
and every difference came back as a code change. Curtis: *"can we have, like,
maybe widen the user interface of it a little bit so we can include different
things to check mark that I want included... instead of coming to you and
getting coding every time I need it done."* And the case that settles it: *"when
my superintendent sends that list out to his superiors, they don't need to know
about mystery buses. and they don't need to know about inspection buses."*

Seven sections — inspections, roadcalls pending, mystery buses, Farebox, Ventra,
CUBIC screens, the Fleet Forecast — and three detail switches that COMPOSE
rather than branch: bus numbers, then locations, then the specific repairs. Off,
on, on-with-where, on-with-repairs. The old COUNTS ONLY version is now just
numbers-without-locations and nothing special-cases it.

**DOWNED BUSES is not on the list.** It is the question the report answers; a
status report without it is a covering note.

The three detail switches are a LADDER and the modal enforces it: locations
without bus numbers has nothing to hang off, repairs without locations is a list
of repairs with no bus against them. Ticking one brings the ones above it;
unticking one takes the ones below.

Remembered because the same person sends roughly the same report every morning,
and per-device for the reason every view-state key is: it describes what this
phone's owner sends, not anything about the fleet. Losing it costs one round of
ticking. It is the ONE thing the report writes — `status-report-modal.tsx`
touches no record, and a test names the single permitted key.

**Farebox, Ventra and the CUBIC screens are counted APART, through
`app/tech-services.ts`.** Curtis: *"now the Ventura and the fare boxes have been
moved up to critical levels, period. So they need a count of that as well...
Fairbox and Venture separate. and cubic screen EV or... I'm sorry. MV, bus MV or
MREV error. Whatever those errors say, I forgot."*

He could not remember the wording, which is the clearest possible sign the app
should not depend on somebody typing "CUBIC": the module matches **BUS ER** and
**MV ER** by name as well. The CUBIC screens ARE Ventra hardware — the quick
filter still offers them together as `ibs-ventra`, and that filter now reads
this same table rather than a regex of its own, because two tables that must
agree about what a Ventra is are two tables that will eventually disagree.
Counted by BUS, not by defect, and fleet-wide rather than off the sheet: a
farebox fault does not down a bus, and the question is how many are out there.

**`pace-down-sheet-stats-open-v1` is no longer read or written.** The SHEET
STATS panel it opened was a second status report saying most of what the tiles
below already said; those tiles absorbed the numbers worth keeping and the
panel went. The key is left listed, and left alone on devices that hold it,
because it is still a name this repository has used — removing the line is how
somebody later reuses the name for something else.

**`pace-defect-log-mystery-collapsed-v1` is read and written by the Down Sheet**,
not the Defect Log. The MYSTERY BUSES board moved there — every bus it lists is
a bus that is *not* on the sheet — and the key kept its old name because
renaming one throws away what the device already holds. The name records where
the panel used to live; the value is still "is this panel collapsed".

`pace-locate-ack`, `pace-touch-drop` and `pace-open-quick-filter` look like keys
and are not — they are CustomEvent names.

**The two tombstone ledgers are load-bearing.** The merges are additive by
design — they keep every record the receiver alone holds — so a removal can
never travel as an absence. It has to be recorded in one of these and pushed as
a tombstone, or the record comes straight back on the next pull. See
`src/lib/cloud/cloud-sync.ts`.

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
app/bus-hold.ts            HOLD THIS BUS: the field, what lifts it, the held list
app/location-label.ts      slot id -> the words a person says, trouble bays included
app/repair-catalog.ts      the defect catalog, rename maps, count fields
src/lib/storage/section-transfer.ts    per-section device transfers and their merge rules
src/lib/storage/storage.ts             storage keys, envelopes, recovery snapshots
app/globals.css            the whole facility map, all breakpoints
src/lib/cloud/cloud-sync.ts          row shapes, fingerprints, the tombstone ledgers
src/lib/cloud/cloud-client.ts        the Supabase calls, and how a push is planned
src/lib/cloud/cloud-live.ts          the one set of merge rules a pull is applied through
docs/NEXT_SESSION.md       start here: state, queue, Codex workflow, traps
docs/PUBLISH_NEXT.md       the standing Codex handoff
docs/roadmap/              work that is designed but not built
supabase/                  the cloud schema — APPLIED, and the shop is using it
supabase/run-tests.sh      applies the migrations to a throwaway Postgres
PROJECT_HANDOFF.md         domain ownership and surface-by-surface detail
```

The Supabase project is live and holds the shop's real records. Reading it to
diagnose something is fine and has been useful. **Writing to it is Curtis's
call, every time — ask first.** The project ref is deliberately not in this
repository.
