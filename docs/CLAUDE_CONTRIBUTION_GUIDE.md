# Claude Code Contribution Guide

This is the shared handoff for Claude Code, Codex, and Curtis. The live application is published only by Codex after review and Curtis's approval. Claude Code contributes source changes through the `claude-contributions` branch and must never publish Sites releases.

## Start here every time

1. Read `README.md`, `PROJECT_HANDOFF.md`, `CONTRIBUTING.md`, this file, `docs/RELEASES.md`, and `docs/SITES_PUBLISHING_RUNBOOK.md` completely.
2. Fetch the repository and confirm that `main` contains the current live release.
3. Work only on `claude-contributions`, starting from the latest `main` unless Curtis or Codex gives a narrower branch or commit.
4. Preserve unrelated work and never force-push, rewrite published history, or create a replacement Sites project.
5. Implement one bounded stage at a time. Add regression coverage and commit the exact validated result.
6. Push the contribution branch and report the commit SHA, changed files, validation results, and any unresolved product decisions.

## Ownership and release boundary

- Claude Code may inspect, implement, test, commit, and push to `claude-contributions`.
- Once the gates pass, Claude Code also fast-forwards `main` to that validated commit and pushes it, so finished work is visible to the next publish instead of waiting unnoticed on a branch. Curtis set this rule after Stage 5 sat on the branch unpublished and its catalog additions could not be found in the live app. Only a clean fast-forward qualifies: if `main` carries commits the contribution branch does not, stop and hand off instead of merging.
- Claude Code must not edit `.openai/hosting.json`, use Sites credentials, save or deploy a Sites version, create release tags, or mark a version live. Reaching `main` is not publishing.
- Codex reviews the contribution against the last released commit, checks invariants and mobile behavior, and publishes only after Curtis approves production.
- `main` and the `sites-vNN` tags remain the authoritative release history.

## Phone versus iPad and larger screens

Phone fixes must be scoped so they do not damage the iPad or desktop layout.

- Preserve the existing base layout for larger screens. Put phone-specific layout changes inside the existing narrow-screen media queries and page-specific classes.
- Do not use broad selectors such as global `button`, `header`, `nav`, or `section` rules for a one-page phone fix. Scope rules beneath the affected page or component class.
- Treat approximately 390–430 CSS pixels as the primary phone range. Verify that controls remain usable at 375 CSS pixels.
- Treat 768–1024 CSS pixels as tablet/iPad territory. A phone override must not unexpectedly apply across that whole range.
- Important phone controls should have practical touch targets of about 44 CSS pixels or larger, readable text, and visible focus states.
- Fixed or sticky controls must not cover content, Save/Close actions, navigation, dropdowns, or the iPhone safe-area region.
- Prevent horizontal page overflow. Use an intentionally scrollable inner region only where the product already requires it, such as the garage grid.
- Preserve the uniform four-page navigation, visible collapse/expand controls, and independent section collapsing.
- Add source or rendered regression assertions for every responsive fix. When visual browser testing is requested, check representative phone and tablet widths separately.

## Non-negotiable data rules

- Never rename existing LocalStorage keys.
- Old payloads without new fields must still load through backward-compatible normalization or migration.
- Never delete or merge repair records merely to simplify the UI.
- Facility Map owns location and status. A repair entered there must be routed to Defect Log, Down Sheet, or both.
- Down Sheet operations may change Down Sheet rows, membership, badges, and linked repair state, but must not relocate buses or delete Defect Log records.
- Filters, badges, counters, display settings, and category emojis must never mutate records.
- Fleet identity, facility slot IDs, capacity-safe moves, offline operation, recovery copies, and exported backups must remain intact.

## Seven-stage program status

### Stage 1 — Domain and repair catalog foundation: complete

Backward-compatible shared storage, catalog additions, CUBIC BUS ER/MV ER, and category emojis are live.

### Stage 2 — Odometer history: complete

Each bus has append-only actual odometer readings with dates and optional notes.

### Stage 3 — Mileage readiness and safety foundation: complete

Estimated mileage accrues at 275 miles per operating day, pauses outside operating service, and flags inspections at 3,000 miles or 10 days. Bulk-loss protection, last-known-good recovery, export reminders, and authoritative Down Sheet photo replacement are also live.

### Stage 4 — Maintenance completion history: complete

Completed inspections append maintenance history with a date, optional actual odometer reading, and optional note. With mileage, the app adds a matching actual reading and restarts both due clocks. Date-only completion restarts the 10-day clock without changing mileage. Existing and future payload fields remain compatible.

### Stage 5 — Spark-plug and valve-adjustment intervals: waiting on Curtis

Track mileage since the last spark-plug service and valve adjustment, with overdue indicators useful for misfire diagnosis. Do not invent the mileage intervals. Curtis still needs to supply both interval values. The data model may remain compatible with missing interval values.

### Stage 6 — Learned Parts Used system: pending

