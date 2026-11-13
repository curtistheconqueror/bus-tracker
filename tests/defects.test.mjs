/* the defect catalog, the Defect Log and what is deferred. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BRAKE_TEST_KEY, CATALOG_OPTIONS, CHECK_ENGINE_ISSUES, CHECK_ENGINE_SYMPTOMS, DEFAULT_DEFECT_LOG_DISPLAY, DEFAULT_DOWN_SHEET_DISPLAY, EMPTY_FINDINGS_MEMORY, EMPTY_PARTS_MEMORY, FLUID_TOP_UPS, PARTS_MEMORY_LIMIT, PARTS_MEMORY_STORAGE_KEY, QUICK_FILTERS, QUICK_FILTER_EVENT, QUICK_FILTER_PARAM, RECENT_DUPLICATE_WINDOW_HOURS, RECENT_DUPLICATE_WINDOW_LABEL, REPAIR_CATEGORY_EMOJI, REPAIR_OPTIONS, REPAIR_OPTION_GROUPS, RETIRED_ISSUES, WORK_STATES, activeDefectLogCount, addDefectPart, applyDefectToBuses, applyDownEntryToFleet, applyOperatorBatch, brakeTestFailed, brakeTestResult, defaultDefectOperability, defectCountField, defectFromDraft, defectLabel, defectLogRecords, defectNote, defectPartsMissing, defectPartsText, defectSummary, defectSupportingDetails, defectWorkStates, deferredBadgeCounts, deferredMinutesElapsed, diagLightLabel, excludeFromFocusShare, fluidsLabel, focusShareIsEmpty, focusShareScope, focusShareScopeNote, forgetFinding, forgetPart, groupDefectLogRecords, hasDeferredHistory, hasDiagLightField, hasWorkState, heldDeferredBuses, hideDefectLogRecords, isCheckEngineIssue, isDefectLogCleanupCandidate, isDownSheetRecommended, isFluidTopUp, isHeldDeferred, isUnresolved, learnFinding, learnPart, migrateRepairIdentity, moveOrSwapBuses, normalizeAlarmCode, normalizeDefectLogDisplay, normalizeDefectParts, normalizeDefects, normalizeDiagLight, normalizeDownSheetDisplay, normalizeFinding, normalizeFindingsMemory, normalizeFluids, normalizePartsMemory, normalizeRepairCount, normalizeRepairItems, normalizeSweepRow, normalizeWorkStateStamp, normalizeWorkStates, noteIssues, partMemoryKey, partMemoryLabel, partNumberMissing, partToLearn, partsToLearn, putBackLastExclusion, quickFilterBusIds, quickFilterDefects, quickFilterFallbackLabel, quickFilterFromValue, quickFilterHref, quickFilterMatch, quickFilterShareText, readPartsMemory, readSettings, recallFindings, recallPart, recentDefectDuplicate, recommendedMinutesElapsed, removeDefectPart, repairCategoryEmoji, repairCategoryLabel, repairGroupDisplayLabel, repairGroupPlaceholder, repairGroupStepLabel, repairIssueDisplayLabel, repairIssuePlaceholder, repairIssueStepLabel, returnDefectLogBusToService, saveDefectLogRecord, searchCatalog, searchCatalogForCategory, searchCategories, searchTerms, setDefectWorkState, setDownSheetRecommendation, SWIPE_AXIS_RATIO, SWIPE_COMMIT_PX, statusForLocation, sweepDefect, sweepFindings, sweepOkAgainstBoard, swipeHidesRow, swipeOffsetPx, updateDefectPart, withDefectParts, workStateStampLabel, writePartsMemory } from "./helpers/modules.mjs";
import { render } from "./helpers/setup.mjs";
import { effectiveStyle, stripCodeComments } from "./helpers/css-rules.mjs";

/* ONE FUNCTION'S BODY, BY BALANCED BRACES.

   Every gate in this file that wants to assert something about a single handler
   used to slice a fixed number of characters from its name, and a reviewer
   defeated that: 700 characters from `const copyFocusBus=` runs clean through
   the four-line handler into `shareFocusBusText` below it, so an assertion
   about the first was satisfied by the second. One name, one body. */
const bodyOfSource=(source,name)=>{
 const at=source.indexOf("const "+name+"=");
 assert.notEqual(at,-1,name+" is gone from the source");
 const open=source.indexOf("{",at);
 let depth=0;
 for(let i=open;i<source.length;i++){
  if(source[i]==="{")depth++;
  else if(source[i]==="}"&&!--depth)return source.slice(open,i+1);
 }
 throw new Error(name+" has no balanced body");
};

test("defect normalization preserves future odometer and parts fields",()=>{
 const [defect]=normalizeDefects([{id:"future-defect",category:"Bus Controls",issue:"Horn",details:"No horn",state:"open",operability:"service",odometerMiles:123456,partsUsed:true,parts:[{id:"part-1",partNumber:"HORN-1"}],futureMetadata:{revision:4}}]);
 assert.equal(defect.odometerMiles,123456);
 assert.equal(defect.partsUsed,true);
 assert.deepEqual(defect.parts,[{id:"part-1",partNumber:"HORN-1"}]);
 assert.deepEqual(defect.futureMetadata,{revision:4});
});

test("shared Quick Filters classify active tracker and Defect Log records", () => {
  const buses=[
    {id:"ac",n:"1",defects:[{category:"A/C and HVAC",issue:"Cooling - No cooling",details:"",state:"open"}]},
    {id:"engine",n:"2",checkEngine:true,defects:[]},
    {id:"ramp",n:"3",badRampKneeler:true,defects:[]},
    {id:"horn",n:"4",noHorn:true,defects:[]},
    {id:"farebox",n:"41",farebox:true,defects:[]},
    {id:"ibsVentra",n:"42",ibsVentra:true,defects:[]},
    {id:"leak",n:"5",defects:[{category:"Cooling System",issue:"Coolant leak",details:"",state:"open"}]},
    {id:"oil",n:"6",defects:[{category:"Preventive Maintenance",issue:"Add engine oil",details:"",quantity:10,unit:"quarts",state:"open"}]},
    {id:"fixed",n:"7",defects:[{category:"Engine",issue:"Oil leak",details:"",state:"completed"}]},
    {id:"notDuplicated",n:"8",defects:[{category:"Electrical / Multiplex",issue:"Intermittent electrical",details:"Reported cutting out",state:"completed",conditionNotDuplicated:true}]},
  ];
  assert.equal(QUICK_FILTERS.length,14);
  /* The TAIL of the list answers "what needs a decision or a handover" and
     everything above it answers "what is broken". Asserted as the tail rather
     than by index so that moving any of the three up among the symptom filters
     fails by name — which is the claim, not the arithmetic. LOGGED joined this
     group rather than the one above it: it names a stretch of time, not a
     fault. */
  assert.deepEqual(QUICK_FILTERS.slice(-3).map(item=>item.key),["down-sheet-recommended","deferred","logged"]);
  assert.equal(QUICK_FILTERS.at(-1).key,"logged");
  assert.equal(quickFilterMatch(buses[0],"ac"),true);
  assert.deepEqual(quickFilterBusIds(buses,"check-engine"),["engine"]);
  assert.deepEqual(quickFilterBusIds(buses,"bad-ramp"),["ramp"]);
  assert.deepEqual(quickFilterBusIds(buses,"no-horn"),["horn"]);
  assert.deepEqual(quickFilterBusIds(buses,"farebox"),["farebox"]);
  assert.deepEqual(quickFilterBusIds(buses,"ibs-ventra"),["ibsVentra"]);
  assert.deepEqual(quickFilterBusIds(buses,"leak"),["leak"]);
  assert.deepEqual(quickFilterBusIds(buses,"add-oil"),["oil"]);
  assert.deepEqual(quickFilterBusIds(buses,"not-duplicated"),["notDuplicated"]);
  assert.equal(defectLabel(buses[7].defects[0]),"Preventive Maintenance — Add engine oil — 10 quarts");
  const mixed={id:"mixed",n:"8",defects:[buses[0].defects[0],buses[7].defects[0]]};
  assert.deepEqual(quickFilterDefects(mixed,"ac").map(defect=>defect.issue),["Cooling - No cooling"]);
  // A blank line between buses and the defects indented under the number. This
  // gets read on a phone in a garage, where fourteen buses of run-on text is a
  // wall the eye slides off. A bus with no location simply omits it.
  assert.equal(quickFilterShareText("A/C",[mixed],"ac"),"A/C — 1 bus\n\nBus 8\n   A/C and HVAC — Cooling - No cooling");
  assert.equal(quickFilterShareText("Farebox",[{id:"flag",n:"9",farebox:true,defects:[buses[7].defects[0]]}],"farebox"),"Farebox — 1 bus\n\nBus 9\n   Farebox tracker flag");
  assert.equal(quickFilterShareText("IBS & Ventra",[{id:"legacy",n:"10",pendingRepair:"Ventra reader blank",defects:[]}],"ibs-ventra"),"IBS & Ventra — 1 bus\n\nBus 10\n   Ventra reader blank");
  const fifteen=Array.from({length:15},(_,index)=>({id:"fare-"+index,n:String(17500+index),defects:[{id:"farebox-"+index,category:"Tech Services",issue:"Farebox",details:"Reader offline",state:"open"},{id:"ac-"+index,category:"A/C and HVAC",issue:"Cooling - No cooling",details:"",state:"open"}]}));
  const fifteenFarebox=quickFilterShareText("Farebox",fifteen,"farebox");
  assert.equal(quickFilterBusIds(fifteen,"farebox").length,15);
  // One block per bus, each separated by a blank line. Asserting the structure
  // rather than a line count, because the count moves whenever the layout does
  // and tells nobody what actually broke.
  assert.equal(fifteenFarebox.split("\n\n").length,16);
  assert.equal((fifteenFarebox.match(/^Bus /gm)||[]).length,15);
  assert.doesNotMatch(fifteenFarebox,/No cooling/);
  assert.equal(quickFilterShareText("Defect / Condition Not Duplicated",[buses[9]],"not-duplicated"),"Defect / Condition Not Duplicated — 1 bus\n\nBus 8\n   Electrical / Multiplex — Intermittent electrical — Reported cutting out");
});

test("the Mystery list renders on the Down Sheet, and the Defect Log packs its controls away", async () => {
  /* MYSTERY BUSES moved: every bus it lists is a bus that is NOT on the Down
     Sheet, so it belongs beside that sheet rather than on the Defect Log. */
  const downResponse=await render("/down-sheet");
  assert.equal(downResponse.status,200);
  const downHtml=await downResponse.text();
  assert.match(downHtml,/MYSTERY BUSES/);
  assert.match(downHtml,/ON-SITE WORK AREAS NOT ON DOWN SHEET/);
  assert.match(downHtml,/class="mystery-board"/);
  assert.match(downHtml,/class="mystery-toggle"/);

  const response=await render("/defect-log");
  assert.equal(response.status,200);
  const html=await response.text();
  assert.doesNotMatch(html,/class="mystery-board"/,"the board left this page");
  assert.doesNotMatch(html,/ON-SITE WORK AREAS NOT ON DOWN SHEET/);

  /* Nine controls were loose above the feed. Only the two used on every visit
     stay out — LOG DEFECT and SEARCH — and the rest sit behind one button,
     closed until it is opened. */
  assert.match(html,/ADVANCED ACTIONS/);
  /* The toggle lives in the header now, in the same column as REFRESH, drawn
     like the header's own controls rather than like a card on the page. */
  assert.match(html,/class="log-header-actions"><button class="app-refresh"[\s\S]*?class="header-advanced-toggle"/,"ADVANCED ACTIONS sits directly under REFRESH, inside the header");
  assert.match(html,/class="header-advanced-toggle"[^>]*aria-expanded="false"/,"it opens closed, which is the point of it");
  /* Closed, the drawer is not in the document at all, so the button must not
     point a screen reader at it. */
  assert.doesNotMatch(html,/aria-controls="log-advanced-drawer"/);
  const css2=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
  assert.doesNotMatch(css2,/\.log-advanced-toggle/,"the card-style toggle rules died with the card; nothing carries that class now");
  assert.doesNotMatch(html,/class="log-advanced /,"closed, the drawer must not render an empty bordered box");
  /* Closed, the header button is the last thing in the header - the drawer it
     opens is a sibling below, not a light panel dropped into the navy. */
  assert.match(html,/<\/button><\/div><\/header>/);
  assert.match(html,/\+ LOG DEFECT/);
  assert.match(html,/>SEARCH</);
  for(const label of ["QUICK FILTERS","UNDO LAST","CLEAN UP","SCAN SWEEP","SCAN BATCHES","AI OPERATOR"])
   assert.doesNotMatch(html,new RegExp(">"+label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"<"),label+" must be inside the closed section, not loose on the page");
  const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
   /* Four boxes in a two-column grid: two full rows, nothing sitting alone. */
   assert.match(css,/\.engine-symptom-picker>div\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);

  /* MOVING A BUTTON MOVES IT OUT OF ITS OWN RULES. These four were written
     against .feed-title, which is where they used to live; carried into
     ADVANCED ACTIONS they matched nothing and quietly lost their paint - the
     AI OPERATOR link came out as plain dark text with no gradient and CLEAN UP
     came out with no border at all, both reported off the live site. The
     buttons render in one place now and the rules must reach it. */
  for(const rule of [/\.log-advanced \.feed-operator\{/,/\.log-advanced \.cleanup-log\{/,
                     /\.log-advanced \.sweep-scan-button:disabled/,/\.log-advanced \.scan-batches-button:disabled/])
   assert.match(css,rule,"a rule that only names .feed-title cannot reach a button that no longer renders there");
  assert.match(css,/\.log-advanced \.feed-operator\{[^}]*linear-gradient\(120deg,#4a2389,#7138c5\)/,"AI OPERATOR keeps its purple");
  assert.match(css,/\.log-advanced \.cleanup-log\{border:1px solid/,"CLEAN UP has a border you can see");
  /* The toggle is drawn from the header's own translucent-white pair, not the
     light-surface one it had as a card - that was invisible against navy.

     THE PAIR IS THE RULE, NOT ITS OPACITY. This asserted #ffffff5c and
     #ffffff1f exactly, so brightening the toggle to make it easier to find on
     a phone failed a test about something else. What must not change is that
     both halves are translucent WHITE: a light-surface background is the bug
     this line was written for, and #6b31b6 is the Down Sheet's.

     TRANSLUCENT, THOUGH - 00 and ff are excluded by hand. A first pass at
     loosening this took any two hex digits, which accepted #ffffff00 and
     #ffffffff: invisible, and an opaque light surface. Those are precisely the
     two failures the rule exists to catch, so the looser regex would have
     permitted the bug while still reading like a guard. */
  /* IT WAS A TRANSLUCENT-WHITE PAIR, and white stopped being the header's
     colour the moment the header's colour became a setting. On a pale header
     that pair put white text on near-white: measured 1.02:1. It is now the
     header's own computed ink — a border of it, and no fill at all, so the
     label sits directly on the header and reads exactly as well as the header
     ink does. The rule this line is for is unchanged: the toggle belongs to
     the header and must not be the Down Sheet's purple. */
  assert.match(css,/\.header-advanced-toggle\{[^}]*border:1px solid color-mix\(in srgb,var\(--app-header-text[^;]*;[^}]*background:transparent/,
   "the toggle takes its edge from the header's ink and sits straight on the header");
  assert.doesNotMatch(css,/\.header-advanced-toggle\{[^}]*(background|color):#[0-9a-f]{3,8}/,
   "and names no colour of its own");
  assert.doesNotMatch(css,/\.header-advanced-toggle\{[^}]*background:var\(--log-surface/,
   "a light surface is invisible against navy, which is why this rule exists");

  /* AND THE DRAWER WEARS THE SAME COLOUR AS THE BUTTON THAT OPENS IT. Curtis,
     on the old white panel: "it opens up a white list ... the colors don't
     match and it kind of looks like it's unrelated." --log-header is the one
     background guaranteed dark on all four themes, so the drawer follows the
     header rather than a mix that would invert on the dark ones. */
  assert.match(css,/\.log-advanced\{[^}]*background:var\(--log-header/,
   "the ADVANCED ACTIONS drawer takes the header colour its button sits on");
  assert.match(css,/\.log-advanced-body\{[^}]*background:transparent/,
   "the body lets the drawer colour through instead of painting a light sheet over it");
  assert.match(css,/\.log-header-actions\{[^}]*flex-direction:column/,"REFRESH and ADVANCED ACTIONS stack in one column");
  /* The board's phone rules moved to globals.css with the board itself — that
     is the one stylesheet both pages load, and the Defect Log still needs the
     MOVE / LOCATION editor's styles for its deferred drawer. */
  const shared=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
  assert.match(shared,/@media\(max-width:760px\)\{\.mystery-board/);
  assert.doesNotMatch(css,/\.mystery-board\{/,"the board's own styles must not be left behind on a page it no longer renders");
  assert.match(css,/\.quick-filter-drawer\{position:fixed/);
  const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
  assert.match(page,/quickFilterExpandedBusIds/);
  assert.match(page,/aria-expanded=\{expanded\}/);
  /* quickFilterShareLabel, not quickFilterLabel: the recency window is part of
     what a shared list claims, so it travels in the heading. Still built from
     quickFilterBuses, which is the narrowed list. */
  assert.match(page,/quickFilterShareText\(quickFilterShareLabel,quickFilterBuses,quickFilter,quickFilterShareOptions\)/);
  assert.match(page,/navigator\.share\(\{title:quickFilterShareLabel\+" bus list",text\}\)/);
  assert.doesNotMatch(page,/navigator\.share\(\{[^}]*url:/);
  assert.match(page,/aria-label="Copy filtered bus list"/);
  assert.match(page,/aria-label="Share filtered bus list as text"/);
  /* The drawer's own cards read the same window the share does, so what is on
     screen and what gets pasted cannot disagree. */
  assert.match(page,/quickFilterDefects\(bus,quickFilter,new Date\(\)\.toISOString\(\),quickFilterShareOptions\)/);
  assert.match(page,/current\.includes\(bus\.id\)\?\[\]:\[bus\.id\]/);
  assert.match(css,/\.quick-filter-defects\{/);
  assert.match(css,/\.quick-filter-share-actions button\{min-height:36px/);
  assert.match(css,/@media\(max-width:760px\)\{\.quick-filter-share-actions button\{min-height:44px/);
  assert.match(css,/\.quick-filter-drawer>\.quick-filter-results\{min-height:0;grid-auto-rows:max-content/);
  assert.match(css,/inset:max\(8px,env\(safe-area-inset-top\)\) 8px max\(8px,env\(safe-area-inset-bottom\)\)/);
  assert.match(shared,/\.mystery-board\.collapsed>\.mystery-head\{border-bottom:0\}/);
  assert.match(shared,/\.mystery-toggle\{width:38px;height:38px/);
});

test("tracker uses one counted Down Sheet control and one counted Defect Log control", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  /* Both moved into the PAGES menu when four page buttons were wrapping the
     command bar onto a second row. Still one of each, still counted. */
  assert.equal((page.match(/"\/down-sheet":actualDownSet\.size/g) || []).length, 1);
  assert.equal((page.match(/"\/defect-log":defectLogCount/g) || []).length, 1);
  assert.doesNotMatch(page, /className="downsheet-command"/);
  assert.doesNotMatch(page, /className="defectlog-command"/);
  assert.match(page, /defectLogCount=activeDefectLogCount\(buses\)/);
});

test("bulk defect assignment appends safely, skips duplicates, and updates road status", () => {
  const shared = { id: "shared", category: "Electrical / Multiplex", issue: "Horn", details: "", operability: "service", state: "open" };
  const existing = { id: "existing", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" };
  const fleet = [
    { id: "a", l: "road-0", s: "service", defects: [], pendingRepair: "" },
    { id: "b", l: "garage-10", s: "shop", defects: [existing], pendingRepair: defectSummary([existing]) },
    { id: "c", l: "road-1", s: "defect", defects: [{ ...shared, id: "already" }], pendingRepair: defectSummary([shared]) },
    { id: "d", l: "west-0", s: "service", defects: [], pendingRepair: "" },
  ];
  const updated = applyDefectToBuses(fleet, ["a", "b", "c", "d"], shared);
  assert.equal(updated.error, null);
  assert.equal(updated.applied, 3);
  assert.equal(updated.skipped, 1);
  assert.equal(updated.fleet.find(bus => bus.id === "a").s, "defect");
  assert.equal(updated.fleet.find(bus => bus.id === "a").defects.length, 1);
  assert.equal(updated.fleet.find(bus => bus.id === "b").s, "defect");
  assert.equal(updated.fleet.find(bus => bus.id === "b").defects.length, 2);
  assert.equal(updated.fleet.find(bus => bus.id === "c").defects.length, 1);
  assert.equal(updated.fleet.find(bus => bus.id === "d").s, "out");
  assert.match(updated.fleet.find(bus => bus.id === "b").pendingRepair, /No cooling.*Horn/);
  assert.notEqual(updated.fleet.find(bus => bus.id === "a").defects[0].id, updated.fleet.find(bus => bus.id === "b").defects[1].id);

  const downing = { id: "downing", category: "Brakes", issue: "Air brake fault", details: "", operability: "down", state: "open" };
  const madeOut = applyDefectToBuses(updated.fleet, ["a"], downing);
  assert.equal(madeOut.fleet.find(bus => bus.id === "a").s, "out");

  const missing = applyDefectToBuses(fleet, ["a", "missing"], shared);
  assert.equal(missing.error, "missing-bus");
  assert.equal(missing.fleet, fleet);
  assert.equal(missing.applied, 0);
});

test("manual defect drafts are captured when the main editor is saved", () => {
  const draft = defectFromDraft({ category: "", issue: "", details: "  Driver reports intermittent rattle  ", operability: "service", state: "open" }, "manual", "manual-test");
  assert.equal(draft.id, "manual-test");
  assert.equal(draft.category, "Miscellaneous");
  assert.equal(draft.details, "Driver reports intermittent rattle");
  assert.equal(draft.source, "tracker");
  assert.equal(defectLabel(draft), "Driver reports intermittent rattle");
  assert.equal(defectSummary([draft]), "Driver reports intermittent rattle");
});

test("repair catalog exposes robust category and issue choices", () => {
  assert.equal(Object.keys(REPAIR_OPTIONS).length, 21);
  assert.ok(Object.entries(REPAIR_OPTIONS).filter(([category]) => category !== "Interior Cleaning").every(([, options]) => options.length >= 5));
  assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("Cooling - No cooling"));
  assert.ok(REPAIR_OPTIONS["Brakes"].includes("ABS warning"));
  assert.ok(REPAIR_OPTIONS["Inspection"].includes("B-12"));
  assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("Operating Controls - Horn"));
  assert.equal(Object.keys(REPAIR_OPTION_GROUPS["Operator/Driver Controls"])[0], "Driver Seat");
  // Doors moved to Bus Accessories when Bus Controls split, keeping the specific
  // symptom wording rather than the vaguer component names that were there.
  // The general option leads, with the specific symptoms under it — that is the
  // order a fault gets narrowed down in, and the general one is the most used.
  assert.deepEqual(REPAIR_OPTION_GROUPS["Bus Accessories"]["Doors"].slice(0,4), ["Front door","Front door will not open","Front door will not close","Front door opens / closes slowly"]);
  /* One option was retired by the split and only one: the single wheelchair-area
     stop request became one per side, and a record logged under it cannot be
     given a side after the fact. It still reads back exactly as logged. */
  assert.deepEqual(RETIRED_ISSUES["Bus Accessories"], ["Stop Request - Stop request (wheelchair area)"]);
  assert.equal(REPAIR_OPTIONS["Operator/Driver Controls"][0], "Driver Seat - Seat belt");
  assert.ok(REPAIR_OPTIONS["Bus Accessories"].includes("Ramp, Lift and Kneeler - Kneeler not functioning correctly"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Misfire"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Stop engine light"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Coolant level sensor"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Stabilizer link"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Dogtracking"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Leveling valve"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Bus leaning - C/S"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Bus leaning - R/S"));
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Brake mod light"));
  /* A sticking brake is a SYMPTOM and the two valves that can cause one are
     PARTS, listed under Pneumatic System. The catalog kept the symptom out
     altogether until now, which left naming a valve as the only way to log it.
     These four say what the bus is doing; the last two assertions are the ones
     that bite, because the tempting "fix" is to name R-12 or R-14 right here
     and store a guess where an inspection reads a fact. */
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Brakes sticking / dragging"));
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Brakes will not release - service (after pedal)"));
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Brakes will not release - parking brake"));
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Brake chamber leaking"));
  assert.ok(REPAIR_OPTIONS.Brakes.every(issue => !/R-1[24]/.test(issue)));
  assert.ok(REPAIR_OPTIONS["Pneumatic System"].includes("R-12 service valve (C/S rear)"));
  assert.ok(REPAIR_OPTIONS["Pneumatic System"].includes("R-14 parking brake valve (R/S rear)"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Farebox - Unlocked / won't lock"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("CUBIC Screen - BUS ER"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("CUBIC Screen - MV ER"));
  assert.ok(REPAIR_OPTIONS["Lights, Mirrors and Alarms"].includes("Outside rear view mirror - C/S"));
  assert.ok(REPAIR_OPTIONS["Lights, Mirrors and Alarms"].includes("Outside rear view mirror - R/S"));
  assert.equal(repairCategoryEmoji("Engine"), REPAIR_CATEGORY_EMOJI.Engine);
  assert.equal(repairCategoryLabel("Engine"), "⚙️ Engine");
  assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("Gauges and Dash - Fuel gauge INOP / false reading"));
  assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("System Switches - Kneeler button"));
  assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("Gauges and Dash - Front dash damage"));
  assert.ok(REPAIR_OPTIONS.Bodywork.includes("Bike rack - bent / replacement"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("IBS Screen - INOP (general)"));
  assert.ok(REPAIR_OPTIONS.Bodywork.includes("IBS screen pole - broken"));
  for(const issue of ["Interior advertising panel / ad card rack - loose or hanging (C/S)","Interior advertising panel / ad card rack - loose or hanging (R/S)","Passenger seat - loose","Passenger seat - missing","Passenger seat - damaged","Passenger assist handle / hanging strap - loose or broken","Passenger grab rail / stanchion - loose or damaged"])
    assert.ok(REPAIR_OPTIONS.Bodywork.includes(issue),issue);
  assert.ok(REPAIR_OPTIONS.Miscellaneous.includes("Missing road hazard triangles (3 required)"));
  assert.ok(REPAIR_OPTIONS.Miscellaneous.includes("Fire extinguisher missing"));
  assert.equal(repairIssueDisplayLabel("Fire extinguisher missing"),"🧯 Fire extinguisher missing");
  assert.ok(REPAIR_OPTIONS["Preventive Maintenance"].includes("Bike rack - arms / pivot adjustment"));
  /* Two renames in a chain: MDT Screen became IBS Screen, and IBS Screen then
     moved into its group. A record from the MDT era lands at the end of both. */
  assert.equal(normalizeDefects([{id:"legacy-screen",category:"Tech Services",issue:"MDT Screen",details:"Blank",state:"open"}])[0].issue,"IBS Screen - INOP (general)");
  assert.deepEqual(Object.keys(REPAIR_OPTION_GROUPS.Amerex), ["Fire Suppression", "Gas Concentration", "CNG"]);
  /* Each module reports Roof 1, Roof 2 and the engine. The engine positions
     were missing, so a mechanic reading TROUBLE MOD 1 ENGINE off the panel had
     nothing in the picker to file it as. */
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Fire Suppression"], ["FIRE alarm (system discharged)", "Heat sensor communication fault", "Trouble Mod 1 Roof 1", "Trouble Mod 1 Roof 2", "Trouble Mod 1 Engine", "Trouble Mod 2 Roof 1", "Trouble Mod 2 Roof 2", "Trouble Mod 2 Engine", "Control head no power", "Other Fire Suppression Trouble"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Gas Concentration"], ["Trace", "Significant Leak", "Other Gas Concentration Alert"]);
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 1 Roof 1"));
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 1 Roof 2"));
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 2 Roof 2"));
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 1 Engine"));
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 2 Engine"));
  /* The stored identity and the names the picker draws are two structures that
     have to stay in step: add to one only, and the picker offers an option that
     saves as nothing, or a saved record has no option to reach it. Checked for
     the whole category rather than for the entries just added. */
  for(const [group, issues] of Object.entries(REPAIR_OPTION_GROUPS.Amerex))
   for(const issue of issues)
    assert.ok(REPAIR_OPTIONS.Amerex.includes(group + " - " + issue), group + " - " + issue + " is in the picker but not in REPAIR_OPTIONS");
  for(const option of REPAIR_OPTIONS.Amerex){
   // first separator only: an issue name is allowed to contain " - " itself
   const at = option.indexOf(" - ");
   const group = option.slice(0, at), issue = option.slice(at + 3);
   assert.ok(REPAIR_OPTION_GROUPS.Amerex[group]?.includes(issue), option + " is a stored option the picker cannot offer");
  }
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Gas Concentration - Significant Leak"));
  // Amerex keeps the wording printed on the panel; every other grouped
  // category gets plain wording that names its own groups.
  assert.equal(repairGroupStepLabel("Amerex"), "CHOOSE THE SYSTEM");
  // Derived from the groups, never a literal. This line used to name its two in
  // a string, so adding a third would have told a mechanic to choose between
  // two of the three options in front of them.
  const amerexGroups = Object.keys(REPAIR_OPTION_GROUPS.Amerex);
  assert.ok(amerexGroups.length >= 3);
  assert.equal(repairGroupPlaceholder("Amerex"), "Choose " + amerexGroups.slice(0, -1).join(", ") + " or " + amerexGroups.at(-1));
  assert.match(repairGroupPlaceholder("Amerex"), /CNG/);
  assert.equal(repairIssueStepLabel("Amerex"), "CHOOSE THE STATUS OR DEFECT");
  // named by its group, because "an Amerex status or code" is wrong for a
  // missing PRD cap
  assert.equal(repairIssuePlaceholder("Amerex", "Fire Suppression"), "Choose a Fire Suppression status or defect");
  assert.equal(repairIssuePlaceholder("Amerex", "CNG"), "Choose a CNG status or defect");
  assert.equal(repairGroupStepLabel("Operator/Driver Controls"), "CHOOSE THE GROUP");
  // Six since Bus Accessories was added for the bike rack; this counted five
  // before. The placeholder is generated from the group list rather than
  // written out, so the number moving is exactly what the assertion is for.
  assert.equal(repairGroupPlaceholder("Operator/Driver Controls"), "Choose one of 4 groups");
  assert.equal(repairIssueStepLabel("Operator/Driver Controls"), "CHOOSE THE DEFECT");
  assert.equal(repairIssuePlaceholder("Operator/Driver Controls", "Gauges and Dash"), "Choose a defect in Gauges and Dash");
  // An ungrouped category never reaches step 2, but the helper must not throw.
  assert.equal(repairGroupPlaceholder("Engine"), "Choose one of 0 groups");
  // HAZMAT on the sheet is a biohazard on board, and it belongs here rather than
  // in Miscellaneous, where it read as "Unknown diagnosis".
  assert.deepEqual(REPAIR_OPTIONS["Interior Cleaning"], ["Scheduled Cleaning", "Cleaning Required", "Biohazard - blood, vomit or faeces (HAZMAT)"]);
  assert.equal(defaultDefectOperability("Interior Cleaning", "Scheduled Cleaning"), "service");
  assert.equal(defaultDefectOperability("Interior Cleaning", "Cleaning Required"), "down");
  const cleaningRequired = { defects: [{ id: "clean", category: "Interior Cleaning", issue: "Cleaning Required", details: "", operability: "down", state: "open" }] };
  assert.equal(statusForLocation("garage-4", "out", cleaningRequired), "shop");
  assert.equal(statusForLocation("road-4", "out", cleaningRequired), "shop");
  assert.equal(statusForLocation("west-4", "shop", cleaningRequired), "out");
  const twoDefects = [
    { id: "one", category: "Electrical / Multiplex", issue: "Horn", details: "", operability: "service", state: "open" },
    { id: "two", category: "Tech Services", issue: "Farebox", details: "Reader offline", operability: "service", state: "open" },
    { id: "three", category: "Electrical / Multiplex", issue: "Horn", details: "Intermittent", operability: "service", state: "open" },
  ];
  assert.equal(twoDefects.length, 3);
  assert.match(defectSummary(twoDefects), /Horn.*Farebox.*Reader offline.*Horn.*Intermittent/);
});

test("Defect Log keeps multiple check-engine symptoms inside one defect record", async () => {
 // Stop engine light is now a catalog entry of its own and half of the combined
 // entry, so offering it again as a tick box would be two ways to say one thing.
 /* Four now, and the last is deliberately a component rather than a symptom:
    the picker exists to narrow a check-engine light into somewhere to look, and
    on this fleet the coolant LEVEL sensor is the highest point of failure that
    ends in a shutdown. Named in full because it is not the coolant TEMP sensor,
    and a count that mixes the two is worse than no count. */
 assert.deepEqual(CHECK_ENGINE_SYMPTOMS,["Misfire","Loss of power","Low oil","Coolant level sensor"]);
 assert.equal(CHECK_ENGINE_SYMPTOMS.length%2,0,"a full bottom row in the two-column picker");
  const [defect]=normalizeDefects([{id:"check-engine-1",category:"Engine",issue:"Check engine light",symptoms:["Misfire","Loss of power","Misfire"],details:"Under load",operability:"service",state:"open",source:"defect-log"}]);
  assert.deepEqual(defect.symptoms,["Misfire","Loss of power"]);
  assert.equal(defectSupportingDetails(defect),"Misfire, Loss of power — Under load");
  assert.match(defectLabel(defect),/Engine — Check engine light — Misfire, Loss of power — Under load/);
  const saved=saveDefectLogRecord([{id:"bus-1",n:"18505",s:"service",l:"road-1",defects:[]}],[],"bus-1",defect,true,"2026-08-24T20:00:00.000Z");
  assert.equal(saved.error,null);
  assert.equal(saved.fleet[0].defects.length,1);
  assert.deepEqual(saved.fleet[0].defects[0].symptoms,["Misfire","Loss of power"]);
  assert.equal(saved.downEntries[0].customReason,"Misfire, Loss of power — Under load");
  const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
  const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
  assert.match(page,/CHECK ENGINE SYMPTOMS — SELECT ALL THAT APPLY/);
  assert.match(page,/All selections save as one defect record/);
  assert.match(page,/toggleCheckEngineSymptom/);
  assert.match(css,/\.engine-symptom-picker/);
  assert.match(css,/Phone-only header containment and in-flow summary\/filter layout/);
  /* The position reset is gone because the collision is gone: the tile was
     className="fixed", which Tailwind owns, and no longer is. */
  assert.match(css,/\.log-summary \.fixed-today\{grid-column:1\/-1\}/);
});

test("real-time defect log keeps one linked repair across tracker and down sheet", async () => {
  const fleet = [{
    id: "bus-20501", n: "20501", l: "garage-4", s: "service", down: false, parkedAt: "2026-08-19T10:00:00.000Z",
    pendingRepair: "", defects: [], mechanic: "", shift: "Night", roadcall: false,
  }];
  const defect = {
    id: "defect-log-20501-misfire", category: "Engine", issue: "Loss of power",
    details: "Severe cylinder 1 misfire; engine derate", operability: "down", state: "open",
    reportedBy: "CJ", source: "defect-log",
  };
  const added = saveDefectLogRecord(fleet, [], "bus-20501", defect, true, "2026-08-19T11:00:00.000Z");
  assert.equal(added.error, null);
  assert.equal(added.fleet[0].defects.length, 1);
  assert.equal(added.fleet[0].defects[0].id, defect.id);
  assert.equal(added.fleet[0].s, "out");
  assert.equal(added.fleet[0].down, true);
  assert.equal(added.downEntries.length, 1);
  assert.equal(added.downEntries[0].defectId, defect.id);
  assert.equal(added.downEntries[0].workflow, "Scheduled");

  const inProgress = saveDefectLogRecord(
    added.fleet,
    added.downEntries,
    "bus-20501",
    {...added.fleet[0].defects[0], state: "in-progress", actionTaken: "Diagnosing cylinder 1"},
    true,
    "2026-08-19T12:00:00.000Z",
  );
  assert.equal(inProgress.fleet[0].defects.length, 1);
  assert.equal(inProgress.fleet[0].s, "shop");
  assert.equal(inProgress.downEntries[0].workflow, "In Progress");

  const fixed = saveDefectLogRecord(
    inProgress.fleet,
    inProgress.downEntries,
    "bus-20501",
    {...inProgress.fleet[0].defects[0], state: "completed", actionTaken: "Repair verified"},
    false,
    "2026-08-19T14:00:00.000Z",
  );
  assert.equal(fixed.fleet[0].defects.length, 1);
  assert.equal(fixed.fleet[0].defects[0].state, "completed");
  assert.equal(fixed.fleet[0].down, false);
  assert.equal(fixed.fleet[0].s, "service");
  assert.equal(fixed.downEntries[0].workflow, "Completed");

  const page = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");
  assert.ok(page.includes("Real-Time Defect Log"));
  assert.ok(page.includes("+ LOG DEFECT"));
  assert.ok(page.includes("DOWN SHEET"));
  assert.ok(page.includes("AI OPERATOR"));
  assert.ok(css.includes("@media(max-width:760px)"));
  /* The log's settings live in their own modules now - the model, and the
     panel the Settings page renders - and the log reads the key they write. */
  const [model, panel] = await Promise.all([
    readFile(new URL("../src/lib/defects/defect-log-settings.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx", import.meta.url), "utf8"),
  ]);
  assert.ok(model.includes("BACKGROUND"));
  assert.ok(model.includes("PRIMARY TEXT"));
  assert.ok(model.includes("SECONDARY TEXT"));
  assert.ok(model.includes("Midnight"));
  assert.ok(model.includes("Tactical"));
  assert.ok(panel.includes("Extra Large"));
  assert.ok(model.includes("pace-defect-log-settings-v1"));
  assert.ok(page.includes("readSettings(localStorage.getItem(SETTINGS_KEY))"));
  assert.ok(css.includes("--log-page"));
  const response = await render("/defect-log");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Real-Time Defect Log/);
});

test("Defect Log counts only direct log records and returns buses to service without losing repairs", async () => {
  const logDefect={id:"log-1",category:"Engine",issue:"Misfire",details:"Cylinder 1",operability:"down",state:"open",source:"defect-log",shopNotes:"Watch after pullout"};
  const secondLogDefect={id:"log-2",category:"Electrical / Multiplex",issue:"Horn",details:"Intermittent",operability:"service",state:"open",source:"defect-log"};
  const trackerDefect={id:"tracker-1",category:"Brakes",issue:"ABS light",details:"",operability:"down",state:"open",source:"tracker"};
  const downDefect={id:"down-1",category:"Inspection",issue:"B-12",details:"",operability:"down",state:"open",source:"down-sheet"};
  const fleet=[
    {id:"bus-1",n:"17501",s:"out",l:"west-0",defects:[logDefect,secondLogDefect]},
    {id:"bus-2",n:"17502",s:"out",l:"east-0",defects:[trackerDefect,downDefect]},
  ];
  const records=defectLogRecords(fleet,[]);
  assert.deepEqual(records.map(record=>record.defect.id).sort(),["log-1","log-2"]);
  assert.equal(activeDefectLogCount(fleet),2);
  assert.equal(records.find(record=>record.defect.id==="log-1").defect.shopNotes,"Watch after pullout");

  const linked=[{id:"repair-log-1",defectId:"log-1",busId:"bus-1",workflow:"Scheduled",operationalStatus:"out",updatedAt:"old",history:[]}];
  const returned=returnDefectLogBusToService([{...fleet[0],defects:[logDefect]}],linked,"bus-1","log-1","2026-08-23T18:30:00.000Z");
  assert.equal(returned.error,null);
  assert.equal(returned.status,"defect");
  assert.equal(returned.fleet[0].s,"defect");
  assert.equal(returned.fleet[0].defects[0].operability,"service");
  assert.equal(returned.fleet[0].defects[0].state,"open");
  assert.equal(returned.downEntries[0].operationalStatus,"defect");
  assert.match(returned.downEntries[0].history[0].action,/Returned to service/);

  const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
  const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
  assert.match(page,/feed-operator/);
  assert.match(page,/inline-ds-badge/);
  assert.match(page,/BACK IN SERVICE/);
  assert.match(page,/hideDefectLogRecords\(result\.fleet/);
  assert.doesNotMatch(page,/PENDING DOWN SHEET/);
  assert.doesNotMatch(page,/mobile-log-bar/);
  assert.match(page,/UNDO DEFERRED/);
  assert.match(page,/deferredReturnedAt:now/);
  assert.doesNotMatch(page,/Enter your initials before marking/);
  assert.doesNotMatch(page,/input required maxLength=\{6\}/);
  assert.match(css,/out-of-service \.log-bus strong/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test("Defect Log groups multiple repairs per bus and streamlines phone entry", async () => {
  const bus={id:"bus-17528",n:"17528",s:"defect",l:"garage-11"};
  const records=[
    {bus,defect:{id:"d1",category:"Tech Services",issue:"Farebox",details:"",operability:"service",state:"open",source:"defect-log"},createdAt:"2026-08-24T01:00:00.000Z",updatedAt:"2026-08-24T01:00:00.000Z",onDownSheet:false},
    {bus,defect:{id:"d2",category:"Engine",issue:"Check engine light",details:"",operability:"service",state:"open",source:"defect-log"},createdAt:"2026-08-24T02:00:00.000Z",updatedAt:"2026-08-24T02:00:00.000Z",onDownSheet:false},
  ];
  const groups=groupDefectLogRecords(records);
  assert.equal(groups.length,1);
  assert.equal(groups[0].bus.n,"17528");
  assert.deepEqual(groups[0].records.map(record=>record.defect.id),["d1","d2"]);
  const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
  const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
  assert.match(page,/groupDefectLogRecords\(visible\)/);
  assert.match(page,/className="defect-count-badge">×\{group\.records\.length\}/);
  assert.match(page,/\+ ADD DEFECT/);
  /* The picker is a SHARED component now — the Down Sheet had a bare <select>
     with no way to type a number at all, and copying this across would have
     made two of them. Asserted where it lives. */
  const picker=await readFile(new URL("../src/components/shared/bus-selector.tsx",import.meta.url),"utf8");
  assert.match(picker,/className="bus-generations"/);
  assert.match(picker,/input autoFocus=\{autoFocus\} inputMode="numeric"/);
  assert.match(picker,/Choose generation first/);
  assert.match(page,/<BusSelector /,"and the Defect Log uses it rather than its own copy");
  assert.match(page,/className="save-log-middle" disabled=\{Boolean\(recentDuplicate\)\}>\{saveLabel\}/);
  assert.match(page,/className="close-log-middle" onClick=\{close\}>CLOSE/);
  assert.doesNotMatch(page,/className="log-header-save/);
  assert.ok(page.indexOf('className="save-log-middle-actions"')<page.indexOf('className="wide downsheet-check"'));
  assert.match(page,/lockPageScroll\("defect-editor-open"\)/);
  assert.match(page,/const closeEditor=\(\)=>\{const left=window\.scrollX,top=window\.scrollY/);
  assert.match(page,/window\.requestAnimationFrame\(\(\)=>\{restore\(\);window\.requestAnimationFrame\(restore\)\}\)/);
  assert.match(css,/@media\(max-width:760px\)\{\.shop-notes-column\{display:none\}/);
  assert.match(css,/\.grouped-defect-row/);
  const model=await readFile(new URL("../src/lib/defects/defect-log-settings.ts",import.meta.url),"utf8");
  const panel=await readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8");
  assert.match(model,/type LogGroupContrast="standard"\|"strong"/);
  assert.match(model,/groupContrast:"strong"/);
  assert.match(model,/saved\.groupContrast==="standard"\?"standard":"strong"/);
  assert.match(page,/data-group-contrast=\{settings\.groupContrast\}/);
  assert.match(panel,/BUS GROUP SEPARATION/);
  assert.match(css,/data-group-contrast="strong"\]\s+\.log-list\{gap:16px;padding:10px\}/);
  assert.match(css,/data-group-contrast="strong"\]\s+\.log-card-group\{[^}]*border-bottom-width:3px[^}]*border-left-width:7px/);
  assert.match(css,/@media\(max-width:760px\)\{\.defect-log-app\[data-group-contrast="strong"\][^}]*\.log-list\{gap:14px/);
  // <html> is the scrolling element here, so a rule on <body> alone stopped
  // nothing: this lock existed for months and the page still dragged 2,462px.
  assert.match(css,/html\.defect-editor-open,body\.defect-editor-open\{overflow:hidden;overscroll-behavior:none\}/);
  assert.match(css,/\.log-editor\{max-height:96vh;max-height:96dvh\}/);
  assert.match(css,/\.log-form\{flex:1;min-height:0;overscroll-behavior:contain;touch-action:pan-y/);
  assert.match(css,/@media\(max-width:760px\)\{\.log-shade\{align-items:stretch\}\.log-editor\{width:100vw;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh/);
  assert.match(css,/\.defect-log-app\{[^}]*overflow-anchor:none/);
  assert.match(css,/\.save-log-middle-actions\{[^}]*grid-template-columns:repeat\(2/);
  assert.match(css,/\.log-form,\.log-form>\*\{min-width:0\}/);
  assert.doesNotMatch(css,/\.log-header-save/);
  assert.match(css,/@supports\(height:100svh\)/);
});

test("defect log cleanup preserves active log-origin repairs and fleet state", () => {
  const activeDefect = {id:"log-ramp",category:"Doors, Ramp and Lift",issue:"Ramp will not deploy",details:"Operator report",operability:"down",state:"open",source:"defect-log"};
  const bus = {id:"bus-1",n:"17501",s:"out",l:"west-0",down:true,pendingRepair:"Ramp will not deploy",defects:[activeDefect]};
  const logRecord = {bus,defect:activeDefect,createdAt:"",updatedAt:"",onDownSheet:false};
  assert.equal(isDefectLogCleanupCandidate(logRecord,new Set(["bus-1"])), false);
  const trackerRecord = {...logRecord,defect:{...activeDefect,id:"tracker-ramp",source:"tracker"}};
  assert.equal(isDefectLogCleanupCandidate(trackerRecord,new Set(["bus-1"])), true);
  const fixedRecord = {...logRecord,defect:{...activeDefect,state:"completed"}};
  assert.equal(isDefectLogCleanupCandidate(fixedRecord,new Set()), true);
  const archived = hideDefectLogRecords([bus],[{busId:"bus-1",defectId:activeDefect.id}],"2026-08-22T12:00:00.000Z");
  assert.equal(archived[0].s,"out");
  assert.equal(archived[0].l,"west-0");
  assert.equal(archived[0].down,true);
  assert.equal(archived[0].defects[0].state,"open");
  assert.equal(archived[0].defects[0].defectLogHiddenAt,"2026-08-22T12:00:00.000Z");
});

test("changing a defect's bus number MOVES the record, and a removal never travels between buses", () => {
 // Curtis's sequence, exactly. He logged a battery fault on the wrong bus, went
 // back in, changed the bus number, and saved. The save used to COPY: it looked
 // for the id on the bus it was handed, did not find it, and appended - so the
 // original stayed put and two buses held one defect id. He then tidied the
 // leftover off the wrong bus, and because the hide walked the whole fleet by
 // id it took the good copy with it: a defect on 17532 the log would not draw,
 // could not remove, and would not let him log again.
 const t0 = "2026-09-07T22:11:00.000Z", t1 = "2026-09-07T22:19:00.000Z";
 const fleet = [
  { id: "bus-a", n: "17530", s: "shop", l: "bay-1", defects: [] },
  { id: "bus-b", n: "17532", s: "shop", l: "garage-1", defects: [] },
 ];
 const logged = saveDefectLogRecord(fleet, [], "bus-a", { id: "d1", category: "Battery, Starting and Charging", issue: "Flashing battery light", details: "", operability: "service", state: "open", source: "defect-log", reportedBy: "CJ" }, false, t0);
 assert.equal(logged.error, null);
 assert.deepEqual(logged.fleet.map(bus => (bus.defects || []).length), [1, 0]);

 // Change the bus number and save — the same call the editor makes.
 const moved = saveDefectLogRecord(logged.fleet, logged.downEntries, "bus-b", { ...logged.fleet[0].defects[0] }, false, t1);
 assert.equal(moved.error, null);
 assert.deepEqual(moved.fleet.map(bus => (bus.defects || []).map(d => d.id)), [[], ["d1"]], "the record moves; it must not be left on the bus it came from");
 assert.equal(moved.fleet[0].pendingRepair, "", "the old bus stops advertising a repair it no longer holds");
 // Where it came from is on the record, so the arrival is not a mystery.
 assert.equal(moved.fleet[1].defects[0].movedFromBusNumber, "17530");
 assert.equal(moved.fleet[1].defects[0].movedAt, t1);
 // The old bus's own status is left alone — a repair moving off it is not new
 // information about whether it can run.
 assert.equal(moved.fleet[0].s, logged.fleet[0].s);

 // And the second half: hiding a record on one bus must never reach another.
 const shared = [
  { id: "bus-a", n: "17530", s: "shop", l: "bay-1", defects: [{ id: "d1", category: "Brakes", issue: "Air leak", details: "", operability: "service", state: "open", source: "defect-log" }] },
  { id: "bus-b", n: "17532", s: "shop", l: "garage-1", defects: [{ id: "d1", category: "Brakes", issue: "Air leak", details: "", operability: "service", state: "open", source: "defect-log" }] },
 ];
 const hidden = hideDefectLogRecords(shared, [{ busId: "bus-a", defectId: "d1" }], t1);
 assert.equal(hidden[0].defects[0].defectLogHiddenAt, t1);
 assert.equal(hidden[1].defects[0].defectLogHiddenAt, undefined, "removing a record on 17530 must not hide 17532's");
 assert.equal(defectLogRecords(hidden, []).filter(r => !r.defect.defectLogHiddenAt).map(r => r.bus.n).join(), "17532");

 // Saving either copy of a pair that already went wrong collapses them to one.
 const repaired = saveDefectLogRecord(shared, [], "bus-b", { ...shared[1].defects[0] }, false, t1);
 assert.deepEqual(repaired.fleet.map(bus => (bus.defects || []).length), [0, 1]);
});

test("a search ends when somebody ends it, and never says so silently", async () => {
 const [page, css] = await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8"),
 ]);
 /* Tapping a bus used to clear a one-bus search. That was wrong in the ordinary
    case rather than the rare one: the tap that "reaches" the bus is the same tap
    that expands it IN PLACE, so the whole board came back underneath the card
    being read — worst on a single-defect bus, where the tap opens one line and
    the entire log appears beneath it. */
 assert.doesNotMatch(page, /clearSearchOnReach/, "tapping a bus must not clear the search");
 assert.match(page, /log-card-main log-group-header[\s\S]{0,200}?onClick=\{\(\)=>\{setExpandedBusIds/);
 assert.match(page, /log-focus-button[\s\S]{0,320}?onClick=\{event=>\{event\.stopPropagation\(\);setFocusedBusId\(group\.bus\.id\)\}\}/);

 // What it needed was never a smarter guess about when to stop; it was for the
 // filtered state to stop being invisible. Two ways out, both only while
 // something is typed: the tag in the field and the banner under it.
 assert.match(page, /className="clear-log-search" onClick=\{\(\)=>setSearch\(""\)\}/);
 assert.match(page, /\{search\.trim\(\)&&<div className="log-search-filtered" role="status">/);
 assert.match(page, /className="show-all-buses" onClick=\{\(\)=>setSearch\(""\)\}/);
 assert.match(css, /\.log-search-filtered\{/);
 assert.match(css, /\.show-all-buses\{min-height:44px/, "a real tap target on a phone");

 /* ...but a search that no longer describes what somebody is doing ends itself.
    Search a bus, press LOG DEFECT at the top, pick a DIFFERENT bus and save:
    the record landed correctly and was invisible behind the old search, with
    only "1 HIDDEN BY THIS SEARCH" in the counter to say so. Curtis: "my
    attention drifted elsewhere and the bus I typed in and hit SEARCH on may not
    even be the bus I'm after... the system should just clear that search."

    This does NOT contradict the rule above, which is about TAPPING a bus and
    protects a search somebody is still using. Choosing another bus says they
    are not. */
 assert.match(page, /onBusPicked=\{clearSearchIfBusIsOutside\}/, "picking another bus ends a stale bus-number search");
 assert.match(page, /clearSearchIfItHides\(draft\.busId,draft\.defect\);closeEditor\(\)/, "and so does saving onto a bus the search hides");
 /* THE TWO MOMENTS KNOW DIFFERENT THINGS, and collapsing them breaks a working
    case. At bus-pick time no repair has been chosen, so only a BUS-NUMBER
    search can be judged; testing a TEXT search there cleared "brake" the moment
    a bus was picked, before the brake defect it would have matched existed.
    Measured in a browser, not reasoned about. */
 assert.match(page, /const clearSearchIfBusIsOutside=\(busId:string\)=>\{\s*if\(!search\.trim\(\)\|\|busSearch\.kind!=="numbers"\)return;/,
  "the pick-time check judges bus-number searches only");
 assert.match(page, /const clearSearchIfItHides=\(busId:string,defect:StructuredDefect\)=>/,
  "the save-time check takes the whole record, so a text search it still matches survives");

 /* It counts what the SEARCH is hiding, not what the other filters are hiding —
    different questions, and the banner only answers the first.

    THREE STAGES SINCE THE WHEN-LOGGED DROP-DOWN: the state buttons, then when
    it was logged, then the search. Each bar is measured against the stage
    directly above it, which is what keeps every bar answering for its own
    control. The search banner therefore counts against the WINDOWED board, not
    the whole log — "what did my typing hide from what I was looking at" — and
    `search.trim()` still gates it, so an unsearched board shows no banner. */
 assert.match(page, /const stateOnly=records\.filter\(matchesStateFilter\)/);
 assert.match(page, /const unsearched=stateOnly\.filter\(matchesFeedWindow\)/);
 assert.match(page, /const visible=unsearched\.filter\(matchesSearch\)/);
 assert.match(page, /const hiddenBySearch=search\.trim\(\)\?groupDefectLogRecords\(unsearched\)\.length-visibleGroups\.length:0/);
 assert.match(page, /const hiddenByFeedWindow=feedWindowLimit===null\?0:groupDefectLogRecords\(stateOnly\)\.length-groupDefectLogRecords\(unsearched\)\.length/,
  "the window's own bar is measured against the state filter's result, not the whole board");
});

test("a repair already on the Down Sheet follows its record when the bus number changes", () => {
 const t0 = "2026-09-07T22:11:00.000Z", t1 = "2026-09-07T22:19:00.000Z";
 const fleet = [
  { id: "bus-a", n: "17530", s: "shop", l: "bay-1", defects: [] },
  { id: "bus-b", n: "17532", s: "shop", l: "garage-1", defects: [] },
 ];
 const defect = { id: "d1", category: "Brakes", issue: "Air leak", details: "", operability: "down", state: "open", source: "defect-log", reportedBy: "CJ" };
 const onSheet = saveDefectLogRecord(fleet, [], "bus-a", defect, true, t0);
 assert.equal(onSheet.downEntries.length, 1);
 assert.equal(onSheet.downEntries[0].busId, "bus-a");

 const moved = saveDefectLogRecord(onSheet.fleet, onSheet.downEntries, "bus-b", { ...onSheet.fleet[0].defects[0] }, true, t1);
 assert.equal(moved.downEntries.length, 1, "moving a repair must not open a second sheet entry for it");
 // The update branch renamed the entry's bus and left its id behind, so a moved
 // repair showed the new number on a row still filed under the bus it left.
 assert.equal(moved.downEntries[0].busNumber, "17532");
 assert.equal(moved.downEntries[0].busId, "bus-b");
 // The DS badge is read off the sheet, never decided by the bus. The entry went
 // with the repair, so the bus it left is no longer on the sheet.
 assert.equal(moved.fleet[0].down, false, "the old bus must not keep a DS flag for work now filed under another bus");
 assert.equal(moved.fleet[1].down, true);
});

test("main garage always normalizes destination status from every facility source", () => {
  const defect = [{id:"d",category:"Brakes",issue:"Air brake fault",details:"",operability:"down",state:"open"}];
  const fleet = [
    {id:"brake",n:"17501",l:"brake-0",s:"out",parkedAt:"old",defects:defect,pendingRepair:defectSummary(defect)},
    {id:"tow",n:"17502",l:"tow-0",s:"out",parkedAt:"old",defects:[],pendingRepair:""},
    {id:"east",n:"17503",l:"east-1",s:"out",parkedAt:"old",defects:defect,pendingRepair:defectSummary(defect)},
    {id:"west",n:"17504",l:"west-1",s:"out",parkedAt:"old",defects:[],pendingRepair:""},
    {id:"service",n:"17505",l:"service-0",s:"out",parkedAt:"old",defects:defect,pendingRepair:defectSummary(defect)},
    {id:"pit",n:"17506",l:"pit-0",s:"out",parkedAt:"old",defects:[],pendingRepair:""},
  ];
  const expected = {brake:"defect",tow:"service",east:"defect",west:"service",service:"defect",pit:"service"};
  Object.keys(expected).forEach((id,index) => {
    const moved = moveOrSwapBuses(fleet,id,"garage-"+index,"now");
    assert.equal(moved.find(bus => bus.id === id).s,expected[id],id);
  });
  const areas=[{name:"MAIN GARAGE (BAYS 1-10)",slots:Array.from({length:6},(_,index)=>"garage-"+index)}];
  const batch=applyOperatorBatch(fleet,fleet.map(bus=>({busId:bus.id,areaName:"MAIN GARAGE (BAYS 1-10)"})),areas,"now");
  assert.equal(batch.error,undefined);
  assert.deepEqual(Object.fromEntries(batch.fleet.map(bus=>[bus.id,bus.s])),expected);
});

test("Version 85 stores Shop Notes and persists editable interface wording and styles", async () => {
  const downDisplay = normalizeDownSheetDisplay({labels:{reasonDown:"REPAIR REASON"},styles:{reasonCategory:{color:"#111111",fontSize:16}}});
  assert.equal(downDisplay.labels.reasonDown,"REPAIR REASON");
  assert.equal(downDisplay.styles.reasonCategory.fontSize,16);
  assert.equal(normalizeDownSheetDisplay({styles:{reasonCategory:{color:"invalid",fontSize:99}}}).styles.reasonCategory.color,DEFAULT_DOWN_SHEET_DISPLAY.styles.reasonCategory.color);
  assert.equal(normalizeDownSheetDisplay({styles:{reasonCategory:{fontSize:99}}}).styles.reasonCategory.fontSize,32);
  const logDisplay = normalizeDefectLogDisplay({labels:{shopNotes:"SHIFT NOTES"},styles:{shopNotes:{color:"#123456",fontSize:12}}});
  assert.equal(logDisplay.labels.shopNotes,"SHIFT NOTES");
  assert.deepEqual(logDisplay.styles.shopNotes,{color:"#123456",fontSize:12});
  assert.equal(normalizeDefectLogDisplay(null).labels.pageTitle,DEFAULT_DEFECT_LOG_DISPLAY.labels.pageTitle);

  /* LIVE REPAIR FEED is read on a phone at arm's length across a shop floor and
     shipped at 12px. Raising the default alone would reach nobody: the whole
     Settings blob is written whenever anything in it is saved, so any device
     that has ever opened Settings is carrying 12 as if it were a choice.

     A stored value equal to the SUPERSEDED default is treated as no choice.
     Anything else is a choice and is left alone - checked in both directions,
     because a fallback that swallowed a real setting would be worse than the
     stale default it replaces. */
  assert.equal(DEFAULT_DEFECT_LOG_DISPLAY.styles.feedTitle.fontSize,17,"the shipped default");
  assert.equal(normalizeDefectLogDisplay(null).styles.feedTitle.fontSize,17,"nothing stored");
  assert.equal(normalizeDefectLogDisplay({styles:{feedTitle:{fontSize:12}}}).styles.feedTitle.fontSize,17,"a device carrying only the old default gets the new one");
  for(const chosen of [9,11,13,24])
   assert.equal(normalizeDefectLogDisplay({styles:{feedTitle:{fontSize:chosen}}}).styles.feedTitle.fontSize,chosen,chosen+"px is a choice and must survive");
  /* And it applies to that one field, not as a general mechanism: 12 is a
     perfectly ordinary stored size everywhere else. */
  assert.equal(normalizeDefectLogDisplay({styles:{shopNotes:{fontSize:12}}}).styles.shopNotes.fontSize,12);
  assert.equal(normalizeDefectLogDisplay({styles:{repairDetails:{fontSize:12}}}).styles.repairDetails.fontSize,12);

  const defect={id:"shop-note-1",category:"Engine",issue:"Misfire",details:"Cylinder 1",operability:"down",state:"open",source:"defect-log",shopNotes:"Bay 12 follow-up"};
  const fleet=[{id:"bus-1",n:"20501",s:"out",l:"west-0",defects:[]}];
  const result=saveDefectLogRecord(fleet,[],"bus-1",defect,false,"2026-08-23T18:00:00.000Z");
  assert.equal(result.error,null);
  assert.equal(result.fleet[0].defects[0].shopNotes,"Bay 12 follow-up");

  const [downPage,downSettings,downCss,logPage,logCss,catalog]=await Promise.all([
    readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/settings/_components/down-sheet-settings.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
    readFile(new URL("../src/lib/defects/repair-catalog.ts",import.meta.url),"utf8"),
  ]);
  assert.match(downPage,/display:displaySettings/);
  assert.match(downSettings,/WORDING/);
  assert.match(downSettings,/TEXT STYLE/);
  assert.match(downCss,/--down-reason-category-size/);
  assert.match(logPage,/ShopNotesEditor/);
  assert.match(logPage,/shopNotes:value/);
  assert.match(logCss,/\.shop-notes-column/);
  assert.match(logCss,/\.log-wording-grid/);
  assert.match(catalog,/shopNotes\?:string/);
});

test("Bus Controls and Cooling System expose field-ready defect choices", async () => {
  const [catalog,page]=await Promise.all([
    readFile(new URL("../src/lib/defects/repair-catalog.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  ]);
  assert.match(catalog,/"Bus Controls"/);
  assert.match(catalog,/"Fuel gauge INOP \/ false reading"/);
  assert.match(catalog,/"Front instrument dash damaged \/ replacement"/);
  assert.match(catalog,/"Driver seat belt"/);
  assert.match(catalog,/"Driver seat leaking air"/);
  assert.match(catalog,/"Horn \/ seat alarm will not stop"/);
  assert.match(catalog,/"Bike rack - bent \/ replacement"/);
  assert.match(catalog,/"Bike rack - arms \/ pivot adjustment"/);
  assert.match(catalog,/"Radiator fan\(s\) out"/);
  assert.match(catalog,/"Radiator fan diagnostic light"/);
  assert.match(catalog,/"Radiator fans constantly running on high"/);
  assert.match(catalog,/"Radiator leak"/);
  /* The fan count is no longer a category test written into the form. It is one
     row of the catalog's count table, which is the only reason air bags could
     be added without a second copy of the same code. */
  assert.match(page,/countField=defectCountField\(value\.defect\.category,value\.quickIssue\)/);
  assert.match(page,/Array\.from\(\{length:countField\.max\}/);
  assert.match(catalog,/"Radiator fan\(s\) out":\{label:"FANS OUT",unit:"fans",max:8,required:true/);
  assert.match(page,/save-log-middle[\s\S]*downsheet-check/);
  assert.match(page,/advanced-defect-details/);
});

test("Defect Log timestamps reports and blocks only recent identical unresolved defects", () => {
  const existing={id:"old-defect",category:"Engine",issue:"Loss of power",details:"First report",operability:"service",state:"open",source:"defect-log",createdAt:"2026-08-22T12:00:00.000Z",updatedAt:"2026-08-22T12:00:00.000Z"};
  const bus={id:"bus-1",n:"17501",s:"defect",l:"road-1",defects:[existing]};
  const incoming={id:"new-defect",category:"Engine",issue:"Loss of power",details:"Second report",operability:"service",state:"open",source:"defect-log"};
  /* 120 hours, logged 2026-08-22T12:00Z, so the window shuts at 2026-08-27T12:00Z.
     It used to be 48, and the live board showed that too short: two of the 25
     duplicates found on it were typed into this form by hand after the two-day
     window had already closed. */
  assert.equal(RECENT_DUPLICATE_WINDOW_HOURS,120);
  assert.equal(RECENT_DUPLICATE_WINDOW_LABEL,"5 days");
  // Still blocked well past the old two-day line.
  assert.equal(recentDefectDuplicate(bus,incoming,"2026-08-24T12:00:00.000Z")?.id,"old-defect",
    "the day the old 48-hour window expired must now still be caught");
  assert.equal(recentDefectDuplicate(bus,incoming,"2026-08-27T11:59:00.000Z")?.id,"old-defect");
  const blocked=saveDefectLogRecord([bus],[],"bus-1",incoming,false,"2026-08-27T11:59:00.000Z");
  assert.equal(blocked.error,"recent-duplicate");
  assert.equal(blocked.fleet[0].defects.length,1);
  assert.equal(recentDefectDuplicate(bus,incoming,"2026-08-27T12:00:00.000Z"),null);
  const allowed=saveDefectLogRecord([bus],[],"bus-1",incoming,false,"2026-08-27T12:00:00.000Z");
  assert.equal(allowed.error,null);
  assert.equal(allowed.fleet[0].defects.length,2);
  assert.equal(allowed.fleet[0].defects.find(defect=>defect.id==="new-defect").createdAt,"2026-08-27T12:00:00.000Z");
  const completedBus={...bus,defects:[{...existing,state:"completed"}]};
  assert.equal(recentDefectDuplicate(completedBus,incoming,"2026-08-22T13:00:00.000Z"),null);
  const manual=saveDefectLogRecord([bus],[],"bus-1",{...incoming,id:"manual-defect",issue:"Manual entry"},false,"2026-08-22T13:00:00.000Z");
  assert.equal(manual.error,null);
});

test("Bus Controls leads with both turn-signal defects",()=>{
 const controls=REPAIR_OPTIONS["Operator/Driver Controls"];
 assert.ok(controls.includes("Operating Controls - Turn signals (steering column)"));
 assert.ok(controls.includes("Operating Controls - Turn signals (floor panel)"));
 assert.equal(new Set(controls).size,controls.length);
 assert.ok(controls.includes("Operating Controls - Horn"));
 assert.ok(controls.includes("Operating Controls - Other bus control defect"));
 assert.equal(defectLabel({category:"Operator/Driver Controls",issue:"Operating Controls - Turn signals (floor panel)",details:""}).includes("Turn signals (floor panel)"),true);
});

test("a road call is a dated event on the bus that ages off the board on its own",async()=>{
 const {ALL_WORK_STATES,WORK_STATES,FIXED_REPAIR_WORK_STATES,WORK_STATE_KEYS,ROAD_CALL_KEY,PARTS_ON_ORDER_KEY,defectWorkStates,hasWorkState,normalizeWorkStates,setDefectWorkState}=await import("../src/lib/defects/repair-catalog.ts");
 const {ROAD_CALL_WINDOW_DAYS,ROAD_CALL_AREA,ROAD_CALL_UNDO_SECONDS,appendRoadCall,applyRoadCall,clearRoadCall,hasRecentRoadCall,latestRoadCall,normalizeRoadCalls,recentRoadCalls,roadCallBacklog,roadCallCount,roadCallNote,withdrawableRoadCall}=await import("../src/lib/fleet/road-calls.ts");
 const {moveOrSwapBuses:quickMove}=await import("../src/lib/fleet/smart-status.ts");
 const {saveDefectLogRecord}=await import("../src/lib/defects/defect-log-sync.ts");
 const {QUICK_FILTERS,quickFilterBusIds,quickFilterDefects,quickFilterFallbackLabel}=await import("../src/lib/defects/quick-filters.ts");

 /* PARTS ON ORDER left the Defect Log's boxes for Fixed Repairs, and ROAD CALL
    stands where it stood. Six on the form, three across, so the bottom row is
    still full and no box sits alone. */
 assert.deepEqual(WORK_STATES.map(state=>state.key),["inspected","diagnosed","road-call","test-driven","brake-test","operator-reported"]);
 assert.equal(WORK_STATES.length%3,0,"still a full bottom row");
 assert.deepEqual(FIXED_REPAIR_WORK_STATES.map(state=>state.key),["parts-on-order"]);
 assert.equal(WORK_STATES.some(state=>state.key===PARTS_ON_ORDER_KEY),false,"off the Defect Log's form");

 /* THE THING THAT WOULD HAVE BEEN SILENT DATA LOSS. Read-time normalization
    drops any key it does not know, so removing parts-on-order from the form's
    list while the normalizer read that same list would have erased the tick
    from every record already carrying it. The vocabulary is the longer list. */
 assert.ok(WORK_STATE_KEYS.includes(PARTS_ON_ORDER_KEY),"the stored key stays legal");
 assert.deepEqual(WORK_STATE_KEYS,ALL_WORK_STATES.map(state=>state.key));
 const stored=normalizeWorkStates({"parts-on-order":{by:"CJ",at:"2026-09-01T10:00:00.000Z"},inspected:true});
 assert.equal(stored["parts-on-order"].by,"CJ","a record ticked on the old form still reads");
 assert.deepEqual(defectWorkStates({workStates:stored}).map(state=>state.key),["inspected","parts-on-order"],"and still shows on the record");

 /* The event model. Append-only: a second breakdown is a second event, never
    an overwrite, because two in a week is the finding. */
 const day=(n)=>new Date(Date.UTC(2026,8,n,12)).toISOString();
 const now=day(10);
 let calls=appendRoadCall(undefined,{id:"rc1",at:day(9)});
 calls=appendRoadCall(calls,{id:"rc2",at:day(8)});
 calls=appendRoadCall(calls,{id:"rc3",at:day(1)});
 assert.equal(roadCallCount(calls),3,"the background counter is every road call ever");
 assert.equal(latestRoadCall(calls).id,"rc1","newest first");
 assert.deepEqual(recentRoadCalls(calls,now).map(event=>event.id),["rc1","rc2"],ROAD_CALL_WINDOW_DAYS+" days back, inclusive");
 assert.deepEqual(roadCallBacklog(calls,now).map(event=>event.id),["rc3"],"older ones go to the backlog");
 assert.equal(recentRoadCalls(calls,now).length+roadCallBacklog(calls,now).length,roadCallCount(calls),
  "the window plus the backlog is always the whole history — nothing is deleted to make a bus fall off");

 /* The edge, exactly. Seven days old still counts; a moment past does not. */
 const edge=new Date(Date.parse(now)-ROAD_CALL_WINDOW_DAYS*24*60*60*1000).toISOString();
 assert.equal(hasRecentRoadCall([{id:"edge",at:edge}],now),true,"exactly seven days still shows");
 assert.equal(hasRecentRoadCall([{id:"past",at:new Date(Date.parse(edge)-1000).toISOString()}],now),false,"a second past it does not");
 assert.equal(hasRecentRoadCall(undefined,now),false);
 assert.deepEqual(normalizeRoadCalls([{id:"x"},{at:"nonsense"},null,"no"]),[],"an entry with no usable date is not a road call");
 assert.equal(normalizeRoadCalls([{id:"keep",at:day(9),futureField:"kept"}])[0].futureField,"kept","fields a later release adds survive a read");

 /* What the card says: a date for one, the count leading for more than one. */
 const stamp=()=>"STAMP";
 assert.equal(roadCallNote([{id:"a",at:day(9)}],now,stamp),"ROAD CALL STAMP");
 assert.equal(roadCallNote(calls,now,stamp),"ROAD CALL ×2 · LATEST STAMP","two this week reads as two");
 assert.equal(roadCallNote([{id:"old",at:day(1)}],now,stamp),"","a backlog road call says nothing on the card");
 assert.equal(roadCallNote(undefined,now,stamp),"");

 /* Ticking it does three things at once, and doing one without the others is
    how the board starts disagreeing with itself. */
 const fleet=[{id:"bus-1",n:"17505",s:"defect",l:"garage-4",defects:[]},{id:"bus-2",n:"17506",s:"service",l:"garage-5",defects:[]}];
 const applied=applyRoadCall(fleet,"bus-1",{id:"rc",at:now},undefined,now);
 const moved=applied.fleet.find(bus=>bus.id==="bus-1");
 assert.equal(moved.roadcall,true,"the map's own flag goes on, so the orange badge appears where the shop already looks");
 assert.equal(roadCallCount(moved.roadCalls),1);
 assert.ok(moved.l.startsWith("road-"),"and the bus is parked on the road, because that is where it is: "+moved.l);
 assert.equal(applied.moved,true);
 assert.equal(applied.fleet.find(bus=>bus.id==="bus-2").l,"garage-5","no other bus is touched");
 assert.equal(ROAD_CALL_AREA,"IN SERVICE / ON ROAD");
 /* A full road lot must not lose the record. */
 const full=applyRoadCall(fleet,"bus-1",{id:"rc",at:now},{"IN SERVICE / ON ROAD":[]},now);
 assert.equal(full.moved,false);
 assert.equal(roadCallCount(full.fleet.find(bus=>bus.id==="bus-1").roadCalls),1,"the breakdown is still recorded when there is nowhere to park");
 assert.equal(full.fleet.find(bus=>bus.id==="bus-1").roadcall,true);

 /* Through the real save path: ticking it on a defect records the event, and
    re-saving that same defect does NOT record a second one. Without the
    transition check the counter would count form opens, not breakdowns. */
 const defect={id:"d1",category:"Engine",issue:"Check engine and stop engine light",details:"died on route",operability:"down",state:"open",reportedBy:"CJ"};
 const first=saveDefectLogRecord(fleet,[],"bus-1",setDefectWorkState(defect,ROAD_CALL_KEY,true,now,"CJ"),false,now);
 assert.equal(first.error,null);
 const afterFirst=first.fleet.find(bus=>bus.id==="bus-1");
 assert.equal(roadCallCount(afterFirst.roadCalls),1,"ticking it records the breakdown");
 assert.equal(afterFirst.roadcall,true);
 assert.ok(afterFirst.l.startsWith("road-"),"and parks it on the road");
 assert.equal(afterFirst.roadCalls[0].by,"CJ","who ticked it");
 assert.equal(afterFirst.roadCalls[0].defectId,"d1","and which fault it was");
 const again=saveDefectLogRecord(first.fleet,[],"bus-1",{...afterFirst.defects[0],shopNotes:"waiting on the tow"},false,day(11));
 assert.equal(roadCallCount(again.fleet.find(bus=>bus.id==="bus-1").roadCalls),1,
  "re-saving a repair that already road-called must not record a second breakdown");
 /* A SECOND breakdown, on a second fault, is a second event. This is the
    ordinary way a bus road-calls twice in a week. */
 const other={id:"d2",category:"Brakes",issue:"Other brake repair",details:"air loss",operability:"down",state:"open",reportedBy:"CJ"};
 const twice=saveDefectLogRecord(again.fleet,[],"bus-1",setDefectWorkState(other,ROAD_CALL_KEY,true,day(12),"CJ"),false,day(12));
 assert.equal(roadCallCount(twice.fleet.find(bus=>bus.id==="bus-1").roadCalls),2,"a second fault that road-called is a second event");
 assert.match(roadCallNote(twice.fleet.find(bus=>bus.id==="bus-1").roadCalls,day(12),stamp),/^ROAD CALL ×2 /,"and the card says two");

 /* UNTICKING THE ONLY TICKED BOX HAD TO STICK, and did not.

    setDefectWorkState deletes the workStates KEY when the last tick goes, to
    keep stored records clean - so the spread that merges an edit over the
    stored record had nothing to override with, and the box came back on the
    next read. It bit every one of the six boxes, not just this one; it matters
    most here because ticking ROAD CALL moves a bus and writes a permanent
    record, so a mis-tick has to be reversible. */
 const only=setDefectWorkState({...defect,id:"d3"},ROAD_CALL_KEY,true,day(12),"CJ");
 const ticked=saveDefectLogRecord(fleet,[],"bus-1",only,false,day(12));
 const storedDefect=ticked.fleet.find(bus=>bus.id==="bus-1").defects.find(item=>item.id==="d3");
 assert.equal(hasWorkState(storedDefect,ROAD_CALL_KEY),true);
 const undone=saveDefectLogRecord(ticked.fleet,[],"bus-1",setDefectWorkState(storedDefect,ROAD_CALL_KEY,false,day(13),"CJ"),false,day(13));
 assert.equal(hasWorkState(undone.fleet.find(bus=>bus.id==="bus-1").defects.find(item=>item.id==="d3"),ROAD_CALL_KEY),false,
  "unticking the only ticked box must stick");
 /* The breakdown itself is NOT unwritten by unticking, because it happened.
    UNDO LAST on the Defect Log is the way back from a genuine mis-tick: it
    restores the whole fleet, and road calls live on the bus record. */
 assert.equal(roadCallCount(undone.fleet.find(bus=>bus.id==="bus-1").roadCalls),1,"the event is history, not a checkbox");

 /* The quick filter: joins on the road call, leaves on its own at seven days. */
 assert.ok(QUICK_FILTERS.some(filter=>filter.key==="road-call"),"there is a road-call filter");
 assert.match(QUICK_FILTERS.find(filter=>filter.key==="road-call").label,new RegExp("Last "+ROAD_CALL_WINDOW_DAYS+" Days"));
 assert.match(quickFilterFallbackLabel("road-call"),new RegExp("last "+ROAD_CALL_WINDOW_DAYS+" days"));
 const board=[
  {id:"fresh",n:"1",defects:[],roadCalls:[{id:"a",at:day(9)}]},
  {id:"aged",n:"2",defects:[],roadCalls:[{id:"b",at:day(1)}]},
  {id:"clean",n:"3",defects:[]},
 ];
 assert.deepEqual(quickFilterBusIds(board,"road-call",now),["fresh"],"only this week's breakdowns");
 assert.deepEqual(quickFilterBusIds(board,"road-call",day(17)),[],"and the list empties itself as they age out");
 /* The same bus, asked the week its road call happened rather than a week
    later. Deliberately not asked against the whole board: "fresh" is stamped
    later than this, and a road call dated ahead of the asking time stays
    visible on purpose - a device with a fast clock must not drop a breakdown. */
 assert.deepEqual(quickFilterBusIds([board[1]],"road-call",day(2)),["aged"],"a bus is on the list the week it happened");
 assert.deepEqual(quickFilterBusIds([board[1]],"road-call",day(9)),[],"and off it a week later");
 /* The bus's own history decides the list, not its defects: a road call
    outlives the repair it was ticked on, so merging that repair away must not
    take this week's breakdown off the board. */
 assert.deepEqual(quickFilterBusIds([{id:"kept",n:"9",defects:[],roadCalls:[{id:"c",at:day(9)}]}],"road-call",now),["kept"]);
 /* And the drawer still names the fault, fixed or not. */
 const roadCalled=setDefectWorkState({...defect,state:"completed"},ROAD_CALL_KEY,true,day(9),"CJ");
 assert.deepEqual(quickFilterDefects({id:"b",defects:[roadCalled]},"road-call",now).map(item=>item.id),["d1"],
  "a bus fixed on Wednesday still broke down on Tuesday");
 assert.deepEqual(quickFilterDefects({id:"b",defects:[roadCalled]},"road-call",day(20)).map(item=>item.id),[],"until it ages out");

 /* THE ONE-MINUTE UNDO WINDOW.

    A tick is a permanent record of a breakdown - it does not come off because
    somebody changed their mind an hour later, or the counter could be quietly
    tidied. But a wrong tap is a wrong tap and the person knows within seconds,
    so a tick taken back inside the minute is withdrawn whole: the event, and
    the move it caused. */
 assert.equal(ROAD_CALL_UNDO_SECONDS,60);
 const parked=[{id:"bus-9",n:"17599",s:"defect",l:"garage-7",defects:[]}];
 const secondsLater=(seconds)=>new Date(Date.parse(now)+seconds*1000).toISOString();
 const ticked9=applyRoadCall(parked,"bus-9",{id:"rc-9",at:now},undefined,now);
 assert.ok(ticked9.fleet[0].l.startsWith("road-"),"parked on the road by the tick");
 assert.equal(ticked9.fleet[0].roadCalls[0].from,"garage-7","the event remembers where the bus came from");

 const quick=clearRoadCall(ticked9.fleet,"bus-9",secondsLater(30));
 assert.equal(quick.withdrawn,true,"30 seconds later it never happened");
 assert.equal(roadCallCount(quick.fleet[0].roadCalls),0,"the event is withdrawn");
 assert.equal(quick.fleet[0].roadcall,false,"the flag comes off");
 assert.equal(quick.fleet[0].l,"garage-7","and the bus goes back where it came from");
 assert.equal(quick.restored,"garage-7");

 const late=clearRoadCall(ticked9.fleet,"bus-9",secondsLater(61));
 assert.equal(late.withdrawn,false,"a second past the minute, the breakdown stands");
 assert.equal(roadCallCount(late.fleet[0].roadCalls),1,"the record stays");
 assert.equal(late.fleet[0].roadcall,false,"but the flag still comes off, because the bus is not out on one now");
 assert.ok(late.fleet[0].l.startsWith("road-"),"and it is left where it was put");
 assert.equal(Boolean(withdrawableRoadCall(ticked9.fleet[0].roadCalls,secondsLater(59))),true,"59 seconds is inside");
 assert.equal(Boolean(withdrawableRoadCall(ticked9.fleet[0].roadCalls,secondsLater(60))),false,"60 exactly is outside");

 /* An undo never fights a person. If somebody moved the bus themselves, or
    another bus took the old space, the withdrawal still happens but the
    location is left alone. */
 const movedOn=quickMove(ticked9.fleet,"bus-9","bay-3");
 const notFought=clearRoadCall(movedOn,"bus-9",secondsLater(10));
 assert.equal(notFought.withdrawn,true,"the event is still withdrawn");
 assert.equal(notFought.fleet.find(bus=>bus.id==="bus-9").l,"bay-3","but a bus somebody has moved is left where they put it");
 const occupied=[...ticked9.fleet,{id:"squatter",n:"17600",s:"service",l:"garage-7",defects:[]}];
 const blocked=clearRoadCall(occupied,"bus-9",secondsLater(10));
 assert.equal(blocked.withdrawn,true);
 assert.ok(blocked.fleet.find(bus=>bus.id==="bus-9").l.startsWith("road-"),"and it does not evict whoever took the space");
 assert.equal(blocked.fleet.find(bus=>bus.id==="squatter").l,"garage-7");

 /* Through the Defect Log's save path, both directions. */
 const mistake=saveDefectLogRecord(parked,[],"bus-9",setDefectWorkState({...defect,id:"d9"},ROAD_CALL_KEY,true,now,"CJ"),false,now);
 assert.equal(roadCallCount(mistake.fleet[0].roadCalls),1);
 const takenBack=saveDefectLogRecord(mistake.fleet,[],"bus-9",
  setDefectWorkState(mistake.fleet[0].defects.find(item=>item.id==="d9"),ROAD_CALL_KEY,false,secondsLater(20),"CJ"),false,secondsLater(20));
 assert.equal(roadCallCount(takenBack.fleet[0].roadCalls),0,"unticking within the minute withdraws it through the real save path");
 assert.equal(takenBack.fleet[0].l,"garage-7","and puts the bus back");

 /* THE MAP'S OWN CHECKBOX, which now counts too. Both directions go through
    the same two functions the Defect Log uses, so the two can never disagree. */
 const mapPageSource=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.match(mapPageSource,/function applyRoadCallEdit\(fleet:B\[\],previous:B\|undefined,saved:B\)/);
 assert.match(mapPageSource,/if\(!saved\.roadcall\)return clearRoadCall\(fleet,saved\.id,now\)\.fleet;/);
 assert.match(mapPageSource,/applyRoadCall\(fleet,saved\.id,\{id:"road-call-map-"\+saved\.id\+"-"\+now,at:now\},undefined,now,\{move:saved\.l===previous\.l\}\)/);
 assert.match(mapPageSource,/setBuses\(current=>applyRoadCallEdit\(current\.map\(bus=>bus\.id===savedBus\.id\?savedBus:bus\),previous,savedBus\)\)/,
  "wired into the map's save, not a second copy of the rule");
 /* Ticked on the map with no location change in the same save: it parks, like
    the Defect Log's box. */
 const fromMap=applyRoadCall(parked,"bus-9",{id:"rc-map",at:now},undefined,now,{move:true});
 assert.equal(roadCallCount(fromMap.fleet[0].roadCalls),1,"a road call ticked on the map counts toward the number");
 assert.equal(fromMap.fleet[0].roadcall,true);
 /* And with a location chosen in the same save, the choice wins. */
 const chosen=applyRoadCall([{...parked[0],l:"bay-5"}],"bus-9",{id:"rc-map2",at:now},undefined,now,{move:false});
 assert.equal(roadCallCount(chosen.fleet[0].roadCalls),1,"still counts");
 assert.equal(chosen.fleet[0].roadcall,true,"still flags");
 assert.equal(chosen.fleet[0].l,"bay-5","but a space somebody just chose is not overridden");
 assert.equal(chosen.fleet[0].roadCalls[0].from,undefined,"and nothing was moved, so there is nowhere to put back");

 /* The card. Under LATEST, on its own row, in the DS badge's purple - both
    answer "what else do I need to know about this bus". */
 const [page,css,fixedPage]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
 ]);
 assert.match(page,/roadCall=roadCallNote\(group\.bus\.roadCalls,undefined,timeLabel\)/,"formatted the same way as the LATEST stamp beside it");
 assert.ok(page.indexOf("LATEST {timeLabel(group.updatedAt)}")<page.indexOf('className="road-call-note"'),"the note renders after the LATEST line");
 assert.match(css,/grid-template-areas:"badges state status" "time time view" "roadcall roadcall roadcall"/,"its own row under LATEST");
 assert.match(css,/\.road-call-note\{grid-area:roadcall;justify-self:start/);
 assert.match(css,/\.road-call-note\{[^}]*background:var\(--downsheet-badge,#7c3aed\)/,"the DS badge's purple, not a new colour");

 /* PARTS ON ORDER on Fixed Repairs, stamped like every other work state. */
 assert.match(fixedPage,/const PARTS_ON_ORDER_LABEL=FIXED_REPAIR_WORK_STATES\[0\]\.label/,"the label comes from the catalog, so it cannot drift");
 assert.match(fixedPage,/partsOnOrder:hasWorkState\(record\.defect,PARTS_ON_ORDER_KEY\)/,"an existing tick shows when the record is opened");
 assert.match(fixedPage,/setDefectWorkState\(savedFields\(defect\),PARTS_ON_ORDER_KEY,draft\.partsOnOrder,now,draft\.completedBy\.trim\(\)\.toUpperCase\(\)\)/);
 assert.equal(/work-state-picker/.test(fixedPage),false,"only the one state moved, not the whole picker");
});

test("a technical service bulletin carries what the fleet knows, beside the note",async()=>{
 const { defectTsb, defectNote } = await import("../src/lib/defects/repair-catalog.ts");
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");

 /* A bulletin is not the note. The note says what to do in the next five
    minutes; the bulletin says what this fleet has learned about the repair and
    stays true long after the bus in front of you is fixed. Both are shown. */
 for(const issue of ["Check engine light","Stop engine light","Check engine and stop engine light"]){
  const tsb=defectTsb("Engine",issue);
  assert.ok(tsb,issue+" carries a bulletin");
  assert.match(tsb,/coolant LEVEL sensor is not the coolant temp sensor/i,
   "the whole point is telling the two sensors apart");
  assert.match(tsb,/highest point of failure/i);
  assert.match(tsb,/unplugged/i,"a bypassed shutdown has to be said out loud");
 }
 // Silent everywhere it has nothing to say, rather than showing an empty box.
 assert.equal(defectTsb("Engine","Rear main seal"),"");
 assert.equal(defectTsb("Brakes","Parking brake"),"");
 assert.equal(defectTsb("",""),"");
 assert.equal(defectTsb(undefined,null),"");

 /* Read through the same migration the rest of the catalog uses, so a bulletin
    written today still reaches a record logged under an older category name. */
 assert.equal(defectTsb("Air System","Air compressor"),defectTsb("Pneumatic System","Air compressor"));

 // It renders directly under the note, and it is its own element - folding the
 // two together would bury one behind the other.
 assert.ok(page.indexOf('className="defect-note"')<page.indexOf('className="defect-tsb"'),
  "the bulletin sits under the note");
 assert.match(page,/<b>TSB — TECHNICAL SERVICE BULLETIN<\/b>/);
 // Same size and shape as the note, different colour, so neither outranks the
 // other and the two are told apart without reading either heading.
 assert.match(css,/\.defect-tsb\{[^}]*font-size:9px/);
 assert.match(css,/\.defect-note\{[^}]*font-size:9px/);
 assert.match(css,/\.defect-tsb\{[^}]*background:#f3ede1/);
 assert.notEqual(/\.defect-tsb\{[^}]*background:#f3ede1/.test(css),
  /\.defect-note\{[^}]*background:#f3ede1/.test(css),"the two do not share a colour");
 // The note it sits beside is unaffected.
 assert.match(defectNote("A/C and HVAC","A/C compressor pulley misaligned"),/straight edge/i);
});

test("a repair records how far it got, and what was found travels with it",async()=>{
 const base={id:"d1",category:"Engine",issue:"Check engine light",details:"",operability:"service",state:"open"};

 /* The original three warned against a fourth, because a fourth invites two
    mechanics to tick different boxes for the same job. Test driven and brake
    test were added anyway, and the warning does not bite: it was about
    OVERLAP, and unlike inspected-vs-diagnosed these are discrete physical
    acts rather than judgements about how far the thinking has got. */
 /* Order is layout: the picker is a three-column grid, so the sixth key is the
    bottom-right box. Operator-reported goes last because it is where the report
    came from, not work the shop did. PARTS ON ORDER has since moved to Fixed
    Repairs and ROAD CALL stands in its place, third; the road-call test covers
    that move and the fact that the stored key stays readable. */
 assert.deepEqual(WORK_STATES.map(state=>state.key),["inspected","diagnosed","road-call","test-driven","brake-test","operator-reported"]);
 assert.equal(WORK_STATES.length%3,0,"a full bottom row, so no box sits alone");

 /* MORE THAN ONE IS THE NORMAL CASE. An operator reports a fault, the shop
    inspects it, then road tests it - all three are true of the same repair and
    none rules out another. workStates is a record keyed per state rather than
    one chosen value, so several at once survive a read. */
 const together=normalizeDefects([{id:"d1",category:"Engine",issue:"Check engine light",details:"",
  operability:"service",state:"open",
  workStates:{"operator-reported":{by:"AR"},inspected:{by:"AR"},"test-driven":{by:"AR"}}}]);
 assert.deepEqual(Object.keys(together[0].workStates).sort(),
  ["inspected","operator-reported","test-driven"],"three at once survive a read");

 // ticking stamps who and when
 let defect=setDefectWorkState(base,"diagnosed",true,"2026-08-27T15:00:00.000Z","CJ");
 assert.equal(hasWorkState(defect,"diagnosed"),true);
 assert.equal(defect.workStates.diagnosed.by,"CJ");
 assert.equal(workStateStampLabel(defect.workStates.diagnosed),"CJ, Aug 27");

 // unticking removes the key outright. A stamp left behind would read as work
 // somebody did not do, so there is nothing for it to survive on.
 defect=setDefectWorkState(defect,"diagnosed",false,"2026-08-27T16:00:00.000Z","CJ");
 assert.equal(hasWorkState(defect,"diagnosed"),false);
 assert.equal(defect.workStates,undefined,"the whole map goes when the last tick does");

 // a tick with no name is still a tick: initials are a setting, not a schema rule
 defect=setDefectWorkState(base,"inspected",true,"2026-08-27T15:00:00.000Z","");
 assert.equal(hasWorkState(defect,"inspected"),true);
 assert.equal(workStateStampLabel(defect.workStates.inspected),"Aug 27");
 assert.equal(workStateStampLabel(undefined),"");

 // states always read in the same order however the boxes were ticked
 let both=setDefectWorkState(base,"parts-on-order",true,"2026-08-27T15:00:00.000Z","JT");
 both=setDefectWorkState(both,"inspected",true,"2026-08-26T15:00:00.000Z","CJ");
 assert.deepEqual(defectWorkStates(both).map(state=>state.key),["inspected","parts-on-order"]);

 // anything that is not a known key is dropped, and a bare true still counts
 assert.deepEqual(normalizeWorkStates({diagnosed:true,troubleshot:{by:"X"},inspected:false}),{diagnosed:{}});
 assert.equal(normalizeWorkStates({}),undefined);
 assert.equal(normalizeWorkStates(null),undefined);
 assert.equal(normalizeWorkStates(["diagnosed"]),undefined);

 // the finding is the cause, marked as one so a reader can tell it from the
 // symptom the driver reported
 assert.equal(defectLabel({...base,finding:"throttle pedal reference circuit"}),
  "Engine — Check engine light — found: throttle pedal reference circuit");
 // and it sits ahead of the reported symptoms, which is the half that matters
 // once the cause is known
 assert.equal(defectLabel({...base,details:"cuts out on hills",finding:"chafed pin 3"}),
  "Engine — Check engine light — found: chafed pin 3 — cuts out on hills");
 assert.equal(defectLabel(base),"Engine — Check engine light");
 assert.equal(normalizeFinding("  "),undefined);
 assert.equal(normalizeFinding("x".repeat(400)).length,180);

 // a stored record carries both through a read without being rewritten
 const [normalized]=normalizeDefects([{...base,workStates:{diagnosed:{by:"CJ",at:"2026-08-27T15:00:00.000Z"}},finding:" chafed pin 3 "}],"","bus");
 assert.equal(normalized.finding,"chafed pin 3");
 assert.equal(normalized.workStates.diagnosed.by,"CJ");
 // and a record that predates all of this reads as having none of it
 const [old]=normalizeDefects([base],"","bus");
 assert.equal(old.workStates,undefined);
 assert.equal(old.finding,undefined);

 // the finding reaches every surface because it goes through defectLabel, and
 // the Down Sheet summary is built from the same function
 assert.match(defectSummary([{...base,finding:"chafed pin 3"}]),/found: chafed pin 3/);

 // Ticked mid-job on a phone, so the picker is in the main form and not behind
 // the advanced disclosure where it would go unused. Rendering it at the end of
 // the form put it below the fold of a phone editor, which is exactly how the
 // campaign paste box got missed, so it sits above WORK STATUS instead.
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 /* Several at once only STAYS possible while the picker draws checkboxes.
    Turning these into radios, or adding mutual exclusion, would silently start
    throwing away recorded work and nothing else would complain. */
 const picker=page.slice(page.indexOf("work-state-picker"),page.indexOf("brake-test-result"));
 assert.match(picker,/<input type="checkbox" checked=\{on\} onChange=\{event=>toggleWorkState\(state\.key,event\.target\.checked\)\}\/>/);
 assert.equal(/type="radio"/.test(picker),false,"the work states are never one-of");
 /* The one thing that IS exclusive stays exclusive: a brake test is a pass or a
    fail, never both. A pair of aria-pressed buttons off one stored result. */
 assert.match(page,/className=\{"brake-test-"\+result\+\(picked\?" selected":""\)\} aria-pressed=\{picked\}/);
 assert.match(page,/const picked=brakeTestResult\(value\.defect\)===result;/);
 assert.ok(page.indexOf("work-state-picker")<page.indexOf("advanced-defect-details"),"above ADVANCED DETAILS");
 assert.ok(page.indexOf("work-state-picker")<page.indexOf("WORK STATUS<select"),"and above WORK STATUS");

 /* THE LEGEND'S OWN WORDS, which nothing above pins. Everything else in this
    suite checks the picker's STRUCTURE - its class, its checkboxes, where it
    sits - so the visible text could be reverted or mistyped and the whole file
    would stay green. Curtis renamed it from WORK DONE SO FAR to PRELIMS, and a
    rename nobody can see break is a rename that comes back.

    Two assertions because they fail differently: the first catches a changed or
    mistyped legend, the second catches the old name surviving ANYWHERE in this
    file - a half-done rename that left the legend right and a comment wrong.

    It reads the SOURCE, not a render, so it cannot say the legend is visible or
    unwrapped; that was measured in a browser (one line, 108px, at 360/390/430/
    1180) and this only says the text is still the text that was measured. */
 assert.match(page,/<fieldset className="wide work-state-picker"><legend>PRELIMS — OPTIONAL<\/legend>/,
  "the picker's legend still reads PRELIMS — OPTIONAL");
 assert.equal(page.includes("WORK DONE SO FAR"),false,
  "the old legend name is gone from the Defect Log page, comments included");

 // Three across at phone width. Stacked, the block was tall enough to push
 // itself off the bottom of the open editor.
 const styles=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(styles,/\.work-state-picker>div\{[^}]*grid-template-columns:repeat\(3/);
 const narrow=styles.slice(styles.indexOf("@media(max-width:760px){\n .log-form .work-state-picker"));
 assert.equal(/work-state-picker>div\{[^}]*grid-template-columns/.test(narrow),false,"never stacked to one column");

 // The initials setting covers both saving a repair fixed and ticking a state,
 // so there is one switch rather than two that can disagree.
 assert.match(page,/before ticking a work state/);
 const panel=await readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8");
 assert.match(panel,/REQUIRE INITIALS ON RECORDED WORK/);
});

test("dash lights are named as reported, and the start rename does not invert history",()=>{
 const engine=REPAIR_OPTIONS.Engine;

 // The light on the dash is what a driver hands in. "Diagnosis" described what
 // the shop then does about it, which is a different thing.
 assert.deepEqual(engine.slice(0,3),["Check engine light","Stop engine light","Check engine and stop engine light"]);
 assert.equal(engine.includes("Check-engine diagnosis"),false);
 // both lit is its own report, not two records or a note on one
 assert.equal(new Set(engine).size,engine.length);

 // Records already logged are never rewritten in storage. They move to the new
 // wording as they are read, so an old defect opens, filters and reports the
 // same as before.
 assert.deepEqual(migrateRepairIdentity("Engine","Check-engine diagnosis"),{category:"Engine",issue:"Check engine light"});
 const [old]=normalizeDefects([{id:"e1",category:"Engine",issue:"Check-engine diagnosis",details:"",state:"open",operability:"service"}]);
 assert.equal(old.issue,"Check engine light");

 // The symptom picker follows all three, so choosing the combined entry does not
 // silently drop the symptoms already ticked.
 for(const issue of CHECK_ENGINE_ISSUES)assert.equal(isCheckEngineIssue("Engine",issue),true);
 assert.equal(isCheckEngineIssue("Engine","Oil leak"),false);
 assert.equal(isCheckEngineIssue("Brakes","Check engine light"),false);

 // Transmission has its own dash light and had no entry for it at all.
 assert.equal(REPAIR_OPTIONS["Transmission and Drivetrain"][0],"Check transmission light");

 // Name the fault, not the half that still works. The catalog already writes
 // INOP for the fuel gauge, so this reads the same way.
 const starting=REPAIR_OPTIONS["Battery, Starting and Charging"];
 assert.ok(starting.includes("Front start INOP")&&starting.includes("Rear start INOP"));
 assert.equal(starting.some(issue=>issue.startsWith("Only ")),false);

 // THE CROSS, and the whole reason this rename needed care. "Only front start"
 // said which half still worked, so the broken half is the REAR one. Mapping
 // each old name to the similar-sounding new one would silently invert every
 // record already logged, and nobody would ever notice.
 assert.deepEqual(migrateRepairIdentity("Battery, Starting and Charging","Only front start"),
  {category:"Battery, Starting and Charging",issue:"Rear start INOP"});
 assert.deepEqual(migrateRepairIdentity("Battery, Starting and Charging","Only rear start"),
  {category:"Battery, Starting and Charging",issue:"Front start INOP"});

 // and a bus that only started from the front now reads as a dead rear start
 const [startRecord]=normalizeDefects([{id:"s1",category:"Battery, Starting and Charging",issue:"Only front start",details:"",state:"open",operability:"down"}]);
 assert.equal(startRecord.issue,"Rear start INOP");
 assert.match(defectLabel(startRecord),/Rear start INOP/);

 // a cause learned before the rename still comes back after it, because the
 // memory key runs through the same migration
 const learned=learnFinding(EMPTY_FINDINGS_MEMORY,{category:"Engine",issue:"Check-engine diagnosis",finding:"chafed pin 3"},"2026-08-27T10:00:00.000Z");
 assert.deepEqual(recallFindings(learned,"Engine","Check engine light").map(entry=>entry.finding),["chafed pin 3"]);
});

test("the operator blower and the mirror switches land in both structures a grouped category needs",()=>{
 // The driver's own blower is not the cabin one, and "Blower motor" could not
 // say which was out.
 // A/C and HVAC became grouped, and both blowers moved into "Controls and
 // Blowers" together rather than being split by the heat/cool line: the cabin
 // blower moves whatever the unit made, and the driver's own is still its own
 // entry. The pairing this test was written for is what kept them together.
 const ac=REPAIR_OPTIONS["A/C and HVAC"];
 assert.equal(ac.indexOf("Controls and Blowers - Operator A/C blower"),ac.indexOf("Controls and Blowers - Blower motor")+1);
 const blowers=REPAIR_OPTION_GROUPS["A/C and HVAC"]["Controls and Blowers"];
 assert.equal(blowers.indexOf("Operator A/C blower"),blowers.indexOf("Blower motor")+1);

 // Bus Controls is grouped, which means the entry has to exist twice: once
 // prefixed in REPAIR_OPTIONS, which is what gets stored, and once bare in
 // REPAIR_OPTION_GROUPS, which is what the picker draws. Adding it to one and
 // not the other is the failure this catches.
 for(const switchName of ["Mirror heater switch - C/S","Mirror adjuster switch - C/S"]){
  assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("System Switches - "+switchName),switchName+" missing from REPAIR_OPTIONS");
  assert.ok(REPAIR_OPTION_GROUPS["Operator/Driver Controls"]["System Switches"].includes(switchName),switchName+" missing from REPAIR_OPTION_GROUPS");
  // and it survives a round trip through a saved defect under its stored name
  const [defect]=normalizeDefects([{id:"d",category:"Bus Controls",issue:"System Switches - "+switchName,details:"",state:"open",operability:"service"}]);
  assert.equal(defect.issue,"System Switches - "+switchName);
 }
 // The mirror switches read as a pair rather than being split by the group.
 const switches=REPAIR_OPTION_GROUPS["Operator/Driver Controls"]["System Switches"];
 assert.equal(switches.indexOf("Mirror adjuster switch - C/S"),switches.indexOf("Mirror heater switch - C/S")+1);
 /* Both are curbside, and the adjuster now says what it adjusts. A record saved
    under either first wording reads as the new one. */
 assert.deepEqual(migrateRepairIdentity("Bus Controls","System Switches - C/S adjuster switch"),
  {category:"Operator/Driver Controls",issue:"System Switches - Mirror adjuster switch - C/S"});
 assert.deepEqual(migrateRepairIdentity("Bus Controls","System Switches - Mirror heater switch"),
  {category:"Operator/Driver Controls",issue:"System Switches - Mirror heater switch - C/S"});
 // Lights and Fixtures still owns the mirrors themselves; only the switch moved.
 assert.ok(REPAIR_OPTIONS["Lights, Mirrors and Alarms"].includes("Outside rear view mirror - C/S"));
});

test("the split surge tank is two independent sides, and the empty one builds the winter list",async()=>{
 const cooling=REPAIR_OPTIONS["Cooling System"];
 /* The heat-side leak sits directly after the plain one: in winter WHICH side
    is losing glycol is the whole question, and the engine side can read full
    and normal while this one empties. Both reach the No Heat Buses list. */
 assert.deepEqual(cooling.slice(cooling.indexOf("Coolant leak"),cooling.indexOf("Coolant leak")+5),
  ["Coolant leak","Coolant leak - heating side","Surge tank - engine side low","Surge tank - heating side low","Surge tank - both sides low"]);

 // How much a tank drinks is the only measure of how fast it is losing it, so
 // every side carries the amount. None of them blocks a report for it.
 for(const side of ["engine side","heating side","both sides"]){
  const field=defectCountField("Cooling System","Surge tank - "+side+" low");
  assert.equal(field.label,"COOLANT ADDED");
  assert.equal(field.unit,"quarts");
  assert.equal(field.required,false);
 }
 const topped={id:"d1",category:"Cooling System",issue:"Surge tank - engine side low",details:"",operability:"service",state:"open",quantity:2};
 assert.match(defectLabel(topped),/2 quarts/);

 // A mechanic who does not know the tank is split tops up the side he can see
 // and walks away from a bus that will have no heat in December.
 assert.match(defectNote("Cooling System","Surge tank - heating side low"),/independent of the engine side/i);
 assert.match(defectNote("Cooling System","Surge tank - both sides low"),/leak somewhere they share/i);
 assert.equal(defectNote("Cooling System","Surge tank - engine side low"),"");

 const bus=defects=>({id:"b",n:"17549",defects:defects.map((issue,index)=>({
  id:"d"+index,category:"Cooling System",issue,details:"",operability:"service",state:"open"}))});
 assert.ok(quickFilterMatch(bus(["Surge tank - heating side low"]),"no-cabin-heat"));
 assert.ok(quickFilterMatch(bus(["Surge tank - both sides low"]),"no-cabin-heat"));
 // The engine side says nothing about the cabin, which is the whole point of
 // the two being separate.
 assert.ok(!quickFilterMatch(bus(["Surge tank - engine side low"]),"no-cabin-heat"));
 // A heater defect is the other way a bus arrives at winter with no heat.
 assert.ok(quickFilterMatch({id:"b",defects:[{id:"d",category:"A/C and HVAC",issue:"Heater / defroster",details:"",operability:"service",state:"open"}]},"no-cabin-heat"));

 // Matching the word "heat" would have pulled in all of these. A winter list
 // that returns an overheating bus is one somebody checks once and abandons.
 for(const wrong of [
  {category:"Engine",issue:"Overheating"},
  {category:"Engine",issue:"Overheat shutdown (235-240F)"},
  {category:"Amerex",issue:"Fire Suppression - Heat sensor communication fault"},
  {category:"Cooling System",issue:"Radiator leak",details:"heat soaked the hose"},
 ]) assert.ok(!quickFilterMatch({id:"b",defects:[{id:"d",details:"",operability:"service",state:"open",...wrong}]},"no-cabin-heat"),
  wrong.issue+" must not reach the winter list");

 // A bus already fixed is off the list, the same rule every other filter uses.
 assert.ok(!quickFilterMatch({id:"b",defects:[{id:"d",category:"Cooling System",issue:"Surge tank - heating side low",details:"",operability:"service",state:"completed"}]},"no-cabin-heat"));

 // The filter reaches every surface that renders the menu, and carries a label
 // for the share text, which is how the list gets handed to somebody else.
 assert.ok(QUICK_FILTERS.some(item=>item.key==="no-cabin-heat"&&item.label==="No Heat Buses"&&item.shortLabel==="No Heat Buses"));
 assert.equal(typeof quickFilterFallbackLabel("no-cabin-heat"),"string");
 assert.ok(quickFilterFallbackLabel("no-cabin-heat").length>0);
});

test("the heating half of HVAC is its own group, and every repair in it builds the heat sheet",async()=>{
 /* Curtis, in December, against a paper heat sheet: "just like you can tag
    buses with no AC, I want a no heat section for the buses ... being able to
    quick filter them, like search them". The filter already existed and found
    two repairs; what did not exist were the repairs. He named them: no heat at
    the front dash, floor heat not working, a coolant leak on the heat side, a
    bad boost pump, and the heat control knob.

    Asked where they belonged he chose a subcategory over a new top-level
    category — "that might be appropriate instead of just making a whole
    another category" — which is right: IntelligAIRE III runs the heat and the
    cooling off one panel. */
 const heating=REPAIR_OPTION_GROUPS["A/C and HVAC"]["Heating"];
 /* NO HEAT LEADS THE GROUP, added later and on purpose. Curtis: "I cannot
    always confirm why there is not heat on the spot, but I can confirm the
    heat doesn't work immediately. This is for convenience." Every other entry
    here names a place or a part, so a foreman who could only say the heat was
    dead had to guess at a cause or reach for "Other heating repair", which
    says nothing. Cooling has had "No cooling" in that slot since the catalog
    was written; this is its heating twin and sits first for the same reason. */
 assert.deepEqual(heating,["No heat","No heat at front dash","Floor heat INOP","Heater boost pump","Heater / defroster","Other heating repair"]);
 /* And the No Heat Buses filter picks it up without being told: it matches the
    group prefix rather than a list of wordings. */
 assert.ok(quickFilterMatch({id:"h",defects:[{id:"d",category:"A/C and HVAC",issue:"Heating - No heat",details:"",state:"open"}]},"no-cabin-heat"),
  "a bus logged with the plain symptom joins the heat list");

 /* Both structures, for every one of them. The picker draws
    REPAIR_OPTION_GROUPS and the stored identity comes from REPAIR_OPTIONS, so
    an entry in one and not the other is storable and invisible. */
 for(const issue of heating)
  assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("Heating - "+issue),issue+" is not storable");

 /* THE FILTER IS DRIVEN OFF THE GROUP, NOT A LIST OF WORDINGS, and that is
    the property worth holding: everything in this group is by definition a
    no-heat defect, so a heating repair added next winter reaches the heat
    sheet without anybody remembering to edit the filter. Iterated from the
    catalog here on purpose — a hard-coded list in this test would pass while
    the real list quietly stopped being complete. */
 const withIssue=(category,issue,details="")=>({id:"b",n:"17549",
  defects:[{id:"d",category,issue,details,operability:"service",state:"open"}]});
 for(const issue of heating)
  assert.ok(quickFilterMatch(withIssue("A/C and HVAC","Heating - "+issue),"no-cabin-heat"),
   "Heating - "+issue+" must reach the No Heat Buses list");

 /* The leak Curtis described — "a leak in the heat side of the cooling
    system" — sits in Cooling System with the other coolant leaks rather than
    in HVAC, because that is where somebody looks for a leak, and it reaches
    the same list from there. */
 assert.ok(REPAIR_OPTIONS["Cooling System"].includes("Coolant leak - heating side"));
 assert.ok(quickFilterMatch(withIssue("Cooling System","Coolant leak - heating side"),"no-cabin-heat"));
 assert.match(defectNote("Cooling System","Coolant leak - heating side"),/engine side can read full/i);

 /* THE HEAT CONTROL KNOB WAS NOT DUPLICATED INTO HVAC. It already existed
    under Bus Controls, and Curtis chose to leave it there rather than have one
    fault filed in two categories. So the filter reaches across to it instead:
    a bus whose heat knob is broken has no heat whichever category holds the
    record. */
 assert.ok(!heating.some(issue=>/knob|control/i.test(issue)),"the knob stays in System Switches, unduplicated");
 for(const knob of ["HVAC / heat controls","Floor heat switch"]){
  assert.ok(REPAIR_OPTION_GROUPS["Operator/Driver Controls"]["System Switches"].includes(knob));
  assert.ok(quickFilterMatch(withIssue("Operator/Driver Controls","System Switches - "+knob),"no-cabin-heat"),
   knob+" must reach the No Heat Buses list from Bus Controls");
 }

 /* The boost pump is the one Curtis called out by name — "a bad boost pump, so
    you can't blow the hot air" — and the note sends somebody to the cheaper
    check first, because an empty heating side gives the same complaint. */
 assert.match(defectNote("A/C and HVAC","Heating - Heater boost pump"),/surge tank before you condemn the pump/i);
 assert.match(defectNote("A/C and HVAC","Heating - No heat at front dash"),/FLOOR heat/);
 assert.match(defectNote("A/C and HVAC","Heating - Floor heat INOP"),/floor heat switch/i);

 /* THE GROUP PREFIX MUST NOT CATCH "Overheating". \b needs a non-word
    boundary and "r"→"h" is not one, so /\bheating\s*-\s/ cannot fire inside
    it — checked rather than assumed, because the whole filter now rests on it
    and an overheating bus on the heat sheet is how a foreman stops trusting
    the list. */
 for(const wrong of [
  {category:"Engine",issue:"Overheating"},
  {category:"Engine",issue:"Overheat shutdown (235-240F)"},
  {category:"Cooling System",issue:"Overheating",details:"overheating - coolant everywhere"},
  {category:"Amerex",issue:"Fire Suppression - Heat sensor communication fault"},
 ]) assert.ok(!quickFilterMatch(withIssue(wrong.category,wrong.issue,wrong.details||""),"no-cabin-heat"),
  wrong.issue+" must not reach the heat sheet");

 /* A cooling repair is not a heating one, and the shared controls are on
    neither list: a blower motor out is as much an A/C complaint as a heat one,
    and putting it on the winter list would pad it in July. */
 assert.ok(!quickFilterMatch(withIssue("A/C and HVAC","Cooling - No cooling"),"no-cabin-heat"));
 assert.ok(!quickFilterMatch(withIssue("A/C and HVAC","Controls and Blowers - Blower motor"),"no-cabin-heat"));

 /* AND IT IS SEARCHABLE, which is the other half of what Curtis asked for.
    The catalog search builds its index off the groups, so the heating entries
    are findable by typing "heat" without a synonym table. */
 const {searchCatalog}=await import("../src/lib/defects/defect-search.ts");
 const hits=searchCatalog("heat").map(option=>option.value);
 for(const issue of heating)assert.ok(hits.includes("Heating - "+issue),issue+" is not findable by searching \"heat\"");
 assert.ok(searchCatalog("boost pump").some(option=>option.value==="Heating - Heater boost pump"));
});

test("grouping A/C and HVAC did not quietly cost the operator, the notes or the estimates",async()=>{
 /* Everything here is something a flat-to-grouped conversion breaks WITHOUT
    failing a test, which is why each one is pinned rather than described. */

 /* 1. THE VOICE AND TEXT OPERATOR. DEFECT_CHOICES keys off the stored string,
    so the moment the category was grouped "defect no cooling" matched nothing
    — nineteen wordings that had worked the day before. A grouped category now
    also answers to the bare item. */
 const {planOperatorCommand}=await import("../src/lib/operator/operator-engine.ts");
 const fleet=[{id:"b1",n:"17559",location:"garage-1",status:"ok",defects:[]}];
 const picked=text=>{const result=planOperatorCommand(text,fleet,[]);
  const draft=result?.plan?.defect;return draft?draft.category+" | "+draft.issue:null};
 assert.equal(picked("bus 17559 defect no cooling"),"A/C and HVAC | Cooling - No cooling");
 assert.equal(picked("bus 17559 defect semi cold air"),"A/C and HVAC | Cooling - Semi cold air");
 assert.equal(picked("bus 17559 defect blower motor"),"A/C and HVAC | Controls and Blowers - Blower motor");
 assert.equal(picked("bus 17559 defect heater boost pump"),"A/C and HVAC | Heating - Heater boost pump");
 assert.equal(picked("bus 17559 defect floor heat inop"),"A/C and HVAC | Heating - Floor heat INOP");
 /* An ungrouped category is untouched by the alias. */
 assert.equal(picked("bus 17559 defect abs warning"),"Brakes | ABS warning");

 /* AN AMBIGUOUS ALIAS IS REFUSED, NOT GUESSED. "INOP (general)" is the tail of
    three Tech Services devices and "Screen black" of two, so the bare key is
    dropped and the full phrase is required. A matcher that picked one of three
    fareboxes would send somebody to the wrong box, which is the failure this
    app refuses everywhere else. */
 assert.equal(picked("bus 17559 defect inop general"),null,"three devices share that tail — it must ask");
 assert.equal(picked("bus 17559 defect screen black"),null,"two screens share that tail — it must ask");
 assert.equal(picked("bus 17559 defect ventra inop general"),"Tech Services | Ventra - INOP (general)");

 /* 2. THE SHOP NOTES NAME A LIVE PATH. The floor-heat note sends somebody to
    the switch, and "Bus Controls" is not a category anybody can open — it only
    survives inside migrateRepairIdentity. A note is read at the bus, at the
    moment of picking, which is the one place a wrong path costs something. */
 const {REPAIR_OPTIONS:OPTIONS,REPAIR_OPTION_GROUPS:GROUPS}=await import("../src/lib/defects/repair-catalog.ts");
 const floorNote=defectNote("A/C and HVAC","Heating - Floor heat INOP");
 const trail=floorNote.match(/under (.+?) → (.+?) → ([^,.]+)/);
 assert.ok(trail,"the floor-heat note must still spell out where the switch is logged");
 const [,category,group,issue]=trail.map(part=>part.trim());
 assert.ok(Object.keys(OPTIONS).includes(category),category+" is named in a note but is not a live category");
 assert.ok(GROUPS[category]?.[group],group+" is named in a note but is not a group of "+category);
 assert.ok(GROUPS[category][group].includes(issue),issue+" is named in a note but is not in "+category+" → "+group);

 /* 3. THE BIG A/C ESTIMATES. Covered in down-sheet.test.mjs off the catalog's
    own wording; asserted here too because the number is what a foreman plans a
    day around, and a 16-hour compressor reading as 2h30 is the kind of wrong
    that looks like a working app. */
 const {recommendedCoreEstimate}=await import("../src/lib/down-sheet/repair-time-estimates.ts");
 const total=issue=>{const e=recommendedCoreEstimate("A/C and HVAC",issue);
  return e.repairMinutes+e.diagnosticMinutes+e.accessMinutes};
 assert.equal(total("Cooling - Compressor"),960);
 assert.equal(total("Compressor"),960,"a record stored before the grouping still estimates");
 assert.equal(total("Cooling - No cooling"),150);

 /* 4. FREE TEXT CANNOT FAKE ITS WAY ONTO THE HEAT SHEET. defectText joins
    details and the shop notes, so an unanchored group match read whatever a
    mechanic typed. */
 const bus=(category,issue,details)=>({id:"b",defects:[{id:"d",category,issue,details,operability:"service",state:"open"}]});
 for(const details of ["engine heating - 225F","coolant heating - fast","bus heating - too hot in cab"])
  assert.ok(!quickFilterMatch(bus("Engine","Overheating",details),"no-cabin-heat"),
   JSON.stringify(details)+" must not reach the heat sheet");
 /* And the real thing still does, with the category present. */
 assert.ok(quickFilterMatch(bus("A/C and HVAC","Heating - Floor heat INOP",""),"no-cabin-heat"));

 /* THE HOLE THIS TEST ORIGINALLY LEFT OPEN. The loop above only varied the
    free text while holding the category at Engine, so it proved the category
    was REQUIRED and nothing about WHERE. Three cases got through:

    - the same free text inside A/C and HVAC on a COOLING defect, because
      `/heating\s*-\s/ && /a\/c and hvac/` lets the two halves be satisfied by
      different parts of one joined string;
    - "hvac heating - ..." typed into any category at all, because that
      alternative asked for no category.

    All three reproduced before the ^ anchor. A foreman working the heat sheet
    would have walked to a bus whose heat was fine. */
 assert.ok(!quickFilterMatch(bus("A/C and HVAC","Cooling - No cooling","floor heating - works fine"),"no-cabin-heat"),
  "a cooling defect must not reach the heat sheet on the strength of typed details");
 for(const category of ["Engine","Bodywork","Brakes"])
  assert.ok(!quickFilterMatch(bus(category,"Panel damage","hvac heating - runs warm"),"no-cabin-heat"),
   category+" must not reach the heat sheet on typed details alone");
 /* The group has to be where the category is, not merely somewhere after it. */
 assert.ok(!quickFilterMatch(bus("A/C and HVAC","Controls and Blowers - Blower motor","heating - see notes"),"no-cabin-heat"),
  "a controls defect must not ride a heating word in its details");

 /* 5. AND THE SAME BUG WAS IN THE FIVE NAMED BRANCHES, which the group fix did
    not touch. These are worse than the group case, because a sentence CLEARING
    a bus is the likeliest place for these words to appear: a mechanic who
    writes down what he checked was putting the bus on the heat sheet. */
 for(const [category,issue,details] of [
  ["A/C and HVAC","Cooling - No cooling","Floor heat switch checked and working"],
  ["Engine","Overheating","heater / defroster was fine"],
  ["Brakes","Chamber leak","no coolant leak - heating side found"],
  ["Cooling System","Water pump","surge tank - both sides topped off, no leak"],
 ]) assert.ok(!quickFilterMatch(bus(category,issue,details),"no-cabin-heat"),
  JSON.stringify(details)+" records what was CHECKED and must not reach the heat sheet");

 /* Every real heating repair still does, read off the catalog rather than
    retyped, so a sixth heating repair added later is covered here too. */
 for(const stored of REPAIR_OPTIONS["A/C and HVAC"].filter(option=>option.startsWith("Heating - ")))
  assert.ok(quickFilterMatch(bus("A/C and HVAC",stored,""),"no-cabin-heat"),stored+" must reach the heat sheet");
 for(const [category,issue] of [
  ["Cooling System","Coolant leak - heating side"],
  ["Cooling System","Surge tank - heating side low"],
  ["Operator/Driver Controls","System Switches - Floor heat switch"],
  ["Operator/Driver Controls","System Switches - HVAC / heat controls"],
 ]) assert.ok(quickFilterMatch(bus(category,issue,""),"no-cabin-heat"),category+" / "+issue+" must reach the heat sheet");

 /* 6. THE LEGACY SHAPES, which are the reason the fix could not simply ignore
    details. A bus can arrive carrying its whole complaint in details under one
    of two placeholder issues, and neither has any structured identity to read
    instead. Both measured rather than reasoned about: `Driver-reported defect`
    is what normalizeDefects synthesises for a legacy pendingRepair with no
    defects array, `Manual entry` is what quickFilterDefects synthesises when
    the array is empty. */
 assert.ok(quickFilterMatch({id:"legacy-1",pendingRepair:"heater / defroster inop"},"no-cabin-heat"),
  "a bus with only a legacy pendingRepair must still reach the heat sheet");
 assert.ok(quickFilterMatch({id:"legacy-2",defects:[],pendingRepair:"heater / defroster inop"},"no-cabin-heat"),
  "an empty defects array with a legacy pendingRepair must still reach the heat sheet");
 assert.ok(quickFilterMatch(bus("Miscellaneous","Driver-reported defect","floor heat switch dead"),"no-cabin-heat"),
  "a driver-reported defect carries its identity in details and must still match");

 /* 5. THE CATEGORY GLYPH NAMES BOTH HALVES. Curtis picked the pair once the
    heating group landed: a snowflake on its own tells a mechanic holding a
    bus with no heat in December that this is the cold box. Pinned because the
    cost of losing it is silent - the heating half simply stops being
    advertised, and nothing else fails. The thermometer and the puff of air
    stay out of it: they name Cooling System and Pneumatic System. */
 assert.equal(repairCategoryEmoji("A/C and HVAC"),"❄️+♨️");
 assert.equal(repairCategoryLabel("A/C and HVAC"),"❄️+♨️ A/C and HVAC");
 for(const taken of ["Cooling System","Pneumatic System"])
  assert.notEqual(repairCategoryEmoji("A/C and HVAC"),repairCategoryEmoji(taken),
   taken+" owns its own glyph and must not share the HVAC one");
});

test("belts, pulley alignment and air bags are catalog repairs, and a counted repair carries its number",async()=>{
 // Engine owns the belts that drive its accessories. Cooling System keeps the
 // pump itself, so the belt and the pump stay separate repairs.
 // Overheating is reported as an engine complaint before anybody knows it is a
 // cooling fault, so it sits near the top of Engine. Cooling System keeps its
 // own, deliberately: the two are the same words about different moments.
 assert.ok(REPAIR_OPTIONS.Engine.indexOf("Overheating")<REPAIR_OPTIONS.Engine.indexOf("Misfire"));
 assert.ok(REPAIR_OPTIONS["Cooling System"].includes("Overheating"));
 assert.ok(REPAIR_OPTIONS.Engine.includes("Water pump belt"));
 assert.ok(REPAIR_OPTIONS.Engine.includes("Alternator belt"));
 assert.ok(REPAIR_OPTIONS["Cooling System"].includes("Water pump"));

 // The accessory drive reads as one block: what turns the pulleys, then the
 // pulleys themselves. A pulley listed away from its belt is a pulley nobody
 // scrolls to while they are already looking at the belt.
 assert.deepEqual(REPAIR_OPTIONS.Engine.slice(
  REPAIR_OPTIONS.Engine.indexOf("Water pump belt"),
  REPAIR_OPTIONS.Engine.indexOf("Water pump belt")+5),
  ["Water pump belt","Alternator belt","Water pump pulley","Tensioner pulley","Fan drive pulley"]);
 // Reported as an engine complaint, the same way Overheating is, and Cooling
 // System keeps its own for the leak that turns out to be the radiator.
 assert.ok(REPAIR_OPTIONS.Engine.indexOf("Coolant leak")<REPAIR_OPTIONS.Engine.indexOf("Misfire"));
 assert.ok(REPAIR_OPTIONS["Cooling System"].includes("Coolant leak"));

 // Heat reads as one scale in the order it climbs, and each end carries its own
 // number so nobody has to be told what counts as hot.
 assert.deepEqual(REPAIR_OPTIONS.Engine.slice(
  REPAIR_OPTIONS.Engine.indexOf("Engine runs hot (207F+)"),
  REPAIR_OPTIONS.Engine.indexOf("Engine runs hot (207F+)")+3),
  ["Engine runs hot (207F+)","Overheating","Overheat shutdown (235-240F)"]);
 // Eight or ten over finishes the day; an engine that shut itself down has
 // already taken the bus off the road, so the picker must not open on service.
 assert.equal(defaultDefectOperability("Engine","Engine runs hot (207F+)"),"service");
 assert.equal(defaultDefectOperability("Engine","Overheating"),"service");
 assert.equal(defaultDefectOperability("Engine","Overheat shutdown (235-240F)"),"down");

 // The Facility Map picker used to consult that table for Interior Cleaning
 // alone, so every downing repair added since opened there on May Stay In
 // Service. It reads the table for whatever category is picked now.
 // There are two of these pickers, and the narrow test was copied into both,
 // so the count is asserted: fixing one and leaving the other is the failure
 // this catches.
 const map=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.equal(map.match(/if\(newDefect\.issue\)setNewDefect\(current=>\(\{\.\.\.current,operability:defaultDefectOperability\(current\.category,current\.issue\)\}\)\)/g)?.length,2);
 assert.doesNotMatch(map,/newDefect\.category==="Interior Cleaning"&&newDefect\.issue/);

 // Both live above the no-start symptoms, because they fail often enough that
 // burying them under the whole list costs somebody a scroll every time.
 const charging=REPAIR_OPTIONS["Battery, Starting and Charging"];
 assert.ok(charging.indexOf("Voltage regulator")<charging.indexOf("No crank"));
 assert.ok(charging.indexOf("Alternator failure")<charging.indexOf("No crank"));
 assert.equal(charging.indexOf("Alternator failure"),charging.indexOf("Voltage regulator")+1);

 // Two alternator entries in one dropdown is a coin flip, so the vague one is
 // off the picker. It is dropped rather than pointed at Alternator failure: a
 // rename would restate every record logged under it as a confirmed failure.
 assert.ok(!charging.includes("Alternator / charging"));
 assert.ok(charging.includes("Starting / charging diagnosis"));
 assert.ok(charging.includes("Other starting or charging repair"));
 assert.deepEqual(migrateRepairIdentity("Battery, Starting and Charging","Alternator / charging"),
  {category:"Battery, Starting and Charging",issue:"Alternator / charging"});
 // A retired repair still reads back on the record that carries it, in every
 // picker. The Down Sheet card was the one with no such option, so a retired
 // entry would have rendered there as an empty select.
 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 /* The card is a ComboField now rather than a <select>, so the guarantee moved
    from an injected "(as logged)" <option> to the `display` prop — and it is
    the same guarantee, stated once instead of per-option: a wording the catalog
    no longer knows falls through to itself rather than rendering blank. */
 assert.match(editor,/display=\{item\.repair\?\(CATALOG_OPTIONS\.find[\s\S]{0,220}?\|\|item\.repair\):""\}/,
  "a retired repair reads back as logged rather than as an empty field");
 // Comments are stripped first: the sentence above names the prop it removed,
 // and matching that would have passed the test over source that still carries it.
 const editorCode=editor.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 assert.equal(/disabled=\{!item\.category\}/.test(editorCode),false,
  "and the repair box is no longer locked behind naming the category first");
 assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("Cooling - A/C belt"));
 assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("Cooling - A/C compressor pulley misaligned"));
 assert.deepEqual(REPAIR_OPTIONS["Pneumatic System"].slice(0,4),
  ["Air leak","Leaking air bag - Front C/S","Leaking air bag - Front R/S","Leaking air bag - Rear"]);

 // A belt fitted to a pulley out of line comes back, so the note says to check
 // it with a straight edge before the belt is ordered.
 assert.match(defectNote("A/C and HVAC","A/C compressor pulley misaligned"),/straight edge/i);

 // The ceiling is the axle's: two across the front, four across the rear.
 assert.equal(defectCountField("Air System","Leaking air bag - Front C/S").max,2);
 assert.equal(defectCountField("Air System","Leaking air bag - Front R/S").max,2);
 assert.equal(defectCountField("Air System","Leaking air bag - Rear").max,4);
 // Counted, but never blocking a report: the number is known when the bags go
 // on, not when the leak is found.
 assert.equal(defectCountField("Air System","Leaking air bag - Rear").required,false);
 assert.equal(defectCountField("Cooling System","Radiator fan(s) out").required,true);
 assert.equal(defectCountField("Air System","Air leak"),undefined);

 // Quarts is the fallback the oil entry taught the label. Without the catalog
 // between them, an air bag count read as "2 quarts".
 const bag={id:"d1",category:"Air System",issue:"Leaking air bag - Front C/S",details:"",operability:"service",state:"completed",quantity:2};
 assert.match(defectLabel(bag),/2 replaced/);
 assert.doesNotMatch(defectLabel(bag),/quarts/);
 assert.match(defectLabel({...bag,category:"Preventive Maintenance",issue:"Add engine oil",quantity:10,unit:"quarts"}),/10 quarts/);

 // A count cannot follow a repair retyped as something that is not counted.
 assert.equal(normalizeRepairCount(2,"Air System","Leaking air bag - Rear"),2);
 assert.equal(normalizeRepairCount(3,"Air System","Air compressor"),undefined);
 assert.equal(normalizeRepairCount("",'Air System',"Leaking air bag - Rear"),undefined);
 // Already recorded and above today's ceiling: kept, because a table that later
 // says the axle holds fewer must not delete work somebody did.
 assert.equal(normalizeRepairCount(6,"Air System","Leaking air bag - Rear"),6);

 // The count reaches Fixed Repairs from the Down Sheet with its unit attached.
 const [synced]=applyDownEntryToFleet([{id:"a",l:"bay-3",s:"defect",defects:[],pendingRepair:""}],
  {id:"e9",busId:"a",category:"Air System",repair:"Leaking air bag - Rear",customReason:"",
   assignmentType:"Mechanic",assignedTo:"cj",workflow:"Completed",operationalStatus:"out",
   repairItems:[{id:"i1",category:"Air System",repair:"Leaking air bag - Rear",details:"",done:true,quantity:4,repairHours:3}]},
  "2026-08-29T15:00:00.000Z");
 assert.equal(synced.defects[0].quantity,4);
 assert.equal(synced.defects[0].unit,"replaced");
 assert.match(defectLabel(synced.defects[0]),/4 replaced/);

 // The card keeps the count across a save, and drops one left on a repair that
 // does not carry a number.
 const [kept]=normalizeRepairItems([{id:"i1",category:"Air System",repair:"Leaking air bag - Front R/S",details:"",quantity:2}],{});
 assert.equal(kept.quantity,2);
 const [dropped]=normalizeRepairItems([{id:"i1",category:"Air System",repair:"Air dryer",details:"",quantity:2}],{});
 assert.equal(dropped.quantity,undefined);
});

test("Air System is read as Pneumatic System, and the two rear valves by what they do",async()=>{
 const { REPAIR_OPTIONS, migrateRepairIdentity, normalizeDefects, defectCountField,
         normalizeRepairCount, repairCategoryEmoji } = await import("../src/lib/defects/repair-catalog.ts");
 const { recommendedRepairMinutes } = await import("../src/lib/down-sheet/repair-time-estimates.ts");

 // The picker offers the new name only.
 assert.ok(REPAIR_OPTIONS["Pneumatic System"],"the category is listed under its new name");
 assert.equal(REPAIR_OPTIONS["Air System"],undefined,"the old name is gone from the picker");
 assert.equal(REPAIR_OPTIONS["Pneumatic System"].includes("R-12 relay valve (C/S rear)"),false);
 assert.equal(REPAIR_OPTIONS["Pneumatic System"].includes("R-14 relay valve (R/S rear)"),false);

 // NOTHING STORED IS REWRITTEN. Every record on the shop's board was logged
 // under the old name, and the rename has to be a read, not a migration pass
 // over live data. A record logged before today reads as its new home.
 assert.deepEqual(migrateRepairIdentity("Air System","Air compressor"),
  {category:"Pneumatic System",issue:"Air compressor"});
 assert.deepEqual(migrateRepairIdentity("Air System","R-12 relay valve (C/S rear)"),
  {category:"Pneumatic System",issue:"R-12 service valve (C/S rear)"});
 assert.deepEqual(migrateRepairIdentity("Air System","R-14 relay valve (R/S rear)"),
  {category:"Pneumatic System",issue:"R-14 parking brake valve (R/S rear)"});
 // And a record already written under the new name is left where it is.
 assert.deepEqual(migrateRepairIdentity("Pneumatic System","R-12 service valve (C/S rear)"),
  {category:"Pneumatic System",issue:"R-12 service valve (C/S rear)"});

 // Read through the board the way every page reads it.
 const [carried]=normalizeDefects([{id:"d1",category:"Air System",issue:"R-12 relay valve (C/S rear)",
  details:"Leaks down overnight",state:"open",operability:"service",createdAt:"2026-01-04T09:00:00.000Z"}]);
 assert.equal(carried.category,"Pneumatic System");
 assert.equal(carried.issue,"R-12 service valve (C/S rear)");
 assert.equal(carried.id,"d1","the record keeps its identity, so its history follows it");
 assert.equal(carried.details,"Leaks down overnight");
 assert.equal(carried.createdAt,"2026-01-04T09:00:00.000Z");

 // The three things keyed on the category name still find it, under either
 // spelling, so a rename cannot silently drop an air-bag count or an estimate.
 assert.equal(defectCountField("Air System","Leaking air bag - Rear").max,4);
 assert.equal(defectCountField("Pneumatic System","Leaking air bag - Rear").max,4);
 assert.equal(normalizeRepairCount(4,"Air System","Leaking air bag - Rear"),4);
 assert.equal(normalizeRepairCount(4,"Pneumatic System","Leaking air bag - Rear"),4);
 assert.equal(repairCategoryEmoji("Pneumatic System"),repairCategoryEmoji("Air System"));
 assert.notEqual(repairCategoryEmoji("Pneumatic System"),repairCategoryEmoji("Miscellaneous"),
  "the new name must not be falling through to the catch-all glyph");
 assert.equal(recommendedRepairMinutes("Pneumatic System","Air dryer"),
              recommendedRepairMinutes("Air System","Air dryer"),
              "an unmigrated read still estimates the same");
 assert.notEqual(recommendedRepairMinutes("Pneumatic System","Air dryer"),
                 recommendedRepairMinutes("Miscellaneous","Air dryer"),
                 "the new name must not be falling through to the catch-all estimate");
});

test("the parking brake knob and the rear air valves are in the catalog",()=>{
 const controls=REPAIR_OPTIONS["Operator/Driver Controls"],air=REPAIR_OPTIONS["Pneumatic System"];

 // The yellow diamond knob you pull up to set and push down to release. It sits
 // beside the red air valve on the dash, so it sits beside it in the list too.
 const knob=controls.filter(issue=>issue.includes("Parking brake knob"));
 assert.equal(knob.length,4);
 assert.ok(knob.every(issue=>issue.startsWith("Operating Controls - ")));
 assert.equal(controls.indexOf("Operating Controls - Red air valve hard to turn")+1,
  controls.indexOf("Operating Controls - Parking brake knob will not pull up (apply)"));
 // both directions are separate faults: a knob that will not set and one that
 // will not release are different repairs on different days
 assert.ok(controls.includes("Operating Controls - Parking brake knob will not push down (release)"));
 assert.ok(controls.includes("Operating Controls - Parking brake knob pops out while driving"));

 // Brakes keeps its own Parking brake entry for the brake itself. The knob is
 // the dash control, and confusing the two would file a dragging brake as a
 // broken knob.
 assert.ok(REPAIR_OPTIONS.Brakes.includes("Parking brake"));
 assert.equal(REPAIR_OPTIONS.Brakes.some(issue=>issue.includes("knob")),false);

 // Every bus has these three, and none of them were listed.
 assert.ok(air.includes("Treadle valve (brake pedal)"));
 // Named for what the valve DOES, then the side it is on. The model number
 // alone said nothing about whether a bus could move; the service valve and the
 // parking brake valve are what get said on the floor.
 assert.ok(air.includes("R-12 service valve (C/S rear)"));
 assert.ok(air.includes("R-14 parking brake valve (R/S rear)"));

 // Every grouped category is held in two structures: the picker renders
 // REPAIR_OPTION_GROUPS while the stored identity comes from REPAIR_OPTIONS. An
 // entry added to one and not the other is storable and invisible, which is how
 // the parking brake knob nearly went in.
 for(const category of Object.keys(REPAIR_OPTION_GROUPS)){
  const flat=REPAIR_OPTIONS[category];
  assert.ok(flat,category+" is grouped but has no REPAIR_OPTIONS list");
  for(const [group,items] of Object.entries(REPAIR_OPTION_GROUPS[category])){
   for(const item of items){
    assert.ok(flat.includes(group+" - "+item),category+" / "+group+" - "+item+" is missing from REPAIR_OPTIONS");
   }
  }
  for(const issue of flat){
   const [group,...rest]=issue.split(" - ");
   assert.ok(REPAIR_OPTION_GROUPS[category][group]?.includes(rest.join(" - ")),category+" / "+issue+" is missing from REPAIR_OPTION_GROUPS");
  }
 }
});

test("the Amerex panel is two systems, and the states that down a bus say so",async()=>{
 const amerex=REPAIR_OPTIONS.Amerex;

 // Fire Suppression is four heat sensors at the rear where the CNG lines run. It
 // fires on its own with no operator input, so FIRE means the bottles have
 // already gone off — a different report from a sensor that stopped answering.
 assert.ok(amerex.includes("Fire Suppression - FIRE alarm (system discharged)"));
 assert.ok(amerex.includes("Fire Suppression - Heat sensor communication fault"));
 assert.ok(amerex.includes("Fire Suppression - Control head no power"));
 // the existing panel codes are kept: records logged under them must still read
 assert.ok(amerex.includes("Fire Suppression - Trouble Mod 1 Roof 1"));

 // Gas Concentration keeps the panel's own wording, because a mechanic reads the
 // faceplate and the list should say the same thing.
 assert.ok(amerex.includes("Gas Concentration - Trace")&&amerex.includes("Gas Concentration - Significant Leak"));

 // Red Significant normally puts the bus down, and so does a system that has
 // discharged. The picker starts those two as Remove From Service rather than
 // leaving a mechanic to remember which colour meant what.
 assert.equal(defaultDefectOperability("Amerex","Gas Concentration - Significant Leak"),"down");
 assert.equal(defaultDefectOperability("Amerex","Fire Suppression - FIRE alarm (system discharged)"),"down");
 // amber Trace keeps running while somebody finds the leak
 assert.equal(defaultDefectOperability("Amerex","Gas Concentration - Trace"),"service");
 assert.equal(defaultDefectOperability("Amerex","Fire Suppression - Heat sensor communication fault"),"service");
 // and the rule that was already there still holds
 assert.equal(defaultDefectOperability("Interior Cleaning","Cleaning Required"),"down");
 assert.equal(defaultDefectOperability("Engine","Check engine light"),"service");

 // Every bus on this property runs CNG, so the gas equipment sits beside the
 // panel that watches it rather than scattered through Fuel Delivery. The Gas
 // Concentration side was already half a CNG system.
 assert.deepEqual(Object.keys(REPAIR_OPTION_GROUPS.Amerex),["Fire Suppression","Gas Concentration","CNG"]);
 assert.ok(amerex.includes("CNG - Check CNG valves light"));
 assert.ok(amerex.includes("CNG - PRD cap missing"));
 assert.ok(amerex.includes("CNG - Other CNG defect"));
 // and it is not left in two places: Fuel Delivery held it only inside this same
 // unpublished release, so no record can exist under that identity
 assert.equal(REPAIR_OPTIONS["Fuel Delivery"].includes("Check CNG valves light"),false);

 // The balloon test exists to find something, and there was nowhere to record
 // finding it. A confirmed leak from a pressure relief device is a gas leak.
 assert.ok(amerex.includes("CNG - PRD leaking"));
 assert.equal(defaultDefectOperability("Amerex","CNG - PRD leaking"),"down");
 assert.equal(defaultDefectOperability("Amerex","CNG - PRD cap missing"),"service");

 // A missing cap is not a cap to replace, it is a reason to test for a leak,
 // and that has to reach whoever is standing at the bus rather than living in
 // one person's head.
 assert.match(defectNote("Amerex","CNG - PRD cap missing"),/balloon/i);
 assert.match(defectNote("Amerex","CNG - PRD cap missing"),/PRD leaking/,"and it says where to record a positive test");
 assert.match(defectNote("Amerex","Gas Concentration - Significant Leak"),/Relay Reset/);
 assert.equal(defectNote("Amerex","Fire Suppression - Trouble Mod 1 Roof 1"),"","most entries carry none");
 assert.equal(defectNote("Engine","Check engine light"),"");
 assert.equal(defectNote(null,undefined),"");
 // notes follow a renamed identity, so one written for an entry that later moves
 // does not quietly stop appearing
 assert.equal(defectNote("Engine","Check-engine diagnosis"),defectNote("Engine","Check engine light"));

 // shown where the choice was just made, not behind Advanced Details
 const notePage=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.ok(notePage.indexOf("defect-note")<notePage.indexOf("advanced-defect-details"));
 /* Anchored to a string that still exists: 'QUICK SELECT' was renamed and this
    kept passing on indexOf(-1), which is a test that had stopped testing. */
 assert.ok(notePage.includes('<ComboField label="SPECIFIC DEFECT OR SYMPTOM"'));
 assert.ok(notePage.indexOf('<ComboField label="SPECIFIC DEFECT OR SYMPTOM"')<notePage.indexOf("defect-note"));
});

test("a diagnosed cause is learned under the symptom it was found beneath",async()=>{
 const engine={category:"Engine",issue:"Check engine light"};
 let memory=learnFinding(EMPTY_FINDINGS_MEMORY,{...engine,finding:"throttle pedal reference circuit"},"2026-08-27T10:00:00.000Z");
 assert.deepEqual(recallFindings(memory,"Engine","Check engine light").map(entry=>entry.finding),["throttle pedal reference circuit"]);

 // and nowhere else. Putting causes in the catalog would bury the twelve engine
 // choices a mechanic picks from under a hundred that each apply to one bus.
 assert.deepEqual(recallFindings(memory,"Engine","Oil leak"),[]);
 assert.deepEqual(recallFindings(memory,"Brakes","Check engine light"),[]);
 assert.deepEqual(recallFindings(memory,"Engine",""),[]);
 assert.equal(REPAIR_OPTIONS.Engine.includes("throttle pedal reference circuit"),false,"the picker never grows");

 // Two spellings of one fault collapse to one entry, or a year of history reads
 // as several different faults that each happened once.
 memory=learnFinding(memory,{...engine,finding:"Throttle Pedal Reference Circuit "},"2026-08-27T11:00:00.000Z");
 memory=learnFinding(memory,{...engine,finding:"throttle  pedal reference circuit."},"2026-08-27T12:00:00.000Z");
 const recalled=recallFindings(memory,"Engine","Check engine light");
 assert.equal(recalled.length,1);
 assert.equal(recalled[0].uses,3);
 // the wording recorded first is the wording kept: a later spelling winning
 // would rewrite what earlier repairs appear to say
 assert.equal(recalled[0].finding,"throttle pedal reference circuit");

 // most-used first, so the answer that keeps turning out right sits at the front
 memory=learnFinding(memory,{...engine,finding:"EGR differential pressure sensor"},"2026-08-27T13:00:00.000Z");
 assert.deepEqual(recallFindings(memory,"Engine","Check engine light").map(entry=>entry.finding),
  ["throttle pedal reference circuit","EGR differential pressure sensor"]);

 // a guess can be taken back out
 memory=forgetFinding(memory,"Engine","Check engine light","THROTTLE PEDAL REFERENCE CIRCUIT");
 assert.deepEqual(recallFindings(memory,"Engine","Check engine light").map(entry=>entry.finding),["EGR differential pressure sensor"]);

 // nothing to learn from is not an error
 assert.deepEqual(learnFinding(EMPTY_FINDINGS_MEMORY,{...engine,finding:"   "}).entries,[]);
 assert.deepEqual(learnFinding(EMPTY_FINDINGS_MEMORY,{category:"",issue:"",finding:"x"}).entries,[]);
 assert.deepEqual(normalizeFindingsMemory(null).entries,[]);
 assert.deepEqual(normalizeFindingsMemory({entries:[{category:"Engine"}]}).entries,[]);

 // a cause learned under a category that has since been merged still matches,
 // because the key runs through the same catalog migration the parts memory uses
 const moved=migrateRepairIdentity("Steering","Loose steering");
 const legacy=learnFinding(EMPTY_FINDINGS_MEMORY,{category:"Steering",issue:"Loose steering",finding:"worn drag link"},"2026-08-27T10:00:00.000Z");
 assert.deepEqual(recallFindings(legacy,moved.category,moved.issue).map(entry=>entry.finding),["worn drag link"]);

 // Learned on any save carrying a finding, not only one marked Diagnosed.
 // Making the checkbox the trigger would mean a mechanic writes the cause, sees
 // nothing remembered, and never learns why.
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/if\(normalizeFinding\(draft\.defect\.finding\)\)setFindingsMemory/);

 // IT MOVED RATHER THAN WENT. Curtis took the box off the MAIN form — "We have
 // " description above, so it kind of redundant" — and ESTIMATED TIME OF REPAIR
 // has that slot. Taking it off the page altogether was the first version of
 // this change, and it left an OPEN defect with nowhere in the app to type a
 // cause, read one already stored, or clear it: the Down Sheet's own finding box
 // is inside `{item.done && …}` and Fixed Repairs lists completed repairs only.
 // So it is in ADVANCED DETAILS, beside the diagnosis it answers.
 assert.match(page,/className="advanced-finding">WHAT WAS FOUND \(OPTIONAL\)/);
 /* TYPEABLE, and asserted on the input rather than on the handler beside it.
    A cold read added `readOnly` to that input and every assertion here stayed
    true, because the `onChange` it was matching is still in the source. */
 /* `[^>]*` cannot cross the `>` inside `event=>`, which this project has been
    bitten by before — the capture came back null. */
 const findingInput=page.match(/<label className="advanced-finding">[\s\S]*?<input([\s\S]*?)\/>/)[1];
 assert.match(findingInput,/onChange=\{event=>updateDefect\("finding",event\.target\.value\)\}/);
 assert.equal(/readOnly|disabled/.test(findingInput),false,"and not read-only");

 /* AND IT IS DRAWN FOR AN OPEN DEFECT, which is the regression this exists to
    answer. The same read wrapped this whole block in
    `{value.defect.state==="completed"&& …}` — reintroducing "a finding can
    only be typed on a COMPLETED repair" exactly — and every other assertion
    in this test stayed green, because each one only looks for a substring.
    Nothing between the section opening and the box may ask about the state. */
 const gridAt=page.indexOf("advanced-defect-grid");
 /* Comments stripped first, or this reads the paragraph above the box — which
    says the word "completed" four times explaining why the box is here. The
    question is about CODE between the section opening and the box. */
 const beforeFinding=page.slice(gridAt,page.indexOf('className="wide advanced-finding-block"')).replace(/\/\*[\s\S]*?\*\//g,"");
 assert.equal(/completed/.test(beforeFinding),false,"no completion guard stands between ADVANCED DETAILS and the finding box");
 assert.equal(/state===|\.done/.test(beforeFinding),false,"nor any other state guard");
 assert.match(page,/recallFindings\(findingsMemory,value\.defect\.category,value\.quickIssue\|\|value\.defect\.issue\)/);
 assert.match(page,/learned-findings/);
 assert.match(page,/forgetLearnedFinding\(entry\)/,"forgettable from where they are shown");
 const findingAt=page.indexOf('className="wide advanced-finding-block"');
 /* THE BOX AND ITS CHIPS ARE ONE CELL. The grid is two columns above 760px,
    and as two bare children the box landed in column 2 beside DIAGNOSIS while
    its chips landed in column 1 of the next row — under a textarea they have
    nothing to do with, measured at 1180. Fixed Repairs and the Down Sheet
    editor both mark that row `wide`; this copy did not. */
 const block=page.slice(findingAt,page.indexOf("</div>",page.indexOf("learned-findings",findingAt)));
 assert.ok(block.includes('className="advanced-finding"'),"the box is inside the wide block");
 assert.ok(block.includes("learned-findings"),"and so are its chips");
 // Not in the work-state fieldset it used to sit in, and not above WORK STATUS:
 // that slot is the estimate's now.
 assert.ok(findingAt>page.indexOf("advanced-defect-grid"),"inside ADVANCED DETAILS");
 assert.ok(findingAt>page.indexOf('className="wide repair-estimate-field"'),"below the estimate that replaced it");
 // AND A STORED ONE OPENS THAT SECTION, or a cause already on the record is
 // still invisible, which is the half of this nobody would notice.
 assert.match(page,/draft\.defect\.diagnosticHours!==undefined\|\|draft\.defect\.finding\)\)/);

 // Offered on the Down Sheet row editor too, as a repair is finished.
 const sheet=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 assert.match(sheet,/recallFindings\(findingsMemory,item\.category,item\.repair\)/);
 assert.match(sheet,/learned-findings/);

 // Fixed Repairs learns too. A fault is often only named properly once the bus
 // is apart, and that is the page open at the time; a finding typed there
 // teaching nothing would be a gap nobody would ever notice.
 const fixed=await readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8");
 assert.match(fixed,/if\(normalizeFinding\(draft\.finding\)\)setFindingsMemory/);
 assert.match(fixed,/recallFindings\(findingsMemory,draft\.category,draft\.issue\)/);
 assert.match(fixed,/learned-findings/);

 // Both pages that draw the chips style them, because each ships its own
 // stylesheet and an unstyled chip row on one of them is how globals.css leaks
 // in. The Down Sheet draws them as well and carries only a `button` override
 // of its own, so its chip row has no border or radius — that predates this
 // change and is recorded here rather than fixed.
 for(const [name,file] of [["defect-log","../app/defect-log/defect-log.css"],["fixed-repairs","../app/fixed-repairs/fixed-repairs.css"]]){
  const css=await readFile(new URL(file,import.meta.url),"utf8");
  assert.match(css,/\.learned-finding\{/,name+" styles the chip");
  assert.match(css,/\.learned-findings>div\{[^}]*flex-wrap:wrap/,name+" wraps them rather than running off a phone");
 }
 const sheetCss=await readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8");
 assert.equal(/\.learned-finding\{/.test(sheetCss),false,"the Down Sheet's own gap, written down so it is not rediscovered as new");
 const logCss=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.equal(/work-state-finding/.test(logCss),false,"no rule survives for the box's old slot");
 assert.equal(/\.work-state-picker>small/.test(logCss),false,"nor for the help line that was its only direct small");
});

test("a repair can be put forward for the Down Sheet without being put on it",async()=>{
 const base={id:"d1",category:"Engine",issue:"Check engine light",details:"",operability:"service",state:"open"};

 // recommending stamps who asked, which is the point: the list gets handed to
 // somebody else, and an unsigned recommendation is a job nobody can ask about
 const asked=setDownSheetRecommendation(base,true,"2026-08-27T15:00:00.000Z","CJ");
 assert.equal(isDownSheetRecommended(asked),true);
 assert.equal(asked.downSheetRecommendation.by,"CJ");
 assert.equal(isDownSheetRecommended(base),false);

 // clearing removes the stamp outright rather than leaving a false behind
 const withdrawn=setDownSheetRecommendation(asked,false,"2026-08-27T16:00:00.000Z","CJ");
 assert.equal("downSheetRecommendation" in withdrawn,false);

 // the shared stamp normalizer takes a bare true from a hand-edited backup
 assert.deepEqual(normalizeWorkStateStamp(true),{});
 assert.deepEqual(normalizeWorkStateStamp({by:" CJ ",at:"x"}),{at:"x",by:"CJ"});
 assert.equal(normalizeWorkStateStamp(false),undefined);
 assert.equal(normalizeWorkStateStamp(null),undefined);

 // it survives a stored read, and a record without one reads as not asked
 const [read]=normalizeDefects([asked],"","bus");
 assert.equal(read.downSheetRecommendation.by,"CJ");
 assert.equal(normalizeDefects([base],"","bus")[0].downSheetRecommendation,undefined);

 // the filter, and the rule that keeps a shared list trustworthy: a repair
 // that has since been fixed is not a job anybody needs scheduled
 const bus={id:"a",n:"17549",defects:[
  {...asked,id:"open-and-asked"},
  {...asked,id:"fixed-and-asked",state:"completed",completedAt:"2026-08-27T18:00:00.000Z",completedBy:"CJ"},
  {...base,id:"open-not-asked"},
 ]};
 assert.deepEqual(quickFilterDefects(bus,"down-sheet-recommended").map(defect=>defect.id),["open-and-asked"]);
 assert.equal(quickFilterMatch(bus,"down-sheet-recommended"),true);
 assert.deepEqual(quickFilterBusIds([bus,{id:"b",n:"17568",defects:[base]}],"down-sheet-recommended"),["a"]);

 // it is a real filter entry, so the drawer's COPY LIST and SHARE come with it
 const entry=QUICK_FILTERS.find(item=>item.key==="down-sheet-recommended");
 assert.equal(entry.label,"Recommended for Down Sheet");
 assert.deepEqual(QUICK_FILTERS.slice(-3).map(item=>item.key),["down-sheet-recommended","deferred","logged"],"in the tail: it answers a different question from the symptom filters");

 // A recommendation must never quietly become membership, and membership must
 // never clear the recommendation. Separate fields, and adjacent rows in the
 // editor so nobody reaches for the wrong one.
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/downsheet-recommend-check/);
 const recommend=page.indexOf("downsheet-recommend-check"),escalate=page.indexOf("checked={value.onDownSheet}");
 assert.ok(recommend<escalate&&escalate-recommend<900,"the two rows sit next to each other");
 assert.equal(/onDownSheet:[^,}]*downSheetRecommendation|downSheetRecommendation[^;]{0,80}onDownSheet:/.test(page),false,"neither writes the other");
 assert.match(page,/before recommending this for the Down Sheet/,"held to the same initials rule");
});

test("the drivetrain has a home and grease fittings have exactly one",()=>{
 const drivetrain=REPAIR_OPTIONS["Transmission and Drivetrain"];
 assert.equal(REPAIR_OPTIONS.Transmission,undefined);
 for(const issue of ["Driveshaft","Driveshaft noise / banging","U-joints","Carrier bearing","Differential","Axle / axle shaft"])
  assert.ok(drivetrain.includes(issue),issue);
 // everything the old category offered still resolves to a pickable name
 for(const [issue,expected] of [["Will not shift","Will not shift"],["Slipping","Slipping"],
  ["Transmission replacement","Transmission replacement"],["Other transmission repair","Other transmission or drivetrain repair"]]){
  const moved=migrateRepairIdentity("Transmission",issue);
  assert.deepEqual(moved,{category:"Transmission and Drivetrain",issue:expected},issue);
  assert.ok(drivetrain.includes(moved.issue),expected+" must be pickable");
 }
 const [read]=normalizeDefects([{id:"t1",category:"Transmission",issue:"Slipping",details:"Under load",state:"open",operability:"service"}]);
 assert.equal(read.category,"Transmission and Drivetrain");
 assert.equal(read.details,"Under load");
 assert.equal(repairCategoryEmoji("Transmission and Drivetrain"),"🕹️");
});

test("every Defect Log bus card carries a focus view with safe repair actions",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);

 // one control per bus card, and it must not be nested inside the card's expand button
 assert.match(page,/className="log-focus-button"[\s\S]{0,320}?onClick=\{event=>\{event\.stopPropagation\(\);setFocusedBusId\(group\.bus\.id\)\}\}/);
 const focusButtonAt=page.indexOf('className="log-focus-button"'),headerAt=page.indexOf('className="log-card-main log-group-header"');
 assert.ok(focusButtonAt>0&&headerAt>focusButtonAt,"focus button must precede the header button as a sibling");
 assert.equal(/log-card-main log-group-header[\s\S]{0,600}?log-focus-button/.test(page),false);
 // exactly one focus control exists, on the bus group card and not on individual defect rows
 assert.equal(page.split('className="log-focus-button"').length-1,1);
 assert.equal(/grouped-defect-main[\s\S]{0,400}?log-focus-button/.test(page),false);

 // editing hands off to the one existing editor; completion reuses the
 // established Mark Fixed path and never creates a second completion flow
 assert.match(page,/setFocusedBusId\(""\);setEditing\(recordDraft\(record\)\)/);
 assert.match(page,/className="fix-log-focus-defect"[\s\S]{0,180}?onClick=\{\(\)=>markFixed\(record\)\}>MARK FIXED<\/button>/);
 assert.match(page,/\{isUnresolved\(record\.defect\)&&<button className="fix-log-focus-defect"/);
 assert.equal(/log-focus-record[\s\S]{0,1100}?(saveShopNotes|removeRecord)\(/.test(page),false);
 assert.match(page,/const focusedGroup=focusedBusId\?visibleGroups\.find\(group=>group\.bus\.id===focusedBusId\):undefined/);
 assert.match(page,/role="dialog" aria-modal="true"/);
 // shop notes live on the defect, not the record wrapper
 assert.match(page,/record\.defect\.shopNotes&&<p><b>\{settings\.display\.labels\.shopNotes\.toUpperCase\(\)\}<\/b>\{record\.defect\.shopNotes\}/);
 // globals.css styles bare <header> and <footer>; the focus view must not use them
 const focusBlock=page.slice(page.indexOf("log-focus-shade"),page.indexOf("{editing&&<DefectEditor"));
 assert.ok(focusBlock.length>500);
 assert.equal(/<header[ >]|<\/header>|<footer[ >]|<\/footer>/.test(focusBlock),false);
 assert.match(focusBlock,/className="log-focus-head"/);
 assert.match(focusBlock,/className="log-focus-record-head"/);
 assert.match(focusBlock,/className="log-focus-record-foot"/);
 assert.match(page,/aria-label="Close focus view"/);

 // the focus view can start a new defect on the bus it is already showing,
 // prefilled with that bus so the mechanic never re-picks the number
 assert.match(focusBlock,/className="add-log-focus-defect"/);
 assert.match(focusBlock,/const busId=focusedGroup\.bus\.id;setFocusedBusId\(""\);setEditing\(\{\.\.\.newDraft\(\),busId\}\)/);
 assert.match(focusBlock,/aria-label=\{"Add a defect to bus "\+focusedGroup\.bus\.n\}/);
 // wording the picker no longer offers still shows, instead of reading as blank
 assert.match(page,/const offCatalogIssue=value\.quickIssue&&!repairs\.includes\(value\.quickIssue\)\?value\.quickIssue:""/);
 /* Still reachable, now as the first ROW of the typing picker rather than the
    first <option>: a record saved under wording the catalog has since retired
    must survive a save untouched, whatever the picker is made of. */
 assert.match(page,/offCatalogIssue&&!query\?\[\{value:offCatalogIssue,label:offCatalogIssue,hint:"as logged"\}/);
 // same green as + LOG DEFECT, and it does not squeeze out the close control
 assert.match(css,/\.add-log-focus-defect\{margin-left:auto;min-height:48px[^}]*background:#08733f/);
 assert.match(css,/\.add-log-focus-defect\+\.close-log-focus\{margin-left:0\}/);
 assert.match(css,/\.feed-title button\{height:36px;border:0;border-radius:6px;background:#08733f/);

 // larger reading type than the feed it replaces, and a real touch target.
 // `white-space:pre-wrap` joined this rule when typed line breaks stopped being
 // collapsed on the way to the screen; the size claim is unchanged and still
 // the point of this assertion.
 assert.match(css,/\.log-focus-defect\{margin:0 0 11px;white-space:pre-wrap;font-size:21px/);
 assert.match(css,/\.log-focus-bus strong\{font-size:34px/);
 assert.match(css,/\.log-focus-record-foot button\{min-height:44px/);
 assert.match(css,/\.log-focus-record-actions\{display:grid;grid-auto-flow:column;grid-auto-columns:minmax\(0,1fr\);gap:8px;width:100%\}/);
 assert.match(css,/\.log-focus-record-foot button\{[^}]*padding:0 6px[^}]*font-size:11px/);
 assert.match(css,/\.fix-log-focus-defect\{background:#08733f\}/);
 assert.match(css,/\.log-card-group>\.log-focus-button\{position:absolute;top:6px;right:6px/);
 // the card header reserves the corner so repair text cannot run under the control
 assert.match(css,/\.log-card-group>\.log-group-header\{padding-right:64px\}/);

 // phone rules stay in the established phone breakpoint
 const conditions=[];
 for(let index=css.indexOf("@media(");index>=0;index=css.indexOf("@media(",index+1)){
  /* THE WHOLE PRELUDE, not up to the first ")". `@media(hover:none) and
     (pointer:coarse)` was being reported as "hover:none", which is a condition
     this stylesheet does not contain - and a gate that compares a truncated
     string is comparing something nobody wrote. */
  const open=css.indexOf("{",index);
  let depth=0,end=open;
  for(;end<css.length;end++){
   if(css[end]==="{")depth++;
   else if(css[end]==="}"&&--depth===0)break;
  }
  /* THE RULE THIS TESTS is that the focus view's own LAYOUT uses one phone
    breakpoint. A rule guarded by [data-bus-...] is not that: it belongs to one
    of the opt-in view options, which are OFF by default and carry their own
    breakpoint BY DESIGN — "phone only" means the 620px block, which is the
    whole point of them and is asserted separately in "PHONE is a width, not a
    device".

    THAT FILTER ALONE IS ENOUGH, re-derived by running this loop four ways over
    the shipped stylesheet. A first attempt also stripped the names
    .log-focus-row and .log-focus-button, on the theory that they are card
    elements rather than focus-view ones. Unnecessary, and worse than
    unnecessary: stripping a name blinds this guard to it forever, and
    .log-card-group>.log-focus-button already has a real rule in a media block
    that this would then never check. A future .log-focus-button rule dropped
    into the wrong breakpoint would have passed silently. */
 const body=css.slice(open+1,end).split("}").filter(rule=>!rule.includes("[data-bus-")).join("}");
 if(body.includes(".log-focus"))conditions.push(css.slice(index+6,open).trim());
 }
 /* EVERY block carrying a .log-focus rule uses the phone breakpoint — which is
    what the line above says, and what matters. Comparing the list itself also
    asserted there was exactly ONE such block, so a second one at the same
    correct breakpoint failed this. Deduplicated, it tests the rule; the length
    check below keeps it from passing vacuously if the rules ever move out. */
 assert.ok(conditions.length>0,"the focus view must still have phone rules");
 /* WIDTH CONDITIONS AND CAPABILITY CONDITIONS ARE DIFFERENT QUESTIONS, and
    lumping them together is what this split fixes. The rule being enforced is
    that the focus view has ONE breakpoint - a second invented width is how a
    panel comes right at 390 and wrong at 430. A `(hover:none) and
    (pointer:coarse)` block is not a breakpoint: it asks whether the device has
    a thumb instead of a pointer, which is exactly the question the swipe's
    `user-select` guard has to ask and cannot ask with a width. So widths are
    still pinned to the one breakpoint, and the capability queries are listed
    rather than waved through - an invented one still fails here. */
 /* ONE BREAKPOINT, AND ITS COMPLEMENT. `(min-width:761px)` is not a second
    invented width - it is exactly "not the phone", which is how a rule that
    must apply to the WINDOWED dialog and not the full-screen one is written.
    Any other width still fails. */
 const byWidth=[...new Set(conditions.filter(one=>one.includes("width")))].sort();
 const byCapability=[...new Set(conditions.filter(one=>!one.includes("width")))];
 assert.deepEqual(byWidth,["(max-width:760px)","(min-width:761px)"]);
 assert.deepEqual(byCapability,["(hover:none) and (pointer:coarse)"],
  "the only non-width query the focus view may use is the touch one the swipe needs");
});

test("parts memory learns per defect issue and lets a category default be chosen deliberately",()=>{
 assert.deepEqual(normalizePartsMemory(undefined),{entries:[]});
 assert.deepEqual(EMPTY_PARTS_MEMORY,{entries:[]});

 // learning defaults to the exact issue, because the same word means different parts per category
 let memory=learnPart(EMPTY_PARTS_MEMORY,{category:"Bus Controls",issue:"Horn",partNumber:"HN-101",partName:"Horn relay"},"2026-08-26T10:00:00.000Z");
 assert.equal(memory.entries.length,1);
 assert.equal(memory.entries[0].scope,"issue");
 assert.equal(recallPart(memory,"Bus Controls","Horn").partNumber,"HN-101");
 assert.equal(recallPart(memory,"Bus Controls","Horn").partName,"Horn relay");
 // Horn migrated to Bus Controls, so the retired spelling now finds the same mapping
 assert.equal(recallPart(memory,"Electrical / Multiplex","Horn").partNumber,"HN-101");
 assert.equal(recallPart(memory,"Electrical / Multiplex","MOD light"),undefined);
 assert.equal(recallPart(memory,"Bus Controls","Speedometer"),undefined);

 // a category default only applies where nothing more specific was learned
 memory=learnPart(memory,{category:"Bus Controls",issue:"Speedometer",partNumber:"CAT-9",scope:"category"},"2026-08-26T11:00:00.000Z");
 assert.equal(recallPart(memory,"Bus Controls","Speedometer").partNumber,"CAT-9");
 assert.equal(recallPart(memory,"Bus Controls","Anything Else").partNumber,"CAT-9");
 assert.equal(recallPart(memory,"Bus Controls","Horn").partNumber,"HN-101","the exact issue must win over its category");

 // re-learning the same slot replaces the part and counts the use
 memory=learnPart(memory,{category:"Bus Controls",issue:"Horn",partNumber:"HN-202"},"2026-08-26T12:00:00.000Z");
 assert.equal(recallPart(memory,"Bus Controls","Horn").partNumber,"HN-202");
 assert.equal(recallPart(memory,"Bus Controls","Horn").uses,2);
 assert.equal(memory.entries.filter(entry=>entry.scope==="issue"&&entry.issue==="Horn").length,1);

 // forgetting is scoped, and never blocks entry
 const forgotten=forgetPart(memory,"issue","Bus Controls","Horn");
 assert.equal(recallPart(forgotten,"Bus Controls","Horn").partNumber,"CAT-9","falls back to the category default");
 assert.equal(forgetPart(forgotten,"category","Bus Controls").entries.length,0);

 // an unusable entry is never learned or kept
 assert.equal(learnPart(memory,{category:"Bus Controls",issue:"Horn",partNumber:"   "}).entries.length,memory.entries.length);
 assert.equal(learnPart(memory,{category:"",issue:"Horn",partNumber:"X-1"}).entries.length,memory.entries.length);
 assert.equal(normalizePartsMemory({entries:[{scope:"issue",category:"A",partNumber:"P"}]}).entries.length,0,"an issue mapping needs its issue");
 assert.equal(normalizePartsMemory({entries:[{scope:"category",category:"A",partNumber:"P",updatedAt:"nope"}]}).entries.length,1);
 // The key normalises through migrateRepairIdentity, so a legacy category name
 // resolves to the one the split left it under.
 assert.equal(partMemoryKey("category","Bus Controls"),"category::operator/driver controls");
 assert.match(partMemoryLabel({scope:"category",category:"Bus Controls",partNumber:"X"}),/every defect/);

 // a runaway payload cannot fill device storage
 const flood={entries:Array.from({length:PARTS_MEMORY_LIMIT+40},(_,index)=>({scope:"issue",category:"C"+index,issue:"I",partNumber:"P"+index,updatedAt:new Date(1e12+index*1000).toISOString()}))};
 assert.equal(normalizePartsMemory(flood).entries.length,PARTS_MEMORY_LIMIT);
});

test("parts memory survives storage that is blocked or corrupt",()=>{
 const values=new Map();
 const storage={getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,value)};
 assert.equal(writePartsMemory(storage,learnPart(EMPTY_PARTS_MEMORY,{category:"Doors",issue:"Front door",partNumber:"D-7"})),true);
 assert.equal(recallPart(readPartsMemory(storage),"Doors","Front door").partNumber,"D-7");
 assert.equal(PARTS_MEMORY_STORAGE_KEY,"pace-parts-memory-v1");

 values.set(PARTS_MEMORY_STORAGE_KEY,"{not json");
 assert.deepEqual(readPartsMemory(storage),{entries:[]});

 const blocked={getItem(){throw new Error("blocked")},setItem(){throw new Error("blocked")}};
 assert.deepEqual(readPartsMemory(blocked),{entries:[]});
 assert.equal(writePartsMemory(blocked,EMPTY_PARTS_MEMORY),false);
 assert.deepEqual(readPartsMemory(null),{entries:[]});
});

test("both repair workflows offer a remembered part without imposing or blocking one",async()=>{
 const [log,fixed,catalog,logCss,fixedCss,list]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/defects/repair-catalog.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
  readFile(new URL("../src/components/defects/parts-used-list.tsx",import.meta.url),"utf8"),
 ]);

 for(const [name,page] of [["defect log",log],["fixed repairs",fixed]]){
  assert.match(page,/PARTS USED/,name);
  assert.match(page,/REMEMBER FOR EVERY /,name);
  assert.match(page,/REMEMBERED/,name);
  assert.match(page,/>FORGET<\/button>/,name);
  /* THE BOXES THEMSELVES MOVED into the shared list component - two routes draw
     it, so a copy in each page would drift. Each page has to DRAW it; importing
     it and never rendering it is the failure this pair catches. */
  assert.match(page,/import PartsUsedList from "@\/src\/components\/defects\/parts-used-list"/,name);
  assert.match(page,/<PartsUsedList parts=\{/,name);
  // learning happens on save and is never a precondition of saving
  assert.match(page,/learnPart\(current,\{category:/,name);
  /* ONE PART IS LEARNED, AND IT IS THE FIRST, which corrects a claim this
     change first made. Both forms reduced `learnPart` over every numbered part
     and called it "learns every part"; a reviewer disproved it. `learnPart`
     keeps ONE entry per scope+category+issue and REPLACES it, so reducing over
     [HX-99, ZZ-1] left a single entry holding ZZ-1 with `uses:2` - the shop
     taught the LAST part, with an inflated count. Driven below rather than
     asserted. */
  assert.match(page,/partToLearn\(/,name);
  // a legacy record with a part number still shows it
  assert.match(page,/partsUsed\?\?Boolean\(String\(/,name);
  /* AND A SUGGESTION STILL NEVER OVERWRITES TYPING. It seeds the FIRST row and
     only an empty one, which is what it did when there was one pair of boxes. */
  assert.match(page,/suggestion&&!?[\s\S]{0,60}?String\((?:first|current\[0\])[\s\S]{0,40}?partNumber/,name);
 }

 /* THE LIST'S OWN LABELS live in the component now. Asserted there rather than
    in the pages, because that is where they are - and the component is where a
    rename would happen. */
 assert.match(list,/PART NUMBER/);
 assert.match(list,/PART NAME \(OPTIONAL\)/);
 assert.match(list,/Leave blank if the number is unknown/);
 assert.match(list,/ADD_PART_LABEL\s*=\s*"ADD ANOTHER PART"/,"the way to add a second part has to say so");
 assert.match(list,/<b>REMOVE<\/b>/);
 /* REMOVE IS NOT OFFERED ON A LONE ROW, because removing it cannot empty the
    list - unticking PARTS USED is the one gesture that means no parts. */
 assert.match(list,/\{\s*many\s*&&\s*\([\s\S]{0,400}?className="remove-part"/,"a lone row must not offer REMOVE");
 /* AND THE LIST HOLDS NO RULES: every decision about what a part is and what
    gets stored is in the lib, so the MCP route can ask the same question
    rather than reimplementing it. */
 for(const rule of ["partsUsed:","localStorage","learnPart","partNumber.trim()"])
  assert.ok(!list.includes(rule),"the parts list is deciding "+rule+" instead of drawing rows");

 // the record keeps its own snapshot, separate from the learned mapping
 assert.match(catalog,/partsUsed\?:boolean;/);
 assert.match(catalog,/partName\?:string;/);
 assert.match(catalog,/parts\?:DefectPart\[\];/,"the record has to be able to hold more than one part");
 /* WRITTEN THROUGH THE ONE ASSEMBLER, AND THE ASSEMBLER DELETES THE KEY.

    This asserted the exact `...defectPartFields(draft.partsUsed?draft.parts:[])`
    spread - and a reviewer showed that spread was itself the bug, so the test
    was locking it in. `defectPartFields` OMITS `parts` for a 0- or 1-part list
    by design, and a missing key does not override the one the stored record
    still carries: a repair that had held two parts kept both after a REMOVE,
    and after unticking PARTS USED entirely. Only `withDefectParts`, which
    `delete`s the key first, can say "this field is gone".

    DRIVEN, not matched, for the same reason. */
 assert.match(fixed,/withDefectParts\(\{\.\.\.defect,category:draft\.category/,
  "Fixed Repairs has to build the saved record through the assembler");
 /* AND THE CHECKBOX GOES THROUGH THE ASSEMBLER AS ITS THIRD ARGUMENT, not
    patched on after it. Fixed Repairs appended `partsUsed:draft.partsUsed`,
    which fixed this page and left the Defect Log broken in exactly the same
    way - two places deciding one thing, which is what that function exists to
    stop. Every call site that has a checkbox passes it. */
 assert.match(fixed,/draft\.partsUsed\?draft\.parts:\[\],draft\.partsUsed\)/,
  "Fixed Repairs hands the checkbox to the assembler");
 /* THE ASSIGNMENT, not one closing layout. This required `})` after it, so an
    override followed by another field - `partsUsed:draft.partsUsed,completedBy:…`
    - walked past. Matched to a comma or a brace instead. */
 assert.doesNotMatch(fixed,/partsUsed\s*:\s*draft\.partsUsed\s*[,}]/,
  "and does not then overrule it from outside");
 assert.match(log,/withDefectParts\(current\.defect,next,partsUsed\)/,
  "the Defect Log's rows carry the checkbox too");
 assert.match(log,/withDefectParts\(current\.defect,\[\],false\)/,
  "unticking says so explicitly rather than relying on the rows being empty");
 assert.match(log,/withDefectParts\(cur\.defect,rows,true\)/);
 /* ENTER LATER IS SOMEBODY SAYING A PART WAS USED, so it passes `true`. The
    prompt promises in as many words that the repair "is marked MISSING PART #
    on the Fixed Repairs page until the number is added" - and it arrives here
    with an EMPTY number, which the assembler read as "no parts were used", so
    the repair saved completed with no flag and the promise on screen was
    false. A reviewer reproduced it in a browser against this branch. */
 assert.match(log,/validateAndSave\(true,\{\},\{rows:next,used:true\}\)/,
  "ENTER LATER has to store partsUsed:true or its own promise is a lie");
 /* AND IT MUST NOT ERASE A NUMBER ALREADY TYPED. ENTER LATER arrives with an
    EMPTY number, and writing that over the first row wiped a part the mechanic
    had entered on the form a moment earlier - the prompt even opens prefilled
    with it. Only a number given here replaces the row. */
 assert.match(log,/const next=number\?\[\{id:first\?first\.id:"part-0",partNumber:number/,
  "a number given at the prompt replaces the first row");
 assert.match(log,/\.\.\.rows\.slice\(1\)\]:rows;/,
  "and an empty one keeps what the form already holds");
 {
  /* DRIVEN over the real assembler, the three cases that matter. */
  const held={id:"d1",partsUsed:true,partNumber:"HX-99"};
  const rows=normalizeDefectParts(held.parts,held),first=rows[0];
  const enterLater=number=>withDefectParts(held,
   number?[{id:first?first.id:"part-0",partNumber:number,...(first?.partName?{partName:first.partName}:{})},...rows.slice(1)]:rows,true);
  assert.equal(enterLater("").partNumber,"HX-99","ENTER LATER keeps a number already on the record");
  assert.equal(defectPartsMissing(enterLater("")),false,"so it is not flagged as missing");
  assert.equal(enterLater("ZZ-1").partNumber,"ZZ-1","a number typed at the prompt replaces it");
  const empty={id:"d2",partsUsed:true,partNumber:""};
  const emptyRows=normalizeDefectParts(empty.parts,empty);
  const nothingYet=withDefectParts(empty,emptyRows,true);
  assert.equal(nothingYet.partsUsed,true);
  assert.equal(defectPartsMissing(nothingYet),true,"and with no number anywhere it still flags");
 }
 {
  /* DRIVEN END TO END: the state ENTER LATER writes must be the state the
     Fixed Repairs card flags. */
  const later=withDefectParts({id:"d1",partsUsed:false,partNumber:"",partName:""},
   [{id:"part-0",partNumber:""}],true);
  assert.equal(later.partsUsed,true,"a ticked box with nothing typed is still a part used");
  assert.equal(later.partNumber,"");
  assert.ok(!("parts" in later),"and it stores the legacy shape, not an array of blanks");
  assert.equal(defectPartsMissing(later),true,"so the card says MISSING PART #");
  assert.deepEqual(normalizeDefectParts(later.parts,later),[{id:"part-0",partNumber:""}],
   "and it reads back as one blank row to type into");
  /* UNTICKING STILL WINS OVER A ROW LEFT IN THE LIST. */
  const off=withDefectParts({id:"d1",parts:[{id:"a",partNumber:"HX-99"}]},
   [{id:"a",partNumber:"HX-99"}],false);
  assert.equal(off.partsUsed,false);
  assert.ok(!("parts" in off),"unticking clears the array whatever the rows hold");
  assert.equal(defectPartsMissing(off),false,"no parts used is not a missing part");
  /* AND OMITTING THE ARGUMENT CHANGES NOTHING for a caller without a checkbox,
     which is every read-side caller. */
  assert.equal(withDefectParts({},[{id:"part-0",partNumber:""}]).partsUsed,false);
  assert.equal(withDefectParts({},[{id:"a",partNumber:"HX-99"}]).partsUsed,true);
 }
 /* AND THE DEFECT LOG'S MERGE HAS TO NAME IT. `{...existing,...incoming}`
    cannot express "this field is gone", which is why `workStates` and
    `downSheetRecommendation` are already listed explicitly there; that file's
    own comment says anything deleting its key belongs on the line, and this
    change had to be told twice. */
 const sync=await readFile(new URL("../src/lib/defects/defect-log-sync.ts",import.meta.url),"utf8");
 assert.match(sync,/\.\.\.existing,\.\.\.incoming,[^}]*parts:incoming\.parts/,
  "a cleared parts array has to survive the save merge");

 /* THE TRANSITIONS, driven over the real assembler: two parts down to one,
    and two parts down to none. Both used to read back as two. */
 const held={partsUsed:true,partNumber:"HX-99",partName:"Gasket",
  parts:[{id:"a",partNumber:"HX-99",partName:"Gasket"},{id:"b",partNumber:"ZZ-1"}]};
 const downToOne=withDefectParts(held,[{id:"a",partNumber:"HX-99",partName:"Gasket"}]);
 assert.deepEqual(normalizeDefectParts(downToOne.parts,downToOne).map(part=>part.partNumber),["HX-99"],
  "removing a part has to stick");
 const downToNone=withDefectParts(held,[]);
 assert.deepEqual(normalizeDefectParts(downToNone.parts,downToNone),[],
  "unticking PARTS USED has to stick");
 assert.equal(downToNone.partsUsed,false);
 /* AND AN ENTER LATER RECORD - ticked, no number yet - keeps its flag through a
    save that touches nothing, or MISSING PART # silently disappears off its
    card. The regression a reviewer found against main. */
 assert.equal(defectPartsMissing({partsUsed:true,partNumber:"",partName:""}),true);

 /* PARTS USED IS THE CHECKBOX'S OWN STATE, NOT A READING OF THE RECORD. It was
    derived, and `defectPartFields` reports `partsUsed:false` the moment every
    row is blank - so pressing ADD ANOTHER PART on an empty row unticked the box
    and unmounted the whole section mid-edit: a reviewer measured -256px of
    content shift on a phone with focus dropped to the body. Only the checkbox
    means "no parts were used"; a blank row means somebody is typing. */
 assert.match(log,/const \[partsUsed,setPartsUsed\]=useState\(\(\)=>value\.defect\.partsUsed\?\?/,
  "the checkbox has to hold its own state, seeded from the record");
 assert.doesNotMatch(log,/const partsUsed=value\.defect\.partsUsed\?\?/,
  "deriving it from the record collapses the section while somebody is typing");
 assert.match(log,/setPartsUsed\(checked\)/,"and the toggle has to drive it");

 /* A DIFFERENT REPAIR TAKES DIFFERENT PARTS. Both pickers cleared the mirrored
    pair and left the array, so re-ticking PARTS USED after a category change
    brought the PREVIOUS repair's rows back and blocked the new suggestion. */
 for(const picker of [/category,issue:"",symptoms:\[\][\s\S]{0,160}?parts:undefined/,/category,issue,partsUsed:false,partNumber:"",partName:"",parts:undefined/])
  assert.match(log,picker,"a Defect Log picker has to clear the parts array");
 /* AND THE SCREEN HAS TO AGREE WITH THE RECORD. Once the box and the rows
    became local state, clearing only the record left the tick on screen with
    HX-99 still in the input over a record holding no part: SAVE dropped it
    with nothing saying so. Shown and silently discarded is worse than the
    stale-part bug it replaced, and a reviewer reproduced both. */
 assert.match(log,/const clearPartsOnScreen=\(\)=>\{setPartsUsed\(false\);setPartRows\(\[\]\)\}/,
  "there is one way to clear the part on screen");
 /* AND THE SECTION HOLDING ALL OF THIS HAS TO HAVE A BOX. `overflow:hidden` on
    `.advanced-defect-details` collapsed the `<details>` to its two borders -
    measured 2px, with a correct 48px `<summary>` clipped away inside it - so
    ADVANCED DETAILS, and therefore PARTS USED, could not be opened by a tap or
    a click at all. Only a keyboard could, which is why nothing errored and
    nothing caught it. Bisected live: `hidden` gives 2px, `clip` and `visible`
    give 50px at 390 and 48px at 1180. `clip` keeps the inner grid inside the
    rounded frame, which is what the rule was for.

    The gate bans `hidden` by name rather than asserting a height, because the
    resolver cannot lay a page out - but the name IS the cause here, and a
    reviewer reading this has the measurement above. */
 assert.match(logCss,/\.advanced-defect-details\{[^}]*overflow:clip\}/,
  "the disclosure clips without collapsing to its own border");
 assert.doesNotMatch(logCss,/\.advanced-defect-details\{[^}]*overflow:hidden/,
  "overflow:hidden flattens this <details> to 2px and takes PARTS USED with it");
 /* THE FIRST STATEMENT, not merely present somewhere. `body.includes(...)` is
    satisfied by a call that never runs: `if(0)clearPartsOnScreen();` passed the
    whole suite. A reviewer found it. It has to be the thing the handler does
    before anything else, which is also the only ordering that cannot race the
    `setValue` beside it. */
 for(const handler of ["chooseCategory","chooseIssue"]){
  const body=bodyOfSource(log,handler);
  assert.match(body,/^\{\s*clearPartsOnScreen\(\);/,
   handler+" has to clear the part on screen first, not somewhere: "+body.slice(0,90));
 }
 for(const picker of [/category:event\.target\.value,issue:"",quantity:"",parts:\[\]/,/issue:event\.target\.value,quantity:"",parts:\[\]/])
  assert.match(fixed,picker,"a Fixed Repairs picker has to clear the parts array");

 /* THE PART THE MEMORY TAKES IS THE FIRST NUMBERED ONE, not simply the first
    row: a name-only row carries nothing the memory could suggest. */
 assert.equal(partToLearn([{id:"a",partName:"long bolt"},{id:"b",partNumber:"ZZ-1"}])?.partNumber,"ZZ-1",
  "a name-only first row must not be what gets learned");
 assert.equal(partToLearn([{id:"a",partNumber:"HX-99"},{id:"b",partNumber:"ZZ-1"}])?.partNumber,"HX-99");
 assert.equal(partToLearn([{id:"a",partName:"bolt"}]),null);

 /* EVERY PART IS SHOWN AND SEARCHABLE. A second part was stored and rendered
    nowhere in the app, which made the list pointless from a mechanic's side -
    `defectPartsText` existed and nothing called it. */
 for(const [name,page] of [["defect log",log],["fixed repairs",fixed]]){
  assert.match(page,/defectPartsText\(normalizeDefectParts\(record\.defect\.parts,record\.defect\)\)/,
   name+" has to render every part, not just the first");
  assert.ok(!/\{record\.defect\.partNumber&&</.test(page),
   name+" still renders the first part alone");
 }
 assert.match(fixed,/shopNotes,defectPartsText\(normalizeDefectParts\(record\.defect\.parts,record\.defect\)\),/,
  "and a second part has to be findable by the search");

 /* THE BEHAVIOUR, driven rather than read. A record saved with one part reads
    back as a one-part list and nothing on disk is rewritten; a second part is
    stored as an array; going back to one removes the array again. */
 const legacy={partsUsed:true,partNumber:"HX-99",partName:"Gasket"};
 assert.deepEqual(normalizeDefectParts(legacy.parts,legacy).map(part=>[part.partNumber,part.partName]),
  [["HX-99","Gasket"]],"a one-part record read as a list");
 const two=addDefectPart(normalizeDefectParts(legacy.parts,legacy));
 const typed=updateDefectPart(two,two[1].id,{partNumber:"ZZ-1",partName:"Sensor"});
 const saved=withDefectParts(legacy,typed);
 assert.equal(saved.partNumber,"HX-99","the first part stays mirrored for a device on an older release");
 assert.equal(saved.parts.length,2,"and the second part is stored");
 assert.deepEqual(normalizeDefectParts(saved.parts,saved).map(part=>part.partNumber),["HX-99","ZZ-1"]);
 /* BACK DOWN TO ONE DELETES THE ARRAY rather than leaving it as `undefined`:
    `rowFingerprint` walks `Object.keys`, so a key holding undefined moves a
    row's cloud fingerprint on a push carrying nothing new. */
 assert.ok(!("parts" in withDefectParts(saved,[typed[0]])),"one part must store no array at all");
 /* A BLANK ROW IS NEVER STORED - somebody pressing ADD ANOTHER PART and
    changing their mind must not leave an empty part on a repair's history. */
 assert.ok(!("parts" in withDefectParts(legacy,addDefectPart(normalizeDefectParts(legacy.parts,legacy)))));
 /* A ROW WITH ONLY A NAME IS KEPT - "the long bolt behind the alternator" is
    how a part gets recorded when nobody can find its number - and it is not
    counted as missing, but it teaches the memory nothing it could suggest. */
 const named=withDefectParts({},[{id:"a",partName:"long bolt"}]);
 assert.equal(named.partsUsed,true);
 assert.equal(defectPartsMissing(named),false,"a named part is not a missing one");
 assert.equal(partsToLearn(normalizeDefectParts(named.parts,named)).length,0);
 /* AND THE OLD FLAG KEEPS ITS MEANING: PARTS USED ticked with nothing typed is
    still what the Fixed Repairs card flags. */
 assert.equal(defectPartsMissing({partsUsed:true}),true);
 assert.equal(defectPartsMissing({partsUsed:false}),false);

 for(const [name,css] of [["defect log",logCss],["fixed repairs",fixedCss]]){
  assert.match(css,/\.parts-used-block\{/,name);
  assert.match(css,/\.parts-remembered button\{min-height:36px/,name);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.parts-remembered button\{min-height:44px;width:100%\}/,name);
  /* THE TWO NEW CONTROLS REACH A THUMB TARGET on the device these forms are
     used on, and the separator fires only BETWEEN rows so a one-part repair
     looks exactly as it did. */
  assert.match(css,/\.parts-row\+\.parts-row\{border-top/,name+" needs a separator between rows, not on every row");
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.parts-row \.remove-part\{min-height:44px/,name);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.parts-list \.add-part\{min-height:44px/,name);
 }
});

test("starting and charging covers crank-no-start and single-station starting",()=>{
 const starting=REPAIR_OPTIONS["Battery, Starting and Charging"];
 // the symptom cluster reads in diagnostic order next to the existing No crank
 // "Alternator / charging" used to close this run and is retired from the
 // picker; Alternator failure and Voltage regulator carry that work now, from
 // the top of the category where they get found.
 const order=["No crank","Crank no start","Intermittent no start","Front start INOP","Rear start INOP","Starter","Solid battery light","Flashing battery light","Starting / charging diagnosis"];
 // solid and flashing are separate diagnostic paths, so they are separate options
 assert.ok(starting.includes("Solid battery light")&&starting.includes("Flashing battery light"));
 const at=starting.indexOf("No crank");
 assert.ok(at>=0);
 assert.deepEqual(starting.slice(at,at+order.length),order);
 assert.equal(new Set(starting).size,starting.length,"no duplicated option in the category");
 // each new option survives a round trip through a saved defect
 // the retired one included: taking it off the picker must not touch a record
 for(const issue of ["Crank no start","Front start INOP","Rear start INOP","Voltage regulator","Alternator failure","Alternator / charging"]){
  const [defect]=normalizeDefects([{id:"d-"+issue,category:"Battery, Starting and Charging",issue,details:"",state:"open",operability:"down"}]);
  assert.equal(defect.issue,issue);
  assert.ok(defectLabel(defect).includes(issue));
 }
});

test("merged categories move old records instead of losing them",()=>{
 // No Start duplicated Battery, Starting and Charging and is gone from the picker
 assert.equal(REPAIR_OPTIONS["No Start"],undefined);
 assert.equal(Object.keys(REPAIR_OPTIONS).length,21);

 // every option the old category offered still has a home
 const starting=REPAIR_OPTIONS["Battery, Starting and Charging"];
 for(const issue of ["No crank","Crank no start","Intermittent no start","Starting / charging diagnosis","Other starting or charging repair"]) assert.ok(starting.includes(issue),issue);

 // a defect logged under the old category opens under the new one, keeping its meaning
 assert.deepEqual(migrateRepairIdentity("No Start","Cranks / no start"),{category:"Battery, Starting and Charging",issue:"Crank no start"});
 assert.deepEqual(migrateRepairIdentity("No Start","Starting-system diagnosis"),{category:"Battery, Starting and Charging",issue:"Starting / charging diagnosis"});
 assert.deepEqual(migrateRepairIdentity("No Start","Other no-start diagnosis"),{category:"Battery, Starting and Charging",issue:"Other starting or charging repair"});
 // wording with no clean equivalent is preserved rather than guessed at
 assert.deepEqual(migrateRepairIdentity("No Start","Fuel-related no start"),{category:"Battery, Starting and Charging",issue:"Fuel-related no start"});
 // the earlier renames still apply
 assert.deepEqual(migrateRepairIdentity("Operator Controls","MDT Screen"),{category:"Operator/Driver Controls",issue:"IBS Screen"});
 assert.deepEqual(migrateRepairIdentity("","" ),{category:"Miscellaneous",issue:"Driver-reported defect"});

 // Horn lived in two categories; it now resolves to one without changing its text
 assert.equal(REPAIR_OPTIONS["Electrical / Multiplex"].includes("Horn"),false);
 assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("Operating Controls - Horn"));
 // Horn lands in Bus Controls and then in its picking group, in one step
 assert.deepEqual(migrateRepairIdentity("Electrical / Multiplex","Horn"),{category:"Operator/Driver Controls",issue:"Operating Controls - Horn"});
 assert.deepEqual(migrateRepairIdentity("Electrical / Multiplex","MOD light"),{category:"Electrical / Multiplex",issue:"MOD light"});

 // reading a stored record applies the move, and the No Horn quick filter still matches
 const [moved]=normalizeDefects([{id:"legacy-1",category:"No Start",issue:"Cranks / no start",details:"Turns over, will not fire",state:"open",operability:"down"}]);
 assert.equal(moved.category,"Battery, Starting and Charging");
 assert.equal(moved.issue,"Crank no start");
 assert.equal(moved.details,"Turns over, will not fire");
 assert.equal(moved.id,"legacy-1");
 const horn={id:"legacy-2",category:"Electrical / Multiplex",issue:"Horn",details:"",state:"open",operability:"service"};
 assert.equal(normalizeDefects([horn])[0].category,"Operator/Driver Controls");
 assert.ok(quickFilterMatch({id:"bus-1",defects:[horn]},"no-horn"),"the No Horn filter matches on text, not category");
});

test("a stored Steering defect keeps its wording under the merged category",()=>{
 // Curtis asked what happens to records already saved as Steering. They are not
 // rewritten in storage: they surface under the merged name as they are read.
 const stored=[
  {id:"s1",category:"Steering",issue:"Steering pull",details:"Pulls right",state:"open",operability:"service"},
  {id:"s2",category:"Steering",issue:"Other steering repair",details:"Wander",state:"open",operability:"service"},
  {id:"s3",category:"Suspension",issue:"Air bag",details:"",state:"open",operability:"service"},
 ];
 const read=normalizeDefects(stored);
 assert.deepEqual(read.map(defect=>defect.category),["Suspension and Steering","Suspension and Steering","Suspension and Steering"]);
 // the specific complaint is untouched; only the two catch-alls were combined
 assert.deepEqual(read.map(defect=>defect.issue),["Steering pull","Other suspension or steering repair","Air bag"]);
 assert.deepEqual(read.map(defect=>defect.id),["s1","s2","s3"]);
 assert.equal(read[0].details,"Pulls right");
 assert.equal(defectLabel(read[0]),"Suspension and Steering — Steering pull — Pulls right");
 // the retired names are gone from the picker but still resolve on read
 assert.equal(REPAIR_OPTIONS.Steering,undefined);
 assert.equal(REPAIR_OPTIONS.Suspension,undefined);

 // loose steering is a distinct driver complaint, not "steering pull"
 const steering=REPAIR_OPTIONS["Suspension and Steering"];
 assert.equal(steering.includes("Front air bag leak"),false,"Pneumatic System owns confirmed air-bag leaks");
 assert.equal(steering.includes("Rear air bag leak"),false,"Pneumatic System owns confirmed air-bag leaks");
 assert.equal(steering.includes("Air bag"),false,"the vague legacy choice is retired from new entries");
 for(const side of ["C/S","R/S"]){
  const note=defectNote("Suspension and Steering","Bus leaning - "+side);
  assert.match(note,/leaking air bag or a leveling-valve fault/i);
  assert.match(note,/edit this same defect/i);
  assert.match(note,/Pneumatic System/i);
 }
 const historical=normalizeDefects([{id:"old-front",category:"Suspension and Steering",issue:"Front air bag leak",state:"open",operability:"service"}]);
 assert.equal(historical[0].issue,"Front air bag leak","retiring the duplicate picker choice does not rewrite history");
 assert.ok(steering.includes("Loose steering"));
 assert.ok(steering.indexOf("Loose steering")<steering.indexOf("Steering pull"));
 // A count here breaks on every legitimate addition and proves nothing. What
 // the merge actually had to guarantee is that nothing arrived twice.
 assert.equal(new Set(steering).size,steering.length,"no duplicated option after the merge");

 // NVH is one entry, not a dropdown of every combination of front, rear,
 // turning, straight and speed. Those are the description, and the note asks
 // for them so they arrive in a shape the next person can act on.
 assert.equal(steering[0],"NVH (noise, vibration, harshness)");
 assert.equal(steering.filter(issue=>/noise|vibration|harshness/i.test(issue)).length,1);
 assert.match(defectNote("Suspension and Steering","NVH (noise, vibration, harshness)"),/front or rear/i);
 assert.match(defectNote("Suspension and Steering","NVH (noise, vibration, harshness)"),/speed/i);
 // grease fittings live only here: the inspection walk that marks off missing
 // fittings covers the whole underside, driveshaft included
 assert.ok(steering.includes("Missing grease fitting (Zerk)"));
 assert.ok(steering.includes("Grease fitting will not take grease"));
 assert.equal(REPAIR_OPTIONS["Transmission and Drivetrain"].some(option=>/grease|zerk/i.test(option)),false,"no second copy under the drivetrain");
 assert.equal(defectLabel({category:"Suspension and Steering",issue:"Loose steering",details:"Play in the wheel"}),
  "Suspension and Steering — Loose steering — Play in the wheel");
});

test("ADA securement and stop request have a home in Bus Accessories",()=>{
 const ada=REPAIR_OPTIONS["Bus Accessories"];
 assert.equal(REPAIR_OPTIONS["Doors, Ramp and Lift"],undefined);
 const groups=REPAIR_OPTION_GROUPS["Bus Accessories"];
 assert.deepEqual(Object.keys(groups),["Doors","Ramp, Lift and Kneeler","Wheelchair Securement","Stop Request","Bike Rack","Wipers and Washers"]);

 /* WIPERS, added last so nothing above it moved in the picker. Curtis asked for
    the blades and the motors and settled the category himself — "maybe bus
    accessories is more appropriate" — over Driver Controls. He is right: the
    operator works the switch from the seat, but the part that fails is out on
    the glass, and the switch already has its own home in System Switches.

    Each side is its own blade on its own arm driven by its own motor, so all
    four carry a side the way the securement and stop-request options do. A
    sheet that says "wipers INOP" does not say which side, and that is exactly
    what these options exist to pin down. */
 for(const side of ["curbside","roadside"]){
  assert.ok(groups["Wipers and Washers"].includes("Wiper blade ("+side+")"),side+" blade");
  assert.ok(groups["Wipers and Washers"].includes("Wiper motor ("+side+")"),side+" motor");
  assert.ok(groups["Wipers and Washers"].includes("Washer nozzle ("+side+")"),side+" nozzle");
 }
 /* The washers are the same control on the same glass, so they share the group
    and the group is named for both. Only the NOZZLES take a side: one pump
    feeds one reservoir, so those two are whole-bus. */
 for(const wholeBus of ["Washer not spraying","Washer pump","Washer reservoir / leaking"]){
  assert.ok(groups["Wipers and Washers"].includes(wholeBus),wholeBus+" is one per bus, not one per side");
  for(const side of ["curbside","roadside"])
   assert.equal(groups["Wipers and Washers"].includes(wholeBus+" ("+side+")"),false,wholeBus+" must not be split per side");
 }
 assert.ok(groups["Wipers and Washers"].includes("Other wiper or washer defect"),"the catch-all every other group here has");
 assert.equal(groups["Wipers"],undefined,"the group carries both names, not just the wipers");

 // the Q'STRAINT panel and the straps are separate units per side of the bus
 for(const side of ["curbside","roadside"]){
  assert.ok(groups["Wheelchair Securement"].includes("Q'STRAINT switch ("+side+")"),side+" switch");
  assert.ok(groups["Wheelchair Securement"].includes("Securement straps / retractor ("+side+")"),side+" straps");
  assert.ok(groups["Wheelchair Securement"].includes("Flip-up bench seat ("+side+")"),side+" bench");
 }
 // stop request existed nowhere in the catalog before
 /* The single wheelchair-area option became one per side, so a record logged
     under the old one cannot be given a side and keeps its own wording. */
 assert.ok(groups["Stop Request"].includes("Stop request INOP (wheelchair area - curbside)"));
 assert.ok(groups["Stop Request"].includes("Stop request INOP (wheelchair area - roadside)"));
 assert.equal(groups["Stop Request"].includes("Stop request (wheelchair area)"),false);
 assert.ok(groups["Stop Request"].includes("Stop request INOP (curbside)"));
 assert.ok(groups["Stop Request"].includes("Stop request chime / tone"));
 assert.ok(groups["Stop Request"].includes("Stop request pull cord / line - broken (curbside)"));
 assert.ok(groups["Stop Request"].includes("Stop request pull cord / line - broken (roadside)"));

 // the picker and the flat list cannot drift apart
 const flat=Object.entries(groups).flatMap(([group,items])=>items.map(item=>group+" - "+item));
 assert.deepEqual([...ada].sort(),[...flat].sort());

 // every option the retired category offered still resolves
 for(const [issue,expected] of [
  ["Front door","Doors - Front door"],
  ["Rear door","Doors - Rear door"],
  ["Door controls","Doors - Door controls"],
  ["Interlock","Doors - Interlock"],
  ["Wheelchair ramp","Ramp, Lift and Kneeler - Wheelchair ramp"],
  ["Kneeler","Ramp, Lift and Kneeler - Kneeler"],
  ["Wheelchair lift","Ramp, Lift and Kneeler - Wheelchair lift"],
 ]){
  assert.deepEqual(migrateRepairIdentity("Doors, Ramp and Lift",issue),{category:"Bus Accessories",issue:expected},issue);
  /* All of these stay pickable. Four were nearly retired on the reasoning that
     a specific symptom now covers each, until the live board showed they were
     the most-used options in the category — nine of its ten records. They are
     how a fault is logged when the door is known and the symptom is not. */
  assert.ok(ada.includes(expected),expected+" must be pickable");
 }
 // the old category-wide catch-all has no single new home, so its wording stands
 assert.deepEqual(migrateRepairIdentity("Doors, Ramp and Lift","Other accessibility repair"),
  {category:"Bus Accessories",issue:"Other accessibility repair"});

 // a stored record reads back under the new name with its details intact
 const [read]=normalizeDefects([{id:"ada-1",category:"Doors, Ramp and Lift",issue:"Kneeler",details:"Will not raise",state:"open",operability:"down"}]);
 assert.equal(read.category,"Bus Accessories");
 assert.equal(read.issue,"Ramp, Lift and Kneeler - Kneeler");
 assert.equal(read.details,"Will not raise");
 assert.equal(read.id,"ada-1");

 // the ADA quick filter keys off wording, so grouped names must keep matching
 assert.ok(quickFilterMatch({id:"bus-1",defects:[read]},"bad-ramp"));
 assert.equal(repairCategoryEmoji("Bus Accessories"),"♿");
});

test("mirror wording says who does the work, and the missing fixtures exist",()=>{
 const lights=REPAIR_OPTIONS["Lights, Mirrors and Alarms"],body=REPAIR_OPTIONS.Bodywork;

 // Curtis keeps mirrors in both categories on purpose: a mirror the mechanic
 // can simply swap is not the same job as glass the body shop has to do. The
 // wording now carries that distinction instead of reading as a duplicate.
 assert.ok(lights.includes("Mirror replacement (no body work)"));
 assert.ok(body.includes("Mirror damage (body shop)"));
 assert.ok(body.includes("Glass / windshield cracked or shattered"));
 assert.equal(lights.includes("Mirrors / fixtures"),false);
 assert.equal(body.includes("Mirror"),false);
 assert.equal(body.includes("Glass / windshield"),false);

 // The back-up alarm is exterior safety equipment with no control at the seat,
 // so it sits with the other swap-out safety fixtures. Bus Controls is the
 // driver's station and must not collect devices the operator never touches.
 assert.ok(lights.includes("Back-up alarm"));
 assert.equal(REPAIR_OPTIONS["Operator/Driver Controls"].some(option=>/back-?up alarm/i.test(option)),false);
 // it is not ADA equipment, so the chair mark must not land on it
 assert.equal(repairIssueDisplayLabel("Back-up alarm"),"Back-up alarm");

 // the mirrors that were missing
 assert.ok(lights.includes("Interior mirror"));
 assert.ok(lights.includes("Outside rear view mirror - C/S"));
 assert.ok(lights.includes("Outside rear view mirror - R/S"));

 // the dash cam is an onboard electronic system, so it sits with the others
 assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Signs, Cameras and Other - Dash cam"));
 assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Signs, Cameras and Other - Camera / DVR system"));

 // lamps, not the stalk: Bus Controls keeps the turn signal switches
 assert.ok(lights.includes("Turn signal lamps"));
 assert.equal(lights.includes("Turn signals"),false);
 assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("Operating Controls - Turn signals (steering column)"));
 assert.ok(REPAIR_OPTIONS["Operator/Driver Controls"].includes("Operating Controls - Turn signals (floor panel)"));

 // renames are scoped to their category, so a word means one thing per place
 for(const [category,issue,expected] of [
  ["Lights, Mirrors and Alarms","Turn signals","Turn signal lamps"],
  ["Lights, Mirrors and Alarms","Mirrors / fixtures","Mirror replacement (no body work)"],
  ["Bodywork","Mirror","Mirror damage (body shop)"],
  ["Bodywork","Glass / windshield","Glass / windshield cracked or shattered"],
 ]){
  const moved=migrateRepairIdentity(category,issue);
  assert.deepEqual(moved,{category,issue:expected},category+" / "+issue);
  assert.ok(REPAIR_OPTIONS[category].includes(moved.issue),expected+" must be pickable");
 }
 // a rename in one category must not reach the same word in another
 assert.deepEqual(migrateRepairIdentity("Lights, Mirrors and Alarms","Headlights"),{category:"Lights, Mirrors and Alarms",issue:"Headlights"});
 /* The category was renamed: half of "Lights and Fixtures" was mirrors and one
    item was an audible alarm, so the name said less about its contents every
    year. Read-time like every rename here — a record logged under the old
    category still reads back, and nothing on disk moved. */
 assert.deepEqual(migrateRepairIdentity("Lights and Fixtures","Headlights"),{category:"Lights, Mirrors and Alarms",issue:"Headlights"});
 assert.equal(REPAIR_OPTIONS["Lights and Fixtures"],undefined,"the old name is a rename, not a second live category");
 assert.deepEqual(migrateRepairIdentity("Lights and Fixtures","Other light or fixture"),{category:"Lights, Mirrors and Alarms",issue:"Other light, mirror or alarm defect"},"the catch-all follows the name");

 // Warning lights was too vague to diagnose from and left the picker. Every
 // system that lights one already has its own entry.
 assert.equal(lights.includes("Warning lights"),false);
 assert.ok(REPAIR_OPTIONS["Electrical / Multiplex"].includes("MOD light"));
 assert.ok(REPAIR_OPTIONS.Brakes.includes("ABS warning"));
 assert.ok(REPAIR_OPTIONS["Battery, Starting and Charging"].includes("Solid battery light"));
 // the records that used it keep their wording and still read correctly
 const [kept]=normalizeDefects([{id:"warn-1",category:"Lights and Fixtures",issue:"Warning lights",details:"Amber lamp on",state:"open",operability:"service"}]);
 assert.equal(kept.issue,"Warning lights");
 assert.equal(defectLabel(kept),"Lights, Mirrors and Alarms — Warning lights — Amber lamp on","a record stored under the old category reads under the new name");
});

test("the chair mark flags ADA equipment without touching what gets stored",async()=>{
 const [page,logPage]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
 ]);
 // the two wheelchair groups carry the mark for everything inside them
 assert.equal(repairGroupDisplayLabel("Wheelchair Securement"),"♿ Wheelchair Securement");
 assert.equal(repairGroupDisplayLabel("Ramp, Lift and Kneeler"),"♿ Ramp, Lift and Kneeler");
 assert.equal(repairGroupDisplayLabel("Door, Ramp and Kneeler Failures"),"♿ ⚙️ Door, Ramp and Kneeler Failures");
 assert.equal(repairGroupDisplayLabel("Doors"),"Doors");
 assert.equal(repairGroupDisplayLabel("Driver Seat"),"Driver Seat");

 // a marked group speaks for its options, so they are not marked twice
 assert.equal(repairIssueDisplayLabel("Q'STRAINT switch (curbside)","Wheelchair Securement"),"Q'STRAINT switch (curbside)");
 assert.equal(repairIssueDisplayLabel("Kneeler","Ramp, Lift and Kneeler"),"Kneeler");

 // ADA items outside those groups are marked individually. The ramp and kneeler
 // switches stay in Bus Controls where the operator reaches them, and the mark
 // is what ties them back to the ramp itself.
 assert.equal(repairIssueDisplayLabel("Kneeler button","System Switches"),"♿ Kneeler button");
 assert.equal(repairIssueDisplayLabel("Ramp power switch","System Switches"),"♿ Ramp power switch");
 assert.equal(repairIssueDisplayLabel("Ramp deploy / stow switch","System Switches"),"♿ Ramp deploy / stow switch");
 assert.equal(repairIssueDisplayLabel("Stop request (wheelchair area)","Stop Request"),"♿ Stop request (wheelchair area)");
 assert.equal(repairIssueDisplayLabel("Horn","Operating Controls"),"Horn");
 assert.equal(repairIssueDisplayLabel("Bike rack - bent / replacement"),"Bike rack - bent / replacement");

 // display only: nothing stored, exported, or shown in the feed carries the
 // mark, or a record saved after this would differ from one saved before it
 for(const category of Object.keys(REPAIR_OPTIONS))
  for(const option of REPAIR_OPTIONS[category])
   assert.equal(option.includes("♿"),false,category+" / "+option+" must not store the mark");
 for(const category of Object.keys(REPAIR_OPTION_GROUPS))
  for(const group of Object.keys(REPAIR_OPTION_GROUPS[category]))
   assert.equal(group.includes("♿"),false,group+" must not store the mark");
 assert.equal(defectLabel({category:"Doors, Ramp and ADA",issue:"Wheelchair Securement - Q'STRAINT switch (curbside)",details:""}).includes("♿"),false);

 // every picker renders through the helpers rather than printing raw text
 assert.equal(page.match(/repairGroupDisplayLabel\(group\)/g).length,2);
 assert.equal(page.match(/repairIssueDisplayLabel\(issue,repairGroup\)/g).length,2);
 assert.equal(page.match(/repairIssueDisplayLabel\(issue\)/g).length,2);
 /* The Defect Log's picker no longer builds its own <optgroup>s — it draws rows
    the search index built, so the mark now has to come through THERE or it
    silently stops appearing. Assert it at the source rather than deleting the
    check: this is exactly the kind of invariant that dies quietly in a rewrite. */
 const searchIndex=await readFile(new URL("../src/lib/defects/defect-search.ts",import.meta.url),"utf8");
 assert.match(searchIndex,/groupLabel=repairGroupDisplayLabel\(group\)/);
 assert.match(searchIndex,/label:repairIssueDisplayLabel\(issue,group\)/);
 assert.match(searchIndex,/label:repairIssueDisplayLabel\(issue\)/);
 /* The mark has to survive in BOTH places the group name is now drawn — the
    section heading a browsing list is divided by, and the line under each row
    when the list is ranked. Both read row.groupLabel, which is where
    defect-search.ts put the mark; asserting only one of them would let the
    other quietly lose it. */
 assert.match(logPage,/hint:browsing\?undefined:\(row\.groupLabel\?row\.groupLabel\+" · "\+row\.categoryLabel:row\.categoryLabel\)/);
 assert.match(logPage,/section:browsing\?\(value\.defect\.category\?\(row\.groupLabel\|\|row\.categoryLabel\)/);
 /* Same move as the group label above: the option's own wording is built in the
    search index now, and the assertions on it sit with that file rather than
    here. What the PAGE still has to prove is that it draws the index's label
    instead of re-spelling the issue itself. */
 assert.match(logPage,/label:row\.label/);
 /* The flat-category branch went the same way — defect-search.ts builds those
    rows too, and its labels are asserted above. */
});

test("the Defect Log can show the tracker's status colours, off by default",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 // Off by default: more colour on a long list should be a choice, not something
 // that happens to people.
 const model=await readFile(new URL("../src/lib/defects/defect-log-settings.ts",import.meta.url),"utf8");
 assert.match(model,/statusColor:false/);
 assert.match(model,/statusColor=saved\.statusColor===true/);
 assert.match(page,/data-status-color=\{settings\.statusColor\?"on":"off"\}/);
 assert.match(page,/SHOW STATUS COLOR/);
 assert.match(page,/<span className="log-bus-number" data-status=\{group\.bus\.s\}>/);
 // The tracker's own status colours, so the two pages say the same thing about
 // the same bus. Green is a bus in service with defects, which is the case that
 // prompted this.
 assert.match(css,/\[data-status-color="on"\][^{]*\[data-status="defect"\] strong\{color:#159447\}/);
 assert.match(css,/\[data-status-color="on"\][^{]*\[data-status="out"\] strong\{color:#c91f27\}/);
 assert.match(css,/\[data-status-color="on"\][^{]*\[data-status="shop"\] strong\{color:#efa400\}/);
 assert.match(css,/\[data-status-color="on"\][^{]*\[data-status="service"\] strong\{color:#1764d8\}/);
});

test("a shared filter list collapses repeats and can go as a page",async()=>{
 const { quickFilterShareText, quickFilterShareHtml, quickFilterShareFilename, shareAreaLabel } =
  await import("../src/lib/defects/quick-filter-share.ts");
 const defect=(id,category,issue,details)=>({id,category,issue,details,operability:"service",state:"open",source:"defect-log"});

 // Bus 17543 as it actually is on the shop's board: the same overheat
 // photographed off the Down Sheet on three different days, each scan minting a
 // fresh id from the clock, two of them word-for-word identical and both
 // mentioning a farebox in the note. The shared list printed that sentence
 // twice, and a person reading it cannot tell whether that is two problems.
 const scanned={id:"c",n:"17543",l:"west-9",defects:[
  defect("s1","Cooling System","Overheating","R/C Overheats/ Farebox Won't Lock/ Rear End Shifted"),
  defect("s2","Cooling System","Overheating","R/C Overheats/ Farebox Won't Lock/ Rear End Shifted"),
 ]};
 const text=quickFilterShareText("Farebox",[scanned],"farebox");
 assert.equal(text.match(/Rear End Shifted/g).length,1,"the identical line should appear once");

 // Two genuinely different farebox faults are two lines. Collapsing is about
 // repeats, never about hiding a second real problem.
 const two={id:"b",n:"17533",l:"garage-2",defects:[
  defect("d2","Tech Services","Farebox",""),
  defect("d3","Tech Services","Farebox won't lock",""),
 ]};
 assert.equal(quickFilterShareText("Farebox",[two],"farebox").match(/Tech Services/g).length,2);

 // Where to walk is the thing somebody acts on, so it rides with the number.
 assert.match(text,/Bus 17543 {2}· {2}CNG West/);
 assert.equal(shareAreaLabel("offsite-3"),"Off Property");
 assert.equal(shareAreaLabel(""),"");
 assert.equal(shareAreaLabel(undefined),"");

 // The page version has to survive being opened from a text message on a phone
 // sitting in a garage with no signal, so it reaches for nothing at all.
 const html=quickFilterShareHtml("Farebox",[scanned,two],"farebox","Aug 31, 2026, 10:40 PM");
 assert.doesNotMatch(html,/https?:\/\//,"the shared page must not fetch anything");
 assert.doesNotMatch(html,/<script/i,"no scripts — some mail and message clients strip or block them");
 assert.match(html,/17543/);
 assert.match(html,/CNG West/);
 assert.match(html,/Farebox — 2 buses/);
 // A snapshot that quietly goes stale is worse than one that says it has.
 assert.match(html,/does not update/);

 // Anything typed by a person is escaped; a bus note containing a bracket must
 // not become markup.
 const risky={id:"x",n:"1<b>9",l:"road-1",defects:[defect("r","Tech Services","Farebox","<img src=x onerror=alert(1)>")]};
 const escaped=quickFilterShareHtml("Farebox",[risky],"farebox","now");
 assert.doesNotMatch(escaped,/<img src=x/);
 assert.match(escaped,/&lt;img src=x/);

 assert.equal(quickFilterShareFilename("A/C Buses",new Date("2026-08-31T00:00:00Z")),"pace-a-c-buses-2026-08-31.html");
});

test("the IntelligAIRE III panel is named in the A/C list",()=>{
 const ac=REPAIR_OPTIONS["A/C and HVAC"];
 const entry="Controls and Blowers - IntelligAIRE III control panel - screen blank / black";

 // The Thermo King panel on the bulkhead is called IntelligAIRE III, and the
 // screen going black is a fault in its own right. Until now the only place for
 // it was "Controls / electrical", which covers the whole A/C control side and
 // says nothing about which control — so a recurring, recognisable failure
 // arrived on the board indistinguishable from a wiring fault. Naming the panel
 // is the point: it is what somebody standing at the bus reads off the label.
 assert.ok(ac.includes(entry));
 // Sits with the other control entry rather than at the end of the list, since
 // that is where somebody looking for a control fault will already be.
 assert.equal(ac.indexOf(entry),ac.indexOf("Controls and Blowers - Controls / electrical")+1);

 /* A/C and HVAC IS GROUPED NOW, and this assertion used to say the opposite.
    It was right at the time: a group added then would have turned the whole
    category into a three-step picker for one entry's benefit. What changed is
    that winter gave the category a second half worth naming — Curtis asked for
    a no-heat list off a paper heat sheet — so the three-step picker is now
    paying for five heating entries rather than for this one panel.
    The panel sits in the group with the wiring and the blowers, which is the
    control side it was always part of. */
 assert.deepEqual(Object.keys(REPAIR_OPTION_GROUPS["A/C and HVAC"]),["Heating","Cooling","Controls and Blowers"]);
 assert.ok(REPAIR_OPTION_GROUPS["A/C and HVAC"]["Controls and Blowers"].includes("IntelligAIRE III control panel - screen blank / black"));

 // A blank display is not a road failure: the bus still runs.
 assert.equal(defaultDefectOperability("A/C and HVAC",entry),"service");

 // Survives a round trip under its stored name.
 const [defect]=normalizeDefects([{id:"d",category:"A/C and HVAC",issue:entry,details:"",state:"open",operability:"service"}]);
 assert.equal(defect.issue,entry);

 // The vague entry it was hiding inside stays, because the A/C control side has
 // faults that are not this panel. It is in the same group now.
 assert.ok(ac.includes("Controls and Blowers - Controls / electrical"));
});

test("bus accessories and the two start buttons land in both catalog structures",()=>{
 // THE GENERAL INVARIANT, which until now was only spot-checked on the two
 // mirror switches. A grouped category stores "Group - Issue" in REPAIR_OPTIONS
 // and draws the bare issue from REPAIR_OPTION_GROUPS. Adding an entry to one
 // and not the other gives a picker option that stores something the catalog
 // does not know, or a stored value nobody can choose — and neither shows up
 // until somebody is standing at a bus. Adding a whole new group is exactly
 // when this breaks, so it is asserted for every grouped category rather than
 // for the entries this change happens to add.
 for(const [category,groups] of Object.entries(REPAIR_OPTION_GROUPS)){
  const expected=Object.entries(groups).flatMap(([group,items])=>items.map(issue=>group+" - "+issue));
  assert.deepEqual(REPAIR_OPTIONS[category],expected,
   category+": REPAIR_OPTIONS must be exactly the grouped entries, in the same order");
 }

 const controls=REPAIR_OPTION_GROUPS["Operator/Driver Controls"];

 // A rack that comes back loose or missing an arm is a defect on a piece of
 // equipment, not body work and not scheduled maintenance.
 assert.deepEqual(REPAIR_OPTION_GROUPS["Bus Accessories"]["Bike Rack"],
  ["Arm replacement","Loose / pivots"]);
 // The group is last, so the existing groups keep the order the shop knows.
 const groupNames=Object.keys(controls);
 assert.equal(groupNames[0],"Driver Seat");
 assert.equal(groupNames[groupNames.length-1],"Operating Controls");

 // The two places a bike rack was already filed stay where they are: a bent
 // rack really is the body shop's job, and the PM line really is scheduled
 // work. This adds the reported-fault case rather than moving the other two.
 assert.ok(REPAIR_OPTIONS["Bodywork"].includes("Bike rack - bent / replacement"));
 assert.ok(REPAIR_OPTIONS["Preventive Maintenance"].includes("Bike rack - arms / pivot adjustment"));

 // Two buttons start the bus, so the picker names the station.
 const operating=controls["Operating Controls"];
 assert.ok(operating.includes("Front start button"));
 assert.ok(operating.includes("Rear start button"));
 assert.equal(operating.indexOf("Rear start button"),operating.indexOf("Front start button")+1);
 // The ambiguous one is retired rather than renamed: nothing can say which
 // button an old record meant, and guessing would relabel somebody's work.
 assert.ok(!operating.includes("Start button"));

 // Kept apart from the starting-system entries on purpose. Those say the bus
 // will not start from that station; these say the button is broken while the
 // other one still starts it.
 const battery=REPAIR_OPTIONS["Battery, Starting and Charging"];
 assert.ok(battery.includes("Front start INOP"));
 assert.ok(battery.includes("Rear start INOP"));

 // Neither downs a bus. A bus with one working start button still runs, and a
 // loose bike rack is not a road failure.
 for(const issue of ["Operating Controls - Front start button","Operating Controls - Rear start button"])
  assert.equal(defaultDefectOperability("Operator/Driver Controls",issue),"service",issue+" must not down a bus");
 for(const issue of ["Bike Rack - Arm replacement","Bike Rack - Loose / pivots"])
  assert.equal(defaultDefectOperability("Bus Accessories",issue),"service",issue+" must not down a bus");

 // Every new entry survives a round trip under its stored name.
 for(const issue of ["Operating Controls - Front start button","Operating Controls - Rear start button"]){
  const [defect]=normalizeDefects([{id:"d",category:"Bus Controls",issue,details:"",state:"open",operability:"service"}]);
  assert.equal(defect.issue,issue,issue+" must not be rewritten on read");
  assert.equal(defect.category,"Operator/Driver Controls");
 }
 /* The bike rack moved categories when Bus Controls split, so unlike the start
    buttons it IS rewritten on read — into the group that now owns it. */
 for(const [stored,expected] of [["Bus Accessories - Bike rack - arm replacement","Bike Rack - Arm replacement"],
                                 ["Bus Accessories - Bike rack - loose / pivots","Bike Rack - Loose / pivots"]]){
  const [defect]=normalizeDefects([{id:"d",category:"Bus Controls",issue:stored,details:"",state:"open",operability:"service"}]);
  assert.equal(defect.category,"Bus Accessories");
  assert.equal(defect.issue,expected);
 }

 // A record already logged under the retired wording still reads as itself —
 // including the very old bare form, which still lands in its group.
 const [old]=normalizeDefects([{id:"d",category:"Bus Controls",issue:"Operating Controls - Start button",details:"",state:"open",operability:"service"}]);
 assert.equal(old.issue,"Operating Controls - Start button");
 const [bare]=migrateRepairIdentity("Bus Controls","Start button")?[{issue:migrateRepairIdentity("Bus Controls","Start button").issue}]:[];
 assert.equal(bare.issue,"Operating Controls - Start button");
});

test("saving fixed with a part asks for the number and flags it when left for later",async()=>{
 const [logPage,logCss,fixedPage,fixedCss]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);

 // FOUR EQUAL BUTTONS. SAVE UPDATE used to span the full row on a phone, which
 // made the biggest, easiest target the one pressed least often. All four are
 // now one grid cell each, in a 2x2, at every width — so CLOSE, the one that
 // discards, is always the bottom right and never under a thumb reaching for
 // SAVE. Asserted outside any media block as well as inside, because styling a
 // layout for phones only is how this file's earlier desktop bug happened.
 const topLevel=(()=>{let out="",depth=0,index=0;
  while(index<logCss.length){
   if(logCss.startsWith("@media",index)){const open=logCss.indexOf("{",index);depth=1;index=open+1;
    while(index<logCss.length&&depth>0){if(logCss[index]==="{")depth++;else if(logCss[index]==="}")depth--;index++}
    continue}
   out+=logCss[index];index++}
  return out})();
 assert.match(topLevel,/\.save-log-middle-actions\{[^}]*grid-template-columns:repeat\(2/);
 // Nothing may span the row any more; that rule is what made them unequal.
 assert.equal(/\.save-log-middle\{grid-column:1\/-1\}/.test(logCss),false,
  "no action button may span the full row");

 // Order is what puts CLOSE bottom right in a 2x2: save, fixed, fixed-with-part,
 // close. DOM order is also tab order, so this is the keyboard order too.
 const middle=logPage.match(/<div className="save-log-middle-actions"[\s\S]*?<\/div>/)[0];
 const order=[...middle.matchAll(/className="(save-log-middle|save-fixed-middle|save-fixed-part-middle|close-log-middle)"/g)].map(m=>m[1]);
 assert.deepEqual(order,["save-log-middle","save-fixed-middle","save-fixed-part-middle","close-log-middle"]);
 // The sticky bar at the bottom carries the same four in the same order, so a
 // person who scrolled past the middle one is not offered a different set.
 /* Matched on the class rather than the whole opening tag: the step-by-step
    helper landed `data-coach="save"` on this footer, and a literal tag pin
    broke on an attribute that changes nothing about the four buttons inside
    it. What this test is about is their order, which is asserted below. */
 const footer=logPage.match(/<footer className="log-editor-actions"[^>]*>[\s\S]*?<\/footer>/)[0];
 assert.ok(footer.includes("SAVE FIXED W/ PART"));
 assert.ok(footer.lastIndexOf("CLOSE")>footer.indexOf("SAVE FIXED W/ PART"),"CLOSE comes last");

 // THE PROMPT. Both ways forward save the repair; only CANCEL does not.
 assert.ok(logPage.includes("function PartNumberPrompt("));
 assert.ok(logPage.includes("SAVE WITH THIS PART"));
 assert.ok(logPage.includes("ENTER LATER"));
 // ENTER LATER records that a part went on with no number, which is a different
 // fact from no part at all.
 assert.match(logPage,/confirm\(""\)/);
 /* THROUGH THE ASSEMBLER, AND THE ASSEMBLER RUNS LAST.

    The prompt first patched `{partsUsed:true,partNumber}` straight onto the
    record, so on a repair already holding a `parts` array the mirrored pair and
    the array disagreed. Passing the ASSEMBLED record in as the patch was the
    next attempt, and a cold read showed it does not work either:
    `{...value.defect,...patch}` CANNOT CARRY A DELETION, and the assembler's
    whole job is to `delete parts`. The key is absent from the patch, so the
    stored array came back through the first spread - measured on a repair
    holding [AA-1,BB-2] as `partNumber:"BB-2"` beside `parts:[AA-1,BB-2]`, the
    exact disagreement the first fix was for. Same `{...existing,...incoming}`
    trap `saveDefectLogRecord` keeps an explicit field list for.

    So the parts go in as PARTS and the assembler runs after the spread, where
    nothing can spread over it. */
 assert.match(logPage,/const next=number\?\[\{id:first\?first\.id:"part-0",partNumber:number/);
 assert.match(logPage,/validateAndSave\(true,\{\},\{rows:next,used:true\}\)/);
 assert.doesNotMatch(logPage,/validateAndSave\(true,\{partsUsed:true,partNumber:number\}\)/,
  "the prompt must not write the mirrored pair without the array");
 assert.doesNotMatch(logPage,/validateAndSave\(true,withDefectParts\(/,
  "and must not hand the assembled record in as a patch, which undoes the delete");

 // The patch is passed INTO the save rather than set on state first. Setting it
 // and then saving would write the defect as it was a render earlier, dropping
 // the number on the very save that asked for it.
 assert.match(logPage,/const validateAndSave=\(complete:boolean,patch:Partial<StructuredDefect>=\{\},parts\?:\{rows:DefectPart\[\];used:boolean\}\)=>\{const patched=\{\.\.\.value\.defect,\.\.\.patch\};const defect=parts\?withDefectParts\(patched,parts\.rows,parts\.used\):patched/,
  "the spread happens first and the assembler last, so a deleted key stays deleted");
 /* DRIVEN, because the gate above is a shape and this is the behaviour: the
    assembled record spread over the stored one brings the array back. */
 {
  const held={id:"d1",partsUsed:true,partNumber:"AA-1",partName:"Chamber",
   parts:[{id:"a",partNumber:"AA-1",partName:"Chamber"},{id:"b",partNumber:"BB-2"}]};
  const rows=normalizeDefectParts(held.parts,held);
  const assembled=withDefectParts(held,[{id:rows[0].id,partNumber:""},...rows.slice(1)],true);
  assert.ok(!("parts" in assembled),"the assembler deletes the key");
  const asAPatch={...held,...assembled};
  assert.deepEqual(normalizeDefectParts(asAPatch.parts,asAPatch).map(part=>part.partNumber),["AA-1","BB-2"],
   "spreading the assembled record over the stored one brings the array back - which is why it is not a patch");
  assert.deepEqual(normalizeDefectParts(assembled.parts,assembled).map(part=>part.partNumber),["BB-2"],
   "and running the assembler last is what the record should hold");
 }

 // It renders OUTSIDE the form. Inside it, Enter in the part field would submit
 // the defect behind the prompt.
 assert.ok(logPage.indexOf("{partPrompt&&<PartNumberPrompt")<logPage.indexOf('<form className="log-editor"'));

 // It behaves like every other layer in this app: a sheet from the bottom on a
 // phone rather than a box floating in the middle, and Escape closes it.
 assert.match(logCss,/@media\(max-width:760px\)\{\s*\.part-prompt-shade\{align-items:flex-end;padding:0\}/);
 assert.match(logCss,/\.part-prompt\{width:100%;max-height:92dvh;border-radius:14px 14px 0 0/);
 assert.match(logPage,/event\.key==="Escape"/);
 // Escape must not also close the editor behind it, so the handler stops the
 // event rather than letting it fall through to whatever else is listening.
 assert.match(logPage,/event\.stopPropagation\(\);close\(\)/);
 // The shade uses the same ink as every other overlay here.
 assert.match(logCss,/\.part-prompt-shade\{[^}]*background:#03132dcc/);

 // THE FLAG on Fixed Repairs, in its own colour, beside the amber one it can
 // appear next to.
 /* OFF THE WHOLE LIST. `partNumberMissing` reads the FIRST part only, so a
    name-only first row beside a numbered second one showed MISSING PART # with
    a number recorded - reproduced by a reviewer. */
 assert.ok(fixedPage.includes("defectPartsMissing(record.defect)&&"));
 assert.ok(!fixedPage.includes("partNumberMissing("),"the card must not flag off the first part alone");
 assert.equal(defectPartsMissing({partsUsed:true,parts:[{id:"a",partName:"long bolt"},{id:"b",partNumber:"ZZ-1"}],partNumber:"",partName:"long bolt"}),false,
  "a numbered second part means the number is not missing");
 assert.equal(defectPartsMissing({partsUsed:true}),true,"and ENTER LATER still flags");
 assert.ok(fixedPage.includes("MISSING PART #"));
 // Filled orange, not another pale pill: NEEDS FIX DETAILS sits beside it on
 // #fff1e0 already, and the first attempt used that same background, which made
 // two different outstanding jobs look like one.
 assert.match(fixedCss,/\.missing-part-number\{[^}]*background:#b35509/);
 // Must out-specify the phone breakpoint's pale fill on every footer badge,
 // which otherwise wins on source order and leaves white text on pale amber.
 assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card>footer>b\.missing-part-number\{/);
 assert.equal(/\.missing-part-number\{[^}]*background:#fff1e0/.test(fixedCss),false);
 // Two badges must not fight over the space: the actions are pushed right
 // instead of each badge pushing with a margin of its own.
 assert.equal(/\.fixed-card>footer>b\{margin-right:auto/.test(fixedCss),false);
 assert.match(fixedCss,/\.fixed-card>footer \.fixed-card-actions\{margin-left:auto\}/);

 // WHAT THE FLAG MEANS. Ticked with no number is the missing case; not ticked
 // means no part was used, which must never be flagged; and a record written
 // before any of this existed reads correctly.
 assert.equal(partNumberMissing({partsUsed:true,partNumber:""}),true);
 assert.equal(partNumberMissing({partsUsed:true,partNumber:"   "}),true);
 assert.equal(partNumberMissing({partsUsed:true,partNumber:"HX-99"}),false);
 assert.equal(partNumberMissing({partsUsed:false,partNumber:""}),false);
 assert.equal(partNumberMissing({}),false);
});

test("the bus group outline is darker than every other border, and can be recolored",async()=>{
 const [logCss,logPage]=await Promise.all([
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
 ]);

 // Its own variable, deliberately heavier than the general border. 22% is what
 // every other border here uses; the group outline is the boundary between one
 // bus and the next and was the same weight as a divider inside a panel.
 assert.match(logCss,/--log-card-border:color-mix\(in srgb,var\(--log-text\) 42%,var\(--log-surface\)\)/);
 assert.match(logCss,/--log-border:color-mix\(in srgb,var\(--log-text\) 22%,var\(--log-surface\)\)/);
 assert.match(logCss,/\.log-card\{position:relative;[^}]*border:1px solid var\(--log-card-border/);

 // THE REGRESSION THIS EXISTS FOR. A later rule themed every panel border at
 // once and included .log-card, so the card silently took the general border
 // however it was styled above — the variable was set correctly and changed
 // nothing on screen. The card must not be in that list.
 const themed=logCss.match(/^[^\n]*\{border-color:var\(--log-border\);background:var\(--log-surface\)\}/m);
 assert.ok(themed,"the shared panel theming rule must still exist");
 assert.equal(/[.,]log-card[,{]/.test(themed[0]),false,
  ".log-card must not be themed with the general border, or its own colour is ignored");
 assert.match(logCss,/\.log-card\{border-color:var\(--log-card-border\);background:var\(--log-surface\)\}/);

 // Derived, not fixed, so it follows the theme: on Dark it resolves lighter
 // than the card instead of leaving a light-theme grey on a near-black surface.
 assert.equal(/--log-card-border:#/.test(logCss),false,"the default must be derived from the theme");

 // A chosen colour is applied as an inline variable, and only when one is set,
 // so leaving it alone keeps the theme-aware default.
 assert.match(logPage,/\.\.\.\(settings\.groupBorder\?\{"--log-card-border":settings\.groupBorder\}:\{\}\)/);
 const [model,panel]=await Promise.all([
  readFile(new URL("../src/lib/defects/defect-log-settings.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8"),
 ]);
 assert.match(model,/groupBorder:safeBorderColor\(saved\.groupBorder\)/);
 assert.ok(panel.includes("USE THEME COLOR"),"there must be a way back to the theme colour");
});

test("a stored outline colour cannot inject anything into the style attribute",async()=>{
 // The value lands in an inline style, and a settings blob is a file somebody
 // can hand-edit and a sync can carry between devices, so it is validated
 // rather than trusted.
 const {safeBorderColor}=await import("../src/lib/defects/defect-log-display-settings.ts");
 for(const good of ["#9ea6b4","#B3261E","#000000"]) assert.equal(safeBorderColor(good),good);
 for(const bad of ["red","red;background:url(x)","#fff","","javascript:alert(1)",null,undefined,42,{}])
  assert.equal(safeBorderColor(bad),"","must reject "+String(bad));
 assert.equal(safeBorderColor("  #9ea6b4  "),"#9ea6b4","surrounding space is trimmed, not rejected");
});

test("a held-back DEFERRED bus is told apart from the Down Sheet's own Deferred workflow", () => {
 // Both write state:"deferred" — the Down Sheet's own workflow always has an
 // active entry, a B12 hold never does. isHeldDeferred is the one place that
 // tells them apart, and every consumer (quick filter, nav badge, map
 // overlay, evening prompt) goes through it rather than re-deriving the rule.
 const held = { id: "d1", category: "Engine", issue: "Check engine light", details: "", operability: "service", state: "deferred", deferredAt: "2026-08-30T20:00:00.000Z" };
 assert.equal(isHeldDeferred(held, false), true);
 assert.equal(isHeldDeferred(held, true), false, "an active Down Sheet entry for this bus means it is not a quiet hold");
 assert.equal(isHeldDeferred({ ...held, state: "open" }, false), false);

 const now = new Date("2026-08-30T21:35:00.000Z");
 assert.equal(deferredMinutesElapsed(held, now), 95);
 assert.equal(deferredMinutesElapsed({ ...held, state: "open" }, now), null, "not deferred means no clock is running");
 assert.equal(deferredMinutesElapsed({ ...held, deferredAt: undefined }, now), null, "deferred with no stamp cannot be timed");
});

test("the Deferred Quick Filter carries every currently-deferred repair, oldest-first is left to the caller", () => {
 const bus = { id: "a", n: "17530", defects: [
  { id: "still-deferred", category: "Bus Controls", issue: "Front start button", details: "", operability: "service", state: "deferred", deferredAt: "2026-08-30T18:00:00.000Z" },
  { id: "fixed", category: "Engine", issue: "Oil leak", details: "", operability: "service", state: "completed" },
 ] };
 assert.equal(quickFilterMatch(bus, "deferred"), true);
 assert.deepEqual(quickFilterDefects(bus, "deferred").map(defect => defect.id), ["still-deferred"]);
 assert.deepEqual(quickFilterBusIds([bus, { id: "b", n: "1", defects: [] }], "deferred"), ["a"]);
 assert.equal(quickFilterFallbackLabel("deferred"), "Deferred, held back from service");
 // quick-filters.ts never sees the Down Sheet's own entries, so it cannot tell
 // an on-sheet "Deferred" workflow apart from a genuine B12 hold — that
 // narrowing is documented as the caller's job (isHeldDeferred), not this
 // module's.
});

test("saving a repair through DEFERRED, a snooze, and every exit clears or stamps deferredAt correctly", () => {
 const fleet = [{ id: "bus-1", n: "17530", s: "shop", l: "bay-1", defects: [] }];
 const now1 = "2026-08-30T20:00:00.000Z";

 // Entering DEFERRED stamps deferredAt, same as the editor's toggle does.
 const entered = saveDefectLogRecord(fleet, [], "bus-1", { id: "d1", category: "Engine", issue: "Check engine light", details: "", operability: "service", state: "deferred", deferredAt: now1, source: "defect-log" }, false, now1);
 assert.equal(entered.error, null);
 const defectAfterEntry = entered.fleet[0].defects.find(d => d.id === "d1");
 assert.equal(defectAfterEntry.state, "deferred");
 assert.equal(defectAfterEntry.deferredAt, now1);
 assert.equal(isHeldDeferred(defectAfterEntry, false), true);

 // The evening prompt's "keep deferred until X": deferredAt stays put — the
 // 90-minute clock keeps counting this same stay — only deferredUntil moves.
 const snoozeUntil = "2026-08-31T02:00:00.000Z";
 const kept = saveDefectLogRecord(entered.fleet, entered.downEntries, "bus-1", { ...defectAfterEntry, state: "deferred", deferredUntil: snoozeUntil }, false, "2026-08-30T21:40:00.000Z");
 const defectAfterSnooze = kept.fleet[0].defects.find(d => d.id === "d1");
 assert.equal(defectAfterSnooze.deferredAt, now1, "the original stay is not reset by a snooze");
 assert.equal(defectAfterSnooze.deferredUntil, snoozeUntil);

 // Exit 1: Put on Down Sheet — leaves DEFERRED, an active entry appears, and
 // isHeldDeferred now correctly reports it is no longer a quiet hold.
 const onSheet = saveDefectLogRecord(kept.fleet, kept.downEntries, "bus-1", { ...defectAfterSnooze, state: "open", deferredAt: undefined, deferredUntil: undefined }, true, "2026-08-30T21:45:00.000Z");
 const defectOnSheet = onSheet.fleet[0].defects.find(d => d.id === "d1");
 assert.equal(defectOnSheet.state, "open");
 assert.equal(defectOnSheet.deferredAt, undefined);
 assert.equal(onSheet.downEntries.some(entry => entry.busId === "bus-1" && entry.workflow !== "Completed"), true);
 assert.equal(isHeldDeferred(defectOnSheet, true), false);

 // Exit 2, from a fresh DEFERRED stay: Return to service with defects — the
 // repair stays open and unresolved, but it is off the sheet and untimed.
 const backOnRepair = { ...defectAfterEntry, id: "d2" };
 const returned = saveDefectLogRecord(fleet, [], "bus-1", backOnRepair, false, now1);
 const returnedAgain = saveDefectLogRecord(returned.fleet, returned.downEntries, "bus-1", { ...backOnRepair, state: "open", deferredAt: undefined, deferredUntil: undefined }, false, "2026-08-30T22:00:00.000Z");
 const defectReturned = returnedAgain.fleet[0].defects.find(d => d.id === "d2");
 assert.equal(defectReturned.state, "open");
 assert.equal(isUnresolved(defectReturned), true);
 assert.equal(defectReturned.deferredAt, undefined);

 // Exit 3: marking a still-deferred repair Fixed must also clear the stamps —
 // a completed record has no business carrying a stale deferred timer.
 const fixed = saveDefectLogRecord(fleet, [], "bus-1", { ...defectAfterEntry, id: "d3", state: "completed", deferredAt: undefined, deferredUntil: undefined, completedAt: "2026-08-30T22:05:00.000Z", completedBy: "CJ" }, false, "2026-08-30T22:05:00.000Z");
 const defectFixed = fixed.fleet[0].defects.find(d => d.id === "d3");
 assert.equal(defectFixed.state, "completed");
 assert.equal(defectFixed.deferredAt, undefined);
});

test("Facility Map bus tokens carry a DEF badge only for genuinely held-back buses", async () => {
 const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
 const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
 // Excluded from actualDownSet the same way the map already excludes an
 // on-sheet bus from the DS-ready badge computation.
 assert.match(page, /const deferredHeldIds=quickFilterBusIds\(buses,"deferred"\)\.filter\(id=>!actualDownSet\.has\(id\)\)/);
 assert.match(page, /deferredHeld:deferredHeldSet\.has\(bus\.id\)/);
 assert.match(page, /\{bus\.deferredHeld&&<span className="deferred-held-badge" aria-hidden="true">DEF<\/span>\}/);
 assert.match(css, /\.deferred-held-badge\{/);
});

test("the evening prompt asks once per BUS, and one answer covers every repair holding it", () => {
 // The bug Curtis reported: the prompt was per DEFECT under a "Bus 9911"
 // heading, so answering it handed back the same bus with the next repair
 // underneath, over and over, and again on the next app open. Measured in a
 // browser at 21:00 with a three-defect bus: three prompts, then a fourth
 // after a reload. heldDeferredBuses is what stops that — one entry per bus.
 const at = "2026-09-08T18:00:00.000Z";
 const defect = (id, category, issue, extra = {}) => ({ id, category, issue, details: "", operability: "service", state: "deferred", deferredAt: at, createdAt: at, updatedAt: at, source: "defect-log", ...extra });
 const fleet = [
  { id: "bus-1", n: "9911", s: "shop", l: "bay-1", defects: [defect("d1", "Tech Services", "Farebox - Won't probe & open"), defect("d2", "Brakes", "Air leak"), defect("d3", "Lighting", "Headlight out")] },
  { id: "bus-2", n: "9912", s: "shop", l: "bay-2", defects: [defect("d4", "Engine", "Check engine light")] },
 ];

 const buses = heldDeferredBuses(fleet, []);
 assert.equal(buses.length, 2, "three deferred repairs on one bus are one question, not three");
 assert.deepEqual(buses.map(held => held.bus.n), ["9911", "9912"]);
 assert.deepEqual(buses[0].defects.map(item => item.id), ["d1", "d2", "d3"]);

 // A bus already on the Down Sheet is the sheet's problem, not the prompt's.
 assert.deepEqual(
  heldDeferredBuses(fleet, [{ id: "e1", defectId: "d1", busId: "bus-1", workflow: "In Progress" }]).map(held => held.bus.n),
  ["9912"],
 );

 // And the prompt's own gate: a bus drops out entirely once ANY of its repairs
 // carries a keep-until in the future, because that answer was about the bus.
 const now = new Date("2026-09-08T21:00:00.000Z");
 const snoozed = heldDeferredBuses(
  [{ ...fleet[0], defects: [defect("d1", "Tech Services", "Farebox - Won't probe & open", { deferredUntil: "2026-09-08T23:00:00.000Z" }), defect("d2", "Brakes", "Air leak")] }, fleet[1]],
  [],
 ).filter(held => !held.defects.some(item => item.deferredUntil && new Date(item.deferredUntil).getTime() > now.getTime()));
 assert.deepEqual(snoozed.map(held => held.bus.n), ["9912"], "keeping a bus deferred until 23:00 must silence the whole bus");
});

test("DEFERRED sits under MYSTERY BUSES on the Down Sheet, and both answers write the whole bus", async () => {
 const [board, page, css] = await Promise.all([
  readFile(new URL("../app/down-sheet/_components/deferred-board.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
 ]);
 // Same classes as MYSTERY BUSES on purpose — Curtis asked for the same look,
 // and a second board that looked like a different kind of thing would read as
 // a different kind of thing.
 assert.match(board, /className=\{"mystery-board deferred-board"/);
 assert.match(board, /mystery-card deferred-card/);
 assert.match(css, /\.deferred-card-actions\{/);
 // Under it, not merged into it: a mystery is unexplained and a deferral is a
 // decision, and folding them together would dilute what MYSTERY BUSES is for.
 assert.ok(page.indexOf("<MysteryBoard fleet=") < page.indexOf("<DeferredBoard fleet="), "DEFERRED goes under MYSTERY BUSES");
 assert.match(board, /PUT ON DOWN SHEET/);
 assert.match(board, /RETURN TO SERVICE/);
 // It hands the answer back rather than writing, like the mystery board's
 // onMoved, so a refused write is the page's to report.
 assert.match(board, /onAnswer:\(busId:string,defects:StructuredDefect\[\],action:"downsheet"\|"return"\)=>void/);
 assert.match(page, /const wroteFleet=writeFleetStorageResult\(localStorage,applied\.fleet as FleetBus\[\]\)/);

 const { answerDeferredBus } = await import("../src/lib/defects/deferred-actions.ts");
 const at = "2026-09-08T14:00:00.000Z", now = "2026-09-08T18:00:00.000Z";
 const d = (id, c, i, when) => ({ id, category: c, issue: i, details: "", operability: "service", state: "deferred", deferredAt: when || at, createdAt: at, updatedAt: at, source: "defect-log", reportedBy: "CJ" });
 const fleet = [{ id: "b1", n: "17801", s: "shop", l: "bay-3", defects: [
   d("x1", "Brakes", "Air leak"), d("x2", "Lighting", "Headlight out", "2026-09-08T12:00:00.000Z")] }];

 // RETURN TO SERVICE is a statement about the BUS, so every repair holding it
 // comes off DEFERRED — not just the one the card happened to show.
 const returned = answerDeferredBus(fleet, [], "b1", fleet[0].defects, "return", { now });
 assert.equal(returned.saved, 2);
 assert.deepEqual(returned.fleet[0].defects.map(x => x.state), ["open", "open"]);
 assert.deepEqual(returned.fleet[0].defects.map(x => x.deferredReturnedAt), [now, now]);

 // PUT ON DOWN SHEET moves ONE, because the sheet allows a bus one active
 // entry — and needs no more: on the sheet, the bus stops being held at all.
 const escalated = answerDeferredBus(fleet, [], "b1", fleet[0].defects, "downsheet", { now });
 assert.equal(escalated.downEntries.length, 1, "one entry, not one per repair");
 // The longest-held repair leads, so "one of them" is never arbitrary.
 assert.equal(escalated.downEntries[0].defectId, "x2");
 const { heldDeferredBuses: heldAfter } = await import("../src/lib/defects/deferred-counts.ts");
 assert.equal(heldAfter(escalated.fleet, escalated.downEntries).length, 0, "the bus stops being held once it is on the sheet");
});

test("the evening deferred prompt has an off switch, and turning it off leaves the alert badge alone", async () => {
 const [model, panel, watch] = await Promise.all([
  readFile(new URL("../src/lib/defects/defect-log-settings.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/components/shared/deferred-watch.tsx", import.meta.url), "utf8"),
 ]);
 // Absent means on: every device already in the shop has a settings blob with
 // no such field, and none of them should go quiet on upgrade.
 assert.equal(readSettings(null).deferredReviewPrompt, true);
 assert.equal(readSettings(JSON.stringify({})).deferredReviewPrompt, true);
 assert.equal(readSettings(JSON.stringify({ deferredReviewPrompt: false })).deferredReviewPrompt, false);
 assert.equal(readSettings("not json").deferredReviewPrompt, true);
 assert.ok(model.includes("deferredReviewPrompt:true"), "the default has to be on");
 assert.match(panel, /checked=\{settings\.deferredReviewPrompt\}/);
 // The prompt reads the switch; the badge does not, so the 🚨 banner Curtis
 // already relies on stays whichever way the switch is set.
 assert.match(watch, /const \[enabled,setEnabled\]=useState\(true\)/);
 assert.match(watch, /!now\|\|!enabled\|\|!isReviewWindowOpen\(now\)/);
 const badge = watch.slice(watch.indexOf("export function DeferredNavBadge"), watch.indexOf("type ReviewAction"));
 assert.ok(!badge.includes("enabled"), "the nav badge must not be gated by the prompt switch");
});

test("hasDeferredHistory remembers a repair that was deferred, returned to service, and is still open", () => {
 const base = { id: "d1", category: "Engine", issue: "Check engine light", details: "", operability: "service", state: "open", deferredReturnedAt: "2026-08-29T22:00:00.000Z" };
 assert.equal(hasDeferredHistory(base, false), true);
 // Currently deferred again — the live DEF badge covers this, not the history note.
 assert.equal(hasDeferredHistory({ ...base, state: "deferred" }, false), false);
 // Fixed — a resolved repair carries no history note, deferred or not.
 assert.equal(hasDeferredHistory({ ...base, state: "completed" }, false), false);
 // Back on the Down Sheet — the sheet is now the record, so the note stands down.
 assert.equal(hasDeferredHistory(base, true), false);
 // No stamp at all — never deferred, nothing to remember.
 assert.equal(hasDeferredHistory({ ...base, deferredReturnedAt: undefined }, false), false);
});

test("saving a repair through DEFERRED and back to service stamps a history note; the sheet and a fix both clear it", () => {
 const fleet = [{ id: "bus-1", n: "17530", s: "shop", l: "bay-1", defects: [] }];
 const enteredAt = "2026-08-29T20:00:00.000Z";

 const entered = saveDefectLogRecord(fleet, [], "bus-1", { id: "d1", category: "Engine", issue: "Check engine light", details: "", operability: "service", state: "deferred", deferredAt: enteredAt, source: "defect-log" }, false, enteredAt);
 // Returning to service without the sheet: the editor's toggleDeferred(false)
 // and the evening prompt's "return" both do exactly this patch.
 const returned = saveDefectLogRecord(entered.fleet, entered.downEntries, "bus-1", { ...entered.fleet[0].defects[0], state: "open", deferredAt: undefined, deferredUntil: undefined, deferredReturnedAt: "2026-08-29T22:00:00.000Z" }, false, "2026-08-29T22:00:00.000Z");
 const afterReturn = returned.fleet[0].defects.find(d => d.id === "d1");
 assert.equal(hasDeferredHistory(afterReturn, false), true);

 // Next day, still open, gets put on the Down Sheet — that supersedes the note.
 const onSheet = saveDefectLogRecord(returned.fleet, returned.downEntries, "bus-1", { ...afterReturn, state: "open", deferredReturnedAt: undefined }, true, "2026-08-30T14:00:00.000Z");
 const afterSheet = onSheet.fleet[0].defects.find(d => d.id === "d1");
 assert.equal(afterSheet.deferredReturnedAt, undefined);
 assert.equal(hasDeferredHistory(afterSheet, true), false);

 // A second cycle instead: fixed straight off, without ever going on the sheet.
 const fixed = saveDefectLogRecord(returned.fleet, returned.downEntries, "bus-1", { ...afterReturn, state: "completed", deferredReturnedAt: undefined, completedAt: "2026-08-30T15:00:00.000Z", completedBy: "CJ" }, false, "2026-08-30T15:00:00.000Z");
 const afterFix = fixed.fleet[0].defects.find(d => d.id === "d1");
 assert.equal(afterFix.deferredReturnedAt, undefined);
 assert.equal(hasDeferredHistory(afterFix, false), false);
});

test("the Defect Log surfaces a WAS DEFERRED history note in the editor, the card list, and the focus view", async () => {
 const logPage = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
 assert.match(logPage, /const hasHistory=hasDeferredHistory\(value\.defect,value\.onDownSheet\)/);
 assert.match(logPage, /<p className="deferred-history-note" role="note">/);
 assert.match(logPage, /groupHasDeferredHistory=group\.records\.some\(record=>hasDeferredHistory\(record\.defect,busOnDownSheet\)\)/);
 assert.match(logPage, /<b className="inline-deferred-history-badge"/);
 assert.match(logPage, /<b className="work-state-badge deferred-history"/);
 assert.match(logPage, /HISTORY<\/b><span><i className="work-state-badge deferred-history">WAS DEFERRED/);
});

test("Facility Map bus tokens carry an outline ring, not a badge, for a bus once deferred and back in service", async () => {
 const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
 const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
 assert.match(page, /const wasDeferredSet=new Set\(buses\.filter\(bus=>!actualDownSet\.has\(bus\.id\)&&normalizeDefects/);
 assert.match(page, /wasDeferred:wasDeferredSet\.has\(bus\.id\)/);
 assert.match(page, /data-was-deferred=\{Boolean\(bus\.wasDeferred\)\}/);
 assert.match(css, /\.token\[data-was-deferred="true"\] \.bus\{outline:2px solid #0e7490/);
});

test("DEFERRED cannot be ticked on a repair the Down Sheet already has, and a wrong clock cannot print a negative wait", async () => {
 const logPage = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");
 /* The Down Sheet has a "Deferred" workflow of its own that writes the same
    state, so an on-sheet repair opened here used to show DEFERRED and DOWN
    SHEET both ticked — a combination the form refuses to let anybody create.
    Measured in a browser, not assumed: both boxes came back checked. */
 assert.match(logPage, /disabled=\{value\.defect\.state==="completed"\|\|value\.onDownSheet\}/);
 /* The tick still shows the truth and still says where the state came from;
    the sentence is shorter since the copy was cut for phone reading. */
 assert.match(logPage, /On the sheet, and the sheet has it deferred\./);
 // A deferredAt in the future rendered "DEFERRED -120M" before this floor.
 assert.match(logPage, /return elapsed===null\?null:Math\.max\(0,elapsed\)/);
 // The floor is display-only: the alert and the review still read the signed
 // value, so a stay that has not started yet is ignored rather than counted.
 const catalog = await readFile(new URL("../src/lib/defects/repair-catalog.ts", import.meta.url), "utf8");
 assert.doesNotMatch(catalog, /Math\.max\(0,\(now\.getTime\(\)-started\)\/60000\)/);
 const future = { id: "d1", category: "Engine", issue: "Check engine light", details: "", operability: "service", state: "deferred", deferredAt: "2099-01-01T00:00:00.000Z" };
 assert.ok(deferredMinutesElapsed(future, new Date("2026-09-01T00:00:00.000Z")) < 0, "the raw helper still reports a future stamp as negative");
});

test("a brake test records a result, and only the two it can mean", () => {
 const base = { id: "d1", category: "Brakes", issue: "Brake inspection", details: "", operability: "service", state: "open" };

 // Ticking without a result is a test with no outcome recorded yet.
 let defect = setDefectWorkState(base, BRAKE_TEST_KEY, true, "2026-09-01T12:00:00.000Z", "CJ");
 assert.equal(brakeTestResult(defect), undefined);
 assert.equal(brakeTestFailed(defect), false);

 // A result stamps alongside who and when.
 defect = setDefectWorkState(defect, BRAKE_TEST_KEY, true, "2026-09-01T12:05:00.000Z", "CJ", "fail");
 assert.equal(brakeTestResult(defect), "fail");
 assert.equal(brakeTestFailed(defect), true);
 assert.equal(defect.workStates[BRAKE_TEST_KEY].by, "CJ");
 assert.ok(defect.workStates[BRAKE_TEST_KEY].at);

 /* Re-stamping without a result keeps the one already recorded — re-signing a
    brake test must not silently forget that it failed. */
 const resigned = setDefectWorkState(defect, BRAKE_TEST_KEY, true, "2026-09-01T13:00:00.000Z", "RM");
 assert.equal(brakeTestResult(resigned), "fail");
 assert.equal(resigned.workStates[BRAKE_TEST_KEY].by, "RM");

 // Unticking clears the stamp outright, result included.
 const cleared = setDefectWorkState(resigned, BRAKE_TEST_KEY, false, "2026-09-01T14:00:00.000Z", "RM");
 assert.equal(brakeTestResult(cleared), undefined);

 // A result only ever survives a read if it is one of the two known values.
 assert.equal(normalizeWorkStateStamp({ at: "x", result: "fail" }).result, "fail");
 assert.equal(normalizeWorkStateStamp({ at: "x", result: "PASS" }).result, "pass");
 assert.equal(normalizeWorkStateStamp({ at: "x", result: "maybe" }).result, undefined);
 // and it survives a full stored round trip
 const [read] = normalizeDefects([defect], "", "bus");
 assert.equal(brakeTestResult(read), "fail");

 // Other states never carry a result, even if one is passed.
 const inspected = setDefectWorkState(base, "inspected", true, "2026-09-01T12:00:00.000Z", "CJ", "fail");
 assert.equal(inspected.workStates.inspected.result, undefined);
});

test("the HVAC diag lamp records one light and a two-digit alarm, and only on A/C repairs", async () => {
 const logPage=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 /* One lamp, never two. The panel cannot show yellow and red at once, so the
    stored shape is a single value rather than two independent flags. */
 assert.equal(normalizeDiagLight("yellow"),"yellow");
 assert.equal(normalizeDiagLight("RED"),"red");
 assert.equal(normalizeDiagLight("green"),undefined,"a lamp the panel does not have must not be stored");
 assert.equal(normalizeDiagLight(""),undefined);
 assert.equal(normalizeDiagLight(undefined),undefined);

 /* Two digits, kept as text. 04 must not read back as 4 — they are different
    alarms — and anything that is not exactly two digits is dropped rather than
    shown as an alarm number that does not exist. */
 assert.equal(normalizeAlarmCode("04"),"04","a leading zero must survive");
 assert.equal(normalizeAlarmCode(4),"","a single digit is not a two-digit alarm");
 assert.equal(normalizeAlarmCode("327"),"32","longer input is cut to two digits");
 assert.equal(normalizeAlarmCode("a7b"),"","letters alone leave nothing");
 assert.equal(normalizeAlarmCode("1a2"),"12","digits are kept, anything else dropped");
 assert.equal(normalizeAlarmCode(undefined),"");

 /* Offered on the whole A/C category, and nowhere else. */
 assert.equal(hasDiagLightField("A/C and HVAC"),true);
 assert.equal(hasDiagLightField("Engine"),false);
 assert.equal(hasDiagLightField("Brakes"),false);
 assert.equal(hasDiagLightField(undefined),false);

 /* A record carrying a lamp on a non-A/C category — a hand-edited file, or a
    defect recategorised after the lamp was recorded — drops it on read rather
    than showing an HVAC alarm against a brake job. */
 const [acDefect,movedDefect]=normalizeDefects([
  {id:"ac",category:"A/C and HVAC",issue:"Semi cold air",details:"warm at the back",operability:"service",state:"open",diagLight:"red",alarmCode:"32"},
  {id:"moved",category:"Brakes",issue:"Other brake repair",details:"",operability:"service",state:"open",diagLight:"red",alarmCode:"32"},
 ],"","bus-diag");
 assert.equal(acDefect.diagLight,"red");
 assert.equal(acDefect.alarmCode,"32");
 assert.equal(movedDefect.diagLight,undefined,"a lamp must not survive on a category that has no lamp");
 assert.equal(movedDefect.alarmCode,undefined);

 /* The lamp leads the supporting details, so it reaches the Down Sheet line
    rather than sitting in a notes field nobody scrolls to. */
 assert.equal(diagLightLabel(acDefect),"RED DIAG LIGHT alarm 32");
 assert.match(defectLabel(acDefect),/RED DIAG LIGHT alarm 32/);
 assert.ok(defectSupportingDetails(acDefect).startsWith("RED DIAG LIGHT alarm 32"),"the lamp must lead the supporting details");
 /* A lamp with no alarm number still reads; a number with no lamp says nothing,
    because the number belongs to the lamp. */
 assert.equal(diagLightLabel({diagLight:"yellow"}),"YELLOW DIAG LIGHT");
 assert.equal(diagLightLabel({alarmCode:"32"}),"");

 /* The editor renders it only for A/C, ticking the lit lamp clears it, and the
    field cannot take more than two digits. */
 assert.match(logPage,/const diagLightMode=hasDiagLightField\(value\.defect\.category\)/);
 assert.match(logPage,/\{diagLightMode&&<fieldset className="wide diag-light-picker">/);
 assert.match(logPage,/normalizeDiagLight\(current\.defect\.diagLight\)===light\?undefined:light/);
 assert.match(logPage,/maxLength=\{2\}/);
 assert.match(logPage,/replace\(\/\\D\/g,""\)\.slice\(0,2\)/);
});

test("the A/C catalog counts fans, names Freon, and keeps every old wording readable", async () => {
 const options=REPAIR_OPTIONS["A/C and HVAC"];

 /* One fan down and both fans down are different jobs and must stay separable. */
 for(const issue of ["Cooling - Condenser fan INOP - 1 fan","Cooling - Condenser fans INOP - both fans","Cooling - Evaporator fan / motor INOP - 1","Cooling - Evaporator fans / motors INOP - both","Cooling - Semi cold air","Controls and Blowers - Bad connection / wiring"]){
  assert.ok(options.includes(issue),issue+" must be pickable in A/C and HVAC");
 }

 /* The floor says Freon. Records logged under the old wording read as the new
    one — nothing stored is rewritten — and the old wording is gone from the
    picker so it cannot be chosen again. */
 assert.ok(options.includes("Cooling - Refrigerant / Freon leak"));
 assert.ok(!options.includes("Refrigerant leak"),"the old wording must not still be pickable");
 /* Straight to its grouped home. CATEGORY_ISSUE_RENAMES is applied once, so
    this entry names the final wording rather than chaining through the Freon
    rename — a chain would stop at the ungrouped name and never match again. */
 assert.deepEqual(migrateRepairIdentity("A/C and HVAC","Refrigerant leak"),{category:"A/C and HVAC",issue:"Cooling - Refrigerant / Freon leak"});

 /* Every A/C option a previous build could have written still lands on
    something pickable, so nothing already on the board is orphaned. */
 for(const issue of ["No cooling","Compressor","A/C belt","A/C compressor pulley misaligned","Evaporator core","Condenser core","Blower motor","Operator A/C blower","Refrigerant leak","Controls / electrical","IntelligAIRE III control panel - screen blank / black","Heater / defroster","Other A/C repair"]){
  const moved=migrateRepairIdentity("A/C and HVAC",issue);
  assert.ok(REPAIR_OPTIONS[moved.category].includes(moved.issue),issue+" migrated to something that is not in the catalog");
 }

 /* The migration must not move an option that is already current. */
 for(const issue of options)assert.deepEqual(migrateRepairIdentity("A/C and HVAC",issue),{category:"A/C and HVAC",issue});
});

test("an alarm number never survives without the lamp it belongs to", async () => {
 const logPage=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 /* Found by driving the form: typing "ab4x" leaves a bare "4" sitting in the
    field looking entered, and a single digit does not save, because 4 could be
    04 or 40 and only the panel knows which. The form now says so instead of
    dropping it quietly. */
 assert.match(logPage,/typedAlarmDigits\.length===1\?"Alarm numbers are two digits/);
 assert.match(logPage,/A single digit will not save\./);
 assert.match(logPage,/className=\{typedAlarmDigits\.length===1\?"diag-alarm-warning":undefined\}/);
 /* And a number typed with no lamp ticked says what will happen to it. */
 assert.match(logPage,/An alarm number on its own is not saved, because it belongs to a lamp\./);

 /* The same rule at the storage boundary, not only in the hint. */
 const [noLamp,oneDigit,moved]=normalizeDefects([
  {id:"a",category:"A/C and HVAC",issue:"No cooling",details:"",operability:"service",state:"open",alarmCode:"32"},
  {id:"b",category:"A/C and HVAC",issue:"No cooling",details:"",operability:"service",state:"open",diagLight:"yellow",alarmCode:"4"},
  {id:"c",category:"Bus Controls",issue:"Operating Controls - Horn",details:"",operability:"service",state:"open",diagLight:"red",alarmCode:"32"},
 ],"","bus-alarm");
 assert.equal(noLamp.alarmCode,undefined,"an alarm number with no lamp has nothing to belong to");
 assert.equal(oneDigit.diagLight,"yellow","the lamp itself still stands");
 assert.equal(oneDigit.alarmCode,undefined,"a single digit is not a two-digit alarm");
 /* The lamp is judged by the MIGRATED category. A horn record carrying a lamp
    is read under Operator/Driver Controls, which has no lamp, so it drops. */
 assert.equal(moved.category,"Operator/Driver Controls");
 assert.equal(moved.diagLight,undefined,"a lamp must not survive a migration into a category without one");
 assert.equal(moved.alarmCode,undefined);
});

test("Tech Services is grouped the way the shop's check-off sheets are, and every old wording still lands", () => {
 const groups=REPAIR_OPTION_GROUPS["Tech Services"];
 assert.deepEqual(Object.keys(groups),["Farebox","Ventra","CUBIC Screen","IBS Screen","Signs, Cameras and Other"]);

 /* The farebox sheet checks power, bills and coin per bus. Each is now an option. */
 for(const item of ["No power","Bill transport INOP","Coin mech INOP","Coin off line","Coin bin missing","Blank / black screen"])
  assert.ok(groups.Farebox.includes(item),item+" must be a Farebox option");
 /* The general option leads its group, the way Front door leads Doors. */
 assert.equal(groups.Farebox[0],"INOP (general)");
 assert.equal(groups.Ventra[0],"INOP (general)");
 assert.equal(groups["IBS Screen"][0],"INOP (general)");

 /* The flat list and the grouped picker must agree exactly, or a stored
    identity can be drawn that cannot be re-picked. */
 const flat=new Set(REPAIR_OPTIONS["Tech Services"]);
 const drawn=new Set(Object.entries(groups).flatMap(([g,items])=>items.map(i=>g+" - "+i)));
 assert.deepEqual([...flat].sort(),[...drawn].sort());

 /* The CUBIC wordings already carried their group, so they do not move — the
    twelve live records under them keep their exact stored identity. */
 assert.deepEqual(migrateRepairIdentity("Tech Services","CUBIC Screen - BUS ER"),{category:"Tech Services",issue:"CUBIC Screen - BUS ER"});
 assert.deepEqual(migrateRepairIdentity("Tech Services","CUBIC Screen - MV ER"),{category:"Tech Services",issue:"CUBIC Screen - MV ER"});

 /* Every wording a Version 138 device can write lands on a pickable option. */
 for(const old of ["Farebox","Farebox won't lock","Ventra","IBS Screen","CUBIC Screen - BUS ER","CUBIC Screen - MV ER","Destination Sign","Dash cam","Camera / DVR system","Other Tech Services"]){
  const m=migrateRepairIdentity("Tech Services",old);
  assert.equal(m.category,"Tech Services",old+" must stay in Tech Services");
  assert.ok(flat.has(m.issue),old+" -> "+m.issue+" is not in the catalog");
 }
 assert.equal(migrateRepairIdentity("Tech Services","Farebox").issue,"Farebox - INOP (general)");
 assert.equal(migrateRepairIdentity("Tech Services","Farebox won't lock").issue,"Farebox - Unlocked / won't lock");

 /* And nothing already current drifts on a second read. */
 for(const issue of flat)assert.deepEqual(migrateRepairIdentity("Tech Services",issue),{category:"Tech Services",issue});

 /* An off-catalog wording the live board carries is left exactly as logged. */
 assert.deepEqual(migrateRepairIdentity("Tech Services","Unspecified issue"),{category:"Tech Services",issue:"Unspecified issue"});
});

test("the IBS & Ventra quick filter finds the CUBIC screens, which are the Ventra hardware", () => {
 const bus=issue=>({id:"b",defects:[{id:"d",category:"Tech Services",issue,operability:"service",state:"open"}],pendingRepair:""});
 assert.equal(quickFilterDefects(bus("CUBIC Screen - BUS ER"),"ibs-ventra").length,1);
 assert.equal(quickFilterDefects(bus("CUBIC Screen - MV ER"),"ibs-ventra").length,1);
 assert.equal(quickFilterDefects(bus("Ventra"),"ibs-ventra").length,1);
 assert.equal(quickFilterDefects(bus("IBS Screen"),"ibs-ventra").length,1);
 /* And still not a farebox. */
 assert.equal(quickFilterDefects(bus("Farebox"),"ibs-ventra").length,0);
 assert.equal(quickFilterDefects(bus("Farebox"),"farebox").length,1);
});

test("the sweep scan turns marks into findings, lets a written note beat the column it explains, and never reads blank as OK", async () => {
 const fleet=[
  {id:"b-15506",n:"15506",defects:[]},
  {id:"b-17531",n:"17531",defects:[]},
  {id:"b-17548",n:"17548",defects:[]},
  {id:"b-17523",n:"17523",defects:[{id:"x",category:"Tech Services",issue:"CUBIC Screen - MV ER",details:"",operability:"service",state:"open"}]},
  {id:"b-dupA",n:"18500",defects:[]},{id:"b-dupB",n:"18500",defects:[]},
 ];

 /* Anything the route returns is untrusted: a mark that is not one of the four
    words reads as blank, and blank is never ok. */
 const raw=normalizeSweepRow({pageNumber:2,sheet:"FAREBOX",busNumber:"Bus 17548",dt:"nonsense",mv:"",power:"OK",bills:"fault",coin:"ok",initial:"CJ",note:"",confidence:"0.9",reviewNote:""});
 assert.equal(raw.sheet,"farebox");
 assert.equal(raw.busNumber,"17548");
 assert.equal(raw.dt,"blank","an unknown mark word must read as blank, never ok");
 assert.equal(raw.mv,"blank");
 assert.equal(raw.power,"ok");
 assert.equal(raw.bills,"fault");
 assert.equal(raw.confidence,0.9);

 const rows=[
  /* Ventra sheet: DT error, MV fine. */
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"15506",dt:"fault",mv:"ok",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""}),
  /* Farebox sheet: the same bus, ticked OK, with the foot-of-sheet note. */
  normalizeSweepRow({pageNumber:2,sheet:"farebox",busNumber:"15506",dt:"blank",mv:"blank",power:"ok",bills:"ok",coin:"fault",initial:"Cw",note:"coin off line",confidence:.8,reviewNote:""}),
  /* A note written across all three cells. */
  normalizeSweepRow({pageNumber:2,sheet:"farebox",busNumber:"17531",dt:"blank",mv:"blank",power:"fault",bills:"fault",coin:"fault",initial:"BB",note:"coin off line blank screen",confidence:.7,reviewNote:"words across the row"}),
  /* A plain column fault with no note. */
  raw,
  /* Already on the board. */
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"17523",dt:"unclear",mv:"fault",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.85,reviewNote:"DT cell holds a dash"}),
  /* Two buses share this fleet number. */
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"18500",dt:"fault",mv:"ok",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""}),
  /* Not in the fleet at all. */
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"99999",dt:"fault",mv:"ok",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""}),
  /* Blank everywhere: must produce nothing, not an OK. */
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"17500",dt:"blank",mv:"blank",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:1,reviewNote:""}),
 ];
 const findings=sweepFindings(rows,fleet);
 const by=bus=>findings.filter(f=>f.busNumber===bus).map(f=>f.source+":"+f.issue).sort();

 /* DT and MV are the two CUBIC screens. */
 assert.deepEqual(by("15506"),["dt:CUBIC Screen - BUS ER","note:Farebox - Coin off line"].sort());
 /* The note explained the coin column, so the generic coin fault is NOT also filed. */
 assert.ok(!by("15506").includes("coin:Farebox - Coin mech INOP"),"a note beats the column it explains");

 /* Two faults out of one note; the columns it covered stay quiet, the one it did not (power) does not. */
 assert.deepEqual(by("17531"),["note:Farebox - Coin off line","note:Farebox - Blank / black screen","power:Farebox - No power","bills:Farebox - Bill transport INOP"].sort());

 /* A bare column fault maps straight to its option. */
 assert.deepEqual(by("17548"),["bills:Farebox - Bill transport INOP"]);

 /* Already open on the bus: offered, but unticked, and labelled. */
 const known=findings.find(f=>f.busNumber==="17523");
 assert.equal(known.issue,"CUBIC Screen - MV ER");
 assert.equal(known.alreadyOpen,true);
 assert.equal(known.selected,false,"a finding already on the board must not be pre-selected");
 /* An unclear cell never becomes a finding. */
 assert.ok(!by("17523").some(s=>s.startsWith("dt:")),"unclear must not file");

 /* Fleet matching, same rules as the Down Sheet scan. */
 assert.equal(findings.find(f=>f.busNumber==="18500").fleetMatch,"duplicate");
 assert.equal(findings.find(f=>f.busNumber==="18500").selected,false);
 assert.equal(findings.find(f=>f.busNumber==="99999").fleetMatch,"unknown");
 assert.equal(findings.find(f=>f.busNumber==="99999").selected,false);

 /* Blank is nobody looked. */
 assert.equal(by("17500").length,0);

 /* Everything a finding points at is a real Tech Services option. */
 for(const f of findings)assert.ok(REPAIR_OPTIONS["Tech Services"].includes(f.issue),f.issue+" is not a Tech Services option");
});

test("sweep notes name the shop's own faults, and opposite lock faults never collide", () => {
 const issues=note=>noteIssues(note).map(item=>item.issue);
 assert.deepEqual(issues("coin off line"),["Farebox - Coin off line"]);
 assert.deepEqual(issues("Coin offline"),["Farebox - Coin off line"]);
 assert.deepEqual(issues("says unlock won't lock"),["Farebox - Unlocked / won't lock"]);
 assert.deepEqual(issues("farebox unlocked"),["Farebox - Unlocked / won't lock"]);
 assert.deepEqual(issues("blank screen"),["Farebox - Blank / black screen"]);
 assert.deepEqual(issues("coin bin missing"),["Farebox - Coin bin missing"]);
 /* "Can't unlock" is the OPPOSITE of "won't lock" and must not produce both. */
 assert.deepEqual(issues("can't unlock top to reset coin bypass"),["Farebox - Can't unlock top / coin bypass reset"]);
 assert.deepEqual(issues(""),[]);
 assert.deepEqual(issues("Cw"),[],"initials are not a fault");
});

test("the sweep lists buses ticked OK that the board still holds open, and files with provenance", () => {
 const fleet=[
  {id:"a",n:"17533",defects:[
   {id:"1",category:"Tech Services",issue:"Farebox",details:"",operability:"service",state:"open"},
   {id:"2",category:"Tech Services",issue:"CUBIC Screen - BUS ER",details:"",operability:"service",state:"open"},
   {id:"3",category:"Brakes",issue:"Other brake repair",details:"",operability:"service",state:"open"},
  ]},
  {id:"b",n:"18507",defects:[{id:"4",category:"Tech Services",issue:"Destination Sign",details:"",operability:"service",state:"open"}]},
  {id:"c",n:"17554",defects:[{id:"5",category:"Tech Services",issue:"Ventra",details:"",operability:"service",state:"completed"}]},
 ];
 const rows=[
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"17533",dt:"ok",mv:"ok",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""}),
  normalizeSweepRow({pageNumber:2,sheet:"farebox",busNumber:"17533",dt:"blank",mv:"blank",power:"ok",bills:"ok",coin:"ok",initial:"Cw",note:"",confidence:.9,reviewNote:""}),
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"18507",dt:"ok",mv:"ok",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""}),
  normalizeSweepRow({pageNumber:1,sheet:"ventra",busNumber:"17554",dt:"ok",mv:"ok",power:"blank",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""}),
 ];
 const ok=sweepOkAgainstBoard(rows,fleet);
 /* 17533: both devices OK on the sheet, farebox AND cubic open on the board — listed, brakes excluded. */
 const bus=ok.find(item=>item.busNumber==="17533");
 assert.ok(bus);
 assert.deepEqual(bus.openIssues.sort(),["CUBIC Screen - BUS ER","Farebox - INOP (general)"],"stored wordings are read through the migration, and non-Tech-Services records are ignored");
 /* 18507's open record is a destination sign; the sweep does not check those. */
 assert.ok(!ok.some(item=>item.busNumber==="18507"),"a record the sweep cannot see is not a disagreement");
 /* 17554's Ventra record is already completed. */
 assert.ok(!ok.some(item=>item.busNumber==="17554"));

 /* The record a finding becomes carries where it came from. */
 const finding=sweepFindings([normalizeSweepRow({pageNumber:2,sheet:"farebox",busNumber:"17531",dt:"blank",mv:"blank",power:"blank",bills:"blank",coin:"fault",initial:"BB",note:"coin off line",confidence:.8,reviewNote:""})],[{id:"z",n:"17531",defects:[]}])[0];
 const defect=sweepDefect(finding,"2026-08-29T21:00:00.000Z");
 assert.equal(defect.category,"Tech Services");
 assert.equal(defect.issue,"Farebox - Coin off line");
 assert.match(defect.details,/^coin off line — Sweep sheet p2 · checked by BB$/);
 assert.equal(defect.reportedBy,"BB");
 assert.equal(defect.state,"open");
 assert.equal(defect.source,"defect-log");
 assert.equal(defect.createdAt,"2026-08-29T21:00:00.000Z");
});

/* THE HEAT CHECK SHEET, as photographed on 2026-11-12.

   The middle and right-hand columns of the real page, transcribed by reading
   the photo: bus | result as written | date as written | initials | struck.
   The left-hand column is left out because the photo cut its bus numbers off
   at the edge. 77 lines: 46 N/R, 15 OK, 12 blank, 4 struck through. */
const HEAT_SHEET=`
17511|N/R|10/22|CD
17512|NR|10/28|MJ
17514|N/R|10/8|CD
17515|N/R|11/5|CD
17516|NR|11/3|MJ
17517|N/R|10/24|CD
17518|||
17519|N/R|10/24|CD
17520||||x
17521|N/R|10/13|CD
17522|N/R|10/15|CD
17523|N/R|10/20|CD
17524|OK|10/29|MJ
17525|N/R|11/7|CD|x
17526|N/R|10/4|CD
17527|NR|10/15|MJ
17528|OK|10/21|CD
17529|OK|10/13|CD
17530|||
17531|||
17532|OK|11/5|CD
17533|NR|10/20|CD
17534|NR|10/21|CD
17535|||
17536|NR|10/21|MJ
17537|NR|10/22|CD
17538|OK|10/22|MJ
17539|NR|11/3|MJ
17540|N/R|11/8|CD
17541|OK|10/24|CD
17542|N/R|11/4|CD
17543|||
17544|N/R|10/24|CD
17545|N/R|10/7|CD|x
17546|NR|10/16|CD
17547|||
17548|OK|10/15|MJ
17549|N/R|11/10|MJ
17550|NR|10/26|MJ
17551|NR|10/28|MJ
17552|N/R|10/15|CD
17553|NR|10/15|MJ|x
17554|N/R|9/29|CD
17555|N/R|10/7|CD
17556|||
17557|NR|10/5|MJ
17558|N/R|10/14|CD
17559|N/R|10/22|CD
17560|OK|10/13|CD
17561|N/R|10/24|CD
17562|N/R||
17563|||
17564|N/R|11/7|CD
17565|NR|10/28|MJ
17566|NR|10/14|CD
17567|N/R|10/15|CD
17568|||
17569|OK|11/4|MJ
17570|||
17571|N/R|10/27|CD
18500|NR|11/5|MJ
18501|N/R|10/13|CD
18502|NR|11/4|MJ
18503|NR|11/6|CD
18504|OK|10/16|CD
18505|NR|10/29|MJ
18506|N/R|11/1|CD
18507|OK|10/29|MJ
18508|NR|11/3|MJ
18509|NR|10/23|CD
18510|OK|10/21|MJ
20500|NR|10/22|MJ
20501|OK||
20502|OK||
20503|||
20504|OK||CD
20505|||
`.trim().split("\n").map(line=>{const [busNumber,written,date,initial,struck]=line.split("|");return {pageNumber:1,busNumber,written,date:date||"",initial:initial||"",struck:struck==="x",note:"",confidence:.9,reviewNote:""}});
/* Midday UTC, so "today" is the 12th on any clock from Honolulu to Tokyo. The
   tests that are ABOUT the local day build their own instants below. */
const HEAT_NOW="2026-11-12T12:00:00.000Z";

test("a heat sheet mark is read here and not by the model: N/R is a repair, OK is fine, blank is nobody looked",async()=>{
 const {heatMark,normalizeHeatRow}=await import("../src/lib/defects/heat-check-import.ts");
 for(const written of ["N/R","NR","n/r","N / R","N.R.","N\\R","N-R","N|R"])assert.equal(heatMark(written),"repair",written+" is the shop's needs-repair");
 for(const written of ["OK","ok","OKAY","O.K.","0K","Ok "])assert.equal(heatMark(written),"ok",written+" is a bus with heat");
 for(const written of ["","   ",undefined,null])assert.equal(heatMark(written),"blank","an empty cell is not a working heater");
 /* Never guessed into either pile. NO and R alone are the two halves of N/R and
    must not be read as it; a tick is not this sheet's word for anything. */
 for(const written of ["NO","R","N","X","✓","OK?","NRR","NOT OK","fixed","KO","N/A"])assert.equal(heatMark(written),"unclear",written+" goes to a person");
 /* Something that is not text is not an empty cell: it is the route returning
    what this module does not understand, and "nobody checked" would hide it. */
 for(const written of [7,0,{},["N/R"],true])assert.equal(heatMark(written),"unclear",JSON.stringify(written)+" is not a blank cell");

 /* The route's output is untrusted. `struck` takes a row OFF the filing pile,
    so only the boolean counts — the string "false" is truthy. */
 assert.equal(normalizeHeatRow({busNumber:"17511",written:"N/R",struck:"false"}).struck,false);
 assert.equal(normalizeHeatRow({busNumber:"17511",written:"N/R",struck:"true"}).struck,false);
 assert.equal(normalizeHeatRow({busNumber:"17511",written:"N/R",struck:true}).struck,true);
 const junk=normalizeHeatRow({busNumber:"#17511.",written:{},date:5,initial:"ABCDEFGHIJ",confidence:"7",pageNumber:-2},3);
 assert.deepEqual(junk,{pageNumber:3,busNumber:"17511",written:"? [object Object]",struck:false,date:"",initial:"ABCDEF",note:"",confidence:1,reviewNote:""});
 assert.equal(heatMark(junk.written),"unclear");
 assert.deepEqual(normalizeHeatRow(null),{pageNumber:1,busNumber:"",written:"",struck:false,date:"",initial:"",note:"",confidence:0,reviewNote:""});
 assert.equal(normalizeHeatRow({written:"N/R "+"x".repeat(40)}).written.length,24,"a cell is a cell, not a paragraph");

 /* A SCANNED number is never cut down to fit a real bus. */
 assert.equal(normalizeHeatRow({busNumber:"175111"}).busNumber,"175111","six digits is a misread, not bus 17511");
 assert.equal(normalizeHeatRow({busNumber:"17512 / 17514"}).busNumber,"1751217514","two buses in one cell is neither of them");
 assert.equal(normalizeHeatRow({busNumber:"01"}).busNumber,"01");
});

test("a date off the heat sheet has no year, so it takes the latest one that is not in the future",async()=>{
 const {heatCheckDate,HEAT_CHECK_MAX_AGE_DAYS}=await import("../src/lib/defects/heat-check-import.ts");
 assert.equal(heatCheckDate("10/22",HEAT_NOW),"2026-10-22");
 assert.equal(heatCheckDate("9/29",HEAT_NOW),"2026-09-29");
 assert.equal(heatCheckDate("11/12",HEAT_NOW),"2026-11-12","checked today is not the future");
 assert.equal(heatCheckDate(" 10 / 4 ",HEAT_NOW),"2026-10-04");
 assert.equal(heatCheckDate("10-22",HEAT_NOW),"2026-10-22");
 /* The sheet photographed after New Year: November was last year. */
 assert.equal(heatCheckDate("11/5","2027-01-08T12:00:00.000Z"),"2026-11-05");
 /* A written year is taken as written, two digits or four. */
 assert.equal(heatCheckDate("10/22/26",HEAT_NOW),"2026-10-22");
 assert.equal(heatCheckDate("10/22/2026",HEAT_NOW),"2026-10-22");
 /* Tomorrow resolves to last year's, which is not this season's walk. A wrong
    date would be believed; an empty one is checked against the paper. */
 assert.equal(heatCheckDate("11/13",HEAT_NOW),"");
 assert.equal(heatCheckDate("12/22",HEAT_NOW),"","a misread month must not become last December");
 assert.equal(heatCheckDate("10/22/27",HEAT_NOW),"","a written year in the future is a misread");
 assert.equal(heatCheckDate("10/22/25",HEAT_NOW),"","and one a year back is not this walk");
 /* The age limit is a boundary: one season back is in, a day more is out. */
 assert.equal(HEAT_CHECK_MAX_AGE_DAYS,183);
 assert.equal(heatCheckDate("5/13",HEAT_NOW),"2026-05-13");
 assert.equal(heatCheckDate("5/12",HEAT_NOW),"");
 /* Not a real day, and not a date at all. Date.UTC would roll 2/30 into March. */
 for(const written of ["2/30","13/1","0/5","10/0","10/32","","10","OK","10/22/2","1/2/3/4",null])assert.equal(heatCheckDate(written,HEAT_NOW),"",String(written));
 assert.equal(heatCheckDate("10/22","not a clock"),"");

 /* TODAY IS THE DAY ON THIS DEVICE'S CLOCK, not the day in Greenwich. Built
    from local parts so it asks the same question in any time zone: at half
    past eleven at night the 12th is still today and the 13th is still
    tomorrow, and half an hour later it is not. In UTC terms those two instants
    straddle midnight differently on every clock in the fleet. */
 const lateOnThe12th=new Date(2026,10,12,23,30).toISOString(),earlyOnThe13th=new Date(2026,10,13,0,30).toISOString();
 assert.equal(heatCheckDate("11/12",lateOnThe12th),"2026-11-12");
 assert.equal(heatCheckDate("11/13",lateOnThe12th),"");
 assert.equal(heatCheckDate("11/13",earlyOnThe13th),"2026-11-13");
 /* And New Year's Eve into New Year's Day, on the same local clock. */
 assert.equal(heatCheckDate("12/31",new Date(2026,11,31,23,30).toISOString()),"2026-12-31");
 assert.equal(heatCheckDate("12/31",new Date(2027,0,1,0,30).toISOString()),"2026-12-31");
 assert.equal(heatCheckDate("1/1",new Date(2027,0,1,0,30).toISOString()),"2027-01-01");
});

test("the photographed heat sheet files an N/R once, and never on a bus already tagged no heat",async()=>{
 const {heatFindings,heatSummary,heatDefect,heatFiling,canFileHeatFinding,heatIssueInCatalog,normalizeHeatRow,HEAT_CATEGORY,HEAT_ISSUE}=await import("../src/lib/defects/heat-check-import.ts");
 const {scanBatches,describeScanBatch,scanBatchWords,removeScanBatch,HEAT_SCAN_ID_PREFIX,SCAN_BATCH_ID_PREFIX}=await import("../src/lib/defects/scan-batches.ts");
 const {planOperatorCommand}=await import("../src/lib/operator/operator-engine.ts");
 const rows=HEAT_SHEET.map(row=>normalizeHeatRow(row));
 const open=(category,issue,extra={})=>[{id:"d-"+issue,category,issue,details:"",operability:"service",state:"open",...extra}];
 /* What the board already knows, one bus per way of knowing it. */
 const board={
  /* TAGGED, every way the No Heat Buses filter knows a bus by. */
  "17511":{defects:open("A/C and HVAC","Heating - No heat")},
  /* Diagnosed further than the paper: the duplicate would be the vaguer record. */
  "17514":{defects:open("A/C and HVAC","Heating - Heater boost pump")},
  "17521":{defects:open("Cooling System","Surge tank - heating side low")},
  "17533":{defects:open("Operator/Driver Controls","System Switches - Floor heat switch")},
  /* A legacy board line with no defects array at all, and the same words on a
     board that has an empty one — two different paths to the same answer. */
  "17546":{pendingRepair:"heater / defroster inop"},
  "17522":{defects:[],pendingRepair:"heater / defroster inop"},

  /* NOT tagged, and nothing to doubt: a bus that runs HOT, a heat repair with
     no finish stamp, and one finished three days BEFORE the paper's check. */
  "17516":{defects:open("Engine","Overheating")},
  "17515":{defects:open("A/C and HVAC","Heating - No heat",{state:"completed"})},
  "17526":{defects:open("A/C and HVAC","Heating - No heat",{state:"completed",completedAt:"2026-10-01T12:00:00.000Z"})},

  /* NOT tagged, but the board gives a reason to doubt the row is new. */
  /* Checked 10/20, heat repair finished 10/25: most likely the fault that fixed. */
  "17523":{defects:open("A/C and HVAC","Heating - Heater boost pump",{state:"completed",completedAt:"2026-10-25T12:00:00.000Z"})},
  /* Words about the heat that the filter, reading the repair and not the prose, does not count. */
  "17527":{defects:open("Miscellaneous","Driver-reported defect",{details:"no heat in bus"})},
  "17534":{pendingRepair:"NO HEAT"},

  /* The paper says OK and the board says no heat. */
  "17524":{defects:open("A/C and HVAC","Heating - No heat")},
  /* Struck through on the paper, still open on the board — once with the N/R
     legible under the line and once with nothing written at all. */
  "17545":{defects:open("A/C and HVAC","Heating - Floor heat INOP")},
  "17520":{defects:open("A/C and HVAC","Heating - No heat")},
 };
 const fleet=HEAT_SHEET.map(row=>({id:"b-"+row.busNumber,n:row.busNumber,...(board[row.busNumber]||{defects:[]})}));
 assert.ok(!("defects" in fleet.find(bus=>bus.n==="17546")),"the legacy fixture really has no defects array");
 const findings=heatFindings(rows,fleet,HEAT_NOW);
 const of=number=>findings.find(finding=>finding.busNumber===number);

 assert.equal(findings.length,77,"one finding per line of the sheet, blank lines included");
 assert.deepEqual(findings.map(finding=>finding.busNumber),HEAT_SHEET.map(row=>row.busNumber),"in the order the paper has them");
 assert.deepEqual(heatSummary(findings),{ok:15,repair:46,struck:4,notChecked:12,unclear:0,toFile:37,heldBack:3,alreadyTagged:6,checkBoard:3,look:0});

 for(const number of ["17511","17514","17521","17533","17546","17522"]){
  assert.equal(of(number).action,"already-tagged",number);
  assert.equal(of(number).selected,false,number+" must arrive unticked");
  assert.equal(of(number).openHeat.length,1,number);
  assert.equal(canFileHeatFinding(of(number)),false,number+" can never be filed, ticked or not");
 }
 for(const number of ["17516","17515","17526"]){
  assert.equal(of(number).action,"file",number);
  assert.equal(of(number).selected,true,number);
  assert.equal(of(number).heldBack,false,number);
  assert.deepEqual(of(number).openHeat,[],number);
 }

 /* HELD BACK: fileable, unticked, and saying why. */
 for(const number of ["17523","17527","17534"]){
  assert.equal(of(number).action,"file",number);
  assert.equal(of(number).heldBack,true,number);
  assert.equal(of(number).selected,false,number+" must arrive unticked");
  assert.equal(canFileHeatFinding(of(number)),true,number+" is still the person's to tick");
 }
 assert.match(of("17523").reviewNote,/A heat repair on this bus was finished 10\/25, on or after this check — tick it only if the heat is out again/);
 assert.match(of("17527").reviewNote,/The board already has "no heat in bus" on this bus/);
 assert.match(of("17534").reviewNote,/The board already has "NO HEAT" on this bus/);

 /* OK against an open heat repair is shown, never closed. */
 assert.equal(of("17524").action,"check-board");
 assert.equal(of("17528").action,"nothing");

 /* A struck row files nothing even with N/R still legible under the line. */
 for(const number of ["17520","17525","17545","17553"]){
  assert.equal(of(number).struck,true);
  assert.equal(of(number).selected,false,number);
  assert.equal(canFileHeatFinding(of(number)),false,number);
  assert.equal(heatDefect(of(number),HEAT_NOW),null,number+" must not be mintable at all");
 }
 assert.equal(of("17525").mark,"repair");
 assert.equal(of("17525").action,"nothing");
 assert.equal(of("17545").action,"check-board","struck on paper, open on the board: a person settles it");
 assert.equal(of("17520").action,"check-board","and the same for a line struck with nothing written on it");
 assert.equal(of("17553").action,"nothing");

 /* A blank line is nobody looked — not OK, not a repair, not a problem. */
 assert.equal(of("17518").mark,"blank");
 assert.equal(of("17518").action,"nothing");
 assert.equal(of("17518").reviewNote,"");
 assert.equal(heatDefect(of("17518"),HEAT_NOW),null);
 assert.equal(heatDefect(of("17528"),HEAT_NOW),null,"an OK is not a defect");

 /* What the paper wrote rides through untouched beside what it resolved to. */
 assert.equal(of("17554").checkedOn,"2026-09-29");
 assert.equal(of("17554").dateWritten,"9/29");
 assert.equal(of("17562").checkedOn,"","N/R with no date still files; it just has no day");
 assert.equal(of("17562").selected,true);

 /* THE PRESS. Ticking is the screen's; what a tick may do is not. A struck row
    and an already-tagged one are ticked here by force and must still file
    nothing, and a held-back row somebody ticks must file. */
 assert.ok(heatIssueInCatalog(),"the catalog still holds the entry an N/R is filed as");
 const FILED="2026-11-12T12:05:00.000Z";
 const forced=findings.map(finding=>["17525","17511","17528","17518"].includes(finding.busNumber)?{...finding,selected:true}:finding);
 const filing=heatFiling(forced,FILED);
 assert.equal(filing.length,37,"only what may be filed, whatever is ticked");
 assert.ok(!filing.some(item=>["17525","17511","17528","17518"].includes(item.busNumber)));
 assert.equal(heatFiling(findings.map(finding=>finding.busNumber==="17523"?{...finding,selected:true}:finding),FILED).length,38,"a held-back row is the person's to tick");
 assert.equal(heatFiling(findings.map(finding=>({...finding,selected:false})),FILED).length,0);
 /* A screen that edits a finding in place cannot talk the rule round: the same
    row with a line through it, or with its mark changed, is no longer fileable
    whatever `action` still says. */
 assert.ok(heatDefect(of("17512"),FILED));
 assert.equal(heatDefect({...of("17512"),struck:true},FILED),null);
 assert.equal(heatDefect({...of("17512"),mark:"ok"},FILED),null);
 assert.equal(heatDefect({...of("17512"),busId:""},FILED),null);
 assert.equal(heatDefect({...of("17512"),fleetMatch:"duplicate"},FILED),null);
 assert.equal(new Set(filing.map(item=>item.defect.id)).size,37,"every record has its own id");
 assert.notEqual(heatDefect(of("17512"),FILED).id,heatDefect(of("17512"),FILED).id,"and a second press on the same bus does not reuse it");
 assert.ok(filing.every(item=>item.defect.id.startsWith(HEAT_SCAN_ID_PREFIX+item.busNumber+"-")&&item.defect.id.startsWith(SCAN_BATCH_ID_PREFIX)));
 assert.ok(filing.every(item=>item.busId==="b-"+item.busNumber));

 /* FILE, then photograph the same sheet again: nothing left to file. */
 const filed=fleet.map(bus=>{const item=filing.find(entry=>entry.busId===bus.id);return item?{...bus,defects:[...(bus.defects||[]),item.defect]}:bus});
 const again=heatSummary(heatFindings(rows,filed,HEAT_NOW));
 assert.equal(again.toFile,0,"a second scan of the same paper must add nothing");
 assert.equal(again.alreadyTagged,43);
 assert.equal(again.heldBack,3);
 assert.deepEqual([again.ok,again.repair,again.struck,again.notChecked],[15,46,4,12],"what the paper says does not change because the board did");

 /* The record itself. */
 const defect=filing.find(item=>item.busNumber==="17512").defect;
 assert.equal(defect.category,HEAT_CATEGORY);
 assert.equal(defect.issue,HEAT_ISSUE);
 assert.equal(defect.details,"Heat check sheet p1 · marked NR · checked 10/28/2026 by MJ","the day carries its year, so it still reads next autumn");
 assert.equal(defect.reportedBy,"MJ");
 assert.equal(heatDefect({...of("17512"),initial:"Cw"},FILED).reportedBy,"CW","initials are stored one way, as the check log stores them");
 assert.equal(defect.state,"open");
 assert.equal(defect.source,"defect-log");
 assert.equal(defect.createdAt,FILED);
 assert.equal(defect.updatedAt,FILED);
 /* Whether a no-heat bus may still run is the catalog's answer, and today the
    catalog says it may. Pinned both ways: by the rule, and by its value. */
 assert.equal(defect.operability,defaultDefectOperability(HEAT_CATEGORY,HEAT_ISSUE));
 assert.equal(defect.operability,"service");
 assert.equal(filing.find(item=>item.busNumber==="17562").defect.details,"Heat check sheet p1 · marked N/R","no date and no initials invents neither");
 assert.equal(heatDefect({...of("17562"),note:"blower runs, air is cold"},FILED).details,"blower runs, air is cold — Heat check sheet p1 · marked N/R");
 assert.equal(heatDefect({...of("17512"),checkedOn:"",dateWritten:"12/28"},FILED).details,"Heat check sheet p1 · marked NR · checked 12/28 by MJ","an unplaceable date is kept as written, never given a year");
 assert.ok(quickFilterMatch({id:"x",defects:[defect]},"no-cabin-heat"),"what it files is what No Heat Buses lists");

 /* ONE PRESS IS ONE BATCH, so SCAN BATCHES can take a wrong scan back out — and
    it is named for what it is, not as the farebox sweep it shares a prefix with. */
 const SWEPT="2026-09-06T23:30:14.612Z";
 const withSweep=filed.map(bus=>bus.n==="17548"?{...bus,defects:[...(bus.defects||[]),{id:"sweep-17548-power-0-abc",category:"Tech Services",issue:"Farebox - No power",details:"",operability:"service",state:"open",createdAt:SWEPT,source:"defect-log",reportedBy:"EJ"}]}:bus);
 const batches=scanBatches(withSweep);
 assert.deepEqual(batches.map(batch=>[batch.key,batch.kind,batch.ids.length]),[[FILED,"heat",37],[SWEPT,"sweep",1]]);
 assert.equal(batches[0].removableIds.length,37);
 assert.deepEqual([...batches[0].checkedBy].sort(),["CD","MJ"]);
 assert.equal(describeScanBatch(batches[0],()=>"Nov 12, 6:05 AM"),"37 No Heat records on 37 buses · Nov 12, 6:05 AM · checked by MJ, CD");
 assert.equal(describeScanBatch(batches[1],()=>"Sep 6, 6:30 PM"),"1 record on 1 bus · Sep 6, 6:30 PM · checked by EJ","a sweep reads exactly as it did");
 assert.equal(scanBatchWords(batches[0]).noun,"heat sheet scan");
 assert.equal(scanBatchWords(batches[1]).noun,"scan sweep");
 /* A stamp holding both kinds claims the less specific one. */
 const mixed=scanBatches([{id:"m",n:"17548",defects:[{id:HEAT_SCAN_ID_PREFIX+"17548-1-a",category:HEAT_CATEGORY,issue:HEAT_ISSUE,details:"",operability:"service",state:"open",createdAt:SWEPT},{id:"sweep-17548-power-0-abc",category:"Tech Services",issue:"Farebox - No power",details:"",operability:"service",state:"open",createdAt:SWEPT}]}]);
 assert.equal(mixed[0].kind,"sweep");
 /* THE OPERATOR REMOVES THE SCAN THAT WAS ASKED FOR, and says what it is. It
    used to take the newest batch of either kind and describe it as a sweep. */
 const asOperator=buses=>buses.map((bus,index)=>({...bus,s:"service",l:"road-"+index,down:false,pendingRepair:bus.pendingRepair||""}));
 const ask=(text,buses)=>{const fleetNow=asOperator(buses);return planOperatorCommand(text,fleetNow,[{name:"IN SERVICE / ON ROAD",slots:fleetNow.map(bus=>bus.l)}])};
 /* Naming no kind means the newest of any — here, the heat scan. */
 const plan=ask("remove the last scan from the defect log",withSweep);
 assert.equal(plan.kind,"plan");
 assert.equal(plan.plan.kind,"removeScanBatch");
 assert.equal(plan.plan.batchKey,FILED);
 assert.match(plan.plan.summary,/^Remove the 37 No Heat records the heat sheet scan filed at .* from 37 buses/);
 assert.doesNotMatch(plan.plan.summary,/Tech Services|SCAN SWEEP filed|sweep back/);
 assert.match(plan.plan.summary,/The heat checks that scan logged come off the check log with it/);
 assert.match(plan.plan.summary,/tell me to put the scan back\.$/);
 /* Naming the sweep gets the sweep, though the heat scan is newer. */
 const sweepPlan=ask("remove the last scan sweep from the defect log",withSweep);
 assert.equal(sweepPlan.plan.batchKey,SWEPT);
 assert.match(sweepPlan.plan.summary,/^Remove the 1 Tech Services record SCAN SWEEP filed at /);
 assert.doesNotMatch(sweepPlan.plan.summary,/heat/i);
 /* Naming the heat scan gets the heat scan, though a sweep is newer. */
 const LATER_SWEEP="2026-11-13T09:00:00.000Z";
 const sweepNewest=filed.map(bus=>bus.n==="17548"?{...bus,defects:[...(bus.defects||[]),{id:"sweep-17548-power-0-abc",category:"Tech Services",issue:"Farebox - No power",details:"",operability:"service",state:"open",createdAt:LATER_SWEEP,updatedAt:LATER_SWEEP,source:"defect-log",reportedBy:"EJ"}]}:bus);
 assert.equal(scanBatches(sweepNewest)[0].kind,"sweep","the fixture really has the sweep newest");
 for(const wording of ["remove the last heat sheet scan from the defect log","undo the heat scan","take the heat sheet scan out of the defect log"]){
  const named=ask(wording,sweepNewest);
  assert.equal(named.kind,"plan",wording);
  assert.equal(named.plan.batchKey,FILED,wording);
  assert.match(named.plan.summary,/^Remove the 37 No Heat records/,wording);
 }
 /* Asked for a heat scan when there is none: said plainly, and the scan that IS
    there is named rather than offered up in its place. */
 const noHeat=ask("remove the last heat sheet scan from the defect log",removeScanBatch(sweepNewest,FILED,LATER_SWEEP).fleet);
 assert.equal(noHeat.kind,"message");
 assert.match(noHeat.message,/There is no heat sheet scan on this device's Defect Log/);
 assert.match(noHeat.message,/There is a scan sweep: 1 record on 1 bus/);

 /* A SCANNED RECORD SOMEBODY HAS NARROWED IS NOT "UNTOUCHED". The checker knew
    only that the bus was cold; the mechanic opens the record, makes it the
    boost pump and writes a line. None of that is a field the old test for
    "worked on" named, so removing the batch took the diagnosis with it. */
 const EDITED="2026-11-12T13:00:00.000Z";
 const narrowed=filed.map(bus=>bus.n!=="17512"?bus:{...bus,defects:bus.defects.map(item=>item.id.startsWith(HEAT_SCAN_ID_PREFIX)?{...item,issue:"Heating - Heater boost pump",details:item.details+" — pump runs, no flow",updatedAt:EDITED}:item)});
 const afterEdit=scanBatches(narrowed)[0];
 assert.equal(afterEdit.keptIds.length,1);
 assert.equal(afterEdit.removableIds.length,36);
 const takenOut=removeScanBatch(narrowed,FILED,LATER_SWEEP);
 assert.equal(takenOut.removed.length,36);
 assert.equal(takenOut.kept,1);
 assert.deepEqual(takenOut.fleet.find(bus=>bus.n==="17512").defects.map(item=>item.issue),["Heating - Heater boost pump"]);
 /* And taking it out takes out exactly the heat records, leaving the sweep. */
 const removed=removeScanBatch(withSweep,FILED,"2026-11-12T12:10:00.000Z");
 assert.equal(removed.removed.length,37);
 assert.deepEqual(scanBatches(removed.fleet).map(batch=>batch.kind),["sweep"]);
 assert.equal(heatSummary(heatFindings(rows,removed.fleet,HEAT_NOW)).toFile,37,"and the sheet can be filed again afterwards");
});

test("a heat sheet photographed twice gives one row per bus, and a number the board does not have files nothing",async()=>{
 const {heatFindings,heatSummary,heatDefect,canFileHeatFinding,normalizeHeatRow}=await import("../src/lib/defects/heat-check-import.ts");
 const row=(busNumber,written,date="",extra={})=>normalizeHeatRow({pageNumber:1,busNumber,written,date,initial:"CD",confidence:.9,...extra});
 const fleet=["17511","17512","17514","17515","17516","17517","17518","17519","17520","17521","17522","17523","17524","17525","17526"].map(n=>({id:"b-"+n,n,defects:[]}));
 /* The board's own number is tidied; the scan's never is. */
 fleet.find(bus=>bus.n==="17520").n=" #17520 ";
 fleet.push({id:"twin-a",n:"18500",defects:[]},{id:"twin-b",n:"18500",defects:[]});
 /* A heat repair finished this season, on a bus whose row carries no date. */
 fleet.find(bus=>bus.n==="17524").defects=[{id:"done",category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"completed",completedAt:"2026-10-25T12:00:00.000Z"}];
 /* And one finished on the very day of the check. */
 fleet.find(bus=>bus.n==="17525").defects=[{id:"same-day",category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"completed",completedAt:"2026-10-25T12:00:00.000Z"}];
 const findings=heatFindings([
  /* The retake overlaps the first photo: the SAME LINE, read twice. Same mark,
     same date, same initials, two different photos. */
  row("17511","N/R","10/22"),row("17511","NR","10/22",{pageNumber:2,initial:"cd"}),
  /* Photographed earlier in the walk, when the line was still blank. */
  row("17512","","",{initial:""}),row("17512","N/R","10/28",{pageNumber:2}),
  /* TWO MARKS FOR ONE BUS ARE NEVER SETTLED BY THE SCAN, dated or not. */
  row("17514","N/R","10/7"),row("17514","OK","11/3",{pageNumber:2}),
  row("17515","N/R","10/7"),row("17515","OK","",{pageNumber:2}),
  row("17516","N/R","10/7"),row("17516","OK","10/7",{pageNumber:2}),
  /* The retake missed the pen line and read the 7 as a 9. */
  row("17517","N/R","10/7",{struck:true}),row("17517","N/R","10/9",{pageNumber:2}),
  /* THE CASE A SECOND COLD READ DROVE. Two adjacent lines on ONE photo, both
     N/R, and the model read the first one's bus number as the second's. They
     agree about the mark, so they used to merge into one ticked finding for
     17519 carrying 17518's date and checker — and 17518, a cold bus, was in
     the review nowhere at all. */
  row("17519","N/R","10/20",{initial:"MJ"}),row("17519","N/R","10/24"),
  /* Agreeing marks on two photos, but not the same line: the dates differ. */
  row("17521","OK","10/13"),row("17521","OK","10/24",{pageNumber:2}),
  /* And the same line returned twice from ONE photo cannot be an overlap. */
  row("17522","OK","10/15"),row("17522","OK","10/15"),
  /* Two photos, same mark, same date — and two different people's initials.
     One line has one checker, so this is two lines. */
  row("17526","OK","10/21"),row("17526","OK","10/21",{pageNumber:2,initial:"MJ"}),
  /* A date and initials with the result cell empty: somebody checked it. */
  row("17523","","10/22"),
  /* Six digits, and two buses in one cell. Neither is a real bus. */
  row("175221","N/R","10/22"),row("17522 / 17523","N/R","10/22"),
  /* No date on the row, and a heat repair finished this season. */
  row("17524","N/R","",{initial:""}),
  /* Checked 10/25, repair finished 10/25: on or after, so held back. */
  row("17525","N/R","10/25"),
  /* The board's number, typed untidily. */
  row("17520","OK","10/24",{initial:"MJ"}),
  /* The photo's left edge: half a bus number, and none at all. */
  row("01","N/R","10/1"),
  row("","N/R","11/5"),row("","","",{initial:""}),
  /* Two buses on the board share this number. */
  row("18500","N/R","11/5"),
  /* Nothing this fleet owns: a repair, an OK, a struck row and an empty line. */
  row("99999","N/R","11/5"),row("99997","OK","11/5"),row("99996","N/R","11/5",{struck:true}),row("99998","","",{initial:""}),
 ],fleet,HEAT_NOW);
 const of=number=>findings.find(finding=>finding.busNumber===number);
 assert.deepEqual(findings.map(finding=>finding.busNumber),["17511","17512","17514","17515","17516","17517","17519","17521","17522","17526","17523","175221","1752217523","17524","17525","17520","01","","18500","99999","99997","99996","99998"]);

 assert.equal(of("17511").action,"file");
 assert.match(of("17511").reviewNote,/On the sheet 2 times, read once/);
 assert.equal(of("17512").action,"file","a blank copy never outvotes a written one");
 assert.equal(of("17512").pageNumber,2);
 for(const number of ["17514","17515","17516","17517","17519","17521","17522","17526"]){
  assert.equal(of(number).action,"look",number+" was read more than once and the paper settles it");
  assert.equal(of(number).selected,false,number);
  assert.equal(canFileHeatFinding(of(number)),false,number);
  assert.equal(heatDefect(of(number),HEAT_NOW),null,number);
  assert.match(of(number).reviewNote,/read 2 times and the lines do not match — one of them is probably another bus/,number);
 }
 assert.equal(of("17518"),undefined,"the misread number left no row for 17518 — which is why 17519 must be looked at, not filed");
 assert.equal(of("17520").busId,"b-17520","the board's number is matched however it was typed");

 assert.equal(of("17523").mark,"blank");
 assert.equal(of("17523").action,"look","dated and initialled with no result is a missed mark, not an unchecked bus");
 assert.match(of("17523").reviewNote,/A date or initials with no result/);

 for(const number of ["175221","1752217523","01","99999","99997","99996"]){
  assert.equal(of(number).action,"look",number);
  assert.equal(of(number).fleetMatch,"unknown");
  assert.equal(of(number).busId,"");
  assert.equal(of(number).selected,false,number);
  assert.equal(heatDefect(of(number),HEAT_NOW),null,number);
  assert.match(of(number).reviewNote,/Not a bus number on the board/);
 }
 assert.equal(of("").action,"look","a mark with no bus beside it is shown, not dropped");
 assert.match(of("").reviewNote,/No bus number could be read on this line/);
 assert.equal(findings.filter(finding=>finding.busNumber==="").length,1,"an empty line with no number is not a row");
 assert.equal(of("18500").fleetMatch,"duplicate");
 assert.equal(of("18500").action,"look");
 assert.match(of("18500").reviewNote,/Two buses on the board share this number/);
 assert.equal(heatDefect(of("18500"),HEAT_NOW),null);
 assert.equal(of("99998").action,"nothing","an empty line for an unknown bus is not something to look at");

 assert.equal(of("17524").action,"file");
 assert.equal(of("17524").heldBack,true);
 assert.match(of("17524").reviewNote,/finished 10\/25, and this row has no date/);
 assert.equal(of("17525").heldBack,true,"a repair finished ON the day of the check holds the row back too");
 assert.match(of("17525").reviewNote,/finished 10\/25, on or after this check/);

 assert.deepEqual(findings.filter(finding=>finding.selected).map(finding=>finding.busNumber),["17511","17512"]);
 const summary=heatSummary(findings);
 assert.equal(summary.toFile,2);
 assert.equal(summary.heldBack,2);
 assert.equal(summary.look,17);
 assert.equal(summary.notChecked,1,"only the empty line counts as not checked");
 assert.equal(summary.unclear,1,"the dated line with no result is unclear, not unchecked");

 /* A mark that is neither word reaches a person and is never filed. */
 const odd=heatFindings([row("17511","X","10/22"),row("17512","N/R","12/22")],fleet,HEAT_NOW);
 assert.equal(odd[0].mark,"unclear");
 assert.equal(odd[0].action,"look");
 assert.match(odd[0].reviewNote,/neither OK nor N\/R/);
 assert.equal(odd[1].action,"file","an unplaceable date does not stop a clear N/R");
 assert.match(odd[1].reviewNote,/Date "12\/22" could not be placed/);

 /* A heat repair finished LAST season does not hold back a row with no date. */
 const stale=[{id:"b-17524",n:"17524",defects:[{id:"old",category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"completed",completedAt:"2026-02-01T12:00:00.000Z"}]}];
 assert.equal(heatFindings([row("17524","N/R","",{initial:""})],stale,HEAT_NOW)[0].heldBack,false);
 /* One finished the day BEFORE the check does not hold a dated row back. */
 assert.equal(heatFindings([row("17525","N/R","10/26")],fleet,HEAT_NOW)[0].heldBack,false);
 /* And a finished repair that is not a heat repair holds back nothing. */
 const other=[{id:"b-17524",n:"17524",defects:[{id:"oh",category:"Engine",issue:"Overheating",details:"",operability:"service",state:"completed",completedAt:"2026-10-25T12:00:00.000Z"}]}];
 assert.equal(heatFindings([row("17524","N/R","10/20")],other,HEAT_NOW)[0].heldBack,false);
});

test("the heat check log keeps every check as its own event, and reading the same paper twice adds nothing",async()=>{
 const {heatFindings,heatFiling,localDay,normalizeHeatRow,tickHeatFinding}=await import("../src/lib/defects/heat-check-import.ts");
 const {HEAT_CHECKS_KEY,HEAT_CHECKS_LIMIT,HEAT_CHECK_BY_LIMIT,addHeatChecks,dropScanChecks,heatChecksFromFindings,mergeHeatChecks,normalizeHeatChecks,paperCheckId,readHeatChecks,recordHeatCheck,undoHeatCheck,writeHeatChecks}=await import("../src/lib/defects/heat-check-log.ts");
 assert.equal(HEAT_CHECKS_KEY,"pace-heat-checks-v1");
 const rows=HEAT_SHEET.map(row=>normalizeHeatRow(row));
 const fleet=HEAT_SHEET.map(row=>({id:"b-"+row.busNumber,n:row.busNumber,defects:[]}));
 fleet.find(bus=>bus.n==="17511").defects=[{id:"d",category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"open"}];
 const READ="2026-11-12T12:05:00.000Z";
 const findings=heatFindings(rows,fleet,HEAT_NOW);
 const log=heatChecksFromFindings(findings,READ);
 const of=number=>log.filter(check=>check.busNumber===number);

 /* Every line the paper makes a clear statement about: 46 N/R and 15 OK. An
    N/R on a bus that is ALREADY tagged files no defect and is still a check. */
 assert.equal(log.length,61);
 assert.equal(log.filter(check=>check.result==="no-heat").length,46);
 assert.equal(log.filter(check=>check.result==="ok").length,15);
 assert.deepEqual(of("17511"),[{id:"paper-17511-no-heat-2026-10-22-CD",busNumber:"17511",result:"no-heat",on:"2026-10-22",by:"CD",at:READ,source:"paper"}]);
 assert.deepEqual(of("17524"),[{id:"paper-17524-ok-2026-10-29-MJ",busNumber:"17524",result:"ok",on:"2026-10-29",by:"MJ",at:READ,source:"paper"}]);
 /* No date and no initials on the paper: the check happened, and neither is invented. */
 assert.deepEqual(of("17562"),[{id:"paper-17562-no-heat-undated@"+localDay(READ)+"-NONE",busNumber:"17562",result:"no-heat",on:"",by:"",at:READ,source:"paper"}]);
 /* A blank line is nobody's finding, and a struck one is not recorded as one
    until Curtis has confirmed what the line means. */
 for(const number of ["17518","17520","17525","17545","17553"])assert.deepEqual(of(number),[],number);
 /* Nor is anything the scan could not stand behind. */
 const shaky=heatFindings([
  normalizeHeatRow({busNumber:"17512",written:"X",date:"10/28",initial:"MJ"}),
  normalizeHeatRow({busNumber:"99999",written:"N/R",date:"10/28",initial:"MJ"}),
  normalizeHeatRow({busNumber:"17514",written:"N/R",date:"10/7",initial:"CD"}),normalizeHeatRow({busNumber:"17514",written:"OK",date:"11/3",initial:"CD"}),
  normalizeHeatRow({busNumber:"17515",written:"",date:"10/7",initial:"CD"}),
 ],fleet,HEAT_NOW);
 assert.deepEqual(heatChecksFromFindings(shaky,READ),[]);
 assert.deepEqual(heatChecksFromFindings(findings,"not a clock"),[]);

 /* A ROW THE REVIEWER TURNED DOWN IS NOT A CHECK. 17512 arrives ticked; unticked
    by hand it is somebody saying this row is wrong, and it must not put the bus
    under VERIFY. A row the RULES held back is different and is still logged. */
 const turnedDown=tickHeatFinding(findings,findings.find(finding=>finding.busNumber==="17512").key,false);
 assert.equal(heatChecksFromFindings(turnedDown,READ).filter(check=>check.busNumber==="17512").length,0);
 assert.equal(heatChecksFromFindings(turnedDown,READ).length,60);
 const heldRow={...findings.find(finding=>finding.busNumber==="17514"),heldBack:true,selected:false};
 assert.equal(heatChecksFromFindings([heldRow],READ).length,1,"a held-back row is unticked by rule, and the paper's word about it stands");
 /* A tick can only ever land on a row that may be filed. */
 const okKey=findings.find(finding=>finding.busNumber==="17524").key;
 assert.equal(tickHeatFinding(findings,okKey,true).find(finding=>finding.key===okKey).selected,false);
 assert.deepEqual(tickHeatFinding(findings,"no such key",true),findings);
 /* AN OK HAS TO BE A CLEAN READ: it is the result that takes a bus off the walk.
    A shaky N/R still files, because that errs toward somebody going to look. */
 const shakyOk={...findings.find(finding=>finding.busNumber==="17524"),confidence:.69};
 const cleanOk={...findings.find(finding=>finding.busNumber==="17524"),confidence:.7};
 const shakyCold={...findings.find(finding=>finding.busNumber==="17514"),confidence:.2};
 assert.deepEqual(heatChecksFromFindings([shakyOk],READ),[]);
 assert.equal(heatChecksFromFindings([cleanOk],READ).length,1);
 assert.equal(heatChecksFromFindings([shakyCold],READ).length,1);
 /* And a finding somebody has altered cannot talk its way into the log: a
    number the board does not hold is not a check, whatever its action says. */
 const real=findings.find(finding=>finding.busNumber==="17512");
 assert.equal(heatChecksFromFindings([real],READ).length,1);
 assert.deepEqual(heatChecksFromFindings([{...real,fleetMatch:"unknown"},{...real,fleetMatch:"duplicate"},{...real,struck:true},{...real,action:"look"},{...real,mark:"unclear"},{...real,mark:"blank"}],READ),[]);

 /* THE SAME PAPER READ AGAIN, an hour later or on another phone, is the same
    checks. The id is what the line says. */
 const LATER="2026-11-12T13:30:00.000Z";
 const reread=mergeHeatChecks(log,heatChecksFromFindings(findings,LATER));
 assert.equal(reread.length,61,"a second photo of the same sheet must not log a second check");
 assert.ok(reread.every(check=>check.at===READ),"and each keeps the stamp it was first written with");
 assert.equal(paperCheckId("17511","no-heat","2026-10-22","cd"),"paper-17511-no-heat-2026-10-22-CD");
 /* AN UNDATED LINE IS NAMED BY THE DAY IT WAS READ. Last winter's undated OK and
    this winter's were one check stamped last year, and the bus read NOT CHECKED
    the week it was scanned. Read again the same day it is still one check. */
 assert.equal(paperCheckId("20501","ok","","","2026-11-12"),"paper-20501-ok-undated@2026-11-12-NONE");
 assert.notEqual(paperCheckId("20501","ok","","","2026-11-12"),paperCheckId("20501","ok","","","2026-02-03"));
 const undated=at=>({busNumber:"20501",result:"ok",on:"",by:"",at,source:"paper"});
 assert.equal(mergeHeatChecks([undated("2026-02-03T12:00:00.000Z")],[undated("2026-11-12T12:00:00.000Z")]).length,2,"two seasons, two checks");
 assert.equal(mergeHeatChecks([undated("2026-11-12T12:00:00.000Z")],[undated("2026-11-12T12:30:00.000Z")]).length,1,"the same sheet read twice in a day is one");
 /* The same bus on a different day, or with the other result, is a different check. */
 assert.notEqual(paperCheckId("17511","no-heat","2026-10-22","CD"),paperCheckId("17511","no-heat","2026-10-23","CD"));
 assert.notEqual(paperCheckId("17511","no-heat","2026-10-22","CD"),paperCheckId("17511","ok","2026-10-22","CD"));

 /* TWO PHONES. One read the paper; the other was carried down the lane. Either
    way round, the merge is everything both hold, once. */
 const TAP="2026-11-12T14:00:00.000Z";
 const walked=recordHeatCheck([],{busNumber:"17511",result:"ok",by:"mj"},TAP,"aaa111");
 assert.equal(walked.length,1);
 assert.equal(walked[0].id,"app-17511-"+Date.parse(TAP)+"-aaa111");
 assert.equal(walked[0].by,"MJ","initials are stored one way");
 assert.equal(walked[0].source,"app");
 assert.equal(walked[0].on,new Date(TAP).getFullYear()+"-"+String(new Date(TAP).getMonth()+1).padStart(2,"0")+"-"+String(new Date(TAP).getDate()).padStart(2,"0"),"a tap is checked on the day of this device's clock");
 const mine=mergeHeatChecks(log,walked),theirs=mergeHeatChecks(walked,log);
 assert.equal(mine.length,62);
 assert.deepEqual(mine.map(check=>check.id).sort(),theirs.map(check=>check.id).sort());
 assert.deepEqual(of("17511").length&&mine.filter(check=>check.busNumber==="17511").map(check=>check.result),["no-heat","ok"],"the second check does not overwrite the first");
 /* Half past eleven at night on the 12th is a check on the 12th, on whatever
    clock the phone is set to — in Greenwich terms it is already the 13th for
    every garage west of it. */
 assert.equal(recordHeatCheck([],{busNumber:"17511",result:"ok",by:"MJ"},new Date(2026,10,12,23,30).toISOString(),"late")[0].on,"2026-11-12");
 assert.equal(recordHeatCheck([],{busNumber:"17511",result:"ok",by:"MJ"},new Date(2026,10,13,0,30).toISOString(),"early")[0].on,"2026-11-13");
 /* Two taps are two checks, even in the same millisecond on the same bus. */
 const twice=recordHeatCheck(walked,{busNumber:"17511",result:"ok",by:"MJ"},TAP,"bbb222");
 assert.equal(twice.length,2);
 /* A tap that names no bus, or arrives with no clock, records nothing and loses nothing. */
 assert.equal(recordHeatCheck(walked,{busNumber:"",result:"ok",by:"MJ"},TAP).length,1);
 assert.equal(recordHeatCheck(walked,{busNumber:"17512",result:"ok",by:"MJ"},"not a clock").length,1);
 assert.equal(recordHeatCheck(walked,{busNumber:"17512",result:"ok",by:"MJ",note:"  rear only  "},LATER,"ccc333")[0].note,"rear only");

 /* Anything from storage or another phone is untrusted. */
 const AT="2026-11-12T12:00:00.000Z";
 assert.deepEqual(normalizeHeatChecks("nope"),[]);
 assert.deepEqual(normalizeHeatChecks([null,7,{},
  {busNumber:"17511",result:"maybe",at:AT},
  {busNumber:"",result:"ok",at:AT},
  {busNumber:"17511",result:"ok",at:"yesterday"},
  {busNumber:"17511",result:true,at:AT},
 ]),[],"a result that is not one of the two words is not a check");
 /* A day that is not a day is dropped; only the paper may honestly have none. */
 const [paper,app]=normalizeHeatChecks([
  {busNumber:"#17512",result:"no-heat",on:"2026-02-30",by:" cd ",at:AT,source:"paper",note:""},
  {busNumber:"17514",result:"ok",on:"10/22",by:"toolongname",at:"2026-11-12T12:01:00.000Z",source:"somewhere"},
 ]);
 assert.deepEqual(paper,{id:"paper-17512-no-heat-undated@"+localDay(AT)+"-CD",busNumber:"17512",result:"no-heat",on:"",by:"CD",at:AT,source:"paper"});
 assert.equal(app.source,"app","an unknown source is this device's own");
 assert.equal(app.on,String(new Date("2026-11-12T12:01:00.000Z").getFullYear())+"-11-12","an app check with no usable day takes the day it was recorded");
 /* Sixteen, the length of the YOUR NAME box the tap shares. It was six, and
    MICHAEL J was MICHAE on the check and MICHAEL J on the defect. */
 assert.equal(app.by,"TOOLONGNAME");
 assert.equal(HEAT_CHECK_BY_LIMIT,16);
 assert.equal(normalizeHeatChecks([{busNumber:"17511",result:"ok",by:"michael j of the night crew",at:AT}])[0].by,"MICHAEL J OF THE");
 assert.ok(!("note" in paper));

 /* The cap drops the OLDEST recorded, never the newest. */
 assert.equal(HEAT_CHECKS_LIMIT,2000);
 const many=[];for(let i=0;i<6;i++)many.push({id:"c"+i,busNumber:"17511",result:"ok",on:"2026-11-0"+(i+1),by:"CD",at:"2026-11-0"+(i+1)+"T12:00:00.000Z",source:"app"});
 assert.deepEqual(normalizeHeatChecks([...many].reverse(),3).map(check=>check.id),["c3","c4","c5"]);
 assert.deepEqual(mergeHeatChecks(many.slice(0,4),many.slice(2),3).map(check=>check.id),["c3","c4","c5"],"a merge is capped to the newest of both");
 /* An id seen twice is one check, and the first copy is the one kept. */
 assert.deepEqual(normalizeHeatChecks([{...many[0],by:"CD"},{...many[0],by:"MJ"}]).map(check=>check.by),["CD"]);

 /* Storage is handed in, and a broken record reads as no checks rather than throwing. */
 const disk=new Map(),storage={getItem:key=>disk.has(key)?disk.get(key):null,setItem:(key,value)=>{disk.set(key,value)}};
 assert.deepEqual(readHeatChecks(storage),[]);
 assert.deepEqual(writeHeatChecks(storage,mine),{ok:true});
 assert.deepEqual([...disk.keys()],[HEAT_CHECKS_KEY]);
 assert.deepEqual(readHeatChecks(storage),mine);
 assert.deepEqual(writeHeatChecks({getItem:()=>null,setItem(){throw new Error("full")}},mine),{ok:false,why:"full"});
 /* A LOG THAT CANNOT BE READ DRAWS AS EMPTY AND IS NOT WRITTEN OVER. It read as
    no checks and the next tap replaced it with a log of one. Both spellings:
    text that is not JSON, and JSON that is not a list — a newer shape of this
    log on a phone still running an older page. */
 for(const stored of ["{not json",JSON.stringify({version:2,checks:mine})]){
  disk.set(HEAT_CHECKS_KEY,stored);
  assert.deepEqual(readHeatChecks(storage),[],"unreadable draws as empty");
  assert.deepEqual(writeHeatChecks(storage,mine),{ok:false,why:"unreadable"});
  assert.deepEqual(addHeatChecks(storage,mine),{ok:false,why:"unreadable",added:mine.length,total:mine.length});
  assert.equal(disk.get(HEAT_CHECKS_KEY),stored,"and what was stored is still there, byte for byte");
 }
 /* Nothing stored, or an empty string, is an EMPTY log and takes a write. */
 disk.set(HEAT_CHECKS_KEY,"");
 assert.deepEqual(writeHeatChecks(storage,mine),{ok:true});
 const {heatLogProblemWords}=await import("../src/lib/defects/heat-check-log.ts");
 assert.match(heatLogProblemWords("full"),/storage is full/);
 assert.match(heatLogProblemWords("unreadable"),/could not be read.*left alone/);

 /* ADDING TO THE LOG ON DISK merges, and reports what was NEW. */
 const shelf=new Map(),shelfStorage={getItem:key=>shelf.has(key)?shelf.get(key):null,setItem:(key,value)=>{shelf.set(key,value)}};
 assert.deepEqual(addHeatChecks(shelfStorage,walked),{ok:true,added:1,total:1});
 assert.deepEqual(addHeatChecks(shelfStorage,log),{ok:true,added:61,total:62});
 assert.equal(readHeatChecks(shelfStorage).length,62,"the tap that was already there is still there");
 assert.deepEqual(addHeatChecks(shelfStorage,heatChecksFromFindings(findings,LATER)),{ok:true,added:0,total:62},"the same sheet again adds none, and says none");
 assert.deepEqual(addHeatChecks({getItem:()=>null,setItem(){throw new Error("full")}},walked),{ok:false,why:"full",added:1,total:1});
 /* AT THE CAP THE LOG STILL TAKES A CHECK. `added` was the change in LENGTH,
    which is zero once the oldest drops out to make room — so a full log wrote
    nothing and the scan said every line "was already in the log". */
 const fullLog=[];for(let i=0;i<HEAT_CHECKS_LIMIT;i++)fullLog.push({id:"old-"+i,busNumber:"17511",result:"ok",on:"2026-01-01",by:"CD",at:new Date(Date.parse("2026-01-01T00:00:00.000Z")+i*1000).toISOString(),source:"app"});
 const capDisk=new Map([[HEAT_CHECKS_KEY,JSON.stringify(fullLog)]]),capStorage={getItem:key=>capDisk.has(key)?capDisk.get(key):null,setItem:(key,value)=>{capDisk.set(key,value)}};
 assert.equal(readHeatChecks(capStorage).length,HEAT_CHECKS_LIMIT);
 assert.deepEqual(addHeatChecks(capStorage,walked),{ok:true,added:1,total:HEAT_CHECKS_LIMIT});
 const capped=readHeatChecks(capStorage).map(check=>check.id);
 assert.ok(capped.includes(walked[0].id),"the new check is on disk");
 assert.ok(!capped.includes("old-0"),"and the oldest made room for it");
 assert.equal(capped.length,HEAT_CHECKS_LIMIT);
 /* TAKING A SCAN'S CHECKS OFF THE LOG ON DISK: the scan's, and only for a heat
    scan. This is the function both the Defect Log and the AI Operator call. */
 assert.deepEqual(dropScanChecks(shelfStorage,{kind:"sweep",key:READ}),{ok:true,removed:0});
 assert.equal(readHeatChecks(shelfStorage).length,62);
 assert.deepEqual(dropScanChecks(shelfStorage,{kind:"heat",key:"2020-01-01T00:00:00.000Z"}),{ok:true,removed:0});
 assert.deepEqual(dropScanChecks(shelfStorage,{kind:"heat",key:READ}),{ok:true,removed:61});
 assert.deepEqual(readHeatChecks(shelfStorage).map(check=>check.id),[walked[0].id],"the tap is nobody's scan");
 /* TAKING ONE TAP BACK. */
 assert.deepEqual(undoHeatCheck(shelfStorage,"no such check"),{ok:true,removed:false});
 assert.deepEqual(undoHeatCheck(shelfStorage,walked[0].id),{ok:true,removed:true});
 assert.deepEqual(readHeatChecks(shelfStorage),[]);

 /* And the scan files a defect for every N/R the board did not already hold. */
 const filing=heatFiling(findings,READ);
 assert.equal(filing.length,45,"46 N/R less the one already tagged");
});

test("the heat sheet roster sets the board beside the last check, and the board decides who is cold",async()=>{
 const {heatRoster,heatRosterCounts,heatShareText,recordHeatCheck,normalizeHeatChecks}=await import("../src/lib/defects/heat-check-log.ts");
 const heat=(extra={})=>({id:"h",category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"open",...extra});
 const check=(busNumber,result,on,extra={})=>({busNumber,result,on,by:"CD",at:(on||"2026-11-12")+"T12:00:00.000Z",source:on?"app":"paper",...extra});
 const fleet=[
  {id:"a",n:"17511",defects:[heat()]},
  {id:"b",n:"17512",defects:[heat({issue:"Heating - Heater boost pump"})]},
  {id:"c",n:"17514",defects:[heat({state:"completed"})]},
  {id:"d",n:"17515",defects:[]},
  {id:"e",n:"17516",defects:[]},
  {id:"f",n:"17517",defects:[]},
  {id:"g",n:"17518",defects:[]},
  {id:"h",n:"17519",defects:[]},
  {id:"i",n:"17520",defects:[]},
  /* Two buses on the board sharing a number are one line on anybody's sheet. */
  {id:"j1",n:"18500",defects:[]},{id:"j2",n:"18500",defects:[heat()]},
  {id:"k",n:"9000",defects:[]},
  {id:"l",n:"",defects:[heat()]},
  /* Not on anybody's walk. Left in, it sat under NOT CHECKED for good and the
     to-do count could never reach zero. */
  {id:"m",n:"17599",s:"decommissioned",defects:[heat()]},
 ];
 const log=normalizeHeatChecks([
  /* Cold on the board, and the last person said so too. */
  check("17511","no-heat","2026-10-22"),
  /* Cold on the board, and somebody has since found it warm: the row to offer
     "mark the repair fixed" on. The board still decides. */
  check("17512","no-heat","2026-10-07"),check("17512","ok","2026-11-03",{by:"MJ"}),
  /* Repair closed, last check said no heat: go and look. */
  check("17514","no-heat","2026-10-08"),
  /* Never became a defect, last check said no heat: also go and look. */
  check("17515","no-heat","2026-11-05"),
  /* Found cold, then found warm. */
  check("17516","no-heat","2026-10-07"),check("17516","ok","2026-11-03",{by:"MJ"}),
  /* An undated N/R off the paper never outranks a dated check. */
  check("17517","no-heat","",{at:"2026-11-12T12:00:00.000Z"}),check("17517","ok","2026-11-03",{by:"MJ"}),
  /* Last winter's OK says nothing about this winter. */
  check("17519","ok","2026-02-01"),
  /* Two checks on one day: the later one written down stands. */
  check("17520","ok","2026-11-10",{at:"2026-11-10T09:00:00.000Z"}),check("17520","no-heat","2026-11-10",{at:"2026-11-10T15:00:00.000Z",by:"MJ"}),
  /* A check dated tomorrow is a mistake, not a finding. */
  check("9000","ok","2026-11-13"),
  /* A bus the board does not hold. */
  check("19999","no-heat","2026-11-01"),
 ]);
 const roster=heatRoster(fleet,log,HEAT_NOW);
 const of=number=>roster.find(row=>row.busNumber===number);
 assert.deepEqual(roster.map(row=>row.busNumber+":"+row.status),[
  "17511:no-heat","17512:no-heat","18500:no-heat",
  "17514:verify","17515:verify","17520:verify",
  "9000:unchecked","17518:unchecked","17519:unchecked",
  "17516:ok","17517:ok",
 ],"what needs somebody first, then by number as a number");
 assert.deepEqual(heatRosterCounts(roster),{noHeat:3,verify:3,unchecked:3,ok:2,todo:9,total:11});

 assert.equal(of("17511").checkedOkWhileOpen,false);
 assert.deepEqual(of("17511").openHeat,["A/C and HVAC — No heat"]);
 assert.equal(of("17512").status,"no-heat","a warm check does not clear an open repair");
 assert.equal(of("17512").checkedOkWhileOpen,true);
 assert.equal(of("17512").latest.by,"MJ");
 assert.equal(of("17512").checks,2);
 assert.equal(of("18500").openHeat.length,1,"either twin's open repair counts");
 assert.equal(of("17517").latest.result,"ok");
 assert.equal(of("17517").checks,2);
 assert.equal(of("17519").latest,null,"last season's check is history, not standing");
 assert.equal(of("17519").checks,1,"and it is still in the log");
 assert.equal(of("17520").latest.by,"MJ");
 assert.equal(of("9000").latest,null);
 assert.equal(of("19999"),undefined,"a check for a bus the board does not hold is not a row");
 assert.equal(of("17599"),undefined,"a decommissioned bus is not on the walk");
 /* An undated line counts from the day it was read, so on its own it stands. */
 const lone=heatRoster([{id:"z",n:"20501",defects:[]}],[{busNumber:"20501",result:"ok",on:"",by:"",at:"2026-11-10T12:00:00.000Z",source:"paper"}],HEAT_NOW)[0];
 assert.equal(lone.status,"ok");
 assert.equal(heatRoster([{id:"z",n:"20501",defects:[]}],[{busNumber:"20501",result:"ok",on:"",by:"",at:"2026-02-03T12:00:00.000Z",source:"paper"}],HEAT_NOW)[0].status,"unchecked","read last winter, it is history");

 /* One tap, and the row moves. */
 const after=heatRoster(fleet,recordHeatCheck(log,{busNumber:"17514",result:"ok",by:"MJ"},HEAT_NOW,"zzz999"),HEAT_NOW);
 assert.equal(after.find(row=>row.busNumber==="17514").status,"ok");
 /* And closing the repair on the board moves 17512 without anybody touching the log. */
 const closed=fleet.map(bus=>bus.n==="17512"?{...bus,defects:[heat({issue:"Heating - Heater boost pump",state:"completed"})]}:bus);
 assert.equal(heatRoster(closed,log,HEAT_NOW).find(row=>row.busNumber==="17512").status,"ok");
 /* An empty log is a fleet nobody has checked. */
 assert.deepEqual(heatRosterCounts(heatRoster(fleet,[],HEAT_NOW)),{noHeat:3,verify:0,unchecked:8,ok:0,todo:11,total:11});

 /* THE LIST TO HAND TO WHOEVER IS ON HEAT DUTY. Plain text, real line breaks. */
 const day=new Date(HEAT_NOW).getMonth()+1+"/"+new Date(HEAT_NOW).getDate();
 assert.equal(heatShareText(roster,"remaining",HEAT_NOW),[
  "HEAT CHECK · "+day,
  "3 no heat · 3 to verify · 3 not checked · 2 OK",
  "",
  "NO HEAT (3)",
  "  17511 — A/C and HVAC — No heat",
  "  17512 — A/C and HVAC — Heater boost pump — checked OK 11/3 MJ — repair still open",
  "  18500 — A/C and HVAC — No heat",
  "",
  "REPAIRED OR NEVER LOGGED — VERIFY (3)",
  "  17514 — last check: no heat 10/8 CD",
  "  17515 — last check: no heat 11/5 CD",
  "  17520 — last check: no heat 11/10 MJ",
  "",
  "NOT CHECKED (3)",
  "  9000, 17518, 17519",
 ].join("\n"));
 const full=heatShareText(roster,"full",HEAT_NOW);
 assert.ok(full.startsWith(heatShareText(roster,"remaining",HEAT_NOW)));
 assert.ok(full.endsWith(["","HEAT OK (2)","  17516 — OK 11/3 MJ","  17517 — OK 11/3 MJ"].join("\n")));
 assert.ok(!heatShareText(roster,"remaining",HEAT_NOW).includes("HEAT OK"),"a bus that is fine is not a stop on the walk");
 assert.equal(heatShareText([],"remaining",HEAT_NOW),["HEAT CHECK · "+day,"0 no heat · 0 to verify · 0 not checked · 0 OK","","No buses on the board."].join("\n"));
 const allGood=heatRoster([{id:"a",n:"17516",defects:[]}],log,HEAT_NOW);
 assert.equal(heatShareText(allGood,"remaining",HEAT_NOW),["HEAT CHECK · "+day,"0 no heat · 0 to verify · 0 not checked · 1 OK","","Every bus has been checked and has heat."].join("\n"));
});

test("a page that is not a heat check sheet files nothing, and one that only looks wrong arrives unticked",async()=>{
 const {heatLoggable,heatMark,heatPageVerdict,heatReviewGroups,heatScanReview,heatLowConfidence,HEAT_LOW_CONFIDENCE,normalizeHeatDocument,normalizeHeatRow}=await import("../src/lib/defects/heat-check-import.ts");
 const row=(busNumber,written)=>normalizeHeatRow({busNumber,written});
 assert.equal(normalizeHeatDocument("heat"),"heat");
 assert.equal(normalizeHeatDocument(" Other "),"other");
 for(const raw of ["","farebox","ventra",undefined,null,7,{}])assert.equal(normalizeHeatDocument(raw),"unknown",String(raw));

 const sheet=[row("17511","N/R"),row("17512","OK"),row("17514",""),row("17515","NR"),row("17516","?")];
 assert.equal(heatPageVerdict("heat",sheet),"heat","one scribble on a real sheet is still a heat sheet");
 /* The model's own word wins outright, whatever the rows look like. */
 assert.equal(heatPageVerdict("other",sheet),"not-a-heat-sheet");
 assert.equal(heatPageVerdict("unknown",sheet),"unsure","no verdict is not a yes");
 /* A Down Sheet read as a heat sheet: the result column holds repairs. More
    than half of what is WRITTEN is neither word, so the page is suspect even
    though it was called a heat sheet. Blank lines do not vote. */
 const downSheet=[row("17511","MISFIRE CYL 5"),row("17512","A21"),row("17514","BRAKES"),row("17515","OK"),row("17516",""),row("17517","")];
 assert.equal(heatPageVerdict("heat",downSheet),"unsure");
 /* Exactly half is not most. */
 assert.equal(heatPageVerdict("heat",[row("17511","X"),row("17512","OK")]),"heat");
 /* A sheet nobody has started is all blanks, and that is a heat sheet. */
 assert.equal(heatPageVerdict("heat",[row("17511",""),row("17512","")]),"heat");
 assert.equal(heatPageVerdict("heat",[]),"heat");
 /* A model that will not return an empty string writes a dash. A half-walked
    sheet is mostly empty cells, and read as "unclear" it was a page where most
    of what was written was neither word — held as not looking like a heat
    sheet. A lone dash is an empty cell. */
 for(const dash of ["-","—","–","--","_"," - "])assert.equal(heatMark(dash),"blank",JSON.stringify(dash));
 assert.equal(heatMark("N-R"),"repair","and a dash INSIDE the two letters is still the separator");
 assert.equal(heatPageVerdict("heat",[row("17511","N/R"),row("17512","-"),row("17514","—"),row("17515","-"),row("17516","-")]),"heat");

 /* ONE PRESS OF READ SHEET, three photos: another document, a heat sheet, and
    one the scan could not vouch for. */
 const R=(busNumber,written,extra={})=>({pageNumber:1,busNumber,written,struck:false,date:"10/22",initial:"CD",note:"",confidence:.9,reviewNote:"",...extra});
 const board=["17511","17512","17514","17515","17516","17517","17518"].map(n=>({id:"b-"+n,n,defects:[]}));
 const review=heatScanReview([
  {document:"other",rows:[R("17511","MISFIRE"),R("17512","N/R")]},
  {document:"heat",rows:[R("17514","N/R"),R("17515","OK"),R("17516","OK",{confidence:.4})]},
  {document:"whatever",rows:[R("17517","N/R"),R("17518","OK")]},
  {document:"heat",rows:"not an array"},
 ],board,HEAT_NOW);
 assert.deepEqual(review.held,[{page:1,verdict:"not-a-heat-sheet"},{page:3,verdict:"unsure"}]);
 /* Nothing from the page that is another document — not unticked rows, none. */
 assert.deepEqual(review.findings.map(finding=>finding.busNumber+"@"+finding.pageNumber),["17514@2","17515@2","17516@2","17517@3","17518@3"],"each row carries the photo it came from, whatever the model called the page");
 /* The unsure page's N/R arrives unticked; the trusted page's arrives ticked. */
 assert.deepEqual(review.findings.filter(finding=>finding.selected).map(finding=>finding.busNumber),["17514"]);
 /* And the unsure page is never offered to the log. */
 assert.deepEqual(review.loggable.map(finding=>finding.busNumber),["17514","17515","17516"]);
 assert.deepEqual(heatLoggable(review.findings,[]).length,5);
 /* The review's groups, by rule. The OK buses are their own group so that
    they are SEEN: each one logged comes off the walking list. */
 const groups=heatReviewGroups(review.findings);
 assert.deepEqual(groups.toFile.map(finding=>finding.busNumber),["17514","17517"]);
 assert.deepEqual(groups.warm.map(finding=>finding.busNumber),["17515","17516","17518"]);
 assert.deepEqual([groups.tagged.length,groups.disagree.length,groups.look.length,groups.struck.length],[0,0,0,0]);
 assert.equal(HEAT_LOW_CONFIDENCE,.7);
 assert.deepEqual(groups.warm.map(heatLowConfidence),[false,true,false]);
 assert.deepEqual(heatScanReview([],board,HEAT_NOW),{findings:[],held:[],loggable:[]});
});

test("a NO HEAT tap opens one ordinary defect on the board on disk, and never a second",async()=>{
 const {applyHeatFiling,fileHeatTap,heatTapDefect,recordHeatTap}=await import("../src/lib/defects/heat-check-apply.ts");
 const {HEAT_CHECKS_KEY,readHeatChecks}=await import("../src/lib/defects/heat-check-log.ts");
 const {HEAT_CATEGORY,HEAT_ISSUE}=await import("../src/lib/defects/heat-check-import.ts");
 const {scanBatches}=await import("../src/lib/defects/scan-batches.ts");
 const {FLEET_STORAGE_KEY,DOWN_SHEET_STORAGE_KEY,FLEET_RECOVERY_STORAGE_KEY}=await import("../src/lib/storage/storage.ts");
 const {memoryStorage}=await import("./helpers/setup.mjs");
 const NOW=new Date(2026,10,12,15,0).toISOString();
 const bus=(n,defects=[],extra={})=>({id:"b-"+n,n,s:"service",l:"road-"+n,down:false,pendingRepair:"",defects,...extra});
 const heat=(extra={})=>({id:"h-"+Math.random(),category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"open",createdAt:"2026-10-01T12:00:00.000Z",...extra});
 const boardOf=storage=>JSON.parse(storage.getItem(FLEET_STORAGE_KEY)).buses;
 const seed=buses=>memoryStorage({[FLEET_STORAGE_KEY]:JSON.stringify({kind:"buses",version:4,buses})});

 /* The record: what a hand-logged No Heat is, and nothing a scan's is. */
 const made=heatTapDefect(" mj ",NOW,"","defect-fixed-id");
 assert.deepEqual(made,{id:"defect-fixed-id",category:HEAT_CATEGORY,issue:HEAT_ISSUE,details:"Heat check · checked 11/12/2026 by MJ",operability:defaultDefectOperability(HEAT_CATEGORY,HEAT_ISSUE),state:"open",createdAt:NOW,updatedAt:NOW,source:"defect-log",reportedBy:"MJ"});
 assert.equal(heatTapDefect("",NOW).details,"Heat check · checked 11/12/2026","no initials invents none");
 assert.equal(heatTapDefect("MJ",NOW,"  floor only  ").details,"floor only — Heat check · checked 11/12/2026 by MJ");
 assert.ok(!heatTapDefect("MJ",NOW).id.startsWith("sweep-"),"a tap is not a scan batch");
 assert.notEqual(heatTapDefect("MJ",NOW).id,heatTapDefect("MJ",NOW).id);

 const storage=seed([bus("17511"),bus("17512",[heat({issue:"Heating - Heater boost pump"})]),bus("17514",[{id:"oil",category:"Engine",issue:"Oil leak",details:"",operability:"service",state:"open",createdAt:"2026-10-01T12:00:00.000Z"}]),bus("18500"),bus("18500",[],{id:"twin"})]);
 /* Files, through the Defect Log's own save: one defect, the bus's other work
    untouched, the summary line rebuilt, and a recovery snapshot taken first. */
 assert.deepEqual(fileHeatTap(storage,"17511","mj",NOW),{ok:true,filed:true});
 const filed=boardOf(storage).find(item=>item.n==="17511");
 assert.equal(filed.defects.length,1);
 assert.equal(filed.defects[0].issue,HEAT_ISSUE);
 assert.equal(filed.defects[0].reportedBy,"MJ");
 assert.equal(filed.defects[0].source,"defect-log");
 assert.equal(filed.down,false,"a no-heat bus still runs: it never joins the Down Sheet");
 assert.match(filed.pendingRepair,/No heat/);
 assert.ok(storage.getItem(FLEET_RECOVERY_STORAGE_KEY),"the board's own write path was used, recovery snapshot and all");
 assert.equal(storage.getItem(DOWN_SHEET_STORAGE_KEY),null,"and the Down Sheet was not written at all");
 assert.deepEqual(scanBatches(boardOf(storage)),[],"a tap never shows up as a scan to be taken back out");
 assert.equal(boardOf(storage).find(item=>item.n==="17514").defects[0].issue,"Oil leak");

 /* Never a second: tapped again, and tapped on a bus tagged another way. */
 assert.deepEqual(fileHeatTap(storage,"17511","MJ",NOW),{ok:true,filed:false,why:"already-tagged"});
 assert.deepEqual(fileHeatTap(storage,"#17512","MJ",NOW),{ok:true,filed:false,why:"already-tagged"});
 assert.equal(boardOf(storage).find(item=>item.n==="17511").defects.length,1);
 assert.equal(boardOf(storage).find(item=>item.n==="17512").defects.length,1);

 /* THE BOARD ON DISK, NOT THE ONE A PAGE REMEMBERS. Another tab logs a heat
    repair on 17514; the tap that follows must see it. */
 const disk=JSON.parse(storage.getItem(FLEET_STORAGE_KEY));
 disk.buses.find(item=>item.n==="17514").defects.push(heat({issue:"Heating - Floor heat INOP"}));
 storage.setItem(FLEET_STORAGE_KEY,JSON.stringify(disk));
 assert.deepEqual(fileHeatTap(storage,"17514","MJ",NOW),{ok:true,filed:false,why:"already-tagged"});
 assert.deepEqual(boardOf(storage).find(item=>item.n==="17514").defects.map(item=>item.issue),["Oil leak","Heating - Floor heat INOP"]);

 /* A tap that cannot name exactly one bus changes nothing and says why. */
 const before=storage.getItem(FLEET_STORAGE_KEY);
 assert.deepEqual(fileHeatTap(storage,"99999","MJ",NOW),{ok:false,why:"no-bus"});
 assert.deepEqual(fileHeatTap(storage,"","MJ",NOW),{ok:false,why:"no-bus"});
 assert.deepEqual(fileHeatTap(storage,"18500","MJ",NOW),{ok:false,why:"two-buses"});
 assert.equal(storage.getItem(FLEET_STORAGE_KEY),before);
 assert.deepEqual(fileHeatTap(memoryStorage({[FLEET_STORAGE_KEY]:"{not json"}),"17511","MJ",NOW),{ok:false,why:"unreadable"});
 /* A board that refuses the write is reported, not swallowed. */
 const full=seed([bus("17511")]),realSet=full.setItem.bind(full);
 full.setItem=(key,value)=>{if(key===FLEET_STORAGE_KEY)throw Object.assign(new Error("full"),{name:"QuotaExceededError"});realSet(key,value)};
 assert.deepEqual(fileHeatTap(full,"17511","MJ",NOW),{ok:false,why:"not-saved"});
 assert.equal(boardOf(full).find(item=>item.n==="17511").defects.length,0);

 /* A heat repair FINISHED yesterday does not stop today's tap. The bus is cold
    again, that is a new fault, and the LOG DEFECT form would take it too — the
    finished record stays as history beside the new open one. */
 const yesterday=new Date(2026,10,11,15,0).toISOString();
 const recent=seed([bus("17511",[heat({state:"completed",createdAt:yesterday,updatedAt:yesterday,completedAt:yesterday})])]);
 assert.deepEqual(fileHeatTap(recent,"17511","MJ",NOW),{ok:true,filed:true});
 assert.deepEqual(boardOf(recent)[0].defects.map(item=>item.state),["completed","open"]);

 /* THE DOWN SHEET ON DISK IS READ, NOT ASSUMED EMPTY. A bus that is on the sheet
    stays `down` after a tap about its heater; and a sheet that cannot be read
    refuses the tap, because the save would otherwise work `down` out from
    nothing and clear it. */
 const sheet={kind:"entries",version:1,entries:[{id:"e1",busId:"b-17511",busNumber:"17511",category:"Engine",repair:"Misfire",customReason:"",workflow:"Scheduled"}]};
 const onSheet=seed([bus("17511",[],{down:true})]);onSheet.setItem(DOWN_SHEET_STORAGE_KEY,JSON.stringify(sheet));
 assert.deepEqual(fileHeatTap(onSheet,"17511","MJ",NOW),{ok:true,filed:true});
 assert.equal(boardOf(onSheet)[0].down,true,"still on the Down Sheet, so still down");
 assert.equal(onSheet.getItem(DOWN_SHEET_STORAGE_KEY),JSON.stringify(sheet),"and the sheet itself was not rewritten");
 const badSheet=seed([bus("17511",[],{down:true})]);badSheet.setItem(DOWN_SHEET_STORAGE_KEY,"{not json");
 const untouched=badSheet.getItem(FLEET_STORAGE_KEY);
 assert.deepEqual(fileHeatTap(badSheet,"17511","MJ",NOW),{ok:false,why:"unreadable"});
 assert.equal(badSheet.getItem(FLEET_STORAGE_KEY),untouched);

 /* ONE TAP, WHOLE. */
 const lane=seed([bus("17511"),bus("17512",[heat()])]);
 /* No initials: nothing at all. */
 assert.deepEqual(recordHeatTap(lane,"17511","ok","  ",NOW),{ok:false,why:"no-initials"});
 assert.equal(lane.getItem(HEAT_CHECKS_KEY),null);
 /* HEAT OK FILES NOTHING, EVER — not on a clean bus, and not on a cold one,
    whose open repair it must not close either. The board is byte-identical. */
 const boardBefore=lane.getItem(FLEET_STORAGE_KEY);
 const okTap=recordHeatTap(lane,"17511","ok","mj",NOW,"seed01");
 assert.deepEqual(okTap,{ok:true,checkId:"app-17511-"+Date.parse(NOW)+"-seed01",filed:false});
 assert.deepEqual(recordHeatTap(lane,"17512","ok","mj",NOW,"seed02").filed,false);
 assert.equal(lane.getItem(FLEET_STORAGE_KEY),boardBefore,"a HEAT OK tap must not touch the board");
 assert.deepEqual(readHeatChecks(lane).map(check=>check.busNumber+":"+check.result+":"+check.by),["17511:ok:MJ","17512:ok:MJ"]);
 /* NO HEAT opens the defect and records the check; on a tagged bus, the check only. */
 assert.deepEqual(recordHeatTap(lane,"17511","no-heat","mj",NOW,"seed03"),{ok:true,checkId:"app-17511-"+Date.parse(NOW)+"-seed03",filed:true});
 assert.equal(boardOf(lane).find(item=>item.n==="17511").defects.length,1);
 assert.equal(recordHeatTap(lane,"17512","no-heat","mj",NOW,"seed04").filed,false);
 assert.equal(boardOf(lane).find(item=>item.n==="17512").defects.length,1);
 assert.equal(readHeatChecks(lane).length,4);
 /* A tap the board refused records NO check. */
 assert.deepEqual(recordHeatTap(lane,"99999","no-heat","mj",NOW),{ok:false,why:"no-bus"});
 assert.equal(readHeatChecks(lane).length,4);
 /* A check the log refused is said to be that, and the defect it followed is
    on the board — the half-state is reported, never hidden. */
 const logFull=seed([bus("17511")]),logSet=logFull.setItem.bind(logFull);
 logFull.setItem=(key,value)=>{if(key===HEAT_CHECKS_KEY)throw new Error("full");logSet(key,value)};
 assert.deepEqual(recordHeatTap(logFull,"17511","no-heat","mj",NOW),{ok:false,why:"check-not-saved",filed:true,log:"full"});
 assert.equal(boardOf(logFull)[0].defects.length,1);
 /* HEAT OK opens nothing, so the same refusal leaves nothing behind and says so;
    and an unreadable log is named as that, not as a full disk. */
 const okFull=seed([bus("17511")]),okSet=okFull.setItem.bind(okFull);
 okFull.setItem=(key,value)=>{if(key===HEAT_CHECKS_KEY)throw new Error("full");okSet(key,value)};
 assert.deepEqual(recordHeatTap(okFull,"17511","ok","mj",NOW),{ok:false,why:"check-not-saved",filed:false,log:"full"});
 assert.equal(boardOf(okFull)[0].defects.length,0);
 const garbled=seed([bus("17511")]);garbled.setItem(HEAT_CHECKS_KEY,"{not json");
 assert.deepEqual(recordHeatTap(garbled,"17511","ok","mj",NOW),{ok:false,why:"check-not-saved",filed:false,log:"unreadable"});
 assert.equal(garbled.getItem(HEAT_CHECKS_KEY),"{not json");

 /* applyHeatFiling judges each item against the board the last one left. */
 const twice=applyHeatFiling([bus("17511")],[],[{busId:"b-17511",busNumber:"17511",defect:heatTapDefect("MJ",NOW)},{busId:"b-17511",busNumber:"17511",defect:heatTapDefect("CD",NOW)},{busId:"gone",busNumber:"1",defect:heatTapDefect("CD",NOW)}],NOW);
 assert.equal(twice.filed.length,1);
 assert.equal(twice.skipped.length,2);
 assert.equal(twice.fleet[0].defects.length,1);
 assert.deepEqual(twice.downEntries,[]);
});

test("taking a heat scan back out takes the checks it logged, and nobody else's",async()=>{
 const {normalizeHeatChecks,withoutScanChecks,HEAT_STANDING_LABEL,HEAT_SCAN_PARAM,HEAT_SCAN_VALUE,heatRoster,heatRosterLane,heatRowDetail,heatScanHref}=await import("../src/lib/defects/heat-check-log.ts");
 const {memoryStorage}=await import("./helpers/setup.mjs");
 const SCAN="2026-11-12T12:05:00.000Z",EARLIER="2026-11-05T12:00:00.000Z";
 const paper=(busNumber,result,at)=>({busNumber,result,on:"2026-10-22",by:"CD",at,source:"paper"});
 const log=normalizeHeatChecks([
  paper("17511","no-heat",SCAN),paper("17512","ok",SCAN),
  /* Read on an earlier scan; the merge kept its earlier stamp. Not this scan's. */
  paper("17514","no-heat",EARLIER),
  /* A tap in the same instant is still somebody at a bus, not the scan. */
  {busNumber:"17515",result:"ok",on:"2026-11-12",by:"MJ",at:SCAN,source:"app",id:"app-17515-x"},
 ]);
 const cut=withoutScanChecks(log,SCAN);
 assert.equal(cut.removed,2);
 assert.deepEqual(cut.checks.map(check=>check.busNumber),["17514","17515"]);
 assert.deepEqual(withoutScanChecks(log,"2026-11-12T12:05:00Z").checks.length,2,"the stamp is matched as an instant, however it is spelled");
 assert.equal(withoutScanChecks(log,"2020-01-01T00:00:00.000Z").removed,0);
 assert.equal(withoutScanChecks(log,"not a clock").removed,0);
 assert.equal(withoutScanChecks(log,"not a clock").checks.length,4);

 /* The list's groups, labels and row text are this module's, so the screen and
    the shared list cannot say two different things. */
 const heat={id:"h",category:"A/C and HVAC",issue:"Heating - No heat",details:"",operability:"service",state:"open"};
 const fleet=[{id:"a",n:"17511",defects:[heat]},{id:"b",n:"17512",defects:[heat]},{id:"c",n:"17514",defects:[]},{id:"d",n:"17515",defects:[]},{id:"e",n:"17516",defects:[]},{id:"f",n:"17517",defects:[]}];
 const checks=normalizeHeatChecks([
  {busNumber:"17512",result:"ok",on:"2026-11-03",by:"MJ",at:"2026-11-03T12:00:00.000Z",source:"app"},
  {busNumber:"17514",result:"no-heat",on:"2026-10-08",by:"CD",at:"2026-10-08T12:00:00.000Z",source:"app"},
  {busNumber:"17515",result:"ok",on:"2026-11-04",by:"",at:"2026-11-04T12:00:00.000Z",source:"app"},
  {busNumber:"17517",result:"ok",on:"2026-01-04",by:"CD",at:"2026-01-04T12:00:00.000Z",source:"app"},
 ]);
 const roster=heatRoster(fleet,checks,HEAT_NOW);
 assert.deepEqual(heatRosterLane(roster,"todo").map(row=>row.busNumber),["17511","17512","17514","17516","17517"],"everything but the buses that are fine");
 assert.deepEqual(heatRosterLane(roster,"ok").map(row=>row.busNumber),["17515"]);
 assert.deepEqual(heatRosterLane(roster,"verify").map(row=>row.busNumber),["17514"]);
 assert.deepEqual(heatRosterLane(roster,"unchecked").map(row=>row.busNumber),["17516","17517"]);
 assert.deepEqual(HEAT_STANDING_LABEL,{"no-heat":"NO HEAT",verify:"VERIFY",unchecked:"NOT CHECKED",ok:"HEAT OK"});
 const detail=number=>heatRowDetail(roster.find(row=>row.busNumber===number));
 assert.equal(detail("17511"),"A/C and HVAC — No heat","an open repair nobody has checked says only what is open");
 assert.equal(detail("17512"),"A/C and HVAC — No heat · checked OK 11/3 MJ — repair still open");
 assert.equal(detail("17514"),"Nothing open on the board · last check: no heat 10/8 CD");
 assert.equal(detail("17515"),"Checked OK 11/4");
 assert.equal(detail("17516"),"Never checked");
 assert.equal(detail("17517"),"Not checked this season","last winter's check is said to exist, not counted");

 /* The tap guard is a number beside the rules, not a magic one in a component. */
 const {HEAT_TAP_GUARD_MS}=await import("../src/lib/defects/heat-check-log.ts");
 assert.ok(HEAT_TAP_GUARD_MS>=400&&HEAT_TAP_GUARD_MS<=1500,"long enough to stop a double-tap, short enough not to be waited on");

 /* One address for the scanner, read and written by the same two names. */
 assert.equal(heatScanHref(),"/defect-log?"+HEAT_SCAN_PARAM+"="+HEAT_SCAN_VALUE);
 assert.equal(heatScanHref(),"/defect-log?scan=heat");

 /* MASTER EXPORT carries the log, and a restore MERGES it: the checks already
    on this device survive a file from another one. */
 const {restoreFleetBackup,readFleetBackup}=await import("../src/lib/storage/fleet-restore.ts");
 const {HEAT_CHECKS_KEY,readHeatChecks}=await import("../src/lib/defects/heat-check-log.ts");
 const mine=normalizeHeatChecks([{busNumber:"17511",result:"ok",on:"2026-11-10",by:"MJ",at:"2026-11-10T12:00:00.000Z",source:"app",id:"app-mine"}]);
 const storage=memoryStorage({[HEAT_CHECKS_KEY]:JSON.stringify(mine)});
 const file=readFleetBackup(JSON.stringify({kind:"pace-south-fleet-board-backup",version:6,buses:[{id:"a",n:"17511",l:"road-1",s:"service"}],heatChecks:[paper("17511","no-heat",SCAN),{...mine[0]}]}));
 assert.equal(file.ok,true);
 const restored=restoreFleetBackup(storage,file.backup);
 assert.equal(restored.ok,true);
 assert.ok(restored.restored.includes("heat checks"));
 assert.deepEqual(readHeatChecks(storage).map(check=>check.id).sort(),["app-mine","paper-17511-no-heat-2026-10-22-CD"]);
 /* A file from before the log existed leaves the device's checks alone. */
 const older=memoryStorage({[HEAT_CHECKS_KEY]:JSON.stringify(mine)});
 const old=restoreFleetBackup(older,readFleetBackup(JSON.stringify({kind:"pace-south-fleet-board-backup",version:6,buses:[{id:"a",n:"17511",l:"road-1",s:"service"}]})).backup);
 assert.ok(!old.restored.includes("heat checks"));
 assert.equal(readHeatChecks(older).length,1);
});

test("a heat scan taken out, put back and taken out again leaves each bus the way a save would",async()=>{
 const {heatFindings,heatFiling,normalizeHeatRow,canFileHeatFinding}=await import("../src/lib/defects/heat-check-import.ts");
 const {heatChecksFromFindings}=await import("../src/lib/defects/heat-check-log.ts");
 const {applyHeatFiling}=await import("../src/lib/defects/heat-check-apply.ts");
 const {scanBatches,removeScanBatch,restoreScanBatch,scanBatchUndoSnapshot,findScanBatch,touchedScanRecord,scanRestoreLeftOff}=await import("../src/lib/defects/scan-batches.ts");
 const {saveDefectLogRecord,statusAfterDefectChange}=await import("../src/lib/defects/defect-log-sync.ts");
 const {quickFilterDefects}=await import("../src/lib/defects/quick-filters.ts");
 const FILED="2026-11-12T18:00:00.000Z",OUT="2026-11-12T18:05:00.000Z",BACK="2026-11-12T18:10:00.000Z",AGAIN="2026-11-12T18:15:00.000Z",EDITED="2026-11-12T18:20:00.000Z";
 const parked="2026-10-01T09:00:00.000Z";
 const hand={id:"hand-1",category:"Miscellaneous",issue:"Driver-reported defect",details:"mirror loose",operability:"service",state:"open",source:"defect-log",createdAt:parked,updatedAt:parked};
 const bus=(n,l,s,defects=[])=>({id:"b-"+n,n,l,s,defects,pendingRepair:"",parkedAt:parked,lastLocationChangeAt:parked,lastStatusChangeAt:parked});
 const board=[bus("17510","road-3","service"),bus("17511","road-4","defect",[hand]),bus("17512","bay-2","shop"),bus("17514","road-5","service"),bus("17515","road-6","decommissioned")];
 const row=busNumber=>normalizeHeatRow({busNumber,written:"N/R",struck:false,date:"11/10",initial:"MJ",note:"",confidence:.95,reviewNote:""},1);
 const findings=heatFindings(["17510","17511","17512","17514","17515"].map(row),board,FILED);
 const of=number=>findings.find(finding=>finding.busNumber===number);

 /* A DECOMMISSIONED BUS IS NOT FILED ON AND NOT LOGGED. `heatRoster` leaves it
    off the walk, so a line landing on one is a misread number: it arrived
    ticked, filed a defect on a bus that does not run, and logged a check on a
    bus the heat list never shows. */
 assert.equal(of("17515").action,"look");
 assert.equal(of("17515").selected,false);
 assert.match(of("17515").reviewNote,/decommissioned/);
 assert.equal(canFileHeatFinding(of("17515")),false);
 assert.deepEqual(heatChecksFromFindings(findings,FILED).map(check=>check.busNumber),["17510","17511","17512","17514"]);

 const filing=heatFiling(findings,FILED);
 assert.deepEqual(filing.map(item=>item.busNumber),["17510","17511","17512","17514"]);
 const filed=applyHeatFiling(board,[],filing,FILED);
 const on=(fleet,n)=>fleet.find(item=>item.n===n);
 const status=fleet=>Object.fromEntries(fleet.map(item=>[item.n,item.s]));
 assert.deepEqual(status(filed.fleet),{17510:"defect",17511:"defect",17512:"shop",17514:"defect",17515:"decommissioned"},"filing moves a running bus to DEFECT, as a hand-logged defect does");
 /* Somebody makes a call about 17514 after the scan: out, with nothing downing it. */
 const called=filed.fleet.map(item=>item.n==="17514"?{...item,s:"out"}:item);

 /* OUT. Each bus's status follows by the rule a save uses — and only where the
    status is still the one that rule gives. */
 const batch=scanBatches(called)[0];
 assert.equal(batch.kind,"heat");
 assert.equal(batch.removableIds.length,4);
 const out=removeScanBatch(called,batch.key,OUT);
 assert.equal(out.removed.length,4);
 assert.deepEqual(status(out.fleet),{17510:"service",17511:"defect",17512:"shop",17514:"out",17515:"decommissioned"},
  "the bus the scan made DEFECT is in service again; one with other work, one in the shop and one a person called OUT are as they were");
 assert.equal(on(out.fleet,"17510").defects.length,0);
 assert.equal(on(out.fleet,"17510").pendingRepair,"");
 assert.equal(on(out.fleet,"17510").lastStatusChangeAt,OUT,"a status that moved is stamped, the way a save stamps it");
 assert.equal(on(out.fleet,"17511").lastStatusChangeAt,parked,"and one that did not move keeps its clock");
 assert.deepEqual(on(out.fleet,"17511").defects.map(defect=>defect.id),["hand-1"],"the hand-logged record is untouched");
 /* A bus handed in with no status or location — only its defects — still loses
    the records, and nothing is invented for it. */
 const bare=removeScanBatch(called.map(({id,n,defects})=>({id,n,defects})),batch.key,OUT);
 assert.equal(bare.removed.length,4);
 assert.ok(!("s" in bare.fleet[0]));

 /* BACK. The records return stamped as new work for the cloud's sake, and they
    still read as UNTOUCHED — so the scan can be taken out again. It could not:
    every returned record looked edited, and REMOVE was dead under an alert
    saying they had been written on. */
 const snapshot=scanBatchUndoSnapshot(out.removed,"Removed 4 heat sheet scan records",OUT);
 const back=restoreScanBatch(out.fleet,snapshot,BACK);
 assert.equal(back.restored,4);
 assert.equal(back.duplicate,0);
 assert.equal(scanRestoreLeftOff(back),"");
 const returned=on(back.fleet,"17510").defects[0];
 assert.equal(returned.updatedAt,BACK);
 assert.equal(returned.scanRestoredAt,BACK);
 assert.equal(returned.createdAt,FILED,"when it was reported is not rewritten");
 assert.equal(touchedScanRecord(returned),false);
 assert.equal(on(back.fleet,"17510").s,"defect","and the bus carries an open defect again, so it reads DEFECT again");
 assert.equal(on(back.fleet,"17510").lastStatusChangeAt,BACK);
 assert.equal(on(back.fleet,"17514").s,"out","the person's call still stands");
 const again=scanBatches(back.fleet)[0];
 assert.deepEqual([again.ids.length,again.removableIds.length,again.keptIds.length],[4,4,0]);
 assert.equal(removeScanBatch(back.fleet,again.key,AGAIN).removed.length,4,"out a second time");

 /* A returned record somebody THEN edits is theirs, and stays. */
 const edited=saveDefectLogRecord(back.fleet,[],"b-17510",{...returned,details:"blower motor dead"},false,EDITED);
 assert.equal(edited.error,null);
 const kept=on(edited.fleet,"17510").defects[0];
 assert.equal(kept.scanRestoredAt,BACK,"the marker rides along");
 assert.equal(touchedScanRecord(kept),true,"and no longer matches the stamp, which is the edit");
 const third=removeScanBatch(edited.fleet,again.key,AGAIN);
 assert.equal(third.removed.length,3);
 assert.equal(third.kept,1);

 /* STAMPS ARE COMPARED AS INSTANTS. A pull hands the same moment back spelled
    `+00:00`, and matched as text an untouched record read as edited and UNDO
    LAST could not find the scan it had just filed. */
 const pulled={...on(filed.fleet,"17510").defects[0],createdAt:"2026-11-12T18:00:00+00:00",updatedAt:"2026-11-12T18:00:00.000Z"};
 assert.equal(touchedScanRecord(pulled),false);
 assert.equal(touchedScanRecord({...pulled,updatedAt:"2026-11-12T18:00:01+00:00"}),true);
 assert.equal(findScanBatch(scanBatches(filed.fleet),"2026-11-12T18:00:00+00:00")?.key,FILED);
 assert.equal(findScanBatch(scanBatches(filed.fleet),"2026-11-12T18:00:01.000Z"),undefined);
 assert.equal(findScanBatch(scanBatches(filed.fleet),"not a clock"),undefined);

 /* OUT, SCANNED AGAIN, THEN PUT BACK does not give a bus its repair twice. The
    removal's own alert said to do both. */
 const RESCAN="2026-11-12T18:07:00.000Z";
 const rescanned=applyHeatFiling(out.fleet,[],heatFiling(heatFindings(["17510","17511","17512"].map(row),out.fleet,RESCAN),RESCAN),RESCAN);
 assert.equal(rescanned.filed.length,3);
 const late=restoreScanBatch(rescanned.fleet,snapshot,BACK);
 assert.equal(late.duplicate,3);
 assert.equal(late.restored,1,"17514 was not on the second scan, so its record goes back");
 assert.match(scanRestoreLeftOff(late),/3 were left off because the bus already has that repair open/);
 for(const n of ["17510","17511","17512","17514"])assert.equal(quickFilterDefects(on(late.fleet,n),"no-cabin-heat",BACK).length,1,n+" has its heat repair once");
 assert.match(scanRestoreLeftOff({duplicate:1}),/1 was left off/);
 /* Only an OPEN copy stands in the way. A heat repair finished on the bus is
    history, and the scan's record goes back beside it. */
 const finished={...out.removed.find(record=>record.busNumber==="17514").defect,id:"done-1",state:"completed",completedAt:OUT,updatedAt:OUT};
 const withHistory=out.fleet.map(item=>item.n==="17514"?{...item,defects:[finished]}:item);
 const beside=restoreScanBatch(withHistory,snapshot,BACK);
 assert.equal(beside.duplicate,0);
 assert.deepEqual(on(beside.fleet,"17514").defects.map(defect=>defect.state),["completed","open"]);

 /* The rule on its own: it moves a status only while that status is the one a
    save would give for what the bus carries. */
 const heat=on(filed.fleet,"17510").defects;
 assert.equal(statusAfterDefectChange(on(filed.fleet,"17510"),heat,[],OUT).s,"service");
 assert.equal(statusAfterDefectChange({...on(filed.fleet,"17510"),s:"shop"},heat,[],OUT).s,"shop","in progress in the shop is somebody's call");
 assert.equal(statusAfterDefectChange({...on(filed.fleet,"17510"),s:"decommissioned"},heat,[],OUT).s,"decommissioned");
 const downing=[{...hand,id:"hand-2",operability:"down"}];
 assert.equal(statusAfterDefectChange({...on(filed.fleet,"17510"),s:"out"},[...heat,...downing],downing,OUT).s,"out","a downing defect still on the bus keeps it OUT");
});

test("the heat screens decide nothing: the rules are asked, and the board is written one way",async()=>{
 const [scanner,board,lists,logPage,mapPage,route,panel,logCss,boardCss,globals]=await Promise.all([
  "../app/defect-log/_components/heat-scanner.tsx","../app/lists/_components/campaign-board.tsx","../app/lists/page.tsx","../app/defect-log/page.tsx","../app/page.tsx",
  "../app/api/heat-sheet-scan/route.ts","../app/defect-log/_components/scan-batches-panel.tsx","../app/defect-log/defect-log.css","../app/lists/_components/campaign-board.css","../app/globals.css",
 ].map(file=>readFile(new URL(file,import.meta.url),"utf8")));
 const code=source=>source.replace(/\/\*[\s\S]*?\*\//g,"");
 /* `a.indexOf(x)<a.indexOf(y)` passes when x is MISSING, because -1 is less
    than anything. Every order claim below goes through this instead. */
 const inOrder=(source,first,second,message)=>{
  const a=source.indexOf(first),b=source.indexOf(second);
  assert.ok(a>=0,"not found: "+first);assert.ok(b>=0,"not found: "+second);
  assert.ok(a<b,message);
 };

 /* THE ROUTE COPIES. It returns the result cell as written and never a
    meaning: no ok / fault enum, which is how the sweep route answers. */
 assert.match(route,/written:\{type:"string"\}/);
 assert.match(route,/struck:\{type:"boolean"\}/);
 assert.doesNotMatch(code(route),/enum:\["ok"/,"the heat route must not decide what a mark means");
 assert.match(route,/COPY the result cell exactly as it is written/);
 assert.match(route,/document:\{type:"string",enum:\["heat","other"\]\}/,"the page says what it is before what is on it");
 assert.match(route,/Return ONE ROW FOR EVERY PRINTED BUS NUMBER/,"blank lines are the not-checked buses, so they must come back");
 assert.match(route,/Use below 0\.7 for any row/,"the route and HEAT_LOW_CONFIDENCE name the same number");

 /* THE SCANNER: every rule is a function it calls. A cold read counted three
    it had spelled out under a heading saying it decided nothing — what a page
    that is not a heat sheet contributes, what an unsure page's rows arrive as,
    and what is offered to the log. */
 for(const name of ["heatScanReview","heatLoggable","heatReviewGroups","heatSummary","tickHeatFinding","heatLowConfidence","heatChecksFromFindings"])assert.match(scanner,new RegExp("\\b"+name+"\\b"),name);
 const scannerCode=code(scanner);
 assert.doesNotMatch(scannerCode,/localStorage/,"the scanner asks; the page files and logs");
 assert.doesNotMatch(scannerCode,/\.mark===|\.struck&&|\.action===|confidence<|heatPageVerdict|normalizeHeatRow|canFileHeatFinding/,"no rule is spelled out in the component");
 assert.match(scanner,/fetch\("\/api\/heat-sheet-scan"/);
 assert.match(scanner,/const review=heatScanReview\(pages,fleet\);\s*setFindings\(review.findings\);\s*setHeld\(review.held\);/);
 assert.match(scanner,/onFile\(findings,loggable\)/);
 assert.match(scanner,/const loggable=useMemo\(\(\)=>heatLoggable\(findings,held\)/,"what may be logged is asked again after the reviewer's ticks");
 assert.match(scanner,/if\(!photos.length\|\|busy\)return;/,"READ SHEET cannot be pressed twice");
 /* The way back is promised only where there is one. */
 assert.match(scanner,/const back=files\?"[^"]*SCAN BATCHES takes the defects and the checks back out together\.":"[^"]*corrected by the next check on that bus\.";/);
 /* The OK buses are drawn, because each one logged comes off the walk. */
 assert.match(scanner,/\{warm.length>0&&<section className="heat-group quiet" aria-label="Buses with heat">/);
 /* The group headings are divs: globals.css paints a bare <header> navy. */
 assert.equal((scannerCode.match(/<header/g)||[]).length,1,"only the modal's own classed header");

 /* THE DEFECT LOG files a scan: board first, checks only once it has taken
    them, one clock for the press, and the log is ADDED TO, never replaced. */
 const fileHeat=logPage.slice(logPage.indexOf(" const fileHeat="),logPage.indexOf("/* Takes a whole scan sweep back out."));
 assert.ok(fileHeat.length>200);
 assert.match(fileHeat,/const now=new Date\(\).toISOString\(\),filing=heatFiling\(findings,now\);/);
 assert.match(fileHeat,/applyHeatFiling\(fleet,downEntries,filing,now\)/);
 inOrder(fileHeat,"persist(result.fleet,result.downEntries)","addHeatChecks(","the defects go on before the checks are logged");
 assert.match(fileHeat,/if\(!written.ok\)return;/,"a refused board write logs no checks");
 assert.match(fileHeat,/addHeatChecks\(localStorage,heatChecksFromFindings\(loggable,now\)\)/);
 assert.match(fileHeat,/setUndoSnapshot\(\{fleet,downEntries,label:[^}]*heatScan:now\}\)/,"the undo keeps the board as it WAS, and the stamp of the scan it undoes");
 assert.doesNotMatch(code(logPage),/writeHeatChecks|mergeHeatChecks|withoutScanChecks/,"the page reads, merges and writes the log through one function per job");
 assert.match(logPage,/\{heatOpen&&<HeatScanner fleet=\{fleet\} onClose=\{\(\)=>setHeatOpen\(false\)\} onFile=\{fileHeat\}\/>\}/);
 assert.match(logPage,/<button className="heat-scan-button"[^>]*onClick=\{\(\)=>setHeatOpen\(true\)\}[^>]*>📷 SCAN HEAT SHEET</);
 assert.match(logPage,/searchParams.get\(HEAT_SCAN_PARAM\)!==HEAT_SCAN_VALUE\)return;\s*setHeatOpen\(true\);\s*url.searchParams.delete\(HEAT_SCAN_PARAM\);\s*window.history.replaceState\(/,"the campaign's link opens the scanner once, and the address is cleaned so a reload does not open it again");
 /* TAKING A HEAT SCAN BACK OUT TAKES ITS CHECKS — from every door. The Defect
    Log's panel, UNDO LAST, and the AI Operator on the map all end in the one
    function. The operator did not, and left every check behind. */
 const removeBatch=logPage.slice(logPage.indexOf(" const removeBatch="),logPage.indexOf(" const restoreBatch="));
 assert.match(removeBatch,/const cut=dropScanChecks\(localStorage,batch\);/);
 inOrder(removeBatch,"persist(result.fleet,downEntries,{allowBulkDefectLoss:true})","dropScanChecks(","the checks go only once the board has let the defects go");
 const undo=logPage.slice(logPage.indexOf(" const undoLastChange="),logPage.indexOf(" const undoLastChange=")+700);
 assert.match(undo,/if\(undoSnapshot.heatScan\)\{\s*const batch=findScanBatch\(batches,undoSnapshot.heatScan\);\s*if\(batch\)\{removeBatch\(batch\);return\}/,"UNDO LAST on a heat filing is the scan removal, tombstones and checks and all — and the scan is found by instant, not by how its stamp is spelled");
 const executor=mapPage.slice(mapPage.indexOf('if(plan.kind==="removeScanBatch")'),mapPage.indexOf('if(plan.kind==="restoreScanBatch")'));
 assert.match(executor,/const cut=dropScanChecks\(localStorage,batch\);/,"the AI Operator removes a heat scan's checks with it");
 inOrder(executor,"writeFleetStorageResult(","dropScanChecks(","the operator takes the checks only once the board has let the defects go");
 assert.match(executor,/scanBatchWords\(batch\)/);
 assert.doesNotMatch(executor,/scan sweep record|from that sweep|"[^"]*That scan sweep/,"the executor names the scan it removed, not always a sweep");
 assert.match(panel,/scanBatchWords\(batch\)/);
 assert.doesNotMatch(code(panel),/SCAN SWEEP FILED|this sweep/,"the panel lists two kinds of scan now and must not call both a sweep");

 /* FLEET CAMPAIGNS: the board component stores nothing, and the page hands a
    tap whole to the one function that owns it. */
 const boardCode=code(board);
 assert.doesNotMatch(boardCode,/localStorage|setItem/,"the campaigns board hands taps up; it stores nothing");
 for(const name of ["heatRoster","heatRosterCounts","heatRosterLane","heatRowDetail","heatShareText","heatScanHref","HEAT_STANDING_LABEL","HEAT_TAP_GUARD_MS"])assert.match(board,new RegExp("\\b"+name+"\\b"),name);
 assert.doesNotMatch(boardCode,/\.filter\(row=>|status===|\.length\+/,"no group, count or filter is worked out in the component");
 assert.doesNotMatch(boardCode,/quickFilterBusIds/,"the A/C card claims no number while the A/C filter still counts heating repairs");
 assert.match(board,/<a className="campaign-scan" href=\{heatScanHref\(\)\}/);
 /* A double-tap must not land on the row that slid up: both buttons go dead. */
 assert.match(board,/className="tap-ok" disabled=\{guarded\} onClick=\{\(\)=>tap\(row,"ok"\)\}/);
 assert.match(board,/className="tap-cold" disabled=\{guarded\} onClick=\{\(\)=>tap\(row,"no-heat"\)\}/);
 assert.match(board,/const tap=\(row:HeatRosterRow,result:HeatResult\)=>\{\s*if\(guarded\)return;\s*setGuarded\(true\);/);
 assert.match(board,/\{lastTap&&<div className="heat-undo" role="status">/);
 assert.match(board,/<button type="button" onClick=\{onUndo\}>UNDO THIS TAP</);
 assert.doesNotMatch(boardCode,/role="tablist"|role="tab"/,"buttons that filter a list are not tabs without panels");
 const listsCode=code(lists);
 assert.doesNotMatch(listsCode,/writeFleetStorage|serializeFleetPayload|setItem\(FLEET_STORAGE_KEY/,"Fleet Campaigns never writes the board itself");
 assert.doesNotMatch(listsCode,/fileHeatTap|recordHeatCheck|writeHeatChecks/,"nor does it sequence a tap: recordHeatTap does");
 const checkHeat=lists.slice(lists.indexOf(" const checkHeat="),lists.indexOf(" const undoHeatTap="));
 assert.match(checkHeat,/const tap=recordHeatTap\(localStorage,row.busNumber,result,initials\);/);
 assert.match(checkHeat,/if\(!tap.ok\)\{alert\(HEAT_TAP_PROBLEM\[tap.why\][^;]*;return\}/,"a tap that failed is said to have failed");
 inOrder(checkHeat,"confirm(","recordHeatTap(","the clock is taken after the question, not before");
 /* The one failure that can leave a defect behind re-reads the board BEFORE it
    speaks, and says what the tap reports rather than "nothing was changed". */
 const halfDone=checkHeat.slice(checkHeat.indexOf('if(!tap.ok&&tap.why==="check-not-saved"){'));
 assert.ok(halfDone.length>0,"the half-done tap has its own branch");
 inOrder(halfDone,"refreshFromStorage();","alert(","the board is re-read before the alert");
 assert.match(halfDone,/tap\.filed\?/);
 assert.match(halfDone,/heatLogProblemWords\(tap\.log\)/);
 assert.doesNotMatch(lists,/"check-not-saved":/,"and it is not in the table of failures that changed nothing");
 assert.match(lists,/const undone=undoHeatCheck\(localStorage,lastTap.checkId\);/);
 /* It sits ABOVE what was on the page, which is where Curtis put it. */
 inOrder(lists,"<CampaignBoard ","<WorkTimePanel ","the campaigns board is above the timesheet");
 inOrder(lists,'<TrackerNav active="/lists"/>',"<CampaignBoard ","and below the navigation");
 /* Bare <header> and <aside> are styled by globals.css for the Facility Map,
    and reach every page. Read out of globals.css rather than asserted from
    memory: an earlier version of this said <section> too, which is only ever
    styled there as `.vertical section`. */
 for(const element of ["header","aside"])assert.match(globals,new RegExp("(?:^|[}\\s,])"+element+"\\{"),"globals.css styles a bare <"+element+">");
 assert.equal((boardCode.match(/<(header|aside)\b/g)||[]).length,0,"so the campaigns board uses neither");

 /* The rules a browser measured, held where a later edit would lose them. */
 assert.match(boardCss,/\.heat-initials input\{[^}]*font-size:16px/,"below 16px iOS zooms the page on focus");
 for(const control of [".campaign-actions a,.campaign-actions button",".heat-initials input",".heat-share button",".heat-lanes button",".heat-taps button",".heat-undo button",".heat-detail a"])
  assert.match(boardCss,new RegExp(control.replace(/[.,]/g,"\\$&").replace(/ /g," ")+"\\{[^}]*min-height:44px"),control+" is a 44px target at every width");
 assert.match(boardCss,/@media\(max-width:620px\)\{[\s\S]*\.heat-taps button\{min-height:52px/);
 assert.match(boardCss,/\.heat-taps button:disabled\{opacity/);
 assert.match(logCss,/\.heat-modal \.log-editor-actions \.save-repair\{[^}]*background:#b3530a/,"FILE must not be CANCEL's twin");
 assert.match(logCss,/@media\(max-width:760px\)\{[^}]*\.heat-scan-button[^}]*\{grid-column:1\/-1\}/,"alone in half a row its label broke over two lines");
});

test("the Defect Log names WHICH defect has the bus on the down sheet",async()=>{
 const { defectLogRecords, downSheetEntryLabel, unexplainedDownSheetEntries } =
  await import("../src/lib/defects/defect-log-sync.ts");

 const D=(id,category,issue,details)=>({id,source:"defect-log",category,issue,details,
  operability:"service",state:"open",createdAt:"2026-09-01T21:01:00.000Z",updatedAt:"2026-09-01T21:57:00.000Z"});
 const bus={id:"b1",n:"17526",l:"waiting-1",s:"out",down:true,pendingRepair:"",defects:[
  D("d1","Bus Accessories","Doors - Rear door will not close","Rear Alarm stays on"),
  D("d2","Operator/Driver Controls","Operating Controls - Horn","The connection from top down"),
  D("d3","Tech Services","IBS Screen - INOP (general)","Can't log in")]};
 const entry=(over={})=>({id:"repair-1788400000000-abcde",busId:"b1",busNumber:"17526",
  category:"Operator/Driver Controls",repair:"Operating Controls - Horn",customReason:"The connection from top down",
  repairItems:[{id:"item-x",category:"Operator/Driver Controls",repair:"Operating Controls - Horn",
   details:"The connection from top down"}],
  assignmentType:"Mechanic",assignedTo:"AR",section:"Pending",shift:"1st",workflow:"In Progress",
  operationalStatus:"out",priority:"Routine",createdAt:"2026-09-01T21:57:00.000Z",
  updatedAt:"2026-09-01T21:57:00.000Z",updatedBy:"AR",completedAt:"",history:[],...over});

 // THE CASE. Three defects, a DS badge on the card, and until now nothing said
 // which of the three was the reason. The entry states NO defectId — it was
 // typed in through + ADD DOWN BUS — so reading the stated id would have found
 // nothing and left the question unanswered.
 const horn=entry();
 assert.equal(horn.defectId,undefined,"a hand-typed entry states no defect id");
 const flagged=defectLogRecords([bus],[horn]);
 const marked=flagged.filter(record=>record.onDownSheet);
 assert.equal(marked.length,1,"exactly one defect is named");
 assert.equal(marked[0].defect.id,"d2","and it is the horn, not the door or the screen");
 assert.equal(marked[0].downSheetEntry.id,horn.id,"the record carries the entry, so the banner can say what the sheet says");
 for(const other of flagged.filter(record=>record.defect.id!=="d2")){
  assert.equal(other.onDownSheet,false);
  assert.equal(other.downSheetEntry,undefined);
 }

 // What the banner reads.
 assert.equal(downSheetEntryLabel(horn),"In Progress · 1st shift · Pending · AR");
 assert.equal(downSheetEntryLabel(entry({assignmentType:"Vendor",assignedTo:"Cummins"})),
  "In Progress · 1st shift · Pending · Vendor: Cummins");
 assert.equal(downSheetEntryLabel(entry({assignedTo:"",workflow:"Scheduled"})),"Scheduled · 1st shift · Pending");

 // An entry naming the defect outright still works — that is the Defect Log's
 // own DOWN SHEET tick, and it must not have been broken to fix the other door.
 const ticked=defectLogRecords([bus],[entry({repairItems:undefined,defectId:"d3",
  category:"Tech Services",repair:"IBS Screen - INOP (general)",customReason:"Can't log in"})]);
 assert.deepEqual(ticked.filter(record=>record.onDownSheet).map(record=>record.defect.id),["d3"]);

 // A finished entry is not still holding the bus, so nothing is marked.
 assert.equal(defectLogRecords([bus],[entry({workflow:"Completed"})]).some(record=>record.onDownSheet),false);

 // NONE OF THESE IS THE ONE. A bus can be on the sheet for work that was never
 // typed into this log, and then the DS badge is true while no defect below
 // carries the banner — which reads like the app declining to answer.
 const elsewhere=entry({category:"Brakes",repair:"Air brake fault",customReason:"Scanned off the paper sheet",
  repairItems:[{id:"item-y",category:"Brakes",repair:"Air brake fault",details:"Scanned off the paper sheet"}]});
 const stranded=defectLogRecords([bus],[elsewhere]);
 assert.equal(stranded.some(record=>record.onDownSheet),false,"no logged defect accounts for it");
 assert.deepEqual(unexplainedDownSheetEntries(stranded,"b1",[elsewhere]).map(item=>item.id),[elsewhere.id],
  "so the sheet entry is named instead");
 // And when a defect DOES account for it, there is nothing left to explain.
 assert.deepEqual(unexplainedDownSheetEntries(flagged,"b1",[horn]),[]);
 // A completed entry is not an unexplained one.
 assert.deepEqual(unexplainedDownSheetEntries(stranded,"b1",[entry({workflow:"Completed"})]),[]);

 // The banner is actually rendered, in both places a defect is read.
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/record\.downSheetEntry&&<p className="down-sheet-banner"><b>ON THE DOWN SHEET<\/b>/,
  "the expanded row carries the banner");
 assert.match(page,/work-state-badge on-down-sheet">THIS DEFECT HAS THE BUS ON THE DOWN SHEET/,
  "the focus view says it in full");
 assert.match(page,/unexplainedDownSheetEntries\(group\.records,group\.bus\.id,downEntries\)/,
  "and the case where none of them is the one is rendered too");
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 // It takes the shop's own DS badge colour, so recolouring the badge recolours
 // the banner rather than leaving two different purples side by side.
 assert.match(css,/\.down-sheet-banner\{[^}]*var\(--downsheet-badge/);
 // And it claims a whole line instead of becoming a fourth column.
 assert.match(css,/\.grouped-defect-row\.on-down-sheet\{flex-wrap:wrap\}/);
});

test("the sweep scanner is its own door on the Defect Log and never touches the Down Sheet", async () => {
 const [logPage,scanner,route,downScanner]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/sweep-scanner.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/api/sweep-scan/route.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx",import.meta.url),"utf8"),
 ]);
 /* A separate button next to LOG DEFECT, not the Down Sheet's scan button. */
 assert.match(logPage,/className="sweep-scan-button"[^>]*onClick=\{\(\)=>setSweepOpen\(true\)\}[^>]*>📷 SCAN SWEEP</);
 assert.match(logPage,/<SweepScanner fleet=\{fleet\} onClose=\{\(\)=>setSweepOpen\(false\)\} onFile=\{fileSweep\}\/>/);
 /* Filing goes through the same single-record save as LOG DEFECT, and UNDO LAST covers it. */
 assert.match(logPage,/saveDefectLogRecord\(nextFleet,nextDown,finding\.busId,sweepDefect\(finding,now\),false,now\)/);
 assert.match(logPage,/setUndoSnapshot\(\{fleet,downEntries,label:"Filed "\+filed\+" sweep finding"/);
 /* Nothing is claimed on a refused write. */
 assert.match(logPage,/const written=persist\(nextFleet,nextDown\);\s*if\(!written\.ok\)return;/);
 /* The scanner posts to its own route and shares the photo prep. */
 assert.match(scanner,/fetch\("\/api\/sweep-scan"/);
 assert.match(scanner,/import \{scanReadyPhoto\} from "(?:[^"]*\/)scan-photo"/);
 assert.match(downScanner,/import \{scanReadyPhoto\} from "(?:[^"]*\/)scan-photo"/,"the Down Sheet scanner shares the same photo prep");
 assert.doesNotMatch(scanner,/down-sheet|DownSheet|writeDownSheetStorage/,"the sweep scanner must not know the Down Sheet exists");
 /* The route's description of the sheet carries the rule that matters most. */
 assert.match(route,/Blank means nobody checked it\. It NEVER means working\./);
 assert.match(route,/a dash is a check, not a fault/);
 assert.match(route,/Never invent a bus, a mark, or a fault/);
 assert.match(route,/enum:\["ok","fault","blank","unclear"\]/);
});

test("every Defect Log card puts the same information at the same tab stop, at a readable size", async () => {
 const [logPage,logCss,fixedCss,downCss]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
 ]);

 /* Measured before this change, at 390 wide: OPEN began at x131 on a card with
    DS and ×3, at x105 with ×4 alone, at x73 with no badges. After: x157 on all
    four. The mechanism is a grid with named slots — an empty slot stays empty
    instead of letting the next thing slide left into it. */
 assert.match(logCss,/\.log-group-header \.log-meta\{display:grid;grid-template-columns:76px auto minmax\(0,1fr\);grid-template-areas:"badges state status" "time time view"/);
 /* The two purple badges have fixed sub-slots, so ×N sits at the same x with
    or without DS beside it. */
 assert.match(logCss,/\.log-badge-slot\{display:grid;grid-template-columns:34px 38px/);
 assert.match(logCss,/\.log-badge-slot \.inline-ds-badge\{grid-column:1\}/);
 assert.match(logCss,/\.log-badge-slot \.defect-count-badge\{grid-column:2\}/);
 assert.match(logPage,/<span className="log-meta"><span className="log-badge-slot">\{busOnDownSheet&&<b className="inline-ds-badge">DS<\/b>\}\{group\.records\.length>1&&<b className="defect-count-badge">×\{group\.records\.length\}<\/b>\}<\/span>/);
 /* LATEST and VIEW hold the second row, one at each end. */
 assert.match(logCss,/\.log-group-header \.log-meta>time\{grid-area:time;justify-self:start\}/);
 assert.match(logCss,/\.log-group-header \.log-meta>\.group-toggle\{grid-area:view;justify-self:end/);
 /* The status text is wrapped so WAS DEF can ride beside it without taking a
    slot of its own. */
 assert.match(logPage,/<span className="log-status-cell"><small>\{STATUS_LABELS\[group\.bus\.s\]\|\|group\.bus\.s\}<\/small>\{groupHasDeferredHistory&&/);

 /* The title no longer carries the emoji the round icon already shows, so a
    single-defect title starts where MULTIPLE DEFECTS starts. */
 assert.match(logPage,/<b>\{group\.records\.length===1\?primary\.defect\.category:"MULTIPLE DEFECTS"\}<\/b>/);
 assert.doesNotMatch(logPage,/<b>\{group\.records\.length===1\?repairCategoryLabel\(primary\.defect\.category\)/);

 /* DS and ×N are a matched pair: same box, same type, same token. Before, DS
    was 22×17 at 7px beside a ×N of 28×21 at 10px. */
 assert.match(logCss,/\.log-meta \.inline-ds-badge,\.log-meta \.defect-count-badge\{display:inline-flex;min-width:34px;min-height:24px;height:auto;[^}]*background:var\(--downsheet-badge,#6b35bb\);color:var\(--downsheet-badge-text,#fff\);[^}]*font-size:11px/);

 /* Reading text comes up one step, and the setting that scales it stays
    monotonic above the new base. */
 assert.match(logCss,/\.log-meta>small,\.log-meta \.log-status-cell>small\{font-size:10px/);
 assert.match(logCss,/\.log-meta time\{font-size:9px/);
 assert.match(logCss,/\.group-toggle\{color:var\(--log-accent\)!important;font-size:9px!important/);
 assert.match(logCss,/\.log-repair>small\{font-size:9px\}/);
 assert.match(logCss,/data-font-size="large"\] \.log-repair>small\{font-size:10px\}/);
 assert.match(logCss,/data-font-size="extra"\] \.log-repair>small\{font-size:12px\}/);
 assert.match(logCss,/data-font-size="large"\] \.log-meta em\{font-size:11px\}/);
 assert.match(logCss,/data-font-size="extra"\] \.log-meta em\{font-size:12px\}/);
 /* In an expanded row the time no longer trails the state pill. */
 assert.match(logCss,/@media\(max-width:760px\)\{\.grouped-defect-main \.log-meta time\{flex-basis:100%\}\}/);

 /* The same step on the other two feeds, so all three read at one size. */
 assert.match(fixedCss,/\.fixed-card-head>span small\{font-size:8px\}/);
 assert.match(fixedCss,/\.fixed-card-body section>b\{font-size:9px\}/);
 assert.match(downCss,/\.fleet-number small,\.assignment small,\.estimate-cell small,\.updated small\{font-size:8px\}/);

 /* Nothing on a reading surface is set below 8px any more. The rule lists in
    each file are checked for the selectors this release raised. */
 for(const [css,sel] of [[logCss,".log-bus small"],[logCss,".log-bus em"],[fixedCss,".fixed-card-head>span small"],[downCss,".updated small"]]){
  const last=[...css.matchAll(new RegExp(sel.replace(/[.>*+?^${}()|[\]\\]/g,"\\$&")+"\\{[^}]*font-size:([0-9.]+)px","g"))].pop();
  assert.ok(last&&parseFloat(last[1])>=8,sel+" must end up at 8px or larger (last rule wins)");
 }
});

test("the collapsed bus card carries no category glyph; each expanded row keeps its own", async () => {
 const [logPage,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 /* The round icon showed the category of whichever defect happened to be first,
    which on a MULTIPLE DEFECTS card was one category standing in for three. */
 assert.doesNotMatch(logPage,/className="log-icon"/,"the collapsed card must not render the category icon");
 assert.doesNotMatch(logPage,/repairCategoryEmoji\(primary\.defect\.category\)/);
 /* The title is the plain category name, or MULTIPLE DEFECTS. */
 assert.match(logPage,/<b>\{group\.records\.length===1\?primary\.defect\.category:"MULTIPLE DEFECTS"\}<\/b>/);
 /* Each expanded row still leads with its own emoji, where it is accurate. */
 assert.match(logPage,/<span className="log-repair"><b>\{repairCategoryLabel\(record\.defect\.category\)\}<\/b>/);
 /* And the header grid lost the icon column at every width, with the meta row
    starting under the bus number rather than under the repair text. */
 assert.match(css,/\.log-card-group>\.log-group-header\{grid-template-columns:82px minmax\(0,1fr\) 150px\}/);
 assert.match(css,/@media\(max-width:760px\)\{\.log-card-group>\.log-group-header\{grid-template-columns:72px minmax\(0,1fr\)\}\.log-card-group>\.log-group-header \.log-meta\{grid-column:1\/-1\}\}/);
 assert.match(css,/@media\(max-width:390px\)\{\.log-card-group>\.log-group-header\{grid-template-columns:64px minmax\(0,1fr\)\}\}/);
});

test("a repair fixed without a defect can be logged straight to Fixed Repairs", async () => {
 const [fixedPage,css]=await Promise.all([
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);

 /* The page only offered ADD FIX DETAILS, which edits a record that already
    exists, so a mechanic who fixed something never logged had nowhere to put
    it. The button opens the same editor every other record uses. */
 assert.match(fixedPage,/className="log-repair-button"[^>]*onClick=\{logRepair\}/);
 assert.match(fixedPage,/\+ LOG A REPAIR/);
 assert.match(css,/\.log-repair-button\{/);
 /* Disabled with no fleet, because there would be no bus to attach it to. */
 assert.match(fixedPage,/disabled=\{!fleet\.length\}/);

 /* A blank record starts completed — this page is the fixed history. */
 assert.match(fixedPage,/state:"completed",source:"fixed-log"/,"a repair logged here did not come from the Defect Log");
 assert.match(fixedPage,/"fixed-log":\{className:"from-tracker",label:"LOGGED AS A COMPLETED REPAIR"\}/);

 /* THE SECOND BUG THIS AVOIDS: a refused fleet write. changeFleet set the undo
    snapshot and closed the editor regardless of whether anything was written,
    so a phone at its storage limit lost the only copy of a repair silently and
    then offered to undo it. Driven in a browser: storage unchanged, modal
    closed, nothing said. The editor now stays open with the banner showing. */
 assert.match(fixedPage,/if\(!persistFleet\(next\)\)return false/);
 assert.match(fixedPage,/if\(changeFleet\(next,\(isNewRecord\?"Logged Bus ":"Edited Bus "\)\+record\.bus\.n\+" fixed repair"\)\)setNewRepair\(null\)/);
 assert.match(fixedPage,/<SaveAlert reason=\{saveProblem\}/,"this page had no save banner at all");

 /* THE THIRD: a key on the bus id remounted the editor on every bus change and
    reset the whole form. Driven: category, fix text and initials all cleared
    when the bus was picked after typing. */
 assert.doesNotMatch(fixedPage,/<CompletionEditor key=\{newRepair\.bus\.id\}/,"the editor must not remount when the bus changes");
 /* The only thing a blank record lacks is the bus, so the editor asks for it
    and nothing else about the form changes. */
 assert.match(fixedPage,/\{isNew&&<section className="fixed-new-bus">/);
 assert.match(fixedPage,/isNew\?"LOG A REPAIR":"FIXED REPAIR"/);

 /* THE BUG THIS AVOIDS: saveCompletion mapped over the bus's existing defects.
    A record that is not on the bus yet matches nothing, so mapping alone would
    have written no record and reported success. It appends instead. */
 assert.match(fixedPage,/const current=normalizeDefects\(bus\.defects,bus\.pendingRepair\|\|"",bus\.id\),exists=current\.some\(defect=>defect\.id===record\.defect\.id\)/);
 assert.match(fixedPage,/defects:exists\?current\.map\(defect=>defect\.id!==record\.defect\.id\?defect:saved\(defect\)\):\[\.\.\.current,saved\(record\.defect\)\]/);
 /* And it lands on UNDO like every other change here. */
 assert.match(fixedPage,/changeFleet\(next,\(isNewRecord\?"Logged Bus ":"Edited Bus "\)\+record\.bus\.n\+" fixed repair"\)/);
});

test("a record with a malformed details field renders instead of taking the page down", () => {
 /* Every consumer calls .trim() on details. normalizeDefects passed a
    non-string straight through, so one bad record threw inside defectLabel and
    the whole page rendered a runtime error instead of the board. The board is
    imported from JSON backups and synced from other devices, and importBoard
    validates only id, n and l — so a malformed record really can reach here.
    Found when a test fixture passed an object where the text belonged. */
 const bad=normalizeDefects([
  {id:"obj",category:"Brakes",issue:"ABS warning",details:{diagLight:"red"},operability:"service",state:"open"},
  {id:"num",category:"Brakes",issue:"ABS warning",details:42,operability:"service",state:"open"},
  {id:"nul",category:"Brakes",issue:"ABS warning",details:null,operability:"service",state:"open"},
  {id:"undef",category:"Brakes",issue:"ABS warning",operability:"service",state:"open"},
 ],"","bus-bad");
 for(const defect of bad)assert.equal(typeof defect.details,"string",defect.id+" must normalize to a string");
 assert.equal(bad[2].details,"");
 assert.equal(bad[3].details,"");
 /* And the label functions that used to throw now return a string for each. */
 for(const defect of bad){
  assert.equal(typeof defectLabel(defect),"string");
  assert.equal(typeof defectSupportingDetails(defect),"string");
 }
 assert.doesNotThrow(()=>defectSummary(bad));
});

test("the pulsing DEFERRED badge opens the Deferred filter instead of going nowhere", async () => {
  const watch = await readFile(new URL("../src/components/shared/deferred-watch.ts" + "x", import.meta.url), "utf8");
  const log = await readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8");

  /* The badge renders on all six pages, the Defect Log included. It used to be
     a bare link to /defect-log, so pressing it while standing on the Defect Log
     pointed at the page already on screen and did nothing at all — and from
     anywhere else it landed with no filter, leaving the overdue buses wherever
     they sat in the list. */
  assert.doesNotMatch(watch, /href="\/defect-log"/, "a bare link to the page the badge also renders on does nothing when pressed there");
  assert.match(watch, /quickFilterHref\("deferred"\)/);
  assert.match(watch, /window\.location\.pathname!=="\/defect-log"/, "the same-page case has to be handled separately from navigation");
  assert.match(watch, new RegExp("dispatchEvent\\(new CustomEvent\\(QUICK_FILTER_EVENT"));

  assert.equal(quickFilterHref("deferred"), "/defect-log?" + QUICK_FILTER_PARAM + "=deferred");
  assert.equal(QUICK_FILTER_EVENT, "pace-open-quick-filter");

  // Only real filter keys are honoured — a query string is user-supplied text.
  assert.equal(quickFilterFromValue("deferred"), "deferred");
  assert.equal(quickFilterFromValue("road-call"), "road-call");
  for (const junk of ["", null, undefined, "nope", "__proto__", 7, {}]) {
    assert.equal(quickFilterFromValue(junk), null, JSON.stringify(junk) + " is not a filter key");
  }
  // Every advertised key round-trips, so no filter can be linked to but not opened.
  for (const item of QUICK_FILTERS) assert.equal(quickFilterFromValue(item.key), item.key);

  // The Defect Log has to accept both routes, and not leave the query string
  // behind — closing the drawer and reloading must not silently reopen it.
  assert.match(log, new RegExp("addEventListener\\(QUICK_FILTER_EVENT"));
  assert.match(log, /searchParams\.delete\(QUICK_FILTER_PARAM\)/);
  assert.match(log, /quickFilterFromValue\(new URLSearchParams/);
  // A filter that opens below the fold has not shown anybody anything.
  assert.match(log, /\.quick-filter-drawer"\)\?\.scrollIntoView/);
});

test("the DEFERRED badge counts the same buses its filter lists", () => {
  const now = new Date("2026-09-06T12:00:00Z");
  const ago = m => new Date(now.getTime() - m * 60000).toISOString();
  const defect = (id, state, at) => ({id, category: "Brakes", issue: "Air leak", details: "", state, ...(at ? {deferredAt: at} : {})});
  const fleet = [
    // One bus held on TWO deferred repairs, both overdue. This is the case the
    // old count got wrong: the rows behind the badge are one per DEFECT, so a
    // single bus counted as two and the badge disagreed with its own list.
    {id: "a", n: "17510", defects: [defect("d1", "deferred", ago(400)), defect("d1b", "deferred", ago(380))]},
    {id: "b", n: "17511", defects: [defect("d2", "deferred", ago(200))]},
    // Held, but short of the ninety-minute line: listed, not overdue.
    {id: "c", n: "17512", defects: [defect("d3", "deferred", ago(20))]},
    // Deferred but on the Down Sheet — the sheet is the record now, so neither
    // number counts it and the filter does not list it.
    {id: "d", n: "17513", defects: [defect("d4", "deferred", ago(500))]},
    {id: "e", n: "17514", defects: [defect("d5", "open")]},
  ];
  const downEntries = [{id: "r1", busId: "d", busNumber: "17513", workflow: "Scheduled"}];

  const counts = deferredBadgeCounts(fleet, downEntries, now);
  // Three buses listed — not the four defect-rows the old count would have found.
  assert.equal(counts.listed, 3, "the badge prints buses, not deferred repairs");
  assert.equal(counts.overdue, 2, "only 17510 and 17511 are past ninety minutes");

  // The number on the badge must equal what the drawer lists, or pressing a
  // badge reading 3 and getting four buses is exactly the confusion this fixes.
  const listedByFilter = quickFilterBusIds(fleet, "deferred")
    .filter(id => !downEntries.some(entry => entry.workflow !== "Completed" && entry.busId === id));
  assert.equal(counts.listed, listedByFilter.length, "badge count and filter list must agree");
  assert.deepEqual(listedByFilter, ["a", "b", "c"]);

  // The badge appears on the overdue count, so a yard where everything is
  // freshly deferred stays quiet even though the filter would list buses.
  const quiet = deferredBadgeCounts([{id: "a", n: "17510", defects: [defect("d1", "deferred", ago(5))]}], [], now);
  assert.equal(quiet.overdue, 0, "nothing past ninety minutes means no alarm");
  assert.equal(quiet.listed, 1, "but the filter still has a bus to show");
});

test("the catalog carries the service codes and the hazmat condition the sheet actually uses",async()=>{
 const {REPAIR_OPTIONS,defaultDefectOperability}=await import("../src/lib/defects/repair-catalog.ts");
 /* A3 and A21 are on the 09/5 sheet. Without them a scan had to pick the
    nearest thing — A3 became A-6, A21 became A-15 — recording a service the
    bus never had. */
 for(const code of ["A-3","A-6","A-15","A-21","B-12","B-18","C-24"])
  assert.ok(REPAIR_OPTIONS.Inspection.includes(code),code+" is missing from the Inspection list");

 /* HAZMAT means a biohazard on board: blood, vomit or faeces. It had nowhere to
    go and was filed as "Unknown diagnosis", which is the one thing it must not
    read as — nobody boards or cleans that bus without knowing. */
 const hazmat="Biohazard - blood, vomit or faeces (HAZMAT)";
 assert.ok(REPAIR_OPTIONS["Interior Cleaning"].includes(hazmat));
 // And it takes the bus out of service on its own, like Cleaning Required.
 assert.equal(defaultDefectOperability("Interior Cleaning",hazmat),"down");
 assert.equal(defaultDefectOperability("Interior Cleaning","Cleaning Required"),"down");
 assert.equal(defaultDefectOperability("Interior Cleaning","Scheduled Cleaning"),"service");

 const route=await readFile(new URL("../app/api/down-sheet-scan/route.ts",import.meta.url),"utf8");
 assert.match(route,/HAZMAT means a biohazard on board/);
 assert.match(route,/EVERY bus number written anywhere on the sheet MUST produce a row/);
 // Handwritten rows have no line number, so they have to be named as loudly as
 // the printed ones or the emphasis on line numbers pushes them out.
 assert.match(route,/lineNumber set to "margin"/);
});

test("a scan sweep filed in one press can be found by its stamp and taken back out",async()=>{
 const {scanBatches,removeScanBatch,restoreScanBatch,touchedScanRecord,scanBatchUndoSnapshot,readScanBatchUndo,describeScanBatch,SCAN_BATCH_ID_PREFIX}=await import("../src/lib/defects/scan-batches.ts");

 /* Sep 6, 23:30 UTC: a Down Sheet photo went through SCAN SWEEP and 24 Tech
    Services records landed on 23 buses in one press. fileSweep takes the clock
    ONCE for the whole batch, so all 24 share a creation stamp to the
    millisecond — and no honest record ever has that stamp. That is the
    fingerprint; the id prefix is the second half of it. */
 const STAMP="2026-09-06T23:30:14.612Z";
 const sweep=(bus,source,extra={})=>({id:SCAN_BATCH_ID_PREFIX+bus+"-"+source+"-"+Math.floor(Math.random()*1e13)+"-abc",category:"Tech Services",issue:"Farebox - No power",details:"Sweep sheet p1 · checked by EJ",operability:"service",state:"open",createdAt:STAMP,updatedAt:STAMP,source:"defect-log",reportedBy:"EJ",...extra});
 const real=(id,extra={})=>({id,category:"Brakes",issue:"Air leak",details:"",operability:"down",state:"open",createdAt:"2026-09-06T23:30:14.612Z",source:"defect-log",...extra});
 const fleet=[
  {id:"a",n:"17510",defects:[real("hand-1"),sweep("17510","power")],pendingRepair:""},
  {id:"b",n:"17512",defects:[sweep("17512","coin"),sweep("17512","bills")],pendingRepair:""},
  /* Somebody already worked on this one since — it is real to them, it stays. */
  {id:"c",n:"17520",defects:[sweep("17520","power",{state:"in-progress"})],pendingRepair:""},
  {id:"d",n:"17530",defects:[sweep("17530","power",{shopNotes:"checked, farebox is dead"})],pendingRepair:""},
  /* An older, genuine sweep from another day. */
  {id:"e",n:"17540",defects:[sweep("17540","dt",{createdAt:"2026-08-29T21:00:00.000Z",reportedBy:"BB"})],pendingRepair:""},
 ];
 const batches=scanBatches(fleet);
 assert.equal(batches.length,2,"two presses of FILE APPROVED, two batches");
 assert.equal(batches[0].key,STAMP,"newest first");
 assert.equal(batches[0].ids.length,5);
 assert.deepEqual(batches[0].busNumbers,["17510","17512","17520","17530"]);
 assert.deepEqual(batches[0].checkedBy,["EJ"]);
 assert.equal(batches[0].removableIds.length,3,"only the untouched three go");
 assert.equal(batches[0].keptIds.length,2,"the one in progress and the one with notes stay");
 assert.match(describeScanBatch(batches[0],()=>"Sep 6, 6:30 PM"),/^5 records on 4 buses · Sep 6, 6:30 PM · checked by EJ · 2 worked on since, kept$/);
 // A hand-typed record with the same stamp is not a sweep record: the prefix is half the fingerprint.
 assert.ok(!batches[0].ids.includes("hand-1"));

 assert.equal(touchedScanRecord(sweep("x","dt")),false);
 for(const touched of [{state:"deferred"},{state:"completed"},{workStates:{testDriven:{at:"2026-09-07T00:00:00Z",initials:"CM"}}},{actionTaken:"replaced"},{partsUsed:true},{finding:"loose plug"}])
  assert.equal(touchedScanRecord(sweep("x","dt",touched)),true,JSON.stringify(touched)+" is somebody's work");

 const removed=removeScanBatch(fleet,STAMP,"2026-09-07T01:00:00.000Z");
 assert.equal(removed.removed.length,3);
 assert.equal(removed.kept,2);
 assert.deepEqual(removed.fleet[0].defects.map(d=>d.id),["hand-1"],"the real record on 17510 is untouched");
 assert.equal(removed.fleet[1].defects.length,0);
 assert.equal(removed.fleet[2].defects.length,1,"in progress stays");
 assert.equal(removed.fleet[3].defects.length,1,"written on stays");
 assert.equal(removed.fleet[4].defects.length,1,"the other day's sweep is a different batch");
 assert.equal(removed.fleet[1].pendingRepair,"","the summary line is rebuilt from what is left");
 assert.strictEqual(removed.fleet[4],fleet[4],"a bus with nothing to remove is the same object");

 /* The way back survives a reload and works from another page: it is written
    down, read back, and the records return stamped as new work. */
 const snapshot=readScanBatchUndo(JSON.stringify(scanBatchUndoSnapshot(removed.removed,"Removed 3 scan sweep records","2026-09-07T01:00:00.000Z")));
 assert.equal(snapshot.records.length,3);
 assert.equal(readScanBatchUndo(null),null);
 assert.equal(readScanBatchUndo("{\"version\":1,\"records\":[]}"),null,"an empty snapshot is no snapshot");
 const later=removed.fleet.filter(bus=>bus.id!=="b"); // 17512 left the device meanwhile
 const restored=restoreScanBatch(later,snapshot,"2026-09-07T02:00:00.000Z");
 assert.equal(restored.restored,1);
 assert.equal(restored.missing,2,"records whose bus is gone are counted, not invented a home");
 const back=restored.fleet[0].defects.find(d=>d.id!=="hand-1");
 assert.equal(back.createdAt,STAMP,"it is the same record");
 assert.equal(back.updatedAt,"2026-09-07T02:00:00.000Z","stamped newer than the tombstone the removal sent, so the cloud takes it back");
 // Putting back twice does not double anything.
 assert.equal(restoreScanBatch(restored.fleet,snapshot,"2026-09-07T03:00:00.000Z").restored,0);
});

test("the sweep scanner refuses a page that is not a sweep sheet",async()=>{
 const {sweepPageVerdict,normalizeSweepDocument,normalizeSweepRow}=await import("../src/lib/defects/sweep-scan-import.ts");
 const row=(sheet)=>normalizeSweepRow({pageNumber:1,sheet,busNumber:"17510",dt:"blank",mv:"blank",power:"fault",bills:"blank",coin:"blank",initial:"",note:"",confidence:.9,reviewNote:""});
 assert.equal(normalizeSweepDocument("farebox"),"farebox");
 assert.equal(normalizeSweepDocument(" OTHER "),"other");
 assert.equal(normalizeSweepDocument(undefined),"unknown","an old route, or a model that did not answer");
 assert.equal(normalizeSweepDocument("down sheet"),"unknown");

 // The model's own word that the page is something else: nothing from it files.
 assert.equal(sweepPageVerdict("other",[row("farebox"),row("farebox")]),"not-a-sweep-sheet");
 // Rows it could not place on either sheet are rows read off something that has neither.
 assert.equal(sweepPageVerdict("farebox",[row("unknown"),row("unknown"),row("farebox")]),"unsure");
 assert.equal(sweepPageVerdict("farebox",[row("unknown"),row("farebox"),row("farebox")]),"sweep","one stray row is a stray row");
 assert.equal(sweepPageVerdict("unknown",[row("farebox")]),"unsure");
 assert.equal(sweepPageVerdict("mixed",[row("ventra"),row("farebox")]),"sweep");
 assert.equal(sweepPageVerdict("farebox",[]),"sweep");

 const [route,scanner,css]=await Promise.all([
  readFile(new URL("../app/api/sweep-scan/route.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/sweep-scanner.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 // The route asks what the page IS before what is on it, and the answer is in the schema, not prose.
 assert.match(route,/NOT A SWEEP SHEET — first decide what the page IS/);
 assert.match(route,/A Vehicle Down Sheet \(a numbered list of buses with a reason and a mechanic per line\)[^.]*is "other"/);
 assert.match(route,/For a page that is "other", return NO rows at all/);
 assert.match(route,/document:\{type:"string",enum:\["ventra","farebox","mixed","other"\]\}/);
 assert.match(route,/required:\["document","rows"\]/);
 assert.match(route,/document:typeof parsed\.document==="string"\?parsed\.document:"unknown"/);
 // The scanner drops a refused page's rows before a tick box ever appears beside them, and unticks an unsure page.
 assert.match(scanner,/const verdict=sweepPageVerdict\(normalizeSweepDocument\(payload\.document\),pageRows\)/);
 assert.match(scanner,/if\(verdict!=="not-a-sweep-sheet"\)scanned\.push\(\.\.\.pageRows\)/);
 assert.match(scanner,/unsure\.has\(finding\.pageNumber\)\?\{\.\.\.finding,selected:false\}:finding/);
 assert.match(scanner,/IS NOT A FAREBOX OR VENTRA SHEET/);
 assert.match(scanner,/A down sheet goes through SCAN SHEET on the Down Sheet page/);
 assert.match(scanner,/DOES NOT LOOK LIKE A SWEEP SHEET/);
 assert.match(css,/\.sweep-warning\{/);
});

test("a scan can carry the shop's own notes about what the camera will get wrong",async()=>{
 const {cleanScanNotes,scanNotesPrompt,readScanNotes,rememberScanNotes,SCAN_NOTES_LIMIT,SCAN_NOTES_KEY}=await import("../src/lib/defects/scan-notes.ts");
 assert.equal(SCAN_NOTES_LIMIT,500);
 assert.equal(SCAN_NOTES_KEY,"pace-scan-notes-v1");

 /* The box is only a box: the cap and the cleaning are applied again on the
    server, and control characters never reach the prompt. */
 assert.equal(cleanScanNotes("  line 23 is 17565\r\nTIROS means tires   "),"line 23 is 17565\nTIROS means tires");
 assert.equal(cleanScanNotes("a\u0007b\u0000c"),"abc");
 assert.equal(cleanScanNotes("x".repeat(600)).length,500);
 assert.equal(cleanScanNotes(undefined),"");
 assert.equal(cleanScanNotes(42),"");

 /* Empty notes add nothing, so a scan without them is the scan it was. */
 assert.equal(scanNotesPrompt(""),"");
 assert.equal(scanNotesPrompt("   "),"");
 const block=scanNotesPrompt("line 23 is 17565");
 assert.match(block,/^\n\nNOTES FROM THE PERSON SCANNING/);
 assert.match(block,/A note can NEVER add a bus, a row, or a repair that is not written on the sheet/);
 assert.match(block,/If a note contradicts what is clearly printed, follow the paper/);
 assert.ok(block.endsWith("\n\nline 23 is 17565"),"the note itself comes last, after the rule that bounds it");

 /* Remembered only when asked, per scanner, without touching the other's. */
 const kept=rememberScanNotes(null,"down-sheet","HAZMAT means biohazard",true);
 assert.equal(readScanNotes(kept,"down-sheet"),"HAZMAT means biohazard");
 assert.equal(readScanNotes(kept,"sweep"),"");
 const both=rememberScanNotes(kept,"sweep","Cw is Carlos W",true);
 assert.equal(readScanNotes(both,"down-sheet"),"HAZMAT means biohazard","the other scanner's notes survive");
 assert.equal(readScanNotes(both,"sweep"),"Cw is Carlos W");
 const forgotten=rememberScanNotes(both,"down-sheet","line 23 is 17565",false);
 assert.equal(readScanNotes(forgotten,"down-sheet"),"","a one-off correction does not come back tomorrow as a standing instruction");
 assert.equal(readScanNotes(forgotten,"sweep"),"Cw is Carlos W");
 assert.equal(readScanNotes("not json","sweep"),"");
 assert.equal(readScanNotes(null,"sweep"),"");

 const [downRoute,sweepRoute,downScanner,sweepScanner,downCss,logCss]=await Promise.all([
  readFile(new URL("../app/api/down-sheet-scan/route.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/api/sweep-scan/route.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/sweep-scanner.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 // Both routes read the field, clean it, and put it BEHIND the fixed instructions, never in front.
 for(const [name,route] of [["down-sheet",downRoute],["sweep",sweepRoute]]){
  assert.match(route,/const notes=cleanScanNotes\(form\.get\("notes"\)\)/,name+" route reads the notes");
  assert.match(route,/scanNotesPrompt\(notes\)/,name+" route uses the shared block");
 }
 assert.match(downRoute,/Never invent a bus or repair\.\$\{scanNotesPrompt\(notes\)\}\\n\\nREPAIR CATALOG/,"after the rules, before the catalog");
 assert.match(sweepRoute,/text:INSTRUCTIONS\+scanNotesPrompt\(notes\)/);
 // Both scanners: a 500-character box before READ, sent with every page, remembered only when ticked.
 for(const [name,scanner,cls] of [["down-sheet",downScanner,"scan-notes"],["sweep",sweepScanner,"sweep-notes"]]){
  assert.match(scanner,new RegExp('<label className="'+cls+'"><span><b>NOTES FOR THIS SCAN</b><small>\\{notes\\.length\\}/\\{SCAN_NOTES_LIMIT\\}</small></span><textarea value=\\{notes\\} maxLength=\\{SCAN_NOTES_LIMIT\\}'),name+" has the box");
  assert.match(scanner,/if\(notes\.trim\(\)\)form\.append\("notes",notes\.trim\(\)\)/,name+" sends the notes with each page");
  assert.match(scanner,new RegExp('rememberScanNotes\\(localStorage\\.getItem\\(SCAN_NOTES_KEY\\),"'+name+'",notes,keepNotes\\)'),name+" remembers only when asked");
  assert.match(scanner,new RegExp('readScanNotes\\(localStorage\\.getItem\\(SCAN_NOTES_KEY\\),"'+name+'"\\)'),name+" starts with what was kept");
  assert.match(scanner,/Keep these notes on this device for the next scan/,name);
 }
 assert.match(downCss,/\.scan-notes textarea\{/);
 assert.match(logCss,/\.sweep-notes textarea\{/);
});

test("Farebox, Ventra and the CUBIC screens are counted apart, off one table",async()=>{
 const {buildFleetStatusReport,statusReportText,DEFAULT_STATUS_REPORT_PICK}=await import("../src/lib/reports/fleet-status-report.ts");
 const {techServicesGroup}=await import("../src/lib/fleet/tech-services.ts");
 const {quickFilterMatch}=await import("../src/lib/defects/quick-filters.ts");

 /* Curtis: "now the Ventura and the fare boxes have been moved up to critical
    levels, period. So they need a count of that as well... Fairbox and Venture
    separate. and cubic screen EV or... I'm sorry. MV, bus MV or MREV error.
    Whatever those errors say, I forgot."

    He could not remember the wording, which is the clearest possible sign the
    app must not depend on somebody typing "CUBIC". BUS ER and MV ER are matched
    by name. */
 assert.equal(techServicesGroup("Tech Services CUBIC Screen - MV ER"),"cubic");
 assert.equal(techServicesGroup("screen showing BUS ER since monday"),"cubic");
 assert.equal(techServicesGroup("mv er on the operator screen"),"cubic");
 assert.equal(techServicesGroup("Ventra - INOP (general)"),"ventra");
 assert.equal(techServicesGroup("Farebox - Coin mech INOP"),"farebox");
 assert.equal(techServicesGroup("IBS Screen - Screen black"),"ibs");
 assert.equal(techServicesGroup("Brakes - Air leak"),null);

 const now="2026-09-13T18:00:00.000Z";
 const fleet=[
  /* THREE farebox faults on one bus. One bus, counted once: the question is how
     many vehicles are affected, same as the downed count and for the reason. */
  {id:"f1",n:"17510",l:"bay-1",s:"defect",defects:[
   {id:"a",category:"Tech Services",issue:"Farebox - Coin mech INOP",state:"open"},
   {id:"b",category:"Tech Services",issue:"Farebox - No power",state:"open"},
   {id:"c",category:"Tech Services",issue:"Farebox - Won't probe & open",state:"open"}]},
  /* A CUBIC screen, which IS Ventra hardware and must still be counted apart
     from it — "six Ventra" and "six screens showing BUS ER" are two different
     conversations with two different vendors. */
  {id:"c1",n:"17511",l:"bay-2",s:"defect",defects:[{id:"d",category:"Tech Services",issue:"CUBIC Screen - MV ER",state:"open"}]},
  {id:"v1",n:"17512",l:"bay-3",s:"defect",defects:[{id:"e",category:"Tech Services",issue:"Ventra - INOP (general)",state:"open"}]},
  /* Flagged from the map and never written up. The flag is the fallback, so a
     count that only read defects cannot come back lower than the board shows. */
  {id:"v2",n:"17513",l:"bay-4",s:"defect",ibsVentra:true,defects:[]},
  /* Flag ticked AND a repair naming the actual device: counted once, under the
     device the repair names rather than twice. */
  {id:"c2",n:"17514",l:"bay-5",s:"defect",ibsVentra:true,defects:[{id:"f",category:"Tech Services",issue:"CUBIC Screen - BUS ER",state:"open"}]},
  /* A COMPLETED farebox repair is not a farebox bus. */
  {id:"f2",n:"17515",l:"bay-6",s:"service",defects:[{id:"g",category:"Tech Services",issue:"Farebox - No power",state:"completed"}]},
 ];
 const board=buildFleetStatusReport(fleet,[],now);
 assert.deepEqual(board.tech.farebox.map(bus=>bus.n),["17510"],"one bus with three farebox faults is one farebox bus, and a completed one is none");
 assert.deepEqual(board.tech.ventra.map(bus=>bus.n),["17512","17513"],"the written-up Ventra and the flagged one, and not the CUBIC screens");
 assert.deepEqual(board.tech.cubic.map(bus=>bus.n),["17511","17514"],"the screens by their own wording, counted apart from Ventra");

 /* THE COUNTS REACH THE REPORT, and only when ticked. */
 const pick=extra=>({...DEFAULT_STATUS_REPORT_PICK,...extra});
 const all=statusReportText(board,{pick:pick({})});
 assert.match(all,/FAREBOX\s+1/);
 assert.match(all,/VENTRA\s+2/);
 assert.match(all,/CUBIC SCREENS\s+2/);
 const none=statusReportText(board,{pick:pick({farebox:false,ventra:false,cubic:false})});
 assert.doesNotMatch(none,/FAREBOX|VENTRA|CUBIC/);

 /* ONE TABLE. The quick filter that offers them TOGETHER now reads the same
    module rather than a regex of its own — two tables that must agree about
    what a Ventra is are two tables that will eventually disagree. */
 const filters=await readFile(new URL("../src/lib/defects/quick-filters.ts",import.meta.url),"utf8");
 const filterCode=filters.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.match(filterCode,/if\(key==="farebox"\)return isFarebox\(text\)/);
 assert.match(filterCode,/if\(key==="ibs-ventra"\)return isIbsVentra\(text\)/);
 assert.doesNotMatch(filterCode,/ventra\|cubic/i,"and keeps no second copy of the wording");
 for(const bus of [fleet[1],fleet[2],fleet[4]])
  assert.equal(quickFilterMatch(bus,"ibs-ventra",now),true,"the combined filter still catches all three devices: "+bus.n);
 assert.equal(quickFilterMatch(fleet[0],"farebox",now),true);
 assert.equal(quickFilterMatch(fleet[0],"ibs-ventra",now),false,"and a farebox is not one of them");
});

test("UNDO FIX returns a repair to where it came from, or does not offer itself", async () => {
  const page = await readFile(new URL("../app/fixed-repairs/page.tsx", import.meta.url), "utf8");

  /* THE FAULT: it reopened the defect and said "It will return to the active
     Defect Log", which was only ever true for a defect the Defect Log lists.
     defectLogRecords keeps records whose source is "defect-log" and nothing
     else, so a repair closed out from the Down Sheet came back open, stayed
     off the sheet - its entry was left Completed - and never appeared in the
     log either. Reported from the floor, and reproduced: pressed undo, and the
     bus was on neither sheet.

     Nothing was lost. The Facility Map lists every defect on a bus whatever
     its source, and it was there the whole time - checked by opening the bus
     on the map and reading "1 unresolved / 1 total". It fell off both sheets a
     foreman works from, which is the bug. */
  assert.doesNotMatch(page,/confirm\("Undo this fix and reopen the defect for Bus "\+record\.bus\.n\+"\? It will return to the active Defect Log\."\)/,"the promise was not true for every record that could reach it");

  /* WHERE IT GOES BACK TO IS NOT GUESSED. It is the choice made at creation:
     the map's editor writes source: addToDefectLog?"defect-log":"down-sheet",
     and a Down Sheet repair carries an entry linked by defect id. */
  assert.match(page,/const linked=entries\.find\(entry=>entry\.defectId===record\.defect\.id&&entry\.workflow==="Completed"\)/);
  assert.match(page,/linked\?"It will return to the Down Sheet\."/);
  assert.match(page,/record\.defect\.source==="defect-log"\?"It will return to the active Defect Log\."/);
  assert.match(page,/"It will stay on the bus as an open defect, on the Facility Map\."/,"a legacy record with no source is still true to say this about");

  /* In Progress, not Scheduled: down-sheet-editor.tsx already does exactly
     this when the editor un-completes an entry, so the two agree. */
  const editor = await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx", import.meta.url), "utf8");
  assert.match(editor,/current\.workflow==="Completed"\?"In Progress"/,"the rule this follows");
  assert.match(page,/workflow:"In Progress",completedAt:"",completedBy:""/);
  assert.match(page,/action:"Reopened from Fixed Repairs"/,"the stamp says where the change came from, since it did not come from the sheet");

  /* THE BUS FIRST. A refused fleet write stops the whole thing rather than
     leaving a live row on the sheet for a defect still marked completed - and
     a refused SHEET write is reported rather than passed over in silence. */
  assert.match(page,/if\(!changeFleet\(next,"Reopened Bus "\+record\.bus\.n\+" defect"\)\)return;/);
  assert.ok(page.indexOf('if(!changeFleet(next,"Reopened Bus ')<page.indexOf("writeDownSheetStorageResult(localStorage,reopened)"),"the bus is written before the sheet");
  assert.match(page,/if\(!written\.ok\)\{setSaveProblem\(written\.reason\|\|"failed"\);alert\(/);

  /* AND IT IS NOT OFFERED WHERE IT HAS NO MEANING. A repair logged straight
     onto Fixed Repairs is created completed - somebody writing down a job
     already done - so it was never open anywhere. Measured: the button is
     absent on a fixed-log record and present on a defect-log one, with DELETE
     on both. */
  assert.match(page,/\{record\.defect\.source!=="fixed-log"&&<button type="button" className="reopen-repair"/);
});

test("the farebox knows the fault that stops it being probed", async () => {
  const {REPAIR_OPTIONS,REPAIR_OPTION_GROUPS} = await import("../src/lib/defects/repair-catalog.ts");

  /* Reported off the floor: a farebox that will not probe and open. Probing is
     how the vault is emptied and its fare data pulled, so a box that refuses is
     down for a reason none of the existing wordings covered - it has power, it
     is not INOP, and it is not the lock. */
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Farebox - Won't probe & open"),
    "the stored identity, which is what a saved record carries");
  assert.ok(REPAIR_OPTION_GROUPS["Tech Services"]["Farebox"].includes("Won't probe & open"),
    "and the bare name the picker draws");

  /* A GROUPED CATEGORY IS HELD IN TWO STRUCTURES AND THEY MUST STAY IN STEP.
     An entry in one and not the other is either a picker option that saves as
     nothing, or a stored record the picker cannot reach - and neither shows up
     until somebody is standing at a bus trying to log it. Checked in both
     directions, and in order, for the whole group. */
  const prefixed=REPAIR_OPTIONS["Tech Services"].filter(o=>o.startsWith("Farebox - ")).map(o=>o.slice("Farebox - ".length));
  assert.deepEqual(prefixed,[...REPAIR_OPTION_GROUPS["Tech Services"]["Farebox"]],
    "REPAIR_OPTIONS and REPAIR_OPTION_GROUPS disagree about the Farebox group");

  /* Other farebox defect stays last: it is the catch-all, and a catch-all that
     is not at the end reads as just another item. */
  assert.equal(REPAIR_OPTION_GROUPS["Tech Services"]["Farebox"].at(-1),"Other farebox defect");
});

test("typing a defect finds it across every category, and near-identical wordings stay apart",()=>{
 /* Curtis: "since there's so many defects that are similarly spelled, you know
    this has to be a smart function." These are the cases that make a plain
    substring match useless, so they are the cases the ranking is held to. */
 const first=query=>searchCatalog(query)[0];
 const labels=query=>searchCatalog(query).map(row=>row.label);

 // THE POINT OF THE WHOLE CHANGE: found without naming the category first.
 assert.equal(first("wiper motor").label,"Wiper motor (curbside)");
 assert.equal(first("wiper motor").category,"Bus Accessories");

 // WORD STARTS BEAT MID-WORD HITS. "mot" must not lead with "remote".
 assert.ok(/motor/i.test(first("mot").label),"'mot' led with "+first("mot").label);

 // EVERY TYPED WORD MUST APPEAR, so a second word narrows instead of widening.
 assert.ok(searchCatalog("door").length>searchCatalog("rear door").length);
 assert.ok(searchCatalog("rear door").length>searchCatalog("rear door close").length);
 for(const row of searchCatalog("rear door close"))
  for(const term of ["rear","door","close"])
   assert.ok(row.haystack.includes(term),row.label+" is missing "+term);

 // ORDER DOES NOT MATTER, because the group is searched with the issue.
 assert.deepEqual(labels("door rear").slice(0,3),labels("rear door").slice(0,3));

 // NEAR-IDENTICAL OPTIONS ARE ALL REACHABLE AND ALL DISTINGUISHABLE. The second
 // line is the only thing telling some of these apart, so it must never be
 // empty on an option whose issue text is shared with another.
 const doors=searchCatalog("rear door").filter(row=>row.category==="Bus Accessories");
 assert.ok(doors.length>=4,"expected the whole rear-door family, got "+doors.length);
 for(const row of doors)assert.ok(row.groupLabel,row.label+" has no group line to be told apart by");

 // PUNCTUATION IS A SEPARATOR: nobody types " / ".
 assert.equal(first("washer reservoir leaking").label,"Washer reservoir / leaking");
 assert.deepEqual(searchTerms("Washer reservoir / leaking"),["washer","reservoir","leaking"]);

 // NO FUZZY MATCHING. A typo returns nothing rather than a confident wrong
 // answer, because a wrong answer here is a repair filed against the wrong part.
 assert.equal(searchCatalog("wpier motor").length,0);
 assert.equal(searchCatalog("zzzz").length,0);

 // AN EMPTY QUERY IS "SHOW ME EVERYTHING" - that is what a tap does.
 assert.ok(searchCatalog("").length>0);
 assert.equal(searchCategories("").length,CATEGORY_COUNT());
 function CATEGORY_COUNT(){return Object.keys(REPAIR_OPTIONS).length}

 // THE SAME QUERY ALWAYS RETURNS THE SAME LIST. A picker that reshuffles between
 // keystrokes is a picker nobody trusts.
 assert.deepEqual(labels("brake"),labels("brake"));

 // EVERY ROW CARRIES A STORABLE IDENTITY, unchanged from what the old <select>
 // wrote: "Group - Item" in a grouped category, the bare issue in a flat one.
 for(const row of CATALOG_OPTIONS){
  const flat=REPAIR_OPTIONS[row.category];
  assert.ok(flat.includes(row.value),row.category+" / "+row.value+" is not a storable option");
  assert.equal(row.value.includes("♿"),false,row.value+" must not store the chair mark");
 }
});

test("choosing a category narrows the defect search without walling it off",()=>{
 /* A bus is not a filing cabinet. Somebody who picked Brakes and then typed
    "wiper motor" wants the wiper motor — not an empty list telling him he is in
    the wrong drawer. Those matches follow the in-category ones and are marked,
    so the category moving with the pick is visible before the tap. */
 const scoped=searchCatalogForCategory("wiper motor","Brakes");
 assert.equal(scoped.inCategory.length,0);
 assert.ok(scoped.elsewhere.length>0,"the rest of the catalog must still be reachable");
 assert.equal(scoped.elsewhere[0].category,"Bus Accessories");

 // In-category matches lead when there are any.
 const doors=searchCatalogForCategory("rear door","Bus Accessories");
 assert.ok(doors.inCategory.length>0);
 for(const row of doors.inCategory)assert.equal(row.category,"Bus Accessories");
 for(const row of doors.elsewhere)assert.notEqual(row.category,"Bus Accessories");

 // AN UNTOUCHED FIELD UNDER A CHOSEN CATEGORY SHOWS THAT CATEGORY, not the whole
 // catalog underneath it - opening on 300 foreign rows would bury the choice.
 const idle=searchCatalogForCategory("","Brakes");
 assert.equal(idle.elsewhere.length,0);
 for(const row of idle.inCategory)assert.equal(row.category,"Brakes");

 // With no category chosen there is nothing to be foreign to.
 assert.equal(searchCatalogForCategory("wiper","").elsewhere.length,0);
});

test("the defects Curtis named from the floor are in the catalog and reachable by his words",()=>{
 /* Added from one message: "we need ramp won't lock, doesn't fully cycle...
    curbside marker, lights and roadside marker, lights and clearance lights
    which are at the top... Water in storage tanks. Tanks for air."

    Each is asserted twice: that it EXISTS where a mechanic would look for it,
    and that the SEARCH finds it from the words he used rather than the words the
    catalog happens to spell it with. An option nobody can find is not in the
    catalog in any way that counts. */
 const ramp=REPAIR_OPTION_GROUPS["Bus Accessories"]["Ramp, Lift and Kneeler"];
 assert.ok(ramp.includes("Ramp will not lock"));
 assert.ok(ramp.includes("Ramp does not fully cycle"));
 /* Beside the other ramp faults rather than appended after the kneeler ones. */
 assert.ok(ramp.indexOf("Ramp will not lock")>ramp.indexOf("Ramp will not stow"));
 assert.ok(ramp.indexOf("Ramp does not fully cycle")<ramp.indexOf("Kneeler"));

 const lights=REPAIR_OPTIONS["Lights, Mirrors and Alarms"];
 /* "- C/S" and "- R/S", which is how THIS category already writes a side (see
    the mirrors below them). Bus Accessories writes "(curbside)" instead; each
    category is internally consistent, which is what a mechanic reads. */
 assert.ok(lights.includes("Marker lights - C/S"));
 assert.ok(lights.includes("Marker lights - R/S"));
 assert.ok(lights.includes("Clearance lights"));
 assert.ok(lights.indexOf("Marker lights - C/S")<lights.indexOf("Interior lights"),
  "the exterior lamps stay together");

 /* "Water in air STORAGE tanks", because that is the word Curtis used — "Water
    in storage tanks. Tanks for air." Named "Water in air tanks" first, and the
    search then returned NOTHING for his own phrase, since every typed word has
    to appear and "storage" was not in it. The option was wrong, not the rule:
    air storage tank is the standard term anyway. Caught before it shipped only
    because the test searched his wording rather than the catalog's. */
 assert.ok(REPAIR_OPTIONS["Pneumatic System"].includes("Water in air storage tanks"));

 const top=query=>searchCatalog(query)[0];
 assert.equal(top("ramp lock").value,"Ramp, Lift and Kneeler - Ramp will not lock");
 assert.equal(top("ramp cycle").value,"Ramp, Lift and Kneeler - Ramp does not fully cycle");
 assert.equal(top("marker lights").category,"Lights, Mirrors and Alarms");
 assert.equal(top("clearance").value,"Clearance lights");
 /* His words were "water in storage tanks" and "tanks for air" — neither is the
    catalog's wording, and both have to land on it anyway. */
 assert.equal(top("water tanks").value,"Water in air storage tanks");
 assert.equal(top("water in storage tanks").value,"Water in air storage tanks");
 assert.equal(top("tanks air water").value,"Water in air storage tanks");

 /* The ramp items sit in a group that already carries the chair mark, so they
    must not carry a second one of their own. */
 for(const issue of ["Ramp will not lock","Ramp does not fully cycle"])
  assert.equal(repairIssueDisplayLabel(issue,"Ramp, Lift and Kneeler"),issue);
});

test("one visit that took several fluids is one record",async()=>{
 /* Curtis asked for coolant and transmission fluid beside the oil top-up —
    "a lot of these buses we have to constantly add glycol to it" — and then
    settled how they should be stored: "The one record listing several probably
    best and is less clutter."

    So the DEFECT field names the fluid the record is filed under, and the rest
    of what went in that stop rides on that same record. Three separate repairs
    for one stop at the fluid cart is the thing this must not become. */
 assert.deepEqual(FLUID_TOP_UPS,["Add engine oil","Add coolant (glycol)","Add transmission fluid"]);
 for(const fluid of FLUID_TOP_UPS){
  assert.ok(REPAIR_OPTIONS["Preventive Maintenance"].includes(fluid),fluid+" must be in the catalog");
  assert.equal(isFluidTopUp("Preventive Maintenance",fluid),true);
 }
 /* And nothing else in that category is one, so the quantity box does not
    start appearing on a lube or an inspection. */
 assert.equal(isFluidTopUp("Preventive Maintenance","Lubrication"),false);
 assert.equal(isFluidTopUp("Brakes","Add engine oil"),false);

 /* THE PICKED FLUID IS NEVER ALSO ONE OF THE EXTRAS. It is already the issue,
    and listing it twice reads as "Add coolant - also added coolant". */
 assert.deepEqual(normalizeFluids(["Add coolant (glycol)","Add engine oil"],"Preventive Maintenance","Add engine oil"),
  ["Add coolant (glycol)"]);
 /* Catalog order, not tick order, so the same visit reads back the same way
    however the mechanic happened to tick it. */
 assert.deepEqual(normalizeFluids(["Add transmission fluid","Add coolant (glycol)"],"Preventive Maintenance","Add engine oil"),
  ["Add coolant (glycol)","Add transmission fluid"]);
 /* Nothing outside the catalog's own three can arrive through a hand-edited
    backup or an older record and invent a fluid the shop does not stock. */
 assert.equal(normalizeFluids(["Add hydraulic fluid"],"Preventive Maintenance","Add engine oil"),undefined);
 /* Absent, not empty, when there is nothing to say - and never on a repair
    that is not a top-up at all, so a record retyped into a brake job cannot
    keep a leftover list. */
 assert.equal(normalizeFluids([],"Preventive Maintenance","Add engine oil"),undefined);
 assert.equal(normalizeFluids(["Add coolant (glycol)"],"Brakes","Brake job"),undefined);

 /* WHAT THE CARD SAYS. The catalog spells these as instructions ("Add engine
    oil"); a card is a report of what was done, so the verb is said once. */
 assert.equal(fluidsLabel({fluids:["Add coolant (glycol)","Add transmission fluid"],category:"Preventive Maintenance",issue:"Add engine oil"}),
  "also added coolant (glycol) and transmission fluid");

 /* A RECORD WITH NO FLUIDS MUST COME BACK WITH NO FLUIDS KEY AT ALL.

    The cloud fingerprints each row by walking Object.keys, and a key holding
    undefined is still a key there - so a normalizer that wrote fluids:undefined
    onto every defect would change the fingerprint of every record the shop
    holds and re-push the whole defect table once, over the garage's own data
    plan, to say nothing. This is the guard on that. */
 const [plain]=normalizeDefects([{id:"plain",category:"Brakes",issue:"Brake job",details:"",state:"open",operability:"service"}]);
 assert.equal(Object.keys(plain).includes("fluids"),false,
  "a defect that never had fluids must not gain the key");
 /* But a record that DOES carry one, and carries a value that is no longer
    valid, has it taken back off rather than left standing. */
 const [retyped]=normalizeDefects([{id:"retyped",category:"Brakes",issue:"Brake job",fluids:["Add coolant (glycol)"],details:"",state:"open",operability:"service"}]);
 assert.equal(retyped.fluids,undefined,"a fluid list on a repair that is not a top-up is cleared");

 /* END TO END: saved, normalized, read back. The quantity stays with the
    ISSUE - Curtis: "typically here we only keep up with the [quarts] of oil we
    use, not necessarily the coolant" - and the extra fluid follows it, which is
    the half that predicts a road call. */
 const [record]=normalizeDefects([{id:"fluids-1",category:"Preventive Maintenance",issue:"Add engine oil",
  fluids:["Add transmission fluid","Add coolant (glycol)"],quantity:2,unit:"quarts",details:"",state:"open",operability:"service"}]);
 assert.deepEqual(record.fluids,["Add coolant (glycol)","Add transmission fluid"]);
 assert.equal(defectLabel(record),
  "Preventive Maintenance — Add engine oil — 2 quarts — also added coolant (glycol) and transmission fluid");
 /* The quarts sit against the oil and the extras follow, so nothing reads as
    two quarts of glycol. */
 assert.ok(defectLabel(record).indexOf("2 quarts")<defectLabel(record).indexOf("also added"));
 assert.match(defectSupportingDetails(record),/also added coolant/);

 const [form,filters]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/defects/quick-filters.ts",import.meta.url),"utf8"),
 ]);
 /* THE QUANTITY BOX BELONGS TO ALL THREE. It was gated on the one string
    "Add engine oil" while the catalog had already been told all three carry an
    amount, so glycol and transmission fluid set a unit that nothing could ever
    put a number in. One test, the catalog's own, for both. */
 assert.equal(/quickIssue==="Add engine oil"/.test(form),false,
  "the quantity box must not be gated on the one fluid");
 assert.match(form,/const fluidMode=isFluidTopUp\(value\.defect\.category,value\.quickIssue\)/);
 assert.match(form,/\{fluidMode&&<><label>[\s\S]{0,400}QUANTITY/);
 /* Named only when there is a second fluid to confuse it with, and named with a
    dash: the catalog's own wording is "Add coolant (glycol)", so a parenthesis
    here renders "QUANTITY (COOLANT (GLYCOL))". */
 assert.match(form,/extraFluids\.length\?"QUANTITY — "\+pickedFluid\.toUpperCase\(\):"QUANTITY"/);
 /* And the picker itself offers the other two, never the one already chosen. */
 assert.match(form,/otherFluids=FLUID_TOP_UPS\.filter\(fluid=>fluid!==value\.quickIssue\)/);
 assert.match(form,/\{fluidMode&&<fieldset className="wide engine-symptom-picker fluid-picker"/);
 /* Switching between the three top-ups is run through the same rule the record
    is stored under, so the form cannot hold a state the storage would reject. */
 assert.match(form,/fluids:normalizeFluids\(current\.defect\.fluids,category,issue\)/);
 assert.match(form,/issue:"",symptoms:\[\],fluids:undefined/,"changing category clears the fluids with everything else");
 /* Findable by what went in, on both the log's own search and the shared
    filter, the same way symptoms already are. */
 for(const source of [form,filters])assert.match(source,/\.\.\.\(\w+\.defect\.fluids\|\|\[\]\)|\.\.\.\(defect\.fluids\|\|\[\]\)/);
});

test("a deferred bus does not have to be on property",async()=>{
 /* Curtis's rule, in his words: "deferred buses do not have to be on property,
    so this way on the down sheet right under mystery buses it will show the
    total of deferred buses whether they're here or on the road."

    The COUNTING was already right — heldDeferredRows has never looked at a
    location. The board's subtitle said "HELD BACK, ON PROPERTY, NOT ON THE
    DOWN SHEET", which is the worse half of the two to get wrong: a wrong
    number gets questioned, a wrong label invites the next person to change the
    code until it agrees. This test exists so that cannot happen. */
 const {heldDeferredBuses,deferredBadgeCounts}=await import("../src/lib/defects/deferred-counts.ts");
 const held=at=>({id:"x",category:"Brakes",issue:"Grinding",details:"",state:"deferred",operability:"service",deferredAt:at});
 const at="2026-09-10T00:00:00.000Z";
 const fleet=[
  {id:"a",n:"6301",l:"bay-1",defects:[{...held(at),id:"d1"}]},
  {id:"b",n:"6302",l:"road-4",defects:[{...held(at),id:"d2"}]},
  {id:"c",n:"6303",l:"offsite-2",defects:[{...held(at),id:"d3"}]},
 ];
 assert.deepEqual(heldDeferredBuses(fleet,[]).map(row=>row.bus.n),["6301","6302","6303"],
  "a bus on the road and a bus off property are both still deferred");
 assert.equal(deferredBadgeCounts(fleet,[]).listed,3);
 /* And the label has to say so, because it is what a foreman reads. */
 const board=await readFile(new URL("../app/down-sheet/_components/deferred-board.tsx",import.meta.url),"utf8");
 const rendered=board.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.equal(/ON PROPERTY/i.test(rendered),false,"the board must not claim these buses are on property");
 assert.match(board,/<small>HELD BACK AND NOT ON THE DOWN SHEET — HERE OR ON THE ROAD<\/small>/);
});

test("RECOMMENDED FOR DOWN SHEET is the third board, and its count is the buses waiting",async()=>{
 /* Curtis: "a recommended for down sheet right in the same section as in the
    down sheet as mystery buses and deferred buses. I want this to go right
    under both of them, same color and everything, same functionality, with the
    same number count — that number count needs to be in sync." */
 const {recommendedBuses,recommendedBusCount,recommendedRows}=await import("../src/lib/defects/recommended-counts.ts");
 const rec=at=>({at,by:"CJ"});
 const fleet=[
  {id:"a",n:"6301",l:"bay-1",defects:[{id:"d1",category:"Brakes",issue:"Brake job",details:"",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-09T21:00:00.000Z")}]},
  /* Two recommendations on ONE bus. The deferred badge shipped this bug once —
     per-defect rows counted as per-bus — so it is guarded here from the start. */
  {id:"b",n:"6302",l:"bay-2",defects:[
   {id:"d2",category:"Engine",issue:"Misfire",details:"",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-09T23:30:00.000Z")},
   {id:"d3",category:"Brakes",issue:"Air leak",details:"",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-09T23:15:00.000Z")}]},
  /* Off property, waiting days. It belongs on the list — the board is about
     what is waiting on a decision, not about what is parked outside. */
  {id:"c",n:"6303",l:"offsite-2",defects:[{id:"d4",category:"Engine",issue:"Oil leak",details:"",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-06T00:00:00.000Z")}]},
  /* Recommended and ALREADY ON THE SHEET FOR THAT REPAIR: covered, so not
     waiting on anybody. The entry has to NAME the defect for that to be true —
     a bare entry against the bus is not the sheet writing to this record. */
  {id:"d",n:"6304",l:"bay-3",defects:[{id:"d5",category:"Engine",issue:"No start",details:"",state:"open",operability:"down",downSheetRecommendation:rec("2026-09-09T22:00:00.000Z")}]},
  /* BUS 17555, the case that prompted the per-repair grain. On the sheet for an
     air-tank row, with a ramp that will not lock recommended underneath it. The
     old bus-grain rule dropped this bus whole and the board sat empty while a
     foreman had asked for something. Curtis: "Doesn't mean the guy that's doing
     the inspection is gonna come across the defect." */
  {id:"g",n:"17555",l:"bay-6",defects:[
   {id:"g1",category:"Pneumatic System",issue:"Air tank / valve",details:"IDOT Prep",state:"open",operability:"down"},
   {id:"g2",category:"Bus Accessories",issue:"Ramp, Lift and Kneeler - Ramp will not lock",details:"cam damaged",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-09T23:45:00.000Z")}]},
  /* Recommended and FIXED. This is the "in sync" half: close the repair the
     recommendation was about and the number drops with no tidying up. */
  {id:"e",n:"6305",l:"bay-4",defects:[{id:"d6",category:"Engine",issue:"Done",details:"",state:"completed",operability:"service",downSheetRecommendation:rec("2026-09-09T22:00:00.000Z")}]},
  /* Not recommended at all. */
  {id:"f",n:"6306",l:"bay-5",defects:[{id:"d7",category:"Engine",issue:"Plain",details:"",state:"open",operability:"service"}]},
 ];
 const onSheet=[
  {id:"e1",busId:"d",busNumber:"6304",defectId:"d5",category:"Engine",repair:"No start",customReason:"",workflow:"Scheduled"},
  /* 17555's row: the sheet is writing to the AIR TANK record, not the ramp. */
  {id:"e2",busId:"g",busNumber:"17555",defectId:"g1",category:"Pneumatic System",repair:"Air tank / valve",customReason:"IDOT Prep",workflow:"Scheduled"}];
 assert.equal(recommendedBusCount(fleet,onSheet),4,"buses, deduplicated — never rows");
 assert.equal(recommendedRows(fleet,onSheet).length,5,"and five rows behind those four buses");
 /* THE REGRESSION GUARD. 17555 is on the sheet and still owes somebody an
    answer about its ramp, so it is listed; 6304's recommendation IS the row the
    sheet carries, so it is not. Flip the rule back to the bus and the first of
    these two disappears. */
 const listed=recommendedBuses(fleet,onSheet).map(row=>row.bus.n);
 assert.ok(listed.includes("17555"),"on the sheet for one repair, still waiting on another");
 assert.equal(listed.includes("6304"),false,"the sheet is writing to that very record");
 /* LONGEST WAITING FIRST. The only question this board answers is what has been
    waiting on you, and alphabetical order answers nothing. */
 assert.deepEqual(listed,["6303","6301","6302","17555"]);
 /* Inside a bus too, so the card's lead repair is the one waiting longest. */
 assert.deepEqual(recommendedBuses(fleet,onSheet).find(row=>row.bus.n==="6302").defects.map(d=>d.issue),["Air leak","Misfire"]);

 /* THE TIMESTAMP CURTIS ASKED FOR: "there needs to be some type of timestamp
    for how long it's been recommended for the down sheet." The stamp was
    already being written and nothing had ever read it back. */
 const now=new Date("2026-09-10T00:00:00.000Z");
 assert.equal(recommendedMinutesElapsed(fleet[0].defects[0],now),180);
 /* null, never 0, when there is no usable time — a stamp from a device with a
    broken clock must not read as "just now". */
 assert.equal(recommendedMinutesElapsed({downSheetRecommendation:{by:"CJ"}},now),null);
 assert.equal(recommendedMinutesElapsed({},now),null);
 const {elapsedLong}=await import("../src/lib/shared/elapsed-label.ts");
 assert.equal(elapsedLong(180),"3H 0M");
 assert.equal(elapsedLong(60*24*4),"4D");
 assert.equal(elapsedLong(-5),"0M","a clock ahead of this one must not print a negative");

 /* NOTHING HERE IS OVERDUE, and that is a decision rather than an omission.
    Curtis: "that bus could be in that status for a while, which is fine." */
 const board=await readFile(new URL("../app/down-sheet/_components/recommended-board.tsx",import.meta.url),"utf8");
 assert.equal(/overdue/i.test(board.replace(/\/\*[\s\S]*?\*\//g,"")),false,"a recommendation is never late");
 /* Same board classes as the two above it — "same color and everything". */
 assert.match(board,/className=\{"mystery-board recommended-board"\+\(collapsed\?" collapsed":""\)\}/);
 assert.match(board,/className="deferred-card-actions"/,"and the same action buttons");
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 assert.match(css,/\.recommended-board \.mystery-head\{border-left:4px solid #0b64bd\}/);

 /* Third, under both, which is where Curtis put it. */
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.ok(page.indexOf("<MysteryBoard")<page.indexOf("<DeferredBoard"));
 assert.ok(page.indexOf("<DeferredBoard")<page.indexOf("<RecommendedBoard"));
});

test("unticking RECOMMEND FOR DOWN SHEET actually sticks",async()=>{
 /* A LIVE BUG, found by driving the button in a browser and reading the record
    back rather than by reading the code.

    setDownSheetRecommendation DELETES its key when the tick comes off, the same
    way setDefectWorkState does — and saveDefectLogRecord merges with
    `{...existing,...incoming}`, where a missing key cannot override the value
    `existing` still holds. So the recommendation came straight back on the next
    read, in the editor and on both surfaces that list recommendations.

    workStates had this exact bug, was found, and was fixed by pulling that one
    field out of the spread. Nobody checked whether anything else was deleted
    the same way. Two fields are; now both are rescued. */
 assert.equal("downSheetRecommendation" in setDownSheetRecommendation({id:"d"},false,"2026-09-10T00:00:00.000Z"),false,
  "the key is deleted, not set to undefined — which is why the spread cannot carry the removal");
 const sync=await readFile(new URL("../src/lib/defects/defect-log-sync.ts",import.meta.url),"utf8");
 assert.match(sync,/\{\.\.\.existing,\.\.\.incoming,workStates:incoming\.workStates,downSheetRecommendation:incoming\.downSheetRecommendation,/);

 /* THE GUARD THAT GENERALISES IT. Every field repair-catalog.ts deletes has to
    be named in that merge; a third one added later and forgotten is the same
    bug a third time. */
 const catalog=await readFile(new URL("../src/lib/defects/repair-catalog.ts",import.meta.url),"utf8");
 const deleted=[...catalog.matchAll(/delete next\.(\w+)/g)].map(match=>match[1]);
 assert.deepEqual([...new Set(deleted)].sort(),["downSheetRecommendation","workStates"]);
 for(const field of deleted)assert.ok(sync.includes(field+":incoming."+field),
  field+" is deleted by repair-catalog.ts, so saveDefectLogRecord must take it from the incoming record or the removal is lost");

 /* THE OTHER HALF OF THAT FIX, driven rather than read. Pulling a field out of
    the spread means a caller passing a PARTIAL patch would now wipe it instead
    of inheriting it. Every caller either passes a complete record built from
    the stored one, or mints a brand-new defect where there is nothing to
    inherit — both paths are exercised here, because the risk of this fix is
    the mirror image of the bug it fixes. */
 const {saveDefectLogRecord}=await import("../src/lib/defects/defect-log-sync.ts");
 const stamp={at:"2026-09-09T21:00:00.000Z",by:"CJ"};
 const fleet=[{id:"b",n:"6301",l:"bay-1",s:"defect",defects:[
  {id:"d1",category:"Brakes",issue:"Brake job",details:"",state:"open",operability:"service",downSheetRecommendation:stamp}]}];
 const kept=saveDefectLogRecord(fleet,[],"b",{...fleet[0].defects[0],details:"edited"},false,"2026-09-10T00:00:00.000Z");
 assert.deepEqual(kept.fleet[0].defects[0].downSheetRecommendation,stamp,
  "editing a record from a complete copy keeps the recommendation it already carried");
 const dropped=saveDefectLogRecord(fleet,[],"b",setDownSheetRecommendation(fleet[0].defects[0],false,"2026-09-10T00:00:00.000Z"),false,"2026-09-10T00:00:00.000Z");
 assert.equal(dropped.fleet[0].defects[0].downSheetRecommendation,undefined,
  "and unticking it actually removes it — the bug this whole test is about");
 /* A new defect cannot inherit a recommendation from a record that is not
    there. This is the scan-sweep path, which mints its own ids. */
 const minted=saveDefectLogRecord(fleet,[],"b",{id:"sweep-1",category:"Engine",issue:"Misfire",details:"",state:"open",operability:"service"},false,"2026-09-10T00:00:00.000Z");
 assert.equal(minted.fleet[0].defects.find(defect=>defect.id==="sweep-1").downSheetRecommendation,undefined);
 assert.deepEqual(minted.fleet[0].defects.find(defect=>defect.id==="d1").downSheetRecommendation,stamp,
  "and adding one defect must not disturb another's recommendation");
});

test("the recommended list can be answered from the board and from the quick filter",async()=>{
 /* Curtis: "I need quick remove or mark as fix actions just like on the down
    sheet, so I need that functionality when that list is brought up in quick
    filters." The Down Sheet's row actions are a tick that closes the entry out
    and a cross that takes the row off the sheet without touching the bus. */
 const {answerRecommendedBus}=await import("../src/lib/defects/recommended-actions.ts");
 const rec=at=>({at,by:"CJ"});
 const fleet=[{id:"b",n:"6302",l:"bay-2",s:"defect",defects:[
  {id:"d2",category:"Engine",issue:"Misfire",details:"",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-09T23:30:00.000Z")},
  {id:"d3",category:"Brakes",issue:"Air leak",details:"",state:"open",operability:"service",downSheetRecommendation:rec("2026-09-09T23:15:00.000Z")}]}];
 const defects=fleet[0].defects,now="2026-09-10T00:00:00.000Z";

 /* NOT FOR THE SHEET is a statement about the BUS, so every recommendation on
    it goes. Answering per defect under a bus heading is the bug that made the
    evening deferred prompt ask three times about one bus. */
 const dismissed=answerRecommendedBus(fleet,[],"b",defects,"dismiss",{now});
 assert.equal(dismissed.saved,2);
 const after=dismissed.fleet[0].defects;
 assert.equal(after.some(defect=>defect.downSheetRecommendation),false,"both recommendations are withdrawn");
 assert.deepEqual(after.map(defect=>defect.state),["open","open"],"and the repairs are still open — this is not a delete");

 /* PUT ON DOWN SHEET moves ONE repair, because the sheet allows a bus one
    active entry, and it needs no more: the bus being on the sheet drops every
    recommendation on it from the board on its own. */
 const escalated=answerRecommendedBus(fleet,[],"b",defects,"downsheet",{now});
 assert.equal(escalated.saved,1);
 assert.equal(escalated.downEntries.length,1);
 /* The longest-waiting repair is the one that goes, matching the row the
    foreman was reading. */
 assert.equal(escalated.downEntries[0].repair,"Air leak");
 /* AND IT DOES NOT CLEAR THE RECOMMENDATION. The stamp is the record of who
    asked for this; membership erasing it is what repair-catalog.ts refuses. */
 assert.ok(escalated.fleet[0].defects.every(defect=>defect.downSheetRecommendation),
  "putting a bus on the sheet must not erase who recommended it");

 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* The two buttons, on the row, in the Down Sheet's own order. */
 assert.match(page,/className="fix-recommended" onClick=\{\(\)=>markRecommendedFixed\(bus,recommendedDefects\)\}/);
 assert.match(page,/className="end-deferral" onClick=\{\(\)=>removeRecommendation\(bus,recommendedDefects\)\}/);
 assert.match(page,/RECOMMENDED "\+elapsedLong\(recommendedMinutes\)\+" AGO"/,"and the wait time Curtis asked for");
 /* ONE snapshot and ONE write per action, taken before anything moves —
    endDeferralForBus's rule, for the same reason: calling the single-record
    handler in a loop would snapshot an already-changed board. */
 for(const name of ["const markRecommendedFixed=","const removeRecommendation="]){
  const start=page.indexOf(name);
  assert.ok(start>0,name+" must exist");
  const body=page.slice(start,page.indexOf("\n };",start));
  assert.equal((body.match(/setUndoSnapshot/g)||[]).length,1,name+" takes exactly one undo snapshot");
  assert.equal((body.match(/persist\(/g)||[]).length,1,name+" writes once, at the end");
 }
 /* THE COUNTS ARE IN SYNC. The board excludes a bus already on the sheet and
    the drawer has to as well, or one feature prints two different numbers.
    Both go through recommendedRows rather than keeping a second copy. */
 assert.match(page,/const recommendedRowsForFleet=useMemo\(\(\)=>recommendedRows\(fleet,downEntries\),\[fleet,downEntries\]\)/);
 assert.match(page,/key==="down-sheet-recommended"\?recommendedCandidateIds/);
});

test("a bus that keeps coming back is counted, with every date kept",async()=>{
 /* Curtis: "if a person tries to re-submit something in defects, I want a tally
    of how many times with the date stamped as it does already. This way I know
    how many round trips a bus is making without the repair."

    The app already REFUSED the repeat — recentDefectDuplicate blocks a matching
    unresolved defect for five days and disables the save buttons — and counted
    nothing. The bus came back and there was nowhere for that to land. */
 const {normalizeReportAttempts,recordReportAttempt,reportAttemptCount,mergeReportAttempts,REPORT_ATTEMPT_DEBOUNCE_MS}=await import("../src/lib/defects/repair-catalog.ts");
 const base={id:"d1",category:"Brakes",issue:"Front brake pads",details:"",state:"open",operability:"service"};

 /* THE TALLY IS THE LIST, not a number. Four returns in one week and four
    across three months are different problems, and a count cannot tell them
    apart — which is exactly the judgement Curtis is making with it. */
 const once=recordReportAttempt(base,"2026-09-08T10:00:00.000Z","cj");
 assert.equal(reportAttemptCount(once),1);
 assert.deepEqual(once.reportAttempts,[{at:"2026-09-08T10:00:00.000Z",by:"CJ"}],"initials are stored as they are shown");
 const twice=recordReportAttempt(once,"2026-09-09T10:00:00.000Z","RM");
 assert.deepEqual(twice.reportAttempts.map(a=>a.by),["CJ","RM"]);

 /* A DOUBLE TAP IS NOT TWO ROUND TRIPS. A bus cannot leave and come back inside
    two minutes, so a second press that close is a thumb — and a number that
    inflates on a fumbled tap is worse than no number, because this one is meant
    to be evidence that a repair is not working. */
 const fumbled=recordReportAttempt(twice,"2026-09-09T10:00:30.000Z","RM");
 assert.equal(fumbled,twice,"the defect comes back untouched, so the caller writes nothing at all");
 const later=recordReportAttempt(twice,new Date(Date.parse("2026-09-09T10:00:00.000Z")+REPORT_ATTEMPT_DEBOUNCE_MS).toISOString(),"RM");
 assert.equal(reportAttemptCount(later),3,"and a real return just past the window counts");
 /* A record synced from a device whose clock runs fast holds a future stamp.
    That must not swallow every genuine return until the clock catches up. */
 const fromTheFuture=recordReportAttempt({...base,reportAttempts:[{at:"2027-01-01T00:00:00.000Z"}]},"2026-09-09T10:00:00.000Z","CJ");
 assert.equal(reportAttemptCount(fromTheFuture),2,"a stamp ahead of this one cannot block it");

 /* Read-time cleaning: junk out, duplicates collapsed, always oldest first. */
 assert.deepEqual(normalizeReportAttempts([{at:"2026-09-09T10:00:00.000Z"},{at:"2026-09-08T10:00:00.000Z"},{at:"2026-09-09T10:00:00.000Z"}]).map(a=>a.at),
  ["2026-09-08T10:00:00.000Z","2026-09-09T10:00:00.000Z"]);
 assert.deepEqual(normalizeReportAttempts(["nonsense",null,{at:""},{at:"not a date"},{}]),[]);
 assert.deepEqual(normalizeReportAttempts("not an array"),[]);

 /* NOTHING REMOVES A RETURN. A save can only ever add, because an editor opened
    before a return was stamped holds the older list and the merge spread would
    otherwise let that stale copy overwrite the stamp — losing a round trip
    nobody would ever notice was missing. */
 assert.deepEqual(mergeReportAttempts([{at:"2026-09-08T10:00:00.000Z"}],[{at:"2026-09-09T10:00:00.000Z"}]).map(a=>a.at),
  ["2026-09-08T10:00:00.000Z","2026-09-09T10:00:00.000Z"]);
 assert.deepEqual(mergeReportAttempts([{at:"2026-09-08T10:00:00.000Z"}],[]).map(a=>a.at),["2026-09-08T10:00:00.000Z"],"an empty incoming list cannot erase a stored one");

 const {saveDefectLogRecord}=await import("../src/lib/defects/defect-log-sync.ts");
 const fleet=[{id:"b",n:"6301",l:"bay-1",s:"defect",defects:[{...base,reportAttempts:[{at:"2026-09-08T10:00:00.000Z",by:"CJ"}]}]}];
 const stale=saveDefectLogRecord(fleet,[],"b",{...base,details:"edited"},false,"2026-09-10T00:00:00.000Z");
 assert.equal(reportAttemptCount(stale.fleet[0].defects[0]),1,
  "saving an editor draft that predates the stamp must not drop it");

 /* AND THE KEY STAYS ABSENT WHEN THERE IS NOTHING TO SAY. rowFingerprint walks
    Object.keys, so an empty array on every defect in the shop would change every
    row's fingerprint and re-push the whole table to say nothing — the same trap
    the fluids field was caught in. */
 const [plain]=normalizeDefects([{id:"plain",category:"Brakes",issue:"Front brake pads",details:"",state:"open",operability:"service"}]);
 assert.equal(Object.keys(plain).includes("reportAttempts"),false);
 const [carried]=normalizeDefects([{id:"c",category:"Brakes",issue:"Front brake pads",details:"",state:"open",operability:"service",reportAttempts:[{at:"2026-09-08T10:00:00.000Z"}]}]);
 assert.equal(reportAttemptCount(carried),1);

 /* A MERGE MUST NOT LOSE A ROUND TRIP either. Two copies of one repair coming
    back together have to keep every return between them — the tally can only
    ever grow, and a merge that quietly halved it would make the number evidence
    of nothing. Same union symptoms and fluids already get. */
 const {mergeDuplicateDefects}=await import("../src/lib/defects/duplicate-defects.ts");
 const dupes=mergeDuplicateDefects([{id:"b",n:"6301",l:"bay-1",s:"defect",defects:[
  {...base,id:"d1",details:"same",reportAttempts:[{at:"2026-09-08T10:00:00.000Z",by:"CJ"}],createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z"},
  {...base,id:"d2",details:"same",reportAttempts:[{at:"2026-09-09T10:00:00.000Z",by:"RM"},{at:"2026-09-08T10:00:00.000Z",by:"CJ"}],createdAt:"2026-09-02T00:00:00.000Z",updatedAt:"2026-09-02T00:00:00.000Z"},
 ]}],[],"2026-09-10T00:00:00.000Z");
 const survivors=dupes.buses[0].defects;
 assert.equal(survivors.length,1,"the two copies merged");
 assert.deepEqual(survivors[0].reportAttempts.map(attempt=>attempt.at),
  ["2026-09-08T10:00:00.000Z","2026-09-09T10:00:00.000Z"],
  "every return survives, and the one both copies held counts once");
});

test("counting a return must not take the bus off the Down Sheet",async()=>{
 /* THE TRAP IN THE OBVIOUS REUSE. saveDefectLogRecord is how everything else on
    this page writes a defect, and it is the wrong tool here twice over: it
    REFUSES the save as a recent duplicate — which is the very state being
    recorded — and saving with onDownSheet:false closes out the bus's Down Sheet
    entry. Counting that a bus came back would have quietly taken it off the
    sheet, which is exactly backwards.

    So countReturn writes the one field on the one defect, the way saveShopNotes
    writes a note. Driven in a browser as well: the sheet entry read
    "6301:Scheduled" before and after three presses. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const start=page.indexOf("const countReturn=");
 assert.ok(start>0,"the handler must exist");
 const body=page.slice(start,page.indexOf("\n };",start));
 assert.equal(body.includes("saveDefectLogRecord"),false,
  "counting a return must not go through the save path that closes Down Sheet entries");
 assert.match(body,/persist\(nextFleet,downEntries\)/,"the Down Sheet entries are passed through untouched");
 /* The stamp goes on the STORED defect, not the copy the banner is holding, so
    a form left open cannot write back a tally it read before somebody added to
    it. */
 /* The stamp still goes on the STORED defect rather than the copy the banner
    is holding, but the logic moved to src/lib/defects/report-returns.ts so a
    test could execute it -- four mutations of the old in-page handler passed
    the suite. applyReportReturn re-reads the defect out of the fleet it is
    given, which is what "the stored one" means here, and its own test proves
    it touches that defect and no other. */
 assert.match(body,/applyReportReturn\(fleet,busId,defect\.id,new Date\(\)\.toISOString\(\),settings\.defaultInitials\)/);
 /* A press the debounce refused writes nothing and takes no undo snapshot — an
    UNDO offering to reverse a change nobody made is worse than the fumbled tap. */
 /* THE RULE, not the statement. A press the debounce refused must not write
    the board and must not take an undo snapshot -- and this has now been
    pinned to three different spellings of the same line across three commits,
    so it is matched on what it does. An earlier version compared
    indexOf("if(!counted)return;"), which returns -1 once the spelling moves,
    and -1 is less than any real index: it passed for the wrong reason rather
    than failing. */
 const guardAt=body.search(/if\(!result\.counted\)return result;/);
 assert.ok(guardAt>=0,"a refused press returns before anything is written");
 assert.ok(guardAt<body.indexOf("persist("),"and before the write");
 assert.ok(guardAt<body.indexOf("setUndoSnapshot"),"and before the snapshot");

 /* THE BUTTON IS DELIBERATE, NOT AUTOMATIC. Counting the moment the ALREADY
    LOGGED banner appears would count a foreman scrolling the picker and every
    re-render. One press, one return. */
 /* The button still counts the return on the duplicate the banner is about.
    It now also records what happened so the banner can say so, which the old
    exact-shape pin could not survive. */
 /* The button still counts the return on the duplicate the banner is about,
    and records which of the four outcomes happened so the banner can say it.
    Matched on the call, not on the whole handler body, which has now been
    re-pinned three times for no behavioural reason. */
 assert.match(page,/className="count-return" onClick=\{\(\)=>\{const result=countReturn\(value\.busId,recentDuplicate\);/);
 /* And the banner still refuses the duplicate — this adds a way to record the
    return, it does not re-open the door to a second record. */
 assert.match(page,/<button type="submit" className="save-log-middle" disabled=\{Boolean\(recentDuplicate\)\}/);
});

test("one location table, not five",async()=>{
 /* There were five, and they had already drifted — Fixed Repairs had no OFF
    PROPERTY entry and the share export's SHOP WALL prefix was missing its
    hyphen. Every one of them prefix-matched "garage-", which is the bug above.

    This checks those five specifically. It is NOT a guarantee that no sixth
    location-to-text mapper exists — two others do, and both are fine because
    they resolve through sectionForLocation first and speak in AREA names
    rather than labels: movedFromLabel in app/page.tsx and areaLabel in
    app/operator-engine.ts. Both were read and both name the trouble bays
    correctly. The claim here is the narrow one the assertions actually make. */
 const files=["../src/lib/defects/defect-log-sync.ts","../src/components/down-sheet/mystery-board.tsx","../src/components/shared/deferred-watch.tsx","../app/fixed-repairs/page.tsx","../src/lib/defects/quick-filter-share.ts"];
 for(const file of files){
  const source=await readFile(new URL(file,import.meta.url),"utf8");
  assert.equal(source.includes('["garage-","Main Garage"]'),false,file+" no longer carries its own prefix table");
  assert.match(source,/from "(?:[^"]*\/)location-label/,file+" reads the shared one");
 }
 const shared=await readFile(new URL("../src/lib/fleet/location-label.ts",import.meta.url),"utf8");
 /* And in the one copy, the areas are consulted BEFORE the prefixes. Reverse
    those two and "garage-11" answers Main Garage again. */
 assert.ok(shared.indexOf("SLOT_LABELS.get(at)")<shared.indexOf("PREFIX_LABELS.find"));
});

test("the window narrows the shared list, not just the drawn one",async()=>{
 /* Curtis asked for this so he could send part of a list: "if I don't want to
    send that whole list to somebody." A filter that tidies the screen and then
    pastes all twenty is worse than no filter — it lies at the only moment that
    matters. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* Every share path builds from quickFilterBuses, which is the narrowed list,
    and none from quickFilterAllBuses. */
 assert.match(page,/quickFilterShareText\(quickFilterShareLabel,quickFilterBuses,quickFilter,quickFilterShareOptions\)/);
 assert.match(page,/quickFilterShareHtml\(quickFilterShareLabel,quickFilterBuses,quickFilter,stamp,quickFilterShareOptions\)/);
 assert.equal(/quickFilterShareText\(\w+,quickFilterAllBuses/.test(page),false);
 /* And the heading says which window, so somebody who cannot see the screen it
    came off is not reading six buses as the total. */
 assert.match(page,/quickFilterShareLabel=quickFilterOwnedLabel\+\(quickFilterWindowed&&timeWindowLabel\(quickFilterWindow,shiftWindowText\)/);
 /* The three lists that carry a window. The first two accumulate decisions —
    Curtis: "only as it relates to these two fields" — and LOGGED was added
    beside them because its whole question is when. */
 assert.match(page,/quickFilterWindowed=quickFilter==="deferred"\|\|quickFilter==="down-sheet-recommended"\|\|quickFilter==="logged"/);
 /* Reset on open, and never written to storage — a window restored from
    yesterday would open the drawer already hiding buses.

    TWO ENTRY POINTS, AND ONE OF THEM NOW CARRIES A SPAN IN ON PURPOSE. The
    event/URL route still resets to ALL outright. The menu route resets every
    filter to ALL except LOGGED, which opens on the span its own drop-down is
    quoting a count over — the whole point of that control being that the number
    on the row is the number of rows behind it. Both still land in the same
    place for LOGGED, because the effect below lifts ALL to that same span; the
    menu route simply gets there without a second render. Neither is persisted,
    which is what the chips assertion underneath guards. */
 assert.equal(page.split('setQuickFilterWindow("all")').length-1,1,"the event route resets outright");
 assert.match(page,/setQuickFilterWindow\(value==="logged"\?loggedCountWindow:"all"\)/,
  "the menu route resets every other filter and seeds LOGGED from its drop-down");
 const chips=await readFile(new URL("../src/components/shared/time-window-chips.tsx",import.meta.url),"utf8");
 assert.equal(/localStorage|STORAGE_KEY/.test(chips),false,"the window is not persisted");
 /* The count of what is held back is on screen AND is the button that clears
    it — a narrowed list that looks like the whole list is the only failure
    this control can cause. It does not call those rows OLD: a row with no
    stamp is held back by every narrowed window too, and it has no age. */
 assert.match(chips,/\{hidden\} HIDDEN · SHOW ALL/);
 /* The comment above it in that file explains the wording, so match the
    rendered string rather than the phrase anywhere in the source. */
 assert.equal(/\{hidden\} OLDER HIDDEN/.test(chips),false);
 assert.match(chips,/className="time-window-hidden" onClick=\{\(\)=>onChange\("all"\)\}/);
});

test("one undated deferral cannot make a six-day-old bus disappear",async()=>{
 /* Found by review, reproduced in a browser: sorting on deferredAt and taking
    the first put "" ahead of every ISO stamp, so a bus carrying one undated
    deferral beside dated ones read as undated — and an undated row falls out
    of every narrowed window. A bus held six days vanished under 7D and was
    counted as "1 HIDDEN". The wrong direction for a list of buses nobody has
    ruled on. */
 const {busDeferredMinutes}=await import("../src/lib/defects/deferred-counts.ts");
 const {withinTimeWindow}=await import("../src/lib/shared/time-window.ts");
 const now=new Date("2026-09-10T12:00:00.000Z");
 const at=hours=>new Date(now.getTime()-hours*3600000).toISOString();
 const deferred=deferredAt=>({id:"d"+deferredAt,state:"deferred",deferredAt});
 const sixDays=deferred(at(144)),undated={id:"d-none",state:"deferred",deferredAt:""};
 /* The undated one sorts first and must not decide. */
 assert.equal(Math.round(busDeferredMinutes([undated,sixDays],now)),144*60);
 assert.equal(Math.round(busDeferredMinutes([sixDays,undated],now)),144*60);
 assert.equal(withinTimeWindow(busDeferredMinutes([undated,sixDays],now),"7d"),true);
 /* The longest hold wins, not the newest — a bus standing since Monday does
    not become recent because a second repair was deferred on it today. */
 assert.equal(Math.round(busDeferredMinutes([deferred(at(1)),deferred(at(30))],now)),30*60);
 /* A bus with nothing dated at all still has no age, and still shows under ALL. */
 assert.equal(busDeferredMinutes([undated],now),null);
 assert.equal(withinTimeWindow(busDeferredMinutes([undated],now),"all"),true);
 /* And the two surfaces that draw this list read it from here rather than
    each working it out — they disagreed before, which is the whole point. */
 const board=await readFile(new URL("../app/down-sheet/_components/deferred-board.tsx",import.meta.url),"utf8");
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 for(const [name,source] of [["the board",board],["the quick filter",page]]){
  assert.match(source,/busDeferredMinutes\(/,name+" reads the shared rule");
  assert.equal(/localeCompare\(String\(b\.deferredAt/.test(source),false,name+" no longer sorts on a blank stamp");
 }
});

test("the three view options default to off and survive a bad settings blob",async()=>{
 /* Curtis: "I might not like it, but I just wanna make sure we can roll back at
    any point." Off by default is what makes that true — a device that updates
    looks exactly as it did. */
 const {DEFAULT_SETTINGS,readSettings,normalizeViewScope,VIEW_SCOPES}=await import("../src/lib/defects/defect-log-settings.ts");
 for(const key of ["busRail","busBlueOnly","busEndMarker"]){
  assert.equal(DEFAULT_SETTINGS[key],"off",key+" ships off");
  assert.equal(readSettings(null)[key],"off");
  assert.equal(readSettings(JSON.stringify({[key]:"always"}))[key],"always");
  assert.equal(readSettings(JSON.stringify({[key]:"phone"}))[key],"phone");
  /* A settings blob is a file somebody can hand-edit and a transfer can carry
     between devices, so anything else reads as off rather than as itself. */
  assert.equal(readSettings(JSON.stringify({[key]:"ALWAYS"}))[key],"off");
  assert.equal(readSettings(JSON.stringify({[key]:true}))[key],"off");
 }
 assert.equal(normalizeViewScope(undefined),"off");
 assert.deepEqual(VIEW_SCOPES.map(scope=>scope.key),["off","phone","always"]);
});

test("a chosen Repair Title color still wins when blue is locked to the bus",async()=>{
 /* --log-repair-category-color is ALWAYS written from the settings blob, so
    var(--log-repair-category-color, quiet) can never reach its fallback — the
    first version of this changed nothing at all and measured rgb(11,100,189),
    unchanged. A second variable is emitted only when the stored color differs
    from the shipped default: undefined means nobody chose. */
 /* This started life as a SECOND variable, --log-repair-category-chosen,
    because --log-repair-category-color was emitted unconditionally and so
    could never reach a fallback. Chasing that turned up the far larger bug
    behind it — none of the theme fallbacks in the stylesheet had ever fired —
    and once displayStyleVars omitted every unchosen colour, the plain variable
    did the job and the extra one was retired. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const {displayStyleVars,DEFAULT_DEFECT_LOG_DISPLAY,normalizeDefectLogDisplay}=await import("../src/lib/defects/defect-log-display-settings.ts");
 assert.equal(displayStyleVars(DEFAULT_DEFECT_LOG_DISPLAY,"dark")["--log-repair-category-color"],undefined,"unchosen: the quiet fallback answers");
 assert.equal(displayStyleVars(normalizeDefectLogDisplay({styles:{repairCategory:{color:"#c3262f",fontSize:9}}}),"dark")["--log-repair-category-color"],"#c3262f","chosen: their colour wins");
 assert.equal(/"--log-repair-category-chosen"/.test(page),false,"the workaround variable is no longer emitted");
 const css2=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.equal(css2.includes("var(--log-repair-category-chosen"),false,"and nothing reads it");
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* The repair heading and the focus view's record head share one declaration
    now, so the assertion matches the selector list rather than the old
    single-selector rule. */
 assert.match(css,/data-bus-blue="always"\] \.log-repair>b,\n\.defect-log-app\[data-bus-blue="always"\] \.log-focus-record-head>b\{color:var\(--log-repair-category-color,/);
 for(const scope of ["always","phone"]){
  /* VIEW/CLOSE needs !important because .group-toggle already declares
     color:var(--log-accent)!important — no specificity reaches that, and
     without it the option measured rgb(11,100,189) on and off, all themes. */
  assert.match(css,new RegExp('data-bus-blue="'+scope+'"\\] \\.log-meta>\\.group-toggle\\{color:[^}]*!important\\}'),scope+" reaches VIEW/CLOSE");
  /* The numbered disc is an accent BACKGROUND — three blue circles on an
     opened three-defect bus under a setting that says blue is the bus. */
  /* --log-header, not a mix toward --log-text: this is a BACKGROUND behind
     near-white text, so it must go dark on every theme, and a mix toward the
     text colour goes dark on the light theme and LIGHT on the three dark ones.
     At 62% it took the light theme's disc text from 5.88:1 to 4.23:1.
     Measured with --log-header: 16.54 / 20.04 / 19.83 / 14.61. */
  assert.match(css,new RegExp('data-bus-blue="'+scope+'"\\] \\.grouped-defect-number\\{background:var\\(--log-header\\)\\}'),scope+" quietens the disc without dimming its text");
  /* The BUS heading over an opened list is NOT quietened: it was never blue,
     and it is the one other place the bus is named. */
  assert.equal(new RegExp('data-bus-blue="'+scope+'"\\] \\.grouped-defect-head').test(css),false,scope+" leaves the BUS heading alone");
 }
 /* FOCUS at 62% measured 4.23:1 on the light theme's white — under AA on 8px
    900-weight uppercase, which gets no large-text exemption. 78% is 5.85:1. */
 assert.match(css,/data-bus-blue="always"\] \.log-card-group>\.log-focus-button\{color:color-mix\(in srgb,var\(--log-text\) 78%/);
 /* Nothing in this option uses the 62% mix any more; it failed AA once as a
    foreground and once as a background, in opposite directions. */
 assert.equal(/data-bus-blue[^}]*62%/.test(css),false);
});

test("a text colour nobody picked follows the theme, so the dark themes are readable",async()=>{
 /* Every rule in defect-log.css that reads one of these already had a
    theme-aware fallback — var(--log-repair-category-color,var(--log-accent))
    and so on — and not one had ever fired, because the page defined all seven
    variables from the settings blob whether or not anybody chose them, and the
    shipped values are light-theme hex. Measured on the Defect Log at 1180px,
    contrast against the effective background, nothing customised:

                   light   dark   midnight  tactical
      feed title   10.77   1.49   1.50      1.05
      repair text  11.80   1.07   1.08      1.57
      category      4.92   2.24   2.21      1.52

    1.05:1 is the background. The defect text was invisible on three themes. */
 const {displayStyleVars,followsTheme,DEFAULT_DEFECT_LOG_DISPLAY,normalizeDefectLogDisplay}=await import("../src/lib/defects/defect-log-display-settings.ts");
 const untouched=DEFAULT_DEFECT_LOG_DISPLAY;
 for(const theme of ["dark","midnight","tactical","custom"]){
  const vars=displayStyleVars(untouched,theme);
  assert.deepEqual(Object.keys(vars).filter(name=>name.endsWith("-color")),[],theme+" defers every unchosen colour to the theme");
  /* Sizes are NOT theme-dependent and must still be emitted. */
  assert.equal(Object.keys(vars).filter(name=>name.endsWith("-size")).length,7,theme+" still carries the sizes");
 }
 /* LIGHT KEEPS THE SIX THAT ARE DRAWN ON WHITE. They are light-theme colours
    picked by hand for this app — LIVE REPAIR FEED's #163c70 is a deeper navy
    than the accent on purpose. Deferring on light too swapped it for the
    accent and dropped it from 10.77:1 to 5.77:1: legible, and a change nobody
    asked for on the theme almost everybody uses.

    pageTitle IS THE SEVENTH AND IT IS NOT DRAWN ON WHITE — it sits on the
    header, and its #ffffff was the header's colour back when every header was
    navy. Emitted on light like the other six it pinned the page title white
    over whatever colour somebody picks in Settings: measured 1.35:1 on a pale
    yellow header, beside a panel promising a light colour cannot hide the
    title. Left out while untouched, the header's own computed text colour
    answers. */
 const lightColours=Object.keys(displayStyleVars(untouched,"light")).filter(name=>name.endsWith("-color"));
 assert.equal(lightColours.length,6);
 assert.equal(lightColours.includes("--log-page-title-color"),false,"the page title defers to the header on light too");
 /* A title somebody HAS chosen is still emitted, on light like anywhere. */
 const titled=normalizeDefectLogDisplay({styles:{pageTitle:{color:"#ffd400",fontSize:25}}});
 for(const theme of ["light","dark","midnight","tactical","custom"])
  assert.equal(displayStyleVars(titled,theme)["--log-page-title-color"],"#ffd400",theme+" keeps a chosen page title colour");
 /* A REAL CHOICE STILL WINS, on every theme. */
 const chosen=normalizeDefectLogDisplay({styles:{repairCategory:{color:"#c3262f",fontSize:9}}});
 for(const theme of ["light","dark","midnight","tactical","custom"])
  assert.equal(displayStyleVars(chosen,theme)["--log-repair-category-color"],"#c3262f",theme+" keeps a chosen colour");
 /* Case-insensitive, since a hand-edited blob or another device may store the
    same colour in capitals. */
 assert.equal(followsTheme("repairCategory","#0B64BD"),true);
 assert.equal(followsTheme("repairCategory","#c3262f"),false);
});

test("the emitted variable names are the ones the stylesheets actually read",async()=>{
 /* Derived from the CSS rather than listed here: this is a loop building
    property names out of camelCase keys, and a key renamed on one side only
    would silently stop styling anything. */
 const {displayStyleVars,DEFAULT_DEFECT_LOG_DISPLAY}=await import("../src/lib/defects/defect-log-display-settings.ts");
 const emitted=Object.keys(displayStyleVars(DEFAULT_DEFECT_LOG_DISPLAY,"light"));
 const css=(await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"))
  +(await readFile(new URL("../app/globals.css",import.meta.url),"utf8"));
 for(const name of emitted)
  assert.ok(css.includes("var("+name+","),name+" is read by a rule, with a fallback behind it");
 /* And the page hands them over wholesale rather than restating the list — the
    hand-written version is what drifted from the fallbacks in the first place. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/\.\.\.displayStyleVars\(settings\.display,settings\.theme\)/);
 for(const name of emitted)
  assert.equal(page.includes('"'+name+'"'),false,page+" no longer names "+name+" by hand");
});

test("Settings says which colours are following the theme",async()=>{
 /* The swatch beside a following colour is showing a colour the screen is NOT
    using. Saying so is the difference between a sensible default and a control
    that lies — and the button pins it back the other way. */
 const modal=await readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8");
 assert.match(modal,/FOLLOWING THEME/);
 assert.match(modal,/followsTheme\(key,settings\.display\.styles\[key\]\.color\)/);
 /* FOLLOW THEME sets the colour back to the shipped default, which IS the
    "no choice made" value — not a separate sentinel that would need its own
    validation on read. */
 assert.match(modal,/className="log-style-follow" onClick=\{\(\)=>setDisplayStyle\(key,"color",DEFAULT_DEFECT_LOG_DISPLAY\.styles\[key\]\.color\)\}/);
 assert.match(modal,/\{!themed&&<button type="button" className="log-style-follow"/,"offered only where there is something to undo");
});

test("LOGGED is the third snapshot: open work written down inside the window",async()=>{
 /* Curtis, back from vacation with two buses down and no way to send just
    those: "if I pull those reports and I try to give a snapshot it's gonna give
    me all the other buses from the other days that I don't want ... I just need
    a snapshot of things that are deferred, recommended for the down sheet, or
    any defects that I logged" — for the shift he is on. The first two lists
    already had the window chips. This is the one that did not exist. */
 const {QUICK_FILTERS,quickFilterDefects,quickFilterMatch,quickFilterBusIds,quickFilterFallbackLabel,busLoggedMinutes}=
  await import("../src/lib/defects/quick-filters.ts");
 const {loggedMinutesElapsed}=await import("../src/lib/defects/repair-catalog.ts");
 const {quickFilterShareText}=await import("../src/lib/defects/quick-filter-share.ts");

 const now="2026-09-14T18:00:00.000Z";
 const ago=minutes=>new Date(Date.parse(now)-minutes*60000).toISOString();
 const defect=(id,issue,createdAt,extra={})=>({id,category:"Brakes",issue,details:"",operability:"service",state:"open",createdAt,...extra});
 /* 14:00 Chicago is 19:00Z in September, so "this shift" for a 2nd-shift
    foreman reading this at 18:00Z is not a clean four hours — the window is
    passed in as minutes precisely so this module never has to know that. */
 const thisShift=defect("fresh","Brakes sticking / dragging",ago(40));
 const earlierToday=defect("earlier","Brake chamber leaking",ago(600));
 const fixedThisShift=defect("fixed","No horn",ago(20),{state:"completed",completedAt:ago(10)});
 const undated=defect("undated","Air leak","");
 const bus={id:"a",n:"17566",l:"garage-12",defects:[thisShift,earlierToday,fixedThisShift,undated]};

 /* ONLY OPEN WORK. Curtis: "anything fixed, I don't need a record of that." A
    defect logged and closed on the same shift is a thing that happened, not a
    thing to hand over. */
 assert.equal(quickFilterDefects(bus,"logged",now).some(item=>item.id==="fixed"),false,"a repair finished this shift is not a handover");
 /* WITH NO WINDOW it is every open defect, newest first — which is why the
    drawer opens it on SHIFT rather than ALL. */
 assert.deepEqual(quickFilterDefects(bus,"logged",now).map(item=>item.id),["fresh","earlier","undated"],"newest first, undated last");
 /* THE WINDOW REACHES THE LINES, not only the bus. A bus picked for something
    logged 40 minutes ago that then printed this morning's defect underneath it
    would put the exact rows he is trying not to send into the snapshot. */
 assert.deepEqual(quickFilterDefects(bus,"logged",now,{maxAgeMinutes:120}).map(item=>item.id),["fresh"]);
 assert.equal(quickFilterDefects(bus,"logged",now,{maxAgeMinutes:30}).length,0,"nothing inside half an hour");
 assert.equal(quickFilterDefects(bus,"logged",now,{maxAgeMinutes:0}).length,0,"zero minutes is a real limit, not 'no window'");

 /* THE BUS'S OWN AGE IS THE NEWEST STAMP — the opposite reduction to the two
    lists beside it, where the oldest unresolved thing is the complaint. A bus
    logged 40 minutes ago must not be dropped because it also carries this
    morning's work. */
 assert.equal(Math.round(busLoggedMinutes(quickFilterDefects(bus,"logged",now),new Date(now))),40);
 assert.equal(busLoggedMinutes([undated],new Date(now)),null,"nothing dated at all has no age");
 /* createdAt ONLY, never falling back to updatedAt. An edit is not a landing: a
    defect written last Monday and re-worded tonight must not walk into
    tonight's list. The fallback has to be tested on a record with NO createdAt,
    which is the only input that tells the two spellings apart — the first
    version of this assertion used a dated defect and passed either way. */
 assert.equal(loggedMinutesElapsed({...undated,updatedAt:ago(1)},new Date(now)),null,"a fresh edit on an undated defect is still no age");
 assert.equal(loggedMinutesElapsed({...earlierToday,updatedAt:ago(1)},new Date(now)),600,"and an edit does not make a dated one recent");
 /* Through the filter, not only the helper: such a bus stays out of a narrowed
    window however recently it was touched. */
 assert.equal(quickFilterDefects({id:"d",n:"17502",defects:[{...undated,updatedAt:ago(1)}]},"logged",now,{maxAgeMinutes:120}).length,0);

 /* A bus with only finished work is not in the list at all. */
 assert.equal(quickFilterMatch({id:"b",n:"17500",defects:[fixedThisShift]},"logged",now),false);
 /* THE LEGACY FREE-TEXT REPAIR IS AN UNDATED OPEN DEFECT, and behaves like
    every other undated row rather than getting a special case: it is in the
    list that promises nothing and out of the ones that promise something.
    Measured, not assumed — the first version of this assertion claimed the
    string could never reach the filter at all, and it can. */
 const legacy={id:"c",n:"17501",pendingRepair:"needs oil"};
 assert.deepEqual(quickFilterBusIds([bus,legacy],"logged",now),["a","c"],"shown under ALL");
 assert.equal(quickFilterDefects(legacy,"logged",now)[0].createdAt,undefined,"because it carries no date");
 assert.equal(quickFilterDefects(legacy,"logged",now,{maxAgeMinutes:120}).length,0,"and is held back by any window");

 /* THE SHARED TEXT CARRIES THE SAME WINDOW. Without the options the heading and
    the body disagree, and the heading is the only part a reader can check. */
 const shared=quickFilterShareText("Defects Logged (2ND SHIFT · SINCE 14:00)",[bus],"logged",{now,maxAgeMinutes:120});
 assert.match(shared,/^Defects Logged \(2ND SHIFT · SINCE 14:00\) — 1 bus/,"the window names the boundary in the heading");
 assert.match(shared,/Brakes sticking/);
 assert.equal(/Brake chamber leaking/.test(shared),false,"this morning's defect is not in a this-shift snapshot");
 assert.equal(/No horn/.test(shared),false,"and neither is the one that got fixed");

 /* It is a real filter entry, so the drawer's COPY LIST, SHARE and SHARE PAGE
    come with it for free. */
 const entry=QUICK_FILTERS.find(item=>item.key==="logged");
 /* "Defects Logged", not "Defects Logged (Still Open)": the window arrives in
    the shared heading inside its own brackets, and the first wording made that
    read "Defects Logged (Still Open) (2ND SHIFT · SINCE 14:00)". Measured by
    copying a real list out of the drawer, not spotted in the source. */
 assert.equal(entry.label,"Defects Logged");
 assert.equal(/\(.*\(/.test(entry.label+" (2ND SHIFT · SINCE 14:00)"),false,"one set of brackets in a shared heading");
 assert.equal(entry.shortLabel,"Logged");
 assert.equal(quickFilterFallbackLabel("logged"),"Open defect logged in this window");
});

test("the drawer resolves the shift itself, and only offers the chip when it did",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* The boundary comes from the one clock the Down Sheet and the forecast use,
    so SHIFT means the same thing on all three — including the handover rule
    that gives 14:00 onward to the incoming crew. */
 assert.match(page,/const shiftNow=activeShift\(new Date\(\),shiftSettings\)/);
 assert.match(page,/readShiftSettings\(localStorage\)/,"the device's own edited hours, not just the defaults");
 assert.match(page,/shiftWindowText=shiftNow\?shiftLabel\(shiftNow\.key\)\+" · SINCE "\+shiftNow\.start/);
 /* The chip is offered only where a shift resolved. Both halves asserted: the
    opt-in list when it did, the plain row when it did not. */
 assert.match(page,/quickFilterWindowChoices=shiftNow\?TIME_WINDOWS_WITH_SHIFT:TIME_WINDOWS/);
 assert.match(page,/windows=\{quickFilterWindowChoices\}/);
 /* The resolved limit reaches the filter, or SHIFT would read as ALL. */
 assert.match(page,/withinTimeWindow\(quickFilterAgeMinutes\(bus\),quickFilterWindow,shiftWindowMinutes\)/);
 /* LOGGED opens on the span its own drop-down is quoting, which starts at THIS
    SHIFT; on ALL it is every bus in the fleet with an open defect, which is the
    opposite of a handover list. The literal "shift" that used to sit here moved
    into `loggedCountWindow`'s initial value, so the drawer and the count on the
    row it was opened from can no longer answer different questions. */
 assert.match(page,/if\(quickFilter==="logged"&&shiftResolved\)setQuickFilterWindow\(current=>current==="all"\?loggedCountWindow:current\)/);
 assert.match(page,/const \[loggedCountWindow,setLoggedCountWindow\]=useState<TimeWindowKey>\("shift"\)/,
  "and it still starts on THIS SHIFT, which is where the drawer already opened");
 /* And the line window is LOGGED's alone — the other filters answer "what is
    true now", where the age of the record is not the question. */
 assert.match(page,/quickFilterLineMaxAge=quickFilter!=="logged"\|\|quickFilterWindow==="all"\?null:quickFilterWindow==="shift"\?shiftWindowMinutes:timeWindowMinutes\(quickFilterWindow\)/);

 /* The two Down Sheet boards cannot draw the shift chip: they pass no window
    list, so they get the rolling spans they already had. */
 for(const file of ["deferred-board","recommended-board"]){
  const board=await readFile(new URL("../app/down-sheet/_components/"+file+".tsx",import.meta.url),"utf8");
  assert.equal(/windows=\{/.test(board),false,file+" keeps the row it had");
  assert.equal(/TIME_WINDOWS_WITH_SHIFT/.test(board),false,file+" cannot offer a shift it never resolved");
 }
});

test("LOGGED keys off the device's initials, and says so when it has none",async()=>{
 /* Curtis: "key off initials so we don't have the multiple day issues." The
    shift window answers WHEN; this answers WHOSE, and together they are the
    sentence he actually said — "any defects that I logged". */
 const {quickFilterDefects,quickFilterBusIds}=await import("../src/lib/defects/quick-filters.ts");
 const {quickFilterShareText}=await import("../src/lib/defects/quick-filter-share.ts");
 const now="2026-09-14T18:00:00.000Z";
 const ago=minutes=>new Date(Date.parse(now)-minutes*60000).toISOString();
 const defect=(id,issue,minutesAgo,reportedBy)=>({id,category:"Brakes",issue,details:"",
  operability:"service",state:"open",createdAt:ago(minutesAgo),reportedBy});
 const mine=defect("mine","Brakes sticking / dragging",20,"CJ");
 const theirs=defect("theirs","Brake chamber leaking",25,"RM");
 /* A hand-logged defect is upper-cased on save, but one read off a photographed
    sheet carries whatever the paper said, raw — so the match has to case-fold.
    sweep-scan-import.ts stores `finding.initial` without touching it. */
 const mineLowercase=defect("mine-scan","Air leak",30,"cj");
 const nobodys=defect("nobodys","No horn",35,"");
 const bus={id:"a",n:"17566",l:"garage-12",defects:[mine,theirs,mineLowercase,nobodys]};

 assert.deepEqual(quickFilterDefects(bus,"logged",now,{initials:"CJ"}).map(item=>item.id),["mine","mine-scan"],"his own, however the initial was cased, newest first");
 assert.deepEqual(quickFilterDefects(bus,"logged",now,{initials:"RM"}).map(item=>item.id),["theirs"]);
 /* A blank reportedBy is nobody's, so it is in no named person's list. */
 assert.equal(quickFilterDefects(bus,"logged",now,{initials:"CJ"}).some(item=>item.id==="nobodys"),false);

 /* NO INITIALS MEANS NO PERSON FILTER — not a match against "" that returns
    nothing. `defaultInitials` ships EMPTY, so the hard-match version of this
    would hand an un-set-up device an empty list on every shift, which reads as
    "nothing happened" rather than "this is not configured". */
 assert.equal(quickFilterDefects(bus,"logged",now,{initials:""}).length,4,"everyone, including the unattributed one");
 assert.equal(quickFilterDefects(bus,"logged",now).length,4,"and the same with no narrow passed at all");

 /* WHOSE AND WHEN COMPOSE. CJ's work in the last 22 minutes is one row, not
    his two and not everybody's three. */
 assert.deepEqual(quickFilterDefects(bus,"logged",now,{initials:"CJ",maxAgeMinutes:22}).map(item=>item.id),["mine"]);
 assert.deepEqual(quickFilterDefects(bus,"logged",now,{maxAgeMinutes:22}).map(item=>item.id),["mine"],"without initials the window still stands alone");

 /* The bus list narrows too, so the count on the chip is the count of HIS work
    rather than the fleet's. */
 const hers={id:"b",n:"17570",defects:[theirs]};
 assert.deepEqual(quickFilterBusIds([bus,hers],"logged",now,{initials:"CJ"}),["a"]);
 assert.deepEqual(quickFilterBusIds([bus,hers],"logged",now,{initials:""}),["a","b"]);

 /* THE SHARED LIST OBEYS IT. A list headed "Defects Logged by CJ" that prints
    RM's report is wrong in the one direction a pasted list cannot afford —
    somebody acts on it without being able to check. */
 const shared=quickFilterShareText("Defects Logged by CJ (2ND SHIFT · SINCE 14:00)",[bus],"logged",{now,initials:"CJ",maxAgeMinutes:240});
 assert.match(shared,/Brakes sticking/);
 assert.match(shared,/Air leak/);
 assert.equal(/Brake chamber leaking/.test(shared),false,"RM's report is not in CJ's snapshot");
 assert.equal(/No horn/.test(shared),false,"and neither is the unattributed one");
});

test("the drawer names whose list it is, and admits when it is not filtering by person",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* The device's own initials — the same value stamped onto anything logged
    here, so the list and the stamp cannot mean different people. */
 assert.match(page,/myInitials=\(settings\.defaultInitials\|\|""\)\.trim\(\)\.toUpperCase\(\)/);
 assert.match(page,/loggedNarrow=\{initials:myInitials\}/);
 /* It reaches the counts, the ages, the drawn list and the share. */
 assert.match(page,/quickFilterBusIds\(fleet,key,new Date\(\)\.toISOString\(\),key==="logged"\?loggedNarrow:\{\}\)/);
 assert.match(page,/quickFilterDefects\(bus,"logged",new Date\(\)\.toISOString\(\),loggedNarrow\)/);
 assert.match(page,/initials:quickFilter==="logged"\?myInitials:""/);
 /* THE HEADING NAMES THE PERSON, and drops the name when there is none —
    never claim a narrowing that is not being applied. */
 assert.match(page,/quickFilterOwnedLabel=quickFilter==="logged"&&myInitials\?quickFilterLabel\+" by "\+myInitials:quickFilterLabel/);
 /* AND IT SAYS SO OUT LOUD. The alternative is a list that looks like "mine"
    while showing everyone's, which is the failure mode the window chips
    already carry a HIDDEN count to prevent. */
 assert.match(page,/quickFilter==="logged"&&!myInitials&&<p className="quick-filter-initials-note">NO INITIALS SET/);
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* A bare <p> in a flex column arrives with the browser's own 1em margin and
    nothing in this project resets it — measured, not read. */
 assert.match(css,/\.quick-filter-drawer>\.quick-filter-initials-note\{flex:none;margin:0;/);
});

test("the feed header says how long the work standing on it would take",async()=>{
 /* Curtis, pointing at the LIVE REPAIR FEED line: "a little badge that shows
    how many hours all of the ... defects that are currently on the bus add up
    to". The Down Sheet has printed the same number since it was built; the
    Defect Log never had it. */
 const {defectEstimateMinutes,openDefectsEstimateMinutes}=await import("../src/lib/defects/defect-estimates.ts");
 const {normalizeRepairTimeEstimate,repairTimeTotal,formatRepairTime,MINIMUM_REPAIR_MINUTES}=
  await import("../src/lib/down-sheet/repair-time-estimates.ts");
 const d=(id,category,issue,extra={})=>({id,category,issue,details:"",operability:"service",state:"open",...extra});

 /* A MECHANIC'S OWN NUMBER WINS, both halves of it. Diagnostic time is time —
    a fault nobody can find yet is still work somebody is doing. */
 assert.equal(defectEstimateMinutes(d("a","Brakes","Brakes sticking / dragging",{repairHours:2,diagnosticHours:0.5})),150);
 assert.equal(defectEstimateMinutes(d("a","Brakes","Brakes sticking / dragging",{diagnosticHours:1})),60,"diagnostic alone still counts");
 /* AND IS NOT FLOORED. The shared table holds a 30-minute minimum because a
    guess saying "ten minutes" is a guess nobody should plan around; a typed
    .25 is somebody saying they did it in fifteen, and rounding that up would
    quietly overstate the board. */
 assert.equal(defectEstimateMinutes(d("a","Brakes","Brakes sticking / dragging",{repairHours:0.25})),15);
 assert.ok(15<MINIMUM_REPAIR_MINUTES,"which is deliberately under the table's floor");

 /* UNTYPED READS THE DOWN SHEET'S OWN TABLE, not a second one. Asserted as
    equality with what that module would produce rather than as a number, so
    the two screens cannot drift apart as the table is tuned — the same reason
    the Ventra filter was made to read tech-services.ts. */
 for(const [category,issue] of [["A/C and HVAC","No cooling"],["Engine","Check engine light"],["Lights, Mirrors and Alarms","No horn"]])
  assert.equal(defectEstimateMinutes(d("x",category,issue)),repairTimeTotal(normalizeRepairTimeEstimate(undefined,category,issue)),
   category+" matches what the Down Sheet would print");
 /* A record too thin to name a repair still gets the floor rather than zero. */
 assert.equal(defectEstimateMinutes(d("x","","")),MINIMUM_REPAIR_MINUTES);

 /* OUTSTANDING WORK ONLY. A completed repair is work already done; deferred
    and in-progress are both still owed. */
 const board=[
  d("typed","Brakes","Brakes sticking / dragging",{repairHours:2,diagnosticHours:0.5}),
  d("untyped","A/C and HVAC","No cooling"),
  d("done","Engine","Check engine light",{state:"completed"}),
  d("held","Lights, Mirrors and Alarms","No horn",{state:"deferred"}),
 ];
 assert.equal(openDefectsEstimateMinutes(board),390);
 assert.equal(formatRepairTime(openDefectsEstimateMinutes(board)),"6h 30m","which is what the badge prints");
 assert.equal(openDefectsEstimateMinutes(board.filter(item=>item.id!=="done")),390,"dropping the completed one changes nothing");
 assert.equal(openDefectsEstimateMinutes(board.filter(item=>item.state==="completed")),0,"and completed work alone is zero");
 assert.equal(openDefectsEstimateMinutes([{...board[3],state:"in-progress"}]),90,"in-progress is owed too");
 assert.equal(openDefectsEstimateMinutes([]),0);
});

test("the estimate badge is scoped like the numbers beside it, and wins its own cascade fight",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* SAME SCOPE AS THE COUNTS. Built from `visible` — what the search and the
    state filter left — so all three numbers on that line always describe the
    same buses. From `active` it would quote the whole fleet's hours while
    standing on one bus. */
 assert.match(page,/visibleEstimateMinutes=openDefectsEstimateMinutes\(visible\.map\(record=>record\.defect\),repairHours\)/,"and asks the shop's own ledger before the catalog");
 assert.equal(/openDefectsEstimateMinutes\(active/.test(page),false,"never the unsearched list");
 /* Dropped rather than printed as "0m": the line already says 0 DEFECTS, and a
    zero beside it reads as a broken counter. */
 assert.match(page,/visibleEstimateMinutes>0&&<b className="feed-estimate">\{formatRepairTime\(visibleEstimateMinutes\)\} ESTIMATED<\/b>/);

 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* THE SPECIFICITY FIGHT, pinned because losing it is silent. `.feed-title b`
    carries the user's own LIVE REPAIR FEED size and colour at (0,1,1); a bare
    `.feed-estimate` at (0,1,0) loses whatever the source order and the badge
    renders at heading size in heading navy. Measured in the browser at 7px
    against the title's 17px. A later tidy-up to `.feed-estimate` would break
    it with no error, so the selector itself is the assertion. */
 assert.match(css,/\.feed-title b\.feed-estimate\{/);
 assert.equal(/^\.feed-estimate\{/m.test(css),false,"a class-only rule would lose to .feed-title b");
 assert.equal(/\.feed-estimate[^{]*\{[^}]*!important/.test(css),false,"and !important is not how that fight is won");
 /* One line: "14h 30m ESTIMATED" breaking in half reads as two numbers. */
 assert.match(css,/\.feed-title b\.feed-estimate\{[^}]*white-space:nowrap/);

 /* ONE TABLE. The badge imports the Down Sheet's estimate module rather than
    the Defect Log growing its own. */
 const estimates=await readFile(new URL("../src/lib/defects/defect-estimates.ts",import.meta.url),"utf8");
 assert.match(estimates,/from "\.\.\/down-sheet\/repair-time-estimates\.ts"/);
 assert.equal(/CATEGORY_REPAIR_MINUTES|repairMinutes:\s*\d/.test(estimates),false,"no second table of its own");
});

test("FIXED TODAY counts the fixes made on this device",async()=>{
 /* Found while building the hours badge, measured not read: a board holding
    two repairs completed today reported ONE. Pressing MARK FIXED completes a
    repair and stamps defectLogHiddenAt in the same action, and the counter was
    computed from the list defined as "everything without that stamp" — so
    every fix made on this device fell out of its own tally, and the ones that
    did count were the ones that arrived some other way. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/fixedToday:allRecords\.filter\(record=>record\.defect\.state==="completed"/,"the full record, hidden fixes included");
 assert.equal(/fixedToday:records\.filter/.test(page),false,"never the list that drops hidden records");
 /* The two lists are still different things, and the rest of the stats are
    deliberately built from the narrower one: ACTIVE, BUSES and DOWNING describe
    what is on the feed, and a hidden repair is not on the feed. Only the FIXED
    count asks a question about history. */
 assert.match(page,/const records=useMemo\(\(\)=>allRecords\.filter\(record=>!record\.defect\.defectLogHiddenAt\)/);
 assert.match(page,/active=records\.filter\(record=>isUnresolved\(record\.defect\)\)/);

 /* And MARK FIXED still hides, because that is what keeps the feed to
    outstanding work — the counter was the bug, not the hiding. */
 assert.match(page,/persist\(hideDefectLogRecords\(result\.fleet,\[\{busId:record\.bus\.id,defectId:record\.defect\.id\}\]/);
});

test("PATH TO REPAIR is written once per repair and survives a catalog rename",async()=>{
 /* Curtis: "basically steps, general steps to point people in the right
    direction of how to get it repaired" — refer to Cummins INSIGHT, check the
    oil first, look for corrosion behind the AC filters. Asked what it should
    attach to, he chose the REPAIR rather than the defect: a writeup keyed per
    instance would be retyped on every bus and never become a library. */
 const {PATH_TO_REPAIR_KEY,MAX_PATH_TO_REPAIR,pathToRepairKey,findPathToRepair,savePathToRepair,
  normalizePathToRepairs,readPathToRepairs,writePathToRepairs}=await import("../src/lib/defects/path-to-repair.ts");

 assert.equal(PATH_TO_REPAIR_KEY,"pace-ptr-v1");

 /* ONE WRITEUP, EVERY BUS. The key is the repair, so a PTR saved while looking
    at 17543 is the one 17566 reads. */
 const after=savePathToRepair({entries:[]},{category:"A/C and HVAC",issue:"No cooling",
  steps:"Check the thermostat screen first.\nThen look behind the AC filters for corrosion.",by:"cj"});
 assert.equal(after.entries.length,1);
 assert.equal(findPathToRepair(after,"A/C and HVAC","No cooling").steps.split("\n")[0],"Check the thermostat screen first.");
 assert.equal(findPathToRepair(after,"A/C and HVAC","No cooling").updatedBy,"CJ","initials are folded up, as everywhere else");
 assert.equal(findPathToRepair(after,"Engine","Check engine light"),null,"and it is not offered for a different repair");

 /* IT SURVIVES A CATALOG RENAME, which is the half that fails silently. A PTR
    keyed on raw wording would still be in storage after a category is renamed
    and would simply never match again. Both sides resolve through
    migrateRepairIdentity, the same function every stored defect is read
    through, so the defect and its writeup move together. */
 const {migrateRepairIdentity}=await import("../src/lib/defects/repair-catalog.ts");
 const moved=migrateRepairIdentity("Air System","Leak");
 assert.notEqual(moved.category,"Air System","the rename this test rides on still exists");
 const legacy=savePathToRepair({entries:[]},{category:"Air System",issue:"Leak",steps:"Soap the fittings."});
 assert.equal(findPathToRepair(legacy,moved.category,moved.issue).steps,"Soap the fittings.","found under today's wording");
 assert.equal(findPathToRepair(legacy,"Air System","Leak").steps,"Soap the fittings.","and under yesterday's");
 assert.equal(legacy.entries[0].category,moved.category,"stored in today's words");
 assert.equal(pathToRepairKey("Air System","Leak"),pathToRepairKey(moved.category,moved.issue));
 /* Case and spacing are wordings people type, not identifiers. Checked on a
    repair the rename maps do not touch, because of the limit below. */
 assert.deepEqual(migrateRepairIdentity("Engine","Check engine light"),{category:"Engine",issue:"Check engine light"},
  "the pair this property is checked on is one nothing migrates");
 assert.equal(pathToRepairKey("engine","  Check   engine light "),pathToRepairKey("Engine","Check engine light"));

 /* THE CASE FOLD HAPPENS AFTER THE MIGRATION, SO THE RENAME MAPS ARE
    CASE-SENSITIVE. Recorded rather than fixed: every category this is ever
    called with comes from REPAIR_OPTIONS or from a defect that was saved out
    of it, so the casing is the catalog's own. Making the maps case-insensitive
    would mean re-keying all of them for a path nothing takes. It only became
    visible when A/C and HVAC was grouped — before that "No cooling" had no
    rename, so the mis-cased category reached the same key by luck. */
 assert.notEqual(pathToRepairKey("a/c and hvac","No cooling"),pathToRepairKey("A/C and HVAC","No cooling"),
  "a mis-cased category skips the rename maps; callers pass the catalog's own wording");
 assert.equal(pathToRepairKey("A/C and HVAC","No cooling"),pathToRepairKey("A/C and HVAC","Cooling - No cooling"),
  "and the old flat wording and its grouped home are one repair");

 /* SAVING EMPTY CLEARS IT — there is no separate delete. Guidance is not a
    repair record; the rule that this app never deletes history is about
    defects and the work done on them. */
 /* Still written and cleared under the pre-grouping wording on purpose: it
    resolves to the same repair as "Cooling - No cooling", which is what the
    assertion above establishes. */
 const cleared=savePathToRepair(after,{category:"A/C and HVAC",issue:"No cooling",steps:"   "});
 assert.equal(cleared.entries.length,0);
 assert.equal(findPathToRepair(cleared,"A/C and HVAC","No cooling"),null);

 /* Re-saving replaces rather than accumulating, and lands newest first. */
 const twice=savePathToRepair(savePathToRepair(after,{category:"Engine",issue:"Check engine light",steps:"Pull the code."}),
  {category:"A/C and HVAC",issue:"No cooling",steps:"Replaced."});
 assert.equal(twice.entries.length,2);
 assert.equal(findPathToRepair(twice,"A/C and HVAC","No cooling").steps,"Replaced.");
 assert.equal(twice.entries[0].issue,"Cooling - No cooling","the one just written is on top, stored in today's words");

 /* Capped, so one entry cannot fill a phone on its own. */
 const long=savePathToRepair({entries:[]},{category:"Engine",issue:"Check engine light",steps:"x".repeat(MAX_PATH_TO_REPAIR+500)});
 assert.equal(long.entries[0].steps.length,MAX_PATH_TO_REPAIR);

 /* A ROUND TRIP THROUGH STORAGE, and a device that cannot take the write says
    so instead of throwing into a render. */
 const store=new Map();
 const storage={getItem:key=>store.has(key)?store.get(key):null,setItem:(key,value)=>store.set(key,value)};
 assert.equal(writePathToRepairs(storage,twice),true);
 assert.equal(findPathToRepair(readPathToRepairs(storage),"Engine","Check engine light").steps,"Pull the code.");
 assert.equal(writePathToRepairs({setItem:()=>{throw new Error("QuotaExceeded")}},twice),false);
 assert.deepEqual(readPathToRepairs({getItem:()=>"not json"}),{entries:[]});
 assert.deepEqual(normalizePathToRepairs(null),{entries:[]});
 assert.deepEqual(normalizePathToRepairs({entries:[{category:"Engine",issue:"X",steps:"  "}]}),{entries:[]},"a blank entry is not a PTR");
});

test("the PTR button sits on the defect card and opens the repair's own writeup",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* THE PANEL ITSELF NOW LIVES IN A COMPONENT, because Fixed Repairs opens it
    too. The button and which repair is open stayed on this page; the screen,
    the editor and the two checked writes moved to
    `src/components/defects/path-to-repair-panel.tsx`. So this test reads both
    halves, which is the honest shape of the claim now. */
 const panel=await readFile(new URL("../src/components/defects/path-to-repair-panel.tsx",import.meta.url),"utf8");
 /* ON THE DEFECT CARD, which is where Curtis put it after thinking aloud about
    the FOCUS row: "somewhere on each of the defect cards so that way it's
    specified to that defect". */
 assert.match(page,/className="ptr-log-focus-defect"[\s\S]{0,220}onClick=\{\(\)=>openPathToRepair\(record\.defect\.category,record\.defect\.issue\)\}/);
 /* Carrying the REPAIR, never the defect id — that is what makes one writeup
    serve every bus with the fault. */
 assert.equal(/openPathToRepair\(record\.defect\.id/.test(page),false);
 /* The screen is titled the way he named it. */
 assert.match(panel,/<small>PATH TO REPAIR<\/small>/);
 /* A repair with nothing written opens straight into the editor rather than
    onto a blank page with an EDIT button on it. Derived from the library inside
    the panel now, rather than seeded by each caller — two callers each seeding
    it is two chances to open in the wrong mode. */
 assert.match(panel,/const \[editing,setEditing\]=useState\(!saved\)/);
 /* The write is checked. A full device must not show text it did not store. */
 assert.match(panel,/if\(!writePathToRepairs\(localStorage,next\)\)\{setProblem\(/);
 const css=await readFile(new URL("../src/components/defects/path-to-repair-panel.css",import.meta.url),"utf8");
 const logCss=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* IT STACKS ABOVE THE FOCUS VIEW, and the first version of this assertion had
    the mechanism backwards - it checked that the panel came BEFORE the focus
    shade in source and called that "so it paints above it". Later paints above,
    not earlier, and both shades share one z-index through `.log-shade`. So the
    focus shade sat on top of a panel that looked perfectly normal and ate every
    tap on it. Caught by clicking SAVE in a browser; the source assertion had
    passed. The z-index is the real mechanism, so the z-index is the assertion. */
 /* The shade is the component's own now, backdrop and all — it used to lean on
    `.log-shade`, which Fixed Repairs does not load. */
 const shadeRule=css.slice(css.indexOf(".ptr-shade{"),css.indexOf("}",css.indexOf(".ptr-shade{")));
 assert.match(shadeRule,/z-index:2147483001/,"the panel's own shade carries the z-index now");
 assert.match(shadeRule,/position:fixed/,"and the backdrop, which used to come from .log-shade");
 assert.match(logCss,/\.log-shade\{position:fixed;z-index:2147483000/,"one higher than the shade it opens over");
 /* And it says, on the screen that writes it, who will see it. */
 assert.match(panel,/shows on every bus with that repair/);
 assert.match(panel,/does not travel to the Shop Cloud yet/);

 /* The button takes only a background: `.log-focus-record-foot button` already
    gives every button in that row its 44px target and face, and restating any
    of it would be a second opinion waiting to drift. */
 assert.match(logCss,/\.ptr-log-focus-defect\{background:#3f4a63\}/);
 assert.equal(/\.ptr-log-focus-defect\{[^}]*min-height/.test(logCss),false,"the row already sets the touch target");
 assert.match(logCss,/\.log-focus-record-foot button\{min-height:44px/,"which is the rule it is leaning on");
 /* The line breaks somebody typed ARE the steps. */
 assert.match(css,/\.ptr-steps\{[^}]*white-space:pre-wrap/);
});

test("the line breaks somebody types in a description survive to the screen",async()=>{
 /* Curtis: "I even tried hitting the space button to put a space in between it,
    and it did while I was in the text input space, but when I saved it, it just
    put them all back together, both paragraphs."

    Nothing was ever losing them. The save path trims the ENDS of the string and
    the record keeps every newline; HTML collapses them on the way to the screen
    unless the element says otherwise. So this is a rendering rule, and the
    assertions below hold both halves of that: the data is untouched, and the
    element that draws it keeps the breaks. */
 const {normalizeDefects}=await import("../src/lib/defects/repair-catalog.ts");
 const typed="The check engine light stays on.\n\n• Temperature sits at 205-210\n• Spikes to 220 under load";
 const stored=normalizeDefects([{id:"d1",category:"Engine",issue:"Misfire",details:typed,state:"open"}],"","bus");
 assert.equal(stored[0].details,typed,"the record keeps the breaks exactly as typed");
 assert.equal(stored[0].details.split("\n").length,4);

 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* The save path trims the ends and nothing more — no collapsing of internal
    whitespace, which is what would actually destroy them. */
 assert.match(page,/details=defect\.details\.trim\(\)/);
 assert.equal(/details\.replace\(\/\\s\+\/g/.test(page),false,"nothing flattens the inside of the string");

 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 /* pre-wrap, not pre: the typed breaks are kept AND long lines still wrap to
    the phone instead of scrolling sideways. */
 assert.match(css,/\.log-focus-defect\{[^}]*white-space:pre-wrap/);
 assert.equal(/\.log-focus-defect\{[^}]*white-space:pre;/.test(css),false,"pre alone would scroll a phone sideways");

 /* BULLET needs no parser once breaks are kept: a line starting with a dot is a
    line. It appends rather than inserting at the caret, because dictation
    leaves the caret wherever the recogniser put it. */
 assert.match(page,/className="insert-bullet"/);
 assert.match(page,/needsBreak=Boolean\(current\.trim\(\)\)&&!current\.endsWith\("\\n"\)/,"a bullet never opens on a blank box, and never doubles a break");
 assert.match(page,/updateDefect\("details",current\+\(needsBreak\?"\\n":""\)\+"• "\)/);
 /* AND THE CARET FOLLOWS IT. Pressing the button blurs the box and React
    re-renders it from the new value, leaving the caret at position 0 — so the
    next words typed or dictated land at the TOP of the description. Caught in
    a browser: the probe pressed BULLET, typed, and found its sentence welded
    to the front of the paragraph. Restored on the NEXT frame, because setting
    the selection in the same tick sets it on the pre-update value. */
 assert.match(page,/requestAnimationFrame\(\(\)=>\{const box=detailsRef\.current;if\(!box\)return;box\.focus\(\);box\.setSelectionRange\(box\.value\.length,box\.value\.length\)\}\)/);
 assert.match(page,/<textarea ref=\{detailsRef\}/,"the ref the caret fix needs is actually attached");
});

test("the shop's own repair time is a ledger somebody sets, not something that drifts",async()=>{
 /* Curtis, offered a version that learns from completed work: "if that's some
    type of like adaptive strategy, we can hold off on it as long as a person
    can change the repair times then and then it updates ... that's not
    necessarily an adaptive strategy, but that's more like a fixed ledger."

    So nothing in here averages, decays, or moves on its own. A number is set by
    a person and stands until a person changes it. */
 const {REPAIR_HOURS_KEY,findRepairMinutes,saveRepairMinutes,hoursToMinutes,
  normalizeRepairHoursLedger,readRepairHoursLedger,writeRepairHoursLedger}=
  await import("../src/lib/defects/repair-hours-ledger.ts");
 const {defectEstimateMinutes,openDefectsEstimateMinutes}=await import("../src/lib/defects/defect-estimates.ts");
 const {normalizeRepairTimeEstimate,repairTimeTotal}=await import("../src/lib/down-sheet/repair-time-estimates.ts");
 const {repairIdentityKey}=await import("../src/lib/defects/repair-catalog.ts");
 const {pathToRepairKey}=await import("../src/lib/defects/path-to-repair.ts");

 assert.equal(REPAIR_HOURS_KEY,"pace-repair-hours-v1");

 /* HOURS IN, MINUTES STORED. A mechanic writes .5; everything that consumes an
    estimate in this app is in minutes. */
 assert.equal(hoursToMinutes("2.5"),150);
 assert.equal(hoursToMinutes(".25"),15);
 assert.equal(hoursToMinutes(""),null);
 assert.equal(hoursToMinutes("0"),null,"zero is not a repair time");

 const ledger=saveRepairMinutes({entries:[]},{category:"Brakes",issue:"Brakes sticking / dragging",hours:"2",by:"cj"});
 assert.equal(findRepairMinutes(ledger,"Brakes","Brakes sticking / dragging").minutes,120);
 assert.equal(findRepairMinutes(ledger,"Brakes","Brakes sticking / dragging").updatedBy,"CJ");
 /* PER SPECIFIC REPAIR, not per category: a different Brakes repair is NOT
    covered by it, which is the whole reason it is not keyed on the category. */
 assert.equal(findRepairMinutes(ledger,"Brakes","Brake chamber leaking"),null);

 /* ONE KEY FUNCTION with PATH TO REPAIR, so a writeup and a time set on the
    same screen cannot be filed under different names. */
 assert.equal(pathToRepairKey("Brakes","Brakes sticking / dragging"),repairIdentityKey("Brakes","Brakes sticking / dragging"));
 /* And it survives a catalog rename for the same reason PTR does. */
 const {migrateRepairIdentity}=await import("../src/lib/defects/repair-catalog.ts");
 const moved=migrateRepairIdentity("Air System","Leak");
 const legacy=saveRepairMinutes({entries:[]},{category:"Air System",issue:"Leak",hours:"1"});
 assert.equal(findRepairMinutes(legacy,moved.category,moved.issue).minutes,60,"found under today's wording");
 assert.equal(legacy.entries[0].category,moved.category,"and filed in today's words");

 /* FOUR SOURCES, MOST SPECIFIC FIRST. */
 const defect={id:"d",category:"Brakes",issue:"Brakes sticking / dragging",details:"",operability:"service",state:"open"};
 const catalog=repairTimeTotal(normalizeRepairTimeEstimate(undefined,"Brakes","Brakes sticking / dragging"));
 assert.equal(defectEstimateMinutes(defect),catalog,"with no ledger it is the catalog's guess");
 assert.equal(defectEstimateMinutes(defect,ledger),120,"the shop's number beats the catalog");
 assert.equal(defectEstimateMinutes({...defect,repairHours:4},ledger),240,"and what was typed on THIS job beats the shop's");
 assert.equal(defectEstimateMinutes({...defect,repairHours:4,estimateHours:3},ledger),180,"and the estimate for THIS repair beats even that");
 assert.notEqual(catalog,120,"the test would prove nothing if they happened to match");

 /* It reaches the badge's total too, not just one defect. */
 assert.equal(openDefectsEstimateMinutes([defect],ledger),120);
 assert.equal(openDefectsEstimateMinutes([{...defect,state:"completed"}],ledger),0,"and completed work still adds nothing");

 /* AN EMPTY BOX REMOVES IT and the catalog estimate returns — withdrawing a
    claim is the same gesture as never having made one. */
 const cleared=saveRepairMinutes(ledger,{category:"Brakes",issue:"Brakes sticking / dragging",hours:""});
 assert.equal(findRepairMinutes(cleared,"Brakes","Brakes sticking / dragging"),null);
 assert.equal(defectEstimateMinutes(defect,cleared),catalog,"back to the catalog");

 /* Re-setting replaces rather than accumulating. */
 const twice=saveRepairMinutes(ledger,{category:"Brakes",issue:"Brakes sticking / dragging",hours:"1.5"});
 assert.equal(twice.entries.length,1);
 assert.equal(findRepairMinutes(twice,"Brakes","Brakes sticking / dragging").minutes,90);

 /* A round trip, and a refused write reported rather than thrown. */
 const store=new Map();
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
 assert.equal(writeRepairHoursLedger(storage,twice),true);
 assert.equal(findRepairMinutes(readRepairHoursLedger(storage),"Brakes","Brakes sticking / dragging").minutes,90);
 assert.equal(writeRepairHoursLedger({setItem:()=>{throw new Error("QuotaExceeded")}},twice),false);
 assert.deepEqual(readRepairHoursLedger({getItem:()=>"not json"}),{entries:[]});
 /* A zero or negative stored time is a cleared or corrupt entry, not "instant". */
 assert.deepEqual(normalizeRepairHoursLedger({entries:[{category:"Brakes",issue:"X",minutes:0}]}),{entries:[]});
 assert.deepEqual(normalizeRepairHoursLedger({entries:[{category:"Brakes",issue:"X",minutes:-30}]}),{entries:[]});
});

test("SHOP TIME sits on the PATH TO REPAIR screen and feeds the hours badge",async()=>{
 /* Moved with the panel into `src/components/defects/`, so both screens that
    open it offer the same box — and the ledger it writes is the same one the
    Defect Log's hours badge reads. */
 const page=await readFile(new URL("../src/components/defects/path-to-repair-panel.tsx",import.meta.url),"utf8");
 /* One screen per repair for what this garage knows about it: how to approach
    it, and how long it takes here. */
 assert.match(page,/SHOP TIME FOR THIS REPAIR<HoursField/);
 /* Saved on its own, not folded into the steps — a time and a writeup are two
    different claims and correcting one must not require re-saving the other. */
 assert.match(page,/const saveHours=\(hours:string\)=>\{/);
 assert.equal(/const saveHours[\s\S]{0,200}savePathToRepair/.test(page),false,"the two saves are separate");
 /* The write is checked, like every other write in this app. */
 assert.match(page,/if\(!writeRepairHoursLedger\(localStorage,next\)\)\{setProblem\(/);
 /* It says what is in force when nothing is set, naming the catalog figure it
    is about to be measured against rather than showing an empty box. */
 assert.match(page,/NOT SET — ESTIMATING "\+formatRepairTime\(fallback\)\+" FROM THE CATALOG/);
 /* And who set it when one is. */
 assert.match(page,/"SET BY "\+\(shop\.updatedBy\|\|"SOMEONE"\)\+" · USED FOR EVERY BUS WITH THIS REPAIR"/);
});


test("focus repair actions share one full-width row above the date, with PTR last",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 const foot=page.slice(page.indexOf('<div className="log-focus-record-foot">'),page.indexOf('    </article>)}',page.indexOf('<div className="log-focus-record-foot">')));
 const actions=foot.slice(foot.indexOf('<div className="log-focus-record-actions">'),foot.indexOf('<div className="log-focus-record-meta">'));
 assert.ok(actions.indexOf('className="edit-log-focus-defect"')<actions.indexOf('className="fix-log-focus-defect"'));
 assert.ok(actions.indexOf('className="fix-log-focus-defect"')<actions.indexOf('className="ptr-log-focus-defect"'));
 assert.equal((actions.match(/<button /g)||[]).length,3);
 assert.equal(actions.includes('UNDO DEFERRED'),false,"the optional action must not squeeze the equal main row");
 assert.match(foot,/<div className="log-focus-record-meta"><time>LOGGED/);
 assert.match(foot,/className="undo-deferred"[^>]*onClick=\{\(\)=>undoDeferred\(record\)\}>UNDO DEFERRED/);
 assert.match(css,/\.log-focus-record-foot\{display:flex;flex-direction:column;align-items:stretch/);
 assert.match(css,/\.log-focus-record-actions>button\{[^}]*width:100%;min-width:0;align-self:stretch;padding:8px 6px;line-height:1\.2;text-align:center;white-space:normal;overflow-wrap:anywhere\}/);
 assert.equal(/\.log-focus-record-actions\{[^}]*flex-wrap/.test(css),false);
 /* The editor's own text moved into the component with it. */
 const panel=await readFile(new URL("../src/components/defects/path-to-repair-panel.tsx",import.meta.url),"utf8");
 assert.match(panel,/placeholder="Add the first checks and useful references to help someone start this repair\."/);
 assert.equal(panel.includes('Check the oil level first.'),false,"example instructions are not shown as repair advice");
 assert.match(panel,/<textarea value=\{draft\}/,"saved notes stay in the editor value, separate from help text");
 assert.match(panel,/<p className="ptr-steps">\{saved.steps\}<\/p>/,"reading still shows the user's saved writeup");
});

test("the LIVE REPAIR FEED can be narrowed to a shift or a day without touching the four chip rows",async()=>{
 const {FEED_WINDOWS,defectWithinFeedWindow,feedWindowLabel,feedWindowMinutes,isFeedWindowKey,withinFeedWindow}=
  await import("../src/lib/defects/feed-window.ts");
 const {DEFAULT_SHIFT_SETTINGS}=await import("../src/lib/settings/shift-clock.ts");

 /* Curtis: "filter everything that's being put down ... by the day and by the
    shift, so in the last 24 hours, or by the shift". ALL first, because it is
    the way out of every window and the board's own behaviour until now. */
 assert.deepEqual(FEED_WINDOWS.map(item=>item.key),["all","shift","today","24h","3d","7d","30d"]);
 assert.equal(FEED_WINDOWS[0].key,"all","ALL has to stay first: it is the way back to the whole board");
 assert.equal(isFeedWindowKey("today"),true);
 assert.equal(isFeedWindowKey("8h"),false,"a key only the shared chip row has must not resolve here");

 /* EVERY WINDOW IS A NUMBER OF MINUTES BACK FROM NOW, which is what lets one
    comparison serve a rolling span, a shift and a calendar day alike. */
 const at=(hhmm)=>new Date("2026-10-13T"+hhmm+":00.000");
 assert.equal(feedWindowMinutes("all",at("15:00")),null,"ALL has no limit");
 assert.equal(feedWindowMinutes("24h",at("15:00")),1440);
 assert.equal(feedWindowMinutes("3d",at("15:00")),3*1440);
 assert.equal(feedWindowMinutes("7d",at("15:00")),7*1440);

 /* TODAY is minutes since local midnight — a calendar day, not a rolling 24h,
    and the two differ by the whole of yesterday afternoon at 06:00. */
 assert.equal(feedWindowMinutes("today",at("06:00")),360);
 assert.equal(feedWindowMinutes("today",at("00:00")),0,"at midnight TODAY is zero minutes, not the whole board");
 assert.notEqual(feedWindowMinutes("today",at("06:00")),feedWindowMinutes("24h",at("06:00")),
  "TODAY and LAST 24H are different questions");

 /* THIS SHIFT is however long the shift has been running, on the same clock as
    the Down Sheet and the forecast — the INCOMING crew owns the handover, so
    at 14:05 it is five minutes rather than 8H's eight hours. */
 assert.equal(feedWindowMinutes("shift",at("14:05"),DEFAULT_SHIFT_SETTINGS),5);
 assert.equal(feedWindowMinutes("shift",at("14:00"),DEFAULT_SHIFT_SETTINGS),0,
  "at 14:00 exactly the shift is zero minutes old, which is a real limit and not 'no window'");
 assert.equal(feedWindowMinutes("shift",at("20:00"),DEFAULT_SHIFT_SETTINGS),360);

 /* ZERO IS A REAL LIMIT. A falsy check here would hand back the whole board at
    14:00 and at midnight, under a heading promising a shift or a day. */
 assert.equal(withinFeedWindow(0,0),true);
 assert.equal(withinFeedWindow(1,0),false,"something logged a minute before the shift began is not in it");
 assert.equal(withinFeedWindow(99999,null),true,"ALL keeps everything");

 /* AN UNDATED DEFECT falls out of every narrowed window and stays in ALL. */
 assert.equal(withinFeedWindow(null,null),true);
 assert.equal(withinFeedWindow(null,1440),false);

 /* THE AGE IS `createdAt`, NEVER `updatedAt`. A defect logged on Monday and
    edited this morning was still logged on Monday; keying off the edit would
    refill TODAY with last week's work every time somebody touched a record. */
 const now=new Date("2026-10-13T15:00:00.000Z");
 const old={category:"Brakes",issue:"Chamber leak",createdAt:"2026-10-06T15:00:00.000Z",updatedAt:"2026-10-13T14:59:00.000Z"};
 const fresh={category:"Brakes",issue:"Chamber leak",createdAt:"2026-10-13T14:30:00.000Z"};
 const undated={category:"Brakes",issue:"Chamber leak"};
 assert.equal(defectWithinFeedWindow(old,1440,now),false,"a week-old defect edited a minute ago is still a week old");
 assert.equal(defectWithinFeedWindow(fresh,1440,now),true);
 assert.equal(defectWithinFeedWindow(undated,1440,now),false);
 assert.equal(defectWithinFeedWindow(old,null,now),true,"ALL keeps the old one");
 assert.equal(defectWithinFeedWindow(undated,null,now),true,"ALL keeps the undated one");

 /* THE LABEL AND THE FILTER DEGRADE TOGETHER. A board that keeps everything
    under a heading claiming a window is the one outcome worth preventing, so
    an unresolvable shift gives null AND "" rather than one of each. */
 const broken={shifts:[],pullouts:[]};
 assert.equal(feedWindowMinutes("shift",at("15:00"),broken),null);
 assert.equal(feedWindowLabel("shift",at("15:00"),broken),"","no shift to name, so claim no window");
 assert.equal(feedWindowLabel("all",at("15:00")),"","a board with no window is just the board");
 assert.equal(feedWindowLabel("shift",at("20:00"),DEFAULT_SHIFT_SETTINGS),"2ND SHIFT · SINCE 14:00",
  "it names the shift and its start, because somebody reading at 23:00 cannot ask which one it was");
 assert.equal(feedWindowLabel("today",at("09:00")),"TODAY");
 assert.equal(feedWindowLabel("24h",at("09:00")),"LAST 24H");

 /* THE FOUR EXISTING CHIP ROWS ARE UNTOUCHED. TODAY needs a clock the Down
    Sheet boards never ask for, so it lives here and not in the shared list —
    the same reason SHIFT is not in TIME_WINDOWS. */
 const {TIME_WINDOWS,TIME_WINDOWS_WITH_SHIFT}=await import("../src/lib/shared/time-window.ts");
 assert.deepEqual(TIME_WINDOWS.map(item=>item.key),["all","1h","4h","8h","24h","3d","7d"],
  "the shared chip row must not gain or lose a chip because the feed got a drop-down");
 assert.equal(TIME_WINDOWS_WITH_SHIFT.length,8);
 assert.equal(TIME_WINDOWS.some(item=>item.key==="today"),false,"TODAY must not reach the four lists that draw TIME_WINDOWS");
 /* Checked against the CODE, not the comments: that file's own header uses the
    word "today" in prose, explaining why a window does not belong on the
    filters that ask what is true right now. */
 const shared=(await readFile(new URL("../src/lib/shared/time-window.ts",import.meta.url),"utf8"))
  .replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 assert.doesNotMatch(shared,/today/i,"the shared module must not have learned about TODAY");
});

test("WHEN LOGGED narrows the feed, says so outside the drawer, and never outranks a search",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);

 /* A DROP-DOWN, which is how Curtis asked for it: "it should be like a
    drop-down somewhere at the work computer". Not a seventh chip — that row is
    thumb targets and has to stay on one line at 360px. */
 assert.match(page,/<label className="log-feed-window">WHEN LOGGED/);
 assert.match(page,/<select value=\{feedWindow\} onChange=\{event=>setFeedWindow\(event\.target\.value as FeedWindowKey\)\}/);
 assert.match(page,/\{FEED_WINDOWS\.map\(item=><option value=\{item\.key\} key=\{item\.key\}>\{item\.label\}<\/option>\)\}/,
  "the options come from the one list, so the drop-down cannot drift from the filter");
 assert.match(page,/aria-label="Show defects logged within"/);

 /* SEARCH WINS. Curtis wants to reach a bus "no matter what time" it was
    logged, so an active search sets the limit to null outright. */
 /* ONE CLOCK READ, SHARED by the limit and the label. Two `new Date()` calls a
    line apart can straddle a minute, or midnight, where TODAY's limit drops
    from 1439 to 0 — and feed-window.ts's whole degradation rule is that those
    two must never disagree. It is STATE rather than a render-body const so it
    also advances while the page sits idle; the timer itself is pinned in "TODAY
    is measured from a real local midnight". */
 assert.match(page,/const \[feedWindowNow,setFeedWindowNow\]=useState\(\(\)=>new Date\(\)\)/);
 assert.match(page,/const feedWindowLimit=search\.trim\(\)\?null:feedWindowMinutes\(feedWindow,feedWindowNow,shiftSettings\)/,
  "a search must stand the window down, not merely be applied after it");
 assert.match(page,/const feedWindowText=search\.trim\(\)\?"":feedWindowLabel\(feedWindow,feedWindowNow,shiftSettings\)/,
  "and the bar has to go quiet with it, or it would claim a window that is not in force");
 assert.match(page,/SEARCHING EVERY DATE/,"the search bar says why the window stopped applying");

 /* THE STATE AND THE WAY OUT LIVE OUTSIDE THE DRAWER. The control sits in VIEW,
    which is collapsed by default, so a narrowed board that explained itself
    only in there would be the trap this control could have been. */
 assert.match(page,/\{feedWindowText&&<div className="log-window-filtered" role="status">/);
 assert.match(page,/className="show-all-buses" onClick=\{\(\)=>setFeedWindow\("all"\)\}/,"one tap back to the whole board");
 assert.match(page,/OLDER BUS/,"it says how many buses the window is holding back");
 /* Pinned by what sits BETWEEN the two bars rather than by their order. A bare
    "the window bar comes after the drawer opens" passes with the bar moved
    inside the drawer, which is exactly the regression worth catching — found by
    making that move and watching the assertion stay green. The search bar is
    known to be outside the drawer, so: the window bar follows it, and nothing
    belonging to the drawer comes between them. */
 const searchBar=page.indexOf('className="log-search-filtered"'),windowBar=page.indexOf('className="log-window-filtered"');
 assert.ok(searchBar>0&&windowBar>searchBar,"the window bar renders beside the search bar, not before it");
 assert.doesNotMatch(page.slice(searchBar,windowBar),/log-advanced/,
  "nothing of the collapsible drawer may come between them: the bar has to be reachable with VIEW shut");

 /* STICKY, NOT STORED. The shop computer's tab does not reload, so useState is
    permanent in practice; a storage key would instead mean somebody walks up to
    that computer tomorrow and reads a short board nobody narrowed today. */
 assert.match(page,/const \[feedWindow,setFeedWindow\]=useState<FeedWindowKey>\("all"\)/,"it opens on ALL, which is the board as it was");
 const code=page.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\{\/\*[\s\S]*?\*\/\}/g,"");
 assert.doesNotMatch(code,/feed-window-v1|feedWindow[^)]*localStorage|localStorage[^;\n]*feedWindow/,
  "the window is not written to storage");

 assert.match(css,/\.log-feed-window select\{width:100%;min-height:44px/,"a real tap target, matching the buttons beside it");
 assert.match(css,/\.log-window-filtered\{/);
 assert.doesNotMatch(css,/\.log-window-filtered\{[^}]*background:#eaf3fd/,
  "it must not be the search bar's blue: both can be on screen at once");
});

test("TODAY is measured from a real local midnight, and the window clock advances on its own",async()=>{
 const {feedWindowMinutes,feedWindowLabel,defectWithinFeedWindow}=await import("../src/lib/defects/feed-window.ts");

 /* BOTH OF THESE SHIPPED WRONG IN THE FIRST CUT and were caught in review.
    TODAY used `minuteOfDay`, which is right for the shift clock — it compares
    clock readings to clock readings — and wrong here, where the answer is
    compared against an ELAPSED age.

    IT FLOORED TO THE MINUTE. `loggedMinutesElapsed` returns fractions, so at
    09:30:45 the limit was 570 while a defect logged at 00:00:10 had an age of
    570.58: logged today, hidden from TODAY. */
 const at=new Date(2026,5,15,9,30,45);
 const limit=feedWindowMinutes("today",at);
 assert.ok(limit>570.7&&limit<570.8,"the limit keeps its seconds, got "+limit);
 const loggedJustAfterMidnight={category:"Brakes",issue:"Chamber leak",createdAt:new Date(2026,5,15,0,0,10).toISOString()};
 assert.equal(defectWithinFeedWindow(loggedJustAfterMidnight,limit,at),true,
  "a defect logged at 00:00:10 was logged today");

 /* AND IT COUNTED CLOCK MINUTES RATHER THAN REAL ONES. On a spring-forward day
    10:00 is 600 clock minutes past midnight but only 540 real ones, so TODAY
    reached a full hour into yesterday. Asserted only where the clock really
    shifts, so the test says what it means on a UTC runner rather than passing
    for the wrong reason. */
 const springForward=new Date(2026,2,8,10,0,0);
 const shifts=springForward.getTimezoneOffset()!==new Date(2026,2,8,0,0,0).getTimezoneOffset();
 const springLimit=feedWindowMinutes("today",springForward);
 if(shifts){
  assert.ok(springLimit<595,"on a DST day TODAY must measure real elapsed time, got "+springLimit);
 }else{
  assert.ok(Math.abs(springLimit-600)<1,"no DST here, so 10:00 is 600 minutes in; got "+springLimit);
 }

 /* An unreadable clock gives null AND "", the pair that must move together. */
 const broken=new Date(NaN);
 assert.equal(feedWindowMinutes("today",broken),null);
 assert.equal(feedWindowLabel("today",broken),"");

 /* THE CLOCK ADVANCES WITHOUT THE OPERATOR. Read in the render body the instant
    only moved when something else caused a render, and this control was built
    for a shop computer left open on this page all day: at 14:00 the board went
    on showing the morning crew's window under a heading reading 1ST SHIFT.
    It is state now, refreshed on a timer while a window is in force. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/const \[feedWindowNow,setFeedWindowNow\]=useState\(\(\)=>new Date\(\)\)/);
 assert.match(page,/setInterval\(\(\)=>setFeedWindowNow\(new Date\(\)\),30000\)/,"it re-reads the clock every half minute");
 assert.match(page,/return \(\)=>clearInterval\(id\)/,"and clears the timer, so leaving the page does not leak one");
 const effect=page.slice(page.indexOf("const [feedWindowNow,setFeedWindowNow]"),page.indexOf("const feedWindowLimit="));
 assert.match(effect,/if\(feedWindow==="all"&&\(!quickFilterMenuOpen\|\|loggedCountWindow==="all"\)\)return;/,
  "ALL does not tick: there is no limit to keep current and an idle board should not re-render for nothing");
 assert.match(effect,/setFeedWindowNow\(new Date\(\)\);\s*\n\s*const id=setInterval/,
  "and it reads the clock immediately on picking a window, not up to thirty seconds late");
 assert.match(effect,/\},\[feedWindow,quickFilterMenuOpen,loggedCountWindow\]\)/,
  "re-armed when the window changes, and when the count beside it comes on screen or changes span");
});

test("one clock reaches the limit, the ages and the label",async()=>{
 const {defectWithinFeedWindow,feedWindowMinutes}=await import("../src/lib/defects/feed-window.ts");

 /* THE BUG THIS PINS, in the shape it really had: the limit was computed from
    `feedWindowNow` while every defect's AGE defaulted to a fresh `new Date()`.
    Two clocks, and the gap was microseconds until the instant became state
    refreshed every thirty seconds — at which point a defect stamped at local
    midnight is OLDER than a TODAY limit read half a minute ago, and falls off a
    board it belongs on. Reproduced here by passing the stale instant to one and
    letting the other default. */
 const midnight=new Date(2026,5,15,0,0,0);
 const stale=new Date(2026,5,15,9,0,0);
 const later=new Date(stale.getTime()+30000);
 const atMidnight={category:"Brakes",issue:"Chamber leak",createdAt:midnight.toISOString()};
 const limit=feedWindowMinutes("today",stale);

 assert.equal(defectWithinFeedWindow(atMidnight,limit,later),false,
  "two clocks: the age outruns a limit read half a minute earlier — this is the bug");
 assert.equal(defectWithinFeedWindow(atMidnight,limit,stale),true,
  "one clock: a defect stamped at local midnight belongs in TODAY");

 /* So the page must hand the same instant to all three. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 assert.match(page,/defectWithinFeedWindow\(record\.defect,feedWindowLimit,feedWindowNow\)/,
  "the ages read the same instant as the limit");
 assert.match(page,/feedWindowMinutes\(feedWindow,feedWindowNow,shiftSettings\)/);
 assert.match(page,/feedWindowLabel\(feedWindow,feedWindowNow,shiftSettings\)/);
 /* No fourth reading anywhere in the window's own code path. */
 const span=page.slice(page.indexOf("const [feedWindowNow,setFeedWindowNow]"),page.indexOf("const hiddenByFeedWindow="));
 const reads=span.match(/new Date\(\)/g)||[];
 assert.equal(reads.length,3,
  "expected exactly three clock reads in this span — the initial state, the effect's immediate read and the interval's — found "+reads.length);
});

test("DEFECTS LOGGED counts over a span somebody picks, and no other menu row changes",async()=>{
 const [page,menu,css,downSheetEarly,mapEarly]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/components/defects/quick-filter-menu.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
 ]);

 /* Curtis, looking at the row reading 108: "I want a per shift and 24 hour
    selection too. Just turn this field into a dropdown so I can pick what I
    want." It was answering a different question from the list it opened — the
    count narrowed by initials and nothing else, the drawer behind it opening on
    THIS SHIFT. One window serves both now. */
 assert.match(page,/const quickFilterMenuCounts=\{\.\.\.quickFilterCounts,logged:loggedWindowedCount\}/);
 assert.match(page,/counts=\{quickFilterMenuCounts\}/,"the menu is given the windowed counts");
 assert.match(page,/withinTimeWindow\(loggedAgeMinutes\(bus\),loggedCountWindow,shiftWindowMinutes\)/,
  "the count is narrowed by the picked span, with the shift's own limit resolved");

 /* THE COUNT AND THE LIST IT OPENS ARE READ OFF ONE PASS.

    The first cut memoized the count on `[fleet,loggedCountWindow,
    shiftWindowMinutes,myInitials]`. `fleet` is state, so it holds its identity
    across renders and that cache really held: the drawer's `quickFilterBuses`
    was rebuilt from a fresh clock on every render while the number on the row
    stayed whatever the deps last produced. The two were kept honest only by
    `shiftWindowMinutes` ticking once a minute — which is null the moment a
    shift cannot be resolved, leaving the memo with no clock input at all. So
    the count is computed in the same pass as the counts and the list either
    side of it, and there is nothing left to cache wrongly. */
 assert.match(page,/const loggedWindowedCount=fleet\.filter\(bus=>loggedCandidateIds\.has\(bus\.id\)&&withinTimeWindow\(/,
  "the count is computed at render, not memoized beside a list that is not");
 const countSpan=page.slice(page.indexOf("const loggedCandidateIds="),page.indexOf("const quickFilterMenuCounts="));
 assert.doesNotMatch(countSpan,/useMemo/,
  "a cache here is a number quoted off a different instant from the rows behind it");
 /* ONE QUESTION, ASKED ONCE. The row's count and the menu's other counts come
    through the same `candidateIdsFor`, so neither can drift from the other. */
 assert.match(page,/const loggedCandidateIds=new Set\(candidateIdsFor\("logged"\)\)/);
 assert.equal(page.split('quickFilterBusIds(fleet,"logged"').length-1,0,
  "no second way of asking which buses this person logged");

 /* AND IT IS KEPT CURRENT WHILE SOMEBODY IS LOOKING AT IT. The span moves on
    its own — 14:00 arrives, the 24 hours roll — and nothing else re-renders
    this screen, so a frozen number is the default outcome rather than an edge
    case. The menu reports when it is open because the count is drawn inside
    the popover and nowhere else; that is what buys the tick without making
    every phone re-render twice a minute for a number nobody can see. */
 assert.match(page,/onOpenChange=\{setQuickFilterMenuOpen\}/);
 assert.match(menu,/onOpenChange\?:\(open:boolean\)=>void/);
 assert.match(menu,/useEffect\(\(\)=>\{onOpenChange\?\.\(open\)\},\[open\]\)/,
  "derived from the state, so none of the five places that close this menu can forget to report it");
 assert.doesNotMatch(downSheetEarly,/onOpenChange/,"the Down Sheet passes none");
 assert.doesNotMatch(mapEarly,/onOpenChange/,"the Facility Map passes none");

 /* ONE AGE FUNCTION, used by the count and by the drawer — this repo has
    already paid for five copies of one table. */
 assert.match(page,/const loggedAgeMinutes=\(bus:DefectLogFleetBus\)=>\{/);
 assert.match(page,/if\(quickFilter==="logged"\)return loggedAgeMinutes\(bus\);/);
 assert.equal(page.split("busLoggedMinutes(defects)").length-1,1,
  "only one place reduces a bus to its newest report");

 /* THE TWO CONTROLS CANNOT DISAGREE. The drop-down sets the drawer's window
    while LOGGED is open, and the drawer's chips set the drop-down's. */
 assert.match(page,/onChange=\{value=>\{setQuickFilterWindow\(value\);if\(quickFilter==="logged"\)setLoggedCountWindow\(value\)\}\}/,
  "the chips mirror back into the count's span");
 assert.match(page,/setLoggedCountWindow\(next\);if\(quickFilter==="logged"\)setQuickFilterWindow\(next\)/,
  "and the drop-down drives the drawer while it is open");

 /* The drop-down offers the same spans as the chips below it, from the one
    list, so a shift that cannot be resolved is not offered in either. */
 assert.match(page,/\{quickFilterWindowChoices\.map\(item=><option value=\{item\.key\} key=\{item\.key\}>\{item\.label\}<\/option>\)\}/);
 assert.match(page,/quickFilterWindowChoices\.some\(item=>item\.key===loggedCountWindow\)\?loggedCountWindow:"all"/,
  "a span the current choices do not offer falls back rather than showing blank");
 assert.match(page,/onClick=\{event=>event\.stopPropagation\(\)\}/,
  "using the picker must not also toggle the filter the row sits on");

 /* ONLY THIS ROW. Every other count answers 'what is true right now', where the
    age of the record is not the question. */
 assert.match(page,/itemAside=\{key=>key!=="logged"\?null:/);

 /* THE SHARED MENU STAYS SHARED. Three screens draw it; the aside is optional
    and the other two pass nothing, so their markup is what it always was. */
 assert.match(menu,/itemAside\?:\(key:K\)=>React\.ReactNode/);
 assert.match(menu,/return aside\?<div className="quick-filter-row" key=\{item\.key\}>\{row\}\{aside\}<\/div>:row;/,
  "no wrapper where there is no aside");
 assert.doesNotMatch(downSheetEarly,/itemAside/,"the Down Sheet passes none");
 assert.doesNotMatch(mapEarly,/itemAside/,"the Facility Map passes none");

 /* THE CASCADE. The stylesheet reaches these rows with a DIRECT-child
    selector, so the wrapped shape is named in that same selector list rather
    than given a second copy of the look — and the unwrapped rows the other two
    screens draw keep matching it untouched. */
 for(const part of ["button","button>b","button.active"])assert.ok(
  css.includes(".quick-filter-popover>div>"+part+",.quick-filter-popover>div>.quick-filter-row>"+part+"{"),
  "the wrapped row must share the rule for "+part+" rather than get a copy of it");
 assert.match(css,/\.quick-filter-window select\{min-height:39px/,"it matches the rows beside it on a desktop");
 /* AND THE PHONE RULE, which is a separate selector list and was missed on the
    first cut: measured at 390px the wrapped button came back 39px while every
    row beside it was 44. A shorter tap target on one row, below the minimum
    this repo holds everywhere else, found by measuring rather than reading. */
 assert.ok(css.includes(".quick-filter-popover>div>button,.quick-filter-popover>div>.quick-filter-row>button,.quick-filter-window select{min-height:44px}"),
  "the wrapped row and its picker take the phone tap-target rule with the rest");
});

test("AI OPERATOR says where it is going before it goes",async()=>{
 const [page,map,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);

 /* Curtis: "When I press Ai operator and I am on the Defect page it routes me
    to the map. With no warning." It always did — the control is a link, and the
    modal cannot render on this screen because `executeOperator` is bound to the
    map's own state. The navigation is the feature; saying so was missing. */
 assert.match(page,/onClick=\{event=>\{if\(!leaveForOperator\(\)\)event\.preventDefault\(\)\}\}/,
  "the navigation is held until somebody agrees to it");
 assert.match(page,/const leaveForOperator=\(\)=>confirm\("AI OPERATOR runs on the Facility Map, so this leaves the Defect Log\."/,
  "and the first thing it says is where it is going");

 /* STILL A LINK. An anchor that is prevented keeps the href, so a long-press
    can open the map in a second tab — which leaves this board standing and has
    nothing to warn about. A button would have thrown that away, and the
    stylesheet reaches this control by class on a descendant selector, so the
    element was never what was holding the look together. */
 assert.match(page,/<a className="feed-operator" href="\/\?operator=1"/,
  "the anchor and its href survive the fix");
 assert.match(page,/title="Opens the AI Operator on the Facility Map — this leaves the Defect Log"/,
  "and it names its destination before it is pressed, with no change to the label");
 assert.match(page,/>&#10022;<\/span> AI OPERATOR<\/a>/,"the label is untouched");
 assert.ok(css.includes(".feed-title .feed-operator,.log-advanced .feed-operator{"),
  "the look comes from the class on a descendant selector, not from the tag");

 /* THE SECOND SENTENCE ONLY WHEN THERE IS SOMETHING TO LOSE. Nothing here is
    unsaved — the editor is a full-screen shade, so a draft cannot be open while
    this control is reachable. What a reload costs is the way the BOARD is set,
    and warning about filters nobody set would train somebody to dismiss the one
    case that matters. */
 assert.match(page,/const boardIsNarrowed=Boolean\(search\.trim\(\)\)\|\|feedWindow!=="all"\|\|filter!=="all"\|\|Boolean\(quickFilter\)\|\|Boolean\(focusedBusId\)/,
  "every way this board can be narrowed counts, and nothing else does");
 assert.match(page,/\(boardIsNarrowed\?"\\n\\nThe way you have this board set/,
  "the cost is named only when there is one");
 assert.doesNotMatch(page,/leaveForOperator\(\)\?"/,
  "the warning is not the thing that decides what the message says");

 /* THE MAP'S OWN TWO COPIES ARE LEFT ALONE. They open the modal in place and
    leave no screen, so there is nothing for them to warn about — and a confirm
    on them would be a confirm on the surface the Operator actually runs on. */
 assert.doesNotMatch(map,/leaveForOperator/,"the Facility Map asks nobody");
 assert.match(map,/className="ai-operator-command" type="button" onClick=\{\(\)=>setOperatorOpen\(true\)\}/,
  "its command bar still opens the modal in place");
 assert.equal(map.split("setOperatorOpen(true)").length-1,3,
  "the command bar, the phone dock and the operator=1 landing — all in place");
 /* COUNTED IN THE CODE, NOT THE PROSE. The comment above the handler quotes
    the element it is explaining, and a count taken over the raw file reads that
    quotation as a second control — the same trap a release ago, where an
    assertion matched a comment rather than the thing it was about. */
 const pageCode=page.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 assert.equal(pageCode.split('href="/?operator=1"').length-1,1,
  "one navigating instance on this screen, and it is the one that now warns");
 assert.match(pageCode,/onClick=\{event=>\{if\(!leaveForOperator\(\)\)event\.preventDefault\(\)\}\}/,
  "and the guard is on that instance in the code, not described in a comment");
});

test("FOCUS shares one bus, as text or as a page",async()=>{
 const {busShareText,busShareHtml,busShareFilename}=await import("../src/lib/defects/bus-share.ts");
 /* Through `normalizeDefects`, the way every stored defect reaches the app.
    A hand-written literal is missing fields `defectLabel` reads straight off —
    it threw on `details.trim()` — and a fixture thinner than the real thing
    tests a code path the app never takes. */
 const {normalizeDefects}=await import("../src/lib/defects/repair-catalog.ts");
 const asDefect=(raw)=>normalizeDefects([raw])[0];
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");

 /* Curtis: "I want you to place a share button that will share as text or share
    as the page itself like the other function does but I want this is per bus
    in case I wanna send somebody a picture or share all the defects with a bus
    quickly and efficiently." */
 const bus={n:"17553",l:"bay-1",status:"In Service with Defects"};
 const rows=[
  {defect:asDefect({id:"a",category:"Bus Accessories",issue:"Doors - Front door opens / closes slowly",state:"open",createdAt:"2026-10-15T23:49:00.000Z"}),
   state:"OPEN",logged:"Oct 15 at 6:49 PM",updated:"Oct 15 at 6:51 PM",onSheet:true},
  {defect:asDefect({id:"b",category:"Operator/Driver Controls",issue:"Operating Controls - Horn",state:"open",createdAt:"2026-09-07T03:24:00.000Z"}),
   state:"OPEN",logged:"Sep 6 at 10:24 PM",updated:"Sep 6 at 10:24 PM"},
 ];
 const text=busShareText(bus,rows,"Oct 15 at 6:55 PM");

 /* THE BUS, THEN WHAT IS WRONG WITH IT. */
 assert.match(text,/^Bus 17553/,"the bus leads, because that is what the message is about");
 assert.match(text,/2 defects — shared Oct 15 at 6:55 PM/);
 assert.match(text,/^1\. .*Front door/m,"numbered the way the focus view numbers them");
 assert.match(text,/^2\. .*Horn/m);
 assert.match(text,/ON SHEET/,"a defect already on the sheet says so — it is somebody else's column, not a new job");

 /* ONE LABEL PER DEFECT. `defectLabel` already leads with the category, and
    prefixing it with `repairCategoryLabel` printed "Brakes — Brakes — Will not
    open". Found by reading the real share text out of a browser. */
 assert.doesNotMatch(text,/Bus Accessories — Bus Accessories/,"the category is not printed twice");
 assert.doesNotMatch(text,/Operator\/Driver Controls — Operator\/Driver Controls/);

 /* UPDATED IS DROPPED WHEN IT MATCHES LOGGED. On a record nobody has touched,
    the two are the same string and printing both makes a short list look long. */
 assert.match(text,/Logged Oct 15 at 6:49 PM {2}· {2}Updated Oct 15 at 6:51 PM/);
 assert.doesNotMatch(text,/Logged Sep 6 at 10:24 PM {2}· {2}Updated/);

 /* A BUS WITH NOTHING ON IT STILL SHARES, rather than sending a heading and a
    silence the reader has to interpret. */
 assert.match(busShareText(bus,[],"now"),/No defects on this bus\./);

 /* THE PAGE IS THE SAME CONTENT, SELF-CONTAINED. Opened from a text message on
    a phone in a garage with no signal, so nothing may be fetched. Rendered
    offline in Chromium at 390px: 2 cards, no external requests, no sideways
    scroll, ~2KB. */
 const html=busShareHtml(bus,rows,"Oct 15 at 6:55 PM");
 assert.match(html,/^<!doctype html>/);
 assert.doesNotMatch(html,/<script/i,"no scripts");
 assert.doesNotMatch(html,/https?:\/\//,"nothing fetched from anywhere");
 assert.doesNotMatch(html,/<link/i,"no stylesheet or font to load");
 assert.match(html,/<title>Bus 17553 — Pace South<\/title>/);
 assert.equal(html.split("<article>").length-1,2,"one card per defect");
 /* The wording is ESCAPED, because a defect typed by a mechanic is not markup. */
 const risky=busShareHtml({n:"1<b>",l:""},[{defect:asDefect({id:"x",category:"Brakes",issue:"Chamber leak",state:"open",details:"a \"quoted\" <tag> & more"}),state:"OPEN",logged:"now",updated:"now"}],"now");
 assert.doesNotMatch(risky,/<b>1<b>/);
 assert.match(risky,/&lt;tag&gt; &amp; more/);
 assert.match(risky,/&quot;quoted&quot;/);

 assert.match(busShareFilename("17553",new Date(2026,9,15,12,0,0)),/^pace-bus-17553-2026-10-15\.html$/);
 /* A record thin enough to have lost its number still names a file. */
 assert.match(busShareFilename("",new Date(2026,9,15,12,0,0)),/^pace-bus-bus-2026-10-15\.html$/);
 /* THE DATE ON THE WALL CLOCK, NOT UTC — ASSERTED IN THIS SHOP'S OWN ZONE.

    Shared at seven in the evening in Chicago, `toISOString()` has already
    rolled over to tomorrow, so the file carried one date while the stamp inside
    it carried another — and the filename is what somebody sorts by.

    The zone is set here on purpose. This container runs UTC, where local and
    UTC are the same thing, so the first version of this assertion passed
    against BOTH implementations and proved nothing: a mutation putting
    `toISOString()` back went green. A timezone test in a UTC container has to
    name a zone or it is not a timezone test. */
 const realZone=process.env.TZ;
 process.env.TZ="America/Chicago";
 try{
  const evening=new Date(2026,9,15,19,30,0);
  assert.equal(evening.toISOString().slice(0,10),"2026-10-16",
   "the fixture must be an evening that UTC has already carried into tomorrow");
  assert.match(busShareFilename("17553",evening),/-2026-10-15\.html$/,
   "an evening share is named today, not tomorrow");
  assert.match(busShareFilename("17553",new Date(2026,0,1,23,59,0)),/-2026-01-01\.html$/,
   "and the last minute of a year does not borrow the next one");
 }finally{
  if(realZone===undefined)delete process.env.TZ; else process.env.TZ=realZone;
 }

 /* THE SAME THREE CONTROLS THE DRAWER CARRIES, wired to this bus. */
 assert.match(page,/<div className="log-focus-share" role="group"/);
 assert.match(page,/onClick=\{copyFocusBus\}/);
 assert.match(page,/onClick=\{shareFocusBusText\}/);
 assert.match(page,/onClick=\{shareFocusBusPage\}/);
 /* Text falls back to the clipboard where there is no share sheet, the same
    order the drawer settled on — driven in Chromium with navigator.share
    deleted, where SHARE still put the text on the clipboard. */
 assert.match(page,/if\(typeof navigator\.share!=="function"\)\{await copyFocusBus\(\);return\}/);
 /* Dismissing the sheet is a decision, not a failure. */
 assert.match(page,/if\(!\(error instanceof DOMException&&error\.name==="AbortError"\)\)setFocusShareStatus\("error"\)/);
 /* Its own status, because the drawer can be open at the same time. */
 assert.match(page,/const \[focusShareStatus,setFocusShareStatus\]=useState/);
 /* EVERY CHANGE OF BUS, not only the close. The focus dialog does not trap the
    keyboard, so a tab can reach another card's FOCUS button and go straight
    from bus A to bus B without passing through empty — and the first cut, whose
    own comment claimed otherwise, carried A's SHARED onto B. */
 assert.match(page,/useEffect\(\(\)=>\{setFocusShareStatus\(""\)\},\[focusedBusId\]\)/,
  "opening another bus never greets somebody with the last one's SHARED");

 /* THE SHARE FOLLOWS THE WINDOW NOW, AND THAT REVERSED A DECISION OF CURTIS'S.
    It used to carry the WHOLE bus, because he asked for that in as many words
    - "share all the defects with a bus" - after the first cut shared a
    filtered two under a heading reading "2 defects", which tells its reader
    nothing about there being a filter.

    He then hit the other side of it: "when I hit like the last 24 hours of the
    shift, it gives me buses, but I think it's giving me more than the defects
    that I put down in the last 24 hours." Asked which way, he chose: "Follow
    the window, and add the swipe." Both readings were defensible; this is the
    one he picked after using the other. The old reasoning stays in the page's
    own comment, because it is why this ever carried the whole bus.

    So the share is WHAT IS ON SCREEN minus anything swiped away, and the two
    reasons are counted apart - a view narrowing something is not a person
    deciding it. */
 assert.match(page,/const focusedAllRecords=focusedBusId\?records\.filter\(record=>record\.bus\.id===focusedBusId\):\[\]/,
  "the whole-bus list is still needed, to count what the view held back");
 assert.match(page,/const focusShareRows=\(\):BusShareDefect\[\]=>focusScope\.rows\.map/,
  "the share is built from the scope, not from the unfiltered records");
 /* ALL THREE OUTPUTS READ ONE LIST, AND ALL THREE REFUSE AN EMPTY ONE.

    BALANCED BRACES, NOT A 700-CHARACTER WINDOW, and that is a fix. The first
    version of this loop sliced 700 characters from each handler's name, which
    on `copyFocusBus` - four lines long - ran straight into `shareFocusBusText`
    below it. Its `focusShareRows()` satisfied the assertion for BOTH, so
    deleting the call from `copyFocusBus` left this green. A cold read found it
    by mutation. One handler, one body. */
 const row=id=>({defect:{id}});
 const bodyOf=(source,name)=>bodyOfSource(source,name);
 /* And the slicer itself is checked, because a broken extractor is a gate that
    passes everything: a body that ran on would carry the NEXT handler's name. */
 assert.ok(!bodyOf(page,"copyFocusBus").includes("shareFocusBusText"),
  "the extractor has to stop at the end of the handler it was asked for");
 for(const output of ["copyFocusBus","shareFocusBusText","shareFocusBusPage"]){
  const body=bodyOf(page,output);
  assert.ok(body.includes("focusShareRows()"),output+" has to share the same list as the others");
  /* NOTHING LEFT TO SEND IS A REFUSAL. Hiding all three defects on a bus and
     pressing COPY put "0 defects - shared ..." and "No defects on this bus." on
     the clipboard for a bus with three open defects, which reads as a CLEAN
     vehicle - the most damaging thing this app could say about one. Asked in
     each body rather than once in a wrapper, because SHARE falls back to COPY
     and a guard on one path is a guard on the path somebody happened to take. */
  assert.ok(body.includes("focusShareIsEmpty(focusScope)"),
   output+" has to refuse an empty share rather than send a clean bus");
 }
 /* AND THE BUTTONS GO DEAD, so nobody presses a live-looking one and wonders.
    Three of them, each carrying the flag. */
 assert.equal((page.match(/disabled=\{focusShareEmpty\}/g)||[]).length,3,
  "COPY, SHARE and SHARE PAGE all have to go dead on an empty share");
 assert.match(page,/const focusShareEmpty=focusShareIsEmpty\(focusScope\)/);
 /* THE REFUSAL ITSELF, DRIVEN. */
 assert.equal(focusShareIsEmpty(focusShareScope([row("x")],[row("x")],[])),false);
 assert.equal(focusShareIsEmpty(focusShareScope([row("x")],[row("x")],["x"])),true);
 /* AND IT SAYS SO IN WORDS RATHER THAN IN A NUMBER: "SHARING 0 OF 3" is a count
    where somebody needs an instruction. */
 assert.match(focusShareScopeNote(focusShareScope([row("x")],[row("x")],["x"])),
  /^NOTHING LEFT TO SHARE — 1 YOU SWIPED AWAY$/);
 /* THE HANDLERS HAVE TO BE WIRED TO THE ROW THEY WERE GIVEN, and these two
    gates exist because a cold read got two mutations past the suite: hiding
    THE FIRST ON-SCREEN ROW instead of the one swiped or pressed, and PUT BACK
    calling `setFocusExcluded([])` so it restored everything. Both were
    invisible, because everything around them drives `excludeFromFocusShare`
    and `putBackLastExclusion` as pure functions and then only greps the
    handlers for a name.

    A RENDER WOULD BE THE RIGHT GATE AND THIS SUITE CANNOT RENDER THIS: the
    helper runs the production worker SERVER-SIDE, where there is no
    LocalStorage and therefore no board. So these are source gates, deliberately
    about the two specific shapes, and the browser run is the witness for the
    wiring. Said plainly rather than left looking like a behavioural test. */
 {
  const hide=bodyOfSource(page,"focusHideRecord");
  assert.ok(/excludeFromFocusShare\(current,record\.defect\.id\)/.test(hide),
   "the hide excludes the row it was handed, by id");
  assert.ok(!/\[0\]|\.find\(|rows\[/.test(hide),
   "and never reaches for a row of its own choosing: "+hide.slice(0,160));
  const back=bodyOfSource(page,"focusPutBack");
  assert.ok(/putBackLastExclusion\(/.test(back),"PUT BACK asks the lib which one comes back");
  assert.ok(!/setFocusExcluded\(\[\]\)/.test(back),
   "and never clears the whole list - that is what changing bus does");
  assert.ok(/if\(!restored\)return/.test(back),
   "a press that restores nothing returns rather than re-rendering");
 }
 /* AND THE SCOPE IS COMPUTED IN THE LIB, not on the page. The reason is the
    general one and it is enough: a decision inside a `page.tsx` is reachable by
    that page and nothing else. An earlier version of this comment said the MCP
    route asks the same question about a bus - it does not, PR39's five tools
    are read-only and none of them has a share or a window, and naming a caller
    that does not exist is how a reader stops believing the rest. */
 assert.match(page,/focusShareScope\(focusedGroup\?focusedGroup\.records:\[\],focusedAllRecords,focusExcluded\)/);
 /* AND THE PANEL SAYS WHAT IT IS ABOUT TO SEND - from an ALWAYS-MOUNTED slot.
    This used to assert the conditional `note && <small>`, which was the shape
    that moved the whole list by 70px on a phone and 115px on the shop computer
    on every hide and every undo: the note and PUT BACK sit ABOVE the rows, so
    mounting them put a different row under the thumb that was about to swipe
    next. The slot holds its height; only its contents change. */
 assert.match(page,/<div className="log-focus-share-slot"/);
 assert.match(page,/<small className="log-focus-share-scope">\{focusShareScopeNote\(focusScope\)\}<\/small>/,
  "and the panel has to say what it is about to send");
 /* AND UNCONDITIONALLY. Matching the `<small>` alone was not enough: wrapping
    the same markup back up in `note && …` left that substring intact and this
    gate green, which is the mutation that put the 70px jump back. The absence
    of the conditional is the thing to assert. */
 assert.doesNotMatch(page,/focusShareScopeNote\(focusScope\)&&/,
  "the note is mounted whatever it says, or the list jumps on every hide");
 assert.match(css,/\.log-focus-share \.log-focus-share-slot\{grid-column:1\/-1;min-height:44px/,
  "the slot keeps its height whether it holds anything or not");
 /* THE SWIPED-AWAY LIST IS NEVER A FIELD ON A DEFECT. The cloud ships unknown
    defect fields to every other phone and a merge replaces a defect wholesale,
    so one person's "don't send this one" would hide it for the whole shop -
    the reason a HOLD and a FULL SWEEP do not travel either. */
 assert.match(page,/const \[focusExcluded,setFocusExcluded\]=useState<string\[\]>\(\[\]\)/);
 /* THREE LITERAL STRINGS WAS NOT A GATE, and a cold read said so: the first
    version of this listed "defect.excludedFromShare", "excludedFromShare:" and
    "pace-focus-share", so storing the same thing as `defect.hiddenFromShare`
    or under `pace-focus-hidden-v1` walked straight past it. The shape of the
    mistake is what has to be caught, not one spelling of it. */
 assert.doesNotMatch(page,/"pace-[a-z0-9-]*(focus|swipe|hid|exclud|share)[a-z0-9-]*"/,
  "the swiped-away list is React state for this one look at this one bus - never a storage key");
 /* AND NEVER A FIELD WRITTEN ONTO A DEFECT. Anchoring this on `defect.` was
    not enough either: `(record.defect as {hiddenFromShare?:boolean})
    .hiddenFromShare=true` has `).` in front of the dot and walked past it. The
    HANDLER's whole body is the thing to read - it may set React state and
    nothing else. */
 {
  const hide=bodyOf(page,"focusHideRecord");
  assert.ok(/setFocusExcluded\(/.test(hide)&&/setFocusHideNote\(/.test(hide),
   "the hide handler sets the two pieces of state it owns");
  assert.ok(!/[)\]a-zA-Z]\.[A-Za-z]+\s*=[^=>]/.test(hide),
   "and assigns to nothing at all: a hide is a property of this look at this bus");
  assert.ok(!/localStorage|writeJSON|saveDefectLogRecord|applyDefectToBuses|setFleet|setDownEntries/.test(hide),
   "a hide must not reach storage, a record or the board");
 }
 assert.doesNotMatch(page,/\.[A-Za-z]*(xclud|idden)[A-Za-z]*\s*=[^=>]/,
  "nothing anywhere on this page writes an exclusion onto an object");
 /* AND THE SCOPE ITSELF WRITES NOTHING ONTO A RECORD, which is the property
    those two gates are circling. The cloud ships every defect field it has no
    column for inside `detail` and a merge replaces a defect wholesale by id, so
    a flag on the record would hide the defect on every other phone in the shop
    - the same reason a HOLD and a FULL SWEEP never travel. */
 {
  const records=[row("1"),row("2"),row("3")];
  const before=JSON.stringify(records);
  focusShareScope(records.slice(0,2),records,["1"]);
  assert.equal(JSON.stringify(records),before,"focusShareScope must not touch a record");
 }
 /* AND IT GOES WITH THE BUS, like the SHARED status beside it: tabbing from
    bus A's FOCUS to bus B's never passes through empty. */
 assert.match(page,/useEffect\(\(\)=>\{setFocusExcluded\(\[\]\)\},\[focusedBusId\]\)/);
 /* PUT BACK IS ON THE PAGE, not behind a menu - the rule the Down Sheet's own
    PUT BACK follows, because an accidental swipe is exactly when nobody goes
    looking for an undo. */
 assert.match(page,/className="focus-put-back"[\s\S]{0,200}?onClick=\{focusPutBack\}/);

 /* THE SCOPE'S BEHAVIOUR, driven rather than read. */
 const all=[row("1"),row("2"),row("3"),row("4")],onScreen=[row("1"),row("2")];
 let scope=focusShareScope(onScreen,all,[]);
 assert.deepEqual([scope.rows.length,scope.total,scope.hiddenByBoard,scope.hiddenByHand],[2,4,2,0]);
 scope=focusShareScope(onScreen,all,["1"]);
 assert.deepEqual([scope.rows.map(one=>one.defect.id),scope.hiddenByBoard,scope.hiddenByHand],[["2"],2,1]);
 assert.match(focusShareScopeNote(scope),/SHARING 1 OF 4/);
 assert.match(focusShareScopeNote(scope),/2 OUTSIDE THIS VIEW/);
 assert.match(focusShareScopeNote(scope),/1 YOU SWIPED AWAY/);
 /* SILENT WHEN THE SHARE IS THE WHOLE BUS: "sharing 4 of 4" is noise. */
 assert.equal(focusShareScopeNote(focusShareScope(all,all,[])),"");
 /* PUT BACK TAKES THE LAST ONE, so pressing it walks the swipes off in
    reverse rather than restoring some arbitrary row. */
 let excluded=excludeFromFocusShare(excludeFromFocusShare([],"a"),"b");
 assert.deepEqual(excluded,["a","b"]);
 assert.deepEqual(excludeFromFocusShare(excluded,"a"),["a","b"],"the same row twice is still one exclusion");
 assert.deepEqual(putBackLastExclusion(excluded),{excluded:["a"],restored:"b"});
 assert.deepEqual(putBackLastExclusion([]),{excluded:[],restored:null});
 /* AND AN EXCLUSION THAT HAS LEFT THE SCREEN IS NEITHER RESTORED NOR THROWN
    AWAY. Two different bugs, one after the other.

    First, `focusExcluded` is only cleared when the BUS changes, so a defect
    swiped away and then taken off screen by the window, the filter or a sync
    left an id the counts no longer see - and PUT BACK popped THAT one,
    restoring nothing while the button still read PUT BACK.

    The fix for that filtered the list and then STORED the filtered result, so
    one press silently dropped every off-screen exclusion: swipe A and B away,
    let A leave the view, press PUT BACK for B, and A came back into the share
    on its own the next time the window widened, with `hiddenByHand` reading 0.
    A cold read found the second one. */
 assert.deepEqual(putBackLastExclusion(["a","b"],["b"]),{excluded:["a"],restored:"b"},
  "the off-screen exclusion is kept, not swept up with the press");
 assert.deepEqual(putBackLastExclusion(["a","b"],["a"]),{excluded:["b"],restored:"a"},
  "and the LAST VISIBLE one is what comes back, not simply the last one");
 assert.deepEqual(putBackLastExclusion(["a","b"],["z"]),{excluded:["a","b"],restored:null},
  "nothing on screen is hidden, so nothing is put back and nothing is lost");
 {
  const held=["a","b"];
  assert.equal(putBackLastExclusion(held,["z"]).excluded,held,
   "and that press returns the same array, so it is not a re-render that does nothing");
 }
 assert.deepEqual(putBackLastExclusion([],["a"]),{excluded:[],restored:null});
 /* The page passes what is on screen; without it the rule is the plain one. */
 assert.match(page,/putBackLastExclusion\(focusExcluded,live\)/,
  "the page hands PUT BACK the on-screen ids rather than filtering the list itself");
 /* AND IT STORES EXACTLY WHAT THE LIB RETURNED. Checking only HOW THE CALL IS
    SPELLED left the F22 bug a way back in AFTER it:
    `setFocusExcluded(excluded.filter(id=>live.includes(id)))` is the same
    permanent loss of off-screen exclusions, one line lower, and it passed the
    whole suite. A reviewer ran that mutant. The lib tests above are the real
    coverage of the RULE; this is the coverage of the WIRING, and the wiring is
    the half a render would check if this suite could render it. */
 {
  /* THIS GATE PINS AN EXACT SHAPE. IT DOES NOT UNDERSTAND THE CODE, and saying
     so is the point of this comment, because the two versions before it each
     claimed more than they did.

     The first banned `.filter(` after the call. A reviewer got three
     respellings past it. The second counted the `setFocusExcluded` calls and
     claimed "every prune after the lib needs a second write"; that was FALSE,
     and five one-write mutants proved it - rebinding the lib's answer before
     storing it (a `for` loop, `filter?.()`, `Array.prototype.filter.call`,
     `toSpliced`) or mutating the stored array afterwards with `.pop()`.

     Each round of that is an arms race a text gate loses, because the thing
     being checked is WIRING and this suite cannot render this surface: the
     helper runs the production worker server-side, where there is no
     LocalStorage and so no board. So the gate stops pretending to reason and
     pins the three statements as one string instead.

     THAT MEANS A LEGITIMATE REFACTOR WILL FAIL THIS, and that is correct rather
     than unfortunate. Renaming `excluded`, inserting a line, reordering the
     two - any of them breaks a pin that only ever meant "this exact code, which
     was verified in a browser, is still the code". Failing sends the next
     person to re-verify it there, which is where the wiring was always checked.
     The browser run is the witness; this is the tripwire that says the witness
     is stale. */
  const back=bodyOfSource(page,"focusPutBack");
  const flat=back.replace(/\s+/g,"");
  assert.ok(flat.includes("const{excluded,restored}=putBackLastExclusion(focusExcluded,live);if(!restored)return;setFocusExcluded(excluded);"),
   "PUT BACK stores exactly what the lib handed back, with nothing in between: "+back.slice(0,160));
  /* AND THE LIB'S LIST IS NAMED TWICE AND NO MORE - once where it is received
     and once where it is stored. A third mention is a rebind, a rebuild or a
     mutation, which is every one of the five one-write ways round the old
     count. */
  assert.equal((flat.match(/\bexcluded\b/g)||[]).length,2,
   "the lib's list is named once and stored once, never rebuilt or mutated: "+back.slice(0,160));
  /* AND THE SETTER IS NAMED ONCE IN THIS BODY, which the pin alone does NOT
     give. Dropping this for the pin let two mutants back in: a second
     `setFocusExcluded` call APPENDED after the pinned three statements leaves
     that substring intact and names `excluded` only twice, so both of the other
     assertions pass while the off-screen ids are pruned on the second write.
     Measured, not reasoned - the two came back the moment this line went.

     IT COUNTS THE IDENTIFIER, NOT CALLS, and that wording is the THIRD
     correction to this one comment. It read "exactly one write" while the regex
     matched the spelling `setFocusExcluded(` - so `.call(null,...)`,
     `.apply(null,[...])` and `const write=setFocusExcluded;write(...)` each
     appended a second write and passed all three assertions. Reproduced, all
     three, and all three die on counting the bare identifier instead.

     WHAT IT STILL CANNOT SEE is a write through a helper defined OUTSIDE this
     function, and no text check on this body can - which is the same ceiling
     the pin above admits to. Three assertions, three different ways round, none
     of them enough alone, and the browser run is still the witness. */
  assert.equal((flat.match(/\bsetFocusExcluded\b/g)||[]).length,1,
   "PUT BACK names the setter once in this body: "+back.slice(0,160));
 }

 /* THE GESTURE IS A DECISION, NOT A DISTANCE, and the panel it sits in scrolls
    vertically under the same thumb. The Facility Map paid for the naive
    version: a plain distance test "carried garage-6 to wall-7 and scrolled the
    page zero pixels". */
 assert.equal(swipeHidesRow(-80,5),true,"a clean left swipe hides the row");
 assert.equal(swipeHidesRow(-80,60),false,"a mostly-vertical drag is a scroll");
 assert.equal(swipeHidesRow(-30,2),false,"a short drag is not a decision");
 assert.equal(swipeHidesRow(80,2),false,"rightward does nothing - one direction destroys, not both");
 assert.equal(swipeHidesRow(Number.NaN,0),false);
 assert.equal(swipeHidesRow(0,Number.NaN),false);
 /* THE THRESHOLDS ARE THE EXPORTED ONES, so a gate cannot pass while the
    constant moves out from under it. 56px commits; a pixel short does not. */
 assert.equal(swipeHidesRow(-SWIPE_COMMIT_PX,0),true,"exactly the commit distance is a swipe");
 assert.equal(swipeHidesRow(-(SWIPE_COMMIT_PX-1),0),false,"a pixel short is not");
 /* AND THE AXIS LOCK IS THE RATIO, not a feeling about it: at the boundary the
    sideways travel has to BEAT the vertical by the margin, not tie it. */
 assert.equal(swipeHidesRow(-90,90/SWIPE_AXIS_RATIO),false,"a tie on the axis ratio is a scroll");
 assert.equal(swipeHidesRow(-90,90/SWIPE_AXIS_RATIO-1),true);
 /* HOW FAR THE ROW FOLLOWS THE FINGER, capped so a long drag cannot pull a row
    off its own panel, and zero to the right because there is nothing there. */
 assert.equal(swipeOffsetPx(-10),-10);
 assert.equal(swipeOffsetPx(-500),-(SWIPE_COMMIT_PX+24),"a long drag is capped");
 assert.equal(swipeOffsetPx(40),0,"rightward reads as zero, not as a positive offset");
 assert.equal(swipeOffsetPx(0),0);
 assert.equal(swipeOffsetPx(Number.NaN),0);

 const swipeRow=await readFile(new URL("../app/defect-log/_components/swipe-away-row.tsx",import.meta.url),"utf8");
 /* COMMENTS STRIPPED FIRST, with the project's own string-aware stripper: the
    file EXPLAINS the rules it follows, and a gate that reads prose as code
    fails on an accurate comment. The same trap the DS badge gate hit. */
 const swipeCode=stripCodeComments(swipeRow);
 /* IT MUST NOT BLOCK SCROLLING: no non-passive listener and no preventDefault
    anywhere in the row. `touch-action` IS NO LONGER ON THIS LIST, and taking it
    off is a fix rather than a relaxation - see the CSS gate below. */
 for(const blocker of ["preventDefault","passive:false","touchmove"])
  assert.ok(!swipeCode.includes(blocker),"the swipe row names "+blocker+", which is how a panel stops scrolling");
 /* A GESTURE IS NOT REACHABLE WITH A MOUSE OR A KEYBOARD, and Curtis reads
    this app on the shop computer too, so every row carries a real control
    that does the same thing - and the control has to SAY which defect it
    drops. `hideLabel` reaching the aria-label is not enough on its own: the
    page can hand it "", and four buttons reading "Hide" is what a screen
    reader then gets. */
 assert.match(swipeRow,/className="focus-hide-defect"/);
 /* AND IT COMES BEFORE THE CONTENT, because it is DRAWN above it. The button
    is `position:absolute` in the row's top-right corner and was the LAST child,
    so a keyboard reached it after EDIT DEFECT, MARK FIXED and PTR - four stops
    below where it visibly sits (WCAG 2.4.3, found by a cold read). Absolute
    positioning means the markup order costs nothing on screen. */
 assert.ok(swipeRow.indexOf('className="focus-hide-defect"')<swipeRow.indexOf("{children}"),
  "tab order has to follow the eye: HIDE is drawn first, so it comes first");
 assert.match(swipeRow,/onClick=\{\s*\(\)\s*=>\s*onHide\("button"\)\s*\}/,
  "the HIDE control has to work without a gesture");
 assert.match(swipeRow,/aria-label=\{\s*hideLabel\s*\}/);
 {
  const label=page.match(/hideLabel=\{([^}]*)\}/);
  assert.ok(label,"the page has to pass a hide label");
  assert.ok(label[1].includes("repairCategoryLabel(record.defect.category)"),
   "and the label has to name the defect it drops: got "+label[1]);
 }
 /* AND THE CONTROL STAYS VISIBLE AND REACHABLE. Resolved through the cascade
    rather than read off one rule, because that is how this project has been
    bitten: a broader selector elsewhere setting display:none would leave the
    swipe as the only way to hide a row, on the one device that cannot swipe. */
 for(const width of [390,1180]){
  const hide=effectiveStyle(css,{tag:"button",classes:["focus-hide-defect"],
   ancestors:[{tag:"div",classes:["log-focus-body"]},{tag:"article",classes:["log-focus-record","open"]}]},width);
  assert.notEqual(hide.display,"none","HIDE is the desktop route and cannot be display:none at "+width);
  assert.notEqual(hide.visibility,"hidden");
  assert.equal(hide["min-height"],width<=760?"44px":"36px","HIDE has to stay a target at "+width);
 }
 assert.doesNotMatch(swipeRow,/<button[^>]*\shidden\b/,"a hidden HIDE button is no control at all");
 assert.doesNotMatch(swipeRow,/aria-hidden="true"[\s\S]{0,80}focus-hide-defect/);
 /* A CANCELLED POINTER IS THE BROWSER SAYING "this was a scroll", so it can
    never count as a decision to hide something. */
 assert.match(swipeRow,/onPointerCancel=\{\s*\(\s*\)\s*=>\s*end\(false\)\s*\}/);
 /* AND THE RELEASE ASKS `swipeHidesRow` RATHER THAN COMMITTING. `end(true)` on
    pointerup passed every assertion above it, because every one of them was
    about the decision function and none about whether the component called it.
    Found by mutation in a cold read. */
 assert.match(swipeCode,/end\(\s*swipeHidesRow\(\s*event\.clientX\s*-\s*from\.x\s*,\s*event\.clientY\s*-\s*from\.y\s*\)\s*\)/,
  "the release has to ask the decision function, not assume the answer");
 assert.ok(!/end\(\s*true\s*\)/.test(swipeCode),"nothing may commit a hide without asking");
 /* THE ROW STOPS FOLLOWING A FINGER THAT IS CLEARLY SCROLLING, or it creeps
    sideways through a diagonal scroll and snaps back, which looks like a bug
    even though nothing was hidden. Deleting this line changed no assertion. */
 assert.match(swipeCode,/onPointerMove[\s\S]{0,400}?Math\.abs\(dy\)\s*>\s*Math\.abs\(dx\)/,
  "the drag has to stop following a vertical finger");
 /* AND A SECOND FINGER OR A MOUSE NEVER STARTS ONE. A second finger landing
    mid-drag restarts the measurement from its own position, which reads as a
    jump back; a leftward mouse drag is text selection and would otherwise
    satisfy all three conditions and silently drop that defect. */
 assert.match(swipeCode,/if\s*\(\s*!event\.isPrimary\s*\|\|\s*event\.pointerType\s*===\s*"mouse"\s*\)\s*return/,
  "a non-primary pointer and a mouse must not arm the gesture");
 /* A DRAG THAT ENDS OFF THE ROW STILL ENDS. Without the capture a gesture
    finishing outside the element never reached `onPointerUp` and left the row
    stuck mid-swipe with its start point still armed. */
 assert.match(swipeCode,/setPointerCapture\(event\.pointerId\)/);
 assert.match(swipeCode,/onLostPointerCapture=\{/);

 /* A DOWNLOAD IS NOT A COPY. `shareOrDownloadFile` returns "saved" when it fell
    back to downloading; folding that into "copied" lit the COPY button with
    COPIED! over a clipboard nothing had touched. */
 assert.match(page,/setFocusShareStatus\(outcome==="cancelled"\?"":outcome==="shared"\?"shared":"saved"\)/);
 assert.match(page,/focusShareStatus==="saved"\?"SAVED TO THIS DEVICE"/);

 /* A YEAR THAT IS NOT THIS ONE IS NAMED. `timeLabel` draws "Sep 6 at 10:24 PM",
    which is right on today's screen and wrong in a file meant to still read a
    year from now. */
 assert.match(page,/const shareTimeLabel=\(iso:string\)=>\{/);
 assert.match(page,/at\.getFullYear\(\)!==new Date\(\)\.getFullYear\(\)\?", "\+at\.getFullYear\(\):""/);
 assert.match(page,/logged:shareTimeLabel\(record\.createdAt\)/);

 /* THE LIVE REGION IS MOUNTED whether or not it has anything to say: one that
    appears with its text is a new element to a screen reader rather than an
    update, and is read late or not at all. Empty it draws nothing. */
 assert.match(page,/<small className="log-focus-share-status" role="status" aria-live="polite">/);
 /* AND IT CARRIES ALL FOUR OUTCOMES, COPY INCLUDED. On a copy the only signal
    was the button's own label changing to COPIED!, which a screen reader does
    not announce — the outcome a mechanic uses most was the one nobody was
    told about. */
 assert.match(page,/\{focusShareStatus==="copied"\?"COPIED":/);
 /* HIDDEN THE SCREEN-READER WAY WHEN EMPTY, NOT WITH `display:none`. That was
    the first spelling and it undid the point of mounting the region at all: a
    display:none element is not in the accessibility tree, so the text arriving
    moved it from ABSENT to present — the insertion this is meant to avoid.
    Out of flow instead: no grid row, no gap, in the tree throughout. */
 assert.match(css,/\.log-focus-share>\.log-focus-share-status:empty\{position:absolute;width:1px;height:1px;[^}]*clip-path:inset\(50%\)/);
 assert.doesNotMatch(css,/\.log-focus-share>small:empty\{display:none\}/,
  "display:none takes it out of the accessibility tree");
 assert.match(css,/\.log-focus-share\{position:relative;display:grid;/,
  "and the row is the containing block, so the hidden region cannot escape it");
 /* The state wording and the times come from the page, not a second copy. */
 assert.match(page,/state:STATE_LABELS\[record\.defect\.state\]\|\|record\.defect\.state/);
 /* And the share's own formatter BUILDS ON `timeLabel` rather than replacing
    it, so the line in the message and the line on the card cannot drift apart
    — the year is the only thing added. */
 assert.match(page,/return timeLabel\(iso\)\+\(at\.getFullYear\(\)/);

 /* 44px at phone width, matching every other row in this modal. */
 assert.match(css,/\.log-focus-share button\{min-height:36px/);
 assert.match(css,/\.log-focus-share button\{min-height:44px;font-size:10px\}/);
 assert.match(css,/\.log-focus-share\{position:relative;display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);

 /* `touch-action:pan-y` IS REQUIRED, AND THIS GATE USED TO BAN IT.

    That inversion is the worst thing in this file's history, because it did not
    merely miss a bug - it locked one in. The row's own comment claimed no
    `touch-action` was needed, "a horizontal drag inside a vertical scroller
    does not scroll it anyway, so there is nothing to suppress", and this test
    enforced the claim. The browser does not work that way: with
    `touch-action:auto` it claims the gesture as soon as a finger moves and
    sends `pointercancel`, which the row correctly treats as "not a swipe" - so
    on a phone the swipe NEVER FIRED. Reproduced with a real CDP touch drag at
    390px: pointerdown > pointermove > pointercancel, three rows still there. It
    worked with a mouse, which is why it looked fine on the shop computer.

    So the gate is the other way round now, and it is resolved THROUGH THE
    CASCADE rather than matched as a string, because `none` arriving from a
    broader selector would read identically to this rule being right. `pan-y`
    keeps vertical panning with the browser and hands horizontal movement to the
    component; `none` would take the panel's own scroll away. */
 for(const width of [390,620,1180]){
  const record=effectiveStyle(css,{tag:"article",classes:["log-focus-record","open"],
   ancestors:[{tag:"div",classes:["log-focus-body"]}]},width);
  assert.equal(record["touch-action"],"pan-y",
   "the swipe row needs pan-y at "+width+"px: auto cancels the gesture, none kills the scroll");
 }
 /* AND THE DIALOG DOES NOT RE-CENTRE WHEN THE LIST GETS SHORTER. `.log-shade`
    centres its dialog and `.log-focus` is auto-height up to 92vh, so on any bus
    whose list is under that cap - 2 to 7 defects, the ordinary case - hiding a
    row made the panel shorter and the whole dialog moved: measured +61px on
    HIDE and -61px on PUT BACK at 1180 with three defects, carrying every
    remaining row and the control under the cursor with it.

    The always-mounted slot is the other half of this and it works (the share
    bar measures 103px before and after), but a slot cannot hold a CENTRED
    dialog still - the thing moving is the dialog's own box. This was first
    dismissed as a fixture artefact, measured with eight defects where the panel
    is already at its cap and cannot shrink; a reviewer measured three and was
    right.

    Only above the phone breakpoint: below it the panel is already full-screen
    and there is nothing to re-centre. */
 assert.match(css,/@media\(min-width:761px\)\{\s*\.log-focus-shade\{align-items:flex-start\}/,
  "a windowed focus dialog has to be pinned to the top, or it re-centres on every hide");
 {
  const shade=effectiveStyle(css,{tag:"div",classes:["log-shade","log-focus-shade"]},1180);
  assert.equal(shade["align-items"],"flex-start","at 1180 the dialog hangs from the top");
  const phone=effectiveStyle(css,{tag:"div",classes:["log-shade","log-focus-shade"]},390);
  assert.equal(phone["align-items"],"stretch","and on a phone it is full-screen, as it was");
 }
 /* AND A SELECTION ALREADY SITTING ON THE ROW EATS THE NEXT SWIPE. Long-press a
    defect's text and the browser hands the following drag to the selection
    handles. Scoped to touch on purpose: selecting a defect with a mouse to
    paste it is ordinary on the shop computer, and a mouse never starts a swipe,
    so there is nothing to protect there. Matched as text rather than resolved,
    because the resolver answers width questions and this one is not about
    width. */
 assert.match(css,/@media\(hover:none\) and \(pointer:coarse\)\{\s*\.log-focus-record\{-webkit-user-select:none;user-select:none\}/,
  "a touch-only user-select guard, so the desktop keeps its text");
 assert.doesNotMatch(css,/^\.log-focus-record\{[^}]*user-select:none/m,
  "and it is not applied unconditionally - that would take text selection off the shop computer");

 /* THE SCOPE NOTE MOVED INSIDE THE SLOT AND ITS RULE DID NOT FOLLOW IT. The
    selector was `.log-focus-share>.log-focus-share-scope`, written when the
    note was a direct child of the bar; inside the always-mounted slot it
    matched nothing, and neither did `.log-focus-share>small` beside it, so the
    note drew at the browser's default `small` size in inherited ink inside a
    bar built for 7px. A `>` is a claim about the markup, and moving an element
    is how the claim stops being true - silently. Resolved, so the next move
    fails here. */
 for(const [width,size] of [[390,9],[1180,7]]){
  const note=effectiveStyle(css,{tag:"small",classes:["log-focus-share-scope"],
   ancestors:[{tag:"div",classes:["log-focus-share"]},{tag:"div",classes:["log-focus-share-slot"]}]},width);
  assert.equal(note.fontSizePx,size,"the scope note has to be bar-sized at "+width+"px");
  assert.ok(note.color&&note.color.includes("--log-accent"),"and coloured as a notice");
 }
 /* AND THE HIDE ANNOUNCEMENT IS NEVER DRAWN, in or out of the slot: the visible
    answer to a hide is the row going. */
 assert.match(css,/\.log-focus-share \.log-focus-share-live\{position:absolute;width:1px;height:1px;[^}]*clip-path:inset\(50%\)/);
 /* A REFUSED BUTTON LOOKS REFUSED. */
 assert.match(css,/\.log-focus-share button:disabled\{[^}]*cursor:not-allowed/);

 /* THE SLOT'S TWO CHILDREN SHARE ONE ROW. `width:100%` on PUT BACK was left
    over from the build where it spanned the grid; inside the slot it is a flex
    item beside the note, and 100% squeezed the sentence saying what will be
    sent down to a word a line. */
 assert.doesNotMatch(css,/\.focus-put-back\{[^}]*width:100%/,
  "PUT BACK shares the slot with the note rather than taking the whole row");
 for(const width of [390,1180]){
  const back=effectiveStyle(css,{tag:"button",classes:["focus-put-back"],
   ancestors:[{tag:"div",classes:["log-focus-share"]},{tag:"div",classes:["log-focus-share-slot"]}]},width);
  assert.equal(back["min-height"],width<=760?"44px":"36px");
  assert.equal(back.flex,"0 0 auto","and it does not shrink out from under a thumb");
 }

 /* WHAT HAPPENS TO FOCUS WHEN THE PRESSED CONTROL UNMOUNTS. A HIDE button goes
    with its row, which drops focus to the document BODY - a keyboard then sits
    at the top of the page, outside a dialog it never left. Only on a BUTTON
    press: a swipe holds no focus, and scrolling the panel up to a control a
    thumb never asked for is its own bug, which is why the row reports WHICH
    WAY it was hidden rather than the page guessing. */
 assert.match(page,/onHide=\{via=>focusHideRecord\(record,via\)\}/);
 assert.match(swipeRow,/onHide: \(via: "button" \| "swipe"\) => void;/);
 assert.match(page,/if\(via==="button"\)focusAfterCommit\(focusPutBackRef\)/);
 assert.match(page,/if\(focusScope\.hiddenByHand<=1\)focusAfterCommit\(focusCopyRef\)/,
  "the last PUT BACK takes the button away with it, so focus has to move on");
 assert.match(page,/<button ref=\{focusCopyRef\}/);
 assert.match(page,/<button ref=\{focusPutBackRef\}/);
 /* AND A HIDE SAYS SO OUT LOUD, in its own region. A row leaving the list and a
    button arriving are both silent, and the control that was pressed is gone
    with its row - so without this a hide is a press with no outcome at all. Its
    own region rather than the share status beside it, so a hide cannot wipe
    COPIED and a share cannot wipe the hide. */
 assert.match(page,/<small className="log-focus-share-live" role="status" aria-live="polite">\{focusHideNote\}<\/small>/);
 assert.match(page,/setFocusHideNote\("HIDDEN FROM THIS SHARE — "\+repairCategoryLabel\(record\.defect\.category\)\)/);
 assert.match(page,/setFocusHideNote\("PUT BACK — "/);
 assert.match(page,/useEffect\(\(\)=>\{setFocusHideNote\(""\)\},\[focusedBusId\]\)/,
  "and it goes with the bus, like the share status and the swiped-away list");
});

test("a re-report is visible where it happens, and the count it claims is one it made", async () => {
 const [logPage,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 const {applyReportReturn,reportTotal,refusalMessage,refusalHeadline,reportButtonState}=await import("../src/lib/defects/report-returns.ts");
 const {reportAttemptCount,lastReportAttemptAt}=await import("../src/lib/defects/repair-catalog.ts");

 /* RUN, NOT MATCHED. The first version of this test was source-regex all the
    way down, and a cold read defeated four mutations through it: every refusal
    claiming COUNTED, a missing bus claiming COUNTED, the card always saying
    COUNTED, and the id check short-circuited so one press stamped EVERY defect
    on the bus. All four passed. The logic moved to src/lib so the test can do
    what the reviewer did by hand. */
 const at=(mins)=>new Date(Date.UTC(2026,0,2,12,mins)).toISOString();
 const defect=(id)=>({id,category:"Bus Accessories",issue:"Ramp, Lift and Kneeler - Ramp will not lock",
  details:"",operability:"down",state:"open",source:"defect-log"});
 const board=()=>[{id:"b1",n:"17561",pendingRepair:"",defects:[defect("d1"),defect("d2")]},
                  {id:"b2",n:"17999",pendingRepair:"",defects:[defect("d9")]}];

 /* A first return counts, and touches exactly one defect on exactly one bus. */
 const one=applyReportReturn(board(),"b1","d1",at(0),"CT");
 assert.equal(one.result.counted,true);
 assert.equal(one.result.returns,1);
 assert.equal(one.result.at,at(0));
 assert.equal(reportAttemptCount(one.fleet[0].defects[0]),1,"the defect it was aimed at");
 assert.equal(reportAttemptCount(one.fleet[0].defects[1]),0,"and NOT its neighbour on the same bus");
 assert.equal(reportAttemptCount(one.fleet[1].defects[0]),0,"and NOT another bus");

 /* The debounce still refuses a second press, and says which refusal it is. */
 const tooSoon=applyReportReturn(one.fleet,"b1","d1",at(0.5),"CT");
 assert.equal(tooSoon.result.counted,false);
 assert.equal(tooSoon.result.reason,"too-soon");
 assert.equal(tooSoon.result.returns,1,"reporting the count it refused to move");
 assert.equal(tooSoon.fleet,one.fleet,"and changing nothing");

 const later=applyReportReturn(one.fleet,"b1","d1",at(5),"CT");
 assert.equal(later.result.counted,true);
 assert.equal(later.result.returns,2);
 assert.equal(lastReportAttemptAt(later.fleet[0].defects[0]),at(5));

 /* TWO RECORDS SHARING AN ID KEEP THEIR OWN WORDING. The stamp was hoisted
    out of the map and spliced into every id match, so a bus holding two
    defects with the same id came back with BOTH rows reading the first one's
    repair — a repair record merged away to make a count work, which this
    project does not do. A cloud merge or an import can produce the duplicate;
    normalizeDefects only mints unique ids for records that have none. */
 const twinned=[{id:"b1",n:"17561",pendingRepair:"",defects:[
  {...defect("dup"),issue:"Ramp, Lift and Kneeler - Ramp will not lock"},
  {...defect("dup"),issue:"Seats - Torn cushion"}]}];
 const twins=applyReportReturn(twinned,"b1","dup",at(0),"CT");
 assert.equal(twins.result.counted,true);
 assert.deepEqual(twins.fleet[0].defects.map(d=>d.issue),
  ["Ramp, Lift and Kneeler - Ramp will not lock","Seats - Torn cushion"],
  "neither record is overwritten by the other");

 /* AN UNREADABLE STAMP IS NOT THE DEBOUNCE either. */
 const badTime=applyReportReturn(board(),"b1","d1","not-a-date","CT");
 assert.equal(badTime.result.counted,false);
 assert.equal(badTime.result.reason,"bad-time");

 /* A BUS OR DEFECT THAT IS GONE IS NOT "ALREADY COUNTED". The first version
    stamped "too-soon" on every non-change, so somebody whose bus had left the
    board was told their return had already been counted a moment ago — a
    false statement about their own data. */
 const noBus=applyReportReturn(board(),"nope","d1",at(0),"CT");
 assert.equal(noBus.result.counted,false);
 assert.equal(noBus.result.reason,"no-bus");
 const noDefect=applyReportReturn(board(),"b1","nope",at(0),"CT");
 assert.equal(noDefect.result.counted,false);
 assert.equal(noDefect.result.reason,"no-defect");
 for(const reason of ["too-soon","no-bus","no-defect","not-saved","bad-time"])
  assert.ok(refusalMessage(reason).length>10,reason+" has words of its own");
 assert.notEqual(refusalMessage("no-bus"),refusalMessage("too-soon"));

 /* ONE WORDING FOR THE COUNT. The two messages this release added disagreed
    with each other about the same press -- the banner said "come back 1x" and
    the card "reported x2" -- so both go through one function now. */
 assert.equal(reportTotal(defect("d1")),1,"a defect nobody re-reported was still reported once");
 assert.equal(reportTotal(one.fleet[0].defects[0]),2);
 assert.match(logPage,/REPORTED &times;\{reportTotal\(record\.defect\)\}/);
 /* The BRANCH, not just the happy string. The tone it sets is what paints the
    button green, and reportButtonState's own test above proves a "refused"
    tone never renders as counted. */
 assert.match(logPage,/tone:result\.counted\?"counted":"refused"/,"a refusal is never toned as a count");
 assert.match(logPage,/text:result\.counted\?"COUNTED \\u00b7 \\u00d7"\+\(result\.returns\+1\):refusalHeadline\(result\.reason\|\|"too-soon"\)/,
  "the card says COUNTED only when it counted");
 assert.match(logPage,/"COUNTED \\u00b7 REPORTED \\u00d7"\+\(returnNoteFor\.count\+1\)/,"and so does the banner");
 assert.match(logPage,/aria-label=\{button\.ariaLabel\}/,"the accessible name follows the state, not the pre-press one");
 assert.match(logPage,/aria-live=\{button\.announce\?"polite":undefined\}/,"and the outcome is announced");

 /* A REFUSED WRITE IS NOT A COUNT. This reported counted:true over a persist()
    whose result it discarded, so an unwritable board still produced
    "COUNTED - reported x3" beside a chip reading x2. */
 const handler=logPage.slice(logPage.indexOf("const countReturn="),logPage.indexOf("const showExistingDefect="));
 assert.match(handler,/const written=persist\(nextFleet,downEntries\);/);
 assert.match(handler,/if\(!written\.ok\)return \{counted:false[^}]*reason:"not-saved"\}/,"a refused write is reported as one");
 assert.ok(handler.indexOf("persist(nextFleet")<handler.indexOf("setUndoSnapshot"),
  "and UNDO is not offered for a change nobody managed to make");

 /* THE EDITOR'S KEY, which is the bug OPEN IT actually had. */
 assert.match(logPage,/\{editing&&<DefectEditor key=\{editing\.busId\+":"\+editing\.defect\.id\} draft=\{editing\}/);

 /* ONE BUTTON, THREE STATES, NO SECOND ELEMENT IN THE CELL. The armed confirm
    it replaced overflowed the rail and MARK FIXED painted over its cancel, so
    tapping cancel marked the repair COMPLETE at 360 and 430 and was clipped
    out of reach entirely at 820 and above. */
 assert.doesNotMatch(logPage,/report-again-confirm|report-again-yes|report-again-cancel/,
  "nothing is added beside the button in a cell measured at 64-97px");

 /* RUN, NOT MATCHED. Eleven mutations of the inline version survived the
    suite -- a refused press rendering GREEN with NOT COUNTED on it, the armed
    state sticking forever, the outcome painting on every row -- because a
    button that changes its own words is a state machine, and one that lives
    only in JSX can only be pinned by matching the JSX. */
 const seat={busNumber:"17561",position:2};
 const resting=reportButtonState({defectId:"d1",armedId:"",note:null,...seat});
 assert.equal(resting.label,"REPORTED AGAIN");
 assert.equal(resting.tone,"");
 assert.equal(resting.announce,false,"a button nobody pressed announces nothing");
 assert.match(resting.ariaLabel,/reported again for defect 2/);

 const armed=reportButtonState({defectId:"d1",armedId:"d1",note:null,...seat});
 assert.equal(armed.label,"TAP AGAIN","short enough for an 82px vertical rail cell");
 assert.equal(armed.tone,"armed");
 assert.equal(armed.announce,true);
 assert.match(armed.ariaLabel,/Tap again to count/,"and the accessible name follows the visible one");

 /* ARMING ONE DEFECT MUST NOT ARM ITS NEIGHBOUR. */
 assert.equal(reportButtonState({defectId:"d2",armedId:"d1",note:null,...seat}).tone,"",
  "the row below stays at rest");

 const counted={id:"d1",tone:"counted",text:"COUNTED · ×3"};
 const done=reportButtonState({defectId:"d1",armedId:"",note:counted,...seat});
 assert.equal(done.label,"COUNTED · ×3");
 assert.equal(done.tone,"counted");
 assert.equal(done.ariaLabel,"COUNTED · ×3 for bus 17561 defect 2","the outcome is the accessible name too");
 assert.equal(reportButtonState({defectId:"d2",armedId:"",note:counted,...seat}).label,"REPORTED AGAIN",
  "an outcome paints on ONE row, not every row on the page");

 /* A REFUSAL IS NOT GREEN. */
 const refused=reportButtonState({defectId:"d1",armedId:"",note:{id:"d1",tone:"refused",text:"NOT SAVED"},...seat});
 assert.equal(refused.tone,"refused");
 assert.notEqual(refused.tone,"counted");

 /* An outcome outranks the armed word, so a count that already happened
    cannot sit under an invitation to count again. */
 assert.equal(reportButtonState({defectId:"d1",armedId:"d1",note:counted,...seat}).label,"COUNTED · ×3");

 /* SHORT ENOUGH FOR A BUTTON: the full sentences are written for the editor's
    banner, and in a ~90px rail cell one wrapped to three lines and grew the
    action row 104px -> 120px between the two taps it asks for. */
 for(const reason of ["too-soon","no-bus","no-defect","not-saved","bad-time"]){
  assert.ok(refusalHeadline(reason).length<=16,reason+" fits a rail cell");
  assert.ok(refusalMessage(reason).length>refusalHeadline(reason).length,"and the banner still gets the sentence");
 }
 assert.equal(new Set(["too-soon","no-bus","no-defect","not-saved","bad-time"].map(refusalHeadline)).size,5,
  "each refusal says which one it is");

 /* THE TIMERS. Doing nothing is the cancel, so the window has to exist and be
    short enough to be one: a mutation to 600000 left the six seconds the
    handoff promises unpinned. */
 const arm=Number(logPage.match(/const ARM_WINDOW_MS=(\d+)/)?.[1]);
 const outcome=Number(logPage.match(/const OUTCOME_WINDOW_MS=(\d+)/)?.[1]);
 assert.ok(arm>=3000&&arm<=10000,"long enough for a second tap with a glove, short enough to be a cancel");
 assert.ok(outcome>=3000&&outcome<=15000,"long enough to read at a bus, short enough not to go stale");
 assert.match(logPage,/setTimeout\(\(\)=>setReporting\(""\),ARM_WINDOW_MS\)[\s\S]{0,80}\},\[reporting\]\)/,
  "the arm timer re-runs when the armed defect changes, or it never fires at all");
 assert.match(logPage,/setTimeout\(\(\)=>setReportNote\(null\),OUTCOME_WINDOW_MS\)[\s\S]{0,80}\},\[reportNote\]\)/);
 /* The editor's banner outcome expires too: without it, counting, clearing
    the repair field and retyping it brought back a count read minutes ago. */
 assert.match(logPage,/setTimeout\(\(\)=>setReturnNote\(null\),OUTCOME_WINDOW_MS\)/);

 /* LAST in the rail, not first: adding a control was asked for, moving MARK
    FIXED along a slot was not. */
 const row=logPage.slice(logPage.indexOf('<div className="log-actions">'));
 const rail=row.slice(0,row.indexOf("</div>"));
 assert.ok(rail.indexOf('className="quick-fix"')<rail.indexOf('"report-again"'),
  "MARK FIXED keeps the slot it has always had");

 /* The chip and its date. */
 assert.match(logPage,/reportAttemptCount\(record\.defect\)>0&&<b className="work-state-badge report-return"/);
 assert.match(logPage,/lastReportAttemptAt\(record\.defect\)&&<time className="last-reported">LAST REPORTED/);
 /* (0,2,1) so it is not inert -- its first rule was `.last-reported` and lost
    to `.log-meta time` -- but it does NOT set a colour. Winning that fight
    with a fixed #8a5200 measured 2.50 / 2.52 / 1.73:1 on the dark, midnight
    and tactical themes, against the 8.04 / 7.29 / 5.28 it had while it was
    inert. The badge above it carries the colour for this idea; this line only
    needs to not read as one more grey timestamp. */
 assert.match(css,/\.log-meta time\.last-reported\{font-weight:900/,"distinguished, and not by a fixed hex");
 assert.doesNotMatch(css,/\.log-meta time\.last-reported\{[^}]*color:#/,"a hard-coded ink here breaks three of the four themes");
 assert.doesNotMatch(css,/\.report-again\{[^}]*background:#/,"and the resting button takes the theme's ink, like .remove-log beside it");
 for(const rule of [/\.report-again\{/,/\.report-again\.armed\{/,/\.report-again\.counted\{/,/\.report-again\.refused\{/,/\.report-again>span\{font-size:14px/])
  assert.match(css,rule,String(rule)+" has a style");
 assert.match(css,/\.work-state-badge\.report-return\{/,"and the chip reuses the badge the focus view already had");
});

test("ESTIMATED TIME OF REPAIR is a claim about this bus, and the Defect Log owns it",async()=>{
 /* Curtis: "where it says optional what was found replace this with estimated
    time of repair. Make sure it's wired to all other related inputs." */
 const {defectEstimateMinutes,openDefectsEstimateMinutes}=await import("../src/lib/defects/defect-estimates.ts");
 const {normalizeDefects,MAX_REPAIR_HOURS}=await import("../src/lib/defects/repair-catalog.ts");
 const {estimateFromHours,normalizeRepairTimeEstimate,repairTimeSum,repairTimeTotal}=await import("../src/lib/down-sheet/repair-time-estimates.ts");
 const {applyDownEntryToFleet}=await import("../src/lib/down-sheet/down-sheet-sync.ts");
 const {saveRepairMinutes}=await import("../src/lib/defects/repair-hours-ledger.ts");

 const CATEGORY="Brakes",ISSUE="Rear shoes and drums",NOW="2026-10-27T10:00:00.000Z";
 const catalog=repairTimeTotal(normalizeRepairTimeEstimate(undefined,CATEGORY,ISSUE));
 const defect={id:"d1",category:CATEGORY,issue:ISSUE,details:"",operability:"service",state:"open"};

 /* IT IS NOT THE BILLABLE HOURS BESIDE IT, and that is why it is a new field
    rather than a relabelled one. `work-time.ts` sums repairHours and
    diagnosticHours as time WORKED, per person per day, so an estimate written
    into either would land on somebody's ledger as hours they never spent. */
 const worked=await readFile(new URL("../src/lib/reports/work-time.ts",import.meta.url),"utf8");
 assert.match(worked,/normalizeRepairHours\(defect\.repairHours\)/,"the work ledger still reads the billed hours");
 assert.equal(/estimateHours/.test(worked),false,"and must never read the estimate");

 /* ON TOP OF THE LADDER, and not floored: .25 is somebody saying fifteen
    minutes, and rounding that up to the Down Sheet's half-hour minimum would
    overstate the board. */
 assert.equal(defectEstimateMinutes({...defect,estimateHours:2}),120);
 assert.equal(defectEstimateMinutes({...defect,estimateHours:0.25}),15,"a mechanic's own number is never floored");
 const ledger=saveRepairMinutes({entries:[]},{category:CATEGORY,issue:ISSUE,hours:"5"});
 assert.equal(defectEstimateMinutes({...defect,estimateHours:2},ledger),120,"it outranks the shop's ledger");
 assert.equal(defectEstimateMinutes(defect,ledger),300,"which still answers when nobody has estimated this one");
 assert.equal(defectEstimateMinutes(defect),catalog,"and the catalog is still the last word");
 assert.equal(openDefectsEstimateMinutes([{...defect,estimateHours:2}]),120,"the hours badge adds it up");
 /* A completed record owes nothing — true of every rung, not just this one,
    so it is here as the badge's contract rather than as evidence about the new
    field. */
 assert.equal(openDefectsEstimateMinutes([{...defect,estimateHours:2,state:"completed"}]),0);

 /* AN EMPTY BOX REMOVES IT, the rule the shop's ledger and PATH TO REPAIR both
    follow, and junk on disk reads as no estimate rather than as a number. */
 assert.equal(normalizeDefects([{...defect,estimateHours:0}],"","b")[0].estimateHours,undefined);
 assert.equal(normalizeDefects([{...defect,estimateHours:"nonsense"}],"","b")[0].estimateHours,undefined);
 assert.equal(normalizeDefects([{...defect,estimateHours:-3}],"","b")[0].estimateHours,undefined);
 assert.equal(normalizeDefects([{...defect,estimateHours:"1.5"}],"","b")[0].estimateHours,1.5,"and a stored string still reads");
 assert.equal(normalizeDefects([{...defect,estimateHours:900}],"","b")[0].estimateHours,MAX_REPAIR_HOURS,"capped like every other hours field");

 /* THE DOWN SHEET IS SEEDED FROM IT. Two screens quoting different figures for
    the same repair on the same bus is the disagreement this app keeps being
    bitten by, so a card built from an estimated defect prints the estimate and
    one built from an unestimated defect prints the catalog's guess. */
 assert.equal(repairTimeSum(estimateFromHours(2,CATEGORY,ISSUE)),120);
 assert.equal(repairTimeTotal(estimateFromHours(2,CATEGORY,ISSUE)),120);
 assert.deepEqual(estimateFromHours(undefined,CATEGORY,ISSUE),normalizeRepairTimeEstimate(undefined,CATEGORY,ISSUE));
 assert.deepEqual(estimateFromHours("",CATEGORY,ISSUE),normalizeRepairTimeEstimate(undefined,CATEGORY,ISSUE));
 assert.notEqual(repairTimeSum(estimateFromHours(2,CATEGORY,ISSUE)),catalog,"or the seeding would be unobservable");

 /* THE SEEDED CARD HOLDS THE NUMBER IT WAS GIVEN, exactly, and what the sheet
    PRINTS is a separate question. `repairTimeTotal` never reports less than
    half an hour, so a quarter-hour estimate reads as 15 minutes on the record
    and 30 on the row — the sheet's own floor, which predates this. Checked
    through the unfloored sum, because that is what the card was told. */
 for(const hours of [0.25,0.5,1,1.75,2,7.5]){
  const held=repairTimeSum(estimateFromHours(hours,CATEGORY,ISSUE));
  assert.equal(held,Math.round(hours*60),"the card holds what it was given: "+hours);
  assert.equal(repairTimeTotal(estimateFromHours(hours,CATEGORY,ISSUE)),Math.max(30,Math.round(hours*60)),"and prints it with the sheet's floor: "+hours);
 }

 /* THE SHEET DOES NOT WRITE IT BACK, AND THAT WAS A LIVE BUG FOR ONE COMMIT.

    A card differing from the catalog's figure looked like somebody's claim, so
    it was carried onto the defect. What that actually does, measured by a cold
    read: type 6 in the Defect Log on a bus already on the sheet, then CLEAR
    it. The card still holds the 360 minutes it was seeded with, so the next
    save of that row — changing the mechanic, ticking a card, anything — reads
    360, finds it is not the catalog's 720, and puts the 6 straight back on the
    record. A cleared estimate that returns is the bug `workStates` and
    `downSheetRecommendation` are deleted rather than blanked to avoid.

    So the Defect Log's box owns the defect's estimate and the sheet's boxes own
    the sheet's. The record keeps what it holds through a sheet save, and a
    cleared one STAYS cleared. */
 const bus={id:"bus-1",l:"garage-1",s:"defect",defects:[{...defect}]};
 const card=hours=>({id:"item-1",category:CATEGORY,repair:ISSUE,details:"",estimateEnabled:true,timeEstimate:estimateFromHours(hours,CATEGORY,ISSUE)});
 const entry={id:"e1",busId:"bus-1",category:CATEGORY,repair:ISSUE,customReason:"",assignmentType:"Mechanic",assignedTo:"",workflow:"Scheduled",operationalStatus:"defect",repairItems:[card(6)]};
 const read=fleet=>fleet[0].defects.find(item=>item.category===CATEGORY).estimateHours;

 assert.equal(read(applyDownEntryToFleet([bus],entry,NOW)),undefined,"a sheet save does not mint an estimate");
 assert.equal(read(applyDownEntryToFleet([{...bus,defects:[{...defect,estimateHours:3}]}],entry,NOW)),3,
  "nor does it overwrite the one the record holds");
 /* THE CLEARING CASE, which is the one that was broken: the card is still
    carrying what it was seeded with when the box was emptied. */
 const seeded={...entry,repairItems:[card(6)]};
 assert.equal(read(applyDownEntryToFleet([bus],seeded,NOW)),undefined,"a cleared estimate stays cleared");
 assert.equal(read(applyDownEntryToFleet(applyDownEntryToFleet([bus],seeded,NOW),seeded,NOW)),undefined,"through a second save too");
 /* And the sheet's own number is untouched by any of it — nothing here writes
    a card. */
 assert.equal(repairTimeSum(seeded.repairItems[0].timeEstimate),360);

 /* IT IS CARRIED, NOT RE-DERIVED, EVERYWHERE A DEFECT TRAVELS. */
 const {mergeDuplicateDefects}=await import("../src/lib/defects/duplicate-defects.ts");
 const merged=mergeDuplicateDefects([{id:"bus-9",n:"6301",l:"bay-1",s:"defect",defects:[
  {...defect,id:"a",details:"same",createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z"},
  {...defect,id:"b",details:"same",estimateHours:4,createdAt:"2026-09-02T00:00:00.000Z",updatedAt:"2026-09-02T00:00:00.000Z"},
 ]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
 assert.equal(merged.length,1,"the two copies merged");
 assert.equal(merged[0].estimateHours,4,"and the merge keeps the one estimate either of them held");

 /* AND EVERY PART ANYONE RECORDED SURVIVES THE MERGE, which it did not. Only
    the survivor's `parts` came through `...survivor`; a merged-away copy
    contributed nothing but its mirrored FIRST part, so a two-part duplicate
    lost its second one outright. A cold read drove it. Losing a part number off
    a repair's history is losing the history this app exists to keep - the same
    reasoning the module already applies to the return tally, which it unions
    for exactly this reason. */
 {
  const parted=(id,day,parts,mirror)=>({...defect,id,details:"same parts",
   createdAt:"2026-09-0"+day+"T00:00:00.000Z",updatedAt:"2026-09-0"+day+"T00:00:00.000Z",
   partsUsed:true,partNumber:mirror,parts});
  const out=mergeDuplicateDefects([{id:"bus-8",n:"6302",l:"bay-2",s:"defect",defects:[
   parted("p1",1,[{id:"a",partNumber:"AA-1",partName:"Chamber"}],"AA-1"),
   parted("p2",2,[{id:"b",partNumber:"BB-2"},{id:"c",partNumber:"CC-3",partName:"Sensor"}],"BB-2"),
  ]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
  assert.equal(out.length,1,"the two copies merged");
  assert.deepEqual(normalizeDefectParts(out[0].parts,out[0]).map(part=>part.partNumber),
   ["AA-1","BB-2","CC-3"],"every part on either copy has to survive the merge");
  /* AND THE MIRRORED PAIR DESCRIBES THE ARRAY'S FIRST ROW, because the merge
     runs through the one assembler rather than spreading fields. */
  assert.equal(out[0].partNumber,"AA-1");
  assert.equal(out[0].partsUsed,true);
  /* THE SAME PART TYPED ON BOTH COPIES IS ONE PART, not two: two records of one
     repair name the same part, and a doubled row would read as two fitted. */
  const same=mergeDuplicateDefects([{id:"bus-7",n:"6303",l:"bay-3",s:"defect",defects:[
   parted("q1",1,[{id:"a",partNumber:"AA-1"}],"AA-1"),
   parted("q2",2,[{id:"b",partNumber:"aa-1"}],"aa-1"),
  ]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
  assert.deepEqual(normalizeDefectParts(same[0].parts,same[0]).map(part=>part.partNumber),["AA-1"],
   "the same number on both copies is one part, whatever its case");
  /* AND A NAME ON THE LATER COPY FILLS A GAP IN THE EARLIER ONE. Skipping a
     repeat outright kept the number and threw the NAME away: a survivor holding
     `AA-1` with no name and a duplicate holding `AA-1 (Chamber)` merged to
     `AA-1`. The same loss the union exists to prevent, one field smaller. The
     first entry keeps its place; a later copy only ever fills a gap. */
  const named=(id,day,part)=>({...defect,id,details:"same parts",
   createdAt:"2026-09-0"+day+"T00:00:00.000Z",updatedAt:"2026-09-0"+day+"T00:00:00.000Z",
   partsUsed:true,partNumber:part.partNumber,partName:part.partName||"",parts:[part]});
  const fill=(a,b)=>{
   const out=mergeDuplicateDefects([{id:"bx",n:"6309",l:"bay-9",s:"defect",
    defects:[named("x1",1,a),named("x2",2,b)]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
   return defectPartsText(normalizeDefectParts(out[0].parts,out[0]));
  };
  assert.equal(fill({id:"a",partNumber:"AA-1"},{id:"b",partNumber:"AA-1",partName:"Chamber"}),
   "AA-1 (Chamber)","a name on the later copy fills the gap");
  assert.equal(fill({id:"a",partNumber:"AA-1",partName:"Chamber"},{id:"b",partNumber:"AA-1"}),
   "AA-1 (Chamber)","and a bare repeat does not erase a name already held");
  assert.equal(fill({id:"a",partNumber:"AA-1",partName:"Chamber"},{id:"b",partNumber:"AA-1",partName:"Pot"}),
   "AA-1 (Chamber)","a later copy FILLS a gap and never overwrites what is there");
  /* A COPY SAVED UNDER THE OLD SINGLE-PART SHAPE still contributes its part:
     the merge reads through `normalizeDefectParts`, not off `parts` alone. */
  const legacy=mergeDuplicateDefects([{id:"bus-6",n:"6304",l:"bay-4",s:"defect",defects:[
   /* The SAME `details` as the copy below, or these are not duplicates at all
      and nothing merges - which is how this fixture first "failed". */
   {...defect,id:"r1",details:"same parts",createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",
    partsUsed:true,partNumber:"ZZ-9",partName:"Belt"},
   parted("r2",2,[{id:"b",partNumber:"YY-8"}],"YY-8"),
  ]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
  assert.deepEqual(normalizeDefectParts(legacy[0].parts,legacy[0]).map(part=>part.partNumber),["ZZ-9","YY-8"],
   "a one-part record saved before the array existed still brings its part");
  /* AND EVERY MERGED PART NEEDS AN ID OF ITS OWN. `normalizeDefectParts` MINTS
     a default id for a record that has none - `part-0` for a legacy one-part
     record, `part-0, part-1…` for an array without ids - so two ordinary
     one-part copies merged into a list where both parts were `part-0`.

     That is the exact failure the ids exist to prevent: the editor keys rows by
     id and `updateDefectPart`/`removeDefectPart` FIND a row by id, so typing in
     row 2 rewrote row 1 and REMOVE on row 2 deleted both - silent loss on a
     save, with the screen still showing the first part. Driven through the real
     edit helpers, which is the only way to see it. */
  const ids=normalizeDefectParts(legacy[0].parts,legacy[0]);
  assert.equal(new Set(ids.map(part=>part.id)).size,ids.length,
   "two merged parts must not share an id: "+JSON.stringify(ids.map(part=>part.id)));
  assert.deepEqual(updateDefectPart(ids,ids[1].id,{partNumber:"YY-80"}).map(part=>part.partNumber),
   ["ZZ-9","YY-80"],"typing in row 2 must not rewrite row 1");
  assert.deepEqual(removeDefectPart(ids,ids[1].id).map(part=>part.partNumber),["ZZ-9"],
   "and REMOVE on row 2 must not take row 1 with it");
  /* An array whose own ids are the defaults collides the same way. */
  const defaults=mergeDuplicateDefects([{id:"bd",n:"6308",l:"bay-8",s:"defect",defects:[
   {...defect,id:"u1",details:"same parts",createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z",
    partsUsed:true,partNumber:"AA-1",parts:[{partNumber:"AA-1"},{partNumber:"BB-2"}]},
   {...defect,id:"u2",details:"same parts",createdAt:"2026-09-02T00:00:00.000Z",updatedAt:"2026-09-02T00:00:00.000Z",
    partsUsed:true,partNumber:"CC-3",parts:[{partNumber:"CC-3"},{partNumber:"DD-4"}]},
  ]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
  const defaultIds=normalizeDefectParts(defaults[0].parts,defaults[0]);
  assert.deepEqual(defaultIds.map(part=>part.partNumber),["AA-1","BB-2","CC-3","DD-4"]);
  assert.equal(new Set(defaultIds.map(part=>part.id)).size,4,
   "four parts, four ids: "+JSON.stringify(defaultIds.map(part=>part.id)));
  /* A PART KEEPS ITS OWN ID WHEN NOTHING COLLIDES, so an ordinary merge does
     not churn a record for nothing. */
  assert.equal(defaultIds[0].id,"part-0","the first part is left alone");
  /* AND A COPY WITH A PART NUMBER AND NO `partsUsed` FLAG KEEPS ITS PART. The
     first version of this merge passed `anyTrue(...)===true` straight through,
     so when NO copy carried the flag it handed the assembler an explicit
     `false` - which means "somebody unticked the box" and beats every row in
     the list. A pre-flag record carrying `partNumber:"HX-99"` alone had its
     part wiped. The Down Sheet's merge test caught it, having asserted that
     exact number survives since long before parts were a list. */
  const unflagged=mergeDuplicateDefects([{id:"bus-5",n:"6305",l:"bay-5",s:"defect",defects:[
   {...defect,id:"s1",details:"same parts",createdAt:"2026-09-01T00:00:00.000Z",updatedAt:"2026-09-01T00:00:00.000Z"},
   {...defect,id:"s2",details:"same parts",createdAt:"2026-09-02T00:00:00.000Z",updatedAt:"2026-09-02T00:00:00.000Z",
    partNumber:"HX-99"},
  ]}],[],"2026-09-10T00:00:00.000Z").buses[0].defects;
  assert.equal(unflagged[0].partNumber,"HX-99",
   "a part number with no partsUsed flag is still a part somebody recorded");
  assert.equal(unflagged[0].partsUsed,true,"and the flag follows the part, not the other way round");
 }

 /* Both seeding sites ask the defect rather than the catalog: the entry the
    Defect Log opens when it puts a bus on the sheet, and the cards the Down
    Sheet builds for a bus that is already down. */
 const sync=await readFile(new URL("../src/lib/defects/defect-log-sync.ts",import.meta.url),"utf8");
 assert.match(sync,/timeEstimate:estimateFromHours\(defect\.estimateHours,defect\.category,defect\.issue\)/);
 const sheet=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.match(sheet,/timeEstimate:estimateFromHours\(defect\.estimateHours,defect\.category,defect\.issue\)/);
});

test("the Defect Log editor asks how long the repair takes where it used to ask what was found",async()=>{
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");

 /* Curtis, on the box this replaced: "We have description above, so it kind of
    redundant." The cause and the description were two free-text boxes asking
    nearly the same question on one screen. */
 /* The finding box is out of THIS SLOT — it is in ADVANCED DETAILS now, which
    the test above pins. Matched on the JSX rather than on the prose, because
    the comment where the box used to be names it. */
 assert.equal(/className="work-state-finding"/.test(page),false,"the box is out of the work-state fieldset");
 assert.match(page,/ESTIMATED TIME OF REPAIR — HOURS/);
 assert.match(page,/updateDefect\("estimateHours",normalizeRepairHours\(/,"typed as hours, through the one rule every hours box uses");
 assert.match(page,/value=\{value\.defect\.estimateHours\}/);

 /* "Also change description to additional details. Capitalize the A & the D."
    Every other label on this form is upper case, so one in title case would be
    the odd one out on the screen he was looking at. */
 assert.match(page,/<span className="description-head">ADDITIONAL DETAILS</);
 assert.equal(/>DESCRIPTION</.test(page),false);
 assert.match(page,/aria-label="Start a new bulleted line in the additional details"/,"the bullet button says the same thing the label does");

 /* IN THE SAME PLACE ON THE SCREEN, directly above WORK STATUS and OUTSIDE
    ADVANCED DETAILS: this is typed by somebody standing at the bus, and a
    control behind a disclosure here goes unused, the way the campaign paste box
    did. But outside the PRELIMS fieldset the finding sat inside —
    an estimate is not work done, and that legend would be wrong about the one
    field under it that looks forward. */
 const estimateAt=page.indexOf('className="wide repair-estimate-field"');
 assert.ok(estimateAt>0,"the field is there to find");
 assert.ok(estimateAt<page.indexOf("<label>WORK STATUS"),"above WORK STATUS");
 const pickerAt=page.indexOf('className="wide work-state-picker"'),pickerClose=page.indexOf("</fieldset>",pickerAt);
 assert.ok(pickerAt>0&&pickerClose>pickerAt,"the work-state fieldset is there to measure against");
 assert.ok(estimateAt>pickerClose,"after the work-state fieldset closes, not inside it");
 assert.ok(estimateAt<page.indexOf("advanced-defect-details"),"and not behind ADVANCED DETAILS");

 /* IT QUOTES THE RUNG BENEATH IT. A field that hides what it is overriding
    invites somebody to retype a figure the app already had, or to leave it
    blank believing nothing has been estimated at all. Asked with every typed
    figure stripped out, because billable hours are not an estimate. */
 /* EXACTLY WHAT CLEARING THE BOX WOULD YIELD, which took a correction. The
    billed hours were stripped out of the fallback as well, on the reasoning
    that time worked is not an estimate — true, and beside the point, because
    the sentence under the box says what happens if you clear it. Measured with
    4 billed hours and a 5h ledger: it promised 5h and clearing delivered 4h. */
 assert.match(page,/const estimateFallback=defectEstimateMinutes\(\{\.\.\.value\.defect,issue:estimateIssue,estimateHours:undefined\},shopHours\)/);
 assert.equal(/estimateHours:undefined,repairHours:undefined/.test(page),false,"the billed hours are part of the fallback, because clearing falls to them");
 /* AND THE SOURCE IS NAMED rather than assumed to be the catalog. */
 assert.match(page,/billedHours>0\?"the hours already billed on this job"/);
 assert.match(page,/findRepairMinutes\(shopHours,value\.defect\.category,estimateIssue\)/,"so the shop's ledger can be named when it is the answer");
 assert.match(page,/shopHours=\{repairHours\}/,"the editor is handed the same ledger the feed's badge reads");
 assert.match(page,/placeholder=\{String\(Math\.round\(estimateFallback\/60\*100\)\/100\)\}/);
 assert.match(page,/max=\{MAX_REPAIR_HOURS\}/,"so the box cannot show a number the record will not keep");

 /* The box is reachable by name, and the stylesheet draws it. */
 assert.match(page,/ariaLabel="Estimated time of repair, in hours"/);
 const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 assert.match(css,/\.repair-estimate-field input\{[^}]*min-height:48px/,"a phone-sized target at every width");
 assert.match(css,/\.repair-estimate-field input\{[^}]*max-width:/,"and not a full-width box for two characters");
 /* 16px OR SAFARI ZOOMS THE EDITOR ON FOCUS. This rule is (0,2,1) and the
    phone block that sets every other field to 16px is (0,1,1), so it wins —
    and it shipped at 15px, on the one control the comment beside it calls the
    one somebody types at while standing at the bus. */
 const estimateRule=css.match(/\.repair-estimate-field input\{([^}]*)\}/)[1];
 const size=Number((estimateRule.match(/font-size:(\d+(?:\.\d+)?)px/)||[])[1]);
 assert.ok(size>=16,"the estimate box must not be under 16px, got "+size);
});

test("Fixed Repairs narrows by WHEN IT WAS FIXED, and shares exactly what it shows",async()=>{
 /* Curtis: "the quick filter functions, like for the day and the past week, the
    past month, or the past 24 hours, the same way you got it wired up for
    defects, I want you to wire up the actually fixed catalog the same way...
    Also where I can share it, the same share ways as we do defects." */
 const {FEED_WINDOWS,feedWindowMinutes,feedWindowLabel,isFeedWindowKey,
  defectWithinFeedWindow,fixedWithinFeedWindow}=await import("../src/lib/defects/feed-window.ts");
 const {completedMinutesElapsed}=await import("../src/lib/defects/repair-catalog.ts");
 const {fixedShareText,fixedShareHtml,fixedShareFilename}=await import("../src/lib/defects/fixed-share.ts");

 const NOW=new Date("2026-10-29T15:00:00.000Z");
 const fixed=(completedAt,extra={})=>({id:"d",category:"Pneumatic System",issue:"Air leak",details:"",
  operability:"service",state:"completed",createdAt:"2026-10-20T09:00:00.000Z",completedAt,
  updatedAt:completedAt,...extra});

 /* THE OPPOSITE STAMP, which is the whole point. A repair reported last week
    and finished an hour ago belongs in TODAY; the feed's own window refuses to
    follow an edit, and a completion is the one edit that IS the event. */
 const hourAgo=fixed("2026-10-29T14:00:00.000Z");
 assert.equal(Math.round(completedMinutesElapsed(hourAgo,NOW)),60);
 assert.equal(fixedWithinFeedWindow(hourAgo,feedWindowMinutes("24h",NOW),NOW),true);
 assert.equal(defectWithinFeedWindow(hourAgo,feedWindowMinutes("24h",NOW),NOW),false,
  "logged nine days ago, so the feed's own window correctly excludes it");

 /* `completedAt` first, `updatedAt` second — a record cleared from the Down
    Sheet stamps the save rather than the completion, and the page already
    sorts and dates its cards that way. One rule for the sort, the card and the
    window, or the card prints one date and filters on another. */
 assert.equal(Math.round(completedMinutesElapsed({...fixed(""),updatedAt:"2026-10-29T13:00:00.000Z"},NOW)),120);
 /* THE ORDER, which nothing gated: every fixture above has the two stamps equal
    or `completedAt` empty, so a cold read inverted the expression to
    `updatedAt||completedAt` — the precise inversion three comments say matters —
    and all 407 tests passed. A record whose stamps DISAGREE is the only fixture
    that can tell them apart. */
 const disagreeing={...fixed("2026-10-29T14:00:00.000Z"),updatedAt:"2026-10-29T10:00:00.000Z"};
 assert.equal(Math.round(completedMinutesElapsed(disagreeing,NOW)),60,"completedAt wins, not updatedAt");
 assert.equal(completedMinutesElapsed({...fixed(""),updatedAt:""},NOW),null,"and neither is no age at all");
 assert.equal(fixedWithinFeedWindow({...fixed(""),updatedAt:""},feedWindowMinutes("24h",NOW),NOW),false,
  "an undated repair falls out of every narrowed window");
 assert.equal(fixedWithinFeedWindow({...fixed(""),updatedAt:""},null,NOW),true,"and stays in ALL");

 /* A MONTH, ON BOTH SCREENS. It shipped as a second list only Fixed Repairs
    drew, on the argument that thirty days is every record a live board has.
    Curtis asked for it on the feed too — and a DEFERRED defect sits on that
    board for as long as it takes, so the argument was wrong on the facts. One
    table now, because the limit and the label have to come off the same one. */
 assert.deepEqual(FEED_WINDOWS.map(item=>item.key),["all","shift","today","24h","3d","7d","30d"]);
 assert.equal(feedWindowMinutes("30d",NOW),30*24*60);
 assert.equal(feedWindowLabel("30d",NOW),"LAST 30 DAYS","the label and the limit read one table");
 /* AND THE GUARD ACCEPTS IT. A key the exported type and the resolver both take,
    refused by `isFeedWindowKey`, is the second code path this file says it
    avoids — latent today because nothing in `app/` calls it, and wrong the
    moment something persisting or URL-parsing a window does. */
 assert.equal(isFeedWindowKey("30d"),true);
 for(const key of ["all","shift","today","24h","3d","7d","30d"])assert.equal(isFeedWindowKey(key),true,key);
 for(const junk of ["30D","month","",null,7,undefined])assert.equal(isFeedWindowKey(junk),false,String(junk));
 assert.equal(feedWindowLabel("30d",NOW),"LAST 30 DAYS","and the label resolves, or the heading would claim no window");
 const monthBack=fixed("2026-10-04T15:00:00.000Z");
 assert.equal(fixedWithinFeedWindow(monthBack,feedWindowMinutes("30d",NOW),NOW),true);
 assert.equal(fixedWithinFeedWindow(monthBack,feedWindowMinutes("7d",NOW),NOW),false);

 /* THE SHARE CARRIES THE WINDOW IN ITS HEADING, which is `time-window.ts`'s
    rule: a bare list of three repairs is not the same message as "three
    repairs in the last 24 hours", and the heading is the only part of a pasted
    list its reader can check. */
 const repairs=[{defect:fixed("2026-10-29T14:00:00.000Z",{actionTaken:"Replaced R-12 relay valve",completedBy:"CJ"}),
  busNumber:"6301",location:"garage-1",fixed:"Oct 29, 2:00 PM",logged:"Oct 20, 9:00 AM"}];
 const text=fixedShareText(repairs,"LAST 24H","Oct 29, 3:00 PM");
 assert.match(text,/^Fixed Repairs — LAST 24H — 1 repair/);
 assert.match(text,/Bus 6301/);
 assert.match(text,/Replaced R-12 relay valve/);
 assert.match(text,/Fixed by CJ/);
 /* The location is the words a person says, through the one table that knows
    trouble bays — never the raw slot id, which reads as a typo to somebody who
    does not have the app open. */
 assert.match(text,/Main Garage/);
 assert.equal(/garage-1/.test(text),false);

 /* A REPAIR WITH NO FIX DETAILS SAYS SO. The page badges those cards; a share
    that quietly dropped the line would read as a complete record to somebody
    who cannot see the badge. */
 /* A FIX NOTE CANNOT MINT AN ENTRY. `actionTaken` is a free-text textarea and
    goes into the message raw; with only its first line indented, a note holding
    its own numbered list produced a convincing extra entry — measured by a cold
    read as 62 lines matching `^N. Bus ` under a heading saying 61, including a
    bus that does not exist. Counted here rather than reasoned about. */
 const forged=fixedShareText([{...repairs[0],defect:fixed("2026-10-29T14:00:00.000Z",
  {actionTaken:"Line 1 of the fix\n\n99. Bus 9999  ·  Main Garage\n   Totally invented repair",completedBy:"CJ"})}],"","");
 assert.equal((forged.match(/^\d+\. Bus /gm)||[]).length,1,"one entry, whatever the note contains");
 assert.match(forged,/^   99\. Bus 9999/m,"the note's own numbering stays indented inside its entry");
 assert.match(forged,/Fixed Repairs — 1 repair/,"and the heading still counts one");

 const bare=fixedShareText([{...repairs[0],defect:fixed("2026-10-29T14:00:00.000Z")}],"","");
 assert.match(bare,/No fix details recorded\./);
 assert.match(bare,/^Fixed Repairs — 1 repair/,"and with no window the heading claims none");

 /* An empty list is a sentence, not a heading with nothing under it. */
 assert.match(fixedShareText([],"TODAY","now"),/No repairs match this view\./);
 assert.match(fixedShareHtml([],"TODAY","now"),/No repairs match this view\./);

 /* The page is self-contained — this gets opened from a text message on a phone
    in a garage with no signal, so a page that fetches anything shows nothing. */
 const html=fixedShareHtml(repairs,"LAST 24H","Oct 29, 3:00 PM");
 assert.match(html,/^<!doctype html>/);
 assert.equal(/<script|src=|@import|https?:\/\//.test(html),false,"nothing fetched, nothing scripted");
 assert.match(html,/Replaced R-12 relay valve/);
 /* Escaped, because a mechanic's own words reach this file. */
 assert.match(fixedShareHtml([{...repairs[0],defect:fixed("2026-10-29T14:00:00.000Z",{actionTaken:"<script>x</script>"})}],"",""),/&lt;script&gt;/);

 /* THE WALL CLOCK'S DATE, NOT UTC, and the window in the name — these get sent
    repeatedly and a folder of files all called the same thing is unusable. */
 const evening=new Date(2026,9,29,19,30);
 assert.equal(fixedShareFilename("LAST 24H","html",evening),"pace-fixed-repairs-last-24h-2026-10-29.html");
 assert.equal(fixedShareFilename("","txt",evening),"pace-fixed-repairs-2026-10-29.txt");

 /* AND THE PAGE SENDS WHAT IT SHOWS. `visible` is after the category, the
    window and the search, so the three stages narrow the share too. A filter
    that tidies the screen and pastes everything anyway lies at the only moment
    that matters. */
 const page=await readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8");
 assert.match(page,/const shareRepairs=\(\):FixedShareRepair\[\]=>visible\.map/);
 assert.match(page,/const inWindow=useMemo\(\(\)=>inCategory\.filter\(record=>fixedWithinFeedWindow\(record\.defect,windowLimit,windowNow\)\)/);
 assert.equal(/fixedWithinFeedWindow\(record\.defect,windowLimit,windowNow\)\)[\s\S]{0,200}records\.filter/.test(page),false);

 /* ONE CLOCK, SHARED BY THE LIMIT AND THE LABEL, and it advances on its own —
    this page sits open on a shop computer all day, and a frozen instant leaves
    THIS SHIFT meaning whatever o'clock the page was opened at. */
 assert.match(page,/const windowLimit=search\.trim\(\)\?null:feedWindowMinutes\(fixedWindow,windowNow,shiftSettings\)/);
 assert.match(page,/const windowWords=search\.trim\(\)\?"":feedWindowLabel\(fixedWindow,windowNow,shiftSettings\)/);
 assert.match(page,/setInterval\(\(\)=>setWindowNow\(new Date\(\)\),30000\)/);
 assert.match(page,/if\(fixedWindow==="all"\)return;/,"and idles when there is nothing to age");

 /* A SEARCH STANDS THE WINDOW DOWN — Curtis's own condition on the Defect Log,
    that he reach a bus "no matter what time" it was logged — and the bar says
    so rather than leaving somebody to wonder. */
 /* Drawn on the condition, not merely present in the file: a search active and
    a window chosen. The first version asserted only that the string existed. */
 assert.match(page,/\{search\.trim\(\)&&fixedWindow!=="all"\?<small>WINDOW STOOD DOWN WHILE SEARCHING<\/small>:null\}/);

 /* The three controls, the four outcomes, and a download reported as a
    download: folding "saved" into "copied" is how the Defect Log once lit up
    COPY with COPIED! over a file it had written to disk. */
 assert.match(page,/shareStatus==="copied"\?"COPIED!":"COPY"/,"COPY, which says COPIED! when it has");
 assert.match(page,/onClick=\{shareFixedList\}[^>]*>SHARE</);
 assert.match(page,/onClick=\{shareFixedPage\}[^>]*>SHARE PAGE</);
 assert.match(page,/shareStatus==="copied"\?"COPIED TO THE CLIPBOARD"/);
 assert.match(page,/shareStatus==="error"\?"COULD NOT SHARE — TRY COPY"/);
 /* THE NAME OF THE FILE THAT WAS WRITTEN, not one recomputed from live state.
    Rebuilt from `windowWords` and the default extension it told somebody to
    look for a `.html` after SHARE had written a `.txt`, and named a slug the
    file never had while a search was active — measured. */
 assert.match(page,/shareOutcomeLabel\(shareStatus,sharedFile\)/);
 assert.match(page,/const filename=fixedShareFilename\(words,"html"\);[\s\S]{0,200}setSharedFile\(filename\)/);
 /* And the heading admits every filter, not only the window: with a category
    chosen it read "Fixed Repairs — 2 repairs" over a five-repair history. */
 assert.match(page,/const shareScopeWords=\(\)=>\[\n\s*windowWords,/);
 assert.match(page,/category==="all"\?"":repairCategoryLabel\(category\)\.toUpperCase\(\)/);
 /* SHARE is the share sheet with the clipboard behind it, as on the Defect Log
    — not a `.txt` download under a word that means "put it in a message". */
 assert.match(page,/if\(typeof navigator\.share!=="function"\)\{await copyFixedList\(\);return\}/);
 assert.match(page,/navigator\.share\(\{title:"Fixed repairs",text\}\)/);
 /* A status that outlives the list it described is a lie. */
 assert.match(page,/useEffect\(\(\)=>\{setShareStatus\(""\);setSharedFile\(""\)\},\[fixedWindow,category,search\]\)/);
 /* And the share carries every match, which past fifty is more than the page
    draws — said in a row rather than left to be discovered by counting. */
 assert.match(page,/SHARES ALL \{visible\.length\} — \{hiddenCount\} NOT YET DRAWN/);
 /* Each count against the stage before it, and zero when there is no window. */
 assert.match(page,/const windowHeld=windowLimit===null\?0:inCategory\.length-inWindow\.length;/);
 assert.match(page,/const searchHeld=inWindow\.length-visible\.length;/);
 assert.equal(/records\.length-inWindow\.length/.test(page),false,"a count must not span two stages");
 /* A completion cannot be typed into the future: a negative age clears every
    limit, so a card printing next Tuesday sat under a heading reading TODAY. */
 assert.match(page,/type="datetime-local" max=\{localDateTime\(new Date\(\)\.toISOString\(\)\)\}/);
 /* THE REGRESSION IS A COPY REPORTED **AFTER** A DOWNLOAD, and the first
    version of this looked for one BEFORE it — so a cold read rewrote
    shareFixedPage to `await shareOrDownloadFile(...); setShareStatus("copied")`,
    lighting COPY up with COPIED! over a downloaded file, and both tests passed.
    Matched on the function's own body instead. */
 const sharePage=page.slice(page.indexOf("const shareFixedPage="),page.indexOf("const shareFixedList=")>page.indexOf("const shareFixedPage=")?page.indexOf("const shareFixedList="):page.indexOf("useEffect(()=>{setShareStatus"));
 assert.ok(sharePage.includes("shareOrDownloadFile"),"SHARE PAGE writes a file");
 assert.equal(/setShareStatus\("copied"\)/.test(sharePage),false,"and never calls itself a copy");
 assert.match(sharePage,/setShareStatus\(await shareOrDownloadFile\(blob,filename,"Fixed repairs"\)\)/,
  "it reports the outcome the file write actually returned");

 /* The window is NOT remembered, the way the Defect Log's is not: a window is
    what somebody is looking at for the next minute, and a remembered one is how
    you come back tomorrow to a history that silently starts at TODAY. */
 assert.match(page,/useState<FeedWindowKey>\("all"\)/);
 assert.equal(/pace-fixed-window|localStorage\.setItem\([^)]*[Ww]indow/.test(page),false,"and nothing writes it to storage");

 /* The stylesheet draws both new rows, and both are thumb-sized. */
 const css=await readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8");
 assert.match(css,/\.fixed-share button\{[^}]*min-height:44px/);
 assert.match(css,/\.fixed-scope\{/);
 /* FIVE children in the controls row now, so the column list has to say five
    or the fifth hangs under the others with `align-items:end`.

    ASSERTED ON THE RULE THAT RENDERS. A cold read found the base declaration's
    count being checked as if a media query gated the later rule: both are
    top-level and equal specificity, so the LAST one wins at every width and the
    base's list never paints. The one that matters is the later one. */
 /* Media blocks stripped first — the phone block legitimately declares one
    column — then the LAST top-level `.fixed-controls` rule, which is the one
    that paints above 760px. A loose match over the whole file picked up a rule
    belonging to another selector entirely. */
 const topLevel=css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,"");
 const rules=[...topLevel.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
  .filter(rule=>/(^|,)\s*\.fixed-controls\s*(,|$)/.test(rule[1].replace(/\/\*[\s\S]*?\*\//g,"")))
  .map(rule=>rule[2]);
 assert.ok(rules.length>=1,"the controls row must be styled at all");
 const winning=[...rules.join(";").matchAll(/grid-template-columns:([^;}]*)/g)].pop()[1];
 assert.equal(winning.trim().split(/\s+/).length,5,"the rule that wins must declare five columns, got "+winning);
});

test("RUN BOX NO DISPLAY is on the IBS Screen, and every counter reads it without being told",async()=>{
 /* Curtis: "we need to add a run box defect to the tech services portion and
    it will go in the fourth sub category yeah just run box... I think run box
    no display might be the best one." */
 const {REPAIR_OPTIONS,REPAIR_OPTION_GROUPS,normalizeDefects,repairIssueDisplayLabel}=
  await import("../src/lib/defects/repair-catalog.ts");
 const {techServicesGroup,isFarebox,isIbsVentra}=
  await import("../src/lib/fleet/tech-services.ts");
 const ISSUE="IBS Screen - Run box no display";

 /* THE FOURTH SUB-CATEGORY, which is what he named it by. The picker draws the
    groups in this order, so "fourth" is a fact about this list and not a
    guess — if a group is ever inserted above IBS Screen, this is where that
    shows up rather than in somebody's memory of a conversation. */
 const groups=Object.keys(REPAIR_OPTION_GROUPS["Tech Services"]);
 assert.deepEqual(groups,["Farebox","Ventra","CUBIC Screen","IBS Screen","Signs, Cameras and Other"]);
 assert.equal(groups[3],"IBS Screen","the fourth sub-category is where this went");

 /* BOTH STRUCTURES, IN STEP. `REPAIR_OPTIONS` holds the stored identity with
    its group prefix; `REPAIR_OPTION_GROUPS` holds the bare name the third step
    of the picker draws. CLAUDE.md: these two must stay in step, and an entry in
    one of them only is an option that cannot be picked or a pick that cannot
    be stored. */
 assert.ok(REPAIR_OPTIONS["Tech Services"].includes(ISSUE));
 assert.ok(REPAIR_OPTION_GROUPS["Tech Services"]["IBS Screen"].includes("Run box no display"));
 assert.equal(repairIssueDisplayLabel("Run box no display","IBS Screen"),"Run box no display");

 /* THE DEVICE COMES OFF THE PREFIX, which is the whole point of storing it.
    `tech-services.ts` reads "IBS Screen" out of the words, so the `ibs-ventra`
    quick filter picks the entry up with no edit. A farebox it is not — the
    farebox pattern needs the literal "fare", so the `box` in "Run box" cannot
    reach it.

    AND NOT THE STATUS REPORT, which an earlier version of this comment claimed
    twice. `techSections` prints FAREBOX, VENTRA and CUBIC SCREENS and says so
    in its own words; `tech.ibs` is computed and rendered nowhere, so this entry
    is invisible in both output formats with every box ticked. Measured, not
    read. The consequence had its own bug and its own fix — see
    tests/reports.test.mjs, "an IBS screen defect must not take a flagged bus
    out of the status report". Whether a line should exist is Curtis's call.

    `TECH_SERVICES_LABELS.ibs` was asserted here as the source of that line. It
    is not the source of anything: the constant has no consumer in `src/` or
    `app/` at all, and the report's headings are literals inside `techSections`.
    A self-referential assertion gone rather than left looking like a gate. */
 assert.equal(techServicesGroup(ISSUE),"ibs");
 assert.equal(isIbsVentra(ISSUE),true,"counts with the Ventra family, as the CUBIC screens do");
 assert.equal(isFarebox(ISSUE),false);

 /* A record stored under it reads back unchanged — no rename map touches it,
    and nothing normalises it into one of the two entries it sits beside. */
 const stored=normalizeDefects([{id:"d",category:"Tech Services",issue:ISSUE,details:"",
  operability:"service",state:"open"}])[0];
 assert.equal(stored.issue,ISSUE);
 assert.equal(stored.category,"Tech Services");

 /* THE SPOKEN PATH PICKS IT UP FOR FREE, because the alias table is built from
    the catalog. "Run box no display" is a tail no other device shares, so it
    resolves rather than being refused the way "screen black" and
    "inop general" are — those are shared by two and three devices.

    THE TYPED PICKER HAS ALWAYS BEEN MORE GENEROUS, which an earlier version of
    this test called "the refusal this catalog makes everywhere else". It is
    not: `searchCatalog` resolves bare "run box", and "no display", and even
    "display", to this one option. The refusal was a property of the spoken
    table's exact-tail rule alone, and for one commit the two halves of the app
    disagreed about the same two words. */
 const {planOperatorCommand}=await import("../src/lib/operator/operator-engine.ts");
 const fleet=[{id:"b1",n:"17559",location:"garage-1",status:"ok",defects:[]}];
 const picked=text=>{const result=planOperatorCommand(text,fleet,[]);
  const draft=result?.plan?.defect;return draft?draft.category+" | "+draft.issue:null};
 assert.equal(picked("bus 17559 defect run box no display"),"Tech Services | "+ISSUE);
 assert.equal(picked("bus 17559 defect ibs screen run box no display"),"Tech Services | "+ISSUE);
 /* AND BARE "RUN BOX" REACHES IT TOO, through the hand-typed shorthand Curtis
    asked for — the alias pass only ever gets the whole tail, and a mechanic
    standing at the bus says "the run box". */
 assert.equal(picked("bus 17559 defect run box"),"Tech Services | "+ISSUE);

 /* It inherits the category's own estimate rather than needing a rule. */
 const {normalizeRepairTimeEstimate,repairTimeTotal}=await import("../src/lib/down-sheet/repair-time-estimates.ts");
 assert.equal(repairTimeTotal(normalizeRepairTimeEstimate(undefined,"Tech Services",ISSUE)),
  repairTimeTotal(normalizeRepairTimeEstimate(undefined,"Tech Services","IBS Screen - Screen black")),
  "the same allowance as the entry beside it");
});

test("a window that cannot be resolved says so, rather than silently showing every date",async()=>{
 /* Both screens offer THIS SHIFT, and the limit and the label degrade TOGETHER
    to "no window" when the clock cannot answer — which is the right failure,
    argued at length in feed-window.ts: a narrowed board under a heading saying
    THIS SHIFT is the one outcome that file exists to prevent.

    What it left behind was a quieter lie. The drop-down still read THIS SHIFT,
    the list was the WHOLE history, and the bar that would have explained it
    hangs off the label — so the explanation vanished in exactly the case that
    needed explaining. */
 const {feedWindowMinutes,feedWindowLabel,feedWindowUnresolved,feedWindowUnresolvedNote}=
  await import("../src/lib/defects/feed-window.ts");
 const NOW=new Date("2026-10-29T15:00:00.000Z");
 /* ALL THREE WINDOWS NARROWED, not one. `normalizeShiftSettings` fills any
    shift the stored record does not carry from the defaults, so a record with
    one odd window still has the other two covering most of the day — a
    one-shift fixture here would be a shape no device can actually hold, and
    this is meant to be the reachable case: somebody edits the hours in
    Settings and leaves a gap. */
 const HOUR=[{key:"1st",start:"03:00",end:"04:00"},{key:"2nd",start:"03:00",end:"04:00"},
  {key:"3rd",start:"03:00",end:"04:00"}];
 const NARROW={shifts:HOUR,pullouts:[]};
 assert.equal(feedWindowMinutes("shift",new Date("2026-10-29T03:30:00.000Z"),NARROW)===null,
  new Date("2026-10-29T03:30:00.000Z").getHours()!==3,
  "the fixture has to MISS now to be testing anything — it covers 03:00-04:00 local only");

 /* The degradation itself, both halves, so this test fails if somebody ever
    "fixes" the pairing by making one of them guess. */
 assert.equal(feedWindowMinutes("shift",NOW,NARROW),null);
 assert.equal(feedWindowLabel("shift",NOW,NARROW),"");
 assert.equal(feedWindowUnresolved("shift",NOW,NARROW),true);
 assert.equal(feedWindowUnresolvedNote("shift"),"SHIFT HOURS DO NOT COVER NOW — SHOWING EVERY DATE");

 /* ALL IS NOT A FAILURE TO RESOLVE A WINDOW, it is the absence of one. Warning
    on the whole board, which is every device that has not narrowed anything,
    would be the kind of permanent banner people stop seeing. */
 assert.equal(feedWindowUnresolved("all",NOW,NARROW),false);
 assert.equal(feedWindowUnresolved("all",new Date(NaN),NARROW),false);

 /* And a shift that DOES resolve is not warned about. 15:00Z is inside the
    default 2nd shift in this container's local time; assert through the
    resolver rather than against a wall-clock guess, so this cannot start
    failing on a machine in another zone. */
 const resolvable=feedWindowMinutes("shift",NOW)!==null;
 assert.equal(feedWindowUnresolved("shift",NOW),!resolvable,
  "the warning is exactly the cases where the limit came back null");
 for(const key of ["24h","3d","7d","30d"]){
  assert.equal(feedWindowUnresolved(key,NOW,NARROW),false,key+" is a fixed span and cannot fail to resolve");
  assert.equal(feedWindowUnresolved(key,new Date(NaN),NARROW),false,key+" does not need the clock either");
 }

 /* A BROKEN CLOCK IS A DIFFERENT SENTENCE, because it sends somebody to a
    different place — the phone, not Settings. TODAY is the only other key that
    can degrade at all. */
 assert.equal(feedWindowMinutes("today",new Date(NaN)),null);
 assert.equal(feedWindowLabel("today",new Date(NaN)),"");
 assert.equal(feedWindowUnresolved("today",new Date(NaN)),true);
 assert.equal(feedWindowUnresolvedNote("today"),"THIS DEVICE'S CLOCK CANNOT ANSWER — SHOWING EVERY DATE");
 assert.notEqual(feedWindowUnresolvedNote("today"),feedWindowUnresolvedNote("shift"),
  "one sentence covering both causes would be wrong half the time");
 assert.equal(feedWindowUnresolved("today",NOW),false,"a readable clock always resolves TODAY");

 /* BOTH SCREENS DRAW IT, and from this one function — two pages each
    re-deriving "not ALL and the limit came back null" are two pages that will
    eventually disagree about when to warn. */
 const {readFileSync}=await import("node:fs");
 for(const page of ["app/fixed-repairs/page.tsx","app/defect-log/page.tsx"]){
  const source=readFileSync(new URL("../"+page,import.meta.url),"utf8");
  assert.match(source,/feedWindowUnresolved\(/,page+" must ask the module, not re-derive it");
  assert.match(source,/feedWindowUnresolvedNote\(/,page+" must draw the module's own wording");
 }
});

test("the Fixed Repairs scope bar names the category too, not only the window and the search",async()=>{
 /* The bar counted what the window held back and what the search hid, and said
    nothing at all about the CATEGORY above them — so a history narrowed to
    Brakes read as the whole history with a smaller number in it. The share
    HEADING had the same hole and was fixed first; this is the one somebody is
    actually looking at. */
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8");

 /* MEASURED AGAINST `records`, because the category is the FIRST stage and has
    nothing above it to subtract from. Against `inWindow` or `visible` it would
    double-count whatever the window and the search had already set aside —
    the precise arithmetic bug the window's own count carries a comment about. */
 assert.match(source,/const categoryHeld=records\.length-inCategory\.length;/,
  "the category's count is records minus inCategory, or it double-counts");
 assert.match(source,/\{categoryHeld>0\?<small>\{categoryHeld\} IN OTHER CATEGORIES<\/small>:null\}/);

 /* AND THE BAR HAS TO BE ABLE TO APPEAR FOR IT. The visibility gate listed the
    window, the search and the window's own count; a category narrowing with no
    window and no search left the whole bar hidden, which is the same silence
    with an extra step. */
 /* Read as the ONE LINE that opens the bar rather than with a regex spanning
    the condition: the gate holds `search.trim()`, so an `[^)]*` capture stops
    at the first bracket inside it and a non-greedy one can start at an earlier
    `{(` elsewhere in the file. The line is unambiguous. */
 const gate=source.split("\n").find(line=>line.includes('&&<p className="fixed-scope">'));
 assert.ok(gate,"the scope bar's visibility gate must be findable");
 for(const term of ["categoryHeld>0","windowUnresolved"])
  assert.ok(gate.includes(term),"the bar must be able to appear for "+term+" — gate reads "+gate.trim());
});

test("the row count combo-field.tsx argues from is the catalog's real size",async()=>{
 /* `combo-field.tsx` justifies recomputing its ranking on every render, and
    not doing it while the list is shut, by quoting the catalog's size twice.
    Both copies said 338. The catalog is 357, and was 356 before RUN BOX NO
    DISPLAY — stale by nineteen, unnoticed, because nothing anywhere read the
    real number.

    This is prose about render cost rather than a behavioural claim, which is
    exactly why it rotted: no gate, no reason for anybody to check. One digit
    to update is a fair price for an argument that stays true, and if the
    catalog ever doubles, the argument itself deserves re-reading. */
 const {readFileSync}=await import("node:fs");
 const {REPAIR_OPTIONS}=await import("../src/lib/defects/repair-catalog.ts");
 const rows=Object.values(REPAIR_OPTIONS).flat().length;
 const source=readFileSync(new URL("../src/components/shared/combo-field.tsx",import.meta.url),"utf8");
 const quoted=[...source.matchAll(/catalog(?:,| is) (\d+) rows/g)].map(match=>Number(match[1]));
 assert.equal(quoted.length,2,"both copies of the number must be findable — found "+quoted.length);
 for(const value of quoted)assert.equal(value,rows,
  "combo-field.tsx argues from "+value+" rows; the catalog holds "+rows);
});

test("the step-by-step helper points at the next field and never invents a requirement", async () => {
 const {coachStep}=await import("../src/lib/defects/form-coach.ts");
 const draft=(over={})=>({busId:"",category:"",issue:"",...over});
 const plain={requireInitials:false};

 /* THE ORDER IS CURTIS'S — "the bus number being the first thing then after
    that the defects" — and it is the form's own document order. */
 assert.equal(coachStep(draft(),plain).key,"bus");
 assert.equal(coachStep(draft({busId:"b1"}),plain).key,"category");
 assert.equal(coachStep(draft({busId:"b1",category:"Brakes"}),plain).key,"issue");
 assert.equal(coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak"}),plain).key,"ready");

 /* A grouped category asks for the system first, and which categories are
    grouped is read off the picker's own table rather than listed anywhere. */
 const grouped=Object.keys(REPAIR_OPTION_GROUPS).filter(name=>Object.keys(REPAIR_OPTION_GROUPS[name]||{}).length);
 assert.ok(grouped.length>1,"the catalog has grouped categories to test with");
 for(const category of grouped){
  const step=coachStep(draft({busId:"b1",category}),plain);
  assert.equal(step.key,"group",category+" asks for the group first");
  assert.equal(step.title,repairGroupStepLabel(category),category+" uses the picker's own heading");
 }
 for(const category of Object.keys(REPAIR_OPTIONS).filter(name=>!grouped.includes(name))){
  assert.equal(coachStep(draft({busId:"b1",category}),plain).key,"issue",category+" goes straight to the repair");
 }

 /* WHAT IT CALLS BLOCKING IS WHAT THE FORM ACTUALLY REFUSES. `validateAndSave`
    refuses no bus, no category, a required count out of range, FIXED BY empty
    on a save-as-fixed, and a recent duplicate — and nothing else. A first
    draft of this module marked the specific defect required and marked
    REPORTED BY required too; both were false, and a helper that says a field
    is needed when it is not is worse than no helper, because it is believed.

    The form's own placeholder is the witness for the issue one: "or leave it
    and save the category alone". */
 assert.equal(coachStep(draft(),plain).blocking,true,"no bus blocks");
 assert.equal(coachStep(draft({busId:"b1"}),plain).blocking,true,"no category blocks");
 assert.equal(coachStep(draft({busId:"b1",category:"Brakes"}),plain).blocking,false,
  "the specific defect does not block a save and must not be presented as if it did");
 assert.match(coachStep(draft({busId:"b1",category:"Brakes"}),plain).message,/save the category on its own/);

 /* REQUIRE INITIALS GATES FIXED BY ON A SAVE-AS-FIXED, never an ordinary save,
    so it can never produce a step of its own and can only change what the
    last message says. */
 for(const requireInitials of [true,false])for(const initials of ["","JS"]){
  const options={requireInitials,completedBy:initials};
  const walk=[draft(),draft({busId:"b1"}),draft({busId:"b1",category:"Brakes"}),
   draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak"})];
  const keys=walk.map(row=>coachStep(row,options).key);
  assert.deepEqual(keys,["bus","category","issue","ready"],
   "require="+requireInitials+" initials="+JSON.stringify(initials)+" walks the same four steps");
  const ready=coachStep(walk[3],options);
  assert.equal(ready.blocking,false);
  assert.equal(/FIXED BY/.test(ready.message),requireInitials&&!initials,
   "the initials line is said only where it will actually stop somebody");
 }

 /* AND IT NAMES BOTH WAYS OUT, because the question asked was what happens
    "in case a person doesn't necessarily want to save a defect and recommended
    on the down sheet". */
 const ready=coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak"}),plain);
 assert.match(ready.message,/RECOMMEND FOR DOWN SHEET/);
 assert.match(ready.message,/optional/);

 /* A DEFECT ALREADY LOGGED DISABLES ALL FOUR SAVE BUTTONS, and the helper used
    to say "THAT IS ENOUGH TO SAVE · Save it now" over the top of that. A cold
    read reproduced it: the ALREADY LOGGED banner up, every save button
    disabled, and the one moment the helper is most needed pointing the wrong
    way. It was written in the same hour as a comment listing that refusal. */
 const logged={requireInitials:false,duplicateAt:"2026-11-02T10:00:00.000Z",
  duplicateWhen:"an hour ago",duplicateWindow:"4 hours"};
 const dupe=coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak"}),logged);
 assert.equal(dupe.key,"duplicate");
 assert.equal(dupe.blocking,true,"a duplicate stops the save, so the helper must say so");
 assert.equal(dupe.target,"duplicate");
 assert.match(dupe.message,/already logged an hour ago/);
 assert.match(dupe.message,/Use the existing defect/);
 /* And it outranks the closing message rather than appearing after it. */
 assert.notEqual(coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak"}),logged).key,"ready");

 /* WORK STATUS SET TO FIXED MAKES AN ORDINARY SUBMIT A SAVE-AS-FIXED, which
    this file's own comment used to deny in as many words: REQUIRE INITIALS
    "does not gate an ordinary save at all". `validateAndSave` computes
    `completed=complete||defect.state==="completed"`, so pressing SAVE DEFECT
    with the status on Fixed and FIXED BY empty is refused. */
 const fixedNoInitials=coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak",state:"completed"}),
  {requireInitials:true,completedBy:""});
 assert.equal(fixedNoInitials.key,"initials");
 assert.equal(fixedNoInitials.blocking,true);
 assert.equal(fixedNoInitials.target,"initials");
 assert.match(fixedNoInitials.message,/FIXED BY/);
 /* With initials, or with the setting off, the same draft is ready. */
 assert.equal(coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak",state:"completed"}),
  {requireInitials:true,completedBy:"JS"}).key,"ready");
 assert.equal(coachStep(draft({busId:"b1",category:"Brakes",issue:"Brake chamber leak",state:"completed"}),
  {requireInitials:false,completedBy:""}).key,"ready");

 /* THE COUNT STEP IS THE CATALOG'S, not a list kept here: every repair the
    catalog marks `required` stops the helper, and no other repair does. */
 const counted=[];
 for(const [category,issues] of Object.entries(REPAIR_OPTIONS))for(const issue of issues){
  const field=defectCountField(category,issue);
  const step=coachStep(draft({busId:"b1",category,issue}),plain);
  if(field?.required){
   counted.push(category+" / "+issue);
   assert.equal(step.key,"count",category+" / "+issue+" asks for its count");
   assert.equal(step.blocking,true);
   assert.equal(step.title,field.label);
   /* In range it stops asking; over the ceiling it asks again, which is the
      same window `validateAndSave` refuses on. */
   assert.equal(coachStep(draft({busId:"b1",category,issue,count:1}),plain).key,"ready");
   assert.equal(coachStep(draft({busId:"b1",category,issue,count:field.max+1}),plain).key,"count");
   assert.equal(coachStep(draft({busId:"b1",category,issue,count:0}),plain).key,"count");
  }else assert.equal(step.key,"ready",category+" / "+issue+" has nothing left to ask");
 }
 assert.ok(counted.length>0,"the catalog has a required count to point at: "+counted.join(", "));
});

test("every field the step-by-step helper names is drawn, and the ring's own attribute is agreed", async () => {
 const {coachStep}=await import("../src/lib/defects/form-coach.ts");
 const [page,combo,picker,bar,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/components/shared/combo-field.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/components/shared/bus-selector.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/_components/form-coach-bar.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);

 /* THE ONE GATE WITH TEETH, and its first version had none in the place that
    mattered. `form-coach.ts` names a field by a `data-coach` value and the
    ring is put on by a DOM scan, so a renamed or removed anchor fails
    silently — the bar still says CHOOSE THE DEFECT and nothing lights up.
    The first version read ONLY page.tsx, where three of the five anchors
    appear merely as the `coach="…"` prop; the attribute the scan actually
    looks for is emitted in combo-field.tsx and bus-selector.tsx. Deleting
    `data-coach={coach}` from either left the whole suite green. A cold read
    found that, and it is the exact failure this test exists to stop. */
 for(const [name,code] of [["ComboField",combo],["BusSelector",picker]])
  assert.match(code,/data-coach=\{coach\}/,name+" emits the attribute the ring is put on, not just the prop");

 const drawn=new Set();
 for(const code of [page,combo,picker])for(const match of code.matchAll(/data-coach="([a-z]+)"/g))drawn.add(match[1]);
 /* A prop on a component proven above to land it as the attribute. */
 for(const match of page.matchAll(/\bcoach="([a-z]+)"/g))drawn.add(match[1]);

 /* Every step the module can produce, walked rather than listed. */
 const targets=new Set();
 const duplicate={duplicateAt:"2026-11-02T10:00:00.000Z",duplicateWhen:"an hour ago",duplicateWindow:"4 hours"};
 for(const [row,options] of [
  [{busId:"",category:"",issue:""},{requireInitials:false}],
  [{busId:"b1",category:"",issue:""},{requireInitials:false}],
  [{busId:"b1",category:"Brakes",issue:""},{requireInitials:false}],
  [{busId:"b1",category:"A/C and HVAC",issue:""},{requireInitials:false}],
  [{busId:"b1",category:"Cooling System",issue:"Radiator fan(s) out"},{requireInitials:false}],
  [{busId:"b1",category:"Brakes",issue:"Brake chamber leak",state:"completed"},{requireInitials:true,completedBy:""}],
  [{busId:"b1",category:"Brakes",issue:"Brake chamber leak"},{requireInitials:false,...duplicate}],
  [{busId:"b1",category:"Brakes",issue:"Brake chamber leak"},{requireInitials:false}],
 ])targets.add(coachStep(row,options).target);

 /* EQUALITY, not a subset, which is what the module and the handoff both
    claim. A subset passes while the form draws anchors nothing points at. */
 assert.deepEqual([...targets].sort(),["bus","category","count","duplicate","initials","issue","save"],
  "the walk reaches every step this module can produce");
 assert.deepEqual([...targets].sort(),[...drawn].sort(),
  "every anchor the form draws is pointed at, and every step points at one the form draws");

 /* AND THE ATTRIBUTE NAME ITSELF IS AGREED. The component writes it and the
    stylesheet draws off it, by convention alone — rename either and nothing
    failed. */
 assert.match(bar,/setAttribute\("data-coach-active"/);
 assert.match(bar,/removeAttribute\("data-coach-active"\)/);
 assert.match(css,/\[data-coach-active\]\{outline:/,"the stylesheet rings the attribute the component sets");

 /* And the bar is drawn where it cannot be covered: outside the scrolling
    form, between the header and it. Inside `.log-form` it would scroll away
    and, on a phone, sit under the keyboard. */
 const at=page.indexOf("<FormCoachBar"),form=page.indexOf('<div className="log-form">');
 assert.ok(at>0&&form>0&&at<form,"the helper's bar is drawn before the scrolling form, not inside it");
});

test("the step-by-step helper is off until somebody turns it on", async () => {
 const {COACH_SETTINGS_KEY,readCoachSettings,writeCoachSettings}=await import("../src/lib/settings/coach-settings.ts");
 assert.equal(COACH_SETTINGS_KEY,"pace-coach-v1");

 /* OFF IS THE SAFE READ, the spelling `feedback-settings.ts` uses: anything
    that is not exactly `true` is off. A helper that turned itself on because
    a record went strange would be putting a bar over somebody's form
    mid-shift. `app-mode.ts` inverts this deliberately and says why. */
 for(const raw of [null,"","{}","not json","[]","0",'{"on":"yes"}','{"on":1}','{"on":null}','{"version":1}']){
  const store={getItem:()=>raw};
  assert.deepEqual(readCoachSettings(store),{on:false},JSON.stringify(raw)+" reads as off");
 }
 assert.deepEqual(readCoachSettings({getItem:()=>'{"on":true}'}),{on:true});
 assert.deepEqual(readCoachSettings(null),{on:false},"no storage at all is off, not a throw");

 /* The write says whether it wrote. A full device must not be shown a switch
    that moved while nothing was saved. */
 let held=null;
 assert.equal(writeCoachSettings({setItem:(_key,value)=>{held=value}},{on:true}),true);
 assert.deepEqual(JSON.parse(held),{on:true});
 assert.equal(writeCoachSettings({setItem:()=>{throw new Error("quota")}},{on:true}),false,
  "a refused write reports false rather than claiming the switch moved");
 assert.equal(writeCoachSettings(null,{on:true}),false);
 /* Only ever `true` or `false` on disk, never the value as handed in. */
 writeCoachSettings({setItem:(_key,value)=>{held=value}},{on:"yes"});
 assert.deepEqual(JSON.parse(held),{on:false},"a strange value is stored as off rather than kept");
});

test("the Settings switch and the Defect Log read one key, and the form cannot gate on the helper", async () => {
 const modal=await readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8");
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const coach=await readFile(new URL("../src/lib/defects/form-coach.ts",import.meta.url),"utf8");

 /* Neither side may name the key as a literal: the pair that drifted when a
    string was typed into five share modules is why `site-identity.ts` exists. */
 for(const [name,code] of [["the Settings switch",modal],["the Defect Log",page]]){
  assert.ok(/from "@\/src\/lib\/settings\/coach-settings"/.test(code),name+" reads the switch through its module");
  assert.ok(!/"pace-coach-v1"/.test(code),name+" does not spell the key out");
 }
 /* READ IN AN EFFECT, not in the initialiser. The server cannot see
    LocalStorage, so a checkbox initialised from it renders checked on the
    server and unchecked on the client — a hydration error. */
 assert.match(modal,/useEffect\(\(\)=>\{setCoachOn\(readCoachSettings\(localStorage\)\.on\)\}/);
 assert.ok(!/useState\(\(\)=>readCoachSettings/.test(modal),"the switch is not initialised from storage");

 /* IT POINTS, IT DOES NOT GATE. Nothing in the helper may reach a save path,
    and the module must not be able to refuse anything. */
 /* IT POINTS, IT DOES NOT GATE. An earlier version of this looked like a gate
    and was not one: it ran /coach/i against the MATCHED TOKEN — "alert(",
    "throw ", "return false" or "" — rather than against the code, so it was
    always false and the assertion always passed. A cold read proved it by
    appending a function that alerted, threw and returned false; it still
    passed. The plain scan below is the whole check. */
 for(const forbidden of ["alert(","throw ","disabled=","preventDefault"]){
  assert.ok(!coach.includes(forbidden),"form-coach.ts does not "+forbidden);
 }
 /* And the module cannot reach storage or the DOM: it answers a question about
    a half-filled record and nothing else. */
 for(const forbidden of ["localStorage","document.","window."]){
  assert.ok(!coach.includes(forbidden),"form-coach.ts does not touch "+forbidden);
 }
 /* And the save buttons' disabled condition is the duplicate check alone,
    exactly as it was before the helper existed. */
 /* THE FOUR SAVE BUTTONS' GUARD IS UNCHANGED BY THE HELPER, and this is the
    exact assertion a cold read found toothless twice over. It matched on
    `className="save-log-middle` as a PREFIX, so once this change added the
    wrapper `<div className="save-log-middle-actions" … data-coach="save">`
    the indexOf found the DIV — which carries no `disabled=` — and the
    `if(tag.includes("disabled="))` then skipped the assertion entirely. The
    one button not checked was the `type="submit"` one a mechanic presses.
    That `if` also meant deleting `disabled` from all four passed. Matched on
    the closing quote now, and every button asserted unconditionally. */
 for(const button of ["save-log-middle","save-fixed-middle","save-fixed-part-middle","save-log","save-fixed-bottom","save-fixed-part-bottom"]){
  const at=page.indexOf('className="'+button+'"');
  assert.ok(at>0,button+" is still drawn under exactly that class");
  const tag=page.slice(at,page.indexOf(">",at));
  assert.match(tag,/disabled=\{Boolean\(recentDuplicate\)\}/,
   button+"'s disabled condition is the duplicate check alone");
 }
});

test("the defect form and its helper refuse a save from one rule, not two copies of one", async () => {
 const [page,coach,rule]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/defects/form-coach.ts",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/defects/save-refusal.ts",import.meta.url),"utf8"),
 ]);

 /* WHY THIS GATE EXISTS. The refusal set lived inline in `validateAndSave` as
    five `if(...)alert(...)` clauses, and `form-coach.ts` then RE-STATED it as
    hand-written `blocking` flags. A cold read found both copies had already
    diverged, in the same hour they were written:

      - a RECENT DUPLICATE disables all four save buttons and the helper said
        "THAT IS ENOUGH TO SAVE · Save it now";
      - WORK STATUS on Fixed turns an ordinary submit into a save-as-fixed, so
        REQUIRE INITIALS does gate it — which the helper's comment denied.

    Two copies of one rule is what `docs/ARCHITECTURE.md` forbids and what the
    MCP constraint in CLAUDE.md exists to prevent. This asserts there is one. */
 assert.match(page,/import \{saveRefusal\} from "@\/src\/lib\/defects\/save-refusal"/,
  "the form asks the rule");
 assert.match(coach,/from "\.\/save-refusal\.ts"/,"and so does the helper");

 /* NEITHER MAY RE-DECIDE IT. Every message the rule owns lives in the rule and
    nowhere else, so a wording change cannot land in one copy. */
 const owned=["Select a bus number.","Select a repair category.",
  "Put your initials or name in FIXED BY before saving this as fixed",
  "This same defect was already logged"];
 for(const message of owned){
  assert.ok(rule.includes(message),"save-refusal.ts owns: "+message);
  assert.ok(!page.includes(message),"the form does not restate: "+message);
  assert.ok(!coach.includes(message),"the helper does not restate: "+message);
 }

 /* AND THE HELPER DOES NOT TYPE `blocking` BY HAND. Every blocking:true in it
    must be on a branch that already holds a refusal; the only hard-coded ones
    left are the two false branches — the issue step, which is a stop on the
    walk rather than a refusal, and the closing message. */
 const trues=(coach.match(/blocking:true/g)||[]).length;
 const falses=(coach.match(/blocking:false/g)||[]).length;
 assert.ok(trues<=2,"blocking:true appears only on the refusal branches, not once per step");
 assert.equal(falses,3,"and the three non-refusal steps are the group, issue and ready ones");

 /* The form's save path holds no refusal of its own beyond the one call. */
 const save=page.slice(page.indexOf("const validateAndSave="),page.indexOf("\n const submit="));
 const alerts=(save.match(/alert\(/g)||[]).length;
 assert.equal(alerts,1,"one alert in the save path, and it prints what the rule returned");
 assert.match(save,/if\(refusal\)\{alert\(refusal\.message\);return\}/);
});

test("DEFECTS LOGGED lists what somebody logged, not what a scanned sheet brought in",async()=>{
 const {loggedByHand}=await import("../src/lib/defects/quick-filters.ts");
 const now="2026-11-05T20:04:00.000Z";
 const ago=hours=>new Date(Date.parse(now)-hours*3600e3).toISOString();
 const defect=(id,source,issue)=>({id,category:"Inspection",issue,details:"",state:"open",
  operability:"down",source,createdAt:ago(3),updatedAt:ago(3)});

 /* Curtis, looking at a DEFECTS LOGGED share that had picked up rows off a
    scanned sheet: "I have no reason to share something off the down sheet
    because the down sheet is already coming from the source — the down sheet
    is located in an office, so I'm not gonna send them something that they
    already have written down... for this particular function, no, just things
    that were logged by hand."

    A scanned row becomes a real defect, correctly stamped `down-sheet`, and
    its createdAt is WHEN THE SCAN RAN — so importing yesterday's paper at
    20:00 dropped the whole sheet into "the last 8 hours" at once. */
 const bus={id:"b",n:"18505",defects:[
  defect("d1","defect-log","Crank no start"),
  defect("d2","tracker","Doors - Front door"),
  defect("d3","down-sheet","C-24"),
  defect("d4","down-sheet","Driver-reported defect"),
 ]};
 const logged=quickFilterDefects(bus,"logged",now,{maxAgeMinutes:480});
 assert.deepEqual(logged.map(row=>row.id).sort(),["d1","d2"],
  "the two somebody logged, and neither of the two the paper brought in");

 /* ONLY THE PAPER IS EXCLUDED. Typing into the Defect Log, into the map's bus
    editor, or speaking to the AI operator is all somebody logging it, and a
    defect with no source at all reads as the app's default rather than as the
    sheet's. */
 for(const source of ["defect-log","tracker","operator","scan",undefined,""])
  assert.equal(loggedByHand({source}),true,JSON.stringify(source)+" is somebody logging it");
 assert.equal(loggedByHand({source:"down-sheet"}),false);

 /* AND A DEFECT KEEPS THE SOURCE IT WAS BORN WITH. applyDownEntryToFleet
    writes `linked?.source||"down-sheet"`, so a defect logged by hand that
    LATER lands on a sheet stays in this list. Somebody logged it; the paper
    catching up does not take that away. */
 const sync=await readFile(new URL("../src/lib/down-sheet/down-sheet-sync.ts",import.meta.url),"utf8");
 assert.match(sync,/source:linked\?\.source\|\|"down-sheet"/,
  "a sheet row never overwrites a source a defect already had");

 /* The drawer says so, above the share buttons, which is the last place
    anybody looks before sending the list on. */
 const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const note=page.indexOf("LOGGED BY HAND ONLY");
 assert.ok(note>0,"the drawer states its scope");
 assert.ok(note<page.indexOf('className="quick-filter-share-actions"'),"before the share buttons");

 /* AND `defectWithinFeedWindow` ASKS THE SAME QUESTION - with one honest
    correction about where the answer matters.

    The WHEN LOGGED drop-down over the feed carries the same guard, and at its
    one caller today the guard never fires: `defectLogRecords` filters
    `source==="defect-log"` before the page sees a record, and `loggedByHand`
    is `source!=="down-sheet"`, so everything reaching it already passes. The
    code comment that shipped with it claimed "ALL still shows them", which was
    the opposite of true on that screen - a scanned row is not in ALL either,
    because it never enters the list at all. A cold read caught the claim.

    The guard stays as a property of the question rather than of today's
    caller, so this drives it directly: the function is what a route, an export
    or a whole-fleet read would ask, and the filter that currently makes it moot
    lives in another module. */
 const {defectWithinFeedWindow:inWindow}=await import("../src/lib/defects/feed-window.ts");
 const at=new Date("2026-01-02T12:00:00.000Z");
 const scanned={...defect("s1","down-sheet","C-24"),createdAt:"2026-01-02T11:30:00.000Z"};
 const typed={...defect("t1","defect-log","Crank no start"),createdAt:"2026-01-02T11:30:00.000Z"};
 assert.equal(inWindow(typed,1440,at),true,"something logged half an hour ago is in the window");
 assert.equal(inWindow(scanned,1440,at),false,
  "a scanned row is out of every narrowed window: its createdAt is when the scan ran");
 assert.equal(inWindow(scanned,null,at),true,
  "and ALL is the absence of a window, so it keeps everything handed to it");
 /* AND THE FILTER THAT MAKES IT MOOT AT THE FEED IS STILL THERE, named here so
    the dead-code account above cannot quietly stop being true. */
 const sheetBus={id:"b2",n:"18506",pendingRepair:"",defects:[typed,scanned]};
 assert.deepEqual(defectLogRecords([sheetBus],[]).map(record=>record.defect.id),["t1"],
  "the Defect Log's own list never carries a scanned row in the first place");
});
