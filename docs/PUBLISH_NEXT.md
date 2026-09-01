# Publish next

**STATUS: VERSION 136 PENDING — publish from `dccf431`.**

| Order | Version | Publish from | What it is |
| --- | --- | --- | --- |
| Next | **136** | `dccf431` | Bus Controls splits into Operator/Driver Controls and Bus Accessories, and the stop request is named what the floor calls it |
| Published | 135 | `d3c05c3` | MERGE DUPES now completes its authorized cleanup, and repairs can record TEST DRIVEN and BRAKE TEST |

This file always describes the unpublished releases, and it lives at this exact
path on `main` so nobody has to be told where to look. Curtis approves a release
by pointing Codex at this file rather than pasting a summary out of a chat
window.

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

# Version 136 — One overloaded category becomes two, named the way the floor names them

**Publish this next, after Version 135.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`dccf431`** |
| Last code-bearing commit | `dccf431` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 135, published from `d3c05c3` |

Five commits sit in this range and **only two of them touch application code**.
The other three are documentation and tooling, and are listed here so nobody has
to wonder what they were doing in the diff:

```
git log --oneline d3c05c3..dccf431
dccf431 Keep the four door and ramp options the shop actually uses      <- app code
b5e553d Split Bus Controls in two, and name the stop request what the floor calls it   <- app code
44cbe4d Three skills that travel with the repository                     <- .claude/skills + CLAUDE.md
f022a90 Record Sites Version 135 release                                 <- docs only
1ded73e Queue Version 135                                                <- docs only
```

**Exactly one application file changed in the whole range.** Everything this
release does, it does in the repair catalogue:

```
git diff --name-only d3c05c3 dccf431 -- app
app/repair-catalog.ts
```

No dependency, database, or CI change. The filter returns nothing:

