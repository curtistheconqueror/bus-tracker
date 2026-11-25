# Publish next

**STATUS: THREE RELEASES PENDING ON `main` — application release 212, from `05d9afd`; 213, from `f900798`; and 214, from `4d205db`. NOT PUBLISHED.** Each sits on top of the one before; **publish `4d205db` (release 214), which carries all three.** All are changes Curtis asked for on 2026-11-24. No sync, no storage key added or renamed (213 retires seven panel keys, listed in CLAUDE.md as NO LONGER READ), no migration. Codex publishes when Curtis points it at this file.

**What is live:** Sites Version 199 / application release 211, deployed 2026-11-25 at 00:12:04.200721 UTC from `db6683d66884c3a25de88c896561a3226e1f67b2`. Rollback for 212–214: Sites 199 at `db6683d66884c3a25de88c896561a3226e1f67b2`.

Site: https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site/

PR39 MCP remains held and excluded. The 211 queue as published: [release 211](archive/PUBLISH_RELEASE_211.md). Publication evidence is in [RELEASES.md](RELEASES.md).

| Release | What it is | State |
| --- | --- | --- |
| 214 | Text no longer overlaps on phones: Defect Log filter drawer bus numbers, the FLEETSTEP welcome screen, the Map's DECOMMISSIONED tile | On `main`, pending publication — **publish this; it includes 212 and 213** |
| 213 | The Down Sheet: header REFRESH · SCAN · SHARE, ADD DOWN BUS + SEARCH, three tabs (SHIFT, COUNTS, FILTERS) closed by default, the five boards as watch lists in FILTERS, CLEAR DOWNSHEET in Settings | On `main`, pending publication |
| 212 | The bar under SEARCH that named the feed window and counted "OLDER BUSES HIDDEN" is removed | On `main`, pending publication |

## 214 — Text no longer overlaps on phones

### Source

Release source: `4d205db`. Previous: `f900798` (release 213).

```
$ git diff --name-only f900798..4d205db
app/defect-log/defect-log.css
app/globals.css
app/minimalist.css
```

CSS only. Proof of no infrastructure change for 212–214 — this returned nothing:

```
$ git diff --name-only b357585..4d205db -- supabase package.json package-lock.json .github public worker
```

### What changed

Curtis, from his phone: *"When the filters for the buses are expanded I noticed some overlap in bus numbers over the text to the right of them"* and *"at the beginning of the app FLEETSTEP when u pick maintenance or transportation. There is a section or a couple that have overlapping texts. Please find all instances of it (phone version)."*

