/* COUNTING THAT A BUS CAME BACK, as a function instead of a handler.

   Curtis: "if a person tries to re-submit something in defects, I want a tally
   of how many times with the date stamped... this way I know how many round
   trips a bus is making without the repair."

   It lived inside the Defect Log page, which meant nothing executed it. A cold
   read mutated that handler four ways — every refusal claiming it had counted,
   a missing bus claiming it had counted, the card always saying COUNTED, and
   the id check short-circuited so a press stamped EVERY defect on the bus —
   and the suite stayed green through all four. Source-regex assertions cannot
   see any of that. Here it is a plain function over plain data, so the tests
   can do what the reviewer did.

   WHAT IT REFUSES IS AS IMPORTANT AS WHAT IT COUNTS. This tally is evidence
   that a repair is not working, so it has to be honest in both directions:
   never count twice for one press, and never report a count it did not make. */

import {normalizeDefects,recordReportAttempt,reportAttemptCount,lastReportAttemptAt,type StructuredDefect} from "./repair-catalog.ts";

/* The reasons a press can fail to count, each distinct because they need
   different words on the screen. An earlier version stamped "too-soon" on
   every non-change, so a bus that was no longer on the board told somebody
   their return had "already been counted a moment ago" — a false statement
   about their own data, in place of an honest "that bus is gone". */
export type ReportReturnRefusal="too-soon"|"no-bus"|"no-defect"|"not-saved"|"bad-time";
export type ReportReturnResult={
 counted:boolean;
 /* How many RETURNS are stored — the original report is not one of them. */
 returns:number;
 at:string|null;
 reason?:ReportReturnRefusal;
};

type FleetLike={id:string;pendingRepair?:string;defects:StructuredDefect[]};

/* Takes the fleet and hands back the fleet it would write, plus what happened.
   It writes nothing: the caller owns persistence, and has to be able to decide
   NOT to report a count when the write is refused. */
export function applyReportReturn<T extends FleetLike>(fleet:T[],busId:string,defectId:string,at:string,by=""):{fleet:T[];result:ReportReturnResult}{
 const bus=fleet.find(item=>item.id===busId);
 if(!bus)return {fleet,result:{counted:false,returns:0,at:null,reason:"no-bus"}};

 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).find(defect=>defect.id===defectId);
 if(!current)return {fleet,result:{counted:false,returns:0,at:null,reason:"no-defect"}};

 /* recordReportAttempt also returns the record unchanged for a stamp it
    cannot parse, and reporting that as "already counted a moment ago" is the
    same false-statement-about-your-own-data this file exists to stop. */
 if(Number.isNaN(Date.parse(at)))return {fleet,result:{counted:false,returns:reportAttemptCount(current),at:lastReportAttemptAt(current),reason:"bad-time"}};
 const next=recordReportAttempt(current,at,by);
 /* recordReportAttempt hands back the SAME object when its debounce refuses a
    stamp, which is the only signal that it did. Compared here, against the
    record it was given, rather than exported as a two-argument helper anybody
    could call across a normalisation and get a false positive from. */
 if(next===current)return {fleet,result:{counted:false,returns:reportAttemptCount(current),at:lastReportAttemptAt(current),reason:"too-soon"}};

 /* Stamped PER MATCH rather than splicing one object into every match. Two
    defects sharing an id — which a cloud merge or an import can produce, since
    normalizeDefects only mints unique ids for records that have none — both
    became the SAME record, so the second one's wording was destroyed by the
    first one's. That is a repair record merged away to make a count work,
    which this project does not do. */
 let stamped=false;
 const written=fleet.map(item=>item.id!==busId?item:{...item,
  defects:normalizeDefects(item.defects,item.pendingRepair||"",item.id)
   .map(defect=>{
    if(defect.id!==defectId)return defect;
    if(stamped)return recordReportAttempt(defect,at,by);
    stamped=true;
    return next;
   })});
 return {fleet:written,result:{counted:true,returns:reportAttemptCount(next),at:lastReportAttemptAt(next)}};
}

