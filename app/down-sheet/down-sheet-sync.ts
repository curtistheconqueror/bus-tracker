import {defectSummary,isUnresolved,normalizeDefects,normalizeFinding,normalizeRepairHours,type StructuredDefect} from "../repair-catalog.ts";

function clean(value:unknown){return String(value??"").trim()}
/* Only a mechanic stands in for the technician. A vendor name in FIXED BY would
   read as somebody in this shop having done the work. */
function assignedMechanic(entry:SyncDownEntry){
 return entry.assignmentType==="Mechanic"?clean(entry.assignedTo).toUpperCase():"";
}
import {stampOperationalChange} from "../operational-time.ts";
import {statusForLocation} from "../smart-status.ts";

export type SyncFleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";

export type SyncFleetBus={
 id:string;
 l:string;
 s:SyncFleetStatus;
 mechanic?:string;
 down?:boolean;
 pendingRepair?:string;
 defects?:StructuredDefect[];
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
};

export type SyncDownEntry={
 id?:string;
 defectId?:string;
 busId:string;
 category:string;
 repair:string;
 customReason:string;
 assignmentType:"Mechanic"|"Vendor";
 assignedTo:string;
 workflow:string;
 operationalStatus:SyncFleetStatus;
 completedBy?:string;
 actionTaken?:string;
 finding?:string;
 repairHours?:number;
 diagnosticHours?:number;
};

export function downSheetRepairSummary(entry:SyncDownEntry){
 return [entry.category,entry.repair,entry.customReason].map(value=>value.trim()).filter(Boolean).join(" - ");
}

export function applyDownEntryToFleet<T extends SyncFleetBus>(fleet:T[],entry:SyncDownEntry,now=new Date().toISOString()):T[]{
 return fleet.map(bus=>{
  if(bus.id!==entry.busId)return bus;
  const completed=entry.workflow==="Completed",preferredId=entry.defectId?.trim()||"downsheet-"+(entry.id?.trim()||entry.busId),legacyId="downsheet-"+entry.busId,current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),linked=current.find(defect=>defect.id===preferredId)||current.find(defect=>defect.id===legacyId&&isUnresolved(defect)),nextDefect:StructuredDefect={...linked,id:linked?.id||preferredId,category:entry.category||"Miscellaneous",issue:entry.repair||"Repair required",details:entry.customReason||"",operability:entry.operationalStatus==="out"?"down":"service",state:completed?"completed":entry.workflow==="Deferred"?"deferred":entry.workflow==="In Progress"?"in-progress":"open",createdAt:linked?.createdAt||now,updatedAt:now,completedAt:completed?(linked?.completedAt||now):"",
   /* Everything the Down Sheet learned about the repair goes onto the record
      Fixed Repairs actually reads. Falling back to the assigned mechanic is the
      important half: the sheet already knew who had the bus and used to drop it,
      so every completed entry arrived unattributed. */
   completedBy:completed?(clean(entry.completedBy)||linked?.completedBy||assignedMechanic(entry)):linked?.completedBy,
   actionTaken:clean(entry.actionTaken)||linked?.actionTaken,
   finding:normalizeFinding(entry.finding)||linked?.finding,
   repairHours:normalizeRepairHours(entry.repairHours)??linked?.repairHours,
   diagnosticHours:normalizeRepairHours(entry.diagnosticHours)??linked?.diagnosticHours,
   source:linked?.source||"down-sheet"},defects=linked?current.map(defect=>defect.id===linked.id?nextDefect:defect):[...current,nextDefect],repairAware={...bus,defects,pendingRepair:defectSummary(defects)},status=statusForLocation(bus.l,entry.operationalStatus,repairAware),next={...repairAware,s:status,down:!completed&&entry.operationalStatus!=="decommissioned",mechanic:entry.assignmentType==="Mechanic"&&entry.assignedTo.trim()?entry.assignedTo.trim():bus.mechanic} as T;
  return stampOperationalChange(bus,next,now) as T;
 });
}
