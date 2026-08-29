# Fleet Maintenance Bus Tracker - Current Project Handoff

Updated: 2026-08-27
Repository: C:\Users\curti\pace-south-bus-tracker
Branch: main
Live application: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/
Live release: Sites Version 121
Live feature checkpoint: commit 8ce3e5b

## Read this first

This file is the authoritative continuation guide. Older snapshots are preserved under docs/archive for historical reference only. Do not use an archived handoff as current implementation guidance.

The project is an offline-capable fleet maintenance operations application with five surfaces:

1. Facility Map — physical location, operating status, fleet markers, fast movement, and AI Operator commands.
2. Interactive Down Sheet — scheduled repairs, shifts, assignments, estimates, photo import, and completion workflow.
3. Real-Time Defect Log — mobile-first field observations and smaller repairs that usually do not belong on the Down Sheet.
4. Fixed Repairs — offline completed-repair history used for future diagnosis, with carried defect facts plus editable fix, verification, part, technician, and completion-time fields.
5. Fleet Campaigns — independent device-local punch lists with custom columns, reusable report formats, completion initials/timestamps, and shareable text output. Also hosts the Work Time panel, which totals a person's day across campaign rows and Defect Log repairs; the panel takes its records as props and is built to be relocated.

## Domain ownership

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
- A finding is what the shop found, not what the driver reported, and it renders through defectLabel so every surface shows it. Anything that builds its own defect line must go through that function rather than reassembling category and issue, or the finding silently stops reaching the Down Sheet.
- Defect Log totals count direct Defect Log records only. Down Sheet or tracker records may display for continuity but do not inflate that count.
- A reviewed photo import is authoritative for the Down Sheet only: it replaces every prior Down Sheet row, reconciles every DS badge, lists buses coming off before approval, and remains undoable. It must never delete or complete Defect Log records.
- Export and import remain the recovery path until shared persistence is live.

## Current release state

Version 121 is the current user-approved live release. Its validated source checkpoint is commit 8ce3e5b. Suspension and Steering now offers separate Front air bag leak and Rear air bag leak choices for new defects. Existing records saved as Air bag retain their original wording, and no LocalStorage key, fleet record, repair, location, or user data was rewritten.

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
The Version 121 production build, lint gate, and all 121 regression tests passed before publication. Sites reported the production deployment successful on 2026-08-29.

## Repository and remotes

- origin — private GitHub backup at curtistheconqueror/bus-tracker
- sites — existing OpenAI Sites source remote

The history is intentionally linear. Do not rewrite published commits, force-push, or place Sites credentials in Git configuration. Use small descriptive commits as rollback points.

## Source map

- app/page.tsx — Facility Map orchestration and device persistence
- app/facility-layout.ts — facility sections, slots, capacities, and migrations
- app/smart-status.ts — destination-aware status rules
- app/operator-engine.ts and app/operator-batch.ts — AI Operator parsing and atomic actions
- app/down-sheet/ — Down Sheet route, editor, estimates, scan review, and two-way synchronization
- app/defect-log/ — Defect Log route, grouping, filters, settings, and linked-repair behavior
- app/fixed-repairs/ — offline completed-repair history and completion-detail editing
- app/repair-catalog.ts — structured repair categories and quick selections
- tests/rendered-html.test.mjs — release-gate regression coverage
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

The next major phase is immediate phone/iPad synchronization without losing offline operation. The recommended implementation is offline-first:

1. Freeze and document the current LocalStorage schemas and migration rules.
2. Define durable IDs for buses, defects, Down Sheet entries, movements, notes, and audit events.
3. Add authenticated server persistence and role-aware access.
4. Keep a local cache plus an ordered offline mutation queue.
5. Apply local changes immediately, then synchronize when connectivity returns.
6. Use server timestamps, record revisions, idempotency keys, and explicit conflict handling.
7. Subscribe devices to real-time updates and reconcile without duplicating repairs or movement events.
8. Import one trusted current backup as the initial shared dataset.
9. Run dual-write and rollback validation before making the backend authoritative.

The first backend milestone should synchronize fleet location and bus status between two test devices while preserving the current offline behavior. Down Sheet, Defect Log, and Fixed Repairs completion details follow after the identity, revision, and conflict model is proven.

## Product roadmaps

The future operator-facing defect-card replacement is documented at docs/roadmap/operator-reported-defects.md. It is separate from the current mechanic-focused Defect Log and requires shared authentication, permissions, attachments, and an audit trail.

## Safe continuation prompt

Open C:\Users\curti\pace-south-bus-tracker and read README.md, PROJECT_HANDOFF.md, CONTRIBUTING.md, docs/PUBLISH_NEXT.md, docs/RELEASES.md, and docs/SITES_PUBLISHING_RUNBOOK.md completely before acting. Inspect git status and recent commits. Preserve LocalStorage migrations, fleet identity, facility slot IDs, capacity-safe swaps, touch behavior, linked repair records, and all user data. Work in small stages, add focused tests, run npm test and git diff --check, and commit only the requested change. Never create a new hosting project or publish without explicit approval.
