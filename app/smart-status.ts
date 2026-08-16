import type {StructuredDefect} from "./repair-catalog.ts";
import {isUnresolved} from "./repair-catalog.ts";
import {stampOperationalChange} from "./operational-time.ts";

export type FleetStatus="shop"|"service"|"defect"|"out"|"decommissioned"|"unknown";
export type RepairAwareBus={defects?:StructuredDefect[];pendingRepair?:string};

export function hasUnresolvedDefects(bus:RepairAwareBus){
 if(Array.isArray(bus.defects)&&bus.defects.length>0)return bus.defects.some(isUnresolved);
 return Boolean(bus.pendingRepair?.trim());
}

export function hasDowningDefects(bus:RepairAwareBus){
 return Array.isArray(bus.defects)&&bus.defects.some(defect=>isUnresolved(defect)&&defect.operability==="down");
}

export function hasRequiredInteriorCleaning(bus:RepairAwareBus){
 return Array.isArray(bus.defects)&&bus.defects.some(defect=>isUnresolved(defect)&&defect.category==="Interior Cleaning"&&defect.issue==="Cleaning Required");
}

export function roadServiceStatus(bus:RepairAwareBus):FleetStatus{
 if(hasDowningDefects(bus))return "out";
 return hasUnresolvedDefects(bus)?"defect":"service";
}

export function statusForLocation(location:string,current:FleetStatus,bus:RepairAwareBus):FleetStatus{
 if(current==="decommissioned")return current;
 if(location.startsWith("east-")||location.startsWith("west-"))return "out";
 if(hasRequiredInteriorCleaning(bus))return "shop";
 if(location.startsWith("bay-")||location.startsWith("body-"))return "shop";
 if(location.startsWith("road-")||location.startsWith("garage-"))return roadServiceStatus(bus);
 return current;
}

export type MovableRepairBus=RepairAwareBus&{id:string;l:string;s:FleetStatus;parkedAt:string;lastLocationChangeAt?:string;lastStatusChangeAt?:string};

export function moveOrSwapBuses<T extends MovableRepairBus>(fleet:T[],id:string,targetLocation:string,now=new Date().toISOString()):T[]{
 const moving=fleet.find(bus=>bus.id===id);
 if(!moving||moving.l===targetLocation)return fleet;
 const destination=fleet.find(bus=>bus.l===targetLocation&&bus.id!==id),origin=moving.l;
 const relocate=(bus:T,location:string)=>stampOperationalChange(bus,{...bus,l:location,s:statusForLocation(location,bus.s,bus)} as T,now) as T;
 return fleet.map(bus=>bus.id===moving.id?relocate(bus,targetLocation):destination&&bus.id===destination.id?relocate(bus,origin):bus);
}
