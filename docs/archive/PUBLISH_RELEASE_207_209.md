# Publish next

**STATUS: THREE RELEASES PENDING ON `main` — application release 207, from `4f30c91`; 208, from `f0e12b2`; and 209, from `9a7cc1f`. NOT PUBLISHED.** Each sits on top of the one before; **publish `9a7cc1f` (release 209), which carries all three.** All are Defect Log changes Curtis asked for on 2026-11-23 and 2026-11-24; 208 also gives Fixed Repairs' existing WHEN FIXED drop-down a PREVIOUS SHIFT choice. No sync, no AI Operator, no storage key. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 196 / application release 206, deployed 2026-11-23 at 23:36:15.204248 UTC from `e649c644c28b66f4bc7d4494726a79834a80164b`. Rollback for 207–209: Sites 196 at `e649c644c28b66f4bc7d4494726a79834a80164b`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains separately held and unmerged, excluded from this release. The 198–206 queue as published: [releases 198–206](archive/PUBLISH_RELEASE_198_206.md). Publication evidence and limits are in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 209 | The ALL drop-down is never lit, so it no longer reads as a third card view beside a lit DETAILED | On `main`, pending publication — **publish this; it includes 207 and 208** |
| 208 | ALL is a drop-down of when defects were logged — THIS SHIFT, a new PREVIOUS SHIFT, TODAY, 24H, 3/7/30 DAYS; Fixed Repairs gets PREVIOUS SHIFT too | On `main`, pending publication |
| 207 | The Defect Log's top box holds + LOG DEFECT and SEARCH alone; ALL, DETAILED, COMPACT move under the feed's count line; IN PROGRESS and FIXED TODAY buttons removed; the count line is bigger; LIVE REPAIR FEED is renamed LIVE DEFECT FEED | On `main`, pending publication |

## 209 — ALL is never lit

### Source

Release source: `9a7cc1f`. Previous: `2608c8c`, the commit that queued 208. Run at `9a7cc1f`:

```
$ git log --oneline 2608c8c..9a7cc1f
9a7cc1f Release 209: ALL is never lit, so the only blue in the feed row is the card view
```

```
$ git diff --name-only 2608c8c..9a7cc1f -- app src tests
app/defect-log/defect-log.css
app/defect-log/page.tsx
tests/app-shell.test.mjs
tests/settings.test.mjs
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 2608c8c..9a7cc1f -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key added or renamed.

### What changed

Asked whether ALL should look different from DETAILED when both were lit in the same blue side by side, Curtis: *"Yes that is fin[e]"* to the proposal of not lighting ALL at all.

1. **The ALL drop-down's face is a plain outlined box at all times.** Its face already says in words which window is in force ("ALL ▾", "PREVIOUS SHIFT ▾"). The only blue left in the row is DETAILED or COMPACT, plus a saved view (OPEN, IN PROGRESS, FIXED TODAY, DOWN SHEET) while one is in force, which is still drawn lit.
2. Nothing about what it does changed: picking a window still shows every defect logged in it and clears a search or a lit saved view.

### Verified

- `npm test` on Windows: **484 pass, 0 fail** (two assertions updated, one added: the stylesheet must not light it). `npm run lint`: no error, the one existing warning.
- **In the dev build at 390:** ALL is white with the grey border of an unlit button, DETAILED is the accent blue, COMPACT is unlit; three 109px × 44px boxes, no sideways scroll.
- **Cold read, one subagent, before the push:** no problems found. It checked that no other rule lights the label, that a saved view still shows as lit, and that no comment still calls ALL lit.
- **Not done:** no phone.

## 208 — ALL is a drop-down of when defects were logged, with PREVIOUS SHIFT

### Source

Release source: `f0e12b2`. Previous: `d80c2d8`, the commit that queued 207. Run at `f0e12b2`:

```
$ git log --oneline d80c2d8..f0e12b2
f0e12b2 Release 208: ALL is a drop-down of when defects were logged, with PREVIOUS SHIFT
```

```
$ git diff --name-only d80c2d8..f0e12b2 -- app src tests
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/fixed-repairs/page.tsx
src/lib/defects/feed-window.ts
tests/app-shell.test.mjs
tests/defects.test.mjs
tests/settings.test.mjs
```

```
$ git diff --shortstat d80c2d8..f0e12b2
 7 files changed, 244 insertions(+), 46 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only d80c2d8..f0e12b2 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key added or renamed. The window picked is not stored; the page opens on ALL, as it did.

### What changed

Curtis: *"the ALL button should have a drop down and this way u can select if u want to see all defects from current shift, previous, 24 hours, the week... basically we have this list for the share function."*

