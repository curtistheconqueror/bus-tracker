"use client";

import {useEffect,useMemo,useState} from "react";
import "./defect-log.css";
import {defaultDefectOperability,defectLabel,isUnresolved,normalizeDefects,REPAIR_OPTIONS,type DefectOperability,type DefectState,type StructuredDefect} from "../repair-catalog";
import {defectLogRecords,saveDefectLogRecord,type DefectLogDownEntry,type DefectLogFleetBus,type DefectLogRecord} from "./defect-log-sync";

type Filter="all"|"open"|"in-progress"|"fixed"|"downsheet";
type LogDraft={busId:string;defect:StructuredDefect;quickIssue:string;onDownSheet:boolean};
type LogSettings={defaultInitials:string;defaultFilter:Filter;showFixed:boolean};

const FLEET_KEY="pace-board-v1";
const DOWN_KEY="pace-down-sheet-v1";
const SETTINGS_KEY="pace-defect-log-settings-v1";
const DEFAULT_SETTINGS:LogSettings={defaultInitials:"",defaultFilter:"all",showFixed:true};
const STATUS_LABELS:Record<string,string>={service:"In Service",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown"};
const STATE_LABELS:Record<DefectState,string>={open:"OPEN","in-progress":"IN PROGRESS",deferred:"DEFERRED",completed:"FIXED"};
const CATEGORY_ICONS:Record<string,string>={
 "A/C and HVAC":"\u2744\uFE0F",Engine:"\u25CF","Cooling System":"\u25C8",Transmission:"\u25C6",Suspension:"\u25B2",Steering:"\u25C9",Brakes:"\u25A3",
 "Tires and Wheels":"\u25C9","Battery, Starting and Charging":"\u26A1","Electrical / Multiplex":"\u26A1","Tech Services":"\u25A4",Amerex:"\u25B3",
 "Fuel Delivery":"\u25C7","No Start":"\u25CB","Doors, Ramp and Lift":"\u267F","Lights and Fixtures":"\u2739",Bodywork:"\u25A7","Air System":"\u224B",
 Inspection:"\u2713","Preventive Maintenance":"\u2692","Interior Cleaning":"\u2726",Miscellaneous:"\u2022",
};

function readFleet(raw:string|null):DefectLogFleetBus[]{try{const value=raw?JSON.parse(raw):null,items=Array.isArray(value)?value:value?.buses;return Array.isArray(items)?items.map((bus:DefectLogFleetBus)=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[]}catch{return []}}
function readDown(raw:string|null):DefectLogDownEntry[]{try{const value=raw?JSON.parse(raw):null,items=Array.isArray(value)?value:value?.entries;return Array.isArray(items)?items:[]}catch{return []}}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Previous record":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date)}
function locationLabel(location:string){
 const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];
 const found=labels.find(([prefix])=>location.startsWith(prefix));return found?found[1]:location||"Location not set";
}
function newDraft():LogDraft{const now=new Date().toISOString();return {busId:"",quickIssue:"",onDownSheet:false,defect:{id:"defect-log-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),category:"",issue:"",details:"",operability:"service",state:"open",createdAt:now,updatedAt:now,diagnosticNote:"",actionTaken:"",partNumber:"",reportedBy:"",source:"defect-log"}}}
function recordDraft(record:DefectLogRecord):LogDraft{return {busId:record.bus.id,quickIssue:record.defect.issue==="Manual entry"?"":record.defect.issue,onDownSheet:record.onDownSheet,defect:{...record.defect}}}

function DefectEditor({draft,fleet,defaultInitials,save,close}:{draft:LogDraft;fleet:DefectLogFleetBus[];defaultInitials:string;save:(draft:LogDraft)=>void;close:()=>void}){
 const [value,setValue]=useState(draft);
 const updateDefect=<K extends keyof StructuredDefect>(key:K,next:StructuredDefect[K])=>setValue(current=>({...current,defect:{...current.defect,[key]:next}}));
 const repairs=REPAIR_OPTIONS[value.defect.category]||[];
 const selectedBus=fleet.find(bus=>bus.id===value.busId);
 const submit=(event:React.FormEvent)=>{event.preventDefault();const initials=(value.defect.reportedBy||defaultInitials).trim().toUpperCase(),details=value.defect.details.trim(),issue=value.quickIssue||value.defect.issue;if(!selectedBus){alert("Select a bus number.");return}if(!value.defect.category){alert("Select a repair category.");return}if(!issue&&!details){alert("Select a repair or describe the symptom.");return}if(!initials){alert("Enter your initials.");return}const finalIssue=issue&&issue!=="Manual entry"?issue:"Manual entry";save({...value,onDownSheet:value.defect.state==="completed"?false:value.onDownSheet,defect:{...value.defect,issue:finalIssue,details,reportedBy:initials}})};
 return <div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <form className="log-editor" onSubmit={submit}>
   <header><span><small>REAL-TIME DEFECT</small><h2>{selectedBus?"Bus "+selectedBus.n:"Log Repair"}</h2></span><button type="button" onClick={close} aria-label="Close">x</button></header>
   <div className="log-form">
    <label className="wide">BUS<select value={value.busId} onChange={event=>setValue(current=>({...current,busId:event.target.value}))}><option value="">Select bus</option>{[...fleet].sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})).map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n} - {locationLabel(bus.l)}</option>)}</select></label>
    <label>CATEGORY<select value={value.defect.category} onChange={event=>setValue(current=>({...current,quickIssue:"",defect:{...current.defect,category:event.target.value,issue:"",operability:"service"}}))}><option value="">Select category</option>{Object.keys(REPAIR_OPTIONS).map(category=><option key={category}>{category}</option>)}</select></label>
    <label>QUICK SELECT<select value={value.quickIssue} disabled={!value.defect.category} onChange={event=>{const issue=event.target.value;setValue(current=>({...current,quickIssue:issue,defect:{...current.defect,issue,operability:defaultDefectOperability(current.defect.category,issue)}}))}}><option value="">{value.defect.category?"Type the symptom below":"Select category first"}</option>{repairs.map(repair=><option key={repair}>{repair}</option>)}</select></label>
    <label className="wide">DESCRIPTION<textarea value={value.defect.details} onChange={event=>updateDefect("details",event.target.value)} placeholder="What was reported, observed, or repaired?"/></label>
    <label>WORK STATUS<select value={value.defect.state} onChange={event=>updateDefect("state",event.target.value as DefectState)}><option value="open">Open</option><option value="in-progress">In Progress</option><option value="deferred">Deferred</option><option value="completed">Fixed</option></select></label>
    <label>BUS AVAILABILITY<select value={value.defect.operability} onChange={event=>updateDefect("operability",event.target.value as DefectOperability)}><option value="service">May Stay In Service</option><option value="down">Remove From Service</option></select></label>
    <label className="wide downsheet-check"><input type="checkbox" checked={value.onDownSheet} disabled={value.defect.state==="completed"} onChange={event=>setValue(current=>({...current,onDownSheet:event.target.checked}))}/><span><b>DOWN SHEET</b><small>Escalate this repair without changing the bus location.</small></span></label>
    <label>DIAGNOSTIC NOTE<textarea value={value.defect.diagnosticNote||""} onChange={event=>updateDefect("diagnosticNote",event.target.value)} placeholder="Tests, codes, or findings"/></label>
    <label>ACTION TAKEN<textarea value={value.defect.actionTaken||""} onChange={event=>updateDefect("actionTaken",event.target.value)} placeholder="Repair, adjustment, or temporary action"/></label>
    <label>PART NUMBER<input value={value.defect.partNumber||""} onChange={event=>updateDefect("partNumber",event.target.value)} placeholder="Optional"/></label>
    <label>INITIALS<input required maxLength={6} autoCapitalize="characters" value={value.defect.reportedBy||defaultInitials} onChange={event=>updateDefect("reportedBy",event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase())} placeholder="Required"/></label>
   </div>
   <footer><button type="button" onClick={close}>CANCEL</button><button className="save-log">{draft.defect.createdAt===draft.defect.updatedAt?"SAVE DEFECT":"SAVE UPDATE"}</button></footer>
  </form>
 </div>;
}

