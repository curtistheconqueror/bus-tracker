# Publish next

**STATUS: NONE PENDING**

Sites Version 123 was published from commit f154686 on 2026-08-29. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: f154686
- Last code-bearing commit: 0dcb9cd
- Current live release: Sites Version 123 at f154686

## What changed

- Defect Log, Down Sheet, and Fleet Map sections can transfer independently between devices and merge without replacing unrelated data.
- Transfer order no longer changes Down Sheet badges, and the Down Sheet remains authoritative for them.
- Whole-board controls now read EXPORT ALL DATA and IMPORT ALL DATA; non-restorable exports are labeled as reports.
- The backup reminder is one card with a settable cadence.
- On phones, SERVICE DETAIL AREA remains visible with IN SERVICE / ON ROAD below it.

## Migration and data safety

No LocalStorage key or existing stored record changed. The optional backup cadence defaults to the prior 20-defect interval. Section imports merge rather than truncate.

## Validation

- Production build passed
- All 128 regression tests passed
- ESLint passed
- git diff --check passed

## Live verification

Sites Version 123 deployed successfully to the existing live site on 2026-08-29.
