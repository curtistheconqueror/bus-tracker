import {statusForLocation,type FleetStatus,type RepairAwareBus} from "./smart-status.ts";
import {stampOperationalChange} from "./operational-time.ts";

export type BulkRelocationBus=RepairAwareBus&{
 id:string;
 l:string;
 s:FleetStatus;
 parkedAt:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
};

export type BulkAreaAvailability={
 open:number;
 needed:number;
 already:number;
 available:boolean;
};

function uniqueIds(ids:string[]){
 return [...new Set(ids.filter(Boolean))];
}

export function bulkAreaAvailability<T extends {id:string;l:string}>(fleet:T[],selectedIds:string[],targetSlots:string[]):BulkAreaAvailability{
 const selected=new Set(uniqueIds(selectedIds)),already=fleet.filter(bus=>selected.has(bus.id)&&targetSlots.includes(bus.l)).length,needed=Math.max(0,selected.size-already),open=targetSlots.filter(slot=>!fleet.some(bus=>bus.l===slot)).length;
 return {open,needed,already,available:open>=needed};
}

export function bulkRelocateBuses<T extends BulkRelocationBus>(fleet:T[],selectedIds:string[],targetSlots:string[],now=new Date().toISOString()):{fleet:T[];moved:number;error:"missing-bus"|"insufficient-space"|null}{
 const ids=uniqueIds(selectedIds),selected=ids.map(id=>fleet.find(bus=>bus.id===id));
 if(selected.some(bus=>!bus))return {fleet,moved:0,error:"missing-bus"};
 const capacity=bulkAreaAvailability(fleet,ids,targetSlots);
 if(!capacity.available)return {fleet,moved:0,error:"insufficient-space"};
 const open=targetSlots.filter(slot=>!fleet.some(bus=>bus.l===slot)),assignments=new Map<string,string>();
 ids.forEach(id=>{
  const bus=fleet.find(item=>item.id===id);
  if(!bus||targetSlots.includes(bus.l))return;
  const slot=open.shift();
  if(slot)assignments.set(id,slot);
 });
 return {fleet:fleet.map(bus=>{
  const location=assignments.get(bus.id);
  if(!location)return bus;
  const relocated={...bus,l:location,s:statusForLocation(location,bus.s,bus)} as T;
  return stampOperationalChange(bus,relocated,now) as T;
 }),moved:assignments.size,error:null};
}
