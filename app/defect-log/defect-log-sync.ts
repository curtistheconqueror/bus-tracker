import {defectSupportingDetails,defectSummary,isUnresolved,normalizeDefects,type DefectState,type StructuredDefect} from "../repair-catalog.ts";
import {normalizeRepairTimeEstimate} from "../down-sheet/repair-time-estimates.ts";
import {downSheetDefectIds} from "../down-sheet/down-sheet-sync.ts";
import {roadServiceStatus,statusForLocation,type FleetStatus} from "../smart-status.ts";
import {stampOperationalChange} from "../operational-time.ts";

export type DefectLogFleetBus={
 id:string;n:string;s:FleetStatus;l:string;mechanic?:string;shift?:string;roadcall?:boolean;down?:boolean;
 parkedAt?:string;lastLocationChangeAt?:string;lastStatusChangeAt?:string;pendingRepair?:string;defects?:StructuredDefect[];bay12Watch?:boolean;
};

export type DefectLogDownEntry={
 id:string;defectId?:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 /* Carried through because a modern entry writes one record per card, so the
    cards are what say which defects the sheet has. Optional: an entry stored
    before cards existed has none. */
 repairItems?:{id:string;category:string;repair:string;details:string;done?:boolean}[];
 assignmentType:"Mechanic"|"Vendor";assignedTo:string;section:"Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";
 shift:"1st"|"2nd"|"3rd";workflow:"Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
 operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";timeEstimate:ReturnType<typeof normalizeRepairTimeEstimate>;
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:{at:string;initials:string;action:string}[];
};

export type DefectLogRecord={bus:DefectLogFleetBus;defect:StructuredDefect;createdAt:string;updatedAt:string;onDownSheet:boolean;
 /* The entry that has this exact defect on the sheet, when one does. Carried on
    the record so a card can say WHICH defect put the bus on the sheet, and what
    the sheet says about it, without re-deriving the link at render time. */
 downSheetEntry?:DefectLogDownEntry};
export type DefectLogBusGroup={bus:DefectLogFleetBus;records:DefectLogRecord[];updatedAt:string};

export function isPendingDownSheetRecord(record:DefectLogRecord,activeDownBusIds:ReadonlySet<string>){
 if(!isUnresolved(record.defect)||record.onDownSheet||activeDownBusIds.has(record.bus.id))return false;
 const quarantineText=[
  record.defect.category,record.defect.issue,record.defect.details,
  record.defect.diagnosticNote,record.defect.actionTaken,
 ].filter(Boolean).join(" ");
 return record.bus.s==="out"||/\bquarantin(?:e|ed)\b/i.test(quarantineText);
}

export function isDefectLogCleanupCandidate(record:DefectLogRecord,activeDownBusIds:ReadonlySet<string>){
 if(record.defect.defectLogHiddenAt)return false;
 if(record.defect.source==="defect-log"&&isUnresolved(record.defect))return false;
 if(!isUnresolved(record.defect))return true;
 return record.bus.s==="out"||activeDownBusIds.has(record.bus.id);
}

export function hideDefectLogRecords(fleet:DefectLogFleetBus[],defectIds:Iterable<string>,now=new Date().toISOString()){
 const hiddenIds=new Set(defectIds);
 if(!hiddenIds.size)return fleet;
 return fleet.map(bus=>{
  const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  if(!defects.some(defect=>hiddenIds.has(defect.id)))return bus;
  return {...bus,defects:defects.map(defect=>hiddenIds.has(defect.id)?{...defect,defectLogHiddenAt:now}:defect)};
 });
}

function shiftFromFleet(value?:string):"1st"|"2nd"|"3rd"{return value==="Evening"?"2nd":value==="Night"?"3rd":"1st"}
function workflowForState(state:DefectState):DefectLogDownEntry["workflow"]{return state==="completed"?"Completed":state==="deferred"?"Deferred":state==="in-progress"?"In Progress":"Scheduled"}

