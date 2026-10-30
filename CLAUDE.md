# Working on this project

**New session? Read `docs/NEXT_SESSION.md` first.** It is the entry point: where
things stand, what is queued with enough detail to start, the workflow with
Codex, and the traps this project has actually fallen into.

This file is the short version of the rules: what will get you in trouble, and
how to check your work. `PROJECT_HANDOFF.md` has the domain detail, surface by
surface.

## What it is

An offline-first fleet maintenance app for the Pace South garage, used by shop
foremen and mechanics on phones and one shop computer. Seven surfaces: Facility
Map, Down Sheet, Defect Log, Fixed Repairs, Fleet Campaigns, Incidents, Shop
Talk.

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

## Two things every new feature has to keep true

Curtis, as a standing design spec rather than a task: *"as we add new features
to this, to the site overall, we need it to be constructed in such a manner
where our MCP integration will work fine, and also when we're ready to ship
this app — if we're ready to give it to like Pace or any other organization
where they can seamlessly plug it into their own infrastructure, whether
they're beyond their private servers or otherwise — we have to always keep that
design spec in mind."*

Neither is a feature to build. Both are constraints a change either respects or
quietly breaks, and the second one the app does not satisfy today.

### 1. THE MCP READS THE APP'S OWN FUNCTIONS, so the rule is where logic lives

**PR39** (`POST /api/mcp`, open and unmerged, five read-only tools) answers
questions by calling the same functions the buttons call — `mysteryBusIds`,
`locationLabel`, `buildFleetStatusReport`, `normalizeDefects`, and the cloud's
own three payload and three merge functions in the same order a device's pull
uses. Its own words: *"a tool that did its own arithmetic would be a second
implementation of a rule, and the five copies of the location table are what
that costs."*

So the MCP constraint is already written in `docs/ARCHITECTURE.md` and is worth
restating with its consequence: **a rule that lives in a page component is
invisible to the MCP.** Put the decision in `src/lib/<area>/` as a `.ts` with no
JSX and storage passed in; let the page call it. A window, a filter, a count or
a label computed inline in a `page.tsx` has to be reimplemented in the route to
be answerable, and then there are two of it.

Two more, both already true and both cheap to break:

- **A bus is addressed by FLEET NUMBER.** A bus id is device-local, so an id
  means nothing to an agent. Anything an agent might ask for keys on the number.
- **Every answer carries `asOf` beside `fetchedAt`.** The records live in each
  device's LocalStorage and the cloud is a copy, so a feature that reports fleet
  state needs to be able to say when it was last heard. What never travels stays
  invisible: a HOLD, FULL SWEEP, the roles, the shift hours, PATH TO REPAIR, the
  repair-hours ledger, the undo ledgers.

Its security position is recorded, open, and not to be tidied away:
`docs/MCP_SECURITY_FOLLOWUP.md` and `docs/AGENT_MCP.md`.

### 2. ANOTHER GARAGE PLUGGING IT IN — what blocks it, measured

The honest state: **the app is single-site today, and the obstacle is not
branding.** Counted at this commit —

| | what it is | where |
| --- | --- | --- |
| the yard's geometry | six independent descriptions of one building that must agree, plus ~71 slot-prefix literals across 16 files, some carrying BEHAVIOUR (`smart-status`, `mystery-buses`, `road-calls`) | `docs/roadmap/facility-config.md`, scoped and not built |
| 60 storage keys | all prefixed `pace-`, and renaming one is forbidden above | the key list below |
| the Shop Cloud | one project, one shop login, and RLS grants any authenticated user full insert and update | `supabase/migrations/0002_shared_records.sql` |
| the MCP | one `MCP_TOKEN` with no issuer and no per-organisation identity | `docs/AGENT_MCP.md` |

What is already portable and shows the shape of the answer: the **shift hours
and pullouts** are device-editable because a contract is not a property of the
software; the **site's own sections** come from `site-config.ts`; **`APP_NAME`**
is one line; and the organisation's name is now **`src/lib/settings/site-identity.ts`**
— it had been typed into four share modules and a fifth was added the day that
file was written, which is how a string becomes unfindable.

