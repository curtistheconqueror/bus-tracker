# Publish next

**STATUS: NONE PENDING.** Application release 206 is live as Sites Version 196,
deployed 2026-11-23 at 23:36:15.204248 UTC from `e649c644c28b66f4bc7d4494726a79834a80164b`.
It carries releases 198–206. Releases 198–205 had already gone live together
as Sites 195 earlier that day; they were not nine unpublished releases.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Previous-live rollback: Sites 195 / application release 205 at `55812e1829f4a9469e901fb092980f3f86c5e536`.
PR39 MCP remains separately held and unmerged, excluded from this release.
No migration, storage-key rename, runtime environment or audience change.

The preserved queue and device checklist are in
[releases 198–206](archive/PUBLISH_RELEASE_198_206.md).
Publication evidence and limits are in [RELEASES.md](RELEASES.md).

## Remaining device checks

The exact production build passed the placeholder, selected-bus location-pill,
BUS LOCATION modal open/cancel, and unchanged Down Sheet label checks in cloud
Chromium. The live Defect Log placeholder also passed. The fresh live browser
had no device-local fleet, so no bus was added to exercise a live location
pill or populated Down Sheet field. No fleet records were changed.

On a phone with existing fleet data, open + LOG DEFECT: check the empty BUS
wording, select a bus, open its location pill and cancel the BUS LOCATION
window. On Down Sheet + ADD, check `Bus N · Place`. Only move a bus that is
really somewhere else. Physical phone/Safari/Home Screen, touch keyboard and
offline acceptance remain unverified. These are device follow-ups, not a
pending source release.

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
in CI: the production build succeeds, **525 of 525 tests pass** and ESLint is
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

**Rollback for this section is the live baseline AT ITS OWN PUBLISH TIME, and
it is re-pinned every time `main` is merged in.** Live today is application
release 206 as Sites Version 196, deployed 2026-11-23 from
`e649c644c28b66f4bc7d4494726a79834a80164b`. Releases 198 to 206 published while
this branch sat, so the Sites 194 / release 197 pin written here on 2026-11-20
is already history — read what is live when this section is frozen rather than
trusting this line.

The rule exists because the pin was 162 commits stale on 2026-11-18 and would
have reverted releases 192 through 197 when the only intent was to take
`/api/mcp` away. A rollback that undoes unrelated releases is a defect, not a
stale note.
Do not mark live until deployment and these checks complete.
