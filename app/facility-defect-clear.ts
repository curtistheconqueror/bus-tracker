import {defectSummary,isUnresolved,migrateRepairIdentity,normalizeDefects,type StructuredDefect} from "./repair-catalog.ts";
import {statusForLocation,type FleetStatus} from "./smart-status.ts";

export const FACILITY_DEFECT_CLEAR_UNDO_KEY="pace-facility-defect-clear-undo-v1";

const FLAG_KEYS=["checkEngine","checkTransmission","noHorn","badRampKneeler","farebox","ibsVentra"] as const;
type FlagKey=typeof FLAG_KEYS[number];
const ALERT_DEFECTS:Record<FlagKey,{category:string;issue:string}>={
 checkEngine:{category:"Engine",issue:"Check engine light"},
 checkTransmission:{category:"Transmission",issue:"Control / communication fault"},
 noHorn:{category:"Electrical / Multiplex",issue:"Horn"},
 badRampKneeler:{category:"Doors, Ramp and ADA",issue:"Ramp, Lift and Kneeler - Kneeler"},
 farebox:{category:"Tech Services",issue:"Farebox"},
 ibsVentra:{category:"Tech Services",issue:"IBS Screen"},
};

export type FacilityDefectBus={id:string;l:string;s:FleetStatus;pendingRepair?:string;defects?:StructuredDefect[]} & Partial<Record<FlagKey,boolean>>;
type SnapshotBus={id:string;s:FleetStatus;pendingRepair:string;defects:StructuredDefect[]} & Record<FlagKey,boolean>;
export type FacilityDefectClearSnapshot={version:1;clearedAt:string;buses:SnapshotBus[]};

function isFacilityOnly(defect:StructuredDefect){return isUnresolved(defect)&&(!defect.source||defect.source==="tracker"||defect.source==="operator")}
function hasLegacyFlag(bus:FacilityDefectBus){return FLAG_KEYS.some(key=>Boolean(bus[key]))}

export function syncFacilityAlertDefects<T extends FacilityDefectBus>(previous:T|undefined,next:T,now=new Date().toISOString()):T{
 const defects=normalizeDefects(next.defects,next.pendingRepair||"",next.id),added=[...defects];
 /* The alert wordings above are compared against defects that have just been
    normalized — and normalizing migrates wordings to their current home. So the
    choice has to be migrated too, or a wording that has moved never matches
    what is already on the bus and a flag that flips twice adds the alert twice.
    Three of the six were already in that state before Tech Services regrouped;
    migrating here fixes all of them and writes the current wording. */
 FLAG_KEYS.forEach(key=>{if(!next[key]||previous?.[key])return;const raw=ALERT_DEFECTS[key],choice=migrateRepairIdentity(raw.category,raw.issue),duplicate=added.some(defect=>isUnresolved(defect)&&defect.category===choice.category&&defect.issue===choice.issue);if(!duplicate)added.push({id:"facility-alert-"+key+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),...choice,details:"Added from Facility Map alert",operability:"service",state:"open",createdAt:now,updatedAt:now,source:"defect-log"})});
 return added.length===defects.length?next:{...next,defects:added,pendingRepair:defectSummary(added)};
}

export function facilityOnlyDefectCount(fleet:FacilityDefectBus[]){return fleet.reduce((count,bus)=>count+normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isFacilityOnly).length+(hasLegacyFlag(bus)?1:0),0)}

export function clearFacilityOnlyDefects<T extends FacilityDefectBus>(fleet:T[],clearedAt=new Date().toISOString()){
 const changed=fleet.filter(bus=>normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).some(isFacilityOnly)||hasLegacyFlag(bus));
 const snapshot:FacilityDefectClearSnapshot={version:1,clearedAt,buses:changed.map(bus=>({id:bus.id,s:bus.s,pendingRepair:bus.pendingRepair||"",defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),...Object.fromEntries(FLAG_KEYS.map(key=>[key,Boolean(bus[key])])) as Record<FlagKey,boolean>}))};
 const next=fleet.map(bus=>{
  if(!changed.some(item=>item.id===bus.id))return bus;
  const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>!isFacilityOnly(defect)),pendingRepair=defectSummary(defects),clearedFlags=Object.fromEntries(FLAG_KEYS.map(key=>[key,false])) as Record<FlagKey,boolean>,repairAware={...bus,...clearedFlags,defects,pendingRepair},s=statusForLocation(bus.l,bus.s,repairAware);
  return {...repairAware,s} as T;
 });
 return {fleet:next,snapshot,changedBuses:changed.length,removedDefects:fleet.reduce((count,bus)=>count+normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isFacilityOnly).length,0)};
}

export function restoreFacilityOnlyDefects<T extends FacilityDefectBus>(fleet:T[],snapshot:FacilityDefectClearSnapshot){const byId=new Map(snapshot.buses.map(bus=>[bus.id,bus]));return fleet.map(bus=>{const saved=byId.get(bus.id);return saved?{...bus,...saved} as T:bus})}

export function readFacilityDefectClearSnapshot(raw:string|null):FacilityDefectClearSnapshot|null{if(!raw)return null;try{const parsed=JSON.parse(raw) as Partial<FacilityDefectClearSnapshot>;if(parsed.version!==1||typeof parsed.clearedAt!=="string"||!Array.isArray(parsed.buses)||parsed.buses.some(bus=>!bus||typeof bus.id!=="string"||!Array.isArray(bus.defects)))return null;return parsed as FacilityDefectClearSnapshot}catch{return null}}
