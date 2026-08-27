import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasBusNumberConflict, hasLocationConflict, validateBusUpdate } from "../app/fleet-validation.ts";
import { applyDownEntryToFleet } from "../app/down-sheet/down-sheet-sync.ts";
import { downSheetBadgeBusIds, downSheetCountLabel, downSheetMembershipMatches, reconcileDownSheetMembership, selectedDownSheetBusIds } from "../app/down-sheet-counter.ts";
import { syncTrackerDownSheetSelection } from "../app/down-sheet/tracker-membership-sync.ts";
import { clearDownSheetState, readDownSheetClearSnapshot, restoreDownSheetState } from "../app/down-sheet/down-sheet-clear.ts";
import { moveOrSwapBuses, roadServiceStatus, statusForLocation } from "../app/smart-status.ts";
import { clearFacilityOnlyDefects, facilityOnlyDefectCount, readFacilityDefectClearSnapshot, restoreFacilityOnlyDefects, syncFacilityAlertDefects } from "../app/facility-defect-clear.ts";
import { bulkAreaAvailability, bulkRelocateBuses } from "../app/bulk-relocation.ts";
import { applyDefectToBuses } from "../app/bulk-defects.ts";
import { reassignBusPair } from "../app/pair-reassignment.ts";
import { CHECK_ENGINE_SYMPTOMS, migrateRepairIdentity, REPAIR_CATEGORY_EMOJI, REPAIR_OPTION_GROUPS, REPAIR_OPTIONS, defaultDefectOperability, defectFromDraft, defectLabel, defectSupportingDetails, defectSummary, normalizeDefects, repairCategoryEmoji, repairCategoryLabel, repairGroupDisplayLabel, repairIssueDisplayLabel, repairGroupPlaceholder, repairGroupStepLabel, repairIssuePlaceholder, repairIssueStepLabel } from "../app/repair-catalog.ts";
import { sectionBusCount } from "../app/section-count.ts";
import { appendMaintenanceEvent, appendOdometerReading, latestMaintenanceEvent, latestOdometerReading, maintenanceEventsOfKind, normalizeMaintenanceEvents, normalizeOdometerReadings } from "../app/domain.ts";
import { ESTIMATED_MILES_PER_OPERATING_DAY, INSPECTION_DAY_INTERVAL, INSPECTION_MILE_INTERVAL, estimatedMileage, inspectionDueStatus } from "../app/mileage-estimate.ts";
import { COMPLETION_READING_NOTE, maintenanceCompletionError, recordMaintenanceCompletion } from "../app/maintenance-completion.ts";
import { EMPTY_PARTS_MEMORY, PARTS_MEMORY_LIMIT, PARTS_MEMORY_STORAGE_KEY, forgetPart, learnPart, normalizePartsMemory, partMemoryKey, partMemoryLabel, readPartsMemory, recallPart, writePartsMemory } from "../app/parts-memory.ts";
import { DEFAULT_SERVICE_INTERVALS, SERVICE_DUE_SOON_MILES, SERVICE_KINDS, normalizeServiceIntervals, serviceIntervalMiles, serviceIntervalStatus } from "../app/service-intervals.ts";
import { migrateBrakeTowCapacities, migrateReducedCapacity, ROAD_CAPACITY, WEST_CAPACITY } from "../app/facility-layout.ts";
import { candidateBusNumbers, resolveBusNumber, resolveBusNumberList } from "../app/bus-number-resolver.ts";
import { planOperatorCommand } from "../app/operator-engine.ts";
import { applyOperatorBatch } from "../app/operator-batch.ts";
import { operationalUpdateAt, stampOperationalChange } from "../app/operational-time.ts";
import { formatRepairTime, normalizeRepairTimeEstimate, repairTimeTotal, recommendedRepairMinutes } from "../app/down-sheet/repair-time-estimates.ts";
import { aggregateRepairItemEstimates, blankRepairItem, isQuarantineEntry, normalizeRepairItems, repairItemsTotal } from "../app/down-sheet/down-sheet-repair-items.ts";
import { mergeReviewedRows, reviewScannedRows } from "../app/down-sheet/down-sheet-scan-import.ts";
import { prepareFleetForScannedReplacement, scannedSheetRemovals } from "../app/down-sheet/down-sheet-replace.ts";
import { activeDefectLogCount, defectLogRecords, groupDefectLogRecords, hideDefectLogRecords, isDefectLogCleanupCandidate, recentDefectDuplicate, returnDefectLogBusToService, saveDefectLogRecord } from "../app/defect-log/defect-log-sync.ts";
import { bay12AwarenessBusIds, isBay12AwarenessArea, isMysteryArea, mysteryBusIds } from "../app/mystery-buses.ts";
import { QUICK_FILTERS, quickFilterBusIds, quickFilterDefects, quickFilterMatch } from "../app/quick-filters.ts";
import { downSheetBadgeViewBusIds, downSheetBadgeViewCounts, isReadyRoadLocation } from "../app/down-sheet-badge-view.ts";
import { downSheetWorkGroup, matchesDownSheetSearch, orderDownSheetEntries } from "../app/down-sheet/down-sheet-view.ts";
import { DEFAULT_DOWN_SHEET_DISPLAY, normalizeDownSheetDisplay } from "../app/down-sheet/down-sheet-display-settings.ts";
import { DEFAULT_DEFECT_LOG_DISPLAY, normalizeDefectLogDisplay } from "../app/defect-log/defect-log-display-settings.ts";
import { quickFilterShareText } from "../app/defect-log/quick-filter-share.ts";
import { DOWN_SHEET_STORAGE_KEY, DOWN_SHEET_STORAGE_VERSION, FLEET_BACKUP_REMINDER_STORAGE_KEY, FLEET_RECOVERY_STORAGE_KEY, FLEET_STORAGE_KEY, FLEET_STORAGE_VERSION, fleetBackupDue, fleetDefectCount, fleetDefectLogCount, markFleetBackupExported, readDownSheetPayload, readFleetPayload, readFleetRecoverySnapshot, serializeDownSheetPayload, serializeFleetPayload, writeDownSheetStorage, writeFleetStorage } from "../app/storage.ts";

function memoryStorage(initial={}){
 const values=new Map(Object.entries(initial));
 return {
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,String(value)),
  value:key=>values.get(key),
 };
}

test("shared storage reads legacy payloads and preserves future metadata",()=>{
 const legacy=readFleetPayload(JSON.stringify([{id:"bus-1",n:"1",futureBusField:{source:"inspection"}}]));
 assert.equal(legacy.valid,true);
 assert.equal(legacy.legacy,true);
 assert.equal(legacy.version,0);
 assert.deepEqual(legacy.buses[0].futureBusField,{source:"inspection"});

 const serialized=serializeFleetPayload(legacy.buses,{syncRevision:7,deviceClock:"phone",version:2,buses:[]});
 const current=readFleetPayload(serialized);
 assert.equal(current.version,FLEET_STORAGE_VERSION);
 assert.equal(current.envelope.syncRevision,7);
 assert.equal(current.envelope.deviceClock,"phone");
 assert.deepEqual(current.buses[0].futureBusField,{source:"inspection"});

 const down=readDownSheetPayload(JSON.stringify([{id:"entry-1",futurePartField:{partNumber:"HORN-1"}}]));
 assert.equal(down.legacy,true);
 const downCurrent=readDownSheetPayload(serializeDownSheetPayload(down.entries,{syncRevision:9}));
 assert.equal(downCurrent.version,DOWN_SHEET_STORAGE_VERSION);
 assert.equal(downCurrent.envelope.syncRevision,9);
 assert.deepEqual(downCurrent.entries[0].futurePartField,{partNumber:"HORN-1"});
});

test("shared storage refuses malformed or newer payloads without overwriting them",()=>{
 const malformed=memoryStorage({[FLEET_STORAGE_KEY]:"{broken"});
 assert.equal(writeFleetStorage(malformed,[{id:"bus-1"}]),false);
 assert.equal(malformed.value(FLEET_STORAGE_KEY),"{broken");

 const newerRaw=JSON.stringify({version:FLEET_STORAGE_VERSION+1,buses:[{id:"future"}],syncRevision:11});
 const newer=memoryStorage({[FLEET_STORAGE_KEY]:newerRaw});
 assert.equal(readFleetPayload(newerRaw).supported,false);
 assert.equal(writeFleetStorage(newer,[{id:"older-app"}]),false);
 assert.equal(newer.value(FLEET_STORAGE_KEY),newerRaw);

 const legacy=memoryStorage({[FLEET_STORAGE_KEY]:JSON.stringify([{id:"legacy"}])});
 assert.equal(writeFleetStorage(legacy,[{id:"legacy",kept:true}]),true);
 assert.deepEqual(readFleetPayload(legacy.value(FLEET_STORAGE_KEY)).buses,[{id:"legacy",kept:true}]);

 const downMalformed=memoryStorage({[DOWN_SHEET_STORAGE_KEY]:"not-json"});
 assert.equal(writeDownSheetStorage(downMalformed,[{id:"entry"}]),false);
 assert.equal(downMalformed.value(DOWN_SHEET_STORAGE_KEY),"not-json");
});

test("fleet writes keep a last-known-good copy and block accidental bulk defect loss",()=>{
 const defects=Array.from({length:6},(_,index)=>({id:"defect-"+index,source:"defect-log",state:"open"}));
 const original=[{id:"bus-1",n:"17501",defects}];
 const raw=serializeFleetPayload(original,{syncRevision:14});
 const storage=memoryStorage({[FLEET_STORAGE_KEY]:raw});

 assert.equal(fleetDefectCount(original),6);
 assert.equal(fleetDefectLogCount(original),6);
 assert.equal(writeFleetStorage(storage,[{...original[0],defects:[]}]),false);
 assert.equal(writeFleetStorage(storage,[]),false);
 assert.equal(storage.value(FLEET_STORAGE_KEY),raw);

 const recovery=readFleetRecoverySnapshot(storage.value(FLEET_RECOVERY_STORAGE_KEY));
 assert.equal(recovery?.defectCount,6);
 assert.equal(recovery?.busCount,1);
 assert.equal(readFleetPayload(recovery?.raw||null).envelope.syncRevision,14);

 assert.equal(writeFleetStorage(storage,[{...original[0],defects:[]}],{allowBulkDefectLoss:true}),true);
 assert.equal(readFleetPayload(storage.value(FLEET_STORAGE_KEY)).buses[0].defects.length,0);
 assert.equal(writeFleetStorage(storage,original,{allowBulkDefectLoss:true,skipRecoverySnapshot:true}),true);
 assert.equal(readFleetPayload(storage.value(FLEET_STORAGE_KEY)).buses[0].defects.length,6);
});

