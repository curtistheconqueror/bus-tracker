# Publish next

**STATUS: PENDING - PR #39 read-only MCP; held for reader verification and secure runtime configuration.**

## Pending scope and release gates

PR #39 adds five read-only MCP tools at `/api/mcp`. Last code-bearing source:
`0e6d9aa99a31ebc83bb458f884d0a937cb225701`; freeze and reverify the actual
merged release SHA before packaging. Never publish the older `347672f` build.
CI [39532393605](https://github.com/curtistheconqueror/bus-tracker/actions/runs/39532393605)
passed lint, build and 399 tests on merge candidate
`86e84e51bae874e9c55c079ff2b1c891f065ce37` (code head above into `a7e1aa3`).
Any newer code requires reconciliation and current-head checks.

**THAT CI RUN AND ITS 399 TESTS DESCRIBE AN OLDER CANDIDATE, not this head.**
`main` was merged into this branch on 2026-11-18 at `19f0e90` — 160 commits,
three published releases (Sites 192-194) and application release 197 — because
the branch is published and is not rebased. One file conflicted,
`tests/helpers/modules.mjs`, where this branch and `main` had each appended
export lines at the same end: resolved as the union of both, with every module
path checked to exist. Measured on the merged tree, in a container rather than
in CI: the production build succeeds, **509 of 509 tests pass** and ESLint is
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
remaining client/device checks. A handshake alone is insufficient. Rollback
for this pending release is application 191 / Sites 187, source `b33775685b61acafdf4325807c82e92281c9fc2c`
(`sites-v187`). Do not mark live until deployment and these checks complete.

## Current live baseline

Sites Version 194 / application release 197 deployed 2026-11-18 at 03:28:47.647741 UTC from `12822f60c7e5d76d3702108b33711cc116ca4f61`. Installed copies reopen the remembered page after safe document/hydration readiness; Doors picker receives its display-only emoji. PR50 CodeRabbit final review covered this exact SHA with no actionable comments; CI451 (44229747699) passed. Production build and 470 tests passed; ESLint zero errors and one preexisting warning. Browser loopback regression proved delayed-script/stalled-destination recovery; live HTTP200 and exact corrected inline script verified on Map, Defect Log, Down Sheet and Settings. Live Defect Log rendering checked. Physical iOS/Home Screen and real garage network behavior remain unverified. The initial service-worker document request remains unbounded; readiness taking more than the 2.5-second script budget falls back to map for that run. Sites192 and193 were saved candidates, never deployed. Rollback: Sites191 at a9f610d42123cd6cfaaf32b61d8c78048d585c82.

PR39 MCP remains separately held and unmerged, excluded from this release. Historical queue: docs/archive/PUBLISH_RELEASE_197.md.
