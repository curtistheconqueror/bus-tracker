/* HOLD THIS BUS.

   Curtis: "somebody just asked me about two buses that are gonna probably come
   in to B12, and if they do, they want me to hold those buses, because they got
   work they have to do on them. There's no feature in the app that allows you
   to do that."

   So this is a standing instruction attached to a BUS, not to a repair and not
   to a place. That is the whole shape of it, and it is why hold lives here on
   the bus record rather than as a defect, a Down Sheet entry or a location:

   IT APPLIES REGARDLESS OF WHERE THE BUS IS, including a bus that is not on the
   property at all. In the case it was asked for, the buses had not arrived yet
   — the hold is what the yard needs to know when they do. A status that only
   existed for buses in the shop would have missed the one case it was built
   for.

   A HELD BUS MAY HAVE NO DEFECTS. Nothing about a hold says anything is wrong
   with the bus; somebody wants it kept. That is why the control is on the
   Facility Map as well as the Defect Log — the Defect Log only draws buses that
   have defects, so a Defect-Log-only control could not have held a clean bus.

   WHAT LIFTS IT, which Curtis chose after being asked, because the obvious rule
   was wrong. He first said the hold should lift "when an action is taken on that
   bus, such as the bus moving locations" — but the buses in his example were
   ARRIVING, and arriving is a location move, so that rule would have dropped
   the hold at the exact moment it started to matter. Asked directly, he picked:
   only the time, or somebody taking it off by hand. Nothing about where the bus
   goes ever clears a hold.

   THE TIME IS OPTIONAL. Curtis: "I don't want a time to be required in case a
   person doesn't know the time off hand." With no time the hold simply stands
   until somebody removes it. */

export type BusHold={at:string;by?:string;until?:string};
export type HoldableBus={id?:string;n?:string;hold?:BusHold};

function iso(value:unknown){
 const text=String(value??"").trim();
 return text&&!Number.isNaN(Date.parse(text))?text:"";
}

/* A settings blob and a board are both files somebody can hand-edit and a
   device transfer can carry, so a hold is checked rather than trusted. A hold
   with no readable `at` is not a hold: every screen that draws one says when it
   was placed. */
export function normalizeHold(value:unknown):BusHold|null{
 if(!value||typeof value!=="object")return null;
 const saved=value as Partial<BusHold>;
 const at=iso(saved.at);
 if(!at)return null;
 const until=iso(saved.until),by=String(saved.by??"").trim();
 return {at,...(by?{by}:{}),...(until?{until}:{})};
}

/* Past its own time, a hold stops counting. Read-time only — the record is
   left exactly as it is on the device, the same rule the repair catalog
   follows for renamed defects, and for the same reason: rewriting somebody's
   record to make this build tidier throws away what they actually chose. */
export function holdExpired(hold:BusHold|null,now:Date|number=new Date()){
 if(!hold?.until)return false;
 return Date.parse(hold.until)<=(now instanceof Date?now.getTime():now);
}

export function busHold(bus:HoldableBus|undefined){return normalizeHold(bus?.hold)}

export function isHeld(bus:HoldableBus|undefined,now:Date|number=new Date()){
 const hold=busHold(bus);
 return Boolean(hold)&&!holdExpired(hold,now);
}

/* PLACING AND CLEARING, and the one rule that is not about holds at all:

   CLEARING DELETES THE KEY rather than setting it to undefined.

   THE ORIGINAL REASON NO LONGER APPLIES, AND THE RULE STAYS ANYWAY. It was
   written when holds synced: busRow copies every own key of a bus into
   map_fields and rowFingerprint walks Object.keys, so `hold:undefined` was
   still a key, every bus's fingerprint would have changed, and the next sync
   would have re-pushed the shop's entire fleet table. `hold` is in
   MAP_HELD_BACK now, so it never reaches map_fields and an undefined one could
   not move a fingerprint if it tried.

   What is left is smaller but still real: `delete` is the only spelling that
   makes `"hold" in bus` false, which is what every reader here tests. (It is
   NOT about keeping the board JSON clean — an earlier draft of this comment
   said so and was wrong: JSON.stringify drops undefined-valued properties, so
   `hold:undefined` would never reach pace-board-v1 either.) And it is the
   safety net — the instant somebody takes `hold` back
   out of MAP_HELD_BACK, the original trap is live again and this line is what
   stops it. Same trap `fluids` and `reportAttempts` were written around on the
   defect record. */
export function setBusHold<T extends HoldableBus>(bus:T,on:boolean,options:{at?:string;by?:string;until?:string}={}):T{
 const next={...bus} as T&{hold?:BusHold};
 if(!on){delete next.hold;return next}
 const at=iso(options.at)||new Date().toISOString();
 const by=String(options.by??"").trim(),until=iso(options.until);
 next.hold={at,...(by?{by}:{}),...(until?{until}:{})};
 return next;
}

/* Every bus currently held, longest-held first — the same ordering the
   RECOMMENDED and DEFERRED lists use, and for the same reason: the only
   question a list like this answers is "what has been waiting on me". */
export function heldBuses<T extends HoldableBus>(fleet:T[],now:Date|number=new Date()){
 return fleet.filter(bus=>isHeld(bus,now))
  .map(bus=>({bus,hold:busHold(bus) as BusHold}))
  .sort((a,b)=>Date.parse(a.hold.at)-Date.parse(b.hold.at));
}

export function heldBusCount<T extends HoldableBus>(fleet:T[],now:Date|number=new Date()){
 return heldBuses(fleet,now).length;
}

/* How long it has been held, in minutes, or null with no usable stamp —
   floored at zero, because a device with a wrong clock can produce a stamp in
   the future and "-4M" on a board reads as a bug in the app rather than a bug
   in a clock. */
export function heldMinutes(hold:BusHold|null,now:Date|number=new Date()){
 if(!hold)return null;
 const started=Date.parse(hold.at);
 if(Number.isNaN(started))return null;
 return Math.max(0,((now instanceof Date?now.getTime():now)-started)/60000);
}

/* "UNTIL 3:30 PM", or "" when nobody set one. Local formatting, since the only
   people reading it are standing in the same building. */
export function holdUntilLabel(hold:BusHold|null){
 if(!hold?.until)return "";
 const at=new Date(hold.until);
 return Number.isNaN(at.getTime())?"":"UNTIL "+new Intl.DateTimeFormat(undefined,{hour:"numeric",minute:"2-digit"}).format(at);
}

/* What the drawer prints under a bus number: who asked and when, plus the
   time if there is one. Deliberately NOT shown on the badge — Curtis: "don't
   just show the time of the expected arrival by default, you have to press it
   to see that information." */
export function holdDetailLabel(hold:BusHold|null){
 if(!hold)return "";
 const placed=new Date(hold.at);
 const when=Number.isNaN(placed.getTime())?"":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(placed);
 return [hold.by?hold.by.toUpperCase():"",when].filter(Boolean).join(" · ");
}
