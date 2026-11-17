# Publish next

**STATUS: NONE PENDING.** Application releases 194 and 195 are live together as Sites Version 190, deployed 2026-11-17 at 06:11:14.623645 UTC.

Source: `a1d90e85a6489ab9c6ff636e50ed813d98363978`.
Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Release 194 preserves all previously queued work, including hold-to-drag map safety, map Escape behavior, header settings, repair estimates, time-window/sharing fixes, multi-part repairs, heat-check log and SCAN SHEET routing. Its complete former queue and outstanding product questions are preserved unchanged in `docs/archive/PUBLISH_RELEASE_194_195.md`.

Release 195 adds the shared compact mobile shell, grouped map controls, visible Down Sheet shift filters and remembered Compact / Detailed defect cards, including both CodeRabbit focus fixes. See `docs/MINIMALIST_REDESIGN.md`.

PR #48 was merge-committed after Curtis said to make it live. Its exact reviewed head passed CI; the merged tree is byte-identical. Local production build, lint and all 468 tests passed. Live eight-route HTTP checks and 76 browser/static asset byte comparisons passed. Chromium passed 24 route/viewport checks and the synthetic-data navigation/card flows. The longer browser run reported four recoverable React #418 text-hydration warnings on Settings. Investigation reproduced a server/client minute-boundary difference in the existing hidden SHIFT ENDS IN display; its component and clock module are byte-unchanged from the pre-redesign baseline. Fresh UTC/Chicago checks of the three core routes showed no page errors. This is not established as a cache problem. No functional failure or record loss was observed. Physical iPhone/Safari/Home Screen, hardware safe areas, VoiceOver and native share sheets remain unverified.

The heat-sheet read and SCAN SHEET identification still need a real shop photograph. PR39 MCP remains separate, unmerged and excluded. No Supabase schema, credentials, runtime environment or site-audience change was made by this release.

Rollback to previous live: Sites Version 189 / `sites-v189`, source `a009c08fad02aa6859ec6445784f744c6e269c8d`.
Pre-redesign code checkpoint (includes queued 194): `legacy/pre-minimalist-20261117-103f00d`, source `103f00d15e73d09642720963043b16b05347c440`.
