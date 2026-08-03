import {defectSummary,isUnresolved,normalizeDefects,type StructuredDefect} from "../repair-catalog.ts";

export type SyncFleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";

export type SyncFleetBus={
 id:string;
 l:string;
 s:SyncFleetStatus;
 mechanic?:string;
 down?:boolean;
 pendingRepair?:string;
 defects?:StructuredDefect[];
};

export type SyncDownEntry={
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

export function applyDownEntryToFleet<T extends SyncFleetBus>(fleet:T[],entry:SyncDownEntry):T[]{
 return fleet.map(bus=>{
  if(bus.id!==entry.busId)return bus;
  const preferredId="downsheet-"+entry.busId,completed=entry.workflow==="Completed",current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),linked=current.find(defect=>defect.id===preferredId)||current.find(isUnresolved),nextDefect:StructuredDefect={id:linked?.id||preferredId,category:entry.category||"Miscellaneous",issue:entry.repair||"Repair required",details:entry.customReason||"",operability:entry.operationalStatus==="out"?"down":"service",state:completed?"completed":entry.workflow==="Deferred"?"deferred":"open"},defects=linked?current.map(defect=>defect.id===linked.id?nextDefect:defect):[...current,nextDefect];
  return {
   ...bus,
   s:entry.operationalStatus,
   down:!completed&&entry.operationalStatus!=="decommissioned",
   defects,
   pendingRepair:defectSummary(defects),
   mechanic:entry.assignmentType==="Mechanic"&&entry.assignedTo.trim()?entry.assignedTo.trim():bus.mechanic,
  };
 });
}