```
git diff --name-only d3c05c3 dccf431 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 176 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration, no dependency change.** `supabase/`, `package.json`
and `package-lock.json` are untouched.

**No LocalStorage key added, renamed or removed. Nothing on disk is rewritten.**
This is a read-time rename, the same mechanism every previous catalogue change
has used: a stored record keeps the wording it was saved with, and
`migrateRepairIdentity` moves it to its surviving home as it is read. A board
written by Version 135 opens on Version 136 with every defect intact, and the
reverse is true as well — see the known issue below.

### The category change

| Version 135 | | Version 136 |
| --- | --- | --- |
| `Bus Controls` — 52 options | → | `Operator/Driver Controls` — 40 options |
| `Doors, Ramp and ADA` — 27 options | → | `Bus Accessories` — 40 options |

The two old names disappear from the picker and neither can be selected again.
Catalogue totals: **300 options across 21 categories → 302 across 21.** The
category count is unchanged because two categories became two categories; what
moved is where the line between them falls.

`Bus Accessories` collects the physical things a passenger touches — both doors,
the ramp, the kneeler, wheelchair securement, the stop request, the bike rack.
`Operator/Driver Controls` keeps the switches, buttons, gauges, dash and driver
seat. A record filed under the old `Bus Controls` category is routed to whichever
of the two now owns it, per option, rather than all landing in one.

### Verified against the live Shop Cloud, not asserted

Every distinct category/issue pair actually present in `bus_defects` was read
from the live project and run through the new migration:

| | |
| --- | --- |
| Live defect records (`deleted_at is null`) | **334** |
| Records in the two affected categories | **35** — 25 `Bus Controls`, 10 `Doors, Ramp and ADA` |
| Distinct identities among them | 17 |
| **Records landing on a live, re-pickable option** | **35** |
| Records landing on a retired wording | **0** |
| Records resolving to nothing (orphans) | **0** |

They land 24 in `Operator/Driver Controls` and 11 in `Bus Accessories` — the
eleventh being a front-door fault that had been misfiled under `Bus Controls`
and now sorts itself into the right category on the way in.

The same check was run over **every option a Version 135 device can write**, not
just the ones already used, so a defect logged between now and this release
migrating cleanly is not left to chance:

| | |
| --- | --- |
| Version 135 options in the two categories | **79** |
| Land on a live, re-pickable option | **78** |
| Land on a documented retired wording | **1** |
| Land on nothing | **0** |

And the migration is **idempotent**: all 302 current catalogue entries come back
unchanged when passed through it a second time, so a record cannot drift on
repeated reads.

### The one retirement

Exactly one option was dropped, and only because it became two:

```
Bus Accessories → "Stop Request - Stop request (wheelchair area)"
```

The wheelchair-area stop request is now recorded curbside or roadside, and a
record already written against the old single option cannot be assigned a side
after the fact. **No live record uses it** — it is retired before anybody logged
one. A record carrying it would still open and still read as logged; it simply
could not be re-picked from the list.

**Four more options were nearly retired with it, and the live board is why they
are still here.** `Doors - Front door`, `Doors - Rear door`,
`Ramp, Lift and Kneeler - Wheelchair ramp` and `Ramp, Lift and Kneeler - Kneeler`
looked redundant next to the specific symptoms now listed under each. Querying
the Shop Cloud showed three of them were the **most used options in the entire
category**, carrying **nine of its ten records**. They are how a fault gets
logged when the component is known and the symptom is not yet. The general
option now sits first in its group with the specific symptoms beneath it.

## Known issue this release does not fix

**A device still on Version 135 shows the old category names.** The rename is
applied on read by the build doing the reading, so an un-updated device reads
`Bus Accessories` records back under whatever wording is stored — and stored
wordings are unchanged, by design. Nothing is lost either way, on either device,
in either direction; the two simply label the same defect differently until both
are updated. **Refresh every device once this is live** so the floor and the
office are reading the same category names.

## What changed

### 1. `Bus Controls` was doing two unrelated jobs

Fifty-two options covering both the driver's switch panel and every physical
accessory on the bus, with doors and the ramp in a separate category of their
own. A mechanic looking for the ramp had to know which of the two it was in.
The split follows how the work is actually assigned: accessories are one kind of
call, controls are another.

**`Operator/Driver Controls` — 40 options in 4 groups**

| Group | Options |
| --- | --- |
| Driver Seat | 5 |
| Gauges and Dash | 5 |
| System Switches | 12 |
| Operating Controls | 18 |

**`Bus Accessories` — 40 options in 5 groups**

| Group | Options |
| --- | --- |
| Doors | 11 |
| Ramp, Lift and Kneeler | 10 |
| Wheelchair Securement | 8 |
| Stop Request | 9 |
| Bike Rack | 2 |

### 2. The stop request is named what the floor calls it

Previously one option. A passenger pulls the cord and nothing sounds — that is a
**Stop Request INOP**, including when the cord itself is broken, and it happens
on one side of the bus at a time. Nine options now:

```
Stop request INOP (curbside)
Stop request INOP (roadside)
Stop request INOP (wheelchair area - curbside)
Stop request INOP (wheelchair area - roadside)
Stop request pull cord / line - broken (curbside)
Stop request pull cord / line - broken (roadside)
Stop request chime / tone
Stop request sign / light
Other stop request defect
```

The wheelchair-area request is sided like the rest, which is the change that
retired the old unsided option above.

### 3. A ramp beyond repair is bodywork, not a ramp fault

When a ramp is judged past repair, body shop technicians fit a new one — it is
their job, not the ADA technician's, and it belongs on their list. Added to
`Bodywork`, the only other category this release touches:

```
Bodywork - Ramp - complete replacement (beyond repair)
```

`Bodywork` goes from 17 options to 18. Nothing else in it changed.

## The one visible behaviour change, measured

**The `Ramp / Kneeler (ADA)` quick filter returns fewer buses, and that is the
point — but it is a change somebody will notice.**

The filter matches on the text of a defect, and that text includes its category.
The old category name `Doors, Ramp and ADA` **contains the word "Ramp"**, so
every defect filed anywhere in it matched the ramp filter — a broken front door
included. `Bus Accessories` does not contain the word, so only genuine ramp and
kneeler faults match now.

Measured over the 35 live records, at `d3c05c3` and again at `dccf431`:

| | Version 135 | Version 136 |
| --- | --- | --- |
| Live records matching `Ramp / Kneeler (ADA)` | **12** | **7** |

The five that drop out are four door defects and one misfiled front-door record.
None of them is a ramp or kneeler fault. The filter is narrower and correct; a
foreman who has been using it as an all-ADA list will see a shorter list and
should be told why.

**This one is worth a decision rather than a surprise.** The list can stay as it
is (recommended — it now answers the question it asks), or the pattern can be
widened, or a separate all-accessories filter can be added alongside it. Nothing
here needs to block the release either way.

## Validation

- **176 regression tests passing**, unchanged in count from Version 135; ESLint
  clean; production build succeeds
- **The live Shop Cloud was queried, not estimated** — 334 records, 35 affected,
  all 35 verified to land on a live, re-pickable option with zero orphans
- **All 79 Version 135 options** in the two affected categories were run through
  the new migration: 78 live, 1 documented retirement, 0 orphans
- **The migration is idempotent** across all 302 current catalogue entries
- **The legacy chain still resolves two generations back** — `Operator Controls`
  and `Doors, Ramp and Lift`, names retired in earlier releases, still reach the
  right home through the new split
- **The flat catalogue and the grouped picker were checked against each other**
  for every category: 0 out of step
- **The quick-filter change was measured at both commits** rather than reasoned
  about — 12 matches before, 7 after

## After it is live

1. **Open any repair → the category list.** Confirm `Bus Controls` and
   `Doors, Ramp and ADA` are gone, and `Operator/Driver Controls` and
   `Bus Accessories` are there in their place.
2. **Open a bus that already had a Bus Controls defect** — a horn or a turn
   signal. It should now read under `Operator/Driver Controls` with its wording
   unchanged, and open, filter and report exactly as before.
3. **Open a bus with a door or ramp defect.** It should read under
   `Bus Accessories`. Front door, rear door, wheelchair ramp and kneeler are all
   still selectable — those four carry most of the ADA history and were
   deliberately kept.
4. **Bus Accessories → Stop Request.** Confirm nine options, with curbside and
   roadside on both the standard and the wheelchair-area request.
5. **Bodywork.** Confirm `Ramp - complete replacement (beyond repair)` is there,
   for a ramp the body shop has to replace outright.
6. **Press the `ADA` quick filter.** Expect a shorter list than before — ramp
   and kneeler faults only, no longer every door defect. This is the intended
   change; see the section above.
7. **Refresh every device** that reads this board, so nobody is looking at the
   old category names beside somebody looking at the new ones.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 136 | Live | <published tip hash> | Bus Controls splits into Operator/Driver Controls (switches, buttons, gauges, dash, driver seat) and Bus Accessories (doors, ramp, kneeler, wheelchair securement, stop request, bike rack), absorbing Doors, Ramp and ADA; the stop request becomes nine options named the way the floor names them, sided curbside and roadside including the wheelchair area; a ramp beyond repair is added to Bodywork as a complete replacement. Read-time rename only — nothing stored is rewritten, and all 35 affected live records were verified against the Shop Cloud to land on a live, re-pickable option |
```
