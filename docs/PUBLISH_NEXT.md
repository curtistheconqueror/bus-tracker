# Publish next

**STATUS: 194 PENDING.** Scrolling the Facility Map on a phone no longer moves
buses — a bus follows a finger only after the finger has been held on it. Also
in 194: Escape closes the map's SETTINGS, MULTI-LOCATE, MOVE BUS HERE, REMOVE
BUS and AI OPERATOR layers, each of which fixes the page behind it;
**one SOUND & VIBRATION switch in Settings, OFF**, with a test that stops
anything audible being added later without going through it; an optional
**ESCAPE CLOSES THE BUS EDITOR**, also off; a re-report counted and SHOWN
where it happens; and **one HEADER COLOUR for all eight pages, set in
Settings**, with a per-page override — replacing five stylesheets and two page
themes that each decided one; and **ESTIMATED TIME OF REPAIR on the Defect Log
form**, where it used to ask what was found, with DESCRIPTION renamed ADDITIONAL
DETAILS and the finding box moved into ADVANCED DETAILS. Page themes keep their
own header ink, which this release had taken off them. **Fixed Repairs narrows
by WHEN IT WAS FIXED** — ALL, THIS SHIFT, TODAY, 24H, 3 DAYS, 7 DAYS, 30 DAYS —
and offers COPY, SHARE and SHARE PAGE over exactly the repairs on screen, with
its scope bar now naming what the CATEGORY held back as well. The Defect Log's
own WHEN LOGGED drop-down gains **LAST 30 DAYS**, so both screens draw one
window list, and on either screen a window the clock cannot resolve now says so
instead of quietly showing every date. One new repair:
**Tech Services → IBS Screen → Run box no display**, which the AI operator also
answers to as just "run box". And one bug found by a cold read of that entry:
writing up an IBS screen fault on a bus with the IBS/VENTRA flag ticked
**removed that bus from the Fleet Status Report**, in every output format —
fixed, with the measured table held by a test. **PATH TO REPAIR is reachable
from Fixed Repairs** as well as the Defect Log's focus view, which puts a fourth
button on each history card and takes that row to 2x2 on a phone. A finding
cleared on an open defect no longer comes back from the next Down Sheet save.
And **the screen no longer zooms itself on a phone** — four forms had text
fields under 16px, which is what iOS zooms for and never undoes. **The bus
quick view is a glance again**: 829 characters of free text in a card whose top
sat 227px off the screen, now a count, three names and "+9 more", measured and
placed rather than guessed. **The BUS GENERATIONS chips are sized for their
labels** — 177px each down to 64px, one row at every width, flush right. The
**+ LOG DEFECT form had stopped opening at all** since the PATH TO REPAIR
extraction, past four green gates, and `tsc`'s TS2304 is now one of them. And
an optional **STEP-BY-STEP HELPER ON THE DEFECT FORM**, off by default, which
rings the next field and says what it wants without ever blocking a save.
Two fixes off a sheet Curtis photographed: **a line naming several buses no
longer loses what it says** — the scan prompt contradicted itself about IDOT
rows, threw away the per-bus state written in brackets, and let a misread line
number file a bus under another line's work — and **a completed repair stays
completed** instead of re-opening under a new id on the next Down Sheet load.
Queued by Claude Code; not published, not tagged, not deployed. PR39 MCP
remains separately held and unmerged.

Application release 193 is live as Sites version 189 from
`a009c08fad02aa6859ec6445784f744c6e269c8d`, deployed 2026-10-25 at
21:45:24.014279 UTC to the existing public
[Fleet Step site](https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site).

ADVANCED ACTIONS drawers use the Defect Log header's navy and the Down Sheet
button's purple. Both openers are taller and DAILY STATS has a larger,
accent-edged bar. Service-worker v7 is unchanged; no cache bump was made.
No markup, application logic, storage, dependency, Supabase, credential,
permission or runtime configuration change is part of 193.

Local and exact-source CI lint/build/388 tests passed; an independent cold read
found no actionable defect. Eight live routes and 40 asset byte comparisons
passed. Delivered CSS contracts matched the two drawer colours, transparent
inner bodies, larger openers and taller DAILY STATS. These checks do not
establish computed styles or visual interaction on an actual device.

Manual checks still needed: open both drawers, inspect their card controls,
DAILY STATS and dark Defect Log themes, then confirm one-line Down Sheet
ADVANCED ACTIONS and no horizontal scroll on the shop computer/iPad.
Phone/Safari/Home Screen, focus/contrast and offline-device checks were not
performed here. The pre-existing generated Defect Log preload 404 remains;
the actual manifest assets passed byte comparison.

Rollback: application 192 / Sites 188, source
`2ddc026c139c45acec7c24128633841d96e7dee3` (`sites-v188`).
See [release evidence](RELEASES.md) and [193 handoff](archive/PUBLISH_RELEASE_193.md).
Later documentation-only commits were preserved on main. PR39 remains separate.

---

Everything above this line is **release 193, already live** — Codex's own
record of it, kept because it is the baseline 194 is measured against.

**Note the rollback line in it is 193's, not 194's.** For 194 the rollback
target is **application 193 / Sites 189, source
`a009c08fad02aa6859ec6445784f744c6e269c8d`** — the version running right now.

What follows is the pending work.

---

## 194 — a bus follows a finger only after the finger has been held, and one header colour

### Source

Codex published 193 from `a009c08` mid-session, so **this range starts there**
and 194 was rebased onto that work rather than merged over it. Release source
is the commit this file is updated in.

**EVERY COMMAND BELOW WAS RE-RUN AT THE COMMIT BELOW THE ONE THIS FILE IS
UPDATED IN**, which is as fresh as a quoted output in this file can be: the
commit that carries these lines does not exist while they are being written. An
earlier draft said "at the top of the range" and was then one commit stale on
the insertion count, which a cold read caught. An earlier draft than that
quoted outputs from five commits in, which is how it came to say the service
worker was untouched when it is not — see the end of this section. A quoted
command output is a measurement and goes stale like one.

```
$ git log --oneline a009c08..HEAD
0e27216 A step-by-step helper on the defect form, off until somebody turns it on
1269097 Size the bus generation chips for their label instead of for the box
2df4f73 Fix the Defect Log form, which has not opened since the PATH TO REPAIR extraction
c8f1aae Answer the cold read: the card still ran off the top on every real tap
7dfe835 The bus quick view is a glance again, not a transcript
97ce8f2 Queue the iOS zoom fix in 194
a9eafb7 Answer the cold read: the 16px fix clipped a control, and its gate was a split
0526ac6 Stop iOS zooming the page: no text field under 16px in the flows that had one
5653a27 Record what the cold read found in the PATH TO REPAIR work
3c5c59b Answer the cold read: a themed ink on a white card, and a phone layout I said was unchanged
eda9740 Queue the PATH TO REPAIR door and the finding fix in 194
ec679d2 PATH TO REPAIR is one component now, and Fixed Repairs opens it too
bf3b03f An unfinished Down Sheet card has no opinion about what was found
5dfd929 Queue today's three changes in 194, and correct what the handoff claimed
ba05e2a Answer the cold read: the Status Report never showed IBS, and an IBS defect hid the bus
5f4f370 One window list for both screens, and a scope bar that names every filter
5c618f9 Give bare "run box" a way in, and a rule that drops it when it stops being one repair
3cf8f68 Queue RUN BOX NO DISPLAY in 194, and re-run the handoff's blocks
ae31482 Add RUN BOX NO DISPLAY to Tech Services, under the IBS Screen
2a25591 Answer the cold read: the scope bar blamed the category on the window
8dc00f8 Write down the two constraints, and stop hard-coding whose garage this is
926537f Record the Fixed Repairs window and the PATH TO REPAIR gap
fd960ad Window and share the Fixed Repairs history, the way the Defect Log does
5a530f1 Answer the second cold read: the ink fix made white on white reachable
606c8e9 Re-run the handoff's command blocks, two commits after they were quoted
6f3cf22 Give a page theme its own header ink back, and answer the cold read
ac254f1 Queue the estimate field in 194, and correct what the handoff claimed
52609f2 Ask how long the repair takes where the form asked what was found
9c83c37 Re-run the handoff's own commands, and the service worker is not untouched
a1a42bd Answer the cold read: minimal is not the same as unmeasured
564ed82 Draw the header panel as little as it can be drawn as
6a5aa09 Answer the cold read: the headers' backgrounds moved and their ink did not
2df13f5 Say what the header fallbacks actually do
ab99278 One header colour for the whole app, set in Settings
5f2c66e Answer the cold read: the contrast fix broke three of the four themes
e91cf84 Answer the cold read: the cancel button marked the repair complete
821fd7e Make a re-report visible, and fix the OPEN IT that never opened anything
2f04c6a Answer the cold read: the dirty check was promising what it did not do
2bc575c One sound switch, and Escape in the bus editor as an option that starts off
9f2b516 Answer the cold read: a layout that was broken, and a gate that overclaimed
b29fb4b Sound and vibration off by default, and a gate they cannot be added around
8f96400 Correct the claims a third read found false
2b0af96 Answer the cold read: revert the service worker, narrow Escape
70ce29d Give the map an Escape, and stop one bad fetch losing the offline shell
725b494 Queue application release 194 on top of Codex's published 193
033cb98 Every finding from the cold read, and five of six were mine
b44f370 Make a bus wait for a held finger before it follows one
8280d61 Record application release 193 live as Sites version 189
6681407 A cold read of the diff before every code push
b387c33 Queue application release 193 from the reviewed PR41 merge
```

```
$ git diff --name-only a009c08..HEAD -- app src
app/defect-log/_components/form-coach-bar.tsx
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
app/fixed-repairs/fixed-repairs.css
app/fixed-repairs/page.tsx
app/globals.css
app/incidents/incidents.css
app/layout.tsx
app/lists/lists.css
app/page.tsx
app/settings/_components/defect-log-settings-modal.tsx
app/settings/_components/map-settings-panel.tsx
app/settings/page.tsx
app/settings/settings.css
app/shop-talk/shop-talk.css
src/components/defects/path-to-repair-panel.css
src/components/defects/path-to-repair-panel.tsx
src/components/settings/fixed-repairs-settings.tsx
src/components/settings/section-transfer-controls.tsx
src/components/shared/bus-selector.css
src/components/shared/bus-selector.tsx
src/components/shared/combo-field.tsx
src/components/shared/header-theme-live.tsx
src/lib/defects/bus-share.ts
src/lib/defects/defect-estimates.ts
src/lib/defects/defect-log-display-settings.ts
src/lib/defects/defect-log-sync.ts
src/lib/defects/duplicate-defects.ts
src/lib/defects/feed-window.ts
src/lib/defects/fixed-share.ts
src/lib/defects/form-coach.ts
src/lib/defects/quick-filter-share.ts
src/lib/defects/repair-catalog.ts
src/lib/defects/report-returns.ts
src/lib/down-sheet/down-sheet-share.ts
src/lib/down-sheet/down-sheet-sync.ts
src/lib/down-sheet/repair-time-estimates.ts
src/lib/fleet/quick-view-position.ts
src/lib/operator/operator-engine.ts
src/lib/reports/fleet-status-report-print.ts
src/lib/reports/fleet-status-report.ts
src/lib/settings/coach-settings.ts
src/lib/settings/feedback-settings.ts
src/lib/settings/header-theme.ts
src/lib/settings/map-settings.ts
src/lib/settings/page-header-themes.ts
src/lib/settings/site-identity.ts
```

```
$ git diff --shortstat a009c08..HEAD
 68 files changed, 10084 insertions(+), 458 deletions(-)
```

### What this release touches outside `app/` and `src/`

```
$ git diff --name-only a009c08..HEAD -- supabase package.json package-lock.json .github public worker
public/sw.js
```

**It does NOT come back empty, and an earlier draft said it did.** No schema,
no dependency, no workflow, no worker — but `public/sw.js` is in the range.

**The change to it is 22 lines and every one is inside a comment block.**
Verified by stripping comments and whitespace from both versions and
comparing: the code is byte-identical, `CACHE_NAME` is unchanged, and the
comment is the record of why the `Promise.all` in `install` must stay
all-or-nothing (a softened version was built, measured and reverted — see
*The service worker is unchanged, and that is the finding* below).

**A service worker reinstalls on ANY byte change to its script, comments
included.** 4023 bytes to 5454. So on the first load after this publishes,
every device will re-run `install`, re-fetch the core pages into the SAME
`CACHE_NAME`, and activate. That is the normal path, it is atomic, and
`activate` keeps the cache rather than clearing it — nothing is lost and the
app works offline throughout. But it IS one shell re-download per device on
publish day, and the previous wording promised the opposite.

### Migrations

**None.** No schema change, no policy change, nothing executed against the live
project. The one file outside `app/` and `src/` in this range is
`public/sw.js`, changed by 22 lines of comment and no code — see **Source**
for what that does and does not mean. **No key renamed** — the gesture, Escape
and re-report work touches no settings file at all, and the three settings this
release adds are per-device preferences.

**ONE FIELD IS ADDED TO THE FLEET'S OWN RECORDS**, and an earlier draft of this
section said nothing in them was written. `estimateHours` is a new optional
field on a defect in `pace-board-v1` — ESTIMATED TIME OF REPAIR, written only
where somebody types one. **No migration and no schema change**: a record
written before this release has no such field and reads exactly as it did, and
the Shop Cloud carries it without a database change because `defectRow` puts
everything outside its nine named columns into `detail` and the pull spreads
`detail` back. Nothing on disk is rewritten, nothing is renamed and no existing
field changes meaning — in particular `repairHours` and `diagnosticHours` stay
what they were, billable time that `work-time.ts` sums, which is why the
estimate is not one of them.

**ONE NEW LOCALSTORAGE KEY: `pace-header-theme-v1`**, holding the app's header
colour and any per-page override. Added, never renamed, and documented in
`CLAUDE.md` alongside the rest — a test fails if a key exists in the code and
not in that list. A device that has never opened Settings holds nothing under
it and draws exactly what it drew before.

`pace-defect-log-settings-v1` and `pace-board-settings-v1` are now READ by
`src/lib/settings/page-header-themes.ts`, which writes neither. Those pages
keep owning them.

### What was wrong

Curtis: *"when I'm scrolling up and down the facility map on my phone I noticed
that I could just swipe and swipe and I accidentally move a bus, it keeps
happening... when you're moving up and down on the screen, you're gonna be
moving buses all over the place."*

Measured in Chromium at 390px before the change: **a plain swipe up starting on
a bus scrolled the page zero pixels and carried bus 6006 from garage-6 to
wall-7.** Not an occasional misfire — every scroll attempt that began on a bus
was a move, and the Facility Map is 4366px tall at that width, so a bus token is
most of what sits under a thumb.

Two rules compounded, and **both arrived in this repository's first commit.**
`bc76850` — the squashed Version 177 import — is the only commit that has ever
touched either, so nothing "updated" this and there is no recorded reason;
the history before 177 is not in this repository. What the code shows is that
HTML5 drag-and-drop does not fire on touch at all (`onDragStart` bails outright
when the pointer is a finger), so the touch drag is a hand-rolled substitute,
and `touch-action:none` plus a 7px distance test is the cheapest way to build
one. That assumes a finger landing on a bus means business — true on a desktop
map, false on a phone.

Two tests were holding it in place, both bare one-line pins with no reason
recorded beside either: the 7px test, and `touch-action:none`.

### What changed

| | before | now |
| --- | --- | --- |
| finger on a bus, swipe | the bus moves, page does not scroll | the page scrolls |
| finger held 0.4s, then drag | identical to a swipe | the bus lifts with a ring and moves |
| hold, then lift in place | — | the quick view, bus unmoved |
| single tap / double tap | quick view / editor | unchanged |
| dragging with a mouse | HTML5 drag | unchanged |

`.token` takes `touch-action:manipulation`, so panning passes through to the
page while double-tap zoom stays off — double tap is the editor gesture. A bus
arms after **400ms** of the finger staying put, in a named constant, and says so
with a ring and a short buzz where the device offers one. Movement before that
fires is a scroll and gives up on the drag.

Only a non-passive `touchmove` listener can cancel a scroll: a pointermove
`preventDefault` does not, and React registers touchmove passively at the root.
**The hold is what makes that work rather than just what makes it deliberate** —
a gesture the browser has already begun panning sends uncancelable touchmoves.
Every exit releases the listener, and the last finger leaving the glass releases
it too, because the cost of missing one is not a lost drag but a page that
cannot scroll.

### Escape closes a layer that locked the page

Every one of those layers fixes `document.body` while it is open, so the page
behind it cannot scroll, and none of them listened for Escape. Each already
had two ways out — its X, which is tabbable, and a backdrop tap — so this is
a third, and the point of it is that Escape is what a person's hand reaches
for.

**The BUS EDITOR is deliberately NOT on that list, and it is the one that
prompted this.** The line is not which of them holds typed work: MULTI-LOCATE
holds seven typed bus numbers and a free-text defect description, and MOVE BUS
HERE holds a typed bus number. The line is whether **one stray gesture already
discards that work**. All five close on a backdrop tap with no confirmation
today, so Escape is a second door onto a room that already had one. The editor
has no backdrop tap, so Escape there would be a NEW way to lose a half-filled
defect, an odometer reading, or an unsaved new bus that closing DELETES — and
Escape is the reflex for dismissing a dropdown, on the one machine in the shop
with a keyboard. A new destructive keystroke is Curtis's call rather than a bug
fix, so it is **asked, not assumed** — see the question at the end.

