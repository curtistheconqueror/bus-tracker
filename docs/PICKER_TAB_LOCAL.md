# Tab cancellation follow-up — LOCAL ONLY / RELEASE HOLD

Tested code: `861fa6162eeb206bff7961dd7678aa93d909e74c`.
Branch: `codex/fleet-picker-tab-local-nov20`.
Preserved reference: `09b07685735ac24368779e61bcc9dfffc65b73f7` on
`codex/fleet-picker-handoff-local-nov20`. Earlier ef992fee and255c666 references
also remain unchanged. No owner branch or user changes were overwritten.

## Focused correction

An open unresolved bus edit now cancels on Tab or Shift+Tab: the existing
cancellation callback restores only a prior bus still present in the fleet,
the query/list/typing mode close, and default browser traversal is allowed.
No preventDefault, global blur cancellation or pointer-Save restoration was added.
A valid exact pick remains selected. With no available prior bus, cancellation
leaves the form unselected and Save still refuses it.

The only product delta from09b0768 is the six-line keyboard branch in ComboField.
LIST and outside-pointer behavior remains unchanged: unresolved identity is not
silently revived, and pointer Save reaches validation. Escape/caret explicitly
restore the available prior bus as before.

## Exact-source checks

- Full lint passed, zero errors or warnings.
- Production build and478/478 Node tests passed.
- Chromium33/33 and WebKit33/33 acceptance tests passed.
- Four tests directly assert both forms' forward/backward target against the
  browser's next/previous tabbable element, restored bus18505 and closed list,
  then explicitly Save to18505.
- Both forms test Escape/caret restoration, LIST/outside/pointer-Save refusal,
  and valid replacement with20500 persisting to20500 rather than the prior bus.
- Both forms test absent and concurrently deleted prior buses in both traversal
  directions, with Save refusal and unchanged persisted records.
- All prior25 scenarios reran, including Category-to-symptom focus, immediate
  Enter not saving, deliberate primary Save and delayed Enter, repair handoff,
  accidental Space, initials preservation and refused-save recovery.
- TypeScript remains baseline-failing:237 diagnostics versus main's239, no added
  diagnostics after normalizing positions and equivalent union ordering.
- Independent cold review of exact861fa61 found no actionable introduced issue;
  whole-diff whitespace checks against main passed.

Tracked test: `tests/browser/picker-release.test.mjs`.
Task-workspace evidence: `picker-tabfix-chromium.log`, `picker-tabfix-webkit.log`,
`picker-tabfix-tests.log`, `picker-tabfix-lint.log`, and
`picker-tabfix-typecheck-comparison.json`. The prior read-only failing09b0768
probe remains in `picker-tab-acceptance.test.mjs` with its original logs.
Only synthetic browser-local records and loopback GETs were used. Cached browser
engines and the documented exact-built-asset binding were reused. No real fleet,
cloud login, credentials or production storage was used.

## Owner comparison and remaining gates

Last read-only owner heads: PR54 `4acf963f767a14c6421b2d6890d197afefb15d11`,
PR55 `d23555416958043c4290b8d20e6f2613930c99e9`. The latter adds scrolling to
its fields-container handoff; our separately verified visible Category handoff
was preserved. No owner changes were merged or pushed from this task.

Physical iPhone Safari, actual hybrid devices and phone accessory navigation
remain unverified. Repeat the physical checklists in PICKER_FOLLOWUP_LOCAL.md
and PICKER_HANDOFF_LOCAL.md, adding bus18505 -> invalid99999 -> Tab/Shift+Tab
(where hardware keyboard is available), expected visible18505 and normal focus
traversal. Check phone accessory navigation separately; this change handles
keyboard Tab events, not every possible focus-loss source. Confirm explicit Save
on an unresolved edit still refuses without a stale-bus write.

This candidate has not been pushed. Exact-head GitHub CI and fresh CodeRabbit
remain pending. Any prior consent naming09b0768 or older code does not cover
this changed source. Do not push, merge or publish under this local-only record.
No preview exposure, network/permission/settings changes, paid review or external
communication occurred. Retain the last recorded live rollback: application197 /
Sites194, source12822f60c7e5d76d3702108b33711cc116ca4f61.
