"use client";

import {useEffect,useMemo,useState} from "react";
import "./down-sheet.css";
import DownSheetEditor from "./down-sheet-editor";

type FleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";
type Shift="1st"|"2nd"|"3rd";
type ShiftFilter="All"|Shift;
type Workflow="Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
type AssignmentType="Mechanic"|"Vendor";
type RepairSection="Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";

type FleetBus={
 id:string;n:string;s:FleetStatus;l:string;mechanic?:string;foreman?:string;shift?:string;
 down?:boolean;notes?:string;pendingRepair?:string;roadcall?:boolean;parkedAt?:string;
};

type RepairHistory={at:string;initials:string;action:string};

type DownEntry={
 id:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 assignmentType:AssignmentType;assignedTo:string;section:RepairSection;shift:Shift;
 workflow:Workflow;operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:RepairHistory[];
};

const MAX_ENTRIES=98;
const FLEET_KEY="pace-board-v1";
const DOWN_KEY="pace-down-sheet-v1";
const SETTINGS_KEY="pace-down-sheet-settings-v1";
const STATUS_LABELS:Record<FleetStatus,string>={service:"In Service / On Road",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown"};

function shiftFromFleet(value?:string):Shift{
 if(value==="Evening")return "2nd";
 if(value==="Night")return "3rd";
 return "1st";
}

function normalizeEntry(value:Partial<DownEntry>,index:number):DownEntry{
 const now=new Date().toISOString();
 return {
  id:value.id||"repair-imported-"+index,
  busId:value.busId||"",
  busNumber:value.busNumber||"",
  category:value.category||"Miscellaneous",
  repair:value.repair||"Repair required",
  customReason:value.customReason||"",
  assignmentType:value.assignmentType||"Mechanic",
  assignedTo:value.assignedTo||"",
  section:value.section||"Pending",
  shift:value.shift||"1st",
  workflow:value.workflow||"Scheduled",
  operationalStatus:value.operationalStatus||"out",
  priority:value.priority||"Routine",
  createdAt:value.createdAt||now,
  updatedAt:value.updatedAt||now,
  updatedBy:value.updatedBy||"",
  completedAt:value.completedAt||"",
  history:Array.isArray(value.history)?value.history:[],
 };
}

function entriesFromFleet(fleet:FleetBus[]):DownEntry[]{
 const now=new Date().toISOString();
 return fleet.filter(bus=>Boolean(bus.down)||Boolean(bus.pendingRepair?.trim())).slice(0,MAX_ENTRIES).map((bus,index)=>({
  id:"repair-"+bus.id,
  busId:bus.id,
  busNumber:bus.n,
  category:"Miscellaneous",
  repair:bus.pendingRepair?.trim()||STATUS_LABELS[bus.s]||"Repair required",
  customReason:"",
  assignmentType:"Mechanic",
  assignedTo:bus.mechanic||"",
  section:bus.roadcall?"Roadcall":"Pending",
  shift:shiftFromFleet(bus.shift),
  workflow:bus.s==="shop"?"In Progress":"Scheduled",
  operationalStatus:bus.s,
  priority:"Routine",
  createdAt:bus.parkedAt||now,
  updatedAt:now,
  updatedBy:"",
  completedAt:"",
  history:[],
 })).map(normalizeEntry);
}

function reasonLabel(entry:DownEntry){return [entry.category,entry.repair,entry.customReason].filter(Boolean).join(" — ")}
function isActive(entry:DownEntry){return entry.workflow!=="Completed"}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){if(!value)return "Not updated";return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value))}