**So the rule for a new feature is narrow and checkable:** do not add a seventh
description of the building, do not hard-code the organisation's name or the
site's geometry where a constant or `site-config.ts` can answer, and do not
assume one shop, one cloud project or one token in anything that would have to
be rewritten per customer. The big unbuilt piece stays
`docs/roadmap/facility-config.md`, and pulling the site out of the code is the
release that makes "seamlessly plug it in" true rather than aspirational.

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
- **A location is named through `src/lib/fleet/location-label.ts`, never by a prefix.**
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
  `src/lib/defects/repair-catalog.ts` (`LEGACY_CATEGORY_RENAMES`, `CATEGORY_ISSUE_RENAMES`,
  `LEGACY_ISSUE_RENAMES`, `RETIRED_ISSUES`). Nothing on disk is ever rewritten.
- **A HOLD is a fact about the BUS and nothing lifts it but time or a person.**
  `src/lib/fleet/bus-hold.ts` stores it as an optional `hold` field on the bus record —
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
  pace-incidents-v1                INCIDENTS: what happened to a person, where
  pace-shop-talk-v1                SHOP TALK: hazards, heads ups, suggestions

what the shop has taught it
  pace-parts-memory-v1             learned part numbers
  pace-findings-memory-v1          learned causes, per symptom
  pace-scan-notes-v1               notes for the next scan, 500 chars
  pace-ptr-v1                      PATH TO REPAIR: how to approach a repair, per repair
  pace-repair-hours-v1             what this shop says a repair takes, per repair

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
  pace-feedback-settings-v1        sound and vibration on this device, both OFF
  pace-header-theme-v1             the app's header colour, and any per-page override
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
TIME onto one. Pullout times appeared nowhere at all. `src/lib/settings/shift-clock.ts` is
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

**`pace-feedback-settings-v1` is OFF, and the switch matters more than the
sound.** Curtis: *"make sure the sound is off by default ok? Any sounds.
Toggleable in settings."* When he asked, the app made no sound at all — no
AudioContext, no Audio element, no audio file, no speech. The only thing a
person could perceive without looking was the short buzz when a bus is picked
up on the Facility Map.

So the deliverable was never an off switch for a sound that does not exist. It
is a tripwire a sound added in six months has to walk into:
`tests/settings.test.mjs` scans `app/`, `src/` and `public/` and fails if a
vibrate, an `Audio`, an `AudioContext`, a `speechSynthesis`, a `Notification`,
a `showNotification`, an `<audio>` tag or an audio file path is named anywhere
outside `src/lib/settings/feedback-settings.ts`.

**It is a tripwire and not a proof.** It catches every ordinary way of adding a
sound, including four that defeated its first draft — `createElement("audio")`,
`new window.Audio`, an aliased `navigator`, and `Notification`, which rings and
vibrates on Android and was not in the list at all. It does NOT catch
`navigator["vib"+"rate"]()`, and no static token scan can. What it stops is
somebody honest adding a chime without knowing there was a rule, which is the
realistic failure.

Comments are stripped by a **string-aware** scanner rather than a regex. The
first version used `/\*[\s\S]*?\*\//g`, so a line holding `"https://x/*"`
opened a pseudo-comment that swallowed real code after it — a planted
`new Audio("/ding.mp3")` passed — while a `//` comment that did not start its
line was never stripped at all, so prose about this rule failed the build. Two
bugs in opposite directions, one cause. Strings are KEPT, because an audio path
only ever lives in one, and a file extension is only matched after a quote,
slash or `(`, so a `.wav` CSS class name is not an audio file.

**One switch, two flags on disk, and they move together.** It was built as two
switches on the reasoning that a buzz is not a sound. Curtis: *"Yes sound and
vibration together."* The two fields stay only so that splitting them again is
a UI change rather than a migration.

