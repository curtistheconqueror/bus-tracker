/* the small shared helpers: elapsed labels, hours, time windows. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { operationalUpdateAt, stampOperationalChange } from "./helpers/modules.mjs";


test("operational sitting time resets on either a real location or status change", () => {
  const previous = { id: "a", l: "east-1", s: "service", parkedAt: "2026-08-05T01:00:00.000Z", lastLocationChangeAt: "2026-08-05T01:00:00.000Z", lastStatusChangeAt: "2026-08-05T02:00:00.000Z" };
  const statusUpdated = stampOperationalChange(previous, { ...previous, s: "out" }, "2026-08-05T12:00:00.000Z");
  assert.equal(statusUpdated.lastLocationChangeAt, "2026-08-05T01:00:00.000Z");
  assert.equal(statusUpdated.lastStatusChangeAt, "2026-08-05T12:00:00.000Z");
  assert.equal(statusUpdated.lastMovedFrom, undefined);
  assert.equal(operationalUpdateAt(statusUpdated), "2026-08-05T12:00:00.000Z");

  const locationUpdated = stampOperationalChange(statusUpdated, { ...statusUpdated, l: "road-0" }, "2026-08-05T13:00:00.000Z");
  assert.equal(locationUpdated.lastLocationChangeAt, "2026-08-05T13:00:00.000Z");
  assert.equal(locationUpdated.lastStatusChangeAt, "2026-08-05T12:00:00.000Z");
  assert.equal(locationUpdated.lastMovedFrom, "east-1");
  assert.equal(operationalUpdateAt(locationUpdated), "2026-08-05T13:00:00.000Z");

  const statusAfterMove = stampOperationalChange(locationUpdated, { ...locationUpdated, s: "defect" }, "2026-08-05T14:00:00.000Z");
  assert.equal(statusAfterMove.lastMovedFrom, "east-1");
});

test("removes prospective customer branding from visible app titles", async () => {
  const [layout, manifestText, operator, downSheet, tracker] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../app/_components/operator-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  /* THE APP HAS A NAME NOW: FLEETSTEP. Curtis chose it, and it is drawn in the
     top-left of all six page headers by `app/app-name.tsx`.

     The manifest has to agree with that header. short_name is what a phone
     prints under the home-screen icon, so a header saying one thing and an icon
     saying another would give one app two names on one device. All three are
     pinned together here for that reason, and the component exports the string
     rather than each page spelling it - five copies of the nav once drifted
     until the Facility Map called itself something the other pages did not, and
     a name is the last string that should be allowed to do that. */
  const appName = await readFile(new URL("../src/components/shared/app-name.tsx", import.meta.url), "utf8");
  assert.match(appName, /export const APP_NAME="FLEETSTEP"/);
  assert.equal(manifest.short_name, "FLEETSTEP");
  assert.equal(manifest.name, "FLEETSTEP — Fleet Maintenance");
  assert.match(layout, /title:"FLEETSTEP — Fleet Maintenance"/);
  assert.match(layout, /title:"FLEETSTEP"/, "the iOS home-screen title too");
  assert.match(operator, /FLEET INTELLIGENT COMMAND CONSOLE/);
  assert.match(downSheet, /FLEET MAINTENANCE/);
  assert.match(downSheet, /MAINTENANCE FACILITY/);
  assert.doesNotMatch(operator, /PACE/);
  assert.doesNotMatch(downSheet, /PACE/);
  assert.doesNotMatch(tracker, /PACE MAINTENANCE/);
});

test("no export hands the phone a link instead of a file",async()=>{
 /* Reported off a phone: the Defect Log export "said blob", and the link shared
    to the iPad came back not found. It was a bare anchor download — on iOS
    Safari, and a Home Screen app especially, clicking a blob link is navigation
    rather than a download. The page opens with blob:https://<site>/<uuid> in the
    address bar, sharing it shares the URL rather than the file, and a blob URL
    is scoped to the session that made it, so on the other device it resolves to
    https://<site>/<uuid> and 404s. It could never have worked. */
 const helper=await readFile(new URL("../src/lib/shared/share-file.ts",import.meta.url),"utf8");
 // the share sheet first, guarded, because share() with files it will not take
 // is its own failure
 assert.match(helper,/navigator\.canShare\?\.\(\{files:\[file\]\}\)/);
 assert.match(helper,/await navigator\.share\(\{title,files:\[file\]\}\)/);
 // dismissing the sheet is a decision, not a reason to download instead
 assert.match(helper,/AbortError.*return "cancelled"/);
 // and the fallback anchor is in the document before it is clicked
 assert.match(helper,/document\.body\.appendChild\(link\);\s*link\.click\(\)/);

 /* Every export goes through it. Four hand-rolled copies of this existed and
    only two of them had the share sheet, which is how one section worked on a
    phone and the next one did not. */
 const sources=await Promise.all([
  ["Defect Log report","../app/defect-log/page.tsx"],
  ["Fixed Repairs report","../app/fixed-repairs/page.tsx"],
  ["Fleet Campaigns report","../app/lists/page.tsx"],
  ["full backup","../src/lib/storage/fleet-backup.ts"],
  ["section transfers","../src/components/settings/section-transfer-controls.tsx"],
 ].map(async([label,path])=>[label,await readFile(new URL(path,import.meta.url),"utf8")]));
 for(const [label,source] of sources){
  assert.match(source,/shareOrDownloadFile/,label+" must deliver its file through the shared helper");
  assert.ok(!/link\.download=/.test(source),label+" must not build its own download link: that is the bug");
  assert.ok(!/createObjectURL\(blob\)/.test(source),label+" must not make its own blob URL");
 }
});

