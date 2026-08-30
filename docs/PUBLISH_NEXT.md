# Publish next

**STATUS: PENDING**

Version 126 is approved for the existing public Fleet Tracker site. Publish the validated Defect Log visual-hierarchy update through the existing `.openai/hosting.json` binding only.

## Source

- Branch: main
- Validated feature commit: 19da041e1e0308f81338cd5ba2947f30a4884016
- Last published source: 135a49a
- Current live release: Sites Version 125 at 135a49a

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

- On a phone, expand two adjacent buses and confirm each complete bus group has a clear end before the next bus begins.
- On an iPad, confirm the same hierarchy without changing the tablet layout.
- In Defect Log Settings, switch Bus Group Separation between Strong and Standard and confirm only presentation changes.
