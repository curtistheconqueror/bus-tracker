# Fleet Maintenance Bus Tracker

A mobile-friendly fleet location and maintenance operations application. It combines a facility map, an interactive Down Sheet, a real-time Defect Log, and an offline Fixed Repairs history while preserving device-local backups.

Live application: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

## Application surfaces

| Route | Purpose |
| --- | --- |
| / | Facility map, bus location, operating status, quick filters, bulk movement, and AI Operator controls |
| /down-sheet | Shift maintenance planning, repair estimates, assignments, photo import, and Down Sheet history |
| /defect-log | Mobile-first capture of operator and mechanic findings that may not belong on the Down Sheet |
| /fixed-repairs | Offline completed-repair history, carried defect facts, and editable completion details |

The facility map owns physical location. The Down Sheet owns scheduled maintenance workflow. The Defect Log owns direct field observations. Fixed Repairs presents completed history and completion details. Shared bus status and repair records synchronize between all four surfaces on the same device.

## Current capabilities

- Capacity-safe drag, swap, bulk relocation, and destination-aware status changes
- Two-way tracker and Down Sheet membership synchronization
- DS badges, Mystery detection, road-call and tow indicators, and configurable quick filters
- Direct Defect Log entries with per-repair lifecycle controls and a searchable condition-not-duplicated flag
- Offline Fixed Repairs history with carried defect details, fix steps, verification, parts, technician, and completion time
- AI Operator commands for fleet questions, multi-bus movement, status updates, and Down Sheet actions
- Down Sheet photo scanning through a server-side OpenRouter integration
- Export and import of the complete device-local board state
- Installable Home Screen experience with an offline application shell
- Responsive desktop, iPad, and phone layouts

## Project structure

- app/ — application routes, UI, and domain logic
- app/down-sheet/ — Down Sheet UI, synchronization, scanning, estimates, and settings
- app/defect-log/ — mobile Defect Log UI, grouping, filters, and display settings
- app/fixed-repairs/ — completed repair history and fix-detail editor
- app/api/ — server-side API routes
- tests/ — release-gate regression tests
- public/ — manifest, service worker, icons, and static assets
- db/, drizzle/ — backend scaffolding reserved for the shared-data phase
- docs/ — architecture, release notes, roadmaps, and archived handoffs
- .openai/hosting.json — existing OpenAI Sites project binding

## Local development

Requirements: Node.js 22.13 or newer and npm.

    npm ci
    npm run dev

Quality checks:

    npm test
    npm run lint

The test command performs a production Vinext build and runs the Node regression suite.

## Persistence today

Operational data is currently stored in browser LocalStorage. This preserves offline use but means each browser or Home Screen installation has its own copy until a backup is exported and imported. Do not remove or rename storage keys or migrations casually; existing fleet data must remain readable.

The next major phase is an offline-first shared backend with real-time device synchronization. See PROJECT_HANDOFF.md for the migration invariants and current implementation state.

## Releases and deployment

The private GitHub origin is the code backup. The sites remote belongs to the existing OpenAI Sites deployment. A coding agent may implement, test, and commit locally, but publishing must use the existing Sites project and must never create a replacement site.

- Current live release: Sites Version 96
- Current live feature checkpoint: commit 1ffffc5
- Release reference: docs/RELEASES.md
- Publishing and recovery runbook: docs/SITES_PUBLISHING_RUNBOOK.md

## Security

Never commit API keys, Sites credentials, exported fleet backups, or employee-sensitive operational data. The Down Sheet scan key is supplied only through the hosted runtime environment.

## Continuation

Read PROJECT_HANDOFF.md before making material changes. Contribution and release rules are in CONTRIBUTING.md. If a Sites publish disconnects or work was completed in a remote checkout, follow docs/SITES_PUBLISHING_RUNBOOK.md instead of retrying an opaque checkpoint command.