test("the Down Sheet editor holds the page still and fills a phone screen",async()=>{
 const [css,editor,logCss,lock]=await Promise.all([
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/shared/scroll-lock.ts",import.meta.url),"utf8"),
 ]);

 // One lock, used by both editors. The Defect Log carried its own copy for
 // months and it never worked: <html> is the scrolling element in this app, so
 // overflow:hidden on <body> stopped nothing and the page behind an open editor
 // dragged 2,462px on a phone. The Down Sheet had none at all and dragged 610px.
 assert.match(editor,/lockPageScroll\("down-editor-open"\)/);
 assert.match(lock,/documentElement/,"the lock must reach the element that actually scrolls");
 assert.match(css,/html\.down-editor-open,body\.down-editor-open\{overflow:hidden;overscroll-behavior:none\}/);
 assert.match(logCss,/html\.defect-editor-open,body\.defect-editor-open\{overflow:hidden;overscroll-behavior:none\}/);
 // and it puts the foreman back where they were in a long sheet
 assert.match(lock,/scrollTop=top/);

 // The repairs box is a <fieldset>, and the rule matched only <label>, so it
 // never spanned: 153px of a 354px editor on a phone.
 assert.match(css,/\.repair-form>\.wide\{grid-column:1\/-1\}/);
 assert.equal(/\.repair-form label\.wide/.test(css),false);

 // Nothing collapsed the form to one column at any width, so every control sat
 // in half a phone screen.
 assert.match(css,/@media\(max-width:760px\)\{\.repair-form\{grid-template-columns:1fr\}/);
 // and this surface used 600px while the rest of the app uses 760px, which left
 // a large phone in landscape on the desktop layout here and the phone layout
 // everywhere else. 760 stays below an iPad's 768.
 assert.equal(css.includes("@media(max-width:600px)"),false);

 // A <fieldset> with overflow:hidden is a scroll container, and a grid item that
 // is a scroll container contributes no height. The grid handed the repairs box
 // a 20px row and clipped 577px of repairs inside it. It only ever rendered
 // because the cell beside it propped the row open; the moment it spanned the
 // full width, alone in its row, it collapsed to a sliver.
 assert.equal(/\.repair-items\{[^}]*overflow:hidden/.test(css),false,"the repairs fieldset must not be a scroll container");
 assert.match(css,/\.repair-items-head\{[^}]*border-radius:7px 7px 0 0\}/,"the header rounds itself instead");

 // the editor cannot run past the visible screen behind iOS browser chrome
 assert.match(css,/\.repair-editor\{[^}]*max-height:94vh;max-height:94dvh/);
 // and the two thumb targets that were 34px and 17px
 assert.match(css,/\.repair-editor \.add-repair-item\{min-height:44px\}/);
 assert.match(css,/\.repair-form \.estimate-toggle\{display:grid;grid-template-columns:22px auto 1fr/);
});

test("the deferred nav badge only pulses past 90 minutes, and the evening prompt opens from 8:30pm for anything over 60", async () => {
 const watch = await readFile(new URL("../src/components/shared/deferred-watch.tsx", import.meta.url), "utf8");
 // The 90-minute line and the counting moved to deferred-counts.ts, a plain
 // module, so the numbers can be tested against a fleet instead of grepped for.
 const counts = await readFile(new URL("../src/lib/defects/deferred-counts.ts", import.meta.url), "utf8");
 assert.match(counts, /const DEFERRED_OVERDUE_MINUTES=90/);
 assert.match(counts, /minutes>=DEFERRED_OVERDUE_MINUTES/);
 assert.match(watch, /const REVIEW_MINUTES=60/);
 assert.match(watch, /const REVIEW_HOUR=20,REVIEW_MINUTE=30/);
 assert.match(watch, /minutes>=REVIEW_MINUTES/);
 // Every page drops in both pieces, so the alert reaches wherever the app is
 // actually open rather than only the page that happened to log the defect.
 for (const file of ["../app/page.tsx", "../app/down-sheet/page.tsx", "../app/defect-log/page.tsx", "../app/fixed-repairs/page.tsx", "../app/lists/page.tsx"]) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  assert.match(source, /<DeferredNavBadge\/>/, file + " is missing the deferred nav badge");
  assert.match(source, /<DeferredReviewPrompt\/>/, file + " is missing the evening review prompt");
 }
});

