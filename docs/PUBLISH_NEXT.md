# Publish next

**STATUS: ONE RELEASE PENDING ON `main` — application release 207, from `4f30c91`. NOT PUBLISHED.** Publish `4f30c91`. It is a Defect Log layout change Curtis asked for on 2026-11-23 and touches nothing else: no sync, no AI Operator, no storage key. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 196 / application release 206, deployed 2026-11-23 at 23:36:15.204248 UTC from `e649c644c28b66f4bc7d4494726a79834a80164b`. Rollback for 207: Sites 196 at `e649c644c28b66f4bc7d4494726a79834a80164b`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains separately held and unmerged, excluded from this release. The 198–206 queue as published: [releases 198–206](archive/PUBLISH_RELEASE_198_206.md). Publication evidence and limits are in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 207 | The Defect Log's top box holds + LOG DEFECT and SEARCH alone; ALL, DETAILED, COMPACT move under the feed's count line; IN PROGRESS and FIXED TODAY buttons removed; the count line is bigger; LIVE REPAIR FEED is renamed LIVE DEFECT FEED | On `main`, pending publication — **publish this** |

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
