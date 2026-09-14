/* WHAT SHIFT IS IT, AND WHEN IS THE NEXT PULLOUT.

   Curtis: "A timer must be built in if it isn't already. I think it is but it
   must be shift aware and pull out time aware. Also a settings option to fine
   tune both of these options in case changes need to be made without you
   writing code."

   He was half right about it already existing. The app has `Shift` as a LABEL
   on a Down Sheet entry — "1st", "2nd", "3rd", typed or defaulted by hand — and
   nothing anywhere that maps a CLOCK TIME onto one. Pullout times appear
   nowhere at all. So the sheet can say a repair belongs to 2nd shift while
   nothing in the app knows whether 2nd shift is running right now.

   This is that missing half, and it is deliberately the only place that knows:
   every window the Fleet Forecast quotes — "next shift", "the next two",
   "before the 06:00 pullout" — resolves through here, so a garage that changes
   its hours changes them once.

   EDITABLE WITHOUT A RELEASE, which is the part he asked for twice. Shift
   boundaries are a property of this garage's contract rather than of the
   software, and a contract changes on a schedule nobody here controls. */

export type ShiftKey="1st"|"2nd"|"3rd";
/* "HH:MM" on a 24-hour clock, read as the garage's own local time. Stored as
   the words rather than as minutes because this is what somebody types into
   the settings box and what they read back to check it. */
export type ClockTime=string;
export type ShiftWindow={key:ShiftKey;start:ClockTime;end:ClockTime};
export type Pullout={key:string;label:string;at:ClockTime};
export type ShiftSettings={shifts:ShiftWindow[];pullouts:Pullout[]};

export const SHIFT_SETTINGS_KEY="pace-shift-settings-v1";

/* THE PULLOUT TIMES ARE CURTIS'S OWN: "Pull out for a.m. is 6:00 am and for
   evening is 13:00 hours."

   THE SHIFT BOUNDARIES ARE A GUESS and are flagged as one here so nobody later
   reads them as something he said. He has never given them. These are the
   ordinary transit split, lined up so each pullout falls at the start of the
   shift that drives it, which is the only thing about them that is more than a
   guess. They are editable precisely so the guess costs nothing. */
export const DEFAULT_SHIFT_SETTINGS:ShiftSettings={
 shifts:[
  {key:"1st",start:"06:00",end:"14:00"},
  {key:"2nd",start:"14:00",end:"22:00"},
  {key:"3rd",start:"22:00",end:"06:00"},
 ],
 pullouts:[
  {key:"am",label:"A.M. PULLOUT",at:"06:00"},
  {key:"pm",label:"EVENING PULLOUT",at:"13:00"},
 ],
};

const CLOCK=/^([01]?\d|2[0-3]):([0-5]\d)$/;

/* Minutes since midnight, or null for anything that is not a clock time. Null
   rather than 0: a malformed setting must not silently mean midnight, which is
   inside the night shift and would quietly move every window. */
export function clockMinutes(value:unknown):number|null{
 const match=CLOCK.exec(String(value??"").trim());
 if(!match)return null;
 return Number(match[1])*60+Number(match[2]);
}

export function formatClock(minutes:number){
 const wrapped=((Math.round(minutes)%1440)+1440)%1440;
 return String(Math.floor(wrapped/60)).padStart(2,"0")+":"+String(wrapped%60).padStart(2,"0");
}

/* The local wall-clock minute an instant falls on. LOCAL on purpose: a shift
   starts when the clock on the garage wall says six, not at a fixed offset from
   UTC, so this follows the device and follows daylight saving with it. */
export function minuteOfDay(at:string|Date){
 const when=at instanceof Date?at:new Date(at);
 if(Number.isNaN(when.getTime()))return null;
 return when.getHours()*60+when.getMinutes();
}

/* Read back whatever is stored, keeping anything usable and filling the rest
   from the defaults. A half-edited settings blob must still produce a working
   clock — this is consulted every time the forecast draws, and throwing would
   take the report down with it. */
export function normalizeShiftSettings(value:unknown):ShiftSettings{
 const saved=(value&&typeof value==="object"?value:{}) as Partial<ShiftSettings>;
 const shifts=DEFAULT_SHIFT_SETTINGS.shifts.map(fallback=>{
  const found=Array.isArray(saved.shifts)?saved.shifts.find(item=>item&&item.key===fallback.key):undefined;
  const start=clockMinutes(found?.start),end=clockMinutes(found?.end);
  /* Each end is taken only when its own start is also good: a window with one
     valid edge is half a garage's hours and half the default's, which is worse
     than the default. */
  return start===null||end===null?fallback:{key:fallback.key,start:formatClock(start),end:formatClock(end)};
 });
 const rawPullouts=Array.isArray(saved.pullouts)?saved.pullouts:[];
 const pullouts=rawPullouts
  .filter(item=>item&&clockMinutes(item.at)!==null&&String(item.key||"").trim())
  .map(item=>({key:String(item.key).trim(),label:String(item.label||item.key).trim().toUpperCase(),at:formatClock(clockMinutes(item.at) as number)}));
 /* An empty list reads as "not configured" and falls back, rather than as a
    garage with no pullouts — which is not a thing. Somebody who genuinely wants
    none removes the forecast, not the times. */
 return {shifts,pullouts:pullouts.length?pullouts:DEFAULT_SHIFT_SETTINGS.pullouts};
}

