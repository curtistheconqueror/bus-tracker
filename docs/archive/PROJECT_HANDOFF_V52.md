# Pace South Bus Tracker - Project Handoff

Updated: 2026-08-04
Repository: `C:\Users\curti\pace-south-bus-tracker`
Branch: `main`
Live site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/
Current live release: Sites Version 51, commit `37863a9`
Newest saved release: Sites Version 52, commit `2b1051d` (private/not deployed)

## Read this first

This file is the authoritative continuation guide. The root `README.md` is still the generic vinext starter README and is not an accurate product guide.

Claude Code, Hermes, Codex, or another coding agent can implement, test, and commit changes in this repository. The current live site is hosted through OpenAI Sites, not GitHub Pages or Vercel. An external coding agent should not create a new hosting project or place credentials in the repository. If it cannot access OpenAI Sites, it should stop after a clean tested commit and return control to Codex for saving and publishing.

## Product purpose

This is an interactive facility-wide fleet location and maintenance operations board for Pace South. It replaces a static wall map and paper/spreadsheet down sheet with two connected application surfaces:

1. **Facility Tracker (`/`)** — shows where each bus is physically parked, its operating state, active repair information, roadcall/tow warnings, and whether it belongs on the down sheet.
2. **Interactive Down Sheet (`/down-sheet`)** — organizes buses requiring maintenance by repair reason, mechanic/vendor, shift, workflow state, and updater initials.

The tracker owns physical location. The down sheet owns repair scheduling/workflow. Repair and status information synchronizes between them on the same device, but a down-sheet edit must never move a bus to another physical location.

The primary operating targets are desktop and iPad landscape. It also works as an iPhone/iPad Home Screen web app and has an offline app shell.

## Release state and rollback points

- **Version 51 is live** at the shared URL.
- **Version 52 is saved privately and awaiting explicit user approval to publish.**
- Version 52 adds custom iPad touch dragging, Apple callout suppression, reliable cleanup of parking-space drag highlights, adaptive empty-space activation, a Settings toggle for single-tap empty spaces, and a 10-second timeout for single-bus Locate highlighting.
- Version 51 moved Locate/Multi to the far left, shortened the ADA command to two lines, renamed the bottom control to AI OPERATOR, and placed it last.
- Version 50 made unique Locate matches flash without a confirmation popup and separated single Locate from Multi Locate behavior.
- Version 49 introduced the device-local AI Operator pilot.
- Version 48 introduced safe last-two-digit fleet-number resolution.

Important commits:

- `2b1051d` Improve touch dragging and empty-space controls — Version 52, saved/private
- `37863a9` Reorder and tighten command bar controls — Version 51, live
- `6eeed61` Keep unique bus locator highlighted until acknowledged — Version 50
- `4f8644e` Add device-local AI operator foundation — Version 49
- `d633055` Add smart fleet number resolution — Version 48
- `cf4b297` Fix bus reassignment destination availability — Version 47
- `4e57df1` Add direct relocation and paired reassignment — Version 46
- `0ad54da` Add bulk defect assignment and trouble bays — Version 44
- `5b05442` Add bulk multi-bus relocation — Version 43
- `0b00fc3` Add garage accent color controls — Version 42

Use normal Git commits as rollback points. Never use `git reset --hard` or overwrite user data to fix a visual issue.

## Immediate next step

1. Obtain user approval before publishing Version 52.
2. After publication, physically test Version 52 on the user's iPad:
   - one tap on a bus opens quick view;
   - double tap opens the full bus editor;
   - press/move/release drags or swaps a bus without Apple's Add Contact/context menu;
   - no parking space remains randomly highlighted after drop or cancellation;
   - one touch on an empty space does nothing by default;
   - two touches on the same empty space open Move Bus Here;
   - desktop still opens an empty space with one mouse click;
   - the optional Settings toggle enables single-touch empty spaces;
   - single Locate stops on touch/click/drag or after 10 seconds;
   - Multi Locate stays active until explicitly cleared.
3. If the iPad reports a regression, make a small Version 53 correction based on Version 52. Version 51 remains the known-good live fallback until 52 is approved.

## Technology and commands

- React 19
- TypeScript
- Next-compatible app structure built by vinext/Vite
- Plain CSS plus Tailwind import
- Cloudflare-compatible OpenAI Sites output
- Browser LocalStorage for operational state
- Service worker + web manifest for Home Screen/offline shell
- Drizzle/D1 scaffolding exists, but no production database is connected

Requirements:

- Node.js `>=22.13.0` (current environment has used Node 24.15)
- npm

Commands:

```powershell
cd C:\Users\curti\pace-south-bus-tracker
npm install
npm run dev
npm test
git diff --check
git status --short --branch
```

`npm test` is the release gate. It performs a production vinext build and runs `tests/rendered-html.test.mjs`. Version 52 has **20 passing tests**. Do not delete assertions to make a build pass; add focused coverage for new behavior.

