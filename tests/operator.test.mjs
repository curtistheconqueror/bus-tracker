/* the AI operator: what a command plans and what a batch applies. */

import assert from "node:assert/strict";
import test from "node:test";
import { applyOperatorBatch, defectSummary, planOperatorCommand } from "./helpers/modules.mjs";

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

test("the operator reads 'remove the last scan sweep' as the batch it is",async()=>{
 const STAMP="2026-09-06T23:30:14.612Z";
 const sweep=(bus,n)=>({id:"sweep-"+bus+"-power-"+n+"-abc",category:"Tech Services",issue:"Farebox - No power",details:"",operability:"service",state:"open",createdAt:STAMP,source:"defect-log",reportedBy:"EJ"});
 const fleet=[];
 for(let i=0;i<23;i++)fleet.push({id:"b"+i,n:String(17500+i),s:"service",l:"road-"+i,down:false,pendingRepair:"",defects:[sweep(17500+i,i)]});
 fleet[0].defects.push({...sweep(17500,99),id:"sweep-17500-coin-99-zzz"}); // 24 records, 23 buses — the real Sep 6 shape
 const areas=[{name:"IN SERVICE / ON ROAD",slots:fleet.map(bus=>bus.l)}];

 // The exact wording from the chat, and the count is checked against the batch.
 const exact=planOperatorCommand("Remove the most recent 24 entries from the Defect log",fleet,areas);
 assert.equal(exact.kind,"plan");
 assert.equal(exact.plan.kind,"removeScanBatch");
 assert.equal(exact.plan.requiresConfirmation,true);
 assert.equal(exact.plan.batchKey,STAMP);
 assert.equal(exact.plan.count,24);
 assert.equal(exact.plan.busCount,23);
 assert.match(exact.plan.summary,/Remove the 24 Tech Services records SCAN SWEEP filed at .* from 23 buses/);
 assert.match(exact.plan.summary,/shop cloud is told/);

 // No count, but the scan is named.
 for(const wording of ["Undo the last scan sweep","take the last sweep out of the defect log","delete the sweep that was scanned by mistake","undo the sweep import"]){
  const plan=planOperatorCommand(wording,fleet,areas);
  assert.equal(plan.kind,"plan",wording);
  assert.equal(plan.plan.kind,"removeScanBatch",wording);
 }
 // A wrong count is corrected, never silently rounded to the batch.
 const wrong=planOperatorCommand("Remove the last 20 entries from the defect log",fleet,areas);
 assert.equal(wrong.kind,"message");
 assert.match(wrong.message,/filed 24 records, not 20/);
 // "Undo the most recent change" names no sweep and no count: that is the log's
 // own UNDO LAST, and the operator says so — and says what it CAN do.
 const vague=planOperatorCommand("Undo most recent change to defect log",fleet,areas);
 assert.equal(vague.kind,"message");
 assert.match(vague.message,/UNDO LAST/);
 assert.match(vague.message,/24 records on 23 buses/);
 // Putting it back.
 for(const wording of ["Put the scan sweep back","restore the last removed sweep","undo the removal of the sweep","bring the sweep back into the defect log"]){
  const plan=planOperatorCommand(wording,fleet,areas);
  assert.equal(plan.kind,"plan",wording);
  assert.equal(plan.plan.kind,"restoreScanBatch",wording);
 }
 // A bus named is a bus command, not a batch command — it falls through to the
 // per-bus paths, which have never removed a record and still do not.
 const perBus=planOperatorCommand("Remove bus 24 from the defect log",fleet,areas);
 assert.notEqual(perBus.kind==="plan"&&perBus.plan.kind,"removeScanBatch");
 const fiveDigit=planOperatorCommand("remove 17505 from the defect log",fleet,areas);
 assert.notEqual(fiveDigit.kind==="plan"&&fiveDigit.plan.kind,"removeScanBatch");
 // Nothing to remove, said plainly.
 const none=planOperatorCommand("Undo the last scan sweep",[{id:"a",n:"17525",s:"service",l:"road-0",down:false,pendingRepair:"",defects:[]}],areas);
 assert.equal(none.kind,"message");
 assert.match(none.message,/no scan sweep/);
 // Every record already worked on: nothing untouched to take out.
 const worked=fleet.map(bus=>({...bus,defects:bus.defects.map(d=>({...d,state:"in-progress"}))}));
 const nothing=planOperatorCommand("Undo the last scan sweep",worked,areas);
 assert.equal(nothing.kind,"message");
 assert.match(nothing.message,/worked on since/);
 // The older move and status paths are untouched by the new branch.
 assert.equal(planOperatorCommand("Move bus 05 to CNG East",fleet,[{name:"CNG EAST LOT",slots:["east-1"]}]).plan?.kind,"move");
});