/* ONE WORDING FOR THE COUNT, everywhere this release says it.

   The two messages added for this first disagreed with each other: the banner
   said "has now come back 1x" and the card said "reported x2" about the same
   press. Both were mine, both were about the same defect, and a foreman should
   not have to work out that they agree.

   REPORTS, not returns, because that is what was asked for — "it should say
   reported times the number of times it was reported" — and the original
   report is one of them. The older CAME BACK and ROUND TRIPS labels elsewhere
   count RETURNS and say so in their own words, which is a different question
   and not a contradiction. */
export function reportTotal(defect:{reportAttempts?:{at:string}[]}){
 return reportAttemptCount(defect)+1;
}
export function refusalMessage(reason:ReportReturnRefusal){
 if(reason==="too-soon")return "ALREADY COUNTED a moment ago. One press is one return.";
 if(reason==="no-bus")return "That bus is no longer on the board. Nothing was counted.";
 if(reason==="not-saved")return "NOT COUNTED \u2014 this device could not save the board.";
 if(reason==="bad-time")return "NOT COUNTED \u2014 this device's clock gave an unreadable time.";
 return "That defect is no longer on this bus. Nothing was counted.";
}

/* THE BUTTON'S THREE STATES, AS A FUNCTION, for the same reason the counting
   is one: a cold read landed eleven mutations on the inline version and the
   suite caught none of them. Every one was a behavioural break — a refused
   press rendering GREEN with "NOT COUNTED" on it, the armed state sticking
   forever because an effect's deps were emptied, the outcome painting onto
   every defect row on the page, and the label literal left in the file while
   only the resting word rendered, which is precisely the loophole the test
   beside it claimed to have closed.

   A button that changes its own words IS a state machine, and a state machine
   that only exists inside JSX can only be pinned by matching the JSX. */
export type ReportButtonState={label:string;tone:""|"armed"|"counted"|"refused";announce:boolean;ariaLabel:string};
export function reportButtonState(opts:{defectId:string;armedId:string;note:{id:string;tone:"counted"|"refused";text:string}|null;busNumber:string;position:number}):ReportButtonState{
 const {defectId,armedId,note,busNumber,position}=opts;
 const mine=note&&note.id===defectId?note:null;
 /* The OUTCOME outranks the armed word: a press that counted has just cleared
    the arm, and showing "TAP AGAIN" over a count that already happened would
    invite a second one. */
 if(mine)return {label:mine.text,tone:mine.tone,announce:true,
  ariaLabel:mine.text+" for bus "+busNumber+" defect "+position};
 /* "TAP AGAIN", not "TAP AGAIN TO COUNT": the rail is a vertical 82px column
    on the shop computer and both iPads, where the longer wording clipped and
    grew the row 104px -> 108px between the two taps it is asking for. The
    accessible name below still carries the whole sentence, and the icon and
    the word that was just pressed carry the rest. */
 if(armedId===defectId)return {label:"TAP AGAIN",tone:"armed",announce:true,
  ariaLabel:"Tap again to count a return for bus "+busNumber+" defect "+position};
 return {label:"REPORTED AGAIN",tone:"",announce:false,
  ariaLabel:"Record that bus "+busNumber+" was reported again for defect "+position};
}

/* SHORT ENOUGH FOR A BUTTON. The refusal sentences are written for the
   editor's banner, which is a full-width paragraph. In a rail cell measured at
   roughly 90px an eight-pixel sentence wrapped to three lines and grew the
   action row from 104px to 120px — the card reflowing under a finger between
   the two taps it is asking for. The button gets the headline; the sentence
   stays where there is room for it. */
export function refusalHeadline(reason:ReportReturnRefusal){
 if(reason==="too-soon")return "ALREADY COUNTED";
 if(reason==="no-bus")return "BUS IS GONE";
 if(reason==="no-defect")return "DEFECT IS GONE";
 if(reason==="bad-time")return "BAD CLOCK TIME";
 return "NOT SAVED";
}