**Measured, all five** at 1180px: AI OPERATOR, SETTINGS, MULTI-LOCATE, MOVE BUS
HERE and REMOVE BUS each go from `locked:true` to `locked:false` on Escape. And
with a map modal open, an Escape still reaches the window-capture,
document-bubble and window-bubble handlers, so nothing else in the app lost its
own Escape — an earlier version of this change called `stopPropagation` on a
capture-phase window listener and silenced every one of them.

### The service worker is unchanged, and that is the finding

`public/sw.js` differs from 193 by **comments only**. It was changed in this
branch and then reverted.

The change made the install tolerate a failed page fetch. That was wrong. The
`Promise.all` over the core pages makes the install **atomic**: a rejected
fetch rejects the install, no worker activates, and `register()` runs on every
map load so the browser tries again — the worker therefore only ever activates
holding a COMPLETE shell. Softened, a worker activates holding whatever it
got, the install never re-runs (installs re-run on a script byte change and
nothing else), and `activate` keeps every cache under `CACHE_NAME` rather than
clearing it. The navigate handler is network-first and does cache each page as
somebody opens it online, so the hole heals for pages they walk to — and not
for the ones they do not, which is the entire reason the file exists. (A later
release that edits `sw.js` at all re-runs the install and heals it; one that
does not, never does.)

**One thing this does NOT cover, and it is Curtis's call.** A page that answers
with an error rather than failing to answer — a 503, a 404 mid-deploy — is
SKIPPED by `if(!page.ok)return` and the install still succeeds, so atomicity
holds for a dropped connection and not for a bad reply. The sharp end is a
captive portal: it answers **200 with a login page**, and that HTML would be
cached as a core page and served offline from then on. Pre-existing, not
introduced here, and pinned by a test so it is visible rather than assumed
away. Fixing it means failing the install on a non-ok page, which is a change
to the file that is the offline premise — so it is raised, not done.

The asymmetry with the asset loop beside it, which IS tolerant, is the point
rather than an oversight: a missing chunk is re-fetched by the page that needs
it; a missing page is a blank screen in a bay. That reasoning is now written
into the file so the next person does not re-make the same change, and
`tests/app-shell.test.mjs` executes the real worker and fails if the install
ever stops being all-or-nothing.

**No cache bump.** `CORE_PAGES` is unchanged and no CORE_FILE's contents
changed, so `CACHE_NAME` correctly stays at v7 and phones take this as an
ordinary asset change.

### Sound and vibration, off by default

Curtis: *"make sure the sound is off by default ok? Any sounds. Toggleable in
settings."*

**The app makes no sound at all, and did not when he asked.** No AudioContext,
no Audio element, no audio file in the repository, no speech synthesis. The
only thing a person could perceive without looking was the short buzz when a
bus is picked up on the Facility Map, added earlier in this same release.

So the deliverable is not an off switch for a sound that does not exist. It is
a gate a sound added in six months cannot walk around: `tests/settings.test.mjs`
walks `app/` and `src/` and fails if `navigator.vibrate`, `new Audio`,
`AudioContext`, `speechSynthesis`, an `<audio>` tag or an audio file is named
anywhere outside `src/lib/settings/feedback-settings.ts` — `public/` included,
since `sw.js` could call `showNotification`, which rings on Android.

**It is a tripwire and not a proof**, and the difference is worth stating. It
catches every ordinary way of adding a sound, including four that defeated its
first draft: `createElement("audio")`, `new window.Audio`, an aliased
`navigator`, and `Notification` — which was not in the list at all. It does not
catch `navigator["vib"+"rate"]()`, and no static token scan can. What it stops
is somebody honest adding a chime without knowing there was a rule.

Mutation-tested rather than assumed: nine ways of making a sound are each
planted in `src/` and the suite is re-run. Prose about the rule in a comment,
and a `.wav` CSS class name, must NOT trip it; `url(ding.wav)` must.

**New key `pace-feedback-settings-v1`**, per device, never synced. Two flags in
one key — a buzz is not a sound, and a loud garage is the case for vibration and
against noise. Both default off, and anything that is not EXACTLY `true` reads
as off, so a corrupt or hand-edited record cannot be what starts a phone making
noise.

**Measured in Chromium** on a device given a working `navigator.vibrate`: a
fresh phone with nothing stored holds a bus, the bus lifts with its ring, and
the vibration count is **0**. Turning VIBRATION on in Settings stores
`{"version":1,"sound":false,"vibration":true}`, and the same gesture then
counts **1**. The SOUND switch is present and unchecked on a fresh device.

**The two switches also needed a stylesheet rule of their own**, found by
measuring and not by reading. `.settings-check` is styled in two places and
neither reaches this page — `down-sheet.css` scopes its layout half to
`.down-settings-body`, `defect-log.css` to `.log-settings` — so both labels
computed `display:inline`, OVERLAPPED by 17px, and the second checkbox landed
mid-sentence inside the first one's text. One such label gets away with it,
which is why `.settings-lite-switch` beside it has no rule and looks fine.
Re-measured at 360, 390, 430 and 820: no overlap, both boxes on the left
margin, no horizontal scroll.

### Escape and the bus editor, as an option that starts off

Curtis, choosing from the three options the last release raised: *"#1 leave it
like it is but have an option setting to make this a confirm to ask before
closing if any changes was made. I may not want the close but ask all the time
because it's a friction point against speed. So optional."*

So the default is **exactly what it is today** — Escape does nothing in the bus
editor — and a switch in **SETTINGS → FACILITY MAP → TOUCH CONTROLS** turns it
on. With it on, Escape closes the editor and **asks first only if something was
changed**: looking at a bus and pressing Escape costs no extra tap, and losing
typed work always asks.

No new key. It rides `pace-board-settings-v1` beside `singleTapEmptySpaces`,
which is the same kind of setting — how input behaves on the map.

**The dirty check is taken in the editor, not on the page**, because the page
knows which layers are open and only the editor knows whether anything has been
typed into one. The fingerprint covers the three places a change can hide: the
draft bus, the hold's datetime field, and a defect part-typed but not yet
added. It is compared against what was opened rather than against the record,
so typing a number and typing it back is correctly not a change.

**Measured in Chromium**, five cases: with the setting OFF, Escape leaves the
editor open whether or not anything was typed. With it ON — nothing typed:
closes, no question. Typed then CANCEL: stays open, work intact. Typed then OK:
closes.

### One switch for sound and vibration, not two

Curtis: *"Yes sound and vibration together."* The storage still holds two
flags, so splitting them again later is a UI change rather than a migration,
but one control sets both and either one being on reads as on.

### A re-report is visible where it happens

Curtis, on the ALREADY LOGGED banner: *"pressing either the open this defect or
the button next to it, it doesn't do anything... nothing happens on the screen
so I don't know if anything happened."* And on the defect list: *"I don't see
anything saying defect reported times three or times five with the last date
reported... just a small drop-down feature, that's it."*

**OPEN IT WAS BROKEN, and it was not a perception problem.** `DefectEditor`
seeds its form from the draft with a plain `useState` and the element carried
no `key`, so when OPEN IT swapped the draft underneath it React reused the same
component and the form kept showing whatever had been typed. The record really
was un-hidden and written to the board; it simply could not reach the screen.
The same bug class as the unkeyed `<Token>` fixed earlier in this release.
Keyed by bus and defect now: a different record remounts, a keystroke does not.
Measured — OPEN IT loads the existing record's description, the banner goes
(you are no longer making a duplicate) and SAVE is live.

**+ COUNT THIS RETURN worked and said nothing.** Its only trace was an italic
number inside a yellow box — and inside the two-minute debounce it did nothing
at all, silently. Three of Curtis's screenshots a minute apart all read
`CAME BACK 1×`: that is the guard working exactly as designed and reporting
nothing. The guard stays, because one press is one return and a fumbled tap
must not inflate evidence that a repair is not working. What changed is that
the refusal has a name: the banner now says **COUNTED · REPORTED ×3, latest …** or names the refusal.
There are five refusals and each has its own words: the two-minute guard, a bus
that has left the board, a defect that is no longer on it, a board that could
not be saved, and a clock that gave an unreadable time. An earlier version
stamped "already counted a moment ago" on all of them — a false statement about
somebody's own data in four cases out of five.

**The count is on the card now.** `REPORTED ×N` — the original report plus
every return — beside OPEN, with a `LAST REPORTED` date under the logged one,
drawn only once a bus has actually come back. It reuses the amber badge the
focus view already uses for a return rather than inventing a second colour.

**And a small control to add one**, LAST in the card's action row: one tap arms
it (`TAP AGAIN TO COUNT`), a second counts it, and the button itself says
`COUNTED · REPORTED ×4`. Until now the only way to record a return was to start
logging a duplicate and press a button inside the refusal that stopped you.

**Its first version was dangerous and is worth recording.** It armed into a
span holding a label, a COUNT IT and a cancel `×` — about 130px of content in a
rail cell measured at 64–97px. The `×` overflowed and MARK FIXED, later in DOM
order, painted over it: **tapping cancel at 360 and 430 marked the repair
complete**, and at 820 and above the `×` was clipped out of reach entirely, so
the armed state had no exit but counting. It was also placed FIRST, pushing
MARK FIXED along a slot at every width — an addition Curtis asked for and a
move he did not. One button with three states adds nothing to the cell, so
there is nothing to overflow, and doing nothing for six seconds is the cancel.

**Measured at 360, 390, 430, 820, 1180 and 1280** — not one width this time. At
every one: a tap at the button's centre lands on the button itself, it
overflows the rail by 0px, there is no horizontal scroll, the chip goes
`REPORTED ×3` → `×4`, and the action row holds at 46px on phones and 104px on
desktop through all three button states with nothing clipped.

**And measured on all four Defect Log themes, which is the axis a fixed colour
actually breaks.** An earlier version of this release made LAST REPORTED a
hard-coded amber — it had been inert, losing to `.log-meta time` on
specificity, and winning that fight is what broke it: **2.50 / 2.52 / 1.73:1**
on dark, midnight and tactical, against the 8.04 / 7.29 / 5.28 it had while it
was doing nothing. The resting button had the same fault from the same cause.
Both take the theme's own ink now and the badge above carries the colour,
because a badge brings its own fill and a bare date does not. Measured:
LAST REPORTED 4.90 / 8.04 / 7.29 / 5.28, resting button the same, the REPORTED
badge 5.81 and the armed button 6.39 on every theme — all above AA.

**Two things it does NOT do, both worth knowing before it is live.**

After + COUNT THIS RETURN, SAVE stays disabled. Saving would create the
duplicate the banner exists to prevent.

**OPEN IT DISCARDS WHAT WAS TYPED.** It loads the stored record, which is the
whole point and is also the one path where the new `key` replaces the draft
while the editor is open. An earlier draft of this section claimed the opposite
— that OPEN IT was the way to put a typed description onto the existing record.
It is not, and nothing warns before it happens. Whether it should carry the
text across, or ask first, is Curtis's call.

### One header colour for the whole app

Curtis: *"B is fine all same color until I figure out a more solid color
scheme because I do want to add some flare to it. Why is this not an option to
color the headers differently in settings?"*

**IT PARTLY WAS, AND THAT IS THE PROBLEM.** Three of the eight headers were
already settable — the Facility Map through `--header-bg`, the Defect Log and
Fixed Repairs through `--log-header` and `--fixed-header` — but through two
PAGE-level theme systems built when every page had its own gear, and the other
five had the colour typed into a stylesheet. Nothing anywhere said what the
APP's colour was. Measured before this change: **five different navies, two
gradient angles, and flat against gradient** across eight screens Curtis moves
between all day.

So this is the missing thing rather than a ninth special case.
`src/lib/settings/header-theme.ts` owns the colour,
`src/components/shared/header-theme-live.tsx` paints it, mounted ONCE in the
root layout and following the route. Every header rule now reads `var(--app-header-fill, …)`, and the
fallback is the APP'S DEFAULT rather than that page's old colour — because
this paints from an effect, so the browser has already drawn the server's HTML
by the time it runs. With the old literals that was a measured flash:
Incidents came up rust and turned navy 37ms later, Shop Talk came up green,
and the Facility Map held the old `#06275c` for 116ms. All eight now open on
the colour they settle on.

**WHAT IT LOOKS LIKE IN SETTINGS → THIS DEVICE.** One HEADER COLOUR picker,
a RESET ALL TO NAVY, then eight rows — swatch, page name, what is deciding it,
its own picker, and FOLLOW to clear an override. The swatch carries the
computed text colour, so a light pick shows black `Aa` before it reaches a
header.

**A PAGE THEME IS THE MIDDLE RUNG, AND THAT WAS LEARNED BY MEASURING.** Handing
the shared colour to all eight unconditionally was built first. Measured at 430
on the Defect Log's Tactical theme: a navy header BLOCK — bar, nav tiles,
REFRESH and ADVANCED ACTIONS — with the olive page starting at its bottom edge
in a hard line across the screen, and the active nav tile still olive because
it is keyed to the page's surface. Two apps stacked. Nobody asked for that.

`resolveHeaderColor` is now a three-rung ladder:

| | wins over |
| --- | --- |
| an override typed for this page | everything |
| a non-default page theme | the shared colour |
| the shared colour | the old hard-coded literals |

On the default theme — every device that has not opened those panels — all
eight match, which is the case Curtis asked about. On a theme the page stays
whole, exactly as before this release. An override still beats both, so
Settings can always force it.

**AND THE PANEL SAYS WHICH.** A row with no override reads *"following the one
above"*, or *"its page theme decides this"* when that page is on one, with the
theme's colour in its swatch. A row claiming to follow a colour the page will
not draw is the panel lying about the app.

**THE TEXT COLOUR IS COMPUTED, NEVER CHOSEN.** The moment a background can be
picked, "white on a dark header" is a trap — a light flare colour takes the
page title with it. Whichever of white or black reads better wins. It was a
softer `#0b1b33` first; swept over the whole colour cube at a 15 step that
bottoms out at **4.15:1**, under AA, while `#000` floors at **4.58:1**. The
test sweeps the cube rather than sampling eight colours.

**THE GRADIENT IS 90deg, AND THAT IS NOT AN ANGLE THE APP USED** — the literals
it replaces were 110deg and 120deg, so there was none to preserve. A tilted
gradient is height-dependent, and the Facility Map's header bar and the phone
nav flush beneath it are two boxes of the same width and different heights that
have always read as one block. Measured at 110deg: a **4-to-6 per channel step**
across that boundary, where the flat colour they shared before had none. At
90deg it is **0**.

**THE PHONE'S OWN STATUS BAR FOLLOWS IT.** `<meta name="theme-color">` is
declared once at build time and cannot change, so saved to a home screen the
strip above the header would have stayed `#06275c` over a header that is
`#041d47` by default and anything at all after that. It is set from the same
resolved colour.

**`--header-bg` IS DELIBERATELY LEFT ON THE MAP'S THEME.** It is not only that
page's header: it is the board's border, the garage grid's row and column
labels and the scroll shadow, and on Terminal that is near-black with green
labels. Taking those with the header would repaint half the page to change one
bar.

**THE WHOLE HEADER, NOT THE BAR BEHIND IT.** The first version converted the
header's BACKGROUND on all eight pages and its FOREGROUND on two, which an
independent cold read found by picking a pale yellow and measuring: the page
title stayed pinned white on the Down Sheet and the Defect Log at **1.35:1**,
every kicker and subtitle kept a literal picked for navy at **1.07 to 1.85:1**,
and a third of the Incidents and Shop Talk headers was still a rust and a green
nav block — the "two apps stacked" failure this release rejected elsewhere,
shipped by default. Everything inside a header now derives from the header's
colour or its computed ink: kickers, subtitles, tab bands, tab labels, the
active tab, focus rings, REFRESH and the ADVANCED ACTIONS opener. A test reads
the seven stylesheets and fails if any rule inside a header still names a
colour of its own.

Two page colours are deliberately NOT shared: the Down Sheet's ADVANCED
ACTIONS toggle stays purple, because an earlier release made it purple
precisely so it cannot be mistaken for the Defect Log's, and the Defect Log's
inactive tabs keep their 26% blue lift, which is its own rule and untouched.

### The Settings panel, as little as it can be drawn as

Curtis, seeing the first version: *"Just make it as much of a minimalist
design as you can. Even though we have more settings controls."*

Measured at 390, from `innerText` and the rendered box, before and after:

| | before | after |
| --- | --- | --- |
| words | 149 | **53** |
| controls | 18 | **10** |
| of those, disabled | 8 | **0** |
| elements | 57 | **51** |
| height | 643px | **490px** |

A quarter of the whole Settings page, for one setting. **Every one of the
eight rows carried a disabled FOLLOW button** out of the box, and a second
swatch showing the colour the picker beside it already showed. Seven rows
said *"following the one above"*, which is the absence of news written out
seven times.

(An earlier draft of this section said 112 words and 469px. 112 counted the
heading, the paragraph and the repeated status lines and left out the row
names, the swatch letters and the FOLLOW labels; 469 was not reproducible at
any width. The table is both ends measured the same way, which is the only
thing that makes the two columns comparable.)

- **The swatch IS the picker.** `<input type="color">` cannot be given
  content, so showing a colour AND what its text will look like took two
  elements per row. The real input now fills a 44px box at opacity 0: the box
  draws the colour and the computed ink, the input takes the click, the focus
  and the keyboard, and `:focus-within` puts the ring back on the box.
