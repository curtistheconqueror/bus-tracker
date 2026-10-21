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

Application release 191 is live as Sites platform version 187 from
`b33775685b61acafdf4325807c82e92281c9fc2c`, deployed 2026-10-20 at
19:35:00.450217 UTC to the existing public
[Fleet Tracker site](https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site).

FOCUS now has COPY, SHARE and SHARE PAGE for a complete selected-bus snapshot.
See [release evidence](RELEASES.md) and the preserved
[191 handoff and acceptance checklist](archive/PUBLISH_RELEASE_191.md).

Rollback: application 189/190 / Sites 186 from
`c9c03d661177c04706f7beb33f2e4c24bf728e58` (`sites-v186`).

Fresh browser interaction, native phone sharing, VoiceOver, Safari/Home Screen
and offline-device checks remain for Curtis. Six server routes and 33 deployed
asset comparisons passed. No production data was changed.