**A mixed record is normalised on read**, and it has to be. A device that
ticked only SOUND under the two-switch UI holds `{sound:true,vibration:false}`;
read as-is, the single switch renders ON while holding a bus makes no buzz at
all — the app's only perceivable feedback, silently missing, with no way out
but toggling off and on. Either flag set now reads as both set.

**Off is the safe read, which inverts `app-mode.ts` on purpose.** That file
resolves an unreadable record to FULL, because taking pages away from a mechanic
mid-shift is the worse failure. Here the generous reading is the harmful one, so
anything that is not EXACTLY `true` — missing, corrupt, `"yes"`, `1` — reads as
off, the spelling discipline `setBusHold` and the ledger's `gap` already follow.

**`src/lib/settings/feedback-settings.ts` reads the setting at the moment of the
buzz** rather than taking it as a prop. A flag plumbed from the page root goes
stale, and a stale copy is a phone still buzzing just after somebody turned it
off — which is the exact moment they are watching to see whether it worked.

**`pace-header-theme-v1` is the app's header colour, and it replaced five
places that each decided one.** Curtis: *"B is fine all same color until I
figure out a more solid color scheme because I do want to add some flare to
it. Why is this not an option to color the headers differently in settings?"*

It partly was, which is the whole problem. Three of the eight headers were
already settable — the Facility Map through `--header-bg`, the Defect Log and
Fixed Repairs through `--log-header` and `--fixed-header` — but through TWO
page-level theme systems built when every page had its own gear, and the other
five had the colour typed into a stylesheet. Nothing anywhere said what the
APP's colour was. Measured before this: five different navies, two gradient
angles, and flat against gradient.

**ONE SHARED COLOUR AND A PER-PAGE OVERRIDE**, which is what was chosen when
asked. Incidents' red and Shop Talk's green are gone from the default and are
one override away. `src/lib/settings/header-theme.ts` owns it and
`src/components/shared/header-theme-live.tsx` paints it, mounted ONCE in the
root layout and following the route — the alternative is threading one value
through eight pages that have nothing else in common, where a page that forgot
to thread it keeps its old hard-coded colour silently, which is the bug this
exists to remove. **Every header rule reads `--app-header-fill` with the APP'S
DEFAULT as the fallback**, not that page's old colour. It WAS the old colour,
on the reasoning that a render before this component has run should look like
the app did — and this paints from an effect, so the browser has already drawn
the server's HTML by then. Measured: Incidents came up rust and turned navy
37ms later, Shop Talk came up green. Both are meant to be navy now, so the
honest fallback is the colour the page will settle on.

The Facility Map was missed by that first pass, because its fallback ran
through `--header-bg`, whose own literal is the OLD `#06275c`: measured, it
held that for 116ms while the other seven changed colour not at all, and with
JavaScript off the eight drew two different navies. The lesson is the one this
project keeps relearning — a fallback through a variable is a fallback to
whatever that variable's literal is, and nobody looks at it. The Defect Log
and Fixed Repairs still name their own page variable, which React writes
inline; that is NOT "correct without JavaScript", because the server cannot
read LocalStorage and writes the hook's default, which is the app default
again. All eight open on one colour.

**A PAGE THEME IS THE MIDDLE RUNG, and that was learned by measuring.** The
Facility Map, the Defect Log and Fixed Repairs each offer Terminal, Black,
Midnight and Tactical, in which the header colour is one member of a page-wide
palette. Handing them the shared colour unconditionally was built first and
measured at 430 on Tactical: a navy header block with the olive page starting
at its bottom edge in a hard line, and the active nav tile still olive because
it is keyed to the page's surface. Two apps stacked. So `resolveHeaderColor`
is a three-rung ladder — **an override typed for this surface, then a
non-default page theme, then the shared colour**. On the default theme, which
is every device that has not opened those panels, all eight match; on a theme
the page stays whole; and an override still wins over both, so Settings is
never describing something a page will not do.

