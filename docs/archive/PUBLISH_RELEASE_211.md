# Publish next

**STATUS: ONE RELEASE PENDING ON `main` — application release 211, from `db6683d`. NOT PUBLISHED.** A Defect Log removal Curtis asked for on 2026-11-24. No sync, no storage key added, no migration. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 198 / application release 210, deployed 2026-11-24 at 23:04:43.361149 UTC from `8ed0ce2dbf5c5eea6025b846440d43a650d4183c`. Rollback for 211: Sites 198 at `8ed0ce2dbf5c5eea6025b846440d43a650d4183c`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains held and excluded. The 210 queue as published: [release 210](archive/PUBLISH_RELEASE_210.md). Publication evidence is in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 211 | DAILY STATS is removed from the Defect Log; LOG DEFECT sits straight under the header | On `main`, pending publication — **publish this** |

## 211 — DAILY STATS is gone from the Defect Log

### Source

Release source: `db6683d`. Previous: `bc2fb31`, Codex's record of 210. Run at `db6683d`:

```
$ git log --oneline bc2fb31..db6683d
db6683d Release 211: DAILY STATS is gone from the Defect Log
```

```
$ git diff --name-only bc2fb31..db6683d
CLAUDE.md
app/defect-log/defect-log.css
app/defect-log/page.tsx
tests/app-shell.test.mjs
tests/defects.test.mjs
tests/settings.test.mjs
```

```
$ git diff --shortstat bc2fb31..db6683d
 6 files changed, 47 insertions(+), 93 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only bc2fb31..db6683d -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. `pace-defect-log-stats-open-v1` is no longer read or written; it stays listed in CLAUDE.md as NO LONGER READ and is left alone on devices that hold it, as the Down Sheet's SHEET STATS key was.

### What changed

Curtis: *"Get rid of daily stats. It doesn't serve a worthwhile purpose at this time. Keep the space it occupied clear to preserve our minimalist look."*

1. **The DAILY STATS bar and its five tiles are removed** from the Defect Log, with the counters that fed them and the open/closed state. Nothing replaces them: the LOG DEFECT and SEARCH box now sits straight under the header (or under the SCAN drawer when it is open).
2. **The five stat wordings** (ACTIVE DEFECTS, BUSES AFFECTED, IN PROGRESS, DOWNING, FIXED TODAY) are still in the display settings and the Settings wording editor, and now label nothing on the page. Not removed here; a later tidy if wanted.
3. **The `.log-summary` style rules** inside shared selector lines are left, unmatched, rather than split apart.

### Verified

- `npm test` on Windows — **485 pass, 0 fail** (the stats tests now assert it is gone, not hidden, and that the key is recorded as retired). `npm run lint` — no error, the one existing warning. Type-check 238, unchanged.
- **In the dev build, measured** at 390: header → LOG DEFECT box gap 10px, open SCAN drawer → box gap 10px, no sideways scroll; at 1180, header → box 12px, box → feed 10px.
- **Cold read, one subagent, before the push:** nothing serious. Answered:
  - an orphaned comment over the deleted key, and a test comment that still named the stats block: fixed;
  - dead `.log-summary` CSS still pinned by older tests: left, as stated in item 3;
  - the wording editor's five stat labels now label nothing: left, as stated in item 2;
  - pre-existing, not from this change: the FIXED TODAY saved view filters `records`, which leaves out repairs fixed with MARK FIXED on this device — noted, not changed.
- **Not done:** no phone.

### What to check once it is live

On a phone: the Defect Log opens on the header, then + LOG DEFECT and SEARCH, then LIVE DEFECT FEED, with no DAILY STATS bar between them and no empty gap where it was.

## Remaining device checks from 210

On a physical iPhone, confirm the REFRESH / SCAN / SHARE row, the three
scanner tiles and their routes on a device with local fleet data, the Defects
Logged share controls, the feed-row Quick Filters, and More → AI OPERATOR on
the map. Confirm Scan Batches and Clean Up arrival from Settings. Test Undo
Last and the Clean Up confirmation only with synthetic records on an isolated
test device, not on the real fleet. Do not share or upload live data to test
the controls. Home Screen and offline acceptance remain unverified.

Continue the native ALL picker and Previous Shift checks from
[releases 207–209](archive/PUBLISH_RELEASE_207_209.md) and the Log Defect
location and Down Sheet checks from [releases 198–206](archive/PUBLISH_RELEASE_198_206.md).
These are device follow-ups, not pending source releases.
