# Publish next

**STATUS: 191 PENDING.**

Application 191 adds COPY, SHARE and SHARE PAGE beneath the bus heading in the
Defect Log FOCUS view. PR38 merged as
`b33775685b61acafdf4325807c82e92281c9fc2c` on 2026-10-20.

## Source and scope

Publish the code from `b33775685b61acafdf4325807c82e92281c9fc2c`.
Reviewed PR head: `c92e819f6f8c248371fa165a16dff96b30890c65`.
Its full merge tree is identical to GitHub's tested candidate
`1aba8a87bcee7ca795f731b74fbfb4ebec500f61`.

Four feature files changed: `app/defect-log/page.tsx`, its stylesheet,
`src/lib/defects/bus-share.ts`, and `tests/defects.test.mjs`.
No storage keys, schema, dependencies, public assets, permissions or hosting
configuration changed. Existing release records from main are preserved.

## Behavior

- COPY and SHARE send a selected bus's non-hidden Defect Log records regardless
  of board state/date/search filters. The view stays filtered; a notice states
  when the share includes records hidden by board filters.
- SHARE falls back to COPY without a native share sheet. SHARE PAGE exports an
  escaped self-contained HTML file with a local-date filename and no network
  dependencies. Download completion says SAVED TO THIS DEVICE.
- Prior-year defect dates identify their year. Share status resets on a bus
  change; the mounted polite status region also announces COPY.

## Validation

Local lint, production build and all 360 tests passed on the identical merge
tree. PR CI run 39368201168 passed install/lint/build and 360 tests, zero fail.
The merged-source main CI result is recorded in the final release evidence.
All seven CodeRabbit inline findings are resolved; the current review covers
`c92e819` and reports no new actionable comments. The default docstring coverage
warning is advisory and does not represent a failed repository gate.

Ten additional Node VM checks execute the actual sharing handlers with browser
API stubs: complete-bus payload despite filtered view, prior-year timestamp,
text share, clipboard fallback/failure, share cancellation/error, escaped
network-free HTML, saved/shared/cancelled file outcomes, and no-focus guard.
These are not browser interaction checks. Browser-control tools are unavailable
here; earlier contributor browser claims are not independently repeated.

## Live acceptance checks for Curtis

1. Open a bus in FOCUS: COPY, SHARE and SHARE PAGE appear beneath the heading.
2. COPY and SHARE include all its non-hidden defects and no other bus.
3. Apply IN PROGRESS or WHEN LOGGED so some records are hidden: the view remains
   filtered, the scope notice appears, and exports retain the complete bus list.
4. SHARE PAGE opens offline on the receiving phone with numbered defect cards;
   native-share dismissal is silent, and desktop download says SAVED TO THIS DEVICE.
5. Open another bus: stale status clears. Check phone/iPad layout, native sharing,
   VoiceOver announcements and Home Screen/offline behavior on real devices.

Known minor limitation: async share completion is not bound to the initiating
bus. Switching focus while a share promise is pending can place its completion
status on the later bus; the already-built payload remains the original bus's
records. CodeRabbit notes this as a resilience concern, not a merge blocker.

## Rollback

Application 189/190 on Sites 186 from
`c9c03d661177c04706f7beb33f2e4c24bf728e58` (`sites-v186`).
No persisted data change is introduced by 191; rollback removes these controls.
