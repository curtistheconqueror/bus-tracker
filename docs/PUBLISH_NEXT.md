# Publish next

**STATUS: NONE PENDING**

Sites Version 121 was published from commit 8ce3e5b on 2026-08-29. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: 8ce3e5b
- Last code-bearing commit: e4a6b8c
- Current live release: Sites Version 121 at 8ce3e5b

## What changed

The vague **Air bag** choice under **Suspension and Steering** was retired from new entries and replaced with **Front air bag leak** and **Rear air bag leak**.

## Migration and data safety

No LocalStorage keys or stored records changed. Existing defects already saved as **Air bag** retain that exact wording and remain readable and editable through the historical-option fallback.

## Validation

- Production build passed
- All 121 regression tests passed
- ESLint passed
- git diff --check passed

## Live verification

Sites Version 121 deployed successfully to the existing live site on 2026-08-29.
