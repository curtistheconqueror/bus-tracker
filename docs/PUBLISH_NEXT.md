# Publish next

**STATUS: ONE RELEASE PENDING ON `main` — application release 210, from `8ed0ce2`. NOT PUBLISHED.** A Defect Log change Curtis asked for on 2026-11-24, with small knock-ons in Settings and the phone More menu. No sync, no storage key, no migration. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 197 / application release 209, deployed 2026-11-24 at 21:03:26.739201 UTC from `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`. Rollback for 210: Sites 197 at `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains held and excluded. The 207–209 queue as published: [releases 207–209](archive/PUBLISH_RELEASE_207_209.md). Publication evidence is in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 210 | Defect Log header is REFRESH · SCAN · SHARE. SCAN opens three scan tiles; SHARE opens the existing DEFECTS LOGGED share; QUICK FILTERS is an icon on the feed row; UNDO LAST shows only when usable; SCAN BATCHES and CLEAN UP move to Settings; the AI Operator moves to the phone More menu | On `main`, pending publication — **publish this** |

## 210 — The Defect Log header is REFRESH, SCAN and SHARE

### Source

Release source: `8ed0ce2`. Previous: `2e315cb`, Codex's record of 209. Run at `8ed0ce2`:

```
$ git log --oneline 2e315cb..8ed0ce2
8ed0ce2 Release 210: the Defect Log header is REFRESH, SCAN and SHARE
```

```
$ git diff --name-only 2e315cb..8ed0ce2 -- app src tests
app/defect-log/_components/heat-scanner.tsx
app/defect-log/defect-log.css
app/defect-log/page.tsx
app/page.tsx
app/settings/page.tsx
src/components/defects/quick-filter-menu.tsx
src/components/shared/tracker-nav.css
src/components/shared/tracker-nav.tsx
src/lib/defects/defect-log-tools.ts
src/lib/operator/operator-engine.ts
tests/app-shell.test.mjs
tests/defects.test.mjs
tests/scan.test.mjs
tests/settings.test.mjs
tests/shared.test.mjs
tests/storage.test.mjs
```

```
$ git diff --shortstat 2e315cb..8ed0ce2
 17 files changed, 364 insertions(+), 189 deletions(-)
