/* Answering a deferred bus, in one place.

   Two surfaces now do this: the evening review prompt, and the DEFERRED board
   on the Down Sheet. They are the same decision about the same bus — keep it
   held until a time, escalate it to the Down Sheet, or send it back out — and
   two copies of these rules would drift into a bus that is half returned on one
   screen and still held on the other.

   Data only, no JSX, so the test runner can drive it against a fleet. */

import {saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus} from "./defect-log/defect-log-sync.ts";
import type {StructuredDefect} from "./repair-catalog.ts";

export type DeferredAnswer="keep"|"downsheet"|"return";

/* PUT ON DOWN SHEET moves ONE repair, because the sheet allows a bus only one
   active entry — and it needs no more: once the bus is on the sheet
   heldDeferredRows drops every repair holding it, so the rest stop asking on
   their own and the sheet becomes the record for all of them.

   The other two answers are statements about the BUS, so they are written to
   every repair holding it back. Answering per defect under a bus heading is
   exactly the bug that made the evening prompt ask three times for one bus. */
export function answerDeferredBus(
 fleet:DefectLogFleetBus[],
 downEntries:DefectLogDownEntry[],
 busId:string,
 defects:StructuredDefect[],
 action:DeferredAnswer,
 options:{keepUntilISO?:string;now?:string}={},
){
 const now=options.now||new Date().toISOString();
 /* The longest-held repair leads, so "one of them" is never an arbitrary one. */
 const lead=[...defects].sort((a,b)=>String(a.deferredAt||"").localeCompare(String(b.deferredAt||"")))[0];
 const targets=action==="downsheet"?(lead?[lead]:[]):defects;
 let nextFleet=fleet,nextDown=downEntries,saved=0;
 for(const defect of targets){
  const patch:Partial<StructuredDefect>=action==="keep"
   ?{state:"deferred",deferredUntil:options.keepUntilISO}
   /* "return" is the same "held back, back in service, still open" moment as
      unchecking DEFERRED by hand — stamp it. "downsheet" invalidates it: the
      Down Sheet is now the record of what happens to this repair. */
   :{state:"open",deferredAt:undefined,deferredUntil:undefined,deferredReturnedAt:action==="return"?now:undefined};
  const result=saveDefectLogRecord(nextFleet,nextDown,busId,{...defect,...patch},action==="downsheet",now);
  if(result.error)continue;
  nextFleet=result.fleet;nextDown=result.downEntries;saved++;
 }
 return {fleet:nextFleet,downEntries:nextDown,saved,attempted:targets.length};
}
