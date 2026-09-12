/* Answering a recommendation, in one place.

   Two surfaces do this: the RECOMMENDED FOR DOWN SHEET board on the Down Sheet,
   and the same list opened from the Defect Log's quick filters. They are the
   same decision about the same bus, and two copies of these rules would drift
   into a bus that is off the list on one screen and still on it on the other —
   which is the exact failure answerDeferredBus was written to prevent.

   Data only, no JSX, so the test runner can drive it against a fleet. */

import {saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus} from "./defect-log/defect-log-sync.ts";
import {setDownSheetRecommendation,type StructuredDefect} from "./repair-catalog.ts";
import {recommendedRank} from "./recommended-counts.ts";

export type RecommendedAnswer="downsheet"|"dismiss";

/* PUT ON DOWN SHEET moves ONE repair, because the sheet allows a bus only one
   active entry — and it needs no more: once the bus is on the sheet
   recommendedRows drops every recommendation on it, so the rest stop asking on
   their own and the sheet becomes the record for all of them. Same rule
   answerDeferredBus follows, for the same reason.

   THE RECOMMENDATION IS NOT CLEARED ON THE WAY. It is tempting — the question
   has been answered, so why keep the question — and it is wrong: the stamp is
   the record of who asked for this and when, and repair-catalog.ts already
   refuses to let membership erase it. The row leaves the board because the bus
   is on the sheet, not because the reason it got there was deleted.

   NOT FOR THE SHEET is a statement about the BUS, so it is written to every
   recommendation on it. Answering per defect under a bus heading is exactly the
   bug that made the evening deferred prompt ask three times for one bus. */
export function answerRecommendedBus(
 fleet:DefectLogFleetBus[],
 downEntries:DefectLogDownEntry[],
 busId:string,
 defects:StructuredDefect[],
 action:RecommendedAnswer,
 options:{now?:string}={},
){
 const now=options.now||new Date().toISOString();
 /* The longest-waiting repair leads, so "one of them" is never an arbitrary
    one — and it is the same ordering the board drew, so the repair that goes on
    the sheet is the one whose row the foreman was looking at. */
 const lead=[...defects].sort((a,b)=>recommendedRank(a)-recommendedRank(b))[0];
 const targets=action==="downsheet"?(lead?[lead]:[]):defects;
 let nextFleet=fleet,nextDown=downEntries,saved=0;
 for(const defect of targets){
  const next=action==="dismiss"?setDownSheetRecommendation(defect,false,now):defect;
  const result=saveDefectLogRecord(nextFleet,nextDown,busId,next,action==="downsheet",now);
  if(result.error)continue;
  nextFleet=result.fleet;nextDown=result.downEntries;saved++;
 }
 return {fleet:nextFleet,downEntries:nextDown,saved,attempted:targets.length};
}
