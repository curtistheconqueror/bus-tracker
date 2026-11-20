/* The read half of the agent surface: the Shop Cloud's rows, answered through
   the app's own functions.

   WHAT AN AGENT IS, HERE. Not a driver of the app — a PEER DEVICE that happens
   to have no screen. Offline-first is this project's premise: the records live
   in each device's LocalStorage and the Shop Cloud is a copy going somewhere
   else. So a server can never read "the" board; it reads what phones have
   pushed, which is why every answer below carries `asOf`. An agent that says
   "17549 is in the wash bay" without saying when that was last heard is worse
   than one that says nothing, because a foreman will walk there.

   NOTHING HERE COMPUTES A RULE. The rows are turned into the app's own shapes
   by the same three payload functions a device's pull uses, merged by the same
   three merge functions, and then asked the same questions the buttons ask —
   `mysteryBusIds`, `locationLabel`, `buildFleetStatusReport`, `isUnresolved`.
   docs/roadmap/ai-agent.md put the reason better than this comment can: a tool
   that does its own arithmetic is a second implementation of a rule, and this
   project has already paid for that twice — the five copies of the location
   table, and the two road-call records that had drifted apart.

   READ-ONLY BY SURFACE. There is no write function in this file and no write
   tool in the protocol beside it. That is deliberate and it is the whole of
   Phase 1's safety story: the credential the route holds could write, because
   the shop's RLS grants insert and update to anything authenticated, so the
   boundary is the absence of a code path rather than a policy. Tightening the
   policies is a migration against the database the shop is running on, and
   that is Curtis's call, every time. */

import {defectLogPayload,downSheetPayload,fleetMapPayload,type CloudRow} from "../cloud/cloud-sync.ts";
import {mergeDefectLog,mergeDownSheet,mergeFleetMap} from "../storage/section-transfer.ts";
import {reconcileDownSheetMembership} from "../down-sheet/down-sheet-counter.ts";
import {locationLabel} from "../fleet/location-label.ts";
import {bay12AwarenessBusIds,mysteryBusIds} from "../fleet/mystery-buses.ts";
import {defectLabel,isUnresolved,normalizeDefects} from "../defects/repair-catalog.ts";
import {buildFleetStatusReport} from "../reports/fleet-status-report.ts";

export type AgentBus={id:string;n:string;l?:string;s?:string;down?:boolean;defects?:unknown[];[key:string]:unknown};
export type AgentEntry={id?:string;busId?:string;busNumber?:string;workflow?:string;[key:string]:unknown};

export type AgentBoard={
 buses:AgentBus[];
 entries:AgentEntry[];
 /* The newest stamp any row carries, which is the newest moment the shop can be
    said to have reported. Not the time of this request — see fetchedAt. */
 asOf:string;
 /* When the server read the cloud. The gap between this and asOf is how stale
    the shop's own copy is, and it is a legitimate answer on its own: a quiet
    morning and a garage with no wifi look identical from here. */
 fetchedAt:string;
 counts:{buses:number;defects:number;entries:number};
};

function clean(value:unknown){return String(value??"").trim()}

/* The newest `updated_at` across every row we were handed.

   `updated_at` is the DEVICE's clock, not the server's — the schema says so and
   deliberately has no trigger keeping it current, because a server-side now()
   would make every push look like the newest one. So this is "the newest moment
   a phone claims to have acted", which is exactly the thing an agent should
   quote, and it can legitimately be behind `synced_at`. */
export function newestStamp(groups:CloudRow[][]){
 let newest="";
 for(const rows of groups)for(const row of rows){
  const at=clean(row.updated_at);
  if(at&&at>newest)newest=at;
 }
 return newest;
}

/* The cloud's rows as a board, by the app's path and in the app's order.

   The order is not a preference. `mergeDefectLog` matches an incoming bus
   against the local ones and files anything it cannot match under `unmatched`,
   so defects merged onto an empty board would ALL be discarded. The map has to
   be in place first. `cloud-live.ts` does it in this order for the same reason;
   this is that sequence with an empty receiver instead of a device's own board. */
