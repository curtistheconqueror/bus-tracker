# Publish next

**STATUS: ONE RELEASE PENDING — application release 197: the app reopens on the page it was left on, and a door on the Doors group.** Not published. Application release 196 is live as Sites Version 191, deployed 2026-11-17 at 07:12:36.997726 UTC, from `a9f610d42123cd6cfaaf32b61d8c78048d585c82`; that is also the rollback for 197. PR39 MCP remains separately held and unmerged, and **is not in this release.**

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

One release is pending. It holds two changes Curtis asked for on 2026-11-17.

| Release | What it is | State |
| --- | --- | --- |
| 197 | The installed app reopens on the page it was left on, not the Facility Map | Queued, not published |
| 197 | The Doors group under Bus Accessories is drawn as "🚪 Doors" | Queued, not published |

The record of 196 and everything before it is in `docs/RELEASES.md`; the former queue is in `docs/archive/PUBLISH_RELEASE_194_195.md`.

## 197 — reopen where you left off, and a door on Doors

### Review correction (2026-11-18)

PR50 CodeRabbit found early replacement could abort the still-loading fallback map. Replacement now requires both document load and the hydrated page settling signal, within the original 2.5-second script budget. If either is late, the map remains and continues loading uninterrupted; readiness arriving later cannot navigate away. A normal fresh resume now waits roughly two seconds plus destination loading. Slower devices may stay on the map for that run.

The 2.5-second deadline starts when the inline script executes, NOT at app launch: the unchanged network-first service worker can stall fetching the initial document before this script is delivered. No bounded cold-launch guarantee is claimed.

Targeted executable cases cover readiness in either order, late readiness, and a stalled destination. A Chromium loopback fixture using the production inline script verified a delayed map script (700ms) completes before destination GET, then fallback controls work after cancellation; a 4000ms script continues loading with no destination GET and controls work after it arrives. This fixture is not a physical iOS/PWA or full-map integration test.

### Source

Release application source and last code-changing commit: `ce326a07b83cc5b11285ca86b8f48ecc82d7e53e`. This contains the startup readiness correction. The earlier `a5098c6` / `6308003` candidates MUST NOT be published. Publish the validated current branch HEAD containing this correction and its release documentation; record its full SHA in the Sites save. `6088dc5` adds only checklist wording after the application fix; this commit corrects only release documentation.

Verified history through `6088dc5` (run 2026-11-18):

```
6088dc5 Clarify initial document delivery in weak-network check
ce326a0 Wait for a complete hydrated map before resuming last page
1b2ac33 The handoff: Curtis's answer on Incidents and Settings, and when the map
a5098c6 Every page reopens, on every device: Curtis's answer
6219109 Queue reopening the last page in 197, beside the door
6308003 The app reopens on the page it was left on
a27d269 Queue the door on the Doors group as 197
0dc91ce A door on the Doors group
```

The former verification command blocks were run at `a5098c6`, before the readiness fix; they are not evidence for the corrected candidate. Corrected application `ce326a0` passed a fresh production build, all 470 tests and ESLint (zero errors; one existing warning). Exact-head CI for `6088dc5`: run 44228532300 passed. No dependency, backend, service-worker or manifest changes are included.

### Migrations

None, and nothing stored is rewritten.

**One new LocalStorage key: `pace-last-page-v1`.** It holds the address of the page this device was left on and two times. Per device, never synced, not in MASTER EXPORT. It is listed in `CLAUDE.md`.

One `sessionStorage` name, `pace-launch-seen`, marks the first page of a run of the app. It is gone when the app is closed, which is what it is for.

**For Codex, one thing to check that is not a migration.** Every page's HTML now begins its `<body>` with an inline `<script>` that starts `(function(config,win){`. It is a string constant in `src/lib/settings/last-page.ts`, and a test finds it whole in `dist/server/index.js`. If the deploy step re-bundles or minifies the server output, check the live page source still holds that script as written. If it has been rewritten, the feature fails safe — the page is shown and nothing moves — but it will not work.

### What was asked for

Curtis, on the reopening: *"when I leave phone app and go back in I want it to return to the tab I was using. Not default back to map. I was using the defect log. This may be the correct way to use the app or most apps."*

Curtis, asked afterwards whether a shared iPad should leave Incidents and Settings out: *"Phone and shared iPad should act the same: reopen on whatever page I left, including Incidents, Settings and Defect Log. Only fall back to the map after a reset, a device restart, or something like that. I don't want to tap Defect Log every time I switch apps and come back 3 minutes later."* That is what was built, so nothing changed for it.