function LogSettingsModal({settings,setSettings,close,exportLog}:{settings:LogSettings;setSettings:(settings:LogSettings)=>void;close:()=>void;exportLog:()=>void}){
 return <div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><section className="log-settings">
  <header><span><small>DEFECT LOG</small><h2>Settings</h2></span><button onClick={close}>x</button></header>
  <div>
   <label>INITIALS<input maxLength={6} value={settings.defaultInitials} onChange={event=>setSettings({...settings,defaultInitials:event.target.value.replace(/[^a-z0-9]/gi,"").toUpperCase()})}/></label>
   <label>DEFAULT VIEW<select value={settings.defaultFilter} onChange={event=>setSettings({...settings,defaultFilter:event.target.value as Filter})}><option value="all">All</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="fixed">Fixed Today</option><option value="downsheet">Down Sheet</option></select></label>
   <label className="settings-check"><input type="checkbox" checked={settings.showFixed} onChange={event=>setSettings({...settings,showFixed:event.target.checked})}/><span>SHOW FIXED</span></label>
   <button className="export-log" onClick={exportLog}>EXPORT LOG</button>
   <p>Repair records are included with the board backup because they stay attached to each bus.</p>
  </div>
 </section></div>;
}

export default function DefectLog(){
 const [fleet,setFleet]=useState<DefectLogFleetBus[]>([]);
 const [downEntries,setDownEntries]=useState<DefectLogDownEntry[]>([]);
 const [settings,setSettings]=useState<LogSettings>(DEFAULT_SETTINGS);
 const [filter,setFilter]=useState<Filter>("all");
 const [search,setSearch]=useState("");
 const [editing,setEditing]=useState<LogDraft|null>(null);
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [hydrated,setHydrated]=useState(false);

 useEffect(()=>{const nextFleet=readFleet(localStorage.getItem(FLEET_KEY)),nextDown=readDown(localStorage.getItem(DOWN_KEY));let nextSettings=DEFAULT_SETTINGS;try{nextSettings={...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")}}catch{}setFleet(nextFleet);setDownEntries(nextDown);setSettings(nextSettings);setFilter(nextSettings.defaultFilter);setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))},[settings,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY)setFleet(readFleet(event.newValue));if(event.key===DOWN_KEY)setDownEntries(readDown(event.newValue))};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

 const records=useMemo(()=>defectLogRecords(fleet,downEntries),[fleet,downEntries]);
 const active=records.filter(record=>isUnresolved(record.defect));
 const visible=records.filter(record=>{
  if(!settings.showFixed&&record.defect.state==="completed")return false;
  if(filter==="open"&&!(record.defect.state==="open"||record.defect.state==="deferred"))return false;
  if(filter==="in-progress"&&record.defect.state!=="in-progress")return false;
  if(filter==="fixed"&&!(record.defect.state==="completed"&&isToday(record.defect.completedAt||record.updatedAt)))return false;
  if(filter==="downsheet"&&!record.onDownSheet)return false;
  const query=search.trim().toLowerCase();if(!query)return true;
  return [record.bus.n,record.defect.category,record.defect.issue,record.defect.details,record.defect.diagnosticNote,record.defect.actionTaken].some(value=>String(value||"").toLowerCase().includes(query));
 });
 const stats={active:active.length,progress:active.filter(record=>record.defect.state==="in-progress").length,downing:active.filter(record=>record.defect.operability==="down").length,fixedToday:records.filter(record=>record.defect.state==="completed"&&isToday(record.defect.completedAt||record.updatedAt)).length,buses:new Set(active.map(record=>record.bus.id)).size};

 const persist=(nextFleet:DefectLogFleetBus[],nextDown:DefectLogDownEntry[])=>{setFleet(nextFleet);setDownEntries(nextDown);localStorage.setItem(FLEET_KEY,JSON.stringify({version:4,buses:nextFleet}));localStorage.setItem(DOWN_KEY,JSON.stringify({version:1,entries:nextDown}))};
 const saveDraft=(draft:LogDraft)=>{const result=saveDefectLogRecord(fleet,downEntries,draft.busId,draft.defect,draft.onDownSheet);if(result.error){alert("That bus is no longer available. Refresh and try again.");return}persist(result.fleet,result.downEntries);setEditing(null)};
 const markFixed=(record:DefectLogRecord)=>{if(!settings.defaultInitials){setEditing(recordDraft(record));alert("Enter your initials before marking this repair fixed.");return}saveDraft({...recordDraft(record),onDownSheet:false,defect:{...record.defect,state:"completed",reportedBy:settings.defaultInitials,actionTaken:record.defect.actionTaken||"Repair completed"}})};
 const exportLog=()=>{const payload={kind:"fleet-real-time-defect-log",version:1,exportedAt:new Date().toISOString(),records:records.map(record=>({busNumber:record.bus.n,busStatus:record.bus.s,location:locationLabel(record.bus.l),...record.defect,onDownSheet:record.onDownSheet}))},blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="fleet-defect-log-"+new Date().toISOString().slice(0,10)+".json";link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)};

 return <main className="defect-log-app">
  <header className="log-header">
   <div><span>FLEET MAINTENANCE</span><h1>Real-Time Defect Log</h1><p>Repairs, findings, and follow-up as they happen</p></div>
   <nav aria-label="Tracker pages"><a href="/">FACILITY MAP</a><a href="/down-sheet">DOWN SHEET</a><a className="active" href="/defect-log" aria-current="page">DEFECT LOG</a></nav>
  </header>
  <section className="log-summary" aria-label="Defect log summary">
   <div className="primary"><strong>{stats.active}</strong><span>ACTIVE DEFECTS</span></div><div><strong>{stats.buses}</strong><span>BUSES AFFECTED</span></div><div><strong>{stats.progress}</strong><span>IN PROGRESS</span></div><div className="downing"><strong>{stats.downing}</strong><span>DOWNING</span></div><div className="fixed"><strong>{stats.fixedToday}</strong><span>FIXED TODAY</span></div>
  </section>
  <section className="log-controls">
   <div className="log-filters">{([["all","ALL"],["open","OPEN"],["in-progress","IN PROGRESS"],["fixed","FIXED TODAY"],["downsheet","DOWN SHEET"]] as [Filter,string][]).map(([value,label])=><button className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>setFilter(value)} key={value}>{label}</button>)}</div>
   <label className="log-search"><span>FIND</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus, repair, code, or note"/></label>
   <button className="log-settings-button" onClick={()=>setSettingsOpen(true)} aria-label="Open defect log settings">&#9881;</button>
  </section>
  <section className="log-feed">
   <div className="feed-title"><span><b>LIVE REPAIR FEED</b><small>{visible.length} RECORD{visible.length===1?"":"S"} IN VIEW</small></span><button onClick={()=>setEditing(newDraft())}>+ LOG DEFECT</button></div>
   {visible.length?<div className="log-list">{visible.map(record=><article className={"log-card "+record.defect.state+(record.defect.operability==="down"?" downing":"")} key={record.bus.id+"-"+record.defect.id}>
    <button className="log-card-main" onClick={()=>setEditing(recordDraft(record))}>
     <span className="log-icon" aria-hidden="true">{CATEGORY_ICONS[record.defect.category]||CATEGORY_ICONS.Miscellaneous}</span>
     <span className="log-bus"><small>BUS</small><strong>{record.bus.n}</strong><em>{locationLabel(record.bus.l)}</em></span>
     <span className="log-repair"><b>{record.defect.category}</b><strong>{defectLabel(record.defect)}</strong>{record.defect.diagnosticNote&&<small><b>DIAG:</b> {record.defect.diagnosticNote}</small>}{record.defect.actionTaken&&<small><b>ACTION:</b> {record.defect.actionTaken}</small>}{record.defect.partNumber&&<small><b>PART:</b> {record.defect.partNumber}</small>}</span>
     <span className="log-meta"><b className={"state "+record.defect.state}>{STATE_LABELS[record.defect.state]}</b>{record.onDownSheet&&<b className="downsheet-badge">DOWN SHEET</b>}<small>{STATUS_LABELS[record.bus.s]||record.bus.s}</small><time>{timeLabel(record.updatedAt)}</time>{record.defect.reportedBy&&<em>{record.defect.reportedBy}</em>}</span>
    </button>
    {record.defect.state!=="completed"&&<button className="quick-fix" onClick={()=>markFixed(record)}>&#10003; FIXED</button>}
   </article>)}</div>:<div className="empty-log"><b>No repairs match this view.</b><span>Use Log Defect to record the next bus finding.</span></div>}
  </section>
  <footer className="mobile-log-bar"><a className="operator-link" href="/?operator=1"><span>&#10022;</span> AI OPERATOR</a><button onClick={()=>setEditing(newDraft())}>+ LOG DEFECT</button></footer>
  {editing&&<DefectEditor draft={editing} fleet={fleet} defaultInitials={settings.defaultInitials} save={saveDraft} close={()=>setEditing(null)}/>}
  {settingsOpen&&<LogSettingsModal settings={settings} setSettings={setSettings} close={()=>setSettingsOpen(false)} exportLog={exportLog}/>}
 </main>;
}
