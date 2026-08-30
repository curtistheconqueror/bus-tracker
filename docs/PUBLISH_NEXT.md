# Publish next

**STATUS: NONE PENDING**

Sites Version 122 was published from commit cd6b649 on 2026-08-29. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: cd6b649
- Last code-bearing commit: 6a26ef8
- Current live release: Sites Version 122 at cd6b649

## What changed

- A/C and HVAC gained Operator A/C blower.
- Bus Controls gained Mirror heater switch and C/S adjuster switch.
- Confirmed air-bag leaks now have one counted home under Air System.
- C/S and R/S leaning symptoms remain under Suspension and Steering with diagnosis guidance that avoids duplicate defects.

## Migration and data safety

No LocalStorage key or stored record changed. Retired Suspension and Steering air-bag choices remain readable and editable on historical records.

## Validation

- Production build passed
- All 122 regression tests passed
- ESLint passed
- git diff --check passed

## Live verification

Sites Version 122 deployed successfully to the existing live site on 2026-08-29.
