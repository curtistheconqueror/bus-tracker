export type SyncFleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";

export type SyncFleetBus={
 id:string;
 l:string;
 s:SyncFleetStatus;
 mechanic?:string;
 down?:boolean;
 pendingRepair?:string;
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
 return [entry.category,entry.repair,entry.customReason].map(value=>value.trim()).filter(Boolean).join(" — ");
}

export function applyDownEntryToFleet<T extends SyncFleetBus>(fleet:T[],entry:SyncDownEntry):T[]{
 const summary=downSheetRepairSummary(entry);
 return fleet.map(bus=>{
  if(bus.id!==entry.busId)return bus;
  const completed=entry.workflow==="Completed";
  return {
   ...bus,
   s:entry.operationalStatus,
   down:!completed&&entry.operationalStatus!=="decommissioned",
   pendingRepair:completed?"":summary,
   mechanic:entry.assignmentType==="Mechanic"&&entry.assignedTo.trim()?entry.assignedTo.trim():bus.mechanic,
  };
 });
}