```

The 17th file is `CLAUDE.md`: two sentences about the scan buttons that the change made untrue.

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 2e315cb..8ed0ce2 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key added or renamed. The two new address parameters (`?tool=scan-batches`, `?tool=clean-up`) are read once and removed from the address.

### What changed

Curtis, on the ADVANCED ACTIONS drawer: *"design all of these options right here to be more uniform ... a much cleaner and streamlined look"*, then *"make this whole section about scanning ... take out AI operator and cleanup"*, *"side by side"*, and finally *"So really, we just need two buttons ... the scan, and a share button ... with the share icon on it."* On the share: *"the share functionality that we have already, it's a bit hard to find ... I want it relocated so I can see it easier."* He picked each placement below when asked.

1. **The header row is REFRESH · SCAN · SHARE.** REFRESH is unchanged. The wide ADVANCED ACTIONS button became two equal buttons with icons.
2. **SCAN opens three matching tiles side by side** — VEHICLE DOWN SHEET, FAREBOX / VENTRA SWEEP, HEAT CHECK SHEET — drawn from the sheet table in `paper-kinds.ts`. Each opens its scanner directly, with no first look: the person named the sheet. The sweep and heat scanners open in place as before; the Down Sheet tile loads the Down Sheet with its scanner open (`/down-sheet?scan=down-sheet`). The drawer keeps the header's colour; only the tiles are white.
3. **SHARE opens the existing DEFECTS LOGGED share** (COPY LIST, SHARE, SHARE PAGE), which was QUICK FILTERS → Defects Logged. It opens on the window ALL ▾ shows when the share has a chip of the same span (THIS SHIFT, 24H, 3 DAYS, 7 DAYS); otherwise on that share's own long-standing default, THIS SHIFT, because on ALL it is every bus with an open defect rather than a handover list. The ALL chip is one tap away in the drawer.
4. **QUICK FILTERS is a filter icon** at the end of ALL ▾ · DETAILED · COMPACT. Same menu as before; the icon turns blue while a filter is on.
5. **UNDO LAST shows only while there is something to undo.** On a phone it sits in the feed box's top-right corner beside the title; wider than 760px it sits in the title row left of SHOW STATUS COLOR. Hidden in LITE (`undoTools`).
6. **SCAN BATCHES and CLEAN UP are in Settings**, under the Defect Log section (SCANS AND CLEANUP). Each opens the Defect Log, which does the one thing asked after the board is read. Settings hides nothing in LITE, so a LITE device pressing either is told it is not part of LITE.
7. **The AI Operator left the Defect Log.** On phones it is the last row of the bottom-tab More menu ("AI OPERATOR — opens on the map"), from every page. Wider than 800px that menu is not drawn, so on an iPad or the shop computer the Operator is the map's own button; a ninth header tile on every page was not added without asking.
8. **WHEN LOGGED left the drawer** — ALL ▾ over the feed asks the same question with the same list.
9. **Messages that named moved buttons now say where they are**: SCAN BATCHES "in Settings" (heat scan alert and confirm, scan removal message, AI Operator replies, map message); the heat scanner sends a farebox sheet "through SCAN, then FAREBOX / VENTRA SWEEP".

### Verified

- `npm test` on Windows — **485 pass, 0 fail** (one new test; others updated to the new layout). `npm run lint` — no error, the one existing warning. Type-check 238, unchanged.
- **In the dev build, measured** at 360, 390, 820 and 1180: no sideways scroll; header buttons 44px; three tiles in one row at every width with their icons level; the feed row fits at 360 including with a saved default view lit (IN PROGRESS), with no label overrunning its box; UNDO LAST appearing moves nothing below the title with the default title, clears the count line on phones, and does not touch SHOW STATUS COLOR at 820 or 1180; tapping UNDO LAST undid a test hold and removed the button.
- **Driven in the dev build:** each tile opens its scanner (the Down Sheet tile opened the Down Sheet scanner); SHARE opens DEFECTS LOGGED at the top of the screen on the expected chip (ALL / TODAY → SHIFT, 24H → 24H, 7 DAYS → 7D); the filter icon opens the 14-row menu inside the screen; Settings → SCAN BATCHES opened the panel on the Defect Log and cleaned the address; More → AI OPERATOR opened the Operator on the map.
- **Cold reads, two subagents, before the push.** Answered:
  - UNDO LAST covered SHOW STATUS COLOR above 760px: fixed, it sits in the title row there (item 5);
  - the feed row overflowed at 360 with a saved view lit: fixed, the share icon moved to the header and the row's labels size to their words in that case;
  - UNDO LAST ran under a long custom title, then under the ESTIMATED badge: fixed, the title keeps clear of it and the button sits above the count line;
  - messages naming SCAN SWEEP / SCAN BATCHES on the Defect Log: corrected (item 9);
  - LITE could reach SCAN BATCHES and CLEAN UP through Settings: fixed, refused on arrival (item 6);
  - the AI Operator has no entry off the map above 800px: left and stated (item 7) — a desktop tile on every page is Curtis's call;
  - the operator's removal summary still names a sweep scan "SCAN SWEEP": left — it names the kind of scan in the batch history, and the operator's own tests pin it;
  - dead CSS for the old drawer's buttons (`.log-feed-window`, `.log-undo-button`, `.feed-operator`, `.cleanup-log`, the scan button colours): left in place, matches nothing; a later tidy;
  - weak tests: SHARE's handler, both Settings buttons, the `?tool=` order (wait for the board, strip, refuse in LITE, act) and the filter icon's LITE gate are now asserted.
- **Not done:** CLEAN UP from Settings was not driven in the browser (it asks with a confirm on arrival, which stalls the test browser); its path is asserted. No real phone.

### What to check once it is live

On a phone: the header reads REFRESH · SCAN · SHARE; SCAN shows three tiles side by side and each opens the right scanner (the Down Sheet one goes to the Down Sheet page); SHARE opens Defects Logged with COPY LIST / SHARE / SHARE PAGE; the filter icon opens the quick filters; after any save UNDO LAST appears in the feed box's corner and undoes it; Settings → Defect Log → SCANS AND CLEANUP opens both tools; More → AI OPERATOR opens the Operator on the map. Do not change real fleet records to test UNDO LAST or CLEAN UP.

## Remaining device checks from 207–209

On a phone with existing fleet data, verify that the top Defect Log box contains
+ LOG DEFECT and SEARCH only; LIVE DEFECT FEED shows the count, then the
unlit ALL dropdown beside DETAILED / COMPACT, then SHOW STATUS COLOR.
Check the native eight-choice picker, PREVIOUS SHIFT face and shift-hours
banner, search clearing on ALL, actual card appearance in COMPACT / DETAILED,
and no sideways scrolling. In Fixed Repairs, check WHEN FIXED → PREVIOUS SHIFT.
Physical iPhone/Safari/Home Screen and offline acceptance remain unverified.

The prior release's remaining device-only checks (Log Defect bus/location
modal open and cancel, and the populated Down Sheet bus label) are preserved
in [releases 198–206](archive/PUBLISH_RELEASE_198_206.md). These follow-ups are
not pending source releases; do not change actual fleet records to test them.
