# Release reference

Sites version numbers are deployment checkpoints, not the package version in package.json. Git commits remain the authoritative rollback points.

| Sites version | State | Source commit | Summary |
| --- | --- | --- | --- |
| 204 / application release 218 | Live | 50340aef96e9bc87f9b8d43b7c485af97fab3d9d | Detailed Defect Log black outlines and solid black labeled closing line. |
| 203 / application release 217 | Previous live; rollback | 2c00cf88bbe51894ad588ac3585122fe025fdf92 | Shows the oldest active logged date, removes repeated detailed card descriptions, and enlarges Defect Log dates. |
| 202 / application release 216 | Previous live; rollback | 8cdd02358b07301ca4739a5416865736c9686ef4 | Enlarges emoji/category subtitles in Fixed Repairs only. |
| 201 / application release 215 | Previous live; rollback | 24ccb374a578f7ffa80fa4037399aaa6ab5b953b | Slightly enlarges the Maintenance Down Sheet title. |
| 200 / application releases 212–214 | Previous live; rollback | 4d205dbef009f1a74aff807dd6db474c6ddb97d3 | Defect Log window cleanup, compact Down Sheet controls and phone text fixes. |
| 199 / application release 211 | Previous live; rollback | db6683d66884c3a25de88c896561a3226e1f67b2 | Removes DAILY STATS from the Defect Log, keeping + LOG DEFECT and SEARCH directly under the header. |
| 198 / application release 210 | Previous live; rollback | 8ed0ce2dbf5c5eea6025b846440d43a650d4183c | Defect Log header shortcuts for Scan and Share, feed-row Quick Filters, conditional Undo, and relocated Settings tools and phone AI Operator entry. |
| 197 / application releases 207–209 | Previous live; rollback | 9a7cc1f417c53689ee62b5f564609e2a0dc5b32a | Defect Log feed layout, time-window picker with PREVIOUS SHIFT, and neutral ALL control; PREVIOUS SHIFT in Fixed Repairs. |
| 196 / application release 206 | Previous live; rollback | e649c644c28b66f4bc7d4494726a79834a80164b | Log Defect BUS wording, location pill and move undo; includes 198–205 already shipped in Sites 195. |
| 195 / application releases 198–205 | Previous live; rollback | 55812e1829f4a9469e901fb092980f3f86c5e536 | Prior cloud publication, including the general AI Operator question rule; recovered actual baseline. |
| 194 / application release 197 | Previous live | 12822f60c7e5d76d3702108b33711cc116ca4f61 | Safe installed-app last-page restoration and Doors group display mark. |
| 192, 193 | Saved only; never deployed | Superseded review candidates | Do not deploy; use reviewed194. |
| 191 / application release 196 | Previous live; rollback | a9f610d42123cd6cfaaf32b61d8c78048d585c82 | Defect Log starts Advanced Actions collapsed; Detailed card view is default and appears before Compact. Explicit saved card choices remain. |
| 190 / application releases 194 and 195 | Previous live; rollback | a1d90e85a6489ab9c6ff636e50ed813d98363978 | Preserves queued maintenance/scanner work; adds shared compact mobile navigation, grouped map controls, visible shifts and remembered Compact / Detailed defect cards. |
| 189 / application release 193 | Previous live; rollback | a009c08fad02aa6859ec6445784f744c6e269c8d | ADVANCED ACTIONS drawers take their button colours; larger openers and reshaped DAILY STATS; service worker unchanged. |
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


## Sites 190 / application releases 194 and 195 - 2026-11-17

