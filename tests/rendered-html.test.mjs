import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { busRow, busUpdatedAt, changedRows, cloudConfigProblem, cloudFailurePhase, cloudStatusLabel, defectLogPayload, defectRow, downSheetPayload, downSheetRow, fleetMapPayload, normalizeCloudConfig, readCloudConfig, readSentFingerprints, rowFingerprint, writeCloudConfig } from "../app/cloud-sync.ts";
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
import { CHECK_ENGINE_ISSUES, CHECK_ENGINE_SYMPTOMS, WORK_STATES, isCheckEngineIssue, isDownSheetRecommended, migrateRepairIdentity, normalizeWorkStateStamp, setDownSheetRecommendation, REPAIR_CATEGORY_EMOJI, REPAIR_OPTION_GROUPS, REPAIR_OPTIONS, MINIMUM_DIAGNOSTIC_HOURS, defaultDefectOperability, defectCountField, defectFromDraft, defectNote, normalizeDiagnosticHours, normalizeRepairCount, defectLabel, defectSupportingDetails, defectSummary, defectWorkStates, hasWorkState, normalizeDefects, normalizeFinding, normalizeWorkStates, repairCategoryEmoji, repairCategoryLabel, repairGroupDisplayLabel, repairIssueDisplayLabel, repairGroupPlaceholder, repairGroupStepLabel, repairIssuePlaceholder, repairIssueStepLabel, setDefectWorkState, workStateStampLabel , partNumberMissing, deferredMinutesElapsed, isHeldDeferred, isUnresolved, hasDeferredHistory} from "../app/repair-catalog.ts";
import { sectionBusCount } from "../app/section-count.ts";
import { appendMaintenanceEvent, appendOdometerReading, latestMaintenanceEvent, latestOdometerReading, maintenanceEventsOfKind, normalizeMaintenanceEvents, normalizeOdometerReadings } from "../app/domain.ts";
import { ESTIMATED_MILES_PER_OPERATING_DAY, INSPECTION_DAY_INTERVAL, INSPECTION_MILE_INTERVAL, estimatedMileage, inspectionDueStatus } from "../app/mileage-estimate.ts";
import { COMPLETION_READING_NOTE, maintenanceCompletionError, recordMaintenanceCompletion } from "../app/maintenance-completion.ts";
import { EMPTY_PARTS_MEMORY, PARTS_MEMORY_LIMIT, PARTS_MEMORY_STORAGE_KEY, forgetPart, learnPart, normalizePartsMemory, partMemoryKey, partMemoryLabel, readPartsMemory, recallPart, writePartsMemory } from "../app/parts-memory.ts";
import { BUS_LIST_COLUMN_LIMIT, BUS_LIST_MAX_HOURS, BUS_LIST_TEMPLATES, busListHours, normalizeBusListHours, setBusListEntryHours, busListTemplateOptions, deleteBusListTemplate, normalizeBusListTemplates, saveBusListTemplate, addBusListEntries, busListColumnCount, busListCounts, busListExportText, createBusList, normalizeBusListColumns, normalizeBusLists, parseBusListInput, setBusListColumns, setBusListEntryCell, setBusListEntryDone } from "../app/bus-lists.ts";
import { formatWorkHours, workDayKey, workTimePeople, workTimeRowsFromFleet, workTimeSummary } from "../app/work-time.ts";
import { DEFAULT_SERVICE_INTERVALS, LEGACY_SERVICE_INTERVALS_UNIT, SERVICE_DUE_SOON_HOURS, SERVICE_INTERVALS_UNIT, readSavedServiceIntervals, SERVICE_KINDS, MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR, SERVICE_CRITICAL_FRACTION, SERVICE_OVERDUE_FRACTION, SERVICE_SEVERITY_LABELS, engineHourMeterReset, estimateEngineHoursAtMiles, fleetDutyCycle, milesPerEngineHour, monthsBetween, serviceSeverity, normalizeServiceIntervals, serviceIntervalHours, serviceIntervalStatus } from "../app/service-intervals.ts";
import { moveBusToArea, RELOCATION_AREAS, SECTION_SLOTS } from "../app/facility-areas.ts";
import { migrateBrakeTowCapacities, migrateReducedCapacity, ROAD_CAPACITY, WEST_CAPACITY } from "../app/facility-layout.ts";
import { candidateBusNumbers, resolveBusNumber, resolveBusNumberList } from "../app/bus-number-resolver.ts";
import { planOperatorCommand } from "../app/operator-engine.ts";
import { applyOperatorBatch } from "../app/operator-batch.ts";
import { operationalUpdateAt, stampOperationalChange } from "../app/operational-time.ts";
import { formatRepairTime, normalizeRepairTimeEstimate, repairTimeTotal, recommendedRepairMinutes } from "../app/down-sheet/repair-time-estimates.ts";
import { aggregateRepairItemEstimates, blankRepairItem, isQuarantineEntry, normalizeRepairItems, repairItemsProgress, repairItemsTotal } from "../app/down-sheet/down-sheet-repair-items.ts";
import { mergeReviewedRows, reviewScannedRows } from "../app/down-sheet/down-sheet-scan-import.ts";
import { prepareFleetForScannedReplacement, scannedSheetRemovals } from "../app/down-sheet/down-sheet-replace.ts";
import { activeDefectLogCount, defectLogRecords, groupDefectLogRecords, hideDefectLogRecords, isDefectLogCleanupCandidate, recentDefectDuplicate, returnDefectLogBusToService, saveDefectLogRecord } from "../app/defect-log/defect-log-sync.ts";
import { bay12AwarenessBusIds, isBay12AwarenessArea, isMysteryArea, mysteryBusIds } from "../app/mystery-buses.ts";
import { reconcileDownSheetMembership as reconcileDS } from "../app/down-sheet-counter.ts";
import { exportDefectLogPayload, exportDownSheetPayload, exportFleetMapPayload, mergeDefectLog, mergeDownSheet, mergeFleetMap, readTransferPayload, transferFilename, TRANSFER_KINDS } from "../app/section-transfer.ts";
import { QUICK_FILTERS, quickFilterBusIds, quickFilterDefects, quickFilterFallbackLabel, quickFilterMatch } from "../app/quick-filters.ts";
import { EMPTY_FINDINGS_MEMORY, forgetFinding, learnFinding, normalizeFindingsMemory, recallFindings } from "../app/findings-memory.ts";
import { downSheetBadgeViewBusIds, downSheetBadgeViewCounts, isReadyRoadLocation } from "../app/down-sheet-badge-view.ts";
import { downSheetWorkGroup, matchesDownSheetSearch, orderDownSheetEntries } from "../app/down-sheet/down-sheet-view.ts";
import { DEFAULT_DOWN_SHEET_DISPLAY, normalizeDownSheetDisplay } from "../app/down-sheet/down-sheet-display-settings.ts";
import { DEFAULT_DEFECT_LOG_DISPLAY, normalizeDefectLogDisplay } from "../app/defect-log/defect-log-display-settings.ts";
import { quickFilterShareText } from "../app/defect-log/quick-filter-share.ts";
import { DOWN_SHEET_STORAGE_KEY, DOWN_SHEET_STORAGE_VERSION, FLEET_BACKUP_REMINDER_STORAGE_KEY, FLEET_RECOVERY_STORAGE_KEY, FLEET_STORAGE_KEY, FLEET_STORAGE_VERSION, FLEET_BACKUP_INTERVAL, FLEET_BACKUP_INTERVAL_CHOICES, normalizeFleetBackupInterval, fleetBackupDue, fleetDefectCount, fleetDefectLogCount, markFleetBackupExported, readDownSheetPayload, readFleetPayload, readFleetRecoverySnapshot, serializeDownSheetPayload, serializeFleetPayload, writeDownSheetStorage, writeFleetStorage } from "../app/storage.ts";

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
  assert.match(page, /<DownSheetBadgeMenu[\s\S]*?<PageMenu pages=\{\[/);
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
  assert.equal(defect.plan.defect.issue, "Check engine light");
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
  assert.equal(QUICK_FILTERS.length,12);
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
  assert.match(css,/\.mystery-board\.collapsed>\.mystery-head\{border-bottom:0\}/);
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
  const [page, css, backup, areas] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/fleet-backup.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/facility-areas.ts", import.meta.url), "utf8"),
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
  assert.match(areas, /"SHOP BAYS \(DIAGONAL\)":facilitySlots\("bay",9,1\)/);
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
  assert.match(areas, /"PIT":facilitySlots\("pit",2\)/);
  assert.match(areas, /"BRAKE TEST":facilitySlots\("brake",3\)/);
  assert.match(areas, /"TOW \/ STAGING":facilitySlots\("tow",4\)/);
  assert.match(areas, /"FOREMAN OFFICE":facilitySlots\("office",3\)/);
  assert.match(page, /EAST_SLOTS\.find\(slot=>!occupiedEast\.has\(slot\)\)/);
  assert.match(css, /\.eastgrid\{grid-template-columns:repeat\(2/);
  assert.ok(areas.includes('export const EAST_SLOTS=Array.from({length:9},(_,row)=>[1,2].map(column=>"east-"+(row*4+column))).flat();'));
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
  assert.match(areas, /\["MAIN GARAGE \(BAYS 1-10\)",GARAGE_STANDARD_SLOTS\]/);
  assert.match(areas, /\["TROUBLE BAY 11",TROUBLE_BAY_11_SLOTS\]/);
  assert.match(areas, /\["TROUBLE BAY 12",TROUBLE_BAY_12_SLOTS\]/);
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
  assert.match(page, /EXPORT ALL DATA/);
  assert.match(page, /IMPORT ALL DATA/);
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
  /* Both moved into the PAGES menu when four page buttons were wrapping the
     command bar onto a second row. Still one of each, still counted. */
  assert.equal((page.match(/label:"DOWN SHEET",count:actualDownSet\.size/g) || []).length, 1);
  assert.equal((page.match(/label:"DEFECT LOG",count:defectLogCount/g) || []).length, 1);
  assert.doesNotMatch(page, /className="downsheet-command"/);
  assert.doesNotMatch(page, /className="defectlog-command"/);
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
  const [page,css]=await Promise.all([readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8")]);
  assert.match(page,/MOVE \/ LOCATION/);
  assert.match(page,/defects and Down Sheet membership are not changed/);
  assert.match(css,/\.mystery-move\{[^}]*min-height:44px/);
});
test("repair catalog exposes robust category and issue choices", () => {
  assert.equal(Object.keys(REPAIR_OPTIONS).length, 21);
  assert.ok(Object.entries(REPAIR_OPTIONS).filter(([category]) => category !== "Interior Cleaning").every(([, options]) => options.length >= 5));
  assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("No cooling"));
  assert.ok(REPAIR_OPTIONS["Brakes"].includes("ABS warning"));
  assert.ok(REPAIR_OPTIONS["Inspection"].includes("B-12"));
  assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Operating Controls - Horn"));
  assert.equal(Object.keys(REPAIR_OPTION_GROUPS["Bus Controls"])[0], "Door, Ramp and Kneeler Failures");
  assert.deepEqual(REPAIR_OPTION_GROUPS["Bus Controls"]["Door, Ramp and Kneeler Failures"], ["Front door will not open","Front door will not close","Front door opens / closes slowly","Rear door will not open","Rear door will not close","Rear door opens / closes slowly","Ramp not working","Ramp no power","Kneeler not functioning correctly","Kneeler sits too high"]);
  assert.equal(REPAIR_OPTIONS["Bus Controls"][0], "Door, Ramp and Kneeler Failures - Front door will not open");
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
  for(const issue of ["Interior advertising panel / ad card rack - loose or hanging (C/S)","Interior advertising panel / ad card rack - loose or hanging (R/S)","Passenger seat - loose","Passenger seat - missing","Passenger seat - damaged","Passenger assist handle / hanging strap - loose or broken","Passenger grab rail / stanchion - loose or damaged"])
    assert.ok(REPAIR_OPTIONS.Bodywork.includes(issue),issue);
  assert.ok(REPAIR_OPTIONS.Miscellaneous.includes("Missing road hazard triangles (3 required)"));
  assert.ok(REPAIR_OPTIONS.Miscellaneous.includes("Fire extinguisher missing"));
  assert.equal(repairIssueDisplayLabel("Fire extinguisher missing"),"🧯 Fire extinguisher missing");
  assert.ok(REPAIR_OPTIONS["Preventive Maintenance"].includes("Bike rack - arms / pivot adjustment"));
  assert.equal(normalizeDefects([{id:"legacy-screen",category:"Tech Services",issue:"MDT Screen",details:"Blank",state:"open"}])[0].issue,"IBS Screen");
  assert.deepEqual(Object.keys(REPAIR_OPTION_GROUPS.Amerex), ["Fire Suppression", "Gas Concentration", "CNG"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Fire Suppression"], ["FIRE alarm (system discharged)", "Heat sensor communication fault", "Trouble Mod 1 Roof 1", "Trouble Mod 2 Roof 1", "Control head no power", "Other Fire Suppression Trouble"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Gas Concentration"], ["Trace", "Significant Leak", "Other Gas Concentration Alert"]);
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 1 Roof 1"));
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
  assert.equal(repairGroupStepLabel("Bus Controls"), "CHOOSE THE GROUP");
  // Six since Bus Accessories was added for the bike rack; this counted five
  // before. The placeholder is generated from the group list rather than
  // written out, so the number moving is exactly what the assertion is for.
  assert.equal(repairGroupPlaceholder("Bus Controls"), "Choose one of 6 groups");
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
 // Stop engine light is now a catalog entry of its own and half of the combined
 // entry, so offering it again as a tick box would be two ways to say one thing.
 assert.deepEqual(CHECK_ENGINE_SYMPTOMS,["Misfire","Loss of power"]);
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
  assert.match(css,/\.log-settings-button\{position:static;grid-column:2;grid-row:2/);
  /* The position reset is gone because the collision is gone: the tile was
     className="fixed", which Tailwind owns, and no longer is. */
  assert.match(css,/\.log-summary \.fixed-today\{grid-column:1\/-1\}/);
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
  assert.match(page, /singleTapEmptySpaces,busDisplay,showDownSheetBadges,downSheetBadgeView,confirmMoves,confirmDefects,serviceIntervalsUnit:SERVICE_INTERVALS_UNIT,serviceIntervals\}\)\)/);
  assert.match(page, /theme:themeName,singleTapEmptySpaces,busDisplay,showDownSheetBadges,downSheetBadgeView,confirmMoves,confirmDefects,serviceIntervalsUnit:SERVICE_INTERVALS_UNIT,serviceIntervals\}/);
  assert.match(page, /setServiceIntervals\(readSavedServiceIntervals\(saved\.serviceIntervalsUnit,saved\.serviceIntervals\)\)/);
  assert.match(page, /if\(typeof saved\.confirmMoves==="boolean"\)setConfirmMoves\(saved\.confirmMoves\)/);
  // Replacing the whole board must always ask, regardless of preferences.
  assert.match(page, /confirm\("Import this backup\?/);
});

test("every facility section can collapse independently while global controls remain", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const areas = await readFile(new URL("../app/facility-areas.ts", import.meta.url), "utf8");
  assert.match(page, /aria-expanded=\{!collapsed\}/);
  assert.match(page, /setCollapsedSections\(new Set\(Object\.keys\(SECTION_SLOTS\)\)\)/);
  assert.match(page, /sectionClass\("IN SERVICE \/ ON ROAD","road"\)/);
  assert.match(page, /sectionClass\("MAIN GARAGE \(BAYS 1-12\)","garage panel"\)/);
  assert.match(css, /\.section-collapsed>:not\(\.title\)\{display:none!important\}/);
  assert.match(css, /\.title-actions \.toggle-section/);
  assert.match(areas, /"BRAKE TEST":facilitySlots\("brake",3\)/);
  assert.match(areas, /"TOW \/ STAGING":facilitySlots\("tow",4\)/);
  assert.match(areas, /"FOREMAN OFFICE":facilitySlots\("office",3\)/);
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
  assert.match(page,/className="bus-generations"/);
  assert.match(page,/input autoFocus inputMode="numeric"/);
  assert.match(page,/Choose generation first/);
  assert.match(page,/className="save-log-middle" disabled=\{Boolean\(recentDuplicate\)\}>\{saveLabel\}/);
  assert.match(page,/className="close-log-middle" onClick=\{close\}>CLOSE/);
  assert.doesNotMatch(page,/className="log-header-save/);
  assert.ok(page.indexOf('className="save-log-middle-actions"')<page.indexOf('className="wide downsheet-check"'));
  assert.match(page,/lockPageScroll\("defect-editor-open"\)/);
  assert.match(page,/const closeEditor=\(\)=>\{const left=window\.scrollX,top=window\.scrollY/);
  assert.match(page,/window\.requestAnimationFrame\(\(\)=>\{restore\(\);window\.requestAnimationFrame\(restore\)\}\)/);
  assert.match(css,/@media\(max-width:760px\)\{\.shop-notes-column\{display:none\}/);
  assert.match(css,/\.grouped-defect-row/);
  assert.match(page,/type LogGroupContrast="standard"\|"strong"/);
  assert.match(page,/groupContrast:"strong"/);
  assert.match(page,/saved\.groupContrast==="standard"\?"standard":"strong"/);
  assert.match(page,/data-group-contrast=\{settings\.groupContrast\}/);
  assert.match(page,/BUS GROUP SEPARATION/);
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
  const archived = hideDefectLogRecords([bus],[activeDefect.id],"2026-08-22T12:00:00.000Z");
  assert.equal(archived[0].s,"out");
  assert.equal(archived[0].l,"west-0");
  assert.equal(archived[0].down,true);
  assert.equal(archived[0].defects[0].state,"open");
  assert.equal(archived[0].defects[0].defectLogHiddenAt,"2026-08-22T12:00:00.000Z");
});
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
  assert.match(defectPage, /<b>ADVANCED DETAILS<\/b><small>Diagnosis, repair, parts and initials<\/small>/);
  assert.ok(defectPage.indexOf('className="save-log-middle-actions"')<defectPage.indexOf('className="advanced-defect-details"'));
  assert.ok(defectPage.indexOf('className="advanced-defect-details"')<defectPage.indexOf('className="wide downsheet-check"'));
  assert.match(defectCss, /\.advanced-defect-details summary\{[^}]*min-height:46px/);
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
  assert.match(defectCss,/save-log-middle-actions\{[^}]*grid-template-columns:repeat\(2/);
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

test("Bus Controls leads with both turn-signal defects",()=>{
 const controls=REPAIR_OPTIONS["Bus Controls"];
 assert.ok(controls.includes("Operating Controls - Turn signals (steering column)"));
 assert.ok(controls.includes("Operating Controls - Turn signals (floor panel)"));
 assert.equal(new Set(controls).size,controls.length);
 assert.ok(controls.includes("Operating Controls - Horn"));
 assert.ok(controls.includes("Operating Controls - Other bus control defect"));
 assert.equal(defectLabel({category:"Bus Controls",issue:"Operating Controls - Turn signals (floor panel)",details:""}).includes("Turn signals (floor panel)"),true);
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

test("a repair records how far it got, and what was found travels with it",async()=>{
 const base={id:"d1",category:"Engine",issue:"Check engine light",details:"",operability:"service",state:"open"};

 // three states and no more: a fourth invites two mechanics to tick different
 // boxes for the same job, and a state written onto records cannot be removed
 assert.deepEqual(WORK_STATES.map(state=>state.key),["inspected","diagnosed","parts-on-order"]);

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
 assert.match(page,/REQUIRE INITIALS ON RECORDED WORK/);
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

test("the backup reminder is one card the shop sets the cadence of",async()=>{
 const buses=count=>Array.from({length:count},(_,index)=>({id:"b"+index,defects:[
  {id:"d"+index,category:"Miscellaneous",issue:"Driver-reported defect",details:"",operability:"service",state:"open",source:"defect-log"}]}));
 const empty={getItem:()=>null};

 // Twenty was fixed, and twenty is either a nag or a stranger depending on how
 // busy the shop is. It is the default now rather than the rule.
 assert.equal(FLEET_BACKUP_INTERVAL,20);
 assert.equal(fleetBackupDue(empty,buses(19)).due,false);
 assert.equal(fleetBackupDue(empty,buses(20)).due,true);
 assert.equal(fleetBackupDue(empty,buses(6),5).due,true);
 assert.equal(fleetBackupDue(empty,buses(6),50).due,false);
 assert.equal(fleetBackupDue(empty,buses(60),50).due,true);

 // Anything not offered falls back rather than being honoured. A zero or a
 // negative would make the banner permanent; a huge one would silence it.
 for(const choice of FLEET_BACKUP_INTERVAL_CHOICES)assert.equal(normalizeFleetBackupInterval(choice),choice);
 for(const junk of [0,-7,"",null,undefined,"abc",7,99999,1.5])assert.equal(normalizeFleetBackupInterval(junk),FLEET_BACKUP_INTERVAL,String(junk)+" should fall back");
 assert.ok(!FLEET_BACKUP_INTERVAL_CHOICES.includes(0),"there is no never - the loosest setting still asks");

 /* globals.css styles a bare `aside` as a fixed 255px panel pinned top right,
    and absolutely positions any button directly inside one into its corner.
    That is written for the map's floating panel, and this banner inherited it
    purely by being an <aside> - which is what threw EXPORT FULL BACKUP on top
    of the sentence it belongs under. The reset is load-bearing, not tidiness. */
 const [css,tsx]=await Promise.all([
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/offline-backup-reminder.tsx",import.meta.url),"utf8"),
 ]);
 const card=css.match(/\.offline-backup-reminder\{[^}]*\}/)[0];
 for(const reset of ["position:static","width:auto","top:auto","right:auto"])assert.ok(card.includes(reset),"the card must undo the global aside rule: "+reset);
 assert.match(css,/\.offline-backup-reminder>button\{position:static;[^}]*width:100%/);
 // one card, read top to bottom, not a heading and a button side by side
 assert.match(card,/display:grid/);
 assert.ok(!/flex-direction|align-items:center/.test(card),"the card must not lay out in a row again");
 assert.match(tsx,/<b>OFFLINE BACKUP DUE<\/b>[\s\S]*<small>[\s\S]*<button/,"heading, then text, then the button");
 // and the interval reaches it, so changing the setting re-asks straight away
 assert.match(tsx,/fleetBackupDue\(localStorage,buses,interval\)/);
 assert.match(tsx,/\},\[buses,interval\]\)/);
});

test("the command bar carries the other pages behind one trigger",async()=>{
 /* Four separate page buttons plus the locator, quick filters, badge view,
    refresh, settings and the operator wrapped the bar onto a second row at every
    width from an iPad to a 1440px desktop, and onto four rows — 208px — on an
    iPad held upright. A bar you have to scroll has stopped being a bar. */
 const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 const menu=await readFile(new URL("../app/page-menu.tsx",import.meta.url),"utf8");
 const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");

 // the four buttons are gone from the bar and live in the menu instead
 for(const gone of ["downsheet-command","defectlog-command","fixed-repairs-command","lists-command"])
  assert.ok(!page.includes('className="'+gone+'"'),gone+" should be inside the PAGES menu now");
 assert.match(page,/<PageMenu pages=\{\[/);
 for(const href of ["/down-sheet","/defect-log","/fixed-repairs","/lists"])
  assert.ok(page.includes('href:"'+href+'"'),"the menu must still reach "+href);
 // the counts come along: the reason to glance at the bar is to see what is waiting
 assert.match(page,/count:actualDownSet\.size/);
 assert.match(page,/count:defectLogCount/);
 assert.match(page,/count:fixedRepairCount/);

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
  "../app/fixed-repairs/page.tsx","../app/lists/page.tsx","../app/section-transfer-controls.tsx",
  "../app/defect-log/offline-backup-reminder.tsx","../app/down-sheet/down-sheet-editor.tsx",
  "../app/down-sheet/down-sheet-settings.tsx","../app/down-sheet/down-sheet-scanner.tsx"];
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

test("no export hands the phone a link instead of a file",async()=>{
 /* Reported off a phone: the Defect Log export "said blob", and the link shared
    to the iPad came back not found. It was a bare anchor download — on iOS
    Safari, and a Home Screen app especially, clicking a blob link is navigation
    rather than a download. The page opens with blob:https://<site>/<uuid> in the
    address bar, sharing it shares the URL rather than the file, and a blob URL
    is scoped to the session that made it, so on the other device it resolves to
    https://<site>/<uuid> and 404s. It could never have worked. */
 const helper=await readFile(new URL("../app/share-file.ts",import.meta.url),"utf8");
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
  ["full backup","../app/fleet-backup.ts"],
  ["section transfers","../app/section-transfer-controls.tsx"],
 ].map(async([label,path])=>[label,await readFile(new URL(path,import.meta.url),"utf8")]));
 for(const [label,source] of sources){
  assert.match(source,/shareOrDownloadFile/,label+" must deliver its file through the shared helper");
  assert.ok(!/link\.download=/.test(source),label+" must not build its own download link: that is the bug");
  assert.ok(!/createObjectURL\(blob\)/.test(source),label+" must not make its own blob URL");
 }
});

test("it does not matter which section is moved first",()=>{
 /* Curtis asked whether moving the map before the Down Sheet still lands right,
    or whether the order is only a recommendation. It should not matter, and it
    did — because of identity, in two ways that both dropped a badge. */
 const isActive=e=>e.workflow!=="Completed";
 const applySheet=(buses,entries,file)=>{const m=mergeDownSheet(entries,file,buses);
  return {buses:reconcileDS(buses,m.entries.filter(isActive).map(e=>e.busId)),entries:m.entries}};
 const applyMap=(buses,entries,file)=>({buses:mergeFleetMap(buses,file).buses,entries});
 const bus=(id,n,l,down)=>({id,n,l,s:down?"out":"service",down,onDownSheet:down,defects:[],pendingRepair:""});

 for(const [label,sender,receiver] of [["same ids",["a","b"],["a","b"]],["different ids",["p1","p2"],["i1","i2"]]]){
  const from=[bus(sender[0],"17549","west-4",true),bus(sender[1],"18122","garage-2",false)];
  const mapFile=exportFleetMapPayload(from);
  const sheetFile=exportDownSheetPayload([{id:"e1",busId:sender[0],busNumber:"17549",workflow:"Scheduled"}]);
  const start=()=>[bus(receiver[0],"17549","bay-3",false),bus(receiver[1],"18122","bay-4",false)];
  let a={buses:start(),entries:[]}; a=applySheet(a.buses,a.entries,sheetFile); a=applyMap(a.buses,a.entries,mapFile);
  let c={buses:start(),entries:[]}; c=applyMap(c.buses,c.entries,mapFile); c=applySheet(c.buses,c.entries,sheetFile);
  const show=x=>x.buses.map(z=>z.n+"@"+z.l+(z.down?" DOWN":"")).join(" ");
  assert.equal(show(a),show(c),label+": the order of the two transfers changed the result");
  assert.match(show(a),/17549@west-4 DOWN/,label+": the bus should have moved and kept its badge");
 }

 /* And a transfer never re-keys the receiving device's own records. The map
    payload carries the sending device's id, and letting it through orphaned
    the receiver's OWN Down Sheet entries — they point at the id it had before
    the import — so its buses silently lost their badges. */
 const localBuses=[bus("i1","17549","bay-3",true)];
 const localEntries=[{id:"e-local",busId:"i1",busNumber:"17549",workflow:"Scheduled"}];
 const after=mergeFleetMap(localBuses,exportFleetMapPayload([bus("p1","17549","west-4",false)])).buses;
 assert.equal(after[0].id,"i1","a transfer must not re-key a bus the receiving device already had");
 assert.equal(after[0].l,"west-4","it still takes the incoming position");
 assert.equal(reconcileDS(after,localEntries.map(e=>e.busId))[0].down,true,"the device's own Down Sheet must still find its bus");

 // an entry arriving with a foreign id is re-pointed by fleet number
 const repointed=mergeDownSheet([],exportDownSheetPayload([{id:"e9",busId:"p1",busNumber:"17549",workflow:"Scheduled"}]),[bus("i1","17549","bay-3",false)]);
 assert.equal(repointed.entries[0].busId,"i1");
 // and one for a bus this device does not have is left exactly as it came
 const untouched=mergeDownSheet([],exportDownSheetPayload([{id:"e8",busId:"p9",busNumber:"99999",workflow:"Scheduled"}]),[bus("i1","17549","bay-3",false)]);
 assert.equal(untouched.entries[0].busId,"p9");
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
 const areas=await readFile(new URL("../app/facility-areas.ts",import.meta.url),"utf8");
 assert.match(areas,/"SERVICE DETAIL AREA \(SINGLE FILE\)":facilitySlots\("service",SINGLE_FILE_CAPACITY\)/);
 assert.match(map,/IN SERVICE \/ ON ROAD/);
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
 /* An imported entry goes through the same normalizer hydration uses. One
    arriving without a timeEstimate crashed the sheet, because a row asks it for
    repairMinutes without checking, so the import took nothing at all. */
 assert.match(sheet,/setEntries\(merged\.map\(\(entry,index\)=>normalizeEntry\(entry,index\)\)\)/);
});

test("a section moves between devices without dragging the rest of the app with it",()=>{
 /* The situation this exists for: the phone has today's Defect Log and last
    week's map, the iPad has today's map and last week's log. Importing either
    whole backup throws away the half the other device did better. */
 const defect=(id,issue)=>({id,category:"Engine",issue,details:"",operability:"service",state:"open",source:"defect-log"});
 const phone=[
  {id:"p1",n:"17549",l:"bay-3",s:"defect",mechanic:"CJ",defects:[defect("d1","Overheating"),defect("d2","Misfire")]},
  {id:"p2",n:"18122",l:"road-1",s:"service",mechanic:"",defects:[defect("d3","Oil leak")]}];
 const ipad=[
  {id:"i1",n:"17549",l:"west-4",s:"service",mechanic:"RM",defects:[defect("d9","Coolant leak")]},
  {id:"i2",n:"18122",l:"garage-2",s:"shop",mechanic:"",defects:[]},
  {id:"i3",n:"20077",l:"east-1",s:"service",mechanic:"",defects:[]}];

 // The phone sends its Defect Log. The iPad's map must not move an inch.
 const log=exportDefectLogPayload(phone);
 assert.equal(log.kind,TRANSFER_KINDS["defect-log"].payloadKind);
 assert.ok(log.buses.every(bus=>!("l" in bus)&&!("s" in bus)),"a Defect Log transfer must not carry map fields");
 const afterLog=mergeDefectLog(ipad,log);
 assert.deepEqual(afterLog.buses.map(bus=>bus.l),["west-4","garage-2","east-1"],"the map stayed put");
 assert.deepEqual(afterLog.buses.map(bus=>bus.mechanic),["RM","",""],"map fields stayed put");
 // the phone's defects arrived and the iPad's own were kept, not replaced
 assert.deepEqual(afterLog.buses[0].defects.map(d=>d.id).sort(),["d1","d2","d9"]);
 assert.deepEqual(afterLog.buses[1].defects.map(d=>d.id),["d3"]);
 assert.equal(afterLog.report.updated,2);

 // The iPad sends its map back. The phone's Defect Log must survive whole.
 const map=exportFleetMapPayload(ipad);
 assert.ok(map.buses.every(bus=>!("defects" in bus)),"a Fleet Map transfer must not carry defects");
 const afterMap=mergeFleetMap(phone,map);
 assert.deepEqual(afterMap.buses.slice(0,2).map(bus=>bus.l),["west-4","garage-2"],"the phone took the iPad's positions");
 assert.deepEqual(afterMap.buses[0].defects.map(d=>d.id),["d1","d2"],"sending a map must never clear a Defect Log");
 // a bus the phone has never seen arrives with the map, because the map is
 // where a bus lives, and it arrives with no defects of its own
 assert.equal(afterMap.report.added,1);
 assert.equal(afterMap.buses[2].n,"20077");
 assert.deepEqual(afterMap.buses[2].defects,[]);

 // A defect for a bus the receiving device does not have is reported, never
 // invented: giving it a place on the map is the map transfer's job.
 const stranger=mergeDefectLog([ipad[0]],exportDefectLogPayload([{id:"x",n:"99999",defects:[defect("d5","Misfire")]}]));
 assert.deepEqual(stranger.report.unmatched,["99999"]);
 assert.equal(stranger.buses.length,1);

 // Matching is by fleet number, because two devices seeded separately give the
 // same bus different ids and 17549 is what a person means.
 const renumbered=mergeDefectLog([{id:"totally-different",n:"17549",l:"pit-1",defects:[]}],log);
 assert.equal(renumbered.report.updated,1);
 assert.equal(renumbered.buses[0].l,"pit-1");

 // The Down Sheet is its own store, so it merges by entry and keeps local ones.
 const sheet=mergeDownSheet([{id:"e1",busNumber:"17549",workflow:"Scheduled"},{id:"e2",busNumber:"18122",workflow:"Scheduled"}],
  exportDownSheetPayload([{id:"e1",busNumber:"17549",workflow:"Completed"},{id:"e3",busNumber:"20077",workflow:"Scheduled"}]));
 assert.equal(sheet.entries.find(e=>e.id==="e1").workflow,"Completed","incoming wins where both have it");
 assert.ok(sheet.entries.find(e=>e.id==="e2"),"an entry only this device has stays on the sheet");
 assert.equal(sheet.report.added,1);

 /* Wrong file on the wrong page names the right page, rather than the flat
    "not valid" that a whole-backup import gave every one of these. */
 const wrong=readTransferPayload(JSON.stringify(exportFleetMapPayload(ipad)),"defect-log");
 assert.equal(wrong.ok,false);
 assert.match(wrong.error,/Fleet Map file\. Import it on the Fleet Map page/);
 const report=readTransferPayload(JSON.stringify({kind:"fleet-real-time-defect-log",records:[]}),"defect-log");
 assert.match(report.error,/report, not a transfer/);
 const full=readTransferPayload(JSON.stringify({kind:"pace-south-fleet-board-backup"}),"down-sheet");
 assert.match(full.error,/IMPORT ALL DATA/);
 assert.equal(readTransferPayload("not json at all","defect-log").ok,false);
 assert.equal(readTransferPayload(JSON.stringify(log),"defect-log").ok,true);
 assert.match(transferFilename("fleet-map",new Date("2026-08-30T00:00:00Z")),/^pace-fleet-map-2026-08-30\.json$/);

 /* A merge must not invent keys. Writing the local defect fields back
    unconditionally set pendingRepair to undefined on a bus that had never had
    one, and the Facility Map calls .trim() on it while filtering — so importing
    a map crashed the page instead of moving a bus. The fixtures above all
    happened to carry the field, which is exactly why only a real browser found
    it; these are deliberately sparse. */
 const sparse=[{id:"s1",n:"17549",l:"bay-3",s:"defect"}];
 const merged=mergeFleetMap(sparse,exportFleetMapPayload([{id:"o1",n:"17549",l:"west-4",s:"service"}]));
 assert.equal(merged.buses[0].l,"west-4");
 assert.ok(!("pendingRepair" in merged.buses[0]),"a key the bus never had must not be created as undefined");
 assert.ok(!("defects" in merged.buses[0]),"the same for defects");
 // and a bus arriving on the map with no defect fields at all gets usable ones
 const fresh=mergeFleetMap([],exportFleetMapPayload([{id:"o2",n:"20077",l:"east-1",s:"service"}]));
 assert.deepEqual(fresh.buses[0].defects,[]);
 assert.equal(fresh.buses[0].pendingRepair,"");
 // the same shape through the Defect Log side
 const sparseLog=mergeDefectLog([{id:"s2",n:"18122",l:"bay-4"}],exportDefectLogPayload([{id:"o3",n:"18122",defects:[defect("d7","Misfire")]}]));
 assert.deepEqual(sparseLog.buses[0].defects.map(d=>d.id),["d7"]);
 assert.equal(sparseLog.buses[0].l,"bay-4");
});

test("only the button that writes a restorable file is called a backup",async()=>{
 /* Four buttons in this app write a file and only one of them can be read back
    in. They used to read as variations on the same idea — EXPORT LOG next to
    EXPORT / SHARE BACKUP — and the difference only surfaces on the day somebody
    tries to restore a phone from the wrong one. */
 const [log,fixed,lists,map,backup]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fixed-repairs/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/lists/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fleet-backup.ts",import.meta.url),"utf8"),
 ]);

 // Each report says REPORT on its face, and none of them says BACKUP.
 assert.match(log,/onClick=\{exportLog\}[^>]*>EXPORT LOG REPORT</);
 assert.match(fixed,/onClick=\{exportHistory\}[^>]*>EXPORT HISTORY REPORT</);
 assert.match(lists,/onClick=\{downloadList\}[^>]*>DOWNLOAD REPORT \(\.TXT\)</);
 for(const [name,source,handler] of [["Defect Log",log,"exportLog"],["Fixed Repairs",fixed,"exportHistory"],["Fleet Campaigns",lists,"downloadList"]]){
  const label=source.match(new RegExp("onClick=\\{"+handler+"\\}[^>]*>([^<]+)<"))[1];
  assert.ok(/REPORT/.test(label),name+" export must say REPORT: "+label);
  assert.ok(!/BACKUP/i.test(label),name+" export must not say BACKUP: "+label);
  // and each carries the long version, from one shared string so the three
  // can never drift into describing the same limitation three different ways
  assert.match(source,new RegExp("onClick=\\{"+handler+"\\}[^>]*title=\\{REPORT_EXPORT_HINT\\}"),name+" is missing the shared hint");
 }
 /* The hint sends people somewhere, so it has to name a button that is really
    there. It pointed at EXPORT / SHARE BACKUP, which no longer exists. */
 const hint=backup.match(/REPORT_EXPORT_HINT="([^"]*)"/)[1];
 assert.match(hint,/Report only[\s\S]*cannot be imported back/);
 assert.match(hint,/EXPORT ALL DATA in Facility Map settings/);
 assert.ok(!/SHARE BACKUP/.test(hint),"the hint must not send anybody to a label that no longer exists");

 // The real one keeps the word, and it is the only button that has it.
 // The whole-app pair says ALL DATA now, because it is no longer the only
 // thing that can be imported — it is the one that replaces everything.
 assert.match(map,/onClick=\{exportBoard\}>EXPORT ALL DATA</);
 assert.match(map,/IMPORT ALL DATA<input type="file"/);
 assert.match(map,/All data replaces everything on the destination device/);
 assert.equal((log+fixed+lists).match(/>[^<]*BACKUP[^<]*<\/button>/gi),null);
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
  assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("System Switches - "+switchName),switchName+" missing from REPAIR_OPTIONS");
  assert.ok(REPAIR_OPTION_GROUPS["Bus Controls"]["System Switches"].includes(switchName),switchName+" missing from REPAIR_OPTION_GROUPS");
  // and it survives a round trip through a saved defect under its stored name
  const [defect]=normalizeDefects([{id:"d",category:"Bus Controls",issue:"System Switches - "+switchName,details:"",state:"open",operability:"service"}]);
  assert.equal(defect.issue,"System Switches - "+switchName);
 }
 // The mirror switches read as a pair rather than being split by the group.
 const switches=REPAIR_OPTION_GROUPS["Bus Controls"]["System Switches"];
 assert.equal(switches.indexOf("Mirror adjuster switch - C/S"),switches.indexOf("Mirror heater switch - C/S")+1);
 /* Both are curbside, and the adjuster now says what it adjusts. A record saved
    under either first wording reads as the new one. */
 assert.deepEqual(migrateRepairIdentity("Bus Controls","System Switches - C/S adjuster switch"),
  {category:"Bus Controls",issue:"System Switches - Mirror adjuster switch - C/S"});
 assert.deepEqual(migrateRepairIdentity("Bus Controls","System Switches - Mirror heater switch"),
  {category:"Bus Controls",issue:"System Switches - Mirror heater switch - C/S"});
 // Lights and Fixtures still owns the mirrors themselves; only the switch moved.
 assert.ok(REPAIR_OPTIONS["Lights and Fixtures"].includes("Outside rear view mirror - C/S"));
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
 const editor=await readFile(new URL("../app/down-sheet/down-sheet-editor.tsx",import.meta.url),"utf8");
 assert.match(editor,/item\.repair&&!repairs\.includes\(item\.repair\)&&<option value=\{item\.repair\}>\{item\.repair\} \(as logged\)<\/option>/);
 assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("A/C belt"));
 assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("A/C compressor pulley misaligned"));
 assert.deepEqual(REPAIR_OPTIONS["Air System"].slice(0,4),
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

 const editor=await readFile(new URL("../app/down-sheet/down-sheet-editor.tsx",import.meta.url),"utf8");
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

 const editor=await readFile(new URL("../app/down-sheet/down-sheet-editor.tsx",import.meta.url),"utf8");
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

test("the Down Sheet editor holds the page still and fills a phone screen",async()=>{
 const [css,editor,logCss,lock]=await Promise.all([
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet-editor.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
  readFile(new URL("../app/scroll-lock.ts",import.meta.url),"utf8"),
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

test("the parking brake knob and the rear air valves are in the catalog",()=>{
 const controls=REPAIR_OPTIONS["Bus Controls"],air=REPAIR_OPTIONS["Air System"];

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
 // Named by the side they are on, the way the catalog already writes C/S and
 // R/S, so nobody has to remember which valve is which end of the bus.
 assert.ok(air.includes("R-12 relay valve (C/S rear)"));
 assert.ok(air.includes("R-14 relay valve (R/S rear)"));

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
 assert.ok(notePage.indexOf('QUICK SELECT')<notePage.indexOf("defect-note"));
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
test("a day's work time covers Defect Log repairs as well as campaign sweeps",()=>{
 const yesterday="2026-08-26T15:00:00.000Z",today="2026-08-27T15:00:00.000Z";
 let farebox=createBusList("Farebox","rep",today,"s");
 farebox=addBusListEntries(farebox,"17503","a");
 farebox=setBusListEntryDone(farebox,farebox.entries[0].id,true,today,"CURTIS");
 farebox=setBusListEntryHours(farebox,farebox.entries[0].id,"1.5");

 const buses=[
  {id:"a",n:"17549",defects:[
   // repair time only
   {id:"a1",category:"Brakes",issue:"Brake light on",state:"completed",completedAt:today,completedBy:"CURTIS",repairHours:2},
   // diagnostic and repair on the same repair: the day gets both
   {id:"a2",category:"Engine",issue:"Check engine light",state:"completed",completedAt:today,completedBy:"CURTIS",diagnosticHours:1.5,repairHours:0.5},
   // finished with no hours: reported, never counted as zero
   {id:"a3",category:"Lighting","issue":"Headlight out",state:"completed",completedAt:today,completedBy:"CURTIS"},
   // still open, so not work time yet however long it has been sitting
   {id:"a4",category:"Engine",issue:"Check engine light",state:"open",repairHours:9},
  ]},
  // diagnosed but handed on unfixed: still a day's work
  {id:"b",n:"17568",defects:[
   {id:"b1",category:"Engine",issue:"Check engine light",state:"completed",completedAt:yesterday,completedBy:"CURTIS",diagnosticHours:1.25},
   // somebody else's time never lands on this timesheet
   {id:"b2",category:"Brakes",issue:"Air leak",state:"completed",completedAt:today,completedBy:"JT",repairHours:3},
  ]},
 ];

 // both names surface whether their time came from a campaign or a repair
 assert.deepEqual(workTimePeople({lists:[farebox],buses}),["CURTIS","JT"]);
 assert.deepEqual(workTimePeople({buses}),["CURTIS","JT"]);

 const curtis=workTimeSummary({lists:[farebox],buses},"CURTIS");
 // 1.5 swept + 2 repaired + (1.5 diagnosing + 0.5 fixing) + 1.25 diagnosing
 assert.equal(curtis.hours,6.75);
 assert.equal(curtis.entries,4);
 assert.equal(curtis.untimed,1);
 assert.equal(curtis.days.length,2);
 assert.equal(curtis.days[0].hours,5.5);
 assert.equal(curtis.days[1].hours,1.25);

 // the campaign row and the repairs sit in one day, each named by its bus
 assert.deepEqual(curtis.days[0].rows.map(row=>row.label),["Bus 17503","Bus 17549","Bus 17549"]);
 assert.deepEqual(curtis.days[0].rows.map(row=>row.source),["Farebox","Defect Log","Defect Log"]);
 // and the split is carried so 2 hours of fixing never reads as 2 of diagnosing
 assert.deepEqual(curtis.days[0].rows.map(row=>row.note),[undefined,undefined,"incl 1.5 diag"]);
 assert.equal(curtis.days[1].rows[0].note,"diagnosis");

 assert.equal(workTimeSummary({buses},"JT").hours,3);
 // a page with only one kind of record still totals, and neither is required
 assert.equal(workTimeSummary({lists:[farebox]},"CURTIS").hours,1.5);
 assert.equal(workTimeSummary({buses},"CURTIS").hours,5.25);
 assert.deepEqual(workTimeRowsFromFleet([]),[]);
 assert.deepEqual(workTimeRowsFromFleet([{id:"c",n:"17563"}]),[]);
});

test("the work time panel is written to be moved somewhere else later",async()=>{
 const [panel,logic,listsPage]=await Promise.all([
  readFile(new URL("../app/work-time-panel.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/work-time.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/lists/page.tsx",import.meta.url),"utf8"),
 ]);
 // Curtis expects this to move. It takes its records as a prop and holds only
 // which person is picked, so relocating it is an import and one line.
 assert.match(panel,/export default function WorkTimePanel\(\{lists=\[\],buses=\[\],defaultPerson=""\}/);
 assert.equal(/localStorage/.test(panel),false,"it must not reach for storage of its own");
 assert.equal(/BUS_LISTS_STORAGE_KEY|FLEET_STORAGE_KEY|useRouter|window\./.test(panel),false,"nor for the page around it");
 // the aggregation knows nothing about campaigns beyond where rows come from
 assert.equal(/localStorage|document\.|window\./.test(logic),false);
 // mounted outside the campaign layout, so it can be lifted out whole
 assert.match(listsPage,/<WorkTimePanel lists=\{lists\} buses=\{fleet\} defaultPerson=\{initials\.trim\(\)\.toUpperCase\(\)\}\/>/);
 assert.ok(listsPage.indexOf("<WorkTimePanel")<listsPage.indexOf('className="lists-layout"'),"near the top, not inside the list panels");
 assert.ok(listsPage.indexOf("lists-header")<listsPage.indexOf("<WorkTimePanel"),"but below the header, not at the very top");

 // Each job on a day is its own element. Joined into one string with a
 // separator character, the dot between two jobs looked identical to the dot
 // inside one and a busy day read as an unbroken run of numbers.
 assert.match(panel,/className="work-time-job"/);
 assert.equal(/\.join\(/.test(panel),false,"jobs are elements, not a joined string");
 const styles=await readFile(new URL("../app/work-time.css",import.meta.url),"utf8");
 assert.match(styles,/\.work-time-job\+\.work-time-job\{[^}]*border-left/,"with a rule between them");
 assert.match(styles,/\.work-time-detail\{[^}]*flex-wrap:wrap/,"wrapping rather than running off a phone");

 // Campaigns borrow the fleet to total repair time and must never write it
 // back. A bug here would put defect records at risk from a page that has no
 // business editing them.
 assert.match(listsPage,/readFleetPayload/,"it reads the fleet for the timesheet");
 assert.equal(/writeFleetStorage|setItem\(FLEET_STORAGE_KEY/.test(listsPage),false,"but never writes it");
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

test("every page offers the Fleet Campaigns tab without changing the lists route",async()=>{
 const pages=await Promise.all(["../app/page.tsx","../app/down-sheet/page.tsx","../app/defect-log/page.tsx","../app/fixed-repairs/page.tsx","../app/lists/page.tsx"]
  .map(path=>readFile(new URL(path,import.meta.url),"utf8")));
 for(const page of pages){assert.match(page,/href="\/lists"/);assert.match(page,/>FLEET CAMPAIGNS<\/a>/)}
 // the lists page marks itself current and links back to the other four
 const listsPage=pages.at(-1);
 assert.match(listsPage,/className="active" href="\/lists" aria-current="page"/);
 assert.match(listsPage,/<h1>Fleet Campaigns<\/h1>/);
 for(const href of ["/","/down-sheet","/defect-log","/fixed-repairs"]) assert.ok(listsPage.includes('href="'+href+'"'),href);
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
 assert.match(pages[0],/\{href:"\/lists",label:"FLEET CAMPAIGNS"\}/);
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
 const [page,css,intervals]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  readFile(new URL("../app/service-intervals.ts",import.meta.url),"utf8"),
 ]);
 assert.match(page,/MAINTENANCE TYPE/);
 assert.match(page,/MAINTENANCE INTERVALS/);
 assert.match(page,/INTERVAL NOT SET/);
 assert.match(page,/SERVICE_SEVERITY_LABELS\[service\.status\.severity\]/);
 assert.match(page,/HR PAST/);
 assert.match(page,/severity-"\+service\.status\.severity/);
 assert.match(page,/serviceIntervalStatus\(d,service\.kind,serviceIntervals\[service\.setting\],serviceIntervals\[service\.monthsSetting\]\)/);
 // each service takes an hour limit and a calendar limit, whichever comes first
 assert.match(page,/placeholder="Hours" aria-label=\{service\.label\+" interval in engine hours"\}/);
 assert.match(page,/placeholder="Months" aria-label=\{service\.label\+" interval in months"\}/);
 assert.match(page,/ENGINE HOURS AT COMPLETION/);
 assert.match(page,/CURRENT ENGINE HOURS/);
 assert.match(page,/MILES PER ENGINE HOUR/);
 assert.match(page,/METER RESET/);
 assert.match(page,/FLEET AVERAGE/);
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
 assert.match(page,/\{offCatalogIssue&&<option value=\{offCatalogIssue\}>\{offCatalogIssue\} \(as logged\)<\/option>\}/);
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
 assert.equal(steering.includes("Front air bag leak"),false,"Air System owns confirmed air-bag leaks");
 assert.equal(steering.includes("Rear air bag leak"),false,"Air System owns confirmed air-bag leaks");
 assert.equal(steering.includes("Air bag"),false,"the vague legacy choice is retired from new entries");
 for(const side of ["C/S","R/S"]){
  const note=defectNote("Suspension and Steering","Bus leaning - "+side);
  assert.match(note,/leaking air bag or a leveling-valve fault/i);
  assert.match(note,/edit this same defect/i);
  assert.match(note,/Air System/i);
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

test("no element in the Defect Log relies on the global bare header and footer styling",async()=>{
 const [logPage,logCss]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 // globals.css styles bare <header> as a 38px dark banner and bare <footer> as
 // a pill fixed to the bottom of the viewport. The editor's action bar had a
 // rule only inside the phone breakpoint, so on desktop it detached from the
 // modal, floated over the page and swallowed clicks; the grouped defect list
 // wore the dark banner. Every one of them now carries a class.
 assert.equal(/<header>|<footer>/.test(logPage),false,"no bare header or footer may come back");
 for(const className of ["log-editor-head","log-settings-head","quick-filter-head","mystery-head","grouped-defect-head","log-editor-actions","mystery-move-head","mystery-move-actions","part-prompt-head"])
  assert.ok(logPage.includes('className="'+className+'"'),className+" must be applied in the markup");

 // the element selectors still match these tags, so the global properties are
 // neutralised before each one is styled deliberately
 const reset=logCss.match(/\.log-editor-head,\.log-settings-head,\.quick-filter-head,\.mystery-head,\.grouped-defect-head,\.log-editor-actions,\.mystery-move-head,\.mystery-move-actions,\.part-prompt-head\{([^}]*)\}/);
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

test("mirror wording says who does the work, and the missing fixtures exist",()=>{
 const lights=REPAIR_OPTIONS["Lights and Fixtures"],body=REPAIR_OPTIONS.Bodywork;

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
 assert.equal(REPAIR_OPTIONS["Bus Controls"].some(option=>/back-?up alarm/i.test(option)),false);
 // it is not ADA equipment, so the chair mark must not land on it
 assert.equal(repairIssueDisplayLabel("Back-up alarm"),"Back-up alarm");

 // the mirrors that were missing
 assert.ok(lights.includes("Interior mirror"));
 assert.ok(lights.includes("Outside rear view mirror - C/S"));
 assert.ok(lights.includes("Outside rear view mirror - R/S"));

 // the dash cam is an onboard electronic system, so it sits with the others
 assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Dash cam"));
 assert.ok(REPAIR_OPTIONS["Tech Services"].includes("Camera / DVR system"));

 // lamps, not the stalk: Bus Controls keeps the turn signal switches
 assert.ok(lights.includes("Turn signal lamps"));
 assert.equal(lights.includes("Turn signals"),false);
 assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Operating Controls - Turn signals (steering column)"));
 assert.ok(REPAIR_OPTIONS["Bus Controls"].includes("Operating Controls - Turn signals (floor panel)"));

 // renames are scoped to their category, so a word means one thing per place
 for(const [category,issue,expected] of [
  ["Lights and Fixtures","Turn signals","Turn signal lamps"],
  ["Lights and Fixtures","Mirrors / fixtures","Mirror replacement (no body work)"],
  ["Bodywork","Mirror","Mirror damage (body shop)"],
  ["Bodywork","Glass / windshield","Glass / windshield cracked or shattered"],
 ]){
  const moved=migrateRepairIdentity(category,issue);
  assert.deepEqual(moved,{category,issue:expected},category+" / "+issue);
  assert.ok(REPAIR_OPTIONS[category].includes(moved.issue),expected+" must be pickable");
 }
 // a rename in one category must not reach the same word in another
 assert.deepEqual(migrateRepairIdentity("Lights and Fixtures","Headlights"),{category:"Lights and Fixtures",issue:"Headlights"});

 // Warning lights was too vague to diagnose from and left the picker. Every
 // system that lights one already has its own entry.
 assert.equal(lights.includes("Warning lights"),false);
 assert.ok(REPAIR_OPTIONS["Electrical / Multiplex"].includes("MOD light"));
 assert.ok(REPAIR_OPTIONS.Brakes.includes("ABS warning"));
 assert.ok(REPAIR_OPTIONS["Battery, Starting and Charging"].includes("Solid battery light"));
 // the records that used it keep their wording and still read correctly
 const [kept]=normalizeDefects([{id:"warn-1",category:"Lights and Fixtures",issue:"Warning lights",details:"Amber lamp on",state:"open",operability:"service"}]);
 assert.equal(kept.issue,"Warning lights");
 assert.equal(defectLabel(kept),"Lights and Fixtures — Warning lights — Amber lamp on");
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
 assert.match(logPage,/<optgroup label=\{repairGroupDisplayLabel\(group\)\}/);
 assert.match(logPage,/\{repairIssueDisplayLabel\(entry,group\)\}/);
 assert.match(logPage,/<option value=\{repair\} key=\{repair\}>\{repairIssueDisplayLabel\(repair\)\}/);
});

test("release safety keeps interval units and learned parts attached to the right identity",async()=>{
 const [page,backup,log,fixed,logCss,fixedCss]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/fleet-backup.ts",import.meta.url),"utf8"),
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
 assert.match(page,/setServiceIntervals\(readSavedServiceIntervals\(saved\.serviceIntervalsUnit,saved\.serviceIntervals\)\)/);
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
 assert.match(page,/parsed\.findingsMemory\)writeFindingsMemory\(localStorage,normalizeFindingsMemory\(parsed\.findingsMemory\)\)/);
 // and a restore brings them back, through the same normalizers the page uses
 assert.match(page,/parsed\.busLists\)localStorage\.setItem\("pace-bus-lists-v1",JSON\.stringify\(normalizeBusLists\(parsed\.busLists\)\)\)/);
 assert.match(page,/parsed\.busListTemplates\)localStorage\.setItem\("pace-bus-list-templates-v1"/);
 // A version 3 file has neither key, so restoring one must leave the campaigns
 // already on this device alone rather than clearing them.
 assert.equal(/busLists\?[^)]*\)\s*:\s*\[\]|setItem\("pace-bus-lists-v1",JSON\.stringify\(normalizeBusLists\(parsed\.busLists\|\|/.test(page),false);
 assert.match(backup,/partsMemory:readSavedValue\(storage,PARTS_MEMORY_STORAGE_KEY\)/);
 assert.match(page,/writePartsMemory\(localStorage,normalizePartsMemory\(parsed\.partsMemory\)\)/);
 for(const source of [log,fixed]){
  assert.match(source,/partsUsed:false,partNumber:"",partName:"",rememberScope:undefined|rememberScope:undefined[\s\S]{0,180}?partsUsed:false,partNumber:"",partName:""/);
 }
 assert.match(logCss,/\.defect-log-app \.parts-used-block/);
 assert.match(fixedCss,/\.fixed-repairs-app \.parts-used-block/);
 assert.doesNotMatch(logCss,/(?:\n|,)\.parts-(?:used|remembered)/);
 assert.doesNotMatch(fixedCss,/(?:\n|,)\.parts-(?:used|remembered)/);
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

test("a cloud bus row carries the map's fields and none of the Down Sheet's",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"cj",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 const bus={id:"local-1",n:"17549",l:"BAY 12",s:"shop",mechanic:"RM",bay12Watch:true,
  lastLocationChangeAt:"2026-08-30T09:00:00.000Z",lastStatusChangeAt:"2026-08-30T11:00:00.000Z",
  defects:[{id:"d1",category:"Engine",issue:"Overheating",state:"open"}],
  down:true,onDownSheet:true,downSheetReady:true,pendingRepair:"belt"};
 const row=busRow(bus,config,now);
 // The map may not assert whether a bus is down. The buses table has no column
 // for it either, so this is the same rule enforced twice.
 for(const held of ["down","onDownSheet","downSheetReady","defects","pendingRepair"]){
  assert.ok(!(held in row),held+" must not be a column on a bus row");
  assert.ok(!(held in row.map_fields),held+" must not ride along in map_fields");
 }
 // The local id is this device's name for the bus and means nothing elsewhere.
 assert.ok(!("id" in row.map_fields));
 assert.equal(row.fleet_number,"17549");
 assert.equal(row.map_fields.mechanic,"RM");
 assert.equal(row.map_fields.bay12Watch,true);
 // Initials are shouted everywhere in this app, so they are stored shouted.
 assert.equal(row.updated_by,"CJ");
 // A bus carries no updatedAt of its own. Sending "now" would mean the last
 // device to sync always wins, even holding week-old data, so the newest stamp
 // the record does keep is used instead.
 assert.equal(row.updated_at,"2026-08-30T11:00:00.000Z");
 assert.equal(busUpdatedAt({},"2026-01-01T00:00:00.000Z"),"2026-01-01T00:00:00.000Z");
 assert.equal(busRow({n:"  "},config,now),null);
 // A status outside the table's check constraint would be rejected by the
 // database; it becomes unknown here rather than failing the whole push.
 assert.equal(busRow({n:"1",s:"parked"},config,now).status,"unknown");
});

test("cloud rows come back as transfer payloads so the shipped merge rules apply unchanged",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 const cloudBus={id:"sender-1",n:"17549",l:"BAY 12",s:"shop",mechanic:"RM",
  lastStatusChangeAt:"2026-08-30T11:00:00.000Z",defects:[],down:false,onDownSheet:false,downSheetReady:false};
 const cloudDefect={id:"d1",category:"Engine",issue:"Overheating",state:"open",operability:"service",details:"runs hot",repairHours:1.5};
 const cloudEntry={id:"e1",busId:"SENDER-ID",busNumber:"17549",category:"Engine",repair:"Overheating",
  workflow:"Scheduled",priority:"High",updatedAt:"2026-08-30T10:00:00.000Z",timeEstimate:{repairMinutes:60}};

 // The receiving device knows this bus by a different id, has it somewhere
 // else, has its own defect on it, and has it on its own Down Sheet.
 const local=[{id:"other-1",n:"17549",l:"SOUTH LOT",s:"service",
  defects:[{id:"mine",category:"Air Leak",issue:"Leaking air bag - rear",state:"open"}],
  down:true,onDownSheet:true,downSheetReady:true,pendingRepair:""}];

 const afterMap=mergeFleetMap(local,fleetMapPayload([busRow(cloudBus,config,now)],now));
 const merged=afterMap.buses[0];
 assert.equal(merged.l,"BAY 12");
 // A cloud map arriving stale must not strip a badge off a bus whose Down Sheet
 // entry is sitting right there. This is the bug that cost a session once.
 assert.equal(merged.down,true);
 assert.equal(merged.downSheetReady,true);
 // Re-keying the bus would orphan the receiving device's own sheet entries.
 assert.equal(merged.id,"other-1");
 // Sending a map must never be a way of quietly clearing somebody's Defect Log.
 assert.equal(merged.defects.length,1);

 const afterDefects=mergeDefectLog(afterMap.buses,defectLogPayload([defectRow(cloudDefect,"17549",config,now)],now));
 const both=afterDefects.buses[0].defects;
 assert.deepEqual(both.map(defect=>defect.id).sort(),["d1","mine"]);
 // Fields with no column of their own ride in `detail` and come back intact,
 // so a defect gaining a field next month needs no database migration.
 assert.equal(both.find(defect=>defect.id==="d1").repairHours,1.5);

 const afterSheet=mergeDownSheet([],downSheetPayload([downSheetRow(cloudEntry,config,now)],now),afterDefects.buses);
 // The entry arrived carrying the SENDING device's busId, which means nothing
 // here; it is re-pointed by fleet number, the one name both devices agree on.
 assert.equal(afterSheet.entries[0].busId,"other-1");
 assert.equal(afterSheet.entries[0].busNumber,"17549");
 assert.deepEqual(afterSheet.entries[0].timeEstimate,{repairMinutes:60});
});

test("only rows that actually changed are sent again",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"iPad"});
 const now="2026-08-30T12:00:00.000Z";
 const bus={n:"17549",l:"BAY 12",s:"shop",lastStatusChangeAt:now};
 const first=changedRows([busRow(bus,config,now)],"fleet_number",{});
 assert.equal(first.changed.length,1);
 // A quiet shop costs one request that finds nothing, not a whole board upload.
 assert.equal(changedRows([busRow(bus,config,now)],"fleet_number",first.fingerprints).changed.length,0);
 const moved=changedRows([busRow({...bus,l:"WASH RACK"},config,now)],"fleet_number",first.fingerprints);
 assert.equal(moved.changed.length,1);
 // A row with no key cannot be upserted, so it is dropped rather than sent.
 assert.equal(changedRows([{location:"BAY 1"}],"fleet_number",{}).changed.length,0);
});

test("the shop cloud reports what happened and never offers a switch",async()=>{
 assert.equal(cloudStatusLabel({phase:"unconfigured",lastSyncedAt:"",lastError:"",pending:0}),"Not connected");
 assert.equal(cloudStatusLabel({phase:"offline",lastSyncedAt:"",lastError:"",pending:12}),"Offline — 12 changes waiting");
 assert.equal(cloudStatusLabel({phase:"offline",lastSyncedAt:"",lastError:"",pending:1}),"Offline — 1 change waiting");
 assert.equal(cloudStatusLabel({phase:"idle",lastSyncedAt:"",lastError:"",pending:0}),"Connected");
 // A dead network is normal and self-correcting; a broken query needs a person.
 // They are told apart so the words and the behaviour can differ.
 assert.equal(cloudFailurePhase(new Error("TypeError: Failed to fetch")),"offline");
 assert.equal(cloudFailurePhase(new Error("Network request timed out")),"offline");
 assert.equal(cloudFailurePhase(new Error("JWT expired")),"signed-out");
 assert.equal(cloudFailurePhase(new Error("Invalid login credentials")),"signed-out");
 assert.equal(cloudFailurePhase(new Error('column "x" does not exist')),"error");

 // Both files explain in prose why navigator.onLine is the wrong signal, so the
 // check must be that it is never CALLED, not that the words never appear.
 const code=text=>text.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/.*$/gm,"$1");
 const [source,control]=await Promise.all([
  readFile(new URL("../app/cloud-sync.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/cloud-sync-control.tsx",import.meta.url),"utf8"),
 ]);
 // It only says the wifi is associated. Shop wifi that is up but with no route
 // to the internet reports true, and a sync built on it insists it is online
 // while every push fails.
 assert.doesNotMatch(code(source),/navigator\.onLine/);
 assert.doesNotMatch(code(control),/navigator\.onLine/);
 // Nothing in this app may make signing in a condition of seeing the board.
 assert.doesNotMatch(code(control),/OFFLINE\s*\/\s*ONLINE/i);
});

test("connection details are checked where the message can name the field",async()=>{
 const good={url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"iPad"};
 assert.equal(cloudConfigProblem(normalizeCloudConfig(good)),"");
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,url:"https://supabase.com/dashboard"})),/Supabase Project URL/);
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,anonKey:"short"})),/too short/);
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,email:"nope"})),/sign-in email/);
 // A shared login means the database cannot say who changed a bus, so the row
 // has to. Attribution nobody filled in is worse than none: it looks answered.
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,initials:""})),/initials/);
 // A trailing slash on the project URL is the ordinary paste mistake.
 assert.equal(normalizeCloudConfig({...good,url:"https://demo.supabase.co/"}).url,"https://demo.supabase.co");

 const store=memoryStorage();
 assert.equal(writeCloudConfig(store,normalizeCloudConfig(good)),true);
 assert.equal(readCloudConfig(store).initials,"CJ");
 // A corrupt or absent store must never throw into the board.
 assert.equal(readCloudConfig(memoryStorage({"pace-cloud-config-v1":"{not json"})).url,"");
 assert.equal(readCloudConfig(memoryStorage()).url,"");
 assert.deepEqual(readSentFingerprints(memoryStorage({"pace-cloud-sent-v1":"[]"})),{});
});

