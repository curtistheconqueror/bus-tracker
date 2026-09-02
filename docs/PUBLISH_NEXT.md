# Publish next

**STATUS: VERSIONS 144 AND 145 PENDING — publish 144 from `9f1f73f` first, then 145 from `198083b`. Version 143 is live.**

| Order | Version | Publish from | What it is |
| --- | --- | --- | --- |
| Next | **144** | `9f1f73f` | The four save-screen choices are readable on a phone, and the search is called SEARCH |
| Then | **145** | `198083b` | The Defect Log opens on LOG DEFECT instead of a scoreboard, and Fixed Repairs can log a repair that never had a defect |
| Published | **143** | `f94608b` | The collapsed bus card carries no category glyph; each expanded defect row keeps its own |
| Published | **142** | `1ff1224` | Every card line sits at a fixed tab stop, the two purple badges are a matched pair, and the reading text comes up a step on all three feeds |
| Published | **141** | `e99e06a` | Enlarged Down Sheet badge on the Defect Log (Codex) |
| Published | **140** | `f0c7939` | SCAN SWEEP on the Defect Log reads the farebox and Ventra check-off sheets from a photo and files what they found |
| Published | **139** | `a33ffab` | Tech Services is grouped the way the shop's check-off sheets are laid out: Farebox, Ventra, CUBIC Screen, IBS Screen, Signs and Cameras |
| Published | **138** | `0969840` | A/C counts its fans, says Freon, and records the HVAC diag lamp and alarm number |
| Published | **137** | `69deec5` | Fleet Campaigns is pre-cached, so it is not blank on a phone that loses signal |
| Published | **136** | `dccf431` | Bus Controls splits into Operator/Driver Controls and Bus Accessories, and the stop request is named what the floor calls it |
| Published | 135 | `d3c05c3` | MERGE DUPES now completes its authorized cleanup, and repairs can record TEST DRIVEN and BRAKE TEST |

**Version 143 is live from `f94608b`.** The 136–143 handoffs are retained as release records; 141 was Codex's own change and has no handoff here.

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

---

# Version 137 — Fleet Campaigns survives a dead bay

**Publish this after Version 136.** It builds on it: `d6f99d8` contains
`dccf431`, so publishing 137 carries 136 with it. Run both sets of checks.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`d6f99d8`** |
| Last code-bearing commit | `d6f99d8` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 136, from `dccf431` |

```
git log --oneline dccf431..d6f99d8
d6f99d8 Pre-cache Fleet Campaigns so it is not blank in a dead bay   <- the release
a85f570 Queue Version 136                                            <- docs only
```

Two files of substance, and neither is application code:

```
git diff --name-only dccf431 d6f99d8
docs/PUBLISH_NEXT.md
public/sw.js
tests/rendered-html.test.mjs
```

No dependency, database, CI or `app/` change at all. The filter returns nothing:

```
git diff --name-only dccf431 d6f99d8 -- supabase package.json package-lock.json .github app   # returns nothing
```

Gate: 176 tests passing, ESLint clean, production build succeeds.

## Migrations

**None.** No database change, no dependency change, no LocalStorage key touched,
nothing stored rewritten. This release changes only which files the service
worker keeps on the phone.

## What changed

### Fleet Campaigns was never pre-cached

`sw.js` pre-cached four of the app's five pages — the map, Down Sheet, Defect
Log and Fixed Repairs. **`/lists` was missing.** It reached the phone only if
somebody happened to open it while online, and the navigation handler cached it
as a side effect. A phone that had never opened Fleet Campaigns got nothing when
it lost signal in a bay, which is the one situation the service worker exists to
prevent. It is now in the list.

### The test that should have caught it agreed with it instead

The old assertion pinned `CORE_PAGES` by matching a literal copy of the same
four paths, so it confirmed the list matched itself and had nothing to say about
the page that was missing. It now reads the real routes off disk and asserts
every served page is pre-cached, so adding a page and forgetting the service
worker fails the suite rather than surfacing on a mechanic's phone.

**Forced, not assumed:** with `/lists` removed from `CORE_PAGES`, the suite goes
to 175 passing / 1 failing, naming the route. Restored, 176 pass.

### Cache name bumped to v4

`activate` deletes only caches whose name no longer matches `CACHE_NAME`, so the
bump is what makes the new pre-cache take effect promptly — and it is also the
only thing that clears the **dead asset files every previous release left on the
phone**. Every build renames every chunk by content hash, so a phone that has
been through several releases is holding chunks nothing will ever request again.

**Cost to be aware of:** the first launch after this update re-downloads the app
shell, and it must be online to do it. That is one download of the pages and
their assets, not fleet data — **no board, defect, down sheet or settings is
stored in this cache and none of it is affected.** If the device is offline when
it tries, the install fails, the previous service worker stays in control, and
the app keeps working exactly as before until it next has signal.

## Validation

- 176 regression tests passing, ESLint clean, production build succeeds
- **The new guard was driven to failure deliberately** — removing `/lists` from
  `CORE_PAGES` fails the suite with the route named; restoring it passes
- **The ancestry was verified, not assumed** — `git merge-base --is-ancestor
  dccf431 d6f99d8` confirms 137 carries 136
- **No `app/` file changed in this range**, confirmed by an empty path filter

## After it is live

1. **Open the app online once** and let it settle. This is the launch that
   re-downloads the shell under the new cache name.
2. **Then put the phone in airplane mode and open Fleet Campaigns.** It should
   come up. Before this release, on a phone that had never visited it, it did
   not.
3. **Check the other four pages offline too** — the map, Down Sheet, Defect Log
   and Fixed Repairs — to confirm the cache rebuilt rather than merely emptied.
