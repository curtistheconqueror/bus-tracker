"use client";

import {useEffect,useMemo,useState} from "react";
import "./fixed-repairs.css";
import {FixedAppearanceModal,useFixedAppearance} from "./fixed-repairs-settings";
import {defectLabel,normalizeDefects,REPAIR_OPTIONS,repairCategoryLabel,type DefectOperability,type StructuredDefect} from "../repair-catalog";
import {EMPTY_PARTS_MEMORY,forgetPart,learnPart,readPartsMemory,recallPart,writePartsMemory,type PartMemoryEntry,type PartMemoryScope,type PartsMemory} from "../parts-memory";
import type {DefectLogFleetBus} from "../defect-log/defect-log-sync";
import {FLEET_STORAGE_KEY as FLEET_KEY,readFleetPayload,writeFleetStorage} from "../storage";

type FixedRecord={bus:DefectLogFleetBus;defect:StructuredDefect};
type CompletionDraft={category:string;issue:string;details:string;operability:DefectOperability;actionTaken:string;diagnosticNote:string;partNumber:string;partsUsed:boolean;partName:string;rememberScope?:PartMemoryScope;completedBy:string;completedAt:string};
type UndoSnapshot={fleet:DefectLogFleetBus[];label:string};

function readFleet(raw:string|null):DefectLogFleetBus[]{const payload=readFleetPayload<DefectLogFleetBus>(raw);return payload.valid?payload.buses.map(bus=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[]}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Not recorded":new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date)}
function localDateTime(value:string){const date=new Date(value);if(Number.isNaN(date.getTime()))return "";return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)}
function locationLabel(location:string){const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["office-","Foreman Office"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];return labels.find(([prefix])=>location.startsWith(prefix))?.[1]||location||"Location not recorded"}

