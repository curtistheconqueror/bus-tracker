# Publish next

**STATUS: PENDING — two releases are queued, each frozen to its exact SHA. Version 129 is live.**

| Order | Version | Publish from | What it is |
| --- | --- | --- | --- |
| 1st | **130** | `5fc8436` | One repair, one record — duplicate defects merged, and no new ones made |
| 2nd | **131** | `8858e3f` | Three defects named: bike rack, which start button, and the IntelligAIRE III panel |

**Version 129 was published from `24a02a9` on 2026-08-31.** Publish **130** next
from `5fc8436`, then **131** from `8858e3f`.

131 contains 130, so publishing `8858e3f` alone would deliver both correctly —
but they are separate releases with separate checks, and 130 carries the change
that touches stored repair records. Do not merge them into one version number.

The Version 130 and Version 131 sections below are complete handoffs. The
earlier Version 129 section is retained as the published release record.

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

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`24a02a9`** |
| Last code-bearing commit | `24a02a9` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 128, published from `c1101bd` |

> **Publish from `24a02a9`, not from whatever `main`'s tip is when you read
> this.** This release is frozen to that SHA on purpose.
>
> Earlier handoffs said "the current tip of `origin/main`", which is only true
> until the next commit lands. Work on the next release continues on `main`
> while this one waits for approval, so a tip read at publish time can contain
> code this handoff has never described or validated — and a publisher who
> notices that correctly refuses to publish. Naming the SHA removes the race:
> what is documented here and what gets published are the same tree no matter
> how long approval takes.
>
> If `main` has moved when you read this, that is expected and is not a reason
> to hold. Check what moved:
>
> ```
> git log --oneline 24a02a9..origin/main
> ```
>
> Documentation-only commits after `24a02a9` change nothing that ships. The
> application code in that range belongs to **Version 130**, whose handoff is
> the second half of this file — publish `24a02a9` for 129 and leave it.

Confirm what this release contains — every command pinned to the two SHAs, so
the answers do not change as `main` moves:

```
git diff --name-only c1101bd 24a02a9
```

which lists exactly eight files: three under `app/`, one under `tests/`, and
four documentation files (`PROJECT_HANDOFF.md`, `README.md`,
`docs/RELEASES.md` and an earlier revision of this one). The documentation four
are Codex's own Version 128 release record plus this handoff; they ship nothing.

The application change is these four:

```
git diff --name-only c1101bd 24a02a9 -- app tests package.json package-lock.json public supabase
```

```
app/cloud-sync-control.tsx
app/defect-log/page.tsx
app/defect-log/quick-filter-share.ts
tests/rendered-html.test.mjs
```

Nothing was uncommitted or stashed when `24a02a9` was pushed, and
`claude-contributions` carries the same tree. No history was rewritten and no
branch was force pushed.

Gate: 153 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration in this release.** `supabase/` is untouched since
Version 127:

```
git diff --name-only 831b753 24a02a9 -- supabase     # returns nothing
```

Those files were applied to the live Supabase project by Curtis and verified
there on 31 August. Since then the project has been **populated and is in
active use** — see Live exposure below. Nothing needs running at publish time,
and nothing in this release touches the schema.

**No dependency changes:**

```
git diff c1101bd 24a02a9 -- package.json package-lock.json   # returns nothing
```

**No local data migration.** Version 128 carried one (the waiting-area
renumbering); this release carries none. No LocalStorage key is added, renamed
or removed, and nothing already stored is rewritten.

## Live exposure — read this before deciding to wait

Version 128's handoff could say exposure was nil because no device had been
connected to the shop cloud. **That is no longer true.** The Supabase project is
live and one device — "Phone (CM)" — is connected and syncing, holding 108
buses, 334 defects and 52 Down Sheet entries. A second device is being set up.

Change 1 below is a data-loss fix in exactly that path. It is the reason to
publish now rather than bundle this with later work.

## What changed

Two user-visible changes, oldest first.

### 1. GET THE SHOP'S COPY sends before it receives — `9361f94`

**This is the reason to publish.** A merge takes the incoming copy for a bus
that both devices know about. Sending was automatic on a 45-second sweep, but
pulling was manual, and nothing tied the two together.

So a person who moved five buses and pressed **GET THE SHOP'S COPY** inside that
window — before their own sweep had run — had the server's older copy laid over
the top of their work. The next sweep then pushed that overwritten version up as
though it were the truth. Five moves gone, on every device, with nothing on any
screen to say so.