**It asks whether the header COLOUR differs, not whether the theme NAME does**,
and that distinction is the whole usefulness of the rung. `custom` is not a
look somebody picked: both appearance panels set it when ANY colour in them
changes, including one bus status colour or one section background. Read as a
name, it took the Facility Map out of the shared setting on every device that
had ever nudged a status colour — with the Settings row reporting *"its page
theme decides this"* about a header nobody had chosen. `pageThemeHeader` in
`src/lib/settings/page-header-themes.ts` is the one function all three callers
use, so the module and the two pages cannot read one record and disagree: the
theme TABLE answers first (the name is the fact, the stored palette is a copy
of it, and a record can carry the name without the palette), the palette
answers for `custom`, and a colour equal to that page's own default answers
nothing at all.

**THE INK COMES OFF THE SAME RUNG AS THE COLOUR**, and that is a correction.
It shipped computing black-or-white for all eight headers, so Terminal's green
`#61ff9d` and Tactical's `#e7ddb2` came out white on the three pages a theme
decides. Curtis: *"Why did we have to change a theme?? The tactical theme.
Themes should not be affected by default design."* He is right — a page theme
is a designed pairing of a background and an ink, and taking half of it is not
honouring it.

So `resolveHeaderInk` walks the same ladder `resolveHeaderColor` does: an
override typed for this surface is **computed**, a non-default page theme keeps
**its own ink**, and the shared colour is **computed**. Rungs 1 and 3 are
computed because those colours came out of a picker with no ink attached, and
"white on a dark header" stops being true the moment somebody picks a pale one.
The gate on rung 2 is the same `isHeaderColor(pageTheme)` expression the colour
uses, so the two cannot come off different rungs; `pageThemeHeaderPair` returns
the background and the ink as ONE value for the same reason. A theme with no
ink of its own — `custom` on a device that stored a header colour and no header
text — falls through to the computed one, because there is no pairing there.

Measured at 1180: on Tactical the map header draws `#e7ddb2` and the Defect Log
and Fixed Repairs `#f4e8b8`, their own; on the default theme all eight are white
on navy; and with an override typed for the map and the Defect Log those two
take the picked colour with BLACK computed on it while Fixed Repairs keeps
Tactical's khaki. The Settings panel's contrast note is scored against the ink
that will actually be drawn, not the one it would have computed.

**An accent is not a header.** `--log-accent-text` exists because
`--log-header-text` was doing both jobs: harmless while it came from the page's
theme, and not harmless once it became the HEADER's computed ink — picking a
pale header colour turned PATH TO REPAIR's heading, its buttons and the
time-window chip black on the accent blue, measured 3.57:1, on surfaces that
are not headers. An ink is computed for the surface it sits on or it is a
guess.

**The text colour is COMPUTED, never stored, and it is pure black or white.**
The moment a background can be picked, "white on a dark header" is a trap: a
light flare colour takes the page title with it. Whichever of the two reads
better wins. It was a softer `#0b1b33` first; swept over the whole colour cube
that bottoms out at 4.15:1, under AA on backgrounds the picker hands out,
while `#000` floors at 4.58:1 because the two options bracket every background
between them.

**It is scored against BOTH ENDS OF THE GRADIENT**, which the first version
did not do: the picked colour is only the bar's LEFT edge, and against the far
end the cube floor was 3.37:1 while the function reported 4.58 and the Settings
panel printed it. `headerContrast` is what the panel quotes and what the test
sweeps. A gradient costs contrast at its far end and no lift avoids it — over
the cube the floor is 3.86 at a 16% lift, **4.12 at 10%**, 4.39 at 4%, and
4.58 only with no gradient at all — so the lift is 10% and the floor is
written down rather than rounded up to a promise. The page title is 25px bold,
which needs 3.0 for AA.