export default function DownSheet(){
 const [fleet,setFleet]=useState<FleetBus[]>([]);
 const [entries,setEntries]=useState<DownEntry[]>([]);
 const [filter,setFilter]=useState<ShiftFilter>("All");
 const [showCompleted,setShowCompleted]=useState(false);
 const [hydrated,setHydrated]=useState(false);
 const [editing,setEditing]=useState<DownEntry|null>(null);

 // Restore the existing device-local fleet and down sheet once after hydration.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{try{const fleetRaw=localStorage.getItem(FLEET_KEY),fleetPayload=fleetRaw?JSON.parse(fleetRaw):null,nextFleet=(Array.isArray(fleetPayload)?fleetPayload:fleetPayload?.buses)||[];setFleet(nextFleet);const downRaw=localStorage.getItem(DOWN_KEY),downPayload=downRaw?JSON.parse(downRaw):null,nextEntries=Array.isArray(downPayload)?downPayload:downPayload?.entries;setEntries(Array.isArray(nextEntries)?nextEntries.map(normalizeEntry):entriesFromFleet(nextFleet));const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");setShowCompleted(Boolean(settings.showCompleted))}catch{setFleet([]);setEntries([])}setHydrated(true)},[]);

 useEffect(()=>{if(hydrated)localStorage.setItem(DOWN_KEY,JSON.stringify({version:1,entries}))},[entries,hydrated]);
 useEffect(()=>{if(hydrated){const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");localStorage.setItem(SETTINGS_KEY,JSON.stringify({...saved,showCompleted}))}},[showCompleted,hydrated]);

 const active=useMemo(()=>entries.filter(isActive),[entries]);
 const visible=useMemo(()=>entries.filter(entry=>(showCompleted||isActive(entry))&&(filter==="All"||entry.shift===filter)),[entries,filter,showCompleted]);
 const counters={active:active.length,first:active.filter(entry=>entry.shift==="1st").length,second:active.filter(entry=>entry.shift==="2nd").length,third:active.filter(entry=>entry.shift==="3rd").length,pending:active.filter(entry=>entry.section==="Pending").length,accident:active.filter(entry=>entry.section==="Accident").length,waiting:active.filter(entry=>entry.workflow==="Waiting for Parts").length,completedToday:entries.filter(entry=>entry.workflow==="Completed"&&isToday(entry.completedAt)).length};
 const openNewEntry=()=>{if(entries.length>=MAX_ENTRIES){alert("The down sheet has reached its 98-entry capacity.");return}const bus=fleet.find(item=>!active.some(entry=>entry.busId===item.id));if(!bus){alert("Every available fleet bus already has an active down-sheet entry.");return}const now=new Date().toISOString();setEditing({id:"repair-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),busId:bus.id,busNumber:bus.n,category:"",repair:"",customReason:"",assignmentType:"Mechanic",assignedTo:"",section:"Pending",shift:shiftFromFleet(bus.shift),workflow:"Scheduled",operationalStatus:bus.s,priority:"Routine",createdAt:now,updatedAt:now,updatedBy:"",completedAt:"",history:[]})};
 const saveEntry=(next:DownEntry)=>{if(next.workflow!=="Completed"&&entries.some(entry=>entry.id!==next.id&&entry.workflow!=="Completed"&&entry.busId===next.busId)){alert("That bus already has an active down-sheet entry.");return}setEntries(current=>current.some(entry=>entry.id===next.id)?current.map(entry=>entry.id===next.id?next:entry):[...current,next]);setEditing(null)};

 return <main className="down-app">
  <header className="down-header">
   <div><span>PACE SOUTH MAINTENANCE</span><h1>Interactive Down Sheet</h1><p>Repair scheduling and live fleet-status control</p></div>
   <nav aria-label="Tracker pages"><a href="/">FACILITY MAP</a><a className="active" href="/down-sheet" aria-current="page">DOWN SHEET</a></nav>
  </header>

  <section className="down-summary" aria-label="Down sheet summary">
   <div className="primary-count"><strong>{counters.active}</strong><span>ACTIVE DOWN</span></div>
   <div><strong>{counters.pending}</strong><span>PENDING</span></div>
   <div><strong>{counters.accident}</strong><span>ACCIDENT</span></div>
   <div><strong>{counters.waiting}</strong><span>WAITING PARTS</span></div>
   <div><strong>{counters.completedToday}</strong><span>COMPLETED TODAY</span></div>
   <div className="capacity"><strong>{entries.length}<small> / {MAX_ENTRIES}</small></strong><span>SHEET CAPACITY</span></div>
  </section>

  <section className="down-controls">
   <div className="shift-filter" aria-label="Filter down sheet by shift">
    <span>SHOW:</span>{(["All","1st","2nd","3rd"] as ShiftFilter[]).map(value=><button type="button" className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>setFilter(value)} key={value}>{value.toUpperCase()}{value!=="All"&&<b>{value==="1st"?counters.first:value==="2nd"?counters.second:counters.third}</b>}</button>)}
   </div>
   <label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span/>SHOW COMPLETED</label>
   <button className="add-repair" type="button" onClick={openNewEntry} disabled={entries.length>=MAX_ENTRIES}>+ ADD DOWN BUS</button>
   <button className="down-settings" type="button" aria-label="Open down sheet settings">⚙ SETTINGS</button>
  </section>

  <section className="sheet-wrap">
   <div className="sheet-title"><div><b>PACE SOUTH FACILITY</b><span>Maintenance Down Sheet</span></div><p>{filter==="All"?"ALL SHIFTS":filter+" SHIFT"} · {visible.length} ROW{visible.length===1?"":"S"} DISPLAYED</p></div>
   <div className="sheet-scroll">
    <table className="down-table">
     <thead><tr><th>LINE</th><th>BUS NUMBER</th><th>REASON DOWN</th><th>MECHANIC / VENDOR</th><th>SECTION</th><th>SHIFT</th><th>WORK STATUS</th><th>UPDATED BY</th></tr></thead>
     <tbody>{visible.length?visible.map((entry,index)=><tr className={entry.workflow==="Completed"?"completed":""} key={entry.id}>
      <td className="line-number">{String(index+1).padStart(2,"0")}</td>
      <td className="fleet-number"><b>{entry.busNumber||"—"}</b><small>{STATUS_LABELS[entry.operationalStatus]}</small></td>
      <td><button className="reason-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit repair details for bus "+entry.busNumber}><b>{entry.category}</b><span>{reasonLabel(entry)}</span></button></td>
      <td><span className={"assignment "+entry.assignmentType.toLowerCase()}><small>{entry.assignmentType}</small>{entry.assignedTo||"Unassigned"}</span></td>
      <td><b className={"section-tag "+entry.section.toLowerCase().replaceAll(" ","-")}>{entry.section}</b></td>
      <td><b className="shift-tag">{entry.shift}</b></td>
      <td><b className={"workflow "+entry.workflow.toLowerCase().replaceAll(" ","-")}>{entry.workflow}</b></td>
      <td className="updated"><b>{entry.updatedBy||"—"}</b><small>{timeLabel(entry.updatedAt)}</small></td>
     </tr>):<tr><td className="empty-sheet" colSpan={8}><b>No buses match this view.</b><span>All shifts are shown by default. Use Add Down Bus to create the first repair entry.</span></td></tr>}</tbody>
    </table>
   </div>
  </section>
  <footer className="down-footnote"><span>ACTIVE DOWN COUNT EXCLUDES COMPLETED REPAIRS</span><span>BUS LOCATION IS CONTROLLED ONLY FROM THE FACILITY MAP</span></footer>
  {editing&&<DownSheetEditor entry={editing} fleet={fleet} entries={entries} defaultInitials="" onClose={()=>setEditing(null)} onSave={saveEntry}/>}
 </main>;
}
