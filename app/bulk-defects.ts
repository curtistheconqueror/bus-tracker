import {defectSummary,isUnresolved,type StructuredDefect} from "./repair-catalog.ts";
import {statusForLocation,type FleetStatus} from "./smart-status.ts";
import {stampOperationalChange} from "./operational-time.ts";

export type BulkDefectBus={
 id:string;
 l:string;
 s:FleetStatus;
 defects:StructuredDefect[];
 pendingRepair:string;
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
};

function uniqueIds(ids:string[]){return [...new Set(ids.filter(Boolean))]}
function defectIdentity(defect:StructuredDefect){return [defect.category,defect.issue,defect.details,defect.operability].map(value=>value.trim().toLowerCase()).join("|")}

export function applyDefectToBuses<T extends BulkDefectBus>(fleet:T[],selectedIds:string[],defect:StructuredDefect,now=new Date().toISOString()):{fleet:T[];applied:number;skipped:number;error:"missing-bus"|null}{
 const ids=uniqueIds(selectedIds),selected=ids.map(id=>fleet.find(bus=>bus.id===id));
 if(selected.some(bus=>!bus))return {fleet,applied:0,skipped:0,error:"missing-bus"};
 const identity=defectIdentity(defect),updates=new Map<string,T>(),stamp=Date.now();
 let applied=0,skipped=0;
 selected.forEach(bus=>{
  if(!bus)return;
  const duplicate=bus.defects.some(item=>isUnresolved(item)&&defectIdentity(item)===identity);
  if(duplicate){skipped++;return}
  const added={...defect,id:defect.id+"-"+bus.id+"-"+stamp},defects=[...bus.defects,added],next={...bus,defects,pendingRepair:defectSummary(defects)} as T;
  const statusAware={...next,s:statusForLocation(bus.l,bus.s,next)} as T;
  updates.set(bus.id,stampOperationalChange(bus,statusAware,now) as T);
  applied++;
 });
 return {fleet:fleet.map(bus=>updates.get(bus.id)||bus),applied,skipped,error:null};
}