/* The typing rules for an hours box, kept apart from the component that draws
   it so they can be tested directly — the test harness imports .ts and not
   .tsx, and these are the part worth testing anyway.

   Both rules exist because of one complaint: "the hours entered field is janky
   and doesn't allow u to just simply erase all the numbers and the decimal
   point." */

/* Legal WHILE TYPING, even though several of these are not yet numbers: empty,
   a lone point, a trailing point, a leading point. Rejecting an intermediate
   state mid-keystroke is exactly what deleted the character somebody had just
   pressed — `1` `.` `5` became 15 that way. */
export const HOURS_TYPING=/^(\d*\.?\d*)$/;

export function isTypeableHours(raw:string){return HOURS_TYPING.test(String(raw??""))}

/* EMPTY IS NOT ZERO. An unrecorded hour is not the claim that the job took
   none, and the two must stay distinguishable all the way to storage. */
export function parseHours(raw:string):number|undefined{
 const text=String(raw??"").trim();
 if(!text||text===".")return undefined;
 const hours=Number(text);
 if(!Number.isFinite(hours)||hours<0)return undefined;
 return Math.round(hours*100)/100;
}
