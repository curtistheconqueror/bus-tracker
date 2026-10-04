/* WHEN "HOLD IT UNTIL SIX" MEANS TOMORROW.

   A deferment is given an hour, not a date — nobody standing next to a bus
   types a calendar day. So a clock time has to become the next time that clock
   time comes round, and on a night shift that is usually tomorrow: at 21:00,
   "hold it until 06:00" means the morning, not fifteen hours ago.

   Pure, and in a `.ts` file with no React, for the reason every other rule in
   this app that matters is: it can be driven by the test runner directly. It
   lived inside `deferred-watch.tsx` while the evening review was the only thing
   that asked; three places ask now — that review, the DEFERRED tick in the
   editor, and EXTEND on a held row — and three copies of this arithmetic would
   eventually disagree about which day somebody meant. */
export function nextOccurrenceISO(hhmm:string,from:Date){
 const [hours,minutes]=hhmm.split(":").map(Number);
 if(!Number.isFinite(hours)||!Number.isFinite(minutes))return "";
 const at=new Date(from);
 at.setHours(hours,minutes,0,0);
 /* `<=` rather than `<`: choosing the hour it already is means the next one,
    not a hold that expires the instant it is set. */
 if(at.getTime()<=from.getTime())at.setDate(at.getDate()+1);
 return at.toISOString();
}

/* The hh:mm a `<input type="time">` wants, from the instant that was stored.
   Without this a hold time already set reads as an empty field when the editor
   is reopened, which invites somebody to set it again. */
export function clockValue(iso:string|undefined){
 const at=iso?new Date(iso):null;
 if(!at||Number.isNaN(at.getTime()))return "";
 return String(at.getHours()).padStart(2,"0")+":"+String(at.getMinutes()).padStart(2,"0");
}
