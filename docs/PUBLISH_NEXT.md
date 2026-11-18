# Publish next

**STATUS: NONE PENDING.**

Sites Version 194 / application release 197 deployed 2026-11-18 at 03:28:47.647741 UTC from `12822f60c7e5d76d3702108b33711cc116ca4f61`. Installed copies reopen the remembered page after safe document/hydration readiness; Doors picker receives its display-only emoji. PR50 CodeRabbit final review covered this exact SHA with no actionable comments; CI451 (44229747699) passed. Production build and 470 tests passed; ESLint zero errors and one preexisting warning. Browser loopback regression proved delayed-script/stalled-destination recovery; live HTTP200 and exact corrected inline script verified on Map, Defect Log, Down Sheet and Settings. Live Defect Log rendering checked. Physical iOS/Home Screen and real garage network behavior remain unverified. The initial service-worker document request remains unbounded; readiness taking more than the 2.5-second script budget falls back to map for that run. Sites192 and193 were saved candidates, never deployed. Rollback: Sites191 at a9f610d42123cd6cfaaf32b61d8c78048d585c82.

PR39 MCP remains separately held and unmerged, excluded from this release. Historical queue: docs/archive/PUBLISH_RELEASE_197.md.
