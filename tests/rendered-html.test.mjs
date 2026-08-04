import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { hasBusNumberConflict, hasLocationConflict, validateBusUpdate } from "../app/fleet-validation.ts";
import { applyDownEntryToFleet } from "../app/down-sheet/down-sheet-sync.ts";
import { downSheetCountLabel, selectedDownSheetBusIds } from "../app/down-sheet-counter.ts";
import { syncTrackerDownSheetSelection } from "../app/down-sheet/tracker-membership-sync.ts";
import { moveOrSwapBuses, roadServiceStatus, statusForLocation } from "../app/smart-status.ts";
import { bulkAreaAvailability, bulkRelocateBuses } from "../app/bulk-relocation.ts";
import { applyDefectToBuses } from "../app/bulk-defects.ts";
import { reassignBusPair } from "../app/pair-reassignment.ts";
import { REPAIR_OPTION_GROUPS, REPAIR_OPTIONS, defectFromDraft, defectSummary } from "../app/repair-catalog.ts";
import { sectionBusCount } from "../app/section-count.ts";
import { migrateReducedCapacity, ROAD_CAPACITY, WEST_CAPACITY } from "../app/facility-layout.ts";

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

test("server-renders the live fleet command dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();

  assert.match(html, /<title>Pace Maintenance Bus Tracking System<\/title>/i);
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
  const west = section(html, '<section class="west lot panel">', '<footer class="command-bar">');
  assert.equal((west.match(/class="spot"/g) ?? []).length, 40);
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
  assert.match(css, /@keyframes locate-pulse/);
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
  assert.match(page, /Tap to move an existing bus here/);
  assert.match(page, /New buses can only be created in Settings/);
  assert.match(page, /ACTIVE TRACKER FLEET/);
  assert.match(page, /CREATE NEW BUS/);
  assert.match(page, /Map spaces only relocate buses that already exist/);
  assert.match(page, /SWITCH \/ REASSIGN/);
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
  assert.match(page, /checkEngine:boolean;noHorn:boolean;badRampKneeler:boolean/);
  assert.match(page, /checkEngine:Boolean\(bus\.checkEngine\)/);
  assert.match(page, /checked=\{d\.checkEngine\}/);
  assert.match(page, /checked=\{d\.noHorn\}/);
  assert.match(page, /checked=\{d\.badRampKneeler\}/);
  assert.match(page, /BAD RAMP\/KNEELER \(ADA\)/);
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
  assert.match(html, /SETTINGS/);
  assert.match(html, /QUICK NOTES/);
  const source = await readFile(new URL("../app/down-sheet/page.tsx", import.meta.url), "utf8");
  assert.match(source, /knownActive/);
  assert.match(source, /entriesFromFleet\(nextFleet\)\.filter/);
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
  const added = syncTrackerDownSheetSelection(null, bus, "2026-08-02T12:00:00.000Z");
  assert.equal(added.entries.length, 1);
  assert.equal(added.entries[0].busId, bus.id);
  assert.equal(added.entries[0].workflow, "Scheduled");
  assert.equal(added.entries[0].shift, "2nd");
  const removed = syncTrackerDownSheetSelection(JSON.stringify(added), { ...bus, down: false }, "2026-08-02T13:00:00.000Z");
  assert.equal(removed.entries[0].workflow, "Completed");
  assert.equal(removed.entries[0].completedAt, "2026-08-02T13:00:00.000Z");
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
  assert.equal(updated[0].s, "shop");
  assert.equal(updated[0].down, true);
  assert.equal(updated[0].mechanic, "JD");
  assert.match(updated[0].pendingRepair, /Brakes.*ABS warning.*Intermittent warning light/);
  assert.equal(updated[0].defects.length, 1);
  assert.equal(updated[0].defects[0].category, "Brakes");
  assert.equal(updated[0].defects[0].state, "open");

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
  assert.equal(completed[0].s, "service");
  assert.equal(completed[0].down, false);
  assert.equal(completed[0].pendingRepair, "");
  assert.equal(completed[0].defects.length, 1);
  assert.equal(completed[0].defects[0].state, "completed");
  assert.equal(completed[0].mechanic, "JD");
});
test("smart status returns repaired and defect-carrying buses to the road correctly", () => {
  const minor = [{ id: "d1", category: "A/C and HVAC", issue: "No cooling", details: "", operability: "service", state: "open" }];
  const downing = [{ id: "d2", category: "Brakes", issue: "Air brake fault", details: "", operability: "down", state: "open" }];
  const completed = minor.map(defect => ({ ...defect, state: "completed" }));
  assert.equal(statusForLocation("road-4", "shop", { defects: minor, pendingRepair: "" }), "defect");
  assert.equal(statusForLocation("road-4", "shop", { defects: downing, pendingRepair: "" }), "out");
  assert.equal(statusForLocation("road-4", "shop", { defects: completed, pendingRepair: "" }), "service");
  assert.equal(statusForLocation("road-4", "out", { defects: [], pendingRepair: "" }), "out");
  assert.equal(statusForLocation("bay-3", "out", { defects: downing, pendingRepair: "" }), "shop");
  assert.equal(statusForLocation("east-1", "defect", { defects: minor, pendingRepair: "" }), "out");
  assert.equal(statusForLocation("west-4", "service", { defects: minor, pendingRepair: "" }), "out");
  assert.equal(statusForLocation("east-1", "service", { defects: [], pendingRepair: "" }), "service");
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
  assert.equal(updated.fleet.find(bus => bus.id === "b").s, "shop");
  assert.equal(updated.fleet.find(bus => bus.id === "b").defects.length, 2);
  assert.equal(updated.fleet.find(bus => bus.id === "c").defects.length, 1);
  assert.equal(updated.fleet.find(bus => bus.id === "d").s, "defect");
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
  assert.deepEqual(draft, { id: "manual-test", category: "Miscellaneous", issue: "Manual entry", details: "Driver reports intermittent rattle", operability: "service", state: "open" });
  assert.match(defectSummary([draft]), /Manual entry.*Driver reports intermittent rattle/);
});
test("repair catalog exposes robust category and issue choices", () => {
  assert.equal(Object.keys(REPAIR_OPTIONS).length, 21);
  assert.ok(Object.values(REPAIR_OPTIONS).every(options => options.length >= 5));
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
  const twoDefects = [
    { id: "one", category: "Electrical / Multiplex", issue: "Horn", details: "", operability: "service", state: "open" },
    { id: "two", category: "Tech Services", issue: "Farebox", details: "Reader offline", operability: "service", state: "open" },
    { id: "three", category: "Electrical / Multiplex", issue: "Horn", details: "Intermittent", operability: "service", state: "open" },
  ];
  assert.equal(twoDefects.length, 3);
  assert.match(defectSummary(twoDefects), /Horn.*Farebox.*Reader offline.*Horn.*Intermittent/);
});