export const FLEET_STORAGE_KEY="pace-board-v1";
export const FLEET_STORAGE_VERSION=4;
export const DOWN_SHEET_STORAGE_KEY="pace-down-sheet-v1";
export const DOWN_SHEET_STORAGE_VERSION=1;
export const BOARD_SETTINGS_STORAGE_KEY="pace-board-settings-v1";
export const DOWN_SHEET_SETTINGS_STORAGE_KEY="pace-down-sheet-settings-v1";
export const DEFECT_LOG_SETTINGS_STORAGE_KEY="pace-defect-log-settings-v1";

type JsonRecord=Record<string,unknown>;
type StorageReader=Pick<Storage,"getItem">;
type StorageWriter=Pick<Storage,"getItem"|"setItem">;

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

export function writeFleetStorage<T>(storage:StorageWriter,buses:T[]){
 const raw=storage.getItem(FLEET_STORAGE_KEY),current=readFleetPayload<T>(raw);
 if(raw!==null&&(!current.valid||!current.supported))return false;
 storage.setItem(FLEET_STORAGE_KEY,serializeFleetPayload(buses,current.envelope));
 return true;
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
