# Publish next

**STATUS: NONE PENDING.** Application release 223 is live as Sites Version 209,
deployed 2026-11-25 23:56:12.045352 UTC from `e0054a9dfca54281bfe112c3d5cd14c76a174e82`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

Previous-live rollback: Sites 208 / application 222 at `ea7071dc7cd9cb662b93c1e7ffe4aaaf23cbbe4f`. PR39 MCP remains held and excluded.

Publication evidence is in [RELEASES.md](RELEASES.md).

## Remaining device checks

On an iPad or Android tablet, scroll the Down Sheet and confirm the blue strip
no longer covers rows. Section names and their descriptions should be larger,
with count chips and phone rendering unchanged. Do not edit records to verify.

In the Defect Log and Down Sheet repair pickers, open Brakes and look for the
two service-brake pull directions. Cancel without saving a real record.

On a physical iPad or Android tablet, verify REFRESH on its own row, SCAN and
SHARE together, and PAGES below. PAGES starts closed; opening it overlays the
sheet without movement, and tapping away closes it. On a phone in portrait or
landscape, confirm the existing navigation and actions are unchanged. Open and
cancel Scan to check the existing entry screen without selecting real photos.

On iPad or another tablet, verify the added space after the control panel and
the 2 px black border around Maintenance Down Sheet. Compare portrait and
landscape on a phone to confirm no change. No real records need to be edited.


On phone-sized hardware, verify the status stripe and footer positioning using
synthetic defects only. Chromium confirmed fixed geometry and footer coverage.


On a physical iPhone, check Detailed light-theme card and defect outlines and,
where Closing Line is enabled, the white label on the black closing strip.
Check the full width with the optional vertical number rail and that Off still
hides the footer. Do not modify real records to verify.


On a physical iPhone, confirm that LATEST and OLDEST are readable and stacked
without crowding VIEW or CLOSE; a filtered bus card still shows the oldest
dated active defect. Expand the card to confirm full issue details and the
larger original LOGGED, UPDATED, and LAST REPORTED labels; do not change any
real record to verify.


On a physical iPhone, confirm the Fixed Repairs emoji/category subtitles are
easier to read and longer names wrap without covering the repair description.


On a physical iPhone, check that the slightly larger Maintenance Down Sheet
title remains clear and does not crowd the count or Show Completed control.


On a physical iPhone, verify THIS SHIFT does not add the older-buses banner or
move the Defect Log feed, and ALL brings all dates back. Check the gap between
bus numbers and repair text in the expanded filter drawer, the Maintenance →
Union welcome title below Close, and the DECOMMISSIONED tile label.

On the Down Sheet, verify REFRESH / SCAN / SHARE, the three tabs starting closed,
the Mystery watch list, and the open-bus count. Check Settings → Down Sheet →
CLEAR DOWNSHEET confirmation and undo only on an isolated device with synthetic
records; do not clear the real sheet. Do not scan, transmit, or share live data
to verify the controls.

On a physical iPhone, check that the Defect Log shows the header, then
+ LOG DEFECT and SEARCH, then LIVE DEFECT FEED. There should be no DAILY STATS
bar or blank gap left by its removal, including when opening and closing Scan.

On a physical iPhone, confirm the REFRESH / SCAN / SHARE row, the three
scanner tiles and their routes on a device with local fleet data, the Defects
Logged share controls, the feed-row Quick Filters, and More → AI OPERATOR on
the map. Confirm Scan Batches and Clean Up arrival from Settings. Test Undo
Last and the Clean Up confirmation only with synthetic records on an isolated
test device, not on the real fleet. Do not share or upload live data to test
the controls. In the Share preview only, confirm PREVIOUS SHIFT falls back to
THIS SHIFT, and LAST 24H opens the matching 24H chip. Home Screen and offline
acceptance remain unverified.

Continue the native ALL picker and Previous Shift checks from
[releases 207–209](archive/PUBLISH_RELEASE_207_209.md) and the Log Defect
location and Down Sheet checks from [releases 198–206](archive/PUBLISH_RELEASE_198_206.md).
These are device follow-ups, not pending source releases.

## PR39 (MCP read surface) — NOT MERGED, and not part of any release above

**Nothing in this section is pending publication.** PR39 is an open, unmerged
pull request, held by Curtis's own release gates. The STATUS line at the top of
this file is Codex's own, about Codex's release queue — pending, published or
none — and says nothing about this section. No release is named in here at all:
this section outlives the releases around it, so one named in it would be
describing something else by the time anybody read it. It is kept here so that
the gates travel with the branch, and it becomes a release section only if and
when PR39 is merged — at which point its STATUS, its source SHA and its
rollback are all written fresh against whatever is live then.