**The gradient is 90deg, and that is not an angle the app used** — the
literals it replaces were 110deg on two pages, 120deg on one and a vertical
`linear-gradient(#0a326e,#041d47)` on the map, so there was none to preserve.
A tilted gradient is height-dependent, and the Facility Map's header bar and
the phone nav flush beneath it are two boxes of the same width and different
heights that have always read as one block. Measured at 110deg: a 4-to-6 per
channel step across that boundary, where the flat colour they shared before
had none. At 90deg it is zero. **Both stops are plain hex**, computed in
`headerStops` rather than left to CSS `color-mix`, so the colour the browser
paints is the colour `headerTextFor` scored.

Per device and never synced, like every appearance setting here: it describes
what one person likes looking at, and a synced colour scheme repaints somebody
else's phone mid-shift.

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

**OLD SHEETS COME IN THROUGH `src/lib/down-sheet/sheet-ledger-backfill.ts`**, behind LOAD OLD
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

**`pace-incidents-v1` and `pace-shop-talk-v1` are about PEOPLE AND PLACES, not
buses.** Added the night Curtis slipped on oil in the shop. A defect is attached
to a fleet number; the oil was on the floor and belonged to no bus, so filing it
against one would have buried a safety record in a maintenance history. Curtis:
*"you're right it doesn't belong in defect"*.

**The only required field on an incident is WHAT HAPPENED.** Curtis asked for it
in those words — *"don't make any of the fields except for the ones that matter
mandatory to save the incident"* — and the reason outlasts the convenience: the
incident most worth having is filed by somebody shaken, sore, or halfway out the
door. A form that refuses to save over an empty witness box does not collect a
better report, it collects no report. `care:""` is *not recorded* and is
deliberately distinct from `"none"`; reading a blank box as "no treatment
needed" would have the app inventing a medical fact.

**The time it HAPPENED is editable and the time it was FILED is not.** Reports
get written an hour later or the next morning, and the gap between the two is
itself a fact about how one came to exist. An edit keeps the record and its
filing stamp — a correction to an incident is still that incident.

**The shift is resolved once and STORED**, the rule `pace-sheet-ledger-v1`
follows: if somebody edits the garage's hours in six weeks, the shift a fall
happened on must not migrate to another crew. It is resolved from when it
HAPPENED, not when it was filed, so a fall at 23:50 written up at 00:20 belongs
to the night crew who were on the floor.

**INCIDENTS IS DEVICE-LOCAL AND NEVER SYNCS**, for the reason a HOLD is: it
names a person and an injury, and this app has no login, so a synced incident
would put "who got hurt and how" on every phone with nothing deciding who may
read it. Curtis chose that when asked. Sharing one is a deliberate act, and the
screen says the app does not report it for anybody.

**SHOP TALK is the cheap version of an incident.** A hazard posted and cleared
is an incident that never had to be filed, which is why open hazards sort above
everything and stay visible until somebody marks them handled. Nothing is
deleted — "the oil in bay 7 was reported four times this month" is a fact that
only exists if the first three are kept. The count on the board itself is OPEN
HAZARDS only, because a count that includes suggestions stops meaning "go look
now". **There is no nav badge** — `TrackerNav` draws labels and nothing else.
An earlier version of this paragraph said there was one, in the same change
that added the surface and did not build it; a badge on every page is a UI
change and therefore Curtis's call before it exists, not after.
Its not syncing is a limitation rather than a decision: carrying it would need
the `shop_memory` migration, which is Curtis's call. **MASTER EXPORT does not
carry `pace-shop-talk-v1` or `pace-incidents-v1` either** — `fleet-backup.ts`
names its keys explicitly and neither is in the list, so a device move loses
both. The Shop Talk screen used to claim the export carried it; it no longer
does. Whether these two should ride that file is open: the argument for is the
one PATH TO REPAIR won on — a hazard board does not re-learn itself — and the
argument against, for incidents only, is that the file would then carry who
got hurt onto another phone, which is the reason the surface does not sync.

**Both draw their location list from `site-config.ts`**, never a prefix and
never a hand-typed list — a sixth copy of that table would bring back the bug
that named all 84 garage spaces "Main Garage". A bus, when one is involved, is
remembered by FLEET NUMBER, never by a device-local id.

