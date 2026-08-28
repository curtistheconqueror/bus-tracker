# Publish next

**STATUS: PENDING — Sites Version 116 is validated and awaiting publication approval.**

## Source

- Branch: `main`
- Release source: the current tip of `main`
- Previous live release: Sites Version 115 at `d0189f9`

## What changed

### Fleet Campaigns are now included in the full backup

`EXPORT / SHARE BACKUP` previously captured buses, settings, the Down Sheet, and learned parts but omitted `pace-bus-lists-v1` and `pace-bus-list-templates-v1`. Version 116 adds every Fleet Campaign, completed row, initials, timestamp, and billable hour to the full backup so Work Time history is not lost with the lists.

Import restores both campaign keys through the same normalizers used by Fleet Campaigns. Importing an older backup that predates a key leaves the device's existing campaigns in place instead of clearing them.

### Learned causes, remembered under the symptom where they were found

A cause typed into WHAT WAS FOUND is learned under that exact defect issue and offered nowhere else. Diagnose a check-engine light as a throttle-pedal reference-circuit fault, and the next check-engine diagnosis offers it as a chip; a brake defect does not.

- Matching ignores case, spacing, and trailing punctuation.
- The first recorded wording is retained.
- Defect Log and Fixed Repairs both learn and offer causes.
- Each chip can fill the field or be forgotten.
- New storage key `pace-findings-memory-v1`, capped at 600 least-recently-used entries.

Backup payload version 3 becomes version 5: campaigns, campaign templates, and learned causes. Older payloads stay readable.

### Parking-brake knob and rear air valves (added by Claude Code)

Bus Controls → Operating Controls gains four separate yellow parking-brake-knob failures beside the existing red-air-valve choice. Air System gains the treadle valve, R-12 relay valve (C/S rear), and R-14 relay valve (R/S rear). Brakes keeps its separate Parking brake entry for the brake itself.

### Interior body, seating, grab hardware, and stop-request pull cords (added by Codex)

Curtis identified these directly from field photos. Bodywork now has separate curbside and roadside choices for an interior advertising panel / ad card rack that is loose or hanging. It also adds passenger seats that are loose, missing, or damaged; a loose or broken passenger assist handle / hanging strap; and a loose or damaged passenger grab rail / stanchion.

Doors, Ramp and ADA → Stop Request now distinguishes a broken stop-request pull cord / line on the curbside from one on the roadside. Existing chime/tone and general stop-request choices remain unchanged.

## Migration and data safety

No LocalStorage key is renamed and normal application storage is not rewritten. Backup export/import expands backward-compatibly to payload version 5, while all repair choices are additive catalog entries. Existing version 3 backups and all stored repair records remain readable.

## Validation

- Production build passed
- All 114 regression tests passed
- ESLint passed
- `git diff --check` passed

## After it is live

1. Export a full backup and confirm version 5 contains `busLists`, `busListTemplates`, and `findingsMemory`.
2. Verify an import round trip restores a campaign with its initials and hours.
3. Save a cause under one check-engine diagnosis and confirm it appears as a chip on another check-engine diagnosis.
4. Open a brake defect and confirm the learned check-engine cause does not appear.
5. Confirm the Engine quick-select list remains unchanged.
6. Under Bus Controls, confirm four Parking brake knob choices follow Red air valve hard to turn.
7. Under Air System, confirm the treadle valve plus R-12 C/S and R-14 R/S relay valves.
8. Under Bodywork, confirm advertising-panel choices for C/S and R/S plus the passenger-seat and grab-hardware choices.
9. Under Doors, Ramp and ADA → Stop Request, confirm broken pull-cord / line choices for curbside and roadside.

Claude browser-verified the learned-cause, parking-brake-knob, and air-valve flows before pushing them. The field-photo additions are covered by the shared catalog regression tests and remain for live verification after publication.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` and publish only after Curtis explicitly approves the release, including the shorthand **publishing approved**.