test("successful ordinary writes snapshot the previous board and backup reminders recur every 20 new logs",()=>{
 const original=[{id:"bus-1",n:"17501",l:"road-1",defects:[{id:"a",source:"defect-log"},{id:"b",source:"tracker"}]}];
 const storage=memoryStorage({[FLEET_STORAGE_KEY]:serializeFleetPayload(original)});
 assert.equal(writeFleetStorage(storage,[{...original[0],l:"garage-1"}]),true);
 const recovery=readFleetRecoverySnapshot(storage.value(FLEET_RECOVERY_STORAGE_KEY));
 assert.equal(readFleetPayload(recovery?.raw||null).buses[0].l,"road-1");

 const logs=count=>[{id:"bus-1",defects:Array.from({length:count},(_,index)=>({id:"log-"+index,source:"defect-log"}))}];
 assert.equal(fleetBackupDue(storage,logs(19)).due,false);
 assert.equal(fleetBackupDue(storage,logs(20)).due,true);
 assert.equal(markFleetBackupExported(storage,logs(20),"2026-08-26T12:00:00.000Z"),true);
 assert.equal(JSON.parse(storage.value(FLEET_BACKUP_REMINDER_STORAGE_KEY)).lastExportedDefectLogCount,20);
 assert.equal(fleetBackupDue(storage,logs(39)).due,false);
 assert.equal(fleetBackupDue(storage,logs(40)).due,true);
});

test("phone safety controls expose full-board export reminders and recovery",async()=>{
 const [tracker,recovery,defect,reminder,backup]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fleet-recovery-control.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/offline-backup-reminder.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fleet-backup.ts",import.meta.url),"utf8"),
 ]);
 assert.match(tracker,/FleetRecoveryControl/);
 assert.match(recovery,/RESTORE LAST GOOD COPY/);
 assert.match(defect,/OfflineBackupReminder buses=\{fleet\}/);
 assert.match(reminder,/OFFLINE BACKUP DUE/);
 assert.match(reminder,/EXPORT FULL BACKUP/);
 assert.match(backup,/pace-south-fleet-board-backup/);
 assert.match(backup,/DOWN_SHEET_STORAGE_KEY/);
 assert.match(backup,/DEFECT_LOG_SETTINGS_STORAGE_KEY/);
 assert.doesNotMatch(tracker,/setItem\("pace-board-v1"/);
});

test("defect normalization preserves future odometer and parts fields",()=>{
 const [defect]=normalizeDefects([{id:"future-defect",category:"Bus Controls",issue:"Horn",details:"No horn",state:"open",operability:"service",odometerMiles:123456,partsUsed:true,parts:[{id:"part-1",partNumber:"HORN-1"}],futureMetadata:{revision:4}}]);
 assert.equal(defect.odometerMiles,123456);
 assert.equal(defect.partsUsed,true);
 assert.deepEqual(defect.parts,[{id:"part-1",partNumber:"HORN-1"}]);
 assert.deepEqual(defect.futureMetadata,{revision:4});
});

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost" + path, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function section(html, start, end) {
  const startIndex = html.indexOf(start);
  const endIndex = html.indexOf(end, startIndex + start.length);
  assert.ok(startIndex >= 0 && endIndex > startIndex, `Expected section ${start}`);
  return html.slice(startIndex, endIndex);
}

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
  assert.match(page, /<DownSheetBadgeMenu[\s\S]*?<button className="downsheet-command"/);
  assert.match(page, /<h3>DS BADGE<\/h3>/);
  assert.match(page, /<b>SHOW BADGE<\/b>/);
  assert.match(page, /visuals\.downSheetBadgeText/);
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
  const menu = await readFile(new URL("../app/down-sheet-badge-menu.tsx", import.meta.url), "utf8");
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
  assert.match(page, /BUS NUMBER ↑/);
  assert.match(page, /WORK CATEGORIES/);
  assert.match(page, /SAVE NOTE/);
  assert.match(page, /Unsaved changes/);
  assert.match(css, /\.down-view-controls\{/);
  assert.match(css, /\.work-group-row/);
});
test("AI operator plans safe tracker and down-sheet actions with number-smart resolution", () => {
  const fleet = [
    { id: "a", n: "17525", s: "service", l: "road-0", down: false, pendingRepair: "" },
    { id: "b", n: "17505", s: "service", l: "road-1", down: false, pendingRepair: "" },
    { id: "c", n: "18505", s: "out", l: "west-0", down: true, pendingRepair: "Brakes — ABS warning" },
  ];
  const areas = [
    { name: "IN SERVICE / ON ROAD", slots: ["road-0", "road-1", "road-2"] },
    { name: "CNG EAST LOT", slots: ["east-1", "east-2"] },
    { name: "CNG WEST LOT", slots: ["west-0", "west-1"] },
  ];
  const moved = planOperatorCommand("Move bus 25 to CNG East", fleet, areas);
  assert.equal(moved.kind, "plan");
  assert.equal(moved.plan.kind, "move");
  assert.equal(moved.plan.busNumber, "17525");
  assert.equal(moved.plan.areaName, "CNG EAST LOT");
  assert.equal(moved.plan.requiresConfirmation, true);
  const ambiguousMove = planOperatorCommand("Move bus 05 to CNG East", fleet, areas);
  assert.equal(ambiguousMove.kind, "message");
  assert.match(ambiguousMove.message, /17505, 18505/);
  const ambiguousLocate = planOperatorCommand("Locate bus 05", fleet, areas);
  assert.equal(ambiguousLocate.kind, "plan");
  assert.equal(ambiguousLocate.plan.kind, "locate");
  assert.deepEqual(ambiguousLocate.plan.busNumbers, ["17505", "18505"]);
  const downSheet = planOperatorCommand("Add bus 25 to the down sheet", fleet, areas);
  assert.equal(downSheet.kind, "plan");
  assert.equal(downSheet.plan.kind, "downsheet");
  assert.equal(downSheet.plan.selected, true);
  const clearDownSheet = planOperatorCommand("Clear the entire downsheet", fleet, areas);
  assert.equal(clearDownSheet.kind, "plan");
  assert.equal(clearDownSheet.plan.kind, "clearDownSheet");
  assert.equal(clearDownSheet.plan.requiresConfirmation, true);
  const undoClear = planOperatorCommand("Undo clear downsheet", fleet, areas);
  assert.equal(undoClear.kind, "plan");
  assert.equal(undoClear.plan.kind, "undoDownSheetClear");
  const defect = planOperatorCommand("Add check-engine diagnosis to bus 25", fleet, areas);
  assert.equal(defect.kind, "plan");
  assert.equal(defect.plan.kind, "defect");
  assert.equal(defect.plan.defect.issue, "Check-engine diagnosis");
  assert.equal(defect.plan.flag, "checkEngine");
});
test("AI operator answers fleet audits, remembers sitting-time groups, and plans a follow-up bulk move", () => {
  const now = Date.parse("2026-08-05T12:00:00.000Z");
  const fleet = [
    { id: "a", n: "17525", s: "service", l: "west-0", down: false, pendingRepair: "", parkedAt: "2026-08-05T00:00:00.000Z", lastLocationChangeAt: "2026-08-05T00:00:00.000Z", lastStatusChangeAt: "2026-08-04T22:00:00.000Z" },
    { id: "b", n: "17505", s: "service", l: "road-1", down: false, pendingRepair: "", parkedAt: "2026-08-05T05:00:00.000Z", lastLocationChangeAt: "2026-08-05T05:00:00.000Z", lastStatusChangeAt: "2026-08-05T04:00:00.000Z" },
    { id: "c", n: "18505", s: "out", l: "east-1", down: true, pendingRepair: "Brakes", checkTransmission: true, parkedAt: "2026-08-05T03:00:00.000Z", lastLocationChangeAt: "2026-08-05T02:00:00.000Z", lastStatusChangeAt: "2026-08-05T03:00:00.000Z" },
    { id: "d", n: "17525", s: "shop", l: "road-2", down: false, pendingRepair: "", parkedAt: "2026-08-05T11:00:00.000Z", lastLocationChangeAt: "2026-08-05T11:00:00.000Z", lastStatusChangeAt: "2026-08-05T11:00:00.000Z" },
  ];
  const areas = [
    { name: "IN SERVICE / ON ROAD", slots: ["road-0", "road-1", "road-2", "road-3"] },
    { name: "CNG EAST LOT", slots: ["east-1", "east-2"] },
    { name: "CNG WEST LOT", slots: ["west-0", "west-1"] },
  ];

  const duplicates = planOperatorCommand("How many duplicates do we have?", fleet, areas, null, now);
  assert.equal(duplicates.kind, "plan");
  assert.equal(duplicates.plan.kind, "analysis");
  assert.match(duplicates.plan.response, /1 extra duplicate record/);
  assert.deepEqual(duplicates.plan.busIds, ["a", "d"]);

  const checkTransmission = planOperatorCommand("How many buses have a check transmission light?", fleet, areas, null, now);
  assert.equal(checkTransmission.kind, "plan");
  assert.equal(checkTransmission.plan.kind, "analysis");
  assert.deepEqual(checkTransmission.plan.busIds, ["c"]);
  assert.match(checkTransmission.plan.response, /check-transmission reports/);

  const sitting = planOperatorCommand("How many buses have been sitting for 8+ hours?", fleet, areas, null, now);
  assert.equal(sitting.kind, "plan");
  assert.equal(sitting.plan.kind, "analysis");
  assert.deepEqual(sitting.plan.busIds, ["a", "c"]);
  assert.match(sitting.plan.response, /2 buses/);
  assert.match(sitting.plan.response, /no location or status change/i);

  const context = { busIds: sitting.plan.busIds, busNumbers: sitting.plan.busNumbers, label: sitting.plan.selectionLabel };
  const followUp = planOperatorCommand("Relocate to the On Road area", fleet, areas, context, now);
  assert.equal(followUp.kind, "plan");
  assert.equal(followUp.plan.kind, "bulkMove");
  assert.deepEqual(followUp.plan.busIds, ["a", "c"]);
  assert.equal(followUp.plan.areaName, "IN SERVICE / ON ROAD");
  assert.equal(followUp.plan.requiresConfirmation, true);
});

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
  assert.equal(QUICK_FILTERS.length,9);
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
  assert.equal(quickFilterShareText("A/C",[mixed],"ac"),"A/C — 1 bus\nBus 8 — A/C and HVAC — No cooling");
  assert.equal(quickFilterShareText("Farebox",[{id:"flag",n:"9",farebox:true,defects:[buses[7].defects[0]]}],"farebox"),"Farebox — 1 bus\nBus 9 — Farebox tracker flag");
  assert.equal(quickFilterShareText("IBS & Ventra",[{id:"legacy",n:"10",pendingRepair:"Ventra reader blank",defects:[]}],"ibs-ventra"),"IBS & Ventra — 1 bus\nBus 10 — Ventra reader blank");
  const fifteen=Array.from({length:15},(_,index)=>({id:"fare-"+index,n:String(17500+index),defects:[{id:"farebox-"+index,category:"Tech Services",issue:"Farebox",details:"Reader offline",state:"open"},{id:"ac-"+index,category:"A/C and HVAC",issue:"No cooling",details:"",state:"open"}]}));
  const fifteenFarebox=quickFilterShareText("Farebox",fifteen,"farebox");
  assert.equal(quickFilterBusIds(fifteen,"farebox").length,15);
  assert.equal(fifteenFarebox.split("\n").length,16);
  assert.doesNotMatch(fifteenFarebox,/No cooling/);
  assert.equal(quickFilterShareText("Defect / Condition Not Duplicated",[buses[9]],"not-duplicated"),"Defect / Condition Not Duplicated — 1 bus\nBus 8 — Electrical / Multiplex — Intermittent electrical — Reported cutting out");
});