The button now pushes this device's work first. The server then already holds
those moves, stamped later than anything else, and the database's last-write-wins
trigger keeps them, so what comes back down includes this device's work instead
of erasing it.

It also **refuses to pull when the push failed**, and says why in plain words.
Merging onto a device whose work has not left it is precisely how that work
disappears; "this device's own changes could not be sent, so nothing was brought
down" is a far better outcome than a silent overwrite.

This is what makes the rule Curtis asked for actually hold: *work as long as you
like, move as many buses as you like, and whenever you press refresh you are
caught up.* Before this fix that was true only if you happened to wait out the
sweep first, which is not something anybody should have to know.

### 2. A shared filter list is readable, and can go as a page — `24a02a9`

Sharing a Quick Filter produced a wall of run-on text, and bus 17543 said the
same sentence twice. Three separate things, and the first is not what it looked
like.

- **The share was never dumping unrelated defects.** It already filtered to the
  ones that matched, the same as the cards on screen. Nothing changed there.
- **Identical defect lines now collapse to one.** Bus 17543 genuinely carries the
  same overheat three times (see Known issue), and a person reading a shared list
  cannot tell whether the same sentence twice means two problems. It means one.
  Two genuinely *different* faults still print as two lines — this suppresses
  repeats, never a second real fault.
- **A blank line between buses**, defects indented under the number, and the
  location moved up onto the bus line. Where to walk is the thing somebody acts
  on, and the text version was the only place it was missing.

And a third button, **SHARE PAGE**, next to COPY LIST and SHARE. It sends the
same list as a self-contained HTML file that opens looking like the cards on
screen. Everything is inlined — no fonts, no scripts, no network of any kind —
because this gets opened from a text message on a phone that may be standing in
a garage with no signal, and a page that has to fetch something is a page that
shows nothing. A file rather than a link also means nobody needs an account, and
it still reads a year from now. It states on its face that it is a snapshot and
does not update, because a stale list that looks live is worse than one that
admits it.

Everything a person typed is HTML-escaped, so a note containing a bracket stays
a note rather than becoming markup. The file goes out through
`shareOrDownloadFile`, the same path the Defect Log export already uses, so it
uses the share sheet where there is one and falls back to a download where there
is not.

## Known issue this release does not fix

**Duplicate defect records from photo scans.** A repair photographed off the
Down Sheet on different days mints a fresh id from the clock each time, so the
same fault is stored more than once. Measured against the live board on 31
August: **328 open defects, 150 of them scan-sourced, and 21 buses carrying 25
redundant records.**

Change 2 collapses identical lines *in a shared list*. It does not touch stored
records, and the underlying duplicates still inflate defect counts on the board.

Fixing it at the source — scan matching recognising a repair it has already
seen — **is Version 130, whose handoff is the second half of this file.** It
touches repair records, so it gets its own release, its own validation and its
own checks rather than riding along under a handoff already approved for
publication.

Publishing 129 neither helps nor worsens this, and does not need to wait for it.
It is recorded here so nobody reads the collapsed share list as evidence the
duplicates are gone.

## Data safety

- No LocalStorage key added, renamed or removed. The cloud keys
  (`pace-cloud-config-v1`, `pace-cloud-state-v1`, `pace-cloud-sent-v1`,
  `pace-cloud-auth-v1`) shipped in 127 and are unchanged.
- No stored record is rewritten, and no record shape changed.
- No repair, defect or Down Sheet record is deleted or merged by this release.
- The duplicate collapse in change 2 is presentation only, applied when a list is
  shared. The board keeps every record it had.
- Change 1 strictly *reduces* the chance of data loss. Its failure mode is
  refusing to merge and saying so, which leaves the device exactly as it was.

## Validation

- 153 regression tests passed, up from 151 at Version 128
- ESLint passed
- Production build passed
- The pull-order fix was reproduced before it was fixed: a device with unsent
  moves pulling inside the sweep window lost them, and does not after
- The share output was checked against a real filtered board, including the
  bus 17543 duplicate that prompted it, and against an empty filter
- **The generated page was rendered in Chromium at 390px with every non-`file://`
  request aborted.** It attempted **zero** network requests, so there is nothing
  for a dead signal to fail: heading, per-bus cards, locations and footer all
  present, and no horizontal overflow
