/* FULL SWEEP: the mode you are in while walking the building.

   Curtis: "there can be an option on the facility map where you press it and it
   means full sweep which means that I'm actually going around the entire
   facility once in that mode, the App will know that I am basically getting all
   the details ready to send out this report."

   IT IS A STATE, NOT A SEQUENCE, and that is the whole design. He can start on
   the map and scan the sheet afterwards, or scan the sheet first and walk after
   — "if a foreman or someone else decide to do the facility map sweep first and
   then upload the down sheet that could be a thing". So there is one flag, both
   surfaces can set it, and neither owns it. Building it as a sequence would
   have meant one of those two orders working and the other not.

   DEVICE-LOCAL, AND IT NEVER TRAVELS. A sweep is one person's walk, not a fact
   about the fleet — the same reasoning that made a HOLD device-local. If two
   foremen sweep on the same morning they are doing two different walks, and a
   sweep that synced would have each of them ending the other's.

   IT HOLDS NO FLEET DATA. Only when the walk began and where it was started
   from. The board is the board; this says nothing about it, which is why
   starting or ending a sweep can never lose anybody's work. */

export const SWEEP_STORAGE_KEY="pace-sweep-v1";

export type SweepOrigin="map"|"scan";
/* `lastActiveAt` is the last time the person did something as part of the
   walk. It is what the cut-off measures from, not `startedAt`. */
export type FacilitySweep={startedAt:string;startedFrom:SweepOrigin;lastActiveAt:string};

type Reader=Pick<Storage,"getItem">;
type Writer=Pick<Storage,"getItem"|"setItem"|"removeItem">;

/* A walk somebody never ended, cut off on IDLE rather than on total length.

   Curtis: "a sweep will never last that long. If I have not pressed anything
   then just cut it off within 20 minutes." That is an IDLE rule, and it is the
   better one — a cap on total length would end a forty-minute walk somebody was
   actively working through, while still leaving a phone in a pocket looking
   live. Measured from lastActiveAt, which every board write bumps: walking the
   building keeps the mode alive for as long as the building takes, and twenty
   quiet minutes end it however long ago it started.

   The failure this closes is the asymmetric one. Ending early costs a tap.
   Ending too late has somebody open the app the next morning still reading FULL
   SWEEP, press END & REPORT, and send a report believing it reflects a walk
   they finished yesterday — a wrong answer handed to a superintendent, which is
   the thing this feature exists to prevent. */
export const SWEEP_IDLE_MINUTES=20;

export function readSweep(storage:Reader,now=new Date().toISOString()):FacilitySweep|null{
 try{
  const raw=storage.getItem(SWEEP_STORAGE_KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as Partial<FacilitySweep>;
  const startedAt=String(parsed?.startedAt??"");
  const began=Date.parse(startedAt);
  if(!Number.isFinite(began))return null;
  /* A record written before this field existed falls back to its start time,
     which is the conservative reading: it expires sooner, never later. */
  const lastActiveAt=Number.isFinite(Date.parse(String(parsed?.lastActiveAt??"")))?String(parsed?.lastActiveAt):startedAt;
  const idle=Date.parse(now)-Date.parse(lastActiveAt);
  /* Expired at READ time, and the record is left alone rather than rewritten —
     the same rule a hold's `until` follows. A read must not be a write. */
  if(Number.isFinite(idle)&&idle>=SWEEP_IDLE_MINUTES*60000)return null;
  const from=parsed?.startedFrom==="scan"?"scan":"map";
  return {startedAt,startedFrom:from,lastActiveAt};
 }catch{return null}
}

export function startSweep(storage:Writer,from:SweepOrigin,now=new Date().toISOString()):FacilitySweep|null{
 /* ALREADY SWEEPING IS NOT A NEW SWEEP. Starting again from the other surface
    must not reset the clock — the walk began when it began, and the scan
    prompt firing mid-walk is exactly the case that would have restarted it. */
 const current=readSweep(storage,now);
 if(current)return current;
 const sweep:FacilitySweep={startedAt:now,startedFrom:from,lastActiveAt:now};
 try{storage.setItem(SWEEP_STORAGE_KEY,JSON.stringify(sweep));return sweep}
 catch{return null}
}

/* "I pressed something." Called when the person does something that is part of
   the walk — a bus moved, a status changed, an edit saved — so the idle clock
   restarts and the mode outlives however long the building takes today.

   A no-op when no sweep is running, so callers never have to check first, and
   silent on a full device: failing to extend a sweep is not worth an alert in
   the middle of somebody's round. */
export function touchSweep(storage:Writer,now=new Date().toISOString()):FacilitySweep|null{
 const current=readSweep(storage,now);
 if(!current)return null;
 const next:FacilitySweep={...current,lastActiveAt:now};
 try{storage.setItem(SWEEP_STORAGE_KEY,JSON.stringify(next));return next}
 catch{return current}
}

export function endSweep(storage:Writer){
 try{storage.removeItem(SWEEP_STORAGE_KEY);return true}
 catch{return false}
}

export function sweepMinutes(sweep:FacilitySweep|null,now=new Date().toISOString()){
 if(!sweep)return 0;
 const began=Date.parse(sweep.startedAt),at=Date.parse(now);
 if(!Number.isFinite(began)||!Number.isFinite(at))return 0;
 return Math.max(0,Math.round((at-began)/60000));
}

/* "Walking 42 min" rather than a clock time. What a person wants off this
   banner is how long they have been at it, not when they set off. */
export function sweepLabel(sweep:FacilitySweep|null,now=new Date().toISOString()){
 if(!sweep)return "";
 const minutes=sweepMinutes(sweep,now);
 if(minutes<1)return "just started";
 if(minutes<60)return minutes+" min";
 const hours=Math.floor(minutes/60),rest=minutes%60;
 return hours+"h"+(rest?" "+rest+"m":"");
}
