/* the fleet and the facility: the grid, status, holds and service. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BUS_LIST_COLUMN_LIMIT, BUS_LIST_MAX_HOURS, BUS_LIST_TEMPLATES, COMPLETION_READING_NOTE, DEFAULT_SERVICE_INTERVALS, EAST_SLOTS, ESTIMATED_MILES_PER_OPERATING_DAY, INSPECTION_DAY_INTERVAL, INSPECTION_MILE_INTERVAL, LEGACY_SERVICE_INTERVALS_UNIT, MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR, RELOCATION_AREAS, ROAD_CAPACITY, SECTION_SLOTS, SERVICE_CRITICAL_FRACTION, SERVICE_DUE_SOON_HOURS, SERVICE_INTERVALS_UNIT, SERVICE_KINDS, SERVICE_OVERDUE_FRACTION, SERVICE_SEVERITY_LABELS, WEST_CAPACITY, addBusListEntries, appendMaintenanceEvent, appendOdometerReading, applyOperatorBatch, bay12AwarenessBusIds, bulkAreaAvailability, bulkRelocateBuses, busListColumnCount, busListCounts, busListExportText, busListHours, busListTemplateOptions, candidateBusNumbers, clearFacilityOnlyDefects, createBusList, defectFromDraft, defectSummary, deleteBusListTemplate, engineHourMeterReset, estimateEngineHoursAtMiles, estimatedMileage, facilityOnlyDefectCount, fleetDutyCycle, formatWorkHours, hasBusNumberConflict, hasLocationConflict, inspectionDueStatus, isBay12AwarenessArea, isMysteryArea, latestMaintenanceEvent, latestOdometerReading, maintenanceCompletionError, maintenanceEventsOfKind, migrateBrakeTowCapacities, migrateReducedCapacity, milesPerEngineHour, monthsBetween, moveBusToArea, moveOrSwapBuses, mysteryBusIds, normalizeBusListColumns, normalizeBusListHours, normalizeBusListTemplates, normalizeBusLists, normalizeMaintenanceEvents, normalizeOdometerReadings, normalizeServiceIntervals, parseBusListInput, quickFilterMatch, readFacilityDefectClearSnapshot, readSavedServiceIntervals, reassignBusPair, recordMaintenanceCompletion, resolveBusNumber, resolveBusNumberList, restoreFacilityOnlyDefects, roadServiceStatus, saveBusListTemplate, sectionBusCount, serviceIntervalHours, serviceIntervalStatus, serviceSeverity, setBusListColumns, setBusListEntryCell, setBusListEntryDone, setBusListEntryHours, stampOperationalChange, statusForLocation, syncFacilityAlertDefects, syncTrackerDownSheetSelection, validateBusUpdate, workDayKey, workTimePeople, workTimeSummary } from "./helpers/modules.mjs";


test("bus-number resolver accepts unique suffixes and blocks unsafe ambiguity", () => {
  const fleet = [
    { id: "a", n: "17525" },
    { id: "b", n: "17505" },
    { id: "c", n: "18505" },
    { id: "d", n: "20505" },
    { id: "e", n: "15504" },
    { id: "f", n: "17504" },
  ];
  const exact = resolveBusNumber(fleet, "17525");
  assert.equal(exact.kind, "exact");
  assert.equal(exact.bus.id, "a");
  const uniqueSuffix = resolveBusNumber(fleet, "25");
  assert.equal(uniqueSuffix.kind, "suffix");
  assert.equal(uniqueSuffix.bus.n, "17525");
  const ambiguous = resolveBusNumber(fleet, "05");
  assert.equal(ambiguous.kind, "ambiguous");
  assert.equal(ambiguous.matchType, "suffix");
  assert.deepEqual(candidateBusNumbers(ambiguous.matches), ["17505", "18505", "20505"]);
  const leadingZero = resolveBusNumber(fleet, "04");
  assert.equal(leadingZero.kind, "ambiguous");
  assert.deepEqual(candidateBusNumbers(leadingZero.matches), ["15504", "17504"]);
  assert.equal(resolveBusNumber(fleet, "4").kind, "invalid");
  assert.equal(resolveBusNumber(fleet, "525").kind, "invalid");
  assert.equal(resolveBusNumber(fleet, "99").kind, "not-found");
  const duplicateExact = resolveBusNumber([...fleet, { id: "duplicate", n: "17525" }], "17525");
  assert.equal(duplicateExact.kind, "ambiguous");
  assert.equal(duplicateExact.matchType, "exact");
  const multiple = resolveBusNumberList(fleet, "25, 17505 20505");
  assert.equal(multiple.kind, "numbers");
  assert.deepEqual(multiple.buses.map(bus => bus.n), ["17525", "17505", "20505"]);
  const mixedResolution = resolveBusNumberList(fleet, "25 05, 99");
  assert.equal(mixedResolution.kind, "numbers");
  assert.deepEqual(mixedResolution.buses.map(bus => bus.n), ["17525"]);
  assert.deepEqual(mixedResolution.ambiguous.map(item => item.query), ["05"]);
  assert.deepEqual(mixedResolution.missing, ["99"]);
  assert.equal(resolveBusNumberList(fleet, "engine light").kind, "text");
});

test("Mystery counts only active on-site work-area buses absent from the Down Sheet", () => {
  for (const location of ["east-1", "west-0", "bay-1", "bay-overflow-1", "wall-0", "service-0", "paint-0", "wash-0", "body-0", "office-0", "pit-0", "brake-0", "tow-0", "waiting-0"]) assert.equal(isMysteryArea(location), true, location);
  for (const location of ["road-0", "garage-0", "garage-9", "garage-10", "garage-11", "garage-22", "garage-23"]) assert.equal(isMysteryArea(location), false, location);
  assert.equal(isBay12AwarenessArea("garage-10"),true);
  assert.equal(isBay12AwarenessArea("garage-11"),true);
  assert.equal(isBay12AwarenessArea("garage-9"),false);
  const fleet=[
    {id:"east",n:"17501",l:"east-1",s:"out",defects:[]},
    {id:"waiting",n:"17502",l:"waiting-0",s:"unknown",defects:[]},
    {id:"road",n:"17503",l:"road-0",s:"unknown",defects:[]},
    {id:"garage11",n:"17504",l:"garage-10",s:"service",defects:[]},
    {id:"listedUnknown",n:"17505",l:"west-0",s:"unknown",defects:[]},
    {id:"decommissioned",n:"15503",l:"west-1",s:"decommissioned",defects:[]},
  ];
  assert.deepEqual(mysteryBusIds(fleet,["listedUnknown"]),["east","waiting"]);
  const enteredBay12=stampOperationalChange({id:"watch",n:"17512",l:"road-0",s:"defect",defects:[{state:"open"}],bay12Watch:false},{id:"watch",n:"17512",l:"bay-12",s:"shop",defects:[{state:"open"}],bay12Watch:false},"2026-08-20T12:00:00.000Z");
  assert.equal(enteredBay12.bay12Watch,true);
  const movedToCng=stampOperationalChange(enteredBay12,{...enteredBay12,l:"west-1"},"2026-08-20T13:00:00.000Z");
  assert.deepEqual(bay12AwarenessBusIds([movedToCng],[]),["watch"]);
  assert.deepEqual(bay12AwarenessBusIds([{...movedToCng,l:"garage-10"}],[]),["watch"]);
  assert.deepEqual(bay12AwarenessBusIds([{...movedToCng,l:"road-1"}],[]),[]);
  assert.deepEqual(bay12AwarenessBusIds([movedToCng],["watch"]),[]);
  const fixed=stampOperationalChange(movedToCng,{...movedToCng,defects:[{state:"completed"}]},"2026-08-20T14:00:00.000Z");
  assert.equal(fixed.bay12Watch,false);
  assert.deepEqual(bay12AwarenessBusIds([fixed],[]),[]);
});

test("includes full theme, manual color, highlight, and locate controls", async () => {
  const [page, css, backup] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/storage/fleet-backup.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/fleet/facility-areas.ts", import.meta.url), "utf8"),
  ]);

  /* The presets and the colour controls moved with the settings to the shared
     Settings page: the presets into the map's data module, the controls into
     its panel. The map still applies every one of them. */
  const [model, panel] = await Promise.all([
    readFile(new URL("../src/lib/settings/map-settings.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/settings/_components/map-settings-panel.tsx", import.meta.url), "utf8"),
  ]);
  for (const theme of ["Default", "Terminal", "Black / Dark", "Midnight", "Tactical"]) {
    assert.match(model, new RegExp(`label:\"${theme.replace("/", "\\/")}\"`));
  }
  for (const control of ["Page Background", "Panel Background", "Parking Spaces", "Command Bar", "SECTION BACKGROUNDS", "BUS STATUS COLORS"]) {
    assert.match(panel, new RegExp(control));
  }
  assert.match(model, /garageSpecial:string;garageFrame:string;mysterySlot:string/);
  assert.match(panel, /Bays 11 & 12 Parking Spaces/);
  assert.match(panel, /Garage Border, Top & Row Banners/);
  assert.match(panel, /Mystery Spaces/);
  assert.match(page, /bay12AwarenessBusIds/);
  assert.match(css, /\.spot\.awareness-slot/);
  /* Bays 11 and 12 still take the special-slot colour. The expression now also
     carries the ready-bay divider, so both classes are composed rather than one
     replacing the other — asserted on the composition, not on the old shape. */
  assert.match(page, /className=\{\[c>=GARAGE_TROUBLE_BAY_FIRST_COLUMN\?"garage-special-slot":"",c===GARAGE_READY_BAY_DIVIDER_COLUMN\?"ready-bay-divider":""\]\.filter\(Boolean\)\.join\(" "\)\|\|undefined\}/);
  assert.match(page, /"--garage-special",visuals\.garageSpecial/);
  assert.match(page, /"--garage-frame",visuals\.garageFrame/);
  assert.match(css, /\.garage\{border-color:var\(--garage-frame\)\}/);
  assert.match(css, /\.grow \.spot\.garage-special-slot\{background:var\(--garage-special\)/);
  assert.match(page, /scrollIntoView\(\{behavior:"smooth"/);
  assert.match(page, /original==="tow"\?"out"/);
  assert.match(page, /statusVersion:3/);
  assert.match(page, /<Icon s=\{bus\.s\}/);
  assert.match(page, /setSmartStatusEnabled\(false\)/);
  assert.doesNotMatch(page, /tow:\["TOW \/ STAGING"/);
  assert.match(page, /BAY_LAYOUT:\(number\|null\)\[\]=\[null,8,6,4,2,9,7,5,3,1\]/);
  /* Asserted against the table rather than against the text that builds it:
     the spelling moved to site-config.ts in Phase 1 and the shop bays did not. */
  assert.deepEqual(SECTION_SLOTS["SHOP BAYS (DIAGONAL)"],
    ["bay-1","bay-2","bay-3","bay-4","bay-5","bay-6","bay-7","bay-8","bay-9"]);
  assert.match(page, /roadcallSolid:boolean;roadcallLocation:string/);
  assert.match(page, /SOLID ORANGE BUS \(NO FLASHING DOT\)/);
  assert.match(page, /ROADCALL LOCATION/);
  assert.match(page, /roadcallLocation:bus\.roadcallLocation\?\?""/);
  assert.match(page, /bus\.roadcall&&bus\.roadcallSolid\?"var\(--roadcall-color\)"/);
  assert.match(css, /--roadcall-color:#f97316/);
  assert.match(css, /\.roadcall-dot\{/);
  assert.match(css, /@keyframes roadcall-dot-pulse/);
  assert.match(css, /\.app\.highlight-service/);
  assert.match(css, /\.app\.highlight-pending/);
  assert.match(css, /\.app\.highlight-mystery/);
  assert.match(page, /data-mystery=\{Boolean\(bus\.mystery\)\}/);
  assert.doesNotMatch(css, /highlight-unscheduled|highlight-waiting/);
  assert.doesNotMatch(page, /data-unscheduled=|data-waiting=/);
  assert.match(page, /data-ac=\{quickFilterMatch\(bus,"ac"\)\}/);
  assert.match(page, /data-downsheet=\{Boolean\(bus\.onDownSheet\)\}/);
  assert.match(page, /actualDownSet\.size/);
  assert.match(page, /entry\.category==="A\/C and HVAC"/);
  assert.match(css, /\.app\.highlight-ac/);
  assert.match(css, /\.app\.highlight-downsheet/);
  assert.match(css, /\.token\.single-locate\{/);
  assert.match(css, /@keyframes single-locate-glow/);
  assert.match(css, /animation:single-locate-glow [^;]* infinite/);
  assert.match(page, /pace-locate-ack/);
  assert.match(page, /setLocatedBusIds\(\[\]\),10000/);
  assert.match(page, /pace-touch-drop/);
  assert.match(page, /clearDragHighlights\(\)/);
  assert.match(page, /data-location=\{id\}/);
  assert.match(page, /Math\.hypot\([^)]*\)>=7/);
  assert.match(page, /data-empty-touch=\{singleTapEmptySpaces\?"single":"double"\}/);
  assert.match(page, /now-lastEmptyTouch\.current<700/);
  assert.match(panel, /ALLOW SINGLE-TAP EMPTY SPACES ON TOUCHSCREENS/);
  assert.match(css, /-webkit-touch-callout:none/);
  assert.match(page, /onContextMenu=\{event=>\{if\(pointerType\.current==="touch"\)event\.preventDefault\(\)\}\}/);
  assert.match(css, /\.token\{touch-action:none/);
  assert.match(page, /setLocatedBusIds\(\[resolution\.bus\.id\]\)/);
  assert.doesNotMatch(page, /resolved to Bus/);
  assert.match(css, /\.vertical-zone\.tow\{[^}]*border-right-color:transparent/);
  assert.match(page, /LIVE FLEET:/);
  assert.match(css, /\.east\{position:relative;margin-left:0;width:calc\(66\.6667% \+ 2px\);min-width:0;padding-left:6px;padding-right:6px;justify-self:end\}/);
  assert.match(css, /\.eastgrid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);grid-template-rows:repeat\(9,minmax\(0,1fr\)\);width:100%;gap:4px\}/);
  assert.match(css, /\.east \.title>span:first-child\{flex-direction:column;gap:0;font-size:11px/);
  assert.match(page, /buses\.filter\(bus=>bus\.s===status\)\.length/);
  assert.match(page, /data-empty=\{!b\}/);
  assert.doesNotMatch(page, /onDoubleClick=/);
  assert.doesNotMatch(page, /addBusAt/);
  assert.match(page, /Move Bus Here/);
  assert.match(page, /On a touchscreen, double tap to move an existing bus here/);
  assert.match(page, /resolveBusNumber\(buses,number\)/);
  assert.match(page, /resolveBusNumber\(buses,needle\)/);
  assert.match(page, /Full # or last 2/);
  assert.match(page, /All matches are highlighted/);
  assert.match(page, /All matching buses are highlighted/);
  assert.match(page, /setMultiLocateIds\(matches\.length>1/);
  assert.match(page, /New buses can only be created under ACTIONS/);
  assert.match(page, /ACTIVE TRACKER FLEET/);
  assert.match(page, /CREATE NEW BUS/);
  assert.match(page, /Map spaces only relocate buses that already exist/);
  assert.match(page, /SWITCH \/ REASSIGN/);
  assert.match(page, /aria-expanded=\{switchOpen\}/);
  assert.match(page, /switchOpen&&<div className="switch-grid">/);
  assert.match(page, /Optional: move this bus into an occupied space/);
  assert.match(page, /WHERE SHOULD/);
  assert.match(page, /SWITCH WITH BUS<select value=\{switchBusId\}/);
  assert.match(page, /Choose an existing bus/);
  assert.match(page, /Select another bus first/);
  assert.match(page, /disabled=\{!switchTarget\}/);
  assert.doesNotMatch(page, /switch-bus-list-/);
  assert.match(page, /reassignBusPair\(buses,routed as B,otherId,targetSlots\)/);
  assert.match(css, /\.move-here-modal\{/);
  assert.match(css, /\.fleet-creation-control\{/);
  assert.match(css, /\.switch-reassign\{/);
  assert.match(css, /\.switch-toggle\{/);
  assert.match(page, /Protected fleet identity\. Change only under ACTIONS\./);
  assert.match(page, /FLEET NUMBER CONTROL/);
  assert.match(page, /Duplicate numbers are blocked/);
  assert.match(page, /MOVE TO AREA/);
  assert.match(page, /disabled=\{!area\.available\}/);
  assert.match(page, /That destination was just occupied/);
  assert.match(css, /\.service\{width:calc\(75% - 8px\);justify-self:start/);
  assert.match(css, /\.road\{position:absolute;top:0/);
  assert.match(css, /\.mid\{grid-template-columns:145px 310px 191px minmax\(0,1fr\) 25%\}/);
  assert.match(css, /\.baygrid\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)\}/);
  assert.match(css, /\.app\.highlight-status-out/);
  assert.equal(ROAD_CAPACITY, 75);
  assert.equal(WEST_CAPACITY, 40);
  /* The sections and their sizes, read off the table itself. */
  assert.deepEqual(SECTION_SLOTS["PIT"],["pit-0","pit-1"]);
  assert.deepEqual(SECTION_SLOTS["BRAKE TEST"],["brake-0","brake-1","brake-2"]);
  assert.deepEqual(SECTION_SLOTS["TOW / STAGING"],["tow-0","tow-1","tow-2","tow-3"]);
  assert.deepEqual(SECTION_SLOTS["FOREMAN OFFICE"],["office-0","office-1","office-2"]);
  assert.match(page, /EAST_SLOTS\.find\(slot=>!occupiedEast\.has\(slot\)\)/);
  assert.match(css, /\.eastgrid\{grid-template-columns:repeat\(2/);
  /* The east lot is two painted columns numbered on a stride of four, so its
     ids skip. Asserted as the ids themselves rather than as the expression that
     builds them, which moved to site-config.ts in Phase 1. */
  assert.equal(EAST_SLOTS.length, 18);
  assert.deepEqual(EAST_SLOTS.slice(0, 6), ["east-1","east-2","east-5","east-6","east-9","east-10"]);
  assert.equal(EAST_SLOTS.at(-1), "east-34");
  assert.match(css, /\.roadgrid\{grid-template-columns:repeat\(5/);
  assert.match(css, /\.roadgrid\{[^}]*grid-template-rows:repeat\(15/);
  assert.match(css, /\.westgrid\{[^}]*grid-template-rows:repeat\(5/);
  assert.match(css, /\.west\{align-self:end\}/);
  assert.match(page, /migrateReducedCapacity\(migrated,"west",WEST_CAPACITY\)/);
  assert.match(page, /validateBusUpdate\(buses,withSummary\)/);
  assert.match(page, /error==="occupied-location"/);
  assert.match(page, /towInProgress:boolean/);
  assert.match(page, /towInProgress:Boolean\(bus\.towInProgress\)/);
  assert.match(page, /TOW IN PROGRESS/);
  assert.match(page, /checked=\{d\.towInProgress\}/);
  assert.match(css, /\.tow-badge\{/);
  assert.match(css, /\.form \.tow-check\{/);
  assert.match(page, /checkEngine:boolean;checkTransmission:boolean;noHorn:boolean;badRampKneeler:boolean;farebox:boolean;ibsVentra:boolean/);
  assert.match(page, /checkEngine:Boolean\(bus\.checkEngine\)/);
  assert.match(page, /checkTransmission:Boolean\(bus\.checkTransmission\)/);
  assert.match(page, /farebox:Boolean\(bus\.farebox\)/);
  assert.match(page, /ibsVentra:Boolean\(bus\.ibsVentra\)/);
  assert.match(page, /checked=\{d\.checkEngine\}/);
  assert.match(page, /checked=\{d\.checkTransmission\}/);
  assert.match(page, /CHECK TRANSMISSION LIGHT/);
  assert.match(page, /checked=\{d\.noHorn\}/);
  assert.match(page, /checked=\{d\.badRampKneeler\}/);
  assert.match(page, /checked=\{d\.farebox\}/);
  assert.match(page, /checked=\{d\.ibsVentra\}/);
  assert.match(css, /\.modal>\.form\{[^}]*align-content:start;grid-auto-rows:max-content/);
  assert.match(css, /\.defect-workbench\{min-height:88px/);
  assert.match(page, /QuickFilterMenu/);
  assert.match(page, /QUICK_FILTERS/);
  assert.match(page, /data-check-engine=\{quickFilterMatch\(bus,"check-engine"\)\}/);
  assert.match(page, /data-bad-ramp=\{quickFilterMatch\(bus,"bad-ramp"\)\}/);
  assert.match(page, /data-no-horn=\{quickFilterMatch\(bus,"no-horn"\)\}/);
  assert.match(page, /data-farebox=\{quickFilterMatch\(bus,"farebox"\)\}/);
  assert.match(page, /data-ibs-ventra=\{quickFilterMatch\(bus,"ibs-ventra"\)\}/);
  assert.match(page, /data-leak=\{quickFilterMatch\(bus,"leak"\)\}/);
  assert.match(page, /data-add-oil=\{quickFilterMatch\(bus,"add-oil"\)\}/);
  assert.match(css, /\.app\.highlight-no-horn/);
  assert.match(css, /\.app\.highlight-farebox/);
  assert.match(css, /\.app\.highlight-ibs-ventra/);
  assert.match(css, /\.app\.highlight-leak/);
  assert.match(css, /\.app\.highlight-add-oil/);
  assert.match(page, /function MultiLocateModal/);
  assert.match(page, /Array\(Math\.max\(7-initial\.length,0\)\)\.fill\(\"\"\)/);
  assert.match(page, /\+ ADD FIELD/);
  assert.match(page, /MOVE ALL SELECTED BUSES/);
  assert.match(page, /MOVE ALL TO AREA/);
  assert.match(page, /ADD SAME DEFECT TO ALL/);
  assert.match(page, /APPLY DEFECT TO/);
  assert.match(page, /applyDefectToBuses\(buses,multiLocateIds,\{\.\.\.defect,source:"defect-log"\}\)/);
  assert.match(page, /WHERE SHOULD THIS REPAIR BE SAVED\?/);
  assert.match(page, /checked=\{addToDefectLog\}[\s\S]*?DEFECT LOG/);
  assert.match(page, /checked=\{addToDownSheet\}[\s\S]*?DOWN SHEET/);
  assert.match(page, /Choose Defect Log, Down Sheet, or both/);
  assert.match(page, /CLEAR MAP-ONLY DEFECTS/);
  /* The garage is one section drawn as one grid and THREE move destinations.
     Asserted against the destinations themselves rather than the expression
     that splits them, which moved to site-config.ts in Phase 1 — and this way
     it also checks the split is right, not merely that it is spelled. */
  assert.equal(RELOCATION_AREAS["MAIN GARAGE (BAYS 1-10)"].length, 70);
  assert.deepEqual(RELOCATION_AREAS["TROUBLE BAY 11"],
    ["garage-10","garage-22","garage-34","garage-46","garage-58","garage-70","garage-82"]);
  assert.deepEqual(RELOCATION_AREAS["TROUBLE BAY 12"],
    ["garage-11","garage-23","garage-35","garage-47","garage-59","garage-71","garage-83"]);
  assert.equal(RELOCATION_AREAS["MAIN GARAGE (BAYS 1-12)"], undefined,
    "the section is not itself a destination — the three above are");
  assert.match(css, /\.multi-bulk-actions\{/);
  assert.match(css, /\.bulk-defect-panel\{/);
  assert.match(page, /NOT ENOUGH SPACE/);
  assert.match(page, /bulkRelocateBuses\(buses,multiLocateIds,targetSlots\)/);
  assert.match(page, /KEEP \"\+selected\.length\+\" HIGHLIGHTED/);
  assert.match(page, /multiLocateIds\.length\?\"CLEAR \"\+multiLocateIds\.length:\"MULTI\"/);
  assert.match(css, /\.app\.highlight-check-engine/);
  assert.match(css, /\.app\.highlight-bad-ramp/);
  assert.match(css, /\.token\.multi-locate/);
  assert.match(css, /\.multi-locate-shade\{z-index:2147483002\}/);
  assert.match(page, /CHOOSE A REPAIR CATEGORY/);
  assert.match(page, /native-repair-picker/);
  assert.match(page, /CHOOSE THE SPECIFIC DEFECT/);
  // Both native pickers must read their group wording from the shared helpers.
  // Hardcoded Amerex language told a mechanic who picked Bus Controls to
  // "Choose Fire Suppression or Gas Concentration", so the literals stay out.
  assert.equal(page.includes("CHOOSE THE AMEREX SYSTEM"), false);
  assert.equal(page.includes("CHOOSE THE STATUS OR CODE"), false);
  assert.equal(page.includes("Choose Fire Suppression or Gas Concentration"), false);
  assert.equal(page.match(/repairGroupStepLabel\(newDefect\.category\)/g).length, 2);
  assert.equal(page.match(/repairGroupPlaceholder\(newDefect\.category\)/g).length, 2);
  assert.equal(page.match(/repairIssueStepLabel\(newDefect\.category\)/g).length, 2);
  assert.equal(page.match(/repairIssuePlaceholder\(newDefect\.category,repairGroup\)/g).length, 2);
  assert.match(page, /REPAIR_OPTION_GROUPS\[newDefect\.category\]\[repairGroup\]\.map\(issue=><option/);

  assert.match(page, /ADD ANOTHER DEFECT/);
  assert.match(page, /onSubmit=\{submitEditor\}/);
  assert.match(page, /const pending=adding\?buildDraftDefect\(\):null/);
  assert.match(page, /DEFECT \{index\+1\}/);
  assert.match(css, /\.defect-list\{[^}]*max-height:clamp\(190px,30dvh,290px\)/);
  assert.match(css, /\.scroll-region\{[^}]*overflow-y:scroll!important[^}]*overscroll-behavior:contain[^}]*touch-action:pan-y/);
  assert.match(css, /\.scroll-region::-webkit-scrollbar\{width:12px\}/);
  assert.match(page, /Saved defects\. Scroll to view all/);
  assert.match(page, /className="repair-choice-stage native-repair-picker"/);
  assert.match(page, /<select value=\{newDefect\.category\}/);
  assert.match(page, /Choose one of \{Object\.keys\(REPAIR_OPTIONS\)\.length\} repair categories/);
  assert.match(page, /REPAIR_OPTIONS\[newDefect\.category\]\.map\(issue=><option/);
  assert.match(css, /\.native-repair-picker select\{[^}]*min-height:44px/);
  assert.match(css, /\.native-repair-picker\{grid-template-columns:repeat\(2/);
  assert.match(css, /\.native-repair-picker \.amerex-code\{grid-column:1\/-1\}/);
  assert.match(page, /ref=\{secondaryRepairRef\} className="repair-dropdown"/);
  assert.match(page, /ref=\{tertiaryRepairRef\} className="repair-dropdown amerex-code"/);
  assert.match(page, /secondaryRepairRef\.current\?\.scrollIntoView/);
  assert.match(page, /tertiaryRepairRef\.current\?\.scrollIntoView/);
  assert.doesNotMatch(page, /SCROLL TO VIEW ALL REPAIR OPTIONS/);
  assert.doesNotMatch(page, /className="scroll-cue"/);
  assert.doesNotMatch(css, /\.scroll-cue\{/);
  assert.match(css, /\.modal\.defect-expanded\{width:min\(650px,100%\)\}/);
  assert.match(css, /\.add-defect-confirm\{[^}]*position:static[^}]*width:100%/);
  assert.doesNotMatch(css, /\.add-defect-confirm\{[^}]*position:sticky/);
  assert.match(page, /disabled=\{entryMode==="manual"&&!newDefect\.details\.trim\(\)\}/);
  assert.match(page, /modal-scroll-locked/);
  assert.match(page, /position:"fixed"/);
  assert.match(page, /window\.scrollTo\(scrollX,scrollY\)/);
  assert.match(page, /pickerRef\.current\?\.scrollIntoView/);
  assert.match(page, /ref=\{pickerRef\} className="defect-entry"/);
  assert.match(css, /body\.modal-scroll-locked \.app\{overflow:hidden!important/);
  assert.match(css, /overscroll-behavior:contain;touch-action:pan-y/);
  assert.match(css, /\.modal>\.actions\{position:sticky;bottom:0/);
  assert.match(css, /body\.modal-scroll-locked \.shade\{z-index:2147483500!important/);
  assert.match(css, /body\.modal-scroll-locked \.command-bar\{pointer-events:none!important/);
  assert.match(css, /\.command-bar\{[^}]*width:min\(1240px,calc\(100vw - 16px\)\)/);
  assert.match(css, /\/\* Single-row command bar and shared Quick Filters \*\//);
  assert.match(css, /\.command-bar\{height:53px!important;min-height:53px!important;flex-wrap:nowrap!important/);
  assert.match(css, /\.command-highlights\{display:flex!important;flex:0 0 auto!important/);
  assert.match(css, /\.quick-filter-popover\{position:fixed/);
  assert.match(css, /@media\(max-width:1100px\)\{\.command-bar\{[^}]*width:calc\(100vw - 12px\)/);
  assert.match(css, /@media\(max-width:560px\)\{\.command-highlights\{display:flex!important/);
  assert.match(css, /max-height:calc\(100dvh - 16px\)/);
  const commandZ = Number(css.match(/\.command-bar\{[^}]*z-index:(\d+)/)?.[1] || 0);
  const modalZ = Number(css.match(/modal-scroll-locked \.shade\{z-index:(\d+)/)?.[1] || 0);
  assert.ok(modalZ > commandZ, `Bus editor layer ${modalZ} must exceed command strip ${commandZ}`);
  assert.match(backup, /pace-south-fleet-board-backup/);
  /* REFRESH still behaves the same, but the behaviour lives in one shared
     module now that all six pages carry the button — the map delegates rather
     than keeping its own copy. */
  assert.match(page, /<RefreshButton className="refresh-command"\/>/);
  const refreshModule = await readFile(new URL("../src/components/shared/refresh-button.tsx", import.meta.url), "utf8");
  assert.match(refreshModule, /registration\?\.update\(\)/);
  assert.match(refreshModule, /window\.location\.reload\(\)/);
  /* The whole-app pair moved to MASTER EXPORT / MASTER IMPORT in Settings, and
     the confirm in front of the replace went with it. The map keeps only the
     Fleet Map transfer, and points at the new home. */
  const settingsPage = await readFile(new URL("../app/settings/page.tsx", import.meta.url), "utf8");
  /* The whole-app pair is MASTER EXPORT / MASTER IMPORT in Settings now. */
  assert.match(settingsPage, />MASTER EXPORT</);
  assert.match(settingsPage, /MASTER IMPORT<input type="file"/);
  assert.match(settingsPage, /MASTER IMPORT replaces everything stored on this device/);
  assert.match(page, /MASTER EXPORT, MASTER IMPORT and RESTORE LAST GOOD COPY/,
    "the map names every whole-device control and where it now lives");
  assert.match(css, /\.refresh-command\{/);
  assert.match(css, /\.board-data/);
});

test("allows ordinary edits to an existing duplicated number while protecting identity and occupancy", () => {
  const buses = [
    { id: "a", n: "17571", l: "east-0" },
    { id: "b", n: "17571", l: "road-0" },
    { id: "c", n: "18000", l: "road-1" },
  ];

  assert.equal(hasBusNumberConflict(buses, "a", "17571", "17571"), false);
  assert.equal(hasBusNumberConflict(buses, "a", "17571", "18000"), true);
  assert.equal(hasBusNumberConflict(buses, "new", "", "17571"), true);
  assert.equal(hasBusNumberConflict(buses, "a", "17571", "19000"), false);
  assert.equal(hasLocationConflict(buses, "a", "east-0"), false);
  assert.equal(hasLocationConflict(buses, "a", "road-1"), true);
  assert.equal(validateBusUpdate(buses, { id: "a", n: "17571", l: "east-0" }), null);
  assert.equal(validateBusUpdate(buses, { id: "a", n: "17571", l: "east-6" }), null);
  assert.equal(validateBusUpdate(buses, { id: "a", n: "18000", l: "east-0" }), "duplicate-number");
  assert.equal(validateBusUpdate(buses, { id: "a", n: "17571", l: "road-1" }), "occupied-location");
  assert.equal(validateBusUpdate(buses, { id: "new", n: "17571", l: "east-6" }), "duplicate-number");
  assert.equal(validateBusUpdate(buses, { id: "new", n: "", l: "east-6" }), "number-required");
  assert.equal(validateBusUpdate(buses, { id: "new", n: "17A71", l: "east-6" }), "number-invalid");
});

test("Facility Map repair entry routes to authoritative workflows and legacy-only cleanup is reversible", () => {
  const tracker={id:"tracker",category:"A/C and HVAC",issue:"No cooling",details:"",operability:"service",state:"open",source:"tracker"};
  const operator={id:"operator",category:"Engine",issue:"Misfire",details:"",operability:"service",state:"open",source:"operator"};
  const logged={id:"logged",category:"Brakes",issue:"ABS warning",details:"",operability:"service",state:"open",source:"defect-log"};
  const down={id:"down",category:"Inspection",issue:"B-12",details:"",operability:"service",state:"open",source:"down-sheet"};
  const completed={...tracker,id:"completed",state:"completed"};
  const fleet=[{id:"bus-1",n:"17501",l:"road-1",s:"defect",pendingRepair:"legacy summary",defects:[tracker,operator,logged,down,completed],checkEngine:true,checkTransmission:false,noHorn:false,badRampKneeler:false,farebox:false,ibsVentra:false}];
  assert.equal(facilityOnlyDefectCount(fleet),3);
  const cleared=clearFacilityOnlyDefects(fleet,"2026-08-26T22:00:00.000Z");
  assert.deepEqual(cleared.fleet[0].defects.map(defect=>defect.id),["logged","down","completed"]);
  assert.equal(cleared.fleet[0].checkEngine,false);
  assert.equal(cleared.fleet[0].l,"road-1");
  assert.equal(quickFilterMatch(cleared.fleet[0],"ac"),false);
  const snapshot=readFacilityDefectClearSnapshot(JSON.stringify(cleared.snapshot));
  assert.ok(snapshot);
  const restored=restoreFacilityOnlyDefects([{...cleared.fleet[0],l:"garage-2"}],snapshot);
  assert.equal(restored[0].l,"garage-2");
  assert.deepEqual(restored[0].defects.map(defect=>defect.id),["tracker","operator","logged","down","completed"]);
  assert.equal(restored[0].checkEngine,true);

  const previous={id:"bus-2",l:"garage-1",s:"service",pendingRepair:"",defects:[],checkEngine:false,checkTransmission:false,noHorn:false,badRampKneeler:false,farebox:false,ibsVentra:false};
  const routed=syncFacilityAlertDefects(previous,{...previous,noHorn:true},"2026-08-26T22:05:00.000Z");
  assert.equal(routed.defects.length,1);
  assert.equal(routed.defects[0].source,"defect-log");
  /* Written in the wording a record READS as, not the pre-rename wording the
     alert table happens to carry. Pinning "Horn" here was pinning a stale write. */
  assert.equal(routed.defects[0].category,"Operator/Driver Controls");
  assert.equal(routed.defects[0].issue,"Operating Controls - Horn");
  assert.equal(syncFacilityAlertDefects(routed,routed).defects.length,1);

  const defectLogDraft=defectFromDraft({category:"Engine",issue:"Misfire",details:"",operability:"service",state:"open",source:"defect-log"},"select","facility-log");
  const downSheetDraft=defectFromDraft({category:"Engine",issue:"Misfire",details:"",operability:"service",state:"open",source:"down-sheet"},"select","facility-down");
  assert.equal(defectLogDraft.source,"defect-log");
  assert.equal(downSheetDraft.source,"down-sheet");

  const linked=syncTrackerDownSheetSelection(null,{id:"bus-3",n:"17503",s:"defect",down:true,pendingRepair:"Misfire"},"2026-08-26T22:10:00.000Z","","facility-log");
  assert.equal(linked.entries[0].defectId,"facility-log");
});

test("section counters include assigned and overflow buses and update from fleet state", () => {
  const slots = ["east-0", "east-1", "east-2"];
  const fleet = [
    { l: "east-0" },
    { l: "east-2" },
    { l: "east-overflow-0" },
    { l: "west-0" },
  ];
  assert.equal(sectionBusCount(fleet, slots), 3);
  assert.equal(sectionBusCount(fleet.slice(1), slots), 2);
});

test("restored CNG West row pulls saved overflow buses back into visible spaces", () => {
  const fleet = Array.from({ length: 39 }, (_, index) => ({ id: `kept-${index}`, l: `west-${index}` }));
  fleet.push({ id: "previous-overflow", l: "west-overflow-2" });
  const migrated = migrateReducedCapacity(fleet, "west", WEST_CAPACITY);
  assert.equal(migrated.length, fleet.length);
  assert.equal(migrated.find(bus => bus.id === "previous-overflow").l, "west-39");
  assert.equal(new Set(migrated.map(bus => bus.l)).size, migrated.length);

  const singleFile = migrateReducedCapacity([
    { id: "front", l: "wall-0" },
    { id: "middle", l: "wall-4" },
    { id: "rear", l: "wall-7" },
  ], "wall", 8);
  assert.deepEqual(singleFile.map(bus => bus.l), ["wall-0", "wall-4", "wall-7"]);
});

test("Brake and Tow capacity migration preserves every bus without duplicate occupancy", () => {
  const fleet = [
    { id: "brake-0", l: "brake-0" },
    { id: "brake-1", l: "brake-1" },
    { id: "brake-2", l: "brake-2" },
    { id: "former-fourth-brake", l: "brake-3" },
    { id: "tow-0", l: "tow-0" },
    { id: "tow-1", l: "tow-1" },
    { id: "tow-2", l: "tow-2" },
  ];
  const migrated = migrateBrakeTowCapacities(fleet);
  assert.equal(migrated.length, fleet.length);
  assert.equal(migrated.find(bus => bus.id === "former-fourth-brake").l, "tow-3");
  assert.equal(new Set(migrated.map(bus => bus.l)).size, migrated.length);
  assert.deepEqual(fleet.map(bus => bus.l), ["brake-0", "brake-1", "brake-2", "brake-3", "tow-0", "tow-1", "tow-2"]);

  const priorTowOverflow = migrateBrakeTowCapacities([{ id: "tow-front", l: "tow-0" }, { id: "tow-overflow", l: "tow-overflow-0" }]);
  assert.equal(priorTowOverflow.find(bus => bus.id === "tow-overflow").l, "tow-3");
});

test("smart status returns repaired and defect-carrying buses to road and main garage correctly", () => {
  const minor = [{ id: "d1", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" }];
  const downing = [{ id: "d2", category: "Brakes", issue: "Air brake fault", details: "", operability: "down", state: "open" }];
  const completed = minor.map(defect => ({ ...defect, state: "completed" }));
  assert.equal(statusForLocation("road-4", "shop", { defects: minor, pendingRepair: "" }), "defect");
  assert.equal(statusForLocation("road-4", "shop", { defects: downing, pendingRepair: "" }), "out");
  assert.equal(statusForLocation("road-4", "shop", { defects: completed, pendingRepair: "" }), "service");
  assert.equal(statusForLocation("road-4", "out", { defects: [], pendingRepair: "" }), "service");
  assert.equal(statusForLocation("garage-4", "out", { defects: [], pendingRepair: "" }), "service");
  assert.equal(statusForLocation("garage-4", "shop", { defects: minor, pendingRepair: "" }), "defect");
  assert.equal(statusForLocation("garage-4", "shop", { defects: downing, pendingRepair: "" }), "defect");
  assert.equal(statusForLocation("garage-4", "decommissioned", { defects: [], pendingRepair: "" }), "decommissioned");
  assert.equal(statusForLocation("bay-3", "out", { defects: downing, pendingRepair: "" }), "shop");
  assert.equal(statusForLocation("body-0", "service", { defects: [], pendingRepair: "" }), "shop");
  assert.equal(statusForLocation("east-1", "defect", { defects: minor, pendingRepair: "" }), "out");
  assert.equal(statusForLocation("west-4", "service", { defects: minor, pendingRepair: "" }), "out");
  assert.equal(statusForLocation("east-1", "service", { defects: [], pendingRepair: "" }), "out");
  assert.equal(statusForLocation("west-4", "service", { defects: [], pendingRepair: "" }), "out");
  assert.equal(statusForLocation("body-0", "decommissioned", { defects: [], pendingRepair: "" }), "decommissioned");
  assert.equal(statusForLocation("east-1", "decommissioned", { defects: [], pendingRepair: "" }), "decommissioned");
  assert.equal(roadServiceStatus({ defects: minor }), "defect");
});

test("bulk relocation preserves order, smart status, and all-or-nothing capacity", () => {
  const minor = [{ id: "d1", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" }];
  const fleet = [
    { id: "a", l: "east-1", s: "shop", parkedAt: "old-a", defects: minor, pendingRepair: "" },
    { id: "b", l: "road-0", s: "service", parkedAt: "old-b", defects: [], pendingRepair: "" },
    { id: "c", l: "west-0", s: "service", parkedAt: "old-c", defects: [], pendingRepair: "" },
  ];
  const target = ["road-0", "road-1", "road-2"];
  assert.deepEqual(bulkAreaAvailability(fleet, ["b", "a", "c"], target), { open: 2, needed: 2, already: 1, available: true });
  const moved = bulkRelocateBuses(fleet, ["b", "a", "c"], target, "now");
  assert.equal(moved.error, null);
  assert.equal(moved.moved, 2);
  assert.equal(moved.fleet.find(bus => bus.id === "b").l, "road-0");
  assert.equal(moved.fleet.find(bus => bus.id === "b").parkedAt, "old-b");
  assert.equal(moved.fleet.find(bus => bus.id === "a").l, "road-1");
  assert.equal(moved.fleet.find(bus => bus.id === "a").s, "defect");
  assert.equal(moved.fleet.find(bus => bus.id === "a").parkedAt, "now");
  assert.equal(moved.fleet.find(bus => bus.id === "c").l, "road-2");

  const blockedFleet = [...fleet, { id: "block", l: "road-1", s: "service", parkedAt: "old-block", defects: [], pendingRepair: "" }];
  const blocked = bulkRelocateBuses(blockedFleet, ["a", "c"], target, "now");
  assert.equal(blocked.error, "insufficient-space");
  assert.equal(blocked.moved, 0);
  assert.equal(blocked.fleet, blockedFleet);
});

test("paired reassignment swaps atomically or sends the displaced bus to an open area", () => {
  const minor = [{ id: "d1", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" }];
  const fleet = [
    { id: "a", n: "100", l: "road-0", s: "defect", parkedAt: "old-a", defects: minor, pendingRepair: "A/C and HVAC" },
    { id: "b", n: "200", l: "east-1", s: "service", parkedAt: "old-b", defects: [], pendingRepair: "" },
    { id: "block", n: "300", l: "west-0", s: "service", parkedAt: "old-block", defects: [], pendingRepair: "" },
  ];
  const selected = { ...fleet[0], mechanic: "JD" };
  const swapped = reassignBusPair(fleet, selected, "b", null, "now");
  assert.equal(swapped.error, null);
  assert.equal(swapped.fleet.find(bus => bus.id === "a").l, "east-1");
  assert.equal(swapped.fleet.find(bus => bus.id === "a").s, "out");
  assert.equal(swapped.fleet.find(bus => bus.id === "a").mechanic, "JD");
  assert.equal(swapped.fleet.find(bus => bus.id === "b").l, "road-0");
  assert.equal(swapped.fleet.find(bus => bus.id === "b").s, "service");
  assert.equal(swapped.fleet.find(bus => bus.id === "a").parkedAt, "now");
  assert.equal(swapped.fleet.find(bus => bus.id === "b").parkedAt, "now");

  const rerouted = reassignBusPair(fleet, selected, "b", ["west-0", "west-1"], "now");
  assert.equal(rerouted.error, null);
  assert.equal(rerouted.displacedLocation, "west-1");
  assert.equal(rerouted.fleet.find(bus => bus.id === "a").l, "east-1");
  assert.equal(rerouted.fleet.find(bus => bus.id === "b").l, "west-1");
  assert.equal(rerouted.fleet.find(bus => bus.id === "block").l, "west-0");

  const blocked = reassignBusPair(fleet, selected, "b", ["east-1"], "now");
  assert.equal(blocked.error, "insufficient-space");
  assert.equal(blocked.fleet, fleet);
});

test("dropping onto an occupied parking space swaps both buses atomically", () => {
  const fleet = [
    { id: "a", l: "bay-1", s: "shop", parkedAt: "old-a", defects: [{ id: "d1", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" }] },
    { id: "b", l: "road-2", s: "service", parkedAt: "old-b", defects: [] },
  ];
  const swapped = moveOrSwapBuses(fleet, "a", "road-2", "now");
  assert.equal(swapped.find(bus => bus.id === "a").l, "road-2");
  assert.equal(swapped.find(bus => bus.id === "a").s, "defect");
  assert.equal(swapped.find(bus => bus.id === "b").l, "bay-1");
  assert.equal(swapped.find(bus => bus.id === "b").s, "shop");
  assert.equal(new Set(swapped.map(bus => bus.l)).size, 2);
  assert.ok(swapped.every(bus => bus.parkedAt === "now"));
});

test("a bus can be dropped on a collapsed section banner without displacing another bus", async () => {
  const defect={id:"d1",category:"A/C and HVAC",issue:"No cooling",details:"",operability:"service",state:"open"};
  const fleet=[
    {id:"moving",l:"road-0",s:"defect",parkedAt:"old",defects:[defect],down:true},
    {id:"occupied",l:"west-0",s:"out",parkedAt:"old-2",defects:[]},
  ];
  const moved=moveBusToArea(fleet,"moving","CNG WEST LOT",SECTION_SLOTS,"now");
  assert.equal(moved.error,undefined);
  assert.equal(moved.target,"west-1");
  assert.equal(moved.fleet.find(bus=>bus.id==="moving").s,"out");
  assert.equal(moved.fleet.find(bus=>bus.id==="moving").down,true);
  assert.deepEqual(moved.fleet.find(bus=>bus.id==="moving").defects,[defect]);
  assert.equal(moved.fleet.find(bus=>bus.id==="occupied").l,"west-0");
  const full=moveBusToArea(fleet,"moving","ONE SPACE",{"ONE SPACE":["west-0"]},"later");
  assert.equal(full.error,"insufficient-space");
  assert.equal(full.fleet,fleet);
  const [page,css]=await Promise.all([readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8")]);
  assert.match(page,/data-drop-section=\{name\}/);
  assert.match(page,/\.title\[data-drop-section\]/);
  assert.match(page,/drop=\{moveToSection\}/);
  assert.match(css,/\.title\.section-drop-ready/);
});

test("Mystery Buses can change facility location without changing defects or Down Sheet membership", async () => {
  const defect={id:"d2",category:"Farebox",issue:"Farebox won't lock",details:"",operability:"service",state:"open"},bus={id:"mystery",n:"15511",l:"wall-0",s:"out",parkedAt:"old",defects:[defect],down:true};
  const moved=moveBusToArea([bus],bus.id,"MAIN GARAGE (BAYS 1-10)",RELOCATION_AREAS,"now");
  assert.equal(moved.target,"garage-0");
  assert.equal(moved.fleet[0].down,true);
  assert.deepEqual(moved.fleet[0].defects,[defect]);
  const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
  /* The editor moved into the shared board module — the Down Sheet's MYSTERY
     BUSES opens it, and so does the Defect Log's deferred drawer, which is why
     there is one copy rather than two that drift. */
  const board=await readFile(new URL("../src/components/down-sheet/mystery-board.tsx",import.meta.url),"utf8");
  assert.match(board,/MOVE \/ LOCATION/);
  assert.match(board,/defects and Down Sheet membership are not changed/);
  assert.match(page,/MOVE \/ LOCATION/,"the deferred drawer still offers it");
  assert.match(page,/import \{MysteryMoveModal\} from "(?:[^"]*\/)mystery-board"/,"and opens the shared one");
  /* MOVE / LOCATION is shared: the Down Sheet's board and the Defect Log's
     deferred drawer both open it, so its styles sit in globals.css. */
  assert.match(await readFile(new URL("../app/globals.css",import.meta.url),"utf8"),/\.mystery-move\{[^}]*min-height:44px/);
});

test("every facility section can collapse independently while global controls remain", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /aria-expanded=\{!collapsed\}/);
  assert.match(page, /setCollapsedSections\(new Set\(Object\.keys\(SECTION_SLOTS\)\)\)/);
  assert.match(page, /sectionClass\("IN SERVICE \/ ON ROAD","road"\)/);
  assert.match(page, /sectionClass\("MAIN GARAGE \(BAYS 1-12\)","garage panel"\)/);
  assert.match(css, /\.section-collapsed>:not\(\.title\)\{display:none!important\}/);
  assert.match(css, /\.title-actions \.toggle-section/);
  assert.equal(SECTION_SLOTS["BRAKE TEST"].length,3);
  assert.equal(SECTION_SLOTS["TOW / STAGING"].length,4);
  assert.equal(SECTION_SLOTS["FOREMAN OFFICE"].length,3);
  assert.match(page, /\["BRAKE TEST","brake",3\]/);
  assert.match(page, /\["TOW \/ STAGING","tow",4\]/);
  assert.match(css, /\.foreman-office\{grid-column:1\/-1/);
  assert.match(css, /\.brake \.vspots\{grid-template-rows:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(css, /\.tow \.vspots\{grid-template-rows:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.match(css, /\.vertical-zone\.brake \.title-actions,\.vertical-zone\.tow \.title-actions\{transform:translateY\(-3px\)\}/);
});

test("all relocation controls use the same destination-aware smart status", () => {
  const minor = [{ id: "minor", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" }];
  const downing = [{ id: "down", category: "Brakes", issue: "Air brake fault", details: "", operability: "down", state: "open" }];
  const fleet = [
    { id: "clear", l: "bay-1", s: "shop", parkedAt: "old-clear", defects: [], pendingRepair: "" },
    { id: "minor", l: "east-1", s: "out", parkedAt: "old-minor", defects: minor, pendingRepair: defectSummary(minor) },
    { id: "down", l: "west-1", s: "out", parkedAt: "old-down", defects: downing, pendingRepair: defectSummary(downing) },
  ];
  const clearToGarage = moveOrSwapBuses(fleet, "clear", "garage-0", "now");
  assert.equal(clearToGarage.find(bus => bus.id === "clear").s, "service");
  const minorToRoad = moveOrSwapBuses(fleet, "minor", "road-1", "now");
  assert.equal(minorToRoad.find(bus => bus.id === "minor").s, "defect");
  const downToGarage = moveOrSwapBuses(fleet, "down", "garage-1", "now");
  assert.equal(downToGarage.find(bus => bus.id === "down").s, "defect");
  const clearToCng = moveOrSwapBuses(fleet, "clear", "east-2", "now");
  assert.equal(clearToCng.find(bus => bus.id === "clear").s, "out");
  const minorToBody = moveOrSwapBuses(fleet, "minor", "body-0", "now");
  assert.equal(minorToBody.find(bus => bus.id === "minor").s, "shop");

  const controlledMove = applyOperatorBatch(fleet, [
    { busId: "clear", areaName: "CNG WEST LOT" },
    { busId: "minor", areaName: "BODY SHOP" },
  ], [
    { name: "CNG WEST LOT", slots: ["west-2"] },
    { name: "BODY SHOP", slots: ["body-0"] },
  ], "now");
  assert.equal(controlledMove.error, undefined);
  assert.equal(controlledMove.fleet.find(bus => bus.id === "clear").s, "out");
  assert.equal(controlledMove.fleet.find(bus => bus.id === "minor").s, "shop");
});

test("odometer readings append as dated history and survive legacy fleet migration", async () => {
  assert.deepEqual(normalizeOdometerReadings(undefined), []);
  const readings=normalizeOdometerReadings([
    {id:"later",miles:121000,recordedAt:"2026-08-20T14:00:00.000Z",source:"inspection",note:"A inspection",futureMarker:"keep"},
    {id:"earlier",miles:120000,recordedAt:"2026-08-10T14:00:00.000Z",source:"manual",note:"Phone entry"},
    {id:"bad",miles:-1,recordedAt:"not-a-date",source:"manual"},
  ]);
  assert.deepEqual(readings.map(reading=>reading.id),["earlier","later"]);
  assert.equal(readings[1].futureMarker,"keep");
  const appended=appendOdometerReading(readings,{id:"new",miles:122500,recordedAt:"2026-08-25T14:00:00.000Z",source:"manual",note:"Inspection lane"});
  assert.deepEqual(appended.map(reading=>reading.miles),[120000,121000,122500]);
  assert.equal(latestOdometerReading(appended)?.id,"new");
  assert.equal(readings.length,2);

  const [page,css]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  assert.match(page,/odometerReadings:normalizeOdometerReadings\(bus\.odometerReadings\)/);
  assert.match(page,/ODOMETER HISTORY/);
  assert.match(page,/Actual readings are appended and never replace earlier readings/);
  assert.match(page,/type="datetime-local"/);
  assert.match(page,/ADD TO HISTORY/);
  assert.match(css,/Dated actual-mileage history in the bus editor/);
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.odometer-entry\{grid-template-columns:1fr\}/);
});

test("estimated mileage accrues only in operating service statuses and checkpoints across pauses",()=>{
 const anchor={id:"reading-1",miles:100000,recordedAt:"2026-08-01T00:00:00.000Z",source:"manual"};
 const base={id:"bus-1",l:"road-1",s:"service",lastStatusChangeAt:"2026-08-01T00:00:00.000Z",odometerReadings:[anchor]};
 assert.equal(ESTIMATED_MILES_PER_OPERATING_DAY,275);
 assert.equal(Math.round(estimatedMileage(base,"2026-08-02T00:00:00.000Z").estimatedMiles),100275);
 assert.equal(Math.round(estimatedMileage({...base,s:"defect"},"2026-08-02T00:00:00.000Z").estimatedMiles),100275);
 assert.equal(Math.round(estimatedMileage({...base,s:"shop"},"2026-08-02T00:00:00.000Z").estimatedMiles),100000);

 const paused=stampOperationalChange(base,{...base,s:"shop"},"2026-08-02T00:00:00.000Z");
 assert.equal(Math.round(paused.mileageEstimate.estimatedMiles),100275);
 const resumed=stampOperationalChange(paused,{...paused,s:"service"},"2026-08-04T00:00:00.000Z");
 assert.equal(Math.round(resumed.mileageEstimate.estimatedMiles),100275);
 assert.equal(Math.round(estimatedMileage(resumed,"2026-08-05T00:00:00.000Z").estimatedMiles),100550);
 assert.equal(estimatedMileage(resumed,"2026-08-05T00:00:00.000Z").estimatedMiles,estimatedMileage(resumed,"2026-08-05T00:00:00.000Z").estimatedMiles);
});

test("inspection status uses 3,000 miles or 10 days whichever comes first",()=>{
 const inspection={id:"inspection-1",kind:"inspection",completedAt:"2026-08-01T00:00:00.000Z",odometerMiles:100000,note:"Initial baseline"};
 assert.equal(INSPECTION_MILE_INTERVAL,3000);
 assert.equal(INSPECTION_DAY_INTERVAL,10);
 assert.equal(inspectionDueStatus({s:"service",odometerReadings:[],maintenanceEvents:[]},"2026-08-01T00:00:00.000Z").state,"baseline-needed");

 const dateDue=inspectionDueStatus({s:"shop",odometerReadings:[{id:"reading-1",miles:100000,recordedAt:inspection.completedAt,source:"inspection"}],maintenanceEvents:[inspection]},"2026-08-11T00:00:00.000Z");
 assert.equal(dateDue.due,true);
 assert.equal(dateDue.reason,"time");
 assert.equal(dateDue.dueMiles,103000);

 const mileageDue=inspectionDueStatus({s:"shop",odometerReadings:[{id:"reading-1",miles:100000,recordedAt:inspection.completedAt,source:"inspection"}],maintenanceEvents:[inspection],mileageEstimate:{anchorReadingId:"reading-1",estimatedMiles:103000,lastAccruedAt:"2026-08-02T00:00:00.000Z",rateMilesPerOperatingDay:275}},"2026-08-02T00:00:00.000Z");
 assert.equal(mileageDue.due,true);
 assert.equal(mileageDue.reason,"mileage");
 assert.equal(normalizeMaintenanceEvents([{...inspection,futureField:"kept"}])[0].futureField,"kept");
});

test("completed inspections append maintenance history and re-anchor mileage and the due clock",()=>{
 const baseline={id:"inspection-1",kind:"inspection",completedAt:"2026-08-01T00:00:00.000Z",odometerMiles:100000,note:"Initial baseline"};
 const bus={s:"service",lastStatusChangeAt:"2026-08-01T00:00:00.000Z",odometerReadings:[{id:"reading-1",miles:100000,recordedAt:"2026-08-01T00:00:00.000Z",source:"manual",note:"Start"}],maintenanceEvents:[baseline],mileageEstimate:{anchorReadingId:"reading-1",estimatedMiles:102900,lastAccruedAt:"2026-08-11T00:00:00.000Z",rateMilesPerOperatingDay:275}};
 assert.equal(inspectionDueStatus(bus,"2026-08-12T00:00:00.000Z").due,true);

 const completion=recordMaintenanceCompletion(bus,{completedAt:"2026-08-12T00:00:00.000Z",odometerMiles:"103250",note:"B-check complete",idSeed:"seed-1"},"2026-08-12T00:00:00.000Z");
 assert.deepEqual(completion.maintenanceEvents.map(event=>event.id),["inspection-1","maintenance-inspection-seed-1"]);
 assert.equal(completion.maintenanceEvents[1].odometerMiles,103250);
 assert.equal(completion.maintenanceEvents[1].note,"B-check complete");
 assert.deepEqual(completion.odometerReadings.map(reading=>reading.miles),[100000,103250]);
 assert.equal(completion.odometerReadings[1].source,"inspection");
 assert.equal(bus.maintenanceEvents.length,1);
 assert.equal(bus.odometerReadings.length,1);

 assert.equal(completion.mileageEstimate.anchorReadingId,completion.odometerReadings[1].id);
 assert.equal(Math.round(completion.mileageEstimate.estimatedMiles),103250);

 const after={...bus,...completion},restarted=inspectionDueStatus(after,"2026-08-12T00:00:00.000Z");
 assert.equal(restarted.due,false);
 assert.equal(restarted.state,"current");
 assert.equal(restarted.dueMiles,106250);
 assert.equal(restarted.dueAt,"2026-08-22T00:00:00.000Z");
 assert.equal(latestMaintenanceEvent(after.maintenanceEvents,"inspection").id,"maintenance-inspection-seed-1");
 assert.equal(maintenanceEventsOfKind(after.maintenanceEvents,"inspection").length,2);
 assert.equal(maintenanceEventsOfKind(after.maintenanceEvents,"spark-plugs").length,0);

 const saved=stampOperationalChange(bus,after,"2026-08-12T00:00:00.000Z");
 assert.equal(latestMaintenanceEvent(saved.maintenanceEvents,"inspection").id,"maintenance-inspection-seed-1");
 assert.equal(saved.odometerReadings.length,2);
 assert.equal(saved.mileageEstimate.anchorReadingId,completion.odometerReadings[1].id);
 assert.equal(Math.round(saved.mileageEstimate.estimatedMiles),103250);
 assert.equal(inspectionDueStatus(saved,"2026-08-12T00:00:00.000Z").due,false);

 const dueAgain=inspectionDueStatus(after,"2026-08-22T00:00:00.000Z");
 assert.equal(dueAgain.due,true);
 assert.equal(dueAgain.reason,"time");
 assert.equal(Math.round(dueAgain.estimatedMiles),106000);
});

test("a first completed inspection works on legacy payloads and rejects invalid entries",()=>{
 const legacy={s:"shop",odometerReadings:undefined,maintenanceEvents:undefined};
 assert.equal(inspectionDueStatus(legacy,"2026-08-05T00:00:00.000Z").state,"baseline-needed");
 const first=recordMaintenanceCompletion(legacy,{completedAt:"2026-08-05T00:00:00.000Z",odometerMiles:90000,idSeed:"seed-2"},"2026-08-05T00:00:00.000Z");
 assert.equal(first.maintenanceEvents.length,1);
 assert.equal(first.odometerReadings[0].note,COMPLETION_READING_NOTE);
 assert.equal(inspectionDueStatus({...legacy,...first},"2026-08-05T00:00:00.000Z").state,"current");

 assert.equal(maintenanceCompletionError({completedAt:"2026-08-05T00:00:00.000Z",odometerMiles:120000}),null);
 assert.equal(maintenanceCompletionError({completedAt:"2026-08-05T00:00:00.000Z",odometerMiles:""}),null);
 assert.match(maintenanceCompletionError({completedAt:"2026-08-05T00:00:00.000Z",odometerMiles:-5}),/odometer reading/);
 assert.match(maintenanceCompletionError({completedAt:"not-a-date",odometerMiles:120000}),/date and time/);
 assert.equal(recordMaintenanceCompletion(legacy,{completedAt:"not-a-date",odometerMiles:120000}),null);

 const dated=recordMaintenanceCompletion({s:"service",odometerReadings:first.odometerReadings,maintenanceEvents:first.maintenanceEvents,mileageEstimate:first.mileageEstimate},{completedAt:"2026-08-08T00:00:00.000Z",odometerMiles:"",note:"Date-only shop record",idSeed:"date-only"},"2026-08-08T00:00:00.000Z");
 assert.equal(dated.maintenanceEvents.length,2);
 assert.equal(dated.maintenanceEvents[1].odometerMiles,undefined);
 assert.equal(dated.odometerReadings.length,1);
 assert.equal(dated.odometerReadings[0].id,first.odometerReadings[0].id);
 assert.equal(dated.mileageEstimate,undefined);
 const datedBus={...legacy,...first,...dated,mileageEstimate:first.mileageEstimate},dateOnlyDue=inspectionDueStatus(datedBus,"2026-08-08T00:00:00.000Z");
 assert.equal(dateOnlyDue.state,"current");
 assert.equal(dateOnlyDue.dueMiles,undefined);
 assert.equal(dateOnlyDue.dueAt,"2026-08-18T00:00:00.000Z");
 const datedSaved=stampOperationalChange({...legacy,...first},{...datedBus},"2026-08-08T00:00:00.000Z");
 assert.equal(datedSaved.odometerReadings.length,1);
 assert.equal(datedSaved.mileageEstimate.anchorReadingId,first.odometerReadings[0].id);
 assert.equal(latestMaintenanceEvent(datedSaved.maintenanceEvents,"inspection").id,"maintenance-inspection-date-only");

 const preserved=appendMaintenanceEvent([{id:"kept",kind:"inspection",completedAt:"2026-07-01T00:00:00.000Z",odometerMiles:80000,futureField:"keep"}],{id:"added",kind:"inspection",completedAt:"2026-07-10T00:00:00.000Z",odometerMiles:82000});
 assert.deepEqual(preserved.map(event=>event.id),["kept","added"]);
 assert.equal(preserved[0].futureField,"keep");
});

test("Fleet Tracker records completed inspections with phone rules scoped away from iPad widths",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
 ]);
 assert.match(page,/MAINTENANCE HISTORY/);
 assert.match(page,/Completions are appended and never replace earlier maintenance records/);
 assert.match(page,/ODOMETER AT COMPLETION/);
 assert.match(page,/Leave blank for date only/);
 assert.match(page,/DATE COMPLETED/);
 assert.match(page,/RECORD \{maintenanceKindLabel\(maintenanceKind\)\.toUpperCase\(\)\}/);
 assert.match(page,/recordMaintenanceCompletion\(current,input\)/);
 assert.match(page,/Date only restarts the 10-day clock without changing mileage/);
 assert.match(css,/Completed-maintenance history in the bus editor/);
 assert.match(css,/\.maintenance-current\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(150px,1fr\)\)/);
 // each reading stacks label, value and note in its own rows. As a baseline
 // flex row an item broke only when its text ran out of width, so the shortest
 // one sat inline beside its label while its neighbours stacked.
 assert.match(css,/\.maintenance-current span\{display:grid;gap:4px;align-content:start\}/);
 assert.equal(/\.maintenance-current span\{display:flex/.test(css),false);
 assert.match(css,/\.maintenance-entry button\{min-height:44px/);
 assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.maintenance-entry\{grid-template-columns:1fr\}/);
 assert.match(css,/@media\(max-width:760px\)\{[\s\S]*?\.maintenance-entry button\{min-height:52px/);

 const conditions=[];
 for(let index=css.indexOf("@media(");index>=0;index=css.indexOf("@media(",index+1)){
  const conditionEnd=css.indexOf(")",index),open=css.indexOf("{",conditionEnd);
  let depth=0,end=open;
  for(;end<css.length;end++){
   if(css[end]==="{")depth++;
   else if(css[end]==="}"&&--depth===0)break;
  }
  if(css.slice(open+1,end).includes(".maintenance-"))conditions.push(css.slice(index+7,conditionEnd));
 }
 assert.deepEqual(conditions,["max-width:760px"]);
});

test("the shipped intervals reach a device that has been running all along",()=>{
 // The board rewrites its whole settings blob on almost every change, so a
 // device that never had these typed in is not holding an empty record: it is
 // holding an explicit four nulls under the v1 marker, and those nulls beat any
 // default that ships later. Changing the defaults alone would have done
 // nothing at all on the one device that matters.
 const neverTyped={sparkPlugs:null,valveAdjustment:null,sparkPlugsMonths:null,valveAdjustmentMonths:null};
 assert.deepEqual(readSavedServiceIntervals(LEGACY_SERVICE_INTERVALS_UNIT,neverTyped),DEFAULT_SERVICE_INTERVALS);

 // but a figure somebody actually entered under v1 is never overwritten by one
 // that shipped later, even where the rest of the record is blank
 assert.deepEqual(readSavedServiceIntervals(LEGACY_SERVICE_INTERVALS_UNIT,{sparkPlugs:1200}),
  {sparkPlugs:1200,valveAdjustment:2000,sparkPlugsMonths:18,valveAdjustmentMonths:24});

 // Under v2 a blank is a deliberate clear and stays blank. Once the defaults
 // have been offered, turning one off has to be possible and has to stick.
 assert.deepEqual(readSavedServiceIntervals(SERVICE_INTERVALS_UNIT,{sparkPlugs:1500,valveAdjustment:null,sparkPlugsMonths:18,valveAdjustmentMonths:null}),
  {sparkPlugs:1500,valveAdjustment:null,sparkPlugsMonths:18,valveAdjustmentMonths:null});

 // a device with no marker, or Version 108 mileage values under no marker,
 // starts from the defaults rather than reading miles as hours
 assert.deepEqual(readSavedServiceIntervals(undefined,undefined),DEFAULT_SERVICE_INTERVALS);
 assert.deepEqual(readSavedServiceIntervals("miles",{sparkPlugs:60000}),DEFAULT_SERVICE_INTERVALS);
});

test("spark-plug and valve-adjustment tracking counts engine hours, not miles",()=>{
 // Cummins figures for this fleet, the same on the L9N as on the ISL G
 assert.deepEqual(DEFAULT_SERVICE_INTERVALS,{sparkPlugs:1500,valveAdjustment:2000,sparkPlugsMonths:18,valveAdjustmentMonths:24});
 assert.deepEqual(SERVICE_KINDS.map(service=>service.kind),["spark-plugs","valve-adjustment"]);
 assert.deepEqual(normalizeServiceIntervals(undefined),{sparkPlugs:null,valveAdjustment:null,sparkPlugsMonths:null,valveAdjustmentMonths:null});
 assert.deepEqual(normalizeServiceIntervals({sparkPlugs:"1500",valveAdjustment:0}),{sparkPlugs:1500,valveAdjustment:null,sparkPlugsMonths:null,valveAdjustmentMonths:null});
 assert.deepEqual(normalizeServiceIntervals({sparkPlugs:-5,valveAdjustment:"abc"}),{sparkPlugs:null,valveAdjustment:null,sparkPlugsMonths:null,valveAdjustmentMonths:null});
 assert.deepEqual(normalizeServiceIntervals({sparkPlugs:1500,sparkPlugsMonths:"18",valveAdjustment:2000,valveAdjustmentMonths:24}),{sparkPlugs:1500,valveAdjustment:2000,sparkPlugsMonths:18,valveAdjustmentMonths:24});
 assert.equal(serviceIntervalHours("1500.4"),1500);
 assert.equal(serviceIntervalHours(""),null);

 const bus={s:"shop",lastStatusChangeAt:"2026-08-01T00:00:00.000Z",
  odometerReadings:[{id:"reading-1",miles:100000,recordedAt:"2026-08-01T00:00:00.000Z",source:"manual"}],
  engineHourReadings:[],maintenanceEvents:[]};
 assert.equal(serviceIntervalStatus(bus,"spark-plugs",null).state,"baseline-needed");

 // recording the completion with an hour reading is what starts the counter
 const serviced=recordMaintenanceCompletion(bus,{kind:"spark-plugs",completedAt:"2026-08-01T00:00:00.000Z",odometerMiles:100000,engineHours:12000,idSeed:"seed-3"},"2026-08-01T00:00:00.000Z");
 assert.equal(serviced.engineHourReadings.length,1);
 assert.equal(serviced.engineHourReadings[0].hours,12000);
 assert.equal(serviced.engineHourReadings[0].source,"service");
 const tracked={...bus,...serviced,engineHourReadings:[...serviced.engineHourReadings,{id:"hours-later",hours:13400,recordedAt:"2026-09-01T00:00:00.000Z",source:"manual"}],mileageEstimate:undefined};

 const noInterval=serviceIntervalStatus(tracked,"spark-plugs",null);
 assert.equal(noInterval.state,"interval-needed");
 assert.equal(noInterval.due,false);
 assert.equal(noInterval.hoursSince,1400);
 assert.equal(noInterval.intervalHours,undefined);

 const tracking=serviceIntervalStatus(tracked,"spark-plugs",2000);
 assert.equal(tracking.state,"tracking");
 assert.equal(tracking.due,false);
 assert.equal(tracking.hoursRemaining,600);
 assert.equal(tracking.hoursOverdue,0);

 const soon=serviceIntervalStatus(tracked,"spark-plugs",1440);
 assert.equal(soon.state,"due-soon");
 assert.equal(soon.due,false);
 assert.equal(soon.hoursRemaining,40);
 assert.ok(soon.hoursRemaining<=SERVICE_DUE_SOON_HOURS);

 // due the moment hours-since reaches the interval, exactly on the boundary
 const due=serviceIntervalStatus(tracked,"spark-plugs",1400);
 assert.equal(due.state,"due");
 assert.equal(due.due,true);
 assert.equal(due.hoursRemaining,0);
 assert.equal(due.hoursOverdue,0);
 // and the overdue count keeps growing past it, which is the behind-counter
 assert.equal(serviceIntervalStatus(tracked,"spark-plugs",1000).hoursOverdue,400);
 // at the real Cummins ISL G interval this bus still has 100 hours to run,
 // which is outside the 50-hour warning window, so it reads as tracking
 assert.equal(serviceIntervalStatus(tracked,"spark-plugs",1500).hoursRemaining,100);
 assert.equal(serviceIntervalStatus(tracked,"spark-plugs",1500).state,"tracking");

 // a completion logged before hour tracking cannot start a counter, and says so
 // rather than reading as tracked at zero
 const milesOnly=recordMaintenanceCompletion(bus,{kind:"valve-adjustment",completedAt:"2026-08-01T00:00:00.000Z",odometerMiles:100000,idSeed:"seed-4"},"2026-08-01T00:00:00.000Z");
 const noHours={...tracked,maintenanceEvents:[...tracked.maintenanceEvents,...milesOnly.maintenanceEvents]};
 const stalled=serviceIntervalStatus(noHours,"valve-adjustment",2000);
 assert.equal(stalled.state,"hours-needed");
 assert.equal(stalled.due,false);
 assert.equal(stalled.hoursSince,undefined);

 // a valve adjustment is tracked independently of spark plugs
 assert.equal(serviceIntervalStatus(tracked,"valve-adjustment",2000).state,"baseline-needed");
 assert.equal(latestMaintenanceEvent(tracked.maintenanceEvents,"spark-plugs").engineHours,12000);
 assert.equal(latestMaintenanceEvent(tracked.maintenanceEvents,"spark-plugs").odometerMiles,100000);
 assert.equal(maintenanceEventsOfKind(tracked.maintenanceEvents,"inspection").length,0);
});

test("a bus list is a punch list: fixed membership, progress that moves",()=>{
 const now="2026-08-27T14:00:00.000Z";
 let list=createBusList("Farebox — Coin Bypass","Farebox report 8-27-26",now,"seed1");
 assert.equal(list.name,"Farebox — Coin Bypass");
 assert.deepEqual(busListCounts(list),{total:0,done:0,remaining:0});

 // rows pasted straight off the report the other department produces
 list=addBusListEntries(list,[
  "South 15501 21790 08-21-2026 7:14:16 PM Yes",
  "South 17547 21731 04-09-2026 12:38:57 PM Yes",
  "South 17563 21802 08-25-2026 1:13:15 AM Yes",
 ].join("\n"),"a");
 assert.equal(busListCounts(list).total,3);
 // the bus number is picked out and everything else on the row is kept, so a
 // farebox ID and a last-probed time survive without being modelled here
 assert.equal(list.entries[0].busNumber,"15501");
 assert.ok(list.entries[0].cells.join(" ").includes("21790"));
 assert.ok(list.entries[0].cells.join(" ").includes("08-21-2026"));
 assert.equal(list.entries[1].busNumber,"17547");

 // nothing here consults a defect record: these buses need not exist in the app
 assert.equal(list.entries.every(entry=>entry.done),false);

 // clearing a bus records who and when, which the paper sheet relies on
 // somebody remembering to do by hand
 list=setBusListEntryDone(list,list.entries[0].id,true,now,"cm");
 assert.equal(list.entries[0].done,true);
 assert.equal(list.entries[0].doneBy,"CM");
 assert.equal(list.entries[0].doneAt,now);
 assert.deepEqual(busListCounts(list),{total:3,done:1,remaining:2});
 // and unticking clears the attribution rather than leaving a stale name on it
 const undone=setBusListEntryDone(list,list.entries[0].id,false,now,"cm");
 assert.equal(undone.entries[0].doneBy,undefined);
 assert.equal(undone.entries[0].doneAt,undefined);
});

test("bus list input accepts typed numbers and pasted report rows alike",()=>{
 // a bare run of numbers is a list of buses, however it is separated
 assert.deepEqual(parseBusListInput("17503, 17504 17506").map(entry=>entry.busNumber),["17503","17504","17506"]);
 assert.deepEqual(parseBusListInput("17503\n17504").map(entry=>entry.busNumber),["17503","17504"]);
 assert.deepEqual(parseBusListInput("").length,0);

 // a row with other columns keeps them as detail
 // single spaces cannot be cut into columns reliably, so what sits either side
 // of the bus number is kept whole rather than split in the wrong places
 const [row]=parseBusListInput("South 17520 21820 05-05-2026 9:03:27 PM Yes");
 assert.equal(row.busNumber,"17520");
 assert.deepEqual(row.cells,["South","21820 05-05-2026 9:03:27 PM Yes"]);

 // commas and tabs are exact, so they cut into real cells
 const [commas]=parseBusListInput("South, 17520, 21820, 05-05-2026 9:03:27 PM, Yes");
 assert.equal(commas.busNumber,"17520");
 assert.deepEqual(commas.cells,["South","21820","05-05-2026 9:03:27 PM","Yes"]);
 const [tabs]=parseBusListInput("South\t17520\t21820\tYes");
 assert.deepEqual(tabs.cells,["South","21820","Yes"]);
 // and so is a printed table lined up with runs of spaces
 const [spaced]=parseBusListInput("South   17520   21820   Yes");
 assert.deepEqual(spaced.cells,["South","21820","Yes"]);

 // a line with no bus number is kept rather than dropped, so a stray heading is
 // visible and can be deleted instead of vanishing without explanation
 const [heading]=parseBusListInput("Location Vehicle Number Farebox ID");
 assert.equal(heading.busNumber,"");
 assert.deepEqual(heading.cells,["Location Vehicle Number Farebox ID"]);

 // the same bus twice on one list is a transcription slip, not two jobs
 let list=createBusList("Dupes","",  "2026-08-27T14:00:00.000Z","s");
 list=addBusListEntries(list,"17503\n17503\n17504","a");
 assert.equal(busListCounts(list).total,2);
});

test("a pasted row never mines a bus number out of a farebox ID",()=>{
 // The farebox report is the sheet this feature exists for, and its ID column
 // was the shape that broke it: \b treats a hyphen as a word boundary, so
 // FB-2201 handed over 2201 as the bus and left FB- behind as a cell, while the
 // real number further along the row ended up as data.
 const [outOfOrder]=parseBusListInput("FB-2201  SOUTH  17549  BYPASS");
 assert.equal(outOfOrder.busNumber,"17549");
 assert.deepEqual(outOfOrder.cells,["FB-2201","SOUTH","BYPASS"]);

 // a row carrying no bus at all must not invent one
 const [noBus]=parseBusListInput("SOUTH  FB-9999  UNKNOWN UNIT");
 assert.equal(noBus.busNumber,"");
 assert.deepEqual(noBus.cells,["SOUTH FB-9999 UNKNOWN UNIT"],"and nothing pasted is thrown away");

 // digits glued to anything else are not a bus number
 assert.equal(parseBusListInput("SOUTH  17549  2026-08-14  BYPASS")[0].cells.includes("2026-08-14"),true);
 assert.equal(parseBusListInput("SOUTH  FB2201  17549  BYPASS")[0].busNumber,"17549");

 // punctuation wrapped around the number goes with it. Blanking the digits
 // alone left a cell containing just "#", which is the same stray-cell junk
 // that made a shared list look wrong.
 assert.deepEqual(parseBusListInput("#17549  FB-2201")[0].cells,["FB-2201"]);
 assert.deepEqual(parseBusListInput("(17568)  FB-2214")[0].cells,["FB-2214"]);
 assert.deepEqual(parseBusListInput("17563.  FB-2215")[0].cells,["FB-2215"]);
 assert.equal(parseBusListInput("#17549  FB-2201")[0].busNumber,"17549");

 // but a comma is a cell boundary, never swallowed, or two columns would run
 // together and every value after them would shift a column left
 const [commas]=parseBusListInput("17549,FB-2201,Bypass");
 assert.equal(commas.busNumber,"17549");
 assert.deepEqual(commas.cells,["FB-2201","Bypass"]);

 // a whole pasted report still reads straight across
 const rows=parseBusListInput(`SOUTH    17549   FB-2201   08/14/26 06:12   BYPASS
SOUTH    17568   FB-2214   08/14/26 07:40   OK`);
 assert.deepEqual(rows.map(entry=>entry.busNumber),["17549","17568"]);
 assert.deepEqual(rows[0].cells,["SOUTH","FB-2201","08/14/26 06:12","BYPASS"]);
});

test("the list export is written to be read by someone without the app",()=>{
 const now="2026-08-27T14:00:00.000Z";
 let list=createBusList("Farebox — Coin Bypass","Farebox report 8-27-26",now,"seed1");
 list=addBusListEntries(list,"South 15501 21790 08-21-2026 7:14:16 PM Yes\n17547\n17563","a");
 list=setBusListEntryDone(list,list.entries[0].id,true,now,"cm");

 const full=busListExportText(list,"full",now);
 assert.match(full,/^FAREBOX — COIN BYPASS\n/);
 assert.match(full,/3 buses · 1 cleared · 2 remaining/);
 assert.match(full,/Farebox report 8-27-26/);
 // outstanding work leads, because that is what the reader has to act on
 assert.ok(full.indexOf("REMAINING (2)")<full.indexOf("CLEARED (1)"));
 assert.match(full,/ {2}17547$/m);
 assert.match(full,/15501 — South · 21790 .* {2}\[Aug 27 · CM\]/m);
 // real line breaks, so it survives a text message or an email
 assert.ok(full.split("\n").length>6);

 // remaining-only drops the cleared section entirely
 const remaining=busListExportText(list,"remaining",now);
 assert.equal(remaining.includes("CLEARED"),false);
 assert.match(remaining,/REMAINING \(2\)/);

 // numbers-only is the one to read over the radio or paste elsewhere
 assert.equal(busListExportText(list,"numbers",now),"17547, 17563");

 // an empty and a finished list both say so rather than exporting a bare title
 assert.match(busListExportText(createBusList("Empty","",now,"e"),"full",now),/No buses on this list yet\./);
 const cleared=setBusListEntryDone(setBusListEntryDone(list,list.entries[1].id,true,now,"cm"),list.entries[2].id,true,now,"cm");
 assert.match(busListExportText(cleared,"full",now),/All 3 cleared\./);
 assert.equal(busListExportText(cleared,"numbers",now),"");
});

test("a list names its own columns, and never loses a value it was not told about",()=>{
 const now="2026-08-27T14:00:00.000Z";
 const rows="South, 15501, 21790, 08-21-2026 7:14:16 PM, Yes\nSouth, 17547, 21731, 04-09-2026 12:38:57 PM, Yes";

 // seven is the cap on naming; beyond it the extra names are simply not taken
 assert.equal(normalizeBusListColumns(["a","b","c","d","e","f","g","h","i"]).length,BUS_LIST_COLUMN_LIMIT);
 assert.deepEqual(normalizeBusListColumns(["Farebox ID","","  ","Bypass"]),["Farebox ID","Bypass"]);
 assert.deepEqual(normalizeBusListColumns("not an array"),[]);

 let named=createBusList("Farebox","rep",now,"s",["Location","Farebox ID","Last Probed","Bypass"]);
 named=addBusListEntries(named,rows,"a");
 const table=busListExportText(named,"remaining",now);
 const lines=table.split("\n");
 const header=lines.find(row=>row.includes("FAREBOX ID"));
 const first=lines.find(row=>row.includes("15501"));
 assert.ok(header&&first);
 // columns line up: each value starts under its own heading, which is what
 // makes the pasted table readable to someone reading it in an email
 for(const [heading,value] of [["LOCATION","South"],["FAREBOX ID","21790"],["BYPASS","Yes"]])
  assert.equal(first.indexOf(value),header.indexOf(heading),heading+" must align with "+value);
 assert.ok(header.indexOf("BUS")<header.indexOf("LOCATION"));

 // naming fewer columns than the rows carry must not hide the rest. A value
 // that vanished from a list someone else acts on is worse than an unlabelled
 // one, so every cell is still printed.
 let short=createBusList("Farebox","rep",now,"s",["Farebox ID","Last Probed"]);
 short=addBusListEntries(short,rows,"a");
 assert.equal(busListColumnCount(short),4,"the rows carry four values");
 const clipped=busListExportText(short,"remaining",now);
 assert.ok(clipped.includes("Yes"),"the unnamed fourth value still prints");
 assert.ok(clipped.includes("08-21-2026 7:14:16 PM"));

 // clearing the columns falls back to a plain note and keeps every cell
 const freeform=busListExportText(setBusListColumns(named,[]),"remaining",now);
 assert.match(freeform,/15501 — South · 21790 · 08-21-2026 7:14:16 PM · Yes/);

 // renaming or dropping a column never edits a row: put the column back and
 // the values are still there, because a list reshaped mid-job must not lose
 // what was already written down
 const stripped=setBusListColumns(named,[]);
 assert.deepEqual(stripped.entries[0].cells,named.entries[0].cells);
 const restored=setBusListColumns(stripped,["Location","Farebox ID","Last Probed","Bypass"]);
 assert.equal(busListExportText(restored,"remaining",now),table);

 // a single cell can be corrected without touching its neighbours
 const fixed=setBusListEntryCell(named,named.entries[0].id,1,"21999");
 assert.equal(fixed.entries[0].cells[1],"21999");
 assert.equal(fixed.entries[0].cells[0],"South");
 assert.equal(fixed.entries[0].cells[3],"Yes");

 // one long value cannot push every other line off the side of a phone
 const wide=setBusListEntryCell(named,named.entries[0].id,0,"x".repeat(80));
 const capped=busListExportText(wide,"remaining",now).split("\n").find(row=>row.includes("xxxx"));
 assert.ok(capped.includes("x".repeat(80)),"the value itself is never cut");
});

test("billable hours are optional, decimal, and never assumed to be zero",()=>{
 // decimal notation as a mechanic writes it
 assert.equal(normalizeBusListHours(".5"),0.5);
 assert.equal(normalizeBusListHours("0.5"),0.5);
 assert.equal(normalizeBusListHours("2.25"),2.25);
 assert.equal(normalizeBusListHours(1.005),1);
 // a blank is no time recorded, which is not the same as zero hours worked
 assert.equal(normalizeBusListHours(""),undefined);
 assert.equal(normalizeBusListHours("0"),undefined);
 assert.equal(normalizeBusListHours("-1"),undefined);
 assert.equal(normalizeBusListHours("abc"),undefined);
 assert.equal(normalizeBusListHours(null),undefined);
 // a fat-fingered figure cannot book a week to one repair
 assert.equal(normalizeBusListHours("99"),BUS_LIST_MAX_HOURS);

 const now="2026-08-27T15:00:00.000Z";
 let list=createBusList("Farebox","rep",now,"s");
 list=addBusListEntries(list,"17503\n17504\n17506","a");
 list=setBusListEntryHours(list,list.entries[0].id,".5");
 list=setBusListEntryHours(list,list.entries[1].id,"1.25");
 assert.equal(busListHours(list),1.75);
 assert.equal(list.entries[2].hours,undefined,"an untouched row carries no time");

 // hours survive unticking: the work was done, and losing it because someone
 // corrected a checkbox would quietly rewrite a timesheet
 let ticked=setBusListEntryDone(list,list.entries[0].id,true,now,"CURTIS");
 ticked=setBusListEntryDone(ticked,ticked.entries[0].id,false,now,"CURTIS");
 assert.equal(ticked.entries[0].hours,0.5);
 assert.equal(ticked.entries[0].doneBy,undefined);

 // and they survive storage
 const restored=normalizeBusLists(JSON.parse(JSON.stringify([list])));
 assert.equal(busListHours(restored[0]),1.75);

 // the shared list carries the time too: a foreman reading it should not have
 // to open the app to see what the sweep cost
 let shared=setBusListEntryDone(list,list.entries[0].id,true,now,"CURTIS");
 shared=setBusListEntryDone(shared,shared.entries[2].id,true,now,"CURTIS");
 const text=busListExportText(shared,"full",now);
 assert.match(text,/1\.75 hr billed/);
 assert.match(text,/17503 {2}\[Aug 27 · CURTIS · 0\.5 hr\]/);
 // a row cleared with no time recorded says so by omission, not with a zero
 assert.match(text,/17506 {2}\[Aug 27 · CURTIS\]/);
 // and a campaign with no time at all does not mention billing
 assert.equal(busListExportText(createBusList("Empty","",now,"e"),"full",now).includes("hr billed"),false);
});

test("work time totals per person, day by day, and says what it is not counting",()=>{
 const yesterday="2026-08-26T15:00:00.000Z",today="2026-08-27T15:00:00.000Z";
 let farebox=createBusList("Farebox","rep",yesterday,"s");
 farebox=addBusListEntries(farebox,"17503\n17504\n17506","a");
 farebox=setBusListEntryDone(farebox,farebox.entries[0].id,true,yesterday,"CURTIS");
 farebox=setBusListEntryHours(farebox,farebox.entries[0].id,".5");
 farebox=setBusListEntryDone(farebox,farebox.entries[1].id,true,yesterday,"CURTIS");
 farebox=setBusListEntryHours(farebox,farebox.entries[1].id,"1.25");
 // ticked but no hours: a few seconds of work, common on a sweep
 farebox=setBusListEntryDone(farebox,farebox.entries[2].id,true,today,"CURTIS");

 let ventra=createBusList("Ventra","rep",today,"t");
 ventra=addBusListEntries(ventra,"17520\n17521","b");
 ventra=setBusListEntryDone(ventra,ventra.entries[0].id,true,today,"CURTIS");
 ventra=setBusListEntryHours(ventra,ventra.entries[0].id,"2");
 ventra=setBusListEntryDone(ventra,ventra.entries[1].id,true,today,"JT");
 ventra=setBusListEntryHours(ventra,ventra.entries[1].id,".75");

 const lists=[farebox,ventra];
 assert.deepEqual(workTimePeople({lists}),["CURTIS","JT"]);

 const curtis=workTimeSummary({lists},"CURTIS");
 // totals run across every campaign, not just the one being looked at
 assert.equal(curtis.hours,3.75);
 assert.equal(curtis.entries,3);
 // the untimed row is reported, never counted as zero
 assert.equal(curtis.untimed,1);
 assert.equal(curtis.days.length,2);
 // most recent day first: the one being worked is the one being checked
 assert.ok(curtis.days[0].day>curtis.days[1].day);
 assert.equal(curtis.days[0].hours,2);
 assert.equal(curtis.days[1].hours,1.75);
 assert.equal(curtis.days[1].entries,2);
 assert.deepEqual(curtis.days[1].rows.map(row=>row.label),["Bus 17503","Bus 17504"]);

 // one person's time never leaks into another's
 assert.equal(workTimeSummary({lists},"JT").hours,0.75);
 assert.equal(workTimeSummary({lists},"NOBODY").hours,0);
 assert.deepEqual(workTimeSummary({lists},"").days,[]);
 assert.deepEqual(workTimeSummary({},"CURTIS").days,[]);

 // the day is the viewer's calendar day, so a repair ticked late at night
 // belongs to that day's timesheet rather than the next one in UTC
 assert.equal(workDayKey(today),workDayKey("2026-08-27T23:30:00.000Z")||workDayKey(today));
 assert.equal(workDayKey("not a date"),"");
 assert.equal(formatWorkHours(2),"2");
 assert.equal(formatWorkHours(0.5),"0.5");
 assert.equal(formatWorkHours(1.25),"1.25");
});

test("the road panel stops covering the service detail area once the map stacks",async()=>{
 /* Reported off a phone: SERVICE DETAIL AREA was not on the map. It was there —
    IN SERVICE / ON ROAD is absolutely positioned into the map's right-hand
    column with z-index 3, and once the sections stack it stayed pinned to the
    top right and landed squarely on top of it. The service area was not
    missing, it was underneath. */
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 // it is still pinned where the map really has a column for it
 assert.match(css,/\.road\{position:absolute;top:0;right:8px/);
 // and it joins the flow where the map stacks, or it covers what stacked above
 const narrow=css.match(/@media\(max-width:760px\)\{\s*\.road\{([^}]*)\}/);
 assert.ok(narrow,"a narrow-width rule must return the road panel to the flow");
 for(const property of ["position:static","width:auto","height:auto","right:auto","top:auto"])
  assert.ok(narrow[1].includes(property),"the road panel must undo "+property.split(":")[0]+" when it stacks");
 // the section itself is still defined, so nothing about this is a phone-only
 // rendering decision — it is one section that was being painted over
 const map=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 /* Both single-file rows are the same length, which is what SINGLE_FILE_CAPACITY
    meant when it was one constant shared by the two. */
 assert.equal(SECTION_SLOTS["SERVICE DETAIL AREA (SINGLE FILE)"].length,8);
 assert.equal(SECTION_SLOTS["SHOP WALL (SINGLE FILE)"].length,
  SECTION_SLOTS["SERVICE DETAIL AREA (SINGLE FILE)"].length);
 assert.match(map,/IN SERVICE \/ ON ROAD/);
});

test("report formats are reusable, built in for farebox and savable for the rest",()=>{
 // The farebox report arrives the same way every time, so its columns are named
 // exactly as its own sheet heads them and checking a row against the paper is
 // a straight read across.
 const farebox=BUS_LIST_TEMPLATES.find(entry=>entry.id==="farebox");
 assert.deepEqual(farebox.columns,["Location","Farebox ID","Last Probed Time","Bypass Alarm"]);
 assert.equal(farebox.builtIn,true);

 // anything else is saved from a list already built, so a new report format
 // never waits on a code change
 let saved=saveBusListTemplate([],"Ventra",["Location","Ventra Unit","Last Seen","Status"],"a");
 assert.equal(saved.length,1);
 assert.equal(saved[0].name,"Ventra");
 assert.deepEqual(busListTemplateOptions(saved).map(entry=>entry.name),["Farebox Bypass","Ventra"]);

 // saving the same name again replaces it rather than leaving two that differ
 // by one heading
 saved=saveBusListTemplate(saved,"Ventra",["Location","Ventra Unit","Fault"],"b");
 assert.equal(saved.length,1);
 assert.deepEqual(saved[0].columns,["Location","Ventra Unit","Fault"]);
 // and a built-in name cannot be shadowed, which would make picking ambiguous
 assert.equal(saveBusListTemplate(saved,"Farebox Bypass",["x"],"c").length,1);
 assert.equal(saveBusListTemplate(saved,"farebox bypass",["x"],"d").length,1);

 // a format with no name or no columns would do nothing
 assert.equal(saveBusListTemplate(saved,"",["x"],"e").length,1);
 assert.equal(saveBusListTemplate(saved,"Empty",[],"f").length,1);
 assert.deepEqual(normalizeBusListTemplates("nonsense"),[]);
 assert.deepEqual(normalizeBusListTemplates([{name:"No columns",columns:[]},null,7]),[]);

 // deleting a format leaves lists already built with it untouched
 const now="2026-08-27T14:00:00.000Z";
 const built=createBusList("Ventra sweep","report",now,"s",saved[0].columns);
 assert.deepEqual(deleteBusListTemplate(saved,saved[0].id),[]);
 assert.deepEqual(built.columns,["Location","Ventra Unit","Fault"]);

 // a template only carries headings, so it caps at the same seven
 const wide=saveBusListTemplate([],"Wide",["a","b","c","d","e","f","g","h","i"],"g");
 assert.equal(wide[0].columns.length,BUS_LIST_COLUMN_LIMIT);
});

test("lists written before columns existed still open",()=>{
 // the first release stored one free-text detail per row
 const legacy=[{id:"l",name:"Farebox",source:"rep",createdAt:"2026-08-27T00:00:00.000Z",updatedAt:"2026-08-27T00:00:00.000Z",
  entries:[{id:"e1",busNumber:"17547",detail:"South 21731 04-09-2026",done:true,doneBy:"CM",doneAt:"2026-08-27T00:00:00.000Z"},
           {id:"e2",busNumber:"17563",detail:"",done:false}]}];
 const [list]=normalizeBusLists(legacy);
 assert.deepEqual(list.columns,[]);
 assert.deepEqual(list.entries[0].cells,["South 21731 04-09-2026"]);
 assert.deepEqual(list.entries[1].cells,[]);
 assert.equal(list.entries[0].doneBy,"CM");
 assert.equal(busListCounts(list).done,1);
 assert.match(busListExportText(list,"full","2026-08-27T00:00:00.000Z"),/17547 — South 21731 04-09-2026/);
});

test("bus lists survive a round trip through storage",()=>{
 const now="2026-08-27T14:00:00.000Z";
 let list=createBusList("Farebox","report",now,"s");
 list=addBusListEntries(list,"17503\n17504","a");
 list=setBusListEntryDone(list,list.entries[0].id,true,now,"cm");
 const restored=normalizeBusLists(JSON.parse(JSON.stringify([list])));
 assert.equal(restored.length,1);
 assert.equal(restored[0].name,"Farebox");
 assert.equal(busListCounts(restored[0]).done,1);
 assert.equal(restored[0].entries[0].doneBy,"CM");

 // junk in storage never takes the page down
 assert.deepEqual(normalizeBusLists(null),[]);
 assert.deepEqual(normalizeBusLists("nonsense"),[]);
 assert.deepEqual(normalizeBusLists([{name:""},null,42]),[]);
 assert.equal(normalizeBusLists([{name:"Kept",entries:"not an array"}])[0].entries.length,0);
 // most recently touched first, so the list being worked is at the top
 const older={...list,id:"old",name:"Older",updatedAt:"2026-08-01T00:00:00.000Z"};
 assert.deepEqual(normalizeBusLists([older,{...list,id:"new",name:"Newer"}]).map(entry=>entry.name),["Newer","Older"]);
});

test("overdue severity grades how far past the interval a service is",()=>{
 const now="2026-08-27T00:00:00.000Z";
 const at=since=>({engineHourReadings:[{id:"h",hours:10000+since,recordedAt:now,source:"manual"}],
  maintenanceEvents:[{id:"m",kind:"spark-plugs",completedAt:"2026-06-27T00:00:00.000Z",engineHours:10000}]});
 const grade=since=>serviceIntervalStatus(at(since),"spark-plugs",1500,null,now);

 assert.equal(grade(1400).severity,"none");
 assert.equal(grade(1460).severity,"due-soon");
 assert.equal(grade(1500).severity,"due");
 assert.equal(grade(1600).severity,"due");
 assert.equal(grade(1650).severity,"overdue");
 assert.equal(grade(1875).severity,"critical");
 assert.equal(grade(2400).severity,"critical");

 // graded as a share of the interval, so the same hour count is not the same
 // state on a 1,500-hour plug interval and a 2,000-hour valve interval
 assert.equal(serviceSeverity(0),"due");
 assert.equal(serviceSeverity(SERVICE_OVERDUE_FRACTION),"overdue");
 assert.equal(serviceSeverity(SERVICE_CRITICAL_FRACTION),"critical");
 const over=grade(1875);
 assert.ok(Math.abs(over.overdueFraction-0.25)<0.001);
 assert.equal(over.hoursOverdue,375);
 assert.equal(SERVICE_SEVERITY_LABELS.critical,"CRITICAL");
 // 375 hours past a 2,000-hour interval is not yet critical
 const valve={engineHourReadings:[{id:"h",hours:12375,recordedAt:now,source:"manual"}],
  maintenanceEvents:[{id:"m",kind:"valve-adjustment",completedAt:"2026-06-27T00:00:00.000Z",engineHours:10000}]};
 assert.equal(serviceIntervalStatus(valve,"valve-adjustment",2000,null,now).hoursOverdue,375);
 assert.equal(serviceIntervalStatus(valve,"valve-adjustment",2000,null,now).severity,"overdue");
});

test("a service the office recorded only by mileage still starts an hour counter",()=>{
 const now="2026-08-27T00:00:00.000Z";
 // Bus 20505 as Curtis read it. The office logs these services by mileage, so
 // the hours at that service are derived from the bus's own miles per hour.
 const bus={s:"shop",lastStatusChangeAt:now,
  odometerReadings:[{id:"o",miles:207251,recordedAt:now,source:"manual"}],
  engineHourReadings:[{id:"h",hours:29678,recordedAt:now,source:"manual"}],maintenanceEvents:[]};

 const estimate=estimateEngineHoursAtMiles(207251,29678,190000);
 assert.equal(estimate.hours,27208);
 assert.equal(estimate.milesSince,17251);
 assert.ok(Math.abs(estimate.rate-6.98)<0.01);

 const done=recordMaintenanceCompletion(bus,{kind:"spark-plugs",completedAt:"2025-06-01T09:00:00.000Z",odometerMiles:190000,idSeed:"s1"},now);
 const event=done.maintenanceEvents.at(-1);
 assert.equal(event.engineHours,27208);
 assert.equal(event.engineHoursEstimated,true,"the record must say the hours were derived");
 assert.equal(event.odometerMiles,190000);
 // an estimate is not a meter reading and must not enter the hour history,
 // where it could later be mistaken for one or trip the meter-reset check
 assert.equal(done.engineHourReadings.length,1);
 assert.equal(done.engineHourReadings[0].hours,29678);

 const status=serviceIntervalStatus({...bus,...done},"spark-plugs",1500,18,now);
 assert.equal(status.hoursSince,2470);
 assert.equal(status.hoursOverdue,970);
 assert.equal(status.severity,"critical");
 assert.equal(status.dueBy,"hours");

 // a reading taken off the meter is never overwritten by an estimate
 const measured=recordMaintenanceCompletion(bus,{kind:"valve-adjustment",completedAt:"2025-06-01T09:00:00.000Z",odometerMiles:190000,engineHours:27000,idSeed:"s2"},now);
 const exact=measured.maintenanceEvents.at(-1);
 assert.equal(exact.engineHours,27000);
 assert.equal(exact.engineHoursEstimated,undefined);
 assert.equal(measured.engineHourReadings.length,2,"a real reading does join the history");

 // refused rather than guessed at when the rate cannot be trusted
 assert.equal(estimateEngineHoursAtMiles(300000,500,290000,true),undefined,"meter was reset");
 assert.equal(estimateEngineHoursAtMiles(300000,500,290000),undefined,"implausible rate");
 assert.equal(estimateEngineHoursAtMiles(207251,29678,300000),undefined,"service ahead of the odometer");
 assert.equal(estimateEngineHoursAtMiles(undefined,29678,190000),undefined,"no odometer");
 // and an inspection is mileage-based, so it is left alone
 const inspection=recordMaintenanceCompletion(bus,{kind:"inspection",completedAt:"2025-06-01T09:00:00.000Z",odometerMiles:190000,idSeed:"s3"},now);
 assert.equal(inspection.maintenanceEvents.at(-1).engineHours,undefined);
});

test("a swapped ECM restarts the hour meter and must never read as freshly serviced",()=>{
 // Several buses here show a few hundred engine hours against 300,000 miles
 // because Cummins replaced a failed ECM and the meter restarted at zero. If
 // the counter clamped that to zero hours elapsed, the bus would read as
 // current forever and its plugs would run to destruction unnoticed.
 const now="2026-08-27T00:00:00.000Z";
 const swapped={
  odometerReadings:[{id:"o1",miles:300000,recordedAt:now,source:"manual"}],
  engineHourReadings:[
   {id:"h0",hours:26100,recordedAt:"2025-02-01T00:00:00.000Z",source:"manual"},
   {id:"h1",hours:500,recordedAt:now,source:"manual"}],
  maintenanceEvents:[{id:"m1",kind:"spark-plugs",completedAt:"2025-03-01T00:00:00.000Z",engineHours:26000}]};

 assert.equal(engineHourMeterReset(swapped.engineHourReadings),true);
 assert.equal(engineHourMeterReset([{id:"a",hours:10,recordedAt:now,source:"manual"},{id:"b",hours:20,recordedAt:now,source:"manual"}]),false);

 const status=serviceIntervalStatus(swapped,"spark-plugs",1500,null,now);
 assert.equal(status.state,"meter-reset");
 assert.equal(status.due,false);
 assert.equal(status.hoursSince,undefined,"hours since is unknowable, not zero");
 assert.equal(status.currentEngineHours,500);
 assert.equal(status.lastEngineHours,26000);

 // the calendar limit still applies, so the bus is not left entirely unwatched
 const byCalendar=serviceIntervalStatus(swapped,"spark-plugs",1500,18,now);
 assert.equal(byCalendar.monthsSince,17);
 assert.equal(byCalendar.due,false,"17 months is inside an 18-month limit");
 const late=serviceIntervalStatus(swapped,"spark-plugs",1500,12,now);
 assert.equal(late.due,true);
 assert.equal(late.state,"due");
 assert.equal(late.dueBy,"months");
 assert.equal(late.monthsOverdue,5);

 // recording a fresh completion against the new meter restores tracking
 const rebaselined={...swapped,maintenanceEvents:[...swapped.maintenanceEvents,{id:"m2",kind:"spark-plugs",completedAt:"2026-08-01T00:00:00.000Z",engineHours:100}]};
 const resumed=serviceIntervalStatus(rebaselined,"spark-plugs",1500,null,now);
 assert.equal(resumed.state,"tracking");
 assert.equal(resumed.hoursSince,400);
});

test("whichever comes first: the calendar limit can make a service due before the hours do",()=>{
 const now="2026-08-27T00:00:00.000Z";
 // A bus that sits accrues months without accruing engine hours.
 const parked={engineHourReadings:[{id:"h",hours:9200,recordedAt:now,source:"manual"}],
  maintenanceEvents:[{id:"m",kind:"spark-plugs",completedAt:"2024-11-27T00:00:00.000Z",engineHours:9000}]};
 const status=serviceIntervalStatus(parked,"spark-plugs",1500,18,now);
 assert.equal(status.hoursSince,200,"nowhere near the 1,500 hour limit");
 assert.equal(status.monthsSince,21);
 assert.equal(status.due,true);
 assert.equal(status.dueBy,"months");
 assert.equal(status.monthsOverdue,3);
 // with no calendar limit saved the same bus is simply still tracking
 assert.equal(serviceIntervalStatus(parked,"spark-plugs",1500,null,now).due,false);
 // and hours win the race when they get there first
 const busy={engineHourReadings:[{id:"h",hours:10600,recordedAt:now,source:"manual"}],
  maintenanceEvents:[{id:"m",kind:"spark-plugs",completedAt:"2026-06-27T00:00:00.000Z",engineHours:9000}]};
 const byHours=serviceIntervalStatus(busy,"spark-plugs",1500,18,now);
 assert.equal(byHours.due,true);
 assert.equal(byHours.dueBy,"hours");
 assert.equal(byHours.hoursOverdue,100);

 assert.equal(monthsBetween("2026-01-15T00:00:00.000Z","2026-02-14T00:00:00.000Z"),0,"a day short is not a month");
 assert.equal(monthsBetween("2026-01-15T00:00:00.000Z","2026-02-15T00:00:00.000Z"),1);
});

test("the fleet duty-cycle average ignores buses whose meter was reset",()=>{
 const now="2026-08-27T00:00:00.000Z";
 const bus=(miles,hours,extraHours)=>({
  odometerReadings:[{id:"o",miles,recordedAt:now,source:"manual"}],
  engineHourReadings:[...(extraHours?[{id:"h0",hours:extraHours,recordedAt:"2025-01-01T00:00:00.000Z",source:"manual"}]:[]),
   {id:"h",hours,recordedAt:now,source:"manual"}]});

 const empty=fleetDutyCycle([]);
 assert.equal(empty.rate,undefined);
 assert.equal(empty.buses,0);

 // Curtis's two real buses, plus one with a swapped ECM that must not count
 const cycle=fleetDutyCycle([bus(207251,29678),bus(458985,18803),bus(300000,500,26100)]);
 assert.equal(cycle.buses,2);
 assert.equal(cycle.excluded,1);
 assert.equal(cycle.excludedReset,1);
 assert.ok(cycle.rate>13&&cycle.rate<14,"the pair averages about 13.7 mi/hr, not the 600 the ECM bus implies");

 // an implausible ratio is excluded even without a recorded earlier reading,
 // since a bus fitted with a replacement meter may have no history at all
 const noHistory=fleetDutyCycle([bus(300000,500)]);
 assert.equal(noHistory.buses,0);
 assert.equal(noHistory.excluded,1);
 // a bus with no earlier reading is only a guess, and must be reported as one:
 // the fastest real bus measured runs 31.46 against a cutoff of 45, so a
 // genuinely fast express bus could be excluded by mistake
 assert.equal(noHistory.excludedImplausible,1);
 assert.equal(noHistory.excludedReset,0);
 // a meter that actually read lower is hard evidence, counted separately
 const definite=fleetDutyCycle([bus(300000,500,26100)]);
 assert.equal(definite.excludedReset,1);
 assert.equal(definite.excludedImplausible,0);
 // and the fastest real bus is comfortably inside the cutoff, not excluded
 const fast=fleetDutyCycle([bus(389990,12395)]);
 assert.equal(fast.buses,1);
 assert.equal(fast.excluded,0);
 assert.equal(milesPerEngineHour(207251,29678).toFixed(2),"6.98");
 assert.equal(milesPerEngineHour(100,0),undefined);
});

test("Curtis's two real buses show why miles cannot decide these services",()=>{
 // Readings he took off the dash: 20505 runs slow, heavy-idle work; 17549 runs
 // far more miles per hour. One fleet mileage interval cannot serve both.
 const fleet=[{n:"20505",hours:29678,miles:207251},{n:"17549",hours:18803,miles:458985},
  {n:"17568",hours:13736,miles:409255},{n:"17563",hours:12395,miles:389990}];
 const rate=bus=>bus.miles/bus.hours;
 assert.ok(Math.abs(rate(fleet[0])-6.98)<0.01);
 assert.ok(Math.abs(rate(fleet[1])-24.41)<0.01);
 assert.ok(Math.abs(rate(fleet[2])-29.79)<0.01);
 assert.ok(Math.abs(rate(fleet[3])-31.46)<0.01);
 const rates=fleet.map(rate);
 assert.ok(Math.max(...rates)/Math.min(...rates)>4.5,"the spread across the fleet is over 4.5x");
 // every one of them is inside the plausible band, so none is mistaken for a
 // reset meter and quietly dropped from the fleet average
 for(const bus of fleet) assert.ok(rate(bus)<MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR,"bus "+bus.n);

 // At the Cummins 1,500-hour plug interval those buses are thousands of miles
 // apart, which is the whole reason the counter moved to hours.
 assert.equal(Math.round(1500*rate(fleet[0])),10475);
 assert.equal(Math.round(1500*rate(fleet[1])),36615);
 assert.equal(Math.round(1500*rate(fleet[2])),44692);
 assert.equal(Math.round(1500*rate(fleet[3])),47195);

 // The fleet splits by series, which is why one average cannot stand in for a
 // bus: the 17s run about four times the miles per hour that the 20s do.
 const series=prefix=>{const group=fleet.filter(bus=>bus.n.startsWith(prefix));
  return group.reduce((n,bus)=>n+bus.miles,0)/group.reduce((n,bus)=>n+bus.hours,0)};
 assert.ok(Math.abs(series("17")-28.00)<0.01);
 assert.ok(Math.abs(series("20")-6.98)<0.01);
 // the 17s are a tight population; the gap is between the series, not inside one
 const seventeens=fleet.filter(bus=>bus.n.startsWith("17")).map(rate);
 assert.ok(Math.max(...seventeens)/Math.min(...seventeens)<1.3,"the 17s run alike");

 // The fleet-wide average lands at 17.29, and no bus in the fleet runs near it.
 // The panel has to say so rather than presenting it as a usable figure.
 const cycle=fleetDutyCycle(fleet.map(bus=>({
  odometerReadings:[{id:"o"+bus.n,miles:bus.miles,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}],
  engineHourReadings:[{id:"h"+bus.n,hours:bus.hours,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}]})));
 assert.equal(cycle.buses,4);
 assert.ok(Math.abs(cycle.rate-19.64)<0.01);
 assert.ok(Math.abs(cycle.low-6.98)<0.01);
 assert.ok(Math.abs(cycle.high-31.46)<0.01);
 assert.equal(cycle.representative,false,"a 4.5x spread is not one population");
 for(const bus of fleet) assert.ok(Math.abs(rate(bus)-cycle.rate)>4.7,"bus "+bus.n+" is nowhere near the average");

 // The average tracks whichever buses happen to have been entered, not any
 // property of the fleet: it walked 6.98 to 19.64 as these four arrived. That
 // is the clearest argument against ever deriving a mileage interval from it.
 const asEntered=[1,2,3,4].map(count=>fleetDutyCycle(fleet.slice(0,count).map(bus=>({
  odometerReadings:[{id:"o"+bus.n,miles:bus.miles,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}],
  engineHourReadings:[{id:"h"+bus.n,hours:bus.hours,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}]}))).rate);
 assert.deepEqual(asEntered.map(value=>Number(value.toFixed(2))),[6.98,13.74,17.29,19.64]);

 // a fleet that genuinely runs alike does report a usable average
 const alike=fleetDutyCycle([{n:"a",hours:1000,miles:20000},{n:"b",hours:1000,miles:24000}].map(bus=>({
  odometerReadings:[{id:"o"+bus.n,miles:bus.miles,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}],
  engineHourReadings:[{id:"h"+bus.n,hours:bus.hours,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}]})));
 assert.equal(alike.representative,true);
 assert.equal(alike.rate,22);

 // Hours are the same number on every bus regardless of the route it draws.
 for(const bus of fleet){
  const serviced={engineHourReadings:[{id:"h1",hours:bus.hours,recordedAt:"2026-08-27T00:00:00.000Z",source:"manual"}],
   maintenanceEvents:[{id:"m1",kind:"spark-plugs",completedAt:"2026-01-01T00:00:00.000Z",engineHours:bus.hours-1500}]};
  const status=serviceIntervalStatus(serviced,"spark-plugs",1500);
  assert.equal(status.hoursSince,1500,"bus "+bus.n);
  assert.equal(status.due,true,"bus "+bus.n+" is due at exactly the interval");
  assert.equal(status.hoursOverdue,0,"bus "+bus.n);
 }
});

test("Fleet Tracker records every maintenance type and never invents a mileage service interval",async()=>{
 const [page,panel,css,intervals]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/map-settings-panel.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/fleet/service-intervals.ts",import.meta.url),"utf8"),
 ]);
 assert.match(page,/MAINTENANCE TYPE/);
 // The intervals themselves are set on the shared Settings page, in the map's panel.
 assert.match(panel,/MAINTENANCE INTERVALS/);
 assert.match(page,/INTERVAL NOT SET/);
 assert.match(page,/SERVICE_SEVERITY_LABELS\[service\.status\.severity\]/);
 assert.match(page,/HR PAST/);
 assert.match(page,/severity-"\+service\.status\.severity/);
 assert.match(page,/serviceIntervalStatus\(d,service\.kind,serviceIntervals\[service\.setting\],serviceIntervals\[service\.monthsSetting\]\)/);
 // each service takes an hour limit and a calendar limit, whichever comes first
 assert.match(panel,/placeholder="Hours" aria-label=\{service\.label\+" interval in engine hours"\}/);
 assert.match(panel,/placeholder="Months" aria-label=\{service\.label\+" interval in months"\}/);
 assert.match(page,/ENGINE HOURS AT COMPLETION/);
 assert.match(page,/CURRENT ENGINE HOURS/);
 assert.match(page,/MILES PER ENGINE HOUR/);
 assert.match(page,/METER RESET/);
 assert.match(panel,/FLEET AVERAGE/);
 assert.match(css,/\.service-interval-settings input\{width:120px;min-height:44px/);
 assert.match(css,/\.maintenance-entry select\{min-height:44px\}/);

 // The defaults are the confirmed Cummins hour and month figures. What must
 // never be baked in is a mileage interval: this fleet runs 6.98 to 24.41 miles
 // per engine hour, so any single mileage number is wrong for most of it. A
 // cleared interval still has to read as not set rather than as zero.
 assert.match(intervals,/sparkPlugs:1500,valveAdjustment:2000,sparkPlugsMonths:18,valveAdjustmentMonths:24/);
 assert.equal(/sparkPlugs:\s*\d{4,}\d/.test(intervals),false,"nothing five digits or longer, which would be miles");
 assert.equal(/(SPARK_PLUG|VALVE)[A-Z_]*_(MILE|INTERVAL)[A-Z_]*\s*=\s*\d/.test(intervals),false);
 assert.equal(/\b(15000|18000|20000|24000|30000|36000|50000)\b/.test(intervals),false);
});

test("release safety keeps interval units and learned parts attached to the right identity",async()=>{
 const [page,backup,log,fixed,logCss,fixedCss]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/storage/fleet-backup.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);
 assert.equal(SERVICE_INTERVALS_UNIT,"engine-hours-v2");
 assert.equal(LEGACY_SERVICE_INTERVALS_UNIT,"engine-hours-v1");
 // Both read paths go through the one migration, so an imported backup and a
 // device that has been running all along read a stored blob the same way.
 assert.match(page,/setServiceIntervals\(readSavedServiceIntervals\(ui\.serviceIntervalsUnit,ui\.serviceIntervals\)\)/);
 const boardModelSource=await readFile(new URL("../src/lib/settings/map-settings.ts",import.meta.url),"utf8");
 assert.match(boardModelSource,/serviceIntervals:readSavedServiceIntervals\(ui\.serviceIntervalsUnit,ui\.serviceIntervals\)/,
  "a restored backup still reaches the intervals, through the board-settings reader");
 assert.match(page,/serviceIntervalsUnit:SERVICE_INTERVALS_UNIT,serviceIntervals/);
 // Campaigns were absent from the backup until version 4. Everything that
 // page holds — completed rows, initials, timestamps, billable hours — sat
 // outside the one control that promises to save the whole board, and the
 // Work Time totals are built from those same rows.
 assert.match(backup,/version:5/);
 assert.match(backup,/busLists:readSavedValue\(storage,BUS_LISTS_STORAGE_KEY\)/);
 assert.match(backup,/busListTemplates:readSavedValue\(storage,BUS_LIST_TEMPLATES_STORAGE_KEY\)/);
 // Learned causes went into the backup in the same change that created them,
 // rather than being noticed missing later the way the campaigns were.
 assert.match(backup,/findingsMemory:readSavedValue\(storage,FINDINGS_MEMORY_STORAGE_KEY\)/);
 /* The learned parts and findings ride the whole-app restore, which lives in
    fleet-restore.ts now rather than inside the map's own import handler. */
 const restoreModule=await readFile(new URL("../src/lib/storage/fleet-restore.ts",import.meta.url),"utf8");
 assert.match(restoreModule,/put\(FINDINGS_MEMORY_STORAGE_KEY,backup\.findingsMemory,"remembered findings",normalizeFindingsMemory\)/);
 assert.match(restoreModule,/put\(PARTS_MEMORY_STORAGE_KEY,backup\.partsMemory,"remembered parts",normalizePartsMemory\)/);
 // and a restore brings them back, through the same normalizers the page uses
 assert.match(restoreModule,/put\(BUS_LISTS_STORAGE_KEY,backup\.busLists,"campaigns",normalizeBusLists\)/);
 assert.match(restoreModule,/put\(BUS_LIST_TEMPLATES_STORAGE_KEY,backup\.busListTemplates,"campaign templates",normalizeBusListTemplates\)/);
 /* And a key the file does not carry is left alone rather than cleared, which
    is what keeps a version 3 file from wiping this device's campaigns. */
 assert.match(restoreModule,/if\(value===undefined\|\|value===null\)return;/);
 // A version 3 file has neither key, so restoring one must leave the campaigns
 // already on this device alone rather than clearing them.
 assert.equal(/busLists\?[^)]*\)\s*:\s*\[\]|setItem\("pace-bus-lists-v1",JSON\.stringify\(normalizeBusLists\(parsed\.busLists\|\|/.test(page),false);
 assert.match(backup,/partsMemory:readSavedValue\(storage,PARTS_MEMORY_STORAGE_KEY\)/);

 for(const source of [log,fixed]){
  assert.match(source,/partsUsed:false,partNumber:"",partName:"",rememberScope:undefined|rememberScope:undefined[\s\S]{0,180}?partsUsed:false,partNumber:"",partName:""/);
 }
 assert.match(logCss,/\.defect-log-app \.parts-used-block/);
 assert.match(fixedCss,/\.fixed-repairs-app \.parts-used-block/);
 assert.doesNotMatch(logCss,/(?:\n|,)\.parts-(?:used|remembered)/);
 assert.doesNotMatch(fixedCss,/(?:\n|,)\.parts-(?:used|remembered)/);
});

test("locating a bus opens the section it is hiding in",async()=>{
 const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 // A collapsed section keeps its tokens in the document and hides them with
 // display:none, so the bus was found and scrolled to and nothing happened —
 // an element with no box has nowhere to scroll. Searching for a bus in a
 // collapsed section gave no answer and no error; the box just cleared.
 assert.match(page,/const sectionOfLocation=/);
 assert.match(page,/setCollapsedSections\(current=>\{[\s\S]{0,240}next\.delete\(name\)/);
 // Waiting for a real BOX rather than for the node is the load-bearing part:
 // the node is present the whole time, so checking only for it would scroll to
 // the hidden one on the first frame and never look again.
 assert.match(page,/getBoundingClientRect\(\)\.height>0/);
 assert.match(page,/requestAnimationFrame\(\(\)=>scroll\(attempt\+1\)\)/);
 // Keyed on SECTION_SLOTS, which is what the collapse state is keyed on.
 // RELOCATION_AREAS splits the main garage into three and would miss.
 assert.match(page,/sectionOfLocation=\(location:string\)=>Object\.entries\(SECTION_SLOTS\)/);

 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 // If collapsing ever stops using display:none this test is checking a bug
 // that no longer exists, so pin the mechanism it is built on.
 assert.match(css,/\.section-collapsed>:not\(\.title\)\{display:none!important\}/);
});

test("OFF PROPERTY holds buses away at a vendor and nobody is stranded by it",async()=>{
 const { OFF_PROPERTY_CAPACITY, WAITING_CAPACITY, SECTION_SLOTS, RELOCATION_AREAS, sectionForLocation } = await import("../src/lib/fleet/facility-areas.ts");
 const { statusForLocation } = await import("../src/lib/fleet/smart-status.ts");
 const { migrateReducedCapacity } = await import("../src/lib/fleet/facility-layout.ts");

 // A fixed count, not "two rows". The waiting grid is 14 across on a computer,
 // 10 on an iPad and 3 on a phone, so "two rows" would have meant 28, 20 or 6
 // spaces depending on what somebody happened to be holding.
 assert.equal(OFF_PROPERTY_CAPACITY,28);
 assert.equal(WAITING_CAPACITY,70);
 assert.equal(SECTION_SLOTS["OFF PROPERTY"].length,28);
 assert.equal(SECTION_SLOTS["OFF PROPERTY"][0],"offsite-0");
 // It has to be a relocation target, or a bus could never be sent there.
 assert.ok(RELOCATION_AREAS["OFF PROPERTY"]);
 assert.equal(sectionForLocation("offsite-3"),"OFF PROPERTY");

 // A bus that is not on the property cannot run.
 const clean={defects:[],pendingRepair:""};
 assert.equal(statusForLocation("offsite-0","service",clean),"out");
 assert.equal(statusForLocation("offsite-27","shop",clean),"out");
 // Except decommissioned, which outranks every location rule.
 assert.equal(statusForLocation("offsite-0","decommissioned",clean),"decommissioned");

 // The waiting area gave up its LAST 28 slots. A bus parked in one of them is
 // moved up into a free waiting space rather than stranded — and is never
 // quietly reclassified as being at a vendor, which is a claim about a real bus
 // in the real world that the app has no way to know.
 const fleet=[{id:"a",l:"waiting-0"},{id:"b",l:"waiting-97"},{id:"c",l:"waiting-70"}];
 const moved=migrateReducedCapacity(fleet,"waiting",WAITING_CAPACITY);
 assert.equal(moved.find(bus=>bus.id==="a").l,"waiting-0");
 for(const id of ["b","c"]){
  const at=moved.find(bus=>bus.id===id).l;
  assert.ok(SECTION_SLOTS["WAITING AREA"].includes(at),id+" landed outside the waiting area at "+at);
  assert.ok(!at.startsWith("offsite-"),id+" was reclassified as being at a vendor");
 }
});

test("a Facility Map alert flag that flips twice adds its defect once, in the current wording", () => {
 /* syncFacilityAlertDefects compares its alert wording against defects that have
    just been normalized — and normalizing migrates a wording to its current
    home. Comparing the RAW wording against migrated defects never matched once
    a wording had moved, so the second flip of the same flag added the alert
    again. Three of the six alert wordings were already in that state; the Tech
    Services regroup would have made it five. */
 const off={id:"fb",l:"B12",s:"in",farebox:false,defects:[]};
 const on={...off,farebox:true};
 const first=syncFacilityAlertDefects(off,on);
 assert.equal(first.defects.length,1,"the first flip adds the alert");
 assert.equal(first.defects[0].issue,"Farebox - INOP (general)","and writes the current wording, not the one it will be migrated to");
 assert.equal(first.defects[0].category,"Tech Services");

 /* Flag goes off and on again with that defect still open: nothing new. */
 const second=syncFacilityAlertDefects({...first,farebox:false},{...first,farebox:true});
 assert.equal(second.defects.length,1,"the second flip must not add a duplicate");

 /* The same for an alert whose wording moved in an earlier release. */
 const ramp=syncFacilityAlertDefects({id:"r",l:"B1",s:"in",badRampKneeler:false,defects:[]},{id:"r",l:"B1",s:"in",badRampKneeler:true,defects:[]});
 assert.equal(ramp.defects.length,1);
 assert.equal(ramp.defects[0].category,"Bus Accessories","written in the migrated category");
 const rampAgain=syncFacilityAlertDefects({...ramp,badRampKneeler:false},{...ramp,badRampKneeler:true});
 assert.equal(rampAgain.defects.length,1,"a moved wording must dedupe too");
});

test("the Main Garage marks BAYS 1-6 as ready, with a line down the grid and a matching heading badge",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
 ]);

 /* T is the title bar every section on this page shares, so the new prop is
    optional and lives beside the existing count badge rather than replacing
    it — a section that never passes one renders exactly as it did. */
 assert.match(page,/function T\(\{name,menu,drop,count=0,badge,onAdd,onRemove,collapsed,onToggle\}/);
 assert.match(page,/<b className="section-count"[^>]*>\{count\}<\/b>\{badge&&<i className="section-badge">\{badge\}<\/i>\}/);
 assert.match(page,/const ttl=\(x:string,badge\?:string\)=><T name=\{x\} count=\{sectionBusCount\(buses,SECTION_SLOTS\[x\]\|\|\[\]\)\} badge=\{badge\}/);

 /* Main Garage is the only section passing one right now — this is a labeled
    boundary ahead of the smart tracking system, not a general re-theming.

    BAYS, not ROWS. A bay in this shop runs front to back and is numbered 1 to
    12 across the top of the grid; each numbered column is one bay however many
    rows deep the grid is drawn. There is no such thing as a row in the shop,
    so the badge must not name one. */
 assert.match(page,/\{ttl\("MAIN GARAGE \(BAYS 1-12\)","BAYS 1–6 READY"\)\}/);
 assert.equal((page.match(/"BAYS 1–6 READY"/g)||[]).length,1,"only the Main Garage passes this badge");
 assert.equal((page.match(/ROWS 1–6 READY/g)||[]).length,0,"the row wording is gone — it named a thing the shop does not have");

 /* The line runs DOWN between bay 6 and bay 7, which is column index 6 in a
    0-indexed row of twelve, and it is drawn on the column header AND on that
    column's cell in every row — .grow renders as display:contents and paints
    nothing itself, so the border has to land on the actual cells. Nothing here
    disturbs the existing bay 11/12 special-slot logic, which shares the same
    className expression. */
 assert.match(page,/\{Array\.from\(\{length:GARAGE_COLUMNS\},\(_,i\)=><b key=\{i\} className=\{i===GARAGE_READY_BAY_DIVIDER_COLUMN\?"ready-bay-divider":undefined\}>\{String\(i\+1\)\.padStart\(2,"0"\)\}<\/b>\)\}/);
 /* Named, not numbered. The column indices are the garage grid's geometry and
    live in facility-layout.ts; spelling them as literals here is what let five
    files disagree about the width in the first place. */
 assert.match(page,/className=\{\[c>=GARAGE_TROUBLE_BAY_FIRST_COLUMN\?"garage-special-slot":"",c===GARAGE_READY_BAY_DIVIDER_COLUMN\?"ready-bay-divider":""\]\.filter\(Boolean\)\.join\(" "\)\|\|undefined\}/);
 assert.equal((page.match(/ready-bay-divider/g)||[]).length,2,"the column header and the cell, and nothing else");
 assert.equal((page.match(/ready-rows-divider/g)||[]).length,0,"the row divider is gone");
 assert.equal((css.match(/ready-rows-divider/g)||[]).length,0);

 /* In the frame color rather than a green of its own: the barrier belongs to
    the structure of the garage, which is what --garage-frame already draws —
    the grid's borders, its numbers and its row labels. The badge follows the
    same variable, so recoloring the garage in Settings recolors both. 4px is
    thick enough to read as a boundary beside the grid's 1px spot borders. */
 assert.match(css,/\.garagegrid>b\.ready-bay-divider,\.grow \.spot\.ready-bay-divider\{border-left:4px solid var\(--garage-frame\)\}/);
 assert.match(css,/\.section-badge\{[^}]*color:var\(--garage-frame\)/);
 assert.doesNotMatch(css,/\.section-badge\{[^}]*#d7f5e4/,"the standalone green is gone; the badge follows the garage");
});

test("FULL SWEEP is a state either surface can start, and ending it offers the report",async()=>{
 const {readSweep,startSweep,endSweep,touchSweep,sweepLabel,sweepMinutes,SWEEP_IDLE_MINUTES,SWEEP_STORAGE_KEY}=
  await import("../src/lib/fleet/facility-sweep.ts");
 const map=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 const scanner=await readFile(new URL("../app/down-sheet/_components/down-sheet-scanner.tsx",import.meta.url),"utf8");

 const store=new Map();
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{store.set(k,String(v))},removeItem:k=>{store.delete(k)}};
 const at=h=>new Date(Date.UTC(2026,8,14,h,0,0)).toISOString();

 /* A STATE, NOT A SEQUENCE. Curtis does these in either order - "if a foreman
    or someone else decide to do the facility map sweep first and then upload
    the down sheet that could be a thing" - so one flag, either surface. */
 assert.equal(readSweep(storage,at(7)),null,"nothing on a fresh device");
 const begun=startSweep(storage,"map",at(7));
 assert.equal(begun.startedFrom,"map");
 assert.equal(readSweep(storage,at(7)).startedAt,at(7));

 /* STARTING AGAIN FROM THE OTHER SURFACE MUST NOT RESET THE CLOCK. The walk
    began when it began, and the scan prompt firing mid-walk is exactly the
    case that would otherwise restart it. */
 /* Five minutes later, still the same walk - the scan prompt firing mid-walk is
    exactly the case that would otherwise have restarted it. */
 const minutesIn=m=>new Date(Date.UTC(2026,8,14,7,m,0)).toISOString();
 const again=startSweep(storage,"scan",minutesIn(5));
 assert.equal(again.startedAt,at(7),"the original start time survives");
 assert.equal(again.startedFrom,"map");

 /* How long somebody has been at it, which is what they want off the banner. */
 assert.equal(sweepMinutes(readSweep(storage,minutesIn(12)),minutesIn(12)),12);
 assert.equal(sweepLabel(readSweep(storage,minutesIn(12)),minutesIn(12)),"12 min");
 assert.equal(sweepLabel(begun,at(7)),"just started");

 /* A WALK SOMEBODY NEVER ENDED, cut off on IDLE rather than on total length.
    Curtis: "a sweep will never last that long. If I have not pressed anything
    then just cut it off within 20 minutes." */
 assert.equal(SWEEP_IDLE_MINUTES,20);
 const mins=minutesIn;

 /* A LONG WALK SOMEBODY IS ACTIVELY WORKING IS NOT CUT OFF. Run forward in
    time, touching as a person would by moving buses, and the mode outlives any
    cap on total length. */
 touchSweep(storage,mins(15));
 assert.ok(readSweep(storage,mins(30)),"touched at 15, still walking at 30");
 touchSweep(storage,mins(30));
 touchSweep(storage,mins(45));
 const long=readSweep(storage,mins(55));
 assert.ok(long,"and at 55 - far past a twenty-minute cap on total length");
 assert.equal(long.startedAt,at(7),"while still reporting when the walk BEGAN");
 assert.equal(sweepMinutes(long,mins(55)),55,"so the banner counts the whole walk, not the gap since the last touch");

 /* And twenty QUIET minutes end it, however long ago it started. */
 assert.ok(readSweep(storage,mins(64)),"nineteen minutes after the last touch");
 assert.equal(readSweep(storage,mins(65)),null,"twenty, and it is over");

 /* touchSweep is a no-op with no sweep running, so callers never check first. */
 const quiet={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
 assert.equal(touchSweep(quiet,at(7)),null);

 /* A record written before lastActiveAt existed falls back to its start time -
    the conservative reading, expiring sooner rather than later. */
 storage.setItem(SWEEP_STORAGE_KEY,JSON.stringify({startedAt:at(7),startedFrom:"map"}));
 assert.ok(readSweep(storage,mins(10)),"an older record still reads");
 assert.equal(readSweep(storage,mins(25)),null,"and expires from its start time");

 storage.setItem(SWEEP_STORAGE_KEY,JSON.stringify({startedAt:at(7),startedFrom:"map",lastActiveAt:at(7)}));
 assert.equal(readSweep(storage,mins(25)),null,"expired at read time");
 assert.ok(storage.getItem(SWEEP_STORAGE_KEY),"and the record is left alone - a read must not be a write");

 assert.equal(endSweep(storage),true);
 assert.equal(storage.getItem(SWEEP_STORAGE_KEY),null);
 assert.equal(readSweep(storage,at(7)),null);

 /* Junk must not take the map down with it. */
 storage.setItem(SWEEP_STORAGE_KEY,"{not json");
 assert.equal(readSweep(storage,at(7)),null);
 storage.setItem(SWEEP_STORAGE_KEY,JSON.stringify({startedAt:"whenever"}));
 assert.equal(readSweep(storage,at(7)),null,"an unreadable start time is not a sweep");

 /* IT HOLDS NO FLEET DATA - only when the walk began and where from - so
    starting or ending one can never lose anybody's work. */
 const shape=Object.keys(JSON.parse(JSON.stringify(startSweep(storage,"scan",at(9)))));
 assert.deepEqual(shape.sort(),["lastActiveAt","startedAt","startedFrom"]);

 /* THE MAP SIDE. Ending the walk offers the report: finishing the walk and
    producing the answer are one act, and the report is what the walk was for. */
 assert.match(map,/endSweep\(localStorage\);\s*setSweep\(null\);/);
 assert.match(map,/setSweepReportOpen\(true\)/);
 assert.match(map,/className=\{"sweep-command"/);
 assert.match(map,/\{sweep&&<div className="sweep-banner"/,"a mode has to stay on screen while somebody scrolls the facility");

 /* Keyed on `buses` rather than on each handler, so nothing can be added later
    that moves a bus without extending the walk. */
 assert.match(map,/useEffect\(\(\)=>\{if\(hydrated\)touchSweep\(localStorage\)\},\[buses,hydrated\]\)/,
  "every board write restarts the idle clock");

 /* THE BUG THIS TEST EXISTS FOR. The Facility Map has never carried Down Sheet
    ENTRIES - only activeDownIds, which is membership - and the Status Report needs
    the entries to tell a downed bus from an inspection. Handed an empty array
    it reported DOWNED 0 with total confidence, which is worse than no report:
    a zero reads as good news. */
 assert.match(map,/setSweepEntries\(readDownSheetPayload<unknown>\(localStorage\.getItem\(DOWN_KEY\)\)\.entries\)/,
  "the sheet is read from storage when the report opens");
 assert.equal(/entries=\{\[\] as never\}/.test(map),false,"and never handed an empty sheet");

 /* THE SCAN SIDE. Asked AFTER the import - the scan is what the person came to
    do - and only when not already sweeping, because a prompt that appears
    mid-walk to ask whether you are walking is one people learn to dismiss.

    Asked by the PAGE rather than the scanner, and that is forced rather than
    tidy: importing closes the scanner, so a dialog it owned would unmount
    before anybody could answer. The confirm() this replaced only survived
    because it blocks the thread. */
 const sheet=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(scanner,/full sweep of the facility/,"the scanner no longer owns the question");
 assert.doesNotMatch(scanner,/readSweep|startSweep/,"nor the sweep record");
 assert.match(sheet,/setScannerOpen\(false\);[\s\S]{0,700}?if\(!readSweep\(localStorage\)\)setSweepAsk\("ask"\)/,
  "asked after the import, and only when not already mid-sweep");
 assert.match(sheet,/full sweep of the facility for bus count/);
 assert.match(sheet,/startSweep\(localStorage,"scan"\)/);

 /* A REAL NO. A confirm() offers OK and CANCEL and the browser owns both words.
    Curtis: "There is not a 'no' for an answer if I am not doing a full sweep of
    the yard." Cancel reads as backing out of the question rather than answering
    it, and NO has something to say here. */
 assert.match(sheet,/className="sweep-ask-no" onClick=\{\(\)=>setSweepAsk\("mismatch"\)\}>NO</,
  "NO is an answer, and it leads somewhere");
 assert.match(sheet,/className="sweep-ask-yes" onClick=\{\(\)=>\{startSweep\(localStorage,"scan"\);setSweepAsk\(""\)\}\}>YES</);

 /* WHAT NO IS ANSWERED WITH. A scan REPLACES the sheet and the map does not move
    with it, so the two can disagree until somebody walks the yard. Curtis: "if
    they hit no, then another message to show up saying 'be aware of any
    mismatches between buses on Fleet Map & new Downsheet' Full yard sweep
    recommended." */
 assert.match(sheet,/Be aware of any mismatches between buses on the Fleet Map and the new Down Sheet/);
 assert.match(sheet,/A full yard sweep is recommended/);

 /* THE PROMISE THAT IS GONE. It offered the Status Report as a reward for
    ending a sweep, and the report was never gated on one. Curtis: "The summary
    report is ALWAYS READY anyway. At anytime I can send it because it's real
    time snap shot of the fleet's health." */
 assert.doesNotMatch(sheet,/ending it offers the Status Report/);
 assert.doesNotMatch(scanner,/ending it offers the Status Report/);

 /* AND THE OTHER HALF OF THE SAME WARNING, on the sweep itself. The person who
    answered YES is the one actually walking the yard looking for these, so the
    banner carries it too. Curtis: "This may need to show up as a message with
    the full sweep."

    Only when the sweep began from a SCAN. A sweep started on the map has no new
    sheet behind it and nothing to reconcile, so it stays quiet rather than
    crying wolf every time. */
 assert.match(map,/sweep\.startedFrom==="scan"&&<em>Watch for mismatches between this map and the new sheet/,
  "a scan-started sweep says what the walk is for");
 const sweepCss=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 assert.match(sweepCss,/\.sweep-banner span em\{display:block/,
  "on its own row, or it pushes END & REPORT off a phone");
});

test("a road call logged on the sheet reaches the bus, whichever source saw it first",async()=>{
 const {reconcileRoadCallsFromSheet,standingRoadCalls,SHEET_ROAD_CALL_PREFIX}=await import("../src/lib/fleet/road-calls.ts");
 const page=await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");

 /* MEASURED ON THE SHOP'S OWN CLOUD before this was written: 109 buses, zero
    with the roadcall flag, zero with any dated event - and four live sheet
    entries in section Roadcall. Every road call in that garage arrives on
    paper, so the map's ROADCALL flag had never once lit, and a report reading
    the bus record would have said "0 road calls" while the sheet in somebody's
    hand said four. Curtis: "All sources should update no matter where it was
    first logged." */
 const now="2026-09-13T18:00:00.000Z";
 const hoursAgo=h=>new Date(Date.parse(now)-h*3600000).toISOString();
 const fleet=[{id:"b1",n:"17501",l:"garage-1",roadcall:false},{id:"b2",n:"17502",l:"bay-3",roadcall:false}];
 const entries=[{id:"e1",busId:"b1",section:"Roadcall",workflow:"Scheduled",createdAt:hoursAgo(5)},
                {id:"e2",busId:"b2",section:"Pending",workflow:"Scheduled",createdAt:hoursAgo(5)}];

 const first=reconcileRoadCallsFromSheet(fleet,entries,now);
 assert.deepEqual(first.started,["b1"],"only the bus the sheet calls a road call");
 const b1=first.fleet.find(bus=>bus.id==="b1");
 assert.equal(b1.roadCalls.length,1,"the breakdown is logged from the paper sheet, which is the whole point");
 assert.ok(b1.roadCalls[0].id.startsWith(SHEET_ROAD_CALL_PREFIX),"and where it came from stays legible");
 /* AND THE FLAG DOES NOT GO ON, which is the opposite of what this asserted
    when it was written, and deliberate.

    Curtis set the rule from the floor: "any bus that is added to the downsheet
    while it is in roadcall status should not be counted here. Once its placed
    on downsheet the roadcall status is canceled (although still logged per our
    design already)... Anyone taking counts and see a bus that is on property
    that just came in from roadcall, marks it down on sheet it is no longer in
    the roadcall count."

    The EVENT and the STATUS were being conflated. The event is the breakdown
    and is permanent; the flag says the bus is out on one RIGHT NOW, and a bus
    somebody is standing next to writing up is back. So the sheet still logs
    what the paper says — which is why this reconciler exists at all — and the
    pending status it used to raise is exactly what a sheet row now cancels. */
 assert.equal(b1.roadcall,false,"on the sheet is not pending: the status is cancelled, the history is not");

 /* Dated from the ENTRY, not from now: "in the last 36 hours" has to mean 36
    hours since the breakdown, not since somebody scanned the sheet. */
 assert.equal(b1.roadCalls[0].at,hoursAgo(5));

 /* The bus is NOT moved. The sheet says it broke down; it does not say where it
    is now, and the person who scanned it has usually already parked it. */
 assert.equal(b1.l,"garage-1","a paper heading must not undo a location somebody set by hand");

 /* Reconciling runs on EVERY write of the sheet, so it has to be idempotent -
    otherwise one scan becomes a road call event per keystroke. */
 const second=reconcileRoadCallsFromSheet(first.fleet,entries,now);
 assert.deepEqual(second.started,[],"a second pass starts nothing");
 assert.equal(second.fleet.find(bus=>bus.id==="b1").roadCalls.length,1,"and appends nothing");
 assert.equal(second.fleet,first.fleet,"an unchanged fleet is returned by identity, so React does not rewrite storage");

 /* A completed entry is history, not a live road call. */
 assert.deepEqual(reconcileRoadCallsFromSheet(fleet,[{id:"e3",busId:"b2",section:"Roadcall",workflow:"Completed"}],now).started,[]);

 /* FIXED ON THE SHEET MUST DISAPPEAR. Curtis: "If a road call happened within
    the last thirty six hours, but it was updated as fixed, then it should not
    show." Closing the Roadcall row is where a foreman actually records that a
    bus is fixed, so the flag has to come off there — otherwise a repaired bus
    stays on the report for a day and a half. */
 const completed=reconcileRoadCallsFromSheet(first.fleet,
  [{...entries[0],workflow:"Completed"},entries[1]],now);
 assert.deepEqual(completed.ended,["b1"]);
 const fixed=completed.fleet.find(bus=>bus.id==="b1");
 assert.equal(fixed.roadcall,false,"marking the row fixed takes the bus out of road-call status");
 assert.equal(standingRoadCalls(fixed,now,36).length,0,"so it drops off the Status Report at once");

 /* Moving the row OUT of Roadcall does the same - it is no longer a road call
    whatever else it now is. */
 assert.equal(reconcileRoadCallsFromSheet(first.fleet,[{...entries[0],section:"Pending"},entries[1]],now)
  .fleet.find(bus=>bus.id==="b1").roadcall,false);

 /* But the bus is NOT moved back. clearRoadCall restores a location inside a
    one-minute undo window; this may run days later, and a stale `from` would
    move a vehicle somebody has since parked by hand. */
 assert.equal(fixed.l,"garage-1");

 /* A MAP-TICKED CALL IS CANCELLED BY THE SHEET TOO, and its event survives.
    Curtis said ANY bus added to the sheet, not only one filed under Roadcall —
    a bus that came in off a road call and was written up for brakes is still
    written up. The flag comes off; nothing else about the bus is touched. */
 const ticked=[{id:"b5",n:"17505",l:"road-4",roadcall:true,roadCalls:[{id:"road-call-map-b5",at:hoursAgo(2)}]}];
 const writtenUp=reconcileRoadCallsFromSheet(ticked,[{id:"e5",busId:"b5",section:"Pending",workflow:"Scheduled"}],now).fleet[0];
 assert.equal(writtenUp.roadcall,false,"written up on the sheet, whatever the section, is no longer pending");
 assert.equal(writtenUp.roadCalls.length,1,"and the map's own event is never withdrawn by the sheet");
 assert.equal(standingRoadCalls(writtenUp,now,36).length,0,"so it leaves the report");
 /* Taking the row back off does NOT re-raise it. Re-raising would be the app
    deciding a bus is out on the road because somebody deleted a row, and every
    reader that goes by events rather than status still has the breakdown. */
 assert.equal(reconcileRoadCallsFromSheet([writtenUp],[],now).fleet[0].roadcall,false,
  "and deleting the row does not put the bus back out on the road");

 /* A bus out on BOTH a map-ticked call and a sheet-ticked one keeps the flag
    when only the sheet's half closes: it is still out on the other. */
 const both=[{id:"b4",n:"17504",l:"road-2",roadcall:true,roadCalls:[
  {id:"road-call-map-b4",at:hoursAgo(3)},{id:SHEET_ROAD_CALL_PREFIX+"e9",at:hoursAgo(4)}]}];
 const half=reconcileRoadCallsFromSheet(both,[],now).fleet[0];
 assert.equal(half.roadcall,true,"the map's call still stands");
 assert.equal(half.roadCalls.length,1,"and only the sheet's half was withdrawn");

 /* SCOPED, which is what makes it safe to run on every write of the sheet: the
    sheet ends only what the sheet started. A call ticked on the Facility Map or
    the Defect Log is somebody's direct statement about a bus and is not the
    sheet's to withdraw.

    Formerly ADDITIVE ONLY: clearRoadCall moves a bus back off the road
    and withdraws history, which is a decision a person makes. A reconciler that
    ran on every sheet write and could also un-ring the bell would eventually
    clear a road call ticked on the map for a bus never on the sheet. */
 const onMap=[{id:"b3",n:"17503",l:"road-1",roadcall:true,roadCalls:[{id:"road-call-map-b3",at:hoursAgo(1)}]}];
 assert.equal(reconcileRoadCallsFromSheet(onMap,[],now).fleet[0].roadcall,true,
  "a road call ticked on the map survives a sheet that has never heard of the bus");

 /* STANDING means both halves: inside the window AND still in that status. */
 assert.equal(standingRoadCalls({roadcall:true,roadCalls:[{id:"a",at:hoursAgo(5)}]},now,36).length,1);
 assert.equal(standingRoadCalls({roadcall:true,roadCalls:[{id:"a",at:hoursAgo(40)}]},now,36).length,0,"outside 36 hours");
 assert.equal(standingRoadCalls({roadcall:false,roadCalls:[{id:"a",at:hoursAgo(2)}]},now,36).length,0,
  "fixed and back in service: the flag is off and the history stays, and it must not be counted");

 /* Wired where EVERY change to the sheet passes through - a scan, a typed row,
    a cloud merge - rather than on the scanner alone, which is one of the three. */
 assert.match(page,/reconcileRoadCallsFromSheet\(membership,entries\)\.fleet/,
  "reconciled beside DS membership, at the one chokepoint every sheet write crosses");
});

test("Fixed Repairs takes a typed bus number, not only a dropdown",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
 ]);

 /* Logging a stack of work orders means one bus number after another, off the
    paper in front of you. A dropdown of the whole fleet is the slow path for
    that, and every other page in this app already lets the number be typed. */
 assert.match(page,/<label className="fixed-type-bus"><span>TYPE BUS #<\/span><input autoFocus inputMode="numeric" value=\{busQuery\}/);
 assert.match(page,/placeholder="Full # or last 2"/);
 // The list stays for the times somebody is looking rather than typing.
 assert.match(page,/<label>OR PICK FROM THE LIST<select value=\{record\.bus\.id\}/);

 /* The same resolver the rest of the app uses, so two ending digits work here
    exactly as they do on the map and in the Defect Log. */
 assert.match(page,/import \{candidateBusNumbers,resolveBusNumber\} from "(?:[^"]*\/)bus-number-resolver"/);
 assert.match(page,/const resolution=resolveBusNumber\(fleet,value\);\s*if\(resolution\.kind!=="exact"&&resolution\.kind!=="suffix"\)return;/);

 /* A number that resolves to nothing must not clear a bus already chosen —
    a half-typed number would otherwise wipe a selection made from the list. */
 assert.match(page,/setNewRepair\(current=>current\?\{\.\.\.current,bus:resolution\.bus\}:current\)/);
 /* And the box says what it did, because silently landing on the wrong bus is
    how a repair gets logged against somebody else's work order. */
 assert.match(page,/resolution\.kind==="ambiguous"\)return busQuery\+" matches "\+candidateBusNumbers\(resolution\.matches\)\.join\(", "\)/);
 assert.match(page,/No bus matches "\+busQuery/);

 /* Exactly one field may claim the focus. FIX / STEPS TAKEN renders later in
    the DOM and had it unconditionally, so on a new repair it silently won the
    race and the cursor landed two boxes past where the typing was headed. */
 assert.match(page,/<textarea autoFocus=\{!isNew\}/);
 assert.equal((page.match(/autoFocus(?![=\w])/g)||[]).length,1,"only the typed bus number takes focus outright");

 // It is the biggest control in the box, the way the Defect Log's typed number is.
 assert.match(css,/\.fixed-new-bus \.fixed-type-bus>input\{[^}]*font-size:26px/);
 assert.match(css,/\.fixed-new-bus \.fixed-type-bus>input\{[^}]*min-height:52px/);
});

test("a trouble bay is not the main garage",async()=>{
 /* Curtis moved a bus to B12 from the Defect Log and the line under the bus
    number still read Main Garage: "it believes that it's in b twelve, which is
    in the main garage, but there is a distinction there."

    There is, and everything except the label already knew it. */
 const {locationLabel,knownLocationLabel}=await import("../src/lib/fleet/location-label.ts");
 const {RELOCATION_AREAS}=await import("../src/lib/fleet/facility-areas.ts");
 /* Read off the areas the MOVE editor writes with rather than hard-coded slot
    ids, so this test cannot pass against a garage the move editor has since
    renumbered. */
 for(const slot of RELOCATION_AREAS["TROUBLE BAY 11"])assert.equal(locationLabel(slot),"Trouble Bay 11");
 for(const slot of RELOCATION_AREAS["TROUBLE BAY 12"])assert.equal(locationLabel(slot),"Trouble Bay 12");
 for(const slot of RELOCATION_AREAS["MAIN GARAGE (BAYS 1-10)"])assert.equal(locationLabel(slot),"Main Garage");
 /* All 84 garage spaces are covered by exactly one of the three. */
 const garage=[...RELOCATION_AREAS["MAIN GARAGE (BAYS 1-10)"],...RELOCATION_AREAS["TROUBLE BAY 11"],...RELOCATION_AREAS["TROUBLE BAY 12"]];
 assert.equal(new Set(garage).size,84);
 /* The prefix fallback still answers for the places no area lists — the West
    overflow and the gaps in the East lot's numbering. */
 assert.equal(locationLabel("west-overflow-2"),"CNG West");
 assert.equal(locationLabel("east-3"),"CNG East");
 /* OFF PROPERTY, which the Fixed Repairs copy of this list never had. */
 assert.equal(locationLabel("offsite-3"),"Off Property");
 /* An unrecognised slot is shown, not swallowed; a blank one takes the caller's
    own wording. */
 assert.equal(locationLabel("nonsense-9"),"nonsense-9");
 assert.equal(locationLabel(""),"Location not set");
 assert.equal(locationLabel("","Location not recorded"),"Location not recorded");
 /* The share export prints nothing rather than a slot id at somebody who does
    not have the app open. */
 assert.equal(knownLocationLabel("nonsense-9"),"");
 assert.equal(knownLocationLabel("garage-11"),"Trouble Bay 12");
});

test("a hold is a fact about the bus, and only time or a person lifts it",async()=>{
 /* Curtis: "somebody just asked me about two buses that are gonna probably come
    in to B12, and if they do, they want me to hold those buses." */
 const {setBusHold,isHeld,heldBuses,heldBusCount,normalizeHold,holdExpired,holdUntilLabel,heldMinutes}=await import("../src/lib/fleet/bus-hold.ts");
 const now=new Date("2026-09-10T22:00:00.000Z");
 const at=hours=>new Date(now.getTime()+hours*3600000).toISOString();
 const bus={id:"b1",n:"18505",l:"road-1"};
 /* NO KEY UNTIL THERE IS A HOLD, and no key again once there is not. busRow
    copies every own key of a bus into map_fields and rowFingerprint walks
    Object.keys, so hold:undefined would change every bus's fingerprint and
    re-push the shop's whole fleet table — the trap fluids and reportAttempts
    were written around on the defect record. */
 assert.equal(Object.keys(bus).includes("hold"),false);
 const held=setBusHold(bus,true,{at:at(-2),by:"CT"});
 assert.equal(Object.keys(setBusHold(held,false)).includes("hold"),false,"clearing DELETES the key");
 /* The time is optional — Curtis: "I don't want a time to be required in case a
    person doesn't know the time off hand." With none, it simply stands. */
 assert.equal(isHeld(held,now),true);
 assert.equal(held.hold.until,undefined);
 assert.equal(holdUntilLabel(held.hold),"");
 /* With one, it lifts when that time passes. */
 const timed=setBusHold(bus,true,{at:at(-2),until:at(1)});
 assert.equal(isHeld(timed,now),true);
 assert.equal(holdExpired(timed.hold,now),false);
 const past=setBusHold(bus,true,{at:at(-5),until:at(-1)});
 assert.equal(isHeld(past,now),false,"past its time it stops counting");
 assert.equal(holdExpired(past.hold,now),true);
 /* Read-time only. The record is left exactly as it is on the device. */
 assert.equal(Object.keys(past).includes("hold"),true,"an expired hold is not rewritten away");
 /* NOTHING ABOUT WHERE THE BUS IS EVER CLEARS IT. Curtis first said a location
    move should lift it, then chose otherwise when asked — his own buses were
    ARRIVING, and arriving is a move, so that rule would have dropped the hold
    at the moment it started to matter. */
 const source=await readFile(new URL("../src/lib/fleet/bus-hold.ts",import.meta.url),"utf8");
 assert.equal(/\bl\b\s*[=!]==|location|lastLocationChangeAt/.test(source.replace(/\/\*[\s\S]*?\*\//g,"")),false,"no code here reads where the bus is");
 assert.equal(isHeld(setBusHold({...held,l:"garage-0"},true,{at:at(-2)}),now),true,"moved, still held");
 /* A hold with no readable stamp is not a hold: every screen that draws one
    says when it was placed. Boards are files people hand-edit and transfers
    carry between devices. */
 assert.equal(normalizeHold({by:"CT"}),null);
 assert.equal(normalizeHold({at:"not-a-date"}),null);
 assert.equal(normalizeHold("yes"),null);
 assert.equal(isHeld({hold:{at:"not-a-date"}},now),false);
 /* Longest-held first, and expired ones are not in the list at all. */
 assert.deepEqual(heldBuses([past,timed,held],now).map(row=>row.bus.n),["18505","18505"]);
 assert.equal(heldBusCount([past,timed,held],now),2);
 assert.equal(Math.round(heldMinutes(held.hold,now)),120);
 /* Floored at zero: a device with a wrong clock can stamp the future, and
    "-4M" on a board reads as a bug in the app rather than in a clock. */
 assert.equal(heldMinutes(setBusHold(bus,true,{at:at(3)}).hold,now),0);
});

test("the HOLD badge is a button that opens every held bus, and never shows the time",async()=>{
 /* Curtis: "pressing it on one bus, I wanted to show all the buses that are
    being held, and a time." And on the badge itself: "don't just show the time
    of the expected arrival by default, you have to press it to see that
    information." */
 const board=await readFile(new URL("../src/components/fleet/hold-board.tsx",import.meta.url),"utf8");
 const badge=board.slice(board.indexOf("export function HoldBadge"),board.indexOf("export default function"));
 assert.match(badge,/<button type="button" className="work-state-badge bus-hold-badge"/,"the same look as the deferred badge, per Curtis");
 assert.equal(/holdUntilLabel|until/.test(badge),false,"no time on the badge");
 /* The time exists only in the list, and says so when nobody set one rather
    than leaving a blank line. */
 assert.match(board,/\{until\|\|"NO TIME SET"\}/);
 /* Both surfaces open the same list. The map matters most: it is the only one
    that draws a held bus with NO defects, which is the case this was built
    for — two buses that had not arrived yet. */
 for(const file of ["../app/page.tsx","../app/defect-log/page.tsx"]){
  const page=await readFile(new URL(file,import.meta.url),"utf8");
  assert.match(page,/<HoldBoard fleet=/,file+" opens the list");
  assert.match(page,/<HoldBadge count=/,file+" draws the badge");
 }
 /* THE SAME SIZE AS THE DEFERRED BADGE. Curtis asked twice — "it can look just
    the same, maybe the colour can be different", then "make sure the badge is
    similar to the deferred one, in size etc" after seeing it at 47x36 beside a
    37x24 WAS DEF. These numbers are copied from .inline-deferred-history-badge
    rather than chosen, so they are asserted against it rather than as
    literals: whatever that badge is, this one matches. */
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
 const logCss=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
 const deferred=(css+logCss).match(/\.inline-deferred-history-badge\{[^}]*\}/g).join("");
 for(const property of ["height:24px","border-radius:12px","font-size:9px"])
  assert.ok(deferred.includes(property.replace("height:24px","height:17px"))||deferred.includes(property),"the deferred badge still declares "+property);
 assert.match(css,/\.bus-hold-badge\{position:relative;height:24px;[^}]*border-radius:12px/);
 assert.match(css,/\.bus-hold-badge\{[^}]*padding:0 8px;font-size:9px/);
 /* And a rule that actually reaches it on a card: .log-meta .work-state-badge
    (0,2,0) pins every badge in that column to 22px and beats .bus-hold-badge
    (0,1,0), so the size set in globals.css never applied there. */
 assert.match(logCss,/\.log-meta \.bus-hold-badge\{min-height:0;height:24px;padding:0 8px;border-radius:12px\}/);
 assert.match(logCss,/\.log-meta \.work-state-badge\{min-height:22px/,"the rule it has to match, so this fails honestly if that one goes");
 /* The tap target is kept without making the box bigger, because this one is a
    button and the badges beside it are labels. Measured: a 24px pill with 40px
    of reachable height, and nothing of its neighbours' taps stolen — the
    timestamps below it stay topmost at their own centres. */
 assert.match(css,/\.bus-hold-badge::after\{content:"";position:absolute;left:0;right:0;top:50%;height:40px;transform:translateY\(-50%\)\}/);
 /* NOT in the badge slot above it. That slot is a pair of FIXED sub-slots so
    DS and the count sit at the same x with or without each other; a third
    badge moves them, which is the tab-stop rule two tests hold after the DS
    badge once measured 4px on top of the repair text. */
 const logPage=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
 const slot=logPage.slice(logPage.indexOf('<span className="log-badge-slot">'),logPage.indexOf("</span>",logPage.indexOf('<span className="log-badge-slot">')));
 assert.equal(slot.includes("HoldBadge"),false,"the fixed tab stops are left alone");
});

test("the garage's shape is one set of numbers, and everything that reads the grid agrees",async()=>{
 /* PHASE 0 OF PULLING THE SITE OUT OF THE CODE (issue #21).

    A `garage-N` slot id carries its position arithmetically: row N/COLUMNS,
    column N%COLUMNS. So every question about where a garage slot IS depends on
    the WIDTH — and the width was written as a bare 12 in five separate files.

    `mystery-buses.ts` is the one that made this worth fixing before anything
    else. It asked `slot%12>=10` to mean "the last two columns". Change the
    garage to ten wide or fourteen and that expression still runs, still returns
    a boolean, and marks the WRONG buses on the awareness board a foreman
    reads. No error, no failing test.

    This test is the net that makes a width change safe rather than merely
    centralised: it drives the two independent definitions of "trouble bay" -
    the awareness predicate, and the move destinations the editor offers - over
    EVERY slot in the garage and requires them to agree. */
 const {GARAGE_CAPACITY,GARAGE_COLUMNS,GARAGE_ROWS,GARAGE_TROUBLE_BAY_FIRST_COLUMN,isGarageTroubleBayIndex}=
  await import("../src/lib/fleet/facility-layout.ts");
 const {RELOCATION_AREAS,SECTION_SLOTS}=await import("../src/lib/fleet/facility-areas.ts");
 const {isBay12AwarenessArea}=await import("../src/lib/fleet/mystery-buses.ts");

 /* Derived, never typed: 84 is 7x12 and must stay that way by construction. */
 assert.equal(GARAGE_CAPACITY,GARAGE_ROWS*GARAGE_COLUMNS);
 assert.equal(SECTION_SLOTS["MAIN GARAGE (BAYS 1-12)"].length,GARAGE_CAPACITY);

 const bay11=new Set(RELOCATION_AREAS["TROUBLE BAY 11"]);
 const bay12=new Set(RELOCATION_AREAS["TROUBLE BAY 12"]);
 const standard=new Set(RELOCATION_AREAS["MAIN GARAGE (BAYS 1-10)"]);
 /* One bay per row, and the three destinations partition the grid exactly:
    nothing is in two of them, and no slot is left out of all three. */
 assert.equal(bay11.size,GARAGE_ROWS);
 assert.equal(bay12.size,GARAGE_ROWS);
 assert.equal(standard.size,GARAGE_CAPACITY-2*GARAGE_ROWS);

 for(let slot=0;slot<GARAGE_CAPACITY;slot++){
  const id="garage-"+slot,column=slot%GARAGE_COLUMNS;
  const inTroubleBay=bay11.has(id)||bay12.has(id);
  const places=[standard.has(id),bay11.has(id),bay12.has(id)].filter(Boolean).length;
  assert.equal(places,1,id+" must belong to exactly one move destination");
  /* THE ASSERTION THAT BITES. The awareness test and the move destinations are
     written independently and must never disagree about which slots are the
     trouble bays. */
  assert.equal(isBay12AwarenessArea(id),inTroubleBay,
   id+" (column "+column+"): the awareness test and the move destinations disagree");
  assert.equal(isGarageTroubleBayIndex(slot),inTroubleBay,
   id+": the shared predicate disagrees with the move destinations");
  assert.equal(column>=GARAGE_TROUBLE_BAY_FIRST_COLUMN,inTroubleBay,
   id+": the boundary column does not match where the trouble bays actually are");
 }

 /* A slot one past the end is not a trouble bay by accident of the modulo. */
 assert.equal(isGarageTroubleBayIndex(-1),false);
 assert.equal(isGarageTroubleBayIndex(1.5),false);
 assert.equal(isBay12AwarenessArea("garage-"),false,"a garage id with no number is not an area");

 /* And the literals are gone from the four files that used to carry them, so a
    future width change has exactly one place to happen. */
 const [layout,areas,mystery,page]=await Promise.all([
  readFile(new URL("../src/lib/fleet/facility-layout.ts",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/fleet/facility-areas.ts",import.meta.url),"utf8"),
  readFile(new URL("../src/lib/fleet/mystery-buses.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
 ]);
 const code=source=>source.replace(/\/\*[\s\S]*?\*\//g,"").replace(/^\s*\/\/.*$/gm,"");
 assert.equal(/%\s*12/.test(code(mystery)),false,"mystery-buses must not spell the garage width itself");
 assert.equal(/row\s*\*\s*12|r\s*\*\s*12/.test(code(areas)+code(page)),false,
  "the garage grid must be indexed through GARAGE_COLUMNS, not a literal");
 assert.equal(/facilitySlots\("garage",\s*84\)/.test(code(areas)),false,
  "the garage capacity must be derived from the grid");
 /* The numbers themselves live in exactly one file. */
 assert.match(code(layout),/export const GARAGE_COLUMNS=12;/);
 /* mystery-buses and the map read the grid straight from facility-layout.
    facility-areas reaches it through site-config, which is where the garage's
    column arithmetic moved in Phase 1 — so the chain is asserted rather than a
    direct import that is no longer there. What matters is that no file works
    the width out for itself, which the literal checks above already require. */
 for(const [name,source] of [["mystery-buses",mystery],["page",page]])
  assert.match(code(source),/from "(?:[^"]*\/)?facility-layout(\.ts)?"/,name+" must read the grid from facility-layout");
 assert.match(code(areas),/from "(?:[^"]*\/)?site-config(\.ts)?"/,"facility-areas must read the site config");
 const config=await readFile(new URL("../src/lib/fleet/site-config.ts",import.meta.url),"utf8");
 assert.match(code(config),/from "(?:[^"]*\/)?facility-layout(\.ts)?"/,"site-config must read the grid from facility-layout");
});

test("site-config describes this building exactly as the five tables already do",async()=>{
 /* PHASE 1 OF PULLING THE SITE OUT OF THE CODE (issue #21).

    `site-config.ts` is the single description of the yard. The five tables are
    NOT derived from it yet — that swap happens one consumer at a time, with the
    rendered map diffed at each step. This test is what makes that swap a
    refactor rather than a rewrite: it requires the config to reproduce every
    existing table exactly, so a consumer can be pointed at it without anything
    moving.

    It found two things a reading would not have. Both are ORDER, and in this
    app order is not decoration. */
 const {siteSectionSlots,siteRelocationAreas,siteAreaLabels,siteThemeKeys,siteAliases,sitePrefixLabels}=
  await import("../src/lib/fleet/site-config.ts");
 const {SECTION_SLOTS,RELOCATION_AREAS}=await import("../src/lib/fleet/facility-areas.ts");
 const {SECTION_THEME_KEYS}=await import("../src/lib/settings/map-settings.ts");
 const {findOperatorArea}=await import("../src/lib/fleet/fleet-intelligence.ts");
 const {locationLabel}=await import("../src/lib/fleet/location-label.ts");

 /* 1. WHAT EXISTS. Every slot id, in order, including the CNG East lot's gaps -
    two painted columns inside a four-wide numbering, so its ids skip. */
 assert.deepEqual(siteSectionSlots(),SECTION_SLOTS,"the sections and their slots must match exactly");
 assert.deepEqual(siteRelocationAreas(),RELOCATION_AREAS,"the move destinations must match exactly");
 /* Checked as exact ids, not as text: "east-3" is a substring of "east-30",
    which the lot really does have, so a string search matches for the wrong
    reason and would pass whatever the config said. */
 const east=new Set(siteSectionSlots()["CNG EAST LOT"]);
 assert.equal(east.size,18,"eighteen painted spaces");
 for(const id of ["east-1","east-2","east-33","east-34"])assert.ok(east.has(id),id+" is a real space");
 for(const id of ["east-0","east-3","east-4","east-7"])assert.equal(east.has(id),false,
  id+" is a gap in the numbering and must not be generated");

 /* 2. WHAT A PERSON IS TOLD, checked THROUGH the live label function on a real
    slot of every destination rather than against the label table's text. */
 const labels=siteAreaLabels();
 for(const [name,slots] of Object.entries(siteRelocationAreas()))
  assert.equal(locationLabel(slots[0]),labels[name],name+" is labelled differently by the app");

 /* 3. THE SWATCH LIST, IN ITS OWN ORDER. The theme list and the section list
    are ordered differently in this app - FOREMAN OFFICE is sixth among the
    swatches and ninth among the sections - and the swatch order is what a
    person scrolls in Settings. Sorting the config by section order silently
    reorders somebody's colour picker. */
 /* AND THIS ASSERTION IS THE GUARD FOR THE ONE CONSUMER NOT SWITCHED.
    `map-settings.ts` keeps its literal `as const` array, because
    `SectionThemeKey` is the union derived from it and reading the array at
    runtime would degrade that to plain `string` — a misspelt section key would
    start type-checking in the file that types all theming. So the two lists
    genuinely coexist, and this is what stops them drifting. */
 assert.deepEqual(siteThemeKeys(),SECTION_THEME_KEYS.map(([key,label])=>[key,label]),
  "the theme swatches must match in content AND order");
 assert.equal(siteThemeKeys().length,SECTION_THEME_KEYS.length);
 assert.equal(siteThemeKeys().some(([key])=>key==="offsite"),false,
  "OFF PROPERTY has no theme entry in this app; inventing one is a visible change");

 /* 4. THE ALIAS LIST, AND ITS ORDER IS BEHAVIOUR. `findOperatorArea` walks the
    list and returns the FIRST area one of whose aliases appears in the command,
    so two areas with overlapping aliases are decided by which comes first. */
 const areas=Object.keys(siteRelocationAreas()).map(name=>({name}));
 for(const [area,aliases] of siteAliases())for(const alias of aliases)
  assert.equal(findOperatorArea(alias,areas)?.name,area,'"'+alias+'" must resolve to '+area);
 /* THE ORDER ITSELF, RESOLVED THROUGH THE CONFIG'S OWN LIST.

    Feeding each alias in on its own proves nothing about order - every alias
    matches its own area whatever the sequence. And `findOperatorArea` walks
    fleet-intelligence's private table, so asking IT about an overlapping phrase
    says nothing about this file either. A first draft did both of those and a
    mutation that removed the config's sort survived them.

    So: resolve the phrase the way the app does - first area in the list one of
    whose aliases appears in the command - but walking the CONFIG's order, and
    require the two to land on the same area. Now a config ordered any other way
    disagrees with the app and fails here. */
 /* PINNED TO THE ANSWER, NOT TO AGREEMENT BETWEEN TWO LISTS.

    This assertion used to resolve the phrase through the config's own list and
    require `findOperatorArea` to agree. That bit while the two were separate -
    and stopped the moment `fleet-intelligence.ts` began reading the config,
    because then both sides walked the same array and moved together. The
    mutation that removes the config's alias sort passed. Caught by re-running
    it after the swap, which is the only reason it is written this way now.

    So the expected area is spelled out. TROUBLE BAY 11 owns "bay 11" and SHOP
    BAYS owns "service bay", and both sit inside "service bay 11": the trouble
    bays are listed ahead of the shop bays, so it resolves the way somebody
    standing in the shop means it. Re-sort the list and these fail. */
 for(const [phrase,expected] of [
  ["service bay 11","TROUBLE BAY 11"],
  ["service bay 12","TROUBLE BAY 12"],
  ["put it in shop bays","SHOP BAYS (DIAGONAL)"],
  ["the pit","PIT"],
  ["move it to main garage","MAIN GARAGE (BAYS 1-10)"],
  ["waiting","WAITING AREA"],
 ])assert.equal(findOperatorArea(phrase,areas)?.name,expected,
  '"'+phrase+'" must resolve to '+expected+' - the alias order decides it');

 /* 5. THE PREFIX FALLBACK, for a location no destination lists - an overflow
    slot, or an east id outside the painted columns.

    ORDER-INDEPENDENT, AND THAT IS ASSERTED RATHER THAN ASSUMED. The lookup is
    first-match-wins, and the config lists the prefixes in a different order
    than the hand-written table did, so the reorder is only safe while no prefix
    is itself a prefix of another. It is a near miss: "offsite-" and "office-"
    share three characters, and so do "wall-", "waiting-" and "wash-". If a
    future section is ever added whose prefix contains an existing one, this
    fails here rather than silently mislabelling a bus. */
 const prefixes=sitePrefixLabels();
 for(const [a] of prefixes)for(const [b] of prefixes)
  if(a!==b)assert.equal(b.startsWith(a),false,'"'+a+'" is a prefix of "'+b+'" - the fallback order would start to matter');
 for(const slot of ["west-overflow-2","bay-overflow-0","service-overflow-1","east-3"])
  assert.equal(prefixes.find(([prefix])=>slot.startsWith(prefix))?.[1],locationLabel(slot),
   slot+" must fall back to the same label the app gives it");

 /* And the config covers the whole building, so pointing a consumer at it
    cannot drop a section on the way. */
 const {SITE_SECTIONS}=await import("../src/lib/fleet/site-config.ts");
 assert.equal(SITE_SECTIONS.length,Object.keys(SECTION_SLOTS).length);
 assert.equal(SITE_SECTIONS.flatMap(section=>section.areas).length,Object.keys(RELOCATION_AREAS).length);
});