4. **Confirm the board is intact** after the re-download. It will be; the board
   is in LocalStorage and this cache never held it. Worth one look the first
   time regardless.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 137 | Live | <published tip hash> | Fleet Campaigns is pre-cached by the service worker, so it opens on a phone that has lost signal instead of coming up blank; the test that pinned the pre-cache list now reads the real routes off disk so a new page cannot be added without it; cache name bumped to v4, which clears the dead hashed chunks left by earlier builds at the cost of one online re-download of the app shell |
```

---

# Version 138 — The A/C category learns to count, and the HVAC panel gets recorded

**Publish this after Version 137.** It stacks on it: `0969840` contains
`d6f99d8`, so publishing 138 carries 137 with it. Version 136 is already live,
published from `dccf431`.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`0969840`** |
| Last code-bearing commit | `0969840` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 137, from `d6f99d8` |

Gate: 179 tests passing (up from 176 at 136), ESLint clean, production build
succeeds. No dependency, database or CI change.

## Migrations

**No database migration, no dependency change, no LocalStorage key touched.**
Two new optional fields on a repair record, and one read-time rename.

| Addition | Shape | Notes |
| --- | --- | --- |
| `diagLight` | `"yellow" \| "red"` | one value, not two flags — the panel cannot show both |
| `alarmCode` | text, exactly two digits | text so `04` does not read back as `4` |

Both are dropped on read unless they are valid, so a hand-edited file or a
newer build cannot put a lamp the panel does not have onto a record. **A record
written by an older build reads back untouched** — absent fields simply stay
absent.

**Read-time rename:** `Refrigerant leak` → `Refrigerant / Freon leak`. Nothing
stored is rewritten. Verified against the live board: **25 A/C records, all 25
landing on a pickable option, and none of them using the renamed wording**, so
this rename touches zero live records today. All 13 A/C wordings a Version 136
device can write still resolve.

## What changed

### 1. Six new A/C options — the fans are counted, not described

| Added |
| --- |
| `Semi cold air` |
| `Condenser fan INOP - 1 fan` |
| `Condenser fans INOP - both fans` |
| `Evaporator fan / motor INOP - 1` |
| `Evaporator fans / motors INOP - both` |
| `Bad connection / wiring` |

One fan down and both fans down are different jobs — the first still cools
badly and limps, the second does not cool at all — and a single "fan INOP"
option would lose that the moment it saved. `Semi cold air` sits between
`No cooling` and nothing at all, which is what a driver actually reports.
`Bad connection / wiring` was previously only reachable as the much vaguer
`Controls / electrical`, which stays for everything else.

A/C and HVAC goes from **13 options to 19**; the catalogue from **302 to 308**
across the same 21 categories.

### 2. The HVAC diag lamp and its alarm number

A new optional block on **A/C repairs only**: two lamps, yellow and red, and a
two-digit alarm number off the panel. Offered on the whole A/C category rather
than a list of specific repairs, since any HVAC fault can put the lamp up.

- **One lamp, never two.** Stored as a single value, because the panel cannot
  show yellow and red at once. Ticking the lit lamp again clears it; switching
  lamps keeps whatever number was already typed, since a panel escalating
  yellow to red on the same alarm is the ordinary case.
- **The number is text, not a number.** `04` and `4` are different alarms and a
  numeric field would lose the leading zero.
- **It leads the supporting details**, so the Down Sheet line reads
  `A/C and HVAC — Semi cold air — RED DIAG LIGHT alarm 32 — warm at the back`
  rather than burying it in a notes field nobody scrolls to.

### 3. Two silent-loss traps, both found by driving the form

Neither showed up in the tests, which passed throughout:

- **A single digit looked entered and did not save.** Typing `ab4x` leaves a
  bare `4` in the field; on save it vanished, because `4` could be `04` or `40`
  and only the panel knows which. The form now says so in an amber hint —
  *"type 04 if that is what the panel shows. A single digit will not save."*
- **An alarm number with no lamp ticked had nothing to belong to.** It was
  stored where no screen displays it. The hint now says so, and the number is
  dropped at the storage boundary rather than kept invisibly.

The lamp is also judged by the **migrated** category, so a record renamed out of
A/C — a horn defect moving to Operator/Driver Controls — drops the lamp rather
than showing an HVAC alarm against a brake job.

## Validation

- 179 regression tests passing, ESLint clean, production build succeeds
- **Driven in a real browser at 360, 390, 430 and 820** — the block is not
  clipped at any of them, and it reflows from two rows to one on a tablet
- **Measured, not eyeballed:** an apparent overflow past the parent turned out
  to be the form's own scroll container (`.log-form`, `overflow-y:auto`,
  scrollHeight 1583 vs clientHeight 533). Scrolled into view it is fully on
  screen, uncovered, and clickable — so nothing was "fixed" that was not broken
- **Both traps were reproduced before they were fixed** and re-driven after
- **Round-tripped through storage:** saving RED + `32` writes
  `{diagLight:"red", alarmCode:"32"}` and the feed line renders the lamp
- **The live board was queried, not estimated** — 25 A/C records, 0 orphaned,
  0 using the renamed wording
- No page errors in any browser run

## After it is live

1. **Open any A/C repair.** A new **HVAC DIAG LIGHT (OPTIONAL)** block should
   appear under the issue picker, with YELLOW, RED and an ALARM # box.
2. **Open a non-A/C repair** — a brake job — and confirm the block is absent.
3. **Tick a lamp, type an alarm number, save and reopen.** Both should still be
   there, and the Down Sheet line should read the lamp and number.
4. **Type a single digit** and confirm the amber warning appears saying it will
   not save.
5. **Check the A/C issue list** for the six new options, and that
   `Refrigerant / Freon leak` is there in place of `Refrigerant leak` — an
   existing record logged under the old wording should read as the new one.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 138 | Live | <published tip hash> | A/C and HVAC gains six options — Semi cold air, Bad connection / wiring, and separate one-fan and both-fan entries for the condenser and evaporator, so a partial fan failure stays distinguishable from a total one; Refrigerant leak reads as Refrigerant / Freon leak. A/C repairs can record the HVAC panel's diagnostic lamp as yellow or red with its two-digit alarm number, kept as text so 04 stays 04 and shown at the front of the Down Sheet line; a lamp without a valid two-digit number, and a number without a lamp, are both refused rather than stored where nothing displays them |
```

