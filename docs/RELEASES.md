# Release reference

Sites version numbers are deployment checkpoints, not the package version in package.json. Git commits remain the authoritative rollback points.

| Sites version | State | Source commit | Summary |
| --- | --- | --- | --- |
| 189 / application release 193 | Live | a009c08fad02aa6859ec6445784f744c6e269c8d | ADVANCED ACTIONS drawers take their button colours; larger openers and reshaped DAILY STATS; service worker unchanged. |
| 188 / application release 192 | Previous live; rollback | 2ddc026c139c45acec7c24128633841d96e7dee3 | Device-local Incidents and Shop Talk, wrapping navigation, grouped HVAC Heating and No Heat Buses, with preserved estimates and operator aliases. |
| 187 / application release 191 | Previous live; rollback | b33775685b61acafdf4325807c82e92281c9fc2c | FOCUS shares one bus as text or a self-contained HTML page, including records hidden by board filters and accessible action outcomes. |
| 186 / application release 190 | Previous live; rollback, includes 189 | c9c03d661177c04706f7beb33f2e4c24bf728e58 | Defect Log AI OPERATOR confirms before leaving for Facility Map; grouped defect and Down Sheet repair browsing; smoother typing through stable bus-picker rendering. |
| 186 / application release 189 | Previous live, shipped with 190 | c9c03d661177c04706f7beb33f2e4c24bf728e58 | DEFECTS LOGGED count and drawer share a selected time span, with a count that updates while the menu stays open. |
| 185 / application release 188 | Previous live; rollback | 3b19e339446a9784898aa1cdd1f37b514c3a9d7d | Adds WHEN LOGGED feed windows with an advancing shared clock, correct local-midnight TODAY boundary, search bypass and always-reachable SHOW ALL DATES. |
| 184 / application release 187 | Previous live | b182776394e2b3b59ef7b969c58bf35c9c93f6a2 | Reconciles the live Defect Log fixes with the FS Apple/maskable icons and v6 cache; MASTER EXPORT/IMPORT includes PTR writeups and shop repair times. |
| 183 / historical layout release | Previous live | aebe0aad334ce328c78c009d7c3d6a70e1c43c2a | Equal full-width repair actions, narrow-screen label wrapping, and neutral PTR help text; historically called release 186, separate from the later icon release 186. |
| 182 / release 185 (includes 182–184) | Previous live | b9c1e81 | Publishes the cumulative picker fixes, repository layout, shift-scoped lists, repair-hours badge, shop repair-time ledger, PATH TO REPAIR, description line breaks and FIXED TODAY correction. |
| 181 / release 181 | Previous live | 148a45e | Distinguishes hard Down Sheet buses from Soft Down and IDOT preparation with collapsed boards and an optional in-service override; adds IDOT Prep, clears stale Defect Log search after logging, and clarifies Full Sweep's No path. |
| 180 / release 180 | Previous live | b6e0cba | Adds four Brakes symptom choices: Brakes sticking / dragging, brakes will not release after the service pedal, brakes will not release at the parking brake, and Brake chamber leaking. |
| 179 / release 179 | Previous live | fe467c0 | Adds optional HOLD UNTIL and EXTEND controls for deferred Defect Log repairs without resetting their original 90-minute alarm or deferred history; the facility-config extraction is internal and renders identically. |
| 178 / release 178 | Previous live | 531c3f8 | Keeps the Fleet Status Report CLOSE action reachable in its iOS modal, makes first-run role selection follow Full/Lite selection, and fixes the cross-timezone forecast fixture so CI passes consistently. |
| 177 / release 177 | Previous live | c18f635 | Turns the Fleet Status Report into a per-device checkbox list, adds its first Fleet Forecast, counts Farebox, Ventra and CUBIC-screen buses independently, safely backfills old Down Sheets into history, and uses fleet numbers for that ledger across devices. |
| 176 / release 176 | Previous live | 5e6fd58 | Restores the garage's actual shift hours, gives the incoming shift ownership at 30-minute handovers, and corrects two-shift timing; starts an append-only, capped Down Sheet swap ledger that merges across transfers and master imports; and makes the Fleet Status Report close control obvious and touch-sized. |
| 175 / release 175 | Previous live | 9bac8ed | Corrects road-call status when a bus is formally placed on the Down Sheet while preserving road-call history; renames and shortens the Fleet Status Report; repairs Fixed Repairs contrast across all themes; and adds editable device-local shift and pullout hours. |
| 174 / release 174 | Previous live | 2c06463 | Fixes the phone and iPad touch crash with a crash guard; adds the Down Sheet Status Report and Full Sweep workflows; makes holds device-local; carries intentional Down Sheet and Defect Log removals through section transfers; and gives the Down Sheet the Defect Log-style typed repair form, nine entry-focused quick filters, and filtered offline-safe sharing. |
| 173 / release 173 | Previous live | 3de6dab | Published the preceding Fleet Tracker source; Version 174 is its direct rollback successor. |
| 171 / release 171 | Previous live | 649cef5 | Aligns the Facility Map header and phone nav; adds wiper, washer, ramp, lighting and air-tank catalog choices; gives the Defect Log typing pickers, a return tally and optional phone card-separation settings; adds fluid top-up details, the Recommended for Down Sheet board, and a cosmetic per-device role picker |
| 166 / release 170 | Live | bdca898 | Restores the Scan Sheet Cancel control and its modal scrolling, and makes the FLEETSTEP masthead return to the Facility Map |
| 165 / release 169 | Live | 939fe49 | Adds an opt-in Lite Mode first-run choice, a search banner with Show All, and the read-time Lights, Mirrors and Alarms catalog rename |
| 164 / release 168 | Live | 64ec7d2 | Adds a collapsed Deferred Buses board to the Down Sheet, replaces its order dropdown with a Section Order setting, and enlarges the FLEETSTEP name |
| 163 / release 167 | Live | 09a69aa | Renames the application FLEETSTEP and collapses the Down Sheet status report to its total, with the detailed counts available on request |
| 162 / release 166 | Live | 1de3d68 | Moves a defect to its selected bus instead of copying it, keeps removal scoped, adds OPEN IT for already-logged work, and makes tapping Search clear it with a CLEAR tag |
| 161 / release 165 | Live | ba3fb13 | Adds a one-time deferred-bus check-in that can be switched off, TransitKey app naming, Lite Mode groundwork, and Farebox Won't probe & open |
| 160 / release 164 | Live | 945cc29 | Fixes the Down Sheet UPDATED BY cell so its row divider runs cleanly across the full row |
| 159 / release 163 | Live | 5381dd2 | Realtime Shop Cloud falls back to polling if unreachable; Down Sheet actions sit at the row end and MARK FIXED confirms first; and UNDO FIX returns a repair to its originating workflow or is not offered when no open workflow exists |
| 158 / release 162 | Live | 168f553 | Keeps Down Sheet score tiles stable while road tallies filter the table, adds compact Advanced Actions on both operational pages, makes Deferred status update immediately, and lets a Defect Log location open the Facility Map move workflow |
| 157 / release 161 | Live | 3b16d45 | Adds row-level Down Sheet DELETE, PUT BACK, MARK FIXED and undo actions; preserves independent inspection tallies; moves Mystery Buses to the Down Sheet; and compacts Defect Log controls behind Advanced Actions |
| 156 / release 160 | Live | bbe33f6 | Adds REFRESH to every page for home-screen use and moves the Main Garage Ready boundary vertically between bays 6 and 7 without moving buses or slots |
| 155 / release 159 | Live | 2afa491 | Down Sheet removals now travel through Shop Cloud as entry tombstones, so cleared or replaced sheets stay cleared across devices and the settled sheet reconciles map Down Sheet flags |
| 154 / release 158 | Live | a444242 | Adds a persistent UNDO DEFERRED action to expanded Defect Log repair cards and Focus view; it returns a held-back repair to Open while retaining its dated deferred history, and never appears for Down Sheet-owned Deferred work |
| 153 / release 157 | Live | baffc24 | Carries repository releases 153–157: Shop Cloud sync and scan-review repairs, reversible scan sweeps, Ready Rows, corrected Down Sheet scan wording and road tallies, improved catalog matching, typed Fixed Repairs bus entry, and the ON ROAD badge on every Down Sheet row |
| 152 | Live | b57dcb5 | Shop Cloud sync safely sends merged-defect tombstones and reaches Down Sheet rows; scan review flags missing and uncertain rows; the Deferred badge opens its matching bus filter; Shop Cloud is first under Settings MASTER; A-3, A-21, and a biohazard catalog condition are added |
| 151 | Previous live | f5939df | Dated ROAD CALL events sync between Defect Log and Facility Map, remain in history while driving a seven-day filter, and permit a short mis-tick undo; Down Sheet bands distinguish off-property, scheduled, unscheduled and inspection work; master backup and restore controls move to Settings |
| 150 | Previous live | 6d62787 | IMPORT ALL DATA on the Facility Map restores backups again; settings are centralized on an offline-capable Settings page, MERGE DUPES moves there with its live count and undo, Technical Service Bulletins attach to repairs, ALL clears search, and navigation comes from one shared list |
| 149 | Previous live | 011bb09 | Unresolved duplicate reports are recognized for five days; WORK DONE SO FAR adds a combinable OPERATOR REPORTED checkbox |
| 148 | Previous live | 60c2a01 | Bus List appears before Type Bus #; Amerex adds Trouble Mod 1 Roof 2 and Trouble Mod 2 Roof 2 |
| 147 | Previous live | 9d69a9b | Defect Log bus selectors are named for their purpose and a typed bus number is the primary control |
| 146 | Previous live | 1d5454b | Down Sheet identifies the defect that put a bus down, duplicate logging reuses the existing repair, and Air System is renamed Pneumatic System |
| 145 | Previous live | 5aab35f | Defect Log opens on collapsed DAILY STATS and + LOG DEFECT; Fixed Repairs can log a completed repair without a prior defect, including a safe append save path |
| 144 | Previous live | 9f1f73f | Save-screen choices and Defect Log/Down Sheet SEARCH labels are readable on phone widths |
| 143 | Previous live | f94608b | Collapsed Defect Log bus cards no longer display one defect's category glyph; expanded defect rows retain their own glyphs |
| 142 | Previous live | 1ff1224 | Card lines align at fixed tab stops with clearer reading text across Defect Log, Down Sheet and Fixed Repairs |
| 141 | Previous live | e99e06a | Enlarged Defect Log Down Sheet badge using Facility Map's saved editable colors |
| 140 | Previous live | f0c7939 | SCAN SWEEP reads farebox and Ventra check-off sheets from photos using the existing scan configuration; includes Version 139 Tech Services sheet-style grouping |
| 139 | Previous live | a33ffab | Tech Services is grouped by Farebox, Ventra, CUBIC Screen, IBS Screen, Signs and Cameras |
| 138 | Previous live | 0969840 | A/C and HVAC defects now record fan count, Freon service, diagnostic-lamp status, and alarm number; includes the Version 137 Fleet Campaigns offline cache |
| 137 | Previous live | 69deec5 | Fleet Campaigns is pre-cached so it remains available when a phone loses signal |
| 136 | Previous live | dccf431 | Bus Controls splits into Operator/Driver Controls and Bus Accessories; stop-request choices are sided and named for the floor, the four general door/ramp choices remain available, and Bodywork gains complete ramp replacement beyond repair; existing records migrate at read time without rewriting stored data |
| 135 | Previous live | d3c05c3 | MERGE DUPES now writes its authorized cleanup and only tombstones records after a successful save; TEST DRIVEN and BRAKE TEST work states record an explicit pass or fail, with brake-test failures marking the bus Remove From Service |
| 134 | Previous live | 43ddeae | Reconciled the frozen Version 130–133 work with the existing live catalog correction: duplicate-repair merging, the expanded repair catalog and part-number completion flow, resilient storage-save reporting and windowed Fixed Repairs, plus DEFERRED Bay 12 holds with a timed alert, evening review, return-to-service history, and the Bodywork IBS screen-pole defect |
| 133 | Previous live | 5c257d3 | Preserved the Bodywork IBS screen-pole defect while reconciling the prior Sites source history |
| 132 | Previous live | 3b55d96 | Saved and deployed the validated Fixed Repairs windowing and storage-save reporting source during the Sites-history reconciliation |
| 131 | Previous live | 8858e3f | IntelligAIRE III panel catalog wording |
| 130 | Previous live | 5fc8436 | One repair, one record: duplicate defects merged and protected from Shop Cloud resurrection |
| 85 | Historical | 14a80e9 | Refined Defect Log workflow controls and the approved three-surface application before the mobile grouping update |
| 86 | Historical | 7d62809 | Mobile Defect Log grouping, defect counts, generation filters, typed bus entry, hidden phone Shop Notes, and organized project documentation |
| 92 | Previous live | be6ab31 | Multi-symptom Check Engine defects, contained phone layouts, collapsible Mystery search, shared Quick Filter bus lists, and stable full-height phone editor saving |
| 93 | Previous live | 4788b6e | Version 92 merged with optional defect subcategories, reachable dual Save controls, dated defects, 48-hour duplicate prevention, and larger phone navigation |
| 94 | Previous live | 13c7244 | Operator Controls, Bike Rack and radiator-fan repair choices, a one-to-eight fan count, centered Save & Close, and collapsible Advanced Details |
| 95 | Previous live | 5924f3f | Separate centered Save and Close actions in the Defect Log editor, with large phone touch targets |
| 96 | Previous live | 1ffffc5 | Phone Facility Map overhaul, persistent collapsible sections, offline Fixed Repairs, separate Save as Fixed actions, and searchable condition-not-duplicated records |
| 97 | Previous live | 439531b | Four-surface mobile navigation, editable Fixed Repairs with undo/reopen/delete, aligned phone defect actions, condition-not-duplicated tracking, and curated Quick Filter sharing |
| 98 | Previous live | b98b0d5 | Uniform Fixed Repairs header/navigation, contained one-row repair actions on phones, and quiet always-present Undo controls in Defect Log and Fixed Repairs |
| 99 | Previous live | 3aec06e | Reconciled the Version 96 GitHub history with the Version 98 Sites source while preserving both release lines and application behavior |
| 100 | Previous live | 8fbc710 | Backward-compatible shared storage foundation, expanded repair catalog including CUBIC BUS ER/MV ER, centralized category emojis, and clearer phone defect text |
| 101 | Previous live | f730ecd | Dated actual odometer readings on every bus, append-only reading history, current-reading summary, and phone-friendly entry controls |
| 102 | Previous live | 4f0315b | Bulk-loss safety stops for defects and bus records, a last-known-good device recovery copy, and full-board export reminders after every 20 new Defect Log entries |
| 103 | Previous live | f4628f7 | Estimated operating mileage at 275 miles per day, pause/resume checkpoints, and inspection readiness at 3,000 miles or 10 days |
| 129 | Live | 24a02a9 | GET THE SHOP'S COPY now sends this device's work before merging the shop's copy and refuses to merge if that send failed; shared Quick Filter lists collapse repeated displayed lines, space each bus apart, carry its location, and can be sent as a self-contained page that renders offline |
| 128 | Previous live | c1101bd | Six Shop Cloud fixes including reliable nested-field change detection; OFF PROPERTY, Down Sheet relocation, persistent selected status, collapsed-section locating, Completed Today, Fixed Repair origin bands, and optional Defect Log status colour |
| 127 | Previous live | 831b753 | Offline-first Shop Cloud sync for map, defects, and Down Sheet; direct section-title drops; and Mystery Bus location controls that preserve repair and membership data |
| 126 | Previous live | 8e68f69 | Stronger Defect Log bus-group boundaries, expanded-group shading, clearer nested repairs, and a reversible Standard or Strong separation setting across phone, iPad, and desktop |
| 125 | Previous live | 135a49a | Both curbside mirror switches are named precisely; phone DS badges and roadcall dots stay visible inside centered bus markers |
| 124 | Previous live | 39a7275 | Exports share real files instead of temporary blob links; FIXED TODAY stays in the summary grid; four destinations move into an on-screen PAGES menu |
| 123 | Previous live | f154686 | Per-section device transfers merge without replacing unrelated data; ALL DATA and report labels clarify file purpose; backup cadence is settable; phone Service Detail remains visible |
| 122 | Previous live | cd6b649 | Operator A/C blower and mirror switches added; confirmed air-bag repairs consolidated under Air System with counted replacements and leaning-diagnosis guidance |
| 121 | Previous live | 8ce3e5b | Replaced the vague Suspension and Steering Air bag choice with separate Front air bag leak and Rear air bag leak options while preserving historical records |
| 120 | Previous live | 791b357 | Renamed the winter-planning Quick Filter consistently to No Heat Buses without changing its stable key or matching logic |
| 119 | Previous live | b40741f | Per-repair Down Sheet completion dates and partial-progress rollups; expanded engine, charging, belt, pulley and counted air-bag repairs; split surge-tank sides and a Potential No Cabin Heat winter filter |
| 118 | Previous live | 6f45d14 | Each Down Sheet repair is now its own defect and Fixed Repairs record with its own completion details and hours; estimates collapse to one true total, and entered diagnostic time starts at one hour |
| 117 | Previous live | ff62fa3 | NVH added to Suspension and Steering with an actionable defect note, plus working editor scroll locks and a phone-usable single-column Down Sheet editor with a full-width repairs section |
| 116 | Previous live | 54b5322 | Complete campaign and learned-cause backups, issue-scoped diagnostic memory, expanded field repair choices, corrected dash/start wording, and separated Amerex Fire Suppression, Gas Concentration, and CNG safety workflows |
| 115 | Previous live | d0189f9 | First-position ADA mechanical failures for doors, ramp, and kneeler, plus missing road-hazard triangles and fire-extinguisher safety defects |
| 114 | Previous live | cc662ac | Billable and diagnostic repair time, stamped work states and findings, confirmed Cummins service defaults, Down Sheet recommendations, Fleet Campaign work-time and entry improvements, and safer farebox-report pasting |
| 113 | Previous live | 6d44097 | More visible, compact Advanced Details control beneath the unchanged Defect Log save controls |
| 111 | Previous live | 6f99889 | Independent Bus Lists with custom columns, reusable report formats, completion initials and timestamps, and shareable text exports |
| 110 | Previous live | d28b63d | Compact paired Edit Defect and Mark Fixed actions in the Defect Log Focus view, reusing the established completion and Undo workflow |
| 109 | Previous live | db3cee6 | Learned Parts Used workflow, expanded grouped catalog, engine-hour and calendar service tracking, maintenance diagnostics, and Defect Log action-bar and repair-details fixes |
| 108 | Previous live | bd33963 | Turn signals at the top of Bus Controls, configurable spark-plug and valve-adjustment tracking foundation, and a phone-friendly read-only Defect Log Focus view |
| 107 | Previous live | de25a4a | Append-only completed-inspection history with optional actual mileage, date-only completion, mileage re-anchoring, and renewed inspection clocks |
| 106 | Previous live | 194c0b4 | Facility Map repairs route explicitly to Defect Log, Down Sheet, or both; legacy map-only repair cleanup is scoped and undoable |
| 105 | Previous live | bdfe8e2 | Phone Facility Map navigation moved to the uniform top position; Fixed Repairs now shares Defect Log theme, font, and color settings |
| 104 | Previous live | 519e748 | Authoritative reviewed-photo Down Sheet replacement, automatic DS badge reconciliation, explicit coming-off review, undo coverage, and preserved Defect Log records |

