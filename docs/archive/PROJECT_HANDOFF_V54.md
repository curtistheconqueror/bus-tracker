# Pace South Bus Tracker - Full Project Handoff

Updated: 2026-08-06
Repository: C:\Users\curti\pace-south-bus-tracker
Branch: main
Live site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/
Live Sites version: 54
Live code commit: 148520f906fad265ae2fe0dd200da8918f0d988c

## Repository remotes

- `origin`: private GitHub backup at `curtistheconqueror/bus-tracker`.
- `sites`: existing OpenAI Sites source repository used only for Sites releases.
- Never copy a Sites credential or token into `origin`, a remote URL, Git configuration, source files, or documentation.

## Purpose

This is an interactive facility-wide fleet map and maintenance down sheet for Pace South. It tracks physical bus locations, operating status, repair defects, road calls, tow activity, down-sheet membership, and shift repair scheduling. It is designed primarily for desktop and iPad landscape use and can be installed on iPhone/iPad as a Home Screen web app.

## Can Hermes or Claude Code help?

Yes. Any coding agent that can access this repository, edit TypeScript/CSS, and run Node commands can continue development. Give it this file and ask it to read the repository before editing.

Important limitation: Hermes or Claude Code can implement, test, and commit changes locally, but they cannot publish to the current ChatGPT Sites project unless they also have the OpenAI Sites connector and authorization. The safest workflow is:
1. Let the coding agent implement and run npm test.
2. Have it commit changes locally.
3. Return to Codex with the commit and request a saved site version.
4. Review that saved version, then explicitly approve publication.

Never place a Sites write token in a file, Git remote URL, or Git configuration. Sites source credentials are short-lived and per-command only.

## Current release state

- Version 52: board backup/export and import transfer controls plus the latest touch/locate fixes.
- Version 53: AI Operator fleet intelligence, duplicate and fleet audits, location/status activity timestamps, remembered result groups, and capacity-safe follow-up relocation to IN SERVICE / ON ROAD.
- Version 54: optional per-device confirmation prompts, published from commit `148520f`.
- Version 54 is currently published and live.
- Important recent checkpoints:
  - `148520f` Add optional confirmation prompt settings (Version 54, live)
  - `ba85acd` Add AI Operator fleet intelligence and follow-up relocation (Version 53)
  - `44387c8` Document future operator defect reporting phase

## Version 54 confirmation preferences

Dashboard Settings includes a `CONFIRMATION PROMPTS` section below Board Backup and above Touch Controls:

- `CONFIRM BUS MOVES & SWITCHES` gates confirmation prompts for Move Bus Here, editor Switch/Reassign, and Multi-Locate group moves.
- `CONFIRM GROUP DEFECT ASSIGNMENT` gates the bulk add-defect confirmation prompt.
- Both preferences are independent, per device, and default to ON.
- Missing, unset, or corrupted saved values restore the safe ON behavior.
- Values persist in `pace-board-settings-v1` as `confirmMoves` and `confirmDefects` and are included in backup export/import.
- Import Backup always requires confirmation regardless of these preferences.
- Drag-and-drop and the editor's MOVE TO AREA behavior remain unchanged and do not prompt.
- Shared helpers live in `app/confirmation-preferences.ts`.

## Runtime and commands

Required:
- Node.js 22.13 or newer. Current machine uses Node 24.15.0.
- npm. Current machine uses npm 11.12.1.

Commands:
- npm install
- npm run dev
- npm run build
- npm test
- npm run lint
- npm run db:generate

npm test is the required release gate. It performs a production vinext build and runs tests/rendered-html.test.mjs. The current suite contains 23 passing tests.

## Technology

- React 19
- Next-compatible app structure built through vinext/Vite
- TypeScript
- Plain CSS plus Tailwind import
- Cloudflare-compatible output
- OpenAI Sites hosting
- Browser LocalStorage for all operational data
- Service worker and web manifest for offline-capable Home Screen behavior
- Drizzle/D1 scaffolding exists but the live app does not use a database

.openai/hosting.json:
- project_id: appgprj_6a6f71ee10748191be94e962b3e665c2
- d1: null
- r2: null

## Critical architecture

Main tracker:
- app/page.tsx
- app/globals.css

Down sheet:
- app/down-sheet/page.tsx
- app/down-sheet/down-sheet-editor.tsx
- app/down-sheet/down-sheet-settings.tsx
- app/down-sheet/down-sheet.css
- app/down-sheet/down-sheet-sync.ts
- app/down-sheet/tracker-membership-sync.ts

