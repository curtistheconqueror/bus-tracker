# Publish next

**STATUS: PENDING — Sites Version 115 is validated and awaiting publication approval.**

## Source

- Branch: `main`
- Release source: `d0189f9` (includes `2836020`)
- Previous live release: Sites Version 114 at `cc662ac`

## What changed

Bus Controls now leads with a new phone-friendly **Door, Ramp and Kneeler Failures** group for frequent whole-system failures that are distinct from operator switches:

- Front door will not open
- Front door will not close
- Front door opens / closes slowly
- Rear door will not open
- Rear door will not close
- Rear door opens / closes slowly
- Ramp not working
- Ramp no power
- Kneeler not functioning correctly
- Kneeler sits too high

The new first group displays as **♿ ⚙️ Door, Ramp and Kneeler Failures**, making the mechanical-system path visually distinct. The existing System Switches group remains unchanged, so a mechanic can still distinguish a failed kneeler button, ramp switch, or door switch from a failed mechanism. The established Doors, Ramp and ADA category also remains intact for its full equipment workflow.

Miscellaneous also gains **Missing road hazard triangles (3 required)** and **🧯 Fire extinguisher missing**. Their visual markers do not alter the plain stored defect identities.

## Migration and data safety

No storage migration and no LocalStorage key change. These are additive repair-catalog and display-label updates only. Existing defects, parts associations, filters, locations, Down Sheet records, and user data are not rewritten.

## Validation

- Production build passed
- All 112 regression tests passed
- ESLint passed
- `git diff --check` passed

## After it is live

1. Open the Defect Log and choose Bus Controls.
2. Confirm **♿ ⚙️ Door, Ramp and Kneeler Failures** is the first group.
3. Confirm all ten whole-system failure choices appear.
4. Confirm **System Switches** still separately contains the kneeler, ramp, and front/rear door switch choices.
5. Under Miscellaneous, confirm the three-triangle and missing-fire-extinguisher choices appear, with the extinguisher emoji shown only in the picker.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` and publish only after Curtis explicitly approves the release, including the shorthand **publishing approved**.