- **A row with nothing to say says nothing.** The qualifier appears only when
  something other than the shared colour decides that page — `OWN` or
  `PAGE THEME` — and the clear `×` only when there is an override to clear.
  Its column is reserved on every row, so the swatches stay in one line.
- **No card.** Every other section on this page is a bordered white card
  inside a drawer that is itself a card inside a section that is another one.
  THIS DEVICE is the drawer this release touched, so its four sections are now
  separated by a hairline instead: LITE MODE, HEADER COLOUR, SOUND &
  VIBRATION, FIRST-TIME WELCOME, one ruled list. **The rest of the page is
  unchanged** — taking the cards off the other twenty sections is a bigger
  change than this one and is Curtis's to ask for.
- **Reset all to navy and SHOW IT are quiet now**, text rather than filled
  buttons, because neither is the thing you came to that row to do. The reset
  keeps the words "to navy": shortened to "Reset all" it lost the only thing
  the label was carrying.
- **The one sentence says the override wins.** It read *"a page on its own
  theme keeps that"*, which is the opposite — a colour typed on a themed row
  beats the theme, and clearing it falls back to the theme rather than to the
  shared colour. That was the one thing the six-line paragraph carried that
  the rows do not teach by themselves.
- **The `OWN` / `PAGE THEME` tag is `#5a6b84`**, the colour of the `<small>`
  it replaced: 5.37:1. Drawn in a fainter grey it measured **3.04:1**, under
  AA at 8px, on what is now the only thing telling you a page is not
  following.

**And the LITE MODE switch has never been styled, at any width.** `.settings-check` is
scoped to the Down Sheet's and the Defect Log's own settings bodies, so on
this page it computed `display:inline` and rendered as
`LITE MODE ON THIS DEVICEDraws less of the app…` — one run-together
paragraph with the checkbox inside the first word. It predates this release;
the comment in `settings.css` claimed that one such label "gets away with it",
which was never measured. Fixed in the same rule as its neighbour — **and in
the same media query**, which the first attempt missed: the base rules were
widened and the 760px block one line below was not, so on every phone width
the lite switch sat a size smaller and a tap target shorter than the
structurally identical row directly beneath it, 9px/8px/44px against
10px/9px/48px.

### The title still moves on two pages, and it is a frame rather than a padding

The same measurement that started this found FLEETSTEP's left edge at 10 to
17px across the eight surfaces. On the narrow layout the cause was **three
different header paddings** — `12px` on the Down Sheet, the Defect Log and
Settings; `11px 12px` on the Facility Map, Fleet Campaigns, Incidents and Shop
Talk; `12px 10px 10px` on Fixed Repairs. Those are now one 12px, each fixed in
the file and the media block that actually decides it. Fixed Repairs was already on the crowd's `13px 18px` wide —
an earlier draft of this said otherwise, from misreading a `11px 10px` rule
that lives inside a 760px block and has never applied at any width.

**Measured at 390 and at 1180, the six pages with no frame now put the title at
exactly the same x and y** — 12/7 and 18/8 respectively.

**Two pages still differ.** The Facility Map draws a 5px navy frame around the
whole board (3px below 800) and the Down Sheet a 5px one; the other six draw
none, and a frame pushes everything inside it in. On a phone that frame is the
**whole** explanation. On the wide layout those two also still carry their own
side padding — 12px on the map and 20px on the Down Sheet, against the other
six on 18px:

| | 390px | how it is made | 1180px | how it is made |
| --- | --- | --- | --- | --- |
| the six with no frame | **12** | 0 frame + 12 pad | **18** | 0 frame + 18 pad |
| Facility Map | 15 | 3 frame + 12 pad | 17 | 5 frame + 12 pad |
| Down Sheet | 17 | 5 frame + 12 pad | 25 | 5 frame + 20 pad |

Two ways to close it, both Curtis's call because both are visible: **drop the
two frames**, or **set those two headers' padding to the crowd's number minus
their own frame width** — which means two paddings per page, since the map's
frame is 5px on the shop computer and 3px on a phone. Neither is in this
release.

There is a third thing underneath: the eight pages switch to their phone
layout at **three different widths** — 760, 800 and 860 — so on an iPad held in
portrait at 820 the titles spread again, by 6px. Unifying that moves real
layouts at those widths on several pages, so it is not a tidy-up either.

### How long the repair takes, where the form used to ask what was found

Curtis, with a screenshot of the Defect Log's defect editor: *"where it says
optional what was found replace this with estimated time of repair. Make sure
it's wired to all other related inputs. We have " description above, so it kind
of redundant. Also change description to additional details. Capitalize the A &
the D."*

Two free-text boxes were asking nearly the same question on one screen —
DESCRIPTION and WHAT WAS FOUND (OPTIONAL) — while **how long the job runs was
nowhere on that form at all**, and that figure is the one every other surface
was guessing at.

| | before | now |
| --- | --- | --- |
| the slot above WORK STATUS | WHAT WAS FOUND (OPTIONAL) + FOUND BEFORE chips | ESTIMATED TIME OF REPAIR — HOURS |
| the box above it | DESCRIPTION | ADDITIONAL DETAILS |
| sources of an estimate | 3: billable hours, shop ledger, catalog | 4, with this one first |
| what the hours badge quoted when somebody knew better | the catalog's 12h, with nowhere to say otherwise | the number they typed |
| what a NEW Down Sheet card starts from | the catalog's 12h, always | the estimate on the record |

**IT IS A NEW FIELD AND NOT A RELABELLED ONE.** `repairHours` and
`diagnosticHours` are time WORKED — `src/lib/reports/work-time.ts` sums them per
person per day — so an estimate written into either would arrive on somebody's
work ledger as hours they never spent. `estimateHours` is its own optional field
on the defect, normalised through the same `normalizeRepairHours` every hours
box in the app uses, so junk on disk reads as no estimate and 900 reads as the
24-hour cap. **A record written before this release has none and reads exactly
as it did.** A test asserts `work-time.ts` never names the new field.

**IT SITS ABOVE THE BILLED HOURS IN THE LADDER**, because it is the only one of
the four that answers the question being asked. The two only ever meet on a job
that is part-billed and still open, since a completed repair contributes nothing
to the badge at all — and on that job the billed figure is time already spent
while the estimate is the whole repair, which is what "how much work is standing
on this board" means. It is not floored: `.25` is somebody saying fifteen
minutes, and rounding that to the Down Sheet's half-hour minimum would overstate
the board.

**THE BOX QUOTES THE RUNG BENEATH IT.** The placeholder is what the app would
otherwise estimate and the line under it says where that came from — the shop's
own repair-time ledger, or the catalog, named as a guess by somebody who has
never stood in this garage. A field that hides what it is overriding invites
somebody to retype a figure the app already had, or to leave it blank believing
nothing has been estimated at all. Asked with every typed figure stripped out,
billable hours included, because those are not an estimate. The PATH TO REPAIR
panel shows its own fallback the same way, and the editor is handed the same
ledger the feed's badge reads so the two cannot disagree.

**THE DEFECT LOG'S BOX OWNS IT, ONE DIRECTION.** A card BUILT from an
estimated defect is seeded from it (`estimateFromHours`) rather than from the
catalog, at both places a card is built from a record: the entry the Defect Log
opens when it puts a bus on the sheet, and the cards the Down Sheet builds for a
bus that is already down. Nothing carries a sheet figure back onto the defect.

**IT WAS BIDIRECTIONAL FOR ONE COMMIT AND A COLD READ MEASURED WHAT THAT DOES.**
Type 6 in the Defect Log on a bus already on the sheet, then clear it: the card
still holds the 360 minutes it was seeded with, so the next save of that row —
changing the mechanic, ticking a card, anything — reads 360, finds it is not the
catalog's 720, and writes the 6 straight back on. A cleared estimate that
returns is the bug `workStates` and `downSheetRecommendation` are deleted rather
than blanked to avoid, and the comment that sat beside the code claimed the
opposite of what it did. `{...linked}` in `applyDownEntryToFleet` keeps whatever
the record already holds, which is all that was wanted.

**THE LIMIT THAT LEAVES, SAID PLAINLY.** The sheet seeds only at card creation,
so on a bus whose entry already exists the Defect Log's badge and the sheet row
can quote different figures for the same repair — measured, 3h on the badge
against the catalog's 12h on the row. An estimate already on the sheet is
changed on the sheet. Three earlier drafts of this section, `CLAUDE.md`,
`PROJECT_HANDOFF.md` and the editor's own help line all said "both directions";
none of them were true for the normal case of a down bus.

Dropping the carry-back also drops a cap mismatch nobody had noticed: the
sheet's buckets take up to 40 hours each while `normalizeRepairHours` caps at
24, so a 33-hour card would have stored 24 on the defect and created a fresh
disagreement in the act of closing one.

**THE FINDING BOX MOVED INTO ADVANCED DETAILS**, beside DIAGNOSIS / TEST /
VERIFICATION, which is what it answers. A record carrying a finding opens that
section, so a cause already stored is read rather than hidden. The FOUND BEFORE
chips moved with it, so `pace-findings-memory-v1` is offered on all three
surfaces that collect a cause.

**TAKING IT OFF THE PAGE ALTOGETHER WAS THE FIRST VERSION, AND IT BROKE THE
OPEN-DEFECT CASE.** A cold read found it: the Down Sheet's own finding box is
inside `{item.done && …}` and Fixed Repairs lists completed repairs only, so an
OPEN defect had nowhere left in the app to type a cause, read one already
stored, or clear it — with the DIAGNOSED work state still on the form above and
nothing to say what was diagnosed. This file's earlier disclosure said the loss
was limited to "an open defect that is not on the sheet" and that it could not
be "edited or cleared"; both were wrong, and it could not be read either.

**One thing still cannot be undone from the Defect Log, and it predates all of
this.** `applyDownEntryToFleet` writes
`normalizeFinding(target.finding)||linked?.finding`, so clearing a finding on a
bus whose sheet card still carries the old wording lets the next sheet save put
it back. Not introduced here, not changed here, and worth knowing.

**The field is OUTSIDE the WORK DONE SO FAR fieldset** the finding sat inside,
though in the same place on the screen. An estimate is not work done, and that
legend would be wrong about the one field under it that looks forward. Still
above WORK STATUS and outside ADVANCED DETAILS, because this is typed by somebody
standing at the bus and a control behind a disclosure here goes unused.

The two stylesheet rules for the removed box and the eight for its chips are gone
from `defect-log.css` rather than left as dead weight; `fixed-repairs.css` keeps
its own copies, which is why the chips still draw there. A test now asserts the
Defect Log's stylesheet carries no rule for a chip it does not draw.

**One edge worth knowing before somebody reports it.** A quarter-hour estimate
reads as `15m` on the Defect Log's badge and as `30m` on the Down Sheet, whose
card also shows `0.5` in its own box, because the sheet has never printed a
repair at under half an hour. The RECORD keeps the 0.25 — measured through three
consecutive sheet saves, it does not drift — so nothing is lost; the two screens
just round it differently, and that floor predates this.

**Not gated by LITE mode.** Neither was the box it replaced — the WORK DONE SO
FAR fieldset that box sat in carries no `hiddenInLite` gate, and an earlier
draft of this line implied it did. Measured at 390px in both modes: the same
148×48 input, the same 11px gap above WORK STATUS, nothing covering it in
either.

**It syncs with no schema change.** `defectRow` in `src/lib/cloud/cloud-sync.ts`
puts everything outside its nine named columns into `detail`, and the pull
spreads `detail` back onto the record — which is what that design is for. **No
new LocalStorage key and no key renamed:** the estimate is a field on a record
that already travels.

### A page theme keeps its own header ink

Curtis, on seeing the shipped header work: *"Why did we have to change a theme??
The tactical theme. Themes should not be affected by default design."*

We did not have to. The header ink was made a computed black-or-white so that a
colour somebody PICKS cannot hide the page title, and it was then handed to all
eight headers including the three a page theme decides — so Tactical's `#e7ddb2`
and Terminal's `#61ff9d` came out white. It was written down in this file as
something to know rather than something to fix, which was the wrong call: a page
theme is a designed pairing of a background and an ink, and taking half of it is
not honouring it.

**`resolveHeaderInk` now walks the same ladder `resolveHeaderColor` does.** An
override typed for this surface is computed, a non-default page theme keeps its
own ink, the shared colour is computed. Rungs 1 and 3 are computed because those
colours came out of a picker with no ink attached. The gate on rung 2 is the same
`isHeaderColor(pageTheme)` expression the colour uses, and
`pageThemeHeaderPair` returns the background and the ink as ONE value, so the
two cannot come off different rungs — which is exactly how they came apart.

A theme with no ink of its own — `custom` on a device that stored a header colour
and no header text — falls through to the computed ink, because there is no
pairing there to honour.

**Measured at 1180 against the production build:**

| | header background | ink drawn |
| --- | --- | --- |
| Tactical, Facility Map | `#15180f` | `#e7ddb2`, its own |
| Tactical, Defect Log and Fixed Repairs | `#15180f` | `#f4e8b8`, their own |
| Down Sheet (no page theme) | `#041d47` | white |
| default theme, all eight | `#041d47` | white |
| override `#ffd98a` on map + Defect Log | `#ffd98a` | black, computed |
| …and Fixed Repairs, no override | `#15180f` | `#f4e8b8`, still its own |

The Settings panel's contrast note is scored against the ink that will actually
be drawn rather than the one it would have computed, or it would quote a figure
for text those three pages are not using.

### Fixed Repairs gets the Defect Log's window, and a share

Curtis: *"the quick filter functions, like for the day and the past week, the
past month, or the past 24 hours, the same way you got it wired up for defects,
I want you to wire up the actually fixed catalog the same way... Also where I
can share it, the same share ways as we do defects."*

| | before | now |
| --- | --- | --- |
| narrowing the history | search + category | + WHEN IT WAS FIXED: ALL, THIS SHIFT, TODAY, 24H, 3 DAYS, 7 DAYS, **30 DAYS** |
| sending it | EXPORT HISTORY REPORT (a JSON file) | + COPY, SHARE, SHARE PAGE |
| what a share carried | — | the window in its heading, and only the repairs on screen |

**WHEN IT WAS FIXED, NOT WHEN IT WAS LOGGED**, and that is the whole reason
this is not `defectWithinFeedWindow`. A repair reported on Monday and finished
this morning belongs in TODAY; the feed's window deliberately refuses to follow
an edit, and a completion is the one edit that IS the event being asked about.
`completedMinutesElapsed` reads `completedAt` then `updatedAt`, because a record
cleared from the Down Sheet stamps the save rather than the completion and this
page already sorts and dates its cards that way. One rule for the sort, the card
and the window — a card that prints one date and filters on another is how
somebody stops trusting a filter.

**A MONTH, AND ONLY THIS LIST DRAWS IT.** `FIXED_REPAIR_WINDOWS` is
`FEED_WINDOWS` plus thirty days, in its own list the way `SHIFT_TIME_WINDOW`
already is. Thirty days on the Defect Log's live board is every record it has,
which is not what was asked for; the Defect Log's drop-down is untouched and a
test says so.

**`feedWindowLabel` now looks its key up in the superset**, and that was a test
finding rather than a reading one: `30d` resolved to a limit through
`FIXED_MINUTES` and to `""` as a label, which is a list narrowed under a heading
claiming no window — the one outcome both window modules say is worth writing
code to prevent.

**THE SHARE SENDS WHAT THE SCREEN SHOWS.** It reads `visible`, which is after
the category, the window and the search. A filter that tidies the screen and
then pastes everything anyway lies at the only moment that matters, which
`time-window.ts` argues at length. The window's words lead the heading, because
that is the only part of a pasted list its reader can check. A repair with no
fix details prints *"No fix details recorded."* rather than an empty line — the
page badges those cards and a share that dropped the line would read as a
complete record to somebody who cannot see the badge.

**A SEARCH STANDS THE WINDOW DOWN**, Curtis's own condition on the Defect Log —
reach a bus "no matter what time" it was logged — and a new bar above the list
says so, alongside how many records the window holds back and how many the
search does, so each number names its own cause.

**One clock, shared by the limit and the label**, ticking every 30s while a
window is chosen and idle on ALL: this page sits open on a shop computer all
day, and an instant read once in the render body leaves THIS SHIFT meaning
whatever o'clock the page was opened at.

**The four summary tiles stay absolute** — TOTAL FIXED, FIXED TODAY, BUSES IN
HISTORY, NEED FIX DETAILS are counts of the whole history and two of them are
already time statements. The window belongs to the list and the share, and the
bar between them is what reconciles the two numbers. Worth knowing before
somebody reads 1,400 TOTAL FIXED above three cards.

### PATH TO REPAIR is reachable from Fixed Repairs now

Curtis: *"The path to repair should be for everything. Well, you know, to
everything that's appropriate for it, such as this."*

It was already KEYED for every repair — `repairIdentityKey`, so a writeup
written once shows on every bus that ever gets that fault. What it was not is
REACHABLE: the only entry point in the whole app was the `PTR` button on a
defect card inside the Defect Log's FOCUS view, so writing one meant Defect Log
→ tap a bus → FOCUS → tap PTR. **Fixed Repairs is where somebody is standing
the moment after they finish the job**, which is the moment the writeup is worth
capturing, and it had no way in.

**NOTHING MOVED ON THE DEFECT LOG.** Its PTR button is still in the focus view,
still carries the repair rather than the defect id, still shows `PTR +` when
nothing is written. This is a second door into the same room.