---

# Version 139 — Tech Services learns the shape of the check-off sheet

**Publish this next, after Version 138.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`a33ffab`** |
| Last code-bearing commit | `a33ffab` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 138, published from `0969840` |

One commit, three application files:

```
git log --oneline 8e3454f..a33ffab
a33ffab Group Tech Services the way the shop's check-off sheets are laid out

git diff --name-only 8e3454f a33ffab -- app
app/facility-defect-clear.ts
app/quick-filters.ts
app/repair-catalog.ts
```

No dependency, database, or CI change. The filter returns nothing:

```
git diff --name-only 8e3454f a33ffab -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 182 tests passing (up from 179 at Version 138), ESLint clean, production
build succeeds.

## Migrations

**No database migration, no dependency change, no LocalStorage key touched.
Nothing on disk is rewritten.** This is a read-time regroup, the same mechanism
as the Bus Controls split in Version 136: a stored record keeps the wording it
was saved with, and `migrateRepairIdentity` moves it to its new home as it is
read. **Nothing is retired.**

### The category change

`Tech Services` was one flat list of ten options. It is now five groups holding
twenty-two:

| Group | Options |
| --- | --- |
| Farebox | 11 — INOP (general), No power, Blank / black screen, Bill transport INOP, Coin mech INOP, Coin off line, Coin bin missing, Unlocked / won't lock, Can't unlock top / coin bypass reset, Loose from floor mounts, Other |
| Ventra | 2 — INOP (general), Other |
| CUBIC Screen | 3 — BUS ER, MV ER, Screen black |
| IBS Screen | 2 — INOP (general), Screen black |
| Signs, Cameras and Other | 4 — Destination Sign, Dash cam, Camera / DVR system, Other Tech Services |

Catalogue totals: **308 options across 21 categories → 320 across 21.**

The shop's farebox check-off sheet checks three things per bus — power, bill
transport, coin mech — and none of them had an option, so every finding landed
on the bare word `Farebox`. Eleven live records sit there today with nothing
more specific, five of them saying "black screen" in free text. Those three
columns are options now, and so is the black screen.

### Verified against the live Shop Cloud, not asserted

Every distinct wording actually present under Tech Services in `bus_defects`
was read from the live project and run through the new migration:

| | |
| --- | --- |
| Live Tech Services records (`deleted_at is null`) | **33** |
| Land on a live, re-pickable option | **32** |
| — of which keep their exact stored wording | 12 (`CUBIC Screen - BUS ER` ×6, `CUBIC Screen - MV ER` ×6) |
| — of which are renamed on read | 20 (`Farebox` ×11, `Farebox won't lock` ×3, `Ventra` ×3, `Destination Sign` ×2, `IBS Screen` ×1) |
| Off-catalog, left exactly as logged | **1** (`Unspecified issue` — already off-catalog before this release) |
| Orphaned | **0** |

**The two CUBIC Screen wordings do not move at all.** They already read
`Group - Item`, so they became their own group with their stored identity
untouched. The twelve live records under them are not renamed even on read.

All ten wordings a Version 138 device can write still resolve. The two-step
legacy chain still resolves: a record logged as `MDT Screen` becomes
`IBS Screen` and then `IBS Screen - INOP (general)`. The migration is
idempotent across all 22 new entries.

### Two wordings became one

`Farebox won't lock` (3 live records) and the check-off sheet's "says unlock,
won't lock" were one fault written two ways. They share `Unlocked / won't lock`.
The opposite fault — can't unlock the top to reset the coin bypass, a live
record on 17524 — has its own option and is not conflated with it.

## Two things found on the way, both fixed here

### The IBS & Ventra quick filter never matched a CUBIC screen

BUS ER and MV ER are the two Ventra devices, but neither the word "IBS" nor
"Ventra" appears in their wording, so the filter named for them missed every
one. Measured over the 33 live Tech Services records:

| | Version 138 | Version 139 |
| --- | --- | --- |
| Live records matching `IBS & Ventra` | **4** | **16** |

The twelve that appear are the CUBIC records. Nothing else changes; a farebox
still does not match it.

### A Facility Map alert that flips twice added its defect twice

`syncFacilityAlertDefects` writes a defect when a tracker flag (check engine,
no horn, farebox, IBS / Ventra…) turns on, and checks first that the bus does
not already carry it. It ran that check by comparing the alert table's wording
against defects it had **just normalized** — and normalizing migrates a wording
to its current home. Once a wording had moved, the comparison could never
match, so the second flip of the same flag added the alert again.

Three of the six alert wordings were already in that state before this release
(the horn, the transmission fault, the kneeler). The Tech Services regroup
would have made it five. The alert is now migrated *before* the comparison,
which fixes all six and means new alerts are written in the wording a record
reads as, rather than one it will be migrated to.

**Forced, not assumed:** with the raw comparison put back, the new test fails on
the duplicate; restored, it passes.

## Known issue this release does not fix

**A device still on Version 138 shows the flat Tech Services list.** Same as
every catalogue change: the grouping is applied on read by the build doing the
reading, and stored wordings do not change. Nothing is lost in either direction.
**Refresh every device once this is live** so a farebox fault reads the same
way on the floor and in the office.

## Validation

- 182 regression tests passing, ESLint clean, production build succeeds
- **The live Shop Cloud was queried, not estimated** — 33 records, 32 landing,
  1 already off-catalog, 0 orphaned
- **The flat list and the grouped picker were checked against each other** for
  every category: 0 out of step
- **The quick-filter change was measured** over the live records: 4 → 16
- **The double-add bug was driven to failure and back** — a flag flipped twice
  with the fix reverted adds two defects; with the fix, one
- **The legacy chain still resolves two renames deep** (`MDT Screen`)

## After it is live

1. **Open any repair → Tech Services.** The issue picker should show five
   groups, Farebox first. Under Farebox, `INOP (general)` leads and the three
   sheet columns — no power, bill transport, coin mech — are all there.
2. **Open a bus with an existing Farebox defect** — there are eleven. It should
   read `Farebox - INOP (general)` with its details unchanged, and open, filter
   and report exactly as before.
3. **Open a bus with a CUBIC Screen defect** — there are twelve. Its wording
   should be **exactly** what it was; these did not move.
4. **Press the `IBS/Ventra` quick filter.** Expect the CUBIC screen buses to
   appear for the first time. Before this release, they never did.
5. **On the Facility Map, flip a bus's Farebox flag on, off, on.** The Defect
   Log should show one farebox defect for it, not two.
6. **Refresh every device** that reads this board.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 139 | Live | <published tip hash> | Tech Services becomes five groups — Farebox, Ventra, CUBIC Screen, IBS Screen, and Signs, Cameras and Other — so the farebox check-off sheet's three columns (power, bill transport, coin mech) and the black screen are real options instead of free text under the bare word Farebox; 10 options become 22, nothing is retired, and the twelve live CUBIC records keep their exact wording. The IBS & Ventra quick filter now matches CUBIC screens (4 → 16 live matches), and a Facility Map alert flag flipped twice no longer adds its defect twice |
```

