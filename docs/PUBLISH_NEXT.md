# Publish next

**STATUS: PENDING**

Publish the combined Version 127 source to the existing Pace South Bus Tracker Site. Curtis has explicitly approved this release. Do not create a new Site, repository, or URL.

## Source

- Branch: main
- Code-bearing source commit: `29cecc8f9242a82f0b4a9df7175ebeac9d612393`
- Last published source: `8e68f698460726042b32fd412aabf9bf31f6bb2d` (Sites Version 126)
- Existing live Site: `https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site`

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

## Live checks

1. Confirm the existing app opens normally before Shop Cloud is configured.
2. In Settings, confirm `CONNECT TO SHOP CLOUD` is visible and the existing board is not gated by sign-in.
3. On a phone, drag a bus onto a collapsed Facility Map title strip; confirm the strip highlights and the bus lands in the first open space.
4. In Defect Log -> Mystery Buses, tap `MOVE / LOCATION`, select a section, and confirm the bus moves while its defect count and Down Sheet badge remain unchanged.
5. Confirm the live Site remains the existing Pace South URL.