**The panel is a COMPONENT now** —
`src/components/defects/path-to-repair-panel.tsx`, which
`docs/ARCHITECTURE.md` reserves for React two or more pages draw. It owns the
draft, whether it is editing, and the two checked writes; the LIBRARIES are
props, because each host's own button reads the writeups to choose between
`PTR` and `PTR +`, and a panel holding its own copy would save one while the
button behind it still said there was none. Opening straight into the editor on
an unwritten repair is derived from the library inside the panel now rather than
seeded by each caller — two callers seeding it is two chances to open in the
wrong mode.

**Its colours are its OWN NAMES.** The rules read `--log-*` directly, which was
fine while one route loaded that stylesheet; Fixed Repairs does not load
`defect-log.css` at all, so every one of those would have resolved to nothing
and the panel would have opened as black text on a transparent card. It declares
`--ptr-*` with light-surface defaults beside itself and each host maps them
under its app root, so the Defect Log's page themes still drive it — measured on
Tactical: khaki header, black ink, olive panel — and Fixed Repairs gets its own
green.

**A UI CHANGE ON THE PHONE, which needs saying.** The card's action row holds
`EDIT FULL RECORD` / `PTR` / `UNDO FIX` / `DELETE` now, and at 760 and below it
goes **2x2** rather than one line of four. Four in a line at 360 put DELETE in a
60px box beside a 41px PTR — four crowded targets with the destructive one on
the end, which is how somebody deletes a repair reaching for UNDO FIX with a
glove on. Measured: 2x2 gives each of them 151px at 360 and 165px at 390, at the
same 48px height. On the shop computer it stays one line, 210/77/140/112, and
DELETE is pinned to the last column so the three-button cards — a repair logged
straight onto this page has no UNDO FIX — end at the same right edge as the
four-button ones rather than 119px short.

**Measured in Chromium against the production build**, not read off the CSS:

| | |
| --- | --- |
| Defect Log, Tactical | head `#bca75f` on black ink, panel `#393e30` — the page theme still drives it |
| Defect Log, light | head `#0b64bd` on white, `z-index:2147483001`, focus view still open underneath, SAVE reachable |
| Fixed Repairs | head `#087347` on white; writes `pace-ptr-v1` and `pace-repair-hours-v1`; the button flips `PTR +` → `PTR`; reopens in read mode |
| action row 1180 | 210/77/140/112 in one line, three-button card ending at the same 1143 |
| action row 360 / 390 | 2x2, 151px and 165px wide, 48px tall |

`z-index:2147483001` is load-bearing and travelled with the panel: every Defect
Log shade shares `.log-shade`'s single z-index and the focus shade renders LATER
in the tree, so at equal z-indexes it painted over this panel and ate every tap
on it. The panel looked perfectly normal while being completely dead. That is
what "SAVE reachable" in the table above is checking.

**TWO THINGS A COLD READ FOUND IN THAT FIRST VERSION, both mine.**

The panel was **unreadable on Fixed Repairs on Dark, Midnight and Tactical.**
The map set `--ptr-text` from the themed `--fixed-ink` and left `--ptr-surface`
as a literal `#fff`, so it painted a white card and wrote the theme's light ink
on it — the writeup measured at 1.08:1, 1.17:1 and 1.19:1, and the SHOP TIME box
somebody types into the same. Invisible, not merely low, and it is the bug the
block twenty lines above it in that stylesheet was written to fix across the
whole page. Fixed; re-measured on all four themes and both pages, the writeup
now runs 9.28 to 14.74 and the hours band's text 4.57 to 7.77. A new gate
refuses a themed ink on an unthemed surface in either direction, with "themed"
read out of the two files that emit those names — that gate's absence is why it
shipped, and it was the one mutation of seven that survived the first pass.

And **the Defect Log's phone layout did change**, which the first version said
it did not. `.log-shade` carried three `@media(max-width:760px)` rules and the
LAST one, `align-items:stretch`, won; the new stylesheet took `flex-end` from
the first rule it found. So at every width at or under 760 the panel moved from
the top of the screen to the bottom, went from a fixed 88vh box to a
content-height one, and lost its bottom corner radius. Restored, and measured on
both pages at 360, 390, 620, 760, 761 and 1180 — identical geometry throughout.

**A BOTTOM SHEET IS PROBABLY THE BETTER SHAPE and is Curtis's call.** The
restored layout is an 88vh box pinned to the top, so a short writeup leaves
roughly 190px of dead space inside the panel. The bottom-sheet version is one
value — `align-items:flex-end` — plus a content-height panel and square bottom
corners. Not taken, because it is a screen he already uses.

**The page behind it no longer scrolls.** A wheel over the backdrop scrolled the
feed 600px at 390, measured. It uses `lockPageScroll`, the same helper the
Defect Log's editor and the part-number prompt use. Pre-existing on the Defect
Log and fixed here, because a second host is where "it only happens on one
screen" stops being true.

**Still open on this panel, both pre-existing and both Curtis's call:** Escape
does not close it, and opening it in read mode leaves focus on the button
outside the dialog. Escape on a panel holding unsaved text is a flow decision
rather than a fix, which is why this release shipped the map's Escape as an
opt-in setting.

**No storage key.** It writes the two that already existed, from a second
screen.

### An unfinished Down Sheet card has no opinion about what was found

`applyDownEntryToFleet` wrote `normalizeFinding(target.finding)||linked?.finding`
for every card, finished or not, so a card still holding an old wording restored
it onto the record on the next save of that row — changing the mechanic, ticking
a different card, anything. **A finding cleared in the Defect Log came straight
back.** Same bug as the estimate carry-back removed earlier in this release, and
the same one `workStates` and `downSheetRecommendation` are deleted rather than
blanked to avoid.

**Reachable, and newly so.** The sheet's WHAT WAS FOUND box lives inside
`{item.done && …}`, so a card only ever gets a finding while it is finished —
but reopening the repair leaves the card holding its copy with the box gone, and
the Defect Log's own finding box, restored to ADVANCED DETAILS this release, is
what finally gave somebody a way to clear the record's half on an open defect.
Two surfaces, one field, and the one with no box on screen was winning.

So the card writes these only where the sheet actually asked for them. Nothing
is lost in either direction: anything typed on a finished card still reaches the
record Fixed Repairs reads, `{...linked}` keeps whatever the record holds
including a deliberate clear, and **the card keeps its own copies** — that is
the sheet's record of what that mechanic did, and re-ticking it speaks again.

**ALL FOUR FIELDS, and the first version fixed one.** That block holds FIX /
STEPS TAKEN, WHAT WAS FOUND, REPAIR HOURS and DIAGNOSTIC HOURS, and the
reasoning above applies word for word to the other three — REPAIR HOURS and
DIAGNOSTIC HOURS are editable on an open defect in the Defect Log, so clearing
them there and saving the sheet row wrote them straight back. Measured through
the function: record cleared, unfinished card holding 2 and 1.5, result 2 and
1.5. Found by a cold read. Three of four fixed by comment and one by code is
worse than neither.

**One hole left, asserted rather than claimed away.** The gate is
`target.done||entryCompleted`, which is wider than the box: setting the whole
ENTRY to Completed without ticking a card still writes that card's stored
values. Deliberate — marking the entry complete is a statement that the work is
done, and the card's text is the only account of it there is — and the
alternative loses fix details on every entry somebody completes without ticking
each card first, which is the commoner gesture.

`CLAUDE.md` said this was "not fixed here" and quoted code that no longer
exists; `PROJECT_HANDOFF.md` said PATH TO REPAIR was reachable from one screen
and that Fixed Repairs was Curtis's call. Both rewritten in `3c5c59b`.

### One new repair: RUN BOX NO DISPLAY

Curtis: *"we need to add a run box defect to the tech services portion and it
will go in the fourth sub category yeah just run box... I think run box no
display might be the best one."*

**Tech Services → IBS Screen → Run box no display.** He named a POSITION —
"it will go in the fourth sub category" — and IBS Screen is the fourth group
this category draws: Farebox, Ventra, CUBIC Screen, IBS Screen,
Signs/Cameras/Other. Measured in both render paths, the native three-step
select and the combo field, neither of which sorts or filters the group keys.
Why that group is the fourth is not something he said and not something the
code can show, so it is not claimed. Added to both structures `CLAUDE.md` says
must stay in step: the prefixed identity in `REPAIR_OPTIONS` and the bare name
in `REPAIR_OPTION_GROUPS`, since an entry in one of them alone is either an
option that cannot be picked or a pick that cannot be stored.

**FOUR PICKERS GAIN THE OPTION AND NONE NEEDED AN EDIT, which is what the group
prefix buys.** The Defect Log's and Down Sheet's combo fields, the Facility
Map's three-step select, and the FULL SWEEP reviewer's "re-point this finding
at" drop-down, which reads `REPAIR_OPTIONS["Tech Services"]` directly. The
stored identity carries "IBS Screen", so `tech-services.ts` reads the device off
the words and the `ibs-ventra` quick filter picks the entry up without being
told. It is not read as a farebox — that pattern needs the literal "fare", so
the `box` in "Run box" cannot reach it — it inherits Tech Services' own
120-minute allowance rather than wanting a rule of its own, and a record stored
under it reads back unchanged with no rename map touching it.

**THE STATUS REPORT DOES NOT SHOW IT, and an earlier draft of this section said
it did.** `techSections` prints FAREBOX, VENTRA and CUBIC SCREENS — three,
because three is what was asked for: *"Fairbox and Venture separate. and cubic
screen."* `tech.ibs` is computed and rendered nowhere, so this entry is
invisible in the report in both output formats with every box ticked. The claim
was stated four times and said "checked rather than assumed" each time; a cold
read measured it false.

**And the consequence was a real bug, now fixed.** The IBS/VENTRA flag's
fallback added a flagged bus to VENTRA only where no repair had already named a
device — counting `ibs` as "already named" though nothing prints it. So writing
up an IBS screen fault REMOVED the bus from the report. Measured, flag ticked:

| on the bus | printed sections |
| --- | --- |
| no tech defect | VENTRA=1 |
| a Ventra defect | VENTRA=1 |
| an IBS Screen defect | **none at all** — was VENTRA=0 |
| an IBS and a Ventra one | VENTRA=1 |

Pre-existing: `IBS Screen - INOP (general)` and `Screen black` do it too, and
adding a third wording that reaches it is what made somebody look. `ibs` is out
of that list now, with the table above held by a test — including a mutation
that prints an IBS section without restoring the exclusion, which would
double-count a flagged bus and now fails.

**A bus with an IBS defect and NO flag is still invisible in the report**, and
that is the remaining gap rather than a bug: there is no IBS SCREENS line for it
to appear in. **Whether one should exist is Curtis's call** — `tech.ibs` is
already counted, so it is a row in the include list and a line in two
renderers, and the day it is added `ibs` goes back into the fallback above.

**The spoken path resolves it**, through the alias table built from the catalog:
*"bus 17559 defect run box no display"* plans the right record, and so does the
phrase with the group in front of it. Bare **"run box"** now resolves too,
through the one hand-typed shorthand list in that matcher — see the section
above. The first draft shipped without it and called the refusal *"the refusal
this catalog makes everywhere else"*, which overstated it: `searchCatalog`
resolves bare "run box", "no display" and even "display" to this one option, so
for one commit the typed picker and the spoken one disagreed about the same two
words. The refusal was only ever a property of the spoken table's exact-tail
rule.

**No storage key, no migration, nothing on disk rewritten.** Adding a catalog
option is additive by construction — the entry is the stored identity, so a
device that has never seen this release simply never stored one.

### A short way to say the run box

**`SPOKEN_SHORTHAND` in `src/lib/operator/operator-engine.ts`** is one
hand-typed row — `"run box"` → `IBS Screen - Run box no display` — in a matcher
that is otherwise derived entirely from the catalog. Curtis: *"I'll just think
of a way to a short hand way to say it."* The alias pass only ever gets the
whole tail after the group prefix, so a mechanic standing at the bus saying
"the run box" matched nothing at all.

**Being the one hand-typed list is the risk, so each row carries its own drop
rules** rather than being trusted: the target resolves through
`migrateRepairIdentity`, so a catalog rename moves the phrase with the repair; a
target no longer in the catalog drops the row, because filing under a retired
identity is worse than not hearing the phrase; a phrase that already exists as a
full name or a bare item keeps its derived meaning, so a shorthand can never
shadow a real wording; and **a phrase that reaches two catalog wordings drops.**

That last one is the objection the previous commit's own test had recorded
against adding this alias at all — that it becomes a guess the moment a second
run-box entry exists — turned into the mechanism. Measured with an
`IBS Screen - Run box no power` planted: "run box" stops resolving and the
operator asks which screen, while the full wording still works.
`tests/operator.test.mjs` asserts both halves from outside, so a second run-box
repair fails the build and somebody chooses the words.

### One window list, and a scope bar that names every filter

**LAST 30 DAYS is on the Defect Log's drop-down now**, which Curtis asked for,
and the two window lists collapsed into one to do it. It had shipped as
`FIXED_REPAIR_WINDOWS`, a superset only Fixed Repairs drew, arguing that thirty
days is every record a live board has. **That argument was wrong on the facts:**
a DEFERRED defect sits on that board for as long as it takes, so a board
carrying months of held-back work is exactly where this narrows something. One
table is also the only shape in which the limit and the label cannot
disagree — and they already had, once, with `30d` resolving to a limit through
`FIXED_MINUTES` and to no label at all through `feedWindowLabel`.

**The Fixed Repairs scope bar names the category.** It counted what the window
held back and what the search hid and said nothing about the drop-down above
them, so a history narrowed to Brakes read as the whole history with a smaller
number in it. The share HEADING had the same hole and was fixed first; this is
the one somebody is actually looking at. Measured against `records`, because the
category is the first stage and has nothing above it to subtract from — against
`inWindow` it would double-count what the window had already set aside, which is
the arithmetic bug the window's own count already carries a comment about.

**And a window that cannot be resolved says so.** `feedWindowMinutes` and
`feedWindowLabel` degrade together to "no window" when the clock cannot
answer — the right failure, argued at length in that file, and a silent one: the
drop-down still read THIS SHIFT, the list was the whole history, and the bar
that would have explained it hangs off the label, so the explanation vanished in
exactly the case that needed explaining. `feedWindowUnresolved` is one function
both pages read, with **two sentences** because "the hours cover no window
including now" sends somebody to Settings and "this device's clock cannot be
read" sends them to the phone, and one sentence covering both would be wrong
half the time.

**Measured in Chromium at 1180 against the production build**, not read off the
CSS:

| | |
| --- | --- |
| window options | ALL · THIS SHIFT · TODAY · LAST 24H · LAST 3 DAYS · LAST 7 DAYS · LAST 30 DAYS |
| a category + LAST 7 DAYS | `LAST 7 DAYS \| 1 OF 5 REPAIRS \| 4 IN OTHER CATEGORIES` |
| a category, window ALL | `1 OF 5 REPAIRS \| 4 IN OTHER CATEGORIES` — the bar was silent here |
| hours covering 08:00-08:30 at 03:xx | `5 OF 5 REPAIRS \| SHIFT HOURS DO NOT COVER NOW — SHOWING EVERY DATE`, 1128x21 at 9px `#8a5a06` |

Six mutations, six caught: the category count measured from the wrong stage,
the visibility gate dropping it, `feedWindowUnresolved` pinned false, one
sentence for both causes, ALL counting as unresolved, and the Defect Log
dropping the note.

**No storage key.** `fixedWindow` and `feedWindow` are both component state and
are not remembered between visits, which is what they already did.

### Verified

Gates re-run on **the commit this file is updated in**, which is what "this
release's source" means and is why no hash is written here any more. Two
earlier drafts of this section went stale within a commit of each other — one
cited `319f2cd`, a hash no ref contains after the rebase onto Codex's 193, and
both quoted a test count that the next commit moved. A number copied forward is
the thing `.claude/skills/fresh-context-review` was written about, and naming a
hash in a section that outlives it is how it keeps happening:

- `npm test` — **417 pass, 0 fail**
- `npm run lint` — clean, no output
- `npm run build` — Build complete

**Measured in Chromium against the production build**, at 360, 390, 430 and 820:
**32 gesture checks, all passing** — a scroll swipe on a bus scrolls ~190px and
leaves it where it was; a 250ms pause then a swipe still scrolls; a 550ms hold
then a drag lands the bus under the finger with the page unmoved; a cancelled
drag clears the ring and gives scrolling back; a hold lifted in place shows the
quick view; single and double tap unchanged; and the page scrolls after a drag.

**A THIRD COLD READ, on the finished change, found eleven more and all of
them were real.** The pattern was the same one the second found and the fix
had not finished: the header's background was converted everywhere and its
foreground in most places, so anything that was still a literal went wrong
only when somebody did what the panel tells them to and picked a light
colour. Measured on a pale yellow: the Facility Map's ACTIVE phone-nav tab at
**1.2:1** (light tile, light label — the one tab that says where you are),
the DS BADGES and QUICK FILTERS popover headers at **1.45:1** (black ink on a
background still keyed to the old variable), the PATH TO REPAIR heading and
its buttons at **3.57:1** because the header's ink was also driving the
ACCENT surfaces, and a rust and a green divider line still between nav tiles
on two pages. All fixed and re-measured: 17.44, 17.44, and an accent ink
computed for the accent.

