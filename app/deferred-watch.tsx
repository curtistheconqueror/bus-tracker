"use client";

/* The B12 safety net for DEFERRED buses.

   Deferred exists so a mechanic can hold a bus back from service without
   putting it on the Down Sheet — "not fixed yet, not ready to escalate
   either." Left alone that is exactly the kind of thing that gets forgotten:
   nothing about it shows up anywhere else, and by the next shift nobody
   remembers it was ever set aside.

   Two pieces close that gap, both self-contained so they can be dropped into
   every page's nav without any page threading fleet state through props:

     - DeferredNavBadge: appears once a bus passes 90 minutes, visible
       everywhere, and opens the Deferred filter showing the buses it counts.
     - DeferredReviewPrompt: from 8:30pm on — when third shift buses are
       usually being decided — asks about any bus still deferred past an
       hour, ONE BUS AT A TIME whatever number of repairs are holding it,
       with three ways out: keep it deferred until a chosen time, put it on
       the Down Sheet, or return it to service with the defects still open.
       A location update rides along, since this is often the moment that
       gets decided too. It is the one thing in this app that opens itself
       over whatever you were doing, so the Defect Log settings can switch
       it off; the 🚨 DEFERRED badge above is not tied to the switch.

   Both read localStorage directly rather than depending on a host page's own
   state, which is also why a change made here needs a refresh to show up on
   a DIFFERENT tab already open elsewhere — the same limitation every page in
   this app already has, not a new one. */

import {useEffect,useMemo,useState} from "react";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,RECORDS_WRITTEN_EVENT,readDownSheetStorage,readFleetStorage,writeDownSheetStorageResult,writeFleetStorageResult} from "./storage";
import {defectLabel,deferredMinutesElapsed,normalizeDefects,repairCategoryLabel,type StructuredDefect} from "./repair-catalog";
import {saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus} from "./defect-log/defect-log-sync";
import {moveBusToArea,RELOCATION_AREAS,sectionForLocation} from "./facility-areas";
import {QUICK_FILTER_EVENT,quickFilterHref} from "./quick-filters";
import {deferredBadgeCounts,heldDeferredBuses} from "./deferred-counts";
import {SETTINGS_KEY as LOG_SETTINGS_KEY} from "./defect-log/defect-log-settings";

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

function todayKey(){return new Date().toDateString()}
function readDismissed():Record<string,string>{
 try{return JSON.parse(localStorage.getItem(DISMISS_KEY)||"{}") as Record<string,string>}catch{return {}}
}
function dismissToday(defectId:string){
 try{localStorage.setItem(DISMISS_KEY,JSON.stringify({...readDismissed(),[defectId]:todayKey()}))}catch{/* Missing a dismissal only means an extra prompt, never a stuck one. */}
}

/* Read as one field rather than through readSettings, the way the Down Sheet
   already reads this key for its display settings: this component renders on
   all five pages and has no business pulling the Defect Log's theme, colour and
   wording defaults into every one of them to answer a yes/no question.

   Absent means on. A device that has never opened the settings panel has no
   copy of this key at all. */
