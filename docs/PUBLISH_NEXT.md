# Publish next

**STATUS: NONE PENDING — Sites Version 128 was published from c1101bdab9d201602329297bcca6b3f2610c1263 on 2026-08-31.**

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
| Tip at the time of writing | `6d523e6` |
| Last code-bearing commit | `5a445c8` |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 127, published from `831b753` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit.

Everything after `5a445c8` is repository tooling, not application code. Confirm
with:

```
git diff --name-only 5a445c8..origin/main
```

which should list only `CLAUDE.md`, `.claude/skills/connector-reach/SKILL.md`
and this file. The first two are notes for future sessions; none of the three
ship anything to the site.

If you would rather assert it mechanically, this returns nothing:

```
git diff --name-only 5a445c8..origin/main -- app tests package.json package-lock.json public supabase
```

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees. No history was rewritten and no branch was force
pushed.

Gate: 151 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration in this release.** `supabase/` is untouched since
Version 127:

```
git diff --name-only 831b753..origin/main -- supabase     # returns nothing
```

Those files shipped in 127 and have already been applied by Curtis to the live
Supabase project, verified there on 31 August: 8 tables, 23 RLS policies, 7
triggers, 0 rows. Nothing needs running at publish time.

**No dependency changes:**

```
git diff 831b753..origin/main -- package.json             # returns nothing
```

`@supabase/supabase-js` was added in 127 and is unchanged.

**One LOCAL data migration**, described under Data safety. It runs in the browser
when the board is read and requires nothing of the publisher.

## What changed

Six user-visible changes, oldest first.

### 1. Six defects in the shop cloud, one of them silent data loss — `3b7ecf2`

**This is the reason to publish rather than wait.** The sync client itself went
live in Version 127. An adversarial review afterwards found six defects in it,
each reproduced against the real modules before being fixed.

The serious one: the row fingerprint used `JSON.stringify(row, keys.sort())`,
which looks like it orders keys but is a recursive property filter, so everything
in `map_fields` serialized as `{}`. Assign a mechanic to a parked bus, tick two
dash lights, record an odometer reading — the bus never moves, so no timestamp
changes, so the row hashed identically to no work at all. The change would never
have been sent, and the status line would have read "Synced".

The other five: `signOut` used global scope, so one person signing out would have
signed out every device on the shared login; a pull issued one unbounded select
that PostgREST truncates silently; a bus arriving from the cloud got no id; an
unclamped `updated_at` let one wrong device clock permanently lock every shared
row; and a Down Sheet entry's author was overwritten by whoever synced last.

**Live exposure to date is nil.** The shop cloud does nothing until somebody
enters connection details, and no device has been connected. Publishing before
anyone connects means nobody meets the bug.

### 2. The Down Sheet can move a bus; the Defect Log can show status colour — `2fc7af9`

A bus takes the status its parking space implies, so setting a status on the
sheet without being able to move the bus was silently overridden. A **MOVE BUS
TO** picker now sits under the status field, defaulting to "Leave where it is"
and naming the area the bus is currently in. An unknown or full area leaves the
bus where it is rather than failing the save, and the instruction is cleared once
carried out so it cannot re-run on a later edit.

Separately, a **SHOW STATUS COLOR** checkbox at the top of the Defect Log gives
bus numbers the tracker's own status colours. Off by default, per device.

### 3. A chosen status stands until the bus is moved — `3bf9d2a`

The Down Sheet no longer recomputes a bus's status from its parking space. The
paperwork changes before the bus does: mark a bus back in service, get
sidetracked before anyone drives it out of the lot, and the board now says what
you told it rather than reverting.

Location still governs **movement** — dragging a bus, or MOVE BUS TO, re-derives
the status from where it lands, so a bus parked into a CNG lot still goes out of
service on its own. Two rules survive because they describe the condition of the
bus rather than where it sits: a bus needing interior cleaning reads in-shop, and
a bus with unresolved defects is never plainly "In Service".

A side effect worth knowing: it was previously impossible to mark a bus in the
Main Garage "Out of Service", because the garage rule silently rewrote it from
the bus's open defects. That is now possible.

### 4. Locating a bus opens the section it is hiding in — `248020f`

Searching for a bus in a collapsed section did nothing — no answer, no error, the
box just cleared. The search was succeeding: a collapsed section keeps its tokens
in the document and hides them with `display:none`, so the scroll had no box to
scroll to. Locate now opens the sections holding the matches, and only those.

### 5. COMPLETED TODAY is a view; fixed repairs name their origin — `265a0e6`

