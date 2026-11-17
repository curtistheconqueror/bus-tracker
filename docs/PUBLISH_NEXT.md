# Publish next

**STATUS: NONE PENDING.** Application release 196 is live as Sites Version 191, deployed 2026-11-17 at 07:12:36.997726 UTC.

Source: `a9f610d42123cd6cfaaf32b61d8c78048d585c82`.
Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Only the requested two Defect Log presentation defaults changed: Advanced Actions starts collapsed with its button visible; Detailed is the default card view with Compact to its right. Explicit saved card-view choices are honored. No operational records or other surfaces were changed.

PR49 CodeRabbit review found no actionable comments; exact-head CI passed. Production build, 469 tests and lint (zero errors, one existing tool-file warning) passed. TypeScript retains exactly the same 238 pre-existing baseline diagnostics. Fresh browser interaction and physical-device checks remain unverified.

Rollback: Sites 190 / `sites-v190` at `a1d90e85a6489ab9c6ff636e50ed813d98363978`. Legacy-look archive remains untouched. Full prior queued-work history remains in `docs/archive/PUBLISH_RELEASE_194_195.md`.

Live verification: home, Defect Log and Down Sheet returned HTTP 200; Defect Log server output starts Detailed with Advanced Actions collapsed and drawer absent; all 27 referenced emitted JavaScript assets matched the release build byte-for-byte. This is HTTP/source verification, not fresh browser interaction.
