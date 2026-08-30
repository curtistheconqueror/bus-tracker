export const FLEET_STORAGE_KEY="pace-board-v1";
export const FLEET_STORAGE_VERSION=4;
export const DOWN_SHEET_STORAGE_KEY="pace-down-sheet-v1";
export const DOWN_SHEET_STORAGE_VERSION=1;
export const BOARD_SETTINGS_STORAGE_KEY="pace-board-settings-v1";
export const DOWN_SHEET_SETTINGS_STORAGE_KEY="pace-down-sheet-settings-v1";
export const DEFECT_LOG_SETTINGS_STORAGE_KEY="pace-defect-log-settings-v1";
export const FLEET_RECOVERY_STORAGE_KEY="pace-board-recovery-v1";
export const FLEET_BACKUP_REMINDER_STORAGE_KEY="pace-board-backup-reminder-v1";
export const FLEET_BACKUP_INTERVAL=20;
/* What the reminder may be set to. A backup nobody is ever nudged towards is
   the failure this whole banner exists to prevent, so there is no "never": the
   loosest setting still asks, just rarely. */
export const FLEET_BACKUP_INTERVAL_CHOICES=[5,10,20,30,50,100] as const;
export function normalizeFleetBackupInterval(value:unknown){
 const interval=Math.round(Number(value));
 return (FLEET_BACKUP_INTERVAL_CHOICES as readonly number[]).includes(interval)?interval:FLEET_BACKUP_INTERVAL;
}

type JsonRecord=Record<string,unknown>;
type StorageReader=Pick<Storage,"getItem">;
type StorageWriter=Pick<Storage,"getItem"|"setItem">;

export type FleetWriteOptions={allowBulkDefectLoss?:boolean;skipRecoverySnapshot?:boolean};
export type FleetRecoverySnapshot={version:1;savedAt:string;busCount:number;defectCount:number;raw:string};
type FleetBackupReminder={version:1;lastExportedAt:string;lastExportedDefectLogCount:number};

export type CollectionPayload<T>={
 version:number;
 items:T[];
 legacy:boolean;
 valid:boolean;
 supported:boolean;
 envelope:JsonRecord;
};

function isRecord(value:unknown):value is JsonRecord{
 return Boolean(value)&&typeof value==="object"&&!Array.isArray(value);
}

function numericVersion(value:unknown,fallback:number){
 const parsed=Number(value);
 return Number.isFinite(parsed)&&parsed>=0?parsed:fallback;
}

function readCollection<T>(raw:string|null,key:string,currentVersion:number):CollectionPayload<T>{
 if(raw===null||raw.trim()==="")return {version:currentVersion,items:[],legacy:false,valid:true,supported:true,envelope:{}};
 let value:unknown;
 try{value=JSON.parse(raw)}catch{return {version:currentVersion,items:[],legacy:false,valid:false,supported:false,envelope:{}}}
 if(Array.isArray(value))return {version:0,items:value as T[],legacy:true,valid:true,supported:true,envelope:{}};
 if(!isRecord(value)||!Array.isArray(value[key]))return {version:currentVersion,items:[],legacy:false,valid:false,supported:false,envelope:isRecord(value)?value:{}};
 const version=numericVersion(value.version,0);
 return {version,items:value[key] as T[],legacy:false,valid:true,supported:version<=currentVersion,envelope:value};
}

function envelopeBase(value:unknown,key:string){
 if(!isRecord(value))return {};
 const next={...value};
 delete next.version;
 delete next[key];
 return next;
}

export function readFleetPayload<T=unknown>(raw:string|null){
 const payload=readCollection<T>(raw,"buses",FLEET_STORAGE_VERSION);
 return {...payload,buses:payload.items};
}

export function readDownSheetPayload<T=unknown>(raw:string|null){
 const payload=readCollection<T>(raw,"entries",DOWN_SHEET_STORAGE_VERSION);
 return {...payload,entries:payload.items};
}

export function serializeFleetPayload<T>(buses:T[],base:unknown={}){
 return JSON.stringify({...envelopeBase(base,"buses"),version:FLEET_STORAGE_VERSION,buses});
}

export function serializeDownSheetPayload<T>(entries:T[],base:unknown={}){
 return JSON.stringify({...envelopeBase(base,"entries"),version:DOWN_SHEET_STORAGE_VERSION,entries});
}

function busDefects(bus:unknown){
 if(!isRecord(bus)||!Array.isArray(bus.defects))return [] as JsonRecord[];
 return bus.defects.filter(isRecord);
}

export function fleetDefectCount(buses:unknown[]){return buses.reduce((count,bus)=>count+busDefects(bus).length,0)}