export function readShiftSettings(storage:Pick<Storage,"getItem">):ShiftSettings{
 try{return normalizeShiftSettings(JSON.parse(storage.getItem(SHIFT_SETTINGS_KEY)||"{}"))}
 catch{return normalizeShiftSettings(null)}
}

/* Does a minute fall inside a window that may run past midnight?

   The night shift is 22:00 to 06:00, so its start is NUMERICALLY AFTER its end
   and the obvious `start <= m && m < end` reports every hour of the night as
   outside every shift. Both halves are needed, and which one applies is decided
   by the window rather than by the time. */
export function withinWindow(minute:number,start:number,end:number){
 if(start===end)return true;
 return start<end?minute>=start&&minute<end:minute>=start||minute<end;
}

export function shiftAt(at:string|Date,settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS):ShiftKey|null{
 const minute=minuteOfDay(at);
 if(minute===null)return null;
 for(const shift of settings.shifts){
  const start=clockMinutes(shift.start),end=clockMinutes(shift.end);
  if(start===null||end===null)continue;
  if(withinWindow(minute,start,end))return shift.key;
 }
 return null;
}

/* How many minutes from `at` forward to the next occurrence of a clock time.
   Zero is never returned as "now": standing exactly on the pullout, the next
   one is tomorrow's, which is what somebody asking "how long until pullout"
   means at 06:00 sharp. */
export function minutesUntilClock(at:string|Date,target:ClockTime){
 const minute=minuteOfDay(at),goal=clockMinutes(target);
 if(minute===null||goal===null)return null;
 const ahead=goal-minute;
 return ahead>0?ahead:ahead+1440;
}

export type NextPullout={key:string;label:string;at:ClockTime;minutesAway:number};

export function nextPullout(at:string|Date,settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS):NextPullout|null{
 let best:NextPullout|null=null;
 for(const pullout of settings.pullouts){
  const away=minutesUntilClock(at,pullout.at);
  if(away===null)continue;
  if(!best||away<best.minutesAway)best={key:pullout.key,label:pullout.label,at:pullout.at,minutesAway:away};
 }
 return best;
}

/* How much of the shift somebody is standing in is left. Null when the clock
   falls in no configured shift, which a garage running a gap between shifts can
   legitimately produce — the caller says so rather than being handed a zero it
   would read as "it ends now". */
export function shiftRemainingMinutes(at:string|Date,settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS){
 const key=shiftAt(at,settings);
 if(!key)return null;
 const shift=settings.shifts.find(item=>item.key===key);
 return shift?minutesUntilClock(at,shift.end):null;
}

/* The forecast asks for windows in hours, and always forward from now: "the
   next shift", "the next two", "between now and the pullout". Returned in hours
   because that is the unit a rate per hour multiplies by. */
export function windowHours(at:string|Date,span:"shift"|"two-shifts"|"pullout",settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS){
 if(span==="pullout"){
  const pullout=nextPullout(at,settings);
  return pullout?pullout.minutesAway/60:null;
 }
 const remaining=shiftRemainingMinutes(at,settings);
 if(remaining===null)return null;
 if(span==="shift")return remaining/60;
 /* The rest of this shift plus the whole of the one after it, which is what
    "over the next 2 shifts" means to somebody standing in the middle of one. */
 const key=shiftAt(at,settings);
 const order=settings.shifts.map(shift=>shift.key);
 const next=settings.shifts[(order.indexOf(key as ShiftKey)+1)%order.length];
 const start=clockMinutes(next.start),end=clockMinutes(next.end);
 if(start===null||end===null)return null;
 const length=start<end?end-start:1440-start+end;
 return (remaining+length)/60;
}

export function shiftLabel(key:ShiftKey|null){return key?key.toUpperCase()+" SHIFT":"OFF SHIFT"}

/* How long until, in the words somebody says out loud. "4h 20m", not 260. */
export function untilLabel(minutes:number|null){
 if(minutes===null||!Number.isFinite(minutes))return "";
 const whole=Math.max(0,Math.round(minutes));
 const hours=Math.floor(whole/60),rest=whole%60;
 return hours?hours+"h"+(rest?" "+rest+"m":""):rest+"m";
}