Shared logic:
- app/repair-catalog.ts: structured defect catalog, summaries, migration
- app/smart-status.ts: road/shop status rules and atomic bus swaps
- app/fleet-validation.ts: protected bus number and occupancy validation
- app/facility-layout.ts: Road and CNG West capacities and lossless migration
- app/section-count.ts: live section counters
- app/down-sheet-counter.ts: tracker/down-sheet ratio
- tests/rendered-html.test.mjs: release regression suite

PWA/offline:
- public/sw.js
- public/manifest.webmanifest
- public/favicon.svg

Hosting/build:
- .openai/hosting.json
- vite.config.ts
- worker/index.ts
- package.json

README.md is still the generic vinext starter README. Treat this handoff as the authoritative project guide.

## Data persistence and the biggest current limitation

All live fleet, down-sheet, theme, and note data is device-local in LocalStorage. The published URL distributes application code, not shared operational data.

Storage keys:
- pace-board-v1: tracker fleet payload, currently version 4
- pace-board-settings-v1: themes, status colors, visual settings
- pace-down-sheet-v1: maintenance entries, currently version 1
- pace-down-sheet-settings-v1: down-sheet preferences and Quick Notes

Consequences:
- A code update becomes available to every visitor after refresh/update.
- Bus locations and repairs do not automatically transfer between devices.
- A browser tab and a Home Screen installation can have separate storage.
- Different staff members do not currently share one live operational board.
- Export/Share Backup and Import Backup are the current transfer mechanism.
- The service worker supports offline app-shell use, but offline data remains local.

Do not rename or clear these keys casually. Preserve migrations and existing saved data during every change.

## Bus model

The main B type in app/page.tsx contains:
- id: stable internal identity
- n: protected fleet number
- s: status
- l: facility slot ID
- mechanic, foreman, shift, priority
- safe, down
- notes, pendingRepair
- roadcall, roadcallSolid, roadcallLocation
- towInProgress
- checkEngine
- noHorn
- badRampKneeler
- parkedAt
- outReason
- defects: StructuredDefect array
- transient UI-only values: acIssue, onDownSheet, multiLocated

Transient values must be stripped before saving. saveEditor currently removes acIssue, onDownSheet, and multiLocated.

Fleet numbers:
- Existing fleet identities are protected in the normal bus editor.
- Authorized number corrections occur only in Dashboard Settings.
- Duplicate new numbers are blocked.
- Some original seed/demo records contain repeated numbers; do not rewrite saved user data just to clean seed data.

## Official statuses

- service: IN SERVICE / ON ROAD, blue
- defect: IN SERVICE WITH DEFECTS, green
- shop: WORK IN PROGRESS, yellow
- out: OUT OF SERVICE, red, optional Scheduled or Unscheduled reason
- decommissioned: DECOMMISSIONED / DOWN INDEFINITELY, dark gray
- unknown: UNKNOWN / MYSTERY, gray

Tow Staging is a location, not a status.
Roadcall is an orange overlay/flag, not a status.
Tow In Progress is a bus flag, not a status.

Status colors and dashboard colors are configurable in Settings.

## Smart status rules already implemented

app/smart-status.ts is authoritative:
- Moving into a Shop Bay changes status to shop.
- Returning to IN SERVICE / ON ROAD examines unresolved structured defects.
- No unresolved defects -> service (blue).
- Unresolved serviceable defects -> defect (green).
- An unresolved downing defect -> out (red).
- Other location changes preserve the current status unless manually changed.
- Dropping a bus onto an occupied parking space atomically swaps the two buses.
- parkedAt updates whenever a bus is reassigned.

Manual status selection in the editor overrides smart suggestions for that edit.

## Facility layout and fixed capacities

Current visible capacities:
- Service Detail: 8, single file
- Paint Booth: 1
- Wash Rack: 1
- Body Shop: 1
- Shop Bays: 9
- Pit: 2
- Brake Test: 2
- Tow Staging: 3
- CNG East: 18, two columns by nine rows
- In Service / On Road: 75, five columns by fifteen rows
- Shop Wall: 8, single file
- Main Garage: 84, twelve bays by seven rows
- CNG West: 40, eight columns by five rows

Shop Bay physical layout:
- Bay 1 remains at its established anchor.
- Odd/even bays face each other.
- Display array is BAY_LAYOUT = [null,8,6,4,2,9,7,5,3,1].
- Do not reintroduce Bays 10-12 into the diagonal Shop Bays.