- **Escaping was verified by a real HTML parser, not a regex.** A defect note
  containing `<img src=x onerror="document.title='PWNED'">`, quotes, an
  apostrophe and an ampersand, on a bus numbered `1<b>9`, produced
  `document.images.length === 0`, `document.scripts.length === 0`, no page
  errors, and a title still reading `Farebox — Pace South`. The markup renders
  as visible text

## After it is live

1. **Defect Log → any Quick Filter → COPY LIST.** Confirm there is a blank line
   between buses, the location sits on the bus line beside the number, and the
   defects are indented under it.
2. Open the **Farebox** filter and confirm bus 17543 lists its overheat **once**,
   not twice.
3. Press **SHARE PAGE**. Confirm a file arrives, opens as cards rather than a
   paragraph, and shows the heading, the bus count and the time it was taken.
   Turn the phone to airplane mode and open the file again — it must render
   identically.
4. **Settings → SHOP CLOUD, on a connected device.** Move two or three buses,
   then press **GET THE SHOP'S COPY** straight away without waiting. Confirm the
   buses you just moved are still where you put them after the reload.
5. With the device offline, press **GET THE SHOP'S COPY** and confirm it says
   this device's changes could not be sent and nothing was brought down — and
   that the board is unchanged afterwards.
6. Confirm the status line still reads correctly after that failure, rather than
   sticking on "Syncing…".

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 129 | Live | <published tip hash> | GET THE SHOP'S COPY now sends this device's work before merging the shop's copy in, and refuses to merge if that send failed; shared Quick Filter lists collapse repeated defect lines, space each bus apart and carry its location, and can be sent as a self-contained page that renders offline |
```

---
---

# Version 130 — One repair, one record

**Publish this SECOND, after Version 129 is live.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`5fc8436`** |
| Last code-bearing commit | `5fc8436` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 129, published from `24a02a9` |

Frozen to a SHA for the same reason 129 is: work continues on `main` while a
release waits for approval, and a handoff that says "the current tip" stops
being true the moment the next commit lands.

Everything this release contains:

```
git diff --name-only 24a02a9 5fc8436
```

Nine application files plus this handoff:

```
app/cloud-client.ts            app/defect-log/page.tsx
app/cloud-sync-control.tsx     app/down-sheet/down-sheet-sync.ts
app/cloud-sync.ts              app/down-sheet/page.tsx
app/defect-log/defect-log.css  app/duplicate-defects.ts   (new)
tests/rendered-html.test.mjs
```

Gate: 155 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration.** `supabase/` and both package files are untouched:

```
git diff --name-only 24a02a9 5fc8436 -- supabase package.json package-lock.json   # returns nothing
```

**One new LocalStorage key**, additive: `pace-cloud-merged-v1`. Nothing existing
is renamed, removed or rewritten. See Data safety.

## What changed

### One repair is recorded once — `5fc8436`

**The problem, measured rather than assumed.** The shop's live board carries 328
open defects, and **25 of them say nothing the record beside them does not
already say**, across **21 buses**. Confirmed by querying the live database on
31 August: three Down Sheet photos, taken on 22, 23 and 27 August.

**The cause is identity.** A defect is keyed on the sheet entry that carried it
in, and a rescan of the same paper sheet mints a fresh entry id from the clock.
A bus that comes off the sheet and back on — or is simply photographed again
days later — arrives under an id nothing on the bus matches, so the identical
fault is recorded again. Two of the 21 are not scans at all: they were typed
into the Defect Log by hand, days apart, past the 48-hour duplicate guard.

This is not cosmetic. Defect counts drive what a foreman looks at first, the
shared lists that go out to the crew, and every "how many are down" number.

**Prevention — the half that matters most.** A scan now looks for an unresolved
record on that bus saying exactly the same thing, and writes to it instead of
minting a second. Every one of the 25 would have been prevented by this. Only
exact repeats match — same category, symptom and details — so a genuinely
different fault on the same bus is still its own record.

**Cleanup for what is already there.** A **MERGE DUPES** button in the Defect
Log action bar, carrying a count, so a tidy board says so without being pressed
and the button is disabled when there is nothing to do. It is explicit and
pressed by a person, never automatic on load: everything else that runs at read
time rearranges what is *shown*, while this changes stored repair records. It
lands on **UNDO LAST** like every other change there.

**Nothing is lost.** Every field a copy holds and the survivor does not is folded
in, symptoms are unioned, the **earliest** creation stamp wins because that is
when the fault was first seen, and the **most severe** operability wins so a
merge can never quietly put a bus back in service. Records that say nothing at
all are deliberately left alone: two untyped defects are indistinguishable, but
that is not evidence they are the same fault.

### Two failure modes found by testing, not by reading

Both would have made the cleanup visibly useless, and both are worth knowing
about because they explain why this release touches the sync client.

**1. The sheet would have re-created the duplicates.** Replaying all 21 groups
against the live board showed **11 buses** where an entry still open on the
sheet regenerates the record on its next save: the entry names no defect, so it
mints one from its own id, and the same sentence lands under a new id within a
shift. Those entries are now pointed at the survivor. For the same reason,
survivor choice is not simply "keep the oldest" — where an entry is still on the
sheet, the record *it* regenerates has to be the one kept, which on four buses
is the newest copy.

**2. The shop cloud would have undone all of it on the next sync.** A push only
sends what a bus still carries, so a folded record is not deleted anywhere: it
stays live on the server, the next **GET THE SHOP'S COPY** reads it back, and
the merge takes incoming records it does not have. All 25 would have returned,
on the very device that ran the cleanup. There is now a ledger of what was
merged away — this device refuses those records on the way in, and tombstones
them on the way out so other devices stop being sent them.

## Known limitation

**The cleanup does not propagate to other devices by itself.** Tombstoning
removes the records from the server, so no device is *sent* them again, but a
second device that already holds its own copies keeps showing them until
somebody presses MERGE DUPES there too. The button carries a count on every
device, so it is visible rather than hidden.

This is a property of the existing sync design — it has never propagated
removals of any kind — not something this release introduces. Prevention means
no new duplicates are created on any device, so this is a one-time tidy per
device rather than an ongoing chore.

## Data safety

- **Nothing is deleted.** Duplicates are folded into one record that keeps every
  field any copy held.
- **No LocalStorage key renamed or removed.** One new additive key,
  `pace-cloud-merged-v1`, holding the ids this device merged away and when.
  Absent on a device that has never merged, and the code treats absent as empty.
- **A record the board still carries is never tombstoned**, whatever the ledger
  says. That is what keeps UNDO LAST safe, and it means a stale ledger entry can
  never delete a live repair.
- **The merge never crosses buses**, and never folds a completed record into an
  open one.
- **The scan adoption is exact-match only.** It will not attach a scan to a
  differently-worded record.

## Validation

- 155 regression tests passed, up from 153 at Version 129
- ESLint passed; production build passed
- **Replayed against the live board**: all 21 duplicate groups reconstructed
  from the shop's database with their real Down Sheet entries. Result: **25
  records merged across 21 buses, 4 groups anchored by the sheet, 0 resurrected
  when every still-active entry was replayed** — matching what Postgres reports
  independently for the same board
- The 11-bus resurrection bug and the sync-resurrection bug were each caught by
  that replay, reproduced, fixed, and pinned with their own regression tests
- Measured in Chromium at 390px and 1440px: the count renders and the button
  disables when the board is clean, the action bar wraps without overlap on a
  phone, the survivor keeps its first-seen date and severity, UNDO LAST arms
  with the right label, and the ledger is written to storage

## After it is live

1. **Defect Log** — confirm a **MERGE DUPES** button sits beside CLEAN UP. On
   Curtis's board it should read **MERGE DUPES (25)**.
2. Press it. The confirmation should name 25 records on 21 buses. Accept, and
   confirm the button goes grey and reads **MERGE DUPES** with no count.
3. Spot-check **bus 17543**: it should now show its overheat once, and the
   record should still be dated **22 August**, not today.
4. Spot-check **bus 17504, 17541, 17562 or 17567** — each had three copies and
   is still on the Down Sheet. Confirm one record remains and the bus still
   reads Out of Service.
5. Press **UNDO LAST** and confirm the duplicates come back, then press MERGE
   DUPES again.
6. **Open the Down Sheet and save any entry for one of those buses.** Confirm no
   duplicate reappears — this is the check that the sheet is pointed at the
   surviving record.
7. **Settings → SHOP CLOUD → SEND MY CHANGES**, then **GET THE SHOP'S COPY**.
   Confirm the merged records do **not** come back. This is the check that
   matters most; without it the cleanup would silently undo itself.
8. On a second connected device, confirm MERGE DUPES shows its own count and
   works there too.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 130 | Live | <published tip hash> | One repair is recorded once: sheet photo scans write to the record a bus already carries instead of minting a second, and a MERGE DUPES action folds existing exact repeats together keeping every field, the earliest reported date and the most severe status; merged records are tombstoned so the shop cloud cannot resurrect them |
```

