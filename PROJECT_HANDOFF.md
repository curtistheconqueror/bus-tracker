# Fleet Maintenance Bus Tracker - Current Project Handoff

Updated: 2026-11-25
Repository: C:\Users\curti\pace-south-bus-tracker
Branch: main
Live application: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/
Live release: Sites Version 204 (application release 218)
Live feature checkpoint: commit 50340aef96e9bc87f9b8d43b7c485af97fab3d9d

## Read this first

This file is the authoritative continuation guide. Older snapshots are preserved under docs/archive for historical reference only. Do not use an archived handoff as current implementation guidance.

The project is an offline-capable fleet maintenance operations application with seven surfaces:

1. Facility Map — physical location, operating status, fleet markers, fast movement, and AI Operator commands.
2. Interactive Down Sheet — scheduled repairs, shifts, assignments, estimates, photo import, and completion workflow.
3. Real-Time Defect Log — mobile-first field observations and smaller repairs that usually do not belong on the Down Sheet.
4. Fixed Repairs — offline completed-repair history used for future diagnosis, with carried defect facts plus editable fix, verification, part, technician, and completion-time fields.
5. Fleet Campaigns — independent device-local punch lists with custom columns, reusable report formats, completion initials/timestamps, and shareable text output. Also hosts the Work Time panel, which totals a person's day across campaign rows and Defect Log repairs; the panel takes its records as props and is built to be relocated.

6. Incidents — device-local records of events involving people and places.
7. Shop Talk — device-local hazards, heads-ups and suggestions, retaining handled notes.

## Latest publication

Sites Version 204 / application release 218 deployed 2026-11-25 22:39:33.488072 UTC from `50340aef96e9bc87f9b8d43b7c485af97fab3d9d`. Detailed light-theme Defect Log cards have thin black bus and defect outlines, preserving chosen bus outline colors and colored work-state rails. When the existing Closing Line preference shows the footer, it is solid black with its original white-on-black label and height, including with the optional number rail. Compact, timestamps, records, storage, sync, and hosting are unchanged. PR39 MCP remains held and excluded.

