# Publish next

**STATUS: NONE PENDING**

Sites Version 126 was published from commit 8e68f698460726042b32fd412aabf9bf31f6bb2d on 2026-08-30. Replace this file with the next complete pending-release handoff in the same push as the next contribution to main.

## Source

- Branch: main
- Last published source: 8e68f698460726042b32fd412aabf9bf31f6bb2d
- Last code-bearing commit: 19da041e1e0308f81338cd5ba2947f30a4884016
- Current live release: Sites Version 126 at 8e68f69

## What changed

- Defect Log bus groups now have stronger outer borders, larger gaps, and a subtle shadow so one bus is visibly separate from the next.
- Expanded buses receive a distinct header and container shade; individual defects remain lighter nested cards inside that bus.
- The treatment applies across desktop, iPad, and phone, with a compact phone adjustment below 760px.
- Defect Log Settings now offers Bus Group Separation: Strong (recommended) or Standard, making the change immediately reversible on each device.

## Migration and data safety

No LocalStorage key or fleet record changed. The existing `pace-defect-log-settings-v1` payload gains one optional display preference. Older settings without it load as Strong; selecting Standard restores the previous spacing and border treatment. Filters, badges, repair records, bus status, and Down Sheet membership are untouched.

## Validation

- Production build passed
- All 133 regression tests passed
- ESLint passed
- git diff --check passed

## Live verification

Sites Version 126 deployed successfully to the existing live site on 2026-08-30.
