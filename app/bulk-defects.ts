import {defectSummary,isUnresolved,type StructuredDefect} from "./repair-catalog.ts";
import {roadServiceStatus,type FleetStatus} from "./smart-status.ts";

export type BulkDefectBus={
 id:string;
 l:string;
 s:FleetStatus;
 defects:StructuredDefect[];
 pendingRepair:string;
};

function uniqueIds(ids:string[]){return [...new Set(ids.filter(Boolean))]}
function defectIdentity(defect:StructuredDefect){return [defect.category,defect.issue,defect.details,defect.operability].map(value=>value.trim().toLowerCase()).join("|")}

export function applyDefectToBuses<T extends BulkDefectBus>(fleet:T[],selectedIds:string[],defect:StructuredDefect):{fleet:T[];applied:number;skipped:number;error:"missing-bus"|null}{
 const ids=uniqueIds(selectedIds),selected=ids.map(id=>fleet.find(bus=>bus.id===id));
 if(selected.some(bus=>!bus))return {fleet,applied:0,skipped:0,error:"missing-bus"};
 const identity=defectIdentity(defect),updates=new Map<string,T>(),stamp=Date.now();
 let applied=0,skipped=0;
 selected.forEach(bus=>{
  if(!bus)return;
  const duplicate=bus.defects.some(item=>isUnresolved(item)&&defectIdentity(item)===identity);
  if(duplicate){skipped++;return}
  const added={...defect,id:defect.id+"-"+bus.id+"-"+stamp},defects=[...bus.defects,added],next={...bus,defects,pendingRepair:defectSummary(defects)} as T;
  const smartStatus=["service","defect"].includes(bus.s)||bus.l.startsWith("road-")&&bus.s==="shop";
  updates.set(bus.id,smartStatus?{...next,s:roadServiceStatus(next)} as T:next);
  applied++;
 });
 return {fleet:fleet.map(bus=>updates.get(bus.id)||bus),applied,skipped,error:null};
}