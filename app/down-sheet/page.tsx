"use client";

import {useEffect,useMemo,useState} from "react";
import "./down-sheet.css";
import DownSheetEditor from "./down-sheet-editor";
import DownSheetSettings from "./down-sheet-settings";
import DownSheetScanner from "./down-sheet-scanner";
import {applyDownEntryToFleet} from "./down-sheet-sync";
import {clearDownSheetState,DOWN_SHEET_CLEAR_UNDO_KEY,readDownSheetClearSnapshot,restoreDownSheetState} from "./down-sheet-clear";
import {isUnresolved,type StructuredDefect} from "../repair-catalog";
import {formatRepairTime,normalizeRepairTimeEstimate,repairTimeTotal,type RepairTimeEstimate} from "./repair-time-estimates";
import {blankRepairItem,isQuarantineEntry,normalizeRepairItems,repairItemsReason,repairItemsTotal,type DownSheetRepairItem} from "./down-sheet-repair-items";
import type {ScanImportRecord} from "./down-sheet-scan-import";

type FleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";
type Shift="1st"|"2nd"|"3rd";
type ShiftFilter="All"|Shift;
type Workflow="Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
type AssignmentType="Mechanic"|"Vendor";
type RepairSection="Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";

type FleetBus={
 id:string;n:string;s:FleetStatus;l:string;mechanic?:string;foreman?:string;shift?:string;
 down?:boolean;notes?:string;pendingRepair?:string;defects?:StructuredDefect[];roadcall?:boolean;parkedAt?:string;
};

type RepairHistory={at:string;initials:string;action:string};

type DownEntry={
 id:string;defectId?:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 repairItems?:DownSheetRepairItem[];
 assignmentType:AssignmentType;assignedTo:string;section:RepairSection;shift:Shift;
 workflow:Workflow;operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";
 timeEstimate:RepairTimeEstimate;
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:RepairHistory[];
};

const MAX_ENTRIES=98;
const FLEET_KEY="pace-board-v1";
const DOWN_KEY="pace-down-sheet-v1";
const SETTINGS_KEY="pace-down-sheet-settings-v1";
const SCAN_UNDO_KEY="pace-down-sheet-scan-undo-v1";
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
  defectId:value.defectId,
  busId:value.busId||"",
  busNumber:value.busNumber||"",
  category:value.category||"Miscellaneous",
  repair:value.repair||"Repair required",
  customReason:value.customReason||"",
  repairItems:normalizeRepairItems(value.repairItems,{category:value.category||"Miscellaneous",repair:value.repair||"Repair required",details:value.customReason||"",timeEstimate:value.timeEstimate}),
  assignmentType:value.assignmentType||"Mechanic",
  assignedTo:value.assignedTo||"",
  section:value.section||"Pending",
  shift:value.shift||"1st",
  workflow:value.workflow||"Scheduled",
  operationalStatus:value.operationalStatus||"out",
  priority:value.priority||"Routine",
  timeEstimate:normalizeRepairTimeEstimate(value.timeEstimate,value.category||"Miscellaneous",value.repair||"Repair required"),
  createdAt:value.createdAt||now,
  updatedAt:value.updatedAt||now,
  updatedBy:value.updatedBy||"",
  completedAt:value.completedAt||"",
  history:Array.isArray(value.history)?value.history:[],
 };
}