test("server-renders the live fleet command dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Fleet Maintenance Bus Tracking System<\/title>/i);
  assert.match(html, /FLEET MAINTENANCE BUS TRACKING SYSTEM - FACILITY WIDE OVERVIEW/);
  assert.doesNotMatch(html, />PACE MAINTENANCE BUS TRACKING SYSTEM/);
  assert.match(html, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /class="command-bar"/);
  assert.match(html, />QUICK FILTERS</);
  assert.match(html, />MYSTERY <b>/);
  assert.match(html, /DOWN SHEET/);
  assert.match(html, />PENDING REPAIR</);

  assert.match(html, />LOCATE</);
  assert.match(html, />REFRESH</);
  assert.match(html, /> SETTINGS</);
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
  const west = section(html, '<section class="west lot panel">', '<section class="waiting panel">');
  assert.equal((west.match(/class="spot"/g) ?? []).length, 40);
  const waiting = section(html, '<section class="waiting panel">', '<footer class="command-bar">');
  assert.equal((waiting.match(/class="spot"/g) ?? []).length, 98);
  assert.match(waiting, /WAITING AREA/);

});

test("renders the mobile Mystery list on the Defect Log", async () => {
  const response=await render("/defect-log");
  assert.equal(response.status,200);
  const html=await response.text();
  assert.match(html,/MYSTERY BUSES/);
  assert.match(html,/ON-SITE WORK AREAS NOT ON DOWN SHEET/);
  assert.match(html,/class="mystery-board"/);
  assert.match(html,/class="mystery-toggle"/);
  assert.match(html,/aria-expanded="true"/);
  assert.match(html,/>QUICK FILTERS</);
  const css=await readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8");
  assert.match(css,/@media\(max-width:760px\)\{\.mystery-board/);
  assert.match(css,/\.quick-filter-drawer\{position:fixed/);
  const page=await readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8");
  assert.match(page,/quickFilterExpandedBusIds/);
  assert.match(page,/aria-expanded=\{expanded\}/);
  assert.match(page,/quickFilterShareText\(quickFilterLabel,quickFilterBuses,quickFilter\)/);
  assert.match(page,/navigator\.share\(\{title:quickFilterLabel\+" bus list",text\}\)/);
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
  assert.match(css,/\.mystery-board\.collapsed>header\{border-bottom:0\}/);
  assert.match(css,/\.mystery-toggle\{width:38px;height:38px/);
});

test("removes prospective customer branding from visible app titles", async () => {
  const [layout, manifestText, operator, downSheet, tracker] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"),
    readFile(new URL("../app/operator-modal.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);
  assert.equal(manifest.name, "Fleet Maintenance Bus Tracking System");
  assert.equal(manifest.short_name, "Fleet Bus Tracker");
  assert.match(layout, /title:"Fleet Maintenance Bus Tracking System"/);
  assert.match(operator, /FLEET INTELLIGENT COMMAND CONSOLE/);
  assert.match(downSheet, /FLEET MAINTENANCE/);
  assert.match(downSheet, /MAINTENANCE FACILITY/);
  assert.doesNotMatch(operator, /PACE/);
  assert.doesNotMatch(downSheet, /PACE/);
  assert.doesNotMatch(tracker, /PACE MAINTENANCE/);
});

test("includes full theme, manual color, highlight, and locate controls", async () => {
  const [page, css, backup] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/fleet-backup.ts", import.meta.url), "utf8"),
  ]);

  for (const theme of ["Default", "Terminal", "Black / Dark", "Midnight", "Tactical"]) {
    assert.match(page, new RegExp(`label:\"${theme.replace("/", "\\/")}\"`));
  }
  for (const control of ["Page Background", "Panel Background", "Parking Spaces", "Command Bar", "SECTION BACKGROUNDS", "BUS STATUS COLORS"]) {
    assert.match(page, new RegExp(control));
  }
  assert.match(page, /garageSpecial:string;garageFrame:string;mysterySlot:string/);
  assert.match(page, /Bays 11 & 12 Parking Spaces/);
  assert.match(page, /Garage Border, Top & Row Banners/);
  assert.match(page, /Mystery Spaces/);
  assert.match(page, /bay12AwarenessBusIds/);
  assert.match(css, /\.spot\.awareness-slot/);
  assert.match(page, /className=\{c>=10\?"garage-special-slot":undefined\}/);
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
  assert.match(page, /"SHOP BAYS \(DIAGONAL\)":slots\("bay",9,1\)/);
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
  assert.match(page, /ALLOW SINGLE-TAP EMPTY SPACES ON TOUCHSCREENS/);
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
  assert.match(page, /New buses can only be created in Settings/);
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
  assert.match(page, /Protected fleet identity\. Change only in Settings\./);
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
  assert.match(page, /"PIT":slots\("pit",2\)/);
  assert.match(page, /"BRAKE TEST":slots\("brake",3\)/);
  assert.match(page, /"TOW \/ STAGING":slots\("tow",4\)/);
  assert.match(page, /"FOREMAN OFFICE":slots\("office",3\)/);
  assert.match(page, /EAST_SLOTS\.find\(slot=>!occupiedEast\.has\(slot\)\)/);
  assert.match(css, /\.eastgrid\{grid-template-columns:repeat\(2/);
  assert.ok(page.includes('const EAST_SLOTS=Array.from({length:9},(_,row)=>[1,2].map(column=>"east-"+(row*4+column))).flat();'));
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
  assert.match(page, /\["MAIN GARAGE \(BAYS 1-10\)",GARAGE_STANDARD_SLOTS\]/);
  assert.match(page, /\["TROUBLE BAY 11",TROUBLE_BAY_11_SLOTS\]/);
  assert.match(page, /\["TROUBLE BAY 12",TROUBLE_BAY_12_SLOTS\]/);
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
  assert.match(page, /EXPORT \/ SHARE BACKUP/);
  assert.match(page, /IMPORT BACKUP/);
  assert.match(page, /registration\?\.update\(\)/);
  assert.match(page, /window\.location\.reload\(\)/);
  assert.match(page, /It will replace the board and settings currently stored on this device/);
  assert.match(css, /\.refresh-command\{/);
  assert.match(css, /\.board-data/);
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
test("renders the interactive down sheet with All as the default shift view", async () => {
  const response = await render("/down-sheet");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Interactive Down Sheet/);
  assert.match(html, /aria-pressed="true">ALL/);
  assert.match(html, />1ST</);
  assert.match(html, />2ND</);
  assert.match(html, />3RD</);
  assert.match(html, /ACTIVE DOWN/);
  assert.match(html, /BUS NUMBER/);
  assert.match(html, /REASON DOWN/);
  assert.match(html, /MECHANIC \/ VENDOR/);
  assert.match(html, /SHEET CAPACITY/);
  assert.match(html, /SHOW COMPLETED/);
  assert.match(html, /ADD DOWN BUS/);
  assert.match(html, /CLEAR DOWNSHEET/);
  assert.match(html, /SETTINGS/);
  assert.match(html, /QUICK NOTES/);
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

test("tracker uses one counted Down Sheet control and one counted Defect Log control", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.equal((page.match(/className="downsheet-command"/g) || []).length, 1);
  assert.equal((page.match(/className="defectlog-command"/g) || []).length, 1);
  assert.match(page, /DOWN SHEET <b>\{actualDownSet\.size\}<\/b>/);
  assert.match(page, /DEFECT LOG <b>\{defectLogCount\}<\/b>/);
  assert.match(page, /defectLogCount=activeDefectLogCount\(buses\)/);
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
  assert.equal(routed.defects[0].issue,"Horn");
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
  assert.equal(updated[0].s, "out");
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
  assert.equal(completed[0].s, "out");
  assert.equal(completed[0].down, false);
  assert.equal(completed[0].pendingRepair, "");
  assert.equal(completed[0].defects.length, 1);
  assert.equal(completed[0].defects[0].state, "completed");
  assert.equal(completed[0].mechanic, "JD");
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
  assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Operating Controls - Horn"));
  assert.ok(REPAIR_OPTIONS["Doors, Ramp and ADA"].includes("Ramp, Lift and Kneeler - Kneeler"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Misfire"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Stop engine light"));
  assert.ok(REPAIR_OPTIONS.Engine.includes("Coolant level sensor"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Stabilizer link"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Dogtracking"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Leveling valve"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Bus leaning - C/S"));
  assert.ok(REPAIR_OPTIONS["Suspension and Steering"].includes("Bus leaning - R/S"));
  assert.ok(REPAIR_OPTIONS.Brakes.includes("Brake mod light"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Farebox won't lock"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("CUBIC Screen - BUS ER"));
  assert.ok(REPAIR_OPTIONS["Tech Services"].includes("CUBIC Screen - MV ER"));
  assert.ok(REPAIR_OPTIONS["Lights and Fixtures"].includes("Outside rear view mirror - C/S"));
  assert.ok(REPAIR_OPTIONS["Lights and Fixtures"].includes("Outside rear view mirror - R/S"));
  assert.equal(repairCategoryEmoji("Engine"), REPAIR_CATEGORY_EMOJI.Engine);
  assert.equal(repairCategoryLabel("Engine"), "⚙️ Engine");
  assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Gauges and Dash - Fuel gauge INOP / false reading"));
  assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("System Switches - Kneeler button"));
  assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Gauges and Dash - Front dash damage"));
  assert.ok(REPAIR_OPTIONS.Bodywork.includes("Bike rack - bent / replacement"));
  assert.ok(REPAIR_OPTIONS["Preventive Maintenance"].includes("Bike rack - arms / pivot adjustment"));
  assert.equal(normalizeDefects([{id:"legacy-screen",category:"Tech Services",issue:"MDT Screen",details:"Blank",state:"open"}])[0].issue,"IBS Screen");
  assert.deepEqual(Object.keys(REPAIR_OPTION_GROUPS.Amerex), ["Fire Suppression", "Gas Concentration"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Fire Suppression"], ["Trouble Mod 1 Roof 1", "Trouble Mod 2 Roof 1", "Other Fire Suppression Trouble"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Gas Concentration"], ["Trace", "Significant Leak", "Other Gas Concentration Alert"]);
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 1 Roof 1"));
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Gas Concentration - Significant Leak"));
  // Amerex keeps the wording printed on the panel; every other grouped
  // category gets plain wording that names its own groups.
  assert.equal(repairGroupStepLabel("Amerex"), "CHOOSE THE AMEREX SYSTEM");
  assert.equal(repairGroupPlaceholder("Amerex"), "Choose Fire Suppression or Gas Concentration");
  assert.equal(repairIssueStepLabel("Amerex"), "CHOOSE THE STATUS OR CODE");
  assert.equal(repairIssuePlaceholder("Amerex", "Fire Suppression"), "Choose an Amerex status or code");
  assert.equal(repairGroupStepLabel("Bus Controls"), "CHOOSE THE GROUP");
  assert.equal(repairGroupPlaceholder("Bus Controls"), "Choose one of 4 groups");
  assert.equal(repairIssueStepLabel("Bus Controls"), "CHOOSE THE DEFECT");
  assert.equal(repairIssuePlaceholder("Bus Controls", "Gauges and Dash"), "Choose a defect in Gauges and Dash");
  // An ungrouped category never reaches step 2, but the helper must not throw.
  assert.equal(repairGroupPlaceholder("Engine"), "Choose one of 0 groups");
  assert.deepEqual(REPAIR_OPTIONS["Interior Cleaning"], ["Scheduled Cleaning", "Cleaning Required"]);
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
  assert.deepEqual(CHECK_ENGINE_SYMPTOMS,["Misfire","Loss of power","Stop engine light"]);
  const [defect]=normalizeDefects([{id:"check-engine-1",category:"Engine",issue:"Check-engine diagnosis",symptoms:["Misfire","Loss of power","Misfire"],details:"Under load",operability:"service",state:"open",source:"defect-log"}]);
  assert.deepEqual(defect.symptoms,["Misfire","Loss of power"]);
  assert.equal(defectSupportingDetails(defect),"Misfire, Loss of power — Under load");
  assert.match(defectLabel(defect),/Engine — Check-engine diagnosis — Misfire, Loss of power — Under load/);
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
  assert.match(css,/\.log-settings-button\{position:static;grid-column:2;grid-row:2/);
  assert.match(css,/\.log-summary \.fixed\{position:static;z-index:auto;grid-column:1\/-1\}/);
});
test("bus marker display toggles between icons and large number tiles per device", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(page, /BUS MARKER DISPLAY/);
  assert.match(page, /SHOW LARGE NUMBER TILES INSTEAD OF BUS ICONS/);
  assert.match(page, /data-bus-display=\{busDisplay\}/);
  assert.match(page, /setBusDisplay\(ui\.busDisplay==="number"\?"number":"icon"\)/);
  assert.match(page, /if\(saved\.busDisplay==="icon"\|\|saved\.busDisplay==="number"\)setBusDisplay\(saved\.busDisplay\)/);
  assert.match(css, /\.app\[data-bus-display="number"\] \.token>\.bus\{display:none\}/);
  assert.match(css, /\.app\[data-bus-display="number"\] \.token-number\{font-size:12px/);
  assert.match(css, /color-mix\(in srgb,var\(--marker-status\) 22%,#fff\)/);
});
test("confirmation prompts are per-device settings that default to on", async () => {
  const { confirmationPreference, confirmAction } = await import("../app/confirmation-preferences.ts");
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
  // Settings UI exposes independent move and group-defect toggles.
  assert.match(page, /CONFIRMATION PROMPTS/);
  assert.match(page, /CONFIRM BUS MOVES &amp; SWITCHES/);
  assert.match(page, /CONFIRM GROUP DEFECT ASSIGNMENT/);
  assert.match(css, /\.confirmation-settings>label\{margin-top:8px\}/);
  // All three move paths and the bulk-defect path honor the preference.
  assert.match(page, /confirmAction\(confirmMoves,"Move Bus "\+bus\.n\+enteredNote/);
  assert.match(page, /confirmAction\(confirmMoves,"Move "\+selected\.length/);
  assert.match(page, /confirmAction\(confirmMoves,"Move Bus "\+d\.n\+" into Bus "/);
  assert.match(page, /confirmAction\(confirmDefects,"Add "\+defectLabel\(defect\)/);
  // Preferences persist, restore safely, and travel with backup export/import.
  assert.match(page, /setConfirmMoves\(confirmationPreference\(ui\.confirmMoves\)\)/);
  assert.match(page, /setConfirmDefects\(confirmationPreference\(ui\.confirmDefects\)\)/);
  assert.match(page, /singleTapEmptySpaces,busDisplay,showDownSheetBadges,downSheetBadgeView,confirmMoves,confirmDefects,serviceIntervals\}\)\)/);
  assert.match(page, /theme:themeName,singleTapEmptySpaces,busDisplay,showDownSheetBadges,downSheetBadgeView,confirmMoves,confirmDefects,serviceIntervals\}/);
  assert.match(page, /if\(saved\.serviceIntervals\)setServiceIntervals\(normalizeServiceIntervals\(saved\.serviceIntervals\)\)/);
  assert.match(page, /if\(typeof saved\.confirmMoves==="boolean"\)setConfirmMoves\(saved\.confirmMoves\)/);
  // Replacing the whole board must always ask, regardless of preferences.
  assert.match(page, /confirm\("Import this backup\?/);
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
  assert.match(page, /"BRAKE TEST":slots\("brake",3\)/);
  assert.match(page, /"TOW \/ STAGING":slots\("tow",4\)/);
  assert.match(page, /"FOREMAN OFFICE":slots\("office",3\)/);
  assert.match(page, /\["BRAKE TEST","brake",3\]/);
  assert.match(page, /\["TOW \/ STAGING","tow",4\]/);
  assert.match(css, /\.foreman-office\{grid-column:1\/-1/);
  assert.match(css, /\.brake \.vspots\{grid-template-rows:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(css, /\.tow \.vspots\{grid-template-rows:repeat\(4,minmax\(0,1fr\)\)\}/);
  assert.match(css, /\.vertical-zone\.brake \.title-actions,\.vertical-zone\.tow \.title-actions\{transform:translateY\(-3px\)\}/);
});

test("mechanic planning estimates enforce Curtis's shop baselines and accumulated totals", async () => {
  const estimateTotal = (category, repair) => repairTimeTotal(normalizeRepairTimeEstimate(undefined, category, repair));

  assert.equal(formatRepairTime(repairTimeTotal({repairMinutes:0,diagnosticMinutes:0,accessMinutes:0,complicationMinutes:0,heatMinutes:0,interruptionMinutes:0,otherMinutes:0,notes:""})), "30m");
  assert.equal(estimateTotal("Engine", "Check-engine diagnosis"), 180);
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

  const estimate = normalizeRepairTimeEstimate(undefined, "Engine", "Check-engine diagnosis");
  const realistic = {...estimate, complicationMinutes:120, heatMinutes:60, interruptionMinutes:90, otherMinutes:30};
  assert.equal(repairTimeTotal(realistic), 480);
  assert.equal(formatRepairTime(repairTimeTotal(realistic)), "8h");

  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const editor = await readFile(new URL("../app/down-sheet/down-sheet-editor.tsx", import.meta.url), "utf8");
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
    { pageNumber: 1, lineNumber: "1", busNumber: "17510", reason: "Check engine light", assignedTo: "Armon", category: "Engine", repair: "Check-engine diagnosis", section: "Pending", shift: "3rd", operationalStatus: "out", confidence: .98, reviewNote: "" },
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
  const scanner = await readFile(new URL("../app/down-sheet/down-sheet-scanner.tsx", import.meta.url), "utf8");
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
  assert.ok(scanner.includes("700*1024"));
  assert.ok(route.includes("OPENROUTER_API_KEY"));
  assert.ok(route.includes('import("cloudflare:workers")'));
  assert.ok(route.includes('"google/gemini-2.5-flash"'));
  assert.ok(route.includes("https://openrouter.ai/api/v1/chat/completions"));
  assert.ok(route.includes('response_format:{type:"json_schema"'));
  assert.ok(route.includes('"Cache-Control":"no-store"'));
  assert.ok(route.includes("OpenRouter credits"));
  assert.ok(route.includes("OpenRouter authorization was rejected"));
});

test("AI operator plans and atomically applies multi-bus moves, statuses, and Waiting Area commands", () => {
  const minor = [{ id: "minor", category: "Electrical / Multiplex", issue: "Horn", details: "", operability: "service", state: "open" }];
  const fleet = [
    { id: "a", n: "17525", l: "east-0", s: "out", down: true, parkedAt: "old-a", defects: [], pendingRepair: "" },
    { id: "b", n: "17531", l: "west-0", s: "out", down: true, parkedAt: "old-b", defects: minor, pendingRepair: defectSummary(minor) },
    { id: "c", n: "17548", l: "road-0", s: "service", down: false, parkedAt: "old-c", defects: [], pendingRepair: "" },
  ];
  const areas = [
    { name: "MAIN GARAGE (BAYS 1-10)", slots: ["garage-0", "garage-1"] },
    { name: "CNG EAST LOT", slots: ["east-0", "east-1"] },
    { name: "CNG WEST LOT", slots: ["west-0", "west-1", "west-2"] },
    { name: "IN SERVICE / ON ROAD", slots: ["road-0", "road-1"] },
    { name: "WAITING AREA", slots: ["waiting-0", "waiting-1", "waiting-2"] },
  ];

  const waitingPlan = planOperatorCommand("Move buses 25, 31, and 48 to the Waiting Area", fleet, areas);
  assert.equal(waitingPlan.kind, "plan");
  assert.equal(waitingPlan.plan.kind, "batch");
  assert.equal(waitingPlan.plan.items.length, 3);
  const waitingMove = applyOperatorBatch(fleet, waitingPlan.plan.items, areas, "now");
  assert.equal(waitingMove.error, undefined);
  assert.deepEqual(waitingMove.fleet.map(bus => bus.l), ["waiting-0", "waiting-1", "waiting-2"]);
  assert.deepEqual(waitingMove.fleet.map(bus => bus.s), ["out", "out", "service"]);

  const commonStatus = planOperatorCommand("Move buses 25 and 31 to Main Garage and mark them green", fleet, areas);
  assert.equal(commonStatus.kind, "plan");
  assert.equal(commonStatus.plan.kind, "batch");
  assert.equal(commonStatus.plan.items.every(item => item.status === "defect"), true);
  const statusMove = applyOperatorBatch(fleet, commonStatus.plan.items, areas, "now");
  assert.equal(statusMove.error, undefined);
  assert.deepEqual(statusMove.fleet.filter(bus => ["a", "b"].includes(bus.id)).map(bus => bus.s), ["defect", "defect"]);

  const splitPlan = planOperatorCommand("Move bus 25 to Main Garage; move bus 48 to CNG East", fleet, areas);
  assert.equal(splitPlan.kind, "plan");
  assert.equal(splitPlan.plan.kind, "batch");
  assert.deepEqual(splitPlan.plan.items.map(item => item.areaName), ["MAIN GARAGE (BAYS 1-10)", "CNG EAST LOT"]);

  const tooSmallAreas = [{ name: "WAITING AREA", slots: ["waiting-0"] }];
  const blocked = applyOperatorBatch(fleet, [
    { busId: "a", areaName: "WAITING AREA" },
    { busId: "b", areaName: "WAITING AREA" },
  ], tooSmallAreas, "now");
  assert.equal(blocked.error, "insufficient-space");
  assert.equal(blocked.fleet, fleet);

  const waitingCount = planOperatorCommand("How many buses are in the Waiting Area?", waitingMove.fleet, areas);
  assert.equal(waitingCount.kind, "plan");
  assert.equal(waitingCount.plan.kind, "analysis");
  assert.match(waitingCount.plan.response, /3 buses/);
  const areaFleet = fleet.map(bus => bus.id === "a" ? { ...bus, l: "west-1" } : bus);
  const directAreaMove = planOperatorCommand("Move all buses in CNG West to the Waiting Area", areaFleet, areas);
  assert.equal(directAreaMove.kind, "plan");
  assert.equal(directAreaMove.plan.kind, "bulkMove");
  assert.deepEqual(directAreaMove.plan.busNumbers, ["17525", "17531"]);
  assert.equal(directAreaMove.plan.areaName, "WAITING AREA");
  assert.match(directAreaMove.plan.summary, /all 2 buses from CNG WEST LOT/);

  const addBack = planOperatorCommand("Add buses 25 and 48 back to CNG West", fleet, areas);
  assert.equal(addBack.kind, "plan");
  assert.equal(addBack.plan.kind, "batch");
  assert.deepEqual(addBack.plan.items.map(item => item.areaName), ["CNG WEST LOT", "CNG WEST LOT"]);

  const fleetSplit = planOperatorCommand("Move buses 25 and 31 to CNG West and everything else to Main Garage", fleet, areas);
  assert.equal(fleetSplit.kind, "plan");
  assert.equal(fleetSplit.plan.kind, "batch");
  assert.equal(fleetSplit.plan.items.length, fleet.length);
  assert.deepEqual(fleetSplit.plan.items.filter(item => item.areaName === "CNG WEST LOT").map(item => item.busNumber), ["17525", "17531"]);
  assert.deepEqual(fleetSplit.plan.items.filter(item => item.areaName === "MAIN GARAGE (BAYS 1-10)").map(item => item.busNumber), ["17548"]);
  assert.match(fleetSplit.plan.summary, /2 named buses.+remaining 1 bus/i);
  const splitMove = applyOperatorBatch(fleet, fleetSplit.plan.items, areas, "now");
  assert.equal(splitMove.error, undefined);
  assert.equal(splitMove.fleet.find(bus => bus.id === "a").l.startsWith("west-"), true);
  assert.equal(splitMove.fleet.find(bus => bus.id === "b").l.startsWith("west-"), true);
  assert.equal(splitMove.fleet.find(bus => bus.id === "c").l.startsWith("garage-"), true);

  const limitedAreas = areas.map(area => area.name === "MAIN GARAGE (BAYS 1-10)" ? { ...area, slots: ["garage-0"] } : area);
  const capacityStop = planOperatorCommand("Move bus 25 to CNG West and everything else to Main Garage", fleet, limitedAreas);
  assert.equal(capacityStop.kind, "message");
  assert.match(capacityStop.message, /can hold 1 of the 2 buses/i);
  assert.match(capacityStop.message, /Trouble Bays 11 and 12 remain separate/i);
  assert.match(capacityStop.message, /Nothing was prepared/i);

  const cngWestNumbers = ["20503", "17529", "15509", "18510", "18505", "15510", "15516", "17556", "17562", "17560", "17569", "17539", "17512", "17504", "17544", "15520", "15515", "17546", "18500", "18504", "17508", "20505", "20500", "17526"];
  const fullFleet = [...cngWestNumbers, ...Array.from({ length: 73 }, (_, index) => String(30000 + index))].map((number, index) => ({ id: "fleet-" + index, n: number, l: "holding-" + index, s: "service", defects: [], pendingRepair: "" }));
  const fullAreas = [
    { name: "MAIN GARAGE (BAYS 1-10)", slots: Array.from({ length: 70 }, (_, index) => "garage-" + index) },
    { name: "CNG WEST LOT", slots: Array.from({ length: 40 }, (_, index) => "west-" + index) },
    { name: "WAITING AREA", slots: Array.from({ length: 98 }, (_, index) => "waiting-" + index) },
  ];
  const exactFleetRequest = planOperatorCommand("Move buses " + cngWestNumbers.join(" ") + " to rear CNG West and everything else to Main Garage", fullFleet, fullAreas);
  assert.equal(exactFleetRequest.kind, "message");
  assert.match(exactFleetRequest.message, /can hold 70 of the 73 buses/i);
  assert.match(exactFleetRequest.message, /Nothing was prepared/i);

  const missingSource = planOperatorCommand("Move all buses to the Waiting Area", fleet, areas);
  assert.equal(missingSource.kind, "message");
  assert.match(missingSource.message, /need the source area/i);
});

test("AI operator distinguishes garage bay labels from bus suffixes and resumes ambiguous commands", () => {
  const fleet = [
    { id: "garage", n: "17520", l: "garage-0", s: "service", defects: [], pendingRepair: "" },
    { id: "bay11", n: "17525", l: "garage-10", s: "defect", defects: [], pendingRepair: "Ramp" },
    { id: "bay12", n: "17530", l: "garage-11", s: "shop", defects: [], pendingRepair: "Inspection" },
    { id: "suffix11a", n: "15511", l: "road-0", s: "service", defects: [], pendingRepair: "" },
    { id: "suffix11b", n: "17511", l: "road-1", s: "service", defects: [], pendingRepair: "" },
    { id: "suffix11c", n: "18511", l: "road-2", s: "service", defects: [], pendingRepair: "" },
    { id: "suffix12a", n: "15512", l: "road-3", s: "service", defects: [], pendingRepair: "" },
    { id: "suffix12b", n: "17512", l: "road-4", s: "service", defects: [], pendingRepair: "" },
  ];
  const areas = [
    { name: "MAIN GARAGE (BAYS 1-10)", slots: ["garage-0"] },
    { name: "TROUBLE BAY 11", slots: ["garage-10"] },
    { name: "TROUBLE BAY 12", slots: ["garage-11"] },
    { name: "IN SERVICE / ON ROAD", slots: Array.from({ length: 5 }, (_, index) => "road-" + index) },
    { name: "WAITING AREA", slots: Array.from({ length: 8 }, (_, index) => "waiting-" + index) },
  ];

  const areaMove = planOperatorCommand("Move all buses in Main Garage plus Bay 11 and 12 to Waiting Area", fleet, areas);
  assert.equal(areaMove.kind, "plan");
  assert.equal(areaMove.plan.kind, "bulkMove");
  assert.deepEqual(areaMove.plan.busNumbers, ["17520", "17525", "17530"]);
  assert.equal(areaMove.plan.areaName, "WAITING AREA");
  assert.match(areaMove.plan.summary, /MAIN GARAGE \(BAYS 1-10\), TROUBLE BAY 11 and TROUBLE BAY 12/);

  const wholeGarage = planOperatorCommand("Move all buses in the entire garage, all bays and rows, to Waiting Area", fleet, areas);
  assert.equal(wholeGarage.kind, "plan");
  assert.equal(wholeGarage.plan.kind, "bulkMove");
  assert.deepEqual(wholeGarage.plan.busNumbers, ["17520", "17525", "17530"]);

  const oneArea = planOperatorCommand("Move all buses from Bay 11 to Waiting Area", fleet, areas);
  assert.equal(oneArea.kind, "plan");
  assert.equal(oneArea.plan.kind, "bulkMove");
  assert.deepEqual(oneArea.plan.busNumbers, ["17525"]);

  const ambiguousGroup = planOperatorCommand("Move buses 20, 11, and 30 to Waiting Area", fleet, areas);
  assert.equal(ambiguousGroup.kind, "message");
  assert.match(ambiguousGroup.message, /11 matches multiple buses: 15511, 17511, 18511/);
  assert.equal(ambiguousGroup.context.pendingIntent, "clarify-bus");

  const resumedGroup = planOperatorCommand("15511", fleet, areas, ambiguousGroup.context);
  assert.equal(resumedGroup.kind, "plan");
  assert.equal(resumedGroup.plan.kind, "batch");
  assert.deepEqual(resumedGroup.plan.items.map(item => item.busNumber), ["17520", "15511", "17530"]);

  const ambiguousSingle = planOperatorCommand("Move bus 11 to Waiting Area", fleet, areas);
  assert.equal(ambiguousSingle.kind, "message");
  assert.equal(ambiguousSingle.context.pendingIntent, "clarify-bus");
  const resumedSingle = planOperatorCommand("17511", fleet, areas, ambiguousSingle.context);
  assert.equal(resumedSingle.kind, "plan");
  assert.equal(resumedSingle.plan.kind, "move");
  assert.equal(resumedSingle.plan.busNumber, "17511");
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
  assert.equal(active[0].s, "defect");
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
  assert.equal(completed[0].lastStatusChangeAt, "2026-08-09T10:00:00.000Z");

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
  assert.ok(page.includes("BACKGROUND"));
  assert.ok(page.includes("PRIMARY TEXT"));
  assert.ok(page.includes("SECONDARY TEXT"));
  assert.ok(page.includes("Midnight"));
  assert.ok(page.includes("Tactical"));
  assert.ok(page.includes("Extra Large"));
  assert.ok(page.includes("pace-defect-log-settings-v1"));
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
  assert.doesNotMatch(page,/Enter your initials before marking/);
  assert.doesNotMatch(page,/input required maxLength=\{6\}/);
  assert.match(css,/out-of-service \.log-bus strong/);
  assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});
test("Defect Log groups multiple repairs per bus and streamlines phone entry", async () => {
  const bus={id:"bus-17528",n:"17528",s:"defect",l:"garage-11"};
  const records=[
    {bus,defect:{id:"d1",category:"Tech Services",issue:"Farebox",details:"",operability:"service",state:"open",source:"defect-log"},createdAt:"2026-08-24T01:00:00.000Z",updatedAt:"2026-08-24T01:00:00.000Z",onDownSheet:false},
    {bus,defect:{id:"d2",category:"Engine",issue:"Check-engine diagnosis",details:"",operability:"service",state:"open",source:"defect-log"},createdAt:"2026-08-24T02:00:00.000Z",updatedAt:"2026-08-24T02:00:00.000Z",onDownSheet:false},
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
  assert.match(page,/className="bus-generations"/);
  assert.match(page,/input autoFocus inputMode="numeric"/);
  assert.match(page,/Choose generation first/);
  assert.match(page,/className="save-log-middle" disabled=\{Boolean\(recentDuplicate\)\}>\{saveLabel\}/);
  assert.match(page,/className="close-log-middle" onClick=\{close\}>CLOSE/);
  assert.doesNotMatch(page,/className="log-header-save/);
  assert.ok(page.indexOf('className="save-log-middle-actions"')<page.indexOf('className="wide downsheet-check"'));
  assert.match(page,/document\.body\.classList\.add\("defect-editor-open"\)/);
  assert.match(page,/const closeEditor=\(\)=>\{const left=window\.scrollX,top=window\.scrollY/);
  assert.match(page,/window\.requestAnimationFrame\(\(\)=>\{restore\(\);window\.requestAnimationFrame\(restore\)\}\)/);
  assert.match(css,/@media\(max-width:760px\)\{\.shop-notes-column\{display:none\}/);
  assert.match(css,/\.grouped-defect-row/);
  assert.match(css,/body\.defect-editor-open\{overflow:hidden;overscroll-behavior:none\}/);
  assert.match(css,/\.log-editor\{max-height:96vh;max-height:96dvh\}/);
  assert.match(css,/\.log-form\{flex:1;min-height:0;overscroll-behavior:contain;touch-action:pan-y/);
  assert.match(css,/@media\(max-width:760px\)\{\.log-shade\{align-items:stretch\}\.log-editor\{width:100vw;height:100vh;height:100dvh;max-height:100vh;max-height:100dvh/);
  assert.match(css,/\.defect-log-app\{[^}]*overflow-anchor:none/);
  assert.match(css,/\.save-log-middle-actions\{[^}]*grid-template-columns:repeat\(3/);
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
  const archived = hideDefectLogRecords([bus],[activeDefect.id],"2026-08-22T12:00:00.000Z");
  assert.equal(archived[0].s,"out");
  assert.equal(archived[0].l,"west-0");
  assert.equal(archived[0].down,true);
  assert.equal(archived[0].defects[0].state,"open");
  assert.equal(archived[0].defects[0].defectLogHiddenAt,"2026-08-22T12:00:00.000Z");
});
test("down-sheet repair items keep independent optional estimates and a bus total", () => {
  const first = {...blankRepairItem(0), category:"Engine", repair:"Check-engine diagnosis", estimateEnabled:true, timeEstimate:normalizeRepairTimeEstimate(undefined,"Engine","Check-engine diagnosis")};
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
  assert.equal(isQuarantineEntry({category:"Engine",repair:"Check-engine diagnosis",customReason:"No start"}), false);
  const page = await readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8");
  const css = await readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8");
  assert.match(page, /if\(isQuarantineEntry\(entry\)\)return 0/);
  assert.match(page, /isQuarantineEntry\(entry\)\?"N\/A"/);
  assert.match(page, /className="fleet-number-button"[\s\S]*?onClick=\{\(\)=>setEditing\(entry\)\}/);
  assert.match(css, /\.reason-button b\{font-size:10\.5px;font-weight:900/);
});

test("operator retains incomplete status commands and accepts natural area moves", () => {
  const fleet = [
    {id:"a",n:"18509",s:"out",l:"waiting-0",down:true,pendingRepair:"Engine"},
    {id:"b",n:"18511",s:"out",l:"waiting-1",down:true,pendingRepair:"Transmission"},
  ];
  const areas = [
    {name:"WAITING AREA",slots:["waiting-0","waiting-1","waiting-2"]},
    {name:"MAIN GARAGE (BAYS 1-10)",slots:["garage-0","garage-1","garage-2"]},
  ];
  const request = planOperatorCommand("Update buses 18509 and 18511 with defects from downsheet", fleet, areas);
  assert.equal(request.kind, "message");
  assert.deepEqual(request.context.busNumbers, ["18509","18511"]);
  const status = planOperatorCommand("In service with defects", fleet, areas, request.context);
  assert.equal(status.kind, "plan");
  assert.equal(status.plan.kind, "batch");
  assert.equal(status.plan.items.every(item => item.status === "defect"), true);

  const statusFirst = planOperatorCommand("Set status to in service with defects", fleet, areas);
  assert.equal(statusFirst.kind, "message");
  assert.equal(statusFirst.context.pendingStatus, "defect");
  const busesSecond = planOperatorCommand("18509 and 18511", fleet, areas, statusFirst.context);
  assert.equal(busesSecond.kind, "plan");
  assert.equal(busesSecond.plan.kind, "batch");
  assert.equal(busesSecond.plan.items.length, 2);

  const naturalAreaMove = planOperatorCommand("Buses from the Waiting Area, place in the Main Garage", fleet, areas);
  assert.equal(naturalAreaMove.kind, "plan");
  assert.equal(naturalAreaMove.plan.kind, "bulkMove");
  assert.deepEqual(naturalAreaMove.plan.busNumbers, ["18509","18511"]);
  assert.equal(naturalAreaMove.plan.areaName, "MAIN GARAGE (BAYS 1-10)");
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
  assert.match(logCss, /\.log-summary \.fixed\{[^}]*grid-column:1\/-1/);
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

  const defect={id:"shop-note-1",category:"Engine",issue:"Misfire",details:"Cylinder 1",operability:"down",state:"open",source:"defect-log",shopNotes:"Bay 12 follow-up"};
  const fleet=[{id:"bus-1",n:"20501",s:"out",l:"west-0",defects:[]}];
  const result=saveDefectLogRecord(fleet,[],"bus-1",defect,false,"2026-08-23T18:00:00.000Z");
  assert.equal(result.error,null);
  assert.equal(result.fleet[0].defects[0].shopNotes,"Bay 12 follow-up");

  const [downPage,downSettings,downCss,logPage,logCss,catalog]=await Promise.all([
    readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/down-sheet/down-sheet-settings.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
    readFile(new URL("../app/repair-catalog.ts",import.meta.url),"utf8"),
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
test("phone layouts expose large primary controls and category-only defect entry", async () => {
  const [trackerPage, trackerCss, downCss, defectPage, defectCss] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/down-sheet/down-sheet.css", import.meta.url), "utf8"),
    readFile(new URL("../app/defect-log/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/defect-log/defect-log.css", import.meta.url), "utf8"),
  ]);
  assert.match(trackerPage, /className="mobile-mode-nav"[\s\S]*?FLEET TRACKER[\s\S]*?DOWN SHEET[\s\S]*?DEFECT LOG/);
  assert.match(trackerCss, /\.mobile-mode-nav a\{[^}]*min-height:50px/);
  assert.match(trackerPage, /className="phone-command-dock"[\s\S]*?>FIND<[\s\S]*?>FILTERS<[\s\S]*?>AI<[\s\S]*?>MORE</);
  assert.match(trackerPage, /className="garage-scroll"[\s\S]*?className="garagegrid"/);
  assert.match(trackerPage, /COLLAPSED_SECTIONS_KEY/);
  assert.match(trackerCss, /@media\(max-width:620px\)\{[\s\S]*?\.facility\{[^}]*min-width:0!important[^}]*zoom:1!important/);
  assert.match(trackerCss, /\.facility \.title-actions \.toggle-section\{[^}]*width:44px!important[^}]*height:44px!important/);
  assert.match(trackerCss, /\.command-bar\{display:none!important\}/);
  assert.match(trackerCss, /\.phone-command-dock\{[^}]*grid-template-columns:repeat\(4/);
  assert.match(downCss, /\.down-header nav a\{[^}]*height:50px/);
  assert.match(defectPage, /QUICK SELECT \(OPTIONAL\)/);
  assert.match(defectPage, /details\?"Manual entry":"Unspecified issue"/);
  assert.match(defectCss, /\.save-log-middle,\.close-log-middle\{[^}]*min-height:50px/);
  assert.match(defectPage, /<details className="advanced-defect-details"/);
  assert.match(defectPage, /save-log-middle-actions[\s\S]*\{saveLabel\}[\s\S]*>CLOSE</);
  assert.doesNotMatch(defectPage, /SAVE & CLOSE/);
});

test("Bus Controls and Cooling System expose field-ready defect choices", async () => {
  const [catalog,page]=await Promise.all([
    readFile(new URL("../app/repair-catalog.ts",import.meta.url),"utf8"),
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
  assert.match(page,/fanCountMode=value\.defect\.category==="Cooling System"/);
  assert.match(page,/Array\.from\(\{length:8\}/);
  assert.match(page,/Select how many radiator fans are out \(1 through 8\)/);
  assert.match(page,/save-log-middle[\s\S]*downsheet-check/);
  assert.match(page,/advanced-defect-details/);
});
test("Defect Log timestamps reports and blocks only recent identical unresolved defects", () => {
  const existing={id:"old-defect",category:"Engine",issue:"Loss of power",details:"First report",operability:"service",state:"open",source:"defect-log",createdAt:"2026-08-22T12:00:00.000Z",updatedAt:"2026-08-22T12:00:00.000Z"};
  const bus={id:"bus-1",n:"17501",s:"defect",l:"road-1",defects:[existing]};
  const incoming={id:"new-defect",category:"Engine",issue:"Loss of power",details:"Second report",operability:"service",state:"open",source:"defect-log"};
  assert.equal(recentDefectDuplicate(bus,incoming,"2026-08-24T11:59:00.000Z")?.id,"old-defect");
  const blocked=saveDefectLogRecord([bus],[],"bus-1",incoming,false,"2026-08-24T11:59:00.000Z");
  assert.equal(blocked.error,"recent-duplicate");
  assert.equal(blocked.fleet[0].defects.length,1);
  assert.equal(recentDefectDuplicate(bus,incoming,"2026-08-24T12:00:00.000Z"),null);
  const allowed=saveDefectLogRecord([bus],[],"bus-1",incoming,false,"2026-08-24T12:00:00.000Z");
  assert.equal(allowed.error,null);
  assert.equal(allowed.fleet[0].defects.length,2);
  assert.equal(allowed.fleet[0].defects.find(defect=>defect.id==="new-defect").createdAt,"2026-08-24T12:00:00.000Z");
  const completedBus={...bus,defects:[{...existing,state:"completed"}]};
  assert.equal(recentDefectDuplicate(completedBus,incoming,"2026-08-22T13:00:00.000Z"),null);
  const manual=saveDefectLogRecord([bus],[],"bus-1",{...incoming,id:"manual-defect",issue:"Manual entry"},false,"2026-08-22T13:00:00.000Z");
  assert.equal(manual.error,null);
});


test("Fixed Repairs is a fourth offline workflow with carried defect data and editable completion details", async () => {
  const [trackerPage,downPage,defectPage,defectCss,fixedPage,fixedCss,fixedSettings,worker,catalog]=await Promise.all([
    readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
    readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/fixed-repairs/fixed-repairs.css",import.meta.url),"utf8"),
    readFile(new URL("../app/fixed-repairs/fixed-repairs-settings.tsx",import.meta.url),"utf8"),
    readFile(new URL("../public/sw.js",import.meta.url),"utf8"),
    readFile(new URL("../app/repair-catalog.ts",import.meta.url),"utf8"),
  ]);
  for(const page of [trackerPage,downPage,defectPage,fixedPage])assert.match(page,/href="\/fixed-repairs"[\s\S]*?FIXED REPAIRS/);
  assert.ok(trackerPage.indexOf("mobile-mode-nav")<trackerPage.indexOf("FLEET MAINTENANCE BUS TRACKING SYSTEM"),"phone route navigation must render before the Facility Map header");
  assert.match(defectPage,/save-log-middle-actions[\s\S]*?SAVE AS FIXED/);
  assert.match(defectPage,/save-fixed-bottom[\s\S]*?SAVE AS FIXED/);
  assert.match(defectPage,/FIX \/ STEPS TAKEN/);
  assert.match(defectPage,/completedBy/);
  assert.match(defectPage,/DEFECT \/ CONDITION NOT DUPLICATED/);
  assert.match(defectPage,/updateDefect\("conditionNotDuplicated",event\.target\.checked\)/);
  assert.match(defectCss,/save-log-middle-actions\{[^}]*grid-template-columns:repeat\(3/);
  assert.match(fixedPage,/state==="completed"/);
  assert.match(fixedPage,/EDIT THE FULL REPAIR RECORD/);
  assert.match(fixedPage,/ORIGINAL DESCRIPTION/);

  assert.match(fixedPage,/FIX \/ STEPS TAKEN/);
  assert.match(fixedPage,/DIAGNOSIS \/ TEST \/ VERIFICATION/);
  assert.match(fixedPage,/not-duplicated-note/);
  assert.match(fixedPage,/FIXED DATE &amp; TIME/);
  assert.match(fixedPage,/writeFleetStorage\(localStorage,next\)/);
  assert.doesNotMatch(fixedPage,/className="fixed-undo"/);
  assert.match(fixedPage,/className="fixed-undo-control"[\s\S]*disabled=\{!undoSnapshot\}[\s\S]*UNDO LAST/);
  assert.match(fixedPage,/className="fixed-settings-button"[\s\S]*Open Fixed Repairs settings/);
  assert.match(fixedPage,/FixedAppearanceModal settings=\{settings\}/);
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
  assert.match(fixedCss,/\.fixed-header nav\{[^}]*grid-template-columns:repeat\(4/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{\.fixed-header\{[^}]*overflow:visible/);
  assert.match(fixedCss,/\.fixed-repairs-app>\.fixed-header\{height:auto\}/);
  assert.match(fixedCss,/\.fixed-settings-button\{background:var\(--fixed-accent/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{\.fixed-settings-shade\{align-items:stretch/);
  assert.match(fixedCss,/\.fixed-repairs-app>\.fixed-header nav\{[^}]*height:auto[^}]*background:transparent/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card>footer\{[^}]*position:static[^}]*transform:none[^}]*white-space:normal/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-editor>footer\{[^}]*position:static[^}]*transform:none[^}]*white-space:normal/);
  assert.match(fixedCss,/@media\(max-width:760px\)\{[\s\S]*?\.fixed-repairs-app>\.fixed-header nav\{grid-template-columns:repeat\(4/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card-actions\{width:100%;grid-template-columns:minmax\(0,1\.55fr\) minmax\(0,1fr\) minmax\(0,\.8fr\)/);
  assert.match(fixedCss,/\.fixed-repairs-app \.fixed-card-actions button:first-child\{grid-column:auto\}/);
  assert.match(worker,/CORE_PAGES = \["\/", "\/down-sheet", "\/defect-log", "\/fixed-repairs"\]/);
  assert.match(catalog,/completedBy\?:string/);
  assert.match(catalog,/conditionNotDuplicated\?:boolean/);
  const response=await render("/fixed-repairs");
  assert.equal(response.status,200);
  assert.match(await response.text(),/Fixed Repairs/);
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

test("Bus Controls leads with both turn-signal defects",()=>{
 const controls=REPAIR_OPTIONS["Bus Controls"];
 assert.ok(controls.includes("Operating Controls - Turn signals (steering column)"));
 assert.ok(controls.includes("Operating Controls - Turn signals (floor panel)"));
 assert.equal(new Set(controls).size,controls.length);
 assert.ok(controls.includes("Operating Controls - Horn"));
 assert.ok(controls.includes("Operating Controls - Other bus control defect"));
 assert.equal(defectLabel({category:"Bus Controls",issue:"Operating Controls - Turn signals (floor panel)",details:""}).includes("Turn signals (floor panel)"),true);
});

test("spark-plug and valve-adjustment tracking withholds a verdict until Curtis saves an interval",()=>{
 assert.deepEqual(DEFAULT_SERVICE_INTERVALS,{sparkPlugs:null,valveAdjustment:null});
 assert.deepEqual(SERVICE_KINDS.map(service=>service.kind),["spark-plugs","valve-adjustment"]);
 assert.deepEqual(normalizeServiceIntervals(undefined),{sparkPlugs:null,valveAdjustment:null});
 assert.deepEqual(normalizeServiceIntervals({sparkPlugs:"30000",valveAdjustment:0}),{sparkPlugs:30000,valveAdjustment:null});
 assert.deepEqual(normalizeServiceIntervals({sparkPlugs:-5,valveAdjustment:"abc"}),{sparkPlugs:null,valveAdjustment:null});
 assert.equal(serviceIntervalMiles("18000.4"),18000);
 assert.equal(serviceIntervalMiles(""),null);

 const bus={s:"shop",lastStatusChangeAt:"2026-08-01T00:00:00.000Z",odometerReadings:[{id:"reading-1",miles:100000,recordedAt:"2026-08-01T00:00:00.000Z",source:"manual"}],maintenanceEvents:[]};
 assert.equal(serviceIntervalStatus(bus,"spark-plugs",null,"2026-08-01T00:00:00.000Z").state,"baseline-needed");

 const serviced=recordMaintenanceCompletion(bus,{kind:"spark-plugs",completedAt:"2026-08-01T00:00:00.000Z",odometerMiles:100000,idSeed:"seed-3"},"2026-08-01T00:00:00.000Z");
 const tracked={...bus,...serviced,odometerReadings:[...serviced.odometerReadings,{id:"reading-later",miles:118000,recordedAt:"2026-09-01T00:00:00.000Z",source:"manual"}],mileageEstimate:undefined};

 const noInterval=serviceIntervalStatus(tracked,"spark-plugs",null,"2026-09-01T00:00:00.000Z");
 assert.equal(noInterval.state,"interval-needed");
 assert.equal(noInterval.due,false);
 assert.equal(noInterval.milesSince,18000);
 assert.equal(noInterval.intervalMiles,undefined);

 const tracking=serviceIntervalStatus(tracked,"spark-plugs",30000,"2026-09-01T00:00:00.000Z");
 assert.equal(tracking.state,"tracking");
 assert.equal(tracking.due,false);
 assert.equal(tracking.milesRemaining,12000);

 const soon=serviceIntervalStatus(tracked,"spark-plugs",18400,"2026-09-01T00:00:00.000Z");
 assert.equal(soon.state,"due-soon");
 assert.equal(soon.due,false);
 assert.equal(soon.milesRemaining,400);
 assert.ok(soon.milesRemaining<=SERVICE_DUE_SOON_MILES);

 const due=serviceIntervalStatus(tracked,"spark-plugs",15000,"2026-09-01T00:00:00.000Z");
 assert.equal(due.state,"due");
 assert.equal(due.due,true);
 assert.equal(due.milesRemaining,0);

 // a valve adjustment is tracked independently of spark plugs
 assert.equal(serviceIntervalStatus(tracked,"valve-adjustment",15000,"2026-09-01T00:00:00.000Z").state,"baseline-needed");
 assert.equal(latestMaintenanceEvent(tracked.maintenanceEvents,"spark-plugs").odometerMiles,100000);
 assert.equal(maintenanceEventsOfKind(tracked.maintenanceEvents,"inspection").length,0);
});

test("Fleet Tracker records every maintenance type and never invents a service interval",async()=>{
 const [page,css,intervals]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  readFile(new URL("../app/service-intervals.ts",import.meta.url),"utf8"),
 ]);
 assert.match(page,/MAINTENANCE TYPE/);
 assert.match(page,/MAINTENANCE INTERVALS/);
 assert.match(page,/INTERVAL NOT SET/);
 assert.match(page,/OVERDUE BY /);
 assert.match(page,/serviceIntervalStatus\(d,service\.kind,serviceIntervals\[service\.setting\]\)/);
 assert.match(page,/placeholder="Not set"/);
 assert.match(css,/\.service-interval-settings input\{width:120px;min-height:44px/);
 assert.match(css,/\.maintenance-entry select\{min-height:44px\}/);

 // no guessed mileage interval may be baked into the source
 assert.match(intervals,/sparkPlugs:null,valveAdjustment:null/);
 assert.equal(/(SPARK_PLUG|VALVE)[A-Z_]*_(MILE|INTERVAL)[A-Z_]*\s*=\s*\d/.test(intervals),false);
 assert.equal(/\b(15000|18000|20000|24000|30000|36000|50000)\b/.test(intervals),false);
});

test("every Defect Log bus card carries a focus view that reads without editing",async()=>{
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

 // the view is read-only: editing hands off to the one existing editor
 assert.match(page,/setFocusedBusId\(""\);setEditing\(recordDraft\(record\)\)/);
 assert.equal(/log-focus-record[\s\S]{0,900}?(saveShopNotes|markFixed|removeRecord)\(/.test(page),false);
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
 assert.match(page,/\{offCatalogIssue&&<option value=\{offCatalogIssue\}>\{offCatalogIssue\} \(as logged\)<\/option>\}/);
 // same green as + LOG DEFECT, and it does not squeeze out the close control
 assert.match(css,/\.add-log-focus-defect\{margin-left:auto;min-height:48px[^}]*background:#08733f/);
 assert.match(css,/\.add-log-focus-defect\+\.close-log-focus\{margin-left:0\}/);
 assert.match(css,/\.feed-title button\{height:36px;border:0;border-radius:6px;background:#08733f/);

 // larger reading type than the feed it replaces, and a real touch target
 assert.match(css,/\.log-focus-defect\{margin:0 0 11px;font-size:21px/);
 assert.match(css,/\.log-focus-bus strong\{font-size:34px/);
 assert.match(css,/\.log-focus-record-foot button\{min-height:44px/);
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
  if(css.slice(open+1,end).includes(".log-focus"))conditions.push(css.slice(index+7,conditionEnd));
 }
 assert.deepEqual(conditions,["max-width:760px"]);
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
 assert.equal(partMemoryKey("category","Bus Controls"),"category::bus controls");
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
  readFile(new URL("../app/repair-catalog.ts",import.meta.url),"utf8"),
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
 const order=["No crank","Crank no start","Intermittent no start","Only front start","Only rear start","Starter","Solid battery light","Flashing battery light","Alternator / charging"];
 // solid and flashing are separate diagnostic paths, so they are separate options
 assert.ok(starting.includes("Solid battery light")&&starting.includes("Flashing battery light"));
 const at=starting.indexOf("No crank");
 assert.ok(at>=0);
 assert.deepEqual(starting.slice(at,at+order.length),order);
 assert.equal(new Set(starting).size,starting.length,"no duplicated option in the category");
 // each new option survives a round trip through a saved defect
 for(const issue of ["Crank no start","Only front start","Only rear start"]){
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
 assert.deepEqual(migrateRepairIdentity("Operator Controls","MDT Screen"),{category:"Bus Controls",issue:"IBS Screen"});
 assert.deepEqual(migrateRepairIdentity("","" ),{category:"Miscellaneous",issue:"Driver-reported defect"});

 // Horn lived in two categories; it now resolves to one without changing its text
 assert.equal(REPAIR_OPTIONS["Electrical / Multiplex"].includes("Horn"),false);
 assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Operating Controls - Horn"));
 // Horn lands in Bus Controls and then in its picking group, in one step
 assert.deepEqual(migrateRepairIdentity("Electrical / Multiplex","Horn"),{category:"Bus Controls",issue:"Operating Controls - Horn"});
 assert.deepEqual(migrateRepairIdentity("Electrical / Multiplex","MOD light"),{category:"Electrical / Multiplex",issue:"MOD light"});

 // reading a stored record applies the move, and the No Horn quick filter still matches
 const [moved]=normalizeDefects([{id:"legacy-1",category:"No Start",issue:"Cranks / no start",details:"Turns over, will not fire",state:"open",operability:"down"}]);
 assert.equal(moved.category,"Battery, Starting and Charging");
 assert.equal(moved.issue,"Crank no start");
 assert.equal(moved.details,"Turns over, will not fire");
 assert.equal(moved.id,"legacy-1");
 const horn={id:"legacy-2",category:"Electrical / Multiplex",issue:"Horn",details:"",state:"open",operability:"service"};
 assert.equal(normalizeDefects([horn])[0].category,"Bus Controls");
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
 assert.ok(steering.includes("Loose steering"));
 assert.ok(steering.indexOf("Loose steering")<steering.indexOf("Steering pull"));
 assert.equal(steering.length,17);
 assert.equal(defectLabel({category:"Suspension and Steering",issue:"Loose steering",details:"Play in the wheel"}),
  "Suspension and Steering — Loose steering — Play in the wheel");
});

test("ADA securement and stop request have a home in Doors, Ramp and ADA",()=>{
 const ada=REPAIR_OPTIONS["Doors, Ramp and ADA"];
 assert.equal(REPAIR_OPTIONS["Doors, Ramp and Lift"],undefined);
 const groups=REPAIR_OPTION_GROUPS["Doors, Ramp and ADA"];
 assert.deepEqual(Object.keys(groups),["Doors","Ramp, Lift and Kneeler","Wheelchair Securement","Stop Request"]);

 // the Q'STRAINT panel and the straps are separate units per side of the bus
 for(const side of ["curbside","roadside"]){
  assert.ok(groups["Wheelchair Securement"].includes("Q'STRAINT switch ("+side+")"),side+" switch");
  assert.ok(groups["Wheelchair Securement"].includes("Securement straps / retractor ("+side+")"),side+" straps");
  assert.ok(groups["Wheelchair Securement"].includes("Flip-up bench seat ("+side+")"),side+" bench");
 }
 // stop request existed nowhere in the catalog before
 assert.ok(groups["Stop Request"].includes("Stop request (wheelchair area)"));
 assert.ok(groups["Stop Request"].includes("Stop request (curbside)"));
 assert.ok(groups["Stop Request"].includes("Stop request chime / tone"));

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
  assert.deepEqual(migrateRepairIdentity("Doors, Ramp and Lift",issue),{category:"Doors, Ramp and ADA",issue:expected},issue);
  assert.ok(ada.includes(expected),expected+" must be pickable");
 }
 // the old category-wide catch-all has no single new home, so its wording stands
 assert.deepEqual(migrateRepairIdentity("Doors, Ramp and Lift","Other accessibility repair"),
  {category:"Doors, Ramp and ADA",issue:"Other accessibility repair"});

 // a stored record reads back under the new name with its details intact
 const [read]=normalizeDefects([{id:"ada-1",category:"Doors, Ramp and Lift",issue:"Kneeler",details:"Will not raise",state:"open",operability:"down"}]);
 assert.equal(read.category,"Doors, Ramp and ADA");
 assert.equal(read.issue,"Ramp, Lift and Kneeler - Kneeler");
 assert.equal(read.details,"Will not raise");
 assert.equal(read.id,"ada-1");

 // the ADA quick filter keys off wording, so grouped names must keep matching
 assert.ok(quickFilterMatch({id:"bus-1",defects:[read]},"bad-ramp"));
 assert.equal(repairCategoryEmoji("Doors, Ramp and ADA"),"♿");
});

test("the chair mark flags ADA equipment without touching what gets stored",async()=>{
 const [page,logPage]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
 ]);
 // the two wheelchair groups carry the mark for everything inside them
 assert.equal(repairGroupDisplayLabel("Wheelchair Securement"),"♿ Wheelchair Securement");
 assert.equal(repairGroupDisplayLabel("Ramp, Lift and Kneeler"),"♿ Ramp, Lift and Kneeler");
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
 assert.match(logPage,/<optgroup label=\{repairGroupDisplayLabel\(group\)\}/);
 assert.match(logPage,/\{repairIssueDisplayLabel\(entry,group\)\}/);
 assert.match(logPage,/<option value=\{repair\} key=\{repair\}>\{repairIssueDisplayLabel\(repair\)\}/);
});
