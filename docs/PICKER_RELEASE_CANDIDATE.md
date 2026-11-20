# Picker release candidate — HOLD

This is review preparation, not a publication record. Do not merge or publish
until every gate below is satisfied. `docs/PUBLISH_NEXT.md` still describes
production, not this candidate.

## Frozen feature source

Code source: `4019316f19bc127cd24217749bbdd13213c41cc6`.
Integration branch: `codex/fleet-picker-release-nov20`.
Includes PR54 `2de3fd21199d8360180cc1ab0b8d6733f3e77dad` (and PR53), plus
PR55 `f1e4d659ba52da055f24997ebe07f992c17b4de8`. Owner branches remain unchanged.
The PR55 focus update was reconciled with transferred-card focus and scrolling:
focus the repair card container, then Tab to CATEGORY, without focusing a phone input.

## Scope and review dispositions

- Ordinary category selection hands keyboard typing to symptom/repair. Only an
  exact desktop bus number retains input focus. Touch remains browse-first;
  second touch/TYPE types, LIST/selection releases focus, Engine opens directly.
- Explicit bus cancel restores the prior valid selection. Unresolved raw edits
  clear identity; invalid letters, prefixes and ambiguous exact matches cannot
  save against a stale Down Sheet bus. Transient edits preserve the board filter.
- Ctrl/Meta+Backspace deliberately clears an optional picker. Tab stays normal.
- ADD TO THAT ENTRY preserves original and drafted repair cards and typed initials
  (including explicitly cleared initials). Duplicate cards and metadata/sign-off
  replacement require confirmation, with cancel preserving the original draft.
- Refused saves keep the editor draft. Cross-key fleet/sheet writes remain
  non-atomic; partial outcomes are reported, not called successful.
- Independent cold review found persisted false success after MARK FIXED refusal
  and recovery-copy loss after refused tracker restoration. Both were corrected:
  pending markers survive reload; the before-attempt copy remains until both
  restorations succeed. Behavioral regression covers refusal, reload and retry.
- Final independent diff review reported no remaining substantive findings at
  code source `4019316`. This is additional to CI, CodeRabbit and device gates.

## Verified locally

- `npm run lint`: passed.
- `npm test`: production build and 478/478 tests passed.
- Chromium loopback: 11/11 behavioral scenarios passed, including touch emulation,
  category-to-symptom typing, Down Sheet stale identity, draft handoff and refused writes.
- TypeScript remains failing baseline: 237 diagnostics against main's 239, no added
  diagnostics after normalizing diagnostic locations and union display ordering.
  Two missing `completedBy` type diagnostics were removed; no suppressions added.

Browser gate: `tests/browser/picker-release.test.mjs`, using an existing Playwright
installation selected by PLAYWRIGHT_MODULE and cached browser binaries. Only
loopback GETs and synthetic device-local records are allowed. Windows vinext
preview returns 404 for emitted assets, so the harness serves those exact
`dist/client/assets` files through a route binding equivalent to Sites ASSETS;
SSR stays on the production loopback server. This is not a live-host test.

## Remaining mandatory gates

- Final WebKit result must be recorded separately; WebKit is not physical Safari.
- Exact integration-head GitHub CI and fresh CodeRabbit findings must be verified.
  Existing PR54/55 reviews do not cover the integration fixes. Do not buy reviews
  or change service settings if the existing integration cannot review it.
- **Real iPhone Safari keyboard/number-pad acceptance is missing. Stop before
  release without it.** Verify first-touch browse without keyboard, second/TYPE
  typing with number pad, LIST/selection dismissal, category-to-symptom typing,
  exact bus/cancel/invalid edits, and existing-entry repair/initials preservation.
- After those pass: reconcile any newer owner commits, assign the application
  release record, merge with exact-head binding, and use the existing Sites runbook.
  Verify exact live source/assets/routes and only then record publication.

## Production and rollback

Unchanged production: application 197 / Sites 194, source
`12822f60c7e5d76d3702108b33711cc116ca4f61`.
Existing URL: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site .
This existing deployed source is the rollback baseline for the proposed release;
retain saved Sites 194. Historical pre-197 fallback: Sites 191 at
`a9f610d42123cd6cfaaf32b61d8c78048d585c82`.
No service-worker, hosting, Supabase, credentials, audience or unrelated audio
changes are included. No application/Sites version is assigned to this candidate.
