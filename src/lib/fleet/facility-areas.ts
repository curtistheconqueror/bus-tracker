import {moveOrSwapBuses,type MovableRepairBus} from "./smart-status.ts";
import {siteRelocationAreas,siteSectionCount,siteSectionSlots} from "./site-config.ts";

/* THE TABLES ARE READ FROM `site-config.ts` NOW, not written out here.

   Issue #21, Phase 1 step 2. This file used to be one of five independent
   descriptions of the yard that all had to agree, and nothing made them. It is
   now a VIEW of the one description, in the shape every existing caller already
   expects — the shapes did not change, only where the numbers come from.

   The capacities below are derived for the same reason. Leaving `8` written
   here while the config also said `8` would have put a second copy back in the
   file this change exists to empty. */
export const SINGLE_FILE_CAPACITY=siteSectionCount("SERVICE DETAIL AREA (SINGLE FILE)");
export const OFF_PROPERTY_CAPACITY=siteSectionCount("OFF PROPERTY");
export const WAITING_CAPACITY=siteSectionCount("WAITING AREA");
export const facilitySlots=(prefix:string,count:number,start=0)=>Array.from({length:count},(_,index)=>prefix+"-"+(index+start));
/* Still exported, and still the same ids: the map draws the east lot from this
   list directly because its numbering skips. */
export const EAST_SLOTS=siteSectionSlots()["CNG EAST LOT"];
export const SECTION_SLOTS:Record<string,string[]>=siteSectionSlots();

/* The three garage destinations, and every other section's single one, come
   from the config's own area lists. The column arithmetic that splits the
   garage moved there with them. */
export const RELOCATION_AREAS:Record<string,string[]>=siteRelocationAreas();

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