The vinext build can emit warnings about Node imports and `nodejs_compat`; those warnings have not prevented successful Sites deployments. Treat build or test failures as blockers, not these known warnings.

## Repository architecture

Main tracker:

- `app/page.tsx` — fleet model, layout, token/spot interactions, editor, Settings, LocalStorage, commands, operator execution
- `app/globals.css` — facility geometry, tokens, touch behavior, themes, modals, command bar

AI Operator:

- `app/operator-engine.ts` — deterministic command parser and safe action plans
- `app/operator-modal.tsx` — conversation-like UI, previews, confirmations, local-session messaging
- `app/bus-number-resolver.ts` — exact/full-number and safe two-digit suffix resolution

Down sheet:

- `app/down-sheet/page.tsx`
- `app/down-sheet/down-sheet-editor.tsx`
- `app/down-sheet/down-sheet-settings.tsx`
- `app/down-sheet/down-sheet.css`
- `app/down-sheet/down-sheet-sync.ts`
- `app/down-sheet/tracker-membership-sync.ts`
- `app/down-sheet-counter.ts`

Shared operations:

- `app/repair-catalog.ts` — structured defect catalog, summaries, migration, labels
- `app/smart-status.ts` — location-aware status rules and atomic occupied-space swaps
- `app/bulk-relocation.ts` — all-or-nothing group relocation
- `app/bulk-defects.ts` — group defect assignment with duplicate protection
- `app/pair-reassignment.ts` — editor-based swap/reassignment
- `app/fleet-validation.ts` — protected numbers, duplicate prevention, occupancy validation
- `app/facility-layout.ts` — Road/CNG West capacity and safe migrations
- `app/section-count.ts` — live section counts

PWA/hosting:

- `public/sw.js`
- `public/manifest.webmanifest`
- `.openai/hosting.json`
- `vite.config.ts`
- `worker/index.ts`
- `package.json`

Testing:

- `tests/rendered-html.test.mjs`

## Data model and persistence

The main bus type is `B` in `app/page.tsx`. Important fields:

- `id` — stable internal identity; use this for records and movement
- `n` — visible fleet number; protected in the regular editor
- `s` — official status
- `l` — exact facility slot ID
- `mechanic`, `foreman`, `shift`, `priority`
- `safe`, `down`
- `notes`, `pendingRepair`
- `defects` — structured repair records and the source of truth
- `roadcall`, `roadcallSolid`, `roadcallLocation`
- `towInProgress`
- `checkEngine`, `noHorn`, `badRampKneeler`
- `parkedAt` — last reassignment time
- `outReason` — Scheduled or Unscheduled when applicable
- transient UI fields: `acIssue`, `onDownSheet`, `multiLocated`, `located`

Transient fields must not be persisted as fleet data. `saveEditor` and reassignment flows strip them before saving.

LocalStorage keys:

- `pace-board-v1` — tracker fleet payload, version 4
- `pace-board-settings-v1` — theme, colors, visual settings, and Version 52 empty-space touch preference
- `pace-down-sheet-v1` — down-sheet entries, version 1
- `pace-down-sheet-settings-v1` — down-sheet preferences and Quick Notes

All operational state is currently **device-local**. The published URL distributes code, not a shared fleet database. Different iPads, browsers, tabs, and Home Screen installations can have different bus arrangements. Export/Share Backup and Import Backup are the current transfer mechanism. Preserve the storage keys, migrations, import/export fields, and saved user data.

## Official status model

- `service` — **IN SERVICE / ON ROAD**, blue
- `defect` — **IN SERVICE WITH DEFECTS**, green
- `shop` — **WORK IN PROGRESS**, yellow
- `out` — **OUT OF SERVICE**, red; may be Scheduled or Unscheduled
- `decommissioned` — **DECOMMISSIONED / DOWN INDEFINITELY**, dark gray
- `unknown` — **UNKNOWN / MYSTERY**, gray

Tow Staging is a location, not a status. Roadcall is an orange overlay/flag, not a status. Tow In Progress is a flag, not a status. Decommissioned buses are excluded from active service-down counts.

`app/smart-status.ts` is authoritative:

- Moving into a diagonal Shop Bay sets `shop`.
- Moving to On Road with no unresolved defects sets `service`.
- Moving to On Road with unresolved serviceable defects sets `defect`.
- Moving to On Road with an unresolved downing defect sets `out`.
- Moving into CNG East or CNG West with unresolved defects sets `out`.
- Other locations normally preserve status unless the user changes it.
- Moving or swapping updates `parkedAt`.
- Dropping onto an occupied spot atomically swaps both buses.

## Facility layout and capacities

