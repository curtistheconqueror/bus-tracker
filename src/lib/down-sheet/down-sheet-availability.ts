import {downSheetScheduledOnly,isDownSheetReasonPlaceholder,type DownSheetViewEntry} from "./down-sheet-view.ts";

/* CAN THIS BUS STILL CARRY PASSENGERS? Asked of the sheet, and answered only
   when the sheet has already answered it.

   THE DOWN COUNT WAS INFLATED and the cause was that it had one bucket. Curtis
   reconciled a master export against the paper it was scanned from: the app
   said 47 where he counted 39. Some of those buses were on the sheet and still
   running - held for another garage's technicians, or written up as short-run -
   and folding them into DOWN told a foreman that fewer buses were available
   than really were, every morning.

   NOTHING RUNS UNLESS THE PAPER SAYS IT RUNS, and that direction is deliberate.
   The first version of this tried to infer it: treat "high oil usage" as a
   limitation and let the bus stay available. Run against the real sheet it put
   a bus with a BURNING SMELL and one with a FLAT TIRE AND A FAILED BRAKE TEST
   into the running column, because both rows happened to mention oil as well.
   The words do not separate a bus that can do short trips from one that cannot;
   the foreman's judgement does, and it is already written down when it has been
   made.

   Curtis settled it: "If they're saying it can run then it just goes to the
   soft count... Because they're already deciding on paper that it can run. So
   the judgment on usage has been made. Otherwise if it did not say (it can be
   used) or HOLD but left it up to interpretation... then I would say DOWN bus."
   And on the case that tempts a cleverer rule: "if it says HIGH OIL CONSUMPTION
   with nothing else, then that is where the ambiguity comes in and I would not
   expect the app to make that distinction although it probably could. So if
   it's on downsheet without any additional notes like hold or can use, then add
   it to downed count."

   So silence means DOWN. This module can only ever move a bus OUT of the down
   count on an explicit permission, which is the safe direction for a rule that
   decides whether something with brakes goes into service. */

/* The permissions. Each one is somebody writing "this still runs". */
export const DOWN_SHEET_CAN_RUN_PATTERN=/\bshort\s*run\b|\bhold\s+for\b|\bcan\s+(?:be\s+used|run)\b|\bok(?:ay)?\s+to\s+run\b|\blight\s+duty\b/i;

/* And the wording that overrules a permission, because these are holds AWAY
   from service rather than grants of it.

   Both halves of this are real rows on one sheet. "Accident Hold for Saftey"
   and "HOLD FOR SOUTH HOLLAND" both read "hold for", and only the second means
   the bus can still turn a wheel. "High Oil Usage Hold until Repaired (Rear
   Main Seal)" is the one bus on that sheet nobody may release, and it carries
   the same word as the four that may. Checked FIRST for that reason. */