CNG East:
- EAST_SLOTS deliberately uses retained column IDs 1 and 2 from the previous four-column layout.
- Do not renumber EAST_SLOTS without a saved-data migration.
- Current CSS right-aligns the two-column lot while preserving original parking-space width.
- This resolved the prior overlap with Tow Staging and excessive gap to On Road.

Capacity reduction logic must never discard a bus. Overflow buses remain visible in NEEDS REASSIGNMENT containers until a slot is available.

## Main Garage Version 42 settings

Dashboard Settings now has MAIN GARAGE APPEARANCE:
- Bays 11 & 12 Parking Spaces changes every cell in columns 11 and 12.
- Garage Border, Top & Row Banners changes the garage outer border, top 01-12 banner, and ROW 1-7 labels together.
- The two values are visuals.garageSpecial and visuals.garageFrame.
- CSS variables are --garage-special and --garage-frame.
- Garage special slots are marked with garage-special-slot when column index is 10 or 11.
- Every theme supplies defaults for both values.
- Local settings and JSON backup export/import preserve them.

## Bus interaction behavior

Mouse/keyboard:
- Hover or keyboard focus opens the compact quick view.
- Click opens the full editor.
- Drag moves or swaps buses.

Touch:
- One tap opens the compact quick view.
- Double tap opens the full editor.
- Double tap an empty parking space to add a bus.
- Modal scroll locking prevents the map behind a modal from moving.

Quick view includes applicable data only:
- bus number and status
- time sitting based on parkedAt
- pending repair summary
- Roadcall and Roadcall location
- Tow In Progress
- Check Engine Light
- No Horn
- Bad Ramp/Kneeler ADA

## Repair and defect model

StructuredDefect fields:
- id
- category
- issue
- details
- operability: service or down
- state: open, deferred, or completed

pendingRepair is a generated summary of unresolved structured defects. The structured defects are the source of truth.

The catalog in app/repair-catalog.ts includes:
- A/C and HVAC
- Engine
- Cooling System
- Transmission
- Suspension
- Steering
- Brakes
- Tires and Wheels
- Battery, Starting and Charging
- Electrical / Multiplex, including Horn
- Tech Services, including Farebox, Ventra, MDT Screen, Destination Sign
- Amerex with Fire Suppression and Gas Concentration subgroups
- Fuel Delivery
- No Start
- Doors, Ramp and Lift
- Lights and Fixtures
- Bodywork
- Air System
- Inspection, including A-6, A-15, B-12, B-18, C-24, Three-Piece, and valve/spark-plug service
- Preventive Maintenance
- Miscellaneous
- Manual defect entry

The defect picker and saved-defect list have independent scrolling to support many categories and multiple defects.

## Warning flags and quick filters

Version 41 added saved bus flags:
- Check Engine Light
- No Horn
- Bad Ramp/Kneeler (ADA) with wheelchair icon

Bottom commands include:
- AC BUSES
- CHECK ENGINES
- BAD RAMP/KNEELER (ADA)
- MYSTERY BUSES
- DOWN SHEET count or tracker/down-sheet ratio
- PENDING REPAIR
- UNSCHEDULED WORK

Quick filters dim nonmatching buses and pulse matching buses.

## Locate controls

Single locate:
- Enter one bus number and press LOCATE.
- It scrolls to the bus and pulses temporarily.

Multi locate:
- Press MULTI.
- Add bus numbers one at a time.
- Selected buses remain highlighted until Clear All or the active MULTI/CLEAR button is pressed.
- Multi-locate selection is intentionally transient UI state, not saved fleet data.

## Down sheet

Route: /down-sheet

Core behavior:
- Default view shows all active buses.
- Optional quick shift filters: 1st, 2nd, 3rd.
- Up to 98 active entries.
- Key visible columns: bus number, reason down, mechanic/vendor, section, shift, work status, updated by.
- Workflow and repair updates synchronize back to tracker status and defects.
- Tracker ON DOWNSHEET checkbox creates or completes a matching down-sheet entry.
- Tracker/down-sheet membership works in both directions on the same browser.
- The bottom counter shows one number when counts match and a ratio when they differ.
- Decommissioned buses are excluded from the active down count.
- Quick Notes autosave locally.
- Each change requires updater initials in the down-sheet editor.
- Bus location never changes from a down-sheet edit.

## Themes and manual visual settings

Themes:
- Default
- Terminal
- Black / Dark
- Midnight
- Tactical

Manual controls include:
- page, panel, text, headers, borders, parking spaces, command bar
- every facility section background
- every official bus-status color
- Version 42 Main Garage special cells and frame/banner colors