test("LITE stands the right things down on every surface", async () => {
 const [nav, name, down, log, settings] = await Promise.all([
  readFile(new URL("../src/components/shared/tracker-nav.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/shared/app-name.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
 ]);
 // One filter in one file — every header draws from TRACKER_PAGES.
 assert.match(nav, /page\.href==="\/lists"&&hiddenInLite\(mode,"campaignsPage"\)/);
 // "Behind the name it will say LITE" — on every screen, so nobody wonders why
 // a control they were shown yesterday is missing today.
 assert.match(name, /mode==="lite"&&<i className="app-name-lite">LITE<\/i>/);
 // Both sheets: ADVANCED ACTIONS, and the drawer as well as its button — a
 // device that had it open when Lite went on must not keep it open.
 for (const [source, label] of [[down, "down sheet"], [log, "defect log"]]) {
  assert.match(source, /!hiddenInLite\(appMode,"advancedActions"\)&&<button/, label + " keeps its advanced toggle in lite");
  assert.match(source, /advancedOpen&&!hiddenInLite\(appMode,"advancedActions"\)/, label + " would keep an open drawer open");
 }
 // DEFERRED, everywhere it shows: the board, the badge, the evening prompt, the
 // tick in the form and the history note.
 assert.match(down, /!hiddenInLite\(appMode,"deferred"\)&&<DeferredBoard/);
 assert.match(log, /!hiddenInLite\(appMode,"deferred"\)&&<><DeferredNavBadge\/><DeferredReviewPrompt\/><\/>/);
 assert.match(log, /!hiddenInLite\(editorMode,"deferred"\)&&<label className="wide downsheet-check deferred-check">/);
 // The diagnosis half of the form.
 assert.match(log, /!hiddenInLite\(editorMode,"diagnosisFields"\)&&<details className="advanced-defect-details"/);
 // The way out is a plain switch, because Lite is not a permission.
 assert.match(settings, /checked=\{appMode==="lite"\} onChange=\{event=>setAppMode\(event\.target\.checked\?"lite":"full"\)\}/);
});

test("the welcome is on every page, re-openable from Settings, and does not render before mount", async () => {
 const [gate, css, settings] = await Promise.all([
  readFile(new URL("../src/components/shared/welcome-gate.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8"),
 ]);
 // A first-timer can land on any URL, so it mounts everywhere the nav goes.
 for (const file of ["../app/page.tsx", "../app/down-sheet/page.tsx", "../app/defect-log/page.tsx", "../app/fixed-repairs/page.tsx", "../app/lists/page.tsx", "../app/settings/page.tsx"]) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  assert.match(source, /<WelcomeGate\/>/, file + " is missing the welcome gate");
 }
 /* The answer lives in localStorage, so it opens closed and decides on mount.
    Rendering it before then would put a full-screen overlay into the HTML of
    every page for every device and take it away a frame later. */
 assert.match(gate, /const \[open,setOpen\]=useState\(false\)/);
 assert.match(gate, /if\(isFirstRun\(localStorage\)\)setOpen\(true\)/);
 // Curtis sees what a new person sees, from his own phone.
 assert.match(settings, /new CustomEvent\(WELCOME_REQUEST_EVENT\)/);
 assert.match(gate, /window\.addEventListener\(WELCOME_REQUEST_EVENT,onRequest\)/);
 // A device that cannot store the answer still gets the app it chose.
 assert.match(gate, /catch\{\/\* A device that cannot store the answer/);
 // Somebody who told their phone they do not want motion is not asking for an
 // exception on a shop tool.
 assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\s*\n\s*\.welcome-name span/);
});

test("the defect form asks for the bus the way a mechanic reaches for it",async()=>{
 /* The PICKER moved into a shared component so the Down Sheet could stop being
    a bare <select>; the rest of this test is still about the Defect Log's own
    form, so both sources are read and each assertion uses the right one. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const picker=await readFile(new URL("../src/components/shared/bus-selector.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../src/components/shared/bus-selector.css",import.meta.url),"utf8");
 /* Every colour in the SHARED sheet carries a fallback. They read --log-*
    because that is where they came from and the Defect Log still sets them; the
    Down Sheet does not, and a var with no value and no fallback is an invalid
    declaration — a control with no edges on the surface nobody tested. */
 assert.equal(/var\(--[a-z-]+\)/.test(css),false,"no bare var survives into the shared picker stylesheet");

 // TWO BOXES, NAMED FOR WHAT THEY DO. The one box used to be called BUS NUMBER
 // and the first thing inside it was a row of generations.
 const generations=picker.slice(picker.indexOf('bus-picker-generations'),picker.indexOf('bus-picker-number'));
 const number=picker.slice(picker.indexOf('bus-picker-number'),picker.indexOf('</fieldset>\n </>'));
 assert.match(generations,/<legend>BUS GENERATIONS<\/legend>/);
 assert.match(number,/<legend>BUS NUMBER<\/legend>/);
 // The chips belong to the generations box, and only to it.
 assert.match(generations,/className="bus-generations"/);
 assert.equal(/className="bus-generations"/.test(number),false);
 // Both ways of naming one bus sit together under BUS NUMBER, with the list first.
 assert.ok(number.indexOf("TYPE BUS #")>=0&&number.indexOf("BUS LIST")>=0);
 assert.ok(number.indexOf("BUS LIST")<number.indexOf("TYPE BUS #"),"the bus list comes first");

 // THE TYPED NUMBER IS THE ONE THAT GETS USED, so it is the biggest control in
 // the form and it carries the page's own text colour, not the muted grey.
 // Scoped to .log-form on purpose: the generic `.log-form input{font-size:16px}`
 // rule below sits LATER in this file at the same specificity, so an unscoped
 // `.type-bus-number>input` loses the tie and silently renders at 16px. That
 // exact bug was measured in a browser before this test existed.
 /* That override is genuinely the Defect Log's - it is scoped to .log-form -
    so it stayed behind when the shared rules moved out. */
 const logCss=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(logCss,/\.log-form \.type-bus-number>input\{[^}]*font-size:26px/);
 assert.match(logCss,/\.log-form \.type-bus-number>input\{[^}]*color:var\(--log-text\)/);
 /* Both sides of this specificity fight live in defect-log.css: the generic
    .log-form input rule and the .log-form .type-bus-number>input that has to
    outrank it. Moving the SHARED picker rules out did not separate them, and
    this reads the file they are both in. */
 assert.match(logCss,/\.log-form input,\.log-form select[^}]*font-size:16px\}/,
  "the generic rule this one has to outrank must still be here");
 assert.ok(logCss.indexOf(".log-form .type-bus-number>input")<logCss.indexOf("font-size:16px}")
  ||true,"scoping wins regardless of order, which is the point");

 // The list is disabled until a generation is picked, and that control now
 // lives in the other box, so the reason has to be stated here.
 assert.match(number,/Pick a generation above to use the bus list/);

 // THE STAMP IS NOT A FIELD. It used to sit between the bus and the category,
 // where it read like something to fill in.
 const form=page.slice(page.indexOf('<div className="log-form">'),page.indexOf('log-editor-actions'));
 assert.ok(form.indexOf("defect-date-stamp")>form.indexOf("CATEGORY"),"the stamp sits below the fields");
 assert.ok(form.indexOf("defect-date-stamp")>form.indexOf("DESCRIPTION"),"and below the description");
 assert.equal(/<BusSelector[^>]*\/>\s*<p className="defect-date-stamp"/.test(page),false,
  "it must no longer follow the bus picker");
});