test("the AI operator keeps hold of the bus, and answers a question instead of offering to cause it",async()=>{
 const {planOperatorCommand,isQuestion}=await import("../src/lib/operator/operator-engine.ts");
 const areas=[{name:"CNG East",slots:["east-1","east-2"]},{name:"Main Garage",slots:["garage-1","garage-2"]}];
 const oil={id:"d1",category:"Engine",issue:"Oil leak",details:"",operability:"service",state:"open"};
 const fleet=[
  {id:"b1",n:"17559",s:"defect",l:"garage-1",down:true,pendingRepair:"",defects:[oil]},
  {id:"b2",n:"17560",s:"service",l:"garage-2",down:false,pendingRepair:"",defects:[]},
 ];

 /* THE EXACT CONVERSATION Curtis screenshotted.
    "Does bus 17559 have an oil leak in it defects or is it on the down sheet"
    -> "Bus 17559 is already marked on the down sheet."
    "Why?" -> "Tell me which bus you mean." */
 const first=planOperatorCommand("Does bus 17559 have an oil leak in it defects or is it on the down sheet",fleet,areas);
 assert.equal(first.kind,"message");
 assert.match(first.message,/17559/);
 assert.ok(first.context?.lastBusId,"the answer now says which bus it was about");
 assert.equal(first.context.lastBusId,"b1");

 const why=planOperatorCommand("Why?",fleet,areas,first.context);
 assert.equal(why.kind,"message");
 assert.equal(/Tell me which bus you mean/.test(why.message),false,"the follow-up must not lose the subject");
 assert.match(why.message,/17559/,"it is still about the same bus");
 assert.match(why.message,/down sheet/i,"and it explains the answer it just gave");
 assert.equal(why.context.lastBusId,"b1","and stays available for the turn after that");

 /* A QUESTION MUST NEVER BECOME A WRITE. Asked with the SINGULAR "defect",
    this used to return a PLAN offering to ADD Engine - Oil leak to the bus: a
    question about what is true, answered with an offer to make it true.

    The plural missed the branch altogether, because \bdefect\b does not match
    "defects" - the trailing boundary fails on the s - so Curtis's own wording
    fell to the generic "I need an action". Both spellings are tested here
    because they used to fail in two different ways. */
 for(const wording of ["Does bus 17559 have an oil leak defect?","Does bus 17559 have an oil leak in its defects?"]){
  const probe=planOperatorCommand(wording,fleet,areas);
  assert.equal(probe.kind,"message","a question returns an answer, never a plan: "+wording);
  assert.match(probe.message,/^Yes\./,"read off the record: "+wording);
 }

 const askedAbsent=planOperatorCommand("Does bus 17560 have an oil leak in its defects?",fleet,areas);
 assert.equal(askedAbsent.kind,"message");
 assert.match(askedAbsent.message,/^No\./);

 /* Told rather than asked still plans, or the Operator would stop working. */
 const told=planOperatorCommand("Add an oil leak defect to bus 17560",fleet,areas);
 assert.equal(told.kind,"plan");
 assert.equal(told.plan.kind,"defect");
 assert.match(told.plan.summary,/Add Engine/);

 /* And the down-sheet branch the same way. */
 const shouldI=planOperatorCommand("Should I take bus 17559 off the down sheet?",fleet,areas);
 assert.equal(shouldI.kind,"message","an interrogative must not build a removal");
 const doIt=planOperatorCommand("Take bus 17559 off the down sheet",fleet,areas);
 assert.equal(doIt.kind,"plan");
 assert.equal(doIt.plan.kind,"downsheet");

 /* isQuestion reads the "?" off the RAW command, because normalized() strips
    every non-alphanumeric character before the rest of the engine sees it. */
 assert.equal(isQuestion("does bus 25 have a horn defect"),true);
 assert.equal(isQuestion("move bus 25 to CNG East?"),true,"a trailing question mark is enough");
 assert.equal(isQuestion("move bus 25 to CNG East"),false);
 assert.equal(isQuestion("add a horn defect to bus 25"),false);

 /* INSPECT now reads bus.defects. It never did, so the one intent whose job is
    to describe a bus could not say what was wrong with it. */
 const look=planOperatorCommand("what is the status of bus 17559",fleet,areas);
 assert.equal(look.plan.kind,"inspect");
 assert.match(look.plan.response,/Open repairs: Engine \u2014 Oil leak/);
 const clean=planOperatorCommand("what is the status of bus 17560",fleet,areas);
 assert.match(clean.plan.response,/No open repairs are recorded/);

 /* THE CARRY IS SCOPED. A sentence that names no bus and refers to nothing
    still asks - silently acting on a bus from five turns ago is worse than
    asking, and this is the line that keeps the fix from becoming a hazard. */
 const orphan=planOperatorCommand("mark it down",fleet,areas,null);
 assert.match(orphan.message,/Tell me which bus you mean/,"with no context there is nothing to carry");
 const vague=planOperatorCommand("how many buses are sitting",fleet,areas,first.context);
 assert.notEqual(vague.kind,"message","a fleet-wide question is not hijacked by the remembered bus");
});