---
---

# Version 131 — Three defects that were hiding inside vaguer ones

**Publish this THIRD, after Version 130 is live.**

## Source

| Field | Value |
| --- | --- |
| **Release source** | **`8858e3f`** |
| Last code-bearing commit | `8858e3f` — the release source is this commit |
| Branch | `main` on the private `origin` remote |
| Previous | Version 130, published from `5fc8436` |

The application change is two files:

```
git diff --name-only 5fc8436 8858e3f -- app tests package.json package-lock.json public supabase
```

```
app/repair-catalog.ts
tests/rendered-html.test.mjs
```

The unfiltered range also lists `PROJECT_HANDOFF.md`, `README.md`,
`docs/RELEASES.md` and this file. Those are **Codex's own Version 129 release
record** (`3f45b10`) plus this file's own handoffs, which sit between the two
SHAs because 130 was written before 129 was published. They ship nothing. The
commits in the range are:

```
git log --oneline 5fc8436..8858e3f
8858e3f Name the IntelligAIRE III panel in the A/C list
d4ea70a Correct the Version 131 file list
e9922c4 Queue the Version 131 handoff behind 130
d1d2e76 Bus Accessories for the bike rack, and name which start button is broken
3f45b10 Record Sites Version 129 release
7dc9d89 Queue the Version 130 handoff behind 129
```