**`pace-ptr-v1` is PATH TO REPAIR, and it is keyed to the REPAIR rather than
to the defect.** Curtis: *"basically steps, general steps to point people in the
right direction of how to get it repaired"* — refer to Cummins INSIGHT, check
the oil first, look for corrosion behind the AC filters. Not a diagnosis and
not a procedure: *"that's gonna be a different app"*.

Asked what a writeup should attach to, he chose the repair. One written for
`A/C and HVAC — No cooling` shows on **every bus that ever gets that fault**.
Keyed per defect instance it would be retyped on every bus and would never
become the library he described — *"as repairs become consistent, I'm gonna
give you something where we can have a drop-down"*.

**The key resolves through `migrateRepairIdentity`**, the same function every
stored defect is read through, so a catalog rename moves a defect and its
writeup together. Keyed on raw wording instead, a PTR written under
`Air System — Leak` would still be in storage after the rename to
`Pneumatic System` and would simply never match again — the failure would be
silent, which is the whole reason the key is computed rather than stored raw.

**Saving an empty writeup REMOVES it**, and there is no separate delete. The
rule that this app never deletes history is about defects and the work done on
them; a cleared PTR is somebody saying the advice was wrong.

**It does not SYNC, and that is a limitation rather than a decision.**
The two memories beside it travel through `shop_memory`, which is constrained to
`kind in ('part','finding')` — carrying PTR would need a schema migration, which
is a write to the live database and therefore Curtis's call. The screen says so
where it is written, rather than letting somebody assume the shop can see it.

**MASTER EXPORT carries it, and is the only thing that does.** It was left out
of the backup for the two releases it had existed — an oversight, found by
reading the payload against the key list while planning a device move that would
have dropped every writeup on the floor. Being device-local is not what keeps a
key out of that file: `fleet-backup.ts` says in its own words that a device
CLONE already carries five keys that are per-device and never synced. A part
number re-learns itself the next time somebody types it; a writeup does not.

**`pace-repair-hours-v1` is a LEDGER, not a learner.** Curtis, after being
offered a version that watches completed work and averages its way to a figure:
*"if that's some type of like adaptive strategy, we can hold off on it as long
as a person can change the repair times then and then it updates ... that's not
necessarily an adaptive strategy, but that's more like a fixed ledger."*

Somebody sets a number; that number is the estimate for that repair everywhere
until somebody changes it, and it never moves on its own. Nothing averages,
nothing decays, and when a figure looks wrong there is one place it came from
and one person who put it there. The adaptive version stays parked by his
decision, and this is the thing it would have to beat.

**Four sources, most specific first**, in `src/lib/defects/defect-estimates.ts`:
**ESTIMATED TIME OF REPAIR** typed on this defect, then the billable hours typed
on it, then this ledger, then the catalog's own estimate. The catalog is last
because it is a guess made by somebody who has never stood in this garage.

**`estimateHours` ON THE DEFECT IS NOT ONE OF THE BILLABLE HOURS BESIDE IT**, and
that is why it is its own field rather than a relabelled one. `repairHours` and
`diagnosticHours` are time WORKED — `src/lib/reports/work-time.ts` sums them per
person per day — so an estimate written into either would land on somebody's
work ledger as hours they never spent. It sits ABOVE them in the ladder because
it is the only one of the four that answers the question being asked; the two
only ever meet on a job that is part-billed and still open, since a completed
repair adds nothing to the badge at all.

**THE DEFECT LOG'S BOX OWNS IT, AND THE SHEET'S BOXES OWN THE SHEET'S.** One
direction: a Down Sheet card BUILT from an estimated defect is seeded from it
through `estimateFromHours` rather than from the catalog, at both places a card
is built from a record. Nothing carries a sheet figure back onto the defect.