---

# Version 140 — The check-off sheets get a camera

**Publish this after Version 139.** It stacks on it: `f0c7939` contains `a33ffab`,
so publishing 140 carries 139 with it. Version 139 must be live or go live with
this — the sweep files against the Tech Services groups 139 introduces.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`f0c7939`** |
| Last code-bearing commit | `f0c7939` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 139, from `a33ffab` |

```
git log --oneline 8bd48c7..f0c7939
f0c7939 Scan the farebox and Ventra check-off sheets from a photo

git diff --name-only 8bd48c7 f0c7939 -- app
app/api/sweep-scan/route.ts            <- new: the scan route
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/defect-log/sweep-scan-import.ts    <- new: what a mark means, in code
app/defect-log/sweep-scanner.tsx       <- new: the modal
app/down-sheet/down-sheet-scanner.tsx  <- one import; behaviour unchanged
app/scan-photo.ts                      <- new: the shared photo prep
```

No dependency, database, or CI change:

```
git diff --name-only 8bd48c7 f0c7939 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 186 tests passing (up from 182 at Version 139), ESLint clean, production
build succeeds.

## Migrations and configuration

**No database migration, no dependency change, no LocalStorage key added.** What
the sweep files are ordinary defect records, `source: "defect-log"`, exactly
as LOG DEFECT writes them.

**No new secret is required.** The new route `/api/sweep-scan` uses the same
`OPENROUTER_API_KEY` the Down Sheet scan already runs on. It reads an optional
`SWEEP_SCAN_MODEL`, falling back to `DOWN_SHEET_SCAN_MODEL`, then to the same
default model. Nothing has to be set for it to work where the Down Sheet scan
already works.

**One thing to confirm once live**, because it is the only way this release can
fail silently: the route deployed and can see the key. An empty POST proves both:

```
curl -s -X POST https://<live host>/api/sweep-scan
# expected  {"error":"Choose at least one photo."}     -> route is live, key present
# if you see {"error":"Photo processing is not configured yet."} -> route is live, key MISSING
# if you see HTML or a 404                                       -> route did not deploy
```

## What changed

### 1. SCAN SWEEP, a new button on the Defect Log

Next to LOG DEFECT, CLEAN UP and MERGE DUPES. Opens the same kind of modal the
Down Sheet scan uses — take a photo or upload one, up to six pages, READ SHEETS,
review, approve — **but approving files defects onto buses.** It never touches
the Down Sheet, never closes a record, and never files a row that was not
ticked. Both sheet types can go in together; the model tells them apart by the
printed title.

### 2. What a mark means is decided in code, not by the model

The route describes the two sheets to the model — their columns and what each
kind of mark is — and the client decides again from what comes back. Anything
that is not one of four words reads as blank, and **blank means nobody looked;
it is never read as working.** That rule is the difference between this sheet
and a Down Sheet, and it is stated to the model and enforced in code.

| Mark column | Files as |
| --- | --- |
| DT | `CUBIC Screen - BUS ER` |
| MV | `CUBIC Screen - MV ER` |
| Farebox power | `Farebox - No power` |
| Bills Trans | `Farebox - Bill transport INOP` |
| Coin Mech | `Farebox - Coin mech INOP` |

A **written note** on the sheet names faults the columns cannot — coin off line,
blank screen, coin bin missing, unlocked / won't lock, can't unlock top, loose
from mounts — and **a note beats the column it explains**, so "coin off line"
files Coin off line and not also a generic coin fault for the same cell. "Can't
unlock" is tested before "unlock", because they are opposite faults. Every
finding's issue can be re-pointed from a dropdown of Tech Services options
before it is filed.

### 3. Three kinds of row are held back

- **Already on the board.** The bus carries an open record with that wording.
  Offered, labelled, and unticked, so the sweep confirms what is known without
  doubling it.
- **Not in fleet / duplicate fleet number.** Same rules as the Down Sheet scan;
  cannot be ticked.
- **Unclear.** A mark the model could not read never becomes a finding.

### 4. Sheet says OK, board says open

Buses ticked working on a device the board still holds an open record for are
listed under the findings — with the open wording, read through the migration —
for a person to decide. **Nothing is closed from a tick mark.** A destination
sign or a brake job is not listed, because the sweep did not check them.

### 5. Filing is the ordinary path

Each approved finding goes through the same single-record save as LOG DEFECT, so
the **48-hour duplicate guard** applies to every one. The fleet is threaded
through one save at a time and written **once**; a refused write claims nothing.
Each record carries the note, which page it came from, and who checked —
`coin off line — Sweep sheet p2 · checked by BB` — with the initials in
`reportedBy`. **UNDO LAST** reverses the whole filing as one change.

### 6. Shared photo prep

`scanReadyPhoto` moved from the Down Sheet scanner into `app/scan-photo.ts`
so both scanners share one 700 KB cap. The Down Sheet scanner's behaviour,
including its upload filename, is unchanged.

## Validation

- 186 regression tests passing, ESLint clean, production build succeeds
- **Driven in a real browser at 390 wide with the route mocked** to rows shaped
  like the 8-29 sheets: button enabled with a fleet and disabled without one;
  modal not clipped; READ disabled until a photo is added; 5 buses read →
  7 findings → 5 filed; ALREADY ON BOARD arrives unticked; NOT IN FLEET cannot
  be ticked; a finding re-pointed in the dropdown files as re-pointed; storage
  carries issue, note, provenance and `reportedBy`; UNDO LAST reads
  *Undo Filed 5 sweep findings*
- **The 503 path was forced**: the modal shows *Photo processing is not
  configured yet.*, stays on the photo step, and storage is byte-for-byte
  unchanged
- **The OK-vs-board panel was driven separately**: a bus with an open Farebox
  and an open CUBIC record, ticked OK on both sheets, is listed with both
  wordings read through the migration; its open brake job and another bus's
  destination sign are not
- Unit tests cover the mark normalisation, the note-beats-column rule, the
  opposite lock faults, dedupe within a bus, the fleet-match states, and the
  provenance on the record
- No page errors in any browser run

## After it is live

1. **Run the curl above** against the live host. Expect *Choose at least one
   photo.*
2. **Defect Log → 📷 SCAN SWEEP.** Confirm the modal opens and READ SHEETS is
   disabled until a photo is added.
3. **Photograph both 8-29 sheets** — they are the first real test. Expect around
   a dozen findings, with the five DT errors landing as `CUBIC Screen - BUS ER`,
   the two MV errors as `CUBIC Screen - MV ER`, and 17531's note producing both
   Coin off line and Blank / black screen.
4. **Look at the badges before approving.** 17523 should arrive as ALREADY ON
   BOARD and unticked. Anything the model was unsure of should say so under the
   details.
5. **Approve, then open one of the buses.** The record should read the note,
   the page, and the checker's initials.
6. **Press UNDO LAST once** to confirm the whole filing comes back off, then
   file it again.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 140 | Live | <published tip hash> | SCAN SWEEP on the Defect Log photographs the farebox and Ventra check-off sheets and files what they found as Tech Services defects: the five mark columns map to catalog options, a written note names the faults the columns cannot and beats the column it explains, blank is read as not checked and never as working, findings already on the board arrive unticked, and buses ticked OK that the board still holds open are listed for a person rather than closed. Filing uses the same single-record save as LOG DEFECT with the 48-hour duplicate guard and one write, carries page and checker initials on each record, and is reversed by UNDO LAST. Uses the existing OPENROUTER_API_KEY; no new secret |
```

