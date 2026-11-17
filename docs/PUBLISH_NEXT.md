# Publish next

**STATUS: READY FOR REVIEW.** Application release 196: two Defect Log presentation defaults, explicitly approved by Curtis for live publication on 2026-11-17.

- ADVANCED ACTIONS starts collapsed on each page visit; the button stays visible. The legacy preference is no longer read or written, and its stored value is left untouched.
- Detailed is the default card view, followed by Compact to its right. Explicitly saved card-view choices still work.

No operational records, editor advanced details, Down Sheet defaults, storage schemas, styling, credentials or hosting audience change.

Local production build, all 469 regression tests, lint (zero errors; one existing ignored-tool-file warning), and diff whitespace checks pass. CodeRabbit and exact-head CI are pending. Current live release remains Sites 190 / application 194+195 at `a1d90e85a6489ab9c6ff636e50ed813d98363978`. Rollback remains available there.