function CompletionEditor({record,partsMemory,forgetPart:forgetLearned,save,close}:{record:FixedRecord;partsMemory:PartsMemory;forgetPart:(entry:PartMemoryEntry)=>void;save:(record:FixedRecord,draft:CompletionDraft)=>void;close:()=>void}){
 const [draft,setDraft]=useState<CompletionDraft>({category:record.defect.category,issue:record.defect.issue,details:record.defect.details||"",operability:record.defect.operability,actionTaken:record.defect.actionTaken||"",diagnosticNote:record.defect.diagnosticNote||"",partNumber:record.defect.partNumber||"",partsUsed:record.defect.partsUsed??Boolean(String(record.defect.partNumber||"").trim()),partName:record.defect.partName||"",rememberScope:"issue",completedBy:record.defect.completedBy||"",completedAt:localDateTime(record.defect.completedAt||record.defect.updatedAt||new Date().toISOString())});
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
 const issues=REPAIR_OPTIONS[draft.category]||[];
 return <div className="fixed-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><form className="fixed-editor" onSubmit={event=>{event.preventDefault();save(record,draft)}}>
  <header><span><small>FIXED REPAIR</small><h2>Bus {record.bus.n}</h2></span><button type="button" onClick={close} aria-label="Close fixed repair editor">×</button></header>
  <div className="fixed-editor-body">
   <section className="fixed-original"><b>EDIT THE FULL REPAIR RECORD</b><small>Logged {timeLabel(record.defect.createdAt||"")} · {locationLabel(record.defect.reportedLocation||record.bus.l)}{record.defect.reportedBy?" · Reported by "+record.defect.reportedBy:""}</small></section>
   <label>CATEGORY<select value={draft.category} onChange={event=>setDraft(current=>({...current,category:event.target.value,issue:""}))}>{Object.keys(REPAIR_OPTIONS).map(category=><option value={category} key={category}>{repairCategoryLabel(category)}</option>)}</select></label>
   <label>DEFECT / REPAIR<select value={draft.issue} onChange={event=>update("issue",event.target.value)}>{draft.issue&&!issues.includes(draft.issue)&&<option>{draft.issue}</option>}<option value="">Choose repair</option>{issues.map(issue=><option key={issue}>{issue}</option>)}</select></label>
   <label className="wide">ORIGINAL DESCRIPTION<textarea value={draft.details} onChange={event=>update("details",event.target.value)} placeholder="Original defect, symptom, or report"/></label>
   <label className="wide">BUS AVAILABILITY<select value={draft.operability} onChange={event=>update("operability",event.target.value as DefectOperability)}><option value="service">May Stay In Service</option><option value="down">Remove From Service</option></select></label>
   <label className="wide">FIX / STEPS TAKEN<textarea autoFocus value={draft.actionTaken} onChange={event=>update("actionTaken",event.target.value)} placeholder="What was repaired, adjusted, replaced, or reset? Include useful steps for the next diagnosis."/></label>
   <label className="wide">DIAGNOSIS / TEST / VERIFICATION<textarea value={draft.diagnosticNote} onChange={event=>update("diagnosticNote",event.target.value)} placeholder="Codes, tests, root cause, or how the repair was verified"/></label>
   <div className="parts-used-block wide">
    <label className="parts-used-toggle"><input type="checkbox" checked={draft.partsUsed} onChange={event=>togglePartsUsed(event.target.checked)}/><span><b>PARTS USED</b><small>Record the part that fixed this repair. Leave it off if none were used.</small></span></label>
    {draft.partsUsed&&<div className="parts-used-fields">
     <label>PART NUMBER<input value={draft.partNumber} onChange={event=>update("partNumber",event.target.value)} placeholder="Leave blank if the number is unknown"/></label>
     <label>PART NAME (OPTIONAL)<input value={draft.partName} onChange={event=>update("partName",event.target.value)} placeholder="Exact catalog name"/></label>
     <label className="parts-remember-scope"><input type="checkbox" checked={draft.rememberScope==="category"} onChange={event=>setDraft(current=>({...current,rememberScope:event.target.checked?"category":"issue"}))}/><span><b>REMEMBER FOR EVERY {(draft.category||"THIS CATEGORY").toUpperCase()} DEFECT</b><small>Off remembers the part for this exact defect only.</small></span></label>
     {remembered&&<p className="parts-remembered"><span><b>REMEMBERED</b>{remembered.partNumber}{remembered.partName?" — "+remembered.partName:""}<small>{remembered.scope==="category"?"Saved for the whole category":"Saved for this exact defect"} · used {remembered.uses}×</small></span><button type="button" onClick={()=>forgetLearned(remembered)}>FORGET</button></p>}
    </div>}
   </div>
   <label>FIXED BY<input maxLength={12} autoCapitalize="characters" value={draft.completedBy} onChange={event=>update("completedBy",event.target.value.replace(/[^a-z0-9 .-]/gi,"").toUpperCase())} placeholder="Initials or name"/></label>
   <label className="wide">FIXED DATE &amp; TIME<input type="datetime-local" value={draft.completedAt} onChange={event=>update("completedAt",event.target.value)}/></label>
  </div>
  <footer><button type="button" onClick={close}>CLOSE</button><button className="save-fixed-repair">SAVE FIX DETAILS</button></footer>
 </form></div>
}