1. **ALL is a drop-down.** Its choices are the feed's one window list — the same one WHEN LOGGED in ADVANCED ACTIONS and Fixed Repairs draw: ALL, THIS SHIFT, **PREVIOUS SHIFT** (new), TODAY, LAST 24H, LAST 3 DAYS, LAST 7 DAYS, LAST 30 DAYS. The button's face says which is in force ("ALL ▾", "PREVIOUS SHIFT ▾"). A real `<select>` lies invisible over the face, so a phone opens its own picker; it is 16px so iOS does not zoom the page into it.
   - Picking any window shows ALL defects logged in it: it drops a lit saved view and the search, as pressing ALL always did. Picking ALL again does that too while a search or a lit view is in force — a select only reports a change, so in that state it sits on a blank choice that cannot be picked.
   - The bar that names the window and offers SHOW ALL DATES is unchanged and still appears.
   - WHEN LOGGED in ADVANCED ACTIONS works as before: it narrows by date alone and leaves a lit view and the search as they are.
2. **PREVIOUS SHIFT** is the shift before the one that owns now, by start time: 1st during 2nd, 2nd during 3rd, 3rd during 1st. **Its window ends where THIS SHIFT begins**, so the half-hour handover belongs to the incoming shift — the rule the shift clock already follows — and every defect is in exactly one of the two. At 15:00 it reads "LOGGED 1ST SHIFT · 06:00–14:00". It is measured the same way THIS SHIFT is, so a daylight-saving night cannot open a gap between them. Hours that leave a gap, or a clock that cannot be read, degrade to showing every date with the bar saying so, the way THIS SHIFT does.
3. **Fixed Repairs' WHEN FIXED drop-down offers PREVIOUS SHIFT too**, because it draws the same list — two lists that must agree about a window are how they come to disagree. Both pages honour the window's near edge (`feedWindowRange`).

The share chip rows in the quick-filter drawers and on the Down Sheet boards keep their own short list (`time-window.ts`), unchanged.

### Verified

- `npm test` on Windows — **484 pass, 0 fail** (one new test; others updated for the range). `npm run lint` — no error, the one existing warning. Type-check 238, unchanged.
- **The window, by test:** the previous shift's real start and end at 15:00, 23:00, 03:00 and 07:00 (3rd shift across midnight); every minute from 06:00 to 15:00 is in exactly one of THIS SHIFT and PREVIOUS SHIFT, the handover and the first minute of the shift included; a gap in the hours and an unreadable clock degrade.
- **In the dev build:** the face fits at 360 ("PREVIOUS SHIFT ▾" on two lines, 44px), 390 and 1180 with no sideways scroll; picking PREVIOUS SHIFT at 21:45 showed "LOGGED 1ST SHIFT · 06:00–14:00 · 1 OTHER BUS HIDDEN" and left out a defect logged at 15:24; with a search typed, picking ALL cleared it; Fixed Repairs lists PREVIOUS SHIFT and filters with it.
- **Cold read, one subagent, before the push.** Answered:
  - picking ALL when ALL was already chosen did nothing, so a search or lit view could not be cleared from it: fixed (item 1);
  - a defect logged in the 14:00–14:30 handover was in both THIS SHIFT and PREVIOUS SHIFT, against the incoming-shift rule: fixed, the window ends where this shift begins (item 2);
  - on a daylight-saving night the two windows could leave a gap: fixed by measuring both the same way;
  - comments in `feed-window.ts` and the page that were no longer true: corrected;
  - the two drop-downs set the same window with different side effects: kept and described in the code; WHEN LOGGED's behaviour is unchanged;
  - the face's focus ring stays after a mouse pick on the shop computer: left — the select is invisible, and `:has()`, the way to ring only keyboard focus, is dropped by this build's CSS pipeline;
  - a short shift nested inside a long one in custom hours gives an odd previous shift: left, the shop's hours do not do that.
- **Not done:** no phone; the iOS picker itself has not been seen.

### What to check once it is live

1. On a phone, Defect Log: tap ALL. The phone's picker opens with the eight choices. Pick PREVIOUS SHIFT: the button reads "PREVIOUS SHIFT ▾" and the bar above SEARCH names the shift and its hours.
2. Type a bus number in SEARCH, then pick ALL: the search clears.
3. Fixed Repairs: WHEN FIXED lists PREVIOUS SHIFT.

### Rollback

Sites 196 / release 206 at `e649c644c28b66f4bc7d4494726a79834a80164b`, while nothing after 206 is live.

## 207 — the Defect Log's top box: LOG DEFECT and SEARCH by themselves

### Source

Release source: `4f30c91`. Previous: `76a41e6`, Codex's record of 206 going live. Run at `4f30c91`:

```
$ git log --oneline 76a41e6..4f30c91
4f30c91 Release 207: the Defect Log's top box holds LOG DEFECT and SEARCH alone
```

