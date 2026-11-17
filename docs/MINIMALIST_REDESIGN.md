# Mobile minimalist redesign (released in Sites 190)

Baseline: `103f00d15e73d09642720963043b16b05347c440` on `main`.
Rollback branch: `legacy/pre-minimalist-20261117-103f00d`.
Implementation branch: `codex/fleetstep-minimalist-20261117`.
PR48 was merged and published with Curtis's approval on 2026-11-17 as Sites 190 / application release 195, together with the preserved queued release 194. Source `a1d90e85a6489ab9c6ff636e50ed813d98363978`. The existing Sites binding and public audience remain unchanged.

## Scope

- One compact top page selector and persistent Map / Down Sheet / Defects / More navigation on every route at widths through 800px. More retains Fixed Repairs, Fleet Campaigns (Full mode), Incidents, Shop Talk and Settings.
- Smaller consistent headers, safe-area content clearance, and grouped inline map tools instead of competing fixed command bars.
- All seven map status counts and the existing facility sections, bus positions, movement, filters and editors remain. Selected status filters remain visibly selected.
- Down Sheet keeps Add Down Bus and Search prominent. Shift filters are visible daily controls. Advanced Actions remains initially collapsed and remembered, including completed-view, scan and recovery actions.
- Defect Log has Compact / Detailed card views. Compact is the initial default; opening one uses the existing full group and its actions, not a second repair editor. Detailed retains the prior card layout. Operating status and the existing status-colour option still apply. Keyboard focus moves into the opened group.
- `pace-defect-log-card-view-v1` is an independent per-device presentation preference. A refused write leaves the visit usable and reports that the preference was not remembered. Operational storage keys, records, migrations and sync logic are unchanged.

## Review ledger

Independent cold review identified and the implementation corrected:

1. The 621–800px map sheets inherited a hidden narrow-phone breakpoint while the old command footer remained visible. Sheets now work through 800px and the redundant footer is hidden at the same breakpoint. FULL SWEEP and hold-board access are retained under map Tools.
2. A light user-selected header made white selector text unreadable. The selector now inherits the computed header ink.
3. Compact cards initially omitted operating status and bypassed status-colour settings. They now carry the same status label and data-status styling contract.
4. New map summary surfaces initially masked selected filter styling. Their pressed state now has its own visible border, fill and outline.
5. Compact opening removed the focused button. Focus now transfers to the existing full-card header.

An independent Chromium recheck confirmed all five corrections, with no remaining findings in that bounded pass.

## CodeRabbit follow-up (PR #48)

Both findings on `871c26a` were reproduced before changes:

- [Compact collapse focus](https://github.com/curtistheconqueror/bus-tracker/pull/48#discussion_r4595748772): keyboard collapse left focus on the now-hidden full-card header. Collapse now restores the replacement compact opener only if the collapsing header owns focus. Detailed mode and unrelated focus remain unchanged.
- [More-menu focus contrast](https://github.com/curtistheconqueror/bus-tracker/pull/48#discussion_r4595748778): the amber outline measured 2.14:1 against white. The white menu now uses navy, measured 12.57:1; the dark dock retains amber, measured 7.73:1. The configurable header selector uses its computed ink.

Chromium checks passed three repeated keyboard expand/collapse cycles, unrelated search-focus preservation, detailed-card collapse, menu and dock focus visibility/contrast, unchanged synthetic fleet records, and no page errors. New tests execute the actual collapse handler and compute outline contrast against menu, hover, current-page and dock backgrounds. Independent follow-up review found no actionable issue.

## Verification limits

Local Chromium exercises use synthetic records in an isolated localhost browser context, not the shop's live data. Physical iPhone/Safari/Home Screen, actual safe-area hardware, VoiceOver and native share sheets are not claimed. Standalone TypeScript checking is not clean on the baseline; the redesign diagnostics match the untouched baseline after normalizing line numbers. Production build, lint, regression results and the reviewed commit belong in the PR; do not infer deployment from those checks.