- Service Detail: 8, single file
- Paint Booth: 1
- Wash Rack: 1
- Body Shop: 1
- Diagonal Shop Bays: 9
- Pit: 2
- Brake Test: 2
- Tow Staging: 3
- CNG East: 18, two columns × nine rows
- In Service / On Road: 75, five columns × fifteen rows
- Shop Wall: 8, single file
- Main Garage: 84, twelve bays × seven rows
- CNG West: 40, eight columns × five rows

The diagonal bay display is intentionally `BAY_LAYOUT = [null,8,6,4,2,9,7,5,3,1]`; Bay 1 is anchored at the established location. Main Garage columns 11 and 12 are separate Trouble Bay destinations and have configurable visual accents.

CNG East intentionally retains old slot IDs for columns 1 and 2. Do not renumber slots without a migration. Capacity changes must never discard a bus; overflow buses remain visible in Needs Reassignment containers.

## Bus, touch, and empty-space interactions

Version 52 behavior in `app/page.tsx` and `app/globals.css`:

Desktop/mouse:

- Hover/focus bus → compact quick view
- Click bus → full editor
- Native mouse drag → move or swap
- One click empty space → Move Bus Here

Touch:

- One tap bus → compact quick view
- Double tap bus → full editor
- Movement of at least 7 pixels begins custom pointer drag
- Release over empty spot → move
- Release over occupied spot → atomic swap
- Apple touch callout, text selection, and context menu are suppressed on bus tokens
- Default empty-space activation requires two taps on the same spot within 700 ms
- Settings → Touch Controls can allow single-tap empty spaces on that device

Temporary `.ready` and `.swap-ready` classes are cleared on drop, drag end, pointer cancellation, and window blur. Preserve that cleanup; it fixes random stuck parking-space highlights.

Do not confuse bus quick view with empty-space activation. The user explicitly approved the one-tap quick view and double-tap bus editor.

## Fleet-number intelligence

`resolveBusNumber()` accepts:

- an exact complete number; or
- exactly two ending digits when only one bus matches.

If two or more buses share those ending digits, mutating actions must stop and require the complete number. A Locate action may highlight all ambiguous matches. Never guess among ambiguous fleet numbers.

This rule is reused by Locate, Move Bus Here, Multi Locate, editor reassignment, and AI Operator commands.

## Locate and Multi Locate

Single Locate:

- Exact or unique two-digit match scrolls to and flashes the bus without a confirmation popup.
- Touch, click, or drag acknowledges the located bus and removes the flash.
- Version 52 automatically removes an unacknowledged single Locate flash after 10 seconds.

Multi Locate:

- Remains persistent until Clear All or the active Multi/Clear control is pressed.
- Can accept multiple buses, relocate the full group to an area if the complete group fits, and assign the same structured defect to the group.
- Multi selection is transient UI state and must not be cleared by the single-Locate timeout.

## AI Operator pilot

The distinct AI OPERATOR button is the far-right command-bar control. This is currently a **device-local deterministic operator**, not a hosted LLM or autonomous browser agent.

Current capabilities:

- Locate or inspect a bus
- Resolve unique last-two-digit bus references
- Highlight all ambiguous Locate matches
- Move a bus to the first open spot in a named area
- Add or complete tracker/down-sheet membership
- Add selected approved catalog defects and special warning flags
- Open the down sheet
- Preview every mutating action and require explicit Apply Change confirmation

Operator mutations use the same local fleet/down-sheet state as manual controls. It does not synchronize devices, access GPS, parse photographs, or call an external AI API. Keep the confirmation boundary for mutating commands.

Likely later phases:

1. Expand deterministic commands and parsing.
2. Add a shared backend and authenticated API.
3. Add an LLM tool layer that produces validated plans, never direct unvalidated state mutations.
4. Add audit history and permissions before real multi-user automation.

## Repair and defect model

`StructuredDefect` fields:

- `id`
- `category`
- `issue`
- `details`
- `operability`: `service` or `down`
- `state`: `open`, `deferred`, or `completed`

`pendingRepair` is generated from unresolved structured defects. Structured defects are the source of truth.

The repair catalog includes A/C and HVAC, Engine, Cooling, Transmission, Suspension, Steering, Brakes, Tires/Wheels, Battery/Starting/Charging, Electrical/Multiplex including Horn, Tech Services, Amerex, Fuel Delivery, No Start, Doors/Ramp/Lift, Lights/Fixtures, Bodywork, Air System, inspections and major scheduled services, Preventive Maintenance, Miscellaneous, and manual entry.

Do not flatten structured defects into one text field. Preserve multiple defects, independent scrolling, completed/deferred state, and operability.

## Down sheet behavior

Route: `/down-sheet`

