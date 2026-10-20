# Fleet Maintenance Bus Tracker - Current Project Handoff

Updated: 2026-10-20
Repository: C:\Users\curti\pace-south-bus-tracker
Branch: main
Live application: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/
Live release: Sites Version 187 (application release 191)
Live feature checkpoint: commit b33775685b61acafdf4325807c82e92281c9fc2c

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
- Export and import remain the durable recovery path while Shop Cloud is introduced, configured, and verified across devices.

## Current release state

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
