"use client";

/* The B12 safety net for DEFERRED buses.

   Deferred exists so a mechanic can hold a bus back from service without
   putting it on the Down Sheet — "not fixed yet, not ready to escalate
   either." Left alone that is exactly the kind of thing that gets forgotten:
   nothing about it shows up anywhere else, and by the next shift nobody
   remembers it was ever set aside.

   Two pieces close that gap, both self-contained so they can be dropped into
   every page's nav without any page threading fleet state through props:

     - DeferredNavBadge: a pulsing count of buses deferred past 90 minutes,
       visible everywhere.
     - DeferredReviewPrompt: from 8:30pm on — when third shift buses are
       usually being decided — asks about any bus still deferred past an
       hour, one at a time, with three ways out: keep it deferred until a
       chosen time, put it on the Down Sheet, or return it to service with
       the defect still open. A location update rides along, since this is
       often the moment that gets decided too.

   Both read localStorage directly rather than depending on a host page's own
   state, which is also why a change made here needs a refresh to show up on
   a DIFFERENT tab already open elsewhere — the same limitation every page in
   this app already has, not a new one. */

import {useEffect,useMemo,useState} from "react";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,readDownSheetStorage,readFleetStorage,writeDownSheetStorageResult,writeFleetStorageResult} from "./storage";
import {defectLabel,deferredMinutesElapsed,isHeldDeferred,isUnresolved,normalizeDefects,repairCategoryLabel,type StructuredDefect} from "./repair-catalog";
import {saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus} from "./defect-log/defect-log-sync";
import {moveBusToArea,RELOCATION_AREAS,sectionForLocation} from "./facility-areas";

const OVERDUE_MINUTES=90;
const REVIEW_MINUTES=60;
const REVIEW_HOUR=20,REVIEW_MINUTE=30;
const DISMISS_KEY="pace-deferred-review-dismissed-v1";

