# Publish next

**STATUS: NONE PENDING ON MAIN. PR39 MCP remains separately held and unmerged.**

Application release 193 is live as Sites version 189 from
`a009c08fad02aa6859ec6445784f744c6e269c8d`, deployed 2026-10-25 at
21:45:24.014279 UTC to the existing public
[Fleet Step site](https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site).

ADVANCED ACTIONS drawers use the Defect Log header's navy and the Down Sheet
button's purple. Both openers are taller and DAILY STATS has a larger,
accent-edged bar. Service-worker v7 is unchanged; no cache bump was made.
No markup, application logic, storage, dependency, Supabase, credential,
permission or runtime configuration change is part of 193.

Local and exact-source CI lint/build/388 tests passed; an independent cold read
found no actionable defect. Eight live routes and 40 asset byte comparisons
passed. Delivered CSS contracts matched the two drawer colours, transparent
inner bodies, larger openers and taller DAILY STATS. These checks do not
establish computed styles or visual interaction on an actual device.

Manual checks still needed: open both drawers, inspect their card controls,
DAILY STATS and dark Defect Log themes, then confirm one-line Down Sheet
ADVANCED ACTIONS and no horizontal scroll on the shop computer/iPad.
Phone/Safari/Home Screen, focus/contrast and offline-device checks were not
performed here. The pre-existing generated Defect Log preload 404 remains;
the actual manifest assets passed byte comparison.

Rollback: application 192 / Sites 188, source
`2ddc026c139c45acec7c24128633841d96e7dee3` (`sites-v188`).
See [release evidence](RELEASES.md) and [193 handoff](archive/PUBLISH_RELEASE_193.md).
Later documentation-only commits were preserved on main. PR39 remains separate.
