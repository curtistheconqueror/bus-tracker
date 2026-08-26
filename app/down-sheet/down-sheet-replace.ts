import {normalizeDefects,type StructuredDefect} from "../repair-catalog.ts";
import {stampOperationalChange} from "../operational-time.ts";
import {roadServiceStatus} from "../smart-status.ts";

export type ReplaceDownEntry={id?:string;defectId?:string;busId:string;busNumber:string;section:string;workflow:string};
export type ReplaceFleetBus={
 id:string;
 l:string;
 s:"service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";
 down?:boolean;
 pendingRepair?:string;
 defects?:StructuredDefect[];
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
};

export function scannedSheetRemovals<T extends ReplaceDownEntry>(entries:T[],incomingBusIds:Iterable<string>){
 const incoming=new Set(incomingBusIds);
 return entries.filter(entry=>entry.workflow!=="Completed"&&!incoming.has(entry.busId));
}

export function prepareFleetForScannedReplacement<T extends ReplaceFleetBus>(fleet:T[],removedEntries:ReplaceDownEntry[],now=new Date().toISOString()):T[]{
 const removedInspections=new Map(removedEntries.filter(entry=>entry.section==="Inspection").map(entry=>[entry.busId,new Set([entry.defectId?.trim()||"downsheet-"+(entry.id?.trim()||entry.busId),"downsheet-"+entry.busId])]));
 return fleet.map(bus=>{
  const withoutMembership={...bus,down:false} as T,inspectionDefectIds=removedInspections.get(bus.id);
  if(!inspectionDefectIds||bus.s==="decommissioned")return bus.down?withoutMembership:bus;
  const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).map(defect=>inspectionDefectIds.has(defect.id)&&defect.state!=="completed"?{...defect,operability:"service" as const,updatedAt:now}:defect),repairAware={...withoutMembership,defects},status=roadServiceStatus(repairAware);
  return stampOperationalChange(bus,{...repairAware,s:status} as T,now) as T;
 });
}
