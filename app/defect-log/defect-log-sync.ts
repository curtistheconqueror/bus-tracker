import {defectSummary,isUnresolved,normalizeDefects,type DefectState,type StructuredDefect} from "../repair-catalog.ts";
import {normalizeRepairTimeEstimate} from "../down-sheet/repair-time-estimates.ts";
import {roadServiceStatus,statusForLocation,type FleetStatus} from "../smart-status.ts";
import {stampOperationalChange} from "../operational-time.ts";

export type DefectLogFleetBus={
 id:string;n:string;s:FleetStatus;l:string;mechanic?:string;shift?:string;roadcall?:boolean;down?:boolean;
 parkedAt?:string;lastLocationChangeAt?:string;lastStatusChangeAt?:string;pendingRepair?:string;defects?:StructuredDefect[];bay12Watch?:boolean;
};

export type DefectLogDownEntry={
 id:string;defectId?:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 assignmentType:"Mechanic"|"Vendor";assignedTo:string;section:"Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";
 shift:"1st"|"2nd"|"3rd";workflow:"Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
 operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";timeEstimate:ReturnType<typeof normalizeRepairTimeEstimate>;
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:{at:string;initials:string;action:string}[];
};

export type DefectLogRecord={bus:DefectLogFleetBus;defect:StructuredDefect;createdAt:string;updatedAt:string;onDownSheet:boolean};

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

export function defectLogRecords(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]):DefectLogRecord[]{
 const activeDownIds=new Set(downEntries.filter(entry=>entry.workflow!=="Completed"&&entry.defectId).map(entry=>entry.defectId));
 return fleet.flatMap(bus=>normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).map(defect=>{
  const createdAt=defect.createdAt||bus.parkedAt||new Date(0).toISOString();
  return {bus,defect,createdAt,updatedAt:defect.updatedAt||createdAt,onDownSheet:activeDownIds.has(defect.id)};
 })).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
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
 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
 const existing=current.find(defect=>defect.id===incoming.id);
 const state=incoming.state;
 const defect:StructuredDefect={...existing,...incoming,createdAt:existing?.createdAt||incoming.createdAt||now,updatedAt:now,completedAt:state==="completed"?(incoming.completedAt||now):"",reportedLocation:existing?.reportedLocation||incoming.reportedLocation||bus.l,source:incoming.source||existing?.source||"defect-log"};
 const defects=existing?current.map(item=>item.id===defect.id?defect:item):[...current,defect];
 const existingDown=downEntries.find(entry=>entry.defectId===defect.id);
 let nextDown=downEntries;
 if(onDownSheet&&state!=="completed"){
  const workflow=workflowForState(state),historyItem={at:now,initials:defect.reportedBy||"",action:existingDown?"Updated from Defect Log":"Added from Defect Log"};
  const linked:DefectLogDownEntry=existingDown?{...existingDown,busNumber:bus.n,category:defect.category,repair:defect.issue,customReason:defect.details,workflow,operationalStatus:defect.operability==="down"?"out":state==="in-progress"?"shop":"defect",updatedAt:now,updatedBy:defect.reportedBy||existingDown.updatedBy,completedAt:"",history:[...(existingDown.history||[]),historyItem]}:{id:"repair-"+defect.id,defectId:defect.id,busId:bus.id,busNumber:bus.n,category:defect.category,repair:defect.issue,customReason:defect.details,assignmentType:"Mechanic",assignedTo:bus.mechanic||"",section:bus.roadcall?"Roadcall":"Pending",shift:shiftFromFleet(bus.shift),workflow,operationalStatus:defect.operability==="down"?"out":state==="in-progress"?"shop":"defect",priority:defect.operability==="down"?"High":"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,defect.category,defect.issue),createdAt:defect.createdAt||now,updatedAt:now,updatedBy:defect.reportedBy||"",completedAt:"",history:[historyItem]};
  nextDown=existingDown?downEntries.map(entry=>entry.id===existingDown.id?linked:entry):[linked,...downEntries];
 }else if(existingDown&&existingDown.workflow!=="Completed"){
  nextDown=downEntries.map(entry=>entry.id===existingDown.id?{...entry,workflow:"Completed",completedAt:now,updatedAt:now,updatedBy:defect.reportedBy||entry.updatedBy,history:[...(entry.history||[]),{at:now,initials:defect.reportedBy||"",action:state==="completed"?"Repair completed from Defect Log":"Removed from active Down Sheet"}]}:entry);
 }
 const hasActiveDown=nextDown.some(entry=>entry.busId===bus.id&&entry.workflow!=="Completed");
 const nextBusBase={...bus,defects,pendingRepair:defectSummary(defects),down:hasActiveDown};
 const nextBus=stampOperationalChange(bus,{...nextBusBase,s:repairStatus(nextBusBase,defects,state)},now) as DefectLogFleetBus;
 return {fleet:fleet.map(item=>item.id===bus.id?nextBus:item),downEntries:nextDown,error:null};
}

export function syncLinkedDownEntriesFromFleet<T extends DefectLogDownEntry>(entries:T[],bus:DefectLogFleetBus,now=new Date().toISOString(),updatedBy=""):T[]{
 const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
 return entries.map(entry=>{
  if(entry.busId!==bus.id||!entry.defectId)return entry;
  const defect=defects.find(item=>item.id===entry.defectId);if(!defect)return entry;
  const completed=defect.state==="completed",workflow=workflowForState(defect.state),changed=entry.workflow!==workflow||entry.category!==defect.category||entry.repair!==defect.issue||entry.customReason!==defect.details;
  if(!changed)return entry;
  return {...entry,category:defect.category,repair:defect.issue,customReason:defect.details,workflow,operationalStatus:completed?roadServiceStatus({...bus,defects,pendingRepair:defectSummary(defects)}):defect.operability==="down"?"out":defect.state==="in-progress"?"shop":"defect",updatedAt:now,updatedBy:updatedBy||defect.reportedBy||entry.updatedBy,completedAt:completed?(entry.completedAt||now):"",history:[...(entry.history||[]),{at:now,initials:updatedBy||defect.reportedBy||"",action:completed?"Completed from Bus Settings":"Updated from Bus Settings"}]} as T;
 });
}