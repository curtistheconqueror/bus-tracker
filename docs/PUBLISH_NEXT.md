# Publish next

**STATUS: 194 PENDING.** Scrolling the Facility Map on a phone no longer moves
buses — a bus follows a finger only after the finger has been held on it. Also
in 194: Escape closes the map's SETTINGS, MULTI-LOCATE, MOVE BUS HERE, REMOVE
BUS and AI OPERATOR layers, each of which fixes the page behind it; and
**one SOUND & VIBRATION switch in Settings, OFF**, with a test that stops
anything audible being added later without going through it; plus an optional
**ESCAPE CLOSES THE BUS EDITOR**, also off.
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

## 194 — a bus follows a finger only after the finger has been held

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
project. **No new LocalStorage keys, and no key renamed** — this release reads
and writes no records at all.

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

### Verified

Gates re-run on **the commit this file is updated in**, which is what "this
release's source" means and is why no hash is written here any more. Two
earlier drafts of this section went stale within a commit of each other — one
cited `319f2cd`, a hash no ref contains after the rebase onto Codex's 193, and
both quoted a test count that the next commit moved. A number copied forward is
the thing `.claude/skills/fresh-context-review` was written about, and naming a
hash in a section that outlives it is how it keeps happening:

- `npm test` — **393 pass, 0 fail**
- `npm run lint` — clean, no output
- `npm run build` — Build complete

**Measured in Chromium against the production build**, at 360, 390, 430 and 820:
**32 gesture checks, all passing** — a scroll swipe on a bus scrolls ~190px and
leaves it where it was; a 250ms pause then a swipe still scrolls; a 550ms hold
then a drag lands the bus under the finger with the page unmoved; a cancelled
drag clears the ring and gives scrolling back; a hold lifted in place shows the
quick view; single and double tap unchanged; and the page scrolls after a drag.

A **cold read of the diff from a fresh context** found six defects, every one
real, each answered in `033cb98`. Two are worth knowing about because they were
reintroductions of the very bug being fixed:

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
   Escape. It should close. The bus editor still will not — see the question
   below.
8. **SETTINGS → THIS DEVICE.** There should be one SOUND & VIBRATION switch,
   off. Leave it off and hold a bus on the map: it lifts with a blue ring and
   the phone stays still. Turn it on and do it again — it should buzz once.
9. **SETTINGS → FACILITY MAP → TOUCH CONTROLS.** ESCAPE CLOSES THE BUS EDITOR
   should be off, and Escape in the bus editor should do nothing, as now. Turn
   it on: open a bus, press Escape — it closes with no question. Open another,
   change something, press Escape — it should ask.

### One open question for Curtis

**Should Escape close the BUS EDITOR too?** It is the one modal whose only way
out is its X, so it is the one that traps — but Escape there discards whatever
was typed and deletes an unsaved new bus, exactly as the X does today, and
unlike the other five it has no backdrop tap already doing that. Three
options: leave it as it is, let Escape close it the way the X does, or let
Escape close it but ask first when something has been typed. Not built either
way until he says.

**Should a bad reply fail the shell install the way a dropped connection
does?** See the service-worker section above — today a 503 or a captive
portal's login page does not fail it, and the portal's page gets cached as a
core page.
