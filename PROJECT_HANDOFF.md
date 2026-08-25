# Fleet Maintenance Bus Tracker - Current Project Handoff

Updated: 2026-08-25
Repository: C:\Users\curti\pace-south-bus-tracker
Branch: main
Live application: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/
Live release: Sites Version 94
Live feature checkpoint: commit 13c7244

## Read this first

This file is the authoritative continuation guide. Older snapshots are preserved under docs/archive for historical reference only. Do not use an archived handoff as current implementation guidance.

The project is an offline-capable fleet maintenance operations application with three connected surfaces:

1. Facility Map — physical location, operating status, fleet markers, fast movement, and AI Operator commands.
2. Interactive Down Sheet — scheduled repairs, shifts, assignments, estimates, photo import, and completion workflow.
3. Real-Time Defect Log — mobile-first field observations and smaller repairs that usually do not belong on the Down Sheet.

## Domain ownership

These boundaries prevent synchronization bugs:

- The Facility Map owns physical bus location.
- The Down Sheet owns formal maintenance scheduling and active Down Sheet membership.
- The Defect Log owns records created directly from the Defect Log.
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
- Defect Log totals count direct Defect Log records only. Down Sheet or tracker records may display for continuity but do not inflate that count.
- Photo import is reviewed and merged. It must not silently discard existing board data.
- Export and import remain the recovery path until shared persistence is live.

## Current release state

Version 94 is the current user-approved live release. Its validated feature checkpoint is commit 13c7244. It builds on Version 93 with:

- a new Operator Controls category covering gauges, front and left-side dashes, switches, doors, HVAC controls, lighting, start controls, seat belts, driver-seat faults, and persistent horn or seat alarms;
- a Bike Rack bodywork option;
- Cooling System choices for radiator leaks, fan diagnostic lights, fans constantly running on high, and one through eight failed radiator fans;
- a centered Save & Close action immediately above Add to Down Sheet while retaining the bottom Save action; and
- a collapsed Advanced Details section for diagnostic notes, actions, part numbers, and initials.

The Version 94 production build, lint gate, and all 57 regression tests passed before publication. Sites reported the production deployment successful on 2026-08-25.

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
8. Save and publish through the existing Sites project only after user approval.
9. Record the live Sites version and source commit in docs/RELEASES.md and this handoff.

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

The first backend milestone should synchronize fleet location and bus status between two test devices while preserving the current offline behavior. Down Sheet and Defect Log records follow after the identity, revision, and conflict model is proven.

## Product roadmaps

The future operator-facing defect-card replacement is documented at docs/roadmap/operator-reported-defects.md. It is separate from the current mechanic-focused Defect Log and requires shared authentication, permissions, attachments, and an audit trail.

## Safe continuation prompt

Open C:\Users\curti\pace-south-bus-tracker and read README.md, PROJECT_HANDOFF.md, CONTRIBUTING.md, and docs/RELEASES.md completely before acting. Inspect git status and recent commits. Preserve LocalStorage migrations, fleet identity, facility slot IDs, capacity-safe swaps, touch behavior, linked repair records, and all user data. Work in small stages, add focused tests, run npm test and git diff --check, and commit only the requested change. Never create a new hosting project or publish without explicit approval.
