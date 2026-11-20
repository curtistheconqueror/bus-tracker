# Local picker release recovery follow-up — 2026-11-20

Local-only descendant of frozen PR #56 source `3122806e80387e1c4a6df448bbecdef2286de4f8`. This record does not queue or authorize publication. The commit containing this record is the new local freeze; the prior candidate and owner branches remain unchanged.

## Independently reproduced review findings

CodeRabbit review [5987835653](https://github.com/curtistheconqueror/bus-tracker/pull/56#pullrequestreview-5987835653) covered the prior source, not this follow-up. All five claims were reproduced on that source using synthetic records:

- [4638735550](https://github.com/curtistheconqueror/bus-tracker/pull/56#discussion_r4638735550): adopting an existing defect, completing it, then retrying without a persistent link produced a second identity.
- [4638735557](https://github.com/curtistheconqueror/bus-tracker/pull/56#discussion_r4638735557): another MARK FIXED after a refused sheet write replaced the original open-defect undo copy with completed data.
- [4638735559](https://github.com/curtistheconqueror/bus-tracker/pull/56#discussion_r4638735559): failed sheet-first restoration kept a false complete marker after reload.
- [4638735561](https://github.com/curtistheconqueror/bus-tracker/pull/56#discussion_r4638735561): canceling a raw bus edit reset an explicitly changed tracker status to the fleet default.
- Review-body completion-only finding: transfer kept a card with completion data but submit discarded it. A record with work data and no repair identity is now retained and explicitly refused until identified, rather than silently dropped.

## Recovery contract

A checked LocalStorage journal precedes either data write. It freezes per-record before/after patches, including both buses affected by relocation. Normal saves write fleet then sheet; restoration writes sheet then fleet. Card-to-defect links are persisted before completion and reused when an editor predates a recovered save.

A refused write, finalization or journal cleanup leaves the intent durable. Retry applies the frozen patches, skips already-applied sides, retains unrelated records and refuses conflicting touched records. Reload does not automatically replay or mint over pending recovery. Normal record writers and cloud sends pause while it is pending; Map bulk clear/undo and Down Sheet bookkeeping actions are interlocked before mutation. Journal completion refreshes other open Map/Down Sheet views.

MARK FIXED preserves the original sheet entry and bus fields plus their expected after-states. Another Mark Fixed/delete cannot replace a pending copy. Restore checks both sides before planning; it persists restoring intent before writes and retains the original copy until checked completion. Even a refused journal replacement cannot turn an explicit restore back into completion. New draft edits remain mounted; an accessible retry control inside the editor finishes the previous attempt before the user saves newer edits.

Older undo copies without expected after-states are kept, but automatic restore is refused with an explicit explanation. Do not delete them or infer that replaying an old copy over later work is safe; manual reconciliation is required.

## Verification

- Baseline reproduction evidence is retained outside the checkout in `fleet-recovery-baseline.test.mjs`, `fleet-recovery-baseline.log`, and `fleet-adoption-baseline.mjs` in the parent task workspace.
- `npm test`: production build and 497 Node tests passed, including 19 recovery tests for both write orders, journal/data/finalization/cleanup failures, retry/reload, conflicts, swaps, identity binding, generic writer interlocks and deferred cloud batches.
- ESLint: zero errors/warnings. Chromium: 47/47 and WebKit: 47/47 production-loopback browser cases passed, including the earlier picker regressions, both save/restore refusal orders, two-tab refresh, touched-sheet conflict, missing bus, refused restore-journal replacement, Map clear/undo interlocks and a visible/uncovered retry control at 390×640. All browser contexts used synthetic LocalStorage, blocked service workers and aborted external/non-GET requests; emitted assets were served from the unchanged production build to reproduce the Sites ASSETS contract on Windows. The temporary loopback server was stopped after checking.
- TypeScript remains a known failing repository baseline: 237 diagnostics versus main's 239. Comparing diagnostic messages with locations, union order and abbreviated property counts normalized found no additional diagnostic messages; this is not a clean typecheck.
- One independent cold reviewer read the entire change against main and checked the follow-up corrections; no remaining introduced integrity blocker reported. This is separate from CodeRabbit, whose review of this new local source is outstanding.

## Limits and remaining gates

LocalStorage comparisons and writes are optimistic, not atomic across tabs. These guards do not claim general concurrent-editor protection, nor protection from older clients that do not understand the journal. An already-sent cloud request cannot be recalled; sends stop at the next checked mutation boundary. This is not a database transaction or a Supabase configuration change.

Physical iPhone Safari/software keyboard/number-pad acceptance is still required. Playwright WebKit and touch emulation do not satisfy it. No preview route has been activated for this moving candidate.

Physical-device acceptance must use an approved candidate-only synthetic build, with production requests blocked and production storage untouched. No such newly exposed route is authorized by this local task. On a real iPhone Safari, check:

1. Both forms: first bus touch browses without opening the software keyboard; second touch/TYPE opens numeric input; LIST and a row choice dismiss it. Exact bus entry does not implicitly submit Down Sheet.
2. Engine opens its direct repair list; category selection moves typing to the symptom. Hardware Tab/Shift+Tab and Escape cancel an unresolved bus edit safely. A canceled bus edit retains the edited tracker status.
3. ADD TO THAT ENTRY with one and several existing repairs keeps original repairs and initials, brings the new Category visibly into view and does not activate an offscreen FINISHED control. Explicit Save persists one entry with both repairs.
4. In the synthetic fault fixture, refuse the first and second save/restore writes independently; verify truthful pending state through reload, reachable Retry at a small viewport, preserved original undo, one defect identity and newer unsaved edits retained after retry.

Before any release: exact-source CI and CodeRabbit, review of the final diff, physical iPhone acceptance, current owner-head reconciliation and the documented release/publishing gates. No push, merge, review trigger or publication occurred in this follow-up.

Preserved references: prior frozen candidate `3122806`; last verified production app 197 / Sites 194 source `12822f60c7e5d76d3702108b33711cc116ca4f61`. Recheck production before any future publication. Resolve/export pending recovery before considering an older application build; an older client does not understand the new journal. Do not clear production storage or import a backup as a rollback shortcut.