function locationLabel(location:string){
 const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["offsite-","Off Property"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["office-","Foreman Office"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];
 return labels.find(([prefix])=>location.startsWith(prefix))?.[1]||location||"Location not set";
}

function readFleet():DefectLogFleetBus[]{
 if(typeof window==="undefined")return [];
 const payload=readFleetStorage<DefectLogFleetBus>(localStorage);
 return payload.valid?payload.buses.map(bus=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[];
}
function readDown():DefectLogDownEntry[]{
 if(typeof window==="undefined")return [];
 const payload=readDownSheetStorage<DefectLogDownEntry>(localStorage);
 return payload.valid?payload.entries:[];
}

/* Every currently-deferred defect paired with its bus, narrowed to the ones
   genuinely held back — no active Down Sheet entry for that bus. */
function heldDeferredRows(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const onSheetIds=new Set(downEntries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId));
 const rows:{bus:DefectLogFleetBus;defect:StructuredDefect}[]=[];
 for(const bus of fleet)for(const defect of bus.defects||[])
  if(isUnresolved(defect)&&isHeldDeferred(defect,onSheetIds.has(bus.id)))rows.push({bus,defect});
 return rows;
}

function todayKey(){return new Date().toDateString()}
function readDismissed():Record<string,string>{
 try{return JSON.parse(localStorage.getItem(DISMISS_KEY)||"{}") as Record<string,string>}catch{return {}}
}
function dismissToday(defectId:string){
 try{localStorage.setItem(DISMISS_KEY,JSON.stringify({...readDismissed(),[defectId]:todayKey()}))}catch{/* Missing a dismissal only means an extra prompt, never a stuck one. */}
}

function isReviewWindowOpen(now:Date){return now.getHours()>REVIEW_HOUR||(now.getHours()===REVIEW_HOUR&&now.getMinutes()>=REVIEW_MINUTE)}
function nextOccurrenceISO(hhmm:string,from:Date){
 const [hours,minutes]=hhmm.split(":").map(Number);
 if(!Number.isFinite(hours)||!Number.isFinite(minutes))return "";
 const at=new Date(from);
 at.setHours(hours,minutes,0,0);
 if(at.getTime()<=from.getTime())at.setDate(at.getDate()+1);
 return at.toISOString();
}
function durationLabel(minutes:number){
 const whole=Math.round(minutes);
 return whole>=60?Math.floor(whole/60)+"h "+(whole%60)+"m":whole+"m";
}

/* Pulsing count in the shared nav. Only ever shows buses over the 90-minute
   line — under that, DEFERRED is working exactly as intended and nothing
   needs to flash. */
export function DeferredNavBadge(){
 const [count,setCount]=useState(0);
 useEffect(()=>{
  const recompute=()=>{
   const now=new Date();
   const overdue=heldDeferredRows(readFleet(),readDown()).filter(row=>{
    const minutes=deferredMinutesElapsed(row.defect,now);
    return minutes!==null&&minutes>=OVERDUE_MINUTES;
   });
   setCount(overdue.length);
  };
  recompute();
  const interval=setInterval(recompute,60000);
  const onStorage=(event:StorageEvent)=>{if(!event.key||event.key===FLEET_KEY||event.key===DOWN_KEY)recompute()};
  window.addEventListener("storage",onStorage);
  return ()=>{clearInterval(interval);window.removeEventListener("storage",onStorage)};
 },[]);
 if(!count)return null;
 return <a href="/defect-log" className="deferred-nav-badge" role="status" aria-label={count+" bus"+(count===1?"":"es")+" deferred over 90 minutes — open Defect Log"}><span aria-hidden="true">🚨</span> {count} DEFERRED</a>;
}

type ReviewAction="keep"|"downsheet"|"return";

function DeferredReviewModal({bus,defect,fleet,minutes,submit,dismiss}:{
 bus:DefectLogFleetBus;defect:StructuredDefect;fleet:DefectLogFleetBus[];minutes:number;
 submit:(action:ReviewAction,location:string,keepUntilISO?:string)=>void;dismiss:()=>void;
}){
 const [action,setAction]=useState<ReviewAction>("keep");
 const [keepUntil,setKeepUntil]=useState("");
 const [location,setLocation]=useState("");
 const currentArea=sectionForLocation(bus.l);
 const choices=Object.entries(RELOCATION_AREAS).map(([name,slots])=>({name,current:slots.includes(bus.l),open:slots.filter(slot=>!fleet.some(item=>item.l===slot)).length}));
 const submitForm=(event:React.FormEvent)=>{
  event.preventDefault();
  if(action==="keep"){
   const iso=nextOccurrenceISO(keepUntil,new Date());
   if(!iso){alert("Choose a time to keep this bus deferred until.");return}
   submit("keep",location,iso);
   return;
  }
  submit(action,location);
 };
 return <div className="shade deferred-review-shade" onMouseDown={event=>{if(event.target===event.currentTarget)dismiss()}}>
  <form className="modal deferred-review-modal" onSubmit={submitForm}>
   <header className="mhead"><span><small>THIRD SHIFT IS COMING — STILL DEFERRED</small><h2>Bus {bus.n}</h2></span><button type="button" onClick={dismiss} aria-label="Ask again later">×</button></header>
   <div className="deferred-review-body">
    <p className="deferred-review-summary"><b>{repairCategoryLabel(defect.category)}</b><span>{defectLabel(defect)}</span><small>Deferred for {durationLabel(minutes)}, since {new Date(defect.deferredAt||"").toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small></p>
    <div className="deferred-review-choices">
     <label className={action==="keep"?"selected":""}><input type="radio" name="deferred-review-action" checked={action==="keep"} onChange={()=>setAction("keep")}/><span><b>KEEP DEFERRED</b><small>Pick a time to check again</small></span></label>
     {action==="keep"&&<input className="deferred-review-time" type="time" required value={keepUntil} onChange={event=>setKeepUntil(event.target.value)} aria-label="Keep deferred until"/>}
     <label className={action==="downsheet"?"selected":""}><input type="radio" name="deferred-review-action" checked={action==="downsheet"} onChange={()=>setAction("downsheet")}/><span><b>PUT ON DOWN SHEET</b><small>Escalates it — no longer held back quietly</small></span></label>
     <label className={action==="return"?"selected":""}><input type="radio" name="deferred-review-action" checked={action==="return"} onChange={()=>setAction("return")}/><span><b>RETURN TO SERVICE WITH DEFECTS</b><small>Bus goes back out, repair stays open</small></span></label>
    </div>
    <label className="deferred-review-location">LOCATION (OPTIONAL)<select value={location} onChange={event=>setLocation(event.target.value)}><option value="">Leave at {locationLabel(bus.l)}</option>{choices.map(choice=><option value={choice.name} disabled={!choice.current&&!choice.open} key={choice.name}>{choice.name+(choice.name===currentArea?" — CURRENT":choice.open?" — "+choice.open+" OPEN":" — FULL")}</option>)}</select></label>
   </div>
   <footer className="actions deferred-review-actions"><button type="button" onClick={dismiss}>ASK ME LATER</button><span/><button type="submit" className="save">CONFIRM</button></footer>
  </form>
 </div>;
}

export function DeferredReviewPrompt(){
 const [fleet,setFleet]=useState<DefectLogFleetBus[]>([]);
 const [downEntries,setDownEntries]=useState<DefectLogDownEntry[]>([]);
 const [dismissed,setDismissed]=useState<Record<string,string>>({});
 const [now,setNow]=useState<Date|null>(null);

 useEffect(()=>{
  const tick=()=>{setFleet(readFleet());setDownEntries(readDown());setDismissed(readDismissed());setNow(new Date())};
  tick();
  const interval=setInterval(tick,60000);
  const onStorage=(event:StorageEvent)=>{if(!event.key||event.key===FLEET_KEY||event.key===DOWN_KEY)tick()};
  window.addEventListener("storage",onStorage);
  return ()=>{clearInterval(interval);window.removeEventListener("storage",onStorage)};
 },[]);

 const candidate=useMemo(()=>{
  if(!now||!isReviewWindowOpen(now))return null;
  return heldDeferredRows(fleet,downEntries).find(row=>{
   const minutes=deferredMinutesElapsed(row.defect,now);
   if(minutes===null||minutes<REVIEW_MINUTES)return false;
   if(row.defect.deferredUntil&&new Date(row.defect.deferredUntil).getTime()>now.getTime())return false;
   return dismissed[row.defect.id]!==todayKey();
  })||null;
 },[fleet,downEntries,dismissed,now]);

 if(!candidate||!now)return null;
 const minutes=deferredMinutesElapsed(candidate.defect,now)||0;

 const submit=(action:ReviewAction,location:string,keepUntilISO?:string)=>{
  const stamp=new Date().toISOString();
  const moved=location?moveBusToArea(fleet,candidate.bus.id,location,RELOCATION_AREAS,stamp).fleet:fleet;
  const patch:Partial<StructuredDefect>=action==="keep"
   ?{state:"deferred",deferredUntil:keepUntilISO}
   /* "return" is the same "held back, back in service, still open" moment as
      unchecking DEFERRED by hand — stamp it. "downsheet" invalidates it: the
      Down Sheet is now the record of what happens to this repair. */
   :{state:"open",deferredAt:undefined,deferredUntil:undefined,deferredReturnedAt:action==="return"?stamp:undefined};
  const result=saveDefectLogRecord(moved,downEntries,candidate.bus.id,{...candidate.defect,...patch},action==="downsheet",stamp);
  if(result.error)return;
  writeFleetStorageResult(localStorage,result.fleet);
  writeDownSheetStorageResult(localStorage,result.downEntries);
  setFleet(result.fleet);setDownEntries(result.downEntries);
 };
 const dismiss=()=>{dismissToday(candidate.defect.id);setDismissed(readDismissed())};

 return <DeferredReviewModal bus={candidate.bus} defect={candidate.defect} fleet={fleet} minutes={minutes} submit={submit} dismiss={dismiss}/>;
}
