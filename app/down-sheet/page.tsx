"use client";

import {Fragment,useEffect,useMemo,useState,type CSSProperties} from "react";
import TrackerNav from "../tracker-nav";
import "./down-sheet.css";
import DownSheetEditor from "./down-sheet-editor";
import DownSheetScanner from "./down-sheet-scanner";
import {applyDownEntryToFleet} from "./down-sheet-sync";
import {matchingUnresolvedDefectId} from "../duplicate-defects";
import {learnFinding,readFindingsMemory,writeFindingsMemory} from "../findings-memory";
import {clearDownSheetState,DOWN_SHEET_CLEAR_UNDO_KEY,readDownSheetClearSnapshot,restoreDownSheetState} from "./down-sheet-clear";
import {defectSupportingDetails,isUnresolved,normalizeFinding,type StructuredDefect} from "../repair-catalog";
import {reconcileDownSheetMembership} from "../down-sheet-counter";
import {formatRepairTime,normalizeRepairTimeEstimate,repairTimeTotal,type RepairTimeEstimate} from "./repair-time-estimates";
import {blankRepairItem,isQuarantineEntry,normalizeRepairItems,repairItemsProgress,repairItemsReason,repairItemsTotal,type DownSheetRepairItem} from "./down-sheet-repair-items";
import type {ScanImportRecord} from "./down-sheet-scan-import";
import {prepareFleetForScannedReplacement,scannedSheetRemovals} from "./down-sheet-replace";
import {downSheetRoadCounts,downSheetRoadEntries,downSheetWorkGroup,groupDownSheetEntries,isDownSheetRoadLocation,matchesDownSheetSearch,type DownSheetOrder,type DownSheetRoadKind} from "./down-sheet-view";
import {DEFAULT_DOWN_SHEET_DISPLAY,normalizeDownSheetDisplay,type DownSheetDisplaySettings} from "./down-sheet-display-settings";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,readDownSheetPayload,readFleetPayload,writeDownSheetStorage,writeDownSheetStorageResult,writeFleetStorage,writeFleetStorageResult,writeSetting,type FleetWriteReason} from "../storage";
import SaveAlert from "../save-alert";
import {DeferredNavBadge,DeferredReviewPrompt} from "../deferred-watch";
import {exportFleetBoardBackup} from "../fleet-backup";
import ShopCloudLive from "../shop-cloud-live";
import {forgetRemovedEntries,rememberRemovedEntries} from "../cloud-sync";

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
 /* What was actually done, captured when the entry is closed out. The Down
    Sheet already knew who was assigned and never wrote it anywhere the repair
    history could read, so a completed entry reached Fixed Repairs with no
    technician, no fix, no time and no cause on it. All optional: a foreman
    closing ten buses at end of shift must never be made to fill in a form to
    flip a dropdown. */
 completedBy?:string;
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:RepairHistory[];
};