The **COMPLETED TODAY** tile counted correctly and did nothing when pressed. It
is now a button showing only the repairs completed today — Down Sheet work by
definition, since the counter reads the sheet's own entries. Pressing again
restores the live sheet; with nothing completed today there is nothing to press.

Every **Fixed Repairs** card now carries a band naming where the repair came
from: green for a bus cleared off the Down Sheet, orange for the Defect Log, grey
for the map or the AI Operator. The source was already stored on each record.

### 6. OFF PROPERTY — `5a445c8`

A new facility-map section for buses away at a vendor. **28 spaces**, the same
count on every device, taken from the waiting area, which drops from 98 to 70.
28 is two full rows on the shop computer; a fixed count rather than "two rows"
because that grid is 14 across on a computer, 10 on an iPad and 3 on a phone. A
bus parked there reads Out of Service, the same way the CNG lots work.

## Data safety

No LocalStorage key was renamed or removed, and nothing already stored is
rewritten. The cloud keys (`pace-cloud-config-v1`, `pace-cloud-state-v1`,
`pace-cloud-sent-v1`, `pace-cloud-auth-v1`) shipped in 127 and are unchanged.

**One local migration runs automatically.** The waiting area lost its LAST 28
slots to OFF PROPERTY. Any bus parked in `waiting-70` through `waiting-97` is
relocated into a free waiting space at read time by `migrateReducedCapacity` —
the same helper this project already uses whenever a section shrinks. Two
deliberate properties:

- **Nobody is stranded** in a slot that no longer exists.
- **No bus is relabelled as being at a vendor.** Where a real bus physically is
  cannot be inferred from a renumbering, and guessing would put a bus at Bus &
  Truck that is sitting in the yard. OFF PROPERTY starts empty.

**New optional record fields**, both additive and ignored by older data:

- `location` on a Down Sheet entry — the MOVE BUS TO instruction, cleared once
  carried out
- `statusColor` in the Defect Log settings blob, defaulting to off

**One behaviour change with no storage effect:** the Down Sheet stores the status
a person picked rather than one derived from the parking space. Existing records
are untouched; the difference appears on the next save.

## Validation

- Production build passed
- 151 regression tests passed, up from 141 at Version 127
- ESLint passed
- Each of the six sync defects was reproduced against the real modules before
  being fixed, and re-run after
- The sync row mappers were executed against a real PostgreSQL 16 running the
  exact production schema: upserts accepted, idempotent on replay, and a stale
  push from a second device correctly ignored while a newer one landed
- Measured in Chromium at 390px, 430px, 820px and 1440px across the Facility
  Map, Down Sheet, Defect Log and Fixed Repairs changes

## After it is live

1. **Facility Map** — confirm an **OFF PROPERTY** section appears above the
   Waiting Area with 28 spaces, and the Waiting Area now shows 70. If any bus had
   been parked in the last two rows of the old waiting area, confirm it is still
   on the board, in a waiting space, and **not** in OFF PROPERTY.
2. Drag a bus into OFF PROPERTY and confirm it reads **Out of Service**; drag it
   back to the garage and confirm the status recovers.
3. **Collapse all sections**, then locate a bus by number. Its section should
   open and the bus scroll into view. The other sections should stay collapsed.
4. **Down Sheet** — open any entry and confirm a **MOVE BUS TO** picker sits
   under BUS STATUS ON TRACKER, defaulting to "Leave where it is" and naming the
   area the bus is actually in.
5. Set a bus in a CNG lot to **In Service with Defects** without moving it, save,
   and confirm the Defect Log shows that status rather than Out of Service.
6. Press **COMPLETED TODAY** and confirm the sheet shows only today's completed
   repairs; press again and confirm the live sheet returns.
7. **Defect Log** — tick **SHOW STATUS COLOR** and confirm bus numbers take the
   tracker's colours; confirm it is off by default on a device that has not
   ticked it.
8. **Fixed Repairs** — confirm each card carries a coloured band naming its
   origin, green for the Down Sheet and orange for the Defect Log.
9. **Settings → SHOP CLOUD** — confirm the status line reads **Not connected**,
   and that nothing anywhere asks for a sign-in before the board renders.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 128 | Live | <published tip hash> | Six shop-cloud defects fixed including a silent change-detection failure; the Down Sheet can move a bus and the status you choose now stands until it does; locate opens collapsed sections; COMPLETED TODAY became a view and fixed repairs name their origin; new OFF PROPERTY section for buses away at a vendor |
```