Theme application changes the whole visual set. Manual adjustments switch themeName to custom.

## Tests and release discipline

Always run:
- npm test

Current expectations include:
- production server render
- facility capacities
- PWA/offline shell
- status migration
- protected number editing
- drag swap
- smart road status
- structured/manual defect saving
- repair catalog
- down-sheet two-way synchronization and counts
- section counts
- warning flags and quick filters
- multi-locate
- Main Garage color controls

Do not publish a failing build.
Do not remove regression assertions to make a build pass.
Add a focused assertion for each new behavior.

## Sites save and publish workflow

Codex with Sites tools should:
1. Run npm test.
2. Confirm git diff --check and review the exact diff.
3. Commit the validated source.
4. Obtain a short-lived Sites source credential for the existing project ID.
5. Push the exact commit to the configured Sites source branch using a per-command authorization header.
6. Package dist, .openai/hosting.json, and drizzle.
7. Save one Sites version tied to that exact commit.
8. Report the saved version number to the user.
9. Do not deploy the shared/public site until the user explicitly says Publish Version N.
10. Poll deployment status until success and report the live URL.

Never create a second Sites project for this tracker.
Never expose or persist the source credential.
The Git remote named sites requires temporary authorization and is not a normal public GitHub remote.

## Next approved development direction

The next separate phase is the seven-hour smart auto-assignment feature.

Proposed rule:
- Candidate status is service (blue) or defect (green).
- Candidate is not already in IN SERVICE / ON ROAD.
- Candidate has not been moved/reassigned for more than seven hours, based on parkedAt.
- Move to the first available road slot.
- If Road is full, leave the bus where it is.
- Preserve smart status based on unresolved defects.
- Update parkedAt after automatic relocation.
- Run after hydration and periodically while the app is open, with catch-up after reopening.

Unresolved safety decision:
- Recommended: exclude buses marked Roadcall or Tow In Progress from auto-assignment.
- Confirm this with the user before implementing.
- Implement and test this as a separate saved version.

## Deferred backend phases

Not currently implemented:
- Shared real-time database across devices and users
- Authentication/roles/audit log
- Photo upload of a paper down sheet
- OCR/AI extraction and review-before-apply flow
- Cloud file storage
- GPS/AVL bus telemetry
- Server-side notifications
- Reliable multi-user conflict resolution

A future shared backend should likely use:
- D1/Postgres for fleet, location, repairs, audit history
- R2/object storage for uploaded photos
- authenticated API writes
- revision or transaction checks to prevent occupancy conflicts
- real-time updates or polling
- OCR/AI extraction that creates a reviewable draft, never silently overwrites live data
- GPS provider integration as a later phase

Do not bolt backend behavior directly onto LocalStorage without a migration/import plan. Preserve user data and allow rollback.

## User workflow preferences

- Explain proposed layout or behavior changes before implementing.
- Make surgical, isolated changes.
- Break larger changes into stages.
- Preserve the approved facility layout and iPad-landscape fit.
- Never discard or hide saved buses during capacity changes.
- Smoke-test every version.
- Save a version first; publish only after explicit approval.
- Keep a clean Git checkpoint so changes can be reverted.
- Do not bundle unrelated deferred features into a visual correction.
- Use clear operational labels instead of technical jargon.

## Known development environment issue

The Codex Windows sandbox and browser controller have intermittently failed with:
SetTokenInformation(TokenDefaultDacl) failed: 1344

This is an internal tool-launch issue and does not mean the user denied permission. Normal escalated PowerShell commands, npm tests, Git, and Sites deployment have worked. The in-app browser may fail to automate; do not treat that alone as a failed build. Use the production build/tests and Sites deployment status as the release gate.

## Suggested prompt for another coding assistant

Open C:\Users\curti\pace-south-bus-tracker and read PROJECT_HANDOFF.md completely. Inspect git status and the relevant files before editing. Preserve LocalStorage migrations, facility capacities, drag/swap behavior, touch behavior, and existing user data. Work in small stages, run npm test, review git diff --check, and commit only the requested change. Do not publish or create a new hosting project. The next proposed feature is seven-hour automatic relocation of eligible blue/green buses to IN SERVICE / ON ROAD, but first confirm whether Roadcall and Tow In Progress buses must be excluded.

## Final warning

The live application is operationally useful but is not yet a centralized multi-user production system. Before Pace relies on it as the single source of truth, build the backend, identity, audit, backup, and conflict-resolution phases.