Gate: 157 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration, no dependency change, no new storage key, and no
record rewritten.**

```
git diff --name-only 5fc8436 8858e3f -- supabase package.json package-lock.json   # returns nothing
```

This release only adds choices to the repair catalog. Every existing defect
record reads back exactly as it was logged.

## What changed

All three come from the same complaint: work was being filed under a heading
that made it look like something it is not, or said nothing about what it
actually was.

### 1. A Bus Accessories group, for the bike rack

The bike rack lived in two places and neither fitted a **reported fault**:

- **Bodywork — "Bike rack - bent / replacement"**, correct when the rack has
  been hit and it really is the body shop's job.
- **Preventive Maintenance — "Bike rack - arms / pivot adjustment"**, which is
  scheduled work, not something a driver hands in.

A rack that comes back **loose**, or **missing an arm**, is neither. It is a
defect on a piece of equipment, and filing simple bolt-up work as body work put
it in front of the body shop on every count and every shared list.

**Bus Controls gains a "Bus Accessories" group** with the two faults as they
actually get reported:

- `Bike rack - arm replacement`
- `Bike rack - loose / pivots`

**Both existing entries stay exactly where they are.** A bent rack really is
body work and the PM line really is scheduled maintenance; this adds the third
case rather than moving the other two. The group is deliberately named for
accessories rather than for the bike rack, so the next thing bolted to a bus has
somewhere to go.

### 2. The start buttons are named by station

Two separate buttons start this bus, and Bus Controls offered a single entry
called **"Start button"** that said neither. It is now:

- `Front start button`
- `Rear start button`

**This is not the same as the starting-system entries, and both pairs are kept
on purpose.** "Front start INOP" and "Rear start INOP" in *Battery, Starting and
Charging* say the bus will not start from that station, which points at the
starting and charging system. A button that does not work **while the other
button still starts the bus** is a bad switch. Conflating them puts simple
switch work in front of a charging diagnosis.

Neither new entry takes a bus out of service, because a bus with one working
start button still runs.

**The ambiguous entry is retired from the picker rather than renamed.** Nothing
can say which button an old record meant, and the precedent in this file is the
crossed "Only front start" rename that had to be mapped *backwards* to avoid
inverting every record already logged. Guessing would silently relabel somebody's
work. The live board carries none of these — checked before deciding rather than
assumed — and any record that does still reads exactly as logged, because the
editor already offers an off-catalog issue back as **"(as logged)"**.

### 3. The IntelligAIRE III panel is named in the A/C list

**A/C and HVAC** gains one entry:

- `IntelligAIRE III control panel - screen blank / black`