---

# Version 142 — Every line on a card starts at the same tab stop

**Publish this next, after Version 141.** Curtis asked for this to be built so
it can be taken back if he does not like the new layout; the way back is at the
end of this section.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`1ff1224`** |
| Last code-bearing commit | `1ff1224` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 141, published from `e99e06a` |

```
git log --oneline e99e06a..1ff1224
1ff1224 Give every card line a fixed tab stop, and bring the reading text up a step   <- one commit on top of the live version

git diff --name-only e99e06a 1ff1224 -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet.css
app/fixed-repairs/fixed-repairs.css
```

No dependency, database, or CI change:

```
git diff --name-only e99e06a 1ff1224 -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 187 tests passing (up from 186 at Version 140), ESLint clean, production
build succeeds.

## Migrations

**None.** No storage change of any kind. Two files of markup and CSS on the
Defect Log, and CSS only on Fixed Repairs and the Down Sheet. Nothing a record
carries is different.

## What changed, with the numbers

### 1. The card's bottom row has fixed tab stops

The same word landed in a different place on every card, because the optional
purple badges sat in the same flowing row as the state and status. Measured at
390 wide, four neighbouring cards:

| | Version 140 | Version 141 |
| --- | --- | --- |
| Where OPEN begins (card with DS and ×3) | x131 | **x157** |
| Where OPEN begins (card with ×4 alone) | x105 | **x157** |
| Where OPEN begins (card with no badges) | x73 | **x157** |
| Where LATEST begins | x73 or x209, wrapping on 2 of 4 | **x73, always on its own row** |
| Where VIEW sits | wrapped, x73 or x153 | **flush right, always** |

Same result at 360 and 430. The row is a grid with named slots: badges, state,
status on the first row; LATEST at the left and VIEW at the right of the second.
An empty slot stays empty; nothing slides left into it. DS and ×N have their own
two fixed sub-slots, so ×N is at the same x whether or not DS is beside it.

### 2. The title starts at the same place on every card

A single-defect title used to lead with the category emoji; MULTIPLE DEFECTS
did not, so the words began at different points. The emoji is gone from the
title — the round icon on the left already carries it — and both titles start
at x146 at 390 wide.

### 3. DS and ×N are a matched pair

| | Version 140 | Version 141 |
| --- | --- | --- |
| DS | 22 × 17, 7px | **34 × 24, 11px** |
| ×N | 28 × 21, 10px | **38 × 24, 11px** |

Both on the same colour token, so a Down Sheet badge colour set on the Facility
Map recolours both here. Both carry the thin border Codex gave DS in Version 141 (`e99e06a`); this release keeps that border and brings the size up a further step, as asked.

### 4. Reading text comes up one step, on all three feeds

| Surface | Before | After |
| --- | --- | --- |
| Defect Log card: status / LATEST / VIEW | 8 / 7 / 7 px | **10 / 9 / 9 px** |
| Defect Log card: BUS eyebrow, location, "+N more" | 7 / 7 / 8 px | **8 / 8 / 9 px** |
| Defect Log expanded rows: work-state badges, action labels, SAVED | 7 / 6.5 / 6 px | **9 / 8 / 8 px** |
| Fixed Repairs: BUS eyebrow, category, section titles, Logged line | 6 / 7 / 7 / 8 px | **8 / 9 / 9 / 9 px** |
| Down Sheet: the four small cell captions | 7 px | **8 px** |

Labels inside editors and settings are left alone; those are label styling, not
reading text. The Defect Log's own font-size setting still scales everything
above the new base. In an expanded row the timestamp now starts a line of its
own rather than trailing the state pill, so it no longer moves by a pill's width
between OPEN and FIXED.

## The way back

**If Curtis does not like the new layout**, either is clean:

- **Republish Version 141 from `e99e06a`.** That is the live version as it stands
  today, with Codex's enlarged DS badge and none of this.
- Or revert on `main` and publish the revert: `git revert 1ff1224` produces one new
  commit that removes exactly this release and nothing else. It is a single
  code commit for that reason.

## Validation

- 187 regression tests passing, ESLint clean, production build succeeds
- **Measured, not read**: bounding boxes of every card element at 360, 390, 430
  and 1180, before and after, on four cards chosen to cover every badge
  combination (DS + ×N, ×N alone, none, ×N with the longest status)
- **Nothing clips**: the status text stays on one line at 360; the meta row stays
  inside the card; the FOCUS button does not overlap it
- **The other pages were audited the same way**: Fixed Repairs and the Down
  Sheet already aligned by construction; the only drift found was a 1px
  timestamp shift in expanded Defect Log rows, now fixed. After the size
  changes, nothing on any of the three pages overflows its box, and no reading
  text remains below 8px
- Version 141's `e99e06a` was brought underneath this work by fast-forward, not
  merged over; its border and colour-token wiring are kept

## After it is live

1. **Defect Log, on a phone.** Look down four or five cards. OPEN, the status,
   LATEST and VIEW should sit in the same place on every one, whether or not
   the card has DS or a ×N badge.
2. **A card with both badges.** DS and ×N should be the same height and type
   size, side by side.
3. **Change the Down Sheet badge colour** in Facility Map settings and return.
   Both badges should take the new colour.
4. **Expand a bus** and look at two rows with different states. The LOGGED and
   UPDATED lines should start at the same x on both.
5. **Fixed Repairs and the Down Sheet.** The small grey text should be readable
   without leaning in; nothing should wrap where it did not before.
6. **Set the Defect Log font size to Large** in its settings and confirm the
   card text scales up, not down.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 142 | Live | <published tip hash> | Every line on a Defect Log card sits at a fixed tab stop regardless of which badges the bus carries — OPEN, status, LATEST and VIEW at the same place on every card, the title without the duplicated category emoji — with DS and ×N as a matched 24px pair on one colour token (one step above the Version 141 DS badge, keeping its border); the small grey reading text comes up a step on the Defect Log, Fixed Repairs and Down Sheet feeds while editor and settings labels stay as they were. One code commit, reversible with a single revert |
```