function entriesFromFleet(fleet:FleetBus[]):DownEntry[]{
 const now=new Date().toISOString();
 return fleet.filter(bus=>bus.down===true).slice(0,MAX_ENTRIES).map((bus,index)=>({
  id:"repair-"+bus.id,
  busId:bus.id,
  busNumber:bus.n,
  category:bus.defects?.find(isUnresolved)?.category||"Miscellaneous",
  repair:bus.defects?.find(isUnresolved)?.issue||bus.pendingRepair?.trim()||STATUS_LABELS[bus.s]||"Repair required",
  customReason:bus.defects?.find(isUnresolved)?.details||"",
  repairItems:(bus.defects||[]).filter(isUnresolved).map((defect,index)=>({...blankRepairItem(index),category:defect.category,repair:defect.issue,details:defect.details||"",estimateEnabled:true,timeEstimate:normalizeRepairTimeEstimate(undefined,defect.category,defect.issue)})),
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

function reasonLabel(entry:DownEntry){return entry.repairItems?.length?repairItemsReason(entry.repairItems):[entry.category,entry.repair,entry.customReason].filter(Boolean).join(" — ")}
function entryEstimateMinutes(entry:DownEntry){if(isQuarantineEntry(entry))return 0;return entry.repairItems?repairItemsTotal(entry.repairItems):repairTimeTotal(entry.timeEstimate)}
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
 const [settingsOpen,setSettingsOpen]=useState(false);
 const [scannerOpen,setScannerOpen]=useState(false);
 const [defaultInitials,setDefaultInitials]=useState("");
 const [defaultShift,setDefaultShift]=useState<Shift>("1st");
 const [quickNotes,setQuickNotes]=useState("");
 const [undoClearAvailable,setUndoClearAvailable]=useState(false);
 const [undoScanAvailable,setUndoScanAvailable]=useState(false);

 // Restore the existing device-local fleet and down sheet once after hydration.
 // eslint-disable-next-line react-hooks/set-state-in-effect
 useEffect(()=>{try{const fleetRaw=localStorage.getItem(FLEET_KEY),fleetPayload=fleetRaw?JSON.parse(fleetRaw):null,nextFleet=(Array.isArray(fleetPayload)?fleetPayload:fleetPayload?.buses)||[];setFleet(nextFleet);const downRaw=localStorage.getItem(DOWN_KEY),downPayload=downRaw?JSON.parse(downRaw):null,nextEntries=Array.isArray(downPayload)?downPayload:downPayload?.entries;const restored=Array.isArray(nextEntries)?nextEntries.map(normalizeEntry):[],knownActive=new Set(restored.filter(isActive).map((entry:DownEntry)=>entry.busId)),added=entriesFromFleet(nextFleet).filter(entry=>!knownActive.has(entry.busId));setEntries([...restored,...added].slice(0,MAX_ENTRIES));setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY))));setUndoScanAvailable(Boolean(localStorage.getItem(SCAN_UNDO_KEY)));const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");setShowCompleted(Boolean(settings.showCompleted));setDefaultInitials(typeof settings.defaultInitials==="string"?settings.defaultInitials:"");setDefaultShift((["1st","2nd","3rd"] as string[]).includes(settings.defaultShift)?settings.defaultShift:"1st");setQuickNotes(typeof settings.quickNotes==="string"?settings.quickNotes:"")}catch{setFleet([]);setEntries([])}setHydrated(true)},[]);

 useEffect(()=>{if(hydrated)localStorage.setItem(DOWN_KEY,JSON.stringify({version:1,entries}))},[entries,hydrated]);
 useEffect(()=>{if(hydrated)localStorage.setItem(SETTINGS_KEY,JSON.stringify({showCompleted,defaultInitials,defaultShift,quickNotes}))},[showCompleted,defaultInitials,defaultShift,quickNotes,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY&&event.newValue){try{const payload=JSON.parse(event.newValue),nextFleet=(Array.isArray(payload)?payload:payload.buses)||[];setFleet(nextFleet);setEntries(current=>{const merged=current.map(entry=>{const bus=nextFleet.find((item:FleetBus)=>item.id===entry.busId);if(!bus)return entry;const activeDefect=bus.defects?.find(isUnresolved),incoming=bus.pendingRepair?.trim()||"",currentReason=reasonLabel(entry);if(activeDefect)return {...entry,operationalStatus:bus.s,category:activeDefect.category,repair:activeDefect.issue,customReason:activeDefect.details};return {...entry,operationalStatus:bus.s,...(incoming&&incoming!==currentReason?{category:"Miscellaneous",repair:"Driver-reported defect",customReason:incoming}:{})}}),known=new Set(merged.map(entry=>entry.busId)),added=entriesFromFleet(nextFleet).filter(entry=>!known.has(entry.busId));return [...merged,...added].slice(0,MAX_ENTRIES)})}catch{}}if(event.key===DOWN_KEY&&event.newValue){try{const payload=JSON.parse(event.newValue),next=Array.isArray(payload)?payload:payload.entries;if(Array.isArray(next))setEntries(next.map(normalizeEntry))}catch{}}if(event.key===DOWN_SHEET_CLEAR_UNDO_KEY)setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(event.newValue)));if(event.key===SCAN_UNDO_KEY)setUndoScanAvailable(Boolean(event.newValue))};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

 const active=useMemo(()=>entries.filter(isActive),[entries]);
 const visible=useMemo(()=>entries.filter(entry=>(showCompleted||isActive(entry))&&(filter==="All"||entry.shift===filter)),[entries,filter,showCompleted]);
 const visibleMinutes=visible.reduce((total,entry)=>total+entryEstimateMinutes(entry),0);
 const counters={active:active.length,first:active.filter(entry=>entry.shift==="1st").length,second:active.filter(entry=>entry.shift==="2nd").length,third:active.filter(entry=>entry.shift==="3rd").length,pending:active.filter(entry=>entry.section==="Pending").length,accident:active.filter(entry=>entry.section==="Accident").length,waiting:active.filter(entry=>entry.workflow==="Waiting for Parts").length,completedToday:entries.filter(entry=>entry.workflow==="Completed"&&isToday(entry.completedAt)).length,activeMinutes:active.reduce((total,entry)=>total+entryEstimateMinutes(entry),0)};
 const openNewEntry=()=>{if(active.length>=MAX_ENTRIES){alert("The active down sheet has reached its 98-entry capacity.");return}const bus=fleet.find(item=>!active.some(entry=>entry.busId===item.id));if(!bus){alert("Every available fleet bus already has an active down-sheet entry.");return}const now=new Date().toISOString();setEditing({id:"repair-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),busId:bus.id,busNumber:bus.n,category:"",repair:"",customReason:"",repairItems:[blankRepairItem()],assignmentType:"Mechanic",assignedTo:"",section:"Pending",shift:defaultShift,workflow:"Scheduled",operationalStatus:bus.s,priority:"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,"",""),createdAt:now,updatedAt:now,updatedBy:"",completedAt:"",history:[]})};
 const saveEntry=(next:DownEntry)=>{if(next.workflow!=="Completed"&&entries.some(entry=>entry.id!==next.id&&entry.workflow!=="Completed"&&entry.busId===next.busId)){alert("That bus already has an active down-sheet entry.");return}const nextFleet=applyDownEntryToFleet(fleet,next);setFleet(nextFleet);localStorage.setItem(FLEET_KEY,JSON.stringify({version:4,buses:nextFleet}));setEntries(current=>current.some(entry=>entry.id===next.id)?current.map(entry=>entry.id===next.id?next:entry):[...current,next]);setEditing(null)};
 const clearEntireDownSheet=()=>{if(!entries.length&&!fleet.some(bus=>bus.down)){alert("The down sheet is already clear.");return}if(!confirm("Clear the entire down sheet and uncheck every tracker bus marked on it? Bus locations and defects will stay unchanged."))return;const result=clearDownSheetState(entries,fleet),downText=JSON.stringify({version:1,entries:result.entries}),fleetText=JSON.stringify({version:4,buses:result.fleet});localStorage.setItem(DOWN_SHEET_CLEAR_UNDO_KEY,JSON.stringify(result.snapshot));localStorage.setItem(DOWN_KEY,downText);localStorage.setItem(FLEET_KEY,fleetText);setEntries(result.entries);setFleet(result.fleet);setUndoClearAvailable(true)};
 const undoClear=()=>{const snapshot=readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY));if(!snapshot){setUndoClearAvailable(false);alert("There is no cleared down sheet to restore.");return}const result=restoreDownSheetState(entries,fleet,snapshot),downText=JSON.stringify({version:1,entries:result.entries}),fleetText=JSON.stringify({version:4,buses:result.fleet});localStorage.setItem(DOWN_KEY,downText);localStorage.setItem(FLEET_KEY,fleetText);localStorage.removeItem(DOWN_SHEET_CLEAR_UNDO_KEY);setEntries(result.entries);setFleet(result.fleet);setUndoClearAvailable(false)};
 const importScan=(records:ScanImportRecord[],mode:"merge"|"replace")=>{
  const now=new Date().toISOString(),baseEntries=mode==="replace"?[]:entries,baseFleet=mode==="replace"?fleet.map(bus=>({...bus,down:false})):fleet;
  const incomingIds=new Set(records.map(record=>record.busId)),remaining=baseEntries.filter(entry=>!isActive(entry)||!incomingIds.has(entry.busId));
  const imported=records.map((record,index)=>{
   const prior=baseEntries.find(entry=>isActive(entry)&&entry.busId===record.busId),assignmentType:AssignmentType=record.section==="Vendor Repair"?"Vendor":"Mechanic",workflow:Workflow=record.operationalStatus==="shop"?"In Progress":"Scheduled";
   return normalizeEntry({...prior,id:prior?.id||`repair-scan-${Date.now()}-${index}`,busId:record.busId,busNumber:record.busNumber,category:record.category,repair:record.repair,customReason:record.reason,assignmentType,assignedTo:record.assignedTo,section:record.section,shift:record.shift,workflow,operationalStatus:record.operationalStatus,timeEstimate:normalizeRepairTimeEstimate(undefined,record.category,record.repair),updatedAt:now,updatedBy:defaultInitials||"SCAN",history:[...(prior?.history||[]),{at:now,initials:defaultInitials||"SCAN",action:"Imported from sheet photo"}]},index);
  });
  const nextEntries=[...remaining,...imported];
  if(nextEntries.filter(isActive).length>MAX_ENTRIES){alert("This import would exceed the 98-bus Down Sheet capacity. Deselect some rows and try again.");return}
  const nextFleet=imported.reduce((current,entry)=>applyDownEntryToFleet(current,entry,now),baseFleet);
  localStorage.setItem(SCAN_UNDO_KEY,JSON.stringify({createdAt:now,entries,fleet}));
  localStorage.setItem(DOWN_KEY,JSON.stringify({version:1,entries:nextEntries}));
  localStorage.setItem(FLEET_KEY,JSON.stringify({version:4,buses:nextFleet}));
  setEntries(nextEntries);setFleet(nextFleet);setUndoScanAvailable(true);setScannerOpen(false);
  alert(`${imported.length} bus${imported.length===1?"":"es"} imported. Review the Down Sheet before relying on it.`);
 };
 const undoScan=()=>{try{const snapshot=JSON.parse(localStorage.getItem(SCAN_UNDO_KEY)||"null");if(!snapshot||!Array.isArray(snapshot.entries)||!Array.isArray(snapshot.fleet))throw new Error();localStorage.setItem(DOWN_KEY,JSON.stringify({version:1,entries:snapshot.entries}));localStorage.setItem(FLEET_KEY,JSON.stringify({version:4,buses:snapshot.fleet}));localStorage.removeItem(SCAN_UNDO_KEY);setEntries(snapshot.entries.map(normalizeEntry));setFleet(snapshot.fleet);setUndoScanAvailable(false)}catch{localStorage.removeItem(SCAN_UNDO_KEY);setUndoScanAvailable(false);alert("There is no photo import to restore.")}};

 return <main className="down-app">
  <header className="down-header">
   <div><span>FLEET MAINTENANCE</span><h1>Interactive Down Sheet</h1><p>Repair scheduling and live fleet-status control</p></div>
   <nav aria-label="Tracker pages"><a href="/">FACILITY MAP</a><a className="active" href="/down-sheet" aria-current="page">DOWN SHEET</a><a href="/defect-log">DEFECT LOG</a></nav>
  </header>

  <section className="down-summary" aria-label="Down sheet summary">
   <div className="primary-count"><strong>{counters.active}</strong><span>ACTIVE DOWN</span></div>
   <div><strong>{counters.pending}</strong><span>PENDING</span></div>
   <div><strong>{counters.accident}</strong><span>ACCIDENT</span></div>
   <div><strong>{counters.waiting}</strong><span>WAITING PARTS</span></div>
   <div><strong>{counters.completedToday}</strong><span>COMPLETED TODAY</span></div>
   <div className="labor-total"><strong>{formatRepairTime(counters.activeMinutes)}</strong><span>EST. ACTIVE LABOR</span></div>
   <div className="labor-total view-total"><strong>{formatRepairTime(visibleMinutes)}</strong><span>EST. CURRENT VIEW</span></div>
   <div className="capacity"><strong>{active.length}<small> / {MAX_ENTRIES}</small></strong><span>SHEET CAPACITY</span></div>
  </section>

  <section className="down-controls">
   <div className="shift-filter" aria-label="Filter down sheet by shift">
    <span>SHOW:</span>{(["All","1st","2nd","3rd"] as ShiftFilter[]).map(value=><button type="button" className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>setFilter(value)} key={value}>{value.toUpperCase()}{value!=="All"&&<b>{value==="1st"?counters.first:value==="2nd"?counters.second:counters.third}</b>}</button>)}
   </div>
   <label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span/>SHOW COMPLETED</label>
   {undoScanAvailable&&<button className="undo-scan" type="button" onClick={undoScan}>UNDO IMPORT</button>}
   {undoClearAvailable&&<button className="undo-clear" type="button" onClick={undoClear}>UNDO CLEAR</button>}
   <button className="clear-downsheet" type="button" onClick={clearEntireDownSheet} disabled={!entries.length&&!fleet.some(bus=>bus.down)}>CLEAR DOWNSHEET</button>
   <button className="scan-sheet-button" type="button" onClick={()=>setScannerOpen(true)}>▣ SCAN SHEET</button>
   <button className="add-repair" type="button" onClick={openNewEntry} disabled={active.length>=MAX_ENTRIES}>+ ADD DOWN BUS</button>
   <button className="down-settings" type="button" onClick={()=>setSettingsOpen(true)} aria-label="Open down sheet settings">⚙ SETTINGS</button>
  </section>

  <section className="quick-notes">
   <label htmlFor="down-quick-notes"><b>QUICK NOTES</b><span>Saved automatically on this device</span></label>
   <textarea id="down-quick-notes" value={quickNotes} onChange={event=>setQuickNotes(event.target.value)} placeholder="Example: 3 road calls today; follow up with vendor; check late-shift parts delivery."/>
  </section>
  <section className="sheet-wrap">
   <div className="sheet-title"><div><b>MAINTENANCE FACILITY</b><span>Maintenance Down Sheet</span></div><p>{filter==="All"?"ALL SHIFTS":filter+" SHIFT"} · {visible.length} ROW{visible.length===1?"":"S"} · {formatRepairTime(visibleMinutes)} ESTIMATED</p></div>
   <div className="sheet-scroll">
    <table className="down-table">
     <thead><tr><th>LINE</th><th>BUS NUMBER</th><th>REASON DOWN</th><th>MECHANIC / VENDOR</th><th>SECTION</th><th>SHIFT</th><th>WORK STATUS</th><th>EST. TIME</th><th>UPDATED BY</th></tr></thead>
     <tbody>{visible.length?visible.map((entry,index)=><tr className={entry.workflow==="Completed"?"completed":""} key={entry.id}>
      <td className="line-number">{String(index+1).padStart(2,"0")}</td>
      <td className="fleet-number"><button className="fleet-number-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit down-sheet entry for bus "+entry.busNumber}><b>{entry.busNumber||"—"}</b><small>{STATUS_LABELS[entry.operationalStatus]}</small></button></td>
      <td><button className="reason-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit repair details for bus "+entry.busNumber}><b>{entry.repairItems&&entry.repairItems.length>1?entry.repairItems.length+" REPAIRS":entry.category}</b><span>{reasonLabel(entry)}</span></button></td>
      <td><span className={"assignment "+entry.assignmentType.toLowerCase()}><small>{entry.assignmentType}</small>{entry.assignedTo||"Unassigned"}</span></td>
      <td><b className={"section-tag "+entry.section.toLowerCase().replaceAll(" ","-")}>{entry.section}</b></td>
      <td><b className="shift-tag">{entry.shift}</b></td>
      <td><b className={"workflow "+entry.workflow.toLowerCase().replaceAll(" ","-")}>{entry.workflow}</b></td>
      <td className="estimate-cell"><b>{isQuarantineEntry(entry)?"N/A":entryEstimateMinutes(entry)?formatRepairTime(entryEstimateMinutes(entry)):"NOT SET"}</b><small>{isQuarantineEntry(entry)?"QUARANTINE":"MECHANIC PLAN"}</small></td>
      <td className="updated"><b>{entry.updatedBy||"—"}</b><small>{timeLabel(entry.updatedAt)}</small></td>
     </tr>):<tr><td className="empty-sheet" colSpan={9}><b>No buses match this view.</b><span>All shifts are shown by default. Use Add Down Bus to create the first repair entry.</span></td></tr>}</tbody>
    </table>
   </div>
  </section>
  <footer className="down-footnote"><span>ACTIVE DOWN COUNT EXCLUDES COMPLETED REPAIRS</span><span>BUS LOCATION IS CONTROLLED ONLY FROM THE FACILITY MAP</span></footer>
  {editing&&<DownSheetEditor entry={editing} fleet={fleet} entries={entries} defaultInitials={defaultInitials} onClose={()=>setEditing(null)} onSave={saveEntry}/>}
  {settingsOpen&&<DownSheetSettings defaultInitials={defaultInitials} setDefaultInitials={setDefaultInitials} defaultShift={defaultShift} setDefaultShift={setDefaultShift} showCompleted={showCompleted} setShowCompleted={setShowCompleted} onClose={()=>setSettingsOpen(false)}/>}
  {scannerOpen&&<DownSheetScanner fleet={fleet} defaultShift={defaultShift} onClose={()=>setScannerOpen(false)} onImport={importScan}/>}
 </main>;
}