- Curtis approved making the redesign live. PR48 merged as `a1d90e85a6489ab9c6ff636e50ed813d98363978`; merged tree is byte-identical to reviewed head `05ea7aaba28938c1ecec4013f9c54072994fd423`. Main had no concurrent changes beyond the queued baseline `103f00d`.
- The entire queued 194 is included, not replaced. Its full original handoff is preserved in `docs/archive/PUBLISH_RELEASE_194_195.md`. Release 195 is the compact mobile redesign described in `docs/MINIMALIST_REDESIGN.md`.
- Sites saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_e0501aa6b2688191a9cd97138a1f23b0` (Version 190). Deployment `appgdep_6afbeff994c88191b85ab2cc4cb588e6` succeeded at 2026-11-17 06:11:14.623645 UTC. Existing public URL and audience unchanged. Runtime environment revision 2 unchanged.
- Local production build, full lint and 468 tests passed. CI run 44026319502 passed on the exact PR head. CodeRabbit's latest summary covers `05ea7aa` with no actionable comments; both original findings were fixed and browser-rechecked. Standalone TypeScript diagnostics remain identical to the pre-existing baseline, not a clean standalone tsc pass.
- All eight live routes returned HTTP 200. All 76 emitted browser/static assets matched the approved build bytes. Chromium passed 24 route/viewport checks (390, 800 and 1180px) plus compact/full actions, view persistence/refused-write notice, unchanged synthetic fleet data, More/Escape, Back/Forward, top selector and repeated Advanced flows. The longer browser run produced four recoverable React #418 text-hydration warnings on Settings. The existing hidden SHIFT ENDS IN display renders independent server/client minute counts, and its component and clock module are byte-unchanged from the pre-redesign baseline. Fresh core-route checks in UTC and Chicago produced none; a fresh Settings check can reproduce it without service workers, so no cache cause is claimed. No functional failure or record loss was observed; a clean console in every cached/history path is not claimed.
- Independent comparison reproduced the same Settings hydration mismatch on detached pre-redesign `103f00d` in development mode (server/client shift names differed). `shift-settings.tsx` and `shift-clock.ts` are byte-identical across previous live `a009c08`, pre-redesign baseline and release `a1d90e8`. It is a pre-existing clock/timezone-rendering issue, not a redesign or service-worker regression. Baseline production browser comparison was limited by an asset-serving error; no such production comparison is claimed. Settings recovered by client-rendering, with no observed fleet-data harm. A separate deterministic-initial-clock fix is appropriate.
- Physical iPhone/Safari/Home Screen, hardware safe areas, VoiceOver and native share-sheet acceptance remain unperformed. Real-photo heat scanning and sheet identification remain unverified. No production fleet records were touched by validation.
- Previous-live rollback: Sites 189 / `sites-v189` at `a009c08fad02aa6859ec6445784f744c6e269c8d`. Pre-redesign checkpoint: `legacy/pre-minimalist-20261117-103f00d` at `103f00d15e73d09642720963043b16b05347c440`. PR39 MCP remains unmerged and excluded; no schema or credential change.


## Sites 191 / application 196 — 2026-11-17

- Source: `a9f610d42123cd6cfaaf32b61d8c78048d585c82`; PR49 reviewed head `50810e726cd5ad5751f14b77e3d1e18306e86eca` has an identical tree.
- Deployment: `appgdep_6afbfe5ea1b48191a676e0bc92d2c087`, succeeded at 07:12:36.997726 UTC. Public audience unchanged.
- CodeRabbit exact-head review: no actionable comments, minimal merge/security risk. CI 44035855706 passed.
- Local production build, 469 tests, whitespace check pass. Lint zero errors, one pre-existing .remember tool-file warning.
- Standalone TypeScript: same 238 baseline diagnostics, not a clean typecheck. Fresh browser interaction/physical iPhone checks unavailable.
- No operational-data, schema, credentials, editor-details, Down Sheet or audience changes. The legacy Advanced Actions storage value is untouched but no longer read or written; card-view preferences are still honored.
- Rollback: Sites 190 / `sites-v190`, `a1d90e85a6489ab9c6ff636e50ed813d98363978`.

Live verification: home, Defect Log and Down Sheet returned HTTP 200; Defect Log server output starts Detailed with Advanced Actions collapsed and drawer absent; all 27 referenced emitted JavaScript assets matched the release build byte-for-byte. This is HTTP/source verification, not fresh browser interaction.


## 2026-11-18: application197 / Sites194

Sites Version 194 / application release 197 deployed 2026-11-18 at 03:28:47.647741 UTC from `12822f60c7e5d76d3702108b33711cc116ca4f61`. Installed copies reopen the remembered page after safe document/hydration readiness; Doors picker receives its display-only emoji. PR50 CodeRabbit final review covered this exact SHA with no actionable comments; CI451 (44229747699) passed. Production build and 470 tests passed; ESLint zero errors and one preexisting warning. Browser loopback regression proved delayed-script/stalled-destination recovery; live HTTP200 and exact corrected inline script verified on Map, Defect Log, Down Sheet and Settings. Live Defect Log rendering checked. Physical iOS/Home Screen and real garage network behavior remain unverified. The initial service-worker document request remains unbounded; readiness taking more than the 2.5-second script budget falls back to map for that run. Sites192 and193 were saved candidates, never deployed. Rollback: Sites191 at a9f610d42123cd6cfaaf32b61d8c78048d585c82.

Deployment: `appgdep_6afd1b66b3288191956117ec62aff973`. Rollback tag for new release: `sites-v194`.


## Sites 195 / applications 198–205 — recovered publication record

- Source: `55812e1829f4a9469e901fb092980f3f86c5e536`. Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_12ff577f153081918db0ea71ee24759d`.
- Deployment `appgdep_6b03c244e16c819191e44012e05a7c4c` succeeded at 2026-11-23 04:34:18.238897 UTC. Existing public URL and audience unchanged. This is the actual preceding live publication; the older queue and handoff had not recorded it.
- This historical record uses authoritative Sites provenance and the earlier verified release-205 publication. It does not claim a new 205 test run or new physical-device verification in the 206 session.

