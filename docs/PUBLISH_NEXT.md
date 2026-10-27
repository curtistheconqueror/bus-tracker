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
themes that each decided one.
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
is the commit this file is updated in, on top of `033cb98`.

```
$ git log --oneline a009c08..HEAD
033cb98 Every finding from the cold read, and five of six were mine
b44f370 Make a bus wait for a held finger before it follows one
8280d61 Record application release 193 live as Sites version 189
6681407 A cold read of the diff before every code push
b387c33 Queue application release 193 from the reviewed PR41 merge
```

**Three of those five carry no application change.** `8280d61` is Codex's own
193 release record, `b387c33` was 193's queue entry, and `6681407` added the
cold-read gate to `CLAUDE.md`, `docs/NEXT_SESSION.md` and
`.claude/skills/fresh-context-review/` — process, not product.

```
$ git diff --name-only a009c08..HEAD
.claude/skills/fresh-context-review/SKILL.md
CLAUDE.md
PROJECT_HANDOFF.md
README.md
app/globals.css
app/page.tsx
docs/NEXT_SESSION.md
docs/PUBLISH_NEXT.md
docs/RELEASES.md
docs/archive/PUBLISH_RELEASE_193.md
tests/app-shell.test.mjs
tests/fleet.test.mjs
```

```
$ git diff --name-only a009c08..HEAD -- app src
app/globals.css
app/page.tsx
```

**The application change is two files.** One stylesheet, one component.

```
$ git diff --shortstat a009c08..HEAD
 12 files changed, 545 insertions(+), 50 deletions(-)
```

```
$ git diff --name-only a009c08..HEAD -- supabase package.json package-lock.json .github public worker
(nothing)
```

**The no-infra-change check comes back empty.** `public/sw.js` is untouched, so
there is no service-worker cache bump and no app shell re-download.

### Migrations

**None.** No schema change, no policy change, nothing executed against the live
project. **No key renamed, and nothing in the fleet's records is read or
written** — the gesture, Escape and re-report work touches no settings file at
all, and the three settings this release adds are per-device preferences.

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

### Verified

Gates re-run on **the commit this file is updated in**, which is what "this
release's source" means and is why no hash is written here any more. Two
earlier drafts of this section went stale within a commit of each other — one
cited `319f2cd`, a hash no ref contains after the rebase onto Codex's 193, and
both quoted a test count that the next commit moved. A number copied forward is
the thing `.claude/skills/fresh-context-review` was written about, and naming a
hash in a section that outlives it is how it keeps happening:

- `npm test` — **402 pass, 0 fail**
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
- **The Settings panel at 360, 390, 430, 820 and 1180** — no overflow, all
  eight FOLLOW buttons on one x, every tap target 44px or more. It shipped
  with no CSS at all and rendered as 519px of run-together inline text; that
  was found by looking at it, not by reading it.
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

**Not verified for the header work:** a real phone or iPad, Safari, or Home
Screen standalone mode — so the status-bar colour has been measured as a
`<meta>` value and not as a strip of iOS chrome.

**Not verified:** a real phone, Safari, or Home Screen standalone mode. Android
Chrome's own long-press-to-drag sits around 500ms and `.token` is no longer
`touch-action:none`, so it can now reach this element; the code refuses it, but
that refusal has not been measured on an Android device.

### What to check once it is live

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

### One open question for Curtis

**Should a bad reply fail the shell install the way a dropped connection
does?** See the service-worker section above — today a 503 or a captive
portal's login page does not fail it, and the portal's page gets cached as a
core page.
