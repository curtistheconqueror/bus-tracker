"use client";

import {Fragment,useEffect,useMemo,useState,type CSSProperties} from "react";
import TrackerNav from "../tracker-nav";
import RefreshButton from "../refresh-button";
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
import {downSheetMentionsDefect,downSheetRoadCounts,downSheetRoadEntries,groupDownSheetEntries,normalizeDownSheetSectionOrder,orderDownSheetGroups,isDownSheetRoadLocation,matchesDownSheetSearch,type DownSheetGroupKey,type DownSheetRoadKind} from "./down-sheet-view";
import {DEFAULT_DOWN_SHEET_DISPLAY,normalizeDownSheetDisplay,type DownSheetDisplaySettings} from "./down-sheet-display-settings";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,readDownSheetPayload,readFleetPayload,writeDownSheetStorage,writeDownSheetStorageResult,writeFleetStorage,writeFleetStorageResult,writeSetting,type FleetWriteReason} from "../storage";
import SaveAlert from "../save-alert";
import {DeferredNavBadge,DeferredReviewPrompt} from "../deferred-watch";
import {exportFleetBoardBackup} from "../fleet-backup";
import ShopCloudLive from "../shop-cloud-live";
import {forgetRemovedEntries,rememberRemovedEntries} from "../cloud-sync";
import MysteryBoard,{MYSTERY_COLLAPSED_KEY} from "../mystery-board";
import DeferredBoard,{DEFERRED_BOARD_COLLAPSED_KEY} from "../deferred-board";
import type {DefectLogDownEntry,DefectLogFleetBus} from "../defect-log/defect-log-sync";
import {answerDeferredBus} from "../deferred-actions";
import {DEFAULT_DEFECT_LOG_DISPLAY,normalizeDefectLogDisplay} from "../defect-log/defect-log-display-settings";
import AppName from "../app-name";
import {OPTIONAL_DOWN_TILES,type OptionalDownTile} from "./down-sheet-settings-store";

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
const SCAN_UNDO_KEY="pace-down-sheet-scan-undo-v1";
/* The last thing done to a single row, kept so it can be taken back. Separate
   from the scan and clear undos on purpose: deleting or closing out one bus is
   daily work and must not consume the copy a whole cleared sheet is waiting on.

   One slot covers both actions. They are the two ways a row leaves the active
   sheet, only one can be the most recent, and a foreman who has just pressed
   the wrong one wants the same words in the same place either way. */
const ENTRY_UNDO_KEY="pace-down-sheet-entry-undo-v1";
const ADVANCED_OPEN_KEY="pace-down-sheet-advanced-open-v1";
/* Per device, like ADVANCED ACTIONS above it. Absent means COLLAPSED, which is
   the opposite of the usual "absent means on" here and is deliberate: fourteen
   tiles was a wall to scroll past before reaching the sheet, and a board nobody
   asked to open should not be the first thing on the page. */
const COUNTS_OPEN_KEY="pace-down-sheet-counts-open-v1";
/* This key holds more than this page writes to it — the Settings page owns some
   of the same blob — so the sheet's own write merges over what is stored rather
   than replacing it. It used to replace, which meant any field the sheet did
   not itself know about was blanked the next time somebody changed a sort order
   on the sheet. Nothing depended on that until now; the tile choices and the
   quick-notes switch are set from the Settings page and read here. */
