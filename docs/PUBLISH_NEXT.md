# Publish next

**STATUS: NONE PENDING ON MAIN. PR39 MCP remains separately held and unmerged.**

Application release 192 is live as Sites version 188 from
`2ddc026c139c45acec7c24128633841d96e7dee3`, deployed 2026-10-23 at
02:26:48.844011 UTC to the existing public
[Fleet Step site](https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site).
PR40 merged as `cc495d5a3f4fd0f6eacde35d4e2b58527a8792a3`.

Incidents and Shop Talk are device-local and excluded from MASTER EXPORT.
A/C Buses includes Heating in the shared HVAC category. Those disclosed
behaviors remain as approved. No optional badge or anonymization change was made.

Local and exact-source CI lint/build/388 tests passed. Eight live routes and
40 asset byte comparisons passed; service-worker v7 includes both new routes.
Fresh browser interaction, native phone/iPad/Safari and offline-device checks
remain unperformed. One existing generated Defect Log preload reference is
absent from build output; the actual manifest asset passed byte comparison.

Rollback: application 191 / Sites 187, source
`b33775685b61acafdf4325807c82e92281c9fc2c` (`sites-v187`).
See [release evidence](RELEASES.md) and [192 scope](archive/PUBLISH_RELEASE_192.md).

PR39 remains at `17b7b2a07f790cbf4aefdeeaf800057efd0165d2` and was not
published. Preserve its separate risk record and reader/configuration gates.
No Supabase policies, credentials or runtime environment values were changed.