export function boardFromRows(busRows:CloudRow[],defectRows:CloudRow[],entryRows:CloudRow[],fetchedAt:string):AgentBoard{
 const map=mergeFleetMap<AgentBus>([],fleetMapPayload(busRows,fetchedAt) as never);
 const withDefects=mergeDefectLog(map.buses,defectLogPayload(defectRows,fetchedAt) as never);
 const sheet=mergeDownSheet<AgentEntry>([],downSheetPayload(entryRows,fetchedAt) as never,withDefects.buses as never);

 /* The sheet decides the badge and the map reads it back — the schema enforces
    this by having no `down` column at all, and the merge strips the field on
    the way in. So `down` has to be derived here, from the entries, exactly as a
    device derives it on a pull. An agent reporting a bus as down off a map
    field would be asserting the one thing the map is not allowed to say. */
 const activeBusIds=sheet.entries.filter(entry=>clean(entry.workflow)!=="Completed").map(entry=>clean(entry.busId));
 const buses=reconcileDownSheetMembership(withDefects.buses as never,activeBusIds) as AgentBus[];

 return {
  buses,
  entries:sheet.entries,
  asOf:newestStamp([busRows,defectRows,entryRows]),
  fetchedAt,
  counts:{buses:busRows.length,defects:defectRows.length,entries:entryRows.length},
 };
}

/* Found by FLEET NUMBER and never by id.

   A bus id is device-local — `section-transfer.ts` says so in its own words,
   "two devices set up separately give the same bus different ids" — and the ids
   on this board were minted by `fleetMapPayload` for the cloud's own rows. They
   mean nothing to any phone. 17549 is what a person says and what the cloud
   keys `buses` on, so it is the only address this surface offers.

   Exact match on the trimmed number, deliberately: a tool that guesses which
   bus was meant is a tool that eventually moves the wrong one. The caller gets
   `found:false` and can ask again. */
export function findBus(board:AgentBoard,fleetNumber:string){
 const wanted=clean(fleetNumber);
 if(!wanted)return undefined;
 return board.buses.find(bus=>clean(bus.n)===wanted);
}

function defectsOf(bus:AgentBus|undefined){
 return normalizeDefects(Array.isArray(bus?.defects)?bus.defects as never[]:[]);
}

/* Where a bus is, in the words a person says.

   Through `locationLabel`, never by reading the slot id or matching a prefix.
   Matching `garage-` returns "Main Garage" for all 84 spaces including TROUBLE
   BAY 11 and 12, which the move editor treats as separate destinations; five
   copies of that table existed and all five had the bug. The raw slot comes
   back too, under `locationId`, because an agent may need to pass it to a
   future move tool — but the words are what it should say out loud. */
export function locateBus(board:AgentBoard,fleetNumber:string){
 const bus=findBus(board,fleetNumber);
 if(!bus)return {found:false as const,fleetNumber:clean(fleetNumber),asOf:board.asOf};
 const defects=defectsOf(bus);
 return {
  found:true as const,
  fleetNumber:bus.n,
  location:locationLabel(bus.l),
  locationId:clean(bus.l),
  status:clean(bus.s)||"unknown",
  onDownSheet:Boolean(bus.down),
  openDefects:defects.filter(isUnresolved).length,
  asOf:board.asOf,
 };
}

/* What is wrong with one bus.

   Normalized before being labelled, which is not ceremony: `defectLabel` reads
   fields a thin record does not have, and a record that came off a hand-typed
   sheet is as thin as records get.

   NORMALIZING IS ALSO WHAT APPLIES THE CATALOG'S RENAMES, so the category and
   issue reported here are the wording the shop uses now rather than the wording
   the record was saved under. The database keeps what was written — the schema
   says so, and rewriting it would throw away the one thing that makes the
   renames safe — so a defect logged as `Air System — Leak` is still stored that
   way and reads back as Pneumatic System. That matters for an agent more than
   for a screen: a bot reporting a category nobody in the shop has said for a
   year sounds like it is describing a different bus.

   There is deliberately no second `migrateRepairIdentity` call here. There was
   one, briefly, after a bad probe convinced me normalization left the wording
   alone — the probe used a pair that is not a rename at all. A mutation of that
   line changed no output, which is how the dead code was found. */
export function busDefects(board:AgentBoard,fleetNumber:string,includeCompleted=false){
 const bus=findBus(board,fleetNumber);
 if(!bus)return {found:false as const,fleetNumber:clean(fleetNumber),defects:[],asOf:board.asOf};
 const all=defectsOf(bus);
 const wanted=includeCompleted?all:all.filter(isUnresolved);
 return {
  found:true as const,
  fleetNumber:bus.n,
  location:locationLabel(bus.l),
  onDownSheet:Boolean(bus.down),
  defects:wanted.map(defect=>{
   const stored=defect as Record<string,unknown>;
   return {
   label:defectLabel(defect),
   category:clean(stored.category),
   issue:clean(stored.issue),
   state:clean(stored.state),
   open:isUnresolved(defect),
   loggedAt:clean(stored.createdAt),
   updatedAt:clean(stored.updatedAt),
   };
  }),
  asOf:board.asOf,
 };
}

