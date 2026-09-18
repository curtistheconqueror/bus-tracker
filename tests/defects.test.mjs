/* the defect catalog, the Defect Log and what is deferred. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BRAKE_TEST_KEY, CATALOG_OPTIONS, CHECK_ENGINE_ISSUES, CHECK_ENGINE_SYMPTOMS, DEFAULT_DEFECT_LOG_DISPLAY, DEFAULT_DOWN_SHEET_DISPLAY, EMPTY_FINDINGS_MEMORY, EMPTY_PARTS_MEMORY, FLUID_TOP_UPS, PARTS_MEMORY_LIMIT, PARTS_MEMORY_STORAGE_KEY, QUICK_FILTERS, QUICK_FILTER_EVENT, QUICK_FILTER_PARAM, RECENT_DUPLICATE_WINDOW_HOURS, RECENT_DUPLICATE_WINDOW_LABEL, REPAIR_CATEGORY_EMOJI, REPAIR_OPTIONS, REPAIR_OPTION_GROUPS, RETIRED_ISSUES, WORK_STATES, activeDefectLogCount, applyDefectToBuses, applyDownEntryToFleet, applyOperatorBatch, brakeTestFailed, brakeTestResult, defaultDefectOperability, defectCountField, defectFromDraft, defectLabel, defectLogRecords, defectNote, defectSummary, defectSupportingDetails, defectWorkStates, deferredBadgeCounts, deferredMinutesElapsed, diagLightLabel, fluidsLabel, forgetFinding, forgetPart, groupDefectLogRecords, hasDeferredHistory, hasDiagLightField, hasWorkState, heldDeferredBuses, hideDefectLogRecords, isCheckEngineIssue, isDefectLogCleanupCandidate, isDownSheetRecommended, isFluidTopUp, isHeldDeferred, isUnresolved, learnFinding, learnPart, migrateRepairIdentity, moveOrSwapBuses, normalizeAlarmCode, normalizeDefectLogDisplay, normalizeDefects, normalizeDiagLight, normalizeDownSheetDisplay, normalizeFinding, normalizeFindingsMemory, normalizeFluids, normalizePartsMemory, normalizeRepairCount, normalizeRepairItems, normalizeSweepRow, normalizeWorkStateStamp, normalizeWorkStates, noteIssues, partMemoryKey, partMemoryLabel, partNumberMissing, quickFilterBusIds, quickFilterDefects, quickFilterFallbackLabel, quickFilterFromValue, quickFilterHref, quickFilterMatch, quickFilterShareText, readPartsMemory, readSettings, recallFindings, recallPart, recentDefectDuplicate, recommendedMinutesElapsed, repairCategoryEmoji, repairCategoryLabel, repairGroupDisplayLabel, repairGroupPlaceholder, repairGroupStepLabel, repairIssueDisplayLabel, repairIssuePlaceholder, repairIssueStepLabel, returnDefectLogBusToService, saveDefectLogRecord, searchCatalog, searchCatalogForCategory, searchCategories, searchTerms, setDefectWorkState, setDownSheetRecommendation, statusForLocation, sweepDefect, sweepFindings, sweepOkAgainstBoard, workStateStampLabel, writePartsMemory } from "./helpers/modules.mjs";
import { render } from "./helpers/setup.mjs";

test("defect normalization preserves future odometer and parts fields",()=>{
 const [defect]=normalizeDefects([{id:"future-defect",category:"Bus Controls",issue:"Horn",details:"No horn",state:"open",operability:"service",odometerMiles:123456,partsUsed:true,parts:[{id:"part-1",partNumber:"HORN-1"}],futureMetadata:{revision:4}}]);
 assert.equal(defect.odometerMiles,123456);
 assert.equal(defect.partsUsed,true);
 assert.deepEqual(defect.parts,[{id:"part-1",partNumber:"HORN-1"}]);
 assert.deepEqual(defect.futureMetadata,{revision:4});
});

test("shared Quick Filters classify active tracker and Defect Log records", () => {
  const buses=[
    {id:"ac",n:"1",defects:[{category:"A/C and HVAC",issue:"No cooling",details:"",state:"open"}]},
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
  assert.equal(QUICK_FILTERS.length,13);
  /* Recommended for Down Sheet and Deferred stay last on purpose: the others
     answer "what is broken" and these two answer "what needs a decision". */
  assert.equal(QUICK_FILTERS.at(-2).key,"down-sheet-recommended");
  assert.equal(QUICK_FILTERS.at(-1).key,"deferred");
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
  assert.deepEqual(quickFilterDefects(mixed,"ac").map(defect=>defect.issue),["No cooling"]);
  // A blank line between buses and the defects indented under the number. This
  // gets read on a phone in a garage, where fourteen buses of run-on text is a
  // wall the eye slides off. A bus with no location simply omits it.
  assert.equal(quickFilterShareText("A/C",[mixed],"ac"),"A/C — 1 bus\n\nBus 8\n   A/C and HVAC — No cooling");
  assert.equal(quickFilterShareText("Farebox",[{id:"flag",n:"9",farebox:true,defects:[buses[7].defects[0]]}],"farebox"),"Farebox — 1 bus\n\nBus 9\n   Farebox tracker flag");
  assert.equal(quickFilterShareText("IBS & Ventra",[{id:"legacy",n:"10",pendingRepair:"Ventra reader blank",defects:[]}],"ibs-ventra"),"IBS & Ventra — 1 bus\n\nBus 10\n   Ventra reader blank");
  const fifteen=Array.from({length:15},(_,index)=>({id:"fare-"+index,n:String(17500+index),defects:[{id:"farebox-"+index,category:"Tech Services",issue:"Farebox",details:"Reader offline",state:"open"},{id:"ac-"+index,category:"A/C and HVAC",issue:"No cooling",details:"",state:"open"}]}));
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
     light-surface one it had as a card - that was invisible against navy. */
  assert.match(css,/\.header-advanced-toggle\{[^}]*border:1px solid #ffffff5c;[^}]*background:#ffffff1f/);
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
  assert.match(page,/quickFilterShareText\(quickFilterShareLabel,quickFilterBuses,quickFilter\)/);
  assert.match(page,/navigator\.share\(\{title:quickFilterShareLabel\+" bus list",text\}\)/);
  assert.doesNotMatch(page,/navigator\.share\(\{[^}]*url:/);
  assert.match(page,/aria-label="Copy filtered bus list"/);
  assert.match(page,/aria-label="Share filtered bus list as text"/);
  assert.match(page,/quickFilterDefects\(bus,quickFilter\)/);
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
  assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("No cooling"));
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

 // It counts what the SEARCH is hiding, not what the state filter is hiding —
 // different questions, and the banner only answers the first.
 assert.match(page, /const unsearched=records\.filter\(matchesStateFilter\)/);
 assert.match(page, /const visible=unsearched\.filter\(matchesSearch\)/);
 assert.match(page, /const hiddenBySearch=search\.trim\(\)\?groupDefectLogRecords\(unsearched\)\.length-visibleGroups\.length:0/);
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
 const ac=REPAIR_OPTIONS["A/C and HVAC"];
 assert.equal(ac.indexOf("Operator A/C blower"),ac.indexOf("Blower motor")+1);

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
 assert.deepEqual(cooling.slice(cooling.indexOf("Coolant leak"),cooling.indexOf("Coolant leak")+4),
  ["Coolant leak","Surge tank - engine side low","Surge tank - heating side low","Surge tank - both sides low"]);

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
 assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("A/C belt"));
 assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("A/C compressor pulley misaligned"));
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
 assert.ok(notePage.includes('<ComboField label="DEFECT"'));
 assert.ok(notePage.indexOf('<ComboField label="DEFECT"')<notePage.indexOf("defect-note"));
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
 // offered under the finding field, scoped to the symptom on the form right now
 assert.match(page,/recallFindings\(findingsMemory,value\.defect\.category,value\.quickIssue\|\|value\.defect\.issue\)/);
 assert.match(page,/learned-findings/);
 // and forgettable from where they are shown
 assert.match(page,/forgetLearnedFinding\(entry\)/);

 // Fixed Repairs learns too. A fault is often only named properly once the bus
 // is apart, and that is the page open at the time; a finding typed there
 // teaching nothing would be a gap nobody would ever notice.
 const fixed=await readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8");
 assert.match(fixed,/if\(normalizeFinding\(draft\.finding\)\)setFindingsMemory/);
 assert.match(fixed,/recallFindings\(findingsMemory,draft\.category,draft\.issue\)/);
 assert.match(fixed,/learned-findings/);

 // Both pages style the chips, because each ships its own stylesheet and an
 // unstyled chip row on one of them is how globals.css leaks in.
 for(const [name,file] of [["defect-log","../app/defect-log/defect-log.css"],["fixed-repairs","../app/fixed-repairs/fixed-repairs.css"]]){
  const css=await readFile(new URL(file,import.meta.url),"utf8");
  assert.match(css,/\.learned-finding\{/,name+" styles the chip");
  assert.match(css,/\.learned-findings>div\{[^}]*flex-wrap:wrap/,name+" wraps them rather than running off a phone");
 }
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
 assert.equal(QUICK_FILTERS.at(-2).key,"down-sheet-recommended","second-to-last: it answers a different question from the rest");

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

 // larger reading type than the feed it replaces, and a real touch target
 assert.match(css,/\.log-focus-defect\{margin:0 0 11px;font-size:21px/);
 assert.match(css,/\.log-focus-bus strong\{font-size:34px/);
 assert.match(css,/\.log-focus-record-foot button\{min-height:44px/);
 assert.match(css,/\.log-focus-record-actions\{display:flex;align-items:center;gap:8px\}/);
 assert.match(css,/\.log-focus-record-foot button\{[^}]*padding:0 14px[^}]*font-size:11px/);
 assert.match(css,/\.fix-log-focus-defect\{background:#08733f\}/);
 assert.match(css,/\.log-card-group>\.log-focus-button\{position:absolute;top:6px;right:6px/);
 // the card header reserves the corner so repair text cannot run under the control
 assert.match(css,/\.log-card-group>\.log-group-header\{padding-right:64px\}/);

 // phone rules stay in the established phone breakpoint
 const conditions=[];
 for(let index=css.indexOf("@media(");index>=0;index=css.indexOf("@media(",index+1)){
  const conditionEnd=css.indexOf(")",index),open=css.indexOf("{",conditionEnd);
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
 if(body.includes(".log-focus"))conditions.push(css.slice(index+7,conditionEnd));
 }
 /* EVERY block carrying a .log-focus rule uses the phone breakpoint — which is
    what the line above says, and what matters. Comparing the list itself also
    asserted there was exactly ONE such block, so a second one at the same
    correct breakpoint failed this. Deduplicated, it tests the rule; the length
    check below keeps it from passing vacuously if the rules ever move out. */
 assert.ok(conditions.length>0,"the focus view must still have phone rules");
 assert.deepEqual([...new Set(conditions)],["max-width:760px"]);
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
 const [log,fixed,catalog,logCss,fixedCss]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/defects/repair-catalog.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);

 for(const [name,page] of [["defect log",log],["fixed repairs",fixed]]){
  assert.match(page,/PARTS USED/,name);
  assert.match(page,/PART NAME \(OPTIONAL\)/,name);
  assert.match(page,/REMEMBER FOR EVERY /,name);
  assert.match(page,/Leave blank if the number is unknown/,name);
  assert.match(page,/REMEMBERED/,name);
  assert.match(page,/>FORGET<\/button>/,name);
  // learning happens on save and is never a precondition of saving
  assert.match(page,/learnPart\(current,\{category:/,name);
  // a legacy record with a part number still shows it
  assert.match(page,/partsUsed\?\?Boolean\(String\(/,name);
 }

 // the record keeps its own snapshot, separate from the learned mapping
 assert.match(catalog,/partsUsed\?:boolean;/);
 assert.match(catalog,/partName\?:string;/);
 assert.match(fixed,/partsUsed:draft\.partsUsed,partName:draft\.partName\.trim\(\)/);
 // suggestions never overwrite something already typed
 assert.match(log,/hasNumber\|\|!suggestion\?current\.defect\.partNumber\|\|"":suggestion\.partNumber/);
 assert.match(fixed,/hasNumber\|\|!suggestion\?current\.partNumber:suggestion\.partNumber/);

 for(const [name,css] of [["defect log",logCss],["fixed repairs",fixedCss]]){
  assert.match(css,/\.parts-used-block\{/,name);
  assert.match(css,/\.parts-remembered button\{min-height:36px/,name);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.parts-remembered button\{min-height:44px;width:100%\}/,name);
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
 const entry="IntelligAIRE III control panel - screen blank / black";

 // The Thermo King panel on the bulkhead is called IntelligAIRE III, and the
 // screen going black is a fault in its own right. Until now the only place for
 // it was "Controls / electrical", which covers the whole A/C control side and
 // says nothing about which control — so a recurring, recognisable failure
 // arrived on the board indistinguishable from a wiring fault. Naming the panel
 // is the point: it is what somebody standing at the bus reads off the label.
 assert.ok(ac.includes(entry));
 // Sits with the other control entry rather than at the end of the list, since
 // that is where somebody looking for a control fault will already be.
 assert.equal(ac.indexOf(entry),ac.indexOf("Controls / electrical")+1);

 // A/C and HVAC is an ungrouped category, so the entry belongs in REPAIR_OPTIONS
 // only. Adding a REPAIR_OPTION_GROUPS entry would turn the whole category into
 // a two-step picker for every other A/C defect.
 assert.equal(REPAIR_OPTION_GROUPS["A/C and HVAC"],undefined);

 // A blank display is not a road failure: the bus still runs.
 assert.equal(defaultDefectOperability("A/C and HVAC",entry),"service");

 // Survives a round trip under its stored name.
 const [defect]=normalizeDefects([{id:"d",category:"A/C and HVAC",issue:entry,details:"",state:"open",operability:"service"}]);
 assert.equal(defect.issue,entry);

 // The vague entry it was hiding inside stays, because the A/C control side has
 // faults that are not this panel.
 assert.ok(ac.includes("Controls / electrical"));
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
 const footer=logPage.match(/<footer className="log-editor-actions">[\s\S]*?<\/footer>/)[0];
 assert.ok(footer.includes("SAVE FIXED W/ PART"));
 assert.ok(footer.lastIndexOf("CLOSE")>footer.indexOf("SAVE FIXED W/ PART"),"CLOSE comes last");

 // THE PROMPT. Both ways forward save the repair; only CANCEL does not.
 assert.ok(logPage.includes("function PartNumberPrompt("));
 assert.ok(logPage.includes("SAVE WITH THIS PART"));
 assert.ok(logPage.includes("ENTER LATER"));
 // ENTER LATER records that a part went on with no number, which is a different
 // fact from no part at all.
 assert.match(logPage,/confirm\(""\)/);
 assert.match(logPage,/validateAndSave\(true,\{partsUsed:true,partNumber:number\}\)/);

 // The patch is passed INTO the save rather than set on state first. Setting it
 // and then saving would write the defect as it was a render earlier, dropping
 // the number on the very save that asked for it.
 assert.match(logPage,/const validateAndSave=\(complete:boolean,patch:Partial<StructuredDefect>=\{\}\)=>\{const defect=\{\.\.\.value\.defect,\.\.\.patch\}/);

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
 assert.ok(fixedPage.includes("partNumberMissing(record.defect)&&"));
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
 for(const issue of ["Condenser fan INOP - 1 fan","Condenser fans INOP - both fans","Evaporator fan / motor INOP - 1","Evaporator fans / motors INOP - both","Semi cold air","Bad connection / wiring"]){
  assert.ok(options.includes(issue),issue+" must be pickable in A/C and HVAC");
 }

 /* The floor says Freon. Records logged under the old wording read as the new
    one — nothing stored is rewritten — and the old wording is gone from the
    picker so it cannot be chosen again. */
 assert.ok(options.includes("Refrigerant / Freon leak"));
 assert.ok(!options.includes("Refrigerant leak"),"the old wording must not still be pickable");
 assert.deepEqual(migrateRepairIdentity("A/C and HVAC","Refrigerant leak"),{category:"A/C and HVAC",issue:"Refrigerant / Freon leak"});

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
 assert.match(body,/recordReportAttempt\(current,now,settings\.defaultInitials\)/);
 /* A press the debounce refused writes nothing and takes no undo snapshot — an
    UNDO offering to reverse a change nobody made is worse than the fumbled tap. */
 assert.match(body,/if\(!counted\)return;/);
 assert.ok(body.indexOf("if(!counted)return;")<body.indexOf("setUndoSnapshot"));

 /* THE BUTTON IS DELIBERATE, NOT AUTOMATIC. Counting the moment the ALREADY
    LOGGED banner appears would count a foreman scrolling the picker and every
    re-render. One press, one return. */
 assert.match(page,/className="count-return" onClick=\{\(\)=>countReturn\(value\.busId,recentDuplicate\)\}/);
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
 assert.match(page,/quickFilterShareText\(quickFilterShareLabel,quickFilterBuses,quickFilter\)/);
 assert.match(page,/quickFilterShareHtml\(quickFilterShareLabel,quickFilterBuses,quickFilter,stamp\)/);
 assert.equal(/quickFilterShareText\(\w+,quickFilterAllBuses/.test(page),false);
 /* And the heading says which window, so somebody who cannot see the screen it
    came off is not reading six buses as the total. */
 assert.match(page,/quickFilterShareLabel=quickFilterLabel\+\(quickFilterWindowed&&timeWindowLabel\(quickFilterWindow\)/);
 /* Only the two lists that accumulate carry it. Curtis: "only as it relates to
    these two fields." */
 assert.match(page,/quickFilterWindowed=quickFilter==="deferred"\|\|quickFilter==="down-sheet-recommended"/);
 /* Reset on open, and never written to storage — a window restored from
    yesterday would open the drawer already hiding buses. */
 assert.equal(page.split('setQuickFilterWindow("all")').length-1,2,"both entry points reset it");
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
 /* LIGHT KEEPS ALL SEVEN. They are light-theme colours picked by hand for this
    app on white — LIVE REPAIR FEED's #163c70 is a deeper navy than the accent
    on purpose. Deferring on light too swapped it for the accent and dropped it
    from 10.77:1 to 5.77:1: legible, and a change nobody asked for on the theme
    almost everybody uses. */
 assert.equal(Object.keys(displayStyleVars(untouched,"light")).filter(name=>name.endsWith("-color")).length,7);
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
