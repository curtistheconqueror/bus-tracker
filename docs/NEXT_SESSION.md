# Start here

You are a Claude Code session on the Pace South Bus Tracker. This file is the
entry point: read it, then start working. It exists so a fresh session does not
have to reconstruct the state of the project from a chat transcript.

Two files answer "what is going on":

- **This file** — what is done, what is next, and the procedure for each thing.
- **`docs/PUBLISH_NEXT.md`** — what is waiting to be published. Read its STATUS
  line before saying anything is or is not live.

Two files answer "how does this project work": **`CLAUDE.md`** (the rules that
will get you in trouble) and **`PROJECT_HANDOFF.md`** (domain ownership,
surface by surface). Read `CLAUDE.md` before touching code.

---

## The 60-second orientation

An **offline-first** fleet maintenance app for the Pace South garage. Shop
foremen and mechanics use it on phones and one shop computer, on the floor, on
wifi that drops. Six pages: Facility Map, Down Sheet, Defect Log, Fixed Repairs,
Fleet Campaigns, Settings.

Everything lives in the device's LocalStorage and works with the wifi down.
Supabase ("Shop Cloud") is a copy going somewhere else — it is never where the
data lives. A sync failure is a status line, never a broken board.

**Curtis is the user, and he is a working foreman.** He reports things in shop
language, usually from the floor, usually mid-shift. When he says "bay" he means
a lane running front to back, numbered 1–12. When he says "line 25" he means a
line on a printed sheet he is holding. Take the words literally and check them
against the code; more than one bug in this project has been the app naming
something the shop does not have.


---

## How to run this session without wasting Curtis's money

A full day on this project in September 2026 cost roughly $320 of Opus 5 tokens
for 28 commits. The bill was not the code. Output was 930K tokens and accounted
for under 8% of the money. Input was **512 million** — 550 input tokens for
every one written — because every tool result and every earlier turn is re-sent
on every request. Three rules follow from that, and none of them asks you to
think less hard about the work.

**1. Never switch models mid-session.** Prompt caches are scoped to the model,
and a model switch has no escape hatch — the entire conversation is rebuilt from
scratch on the new model. At a 775K context that is one turn at roughly $7.75
instead of $0.39. If a switch is wanted, do it straight after a `/clear`, when
there is almost nothing to rebuild; the same switch then costs pennies. Changing
the effort level is a softer version of the same hit: it invalidates the
messages cache, so pin it per task rather than nudging it turn to turn.

This rule costs nothing in quality. It exists to stop you downgrading in the
middle of a job, which is the only way a switch here could hurt the work.

**2. Hand mechanical work to a Sonnet subagent instead of doing it in the main
thread.** A subagent gets its own context and its own model, so the main
session's cache is never touched — this is the one way to do cheap work without
paying the switch above. Its forty tool-call rounds never enter your context;
only its answer does.

**This is the rule that can cost quality, so it is bounded.** A subagent
reports a *summary*, and a summary is exactly what `fresh-context-review` was
written about — a commit that quoted a count instead of re-running it, a handler
that reported success over a write that had been refused.

- Delegate: bounded searches with a definite answer, running the gates and
  returning output verbatim, a refactor with a named target, reading a long file
  for one fact.
- Do not delegate: anything touching an invariant in `CLAUDE.md`, designing a
  rule or classifier, reconciling the app against paper Curtis is holding, or
  the verification a "verified" claim will rest on. Those are the four places
  this project has actually been bitten.
- Require evidence, not conclusions. A subagent that says "tests pass" has told
  you nothing; one that returns the output has. Never let a subagent be the
  sole witness to anything you are about to write into a commit message or a
  handoff.

Ten at once is the hard cap, and it is in the never-OK list. In practice this
means one or two.

**3. `/clear` between unrelated tasks — never inside one.** On the day measured,
the brake catalog work was still being re-sent five and a half hours later
during the soft/IDOT build, which shared nothing with it. Clearing between jobs
is free because the state already lives on disk: this file, `docs/PUBLISH_NEXT.md` and
`PROJECT_HANDOFF.md` are the handoff, and they are current because you keep them
current. Clearing *inside* a job throws away the reasoning that job is made of —
do not.

The order that matters: clearing between tasks saves more than switching models
ever will, and it is the only one of the three with no downside at all.

---

## Two pull requests are open; #42 to #46 are on `main`

**Read this before you plan anything.** Measured 2026-11-13.

**#42, #43 and #44 landed on `main` on 2026-11-13**, after Curtis said to go
ahead. #42 and #43 were rebase-merged on GitHub. #44 could not be — it and #42
had both edited the one long import line at the top of
`tests/down-sheet.test.mjs` — so its six commits were replayed onto `main` as
`78c9074..a302396` with that line resolved as the union of both sides, and the
PR was closed with a comment saying so. All 27 commits were stacked and tested
before any was merged, and `main` ended byte-identical to that stack.

