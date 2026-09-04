"use client";

import {useEffect,useMemo,useState} from "react";
import TrackerNav from "../tracker-nav";
import "./fixed-repairs.css";
import {useFixedAppearance} from "./fixed-repairs-settings";
import {defectCountField,defectLabel,defectWorkStates,isDiagnosticDefect,MINIMUM_DIAGNOSTIC_HOURS,normalizeDiagnosticHours,normalizeFinding,normalizeRepairHours,normalizeDefects,REPAIR_OPTIONS,repairCategoryLabel,workStateStampLabel,type DefectOperability,type StructuredDefect,partNumberMissing} from "../repair-catalog";
import {EMPTY_PARTS_MEMORY,forgetPart,learnPart,readPartsMemory,recallPart,writePartsMemory,type PartMemoryEntry,type PartMemoryScope,type PartsMemory} from "../parts-memory";
import {EMPTY_FINDINGS_MEMORY,findingMatchKey,forgetFinding,learnFinding,readFindingsMemory,recallFindings,writeFindingsMemory,type FindingMemoryEntry,type FindingsMemory} from "../findings-memory";
import type {DefectLogFleetBus} from "../defect-log/defect-log-sync";
import {DeferredNavBadge,DeferredReviewPrompt} from "../deferred-watch";
import {exportFleetBoardBackup,REPORT_EXPORT_HINT} from "../fleet-backup";
import {shareOrDownloadFile} from "../share-file";
import {FLEET_STORAGE_KEY as FLEET_KEY,readFleetPayload,writeFleetStorageResult,type FleetWriteReason} from "../storage";
import SaveAlert from "../save-alert";

/* How many completed repairs render at once.

   Every record here rendered unconditionally, which is fine at Curtis's scale
   today — a few hundred repairs — and is not fine at the scale this app is
   built for. Measured against a 400-bus board with three years of history:
   4,000 completed repairs produced 72,868 DOM nodes on this one page, an
   856ms first load, and a phone that stalls or a mobile Safari tab that gets
   killed outright. Nothing was wrong with any single repair; the page simply
   never stopped rendering.

   50 renders at once, newest first, with SHOW MORE and SHOW ALL underneath.
   Nothing is ever hidden from search or the category filter — both run over
   every record before this cap is applied, so a repair from three years ago
   is still found by typing its bus number. The cap only limits how many of
   the MATCHES render before somebody asks for more, exactly like turning a
   page rather than losing a book. */
const PAGE_SIZE=50;

type FixedRecord={bus:DefectLogFleetBus;defect:StructuredDefect};
type CompletionDraft={category:string;issue:string;details:string;operability:DefectOperability;actionTaken:string;diagnosticNote:string;finding:string;quantity:string;repairHours:string;diagnosticHours:string;partNumber:string;partsUsed:boolean;partName:string;rememberScope?:PartMemoryScope;completedBy:string;completedAt:string};
type UndoSnapshot={fleet:DefectLogFleetBus[];label:string};

