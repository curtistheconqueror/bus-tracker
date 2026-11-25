# Publish next

**STATUS: ONE RELEASE PENDING ON `main` — application release 212, from `05d9afd`. NOT PUBLISHED.** A Defect Log removal Curtis asked for on 2026-11-24. No sync, no storage key, no migration. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 199 / application release 211, deployed 2026-11-25 at 00:12:04.200721 UTC from `db6683d66884c3a25de88c896561a3226e1f67b2`. Rollback for 212: Sites 199 at `db6683d66884c3a25de88c896561a3226e1f67b2`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains held and excluded. The 211 queue as published: [release 211](archive/PUBLISH_RELEASE_211.md). Publication evidence is in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 212 | The bar under SEARCH that named the feed window and counted "OLDER BUSES HIDDEN" is removed | On `main`, pending publication — **publish this** |

## 212 — The Defect Log's window banner is gone

### Source

Release source: `05d9afd`. Previous: `4b792a4`, Codex's record of 211. Run at `05d9afd`:

```
$ git log --oneline 4b792a4..05d9afd
05d9afd Release 212: the Defect Log's window banner is gone
```

```
$ git diff --name-only 4b792a4..05d9afd
app/defect-log/page.tsx
tests/defects.test.mjs
```

```
$ git diff --shortstat 4b792a4..05d9afd
 2 files changed, 32 insertions(+), 54 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 4b792a4..05d9afd -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key added, renamed or retired.

### What changed

Curtis, with a screenshot of the bar: *"we don't need this badge banner about other buses hidden. It's not necessary."*

1. **The bar under SEARCH is removed** — "LOGGED 2ND SHIFT · SINCE 14:00 · 80 OLDER BUSES HIDDEN" with SHOW ALL DATES. The ALL ▾ drop-down already names the window on its face ("THIS SHIFT ▾"), and picking ALL there is the way back. Choosing a window no longer adds a bar or moves the feed.
2. **Kept: the bar for a window that cannot be applied.** When the shift hours on a device cover no window at the moment, THIS SHIFT shows every date while the face still reads THIS SHIFT; that bar is the only thing that says so. It should almost never appear.
3. **The search bar is unchanged** ("1 BUS SHOWN · SEARCHING EVERY DATE · SHOW ALL").

### Verified

- `npm test` on Windows — **485 pass, 0 fail** (window-bar tests now assert it is gone and that the unresolved-window bar is still wired). `npm run lint` — no error, the one existing warning. Type-check 238, unchanged.
- **In the dev build at 390:** picking THIS SHIFT shows no bar and the feed stays at the same height; the face reads "THIS SHIFT ▾"; typing a bus number shows the search bar with SEARCHING EVERY DATE.
- **Cold read, one subagent, before the push:** nothing serious. It confirmed no narrowed feed is left unexplained (the face names the window with a saved view or a search; a search's bar says SEARCHING EVERY DATE; Fixed Repairs' own bar is untouched). Two stale comments and a test title were corrected. `PROJECT_HANDOFF.md` still describes the bar — Codex's file, for its 212 record.
- **Not done:** no phone.

### What to check once it is live

On a phone: pick THIS SHIFT on the Defect Log's ALL ▾ — no orange bar appears under SEARCH, and the feed does not jump; ALL ▾ reads THIS SHIFT ▾; picking ALL brings every date back.

## Remaining device checks

On a physical iPhone, check that the Defect Log shows the header, then
+ LOG DEFECT and SEARCH, then LIVE DEFECT FEED. There should be no DAILY STATS
bar or blank gap left by its removal, including when opening and closing Scan.

On a physical iPhone, confirm the REFRESH / SCAN / SHARE row, the three
scanner tiles and their routes on a device with local fleet data, the Defects
Logged share controls, the feed-row Quick Filters, and More → AI OPERATOR on
the map. Confirm Scan Batches and Clean Up arrival from Settings. Test Undo
Last and the Clean Up confirmation only with synthetic records on an isolated
test device, not on the real fleet. Do not share or upload live data to test
the controls. In the Share preview only, confirm PREVIOUS SHIFT falls back to
THIS SHIFT, and LAST 24H opens the matching 24H chip. Home Screen and offline
acceptance remain unverified.

Continue the native ALL picker and Previous Shift checks from
[releases 207–209](archive/PUBLISH_RELEASE_207_209.md) and the Log Defect
location and Down Sheet checks from [releases 198–206](archive/PUBLISH_RELEASE_198_206.md).
These are device follow-ups, not pending source releases.