## Sites 196 / application 206 — 2026-11-23

Sites Version 196 / application release 206 deployed 2026-11-23 at 23:36:15.204248 UTC from `e649c644c28b66f4bc7d4494726a79834a80164b`. The Log Defect BUS box says "Tap twice to type bus#" and gives a selected bus a location pill opening the existing BUS LOCATION move window; successful moves replace UNDO LAST. B11/B12 are short labels in that pill. Down Sheet retains its existing bus selector. Releases 198–205 were already live in Sites 195 from `55812e1829f4a9469e901fb092980f3f86c5e536`; this publication retains them and adds 206. The prior queued handoff's Sites 194 / release 197 live baseline was stale.

Fresh exact-source production build, all 482 regression tests (zero failures/skips), ESLint (zero errors/warnings) and whitespace checks passed. An independent source review found no confirmed release blocker; no exact-source GitHub Actions run is claimed. Managed preview served the unchanged production build after the Vite development preview failed on its network-interface API. In cloud Chromium, the new placeholder, Bus 17533 plus CNG East pill, BUS LOCATION modal open/cancel and unchanged `Bus 17533 · CNG East` Down Sheet label passed. No move, save or undo was performed.

Native deployment `appgdep_6b04cdea6f6081919542269fc5b8fbc7` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_5a0ebd9dfc8c8191b3981192f36f6f0e`. Runtime environment revision 2 and public audience revision 2 are unchanged. All eight live routes returned HTTP 200 with FLEETSTEP; all 63 public browser/static assets matched the tested build bytes. The live placeholder was checked in Chromium. That fresh live browser had no device-local fleet; selected-bus live modal and populated Down Sheet checks were not performed, and no fleet was seeded. Physical phone/Safari/Home Screen, touch keyboard and offline checks remain unverified. The accepted 360px placeholder clipping and missing focus return after modal close remain as documented. No production fleet records, cloud configuration, schema or credentials were changed.

Previous-live rollback: Sites 195 / application release 205 at `55812e1829f4a9469e901fb092980f3f86c5e536`. Its saved version is `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_12ff577f153081918db0ea71ee24759d`. The full former queue is in `docs/archive/PUBLISH_RELEASE_198_206.md`; `docs/PUBLISH_NEXT.md` is reset to NONE PENDING. PR39 remains held and excluded.

- Gzip archive SHA256: `e41e2d0b32eff8839df60090cb4a651eb835a51c02234193c65e45c2e1005830`. Native saved tar hash: `sha256:73aa17d9ad077fa3b0320a115f8f3162c54caf9c37d17fca4635e211774f9cf6` (5,806,080 bytes, 128 files). These hashes describe different encodings, not identical files.
- Live Defect Log bundle `assets/page-B5HqIEpn.js` SHA256: `6119f528a7687a57594db1c4d8fd72ce384a7e3af0d10953f564f7246f509f70`; contains `Tap twice to type bus#`, `BUS LOCATION`, and `Moved Bus `. Shared bundle contains B11/B12. Asset smoke excludes nonpublic deployment metadata `.assetsignore`, `.vite/manifest.json`, `_headers`.
- Release-record work starts from GitHub main `53bb7d0cd888fab4ea9358b1585e12c62b729418`, preserving its queued handoff verbatim in the archive. Source publication stays pinned to `e649c644c28b66f4bc7d4494726a79834a80164b`; these later records are documentation only.