---

# Version 143 — The bus card stops wearing one defect's badge

**Publish this next, after Version 142.** A follow-on to 142's card polish,
kept as its own commit so either can be taken back without the other.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`f94608b`** |
| Last code-bearing commit | `f94608b` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 142, published from `1ff1224` |

Five commits since the live version; only the top one is application code. The
other four are the 142 handoff being written and corrected, and Codex's release
record:

```
git log --oneline 1ff1224..f94608b
f94608b Take the category glyph off the collapsed bus card      <- this release
ebd4727 Record Sites Versions 141 and 142 releases           <- docs only (Codex)
8fdd0e2 Renumber the queued polish release to Version 142    <- docs only
a9c6305 Correct the 141 handoff's commit range               <- docs only
ded95b4 Queue Version 141                                    <- docs only

git diff --name-only ebd4727 f94608b -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
```

No dependency, database, or CI change:

```
git diff --name-only ebd4727 f94608b -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 188 tests passing (up from 187 at Version 142), ESLint clean, production
build succeeds.

## Migrations

**None.** Markup and CSS on one page. Nothing a record carries is different.

## What changed

### The collapsed bus card carries no category glyph

The round icon at the left of a collapsed card showed the category of whichever
defect happened to be first. On a MULTIPLE DEFECTS card that was one category's
glyph standing in for a bus with three problems in three categories, and beside
the emoji on every expanded row it read as one long run of defects.

| Where | Version 142 | Version 143 |
| --- | --- | --- |
| Collapsed bus card | round category icon at left; title without emoji | **no glyph anywhere** |
| Expanded defect rows | emoji on each row | emoji on each row — unchanged |
| Fixed Repairs cards | emoji on each card | unchanged; each card is one defect |

The icon's column is gone from the header grid at every width, so the bus
number and everything after it move left by the same amount on every card. The
tab stops from Version 142 hold, measured at 360, 390, 430 and 1180 on the same
four test cards:

| At 390 wide | Every card |
| --- | --- |
| Bus number begins | x34 |
| Title begins | x107 |
| OPEN begins | x118 |
| LATEST begins | x34 — under the bus number, its own row |
| VIEW | flush right |

Nothing clips; the status text stays on one line at 360; the FOCUS button does
not reach the meta row.

## The way back

`git revert f94608b` restores the icon and its column and nothing else. Or
republish Version 142 from `1ff1224`.

## Validation

- 188 regression tests passing, ESLint clean, production build succeeds
- **Measured, not read**, at four widths on four cards covering every badge
  combination; the expanded rows were opened in the same run and each still
  leads with its own emoji
- A test now pins all three: no icon on the collapsed card, plain-text title,
  and the emoji kept on each expanded row

## After it is live

1. **Defect Log, on a phone.** Collapsed cards show the bus number, the title
   and the summary, with no picture at the left.
2. **Expand a bus with more than one defect.** Each row still leads with its
   category emoji.
3. **Look down four or five cards.** The bus numbers, titles and OPEN pills
   should still line up as they did in 142, just further left.
4. **Fixed Repairs.** Unchanged; the card head still shows the category emoji.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 143 | Live | <published tip hash> | The collapsed Defect Log bus card no longer shows a category glyph — the round icon showed only the first defect's category, one category standing in for three on a multi-defect bus — while each expanded defect row and each Fixed Repairs card keeps its own emoji; the icon column is removed from the header grid so every card shifts equally and the 142 tab stops hold |
```