**It was bidirectional for one commit, and a cold read measured what that
does.** Type 6 in the Defect Log on a bus already on the sheet, then clear it:
the card still holds the 360 minutes it was seeded with, so the next save of
that row — changing the mechanic, ticking a card, anything — reads 360, finds it
is not the catalog's 720, and writes the 6 straight back on. A cleared estimate
that returns is the bug `workStates` and `downSheetRecommendation` are deleted
rather than blanked to avoid. `{...linked}` in `applyDownEntryToFleet` keeps
whatever the record holds, which is all that is wanted.

**So an estimate already on the sheet is changed on the sheet.** The Defect
Log's badge and a sheet row can therefore quote different figures for the same
repair when the entry already existed — the sheet seeds only at creation. That
is a known limit, not a claim to the contrary.

**The Defect Log's WHAT WAS FOUND box MOVED to ADVANCED DETAILS.** Curtis:
*"where it says optional what was found replace this with estimated time of
repair ... We have " description above, so it kind of redundant."* The estimate
has that slot; the finding box sits beside DIAGNOSIS / TEST / VERIFICATION,
which is what it answers, and a record carrying a finding opens that section so
it can be read. That form's DESCRIPTION is **ADDITIONAL DETAILS**.

**Taking it off the page altogether was the first version, and it broke the
open-defect case.** The Down Sheet's own finding box is inside
`{item.done && …}` and Fixed Repairs lists completed repairs only, so an OPEN
defect had nowhere left in the app to type a cause, read one already stored, or
clear it — with the DIAGNOSED work state still on the form and nothing to say
what was diagnosed. The FOUND BEFORE chips moved with the box, so
`pace-findings-memory-v1` is offered on all three surfaces again.

**AN UNFINISHED DOWN SHEET CARD HAS NO OPINION ABOUT WHAT WAS DONE**, and that
was a fix. `applyDownEntryToFleet` wrote `clean(target.actionTaken)||linked?.…`
and its three neighbours for every card, finished or not, so a card still
holding an old wording restored it onto the record on the next save of that
row — and a finding or a figure cleared in the Defect Log came straight back.
Everything the sheet collects about finished work sits in ONE `{item.done && …}`
block in the editor — FIX / STEPS TAKEN, WHAT WAS FOUND, REPAIR HOURS and
DIAGNOSTIC HOURS — so all four carry the same staleness and all four are now
gated on the repair being completed. The card keeps its own copies; re-ticking
it speaks for the sheet again.

The gate is `target.done||entryCompleted`, which is **wider than the box**:
setting the whole ENTRY to Completed without ticking a card still writes that
card's stored values. Deliberate — marking the entry complete is a statement
that the work is done, and the card's text is the only account of it there
is — and the alternative loses fix details on every entry somebody completes
without ticking each card first, which is the commoner gesture.

**Keyed per SPECIFIC REPAIR, not per category**, through the same
`repairIdentityKey` PATH TO REPAIR uses — one function, so a writeup and a time
set on the same screen cannot end up filed under different names. *All Brakes =
2h* would price a chamber leak and a full reline the same, and the catalog it
overrides already distinguishes them. A category-level default is a coarser
thing that can sit on top of this later.

**Stored as MINUTES, typed as HOURS.** Every estimate in this app is in minutes;
a mechanic writes `.5`. Converting once, through the same `normalizeRepairHours`
the defect editor uses, keeps one unit in the data and one in the hand.

**An empty box REMOVES the entry** and the catalog estimate comes back.
Withdrawing a claim is the same gesture as never having made one.

**It rides MASTER EXPORT, alongside PATH TO REPAIR**, and like it was missing
from the backup for its first two releases. `tests/storage.test.mjs` now reads
both sides of that file out of the source and asserts they name the same set of
keys, so the next one added to the export and forgotten in the restore — or the
other way round — fails there rather than two releases later on somebody's new
phone. A whole-app import REPLACES both, which is the rule everything in that
file follows except the swap ledger: a swap is an event two devices never both
perform, while a repair time is a current statement about a repair that two
devices can disagree about, and a merge would have no honest way to pick.

