import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasBusNumberConflict, hasLocationConflict, validateBusUpdate } from "../app/fleet-validation.ts";
import { applyDownEntryToFleet } from "../app/down-sheet/down-sheet-sync.ts";
import { downSheetCountLabel, selectedDownSheetBusIds } from "../app/down-sheet-counter.ts";
import { syncTrackerDownSheetSelection } from "../app/down-sheet/tracker-membership-sync.ts";
import { clearDownSheetState, readDownSheetClearSnapshot, restoreDownSheetState } from "../app/down-sheet/down-sheet-clear.ts";
import { moveOrSwapBuses, roadServiceStatus, statusForLocation } from "../app/smart-status.ts";
import { bulkAreaAvailability, bulkRelocateBuses } from "../app/bulk-relocation.ts";
import { applyDefectToBuses } from "../app/bulk-defects.ts";
import { reassignBusPair } from "../app/pair-reassignment.ts";
import { REPAIR_OPTION_GROUPS, REPAIR_OPTIONS, defaultDefectOperability, defectFromDraft, defectLabel, defectSummary } from "../app/repair-catalog.ts";
import { sectionBusCount } from "../app/section-count.ts";
import { migrateReducedCapacity, ROAD_CAPACITY, WEST_CAPACITY } from "../app/facility-layout.ts";
import { candidateBusNumbers, resolveBusNumber } from "../app/bus-number-resolver.ts";
import { planOperatorCommand } from "../app/operator-engine.ts";
import { applyOperatorBatch } from "../app/operator-batch.ts";
import { operationalUpdateAt, stampOperationalChange } from "../app/operational-time.ts";
import { formatRepairTime, normalizeRepairTimeEstimate, repairTimeTotal, recommendedRepairMinutes } from "../app/down-sheet/repair-time-estimates.ts";
import { mergeReviewedRows, reviewScannedRows } from "../app/down-sheet/down-sheet-scan-import.ts";
import { saveDefectLogRecord } from "../app/defect-log/defect-log-sync.ts";

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
  assert.equal(operationalUpdateAt(statusUpdated), "2026-08-05T12:00:00.000Z");

  const locationUpdated = stampOperationalChange(statusUpdated, { ...statusUpdated, l: "road-0" }, "2026-08-05T13:00:00.000Z");
  assert.equal(locationUpdated.lastLocationChangeAt, "2026-08-05T13:00:00.000Z");
  assert.equal(locationUpdated.lastStatusChangeAt, "2026-08-05T12:00:00.000Z");
  assert.equal(operationalUpdateAt(locationUpdated), "2026-08-05T13:00:00.000Z");
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
  assert.match(html, />AC BUSES</);
  assert.match(html, />MYSTERY BUSES</);
  assert.match(html, /DOWN SHEET/);
  assert.match(html, />PENDING REPAIR</);
  assert.match(html, />UNSCHEDULED WORK</);
  assert.match(html, />LOCATE</);
  assert.match(html, />REFRESH</);
  assert.match(html, /> SETTINGS</);
  assert.match(html, /AI OPERATOR/);
  const commandBar=html.slice(html.indexOf('<footer class="command-bar">'),html.indexOf('</footer>')+9);
  assert.ok(commandBar.indexOf('class="locate-command"')<commandBar.indexOf('class="command-highlights"'));
  assert.ok(commandBar.indexOf('class="settings-command"')<commandBar.indexOf('class="ai-operator-command"'));
  assert.match(commandBar, /RAMP\/KNEELER[\s\S]*ADA/);
  assert.doesNotMatch(commandBar, /BAD RAMP\/KNEELER/);
  assert.doesNotMatch(commandBar, /<small>PACE<\/small>/);
  assert.match(html, /data-bus-id="b0" data-status="service" data-pending="false"/);
  assert.match(html, /data-bus-id="b20" data-status="out" data-pending="false"/);
  assert.match(html, /IN SERVICE WITH DEFECTS/);
  assert.match(html, /WORK IN PROGRESS/);
  assert.match(html, /DECOMMISSIONED \/ DOWN INDEFINITELY/);
  assert.doesNotMatch(html, /TOW \/ STAGING/);
  assert.match(html, /--status-service:#1764d8/);
  assert.match(html, /--status-defect:#159447/);
  assert.match(html, /--status-shop:#efa400/);
  assert.match(html, /--status-out:#c91f27/);
  assert.match(html, /--status-decommissioned:#343a40/);
  assert.doesNotMatch(html, /TOTAL SPACES:/);
  assert.doesNotMatch(html, /SHOP BAYS \(DIAGONAL - 12 TOTAL\)/);
  const bays = section(html, "SHOP BAYS (DIAGONAL)", "PIT");
  assert.equal((bays.match(/class="bay"/g) ?? []).length, 9);
  assert.equal((bays.match(/class="bay-placeholder"/g) ?? []).length, 1);
  assert.match(bays, /NEEDS REASSIGNMENT/);

  const service = section(html, "SERVICE DETAIL AREA (SINGLE FILE)", "PAINT BOOTH");
  assert.equal((service.match(/class="spot"/g) ?? []).length, 8);
  const wall = section(html, "SHOP WALL (SINGLE FILE)", "MAIN GARAGE (BAYS 1-12)");
  assert.equal((wall.match(/class="spot"/g) ?? []).length, 8);
  const pit = section(html, "PIT", "BRAKE TEST");
  assert.equal((pit.match(/class="spot"/g) ?? []).length, 2);
  const brake = section(html, "BRAKE TEST", "TOW STAGING");
  assert.equal((brake.match(/class="spot"/g) ?? []).length, 2);
  const east = section(html, '<section class="east lot">', '<section class="road">');
  assert.equal((east.match(/class="spot"/g) ?? []).length, 18);
  const road = section(html, '<section class="road">', '<section class="wall">');
  assert.equal((road.match(/class="spot"/g) ?? []).length, 75);
  const west = section(html, '<section class="west lot panel">', '<section class="waiting panel">');
  assert.equal((west.match(/class="spot"/g) ?? []).length, 40);
  const waiting = section(html, '<section class="waiting panel">', '<footer class="command-bar">');
  assert.equal((waiting.match(/class="spot"/g) ?? []).length, 98);
  assert.match(waiting, /WAITING AREA/);
  assert.match(commandBar, /WAITING[\s\S]*<b>0<\/b>/);
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
  const [page, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  for (const theme of ["Default", "Terminal", "Black / Dark", "Midnight", "Tactical"]) {
    assert.match(page, new RegExp(`label:\"${theme.replace("/", "\\/")}\"`));
  }
  for (const control of ["Page Background", "Panel Background", "Parking Spaces", "Command Bar", "SECTION BACKGROUNDS", "BUS STATUS COLORS"]) {
    assert.match(page, new RegExp(control));
  }
  assert.match(page, /garageSpecial:string;garageFrame:string/);
  assert.match(page, /Bays 11 & 12 Parking Spaces/);
  assert.match(page, /Garage Border, Top & Row Banners/);
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
  assert.match(css, /\.app\.highlight-unscheduled/);
  assert.match(page, /data-unscheduled=\{bus\.outReason==="Unscheduled"\}/);
  assert.match(page, /data-ac=\{Boolean\(bus\.acIssue\)/);
  assert.match(page, /data-downsheet=\{Boolean\(bus\.onDownSheet\)\}/);
  assert.match(page, /downSheetBusIds\.length/);
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
  assert.match(page, /reassignBusPair\(buses,withSummary as B,otherId,targetSlots\)/);
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
  assert.match(page, /"BRAKE TEST":slots\("brake",2\)/);
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
  assert.match(page, /checkEngine:boolean;checkTransmission:boolean;noHorn:boolean;badRampKneeler:boolean/);
  assert.match(page, /checkEngine:Boolean\(bus\.checkEngine\)/);
  assert.match(page, /checkTransmission:Boolean\(bus\.checkTransmission\)/);
  assert.match(page, /checked=\{d\.checkEngine\}/);
  assert.match(page, /checked=\{d\.checkTransmission\}/);
  assert.match(page, /CHECK TRANSMISSION LIGHT/);
  assert.match(page, /checked=\{d\.noHorn\}/);
  assert.match(page, /checked=\{d\.badRampKneeler\}/);
  assert.match(css, /\.modal>\.form\{[^}]*align-content:start;grid-auto-rows:max-content/);
  assert.match(css, /\.defect-workbench\{min-height:88px/);
  assert.match(page, /ramp-kneeler-command/);
  assert.match(page, /<span>RAMP\/KNEELER<\/span><small>ADA/);
  assert.match(css, /\.ramp-kneeler-command\{/);
  assert.match(page, /CHECK ENGINES/);
  assert.match(page, /data-check-engine=\{bus\.checkEngine\}/);
  assert.match(page, /data-bad-ramp=\{bus\.badRampKneeler\}/);
  assert.match(page, /function MultiLocateModal/);
  assert.match(page, /Array\(Math\.max\(7-initial\.length,0\)\)\.fill\(\"\"\)/);
  assert.match(page, /\+ ADD FIELD/);
  assert.match(page, /MOVE ALL SELECTED BUSES/);
  assert.match(page, /MOVE ALL TO AREA/);
  assert.match(page, /ADD SAME DEFECT TO ALL/);
  assert.match(page, /APPLY DEFECT TO/);
  assert.match(page, /applyDefectToBuses\(buses,multiLocateIds,defect\)/);
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
  assert.match(page, /CHOOSE THE AMEREX SYSTEM/);

  assert.match(page, /CHOOSE THE STATUS OR CODE/);
  assert.match(page, /Choose Fire Suppression or Gas Concentration/);
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
  assert.match(page, /CHOOSE THE AMEREX SYSTEM/);
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
  assert.match(css, /max-height:calc\(100dvh - 16px\)/);
  const commandZ = Number(css.match(/\.command-bar\{[^}]*z-index:(\d+)/)?.[1] || 0);
  const modalZ = Number(css.match(/modal-scroll-locked \.shade\{z-index:(\d+)/)?.[1] || 0);
  assert.ok(modalZ > commandZ, `Bus editor layer ${modalZ} must exceed command strip ${commandZ}`);
  assert.match(page, /pace-south-fleet-board-backup/);
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
  assert.equal(statusForLocation("garage-4", "shop", { defects: downing, pendingRepair: "" }), "out");
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
  assert.equal(Object.keys(REPAIR_OPTIONS).length, 22);
  assert.ok(Object.entries(REPAIR_OPTIONS).filter(([category]) => category !== "Interior Cleaning").every(([, options]) => options.length >= 5));
  assert.ok(REPAIR_OPTIONS["A/C and HVAC"].includes("No cooling"));
  assert.ok(REPAIR_OPTIONS["Brakes"].includes("ABS warning"));
  assert.ok(REPAIR_OPTIONS["Inspection"].includes("B-12"));
  assert.ok(REPAIR_OPTIONS["Electrical / Multiplex"].includes("Horn"));
  assert.deepEqual(REPAIR_OPTIONS["Tech Services"], ["Farebox", "Ventra", "MDT Screen", "Destination Sign", "Other Tech Services"]);
  assert.deepEqual(Object.keys(REPAIR_OPTION_GROUPS.Amerex), ["Fire Suppression", "Gas Concentration"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Fire Suppression"], ["Trouble Mod 1 Roof 1", "Trouble Mod 2 Roof 1", "Other Fire Suppression Trouble"]);
  assert.deepEqual(REPAIR_OPTION_GROUPS.Amerex["Gas Concentration"], ["Trace", "Significant Leak", "Other Gas Concentration Alert"]);
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Fire Suppression - Trouble Mod 1 Roof 1"));
  assert.ok(REPAIR_OPTIONS.Amerex.includes("Gas Concentration - Significant Leak"));
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
  assert.match(page, /singleTapEmptySpaces,busDisplay,confirmMoves,confirmDefects\}\)\)/);
  assert.match(page, /theme:themeName,singleTapEmptySpaces,busDisplay,confirmMoves,confirmDefects\}/);
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
  assert.equal(normalizeRepairTimeEstimate(undefined, "No Start", "Cranks / no start").diagnosticMinutes, 90);
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

  const page = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  const scanner = await readFile(new URL("../app/down-sheet/down-sheet-scanner.tsx", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/down-sheet-scan/route.ts", import.meta.url), "utf8");
  assert.ok(page.includes("SCAN SHEET"));
  assert.ok(page.includes("UNDO IMPORT"));
  assert.ok(scanner.includes("TAKE PHOTO"));
  assert.ok(scanner.includes("UPLOAD FILE"));
  assert.ok(scanner.includes("IMPORT APPROVED"));
  assert.ok(scanner.includes("READING PAGE"));
  assert.ok(scanner.includes("scanReadyPhoto"));
  assert.ok(scanner.includes("700*1024"));
  assert.ok(route.includes("OPENAI_API_KEY"));
  assert.ok(route.includes('import("cloudflare:workers")'));
  assert.ok(route.includes('"gpt-5.4-mini"'));
  assert.ok(route.includes("store:false"));
  assert.ok(route.includes('"Cache-Control":"no-store"'));
  assert.ok(route.includes("OpenAI API billing or credits"));
  assert.ok(route.includes("billing_not_active"));
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
  assert.equal(downToGarage.find(bus => bus.id === "down").s, "out");
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
  const response = await render("/defect-log");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Real-Time Defect Log/);
});