It also found that **the Facility Map was never fixed for the flash** — its
fallback ran through `--header-bg`, whose own literal is the old navy, so it
held `#06275c` for 116ms while the other seven did not move, and with
JavaScript off the eight drew two different navies. And that **`custom` was
being read as "this page chose its header"** when both appearance panels set
`custom` for any colour change at all, which quietly took the map out of the
shared setting for anybody who had ever nudged a bus status colour.

**And the mutation testing it did was the most useful part.** Nineteen of
twenty-seven deliberate breakages survived the suite, including four of the
five header paddings, the Down Sheet's title fix, the whole of the painter's
wiring — route following, both listeners, the route-to-surface pairings, the
two pages' feeds — and, most pointedly, putting the Facility Map's header
text back to a hard literal, which is the headline failure of the review
before it. The thirteen that mattered are now caught; the tests for them are
in `tests/settings.test.mjs`.

**The second cold read, on the same change a few hours earlier, found twelve
things and eleven were real.** Every one is answered in the commits for it. The three that
mattered were one failure wearing three faces — the header's background was
converted on all eight pages and its foreground on two — and they are in the
section above. Also found and fixed: a comment claiming a test caught a bug
when no test was named; an `/settings` 500 from reading a `const` declared
later in the component (a render test DID catch that one, in
`tests/storage.test.mjs`, which the reader could not find because this repo's
helper drives the built SSR bundle rather than importing `react-dom/server`);
a no-op CSS rule shipped with a comment that was wrong four ways; a comment
saying the painter "writes nothing" while it sets three properties and a meta
tag; the page frames on two pages no longer matching their own headers; and
**six surviving mutations**, the two that mattered being that the colour-cube
sweep measured itself — it picks the text with `contrastRatio` and then grades
it with `contrastRatio`, so dropping the sRGB gamma keeps the sweep at 4.58
while the real floor falls to 3.75. Four values from WCAG's own table are now
asserted as an external anchor, and the validation, the ladder's middle rung
and the painter's own wiring have tests they did not have.

The first cold read, on the gesture work, **found six defects, every one
real**, each answered in `033cb98`. Two are worth knowing about because they
were reintroductions of the very bug being fixed:

- **A second finger on the same bus froze the page.** Measured against the
  first commit of this fix: the page scrolled zero pixels under the second
  finger and the bus was carried garage-6 to wall-7 anyway. One finger owns a
  token now. The probe was run against the broken build first, to be sure it
  could fail.
- **The ring was invisible under every highlight mode**, which is the normal
  working state of that screen — it was a box-shadow losing to thirteen rules
  carrying an attribute selector, and to a keyframe animation. It is a
  pseudo-element now, measured visible in all thirteen states. On iOS there is
  no `navigator.vibrate`, so that ring was the entire confirmation.

**The headers, measured in Chromium against the production build** at 360,
390, 430, 820 and 1180:

- **One header fill across all eight pages at every width.** The probe counts
  distinct computed backgrounds on the element carrying FLEETSTEP; it reports
  **1**. With one page overridden it reports **2**, which is how the probe is
  known to be able to fail.
- **Worst title contrast 16.51:1** on the default navy, **15.54:1** on a light
  yellow shared colour (where the title flips to black), **9.90:1** on a rust
  override. The floor over the whole colour cube at a 15 step is **4.58:1**,
  asserted in the suite rather than sampled.
- **The three-rung ladder, nine cases.** Default theme → the shared colour on
  all three themed pages; Tactical with no override → `#15180f` on all three;
  Tactical with that page overridden → the override; default theme with a
  crimson shared colour → crimson. Each read off the rendered header.
- **The status bar follows.** `<meta name="theme-color">` matches the resolved
  colour on every page, per-page override and page theme.
- **Live in both directions.** Changing the picker repaints the Settings page
  itself through the CustomEvent, and a second tab through the `storage`
  event. Measured with two tabs in one browser.
- **Every word in every header, on ten colours.** A probe walks every text
  leaf in the header, composites it over whatever it actually sits on —
  including translucent controls and the gradient behind them — and reports
  the lowest ratio. On navy, pale yellow, crimson, white, black, bright green
  and indigo the floor is **5.88:1**, which is the Defect Log's own active tab
  and predates this release. On mid-tones it falls to around **3.6:1**, and
  not always on the same element: on mid-brown it is the REFRESH glyph, on
  mid-grey the kicker, and the 10px tab labels sit near 4.0. A mid tone is
  where a two-choice ink is at its mathematical worst, and every dimmed or
  lifted thing in the bar inherits that.
- **The ink is chosen against BOTH ends of the gradient, and the panel quotes
  the worse one.** It scored the picked colour alone, which is only the bar's
  left edge; swept over the cube against the far end that bottoms out at
  **3.37:1** while the function reported 4.58 and the panel printed it. The
  gradient's lift also came down from 16% to 10%: measured over the cube, the
  floor is 3.86 at 16%, **4.12 at 10%**, 4.39 at 4% and 4.58 only with no
  gradient at all. The page title is 25px bold, which needs 3.0 for AA.
- **One repaint per page, not two.** Polled from navigation commit on a device
  with a shared colour AND a Tactical board: the Defect Log, Fixed Repairs,
  the Facility Map and Incidents each change once. The map used to take two,
  holding the wrong colour for 370ms between them.
- **No flash on the way in, on any of the eight.** With each page's OLD
  colour as the CSS fallback, Incidents came up rust and turned navy **37ms**
  later and Shop Talk came up green. The five pages with no theme were moved
  to the app default and measured 0ms — and the Facility Map was missed,
  because its fallback ran through `--header-bg`, whose own literal is the
  OLD navy: measured again, it held `#06275c` for **116ms** while the other
  seven changed colour not at all, and with JavaScript off the eight drew two
  different navies. All eight carry the same fallback now.
- **The map's header bar and the phone nav under it are one block again.**
  Sampled either side of their boundary at four x positions: identical at
  90deg, against a 4-to-6 per channel step at 110deg.
- **The Settings panel at 360, 390, 430, 820 and 1180** — no overflow, no
  page scroll, all nine swatches 44x44 and on one x within each width, every
  tap target 44px. It shipped with no CSS at all and rendered as 519px of
  run-together inline text, then as 630px of cards and disabled buttons;
  both were found by looking at it, not by reading it.
- **Every control driven end to end**: the shared swatch repaints all eight
  and the status bar; a row swatch writes an override and grows that row's
  `OWN` tag and its `×`; the `×` removes it; RESET ALL puts the record back
  to `{shared:"#041d47",overrides:{}}`.
- **No horizontal scroll and nothing spilling a header**, on all eight pages
  at all five widths.
- **Title geometry:** the six pages with no frame land on exactly 12/7 at 390
  and 18/8 at 1180. Including the two framed pages the left spread is 5px at
  390 and 8px at 1180, and the top spread 5px and 4px — all of it the two
  frames and those two pages' own padding, per the section above.

- **The panel keeps up with the screen it is on.** Both appearance panels are
  further down the same Settings page, so the rows are derived from the live
  settings rather than a snapshot read on mount — measured by picking Tactical
  in the Defect Log's own panel and watching the Defect Log and Fixed Repairs
  rows change from *following the one above* with a navy swatch to *its page
  theme decides this* with an olive one, without a reload. The snapshot
  version did not move.
- **The themed pages stay whole.** The Defect Log and Fixed Repairs were
  looked at on Tactical, not just measured: header, nav tiles and page body
  are one olive, the way they were before this release. The navy-block version
  that preceded the ladder is what that check was built to catch, and it
  caught it.

**ESTIMATED TIME OF REPAIR, driven end to end in Chromium against the
production build**, at 390, 430, 820 and 1180:

- **The badge moves.** An unestimated Brakes — Rear shoes and drums read
  `12h ESTIMATED` on the feed, the catalog's figure; typing `1.5` and saving
  made it `1h 30m`; clearing the box put `12h` back and left no `estimateHours`
  on the record. With a shop time of 5h in the ledger and nothing typed, the
  feed read `5h` and the box said *"the shop's own time for this repair"* with
  `5` as its placeholder — the rung beneath it, named.
- **The Down Sheet quotes the same number.** Putting that bus on the sheet with
  2h typed printed `2h ESTIMATED` on the row; the catalog's `12h` appeared
  nowhere on the page.
- **And so does the Defect Log, when the sheet is where it was typed.** Opening
  the sheet's row editor on a bus whose defect had no estimate, typing 7 into
  ESTIMATED HOURS and saving wrote `estimateHours:7` onto the record the entry
  ADOPTED — one defect, its id, category and details intact, not a second copy —
  the row then printed `7h` and the Defect Log's badge read `7h` where it had
  read `12h`.
- **A quarter-hour estimate does not drift.** 0.25 on the record, through three
  consecutive sheet saves: still 0.25 each time, while the sheet went on
  printing `30m` and showing `0.5` in its own box, which is its floor and not a
  write.
- **The field itself**, measured rather than read: 148x48 input at every width,
  a 48px target in FULL and LITE alike, 11px above WORK STATUS, after the WORK
  DONE SO FAR fieldset closes, nothing covering it, no page errors, and `1.5`
  typeable one keystroke at a time.
- **Four probe runs reported "nothing changed" before any of this was true**,
  and all four were the fixture: a defect with no `source` renders an empty
  feed, and the sheet editor's UPDATED BY — INITIALS is `required`, so an empty
  one makes the browser refuse the submit with no error and no save. Written
  down because the fourth run was about to be filed against the app.

**THE FIRST COLD READ'S FINDINGS, and what answering them changed.** Every one
is answered here or in the sections above — some of them together, which is why
no count is quoted: a second read pointed out that "thirteen were reported"
could not be reconciled with the bullets beneath it however they were counted,
and a number that does not survive its own list is the species of claim this
file keeps correcting.

- **The estimate came back after being cleared** — the carry-back from a Down
  Sheet card is gone, and a test now drives a cleared estimate through two
  consecutive sheet saves.
- **"Both directions" was false for a bus already on the sheet** — the claim is
  withdrawn in this file, `CLAUDE.md`, `PROJECT_HANDOFF.md` and the editor's own
  help line, and the limit is stated instead.
- **A finding could only be typed on a COMPLETED repair** — the box is back, in
  ADVANCED DETAILS, and a stored finding opens that section. Measured: a cause
  reads back, clears, and saves cleared.
- **The help line promised a fallback the app would not use** on a part-billed
  open job — the fallback is now exactly what clearing yields and NAMES its
  source. Measured: catalog 12h, ledger 5h, billed 4h, each matching the badge
  beside it.
- **The estimate box was 15px**, under Safari's 16px auto-zoom threshold, on the
  one control meant to be typed at while standing at the bus. Now 16px,
  measured; a test reads the declaration and fails under 16.
- **A >24h sheet estimate would have been capped to 24 on the defect** — moot
  with the carry-back gone, and recorded above.
- **Dead CSS and an orphaned comment** — the `.work-state-picker>small` rule
  whose only direct child went with the finding box, and a comment about chips
  left sitting above the estimate's.
- **"ALL SEVEN inputs" was eight** — an increment instead of a re-count, which
  is the habit this file keeps correcting; the total is now added up by the test
  rather than written down.
- **Three weak assertions** — a message attached to the wrong assertion, a
  completed-record check that passes with the whole feature deleted, and a test
  name claiming reach the code does not have. All three rewritten.
- **This file quoted an insertion count one commit stale** under a heading
  saying it did not; the heading now says what is actually true, and the blocks
  are re-run each time.

Two findings were answered by writing down a limit rather than changing code,
both pre-existing: a finding cleared on a bus whose sheet card still carries the
old wording comes back on the next sheet save, and the Down Sheet's FOUND BEFORE
chips have no border or radius because only a `button` override of them exists in
its stylesheet.


**AND A SECOND COLD READ, of the ink fix and of those answers.** It found one
thing the fix had introduced and several the suite was not holding:

- **A white-on-white header became reachable.** Giving a page theme its ink back
  honoured whatever was stored, and the Facility Map's own appearance panel
  offers Header Background and Header Text side by side and writes
  `theme:"custom"` on any change — so `#ffffff` on `#ffffff` drew a white title
  at 1:1, where the computed ink had drawn black. The stored pairing now wins
  only while it is legible: `MINIMUM_PAGE_INK_CONTRAST` is 4.5, AA for normal
  text rather than for the 25px title, because a header also carries its
  kicker and its nav labels at 8 to 10px. Every named theme clears it by a wide
  margin — the lowest is Tactical's khaki at 9.97:1 — so it never bites a
  designed pairing; it catches the palette nobody designed. Measured after the
  fix: white on white computes black, a legible custom pairing is kept, and
  Tactical is unchanged.
- **The half of the ink fix that paints the Defect Log's title had no test.**
  The read deleted one line from `useHeaderColor`, built it, and measured
  `--log-header-text:#ffffff` on Tactical olive — Curtis's exact complaint,
  reintroduced — with all 405 tests green. Two assertions now name that line
  and the hook's return, and both mutations fail.
- **Four new TypeScript errors.** `loadPageHeaderThemes` still declared the old
  `string` return while returning pairs, so the only typed contract for what
  `HeaderThemeLive` consumes described the wrong shape. `npm run build` does not
  typecheck and `eslint` has no type-aware rules, so no gate saw it.
- **The FOUND BEFORE chips landed in the wrong grid column at every width above
  760px** — measured at 1180: the box in column 2 beside DIAGNOSIS and its chips
  in column 1 of the next row, under a textarea they have nothing to do with.
  Fixed Repairs and the Down Sheet editor both mark that row `wide`; this copy
  did not. The box and its chips are one `wide` cell now, placed after FIX so
  the two textareas stay paired: measured at 1180, box and chips share x=229
  with the chips directly beneath, and at 390 the order reads the same.
