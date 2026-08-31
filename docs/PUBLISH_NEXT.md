# Publish next

**STATUS: PENDING — Sites Version 129, two changes on `main` since Version 128.**

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
| Tip at the time of writing | `24a02a9` |
| Last code-bearing commit | `24a02a9` |
| Branch | `main` on the private `origin` remote |
| Previous live | Version 128, published from `c1101bd` |

Resolve `origin/main` to a hash at publish time and record that hash as the
release commit. At the time of writing the tip is itself the last code-bearing
commit, so there is no tooling-only tail to discount.

Confirm what moved with:

```
git diff --name-only c1101bd..origin/main
```

which should list exactly eight files: three under `app/`, one under `tests/`,
and four documentation files (`PROJECT_HANDOFF.md`, `README.md`,
`docs/RELEASES.md` and this one). The documentation four are Codex's own
Version 128 release record plus this handoff; they ship nothing.

The application change is these four:

```
git diff --name-only c1101bd..origin/main -- app tests package.json package-lock.json public supabase
```

```
app/cloud-sync-control.tsx
app/defect-log/page.tsx
app/defect-log/quick-filter-share.ts
tests/rendered-html.test.mjs
```

Nothing is uncommitted and nothing is stashed. `main` and `claude-contributions`
point at identical trees (`91a96f2`). No history was rewritten and no branch was
force pushed.

Gate: 153 tests passing, ESLint clean, production build succeeds.

## Migrations

**No database migration in this release.** `supabase/` is untouched since
Version 127:

```
git diff --name-only 831b753..origin/main -- supabase     # returns nothing
```

Those files were applied to the live Supabase project by Curtis and verified
there on 31 August. Since then the project has been **populated and is in
active use** — see Live exposure below. Nothing needs running at publish time,
and nothing in this release touches the schema.

**No dependency changes:**

```
git diff c1101bd..origin/main -- package.json package-lock.json   # returns nothing
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
seen — is separate work that has not been authorised, and it touches repair
records, which are never merged or deleted without Curtis saying so explicitly.

Publishing 129 neither helps nor worsens this. It is recorded here so nobody
reads the collapsed share list as evidence the duplicates are gone.

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
