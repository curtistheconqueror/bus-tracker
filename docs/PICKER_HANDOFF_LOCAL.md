# Existing-entry focus follow-up — LOCAL ONLY / HOLD

Tested code: `a23a943bb22f4a828061ac7474c56a5e16ade4d9`.
Local branch: `codex/fleet-picker-handoff-local-nov20`.
Preserved references: `ef992fee1c9143a833881b68b8fdd56e5a8fe519` on
`codex/fleet-picker-followup-local-nov20`, and `255c6669d053cf0bc4a468658ab210d078bf052b`
on `codex/fleet-picker-release-nov20`. Neither reference was rewritten.

## Finding and correction

SDET comment r4637305754 covers owner PR55 `f1e4d659`: native focus on the
first input selected an offscreen FINISHED checkbox. The read-only probes on
our `ef992fee` instead found card-container focus. Space did not mark the
repair done in the completed baseline cases, but Category was not focused,
so the requested handoff acceptance criterion was not met.

This descendant centers the intended card's Category inside the modal scrollport.
ComboField owns an opt-in, guarded read-only browse focus: on a fine pointer it
writes readOnly and inputmode=none before focus, while suppressing the ordinary
focus-to-typing handler. A coarse pointer receives no automatic input focus.
The first deliberate hardware key still enters typing mode. Focus never selects
FINISHED. This also avoids treating fine-pointer capability as proof that a
software keyboard is absent.

While testing, owner PR55 advanced to `f589c5c580383a22adf1fa188bd334fbfc3578da`.
That change focuses the fields container without a pointer test. It was inspected
read-only; this local descendant retains stronger direct Category visibility,
draft preservation and guarded browse focus. Owner branches remain untouched.
PR54 was `32e10deca99c501371dc0235054848b5c17f6b7f` at the last check.

## Verified evidence

- Full lint: passed with zero warnings/errors on final source.
- Production build and Node tests: 478/478 passed.
- Chromium and WebKit: each passed 25/25 acceptance cases and 6/6 comparison probes.
- Eight new handoff cases cover one and five existing repairs, each activated
  using keyboard, mouse, coarse touch and simulated touch-with-fine-pointer.
  These cases explicitly set 1180x900 desktop or 390x900 touch/hybrid viewports;
  the generic earlier browser cases retain their original 1000px height.
- Category is fully inside the measured modal scrollport. Desktop Category bounds
  were approximately y=406..443 within y=100..749; touch/hybrid approximately
  y=397..441 within y=73..766 in both cached engines.
- Fine/hybrid Category focus is read-only with inputmode=none before Space.
  Coarse touch has no active input. Space leaves the new repair unfinished.
- Explicit Save persists exactly one entry, preserving original repair IDs,
  wording, details, existing done flags and entered ZZ initials, plus the new
  Engine/Misfire repair with done=false. All eight cases assert this outcome.
- All prior picker, immediate-Enter, deliberate Save, delayed Enter, cancel,
  filter, draft-transfer and refused-save/recovery scenarios reran.
- TypeScript still exits2: 237 diagnostics versus main's239. After normalizing
  locations and equivalent union ordering there are no added diagnostics.
- Final independent cold review found no actionable product issues. Its cosmetic
  inherited EOF finding was removed in the documentation record commit.

Tracked behavioral gate: `tests/browser/picker-release.test.mjs`.
Task-workspace evidence: `picker-handoff-chromium.log`, `picker-handoff-webkit.log`,
`picker-handoff-probes-*.log`, `picker-handoff-tests.log`, `picker-handoff-lint.log`,
`picker-handoff-typecheck-comparison.json`, and the read-only
`picker-handoff-focus-baseline.test.mjs` / corresponding log.
Only synthetic device-local records and loopback GETs were allowed. Exact built
assets were served by the previously documented Windows vinext test binding.

## Remaining release gates

Physical iPhone Safari and actual touch/trackpad keyboard behavior remain untested.
The hybrid case mocks pointer capability; it does not simulate a software keyboard.
On an approved isolated synthetic candidate origin, repeat the one/five-repair
handoff using keyboard and touch/trackpad where available. Verify visible Category,
no automatic software keyboard, deliberate typing, accidental Space, explicit Save,
original repairs/initials and new repair remaining unfinished. Retain the rest of
`docs/PICKER_FOLLOWUP_LOCAL.md`'s physical-device acceptance checklist.

No phone-reachable private preview route has been verified. No new route, tunnel,
Site, exposure, permission, credentials or settings were created. Exact-head CI and
fresh CodeRabbit remain pending because this branch has not been pushed.
Any requested consent naming ef992fee is stale for this changed source; do not use
it for a push, merge or deployment of this descendant.

Production remains application197 / Sites194 from
`12822f60c7e5d76d3702108b33711cc116ca4f61`, the retained live rollback baseline.
No push attempt, remote merge, deployment or production data change occurred.
