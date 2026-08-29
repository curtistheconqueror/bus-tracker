# Release reference

Sites version numbers are deployment checkpoints, not the package version in package.json. Git commits remain the authoritative rollback points.

| Sites version | State | Source commit | Summary |
| --- | --- | --- | --- |
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
| 119 | Live | b40741f | Per-repair Down Sheet completion dates and partial-progress rollups; expanded engine, charging, belt, pulley and counted air-bag repairs; split surge-tank sides and a Potential No Cabin Heat winter filter |
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