Curtis, on the door: *"Please put a door 🚪 emoji on the doors defect."*

### Why it went back to the map

The app saved to a home screen starts at the address its manifest names, which is the Facility Map. A phone keeps an app alive in the background for a while and then closes it without saying so. The next tap on the icon is a fresh start at the map. Changing the manifest would not help anybody who already has the icon: iOS reads the start address once, when the icon is made.

### What changed: reopening

**Close or leave the app on any page, and the next time it starts fresh it opens on that page.** Any of the eight: Facility Map, Down Sheet, Defect Log, Fixed Repairs, Fleet Campaigns, Incidents, Shop Talk, Settings.

What a person will see:

- **A fresh start on, say, the Defect Log.** The screen is blank for a moment longer than before — the app starts at the map as it always did, checks the network is there, and moves. The map is not drawn in between.
- **Only the page comes back, not what was open on it.** A half-typed defect, an open scanner, a search box: gone when the phone closes the app, as before.
- **Tapping Map always goes to the map.** So does every other tile, the page list in the header, REFRESH, and RELOAD on the crash screen. Only a fresh start is turned round.
- **Only an installed copy does this.** The app on a phone's or iPad's home screen, or installed from a desktop browser. An ordinary browser tab is left alone, so a bookmark to the map still opens the map.

What it does when things are wrong:

- **Wifi that is joined but dead.** Once the inline script has arrived, if network/readiness has not completed within 2.5 seconds, the current map document is revealed (and may still be loading) and the app stays there for that run. The page that was left is still remembered for next time, unless somebody uses the map.
- **A page that will not draw.** A reopened page is on probation until it has stayed up for two seconds. If it never does, the next fresh start is the map. Closing the app and opening it again is still the way out of a broken page.
- **No signal at all.** It moves at once; the phone holds every page for that.

Three costs, known and left:

1. **A fresh start is a little slower when it reopens a page other than the map.** It loads the map's page, asks one small question of the network, then loads the other page.
2. **A good page can be forgotten once.** Reopen the app, glance at it and pocket the phone inside two seconds, and if the phone then closes the app, the next start is the map. The same happens after a start where the network answered and the page then stalled. Each costs one tap.
3. **On a shared device, the app opens where the last person left it** — Incidents and Settings included. Curtis chose that; see his words above.

**When it lands on the map instead, all of it:**

- the map is where it was left;
- the first time the app is ever opened, or after a reset that clears the site's data, because the record goes with it;
- the page it was reopening did not stay up, the time before;
- the network did not answer in 2.5 seconds — and then only for that run;
- the two forgotten-once cases in cost 2.

**A device restart is not on that list.** Curtis named it as a time the map would be acceptable. The app reopens the page after a restart too: a page cannot tell a restart from the phone closing the app, and the record is still there.

There is no switch for this in Settings. One is a UI change and Curtis's call.

### What changed: the door

The Doors group is drawn as **🚪 Doors** wherever a person picks a group:

- **Defect Log, LOG DEFECT.** With Bus Accessories chosen, the first group row reads 🚪 Doors. When searching with no category chosen — typing "rear door" — the small line under each match reads "🚪 Doors · ♿ Bus Accessories".
- **Facility Map, the bus editor's ADD DEFECT, and the multi-bus tool.** The group list's first choice reads 🚪 Doors.
- **Down Sheet, the editor's defect picker.** It draws the same rows the Defect Log does.

What did not change: **a logged door defect looks as it did.** The mark is on the group in the picker, where the ♿ is, not on a defect card, the bus quick view, a Down Sheet line, a report or a share. The eleven choices inside Doors are unmarked. Nothing stored carries the mark.

In the Facility Map's group list, pressing **D** on a keyboard no longer jumps to Doors, because the line now starts with the glyph. The same is already true of R and W for the two ♿ groups.

One fix rode along: a defect whose wording is exactly the word "constructor" was drawn with a line of program text in front of it. No catalog choice has that wording. It is drawn plain now.

### One thing that changed underneath

**The service worker is now registered from every page, not only the map.** The map did it alone, and until this every fresh start loaded the map. A start that is turned round may never run the map's code. `public/sw.js` itself is unchanged. Its own note says registration runs "on every map load", which is now short of the truth; it was left, because changing that file re-installs the worker on every phone.

### Verified

