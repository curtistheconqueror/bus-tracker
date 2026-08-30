# Publish next

**STATUS: NONE PENDING**

Sites Version 124 was published from commit 39a7275 on 2026-08-29. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: 39a7275
- Last code-bearing commit: 38186c2
- Current live release: Sites Version 124 at 39a7275

## What changed

- Every export now uses the device share sheet with a real file, avoiding temporary blob links that fail on another device.
- FIXED TODAY remains in the Defect Log summary grid instead of floating across iPad and computer screens.
- The Facility Map command bar places Down Sheet, Defect Log, Fixed Repairs, and Fleet Campaigns inside one PAGES menu that stays on screen with four 44px rows.

## Migration and data safety

No LocalStorage key, stored record, file format, or payload changed. Version 123 and Version 124 transfer files remain mutually compatible.

## Validation

- Production build passed
- All 131 regression tests passed
- ESLint passed
- git diff --check passed

## Live verification

Sites Version 124 deployed successfully to the existing live site on 2026-08-29.