export const DOWN_SHEET_NO_RUN_PATTERN=/\baccident\b|\buntil\s+repaired\b|\bdo\s*n[o']?t\s+(?:move|run|release|use)\b|\bquarantine\b|\bdon'?t\s+let\s+go\b/i;

/* The state inspection, which is not a repair and never a reason a bus is down.
   Curtis: "even on the days that they go to IDOT, a lot of times they're used
   in the morning. And when they come back, they go right into service, unless
   they go down from after the state inspection, which is different." */
export const DOWN_SHEET_IDOT_PATTERN=/\bi-?dot\b/i;
/* Stripped to ask whether IDOT is ALL the row carries. The bus numbers go with
   it: a multi-bus line reads "17542 17522 17515-PREP FOR IDOT" and those digits
   are the line's subjects, not a complaint about any of them. */
const IDOT_STRIPPER=/\b(?:prep(?:are)?\s*(?:for)?\s*)?i-?dot(?:\s*prep)?\b|\bmanual\s+entry\b|\b\d{4,6}\b/gi;

export type DownSheetAvailability="down"|"soft"|"inspection"|"idot";

export function downSheetReasonWords(entry:DownSheetViewEntry){
 return [entry.repair,entry.customReason,...(entry.repairItems||[]).flatMap(item=>[item.repair,item.details])]
  .map(value=>String(value||"").trim())
  .filter(value=>value&&!isDownSheetReasonPlaceholder(value))
  .join(" / ");
}

/* Does this row mention the state inspection at all, whatever else it says?
   The section that keeps an eye on them wants every one; the COUNT wants only
   the rows that are nothing else. Same shape as the sheet's own mentions/only
   pair one file over, and for the same reason: a bus can be down AND due. */
export function downSheetMentionsIdot(entry:DownSheetViewEntry){
 return DOWN_SHEET_IDOT_PATTERN.test(downSheetReasonWords(entry));
}
export function downSheetIdotOnly(entry:DownSheetViewEntry){
 const written=downSheetReasonWords(entry);
 if(!DOWN_SHEET_IDOT_PATTERN.test(written))return false;
 return !/[a-z]{3}/i.test(written.replace(IDOT_STRIPPER," ").replace(/[^a-z]+/gi," "));
}

/* ORDER IS THE BEHAVIOUR HERE, not presentation.

   Scheduled maintenance first, because that question is already answered one
   file over and its answer has not changed. Then IDOT-only, which is not a
   repair. Then the refusals, before the permissions, so a row carrying both
   words lands on the safe side. Permissions last, and anything left is DOWN. */
export function downSheetAvailability(entry:DownSheetViewEntry):DownSheetAvailability{
 if(downSheetScheduledOnly(entry))return "inspection";
 if(downSheetIdotOnly(entry))return "idot";
 const written=downSheetReasonWords(entry);
 if(DOWN_SHEET_NO_RUN_PATTERN.test(written))return "down";
 if(DOWN_SHEET_CAN_RUN_PATTERN.test(written))return "soft";
 return "down";
}
export function isSoftDownEntry(entry:DownSheetViewEntry){return downSheetAvailability(entry)==="soft"}
export function isHardDownEntry(entry:DownSheetViewEntry){return downSheetAvailability(entry)==="down"}

/* WE ARE USING THIS ONE TODAY.

   A soft bus counts against pullout, because it is on the sheet and nobody has
   put it on a run. But the foreman who decides to use one needs the number to
   follow that decision. Curtis: "yeah they count against pull out but it's a
   switch that should be able to be easily flipped to satisfy pullout as much as
   possible."

   IT TRAVELS, and that is the opposite of how a HOLD works. A hold is one
   person's note to themselves about one bus — "It doesn't need to show up on
   everybody's screen" — while pullout is the whole shop's number, and a bus the
   yard has put into service is in service for everybody looking at the sheet.
   Curtis: "1 travel for sure." It rides for free: cloud-sync.ts puts every field
   it does not name a column for into `detail`, and spreads `detail` back on the
   way in, so this needs no schema change and no migration.

   NO AUTOMATIC EXPIRY, and that is a decision rather than an oversight. The
   obvious rule — clear it at midnight — cuts the night shift in half, since that
   crew works 22:00 to 06:30. Expiring it at the next pullout would need this
   module to know the shift clock, and a flag that disappears on its own is worse
   than one somebody can see: the stamp is printed on the row, so a decision made
   yesterday reads as yesterday's rather than quietly counting today. */
export type SheetEntryInService={at:string;by?:string};
export type InServiceEntry=DownSheetViewEntry&{inService?:SheetEntryInService};

export function entryInServiceStamp(entry:InServiceEntry){
 const at=String(entry.inService?.at||"").trim();
 return at?{at,by:String(entry.inService?.by||"").trim()||undefined}:undefined;
}
export function isEntryInService(entry:InServiceEntry){return Boolean(entryInServiceStamp(entry))}

/* DELETED, never set to undefined, the spelling setBusHold uses and for the same
   reason: `{...existing,...incoming}` cannot carry a removal written as
   undefined, so a bus taken back out of service would come straight back on the
   next read. */
export function setEntryInService<T extends InServiceEntry>(entry:T,on:boolean,at:string,by=""):T{
 const next={...entry} as T&{inService?:SheetEntryInService};
 if(!on){delete next.inService;return next}
 next.inService={at,...(by.trim()?{by:by.trim()}:{})};
 return next;
}

/* What the shortage actually is: everything hard down, plus the soft buses
   nobody has put on a run. */
export function countsAgainstPullout(entry:InServiceEntry){
 const availability=downSheetAvailability(entry);
 if(availability==="down")return true;
 return availability==="soft"&&!isEntryInService(entry);
}
