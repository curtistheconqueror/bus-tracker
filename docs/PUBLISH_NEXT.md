# Publish next

**STATUS: NONE PENDING.** Application release 223 is live as Sites Version 209,
deployed 2026-11-25 23:56:12.045352 UTC from `e0054a9dfca54281bfe112c3d5cd14c76a174e82`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Previous-live rollback: Sites 208 / application 222 at `ea7071dc7cd9cb662b93c1e7ffe4aaaf23cbbe4f`. PR39 MCP remains held and excluded.

Publication evidence is in [RELEASES.md](RELEASES.md).

## Remaining device checks

On an iPad or Android tablet, scroll the Down Sheet and confirm the blue strip
no longer covers rows. Section names and their descriptions should be larger,
with count chips and phone rendering unchanged. Do not edit records to verify.

In the Defect Log and Down Sheet repair pickers, open Brakes and look for the
two service-brake pull directions. Cancel without saving a real record.

On a physical iPad or Android tablet, verify REFRESH on its own row, SCAN and
SHARE together, and PAGES below. PAGES starts closed; opening it overlays the
sheet without movement, and tapping away closes it. On a phone in portrait or
landscape, confirm the existing navigation and actions are unchanged. Open and
cancel Scan to check the existing entry screen without selecting real photos.

On iPad or another tablet, verify the added space after the control panel and
the 2 px black border around Maintenance Down Sheet. Compare portrait and
landscape on a phone to confirm no change. No real records need to be edited.


On phone-sized hardware, verify the status stripe and footer positioning using
synthetic defects only. Chromium confirmed fixed geometry and footer coverage.


On a physical iPhone, check Detailed light-theme card and defect outlines and,
where Closing Line is enabled, the white label on the black closing strip.
Check the full width with the optional vertical number rail and that Off still
hides the footer. Do not modify real records to verify.


On a physical iPhone, confirm that LATEST and OLDEST are readable and stacked
without crowding VIEW or CLOSE; a filtered bus card still shows the oldest
dated active defect. Expand the card to confirm full issue details and the
larger original LOGGED, UPDATED, and LAST REPORTED labels; do not change any
real record to verify.


On a physical iPhone, confirm the Fixed Repairs emoji/category subtitles are
easier to read and longer names wrap without covering the repair description.


On a physical iPhone, check that the slightly larger Maintenance Down Sheet
title remains clear and does not crowd the count or Show Completed control.


On a physical iPhone, verify THIS SHIFT does not add the older-buses banner or
move the Defect Log feed, and ALL brings all dates back. Check the gap between
bus numbers and repair text in the expanded filter drawer, the Maintenance →
Union welcome title below Close, and the DECOMMISSIONED tile label.

On the Down Sheet, verify REFRESH / SCAN / SHARE, the three tabs starting closed,
the Mystery watch list, and the open-bus count. Check Settings → Down Sheet →
CLEAR DOWNSHEET confirmation and undo only on an isolated device with synthetic
records; do not clear the real sheet. Do not scan, transmit, or share live data
to verify the controls.

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