function reviewPromptEnabled(){
 try{return (JSON.parse(localStorage.getItem(LOG_SETTINGS_KEY)||"{}") as {deferredReviewPrompt?:unknown}).deferredReviewPrompt!==false}catch{return true}
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

export function DeferredNavBadge(){
 /* Two numbers, because the badge answers two questions at once: whether to
    appear, and what it will show you when pressed.

    It appears only once a bus has crossed the ninety-minute line — under that,
    DEFERRED is working as intended and nothing needs to flash. But the number
    printed on it is the count of BUSES the filter will list, so the badge and
    the drawer it opens can never disagree.

    It used to print the overdue count, which was wrong twice over. It disagreed
    with the list — press 3 DEFERRED, get four buses — and because these rows
    are one per DEFECT, a single bus held on two repairs counted as two. Both
    counts are deduplicated by bus now, and the drawer's own exclusions are the
    same ones heldDeferredRows already applies. */
 const [state,setState]=useState({listed:0,overdue:0});
 useEffect(()=>{
  const recompute=()=>setState(deferredBadgeCounts(readFleet(),readDown()));
  recompute();
  const interval=setInterval(recompute,60000);
  const onStorage=(event:StorageEvent)=>{if(!event.key||event.key===FLEET_KEY||event.key===DOWN_KEY)recompute()};
  window.addEventListener("storage",onStorage);
  /* `storage` fires in OTHER tabs only, so on the page that did the writing
     this badge went stale: defer a bus, or end a deferral, and the count did
     not move until the minute tick or a reload. Curtis reported exactly that.
     The writers announce a successful write in this document too. */
  window.addEventListener(RECORDS_WRITTEN_EVENT,recompute);
  return ()=>{clearInterval(interval);window.removeEventListener("storage",onStorage);window.removeEventListener(RECORDS_WRITTEN_EVENT,recompute)};
 },[]);
 /* Pressing it has to actually show the buses it is counting.

    It used to be a bare link to /defect-log, which meant that on the Defect Log
    — where this badge also renders — it pointed at the page already on screen
    and did nothing at all. Even from elsewhere it only landed on the log with
    no filter, leaving the overdue buses wherever they happened to sit in the
    list, which is the one thing a 90-minute alarm must not do.

    It now opens the Deferred quick filter, which already lists exactly these
    buses, longest-held first, and marks the ones past 90 minutes. */
 const openDeferredFilter=(event:React.MouseEvent<HTMLAnchorElement>)=>{
  if(window.location.pathname!=="/defect-log")return;
  event.preventDefault();
  window.dispatchEvent(new CustomEvent(QUICK_FILTER_EVENT,{detail:"deferred"}));
 };
 if(!state.overdue)return null;
 return <a href={quickFilterHref("deferred")} onClick={openDeferredFilter} className="deferred-nav-badge" role="status" aria-label={state.listed+" bus"+(state.listed===1?"":"es")+" held from service, "+state.overdue+" over 90 minutes — show them in the Defect Log"}><span aria-hidden="true">🚨</span> {state.listed} DEFERRED</a>;
}

type ReviewAction="keep"|"downsheet"|"return";

function DeferredReviewModal({bus,defect,alsoHeld,fleet,minutes,submit,dismiss}:{
 bus:DefectLogFleetBus;defect:StructuredDefect;alsoHeld:number;fleet:DefectLogFleetBus[];minutes:number;
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
    <p className="deferred-review-summary"><b>{repairCategoryLabel(defect.category)}</b><span>{defectLabel(defect)}</span><small>Deferred for {durationLabel(minutes)}, since {new Date(defect.deferredAt||"").toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</small>{alsoHeld>0&&<small className="deferred-review-also">AND {alsoHeld} MORE DEFERRED REPAIR{alsoHeld===1?"":"S"} ON THIS BUS — one answer covers the whole bus</small>}</p>
    <div className="deferred-review-choices">
     <label className={action==="keep"?"selected":""}><input type="radio" name="deferred-review-action" checked={action==="keep"} onChange={()=>setAction("keep")}/><span><b>KEEP DEFERRED</b><small>Pick a time to check again — nothing asks about this bus until then</small></span></label>
     {action==="keep"&&<input className="deferred-review-time" type="time" required value={keepUntil} onChange={event=>setKeepUntil(event.target.value)} aria-label="Keep deferred until"/>}
     <label className={action==="downsheet"?"selected":""}><input type="radio" name="deferred-review-action" checked={action==="downsheet"} onChange={()=>setAction("downsheet")}/><span><b>PUT ON DOWN SHEET</b><small>Escalates it — no longer held back quietly</small></span></label>
     <label className={action==="return"?"selected":""}><input type="radio" name="deferred-review-action" checked={action==="return"} onChange={()=>setAction("return")}/><span><b>RETURN TO SERVICE WITH DEFECTS</b><small>Bus goes back out, every repair on it stays open</small></span></label>
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
 const [enabled,setEnabled]=useState(true);
 const [now,setNow]=useState<Date|null>(null);

 useEffect(()=>{
  const tick=()=>{setFleet(readFleet());setDownEntries(readDown());setDismissed(readDismissed());setEnabled(reviewPromptEnabled());setNow(new Date())};
  tick();
  const interval=setInterval(tick,60000);
  const onStorage=(event:StorageEvent)=>{if(!event.key||event.key===FLEET_KEY||event.key===DOWN_KEY||event.key===LOG_SETTINGS_KEY)tick()};
  window.addEventListener("storage",onStorage);
  return ()=>{clearInterval(interval);window.removeEventListener("storage",onStorage)};
 },[]);

 /* One prompt per BUS, not per defect.

    It used to ask per defect while showing "Bus 9911" at the top, so a bus
    held on three repairs asked three times: answer it, and the same bus came
    straight back with a different repair underneath the same heading. Setting
    a keep-until time stamped one repair and left the other two with nothing,
    which is exactly the "it pops up no matter what when I open the app" Curtis
    reported — measured in a browser at 21:00 with a three-defect bus, the
    prompt reappeared twice more and again after a reload.

    The bus is what the answer is about, so the bus is what the question is
    about. A bus drops out entirely if ANY of its held repairs is snoozed past
    now or was put off today: the answer covered the bus, so one repair
    carrying it speaks for all of them. */
 const candidate=useMemo(()=>{
  if(!now||!enabled||!isReviewWindowOpen(now))return null;
  const due=heldDeferredBuses(fleet,downEntries)
   .filter(held=>!held.defects.some(defect=>dismissed[defect.id]===todayKey()||Boolean(defect.deferredUntil&&new Date(defect.deferredUntil).getTime()>now.getTime())))
   .map(held=>({...held,ready:held.defects.filter(defect=>{const minutes=deferredMinutesElapsed(defect,now);return minutes!==null&&minutes>=REVIEW_MINUTES})}))
   .find(held=>held.ready.length>0);
  /* The longest-held repair leads the card. It is the one the hour is really
     about, and it keeps the card stable across re-renders. */
  return due?{bus:due.bus,defects:due.defects,lead:due.ready.reduce((longest,defect)=>(deferredMinutesElapsed(defect,now)||0)>(deferredMinutesElapsed(longest,now)||0)?defect:longest)}:null;
 },[fleet,downEntries,dismissed,enabled,now]);

 if(!candidate||!now)return null;
 const minutes=deferredMinutesElapsed(candidate.lead,now)||0;

 const submit=(action:ReviewAction,location:string,keepUntilISO?:string)=>{
  const stamp=new Date().toISOString();
  let nextFleet=location?moveBusToArea(fleet,candidate.bus.id,location,RELOCATION_AREAS,stamp).fleet:fleet;
  let nextDown=downEntries;
  /* PUT ON DOWN SHEET moves one repair, because the sheet allows a bus only one
     active entry — and it needs no more: once the bus is on the sheet
     heldDeferredRows drops every repair holding it, so the rest stop asking on
     their own and the sheet becomes the record for all of them. The other two
     answers are statements about the bus, so they are written to every repair
     holding it back. */
  const targets=action==="downsheet"?[candidate.lead]:candidate.defects;
  let saved=0;
  for(const defect of targets){
   const patch:Partial<StructuredDefect>=action==="keep"
    ?{state:"deferred",deferredUntil:keepUntilISO}
    /* "return" is the same "held back, back in service, still open" moment as
       unchecking DEFERRED by hand — stamp it. "downsheet" invalidates it: the
       Down Sheet is now the record of what happens to this repair. */
    :{state:"open",deferredAt:undefined,deferredUntil:undefined,deferredReturnedAt:action==="return"?stamp:undefined};
   const result=saveDefectLogRecord(nextFleet,nextDown,candidate.bus.id,{...defect,...patch},action==="downsheet",stamp);
   if(result.error)continue;
   nextFleet=result.fleet;nextDown=result.downEntries;saved++;
  }
  /* Both writes were fired and their results thrown away, so a refused write
     closed the prompt as though it had worked: the answer left the screen,
     nothing reached the device, and the same bus asked again on the next open
     with no explanation. A refusal now says so and leaves the card up.

     The fleet goes first and alone, because the two are not one write: a fleet
     that saved and a sheet that did not is a real outcome, and telling somebody
     nothing was saved when the bus already moved is its own kind of wrong. */
  const wroteFleet=writeFleetStorageResult(localStorage,nextFleet);
  if(!wroteFleet.ok){
   alert("That answer could not be saved on this device"+(wroteFleet.reason==="storage-full"?" — storage is full":"")+". Bus "+candidate.bus.n+" is still deferred. Back up and clear some space from the Defect Log, then try again.");
   return;
  }
  const wroteDown=writeDownSheetStorageResult(localStorage,nextDown);
  setFleet(nextFleet);setDownEntries(nextDown);
  if(!wroteDown.ok)alert("Bus "+candidate.bus.n+" was updated, but the Down Sheet could not be saved on this device. Check the sheet before relying on it.");
  else if(!saved)alert("Nothing on Bus "+candidate.bus.n+" would save — the repairs it is held on are no longer where the prompt expected them. Open the bus on the Defect Log.");
  else if(saved<targets.length)alert("Bus "+candidate.bus.n+" was updated, but "+(targets.length-saved)+" of its repairs would not save. Check the bus on the Defect Log.");
 };
 /* ASK ME LATER puts the whole bus off until tomorrow, for the same reason the
    answers above cover the whole bus: dismissing one repair only handed you the
    next one on the same bus. */
 const dismiss=()=>{for(const defect of candidate.defects)dismissToday(defect.id);setDismissed(readDismissed())};

 return <DeferredReviewModal bus={candidate.bus} defect={candidate.lead} alsoHeld={candidate.defects.length-1} fleet={fleet} minutes={minutes} submit={submit} dismiss={dismiss}/>;
}
