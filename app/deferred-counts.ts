import {isHeldDeferred,isUnresolved,deferredMinutesElapsed,type StructuredDefect} from "./repair-catalog.ts";
import type {DefectLogDownEntry,DefectLogFleetBus} from "./defect-log/defect-log-sync.ts";

/* The buses DEFERRED is holding back, and the two numbers the nav badge needs.

   Split out of deferred-watch.tsx so it can be tested against a fleet directly:
   that file is .tsx, and the test runner strips types from .ts but not from
   JSX. Same reason quick-filters.ts and road-calls.ts are plain modules. */

export const DEFERRED_OVERDUE_MINUTES=90;

/* Every currently-deferred defect paired with its bus, narrowed to the ones
   genuinely held back — no active Down Sheet entry for that bus. One row per
   DEFECT, so a bus held on two repairs appears twice; anything counting buses
   has to deduplicate. */
export function heldDeferredRows(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const onSheetIds=new Set(downEntries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId));
 const rows:{bus:DefectLogFleetBus;defect:StructuredDefect}[]=[];
 for(const bus of fleet)for(const defect of bus.defects||[])
  if(isUnresolved(defect)&&isHeldDeferred(defect,onSheetIds.has(bus.id)))rows.push({bus,defect});
 return rows;
}

/* `listed` is what the Deferred filter will show — buses, deduplicated. That is
   the number printed on the badge, so the badge and the drawer it opens can
   never disagree. `overdue` is the same set narrowed to the ninety-minute line,
   and decides only whether the badge appears at all: under that line DEFERRED
   is working as intended and nothing needs to flash.

   The badge used to print the overdue count, which was wrong twice over — it
   disagreed with its own list, and because the rows above are per defect, one
   bus held on two repairs counted as two. */
export function deferredBadgeCounts(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[],now=new Date()){
 const rows=heldDeferredRows(fleet,downEntries);
 const overdue=rows.filter(row=>{
  const minutes=deferredMinutesElapsed(row.defect,now);
  return minutes!==null&&minutes>=DEFERRED_OVERDUE_MINUTES;
 });
 return {listed:new Set(rows.map(row=>row.bus.id)).size,overdue:new Set(overdue.map(row=>row.bus.id)).size};
}