1. **Defect Log filter drawer:** the bus-number column was a fixed 52px; a five-digit number at 17px is 57px, so it ran into the repair text beside it (more in an iPhone's wider font). It now fits the number (52px minimum) with a 10px gap. A bus left out of the share gets the same.
2. **Welcome screen:** picking Maintenance, then Union, listed six jobs and pushed FLEETSTEP up under the fixed × button; centred in a scrolling box, the top could also sit above where scrolling reaches. The content now centres with auto margins (centred when it fits, top-aligned and scrollable when it does not) and keeps clear of the ×.
3. **Facility Map, LIVE FLEET tiles (found by the sweep):** DECOMMISSIONED was 14px wider than its phone tile and ran off it. The label may now break inside the word; labels that fit are unchanged.

### Verified

- **Swept every page at 360** — Map, Down Sheet (each tab, each watch list board, SHARE), Defect Log (SCAN drawer, an open card, the editor, every non-empty filter drawer with rows expanded), Fixed Repairs, Fleet Campaigns, Incidents, Shop Talk, Settings (all sections open), and every welcome step — for any text wider than its box and any box whose text spills below it; then again with 0.6px extra letter-spacing on everything, standing in for the iPhone's wider font. After the fixes: none left, apart from ✓ / × glyphs 3–4px taller than their line and Settings titles' descenders inside their own padding, both harmless.
- **Measured:** bus number to text gap 10px at 390; FLEETSTEP 14px below the × with the six-job list open at 360, the list scrolling; all seven map labels inside their tiles at 360 normal and widened.
- `npm test` 485 pass, lint clean apart from the existing warning.
- **Cold reads, two subagents:** nothing serious. Answered: hyphens removed from the map label (they would add breaks inside words that fit); the left-out row given the same column. Left: the welcome screen's extra top padding also applies on a first run with no ×, about 20px lower — cosmetic; INDEFINITELY may break at 360 in an iPhone font (arithmetic, not seen).
- **Not done:** no phone.

### What to check once it is live

On a phone: the Defect Log filter drawer's bus numbers have a clear gap before the text; on the welcome screen (Settings → show the welcome screen), Maintenance → Union keeps FLEETSTEP below the ×; the Map's DECOMMISSIONED tile keeps its text inside.

## 213 — The Down Sheet: REFRESH, SCAN, SHARE and three tabs

### Source

Release source: `f900798`. Previous: `b357585`, the commit that queued 212.

```
$ git diff --name-only b357585..f900798
CLAUDE.md
app/defect-log/_components/heat-scanner.tsx
app/defect-log/_components/sweep-scanner.tsx
app/down-sheet/down-sheet.css
app/down-sheet/page.tsx
app/settings/page.tsx
app/settings/settings.css
src/lib/down-sheet/down-sheet-filters.ts
src/lib/down-sheet/down-sheet-watch-lists.ts
tests/defects.test.mjs
tests/down-sheet.test.mjs
tests/scan.test.mjs
tests/shared.test.mjs
```

### Migrations

None. Seven keys are no longer read or written — `pace-down-sheet-advanced-open-v1`, `pace-down-sheet-counts-open-v1`, the deferred, recommended, soft and IDOT `-collapsed-v1` keys, and `pace-defect-log-mystery-collapsed-v1` — listed in CLAUDE.md as NO LONGER READ and left alone on devices.

### What changed

Curtis: *"It's a bit all over the place ... Let's try to clean this up like we did the Defect tab ... I am trying to make the area above the actual downsheet section as compact and clean as possible."* He chose option A of a mockup, three tabs across, and: *"I don't want the screen just defaulting to them being expanded already."* On the filters: *"Get rid of everything under the first 3 options except roadcalls."*

1. **Header: REFRESH · SCAN · SHARE.** SCAN opens SCAN SHEET's door directly (it was inside ADVANCED ACTIONS). SHARE opens a header-coloured drawer with the whole-sheet share (COPY LIST, SHARE TEXT, SHARE PAGE) and STATUS REPORT, which leave the page. ADVANCED ACTIONS is gone.
2. **ADD DOWN BUS and SEARCH in one box.** UNDO IMPORT / UNDO CLEAR come up there only while there is something to undo (hidden in LITE, as before).
3. **Three tabs under SEARCH: ALL SHIFTS ▾ · COUNTS ▾ · FILTERS.** Nothing open on arrival; one panel at a time; a second tap hides it; a shift or filter pick closes it. A tab narrowing the sheet stays outlined in blue; FILTERS shows the filter's name (e.g. MYSTERY, UNASSIGNED); SHIFT shows the shift.
4. **FILTERS:** the five boards that stood above the sheet (Mystery, Recommended, IDOT, Soft down, Deferred) are now watch lists with their counts; picking one opens that board under the box, and its − closes it. Then four sheet filters: Nobody Assigned Yet, Waiting For Parts, Off Property, Road Calls. Down 3+ Days, On The Road Right Now, Body Shop / Accident, Inspections & Scheduled Maintenance and No Time Estimate Set are no longer offered (the INSPECTIONS and ON ROAD count tiles remain).
5. **COUNTS:** every tile at once, three across and smaller; the "45 DOWN BUSES · SHOW COUNTS" bar is gone.
6. **The sheet title** carries N DOWN / N SOFT (open rows only, 13px), names an active filter or COMPLETED TODAY, and holds SHOW COMPLETED (hidden in LITE, as before).
7. **CLEAR DOWNSHEET is in Settings** (Down Sheet section, CLEAR THE SHEET). It opens the Down Sheet with `?tool=clear-sheet`, which asks its confirm a commit after the board has loaded; refused in LITE with a message, since Settings hides nothing in LITE.
8. Scanner messages now say "SCAN on the Down Sheet page".

### Verified

- `npm test` on Windows — **485 pass, 0 fail**. `npm run lint` — no error, the one existing warning. Type-check 241: the 238 baseline plus the new module's three `.ts`-extension import errors, the convention every `src/lib` module follows.
- **In the dev build** at 360, 390, 820 and 1180: no sideways scroll, nothing overrunning its box; tabs 44px; each tab opens and hides its panel; picking Mystery opened its board under the box and − closed it; SHARE's drawer in the header colour with its four buttons; Settings → SCAN BATCHES and the new CLEAR DOWNSHEET present. With all tabs closed the sheet starts about 373px down at 390, where it was about 1,200.
- **Cold reads, four subagents.** Answered:
  - CLEAR DOWNSHEET from Settings could be overwritten by the load-time board write in the same commit: now runs a commit later (traced and confirmed by a dedicated read);
  - DOWN was 8px and counted finished rows with SHOW COMPLETED / COMPLETED TODAY: 13px, open rows only, hidden over COMPLETED TODAY, " · " after it;
  - a filtered sheet said so only inside SHARE's drawer: the title names the filter;
  - UNDO IMPORT / CLEAR appeared in LITE: gated;
  - long filter names broke mid-word on the tab: the funnel hides while a name shows;
  - SHOW COMPLETED was a 32px target: 44px;
  - Settings' CLEAR THE SHEET group drew without colours: given them;
  - wording naming moved buttons: corrected.
  Left: Settings offers CLEAR DOWNSHEET in LITE and the page refuses it (Settings hides nothing in LITE); unused CSS for the old toggle, counts bar and view controls; the welcome-style "quick filters" wording in a code comment.
- **Not done:** no phone; CLEAR DOWNSHEET from Settings not pressed in the test browser (its confirm stalls it); the watch-list boards' MOVE / answer buttons not exercised.

### What to check once it is live

On a phone: REFRESH · SCAN · SHARE; SCAN opens the sheet scanner; SHARE shows the share and STATUS REPORT; the three tabs start closed, open one at a time and hide on a second tap; FILTERS → Mystery buses opens that board; the sheet title shows N DOWN; Settings → Down Sheet → CLEAR DOWNSHEET asks before clearing (test only with synthetic records on an isolated device, not the real sheet).

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
