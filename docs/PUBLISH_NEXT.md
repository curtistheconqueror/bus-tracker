# Publish next

**STATUS: NONE PENDING.** Application release 209 is live as Sites Version 197,
deployed 2026-11-24 at 21:03:26.739201 UTC from `9a7cc1f417c53689ee62b5f564609e2a0dc5b32a`.
It carries releases 207 and 208.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Previous-live rollback: Sites 196 / application release 206 at
`e649c644c28b66f4bc7d4494726a79834a80164b`. PR39 MCP remains held and excluded.
No migration, storage-key, runtime environment or audience change.

The full queue is archived in [releases 207–209](archive/PUBLISH_RELEASE_207_209.md).
Publication evidence is in [RELEASES.md](RELEASES.md).

## Remaining device checks

On a phone with existing fleet data, verify that the top Defect Log box contains
+ LOG DEFECT and SEARCH only; LIVE DEFECT FEED shows the count, then the
unlit ALL dropdown beside DETAILED / COMPACT, then SHOW STATUS COLOR.
Check the native eight-choice picker, PREVIOUS SHIFT face and shift-hours
banner, search clearing on ALL, actual card appearance in COMPACT / DETAILED,
and no sideways scrolling. In Fixed Repairs, check WHEN FIXED → PREVIOUS SHIFT.
Physical iPhone/Safari/Home Screen and offline acceptance remain unverified.

The prior release's remaining device-only checks (Log Defect bus/location
modal open and cancel, and the populated Down Sheet bus label) are preserved
in [releases 198–206](archive/PUBLISH_RELEASE_198_206.md). These follow-ups are
not pending source releases; do not change actual fleet records to test them.

---

## PR39 (MCP read surface) — NOT MERGED, and not part of any release above

**Nothing in this section is pending publication.** PR39 is an open, unmerged
pull request, held by Curtis's own release gates; the STATUS line at the top of
this file is about release 198 and says nothing about this. It is kept here so
that the gates travel with the branch, and it becomes a release section only if
and when PR39 is merged — at which point its STATUS, its source SHA and its
rollback are all written fresh against whatever is live then.


PR #39 adds five read-only MCP tools at `/api/mcp`. Last code-bearing source:
`0e6d9aa99a31ebc83bb458f884d0a937cb225701`; freeze and reverify the actual
merged release SHA before packaging. Never publish the older `347672f` build.
CI [39532393605](https://github.com/curtistheconqueror/bus-tracker/actions/runs/39532393605)
passed lint, build and 399 tests on merge candidate
`86e84e51bae874e9c55c079ff2b1c891f065ce37` (code head above into `a7e1aa3`).
Any newer code requires reconciliation and current-head checks.

**THAT CI RUN AND ITS 399 TESTS DESCRIBE AN OLDER CANDIDATE, not this head.**
`main` was merged into this branch on 2026-11-18 at `19f0e90`, and again on
2026-11-20 at `eaf1c32` — 30 further commits carrying the five PRs queued as
release 198 — because the branch is published and is not rebased. One file conflicted,
`tests/helpers/modules.mjs`, where this branch and `main` had each appended
export lines at the same end: resolved as the union of both, with every module
path checked to exist. Measured on the merged tree, in a container rather than
in CI: the production build succeeds, **527 of 527 tests pass** and ESLint is
clean. CI must re-run on the actual merge SHA before anything is packaged, and
the test count above moves with every change that adds one.

Nothing about the gates below changed. This merge is maintenance so the branch
can land when Curtis clears them; it is not a claim that any gate is met.

Curtis authorized publication of the verified ready scope on 2026-10-21 and
temporarily accepted the unresolved Major URL-token risk for his initial
single-user read-only connection. Keep the
[OPEN risk record](MCP_SECURITY_FOLLOWUP.md) in subsequent release handoffs;
do not describe it as fixed or CodeRabbit-approved.

Before merge/publication, confirm the coordinating Supabase work has verified
effective reader isolation and dedicated reader authorization, then configure
the five runtime variables through the approved secure path. This record does
not assert provisioning, authorization checks or runtime configuration are done.
Do not duplicate identity creation, bundle future writes, or disclose a real
token or token-bearing URL. No application migration is executed by this
documentation change; separately coordinated Supabase changes need their own
verification record.

After publishing to the existing site, verify the frozen source and application
and Sites versions; smoke the existing UI routes, unauthenticated rejection,
authenticated MCP initialization/discovery, and actual authorized cloud tool
reads without exposing credentials or private records. Record outcomes and
remaining client/device checks. A handshake alone is insufficient.

**ROLLBACK IS THE LIVE BASELINE AT PUBLISH TIME, AND IT IS RE-PINNED WHENEVER
`main` IS MERGED IN.** It read application 191 / Sites 187,
`b33775685b61acafdf4325807c82e92281c9fc2c` (`sites-v187`) — written on 2026-11-02
and carried through the merge of 2026-11-18 without being re-read. By then it was
162 commits behind, so rolling this release back as written would have reverted
application releases 192 through 197 as well, including 197's page-resume and
hydration-readiness fix, when the only intent is to take `/api/mcp` away.
Measured: `git rev-list --count b337756..origin/main` = 162.

**Rollback for this section is WHATEVER IS LIVE WHEN IT IS FROZEN. Read it off
the top of this file at that moment; do not trust a SHA written here.** It is a
rule now and not a number, because every number put here went out of date
before the section was ever used:

- 2026-11-18: still named Sites 187, from 2 November. Rolling back as written
  would have reverted releases 192 through 197 when the only intent was to take
  `/api/mcp` away — 162 commits stale.
- re-pinned to Sites 194 / release 197; releases 198 to 206 overtook it.
- re-pinned to 206; release 207 overtook it.
- 2026-11-24: 207 and 209 are out, and live is Sites Version 197 / release 209.

Four pins, four times stale. A rollback that undoes unrelated releases is a
defect rather than a stale note, which is why this carries no number of its own.
Do not mark live until deployment and these checks complete.