function repairStatus(bus:DefectLogFleetBus,defects:StructuredDefect[],state:DefectState){
 if(bus.s==="decommissioned")return bus.s;
 const repairAware={...bus,defects,pendingRepair:defectSummary(defects)};
 if(state==="in-progress")return "shop";
 if(defects.some(defect=>isUnresolved(defect)&&defect.operability==="down"))return "out";
 const located=statusForLocation(bus.l,bus.s,repairAware);
 if(located!==bus.s||bus.l.startsWith("east-")||bus.l.startsWith("west-")||bus.l.startsWith("road-")||bus.l.startsWith("garage-")||bus.l.startsWith("bay-")||bus.l.startsWith("body-"))return located;
 return bus.s==="service"||bus.s==="defect"?roadServiceStatus(repairAware):bus.s;
}

export function activeDefectLogCount(fleet:DefectLogFleetBus[]){
 return fleet.reduce((count,bus)=>count+normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.source==="defect-log"&&isUnresolved(defect)&&!defect.defectLogHiddenAt).length,0);
}
const RECENT_DUPLICATE_WINDOW_MS=48*60*60*1000;
function sameDefectChoice(left:StructuredDefect,right:StructuredDefect){return left.category.trim().toLowerCase()===right.category.trim().toLowerCase()&&left.issue.trim().toLowerCase()===right.issue.trim().toLowerCase()}
export function recentDefectDuplicate(bus:DefectLogFleetBus,incoming:StructuredDefect,now=new Date().toISOString()){const currentTime=Date.parse(now);if(!Number.isFinite(currentTime)||!incoming.category.trim()||!incoming.issue.trim())return null;return normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).find(defect=>{if(defect.id===incoming.id||!isUnresolved(defect)||!sameDefectChoice(defect,incoming))return false;const loggedTime=Date.parse(defect.createdAt||defect.updatedAt||"");const age=currentTime-loggedTime;return Number.isFinite(loggedTime)&&age>=0&&age<RECENT_DUPLICATE_WINDOW_MS})||null}
/* Every defect an active sheet entry is writing to, and the entry doing it.

   It used to read only the entry's STATED defectId, which named at most one
   record and is empty on every entry typed in by hand. A bus could sit on the
   sheet for a fault open in the log and no record would know it. Asking the
   sheet's own downSheetDefectIds covers all four doors — the stated id, the
   ids an entry mints per card, and the record a card adopts because the bus
   already had it. */
function downSheetEntryByDefectId(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const linked=new Map<string,DefectLogDownEntry>();
 for(const entry of downEntries){
  if(entry.workflow==="Completed")continue;
  const bus=fleet.find(item=>item.id===entry.busId);
  if(!bus)continue;
  for(const id of downSheetDefectIds(entry,normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)))
   /* First entry wins. Two active entries for one bus is already blocked on
      save, so this only decides a tie that should not exist. */
   if(!linked.has(id))linked.set(id,entry);
 }
 return linked;
}

export function defectLogRecords(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]):DefectLogRecord[]{
 const linked=downSheetEntryByDefectId(fleet,downEntries);
 return fleet.flatMap(bus=>normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.source==="defect-log").map(defect=>{
  const createdAt=defect.createdAt||bus.parkedAt||new Date(0).toISOString();
  const downSheetEntry=linked.get(defect.id);
  return {bus,defect,createdAt,updatedAt:defect.updatedAt||createdAt,onDownSheet:Boolean(downSheetEntry),
   ...(downSheetEntry?{downSheetEntry}:{})};
 })).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

/* What the sheet says about a repair, in one line, for the banner on the
   defect. The workflow leads because it answers "is anybody on it"; the shift
   and the name answer "who". */
export function downSheetEntryLabel(entry:DefectLogDownEntry){
 const who=entry.assignmentType==="Vendor"
  ?(entry.assignedTo.trim()?"Vendor: "+entry.assignedTo.trim():"Vendor")
  :entry.assignedTo.trim().toUpperCase();
 return [entry.workflow,entry.shift?entry.shift+" shift":"",entry.section,who].map(part=>String(part||"").trim()).filter(Boolean).join(" · ");
}