- Rollback tags `sites-v195` (`55812e1`), `sites-v196` and `sites-release206` (`e649c64`) are prepared in the isolated local checkout. Their GitHub push remains pending: command-line Git has no GitHub credential, the connected GitHub tools expose branch updates but no tag creation, and the browser is signed out. No remote tag is claimed. Saved Sites 195 remains available as the exact rollback independently of these tag aliases.

## Sites 197 / applications 207–209 — 2026-11-24

Sites Version 197 / application release 209 deployed 2026-11-24 at 21:03:26.739201 UTC from `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`. It includes 207 and 208: the Defect Log top box holds + LOG DEFECT and SEARCH; LIVE DEFECT FEED puts the count above the view controls; the unlit ALL drop-down exposes eight logged-time choices, including PREVIOUS SHIFT. Fixed Repairs offers PREVIOUS SHIFT as well. No migration, storage-key rename, sync, AI Operator, or hosting configuration change. PR39 MCP remains held and excluded.

Exact-source production build, all 484 tests (zero failures or skips), ESLint (no lint diagnostics), and `git diff --check` passed. No exact-source GitHub Actions run was reported. Chromium on the production build and the live site confirmed the eight options, PREVIOUS SHIFT face and shift-hours banner, clearing search when reselecting ALL, DETAILED/COMPACT selection, the unlit window picker, and the Fixed Repairs option. Live navigation rendered Defect Log, Fixed Repairs, Down Sheet, and Facility Map. No fleet records were added, edited, or moved. A physical iPhone's native picker, phone-width layout and actual card rendering with device-local defect records, Home Screen and offline checks were not independently verified.

Native deployment `appgdep_6b05fb91242481918428e2cfe699fe63` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_f9ecbfe3cdb88191b5ff93c099266722`. The existing public URL, access policy revision 2 and runtime environment revision 2 are unchanged. Previous-live rollback: Sites 196 / application release 206 at `e649c644c28b66f4bc7d4494726a79834a80164b`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_5a0ebd9dfc8c8191b3981192f36f6f0e`.

The approved queue and remaining device checks are archived in [PUBLISH_RELEASE_207_209.md](archive/PUBLISH_RELEASE_207_209.md). The publish queue is reset to NONE PENDING.

- Gzip archive SHA256: `09f05cd6e1a65e5bef852e0c1b139d0e095e88390bf2d50852dd91f3b1964026`. Native saved tar hash: `sha256:e0712fc5b45c76f2fd5080991c06b69aabc28c1a50272f05d08275922beb284a` (5,816,320 bytes; 128 files).

## Sites 198 / application 210 — 2026-11-24

Sites Version 198 / application release 210 deployed 2026-11-24 at 23:04:43.361149 UTC from `8ed0ce2dbf5c5eea6025b846440d43a650d4183c`. The Defect Log header is REFRESH, SCAN and SHARE. SCAN offers three sheet-specific tiles; SHARE opens Defects Logged; QUICK FILTERS is on the feed row; UNDO LAST is shown only when usable. SCAN BATCHES and CLEAN UP moved to Settings; AI Operator is on the map and reachable in the phone More menu. No migration, storage-key rename, sync or hosting configuration change. PR39 MCP remains held and excluded.