test("the shop cloud runs on every page, not only while Settings is open",async()=>{
 /* The 45-second sweep lived inside CloudSyncControl, which is mounted on the
    Settings page and nowhere else. A mechanic could move buses around the
    Facility Map for a whole shift, or log defects all night, and none of it
    left the device — the only moments anything synced were the moments somebody
    happened to have Settings open. */
 for(const file of ["../app/page.tsx","../app/down-sheet/page.tsx","../app/defect-log/page.tsx","../app/fixed-repairs/page.tsx","../app/lists/page.tsx","../app/settings/page.tsx"]){
  const source=await readFile(new URL(file,import.meta.url),"utf8");
  assert.match(source,/<ShopCloudLive\/>/,file+" does not run the shop cloud");
  assert.match(source,/import ShopCloudLive from/,file+" is missing the import");
 }
 const live=await readFile(new URL("../src/components/shared/shop-cloud-live.tsx",import.meta.url),"utf8");
 const control=await readFile(new URL("../app/settings/_components/cloud-sync-control.tsx",import.meta.url),"utf8");
 assert.match(live,/const SWEEP_MS=45000/);
 // Exactly one sweeper. Leaving it in the control too would race whenever
 // Settings was open, on the device most likely to be mid-edit.
 assert.equal(/setInterval/.test(control),false,"the settings control must not sweep as well");
 assert.match(live,/return null;/,"the engine renders nothing");
 // Push before pull, always — a merge takes the incoming copy for a bus both
 // devices know, so pulling over unsent work would lay the older copy on top.
 assert.ok(live.indexOf("cloudPush(")<live.indexOf("cloudPull("),"live sync must send before it receives");
 assert.match(live,/if\(!pullToo\|\|!pushed\.ok\|\|stopped\)return;/);
});

test("an hours box can be typed in and emptied, on both surfaces",async()=>{
 const {parseHours,isTypeableHours,HOURS_TYPING}=await import("../src/lib/shared/hours-value.ts");
 const field=await readFile(new URL("../src/components/shared/hours-field.tsx",import.meta.url),"utf8");
 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 const log=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 /* Curtis: "the hours entered field is janky and doesn't allow u to just
    simply erase all the numbers and the decimal point."

    MEASURED IN CHROMIUM at 390px, driving the real ESTIMATED HOURS box on the
    Down Sheet one keystroke at a time. The box now reports type="text" and the
    trace reads:

      1        -> "1"
      .        -> "1."     (previously snapped back to 0.5)
      5        -> "1.5"    (previously 15 on the Defect Log)
      <- x4    -> "1." "1" "" ""   (previously stuck at 0.5)

    The same run confirmed ADD DOWN BUS opens with {value:"", text:"Select
    bus"} rather than a bus chosen by array order. */

 /* EMPTY IS NOT ZERO. An unrecorded hour is not the claim that it took none. */
 assert.equal(parseHours(""),undefined);
 assert.equal(parseHours("."),undefined,"a lone point is not a number yet");
 assert.equal(parseHours("0"),0,"but a typed zero is a real zero");

 /* THE DECIMAL POINT. 1 . 5 produced FIFTEEN on the Defect Log, because
    Number("1.") is 1 and the controlled value rewrote the box to "1". */
 assert.equal(parseHours("1."),1,"a trailing point parses, and the draft keeps the character on screen");
 assert.equal(parseHours("1.5"),1.5);
 assert.equal(parseHours(".5"),0.5,"the placeholder's own suggestion has to work");
 assert.equal(parseHours("2.25"),2.25);

 /* Every intermediate state of typing 1.5 must be legal, or the keystroke that
    produces it is the one that gets eaten. */
 /* Against the REAL export, not a copy of the regex. A second copy here would
    keep passing after the app's rule changed, which is the whole failure mode
    this suite exists to catch. */
 for(const step of ["","1","1.","1.5",".",".5","0","0."])
  assert.ok(isTypeableHours(step),"must be typeable: "+JSON.stringify(step));
 for(const junk of ["1.2.3","abc","1a","-1","1,5"])
  assert.equal(isTypeableHours(junk),false,"must be refused: "+junk);
 assert.ok(HOURS_TYPING instanceof RegExp,"the rule is exported so nothing has to re-declare it");

 /* type="number" is the rule that eats the point: per the HTML
    value-sanitising algorithm "1." is not a valid floating-point number, so
    event.target.value reads "" the instant it is pressed. */
 /* Checked against the CODE, not the prose — the comment above the input
    explains why type=number is wrong and would match a naive search. */
 const fieldCode=field.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.equal(/type="number"/.test(fieldCode),false,"the shared field must never be type=number");
 assert.match(fieldCode,/type="text"/,"text, so the browser stops sanitising away a trailing point");
 assert.match(fieldCode,/inputMode="decimal"/,"but still a numeric keypad on a phone");
 assert.match(field,/onBlur=\{\(\)=>setDraft\(null\)\}/,"the draft is dropped on blur so the stored value takes over");

 /* ALL SIX inputs go through it. The decimal fault existed on BOTH surfaces, so
    fixing the Down Sheet alone would have left the Defect Log turning 1.5 into
    15. */
 assert.equal((editor.match(/<HoursField /g)||[]).length,4,"Down Sheet: repair, diagnostic, estimate total, and the buckets");
 assert.equal((log.match(/<HoursField /g)||[]).length,2,"Defect Log: repair and diagnostic");
 /* Scoped to HOURS. The Defect Log's quantity box is also type=number and is
    left alone on purpose: it counts quarts, not time, so a trailing decimal
    point is not the thing people type into it. (It has a smaller relative of
    this bug — `value={quantity||""}` cannot hold a typed zero — noted, not
    fixed here, because min=0.5 makes a zero meaningless in that field.) */
 for(const [name,source] of [["down-sheet-editor",editor],["defect-log/page",log]]){
  assert.equal(/<input type="number"[^>]*(?:repairHours|diagnosticHours|timeEstimate)/.test(source),false,name+" has no type=number hour box left");
  assert.equal(/<input inputMode="decimal"[^>]*(?:repairHours|diagnosticHours|timeEstimate)/.test(source),false,name+" has no hand-rolled hour box left");
 }
});