## Sites Version 182 / repository release 185 — 2026-10-09

Published once to the existing public Site, carrying repository releases 182–185.
Sites version numbers and repository release numbers now differ; no empty
versions were created to align them.

- Source: `b9c1e81b93046ad8c7053c986cc72bb1a8a9eda3`
- Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_d68d190544d88191a9ca5887c2988177`
- Deployment: `appgdep_6ac86486486c8191959f52970f349923`
- Native result: `succeeded` at `2026-10-09T03:50:39.237210+00:00`
- Public URL: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site
- Archive SHA-256: `2c7ed1005db14f3f2ff7741d875e28ba30c59d64d2b19cbdde0aeb5e29adf48a`
- Gates: fresh cloud production build, ESLint and 346 tests passed; `git diff --check` clean. Exact-source [GitHub CI](https://github.com/curtistheconqueror/bus-tracker/actions/runs/37851672242) also passed.
- Validation boundary: publication confirmed by native deployment and saved-version results. Live-device phone, editing and offline checklists were not rerun; no real fleet records were changed.
- Data: no schema migration or existing-key rename. `pace-ptr-v1` and `pace-repair-hours-v1` are additive, device-local keys.
- Prepared local rollback tag for this source: `sites-v182`, pointing to `b9c1e81`. Its remote GitHub push is pending Git authentication; the tag is not yet present on GitHub. Previous live target: `sites-v181` (`148a45e`). Rolling back leaves the two new keys untouched but unread until this release returns.
- Historical handoff and all four phone checklists: [published releases 182–185](archive/PUBLISH_RELEASE_185.md).

## Sites platform 184 / application release 187 publication

- Published 2026-10-11 at 21:43:41.132231 UTC to https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site with public audience unchanged.
- Source: b182776394e2b3b59ef7b969c58bf35c9c93f6a2; a history-preserving merge with parents 1d730a4ba7d441d4ea1b664efad1ca56bbe7b4e1 and aebe0aad334ce328c78c009d7c3d6a70e1c43c2a. Approved original release source: 016fae430d30db6f6f1f85bb9f12653323f94e80.
- Saved version: appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_70ec7cb544c08191b2c2575f67834e88.
- Successful deployment: appgdep_6acc030438188191899ba2a8cd5c2ca7.
- Native saved archive hash: sha256:3b393637dfe617023a88cb4bf9f267f3c36ed8b784d83b3d7e73a14873a186b6.
- Validation: local lint, production build and 350 tests pass; [exact-source GitHub CI](https://github.com/curtistheconqueror/bus-tracker/actions/runs/38177465073) also passed install, lint, build and test. Backup tests use memory storage, never real user data.
- Postpublication: six routes return 200; Settings names PTR writeups/shop times; Apple PNG declaration and v6 service worker confirmed. Emitted live icons, manifest, service worker, CSS and JS match the tested build bytes. One generated optional preload references an un-emitted defect-log-DTlrLlDu.js and returns 404; the actual defect page bundle is present. Browser automation unavailable; physical Safari/Home Screen/offline checks remain unverified.
- Backup version 6 adds pathToRepairs and repairHours. Import normalizes/replaces those fields, skips absent older-file fields, and continues merging swap history. Cloud configuration/auth and scan hints are not backed up.
- Rollback: previous platform Version 183, source aebe0aad334ce328c78c009d7c3d6a70e1c43c2a. Rolling back stops new exports/imports carrying the two fields; do not move devices while rolled back. No installation, import, Shop Cloud reconnection, or operational-data changes were performed.
- Preserved six-section handoff: [release 187](archive/PUBLISH_RELEASE_187.md). Rollback tag sites-v184 and application alias sites-release187 point to deployed source.

Earlier history remains available through git log. Version-specific continuation snapshots are preserved in docs/archive.

When a release is published, update this table and PROJECT_HANDOFF.md in the same follow-up commit, and reset `docs/PUBLISH_NEXT.md` to STATUS: NONE PENDING.

## Sites platform 185 / application release 188 publication

- Published 2026-10-14 at 01:06:44.898408 UTC to https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site with public audience unchanged.
- Frozen source: `3b19e339446a9784898aa1cdd1f37b514c3a9d7d`. Later GitHub main `94656d8` changed only the handoff; it introduced no application difference. Never publish the defective first cut `1b8ab7c`.
- Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_80bb1d1f2a988191b1d35017e0e56bef`.
- Successful deployment: `appgdep_6aced59af00c819186aac11111341181`.
- Local compressed archive SHA-256: `fc7be58065b06ab4b66eccda6a03216ff1808564e94363aeeaf1c2f34a29edb4`; native saved tar hash: `sha256:cc8fb074da6b94d599667cc964df2faced46381ada837bfe69b369757b610f5c` (5,160,960 bytes, 86 files).
- Validation: fresh local lint and production build, all 354 tests pass with zero failures, and `git diff --check` clean. [CI run 38488281309](https://github.com/curtistheconqueror/bus-tracker/actions/runs/38488281309), job 115607127646, confirms install/lint/build and 354 pass, zero fail. CI checked out the PR test merge `0365b6e` containing `7a6760c`; local gates separately verified the actual merged release `3b19e33`.
- Reviewed CodeRabbit inline threads, issue comments and review bodies on PR34 and PR35. All three correctness findings are addressed: clock refresh every 30 seconds, elapsed time since real local midnight, and the same clock for limits/ages/labels. PR34's historical threads remain marked unresolved; PR35's same-clock thread is resolved. Its ESLint installation timeout and default docstring coverage threshold are not product failures; repository lint passed.
- Postpublication HTTP smoke: `/`, `/down-sheet`, `/defect-log`, `/fixed-repairs`, `/lists`, `/settings` return 200 with fleet navigation. All 33 checked emitted JS/CSS/icon/manifest/service-worker assets match the tested build bytes. The actual Defect Log bundle `/assets/page-DNdjubqB.js` contains WHEN LOGGED, SEARCHING EVERY DATE and SHOW ALL DATES. An optional preload `/assets/defect-log-CoHc7eh3.js` names an un-emitted file and returns 404; this generated-preload issue was already documented on release 187, and the actual bundle is present.
- Browser runtime could not initialize (missing Windows platform directory); hydration, filter clicks, idle shift rollover, physical Safari/Home Screen and offline device acceptance are not claimed. Follow the six live checks in the preserved handoff. No real fleet data, backup import, browser-data clearing, permissions or cloud schema was changed.
- Rollback: application 187 / Sites 184, source `b182776394e2b3b59ef7b969c58bf35c9c93f6a2`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_70ec7cb544c08191b2c2575f67834e88`. No stored record changes are introduced by 188. Tags `sites-v185` and `sites-release188` identify the new deployed source.
- Preserved handoff: [release 188](archive/PUBLISH_RELEASE_188.md). Release records are a documentation-only follow-up on current GitHub main; they do not change the frozen deployment source.

## Sites platform 187 / application release 191 publication

- Published 2026-10-20 at 19:35:00.450217 UTC to https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site. Public audience and runtime environment revision 2 preserved.
- Frozen source: `b33775685b61acafdf4325807c82e92281c9fc2c`, the PR38 merge. Reviewed head: `c92e819f6f8c248371fa165a16dff96b30890c65`; its GitHub merge candidate `1aba8a87bcee7ca795f731b74fbfb4ebec500f61` has the identical full tree `b1c98ec02226fa2fc2cbb8ce789a5e2648be6cec`. Pending-release documentation commit `6e2dc3d` introduced no product change and was kept separate from the frozen publication.
- Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_0d2dc715848881919278a51cfdfb64c0`.
- Successful deployment: `appgdep_6ad7c25a710c819198921cf4db16f5ed`.
- Compressed archive SHA256: `9a8459c40302dc8c46b01730422e3bf7e55ff5b888e313c351df1d6c2d064be0`. Native saved tar hash: `sha256:a2c2b7e497f7d998be8fe2148fbc733660242221dfbbbe212650f0915edab5e6`, 5,191,680 bytes, 86 files. Packaged with the current official Sites 1.1.0 source helper.
- Gates: fresh local lint/build and 360 tests passed, zero failures; `git diff --check` clean. [PR CI 39368201168](https://github.com/curtistheconqueror/bus-tracker/actions/runs/39368201168) passed on the exact-head merge candidate. [Merged-source CI 39484398384](https://github.com/curtistheconqueror/bus-tracker/actions/runs/39484398384), job 118840944211, passed install/lint/build and 360 tests on `b337756` before publication. Full-tree identity allowed reusing the successful local build without repeating it.
- Review: all issue comments, review bodies and inline threads on PR38 inspected. Seven actionable findings are resolved in `817b82f` and `c92e819`; latest CodeRabbit review covers `c92e819`, reports no new actionable comments, and its status is success. The default 50% docstring coverage warning is advisory, consistent with prior releases; no failing repository check was bypassed.
- Ten [handler checks](archive/release191-behavior.json) passed using actual page-handler source in a Node VM with browser API stubs: complete selected-bus payload despite filtered view, prior-year timestamp, copy/text share/fallback/error/cancellation, escaped network-free HTML, saved/shared/cancelled file outcomes and no-focus guard. These are not browser interaction tests.
- [Live HTTP evidence](archive/release191-smoke.json): `/`, `/down-sheet`, `/defect-log`, `/fixed-repairs`, `/lists`, `/settings` return 200 with fleet navigation; 33 emitted JS/CSS/icon/manifest/service-worker assets match tested bytes. Defect Log `/assets/page-WaXE5jg0.js` has SHA256 `4fc9cee618a522a3968dcbe619ae0bbd26f060865207ec33cb5c2e4f7242566d` and contains SHARES ALL, SHARE PAGE, SAVED TO THIS DEVICE and COPIED. A generated optional preload `/assets/defect-log-B1h8ORig.js` names an un-emitted file and returns 404, as documented for earlier releases; the actual page bundle is present.
- Limits: no browser-control tools were available; fresh hydration/layout, native phone sharing, VoiceOver announcements, Safari/Home Screen and offline-device acceptance are not claimed. Follow the five device checks in the [preserved handoff](archive/PUBLISH_RELEASE_191.md). A late async share completion can label a newly focused bus with the earlier action's status; the payload remains scoped to the original bus. CodeRabbit classifies the release as minimal merge risk; this minor status race is recorded rather than treated as a data leak.
- Rollback: application 189/190 / Sites 186, source `c9c03d661177c04706f7beb33f2e4c24bf728e58` (`sites-v186`), saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_3a17719e51808191bed75bc71024bd47`. No storage keys, schema, dependencies, hosting configuration or public assets changed; no production records, imports, browser data, access settings or unrelated services were touched.
- New rollback tag `sites-v187` and application alias `sites-release191` identify the deployed source. The divergent `claude-contributions` mirror branch cannot fast-forward to main and was preserved without rewriting history. Canonical computer checkout remains untouched; release work used an isolated task checkout.

## Application 192 / Sites 188 evidence

- PR40 head: `0ba8e5c7d27677c1998303f9f45be73f6b2e426e`.
- Merge: `cc495d5a3f4fd0f6eacde35d4e2b58527a8792a3`.
- Frozen pushed source: `2ddc026c139c45acec7c24128633841d96e7dee3`.
- Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_48672032f2d88191bbba69e7e67e598f`.
- Deployment: `appgdep_6adac5df4e6481918503d1b79946ede2`, succeeded
  2026-10-23 02:26:48.844011 UTC; existing public URL unchanged.
- Archive SHA256: `daccddeb71516cb44b37c75d7c7da16413debfcecd32a0deca8e717f03d0c6ad`.
- Exact-source [CI 39889311395](https://github.com/curtistheconqueror/bus-tracker/actions/runs/39889311395)
  passed install/lint/build and 388 tests, zero failures/skips. Fresh local
  lint/build/388 tests also passed on the identical feature tree.
- Live HTTP: `/`, `/down-sheet`, `/defect-log`, `/fixed-repairs`, `/lists`,
  `/settings`, `/incidents`, `/shop-talk` all 200 with both new nav links.
  Forty built assets matched production byte-for-byte. Service-worker v7
  contains both new routes. POST `/api/mcp` is 404, confirming no MCP route.
- Existing generated preload `/assets/defect-log-Dho7tEB9.js` is absent from
  local build output. The actual manifest assets were available and matched.
  This is a retained verification limitation, not a claim of browser success.
- Fresh browser interaction, device-local persistence/refused-write flows,
  phone/iPad layout, Safari/Home Screen and offline-device checks were not
  performed in this publishing environment. Relevant domain regressions passed
  in the automated suite; earlier browser/mutation claims remain author evidence.
- New device-local keys `pace-incidents-v1` and `pace-shop-talk-v1` do not sync
  or ride MASTER EXPORT/IMPORT. A/C Buses includes Heating in the HVAC category.
  These disclosed behaviors remain approved as-is. No nav badge was added.
- Rollback: application 191 / Sites 187, `sites-v187` at
  `b33775685b61acafdf4325807c82e92281c9fc2c`; release-192 tags point to the
  frozen source, not the later documentation commit.
- PR39 remains separate at `17b7b2a07f790cbf4aefdeeaf800057efd0165d2`.
  No Supabase migration, credential, policy or runtime environment change was
  performed by this publication. The platform reported environment revision 2.

## Application 193 / Sites 189 evidence

- PR41 merge and frozen source: `a009c08fad02aa6859ec6445784f744c6e269c8d`.
- Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_51161d3c95308191a9ae49b7cda6e080`.
- Deployment: `appgdep_6ade786b63a4819182e9ac72d32f1494`, succeeded
  2026-10-25 21:45:24.014279 UTC; existing public site/audience unchanged.
- Local gzip archive SHA256: `e25f359b9e4ff7c598b5fc8aef88903fc221176e0ad33dc93be4fb984731c520`.
  Separately, Sites reports saved archive content hash
  `0a5e22d09b13c49ab90c1f4085f73279e5912af52bd4fbc098f8b71e125746be`
  with format `tar`; this is not asserted to equal the local gzip file hash.
- Exact-source [CI 40232970655](https://github.com/curtistheconqueror/bus-tracker/actions/runs/40232970655)
  passed lint/build and 388 tests, zero failures/skips. Fresh local lint/build
  and 388 tests also passed. Dual-timezone/browser measurements in the archived
  handoff are author claims, not new publishing-session measurements.
- Independent cold review of the whole release diff, markup, cascade/themes and
  tests found no actionable defect. The two affected named tests passed 2/2.
  Test limits: CSS source-pattern assertions do not establish computed styles,
  focus/contrast or responsive geometry, and DAILY STATS has no new dedicated
  automated styling guard. Those limits were retained, not presented as proof.
- Eight live routes returned 200 with navigation: `/`, `/down-sheet`,
  `/defect-log`, `/fixed-repairs`, `/lists`, `/settings`, `/incidents`,
  `/shop-talk`. Forty built assets matched production byte-for-byte.
- Delivered CSS contracts passed for navy/purple drawers, transparent inner
  bodies, 52px openers and 52px DAILY STATS. The minifier uses `background:0 0`
  for transparent: an initial smoke matcher rejected that spelling; inspecting
  the byte-matched CSS established the harness mismatch, then the corrected
  smoke passed. No product source was changed to satisfy the check.
- Service-worker v7 is byte-identical to 192, with no bump. POST `/api/mcp`
  returns 404; PR39 remains excluded. Runtime environment revision remains 2.
- Existing generated Defect Log preload is absent from the build; actual
  manifest assets passed byte comparison. The prior release had the same
  generated-preload limitation. A separate HTTP check returned 404 for
  `/assets/defect-log-BSq6YvO5.js`. No browser-success claim is made.
- Manual checks remain: open both ADVANCED ACTIONS drawers and inspect their
  controls, DAILY STATS, all dark themes, keyboard focus/contrast, one-line
  Down Sheet opener/no horizontal scroll on shop computer/iPad, and physical
  phone/Safari/Home Screen/offline behavior. No supported browser tool was
  exposed in this publishing environment; no physical-shop testing occurred.
- Rollback: application 192 / Sites 188, `sites-v188` at
  `2ddc026c139c45acec7c24128633841d96e7dee3`. Tags `sites-v189` and
  `sites-release193` point to the frozen published source, not this later record.
- Release bookkeeping starts from latest main `6681407f77e9dfc6937499ea26ad6d965253ea73`,
  retaining its CLAUDE.md, NEXT_SESSION and review-skill documentation. No
  application refactor, storage, dependency, Supabase, credential or audience
  change was performed. PR39 remains separately held and unmerged.
- Release-record cold review caught a mislabelled saved-content hash, damaged
  Unicode in an initial handoff copy, and tags described before creation.
  Corrected in this release-record change: file and saved-content hashes are
  distinguished, the archive is extracted byte-for-byte from the Git handoff,
  and both tags were created and verified at the pinned source before commit.
