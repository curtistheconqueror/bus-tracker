/* the rendered app: pages, stylesheets, the service worker and the handoff files. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir, stat } from "node:fs/promises";
import { render, section } from "./helpers/setup.mjs";

test("server-renders the live fleet command dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>FLEETSTEP — Fleet Maintenance<\/title>/i);
  /* The map's header now carries the same four lines as the other five —
     name, kicker, title, subtitle — instead of one long all-caps sentence
     doing the work of all four. The h1 is the page's name, matching what the
     nav calls it, and the sentence it replaced became the subtitle's job. */
  assert.match(html, /<h1>Facility Map<\/h1>/);
  assert.match(html, /class="app-kicker">FLEET MAINTENANCE</);
  assert.match(html, /class="app-subtitle">Facility-wide overview/);
  assert.doesNotMatch(html, />PACE MAINTENANCE BUS TRACKING SYSTEM/);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /class="command-bar"/);
  assert.match(html, />QUICK FILTERS</);
  assert.match(html, />MYSTERY <b>/);
  assert.match(html, /DOWN SHEET/);
  assert.match(html, />PENDING REPAIR</);

  assert.match(html, />LOCATE</);
  assert.match(html, />REFRESH</);
  // The gear is a page in the nav now; the map's own button opens board actions.
  assert.match(html, /> ACTIONS</);
  assert.doesNotMatch(html, /> SETTINGS</);
  assert.match(html, /AI OPERATOR/);
  const commandBar=html.slice(html.indexOf('<footer class="command-bar">'),html.indexOf('</footer>')+9);
  assert.ok(commandBar.indexOf('class="locate-command"')<commandBar.indexOf('class="command-highlights"'));
  assert.ok(commandBar.indexOf('class="settings-command"')<commandBar.indexOf('class="ai-operator-command"'));
  assert.doesNotMatch(commandBar, /AC BUSES|CHECK ENGINES|RAMP\/KNEELER/);
  assert.doesNotMatch(commandBar, /PENDING REPAIR|UNSCHEDULED WORK|>WAITING/);
  assert.doesNotMatch(commandBar, /BAD RAMP\/KNEELER/);
  assert.doesNotMatch(commandBar, /<small>PACE<\/small>/);
  assert.match(html, /data-bus-id="b0" data-status="service" data-pending="false"/);
  assert.match(html, /data-bus-id="b20" data-status="out" data-pending="false"/);
  assert.match(html, /IN SERVICE WITH DEFECTS/);
  assert.match(html, /WORK IN PROGRESS/);
  assert.match(html, /DECOMMISSIONED \/ DOWN INDEFINITELY/);
  assert.match(html, /TOW \/ STAGING/);
  assert.match(html, /--status-service:#1764d8/);
  assert.match(html, /--status-defect:#159447/);
  assert.match(html, /--status-shop:#efa400/);
  assert.match(html, /--status-out:#c91f27/);
  assert.match(html, /--status-decommissioned:#343a40/);
  assert.doesNotMatch(html, /TOTAL SPACES:/);
  assert.doesNotMatch(html, /SHOP BAYS \(DIAGONAL - 12 TOTAL\)/);
  const bays = section(html, "SHOP BAYS (DIAGONAL)", "FOREMAN OFFICE");
  assert.equal((bays.match(/class="bay"/g) ?? []).length, 9);
  assert.equal((bays.match(/class="bay-placeholder"/g) ?? []).length, 1);
  assert.match(bays, /NEEDS REASSIGNMENT/);

  const service = section(html, "SERVICE DETAIL AREA (SINGLE FILE)", "PAINT BOOTH");
  assert.equal((service.match(/class="spot"/g) ?? []).length, 8);
  const wall = section(html, "SHOP WALL (SINGLE FILE)", "MAIN GARAGE (BAYS 1-12)");
  assert.equal((wall.match(/class="spot"/g) ?? []).length, 8);
  const office = section(html, "FOREMAN OFFICE", "PIT");
  assert.equal((office.match(/class="spot"/g) ?? []).length, 3);
  const pit = section(html, "PIT", "BRAKE TEST");
  assert.equal((pit.match(/class="spot"/g) ?? []).length, 2);
  const brake = section(html, "BRAKE TEST", "TOW / STAGING");
  assert.equal((brake.match(/class="spot"/g) ?? []).length, 3);
  const tow = section(html, "TOW / STAGING", '<section class="east lot">');
  assert.equal((tow.match(/class="spot"/g) ?? []).length, 4);
  const east = section(html, '<section class="east lot">', '<section class="road">');
  assert.equal((east.match(/class="spot"/g) ?? []).length, 18);
  const road = section(html, '<section class="road">', '<section class="wall">');
  assert.equal((road.match(/class="spot"/g) ?? []).length, 75);
  const west = section(html, '<section class="west lot panel">', '<section class="offsite panel">');
  assert.equal((west.match(/class="spot"/g) ?? []).length, 40);
  // Buses away at a vendor. Two rows taken off the waiting area, so the yard
  // count stops including buses that are not in the yard.
  const offsite = section(html, '<section class="offsite panel">', '<section class="waiting panel">');
  assert.equal((offsite.match(/class="spot"/g) ?? []).length, 28);
  assert.match(offsite, /OFF PROPERTY/);
  assert.match(offsite, /AWAY AT A VENDOR/);
  const waiting = section(html, '<section class="waiting panel">', '<footer class="command-bar">');
  // 98 before OFF PROPERTY took its last 28 slots.
  assert.equal((waiting.match(/class="spot"/g) ?? []).length, 70);
  assert.match(waiting, /WAITING AREA/);

});

test("installs and caches an offline app shell", async () => {
  const [page, layout, worker, manifestText] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.match(page, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
  assert.match(layout, /manifest:"\/manifest\.webmanifest"/);
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "landscape");
  assert.equal(manifest.start_url, "/");
  assert.match(worker, /cacheAppShell/);
  assert.match(worker, /html\.matchAll/);
  assert.match(worker, /request\.mode === "navigate"/);
  assert.match(worker, /caches\.match\("\/"\)/);
  assert.match(worker, /\/fixed-repairs/);
});

test("ALREADY LOGGED can reach the record it is blocking on", async () => {
 const [page, css] = await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8"),
 ]);
 // The banner named an existing defect and gave no way to reach it, which is
 // fine until that defect is one the log is not drawing — then it is a locked
 // door with the key on the other side. OPEN IT clears the hide flag and opens
 // the record, whatever put it out of sight.
 assert.match(page, /className="open-existing-defect" onClick=\{\(\)=>showExisting\(value\.busId,recentDuplicate\)\}/);
 assert.match(page, /const showExistingDefect=\(busId:string,defect:StructuredDefect\)=>\{/);
 assert.match(page, /defectLogHiddenAt:undefined/);
 // It writes before it opens, and says so when the write is refused, rather
 // than opening a record the device never took.
 const handler = page.slice(page.indexOf("const showExistingDefect="), page.indexOf("const removeFromLog="));
 assert.match(handler, /const written=persist\(revealed,downEntries\);\s*\n\s*if\(!written\.ok\)return;/);
 assert.ok(handler.includes('setSearch("")'), "it opens a bus the search may be hiding, so the search stands down");
 assert.match(css, /\.open-existing-defect\{/);
 assert.match(css, /\.open-existing-defect\{min-height:44px/);
});

test("Fleet Tracker displays estimated mileage and inspection readiness without replacing actual readings",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
 ]);
 assert.match(page,/ESTIMATED OPERATING MILEAGE/);
 assert.match(page,/RUNNING · 275 MI\/DAY/);
 assert.match(page,/INSPECTION STATUS/);
 assert.match(page,/3,000-mile due point waits for an inspection with an actual reading/);
 assert.match(page,/data-inspection-due=\{inspection\.due\}/);
 assert.match(page,/inspection-due-badge/);
 assert.match(css,/\.token\[data-inspection-due="true"\]/);
 assert.match(css,/@media\(max-width:760px\)\{\.odometer-current\{grid-template-columns:1fr\}/);
});

test("ALL means everything, including whatever is in the search box",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 /* THE BUG. A tech searched a bus number, tapped into the defect, came back
    and pressed ALL - and still saw one bus, because the search box was still
    holding the board down and nothing on screen said so. The only way out was
    to notice the text and delete it by hand. */
 assert.match(page,/const showEverythingOr=\(value:Filter\)=>\{/);
 assert.match(page,/const next=filter===value\?"all":value;/);
 assert.match(page,/if\(next==="all"\)setSearch\(""\);/);

 // Every filter button goes through it, so pressing the lit one clears back to
 // ALL and takes the search with it.
 assert.match(page,/onClick=\{\(\)=>showEverythingOr\(value\)\}/);
 assert.equal(/onClick=\{\(\)=>setFilter\(current=>current===value\?"all":value\)\}/.test(page),false,
  "no button may set the filter without going through the handler that clears the search");

 /* Only ALL clears it. Narrowing a search down by state is the entire point of
    IN PROGRESS and FIXED TODAY, so wiping the search there would break them. */
 const handler=page.slice(page.indexOf("const showEverythingOr"),page.indexOf("const showEverythingOr")+400);
 assert.equal((handler.match(/setSearch\(""\)/g)||[]).length,1,"the search is cleared in exactly one branch");
});

test("the lists page neutralises the global aside and section styling",async()=>{
 const css=await readFile(new URL("../app/lists/lists.css",import.meta.url),"utf8");
 // globals.css pins a bare <aside> to the top-right of the viewport at a fixed
 // 255px. The list index is an aside, so without a reset it floats over the
 // page instead of sitting in its grid column.
 const reset=css.match(/\.lists-index,\.lists-layout\{([^}]*)\}/);
 assert.ok(reset,"the reset block must exist");
 for(const property of ["position:static","right:auto","width:auto","box-shadow:none","z-index:auto"])
  assert.ok(reset[1].includes(property),"the reset must clear "+property);
 // and it precedes the rules that then style them deliberately
 assert.ok(css.indexOf(".lists-index,.lists-layout{position:static")<css.indexOf(".lists-layout{display:grid"));
 // The global bare nav is white; Campaigns must explicitly restore the dark
 // header tab bar so inactive phone tabs cannot become white-on-white.
 assert.match(css,/\.lists-header nav\{[^}]*background:#082f60/);
 assert.match(css,/\.lists-header nav a\{[^}]*background:#082f60[^}]*color:#fff/);
});

test("the repair details panel opens for a record that has repair details",async()=>{
 const logPage=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 // defaultOpen is not a DOM prop. React warned and the panel never opened, so a
 // completed repair showed its diagnosis, action and part number collapsed
 // behind a summary that gave no hint anything was inside.
 assert.equal(/defaultOpen=\{/.test(logPage),false,"the invalid prop must not come back");
 assert.match(logPage,/const \[advancedOpen,setAdvancedOpen\]=useState\(\(\)=>Boolean\(draft\.defect\.state==="completed"\|\|draft\.defect\.diagnosticNote/);
 // held in state so it opens when there is something to see and still collapses
 assert.match(logPage,/<details className="advanced-defect-details" open=\{advancedOpen\} onToggle=\{event=>setAdvancedOpen\(event\.currentTarget\.open\)\}>/);
});

test("on a phone the DS badge and roadcall dot sit inside the token that clips them", async () => {
 const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
 // Pull out the phone block by brace counting rather than by regex, so the
 // assertions below cannot accidentally read a desktop rule of the same name.
 // There is more than one 620px block in this stylesheet, so take the one that
 // actually styles the parking-space tokens.
 const block = (from) => {
  let depth = 0;
  for (let i = css.indexOf("{", from); i < css.length; i++) {
   if (css[i] === "{") depth++;
   else if (css[i] === "}" && --depth === 0) return css.slice(from, i);
  }
  return "";
 };
 let phone = "";
 for (let at = css.indexOf("@media(max-width:620px){"); at >= 0;
      at = css.indexOf("@media(max-width:620px){", at + 1)) {
  const candidate = block(at);
  if (candidate.includes(".spot>.token")) { phone = candidate; break; }
 }
 assert.ok(phone, "a 620px block styling the parking-space tokens should exist");

 // The precondition. The badges only need moving because the token clips, and
 // if that ever stops being true this test is testing nothing.
 assert.match(phone, /\.spot>\.token\{[^}]*overflow:hidden/,
  "the phone token still clips its contents");

 // Both indicators are positioned from inside the token, never from outside it.
 // A negative offset is exactly what put 59% of the DS badge and 75% of the
 // roadcall dot outside the clipping box and on top of the parking space line.
 const ds = phone.match(/\.downsheet-ready-badge\{([^}]*)\}/);
 assert.ok(ds, "the phone block sets the DS badge");
 assert.doesNotMatch(ds[1], /(?:top|left|right|bottom):-/,
  "the DS badge must not be offset outside the token it lives in");
 const dsFont = Number((ds[1].match(/font-size:(\d+)px/) || [])[1]);
 assert.ok(dsFont >= 8, "the DS badge is at least 8px on a phone, was " + dsFont);

 const dot = phone.match(/\.roadcall-dot\{([^}]*)\}/);
 assert.ok(dot, "the phone block sets the roadcall dot");
 assert.doesNotMatch(dot[1], /(?:top|left|right|bottom):-/,
  "the roadcall dot must not be offset outside the token it lives in");

 // The dot's pulse animates transform, so its keyframes have to carry the
 // centring or the animation throws it away on the first frame.
 const frames = phone.match(/@keyframes roadcall-dot-pulse\{([^@]*?)\}\s*\n/);
 assert.ok(frames, "the phone block redefines the pulse keyframes");
 assert.ok(!/transform:scale/.test(frames[1]),
  "the pulse keyframes keep the vertical centring instead of replacing it");

 // And the desktop nudge for the pit, brake and foreman spots is cancelled,
 // which is what pushed those tokens 2px off centre inside their own space.
 assert.match(phone, /\.vertical \.token\{transform:none\}/);
});

test("a phone token reserves room for the badges instead of letting them cover the bus", async () => {
 const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
 const block = (from) => {
  let depth = 0;
  for (let i = css.indexOf("{", from); i < css.length; i++) {
   if (css[i] === "{") depth++;
   else if (css[i] === "}" && --depth === 0) return css.slice(from, i);
  }
  return "";
 };
 let phone = "";
 for (let at = css.indexOf("@media(max-width:620px){"); at >= 0;
      at = css.indexOf("@media(max-width:620px){", at + 1)) {
  const candidate = block(at);
  if (candidate.includes(".spot>.token")) { phone = candidate; break; }
 }
 assert.ok(phone, "a 620px block styling the parking-space tokens should exist");

 // Both indicators are absolutely positioned, so without reserved room they
 // simply land on the bus. In a 64px garage slot the DS badge covered the whole
 // icon and only the wheels showed underneath.
 assert.match(phone, /\.spot>\.token:has\(\.downsheet-ready-badge\)\{padding-left:\d+px\}/);
 assert.match(phone, /\.spot>\.token:has\(\.roadcall-dot\)\{padding-right:\d+px\}/);

 // The garage row is the tightest space on the board and cannot spare the full
 // reservation, so its badge shrinks rather than its bus disappearing.
 const garagePad = phone.match(/\.grow \.spot>\.token:has\(\.downsheet-ready-badge\)\{padding-left:(\d+)px\}/);
 const generalPad = phone.match(/(?<!\.grow )\.spot>\.token:has\(\.downsheet-ready-badge\)\{padding-left:(\d+)px\}/);
 assert.ok(garagePad, "the garage row sets its own badge reservation");
 assert.ok(Number(garagePad[1]) < Number(generalPad[1]),
  "the garage reservation is smaller than the general one");
 assert.match(phone, /\.grow \.downsheet-ready-badge\{[^}]*font-size:\d+px/);
});

test("a fixed repair says which surface it came off",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);
 // Fixed Repairs collects from every surface and a card gave no clue which.
 // The two that matter to a foreman scanning the list are a bus cleared off the
 // Down Sheet and the Defect Log's smaller day-to-day work.
 assert.match(page,/"down-sheet":\{className:"from-down-sheet",label:"CLEARED FROM THE DOWN SHEET"\}/);
 assert.match(page,/"defect-log":\{className:"from-defect-log",label:"FIXED FROM THE DEFECT LOG"\}/);
 // The other three origins are named rather than folded into one of those two.
 // A repair logged on the map is not a Down Sheet clearance, and saying it was
 // would be a small lie that compounds every time somebody counts.
 for(const source of ["tracker","operator","scan"])assert.match(page,new RegExp(source+":\\{className:"));
 assert.match(page,/repairOrigin\(record\.defect\.source\)/);
 // Scanned down the left edge, so the colour has to be on that edge.
 assert.match(css,/\.fixed-origin\{[^}]*border-left:5px solid transparent/);
 assert.match(css,/\.fixed-origin\.from-down-sheet\{border-left-color:#087347/);
 assert.match(css,/\.fixed-origin\.from-defect-log\{border-left-color:#c07a00/);
});

test("Fixed Repairs windows the render instead of drawing every completed repair at once",async()=>{
 const [fixedPage,fixedCss]=await Promise.all([
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);

 // THE PROBLEM, measured rather than assumed. A 400-bus board with three
 // years of history — the same worst case this project already measures
 // elsewhere — puts 4,000 completed repairs on this one page. Rendered
 // unconditionally that was 120,068 DOM nodes and 6.7 seconds to hydrate,
 // measured against this exact codebase before this change, not estimated.
 assert.match(fixedPage,/const PAGE_SIZE=50;/);

 // The cap is on RENDERING, never on what a search or a category filter can
 // find. `visible` is the full filtered set; `windowed` is what actually
 // draws. Rendering `visible` directly anywhere would put the 120k-node
 // failure right back — the whole point of the constant above.
 assert.doesNotMatch(fixedPage,/visible\.map\(record=></);
 assert.match(fixedPage,/const windowed=useMemo\(\(\)=>visible\.slice\(0,visibleCount\)/);
 assert.match(fixedPage,/windowed\.map\(record=></);

 // A new search or category collapses back to the first page rather than
 // staying wherever a previous SHOW ALL left it — a person narrowing the list
 // wants the top of the new result, not five hundred rows into an old browse.
 assert.match(fixedPage,/useEffect\(\(\)=>setVisibleCount\(PAGE_SIZE\),\[search,category\]\)/);

 // The count line is honest about what is capped and what is not: it says
 // "OF" only once something is actually hidden, and reads as a plain count
 // otherwise — the exact wording used before this change, on an unwindowed
 // board, so a small fleet sees nothing different.
 assert.match(fixedPage,/hiddenCount\?windowed\.length\+" OF "\+visible\.length\+" SHOWN"/);
 assert.match(fixedPage,/visible\.length\+" REPAIR"\+\(visible\.length===1\?"":"S"\)\+" SHOWN"/);

 // SHOW MORE advances by one page; SHOW ALL reveals everything rather than
 // some safer-looking partial amount — nothing is ever unreachable, only
 // deferred until asked for.
 assert.match(fixedPage,/setVisibleCount\(current=>current\+PAGE_SIZE\)/);
 assert.match(fixedPage,/setVisibleCount\(visible\.length\)/);
 assert.match(fixedPage,/SHOW \{Math\.min\(PAGE_SIZE,hiddenCount\)\} MORE/);
 assert.match(fixedPage,/SHOW ALL \{visible\.length\}/);

 // Stats, the category dropdown and the export all read from the full
 // `records`, never from the windowed slice — a rendering cap must not
 // quietly become a reporting cap.
 assert.match(fixedPage,/stats=\{total:records\.length/);
 assert.match(fixedPage,/const categories=useMemo\(\(\)=>\[\.\.\.new Set\(records\.map/);
 assert.match(fixedPage,/records:records\.map\(\(\{bus,defect\}\)=>/);

 // THE REGRESSION THIS FILE EXISTS TO CATCH. globals.css gives every bare
 // <header> a fixed height:38px — the same shape of bug already found once
 // this session in the Defect Log's part-prompt. min-height alone only
 // clamps that up as a floor: the box stayed a FIXED length, and the second
 // row from SHOW MORE / SHOW ALL wrapping overflowed silently below it
 // instead of growing it, measured directly — the header reported exactly
 // 54px tall with a button row rendering 37.5px past its own bottom edge.
 // height:auto is what lets flex-wrap size the box to its real content.
 assert.match(fixedCss,/\.fixed-feed>header\{height:auto;min-height:54px;[^}]*flex-wrap:wrap/);
});

test("the DS badge sits beside the defect-count badge instead of overlapping the repair text",async()=>{
 const logPage=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 // THE BUG, measured rather than assumed. The bus-number column is 64-72px
 // wide on a phone; a five-digit number plus the badge needed about 77px. The
 // badge spilled past its own column and landed on the repair description in
 // the next one — measured on bus 17530, an actual 4px overlap onto the text,
 // not a near miss.
 assert.doesNotMatch(logPage,/<strong>\{group\.bus\.n\}<\/strong>\{busOnDownSheet&&<b className="inline-ds-badge">/,
  "DS must not be back inside the cramped bus-number column");

 // It now lands in the meta column, immediately before the defect-count
 // badge — the "other purple badge" it was asked to sit beside — so both
 // read as one pair of counts rather than two badges scattered across the
 // card.
 assert.match(logPage,/<span className="log-meta"><span className="log-badge-slot">\{busOnDownSheet&&<b className="inline-ds-badge">DS<\/b>\}\{group\.records\.length>1&&<b className="defect-count-badge">/);
});

test("the Defect Log editor moves DEFERRED into its own toggle beside the Down Sheet boxes", async () => {
 const logPage = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
 // WORK STATUS no longer offers Deferred as a fourth diagnostic stage — it is
 // a down-sheet-adjacent decision now, made beside RECOMMEND and DOWN SHEET.
 assert.doesNotMatch(logPage, /<option value="deferred">Deferred<\/option>/);
 assert.match(logPage, /<label>WORK STATUS<select value=\{deferred\?"open":value\.defect\.state\} disabled=\{deferred\}/);
 assert.match(logPage, /<label className="wide downsheet-check deferred-check">/);
 // Checking DOWN SHEET clears an active DEFERRED, and vice versa — a bus
 // cannot be held back off the sheet and placed on it at the same time.
 assert.match(logPage, /const toggleOnDownSheet=\(on:boolean\)=>\{/);
 assert.match(logPage, /const toggleDeferred=\(on:boolean\)=>\{/);
 assert.match(logPage, /onChange=\{event=>toggleOnDownSheet\(event\.target\.checked\)\}/);
 assert.match(logPage, /onChange=\{event=>toggleDeferred\(event\.target\.checked\)\}/);
});

test("SETTINGS keeps its place beside QUICK FILTERS and says what it is", async () => {
 const [logPage,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 /* It belongs with the controls, not the stats: it is not a stat, and it must
    not disappear when they collapse. Asserted by position in the markup — the
    button sits inside .log-controls, which is outside the .daily-stats block. */
 const controls=logPage.slice(logPage.indexOf('<section className="log-controls">'),logPage.indexOf('<section className="log-feed"'));
 assert.equal(controls.includes("log-settings-button"),false,"the gear left the controls row: SETTINGS is a page in the nav now");
 const statsBlock=logPage.slice(logPage.indexOf('className={"daily-stats"'),logPage.indexOf('<section className="log-controls">'));
 assert.ok(statsBlock.length>0&&statsBlock.includes("daily-stats-toggle"),"the stats block must be found for this check to mean anything");
 assert.ok(!statsBlock.includes("log-settings-button"),"and never inside the collapsible stats");
 /* A bare gear read as decoration beside two buttons that say what they do. */
 /* Same height as the two buttons beside it, so the row is one set of controls. */
 assert.match(css,/\.log-controls \.log-undo-button\{height:44px;min-height:44px\}/);
 assert.match(css,/\.log-controls \.quick-filter-trigger\{height:44px;min-height:44px\}/);
});

test("SCAN BATCHES on the Defect Log, and the operator on the map, remove a sweep the same way",async()=>{
 const [logPage,mapPage,panel,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/scan-batches-panel.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 // The door is beside SCAN SWEEP, which is where the mistake was made.
 assert.match(logPage,/className="sweep-scan-button"[\s\S]{0,400}className="scan-batches-button"[^>]*onClick=\{\(\)=>setBatchesOpen\(true\)\}[^>]*>↶ SCAN BATCHES</);
 assert.match(logPage,/<ScanBatchesPanel batches=\{batches\} undo=\{batchUndo\} onRemove=\{removeBatch\} onRestore=\{restoreBatch\}/);
 assert.match(panel,/REMOVE \{batch\.removableIds\.length\}/);
 assert.match(panel,/disabled=\{!batch\.removableIds\.length\}/,"a sweep every record of which has been worked on cannot be removed");
 assert.match(panel,/PUT BACK/);
 assert.match(css,/\.scan-batches-button\{/);
 assert.match(css,/\.scan-batch-row\{/);

 /* The three writes, in order: the board with the guard lifted for this one
    confirmed write, then the way back, then the ledger that makes the removal
    travel — nothing after a refused write. */
 const remove=logPage.slice(logPage.indexOf("const removeBatch="),logPage.indexOf("const restoreBatch="));
 assert.match(remove,/if\(!confirm\(/);
 assert.match(remove,/const written=persist\(result\.fleet,downEntries,\{allowBulkDefectLoss:true\}\);\s*if\(!written\.ok\)return;/);
 assert.ok(remove.indexOf("persist(")<remove.indexOf("SCAN_BATCH_UNDO_KEY")&&remove.indexOf("SCAN_BATCH_UNDO_KEY")<remove.indexOf("writeMergedAway("),"board, then the way back, then the ledger");
 assert.match(remove,/writeMergedAway\(localStorage,\{\.\.\.readMergedAway\(localStorage\),\.\.\.Object\.fromEntries\(result\.removed\.map\(record=>\[record\.defect\.id,now\]\)\)\}\)/);
 assert.match(remove,/setUndoSnapshot\(\{fleet,downEntries,label,scanBatch:true\}\)/);
 // Putting back restamps, forgets the ids in the ledger, and clears the snapshot.
 const restore=logPage.slice(logPage.indexOf("const restoreBatch="),logPage.indexOf("const undoLastChange="));
 assert.match(restore,/restoreScanBatch\(fleet,snapshot,now\)/);
 assert.match(restore,/for\(const id of result\.restoredIds\)delete ledger\[id\];writeMergedAway\(localStorage,ledger\)/);
 assert.match(restore,/localStorage\.removeItem\(SCAN_BATCH_UNDO_KEY\)/);
 // UNDO LAST after a removal hands over to the same path rather than laying the old fleet back with stale stamps.
 assert.match(logPage,/if\(undoSnapshot\.scanBatch\)\{restoreBatch\(\);return\}/);
 // The snapshot is read from the device, so PUT BACK works after a reload and after the operator's removal.
 assert.match(logPage,/setBatchUndo\(readScanBatchUndo\(localStorage\.getItem\(SCAN_BATCH_UNDO_KEY\)\)\)/);
 assert.match(logPage,/if\(event\.key===SCAN_BATCH_UNDO_KEY\)setBatchUndo\(readScanBatchUndo\(event\.newValue\)\)/);

 /* The map's operator: the batch is found again at apply time, the board is
    written with the guard lifted BEFORE state changes — the save effect writes
    with the guard on and would refuse 24 leaving — and the same ledger write. */
 const executor=mapPage.slice(mapPage.indexOf('if(plan.kind==="removeScanBatch")'),mapPage.indexOf('if(plan.kind==="undoDownSheetClear")'));
 assert.match(executor,/scanBatches\(buses\)\.find\(item=>item\.key===plan\.batchKey\)/);
 assert.match(executor,/batch\.ids\.length!==plan\.count\)return \{ok:false/);
 assert.match(executor,/writeFleetStorageResult\(localStorage,result\.fleet,\{allowBulkDefectLoss:true\}\)/);
 assert.ok(executor.indexOf("writeFleetStorageResult(")<executor.indexOf("setBuses(result.fleet"),"storage first, then state");
 assert.match(executor,/writeSetting\(localStorage,SCAN_BATCH_UNDO_KEY/);
 assert.match(executor,/writeMergedAway\(localStorage,\{\.\.\.readMergedAway\(localStorage\),\.\.\.Object\.fromEntries\(result\.removed\.map\(record=>\[record\.defect\.id,now\]\)\)\}\)/);
 assert.match(executor,/if\(plan\.kind==="restoreScanBatch"\)/);
 assert.match(executor,/for\(const id of result\.restoredIds\)delete ledger\[id\];writeMergedAway\(localStorage,ledger\)/);
});

test("the handoff files stay true: every storage key is documented, and the entry point points at what exists",async()=>{
 const [claudeMd,nextSession,publishNext,readme]=await Promise.all([
  readFile(new URL("../CLAUDE.md",import.meta.url),"utf8"),
  readFile(new URL("../docs/NEXT_SESSION.md",import.meta.url),"utf8"),
  readFile(new URL("../docs/PUBLISH_NEXT.md",import.meta.url),"utf8"),
  readFile(new URL("../README.md",import.meta.url),"utf8"),
 ]);

 /* A key that exists and is written down nowhere is how the next session
    renames one — the single change that silently orphans a mechanic's board.
    So the list in CLAUDE.md is checked against the code rather than trusted.

    Only `-v1` names: the transfer payload kinds and the backup filename prefix
    share the "pace-" prefix and are not storage. */
 const walk=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(entry=>
  entry.isDirectory()?walk(new URL(entry.name+"/",dir)):/\.(ts|tsx)$/.test(entry.name)?[new URL(entry.name,dir)]:[]))).flat();
 const sources=await Promise.all(((await Promise.all(["../app/","../src/"].map(root=>walk(new URL(root,import.meta.url))))).flat()).map(file=>readFile(file,"utf8")));
 const inCode=new Set();
 for(const source of sources)
  for(const found of source.matchAll(/"(pace-[a-z0-9-]*-v\d+)"/g))inCode.add(found[1]);
 assert.ok(inCode.size>20,"the scan found "+inCode.size+" keys, which is too few to be a real scan");
 const undocumented=[...inCode].filter(key=>!claudeMd.includes(key)).sort();
 assert.deepEqual(undocumented,[],"storage keys in the code but not in CLAUDE.md — add them there, and never rename one");

 /* The two tombstone ledgers are the ones a future change is most likely to
    break by accident, because nothing on screen shows them working. */
 for(const ledger of ["pace-cloud-merged-v1","pace-cloud-removed-entries-v1"])
  assert.ok(claudeMd.includes(ledger),ledger+" must stay named in CLAUDE.md");

 // A fresh session is told where to start, and the file it is sent to exists.
 assert.match(claudeMd,/Read `docs\/NEXT_SESSION\.md` first/);
 assert.ok(nextSession.length>2000,"the entry point must actually say something");

 /* No number in here that another file owns or that the next commit moves.
    Both of these were wrong inside an hour: the live version (Codex publishes
    while sessions run) and the test count (written as 229 by the same commit
    that added the 230th test). Point at the source instead of copying it. */
 assert.doesNotMatch(nextSession,/\b\d{2,}\s+tests?\s+passing/i,"NEXT_SESSION.md must not quote a passing-test count - it goes stale on the next commit that adds a test");
 assert.doesNotMatch(nextSession,/Sites Version\s+\d+\s*=/i,"NEXT_SESSION.md must not name the live version - Codex owns that, in PUBLISH_NEXT.md and RELEASES.md");

 /* It must not promise files that are not there — a dead pointer in the first
    thing a session reads costs more than no pointer at all. */
 for(const path of [...nextSession.matchAll(/`((?:docs\/|app\/|\.claude\/)[A-Za-z0-9_./-]+)`/g)].map(m=>m[1])){
  await assert.doesNotReject(stat(new URL("../"+path,import.meta.url)),"NEXT_SESSION.md points at "+path+", which does not exist");
 }

 /* The Codex boundary, stated in both places a session might look. It is the
    one rule where being wrong publishes something. */
 for(const [name,text] of [["CLAUDE.md",claudeMd],["NEXT_SESSION.md",nextSession]]){
  assert.match(text,/Codex publishes/,name+" must state who publishes");
  assert.match(text,/docs\/PUBLISH_NEXT\.md/,name+" must name the handoff file");
 }
 assert.match(nextSession,/[Nn]ever force-push/);
 assert.match(nextSession,/rebase onto/i);

 // PUBLISH_NEXT.md is only useful if its first job — saying what is pending — is done.
 assert.match(publishNext,/^\*\*STATUS: /m,"PUBLISH_NEXT.md must open with a STATUS line");
 assert.ok(readme.length>0);
});

test("a render error shows a screen with a way out, not a white one",async()=>{
 const guard=await readFile(new URL("../app/_components/crash-guard.tsx",import.meta.url),"utf8");
 const layout=await readFile(new URL("../app/layout.tsx",import.meta.url),"utf8");

 /* Curtis, from the floor: "if I touch a bus and hold it down without letting
    it go the entire screen goes white ... when you bookmark it, there's no way
    to refresh, and it's just stuck." A render error unmounts the entire tree,
    and in standalone mode there is no address bar, no reload button and no
    pull-to-refresh. The app is bricked until iOS kills the process. */
 assert.match(layout,/<CrashGuard>\{children\}<\/CrashGuard>/,"every page is inside the boundary");
 assert.match(guard,/static getDerivedStateFromError/,"a class component, because componentDidCatch has no hook equivalent");
 assert.match(guard,/componentDidCatch/);
 assert.match(guard,/location\.reload/,"the one control a standalone app cannot otherwise offer");
 assert.match(guard,/RELOAD THE APP/);

 /* It must not be taken down by the same broken module it exists to catch. */
 const imports=[...guard.matchAll(/^import .*?from "([^"]+)";/gm)].map(match=>match[1]);
 assert.deepEqual(imports,["react"],"the boundary imports nothing of the app's own");
 assert.equal(/\.css"/.test(guard),false,"and no stylesheet, since a stylesheet that failed to load is a way to arrive here");

 /* Storage throws on a full device. Throwing inside the handler that exists to
    survive a throw would be absurd. */
 assert.match(guard,/try\{[\s\S]{0,600}?localStorage\.setItem[\s\S]{0,600}?\}catch\{\}/,"the crash record is written defensively");

 /* Nothing is lost, and the screen has to say so - a person who sees this
    needs to know the board is still on the device. */
 assert.match(guard,/Nothing on this device was lost/);

 /* The key is written down, because a key that exists and is recorded nowhere
    is how the next session renames one. */
 const claudeMd=await readFile(new URL("../CLAUDE.md",import.meta.url),"utf8");
 assert.match(claudeMd,/pace-crash-report-v1/);
});

test("ADVANCED STATS lives at the bottom of the focus view and nowhere else",async()=>{
 /* Curtis: "I want this in a new section located in the bus's defect page. This
    will be called Advanced stats. It will keep various info. But for now, just
    the same defect log attempt." And on where exactly: "make it viewable only
    in focus, like the bottom of however many defects listed. This way the list
    can drop further down and just scroll to read." */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const focusStart=page.indexOf('<section className="log-focus"'),focusEnd=page.indexOf("{editing&&<DefectEditor");
 const focus=page.slice(focusStart,focusEnd);
 assert.ok(focus.includes('className="log-focus-stats"'),"it is inside the focus view");
 /* ONLY there. A second copy on the feed card is the thing he ruled out. */
 assert.equal(page.split('className="log-focus-stats"').length-1,1);
 assert.equal(page.slice(0,focusStart).includes("log-focus-stats"),false,"nothing above the focus view draws it");
 /* AFTER the records, so it lands under however many defects the bus carries. */
 assert.ok(focus.indexOf("focusedGroup.records.map")<focus.indexOf('className="log-focus-stats"'));
 /* Not collapsed and not capped: the focus body already scrolls, and a stat
    that hides itself is a stat nobody reads. */
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(css,/\.log-focus-body\{[^}]*overflow-y:auto/);
 assert.equal(/\.log-focus-stats\{[^}]*(max-height|overflow)/.test(css),false);
 /* A bus with no returns says so rather than rendering an empty frame. */
 assert.match(focus,/No repeat reports on this bus\./);
 /* The bus-level number leads — "how many round trips is this bus making" is
    the question — with the per-defect breakdown under it. */
 assert.match(focus,/ROUND TRIP\{trips===1\?"":"S"\}/);
 assert.match(focus,/normalizeReportAttempts\(record\.defect\.reportAttempts\)\.map/,"every return is listed, not just the count");
});

test("the chip row escapes the quick-filter drawer's broad child rule",async()=>{
 /* .quick-filter-drawer>div turns every direct child into a scrolling grid.
    .quick-filter-share-actions already had to restate itself for that reason;
    the chip row is a direct child too. */
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(css,/\.quick-filter-drawer>\.time-window-chips\{[^}]*flex:none/);
 assert.match(css,/\.quick-filter-drawer>\.time-window-chips\{[^}]*display:flex/);
 const globals=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 /* The phone rule sits after the base rule it overrides. At equal specificity
    source order decides, and this file has several earlier max-width blocks. */
 assert.ok(globals.indexOf(".time-window-chip{")<globals.lastIndexOf(".time-window-chip{flex:1"));
 /* Seven targets across a 360px row: 38px tall, sharing the width. */
 assert.match(globals,/@media\(max-width:620px\)\{[^@]*\.time-window-chip\{flex:1;min-width:0;min-height:38px/);
});

test("the SHOW ALL button is the same size on the boards and in the drawer",async()=>{
 /* globals.css carries `aside div button{...padding:7px...}` and the
    quick-filter drawer is an <aside>, so an unset property on either chip
    control is inherited there and nowhere else. .time-window-hidden declared
    no padding and measured 7px in the drawer against 0 on the boards — one
    control at two sizes. A class beats three elements, so the fix is simply to
    declare it. */
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 assert.match(css,/\.time-window-hidden\{[^}]*padding:/);
 assert.match(css,/\.time-window-chip\{[^}]*padding:/);
 /* And the rule it is defending against is really there, so this test fails
    honestly if somebody removes it and wonders why the padding is pinned. */
 assert.match(css,/aside div button\{[^}]*padding:7px/);
});

test("PHONE is a width, not a device",async()=>{
 /* Curtis asked whether "the system is smart enough to pick up on what device
    you're using based on the pixelation of the screen", and floated a separate
    phone settings page. A media query knows the VIEWPORT, which is better: an
    iPad in split screen is phone-width and wants the phone treatment, and a
    stored "this is an iPad" answer would be wrong the moment it was rotated.

    So every option is written twice — once unconditionally for "always", once
    inside the app's own 620px block for "phone" — and nothing is stored about
    the device. */
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* EVERY 620px block, each sliced to its own MATCHING BRACE.

    Two earlier versions of this were wrong in the same direction — too
    generous — and each passed. The first sliced to the END OF FILE, so "the
    phone form is inside the 620px block" was true of any rule that merely sat
    after it; an unguarded copy applying at every width passed. The second
    fixed the slice but still assumed the LAST 620px block was the options
    one, which stopped being true the moment another phone rule was appended
    below it — that is what caught this and it is why the scan is now over all
    of them rather than over a guess about which. */
 const phoneBlocks=[],marker="@media(max-width:620px){";
 for(let at=css.indexOf(marker);at>=0;at=css.indexOf(marker,at+1)){
  let depth=0,end=css.indexOf("{",at);
  for(;end<css.length;end++){
   if(css[end]==="{")depth++;
   else if(css[end]==="}"&&--depth===0)break;
  }
  phoneBlocks.push({start:at,end,body:css.slice(at,end)});
 }
 assert.ok(phoneBlocks.length>0);
 const phoneBlock=phoneBlocks.map(block=>block.body).join("\n");
 /* Everything OUTSIDE every one of those blocks, which is where a phone form
    must never appear. */
 const outside=phoneBlocks.reduce((rest,block)=>rest.replace(block.body,""),css);
 for(const attribute of ["data-bus-rail","data-bus-blue","data-bus-end"]){
  assert.ok(css.includes('['+attribute+'="always"]'),attribute+" has an every-screen form");
  assert.ok(phoneBlock.includes('['+attribute+'="phone"]'),attribute+' has a phone form, inside a 620px block');
  /* And nowhere else in the file, before or after — an unguarded copy would
     make "phone only" apply on the shop computer too. */
  assert.equal(outside.includes('['+attribute+'="phone"]'),false,attribute+" phone form is inside a media query only");
 }
 /* No user-agent sniffing anywhere in this feature. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.equal(/navigator\.(userAgent|platform)|matchMedia/.test(page),false,"the width is CSS's to answer, not JavaScript's");

});

test("the second location button is display:none, not merely invisible",async()=>{
 /* The rail has no room for "Trouble Bay 12" on its side, so the control is in
    the markup twice and CSS shows whichever fits. display:none takes the hidden
    one out of the ACCESSIBILITY TREE as well as off the screen — visibility or
    opacity would leave a screen reader announcing the same button twice on
    every card in the feed. */
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(css,/\.log-location-inline\{display:none;/);
 assert.equal(/\.log-location-inline\{[^}]*(visibility:hidden|opacity:0)/.test(css),false);
 /* And exactly one of the pair is ever shown: the rail hides the column copy in
    the same rule that reveals this one. */
 for(const scope of ['always','phone']){
  assert.ok(css.includes('[data-bus-rail="'+scope+'"] .log-bus-column .log-location{display:none}'),scope+" hides the column copy");
  assert.ok(css.includes('[data-bus-rail="'+scope+'"] .log-card-group>.log-location-inline{display:inline-flex}'),scope+" shows the inline copy");
 }
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.equal(page.split("Facility location for bus ").length-1,2,"the pair, and only the pair");
});

test("the closing line spans the card and an opened bus ends further from the next",async()=>{
 /* Curtis: "that text should be a little bigger and go further across the
    bottom of each portion, and make it a little bit darker so it is easier to
    see... the space between the last defect and the next new bus card seems
    thinner. Let's widen it up just a bit." */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* OUT of the defect list, so it spans the card without negative margins that
    would have to match whichever of four .grouped-defect-list padding rules
    wins at each breakpoint. */
 const listStart=page.indexOf('{expanded&&<div className="grouped-defect-list"'),listEnd=page.indexOf("</div>}",listStart);
 assert.ok(listStart>0);
 assert.equal(page.slice(listStart,listEnd).includes("log-bus-end-marker"),false,"not inside the defect list");
 assert.match(page,/\{expanded&&<p className="log-bus-end-marker"/,"and only on an opened bus");
 /* Spanning BOTH columns. As a direct child of the card it auto-placed into
    the 82px bus column and measured 64px wide — narrower than it had been
    inside the list it left. */
 assert.match(css,/\.log-bus-end-marker\{display:none;grid-column:1\/-1\}/);
 /* Bigger, and darker than --log-muted. The mix goes toward --log-text, which
    is dark on the light theme and light on the three dark ones, so "darker"
    means "further from the background" on all four. Measured: 5.80 light,
    8.28 dark, 7.76 midnight, 5.69 tactical. */
 assert.match(css,/\.log-bus-end-marker\{display:block;[^}]*font-size:9px/);
 assert.match(css,/\.log-bus-end-marker\{display:block;[^}]*color:color-mix\(in srgb,var\(--log-text\) 72%/);
 assert.equal(/\.log-bus-end-marker\{display:block;[^}]*color:var\(--log-muted\)/.test(css),false,"muted was the old, lighter tone");
 /* The gap after an opened card is genuinely larger, not merely equal. It was
    already equal — 14px at 390 open or closed, measured — and read as tighter
    because the list's grey runs to the card edge and the page grey beside it is
    near enough that the edge stops registering. */
 assert.match(css,/\.log-card-group\.expanded\{margin-bottom:10px\}/);
 assert.match(css,/@media\(max-width:620px\)\{\n \.log-card-group\.expanded\{margin-bottom:8px\}/);
});

test("the line under FLEETSTEP scales with the screen",async()=>{
 /* Curtis: make it "a little bigger, just a bit". Clamped rather than a fixed
    size so it grows with the viewport the way .welcome-name above it does —
    9px was the same on a 360px phone and a 1180px shop computer.

    Measured with a Range over the text node, one rect per LINE BOX, because
    the paragraph's own box is the container width and says nothing about the
    text in it: 254px at 320 wide, 288px at its largest, one line everywhere
    with 66px to spare at the narrowest. A first attempt eased the tracking to
    buy width it turned out not to need, on exactly that confusion. */
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 assert.match(css,/\.welcome-kicker\{margin:11px 0 0;color:#9dc0ee;font-size:clamp\(10px,2\.9vw,12px\);font-weight:900;letter-spacing:2\.4px/);
 /* The tracking is what it always was. */
 assert.equal(/\.welcome-kicker\{[^}]*letter-spacing:2px/.test(css),false);
 /* And it still grows from the same floor the name does rather than shrinking
    below what it replaced. */
 const floor=Number(css.match(/\.welcome-kicker\{[^}]*font-size:clamp\((\d+)px/)[1]);
 assert.ok(floor>9,"bigger than the 9px it replaced, at every width");
});

test("the bus quick-view reads its flags the same way the token badge does",async()=>{
 /* The second half of the same crash: a bare `deferredHeld`, undeclared in
    that scope. `deferredHeld` is DERIVED per render at page.tsx — the stored
    record's own value is overwritten — so the only correct reading is
    `bus.deferredHeld`, which the token badge and the aria-label both use.
    Pinning all three to the same spelling is what stops them drifting again. */
 const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 const quick=page.slice(page.indexOf('className={"quick-view '));
 assert.ok(quick.length>0,"the quick-view portal is still in this file");
 assert.match(quick,/\{isHeld\(bus\)&&<span className="quick-detail bus-hold-detail-row"/);
 assert.match(quick,/\{bus\.deferredHeld&&<span className="quick-detail deferred-held-detail"/);
 assert.equal(/\{deferredHeld&&/.test(page),false,"a bare deferredHeld is not declared in that scope");
 /* deferredHeld really is derived and really does overwrite the record. */
 assert.match(page,/deferredHeld:deferredHeldSet\.has\(bus\.id\)/);
});

test("setHold does not offer to undo a write that was refused",async()=>{
 /* Raised in review. `persist` returns a StorageWriteResult and returns early
    when the write is refused — a full device, say — so setFleet never runs and
    no HOLD badge appears. setHold called it and ignored the answer, having
    ALREADY taken the undo snapshot, so UNDO LAST sat there offering to undo
    "Put Bus 18505 on hold" — a change the board never took. Undoing it would
    then write a fleet from before an edit that never happened.

    The comment above setHold had claimed all along that "its result is read
    rather than assumed". It was not. Both halves are fixed: the result is
    read, and the snapshot moved BELOW it.

    HONEST LIMIT: this asserts the source order, not a driven browser run. The
    refused-write path could not be reached through the Defect Log UI here —
    the seeded defect would not render a card — so what is guarded is the shape
    that was wrong, which is the ordering. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const start=page.indexOf("const setHold=(busId:string");
 assert.ok(start>0,"setHold is still in this file");
 const body=page.slice(start,page.indexOf("\n };",start));
 const persistAt=body.indexOf("persist(nextFleet,downEntries)");
 const guardAt=body.indexOf("if(!written.ok)return");
 const snapshotAt=body.indexOf("setUndoSnapshot(");
 assert.ok(persistAt>0,"setHold still persists");
 assert.ok(guardAt>persistAt,"the write result is read");
 assert.ok(snapshotAt>guardAt,"and the undo snapshot is taken only AFTER the write is known to have landed");
 assert.match(body,/const written=persist\(nextFleet,downEntries\);/);
});

test("Fixed Repairs is themed all the way into the card, not just around it",async()=>{
 const raw=await readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8");
 /* Comments stripped first. Every rule below is explained in prose directly
    above it in that file, and matching the prose instead of the rule is a
    mistake this suite has made three times. */
 const css=raw.replace(/\/\*[\s\S]*?\*\//g,"");

 /* MEASURED, NOT READ. Chromium on all four themes, seeded with one completed
    repair: Fixed Repairs had 14 elements under AA on Tactical, 12 on Dark, 12
    on Midnight and 1 on Light. Zero on all four after these rules. The numbers
    are here because the failures were invisible to every gate this repo has —
    the suite was green the whole time. */

 /* 1.13:1, and the worst of them: the fix text on a completed repair. The
    panel carried a hard-coded #f3fbf6 chosen for the light theme, so a dark
    theme drew its cream text on a near-white box. The repair-result panel must
    be tinted from theme tokens and can never name a literal colour again. */
 /* The LAST rule for the panel is the one that paints it. The base stylesheet
    still carries #f3fbf6 and should: it is the light theme's own value, and a
    var() fallback needs somewhere to fall back to. What matters is that a
    themed rule comes after it and wins. */
 const repairRules=css.match(/\.fixed-card-body \.repair-result\{[^}]*\}/g)||[];
 assert.ok(repairRules.length>1,"a themed rule follows the light-theme default");
 const repairResult=repairRules[repairRules.length-1];
 assert.match(repairResult,/background:color-mix\([\s\S]*?--fixed-accent[\s\S]*?--fixed-surface/,
  "its background is mixed from the theme rather than painted a fixed colour");
 assert.doesNotMatch(repairResult,/background:\s*#[0-9a-f]{3,8}/i,
  "and the winning rule names no literal colour");

 /* THE HEAD MUST NOT TINT ITSELF WITH THE ACCENT IT THEN DRAWS ON. Mixing the
    accent into the surface and writing the bus number, the category and the
    timestamp in that same accent is self-defeating by construction; Tactical
    had the least headroom and measured 3.92:1. It tints from the page now. */
 /* Same shape: the last rule whose selector is exactly .fixed-card-head wins.
    The base stylesheet's copy sits mid-line inside a long concatenated block,
    so this cannot be anchored to a line start. */
 const headRules=css.match(/(?:^|[\s,}])\.fixed-card-head\{[^}]*\}/g)||[];
 assert.ok(headRules.length>1,"a themed head rule follows the light-theme default");
 const head=headRules[headRules.length-1];
 assert.match(head,/background:color-mix\([^)]*--fixed-page/,"the head tints from the page");
 assert.doesNotMatch(head,/background:color-mix\([^)]*--fixed-accent/,
  "and never from the accent it draws its own text in");

 /* Surface behind HEADER text put #15180f on #393e30 — 1.63:1 on a tab you
    press to know where you are. An active tab is a piece of the page surface,
    so it reads as ink. */
 /* LAST RULE WINS, every time. Three assertions in the first draft of this
    test read the base stylesheet's light-theme copy and reported the themed
    override missing — the test was measuring the wrong half of the cascade. */
 const lastRule=selector=>{
  /* The selector may sit in a comma list — the themed rule pairs the summary
     tally with the card-head timestamp — so this matches it anywhere in the
     selector list, not only immediately before the brace. The lookahead is
     what keeps ".fixed-card-head" from also matching ".fixed-card-head>span". */
  const found=css.match(new RegExp("(?:^|[\\s,}])"+selector.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?=[\\s,{])[^{}]*\\{[^}]*\\}","g"))||[];
  return found[found.length-1]||"";
 };
 const activeTab=lastRule(".fixed-header nav a.active");
 assert.ok(activeTab,"the active tab still has a rule");
 assert.match(activeTab,/color:var\(--fixed-ink/,"the active tab reads as ink on the surface it sits on");

 /* The tallies and the completion stamp were a fixed dark green on a dark
    surface, 1.86:1. --fixed-green is a light-theme constant and must not be
    what a themed number is drawn in. */
 for(const selector of [".fixed-summary strong",".fixed-card-head time"]){
  const rule=lastRule(selector);
  assert.ok(rule,selector+" still has a rule");
  assert.doesNotMatch(rule,/var\(--fixed-green/,selector+" no longer uses the light-theme green");
 }
});