test("the shop cloud never becomes a condition of using the board",async()=>{
 const [control,page,css]=await Promise.all([
  readFile(new URL("../app/cloud-sync-control.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
 ]);
 // It lives in Settings, mounted beside the other self-contained controls —
 // never in front of the map.
 assert.match(page,/<section className="settings-group cloud-sync-settings">/);
 assert.match(page,/<CloudSyncControl\/>/);
 assert.match(css,/\.cloud-status\{/);
 // Pushing reads what is ON DISK, not what the page is holding. writeFleetStorage
 // refuses writes it considers destructive and the board's save effect discards
 // that boolean, so pushing from React state would upload changes the device
 // itself declined to keep.
 assert.match(control,/readFleetStorage<.*>\(localStorage\)/);
 assert.doesNotMatch(control,/props\.buses|\{buses\}:/);
 // A pull merges; it never replaces.
 assert.match(control,/mergeFleetMap\(/);
 assert.match(control,/mergeDefectLog\(/);
 assert.match(control,/mergeDownSheet\(/);
 assert.doesNotMatch(control,/localStorage\.clear\(\)/);
});

test("work done without moving a bus is still detected and sent",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 const parked={n:"17549",l:"BAY 12",s:"shop",lastStatusChangeAt:"2026-08-30T09:00:00.000Z"};
 // Assigning a mechanic, ticking CHECK ENGINE and NO HORN and recording an
 // odometer reading changes none of the timestamps, because the bus never
 // moved and never changed status. All of it lives in map_fields.
 const worked={...parked,mechanic:"CJ",checkEngine:true,noHorn:true,
  odometerReadings:[{id:"o1",miles:412233,recordedAt:now,source:"manual"}]};
 const before=busRow(parked,config,now),after=busRow(worked,config,now);
 assert.equal(before.updated_at,after.updated_at);
 // Handing the key list to JSON.stringify as a replacer is a RECURSIVE property
 // allowlist, not a key ordering, so map_fields serialized as {} and an
 // afternoon's work hashed identically to no work at all — never sent, while
 // the status line read "Synced" with nothing waiting.
 assert.notEqual(rowFingerprint(before),rowFingerprint(after));
 const sent=changedRows([before],"fleet_number",{}).fingerprints;
 assert.equal(changedRows([after],"fleet_number",sent).changed.length,1);
 assert.equal(changedRows([before],"fleet_number",sent).changed.length,0);
 // Two rows holding the same data written in a different order must still
 // match, or every sweep would resend the whole board.
 const reordered=busRow({s:"shop",noHorn:true,n:"17549",checkEngine:true,mechanic:"CJ",l:"BAY 12",
  lastStatusChangeAt:"2026-08-30T09:00:00.000Z",
  odometerReadings:[{recordedAt:now,id:"o1",source:"manual",miles:412233}]},config,now);
 assert.equal(rowFingerprint(after),rowFingerprint(reordered));
});

test("one wrong clock cannot lock the shop out of its own rows",async()=>{
 const now="2026-08-30T12:00:00.000Z";
 // updated_at is what the database compares to drop an out-of-order push, so a
 // phone a year fast would stamp every bus a year ahead and silently discard
 // everyone else's work from then on, with nothing on screen to say why.
 assert.equal(busUpdatedAt({lastStatusChangeAt:"2027-08-30T12:00:00.000Z"},now),now);
 assert.equal(busUpdatedAt({lastStatusChangeAt:"2026-08-30T09:00:00.000Z"},now),"2026-08-30T09:00:00.000Z");
 assert.equal(busUpdatedAt({lastStatusChangeAt:"not a date"},now),now);
 assert.equal(busUpdatedAt({},now),now);
});

test("a bus that arrives from the cloud is a usable record, and its author survives",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 // A bus the receiving device has never seen is added by mergeFleetMap. Without
 // an id it cannot be edited, moved, or pointed at by a Down Sheet entry.
 const added=mergeFleetMap([],fleetMapPayload([{fleet_number:"20505",location:"SOUTH LOT",
  status:"service",map_fields:{mechanic:"RM"}}],now));
 assert.equal(added.buses.length,1);
 assert.ok(added.buses[0].id,"a bus arriving from the cloud needs an id of its own");
 assert.equal(added.buses[0].n,"20505");
 assert.equal(added.buses[0].mechanic,"RM");
 // Derived from the fleet number, so a second pull cannot mint a second id.
 assert.equal(added.buses[0].id,fleetMapPayload([{fleet_number:"20505"}],now).buses[0].id);

 // The row's updated_by names the device that last PUSHED the entry. Who last
 // worked the repair is a different fact, and overwriting one with the other
 // quietly reassigns somebody's work to whoever synced last.
 const entry={id:"e1",busId:"x",busNumber:"17549",category:"Engine",repair:"Overheating",updatedAt:now,updatedBy:"RM"};
 const row=downSheetRow(entry,config,now);
 assert.equal(row.updated_by,"CJ");
 assert.equal(downSheetPayload([row],now).entries[0].updatedBy,"RM");
});

test("a pull reads past one page and signing out is local to the device",async()=>{
 const client=await readFile(new URL("../app/cloud-client.ts",import.meta.url),"utf8");
 // PostgREST caps rows per request and the cap is silent — the response looks
 // complete. This fleet plus its defects can reach it in ordinary use.
 assert.match(client,/\.range\(/);
 assert.match(client,/page\.length<PAGE/);
 // The library default for signOut is global, which revokes every refresh token
 // on the account. The whole shop shares one login, so one person signing out
 // of one iPad would sign out every phone with no explanation on any of them.
 assert.match(client,/signOut\(\{scope:"local"\}\)/);
 assert.doesNotMatch(client,/auth\.signOut\(\)/);
});

test("the Down Sheet can move a bus, which is what makes a status change stick",async()=>{
 const { applyDownEntryToFleet } = await import("../app/down-sheet/down-sheet-sync.ts");
 const { RELOCATION_AREAS } = await import("../app/facility-areas.ts");
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
 const { moveOrSwapBuses } = await import("../app/smart-status.ts");
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
 const editor=await readFile(new URL("../app/down-sheet/down-sheet-editor.tsx",import.meta.url),"utf8");
 assert.match(editor,/MOVE BUS TO/);
 assert.doesNotMatch(editor,/Status only; location stays unchanged/);
});

test("the Defect Log can show the tracker's status colours, off by default",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/defect-log.css",import.meta.url),"utf8"),
 ]);
 // Off by default: more colour on a long list should be a choice, not something
 // that happens to people.
 assert.match(page,/statusColor:false/);
 assert.match(page,/statusColor=saved\.statusColor===true/);
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

test("COMPLETED TODAY is a view you can press, and it means today",async()=>{
 const [page,css]=await Promise.all([
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
 ]);
 // It counted the right thing and did nothing when pressed, so "what did we
 // actually finish today" could only be reached by turning on SHOW COMPLETED
 // and reading past the whole live sheet.
 assert.match(page,/<button type="button" className=\{"completed-today-tile"/);
 assert.match(page,/aria-pressed=\{fixedToday\}/);
 // Pressing replaces the view rather than adding to it: completed, and today.
 // A repair finished last week is not what the tile counts and must not appear.
 assert.match(page,/fixedToday\?entry\.workflow==="Completed"&&isToday\(entry\.completedAt\)/);
 // The shift filter and the search still apply on top of it.
 assert.match(page,/fixedToday\?[^;]*\)&&\(filter==="All"\|\|entry\.shift===filter\)&&matchesDownSheetSearch/);
 // Nothing to show and not already showing it means nothing to press.
 assert.match(page,/disabled=\{!counters\.completedToday&&!fixedToday\}/);
 // The tile has to keep looking like the tiles beside it, which are divs.
 assert.match(css,/\.down-summary>div,\.down-summary>button\{min-height:64px/);
 assert.match(css,/\.completed-today-tile\.active\{/);
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

test("OFF PROPERTY holds buses away at a vendor and nobody is stranded by it",async()=>{
 const { OFF_PROPERTY_CAPACITY, WAITING_CAPACITY, SECTION_SLOTS, RELOCATION_AREAS, sectionForLocation } = await import("../app/facility-areas.ts");
 const { statusForLocation } = await import("../app/smart-status.ts");
 const { migrateReducedCapacity } = await import("../app/facility-layout.ts");

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

test("bringing the shop's copy down sends this device's work first",async()=>{
 const control=await readFile(new URL("../app/cloud-sync-control.tsx",import.meta.url),"utf8");
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

test("a shared filter list collapses repeats and can go as a page",async()=>{
 const { quickFilterShareText, quickFilterShareHtml, quickFilterShareFilename, shareAreaLabel } =
  await import("../app/defect-log/quick-filter-share.ts");
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

test("duplicate defects merge into one record without losing anything",async()=>{
 const { mergeDuplicateDefects, matchingUnresolvedDefectId, defectFingerprint } =
  await import("../app/duplicate-defects.ts");
 const { applyDownEntryToFleet } = await import("../app/down-sheet/down-sheet-sync.ts");

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

test("a merge survives the shop cloud instead of being undone by it",async()=>{
 const { mergedAwayRows, withoutMergedAway, readMergedAway, writeMergedAway,
         defectLogPayload, changedRows } = await import("../app/cloud-sync.ts");

 // A push only ever sends what a bus still carries, so a record folded into
 // another is not deleted anywhere by merging alone. It stays live on the
 // server, the next pull reads it back, and mergeDefectLog takes incoming
 // records it does not have — so all 25 would return, on the very device that
 // ran the cleanup. Two things stop that, and both are tested here.
 const config={url:"https://x.supabase.co",anonKey:"k",email:"a@b.c",initials:"CM",deviceLabel:"Phone (CM)"};
 const merged={"downsheet-repair-scan-1787516955962-16":"2026-08-31T12:00:00.000Z"};

 // 1. The server is told the record is gone.
 const rows=mergedAwayRows(merged,config,"2026-08-31T12:00:00.000Z");
 assert.equal(rows.length,1);
 assert.equal(rows[0].defect_id,"downsheet-repair-scan-1787516955962-16");
 assert.equal(rows[0].deleted_at,"2026-08-31T12:00:00.000Z");
 // A tombstone carries no repair fields: writing them back while deleting the
 // row would let a stale copy overwrite the version that survived.
 assert.equal(rows[0].category,undefined);
 assert.equal(rows[0].issue,undefined);
 assert.equal(rows[0].details,undefined);
 // It still signs itself, so the board can say which device did it.
 assert.equal(rows[0].device_label,"Phone (CM)");

 // 2. And whatever arrives, this device refuses the record back — which covers
 // the second device that has not run the cleanup yet and keeps pushing its
 // own copy.
 const incoming={buses:[{n:"17543",defects:[
  {id:"downsheet-repair-scan-1787409639286-18"},
  {id:"downsheet-repair-scan-1787516955962-16"},
 ]}]};
 const filtered=withoutMergedAway(incoming,merged);
 assert.deepEqual(filtered.buses[0].defects.map(d=>d.id),["downsheet-repair-scan-1787409639286-18"]);
 // Nothing merged away means the payload is handed back untouched.
 assert.equal(withoutMergedAway(incoming,{}),incoming);
 assert.equal(withoutMergedAway(null,merged),null);

 // The ledger round-trips through storage, and survives junk.
 const store=new Map();
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
 writeMergedAway(storage,merged);
 assert.deepEqual(readMergedAway(storage),merged);
 store.set("pace-cloud-merged-v1","not json");
 assert.deepEqual(readMergedAway(storage),{});

 // A tombstone is a change like any other, so it is sent once and then stops
 // being sent — a merged board does not re-upload 25 deletions every sweep.
 const first=changedRows(rows,"defect_id",{});
 assert.equal(first.changed.length,1);
 assert.equal(changedRows(rows,"defect_id",first.fingerprints).changed.length,0);

 // And the pull payload builder is what the filter is applied to, so the shape
 // the filter expects is the shape it actually gets.
 const payload=defectLogPayload([{defect_id:"d1",fleet_number:"17543",category:"Cooling System",
  issue:"Overheating",details:"",state:"open",operability:"down",detail:{}}],"2026-08-31T12:00:00.000Z");
 assert.ok(Array.isArray(payload.buses),"the pull payload must expose buses for the filter to walk");
 assert.equal(withoutMergedAway(payload,{d1:"2026-08-31T12:00:00.000Z"}).buses[0].defects.length,0);
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

 const controls=REPAIR_OPTION_GROUPS["Bus Controls"];

 // A rack that comes back loose or missing an arm is a defect on a piece of
 // equipment, not body work and not scheduled maintenance.
 assert.deepEqual(controls["Bus Accessories"],
  ["Bike rack - arm replacement","Bike rack - loose / pivots"]);
 // The group is last, so the existing groups keep the order the shop knows.
 const groupNames=Object.keys(controls);
 assert.equal(groupNames[0],"Door, Ramp and Kneeler Failures");
 assert.equal(groupNames[groupNames.length-1],"Bus Accessories");

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
 for(const issue of ["Operating Controls - Front start button","Operating Controls - Rear start button",
                     "Bus Accessories - Bike rack - arm replacement","Bus Accessories - Bike rack - loose / pivots"])
  assert.equal(defaultDefectOperability("Bus Controls",issue),"service",issue+" must not down a bus");

 // Every new entry survives a round trip under its stored name.
 for(const issue of ["Operating Controls - Front start button","Operating Controls - Rear start button",
                     "Bus Accessories - Bike rack - arm replacement","Bus Accessories - Bike rack - loose / pivots"]){
  const [defect]=normalizeDefects([{id:"d",category:"Bus Controls",issue,details:"",state:"open",operability:"service"}]);
  assert.equal(defect.issue,issue,issue+" must not be rewritten on read");
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

test("a board that did not save says so instead of failing silently",async()=>{
 const {writeFleetStorageResult,writeDownSheetStorageResult,writeSetting,writeFleetStorage}=
  await import("../app/storage.ts");
 const [mapPage,downPage,logPage,alert]=await Promise.all([
  readFile(new URL("../app/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/defect-log/page.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/save-alert.tsx",import.meta.url),"utf8"),
 ]);

 const store=(seed={})=>{const map=new Map(Object.entries(seed));
  return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,v)}};
 const board=JSON.stringify({version:3,buses:[{id:"a",n:"1",defects:[]}]});
 const quota=()=>{const error=new Error("full");error.name="QuotaExceededError";throw error};

 // A healthy write is unchanged.
 assert.deepEqual(writeFleetStorageResult(store(),[{id:"a",n:"1",defects:[]}]),{ok:true});

 // WHY it failed has to travel with the failure, because the answers differ:
 // a full device needs room, an unreadable board must not be overwritten.
 const full={getItem:()=>board,setItem:quota};
 assert.equal(writeFleetStorageResult(full,[{id:"a",n:"1",defects:[]}]).reason,"storage-full");
 // The recovery snapshot is the FIRST write to hit a full device, so without
 // propagating the real cause this reported "no recovery copy" and sent
 // somebody looking for a corrupt store when what they needed was space.
 assert.notEqual(writeFleetStorageResult(full,[{id:"a",n:"1",defects:[]}]).reason,"no-snapshot");
 const unreadable={getItem:()=>"not json at all",setItem:()=>{}};
 assert.equal(writeFleetStorageResult(unreadable,[{id:"a",n:"1",defects:[]}]).reason,"unreadable");
 // A snapshot refused for its own reasons still blocks the write and says so.
 const snapshotOnly={getItem:()=>board,setItem:k=>{if(String(k).includes("recovery"))throw new Error("no")}};
 assert.equal(writeFleetStorageResult(snapshotOnly,[{id:"a",n:"1",defects:[]}]).reason,"no-snapshot");

 // The boolean form every existing caller uses is untouched.
 assert.equal(writeFleetStorage(store(),[{id:"a",n:"1",defects:[]}]),true);
 assert.equal(writeFleetStorage(full,[{id:"a",n:"1",defects:[]}]),false);

 // NOTHING MAY THROW. The Down Sheet's setItem was not wrapped at all, so a
 // full device threw out of its save effect and took the render with it.
 // Its own empty store, because `full` holds a FLEET payload and handing that
 // to the sheet reader correctly reports "unreadable" rather than "full".
 const fullSheet={getItem:()=>null,setItem:quota};
 assert.doesNotThrow(()=>writeDownSheetStorageResult(fullSheet,[]));
 assert.equal(writeDownSheetStorageResult(fullSheet,[]).reason,"storage-full");
 // And a sheet written by a newer build is refused rather than overwritten.
 assert.equal(writeDownSheetStorageResult({getItem:()=>"not json",setItem:()=>{}},[]).reason,"unreadable");
 assert.doesNotThrow(()=>writeSetting(full,"anything","x"));
 assert.equal(writeSetting(full,"anything","x").reason,"storage-full");
 assert.deepEqual(writeSetting(store(),"k","v"),{ok:true});

 // No surface may call setItem straight any more, EXCEPT inside a try that
 // already reports the failure. A raw call is how the editor got stuck open.
 for(const [name,source] of [["map",mapPage],["down sheet",downPage],["defect log",logPage]])
  for(const line of source.split("\n"))
   if(line.includes("localStorage.setItem(")&&!line.includes("try{"))
    assert.fail(name+" still writes storage unguarded: "+line.trim().slice(0,80));

 // The Facility Map's save effect discarded the result entirely — the specific
 // bug that let a full device look exactly like a successful save.
 assert.match(mapPage,/setSaveProblem\(writeFleetStorageResult\(localStorage,buses\)\.reason\|\|""\)/);
 // All three boards show the banner.
 for(const [name,source] of [["map",mapPage],["down sheet",downPage],["defect log",logPage]])
  assert.ok(source.includes("<SaveAlert reason={saveProblem}"),name+" must render the banner");

 // It is a banner, not an alert: an alert is dismissed by somebody busy, who
 // then keeps working on a board that is not being saved.
 assert.equal(/window\.alert|[^.]\balert\(/.test(alert),false,"the save alert must not use alert()");
 // It names an answer rather than an error code, and offers the way out.
 assert.ok(alert.includes("EXPORT A BACKUP NOW"));
 assert.match(alert,/THIS DEVICE IS FULL/);
 // Absent when there is nothing wrong, so a healthy board shows no chrome.
 assert.match(alert,/if\(!reason\)return null/);
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
 assert.match(logPage,/groupBorder:safeBorderColor\(saved\.groupBorder\)/);
 assert.ok(logPage.includes("USE THEME COLOR"),"there must be a way back to the theme colour");
});

test("a stored outline colour cannot inject anything into the style attribute",async()=>{
 // The value lands in an inline style, and a settings blob is a file somebody
 // can hand-edit and a sync can carry between devices, so it is validated
 // rather than trusted.
 const {safeBorderColor}=await import("../app/defect-log/defect-log-display-settings.ts");
 for(const good of ["#9ea6b4","#B3261E","#000000"]) assert.equal(safeBorderColor(good),good);
 for(const bad of ["red","red;background:url(x)","#fff","","javascript:alert(1)",null,undefined,42,{}])
  assert.equal(safeBorderColor(bad),"","must reject "+String(bad));
 assert.equal(safeBorderColor("  #9ea6b4  "),"#9ea6b4","surrounding space is trimmed, not rejected");
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
 assert.match(logPage,/<span className="log-meta">\{busOnDownSheet&&<b className="inline-ds-badge">DS<\/b>\}\{group\.records\.length>1&&<b className="defect-count-badge">/);
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

test("the deferred nav badge only pulses past 90 minutes, and the evening prompt opens from 8:30pm for anything over 60", async () => {
 const watch = await readFile(new URL("../app/deferred-watch.tsx", import.meta.url), "utf8");
 assert.match(watch, /const OVERDUE_MINUTES=90/);
 assert.match(watch, /const REVIEW_MINUTES=60/);
 assert.match(watch, /const REVIEW_HOUR=20,REVIEW_MINUTE=30/);
 assert.match(watch, /minutes>=OVERDUE_MINUTES/);
 assert.match(watch, /minutes<REVIEW_MINUTES/);
 // Every page drops in both pieces, so the alert reaches wherever the app is
 // actually open rather than only the page that happened to log the defect.
 for (const file of ["../app/page.tsx", "../app/down-sheet/page.tsx", "../app/defect-log/page.tsx", "../app/fixed-repairs/page.tsx", "../app/lists/page.tsx"]) {
  const source = await readFile(new URL(file, import.meta.url), "utf8");
  assert.match(source, /<DeferredNavBadge\/>/, file + " is missing the deferred nav badge");
  assert.match(source, /<DeferredReviewPrompt\/>/, file + " is missing the evening review prompt");
 }
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