/* The active entries for a bus that no defect listed under it accounts for.

   A bus can be on the sheet for something that was never typed into the Defect
   Log — a scan, or a repair logged straight onto the sheet — and in that case
   the DS badge on the card is true while none of the defects under it carries
   the banner. Saying so is the difference between "the app is not telling me
   which one" and "none of these is the one". */
export function unexplainedDownSheetEntries(records:DefectLogRecord[],busId:string,downEntries:DefectLogDownEntry[]){
 const named=new Set(records.filter(record=>record.downSheetEntry).map(record=>record.downSheetEntry!.id));
 return downEntries.filter(entry=>entry.busId===busId&&entry.workflow!=="Completed"&&!named.has(entry.id));
}
export function groupDefectLogRecords(records:DefectLogRecord[]):DefectLogBusGroup[]{
 const groups=new Map<string,DefectLogBusGroup>();
 records.forEach(record=>{
  const current=groups.get(record.bus.id);
  if(current){current.records.push(record);if(record.updatedAt>current.updatedAt)current.updatedAt=record.updatedAt}
  else groups.set(record.bus.id,{bus:record.bus,records:[record],updatedAt:record.updatedAt});
 });
 return [...groups.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

export function saveDefectLogRecord(
 fleet:DefectLogFleetBus[],
 downEntries:DefectLogDownEntry[],
 busId:string,
 incoming:StructuredDefect,
 onDownSheet:boolean,
 now=new Date().toISOString(),
){
 const bus=fleet.find(item=>item.id===busId);
 if(!bus)return {fleet,downEntries,error:"missing-bus" as const};
 const duplicate=incoming.issue==="Manual entry"||incoming.issue==="Unspecified issue"?null:recentDefectDuplicate(bus,incoming,now);
 if(duplicate)return {fleet,downEntries,error:"recent-duplicate" as const,duplicate};
 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
 const existing=current.find(defect=>defect.id===incoming.id);
 const state=incoming.state;
 const defect:StructuredDefect={...existing,...incoming,createdAt:existing?.createdAt||incoming.createdAt||now,updatedAt:now,completedAt:state==="completed"?(incoming.completedAt||now):"",reportedLocation:existing?.reportedLocation||incoming.reportedLocation||bus.l,source:incoming.source||existing?.source||"defect-log"},supportingDetails=defectSupportingDetails(defect);
 const defects=existing?current.map(item=>item.id===defect.id?defect:item):[...current,defect];
 const existingDown=downEntries.find(entry=>entry.defectId===defect.id);
 let nextDown=downEntries;
 if(onDownSheet&&state!=="completed"){
  const workflow=workflowForState(state),historyItem={at:now,initials:defect.reportedBy||"",action:existingDown?"Updated from Defect Log":"Added from Defect Log"};
  const linked:DefectLogDownEntry=existingDown?{...existingDown,busNumber:bus.n,category:defect.category,repair:defect.issue,customReason:supportingDetails,workflow,operationalStatus:defect.operability==="down"?"out":state==="in-progress"?"shop":"defect",updatedAt:now,updatedBy:defect.reportedBy||existingDown.updatedBy,completedAt:"",history:[...(existingDown.history||[]),historyItem]}:{id:"repair-"+defect.id,defectId:defect.id,busId:bus.id,busNumber:bus.n,category:defect.category,repair:defect.issue,customReason:supportingDetails,assignmentType:"Mechanic",assignedTo:bus.mechanic||"",section:bus.roadcall?"Roadcall":"Pending",shift:shiftFromFleet(bus.shift),workflow,operationalStatus:defect.operability==="down"?"out":state==="in-progress"?"shop":"defect",priority:defect.operability==="down"?"High":"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,defect.category,defect.issue),createdAt:defect.createdAt||now,updatedAt:now,updatedBy:defect.reportedBy||"",completedAt:"",history:[historyItem]};
  nextDown=existingDown?downEntries.map(entry=>entry.id===existingDown.id?linked:entry):[linked,...downEntries];
 }else if(existingDown&&existingDown.workflow!=="Completed"){
  nextDown=downEntries.map(entry=>entry.id===existingDown.id?{...entry,workflow:"Completed",completedAt:now,updatedAt:now,updatedBy:defect.reportedBy||entry.updatedBy,history:[...(entry.history||[]),{at:now,initials:defect.reportedBy||"",action:state==="completed"?"Repair completed from Defect Log":"Removed from active Down Sheet"}]}:entry);
 }
 const hasActiveDown=nextDown.some(entry=>entry.busId===bus.id&&entry.workflow!=="Completed");
 const nextBusBase={...bus,defects,pendingRepair:defectSummary(defects),down:hasActiveDown};
 const nextBus=stampOperationalChange(bus,{...nextBusBase,s:repairStatus(nextBusBase,defects,state)},now) as DefectLogFleetBus;
 return {fleet:fleet.map(item=>item.id===bus.id?nextBus:item),downEntries:nextDown,error:null};
}

export function returnDefectLogBusToService(
 fleet:DefectLogFleetBus[],
 downEntries:DefectLogDownEntry[],
 busId:string,
 defectId:string,
 now=new Date().toISOString(),
){
 const bus=fleet.find(item=>item.id===busId);
 if(!bus)return {fleet,downEntries,status:null,error:"missing-bus" as const};
 if(bus.s==="decommissioned")return {fleet,downEntries,status:bus.s,error:"decommissioned" as const};
 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),target=current.find(defect=>defect.id===defectId);
 if(!target||target.source!=="defect-log")return {fleet,downEntries,status:bus.s,error:"missing-defect" as const};
 const defects=current.map(defect=>defect.id===defectId?{...defect,operability:"service" as const,state:defect.state==="in-progress"?"open" as const:defect.state,updatedAt:now}:defect);
 const status:FleetStatus=defects.some(defect=>isUnresolved(defect)&&defect.operability==="down")?"out":"defect";
 const nextBus=stampOperationalChange(bus,{...bus,s:status,defects,pendingRepair:defectSummary(defects)},now) as DefectLogFleetBus;
 const nextDown=downEntries.map(entry=>entry.busId!==bus.id||entry.workflow==="Completed"?entry:{...entry,operationalStatus:status,updatedAt:now,history:[...(entry.history||[]),{at:now,initials:"",action:"Returned to service from Defect Log"}]});
 return {fleet:fleet.map(item=>item.id===bus.id?nextBus:item),downEntries:nextDown,status,error:null};
}
export function syncLinkedDownEntriesFromFleet<T extends DefectLogDownEntry>(entries:T[],bus:DefectLogFleetBus,now=new Date().toISOString(),updatedBy=""):T[]{
 const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
 return entries.map(entry=>{
  if(entry.busId!==bus.id||!entry.defectId)return entry;
  const defect=defects.find(item=>item.id===entry.defectId);if(!defect)return entry;
  const completed=defect.state==="completed",workflow=workflowForState(defect.state),supportingDetails=defectSupportingDetails(defect),changed=entry.workflow!==workflow||entry.category!==defect.category||entry.repair!==defect.issue||entry.customReason!==supportingDetails;
  if(!changed)return entry;
  return {...entry,category:defect.category,repair:defect.issue,customReason:supportingDetails,workflow,operationalStatus:completed?roadServiceStatus({...bus,defects,pendingRepair:defectSummary(defects)}):defect.operability==="down"?"out":defect.state==="in-progress"?"shop":"defect",updatedAt:now,updatedBy:updatedBy||defect.reportedBy||entry.updatedBy,completedAt:completed?(entry.completedAt||now):"",history:[...(entry.history||[]),{at:now,initials:updatedBy||defect.reportedBy||"",action:completed?"Completed from Bus Settings":"Updated from Bus Settings"}]} as T;
 });
}