Exact-source production build, all 485 tests (zero failures or skips), ESLint (no lint diagnostics), and `git diff --check` passed. Exact-build Chromium opened all three scanner dialogs without scanning or uploading; it opened the Defects Logged share and Quick Filters, followed Settings → Scan Batches, and reached the no-eligible-records alert through Settings → Clean Up. Live Chromium verified the new header and tile row, Down Sheet scanner, Share drawer and its three actions, Quick Filters, and the Settings Scan Batches route and panel. It also verified that the Clean Up control was present. The live browser had no device-local fleet, so the other two scanners were disabled there. No live undo, cleanup, file upload or share was executed, and no fleet records were changed. Physical iPhone/Safari, phone More → AI Operator, populated-device Undo Last and Clean Up, Home Screen and offline remain device checks.

Native deployment `appgdep_6b06180053cc8191a86605cf420b267c` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_e08cb5db2244819183afb7d356bac441`. The existing public URL, audience revision 2 and runtime environment revision 2 are unchanged. Immediate rollback: Sites 197 / application release 209 at `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_f9ecbfe3cdb88191b5ff93c099266722`.

The approved queue and phone checklist are in [PUBLISH_RELEASE_210.md](archive/PUBLISH_RELEASE_210.md). The publish queue is reset to NONE PENDING.

- Gzip archive SHA256: `f431a3c9eab08d8e9a2724b72e6cec39000035a5ff6dec2928eef3e791dfea87`. Native saved tar hash: `sha256:1b62c0b02b440e3f9f922b33bdf4fe4184b540fafd3c1594915a24f928b553e4` (5,836,800 bytes; 128 files).

## Sites 199 / application 211 — 2026-11-25

Sites Version 199 / application release 211 deployed 2026-11-25 at 00:12:04.200721 UTC from `db6683d66884c3a25de88c896561a3226e1f67b2`. DAILY STATS and its five tiles are removed from the Defect Log; + LOG DEFECT and SEARCH sit under the header, or under the Scan drawer when open. The retired stats key is left untouched on existing devices. No migration, sync, storage-key addition, hosting change or fleet-record modification. PR39 MCP remains held and excluded.

Exact-source production build, 485 tests (zero failures or skips), ESLint and `git diff --check` passed. Live Facility Map, Down Sheet and Defect Log returned HTTP 200. The live Defect Log response contains the header actions, then LOG DEFECT and SEARCH, then LIVE DEFECT FEED, with no DAILY STATS bar. The cloud browser could not open the managed preview or bind the live tab, so visual spacing and a physical iPhone are not independently verified. The queue records the prior developer width checks.

Native deployment `appgdep_6b0627cca0708191a332f0b1b29af2c3` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_c5dabcca09ec819181a8579372e1621f`. The public URL, audience revision 2 and runtime environment revision 2 are unchanged. Immediate rollback: Sites 198 / application release 210 at `8ed0ce2dbf5c5eea6025b846440d43a650d4183c`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_e08cb5db2244819183afb7d356bac441`.

The approved queue is archived in [PUBLISH_RELEASE_211.md](archive/PUBLISH_RELEASE_211.md). The publish queue is reset to NONE PENDING.

- Native saved tar hash: `sha256:e80d36045464eea5bbe6933b17a94aa97900a9670905e371a17113e0097a25f7` (5,826,560 bytes; 128 files).
- Rollback alias `sites-v199` was created locally; remote tag publication is not confirmed. Sites 199 and the exact source SHA are available independently of the tag.

## Sites 200 / applications 212–214 — 2026-11-25

Sites Version 200 / application release 214 deployed 2026-11-25 at 03:11:32.770199 UTC from `4d205dbef009f1a74aff807dd6db474c6ddb97d3`, carrying 212 and 213. The Defect Log no longer adds the normal older-buses banner when changing windows; the unavailable-window and search notices remain. The Down Sheet has REFRESH, SCAN and SHARE, compact shift/counts/filter tabs, five watch lists, and CLEAR DOWNSHEET in Settings. Phone CSS addresses crowded Defect Log bus numbers, the welcome heading and the Map DECOMMISSIONED tile. No migration, sync, storage-key addition or rename; seven retired panel keys are left untouched on devices. PR39 MCP remains held and excluded.

Exact-source production build, 485 tests (zero failures or skips), ESLint and `git diff --check` passed. Managed Chromium preview verified closed-by-default panels, mutually exclusive switching and repeat-tap collapse, Mystery, Scan, the four Share drawer actions, Settings’ CLEAR DOWNSHEET control, and Maintenance → Union with all six roles and the heading below Close at desktop width. Preview and live Chromium verified THIS SHIFT and ALL without the normal older-buses banner or a feed-height change. Live Chromium opened the Down Sheet Share drawer, Mystery (open and close), and Scan dialog. No records were changed, no share or upload was performed, and Clear was not activated. Physical iPhone, phone CSS geometry (developer measurements in the archive), synthetic clear confirmation/undo, and installed/offline checks remain open.

Native deployment `appgdep_6b0651dfd5408191b3484bc0edcff59c` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_b44b682c12d48191a184a89654ff3adc`. Public URL, access policy revision 2 and runtime environment revision 2 are unchanged. Immediate rollback: Sites 199 / release 211 at `db6683d66884c3a25de88c896561a3226e1f67b2`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_c5dabcca09ec819181a8579372e1621f`.

The approved queue and detailed checks are archived in [PUBLISH_RELEASE_212_214.md](archive/PUBLISH_RELEASE_212_214.md). The publish queue is reset to NONE PENDING.

- Native saved tar hash: `sha256:656105f9c6aba79b3f3958522eb36bd5cfe5c39afb965d9b2e5c3eed005c38f3` (5,847,040 bytes; 132 files).
- The `sites-v200` alias was created locally; remote tag publication is not confirmed. The exact source and saved Sites checkpoint are available independently.

## Sites 201 / application 215 — 2026-11-25

Sites Version 201 / application release 215 deployed 2026-11-25 at 03:29:24.389651 UTC from `24ccb374a578f7ffa80fa4037399aaa6ab5b953b`. Only the Maintenance Down Sheet title default increased, from 15 px to 17 px. Legacy 15 px values without customization metadata take the new default; other stored sizes and colors are preserved, and a newly selected 15 px size is retained. No fleet data, sync, hosting configuration, or storage key changed. PR39 remains excluded.

Exact-source production build, ESLint, 486 tests, and `git diff --check` passed. GitHub CI run 510 succeeded and CodeRabbit completed on this exact PR #59 head without a release blocker. The live title rendered at 17 px in Chromium. Physical iPhone layout remains unverified.

Native deployment `appgdep_6b06560fac348191b1f15b181d5c1c21` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_efe1de3a58d4819199e7ecfc58805473`. Public access and the runtime environment remain unchanged. Rollback: Sites 200 / application release 214 at `4d205dbef009f1a74aff807dd6db474c6ddb97d3`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_b44b682c12d48191a184a89654ff3adc`.

No other release is pending.

- The `sites-v201` alias was created locally; remote tag publication is not confirmed. The saved Sites checkpoint is available independently.

## Sites 202 / application 216 — 2026-11-25

Sites Version 202 / application release 216 deployed 2026-11-25 04:30:06.350181 UTC from `8cdd02358b07301ca4739a5416865736c9686ef4`. In Fixed Repairs → Completed Repair History, emoji/category subtitles such as Amerex and Suspension and Steering increase from 9 px to 12 px. Issue descriptions, other headings, data, storage, sync, and hosting configuration do not change. PR39 MCP remains held and excluded.

Exact-source ESLint, production build, 486 tests, and diff checks passed. GitHub CI run 514 succeeded. [CodeRabbit reviewed the exact PR #60 head](https://github.com/curtistheconqueror/bus-tracker/pull/60#issuecomment-7152790675) with no actionable findings. Isolated Chromium preview confirmed four synthetic cards at desktop and 360/415 px phone-like widths: 12 px labels, unchanged 13 px issue text, no overlap or horizontal overflow. The public Map, Down Sheet, Defect Log and Fixed Repairs returned HTTP 200; the served Fixed Repairs stylesheet includes the scoped 12 px rule. No real data was written. Physical iPhone verification remains open.

Native deployment `appgdep_6b06644737e081918ca934338170efdd` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_27f08c6b3e00819191b39b6a1a12bf47`. Public access and runtime revisions remain 2. Immediate rollback: Sites 201 / application release 215 at `24ccb374a578f7ffa80fa4037399aaa6ab5b953b`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_efe1de3a58d4819199e7ecfc58805473`.

- Native saved tar hash: `sha256:9737bcd2b850dc6fb7f17790807083236a669c82260ba870e9bf9fc3c0412a9c`.
- The `sites-v202` alias was created locally; remote tag publication is not confirmed.

## Sites 203 / application 217 — 2026-11-25

Sites Version 203 / application release 217 deployed 2026-11-25 22:06:08.501348 UTC from `2c00cf88bbe51894ad588ac3585122fe025fdf92`. Detailed Defect Log bus cards show OLDEST directly below LATEST, using the original logged time of the oldest dated, not-completed, non-removed Defect Log record on that bus across feed windows and search. The repeated issue preview is removed from the detailed card face; the individual expanded rows and Compact preview are preserved. LATEST, OLDEST, and the expanded LOGGED, UPDATED, and LAST REPORTED timestamps grow from 9 px to 12 px at the default root size. Their underlying timestamps, sorting, data, storage, sync, and hosting configuration are unchanged. PR39 MCP remains held and excluded.

Exact-source ESLint, production build, 489 local tests, and diff checks passed. A mutation using the last update instead of the original logged time failed the new regression test. GitHub CI [run 518](https://github.com/curtistheconqueror/bus-tracker/actions/runs/45708842602) passed. [CodeRabbit reviewed the exact PR #61 head](https://github.com/curtistheconqueror/bus-tracker/pull/61#issuecomment-7175650210). The public Map, Down Sheet, Defect Log and Fixed Repairs returned HTTP 200. The served Defect Log JavaScript and stylesheet matched the checked production artifact byte-for-byte. The managed browser preview could not start, so actual physical iPhone layout and fleet data are unverified.

Native deployment `appgdep_6b075bc8d554819192aeefb860b2267e` succeeded; saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_71cfdae29cf88191bec50026bef6d549`. Public access and runtime revisions remain 2. Immediate rollback: Sites 202 / application release 216 at `8cdd02358b07301ca4739a5416865736c9686ef4`, saved version `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_27f08c6b3e00819191b39b6a1a12bf47`.

