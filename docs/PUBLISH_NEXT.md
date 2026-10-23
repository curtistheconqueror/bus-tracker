# Publish next

**STATUS: 192 PENDING.**

Application release 192 is the approved PR40 scope: device-local Incidents and
Shop Talk, wrapping navigation, and grouped HVAC heating repairs with the
No Heat Buses filter, preserved repair estimates and operator aliases.

Code checkpoint: `cc495d5a3f4fd0f6eacde35d4e2b58527a8792a3` (PR40 merge).
Reviewed head: `0ba8e5c7d27677c1998303f9f45be73f6b2e426e`.
The merge tree is identical to that head. CI run 39878988795 passed lint,
build and 388 tests on merge candidate 54046eea9d74ed72c43ed2df74c080c3c9e4cd8f.
Fresh local lint/build and 388 tests passed on the identical head; no failures
or skips. Freeze the exact publication commit including this release record.

Curtis approved making this reviewed behavior live on 2026-10-23. CodeRabbit
completed review; its badge requirement was retracted and anonymization is an
owner choice. No optional badge or anonymization change is bundled.

New keys: `pace-incidents-v1` and `pace-shop-talk-v1`. Both stay on the device,
do not sync, and are excluded from MASTER EXPORT/IMPORT. Device loss can lose
these records. A/C Buses also includes heating repairs in the HVAC category.
Those disclosed behaviors are retained under the publication approval.
No Supabase migration, credential, policy or runtime setting change is part
of this release. PR39 MCP is unmerged and excluded; its reader/configuration
gates remain separate. Do not publish its branch or overwrite its risk record.

Post-publication: verify all eight routes, exact assets, service-worker v7,
the two new surface bundles, HVAC estimate/alias/filter regressions and existing
UI navigation. Fresh browser interaction, device-local persistence/failure
flows, phone/iPad layout, Safari/Home Screen and offline-device checks must be
reported separately from HTTP/asset and automated test evidence.

Rollback: application 191 / Sites 187, source
`b33775685b61acafdf4325807c82e92281c9fc2c` (`sites-v187`).