ESLint, production build, all 491 local tests, and diff checks passed. [CI run 520](https://github.com/curtistheconqueror/bus-tracker/actions/runs/45714445250) passed. [CodeRabbit PR #62 review](https://github.com/curtistheconqueror/bus-tracker/pull/62#issuecomment-7176541937) covered the exact source commit and all four changed files with no actionable comments. Map, Down Sheet, Defect Log, and Fixed Repairs returned HTTP 200. The live Defect Log CSS and JavaScript matched the build byte-for-byte. Managed preview could not start; physical iPhone appearance and local fleet data were not verified.

Native deployment `appgdep_6b07639f63408191a9bb53e4e03e9ea2` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_ede58b709fac81918d39415c9ef46061`. Public access and runtime revisions remain 2. Immediate rollback: Sites 203 / application release 217 at `2c00cf88bbe51894ad588ac3585122fe025fdf92`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_71cfdae29cf88191bec50026bef6d549`.

No other release is pending.

### Previous publication — Sites 203 / application 217

Sites Version 203 / application release 217 deployed 2026-11-25 22:06:08.501348 UTC from `2c00cf88bbe51894ad588ac3585122fe025fdf92`. Detailed Defect Log bus cards show OLDEST directly below LATEST, using the original logged time of the oldest dated, not-completed, non-removed Defect Log record on that bus across feed windows and search. The repeated issue preview is removed from the detailed card face; the individual expanded rows and Compact preview are preserved. LATEST, OLDEST, and the expanded LOGGED, UPDATED, and LAST REPORTED timestamps grow from 9 px to 12 px at the default root size. Their underlying timestamps, sorting, data, storage, sync, and hosting configuration are unchanged. PR39 MCP remains held and excluded.

Exact-source ESLint, production build, 489 local tests, and diff checks passed. A mutation using the last update instead of the original logged time failed the new regression test. GitHub CI [run 518](https://github.com/curtistheconqueror/bus-tracker/actions/runs/45708842602) passed. [CodeRabbit reviewed the exact PR #61 head](https://github.com/curtistheconqueror/bus-tracker/pull/61#issuecomment-7175650210). The public Map, Down Sheet, Defect Log and Fixed Repairs returned HTTP 200. The served Defect Log JavaScript and stylesheet matched the checked production artifact byte-for-byte. The managed browser preview could not start, so actual physical iPhone layout and fleet data are unverified.

Native deployment `appgdep_6b075bc8d554819192aeefb860b2267e` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_71cfdae29cf88191bec50026bef6d549`. Public access and runtime revisions remain 2. Immediate rollback: Sites 202 / application release 216 at `8cdd02358b07301ca4739a5416865736c9686ef4`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_27f08c6b3e00819191b39b6a1a12bf47`.

No other release is pending.

### Previous publication — Sites 202 / application 216

Sites Version 202 / application release 216 deployed 2026-11-25 04:30:06.350181 UTC from `8cdd02358b07301ca4739a5416865736c9686ef4`. In Fixed Repairs → Completed Repair History, emoji/category subtitles such as Amerex and Suspension and Steering increase from 9 px to 12 px. Issue descriptions, other headings, data, storage, sync, and hosting configuration do not change. PR39 MCP remains held and excluded.

Exact-source ESLint, production build, 486 tests, and diff checks passed. GitHub CI run 514 succeeded. [CodeRabbit reviewed the exact PR #60 head](https://github.com/curtistheconqueror/bus-tracker/pull/60#issuecomment-7152790675) with no actionable findings. Isolated Chromium preview confirmed four synthetic cards at desktop and 360/415 px phone-like widths: 12 px labels, unchanged 13 px issue text, no overlap or horizontal overflow. The public Map, Down Sheet, Defect Log and Fixed Repairs returned HTTP 200; the served Fixed Repairs stylesheet includes the scoped 12 px rule. No real data was written. Physical iPhone verification remains open.

Native deployment `appgdep_6b06644737e081918ca934338170efdd` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_27f08c6b3e00819191b39b6a1a12bf47`. Public access and runtime revisions remain 2. Immediate rollback: Sites 201 / application release 215 at `24ccb374a578f7ffa80fa4037399aaa6ab5b953b`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_efe1de3a58d4819199e7ecfc58805473`.

No other release is pending.

### Previous publication — Sites 201 / application 215

Sites Version 201 / application release 215 deployed 2026-11-25 at 03:29:24.389651 UTC from `24ccb374a578f7ffa80fa4037399aaa6ab5b953b`. Only the Maintenance Down Sheet title default increased, from 15 px to 17 px. Legacy 15 px values without customization metadata take the new default; other stored sizes and colors are preserved, and a newly selected 15 px size is retained. No fleet data, sync, hosting configuration, or storage key changed. PR39 remains excluded.

Exact-source production build, ESLint, 486 tests, and `git diff --check` passed. GitHub CI run 510 succeeded and CodeRabbit completed on this exact PR #59 head without a release blocker. The live title rendered at 17 px in Chromium. Physical iPhone layout remains unverified.

Native deployment `appgdep_6b06560fac348191b1f15b181d5c1c21` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_efe1de3a58d4819199e7ecfc58805473`. Public access and the runtime environment remain unchanged. Rollback: Sites 200 / application release 214 at `4d205dbef009f1a74aff807dd6db474c6ddb97d3`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_b44b682c12d48191a184a89654ff3adc`.

No other release is pending.

### Previous publication — Sites 200 / applications 212–214

Sites Version 200 / application release 214 deployed 2026-11-25 at 03:11:32.770199 UTC from `4d205dbef009f1a74aff807dd6db474c6ddb97d3`, carrying 212 and 213. The Defect Log no longer adds the normal older-buses banner when changing windows; the unavailable-window and search notices remain. The Down Sheet has REFRESH, SCAN and SHARE, compact shift/counts/filter tabs, five watch lists, and CLEAR DOWNSHEET in Settings. Phone CSS addresses crowded Defect Log bus numbers, the welcome heading and the Map DECOMMISSIONED tile. No migration, sync, storage-key addition or rename; seven retired panel keys are left untouched on devices. PR39 MCP remains held and excluded.

Exact-source production build, 485 tests (zero failures or skips), ESLint and `git diff --check` passed. Managed Chromium preview verified closed-by-default panels, mutually exclusive switching and repeat-tap collapse, Mystery, Scan, the four Share drawer actions, Settings’ CLEAR DOWNSHEET control, and Maintenance → Union with all six roles and the heading below Close at desktop width. Preview and live Chromium verified THIS SHIFT and ALL without the normal older-buses banner or a feed-height change. Live Chromium opened the Down Sheet Share drawer, Mystery (open and close), and Scan dialog. No records were changed, no share or upload was performed, and Clear was not activated. Physical iPhone, phone CSS geometry (developer measurements in the archive), synthetic clear confirmation/undo, and installed/offline checks remain open.

Native deployment `appgdep_6b0651dfd5408191b3484bc0edcff59c` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_b44b682c12d48191a184a89654ff3adc`. Public URL, access policy revision 2 and runtime environment revision 2 are unchanged. Immediate rollback: Sites 199 / release 211 at `db6683d66884c3a25de88c896561a3226e1f67b2`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_c5dabcca09ec819181a8579372e1621f`.

The approved queue and detailed checks are archived in [PUBLISH_RELEASE_212_214.md](docs/archive/PUBLISH_RELEASE_212_214.md). The publish queue is reset to NONE PENDING.

### Previous publication — Sites 199 / application 211

Sites Version 199 / application release 211 deployed 2026-11-25 at 00:12:04.200721 UTC from `db6683d66884c3a25de88c896561a3226e1f67b2`. DAILY STATS and its five tiles are removed from the Defect Log; + LOG DEFECT and SEARCH sit under the header, or under the Scan drawer when open. The retired stats key is left untouched on existing devices. No migration, sync, storage-key addition, hosting change or fleet-record modification. PR39 MCP remains held and excluded.

Exact-source production build, 485 tests (zero failures or skips), ESLint and `git diff --check` passed. Live Facility Map, Down Sheet and Defect Log returned HTTP 200. The live Defect Log response contains the header actions, then LOG DEFECT and SEARCH, then LIVE DEFECT FEED, with no DAILY STATS bar. The cloud browser could not open the managed preview or bind the live tab, so visual spacing and a physical iPhone are not independently verified. The queue records the prior developer width checks.

Native deployment `appgdep_6b0627cca0708191a332f0b1b29af2c3` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_c5dabcca09ec819181a8579372e1621f`. The public URL, audience revision 2 and runtime environment revision 2 are unchanged. Immediate rollback: Sites 198 / application release 210 at `8ed0ce2dbf5c5eea6025b846440d43a650d4183c`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_e08cb5db2244819183afb7d356bac441`.

The approved queue is archived in [PUBLISH_RELEASE_211.md](docs/archive/PUBLISH_RELEASE_211.md). The publish queue is reset to NONE PENDING.

### Previous publication — Sites 198 / application 210

Sites Version 198 / application release 210 deployed 2026-11-24 at 23:04:43.361149 UTC from `8ed0ce2dbf5c5eea6025b846440d43a650d4183c`. The Defect Log header is REFRESH, SCAN and SHARE. SCAN offers three sheet-specific tiles; SHARE opens Defects Logged; QUICK FILTERS is on the feed row; UNDO LAST is shown only when usable. SCAN BATCHES and CLEAN UP moved to Settings; AI Operator is on the map and reachable in the phone More menu. No migration, storage-key rename, sync or hosting configuration change. PR39 MCP remains held and excluded.

Exact-source production build, all 485 tests (zero failures or skips), ESLint (no lint diagnostics), and `git diff --check` passed. Exact-build Chromium opened all three scanner dialogs without scanning or uploading; it opened the Defects Logged share and Quick Filters, followed Settings → Scan Batches, and reached the no-eligible-records alert through Settings → Clean Up. Live Chromium verified the new header and tile row, Down Sheet scanner, Share drawer and its three actions, Quick Filters, and the Settings Scan Batches route and panel. It also verified that the Clean Up control was present. The live browser had no device-local fleet, so the other two scanners were disabled there. No live undo, cleanup, file upload or share was executed, and no fleet records were changed. Physical iPhone/Safari, phone More → AI Operator, populated-device Undo Last and Clean Up, Home Screen and offline remain device checks.

Native deployment `appgdep_6b06180053cc8191a86605cf420b267c` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_e08cb5db2244819183afb7d356bac441`. The existing public URL, audience revision 2 and runtime environment revision 2 are unchanged. Immediate rollback: Sites 197 / application release 209 at `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_f9ecbfe3cdb88191b5ff93c099266722`.

The approved queue and phone checklist are in [PUBLISH_RELEASE_210.md](docs/archive/PUBLISH_RELEASE_210.md). The publish queue is reset to NONE PENDING.

### Previous publication — Sites 197 / applications 207–209

Sites Version 197 / application release 209 deployed 2026-11-24 at 21:03:26.739201 UTC from `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`. It includes 207 and 208: the Defect Log top box holds + LOG DEFECT and SEARCH; LIVE DEFECT FEED puts the count above the view controls; the unlit ALL drop-down exposes eight logged-time choices, including PREVIOUS SHIFT. Fixed Repairs offers PREVIOUS SHIFT as well. No migration, storage-key rename, sync, AI Operator, or hosting configuration change. PR39 MCP remains held and excluded.

Exact-source production build, all 484 tests (zero failures or skips), ESLint (no lint diagnostics), and `git diff --check` passed. No exact-source GitHub Actions run was reported. Chromium on the production build and the live site confirmed the eight options, PREVIOUS SHIFT face and shift-hours banner, clearing search when reselecting ALL, DETAILED/COMPACT selection, the unlit window picker, and the Fixed Repairs option. Live navigation rendered Defect Log, Fixed Repairs, Down Sheet, and Facility Map. No fleet records were added, edited, or moved. A physical iPhone's native picker, phone-width layout and actual card rendering with device-local defect records, Home Screen and offline checks were not independently verified.

Native deployment `appgdep_6b05fb91242481918428e2cfe699fe63` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_f9ecbfe3cdb88191b5ff93c099266722`. The existing public URL, access policy revision 2 and runtime environment revision 2 are unchanged. Previous-live rollback: Sites 196 / application release 206 at `e649c644c28b66f4bc7d4494726a79834a80164b`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_5a0ebd9dfc8c8191b3981192f36f6f0e`.

The former queue and remaining device checks are archived in [PUBLISH_RELEASE_207_209.md](docs/archive/PUBLISH_RELEASE_207_209.md).

### Previous publication — Sites 196 / application 206

Sites Version 196 / application release 206 deployed 2026-11-23 at 23:36:15.204248 UTC from `e649c644c28b66f4bc7d4494726a79834a80164b`. The Log Defect BUS box says "Tap twice to type bus#" and gives a selected bus a location pill opening the existing BUS LOCATION move window; successful moves replace UNDO LAST. B11/B12 are short labels in that pill. Down Sheet retains its existing bus selector. Releases 198–205 were already live in Sites 195 from `55812e1829f4a9469e901fb092980f3f86c5e536`; this publication retains them and adds 206. The prior queued handoff's Sites 194 / release 197 live baseline was stale.

Fresh exact-source production build, all 482 regression tests (zero failures/skips), ESLint (zero errors/warnings) and whitespace checks passed. An independent source review found no confirmed release blocker; no exact-source GitHub Actions run is claimed. Managed preview served the unchanged production build after the Vite development preview failed on its network-interface API. In cloud Chromium, the new placeholder, Bus 17533 plus CNG East pill, BUS LOCATION modal open/cancel and unchanged `Bus 17533 · CNG East` Down Sheet label passed. No move, save or undo was performed.

Native deployment `appgdep_6b04cdea6f6081919542269fc5b8fbc7` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_5a0ebd9dfc8c8191b3981192f36f6f0e`. Runtime environment revision 2 and public audience revision 2 are unchanged. All eight live routes returned HTTP 200 with FLEETSTEP; all 63 public browser/static assets matched the tested build bytes. The live placeholder was checked in Chromium. That fresh live browser had no device-local fleet; selected-bus live modal and populated Down Sheet checks were not performed, and no fleet was seeded. Physical phone/Safari/Home Screen, touch keyboard and offline checks remain unverified. The accepted 360px placeholder clipping and missing focus return after modal close remain as documented. No production fleet records, cloud configuration, schema or credentials were changed.

Previous-live rollback: Sites 195 / application release 205 at `55812e1829f4a9469e901fb092980f3f86c5e536`. Its saved version is `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_12ff577f153081918db0ea71ee24759d`. The full former queue is in `docs/archive/PUBLISH_RELEASE_198_206.md`. PR39 was excluded.

### Previous publication — Sites 195 / application 205

Sites 195 deployed `55812e1829f4a9469e901fb092980f3f86c5e536` on 2026-11-23 at 04:34:18.238897 UTC, carrying releases 198–205. Successful deployment: `appgdep_6b03c244e16c819191e44012e05a7c4c`. This recovered record is grounded in authoritative Sites version/deployment state and the earlier verified publication; the checks for 205 were not rerun as part of 206. It is the actual previous-live rollback, superseding the stale queue's Sites 194 / release 197 baseline.

### Previous publication — Sites 194 / application 197

Sites Version 194 / application release 197 deployed 2026-11-18 at 03:28:47.647741 UTC from `12822f60c7e5d76d3702108b33711cc116ca4f61`. Installed copies reopen the remembered page after safe document/hydration readiness; Doors picker receives its display-only emoji. PR50 CodeRabbit final review covered this exact SHA with no actionable comments; CI451 (44229747699) passed. Production build and 470 tests passed; ESLint zero errors and one preexisting warning. Browser loopback regression proved delayed-script/stalled-destination recovery; live HTTP200 and exact corrected inline script verified on Map, Defect Log, Down Sheet and Settings. Live Defect Log rendering checked. Physical iOS/Home Screen and real garage network behavior remain unverified. The initial service-worker document request remains unbounded; readiness taking more than the 2.5-second script budget falls back to map for that run. Sites192 and193 were saved candidates, never deployed. Rollback: Sites191 at a9f610d42123cd6cfaaf32b61d8c78048d585c82.

### Previous publication

Sites Version 191 / application release 196 deployed 2026-11-17 at 07:12:36.997726 UTC from `a9f610d42123cd6cfaaf32b61d8c78048d585c82`. Curtis explicitly requested only two Defect Log changes and live publication: ADVANCED ACTIONS starts collapsed on each visit while its button remains; Detailed becomes the default and precedes Compact. Saved explicit card-view choices remain supported. Editor Advanced Details, other pages and operational records are unchanged.

PR49 CodeRabbit completed at `50810e7` with no actionable comments and minimal merge/security risk; exact-head CI 44035855706 passed. Local production build, 469 tests and lint pass (zero lint errors, one existing ignored .remember file warning). Standalone TypeScript has the same 238 diagnostics as the isolated pre-change baseline after normalizing file paths/line numbers; no new errors. Browser interaction and physical-device verification were unavailable in this task. Previous release verification is preserved below.

Rollback: Sites 190 / `sites-v190` at `a1d90e85a6489ab9c6ff636e50ed813d98363978`. Legacy-look archive remains untouched.

### Previous publication

Sites Version 190 was deployed 2026-11-17 at 06:11:14.623645 UTC from `a1d90e85a6489ab9c6ff636e50ed813d98363978`, after Curtis approved making the redesign live. It includes the entire previously queued application release 194 plus application release 195 (PR48 compact mobile navigation and optional defect cards). No prior queued feature was discarded. PR39 remains unmerged and excluded.

Exact-head CI passed; the merged source tree equals reviewed `05ea7aa`. Local production build, lint and 468 tests passed. All eight live routes returned 200; 76 emitted browser/static assets matched the release build. Live Chromium passed 24 route/viewport checks and navigation/card interaction flows. Four recoverable React #418 hydration warnings occurred on Settings: independent server/client clocks cross a minute boundary in its hidden SHIFT ENDS IN display. The component and clock module are byte-unchanged from the pre-redesign baseline. Fresh UTC/Chicago core-route checks were clean; this is not established as a cache issue. Physical iPhone/Safari/Home Screen, hardware safe areas, VoiceOver and native share are not claimed; the heat scanner and sheet identifier still need a real photograph.

Previous-live rollback is Sites 189 at `a009c08fad02aa6859ec6445784f744c6e269c8d`. The requested pre-redesign code remains on `legacy/pre-minimalist-20261117-103f00d` at `103f00d15e73d09642720963043b16b05347c440`. Full queued-work history is archived in `docs/archive/PUBLISH_RELEASE_194_195.md`; release evidence is in `docs/RELEASES.md`. Older publication sections below are historical.

## Domain ownership

Application 193 was published 2026-10-25 at 21:45:24.014279 UTC. ADVANCED
ACTIONS drawers use navy on the Defect Log and purple on the Down Sheet;
both openers are taller and DAILY STATS has a taller accent-edged bar.
Only two stylesheets and their tests changed; service-worker v7 is unchanged.
Local and exact-source CI lint/build/388 tests passed, and an independent cold
read found no actionable defect. Eight live HTTP routes and 40 asset byte
comparisons passed, including checks of the delivered CSS contracts.
Those are source/asset checks, not computed-style or browser interaction tests.
Phone/Safari/Home Screen and shop-computer/iPad drawer wrapping, contrast and
focus checks remain manual. See docs/RELEASES.md for evidence and limits.
Rollback is application 192 / Sites 188, `sites-v188` at
`2ddc026c139c45acec7c24128633841d96e7dee3`. Later documentation-only work was
preserved on main. PR39 remains separately held; no Supabase or credentials
were changed by this release.

Application 192 adds Incidents and Shop Talk alongside the five operational
surfaces above. Both use device-local stores, do not sync, and are excluded
from MASTER EXPORT/IMPORT. A device move or loss does not carry these records.
Incidents does not replace supervisor reporting. Shop Talk keeps handled notes.
The grouped HVAC picker adds Heating; No Heat Buses reads repair identity,
while A/C Buses continues to include heating repairs in the shared category.
The category glyph is now ❄️+♨️. No navigation badge was added.

Published 2026-10-23 02:26:48.844011 UTC. Eight HTTP routes and 40 deployed
asset byte comparisons passed, including service-worker v7 and both new
surface bundles. Local and exact-source CI lint/build/388 tests passed.
Fresh browser interaction, native phone/iPad/Safari and offline-device checks
remain unperformed here. An existing generated Defect Log preload reference
is absent from build output; the actual manifest asset was verified.
Rollback is application 191 / Sites 187, `sites-v187` at
`b33775685b61acafdf4325807c82e92281c9fc2c`.
PR39 MCP remains unmerged and excluded; no Supabase or credential changes were
made by this release. See docs/RELEASES.md for publication identifiers.

These boundaries prevent synchronization bugs:

- The Facility Map owns physical bus location and operating status. Repairs entered there must be explicitly routed to the Defect Log, Down Sheet, or both; the map must not maintain an ambiguous third defect log.
- The Down Sheet owns formal maintenance scheduling and active Down Sheet membership.
- The Defect Log owns records created directly from the Defect Log.
- Fixed Repairs reads completed structured defects from the fleet record and owns only their completion-detail edits; it is not a separate duplicate repair store.
- Fleet Campaigns owns independent working lists and must not mutate fleet, Down Sheet, Defect Log, or Fixed Repairs records. Its one read outside its own storage is the fleet, borrowed read-only so the Work Time panel can total Defect Log repair hours alongside campaign rows; the page never writes fleet storage back.
- Work time is an aggregation, not a store. It records nothing of its own: it reads hours already saved on campaign rows and on completed repairs, so a time total can never disagree with the record it came from.
- Repair and status changes may synchronize across surfaces; Down Sheet or Defect Log edits must not silently relocate a bus.
- A bus may have multiple independent repair records. The phone Defect Log groups them visually by bus but does not merge or discard the underlying records.

## Non-negotiable behavior

Preserve these rules through refactors and backend migration:

- Fleet identity is stable. Routine bus editing must not create duplicate IDs or duplicate fleet numbers.
- Occupied-space moves and swaps are atomic. Capacity failures must leave every bus unchanged.
- Existing LocalStorage payloads and migrations must remain readable until a verified server migration exists.
- Main Garage and In Service / On Road normalize to blue with no active defects and green with active defects.
- Shop work areas normalize to Work in Progress when appropriate. CNG East and CNG West defect-carrying buses normalize to Out of Service.
- A road call remains a separate condition. It does not become a down bus merely because roadside repair is in progress; tow-in or confirmed return can change that outcome.
- Down Sheet membership and the DS badge identify the same active buses regardless of physical location. Badge visibility and badge filters never alter membership.
- Mystery logic excludes decommissioned buses, Main Garage ready rows, bays 11 and 12, and road buses. It identifies eligible on-property work-area buses that are absent from the Down Sheet.
- Completing one linked repair must not erase unrelated active defects.
- Work states are Inspected, Diagnosed and Parts on order, and that set is closed. A state may be added later; one already written onto records must not be removed or renamed. An absent key means not ticked, and unticking deletes the stamp with the key so a name never outlives the tick that made it.
- A finding is what the shop found, not what the driver reported, and it renders through defectLabel so every surface shows it. Anything that builds its own defect line must go through that function rather than reassembling category and issue, or the finding silently stops reaching the Down Sheet. It is typed in the Defect Log's ADVANCED DETAILS, on the Down Sheet row editor once a repair is marked done, and on Fixed Repairs; the Defect Log's main form asks ESTIMATED TIME OF REPAIR in the slot the finding used to hold, at Curtis's request, as redundant with the description above it. A finding cleared on an open defect can be restored by the next Down Sheet save of a card still carrying the old wording — a pre-existing behaviour of `applyDownEntryToFleet`.
- ESTIMATED TIME OF REPAIR is a per-defect estimate and is NOT billable time. `repairHours` and `diagnosticHours` are hours worked and reach the Work Time panel; `estimateHours` never does. It outranks every other source of an estimate — the billable hours, the shop's own repair-time ledger, and the catalog. The Defect Log's box owns the defect's estimate and the Down Sheet's boxes own the sheet's: a card BUILT from an estimated defect is seeded from it, and nothing carries a sheet figure back onto the record, because a card still holding a seeded number would resurrect an estimate somebody had cleared.
- Fixed Repairs owns the view of its own history. It narrows by WHEN A REPAIR WAS FIXED — `completedAt`, falling back to `updatedAt` so a record cleared from the Down Sheet still dates correctly — never by when the defect was logged, and its share carries exactly the repairs on screen with the window named in the heading. Both drop-downs offer the same seven windows through to 30 days — they were two lists for one release, on the argument that a month is every record a live board has, which was wrong because a deferred defect sits on that board for as long as it takes. Its scope bar names every filter that narrowed the list: the window, the category and the search, each measured against the stage above it.
- PATH TO REPAIR is keyed for every repair and reachable from TWO screens: the PTR button inside the Defect Log's FOCUS view, and a PTR button on every Fixed Repairs history card. Curtis asked for the second — *"The path to repair should be for everything"* — and Fixed Repairs is where somebody is standing the moment after they finish the job. The panel itself is one component, `src/components/defects/path-to-repair-panel.tsx`; both hosts hold the libraries and pass them in, because each one's own button reads the writeups to choose between PTR and PTR +. Its colours are its own `--ptr-*` names, mapped by each host, so the Defect Log's page themes still drive it and Fixed Repairs gets its own green. Further entry points — the Defect Log's feed cards, the defect editor, the Down Sheet — remain open and are Curtis's call.
- Defect Log totals count direct Defect Log records only. Down Sheet or tracker records may display for continuity but do not inflate that count.
- A reviewed photo import is authoritative for the Down Sheet only: it replaces every prior Down Sheet row, reconciles every DS badge, lists buses coming off before approval, and remains undoable. It must never delete or complete Defect Log records.
- Export and import remain the durable recovery path while Shop Cloud is introduced, configured, and verified across devices.

## Historical release state — application 191

Application release 191 is live as Sites platform Version 187 from b33775685b61acafdf4325807c82e92281c9fc2c, deployed 2026-10-20 at 19:35:00.450217 UTC. PR38 adds COPY, SHARE and SHARE PAGE under the Defect Log FOCUS heading. Exports include all the selected bus's non-hidden Defect Log records despite board filters; a scope notice explains any difference from the filtered view. HTML is escaped and self-contained, filenames use the local date, prior-year records identify their year, and a polite live region announces copy/share/download outcomes. No stored data, schema, dependency, public asset, permission or hosting configuration changed.

Sites deployment appgdep_6ad7c25a710c819198921cf4db16f5ed succeeded with public audience unchanged. Local lint/build and 360 tests passed on GitHub's merge candidate 1aba8a8, whose full tree is identical to the actual merged release. PR-head CI 39368201168 and exact merged-source CI 39484398384 both passed; the latter's logs confirm 360 pass, zero fail. All seven CodeRabbit inline findings are resolved and its latest review covers c92e819 with no new actionable comments. Ten additional Node VM checks execute the actual sharing handlers with browser API stubs; these are not browser interaction checks.

Postpublication: all six public routes return 200 and 33 emitted assets match the tested bytes, including the Defect Log bundle carrying FOCUS sharing. A generated optional preload names an un-emitted file and returns 404, as on previous releases; the actual bundle is available. Browser-control tools were unavailable, so fresh layout/hydration, native phone share, VoiceOver, Safari/Home Screen and offline-device checks are not claimed. One minor limitation remains: a share finishing after focus changes can report its status on the later bus; its payload stays scoped to the original bus. Rollback: application 189/190 / Sites 186 from c9c03d661177c04706f7beb33f2e4c24bf728e58, tag sites-v186. Tags sites-v187 and sites-release191 identify the new release. No production records were touched. The divergent claude-contributions mirror branch was preserved because it cannot fast-forward to main. See docs/RELEASES.md and docs/archive/PUBLISH_RELEASE_191.md.

### Previous releases 189 and 190

Application releases 189 and 190 are live together as Sites platform Version 186 from c9c03d661177c04706f7beb33f2e4c24bf728e58, deployed 2026-10-14 at 21:07:34 UTC. Release 189 gives the DEFECTS LOGGED quick-filter count a selectable span shared with its drawer, and keeps that count current while the menu is open. Release 190 makes the Defect Log AI OPERATOR ask before leaving for Facility Map, opens grouped defect and Down Sheet repair pickers on section titles, and reduces typing stutter by leaving unchanged picker work alone. A typed query still searches the full catalog, and the Defect Category picker stays flat. No storage key, schema, dependency, permission, or public asset changed.

Sites deployment appgdep_6acfef0f1c9c8191b74b886401a42328 succeeded at the existing public URL with audience unchanged. The exact merged source passed the production build, lint and 359 tests locally; PR #37 CI run 38630239061 passed on the same feature tree, and CodeRabbit completed its review through 86afbc7 with no actionable comments or review threads. Six public routes returned HTTP 200, and the live Defect Log page bundle matched the tested build byte-for-byte (SHA256 ADB2BCC4D4918A0108F4FCC37BA5E76073EF078431E30455668A05BD58073543). Interactive hydration, physical Safari/Home Screen, offline device use, and subjective typing feel were not verified in this release check. Rollback is application 188 / Sites 185 from 3b19e339446a9784898aa1cdd1f37b514c3a9d7d. See docs/RELEASES.md and docs/archive/PUBLISH_RELEASE_189_190.md.

### Previous release 188

Application release 188 was published as Sites platform Version 185 from 3b19e339446a9784898aa1cdd1f37b514c3a9d7d on 2026-10-14 at 01:06:44.898408 UTC. The Defect Log feed has a session-only WHEN LOGGED selector; active search bypasses its window and SHOW ALL DATES remains outside the collapsed drawer. The corrected source refreshes the clock every 30 seconds, measures TODAY from real local midnight, and uses the same instant for limits, record ages and labels. No storage key, schema, dependency or permission changed.

Sites deployment appgdep_6aced59af00c819186aac11111341181 succeeded with public audience unchanged. Local lint, production build and 354 tests passed. CI run 38488281309 independently reports lint/build and 354 passing tests; its checkout was the PR test merge 0365b6e, so local merged-source verification is recorded separately. All CodeRabbit inline findings, issue comments and review bodies on PR34/35 were reviewed against the corrected source. PR34's two historical threads remain unresolved in GitHub despite their fixes being present; PR35's same-clock thread is resolved. Docstring coverage and the review runner's ESLint installation timeout do not establish product defects.

Postpublication: six routes return 200; 33 emitted live JS/CSS/icon/cache assets match the tested build bytes. The actual Defect Log bundle contains WHEN LOGGED, SEARCHING EVERY DATE and SHOW ALL DATES. An optional preload still names an un-emitted file and returns 404, as documented for the previous release. Browser automation failed to initialize, so hydration, filter interaction, idle shift rollover, physical Safari/Home Screen and offline acceptance are not claimed. No operational data was changed. Rollback is application 187 / Sites 184 from b182776394e2b3b59ef7b969c58bf35c9c93f6a2; sites-v185 and sites-release188 identify the newly deployed source. See docs/RELEASES.md and docs/archive/PUBLISH_RELEASE_188.md.

### Previous release 187

Application release 187 is live as Sites platform Version 184 from b182776394e2b3b59ef7b969c58bf35c9c93f6a2, published 2026-10-11. The reconciled source preserves the previously deployed Defect Log equal action row, narrow-screen wrapping and neutral PTR help text while adding the FS PNG Apple icon, separate maskable artwork, v6 offline cache, and version-6 MASTER EXPORT/IMPORT coverage for PTR writeups and shop repair times. Releases 182–185 were already included in the prior live source and remain included. No storage key was renamed and no Supabase schema changed.

Fresh production build, lint and all 350 tests passed locally and in exact-source GitHub CI. Sites deployment appgdep_6acc030438188191899ba2a8cd5c2ca7 succeeded. All six public pages respond successfully; Settings renders the new backup copy, and deployed icon/cache/runtime assets match the tested build. One generated optional preload names an un-emitted file and returns 404; the actual page bundle is present. Browser automation was unavailable, so hydration, physical Safari/Home Screen installation and offline device acceptance are not claimed. No real fleet data was changed.

The rollback checkpoint is Sites platform Version 183 from aebe0aad334ce328c78c009d7c3d6a70e1c43c2a. Earlier historical notes called that layout deployment application release 186; it did not contain the later icon release also numbered 186. Use source SHA and platform version for rollback. Tag sites-v184 identifies this deployed source; sites-release187 is an application-release alias.

Each device needs its own MASTER EXPORT after refreshing the new release. Import replaces board/state, PTR writeups and shop times; absent fields in older backups remain untouched and swap history merges. Shop Cloud configuration/auth and remembered scan hints are not in the backup. Installation/import/reconnection remain Curtis's actions.

The Version 171 baseline details below remain useful historical context:

Known responsive follow-up: an iPad audit found 15 editor controls below the 44px touch-target guideline. Those sizes predate Version 117 and were intentionally left unchanged in this phone-focused release; review them in a separate iPad-scoped pass without collapsing the tablet editor's two-column layout.

- Fixed Repairs has visible navigation back to Facility Map, Down Sheet, and Defect Log, full-record editing, Undo Fix, confirmed deletion, and a quiet Undo Last control.
- Fixed Repairs now contains its header, four navigation tabs, summaries, and card actions without inheriting the Facility Map's global element positioning. Add/Edit Fix Details, Undo Fix, and Delete remain in one streamlined phone row.
- Defect Log and Fixed Repairs keep Undo available inside their normal control panels instead of displaying a colored status banner after every saved change.
- The Defect Log editor keeps Save Defect, Close, and Save as Fixed fully aligned on phones; the middle actions sit above Down Sheet and the page restores its prior scroll position when the editor closes.
- Quick Filter copy/share output includes only defects that match the selected filter, including Defect / Condition Not Duplicated records.
- Bus Controls, IBS Screen wording, Check Engine symptoms, kneeler/ramp choices, and both Bike Rack repair paths remain available.

- Shared versioned fleet and Down Sheet storage readers accept legacy payloads, preserve future metadata, and refuse malformed or unsupported newer payloads instead of overwriting them.
- The repair catalog now includes coolant level sensor, frequent suspension and mirror defects, Brake mod light, Farebox won't lock, and CUBIC Screen BUS ER / MV ER.
- Repair-category emojis are defined centrally and shown without changing stored category values; phone defect text has a readable minimum size.
- Every bus editor can append a mileage reading with its date and an optional note. Earlier readings remain visible in history, and the latest dated reading is shown as the current actual mileage.
- Every successful fleet write keeps the previous valid board as a device-local last-known-good recovery copy. A single change that would remove five or more defects or five or more bus records is refused unless it is the user-confirmed backup import path.
- Fleet Tracker Settings exposes Restore Last Good Copy. This recovery snapshot is stored in the same browser and can also be lost if Safari clears all website data; exported files remain the durable offline recovery path.
- The Defect Log prompts for a one-tap full-board export after every 20 new direct Defect Log entries. A successful share or download resets that device's reminder baseline.
- Estimated mileage uses the latest actual reading plus 275 miles per elapsed operating day. Blue In Service and green In Service With Defects accrue; shop, out-of-service, decommissioned, and unknown states pause. Status transitions checkpoint the estimate so paused time is not counted.
- Inspection readiness uses the latest completed inspection baseline and flags 3,000 miles or 10 days, whichever arrives first. Existing buses without a completed inspection show Baseline Needed until one is recorded. Date-only completions reset the 10-day clock but cannot establish a new 3,000-mile due point.
- Approved photo imports replace every Down Sheet row and reconcile DS badges from the new reviewed list. The review names every prior bus coming off before approval, and Undo Import restores the prior Down Sheet and fleet snapshot.
- Photo replacement never deletes or completes Defect Log records and never relocates buses. Omitted inspection buses return to service according to unresolved defects; an unrelated safety-critical downing defect still keeps the bus out of service.
The Version 129 production build, lint gate, and all 153 regression tests passed before publication. Sites reported the production deployment successful on 2026-08-31.

## Repository and remotes

- origin — private GitHub backup at curtistheconqueror/bus-tracker
- sites — existing OpenAI Sites source remote

The history is intentionally linear. Do not rewrite published commits, force-push, or place Sites credentials in Git configuration. Use small descriptive commits as rollback points.

## Source map

- app/page.tsx — Facility Map orchestration and device persistence
- src/lib/fleet/facility-layout.ts — facility sections, slots, capacities, and migrations
- src/lib/fleet/facility-areas.ts — shared Facility Map and Defect Log section membership plus first-open-space relocation
- src/lib/cloud/cloud-client.ts, src/lib/cloud/cloud-sync.ts, and app/settings/_components/cloud-sync-control.tsx — optional Supabase sign-in, row synchronization, merge controls, and device status
- src/lib/fleet/smart-status.ts — destination-aware status rules
- src/lib/operator/operator-engine.ts and src/lib/operator/operator-batch.ts — AI Operator parsing and atomic actions
- app/down-sheet/ — Down Sheet route, stylesheet and route-specific UI; src/lib/down-sheet/ owns estimates, scan import and synchronization
- app/defect-log/ — Defect Log route, stylesheet and route-specific UI; src/lib/defects/ owns repair, filtering and linked-record logic
- app/fixed-repairs/ — completed-repair history route and styles; shared UI lives under src/components/
- src/lib/defects/repair-catalog.ts — structured repair categories and quick selections
- tests/*.test.mjs — release-gate regression coverage
- db/ and drizzle/ — intentionally dormant shared-backend scaffolding
- docs/roadmap/ — future product phases

## Device-local persistence

Primary stores are versioned browser records:

- pace-board-v1 — fleet records, locations, statuses, defects, and operational timestamps
- pace-board-settings-v1 — map visuals and device preferences
- pace-down-sheet-v1 — Down Sheet entries and linked workflow state
- pace-down-sheet-settings-v1 — Down Sheet view and text settings
- pace-defect-log-settings-v1 — Defect Log view and text settings
- pace-bus-lists-v1 — independent Fleet Campaigns and their row completion state
- pace-bus-list-templates-v1 — reusable custom Bus List report formats
- pace-board-recovery-v1 — last-known-good fleet payload for device-local recovery
- pace-board-backup-reminder-v1 — device-local count baseline for 20-entry export reminders
- pace-cloud-config-v1 — per-device Shop Cloud project, account, initials, and device-label settings
- pace-cloud-state-v1 and pace-cloud-sent-v1 — per-device sync status and successfully sent row fingerprints
- pace-cloud-auth-v1 — Supabase's persisted per-device shop session
- pace-ptr-v1 — device-local PATH TO REPAIR writeups, keyed by repair
- pace-repair-hours-v1 — device-local shop repair-time ledger, keyed by repair

Undo snapshots exist for destructive Down Sheet actions. Backup export includes the fleet, connected Down Sheet state, and interface settings. Treat real exported backups as operational data and never commit them.

## Photo scan integration

The Down Sheet scanner sends reviewed photos through app/api/down-sheet-scan/route.ts. The hosted runtime supplies OPENROUTER_API_KEY. The browser never receives the key. A missing or invalid key must produce a visible error and must not modify fleet data.

## Validation and release workflow

Before every release:

1. Inspect git status and preserve unrelated work.
2. Make the smallest coherent change.
3. Add focused regression coverage.
4. Run npm test.
5. Run npm run lint and separate legacy warnings from new failures.
6. Run git diff --check.
7. Commit only intended files.
8. Read docs/PUBLISH_NEXT.md first: it always names the next unpublished release and what to check once it is live, and its STATUS line says whether anything is pending. Then follow docs/SITES_PUBLISHING_RUNBOOK.md and save/publish through the existing Sites project only after user approval.
9. Record the live Sites version and source commit in docs/RELEASES.md and this handoff, and reset docs/PUBLISH_NEXT.md to STATUS: NONE PENDING in the same commit.

Do not create a new hosting project. Do not publish merely because a commit or build succeeded.

## Shared backend phase

The shared backend phase is now underway. Version 127 provides an optional Supabase client for Facility Map, Defect Log, and Down Sheet rows while keeping LocalStorage as the immediate offline store.

- A connected device checks for its own changed rows every 45 seconds while the app is visible and retries rows whose push did not complete.
- Bringing the shop copy onto a device is currently an explicit Settings action. It reuses the existing section-transfer merge rules and refuses destructive fleet writes.
- Shop Cloud must be configured and signed in separately on each phone or iPad. Fleet Campaigns, learned parts/findings, Fixed Repairs-specific details, realtime subscriptions, and server-authoritative conflict resolution remain future milestones.

## Product roadmaps

The future operator-facing defect-card replacement is documented at docs/roadmap/operator-reported-defects.md. It is separate from the current mechanic-focused Defect Log and requires shared authentication, permissions, attachments, and an audit trail.

## Safe continuation prompt

Open C:\Users\curti\pace-south-bus-tracker and read README.md, PROJECT_HANDOFF.md, CONTRIBUTING.md, docs/PUBLISH_NEXT.md, docs/RELEASES.md, and docs/SITES_PUBLISHING_RUNBOOK.md completely before acting. Inspect git status and recent commits. Preserve LocalStorage migrations, fleet identity, facility slot IDs, capacity-safe swaps, touch behavior, linked repair records, and all user data. Work in small stages, add focused tests, run npm test and git diff --check, and commit only the requested change. Never create a new hosting project or publish without explicit approval.

Live verification: home, Defect Log and Down Sheet returned HTTP 200; Defect Log server output starts Detailed with Advanced Actions collapsed and drawer absent; all 27 referenced emitted JavaScript assets matched the release build byte-for-byte. This is HTTP/source verification, not fresh browser interaction.