---

# Version 144 — The choices you have to read, and the word you look for

**Publish this next, after Version 143.** Stage one of a two-stage cleanup of
the Defect Log, prompted by watching a mechanic use the app for the first time.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`9f1f73f`** |
| Last code-bearing commit | `9f1f73f` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 143, published from `f94608b` |

```
git log --oneline 3082954..9f1f73f
9f1f73f Make the four save-screen choices readable, and name the search SEARCH

git diff --name-only 3082954 9f1f73f -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet.css
```

No dependency, database, or CI change:

```
git diff --name-only 3082954 9f1f73f -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 188 tests passing, ESLint clean, production build succeeds.

## Migrations

**None.** Copy and CSS. Nothing a record carries is different, and no control
changed what it does.

## What changed

### 1. The four choices under the save buttons

They carried their label at 7–8px and their explanation at 7px — smaller than
anything else a mechanic has to act on — and the explanations had grown into
paragraphs that have to be read past to make a choice.

| | Version 143 | Version 144 |
| --- | --- | --- |
| Label | 7–8 px | **11 px, 12 on a phone** |
| Explanation | 7 px | **10 px, 11 on a phone** |

The copy is cut to what is needed to choose:

| Choice | Now reads |
| --- | --- |
| RECOMMEND FOR DOWN SHEET | Put it forward for the sheet. Not added yet. |
| DOWN SHEET | Add it to the sheet now. |
| DEFERRED | Hold the bus back from service. |
| DEFECT / CONDITION NOT DUPLICATED | Could not reproduce the reported condition. |

DEFERRED has four conditional messages depending on the record's state. All
four are cut the same way and all four still say which state the record is in
and where it came from — including the one that explains why the box is
disabled while the repair is on the Down Sheet. WAS DEFERRED keeps the return
time and drops the rest.

### 2. SEARCH

The Defect Log's search box was labelled **FIND** in 7px grey. That is not a
word somebody scans a page for, and it was the smallest text on the row. It now
reads **SEARCH**, 11px, weight 900, in the page's ink.

The Down Sheet already said SEARCH but in the same 7px grey caption style; it
is brought to the same size and weight, so the two pages match. **ORDER** beside
it stays a caption on purpose — one of the two is the thing a first-time user
is looking for, and making both loud would be no help.

**The Facility Map's LOCATE is deliberately unchanged.** It jumps to a bus on
the map rather than searching a list, so calling it SEARCH would name two
different actions the same thing.

Fixed Repairs and Fleet Campaigns have no text search box, so there was nothing
to rename there.

## Validation

- 188 regression tests passing, ESLint clean, production build succeeds
- **Measured at 390 wide in a real browser**: every card label 12px, every copy
  line 11px, no card taller than 54px, nothing clipped, nothing overflowing its
  box, no page errors
- Both search labels read back at 12px / weight 900 in the page ink; ORDER
  beside the Down Sheet's stays at 8px as intended
- One test pinned the old DEFERRED sentence and was updated to the new wording;
  what it checks — that the box is disabled on a Down Sheet repair and says why
  — is unchanged

## After it is live

1. **Open any repair and scroll to the four choices.** Label and explanation
   should be readable at arm's length without leaning in.
2. **Open a repair that is on the Down Sheet.** DEFERRED should still be
   disabled and still explain why, in one line.
3. **Open a repair that was deferred and returned to service.** The WAS
   DEFERRED note should show the return time and say it is still open.
4. **Defect Log and Down Sheet.** Both search boxes should be labelled SEARCH
   in black, clearly larger than before.
5. **Facility Map.** LOCATE is unchanged; that is intended.

## Still to come — stage two

Not in this release, queued next: collapse the five summary tiles into a
DAILY STATS bar closed by default, drop the OPEN and DOWN SHEET filter
buttons while keeping the OPEN key working for anybody whose saved default
view uses it, let a filter be pressed again to turn it off, and move
+ LOG DEFECT up so the page opens on what it is for.

## The way back

`git revert 9f1f73f` — one commit, copy and CSS only.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 144 | Live | <published tip hash> | The four choices under the save buttons — recommend, down sheet, deferred, not duplicated — are readable on a phone at 11-12px with their explanations cut to one short line each, and the Defect Log's 7px grey FIND label becomes a black 11px SEARCH matching the Down Sheet's, which is brought to the same size; the Facility Map's LOCATE is left as it is because it jumps to a bus rather than searching a list |
```

---

# Version 145 — The page opens on its job, and a repair can be logged without a defect

**Publish this after Version 144.** It stacks on it: `3890055` contains
`9f1f73f`, so publishing 145 carries 144. Stage two of a cleanup that came out
of watching a mechanic use the app for the first time.

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`198083b`** |
| Last code-bearing commit | `198083b` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 144, from `9f1f73f` |

```
git log --oneline 9f1f73f..198083b
198083b Give SETTINGS its name, and keep it with the controls it belongs to           <- this release
19991fe Queue Version 145 behind 144                                                  <- docs only
3890055 Open the Defect Log on its job, and let a repair be logged without a defect   <- this release
2bcf1b0 Set the handoff status to Version 144 pending                                 <- docs only
c7b86f6 Queue Version 144                                                             <- docs only

git diff --name-only 2bcf1b0 198083b -- app
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/fixed-repairs/fixed-repairs.css
app/fixed-repairs/page.tsx
```