- `npm test` on Windows — **470 pass, 0 fail**.
- `npm run lint` — no error; one warning, in a tool file that is not part of the app.
- **32 bugs planted** one at a time in the reopening module; the tests caught all 32.
- **The built app, served locally**, sent the tested script byte for byte as the first thing in `<body>` on all eight pages, and answered a HEAD request with 200 on each. That run was on the version before the last review's small changes; the test that finds the script whole in the build was run again after them.
- **In Chromium at 390 wide on the development server.** A real installed copy cannot be made there, so the page's own script was run against a stand-in that says it is installed:
  - Left on the Defect Log, a start at the map was hidden, asked the network, and landed on the Defect Log. The history was no longer than before.
  - With a network that never answers, the map was hidden at 2.4 seconds and shown by 2.65, and nothing moved.
  - A record already on probation stayed on the map.
  - A tap on the Map tile went to the map.
  - A page on probation kept its mark when it was drawn and lost it once it had stayed up.
  - The service worker was registered from the Defect Log with the map never opened.
- **The door**, in the same browser: the Defect Log's group row reads "🚪 Doors" with its eleven choices unmarked; a search for "rear door" shows "🚪 Doors · ♿ Bus Accessories" under four matches with no row overflowing; the Facility Map's group choice reads "🚪 Doors" and stores "Doors".
- **Three cold reads of the reopening and one of the door**, each by one subagent that had not seen the reasoning. The first two each found a way the app could be left on a page that would not draw, and both are fixed. Every finding is answered in the commit messages of the release source.

**Not verified:**

- **It has never run on a phone, an iPad or a real installed copy.** The design rests on a reopened home-screen app starting with no memory of its last run and with nothing having sent it there. That was read, not measured. If a phone does not behave that way, the app opens on the map as it does today.
- **Stopping a stalled move.** In Chromium a move to an address that never answers was still on the same page seven seconds after being stopped. The browser pane may have refused that address outright, so this is not proof. Where a browser will not stop a move, the map can still be shown and then replaced late.
- **What stopping costs.** It also ends anything the map was still loading and any request it had in flight, a Shop Cloud pull included. Not measured.
- **The changes made after the third cold read** were not read cold again. They are small: a move that could not start leaves no mark, and the wait before a page counts as up went from four seconds to two.
- **Whether Sites serves the built server file as built.** See Migrations.
- **The Down Sheet editor's picker and the multi-bus tool's group list** were read, not driven, for the door.
- **How the door glyph is drawn** depends on the device's own emoji font; it was seen on Windows Chromium only.

### What to check once it is live

On a phone with the app on its home screen. Open the app once after the update before starting, so it has the new version.

1. Open the app and tap **Defects**. Wait a few seconds.
2. Swipe the app away to close it fully. Tap the icon. **It should open on the Defect Log**, after a blank moment, without the map appearing first.
3. Tap **Map**. It should go to the Facility Map and stay there.
4. Close the app fully from the map and open it again. It should open on the map.
5. Go to the **Down Sheet**, switch to another app for a minute without closing this one, and come back. It should still be on the Down Sheet, as before.
6. Go to the Defect Log and leave the phone alone until it has closed the app by itself — an hour, or overnight. Open it. **This is the real test, and the one that could not be run:** it should open on the Defect Log.
7. If it opens on the map in step 2 or 6, record device, launch method, connectivity and approximate delay. Investigate map-readiness exceeding the script budget, network fallback, probation/crash recovery, and session/referrer conditions; do not assume unexpected phone startup behavior is the cause.
8. In the garage with weak or dead Wi-Fi, distinguish delivery of the initial document from resume. The unchanged service worker can wait on the initial GET before this script runs; there is no guaranteed launch-to-visible deadline. After script delivery, its 2.5-second readiness/network budget reveals the map if resume is not ready, without aborting map loading. A started replacement has another 2.5-second stalled-navigation limit. With cached pages and no signal, a ready map can reopen the remembered page. Record any blank or unusable fallback.

For the door:

9. Defect Log → **+ LOG DEFECT** → choose **Bus Accessories** → tap the arrow on SPECIFIC DEFECT OR SYMPTOM. The first row should read **🚪 Doors**, above the two ♿ rows.
10. Tap **🚪 Doors**. The choices should have no mark in front of them.
11. Facility Map → tap a bus → **+ ADD DEFECT** → category **Bus Accessories**. The group list's first choice should read **🚪 Doors**.

### Open questions for Curtis

- **A switch in Settings** to turn reopening off on a device. Not built.
- **The door on a logged defect's card**, not only in the picker. Not built.

Answered on 2026-11-17 and closed: **Incidents and Settings are reopened like any other page, on the phone and the shared iPad alike.**

### Rollback

Sites 191 / application release 196 at `a9f610d42123cd6cfaaf32b61d8c78048d585c82`.
