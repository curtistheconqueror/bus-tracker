import {stampOperationalChange} from "./operational-time.ts";
import {statusForLocation,type FleetStatus,type MovableRepairBus} from "./smart-status.ts";

export type OperatorBatchArea={name:string;slots:string[]};
export type OperatorBatchInstruction={busId:string;areaName?:string;status?:FleetStatus};

export type OperatorBatchResult<T>=
 | {fleet:T[];moved:number;statusUpdated:number;error?:undefined}
 | {fleet:T[];moved:0;statusUpdated:0;error:"duplicate-bus"|"missing-bus"|"missing-area"|"insufficient-space";areaName?:string};

export function applyOperatorBatch<T extends MovableRepairBus>(fleet:T[],instructions:OperatorBatchInstruction[],areas:OperatorBatchArea[],now=new Date().toISOString()):OperatorBatchResult<T>{
 const ids=instructions.map(instruction=>instruction.busId);
 if(new Set(ids).size!==ids.length)return {fleet,moved:0,statusUpdated:0,error:"duplicate-bus"};
 if(ids.some(id=>!fleet.some(bus=>bus.id===id)))return {fleet,moved:0,statusUpdated:0,error:"missing-bus"};
 const areaMap=new Map(areas.map(area=>[area.name,area.slots])),missingArea=instructions.find(instruction=>instruction.areaName&&!areaMap.has(instruction.areaName));
 if(missingArea)return {fleet,moved:0,statusUpdated:0,error:"missing-area",areaName:missingArea.areaName};

 const instructionMap=new Map(instructions.map(instruction=>[instruction.busId,instruction])),vacated=new Set<string>();
 for(const instruction of instructions){
  if(!instruction.areaName)continue;
  const bus=fleet.find(item=>item.id===instruction.busId)!,targetSlots=areaMap.get(instruction.areaName)!;
  if(!targetSlots.includes(bus.l))vacated.add(bus.l);
 }
 const occupied=new Set(fleet.filter(bus=>!vacated.has(bus.l)).map(bus=>bus.l)),targets=new Map<string,string>();
 for(const instruction of instructions){
  const bus=fleet.find(item=>item.id===instruction.busId)!;
  if(!instruction.areaName){targets.set(bus.id,bus.l);continue}
  const areaSlots=areaMap.get(instruction.areaName)!;
  if(areaSlots.includes(bus.l)){targets.set(bus.id,bus.l);continue}
  const target=areaSlots.find(slot=>!occupied.has(slot));
  if(!target)return {fleet,moved:0,statusUpdated:0,error:"insufficient-space",areaName:instruction.areaName};
  targets.set(bus.id,target);
  occupied.add(target);
 }
 let moved=0,statusUpdated=0;
 const next=fleet.map(bus=>{
  const instruction=instructionMap.get(bus.id);
  if(!instruction)return bus;
  const location=targets.get(bus.id)||bus.l,automatic=statusForLocation(location,bus.s,bus),status=instruction.status??automatic;
  if(location!==bus.l)moved++;
  if(status!==bus.s)statusUpdated++;
  return stampOperationalChange(bus,{...bus,l:location,s:status} as T,now) as T;
 });
 return {fleet:next,moved,statusUpdated};
}
