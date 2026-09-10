import {isDownSheetRecommended,isUnresolved,recommendedMinutesElapsed,type StructuredDefect} from "./repair-catalog.ts";
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

   ALREADY ON THE SHEET IS NOT LISTED. All three boards on the Down Sheet answer
   one question — what is this sheet not covering — and a bus the sheet already
   carries is covered. It is the same rule isHeldDeferred applies one board up,
   at the same grain (the bus, not the repair), so the two boards cannot
   disagree about what "on the sheet" means.

   Putting a bus on the sheet DOES NOT clear its recommendation, and this is
   why it does not have to: the row leaves the board because the bus is now on
   the sheet, and the stamp stays on the record saying who asked for it and
   when. Clearing it would erase that, which repair-catalog.ts already refuses
   to do where the two fields are defined. */

export function activeDownSheetBusIds(downEntries:DefectLogDownEntry[]){
 return new Set(downEntries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId));
}

/* One row per RECOMMENDED DEFECT paired with its bus, so a bus carrying two
   recommendations appears twice. Anything counting BUSES has to deduplicate —
   the same trap the deferred badge fell into, where one bus held on two repairs
   counted as two. */
export function recommendedRows(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const onSheet=activeDownSheetBusIds(downEntries);
 const rows:{bus:DefectLogFleetBus;defect:StructuredDefect}[]=[];
 for(const bus of fleet){
  if(onSheet.has(bus.id))continue;
  for(const defect of bus.defects||[])
   /* isUnresolved is what keeps the count honest. Curtis: the number "needs to
      be in sync" — fix the repair the recommendation was made about, or delete
      the record, and this list is one shorter without anybody tidying it. */
   if(isUnresolved(defect)&&isDownSheetRecommended(defect))rows.push({bus,defect});
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