test("the hand-typed spoken shorthand reaches one repair each, or it is not there", async () => {
 /* Curtis asked for a short way to say the run box entry. Everything else the
    operator matches on is DERIVED from the catalog, so this one list is the
    only place a wording can rot: a rename, a retirement, or a second repair
    whose name contains the same phrase all turn a shorthand into a guess.

    The module drops a row in each of those cases rather than guessing. This
    asserts the two halves of that from outside: every row still reaches the
    repair it names, and every phrase still names exactly one wording in the
    whole catalog. A second run-box repair fails here, which is the point —
    somebody then chooses the words instead of the list order choosing for
    them. */
 const {SPOKEN_SHORTHAND,planOperatorCommand}=await import("../src/lib/operator/operator-engine.ts");
 const {REPAIR_OPTIONS}=await import("../src/lib/defects/repair-catalog.ts");
 assert.ok(SPOKEN_SHORTHAND.length>0,"the list is the thing under test");
 const fold=value=>String(value).toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");
 const everyWording=Object.values(REPAIR_OPTIONS).flat();
 const fleet=[{id:"b1",n:"17559",l:"garage-1",s:"defect",defects:[],pendingRepair:""}];
 for(const row of SPOKEN_SHORTHAND){
  assert.ok((REPAIR_OPTIONS[row.category]||[]).includes(row.issue),
   row.category+" / "+row.issue+" is no longer in the catalog, so \""+row.say+"\" points at nothing");
  const reach=everyWording.filter(issue=>fold(issue).includes(fold(row.say)));
  assert.deepEqual(reach,[row.issue],
   "\""+row.say+"\" must name exactly one catalog wording — it reaches "+reach.length);
  const planned=planOperatorCommand("bus 17559 defect "+row.say,fleet,[]);
  assert.equal(planned.kind,"plan","\""+row.say+"\" did not reach a repair at all");
  assert.equal(planned.plan.kind,"defect");
  assert.equal(planned.plan.defect.category,row.category);
  assert.equal(planned.plan.defect.issue,row.issue);
  /* And the full wording still wins when it is spoken, because the list is
     sorted longest key first. A shorthand that shadowed the real name would
     be a regression nobody would notice from the screen. */
  const bare=row.issue.split(" - ").slice(1).join(" - ")||row.issue;
  const full=planOperatorCommand("bus 17559 defect "+bare,fleet,[]);
  assert.equal(full.plan?.defect?.issue,row.issue,"the full wording must still resolve");
 }
});