function readFleet(raw:string|null):DefectLogFleetBus[]{const payload=readFleetPayload<DefectLogFleetBus>(raw);return payload.valid?payload.buses.map(bus=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[]}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Not recorded":new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date)}
function localDateTime(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return "";return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function locationLabel(location:string){const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["office-","Foreman Office"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];return labels.find(([prefix])=>location.startsWith(prefix))?.[1]||location||"Location not recorded"}

function CompletionEditor({record,partsMemory,forgetPart:forgetLearned,findingsMemory,forgetFinding:forgetLearnedFinding,save,close,isNew=false,fleet=[],onBusChange}:{record:FixedRecord;partsMemory:PartsMemory;forgetPart:(entry:PartMemoryEntry)=>void;findingsMemory:FindingsMemory;forgetFinding:(entry:FindingMemoryEntry)=>void;save:(record:FixedRecord,draft:CompletionDraft)=>void;close:()=>void;isNew?:boolean;fleet?:DefectLogFleetBus[];onBusChange?:(busId:string)=>void}){
 const [draft,setDraft]=useState<CompletionDraft>({category:record.defect.category,issue:record.defect.issue,details:record.defect.details||"",operability:record.defect.operability,actionTaken:record.defect.actionTaken||"",diagnosticNote:record.defect.diagnosticNote||"",finding:record.defect.finding||"",quantity:record.defect.quantity===undefined?"":String(record.defect.quantity),repairHours:record.defect.repairHours===undefined?"":String(record.defect.repairHours),diagnosticHours:record.defect.diagnosticHours===undefined?"":String(record.defect.diagnosticHours),partNumber:record.defect.partNumber||"",partsUsed:record.defect.partsUsed??Boolean(String(record.defect.partNumber||"").trim()),partName:record.defect.partName||"",rememberScope:"issue",completedBy:record.defect.completedBy||"",completedAt:localDateTime(record.defect.completedAt||record.defect.updatedAt||new Date().toISOString())});
 const remembered=recallPart(partsMemory,draft.category,draft.issue);
 /* Checking the box offers the remembered part and never overwrites typing. */
 const togglePartsUsed=(checked:boolean)=>setDraft(current=>{
  if(!checked)return {...current,partsUsed:false,partNumber:"",partName:""};
  const suggestion=recallPart(partsMemory,current.category,current.issue),hasNumber=Boolean(current.partNumber.trim());
  return {...current,partsUsed:true,rememberScope:current.rememberScope||"issue",
   partNumber:hasNumber||!suggestion?current.partNumber:suggestion.partNumber,
   partName:hasNumber||!suggestion?current.partName:suggestion.partName||""};
 });
 const update=<K extends keyof CompletionDraft>(key:K,value:CompletionDraft[K])=>setDraft(current=>({...current,[key]:value}));
 const issues=REPAIR_OPTIONS[draft.category]||[],countField=defectCountField(draft.category,draft.issue);
 const learnedFindings=recallFindings(findingsMemory,draft.category,draft.issue);
 return <div className="fixed-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><form className="fixed-editor" onSubmit={event=>{event.preventDefault();save(record,draft)}}>
  <header><span><small>{isNew?"LOG A REPAIR":"FIXED REPAIR"}</small><h2>{isNew?"Fixed without a defect":"Bus "+record.bus.n}</h2></span><button type="button" onClick={close} aria-label="Close fixed repair editor">×</button></header>
  {/* A repair done without a defect ever being logged has no bus yet, so the
      bus is picked here. Every other field on this form already applies. */}
  {isNew&&<section className="fixed-new-bus"><label>BUS<select value={record.bus.id} onChange={event=>onBusChange?.(event.target.value)}>{fleet.map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n} — {locationLabel(bus.l)}</option>)}</select></label><small>Pick the bus, then fill in the repair below. It saves straight to this page as a completed record.</small></section>}
  <div className="fixed-editor-body">
   <section className="fixed-original"><b>EDIT THE FULL REPAIR RECORD</b><small>Logged {timeLabel(record.defect.createdAt||"")} · {locationLabel(record.defect.reportedLocation||record.bus.l)}{record.defect.reportedBy?" · Reported by "+record.defect.reportedBy:""}</small></section>
   <label>CATEGORY<select value={draft.category} onChange={event=>setDraft(current=>({...current,category:event.target.value,issue:"",quantity:"",partsUsed:false,partNumber:"",partName:"",rememberScope:undefined}))}>{Object.keys(REPAIR_OPTIONS).map(category=><option value={category} key={category}>{repairCategoryLabel(category)}</option>)}</select></label>
   <label>DEFECT / REPAIR<select value={draft.issue} onChange={event=>setDraft(current=>({...current,issue:event.target.value,quantity:"",partsUsed:false,partNumber:"",partName:"",rememberScope:undefined}))}>{draft.issue&&!issues.includes(draft.issue)&&<option>{draft.issue}</option>}<option value="">Choose repair</option>{issues.map(issue=><option key={issue}>{issue}</option>)}</select></label>
   {/* Counted here as well as in the Defect Log, because how many air bags
       actually went on is only known once the bus is back together, and this is
       the page open at that moment. */}
   {countField&&<label>{countField.label}<select value={draft.quantity} onChange={event=>update("quantity",event.target.value)}><option value="">{countField.prompt}</option>{Array.from({length:countField.max},(_,index)=>index+1).map(count=><option value={String(count)} key={count}>{count}</option>)}</select></label>}
   <label className="wide">ORIGINAL DESCRIPTION<textarea value={draft.details} onChange={event=>update("details",event.target.value)} placeholder="Original defect, symptom, or report"/></label>
   <label className="wide">BUS AVAILABILITY<select value={draft.operability} onChange={event=>update("operability",event.target.value as DefectOperability)}><option value="service">May Stay In Service</option><option value="down">Remove From Service</option></select></label>
   <label className="wide">FIX / STEPS TAKEN<textarea autoFocus value={draft.actionTaken} onChange={event=>update("actionTaken",event.target.value)} placeholder="What was repaired, adjusted, replaced, or reset? Include useful steps for the next diagnosis."/></label>
   <label className="wide">DIAGNOSIS / TEST / VERIFICATION<textarea value={draft.diagnosticNote} onChange={event=>update("diagnosticNote",event.target.value)} placeholder="Codes, tests, root cause, or how the repair was verified"/></label>
   {/* Editable here as well as in the Defect Log: a fault is very often only
       properly named once the bus is apart, and that is the moment this page is
       open. It reads back onto the repair everywhere, the Down Sheet included. */}
   <label className="wide">WHAT WAS FOUND (OPTIONAL)<input maxLength={180} value={draft.finding} onChange={event=>update("finding",event.target.value)} placeholder="Throttle pedal reference circuit"/></label>
   {learnedFindings.length>0&&<div className="wide learned-findings" aria-label="Causes found before on this repair">
    <small>FOUND BEFORE ON {(draft.issue||"THIS REPAIR").toUpperCase()}</small>
    <div>{learnedFindings.map(entry=>{
     const picked=findingMatchKey(entry.finding)===findingMatchKey(draft.finding);
     return <span className={"learned-finding"+(picked?" selected":"")} key={entry.finding}>
      <button type="button" onClick={()=>update("finding",picked?"":entry.finding)} aria-pressed={picked}>{entry.finding}{entry.uses>1?<i>×{entry.uses}</i>:null}</button>
      <button type="button" className="forget-finding" title={"Forget "+entry.finding} aria-label={"Forget "+entry.finding} onClick={()=>forgetLearnedFinding(entry)}>×</button>
     </span>;
    })}</div>
   </div>}
   {defectWorkStates(record.defect).length>0&&<p className="wide completion-work-states"><b>WORK RECORDED</b><span>{defectWorkStates(record.defect).map(state=>{const who=workStateStampLabel(record.defect.workStates?.[state.key]);return <i className={"work-state-badge "+state.key} key={state.key}>{state.label}{who?" — "+who:""}</i>})}</span></p>}
   <div className="parts-used-block wide">
    <label className="parts-used-toggle"><input type="checkbox" checked={draft.partsUsed} onChange={event=>togglePartsUsed(event.target.checked)}/><span><b>PARTS USED</b><small>Record the part that fixed this repair. Leave it off if none were used.</small></span></label>
    {draft.partsUsed&&<div className="parts-used-fields">
     <label>PART NUMBER<input value={draft.partNumber} onChange={event=>update("partNumber",event.target.value)} placeholder="Leave blank if the number is unknown"/></label>
     <label>PART NAME (OPTIONAL)<input value={draft.partName} onChange={event=>update("partName",event.target.value)} placeholder="Exact catalog name"/></label>
     <label className="parts-remember-scope"><input type="checkbox" checked={draft.rememberScope==="category"} onChange={event=>setDraft(current=>({...current,rememberScope:event.target.checked?"category":"issue"}))}/><span><b>REMEMBER FOR EVERY {(draft.category||"THIS CATEGORY").toUpperCase()} DEFECT</b><small>Off remembers the part for this exact defect only.</small></span></label>
     {remembered&&<p className="parts-remembered"><span><b>REMEMBERED</b>{remembered.partNumber}{remembered.partName?" — "+remembered.partName:""}<small>{remembered.scope==="category"?"Saved for the whole category":"Saved for this exact defect"} · used {remembered.uses}×</small></span><button type="button" onClick={()=>forgetLearned(remembered)}>FORGET</button></p>}
    </div>}
   </div>
   <fieldset className={"wide billable-time"+(isDiagnosticDefect(draft.category,draft.issue)?" diagnostic":"")}><legend>BILLABLE TIME — OPTIONAL</legend>
    <div>
     <label>REPAIR HOURS<input inputMode="decimal" value={draft.repairHours} placeholder=".5" onChange={event=>update("repairHours",event.target.value)}/></label>
     <label>DIAGNOSTIC HOURS<input inputMode="decimal" value={draft.diagnosticHours} placeholder={String(MINIMUM_DIAGNOSTIC_HOURS)} onChange={event=>update("diagnosticHours",event.target.value)}/></label>
    </div>
    <small>{isDiagnosticDefect(draft.category,draft.issue)
     ?"This is a diagnostic defect, so the two are kept apart: a bus can be diagnosed on one shift and fixed on another."
     :"Decimal hours: .5 is half an hour. Leave blank if no time is being billed."}</small>
   </fieldset>
   <label>FIXED BY<input maxLength={12} autoCapitalize="characters" value={draft.completedBy} onChange={event=>update("completedBy",event.target.value.replace(/[^a-z0-9 .-]/gi,"").toUpperCase())} placeholder="Initials or name"/></label>
   <label className="wide">FIXED DATE &amp; TIME<input type="datetime-local" value={draft.completedAt} onChange={event=>update("completedAt",event.target.value)}/></label>
  </div>
  <footer><button type="button" onClick={close}>CLOSE</button><button className="save-fixed-repair">SAVE FIX DETAILS</button></footer>
 </form></div>
}

