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
export type FacilitySweep={startedAt:string;startedFrom:SweepOrigin};

type Reader=Pick<Storage,"getItem">;
type Writer=Pick<Storage,"getItem"|"setItem"|"removeItem">;

/* A walk somebody never ended. The app cannot tell a foreman who went home mid
   sweep from one still out there, so it picks the reading that cannot mislead:
   after this long the mode is treated as over. Twelve hours is longer than any
   shift and shorter than "it was still on from Tuesday", which is the state
   that would have somebody sending yesterday's report believing it was live. */
export const SWEEP_MAX_HOURS=12;

export function readSweep(storage:Reader,now=new Date().toISOString()):FacilitySweep|null{
 try{
  const raw=storage.getItem(SWEEP_STORAGE_KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as Partial<FacilitySweep>;
  const startedAt=String(parsed?.startedAt??"");
  const began=Date.parse(startedAt);
  if(!Number.isFinite(began))return null;
  const age=Date.parse(now)-began;
  /* Expired at READ time, and the record is left alone rather than rewritten —
     the same rule a hold's `until` follows. A read must not be a write. */
  if(Number.isFinite(age)&&age>=SWEEP_MAX_HOURS*3600000)return null;
  const from=parsed?.startedFrom==="scan"?"scan":"map";
  return {startedAt,startedFrom:from};
 }catch{return null}
}

export function startSweep(storage:Writer,from:SweepOrigin,now=new Date().toISOString()):FacilitySweep|null{
 /* ALREADY SWEEPING IS NOT A NEW SWEEP. Starting again from the other surface
    must not reset the clock — the walk began when it began, and the scan
    prompt firing mid-walk is exactly the case that would have restarted it. */
 const current=readSweep(storage,now);
 if(current)return current;
 const sweep:FacilitySweep={startedAt:now,startedFrom:from};
 try{storage.setItem(SWEEP_STORAGE_KEY,JSON.stringify(sweep));return sweep}
 catch{return null}
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
