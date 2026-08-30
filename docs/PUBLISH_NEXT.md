# Publish next

**STATUS: NONE PENDING**

Sites Version 125 was published from commit 135a49a on 2026-08-30. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: 135a49a
- Last code-bearing commit: 8b7bfe3
- Current live release: Sites Version 125 at 135a49a

## What changed

- Bus Controls now names both curbside mirror switches precisely: Mirror heater switch - C/S and Mirror adjuster switch - C/S.
- Earlier mirror-switch wording reads as the new wording without rewriting stored records.
- On phones, DS badges and roadcall dots remain fully visible inside bus markers.
- Tight garage markers reserve room for their badge, and pit, brake, and foreman markers remain centered inside their spaces.

## Migration and data safety

No LocalStorage key or stored record changed. The phone layout change is stylesheet-only; catalog normalization preserves earlier mirror-switch records.

## Validation

- Production build passed
- All 133 regression tests passed
- ESLint passed
- git diff --check passed

## Live verification

Sites Version 125 deployed successfully to the existing live site on 2026-08-30.