Add a `Parts Used` checkbox to appropriate Defect Log and Fixed Repairs workflows. When checked, allow a part number and an optional exact catalog name. A saved mapping should learn the association with the exact defect issue, or with a category only when explicitly chosen, and auto-populate it next time. The mapping remains editable, entry must never be blocked when a part is unknown, and the specific repair record keeps its own usage snapshot. Build this offline-first and backward-compatibly. Part photos are deferred to Stage 7.

### Stage 7 — Shared offline-first backend and attachments: pending

Use the existing Supabase project and authenticated Curtis account. Preserve the local cache and add an ordered offline mutation queue, durable IDs, revisions, idempotency, conflict handling, real-time subscriptions, and audit history. Prove synchronization safely between two test devices before making the backend authoritative. Fleet location/status can be the technical synchronization proof, but the Defect Log is the first priority business-data migration. Import only the one trusted current device backup. After shared storage is stable, store part photos as backend objects referenced by repair/part records; ordinary upload and viewing should not require AI API credits.

## Current Claude task

There is no active implementation assignment. Stage 5 is next but remains blocked until Curtis supplies the spark-plug and valve-adjustment mileage intervals. Claude must not invent those values.

## Required handoff format

At the end of a contribution, report:

- Branch and commit SHA
- Product behavior implemented
- Files changed
- `npm test`, `npm run lint`, and `git diff --check` results
- Phone-specific and tablet-specific impact
- Storage or migration impact
- Known limitations or decisions still needed from Curtis

## Ready-to-paste Claude Code prompt

> Open the Pace South Bus Tracker repository and read `README.md`, `PROJECT_HANDOFF.md`, `CONTRIBUTING.md`, `docs/CLAUDE_CONTRIBUTION_GUIDE.md`, `docs/RELEASES.md`, and `docs/SITES_PUBLISHING_RUNBOOK.md` completely. Fetch the latest repository state and work only on the `claude-contributions` branch from current `main`. Implement only the Current Claude task in the contribution guide. Preserve every product invariant, LocalStorage key, backward-compatible migration, offline behavior, fleet identity, location, and user record. Keep phone CSS scoped so it does not change iPad or desktop behavior. Add focused regression coverage, run `npm test`, `npm run lint`, and `git diff --check`, then commit and push the contribution branch. Report the commit SHA and handoff details. Do not publish, deploy, tag a release, edit `.openai/hosting.json`, or create a hosting project.

## Ready-to-paste Codex review and live-publish prompt

Use this only after Claude has committed and pushed a completed contribution and Curtis intends to publish it:

> Open `C:\Users\curti\pace-south-bus-tracker`. Fully read `README.md`, `PROJECT_HANDOFF.md`, `CONTRIBUTING.md`, `docs/CLAUDE_CONTRIBUTION_GUIDE.md`, `docs/RELEASES.md`, and `docs/SITES_PUBLISHING_RUNBOOK.md` before acting. Fetch both `origin/main` and `origin/claude-contributions`; do not assume the local branch references are current. Inspect Git status, recent commits, the Claude handoff, and the complete diff from current `main` to Claude's exact pushed commit. Preserve every uncommitted change and do not overwrite newer work. Verify that `.openai/hosting.json` is untouched unless the approved feature genuinely required a hosting capability, and check that no credentials, fleet exports, photos, or sensitive operational data were committed. Review backward-compatible storage behavior, record preservation, Facility Map/Down Sheet/Defect Log ownership, offline behavior, and phone-versus-iPad CSS isolation. Run `npm test`, `npm run lint`, and `git diff --check` against the exact contribution. If a real defect is found, make only the smallest necessary fix on `claude-contributions`, revalidate, commit, and push it. If validation succeeds, integrate the contribution into `main` without force-pushing or rewriting history, then push `main` to the existing private GitHub origin. I explicitly approve publishing that reviewed release to the existing public Fleet Tracker site. Reuse the project ID in `.openai/hosting.json`; never create a replacement site, repository, or URL. Use the granular resumable Sites lifecycle: inspect the existing Site and access mode, obtain a short-lived source-repository credential, push the exact validated release commit to the existing `sites/main` source branch using a per-command authorization header, package the successful build with the official Sites helper through Git Bash using MSYS `/c/...` paths, save exactly one Sites version with that full commit SHA and build archive, deploy that saved version with the public deployment operation, and poll the same deployment ID until it succeeds or fails. If any connection disconnects, inspect the current Sites version plus any returned version or deployment ID and resume from the correct step; do not repeat a checkpoint wrapper, create duplicate versions, or rebuild completed work without cause. After success, verify the reported live version and existing URL, update `README.md`, `PROJECT_HANDOFF.md`, `docs/RELEASES.md`, and the stage status in `docs/CLAUDE_CONTRIBUTION_GUIDE.md`; create the matching `sites-vNN` rollback tag on the live feature commit; push the documentation commit and tag to `origin`; fast-forward `claude-contributions` to the documented `main` baseline; refresh `sites/main`; remove only the temporary archive; confirm both branches are clean and synchronized; and report the live URL, Sites version, feature summary, validation count, and rollback tag.
