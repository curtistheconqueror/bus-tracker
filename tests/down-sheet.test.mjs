/* the Down Sheet: the sheet, its scans, its boards and the swap ledger. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { DOWN_SHEET_AGING_DAYS, DOWN_SHEET_FILTERS, DOWN_SHEET_GROUPS, MINIMUM_DIAGNOSTIC_HOURS, REPAIR_OPTIONS, aggregateRepairItemEstimates, applyDownEntryToFleet, blankRepairItem, clearDownSheetState, defectSummary, downSheetBadgeBusIds, downSheetBadgeViewBusIds, downSheetBadgeViewCounts, downSheetCountLabel, downSheetEntryAgeDays, downSheetFilterCounts, downSheetFilterEntries, downSheetFilterFromValue, downSheetFilterMatch, downSheetGroup, downSheetGroupLabel, downSheetGroupRank, downSheetMembershipMatches, downSheetShareContext, downSheetShareFilename, downSheetShareHtml, downSheetShareLines, downSheetShareText, downSheetWorkGroup, exportFleetMapPayload, formatRepairTime, groupDownSheetEntries, isQuarantineEntry, isReadyRoadLocation, matchesDownSheetSearch, mergeFleetMap, mergeReviewedRows, normalizeDefects, normalizeDiagnosticHours, normalizeRepairItems, normalizeRepairTimeEstimate, orderDownSheetEntries, prepareFleetForScannedReplacement, readDownSheetClearSnapshot, recommendedRepairMinutes, reconcileDownSheetMembership, repairItemsProgress, repairItemsTotal, repairTimeTotal, restoreDownSheetState, reviewScannedRows, scannedSheetRemovals, selectedDownSheetBusIds, syncTrackerDownSheetSelection } from "./helpers/modules.mjs";
import { render } from "./helpers/setup.mjs";

test("DS badge marks every active Down Sheet bus regardless of location", async () => {
  const fleet = [
    { id: "road", l: "road-4" },
    { id: "garage", l: "garage-10" },
    { id: "shop", l: "bay-12" },
    { id: "cng", l: "west-2" },
    { id: "clear", l: "garage-11" },
  ];
  assert.deepEqual(downSheetBadgeBusIds(fleet, ["road", "garage", "shop", "cng"]), ["road", "garage", "shop", "cng"]);
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /downSheetReady&&<span className="downsheet-ready-badge"/);
  assert.match(page, /ON DOWN SHEET/);
  assert.doesNotMatch(page, /ON DOWN SHEET · READY LOCATION/);
  assert.match(page, /showDownSheetBadges\?downSheetBadgeViewBusIds/);
  assert.match(page, /<DownSheetBadgeMenu[\s\S]*?<PageMenu pages=\{otherPages\(/);
  /* The badge's own settings render on the shared Settings page now, from the
     map's panel module; the map still draws what they say. */
  const panel = await readFile(new URL("../app/settings/_components/map-settings-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /<h3>DS BADGE<\/h3>/);
  assert.match(panel, /<b>SHOW BADGE<\/b>/);
  assert.match(panel, /visuals\.downSheetBadgeText/);
  assert.match(css, /\.downsheet-ready-badge\{position:absolute;top:-5px;left:-5px/);
  assert.match(css, /color:var\(--downsheet-badge-text\)/);
  assert.match(page, /LAST MOVED FROM/);
  assert.match(page, /movedFromLabel\(bus\.lastMovedFrom\)/);
  assert.match(page, /Not recorded yet/);
});

test("DS badge view filters display without changing Down Sheet membership", async () => {
  const fleet = [
    { id: "road", l: "road-4" },
    { id: "garage", l: "garage-71" },
    { id: "shop", l: "bay-9" },
    { id: "cng", l: "west-2" },
    { id: "clear", l: "garage-11" },
  ];
  const active = ["road", "garage", "shop", "cng"];
  assert.equal(isReadyRoadLocation("garage-71"), true);
  assert.equal(isReadyRoadLocation("road-4"), true);
  assert.equal(isReadyRoadLocation("bay-9"), false);
  assert.deepEqual(downSheetBadgeViewBusIds(fleet, active, "all"), active);
  assert.deepEqual(downSheetBadgeViewBusIds(fleet, active, "ready-road"), ["road", "garage"]);
  assert.deepEqual(downSheetBadgeViewBusIds(fleet, active, "off-road"), ["shop", "cng"]);
  assert.deepEqual(downSheetBadgeViewCounts(fleet, active), {all:4,"ready-road":2,"off-road":2});
  const menu = await readFile(new URL("../app/_components/down-sheet-badge-menu.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(menu, /DS BADGES/);
  assert.match(menu, /Badge view never changes Down Sheet membership/);
  assert.match(css, /\.ds-badge-view-popover\{position:fixed/);
});

test("Down Sheet supports search, bus ordering, work groups, and explicit note saving", async () => {
  const entries = [
    {busNumber:"17520",category:"Inspection",repair:"A-15",customReason:"",assignmentType:"Mechanic",assignedTo:""},
    {busNumber:"15505",category:"Engine",repair:"Misfire",customReason:"",assignmentType:"Mechanic",assignedTo:""},
    {busNumber:"20501",category:"Body Shop",repair:"Panel repair",customReason:"",assignmentType:"Mechanic",assignedTo:""},
    {busNumber:"17505",category:"Transmission",repair:"Shift fault",customReason:"",assignmentType:"Vendor",assignedTo:"Allison"},
  ];
  assert.deepEqual(orderDownSheetEntries(entries,"number-asc").map(entry=>entry.busNumber),["15505","17505","17520","20501"]);
  assert.deepEqual(orderDownSheetEntries(entries,"number-desc").map(entry=>entry.busNumber),["20501","17520","17505","15505"]);
  assert.deepEqual(entries.filter(entry=>matchesDownSheetSearch(entry,"05")).map(entry=>entry.busNumber),["15505","17505"]);
  assert.equal(matchesDownSheetSearch(entries[3],"Allison"),true);
  const grouped=orderDownSheetEntries(entries,"category");
  assert.equal(downSheetWorkGroup(grouped[0]).label,"GENERAL REPAIRS");
  assert.equal(downSheetWorkGroup(grouped.at(-1)).label,"INSPECTIONS / SCHEDULED MAINTENANCE");
  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  assert.match(page, /aria-label="Search Down Sheet"/);
  /* The ORDER control beside the search box is gone. The sheet is numerical
     inside each band either way, nobody standing at a bus was going to pick
     WORK CATEGORIES, and what people actually want to change — which band they
     read first — is a setting rather than a control on the page. */
  assert.doesNotMatch(page, /<option value="number-asc">/, "the ORDER dropdown is gone");
  assert.doesNotMatch(page, /<option value="category">/, "and the sort it was the only way to reach");
  assert.doesNotMatch(page, /className="down-order"/);
  assert.doesNotMatch(page, /work-group-row/, "the subheading rows that sort drew go with it");
  assert.match(page, /SAVE NOTE/);
  assert.match(page, /Unsaved changes/);
  assert.match(css, /\.down-view-controls\{/);
  assert.match(css, /\.work-group-row/);
});

test("Down Sheet divides itself into off property, scheduled, unscheduled and inspection bands by default", async () => {
  assert.deepEqual(DOWN_SHEET_GROUPS.map(group=>group.key),["off-property","scheduled","unscheduled","inspection"]);
  assert.equal(downSheetGroupLabel("inspection"),"INSPECTIONS & SCHEDULED MAINTENANCE");
  assert.equal(downSheetGroupRank("off-property"),0);
  assert.equal(downSheetGroupRank("inspection"),3);

  // Precedence is off property, then what the work is, then who has it.
  const atVendor={busId:"a",busNumber:"17520",category:"Inspection",repair:"A-15",assignmentType:"Mechanic",assignedTo:"RJ",section:"Inspection"};
  assert.equal(downSheetGroup(atVendor,"offsite-3"),"off-property","a bus parked off property is off property whatever the work is");
  assert.equal(downSheetGroup(atVendor,"garage-4"),"inspection","in the yard the same bus is an inspection");
  assert.equal(downSheetGroup({busNumber:"15505",category:"Transmission",repair:"Shift fault",assignmentType:"Vendor",assignedTo:"Allison"}),"off-property");
  assert.equal(downSheetGroup({busNumber:"15506",category:"Engine",repair:"Misfire",assignmentType:"Mechanic",assignedTo:"",section:"Vendor Repair"}),"off-property");
  assert.equal(downSheetGroup({busNumber:"15507",category:"Engine",repair:"Misfire",assignmentType:"Mechanic",assignedTo:"TB",section:"Pending"}),"scheduled");
  // The pencilled-in overflow rows: a real repair with no name beside it.
  assert.equal(downSheetGroup({busNumber:"15508",category:"Brakes",repair:"Air leak",assignmentType:"Mechanic",assignedTo:"",section:"Pending"}),"unscheduled");
  assert.equal(downSheetGroup({busNumber:"15509",category:"Miscellaneous",repair:"Spark plugs",assignmentType:"Mechanic",assignedTo:""}),"inspection");
  assert.equal(downSheetGroup({busNumber:"15510",category:"Miscellaneous",repair:"Valve adjustment",assignmentType:"Mechanic",assignedTo:""}),"inspection");
  // An inspection with nobody on it is still an inspection, not an unscheduled breakdown.
  assert.equal(downSheetGroup({busNumber:"15511",category:"Inspection",repair:"B-12",assignmentType:"Mechanic",assignedTo:""}),"inspection");

  const entries=[
    {id:"1",busId:"a",busNumber:"18510",category:"Engine",repair:"Misfire",assignmentType:"Mechanic",assignedTo:"",section:"Pending"},
    {id:"2",busId:"b",busNumber:"18505",category:"Inspection",repair:"A-15",assignmentType:"Mechanic",assignedTo:"RJ",section:"Inspection"},
    {id:"3",busId:"c",busNumber:"18520",category:"Transmission",repair:"Rebuild",assignmentType:"Vendor",assignedTo:"Allison",section:"Vendor Repair"},
    {id:"4",busId:"d",busNumber:"18515",category:"Brakes",repair:"Air leak",assignmentType:"Mechanic",assignedTo:"TB",section:"Pending"},
    {id:"5",busId:"e",busNumber:"18501",category:"Body Shop",repair:"Panel repair",assignmentType:"Mechanic",assignedTo:"",section:"Pending"},
  ];
  const groups=groupDownSheetEntries(entries,"number-asc",{a:"garage-1",b:"garage-2",c:"offsite-0",d:"bay-3",e:"body-0"});
  assert.deepEqual(groups.map(group=>group.key),["off-property","scheduled","unscheduled","inspection"]);
  assert.deepEqual(groups.map(group=>group.entries.map(entry=>entry.busNumber)),[["18520"],["18515"],["18501","18510"],["18505"]]);
  // Every visible row lands in exactly one band: the counts add up to the sheet.
  assert.equal(groups.reduce((total,group)=>total+group.entries.length,0),entries.length);
  // ORDER re-sorts inside a band; it never dissolves the bands or moves a row between them.
  const reordered=groupDownSheetEntries(entries,"number-desc",{a:"garage-1",b:"garage-2",c:"offsite-0",d:"bay-3",e:"body-0"});
  assert.deepEqual(reordered.map(group=>group.key),groups.map(group=>group.key));
  assert.deepEqual(reordered.map(group=>group.entries.length),groups.map(group=>group.entries.length));
  assert.deepEqual(reordered[2].entries.map(entry=>entry.busNumber),["18510","18501"]);

  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  assert.match(page, /down-group-counts/);
  assert.match(page, /TOTAL ON SHEET/);
  assert.match(page, /down-group-row group-/);
  // The band rules ask where the bus is, so the page has to hand them the map's
  // own location by bus id. Grouping on the entry alone would silently drop the
  // off-property rule to whatever the paper sheet happened to say.
  assert.match(page, /fleet\.map\(bus=>\[bus\.id,bus\.l\|\|""\]\)/);
  assert.match(page, /groupDownSheetEntries\([\s\S]{0,400}?,"number-asc",locations\)/, "bus number, always");
  // The dividers are not conditional on an ordering the way the work-category ones are.
  assert.doesNotMatch(page, /order==="category"&&group\.label/);
  assert.match(css, /\.down-table \.down-group-row td\{/);
  assert.match(css, /\.down-group-counts\{/);
  // The band colours must be defined at the top level, not only inside a phone breakpoint.
  const topLevel=css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,"");
  for(const key of DOWN_SHEET_GROUPS.map(group=>group.key)){
    assert.match(topLevel, new RegExp("\\.down-group-row\\.group-"+key), key+" divider has no colour outside a media query");
  }
});

test("Every row of a real Pace South down sheet lands in the right band", () => {
  /* Transcribed from the Vehicle Down Sheet photographed 09/5/2026 7:35 AM,
     foreman DICKSON, both pages. This is the fixture that matters: the rules
     were written against an imagined sheet and three of them were wrong on a
     real one — the service codes A21 and A3 were filed as breakdowns because
     the pattern listed the intervals it had been shown, the PM'S row carrying
     six buses was filed as a breakdown, and TRANS HUB DIFF with it. */
  const row=(busNumber,customReason,assignedTo="")=>({busNumber,category:"Miscellaneous",repair:"",customReason,assignmentType:"Mechanic",assignedTo,section:"Pending"});
  const sheet=[
    ["01",row("17510","QUARANTINE DO NOT MOVE (PER SAFETY)"),"unscheduled"],
    ["03",row("17529","Sway Bar Bracket Weld@BUS AND TRUCK","Bus & Truck"),"off-property"],
    ["04",row("17547","Off Property Sway Bar Bracket Mount Weld Broken","Bus & Truck"),"off-property"],
    ["05",row("17504","R/C Towed in Trans Not Engaging Incorrect Gear Ratio Needs Trans"),"unscheduled"],
    ["06",row("17508","Rear Brakes / Air Leak Won't Build Air Pressure// High oil usage"),"unscheduled"],
    // PM DEFECTS is the faults found while doing a PM. The bus is down.
    ["07",row("17512","PM Defects - Trans Filter Treads Stripped Broken Sway Bar Weld (GILBERT)","MAUI/GILBERT"),"scheduled"],
    ["09",row("17541","Check Eng Light Trouble Mod 1 Fuel","Armon"),"scheduled"],
    ["11",row("17562","Dragging on S/S / High Trans Temp / Stuck in 3rd Gear"),"unscheduled"],
    ["12",row("17567","Check Eng Light / Amerex / No A/C// Needs MDT and mount"),"unscheduled"],
    ["14",row("17545","PM Defect Won't Pass Brake Test / Rear Brakes / Flat Tire /High oil usage"),"unscheduled"],
    ["17",row("15517","Check /Stop Eng Light Check Multiplex Light - Derate"),"unscheduled"],
    ["20",row("18507","R/C CRANK NO START (TOW)/R/R/O TIRE DAMAGED"),"unscheduled"],
    ["24",row("17540","High oil usage, possible air compressor mounting gasket... 18:08"),"unscheduled"],
    ["25",row("15508","CYL #5 MISFIRE/MDT SCREEN"),"unscheduled"],
    ["31",row("17560","IDOT-ABS INOP/ LAMP NOT COMING ON AT ALL/front door & ramp - inop","ARMON"),"scheduled"],
    ["34",row("17569","ROARING and excessive play in differential"),"unscheduled"],
    ["36",row("17535","ACCIDENT BUS - TOWED - 08/04/26"),"unscheduled"],
    // Rows 38-48: the inspection block the paper sheet already groups at the bottom.
    // A B12 with a steering complaint written beside it. The B12 does not stop
    // the shake from being a fault, so the bus counts as down.
    ["38",row("17550","B12 / STEERING SHAKES AT 35 MPH"),"unscheduled"],
    ["39",row("15510","A15"),"inspection"],
    ["41",row("15512","B18"),"inspection"],
    ["43",row("18510","A21"),"inspection"],
    ["44",row("17526","C24"),"inspection"],
    ["45",row("17524","A3"),"inspection"],
    ["48",row("17558","TRANS HUB DIFF"),"inspection"],
    ["49a",row("17514","PM'S"),"inspection"],
    ["49f",row("17516","PM'S"),"inspection"],
    // The handwritten margin overflow, which is what unscheduled means here:
    // a real repair with no name attached, squeezed in when the lines ran out.
    ["m1",row("15505","No AC"),"unscheduled"],
    ["m2",row("17554","Batt 1547/mirror"),"unscheduled"],
    ["m3",row("17571","c/s Mirror"),"unscheduled"],
  ];
  for(const [line,entry,expected] of sheet){
    assert.equal(downSheetGroup(entry),expected,`line ${line} (bus ${entry.busNumber}) — ${entry.customReason}`);
  }
  // A vendor named in a NOTE is not a bus that left the property.
  assert.equal(downSheetGroup(row("17999","Waiting on a call back from Cummins about the injector")),"unscheduled");
  // The spacing rule: a service code is written tight or hyphenated, never
  // "a 12", or every battery note becomes an inspection.
  assert.equal(downSheetGroup(row("17998","Needs a 12 volt battery")),"unscheduled");
  assert.equal(downSheetGroup(row("17997","A-15")),"inspection");
  // Off property is decided before what the work is, so an inspection at a
  // vendor is still off property.
  assert.equal(downSheetGroup(row("17996","A15","Bus & Truck")),"off-property");
  assert.equal(downSheetGroup(row("17995","A15","RJ"),"offsite-2"),"off-property");

  /* Bus 17514 is on this sheet twice: once for MISFIRES with JEVELL on it, and
     again on the PM'S line. A bus gets one row, so those fold together — and
     the fold must not file a live misfire under scheduled maintenance, which is
     how a real breakdown would drop out of the down count. */
  assert.equal(downSheetGroup(row("17514","MISFIRES / PM'S","JEVELL")),"scheduled");
  assert.equal(downSheetGroup(row("17514","PM'S / MISFIRES","JEVELL")),"scheduled","which row was photographed first must not decide it");
  assert.equal(downSheetGroup(row("17514","MISFIRES","JEVELL")),"scheduled");
  assert.equal(downSheetGroup(row("17514","PM'S")),"inspection");
  // Scheduled work reached through repairItems folds the same way.
  assert.equal(downSheetGroup({busNumber:"17514",assignmentType:"Mechanic",assignedTo:"JEVELL",section:"Inspection",repairItems:[{category:"Inspection",repair:"PM'S",details:""},{category:"Engine",repair:"Misfire",details:"cylinder 5"}]}),"scheduled","a stated Inspection section must not outrank a fault written on the row");
  // Leftovers that are not complaints: the bus numbers on a PM line, and
  // punctuation left behind by the apostrophe in PM'S.
  assert.equal(downSheetGroup(row("17514","PM'S 17514 17556 17525 17551")),"inspection");
  // A row with nothing written on it still honours an explicit Inspection section.
  assert.equal(downSheetGroup({busNumber:"17993",repair:"",customReason:"",section:"Inspection",assignmentType:"Mechanic",assignedTo:""}),"inspection");

  /* The app's own stand-ins are not complaints. normalizeEntry stamps
     "Repair required" into the repair field and into every repair item of an
     entry that arrives without one, so this is the exact shape an inspection
     row has after a round trip through storage. Reading that phrase as a
     written fault put every inspection back in the down count: the built app
     showed INSPECTIONS 0 against data that scored 16 in isolation. */
  assert.equal(downSheetGroup({busNumber:"17992",category:"Miscellaneous",repair:"Repair required",customReason:"A15",assignmentType:"Mechanic",assignedTo:"",section:"Pending",repairItems:[{category:"Miscellaneous",repair:"Repair required",details:"A15"}]}),"inspection");
  assert.equal(downSheetGroup({busNumber:"17991",category:"Miscellaneous",repair:"Repair required",customReason:"PM'S",assignmentType:"Mechanic",assignedTo:"",section:"Pending",repairItems:[{category:"Miscellaneous",repair:"Repair required",details:"PM'S"}]}),"inspection");
  // But a real fault beside the placeholder is still a real fault.
  assert.equal(downSheetGroup({busNumber:"17990",category:"Miscellaneous",repair:"Repair required",customReason:"A15 / MISFIRES",assignmentType:"Mechanic",assignedTo:"",section:"Pending"}),"unscheduled");
});

test("The Down Sheet photo import reads the four section headings the sheet is organized into", async () => {
  const route = await readFile(new URL("../app/api/down-sheet-scan/route.ts", import.meta.url), "utf8");
  assert.match(route, /A heading is never a bus row/);
  for(const heading of ["OFF PROPERTY","SCHEDULED","UNSCHEDULED","INSPECTIONS & SCHEDULED MAINTENANCE"]){
    assert.ok(route.includes(heading), "the scan prompt never names the "+heading+" band");
  }
  assert.match(route, /pencilled in the margins/);
  assert.match(route, /EVERY bus number written anywhere on the sheet MUST produce a row/);

  // The reviewer is told which band each scanned row lands in BEFORE importing,
  // read from the same two functions the sheet uses so the two cannot drift.
  const scanner = await readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx", import.meta.url), "utf8");
  assert.match(scanner, /downSheetGroup,downSheetGroupLabel/);
  assert.match(scanner, />GOES TO </);
  const scanCss = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  assert.match(scanCss.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,""), /\.scan-row \.scan-band\{grid-column:1\/-1/);

  // Each band's heading, read off a photographed sheet, has to come back as the
  // section that puts the bus back in that same band.
  const rows=[
    {heading:"OFF PROPERTY",section:"Vendor Repair",group:"off-property",assignedTo:"Bus & Truck",repair:"Sway bar bracket weld"},
    {heading:"SCHEDULED",section:"Scheduled Repair",group:"scheduled",assignedTo:"RJ",repair:"Brakes — Air leak"},
    {heading:"UNSCHEDULED",section:"Pending",group:"unscheduled",assignedTo:"",repair:"Engine — Misfire"},
    {heading:"INSPECTIONS & SCHEDULED MAINTENANCE",section:"Inspection",group:"inspection",assignedTo:"",repair:"A-15"},
    {heading:"INSPECTIONS",section:"Inspection",group:"inspection",assignedTo:"",repair:"B18"},
    {heading:"Spark Plugs",section:"Inspection",group:"inspection",assignedTo:"",repair:"Spark plugs"},
    {heading:"Valve Adjustment",section:"Inspection",group:"inspection",assignedTo:"",repair:"Valve adjustment"},
    {heading:"PM'S",section:"Inspection",group:"inspection",assignedTo:"",repair:"PM'S"},
  ];
  for(const row of rows){
    const [record]=mergeReviewedRows([{key:"k",selected:true,fleetMatch:"matched",busId:"a",busNumber:"17505",repeatedCount:1,pageNumber:1,lineNumber:"1",reason:"",assignedTo:row.assignedTo,category:"Miscellaneous",repair:row.repair,section:row.heading,shift:"1st",operationalStatus:"out",confidence:1,reviewNote:""}]);
    assert.equal(record.section,row.section,row.heading+" was read as "+record.section);
    const assignmentType=record.section==="Vendor Repair"?"Vendor":"Mechanic";
    assert.equal(downSheetGroup({busNumber:record.busNumber,category:record.category,repair:record.repair,assignmentType,assignedTo:record.assignedTo,section:record.section}),row.group,row.heading+" did not come back to its own band");
  }

  /* The same rule on the scan path: two photographed rows for one bus merge
     into the one entry a bus gets, and a fault merged with a PM is still a
     fault. The scanner joins the reasons, so both facts reach the sheet. */
  const [folded]=mergeReviewedRows([
    {key:"a",selected:true,fleetMatch:"matched",busId:"a",busNumber:"17514",repeatedCount:2,pageNumber:1,lineNumber:"29",reason:"MISFIRES",assignedTo:"JEVELL",category:"Engine",repair:"Engine — Misfire",section:"UNSCHEDULED",shift:"1st",operationalStatus:"out",confidence:1,reviewNote:""},
    {key:"b",selected:true,fleetMatch:"matched",busId:"a",busNumber:"17514",repeatedCount:2,pageNumber:2,lineNumber:"49",reason:"PM'S",assignedTo:"",category:"Inspection",repair:"PM'S",section:"INSPECTIONS & SCHEDULED MAINTENANCE",shift:"1st",operationalStatus:"out",confidence:1,reviewNote:""},
  ]);
  assert.equal(folded.reason,"MISFIRES / PM'S","both facts have to survive the fold");
  assert.equal(folded.assignedTo,"JEVELL");
  assert.equal(downSheetGroup({busNumber:folded.busNumber,repair:folded.repair,customReason:folded.reason,assignmentType:"Mechanic",assignedTo:folded.assignedTo,section:folded.section}),"scheduled","a bus with a live misfire must not be counted as scheduled maintenance");
});

test("renders the interactive down sheet with All as the default shift view", async () => {
  const response = await render("/down-sheet");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Interactive Down Sheet/);
  /* The shift filter moved into ADVANCED ACTIONS, which opens closed, so it is
     not in the first render at all - and that is the point of the change: what
     the page opens on is ADD DOWN BUS and SEARCH, not a block of controls. */
  assert.match(html, /class="down-advanced-toggle"[^>]*aria-expanded="false"/);
  assert.doesNotMatch(html, /aria-pressed="true">ALL/);
  for(const shift of [/>1ST</,/>2ND</,/>3RD</,/SHOW COMPLETED/,/SCAN SHEET/,/CLEAR DOWNSHEET/])
   assert.doesNotMatch(html, shift, "it lives behind the closed panel now");
  assert.doesNotMatch(html, /ACTIVE DOWN(?! COUNT)/, "the duplicate of TOTAL ON SHEET went with the panel; the footnote's ACTIVE DOWN COUNT is not it");
  assert.match(html, /BUS NUMBER/);
  assert.match(html, /REASON DOWN/);
  assert.match(html, /MECHANIC \/ VENDOR/);
  /* SHEET STATS is gone. It was a second status report behind its own bar saying
     most of what the tiles below already said, in a different shape; the ones
     worth keeping moved down into those tiles and the panel with them.

     ACTIVE DOWN did not move. It counted the whole active sheet while TOTAL ON
     SHEET counts the current view, which is why they printed the same number
     on ALL with no search and read as a duplicate. SHEET CAPACITY still prints
     the whole-sheet count, so no number was actually lost - which is the thing
     to check here, not the panel's absence. */
  assert.doesNotMatch(html, /SHEET STATS/);
  // SHEET CAPACITY is one of the six opt-in tiles now, so it is absent on a
  // fresh device and present only once somebody ticks it in the settings.
  assert.doesNotMatch(html, /SHEET CAPACITY/, "the extra tiles are asked for, not assumed");
  /* The board is collapsed on a fresh device and only DOWN BUSES is drawn, so
     none of these are in the markup — including COMPLETED TODAY, which is one
     of the eight that appear the moment it is expanded. Not dropped: opt-in for
     four of them, one press away for the other. The source below is what holds
     which is which; the HTML here only proves the page opens quiet. */
  for(const label of ["PENDING","ACCIDENT","WAITING PARTS","COMPLETED TODAY","EST. ACTIVE LABOR","TOTAL ON SHEET"])
   assert.doesNotMatch(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")), label+" must not be drawn while the count board is collapsed");
  assert.match(html, /class="down-counts-toggle" aria-expanded="false"/, "the count board opens collapsed");
  assert.match(html, /class="down-counts-lead"><strong>0<\/strong><span>DOWN BUSES<\/span>/, "DOWN BUSES is the one number it keeps while collapsed");
  /* What the page opens on: the button that adds a bus, and the search under
     it. SHOW COMPLETED and CLEAR DOWNSHEET are behind ADVANCED ACTIONS and are
     asserted absent above. */
  assert.match(html, /\+ ADD DOWN BUS/);
  /* ADD DOWN BUS still LEADS the row. SHOW COMPLETED and CLEAR DOWNSHEET went
     behind ADVANCED ACTIONS to clear it and must not creep back; STATUS REPORT
     sits after the primary action rather than in front of it, because adding a
     bus is the job and sending the report is what you do once at the end. */
  assert.match(html, /class="down-controls"><button class="down-primary-action"/,"ADD DOWN BUS still leads its row");
  assert.match(html, /<\/button><button class="down-status-report-action"[^>]*>STATUS REPORT<\/button>/,"the status report sits beside it, not before it");
  assert.match(html, /class="down-view-controls"/,"with SEARCH directly under it");
  assert.match(html, /SETTINGS/);
  // QUICK NOTES is off by default now — a permanent panel between the counts
  // and the sheet, on the page whose problem was how much sits above the rows.
  assert.doesNotMatch(html, /QUICK NOTES/, "quick notes is opt-in, so a fresh device does not draw it");
  const source = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  assert.match(source, /knownActive/);
  assert.match(source, /entriesFromFleet\(nextFleet\)\.filter/);
  assert.match(source, /UNDO CLEAR/);
  assert.match(source, /clearDownSheetState\(entries,fleet\)/);
});

test("tracker down-sheet highlight uses only explicitly selected buses", () => {
  const ids = selectedDownSheetBusIds([
    { id: "bus-a", down: true },
    { id: "bus-b", down: false },
    { id: "20501", down: false },
    { id: "bus-c", down: true },
  ]);
  assert.deepEqual(ids, ["bus-a", "bus-c"]);
  assert.equal(ids.includes("20501"), false);
});

test("active Down Sheet rows reconcile every tracker checkbox exactly", () => {
  const fleet = [
    { id: "bus-a", down: false },
    { id: "bus-b", down: true },
    { id: "bus-c", down: true },
  ];
  const reconciled = reconcileDownSheetMembership(fleet, ["bus-a", "bus-c"]);
  assert.deepEqual(selectedDownSheetBusIds(reconciled), ["bus-a", "bus-c"]);
  assert.equal(downSheetMembershipMatches(reconciled, ["bus-a", "bus-c"]), true);
  assert.equal(downSheetMembershipMatches(reconciled, ["bus-b"]), false);
  assert.equal(reconcileDownSheetMembership(reconciled, ["bus-a", "bus-c"]), reconciled);
});

test("down-sheet button shows a ratio only when tracker and sheet counts differ", () => {
  assert.equal(downSheetCountLabel(30, 30), "30");
  assert.equal(downSheetCountLabel(30, 40), "30 / 40");
});

test("tracker checkbox creates and completes its matching down-sheet row", () => {
  const bus = { id: "bus-17571", n: "17571", s: "out", down: true, pendingRepair: "A/C compressor", shift: "Evening" };
  const added = syncTrackerDownSheetSelection(null, bus, "2026-08-02T12:00:00.000Z", "AI");
  assert.equal(added.entries.length, 1);
  assert.equal(added.entries[0].busId, bus.id);
  assert.equal(added.entries[0].workflow, "Scheduled");
  assert.equal(added.entries[0].shift, "2nd");
  assert.equal(added.entries[0].updatedBy, "AI");
  const removed = syncTrackerDownSheetSelection(JSON.stringify(added), { ...bus, down: false }, "2026-08-02T13:00:00.000Z", "AI");
  assert.equal(removed.entries[0].workflow, "Completed");
  assert.equal(removed.entries[0].completedAt, "2026-08-02T13:00:00.000Z");
  assert.equal(removed.entries[0].updatedBy, "AI");
});

test("clear entire down sheet unchecks the tracker and undo restores both without changing repairs or locations", () => {
  const entries = [
    { id: "repair-a", busId: "a", workflow: "Scheduled", repair: "ABS warning" },
    { id: "repair-b", busId: "b", workflow: "Completed", repair: "Tire" },
  ];
  const defect = { id: "defect-a", category: "Brakes", issue: "ABS warning", details: "", operability: "service", state: "open" };
  const fleet = [
    { id: "a", l: "west-1", down: true, defects: [defect], pendingRepair: "Brakes - ABS warning" },
    { id: "b", l: "garage-1", down: false, defects: [], pendingRepair: "" },
  ];
  const cleared = clearDownSheetState(entries, fleet, "2026-08-16T12:00:00.000Z");
  assert.deepEqual(cleared.entries, []);
  assert.deepEqual(cleared.fleet.map(bus => bus.down), [false, false]);
  assert.equal(cleared.fleet[0].l, "west-1");
  assert.deepEqual(cleared.fleet[0].defects, [defect]);
  assert.equal(cleared.fleet[0].pendingRepair, "Brakes - ABS warning");
  assert.equal(cleared.clearedEntries, 2);
  assert.equal(cleared.uncheckedBuses, 1);
  const parsed = readDownSheetClearSnapshot(JSON.stringify(cleared.snapshot));
  assert.ok(parsed);
  const restored = restoreDownSheetState([], cleared.fleet, parsed);
  assert.deepEqual(restored.entries, entries);
  assert.deepEqual(restored.fleet.map(bus => bus.down), [true, false]);
  assert.equal(restored.fleet[0].l, "west-1");
  assert.deepEqual(restored.fleet[0].defects, [defect]);
  assert.equal(restored.restoredEntries, 2);
  assert.equal(restored.restoredBuses, 1);
});

test("down sheet synchronization changes repairs and status without moving the bus", () => {
  const fleet = [{ id: "bus-1", l: "east-4", s: "service", pendingRepair: "", down: false, mechanic: "" }];
  const updated = applyDownEntryToFleet(fleet, {
    busId: "bus-1",
    category: "Brakes",
    repair: "ABS warning",
    customReason: "Intermittent warning light",
    assignmentType: "Mechanic",
    assignedTo: "JD",
    workflow: "In Progress",
    operationalStatus: "shop",
  });
  assert.equal(updated[0].l, "east-4");
  // The chosen status stands even though the bus is still sitting in a CNG lot.
  // This expectation used to be "out": the parking space overrode the person,
  // so marking a bus back in service did nothing until somebody physically
  // moved it, and the Defect Log went on showing the old status meanwhile.
  // Location still governs MOVEMENT — see moveOrSwapBuses — just not the sheet.
  assert.equal(updated[0].s, "shop");
  assert.equal(updated[0].down, true);
  assert.equal(updated[0].mechanic, "JD");
  assert.match(updated[0].pendingRepair, /Brakes.*ABS warning.*Intermittent warning light/);
  assert.equal(updated[0].defects.length, 1);
  assert.equal(updated[0].defects[0].category, "Brakes");
  assert.equal(updated[0].defects[0].state, "in-progress");

  const completed = applyDownEntryToFleet(updated, {
    busId: "bus-1",
    category: "Brakes",
    repair: "ABS warning",
    customReason: "",
    assignmentType: "Vendor",
    assignedTo: "Outside vendor",
    workflow: "Completed",
    operationalStatus: "service",
  });
  assert.equal(completed[0].l, "east-4");
  // The repair is finished and nothing is left open, so "In Service" is exactly
  // what was chosen and exactly what is stored. Previously the CNG lot forced
  // this back to "out" and the completed work never showed anywhere.
  assert.equal(completed[0].s, "service");
  assert.equal(completed[0].down, false);
  assert.equal(completed[0].pendingRepair, "");
  assert.equal(completed[0].defects.length, 1);
  assert.equal(completed[0].defects[0].state, "completed");
  assert.equal(completed[0].mechanic, "JD");
});

test("mechanic planning estimates enforce Curtis's shop baselines and accumulated totals", async () => {
  const estimateTotal = (category, repair) => repairTimeTotal(normalizeRepairTimeEstimate(undefined, category, repair));

  assert.equal(formatRepairTime(repairTimeTotal({repairMinutes:0,diagnosticMinutes:0,accessMinutes:0,complicationMinutes:0,heatMinutes:0,interruptionMinutes:0,otherMinutes:0,notes:""})), "30m");
  assert.equal(estimateTotal("Engine", "Check engine light"), 180);
  assert.equal(estimateTotal("Tires and Wheels", "Tire replacement"), 60);
  assert.equal(estimateTotal("Battery, Starting and Charging", "Jump / boost bus"), 30);
  assert.equal(estimateTotal("Battery, Starting and Charging", "Battery replacement"), 120);
  assert.equal(normalizeRepairTimeEstimate(undefined, "Battery, Starting and Charging", "Starting / charging diagnosis").diagnosticMinutes, 60);
  assert.equal(estimateTotal("Battery, Starting and Charging", "Starting / charging diagnosis"), 60);
  // No Start merged into Battery, Starting and Charging; both spellings still estimate
  assert.equal(normalizeRepairTimeEstimate(undefined, "Battery, Starting and Charging", "Crank no start").diagnosticMinutes, 90);
  assert.equal(estimateTotal("Battery, Starting and Charging", "Crank no start"), 120);
  assert.equal(estimateTotal("No Start", "Cranks / no start"), 120);
  assert.equal(estimateTotal("A/C and HVAC", "No cooling"), 150);
  assert.equal(estimateTotal("A/C and HVAC", "Compressor"), 960);
  assert.equal(estimateTotal("A/C and HVAC", "Evaporator core"), 960);
  assert.equal(estimateTotal("A/C and HVAC", "Condenser core"), 960);
  assert.equal(estimateTotal("Engine", "Rear main seal"), 960);
  assert.equal(estimateTotal("Engine", "Spark plugs"), 300);
  assert.equal(estimateTotal("Engine", "Valve adjustment"), 360);
  assert.equal(estimateTotal("Inspection", "A-6"), 390);
  assert.equal(estimateTotal("Inspection", "B-18"), 390);
  assert.equal(estimateTotal("Inspection", "C-24"), 720);
  assert.equal(estimateTotal("Brakes", "Front brake pads"), 180);
  assert.equal(estimateTotal("Brakes", "Brake rotors"), 480);
  assert.equal(estimateTotal("Brakes", "Rear shoes and drums"), 720);
  assert.equal(estimateTotal("Brakes", "ABS warning"), 120);
  assert.equal(normalizeRepairTimeEstimate(undefined, "Brakes", "ABS warning").diagnosticMinutes, 60);
  assert.equal(estimateTotal("Electrical / Multiplex", "MOD light"), 120);
  assert.equal(normalizeRepairTimeEstimate(undefined, "Electrical / Multiplex", "MOD light").diagnosticMinutes, 60);
  assert.equal(recommendedRepairMinutes("Engine", "Engine replacement"), 960);

  assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("Evaporator core"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Rear main seal"));
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Rear shoes and drums"));
  assert.ok(REPAIR_OPTIONS["Battery, Starting and Charging"].includes("Jump / boost bus"));
  assert.ok(REPAIR_OPTIONS["Electrical / Multiplex"].includes("MOD light"));

  const estimate = normalizeRepairTimeEstimate(undefined, "Engine", "Check engine light");
  const realistic = {...estimate, complicationMinutes:120, heatMinutes:60, interruptionMinutes:90, otherMinutes:30};
  assert.equal(repairTimeTotal(realistic), 480);
  assert.equal(formatRepairTime(repairTimeTotal(realistic)), "8h");

  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  assert.ok(page.includes("EST. ACTIVE LABOR"));
  assert.ok(page.includes("EST. CURRENT VIEW"));
  assert.match(page, /className="estimate-cell"/);
  assert.match(editor, /30-MINUTE ABSOLUTE MINIMUM/);
  assert.match(editor, /BUS ACCESS & SETUP/);
  assert.ok(editor.includes("HEAT / FATIGUE"));
  assert.ok(editor.includes("ROADCALL / INTERRUPTIONS"));
  assert.match(editor, /not a flat-rate promise/);
  assert.ok(css.includes(".mechanic-estimate"));
  assert.ok(css.includes(".estimate-grid"));
});

test("photo scan review validates fleet numbers and safely merges repeated rows", async () => {
  const fleet = [
    { id: "bus-17510", n: "17510" },
    { id: "bus-17520-a", n: "17520" },
    { id: "bus-17520-b", n: "17520" },
  ];
  const rows = [
    { pageNumber: 1, lineNumber: "1", busNumber: "17510", reason: "Check engine light", assignedTo: "Armon", category: "Engine", repair: "Check engine light", section: "Pending", shift: "3rd", operationalStatus: "out", confidence: .98, reviewNote: "" },
    { pageNumber: 2, lineNumber: "35", busNumber: "17510", reason: "B-12", assignedTo: "", category: "Inspection", repair: "B-12", section: "Inspection", shift: "3rd", operationalStatus: "out", confidence: .95, reviewNote: "" },
    { pageNumber: 1, lineNumber: "2", busNumber: "17520", reason: "Quarantine", assignedTo: "", category: "Miscellaneous", repair: "Manual entry", section: "Pending", shift: "3rd", operationalStatus: "out", confidence: .9, reviewNote: "" },
    { pageNumber: 1, lineNumber: "3", busNumber: "99999", reason: "Unknown bus", assignedTo: "", category: "Miscellaneous", repair: "Manual entry", section: "Pending", shift: "3rd", operationalStatus: "out", confidence: .7, reviewNote: "Verify number" },
  ];
  const reviewed = reviewScannedRows(rows, fleet);
  assert.equal(reviewed[0].fleetMatch, "matched");
  assert.equal(reviewed[0].repeatedCount, 2);
  assert.equal(reviewed[2].fleetMatch, "duplicate");
  assert.equal(reviewed[2].selected, false);
  assert.equal(reviewed[3].fleetMatch, "unknown");
  const merged = mergeReviewedRows(reviewed);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].busId, "bus-17510");
  assert.match(merged[0].reason, /Check engine light \/ B-12/);
  assert.equal(merged[0].shift, "3rd");
  const currentEntries = [
    { busId: "bus-17510", busNumber: "17510", section: "Pending", workflow: "Scheduled" },
    { id: "repair-inspection", busId: "bus-18501", busNumber: "18501", section: "Inspection", workflow: "In Progress" },
    { busId: "bus-18502", busNumber: "18502", section: "Pending", workflow: "Completed" },
  ];
  const removals = scannedSheetRemovals(currentEntries, merged.map(record => record.busId));
  assert.deepEqual(removals.map(entry => entry.busId), ["bus-18501"]);
  const openDefect = { id: "downsheet-repair-inspection", category: "Inspection", issue: "B-12", details: "", operability: "down", state: "open" };
  const released = prepareFleetForScannedReplacement([
    { id: "bus-17510", l: "east-0", s: "out", down: true, defects: [], pendingRepair: "" },
    { id: "bus-18501", l: "garage-0", s: "shop", down: true, defects: [openDefect], pendingRepair: "Misfire", parkedAt: "2026-08-25T00:00:00.000Z" },
  ], removals, "2026-08-26T00:00:00.000Z");
  assert.equal(released[0].down, false);
  assert.equal(released[0].s, "out");
  assert.equal(released[1].down, false);
  assert.equal(released[1].s, "defect");
  assert.equal(released[1].defects.length, 1);
  assert.equal(released[1].defects[0].id, openDefect.id);
  assert.equal(released[1].defects[0].state, "open");
  assert.equal(released[1].defects[0].operability, "service");
  const safetyDefect = { id: "brake-1", category: "Brakes", issue: "Brake mod light", details: "", operability: "down", state: "open", source: "defect-log" };
  const safetyReleased = prepareFleetForScannedReplacement([
    { id: "bus-18501", l: "garage-0", s: "shop", down: true, defects: [openDefect, safetyDefect], pendingRepair: "Inspection; brake" },
  ], removals, "2026-08-26T00:00:00.000Z");
  assert.equal(safetyReleased[0].s, "out");
  assert.equal(safetyReleased[0].defects.find(defect => defect.id === "brake-1").operability, "down");
  assert.equal(safetyReleased[0].defects.find(defect => defect.id === "brake-1").source, "defect-log");

  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const scanner = await readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/down-sheet-scan/route.ts", import.meta.url), "utf8");
  assert.ok(page.includes("SCAN SHEET"));
  assert.ok(page.includes("UNDO IMPORT"));
  assert.ok(scanner.includes("TAKE PHOTO"));
  assert.ok(scanner.includes("UPLOAD FILE"));
  assert.ok(scanner.includes("IMPORT APPROVED"));
  assert.ok(scanner.includes("AUTHORITATIVE REPLACEMENT"));
  assert.ok(scanner.includes("COMING OFF"));
  assert.doesNotMatch(scanner, />MERGE</);
  assert.match(page, /const nextEntries=\[\.\.\.imported\]/);
  assert.match(page, /prepareFleetForScannedReplacement\(fleet,removed,now\)/);
  assert.match(page, /currentEntries=\{active\}/);
  assert.ok(scanner.includes("READING PAGE"));
  assert.ok(scanner.includes("scanReadyPhoto"));
  /* The size cap moved to app/scan-photo.ts so the Down Sheet scan and the
     farebox / Ventra sweep scan share one limit. The invariant is the same:
     photos are capped at 700 KB before they leave the phone. */
  const scanPhoto = await readFile(new URL("../src/lib/defects/scan-photo.ts", import.meta.url), "utf8");
  assert.ok(scanPhoto.includes("700*1024"));
  assert.match(scanner, /import \{scanReadyPhoto\} from "(?:[^"]*\/)scan-photo"/);
  assert.ok(route.includes("OPENROUTER_API_KEY"));
  assert.ok(route.includes('import("cloudflare:workers")'));
  assert.ok(route.includes('"google/gemini-2.5-flash"'));
  assert.ok(route.includes("https://openrouter.ai/api/v1/chat/completions"));
  assert.ok(route.includes('response_format:{type:"json_schema"'));
  assert.ok(route.includes('"Cache-Control":"no-store"'));
  assert.ok(route.includes("OpenRouter credits"));
  assert.ok(route.includes("OpenRouter authorization was rejected"));
});

test("down-sheet completion updates only its linked repair and recalculates tracker status in place", () => {
  const manual = { id: "manual-1", category: "A/C and HVAC", issue: "No cooling", details: "Intermittent", operability: "service", state: "open" };
  const fleet = [{ id: "bus-1", l: "garage-4", s: "defect", pendingRepair: defectSummary([manual]), defects: [manual], down: false, mechanic: "", parkedAt: "old", lastLocationChangeAt: "old", lastStatusChangeAt: "old" }];
  const active = applyDownEntryToFleet(fleet, {
    id: "repair-1",
    busId: "bus-1",
    category: "Brakes",
    repair: "Air brake fault",
    customReason: "Low air warning",
    assignmentType: "Mechanic",
    assignedTo: "JD",
    workflow: "In Progress",
    operationalStatus: "out",
  }, "2026-08-09T10:00:00.000Z");
  assert.equal(active[0].l, "garage-4");
  // "Out of Service" was chosen deliberately and now sticks. This used to read
  // "defect", because the garage rule recomputed from the bus's open defects —
  // which meant a foreman could not mark a bus in the garage out of service at
  // all, however plainly he said so.
  assert.equal(active[0].s, "out");
  assert.equal(active[0].defects.length, 2);
  assert.equal(active[0].defects.find(defect => defect.id === "manual-1").state, "open");

  const completed = applyDownEntryToFleet(active, {
    id: "repair-1",
    busId: "bus-1",
    category: "Brakes",
    repair: "Air brake fault",
    customReason: "Repaired",
    assignmentType: "Mechanic",
    assignedTo: "JD",
    workflow: "Completed",
    operationalStatus: "service",
  }, "2026-08-09T12:00:00.000Z");
  assert.equal(completed[0].l, "garage-4");
  assert.equal(completed[0].s, "defect");
  assert.equal(completed[0].down, false);
  assert.equal(completed[0].defects.find(defect => defect.id === "manual-1").state, "open");
  assert.equal(completed[0].defects.find(defect => defect.id === "downsheet-repair-1").state, "completed");
  assert.match(completed[0].pendingRepair, /No cooling/);
  assert.doesNotMatch(completed[0].pendingRepair, /Air brake fault/);
  // The status genuinely moved at this step — out of service, then in service
  // with defects once the brake repair closed and only the A/C fault remained —
  // so the stamp moves with it. It previously read 10:00 because the status was
  // being recomputed to the same value both times and never actually changed.
  assert.equal(completed[0].lastStatusChangeAt, "2026-08-09T12:00:00.000Z");

  const laterRepair = applyDownEntryToFleet(completed, {
    id: "repair-2",
    busId: "bus-1",
    category: "Electrical / Multiplex",
    repair: "Horn",
    customReason: "",
    assignmentType: "Mechanic",
    assignedTo: "AB",
    workflow: "Scheduled",
    operationalStatus: "defect",
  }, "2026-08-09T13:00:00.000Z");
  assert.equal(laterRepair[0].defects.length, 3);
  assert.equal(laterRepair[0].defects.find(defect => defect.id === "downsheet-repair-1").state, "completed");
  assert.equal(laterRepair[0].defects.find(defect => defect.id === "downsheet-repair-2").state, "open");});

test("down-sheet repair items keep independent optional estimates and a bus total", () => {
  const first = {...blankRepairItem(0), category:"Engine", repair:"Check engine light", estimateEnabled:true, timeEstimate:normalizeRepairTimeEstimate(undefined,"Engine","Check engine light")};
  const second = {...blankRepairItem(1), category:"A/C and HVAC", repair:"Compressor", estimateEnabled:true, timeEstimate:normalizeRepairTimeEstimate(undefined,"A/C and HVAC","Compressor")};
  const optional = {...blankRepairItem(2), category:"Electrical / Multiplex", repair:"Horn", estimateEnabled:false, timeEstimate:normalizeRepairTimeEstimate(undefined,"Electrical / Multiplex","Horn")};
  assert.equal(repairItemsTotal([first]), 180);
  assert.equal(repairItemsTotal([first,second,optional]), 1140);
  const aggregate = aggregateRepairItemEstimates([first,second,optional]);
  assert.equal(aggregate.repairMinutes + aggregate.diagnosticMinutes + aggregate.accessMinutes, 1140);
  const restored = normalizeRepairItems([first,second,optional], {});
  assert.equal(restored.length, 3);
  assert.equal(restored[2].estimateEnabled, false);
});

test("quarantine down-sheet entries use non-labor treatment", async () => {
  assert.equal(isQuarantineEntry({category:"Miscellaneous",repair:"Manual entry",customReason:"QUARANTINE DO NOT MOVE (PER SAFETY)"}), true);
  assert.equal(isQuarantineEntry({category:"Miscellaneous",repairItems:[{category:"Legal",repair:"Quarantined",details:"Await instruction"}]}), true);
  assert.equal(isQuarantineEntry({category:"Engine",repair:"Check engine light",customReason:"No start"}), false);
  const page = await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8");
  assert.match(page, /if\(isQuarantineEntry\(entry\)\)return 0/);
  assert.match(page, /isQuarantineEntry\(entry\)\?"N\/A"/);
  assert.match(page, /className="fleet-number-button"[\s\S]*?onClick=\{\(\)=>setEditing\(entry\)\}/);
  assert.match(css, /\.reason-button b\{font-size:10\.5px;font-weight:900/);
});

test("inactive interface tabs keep an explicit high-contrast treatment", async () => {
  const downCss = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  const logCss = await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");
  assert.match(downCss, /down-header nav a\{background:#0b4f9e/);
  assert.match(logCss, /Readable inactive page tabs/);
  assert.match(logCss, /log-header nav a\{background:/);
});

test("phone layouts keep Defect Log actions large and Down Sheet tabs unobstructed", async () => {
  const downCss = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  const logCss = await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");
  assert.match(logCss, /feed-title \.feed-operator,\.feed-title button\{[^}]*height:52px;min-height:52px[^}]*font-size:11px/);
  assert.match(logCss, /Phone-only header containment/);
  assert.match(logCss, /\.log-header\{height:auto;min-height:0;gap:12px;[^}]*overflow:visible/);
  assert.match(logCss, /\.log-header nav\{[^}]*height:auto;[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[^}]*overflow:visible/);
  assert.match(logCss, /\.log-header nav a\{[^}]*min-width:0;[^}]*height:50px/);
  assert.match(logCss, /\.log-summary\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(logCss, /Keep default defect text legible on phones/);
  assert.ok(logCss.includes(".log-repair>b{font-size:max(var(--log-repair-category-size,9px),10px)"));
  assert.ok(logCss.includes(".log-repair>strong{font-size:max(var(--log-repair-details-size,11px),12px)"));
  assert.ok(logCss.includes(".quick-filter-defects>section>div>strong{font-size:11px}"));
  assert.match(logCss, /\.log-summary \.fixed-today\{[^}]*grid-column:1\/-1/);
  assert.match(logCss, /\.log-controls \.log-search-wrap\{[^}]*grid-column:1\/-1;grid-row:3/);
  assert.match(downCss, /Phone-only header containment/);
  assert.match(downCss, /\.down-header\{height:auto;min-height:78px/);
  assert.match(downCss, /\.down-header\{height:auto;min-height:0;gap:12px/);
  assert.match(downCss, /down-header nav\{[^}]*height:auto;[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)[^}]*overflow:visible/);
  assert.match(downCss, /down-header nav a\{[^}]*min-width:0;[^}]*height:50px/);
  assert.match(downCss, /font-size:min\(var\(--down-page-title-size,25px\),22px\)/);
  const trackerCss = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(trackerCss, /Phone-only containment keeps five-digit number tiles/);
  assert.match(trackerCss, /\.app\[data-bus-display="number"\] \.spot>\.token\{min-width:0;max-width:100%;[^}]*overflow:hidden/);
  assert.match(trackerCss, /\.token-number\{max-width:100%;overflow:hidden;font-size:10px/);
});

test("phone layouts expose large primary controls and category-only defect entry", async () => {
  const [trackerPage, trackerCss, downCss, defectPage, defectCss] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8"),
    readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8"),
  ]);
  // The phone nav is the shared list in the map's own shell; its order and
  // labels are pinned once, in the test on tracker-nav.tsx.
  assert.match(trackerPage, /<TrackerNav className="mobile-mode-nav" active="\/"\/>/);
  assert.match(trackerCss, /\.mobile-mode-nav a\{[^}]*min-height:50px/);
  assert.match(trackerPage, /className="phone-command-dock"[\s\S]*?>FIND<[\s\S]*?>FILTERS<[\s\S]*?>AI<[\s\S]*?>MORE</);
  assert.match(trackerPage, /className="garage-scroll"[\s\S]*?className="garagegrid"/);
  assert.match(trackerPage, /COLLAPSED_SECTIONS_KEY/);
  assert.match(trackerCss, /@media\(max-width:620px\)\{[\s\S]*?\.facility\{[^}]*min-width:0!important[^}]*zoom:1!important/);
  assert.match(trackerCss, /\.facility \.title-actions \.toggle-section\{[^}]*width:44px!important[^}]*height:44px!important/);
  assert.match(trackerCss, /\.command-bar\{display:none!important\}/);
  assert.match(trackerCss, /\.phone-command-dock\{[^}]*grid-template-columns:repeat\(4/);
  assert.match(downCss, /\.down-header nav a\{[^}]*height:50px/);
  /* QUICK SELECT (OPTIONAL) became DEFECT, and became a typing field. The label
     changed because the field did: it is no longer an optional shortcut behind a
     category, it is the way you name the defect — by typing it or by tapping it
     open, whichever is faster with the bus in front of you. */
  assert.match(defectPage, /<ComboField label="DEFECT"/);
  assert.match(defectPage, /<ComboField label="CATEGORY"/);
  assert.doesNotMatch(defectPage, /disabled=\{!value\.defect\.category\}/,
    "the defect field must not be gated on a category - removing that gate is the point of the change");
  assert.match(defectPage, /details\?"Manual entry":"Unspecified issue"/);
  assert.match(defectCss, /\.save-log-middle,\.close-log-middle\{[^}]*min-height:50px/);
  assert.match(defectPage, /<details className="advanced-defect-details"/);
  assert.match(defectPage, /<b>ADVANCED DETAILS<\/b><small>Diagnosis, repair, parts and initials<\/small>/);
  assert.ok(defectPage.indexOf('className="save-log-middle-actions"')<defectPage.indexOf('className="advanced-defect-details"'));
  assert.ok(defectPage.indexOf('className="advanced-defect-details"')<defectPage.indexOf('className="wide downsheet-check"'));
  assert.match(defectCss, /\.advanced-defect-details summary\{[^}]*min-height:46px/);
  assert.match(defectPage, /save-log-middle-actions[\s\S]*\{saveLabel\}[\s\S]*>CLOSE</);
  assert.doesNotMatch(defectPage, /SAVE & CLOSE/);
});

test("the Down Sheet is the only thing that decides whether a bus is down",async()=>{
 /* Curtis's rule, and the app's: active Down Sheet rows are the source of truth
    for the DS badge. Entries get there off a photographed sheet or typed by
    hand, and the map READS that membership rather than deciding it.

    A Fleet Map transfer nearly broke it. A map exported before a bus went on
    the sheet says down:false, and importing it stripped the badge off a bus
    whose Down Sheet entry was sitting right there — the map page reconciles
    only when the entries change, and an import does not change them. */
 const withDown=(down)=>({id:"a",n:"17549",l:"bay-3",s:down?"out":"service",down,onDownSheet:down,downSheetReady:false,defects:[],pendingRepair:""});

 // A map transfer carries no opinion about down status, in either direction.
 const payload=exportFleetMapPayload([withDown(false)]);
 for(const field of ["down","onDownSheet","downSheetReady"])
  assert.ok(!(field in payload.buses[0]),"a Fleet Map transfer must not carry "+field);
 assert.ok("l" in payload.buses[0]&&"s" in payload.buses[0],"it still carries the map itself");

 // and a receiving device keeps its own answer even when the file asserts one
 const forged={...payload,buses:[{id:"a",n:"17549",l:"west-9",s:"service",down:false,onDownSheet:false}]};
 const kept=mergeFleetMap([withDown(true)],forged);
 assert.equal(kept.buses[0].l,"west-9","the map still moved");
 assert.equal(kept.buses[0].down,true,"a hand-edited or older file still cannot clear the badge");
 assert.equal(kept.buses[0].onDownSheet,true);

 // a bus arriving with the map is not on this device's sheet, so it is not down
 const arrived=mergeFleetMap([],{...payload,buses:[{id:"z",n:"20077",l:"east-1",s:"service"}]});
 assert.equal(arrived.buses[0].down,false);
 assert.equal(arrived.buses[0].onDownSheet,false);

 // The map page's reconciliation is what asserts it, and it reads the entries.
 const map=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.match(map,/reconcileDownSheetMembership\(current,activeDownIds\)/);
 const sheet=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.match(sheet,/Active Down Sheet rows are the single source of truth/);
 /* An imported entry used to go through the normalizer on the sheet. One
    arriving without a timeEstimate crashed the sheet, because a row asks it for
    repairMinutes without checking. The import lives on the Settings page now
    and writes straight to storage, so it is the sheet's two READ paths that
    normalize: hydration, and the storage event that fires when the Settings
    page writes. */
 assert.match(sheet,/restored=nextEntries\.map\(normalizeEntry\)/);
 assert.match(sheet,/if\(payload\.valid\)setEntries\(payload\.entries\.map\(normalizeEntry\)\)/);
 /* And what the sheet used to do when its entries changed - mark the buses
    down - the import does itself, because the map draws its badges from that
    flag and nobody may have the sheet open. */
 const settings=await readFile(new URL("../app/settings/page.tsx",import.meta.url),"utf8");
 assert.match(settings,/const active=entries\.filter\(entry=>entry\.workflow!=="Completed"\)\.map\(entry=>entry\.busId\);/);
 assert.match(settings,/persist\(reconcileDownSheetMembership\(fleet,active\),entries\)/);
});

test("one repair on the sheet is one defect on the bus",async()=>{
 const item=(id,category,repair,extra={})=>({id,category,repair,details:"",...extra});
 const base={id:"e1",busId:"a",category:"Brakes",repair:"Air brake fault",customReason:"",
  assignmentType:"Mechanic",assignedTo:"cj",workflow:"Scheduled",operationalStatus:"out"};
 const bus={id:"a",l:"bay-3",s:"defect",defects:[],pendingRepair:""};

 // Three repairs used to become one record: the first card's category and
 // repair, with the other two joined into its details where they could not be
 // filtered, counted, or given their own parts and hours.
 const three={...base,repairItems:[
  item("i1","Brakes","Air brake fault"),
  item("i2","A/C and HVAC","No cooling"),
  item("i3","Doors, Ramp and ADA","Doors - Front door")]};
 const [after]=applyDownEntryToFleet([bus],three,"2026-08-27T15:00:00.000Z");
 assert.equal(after.defects.length,3);
 assert.deepEqual(after.defects.map(defect=>defect.category),["Brakes","A/C and HVAC","Doors, Ramp and ADA"]);
 assert.deepEqual(after.defects.map(defect=>defect.issue),["Air brake fault","No cooling","Doors - Front door"]);
 // each is its own record, so each can be filtered and counted on its own
 assert.equal(new Set(after.defects.map(defect=>defect.id)).size,3);

 // Saving again must update those three rather than mint three more.
 const [twice]=applyDownEntryToFleet([after],three,"2026-08-27T16:00:00.000Z");
 assert.equal(twice.defects.length,3);

 // Hours belong to the repair they were spent on. Recorded once on the entry
 // they would have been billed three times over, once per record.
 const done={...base,workflow:"Completed",repairItems:[
  item("i1","Brakes","Air brake fault",{actionTaken:"Replaced R-14 relay valve",finding:"R-14 relay valve leaking",repairHours:2}),
  item("i2","A/C and HVAC","No cooling",{repairHours:1.5,diagnosticHours:1})]};
 const [closed]=applyDownEntryToFleet([bus],done,"2026-08-27T15:00:00.000Z");
 assert.deepEqual(closed.defects.map(defect=>defect.repairHours),[2,1.5]);
 assert.deepEqual(closed.defects.map(defect=>defect.diagnosticHours),[undefined,1]);
 assert.equal(closed.defects[0].actionTaken,"Replaced R-14 relay valve");
 assert.equal(closed.defects[0].finding,"R-14 relay valve leaking");
 assert.equal(closed.defects[1].actionTaken,undefined,"a repair with no fix typed carries none");
 // one person signs the entry off, and the sheet already knew who had the bus
 assert.deepEqual(closed.defects.map(defect=>defect.completedBy),["CJ","CJ"]);
 assert.ok(closed.defects.every(defect=>defect.state==="completed"));

 // A vendor is not a technician in this shop and must not read as one.
 const [vendor]=applyDownEntryToFleet([bus],{...done,assignmentType:"Vendor",assignedTo:"Cummins"},"2026-08-27T15:00:00.000Z");
 assert.ok(vendor.defects.every(defect=>defect.completedBy===""));
 // and an entry still open carries no completion at all
 const [open]=applyDownEntryToFleet([bus],{...done,workflow:"Scheduled"},"2026-08-27T15:00:00.000Z");
 assert.ok(open.defects.every(defect=>defect.state==="open"&&defect.completedBy===undefined));

 // An entry that predates repair cards has one defect already on the bus, and
 // its card id is regenerated on every read. Keying on that id would mint a new
 // defect every save, so the first card adopts the record already there.
 const older={id:"legacy-1",l:"bay-3",s:"defect",pendingRepair:"",
  defects:[{id:"downsheet-e1",category:"Brakes",issue:"Air brake fault",details:"",operability:"down",state:"open",createdAt:"2026-08-01T10:00:00.000Z"}]};
 const legacyBus={...older,id:"a"};
 const [firstSave]=applyDownEntryToFleet([legacyBus],{...base,repairItems:[item("fresh-id-1","Brakes","Air brake fault")]},"2026-08-27T15:00:00.000Z");
 assert.equal(firstSave.defects.length,1,"no duplicate minted");
 assert.equal(firstSave.defects[0].id,"downsheet-e1");
 assert.equal(firstSave.defects[0].createdAt,"2026-08-01T10:00:00.000Z","and its history survives");
 // a different regenerated id on the next read still lands on the same record
 const [secondSave]=applyDownEntryToFleet([firstSave],{...base,repairItems:[item("fresh-id-2","Brakes","Air brake fault")]},"2026-08-27T16:00:00.000Z");
 assert.equal(secondSave.defects.length,1);
 assert.equal(secondSave.defects[0].createdAt,"2026-08-01T10:00:00.000Z");

 // Taking a repair off the sheet does not delete its defect. Coming off a sheet
 // is not being repaired, and the bus still has the fault.
 const [dropped]=applyDownEntryToFleet([after],{...three,repairItems:[item("i1","Brakes","Air brake fault")]},"2026-08-27T17:00:00.000Z");
 assert.equal(dropped.defects.length,3,"the two dropped repairs stay on the bus");

 // Shop policy: a diagnosis is never billed under an hour, applied where time
 // is typed and never on read, so no historical half-hour is rounded up.
 assert.equal(MINIMUM_DIAGNOSTIC_HOURS,1);
 assert.equal(normalizeDiagnosticHours("0.25"),1);
 assert.equal(normalizeDiagnosticHours(""),undefined,"blank still means no time recorded");
 assert.equal(normalizeDefects([{id:"d",category:"Brakes",issue:"x",details:"",state:"completed",diagnosticHours:0.5}])[0].diagnosticHours,0.5);

 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 // The Defect Log has a straight path to Fixed Repairs through SAVE AS FIXED.
 // This is that path from here, on each repair, and only while closing out.
 // The fix fields follow the repair that was finished, not the whole entry.
 assert.match(editor,/\{item\.done&&<div className="wide item-completion"/);
 assert.equal(/required/.test(editor.slice(editor.indexOf("item-completion"),editor.indexOf("</div>}",editor.indexOf("item-completion")))),false,"nothing in it is required");
 assert.match(editor,/value=\{draft\.completedBy\|\|assignedMechanic\}/);

 // The estimate is one line until somebody asks for the breakdown, and the
 // breakdown opens by itself where a figure already sits in one of the six.
 assert.match(editor,/className="estimate-simple"/);
 assert.match(editor,/BREAK THE ESTIMATE DOWN/);
 // It opens only when asked. Auto-opening where any of the six buckets was
 // non-zero sounded safe and did nothing, because the catalog seeds diagnosis
 // and access minutes the moment a repair is picked: every card opened and the
 // form was as long as before. The one line carries repairTimeTotal instead, so
 // keeping the breakdown shut hides no number.
 assert.match(editor,/showBreakdown=\(item:DownSheetRepairItem\)=>advancedEstimates\.has\(item\.id\);/);
 assert.match(editor,/value=\{hoursValue\(repairTimeTotal\(item\.timeEstimate\)\)\}/);
 assert.match(editor,/setSimpleTotal=\(item:DownSheetRepairItem,value:string\)/);
});

test("a repair on the Down Sheet finishes on its own day",async()=>{
 const item=(id,category,repair,extra={})=>({id,category,repair,details:"",...extra});
 const base={id:"e1",busId:"a",category:"Brakes",repair:"Air brake fault",customReason:"",
  assignmentType:"Mechanic",assignedTo:"cj",workflow:"In Progress",operationalStatus:"out"};
 const bus={id:"a",l:"bay-3",s:"defect",defects:[],pendingRepair:""};

 // Brakes done Monday, A/C still open. Until a card could say so the whole
 // entry had to stay open and none of that work could be written down.
 const partly={...base,repairItems:[
  item("i1","Brakes","Air brake fault",{done:true,actionTaken:"Replaced R-14 relay valve",repairHours:2}),
  item("i2","A/C and HVAC","No cooling")]};
 const [mid]=applyDownEntryToFleet([bus],partly,"2026-08-27T15:00:00.000Z");
 assert.deepEqual(mid.defects.map(defect=>defect.state),["completed","in-progress"]);
 assert.equal(mid.defects[0].actionTaken,"Replaced R-14 relay valve");
 assert.equal(mid.defects[0].completedBy,"CJ");
 assert.equal(mid.defects[1].completedBy,undefined,"the unfinished repair carries no technician");
 // and the bus stays down while any repair on it is still open
 assert.equal(mid.down,true);

 // The finished repair keeps the day it was finished when the rest close later.
 const [later]=applyDownEntryToFleet([mid],{...partly,repairItems:[
  item("i1","Brakes","Air brake fault",{done:true,actionTaken:"Replaced R-14 relay valve",repairHours:2}),
  item("i2","A/C and HVAC","No cooling",{done:true})]},"2026-08-29T15:00:00.000Z");
 assert.equal(later.defects[0].completedAt,"2026-08-27T15:00:00.000Z","Monday's repair keeps Monday");
 assert.equal(later.defects[1].completedAt,"2026-08-29T15:00:00.000Z");
 assert.equal(later.down,false,"and the bus comes off once the last one is done");

 // Setting the whole entry Completed still finishes everything, which is what
 // keeps closing out ten buses at end of shift a dropdown and not a checklist.
 const [swept]=applyDownEntryToFleet([bus],{...base,workflow:"Completed",repairItems:[
  item("i1","Brakes","Air brake fault"),item("i2","A/C and HVAC","No cooling")]},"2026-08-27T15:00:00.000Z");
 assert.ok(swept.defects.every(defect=>defect.state==="completed"));

 // An entry saved before cards could be finished individually reads as all done
 // when it was already Completed, rather than reopening every repair on it.
 const migrated=normalizeRepairItems([{id:"i1",category:"Brakes",repair:"Air brake fault"}],{entryCompleted:true});
 assert.equal(migrated[0].done,true);
 assert.equal(normalizeRepairItems([{id:"i1",category:"Brakes",repair:"Air brake fault"}],{})[0].done,false);

 // How far along, for the row on the sheet: two of three done must not look
 // like a bus nobody has touched.
 const progress=repairItemsProgress([item("a","Brakes","x",{done:true}),item("b","Engine","y",{done:true}),item("c","A/C and HVAC","z")]);
 assert.deepEqual([progress.done,progress.total,progress.complete],[2,3,false]);
 assert.equal(repairItemsProgress([item("a","Brakes","x",{done:true})]).complete,true);
 assert.equal(repairItemsProgress([]).complete,false,"an empty entry is not a finished one");
 // blank cards are not counted as repairs waiting to be done
 assert.equal(repairItemsProgress([item("a","Brakes","x",{done:true}),item("b","","")]).complete,true);

 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 // The entry's workflow and its cards have to agree, and it is the cards that
 // know: ticking the last one closes the entry, unticking one reopens it.
 assert.match(editor,/progress\.complete\?"Completed":current\.workflow==="Completed"\?"In Progress":current\.workflow/);
 assert.match(editor,/workflow==="Completed"\?current\.repairItems\.map\(item=>\(\{\.\.\.item,done:true\}\)\)/);
 assert.match(editor,/className="repair-item-done"/);

 // Two of three finished must not read on the sheet like a bus nobody has
 // touched. The count is what a foreman scans down the row for.
 const sheet=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.match(sheet,/progress\.done\+" OF "\+progress\.total\+" DONE"/);
 assert.match(sheet,/repairProgressLabel\(entry\)/);
});

test("no element in the Defect Log relies on the global bare header and footer styling",async()=>{
 const [logPage,logSettings,logCss,mysteryBoard,globalCss]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/defect-log-settings-modal.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../src/components/down-sheet/mystery-board.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
 ]);
 // globals.css styles bare <header> as a 38px dark banner and bare <footer> as
 // a pill fixed to the bottom of the viewport. The editor's action bar had a
 // rule only inside the phone breakpoint, so on desktop it detached from the
 // modal, floated over the page and swallowed clicks; the grouped defect list
 // wore the dark banner. Every one of them now carries a class. The settings
 // panel is its own module now, rendered on the Settings page, and the rule
 // holds there too - that page loads globals.css like every other.
 const logMarkup=logPage+logSettings;
 assert.equal(/<header>|<footer>/.test(logMarkup+mysteryBoard),false,"no bare header or footer may come back");
 for(const className of ["log-editor-head","log-settings-head","quick-filter-head","grouped-defect-head","log-editor-actions","part-prompt-head"])
  assert.ok(logMarkup.includes('className="'+className+'"'),className+" must be applied in the markup");

 /* MYSTERY BUSES moved to the Down Sheet, and its markup went with it into a
    module both pages render — the board on the Down Sheet, the MOVE / LOCATION
    editor from the Defect Log's deferred drawer. Its header and footer are
    still bare <header> and <footer> tags underneath, so the same trap applies;
    the reset that neutralises them just has to live in the one stylesheet both
    pages load. */
 for(const className of ["mystery-head","mystery-move-head","mystery-move-actions"])
  assert.ok(mysteryBoard.includes('className="'+className+'"'),className+" must be applied in the shared board markup");
 const sharedReset=globalCss.match(/\.mystery-head,\.mystery-move-head,\.mystery-move-actions\{([^}]*)\}/);
 assert.ok(sharedReset,"globals.css must reset the board's header and footer, or it wears the 38px banner and the fixed pill");
 for(const property of ["position:static","height:auto","transform:none","background:none","box-shadow:none","white-space:normal","z-index:auto"])
  assert.ok(sharedReset[1].includes(property),"the shared reset must clear "+property);

 // the element selectors still match these tags, so the global properties are
 // neutralised before each one is styled deliberately
 const reset=logCss.match(/\.log-editor-head,\.log-settings-head,\.quick-filter-head,\.grouped-defect-head,\.log-editor-actions,\.part-prompt-head\{([^}]*)\}/);
 assert.ok(reset,"the reset block must exist");
 for(const property of ["position:static","height:auto","transform:none","background:none","box-shadow:none","white-space:normal","z-index:auto"])
  assert.ok(reset[1].includes(property),"the reset must clear "+property);

 // the action bar must be sticky OUTSIDE any media query, which is what was
 // missing: styling it only for phones is how the desktop bug happened
 const topLevel=(()=>{let out="",depth=0,index=0;
  while(index<logCss.length){
   if(logCss.startsWith("@media",index)){const open=logCss.indexOf("{",index);depth=1;index=open+1;
    while(index<logCss.length&&depth>0){if(logCss[index]==="{")depth++;else if(logCss[index]==="}")depth--;index++}
    continue}
   out+=logCss[index];index++}
  return out})();
 assert.equal(topLevel.includes("@media"),false,"media blocks must be stripped");
 assert.match(topLevel,/\.log-editor-actions\{position:sticky;z-index:4;bottom:0;/);
 assert.match(topLevel,/\.log-editor-actions button\{min-width:150px;min-height:46px;border:/);
 assert.match(topLevel,/\.log-editor-actions \.save-log\{border-color:#08733f;background:#08733f/);

 // Add Defect is the same green as Log Defect and the focus view's button
 assert.match(logCss,/\.grouped-defect-head button\{[^}]*background:#08733f/);
 assert.match(logCss,/\.feed-title button\{[^}]*background:#08733f/);
 assert.match(logCss,/\.add-log-focus-defect\{[^}]*background:#08733f/);
 // and it is no longer the blue accent, on a header that is no longer a banner
 assert.equal(/\.grouped-defect-head button\{[^}]*background:var\(--log-accent\)/.test(logCss),false);
 assert.match(logCss,/\.grouped-defect-head\{[^}]*background:none/);
});

test("the Down Sheet can move a bus, which is what makes a status change stick",async()=>{
 const { applyDownEntryToFleet } = await import("../src/lib/down-sheet/down-sheet-sync.ts");
 const { RELOCATION_AREAS } = await import("../src/lib/fleet/facility-areas.ts");
 const now="2026-08-30T12:00:00.000Z";
 const fleet=[{id:"b1",n:"17554",l:"west-3",s:"out",defects:[],pendingRepair:"",down:true}];
 const entry={id:"e1",busId:"b1",category:"Tech Services",repair:"Ventra",customReason:"",
  assignmentType:"Mechanic",assignedTo:"CJ",workflow:"Completed",operationalStatus:"defect"};

 // The paperwork changes before the bus does. Mark it in service with defects,
 // get sidetracked before anyone drives it out of the lot, and the board says
 // what you told it — green, still parked in CNG West — rather than reverting
 // to out of service and hiding that the work was done.
 const stayed=applyDownEntryToFleet(fleet,entry,now);
 assert.equal(stayed[0].l,"west-3");
 assert.equal(stayed[0].s,"defect");

 // And when the bus is actually moved, it goes where it was sent.
 const moved=applyDownEntryToFleet(fleet,{...entry,location:"MAIN GARAGE (BAYS 1-10)"},now);
 assert.ok(RELOCATION_AREAS["MAIN GARAGE (BAYS 1-10)"].includes(moved[0].l));
 assert.equal(moved[0].s,"defect");

 // Location still governs MOVEMENT: a bus parked into a CNG lot still goes out
 // of service on its own. The rule was never removed, only stopped from
 // overruling a person who said otherwise on the sheet.
 const { moveOrSwapBuses } = await import("../src/lib/fleet/smart-status.ts");
 const dragged=moveOrSwapBuses([{id:"b9",n:"20505",l:"garage-1",s:"service",defects:[],pendingRepair:""}],"b9","west-5",now);
 assert.equal(dragged[0].s,"out");

 // A bus carrying an open fault is never plainly "In Service". That rule is
 // about the condition of the bus, not where it is parked, so it survives.
 const withFault=[{id:"b1",n:"17554",l:"garage-2",s:"shop",
  defects:[{id:"d9",category:"A/C and HVAC",issue:"No cooling",details:"",operability:"service",state:"open"}],
  pendingRepair:"",down:true}];
 const claimed=applyDownEntryToFleet(withFault,{...entry,operationalStatus:"service",workflow:"In Progress"},now);
 assert.equal(claimed[0].s,"defect");

 // An area that does not exist, or one with no room, must not lose the repair.
 const unknown=applyDownEntryToFleet(fleet,{...entry,location:"NOWHERE AT ALL"},now);
 assert.equal(unknown[0].l,"west-3");
 assert.equal(unknown[0].defects.length,1);

 // The move is an instruction, not a property of the repair: left on the entry
 // it would re-run on every later save and drag the bus back from wherever
 // somebody had since parked it.
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.match(page,/next=\{\.\.\.next,location:undefined\}/);
 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 assert.match(editor,/MOVE BUS TO/);
 assert.doesNotMatch(editor,/Status only; location stays unchanged/);
});

test("COMPLETED TODAY is a view you can press, and it means today",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
 ]);
 // It counted the right thing and did nothing when pressed, so "what did we
 // actually finish today" could only be reached by turning on SHOW COMPLETED
 // and reading past the whole live sheet.
 assert.match(page,/className=\{"group-count group-completed completed-today-tile"/,"it moved into the status report with the rest of SHEET STATS");
 assert.match(page,/aria-pressed=\{fixedToday\}/);
 // Pressing replaces the view rather than adding to it: completed, and today.
 // A repair finished last week is not what the tile counts and must not appear.
 assert.match(page,/fixedToday\?entry\.workflow==="Completed"&&isToday\(entry\.completedAt\)/);
 // The shift filter and the search still apply on top of it.
 assert.match(page,/fixedToday\?[^;]*\)&&\(filter==="All"\|\|entry\.shift===filter\)&&matchesDownSheetSearch/);
 // Nothing to show and not already showing it means nothing to press.
 assert.match(page,/disabled=\{!counters\.completedToday&&!fixedToday\}/);
 // It has to keep looking like the tiles beside it, which are divs - and like
 // the two road tallies, which are the other tiles you can press.
 assert.match(css,/\.down-group-counts \.group-count\.group-completed\{font:inherit;cursor:pointer\}/);
 assert.match(css,/\.down-group-counts \.group-count\.group-completed\.active\{/);
});

test("duplicate defects merge into one record without losing anything",async()=>{
 const { mergeDuplicateDefects, matchingUnresolvedDefectId, defectFingerprint } =
  await import("../src/lib/defects/duplicate-defects.ts");
 const { applyDownEntryToFleet } = await import("../src/lib/down-sheet/down-sheet-sync.ts");

 const defect=(id,extra={})=>({id,category:"Cooling System",issue:"Overheating",
  details:"R/C Overheats/ Farebox Won't Lock/ Rear End Shifted",
  operability:"service",state:"open",source:"down-sheet",...extra});
 const bus=(id,n,defects)=>({id,n,l:"west-9",s:"defect",defects,pendingRepair:""});

 // Bus 17543 as the shop's live board actually holds it: the same overheat
 // photographed off the Down Sheet on two different days. Each scan minted an
 // entry id from the clock, so each produced a defect id nothing on the bus
 // matched, and the fault is stored twice.
 const twice=[bus("c","17543",[
  defect("downsheet-repair-scan-1787409639286-18",{createdAt:"2026-08-22T10:00:00.000Z"}),
  defect("downsheet-repair-scan-1787516955962-16",{createdAt:"2026-08-23T10:00:00.000Z"}),
 ])];
 const merged=mergeDuplicateDefects(twice,[],"2026-08-31T12:00:00.000Z");
 assert.equal(merged.removed,1);
 assert.equal(merged.busesAffected,1);
 assert.equal(merged.buses[0].defects.length,1);
 // Nothing anchors this group, so the oldest survives and keeps the date the
 // fault was actually first seen rather than the date of the latest photo.
 assert.equal(merged.buses[0].defects[0].id,"downsheet-repair-scan-1787409639286-18");
 assert.equal(merged.buses[0].defects[0].createdAt,"2026-08-22T10:00:00.000Z");

 // THE ANCHOR RULE. On 17504 the NEWEST copy is the one an entry still on the
 // sheet regenerates. Keeping the oldest would delete the only record that
 // comes back, and the duplicate would reappear on the next save — a cleanup
 // that visibly undoes itself. The entry's copy has to win.
 const anchored=[bus("d","17504",[
  defect("downsheet-repair-scan-1787409639286-10",{createdAt:"2026-08-22T10:00:00.000Z"}),
  defect("downsheet-repair-scan-1787881978072-6", {createdAt:"2026-08-27T10:00:00.000Z"}),
 ])];
 const entry={id:"repair-scan-1787881978072-6",busId:"d",category:"Cooling System",
  repair:"Overheating",customReason:"R/C Overheats/ Farebox Won't Lock/ Rear End Shifted",
  assignmentType:"Mechanic",assignedTo:"",workflow:"Scheduled",operationalStatus:"defect"};
 const kept=mergeDuplicateDefects(anchored,[entry],"2026-08-31T12:00:00.000Z");
 assert.equal(kept.removed,1);
 assert.equal(kept.buses[0].defects[0].id,"downsheet-repair-scan-1787881978072-6");
 assert.equal(kept.groups[0].anchored,true);
 // And prove it stays merged: replaying the sheet entry must not resurrect the
 // record that was folded away.
 const replayed=applyDownEntryToFleet(kept.buses,kept.entries[0],"2026-08-31T12:05:00.000Z");
 assert.equal(replayed[0].defects.length,1,"a sheet replay must not re-create the duplicate");

 // NOTHING IS LOST. Fields living on the copy move to the survivor, the most
 // severe operability wins so a merge can never put a bus back in service, and
 // the further-along state is kept.
 const rich=[bus("e","17541",[
  defect("a",{createdAt:"2026-08-22T10:00:00.000Z",operability:"service",state:"open"}),
  defect("b",{createdAt:"2026-08-23T10:00:00.000Z",operability:"down",state:"in-progress",
   actionTaken:"Replaced thermostat",shopNotes:"Waiting on a hose",repairHours:2.5,
   symptoms:["Steam from rear"],partNumber:"HX-99"}),
 ])];
 const folded=mergeDuplicateDefects(rich,[],"2026-08-31T12:00:00.000Z").buses[0].defects[0];
 assert.equal(folded.id,"a");
 assert.equal(folded.operability,"down","severity must never soften through a merge");
 assert.equal(folded.state,"in-progress");
 assert.equal(folded.actionTaken,"Replaced thermostat");
 assert.equal(folded.shopNotes,"Waiting on a hose");
 assert.equal(folded.repairHours,2.5);
 assert.equal(folded.partNumber,"HX-99");
 assert.deepEqual(folded.symptoms,["Steam from rear"]);

 // ONLY EXACT REPEATS. Two genuinely different faults on one bus are two
 // faults, and a completed record is never folded into an open one.
 const distinct=[bus("f","17533",[
  {id:"g",category:"Tech Services",issue:"Farebox",details:"",operability:"service",state:"open"},
  {id:"h",category:"Tech Services",issue:"Farebox won't lock",details:"",operability:"service",state:"open"},
  {...defect("i"),state:"completed"},
  defect("j"),
 ])];
 const careful=mergeDuplicateDefects(distinct,[],"2026-08-31T12:00:00.000Z");
 assert.equal(careful.removed,0,"different issues and a completed record are all left alone");

 // Records carrying nothing in any compared field are not duplicates of each
 // other — they make no claim to compare, and grouping on empty would destroy
 // unrelated rows.
 const blanks=[bus("k","17510",[
  {id:"m",category:"",issue:"",details:"",operability:"service",state:"open"},
  {id:"n",category:"",issue:"",details:"",operability:"service",state:"open"},
 ])];
 assert.equal(mergeDuplicateDefects(blanks,[],"2026-08-31T12:00:00.000Z").removed,0);

 // Nothing is ever merged across buses.
 const twoBuses=[bus("p","17507",[defect("q")]),bus("r","17509",[defect("s")])];
 assert.equal(mergeDuplicateDefects(twoBuses,[],"2026-08-31T12:00:00.000Z").removed,0);

 // PREVENTION — the half that stops it happening again. A rescan of the same
 // paper finds the record already on the bus instead of minting a second.
 const already=bus("t","17543",[defect("downsheet-repair-scan-1787409639286-18")]);
 assert.equal(
  matchingUnresolvedDefectId(already,{category:"Cooling System",repair:"Overheating",
   reason:"R/C Overheats/ Farebox Won't Lock/ Rear End Shifted"}),
  "downsheet-repair-scan-1787409639286-18");
 // A different fault on the same bus is not adopted.
 assert.equal(matchingUnresolvedDefectId(already,{category:"Brakes",repair:"ABS warning",reason:""}),undefined);
 // Whitespace and case are not a new defect.
 assert.equal(defectFingerprint({category:"Cooling  System",issue:"OVERHEATING",details:" x "}),
              defectFingerprint({category:"cooling system",issue:"overheating",details:"x"}));

 // End to end: import the same scanned row twice, the second time with the
 // entry no longer on the sheet, which is exactly how the live duplicates were
 // made. Adopting the existing record keeps it at one.
 const fresh=[bus("u","17562",[])];
 const scan=(entryId)=>({id:entryId,busId:"u",category:"Transmission and Drivetrain",
  repair:"Will not shift",customReason:"Dragging on S/S / High Trans Temp / Stuck in 3rd Gear",
  assignmentType:"Mechanic",assignedTo:"",workflow:"Scheduled",operationalStatus:"defect"});
 const first=applyDownEntryToFleet(fresh,scan("repair-scan-1787409639286-13"),"2026-08-22T10:00:00.000Z");
 assert.equal(first[0].defects.length,1);
 const adopted=matchingUnresolvedDefectId(first[0],{category:"Transmission and Drivetrain",
  repair:"Will not shift",reason:"Dragging on S/S / High Trans Temp / Stuck in 3rd Gear"});
 const second=applyDownEntryToFleet(first,{...scan("repair-scan-1787516955962-12"),defectId:adopted},"2026-08-23T10:00:00.000Z");
 assert.equal(second[0].defects.length,1,"a rescan must update the record, not add a second");
 assert.equal(second[0].defects[0].id,"downsheet-repair-scan-1787409639286-13");

 // A cleanup that undoes itself is not a cleanup. An entry still on the sheet
 // that names no defect, but says exactly what the survivor says, mints its
 // defect id from its OWN entry id — so the next save writes a second record
 // with a different id and the same sentence, and the duplicate is back within
 // a shift. Replaying the live board caught this on 11 of the 21 buses.
 const lingering=[bus("v","15504",[
  defect("downsheet-repair-scan-1787409639286-20",{createdAt:"2026-08-22T14:40:39Z"}),
  defect("downsheet-repair-scan-1787516955962-18",{createdAt:"2026-08-23T20:29:15Z"}),
 ])];
 const stillOnSheet={id:"repair-scan-1787881978072-41",busId:"v",category:"Cooling System",
  repair:"Overheating",customReason:"R/C Overheats/ Farebox Won't Lock/ Rear End Shifted",
  assignmentType:"Mechanic",assignedTo:"",workflow:"Scheduled",operationalStatus:"defect"};
 const tidied=mergeDuplicateDefects(lingering,[stillOnSheet],"2026-08-31T12:00:00.000Z");
 assert.equal(tidied.removed,1);
 assert.equal(tidied.relinkedEntries,1,"the entry must be pointed at the record that survived");
 assert.equal(tidied.entries[0].defectId,"downsheet-repair-scan-1787409639286-20");
 const afterSave=applyDownEntryToFleet(tidied.buses,tidied.entries[0],"2026-08-31T12:05:00.000Z");
 assert.equal(afterSave[0].defects.length,1,"saving that entry must update, not duplicate");
});

test("a repair already on the bus is not recorded twice by the down sheet",async()=>{
 const { applyDownEntryToFleet } = await import("../src/lib/down-sheet/down-sheet-sync.ts");
 const { defectSupportingDetails, normalizeDefects } = await import("../src/lib/defects/repair-catalog.ts");
 const { blankRepairItem } = await import("../src/lib/down-sheet/down-sheet-repair-items.ts");

 // A bus carrying a check engine light typed into the Defect Log, exactly as
 // that page stores it.
 const logged=(extra={})=>({id:"d1",category:"Engine",issue:"Check engine light",details:"Loses power on the hill",
  operability:"service",state:"open",source:"defect-log",createdAt:"2026-09-01T08:00:00.000Z",...extra});
 const bus=(defects)=>({id:"b",n:"17563",l:"west-9",s:"defect",defects,pendingRepair:""});

 // A card the way the editor hands one over: a fresh id minted from the clock,
 // which is what used to make this a second record.
 const card=(category,repair,details,id="repair-item-1788398225431-0-asi95")=>
  ({id,category,repair,details,estimateEnabled:false,timeEstimate:blankRepairItem().timeEstimate});
 const entry=(items,extra={})=>({id:"repair-1788398225431-x4gda",busId:"b",
  category:items[0]?.category||"",repair:items[0]?.repair||"",customReason:items[0]?.details||"",
  repairItems:items,assignmentType:"Mechanic",assignedTo:"AM",workflow:"Scheduled",
  operationalStatus:"defect",...extra});

 // THE CASE. Somebody uses + ADD DOWN BUS and writes down the fault the bus is
 // already logged for. One fault, one record — the sheet writes to the record
 // that is there rather than opening a second one beside it.
 const [same]=applyDownEntryToFleet([bus([logged()])],
  entry([card("Engine","Check engine light","Loses power on the hill")]),"2026-09-02T09:00:00.000Z");
 assert.equal(same.defects.length,1,"the same repair added by hand must not become a second record");
 assert.equal(same.defects[0].id,"d1","the record already on the bus is the one written to");
 assert.equal(same.defects[0].createdAt,"2026-09-01T08:00:00.000Z","the day the fault was first seen is kept");
 assert.equal(same.defects[0].source,"defect-log","and where it came from is not rewritten");

 // A genuinely different fault on the same bus is still its own record.
 const [other]=applyDownEntryToFleet([bus([logged()])],
  entry([card("Brakes","ABS warning light","")]),"2026-09-02T09:00:00.000Z");
 assert.equal(other.defects.length,2,"a different fault is a different record");

 // Finishing it on the sheet closes the logged fault, rather than closing a
 // copy and leaving the original open for good.
 const [closed]=applyDownEntryToFleet([bus([logged()])],
  entry([{...card("Engine","Check engine light","Loses power on the hill"),done:true}],{workflow:"Completed"}),
  "2026-09-02T09:00:00.000Z");
 assert.equal(closed.defects.length,1);
 assert.equal(closed.defects[0].state,"completed");

 // A record already resolved is never reopened by a new card that reads like
 // it: that is a fault that has come back, and it gets its own record.
 const [again]=applyDownEntryToFleet([bus([logged({state:"completed",completedAt:"2026-09-01T15:00:00.000Z"})])],
  entry([card("Engine","Check engine light","Loses power on the hill")]),"2026-09-02T09:00:00.000Z");
 assert.equal(again.defects.length,2,"a repeat of a finished repair is new work");

 // THE APP'S OWN SPELLING. A bus marked down is pulled onto the sheet by the
 // app, and the card it builds carries the defect's SUPPORTING text — the
 // reported symptoms, and on an A/C fault the diagnostic lamp and its alarm
 // number, folded in ahead of the note — not the bare details field. Both
 // spellings are the same record.
 const [reported]=normalizeDefects([logged({symptoms:["Misfire"]})]);
 assert.equal(defectSupportingDetails(reported),"Misfire — Loses power on the hill");
 const [pulled]=applyDownEntryToFleet([bus([reported])],
  entry([card("Engine","Check engine light",defectSupportingDetails(reported))]),"2026-09-02T09:00:00.000Z");
 assert.equal(pulled.defects.length,1,"a bus the app pulls onto the sheet must not duplicate its own defects");
 assert.equal(pulled.defects[0].id,"d1");
 // The adopted record keeps its own details rather than swallowing the spelled
 // out card, which would leave it reading "Misfire — Misfire — ...".
 assert.equal(pulled.defects[0].details,"Loses power on the hill");
 assert.deepEqual(pulled.defects[0].symptoms,["Misfire"]);
 assert.equal(defectSupportingDetails(pulled.defects[0]),"Misfire — Loses power on the hill");

 // Same again with a lamp, which is the A/C form of the same problem.
 const [lamp]=normalizeDefects([logged({category:"A/C and HVAC",issue:"Blows warm air",diagLight:"red",alarmCode:"32"})]);
 assert.equal(defectSupportingDetails(lamp),"RED DIAG LIGHT alarm 32 — Loses power on the hill");
 const [lit]=applyDownEntryToFleet([bus([lamp])],
  entry([card("A/C and HVAC","Blows warm air",defectSupportingDetails(lamp))]),"2026-09-02T09:00:00.000Z");
 assert.equal(lit.defects.length,1,"the lamp spelled into the card is the same record");
 assert.equal(lit.defects[0].id,"d1");
 assert.equal(lit.defects[0].diagLight,"red","and the lamp itself survives being written to");
 assert.equal(lit.defects[0].alarmCode,"32");
 assert.equal(lit.defects[0].details,"Loses power on the hill","the lamp is not flattened into the note");

 // Two cards can never both land on one record: the second keeps its own id
 // rather than overwriting what the first just claimed.
 const [twice]=applyDownEntryToFleet([bus([logged()])],
  entry([card("Engine","Check engine light","Loses power on the hill","item-a"),
         card("Engine","Check engine light","Loses power on the hill","item-b")]),"2026-09-02T09:00:00.000Z");
 assert.equal(twice.defects.length,2);
 assert.equal(new Set(twice.defects.map(defect=>defect.id)).size,2,"two cards, two ids");

 // A card that has already written its own record keeps it. Re-typing a card to
 // match a neighbouring fault must update what that card wrote, not wander onto
 // the neighbour and leave its own record orphaned.
 const first=applyDownEntryToFleet([bus([])],entry([card("Brakes","ABS warning light","")]),"2026-09-02T09:00:00.000Z");
 assert.equal(first[0].defects.length,1);
 const own=first[0].defects[0].id;
 const withLog=[{...first[0],defects:[logged(),...first[0].defects]}];
 const [edited]=applyDownEntryToFleet(withLog,
  entry([card("Engine","Check engine light","Loses power on the hill")]),"2026-09-02T10:00:00.000Z");
 assert.equal(edited.defects.length,2,"the card updates the record it owns");
 assert.equal(edited.defects.find(defect=>defect.id===own).issue,"Check engine light");

 // An empty card claims nothing. Two records that say nothing are not evidence
 // of one fault — they are just as likely to be two problems nobody typed up —
 // so a blank entry writes its own "Repair required" placeholder the way it
 // always has, and the record already sitting there is left alone rather than
 // being quietly written over.
 const blank={id:"d2",category:"Miscellaneous",issue:"Repair required",details:"",
  operability:"service",state:"open",source:"defect-log",createdAt:"2026-09-01T08:00:00.000Z"};
 const [untouched]=applyDownEntryToFleet([bus([blank])],
  entry([{...card("","",""),estimateEnabled:true}]),"2026-09-02T09:00:00.000Z");
 const kept=untouched.defects.find(defect=>defect.id==="d2");
 assert.ok(kept,"the existing record must still be there");
 assert.equal(kept.createdAt,"2026-09-01T08:00:00.000Z","and must not have been adopted on a blank");
 assert.equal(kept.source,"defect-log");
});

test("a footer inside a dialog is not positioned against the viewport, and every lock actually locks", async () => {
 const [globals, scanner, lock, down] = await Promise.all([
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/shared/scroll-lock.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8"),
 ]);

 /* The bare `footer` rule is page furniture — a pill floating at the bottom of
    the Facility Map and the Down Sheet — and it reached EVERY <footer> in the
    app. On the SCAN SHEET modal that put CANCEL at x=-78 on a 390px phone:
    position:fixed and left:50% survived even where a later rule set
    position:sticky, and translateX(-50%) dragged the bar half off the left edge.
    Same shape as the bare `header{height:38px}` trap CLAUDE.md records. */
 assert.match(globals, /footer\{position:fixed;bottom:10px;left:50%/, "the global is still there for .down-footnote and .command-bar");
 assert.match(globals, /\[role="dialog"\] footer,\.shade footer,\.down-shade footer,\.log-shade footer\{position:static;left:auto;right:auto;transform:none/);

 /* lockPageScroll added only the CALLER'S class, so a name with no stylesheet
    rule behind it was a lock that silently did nothing. Three of the five call
    sites were in that state: the SCAN SHEET modal Curtis reported, the
    mystery-bus location editor, and the first-run welcome. The class that does
    the locking is one shared name now, defined once. */
 assert.match(lock, /export const PAGE_SCROLL_LOCKED="page-scroll-locked"/);
 assert.match(lock, /root\.classList\.add\(name,PAGE_SCROLL_LOCKED\)/);
 assert.match(lock, /body\.classList\.add\(name,PAGE_SCROLL_LOCKED\)/);
 assert.match(lock, /root\.classList\.remove\(name,PAGE_SCROLL_LOCKED\)/);
 assert.match(globals, /html\.page-scroll-locked,body\.page-scroll-locked\{overflow:hidden;overscroll-behavior:none\}/);

 /* THE SAME SPECIES, FOUND LATER: the Facility Map's phone nav carried
    `position:sticky;top:0` and had never pinned anything since the rule was
    written. `overflow-x:hidden` computes the other axis to `overflow-y:auto`,
    which makes the element a scroll container, and a sticky descendant sticks
    to its nearest scroll container — so the nav was sticking to `.app`, which
    does not scroll: the document does. Measured before the fix: scroll to 1600
    and the nav sat at y-1286, gone.

    `overflow-x:clip` clips the same content without creating a scroll
    container, so the nav's container becomes the viewport. `hidden` stays in
    front of it as the fallback declaration — a browser that does not know
    `clip` ignores the line after it and keeps the old behaviour, which is a
    nav that scrolls away rather than a page that scrolls sideways. Both
    declarations are load-bearing; deleting either changes what ships. */
 assert.match(globals, /html,body\{max-width:100%;overflow-x:hidden;overflow-x:clip\}/,
   "hidden first as the fallback, clip second so sticky has a scrolling container");
 assert.match(globals, /\.app\{[^}]*overflow-x:hidden!important;overflow-x:clip!important/,
   "the map's own wrapper was the container the nav was stuck to");
 assert.match(globals, /\.mobile-mode-nav\{position:sticky;z-index:19;top:0/,
   "the rule this exists to make true");
 // Every caller is now covered by that one rule whatever name it passes.
 for (const file of ["../app/down-sheet/_components/down-sheet-scanner.tsx", "../src/components/down-sheet/mystery-board.tsx", "../src/components/shared/welcome-gate.tsx",
                     "../app/down-sheet/_components/down-sheet-editor.tsx", "../app/defect-log/page.tsx"]) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  if (/lockPageScroll\(/.test(source)) assert.match(source, /lockPageScroll\("[a-z-]+"\)/, file + " passes a name");
 }
 // The scanner had no lock at all, which is what let the sheet drag underneath.
 assert.match(scanner, /useEffect\(\(\)=>lockPageScroll\("scan-sheet-open"\),\[\]\)/);

 /* 100vh on a phone is TALLER than the visible viewport — the browser chrome
    overlays it — so the modal ran past the bottom of the screen and its action
    bar went with it. 100vw ignored the shade's own padding and overflowed it
    sideways by the same 8px. */
 assert.match(down, /\.scan-shade\{padding:4px;height:100dvh\}/);
 assert.match(down, /\.scan-modal\{width:100%;max-height:100dvh;border-radius:0\}/);
 assert.doesNotMatch(down, /\.scan-modal\{width:100vw;max-height:100vh/);
});

test("the Down Sheet's bands are read in the order the shop chose, and the ORDER control is gone", async () => {
 const { normalizeDownSheetSectionOrder, orderDownSheetGroups, DOWN_SHEET_GROUPS } = await import("../src/lib/down-sheet/down-sheet-view.ts");
 const { readDownSheetSettings } = await import("../src/lib/down-sheet/down-sheet-settings-store.ts");
 const groups = DOWN_SHEET_GROUPS.map(group => ({ key: group.key }));

 // Absent means the default order, so no device changes on upgrade.
 assert.deepEqual(readDownSheetSettings(null).sectionOrder, DOWN_SHEET_GROUPS.map(g => g.key));
 assert.deepEqual(normalizeDownSheetSectionOrder(null), DOWN_SHEET_GROUPS.map(g => g.key));

 // A chosen order is honoured.
 const chosen = ["inspection", "unscheduled", "scheduled", "off-property"];
 assert.deepEqual(orderDownSheetGroups(groups, chosen).map(g => g.key), chosen);
 assert.deepEqual(readDownSheetSettings(JSON.stringify({ sectionOrder: chosen })).sectionOrder, chosen);

 // A partial or dirty saved order still names every band: anything it does not
 // mention keeps its default position at the end, so a band added later appears
 // rather than silently vanishing off a board that renders by this list.
 assert.deepEqual(normalizeDownSheetSectionOrder(["inspection"]), ["inspection", "off-property", "scheduled", "unscheduled"]);
 assert.deepEqual(normalizeDownSheetSectionOrder(["inspection", "inspection", "nonsense", 7]), ["inspection", "off-property", "scheduled", "unscheduled"]);
 assert.deepEqual(normalizeDownSheetSectionOrder("not an array"), DOWN_SHEET_GROUPS.map(g => g.key));
});

test("a numbered sheet says which lines the photo never returned",async()=>{
 const {scannedLineGaps,describeLineGaps}=await import("../src/lib/down-sheet/down-sheet-scan-import.ts");
 const row=(line,bus)=>({pageNumber:line<=28?1:2,lineNumber:String(line).padStart(2,"0"),busNumber:bus,reason:"",assignedTo:"",category:"",repair:"",section:"",shift:"1st",operationalStatus:"out",confidence:1,reviewNote:""});

 /* The 09/5 4:24pm sheet. Two buses vanished from the scan without a word —
    line 23 (18501, high oil usage) and line 30 (20504, IDOT-ABS light) — and
    a bus that is down and not on the sheet is a bus that goes back out broken.
    The sheet numbers its rows, so a dropped one can be named exactly. */
 const scanned=[];
 for(let line=1;line<=36;line++){if(line===23||line===30)continue;scanned.push(row(line,"175"+String(line).padStart(2,"0")))}
 assert.deepEqual(scannedLineGaps(scanned),[23,30]);
 assert.equal(describeLineGaps([23,30]),"23, 30");

 // Runs collapse, because "37-41" is readable and five numbers are not.
 assert.equal(describeLineGaps([23,30,37,38,39,40,41]),"23, 30, 37\u201341");
 assert.equal(describeLineGaps([]),"");

 // A multi-bus line (PM'S, NO AC) is one line number over several rows.
 assert.deepEqual(scannedLineGaps([row(1,"17510"),row(2,"17520"),row(2,"17500")]),[]);
 // Nothing read at all is not "every line missing" — there is nothing to say.
 assert.deepEqual(scannedLineGaps([]),[]);
 // Counting stops at the highest line actually read: nobody knows how far down
 // a part-filled sheet went, so absent trailing lines are not reported.
 assert.deepEqual(scannedLineGaps([row(1,"17510"),row(3,"17530")]),[2]);

 const scanner=await readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx",import.meta.url),"utf8");
 assert.match(scanner,/LINES NOT READ: \{describeLineGaps\(lineGaps\)\}/);
 const css=await readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8");
 assert.match(css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,""),/\.scan-line-gaps\{/);
});

test("a scanned row the model had to guess at is flagged even when its bus number resolves",async()=>{
 const scanner=await readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx",import.meta.url),"utf8");
 /* The flag used to mean one thing only: this bus number matches no bus in the
    fleet. But a misread digit usually lands on ANOTHER REAL BUS — 17565 came
    back as 17563, which exists — so the row resolved cleanly and looked as
    certain as a printed line. Every row the 09/5 scan got wrong was pencilled
    into the margin, and the model said so in a confidence nothing read. */
 assert.match(scanner,/const LOW_CONFIDENCE=0\.75;/);
 assert.match(scanner,/row\.fleetMatch!=="matched"\|\|row\.confidence<LOW_CONFIDENCE/);
 assert.match(scanner,/CHECK THIS ROW/);
 assert.match(scanner,/const unsure=row\.confidence<LOW_CONFIDENCE;/);

 const css=(await readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"))
  .replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,"");
 assert.match(css,/\.scan-row\.unsure\{/,"the doubt needs a colour outside a phone breakpoint");

 // The count in the header covers both doubts, not just the fleet one.
 const rows=[
  {fleetMatch:"matched",confidence:0.98},   // printed, resolves — quiet
  {fleetMatch:"matched",confidence:0.40},   // pencilled, resolves to a real bus — must still be flagged
  {fleetMatch:"unknown",confidence:0.99},   // clean read of a bus we do not have
 ];
 const LOW=0.75;
 assert.equal(rows.filter(r=>r.fleetMatch!=="matched"||r.confidence<LOW).length,2);
 // The old rule would have shown only one of them.
 assert.equal(rows.filter(r=>r.fleetMatch!=="matched").length,1);
});

test("the scan corrects what the camera misread, and never touches what it must not",async()=>{
 const {correctScannedText,knownMechanicNames}=await import("../src/lib/down-sheet/scan-spelling.ts");
 const {isMarginRow,reviewScannedRows}=await import("../src/lib/down-sheet/down-sheet-scan-import.ts");

 /* The shop's own mechanics, learned from entries the device already holds. A
    fixed word list turns TIROS into TIRES; only the shop's history turns CAROS
    back into CARLOS. */
 const names=knownMechanicNames([{assignedTo:"CARLOS"},{assignedTo:"MAUI/ GILBERT"},{assignedTo:"JEVELL"}]);
 assert.deepEqual(names.sort(),["carlos","gilbert","jevell","maui"]);
 // A bay number is not a person.
 assert.deepEqual(knownMechanicNames([{assignedTo:"BAY 12"},{assignedTo:"EJ"}]),[]);

 assert.equal(correctScannedText("FRONT TIROS/COOLANT LEAK",names),"FRONT TIRES/COOLANT LEAK");
 assert.equal(correctScannedText("CAROS",names),"CARLOS");
 // A swapped pair is the commonest handwriting error and scores 2 under plain
 // Levenshtein, which would put it out of reach for a five-letter word.
 assert.equal(correctScannedText("RAMP CHIAN BROKEN",names),"RAMP CHAIN BROKEN");
 assert.equal(correctScannedText("Not Building Air Presure",names),"Not Building Air Pressure");
 // Casing is preserved rather than prettified.
 assert.equal(correctScannedText("tiros",names),"tires");

 /* The things it must never touch. A spell-corrector loose on a maintenance
    sheet is how a real part number becomes a plausible wrong one. */
 for(const safe of ["A21","A3","B18","17565","15502","HAZMAT BAY 12","BRAKES Grinding HARD TO STOP.","B12 / STEERING SHAKES AT 35 MPH"])
  assert.equal(correctScannedText(safe,names),safe,safe+" must be left exactly as written");
 // Nothing with a digit in it, ever — that is where bus and part numbers live.
 assert.equal(correctScannedText("R/C 17565 TOWED",names),"R/C 17565 TOWED");
 // A word already correct is never "improved".
 assert.equal(correctScannedText("BRAKES",names),"BRAKES");

 /* Two candidates means the guess is a coin toss, so nothing is changed. This
    is the rule that stops a confident wrong correction, which is worse than no
    correction at all: "tirs" sits one edit from both "tire" and "tires". */
 assert.equal(correctScannedText("TIRS",names),"TIRS");
 assert.equal(correctScannedText("HOSS",names),"HOSS");

 /* A row written by hand outside the table has no printed line number — and is
    the kind that comes back wrong: FRONT TIROS, CAROS, and a 17565 read as
    17563, which is a real bus too, so it resolved and looked certain. */
 assert.equal(isMarginRow({lineNumber:"margin"}),true);
 assert.equal(isMarginRow({lineNumber:""}),true);
 assert.equal(isMarginRow({lineNumber:"23"}),false);

 const row=(lineNumber,busNumber,reason,confidence)=>({pageNumber:1,lineNumber,busNumber,reason,assignedTo:"",category:"",repair:"",section:"",shift:"1st",operationalStatus:"out",confidence,reviewNote:""});
 const reviewed=reviewScannedRows([
  row("23","17510","BRAKES",0.99),
  row("margin","17565","FRONT TIROS",0.95),
 ],[{id:"a",n:"17510"},{id:"b",n:"17565"}],names);
 // A margin row is capped under the review threshold whatever the model claimed.
 assert.equal(reviewed[0].confidence,0.99,"a printed row keeps its own confidence");
 assert.ok(reviewed[1].confidence<=0.6,"a margin row is always one to check");
 assert.equal(reviewed[1].reason,"FRONT TIRES","the correction reaches the reviewer");

 /* My own previous prompt change stressed "every printed line number", which the
    margin rows do not have — so the instruction has to name them just as loudly. */
 const route=await readFile(new URL("../app/api/down-sheet-scan/route.ts",import.meta.url),"utf8");
 assert.match(route,/EVERY bus number written anywhere on the sheet MUST produce a row/);
 assert.match(route,/lineNumber set to "margin"/);
 assert.match(route,/a bus written in the margin and not read reaches nobody/);
});

test("the tablet band does not scroll sideways: the nav wraps, and a map rule stops leaking",async()=>{
 const [down,globals]=await Promise.all([
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
 ]);

 /* Two separate faults put an iPad-width page into sideways scroll.

    The Down Sheet's nav is six links pinned at 108px, so with its gaps it is
    703px, and above 760px it shares the header's one flex line with the title
    and REFRESH. Between there and 1024 the three do not fit: REFRESH was
    measured 194px past the right edge at 820px and the whole page scrolled,
    not just the header. The header wraps in that band and the nav takes a row
    of its own. */
 assert.match(down,/@media\(min-width:761px\) and \(max-width:1023px\)\{[\s\S]{0,400}?\.down-header\{flex-wrap:wrap\}/,"the header has to wrap in the tablet band");
 assert.match(down,/@media\(min-width:761px\) and \(max-width:1023px\)\{[\s\S]{0,400}?\.down-header nav\{order:3;flex:1 0 100%/,"and the nav takes its own row rather than squeezing the title and REFRESH");

 /* The second was a global rule leaking. Inside the map's @media(max-width:800px)
    block, `.quick-filter-control,.quick-filter-trigger` were written bare — but
    that control is shared with the Defect Log, so its trigger was forced to
    width:100%, grew to 722px inside a no-wrap row and pushed that page 531px
    sideways at 761-800px. Scoped to the command bar, it cannot reach another
    page again. */
 assert.doesNotMatch(globals,/\.command-highlights>\*,\.quick-filter-control,\.quick-filter-trigger\{width:100%\}/,"the bare selectors reached every page that uses the quick filter");
 assert.match(globals,/\.command-highlights>\*,\.command-bar \.quick-filter-trigger\{width:100%\}/,"scoped to the map's own command bar");
});

test("a bus only leaves the DOWN count when the sheet says it still runs",async()=>{
 const {downSheetAvailability,downSheetMentionsIdot,downSheetIdotOnly}=await import("../src/lib/down-sheet/down-sheet-availability.ts");
 /* Rows lifted from a real master export, reconciled against the paper sheet it
    was scanned from. The app said 47 DOWN where the foreman counted 39. */
 const row=(busNumber,repair,customReason,items=[])=>({busId:busNumber,busNumber,category:"",repair,customReason,
  repairItems:items.map(([category,itemRepair,details])=>({category,repair:itemRepair,details}))});

 /* THE PERMISSIONS. Somebody wrote that the bus still runs, so it is soft. */
 assert.equal(downSheetAvailability(row("17559","Other brake repair","Short Run Only (Needs Frt. & Rear Brake Job ASAP )")),"soft");
 assert.equal(downSheetAvailability(row("17527","Manual entry","HOLD FOR SOUTH HOLLAND, THEY ARE COMING WEDS 7AM TO REPAIR")),"soft");

 /* SILENCE IS DOWN, and this is the case Curtis named to settle it: "if it says
    HIGH OIL CONSUMPTION with nothing else, then that is where the ambiguity
    comes in and I would not expect the app to make that distinction... So if
    it's on downsheet without any additional notes like hold or can use, then
    add it to downed count." */
 assert.equal(downSheetAvailability(row("99999","Other repair","HIGH OIL CONSUMPTION")),"down",
  "no permission written means the bus is down");

 /* THE THREE ROWS AN EARLIER, CLEVERER RULE GOT WRONG. It read "high oil" as a
    limitation and let these stay available: a bus with a BURNING SMELL, one
    with a FLAT TIRE AND A FAILED BRAKE TEST, and one whose front brakes are
    written up. The words do not separate short-run from undriveable. */
 assert.equal(downSheetAvailability(row("17517","Check transmission light","Trans Light / Bushing Smell / High Oil Usage")),"down");
 assert.equal(downSheetAvailability(row("17545","Brake inspection","Won't Pass Brake Test / Rear Brakes / Flat Tire / High Oil Usage")),"down");
 assert.equal(downSheetAvailability(row("17506","Other brake repair","PM Defects - Frt.Brakes / High Oil Consumption")),"down");

 /* A REFUSAL BEATS A PERMISSION, and both of these carry the word HOLD. Only
    one of them means the bus can turn a wheel. */
 assert.equal(downSheetAvailability(row("18501","Rear main seal","High Oil Usage Hold until Repaired (Rear Main Seal )")),"down",
  "hold UNTIL REPAIRED is the opposite of a permission");
 assert.equal(downSheetAvailability(row("15511","A-21","A21",[["Bodywork","Accident damage","Accident Hold for Saftey"]])),"down",
  "an accident hold is a hold away from service, whatever words it shares with one that is not");

 /* THE STATE INSPECTION IS NOT A REPAIR. A row that is only IDOT prep leaves
    the count entirely; a row that is IDOT AND a fault is still a down bus, and
    still shows in the section that keeps an eye on them. */
 assert.equal(downSheetAvailability(row("17563","Manual entry","PREP FOR IDOT",[["Miscellaneous","Manual entry","17558 17563 PREP FOR IDOT"]])),"idot");
 const idotAndFault=row("17558","Other brake repair","PM DEFECTS-REAR BRAKES / PREP FOR IDOT");
 assert.equal(downSheetAvailability(idotAndFault),"down");
 assert.equal(downSheetMentionsIdot(idotAndFault),true,"but it is still one to watch");
 assert.equal(downSheetIdotOnly(idotAndFault),false);
 /* The bus numbers on a multi-bus IDOT line are its subjects, not a complaint. */
 assert.equal(downSheetIdotOnly(row("17515","Manual entry","17542 17522 17515-PREP FOR IDOT")),true);

 /* Scheduled maintenance is answered one file over and still answers first. */
 assert.equal(downSheetAvailability(row("17502","C-24","C24",[["Inspection","C-24","C24"]])),"inspection");
});

test("DOWN BUSES counts the sheet minus its maintenance, and PM wording is maintenance",async()=>{
 const {downSheetMentionsDefect,downSheetGroup}=await import("../src/lib/down-sheet/down-sheet-view.ts");
 const row=(repair,customReason,section="Pending")=>({busId:"b",category:"",repair,customReason,section});

 /* THE CATALOG'S OWN NAME DEFEATED THE CATALOG'S OWN RULE, found on bus 17534
    in a real export: every three-piece refill on the sheet counted as a DOWN
    bus. The row says TRANS/HUB/DIFF, which the maintenance pattern matches, and
    carries the catalog's name for that same service, which it does not -- the
    words run in a different order and bring "Refill" and "Three-Piece" with
    them. The name survived the strip and read as a complaint.

    Wording the app filed UNDER Inspection is scheduled maintenance whatever it
    says, so it comes out before the pattern is asked anything. */
 const refill={busId:"b",busNumber:"17534",category:"Inspection",repair:"Hub / Trans / Diff Refill (Three-Piece)",
  customReason:"TRANS/HUB/DIFF",repairItems:[{category:"Inspection",repair:"Hub / Trans / Diff Refill (Three-Piece)",details:"TRANS/HUB/DIFF"}]};
 assert.equal(downSheetMentionsDefect(refill),false,"a three-piece refill is maintenance, not a down bus");

 /* AND ONLY THE WORDING FILED AS AN INSPECTION COMES OUT. 17534's neighbour on
    the same sheet, 15511, is an A-21 carrying a BODYWORK card that reads
    "Accident Hold for Saftey". The A-21 goes, the accident stays, the bus stays
    down -- which is more than its one-word paper line says. Curtis: "Keep 15511
    down if it says accident."

    This is the assertion that bites: strip by category without checking WHICH
    category and an accident-damaged bus quietly leaves the down count. */
 const a21={busId:"b",busNumber:"15511",category:"Inspection",repair:"A-21",customReason:"A21",
  repairItems:[{category:"Bodywork",repair:"Accident damage",details:"Accident Hold for Saftey"}]};
 assert.equal(downSheetMentionsDefect(a21),true,"an accident card keeps the bus down");
 /* A plain inspection with no second card is still maintenance. */
 assert.equal(downSheetMentionsDefect({busId:"b",busNumber:"17502",category:"Inspection",repair:"C-24",
  customReason:"C24",repairItems:[{category:"Inspection",repair:"C-24",details:"C24"}]}),false);

 /* The PM half of the maintenance wording was missing, and the omission was
    invisible because `pm's` itself matched: the catalog words written beside it
    did not, so "Other preventive maintenance - PM'S" had `pm's` struck out and
    "other preventive maintenance" left standing, which reads as a complaint.
    Every one of the eight Preventive Maintenance catalog items behaved that
    way — a PM bus counted as a bus down, and sat in UNSCHEDULED rather than
    under INSPECTIONS & SCHEDULED MAINTENANCE. */
 for(const repair of ["Add engine oil","Oil and filter service","Lubrication","Bike rack - arms / pivot adjustment","Fluid service","Scheduled campaign","Seasonal preparation","Other preventive maintenance"]){
  assert.equal(downSheetMentionsDefect(row(repair,"PM'S","Inspection")),false,repair+" with PM'S beside it is scheduled maintenance, not a bus down");
  assert.equal(downSheetGroup(row(repair,"PM'S","Inspection")),"inspection",repair+" belongs under INSPECTIONS & SCHEDULED MAINTENANCE");
 }
 for(const repair of ["B-18","B-12","A-3","A-21"])
  assert.equal(downSheetMentionsDefect(row(repair,repair,"Inspection")),false,"an inspection code on its own is not a bus down");

 /* The whole risk of widening that wording is that it starts swallowing
    complaints. A fault written ALONGSIDE the maintenance still has to survive
    the strip — this is the half that must never regress. */
 for(const [repair,reason] of [
  ["Other preventive maintenance","PM DEFECTS - Trans Leak"],
  ["Other preventive maintenance","PM'S / BRAKES GRINDING"],
  ["Misfire","MISFIRES / PM'S"],
  ["Fluid service","FLUID LEAK"],
  ["Lubrication","LUBE + AIR LEAK"],
  ["Add engine oil","OIL LEAK REAR MAIN"],
  ["Other repair","BIKE RACK BENT"],
  ["B-18","B-18 FAILED - BRAKES"],
 ]) assert.equal(downSheetMentionsDefect(row(repair,reason)),true,"a fault written beside maintenance is still a bus down: "+reason);

 /* Curtis: "inspections are their own thing. Don't mix with unscheduled work.
    Just keep inspections in their own count. Regardless if someone is assigned
    to the bus or not."

    The scheduled/unscheduled split is decided by whether a name is written in
    the mechanic column, and that question must never be reached for an
    inspection — so this is asserted with and without an assignee rather than
    left to the order the checks happen to run in. A fault written beside the
    maintenance is a different matter: that bus is down, and it leaves. */
 for(const [repair,reason] of [["B-18","B-18"],["A-3","A-3"],["Other preventive maintenance","PM'S"],["Oil and filter service",""]]){
  assert.equal(downSheetGroup(row(repair,reason,"Inspection")),"inspection",repair+" with nobody assigned belongs in its own count");
  assert.equal(downSheetGroup({...row(repair,reason,"Inspection"),assignedTo:"ARMON"}),"inspection",repair+" stays in its own count when a mechanic is on it");
 }
 assert.equal(downSheetGroup({...row("Other preventive maintenance","PM'S / BRAKES GRINDING","Inspection"),assignedTo:"ARMON"}),"scheduled","a fault written beside the PM is a bus down, and leaves the inspection count");

 // The tile, beside the total rather than under it, and the count behind it.
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 /* DOWN BUSES SPLIT IN TWO, and the old single number is now the sum. It asked
    the same question of the whole sheet that DOWNED BUSES ON ROAD asks of the
    road, and it still does — it is just reported as the hard count, the soft
    count and the total, because one number was answering two questions and a
    foreman needs to know which of his down buses can still turn a wheel.

    THE CONSERVATION LAW IS THE ASSERTION, not the spelling. Every row the old
    count counted lands in exactly one of the three new buckets, so no bus can
    go missing off this page by being reclassified — which is the failure that
    would actually hurt: a bus nobody is counting is a bus nobody fixes. */
 assert.match(page,/const hardDownCount=useMemo\(\(\)=>shown\.filter\(entry=>downSheetAvailability\(entry\)==="down"\)\.length,\[shown\]\)/);
 /* SOFT DOWN is the soft buses NOBODY HAS PUT ON A RUN. A bus the yard has
    decided to use is not part of the morning's shortage — that is what the
    switch is for, and the number has to follow the decision. */
 assert.match(page,/const softDownCount=useMemo\(\(\)=>shown\.filter\(entry=>isSoftDownEntry\(entry\)&&!isEntryInService\(entry\)\)\.length,\[shown\]\)/);
 {
  const {downSheetAvailability}=await import("../src/lib/down-sheet/down-sheet-availability.ts");
  const sheet=[
   row("Misfire","ENGINE LIGHT-MISFIRES"),
   row("Rear main seal","High Oil Usage Hold until Repaired (Rear Main Seal )"),
   row("Manual entry","HOLD FOR SOUTH HOLLAND, THEY ARE COMING WEDS 7AM TO REPAIR"),
   row("Other brake repair","Short Run Only (Needs Frt. & Rear Brake Job ASAP )"),
   row("Manual entry","PREP FOR IDOT"),
   row("A-6","A6"),
  ];
  const oldCount=sheet.filter(downSheetMentionsDefect).length;
  const hard=sheet.filter(e=>downSheetAvailability(e)==="down").length;
  const soft=sheet.filter(e=>downSheetAvailability(e)==="soft").length;
  const idot=sheet.filter(e=>downSheetAvailability(e)==="idot").length;
  assert.equal(hard+soft+idot,oldCount,"every bus the old number counted is still counted somewhere");
  assert.deepEqual([hard,soft,idot],[2,2,1],"and they land where the sheet's own words put them");
 }
 assert.match(page,/<div className="group-count total">[\s\S]{0,400}?<div className="group-count down-buses"><strong>\{hardDownCount\}<\/strong><span>DOWN BUSES<\/span><\/div>/,"DOWN BUSES sits immediately after TOTAL ON SHEET");
 /* And the three pullout numbers run in the order Curtis asked for: the hard
    count, the soft count, then the two added up. "Should be right under the
    total down buses, and then it should just give a total of both of those
    numbers together. But it should be easily distinguished from one another." */
 assert.match(page,/group-count down-buses[\s\S]{0,600}?group-count soft-down[\s\S]{0,600}?group-count down-total/,
  "DOWN, then SOFT DOWN, then the two added together");
 /* SOFT, IN USE sits between them, and only when there is one — it is the
    answer to "why is SOFT DOWN smaller than the board says", which is a
    question nobody has on a morning when nothing has been switched on. */
 assert.match(page,/\{inServiceCount>0&&<div className="group-count in-service">/);
 /* SOFT also rides beside the lead number, so the press that opens these tiles
    is not needed to learn that some of those buses can still work. */
 assert.match(page,/down-counts-soft.{0,120}?\{softDownCount\}/s);

 /* The total used to take a whole row by itself on a phone. It is one of a pair
    now, so it takes half like every other tile. */
 const css=await readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8");
 assert.doesNotMatch(css,/\.down-group-counts \.group-count\.total\{grid-column:1\/-1\}/,"the total must not span the whole row any more");
 assert.match(css,/\.down-group-counts\{margin:0 14px 9px;display:grid;grid-template-columns:repeat\(6,/,"six tiles across the first row");
});

test("every Down Sheet row carries its own DELETE and MARK FIXED, at the end of the row and behind a confirm",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
 ]);

 /* In the bus's own cell, which is the one column a phone never has to scroll
    sideways to reach. A tenth column at the far right would be the control you
    go looking for, and this is the one pressed by somebody holding a sheet. */
 /* THEY MOVED OUT OF THE BUS'S CELL, and that is a deliberate reversal of
    where they started. Keeping them there meant a phone never had to scroll
    sideways to reach them — but it put a one-press close-out directly under
    the thumb that scrolls the sheet, and Curtis closed out a bus he did not
    mean to. It also held the bus column at 288px, which pushed REASON DOWN,
    the thing the sheet is read for, off the side of the screen.

    They are the last cell of the row now: a deliberate scroll to reach, and
    both ask before they act. */
 assert.match(page,/<td className="row-actions"><span className="row-actions-slots">/);
 assert.doesNotMatch(page,/<td className="fleet-number">[\s\S]{0,1400}?className="delete-entry"/,"the bus cell must not carry the buttons any more");
 assert.match(page,/<th className="row-actions-head">ACTIONS<\/th><\/tr><\/thead>/,"and the column is the last one, with a header of its own");
 assert.match(page,/colSpan=\{10\}/,"the divider and empty rows span the new column");
 assert.doesNotMatch(page,/colSpan=\{9\}/);
 /* The bus cell stacks instead: number, then the badge under it. */
 assert.match(page,/<\/button>\{\/\* UNDER the number rather than beside it/);
 assert.match(css,/\.fleet-number-slots\{display:flex;min-width:0;flex-direction:column/);
 assert.match(css,/\.down-table th:nth-child\(2\)\{width:124px\}/,"288px was the cost of putting four things on one line");
 assert.match(page,/entry\.workflow!=="Completed"&&<button className="fix-entry"/,"and it is not offered on a row that is already closed out");
 assert.match(page,/aria-label=\{"Delete bus "\+\(entry\.busNumber\|\|"entry"\)\+" from the Down Sheet"\}/,"and it has to say which bus it would delete");

 // Asked before it happens, and the confirm says what survives it.
 assert.match(page,/const deleteEntry=\(entry:DownEntry\)=>\{[\s\S]{0,600}?if\(!confirm\(/);
 /* AND SO DOES MARK FIXED NOW. It closed out on one press, on the reasoning
    that a dialog every time is what stops people using a button — which held
    while it sat under a thumb in the bus's own cell, and is exactly how a bus
    got closed out by accident. Marking fixed is a claim about the work: it
    completes the defect, recomputes the status and teaches the findings. */
 assert.match(page,/const markEntryFixed=\(entry:DownEntry\)=>\{[\s\S]{0,900}?if\(!confirm\("Mark bus "/);
 assert.match(page,/The repair is marked done and the bus's defect is completed\. UNDO puts it back\./);
 assert.match(page,/The bus keeps its defects, status and location/,"deleting a row is not a claim that anything was repaired");

 /* The way back is on the page, not behind MORE: an accidental delete is
    exactly when nobody opens a menu to look for it. */
 assert.match(page,/rowAction&&<p className=\{"down-deleted-note"[\s\S]{0,600}?onClick=\{undoDeleteEntry\}/);
 assert.doesNotMatch(page,/<summary>MORE<\/summary>[\s\S]{0,600}?undoDeleteEntry/,"PUT BACK must not be the thing hidden behind a menu");

 /* 26px reads fine under a mouse and misses under a thumb. The sheet is used
    on phones, so the phone block has to give it a real target. */
 assert.match(css,/\.delete-entry\{[^}]*width:26px/);
 assert.match(css,/\.fix-entry\{[^}]*width:26px/,"MARK FIXED shares DELETE's shape so the pair reads as one group");
 assert.match(css,/\.row-actions-slots\{display:inline-grid;grid-template-columns:36px 36px/);
 /* This sheet's phone breakpoint is 760px, not the 620px globals.css uses for
    the map — matched on content rather than position, since the file has many. */
 const at=css.indexOf(".down-deleted-note button{width:100%");
 assert.ok(at>0,"the phone override for the PUT BACK button is gone");
 const phone=css.slice(at);
 assert.match(phone,/\.delete-entry,\.fix-entry\{width:44px;height:44px/,"the phone block must raise both row buttons to a 44px touch target");
});

test("the Down Sheet writes a removal down wherever one happens, and takes it back on an undo",async()=>{
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.match(page,/import \{forgetRemovedEntries,rememberRemovedEntries\} from "(?:[^"]*\/)cloud-sync"/);

 // CLEAR DOWNSHEET, and the whole sheet with it.
 assert.match(page,/const result=clearDownSheetState\(entries,fleet\);[\s\S]{0,600}?rememberRemovedEntries\(localStorage,entries\.map\(entry=>entry\.id\),new Date\(\)\.toISOString\(\)\)/);
 // A replacing scan: every bus the new sheet does not name.
 assert.match(page,/rememberRemovedEntries\(localStorage,removed\.map\(entry=>entry\.id\),now\)/);
 assert.match(page,/removed=scannedSheetRemovals\(entries,incomingIds\)/,"which is the list the replacement already computed");

 /* Both undos take the entries back off the ledger AND restamp them, because
    the server compares updated_at: an entry put back carrying its old stamp
    loses to the tombstone the removal sent and is deleted again on the next
    pull, silently. */
 assert.match(page,/const undoClear=\(\)=>\{[\s\S]{0,900}?forgetRemovedEntries\(localStorage,snapshot\.entries\.map\(entry=>entry\.id\)\)/);
 assert.match(page,/const undoClear=\(\)=>\{[\s\S]{0,1200}?held\.has\(entry\.id\)\?entry:\{\.\.\.entry,updatedAt:restoredAt\}/);
 assert.match(page,/const undoScan=\(\)=>\{[\s\S]{0,1400}?rememberRemovedEntries\(localStorage,entries\.filter\(entry=>!kept\.has\(entry\.id\)\)\.map\(entry=>entry\.id\),restoredAt\)/,"rows the scan itself created have to come off everywhere too");
 assert.match(page,/const undoScan=\(\)=>\{[\s\S]{0,1400}?forgetRemovedEntries\(localStorage,\[\.\.\.kept\]\)/);

 /* DELETE, one row at a time — the third door onto the same ledger, and the
    one a foreman uses daily. A row merely dropped from this device stays live
    on the server and comes back on the next pull. */
 assert.match(page,/const deleteEntry=\(entry:DownEntry\)=>\{[\s\S]{0,1800}?rememberRemovedEntries\(localStorage,\[entry\.id\],now\)/,"a deleted row has to be written to the removal ledger or it will not travel");
 /* Sliced rather than matched within a character window: this handler routes
    two kinds of undo now, and a window wide enough to clear the routing is wide
    enough to match the wrong function. */
 const undoDelete=page.slice(page.indexOf("const undoDeleteEntry="));
 assert.match(undoDelete,/forgetRemovedEntries\(localStorage,\[entry\.id\]\)/);
 assert.match(undoDelete,/\{\.\.\.entry,updatedAt:restoredAt\}/,"and be restamped, or it loses to its own tombstone on the next pull");
 /* The undo copy is written before the row goes, and the delete gives up if it
    cannot be: a removal with no way back is the door this app does not build. */
 assert.match(page,/const deleteEntry=\(entry:DownEntry\)=>\{[\s\S]{0,900}?if\(!writeSetting\(localStorage,ENTRY_UNDO_KEY,[\s\S]{0,400}?return;/);

 /* MARK FIXED is one press and writes no tombstone: nothing was removed, the
    row only stopped being active. It goes through saveEntry so a quick close-out
    takes the same path the editor takes. */
 const fix=page.slice(page.indexOf("const markEntryFixed="),page.indexOf("const undoFixEntry="));
 assert.match(fix,/workflow:"Completed",completedAt:now/,"a closed-out row is stamped when it was closed");
 assert.match(fix,/saveEntry\(normalizeEntry\(/,"one press must not mean a different kind of save");
 assert.ok(!fix.includes("rememberRemovedEntries"),"marking fixed removes nothing, so it must not write a tombstone");
 assert.match(fix,/if\(!writeSetting\(localStorage,ENTRY_UNDO_KEY,[\s\S]{0,600}?return;/,"and the way back is written before the change, because there is no confirm");

 /* The undo restores the BUS, not just the entry, and this is the whole reason
    it is not simply "save the old entry again".

    Completing an entry completes the bus's defect, and a completed defect is
    resolved — so it is no longer adoptable, the re-saved entry cannot find it,
    and it mints a SECOND record for the same fault while leaving the first
    closed. Measured before this was fixed: one press and one undo left the bus
    carrying d-1 completed and a fresh open duplicate beside it. Two records for
    one fault is the thing this app must never do. */
 const unfix=page.slice(page.indexOf("const undoFixEntry="),page.indexOf("const undoDeleteEntry="));
 assert.match(unfix,/bus\?:\{id:string;s:FleetStatus;defects:StructuredDefect\[\];pendingRepair:string\}/,"the fields the completion changed have to be carried in the copy");
 assert.match(unfix,/fleet\.map\(item=>item\.id===bus\.id\?\{\.\.\.item,s:bus\.s,defects:bus\.defects,pendingRepair:bus\.pendingRepair\}:item\)/,"and put back as they were rather than re-derived from the entry");
 assert.ok(!unfix.includes("saveEntry("),"re-saving the entry is exactly what duplicated the defect");
 assert.match(fix,/const bus=fleet\.find\(item=>item\.id===entry\.busId\)/,"the snapshot is taken before the change, not after");

 /* And the tombstone goes only AFTER a write that succeeded. The other order
    reads the same until the device is full, and then it tells the shop cloud to
    drop a row this device still holds — deleted everywhere except where it was
    pressed. Nothing on screen would show that, so it is pinned here. */
 const del=page.slice(page.indexOf("const deleteEntry="),page.indexOf("const markEntryFixed="));
 assert.ok(del.indexOf("writeDownSheetStorageResult")<del.indexOf("rememberRemovedEntries"),"the sheet has to be written before the removal is recorded");
 assert.match(del,/if\(!written\.ok\)\{[\s\S]{0,300}?return;/,"and a refused write has to stop the delete outright");
 const undo=page.slice(page.indexOf("const undoDeleteEntry="));
 assert.ok(undo.indexOf("writeDownSheetStorageResult")<undo.indexOf("forgetRemovedEntries"),"and putting one back writes the sheet before clearing its tombstone");

 /* The AI Operator clears the sheet too, from the map. It is the same operation
    through a different door, so it writes the same ledger — a clear that reaches
    only this device is not a clear. */
 const map=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 assert.match(map,/import \{forgetRemovedEntries,readMergedAway,rememberRemovedEntries,writeMergedAway\} from "(?:[^"]*\/)?cloud-sync"/);
 assert.match(map,/plan\.kind==="clearDownSheet"[\s\S]{0,1400}?rememberRemovedEntries\(localStorage,\(entries as \{id:string\}\[\]\)\.map\(entry=>entry\.id\),new Date\(\)\.toISOString\(\)\)/);
 assert.match(map,/plan\.kind==="undoDownSheetClear"[\s\S]{0,1400}?forgetRemovedEntries\(localStorage,snapshot\.entries\.map\(entry=>entry\.id\)\)/);
});

test("the swap ledger keys on the fleet number, because bus ids are one device's own",async()=>{
 const {snapshotFromEntries,ledgerTempo,mergeSheetLedgers,normalizeSheetLedger}=await import("../src/lib/down-sheet/sheet-ledger.ts");

 /* MEASURED, NOT REASONED ABOUT. The ledger keyed rows on the Down Sheet
    entry's `busId` for two releases, and that was wrong the moment it started
    travelling. `section-transfer.ts` says why in its own words - "two devices
    set up separately give the same bus different ids" - and it re-points every
    arriving ENTRY by fleet number for exactly that reason. The ledger rode in
    the same payload and nothing re-pointed it.

    Curtis: "I will be scanning from multiple devices, period." So this is not a
    corner: it is the normal case. */
 const entry=(busId,busNumber,category)=>({id:"e"+busId,busId,busNumber,category,workflow:"Scheduled"});
 const ipad =snapshotFromEntries([entry("bus-a1","17510","Engine"),entry("bus-a2","17520","Brakes")],[],"2026-09-14T11:00:00.000Z",undefined,"swap-ipad");
 const phone=snapshotFromEntries([entry("bus-p1","17510","Engine"),entry("bus-p2","17520","Brakes")],[],"2026-09-14T19:00:00.000Z",undefined,"swap-phone");
 assert.deepEqual(ipad.rows.map(row=>row.b),["17510","17520"],"the stored key is the number on the bus");

 const [tempo]=ledgerTempo(mergeSheetLedgers([ipad],[phone]));
 assert.equal(tempo.stuck,2,"the same two buses, still down, read as stuck across two devices");
 assert.equal(tempo.added,0,"and not as two brand-new arrivals - which is what the bus-id key reported");
 assert.equal(tempo.cleared,0);

 /* A record thin enough to have lost its number still counts as a bus on the
    sheet rather than vanishing out of the tempo. */
 const thin=snapshotFromEntries([{id:"x",busId:"bus-z",category:"Engine",workflow:"Scheduled"}],[],"2026-09-14T11:00:00.000Z");
 assert.deepEqual(thin.rows.map(row=>row.b),["bus-z"]);

 /* THE GAP FLAG. A backfilled pair can span days with an unknown number of
    swaps inside it; the arithmetic between two snapshots is only a SWAP's worth
    of arithmetic when exactly one swap happened between them. `sinceHours` was
    always the escape hatch and this is the missing input to it. */
 const a={id:"a",at:"2026-08-29T21:52:00.000Z",shift:"3rd",rows:[{b:"17510",c:"Engine"}],off:[]};
 const b={id:"b",at:"2026-09-07T19:43:00.000Z",shift:"2nd",rows:[{b:"17520",c:"Brakes"}],off:["17510"],gap:true};
 const [across]=ledgerTempo([a,b]);
 assert.equal(across.sinceHours,null,"a pair that admits to a gap has no usable denominator");
 const [closed]=ledgerTempo([a,{...b,gap:undefined}]);
 assert.ok(closed.sinceHours>200,"and one that does not, still reports its hours");

 /* Set only when exactly true, and DELETED otherwise - the spelling setBusHold
    uses, so a hand-edited gap:"no" cannot spread through and read as truthy. */
 assert.equal("gap" in normalizeSheetLedger([{...a,gap:"no"}])[0],false);
 assert.equal(normalizeSheetLedger([{...a,gap:true}])[0].gap,true);
});

test("the backfill loads old sheets into the swap history and touches nothing else",async()=>{
 const {planBackfill,applyBackfill,BACKFILL_KIND}=await import("../src/lib/down-sheet/sheet-ledger-backfill.ts");
 const {SHEET_LEDGER_KEY}=await import("../src/lib/down-sheet/sheet-ledger.ts");
 const panel=await readFile(new URL("../app/settings/_components/sheet-backfill.tsx",import.meta.url),"utf8");
 const module_=await readFile(new URL("../src/lib/down-sheet/sheet-ledger-backfill.ts",import.meta.url),"utf8");

 const snap=(id,at,rows,extra={})=>({id,at,shift:"1st",rows:rows.map(b=>({b,c:"Engine"})),off:[],...extra});
 const file=JSON.stringify({kind:BACKFILL_KIND,version:1,snapshots:[
  snap("backfill-1","2026-08-26T20:03:00.000Z",["17510","17520"]),
  snap("backfill-2","2026-08-27T16:59:00.000Z",["17510"],{gap:true}),
 ]});

 const plan=planBackfill([],file);
 assert.equal(plan.ok,true);
 assert.equal(plan.fresh.length,2);
 assert.equal(plan.gaps,1,"the screen can say how many follow a stretch nobody recorded");

 /* LOADING THE SAME FILE TWICE IS A NO-OP. A swap is an event that happened
    once; the union is the history, deduped by id. */
 const again=planBackfill(plan.next,file);
 assert.equal(again.fresh.length,0);
 assert.equal(again.duplicates,2);

 /* THE CAP BITES AT IMPORT TIME AND HAS TO BE SAID FIRST. A backfill is by
    definition the oldest thing in the ledger, so a device already near the cap
    drops most of it the instant it merges - silently, unless this is counted
    and shown BEFORE the button. */
 const full=Array.from({length:3},(unused,index)=>snap("have-"+index,"2026-09-1"+index+"T12:00:00.000Z",["17999"]));
 const tight=planBackfill(full,file,3);
 assert.ok(tight.dropped>0,"it says how many will not fit");
 assert.equal(tight.next.length,3,"and the cap still holds");

 /* The wrong file is refused whole, never half-loaded. A master export and a
    Down Sheet transfer are both JSON with a `kind`. */
 assert.match(planBackfill([],'{"kind":"pace-south-fleet-board-backup","buses":[]}').problem,/not a sheet-ledger backfill/);
 assert.match(planBackfill([],"not json").problem,/not a file this can read/);
 assert.match(planBackfill([],JSON.stringify({kind:BACKFILL_KIND,snapshots:[]})).problem,/no readable swaps/);
 for(const refused of [planBackfill([],"not json"),planBackfill([],'{"kind":"x"}')])
  assert.equal(applyBackfill({setItem(){throw new Error("must not write")}},refused).ok,false);

 /* IT WRITES THE LEDGER AND NOTHING ELSE. A scanned sheet REPLACES the live
    one; these sheets are weeks old and the live one is today's. The only safe
    way to say that is a path with no access to the Down Sheet at all. */
 const written=[];
 applyBackfill({setItem(key){written.push(key)}},plan);
 assert.deepEqual(written,[SHEET_LEDGER_KEY]);
 /* Comments stripped first. The module's own prose names the key it must never
    touch, and matching that is how a test passes for the wrong reason - or in
    this case fails for one. */
 const moduleCode=module_.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 for(const banned of ["pace-down-sheet-v1","DOWN_SHEET_STORAGE_KEY","pace-board-v1","writeDownSheetStorage","writeFleetStorage"])
  assert.equal(moduleCode.includes(banned),false,"the backfill must not be able to reach: "+banned);
 const panelCode=panel.replace(/\/\*[\s\S]*?\*\//g,"");
 const writes=[...panelCode.matchAll(/setItem\(/g)].length;
 assert.equal(writes,0,"the panel writes through applyBackfill or not at all");

 /* Nothing lands before it has been read: the plan is computed, shown, and only
    then applied - and applyBackfill takes the PLAN rather than the text, so the
    thing written is provably the thing displayed. */
 assert.match(panelCode,/disabled=\{!plan\?\.ok\}/);
 assert.match(panelCode,/applyBackfill\(localStorage,plan\)/);
});

test("the Down Sheet uses the Defect Log's bus picker, and adds to a bus already on the sheet",async()=>{
 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 const picker=await readFile(new URL("../src/components/shared/bus-selector.tsx",import.meta.url),"utf8");
 const log=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 /* Every "this must be gone" check reads the CODE. The comments here explain
    what was removed and why, and a naive search matches the explanation — which
    has now caught me three separate times in this suite. */
 const strip=source=>source.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 const editorCode=strip(editor),logCode=strip(log);

 /* ONE PICKER, TWO SURFACES. The Down Sheet's bus control was a bare <select>
    with no way to type a fleet number at all. Copying the Defect Log's across
    would have made two of them to keep in step, and this project has paid for
    duplicated logic more than once — five copies of the location table, all
    five carrying the same bug, and two road-call records that had drifted. */
 assert.match(editor,/<BusSelector fleet=\{fleet\}/);
 assert.match(log,/<BusSelector /);
 assert.equal(/<select value=\{draft\.busId\}/.test(editorCode),false,"the bare select is gone");
 assert.equal(/function BusSelector/.test(logCode),false,"and the Defect Log no longer declares its own");
 assert.match(picker,/export default function BusSelector/);

 /* The whole FLEET, not availableFleet. Typing a number already on the sheet
    has to RESOLVE so the notice below can say so in words; a number that
    silently matches nothing reads as the app not knowing the bus. */
 assert.equal(/availableFleet/.test(editorCode),false,"the list no longer hides buses that already have an entry");

 /* SAID IN THE FORM, NOT AT SAVE TIME. It used to be an alert on SAVE that
    threw the whole draft away. Curtis: "once u type in bus number if it already
    has defects that put it on downsheet then we just add to it." */
 assert.match(editor,/const existingEntry=useMemo/);
 /* Checked as a CONDITIONAL RENDER, not as a string present in the file. A
    mutation that disabled the render with {false&&...} left every string
    assertion passing, which is a test describing the source rather than the
    behaviour. */
 assert.match(editorCode,/\{existingEntry&&<p className="repair-existing-entry">/,
  "the notice renders when the bus is already on the sheet");
 assert.match(editorCode,/is already on the sheet\./);
 assert.match(editorCode,/\{onOpenExisting&&<button type="button" onClick=\{\(\)=>onOpenExisting\(existingEntry\.id\)\}>ADD TO THAT ENTRY<\/button>\}/,
  "and the way through is wired to that entry");

 /* And "add to it" means exactly that: the existing entry opens with a fresh
    blank repair card on the end, so the new work is typed into the row that is
    already there rather than refused. */
 assert.match(page,/onOpenExisting=\{entryId=>/);
 assert.match(page,/\.\.\.normalizeRepairItems\(found\.repairItems[^)]*\),blankRepairItem\(\)\]/);

 /* autoFocus off here: this editor opens with the section and the workflow
    above the picker, and stealing focus moves the page under a thumb. */
 assert.match(editor,/autoFocus=\{false\}/);
 /* Two of these on one page would otherwise share a datalist id. */
 assert.match(editor,/listId="down-sheet-bus-numbers"/);
 assert.match(picker,/listId="bus-number-options"/,"and the default is its own");
});

test("ADD DOWN BUS opens with no bus chosen, so a save cannot land on a random one",async()=>{
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 const editor=await readFile(new URL("../app/down-sheet/_components/down-sheet-editor.tsx",import.meta.url),"utf8");

 /* It used to seed fleet.find(item=>!active.some(...)) - the first bus that
    happened to have no entry, chosen by array order and nothing else - into
    busId, busNumber and operationalStatus. So the form opened already pointed
    at a real bus, the "Select bus" option was never the state anybody saw, and
    filling in a repair and pressing SAVE without touching the bus field wrote
    a live entry against a bus picked at random. */
 assert.match(page,/setEditing\(\{id:"repair-"[^}]*?busId:"",busNumber:"",/,
  "the new-entry draft opens with no bus");
 assert.equal(/busId:bus\.id,busNumber:bus\.n,/.test(page),false,
  "and never seeds one from whichever bus sorted first");
 assert.equal(/operationalStatus:bus\.s,priority:"Routine",timeEstimate:normalizeRepairTimeEstimate\(undefined/.test(page),false,
  "nor that bus's tracker status");

 /* The availability check is worth keeping - telling somebody the sheet is
    full before they fill in a form is a kindness - it just must not hand its
    answer to the draft. */
 assert.match(page,/const available=fleet\.some\(item=>!active\.some\(entry=>entry\.busId===item\.id\)\);if\(!available\)/,
  "the capacity guard survives without seeding the form");

 /* And the guard that could never fire now can. */
 assert.match(editor,/if\(!bus\)\{alert\("Select a bus number\."\);return\}/);
 /* The editor fills the number and the tracker status from whichever bus is
    chosen, which is why opening empty loses nothing. */
 assert.match(editor,/busNumber:bus\?\.n\|\|"",operationalStatus:bus\?\.s\|\|current\.operationalStatus/);
});

test("a MYSTERY BUS card opens, because it already looked like it would",async()=>{
 const board=await readFile(new URL("../src/components/down-sheet/mystery-board.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");

 /* The card carried cursor:pointer, border:0 and text-align:left — every
    property you give a button — on a <div> that did nothing. Curtis: "I can't
    click on any of them to get any other details about them." A row that looks
    pressable and is not is worse than one that looks inert. */
 assert.match(board,/<button className="mystery-card-main" type="button" aria-expanded=\{open\} aria-controls=/,
  "the card main is a real button, not a div with a click handler");
 assert.equal(/<div className="mystery-card-main"/.test(board),false,"and the div it used to be is gone");
 assert.match(css,/\.mystery-card-main\{[^}]*cursor:pointer/,"the styling that made it look pressable is still there");

 /* height:auto looks redundant beside display:grid and is not: a bare <button>
    takes a height from the user agent, and this card has to grow with the panel
    it opens. Same class of trap as the bare header{height:38px} rule. */
 assert.match(css,/\.mystery-card-main\{width:100%;height:auto;/,"a button needs its UA height undone to grow with its panel");

 /* It expands IN PLACE. The person reading this board is walking the facility
    with a phone, working down a list of buses nobody can account for;
    navigating away costs them their place in it. */
 assert.match(board,/id=\{"mystery-detail-"\+bus\.id\} className="mystery-detail"|className="mystery-card-detail" id=\{"mystery-detail-"\+bus\.id\}/,
  "the panel is a sibling of the button, addressed by aria-controls");
 assert.equal(/router\.push|<a href=/.test(board),false,"opening a card must not navigate away from the list");

 /* One at a time: several open at once turns the board back into the wall of
    text the collapse exists to prevent. */
 assert.match(board,/setOpenBusId\(open\?"":bus\.id\)/,"opening one card closes the one before it");

 /* A mystery bus with NOTHING logged is the most interesting row on the board —
    on property with nothing at all explaining why — so that line is an answer,
    not an empty state. */
 assert.match(board,/Nothing is logged against this bus\./);
 assert.equal(/No defects found|None|n\/a/i.test(board.split("mystery-detail-none")[1]?.slice(0,120)||""),false,
  "and it is not worded as an error");

 /* defectLabel wants a whole defect; a record written by an older version can
    be missing any field, and a board that throws takes the Down Sheet with it —
    which is how a bus hover once blanked the Facility Map. */
 assert.match(board,/const whole=\{category:"",issue:"",details:"",operability:"unknown",state:"open",\.\.\.defect\}/,
  "a partial defect is filled in rather than trusted");
});

test("every bus on one printed line carries that line's wording, so a PM line is not seven down buses",async()=>{
 const {reviewScannedRows,mergeReviewedRows,fillPrintedLineSiblings,sectionForScannedRow}=await import("../src/lib/down-sheet/down-sheet-scan-import.ts");
 const {downSheetGroup}=await import("../src/lib/down-sheet/down-sheet-view.ts");

 const row=(over={})=>({pageNumber:2,lineNumber:"53",busNumber:"",reason:"",assignedTo:"",category:"",repair:"",section:"Pending",shift:"1st",operationalStatus:"out",confidence:.9,reviewNote:"",...over});
 const band=record=>downSheetGroup({...record,customReason:record.reason,assignmentType:"Mechanic"});
 const imported=(rows,fleet)=>mergeReviewedRows(reviewScannedRows(rows,fleet).map(item=>({...item,selected:true})));

 /* LINE 53, the shop's standing example: PM'S written once with seven bus
    numbers after it. The model splits it into seven rows correctly and then
    carries the words on the FIRST row only, stamping the rest with the band
    heading they sat under. Six buses arrived saying nothing under UNSCHEDULED
    and the page read them as six buses down with nobody assigned — the down
    count up by six and the inspection count down by six, off one line. */
 const buses=["17514","17556","17525","17530","17545","17549","17552"];
 const fleet=[...buses,"18501","18502","18503"].map(n=>({id:"b"+n,n}));
 const line53=buses.map((n,index)=>row({busNumber:n,reason:index===0?"PM'S":"",category:index===0?"Inspection":"",repair:index===0?"A-15":"",section:index===0?"Inspection":"Pending"}));
 const records=imported(line53,fleet);
 assert.equal(records.length,7);
 for(const record of records){
  assert.equal(record.reason,"PM'S","every bus on the line says what the line says");
  assert.equal(record.section,"Inspection");
  assert.equal(band(record),"inspection","not one of these is a down bus");
 }
 // And the reviewer is told, on the row, which line it was read from.
 const reviewed=reviewScannedRows(line53,fleet);
 assert.match(reviewed[3].reviewNote,/Read from line 53, shared with the other buses on it/);
 assert.equal(reviewed[0].reviewNote,"","the row that carried the wording is not annotated");

 /* A FAULT written once over two buses is still a fault on both. The rule is
    "share the line's wording", not "share the line's inspection-ness". */
 const brakes=imported([row({lineNumber:"21",busNumber:"18501",reason:"NO BRAKES"}),row({lineNumber:"21",busNumber:"18502"})],fleet);
 assert.deepEqual(brakes.map(record=>record.reason),["NO BRAKES","NO BRAKES"]);
 assert.deepEqual(brakes.map(band),["unscheduled","unscheduled"]);

 /* PM DEFECTS is the opposite of a PM: faults found while doing one. Both
    buses stay down, which the inspection pattern's lookahead already ensures
    and this pins so the sharing rule cannot quietly undo it. */
 const defects=imported([row({lineNumber:"22",busNumber:"18501",reason:"PM DEFECTS"}),row({lineNumber:"22",busNumber:"18502"})],fleet);
 assert.deepEqual(defects.map(band),["unscheduled","unscheduled"]);

 /* Only BLANK fields are filled. Two buses on one line that genuinely came
    back with different wording keep their own — this adds what was missing and
    never overwrites what was read. */
 const mixed=imported([row({lineNumber:"23",busNumber:"18501",reason:"PM'S"}),row({lineNumber:"23",busNumber:"18502",reason:"MISFIRES"})],fleet);
 assert.deepEqual(mixed.map(record=>record.reason),["PM'S","MISFIRES"]);
 assert.deepEqual(mixed.map(band),["inspection","unscheduled"]);

 /* A bus on the sheet twice — once for a PM, once for a fault — is a bus that
    is DOWN. The fold keeps both facts and the count picks the fault. */
 const both=imported([row({lineNumber:"24",busNumber:"18501",reason:"PM'S",section:"Inspection"}),row({lineNumber:"31",busNumber:"18501",reason:"MISFIRES"})],fleet);
 assert.equal(both.length,1);
 assert.equal(both[0].reason,"PM'S / MISFIRES","both facts survive on the row");
 assert.equal(band(both[0]),"unscheduled","and the counting picks the fault");

 /* Where the bus IS still outranks what the work is: a PM line at a vendor is
    off property, for the bus that inherited the vendor as well as the one it
    was written on. */
 const vendor=imported([row({lineNumber:"25",busNumber:"18501",reason:"PM'S",section:"Vendor Repair",assignedTo:"CUMMINS"}),row({lineNumber:"25",busNumber:"18502"})],fleet);
 assert.deepEqual(vendor.map(record=>record.assignedTo),["CUMMINS","CUMMINS"]);
 for(const record of vendor)assert.equal(downSheetGroup({...record,customReason:record.reason,assignmentType:"Mechanic"}),"off-property");

 /* MARGIN ROWS INHERIT NOTHING, and that is the whole safety of this. They
    carry no printed line number, so every pencilled row on a page would share
    one key and take its wording from whichever came back first — one bus's
    brake job spreading across unrelated handwritten rows. */
 const margins=fillPrintedLineSiblings([
  row({lineNumber:"margin",busNumber:"18501",reason:"BRAKES"}),
  row({lineNumber:"margin",busNumber:"18502"}),
  row({lineNumber:"",busNumber:"18503"}),
 ]);
 assert.deepEqual(margins.map(item=>item.reason),["BRAKES","",""]);
 assert.deepEqual(margins.map(item=>item.reviewNote),["","",""]);
 // A line with only one bus on it has no sibling to take anything from.
 assert.deepEqual(fillPrintedLineSiblings([row({lineNumber:"9",busNumber:"18501"})]).map(item=>item.reason),[""]);
 // Same printed number on a different page is a different line.
 const pages=fillPrintedLineSiblings([row({pageNumber:1,lineNumber:"12",busNumber:"18501",reason:"PM'S"}),row({pageNumber:2,lineNumber:"12",busNumber:"18502"})]);
 assert.deepEqual(pages.map(item=>item.reason),["PM'S",""]);

 /* The row's own wording beats the band heading it sat under — the rule the
    prompt has always stated and nothing enforced, because a valid section name
    short-circuited before the reason was ever read. Only the three headings
    that say WHO HAS THE BUS can be overruled; where it physically is, a
    collision and a road call all stand. */
 assert.equal(sectionForScannedRow("Pending","PM'S"),"Inspection");
 assert.equal(sectionForScannedRow("Scheduled Repair","A-15"),"Inspection");
 assert.equal(sectionForScannedRow("Pending","MISFIRES / PM'S"),"Pending","a fault alongside a PM is not maintenance");
 assert.equal(sectionForScannedRow("Pending","PM DEFECTS"),"Pending");
 assert.equal(sectionForScannedRow("Pending",""),"Pending");
 for(const kept of ["Vendor Repair","Accident","Roadcall"])assert.equal(sectionForScannedRow(kept,"PM'S"),kept);

 /* The prompt is the other half: the sharing rule above is the guarantee, but
    the model should not be dropping the wording in the first place. */
 const route=await readFile(new URL("../app/api/down-sheet-scan/route.ts",import.meta.url),"utf8");
 assert.match(route,/REPEAT THE LINE'S WORDING ON EVERY ONE OF THOSE ROWS/);
 assert.match(route,/never a reason left empty on the second and later buses/);
 assert.match(route,/Give every row of a multi-bus line the same lineNumber/);
});

test("the words written on a scanned row outrank the catalog repair the scan guessed at",async()=>{
 const {reconcileScannedRepair,catalogPickFromWords,repairNamedInWords}=await import("../src/lib/down-sheet/scan-catalog-match.ts");
 const {reviewScannedRows,mergeReviewedRows}=await import("../src/lib/down-sheet/down-sheet-scan-import.ts");
 const {REPAIR_OPTIONS,migrateRepairIdentity}=await import("../src/lib/defects/repair-catalog.ts");

 /* BUS 15508, LINE 25 of the 09/6 sheet. Written on the paper: MISFIRE CYL # 5
    / MDT SCREEN. Filed by the scan as Engine / Stabilizer link — a suspension
    part, on a row that mentions no suspension. The catalog was never the
    problem: Misfire is an Engine option, sitting there to be picked. */
 const row={pageNumber:2,lineNumber:"25",busNumber:"15508",reason:"MISFIRE CYL # 5 / MDT SCREEN",assignedTo:"",category:"Engine",repair:"Stabilizer link",section:"Pending",shift:"1st",operationalStatus:"out",confidence:.88,reviewNote:""};
 const reviewed=reviewScannedRows([row],[{id:"b","n":"15508"}]);
 assert.equal(reviewed[0].category,"Engine");
 assert.equal(reviewed[0].repair,"Misfire");
 assert.match(reviewed[0].reviewNote,/Repair read from the words on the row: Engine — Misfire/);
 // The written words themselves are never rewritten; only the catalog pick is.
 assert.equal(reviewed[0].reason,"MISFIRE CYL # 5 / MDT SCREEN");
 const stored=mergeReviewedRows(reviewed.map(item=>({...item,selected:true})))[0];
 assert.equal(stored.category,"Engine");
 assert.equal(stored.repair,"Misfire");

 /* WHAT IS APPROVED IS WHAT IS FILED. A repair from outside the category the
    scan named cannot be shown by that category's dropdown, so the box fell back
    to displaying its first option while the import stored the original: the
    reviewer approved "Check engine light" and the sheet recorded "Stabilizer
    link". Whatever is on the row now, the category owns it. */
 assert.ok(REPAIR_OPTIONS[reviewed[0].category].includes(reviewed[0].repair),
  "the review screen can display the repair that will actually be filed");

 /* The earliest fault written is the primary one — the crew writes what matters
    first and lists the rest after a slash. Both readings are pinned so the
    order is not accidental. */
 assert.deepEqual(catalogPickFromWords("MISFIRE CYL # 5 / MDT SCREEN"),{category:"Engine",repair:"Misfire"});
 assert.deepEqual(catalogPickFromWords("MDT SCREEN / MISFIRE"),migrateRepairIdentity("Tech Services","MDT Screen")&&{category:"Tech Services",repair:"IBS Screen - INOP (general)"});

 /* MDT SCREEN is what the shop writes and the catalog renamed it to IBS Screen,
    so the model is handed a list with no "MDT" in it anywhere and cannot match
    the phrase however plainly it is written. The translation comes from the
    app's own rename table rather than a second copy of it. */
 assert.deepEqual(catalogPickFromWords("MDT SCREEN"),{category:"Tech Services",repair:"IBS Screen - INOP (general)"});
 assert.equal(migrateRepairIdentity("Tech Services","MDT Screen").issue,"IBS Screen - INOP (general)");

 /* A pick the words DO support is the scan reading the same row a person did,
    and is left alone. */
 for(const [category,repair,reason] of [["Engine","Coolant leak","COOLANT LEAK AT WATER PUMP"],["Engine","Misfire","MISFIRE CYL 3"],["Engine","Check engine light","CHECK ENGINE LIGHT ON"]])
  assert.deepEqual(reconcileScannedRepair(category,repair,reason),{category,repair,corrected:false},reason);
 assert.equal(repairNamedInWords("Coolant leak","COOLANT LEAK AT WATER PUMP"),true);
 assert.equal(repairNamedInWords("Stabilizer link","MISFIRE CYL # 5"),false);

 /* Words that name no catalog repair leave the scan's own pick standing. This
    is a correction, not a second guesser. */
 assert.deepEqual(reconcileScannedRepair("Engine","Check engine light","WONT START"),{category:"Engine",repair:"Check engine light",corrected:false});
 assert.deepEqual(reconcileScannedRepair("Miscellaneous","Unknown diagnosis",""),{category:"Miscellaneous",repair:"Unknown diagnosis",corrected:false});

 /* A repair that is real but filed under the wrong category moves to the
    category that owns it, rather than being thrown away. */
 assert.deepEqual(reconcileScannedRepair("Brakes","Stabilizer link","SOMETHING ELSE"),{category:"Suspension and Steering",repair:"Stabilizer link",corrected:true});
 /* A repair this app does not have at all becomes Miscellaneous rather than
    some invented specific one — the written reason still carries the words. */
 assert.deepEqual(reconcileScannedRepair("Engine","Flux capacitor","SOMETHING ODD"),{category:"Miscellaneous",repair:"Driver-reported defect",corrected:true});

 /* THE TIMID RULES, each read off the generated needle list before shipping.
    A confident wrong match is worse than none. */
 assert.equal(catalogPickFromWords("LOOSE MIRROR"),null,"a condition word is not a Bodywork repair name");
 assert.equal(catalogPickFromWords("BROKEN SEAT"),null);
 assert.equal(catalogPickFromWords("DAMAGED TRIM"),null);
 assert.equal(catalogPickFromWords("PM'S"),null,"a service line names no repair");
 assert.equal(catalogPickFromWords(""),null);
 assert.equal(catalogPickFromWords("NO CRANKING NOISE FROM REAR"),null,"whole phrases only, never a substring");

 /* Filing a bus OFF PROPERTY takes it out of the yard's down count, and unlike
    every other band nothing on the row has to justify it. A row that reaches
    for it with no vendor and no location named is called out for a look. */
 const note=input=>reviewScannedRows([{...row,...input}],[{id:"b",n:"15508"}])[0].reviewNote;
 assert.match(note({section:"Vendor Repair",reason:"BRAKES",repair:"Air leak"}),/Filed OFF PROPERTY with no vendor or location named/);
 assert.equal(/OFF PROPERTY/.test(note({section:"Vendor Repair",reason:"ENGINE REPLACEMENT",repair:"Engine replacement",assignedTo:"CUMMINS"})),false,"a named vendor is the sheet saying where the bus is");
 assert.equal(/OFF PROPERTY/.test(note({section:"Vendor Repair",reason:"OFF PROPERTY AT BODY SHOP",repair:"Engine replacement"})),false,"and so are the words themselves");
 assert.equal(note({section:"Pending",reason:"COOLANT LEAK",repair:"Coolant leak"}),"","an ordinary row says nothing");

 /* The prompt is asked for the same things the code now guarantees. */
 const route=await readFile(new URL("../app/api/down-sheet-scan/route.ts",import.meta.url),"utf8");
 assert.match(route,/THE REPAIR YOU CHOOSE MUST MATCH THE WORDS ON THE ROW/);
 assert.match(route,/never a repair from one category paired with the name of another/);
 assert.match(route,/A bus is OFF PROPERTY or Vendor Repair only when the sheet says so/);
 assert.match(route,/Never infer it from the kind of repair/);
});

test("the Down Sheet says which of its buses are out on the road, the inverse of the map's badges",async()=>{
 const {downSheetRoadCounts,downSheetRoadEntries,downSheetMentionsInspection,downSheetMentionsDefect,isDownSheetRoadLocation,downSheetGroup}=await import("../src/lib/down-sheet/down-sheet-view.ts");

 /* The map's down-sheet badges answer "is this bus on the sheet?" while you
    look at the yard. These answer the inverse — "is this one out working?" —
    while you look at the sheet, which the sheet could not say on its own
    because where a bus is belongs to the map. */
 const entry=(busId,busNumber,customReason,section="Pending")=>({busId,busNumber,category:"Miscellaneous",repair:"Driver-reported defect",customReason,assignmentType:section==="Vendor Repair"?"Vendor":"Mechanic",assignedTo:section==="Vendor Repair"?"CUMMINS":"",section});
 const entries=[
  entry("a","17510","PM'S","Inspection"),
  entry("b","17511","MISFIRES"),
  entry("c","17512","PM'S / MISFIRES"),
  entry("d","17513","PM DEFECTS"),
  entry("e","17514","PM'S","Inspection"),
  entry("f","17515","NO BRAKES"),
  entry("g","17516","","Inspection"),
  entry("h","17517","AT CUMMINS","Vendor Repair"),
 ];
 const locations={a:"road-0",b:"road-1",c:"road-2",d:"road-3",e:"garage-4",f:"garage-5",g:"road-6",h:"offsite-0"};

 assert.deepEqual(downSheetRoadCounts(entries,locations),{inspection:3,down:3});
 assert.deepEqual(downSheetRoadEntries(entries,locations,"inspection").map(item=>item.busNumber),["17510","17512","17516"]);
 assert.deepEqual(downSheetRoadEntries(entries,locations,"down").map(item=>item.busNumber),["17511","17512","17513"]);

 /* A BUS CARRYING BOTH IS IN BOTH. The sheet folds a bus into the one row it
    is allowed, so 17512 reads "PM'S / MISFIRES" and the bands must pick one —
    they pick the fault, because a bus with a live misfire is down. But both
    errands are real and neither disappears because the other exists. */
 assert.equal(downSheetGroup(entries[2],locations.c),"unscheduled","the band still counts it as down");
 assert.equal(downSheetMentionsInspection(entries[2]),true);
 assert.equal(downSheetMentionsDefect(entries[2]),true);

 /* PM DEFECTS is the faults found while doing a PM, so it belongs in the down
    tally and not the inspection one — the same lookahead the bands rely on. */
 assert.equal(downSheetMentionsInspection(entries[3]),false);
 assert.equal(downSheetMentionsDefect(entries[3]),true);
 // A row with nothing written falls back to how it was filed.
 assert.equal(downSheetMentionsInspection(entries[6]),true);
 assert.equal(downSheetMentionsDefect(entries[6]),false);

 /* Only buses actually on the road. A bus in the garage and a bus at a vendor
    are both on the sheet and neither is out working. */
 for(const yard of ["17514","17515","17517"])
  for(const kind of ["inspection","down"])
   assert.equal(downSheetRoadEntries(entries,locations,kind).some(item=>item.busNumber===yard),false,yard+" is not on the road");
 assert.equal(isDownSheetRoadLocation("road-0"),true);
 assert.equal(isDownSheetRoadLocation("garage-4"),false);
 assert.equal(isDownSheetRoadLocation("offsite-0"),false);
 assert.equal(isDownSheetRoadLocation(""),false);
 // A bus the map has never placed is not asserted to be anywhere.
 assert.deepEqual(downSheetRoadCounts([entry("z","17599","MISFIRES")],{}),{inspection:0,down:0});

 const [page,css]=await Promise.all([
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
 ]);
 /* Seven tiles: the five that were there, plus the two that do something. */
 // DOWNED BUSES ON ROAD leads the pair now — Curtis set the tile order and put
 // it ahead of the inspections tally.
 assert.match(page,/\["down","DOWNED BUSES ON ROAD",roadCounts\.down\],\["inspection","INSPECTIONS ON ROAD",roadCounts\.inspection\]/);
 assert.match(page,/onClick=\{\(\)=>setRoadFilter\(current=>current===kind\?null:kind\)\}/,"pressing the same one again shows the whole sheet");
 assert.match(page,/aria-pressed=\{roadFilter===kind\}/);
 /* THE COUNTS ARE TAKEN BEFORE THE FILTER. Pressing one tally must not empty
    the other out from under the person reading it. */
 assert.match(page,/const roadCounts=useMemo\(\(\)=>downSheetRoadCounts\(shown,locations\)/);
 /* Grouped from the whole sheet in the reader's band order, minus the rows that
    are ONLY a state inspection: those are not down and Curtis does not want them
    read as though they were. They are not dropped — the IDOT board lists them —
    and a row that is IDOT AND a fault stays in its band, because the fault is
    why it is there. */
 assert.match(page,/const bandEntries=useMemo\(\(\)=>shown\.filter\(entry=>!downSheetIdotOnly\(entry\)\),\[shown\]\)/);
 assert.match(page,/const sheetGroups=useMemo\(\(\)=>orderDownSheetGroups\(groupDownSheetEntries\(bandEntries,"number-asc",locations\),sectionOrder\)/,"the status report is grouped from the sheet, in the reader's band order");
 /* ONLY THE TABLE FOLLOWS THE FILTERS, and there are two of them now — the
    road tallies and the quick filter share one pipeline. The shape is asserted
    rather than the exact old expression, because what has to hold is the
    relationship: the table starts from `shown`, both narrowings are applied to
    it, and everything anybody reads a count off still comes from `shown`
    itself. Comments are stripped so the prose explaining the pipeline cannot
    stand in for the pipeline. */
 const pageCode=page.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 const pipeline=pageCode.match(/const groups=useMemo\(\(\)=>\{[\s\S]*?\n \},\[[^\]]*\]\);/)?.[0]||"";
 assert.ok(pipeline,"the table's grouping is still one memo");
 assert.match(pipeline,/if\(!roadFilter&&!quickFilter\)return sheetGroups;/,"unfiltered, the table is the whole sheet");
 assert.match(pipeline,/rows=roadFilter\?downSheetRoadEntries\(shown,locations,roadFilter\):shown;/,"the road tallies narrow the sheet");
 assert.match(pipeline,/if\(quickFilter\)rows=downSheetFilterEntries\(rows,locations,quickFilter\);/,"and the quick filter narrows that, so the two compose");
 assert.match(pipeline,/orderDownSheetGroups\(groupDownSheetEntries\(rows,"number-asc",locations\),sectionOrder\)/);
 /* The quick filter's own counts come off `shown` for the same reason the road
    tallies do: taken off the filtered rows, every number but the active one
    would read 0 the moment a filter was on. */
 assert.match(pageCode,/const quickFilterCounts=useMemo\(\(\)=>downSheetFilterCounts\(shown,locations\)/,"the menu counts the whole sheet, not the filtered view");
 /* EVERY HELPER THE SHARE BAR CALLS IS IMPORTED. This is here because the first
    build of that bar was not: `copyText` was used and never imported, and lint,
    the build and this whole suite all passed over it. It failed only in a
    browser, where the thrown ReferenceError was swallowed by the handler's own
    catch and reported to the mechanic as "could not share". */
 for(const name of ["copyText","shareOrDownloadFile","downSheetShareText","downSheetShareHtml","downSheetShareFilename","downSheetFilterEntries","downSheetFilterCounts","downSheetFilterLabel","DOWN_SHEET_FILTERS"])
  assert.match(pageCode,new RegExp("import \\{[^}]*\\b"+name+"\\b[^}]*\\} from"),name+" is imported, not assumed");
 /* A failed COPY LIST used to be reported as "COULD NOT SHARE — TRY COPY LIST",
    which sends somebody to press the button that had just failed. */
 assert.match(pageCode,/shareStatus==="copy-error"/);
 assert.match(pageCode,/shareStatus==="share-error"/);
 assert.doesNotMatch(pageCode,/setShareStatus\("error"\)/,"the two failures are told apart");
 assert.ok(page.indexOf("const roadCounts=")<page.indexOf("const groups=useMemo"),"counted from the unfiltered set");

 /* AND SO IS EVERY OTHER TILE. Pressing INSPECTIONS ON ROAD is a request to
    SEE those buses, not a claim that the sheet now holds seven of them.
    Sharing one grouping made the tally rewrite the status report above it - press
    it on a 57-bus sheet and TOTAL ON SHEET read 7 - so the foreman lost the
    numbers he had pressed it from. Reported off the live sheet. */
 assert.match(page,/<div className="group-count total"><strong>\{shown\.length\}<\/strong><span>TOTAL ON SHEET<\/span><\/div>/,"TOTAL ON SHEET counts the sheet, not the filtered view");
 /* The band tiles are placed by name now rather than mapped off sheetGroups in
    whatever order that array happens to be in: Curtis set the tile order, and
    it interleaves bands with tiles that are not bands at all — COMPLETED TODAY
    sits between SCHEDULED and UNSCHEDULED. */
 assert.match(page,/const tileFor=\(key:string\)=>\{const group=sheetGroups\.find\(item=>item\.key===key\)/,"the band tiles still count the sheet");
 /* Every wording the board draws has to name a label that exists. Moving the
    tiles into their new order, I typed labels.completedToday - there is no such
    key, the label is `completed` - and the tile rendered a number over a blank
    line. It looked fine in the source and only showed up when the box was
    measured in a browser. */
 const {DEFAULT_DOWN_SHEET_DISPLAY:DOWN_LABELS}=await import("../src/lib/down-sheet/down-sheet-display-settings.ts");
 for(const key of [...page.matchAll(/displaySettings\.labels\.([A-Za-z]+)/g)].map(match=>match[1]))
  assert.ok(key in DOWN_LABELS.labels, "displaySettings.labels."+key+" is not a label that exists, so it would draw blank");
 const board=page.slice(page.indexOf('<div className="down-group-counts" id="down-counts-tiles">'),page.indexOf("</div>}\n  </section>"));
 assert.deepEqual(
  [...board.matchAll(/tileFor\("([a-z-]+)"\)|<span>(TOTAL ON SHEET|DOWN BUSES)<\/span>|completed-today-tile|"(DOWNED BUSES ON ROAD|INSPECTIONS ON ROAD)"/g)]
   .map(match=>match[1]||match[2]||match[3]||"completed").filter((value,index,all)=>all.indexOf(value)===index),
  ["TOTAL ON SHEET","DOWN BUSES","scheduled","completed","unscheduled","inspection","DOWNED BUSES ON ROAD","INSPECTIONS ON ROAD","off-property"],
  "the eight always-on tiles are in the order Curtis set, with the opt-in ones after them",
 );
 for(const filtered of [/<div className="group-count total"><strong>\{visible\.length\}/,/\{groups\.map\(group=><div className=\{"group-count group-"/])
  assert.doesNotMatch(page,filtered,"no status report tile may be recomputed from the road-filtered set");
 /* What DOES follow the filter: the row count in view, the estimate, and the
    note that says so - each of those describes the view rather than the sheet. */
 assert.match(page,/<span className="view-results"><b>\{visible\.length\}<\/b> IN VIEW<\/span>/);
 assert.match(page,/\{visible\.length\} of \{shown\.length\} on the sheet/);
 // And it says what it is showing, with a way back.
 assert.match(page,/SHOW THE WHOLE SHEET/);
 assert.match(css,/\.down-group-counts \.group-count\.group-road\{[^}]*cursor:pointer/);
 assert.match(css,/\.down-group-counts \.group-count\.group-road-down\.active/);

 /* AND THE SAME FACT ON EVERY ROW, beside the bus number, so it reads while
    scrolling without pressing anything. It sits OUTSIDE the edit button: where
    a bus is comes from the map and this page does not own it, so the badge must
    not look like a way to change it. */
 assert.match(page,/isDownSheetRoadLocation\(locations\[entry\.busId\]\|\|""\)&&<i className="on-road-badge"/);
 /* OUTSIDE the edit button, checked by looking inside that button rather than
    by adjacency - the badge sits under the number now, with a comment between
    the two, and an adjacency test would have failed on the comment while the
    thing it protects was still true. */
 const busButton=page.slice(page.indexOf('<button className="fleet-number-button"'),page.indexOf('</button>',page.indexOf('<button className="fleet-number-button"')));
 assert.ok(!busButton.includes("on-road-badge"),"the badge must not sit inside the button that opens the editor");
 assert.match(page,/<\/button>\{\/\*[\s\S]{0,600}?\*\/\}\s*\{isDownSheetRoadLocation\(locations\[entry\.busId\]\|\|""\)&&<i className="on-road-badge"/,"and it follows the number, stacked under it");
 assert.match(css,/\.on-road-badge\{[^}]*white-space:nowrap/,"a badge that wrapped would push every row taller");

 /* Fixed tab stops, the same fix the Defect Log's badge slot got. Laid out
    inline the badge follows the bus button, and that button is as wide as the
    status label under it — so ON ROAD sat at three x positions on neighbouring
    rows (measured 145, 161 and 185 for OUT OF SERVICE, WORK IN PROGRESS and IN
    SERVICE WITH DEFECTS), and the longest label pushed it onto the reason text
    in the next column. Curtis photographed it on the live sheet.

    Each piece owns a slot now. The explicit grid-column on each is what makes
    an empty ON ROAD slot stay empty instead of DELETE sliding left into it. */
 assert.match(page,/<td className="fleet-number"><span className="fleet-number-slots">/,"the cell's contents need a row of fixed slots to sit in");
 /* THE FOUR-SLOT ROW IS GONE, and with it the problem it was solving. Fixed
    tab stops existed because four things shared one line and an absent one let
    its neighbours slide. Only two things are in this cell now — the number and
    the badge — and they are STACKED, so there is no line for anything to slide
    along and nothing to pin. The badge cannot wander because it starts where
    the number starts.

    The buttons that made this cell four wide are a column of their own at the
    end of the row. */
 assert.match(css,/\.fleet-number-slots\{display:flex;min-width:0;flex-direction:column;align-items:flex-start/);
 assert.doesNotMatch(css,/\.fleet-number-slots\{display:grid/,"the four-slot row is what made this column 288px wide");
 for(const gone of [/\.fleet-number-slots>\.fix-entry/,/\.fleet-number-slots>\.delete-entry/])
  assert.doesNotMatch(css,gone,"the buttons do not live in this cell any more");
 assert.doesNotMatch(css,/\.on-road-badge\{[^}]*margin-left/,"the gap comes from the stack, not a margin that only exists when the badge does");
 /* 108px fitted the number and its status label exactly, so the badge beside it
    overflowed into the reason column and was clipped by 21px in the built page.
    DELETE later landed exactly the same way, hanging 13px into that column at
    every phone width, because table-layout is fixed and the column does not
    grow for what you put in it.

    That reasoning drove the column to 288px, sized for the worst row it could
    hold — longest status label, ON ROAD, and a 44px delete target. It is no
    longer the right shape: the buttons left, the badge went under the number,
    and 288px of the screen was being spent on a five-digit number while REASON
    DOWN, the column the sheet is actually read for, sat off the side of the
    phone. Reported from the floor.

    So the cell holds two stacked things and the column is the width of the
    wider of them, and the room that frees goes to the reason. */
 const busCol=Number(css.match(/\.down-table th:nth-child\(2\)\{width:(\d+)px\}/)?.[1]);
 const actionsCol=Number(css.match(/\.down-table th\.row-actions-head\{width:(\d+)px\}/)?.[1]);
 const tableMin=Number(css.match(/\.down-table\{[^}]*min-width:(\d+)px/)?.[1]);
 /* Wide enough for the number and its status label stacked, and no wider - the
    old 288px is the bug now, not the floor. */
 assert.ok(busCol>=110&&busCol<=160,"the bus column is "+busCol+"px; it holds a number and a badge, stacked");
 /* Two 44px phone targets and the gap between them. */
 assert.ok(actionsCol>=98,"the actions column is "+actionsCol+"px, too narrow for two 44px targets");
 /* The other seven columns total 1052px and must not pay for either of these. */
 assert.equal(tableMin,1052+busCol+actionsCol,"every column's width has to be in the table's min-width, or one of them is being squeezed");
 /* And the net is NARROWER than before, which is the point: 288 became 124 and
    the actions took 104 back, so the sheet got 60px less wide, not more. */
 assert.ok(tableMin<1340,"moving the buttons out must not make the sheet wider than it was");
});

test("SHEET STATS folds into the tiles the foreman actually reads, without losing a number", async () => {
  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");

  /* The panel is gone, not hidden: no toggle, no second summary grid, and no
     state left behind still writing a key nothing reads. */
  for(const dead of [/className=\{"sheet-stats"/,/className="sheet-stats-toggle"/,/className="down-summary"/,/STATS_OPEN_KEY/,/statsOpen/])
   assert.doesNotMatch(page,dead,"SHEET STATS left something behind");

  /* Its numbers came down into the status report. All of them except ACTIVE DOWN,
     which counted the whole active sheet while TOTAL ON SHEET counts the
     current view - the same number on ALL with no search, which is why it read
     as a duplicate. SHEET CAPACITY still carries the whole-sheet count. */
  for(const tile of ["group-pending","group-accident","group-waiting","group-completed","group-labor","group-capacity"])
   assert.match(page,new RegExp('className=(\\{)?"?group-count '+tile),tile+" must be in the status report");
  assert.match(page,/<div className="group-count group-capacity"><strong>\{active\.length\}<small> \/ \{MAX_ENTRIES\}/,"capacity keeps the whole-sheet count ACTIVE DOWN used to carry");

  /* EST. CURRENT VIEW renders only when it has something of its own to say.
     Unfiltered it equals EST. ACTIVE LABOR to the minute, and printing the
     same duration twice side by side is the duplication this was clearing.
     Measured: hidden unfiltered, 35h against 105h on 2nd shift, 28h against
     105h under the road filter. */
  // Still only when it differs from EST. ACTIVE LABOR — and now only when that
  // tile was asked for at all, since a view total beside no total says nothing.
  assert.match(page,/\{!hiddenInLite\(appMode,"extraTiles"\)&&extraTiles\.includes\("labor"\)&&visibleMinutes!==counters\.activeMinutes&&<div className="group-count group-view-labor">/);

  /* The labour tiles print a duration rather than a count, so their text steps
     down - at the tiles' own 20px, "244h 30m" wrapped mid-value. */
  assert.match(css,/\.down-group-counts \.group-count\.group-labor strong\{color:#6f4c00;font-size:15px\}/);

  /* And the key that panel used is recorded as retired rather than quietly
     dropped, because a name this repository has used must not be reused. */
  const claude = await readFile(new URL("../CLAUDE.md", import.meta.url), "utf8");
  assert.match(claude,/pace-down-sheet-stats-open-v1\s+NO LONGER READ/);
  assert.match(claude,/`pace-down-sheet-stats-open-v1` is no longer read or written/);
});

test("the Down Sheet gets its own ADVANCED ACTIONS, and it cannot be mistaken for the Defect Log's", async () => {
  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");

  /* In the header, under REFRESH, in a column of its own so it is under it at
     every width rather than only where the header happens to stack. */
  assert.match(page,/<div className="down-header-actions">\s*<RefreshButton\/>\s*\{!hiddenInLite\(appMode,"advancedActions"\)&&<button className="down-advanced-toggle"/);
  assert.match(css,/\.down-header-actions\{[^}]*flex-direction:column/);

  /* UNMISTAKABLY THIS PAGE'S. Both headers are navy, so the Defect Log's
     translucent white here would have made the two read as one header. This
     wears #6b31b6 - what SCAN SHEET already wears on this page and nothing on
     the Defect Log does. */
  assert.match(css,/\.down-advanced-toggle\{[^}]*background:#6b31b6/);
  const logCss = await readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8");
  assert.match(logCss,/\.header-advanced-toggle\{[^}]*background:#ffffff1f/);
  assert.doesNotMatch(logCss,/\.header-advanced-toggle\{[^}]*background:#6b31b6/,"the two toggles must not share a colour");

  /* What went in, and what deliberately stayed out. ADD DOWN BUS and SEARCH
     are the two things used on every visit and now sit together, instead of
     with six controls wedged between them. */
  const drawer=page.slice(page.indexOf('className="down-advanced open"'),page.indexOf('<section className="down-controls">'));
  for(const inside of ["shift-filter","completed-toggle","scan-sheet-button","clear-downsheet","undo-scan","undo-clear"])
   assert.ok(drawer.includes(inside),inside+" belongs in ADVANCED ACTIONS");
  assert.ok(!drawer.includes("down-primary-action"),"ADD DOWN BUS stays out");
  assert.ok(!drawer.includes("down-search"),"SEARCH stays out");
  const controls=page.slice(page.indexOf('<section className="down-controls">'),page.indexOf('<section className="down-view-controls"'));
  assert.ok(controls.includes("down-primary-action"),"ADD DOWN BUS is what is left in that row");
  for(const gone of ["shift-filter","completed-toggle","scan-sheet-button","down-more"])
   assert.ok(!controls.includes(gone),gone+" moved out of the controls row");

  /* Closed by default and remembered per device, under a key of its own -
     documented, because an undocumented key is how one gets renamed later. */
  assert.match(page,/const ADVANCED_OPEN_KEY="pace-down-sheet-advanced-open-v1"/);
  assert.match(page,/writeSetting\(localStorage,ADVANCED_OPEN_KEY,advancedOpen\?"1":"0"\)/);
  const claude = await readFile(new URL("../CLAUDE.md", import.meta.url), "utf8");
  assert.match(claude,/pace-down-sheet-advanced-open-v1/);

  /* THE COLUMN IS CAPPED. Uncapped it rendered 285px wide next to a 700px nav
     and pushed the whole page 40px sideways at 1180 - iPad landscape - which
     is the exact class of fault this page has already been fixed for twice. */
  assert.match(css,/\.down-header-actions\{[^}]*max-width:210px/);
  assert.match(css,/\.down-header-actions\{width:100%;max-width:none\}/,"and uncapped again once the header stacks");
});

test("no Down Sheet cell is a flex container, or it stops stretching to its row", async () => {
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");

  /* display:flex takes a cell out of table layout, and a cell that is not a
     table-cell stops stretching to its row. `.updated` was flex to stack the
     initials over the timestamp: on any row where the reason wrapped to a
     second line the cell stayed 55px while the row grew to 63 or 76, and its
     bottom border drew a stray line partway up the row beside an ACTIONS cell
     that did stretch. Curtis photographed it. `.estimate-cell` already carried
     display:table-cell for the same reason, so this was the second time.

     Measured after: rows of 55, 76, 55 and 63px, every cell matching its row. */
  const tdClasses=[...new Set([...page.matchAll(/<td className="([a-z- ]+)"/g)].map(m=>m[1]))]
    .flatMap(names=>names.split(" ")).filter(Boolean);
  assert.ok(tdClasses.includes("updated")&&tdClasses.includes("row-actions"),"the cells this is about are still cells");
  for(const name of tdClasses){
    const rule=css.match(new RegExp("\\."+name+"\\{([^}]*)\\}"));
    if(!rule)continue;
    assert.doesNotMatch(rule[1],/display:(flex|grid|inline-flex|inline-grid)/,
      "."+name+" is a <td>; making it "+rule[1].match(/display:[a-z-]+/)?.[0]+" takes it out of table layout and it stops stretching to its row");
  }
  assert.match(css,/\.updated\{display:table-cell\}/);
  assert.match(css,/\.updated b\{display:block/,"the children stack as blocks, which needs no flex");
  assert.match(css,/\.estimate-cell\{display:table-cell/,"the precedent this follows");
});

test("both Down Sheet boards carry the window and say what it hides",async()=>{
 for(const file of ["../app/down-sheet/_components/deferred-board.tsx","../app/down-sheet/_components/recommended-board.tsx"]){
  const source=await readFile(new URL(file,import.meta.url),"utf8");
  assert.match(source,/<TimeWindowChips value=\{windowKey\}/,file+" draws the chips");
  /* The count beside the chips is what the window is holding back — measured
     against the unfiltered list, which is why both are kept. */
  assert.match(source,/hidden=\{all\.length-buses\.length\}/,file);
  assert.match(source,/buses=all\.filter\(group=>withinTimeWindow\(/,file);
  /* An empty board has to say WHICH kind of empty it is. "Nothing deferred"
     and "nothing in the last hour" are different facts and only one of them
     means there is nothing to do. */
  assert.match(source,/Nothing this recent\./,file);
  /* Inside the collapse, so a collapsed board is still one line. */
  assert.match(source,/\{!collapsed&&all\.length>0&&<TimeWindowChips/,file);
  /* Judged on the longest wait on the bus, the same number the card prints —
     not the newest, which would let a week-old bus reappear in "the last hour"
     because a second repair was added to it this morning. */
  assert.equal(/withinTimeWindow\([^)]*sort\(/.test(source),false,file+" reuses the card's own age");
 }
});

test("a collapsed board never shows a narrowed count with nothing saying so",async()=>{
 /* The chips and the N HIDDEN button are inside the collapse and the header
    count is not, so a board collapsed while narrowed read as a smaller list
    with no explanation on screen — and both boards are collapsed by DEFAULT,
    making that the resting state rather than an edge case. */
 for(const file of ["../app/down-sheet/_components/deferred-board.tsx","../app/down-sheet/_components/recommended-board.tsx"]){
  const source=await readFile(new URL(file,import.meta.url),"utf8");
  /* DERIVED through the collapse, not reset by an effect and not by a line in
     the toggle's onClick. An effect runs after the commit, which left one
     frame showing the reduced count — measured at 2 on a board holding 3 —
     and the onClick would miss the page restoring `collapsed` from storage on
     mount. Reading it through makes the two impossible to disagree at all. */
  assert.match(source,/const activeWindow:TimeWindowKey=collapsed\?"all":windowKey;/,file);
  assert.match(source,/withinTimeWindow\([^)]*\),activeWindow\)/,file+" filters on the derived value");
  assert.equal(/if\(collapsed\)setWindowKey/.test(source),false,file+" does not reset it after the fact");
  /* The chips still show the chosen window, so expanding restores the filter
     the person set rather than silently discarding it — the count is only ever
     narrowed while the line explaining it is on screen. */
  assert.match(source,/<TimeWindowChips value=\{windowKey\}/,file);
 }
});

test("an imported helper is never called as a method on a record",async()=>{
 /* HOVERING ANY BUS BLANKED THE FACILITY MAP, and it shipped — it was live as
    Sites Version 173 until this commit.

    The quick-view portal called `bus.isHeld(bus)`. There is no such method;
    `isHeld` is a module import, used correctly as `isHeld(bus)` thirty
    characters earlier in the same line for the token badge. Hovering threw
    TypeError, React unmounted the root, and the board went blank until reload
    — measured as tokens 2 -> 0 and document.body 90,569 -> 19,099 bytes.

    NOTHING CAUGHT IT. eslint is not type-aware here, `vinext build` does not
    typecheck, and 295 tests passed: the suite asserts on source text, and the
    source text looked plausible. So the check has to be for the SHAPE — an
    imported function invoked as a property of something else. */
 const files=["app/page.tsx","app/defect-log/page.tsx","app/down-sheet/page.tsx",
  "app/fixed-repairs/page.tsx","app/lists/page.tsx","app/settings/page.tsx",
  "app/down-sheet/_components/deferred-board.tsx","app/down-sheet/_components/recommended-board.tsx","src/components/down-sheet/mystery-board.tsx","src/components/fleet/hold-board.tsx"];
 for(const file of files){
  const source=await readFile(new URL("../"+file,import.meta.url),"utf8");
  /* Every name brought in by a braced import, which is how this repo imports
     helpers. Default imports are components and are not called this way. */
  const imported=new Set();
  for(const match of source.matchAll(/import\s*\{([^}]*)\}\s*from/g))
   for(const part of match[1].split(","))
    {const name=part.split(/\s+as\s+/).pop().trim().replace(/^type\s+/,"");if(/^[a-z]\w*$/.test(name))imported.add(name)}
  for(const name of imported)
   for(const hit of source.matchAll(new RegExp("([A-Za-z_$][\\w$]*)\\."+name+"\\s*\\(","g")))
    assert.fail(file+" calls the imported helper `"+name+"` as a method: `"+hit[0]+"` — it takes the record as an argument, so this throws at runtime and unmounts the page");
 }
});

test("wrapping the panels in drawers did not sever their child-combinator rules",async()=>{
 /* Putting the settings groups inside <SettingsDrawers>/<SettingsDrawer> pushed
    their contents one level deeper, and THREE `>` rules quietly stopped
    matching. Nothing failed; the styling just evaporated. Measured in Chromium:
    the DEFAULT INITIALS caption rendered display:block at the browser default
    16px instead of an 8px all-caps flex column, the amber "Records live on this
    device" note lost its border, background and padding entirely, and Fixed
    Repairs' inner sections lost their border and padding so RESET LOOK sat flush
    against the colour grid.

    Then fixing those introduced a fourth: `.down-settings-body
    .settings-drawer-body>label` is (0,2,1), which out-specifies
    `.down-settings-body .settings-check` at (0,2,0), and SHOW COMPLETED became
    a column. Every rule re-rooted through the drawer has to carry its
    override with it.

    The rule this encodes: a selector rooted at a panel body with a `>` must
    also name the drawer body, or it describes a DOM that no longer exists. */
 const read=file=>readFile(new URL("../"+file,import.meta.url),"utf8");
 const [down,fixed]=await Promise.all([
  read("app/down-sheet/down-sheet.css"),read("app/fixed-repairs/fixed-repairs.css"),
 ]);
 assert.match(down,/\.down-settings-body>label,\.down-settings-body \.settings-drawer-body>label\{/);
 assert.match(down,/\.down-settings-body>p,\.down-settings-body \.settings-drawer-body>p\{/);
 assert.match(fixed,/\.fixed-settings>div>section,\.fixed-settings \.settings-drawer-body>section\{/);
 /* And the override that the re-rooting out-specified, re-rooted to match. */
 assert.match(down,/\.down-settings-body \.settings-check,\.down-settings-body \.settings-drawer-body>label\.settings-check\{flex-direction:row/);

 /* No OTHER rule reaches through a bare `>` into content the drawers now wrap.
    Only two roots are affected — `.down-settings-body>` and
    `.fixed-settings>div>` — because those are the elements the drawers were
    inserted directly beneath. `.fixed-settings>header` and `.log-settings>div`
    are NOT affected: the drawers sit inside those, not around them, and an
    earlier cut of this scan flagged `.fixed-settings>header span` for no
    reason. */
 for(const [css,file,root] of [[down,"down-sheet.css",".down-settings-body>"],[fixed,"fixed-repairs.css",".fixed-settings>div>"]])
  for(const match of css.matchAll(new RegExp("^"+root.replace(/[.>]/g,ch=>"\\"+ch)+"[^,{\n]*","gm"))){
   const full=css.slice(match.index,css.indexOf("{",match.index));
   assert.ok(full.includes(".settings-drawer-body"),
    file+" reaches through a bare `>` into drawer-wrapped content and will silently stop matching: "+match[0].trim());
  }
});

test("the Down Sheet's quick filters ask about the entry, and what is shared is what is on the screen",async()=>{
 const now="2026-09-14T15:00:00.000Z";
 const entry=(over={})=>({id:"e"+(over.busNumber||"x"),busId:over.busId||"b"+(over.busNumber||"x"),busNumber:"17500",category:"",repair:"",customReason:"",
  assignmentType:"Mechanic",assignedTo:"",section:"Pending",workflow:"Scheduled",createdAt:now,repairItems:[],timeEstimate:{totalMinutes:0},...over});

 /* THESE ARE NOT THE DEFECT LOG'S FILTERS, and that is the point of the module.
    Every one of them asks something only the ENTRY knows — who has the bus, how
    long it has been on the sheet, whether anything is estimated — or something
    only the MAP knows. None of it is answerable from a defect's wording, which
    is all the Defect Log's thirteen filters ever look at. */
 assert.deepEqual(DOWN_SHEET_FILTERS.map(item=>item.key),
  ["unassigned","waiting-parts","off-property","on-road","aging","body-shop","road-call","inspection","no-estimate"]);
 assert.ok(DOWN_SHEET_FILTERS.every(item=>item.label&&item.shortLabel&&item.hint));
 assert.equal(downSheetFilterFromValue("waiting-parts"),"waiting-parts");
 // A key off a link or an old device reads as no filter rather than as a crash.
 assert.equal(downSheetFilterFromValue("farebox"),null);
 assert.equal(downSheetFilterFromValue(undefined),null);

 assert.equal(downSheetFilterMatch(entry({assignedTo:""}),"garage-4","unassigned",now),true);
 assert.equal(downSheetFilterMatch(entry({assignedTo:"CJ"}),"garage-4","unassigned",now),false);
 assert.equal(downSheetFilterMatch(entry({workflow:"Waiting for Parts"}),"garage-4","waiting-parts",now),true);
 /* Off property is the sheet's own band, not a second reading of it: a bus
    parked at an offsite slot counts however the row is written, and so does one
    with a vendor in the MECHANIC/LOCATION column. */
 assert.equal(downSheetFilterMatch(entry({assignedTo:"CJ"}),"offsite-0","off-property",now),true);
 assert.equal(downSheetFilterMatch(entry({assignedTo:"CUMMINS"}),"garage-4","off-property",now),true);
 /* WHERE THE BUS IS is asked of the map and can never be asked of the row. A
    bus out working while its entry still says Scheduled is exactly the case
    this list exists for, and the entry's own fields say nothing about it. */
 assert.equal(downSheetFilterMatch(entry({workflow:"Scheduled"}),"road-3","on-road",now),true);
 assert.equal(downSheetFilterMatch(entry({workflow:"Scheduled"}),"garage-4","on-road",now),false);
 assert.equal(downSheetFilterMatch(entry({section:"Accident"}),"garage-4","body-shop",now),true);
 assert.equal(downSheetFilterMatch(entry({repair:"Collision damage - rear cap"}),"garage-4","body-shop",now),true);
 assert.equal(downSheetFilterMatch(entry({section:"Roadcall"}),"garage-4","road-call",now),true);
 assert.equal(downSheetFilterMatch(entry({repair:"A15"}),"garage-4","inspection",now),true);
 assert.equal(downSheetFilterMatch(entry({repair:"Misfire"}),"garage-4","inspection",now),false);

 /* An estimate can be written in either of two places, and a row estimated only
    on its repairs would otherwise have been reported as carrying none. */
 assert.equal(downSheetFilterMatch(entry({timeEstimate:{totalMinutes:0}}),"garage-4","no-estimate",now),true);
 assert.equal(downSheetFilterMatch(entry({timeEstimate:{totalMinutes:90}}),"garage-4","no-estimate",now),false);
 assert.equal(downSheetFilterMatch(entry({repairItems:[{repair:"Air leak",estimateEnabled:true,timeEstimate:{totalMinutes:45}}]}),"garage-4","no-estimate",now),false);
 assert.equal(downSheetFilterMatch(entry({repairItems:[{repair:"Air leak",estimateEnabled:false,timeEstimate:{totalMinutes:45}}]}),"garage-4","no-estimate",now),true);

 // Three days on the sheet, counted from when the row was written.
 const old=entry({createdAt:"2026-09-10T15:00:00.000Z"});
 assert.equal(Math.round(downSheetEntryAgeDays(old,now)),4);
 assert.equal(downSheetFilterMatch(old,"garage-4","aging",now),true);
 assert.equal(downSheetFilterMatch(entry({createdAt:"2026-09-13T15:00:00.000Z"}),"garage-4","aging",now),false);
 assert.equal(DOWN_SHEET_AGING_DAYS,3);
 /* A device with its clock set ahead writes rows stamped in the future. Floored
    at zero, so one cannot sort to the top of a list headed "down the longest". */
 assert.equal(downSheetEntryAgeDays(entry({createdAt:"2026-09-20T15:00:00.000Z"}),now),0);
 // A row with no stamp is not asserted to be any age at all.
 assert.equal(downSheetEntryAgeDays(entry({createdAt:""}),now),null);
 assert.equal(downSheetFilterMatch(entry({createdAt:""}),"garage-4","aging",now),false);

 const sheet=[
  entry({busId:"a",busNumber:"17512",assignedTo:"",repair:"Misfire"}),
  entry({busId:"b",busNumber:"17514",assignedTo:"CJ",workflow:"Waiting for Parts",repair:"Air dryer"}),
  entry({busId:"c",busNumber:"17517",assignedTo:"CJ",repair:"A15"}),
 ];
 /* garage-10 IS Trouble Bay 11 — the bays are one grid and the trouble bays are
    its eleventh and twelfth columns. Which is exactly why a prefix match is
    banned here: "garage-" would answer Main Garage for this bus. */
 const locations={a:"garage-4",b:"garage-10",c:"road-2"};
 assert.deepEqual(downSheetFilterEntries(sheet,locations,"waiting-parts",now).map(row=>row.busNumber),["17514"]);
 assert.deepEqual(downSheetFilterEntries(sheet,locations,"on-road",now).map(row=>row.busNumber),["17517"]);
 /* Every count in one pass, and each one counts the WHOLE sheet. Counted off
    the filtered rows, every number but the active one would read 0 the moment a
    filter was on and the menu would stop being a way to choose the next
    question. */
 const counts=downSheetFilterCounts(sheet,locations,now);
 assert.equal(counts["waiting-parts"],1);
 assert.equal(counts.unassigned,1);
 assert.equal(counts.inspection,1);
 assert.equal(counts["no-estimate"],3);
 assert.deepEqual(Object.keys(counts).sort(),DOWN_SHEET_FILTERS.map(item=>item.key).sort());

 /* A REPAIR WRITTEN TWICE IS ONE PROBLEM. A sheet photographed on three
    mornings mints a fresh record each time; the same sentence printed twice
    reads to the person on the other end as two faults. */
 assert.deepEqual(downSheetShareLines({busNumber:"17512",repairItems:[
  {repair:"Air leak",details:"front bag"},{repair:"Air leak",details:"front bag"},{repair:"No cooling",details:"",done:true}]}),
  ["Air leak — front bag","No cooling  (done)"]);
 // A row with nothing on it says so rather than printing an empty bullet.
 assert.deepEqual(downSheetShareLines({busNumber:"17512",repairItems:[]}),["No repair written on this row"]);
 assert.deepEqual(downSheetShareLines({busNumber:"17512",repairItems:[],repair:"Misfire"}),["Misfire"]);

 /* THE SAME WORDS THE APP SAYS, from the same table. Five copies of that table
    have existed in this repo and all five called Trouble Bay 11 "Main Garage";
    a shared list that does it sends somebody to the wrong bay. */
 const context=downSheetShareContext(sheet[1],"garage-10",now);
 assert.match(context,/TROUBLE BAY 11/i);
 assert.match(context,/CJ/);
 assert.match(context,/Waiting for Parts/);
 assert.match(context,/Since today/);
 // Nothing known is nothing printed, rather than a row of empty separators.
 assert.doesNotMatch(downSheetShareContext(entry({createdAt:""}),"",now),/·\s*·/);

 const text=downSheetShareText("waiting-parts",[sheet[1]],locations,now);
 assert.match(text,/DOWN SHEET — WAITING FOR PARTS {2}\(1 bus\)/);
 assert.match(text,/Bus 17514/);
 assert.match(text,/• Air dryer|No repair written/);
 assert.match(downSheetShareText("waiting-parts",[],locations,now),/No buses on the sheet match this filter/);
 // Plural only when it is plural — this is read by somebody outside the shop.
 assert.match(downSheetShareText("unassigned",sheet,locations,now),/\(3 buses\)/);

 /* The page is inlined and escaped. It is opened from a text message on a phone
    that may have no signal, so it fetches nothing; and a bus number typed off a
    paper sheet can carry anything, so nothing reaches the markup unescaped. */
 const html=downSheetShareHtml("waiting-parts",[{...sheet[1],busNumber:"<script>x</script>"}],locations,"Sep 14, 3:00 PM",now);
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/https?:\/\//,"nothing is fetched from the network");
 assert.match(html,/PACE SOUTH · DOWN SHEET/);
 assert.match(html,/Snapshot taken when this was shared/);
 assert.equal(downSheetShareFilename("waiting-parts",new Date("2026-09-14T15:00:00.000Z")),"pace-down-sheet-waiting-for-parts-2026-09-14.html");
});
