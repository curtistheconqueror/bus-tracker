/* per-device settings: modes, roles, shifts and the page list. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

import { render } from "./helpers/setup.mjs";

test("bus marker display toggles between icons and large number tiles per device", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const [model, panel] = await Promise.all([
    readFile(new URL("../src/lib/settings/map-settings.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/_components/map-settings-panel.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(panel, /BUS MARKER DISPLAY/);
  assert.match(panel, /SHOW LARGE NUMBER TILES INSTEAD OF BUS ICONS/);
  assert.match(page, /data-bus-display=\{busDisplay\}/);
  assert.match(page, /setBusDisplay\(ui\.busDisplay==="number"\?"number":"icon"\)/);
  /* A change made on the Settings page reaches an open map through the storage
     event, read through the same normalizer the Settings page writes with. */
  assert.match(model, /busDisplay:ui\.busDisplay==="number"\?"number":"icon"/);
  assert.match(page, /const ui=readBoardSettings\(event\.newValue\);[^}]*setBusDisplay\(ui\.busDisplay\)/);
  assert.match(css, /\.app\[data-bus-display="number"\] \.token>\.bus\{display:none\}/);
  assert.match(css, /\.app\[data-bus-display="number"\] \.token-number\{font-size:12px/);
  assert.match(css, /color-mix\(in srgb,var\(--marker-status\) 22%,#fff\)/);
});

test("confirmation prompts are per-device settings that default to on", async () => {
  const { confirmationPreference, confirmAction } = await import("../src/lib/settings/confirmation-preferences.ts");
  // Missing, damaged, or legacy saved settings must restore the safer prompting default.
  assert.equal(confirmationPreference(undefined), true);
  assert.equal(confirmationPreference(null), true);
  assert.equal(confirmationPreference("no"), true);
  assert.equal(confirmationPreference(true), true);
  assert.equal(confirmationPreference(false), false);
  // Enabled prompts defer to the operator's answer; disabled prompts apply immediately without asking.
  let asked = 0;
  assert.equal(confirmAction(true, "Move?", () => { asked++; return false; }), false);
  assert.equal(asked, 1);
  assert.equal(confirmAction(true, "Move?", () => { asked++; return true; }), true);
  assert.equal(confirmAction(false, "Move?", () => { asked++; return false; }), true);
  assert.equal(asked, 2);

  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const panel = await readFile(new URL("../app/settings/_components/map-settings-panel.tsx", import.meta.url), "utf8");
  const settingsPage = await readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
  // The Settings page exposes independent move and group-defect toggles.
  assert.match(panel, /CONFIRMATION PROMPTS/);
  assert.match(panel, /CONFIRM BUS MOVES &amp; SWITCHES/);
  assert.match(panel, /CONFIRM GROUP DEFECT ASSIGNMENT/);
  assert.match(css, /\.confirmation-settings>label\{margin-top:8px\}/);
  // All three move paths and the bulk-defect path honor the preference.
  assert.match(page, /confirmAction\(confirmMoves,"Move Bus "\+bus\.n\+enteredNote/);
  assert.match(page, /confirmAction\(confirmMoves,"Move "\+selected\.length/);
  assert.match(page, /confirmAction\(confirmMoves,"Move Bus "\+d\.n\+" into Bus "/);
  assert.match(page, /confirmAction\(confirmDefects,"Add "\+defectLabel\(defect\)/);
  // Preferences persist, restore safely, and travel with backup export/import.
  assert.match(page, /setConfirmMoves\(confirmationPreference\(ui\.confirmMoves\)\)/);
  assert.match(page, /setConfirmDefects\(confirmationPreference\(ui\.confirmDefects\)\)/);
  assert.match(page, /singleTapEmptySpaces,busDisplay,showDownSheetBadges,downSheetBadgeView,confirmMoves,confirmDefects,serviceIntervalsUnit:SERVICE_INTERVALS_UNIT,serviceIntervals\}\)\)/);
  assert.match(page, /theme:themeName,singleTapEmptySpaces,busDisplay,showDownSheetBadges,downSheetBadgeView,confirmMoves,confirmDefects,serviceIntervalsUnit:SERVICE_INTERVALS_UNIT,serviceIntervals\}/);
  /* A restored backup reaches the intervals through the board-settings reader
     now, rather than through a setter inside the map's own import handler. */
  const boardModel = await readFile(new URL("../src/lib/settings/map-settings.ts", import.meta.url), "utf8");
  assert.match(boardModel, /serviceIntervals:readSavedServiceIntervals\(ui\.serviceIntervalsUnit,ui\.serviceIntervals\)/);
  /* A restored backup reaches the prompts through the board-settings reader,
     which defaults an unset or damaged value back to asking. */
  assert.match(boardModel, /confirmMoves:confirmationPreference\(ui\.confirmMoves\)/);
  assert.match(boardModel, /confirmDefects:confirmationPreference\(ui\.confirmDefects\)/);
  // Replacing the whole board must always ask, regardless of preferences.
  assert.match(settingsPage, /MASTER IMPORT replaces everything stored on this device/,
    "replacing a whole device still always asks, wherever the button lives");
});

test("Fixed Repairs is a fourth offline workflow with carried defect data and editable completion details", async () => {
  const [trackerPage,downPage,defectPage,defectCss,fixedPage,fixedCss,fixedSettings,worker,catalog]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
    readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
    readFile(new URL("../src/components/settings/fixed-repairs-settings.tsx",import.meta.url),"utf8"),
    readFile(new URL("../public/sw.js",import.meta.url),"utf8"),
    readFile(new URL("../src/lib/defects/repair-catalog.ts",import.meta.url),"utf8"),
  ]);
  /* The link is written once, in the shared list; each page is asserted to draw
     that list rather than to carry its own copy of the link. */
  const navPages=await readFile(new URL("../src/lib/settings/tracker-pages.ts",import.meta.url),"utf8");
  assert.match(navPages,/\{href:"\/fixed-repairs",label:"FIXED REPAIRS"\}/);
  for(const page of [trackerPage,downPage,defectPage,fixedPage])assert.match(page,/<TrackerNav[^>]*\/>/);
  /* THE ORDER FLIPPED, deliberately. This asserted the nav rendered BEFORE the
     Facility Map's header, which is how the map became the one page whose nav
     sat above its own name — FLEETSTEP was the fifth thing down the screen on
     the page the app opens on. Curtis, looking at a phone: "the facility map
     needs to get on board with title design. Fleetstep should be at top."
     Every other header is name, kicker, title, subtitle, then nav, and the map
     is now the same. It stays a SIBLING of the header rather than moving
     inside it because it is `position:sticky` here and only here. */
  /* Anchored to the MARKUP, not to the bare class name: a comment in page.tsx
     mentions `.mobile-mode-nav` while explaining this very ordering, and a
     bare indexOf found the comment and failed on it. Same trap as matching a
     button by a word its own explanation also uses. */
  assert.ok(trackerPage.indexOf("<AppName/>")<trackerPage.indexOf('<TrackerNav className="mobile-mode-nav"'),"the Facility Map's name must render before its phone nav, as on every other page");
  assert.match(trackerPage,/<\/header>\s*<TrackerNav className="mobile-mode-nav"/,"the nav follows the header rather than preceding it");
  assert.match(defectPage,/save-log-middle-actions[\s\S]*?SAVE AS FIXED/);
  assert.match(defectPage,/save-fixed-bottom[\s\S]*?SAVE AS FIXED/);
  assert.match(defectPage,/FIX \/ STEPS TAKEN/);
  assert.match(defectPage,/completedBy/);
  assert.match(defectPage,/DEFECT \/ CONDITION NOT DUPLICATED/);
  assert.match(defectPage,/updateDefect\("conditionNotDuplicated",event\.target\.checked\)/);
  assert.match(defectCss,/save-log-middle-actions\{[^}]*grid-template-columns:repeat\(2/);
  assert.match(fixedPage,/state==="completed"/);
  assert.match(fixedPage,/EDIT THE FULL REPAIR RECORD/);
  assert.match(fixedPage,/ORIGINAL DESCRIPTION/);

  assert.match(fixedPage,/FIX \/ STEPS TAKEN/);
  assert.match(fixedPage,/DIAGNOSIS \/ TEST \/ VERIFICATION/);
  assert.match(fixedPage,/not-duplicated-note/);
  assert.match(fixedPage,/FIXED DATE &amp; TIME/);
  /* Was writeFleetStorage, whose bare boolean the caller threw away, so a
     refused write closed the editor and reported success. */
  assert.match(fixedPage,/const written=writeFleetStorageResult\(localStorage,next\)/);
  assert.match(fixedPage,/if\(!written\.ok\)return false/);
  assert.doesNotMatch(fixedPage,/className="fixed-undo"/);
  assert.match(fixedPage,/className="fixed-undo-control"[\s\S]*disabled=\{!undoSnapshot\}[\s\S]*UNDO LAST/);
  assert.equal(/fixed-settings-button/.test(fixedPage),false,"the gear left this page for the shared Settings page");
  assert.equal(/<FixedAppearanceModal/.test(fixedPage),false,"the appearance panel renders on the shared Settings page now");
  assert.match(fixedSettings,/pace-defect-log-settings-v1/);
  assert.match(fixedSettings,/THEME[\s\S]*FONT[\s\S]*COLORS/);
  assert.match(fixedSettings,/localStorage\.setItem\(SETTINGS_KEY/);
  assert.match(fixedPage,/UNDO FIX/);
  assert.match(fixedPage,/DELETE/);
  assert.match(fixedPage,/state:"open",completedAt:undefined,completedBy:undefined/);
  assert.match(fixedPage,/filter\(defect=>defect\.id!==record\.defect\.id\)/);
  assert.doesNotMatch(defectPage,/className="log-undo"/);
  assert.match(defectPage,/className="log-undo-button"[\s\S]*disabled=\{!undoSnapshot\}[\s\S]*UNDO LAST/);
  assert.match(defectCss,/\.log-undo-button\{[^}]*background:var\(--log-surface[^}]*color:var\(--log-muted/);
  assert.match(defectCss,/@media\(max-width:760px\)\{\.log-controls\{grid-template-columns:minmax\(0,1fr\) 82px 48px/);
  assert.match(fixedCss,/\.fixed-header nav\{[^}]*grid-template-columns:repeat\(6/,"six links, one row on a desktop");
  assert.match(fixedCss,/@media\(max-width:760px\)\{\.fixed-header\{[^}]*overflow:visible/);
  assert.match(fixedCss,/\.fixed-repairs-app>\.fixed-header\{height:auto\}/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{\.fixed-settings-shade\{align-items:stretch/);
  assert.match(fixedCss,/\.fixed-repairs-app>\.fixed-header nav\{[^}]*height:auto[^}]*background:transparent/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card>footer\{[^}]*position:static[^}]*transform:none[^}]*white-space:normal/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-editor>footer\{[^}]*position:static[^}]*transform:none[^}]*white-space:normal/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{[\s\S]*?\.fixed-repairs-app>\.fixed-header nav\{grid-template-columns:repeat\(3/,"six links, two full rows on a phone");
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card-actions\{width:100%;grid-template-columns:minmax\(0,1\.55fr\) minmax\(0,1fr\) minmax\(0,\.8fr\)/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card-actions button:first-child\{grid-column:auto\}/);
  assert.match(worker,/CORE_PAGES = \["\/", "\/down-sheet", "\/defect-log", "\/fixed-repairs", "\/lists", "\/settings"\]/);
  /* Checked against the real route list rather than a second copy of it, so
     adding a page and forgetting the service worker fails here instead of
     going unnoticed until a phone loses signal in a bay and that page is
     blank. Fleet Campaigns was missing exactly that way until Version 137. */
  const precached=JSON.parse(worker.match(/CORE_PAGES = (\[[^\]]*\])/)[1]);
  const routes=(await readdir(new URL("../app",import.meta.url),{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name);
  const served=(await Promise.all(routes.map(name=>readFile(new URL("../app/"+name+"/page.tsx",import.meta.url),"utf8").then(()=>"/"+name,()=>null)))).filter(Boolean);
  assert.ok(served.length>1,"expected to find real page routes under app/");
  for(const route of served)assert.ok(precached.includes(route),route+" is a real page but sw.js does not pre-cache it, so it is blank offline");
  /* Changing CORE_PAGES without bumping the cache name leaves phones on the old
     pre-cache: activate only purges caches whose name no longer matches. */
  assert.match(worker,/CACHE_NAME = "pace-bus-tracker-shell-v5"/);
  assert.match(catalog,/completedBy\?:string/);
  assert.match(catalog,/conditionNotDuplicated\?:boolean/);
  const response=await render("/fixed-repairs");
  assert.equal(response.status,200);
  assert.match(await response.text(),/Fixed Repairs/);
});

test("every page draws the same six links from one list",async()=>{
 const nav=await readFile(new URL("../src/components/shared/tracker-nav.tsx",import.meta.url),"utf8");
 const {TRACKER_PAGES,otherPages}=await import("../src/lib/settings/tracker-pages.ts");
 const pagesSource=await readFile(new URL("../src/lib/settings/tracker-pages.ts",import.meta.url),"utf8");

 /* Five copies of this nav drifted: the Facility Map called itself FLEET
    TRACKER in its own nav while every other page called it FACILITY MAP. One
    list, one name. */
 assert.deepEqual(TRACKER_PAGES.map(page=>page.label),
  ["FACILITY MAP","DOWN SHEET","DEFECT LOG","FIXED REPAIRS","FLEET CAMPAIGNS","⚙ SETTINGS"]);
 assert.deepEqual(TRACKER_PAGES.map(page=>page.href),["/","/down-sheet","/defect-log","/fixed-repairs","/lists","/settings"]);
 assert.equal(TRACKER_PAGES.length%3,0,"six links: two full rows of three on a phone, never one alone");
 /* Checked on the data, not the source: the file's own comment records the old
    name to explain why the component exists, and prose is not a label. */
 assert.equal(TRACKER_PAGES.some(page=>page.label==="FLEET TRACKER"),false,"the map's private name for itself is gone");
 assert.equal(/label:"FLEET TRACKER"/.test(pagesSource),false);

 // The component owns the landmark and the current-page mark.
 assert.match(nav,/<nav className=\{className\} aria-label="Tracker pages">/);
 assert.match(nav,/aria-current=\{current\?"page":undefined\}/);

 // Every page renders it, marking itself, and none still carries a hand-written copy.
 const pages=[["app/page.tsx","/"],["app/down-sheet/page.tsx","/down-sheet"],["app/defect-log/page.tsx","/defect-log"],
  ["app/fixed-repairs/page.tsx","/fixed-repairs"],["app/lists/page.tsx","/lists"],["app/settings/page.tsx","/settings"]];
 for(const [file,active] of pages){
  const source=await readFile(new URL("../"+file,import.meta.url),"utf8");
  assert.match(source,new RegExp('<TrackerNav[^>]*active="'+active.replace(/\//g,"\\/")+'"'),file+" marks itself as current");
  assert.equal(/<nav aria-label="Tracker pages">/.test(source),false,file+" no longer hand-writes the nav");
  assert.equal(/<a href="\/lists">FLEET CAMPAIGNS<\/a>/.test(source),false,file+" carries no literal copy of a link");
 }

 // The map's desktop menu is the same list minus the map, with counts attached.
 const other=otherPages({"/defect-log":7,"/down-sheet":2});
 assert.deepEqual(other.map(page=>page.href),["/down-sheet","/defect-log","/fixed-repairs","/lists","/settings"]);
 assert.equal(other.find(page=>page.href==="/defect-log").count,7);
 assert.equal(other.find(page=>page.href==="/lists").count,undefined,"no count is no count, not zero");
});

test("the command bar carries the other pages behind one trigger",async()=>{
 /* Four separate page buttons plus the locator, quick filters, badge view,
    refresh, settings and the operator wrapped the bar onto a second row at every
    width from an iPad to a 1440px desktop, and onto four rows — 208px — on an
    iPad held upright. A bar you have to scroll has stopped being a bar. */
 const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 const menu=await readFile(new URL("../app/_components/page-menu.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");

 // the four buttons are gone from the bar and live in the menu instead
 for(const gone of ["downsheet-command","defectlog-command","fixed-repairs-command","lists-command"])
  assert.ok(!page.includes('className="'+gone+'"'),gone+" should be inside the PAGES menu now");
 assert.match(page,/<PageMenu pages=\{otherPages\(/);
  const navPages=await readFile(new URL("../src/lib/settings/tracker-pages.ts",import.meta.url),"utf8");
 for(const href of ["/down-sheet","/defect-log","/fixed-repairs","/lists","/settings"])
  assert.ok(navPages.includes('href:"'+href+'"'),"the menu must still reach "+href);
 // the counts come along: the reason to glance at the bar is to see what is waiting
 assert.match(page,/"\/down-sheet":actualDownSet\.size/);
 assert.match(page,/"\/defect-log":defectLogCount/);
 assert.match(page,/"\/fixed-repairs":fixedRepairCount/);

 // same shape as the quick filter control beside it, so the pattern is learned once
 assert.match(menu,/aria-haspopup="menu"/);
 assert.match(menu,/createPortal/);
 assert.match(menu,/event\.key==="Escape"/);
 // the trigger must never be squeezed away: min-width:0 collapsed it to 0px wide
 // at 820px, where the bar is tightest and this is the control that has to work
 assert.match(css,/\.page-menu-control\{display:inline-flex;flex:none\}/);
 // and the menu items stay tappable
 assert.match(css,/\.page-menu-popover>div button\{[^}]*min-height:44px/);

 /* Three rows on a narrow screen, not four. Refresh took columns 1-2 and
    settings 3-4, filling the row and pushing the operator onto a fourth row by
    itself. */
 assert.match(css,/\.command-bar>\.refresh-command\{grid-column:1\/2\}/);
 assert.match(css,/\.command-bar>\.settings-command\{grid-column:2\/3\}/);
 assert.match(css,/\.command-bar>\.ai-operator-command\{grid-column:3\/5\}/);
});

test("no class name collides with a Tailwind positioning utility",async()=>{
 /* The FIXED TODAY tile was className="fixed", and this project ships Tailwind,
    whose `.fixed` utility is position:fixed. On an iPad the tile was lifted out
    of the summary grid and floated across the whole viewport on top of the other
    four. The reset that would have stopped it existed but sat inside
    @media(max-width:760px), so it only ever protected phones — the computer had
    it too, just less obviously.

    Renamed rather than fought: a class the framework already owns will keep
    winning, and the next person to add one would not know to look. */
 const files=["../app/page.tsx","../app/defect-log/page.tsx","../app/down-sheet/page.tsx",
  "../app/fixed-repairs/page.tsx","../app/lists/page.tsx","../src/components/settings/section-transfer-controls.tsx",
  "../app/defect-log/_components/offline-backup-reminder.tsx","../app/down-sheet/_components/down-sheet-editor.tsx",
  "../app/settings/_components/down-sheet-settings.tsx","../app/down-sheet/_components/down-sheet-scanner.tsx"];
 const utilities=new Set(["fixed","static","absolute","relative","sticky","block","inline","flex","grid",
  "hidden","table","container","visible","invisible","border","italic","underline","truncate","isolate","contents"]);
 for(const file of files){
  const source=await readFile(new URL(file,import.meta.url),"utf8");
  for(const match of source.matchAll(/className="([^"{]*)"/g))
   for(const name of match[1].split(/\s+/).filter(Boolean))
    assert.ok(!utilities.has(name),file+' uses className="'+name+'", which Tailwind also defines as a utility - rename it');
 }
 // and the tile keeps its own name and no longer needs a position reset to exist
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(page,/className="fixed-today"><strong>\{stats\.fixedToday\}/);
 assert.match(css,/\.log-summary \.fixed-today\{grid-column:1\/-1\}/);
 assert.ok(!/\.log-summary \.fixed\{/.test(css),"the old colliding selector must be gone, not merely overridden");
});

test("every page offers the Fleet Campaigns tab without changing the lists route",async()=>{
 const pages=await Promise.all(["../app/page.tsx","../app/down-sheet/page.tsx","../app/defect-log/page.tsx","../app/fixed-repairs/page.tsx","../app/lists/page.tsx"]
  .map(path=>readFile(new URL(path,import.meta.url),"utf8")));
 const navPages=await readFile(new URL("../src/lib/settings/tracker-pages.ts",import.meta.url),"utf8");
 assert.match(navPages,/\{href:"\/lists",label:"FLEET CAMPAIGNS"\}/);
 for(const page of pages)assert.match(page,/<TrackerNav[^>]*\/>/);
 // the lists page marks itself current and links back to the other four
 const listsPage=pages.at(-1);
 assert.match(listsPage,/<TrackerNav active="\/lists"\/>/);
 assert.match(listsPage,/<h1>Fleet Campaigns<\/h1>/);
 for(const href of ["/","/down-sheet","/defect-log","/fixed-repairs"]) assert.ok(navPages.includes('href:"'+href+'"'),href);
 // globals.css styles bare <header>, so this page must not use one
 assert.equal(/<header>|<footer>/.test(listsPage),false);

 // On a phone the panels stack and the paste box lands below the fold, so
 // creating a list looked like it did nothing at all. It is scrolled into view
 // when a list opens, and not focused, which would throw up the keyboard before
 // the mechanic has decided what to paste.
 assert.match(listsPage,/<label>PASTE A REPORT<textarea ref=\{addBoxRef\}/);
 // one bus, Enter, cleared and ready for the next: for standing at a bus
 // rather than working from a report
 assert.match(listsPage,/onKeyDown=\{event=>\{if\(event\.key==="Enter"\)\{event\.preventDefault\(\);addQuickBus\(\)\}\}\}/);
 assert.match(listsPage,/setQuickBus\(""\)/);
 assert.match(listsPage,/addBoxRef\.current;[\s\S]{0,120}?scrollIntoView\(\{block:"center",behavior:"smooth"\}\)/);
 assert.equal(/addBoxRef\.current\?\.focus\(\)/.test(listsPage),false);
 // and the columns panel starts closed: a chosen format has already filled it
 // in, so leaving it open only pushes the paste box further down
 assert.match(listsPage,/<details className="list-columns">/);
 // the Facility Map hides its header nav on desktop and navigates from the
 // command bar, so without this button the page is unreachable there
 assert.match(navPages,/\{href:"\/lists",label:"FLEET CAMPAIGNS"\}/);
});

test("bringing the shop's copy down sends this device's work first",async()=>{
 const control=await readFile(new URL("../app/settings/_components/cloud-sync-control.tsx",import.meta.url),"utf8");
 const pull=control.slice(control.indexOf("const pull=async"),control.indexOf("const set=(key:keyof CloudConfig)"));
 assert.ok(pull,"the pull handler should be findable");

 // A merge takes the incoming copy for a bus both devices know. Move five buses
 // and press this inside the 45-second window before the sweep has run, and the
 // server's older copy would be laid over the top of that work — then the next
 // sweep would push the overwritten version up as though it were the truth.
 // Pushing first means the server already holds those moves, stamped later than
 // anything else, so what comes back down includes them.
 const sendAt=pull.indexOf("await push(true)");
 const receiveAt=pull.indexOf("await cloudPull(");
 assert.ok(sendAt>=0,"pull must send this device's changes first");
 assert.ok(receiveAt>=0,"pull must then receive");
 assert.ok(sendAt<receiveAt,"the send has to happen before the receive, not after");

 // And it must not receive at all if the send failed, or the merge would
 // overwrite work that never left this device.
 assert.match(pull,/if\(!await push\(true\)\)\{[\s\S]{0,400}?return;\s*\}/);

 // push reports whether the work is safely up rather than returning nothing.
 const push=control.slice(control.indexOf("const push=useCallback"),control.indexOf("const pull=async"));
 assert.match(push,/return result\.ok;/);
 assert.match(push,/running\.current\)return false;/);
});

test("the welcome asks once, on a device that has never opened the app, and Full is the fallback", async () => {
 const { isFirstRun, readAppMode, serializeAppMode, APP_MODE_STORAGE_KEY, DEFAULT_APP_MODE } = await import("../src/lib/settings/app-mode.ts");
 const store = map => ({ getItem: key => (key in map ? map[key] : null) });

 // Nothing on the device at all: the one case that gets the welcome by itself.
 assert.equal(isFirstRun(store({})), true);
 // Answered already — never again, whatever else is or is not there.
 assert.equal(isFirstRun(store({ [APP_MODE_STORAGE_KEY]: serializeAppMode({ mode: "lite", answered: true }) })), false);

 /* The trap this function exists for. A MISSING board and a SAVED board holding
    zero buses come back identically from readFleetStorage — storage.ts returns
    {items:[],valid:true} for both — so asking it "is the board empty" would put
    the welcome in front of somebody who had just cleared theirs. isFirstRun
    reads getItem directly, so an empty-but-present board is not a first run. */
 assert.equal(isFirstRun(store({ "pace-board-v1": JSON.stringify({ kind: "buses", version: 4, buses: [] }) })), false,
  "a device that cleared its board has still opened this app");
 assert.equal(isFirstRun(store({ "pace-board-v1": JSON.stringify({ kind: "buses", version: 4, buses: [{ id: "b1", n: "17501" }] }) })), false);
 // A storage that throws (private mode, blocked site data) is not a first run:
 // better to skip the welcome than to show it on every single page load.
 assert.equal(isFirstRun({ getItem() { throw new Error("blocked") } }), false);

 /* Full when nothing is stored, and when what is stored is unreadable. Somebody
    who never answers, or whose device loses the answer, keeps every surface —
    the other default takes pages away from a mechanic mid-shift because a write
    failed once. */
 assert.deepEqual(readAppMode(null), DEFAULT_APP_MODE);
 assert.equal(readAppMode(null).mode, "full");
 assert.equal(readAppMode("not json").mode, "full");
 assert.equal(readAppMode(JSON.stringify({ mode: "nonsense", answered: true })).mode, "full");
 assert.deepEqual(readAppMode(serializeAppMode({ mode: "lite", answered: true })), { mode: "lite", answered: true });
});

test("a failed brake test takes the bus out of service, and MERGE DUPES cannot claim a save it did not make", async () => {
 const logPage = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
 const settingsPage = await readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8");

 // Failing sets availability to down; passing deliberately leaves it alone.
 assert.match(logPage, /const setBrakeTestResult=\(result:BrakeTestResult\)=>\{/);
 assert.match(logPage, /result==="fail"\?\{\.\.\.defect,operability:"down"\}:defect/);
 // One either/or, not two independent boxes — no pass-and-fail-at-once state.
 assert.match(logPage, /\(\["pass","fail"\] as BrakeTestResult\[\]\)\.map/);

 /* The merge bug, measured in a browser before it was fixed: 42 stored
    defects before and 42 after, because the bulk-loss guard refuses any write
    dropping five or more records — while the handler still showed "21
    duplicate records merged" and wrote 21 cloud tombstones for records that
    were never merged. MERGE DUPES lives on the Settings page now, and the fix
    went with it. */
 assert.match(settingsPage, /const written=persist\(result\.buses,result\.entries,\{allowBulkDefectLoss:true\}\);/);
 assert.match(settingsPage, /if\(!written\.ok\)return;/);
 // The guard is lifted for the merge ONLY — persist defaults to the full check, on both pages.
 assert.match(settingsPage, /const persist=\(nextFleet:SettingsBus\[\],nextDown:DefectLogDownEntry\[\],options:FleetWriteOptions=\{\}\)/);
 assert.match(settingsPage, /writeFleetStorageResult\(localStorage,nextFleet,options\)/);
 assert.match(logPage, /const persist=\(nextFleet:DefectLogFleetBus\[\],nextDown:DefectLogDownEntry\[\],options:FleetWriteOptions=\{\}\)/);
 assert.match(logPage, /writeFleetStorageResult\(localStorage,nextFleet,options\)/);
 /* One thing on the Defect Log lifts the guard now: removeBatch, which takes a
    whole scan sweep out after a person confirms it. Nothing else does. */
 assert.equal((logPage.match(/allowBulkDefectLoss:true/g)||[]).length, 1, "exactly one write on the Defect Log lifts the guard");
 assert.ok(logPage.indexOf("const removeBatch=")<logPage.indexOf("allowBulkDefectLoss:true")&&logPage.indexOf("allowBulkDefectLoss:true")<logPage.indexOf("const restoreBatch="),"and it is the scan-sweep removal");
 // The recovery snapshot is NOT skipped, so the pre-merge board stays restorable.
 assert.doesNotMatch(settingsPage, /allowBulkDefectLoss:true,\s*skipRecoverySnapshot/);
 // The tombstones are written only after the write landed, and undone with it.
 assert.ok(settingsPage.indexOf("if(!written.ok)return;")<settingsPage.indexOf("writeMergedAway(localStorage,{...before,"),"tombstones follow a write that happened");
 assert.match(settingsPage, /const undoMerge=\(\)=>\{[\s\S]*?if\(!persist\(mergeUndo\.fleet,mergeUndo\.downEntries\)\.ok\)return;[\s\S]*?writeMergedAway\(localStorage,mergeUndo\.mergedAway\)/);
});

test("the Defect Log opens on what it is for, not on a status report", async () => {
 const [logPage,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);

 /* Five stat tiles were the first thing on the page, above the filters and the
    button that logs a defect. They are behind one bar now, closed unless the
    device says otherwise, so absent storage means closed. */
 assert.match(logPage,/const STATS_OPEN_KEY="pace-defect-log-stats-open-v1"/);
 assert.match(logPage,/const \[statsOpen,setStatsOpen\]=useState\(false\)/,"stats must default to closed");
 assert.match(logPage,/setStatsOpen\(localStorage\.getItem\(STATS_OPEN_KEY\)==="1"\)/,"only an explicit 1 opens it");
 assert.match(logPage,/writeSetting\(localStorage,STATS_OPEN_KEY,statsOpen\?"1":"0"\)/);
 assert.match(logPage,/\{statsOpen&&<section className="log-summary"/,"the tiles must not render while closed");
 assert.match(css,/\.daily-stats-toggle\{/);

 /* LOG DEFECT is the first control, and it is not also repeated in the feed
    header — two buttons doing one thing is what made the page feel busy. */
 assert.match(logPage,/<button className="log-primary-action" type="button" onClick=\{\(\)=>setEditing\(newDraft\(\)\)\}>\+ LOG DEFECT<\/button>/);
 assert.equal((logPage.match(/\+ LOG DEFECT/g)||[]).length,1,"LOG DEFECT must appear exactly once");
 assert.match(css,/\.log-primary-action\{/);

 /* Three filter buttons, not five. OPEN differed from ALL only by hiding
    in-progress and today's fixes; DOWN SHEET has its own page. */
 const row=logPage.match(/\[\["all","ALL"\][\s\S]*?\] as \[Filter,string\]\[\]/);
 assert.ok(row,"the filter row must still be a literal list");
 /* Three are always offered. OPEN and DOWN SHEET appear ONLY while one of them
    is the active filter — which happens when somebody's saved default view is
    one of them. Otherwise they would see a filtered board with no button lit,
    nothing explaining why, and no way back without opening settings. */
 assert.match(row[0],/\.\.\.\(filter==="open"\?\[\["open","OPEN"\] as \[Filter,string\]\]:\[\]\)/);
 assert.match(row[0],/\.\.\.\(filter==="downsheet"\?\[\["downsheet","DOWN SHEET"\] as \[Filter,string\]\]:\[\]\)/);
 /* The summary bar everyone sees must honour the labels a shop can rename in
    settings; it hardcoded the English words while the tiles that respect them
    are now closed by default. */
 assert.match(logPage,/\{settings\.display\.labels\.active\.toLowerCase\(\)\}/);
 assert.match(logPage,/\{settings\.display\.labels\.fixed\.toLowerCase\(\)\}/);

 /* But BOTH removed keys still filter, so a saved default view of either keeps
    working. Removing the button must not remove the behaviour. */
 assert.match(logPage,/if\(filter==="open"&&!\(record\.defect\.state==="open"\|\|record\.defect\.state==="deferred"\)\)return false/);
 assert.match(logPage,/if\(filter==="downsheet"&&!activeDownBusIdSet\.has\(record\.bus\.id\)\)return false/);
 const panel=await readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8");
 assert.match(panel,/<option value="open">Open<\/option>/,"and both remain choosable as a default view");
 assert.match(panel,/<option value="downsheet">/);

 /* Pressing the active filter clears back to ALL. It used to stay stuck on.
    The toggle now lives in showEverythingOr, which does this and also clears
    the search box when the result is ALL - see the test named for that. */
 assert.match(logPage,/onClick=\{\(\)=>showEverythingOr\(value\)\}/);
 assert.match(logPage,/const next=filter===value\?"all":value;/);
});

test("the home screen asks what you do, and nothing in the app acts on the answer",async()=>{
 /* Curtis: "a collapsible expandable section placed somewhere sensible on the
    screen where a person could select their role... this could be broken up
    into two categories, transportation and maintenance." */
 const {ROLE_DEPARTMENTS,ROLE_STORAGE_KEY,readRole,roleLabel,serializeRole,departmentRoles}=await import("../src/lib/settings/roles.ts");

 /* HIS TWO LISTS, IN HIS ORDER — the shop's order, from the road or the floor
    upward, not alphabetical. "Transportation, it will give you the option
    between bus operator, then dispatch and then superintendent. Now for
    maintenance, it will be servicer then mechanic, foreman, superintendent." */
 assert.deepEqual(ROLE_DEPARTMENTS.map(item=>item.key),["transportation","maintenance"]);
 /* CURTIS'S OWN SPLIT, as corrected by him: "Yes dispatch is non union. They
    have a spot under them called Relief Supervisor which are union... also add
    Master Mechanic in maintenance."

    DISPATCH IS NON-UNION. It sat on the union side for exactly one commit
    because it is union at many transit properties — which is not the same as
    being union at this one, and is the whole argument for asking rather than
    inferring. Relief Supervisor is the union spot beneath it. */
 assert.deepEqual(departmentRoles("transportation","union"),["Bus Operator","Relief Supervisor"]);
 assert.deepEqual(departmentRoles("transportation","non-union"),["Dispatch","Asst Supt","Supt"]);
 assert.equal(departmentRoles("transportation","union").includes("Dispatch"),false,
  "Dispatch is non-union here, whatever it is elsewhere");
 /* Master Mechanic is union, at the top of the mechanic ladder — inferred from
    the shape of the rest of the list, then confirmed: "Master mechanic is
    union, you're correct." The title is a top classification at some transit
    properties and a management job at others, which is why it was asked. */
 assert.deepEqual(departmentRoles("maintenance","union"),["Servicer","Mechanic Helper","Mechanic","Master Mechanic","Body & Frame","Building Maintenance"]);
 assert.ok(departmentRoles("maintenance","union").indexOf("Master Mechanic")>departmentRoles("maintenance","union").indexOf("Mechanic"),
  "it is the top of the ladder, so it follows Mechanic");
 /* FOREMAN IS NON-UNION HERE. It is the one job a transit shop cannot assume —
    it goes either way by contract — and is exactly why the list was left
    unfiltered until he said which. */
 assert.deepEqual(departmentRoles("maintenance","non-union"),["Foreman","Asst Supt","Supt"]);
 /* No job appears on both sides of one department: a person is represented or
    not, and a row on both would make the union question decide nothing. */
 for(const department of ["transportation","maintenance"]){
  const union=departmentRoles(department,"union"),other=departmentRoles(department,"non-union");
  assert.deepEqual(union.filter(role=>other.includes(role)),[],department+" has no job on both sides");
  assert.ok(union.length&&other.length,department+" has jobs on each side");
 }

 /* ABBREVIATED BECAUSE THERE ARE TWO. Curtis: "we have asst supt, so that is
    why I want it shortened, so the label can show both like Asst Supt & Supt
    simultaneously." Spelled out, "Assistant Superintendent" beside
    "Superintendent" is two long strings differing by one word at the front —
    the hardest pair of all to tell apart at a glance on a phone. */
 const {allDepartmentRoles}=await import("../src/lib/settings/roles.ts");
 for(const department of ["transportation","maintenance"]){
  assert.ok(allDepartmentRoles(department).includes("Asst Supt"),department+" has an assistant");
  assert.ok(allDepartmentRoles(department).includes("Supt"));
  assert.equal(allDepartmentRoles(department).some(role=>/Superintendent/i.test(role)),false,"spelled out, the two are too alike to scan");
 }

 /* AND THEY ARE ON BOTH LISTS, so a bare role string does not say which person
    it means. The pair is what is stored, and the label is what tells them
    apart on screen. */
 const road={department:"transportation",unit:"non-union",role:"Supt"},shop={department:"maintenance",unit:"non-union",role:"Supt"};
 assert.notEqual(roleLabel(road),roleLabel(shop));
 assert.equal(roleLabel(shop),"Maintenance · Supt");
 assert.deepEqual(readRole(serializeRole(road)),road);

 /* Nothing on file means NO ROLE, never a default. A device that quietly
    decided somebody was a Foreman would be putting a word on screen that
    nobody chose, and this exists so the person says it themselves. */
 assert.equal(readRole(null),null);
 assert.equal(readRole("not json"),null);
 assert.equal(readRole('{"department":"catering","unit":"union","role":"Chef"}'),null);
 /* Validated against the PAIR: a Supt stored as union is a combination the
    picker cannot produce, so it came from a hand-edited backup. */
 assert.equal(readRole('{"department":"maintenance","unit":"union","role":"Supt"}'),null,"a job on the wrong side of the contract does not read back");
 assert.deepEqual(readRole('{"department":"maintenance","unit":"non-union","role":"Supt"}'),{department:"maintenance",unit:"non-union",role:"Supt"});
 /* A role this build no longer offers reads as not set and is NOT rewritten —
    the same read-time rule the repair catalog follows for renamed defects. */
 assert.equal(readRole('{"department":"maintenance","unit":"union","role":"Bodyman"}'),null);
 assert.equal(readRole('{"department":"maintenance","unit":"non-union","role":"Superintendent"}'),null,"the spelled-out wording is not offered any more");
 assert.equal(readRole('{"role":"Foreman"}'),null,"a role with no department cannot be resolved");

 /* UNION OR NOT, asked between the department and the job. Curtis: "I want the
    distinction after they select their dept — union or non-union." He also
    asked whether non-union is called "bargain": it is the other way round. A
    BARGAINING UNIT is the group a union represents, so "bargaining" names the
    union side and cannot label the other one. */
 const {ROLE_UNITS,unitLabel}=await import("../src/lib/settings/roles.ts");
 assert.deepEqual(ROLE_UNITS.map(item=>item.key),["union","non-union"],"union first — most of the building is");
 assert.deepEqual(ROLE_UNITS.map(item=>item.label),["Union","Non-Union"]);
 for(const item of ROLE_UNITS)assert.equal(/bargain/i.test(item.label),false,
  "bargaining names the union side, so it can never be the non-union label");
 assert.equal(unitLabel("union"),"Union");

 /* ALL THREE OR NOTHING. A department and a job with no union status is a
    record that looks complete on the summary line and is not, and there is no
    honest way to guess the missing third. */
 assert.equal(readRole('{"department":"maintenance","role":"Foreman"}'),null,"a role with no union status is not a complete answer");
 assert.equal(readRole('{"department":"maintenance","unit":"casual","role":"Foreman"}'),null);
 assert.deepEqual(readRole(serializeRole({department:"maintenance",unit:"non-union",role:"Foreman"})),
  {department:"maintenance",unit:"non-union",role:"Foreman"});

 /* The union status is NOT in the name. Three parts joined by dots runs past a
    phone's summary line, and the part that would be truncated is the end that
    identifies the person. It is drawn as its own tag instead. */
 assert.equal(roleLabel({department:"maintenance",unit:"union",role:"Building Maintenance"}),"Maintenance · Building Maintenance");

 /* THE ONE RULE THAT MATTERS MOST. Curtis: "there will be no special conditions
    in the app for any of the working roles. This is all cosmetic."

    A list holding Foreman and Superintendent looks like a permission model. It
    is not one: there is no login in this app, and this is an unauthenticated
    string in LocalStorage that anybody holding the phone can change from the
    screen that set it. The moment something gates on it, that string is
    standing between a person and a control. */
 const files=await Promise.all(["../app/page.tsx","../app/defect-log/page.tsx","../app/down-sheet/page.tsx","../app/settings/page.tsx","../src/lib/settings/lite-mode.ts","../src/lib/storage/storage.ts","../src/lib/cloud/cloud-sync.ts"]
  .map(path=>readFile(new URL(path,import.meta.url),"utf8")));
 for(const source of files)assert.equal(source.includes(ROLE_STORAGE_KEY)||source.includes("readRole"),false,
  "nothing outside the picker may read the role — it is a label, not a permission");
 /* And it is never synced: it is a per-device label, like the app mode. */
 const sync=await readFile(new URL("../src/lib/cloud/cloud-sync.ts",import.meta.url),"utf8");
 assert.equal(sync.includes("pace-role-v1"),false);

 const gate=await readFile(new URL("../src/components/shared/welcome-gate.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 /* Collapsible, as asked. */
 assert.match(gate,/className="welcome-role-toggle" aria-expanded=\{roleOpen\}/);
 /* Three steps, in Curtis's order: department, then union, then the job. The
    role buttons do not render until both of the first two are answered. */
 assert.match(gate,/\{department&&<div className="welcome-role-departments welcome-role-units">/);
 assert.match(gate,/\{department&&unit&&<div className="welcome-role-roles">/);
 assert.ok(gate.indexOf('className="welcome-role-departments">')<gate.indexOf('welcome-role-units">'));
 assert.ok(gate.indexOf('welcome-role-units">')<gate.indexOf('className="welcome-role-roles">'));
 /* Changing the department clears the union answer rather than carrying it
    across, so a half-changed answer cannot be saved. */
 assert.match(gate,/setDepartment\(department===item\.key\?null:item\.key\);setUnit\(null\)/);
 /* The label is wrapped so the ellipsis lands on the job title and never on the
    union tag — the tag is the shortest thing on the line and the first that
    should survive a squeeze. */
 assert.match(css,/\.welcome-role-toggle small\{display:flex[^}]*\}/);
 assert.match(css,/\.welcome-role-toggle small>span\{min-width:0;overflow:hidden;text-overflow:ellipsis/);
 /* AFTER THE MODE, ON ITS OWN STEP - not beside it. Curtis: "On the Home
    Screen I want the question of MY ROLE to come up next AFTER u pick Full or
    Lite version. Not at same time."

    It was built folded up under the mode buttons precisely so a first run would
    not meet two questions at once; sequencing serves that better than hiding
    one did. The two mode buttons only exist on the mode step, so the role step
    cannot be reached without the mode already being written. */
 assert.match(gate,/const \[step,setStep\]=useState<"mode"\|"role">\("mode"\)/);
 assert.match(gate,/\{step==="mode"&&<div className="welcome-choices">/,
  "the mode buttons belong to the mode step only");
 assert.match(gate,/\{step==="role"&&<div className="welcome-step-head">/);
 /* Re-opening from Settings starts at the mode step too, so the same tap always
    shows the same screen. */
 assert.match(gate,/setDismissable\(!isFirstRun\(localStorage\)\);setStep\("mode"\);setOpen\(true\)/);

 /* THE ORDER IS ENFORCED BY `choose`, WHICH IS THE ONLY ROUTE ONTO THE ROLE
    STEP. Storing the mode comes first in that handler, so there is no state in
    which the role step is showing and the mode is unanswered. */
 const chose=gate.slice(gate.indexOf("const choose=(mode:AppMode)"),gate.indexOf("\n };",gate.indexOf("const choose=(mode:AppMode)")));
 assert.ok(chose.indexOf("APP_MODE_STORAGE_KEY")<chose.indexOf('setStep("role")'),
  "the mode must be stored before the role step is shown");
 assert.equal(chose.includes("setOpen(false)"),false,"choosing a mode now advances to the role step instead of closing");
 assert.equal((gate.match(/setStep\("role"\)/g)||[]).length,1,"the role step has exactly one entrance");

 /* The role is optional and always has been, so the step that asks for it needs
    a door that is not "pick something". */
 assert.match(gate,/className="welcome-step-skip"[\s\S]*?\{role\?"DONE":"SKIP FOR NOW"\}/);
 assert.match(gate,/className="welcome-step-back"/);

 /* THE PANEL RENDERS ON THE ROLE STEP AND NOWHERE ELSE. This is what makes
    "not at same time" structural rather than a check somebody can delete: with
    no panel on the mode step, there is no state in which a job title could be
    picked before the mode is answered. */
 assert.match(gate,/\{step==="role"&&<div className=\{"welcome-role"/);
 /* Choosing a role must still never answer the mode question for somebody. */
 const body=gate.slice(gate.indexOf("const chooseRole="),gate.indexOf("\n };",gate.indexOf("const chooseRole=")));
 assert.equal(body.includes("APP_MODE_STORAGE_KEY"),false,"picking a role must not touch the mode");

 /* globals.css line 2 gives every bare <button> height:28px. Every control here
    is a bare button, so each one states its own height — measured at 44px in
    Chromium at 360/390/430/820, not read off this rule. */
 assert.match(css,/\.welcome-role-body button\{min-height:44px/);
 assert.match(css,/\.welcome-role-toggle\{width:100%;min-height:52px/);
 /* And it joins the reduced-motion opt-out rather than being the one panel that
    still flies in for somebody who asked the OS for none of that - the role
    STEP's own heading and buttons included, since they animate in too. Asserted
    per class rather than as one exact selector list, so adding a sibling later
    cannot silently leave it out of the opt-out. */
 const reduced=css.slice(css.indexOf("@media(prefers-reduced-motion:reduce){\n .welcome-name span"));
 for(const cls of [".welcome-name span",".welcome-kicker",".welcome-choices",".welcome-role",".welcome-step-head",".welcome-step-actions",".welcome-foot"]){
  assert.ok(new RegExp(cls.replace(/[.]/g,"\\.")+"[,{]").test(reduced.split("}")[0]),cls+" is missing from the reduced-motion opt-out");
  assert.ok(reduced.includes(".welcome-gate.shown "+cls.split(" ")[0]),cls+" still animates for reduced motion");
 }
});

test("the vertical rail runs beside the defect rows, never across them",async()=>{
 /* Curtis asked this directly: "will they keep the defects themselves separated,
    even though the number is written across them?" It does not run across them
    — it is a 38px stripe in the card's left padding and the rows start after
    it. Measured in Chromium at 360/390/430/820/1180: the rail ends at 63 and
    the first row starts at 71.

    Two rules make that true and both were found by measuring, not by reading. */
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* 1. grid-column:auto on the rail. An abspos child of a grid container with a
       DEFINITE grid placement is positioned against its grid area, and the base
       rule sets grid-column:1 — leaving it in put the rail 46px inboard with
       the rows 30px underneath it. */
 assert.equal(css.match(/\.log-bus-column\{position:absolute;grid-column:auto;left:0;top:0;bottom:0;width:38px/g)?.length,2,"both scopes reset the placement");
 /* 2. Every child moves to column 1, the HEADER included. Missing it left
       .log-card-group>.log-group-header{grid-column:2} applying, which made
       column 2 implicit and collapsed the explicit 1fr column to 0px — defect
       rows measured 2px wide. */
 for(const scope of ['[data-bus-rail="always"]','[data-bus-rail="phone"]'])
  assert.ok(new RegExp(scope.replace(/[[\]"]/g,ch=>"\\"+ch)+" \\.log-card-group>\\.log-group-header,").test(css),scope+" moves the header too");
 /* .log-focus-row is a DEAD selector — no .tsx renders it — and the first
    version of these rules carried two more copies of it. A rule for an element
    that does not exist reads as coverage and is not. */
 for(const file of ["../app/defect-log/page.tsx","../app/settings/_components/defect-log-settings-modal.tsx"])
  assert.equal((await readFile(new URL(file,import.meta.url),"utf8")).includes("log-focus-row"),false,file);
 assert.equal(/data-bus-rail[^{]*\.log-focus-row/.test(css),false,"the option adds no rule for an element nothing renders");
 /* grid-row:1/-1 is NOT how this is done: with rows auto-placed there is no
    explicit grid and -1 resolves to the explicit end, which rendered 146px
    inside a 729px card. */
 assert.equal(/data-bus-rail[^{]*\.log-bus-column\{[^}]*grid-row:1\/-1/.test(css),false);
});

test("the settings page is five sections of closed drawers, and WORDING is one of them",async()=>{
 /* Curtis, after going through the page: "i had a few confusing moments lol.
    Its a lot and i do mean a LOT!! ... We need to compress all of the settings
    in such a way where there is only 5 sections ... The goal here is to make
    the settings section very digestible and easy to navigate."

    The five sections already existed. What did not was a second level: open one
    section and every group inside it was drawn flat and wide open — thirty of
    them across the five panels. Each group is a drawer now and drawers start
    closed. */
 const read=file=>readFile(new URL("../"+file,import.meta.url),"utf8");
 const [drawer,css,settingsPage,mapPanel,downPanel,logPanel,fixedPanel]=await Promise.all([
  read("src/components/settings/settings-drawer.tsx"),read("app/settings/settings.css"),read("app/settings/page.tsx"),
  read("app/settings/_components/map-settings-panel.tsx"),read("app/settings/_components/down-sheet-settings.tsx"),
  read("app/settings/_components/defect-log-settings-modal.tsx"),read("src/components/settings/fixed-repairs-settings.tsx"),
 ]);

 /* STILL EXACTLY FIVE at the top. The drawers are a second level, not a sixth
    section — if this ever grows, the compression has been undone. */
 assert.match(settingsPage,/type SectionKey="master"\|"map"\|"down"\|"log"\|"fixed";/);

 /* CLOSED BY DEFAULT is the whole point: an empty open list, not a list with
    a favourite in it. */
 assert.match(drawer,/useState<readonly string\[\]>\(\[\]\)/,"every drawer starts closed");

 /* WORDING, which Curtis named: "Where you can change the title section name
    and other things, all of that is open. That needs to be collapsed on
    default." It appears on two surfaces and both must be behind a drawer. */
 for(const [panel,where] of [[downPanel,"the Down Sheet"],[logPanel,"the Defect Log"]]){
  assert.match(panel,/<SettingsDrawer title="WORDING"/,"WORDING is a drawer on "+where);
  assert.equal(/<h3>WORDING<\/h3>/.test(panel),false,"WORDING no longer draws itself open on "+where);
 }

 /* Every panel is wrapped, so no group is left outside the system. */
 for(const [panel,where] of [[mapPanel,"map"],[downPanel,"down sheet"],[logPanel,"defect log"],[fixedPanel,"fixed repairs"],[settingsPage,"master"]])
  assert.match(panel,/<SettingsDrawers>/,where+" puts its groups in drawers");

 /* THE WIDTH RULE. Curtis: "Accordion, but keep in mind the design for the
    bigger screen and the PC." One-at-a-time is right on a phone and a
    straitjacket on a shop computer, so the behaviour follows the screen and
    the JS breakpoint is the CSS breakpoint. */
 assert.match(drawer,/export const PHONE_QUERY="\(max-width:620px\)"/);
 assert.match(drawer,/return phone\?\[id\]:\[\.\.\.current,id\]/,"a phone replaces the open drawer; a wide screen adds to it");
 assert.match(drawer,/useState\(true\)/,"the phone rule is the default, because the server cannot measure a window");
 assert.match(css,/@media\(min-width:900px\)\{[\s\S]*?\.settings-drawers\{grid-template-columns:repeat\(2[^}]*grid-auto-flow:row dense\}/,"drawers go two-up where there is room");
 assert.match(css,/\.settings-drawer\.open\{grid-column:1\/-1\}/,"an open drawer takes the full width; dense flow stops that leaving a hole");
 assert.equal(/settings-drawer-wide/.test(css),false,"the per-drawer width flag is gone — open state decides, so a CLOSED page is never ragged");

 /* The header nav carries six links at min-width:102px and the header is a
    flex row, so it must not be allowed to shrink: measured at 1180 it had been
    handed 475px and every adjacent pair of links overlapped by 21.8px. */
 assert.match(css,/@media\(min-width:761px\)\{[\s\S]*?\.settings-header nav\{flex:0 0 auto\}/,
  "the nav keeps its own width — and ONLY in the row layout, because below 760px the header is a column where a flex-basis is a height");

 /* THE BARE button{} RULE in globals.css line 2 sets height:28px, and
    min-height cannot release a fixed height — the trap CLAUDE.md names and
    .app-name documents. Without height:auto a two-line title on a 360px phone
    overflows its own header, silently. */
 const toggle=css.match(/\.settings-drawer-toggle\{[^}]*\}/)[0];
 for(const property of ["height:auto","border:0","border-radius:0","background:","color:","padding:","font-family:inherit","font-size:inherit","font-weight:inherit"])
  assert.ok(toggle.includes(property),".settings-drawer-toggle must answer the bare button rule's "+property);
 assert.match(css,/\.settings-drawer-body\[hidden\]\{display:none\}/,"the body's grid display must not defeat the hidden attribute");

 /* A <button> may only contain phrasing content, so the heading wraps the
    button rather than the other way round — same shape as the section above. */
 assert.match(drawer,/<h3 className="settings-drawer-head">\s*<button type="button" className="settings-drawer-toggle" aria-expanded=\{open\}/);
});

test("a page's settings panel does not draw a second Settings header inside its section",async()=>{
 /* Curtis: "I also noticed that the different sections have their own settings
    section. This looks confusing as well because the same layout is right above
    to actually switch to that page. IT confused me a few times."

    Two doublings caused that, and both are gone. The jump-link nav is asserted
    elsewhere; this is the other one. Each page's panel carried its own
    "DOWN SHEET ADMINISTRATION / Settings" banner, which on the Settings page
    landed directly beneath a section header already saying the page name and
    the word Settings. Kept for the modal path, which has no header above it —
    hence !inline rather than deletion. */
 const read=file=>readFile(new URL("../"+file,import.meta.url),"utf8");
 const [down,log,fixed]=await Promise.all([
  read("app/settings/_components/down-sheet-settings.tsx"),
  read("app/settings/_components/defect-log-settings-modal.tsx"),
  read("src/components/settings/fixed-repairs-settings.tsx"),
 ]);
 assert.match(down,/\{!inline&&<div className="repair-editor-head">/,"the Down Sheet banner is modal-only");
 assert.match(log,/\{!inline&&<header className="log-settings-head">/,"the Defect Log banner is modal-only");
 assert.match(fixed,/\{!inline&&<header><span><small>FIXED REPAIRS<\/small>/,"the Fixed Repairs banner is modal-only");
 /* The CLOSE button rode inside those headers, so it must have gone with them
    rather than been left rendering on its own. Checked by its own markup, not
    by "any !inline button" — the Down Sheet's DONE button is also guarded that
    way, is unrelated, and made the first cut of this assertion fail on a
    control that was never part of the problem. */
 assert.equal(/\{!inline&&<button type="button" onClick=\{onClose\}>×<\/button>\}/.test(down),false,"the Down Sheet close button went with its header");
 assert.equal(/\{!inline&&<button onClick=\{close\}>x<\/button>\}/.test(log),false,"the Defect Log close button went with its header");
 assert.equal(/\{!inline&&<button type="button" onClick=\{close\} aria-label="Close settings">/.test(fixed),false,"the Fixed Repairs close button went with its header");
 /* And the DONE button that IS still guarded stays guarded — it is the one
    control here that legitimately belongs to the modal path only. */
 assert.match(down,/\{!inline&&<button className="save-repair"/,"DONE is still modal-only");
});

test("a settings drawer follows the theme of the section it sits in",async()=>{
 /* THE THIRD TIME THIS SHAPE HAS APPEARED. The Defect Log's own text kept
    light-theme colours on the dark themes until the release before this one.
    The drawers landed with the same defect one level up: DEFECT LOG and FIXED
    REPAIRS render their section in the page's theme, three of the four themes
    are dark, and the drawer header was pinned to a light #f1f5fb. Measured in
    Chromium it came back rgb(241,245,251) on a rgb(16,19,24) section — a 17:1
    jump between a control and the surface under it. Nothing was illegible,
    which is exactly why reading the stylesheet did not catch it.

    Deriving from the theme's own variables rather than pinning a second
    palette is what stops it returning on a theme nobody has added yet, so the
    assertion is that no drawer colour inside those two sections is a literal. */
 const css=await readFile(new URL("../app/settings/settings.css",import.meta.url),"utf8");
 for(const section of ["log","fixed"]){
  const rules=css.split("\n").filter(line=>line.startsWith(".settings-section-"+section+" .settings-drawer"));
  assert.ok(rules.length>=5,"the "+section+" section restyles its drawers ("+rules.length+" rules)");
  for(const rule of rules){
   const declarations=rule.slice(rule.indexOf("{")+1);
   /* Every colour must come from a var(). A bare hex is allowed ONLY as the
      fallback inside var(--x,#hex), which is how the fixed-repairs vars are
      written everywhere else in this file. */
   const literals=declarations.replace(/var\([^)]*\)/g,"").match(/#[0-9a-f]{3,8}/gi);
   assert.equal(literals,null,"pinned colour "+literals+" in: "+rule.slice(0,90));
  }
 }
 /* And the header must differ from the drawer body enough to read as a header,
    which is why it is a mix toward the text/accent rather than the surface. */
 assert.match(css,/\.settings-section-log \.settings-drawer-toggle\{background:color-mix\(in srgb,var\(--log-surface\) 90%,var\(--log-text\)\)/);
});

test("the shift clock knows which shift it is and when the next pullout is",async()=>{
 const {DEFAULT_SHIFT_SETTINGS,SHIFT_SETTINGS_KEY,clockMinutes,formatClock,minutesUntilClock,
  nextPullout,normalizeShiftSettings,shiftAt,shiftLabel,shiftRemainingMinutes,untilLabel,
  windowHours,withinWindow}=await import("../src/lib/settings/shift-clock.ts");

 /* The app already had `Shift` as a LABEL on a sheet entry and nothing that
    mapped a clock time onto one, and no pullout time anywhere. Curtis: "it must
    be shift aware and pull out time aware." */
 assert.equal(SHIFT_SETTINGS_KEY,"pace-shift-settings-v1");
 /* THE SHOP'S REAL HOURS, given by Curtis: "first shift is 6 am to 14:30,
    second is 14:00 to 10:30 and night shift is 10:00 til 6:30", plus "Pull out
    for a.m. is 6:00 am and for evening is 13:00 hours." He wrote the shifts in
    mixed notation — the evening 10:30 and 10:00 are 22:30 and 22:00 — and
    confirmed the reading before they were written down. */
 assert.deepEqual(DEFAULT_SHIFT_SETTINGS.pullouts.map(p=>p.at),["06:00","13:00"]);
 assert.deepEqual(DEFAULT_SHIFT_SETTINGS.shifts.map(s=>[s.key,s.start,s.end]),
  [["1st","06:00","14:30"],["2nd","14:00","22:30"],["3rd","22:00","06:30"]]);
 /* Every shift is 8.5 hours and they OVERLAP by 30 minutes at each handover.
    That is a relief window, not a typo. */
 const span=s=>{const a=clockMinutes(s.start),b=clockMinutes(s.end);return a<b?b-a:1440-a+b};
 assert.deepEqual(DEFAULT_SHIFT_SETTINGS.shifts.map(span),[510,510,510]);

 assert.equal(clockMinutes("06:00"),360);
 assert.equal(clockMinutes("13:45"),825);
 assert.equal(clockMinutes("23:59"),1439);
 /* Null, never 0. A malformed setting reading as midnight would sit inside the
    night shift and quietly move every window that depends on it. */
 assert.equal(clockMinutes("24:00"),null);
 assert.equal(clockMinutes("6pm"),null);
 assert.equal(clockMinutes(""),null);
 assert.equal(clockMinutes(undefined),null);
 assert.equal(formatClock(360),"06:00");
 assert.equal(formatClock(1440+90),"01:30","a window that runs past midnight wraps rather than overflowing");

 /* THE NIGHT SHIFT RUNS PAST MIDNIGHT, so its start is numerically after its
    end. The obvious `start<=m&&m<end` reports every hour of the night as
    belonging to no shift at all. */
 assert.equal(withinWindow(1380,1320,360),true,"23:00 is inside 22:00-06:00");
 assert.equal(withinWindow(120,1320,360),true,"and so is 02:00");
 assert.equal(withinWindow(720,1320,360),false,"but midday is not");
 assert.equal(withinWindow(420,360,840),true,"07:00 is inside 06:00-14:00");

 const at=(h,m=0)=>{const d=new Date("2026-09-14T00:00:00");d.setHours(h,m,0,0);return d};
 assert.equal(shiftAt(at(7)),"1st");
 assert.equal(shiftAt(at(15)),"2nd");
 assert.equal(shiftAt(at(23)),"3rd");
 assert.equal(shiftAt(at(2)),"3rd","the small hours belong to the shift that started last night");
 /* THE HANDOVER GOES TO THE INCOMING SHIFT. Between 14:00 and 14:30 both 1st
    and 2nd genuinely match, and returning the first window in the list would
    have credited every one of those half-hours to the OUTGOING crew purely
    because of array order — 30 minutes of arrivals on the wrong tally, three
    times a day. Curtis chose the incoming shift: the relief has started and
    they are the crew who will work whatever comes in. */
 assert.equal(shiftAt(at(14)),"2nd","the handover opens the incoming shift immediately");
 assert.equal(shiftAt(at(14,15)),"2nd","and holds it through the overlap");
 assert.equal(shiftAt(at(14,29)),"2nd");
 assert.equal(shiftAt(at(13,59)),"1st","right up to the handover it is still the outgoing shift");
 assert.equal(shiftAt(at(22,15)),"3rd","the same at the evening handover");
 assert.equal(shiftAt(at(6,15)),"1st","and at the morning one, where the incoming shift is the next day's");
 assert.equal(shiftAt(at(5,59)),"3rd");
 assert.equal(shiftAt("not a date"),null);
 assert.equal(shiftLabel("1st"),"1ST SHIFT");
 assert.equal(shiftLabel(null),"OFF SHIFT");

 /* Standing exactly ON the pullout, the next one is tomorrow's — which is what
    somebody asking "how long until pullout" means at 06:00 sharp. */
 assert.equal(minutesUntilClock(at(6),"06:00"),1440);
 assert.equal(minutesUntilClock(at(5),"06:00"),60);
 assert.equal(minutesUntilClock(at(23),"06:00"),420,"and it counts across midnight");

 assert.deepEqual(nextPullout(at(4)),{key:"am",label:"A.M. PULLOUT",at:"06:00",minutesAway:120});
 assert.deepEqual(nextPullout(at(9)),{key:"pm",label:"EVENING PULLOUT",at:"13:00",minutesAway:240});
 assert.equal(nextPullout(at(14)).key,"am","after the last pullout of the day the next is tomorrow morning's");

 assert.equal(shiftRemainingMinutes(at(13)),90,"1st shift ends at 14:30");
 assert.equal(shiftRemainingMinutes(at(23)),450,"and the night shift's remainder counts past midnight");

 /* Every forecast window resolves through here, in hours, because a rate per
    hour is what multiplies by one. */
 assert.equal(windowHours(at(13),"shift"),1.5);
/* Measured straight through to the END of the next shift rather than summed.
    With half-hour overlaps, "what is left of this one plus the length of that
    one" double-counts every handover — at 13:00 it would say 10h where the
    clock from 13:00 to 22:30 says 9.5. */
 assert.equal(windowHours(at(13),"two-shifts"),9.5,"13:00 to the end of 2nd shift at 22:30");
 assert.equal(windowHours(at(4),"pullout"),2);
 assert.equal(windowHours(at(23),"two-shifts"),15.5,"23:00 to the end of 1st shift at 14:30");

 /* EDITABLE WITHOUT A RELEASE, which is the half Curtis asked for twice. Shift
    hours are a property of this garage's contract, not of the software. */
 const custom=normalizeShiftSettings({shifts:[{key:"1st",start:"05:30",end:"13:30"}],
  pullouts:[{key:"early",label:"early",at:"05:00"}]});
 assert.equal(custom.shifts[0].start,"05:30");
 assert.equal(custom.shifts[1].key,"2nd","a shift the saved settings never mention keeps its default");
 assert.deepEqual(custom.pullouts,[{key:"early",label:"EARLY",at:"05:00"}]);
 assert.equal(shiftAt(at(5,45),custom),"1st","and the clock follows the edit");

 /* A half-edited blob must still produce a working clock: this is consulted
    every time the report draws, and throwing would take the report with it. */
 const broken=normalizeShiftSettings({shifts:[{key:"1st",start:"06:00",end:"nonsense"}],pullouts:[]});
 assert.deepEqual(broken.shifts[0],DEFAULT_SHIFT_SETTINGS.shifts[0],
  "one bad edge falls back whole rather than mixing the garage's hours with the default's");
 assert.deepEqual(broken.pullouts,DEFAULT_SHIFT_SETTINGS.pullouts,
  "and no pullouts reads as not configured, because a garage with none is not a thing");
 assert.deepEqual(normalizeShiftSettings(null),DEFAULT_SHIFT_SETTINGS);
 assert.deepEqual(normalizeShiftSettings("garbage"),DEFAULT_SHIFT_SETTINGS);

 assert.equal(untilLabel(260),"4h 20m");
 assert.equal(untilLabel(60),"1h");
 assert.equal(untilLabel(45),"45m");
 assert.equal(untilLabel(null),"");
});

test("the garage's hours are editable on the device, and nothing re-implements the clock",async()=>{
 const [panel,settings]=await Promise.all([
  readFile(new URL("../app/settings/_components/shift-settings.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8"),
 ]);
 const code=panel.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");

 /* Curtis asked for the panel in the same breath as the clock: "a settings
    option to fine tune both of these options in case changes need to be made
    without you writing code." Both halves — the shift windows AND the pullout
    times — have to be editable, which is what "both of these options" names. */
 assert.match(settings,/<ShiftSettingsPanel\/>/,"the panel is actually on the Settings page");
 assert.match(code,/settings\.shifts\.map/,"every shift window is editable");
 assert.match(code,/settings\.pullouts\.map/,"and so is every pullout time");
 assert.match(code,/localStorage\.setItem\(SHIFT_SETTINGS_KEY/,"and the edit is written to the device");

 /* ONE PLACE KNOWS WHAT A SHIFT IS. The panel reads the same module the report
    and the forecast do rather than parsing "HH:MM" itself — this repo has paid
    for five copies of one table and two road-call records that drifted, and a
    second opinion about when 2nd shift starts would be the next one. */
 assert.match(code,/from "(?:[^"]*\/)shift-clock"/);
 assert.equal(/\d+\s*\*\s*60\s*\+/.test(code),false,"the panel never converts a clock time itself");
 assert.equal(/getHours\(\)/.test(code),false,"nor reads the wall clock behind the module's back");

 /* A time input hands back "0" halfway through somebody typing "06:00", and
    writing that through would move the whole shift under them mid-edit — the
    same lesson the Down Sheet's hours boxes cost us. An edge that is not yet a
    real time is held in state and simply not saved. */
 assert.match(code,/if\(clockMinutes\(value\)!==null\)save\(next\)/,
  "a half-typed time is not committed");
});
