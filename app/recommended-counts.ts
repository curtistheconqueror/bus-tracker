import {isDownSheetRecommended,isUnresolved,normalizeDefects,recommendedMinutesElapsed,type StructuredDefect} from "./repair-catalog.ts";
import {downSheetDefectIds} from "./down-sheet/down-sheet-sync.ts";
import type {DefectLogDownEntry,DefectLogFleetBus} from "./defect-log/defect-log-sync.ts";

/* The buses somebody has PUT FORWARD for the Down Sheet, and nobody has ruled
   on yet.

   THE THIRD BOARD, and a different kind of thing from the two above it. Curtis
   drew the line himself: a deferred bus is "one that's not on the down sheet
   that I'm trying to fix", where the distinction with a recommendation is that
   "that bus could be in that status for a while, which is fine." A deferral is
   a clock running. A recommendation is a question waiting for an answer, and
   waiting is not a failure — which is why nothing here goes overdue and nothing
   flashes.

   Split out of the board the way deferred-counts.ts was split out of
   deferred-watch.tsx, and for the same reason: this is a .ts file the test
   runner can drive against a fleet directly, where a .tsx file would need its
   JSX stripped first.

   COVERED IS PER REPAIR, NOT PER BUS, and that is a correction.

   This board answers what the sheet is not covering, and it used to answer it
   at the grain of the BUS: any bus with an active entry was dropped whole. The
   sheet carries one row per bus, so a bus already on it for one thing could
   never raise a second. Curtis found it on 17555 — on the sheet for an air-tank
   row, a ramp that would not lock recommended underneath it, and the board
   silently empty. His reasoning is the rule: "Doesn't mean the guy that's doing
   the inspection is gonna come across the defect."

   He put it in terms of inspections. It is not only inspections — 17555's own
   row reads as a FAULT to downSheetScheduledOnly, because real complaints are
   written in it — and a rule about inspections would have left that exact bus
   broken. What is true of the inspector is true of whoever has the bus for any
   other reason: the row they are working is not this repair.

   So a recommendation is dropped only when the sheet is writing to THAT
   repair. The stamp still stays on the record either way — putting a repair on
   the sheet does not clear its recommendation, and repair-catalog.ts refuses to
   erase who asked for it and when.

   This is now a finer grain than isHeldDeferred uses one board up, which still
   asks per bus. That is deliberate and it is the one thing to be careful of
   here: the two boards no longer mean the same thing by "on the sheet". A
   deferral is a fact about the BUS — it is held back or it is not — while a
   recommendation is a fact about one REPAIR, so each is asked at the grain of
   the thing it describes. */

/* The repairs the sheet is ALREADY writing to, across every active entry.

   Asked through downSheetDefectIds, the sheet's own answer and the same one the
   Defect Log's badge uses, rather than a second rule beside it. An entry names
   its repairs four ways — a stated defectId, the ids it mints per repair card,
   and the record a card adopts — and reading only the stated id would call a
   repair uncovered while the sheet is writing to it. Hand-typed entries state
   no defectId at all. */
export function downSheetCoveredDefectIds(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const covered=new Set<string>();
 for(const entry of downEntries){
  if(entry.workflow==="Completed")continue;
  const bus=fleet.find(item=>item.id===entry.busId);
  if(!bus)continue;
  /* Normalized because that is the contract downSheetDefectIds is written
     against, and the ids it returns have to be the ids the records carry. */
  for(const id of downSheetDefectIds(entry,normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)))covered.add(id);
 }
 return covered;
}

/* One row per RECOMMENDED DEFECT paired with its bus, so a bus carrying two
   recommendations appears twice. Anything counting BUSES has to deduplicate —
   the same trap the deferred badge fell into, where one bus held on two repairs
   counted as two. */
export function recommendedRows(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const covered=downSheetCoveredDefectIds(fleet,downEntries);
 const rows:{bus:DefectLogFleetBus;defect:StructuredDefect}[]=[];
 for(const bus of fleet){
  for(const defect of bus.defects||[])
   /* isUnresolved is what keeps the count honest. Curtis: the number "needs to
      be in sync" — fix the repair the recommendation was made about, or delete
      the record, and this list is one shorter without anybody tidying it. */
   if(isUnresolved(defect)&&isDownSheetRecommended(defect)&&!covered.has(defect.id))rows.push({bus,defect});
 }
 return rows;
}

/* The same rows grouped by bus, longest-waiting first.

   Oldest first rather than by bus number, because the only question this board
   answers is "what has been waiting on me", and the answer is useless sorted
   alphabetically. A recommendation with no timestamp — one stamped before the
   field carried an `at`, or by a device with no clock — sorts last rather than
   first, so a missing time can never masquerade as the oldest thing here. */
export function recommendedBuses(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const byBus=new Map<string,{bus:DefectLogFleetBus;defects:StructuredDefect[]}>();
 for(const row of recommendedRows(fleet,downEntries)){
  const held=byBus.get(row.bus.id);
  if(held)held.defects.push(row.defect);
  else byBus.set(row.bus.id,{bus:row.bus,defects:[row.defect]});
 }
 return [...byBus.values()].map(group=>({
  ...group,
  /* Sorted inside the bus too, so the card's lead repair is the one that has
     been waiting longest rather than whichever the fleet happens to list first. */
  defects:[...group.defects].sort((a,b)=>recommendedRank(a)-recommendedRank(b)),
 })).sort((a,b)=>recommendedRank(a.defects[0])-recommendedRank(b.defects[0]));
}

/* Milliseconds since the epoch, or Infinity for a recommendation with no
   usable time on it. Kept here rather than inlined twice so the board and the
   quick-filter drawer cannot order the same list differently. */
export function recommendedRank(defect:StructuredDefect|undefined){
 const at=Date.parse(String(defect?.downSheetRecommendation?.at||""));
 return Number.isNaN(at)?Infinity:at;
}

/* What the board's counter prints: BUSES, deduplicated, never rows. */
export function recommendedBusCount(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 return new Set(recommendedRows(fleet,downEntries).map(row=>row.bus.id)).size;
}

/* The longest a repair on this bus has been waiting, in minutes, or null when
   none of them carries a time. */
export function busRecommendedMinutes(defects:StructuredDefect[],now=new Date()){
 const minutes=defects.map(defect=>recommendedMinutesElapsed(defect,now)).filter((value):value is number=>value!==null);
 return minutes.length?Math.max(...minutes):null;
}