**`pace-crash-report-v1` is a breadcrumb, not a log.** One record, overwritten
each time. A render error unmounts the whole tree, and saved to a home screen
there is no address bar, no reload button and no pull-to-refresh — so the app
does not misbehave, it VANISHES, and the person holding the phone has no
console to check and no way back in. `app/_components/crash-guard.tsx` catches it, shows a
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
`src/lib/settings/roles.ts` and any device holding the old pairing reads as "not set" until
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
Until the login exists, nothing outside `src/lib/settings/roles.ts` may read it, and a test
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
`src/lib/fleet/tech-services.ts`.** Curtis: *"now the Ventura and the fare boxes have been
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
and are not — they are CustomEvent names. **`pace-header-theme-v1` is BOTH**:
the storage key, and the name Settings dispatches on `window` so the page it
is on repaints without waiting for a `storage` event, which only ever fires
in the OTHER tabs. One name for one thing changing, deliberately.

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
npm test          # builds, then runs every file in tests/
npm run lint
npm run build
```

**A COLD READ of the diff, before any push that carries a code change.** One
subagent, handed the diff and the question and never your reasoning — a
reviewer given your conclusion returns it to you agreed with. Read the whole
change against `main`, not the last commit: two of the defects this has caught
were invisible in a single-commit diff. **Every finding gets answered** — fixed
in a named commit, or declined with the reason on the record — because a pass
nobody must answer is not a gate. It does not replace the three above or your
own reading, and it is never the sole witness to a claim. The mirror push
carries no diff of its own and needs none. Why this is a gate, and what it has
caught: `.claude/skills/fresh-context-review`.

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
app/                                 what Next routes, and nothing else:
                                     six page.tsx, layout.tsx, api/, the
                                     stylesheets, and _components/ per route
src/lib/<area>/                      the domain: .ts, no JSX, storage passed in
src/components/<area>/               React drawn by more than one route
app/<route>/_components/             React drawn by exactly one route

src/lib/fleet/bus-hold.ts            HOLD THIS BUS: the field, what lifts it, the held list
src/lib/fleet/location-label.ts      slot id -> the words a person says, trouble bays included
src/lib/defects/repair-catalog.ts    the defect catalog, rename maps, count fields
src/lib/storage/section-transfer.ts  per-section device transfers and their merge rules
src/lib/storage/storage.ts           storage keys, envelopes, recovery snapshots
app/globals.css                      the whole facility map, all breakpoints
src/lib/cloud/cloud-sync.ts          row shapes, fingerprints, the tombstone ledgers
src/lib/cloud/cloud-client.ts        the Supabase calls, and how a push is planned
src/lib/cloud/cloud-live.ts          the one set of merge rules a pull is applied through
docs/ARCHITECTURE.md                 the layout above, and the rule for what goes where
docs/NEXT_SESSION.md                 start here: state, queue, Codex workflow, traps
docs/PUBLISH_NEXT.md                 the standing Codex handoff
docs/roadmap/                        work that is designed but not built
supabase/                            the cloud schema — APPLIED, and the shop is using it
supabase/run-tests.sh                applies the migrations to a throwaway Postgres
PROJECT_HANDOFF.md                   domain ownership and surface-by-surface detail
```

**Where a new file goes.** A `.ts` module with no JSX is domain and belongs in
`src/lib/<area>/`. A component two or more pages draw belongs in
`src/components/<area>/`. A component exactly one page draws belongs in that
page's `_components/` — the underscore is what stops Next routing it. `app/`
takes routing files only. Cross-area imports go through the `@/*` alias
(`@/src/lib/fleet/smart-status`); inside `src/lib` they stay relative, because
the Node test runner resolves neither tsconfig paths nor the alias. See
`docs/ARCHITECTURE.md`.

The Supabase project is live and holds the shop's real records. Reading it to
diagnose something is fine and has been useful. **Writing to it is Curtis's
call, every time — ask first.** The project ref is deliberately not in this
repository.
