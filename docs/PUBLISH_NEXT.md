# Publish next

**STATUS: ONE RELEASE PROPOSED, ON A BRANCH — application release 198: the fix for last-page reopening in 197. NOT ON `main`, NOT MERGED, NOT PUBLISHED.** It is on `claude/resume-ready-on-mount`. Curtis decides whether it merges; nothing here is to be published until it is on `main` and he has pointed Codex at this file. Until then `main` has nothing pending.

**What is live:** Sites Version 194 / application release 197, deployed 2026-11-18 at 03:28:47.647741 UTC from `12822f60c7e5d76d3702108b33711cc116ca4f61`. Rollback for 197: Sites 191 at `a9f610d42123cd6cfaaf32b61d8c78048d585c82`. Rollback for 198, if it is published: Sites 194 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.

**Why 198 exists.** A re-gate of the published head (PR50 review 5950415977, verdict FAIL, posted after publication) found that **197 reopens the page a person left only when the map's code arrives and draws within about half a second.** On a slow phone, or on the first launch after any release, it opens on the Facility Map — the thing Curtis asked to stop. The live record's "readiness taking more than the 2.5-second script budget falls back to map" is true and understates it: 2 of those 2.5 seconds were being spent on a timer.

PR39 MCP remains separately held and unmerged, excluded from this release. The 197 queue as published: `docs/archive/PUBLISH_RELEASE_197.md`, with a correction at its head.

| Release | What it is | State |
| --- | --- | --- |
| 198 | The map says it is ready when it is drawn, so the app reopens the page it was left on at the speeds real phones run at | On a branch, awaiting Curtis |

## 198 — the map says it is ready when it is drawn

### Source

Release source: `520fa20`, on `claude/resume-ready-on-mount`. Previous: `19f0e90`, the head of `main`, which recorded the 197 release.

The three blocks below were run at `520fa20`, the commit below the one this file is updated in.

```
$ git log --oneline 19f0e90..520fa20
520fa20 BT197-F2: the map says it is ready when it is drawn, not two seconds later
```

```
$ git diff --name-only 19f0e90..520fa20 -- app src tests
app/_components/last-page-live.tsx
src/lib/settings/last-page.ts
tests/fixtures/resume-navigation-server.mjs
tests/settings.test.mjs
```

```
$ git diff --shortstat 19f0e90..520fa20
 6 files changed, 427 insertions(+), 95 deletions(-)
```

Proof of no infrastructure change. This returned nothing:

```
$ git diff --name-only 19f0e90..520fa20 -- supabase package.json package-lock.json .github public worker
```

### Migrations

None. No storage key is added, renamed or read differently. `public/sw.js` and the manifest are untouched. **The inline script at the top of every page is byte for byte the one 197 serves**; what changed is in the page's own code, which sends the signal that script waits for.

### What was wrong

When the app starts fresh on the map and has a page to reopen, a script at the top of the page waits up to **2.5 seconds** for three things: the network to answer, the map's document to finish loading, and the map to say it is ready. Then it moves. If any of the three is late, it shows the map and stays for that run.

In 197 the map said it was ready from a **two-second timer** that started once the map had been drawn. That timer belongs to something else — it is how long a *reopened* page has to stay up before it counts as working. Used here as well, it left half a second for the map's code to arrive and draw.

Measured on the production build, in the real app, through a proxy that holds each script file back by a set time. Time is from the top of the page to the ready signal.

| each script file held back | 197 as live: ready at | 197 result | 198: ready at | 198 result |
| --- | --- | --- | --- | --- |
| 0 ms | 2104 ms | reopened | 91 ms | reopened |
| 100 ms | 2620 ms | **map** | 620 ms | reopened |
| 200 ms | 3120 ms | **map** | 1085 ms | reopened |
| 400 ms | not run | | 2110 ms | reopened |
| 550 ms | 4870 ms | **map** | 2868 ms | map, page still remembered |
| 800 ms | 6105 ms | **map** | not run | |

The review that found this measured it a different way — processor slowed eight times, and scripts 550 or 800 ms late in total — and got 0 of 4 on 197 each time.

### What changed

**The map says it is ready when it is drawn.** Nothing else about when the app reopens a page is different.

What a person will see:

- **A fresh start that reopens a page is about two seconds quicker.** The wait behind the blank screen was mostly that timer.
- **It reopens on a slow phone and on the first launch after an update**, where 197 opened on the map.
- **A phone slow enough that the map still is not drawn 2.5 seconds in** opens on the map for that run, as before. The page it was left on is still remembered, so the next start tries again — unless somebody uses the map, which makes the map the page they were on.

**Corrections to what the 197 handoff said**, which this replaces:

