# Publish next

**STATUS: 194 PENDING.** Scrolling the Facility Map on a phone no longer moves
buses — a bus follows a finger only after the finger has been held on it.
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

### Verified

Gates on `319f2cd`:

- `npm test` — **389 pass, 0 fail**
- `npm run lint` — clean, no output
- `npm run build` — Build complete

**Measured in Chromium against the production build**, at 360, 390, 430 and 820:
**32 gesture checks, all passing** — a scroll swipe on a bus scrolls ~190px and
leaves it where it was; a 250ms pause then a swipe still scrolls; a 550ms hold
then a drag lands the bus under the finger with the page unmoved; a cancelled
drag clears the ring and gives scrolling back; a hold lifted in place shows the
quick view; single and double tap unchanged; and the page scrolls after a drag.

A **cold read of the diff from a fresh context** found six defects, every one
real, each answered in `319f2cd`. Two are worth knowing about because they were
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