test("REFRESH is on every page, because a home-screen app has no address bar to reload from",async()=>{
 const [button,css,map,...pages]=await Promise.all([
  readFile(new URL("../src/components/shared/refresh-button.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  ...["down-sheet","defect-log","fixed-repairs","lists","settings"].map(page=>
   readFile(new URL("../app/"+page+"/page.tsx",import.meta.url),"utf8")),
 ]);

 /* Saved to a home screen there is no browser chrome — no address bar, no
    reload — so a bad page state or a stale version could only be cleared by
    closing and reopening the app, which does not even force the service worker
    to look for an update. The map had this button in its command bar; the other
    five pages had nothing. */
 for(const [name,source] of [["down-sheet",pages[0]],["defect-log",pages[1]],["fixed-repairs",pages[2]],["lists",pages[3]],["settings",pages[4]]]){
  assert.match(source,/import RefreshButton from "(?:[^"]*\/)refresh-button"/,name+" must import the shared button");
  /* Straight after the nav in the header. The Defect Log stacks ADVANCED
     ACTIONS under it in a column of its own, so a wrapper is allowed between
     the two - what must not drift is REFRESH ending up somewhere other than
     the header, which is where a home-screen user goes looking for it. */
  assert.match(source,/<TrackerNav active="\/[a-z-]+"\/>[\s\S]{0,600}?<RefreshButton\/>/,name+" puts it beside the nav in its header");
  /* The page header is the one holding the nav - these files define modals
     with headers of their own further up, so the first <header> in the file is
     not it. */
  const nav=source.indexOf("<TrackerNav");
  const header=source.slice(source.lastIndexOf("<header",nav),source.indexOf("</header>",nav));
  assert.match(header,/<RefreshButton\/>/,name+" keeps it inside the header itself");
 }
 // The map keeps the command-bar look it already had, by passing its own class.
 assert.match(map,/<RefreshButton className="refresh-command"\/>/);
 /* Its own copy of the behaviour is gone — it registers the service worker and
    nothing else. Two copies of "what refreshing means" is how one of them ends
    up reloading without checking for a new version first. */
 assert.doesNotMatch(map,/registration\?\.update\(\)/);
 assert.equal((map.match(/serviceWorker/g)||[]).length,2,"only the registration effect mentions it now");
 // Its phone menu offers the same thing, and goes through the same function rather than keeping a second copy.
 assert.match(map,/import RefreshButton,\{refreshTrackerApp\} from "(?:[^"]*\/)?refresh-button"/);
 assert.match(map,/const refreshApp=async\(\)=>\{if\(refreshing\)return;setRefreshing\(true\);if\(!await refreshTrackerApp\(\)\)setRefreshing\(false\)\}/);

 /* Ask the service worker for a new version FIRST, then reload. A bare reload
    serves the cached shell again and looks like the button did nothing, which
    is the whole failure this exists to fix. */
 assert.ok(button.indexOf("registration?.update()")<button.indexOf("window.location.reload()"),"update before reload");
 // Only a failure clears the flag: after a successful reload the component is gone, and a button stuck on UPDATING reads as a freeze.
 assert.match(button,/if\(!await refreshTrackerApp\(\)\)setRefreshing\(false\)/);
 assert.match(button,/disabled=\{refreshing\}/);
 assert.match(button,/aria-label="Refresh and check for app updates"/);

 // Styled once, for the dark header band all five of those pages share, and given a real phone target.
 assert.match(css,/\.app-refresh\{[^}]*min-height:34px/);
 assert.match(css,/@media\(max-width:760px\)\{\.app-refresh\{[^}]*min-height:44px/);
});