export default function FixedRepairs(){
 const [fleet,setFleet]=useState<DefectLogFleetBus[]>([]),[search,setSearch]=useState(""),[category,setCategory]=useState("all"),[editing,setEditing]=useState<FixedRecord|null>(null),[undoSnapshot,setUndoSnapshot]=useState<UndoSnapshot|null>(null),[settingsOpen,setSettingsOpen]=useState(false);
 const [partsMemory,setPartsMemory]=useState<PartsMemory>(EMPTY_PARTS_MEMORY);
 useEffect(()=>setPartsMemory(readPartsMemory(localStorage)),[]);
 const forgetLearnedPart=(entry:PartMemoryEntry)=>setPartsMemory(current=>{const next=forgetPart(current,entry.scope,entry.category,entry.issue);writePartsMemory(localStorage,next);return next});
 const {settings,update:updateSettings,style:appearanceStyle}=useFixedAppearance();
 useEffect(()=>{setFleet(readFleet(localStorage.getItem(FLEET_KEY)))},[]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY)setFleet(readFleet(event.newValue))};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);
 const records=useMemo(()=>fleet.flatMap(bus=>normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.state==="completed").map(defect=>({bus,defect}))).sort((a,b)=>(b.defect.completedAt||b.defect.updatedAt||"").localeCompare(a.defect.completedAt||a.defect.updatedAt||"")),[fleet]);
 const categories=useMemo(()=>[...new Set(records.map(record=>record.defect.category))].sort(),[records]);
 const visible=useMemo(()=>{const query=search.trim().toLowerCase();return records.filter(record=>(category==="all"||record.defect.category===category)&&(!query||[record.bus.n,record.defect.category,record.defect.issue,record.defect.details,record.defect.actionTaken,record.defect.diagnosticNote,record.defect.shopNotes,record.defect.partNumber,record.defect.reportedBy,record.defect.completedBy,record.defect.conditionNotDuplicated?"defect condition not duplicated":""].some(value=>String(value||"").toLowerCase().includes(query))))},[records,search,category]);
 const persistFleet=(next:DefectLogFleetBus[])=>{if(!writeFleetStorage(localStorage,next))return;setFleet(next)};
 const changeFleet=(next:DefectLogFleetBus[],label:string)=>{setUndoSnapshot({fleet,label});persistFleet(next);setEditing(null)};
 const saveCompletion=(record:FixedRecord,draft:CompletionDraft)=>{if(draft.partsUsed&&draft.partNumber.trim())setPartsMemory(current=>{const learned=learnPart(current,{category:draft.category,issue:draft.issue,partNumber:draft.partNumber,partName:draft.partName,scope:draft.rememberScope});writePartsMemory(localStorage,learned);return learned});const parsed=new Date(draft.completedAt),completedAt=Number.isNaN(parsed.getTime())?(record.defect.completedAt||new Date().toISOString()):parsed.toISOString(),now=new Date().toISOString(),next=fleet.map(bus=>bus.id!==record.bus.id?bus:{...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).map(defect=>defect.id!==record.defect.id?defect:{...defect,category:draft.category,issue:draft.issue||"Unspecified issue",details:draft.details.trim(),operability:draft.operability,state:"completed",actionTaken:draft.actionTaken.trim(),diagnosticNote:draft.diagnosticNote.trim(),partNumber:draft.partNumber.trim(),partsUsed:draft.partsUsed,partName:draft.partName.trim(),completedBy:draft.completedBy.trim().toUpperCase(),completedAt,updatedAt:now})});changeFleet(next,"Edited Bus "+record.bus.n+" fixed repair")};
 const reopenRepair=(record:FixedRecord)=>{if(!confirm("Undo this fix and reopen the defect for Bus "+record.bus.n+"? It will return to the active Defect Log."))return;const now=new Date().toISOString(),next=fleet.map(bus=>bus.id!==record.bus.id?bus:{...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).map(defect=>defect.id!==record.defect.id?defect:{...defect,state:"open",completedAt:undefined,completedBy:undefined,defectLogHiddenAt:undefined,updatedAt:now})});changeFleet(next,"Reopened Bus "+record.bus.n+" defect")};
 const deleteRepair=(record:FixedRecord)=>{if(!confirm("Delete this repair record for Bus "+record.bus.n+"? You can immediately undo this action."))return;const next=fleet.map(bus=>bus.id!==record.bus.id?bus:{...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.id!==record.defect.id)});changeFleet(next,"Deleted Bus "+record.bus.n+" repair")};
 const undoLastChange=()=>{if(!undoSnapshot)return;persistFleet(undoSnapshot.fleet);setUndoSnapshot(null);setEditing(null)};
 const exportHistory=()=>{const payload={kind:"fleet-fixed-repair-history",version:1,exportedAt:new Date().toISOString(),records:records.map(({bus,defect})=>({busNumber:bus.n,currentLocation:locationLabel(bus.l),...defect}))},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="fleet-fixed-repairs-"+new Date().toISOString().slice(0,10)+".json";link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)};
 const stats={total:records.length,today:records.filter(record=>isToday(record.defect.completedAt||record.defect.updatedAt||"")).length,buses:new Set(records.map(record=>record.bus.id)).size,needsNotes:records.filter(record=>!record.defect.actionTaken?.trim()).length};
 return <main className="fixed-repairs-app" style={appearanceStyle}>
  <header className="fixed-header"><div><span>FLEET MAINTENANCE</span><h1>Fixed Repairs</h1><p>Offline repair history for faster future diagnosis</p></div><nav aria-label="Tracker pages"><a href="/">FACILITY MAP</a><a href="/down-sheet">DOWN SHEET</a><a href="/defect-log">DEFECT LOG</a><a className="active" href="/fixed-repairs" aria-current="page">FIXED REPAIRS</a></nav></header>
  <section className="fixed-summary" aria-label="Fixed repair summary"><div><strong>{stats.total}</strong><span>TOTAL FIXED</span></div><div><strong>{stats.today}</strong><span>FIXED TODAY</span></div><div><strong>{stats.buses}</strong><span>BUSES IN HISTORY</span></div><div className={stats.needsNotes?"attention":""}><strong>{stats.needsNotes}</strong><span>NEED FIX DETAILS</span></div></section>
  <section className="fixed-controls"><label><span>SEARCH HISTORY</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus #, defect, fix, code, part, or note"/></label><label><span>CATEGORY</span><select value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(value=><option value={value} key={value}>{repairCategoryLabel(value)}</option>)}</select></label><button type="button" onClick={exportHistory}>EXPORT FIXED HISTORY</button><button type="button" className="fixed-undo-control" onClick={undoLastChange} disabled={!undoSnapshot} aria-label={undoSnapshot?"Undo "+undoSnapshot.label:"No recent fixed-repair change to undo"} title={undoSnapshot?.label||"Undo becomes available after a saved change"}>UNDO LAST</button><button type="button" className="fixed-settings-button" onClick={()=>setSettingsOpen(true)} aria-label="Open Fixed Repairs settings">&#9881; SETTINGS</button></section>
  <section className="fixed-feed"><header><span><b>COMPLETED REPAIR HISTORY</b><small>{visible.length} REPAIR{visible.length===1?"":"S"} SHOWN</small></span></header>{visible.length?<div className="fixed-list">{visible.map(record=><article className={"fixed-card"+(!record.defect.actionTaken?.trim()?" needs-notes":"")} key={record.bus.id+"-"+record.defect.id}>
   <div className="fixed-card-head"><span><small>BUS</small><strong>{record.bus.n}</strong></span><div><b>{repairCategoryLabel(record.defect.category)}</b><h2>{record.defect.issue}</h2></div><time>{timeLabel(record.defect.completedAt||record.defect.updatedAt||"")}</time></div>
   <div className="fixed-card-body"><section><b>ORIGINAL REPORT</b><p>{defectLabel(record.defect)}</p><small>Logged {timeLabel(record.defect.createdAt||"")} · {locationLabel(record.defect.reportedLocation||record.bus.l)}{record.defect.reportedBy?" · By "+record.defect.reportedBy:""}</small>{record.defect.conditionNotDuplicated&&<em className="not-duplicated-note">DEFECT / CONDITION NOT DUPLICATED</em>}{record.defect.shopNotes&&<em>SHOP NOTES: {record.defect.shopNotes}</em>}</section><section className="repair-result"><b>FIX / STEPS TAKEN</b><p>{record.defect.actionTaken||"Fix details have not been entered yet."}</p>{record.defect.diagnosticNote&&<small><b>DIAG / VERIFY:</b> {record.defect.diagnosticNote}</small>}{record.defect.partNumber&&<small><b>PART:</b> {record.defect.partNumber}</small>}{record.defect.completedBy&&<small><b>FIXED BY:</b> {record.defect.completedBy}</small>}</section></div>
   <footer>{!record.defect.actionTaken?.trim()&&<b>NEEDS FIX DETAILS</b>}<div className="fixed-card-actions"><button type="button" onClick={()=>setEditing(record)}>{record.defect.actionTaken?.trim()?"EDIT FULL RECORD":"ADD FIX DETAILS"}</button><button type="button" className="reopen-repair" onClick={()=>reopenRepair(record)}>UNDO FIX</button><button type="button" className="delete-repair" onClick={()=>deleteRepair(record)}>DELETE</button></div></footer>
  </article>)}</div>:<div className="fixed-empty"><b>No fixed repairs match this view.</b><span>Completed repairs will flow here automatically from the Defect Log, Down Sheet, and Fleet Tracker.</span></div>}</section>
  {editing&&<CompletionEditor record={editing} partsMemory={partsMemory} forgetPart={forgetLearnedPart} save={saveCompletion} close={()=>setEditing(null)}/>}
  {settingsOpen&&<FixedAppearanceModal settings={settings} setSettings={updateSettings} close={()=>setSettingsOpen(false)}/>}
 </main>
}
