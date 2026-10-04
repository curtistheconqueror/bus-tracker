# Publish next

**STATUS: 182 AND 183 PENDING — 182: the Defect Log's two pickers say what
they are, and their drop-down arrow works. 183: the repository is laid out by
what each file is; nothing on screen changes.**

| Version | Publish from | What | Section |
| --- | --- | --- | --- |
| 182 | `807357a` | Picker labels and a working drop-down arrow | [182](#182--publish-from-807357a) |
| 183 | `6dc96fe` | Repository layout only, no UI or flow change | [183](#183--publish-from-6dc96fe) |

**182** publishes from `807357a` (`The drop-down arrow is a button now, because it never
was one`). Derive the range with:

```
git log --oneline 5d5a033..807357a
```

Version 181 was published from `148a45e` on 2026-09-15 and is the rollback
point; its tag is `sites-v181`. The one before it is 180 from `b6e0cba`.

Two releases are pending. **Publish 182 first, then 183.** 183 is built on top
of 182 (its range starts at `807357a`), so publishing 183 alone would also ship
everything in 182. If Curtis wants only one Sites version, publishing 183 from
`6dc96fe` carries both — but then walk both checklists below.

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