export function fleetDefectLogCount(buses:unknown[]){
 return buses.reduce<number>((count,bus)=>count+busDefects(bus).filter(defect=>defect.source==="defect-log").length,0);
}

export function readFleetRecoverySnapshot(raw:string|null):FleetRecoverySnapshot|null{
 if(!raw)return null;
 try{
  const value=JSON.parse(raw) as Partial<FleetRecoverySnapshot>;
  if(value.version!==1||typeof value.savedAt!=="string"||typeof value.raw!=="string"||!Number.isFinite(value.busCount)||!Number.isFinite(value.defectCount))return null;
  const fleet=readFleetPayload(value.raw);
  return fleet.valid&&fleet.supported?value as FleetRecoverySnapshot:null;
 }catch{return null}
}

function saveFleetRecoverySnapshot(storage:StorageWriter,raw:string,buses:unknown[]){
 const snapshot:FleetRecoverySnapshot={version:1,savedAt:new Date().toISOString(),busCount:buses.length,defectCount:fleetDefectCount(buses),raw};
 try{storage.setItem(FLEET_RECOVERY_STORAGE_KEY,JSON.stringify(snapshot));return true}catch{return false}
}

function warnBulkLoss(currentDefects:number,nextDefects:number,currentBuses:number,nextBuses:number){
 if(typeof window==="undefined")return;
 const removedDefects=Math.max(0,currentDefects-nextDefects),removedBuses=Math.max(0,currentBuses-nextBuses),loss=[removedDefects?removedDefects+" saved defect"+(removedDefects===1?"":"s"):"",removedBuses?removedBuses+" bus record"+(removedBuses===1?"":"s"):""].filter(Boolean).join(" and ");
 window.setTimeout(()=>window.alert("SAFETY STOP: This change would remove "+loss+" at once. Nothing was overwritten. Reload the page, then export or restore the last-known-good copy from Fleet Tracker Settings."),0);
}

export function writeFleetStorage<T>(storage:StorageWriter,buses:T[],options:FleetWriteOptions={}){
 const raw=storage.getItem(FLEET_STORAGE_KEY),current=readFleetPayload<T>(raw);
 if(raw!==null&&(!current.valid||!current.supported))return false;
 const currentDefects=fleetDefectCount(current.buses),nextDefects=fleetDefectCount(buses),bulkLoss=currentDefects-nextDefects>=5||current.buses.length-buses.length>=5;
 if(raw!==null&&bulkLoss&&!options.allowBulkDefectLoss){saveFleetRecoverySnapshot(storage,raw,current.buses);warnBulkLoss(currentDefects,nextDefects,current.buses.length,buses.length);return false}
 if(raw!==null&&!options.skipRecoverySnapshot&&!saveFleetRecoverySnapshot(storage,raw,current.buses))return false;
 try{storage.setItem(FLEET_STORAGE_KEY,serializeFleetPayload(buses,current.envelope));return true}catch{return false}
}

export function writeDownSheetStorage<T>(storage:StorageWriter,entries:T[]){
 const raw=storage.getItem(DOWN_SHEET_STORAGE_KEY),current=readDownSheetPayload<T>(raw);
 if(raw!==null&&(!current.valid||!current.supported))return false;
 storage.setItem(DOWN_SHEET_STORAGE_KEY,serializeDownSheetPayload(entries,current.envelope));
 return true;
}

export function readFleetStorage<T=unknown>(storage:StorageReader){
 return readFleetPayload<T>(storage.getItem(FLEET_STORAGE_KEY));
}

export function readDownSheetStorage<T=unknown>(storage:StorageReader){
 return readDownSheetPayload<T>(storage.getItem(DOWN_SHEET_STORAGE_KEY));
}

export function fleetBackupDue(storage:StorageReader,buses:unknown[],interval=FLEET_BACKUP_INTERVAL){
 const current=fleetDefectLogCount(buses);
 try{
  const value=JSON.parse(storage.getItem(FLEET_BACKUP_REMINDER_STORAGE_KEY)||"null") as Partial<FleetBackupReminder>|null;
  const baseline=value?.version===1&&Number.isFinite(value.lastExportedDefectLogCount)?Number(value.lastExportedDefectLogCount):0;
  return {due:current-baseline>=interval,newLogs:Math.max(0,current-baseline),current,interval};
 }catch{return {due:current>=interval,newLogs:current,current,interval}}
}

export function markFleetBackupExported(storage:StorageWriter,buses:unknown[],at=new Date().toISOString()){
 const reminder:FleetBackupReminder={version:1,lastExportedAt:at,lastExportedDefectLogCount:fleetDefectLogCount(buses)};
 try{storage.setItem(FLEET_BACKUP_REMINDER_STORAGE_KEY,JSON.stringify(reminder));return true}catch{return false}
}