- Native saved tar hash: `sha256:ec6c2e484c862e1ea4e85d26bcb37c970ea3db67a5f0d26d661610d6f4b77e6c`.
- The `sites-v203` alias was recorded locally; remote tag publication is not confirmed.

No other release is pending.

## Sites 204 / application 218 — 2026-11-25

- Live source: `50340aef96e9bc87f9b8d43b7c485af97fab3d9d`, published 2026-11-25 22:39:33.488072 UTC.
- Detailed light-theme Defect Log cards have thin black bus and defect outlines, preserving chosen bus outline colors and colored work-state rails. When the existing Closing Line preference shows the footer, it is solid black with its original white-on-black label and height, including with the optional number rail. Compact, timestamps, records, storage, sync, and hosting are unchanged. PR39 MCP remains held and excluded.
- ESLint, production build, all 491 local tests, and diff checks passed. [CI run 520](https://github.com/curtistheconqueror/bus-tracker/actions/runs/45714445250) passed. [CodeRabbit PR #62 review](https://github.com/curtistheconqueror/bus-tracker/pull/62#issuecomment-7176541937) covered the exact source commit and all four changed files with no actionable comments. Map, Down Sheet, Defect Log, and Fixed Repairs returned HTTP 200. The live Defect Log CSS and JavaScript matched the build byte-for-byte. Managed preview could not start; physical iPhone appearance and local fleet data were not verified.
- Saved version: `appgprj_6a6f71ee10748191be94e962b3e665c2~appgver_ede58b709fac81918d39415c9ef46061`; deployment: `appgdep_6b07639f63408191a9bb53e4e03e9ea2`. Archive: `sha256:bf84ad804df87642674d8509f85a174c8aabe506c11e94a70654e1088cf779b6`.
- Immediate rollback: Sites 203 / application release 217 at `2c00cf88bbe51894ad588ac3585122fe025fdf92`. Public URL and access/runtime revisions are unchanged.
