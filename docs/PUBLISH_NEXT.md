# Publish next

**STATUS: PENDING**

Curtis approved automatic validation and live publication for this small, clearly scoped catalog correction.

## Source

- Branch: main
- Source commit: e4a6b8c79f9ac4eaa0fcca8abb1bc93f35f3c048
- Intended release: Sites Version 121
- Current live release: Sites Version 120

## What changed

The vague **Air bag** choice under **Suspension and Steering** was retired from new entries and replaced with two clear choices:

- **Front air bag leak**
- **Rear air bag leak**

## Migration and data safety

No LocalStorage keys or stored records are changed. Existing defects already saved as **Air bag** retain that exact wording and remain readable and editable through the established historical-option fallback.

## Validation

- Production build passed
- All 121 regression tests passed
- ESLint passed
- git diff --check passed

## After it is live

1. Open the Defect Log and start a new defect.
2. Choose **Suspension and Steering**.
3. Confirm **Front air bag leak** and **Rear air bag leak** are available.
4. Confirm the vague **Air bag** choice is not offered for new entries.