- **The finding box was 16px/44px at every width**, which put a 16px input
  beside a 10px textarea on the shop computer, unannounced and for a reason
  (Safari's phone zoom) that only applies below 760px. It has no size of its
  own now: measured 10px/38px at 1180 beside its neighbour's 10px, and
  16px/44px at 390.
- **Four more assertions that passed with the behaviour removed** — a
  read-only finding box, the whole finding block wrapped in a
  completed-only guard (the regression this release exists to fix), the
  contrast note reverted, and the row swatch's ink. All four now fail, verified
  by mutation.
- **An orphaned comment and a stale one**: the estimate's paragraph had come to
  sit above two rules it does not describe, and `repairTimeSum` still claimed a
  reader that the dropped carry-back took with it.
- **The help line told a completed defect its estimate feeds the hours badge.**
  The badge counts outstanding work, so it does not.

Recorded rather than fixed, both measured and both pre-existing: the Settings
row's raw-versus-normalised theme name can still diverge for a theme name
`readSettings` rejects (not reachable through the UI), and clearing a finding
stores `""` rather than deleting the key — harmless, since `normalizeFinding`
reads it as absent.

**Moving WHAT WAS FOUND into ADVANCED DETAILS is a control moving on a form,
and Curtis was told after rather than before.** It is a repair of a regression
introduced in this same release — an open defect had nowhere to type, read or
clear a cause — and the alternative was leaving the app in that state while
asking. Recorded here because the rule is his call first, and this was not.


**AND A COLD READ OF THE FIXED REPAIRS WORK, which found four things a person
would have hit.** All measured against the production build before and after:

- **The scope bar blamed the CATEGORY on the window, and fired with no window
  set.** It subtracted `inWindow` from `records`, spanning two stages, so two of
  five repairs in a category and the drop-down on ALL read *"3 OUTSIDE THIS
  WINDOW"*. The Defect Log already carries this fix and the reason beside it;
  each count is measured against the stage before it now, and is zero when there
  is no window. Measured after: category alone draws no bar at all, and
  LAST 7 DAYS with every match inside it reads *"LAST 7 DAYS · 2 OF 5 REPAIRS"*
  with no window count.
- **The share heading never named the category.** With Brakes chosen it read
  *"Fixed Repairs — 2 repairs"* over a five-repair history — to the reader, no
  filter and no way to know there was one, which is the one thing a heading
  exists to prevent. It carries every filter now: *"Fixed Repairs — 🛑 BRAKES —
  2 repairs"*.
- **The status line named a file that was never written.** It recomputed the
  name from live state with the default extension, so SHARE wrote a `.txt` and
  told somebody to look for a `.html`, and with a search active it named a slug
  the file never had. The name written is kept and quoted; measured, the two now
  match exactly.
- **COPIED! outlived the list it described.** Copy under LAST 24H, switch to
  ALL, and the button still said COPIED! over a clipboard holding a different
  list. Cleared on the window, the category and the search.

Three more, each real and each smaller:

- **SHARE downloaded a file instead of sharing.** The Defect Log's SHARE calls
  `navigator.share({text})` with the clipboard behind it; this built a `.txt`
  blob, so on the shop computer the word meant something different on two
  screens. Same means now.
- **A fix note could forge an entry in the shared text.** `actionTaken` is a
  textarea and only its first line was indented, so a note containing its own
  numbered list minted a convincing extra repair — measured as 62 entries under
  a heading saying 61, including a bus that does not exist. Every line is
  indented; a test counts entries rather than reasoning about them.
- **A completion could be typed into the future.** `withinFeedWindow` is
  `minutes<=limit`, so a negative age clears every limit: a card printing next
  Tuesday sat under a heading reading TODAY, with the FIXED TODAY tile and the
  bar disagreeing about today on one screen. The input is bounded at now.

**Two false statements of mine, corrected rather than argued:** the share sends
every match, which past the fifty the page draws is MORE than the screen shows
— a row below the buttons says so now, and the comment claiming otherwise is
gone; and `completedMinutesElapsed`'s fallback was justified by a Down Sheet
clearance carrying only `updatedAt`, which the read checked and disproved —
every live completion path stamps `completedAt`, so the fallback is for legacy
and imported records and now says that.

**Four assertions were not gates, and two of my own mutations proved it:** the
download-is-not-a-copy regex required the wrong ORDER and could not catch the
regression it named; the `completedAt`-before-`updatedAt` rule was never pinned
because every fixture had the two stamps equal; the controls-row column count
was read off a declaration that never paints; and the stood-down row was checked
as a string rather than on its condition. All four repaired, and thirteen
mutations run against the result with thirteen caught.

**Both of those are now fixed** — see "One window list, and a scope bar that
names every filter" above. The bar names the category, and an unresolvable
window says so on both screens rather than degrading in silence.

**A FOURTH COLD READ found the one real bug in this release's additions**, and
it was in a claim rather than in code until it was traced. The Status Report
was asserted four times — twice in commit messages, once here, once in a test
comment, each saying "checked rather than assumed" — to show the new IBS entry.
It shows no IBS at all, and the flag fallback that followed from that was
hiding a flagged bus from the report entirely once an IBS defect was written up
on it. Answered in `ba05e2a`, with the measured table held by a test. Four
smaller findings in that read were stale numbers in this file, including a test
count that was three releases behind while the commit beside it had the right
one.

**Not verified for the header work:** a real phone or iPad, Safari, or Home
Screen standalone mode — so the status-bar colour has been measured as a
`<meta>` value and not as a strip of iOS chrome.

**Not verified:** a real phone, Safari, or Home Screen standalone mode. Android
Chrome's own long-press-to-drag sits around 500ms and `.token` is no longer
`touch-action:none`, so it can now reach this element; the code refuses it, but
that refusal has not been measured on an Android device.

### What to check once it is live

0. **Expect one slow first load per device.** The service worker's script
   changed (comment only), so every phone re-fetches the offline shell once on
   the first load after this goes out, then behaves as before. If a device
   looks stale, close it fully and reopen rather than pulling to refresh.
1. **On your phone, open the Facility Map and scroll up and down through the
   garage with your thumb landing on buses.** Nothing should move. This is the
   whole release.
2. **Hold a finger on a bus for about half a second.** It should get a blue ring
   — and buzz, on Android — and then follow your finger. Drop it on a space.
3. **Hold a bus and lift without moving.** You should get the bus's quick view,
   and the bus should stay where it is.
4. **One tap** still shows the quick view; **two taps** still open the editor.
5. On the **shop computer**, dragging a bus with the mouse should feel exactly
   as it did.
6. If 0.4s feels slow or twitchy with gloves on, say so — it is one number.
7. On the **shop computer**, open MULTI-LOCATE or SETTINGS on the map and press
   Escape. It should close. The bus editor still will not, unless you turn the
   setting on at step 9.
8. **SETTINGS → THIS DEVICE.** There should be one SOUND & VIBRATION switch,
   off. Leave it off and hold a bus on the map: it lifts with a blue ring and
   the phone stays still. Turn it on and do it again — it should buzz once.
9. **DEFECT LOG.** Open a bus with a defect, expand it. On the defect card
   there should be a `REPORTED ×N` chip once the bus has come back, a
   `LAST REPORTED` date in amber, and a `REPORTED AGAIN` control at the END of
   the action row — MARK FIXED must still be first. Tap it: it says
   `TAP AGAIN`; tap again and the chip goes up by one and the button
   says `COUNTED · REPORTED ×N`. Tap it once and walk away: it should go back
   to normal by itself after six seconds. Do it twice quickly and it should
   say it already counted.
10. **DEFECT LOG → + LOG DEFECT**, typing a defect that already exists on that
   bus. The yellow ALREADY LOGGED banner should appear. **+ COUNT THIS RETURN**
   should now say COUNTED and the number on it move; **OPEN IT** should load
   that existing defect into the form, with the banner gone and SAVE live.
11. **SETTINGS → FACILITY MAP → TOUCH & KEYBOARD.** ESCAPE CLOSES THE BUS EDITOR
   should be off, and Escape in the bus editor should do nothing, as now. Turn
   it on: open a bus, press Escape — it closes with no question. Open another,
   change something, press Escape — it should ask.
12. **Tap through all eight pages and watch the header.** FLEETSTEP should stay
   put and the navy should not change. On the Facility Map and the Down Sheet
   the title still sits 3-5px further in — that is the frame around those two
   boards, and there is a section above about it. Everything else should be
   still.
13. **SETTINGS → THIS DEVICE → HEADER COLOUR.** Change the top colour and watch
   every page follow — the bar, the kicker, the subtitle, the tab row and the
   REFRESH button, plus the strip above it on a phone saved to the home
   screen. Pick something light: the words should turn black rather than
   vanish. Then give INCIDENTS its own colour and check only that page moved.
   RESET ALL TO NAVY puts everything back. The note at the bottom of the
   panel reports the WORST of the eight, and names which page it is.
14. **If you use a theme on the Facility Map, the Defect Log or Fixed Repairs**
   — Terminal, Black, Midnight, Tactical — that page should look exactly as it
   did, header included, and its row in Settings should say *its page theme
   decides this*. Give it its own colour there and the theme stops deciding;
   press FOLLOW and it goes back.
15. **FIXED REPAIRS → any card.** There should be a `PTR` button second in the
   action row, with a `+` on it while nothing is written for that repair. Tap
   it: the PATH TO REPAIR screen opens in this page's GREEN, with SHOP TIME at
   the top and the editor already open. Write a line, SAVE, close — the button
   should lose its `+`. Open the same repair from the DEFECT LOG's focus view
   and the same words should be there; it is one library, keyed to the repair.
16. **FIXED REPAIRS on your phone.** The action row is now two by two —
   EDIT / PTR on the first line, UNDO FIX / DELETE on the second. That is the
   one UI change in this release on a screen you already use; if you would
   rather have four across, say so, it is one line of CSS. The PATH TO REPAIR
   screen itself opens as a tall panel from the TOP of a phone, which is what
   it has always done on the Defect Log; if you would rather it came up from
   the bottom like a sheet, that is also one value.
17. **WHEN IT WAS FIXED** on Fixed Repairs and **WHEN LOGGED** on the Defect
   Log should both offer LAST 30 DAYS now. Pick a category on Fixed Repairs
   with the window on ALL: the bar above the list should say how many are in
   other categories, which it used to say nothing about.
18. **DEFECT LOG, a bus already on the Down Sheet.** Type a cause in WHAT WAS
   FOUND under ADVANCED DETAILS, save, then clear it and save again. Open that
   bus's Down Sheet row, change the mechanic, save. The cause should stay
   cleared — it used to come back.

### The screen stops zooming on a phone

Curtis, with screenshots: *"as I transition through the steps, the screen tends
to get larger and a lot of times it places certain controls halfway off the
screen... make sure that even if it's used on the phone with slightly different
size specifications this will just adapt to that screen."*

**IT WAS NOT A LAYOUT BUG.** No page overflows at 1x, and a clipped-by-ancestor
audit of every route at 320 and 390 came back empty. iOS Safari **zooms the
page** when it focuses a text field computing under 16px and does not zoom back
out; his fourth screenshot is the moment it happens, on a BUS NUMBER box that
computes 12px, and the rest are the page still at that scale. It carries within
a flow — a dialog, an editor — but not across the nav, which is plain
`<a href>` and so a full document load.

**Raised to 16px**, measured at 360, 390 and 430 with no field under 16px and no
overflow: Move Bus Here's BUS NUMBER, the whole Incidents form, the Shop Talk
post form, and PATH TO REPAIR's STEPS box.

**A UI CHANGE AT EVERY WIDTH, including the shop computer**, because neither
Incidents nor Shop Talk has a phone block. The fields are about 4px taller for
it — an input 40 → 44, WHAT HAPPENED 79 → 87, the Incidents form 910 → 946.
Scoping it to touch devices only is one media query if he would rather the
desktop form stayed as it was.

**A cold read then found the fix had put a control half off the screen**, which
is the thing it was written to stop. A `<select>` is as wide as its longest
option, so WHAT KIND went 270px to 313px inside a 270px cell under an
`overflow:hidden` shell and lost its right border and chevron at 320. Shop Talk
escaped only because `.talk-row` has carried `min-width:0;max-width:100%` all
along. Incidents has it now, and both audit clean at 320 through 1180.

**27 fields still zoom and are pinned rather than fixed** — now 35 rows, because
the first version of the gate could not see a `font` shorthand, a select, or
anything after a desktop-only media block. Most are inside dense grids where
16px does not fit the column, so each needs layout work rather than a number
change. `tests/helpers/css-rules.mjs` is a real CSS reader with its own test —
sixteen bypasses asserted caught — and the record may shrink but not grow.

**Not verifiable from here.** Chromium does not do the iOS zoom, so what is
proven is that no field in those flows is under 16px. The real test is a thumb.

### The bus quick view is a glance again

Curtis, with screenshots of bus 15519: *"it looks like a mess and what I come
to find out is that we really don't need all of the details showing like
this... there has to be a better way to do this."*

It printed `bus.pendingRepair` whole — every unresolved defect's FULL label
joined with semicolons, including whatever the mechanic typed. Measured on a
bus built from his: **829 characters in one blob, in a card 628px tall whose
top sat 227px ABOVE** the top of a 390x844 screen.

**Three separate faults, and only one was the content.**

| | before | now |
| --- | --- | --- |
| content | 829 characters of free text | **136** — "12 OPEN", three names, "+9 more — open the bus for the rest" |
| width | the clamp assumed a 200px card against a 250px cap, so a bus near the left edge put 25px of it off that side | `QUICK_MAX_WIDTH`, one number the clamp and the stylesheet share, held together by a test |
| height | `translateY(-100%)` with the height unknown until it had rendered | measured first, placed second; the card is `visibility:hidden` until it is placed |

The findings, symptoms and typed notes are not gone — they are one double-tap
away on the bus itself, which is where the full record already lived.

**The first fix was wrong and a cold read caught it**: `onFocus` fires after
`pointerup`, so the old placement was written back over the measured one on
every real tap and the card still ran off the top. `showQuick` now only
*requests* a measurement and a layout effect does all the placing.

### The bus generation chips are sized for their labels

Curtis: *"I want this strip of bus drop downs to be slimmer because it's more
than wide enough for the bus numbers. Then move it slightly to the right."*

`repeat(4,minmax(0,1fr))` stretched each chip to fill the fieldset — **177px
apiece at 820 and 1180, 169px at 390**, for a label three characters long. A
fixed 64px basis sizes them to the content and `justify-content:flex-end` puts
the spare width on the LEFT, which is the nudge right.

```
320    chips 23..297   64px each, one row  (was 134px, two rows)
390    chips 93..367   64px each, one row  (was 169px, two rows)
430    chips 133..407  64px each           (was 92px)
1180   chips 679..953  64px each           (was 177px)
```

64 keeps a thumb target: the phone block already gives these 44px of height,
and 64 wide clears Apple's 44 while being a third of what they were. **One row
at every width now** — it dropped to two-up below 390 before, because four
stretched chips could not fit. On a desktop they now sit flush right with a
gap to their left, which is a look rather than a measurement and is his call if
he would rather they centred.

### The Defect Log form, which had stopped opening

**This never reached the shop** — it was introduced and fixed inside this
unpublished release — but it is worth recording because of how it got past
everything.

Pressing **+ LOG DEFECT** threw `ReferenceError: findRepairMinutes is not
defined` and the editor did not open at all. Extracting the PATH TO REPAIR
panel narrowed an import in `app/defect-log/page.tsx` from four names to one,
and a call to `findRepairMinutes` was still there 1,355 lines away, feeding the
estimate badge. Three pushes and two cold reads went past it.

**EVERY GATE WAS GREEN.** `npm test` passes because nothing in the suite
renders that editor. `npm run lint` passes because the TypeScript rule for
undefined names is off where the compiler owns it. `npm run build` passes
because vinext does not typecheck. And `npx tsc --noEmit` **did** report
it — the error COUNT was compared, 214 against 214, instead of the error LIST,
and an unrelated error had gone away in the same change. **A count against a
dirty baseline hides precisely the error you just added.**

`tests/app-shell.test.mjs` now runs `tsc` and fails on any **TS2304** — a name
with no definition — in `app/` or `src/`. Not the whole of `tsc`: this repo
carries 213 other errors and clearing them is its own job. Just the class that
is a crash rather than a complaint.

### The step-by-step helper on the defect form, off by default

Curtis: *"we need a little assistant highlighter... a highlight function that
highlights each field that they need to address next so like the bus number
being the first thing then after that the defects... and there may be a short
message that can pop up and kind of point to the optional things that you can
do and what would be next in case a person doesn't necessarily want to save a
defect and recommended on the down sheet... it should be a toggle off and on
for it."*

Switched on, the LOG DEFECT form gains a bar between its header and the
scrolling fields, and a ring on the field the bar is talking about:

| step | rings | says | will the save refuse without it |
| --- | --- | --- | --- |
| 1 | BUS NUMBER | START WITH THE BUS | yes |
| 2 | DEFECT CATEGORY | WHAT AREA IS IT | yes |
| 3 | SPECIFIC DEFECT OR SYMPTOM | CHOOSE THE DEFECT, or CHOOSE THE GROUP on a grouped category | **no** |
| 3b | the count field | FANS OUT | yes, where the catalog marks that repair counted |
| 4 | the save row | THAT IS ENOUGH TO SAVE | — |

**ONE RULE DECIDES WHAT THE FORM REFUSES, AND BOTH SIDES ASK IT.** This is the
correction a cold read forced, and it matters more than the feature. The
refusal set lived inline in `validateAndSave` as five `if(…)alert(…)` clauses,
and the helper RE-STATED it as hand-written `blocking` flags beside a comment
listing all five. The two had already disagreed about two of them, written in
the same hour:

| | the form | the helper said |
| --- | --- | --- |
| a defect already logged | all four save buttons disabled | *"THAT IS ENOUGH TO SAVE · Save it now"* |
| WORK STATUS on Fixed, no initials | an ordinary SAVE DEFECT is refused | *"REQUIRE INITIALS does not gate an ordinary save at all"* |

The second is why the copy was wrong rather than merely duplicated:
`validateAndSave` computes `completed=complete||defect.state==="completed"`, so
setting the status to Fixed turns the plain submit into a save-as-fixed.
`src/lib/defects/save-refusal.ts` owns it now, the form alerts with what it
returns, the helper points with it, and `blocking` is whether that function
returned something rather than a claim typed in a second file. Tests assert the
save path holds exactly one `alert`, that every message the rule owns appears
in no other file, and that the helper types `blocking:true` on no more than its
two refusal branches.
The rule refuses five things — no bus, no category, a required count out of
range, FIXED BY empty on a save that is or has become a save-as-fixed, and a
recent duplicate. **The specific defect does not block a save**, which the form says in its own placeholder: *"or leave it and save the
category alone."* The first draft of `src/lib/defects/form-coach.ts` marked it
required, and marked REPORTED BY required too — `requireInitials` gates FIXED
BY and has never touched REPORTED BY. Both were simply false, and a helper that
says a field is needed when it is not is worse than no helper, because it is
believed. The step is still the second stop on the walk, where Curtis put it;
it just tells the truth about saving without it.

**A BAR IN ONE PLACE AND A RING ON THE FIELD, rather than a pop-up beside
each.** He asked for a message that "can pop up", and a floating tooltip is not
what was built. Three reasons, and if he wants the tooltip the placement maths
already exists in `quick-view-position.ts`:

- a block inserted above the live field pushes everything below it down, so the
  form jumps on every step;
- a floating card has to be re-measured on every scroll of a box that scrolls
  under a thumb, which is the bug the bus quick view above was fixed for twice;
- on a phone the field being pointed at is usually the one with the keyboard
  under it, and a tooltip anchored below it lands beneath the keyboard. At the
  top of the editor nothing can cover it.

**It does not scroll the form**, and that forced one anchor to move. Moving the
page under somebody's thumb is what `BusSelector` already refuses to do with
`autoFocus` — but the closing step first rang the action row in the MIDDLE of
the form, which a cold read measured below the fold at every width from 360 to
1180. One of five steps pointed at something nobody could see. The ring is now
on the editor's footer, which sits OUTSIDE `.log-form` and is therefore on
screen whatever the form is scrolled to: measured visible at 360, 390, 430, 820
and 1180.

**THE INK IS NOT THE ACCENT, AND THAT IS MEASURED.** It was built as
`.mystery-head`'s pattern — the title in `--log-accent` on an 11% accent tint —
and swept as ink on that ground across the four Defect Log themes:

| tint | `--log-text` | `--log-muted` | `--log-accent` |
| --- | --- | --- | --- |
| 0% | 9.28 | 4.90 | 4.63 |
| 4% | 8.71 | **4.63** | 4.35 |
| 6% | 8.42 | 4.50 | 4.21 |
| 11% | 7.69 | 4.37 | **3.84** |
| 14% | 7.32 | 3.98 | 3.66 |

(worst of light, dark, midnight and tactical at each row). The accent cannot be
text here at any tint; `--log-muted` needs the ground near the surface. So the
tint is **4%**, the title is `--log-text` and the message `--log-muted`. 6%
would floor at exactly 4.50 and a floor equal to the threshold is not a
promise. Measured on the built page afterwards: title floor **8.69:1**, message
**4.63:1**, the × **4.90:1**, the ring against the field's own surface
**4.63:1**.

**A blocking step is marked by the stripe, not by the ground.** A stronger tint
would have put the message back under AA, and a difference carried by colour
alone is not a difference for everybody looking at it. The words already say
which kind of step it is; the accent stripe on the bar's left edge goes 3px to
6px as the quiet second signal.

**THE RING IS SET IMPERATIVELY on an element the helper does not own** — each
coachable field carries `data-coach="<name>"` and an effect puts
`data-coach-active` on whichever the step names, the shape
`header-theme-live.tsx` uses. Threading an `active` prop would have meant a
prop on three shared components and one CSS rule per step name, which drifts
the moment a step is added. **A renamed anchor would fail silently** — the bar
still says CHOOSE THE DEFECT and nothing lights up — so `tests/defects.test.mjs`
reads the anchors out of the form, walks every step the module can produce, and
insists that set EQUALS the set of anchors the form draws.

That gate's first version had no teeth where it counted, and a cold read proved
it: it read only `page.tsx`, where three of the five anchors appear merely as
the `coach="…"` prop — the `data-coach` attribute the ring actually scans for is
emitted in `combo-field.tsx` and `bus-selector.tsx`. Deleting it from either
left all 425 tests green. It reads all three files now, asserts the attribute
NAME is agreed between the component that sets it and the stylesheet that draws
it, and asserts set equality rather than the subset it was really checking.
Adding the duplicate and initials steps made it fail until their anchors were
added, which is the gate doing its job.

**Off until somebody turns it on**, and off is the safe READ too: anything that
is not exactly `true` in `pace-coach-v1` is off, the spelling
`feedback-settings.ts` uses. The switch is **STEP-BY-STEP HELPER ON THE DEFECT
FORM**, in Settings under DEFECT LOG → YOU & DEFAULTS. The × on the bar stops
it for that one defect without turning it off — the editor is keyed per defect,
so reopening gets it back.

**IT POINTS, IT DOES NOT GATE.** No save path reads it, and the module contains
no `alert`, `throw`, `disabled`, `preventDefault`, `localStorage`, `document.`
or `window.`.

Two of the tests guarding that were themselves broken, both found by the same
cold read. One ran `/coach/i` against the MATCHED TOKEN rather than the code,
so it was always false and always passed — proven by appending a function that
alerted, threw and returned false, which it still passed. The other matched
`className="save-log-middle` as a PREFIX, so once this change added the wrapper
`save-log-middle-actions` the `indexOf` found the DIV, which carries no
`disabled=`, and an `if(tag.includes("disabled="))` skipped the assertion
entirely — leaving the `type="submit"` button a mechanic presses as the one of
four not checked. That `if` also meant deleting `disabled` from all four would
have passed. Both are matched on the closing quote now and asserted
unconditionally across all six save controls.

Measured on the built page: the walk advances bus → category → issue → closing
with the right ring at each step and exactly one ring at a time; the ring
survives 54 keystrokes of form re-rendering; clearing the bus walks it
backwards; closing the editor leaves no ring and no bar. No clipping and no
horizontal overflow at 320, 360, 390, 430, 820 or 1180. The shared BUS NUMBER
picker carries nothing on the Down Sheet with the helper switched on. **The
cost is vertical**: the bar takes 57-63px off the scrolling form, which at
320x568 is 257px down to 194px — still scrolling, footer still reachable, but
tight on the smallest phone there is.

**Built for LOG DEFECT only**, which is what was asked for and looked at first.
Carrying it to another form is another anchor set and another walk, not another
copy of the rule.

### A sheet line that names several buses

Curtis, on the 11/01/2026 AM sheet: *"the way they wrote the IDOT line confused
scanner."* Four of that sheet's lines put a word or nothing in the BUS # column
and the buses themselves across the REASON column — 47 (`PM'S`, five buses),
48 (`IDOT`, nine), 53 (event prep, two) and 55, handwritten, three buses
sharing *No Power to Cameras*. His bus **20500 was written on line 55 and the
app filed it on line 44**, which on the paper belongs to 18506 and reads A21.

**THE PROMPT CONTRADICTED ITSELF**, and line 48 is where it bit. It said
*"Ignore … IDOT summary rows"* and, four sentences later, *"A row carrying
several bus numbers is several rows — emit one row per bus."* Line 48 is both,
so the behaviour was undefined and could differ between scans. Run through the
project's own functions, each horn is its own failure:

| it obeys | what happens |
| --- | --- |
| *ignore IDOT rows* | `scannedLineGaps` reports **line 48 MISSING** on every scan of a sheet with an IDOT row, and those nine buses are silently absent |
| *one row per bus* | nine rows all labelled **L48** — a line number that names nine buses |

The first is the worse of the two: it cries wolf on the one warning whose
stated purpose is that *"a bus that is down and not on the sheet is a bus that
goes back out broken."* A line is not a summary just because its BUS # column
holds a word, and the prompt now says so.

**THE BRACKETS ARE THE CONTENT OF AN IDOT LINE, and they were being deleted on
every scan.** *"REPEAT THE LINE'S WORDING ON EVERY ONE OF THOSE ROWS"* gave all
nine buses the reason `IDOT` and threw away `15504(FAILED-READY)`,
`18503(READY)`, `17544(PART IN STOCK)`, `17519(ABS LIGHT)` and
`17536(ABS LIGHT)` — the difference between a bus that failed its inspection,
one ready to go, and one waiting on a part. IDOT is only the line's heading.

`src/lib/down-sheet/scan-multi-bus.ts` pulls a bus's own words back out:

```
15504 -> "IDOT — FAILED-READY"      17517 -> "IDOT"
17544 -> "IDOT — PART IN STOCK"     20500 -> "No Power to Cameras"
```

and strips the other buses' numbers, because three buses' business on one
bus's row is not readable at a glance. It is a **no-op on every ordinary row**:
anything naming no five-digit bus comes back untouched, including the rows
carrying dates, times, service codes and their own brackets. A `.ts` with
storage-free inputs rather than logic in the route, so the MCP can answer with
it instead of reimplementing it.

**A LINE NUMBER IS NOT A NAME**, and `fillPrintedLineSiblings` was keyed on
one. It copies wording between rows sharing a page and a printed line number,
which holds for a line genuinely written once over several buses and is the
damage when a number was misread: 20500 landing on line 44 with its own
wording unreadable would have inherited A21 and been filed as an inspection,
under a review note reading *"read from line 44, shared with the other buses on
it"*. Two different reasons on one printed line is the signature, the paper is
the only thing that can settle which row is wrong, so that line now shares
nothing and is reported instead.

**AND THE BUSES NOBODY CAME BACK FOR ARE NAMED ON SCREEN.** LINES NOT READ
counts printed numbers and cannot see this — line 48 *arrived*; it arrived
carrying nine bus numbers in its words and one row. The review screen now says
**WRITTEN ON A ROW BUT NOT READ AS ONE** and lists them, and says nothing when
the line was split properly, so it cannot become a warning people learn past.

The prompt also now says to read the printed number off the left-hand column
rather than count rows: the numbering runs on through blank lines and through
heading lines such as HOLD BUSES, so counting drifts.

**Not verifiable from here.** `OPENROUTER_API_KEY` is not in the container, so
the model's actual output on his sheet is unconfirmed — what is proven is what
the import does with the rows it is given. Worth asking him to re-scan and read
back what line number 20500 carries.

### A completed repair stays completed

Found in the same trace. `entriesFromFleet` mints a Down Sheet row for every
bus still flagged `down`, and the mount-time effect compared that against only
the **active** entries — so a bus whose single entry was Completed looked like
a bus with no entry, and the next load wrote a new Scheduled row under
`repair-<busId>`. The repair re-opened itself and the sheet carried two rows
for one bus.

Measured on the built page, one bus seeded `down:true` with one Completed entry:

| | sheet after loading | DS badge |
| --- | --- | --- |
| before | `e1:Completed` + **`repair-a:Scheduled`** | on |
| after | `e1:Completed` | off |

Nothing is minted now, no active entry exists, and
`reconcileDownSheetMembership` clears the flag — the work is done, so the bus
comes off. **This app does not delete repair records; inventing one is the same
wound from the other side.** The legitimate case — a bus flagged down with no
entry at all — still mints, verified in the same run.

**A cold read of that fix then found two worse bugs in the line it rewrote,
and both were reproduced.** `MAX_ENTRIES` is the **active** capacity
everywhere in the app — ADD DOWN BUS, the scan import's refusal, PUT BACK, the
button, the capacity tile — and the two mint paths alone applied it to the
sheet's **total**, history included:

| seeded | before | after |
| --- | --- | --- |
| 100 Completed rows, nothing down | **98 come back — `old-98` and `old-99` destroyed**, no prompt, no undo | 100 |
| 96 Completed rows + 5 buses down with no row | 2 minted; the other **3 lost their row AND their map badge**, silently | all 5 minted, all 5 keep the badge |

The second is the failure the sheet exists to prevent — *a bus that is down and
not on the sheet is a bus that goes back out broken* — and the existing
capacity alerts could not fire, because they count active entries and there
were two. The first is the one line CLAUDE.md is bluntest about: *"Never delete
or merge repair records to simplify the UI."*

`src/lib/down-sheet/sheet-mint.ts` owns it now — a `.ts` with no JSX, so the
MCP route can answer with it rather than reimplementing it, which is also what
removed the duplicated rule. **Nothing stored is ever dropped**, the cap counts
**active** rows, and anything it cannot fit is **returned and named on screen**
rather than discarded: *"The active down sheet is full at 98 buses, so buses
18505, 17221 are flagged down with no row on it."* A third truncation inside
`entriesFromFleet` went too — it cut the candidate list before the capacity
check could even report what it dropped.

**THE DIAGNOSIS IN THE FIRST FIX WAS WRONG AND IS CORRECTED.** It blamed the
storage-event handler for the intermittency. A `storage` event never fires in
the document that wrote the key — this file says so itself about
`pace-header-theme-v1`, *"which only ever fires in the OTHER tabs"* — so on one
phone that handler never runs. The copy that actually disagreed is the
**Facility Map's** own `reconcileDownSheetMembership`: loading just the map
clears the flag. The duplicate row appeared or not depending on **which page
was opened first**, which is the open question below.

**And the test guarding it was not a gate.** It was a regex over the page's own
expression; the cold read showed it stayed green with the bug reintroduced by
hoisting the filter out of the call, and went red on a rename and on extracting
the rule to `src/lib` — the refactor `docs/ARCHITECTURE.md` asks for. It is a
behavioural test against the real function now: four harmful mutations caught,
including that one, and green on the rename.

**This is a visible flow change, not only a bug fix.** Opening the Down Sheet
now REMOVES a DS badge from the Facility Map and shows one fewer row where it
used to add a row and keep the badge. It matches what the map already did on
its own mount, but it changes what a foreman sees, so it is Curtis's to confirm.

### A Down Sheet row the app added says so, and the paper clears it

Curtis set the predicate: *"a bus having a downsheet badge on it is because
the downsheets that were scanned show the bus on the downsheet. If I upload
the new sheets, the badge goes away. Simple. We have to assume that it was
fixed, unless we decide to add the bus to the downsheet from the app
directly."* And for that case: *"a little label or something that says added
from app or added manually. That way, at least, we'll know that it was not on
the downsheet originally."*

So a row the app put on the sheet carries **ADDED VIA APP** — a dashed amber
tag beside the bus number, 6.76:1 ink, measured at 390 and 1180 with no
horizontal overflow and the REASON column untouched.

**It shipped wrong twice and a cold read caught both.** Worth recording
because both are the same mistake in different clothes.

**ONE: THE LABEL NEVER CLEARED.** The first version claimed — in the commit,
the module header, the CSS and the badge's own tooltip — that a new scan
replaces the row so the tag goes. It does not. `importScan` deliberately
writes ONTO the active row rather than minting a second defect record, so
`{...prior}` carried the flag straight through and a row tagged once stayed
tagged for good, with the wrong tag propagating to every device. The reviewer
reproduced it end to end through the real import. `clearAddedInApp` drops the
flag on the row the paper just named — with `delete`, not `false`, because
the cloud fingerprints a row by walking `Object.keys`.

**TWO: ONLY TWO OF THE APP'S FOUR CREATION PATHS STAMPED.** ADD DOWN BUS and
the row minted from the board's `down` flag did; the map's **ON DOWN SHEET**
tick (and the AI operator) and the **Defect Log** (and DEFERRED, RECOMMENDED,
the evening review) did not. That is worse than stamping none, and the reason
is the interesting part: while absence only described records older than the
field it claimed nothing — but once SOME app rows carry the tag, a row
**without** it reads as *"the office printed this"*, and the commonest gesture
on the map was writing exactly that falsehood. All four stamp now.

**And the tests had no teeth at all.** The reviewer deleted both stamp sites
in a clean checkout and all 432 tests still passed. They are behavioural now,
over the real creation functions, and six mutations were run against them —
each of the four stamps removed, the scan's clearing removed, and the clear
setting `false` instead of deleting — all six caught.

**The relocation rule is tested by moving buses, not by grepping for a word.**
Curtis: *"there should be no way that a bus can have its badge removed from
the map by simply relocating it."* The first version was a regex over three
source files that could not see `delete next.down`, a rebuild that omits the
field, or a call to an imported helper — and it missed the swap, MOVE TO AREA
and the map page itself. It drives `moveOrSwapBuses`, `reassignBusPair`,
`bulkRelocateBuses` and `moveBusToArea` now and asserts all three membership
fields survive.

**~~One honest exception, recorded rather than hidden~~ — SUPERSEDED LATER IN
THIS RELEASE, see *The DS badge no longer cares where a bus is parked*.** It
read: the map's own `downSheetBadgeView` setting can HIDE the DS badge for a
bus parked on the road; it is a per-device display filter that writes no
record, but "the badge disappeared after I moved it" is reachable on a device
with that setting on. Curtis read that and killed the setting, so the exception
no longer exists and nothing in this release depends on it. Left here rather
than deleted because the reasoning is how the decision got made.

**Known and not fixed:** a push from a device on an older release drops the
flag, because `mergeDownSheet` replaces a matched row wholesale. The tag
reappears the next time that row is created in the app and is cleared by the
paper either way, so it degrades to "no claim" rather than to a false one.

### The Down Sheet's MARK FIXED button says what it is

Curtis asked for *"its own Mark as fixed button, just like the defect sheet
has"* — about a button that already existed and had done the whole job since
it was built: confirm, complete the bus's defect, recompute status, teach the
findings memory, write an undo copy first. He did not know it was there
because it was **a bare green tick and nothing else**. A tick is not a word.

**Beside the tick was measured and clipped on a phone.** The actions cell is
114px and two 44px thumb targets with a gap already fill it, so the button came
back 45px wide with `scrollWidth` 46 against `clientWidth` 43 and the word's
right edge past the button's own. Widening the cell would have squeezed
REASON — the bug the comment further up that stylesheet exists for.

So on a phone the word goes **under** the tick; on the shop computer it sits
beside it.

| | phone | desktop |
| --- | --- | --- |
| button | 44x44, ✓ over FIXED | 55x26, ✓ FIXED |
| row height | **unchanged** | **unchanged** |

Contrast 7.76:1, no horizontal page overflow at 320 / 360 / 390 / 430 / 620 /
760 / 761 / 820 / 1180 / 1440.

**THREE FIGURES IN THIS SECTION WERE WRONG AND ARE CORRECTED BELOW**, along
with one defect the cold read found underneath them. None of this was known
when the section was first written, and it should not be published as it
stood.

**ONE: the row-height numbers measured the wrong element.** This section said
*"38px / 34px — unchanged"*. 34px is `.down-table .down-group-row td` — the
group divider, a `colSpan` cell holding no buttons at all, which could not have
changed either way. An **entry** row is floored at 55px by
`.down-table td{height:55px}` and grows with how far REASON wraps: measured
identical with the word and with the word hidden, 55px on a one-line reason and
75.59px on one that wraps to three, at 360 / 390 / 430 / 760 / 1180. The row
height is REASON's, not the button's, and the conclusion — unchanged — holds.
The stylesheet's own comment claiming *"the only cost is row height"* was wrong
in the other direction and is fixed too.

**TWO: “the column does not move” was false on the shop computer.**
`.row-actions-slots` was `grid-template-columns:auto 36px`, so the first track
took MARK FIXED's full width on an open row and collapsed to the button's
`min-width` on a completed one — 99.03px against 70px, which left DELETE
**48.5px apart between neighbouring rows** on the shop computer and 54px on a
phone. Adding the word also moved **every desktop DELETE**: 9.52px on open
rows and 5.00px on completed rows, which never draw a MARK FIXED at all. A
destructive control that wanders between rows is worse than an unlabelled one.

**Both tracks are fixed now** — `62px 36px` — and `.delete-entry{grid-column:2}`
pins DELETE to its own. A lone grid child auto-places into column 1, so on a
completed row DELETE had been sliding into the slot MARK FIXED holds and
leaving the reserved track empty beside it — which predates the word and is why
the two row types never lined up. Measured after, open and completed rows side
by side: DELETE's left edge **identical on both** at every width from 320 to
1440. The phone's word also went **up** a point, 7px → 9px, matching the badge
beside it: 7px was the smallest text on the sheet, on the device the sheet is
actually used on.

**THREE: “six more pixels buys the slack” described a mechanism that does not
exist, and the column was 11px too narrow underneath it.** Widening ACTIONS
cannot affect the button's internal fit at all — the first track is a fixed
62px however wide the cell is, and what gives the word room is that track
stretching the button to a 46px content box against the 42.56px it needs.
(Forced to DejaVu Sans it needs 45.13 of 46 and still fits, so the *"3.34px
over in DejaVu"* this section used to quote belonged to the old auto-width
button, not this one.)

What the column width actually decides is whether the **grid** fits. It is
62 + 8 + 36 = **106px**, and with `*{box-sizing:border-box}` a `th` width is
the border box, so the cell also owes 14px of padding and a 1px border —
**121px**. It was declared **110px**. It looked right only because the table's
`min-width` is deliberately larger than the sum of its columns, and Chrome
spreads that surplus: measured, 0.45px of DELETE was sitting in the cell's own
right padding at every width from 761px to about 1300px. Anyone who later made
`min-width` match the columns — which that stylesheet reads as if it were the
rule — would have pushed DELETE 3px past the table's right edge on the spot.

**ACTIONS is 121px now and `min-width` 1297px**, which keeps the surplus
exactly as it was so no other column moves. Measured before and after, one
render apart: **REASON 284.80px → 284.56px** (0.24px, and its right edge with
it), the table's scroll width 1286 → 1297, DELETE's overflow past the cell's
content box **+0.45px → −11.50px**, and no page overflow at any width. The
test checks the **declaration** rather than the render for that reason.

**And that surplus had been written into a test as a column total.** The
existing gate asserted `min-width === 1052 + busCol + actionsCol` and called
1052 *"the other seven columns"*. They total **940px**. The 112px difference is
the real surplus, and hiding it inside a constant labelled as a column sum is
what let a column 11px narrower than its own contents sit there looking
checked. The widths are summed out of the stylesheet now, all ten of them, and
the assertion is `min-width >= the sum` with the surplus bounded and named.

**TWENTY-SEVEN mutations, all caught — and the gates as first written let
SEVENTEEN through.** The second version of the word's gate computed "the last
rule whose selector string is exactly this one" and called that the effective
style. Every one of these is ordinary CSS and every one of them passed it:
`.row-actions .fix-entry b{display:none}` (a descendant form, which also has
*higher* specificity than the rule it beats), `display:none!important` (stored
as the string `"none!important"`), `display:None` (CSS keywords are
case-insensitive), `@media(max-width:900px){…}` (an at-rule dropped for not
being spelled `max-width:760px`, in a file that already uses 900px twice),
`font:900 1px/1 Arial` (a shorthand), `font-size:40%` (6.8px here, and
`parseFloat` reads it as 40), `transform:scale(0)` (a guard that required a
decimal point), `width:0`, `position:absolute;left:-9999px`,
`color:#e4f4e8` (the button's own fill — only `transparent` was checked), and
a plain later rule appended anywhere in the file. Two of them put the DELETE
jitter back.

**A regex over a stylesheet cannot see the cascade**, so the gate stops being
one. `effectiveStyle` in `tests/helpers/css-rules.mjs` orders every rule that
targets an element by `!important`, then specificity, then source position, and
evaluates the at-rules against a real viewport width; sizes go through
`declaredFontSizePx`, which reads the `font` shorthand and converts units. It
is walked over **both row types** — an open row and a completed one are
different elements, and a completed row draws no MARK FIXED at all — at phone
and desktop widths. It is a tripwire and not a rendering engine, and what it
cannot see is written where it is defined.

One hole it found in the shared reader itself: `declaredFontSizePx` rejected a
bare `0`, so `font-size:0` came back as *"no size declared"* and the 8px above
it stood. A unitless zero is a valid length; it reads as 0 now, and that was
the last of the twenty-seven.

### A repair can carry more than one part

Curtis, from the floor: *"we made a blooper, we assumed that each repair only
takes one part. I just saved a fix like a bus and I was trying to find a way to
add a second part."*

He was right and there was nowhere to put it. A defect record held `partsUsed`,
`partNumber` and `partName` — **exactly one part** — so a repair that takes a
gasket and the sensor behind it forced a choice between them. The pair is a
**list** now, with **ADD ANOTHER PART** under it and a REMOVE on each row.

**Nothing on disk is rewritten.** A repair saved with one part reads back as a
one-part list, computed at read time, the way catalog renames and a Down Sheet
entry's `repairItems` already work. The fix Curtis had just saved keeps its part
and can take a second.

**The first part stays mirrored into `partNumber`/`partName`, and a one-part
repair stores no array at all.** Two reasons, both rules this app already
follows: the Shop Cloud ships every field it has no column for inside the row's
`detail` blob, so a device on an older release receives `parts` and cannot read
it — mirrored, it shows the first part instead of none; and `rowFingerprint`
walks `Object.keys`, so growing a `parts:[…]` on every one-part repair would
move that row's fingerprint on a save that changed nothing a person could see.
Going back down to one part **deletes** the key rather than setting it to
`undefined`, the spelling `setBusHold` uses.

**One component, two routes.** The Defect Log's LOG DEFECT form and Fixed
Repairs' completion editor had the same block of JSX copied into both files; a
list is more to get wrong than a pair of inputs, so it is
`src/components/defects/parts-used-list.tsx`. It holds **no rules** — every
decision about what a part is and what gets stored is in
`src/lib/defects/defect-parts.ts`, so the MCP route can ask the same question
instead of reimplementing it. A test asserts the component names no rule.

**The shop's parts memory now learns every part, not the first.** That code read
`partNumber` alone, which was the whole of a repair when a repair could only
have one; on a two-part repair it taught the shop about the gasket and forgot
the sensor. A part with only a **name** is kept on the record — *"the long bolt
behind the alternator"* is how a part gets recorded when nobody can find its
number — but teaches the memory nothing it could suggest, so it is not learned
and is **not** counted as a missing number either.

Decisions worth having on the record: **each part carries an id**, because
keying rows by array index makes the row under somebody's finger change identity
when a row above it is removed, which is how a list deletes the wrong entry;
**removing the last row leaves one blank row** rather than an empty section,
since unticking PARTS USED is the one gesture that means no parts were used; and
**a blank row is never stored**, so pressing ADD ANOTHER PART and changing your
mind leaves nothing on the repair's history.

**Measured in the built page** at 390 and 1180, driving the real form: two parts
typed and both held; removing the FIRST row leaves the second's values, which is
the id-keying doing its job and what index-keying would have got wrong; REMOVE
absent on a lone row and present on two; ADD 318x44 on a phone and 700x36 on the
shop computer; REMOVE 318x44 and 78.5x36; the row separator **0px on the first
row and 1px dashed on the second**, so a one-part repair looks exactly as it did;
nothing clipped, no page overflow, no page errors.

**One thing NOT established, and not introduced here.** Every control in that
form's ADVANCED DETAILS section — including the **PARTS USED checkbox that
predates this change** — could not be reached by a synthetic pointer event at
any scroll position: the form's own sticky action bar
(`.save-log-middle-actions`) reports as the topmost element over that region. It
behaves identically for controls that have shipped for releases, so it is either
a harness artifact or a pre-existing reachability problem with that section on a
narrow screen. Either way it is **not** something this change caused, and it
wants its own look rather than being bundled in here. Everything above was read
off the live DOM instead.

### The button reads MARK FIXED, the same as the Defect Log's

Curtis asked for *"its own Mark as fixed button, just like the defect sheet
has"*, and the Defect Log's `.quick-fix` reads **MARK FIXED**. The Down Sheet's
shipped reading just **FIXED**, so the two surfaces said different things about
the same gesture. It reads MARK FIXED now, and the gate takes the expected
label out of `app/defect-log/page.tsx` rather than typing it here, so renaming
one without the other fails the build.

It cost room, and the room came out of horizontal scroll rather than out of
REASON. Measured inline at 8px: tick 11.45 + gap 5 + word 56 + padding 14 +
border 2 = **88.45px**, and 93.47px forced to DejaVu Sans, so the first grid
track is **96px**, ACTIONS **155px** and the table's `min-width` **1331px**.
The table is `table-layout:fixed` inside `.sheet-scroll`, so it gets longer:
measured, the sheet's scroll width went 1297 → 1331 (+34px) and REASON
284.56px → 283.88px (0.68px).

**On a phone the two words wrap inside the 44px target**, rather than widening
it — the widest line is FIXED at 31.56px in DejaVu Sans against a 42px content
box, and the button comes out 44x48.69 with nothing clipped. **It costs no row
height**, and that was measured by isolation rather than by comparing two
different rows: the same open row with the label and with the label's box
removed is the same height at 360 / 390 / 430 / 760 / 1180. The tallest cell in
a row is the line number, not the button.

DELETE's left edge is identical on open and completed rows at 320 / 360 / 390 /
430 / 620 / 760 / 761 / 820 / 1180 / 1440, and there is no page overflow at any
of them.

### The DS badge no longer cares where a bus is parked

**`downSheetBadgeView` is gone.** It was a three-way filter on the Facility
Map — All / Road-Ready / Off Road — that hid the DS badge for every bus outside
the chosen group. It wrote no record, which is why the last release recorded it
as an honest exception rather than removing it. Curtis killed it on the rule he
had already given: *"there should be no way that a bus can have its badge
removed from the map by simply relocating it."* A filter keyed on `bus.l` does
exactly that, record or no record, because the badge is the thing a foreman
sees.

**SHOW BADGE in Settings is the one switch now, and it is all-or-nothing by
design.** Turning every badge off is a decision about the display; losing one
bus's badge by driving it to the road is the app lying about the sheet.

Removed: `src/lib/down-sheet/down-sheet-badge-view.ts` (including
`isReadyRoadLocation`, one more prefix matcher gone — the count in
`docs/roadmap/facility-config.md` is 15 files and ~69 occurrences now), the
`app/_components/down-sheet-badge-menu.tsx` menu, its styles, and the field
from `BoardSettings`.

**AND THE WHOLE DECISION MOVED INTO THE LIB, because the first gate for this
rule only read a name.** The map composed the badge set itself —
`showDownSheetBadges ? downSheetBadgeBusIds(...) : []` written inline — and a
cold read chained **one `.filter()`** onto that expression, dropped every bus
parked at a `road-` slot, and measured the badge gone from a bus on the sheet
**with all 433 tests green**, because the assertion was an unanchored substring
match on `app/page.tsx`. That is precisely the rule Curtis killed the setting
for, reachable in one line.

`mapDownSheetBadgeBusIds` is the whole of it now: membership and the SHOW
switch, with **no access to `bus.l` at all**, so the function cannot see where
a bus is parked. The gate drives it — over a fleet, over the same fleet with
every bus relocated, and with the switch off — rather than reading the page for
a word, and it anchors the map's call on its closing `)),` so nothing can be
chained onto it. Six mutations run, including that one and the same rot done
inside the lib instead; all six caught.

**A device that already holds `downSheetBadgeView:"off-road"` keeps it, inert
— and making that true took a second fix.** The claim was written about
`writeBoardSettings`, which does merge over the stored copy. But **the Facility
Map did not use it**: it wrote `pace-board-settings-v1` wholesale with its own
`JSON.stringify`, so opening the map once deleted every field the build does
not name. Measured on a device holding `downSheetBadgeView` and a `futureField`
— **both gone on the first render**, which also means the appeal to
`futureField` proved the opposite of what it claimed. The map hands its object
to `writeBoardSettings` now, so the merge is real, and a test asserts the map
does not go back to replacing the whole record. The bug was wider than the dead
field: any setting a LATER release adds was being deleted by an older build
opening the map.

Verified in the browser on exactly such a device: three buses on the sheet, one
on the road, one in a garage space and one in CNG West, **all three keep their
badge** where the old filter hid two of them.

**The control's removal DID leave two holes, and both are closed.** The first
draft of this paragraph said it left none; a cold read measured otherwise.

The bar's height was right either way — **208px over 4 rows at 621 / 700 / 760
/ 800, 53px over 1 row at 801 / 1180, identical before and after** — but the
control was pinned to column 3 of a four-column grid, so with it gone PAGES
auto-placed into column 3 and **column 4 was left empty: 143.3px at 621 rising
to 195px at 800.** PAGES spans columns 3-5 now. (The `grid-column` this change
first edited, on the bare `.ai-operator-command` rule, turned out to decide
nothing at all — `.command-bar>.ai-operator-command` further down the same file
is more specific and already said 3/5. That dead declaration is removed with a
note pointing at the block that owns it.)

**The second hole was on the phone, which is the device this app is used on,
and it was the one place not measured.** The FILTERS sheet drew the DS menu
too. It was a two-column grid with the first child spanning both, because it
held three controls; with two, **MYSTERY BUSES sat alone in column 1 with the
other half of the row empty beside it — 183.5px of nothing at 390, 298.5px at
620.** It is one column now, which is what the FIND and MORE sheets beside it
already were.

Measured after both fixes: row 2 of the bar is full — HIGHLIGHTS and PAGES at
293px each at 621, 382px each at 800 — and the FILTERS sheet's two controls each
fill their row at 360 / 390 / 430 / 620. No gap wider than the gutter inside any
row, and no page overflow at any width, before or after.

**Two holes in that bar are older than this change and are NOT fixed here.**
Row 3 holds REFRESH, ACTIONS and FULL SWEEP in three of four columns, and row 4
holds AI OPERATOR across columns 3-4 with 1-2 empty. The comment above that
block says *"All three share a row now"* about REFRESH, ACTIONS and the
operator — the bar has not had that layout for some time; FULL SWEEP sits in the
third slot and the operator is on its own row. Recorded rather than fixed:
closing those means choosing a new row layout for the Facility Map's controls,
which is Curtis's call and not what he asked for.

**One unrelated thing found while measuring, not fixed:** `app/page.tsx:204`
reads `ST[bus.s][0]` with no fallback, so a board holding a bus status outside
`service|defect|shop|out|decommissioned|unknown` white-screens the Facility Map
into the crash guard. It took a hand-written fixture to produce one, and no
code path in the app writes such a value today — but `migrateBuses` does not
normalise it either, so a corrupt or hand-edited record would. Recorded rather
than fixed, because it is nothing Curtis asked for and the fix is in the map's
hydration path.

### NO HEAT, and DEFECTS LOGGED means logged by hand

**A plain NO HEAT under Heating.** Curtis: *"I cannot always confirm why there
is not heat on the spot, but I can confirm the heat doesn't work immediately.
This is for convenience."* Every other entry in that group named a place or a
part — the front dash, the floor, the boost pump, the defroster — so a foreman
who could only say the heat was dead had to guess at a cause or reach for
"Other heating repair", which says nothing. Cooling has had **No cooling** in
that slot since the catalog was written; this is its heating twin and sits
first for the same reason.

It joins **No Heat Buses** without being told: that filter matches the group
prefix rather than a list of wordings. Added to both `REPAIR_OPTIONS` and
`REPAIR_OPTION_GROUPS`, which CLAUDE.md requires to stay in step — a mutation
adding it to only one is caught.

**DEFECTS LOGGED no longer lists rows off a scanned sheet.** Curtis, looking
at a share that had: *"I have no reason to share something off the down sheet
because the down sheet is already coming from the source — the down sheet is
located in an office, so I'm not gonna send them something that they already
have written down... for this particular function, no, just things that were
logged by hand."*

A scanned row becomes a real defect, correctly stamped `source:"down-sheet"`,
and its `createdAt` is **when the scan ran** rather than when anybody logged
anything — so importing yesterday's paper at 20:00 dropped the whole sheet
into "the last 8 hours" at once. That is what put ninety rows behind a SHOW
ALL on a list whose entire claim is "this is what got logged".

Measured on the built page against his own screenshot's data: `17541` and
`17560` stay, `18505 Inspection — C-24` and `20501 SPECIAL EVENT BUS / [HOLD
FOR EVENT PREP]` drop out.

**Only the paper is excluded.** Typing into the Defect Log, into the map's bus
editor, or speaking to the AI operator is all somebody logging it. And a
defect keeps the source it was born with — `applyDownEntryToFleet` writes
`linked?.source||"down-sheet"` — so a defect logged by hand that LATER lands
on a sheet stays in the list. Somebody logged it; the paper catching up does
not take that away.

The drawer says so above the share buttons, which is the last place anybody
looks before sending the list on: **LOGGED BY HAND ONLY — BUSES READ OFF A
SCANNED DOWN SHEET ARE NOT LISTED HERE. THE DOWN SHEET PAGE SHARES ITS OWN
LIST.** 12.15:1, measured.

**No new share function was built**, because the Down Sheet already has COPY
LIST and SHARE PAGE of its own — which is what Curtis wanted for the case
where a coworker does want a copy of the sheet.

### Open questions for Curtis

**Should a bad reply fail the shell install the way a dropped connection
does?** See the service-worker section above — today a 503 or a captive
portal's login page does not fail it, and the portal's page gets cached as a
core page.

**Should the Status Report offer an IBS SCREENS line?** He asked for three
counts — *"Fairbox and Venture separate. and cubic screen"* — and three is what
it prints. `tech.ibs` has been counted the whole time and shown nowhere, so a
bus whose only tech fault is an IBS screen and which does not have the
IBS/VENTRA flag ticked does not appear in the report at all. Adding it is a row
in the include list and a line in the two renderers, plus putting `ibs` back
into the flag fallback so a flagged bus is not counted twice. Nothing has been
added, because the report is what his superintendent sends upward and that is
not a section to invent for him.
