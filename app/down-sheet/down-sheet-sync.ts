import {defectSummary,isUnresolved,normalizeDefects,type StructuredDefect} from "../repair-catalog.ts";
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
 busId:string;
 category:string;
 repair:string;
 customReason:string;
 assignmentType:"Mechanic"|"Vendor";
 assignedTo:string;
 workflow:string;
 operationalStatus:SyncFleetStatus;
};

export function downSheetRepairSummary(entry:SyncDownEntry){
 return [entry.category,entry.repair,entry.customReason].map(value=>value.trim()).filter(Boolean).join(" - ");
}

export function applyDownEntryToFleet<T extends SyncFleetBus>(fleet:T[],entry:SyncDownEntry,now=new Date().toISOString()):T[]{
 return fleet.map(bus=>{
  if(bus.id!==entry.busId)return bus;
  const completed=entry.workflow==="Completed",preferredId="downsheet-"+(entry.id?.trim()||entry.busId),legacyId="downsheet-"+entry.busId,current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),linked=current.find(defect=>defect.id===preferredId)||current.find(defect=>defect.id===legacyId&&isUnresolved(defect)),nextDefect:StructuredDefect={id:linked?.id||preferredId,category:entry.category||"Miscellaneous",issue:entry.repair||"Repair required",details:entry.customReason||"",operability:entry.operationalStatus==="out"?"down":"service",state:completed?"completed":entry.workflow==="Deferred"?"deferred":"open"},defects=linked?current.map(defect=>defect.id===linked.id?nextDefect:defect):[...current,nextDefect],repairAware={...bus,defects,pendingRepair:defectSummary(defects)},status=statusForLocation(bus.l,entry.operationalStatus,repairAware),next={...repairAware,s:status,down:!completed&&entry.operationalStatus!=="decommissioned",mechanic:entry.assignmentType==="Mechanic"&&entry.assignedTo.trim()?entry.assignedTo.trim():bus.mechanic} as T;
  return stampOperationalChange(bus,next,now) as T;
 });
}