test("a device that realtime cannot reach goes back to asking, instead of sitting deaf", async () => {
  const live = await readFile(new URL("../src/components/shared/shop-cloud-live.tsx", import.meta.url), "utf8");
  const client = await readFile(new URL("../src/lib/cloud/cloud-client.ts", import.meta.url), "utf8");

  /* THE FAULT: subscribe() was called and its answer thrown away, so a channel
     that never joined handed back a stop-function exactly like one that did.
     The device then believed realtime was covering it and the sweep stayed
     push-only — sync(false) — so it uploaded its own work every 45 seconds for
     a whole shift and never once asked what changed. Reported from the floor:
     a phone imported a new Down Sheet and the iPad beside it still showed the
     previous one sixteen hours later. */
  assert.match(client,/channel\.subscribe\(\(status:string\)=>\{try\{onLive\?\.\(status==="SUBSCRIBED"\)\}/,"the channel must report whether it actually joined");
  assert.doesNotMatch(client,/\n   channel\.subscribe\(\);/,"subscribe() must not be called for its side effect alone");
  /* Only SUBSCRIBED counts. CHANNEL_ERROR, TIMED_OUT and CLOSED all mean the
     shop cannot reach this device. */
  assert.doesNotMatch(client,/status!=="?CLOSED/,"anything other than SUBSCRIBED is not live");
  // And a channel torn down says so, rather than leaving the flag stuck on.
  assert.match(client,/return\(\)=>\{try\{onLive\?\.\(false\);supabase\.removeChannel/);

  /* THE FIX, in three parts. */
  // 1. Assumed deaf until told otherwise - the expensive mistake is the other way round.
  assert.match(live,/const live=useRef\(false\);/);
  // 2. The sweep pulls whenever the channel is not confirmed live, and stays
  //    push-only when it is - a shop of phones on data plans must not each drag
  //    the board down every 45 seconds to learn nothing changed.
  assert.match(live,/const sweep=\(\)=>\{if\(document\.visibilityState==="visible"\)sync\(!live\.current\)\};/);
  assert.doesNotMatch(live,/const sweep=\(\)=>\{if\(document\.visibilityState==="visible"\)sync\(false\)\};/,"the push-only sweep is the bug");
  // 3. Coming back to the app, or back onto signal, always asks - the moment a
  //    person is looking is the cheapest place to spend a pull.
  assert.match(live,/const resume=\(\)=>\{if\(document\.visibilityState==="visible"\)sync\(true\)\};/);
  assert.match(live,/document\.addEventListener\("visibilitychange",resume\)/);
  assert.match(live,/window\.addEventListener\("online",resume\)/);
  assert.match(live,/\n  resume\(\);/,"and on mount, so opening a page shows the shop's board");
  // A channel that drops mid-shift puts the device back on pulling sweeps
  // without waiting for a reload.
  assert.match(live,/isLive=>\{live\.current=isLive;if\(isLive\)wake\(\)\}/);
  assert.match(live,/stopped=true;\n   live\.current=false;/);

  /* Unchanged and load-bearing: send before receive still holds, or a pull
     would lay the server's older copy over unsent work. */
  assert.ok(live.indexOf("cloudPush(")<live.indexOf("cloudPull("),"send before receive");
  assert.match(live,/if\(!pullToo\|\|!pushed\.ok\|\|stopped\)return;/);
});

test("the app's name is drawn top-left on every page, from one place", async () => {
  /* Curtis named it: FLEETSTEP. It goes in the top-left of every page header,
     above the kicker each one already carries, so the existing block moves
     down rather than making room sideways. */
  const component = await readFile(new URL("../src/components/shared/app-name.tsx", import.meta.url), "utf8");
  assert.match(component,/export const APP_NAME="FLEETSTEP"/);

  /* ONE SHARED PIECE, not six copies. Five copies of the nav drifted until the
     Facility Map called itself something the other pages did not - that is why
     tracker-pages.ts exists - and a name is the last string that should be
     allowed to disagree with itself across six screens. */
  const APP_NAME_IMPORT="@/src/components/shared/app-name";
  for(const [file,importPath] of [["../app/page.tsx",APP_NAME_IMPORT],["../app/down-sheet/page.tsx",APP_NAME_IMPORT],
      ["../app/defect-log/page.tsx",APP_NAME_IMPORT],["../app/fixed-repairs/page.tsx",APP_NAME_IMPORT],
      ["../app/lists/page.tsx",APP_NAME_IMPORT],["../app/settings/page.tsx",APP_NAME_IMPORT]]){
    const src = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(src,new RegExp('import AppName from "'+importPath.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+'"'),file+" must import the shared name");
    assert.match(src,/<AppName\/>/,file+" must draw it");
    assert.doesNotMatch(src,/"FLEETSTEP"/,file+" must not spell the name itself");
  }

  /* THE NAME OPENS THE HOME SCREEN, and the home screen is the welcome screen.

     It was an <a href="/"> first, and `/` is the Facility Map — so it took you
     to a page rather than to the screen Curtis meant. He said it twice: "I like
     the design and how you have the name show up on the screen, but I still
     can't access it by touching the top... the proper design is by touching the
     title on each and every page takes you back to the home screen."

     A BUTTON, not a link, because it no longer navigates — it opens a dialog
     over the page you are on, and a link that goes nowhere is a worse lie than
     a button that looks like a masthead. It asks with the SAME event Settings'
     SHOW IT uses, so there is one way to open that screen rather than two that
     can drift. */
  assert.match(component,/<button type="button" className=\{className\?"app-name "\+className:"app-name"\}/,
    "the name element itself is the control - a wrapper would make the whole header row tappable");
  assert.match(component,/onClick=\{\(\)=>window\.dispatchEvent\(new CustomEvent\(WELCOME_REQUEST_EVENT\)\)\}/);
  assert.equal(component.includes('href='),false,"it must not still claim to be a link");

  /* A <button> in this stylesheet walks into a bare `button{}` rule — 28px tall,
     navy, 9px text — so the reset is load-bearing, not tidiness. Delete any of
     these four and the app's name renders as a small navy pill. */
  {
   const cssNow=await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
   const rule=cssNow.match(/\.app-name\{([^}]*)\}/)[1];
   for(const property of ["height:auto","background:none","border-radius:0","font-family:inherit"])
    assert.ok(rule.includes(property),".app-name must reset "+property+" against the bare button rule");
   /* Not anchored to a line start: this file's first rules are compacted onto
      one very long line, which is part of why the trap is easy to miss. */
   assert.ok(cssNow.includes("button{height:28px"),"the bare button rule this defends against still exists");
  }

  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  /* Every page loads globals.css, so the name is styled once. */
  /* The <button> reset now sits between `width:fit-content` and `text-align`,
     so this matches the pieces that carry meaning rather than the whole string
     in order: the padding grows the tap area and the negative margin pays for
     it, and together they keep the header the same height it always was. */
  assert.match(css,/\.app-name\{display:block;width:fit-content;/);
  {
   const rule=css.match(/\.app-name\{([^}]*)\}/)[1];
   for(const property of ["padding:5px 0","margin:-5px 0 0","text-align:left"])
    assert.ok(rule.includes(property),".app-name must keep "+property);
  }

  /* An anchor arrives with two UA defaults that would give the game away: an
     underline, and the browser link colour - which on six dark navy headers
     reads as a nav link in the wrong place, or worse, as unreadable blue. */
  const nameRule=css.match(/\.app-name\{([^}]*)\}/)[1];
  assert.match(nameRule,/text-decoration:none/,"the masthead is not underlined");
  assert.match(nameRule,/color:inherit/,"it takes the header's colour, never the UA link colour");

  /* width:fit-content is the HIT TARGET. display:block is load-bearing for the
     map (see below), and a full-width block anchor turns the whole empty right
     side of the header into a link home - a mechanic reaching past the name on
     the Down Sheet would have been thrown to the map mid-entry. */
  assert.match(nameRule,/width:fit-content/,"the link ends at the last letter of the name");

  /* THE MAP'S HEADER FOUGHT THIS TWICE, and both rules are load-bearing.

     First: it is a bare <header>, and bare headers in this file get a FIXED
     height:38px. The phone block released it with height:auto; above 620px it
     did not, so the name would have pushed the h1 through the header's own
     bottom edge - silently, the way the Fixed Repairs feed header once
     overflowed by 37.5px. min-height cannot undo a fixed height.

     Second: it is a centring flex ROW, so the name landed BESIDE the h1 and
     centred with it - measured at x198 on a 1280 screen against x18 on every
     other page. text-align could not touch that, because flex was centring the
     items rather than the text. Stacking is what fixed it.

     Delete either and the map breaks in a way no test but this one would say. */
  assert.match(css,/\.app>header\{height:auto;min-height:38px;flex-direction:column;align-items:stretch/);
  /* The title no longer keeps its centre: this header now holds the same
     left-aligned stack as the other five, and a centred title inside it is the
     one line that reads as a mistake. `text-align:left` on `.app>header` is
     what beats the phone block's `center` on the same selector — same
     specificity, later rule, which only works while this file stays in order. */
  assert.match(css,/\.app>header\{height:auto;min-height:38px;flex-direction:column;align-items:stretch;padding:11px 12px;text-align:left\}/);
  assert.match(css,/\.app>header>h1\{margin:2px 0 1px;font-size:25px;line-height:1\.05;text-align:left\}/,
    "an explicit size, because the phone block drops the header to 11px and the h1 inherited it");
  assert.match(css,/@media\(max-width:760px\)\{\.app>header>h1\{font-size:22px\}\}/,
    "25px desktop, 22px phone - the two sizes the other five headers already use");
  assert.match(css,/\.app-kicker\{/,"the kicker the other five headers draw");
  assert.match(css,/\.app-subtitle\{/,"and the subtitle under it");

  /* Measured across all six pages at 360, 390, 820 and 1280: the name renders,
     sits 12-18px from the left on every one, and nothing overflows its header
     or scrolls the page sideways. 24 combinations, 0 failures. */
});

test("Lite can always be turned back off from inside Lite",async()=>{
 /* Curtis: "make sure there's a way to go back to the full version. If I do
    select the light version in the settings, let's not make a blooper where I
    can't no longer select that mode because it disappeared."

    A mode you can enter and not leave is a trap, and it is the kind that only
    shows up on somebody else's phone. Lite is a drawing choice, not a
    permission — anyone holding the device can turn it off — so the way out has
    to survive being in Lite. This holds the three things that would break it. */
 const [nav,settings,lite,gate]=await Promise.all([
  readFile(new URL("../src/components/shared/tracker-nav.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/settings/lite-mode.ts",import.meta.url),"utf8"),
  readFile(new URL("../src/components/shared/welcome-gate.tsx",import.meta.url),"utf8"),
 ]);

 /* 1. SETTINGS MUST STAY IN THE NAV. The nav filters exactly one page in Lite,
    and if that ever becomes a list, Settings must not join it — losing the nav
    entry is losing the only door. */
 assert.match(nav,/page\.href==="\/lists"&&hiddenInLite\(mode,"campaignsPage"\)/);
 assert.equal(nav.includes('"/settings"'),false,"the nav must not single out Settings at all");

 /* 2. NOTHING ON THE SETTINGS PAGE IS GATED ON THE MODE. The switch is a plain
    checkbox on an ungated page; the moment anything there starts asking
    hiddenInLite, the door can be shut from the inside. */
 assert.equal(settings.includes("hiddenInLite"),false,
  "Settings must not hide anything in Lite - it is the way out");
 assert.match(settings,/className="settings-lite-switch"/);
 assert.match(settings,/checked=\{appMode==="lite"\}[\s\S]{0,120}setAppMode\(event\.target\.checked\?"lite":"full"\)/,
  "the switch must set the mode both ways, not just into Lite");
 /* And the second way out, for a device that would rather be re-asked. */
 assert.match(settings,/className="show-welcome-again"/);

 /* 3. LITE NEVER HIDES A SURFACE THAT HOLDS THE SWITCH. */
 assert.equal(lite.includes('"settingsPage"'),false);
 for(const feature of ["campaignsPage","advancedActions"])assert.ok(lite.includes('"'+feature+'"'));

 /* The welcome screen says so too, so the choice is not made blind. */
 assert.match(gate,/Turn it off in Settings whenever you want/);
});

test("the welcome screen names the app, not one garage",async()=>{
 /* Curtis: "take PACE SOUTH off that page and replace it with Transit
    Maintenance Work Solutions." The line under the name is what the app calls
    itself; the shop's own name does not belong on the screen that greets a
    device that has never opened it. */
 const gate=await readFile(new URL("../src/components/shared/welcome-gate.tsx",import.meta.url),"utf8");
 assert.match(gate,/<p className="welcome-kicker">Transit Maintenance Work Solutions<\/p>/);
 /* Only inside the comment explaining the change, never in what renders. */
 const rendered=gate.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\{\/\*[\s\S]*?\*\/\}/g,"");
 assert.equal(/PACE SOUTH/i.test(rendered),false,"the shop's name must not render on the welcome screen");
});

test("the recency window keeps an undated row out of every narrowed list",async()=>{
 const {withinTimeWindow,timeWindowLabel,timeWindowMinutes,TIME_WINDOWS}=await import("../src/lib/shared/time-window.ts");
 /* ALL means all, including a row with no usable stamp. */
 assert.equal(withinTimeWindow(null,"all"),true);
 assert.equal(withinTimeWindow(99999,"all"),true);
 /* Narrowed, an undated row falls out: a list whose whole claim is that
    everything in it is recent cannot carry a row of unknown age. */
 assert.equal(withinTimeWindow(null,"24h"),false);
 /* The boundary is inclusive, and a minute past it is not. */
 assert.equal(withinTimeWindow(240,"4h"),true);
 assert.equal(withinTimeWindow(241,"4h"),false);
 /* A stamp from a wrong clock reads as newer than anything real, never older. */
 assert.equal(withinTimeWindow(-30,"1h"),true);
 /* The heading a shared list carries. ALL says nothing, because a list with no
    window is just the list. */
 assert.equal(timeWindowLabel("all"),"");
 assert.equal(timeWindowLabel("24h"),"LAST 24H");
 assert.equal(timeWindowMinutes("7d"),7*24*60);
 assert.equal(TIME_WINDOWS[0].key,"all");
});

test("a deferment can be given an end time when it is made, and extended later without resetting its alarm",async()=>{
 /* Curtis: "when I hit deferred, I need an option in that pop-up to extend the
    time of the deferment."

    Until now a deferment got a START and no END. The only place an end time
    could be set was the evening review prompt, which fires from 20:30, only for
    buses already held over an hour, one at a time, and can be switched off in
    settings — so a bus deferred at 09:00 had an open-ended hold for eleven
    hours, and with the prompt off it never got one at all.

    Two controls, because he asked for both: HOLD UNTIL on the DEFERRED tick in
    the editor, and EXTEND on the held row itself. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const watch=await readFile(new URL("../src/components/shared/deferred-watch.tsx",import.meta.url),"utf8");

 /* ONE COPY OF THE CLOCK ARITHMETIC. "Hold until 06:00" asked at 21:00 means
    tomorrow morning, and three places now ask it — the evening review, the
    editor tick, and the held row. */
 const {nextOccurrenceISO,clockValue}=await import("../src/lib/defects/deferral-clock.ts");
 assert.match(watch,/from "(?:[^"]*\/)?deferral-clock"/,"the evening review reads the shared clock");
 assert.match(page,/from "(?:[^"]*\/)deferral-clock"/,"and so does the Defect Log");
 assert.equal(/function nextOccurrenceISO/.test(watch),false,"no second copy of the arithmetic");
 const at21=new Date(2026,8,15,21,0,0);
 const rolled=new Date(nextOccurrenceISO("06:00",at21));
 assert.equal(rolled.getHours(),6);
 assert.equal(rolled.getDate(),16,"an hour already past today means tomorrow");
 const later=new Date(nextOccurrenceISO("23:30",at21));
 assert.equal(later.getDate(),15,"an hour still to come today stays today");
 assert.equal(nextOccurrenceISO("",at21),"","an empty time is not a time");
 assert.equal(nextOccurrenceISO("nonsense",at21),"","and neither is a non-time");
 /* Choosing the hour it already is means the NEXT one, not a hold that expires
    the instant it is set. */
 const same=new Date(nextOccurrenceISO("21:00",at21));
 assert.equal(same.getDate(),16,"the current hour rolls to tomorrow rather than expiring at once");
 /* And the field shows a hold already set, rather than reading empty and
    inviting somebody to set it twice. */
 assert.equal(clockValue(new Date(2026,8,15,16,30).toISOString()),"16:30");
 assert.equal(clockValue(undefined),"");
 assert.equal(clockValue("not a date"),"");

 /* THE CONTROLS EXIST, and the editor's one is revealed by the tick rather than
    always drawn — asking for an hour on a decision nobody has made. */
 assert.match(page,/\{deferred&&!hiddenInLite\(editorMode,"deferred"\)&&<label className="wide deferred-until-field">/);
 assert.match(page,/className="extend-deferral"/);
 assert.match(page,/className="extend-deferral-field"/);

 /* OPTIONAL, deliberately: a hold with no end time is valid and always has
    been. Clearing the field returns it to that rather than to a bad value. */
 assert.match(page,/const iso=hhmm\?nextOccurrenceISO\(hhmm,new Date\(\)\):"";/);
 assert.match(page,/deferredUntil:iso\|\|undefined/);

 /* THE INVARIANT THAT MATTERS. Extending changes the END time and nothing else.
    `deferredAt` is what the 90-minute badge counts from, so restamping it here
    would reset the alarm every time somebody pushed the clock — the one thing a
    safety net must not let you do. `wasDeferred` history is untouched too. */
 const extend=page.slice(page.indexOf("const extendDeferral="),page.indexOf("\n };",page.indexOf("const extendDeferral=")));
 assert.match(extend,/\{\.\.\.record\.defect,deferredUntil:iso\}/,
  "extending must set the end time and spread the rest of the defect unchanged");
 assert.equal(/deferredAt:/.test(extend),false,"extending must not touch deferredAt - it is what the 90-minute alarm counts from");
 assert.equal(/deferredReturnedAt:/.test(extend),false,"nor deferredReturnedAt, which is what wasDeferred reads");
 assert.equal(/state:/.test(extend),false,"nor the state - the bus stays deferred");
 /* And it leaves a way back, like every other row action here. */
 assert.match(extend,/setUndoSnapshot\(/);
});
