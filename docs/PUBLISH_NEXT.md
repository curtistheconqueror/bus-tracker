# Publish next

**STATUS: PENDING — Sites Version 116 is validated and awaiting publication approval.**

## Source

- Branch: `main`
- Release source: the current tip of `main`
- Previous live release: Sites Version 115 at `d0189f9`

## What changed

### Fleet Campaigns are now included in the full backup

`EXPORT / SHARE BACKUP` previously captured the buses, settings, Down Sheet, and learned parts but omitted `pace-bus-lists-v1` and `pace-bus-list-templates-v1`. Version 116 adds every Fleet Campaign, completed row, initials, timestamps, and billable hours to the full backup so Work Time history is not lost with the lists.

Import restores both campaign keys through the same normalizers used by Fleet Campaigns. Importing an older backup that predates a key leaves the device's existing campaigns in place instead of clearing them.

### Learned causes, remembered under the symptom they were found beneath

The picker can only ever list symptoms. A check-engine light is one entry, but the things behind it are endless and specific — a throttle pedal reference circuit, a chafed pin, an EGR differential pressure sensor. Putting those in the catalog would bury the twelve engine choices a mechanic actually picks from under a hundred causes that each apply to one bus on one day.

So a cause typed into WHAT WAS FOUND is learned where it was found and offered nowhere else. Diagnose a check-engine light as a throttle pedal reference circuit, and the next person who picks Check-engine diagnosis is offered it as a chip under that field; somebody picking Brake light on never sees it. **The repair catalog itself does not grow at all.**

- Matching ignores case, spacing and trailing punctuation, so one fault is not written five ways. The wording recorded first is the wording kept.
- Learned on any save carrying a finding, not only one marked Diagnosed, and Fixed Repairs learns and offers them too.
- Each chip can be tapped to fill the field, or forgotten with its ×.
- New storage key `pace-findings-memory-v1`, capped at 600 entries, least recently used first.

Backup payload version 3 becomes version 5: campaigns, campaign templates and learned causes. Older payloads stay readable.

### Parking brake knob and the rear air valves

**Bus Controls → Operating Controls** gains the yellow diamond knob that was not in the catalog at all, placed directly beside *Red air valve hard to turn* because that is where the two sit on the dash:

- Parking brake knob will not pull up (apply)
- Parking brake knob will not push down (release)
- Parking brake knob hard to pull or push
- Parking brake knob pops out while driving

Brakes keeps its separate *Parking brake* entry for the brake itself; the knob is the dash control.

**Air System** gains three every bus has, named by the side they are on the way the catalog already writes C/S and R/S:

- Treadle valve (brake pedal)
- R-12 relay valve (C/S rear)
- R-14 relay valve (R/S rear)

Additive catalog entries only. Nothing stored is renamed or rewritten.

## Migration and data safety

No LocalStorage key is renamed and normal application storage is not rewritten. The change only expands full-board export/import. Existing version 3 backups remain readable.

## Validation

- Production build passed
- All 114 regression tests passed
- ESLint passed
- `git diff --check` passed

## After it is live

1. In Administrative Settings, export a full backup.
2. Confirm the file uses backup version 4 and contains `busLists` and `busListTemplates`.
3. Verify an import round trip restores a campaign with its initials and hours.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` and publish only after Curtis explicitly approves the release, including the shorthand **publishing approved**.

### Checks added by the learned catalog

1. In the Defect Log, diagnose a check-engine light on one bus: type a cause into **WHAT WAS FOUND** and save.
2. Open a *different* bus's check-engine light. The cause should appear as a chip under that field, labelled FOUND BEFORE ON CHECK-ENGINE DIAGNOSIS. Tapping it fills the field.
3. Open a brake defect and confirm no chips appear — causes never leak to a symptom they were not found under.
4. Confirm the Engine quick-select list is unchanged and does not contain the cause.
5. Export a backup and confirm `"version": 5` with a `findingsMemory` key.
6. Under **Bus Controls**, confirm *Parking brake knob* appears four times in Operating Controls, immediately after *Red air valve hard to turn*.
7. Under **Air System**, confirm *Treadle valve (brake pedal)*, *R-12 relay valve (C/S rear)* and *R-14 relay valve (R/S rear)*. All six were confirmed present in the real picker before the change was pushed.

This loop was verified in a browser before the change was pushed, including the count reaching ×2 and the picker still listing its original fourteen engine choices.
