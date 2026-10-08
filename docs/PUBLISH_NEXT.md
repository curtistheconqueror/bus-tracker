# Publish next

**STATUS: 182, 183, 184 AND 185 PENDING. Curtis has asked for this to go live.**
182: the Defect Log's two pickers say what they are, and their drop-down arrow
works. 183: the repository is laid out by what each file is; nothing on screen
changes. 184: three Defect Log lists can be narrowed to the shift somebody is
standing in, and shared that way. 185: the Defect Log shows how many hours are
standing on it, the shop can set its own repair times, PATH TO REPAIR arrives,
and typed line breaks stop being flattened.

| Version | Publish from | What | Section |
| --- | --- | --- | --- |
| 182 | `807357a` | Picker labels and a working drop-down arrow | [182](#182--publish-from-807357a) |
| 183 | `6dc96fe` | Repository layout only, no UI or flow change | [183](#183--publish-from-6dc96fe) |
| 184 | `c296486` | A THIS SHIFT window, and a new LOGGED list keyed off initials | [184](#184--publish-from-c296486) |
| 185 | `b9c1e81` | Hours badge, shop repair times, PATH TO REPAIR, readable descriptions | [185](#185--publish-from-b9c1e81) |

**182** publishes from `807357a` (`The drop-down arrow is a button now, because it never
was one`). Derive the range with:

```
git log --oneline 5d5a033..807357a
```

Version 181 was published from `148a45e` on 2026-09-15 and is the rollback
point; its tag is `sites-v181`. The one before it is 180 from `b6e0cba`.

Four releases are pending, and they STACK. **Publish in order: 182, 183, 184,
then 185.** Each is built on the one before it — 183's range starts at
`807357a`, 184's at `6dc96fe`, 185's at `c296486` — so publishing a later one
alone also ships everything beneath it.

**If Curtis wants one Sites version rather than four, publish 185 from
`b9c1e81`: it carries all four.** He asked for this to go live on 2026-10-08.
Walk all four checklists below afterwards, because each lists different things
to look at on the phone.

# 182 — publish from 807357a

## Source

```
$ git log --oneline 5d5a033..807357a
807357a The drop-down arrow is a button now, because it never was one
18bc31a Ignore the dev server log the verification recipe creates
c1eb8fd The two pickers say what they are, for somebody who has never seen them
0032c09 A session that costs $320 a day was re-reading, not thinking

$ git diff --name-only 5d5a033..807357a -- app tests
app/combo-field.css
app/combo-field.tsx
app/defect-log/defect-log.css
app/defect-log/page.tsx
tests/rendered-html.test.mjs

$ git diff --shortstat 5d5a033..807357a
 7 files changed, 295 insertions(+), 92 deletions(-)

$ git diff --name-only 5d5a033..807357a -- supabase package.json package-lock.json .github public worker
(nothing)
```

The other two files are `.gitignore` and `docs/NEXT_SESSION.md`. Neither ships.

## Migrations

**None.** No LocalStorage key added, renamed or read. No Supabase schema change.
Nothing on a device is rewritten, so 182 reads every existing board, sheet and
defect exactly as 181 does.

## What was wrong

**The two pickers on ADD DEFECT were labelled for the person who built them.**
They read `CATEGORY` and `DEFECT`, in 8px grey. Curtis, on a mechanic opening
the form for the first time: *"So this is easy to see and understand for new
comers."*

**The drop-down arrow was not a control.** It was decoration — a `<span>` with
`pointer-events:none` — drawn to look exactly like a button. That would be
cosmetic if the list had another way in, and it did not: the list opened on the
input's focus event and nothing else, and tapping a field that already has focus
fires no second focus event. So any state that left the field focused with the
list shut was a dead end.

> Curtis: "now I can press the input field more than once and it won't bring up
> the list… if I accidentally pressed the field twice for input then it's hard to
> get the list to regenerate."

**The shared picker had no stylesheet of its own.** Its styling lived in the
Defect Log's stylesheet, and the Down Sheet's ADD DOWN BUS editor draws the same
component without loading that file. A decorative span drawing unstyled is
untidy; a real `<button>` drawing unstyled is a grey box in the middle of a row.

## What changed

1. **`DEFECT CATEGORY`** and **`SPECIFIC DEFECT OR SYMPTOM`**, both 30% larger
   (8px → 10.4px) and in the theme's text colour instead of its muted one. Not
   hard-coded black: the Defect Log follows the picked theme, and a black label
   disappears the moment somebody chooses a dark one. A test forbids `#000`
   there.
2. **The arrow is a real button**, at the right-hand end of each field. It
   toggles — one control both directions — and flips 180° while the list is up.
   **44×44px at 760px and under**, 36×38 wider. It is a touch target rather than a tab
   stop; the keyboard still opens the list with ArrowDown.
3. The × that clears a field **moved out from under the arrow**, and the input's
   padding grew to clear both.
4. **The picker carries its own stylesheet** (`app/combo-field.css`), so it
   draws correctly on the Down Sheet too.

**UI change, flagged:** the Down Sheet's own CATEGORY / SPECIFIC REPAIR picker
now draws styled where it previously drew with no picker CSS at all. Nothing
moved and nothing was renamed there — it is the same control, finally wearing
the same clothes as the Defect Log's.

## Verified

Gates re-run on `807357a` itself, not carried over from the branch:

- **332 tests pass**, 0 fail
- `npm run lint` clean
- `npm run build` complete

Six new assertions across the labels and the arrow. **Six mutations fail them**:
putting the label size back to 8px, hard-coding `#000`, restoring
`pointer-events:none`, widening the × until it overlaps the arrow, dropping the
phone arrow below 44px, and removing the component's stylesheet import.

Two tests had deliberately pinned the old label strings. Both were re-pinned to
the new strings rather than loosened.

Driven in Chromium at 360, 390, 430 and 820px:

| Check | Result |
| --- | --- |
| The reported dead end | Reproduced first: focus → Escape → tap again → still shut, at all four widths |
| The arrow | Opens the list at all four widths, and toggles it shut again |
| Arrow and × at rest | Gap **0.00px**, each owning its own centre by `elementFromPoint` |
| Defect Log geometry, before and after the stylesheet split | Identical fingerprint — both arrows, both inputs, the open list, an option row, a section heading — compared byte for byte |

An earlier probe reported a 9px overlap between the arrow and the ×. It was
wrong: it measured mid-rotation, and a turning box's bounding rectangle swells
while it turns. At rest the gap is zero.

## What to check once it is live

1. Open **ADD DEFECT** on a phone. The two labels should read **DEFECT
   CATEGORY** and **SPECIFIC DEFECT OR SYMPTOM**, noticeably bigger and darker
   than **BUS LIST** above them.
2. Tap the **DEFECT CATEGORY** field. The list opens.
3. Tap it a second time, then a third. Press the **arrow** at the right of the
   field — the list should come back every time. This is the fix; if the arrow
   ever fails to open it, that is the one to report.
4. With the list up, the arrow should be pointing the other way. Press it again
   to close.
5. Same four steps on **SPECIFIC DEFECT OR SYMPTOM**.
6. Type a few letters, then press the **×**. It should clear the field without
   catching the arrow beside it.
7. Open the Down Sheet's **ADD DOWN BUS** editor. Its CATEGORY / SPECIFIC REPAIR
   picker should look like the Defect Log's — same arrow, same ×, nothing grey
   or boxy.
8. Switch themes in Settings and reopen ADD DEFECT. Both labels should still be
   readable.

## Rollback

Roll back to `sites-v181` (`148a45e`). Nothing is stored differently, so no
defect, entry or recommendation logged under 182 is lost or altered — the labels
go back to `CATEGORY` / `DEFECT` and the arrow goes back to being decoration.

---

# 183 — publish from 6dc96fe

Publish from `6dc96fe` (`Write down the layout, and add the repository files a
public repo needs`), the head of `main` after PR #29 merged. Previous: 182 from
`807357a`. Derive the range with:

```
git log --oneline 807357a..6dc96fe
```

Rollback point: 182 once it is live (`807357a`), otherwise `sites-v181`
(`148a45e`).

## Source

```
$ git log --oneline 807357a..6dc96fe
6dc96fe Write down the layout, and add the repository files a public repo needs
28a8c32 Split the suite into one file per area, and run all of them
735f476 Put each route's own components under app/<route>/_components
8bece98 Move the components more than one route draws into src/components
1857a90 Move the last four domain areas into src/lib
2656d60 Move the Down Sheet domain into src/lib/down-sheet
d1b7023 Move the defect catalog and Defect Log domain into src/lib/defects
83e403c Move the fleet and facility modules into src/lib/fleet
8beda86 Move the Shop Cloud modules into src/lib/cloud
fd79a00 Move the storage modules out of app/ into src/lib/storage
55c9e7f Hand 182 to Codex from 807357a

$ git diff --name-status -M 807357a..6dc96fe -- app src tests
R100	app/crash-guard.tsx	app/_components/crash-guard.tsx
R095	app/down-sheet-badge-menu.tsx	app/_components/down-sheet-badge-menu.tsx
R099	app/operator-modal.tsx	app/_components/operator-modal.tsx
R100	app/page-menu.tsx	app/_components/page-menu.tsx
M	app/api/down-sheet-scan/route.ts
M	app/api/sweep-scan/route.ts
R091	app/defect-log/offline-backup-reminder.tsx	app/defect-log/_components/offline-backup-reminder.tsx
R097	app/defect-log/scan-batches-panel.tsx	app/defect-log/_components/scan-batches-panel.tsx
R098	app/defect-log/sweep-scanner.tsx	app/defect-log/_components/sweep-scanner.tsx
M	app/defect-log/page.tsx
R093	app/deferred-board.tsx	app/down-sheet/_components/deferred-board.tsx
R097	app/down-sheet/down-sheet-editor.tsx	app/down-sheet/_components/down-sheet-editor.tsx
R095	app/down-sheet/down-sheet-scanner.tsx	app/down-sheet/_components/down-sheet-scanner.tsx
R092	app/recommended-board.tsx	app/down-sheet/_components/recommended-board.tsx
R092	app/down-sheet/sheet-section-board.tsx	app/down-sheet/_components/sheet-section-board.tsx
M	app/down-sheet/page.tsx
M	app/fixed-repairs/page.tsx
M	app/layout.tsx
R096	app/work-time-panel.tsx	app/lists/_components/work-time-panel.tsx
R100	app/work-time.css	app/lists/_components/work-time.css
M	app/lists/page.tsx
M	app/page.tsx
R098	app/cloud-sync-control.tsx	app/settings/_components/cloud-sync-control.tsx
R097	app/defect-log/defect-log-settings-modal.tsx	app/settings/_components/defect-log-settings-modal.tsx
R096	app/down-sheet/down-sheet-settings.tsx	app/settings/_components/down-sheet-settings.tsx
R098	app/fleet-recovery-control.tsx	app/settings/_components/fleet-recovery-control.tsx
R097	app/map-settings-panel.tsx	app/settings/_components/map-settings-panel.tsx
R096	app/settings/sheet-backfill.tsx	app/settings/_components/sheet-backfill.tsx
R098	app/settings/shift-settings.tsx	app/settings/_components/shift-settings.tsx
M	app/settings/page.tsx
R097	app/quick-filter-menu.tsx	src/components/defects/quick-filter-menu.tsx
R096	app/mystery-board.tsx	src/components/down-sheet/mystery-board.tsx
R094	app/hold-board.tsx	src/components/fleet/hold-board.tsx
R088	app/status-icon.tsx	src/components/fleet/status-icon.tsx
R097	app/status-report-modal.tsx	src/components/reports/status-report-modal.tsx
R098	app/fixed-repairs/fixed-repairs-settings.tsx	src/components/settings/fixed-repairs-settings.tsx
R095	app/section-transfer-controls.tsx	src/components/settings/section-transfer-controls.tsx
R100	app/settings/settings-drawer.tsx	src/components/settings/settings-drawer.tsx
R100	app/app-name.tsx	src/components/shared/app-name.tsx
R100	app/bus-selector.css	src/components/shared/bus-selector.css
R098	app/bus-selector.tsx	src/components/shared/bus-selector.tsx
R100	app/combo-field.css	src/components/shared/combo-field.css
R100	app/combo-field.tsx	src/components/shared/combo-field.tsx
R095	app/deferred-watch.tsx	src/components/shared/deferred-watch.tsx
R097	app/hours-field.tsx	src/components/shared/hours-field.tsx
R100	app/refresh-button.tsx	src/components/shared/refresh-button.tsx
R098	app/save-alert.tsx	src/components/shared/save-alert.tsx
R096	app/shop-cloud-live.tsx	src/components/shared/shop-cloud-live.tsx
R097	app/time-window-chips.tsx	src/components/shared/time-window-chips.tsx
R091	app/tracker-nav.tsx	src/components/shared/tracker-nav.tsx
R098	app/welcome-gate.tsx	src/components/shared/welcome-gate.tsx
R100	app/chatgpt-auth.ts	src/lib/cloud/chatgpt-auth.ts
R100	app/cloud-client.ts	src/lib/cloud/cloud-client.ts
R098	app/cloud-live.ts	src/lib/cloud/cloud-live.ts
R099	app/cloud-sync.ts	src/lib/cloud/cloud-sync.ts
R091	app/bulk-defects.ts	src/lib/defects/bulk-defects.ts
R100	app/defect-identity.ts	src/lib/defects/defect-identity.ts
R100	app/defect-log/defect-log-display-settings.ts	src/lib/defects/defect-log-display-settings.ts
R099	app/defect-log/defect-log-settings.ts	src/lib/defects/defect-log-settings.ts
R098	app/defect-log/defect-log-sync.ts	src/lib/defects/defect-log-sync.ts
R100	app/defect-search.ts	src/lib/defects/defect-search.ts
R100	app/deferral-clock.ts	src/lib/defects/deferral-clock.ts
R097	app/deferred-actions.ts	src/lib/defects/deferred-actions.ts
R099	app/deferred-counts.ts	src/lib/defects/deferred-counts.ts
R099	app/duplicate-defects.ts	src/lib/defects/duplicate-defects.ts
R100	app/findings-memory.ts	src/lib/defects/findings-memory.ts
R100	app/parts-memory.ts	src/lib/defects/parts-memory.ts
R096	app/defect-log/quick-filter-share.ts	src/lib/defects/quick-filter-share.ts
R098	app/quick-filters.ts	src/lib/defects/quick-filters.ts
R098	app/recommended-actions.ts	src/lib/defects/recommended-actions.ts
R098	app/recommended-counts.ts	src/lib/defects/recommended-counts.ts
R100	app/repair-catalog.ts	src/lib/defects/repair-catalog.ts
R099	app/defect-log/scan-batches.ts	src/lib/defects/scan-batches.ts
R100	app/scan-notes.ts	src/lib/defects/scan-notes.ts
R100	app/scan-photo.ts	src/lib/defects/scan-photo.ts
R099	app/defect-log/sweep-scan-import.ts	src/lib/defects/sweep-scan-import.ts
R100	app/down-sheet/down-sheet-availability.ts	src/lib/down-sheet/down-sheet-availability.ts
R100	app/down-sheet-badge-view.ts	src/lib/down-sheet/down-sheet-badge-view.ts
R100	app/down-sheet/down-sheet-clear.ts	src/lib/down-sheet/down-sheet-clear.ts
R100	app/down-sheet-counter.ts	src/lib/down-sheet/down-sheet-counter.ts
R100	app/down-sheet/down-sheet-display-settings.ts	src/lib/down-sheet/down-sheet-display-settings.ts
R100	app/down-sheet/down-sheet-filters.ts	src/lib/down-sheet/down-sheet-filters.ts
R099	app/down-sheet/down-sheet-repair-items.ts	src/lib/down-sheet/down-sheet-repair-items.ts
R088	app/down-sheet/down-sheet-replace.ts	src/lib/down-sheet/down-sheet-replace.ts
R100	app/down-sheet/down-sheet-scan-import.ts	src/lib/down-sheet/down-sheet-scan-import.ts
R099	app/down-sheet/down-sheet-settings-store.ts	src/lib/down-sheet/down-sheet-settings-store.ts
R099	app/down-sheet/down-sheet-share.ts	src/lib/down-sheet/down-sheet-share.ts
R097	app/down-sheet/down-sheet-sync.ts	src/lib/down-sheet/down-sheet-sync.ts
R100	app/down-sheet/down-sheet-view.ts	src/lib/down-sheet/down-sheet-view.ts
R100	app/down-sheet/repair-time-estimates.ts	src/lib/down-sheet/repair-time-estimates.ts
R098	app/down-sheet/scan-catalog-match.ts	src/lib/down-sheet/scan-catalog-match.ts
R100	app/down-sheet/scan-spelling.ts	src/lib/down-sheet/scan-spelling.ts
R099	app/sheet-ledger-backfill.ts	src/lib/down-sheet/sheet-ledger-backfill.ts
R099	app/sheet-ledger.ts	src/lib/down-sheet/sheet-ledger.ts
R100	app/down-sheet/tracker-membership-sync.ts	src/lib/down-sheet/tracker-membership-sync.ts
R096	app/bulk-relocation.ts	src/lib/fleet/bulk-relocation.ts
R100	app/bus-hold.ts	src/lib/fleet/bus-hold.ts
R100	app/bus-lists.ts	src/lib/fleet/bus-lists.ts
R100	app/bus-number-resolver.ts	src/lib/fleet/bus-number-resolver.ts
R100	app/domain.ts	src/lib/fleet/domain.ts
R100	app/facility-areas.ts	src/lib/fleet/facility-areas.ts
R098	app/facility-defect-clear.ts	src/lib/fleet/facility-defect-clear.ts
R100	app/facility-layout.ts	src/lib/fleet/facility-layout.ts
R100	app/facility-sweep.ts	src/lib/fleet/facility-sweep.ts
R099	app/fleet-intelligence.ts	src/lib/fleet/fleet-intelligence.ts
R100	app/fleet-validation.ts	src/lib/fleet/fleet-validation.ts
R100	app/location-label.ts	src/lib/fleet/location-label.ts
R100	app/maintenance-completion.ts	src/lib/fleet/maintenance-completion.ts
R100	app/mileage-estimate.ts	src/lib/fleet/mileage-estimate.ts
R100	app/mystery-buses.ts	src/lib/fleet/mystery-buses.ts
R095	app/pair-reassignment.ts	src/lib/fleet/pair-reassignment.ts
R100	app/road-calls.ts	src/lib/fleet/road-calls.ts
R100	app/section-count.ts	src/lib/fleet/section-count.ts
R100	app/service-intervals.ts	src/lib/fleet/service-intervals.ts
R100	app/site-config.ts	src/lib/fleet/site-config.ts
R092	app/smart-status.ts	src/lib/fleet/smart-status.ts
R100	app/tech-services.ts	src/lib/fleet/tech-services.ts
R096	app/operator-batch.ts	src/lib/operator/operator-batch.ts
R099	app/operator-engine.ts	src/lib/operator/operator-engine.ts
R099	app/fleet-forecast.ts	src/lib/reports/fleet-forecast.ts
R100	app/fleet-status-report-print.ts	src/lib/reports/fleet-status-report-print.ts
R098	app/fleet-status-report.ts	src/lib/reports/fleet-status-report.ts
R098	app/work-time.ts	src/lib/reports/work-time.ts
R100	app/app-mode.ts	src/lib/settings/app-mode.ts
R100	app/confirmation-preferences.ts	src/lib/settings/confirmation-preferences.ts
R100	app/lite-mode.ts	src/lib/settings/lite-mode.ts
R098	app/map-settings.ts	src/lib/settings/map-settings.ts
R100	app/roles.ts	src/lib/settings/roles.ts
R100	app/shift-clock.ts	src/lib/settings/shift-clock.ts
R100	app/tracker-pages.ts	src/lib/settings/tracker-pages.ts
R100	app/elapsed-label.ts	src/lib/shared/elapsed-label.ts
R100	app/hours-value.ts	src/lib/shared/hours-value.ts
R098	app/operational-time.ts	src/lib/shared/operational-time.ts
R100	app/scroll-lock.ts	src/lib/shared/scroll-lock.ts
R100	app/share-file.ts	src/lib/shared/share-file.ts
R100	app/time-window.ts	src/lib/shared/time-window.ts
R091	app/fleet-backup.ts	src/lib/storage/fleet-backup.ts
R096	app/fleet-restore.ts	src/lib/storage/fleet-restore.ts
R100	app/section-transfer.ts	src/lib/storage/section-transfer.ts
R100	app/storage.ts	src/lib/storage/storage.ts
A	tests/app-shell.test.mjs
A	tests/cloud-sync.test.mjs
A	tests/defects.test.mjs
A	tests/down-sheet.test.mjs
A	tests/fleet.test.mjs
A	tests/helpers/modules.mjs
A	tests/helpers/setup.mjs
A	tests/operator.test.mjs
D	tests/rendered-html.test.mjs
A	tests/reports.test.mjs
A	tests/settings.test.mjs
A	tests/shared.test.mjs
A	tests/storage.test.mjs

$ git diff --shortstat 807357a..6dc96fe
 173 files changed, 16828 insertions(+), 16269 deletions(-)

$ git diff --name-only 807357a..6dc96fe -- supabase package.json package-lock.json .github public worker
.github/CODEOWNERS
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
.github/PULL_REQUEST_TEMPLATE.md
package.json
```

**That last check is not empty, and none of it ships.** The four `.github/`
files are a CODEOWNERS file, a pull-request template and two issue templates —
no workflow changed. `package.json` changes on one line, the `test` script:

```
-        "test": "npm run build && node --test tests/rendered-html.test.mjs",
+        "test": "npm run build && node --test tests/*.test.mjs",
```

No dependency, no version, no build script. `supabase/`, `package-lock.json`,
`public/` and `worker/` are untouched, so **the service worker is unchanged**.

`55c9e7f` in the range is the 182 handoff itself (docs only). The rest of the
non-code files are docs: `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`,
`SECURITY.md`, `docs/ARCHITECTURE.md` (new), `docs/NEXT_SESSION.md`,
`docs/README.md`, six `docs/roadmap/` files and
`.claude/skills/cascade-check/SKILL.md`.

## Migrations

**None.** No LocalStorage key added, renamed or read differently. No Supabase
schema change. Nothing on a device is rewritten.

## What changed

**The code moved; the app did not.** `app/` was one flat folder of about 110
files where a page, a shared control and a piece of shop logic all looked alike.
Now:

- `app/` holds only the pages, the two API handlers, the stylesheets and each
  page's own components (`app/<page>/_components/`).
- `src/lib/` holds the shop's rules, by area: storage, cloud, fleet, defects,
  down-sheet, operator, reports, settings, shared.
- `src/components/` holds the controls more than one page draws.
- The 15,000-line test file is ten files named for what they cover.

131 files were moved with `git mv`, so their history follows them. Inside the
moved files the only edits are import paths — every changed line in
`git diff -M 807357a..6dc96fe -- app src` is part of an import statement. The picker stylesheet 182 added
(`app/combo-field.css`) moved beside its component to
`src/components/shared/combo-field.css`, byte for byte.

**No UI change and no flow change.** Nothing moved on screen, no label renamed,
no list reordered, no tap does anything different.

## Verified

Gates re-run on the rebased branch head `2d2aa82`, whose tree is identical to
`6dc96fe` (`git diff --stat 2d2aa82 6dc96fe` is empty):

- **332 tests pass**, 0 fail — the same 332 as `main` at `55c9e7f`, run there
  separately. Every one of `main`'s 332 test titles appears exactly once in the
  split files.
- `npm run lint` clean
- `npm run build` complete (`npm test` builds first)
- GitHub's *Lint, build and test* check passed on `2d2aa82`.

The PR was rebased onto 182's work before merging. 182's three test changes —
the two re-pinned picker labels and the new drop-down-arrow test — were ported
into `tests/down-sheet.test.mjs`, `tests/defects.test.mjs` and
`tests/shared.test.mjs`.

## What to check once it is live

1. Open the app on a phone. It loads, and the Facility Map draws your board as
   before.
2. Open each page in turn — **Down Sheet, Defect Log, Fixed Repairs, Fleet
   Campaigns (Lists), Settings** — and each one renders with your data in it.
3. On the Defect Log, open **ADD DEFECT**: both pickers and their drop-down
   arrows still work (the 182 checks).
4. On the Down Sheet, open **ADD DOWN BUS**: the CATEGORY / SPECIFIC REPAIR
   picker still draws styled.
5. Close the app fully and reopen it with the wifi off. It still opens offline —
   the service worker did not change.

## For Codex: stale paths in PROJECT_HANDOFF.md

`PROJECT_HANDOFF.md` is Codex's and was not edited. These paths in it no longer
exist (re-checked against `6dc96fe`):

| line | in PROJECT_HANDOFF.md | now |
| --- | --- | --- |
| 92 | `app/facility-layout.ts` | `src/lib/fleet/facility-layout.ts` |
| 93 | `app/facility-areas.ts` | `src/lib/fleet/facility-areas.ts` |
| 94 | `app/cloud-sync.ts` | `src/lib/cloud/cloud-sync.ts` |
| 94 | `app/cloud-client.ts` | `src/lib/cloud/cloud-client.ts` |
| 94 | `app/cloud-sync-control.tsx` | `app/settings/_components/cloud-sync-control.tsx` |
| 95 | `app/smart-status.ts` | `src/lib/fleet/smart-status.ts` |
| 96 | `app/operator-engine.ts` | `src/lib/operator/operator-engine.ts` |
| 96 | `app/operator-batch.ts` | `src/lib/operator/operator-batch.ts` |
| 100 | `app/repair-catalog.ts` | `src/lib/defects/repair-catalog.ts` |

Also worth a second look: where it describes `app/down-sheet/`,
`app/defect-log/` and `app/fixed-repairs/` as holding UI and logic. Each now
holds only its `page.tsx`, its stylesheet and its `_components/`.

## Rollback

Roll back to 182 (`807357a`) if it is live, otherwise `sites-v181` (`148a45e`).
Nothing is stored differently, so nothing logged under 183 is lost or altered.
# 184 — publish from c296486

## Source

```
$ git log --oneline 0d0fd13..c296486
c296486 LOGGED is whose work it is, not just when it happened
0573f11 A snapshot of one shift, not of every day since

$ git diff --name-only 0d0fd13..c296486
app/defect-log/defect-log.css
app/defect-log/page.tsx
src/components/shared/time-window-chips.tsx
src/lib/defects/quick-filter-share.ts
src/lib/defects/quick-filters.ts
src/lib/defects/repair-catalog.ts
src/lib/settings/shift-clock.ts
src/lib/shared/time-window.ts
tests/defects.test.mjs
tests/settings.test.mjs
tests/shared.test.mjs

$ git diff --shortstat 0d0fd13..c296486
 11 files changed, 612 insertions(+), 47 deletions(-)

$ git diff --name-only 0d0fd13..c296486 -- supabase package.json package-lock.json .github public worker
(nothing)
```

Merged from PR #30 as a rebase, so `main` stays linear and these are its own
two commits rather than a merge commit.

## Migrations

**None.** No LocalStorage key added, renamed or read that was not read before.
No Supabase schema change. The window a drawer is set to is per-drawer state and
is still deliberately not persisted anywhere, so there is nothing on a device for
this release to migrate.

It does READ one key it did not read before — `pace-shift-settings-v1`, the
garage's own hours — through `readShiftSettings`, the same way the Down Sheet and
the Fleet Forecast already read it. A device that never opened Settings has no
such record and gets the shop's real defaults.

## What was wrong

**A snapshot of a list was a snapshot of every day in it.** Curtis, back from
vacation with two buses down:

> "if I pull those reports and I try to give a snapshot it's gonna give me all
> the other buses from the other days that I don't want ... I just need a
> snapshot of things that are deferred, recommended for the down sheet, or any
> defects that I logged" — for the shift he is on.

The DEFERRED and RECOMMENDED FOR DOWN SHEET drawers already had a
`SHOW: ALL 1H 4H 8H 24H 3D 7D` row, and it already narrowed the shared list
rather than only the screen. But every one of those is a ROLLING count of hours,
and a shift is not a number of hours — it is a boundary. **At 14:02, `8H` hands
back the morning crew's work**, which is exactly the thing being avoided.

There was also no list at all for "what did I write down this shift". The other
quick filters each name a fault (A/C, leaks, horn); none of them answers *when*.

## What changed

**1. A `SHIFT` chip, first after ALL, in the Defect Log's quick-filter drawers.**
It resolves against `pace-shift-settings-v1` — 1st 06:00, 2nd 14:00, 3rd 22:00 —
so it is five minutes long at 14:05 and eight and a half hours long at 22:00.

**The incoming crew owns the handover**, which was already the rule and is what
Curtis confirmed rather than changed:

> "at two o'clock, which is the shift I work, that's when it can start ...
> because at two I'm officially coming in, so the expectation is for me to take
> on work. The expectation for the other shift leaving, even though it's
> overlapping, is to delegate or dismiss work."

**2. A new `LOGGED` list** — open defects written down inside the window.
**Open work only**: *"anything fixed, I don't need a record of that."* It opens
on THIS SHIFT rather than ALL, because on ALL it is every bus in the fleet
carrying an open defect.

**3. `LOGGED` is keyed off initials as well as time.** Curtis: *"key off
initials so we don't have the multiple day issues."* The drawer header reads
**DEFECTS LOGGED BY CJ** and the shared heading carries both the person and the
boundary:

```
Defects Logged by CJ (2ND SHIFT · SINCE 14:00) — 2 buses
```

**No initials set means no person filter, and the drawer says so** on a line
under the chips: `NO INITIALS SET — SHOWING EVERYONE'S REPORTS`. The initials
field ships empty and has never been required for a report, so a hard match
would have handed an un-set-up device an empty list every shift — and an empty
list reads as "nothing happened this shift" rather than "this is not set up".

**4. The window reaches the printed LINES on the LOGGED list**, not only the bus,
so a bus picked for a 14:20 defect does not print Monday's underneath it in a
list headed 2ND SHIFT.

**UI change, and Curtis approved it before the merge:** the chip row now holds
eight chips instead of seven, so each is narrower — **34.3 → 29.5px wide at
360px**, 38.6 → 33.3 at 390px. Height is unchanged at 38px, nothing clips or
wraps, and the row stays on one line at every phone width. The two Down Sheet
boards draw the same component and **keep the seven-chip row they had**: only a
screen that resolves a shift may offer the chip.

## Verified

Gates re-run on `c296486` itself, after the merge, not carried over from the
branch:

- **338 tests pass**, 0 fail (332 before this release)
- `npm run lint` clean
- `npm run build` complete

**Twelve mutations fail the new guards.** The ones that matter, each of which
would make a shared list claim something untrue: treating a resolved shift as no
window at all; giving the handover half-hour to the outgoing crew; letting the
line-level window go so a this-shift snapshot prints last Monday's defect;
reading a bus's age from its OLDEST stamp so a bus logged ten minutes ago drops
out; letting finished work back into the list; treating an edit as a fresh
report; **treating "no initials" as a match against the empty string, so the
list comes back empty**; dropping the case-fold so a lowercase initial off a
photographed sheet reads as somebody else's; and naming a person in the heading
when there are no initials to name.

Driven in Chromium at 360, 390 and 430px against a seeded board with the clock
pinned:

| Check | Result |
| --- | --- |
| Chip row | 8 chips on ONE row at all three widths, no text clipping, no horizontal overflow, each chip owning its own centre by `elementFromPoint` |
| 14:40, mid-2nd-shift | SHIFT → 2 buses, `3 HIDDEN · SHOW ALL` beside the chips |
| **14:02, two minutes in** | SHIFT → **1 bus** (logged 14:01) · the same moment on **8H** → **3 buses**, including the morning crew's 13:50 and 09:02 |
| Initials `CJ` | `Defects Logged by CJ`, 2 buses — his own, including one whose initial was written lowercase on a scanned sheet; his own 04:40 defect stays out |
| Initials `RM` | `Defects Logged by RM`, 1 bus |
| Initials unset | `Defects Logged`, 4 buses, and the NO INITIALS SET line, whose box measured 0px top and bottom margin |
| A defect logged AND fixed this shift | absent at every window |

Two probe errors on the way, both the fixture rather than the app, recorded
because this is where "it works" gets claimed: a handover case whose stamps were
built from a different clock put "20 minutes ago" eighteen minutes into the
future, where a future stamp correctly passes every window; and a Down Sheet
check that reported "no chips" on a fixture whose boards had no rows to draw a
chip row for. **That the Down Sheet boards do not offer the SHIFT chip is proved
at the module and source level, not in the browser** — `TIME_WINDOWS` has no
`shift` key and neither board passes a window list.

## What to check once it is live

1. Make sure your **initials are set** in the Defect Log's settings first. If
   they are not, the LOGGED list shows everybody's reports and tells you so on
   an orange line — that line is the thing to look for.
2. Open the Defect Log and press the **LOGGED** quick filter. It should open
   already set to **SHIFT**, and the header should read **DEFECTS LOGGED BY**
   and your initials.
3. The buses listed should be only the ones you logged since your shift started
   — 06:00, 14:00 or 22:00, whichever you are on. Anything from yesterday should
   be absent, and the count of what is being held back should appear beside the
   chips as `N HIDDEN · SHOW ALL`.
4. Press **COPY LIST**. The first line should name both you and the boundary:
   `Defects Logged by CJ (2ND SHIFT · SINCE 14:00) — 2 buses`.
5. Press **SHOW ALL**. Every bus you have an open defect on should come back,
   and the heading should lose the shift.
6. Open **DEFERRED** and **RECOMMENDED FOR DOWN SHEET**. Both should now have a
   **SHIFT** chip at the front of their row; press it and the list should narrow
   to decisions made this shift. These two are **not** filtered by initials.
7. On the **Down Sheet**, open its DEFERRED and RECOMMENDED boards. Their chip
   rows should be unchanged — **no SHIFT chip there**.
8. Worth one look on the narrowest phone you have: the chip row is eight chips
   wide now and each one is about 30px. If it is awkward under a glove, say so
   and the row can wrap to two lines.

## Rollback

Roll back to 183 (`6dc96fe`) if it is live, else 182 (`807357a`), else
`sites-v181` (`148a45e`). **Nothing is stored differently**, so no defect,
entry, recommendation or deferral logged under 184 is lost or altered — the
SHIFT chip and the LOGGED list simply are not offered, and `pace-shift-settings-v1`
is left exactly as it is for the Down Sheet and the forecast, which read it
on 181 as well.
\n

# 185 — publish from b9c1e81

## Source

```
$ git log --oneline ebfb89b..b9c1e81
b9c1e81 The shop sets its own repair times, and the estimate obeys them
d2c4456 Strike queue item 1: the deferment extend shipped in 179
0545833 Typed line breaks reach the screen, and a BULLET button
d7af396 PATH TO REPAIR: write it once, read it on every bus with that fault
1119cdf FIXED TODAY was missing every fix made on this device
f740f48 The Defect Log says how many hours are standing on it

$ git diff --name-only ebfb89b..b9c1e81
CLAUDE.md
app/defect-log/defect-log.css
app/defect-log/page.tsx
docs/NEXT_SESSION.md
src/lib/defects/defect-estimates.ts
src/lib/defects/path-to-repair.ts
src/lib/defects/repair-catalog.ts
src/lib/defects/repair-hours-ledger.ts
tests/defects.test.mjs
tests/shared.test.mjs

$ git diff --shortstat ebfb89b..b9c1e81
 10 files changed, 930 insertions(+), 19 deletions(-)

$ git diff --name-only ebfb89b..b9c1e81 -- supabase package.json package-lock.json .github public worker
(nothing)
```

Merged from PR #31 as a rebase, so `main` stays linear and these are its own
six commits rather than a merge commit.

## Migrations

**None, and two new keys.** Adding a key is fine; nothing is renamed and nothing
already on a device is read differently.

```
pace-ptr-v1            PATH TO REPAIR: how to approach a repair, per repair
pace-repair-hours-v1   what this shop says a repair takes, per repair
```

Both are documented in `CLAUDE.md`, and a test fails if a key is not. Both are
**device-local**: carrying them would need `shop_memory` to accept a third
`kind`, which is a schema change on the live database and therefore Curtis's
call. Not done, and the PATH TO REPAIR screen says so where somebody writes one.

## What changed

**1. The feed header says how long the work standing on it would take.**

```
LIVE REPAIR FEED
81 BUSES · 275 DEFECTS   38h 30m ESTIMATED
```

Curtis asked for *"a little badge that shows how many hours all of the ...
defects that are currently on the bus add up to"*. The Down Sheet has printed
the same number since it was built; the Defect Log never had it. It reads the
**Down Sheet's own estimate table** rather than growing a second one, so a
repair cannot show two different numbers on two screens, and it follows the
search — stand on one bus and it reads that bus's outstanding work.

**2. The shop can set its own repair times.** A `SHOP TIME FOR THIS REPAIR` box
on the PATH TO REPAIR screen. Type a number and it is the estimate for that
repair on every bus until somebody changes it; empty the box and the catalog
estimate returns.

A **ledger, not a learner** — Curtis turned down the version that averages its
way to a figure: *"that's not necessarily an adaptive strategy, but that's more
like a fixed ledger."* Three sources, most specific first: hours typed on THIS
defect, then this ledger, then the catalog.

**3. PATH TO REPAIR.** A `PTR` button on each defect card in the focus view,
opening a screen for general direction — *"refer to Cummins INSIGHT, check the
oil first, look for corrosion behind the AC filters"*. Written once per repair
and shown on every bus with that fault. Not a diagnosis and not a procedure.

**4. Typed line breaks reach the screen**, plus a `• BULLET` button beside
DESCRIPTION. Nothing was ever losing them — the record kept every newline and
HTML was collapsing them on the way to the screen.

**5. FIXED TODAY was missing every fix made on this device.** MARK FIXED
completes a repair and hides it in the same action, and the counter was reading
the list that excludes hidden records. A board holding two repairs completed
today reported **one**. Nothing was ever lost.

## Verified

Gates re-run on `b9c1e81` itself, after the merge:

- **346 tests pass**, 0 fail (338 before this release, counted at both revisions)
- `npm run lint` clean
- `npm run build` complete

**Nineteen mutations fail the new guards across the release.** The ones that
matter: the hours badge sourcing from the unsearched list so it quotes the whole
fleet while standing on one bus; the shop's ledger being ignored so the catalog
wins; a cleared time or writeup staying in force; `FIXED TODAY` going back to
the list that cannot see this device's own fixes; a PTR key that stops resolving
through the catalog's rename maps, which would orphan every writeup the first
time a category is renamed; and the description's `pre-wrap` being dropped so
line breaks collapse again.

Driven in Chromium at 360 / 390 / 430 / 820 against seeded boards:

| Check | Result |
| --- | --- |
| Hours badge | `6h 30m ESTIMATED`, and the module computes 390 minutes for the same board |
| Shop time | two buses with the same repair read **7h**; setting 1.5h made it **3h**; clearing it returned **7h** |
| The second bus | showed `1.5` without being touched — which is what "per repair" means |
| PATH TO REPAIR | written on 17543, already present on 17566, survived a reload |
| Description | two paragraphs and two bullets typed, saved, reopened — four lines on screen, stored string identical |
| FIXED TODAY | the board that reported **1** now reports **2**, against 2 completed today in the record |

Two bugs the browser caught that the tests had not: the PTR panel opened looking
normal and was **completely dead**, because both shades share one z-index and
the focus shade painted on top of it — and the test had asserted the inverse
mechanism and passed. And the BULLET button left the caret at position 0, so the
next words dictated landed welded to the front of the paragraph.

## What to check once it is live

1. Open the **Defect Log**. The line under LIVE REPAIR FEED should now end with
   a small badge like `38h 30m ESTIMATED`. Search one bus — all three numbers on
   that line should narrow together.
2. Open **DAILY STATS** and press MARK FIXED on something. **FIXED TODAY should
   go up by one.** Before this release it did not move.
3. **FOCUS** a bus, then press **PTR** on one of its defects. The screen should
   be titled PATH TO REPAIR and open straight into the editor if nothing is
   written. Write a line and save it.
4. Open a **different bus with the same repair** and press PTR. Your writeup
   should already be there. That is the whole feature.
5. On that same screen, type a number into **SHOP TIME FOR THIS REPAIR**. The
   hours badge on the feed should move for **every** bus carrying that repair.
   Clear the box and the catalog estimate comes back.
6. **EDIT DEFECT** on anything, type a description with a blank line and press
   **• BULLET** a couple of times. Save it, reopen the focus view: the breaks
   should still be there. This is the one Curtis reported — *"when I saved it,
   it just put them all back together, both paragraphs."*

## Rollback

Roll back to 184 (`c296486`) if it is live, else 183 (`6dc96fe`), else 182
(`807357a`), else `sites-v181` (`148a45e`).

**Nothing already stored is altered**, so no defect, entry, recommendation or
deferral logged under 185 is lost. The two new keys are simply not read by an
earlier version: a PTR writeup and a shop repair time stay on the device,
untouched, and reappear when 185 is published again.