function readStoredDownSettings():Record<string,unknown>{
 try{return JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}")||{}}catch{return {}}
}
type RowAction={kind:"deleted"|"fixed";id:string;busNumber:string};
function readRowAction(raw:string|null):RowAction|null{
 if(!raw)return null;
 try{const parsed=JSON.parse(raw);const entry=parsed?.entry;
  if(!entry||typeof entry.id!=="string"||typeof entry.busId!=="string")return null;
  /* Anything written before this carried a delete and nothing else, so an
     absent kind reads as one rather than throwing the copy away. */
  return {kind:parsed.kind==="fixed"?"fixed":"deleted",id:entry.id,busNumber:String(entry.busNumber||"")};
 }catch{return null}
}
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
 const [advancedOpen,setAdvancedOpen]=useState(false);
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
    the panel does not have to write anything to say so. */
 useEffect(()=>{setAdvancedOpen(localStorage.getItem(ADVANCED_OPEN_KEY)==="1")},[]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,ADVANCED_OPEN_KEY,advancedOpen?"1":"0")},[advancedOpen,hydrated]);
 const [scannerOpen,setScannerOpen]=useState(false);
 const [defaultInitials,setDefaultInitials]=useState("");
 const [defaultShift,setDefaultShift]=useState<Shift>("1st");
 const [extraTiles,setExtraTiles]=useState<OptionalDownTile[]>([]);
 const [showQuickNotes,setShowQuickNotes]=useState(false);
 const [countsOpen,setCountsOpen]=useState(false);
 const [deferredCollapsed,setDeferredCollapsed]=useState(true);
 const [displaySettings,setDisplaySettings]=useState<DownSheetDisplaySettings>(DEFAULT_DOWN_SHEET_DISPLAY);
 const [quickNotes,setQuickNotes]=useState("");
 const [savedQuickNotes,setSavedQuickNotes]=useState("");
 const [search,setSearch]=useState("");
 const [sectionOrder,setSectionOrder]=useState<DownSheetGroupKey[]>(()=>normalizeDownSheetSectionOrder(null));
 /* Which of the two road tallies is being read, if either. Not persisted: it is
    a question somebody asks of the sheet in the moment, not a preference. */
 const [roadFilter,setRoadFilter]=useState<DownSheetRoadKind|null>(null);
 const [undoClearAvailable,setUndoClearAvailable]=useState(false);
 const [undoScanAvailable,setUndoScanAvailable]=useState(false);
 /* The bus number is held with the id so the notice can name the bus it would
    take back, rather than saying "the last one". */
 const [rowAction,setRowAction]=useState<RowAction|null>(null);
 /* MYSTERY BUSES moved here from the Defect Log — every bus it lists is a bus
    that is NOT on this sheet, which is the question a foreman reading the sheet
    is actually asking.

    Two things came with it rather than being rebuilt. Its collapsed flag keeps
    the Defect Log key it was written under, because renaming a key throws away
    what the device already holds. And its wording is still read from the Defect
    Log's display settings, so a foreman who renamed the panel keeps his name
    for it instead of being reset to the default by a move he did not make. */
 const [mysteryCollapsed,setMysteryCollapsed]=useState(false);
 const [mysteryDisplay,setMysteryDisplay]=useState(DEFAULT_DEFECT_LOG_DISPLAY);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,MYSTERY_COLLAPSED_KEY,mysteryCollapsed?"1":"0")},[mysteryCollapsed,hydrated]);
 useEffect(()=>{setCountsOpen(localStorage.getItem(COUNTS_OPEN_KEY)==="1")},[]);
 /* Absent means COLLAPSED, like the count board: it is a second panel above the
    rows, and a foreman who never opened it should not have to scroll past it. */
 useEffect(()=>{setDeferredCollapsed(localStorage.getItem(DEFERRED_BOARD_COLLAPSED_KEY)!=="0")},[]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,DEFERRED_BOARD_COLLAPSED_KEY,deferredCollapsed?"1":"0")},[deferredCollapsed,hydrated]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,COUNTS_OPEN_KEY,countsOpen?"1":"0")},[countsOpen,hydrated]);

 // Restore the existing device-local fleet and down sheet once after hydration.
 useEffect(()=>{try{const fleetPayload=readFleetPayload<FleetBus>(localStorage.getItem(FLEET_KEY)),nextFleet=fleetPayload.valid?fleetPayload.buses:[];setFleet(nextFleet);const downPayload=readDownSheetPayload<DownEntry>(localStorage.getItem(DOWN_KEY)),nextEntries=downPayload.valid?downPayload.entries:[],restored=nextEntries.map(normalizeEntry),knownActive=new Set(restored.filter(isActive).map((entry:DownEntry)=>entry.busId)),added=entriesFromFleet(nextFleet).filter(entry=>!knownActive.has(entry.busId));setEntries([...restored,...added].slice(0,MAX_ENTRIES));setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(localStorage.getItem(DOWN_SHEET_CLEAR_UNDO_KEY))));setUndoScanAvailable(Boolean(localStorage.getItem(SCAN_UNDO_KEY)));setRowAction(readRowAction(localStorage.getItem(ENTRY_UNDO_KEY)));setMysteryCollapsed(localStorage.getItem(MYSTERY_COLLAPSED_KEY)==="1");try{setMysteryDisplay(normalizeDefectLogDisplay(JSON.parse(localStorage.getItem("pace-defect-log-settings-v1")||"{}").display))}catch{}const settings=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}"),note=typeof settings.quickNotes==="string"?settings.quickNotes:"";setShowCompleted(Boolean(settings.showCompleted));setDefaultInitials(typeof settings.defaultInitials==="string"?settings.defaultInitials:"");setDefaultShift((["1st","2nd","3rd"] as string[]).includes(settings.defaultShift)?settings.defaultShift:"1st");setQuickNotes(note);setSavedQuickNotes(note);setSectionOrder(normalizeDownSheetSectionOrder(settings.sectionOrder));setExtraTiles((Array.isArray(settings.extraTiles)?settings.extraTiles:[]).filter((key:unknown)=>OPTIONAL_DOWN_TILES.some(tile=>tile.key===key)));setShowQuickNotes(settings.showQuickNotes===true);setDisplaySettings(normalizeDownSheetDisplay(settings.display))}catch{setFleet([]);setEntries([])}setHydrated(true)},[]);

 // Active Down Sheet rows are the single source of truth for every tracker checkbox and DS badge.
 useEffect(()=>{if(!hydrated)return;setSaveProblem(writeDownSheetStorageResult(localStorage,entries).reason||"");const activeIds=entries.filter(isActive).map(entry=>entry.busId);setFleet(current=>{const reconciled=reconcileDownSheetMembership(current,activeIds);if(reconciled!==current)writeFleetStorage(localStorage,reconciled);return reconciled})},[entries,hydrated]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,SETTINGS_KEY,JSON.stringify({...readStoredDownSettings(),showCompleted,defaultInitials,defaultShift,quickNotes:savedQuickNotes,sectionOrder,extraTiles,showQuickNotes,display:displaySettings}))},[showCompleted,defaultInitials,defaultShift,savedQuickNotes,sectionOrder,extraTiles,showQuickNotes,displaySettings,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY&&event.newValue){const payload=readFleetPayload<FleetBus>(event.newValue);if(payload.valid){const nextFleet=payload.buses;setFleet(nextFleet);setEntries(current=>{const merged=current.map(entry=>{const bus=nextFleet.find(item=>item.id===entry.busId);if(!bus)return entry;const activeDefect=bus.defects?.find(isUnresolved),incoming=bus.pendingRepair?.trim()||"",currentReason=reasonLabel(entry);if(activeDefect)return {...entry,operationalStatus:bus.s,category:activeDefect.category,repair:activeDefect.issue,customReason:activeDefect.details};return {...entry,operationalStatus:bus.s,...(incoming&&incoming!==currentReason?{category:"Miscellaneous",repair:"Driver-reported defect",customReason:incoming}:{})}}),known=new Set(merged.map(entry=>entry.busId)),added=entriesFromFleet(nextFleet).filter(entry=>!known.has(entry.busId));return [...merged,...added].slice(0,MAX_ENTRIES)})}}if(event.key===DOWN_KEY&&event.newValue){const payload=readDownSheetPayload<DownEntry>(event.newValue);if(payload.valid)setEntries(payload.entries.map(normalizeEntry))}if(event.key===DOWN_SHEET_CLEAR_UNDO_KEY)setUndoClearAvailable(Boolean(readDownSheetClearSnapshot<DownEntry>(event.newValue)));if(event.key===SCAN_UNDO_KEY)setUndoScanAvailable(Boolean(event.newValue));if(event.key===ENTRY_UNDO_KEY)setRowAction(readRowAction(event.newValue));/* Settings are edited on the shared page now. This page writes its whole settings object back whenever a field changes, so it has to take the new values into its own state or its next write would put the stale copy over them. */if(event.key===SETTINGS_KEY){try{const saved=JSON.parse(event.newValue||"{}");setShowCompleted(saved.showCompleted===true);if(typeof saved.defaultInitials==="string")setDefaultInitials(saved.defaultInitials);if(saved.defaultShift==="1st"||saved.defaultShift==="2nd"||saved.defaultShift==="3rd")setDefaultShift(saved.defaultShift);setDisplaySettings(normalizeDownSheetDisplay(saved.display))}catch{}}};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

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
 /* The scoreboard is grouped from the whole sheet and the table from the road
    filter, which is why these are two groupings rather than one.

    Pressing INSPECTIONS ON ROAD is a request to SEE those buses, not a claim
    that the sheet now holds seven. Sharing one grouping made the tally rewrite
    every tile above it — TOTAL ON SHEET read 7 while 57 buses were down — so a
    foreman who pressed it to read the list off the sheet lost the numbers he
    had pressed it from. The row count, the estimate and the note below still
    follow the filter, because those describe the view. */
 /* Bus number, always. The ORDER control offered BUS NUMBER up, down and WORK
    CATEGORIES beside the search box, and Curtis took it out: the sheet is
    already numerical inside each band, and nobody was going to pick anything
    else standing at a bus. What people DO want to change is which band they
    read first, and that is a setting rather than a control on the page.

    The sort helper keeps its parameter — the Defect Log's own views still pass
    other orders through it. */
 const sheetGroups=useMemo(()=>orderDownSheetGroups(groupDownSheetEntries(shown,"number-asc",locations),sectionOrder),[shown,locations,sectionOrder]);
 /* The band tiles used to render straight off sheetGroups, so their order on
    the board was whatever DOWN_SHEET_GROUPS happened to be in. They are placed
    by name now, because the order Curtis set interleaves them with tiles that
    are not bands at all - COMPLETED TODAY sits between SCHEDULED and
    UNSCHEDULED. The bands below the sheet still read sheetGroups directly. */
 const tileFor=(key:string)=>{const group=sheetGroups.find(item=>item.key===key);return group?<div className={"group-count group-"+group.key} key={group.key}><strong>{group.entries.length}</strong><span>{group.label}</span></div>:null};
 const groups=useMemo(()=>roadFilter?orderDownSheetGroups(groupDownSheetEntries(downSheetRoadEntries(shown,locations,roadFilter),"number-asc",locations),sectionOrder):sheetGroups,[sheetGroups,shown,locations,roadFilter,sectionOrder]);
 const visible=useMemo(()=>groups.flatMap(group=>group.entries),[groups]);
 /* Down buses: on the sheet for a fault rather than only for maintenance.

    A bus whose row says nothing but PM'S is due for service, not broken, and a
    foreman asking "how many buses am I down" does not mean it. A bus with a
    fault written on it counts, and so does a bus carrying BOTH — "PM'S /
    MISFIRES" is a bus with a live misfire whatever else is owed on it.

    Same question the DOWNED BUSES ON ROAD tally already asks, asked of the
    whole sheet instead of only the buses out on the road, so the two numbers
    are defined the same way and the smaller can never exceed the larger. */
 const downBusCount=useMemo(()=>shown.filter(downSheetMentionsDefect).length,[shown]);
 const visibleMinutes=visible.reduce((total,entry)=>total+entryEstimateMinutes(entry),0);
 const counters={active:active.length,first:active.filter(entry=>entry.shift==="1st").length,second:active.filter(entry=>entry.shift==="2nd").length,third:active.filter(entry=>entry.shift==="3rd").length,pending:active.filter(entry=>entry.section==="Pending").length,accident:active.filter(entry=>entry.section==="Accident").length,waiting:active.filter(entry=>entry.workflow==="Waiting for Parts").length,completedToday:entries.filter(entry=>entry.workflow==="Completed"&&isToday(entry.completedAt)).length,activeMinutes:active.reduce((total,entry)=>total+entryEstimateMinutes(entry),0)};
 const openNewEntry=()=>{if(active.length>=MAX_ENTRIES){alert("The active down sheet has reached its 98-entry capacity.");return}const bus=fleet.find(item=>!active.some(entry=>entry.busId===item.id));if(!bus){alert("Every available fleet bus already has an active down-sheet entry.");return}const now=new Date().toISOString();setEditing({id:"repair-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),busId:bus.id,busNumber:bus.n,category:"",repair:"",customReason:"",repairItems:[blankRepairItem()],assignmentType:"Mechanic",assignedTo:"",section:"Pending",shift:defaultShift,workflow:"Scheduled",operationalStatus:bus.s,priority:"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,"",""),createdAt:now,updatedAt:now,updatedBy:"",completedAt:"",history:[]})};
 const saveQuickNote=()=>{setSavedQuickNotes(quickNotes);try{const current=JSON.parse(localStorage.getItem(SETTINGS_KEY)||"{}");localStorage.setItem(SETTINGS_KEY,JSON.stringify({...current,showCompleted,defaultInitials,defaultShift,quickNotes,sectionOrder,display:displaySettings}))}catch{localStorage.setItem(SETTINGS_KEY,JSON.stringify({showCompleted,defaultInitials,defaultShift,quickNotes,sectionOrder,display:displaySettings}))}};
 /* The DEFERRED board hands its answer back here rather than writing, so a
    refused write is reported by this page like every other one and the board
    never saves behind it — the same contract the mystery board's onMoved has.

    The rules themselves live in deferred-actions.ts, shared with the evening
    review prompt: the same decision about the same bus, and two copies of it
    would drift into a bus that is half returned on one screen and still held on
    the other.

    The FLEET goes first and alone. A fleet that saved and a sheet that did not
    is a real outcome — the bus is off DEFERRED either way — and telling
    somebody nothing was saved when the bus already moved is its own kind of
    wrong. Nothing is written at all if the board's answer would not save. */
 const answerDeferred=(busId:string,defects:StructuredDefect[],action:"downsheet"|"return")=>{
  const now=new Date().toISOString(),bus=fleet.find(item=>item.id===busId),label=bus?.n||busId;
  const applied=answerDeferredBus(fleet as DefectLogFleetBus[],entries as DownEntry[] as DefectLogDownEntry[],busId,defects,action,{now});
  if(!applied.saved){alert("Nothing on Bus "+label+" would save — the repairs holding it are no longer where the board expected them. Open the bus on the Defect Log.");return}
  const wroteFleet=writeFleetStorageResult(localStorage,applied.fleet as FleetBus[]);
  setSaveProblem(wroteFleet.reason||"");
  if(!wroteFleet.ok){alert("This device could not save the change, so Bus "+label+" is still deferred. Export a backup and clear space, then try again.");return}
  const wroteDown=writeDownSheetStorageResult(localStorage,applied.downEntries as DownEntry[]);
  setFleet(applied.fleet as FleetBus[]);setEntries(applied.downEntries as DownEntry[]);
  if(!wroteDown.ok){setSaveProblem(wroteDown.reason||"failed");alert("Bus "+label+" came off DEFERRED, but the Down Sheet could not be saved on this device. Check the sheet before relying on it.");return}
  if(applied.saved<applied.attempted)alert("Bus "+label+" was updated, but "+(applied.attempted-applied.saved)+" of its repairs would not save. Check the bus on the Defect Log.");
 };
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

 /* One row off the sheet, pressed from the row itself.

    Getting a bus off the sheet used to mean opening the editor and marking it
    Completed, and that is a claim about the work: wrong for a bus written down
    twice, wrong for one written down by mistake, and it puts a repair in the
    fixed count that nobody fixed. This says only that the row does not belong
    on the sheet.

    The bus keeps its defects, its status and its location, the same as REMOVE
    in the Defect Log — coming off the sheet is not being repaired, and the bus
    still has the fault. The DS badge needs nothing here either: membership is
    reconciled from the entries that remain, so a bus carrying a second open row
    keeps its badge and a bus down to none loses it. */
 const deleteEntry=(entry:DownEntry)=>{
  const reason=reasonLabel(entry);
  if(!confirm("Delete bus "+(entry.busNumber||"this bus")+" from the Down Sheet?"+(reason?"\n\n"+reason:"")+"\n\nThe bus keeps its defects, status and location. The other devices are told, and PUT BACK undoes this."))return;
  const now=new Date().toISOString(),remaining=entries.filter(item=>item.id!==entry.id);
  /* The copy goes down before the row does, and the delete is abandoned if it
     cannot be written. A removal with no way back is the one-way door this app
     does not build. */
  if(!writeSetting(localStorage,ENTRY_UNDO_KEY,JSON.stringify({kind:"deleted",deletedAt:now,entry})).ok){
   setSaveProblem("storage-full");
   alert("This device has no room to save an undo copy, so nothing was deleted. Export a backup and clear space, then try again.");
   return;
  }
  /* The sheet goes down before the tombstone does, and the tombstone only
     follows a write that actually succeeded. The other order looks identical
     until the write is refused, and then it tells the shop cloud to drop a row
     this device is still holding — a deletion that happened everywhere except
     where it was pressed. */
  const written=writeDownSheetStorageResult(localStorage,remaining);
  if(!written.ok){
   localStorage.removeItem(ENTRY_UNDO_KEY);
   setSaveProblem(written.reason||"failed");
   alert("This device could not save the change, so nothing was deleted. Export a backup and clear space, then try again.");
   return;
  }
  /* Written down so the removal actually travels. A push only sends what the
     sheet still carries, so a row merely dropped here stays live on the server
     and the next pull hands it straight back — the same fault that had a
     cleared sheet refilling itself. */
  rememberRemovedEntries(localStorage,[entry.id],now);
  setSaveProblem("");
  setEntries(remaining);
  setRowAction({kind:"deleted",id:entry.id,busNumber:entry.busNumber});
 };
 /* MARK FIXED, one press from the row.

    Closing a bus out meant opening the editor, changing the workflow and
    saving. For the common case — the mechanic is done and the foreman is
    walking the sheet — that is three steps for a fact already known. This is
    the Defect Log's MARK FIXED, on the surface the Down Sheet is read from.

    It goes through saveEntry rather than writing the entry itself, so it takes
    the same path the editor takes: the repairs are marked done, the bus's
    defects are completed, its status is recomputed from that, and the findings
    it taught are learned. One press must not mean a different kind of save. */
 const markEntryFixed=(entry:DownEntry)=>{
  /* It used to close out on one press, on the reasoning that a foreman working
     down a sheet presses it many times in a row and a dialog each time is the
     thing that makes people stop using a button. That held while it sat in the
     bus's own cell under a thumb — and it is exactly why Curtis closed out a
     bus he did not mean to. Marking a bus fixed is a claim about the work: it
     completes the defect, recomputes the status and teaches the findings. It
     asks now, the same as the delete beside it always did. */
  const reason=reasonLabel(entry);
  if(!confirm("Mark bus "+(entry.busNumber||"this bus")+" fixed and close it out?"+(reason?"\n\n"+reason:"")+"\n\nThe repair is marked done and the bus's defect is completed. UNDO puts it back."))return;
  const now=new Date().toISOString(),who=(entry.completedBy||(entry.assignmentType==="Mechanic"?entry.assignedTo:"")||defaultInitials||"").trim().toUpperCase();
  /* The copy goes down first, exactly as the delete does: the way back exists
     before the change does, so a refused write leaves the sheet untouched. */
  /* The bus goes into the copy as well as the entry, and this is the whole
     reason the fix undo is not just "save the old entry again".

     Completing an entry completes the bus's defect. Saving the old entry back
     does NOT re-open it: a completed defect is resolved, and a resolved record
     is not adoptable, so the entry cannot find it again — it mints a SECOND
     record for the same fault and leaves the first one closed. Measured: one
     press and one undo left bus 1101 carrying d-1 completed and a fresh open
     duplicate beside it, which is the thing this app must never do.

     So the fields the completion actually changes are kept and put back as
     they were. Location and whoever has the bus are deliberately not, because
     they may have moved on and are not this undo's business. */
  const bus=fleet.find(item=>item.id===entry.busId);
  if(!writeSetting(localStorage,ENTRY_UNDO_KEY,JSON.stringify({kind:"fixed",fixedAt:now,entry,bus:bus&&{id:bus.id,s:bus.s,defects:bus.defects||[],pendingRepair:bus.pendingRepair||""}})).ok){
   setSaveProblem("storage-full");
   alert("This device has no room to save an undo copy, so nothing was changed. Export a backup and clear space, then try again.");
   return;
  }
  saveEntry(normalizeEntry({...entry,workflow:"Completed",completedAt:now,completedBy:who,updatedAt:now,updatedBy:who||entry.updatedBy,
   history:[...(entry.history||[]),{at:now,initials:who||"—",action:"Marked fixed from the Down Sheet"}]}));
  setRowAction({kind:"fixed",id:entry.id,busNumber:entry.busNumber});
 };
 /* Putting a closed-out row back is not the same operation as putting a deleted
    one back. Nothing was removed, so there is no tombstone to forget and no
    capacity to check — the row never left the sheet, it only stopped being
    active. Both halves are restored rather than re-derived: the entry as it
    was, and the bus fields the completion changed. */
 const undoFixEntry=(saved:DownEntry,bus?:{id:string;s:FleetStatus;defects:StructuredDefect[];pendingRepair:string})=>{
  const nextEntries=entries.some(item=>item.id===saved.id)?entries.map(item=>item.id===saved.id?saved:item):[...entries,saved];
  const written=writeDownSheetStorageResult(localStorage,nextEntries);
  if(!written.ok){
   setSaveProblem(written.reason||"failed");
   alert("This device could not save the change, so the entry was left closed out. Export a backup and clear space, then try again.");
   return;
  }
  const nextFleet=bus?fleet.map(item=>item.id===bus.id?{...item,s:bus.s,defects:bus.defects,pendingRepair:bus.pendingRepair}:item):fleet;
  if(bus)setSaveProblem(writeFleetStorageResult(localStorage,nextFleet).reason||"");else setSaveProblem("");
  localStorage.removeItem(ENTRY_UNDO_KEY);
  setFleet(nextFleet);setEntries(nextEntries);setRowAction(null);
 };
 const undoDeleteEntry=()=>{
  let saved:{kind?:string;entry?:Partial<DownEntry>;bus?:{id:string;s:FleetStatus;defects:StructuredDefect[];pendingRepair:string}}|null=null;
  try{saved=JSON.parse(localStorage.getItem(ENTRY_UNDO_KEY)||"null")}catch{}
  if(!saved?.entry?.id){localStorage.removeItem(ENTRY_UNDO_KEY);setRowAction(null);alert("There is nothing on this row to take back.");return}
  const entry=normalizeEntry(saved.entry as DownEntry);
  if(saved.kind==="fixed")return undoFixEntry(entry,saved.bus);
  if(entries.some(item=>item.id===entry.id)){localStorage.removeItem(ENTRY_UNDO_KEY);setRowAction(null);return}
  /* One active row per bus is the sheet's rule and the editor refuses a save
     that breaks it. Putting a row back must not walk around the rule. */
  if(isActive(entry)&&entries.some(item=>isActive(item)&&item.busId===entry.busId)){alert("Bus "+(entry.busNumber||"that bus")+" already has an active entry on the sheet, so the deleted one was not put back.");return}
  if(isActive(entry)&&entries.filter(isActive).length>=MAX_ENTRIES){alert("The active down sheet is full at "+MAX_ENTRIES+" buses, so the deleted entry was not put back.");return}
  const restoredAt=new Date().toISOString();
  /* Off the ledger and restamped, and both halves are needed. The ledger is
     what refuses the entry on the way back in; the stamp is what beats the
     tombstone the delete pushed, which an entry carrying its old updatedAt
     would lose — deleting itself again on the next pull, silently. Putting a
     row back IS touching it, so the stamp is honest. */
  const restored=[...entries,{...entry,updatedAt:restoredAt}];
  const written=writeDownSheetStorageResult(localStorage,restored);
  if(!written.ok){
   setSaveProblem(written.reason||"failed");
   alert("This device could not save the change, so the entry was not put back. Export a backup and clear space, then try again.");
   return;
  }
  forgetRemovedEntries(localStorage,[entry.id]);
  setSaveProblem("");
  localStorage.removeItem(ENTRY_UNDO_KEY);
  setEntries(restored);setRowAction(null);
 };

 const appStyle={"--down-page-title-color":displaySettings.styles.pageTitle.color,"--down-page-title-size":displaySettings.styles.pageTitle.fontSize+"px","--down-summary-color":displaySettings.styles.summary.color,"--down-summary-size":displaySettings.styles.summary.fontSize+"px","--down-quick-notes-color":displaySettings.styles.quickNotes.color,"--down-quick-notes-size":displaySettings.styles.quickNotes.fontSize+"px","--down-sheet-title-color":displaySettings.styles.sheetTitle.color,"--down-sheet-title-size":displaySettings.styles.sheetTitle.fontSize+"px","--down-column-header-color":displaySettings.styles.columnHeaders.color,"--down-column-header-size":displaySettings.styles.columnHeaders.fontSize+"px","--down-reason-category-color":displaySettings.styles.reasonCategory.color,"--down-reason-category-size":displaySettings.styles.reasonCategory.fontSize+"px","--down-reason-details-color":displaySettings.styles.reasonDetails.color,"--down-reason-details-size":displaySettings.styles.reasonDetails.fontSize+"px"} as CSSProperties;

 return <main className="down-app" style={appStyle}><SaveAlert reason={saveProblem} onExport={()=>exportFleetBoardBackup(localStorage,fleet)}/><ShopCloudLive/><DeferredNavBadge/><DeferredReviewPrompt/>
  <header className="down-header">
   <div><AppName/><span>FLEET MAINTENANCE</span><h1>{displaySettings.labels.pageTitle}</h1><p>{displaySettings.labels.subtitle}</p></div>
   <TrackerNav active="/down-sheet"/>
   {/* One column so ADVANCED ACTIONS sits directly under REFRESH at every
       width, the same shape the Defect Log's header uses. */}
   <div className="down-header-actions">
    <RefreshButton/>
    <button className="down-advanced-toggle" type="button" aria-expanded={advancedOpen} aria-controls={advancedOpen?"down-advanced-drawer":undefined} onClick={()=>setAdvancedOpen(value=>!value)}>
     <span><b>ADVANCED ACTIONS</b><small>Shifts, completed, scan sheet and clearing</small></span><i aria-hidden="true">{advancedOpen?"CLOSE":"OPEN"}</i>
    </button>
   </div>
  </header>

  {/* ADVANCED ACTIONS, the Down Sheet's own.

      Same idea as the Defect Log's and deliberately not the same colour: both
      headers are navy, so a translucent-white button on this one would have
      been indistinguishable from that one at a glance. This wears the purple
      the Down Sheet already uses for SCAN SHEET, which is the tell for which
      page you are on.

      What went in: the shift filter and SHOW COMPLETED, which change what the
      sheet shows, and SCAN SHEET with the recovery buttons, which act on the
      sheet itself. What stayed out: the two things used on every visit, ADD
      DOWN BUS and SEARCH, which now sit together instead of with a block of
      controls wedged between them. */}
  {advancedOpen&&<section className="down-advanced open" id="down-advanced-drawer">
   <div className="down-advanced-body">
    <div className="down-advanced-group">
     <b className="down-advanced-label">VIEW</b>
     <div className="shift-filter" aria-label="Filter down sheet by shift">
      {/* "1ST" on its own said nothing — Curtis read the row and could not tell
          what it was filtering. The word is on each button rather than only in
          the SHOW label, because the button is what gets looked at. */}
      <span>SHOW:</span>{(["All","1st","2nd","3rd"] as ShiftFilter[]).map(value=><button type="button" className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>setFilter(current=>current===value&&value!=="All"?"All":value)} key={value}>{value==="All"?"ALL SHIFTS":value.toUpperCase()+" SHIFT"}{value!=="All"&&<i>{value==="1st"?counters.first:value==="2nd"?counters.second:counters.third}</i>}</button>)}
     </div>
     <label className="completed-toggle"><input type="checkbox" checked={showCompleted} onChange={event=>setShowCompleted(event.target.checked)}/><span/>SHOW COMPLETED</label>
    </div>
    <div className="down-advanced-group">
     <b className="down-advanced-label">TOOLS</b>
     {/* Clearing the sheet and undoing an import are recovery, not daily work.
         They were the loudest things on the page — a red CLEAR DOWNSHEET beside
         two amber buttons — sitting above the button that adds a bus. The undos
         still appear only when there is something to undo. */}
     <button className="scan-sheet-button" type="button" onClick={()=>setScannerOpen(true)}>▣ SCAN SHEET</button>
     {undoScanAvailable&&<button className="undo-scan" type="button" onClick={undoScan}>UNDO IMPORT</button>}
     {undoClearAvailable&&<button className="undo-clear" type="button" onClick={undoClear}>UNDO CLEAR</button>}
     <button className="clear-downsheet" type="button" onClick={clearEntireDownSheet} disabled={!entries.length&&!fleet.some(bus=>bus.down)}>CLEAR DOWNSHEET</button>
    </div>
   </div>
  </section>}

  <section className="down-controls">
   {/* The one thing this page is for, first and full width — and now directly
       above SEARCH rather than separated from it by six other controls. */}
   <button className="down-primary-action" type="button" onClick={openNewEntry} disabled={active.length>=MAX_ENTRIES} title={active.length>=MAX_ENTRIES?"The sheet is full at "+MAX_ENTRIES+" buses":"Add a bus to the Down Sheet"}>+ ADD DOWN BUS</button>
  </section>

  <section className="down-view-controls" aria-label="Search and order Down Sheet">
   <label className="down-search"><b>SEARCH</b><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus #, repair, mechanic or vendor" aria-label="Search Down Sheet"/></label>
   {search&&<button className="clear-search" type="button" onClick={()=>setSearch("")}>CLEAR</button>}
   <span className="view-results"><b>{visible.length}</b> IN VIEW</span>
  </section>

  {/* The totals the sheet is read for, collapsed to one number until asked.

      It had grown to fourteen tiles — a wall to scroll past before reaching the
      rows, on the page where the rows are the point. Curtis: "this is a bit
      overwhelming and there is no hide button."

      So DOWN BUSES stands alone by default, because that is the number the shop
      opens this page for, and the rest are one press away. The eight it expands
      to are hard-coded in the order he set; the six beyond them are ticked on
      per device in the Down Sheet settings, still counted either way. */}
  <section className="down-counts-board" aria-label="Down sheet section counts">
   <div className="down-counts-head">
    <button type="button" className="down-counts-toggle" aria-expanded={countsOpen} aria-controls="down-counts-tiles" onClick={()=>setCountsOpen(value=>!value)}>
     <span className="down-counts-lead"><strong>{downBusCount}</strong><span>DOWN BUSES</span></span>
     <span className="down-counts-more">{countsOpen?"HIDE COUNTS":"SHOW COUNTS"}<i aria-hidden="true">{countsOpen?"\u25B2":"\u25BC"}</i></span>
    </button>
   </div>
   {countsOpen&&<div className="down-group-counts" id="down-counts-tiles">
    <div className="group-count total"><strong>{shown.length}</strong><span>TOTAL ON SHEET</span></div>
    <div className="group-count down-buses"><strong>{downBusCount}</strong><span>DOWN BUSES</span></div>
    {tileFor("scheduled")}
    {/* Still a button, because it filters. Same press-to-narrow behaviour the
        two road tallies have, so it belongs with them rather than looking like
        a number you cannot touch. */}
    <button type="button" className={"group-count group-completed completed-today-tile"+(fixedToday?" active":"")} aria-pressed={fixedToday} disabled={!counters.completedToday&&!fixedToday} onClick={()=>setFixedToday(value=>!value)}><strong>{counters.completedToday}</strong><span>{displaySettings.labels.completed}</span></button>
    {tileFor("unscheduled")}
    {tileFor("inspection")}
    {/* The inverse of the map's down-sheet badges. Those answer "is this bus on
        the sheet?" while looking at the yard; these answer "is this one out
        working?" while looking at the sheet — which the sheet itself could not
        say, because where a bus is belongs to the map. A bus carrying both an
        inspection and a fault is in both counts on purpose.

        Pressed, they narrow the sheet below to exactly what they count, so the
        number can be read as a list. */}
    {([["down","DOWNED BUSES ON ROAD",roadCounts.down],["inspection","INSPECTIONS ON ROAD",roadCounts.inspection]] as [DownSheetRoadKind,string,number][]).map(([kind,label,count])=>
     <button type="button" className={"group-count group-road group-road-"+kind+(roadFilter===kind?" active":"")} key={kind} aria-pressed={roadFilter===kind}
      onClick={()=>setRoadFilter(current=>current===kind?null:kind)}
      title={roadFilter===kind?"Showing only these buses — press again to show the whole sheet":"Show only the "+count+" bus"+(count===1?"":"es")+" this counts"}>
      <strong>{count}</strong><span>{label}</span></button>)}
    {/* Everything below here is opt-in. SHEET STATS used to be a second
        scoreboard saying most of this again in a different shape; these are the
        numbers that survived it and are still worth having on the days somebody
        wants them. */}
    {extraTiles.includes("off-property")&&tileFor("off-property")}
    {extraTiles.includes("pending")&&<div className="group-count group-pending"><strong>{counters.pending}</strong><span>{displaySettings.labels.pending}</span></div>}
    {extraTiles.includes("accident")&&<div className="group-count group-accident"><strong>{counters.accident}</strong><span>{displaySettings.labels.accident}</span></div>}
    {extraTiles.includes("waiting")&&<div className="group-count group-waiting"><strong>{counters.waiting}</strong><span>{displaySettings.labels.waiting}</span></div>}
    {extraTiles.includes("labor")&&<div className="group-count group-labor"><strong>{formatRepairTime(counters.activeMinutes)}</strong><span>{displaySettings.labels.activeLabor||"EST. ACTIVE LABOR"}</span></div>}
    {extraTiles.includes("capacity")&&<div className="group-count group-capacity"><strong>{active.length}<small> / {MAX_ENTRIES}</small></strong><span>{displaySettings.labels.capacity}</span></div>}
    {/* Only once it has something of its own to say. Unfiltered it is the same
        number as EST. ACTIVE LABOR to the minute, and printing 244h 30m twice
        side by side is exactly the duplication this was meant to clear. */}
    {extraTiles.includes("labor")&&visibleMinutes!==counters.activeMinutes&&<div className="group-count group-view-labor"><strong>{formatRepairTime(visibleMinutes)}</strong><span>{displaySettings.labels.currentView||"EST. CURRENT VIEW"}</span></div>}
   </div>}
  </section>

  {/* Loud, and on the page rather than behind MORE. An accidental delete is
      exactly when nobody goes hunting through a menu for the way back. */}
  {rowAction&&<p className={"down-deleted-note"+(rowAction.kind==="fixed"?" fixed":"")} role="status">Bus <b>{rowAction.busNumber||"—"}</b> {rowAction.kind==="fixed"?"was marked fixed and closed out.":"was deleted from the sheet. Its defects, status and location were kept."} <button type="button" onClick={undoDeleteEntry}>{rowAction.kind==="fixed"?"UNDO":"PUT BACK"}</button></p>}
  {/* Under the counts and above the sheet: it answers "what is in the building
      that this sheet does not know about", which is read right after the
      totals and before the rows themselves. */}
  <MysteryBoard fleet={fleet} activeDownBusIds={active.map(entry=>entry.busId)}
   title={mysteryDisplay.labels.mysteryTitle} subtitle={mysteryDisplay.labels.mysterySubtitle}
   collapsed={mysteryCollapsed} onCollapsedChange={setMysteryCollapsed}
   describe={bus=>{const open=(bus.defects||[]).filter(isUnresolved);return open.length?open.slice(0,2).map(defect=>[defect.category,defect.issue].filter(Boolean).join(" — ")).join("; ")+(open.length>2?" +"+(open.length-2)+" more":""):"No known defects logged"}}
   /* The move is written through this page's own fleet write rather than
      inside the board, so a refused write is reported here like every other
      one and the board never saves behind the page's back. */
   onMoved={nextFleet=>{const result=writeFleetStorageResult(localStorage,nextFleet);setSaveProblem(result.reason||"");if(!result.ok)return false;setFleet(nextFleet);return true}}/>
  {/* Directly under MYSTERY BUSES, because between them they answer one
      question: a bus on property that the sheet does not explain is very often
      a bus somebody deferred. Separate lists on purpose — a mystery is
      unexplained and a deferral is a decision, and folding them together would
      dilute the one thing MYSTERY BUSES is for. */}
  <DeferredBoard fleet={fleet as DefectLogFleetBus[]} downEntries={entries as DefectLogDownEntry[]}
   collapsed={deferredCollapsed} onCollapsedChange={setDeferredCollapsed} onAnswer={answerDeferred}/>
  {roadFilter&&<p className="down-road-filter-note" role="status">Showing only <b>{roadFilter==="inspection"?"INSPECTIONS ON ROAD":"DOWNED BUSES ON ROAD"}</b> — {visible.length} of {shown.length} on the sheet. <button type="button" onClick={()=>setRoadFilter(null)}>SHOW THE WHOLE SHEET</button></p>}

  {/* Off by default now. It sat permanently between the counts and the sheet
      on a page whose whole problem was how much you scroll past to reach the
      rows. The note itself is untouched on every device that has one — the
      switch hides the panel, it does not clear what was written. */}
  {showQuickNotes&&<section className="quick-notes">
   <label htmlFor="down-quick-notes"><b>{displaySettings.labels.quickNotes}</b><span>{quickNotes===savedQuickNotes?"Saved on this device":"Unsaved changes"}</span></label>
   <div className="quick-notes-editor"><textarea id="down-quick-notes" value={quickNotes} onChange={event=>setQuickNotes(event.target.value)} placeholder="Example: 3 road calls today; follow up with vendor; check late-shift parts delivery."/><button type="button" onClick={saveQuickNote} disabled={quickNotes===savedQuickNotes}>SAVE NOTE</button></div>
  </section>}
  <section className="sheet-wrap">
   <div className="sheet-title"><div><b>{displaySettings.labels.sheetKicker||"MAINTENANCE FACILITY"}</b><span>{displaySettings.labels.sheetTitle}</span></div><p>{filter==="All"?"ALL SHIFTS":filter+" SHIFT"} · {visible.length} ROW{visible.length===1?"":"S"} · {formatRepairTime(visibleMinutes)} ESTIMATED</p></div>
   <div className="sheet-scroll">
    <table className="down-table">
     <thead><tr><th>{displaySettings.labels.line}</th><th>{displaySettings.labels.busNumber}</th><th>{displaySettings.labels.reasonDown}</th><th>{displaySettings.labels.assignment}</th><th>{displaySettings.labels.section}</th><th>{displaySettings.labels.shift}</th><th>{displaySettings.labels.workStatus}</th><th>{displaySettings.labels.estimatedTime}</th><th>{displaySettings.labels.updatedBy}</th><th className="row-actions-head">ACTIONS</th></tr></thead>
     {/* The sheet divides itself, always — not only when an ordering is chosen.
         Each band carries its own count on the divider so the number never has
         to be arrived at by scrolling and adding. Line numbers keep running
         across the bands, the way they do on the paper sheet. */}
     <tbody>{visible.length?groups.map((group,groupIndex)=>{
      if(!group.entries.length)return null;
      const offset=groups.slice(0,groupIndex).reduce((sum,item)=>sum+item.entries.length,0);
      return <Fragment key={group.key}>
       <tr className={"down-group-row group-"+group.key}><td colSpan={10}><b>{group.label}</b><i>{group.entries.length}</i><span>{group.hint}</span></td></tr>
       {/* The WORK CATEGORIES subheading rows went with the ORDER control that was
           the only thing that ever turned them on. */}
       {group.entries.map((entry,index)=>{return <Fragment key={entry.id}><tr className={entry.workflow==="Completed"?"completed":""}>
      <td className="line-number">{String(offset+index+1).padStart(2,"0")}</td>
      {/* ON ROAD, beside the number, on every row that is out working. The two
          tallies above give the counts; this is the same fact per bus, so it
          reads while scrolling without pressing anything. It sits outside the
          edit button on purpose — it is a fact about where the bus is, which
          this page reads from the map and does not own, so pressing it must not
          look like a way to change it. */}
      <td className="fleet-number"><span className="fleet-number-slots"><button className="fleet-number-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit down-sheet entry for bus "+entry.busNumber}><b>{entry.busNumber||"—"}</b><small>{STATUS_LABELS[entry.operationalStatus]}</small></button>{/* UNDER the number rather than beside it. Beside it, the badge and
          the two row buttons held this column at 288px and pushed REASON DOWN
          — the thing the sheet is read for — off the side of a phone. Stacked,
          the column is the width of a bus number and the reason arrives on
          screen. */}
      {isDownSheetRoadLocation(locations[entry.busId]||"")&&<i className="on-road-badge" title="This bus is out on the road right now, according to the Facility Map">ON ROAD</i>}</span></td>
      <td><button className="reason-button" type="button" onClick={()=>setEditing(entry)} aria-label={"Edit repair details for bus "+entry.busNumber}><b>{entry.repairItems&&entry.repairItems.length>1?repairProgressLabel(entry):entry.category}</b><span>{reasonLabel(entry)}</span></button></td>
      <td><span className={"assignment "+entry.assignmentType.toLowerCase()}><small>{entry.assignmentType}</small>{entry.assignedTo||"Unassigned"}</span></td>
      <td><b className={"section-tag "+entry.section.toLowerCase().replaceAll(" ","-")}>{entry.section}</b></td>
      <td><b className="shift-tag">{entry.shift}</b></td>
      <td><b className={"workflow "+entry.workflow.toLowerCase().replaceAll(" ","-")}>{entry.workflow}</b></td>
      <td className="estimate-cell"><b>{isQuarantineEntry(entry)?"N/A":entryEstimateMinutes(entry)?formatRepairTime(entryEstimateMinutes(entry)):"NOT SET"}</b><small>{isQuarantineEntry(entry)?"QUARANTINE":"MECHANIC PLAN"}</small></td>
      <td className="updated"><b>{entry.updatedBy||"—"}</b><small>{timeLabel(entry.updatedAt)}</small></td>
           {/* AT THE END OF THE ROW, which is a deliberate reversal. They sat in the
          bus's cell so a phone would not have to scroll sideways to reach
          them — and that put a one-press close-out under the thumb that scrolls
          the sheet. Curtis closed out a bus he did not mean to. Out here they
          take a deliberate scroll AND a confirm, and the first column shrinks
          by 164px, which is what makes the reason readable. */}
      <td className="row-actions"><span className="row-actions-slots">{entry.workflow!=="Completed"&&<button className="fix-entry" type="button" onClick={()=>markEntryFixed(entry)} aria-label={"Mark bus "+(entry.busNumber||"entry")+" fixed"} title={"Mark bus "+(entry.busNumber||"this entry")+" fixed and close it out"}><span aria-hidden="true">&#10003;</span></button>}<button className="delete-entry" type="button" onClick={()=>deleteEntry(entry)} aria-label={"Delete bus "+(entry.busNumber||"entry")+" from the Down Sheet"} title={"Delete bus "+(entry.busNumber||"this entry")+" from the Down Sheet"}><span aria-hidden="true">×</span></button></span></td>
     </tr></Fragment>})}
      </Fragment>;
     }):<tr><td className="empty-sheet" colSpan={10}><b>No buses match this view.</b><span>{search?"Clear the search or choose another filter.":"All shifts are shown by default. Use Add Down Bus to create the first repair entry."}</span></td></tr>}</tbody>
    </table>
   </div>
  </section>
  <footer className="down-footnote"><span>ACTIVE DOWN COUNT EXCLUDES COMPLETED REPAIRS</span><span>BUS LOCATION IS CONTROLLED ONLY FROM THE FACILITY MAP</span></footer>
  {editing&&<DownSheetEditor entry={editing} fleet={fleet} entries={entries} defaultInitials={defaultInitials} onClose={()=>setEditing(null)} onSave={saveEntry}/>}
  
  {scannerOpen&&<DownSheetScanner fleet={fleet} currentEntries={active} defaultShift={defaultShift} onClose={()=>setScannerOpen(false)} onImport={importScan}/>}
 </main>;
}
