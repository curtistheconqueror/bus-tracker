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
  /* Asserted as a SET rather than as one exact string. The pin here used to be
     the whole argument list in order, so adding a setting broke it in a way
     that said nothing about what was wrong — and reordering two fields that
     changes nothing would break it too. What matters is that every board
     setting the page holds is in the object it writes: one left out is a
     preference that silently never persists. */
  const written=page.match(/JSON\.stringify\(\{statusVersion:3,([^}]*(?:\{[^}]*\}[^}]*)*)\}\)\)/);
  assert.ok(written,"the map still writes its settings as one object");
  /* DERIVED FROM BoardSettings, not hand-listed. A hand-written list cannot
     know it is complete: add a setting to the type and to readBoardSettings,
     forget the map's own write, and a hand-listed assertion passes while the
     preference silently never persists. */
  const {readBoardSettings:readBoard}=await import("../src/lib/settings/map-settings.ts");
  for(const field of Object.keys(readBoard(null)))
   assert.ok(new RegExp("(^|[,{])"+field+"\\s*([,:}]|$)").test(written[1].trim()),
    field+" is in the map's own write, or it is a setting that never persists");
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
  assert.match(fixedCss,/\.fixed-header nav\{[^}]*grid-template-columns:repeat\(auto-fit/,
    "the column count must not encode how many pages exist — repeat(6) hid the gear when an eighth page arrived");
  assert.match(fixedCss,/@media\(max-width:760px\)\{\.fixed-header\{[^}]*overflow:visible/);
  assert.match(fixedCss,/\.fixed-repairs-app>\.fixed-header\{height:auto\}/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{\.fixed-settings-shade\{align-items:stretch/);
  assert.match(fixedCss,/\.fixed-repairs-app>\.fixed-header nav\{[^}]*height:auto[^}]*background:transparent/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card>footer\{[^}]*position:static[^}]*transform:none[^}]*white-space:normal/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-editor>footer\{[^}]*position:static[^}]*transform:none[^}]*white-space:normal/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{[\s\S]*?\.fixed-repairs-app>\.fixed-header nav\{grid-template-columns:repeat\(3/,"six links, two full rows on a phone");
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card-actions\{width:100%;grid-template-columns:minmax\(0,1\.55fr\) minmax\(0,1fr\) minmax\(0,\.8fr\)/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card-actions button:first-child\{grid-column:auto\}/);
  assert.match(worker,/CORE_PAGES = \["\/", "\/down-sheet", "\/defect-log", "\/fixed-repairs", "\/lists", "\/incidents", "\/shop-talk", "\/settings"\]/);
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
     pre-cache: activate only purges caches whose name no longer matches. The
     same holds when a CORE_FILE's CONTENTS change under an unchanged name —
     these files are served cache-first and, unlike the hashed chunks, keep
     their names from one release to the next, so a phone that already holds
     one never asks for it again. The new icon in Version 186 changed
     favicon.svg and the manifest without renaming either, which is why that
     release bumped this line too. */
  assert.match(worker,/CACHE_NAME = "pace-bus-tracker-shell-v7"/);
  assert.match(catalog,/completedBy\?:string/);
  assert.match(catalog,/conditionNotDuplicated\?:boolean/);
  const response=await render("/fixed-repairs");
  assert.equal(response.status,200);
  assert.match(await response.text(),/Fixed Repairs/);
});