export type SheetFilter={section?:string;shift?:string;includeCompleted?:boolean};

/* The Down Sheet as the shop's copy has it.

   Completed rows are left out by default because the question somebody asks an
   agent is almost always "what is down now". They are one flag away for the
   caller that wants the history. */
export function downSheetView(board:AgentBoard,filter:SheetFilter={}){
 const section=clean(filter.section).toLowerCase();
 const shift=clean(filter.shift).toLowerCase();
 const rows=board.entries.filter(entry=>{
  if(!filter.includeCompleted&&clean(entry.workflow)==="Completed")return false;
  if(section&&clean(entry.section).toLowerCase()!==section)return false;
  if(shift&&clean(entry.shift).toLowerCase()!==shift)return false;
  return true;
 });
 return {
  entries:rows.map(entry=>{
   const bus=board.buses.find(candidate=>candidate.id===clean(entry.busId));
   return {
    fleetNumber:clean(entry.busNumber)||clean(bus?.n),
    location:bus?locationLabel(bus.l):"",
    category:clean(entry.category),
    repair:clean(entry.repair),
    section:clean(entry.section),
    workflow:clean(entry.workflow),
    shift:clean(entry.shift),
    priority:clean(entry.priority),
    assignedTo:clean(entry.assignedTo),
    createdAt:clean(entry.createdAt),
    updatedAt:clean(entry.updatedAt),
   };
  }),
  total:rows.length,
  asOf:board.asOf,
 };
}

/* The counts, through the report the superintendent already gets.

   Counted by BUS rather than by row inside `buildFleetStatusReport`, because a
   bus written up three times is one bus that cannot go out and reporting 3
   would overstate the shortage — the one direction a maintenance number must
   never be wrong in. Reusing it means an agent and the printed report can never
   disagree about how many buses are down. */
export function fleetCounts(board:AgentBoard,now:string){
 const report=buildFleetStatusReport(board.buses as never,board.entries as never,now);
 return {
  fleetSize:board.buses.length,
  /* The report's own four, under the report's own names. `downed` excludes
     buses on the sheet only for an inspection, and `softDowned` is kept apart
     rather than folded in because Curtis asked for exactly that: the shortage
     a reader can still put on a run has to be distinguishable from the
     shortage they cannot. `onSheet` sits beside them because the two disagree
     the moment an inspection lands, and a foreman who can see 32 rows needs to
     see why the answer is 30. */
  downed:report.downed,
  softDowned:report.softDowned,
  downedTotal:report.downedTotal,
  onSheet:report.onSheet,
  inspections:report.inspections,
  onDownSheetBadge:board.buses.filter(bus=>Boolean(bus.down)).length,
  withOpenDefects:board.buses.filter(bus=>defectsOf(bus).some(isUnresolved)).length,
  openDefects:board.buses.reduce((total,bus)=>total+defectsOf(bus).filter(isUnresolved).length,0),
  asOf:board.asOf,
 };
}

/* The question Curtis asked for by name: what the sheet says against what is
   actually on the map.

   A MYSTERY BUS is parked in a working area — a bay, the pit, the wash, body,
   paint — and is on nobody's sheet. Somebody put it there for a reason and the
   reason was never written down, which is the discrepancy worth a phone call.
   `isMysteryArea` owns which areas count and `mysteryBusIds` owns the rule;
   this function only turns ids back into the numbers and words a person uses.

   BAY 12 AWARENESS is the narrower cousin: a bus flagged for watching, holding
   active defects, not on the sheet. Kept separate rather than folded in,
   because they are two different conversations. */
export function discrepancies(board:AgentBoard){
 const activeBusIds=board.entries
  .filter(entry=>clean(entry.workflow)!=="Completed")
  .map(entry=>clean(entry.busId));
 const describe=(ids:string[])=>ids.map(id=>{
  const bus=board.buses.find(candidate=>candidate.id===id);
  return {
   fleetNumber:clean(bus?.n),
   location:bus?locationLabel(bus.l):"",
   locationId:clean(bus?.l),
   status:clean(bus?.s)||"unknown",
   openDefects:defectsOf(bus).filter(isUnresolved).length,
  };
 }).filter(row=>row.fleetNumber);
 const mystery=describe(mysteryBusIds(board.buses as never,activeBusIds));
 const bay12=describe(bay12AwarenessBusIds(board.buses as never,activeBusIds));
 return {
  mysteryBuses:mystery,
  mysteryCount:mystery.length,
  bay12Awareness:bay12,
  bay12Count:bay12.length,
  asOf:board.asOf,
 };
}