export default function FixedRepairs(){
 const [fleet,setFleet]=useState<DefectLogFleetBus[]>([]),[search,setSearch]=useState(""),[category,setCategory]=useState("all"),[editing,setEditing]=useState<FixedRecord|null>(null),[newRepair,setNewRepair]=useState<FixedRecord|null>(null),[saveProblem,setSaveProblem]=useState<FleetWriteReason|"">(""),[undoSnapshot,setUndoSnapshot]=useState<UndoSnapshot|null>(null);
 const [partsMemory,setPartsMemory]=useState<PartsMemory>(EMPTY_PARTS_MEMORY);
 useEffect(()=>setPartsMemory(readPartsMemory(localStorage)),[]);
 const forgetLearnedPart=(entry:PartMemoryEntry)=>setPartsMemory(current=>{const next=forgetPart(current,entry.scope,entry.category,entry.issue);writePartsMemory(localStorage,next);return next});
 const [findingsMemory,setFindingsMemory]=useState<FindingsMemory>(EMPTY_FINDINGS_MEMORY);
 useEffect(()=>setFindingsMemory(readFindingsMemory(localStorage)),[]);
 const forgetLearnedFinding=(entry:FindingMemoryEntry)=>setFindingsMemory(current=>{const next=forgetFinding(current,entry.category,entry.issue,entry.finding);writeFindingsMemory(localStorage,next);return next});
 const {style:appearanceStyle}=useFixedAppearance();
 useEffect(()=>{setFleet(readFleet(localStorage.getItem(FLEET_KEY)))},[]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY)setFleet(readFleet(event.newValue))};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);
 const records=useMemo(()=>fleet.flatMap(bus=>normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.state==="completed").map(defect=>({bus,defect}))).sort((a,b)=>(b.defect.completedAt||b.defect.updatedAt||"").localeCompare(a.defect.completedAt||a.defect.updatedAt||"")),[fleet]);
 const categories=useMemo(()=>[...new Set(records.map(record=>record.defect.category))].sort(),[records]);
 const visible=useMemo(()=>{const query=search.trim().toLowerCase();return records.filter(record=>(category==="all"||record.defect.category===category)&&(!query||[record.bus.n,record.defect.category,record.defect.issue,record.defect.details,record.defect.actionTaken,record.defect.diagnosticNote,record.defect.finding,record.defect.shopNotes,record.defect.partNumber,record.defect.reportedBy,record.defect.completedBy,record.defect.conditionNotDuplicated?"defect condition not duplicated":""].some(value=>String(value||"").toLowerCase().includes(query))))},[records,search,category]);
 /* Collapses back to the first page on a new search or category, rather than
    staying wherever SHOW ALL last left it. A person narrowing the list wants
    the top of the new result, not five hundred rows in from an unrelated
    browse. */
 const [visibleCount,setVisibleCount]=useState(PAGE_SIZE);
 useEffect(()=>setVisibleCount(PAGE_SIZE),[search,category]);
 const windowed=useMemo(()=>visible.slice(0,visibleCount),[visible,visibleCount]);
 const hiddenCount=visible.length-windowed.length;
 /* Returns whether the board was actually written. It used to return nothing,
    so every caller carried on as if the save had happened. */
 const persistFleet=(next:DefectLogFleetBus[])=>{
  const written=writeFleetStorageResult(localStorage,next);
  setSaveProblem(written.reason||"");
  if(!written.ok)return false;
  setFleet(next);return true;
 };
 /* Nothing may claim a change that was refused. The undo snapshot, closing the
    editor and the "Logged Bus 1462" label all used to run regardless — so a
    phone at its storage limit closed the form, said nothing, and offered to
    undo a record it had never written. On this page that could be the only
    copy of a repair, because LOG A REPAIR creates records that exist nowhere
    else. A refused write now leaves the editor open with the banner showing,
    so the mechanic still has what they typed. */
 const changeFleet=(next:DefectLogFleetBus[],label:string)=>{
  const before=fleet;
  if(!persistFleet(next))return false;
  setUndoSnapshot({fleet:before,label});setEditing(null);return true;
 };
 const saveCompletion=(record:FixedRecord,draft:CompletionDraft)=>{/* A cause typed here has to be learned too. This is often where a fault gets its proper name, once the bus is apart, and a finding recorded on this page teaching nothing would be a gap nobody would notice. */if(normalizeFinding(draft.finding))setFindingsMemory(current=>{const next=learnFinding(current,{category:draft.category,issue:draft.issue,finding:draft.finding});writeFindingsMemory(localStorage,next);return next});if(draft.partsUsed&&draft.partNumber.trim())setPartsMemory(current=>{const learned=learnPart(current,{category:draft.category,issue:draft.issue,partNumber:draft.partNumber,partName:draft.partName,scope:draft.rememberScope});writePartsMemory(localStorage,learned);return learned});/* A count is only this page's business where the repair declares one. Retyping
   a fan record as something uncounted clears the count, because "3 fans" left
   on a radiator swap is a lie; an oil quantity, which no count field governs,
   is left exactly as the Defect Log wrote it. */
const countField=defectCountField(draft.category,draft.issue),hadCount=defectCountField(record.defect.category,record.defect.issue);
const countValue=countField?(Number(draft.quantity)>0?Number(draft.quantity):undefined):hadCount?undefined:record.defect.quantity;
const countUnit=countField?countField.unit:hadCount?undefined:record.defect.unit;
const parsed=new Date(draft.completedAt),completedAt=Number.isNaN(parsed.getTime())?(record.defect.completedAt||new Date().toISOString()):parsed.toISOString(),now=new Date().toISOString();
/* The saved shape, applied whether this record already exists on the bus or
   is being created here by LOG A REPAIR. */
const saved=(defect:StructuredDefect):StructuredDefect=>({...defect,category:draft.category,issue:draft.issue||"Unspecified issue",details:draft.details.trim(),operability:draft.operability,state:"completed",actionTaken:draft.actionTaken.trim(),diagnosticNote:draft.diagnosticNote.trim(),finding:normalizeFinding(draft.finding),quantity:countValue,unit:countUnit,repairHours:normalizeRepairHours(draft.repairHours),diagnosticHours:normalizeDiagnosticHours(draft.diagnosticHours),partNumber:draft.partNumber.trim(),partsUsed:draft.partsUsed,partName:draft.partName.trim(),completedBy:draft.completedBy.trim().toUpperCase(),completedAt,updatedAt:now});
/* A repair logged straight to this page has no defect on the bus yet, so it is
   appended rather than mapped over. Mapping alone would have written nothing
   and reported success — the record simply would not appear. */
const next=fleet.map(bus=>{
 if(bus.id!==record.bus.id)return bus;
 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),exists=current.some(defect=>defect.id===record.defect.id);
 return {...bus,defects:exists?current.map(defect=>defect.id!==record.defect.id?defect:saved(defect)):[...current,saved(record.defect)]};
});
const isNewRecord=!fleet.some(bus=>bus.id===record.bus.id&&normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).some(defect=>defect.id===record.defect.id));
if(changeFleet(next,(isNewRecord?"Logged Bus ":"Edited Bus ")+record.bus.n+" fixed repair"))setNewRepair(null)};
 const reopenRepair=(record:FixedRecord)=>{if(!confirm("Undo this fix and reopen the defect for Bus "+record.bus.n+"? It will return to the active Defect Log."))return;const now=new Date().toISOString(),next=fleet.map(bus=>bus.id!==record.bus.id?bus:{...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).map(defect=>defect.id!==record.defect.id?defect:{...defect,state:"open",completedAt:undefined,completedBy:undefined,defectLogHiddenAt:undefined,updatedAt:now})});changeFleet(next,"Reopened Bus "+record.bus.n+" defect")};
 const deleteRepair=(record:FixedRecord)=>{if(!confirm("Delete this repair record for Bus "+record.bus.n+"? You can immediately undo this action."))return;const next=fleet.map(bus=>bus.id!==record.bus.id?bus:{...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.id!==record.defect.id)});changeFleet(next,"Deleted Bus "+record.bus.n+" repair")};
 /* A repair somebody did without logging a defect first — which is how it
    happens on the floor more often than not. It opens the same editor every
    other record uses, so every field is already here: category, issue,
    description, fix, diagnosis, finding, parts, hours, who and when. The only
    thing missing from a blank record is the bus, so the editor asks for that
    and nothing else is different. */
 const logRepair=()=>{
  if(!fleet.length){alert("This device has no buses yet. Open the Facility Map first.");return}
  const now=new Date().toISOString();
  setNewRepair({bus:fleet[0],defect:{id:"fixed-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),category:"Miscellaneous",issue:"",details:"",operability:"service",state:"completed",source:"fixed-log",createdAt:now,updatedAt:now,completedAt:now} as StructuredDefect});
 };
 const undoLastChange=()=>{if(!undoSnapshot)return;persistFleet(undoSnapshot.fleet);setUndoSnapshot(null);setEditing(null);setNewRepair(null)};
 const exportHistory=()=>{const payload={kind:"fleet-fixed-repair-history",version:1,exportedAt:new Date().toISOString(),records:records.map(({bus,defect})=>({busNumber:bus.n,currentLocation:locationLabel(bus.l),...defect}))},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),filename="fleet-fixed-repairs-"+new Date().toISOString().slice(0,10)+".json";void shareOrDownloadFile(blob,filename,"Fixed repair history report")};
/* Where a completed repair came from, said plainly.

   Fixed Repairs collects from every surface, and until now a card gave no clue
   which. The two that matter to a foreman reading the list are the Down Sheet —
   a bus that was formally down and has been cleared — and the Defect Log, which
   is the smaller day-to-day work. They are coloured apart rather than worded
   apart because this list is scanned, not read.

   The others are named rather than folded into one of those two. A repair
   logged on the map is not a Down Sheet clearance, and saying so would be a
   small lie that compounds every time somebody counts. */
const REPAIR_ORIGINS={
 "down-sheet":{className:"from-down-sheet",label:"CLEARED FROM THE DOWN SHEET"},
 "defect-log":{className:"from-defect-log",label:"FIXED FROM THE DEFECT LOG"},
 tracker:{className:"from-tracker",label:"LOGGED ON THE FACILITY MAP"},
 operator:{className:"from-tracker",label:"LOGGED BY THE AI OPERATOR"},
 scan:{className:"from-tracker",label:"IMPORTED FROM A SCANNED SHEET"},
 /* Logged straight onto this page, never on the Defect Log. Saying it came
    from there would be the small lie the comment below warns about. */
 "fixed-log":{className:"from-tracker",label:"LOGGED AS A COMPLETED REPAIR"},
} as const;
function repairOrigin(source:string|undefined){
 return REPAIR_ORIGINS[source as keyof typeof REPAIR_ORIGINS]||null;
}

 const stats={total:records.length,today:records.filter(record=>isToday(record.defect.completedAt||record.defect.updatedAt||"")).length,buses:new Set(records.map(record=>record.bus.id)).size,needsNotes:records.filter(record=>!record.defect.actionTaken?.trim()).length};
 /* This page had no save banner at all, alone among the four. A refused write
    here is the one that can lose the only copy of a record. */
 return <main className="fixed-repairs-app" style={appearanceStyle}><SaveAlert reason={saveProblem} onExport={()=>exportFleetBoardBackup(localStorage,fleet)}/><DeferredNavBadge/><DeferredReviewPrompt/>
  <header className="fixed-header"><div><span>FLEET MAINTENANCE</span><h1>Fixed Repairs</h1><p>Offline repair history for faster future diagnosis</p></div><TrackerNav active="/fixed-repairs"/></header>
  <section className="fixed-summary" aria-label="Fixed repair summary"><div><strong>{stats.total}</strong><span>TOTAL FIXED</span></div><div><strong>{stats.today}</strong><span>FIXED TODAY</span></div><div><strong>{stats.buses}</strong><span>BUSES IN HISTORY</span></div><div className={stats.needsNotes?"attention":""}><strong>{stats.needsNotes}</strong><span>NEED FIX DETAILS</span></div></section>
  <section className="fixed-controls"><label><span>SEARCH HISTORY</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus #, defect, fix, code, part, or note"/></label><label><span>CATEGORY</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(value=><option value={value} key={value}>{repairCategoryLabel(value)}</option>)}</select></label><button type="button" onClick={exportHistory} title={REPORT_EXPORT_HINT}>EXPORT HISTORY REPORT</button><button type="button" className="fixed-undo-control" onClick={undoLastChange} disabled={!undoSnapshot} aria-label={undoSnapshot?"Undo "+undoSnapshot.label:"No recent fixed-repair change to undo"} title={undoSnapshot?.label||"Undo becomes available after a saved change"}>UNDO LAST</button></section>
  <section className="fixed-feed"><header><span><b>COMPLETED REPAIR HISTORY</b><small>{hiddenCount?windowed.length+" OF "+visible.length+" SHOWN":visible.length+" REPAIR"+(visible.length===1?"":"S")+" SHOWN"}</small></span><button className="log-repair-button" type="button" onClick={logRepair} disabled={!fleet.length} title="Record a repair that was done without a defect being logged first">+ LOG A REPAIR</button>{hiddenCount>0&&<div className="fixed-load-more"><button type="button" onClick={()=>setVisibleCount(current=>current+PAGE_SIZE)}>SHOW {Math.min(PAGE_SIZE,hiddenCount)} MORE</button><button type="button" onClick={()=>setVisibleCount(visible.length)}>SHOW ALL {visible.length}</button></div>}</header>{visible.length?<div className="fixed-list">{windowed.map(record=><article className={"fixed-card"+(!record.defect.actionTaken?.trim()?" needs-notes":"")} key={record.bus.id+"-"+record.defect.id}>
   <div className="fixed-card-head"><span><small>BUS</small><strong>{record.bus.n}</strong></span><div><b>{repairCategoryLabel(record.defect.category)}</b><h2>{record.defect.issue}</h2></div><time>{timeLabel(record.defect.completedAt||record.defect.updatedAt||"")}</time></div>
   {repairOrigin(record.defect.source)&&<p className={"fixed-origin "+repairOrigin(record.defect.source)!.className}><b>{repairOrigin(record.defect.source)!.label}</b></p>}
   <div className="fixed-card-body"><section><b>ORIGINAL REPORT</b><p>{defectLabel(record.defect)}</p><small>Logged {timeLabel(record.defect.createdAt||"")} · {locationLabel(record.defect.reportedLocation||record.bus.l)}{record.defect.reportedBy?" · By "+record.defect.reportedBy:""}</small>{record.defect.conditionNotDuplicated&&<em className="not-duplicated-note">DEFECT / CONDITION NOT DUPLICATED</em>}{record.defect.shopNotes&&<em>SHOP NOTES: {record.defect.shopNotes}</em>}</section><section className="repair-result"><b>FIX / STEPS TAKEN</b><p>{record.defect.actionTaken||"Fix details have not been entered yet."}</p>{record.defect.diagnosticNote&&<small><b>DIAG / VERIFY:</b> {record.defect.diagnosticNote}</small>}{record.defect.partNumber&&<small><b>PART:</b> {record.defect.partNumber}</small>}{record.defect.completedBy&&<small><b>FIXED BY:</b> {record.defect.completedBy}</small>}</section></div>
   <footer>{!record.defect.actionTaken?.trim()&&<b>NEEDS FIX DETAILS</b>}{partNumberMissing(record.defect)&&<b className="missing-part-number" title="A part was used on this repair and its number has not been entered yet">MISSING PART #</b>}<div className="fixed-card-actions"><button type="button" onClick={()=>setEditing(record)}>{record.defect.actionTaken?.trim()?"EDIT FULL RECORD":"ADD FIX DETAILS"}</button><button type="button" className="reopen-repair" onClick={()=>reopenRepair(record)}>UNDO FIX</button><button type="button" className="delete-repair" onClick={()=>deleteRepair(record)}>DELETE</button></div></footer>
  </article>)}</div>:<div className="fixed-empty"><b>No fixed repairs match this view.</b><span>Completed repairs will flow here automatically from the Defect Log, Down Sheet, and Fleet Tracker.</span></div>}</section>
  {editing&&<CompletionEditor record={editing} partsMemory={partsMemory} forgetPart={forgetLearnedPart} findingsMemory={findingsMemory} forgetFinding={forgetLearnedFinding} save={saveCompletion} close={()=>setEditing(null)}/>}
  {/* No key on the bus id: it would remount the editor on every bus change and
      reset the whole form, so a mechanic who picked the bus last lost the
      record they had just typed. The bus select is controlled by the prop. */}
  {newRepair&&<CompletionEditor record={newRepair} partsMemory={partsMemory} forgetPart={forgetLearnedPart} findingsMemory={findingsMemory} forgetFinding={forgetLearnedFinding} save={saveCompletion} close={()=>setNewRepair(null)} isNew fleet={fleet} onBusChange={busId=>setNewRepair(current=>{const bus=fleet.find(item=>item.id===busId);return current&&bus?{...current,bus}:current})}/>}
  
 </main>
}