test("every page draws the same eight links from one list",async()=>{
 const nav=await readFile(new URL("../src/components/shared/tracker-nav.tsx",import.meta.url),"utf8");
 const {TRACKER_PAGES,otherPages}=await import("../src/lib/settings/tracker-pages.ts");
 const pagesSource=await readFile(new URL("../src/lib/settings/tracker-pages.ts",import.meta.url),"utf8");

 /* Five copies of this nav drifted: the Facility Map called itself FLEET
    TRACKER in its own nav while every other page called it FACILITY MAP. One
    list, one name. */
 assert.deepEqual(TRACKER_PAGES.map(page=>page.label),
  ["FACILITY MAP","DOWN SHEET","DEFECT LOG","FIXED REPAIRS","FLEET CAMPAIGNS","INCIDENTS","SHOP TALK","⚙ SETTINGS"]);
 assert.deepEqual(TRACKER_PAGES.map(page=>page.href),["/","/down-sheet","/defect-log","/fixed-repairs","/lists","/incidents","/shop-talk","/settings"]);
 assert.notEqual(TRACKER_PAGES.length%3,1,
  "a phone draws three across, and the last row must never strand a single tab on its own");
 /* Checked on the data, not the source: the file's own comment records the old
    name to explain why the component exists, and prose is not a label. */
 assert.equal(TRACKER_PAGES.some(page=>page.label==="FLEET TRACKER"),false,"the map's private name for itself is gone");
 assert.equal(/label:"FLEET TRACKER"/.test(pagesSource),false);

 // The component owns the landmark and the current-page mark.
 assert.match(nav,/<nav className=\{className\} aria-label="Tracker pages">/);
 assert.match(nav,/aria-current=\{current\?"page":undefined\}/);

 // Every page renders it, marking itself, and none still carries a hand-written copy.
 const pages=[["app/page.tsx","/"],["app/down-sheet/page.tsx","/down-sheet"],["app/defect-log/page.tsx","/defect-log"],
  ["app/incidents/page.tsx","/incidents"],["app/shop-talk/page.tsx","/shop-talk"],
  ["app/fixed-repairs/page.tsx","/fixed-repairs"],["app/lists/page.tsx","/lists"],["app/settings/page.tsx","/settings"]];
 for(const [file,active] of pages){
  const source=await readFile(new URL("../"+file,import.meta.url),"utf8");
  assert.match(source,new RegExp('<TrackerNav[^>]*active="'+active.replace(/\//g,"\\/")+'"'),file+" marks itself as current");
  assert.equal(/<nav aria-label="Tracker pages">/.test(source),false,file+" no longer hand-writes the nav");
  assert.equal(/<a href="\/lists">FLEET CAMPAIGNS<\/a>/.test(source),false,file+" carries no literal copy of a link");
 }

 // The map's desktop menu is the same list minus the map, with counts attached.
 const other=otherPages({"/defect-log":7,"/down-sheet":2});
 assert.deepEqual(other.map(page=>page.href),["/down-sheet","/defect-log","/fixed-repairs","/lists","/incidents","/shop-talk","/settings"]);
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

test("the shift clock says how long the current shift has been running",async()=>{
 /* Curtis asked to be able to send a snapshot of one shift's work rather than
    "all the other buses from the other days", and named the boundary himself:
    "at two o'clock, which is the shift I work, that's when it can start ...
    because at two I'm officially coming in, so the expectation is for me to
    take on work. The expectation for the other shift leaving, even though it's
    overlapping, is to delegate or dismiss work."

    So THIS SHIFT is a span the clock decides — five minutes at 14:05 and eight
    and a half hours at 22:00 — and it hangs off the same handover rule shiftAt
    already applies rather than a second table of times. */
 const {activeShift,shiftAt,DEFAULT_SHIFT_SETTINGS}=await import("../src/lib/settings/shift-clock.ts");
 const at=(h,m=0)=>{const d=new Date("2026-09-14T00:00:00");d.setHours(h,m,0,0);return d};

 /* THE INCOMING CREW OWNS THE HANDOVER, and the span restarts at its start —
    not at the end of the overlap. At 14:05 the window is five minutes old, so
    the morning's work falls out, which is the entire point. */
 assert.deepEqual(activeShift(at(14)),{key:"2nd",since:0,start:"14:00"});
 assert.deepEqual(activeShift(at(14,5)),{key:"2nd",since:5,start:"14:00"});
 assert.deepEqual(activeShift(at(13,59)),{key:"1st",since:7*60+59,start:"06:00"},"right up to the handover it is still the outgoing shift");
 assert.deepEqual(activeShift(at(22,10)),{key:"3rd",since:10,start:"22:00"});
 /* Past midnight on the shift that began last night: the span has to wrap, or
    every hour after 00:00 reads as a fresh shift. */
 assert.deepEqual(activeShift(at(2)),{key:"3rd",since:4*60,start:"22:00"});
 assert.deepEqual(activeShift(at(6,15)),{key:"1st",since:15,start:"06:00"},"the 06:00 handover belongs to the day crew");

 /* ONE FUNCTION PICKS THE WINDOW. shiftAt is this narrowed to its key, so the
    two can never disagree about who owns 14:15 — the half-hour the overlap
    rule exists to settle. */
 for(const time of [at(0),at(6),at(6,15),at(13,59),at(14),at(14,29),at(18),at(22),at(22,30),at(23,59)])
  assert.equal(shiftAt(time),activeShift(time).key,"shiftAt and activeShift agree at "+time.getHours()+":"+time.getMinutes());

 /* The start is formatted, not echoed: a garage that typed `6:00` into Settings
    still reads back 06:00 on a list somebody else opens. */
 assert.equal(activeShift(at(7),{...DEFAULT_SHIFT_SETTINGS,shifts:[{key:"1st",start:"6:00",end:"14:30"}]}).start,"06:00");
 /* No window matching means no shift to name, rather than a guess. */
 assert.equal(activeShift(at(12),{shifts:[],pullouts:[]}),null);
 assert.equal(activeShift("not a time"),null);
});

test("nothing the app can be heard or felt doing happens before somebody asks", async () => {
 const {DEFAULT_FEEDBACK,readFeedbackSettings,loadFeedbackSettings,serializeFeedbackSettings,buzz,soundAllowed,FEEDBACK_SETTINGS_KEY}
  =await import("../src/lib/settings/feedback-settings.ts");

 /* Curtis: "make sure the sound is off by default ok? Any sounds. Toggleable
    in settings." Off is the whole requirement, so it is asserted from every
    direction a device can arrive at it. */
 assert.deepEqual(DEFAULT_FEEDBACK,{sound:false,vibration:false});
 for(const raw of [null,"","null","{}",'{"sound":true}'.replace("true","null"),"not json","[]","0",'{"version":1}']){
  const read=readFeedbackSettings(raw);
  assert.deepEqual(read,{sound:false,vibration:false},JSON.stringify(raw)+" reads as silent");
 }

 /* OFF IS THE SAFE READ, which inverts what app-mode.ts does on purpose. A
    corrupt record there resolves to FULL because taking pages away mid-shift
    is the worse failure; a corrupt record here must not be what starts a
    phone making noise. */
 assert.deepEqual(readFeedbackSettings('{"sound":"yes","vibration":1}'),{sound:false,vibration:false},
  "only a literal true counts, so a hand-edited file cannot switch this on");
 assert.deepEqual(readFeedbackSettings('{"sound":true,"vibration":true}'),{sound:true,vibration:true},
  "and an honest yes still works");

 /* A MIXED RECORD READS AS BOTH ON. One switch draws these two flags now, and
    a device that ticked only SOUND under the two-switch UI would otherwise
    render that switch ON while holding a bus made no buzz at all -- the app's
    only perceivable feedback, silently missing, with no way out but toggling
    off and on. */
 assert.deepEqual(readFeedbackSettings('{"sound":true,"vibration":false}'),{sound:true,vibration:true},
  "a sound-only device from the old UI gets the vibration its switch claims");
 assert.deepEqual(readFeedbackSettings('{"sound":false,"vibration":true}'),{sound:true,vibration:true},
  "and the other way round");

 /* A storage that throws is a silent phone, not a crash. */
 const throwing={getItem(){throw new Error("denied")},setItem(){throw new Error("denied")}};
 assert.deepEqual(loadFeedbackSettings(throwing),{sound:false,vibration:false});
 assert.equal(buzz(throwing,12),false);
 assert.equal(soundAllowed(throwing),false);

 /* A DEVICE THAT CAN ACTUALLY VIBRATE, which Node is not: its global
    navigator has no vibrate, so without this stub `buzz` returned false
    because the API was missing rather than because the setting was off — and
    deleting the setting check entirely left the whole suite green. */
 const realNavigator=globalThis.navigator;
 let buzzes=0;
 Object.defineProperty(globalThis,"navigator",{value:{vibrate:()=>{buzzes++;return true}},configurable:true,writable:true});
 try{
  const off={getItem:()=>null};
  assert.equal(buzz(off,12),false,"a device that has never been to Settings stays still");
  assert.equal(buzzes,0,"and navigator is not reached at all");
  assert.equal(soundAllowed(off),false);

  const on={getItem:()=>'{"sound":true,"vibration":true}'};
  assert.equal(buzz(on,12),true,"turning the switch on makes it buzz");
  assert.equal(buzzes,1,"exactly once");
  assert.equal(soundAllowed(on),true);

  /* ONE SWITCH, so a record holding only one flag -- which is what a device
     that used the two-switch UI holds -- must not leave half the feedback
     dead behind a control that says it is on. */
  const vibrationOnly={getItem:()=>'{"sound":false,"vibration":true}'};
  assert.equal(buzz(vibrationOnly,12),true,"an old vibration-only device still buzzes");
  assert.equal(soundAllowed(vibrationOnly),true,"and its switch is telling the truth");
  const soundOnly={getItem:()=>'{"sound":true,"vibration":false}'};
  assert.equal(buzz(soundOnly,12),true,"an old sound-only device buzzes, because its switch says on");
  assert.equal(soundAllowed(soundOnly),true);
  assert.equal(buzzes,3,"three buzzes, one per call that was allowed");

  /* A navigator whose vibrate refuses, and one that throws. */
  globalThis.navigator={vibrate:()=>false};
  assert.equal(buzz(vibrationOnly,12),false,"a refused vibrate is reported, not thrown");
  globalThis.navigator={vibrate(){throw new Error("not allowed")}};
  assert.equal(buzz(vibrationOnly,12),false,"and a throwing one is caught");
 }finally{
  Object.defineProperty(globalThis,"navigator",{value:realNavigator,configurable:true,writable:true});
 }

 /* The default object is copied, so a caller mutating what it read cannot
    turn the default on for everybody after it. */
 const first=readFeedbackSettings(null);
 first.sound=true;
 assert.equal(readFeedbackSettings(null).sound,false);
 assert.equal(DEFAULT_FEEDBACK.sound,false);

 assert.match(serializeFeedbackSettings({sound:false,vibration:true}),/"sound":false/);
 assert.equal(FEEDBACK_SETTINGS_KEY,"pace-feedback-settings-v1");
});

test("a sound added later cannot get around the switch", async () => {
 /* THIS IS THE ACTUAL GUARANTEE, and the reason feedback-settings.ts exists
    at all. When Curtis asked for sound off by default the app made no sound:
    no AudioContext, no Audio element, no audio file, no speech synthesis. An
    off switch for nothing is worth very little; a gate that something added
    in six months cannot walk around is worth the file.

    So this walks the source tree and fails if anything outside that one
    module names an API that can be heard or felt. The same shape as the test
    holding pace-role-v1 inside roles.ts, and for a stronger reason: a role
    read in the wrong place is a bug somebody notices, and a chirp on a phone
    in a meeting is the app being turned off. */
 /* STRING-AWARE, because a regex that merely deletes /* ... *\/ is not. A
    source line holding "https://example.com/*" opened a pseudo-comment that
    swallowed everything up to the file's next real close — a planted
    new Audio("/ding.mp3") after one of those passed the scan. And a `//`
    comment that did not start its line was never stripped at all, so prose
    about this rule failed the build while real code hid from it: both bugs,
    opposite directions, one cause.

    Comments go; STRINGS STAY, because an audio path only ever appears in one.
    A regex literal containing a quote can be mistaken for a string here, which
    leaves more text in the scan rather than less — the safe direction. */
 const stripComments=source=>{
  let out="",i=0;
  while(i<source.length){
   const c=source[i],next=source[i+1];
   if(c==='"'||c==="'"||c==="`"){
    out+=c;i++;
    while(i<source.length){
     const d=source[i];out+=d;i++;
     if(d==="\\"){if(i<source.length){out+=source[i];i++}continue}
     if(d===c)break;
    }
    continue;
   }
   if(c==="/"&&next==="*"){i+=2;while(i<source.length&&!(source[i]==="*"&&source[i+1]==="/"))i++;i+=2;out+=" ";continue}
   if(c==="/"&&next==="/"){while(i<source.length&&source[i]!=="\n")i++;out+=" ";continue}
   out+=c;i++;
  }
  return out;
 };

 /* public/ is in scope because public/sw.js can call showNotification, which
    on Android rings and vibrates. The extension list covers what actually
    ships: a .mjs, a .json or an .html in these trees runs or renders. */
 const roots=["app","src","public"],offenders=[],
  banned=[
   /\.\s*vibrate\s*\(/,              // navigator.vibrate, and any alias of it
   /\bnew\s+(?:\w+\s*\.\s*)?Audio\s*\(/,  // new Audio, new window.Audio
   /\bAudioContext\b/,/\bwebkitAudioContext\b/,
   /createElement\s*\(\s*["'`]audio["'`]/i,
   /\bspeechSynthesis\b/,/\bSpeechSynthesisUtterance\b/,
   /\bnew\s+Notification\s*\(/,/\bshowNotification\s*\(/,  // rings on Android
   /<audio[\s>]/i,
   /["'`(\/][\w.\-\/]*\.(?:mp3|wav|ogg|m4a|aac)\b/i,  // a PATH, not a .wav class name
  ],
  allowed="src/lib/settings/feedback-settings.ts";
 const walk=async dir=>{
  for(const entry of await readdir(new URL("../"+dir+"/",import.meta.url),{withFileTypes:true})){
   const path=dir+"/"+entry.name;
   if(entry.isDirectory()){await walk(path);continue}
   if(!/\.(tsx?|jsx?|mjs|css|html|json|webmanifest)$/.test(entry.name))continue;
   if(path===allowed)continue;
   const code=stripComments(await readFile(new URL("../"+path,import.meta.url),"utf8"));
   for(const pattern of banned)if(pattern.test(code))offenders.push(path+"  ->  "+pattern);
  }
 };
 await Promise.all(roots.map(walk));
 assert.deepEqual(offenders,[],
  "anything audible or felt goes through src/lib/settings/feedback-settings.ts, which is off by default:\n"+offenders.join("\n"));

 /* And the one buzz there is actually routes through it. */
 const mapPage=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.match(mapPage,/buzz\(localStorage,12\)/,"picking a bus up asks the setting first");
 assert.match(mapPage,/import \{buzz\} from "@\/src\/lib\/settings\/feedback-settings"/);

 /* Settings can reach both switches. */
 const settingsPage=await readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8");
 /* ONE switch for both, which is Curtis's call: "Yes sound and vibration
    together." The storage keeps two flags, so splitting them again later is a
    UI change and not a migration — but the control sets both, and a stored
    record with only one of them on still reads as on. */
 assert.match(settingsPage,/SOUND &amp; VIBRATION ON THIS DEVICE/);
 assert.match(settingsPage,/checked=\{feedback\.sound\}/,"one flag is enough, because read normalises them together");
 assert.match(settingsPage,/setFeedback\(\{sound:event\.target\.checked,vibration:event\.target\.checked\}\)/,"and the one switch sets both");
 assert.doesNotMatch(settingsPage,/checked=\{feedback\.vibration\}/,"there is no second switch any more");
});

test("Escape in the bus editor is off, and asks only when something changed", async () => {
 const [mapPage,panel,module]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/map-settings-panel.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/settings/map-settings.ts",import.meta.url),"utf8"),
 ]);
 const {readBoardSettings}=await import("../src/lib/settings/map-settings.ts");

 /* OFF unless somebody asked, like every other `===true` setting in this file.
    Curtis chose "leave it like it is" and then asked for the switch, so the
    default has to be the behaviour that already existed. */
 assert.equal(readBoardSettings(null).escapeClosesEditor,false,"a device that has never been to Settings");
 assert.equal(readBoardSettings("{}").escapeClosesEditor,false);
 assert.equal(readBoardSettings('{"escapeClosesEditor":"yes"}').escapeClosesEditor,false,"only a literal true counts");
 assert.equal(readBoardSettings('{"escapeClosesEditor":true}').escapeClosesEditor,true);
 assert.match(module,/escapeClosesEditor:ui\.escapeClosesEditor===true/);

 /* IT LIVES IN THE EDITOR, not in the page's Escape ladder, because the page
    knows which layers are open and only this component knows whether anything
    has been typed into one. */
 const ladder=mapPage.match(/const escape=\(event:KeyboardEvent\)=>\{\n if\(event\.key!=="Escape"\)return;[\s\S]*?\n\};/);
 assert.ok(ladder,"the page still has its own ladder");
 assert.doesNotMatch(ladder[0],/closeEditor|setEdit/,"which still does not touch the editor");

 /* The fingerprint covers all three places a change can hide. A draft-only
    comparison would call a half-typed defect, or an edited hold time, clean. */
 /* EVERY BOX, not three of twenty-three. The first version watched only the
    draft bus, the hold time and a part-typed defect, so an odometer reading,
    an engine-hour reading, a service completion or a switch target was thrown
    away without a question -- while the comment beside it promised the
    opposite. A reading only reaches the draft when its own ADD button is
    pressed, which is exactly the state somebody is in when they hit Escape. */
 const fingerprint=mapPage.match(/const typedInto=\[([\s\S]*?)\];/);
 assert.ok(fingerprint,"the editor fingerprints what was typed into it");
 for(const field of ["d","holdUntil","newDefect","repairGroup","odometerMiles","odometerRecordedAt","odometerNote",
  "engineHours","engineHoursRecordedAt","engineHoursNote","maintenanceKind","completionMiles","completionHours",
  "completionCompletedAt","completionNote","switchBusId","switchDestination","addToDefectLog","addToDownSheet","smartStatusEnabled"])
  assert.ok(new RegExp("(^|[\\[,\\s])"+field+"\\s*([,\\]]|$)").test(fingerprint[1].trim()),field+" is watched, or Escape discards it silently");
 /* And NOT these: they say which panel is open, not what is in it. */
 for(const ui of ["adding","switchOpen","entryMode"])
  assert.ok(!new RegExp("(^|[\\[,\\s])"+ui+"\\s*([,\\]]|$)").test(fingerprint[1].trim()),ui+" is panel state, and confirming over it is the friction Curtis asked to avoid");
 assert.match(mapPage,/const \[openedAs\]=useState\(\(\)=>JSON\.stringify\(typedInto\)\)/,"taken once, on open");
 assert.match(mapPage,/const changed=openedAs!==JSON\.stringify\(typedInto\)/);

 /* Innermost first: a sub-panel takes the Escape before the editor does. */
 assert.match(mapPage,/if\(adding\)\{setAdding\(false\);return\}/);
 assert.match(mapPage,/if\(switchOpen\)\{setSwitchOpen\(false\);return\}/);

 /* Guarded by the setting, and the confirm fires ONLY when dirty -- Curtis:
    "I may not want the close but ask all the time because it's a friction
    point against speed." */
 const handler=mapPage.match(/if\(!escapeCloses\)return;[\s\S]*?\},\[([^\]]*)\]\);/);
 assert.ok(handler,"the editor's Escape is behind the setting");
 assert.match(handler[0],/if\(changed&&!confirm\(/,"a form nobody touched closes without a question");
 assert.match(handler[0],/window\.addEventListener\("keydown",escape,true\)/);
 assert.match(handler[0],/return\(\)=>window\.removeEventListener\("keydown",escape,true\)/,"and comes off again");
 /* The dependency SET, not its order -- an order pin is the brittleness this
    file has already been caught by twice. */
 assert.deepEqual([...new Set(handler[1].split(",").map(name=>name.trim()))].sort(),
  ["adding","changed","close","d.n","escapeCloses","switchOpen"],"the effect declares exactly what it reads");

 /* THE MAP HAS TO READ IT AND HAND IT DOWN. Deleting either line left the
    feature entirely dead with the whole suite green -- and worse, the map's
    write is a full replace, so its stale false would go back over the true
    that Settings had just written. */
 assert.match(mapPage,/setEscapeClosesEditor\(ui\.escapeClosesEditor===true\)/,"read on hydration");
 assert.match(mapPage,/setEscapeClosesEditor\(ui\.escapeClosesEditor\)/,"and refreshed when another tab changes it");
 assert.match(mapPage,/escapeCloses=\{escapeClosesEditor\}/,"and handed to the editor");

 /* Reachable, and described as what it is. */
 assert.match(panel,/ESCAPE CLOSES THE BUS EDITOR/);
 assert.match(panel,/checked=\{escapeClosesEditor\}/);
});

test("one header colour for the whole app, with a page theme and an override above it", async () => {
 const {DEFAULT_HEADER_COLOR,DEFAULT_HEADER_THEME,HEADER_SURFACES,HEADER_THEME_KEY,HEADER_TEXT_DARK,HEADER_TEXT_LIGHT,
  contrastRatio,hasHeaderOverride,headerColorFor,headerContrast,headerGradient,headerStops,headerTextFor,isHeaderColor,loadHeaderTheme,
  readHeaderTheme,resolveHeaderColor,resolveHeaderInk,saveHeaderTheme,serializeHeaderTheme}
  =await import("../src/lib/settings/header-theme.ts");

 assert.equal(HEADER_THEME_KEY,"pace-header-theme-v1");
 /* The eight surfaces of the app, and nothing else: a ninth would be a page
    that exists, and a missing one a header this setting cannot reach. */
 assert.deepEqual(HEADER_SURFACES.map(s=>s.key),["map","down","log","fixed","lists","incidents","talk","settings"]);

 /* ALL EIGHT THE SAME is what was chosen, so a device that has never opened
    this panel resolves every surface to one colour. */
 for (const {key} of HEADER_SURFACES) assert.equal(headerColorFor(DEFAULT_HEADER_THEME,key),DEFAULT_HEADER_COLOR);

 /* A colour goes straight into a style attribute. Only a hex colour is taken,
    and everything else reads as "not set" rather than as itself. */
 assert.ok(isHeaderColor("#041d47")&&isHeaderColor("#ABC")&&isHeaderColor(" #abc123 "));
 for (const bad of ["red","rgb(4,29,71)","#12345","#gggggg","red; background:url(x)","",null,undefined,7,{}])
  assert.equal(isHeaderColor(bad),false,String(bad));
 assert.deepEqual(readHeaderTheme(JSON.stringify({shared:"red; background:url(x)",overrides:{log:"javascript:x"}})),
  {shared:DEFAULT_HEADER_COLOR,overrides:{}});

 /* An override that is not a colour is stored as an ABSENCE, the spelling
    setBusHold and the ledger's `gap` use, so "" cannot read as a value. */
 const mixed=readHeaderTheme(JSON.stringify({shared:"#223344",overrides:{log:"#ff0000",talk:"",lists:5}}));
 assert.deepEqual(mixed,{shared:"#223344",overrides:{log:"#ff0000"}});
 assert.equal("talk" in mixed.overrides,false);
 assert.equal(hasHeaderOverride(mixed,"log"),true);
 assert.equal(hasHeaderOverride(mixed,"talk"),false);
 assert.equal(headerColorFor(mixed,"log"),"#ff0000");
 assert.equal(headerColorFor(mixed,"talk"),"#223344");

 /* Unreadable, missing and the wrong shape all land on the default rather
    than throwing into a render. */
 for (const bad of [null,"","{",'"text"',"[]","7"]) assert.deepEqual(readHeaderTheme(bad),{shared:DEFAULT_HEADER_COLOR,overrides:{}});
 assert.deepEqual(loadHeaderTheme({getItem(){throw new Error("denied")}}),{shared:DEFAULT_HEADER_COLOR,overrides:{}});
 assert.equal(saveHeaderTheme({getItem:()=>null,setItem(){throw new Error("full")}},DEFAULT_HEADER_THEME),false);
 assert.deepEqual(readHeaderTheme(serializeHeaderTheme(mixed)),mixed);

 /* THE LADDER: an override for this surface, then a page theme, then the
    shared colour. A device on the default theme passes no page theme at all,
    which is the case every surface is in until somebody picks one. */
 assert.equal(resolveHeaderColor(mixed,"fixed",undefined),"#223344");
 assert.equal(resolveHeaderColor(mixed,"fixed","#15180f"),"#15180f");
 /* The override outranks the page theme, so Settings can always force it. */
 assert.equal(resolveHeaderColor(mixed,"log","#15180f"),"#ff0000");
 /* A page theme that is not a colour is not a rung. */
 assert.equal(resolveHeaderColor(mixed,"fixed","chartreuse"),"#223344");

 /* THE INK COMES OFF THE SAME RUNG AS THE COLOUR, and that is the whole
    reason both are resolved through one pair of functions.

    Curtis: "Why did we have to change a theme?? The tactical theme. Themes
    should not be affected by default design." The first version of this
    release computed black-or-white for every header, which turned Tactical's
    `#e7ddb2` and Terminal's `#61ff9d` white on the three pages a theme
    decides. A page theme is a designed pairing; taking half of it is not
    honouring it.

    Computed on rung 1 and rung 3 because those colours came out of a picker
    and have no ink attached — "white on a dark header" stops being true the
    moment somebody picks a pale one. */
 assert.equal(resolveHeaderInk(mixed,"fixed",undefined,undefined),headerTextFor("#223344"),"shared colour: computed");
 assert.equal(resolveHeaderInk(mixed,"fixed","#15180f","#e7ddb2"),"#e7ddb2","a page theme keeps its own ink");
 assert.equal(resolveHeaderInk(mixed,"log","#15180f","#e7ddb2"),headerTextFor("#ff0000"),
  "an override outranks the theme, and brings a computed ink with it");
 assert.equal(resolveHeaderInk(mixed,"fixed","#15180f",undefined),headerTextFor("#15180f"),
  "a theme with no ink of its own has no pairing to honour");
 assert.equal(resolveHeaderInk(mixed,"fixed","#15180f","chartreuse"),headerTextFor("#15180f"),
  "and neither does one whose ink is not a colour");
 assert.equal(resolveHeaderInk(mixed,"fixed","chartreuse","#e7ddb2"),headerTextFor("#223344"),
  "the ink cannot come off a rung the colour did not come off");
 assert.equal(resolveHeaderInk(mixed,"fixed","#15180F","#E7DDB2"),"#e7ddb2","normalised like every other colour here");

 /* And the contrast note can be asked about the ink that will actually be
    drawn rather than the one it would have computed. */
 assert.equal(headerContrast("#15180f","#e7ddb2"),headerContrast("#15180f","#E7DDB2"));
 assert.notEqual(headerContrast("#15180f","#e7ddb2"),headerContrast("#15180f"),
  "or the panel would quote a figure for text the page is not using");
 assert.equal(headerContrast("#15180f","chartreuse"),headerContrast("#15180f"),"junk falls back to the computed ink");

 /* AN EXTERNAL ANCHOR FIRST, because the sweep below is otherwise circular.
    It picks the text with `headerTextFor`, which calls `contrastRatio`, then
    measures the result with `contrastRatio` — so any monotone replacement of
    the luminance function reports ITSELF as fine. Dropping the sRGB
    linearisation, or swapping the WCAG coefficients for a flat average, both
    keep the sweep at 4.58 while the real floor falls to 3.75 and 4.32. These
    three are WCAG's own published numbers and cannot be satisfied by a
    function that has lost its gamma. */
 assert.equal(Math.round(contrastRatio("#000000","#ffffff")*100)/100,21);
 assert.equal(Math.round(contrastRatio("#ffffff","#ffffff")*100)/100,1);
 assert.equal(Math.round(contrastRatio("#777777","#ffffff")*100)/100,4.48);
 assert.equal(Math.round(contrastRatio("#0000ff","#ffffff")*100)/100,8.59);

 /* THE TEXT COLOUR IS COMPUTED, so no chosen background can hide the title. */
 assert.equal(headerTextFor("#041d47"),HEADER_TEXT_LIGHT);
 assert.equal(headerTextFor("#ffd98a"),HEADER_TEXT_DARK);
 assert.equal(headerTextFor("nonsense"),HEADER_TEXT_LIGHT);
 /* Not a handful of samples: the whole colour cube, because the picker will
    hand out any of it and the failures this guards against showed up on a
    mid-grey, a magenta and a mid sage rather than on anything anybody chose.

    MEASURED AGAINST BOTH ENDS OF THE GRADIENT, through `headerContrast`. The
    first version scored the picked colour alone, which is only the bar's LEFT
    edge: the far end is lighter, a title runs across both, and the sweep
    reported 4.58 while the real worst square was 3.37. A step of 3 rather
    than 15, because the 15-step grid missed the worst square by more than a
    whole grade — 4.58 against 3.37 — and 85 cubed is still instant. */
 let floor=99,worst="";
 for (let r=0;r<256;r+=3) for (let g=0;g<256;g+=3) for (let b=0;b<256;b+=3) {
  const background="#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
  const ratio=headerContrast(background);
  if (ratio<floor) { floor=ratio; worst=background; }
 }
 /* 4.0, not 4.5, and the number is the point. A gradient costs contrast at
    its far end and no lift avoids it — 3.86 at 16%, 4.12 at 10%, 4.58 only
    with no gradient at all. The page title is 25px bold, which needs 3.0 for
    AA and gets 4.12 at the worst square in the cube. Written as a floor that
    is true rather than a threshold that is aspirational. */
 assert.ok(floor>=4.0,"worst header contrast "+floor.toFixed(2)+":1 on "+worst);
 assert.ok(floor<4.5,"if this passes 4.5 the gradient has gone - check HEADER_LIFT");

 /* Both stops are plain hex, so what the browser paints is what was scored. */
 assert.equal(headerGradient("#041d47"),"linear-gradient(90deg,#041d47,#1d3459)");
 assert.deepEqual(headerStops("#041d47"),["#041d47","#1d3459"]);
 /* Mixed toward white on a dark colour and toward black on a light one. */
 assert.ok(relativeLuminanceRose(headerStops("#ffd98a")[1])<relativeLuminanceRose("#ffd98a"));
 function relativeLuminanceRose(hex){ return contrastRatio(hex,"#000000"); }

 /* WHAT IS WRITTEN BACK IS VALIDATED, not just what is read. The read side
    re-checks everything, so a bad value cannot reach a style attribute either
    way — but this is the file's own stated rule ("a stored value is not a
    place to accept `red; background:url(...)`") and nothing failed when the
    guard was removed from the writer. */
 assert.equal(JSON.parse(serializeHeaderTheme({shared:"nonsense",overrides:{}})).shared,DEFAULT_HEADER_COLOR);
 assert.deepEqual(JSON.parse(serializeHeaderTheme({shared:"#223344",overrides:{log:"red; background:url(x)",talk:"#abc"}})).overrides,{talk:"#aabbcc"});
 /* And only the eight surfaces are carried across, so a key somebody put in
    the file by hand cannot ride back out of it. */
 assert.deepEqual(Object.keys(JSON.parse(serializeHeaderTheme({shared:"#223344",overrides:{nonsuch:"#ff0000"}})).overrides),[]);
 assert.deepEqual(readHeaderTheme(JSON.stringify({shared:"#223344",overrides:{nonsuch:"#ff0000"}})).overrides,{});
 /* `hasHeaderOverride` must mean "has a COLOUR", not "has a key": the
    Settings row and the ladder both branch on it, and a key holding junk
    would make the panel claim an override the page cannot draw. */
 assert.equal(hasHeaderOverride({shared:"#223344",overrides:{log:"chartreuse"}},"log"),false);
 assert.equal(resolveHeaderColor({shared:"#223344",overrides:{log:"chartreuse"}},"log","#15180f"),"#15180f");

 /* THREE-DIGIT HEX IS EXPANDED on the way in, because the control that edits
    it is <input type="color">, which only accepts seven characters and
    silently shows #000000 for anything shorter — a swatch reading black over
    a header drawing the right colour. */
 assert.equal(readHeaderTheme(JSON.stringify({shared:"#abc",overrides:{talk:"#0F8"}})).shared,"#aabbcc");
 assert.equal(readHeaderTheme(JSON.stringify({shared:"#abc",overrides:{talk:"#0F8"}})).overrides.talk,"#00ff88");

 /* 90deg, because the Facility Map's header bar and the phone nav under it
    are two stacked boxes of different heights that have to paint the same
    colour at the same x. A tilted gradient puts a seam between them. */
 assert.match(headerGradient("#041d47"),/^linear-gradient\(90deg,/);
 assert.match(headerGradient("nonsense"),/#041d47/);
});

test("the header panel can see which pages their own theme is deciding", async () => {
 const {readPageHeaderThemes,pageHeaderThemes,pageThemeHeader,pageThemeHeaderPair,DEFAULT_MAP_HEADER,DEFAULT_PAGE_HEADER,
  BOARD_SETTINGS_KEY,LOG_SETTINGS_KEY,loadPageHeaderThemes}
  =await import("../src/lib/settings/page-header-themes.ts");
 /* THE COLOUR AND THE INK DESIGNED WITH IT, as one value. Curtis: "Why did we
    have to change a theme?? The tactical theme. Themes should not be affected
    by default design." They are returned together because a caller that takes
    the colour from here and computes the ink elsewhere is how Tactical's khaki
    became white. */
 const TACTICAL={header:"#15180f",text:"#e7ddb2"},TACTICAL_PAGE={header:"#15180f",text:"#f4e8b8"};
 const MIDNIGHT={header:"#020a18",text:"#ffffff"};
 assert.equal(BOARD_SETTINGS_KEY,"pace-board-settings-v1");
 assert.equal(LOG_SETTINGS_KEY,"pace-defect-log-settings-v1");

 /* The default theme on each page defers to the shared colour, so it is not
    an entry: every device that has never opened those panels is here. */
 assert.deepEqual(readPageHeaderThemes(null,null),{});
 assert.deepEqual(readPageHeaderThemes(
  JSON.stringify({theme:"default",visuals:{header:"#06275c"}}),
  JSON.stringify({theme:"light",appearance:{header:"#061d45"}})),{});

 /* A theme that is not the default IS deciding, and the Defect Log and Fixed
    Repairs share one record, so one answer covers both surfaces. */
 assert.deepEqual(readPageHeaderThemes(
  JSON.stringify({theme:"tactical",visuals:{header:"#15180f"}}),
  JSON.stringify({theme:"midnight",appearance:{header:"#020a18"}})),
  {map:TACTICAL,log:MIDNIGHT,fixed:MIDNIGHT});

 /* `custom` IS NOT A LOOK SOMEBODY PICKED. Both appearance panels set it when
    ANY colour in them changes — one bus status colour, one section
    background. Read as "this page has decided its own header" it took the
    Facility Map out of the shared setting on every device that had ever
    nudged a status colour, with the Settings row reporting "its page theme
    decides this" about a header nobody chose. The question is whether the
    header colour actually DIFFERS from the one the page would have had. */
 assert.deepEqual(pageHeaderThemes({theme:"custom",visuals:{header:DEFAULT_MAP_HEADER}},
   {theme:"custom",appearance:{header:DEFAULT_PAGE_HEADER}}),{});
 /* `custom` has no table ink either, so the stored one answers — and with
    nothing stored there is no pairing to honour and the ink is computed by the
    caller, which `text:""` is how this says so. */
 assert.deepEqual(pageHeaderThemes({theme:"custom",visuals:{header:"#5b0f3a"}},null),{map:{header:"#5b0f3a",text:""}});
 assert.deepEqual(pageHeaderThemes({theme:"custom",visuals:{header:"#5b0f3a",headerText:"#ffe9a0"}},null),
  {map:{header:"#5b0f3a",text:"#ffe9a0"}});
 assert.equal(pageThemeHeader("map","default",DEFAULT_MAP_HEADER),"");
 assert.equal(pageThemeHeader("page","light",DEFAULT_PAGE_HEADER),"");
 assert.equal(pageThemeHeader("map","terminal",undefined),"#00150c");
 assert.equal(pageThemeHeader("page","tactical",undefined),"#15180f");
 /* The table outranks a palette that disagrees with it, so the module and the
    two pages reading one record cannot answer differently — which is how a
    header bar and the drawer under it end up different colours. */
 assert.equal(pageThemeHeader("page","tactical","#ff0000"),"#15180f");
 assert.equal(pageThemeHeader("page","custom","#ff0000"),"#ff0000");
 assert.equal(pageThemeHeader("page",7,"#ff0000"),"");

 /* THE INK RIDES THE SAME GATE AS THE COLOUR. No page theme deciding means no
    entry at all, so there is no ink to mistake for one; a theme that IS
    deciding hands back the pair out of its own table, whatever a stale
    palette on disk says. */
 assert.equal(pageThemeHeaderPair("map","default",DEFAULT_MAP_HEADER,"#ff0000"),null);
 assert.equal(pageThemeHeaderPair("page","light",DEFAULT_PAGE_HEADER,"#ff0000"),null);
 assert.deepEqual(pageThemeHeaderPair("map","tactical",undefined,undefined),TACTICAL);
 assert.deepEqual(pageThemeHeaderPair("page","tactical",undefined,undefined),TACTICAL_PAGE);
 assert.deepEqual(pageThemeHeaderPair("map","terminal",undefined,undefined),{header:"#00150c",text:"#61ff9d"});
 assert.deepEqual(pageThemeHeaderPair("page","tactical","#ff0000","#00ff00"),TACTICAL_PAGE,"the table outranks a palette that disagrees");
 assert.deepEqual(pageThemeHeaderPair("page","custom","#3b0f52","#f0e0a0"),{header:"#3b0f52",text:"#f0e0a0"});
 assert.deepEqual(pageThemeHeaderPair("page","custom","#3b0f52","not a colour"),{header:"#3b0f52",text:""});

 /* THE THEME NAME IS THE FACT AND THE STORED PALETTE IS A COPY OF IT, so a
    record naming a theme resolves from the table even with the palette
    missing or corrupt — which is an ordinary record for an older build or a
    hand-seeded device, and used to answer "no theme" while the page's own
    drawer stayed on the theme. */
 for (const bad of ["",null,7,"chartreuse","red; background:url(x)",undefined])
  assert.deepEqual(readPageHeaderThemes(JSON.stringify({theme:"tactical",visuals:{header:bad}}),null),{map:TACTICAL},String(bad));
 assert.deepEqual(readPageHeaderThemes(JSON.stringify({theme:"tactical"}),JSON.stringify({theme:"midnight"})),
  {map:TACTICAL,log:MIDNIGHT,fixed:MIDNIGHT});

 /* `custom` has no table entry, and there the stored palette IS the decision
    — so it is still the only source, and still has to be a colour. */
 assert.deepEqual(readPageHeaderThemes(null,JSON.stringify({theme:"custom",appearance:{header:"#3b0f52"}})),
  {log:{header:"#3b0f52",text:""},fixed:{header:"#3b0f52",text:""}});
 for (const bad of ["",null,7,"chartreuse","red; background:url(x)"])
  assert.deepEqual(readPageHeaderThemes(null,JSON.stringify({theme:"custom",appearance:{header:bad}})),{},String(bad));
 for (const bad of [null,"","{",'"text"',"[]","7",JSON.stringify({visuals:{header:"#15180f"}}),JSON.stringify({theme:"nonsuch"})])
  assert.deepEqual(readPageHeaderThemes(bad,null),{},String(bad));

 /* Absence, not a key holding "" — so `"map" in themes` answers directly. */
 const one=readPageHeaderThemes(JSON.stringify({theme:"black",visuals:{header:"#000000"}}),null);
 assert.equal("map" in one,true);
 assert.equal("log" in one,false);
 assert.deepEqual(loadPageHeaderThemes({getItem(){throw new Error("denied")}}),{});

 /* The Settings screen passes the settings it is already holding, not JSON,
    because both appearance panels are on that same screen and a snapshot
    read on mount would describe the theme as it was before the person
    changed it. Same rule, so the two callers cannot drift. */
 assert.deepEqual(
  pageHeaderThemes({theme:"tactical",visuals:{header:"#15180f"}},{theme:"midnight",appearance:{header:"#020a18"}}),
  readPageHeaderThemes(
   JSON.stringify({theme:"tactical",visuals:{header:"#15180f"}}),
   JSON.stringify({theme:"midnight",appearance:{header:"#020a18"}})));
 assert.deepEqual(pageHeaderThemes(null,undefined),{});
 assert.deepEqual(pageHeaderThemes({theme:"default",visuals:{header:"#06275c"}},{theme:"light",appearance:{header:"#061d45"}}),{});
});

test("a header's pre-JavaScript fallback is the colour it will settle on", async () => {
 const {DEFAULT_HEADER_COLOR,headerGradient}=await import("../src/lib/settings/header-theme.ts");
 const expected=headerGradient(DEFAULT_HEADER_COLOR);

 /* HeaderThemeLive paints from an effect, so the browser has already drawn
    the server's HTML by the time it runs. Whatever each header rule names as
    its `--app-header-fill` fallback IS the first thing a person sees. Written
    as each page's OLD colour it was a measured flash — Incidents came up rust
    and turned navy 37ms later on a warm desktop. These five have no page
    theme, so the colour they settle on is the app default, and that is what
    they must open with. Five copies of one literal, asserted identical here
    rather than trusted. */
 for (const file of ["../app/down-sheet/down-sheet.css","../app/lists/lists.css","../app/incidents/incidents.css",
                     "../app/shop-talk/shop-talk.css","../app/settings/settings.css"]) {
  const css=await readFile(new URL(file, import.meta.url), "utf8");
  /* Balanced, not a regex: the fallback is `color-mix(...)` inside
     `linear-gradient(...)` inside `var(...)`, and a non-greedy `[^;]*?\)`
     stops at the first inner bracket and compares a truncated string. */
  const found=[];
  for (let at=css.indexOf("var(--app-header-fill,"); at>=0; at=css.indexOf("var(--app-header-fill,",at+1)) {
   let depth=1,i=at+"var(--app-header-fill,".length; const from=i;
   while (i<css.length&&depth>0) { if(css[i]==="(")depth++; else if(css[i]===")")depth--; i++; }
   found.push(css.slice(from,i-1));
  }
  assert.equal(found.length,1,file+" should name the fallback exactly once");
  assert.equal(found[0],expected,file+" must fall back to the app default, not its own old colour");
 }

 /* THE MAP IS IN THE SAME LIST, and it used to fall back through
    `var(--header-bg)` — whose own literal is the OLD #06275c, and which the
    map writes inline from its theme anyway. Measured: with JavaScript off the
    eight headers drew two different navies, and with it on the map held
    #06275c for 116ms before turning #041d47, while the other seven changed
    colour not at all. The server render cannot read LocalStorage, so falling
    back "to the theme" was never going to produce the theme. */
 const globals=await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
 const bare=globals.match(/(?:^|\})header\{background:var\(--app-header-fill,([^;]*)\);/m);
 assert.ok(bare,"the bare header rule must read the shared fill");
 assert.equal(bare[1],expected,"and fall back to the app default, not the old navy");

 /* The Defect Log and Fixed Repairs fall back to their own page variable,
    which React writes inline. NOT "correct without JavaScript" — the server
    render writes the hook's default, which is the app default — but it keeps
    the page's one source of truth in the chain. */
 const log=await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");
 assert.match(log,/\.log-header\{background:var\(--app-header-fill,var\(--log-header\)\)/);
 const fixed=await readFile(new URL("../app/fixed-repairs/fixed-repairs.css", import.meta.url), "utf8");
 assert.match(fixed,/\.fixed-header\{background:var\(--app-header-fill,var\(--fixed-header,#061d45\)\)/);
});

test("the painting is wired up, and no header still names a colour of its own", async () => {
 /* NOTHING IN tests/ TOUCHED THE COMPONENT THAT DOES THE PAINTING, which a
    cold read found by grepping for it and getting nothing back. The modules
    below are exercised; the wiring between them was not, and deleting
    `var(--app-header-fill,…)` from one stylesheet leaves that page silently
    keeping a hard-coded colour — which is the exact bug this change exists to
    remove — with the suite still green. */
 const live=await readFile(new URL("../src/components/shared/header-theme-live.tsx", import.meta.url), "utf8");
 const layout=await readFile(new URL("../app/layout.tsx", import.meta.url), "utf8");
 const {DEFAULT_HEADER_COLOR,HEADER_SURFACES}=await import("../src/lib/settings/header-theme.ts");

 /* Mounted once, in the root layout, inside the crash boundary. */
 assert.match(layout,/import HeaderThemeLive from "@\/src\/components\/shared\/header-theme-live"/);
 assert.match(layout,/<CrashGuard><HeaderThemeLive\/>/);
 /* The static status bar colour is the app default, not the old navy: it is
    what the OS paints before any JavaScript runs. */
 assert.match(layout,new RegExp('themeColor:"'+DEFAULT_HEADER_COLOR+'"'));

 /* The three properties the stylesheets read, and the meta the OS reads. */
 for (const name of ["--app-header","--app-header-fill","--app-header-text"])
  assert.ok(live.includes('setProperty("'+name+'"'),"HeaderThemeLive must set "+name);
 assert.match(live,/meta\[name="theme-color"\]/);
 /* It resolves through the ladder, not the shared colour alone — otherwise a
    themed page's <html> and status bar disagree with its own header. */
 assert.match(live,/resolveHeaderColor\(theme,surface,page\?\.header\)/);
 /* AND THE INK COMES OFF THE SAME RUNG AS THE COLOUR. Painted as
    `headerTextFor(colour)` for one release, which is how the Facility Map's
    Tactical header lost its khaki: the map sets `--header-text` from its own
    theme, and this writes `--app-header-text` on <html>, which every header
    rule reads first. Curtis: "Themes should not be affected by default
    design." */
 assert.match(live,/setProperty\("--app-header-text",resolveHeaderInk\(theme,surface,page\?\.header,page\?\.text\)\)/);
 assert.equal(/setProperty\("--app-header-text",headerTextFor/.test(live),false,
  "the computed ink must not be painted over a page theme's own");
 /* And it never writes a record. */
 assert.equal(/setItem|saveHeaderTheme/.test(live),false,"HeaderThemeLive must not write storage");

 /* Every route the nav offers has a surface, and `/` is matched last because
    every path starts with it. */
 const routes=[...live.matchAll(/\["(\/[a-z-]*)","([a-z]+)"\]/g)].map(m=>[m[1],m[2]]);
 assert.deepEqual(routes.map(r=>r[1]).sort(),HEADER_SURFACES.map(s=>s.key).sort());
 assert.equal(routes[routes.length-1][0],"/");

 /* ALL EIGHT HEADER BARS READ THE SHARED FILL. */
 const bars=[["../app/globals.css",/header\{background:var\(--app-header-fill,/],
  ["../app/down-sheet/down-sheet.css",/\.down-header\{[^}]*background:var\(--app-header-fill,/],
  ["../app/defect-log/defect-log.css",/\.log-header\{background:var\(--app-header-fill,/],
  ["../app/fixed-repairs/fixed-repairs.css",/\.fixed-header\{background:var\(--app-header-fill,/],
  ["../app/lists/lists.css",/\.lists-header\{[^}]*background:var\(--app-header-fill,/],
  ["../app/incidents/incidents.css",/\.incidents-header\{[^}]*background:var\(--app-header-fill,/],
  ["../app/shop-talk/shop-talk.css",/\.talk-header\{[^}]*background:var\(--app-header-fill,/],
  ["../app/settings/settings.css",/\.settings-header\{[^}]*background:var\(--app-header-fill,/]];
 for (const [file,pattern] of bars) {
  const css=await readFile(new URL(file, import.meta.url), "utf8");
  assert.match(css,pattern,file+" must paint its header from the shared fill");
 }

 /* AND NOTHING INSIDE A HEADER STILL NAMES ITS OWN COLOUR. The change
    converted the header's BACKGROUND on all eight pages and its FOREGROUND on
    two, and the gap was only visible by picking a pale colour and measuring:
    the kickers, subtitles, tab bands and tab labels stayed at literals chosen
    for a navy header and came out at 1.0 to 1.9:1. Every colour inside a
    header rule now derives from `--app-header` or `--app-header-text`, and a
    literal reintroduced here fails before anybody has to look at it. */
 /* `-header` and not `-header-anything`, or this catches the new
    `.settings-header-colour` panel, which is a settings card and not a
    header. And only the declaration that WINS: a base rule's literal that a
    later rule converts is how every one of these files is written.

    The `m` flag is load-bearing: these stylesheets put several rules on one
    line, so a rule can be preceded by `}` OR by a newline, and without it
    every rule that happens to start a line was skipped — including the two
    that convert the Defect Log's active tab, which left this reporting a
    literal that three lines later is not what paints.

    FOUR HOLES A COLD READ GOT A REAL DEFECT THROUGH, all closed here:

    - `app/globals.css` was not in the list, and it holds `.app-kicker`,
      `.app-subtitle`, `.app-refresh`, the bare `header` rule and the phone
      nav — every one of them drawn inside a header. Putting `.app-kicker`
      back on its own pre-change blue passed.
    - only four properties were read, so `border`, `border-left` and
      `box-shadow` were invisible. Two rust and green dividers were in the
      shipped code the whole time.
    - a value counted as derived if it mentioned one of eight variable names
      ANYWHERE, so a literal sitting beside one passed.
    - in a comma-separated selector list only the LAST selector was recorded,
      so `.talk-header p,.talk-scope-note{color:#b9e0c9}` was never examined. */
 const HEADER_SELECTOR=/\b(?:down|log|fixed|lists|incidents|talk|settings)-header(?![\w-])|\.app-kicker|\.app-subtitle|\.app-refresh|\.mobile-mode-nav|\.app-name|\.header-advanced-toggle|^header\b/;
 const RULE=/(^|\}|\{)([^{}]*?)\{([^{}]*)\}/gm;
 const PAINTS=/^(color|background|background-color|border|border-color|border-left|border-right|border-top|border-bottom|box-shadow|outline-color)$/;
 /* Derived means the value's EVERY colour comes from the header. A literal
    beside a variable is still a literal, so the hex is looked for directly
    and a `var(--app-header…)` fallback literal is not counted as one. */
 const HEADER_VAR=/var\(--(app-header|app-header-text|app-header-fill|log-header|log-header-text|fixed-header|fixed-header-text|log-accent-text|header-bg|header-text|down-navy|panel-bg|log-surface|log-accent|fixed-surface|fixed-ink|theme-border)[^)]*\)/g;
 const winner=new Map();
 for (const file of ["../app/globals.css","../app/down-sheet/down-sheet.css","../app/defect-log/defect-log.css",
   "../app/fixed-repairs/fixed-repairs.css","../app/lists/lists.css","../app/incidents/incidents.css",
   "../app/shop-talk/shop-talk.css","../app/settings/settings.css"]) {
  const css=(await readFile(new URL(file, import.meta.url), "utf8")).replace(/\/\*[\s\S]*?\*\//g,"");
  for (const match of css.matchAll(RULE)) {
   const body=match[3];
   /* EVERY selector in the list, not just the last one. */
   for (const selector of match[2].split(",").map(part=>part.trim()).filter(Boolean)) {
    /* The bare `header{…}` rule is the Facility Map's, and it is the one
       selector with no class at all — pinning its text white was the headline
       failure of the previous review and passed this check. */
    if(!HEADER_SELECTOR.test(selector)) continue;
    for (const decl of body.split(";")) {
     const [property,...rest]=decl.split(":");
     const name=(property||"").trim();
     if(!PAINTS.test(name)) continue;
     winner.set(file.replace("../app/","")+"  "+selector+"  "+name,rest.join(":").trim());
    }
   }
  }
 }
 /* A shadow may be any colour — it is depth, not a surface somebody reads
    words off — so only its being a LITERAL is allowed, not a branded one. */
 const BRANDED=/#(?:[0-9a-f]{2})*(?:74a8df|9fc7ff|dbeaff|c4d7ee|e8a579|f0cdb4|79c99a|b9e0c9|082f60|5a1d07|0a4527|0b4f9e|a4663c|46805f|2a0c03|03200f|eaf3ff|d3e3f7|81a9dc|8fc0f3|c98355|5aa37a|7fa4cf|5c79a2)/i;
 /* A DELIBERATE LIFT OFF THE HEADER IS DERIVED, and a literal wearing one is
    not. The Defect Log tints its inactive tabs toward a fixed blue so they
    stay readable, which is its own older rule and fine — the header colour is
    still what dominates. The share is what separates that from
    `color-mix(in srgb,var(--app-header-text) 10%,#b9e0c9)`, which is a
    literal with a variable standing next to it and which got past the first
    version of this check. At or above half, the header decides. */
 const LIFT=/color-mix\(\s*in srgb\s*,\s*var\(--[\w-]+[^)]*\)\s*(\d+)%/;
 const offenders=[...winner].filter(([where,value])=>{
   const bare=value.replace(HEADER_VAR,"");
   if(!/#[0-9a-f]{3,8}\b/i.test(bare)) return false;
   const lift=value.match(LIFT);
   if(lift&&Number(lift[1])>=50&&HEADER_VAR.test(value)) return false;
   /* box-shadow and outline carry no text; a neutral literal there is fine. */
   if(/ (box-shadow|outline-color)$/.test(where)) return BRANDED.test(bare);
   return true;
 }).map(([where,value])=>where+" : "+value);
 assert.deepEqual(offenders,[],"a header rule still names its own colour:\n  "+offenders.join("\n  "));
});

test("the wiring between the colour and the pixels, which nothing used to exercise", async () => {
 /* A cold read mutated this wiring twelve ways and the suite caught none of
    them: the painter stopped following the route, both listeners came out,
    two routes were swapped so Incidents drew Shop Talk's override, the two
    themed pages were unplugged from the shared colour, the ladder's middle
    rung was dropped at both call sites, Settings stopped asking for a
    repaint, and the save was put back before the write. Every one is a
    behaviour a person sees. The modules they connect are well covered; the
    connections were not covered at all. */
 const live=await readFile(new URL("../src/components/shared/header-theme-live.tsx", import.meta.url), "utf8");
 const settings=await readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
 const log=await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
 const fixed=await readFile(new URL("../app/fixed-repairs/page.tsx", import.meta.url), "utf8");
 const {HEADER_SURFACES}=await import("../src/lib/settings/header-theme.ts");

 /* IT FOLLOWS THE ROUTE. With `[]` for deps it paints the first page opened
    and then never again, so a per-page override applies to whichever page you
    happened to land on. */
 assert.match(live,/\},\[path\]\);/,"the painter's effect must depend on the path");

 /* BOTH LISTENERS, and both removed. `storage` fires only in OTHER tabs —
    the shop computer's second tab — and the CustomEvent is the same-tab path
    that repaints the Settings page you are changing the colour on. */
 for (const pattern of [/window\.addEventListener\("storage",fromAnotherTab\)/,
                        /window\.addEventListener\(HEADER_THEME_KEY,apply\)/,
                        /window\.removeEventListener\("storage",fromAnotherTab\)/,
                        /window\.removeEventListener\(HEADER_THEME_KEY,apply\)/])
  assert.match(live,pattern,"HeaderThemeLive must add and remove "+pattern);
 assert.match(settings,/window\.dispatchEvent\(new CustomEvent\(HEADER_THEME_KEY\)\)/,
   "Settings must ask the page it is on to repaint");

 /* THE PAIRINGS, not just the set. Swapping two of them made Incidents paint
    Shop Talk's colour, and a sorted-set comparison cannot see that. */
 const routes=Object.fromEntries([...live.matchAll(/\["(\/[a-z-]*)","([a-z]+)"\]/g)].map(m=>[m[1],m[2]]));
 assert.deepEqual(routes,{"/down-sheet":"down","/defect-log":"log","/fixed-repairs":"fixed",
   "/lists":"lists","/incidents":"incidents","/shop-talk":"talk","/settings":"settings","/":"map"});
 assert.equal(Object.keys(routes).length,HEADER_SURFACES.length);

 /* The hook watches the page theme AND ITS INK as well as the surface, or
    switching a page's own theme leaves its header on the colour it had — and
    picking a theme changes both halves of the pairing at once. */
 assert.match(live,/\},\[surface,pageTheme,pageInk\]\);/);

 /* THE TWO THEMED PAGES FEED THEIR OWN VARIABLE FROM THE RESOLVED COLOUR,
    and pass their page theme in, which is the ladder's middle rung. Unplug
    either and that page keeps its own theme's header while the other seven
    move, which is the split this release exists to close. */
 assert.match(log,/"--log-header":headerSkin\.color,"--log-header-text":headerSkin\.text/);
 /* THE INK TRAVELS WITH THE COLOUR, out of one pair, so a page on Tactical
    keeps Tactical's header text. Curtis: "Why did we have to change a theme??
    The tactical theme. Themes should not be affected by default design." */
 assert.match(log,/pageThemeHeaderPair\("page",settings\.theme,settings\.appearance\.header,settings\.appearance\.headerText\)/);
 assert.match(log,/useHeaderColor\("log",logHeaderTheme\?\.header,logHeaderTheme\?\.text\)/);
 assert.match(fixed,/"--fixed-header":headerSkin\.color,"--fixed-header-text":headerSkin\.text/);
 assert.match(fixed,/pageThemeHeaderPair\("page",fixedAppearance\.theme,fixedAppearance\.appearance\.header,fixedAppearance\.appearance\.headerText\)/);
 assert.match(fixed,/useHeaderColor\("fixed",fixedHeaderTheme\?\.header,fixedHeaderTheme\?\.text\)/);
 /* And the accent keeps an ink computed for the ACCENT, not the header's. */
 assert.match(log,/"--log-accent-text":headerTextFor\(settings\.appearance\.accent\)/);

 /* THE PANEL READS THE LIVE SETTINGS, so its rows cannot describe a theme the
    person changed two rows further down the same screen. */
 assert.match(settings,/const pageThemes=pageHeaderThemes\(board,log\);/);

 /* SAVED BEFORE THE STATE MOVES. The other order leaves the swatches showing
    a colour no header took and no repaint was asked for. */
 const save=settings.indexOf("saveHeaderTheme(localStorage,next)");
 const state=settings.indexOf("setHeaderThemeState(next);",settings.indexOf("const setHeaderTheme="));
 assert.ok(save>0&&state>save,"the write must be attempted before the panel moves");
});

test("one header padding, in all five files that decide one", async () => {
 /* The globals.css comment names five files as the fix and only one of them
    was pinned, so four of the five could go back to `11px 12px` or vanish
    with the suite green — which is how they were wrong in the first place. */
 const files=[["../app/globals.css",/\.app>header\{height:auto;min-height:38px;[^}]*padding:12px[;}]/],
  ["../app/lists/lists.css",/\.lists-header\{align-items:flex-start;flex-direction:column;padding:12px\}/],
  ["../app/incidents/incidents.css",/\.incidents-header\{align-items:flex-start;flex-direction:column;padding:12px\}/],
  ["../app/shop-talk/shop-talk.css",/\.talk-header\{align-items:flex-start;flex-direction:column;padding:12px\}/],
  ["../app/fixed-repairs/fixed-repairs.css",/@media\(max-width:760px\)\{\.fixed-repairs-app>\.fixed-header\{padding:12px\}\}/]];
 for (const [file,pattern] of files) {
  const css=await readFile(new URL(file, import.meta.url), "utf8");
  assert.match(css,pattern,file+" must put its header on the one 12px padding");
 }
 /* Measured at 390 and 1180: the six pages with no page FRAME land on exactly
    12/7 and 18/8. The Facility Map and the Down Sheet sit further in by their
    own frame width, which is a visible change and not this release's. */
});

test("the Down Sheet's page title defers to the header, like the Defect Log's", async () => {
 /* The Defect Log half of this fix has two assertions; the Down Sheet half
    had none, and emitting the variable unconditionally pins the title white
    over whatever colour somebody picks — 1.35:1 on a pale yellow, measured,
    beside a panel that says that cannot happen. */
 const page=await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
 assert.match(page,/const titleColor=displaySettings\.styles\.pageTitle\.color\.toLowerCase\(\)===DEFAULT_DOWN_SHEET_DISPLAY\.styles\.pageTitle\.color\.toLowerCase\(\)\?\{\}:\{"--down-page-title-color":/,
   "the title colour is left out while it is still the default");
 assert.match(page,/const appStyle=\{\.\.\.titleColor,/,"and spread first so a chosen one still wins");
 const css=await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
 assert.match(css,/\.down-header h1\{color:var\(--down-page-title-color,var\(--app-header-text,#fff\)\)/,
   "and the fallback is the header's computed ink");
});

test("the header panel draws one control per row and nothing that does nothing", async () => {
 /* Curtis: "Just make it as much of a minimalist design as you can. Even
    though we have more settings controls."

    Counted before: 57 elements, 18 controls, 112 words, 630px — a quarter of
    the Settings page for one setting — of which SEVEN were disabled FOLLOW
    buttons and eight were a second swatch showing a colour the picker beside
    it already showed. After: 27 words, 11 controls, no disabled anything.
    These assertions are the shape, not the pixels: a row carries a name and
    one swatch, and a qualifier or a clear ONLY when there is something to
    qualify or clear. */
 const page=await readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
 const css=await readFile(new URL("../app/settings/settings.css", import.meta.url), "utf8");

 /* The swatch IS the input: one element per row, not a chip plus a picker. */
 assert.match(page,/function HeaderSwatch\(/);
 assert.match(page,/<label className="hc-swatch"[^>]*>\s*<span aria-hidden="true">Aa<\/span>\s*<input type="color"/,
   "the swatch wraps the real input rather than sitting beside one");
 const swatchInput=css.match(/\.hc-swatch input\{([^}]*)\}/);
 assert.ok(swatchInput,"the input must have a rule");
 assert.match(swatchInput[1],/position:absolute;inset:0;width:100%;height:100%/,
   "the input fills the swatch - without the explicit size Chromium gives a colour input its own 50x27 and it pokes out of the box");
 assert.match(swatchInput[1],/opacity:0/,"and is invisible rather than absent");
 /* THE ONE THING THIS FILE CANNOT SEE is whether that input is the thing a
    finger actually lands on, and a cold read proved it: adding
    `visibility:hidden` to this rule left every assertion above passing while
    all nine pickers stopped responding to a click and Tab stopped reaching
    them at all. `opacity:0` hides a thing that is still there; these three
    take it away. A source scan cannot hit-test, so it names them. */
 for (const away of ["visibility:hidden","display:none","pointer-events:none"])
  assert.equal(swatchInput[1].includes(away),false,
    "`"+away+"` on the swatch input makes it untouchable while it still looks right");
 assert.match(css,/\.hc-swatch:focus-within\{outline:/,"and the focus ring moves to the box");

 /* EVERY CONTROL IS NAMED. The only text inside the swatch is an
    `aria-hidden` "Aa", so without these the accessible name computes EMPTY —
    nine colour pickers and a clear button with no page attached to any of
    them. Dropping either passed every other assertion here. */
 /* `[^>]*` cannot be used to cross this tag: `onChange={event=>…}` contains
    a `>`, so the class stops inside the attribute it is meant to skip. */
 assert.match(page,/<input type="color" value=\{colour\} onChange=\{event=>onPick\(event\.target\.value\)\} aria-label=\{label\}/,
   "the swatch input must carry the page's name");
 assert.match(page,/colour=\{headerTheme\.shared\} label="Header colour for every page"/);
 assert.match(page,/colour=\{effective\} label=\{surface\.label\+" header colour"\}/);
 assert.match(page,/className="hc-clear" aria-label=\{"Clear "\+surface\.label\+"'s own header colour"\}/);

 /* The swatch draws the ink the header will be WRITTEN in, which is the only
    reason it is a box with letters in it rather than a square of colour.
    Hard-coding it white passed everything else. */
 assert.match(page,/className="hc-swatch" style=\{\{background:headerGradient\(colour\),color:headerTextFor\(colour\)\}\}/);
 /* One swatch component, used for the shared colour and for all eight rows. */
 assert.ok((page.match(/<HeaderSwatch /g)||[]).length>=2,"one component, used for the shared colour and for the rows");

 /* NOTHING DISABLED. The clear is rendered only on a row that has an
    override; seven greyed-out buttons is the absence of news drawn eight
    times. */
 const panel=page.slice(page.indexOf('<section className="settings-header-colour">'),
                        page.indexOf("</section>",page.indexOf('className="hc-foot"')));
 assert.equal(/\bdisabled[=}]/.test(panel),false,"no control in this panel is ever drawn disabled");
 assert.match(panel,/\{own\?<button type="button" className="hc-clear"/,"the clear exists only with an override");
 assert.match(panel,/\{own\?<i>own<\/i>:page\?<i>page theme<\/i>:null\}/,
   "and a row says what decides it only when something other than the shared colour does");

 /* The column is reserved on every row, so one row having a clear does not
    push its swatch out of line with the seven that do not. */
 assert.match(css,/\.hc-list>\.hc-row\{grid-template-columns:minmax\(0,1fr\) auto 44px 44px\}/);
 /* And each cell is placed, or the clear and the swatch share column 3 and
    sit on top of each other on the one row that has both. */
 for (const [sel,col] of [["\\.hc-row>b","1"],["\\.hc-row>i","2"],["\\.hc-row>\\.hc-clear","3"],["\\.hc-row>\\.hc-swatch","4"]])
  assert.match(css,new RegExp(sel+"\\{[^}]*grid-column:"+col+"[;}]"),sel+" must sit in column "+col);
 /* 44px: this app's tap target, and the panel's own measurement. */
 assert.match(css,/\.hc-swatch\{[^}]*width:44px;height:44px/);
 assert.match(css,/\.hc-clear\{width:44px;height:44px/);
 assert.match(css,/\.hc-row\{min-height:44px/);

 /* NO CARD. The drawer is already a box; every section inside THIS DEVICE is
    separated by a rule instead, and the four of them agree. */
 const SECTIONS=["settings-lite-switch","settings-header-colour","settings-feedback","settings-welcome-again"];
 for (const name of SECTIONS) {
  const rule=css.match(new RegExp("\\."+name+"\\{([^}]*)\\}"));
  assert.ok(rule,name+" must have a layout rule");
  /* box-shadow too: a card drawn as `box-shadow:0 0 0 2px` is still a card,
     and passed when only `border` and `background` were looked for. */
  assert.equal(/border:1px|background:#fff|background:#fdfefe|border-radius|box-shadow/.test(rule[1]),false,
    name+" must not draw a card inside the drawer");
 }
 /* ALL FOUR on the hairline, not three — dropping one leaves two sections
    running together with nothing between them. */
 const hairline=css.match(/([^{}]*)\{border-top:1px solid #e1e8f3\}/);
 assert.ok(hairline,"a hairline between them instead");
 for (const name of SECTIONS)
  assert.ok(hairline[1].includes(".settings-drawer-body>."+name),name+" must carry the hairline");
 assert.match(css,/\.settings-drawer-body>\.settings-lite-switch:first-child\{border-top:0\}/,
   "and none above the first");

 /* The LITE MODE switch is styled at all, which it was not: `.settings-check`
    is scoped to two other pages, so on this one it computed `display:inline`
    and rendered as `LITE MODE ON THIS DEVICEDraws less of the app…`, one
    run-together paragraph with the checkbox inside the first word. The
    comment above the rule used to claim it "looks fine". */
 assert.match(css,/\.settings-lite-switch \.settings-check\{display:flex/);
 assert.match(css,/\.settings-lite-switch \.settings-check>span\{display:grid/);
 /* AND AT THE PHONE BREAKPOINT TOO. The base rules were widened to cover it
    and the 760px block one line below was not, so on every width this app
    runs on the lite switch sat a size smaller and a tap target shorter than
    the structurally identical row directly beneath it — 9px/8px/44px against
    10px/9px/48px, measured. A fix that stops at a media query is half a fix. */
 const phone=css.match(/@media\(max-width:760px\)\{\.settings-feedback b[^}]*\}[^@]*?\}\}/);
 assert.ok(phone,"the feedback phone block must exist");
 for (const piece of [".settings-lite-switch b",".settings-lite-switch small",".settings-lite-switch .settings-check"])
  assert.ok(phone[0].includes(piece),piece+" must be sized with its neighbour on a phone");

 /* THE TAG IS THE ONLY THING LEFT THAT SAYS A PAGE IS NOT FOLLOWING, so it
    carries the `<small>` colour it replaced rather than a fainter one: 5.37:1
    against 3.04:1, which is under AA at 8px. */
 assert.match(css,/\.hc-row>i\{grid-column:2;color:#5a6b84;/);
 assert.match(css,/\.hc-clear\{width:44px;height:44px;border:0;background:none;color:#5a6b84;/);

 /* AND THE ONE SENTENCE SAYS THE OVERRIDE WINS. "a page on its own theme
    keeps that" reads as "and you cannot change it from here", which is the
    opposite of what the ladder does — a colour typed on a themed row beats
    the theme, and clearing it falls back to the theme rather than to the
    shared colour. It is the one thing the six-line paragraph carried that
    the rows do not teach by themselves. */
 assert.match(page,/Give one its own below \u2014 that wins, even on a page with its own theme\.|Give one its own below — that wins, even on a page with its own theme\./);
});
