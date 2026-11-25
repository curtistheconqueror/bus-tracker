# Publish next

**STATUS: NONE PENDING.** Application release 211 is live as Sites Version 199,
deployed 2026-11-25 at 00:12:04.200721 UTC from `db6683d66884c3a25de88c896561a3226e1f67b2`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Previous-live rollback: Sites 198 / application release 210 at
`8ed0ce2dbf5c5eea6025b846440d43a650d4183c`. PR39 MCP remains held and excluded.
No migration, storage-key addition, runtime environment or audience change.

The full queue is archived in [release 211](archive/PUBLISH_RELEASE_211.md).
Publication evidence is in [RELEASES.md](RELEASES.md).

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