The Thermo King panel on the bulkhead has a screen that goes black often enough
to be worth logging as its own fault. The only place for it was **"Controls /
electrical"**, which covers the whole A/C control side and says nothing about
*which* control — so a recurring, recognisable failure arrived on the board
indistinguishable from a wiring fault, and there was no way to count how often
the panel does it.

Naming the panel is the point: *IntelligAIRE III* is what is printed on the
label, so it is what somebody standing at the bus reads off and what somebody
searching the Defect Log later will type.

It sits directly after "Controls / electrical", because that is where a person
looking for a control fault is already looking. **The vague entry stays** — the
A/C control side has faults that are not this panel. A blank display does not
down a bus, so it defaults to May Stay In Service like the rest of the category.

A/C and HVAC is an **ungrouped** category, so this belongs in `REPAIR_OPTIONS`
only. Adding a `REPAIR_OPTION_GROUPS` entry would turn the whole category into a
two-step picker for every other A/C defect; that is now asserted rather than
left to be rediscovered.

### 4. The catalog invariant is now asserted, not spot-checked

A grouped category carries every entry twice: prefixed in `REPAIR_OPTIONS`,
which is what gets **stored**, and bare in `REPAIR_OPTION_GROUPS`, which is what
the picker **draws**. Adding to one and not the other gives either a picker
option that stores something the catalog does not know, or a stored value nobody
can choose — and neither surfaces until somebody is standing at a bus.

It was only ever spot-checked on two mirror switches. It is now asserted for
every grouped category, which is the check that adding a whole new group needed.
It already held everywhere, order included.

## Data safety

- **Nothing is renamed, moved or rewritten.** Additions only.
- **No record is orphaned.** The one retired picker entry has zero records on the
  live board, and any that exist elsewhere still read as logged.
- **The bike rack entries in Bodywork and Preventive Maintenance are untouched.**

## Validation

- 157 regression tests passed, up from 155 at Version 130
- ESLint passed; production build passed
- The live board was queried before deciding how to treat the ambiguous entry:
  zero records use `Operating Controls - Start button`, and one open record uses
  `Front start INOP`, which stays where it is
- Measured in Chromium at 390px: the **Bus Accessories** group draws with both
  bike rack entries, **Operating Controls** offers both start buttons, and
  choosing a bike rack fault stores
  `Bus Accessories - Bike rack - arm replacement`
- Also measured at 390px: the IntelligAIRE III entry draws in the flat A/C list
  in the right position, stores under its own name, and its label fits the
  control without clipping or pushing the page sideways

## After it is live

1. **Defect Log → + LOG DEFECT → category Bus Controls.** Confirm the QUICK
   SELECT list ends with a **Bus Accessories** group holding **Bike rack - arm
   replacement** and **Bike rack - loose / pivots**.
2. In the same list, under **Operating Controls**, confirm **Front start button**
   and **Rear start button** appear next to each other, and that the old plain
   **Start button** is gone.
3. Log a bike rack fault on any bus and confirm it saves, appears on the Defect
   Log card, and does **not** take the bus out of service.
4. Confirm **Bodywork** still offers **Bike rack - bent / replacement** and
   **Preventive Maintenance** still offers **Bike rack - arms / pivot
   adjustment** — those are meant to stay.
5. Confirm **Battery, Starting and Charging** still offers **Front start INOP**
   and **Rear start INOP**.
6. **Category A/C and HVAC** — confirm the list offers **IntelligAIRE III
   control panel - screen blank / black**, directly under **Controls /
   electrical**, and that **Controls / electrical** is still there. Log one and
   confirm it does not take the bus out of service.
7. The same lists appear on the Down Sheet editor; confirm the new entries are
   there too.

## Publishing constraints that still apply

- Do not create a replacement Sites project, change the live URL, or overwrite
  newer work with an older checkout.
- Update `docs/RELEASES.md` and `PROJECT_HANDOFF.md` in the same follow-up commit
  once the version is saved and deployed, and replace this file with the next
  handoff or reset it to `STATUS: NONE PENDING`.

Suggested `docs/RELEASES.md` row:

```
| 131 | Live | <published tip hash> | A Bus Accessories group under Bus Controls for bike rack arm replacement and loose pivots, kept apart from body-shop and scheduled-maintenance bike rack work; front and rear start buttons named separately from the starting-system entries so a bad switch is not filed as a charging fault; and the IntelligAIRE III control panel named in the A/C list so a blank screen stops being logged as generic control wiring |
```