```
$ git diff --name-only 76a41e6..4f30c91 -- app src tests
app/defect-log/defect-log.css
app/defect-log/page.tsx
src/lib/defects/defect-log-display-settings.ts
tests/app-shell.test.mjs
tests/defects.test.mjs
tests/settings.test.mjs
```

```
$ git diff --shortstat 76a41e6..4f30c91
 6 files changed, 145 insertions(+), 27 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 76a41e6..4f30c91 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key added or renamed. The feed title is a Settings wording inside `pace-defect-log-settings-v1`; a device holding the old default "LIVE REPAIR FEED" reads the new one at read time, and nothing on disk is rewritten. A wording somebody typed still wins.

### What changed

UI changes Curtis asked for on 2026-11-23, on the Defect Log page only. His goal: *"get the log defect and search field sort of by themselves so it's easy to see and no guess work. Too many tabs around makes it look intimidating."*

1. **LIVE REPAIR FEED is now LIVE DEFECT FEED.**
2. **IN PROGRESS and FIXED TODAY are gone as buttons.** The filters still exist: a device whose saved DEFAULT VIEW is one of them still opens on it, and that button is drawn, lit, beside ALL until it is pressed — the way OPEN and DOWN SHEET already were. Pressing it goes back to ALL for the rest of that visit.
3. **ALL, DETAILED and COMPACT moved under the feed's count line**, in one even row across, 44px tall at every width, and the CARD VIEW label is gone. The box at the top now holds + LOG DEFECT and SEARCH and nothing else.
4. **The count line is bigger:** 13px on a phone (was 7px), 10px on a wider screen. With large counts the ESTIMATED badge wraps whole onto its own line, flush left.

### Verified

- `npm test` on Windows — **483 pass, 0 fail** (one new test, and new assertions in two others), re-run after rebasing onto `76a41e6`. `npm run lint` — no error, the one existing warning. Type-check 238, unchanged.
- **In the dev build, measured:** at 360, 390 and 430 the row is three equal buttons with nothing cut off and no sideways scroll; at 1180 it sits on its own line under the title, three 149px buttons. With a saved IN PROGRESS default the row is four buttons, which fit at 360 and at 440 in the Classic (serif) font once they drop to 11px below 460 wide. Pressing the lit IN PROGRESS went back to three buttons and ALL. With the real board's count ("88 BUSES · 315 DEFECTS · 840h 24m ESTIMATED", put on screen by hand), the badge drops to its own line flush left at 360 and 430.
- **Cold read, one subagent, before the push.** Answered:
  - DETAILED and COMPACT were 40px tall above phone width, where they had been 44: fixed, 44 everywhere;
  - the moved notice line's size was decided by load order against `minimalist.css`: fixed by specificity;
  - one test passed only because a comment split "CARD VIEW" across two lines: fixed, it now checks the drawn text;
  - comments in the page and two tests still described IN PROGRESS and FIXED TODAY as buttons: corrected;
  - four buttons might not fit at 421–440 in the Classic font: measured at 440, the smaller size now applies up to 460;
  - `:has()` was dropped by the build's CSS pipeline, found while measuring: a class is used instead;
  - historical comments that name LIVE REPAIR FEED: left, they describe what it was called when they were written;
  - CSS for `.log-filters` and `.card-view-selector` now matches nothing: left for a separate cleanup;
  - ALL and DETAILED both lit in one colour in one row: shown to Curtis as a question, not changed;
  - with a saved default view, the row draws three buttons and then four once the setting loads: the same as OPEN and DOWN SHEET always did, left.
- **Not done:** no phone.

### What to check once it is live

1. On a phone, open the Defect Log: the top box has + LOG DEFECT and SEARCH only.
2. Under LIVE DEFECT FEED: the count line, then ALL, DETAILED, COMPACT in one row, then SHOW STATUS COLOR. Tap COMPACT, then DETAILED: the cards change.
3. No sideways scroll.

### Rollback

Sites 196 / release 206 at `e649c644c28b66f4bc7d4494726a79834a80164b`.

## Remaining device checks from 206

Codex, publishing 206: the exact production build passed the placeholder, selected-bus location-pill, BUS LOCATION modal open/cancel, and unchanged Down Sheet label checks in cloud Chromium. The live Defect Log placeholder also passed. The fresh live browser had no device-local fleet, so no bus was added to exercise a live location pill or populated Down Sheet field. No fleet records were changed.

On a phone with existing fleet data, open + LOG DEFECT: check the empty BUS wording, select a bus, open its location pill and cancel the BUS LOCATION window. On Down Sheet + ADD, check `Bus N · Place`. Only move a bus that is really somewhere else. Physical phone/Safari/Home Screen, touch keyboard and offline acceptance remain unverified. These are device follow-ups, not a pending source release.