**They are on `main` and NOT live.** Codex publishes, from
`docs/PUBLISH_NEXT.md`, when Curtis points it there. Until then the 2px
ADVANCED DETAILS bar is still what the shop's phones draw — do not tell him to
check a fix on his phone that has not been published.

**#45 and #46 landed on `main` on 2026-11-16**, after Curtis said *"Yes, merge
both"*. Merge commits on GitHub, `3ceaa0a` then `be95118`, the way #40 and #41
went in. Both were first merged onto `main` in a scratch branch and the gates
run there — 446 of 446 on Windows, the first full pass on that machine, because
#45 is what lets the unknown-name test run there — and `main` ended on the same
tree. **They are not live either**: both are written into
`docs/PUBLISH_NEXT.md` as part of 194. **The heat section of `CLAUDE.md` is on
`main` now**, and it is the place to read before touching the heat check log.

| PR | Branch | Head | Ahead | CI | Threads | What it is |
| --- | --- | --- | --- | --- | --- | --- |
| **#47** | `claude/scan-paper` | `8e5e364` | 6 | passed at `8e5e364` | **4, then 2 more, from CodeRabbit, all answered** | **SCAN SHEET IS THE DOOR.** The Down Sheet's own SCAN SHEET button takes the photo, works out which of the three sheets it is and opens that sheet's own scanner with the photos loaded. The separate SCAN PAPER button it was first built as is gone. **Was stacked on #46; its base has been `main` since 2026-11-16, and GitHub reports it mergeable** |
| **#39** | `claude/codex-workflow-docs-fn9any` | `17b7b2a` | 9 | green | **2 open**, 1 on purpose | `POST /api/mcp`, five read-only tools. **Conflicted — see below** |

#47's row is as pushed and as read from GitHub on 2026-11-16. #39's was read on
2026-11-13 and not since; it sits behind `main` by everything merged after that
and will need rebasing before it can land.

**#47 was built on 2026-11-13 as SCAN PAPER, a fourth button on two pages, and
REBUILT on 2026-11-15 as the Down Sheet's own SCAN SHEET button** (`70cd3f8`).
Curtis: *"I'd rather the current scan button just do the job"* and *"we will
put the other button on the back burner."* The Defect Log has no door now; its
SCAN SWEEP and SCAN HEAT SHEET open their scanner directly, and it still takes
photos handed over from the Down Sheet. He also said *"we can just place this
button anywhere we want for ease of access"* — the component takes its route
as a prop for that, and WHERE it goes is his call before it moves.

**It WAS stacked on #46** because the heat scanner only existed there. #46 is
on `main` now and #47's base was moved to `main` on 2026-11-16. **It is still
not to be merged until Curtis says.** Two cold reads by a subagent: 14 findings on the first build, 9 on
the rebuild, each with one Major, all answered and listed in the PR body. The
rebuild's Major is worth knowing: with no direct button left, the door could
strand a Down Sheet the look had split or cut short, so every question screen
now has a way to send every page to any sheet, and the look gives up after 20
seconds. **The 81 planted bugs from the first build were not re-run on the
rebuild.**

**CODERABBIT DID NOT REVIEW #47 BY ITSELF while it was aimed at #46's branch.**
It skips a pull request that is not aimed at `main`. The base is `main` since
2026-11-16, so a new push may now get a review unasked; nothing has been pushed
since to find out. Curtis asked for its
review on 2026-11-15; a comment reading `@coderabbitai review` on the pull
request is what starts one, and it only reads commits it has not read. It left
four findings on `70cd3f8`, one Major — the sweep and Down Sheet scanners let
the photos change while a read was running, and on the Down Sheet the import
that followed replaced the sheet without the added page. All four are answered
in `9ebf489`, each on its own thread, with a ledger comment; a cold read of
those answers found eight more things, six fixed, one unchanged and one
declined (next paragraph).

