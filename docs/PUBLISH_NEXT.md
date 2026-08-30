# Publish next

**STATUS: NONE PENDING**

Sites Version 127 was published from commit `831b7533819c426b93c137dfd93e312f1e8ab07f` on 2026-08-30. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: `831b7533819c426b93c137dfd93e312f1e8ab07f`
- Last code-bearing commit: `29cecc8f9242a82f0b4a9df7175ebeac9d612393`
- Current live release: Sites Version 127 at `831b753`

## What changed

- Adds the offline-first Shop Cloud client for shared Facility Map, Defect Log, and Down Sheet data. The app still opens and works from this device's LocalStorage without a connection or sign-in gate; failed writes remain eligible for retry.
- Shop Cloud connection details, shared shop sign-in, device label, and operator initials are configured from Settings. Credentials are not committed to the repository.
- Pulls reuse the existing map, defect, and Down Sheet merge rules, including the bulk-loss guard and the rule that map movement does not erase defects or Down Sheet membership.
- A bus can now be dropped directly on a Facility Map section title strip while that section is expanded or collapsed. The first open space is used, occupied buses are never displaced, and a full section refuses the move.
- Mystery Bus cards in the Defect Log now have a separate `MOVE / LOCATION` control. It offers the same facility sections, shows available-space counts, and moves the bus without changing its defects or Down Sheet membership.

## Migration and data safety

- No existing LocalStorage key was renamed or removed.
- Shop Cloud adds optional per-device keys: `pace-cloud-config-v1`, `pace-cloud-state-v1`, `pace-cloud-sent-v1`, and Supabase session storage `pace-cloud-auth-v1`.
- The Supabase package is loaded only for connected devices. The board remains locally authoritative and usable while disconnected.
- Facility relocation changes only location plus the existing smart-status and operational timestamps. Defects and Down Sheet flags are preserved.

## Validation

- Production build passed
- All 141 regression tests passed
- ESLint passed
- `git diff --check` passed
- Fresh local server returned HTTP 200 for both `/` and `/defect-log`

## Live verification

Sites Version 127 deployed successfully to the existing live site on 2026-08-30.
