/* Reading a whole-app backup back in.

   The file this restores is the only one the app writes that can be read back
   in at all - the three EXPORT ... REPORT buttons write snapshots for a person
   to read, and `REPORT_EXPORT_HINT` next door says so. This is the other one:
   the map, the Defect Log, the Down Sheet, campaigns, the remembered parts and
   findings, and every page's settings, together.

   It lived inside the Facility Map's own component, wired directly to that
   page's React setters, which is why it could only ever be pressed there. It
   is a module now so MASTER IMPORT on the Settings page can use exactly the
   same validation and exactly the same writes - one copy, so the two can never
   drift into disagreeing about what a valid backup is.

   Nothing here is clever about merging. A whole-app import REPLACES, which is
   what the confirm in front of it says and why it is the only import in the
   app that asks. Merging is what the per-section transfers are for. */

import {BOARD_SETTINGS_STORAGE_KEY,DEFECT_LOG_SETTINGS_STORAGE_KEY,DOWN_SHEET_SETTINGS_STORAGE_KEY,DOWN_SHEET_STORAGE_KEY,FLEET_STORAGE_KEY,writeFleetStorageResult,writeSetting} from "./storage.ts";
import {PARTS_MEMORY_STORAGE_KEY,normalizePartsMemory} from "./parts-memory.ts";
import {BUS_LISTS_STORAGE_KEY,BUS_LIST_TEMPLATES_STORAGE_KEY,normalizeBusLists,normalizeBusListTemplates} from "./bus-lists.ts";
import {FINDINGS_MEMORY_STORAGE_KEY,normalizeFindingsMemory} from "./findings-memory.ts";

export type FleetBackupBus={id:string;n:string;l:string;[key:string]:unknown};
export type FleetBackup={
 buses:FleetBackupBus[];
 /* True for the oldest files, which were a bare array of buses with no
    envelope at all. The pages' own readers already know how to migrate one;
    this only has to say which kind it read. */
 legacy:boolean;
 settings?:unknown;
 downSheet?:unknown;
 downSheetSettings?:unknown;
 defectLogSettings?:unknown;
 partsMemory?:unknown;
 busLists?:unknown;
 busListTemplates?:unknown;
 findingsMemory?:unknown;
};

export type FleetBackupRead={ok:true;backup:FleetBackup}|{ok:false;error:FleetBackupError};
export type FleetBackupError="unreadable"|"missing-buses"|"invalid-bus"|"duplicate-id";

/* The same four checks the Facility Map made before it would replace a board,
   kept exactly: a file that is not a backup, one with no buses, one carrying
   something that is not a bus, and one with two buses claiming the same id -
   which would silently merge two real buses into one on read. */
export function readFleetBackup(text:string):FleetBackupRead{
 let parsed:unknown;
 try{parsed=JSON.parse(text)}catch{return {ok:false,error:"unreadable"}}
 const legacy=Array.isArray(parsed);
 const envelope=legacy?{}:(parsed&&typeof parsed==="object"?parsed as Record<string,unknown>:null);
 if(!legacy&&!envelope)return {ok:false,error:"unreadable"};
 const source=legacy?parsed as unknown[]:(envelope as Record<string,unknown>).buses;
 if(!Array.isArray(source))return {ok:false,error:"missing-buses"};
 for(const item of source){
  if(!item||typeof item!=="object")return {ok:false,error:"invalid-bus"};
  const bus=item as Partial<FleetBackupBus>;
  if(typeof bus.id!=="string"||typeof bus.n!=="string"||typeof bus.l!=="string")return {ok:false,error:"invalid-bus"};
 }
 const buses=source as FleetBackupBus[];
 if(new Set(buses.map(bus=>bus.id)).size!==buses.length)return {ok:false,error:"duplicate-id"};
 const rest=legacy?{}:envelope as Record<string,unknown>;
 return {ok:true,backup:{buses,legacy,
  settings:rest.settings,downSheet:rest.downSheet,downSheetSettings:rest.downSheetSettings,
  defectLogSettings:rest.defectLogSettings,partsMemory:rest.partsMemory,
  busLists:rest.busLists,busListTemplates:rest.busListTemplates,findingsMemory:rest.findingsMemory}};
}

export const FLEET_BACKUP_ERRORS:Record<FleetBackupError,string>={
 unreadable:"This file is not a valid fleet board backup. No changes were made.",
 "missing-buses":"This backup has no buses in it. No changes were made.",
 "invalid-bus":"This backup contains something that is not a bus. No changes were made.",
 "duplicate-id":"This backup lists two buses with the same id, which would merge them. No changes were made.",
};

export type FleetRestoreResult={ok:boolean;restored:string[];reason?:string};

/* Write everything the file carries, and nothing it does not.

   A key the file omits is LEFT ALONE rather than cleared. Campaigns were
   missing from the backup until version 4, so restoring an older file must not
   wipe the campaigns this device already holds - and the same reasoning covers
   every key a future version adds.

   The board is written first and its result decides everything: if the device
   refuses that write there is no half-restored state, because nothing else has
   been touched yet. */
export function restoreFleetBackup(storage:Storage,backup:FleetBackup):FleetRestoreResult{
 const written=writeFleetStorageResult(storage,backup.buses,{allowBulkDefectLoss:true});
 if(!written.ok)return {ok:false,restored:[],reason:written.reason};
 const restored=["board"];
 const put=(key:string,value:unknown,label:string,shape:(value:unknown)=>unknown=(value)=>value)=>{
  if(value===undefined||value===null)return;
  writeSetting(storage,key,JSON.stringify(shape(value)));
  restored.push(label);
 };
 put(BOARD_SETTINGS_STORAGE_KEY,backup.settings,"map settings");
 put(DOWN_SHEET_STORAGE_KEY,backup.downSheet,"down sheet");
 put(DOWN_SHEET_SETTINGS_STORAGE_KEY,backup.downSheetSettings,"down sheet settings");
 put(DEFECT_LOG_SETTINGS_STORAGE_KEY,backup.defectLogSettings,"defect log settings");
 put(PARTS_MEMORY_STORAGE_KEY,backup.partsMemory,"remembered parts",normalizePartsMemory);
 put(BUS_LISTS_STORAGE_KEY,backup.busLists,"campaigns",normalizeBusLists);
 put(BUS_LIST_TEMPLATES_STORAGE_KEY,backup.busListTemplates,"campaign templates",normalizeBusListTemplates);
 put(FINDINGS_MEMORY_STORAGE_KEY,backup.findingsMemory,"remembered findings",normalizeFindingsMemory);
 return {ok:true,restored};
}

export {FLEET_STORAGE_KEY};