- Default view shows all active buses.
- Optional top-level shift filters: 1st, 2nd, 3rd.
- Designed for up to approximately 98 active entries.
- Important visible columns: bus number, reason down, mechanic/vendor, section, shift, workflow state, updater initials.
- Repair categories use staged category/subcategory selection to avoid enormous menus.
- Each change records updater initials.
- Quick Notes autosave locally for items such as daily roadcall counts.
- Tracker On Downsheet can create/complete the corresponding row.
- Down-sheet workflow and repair changes can update tracker status/defects.
- Down-sheet changes must never change tracker location.
- The command-bar Down Sheet count shows one number when tracker selection and active sheet rows agree, and a ratio when they differ.

## Themes and Settings

Themes: Default, Terminal, Black/Dark, Midnight, Tactical.

Manual Settings include status colors, dashboard colors, section backgrounds, Main Garage Trouble Bay accents, fleet creation, protected fleet-number correction, backup transfer, and Version 52 Touch Controls.

Applying a theme replaces the full preset. Manual color changes set the theme to Custom. Backup export/import must preserve all supported settings.

## Deferred backend and production-hardening phases

Not implemented:

- Shared real-time data between staff and devices
- Authentication, roles, permissions, and audit history
- Central backup/restore and revision history
- Multi-user occupancy conflict resolution
- Photo upload of the current paper down sheet
- OCR/AI extraction with review-before-apply
- GPS/AVL telemetry
- Server-side notifications

Recommended backend direction:

- D1/Postgres tables for fleet identities, current slots, defects, down-sheet entries, and audit events
- R2/object storage for uploaded photographs
- Authenticated API writes with transaction/revision checks
- Realtime events or bounded polling
- LocalStorage migration/import so existing device data is not lost
- AI/OCR creates a reviewable draft and never silently overwrites live state

The application is useful now but should not become Pace's sole source of truth until shared persistence, identity, audit, backup, and conflict controls exist.

## Deferred seven-hour auto-assignment proposal

This has been discussed but is not implemented. Before coding, confirm whether Roadcall or Tow In Progress buses must be excluded.

Proposed candidate:

- status `service` or `defect`;
- not already On Road;
- no reassignment for more than seven hours using `parkedAt`;
- move to first open Road slot;
- if Road is full, leave it in place;
- preserve repair-aware status;
- update `parkedAt` after relocation.

Recommended safety default: exclude Roadcall and Tow In Progress until the user says otherwise.

## User working preferences

- Explain layout or behavior changes before implementing when the request asks for confirmation.
- Make surgical, isolated changes.
- Break large changes into stages.
- Preserve the approved map geometry and iPad-landscape fit.
- Never discard or hide saved buses during capacity changes.
- Smoke-test each version and add regression coverage.
- Save a private version first; publish only after explicit approval such as “Publish Version 52.”
- Keep clean Git checkpoints and make reversions targeted.
- Do not bundle deferred backend work into a visual correction.
- Use clear operational language, not software jargon, in the interface.

## Sites save and deployment workflow

The configured Sites project ID is stored in `.openai/hosting.json`. The only configured remote is the private Sites source remote; there is currently no ordinary GitHub `origin`.

For Codex with Sites access:

1. Run `npm test`.
2. Run `git diff --check` and review the exact diff.
3. Commit the validated source.
4. Obtain a short-lived source credential for the existing Sites project.
5. Push the exact commit with per-command authorization; never persist the token.
6. Package the exact built commit.
7. Save one Sites version tied to the commit.
8. Report the saved version and wait.
9. Deploy to the existing shared site only after explicit user approval.
10. Poll deployment status until success.

Never create a second Sites project. Never commit or display a Sites credential.

For Claude Code without Sites access:

1. Implement locally.
2. Run `npm test` and `git diff --check`.
3. Commit the change on `main` only when the user requested implementation.
4. Report the commit hash and exact validation result.
5. Return to Codex for Sites save/deploy.

## Known environment issue

Codex browser automation and some Windows sandbox operations have intermittently failed with:

`SetTokenInformation(TokenDefaultDacl) failed: 1344`

This is an internal Windows tool-launch fault, not a user permission denial and not proof the website is broken. Production builds, automated tests, Git, and Sites deployments have continued to work. When browser automation is unavailable, say that physical iPad gesture validation still needs to be done instead of claiming a full device test.

## Suggested Claude Code startup prompt

> Open `C:\Users\curti\pace-south-bus-tracker` and read `PROJECT_HANDOFF.md` completely. Check `git status` and recent commits before editing. Version 51 is live; Version 52 at commit `2b1051d` is saved but not published. Preserve LocalStorage migrations, fleet identity, physical slot IDs, repair-aware status logic, occupied-space swaps, iPad quick-view/editor gestures, down-sheet two-way repair/status sync, and all saved user data. Work in small stages, run `npm test`, run `git diff --check`, and add focused regression coverage. Do not create or publish a new hosting project. The immediate priority is publishing and physically validating Version 52 on iPad; make only a surgical correction if that validation exposes a problem.
