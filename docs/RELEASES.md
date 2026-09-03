# Release reference

Sites version numbers are deployment checkpoints, not the package version in package.json. Git commits remain the authoritative rollback points.

| Sites version | State | Source commit | Summary |
| --- | --- | --- | --- |
| 145 | Live | 5aab35f | Defect Log opens on collapsed DAILY STATS and + LOG DEFECT; Fixed Repairs can log a completed repair without a prior defect, including a safe append save path |
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

Earlier history remains available through git log. Version-specific continuation snapshots are preserved in docs/archive.

When a release is published, update this table and PROJECT_HANDOFF.md in the same follow-up commit, and reset `docs/PUBLISH_NEXT.md` to STATUS: NONE PENDING.
