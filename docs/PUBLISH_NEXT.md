# Publish next

**STATUS: PENDING — Sites Version 116 is validated and awaiting publication approval.**

## Source

- Branch: `main`
- Release source: `51d7b2f` (code-bearing commit `9116cab`)
- Previous live release: Sites Version 115 at `d0189f9`

## What changed

### Fleet Campaigns are now included in the full backup

`EXPORT / SHARE BACKUP` previously captured the buses, settings, Down Sheet, and learned parts but omitted `pace-bus-lists-v1` and `pace-bus-list-templates-v1`. Version 116 adds every Fleet Campaign, completed row, initials, timestamps, and billable hours to the full backup so Work Time history is not lost with the lists.

Backup payload version 3 becomes version 4. Import restores both campaign keys through the same normalizers used by Fleet Campaigns. Importing an older version 3 backup leaves the device's existing campaigns in place instead of clearing them.

## Migration and data safety

No LocalStorage key is renamed and normal application storage is not rewritten. The change only expands full-board export/import. Existing version 3 backups remain readable.

## Validation

- Production build passed
- All 112 regression tests passed
- ESLint passed
- `git diff --check` passed

## After it is live

1. In Administrative Settings, export a full backup.
2. Confirm the file uses backup version 4 and contains `busLists` and `busListTemplates`.
3. Verify an import round trip restores a campaign with its initials and hours.

Follow `docs/SITES_PUBLISHING_RUNBOOK.md` and publish only after Curtis explicitly approves the release, including the shorthand **publishing approved**.