PR #39 adds five read-only MCP tools at `/api/mcp`. Last code-bearing source:
`0e6d9aa99a31ebc83bb458f884d0a937cb225701`; freeze and reverify the actual
merged release SHA before packaging. Never publish the older `347672f` build.
CI [39532393605](https://github.com/curtistheconqueror/bus-tracker/actions/runs/39532393605)
passed lint, build and 399 tests on merge candidate
`86e84e51bae874e9c55c079ff2b1c891f065ce37` (code head above into `a7e1aa3`).
Any newer code requires reconciliation and current-head checks.

**THAT CI RUN AND ITS 399 TESTS DESCRIBE AN OLDER CANDIDATE, not this head.**
`main` is merged into this branch rather than rebased onto, because the branch
is published. **When that has been done, how often, and which releases it
brought in are deliberately not written here**: that is history, and this file
is not where it lives — the same reason the rollback below carries no SHA. Read
`git log --merges --first-parent` on the branch for the sequence, and
`git show <merge>^2:docs/PUBLISH_NEXT.md` for the release each merge brought in.
Use `--first-parent`: without it, the merges `main` carried in with it are mixed
into the same list.

Two files are where such a merge conflicts, and each has one right resolution.
`tests/helpers/modules.mjs` conflicts when this branch and `main` have both
appended export lines at the same end: take the union, and check that every
module path in the result exists. This file conflicts because Codex rewrites it
whole for each release while this branch appends the section below it: take
`main`'s version whole and re-append the section, so that a release's STATUS
line is always Codex's own and PR39 never claims it.

Measured on this head, in a container rather than in CI, rather than carried
over from an earlier run: the production build succeeds, ESLint is clean, and
**540 of 540 tests pass**. That figure is a measurement of one tree and nothing
more — it moves with any change that adds a test, so re-measure it here, and CI
must re-run on the actual merge SHA before anything is packaged.

**A COUNT FROM A PR CHECK IS NOT A COUNT OF THIS HEAD, and the two disagree
without either being wrong.** `.github/workflows/ci.yml` fires on
`pull_request` and its `actions/checkout` step passes no `ref`, so what a check
on this pull request builds and tests is the merge GitHub computes between this
head and the base branch — not this head. The two counts therefore differ by
whatever tests `main` has gained since the last merge into this branch, and a
check reporting more tests than are measured here is that gap and not a missing
file. Compare a count only against a run on the same tree.

**THE BROWSER TESTS NEED `CHROME_BIN` SET IN A CONTAINER LIKE THIS ONE, AND
WITHOUT IT ONE OF THEM FAILS FOR A REASON THAT IS NOT A DEFECT.**
`tests/defect-log-black-footer.test.mjs` tries `google-chrome`, `chromium` and
`chromium-browser` in that order and spawns the first that answers `--version`,
with a 30 second budget. Here the first is a wrapper onto full Chromium, which
exceeds that budget and dies `ETIMEDOUT`. Pointing `CHROME_BIN` at Playwright's
`chrome-headless-shell` instead is not enough on its own: the shell refuses to
run as root without `--no-sandbox`, which this test does not pass, so it exits
1 saying so. Both readings are environment, not behaviour — the test is sound
and `main`-owned, and nothing in it touches the MCP.

So `CHROME_BIN` wants a one-line wrapper that execs
`chrome-headless-shell --no-sandbox "$@"`, and with that the file passes 5 of 5
and the whole suite 540 of 540. Worth knowing before somebody reads a red
`ETIMEDOUT` here as a regression: it is neither this branch's nor a defect.

Nothing about the gates below changed. Merging `main` in, and correcting what
this section says, are both maintenance so the branch can land when Curtis
clears them; neither is a claim that any gate is met.

Curtis authorized publication of the verified ready scope on 2026-10-21 and
temporarily accepted the unresolved Major URL-token risk for his initial
single-user read-only connection. Keep the
[OPEN risk record](MCP_SECURITY_FOLLOWUP.md) in subsequent release handoffs;
do not describe it as fixed or CodeRabbit-approved.

Before merge/publication, confirm the coordinating Supabase work has verified
effective reader isolation and dedicated reader authorization, then configure
the five runtime variables through the approved secure path. This record does
not assert provisioning, authorization checks or runtime configuration are done.
Do not duplicate identity creation, bundle future writes, or disclose a real
token or token-bearing URL. No application migration is executed by this
documentation change; separately coordinated Supabase changes need their own
verification record.

After publishing to the existing site, verify the frozen source and application
and Sites versions; smoke the existing UI routes, unauthenticated rejection,
authenticated MCP initialization/discovery, and actual authorized cloud tool
reads without exposing credentials or private records. Record outcomes and
remaining client/device checks. A handshake alone is insufficient.

**ROLLBACK IS THE LIVE BASELINE AT PUBLISH TIME, AND IT IS RE-PINNED WHENEVER
`main` IS MERGED IN.** It read application 191 / Sites 187,
`b33775685b61acafdf4325807c82e92281c9fc2c` (`sites-v187`) — written on 2026-11-02
and carried through the merge of 2026-11-18 without being re-read. By then it was
162 commits behind, so rolling this release back as written would have reverted
application releases 192 through 197 as well, including 197's page-resume and
hydration-readiness fix, when the only intent is to take `/api/mcp` away.
Measured: `git rev-list --count b337756..origin/main` = 162.

**Rollback for this section is WHATEVER IS LIVE WHEN IT IS FROZEN. Read it off
the top of this file at that moment; do not trust a SHA written here.** It is a
rule now and not a number, because every number put here went out of date
before the section was ever used:

- 2026-11-18: still named Sites 187, from 2 November. Rolling back as written
  would have reverted releases 192 through 197 when the only intent was to take
  `/api/mcp` away — 162 commits stale.
- re-pinned to Sites 194 / release 197; releases 198 to 206 overtook it.
- re-pinned to 206; release 207 overtook it.
- 2026-11-24: 207 and 209 are out, and live is Sites Version 197 / release 209.
- 2026-11-24, later the same day: release 210 is out and live is Sites Version
  198. The line above was stale within the hour.

Five pins, five times stale. A rollback that undoes unrelated releases is a
defect rather than a stale note, which is why this carries no number of its own.
Do not mark live until deployment and these checks complete.