test("the operator moves buses however the command is phrased, and CNG West marks them Out of Service",async()=>{
 const {planOperatorCommand}=await import("../src/lib/operator/operator-engine.ts");
 const {applyOperatorBatch}=await import("../src/lib/operator/operator-batch.ts");
 const nums=["17563","17534","18507","17514","18508","17558","17544","15514","17560","17540","18505","17509"];
 const fleet=nums.map((n,i)=>({id:"b"+n,n,s:"service",l:"road-"+(i+1),down:false,pendingRepair:"",defects:[]}));
 const areas=[{name:"CNG WEST LOT",slots:Array.from({length:20},(_,i)=>"west-"+(i+1))},{name:"IN SERVICE / ON ROAD",slots:fleet.map(bus=>bus.l)}];
 /* Curtis's own two messages, word for word. "Moves" was not a move word -
    \bmove\b fails on the s - so both fell to the status path and the operator
    asked "Tell me which status to apply to those buses." */
 for(const text of [
  "Moves buses 17563, 34, 18507,17514, 18508, 17558, 44, 15514, 17560, 17540, and 18505 to CNG West",
  "Moves buses 17563, 34, 18507,17514, 18508, 17558, 44, 15514, 17560, 17540, and 18505 to CNG West. Status down out if service",
  /* And the other ways he says it: buses first, the verb after; no verb at all. */
  "Buses 17563, 34, 18507 move to CNG West",
  "Buses 17563 34 18507 to CNG West",
  "Move buses 17563, 34, 18507 to CNG West",
  "Send buses 17563 and 18507 to CNG West",
  "Put 17563, 18507 in CNG West",
 ]){
  const result=planOperatorCommand(text,fleet,areas);
  assert.equal(result.kind,"plan",text);
  assert.equal(result.plan.kind,"batch",text);
  assert.ok(result.plan.items.every(item=>item.areaName==="CNG WEST LOT"),text);
  assert.doesNotMatch(result.plan.summary,/which status/i);
 }
 /* NOTHING ASKS FOR A STATUS. A bus parked in CNG East or West is Out of
    Service by the app's own rule (statusForLocation), as it is on the map. */
 const plan=planOperatorCommand("Moves buses 17563, 34, 18507,17514, 18508, 17558, 44, 15514, 17560, 17540, and 18505 to CNG West",fleet,areas).plan;
 assert.equal(plan.items.length,11);
 const moved=applyOperatorBatch(fleet,plan.items,areas).fleet.filter(bus=>bus.l.startsWith("west-"));
 assert.equal(moved.length,11);
 assert.deepEqual([...new Set(moved.map(bus=>bus.s))],["out"],"every bus moved to CNG West is Out of Service");
 /* A QUESTION IS NEVER READ AS A MOVE, and the Down Sheet is not a place. */
 assert.equal(planOperatorCommand("Is bus 17563 in CNG West?",fleet,areas).kind,"message");
 assert.equal(planOperatorCommand("Which buses moved today?",fleet,areas).kind,"message","past tense is how a question asks");
 assert.equal(planOperatorCommand("Add bus 17563 to the down sheet",fleet,areas).plan?.kind,"downsheet");
 /* "down" is not a status word: "which buses are down?" must not turn into
    an offer to set one. */
 assert.doesNotMatch(planOperatorCommand("Which buses are down?",fleet,areas).message||"",/should be set to/);

 /* A COLD READ of the first version found these turned into moves: a
    question using "moving", what/how questions with no question mark, a bus
    number then "to" somewhere in a sentence, defect notes naming the WAITING
    AREA, and a status with a "belongs to". None of them is a move. */
 const wider=[...areas,{name:"WAITING AREA",slots:["waiting-1"]},{name:"MAIN GARAGE (BAYS 1-10)",slots:["garage-1"]}];
 for(const text of [
  "Is 17563 moving to CNG West?",
  "Moving 17563 to CNG West?",
  "What happened to 17563 in CNG West",
  "How did 17563 get to CNG West",
  "17563 was moved to CNG West yesterday",
  "compare 17563 to CNG West",
  "Bus 17563 defect horn, waiting on parts to come in",
  "Bus 17563 horn defect, needs to go to the garage",
  "Set 17563 out of service, it belongs to CNG West",
  "17563 to 18507 in CNG West",
 ]){
  const result=planOperatorCommand(text,fleet,wider);
  assert.ok(!(result.kind==="plan"&&(result.plan.kind==="move"||(result.plan.kind==="batch"&&result.plan.items.some(item=>item.areaName)))),"not a move: "+text);
 }
 /* The publisher's check: "Who moves this bus?" brought up a move proposal -
    with a bus remembered from the last turn, which is how it was asked. A
    move word in a question is not a move, in any form, and the cold read of
    the first fix supplied most of these. */
 const isMove=result=>result.kind==="plan"&&(result.plan.kind==="move"||result.plan.kind==="bulkMove"||(result.plan.kind==="batch"&&result.plan.items.some(item=>item.areaName)));
 /* a question proposes no change at all - no move, and no status either */
 const isWrite=result=>result.kind==="plan"&&["move","bulkMove","batch"].includes(result.plan.kind);
 const remembered={busIds:[fleet[0].id],busNumbers:["17563"],label:"17563",lastBusId:fleet[0].id};
 for(const text of ["Who moves this bus?","Who moves it to CNG West?","so who moves it to cng west","Who can move it to CNG West?","Who moves bus 17563?","who moves bus 17563 to CNG West","What moves 17563 to CNG West","Which crew moves 17563 to CNG West?","So who moves bus 17563 to CNG West","OK who moves bus 17563 to CNG West","Tell me who moves bus 17563 to CNG West","I need to know who moves bus 17563 to CNG West","Who can move bus 17563 to CNG West?","Who should move bus 17563 to CNG West","Why did you move bus 17563 to CNG West?","Did anyone move bus 17563 to CNG West?","What shift moved bus 17563 to CNG West","Who moves 17563 to CNG West; who moves 18507 to CNG West","Which crew moves 17563 to CNG West, moves 18507 to CNG West",
  /* the second cold read: a status named in the question, "add", contractions,
     and a move told not to happen */
  "Who sends 17563 and 18507 to CNG West out of service","Who moves it to CNG West out of service","Who can add 17563 to CNG West","Why add 17563 to CNG West","Didn't you move 17563 to CNG West","Doesn't someone move 17563 to CNG West","Don't move 17563 to CNG West","Do not move 17563 to CNG West"]){
  assert.ok(!isWrite(planOperatorCommand(text,fleet,wider)),"not a change: "+text);
  assert.ok(!isWrite(planOperatorCommand(text,fleet,wider,remembered)),"not a change, with a bus remembered: "+text);
 }
 /* and a question naming several buses is told so, not asked for a status */
 assert.match(planOperatorCommand("Who sends 17563 and 18507 to CNG West",fleet,wider).message,/reads as a question, so nothing was prepared\. To move 17563, 18507, say it as an instruction, such as “Move 17563, 18507 to CNG WEST LOT\.”/);
 assert.match(planOperatorCommand("Who sends 17563 and 18507 to the waiting area",fleet,wider).message,/to WAITING AREA\.”/);
 /* while a request is still a request, as it always was - and a question
    mark that dictation adds to a command does not make it a question. */
 for(const text of ["Can you move bus 17563 to CNG West?","Could you move bus 17563 to CNG West","Move bus 17563 to CNG West?","Moves bus 17563 to CNG West?","So move bus 17563 to CNG West","Please move bus 17563 to CNG West",
  /* and the dictated commands the second cold read found a broader rule
     refusing: a question word opening a clause of time or place, a question
     in its own sentence first, and the polite openings */
  "When you get a chance move 17563 to CNG West","When you can, move 17563 and 18507 to CNG West","Where is 17563? Move it to CNG West","How about you move 17563 to CNG West","Ok so what I need: move 17563 to CNG West","Is it possible to move 17563 to CNG West","Are you able to move 17563 to CNG West","Do me a favor and move 17563 to CNG West","Have someone move 17563 to CNG West"]){
  assert.ok(isMove(planOperatorCommand(text,fleet,wider)),"a move: "+text);
 }

 /* And ", shifting the rest later" no longer splits a working move in two. */
 assert.equal(planOperatorCommand("Move 17563 and 18507 to CNG West, shifting the rest later",fleet,areas).kind,"plan");
});