- It said a fresh start that reopens a page is *"a little slower"*. In 197 it was about two seconds slower than it needed to be, every time.
- It gave the wait as 2.5 seconds without saying two of them were spent before the map could say anything. **The limit is 2.5 seconds in both releases; in 198 all of it is available.**
- Its list of when a fresh start lands on the map left out the commonest one in 197: **the map was not ready in time.** With 198 the whole list is:
  - the map is where it was left;
  - the first time the app is ever opened, or after a reset that clears the site's data;
  - the page it was reopening did not stay up, the time before;
  - the network did not answer, the map's document had not finished loading, or the map had not been drawn, within 2.5 seconds — for that run only;
  - a page glanced at and pocketed inside two seconds, on a phone that then closes the app; and the start after one where the move was begun and stopped. Each of those forgets the page once.

Three other things in this commit, none of which a person will see:

- **The page's remembering code moved** out of the component and into `src/lib/settings/last-page.ts`, so that tests can run it. In 197 the ready signal was checked only by a test that read the file's text, and the review switched the signal off without a test failing.
- **The manual test fixture** (`tests/fixtures/resume-navigation-server.mjs`) now runs the app's own code where it had a hand-written copy. Its copy sent the signal at once, so it reported a reopening the app did not make.
- **`CLAUDE.md`** describes the three conditions and when the signal is sent.

### One thing this trades, written down

The two-second timer had also been covering something by accident: whatever the map starts in its own first moments. A move can now begin while the map's first pull from the Shop Cloud is in flight, and a move that stalls is stopped about 2.5 seconds after the map was drawn, where it was 4.5. Stopping ends that pull with the move. The board is drawn from the device's own records and is not affected, and the pull is retried by the cloud's own sweep. **This was read in the code, not measured.**

### Verified

- `npm test` on Windows — **470 pass, 0 fail**.
- `npm run lint` — no error; one warning, in a tool file that is not part of the app.
- **49 bugs planted** one at a time in the module and the component; the tests caught all 49. They include both of the review's F4 mutants, its X2 mutant, and the original fault put back with the source left reading in the right order. Each of those fails a test that *runs* the code, not one that reads it.
- **The table above**: production build, served locally, Chromium at 390 wide, the real inline script in the real app. This is the first time the whole feature has been run end to end in a real page; everything before it used a stand-in window. One run per row.
- **A cold read of the diff** by one subagent that had not seen the reasoning: no blocker, the fix confirmed right. Two should-fix and seven notes, each answered in the commit message of the release source.

**Not verified:**

- **A phone, an iPad, or a real installed copy.** The proxy makes a desktop browser report that it is installed. That a home-screen app the phone has closed starts with no memory of its last run and nothing having sent it there is still what the whole feature rests on, and still read, not measured.
- **A slow processor.** These measurements slow the network. The review's eight-times slowdown was not repeated here.
- **WebKit.** Everything was Chromium.
- **What stopping a stalled move costs** a map whose first pull is in flight. See above.
- **The changes made after the cold read** were not read cold again. They are comments, tests and docs; the code that was measured is unchanged.
- **Two early runs of the measurement were wrong** and are not in the table: the browser was serving the script files from its own cache, so the delay applied to nothing and 197 appeared to pass. The proxy now forbids caching, and 197 then failed as the review said.

### What to check once it is live

On a phone with the app on its home screen. Open the app once after the update, so it has the new version, before starting.

1. Open the app and tap **Defects**. Wait a few seconds.
2. Swipe the app away to close it fully. Tap the icon. **It should open on the Defect Log**, after a short blank moment, without the map appearing first. On 197 this is the step that showed the map.
3. Do step 2 three more times. It should be the Defect Log each time.
4. Tap **Map**. It should go to the Facility Map and stay there.
5. Close the app fully from the map and open it. It should open on the map.
6. Go to the **Defect Log** and leave the phone alone until it has closed the app by itself — an hour, or overnight. Open it. It should open on the Defect Log. **This is still the test that cannot be run anywhere but on the phone.**
7. If step 2 opens on the map: say so, and whether the map appeared at once or after a couple of seconds of blank screen. At once means the phone does not start the app the way the design assumes. After a pause means the map took more than 2.5 seconds to draw, and the limit needs to be longer.

### Open questions for Curtis

- **Does a device restart reopen the last page, or go to the map?** As built, it reopens the page: the app cannot tell a restart from the phone closing it, and the remembered page is still stored. Curtis named a restart as a time the map would be acceptable; whether he wants the map there is his to say, and it is not decided here.
- **The 2.5-second limit** has never been tuned on a real phone. Longer reopens on slower phones and keeps a blank screen up longer when the wifi is dead.
- **BT197-O1, not in this release.** On a phone the Defect Log's SPECIFIC DEFECT list opens inside the form and moves SAVE DEFECT down by 229 px. It does that on purpose — `src/components/shared/combo-field.css` records why: a floating list clips inside the scrolling form, and in the form the results stay above the phone's keyboard. Making it float, or reserving its space, reverses a recorded decision about the form.
- **A switch in Settings** to turn reopening off on a device. Not built.

### Rollback

Sites 194 / application release 197 at `12822f60c7e5d76d3702108b33711cc116ca4f61`.
