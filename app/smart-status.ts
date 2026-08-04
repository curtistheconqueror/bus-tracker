import type {StructuredDefect} from "./repair-catalog.ts";
import {isUnresolved} from "./repair-catalog.ts";

export type FleetStatus="shop"|"service"|"defect"|"out"|"decommissioned"|"unknown";
export type RepairAwareBus={defects?:StructuredDefect[];pendingRepair?:string};

export function hasUnresolvedDefects(bus:RepairAwareBus){
 if(Array.isArray(bus.defects)&&bus.defects.length>0)return bus.defects.some(isUnresolved);
 return Boolean(bus.pendingRepair?.trim());
}

export function hasDowningDefects(bus:RepairAwareBus){
 return Array.isArray(bus.defects)&&bus.defects.some(defect=>isUnresolved(defect)&&defect.operability==="down");
}

export function roadServiceStatus(bus:RepairAwareBus):FleetStatus{
 if(hasDowningDefects(bus))return "out";
 return hasUnresolvedDefects(bus)?"defect":"service";
}

export function statusForLocation(location:string,current:FleetStatus,bus:RepairAwareBus):FleetStatus{
 if(location.startsWith("bay-"))return "shop";
 if((location.startsWith("east-")||location.startsWith("west-"))&&hasUnresolvedDefects(bus))return "out";
 if(location.startsWith("road-")&&(current==="shop"||current==="service"||current==="defect"))return roadServiceStatus(bus);
 return current;
}

export type MovableRepairBus=RepairAwareBus&{id:string;l:string;s:FleetStatus;parkedAt:string};

export function moveOrSwapBuses<T extends MovableRepairBus>(fleet:T[],id:string,targetLocation:string,now=new Date().toISOString()):T[]{
 const moving=fleet.find(bus=>bus.id===id);
 if(!moving||moving.l===targetLocation)return fleet;
 const destination=fleet.find(bus=>bus.l===targetLocation&&bus.id!==id),origin=moving.l;
 return fleet.map(bus=>bus.id===moving.id?{...bus,l:targetLocation,s:statusForLocation(targetLocation,bus.s,bus),parkedAt:now}:destination&&bus.id===destination.id?{...bus,l:origin,s:statusForLocation(origin,bus.s,bus),parkedAt:now}:bus);
}