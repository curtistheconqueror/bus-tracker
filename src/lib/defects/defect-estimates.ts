import {normalizeRepairTimeEstimate,repairTimeTotal} from "../down-sheet/repair-time-estimates.ts";
import {isUnresolved,type StructuredDefect} from "./repair-catalog.ts";

/* HOW LONG THE WORK STANDING ON THE BOARD WOULD TAKE.

   Curtis asked for it on the Defect Log's own header line, beside the bus and
   defect counts: "a little badge that shows how many hours all of the ...
   defects that are currently on the bus add up to". The Down Sheet has printed
   the same number since it was built — `ALL SHIFTS · 52 ROWS · 14h 30m
   ESTIMATED` — and the Defect Log never had it.

   IT READS THE DOWN SHEET'S OWN TABLE rather than keeping one of its own. The
   two screens describe the same garage and often the same bus, and two tables
   that must agree about how long a coolant leak takes are two tables that will
   eventually disagree — the same reason the Ventra quick filter was made to
   read `tech-services.ts` instead of its own regex. So an unestimated repair
   contributes exactly what the Down Sheet would print for it, minimum floor
   included.

   A MECHANIC'S OWN NUMBER WINS, and is not floored. `repairTimeTotal` holds a
   30-minute minimum because a guess that says "ten minutes" is a guess nobody
   should plan around; a typed .25 is not a guess, it is somebody saying they
   did it in fifteen minutes, and rounding that up to half an hour would quietly
   overstate the board. Both halves of what the editor collects are counted,
   because diagnostic time is time: a fault nobody can find yet is work. */
export function defectEstimateMinutes(defect:StructuredDefect){
 const typed=(defect.repairHours||0)+(defect.diagnosticHours||0);
 if(typed>0)return Math.round(typed*60);
 return repairTimeTotal(normalizeRepairTimeEstimate(undefined,defect.category||"",defect.issue||""));
}

/* OUTSTANDING WORK ONLY.

   A completed repair adds nothing: the badge answers "what is still owed",
   not "what has this board ever been worth". Deferred and in-progress both
   count — a repair held back is still work somebody has to do, which is the
   whole reason the deferred list exists.

   The fallback above is why this is worth printing at all. A defect read off a
   photographed sheet carries NO hours — nothing in the scan import writes
   them — so on a board built the way this shop builds one, summing only typed
   hours would report a fraction of the day's work and look authoritative doing
   it. */
export function openDefectsEstimateMinutes(defects:StructuredDefect[]){
 return defects.reduce((total,defect)=>isUnresolved(defect)?total+defectEstimateMinutes(defect):total,0);
}
