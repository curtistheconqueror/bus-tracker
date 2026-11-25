# Publish next

**STATUS: ONE RELEASE PENDING ON `main` — application release 212, from `05d9afd`. NOT PUBLISHED.** A Defect Log removal Curtis asked for on 2026-11-24. No sync, no storage key, no migration. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 199 / application release 211, deployed 2026-11-25 at 00:12:04.200721 UTC from `db6683d66884c3a25de88c896561a3226e1f67b2`. Rollback for 212: Sites 199 at `db6683d66884c3a25de88c896561a3226e1f67b2`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains held and excluded. The 211 queue as published: [release 211](archive/PUBLISH_RELEASE_211.md). Publication evidence is in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 212 | The bar under SEARCH that named the feed window and counted "OLDER BUSES HIDDEN" is removed | On `main`, pending publication — **publish this** |

## 212 — The Defect Log's window banner is gone

### Source

Release source: `05d9afd`. Previous: `4b792a4`, Codex's record of 211. Run at `05d9afd`:

```
$ git log --oneline 4b792a4..05d9afd
05d9afd Release 212: the Defect Log's window banner is gone
```

```
$ git diff --name-only 4b792a4..05d9afd
app/defect-log/page.tsx
tests/defects.test.mjs
```

```
$ git diff --shortstat 4b792a4..05d9afd
 2 files changed, 32 insertions(+), 54 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 4b792a4..05d9afd -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key added, renamed or retired.

### What changed

Curtis, with a screenshot of the bar: *"we don't need this badge banner about other buses hidden. It's not necessary."*

1. **The bar under SEARCH is removed** — "LOGGED 2ND SHIFT · SINCE 14:00 · 80 OLDER BUSES HIDDEN" with SHOW ALL DATES. The ALL ▾ drop-down already names the window on its face ("THIS SHIFT ▾"), and picking ALL there is the way back. Choosing a window no longer adds a bar or moves the feed.
2. **Kept: the bar for a window that cannot be applied.** When the shift hours on a device cover no window at the moment, THIS SHIFT shows every date while the face still reads THIS SHIFT; that bar is the only thing that says so. It should almost never appear.
3. **The search bar is unchanged** ("1 BUS SHOWN · SEARCHING EVERY DATE · SHOW ALL").

### Verified

- `npm test` on Windows — **485 pass, 0 fail** (window-bar tests now assert it is gone and that the unresolved-window bar is still wired). `npm run lint` — no error, the one existing warning. Type-check 238, unchanged.
- **In the dev build at 390:** picking THIS SHIFT shows no bar and the feed stays at the same height; the face reads "THIS SHIFT ▾"; typing a bus number shows the search bar with SEARCHING EVERY DATE.
- **Cold read, one subagent, before the push:** nothing serious. It confirmed no narrowed feed is left unexplained (the face names the window with a saved view or a search; a search's bar says SEARCHING EVERY DATE; Fixed Repairs' own bar is untouched). Two stale comments and a test title were corrected. `PROJECT_HANDOFF.md` still describes the bar — Codex's file, for its 212 record.
- **Not done:** no phone.

### What to check once it is live

On a phone: pick THIS SHIFT on the Defect Log's ALL ▾ — no orange bar appears under SEARCH, and the feed does not jump; ALL ▾ reads THIS SHIFT ▾; picking ALL brings every date back.

## Remaining device checks

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
over from an earlier run: the production build succeeds, **528 of 528 tests
pass** and ESLint is clean. That figure is a measurement of one tree and
nothing more — it moves with any change that adds a test, so re-measure it
here, and CI must re-run on the actual merge SHA before anything is packaged.

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