**ITS SECOND PASS, on `9ebf489`, left two Minor findings and one open
question, answered in `8e5e364`.** The notes box and its "keep" tick stayed
live under a read in the sweep and Down Sheet scanners, though a read sends the
notes it started with; both are now disabled while a scanner reads, and a
locked box and its label dim to .55 so they do not look live (the heat
scanner's box shares the class and now shows its lock too). **That is a flow
change and it is Curtis's to keep or reverse:** on a hand-off the read starts
by itself, and until `8e5e364` a note could be typed while it ran and was used
on the next read after CHANGE PHOTOS. It was put to him the same night and is
not answered. The open question was the keyboard: the bot would not take
synthetic key events, so Tab and Shift+Tab were driven with trusted presses
through the browser's input layer (17, every one `isTrusted`), including after
a button is disabled and after the buttons are replaced, and focus stayed in
the box each time. That is not a hand on a physical keyboard. A cold read of
`8e5e364` found no defect; it declined-and-recorded two things: `disabled`
rather than `readOnly` means a phone may not be able to scroll the notes during
a read, and nothing measured a phone.

**Where `8e5e364` stands.** CI passed. CodeRabbit was asked again and its check
passed; twenty minutes on it had left no new finding, only a reply on the
keyboard thread: it accepts that the trusted presses exercise the browser's
tab order, and **holds that thread open until somebody presses Tab and
Shift+Tab on a physical keyboard** after a control is disabled or replaced.
That is Curtis's to do or to waive; nothing here can.

**A SCANNER'S OWN READ HAS NO TIME LIMIT, and that is recorded, not built.**
The first look gives up after 20 seconds; the read after it never does. On
wifi that is joined but dead the scanner sits on READING for good, and since
`9ebf489` the photo controls are locked with it — CANCEL and the X still work.
A limit needs a number for how long a real read of a real sheet takes, and
nothing here has ever read one.

**What it costs, which Curtis has been told:** every Down Sheet scan pays the
first look, and notes for one scan cannot be typed before the first read.

Three more things worth knowing before touching it:

- **It is the one place the app changes page with the router instead of a full
  load**, because the photos cross pages in memory only. That leaves both
  pages' stylesheets loaded afterwards. Measured on the built worker: the
  Defect Log reached that way is 78 of 80 elements identical to a fresh load,
  the Down Sheet 138 of 148 (five board toggles 44px for 38px). One board
  state, one width. `CLAUDE.md` on that branch records it as a risk introduced
  and not removed.
- **`/api/scan-identify` has never seen a real photograph.** Every browser
  check stubbed the route's answer.
- **How to drive the BUILT app locally**, which nothing here had written down:
  `npm run build`, then `npx wrangler dev -c dist/server/wrangler.json --port
  8788 --local`. `vinext start` serves the pages and 404s every asset, so
  nothing hydrates and every measurement is of dead HTML.

**#46 failed its SDET gate at `79c4e58`, and all 14 findings were answered on
2026-11-13** in `f0a98f8` and `cd21990`, each on its own thread, with a ledger
in a PR comment. The Major — UNDO THIS TAP mounting above the heat list and
pushing every row down — is fixed and re-measured: no row moves at 390 or 1180.
It was reviewed again after that — CodeRabbit, below — and is merged. The
branch CONTAINS `main` (`43e9594` merges
it in, because the branch is published and is not rebased), so "ahead" is no
longer one commit.

**WHAT CURTIS DECIDED ON 2026-11-15, so nobody re-asks:** land #45 and #46;
**hold #47** — said of SCAN PAPER as a fourth button; later the same day he
asked for SCAN SHEET to do that job instead, which is what #47 now is. It
stays open, is kept current with #46, and is still not to be merged until he
says; leave #39 (the MCP route) until later, with
READ solved before any write. **On 2026-11-16, asked whether to merge #45 and
#46 now, he said *"Yes, merge both"*, and they were.**

**#46 moved four commits on 2026-11-15, to `d1d1b05`.** `db185e6` and `0770ca5`
answer BT46-F3 and a cold read of that answer. `af4925f` builds two calls he
made: **the heat walk holds its order once a check is recorded** (measured
before: a NO HEAT tap moved 5 of 8 rows; after: 0 of 8), and **A/C Buses is
cooling, not the whole category** (the 24 A/C and HVAC repairs split 18 and 6,
none on both — re-run by a second session, not quoted). `d1d1b05` is the
`CLAUDE.md` correction those needed: it still said the A/C change was waiting
on him. Gates on Windows at that head: 445 of 446, the one failure being the
type-check test #45 fixes.

**CodeRabbit read `0770ca5` and `af4925f` the same afternoon and left five
findings, one Major**: one bus number twice on ONE photo with one line blank
arrived ticked, because the blank copy was set aside before the same-photo
rule was asked. All five held and are answered in `f9c9e10`, each on its own
thread with a ledger comment: PUT BACK reads the page's copy of the way back as
well as the device's; `undoHeatCheck` no longer calls an unreadable log
"nothing to undo"; a bus that arrives mid-walk is held from the next recorded
check (`heatWalkPin`); and PUT BACK leaves a No Heat record off a bus already
on No Heat Buses. A cold read of those answers found seven more things, six
fixed and one declined — with the stored write refused AND a second tab, a
removal held only in memory is dropped when the other tab puts an older one
back. **`f9c9e10` is the head that was merged on 2026-11-16.** GitHub's CI and
CodeRabbit's check both passed on it; CodeRabbit posted no review of that
commit and no new comment.

**Still with Curtis on the heat check log, not built:** whether each OK row in the scan review
needs its own way to be turned down; whether a struck-through row means fixed;
and, new, whether the lane tab's count should follow the held walk — it counts
the whole roster, so TO DO can read 6 above eight rows. **What it has never
done is read a real photograph**: `/api/heat-sheet-scan` needs the OpenRouter
key, which the development machine does not have. Curtis has photographed the
real sheet twice — the second, from an iPad, shows all 108 printed bus numbers.

**A DOWN SHEET SCAN ONLY IMPORTS BUSES THE SCANNING DEVICE ALREADY HAS.**
`mergeReviewedRows` keeps rows whose bus matched that device's board; a row
for a bus it does not know is drawn in the review as NOT IN FLEET with its
tick box disabled, and is counted in "flagged", but it cannot be imported.
Curtis met this scanning a 30-bus sheet on an iPad whose board held 64 buses
against the phone's 100-plus. **Until its board is full, do not scan from the
iPad.** Whether a sheet should be allowed to introduce a bus is his design
call and nothing is built. One more scanner fault is recorded and not built:
LINES NOT READ cannot see a read that gives up partway down the page. (The
other one listed here — the sweep and Down Sheet scanners not freezing their
photos mid-read — is fixed on #47 in `9ebf489`, and only there.)

**Found while answering #46 and NOT fixed, because it is older than that
branch:** `put()` in `src/lib/storage/fleet-restore.ts` ignores
`writeSetting`'s result and pushes its label regardless. On a disk that fills
after the board write, MASTER IMPORT reports map settings, the Down Sheet and
campaigns as restored when only the board landed. Probed, not reasoned.

**#39 is `dirty`** — it was opened on 2026-10-20 and `main` has moved a long
way since. Of the eleven files it touches, two conflicted when this was
measured on 2026-11-12: `docs/PUBLISH_NEXT.md`, which every release rewrites,
and `tests/helpers/modules.mjs`, where `main` and the branch each appended
export lines at the same end of the file — keep both sets. **That was measured
before the 27 commits landed; measure again before relying on it.** Resolving
it means rebasing that branch onto `main` and rewriting its handoff section
against the new base — and its two release gates are Curtis's anyway, so there
is no hurry.

**Why these are branches and not `main`.** Curtis: *"When u r done with
everything push it so SD-QG engineer can review it / Don't make live just
push."* Once he says merge, they go to `main` and each gets its section in
`docs/PUBLISH_NEXT.md`.

**The `Supabase Preview` check fails on every commit on `main`** and has since
at least `92dfc0d` on 2026-11-05; on pull requests it is skipped. `Lint, build
and test` is the gate and is green. Nobody here has looked at why, and it is
Curtis's integration to look at.

### Still Curtis's call, not yours

- **Merging #47 and #39.** Never merge on your own.
- **Two things on #47.** Whether the notes box stays locked while a scanner
  reads (`8e5e364`; put to him, not answered), and pressing Tab and Shift+Tab
  on a physical keyboard in the SCAN SHEET box, or waiving it — CodeRabbit
  holds one thread open for that.
- **Pointing Codex at `docs/PUBLISH_NEXT.md`.** That is how 194 goes live.
- **An actual iPhone.** `overflow:clip` and the row swipe were measured in
  Chromium with real CDP touch events. Real iOS Safari was never touched.
  Older WebKit drops `overflow:clip` and falls back to `visible`, which
  degrades safely — but that is reasoning, not a measurement.
- **The Down Sheet share bar is now permanent** — 101px on a phone where it
  used to be 0px unless a quick filter was picked. He approved building the
  feature; he has not seen where it landed. Reusing the quick-filter bar rather
  than inventing a second control is the piece worth his eye.
- **#39's two release gates**, both writes to his live Supabase project: a
  dedicated reader identity (a new account is *not* enough — every policy in
  `0002_shared_records.sql` grants insert and update to `authenticated`, so it
  needs restrictive policies), and verified runtime configuration with real
  authorized reads.
- **#39's `?token=` thread is left open deliberately.** It is a recorded,
  temporary accepted risk, written up in docs/MCP\_SECURITY\_FOLLOWUP.md — a
  file that arrives **with that PR** and is not on `main`, so do not go looking
  for it here. Do not resolve that thread to tidy the PR. It is CodeRabbit's
  Major on the PR's own `src/lib/mcp/agent-token.ts` (also not on `main`). The
  PR's **second** open thread is a separate Minor on `docs/PUBLISH_NEXT.md` —
  one of the two files that conflict, so a rebase will likely moot it.

### A self-scheduled check-in may still be running

An earlier cloud session scheduled a `send_later` reminder every 8 hours to
re-read #42/#43/#44. **Those three are merged or closed, so it has nothing left
to watch and should be stopped.** It could not be stopped from the desktop
session that did the merging — if you are the session that owns it, stop it.

---

## Where things stand

| | |
| --- | --- |
| Branch | `main`, fast-forward pushes only, no force-pushes ever. **Two PRs are open, #47 and #39. See the section above before planning anything.** |
| Live | See the STATUS line of `docs/PUBLISH_NEXT.md`, and `docs/RELEASES.md` for the version table |
| Pending publication | The same STATUS line — it names what is queued and what it publishes from |
| Working tree at handoff | Read it with `git status` and `git log -1`; a commit named here is stale by the next push. |
| Gate at handoff | All four green: the full suite passing, ESLint clean, production build succeeds, and a cold read of the diff answered. Run them; the count moves with every change that adds a test. |

**Neither is the test count, for the same reason.** It was written down as 229
by the very commit that added the 230th test, so the first thing a fresh session
read was a number its own suite disagreed with.

**Which version is live is deliberately not written here.** Codex publishes and
owns `docs/PUBLISH_NEXT.md`, `docs/RELEASES.md` and `PROJECT_HANDOFF.md`, and it
publishes while sessions are running — this row named a version and a commit and
was wrong within the hour, twice. Read it from the file Codex updates rather
than from a number copied into this one.

**There is no stash and there are no uncommitted changes.** If you find some,
somebody left them there after this file was written — read them before doing
anything else, because this container is disposable and a stash does not
survive it.

---

## The workflow with Codex — read this before pushing anything

This project has two agents and they do different jobs. Getting this wrong is
the single easiest way to break something.

**You write code. Codex publishes it. You never publish.**

Specifically, you never: run a deploy, tag a release, edit
`.openai/hosting.json`, touch Sites credentials, or mark anything live. Not once,
not "just to check", not because a build succeeded.

The two of you communicate through exactly one file, at exactly one path:
**`docs/PUBLISH_NEXT.md`** on `main`. Curtis approves a release by pointing
Codex at that file. That is the whole protocol.

### Your half of it, step by step

1. Do the work on `main`. Small, coherent commits.
2. Run the gates (below). All four — the three commands, and a cold read of
   the whole change against `main` by one subagent that has not seen your
   reasoning, every finding of which is fixed in a named commit or declined
   with the reason on the record. See `.claude/skills/fresh-context-review`.
3. Commit and push to `main`.
4. **In a separate commit, add a new version section to
   `docs/PUBLISH_NEXT.md`** and update its STATUS line, the summary table, and
   the "N releases are pending" paragraph. Push that too.
5. Tell Curtis what you did and that it is queued. Stop.

### What a version section must contain

Codex publishes from it, so every mechanical claim in it has to be true. Do not
quote a number from memory or from earlier in your own session — re-run the
command and paste what it says.

```
## Source
  Release source: the exact short SHA
  The commit list:      git log --oneline <previous>..<yours>
  The changed files:    git diff --name-only <previous>..<yours> -- app tests
  The size:             git diff --shortstat <previous>..<yours>
  Proof of no infra change — this must return nothing:
    git diff --name-only <previous>..<yours> -- supabase package.json package-lock.json .github public worker

## Migrations
  Say "None" only if it is true. A NEW LocalStorage key is not a migration but
  must be named. A renamed key is forbidden outright.

## What was wrong / What changed
  In Curtis's language, not in function names.

## Verified
  What you actually measured, with the numbers.

## What to check once it is live
  A numbered list Curtis can walk through on his phone in the shop.
```

### When Codex has published while you were working

This happens often — you will find your push rejected. It is normal.

```
git fetch origin main
git log --oneline HEAD..origin/main    # look at what it did before reacting
```

Codex may have **taken your version number**. If it did, renumber yours. Then:

```
git checkout -B main origin/main
git cherry-pick <your code commit>
npm test && npm run lint               # re-run the gates on the rebased commit
```

Rewrite the handoff section against the new base — new SHA, new "previous",
new diff ranges — and say in the commit message that the gates were re-run on
the rebased commit rather than carried over. **Rebase onto Codex's work. Never
merge over it and never force-push.**

Codex also owns `PROJECT_HANDOFF.md` and `docs/RELEASES.md` after a publish, and
it resets `docs/PUBLISH_NEXT.md` to `STATUS: NONE PENDING`. Do not fight it for
those files.

---

## The work queue

In the order Curtis asked for it. Each has enough here to start without asking.

### 1. Extend a deferment from the Deferred popup — BUILT, in `fe467c0`

> "when I hit deferred, I need an option in that pop-up to extend the time of
> the deferment."

**Shipped as release 179.** `fe467c0` added `src/lib/defects/deferral-clock.ts`
and both controls Curtis asked for, in both readings of the sentence: **HOLD
UNTIL** revealed in the Defect Log editor when DEFERRED is ticked, and **HOLD
UNTIL / EXTEND** on the held row itself. `deferredAt` is deliberately not
restamped, so pushing the clock never resets the 90-minute badge.

**It is kept here, struck, for the same reason the DELETE button below it is.**
This entry sat open for weeks after the work landed, and in one session it was
offered back to Curtis twice from the title alone. A queue is a claim about the
code, and only the code can settle it: check before you offer, and strike it
here the moment you find it built.

### 2. A DELETE button per Down Sheet entry — BUILT, in `5dd3a99`

> "There is no quick remove as fix or just undo, and just a simply DELETE button
> on the downsheet list like the defect log for each entry... Best is to fold it
> in on face card of each bus."

**Done, and kept here as a worked example rather than as work.** The `×` sits on
the bus's own cell beside the `✓` — folded into the face card as asked, not in a
tenth column, because this table scrolls sideways on a phone and a control off
the right edge is one you have to go looking for. Curtis on the result: *"that X
next to the check mark is fine visually. Very easy to see."*

The removal travels: `rememberRemovedEntries` is called at deletion and PUT BACK
calls `forgetRemovedEntries` **and restamps `updatedAt`**, or the row would lose
to its own tombstone and delete itself again. The tombstone is written only
after a storage write that succeeded — the other order reads identically until a
device is full, and then tells the shop cloud to drop a row this device still
holds.

**WHY IT IS STILL WRITTEN DOWN.** This entry sat in the queue as pending for
eight days after it shipped, and a GitHub issue was opened from it. In one
session it was twice recommended to Curtis as available work, from the title
alone, without the code being checked. **A queue is a claim about the code, and
the code is the only thing that can settle it** — check before offering, and
strike the item the day it lands.

### 3. Parked, older, still open

- **iPad**: `ON CONFLICT DO UPDATE command cannot affect row a second time`.
  Seen on an iPad during sync. Not reproduced since the Version 152 and 159
  tombstone fixes, which changed how rows are batched — **re-check whether it
  still happens before investigating it.**
- The backup-reminder interval control sits in the wrong Settings section.
- Rename SORTIE (Curtis's wording; ask him what it should read as).
- A welcome / landing page.
- A live two-device sync test — never actually run with two real devices.
- 15 editor controls below the 44px touch target on iPad. Deliberately deferred;
  do it as an iPad-scoped pass without collapsing the tablet two-column layout.
- **FLEETSTEP still sits 3-5px further in on the Facility Map and the Down
  Sheet**, and it is their 5px page frame (3px on a phone), not their padding
  — the six pages with no frame now land on exactly the same x and y at 390
  and 1180. Closing it means either dropping those two frames or trimming
  those two headers' padding by their own frame width. **Both are visible, so
  both are Curtis's call before building either.** Measured in 194.
- **The eight pages switch to their phone layout at three different widths**
  — 760, 800 and 860 — so on an iPad held in portrait at 820 the header titles
  spread by 6px again. Unifying that moves real layouts at those widths on
  several pages; it is not a tidy-up, and it needs saying first.
- **Each page still has its own ACCENT colour** under the now-shared header:
  rust on Incidents, green on Shop Talk, bright blue on the Down Sheet. 194
  shared the header BAR only. Whether the whole block should match is open.

### 4. Built, and on `main` — do not rebuild

Every one of these is written, reviewed and **on `main`, waiting on Codex to
publish** — not live. Check before offering any of them to Curtis as work; this
project has twice re-offered finished work from a queue title alone.

- **A repair can carry more than one part** (#42) — PART NUMBER / PART NAME is
  a list with ADD ANOTHER PART, in both the Defect Log form and the Fixed
  Repairs completion editor. Parts memory still learns only the first numbered
  part; the notes say why.
- **The focus share follows the window, and a swipe drops one defect from it**
  (#42) — swipe a row left, or press HIDE because the shop computer is a
  mouse; PUT BACK returns the last one. The share refuses to send an empty bus,
  which would read as a clean one.
- **The DS badge no longer cares where a bus is parked** (#42) — the map's
  three-way badge filter is gone; SHOW BADGE in Settings is the one switch.
- **MARK FIXED** on the Down Sheet's green tick (#42).
- **ADVANCED DETAILS is a 48px bar again instead of a 2px line** (#42) — see
  the top of this file. This is the one with floor impact.
- **PRELIMS** replaces WORK DONE SO FAR on the Defect Log form (#43). PRELIMS
  rather than PRELIMINARY CHECKS because two of the six boxes are not checks —
  ROAD CALL says what the bus did, OPERATOR REPORTED says where the report came
  from — and the repo already says so in its own words.
- **Share the Down Sheet itself** (#44) — the three actions already existed and
  were gated behind picking a quick filter, so the one thing that could not be
  sent was the sheet. The gate is removed rather than a second sharing system
  built, and `downSheetShareScope` in `src/lib/down-sheet/down-sheet-share.ts`
  decides what the heading may claim. **`bandEntries` drops IDOT-only rows
  unconditionally**, which is why WHOLE SHEET had to be computed from what was
  drawn against what the sheet holds rather than from a list of filters — a
  list goes stale the moment the next row filter lands.
- **A heat check log** (#46, on `main` since 2026-11-16) — SCAN HEAT SHEET on
  the Defect Log, a CAMPAIGNS board with a NO HEAT walking list on Fleet
  Campaigns, `pace-heat-checks-v1`, and A/C Buses narrowed to cooling. Its
  rules and its four known limits are in `CLAUDE.md`. **Its photo read has
  never seen a real photograph.**
- **The unknown-name test runs on Windows** (#45, on `main` since 2026-11-16)
  — so `npm test` passes in full on Curtis's machine, and a failure of that
  test there is now a real one.

---

## How to check your work

```
npm test          # builds first, then every file in tests/
npm run lint
npm run build
```

All three, every time, and then the cold read: one subagent on the whole
diff against `main`, handed the code and never your conclusion, with every
finding answered. It is the standing replacement for the review bot this
project used until its trial expired, and `.claude/skills/fresh-context-review`
records the nine findings that make it a gate rather than a courtesy.

`npm test` runs the build itself, so a green suite means
the build is green too.

**Measure the UI in a browser. Do not read the CSS and conclude.** Nearly every
significant layout bug in this project was found by measuring and missed by
reading: a badge clipped by exactly 21px, a fixed element covering a section at
one breakpoint, a control rendering 0px wide.

```
npm run start                        # production build, port 3000
# exactly one server — a second one serves a stale asset manifest
# and you get ERR_EMPTY_RESPONSE on the JS bundle
```

Chromium: `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
Playwright: `/opt/node22/lib/node_modules/playwright/index.mjs`

Wait past the hydration race or you will measure the seed board instead of the
real one — wait for a selector that only the real board produces. Phone widths
to check: 360, 390, 430. iPad: 820 portrait, 1180 landscape. The phone
breakpoint is `@media(max-width:620px)` and there is more than one such block in
`globals.css`, so match on content rather than position.

The `.claude/skills/` directory has four skills that travel with the repo and
are worth reading before the situations they describe: `browser-verification`,
`fresh-context-review`, `cascade-check`, `connector-reach`.

---

## Traps this project has actually fallen into

Every one of these cost real debugging time. They are here so it is not spent
twice.

**Four GitHub reads that each returned a confidently wrong answer, in one
session.** Every one of them produced a false statement to Curtis before it was
caught.

- A review thread's resolved flag is **`is_resolved`** on the MCP
  `pull_request_read` route and **`resolved`** on the CCR REST route
  (`gh api repos/<owner>/<repo>/pulls/<n>/ccr/review_threads`). Reading the
  wrong key reported "every thread closed" when 30 of 41 were open, and later
  the exact reverse. **Dump the keys before trusting a count.**
- `gh api .../reviews` returns 30 of 91 without `--paginate`, and is not
  newest-last.
- `gh pr view --json` goes through GraphQL and 403s here. `gh` itself works —
  use the REST endpoints.
- The MCP `get_status` method returns **legacy commit statuses only**. It reads
  `pending, total_count 0` on a PR whose CI is green, because CI here is
  Actions check runs. Read `.../actions/runs` instead.

**This container's clone is SHALLOW, so git will lie to you about history.**
`git rev-parse --is-shallow-repository` returns true and `.git/shallow` lists
four grafted tips. `main` reads as 51 commits with a root dated two weeks ago.
Consequences, all hit in one sitting: `git merge-base` finds none between
`main` and a three-week-old branch, `git merge-tree` says **"refusing to merge
unrelated histories"**, and `--is-ancestor` answers confidently and wrongly.
None of that is true of the repository — only of this clone. **Never conclude
that a branch is merged, unmerged, orphaned or conflicted from local ancestry
here.** Ask GitHub (`gh api repos/<o>/<r>/pulls/<n>` gives `mergeable` and
`mergeable_state`, computed against the full history), or deepen the clone
first with `git fetch --unshallow`.

**A stale remote-tracking ref will answer a question about the wrong commit.**
`git rev-parse origin/<branch>` returned `main`'s SHA for a branch whose real
head was 14 commits away, and an `--is-ancestor` check built on it concluded a
PR was already merged and its files deleted from `main`. `git ls-remote --heads
origin` disagreed. Before concluding anything about what is merged, fetch with
`--prune --force 'refs/heads/*:refs/remotes/origin/*'` and compare the local
refs against `ls-remote`.

**A mutation-test tally that counted skips as kills.** The script computed
`len(MUTANTS) - len(survived)` and printed `12/12` while printing
`SKIP (anchor missing)` three times above it — three mutants never ran, because
later commits had rewritten the exact lines they anchored on. The figure was
published in a PR and had to be retracted. **A skipped mutant is not a caught
one; make the arithmetic unable to say otherwise.**

**A text gate that bans one spelling bans one spelling.** Five gates written in
this session each matched a single way of writing the thing they forbade, and a
reviewer walked a mutant past every one: `setFocusExcluded.call(...)` past a
check for `setFocusExcluded(`, `if (!quickFilter) return;` with a space past a
check without one, `role={"status"}` past a check for `role="status"`. Collapse
whitespace before asking, count identifiers rather than call spellings, and
**drive every mutant rather than reasoning about coverage.** One of them could
also pass *vacuously* — its `indexOf` anchor returned -1 and it cheerfully
checked the tail of the file.

**`git push | tail -1` hides a failed push.** A pipeline returns the exit code
of the *last* command, so `tail` reports success over a rejected push. Test the
exit code of `git push` itself.

**`pkill` returning 144 aborts a chained Bash command.** Anything after the
`&&` silently does not run. Run it on its own line.

**Postgres checks NOT NULL on the INSERT half of an upsert before it reaches
the conflict.** Both `bus_defects` and `down_sheet_entries` have
`fleet_number text not null`. A tombstone row carries no fleet number by design,
so it can never ride in an upsert — it takes the whole 200-row chunk down with
it. Tombstones go as `UPDATE ... WHERE <key> = ...`. `pushPlan` in
`src/lib/cloud/cloud-client.ts` does this partitioning; do not undo it. This bug kept the
shop cloud failing on every 45-second sweep for a week.

**The merges are additive on purpose.** `mergeDefectLog` and `mergeDownSheet`
keep every record the receiver alone holds and add every incoming one. That is
what lets two devices each add work without erasing the other's — and it means
**a removal can never travel as an absence.** A removal has to be recorded and
pushed as a tombstone. The Down Sheet went without that and a 57-bus sheet read
92 fifteen seconds later.

**`.grow` is `display:contents`.** It paints nothing of its own, so a border
must land on its children (`<strong>` and `.spot`), never on `.grow`.

**Tailwind utility classes collide with our own.** A `className="fixed"` once
lost to Tailwind's `.fixed` and broke a tile at every width.

**`globals.css` gives every bare `<header>` `height:38px`,** which `min-height`
cannot undo. Find out what already styles an element before adding a size to it.

**The Node test runner strips types from `.ts` but not `.tsx`.** Import `.ts`
modules directly in tests; assert on `.tsx` by reading the file as text.

**An empty connector listing is evidence about the listing, not about access.**
A session once spent an hour concluding a Supabase project was unreachable; the
token could reach it the whole time and `list_projects` simply had not
enumerated it. Read `.claude/skills/connector-reach` before telling Curtis
anything is inaccessible.

---

## Things that are never OK

These are in `CLAUDE.md` too. They are repeated because they are absolute.

- **Never force-push or rewrite published history.** Fast-forwards of `main`
  only.
- **Never rename a LocalStorage key.** It silently orphans a mechanic's board.
  Adding a key is fine; renaming one is not.
- **Never delete or merge repair records to simplify the UI.** History is the
  point of the app.
- **Never commit** API keys, credentials, fleet backups, photographs, or
  anything employee-sensitive.
- **Never write to the live shop database without asking Curtis first.** It is
  his running shop's data. Reading to diagnose is fine and has been useful;
  writing is his call, every time.
- **Never run more than 10 subagents at once**, on any model, at any effort
  setting. Curtis set this after a review workflow ran 88 agents and spent
  5.9 million tokens verifying one module.
- **Catalog renames are read-time, never rewrites.** Nothing on disk is ever
  rewritten to match a new wording.
- **The Down Sheet owns the DS badge.** The map reads that membership back
  rather than deciding it. No import, transfer or sync may assert it — there is
  deliberately no `down` column in the `buses` table for this reason.

---

## Writing code here

Match the surrounding style rather than a general one. This codebase is dense —
minimal whitespace, short names in hot paths — and comments carry the *reasons*,
including what went wrong before. When you fix something, say in the comment
what the failure looked like on the floor, not just what the code now does. That
is why the traps above could be written down at all.

Commit messages are the same: what was wrong, why it was wrong, and what changed
— in the words Curtis would use.