No dependency, database, or CI change:

```
git diff --name-only 2bcf1b0 198083b -- supabase package.json package-lock.json .github   # returns nothing
```

Gate: 191 tests passing (up from 188 at Version 144), ESLint clean, production
build succeeds.

## Migrations

**No storage rewrite.** One new LocalStorage key, `pace-defect-log-stats-open-v1`,
holding `"1"` or `"0"`. **Absent means closed**, so a device that has never
opened the stats writes nothing and still behaves correctly.

**No filter behaviour was removed.** Two buttons were, and that distinction
matters — see below.

## What changed on the Defect Log

### 1. DAILY STATS, closed by default

Five stat tiles were the first thing on the page, above the filters and above
the button that logs a defect. They are now behind one bar carrying the three
numbers worth a glance — *3 active · 2 buses · 1 fixed today* — and the open or
closed choice is remembered per device, like the mystery board's.

### 2. + LOG DEFECT is the first control

It sat in the feed header, below the tiles, the filters and the mystery board.
It is now the first thing under the page header, full width on a phone, and
**no longer repeated** in the feed header — two buttons doing one job was part
of what made the page feel busy. Measured at 390 wide: visible without
scrolling, and present exactly once.

### 3. Two filter buttons removed, no filter behaviour removed

| Button | Why it went |
| --- | --- |
| OPEN | Differed from ALL only by hiding in-progress and today's fixes. A real distinction, but a fine one that reads as noise to somebody new. |
| DOWN SHEET | Has its own page, and the DS badge on each card already says which buses are on it. |

**Both keys still filter, and both are still choosable as a default view in
settings.** Anybody whose saved default is OPEN or DOWN SHEET keeps exactly the
view they had; only the button is gone. Verified by setting a saved default of
`downsheet` and reloading — the filter still applied.

### 4. SETTINGS says what it is, and stays put

The gear stays in the controls row beside QUICK FILTERS and UNDO LAST —
**deliberately outside the collapsible stats**, because it is not a stat and
must not vanish when they close. It was a square holding a bare glyph between
two buttons that say what they do, so it read as decoration; it now carries its
name and is shaped like its neighbours.

All three controls in the row were brought to one height at the same time:
settings and undo were 42px against quick filters' 44.

### 5. Pressing the active filter clears it

It used to stay stuck on, with no way back but pressing ALL. Pressing the lit
one now returns to ALL. The quick-filter menu already behaved this way; only
this row did not.

## What changed on Fixed Repairs

### + LOG A REPAIR

Armon went to Fixed Repairs to add a fix and found only **ADD FIX DETAILS**,
which edits a record that already exists. A repair done without a defect ever
being logged — which is how it happens on the floor more often than not — had
nowhere to go.

The button opens **the same editor every other record uses**, so every field is
already there: category, issue, description, fix, diagnosis, finding, parts,
hours, who and when. The only thing a blank record lacks is the bus, so the
editor asks for that at the top and nothing else about the form differs. It is
disabled when the device has no buses, because there would be nothing to attach
the repair to.

**One real bug was fixed to make this work.** `saveCompletion` mapped over the
bus's existing defects. A record that is not on the bus yet matches nothing, so
mapping alone would have **written no record and reported success**. It now
appends when the defect is absent, and the change lands on UNDO like every other
change on that page.

## Validation

- 191 regression tests passing, ESLint clean, production build succeeds
- **Driven in a real browser at 390 wide.** Defect Log: stats closed on first
  load, opened, remembered across a reload, closed again; LOG DEFECT visible
  without scrolling and present exactly once; each filter pressed on and off
  with the card count moving 3 → 1 → 3; a saved default view of a removed key
  still filtering after a reload
- **A repair logged end to end**: LOG A REPAIR → bus 15514 → Brakes → ABS
  warning → fix text → initials → save. Storage went from 0 defects on that bus
  to 1, the record reads `state: completed` with its fix, initials and
  completion time, the editor closed, the record appeared in the feed, and UNDO
  became available
- No page errors in any run

## After it is live

1. **Open the Defect Log on a phone.** The first things should be DAILY STATS
   closed, then + LOG DEFECT, then three filters.
2. **Tap DAILY STATS.** The five tiles appear; leave and come back and it
   should still be open. Close it and it should stay closed.
3. **Tap a filter, then tap it again.** It should clear back to ALL.
4. **Find SETTINGS.** It reads ⚙ SETTINGS beside QUICK FILTERS, the same height
   as it, and it is still there whether DAILY STATS is open or closed.
5. **If anybody had a saved default view of Open or Down Sheet** (Settings →
   Default View), it still works. The button is gone; the view is not.
6. **Fixed Repairs → + LOG A REPAIR.** Pick a bus, fill in the repair, save. It
   should appear immediately as a completed record, with UNDO available.

## The way back

`git revert 198083b` takes back the SETTINGS change alone and applies cleanly.

To take back the whole release, revert them newest first — `git revert 198083b`
then `git revert 3890055`. Reverting `3890055` on its own conflicts, because
`198083b` edits the same lines after it. Or publish Version 144 from `9f1f73f`.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 145 | Live | <published tip hash> | The Defect Log opens on + LOG DEFECT instead of a scoreboard: the five stat tiles collapse into a DAILY STATS bar closed by default and remembered per device, the log button moves to the top and is no longer duplicated, and the OPEN and DOWN SHEET filter buttons are removed while both keys keep filtering so saved default views still work; pressing the active filter now clears it. Fixed Repairs gains + LOG A REPAIR for a repair done without a defect ever being logged, opening the existing editor with a bus picker, and the save path now appends a new record instead of silently writing nothing |
```
