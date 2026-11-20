# Picker follow-up — LOCAL ONLY / RELEASE HOLD

Code candidate: `bee11e0521e99c1ef4a6ff25f703a7392dad7be2`.
Branch: `codex/fleet-picker-followup-local-nov20`.
Frozen reference remains `255c6669d053cf0bc4a468658ab210d078bf052b` on
`codex/fleet-picker-release-nov20`; no reset or rewrite occurred.

This follow-up reconciles the two reproduced behavior gaps from owner PR54
`32e10deca99c501371dc0235054848b5c17f6b7f` without replacing the combined
candidate's category-to-symptom or draft-preserving handoff. PR55 remained
`f1e4d659ba52da055f24997ebe07f992c17b4de8` at the opening check.
Owner branches are untouched. No remote publication, push attempt or merge.

## Changes and checks

- Immediate Enter on a closed browse-first picker, within two seconds of a
  selection, confirms the pick without implicitly submitting the form. A later
  Enter still submits, and the primary Save button works inside the guard window.
- An exact bus picked after no-pointer keyboard focus on a coarse screen blurs.
  Fine-pointer exact bus entry retains desktop focus and ordinary Tab behavior.
- Explicit row selection always blurs, including mouse input followed by a touch
  row selection. The stale-pointer CodeRabbit finding on owner PR54 therefore
  does not reproduce on this candidate's explicit-row path.
- No other product files changed relative to the frozen reference.

Verified on the code candidate:

- Full ESLint passed; final changed-file ESLint passed after the test selector fix.
- `npm test`: production build and 478/478 Node tests passed.
- Chromium: 17/17 acceptance scenarios and 6/6 comparison probes passed.
- WebKit: 17/17 acceptance scenarios and 6/6 comparison probes passed.
- The prior eleven browser scenarios all reran. Six new cases cover both forms:
  immediate Enter suppression plus delayed Enter submission, no-pointer coarse
  focus and mixed mouse-to-touch selection, and immediate explicit primary Save.
- TypeScript remains failing baseline: 237 diagnostics versus main's 239;
  normalized comparison has no added diagnostics. No suppressions added.
- Independent cold review found no introduced substantive issue. Its suggested
  immediate explicit-Save negative controls were added and passed on both forms.

The six-probe reproducer and corrected follow-up variant live outside the tracked
checkout in the task workspace, alongside `picker-followup-*.log` evidence.
The committed acceptance suite is `tests/browser/picker-release.test.mjs`.
Browser tests use synthetic records and loopback GETs only, with the documented
exact-built-asset binding workaround for Windows vinext preview. No production
records or cloud authentication were used. WebKit and touch emulation are not
physical iPhone Safari evidence.

## Real iPhone Safari acceptance — NOT RUN

Use an isolated, approved candidate origin with synthetic buses only. Do not use
production or production browser storage, import backups, sign into Shop Cloud,
or clear existing browser data. Capture device/iOS version, exact candidate SHA,
and observed results; repeat in Defect Log and Down Sheet.

1. First tap BUS and category: list appears without keyboard. Second tap or TYPE
   opens typing; BUS shows the numeric keypad. LIST dismisses the keyboard.
2. Type a unique full bus number: correct bus is selected and phone keyboard
   dismisses. Also reach BUS using the keyboard accessory next/previous control
   without tapping it, then type the number and check dismissal.
3. Browse categories and select Engine: its direct symptom/repair list opens.
   Ask to type and enter a symptom; the category must not be replaced.
4. Edit a selected bus to invalid letters, a prefix, an ambiguous number and an
   unmatched number: no accidental selection or stale-bus save. Explicit cancel
   restores the previous valid bus. Defect Log board search remains unchanged.
5. On any hardware-keyboard setup, exact bus then immediate Enter must leave the
   editor open with no new persisted entry. Primary Save must work immediately;
   Enter after the two-second window must retain deliberate submit behavior.
6. ADD TO THAT ENTRY with original and drafted repairs plus initials: useful card
   is visible; cancel any duplicate/metadata warning without losing the draft;
   continue and Save exactly one entry with both original and new repairs and
   intended initials. Verify declined/cleared initials do not become old initials.
7. If mouse and touch are both available, open/type with mouse then select a row
   with touch; keyboard/focus must dismiss. Confirm ordinary desktop Tab remains usable.

## Private preview route and remaining gates

The supported portable workflow is the documented local development preview with
supported forwarding when execution is remote. There is no verified physical
phone surface or already-authorized private forwarding route in this environment.
Loopback on TheCube is not a phone-reachable preview. If an existing trusted LAN
or approved private forward is available, use that candidate origin and manually
create synthetic records in an isolated Safari session. Do not open ports, start
new tunnels, change firewall/access settings, expose production data, or create a
replacement Site under this local-only task.

Current Sites tools do not expose a separate branch-preview operation; private
Site deployment is a production operation and is not a preview workaround.
A safe phone-reachable origin must be established/approved separately before
claiming physical acceptance. No candidate preview URL is claimed here.

Exact-head remote CI and fresh CodeRabbit remain pending because this candidate
is local only. Prior push consent, if granted for `255c666`, would not authorize
this changed source. Do not retry a denied push or publish from this note.
Production remains application197 / Sites194 at
`12822f60c7e5d76d3702108b33711cc116ca4f61`; retain that live rollback baseline.
