import {ROAD_CAPACITY,WEST_CAPACITY} from "./facility-layout.ts";
import {moveOrSwapBuses,type MovableRepairBus} from "./smart-status.ts";

export const SINGLE_FILE_CAPACITY=8;
/* Two rows of the waiting area, given over to buses that are away at a vendor —
   Bus & Truck and the like. They are not on this property at all, so they are
   not "waiting" for anything here, and counting them in the holding area made
   the yard look fuller than it was.

   Twenty-eight because that is two full rows on the shop computer. It is a
   fixed count rather than "two rows" on purpose: the waiting grid is 14 across
   on a computer, 10 on an iPad and 3 on a phone, so "two rows" would have meant
   28, 20 or 6 spaces depending on what somebody happened to be holding. */
export const OFF_PROPERTY_CAPACITY=28;
export const WAITING_CAPACITY=70;
export const facilitySlots=(prefix:string,count:number,start=0)=>Array.from({length:count},(_,index)=>prefix+"-"+(index+start));
export const EAST_SLOTS=Array.from({length:9},(_,row)=>[1,2].map(column=>"east-"+(row*4+column))).flat();
export const SECTION_SLOTS:Record<string,string[]>={
 "SERVICE DETAIL AREA (SINGLE FILE)":facilitySlots("service",SINGLE_FILE_CAPACITY),
 "PAINT BOOTH":facilitySlots("paint",1),
 "WASH RACK":facilitySlots("wash",1),
 "BODY SHOP":facilitySlots("body",1),
 "SHOP BAYS (DIAGONAL)":facilitySlots("bay",9,1),
 "PIT":facilitySlots("pit",2),
 "BRAKE TEST":facilitySlots("brake",3),
 "TOW / STAGING":facilitySlots("tow",4),
 "FOREMAN OFFICE":facilitySlots("office",3),
 "CNG EAST LOT":EAST_SLOTS,
 "IN SERVICE / ON ROAD":facilitySlots("road",ROAD_CAPACITY),
 "SHOP WALL (SINGLE FILE)":facilitySlots("wall",SINGLE_FILE_CAPACITY),
 "MAIN GARAGE (BAYS 1-12)":facilitySlots("garage",84),
 "CNG WEST LOT":facilitySlots("west",WEST_CAPACITY),
 "OFF PROPERTY":facilitySlots("offsite",OFF_PROPERTY_CAPACITY),
 "WAITING AREA":facilitySlots("waiting",WAITING_CAPACITY),
};

const GARAGE_STANDARD_SLOTS=Array.from({length:7},(_,row)=>Array.from({length:10},(_,column)=>"garage-"+(row*12+column))).flat();
const TROUBLE_BAY_11_SLOTS=Array.from({length:7},(_,row)=>"garage-"+(row*12+10));
const TROUBLE_BAY_12_SLOTS=Array.from({length:7},(_,row)=>"garage-"+(row*12+11));
export const RELOCATION_AREAS:Record<string,string[]>=Object.fromEntries(Object.entries(SECTION_SLOTS).flatMap(([name,sectionSlots]):[string,string[]][]=>name==="MAIN GARAGE (BAYS 1-12)"?[["MAIN GARAGE (BAYS 1-10)",GARAGE_STANDARD_SLOTS],["TROUBLE BAY 11",TROUBLE_BAY_11_SLOTS],["TROUBLE BAY 12",TROUBLE_BAY_12_SLOTS]]:[[name,sectionSlots]]));

export function sectionForLocation(location:string){return Object.entries(RELOCATION_AREAS).find(([,sectionSlots])=>sectionSlots.includes(location))?.[0]||""}

export type AreaMoveError="missing-bus"|"unknown-area"|"insufficient-space";
export function moveBusToArea<T extends MovableRepairBus>(fleet:T[],busId:string,areaName:string,areas:Record<string,string[]>=RELOCATION_AREAS,now=new Date().toISOString()):{fleet:T[];target:string;error?:AreaMoveError;unchanged?:boolean}{
 const bus=fleet.find(item=>item.id===busId),areaSlots=areas[areaName];
 if(!bus)return {fleet,target:"",error:"missing-bus"};
 if(!areaSlots)return {fleet,target:"",error:"unknown-area"};
 if(areaSlots.includes(bus.l))return {fleet,target:bus.l,unchanged:true};
 const target=areaSlots.find(slot=>!fleet.some(item=>item.l===slot));
 if(!target)return {fleet,target:"",error:"insufficient-space"};
 return {fleet:moveOrSwapBuses(fleet,busId,target,now),target};
}