const MAX_ENTRIES=98;
const SETTINGS_KEY="pace-down-sheet-settings-v1";
const STATS_OPEN_KEY="pace-down-sheet-stats-open-v1";
const SCAN_UNDO_KEY="pace-down-sheet-scan-undo-v1";
const STATUS_LABELS:Record<FleetStatus,string>={service:"In Service / On Road",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown"};

function shiftFromFleet(value?:string):Shift{
 if(value==="Evening")return "2nd";
 if(value==="Night")return "3rd";
 return "1st";
}

function normalizeEntry(value:Partial<DownEntry>,index:number):DownEntry{
 const now=new Date().toISOString();
 return {...value,
  id:value.id||"repair-imported-"+index,
  defectId:value.defectId,
  busId:value.busId||"",
  busNumber:value.busNumber||"",
  category:value.category||"Miscellaneous",
  repair:value.repair||"Repair required",
  customReason:value.customReason||"",
  repairItems:normalizeRepairItems(value.repairItems,{category:value.category||"Miscellaneous",repair:value.repair||"Repair required",details:value.customReason||"",timeEstimate:value.timeEstimate,entryCompleted:value.workflow==="Completed"}),
  assignmentType:value.assignmentType||"Mechanic",
  assignedTo:value.assignedTo||"",
  completedBy:value.completedBy||"",
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
 return fleet.filter(bus=>bus.down===true).slice(0,MAX_ENTRIES).map(bus=>({
  id:"repair-"+bus.id,
  busId:bus.id,
  busNumber:bus.n,
  category:bus.defects?.find(isUnresolved)?.category||"Miscellaneous",
  repair:bus.defects?.find(isUnresolved)?.issue||bus.pendingRepair?.trim()||STATUS_LABELS[bus.s]||"Repair required",
  customReason:bus.defects?.find(isUnresolved)?.details||"",
  repairItems:(bus.defects||[]).filter(isUnresolved).map((defect,index)=>({...blankRepairItem(index),category:defect.category,repair:defect.issue,details:defectSupportingDetails(defect),estimateEnabled:true,timeEstimate:normalizeRepairTimeEstimate(undefined,defect.category,defect.issue)})),
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

/* Two of three finished must not read the same as a bus nobody has touched.
   The count is what the foreman scans down the sheet for. */
function repairProgressLabel(entry:DownEntry){
 const progress=repairItemsProgress(entry.repairItems||[]);
 return progress.done>0&&!progress.complete
  ?progress.done+" OF "+progress.total+" DONE"
  :(entry.repairItems||[]).length+" REPAIRS";
}
function reasonLabel(entry:DownEntry){return entry.repairItems?.length?repairItemsReason(entry.repairItems):[entry.category,entry.repair,entry.customReason].filter(Boolean).join(" — ")}
function entryEstimateMinutes(entry:DownEntry){if(isQuarantineEntry(entry))return 0;return entry.repairItems?repairItemsTotal(entry.repairItems):repairTimeTotal(entry.timeEstimate)}
function isActive(entry:DownEntry){return entry.workflow!=="Completed"}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){if(!value)return "Not updated";return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value))}

export default function DownSheet(){
 const [saveProblem,setSaveProblem]=useState<FleetWriteReason|"">("");
 const [fleet,setFleet]=useState<FleetBus[]>([]);
 const [entries,setEntries]=useState<DownEntry[]>([]);
 const [filter,setFilter]=useState<ShiftFilter>("All");
 const [showCompleted,setShowCompleted]=useState(false);
 /* The COMPLETED TODAY tile as a view rather than an ornament. It counted the
    right thing and did nothing when pressed, so the one question it answers —
    what did we actually finish today — could only be reached by turning on
    SHOW COMPLETED and reading past everything else on the sheet. */
 const [fixedToday,setFixedToday]=useState(false);
 const [hydrated,setHydrated]=useState(false);
 const [editing,setEditing]=useState<DownEntry|null>(null);
 /* Absent means closed, like the Defect Log's. A device that has never opened
    the stats does not have to write anything to say so. */
 const [statsOpen,setStatsOpen]=useState(false);
 useEffect(()=>{setStatsOpen(localStorage.getItem(STATS_OPEN_KEY)==="1")},[]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,STATS_OPEN_KEY,statsOpen?"1":"0")},[statsOpen,hydrated]);
 const [scannerOpen,setScannerOpen]=useState(false);
 const [defaultInitials,setDefaultInitials]=useState("");
 const [defaultShift,setDefaultShift]=useState<Shift>("1st");
 const [displaySettings,setDisplaySettings]=useState<DownSheetDisplaySettings>(DEFAULT_DOWN_SHEET_DISPLAY);
 const [quickNotes,setQuickNotes]=useState("");
 const [savedQuickNotes,setSavedQuickNotes]=useState("");
 const [search,setSearch]=useState("");
 const [order,setOrder]=useState<DownSheetOrder>("number-asc");
 /* Which of the two road tallies is being read, if either. Not persisted: it is
    a question somebody asks of the sheet in the moment, not a preference. */
 const [roadFilter,setRoadFilter]=useState<DownSheetRoadKind|null>(null);
 const [undoClearAvailable,setUndoClearAvailable]=useState(false);
 const [undoScanAvailable,setUndoScanAvailable]=useState(false);

 // Restore the existing device-local fleet and down sheet once after hydration.
 useEffect(()=>{try{const fleetPayload=readFleetPayload<FleetBus>(localStorage.getItem(FLEET_KEY)),nextFleet=fleetPayload.valid?fleetPayload.buses:[];setFleet(nextFleet);const downPayload=readDownSheetPayload<DownEntry>(localStorage.getItem(DOWN_KEY)),nextEntries=downPayload.valid?downPayload.entries:[],restored=nextEntries.map(normalizeEntry),knownActive=new Set(restored.filter(isActive).map((entry:DownEntry)=>entry.busId)),added=entriesFromFleet(nextFleet).filter(entry=>!knownActive.has(entry.busId));setEntries([...restored,...added].slice(0,MAX_ENTRIES));setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY))));setUndoScanAvailable(Boolean(localStorage.getItem(SCAN_UNDO_KEY)));const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"),note=typeof settings.quickNotes==="string"?settings.quickNotes:"";setShowCompleted(Boolean(settings.showCompleted));setDefaultInitials(typeof settings.defaultInitials==="string"?settings.defaultInitials:"");setDefaultShift((["1st","2nd","3rd"] as string[]).includes(settings.defaultShift)?settings.defaultShift:"1st");setQuickNotes(note);setSavedQuickNotes(note);setOrder(settings.order==="number-desc"||settings.order==="category"?settings.order:"number-asc");setDisplaySettings(normalizeDownSheetDisplay(settings.display))}catch{setFleet([]);setEntries([])}setHydrated(true)},[]);

 // Active Down Sheet rows are the single source of truth for every tracker checkbox and DS badge.
 useEffect(()=>{if(!hydrated)return;setSaveProblem(writeDownSheetStorageResult(localStorage,entries).reason||"");const activeIds=entries.filter(isActive).map(entry=>entry.busId);setFleet(current=>{const reconciled=reconcileDownSheetMembership(current,activeIds);if(reconciled!==current)writeFleetStorage(localStorage,reconciled);return reconciled})},[entries,hydrated]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,SETTINGS_KEY,JSON.stringify({showCompleted,defaultInitials,defaultShift,quickNotes:savedQuickNotes,order,display:displaySettings}))},[showCompleted,defaultInitials,defaultShift,savedQuickNotes,order,displaySettings,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY&&event.newValue){const payload=readFleetPayload<FleetBus>(event.newValue);if(payload.valid){const nextFleet=payload.buses;setFleet(nextFleet);setEntries(current=>{const merged=current.map(entry=>{const bus=nextFleet.find(item=>item.id===entry.busId);if(!bus)return entry;const activeDefect=bus.defects?.find(isUnresolved),incoming=bus.pendingRepair?.trim()||"",currentReason=reasonLabel(entry);if(activeDefect)return {...entry,operationalStatus:bus.s,category:activeDefect.category,repair:activeDefect.issue,customReason:activeDefect.details};return {...entry,operationalStatus:bus.s,...(incoming&&incoming!==currentReason?{category:"Miscellaneous",repair:"Driver-reported defect",customReason:incoming}:{})}}),known=new Set(merged.map(entry=>entry.busId)),added=entriesFromFleet(nextFleet).filter(entry=>!known.has(entry.busId));return [...merged,...added].slice(0,MAX_ENTRIES)})}}if(event.key===DOWN_KEY&&event.newValue){const payload=readDownSheetPayload<DownEntry>(event.newValue);if(payload.valid)setEntries(payload.entries.map(normalizeEntry))}if(event.key===DOWN_SHEET_CLEAR_UNDO_KEY)setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(event.newValue)));if(event.key===SCAN_UNDO_KEY)setUndoScanAvailable(Boolean(event.newValue));/* Settings are edited on the shared page now. This page writes its whole settings object back whenever a field changes, so it has to take the new values into its own state or its next write would put the stale copy over them. */if(event.key===SETTINGS_KEY){try{const saved=JSON.parse(event.newValue||"{}");setShowCompleted(saved.showCompleted===true);if(typeof saved.defaultInitials==="string")setDefaultInitials(saved.defaultInitials);if(saved.defaultShift==="1st"||saved.defaultShift==="2nd"||saved.defaultShift==="3rd")setDefaultShift(saved.defaultShift);setDisplaySettings(normalizeDownSheetDisplay(saved.display))}catch{}}};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

 const active=useMemo(()=>entries.filter(isActive),[entries]);
 /* Where each bus actually is, which is the first thing the section rules ask.
    The map owns this — the sheet only reads it — so it is looked up by bus id
    rather than copied onto the entry, where it would go stale the moment
    somebody moved the bus on the map. */
 const locations=useMemo(()=>Object.fromEntries(fleet.map(bus=>[bus.id,bus.l||""])),[fleet]);
 const shown=useMemo(()=>entries.filter(entry=>(fixedToday?entry.workflow==="Completed"&&isToday(entry.completedAt):(showCompleted||isActive(entry)))&&(filter==="All"||entry.shift===filter)&&matchesDownSheetSearch(entry,search)),[entries,filter,showCompleted,search,fixedToday]);
 /* Counted BEFORE the road filter is applied, so pressing one tally does not
    empty the other one out from under the person reading it. Both stay on
    screen saying what they always said; only the sheet below narrows. */
 const roadCounts=useMemo(()=>downSheetRoadCounts(shown,locations),[shown,locations]);
 const groups=useMemo(()=>groupDownSheetEntries(roadFilter?downSheetRoadEntries(shown,locations,roadFilter):shown,order,locations),[shown,order,locations,roadFilter]);
 const visible=useMemo(()=>groups.flatMap(group=>group.entries),[groups]);
 const visibleMinutes=visible.reduce((total,entry)=>total+entryEstimateMinutes(entry),0);
 const counters={active:active.length,first:active.filter(entry=>entry.shift==="1st").length,second:active.filter(entry=>entry.shift==="2nd").length,third:active.filter(entry=>entry.shift==="3rd").length,pending:active.filter(entry=>entry.section==="Pending").length,accident:active.filter(entry=>entry.section==="Accident").length,waiting:active.filter(entry=>entry.workflow==="Waiting for Parts").length,completedToday:entries.filter(entry=>entry.workflow==="Completed"&&isToday(entry.completedAt)).length,activeMinutes:active.reduce((total,entry)=>total+entryEstimateMinutes(entry),0)};
 const openNewEntry=()=>{if(active.length>=MAX_ENTRIES){alert("The active down sheet has reached its 98-entry capacity.");return}const bus=fleet.find(item=>!active.some(entry=>entry.busId===item.id));if(!bus){alert("Every available fleet bus already has an active down-sheet entry.");return}const now=new Date().toISOString();setEditing({id:"repair-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),busId:bus.id,busNumber:bus.n,category:"",repair:"",customReason:"",repairItems:[blankRepairItem()],assignmentType:"Mechanic",assignedTo:"",section:"Pending",shift:defaultShift,workflow:"Scheduled",operationalStatus:bus.s,priority:"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,"",""),createdAt:now,updatedAt:now,updatedBy:"",completedAt:"",history:[]})};
 const saveQuickNote=()=>{setSavedQuickNotes(quickNotes);try{const current=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");localStorage.setItem(SETTINGS_KEY,JSON.stringify({...current,showCompleted,defaultInitials,defaultShift,quickNotes,order,display:displaySettings}))}catch{localStorage.setItem(SETTINGS_KEY,JSON.stringify({showCompleted,defaultInitials,defaultShift,quickNotes,order,display:displaySettings}))}};
 const saveEntry=(next:DownEntry)=>{if(next.workflow!=="Completed"&&entries.some(entry=>entry.id!==next.id&&entry.workflow!=="Completed"&&entry.busId===next.busId)){alert("That bus already has an active down-sheet entry.");return}const nextFleet=applyDownEntryToFleet(fleet,next);setFleet(nextFleet);writeFleetStorage(localStorage,nextFleet);
  /* MOVE BUS TO is an instruction, not a property of the repair, so it is
     cleared once it has been carried out. Left on the entry it would re-run on
     every later save: park the bus somewhere on the map, reopen the entry to
     fix a typo, and the bus would jump back to wherever the sheet last said. */
  next={...next,location:undefined};/* Every repair on the entry teaches its own cause, under its own symptom. */
 const found=(next.repairItems||[]).filter(item=>normalizeFinding(item.finding));
 if(found.length)writeFindingsMemory(localStorage,found.reduce((memory,item)=>learnFinding(memory,{category:item.category,issue:item.repair,finding:item.finding}),readFindingsMemory(localStorage)));setEntries(current=>current.some(entry=>entry.id===next.id)?current.map(entry=>entry.id===next.id?next:entry):[...current,next]);setEditing(null)};
 const clearEntireDownSheet=()=>{if(!entries.length&&!fleet.some(bus=>bus.down)){alert("The down sheet is already clear.");return}if(!confirm("Clear the entire down sheet and uncheck every tracker bus marked on it? Bus locations and defects will stay unchanged."))return;const result=clearDownSheetState(entries,fleet);setSaveProblem(writeSetting(localStorage,DOWN_SHEET_CLEAR_UNDO_KEY,JSON.stringify(result.snapshot)).reason||"");
  /* Written down so the removal actually travels. A push only sends what the
     sheet still carries, so without this the cleared rows stayed live on the
     server and the next pull handed every one of them back — which is why
     clearing the sheet and watching it refill was reproducible. */
  rememberRemovedEntries(localStorage,entries.map(entry=>entry.id),new Date().toISOString());writeDownSheetStorage(localStorage,result.entries);writeFleetStorage(localStorage,result.fleet);setEntries(result.entries);setFleet(result.fleet);setUndoClearAvailable(true)};
 const undoClear=()=>{const snapshot=readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY));if(!snapshot){setUndoClearAvailable(false);alert("There is no cleared down sheet to restore.");return}const restoredAt=new Date().toISOString(),held=new Set(entries.map(entry=>entry.id)),plain=restoreDownSheetState(entries,fleet,snapshot);
  /* Off the removal ledger, and restamped as touched now.

     Both halves are needed. The ledger is what refuses an entry on the way back
     in, and the server compares updated_at to decide whether a write is newer
     than the tombstone the clear sent — so an entry put back carrying its old
     stamp would lose that comparison and be deleted again on the next pull,
     silently. Restoring the sheet IS touching it, so the stamp is honest. */
  forgetRemovedEntries(localStorage,snapshot.entries.map(entry=>entry.id));
  const result={...plain,entries:plain.entries.map(entry=>held.has(entry.id)?entry:{...entry,updatedAt:restoredAt})};writeDownSheetStorage(localStorage,result.entries);writeFleetStorage(localStorage,result.fleet);localStorage.removeItem(DOWN_SHEET_CLEAR_UNDO_KEY);setEntries(result.entries);setFleet(result.fleet);setUndoClearAvailable(false)};
 const importScan=(records:ScanImportRecord[])=>{
  const now=new Date().toISOString(),incomingIds=new Set(records.map(record=>record.busId)),removed=scannedSheetRemovals(entries,incomingIds),baseFleet=prepareFleetForScannedReplacement(fleet,removed,now);
  const imported=records.map((record,index)=>{
   const prior=entries.find(entry=>isActive(entry)&&entry.busId===record.busId),assignmentType:AssignmentType=record.section==="Vendor Repair"?"Vendor":"Mechanic",workflow:Workflow=record.operationalStatus==="shop"?"In Progress":"Scheduled";
   /* Write to the record the bus already has, rather than minting a second one.

      A defect is keyed on the entry that carried it in, and a rescan of the same
      paper sheet makes a new entry id out of the clock. A bus that comes off the
      sheet and back on — or is simply photographed again on a later day — then
      arrives with an id nothing on the bus matches, and the identical fault is
      recorded twice. That is how 21 buses came to carry 25 records saying
      nothing the record beside them did not already say.

      Naming the existing record here is enough: the sheet already adopts an
      entry's stated defectId ahead of any id it would generate, so the scan
      updates that record instead of adding to it. Only an EXACT repeat matches —
      same category, symptom and details — so a genuinely different fault on the
      same bus still becomes its own record. */
   const defectId=prior?.defectId||matchingUnresolvedDefectId(fleet.find(bus=>bus.id===record.busId),record);
   return normalizeEntry({...prior,id:prior?.id||`repair-scan-${Date.now()}-${index}`,...(defectId?{defectId}:{}),busId:record.busId,busNumber:record.busNumber,category:record.category,repair:record.repair,customReason:record.reason,assignmentType,assignedTo:record.assignedTo,section:record.section,shift:record.shift,workflow,operationalStatus:record.operationalStatus,timeEstimate:normalizeRepairTimeEstimate(undefined,record.category,record.repair),updatedAt:now,updatedBy:defaultInitials||"SCAN",history:[...(prior?.history||[]),{at:now,initials:defaultInitials||"SCAN",action:"Imported from sheet photo"}]},index);
  });
  const nextEntries=[...imported];
  if(nextEntries.filter(isActive).length>MAX_ENTRIES){alert("This import would exceed the 98-bus Down Sheet capacity. Deselect some rows and try again.");return}
  const nextFleet=imported.reduce((current,entry)=>applyDownEntryToFleet(current,entry,now),baseFleet);
  /* If the undo copy cannot be written the import must not proceed: replacing
     the sheet with no way back is exactly the kind of one-way door this app
     does not build. */
  if(!writeSetting(localStorage,SCAN_UNDO_KEY,JSON.stringify({createdAt:now,entries,fleet})).ok){
   setSaveProblem("storage-full");
   alert("This device has no room to save an undo copy, so the import was stopped. Export a backup and clear space, then scan again.");
   return;
  }
  /* Every bus the new sheet does not name comes off, and comes off everywhere.
     A replacing scan is the commonest removal in the shop and it was the one
     that travelled least: the buses it dropped stayed live in the cloud, came
     back on the next pull, and were counted again. */
  rememberRemovedEntries(localStorage,removed.map(entry=>entry.id),now);
  writeDownSheetStorage(localStorage,nextEntries);
  setSaveProblem(writeFleetStorageResult(localStorage,nextFleet).reason||"");
  setEntries(nextEntries);setFleet(nextFleet);setUndoScanAvailable(true);setScannerOpen(false);
  alert(`${imported.length} bus${imported.length===1?"":"es"} imported as the current Down Sheet. ${removed.length} prior bus${removed.length===1?"":"es"} came off. Locations and saved defects were preserved.`);
 };
 const undoScan=()=>{try{const snapshot=JSON.parse(localStorage.getItem(SCAN_UNDO_KEY)||"null");if(!snapshot||!Array.isArray(snapshot.entries)||!Array.isArray(snapshot.fleet))throw new Error();
  /* The undo is itself a removal in one direction and a restore in the other:
     rows the scan created go, rows it replaced come back. Both have to reach
     the other devices or the import undoes itself only here. */
  const restoredAt=new Date().toISOString(),kept=new Set((snapshot.entries as DownEntry[]).map(entry=>entry.id)),held=new Set(entries.map(entry=>entry.id));
  rememberRemovedEntries(localStorage,entries.filter(entry=>!kept.has(entry.id)).map(entry=>entry.id),restoredAt);
  forgetRemovedEntries(localStorage,[...kept]);
  const restored=(snapshot.entries as Partial<DownEntry>[]).map(entry=>held.has(String(entry.id))?entry:{...entry,updatedAt:restoredAt});writeDownSheetStorage(localStorage,restored);writeFleetStorage(localStorage,snapshot.fleet);localStorage.removeItem(SCAN_UNDO_KEY);setEntries(restored.map(normalizeEntry));setFleet(snapshot.fleet);setUndoScanAvailable(false)}catch{localStorage.removeItem(SCAN_UNDO_KEY);setUndoScanAvailable(false);alert("There is no photo import to restore.")}};

 const appStyle={"--down-page-title-color":displaySettings.styles.pageTitle.color,"--down-page-title-size":displaySettings.styles.pageTitle.fontSize+"px","--down-summary-color":displaySettings.styles.summary.color,"--down-summary-size":displaySettings.styles.summary.fontSize+"px","--down-quick-notes-color":displaySettings.styles.quickNotes.color,"--down-quick-notes-size":displaySettings.styles.quickNotes.fontSize+"px","--down-sheet-title-color":displaySettings.styles.sheetTitle.color,"--down-sheet-title-size":displaySettings.styles.sheetTitle.fontSize+"px","--down-column-header-color":displaySettings.styles.columnHeaders.color,"--down-column-header-size":displaySettings.styles.columnHeaders.fontSize+"px","--down-reason-category-color":displaySettings.styles.reasonCategory.color,"--down-reason-category-size":displaySettings.styles.reasonCategory.fontSize+"px","--down-reason-details-color":displaySettings.styles.reasonDetails.color,"--down-reason-details-size":displaySettings.styles.reasonDetails.fontSize+"px"} as CSSProperties;

 return <main className="down-app" style={appStyle}><SaveAlert reason={saveProblem} onExport={()=>exportFleetBoardBackup(localStorage,fleet)}/><ShopCloudLive/><DeferredNavBadge/><DeferredReviewPrompt/>
  <header className="down-header">
   <div><span>FLEET MAINTENANCE</span><h1>{displaySettings.labels.pageTitle}</h1><p>{displaySettings.labels.subtitle}</p></div>
   <TrackerNav active="/down-sheet"/>
  </header>

  {/* Eight tiles were the first thing on the sheet, above the filters and above
      the button that adds a bus. Behind one bar now, carrying the numbers worth
      a glance, remembered per device. COMPLETED TODAY stays a button inside —
      it filters — so it is only reachable with the panel open, same as before
      it had a bar in front of it. */}
  <section className={"sheet-stats"+(statsOpen?" open":"")}>
   <button type="button" className="sheet-stats-toggle" aria-expanded={statsOpen} onClick={()=>setStatsOpen(open=>!open)}>
    <b>SHEET STATS</b><small>{counters.active} {String(displaySettings.labels.active).toLowerCase()} · {counters.pending} {String(displaySettings.labels.pending).toLowerCase()} · {formatRepairTime(counters.activeMinutes)} est. labor · {active.length}/{MAX_ENTRIES} capacity</small><i aria-hidden="true">{statsOpen?"CLOSE":"OPEN"}</i>
   </button>
   {statsOpen&&<section className="down-summary" aria-label="Down sheet summary">
   <div className="primary-count"><strong>{counters.active}</strong><span>{displaySettings.labels.active}</span></div>
   <div><strong>{counters.pending}</strong><span>{displaySettings.labels.pending}</span></div>
   <div><strong>{counters.accident}</strong><span>{displaySettings.labels.accident}</span></div>
   <div><strong>{counters.waiting}</strong><span>{displaySettings.labels.waiting}</span></div>
   <button type="button" className={"completed-today-tile"+(fixedToday?" active":"")} aria-pressed={fixedToday} disabled={!counters.completedToday&&!fixedToday} onClick={()=>setFixedToday(value=>!value)}><strong>{counters.completedToday}</strong><span>{displaySettings.labels.completed}</span></button>
   <div className="labor-total"><strong>{formatRepairTime(counters.activeMinutes)}</strong><span>{displaySettings.labels.activeLabor||"EST. ACTIVE LABOR"}</span></div>
   <div className="labor-total view-total"><strong>{formatRepairTime(visibleMinutes)}</strong><span>{displaySettings.labels.currentView||"EST. CURRENT VIEW"}</span></div>
   <div className="capacity"><strong>{active.length}<small> / {MAX_ENTRIES}</small></strong><span>{displaySettings.labels.capacity}</span></div>
   </section>}
  </section>

  <section className="down-controls">
   {/* The one thing this page is for, first and full width. It used to sit in
       the bottom-right of a block of six, below CLEAR DOWNSHEET. */}
   <button className="down-primary-action" type="button" onClick={openNewEntry} disabled={active.length>=MAX_ENTRIES} title={active.length>=MAX_ENTRIES?"The sheet is full at "+MAX_ENTRIES+" buses":"Add a bus to the Down Sheet"}>+ ADD DOWN BUS</button>
   <div className="shift-filter" aria-label="Filter down sheet by shift">
    <span>SHOW:</span>{(["All","1st","2nd","3rd"] as ShiftFilter[]).map(value=><button type="button" className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>setFilter(current=>current===value&&value!=="All"?"All":value)} key={value}>{value.toUpperCase()}{value!=="All"&&<b>{value==="1st"?counters.first:value==="2nd"?counters.second:counters.third}</b>}</button>)}
   </div>
   <label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span/>SHOW COMPLETED</label>
   <button className="scan-sheet-button" type="button" onClick={()=>setScannerOpen(true)}>▣ SCAN SHEET</button>
   
   {/* Clearing the sheet and undoing an import are recovery, not daily work.
       They were the loudest things on the page — a red CLEAR DOWNSHEET beside
       two amber buttons — sitting above the button that adds a bus. They are
       behind MORE now, and the undos still appear only when there is something
       to undo, so the row is usually just the one item. */}
   <details className="down-more">
    <summary>MORE</summary>
    <div>
     {undoScanAvailable&&<button className="undo-scan" type="button" onClick={undoScan}>UNDO IMPORT</button>}
     {undoClearAvailable&&<button className="undo-clear" type="button" onClick={undoClear}>UNDO CLEAR</button>}
     <button className="clear-downsheet" type="button" onClick={clearEntireDownSheet} disabled={!entries.length&&!fleet.some(bus=>bus.down)}>CLEAR DOWNSHEET</button>
    </div>
   </details>
  </section>

  <section className="down-view-controls" aria-label="Search and order Down Sheet">
   <label className="down-search"><b>SEARCH</b><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus #, repair, mechanic or vendor" aria-label="Search Down Sheet"/></label>
   {search&&<button className="clear-search" type="button" onClick={()=>setSearch("")}>CLEAR</button>}
   <label className="down-order"><b>ORDER</b><select value={order} onChange={event=>setOrder(event.target.value as DownSheetOrder)}><option value="number-asc">BUS NUMBER ↑</option><option value="number-desc">BUS NUMBER ↓</option><option value="category">WORK CATEGORIES</option></select></label>
   <span className="view-results"><b>{visible.length}</b> IN VIEW</span>
  </section>

  {/* The totals the sheet is read for, before the sheet itself. A bus away at a
      vendor and a bus sitting in the yard with nobody on it are both "down" in
      one long list, and that list could not tell anyone how many of each there
      were. Same four bands, same order, as the dividers below. */}
  <section className="down-group-counts" aria-label="Down sheet section counts">
   <div className="group-count total"><strong>{visible.length}</strong><span>TOTAL ON SHEET</span></div>
   {groups.map(group=><div className={"group-count group-"+group.key} key={group.key}><strong>{group.entries.length}</strong><span>{group.label}</span></div>)}
   {/* The inverse of the map's down-sheet badges. Those answer "is this bus on
       the sheet?" while looking at the yard; these answer "is this one out
       working?" while looking at the sheet — which the sheet itself could not
       say, because where a bus is belongs to the map. A bus carrying both an
       inspection and a fault is in both counts on purpose.

       Pressed, they narrow the sheet below to exactly what they count, so the
       number can be read as a list. They are buttons rather than tiles for
       that reason; the five above are a scoreboard and stay one. */}
   {([["inspection","INSPECTIONS ON ROAD",roadCounts.inspection],["down","DOWNED BUSES ON ROAD",roadCounts.down]] as [DownSheetRoadKind,string,number][]).map(([kind,label,count])=>
    <button type="button" className={"group-count group-road group-road-"+kind+(roadFilter===kind?" active":"")} key={kind} aria-pressed={roadFilter===kind}
     onClick={()=>setRoadFilter(current=>current===kind?null:kind)}
     title={roadFilter===kind?"Showing only these buses — press again to show the whole sheet":"Show only the "+count+" bus"+(count===1?"":"es")+" this counts"}>
     <strong>{count}</strong><span>{label}</span></button>)}
  </section>
  {roadFilter&&<p className="down-road-filter-note" role="status">Showing only <b>{roadFilter==="inspection"?"INSPECTIONS ON ROAD":"DOWNED BUSES ON ROAD"}</b> — {visible.length} of {shown.length} on the sheet. <button type="button" onClick={()=>setRoadFilter(null)}>SHOW THE WHOLE SHEET</button></p>}

  <section className="quick-notes">
   <label htmlFor="down-quick-notes"><b>{displaySettings.labels.quickNotes}</b><span>{quickNotes===savedQuickNotes?"Saved on this device":"Unsaved changes"}</span></label>
   <div className="quick-notes-editor"><textarea id="down-quick-notes" value={quickNotes} onChange={event=>setQuickNotes(event.target.value)} placeholder="Example: 3 road calls today; follow up with vendor; check late-shift parts delivery."/><button type="button" onClick={saveQuickNote} disabled={quickNotes===savedQuickNotes}>SAVE NOTE</button></div>
  </section>
  <section className="sheet-wrap">
   <div className="sheet-title"><div><b>{displaySettings.labels.sheetKicker||"MAINTENANCE FACILITY"}</b><span>{displaySettings.labels.sheetTitle}</span></div><p>{filter==="All"?"ALL SHIFTS":filter+" SHIFT"} · {visible.length} ROW{visible.length===1?"":"S"} · {formatRepairTime(visibleMinutes)} ESTIMATED</p></div>
   <div className="sheet-scroll">
    <table className="down-table">
     <thead><tr><th>{displaySettings.labels.line}</th><th>{displaySettings.labels.busNumber}</th><th>{displaySettings.labels.reasonDown}</th><th>{displaySettings.labels.assignment}</th><th>{displaySettings.labels.section}</th><th>{displaySettings.labels.shift}</th><th>{displaySettings.labels.workStatus}</th><th>{displaySettings.labels.estimatedTime}</th><th>{displaySettings.labels.updatedBy}</th></tr></thead>
     {/* The sheet divides itself, always — not only when an ordering is chosen.
         Each band carries its own count on the divider so the number never has
         to be arrived at by scrolling and adding. Line numbers keep running
         across the bands, the way they do on the paper sheet. */}
     <tbody>{visible.length?groups.map((group,groupIndex)=>{
      if(!group.entries.length)return null;
      const offset=groups.slice(0,groupIndex).reduce((sum,item)=>sum+item.entries.length,0);
      return <Fragment key={group.key}>
       <tr className={"down-group-row group-"+group.key}><td colSpan={9}><b>{group.label}</b><i>{group.entries.length}</i><span>{group.hint}</span></td></tr>
       {group.entries.map((entry,index)=>{const work=downSheetWorkGroup(entry),previous=index?downSheetWorkGroup(group.entries[index-1]):null;return <Fragment key={entry.id}>{order==="category"&&work.label!==previous?.label&&<tr className={"work-group-row group-"+work.rank}><td colSpan={9}>{work.label}</td></tr>}<tr className={entry.workflow==="Completed"?"completed":""}>
      <td className="line-number">{String(offset+index+1).padStart(2,"0")}</td>
      {/* ON ROAD, beside the number, on every row that is out working. The two
          tallies above give the counts; this is the same fact per bus, so it
          reads while scrolling without pressing anything. It sits outside the
          edit button on purpose — it is a fact about where the bus is, which
          this page reads from the map and does not own, so pressing it must not
          look like a way to change it. */}
      <td className="fleet-number"><button className="fleet-number-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit down-sheet entry for bus "+entry.busNumber}><b>{entry.busNumber||"—"}</b><small>{STATUS_LABELS[entry.operationalStatus]}</small></button>{isDownSheetRoadLocation(locations[entry.busId]||"")&&<i className="on-road-badge" title="This bus is out on the road right now, according to the Facility Map">ON ROAD</i>}</td>
      <td><button className="reason-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit repair details for bus "+entry.busNumber}><b>{entry.repairItems&&entry.repairItems.length>1?repairProgressLabel(entry):entry.category}</b><span>{reasonLabel(entry)}</span></button></td>
      <td><span className={"assignment "+entry.assignmentType.toLowerCase()}><small>{entry.assignmentType}</small>{entry.assignedTo||"Unassigned"}</span></td>
      <td><b className={"section-tag "+entry.section.toLowerCase().replaceAll(" ","-")}>{entry.section}</b></td>
      <td><b className="shift-tag">{entry.shift}</b></td>
      <td><b className={"workflow "+entry.workflow.toLowerCase().replaceAll(" ","-")}>{entry.workflow}</b></td>
      <td className="estimate-cell"><b>{isQuarantineEntry(entry)?"N/A":entryEstimateMinutes(entry)?formatRepairTime(entryEstimateMinutes(entry)):"NOT SET"}</b><small>{isQuarantineEntry(entry)?"QUARANTINE":"MECHANIC PLAN"}</small></td>
      <td className="updated"><b>{entry.updatedBy||"—"}</b><small>{timeLabel(entry.updatedAt)}</small></td>
     </tr></Fragment>})}
      </Fragment>;
     }):<tr><td className="empty-sheet" colSpan={9}><b>No buses match this view.</b><span>{search?"Clear the search or choose another filter.":"All shifts are shown by default. Use Add Down Bus to create the first repair entry."}</span></td></tr>}</tbody>
    </table>
   </div>
  </section>
  <footer className="down-footnote"><span>ACTIVE DOWN COUNT EXCLUDES COMPLETED REPAIRS</span><span>BUS LOCATION IS CONTROLLED ONLY FROM THE FACILITY MAP</span></footer>
  {editing&&<DownSheetEditor entry={editing} fleet={fleet} entries={entries} defaultInitials={defaultInitials} onClose={()=>setEditing(null)} onSave={saveEntry}/>}
  
  {scannerOpen&&<DownSheetScanner fleet={fleet} currentEntries={active} defaultShift={defaultShift} onClose={()=>setScannerOpen(false)} onImport={importScan}/>}
 </main>;
}
