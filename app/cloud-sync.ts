/* Shared data between devices, without giving up working offline.

   Everything here is a copy going somewhere else. The board still lives in this
   device's LocalStorage, still loads with the garage wifi down, and still works
   if Supabase is unreachable for a week. Sync is something that happens to a
   board that already exists; it is never where the board lives.

   This module holds only the parts that can be reasoned about without a network
   or a browser: what the config is, what a row looks like, which rows actually
   changed, and what the status line should say. The Supabase calls themselves
   live in cloud-client.ts so all of this stays testable.

   Storage is passed in rather than reached for, the same as storage.ts, because
   the tests have no DOM. */

import {type StructuredDefect} from "./repair-catalog.ts";

type StorageReader=Pick<Storage,"getItem">;
type StorageWriter=Pick<Storage,"getItem"|"setItem">;

/* New keys. Nothing existing is renamed — a rename silently orphans a
   mechanic's board, and every key in this project is load-bearing. */
export const CLOUD_CONFIG_STORAGE_KEY="pace-cloud-config-v1";
export const CLOUD_STATE_STORAGE_KEY="pace-cloud-state-v1";
export const CLOUD_SENT_STORAGE_KEY="pace-cloud-sent-v1";

/* The project URL and anon key are typed into Settings rather than baked into
   the build. Three reasons, in order of how much they cost to get wrong:

   1. This app's bundle inlines process.env.* at BUILD time, and any client-side
      process.env read that was not inlined throws a ReferenceError rather than
      returning undefined. A build-time value that nobody set is a white screen,
      not a disabled feature.
   2. Claude Code does not publish this app, so it cannot set the build
      environment. Baking the value in would put it in the publisher's hands and
      make the feature depend on a step nobody has written down.
   3. Nothing secret ends up in the repository. The anon key is designed to sit
      in client code — it is the RLS policies and the shop login that protect
      the data, not the key — but this project's rule is that credentials are
      never committed, and there is no reason to make an exception for a value
      that a person can paste once per device. */
export type CloudConfig={
 url:string;
 anonKey:string;
 /* One shared shop login, as agreed: three people now, forty later. */
 email:string;
 /* Whose initials go on every row this device writes. A shared login means the
    database cannot tell you who changed a bus, so the row has to say. Required,
    not optional — attribution nobody filled in is worse than none, because it
    looks like an answer. */
 initials:string;
 /* Which phone or iPad this is, for reading a backup back off the right one. */
 deviceLabel:string;
};

export const EMPTY_CLOUD_CONFIG:CloudConfig={url:"",anonKey:"",email:"",initials:"",deviceLabel:""};

function clean(value:unknown){return String(value??"").trim()}

export function normalizeCloudConfig(value:unknown):CloudConfig{
 if(!value||typeof value!=="object")return EMPTY_CLOUD_CONFIG;
 const raw=value as Record<string,unknown>;
 return {
  url:clean(raw.url).replace(/\/+$/,""),
  anonKey:clean(raw.anonKey),
  email:clean(raw.email).toLowerCase(),
  /* Initials are shouted on every screen in this app, so they are stored the
     way they are shown. Capped because a name is not initials. */
  initials:clean(raw.initials).toUpperCase().slice(0,6),
  deviceLabel:clean(raw.deviceLabel).slice(0,40),
 };
}

/* A URL that is not a Supabase project URL is the single most likely thing to
   be pasted into that box, and finding out at sign-in produces an error nobody
   can act on. Checked here instead, where the message can name the field. */
export function cloudConfigProblem(config:CloudConfig):string{
 if(!config.url)return "Paste the Project URL from Supabase.";
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in|net)$/i.test(config.url))
  return "That does not look like a Supabase Project URL. It ends in .supabase.co";
 if(!config.anonKey)return "Paste the anon public key from Supabase.";
 if(config.anonKey.length<40)return "That anon key looks too short to be complete.";
 if(!config.email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email))return "Enter the shop sign-in email.";
 if(!config.initials)return "Enter your initials. Every change this device sends is signed with them.";
 return "";
}
export function cloudConfigReady(config:CloudConfig){return cloudConfigProblem(config)===""}

export function readCloudConfig(storage:StorageReader):CloudConfig{
 try{
  const raw=storage.getItem(CLOUD_CONFIG_STORAGE_KEY);
  return raw?normalizeCloudConfig(JSON.parse(raw)):EMPTY_CLOUD_CONFIG;
 }catch{return EMPTY_CLOUD_CONFIG}
}

export function writeCloudConfig(storage:StorageWriter,config:CloudConfig){
 try{storage.setItem(CLOUD_CONFIG_STORAGE_KEY,JSON.stringify(normalizeCloudConfig(config)));return true}
 catch{return false}
}

/* What the status line reports. Deliberately a description of what happened,
   never a switch: a mechanic cannot make the wifi work by flipping something,
   and a control that implies he can is a lie. There is no OFFLINE/ONLINE
   setting anywhere in this module for the same reason — a switch is a thing
   somebody leaves in the wrong position, and then a week of work quietly stops
   syncing and nobody finds out until they need it. */
export type CloudPhase="unconfigured"|"signed-out"|"idle"|"syncing"|"offline"|"error";

export type CloudState={
 phase:CloudPhase;
 lastSyncedAt:string;
 lastError:string;
 /* Rows this device has changed and not yet got up. Zero means everything on
    this phone is also on the server. */
 pending:number;
};

export const EMPTY_CLOUD_STATE:CloudState={phase:"unconfigured",lastSyncedAt:"",lastError:"",pending:0};

const PHASES:CloudPhase[]=["unconfigured","signed-out","idle","syncing","offline","error"];

export function normalizeCloudState(value:unknown):CloudState{
 if(!value||typeof value!=="object")return EMPTY_CLOUD_STATE;
 const raw=value as Record<string,unknown>;
 const pending=Number(raw.pending);
 return {
  phase:PHASES.includes(raw.phase as CloudPhase)?raw.phase as CloudPhase:"unconfigured",
  lastSyncedAt:clean(raw.lastSyncedAt),
  lastError:clean(raw.lastError),
  pending:Number.isFinite(pending)&&pending>0?Math.round(pending):0,
 };
}

export function readCloudState(storage:StorageReader):CloudState{
 try{
  const raw=storage.getItem(CLOUD_STATE_STORAGE_KEY);
  return raw?normalizeCloudState(JSON.parse(raw)):EMPTY_CLOUD_STATE;
 }catch{return EMPTY_CLOUD_STATE}
}

export function writeCloudState(storage:StorageWriter,state:CloudState){
 try{storage.setItem(CLOUD_STATE_STORAGE_KEY,JSON.stringify(normalizeCloudState(state)));return true}
 catch{return false}
}

function clockLabel(value:string){
 const at=new Date(value);
 if(Number.isNaN(at.getTime()))return "";
 return at.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});
}

/* One line, in the words a foreman would use. "Offline" here means the last
   attempt did not reach the server — not that a flag somewhere says so. */
export function cloudStatusLabel(state:CloudState):string{
 const waiting=state.pending===1?"1 change waiting":state.pending+" changes waiting";
 if(state.phase==="unconfigured")return "Not connected";
 if(state.phase==="signed-out")return "Signed out";
 if(state.phase==="syncing")return "Syncing…";
 if(state.phase==="offline")return state.pending?"Offline — "+waiting:"Offline";
 if(state.phase==="error")return state.lastError||"Sync problem";
 if(state.pending)return waiting;
 const at=clockLabel(state.lastSyncedAt);
 return at?"Synced "+at:"Connected";
}

/* Whether a failure means "the network is not there" or "something is actually
   wrong", because those want different words and different behaviour: the first
   is normal and self-correcting, the second needs a person.

   navigator.onLine is deliberately not consulted. It only says the wifi is
   associated, so shop wifi that is up but has no route to the internet reports
   true — and a sync built on it insists it is online while every push fails. The
   honest signal is whether the last request actually completed. */
export function cloudFailurePhase(error:unknown):CloudPhase{
 const message=(error instanceof Error?error.message:String(error??"")).toLowerCase();
 if(!message)return "error";
 if(/failed to fetch|network|networkerror|load failed|timeout|timed out|econnrefused|enotfound|dns|unreachable|offline|aborted/.test(message))return "offline";
 if(/invalid login|invalid credentials|email not confirmed|jwt|token|unauthorized|401|403/.test(message))return "signed-out";
 return "error";
}

export function cloudFailureMessage(error:unknown):string{
 const phase=cloudFailurePhase(error);
 if(phase==="offline")return "";
 if(phase==="signed-out")return "Sign in again";
 const raw=error instanceof Error?error.message:String(error??"");
 return raw.slice(0,90)||"Sync problem";
}

/* ------------------------------------------------------------------ rows */

/* The map's own fields, and only those. Three groups are held out on purpose.

   `defects` and `pendingRepair` belong to the Defect Log and travel as their own
   rows, so two mechanics logging two faults on one bus in the same hour both
   keep theirs instead of one overwriting a whole array.

   `down`, `onDownSheet` and `downSheetReady` are the Down Sheet's, and no map
   record may assert them. The buses table has no column to write them to, which
   is the same rule enforced one level further down. To move down status, move
   the Down Sheet.

   `id` is held out because it is this device's name for the bus and means
   nothing on another one. Fleet number is what both devices agree on. */
const MAP_HELD_BACK=["id","n","l","s","defects","pendingRepair","down","onDownSheet","downSheetReady"];

const KNOWN_STATUS=["service","defect","shop","out","decommissioned","unknown"];

export type SyncBus={id?:string;n?:string;l?:string;s?:string;defects?:StructuredDefect[];[key:string]:unknown};

export type CloudRow=Record<string,unknown>;

/* A bus record carries no updatedAt of its own, so one is derived from the
   stamps it does keep. This matters more than it looks: updated_at is what the
   database compares to drop an out-of-order push, so sending "now" for every
   bus would mean the last device to sync always wins, even when it is the one
   holding week-old data. */
export function busUpdatedAt(bus:SyncBus,fallback:string):string{
 const stamps=[bus.lastLocationChangeAt,bus.lastStatusChangeAt,bus.parkedAt]
  .map(value=>clean(value))
  .filter(value=>value!==""&&!Number.isNaN(new Date(value).getTime()));
 if(!stamps.length)return fallback;
 const latest=stamps.reduce((best,value)=>Date.parse(value)>Date.parse(best)?value:best);
 /* Never later than now. updated_at is what the database compares to drop an
    out-of-order push, so a phone whose clock is a year fast would stamp every
    bus a year ahead and every other device's work would be silently discarded
    from then on — with nothing on any screen to say why. A wrong clock should
    cost that one device its ordering, not lock the whole shop out. */
 return Date.parse(latest)>Date.parse(fallback)?fallback:latest;
}

function signature(config:CloudConfig){
 return {updated_by:config.initials,device_label:config.deviceLabel};
}

export function busRow(bus:SyncBus,config:CloudConfig,now:string):CloudRow|null{
 const fleetNumber=clean(bus.n);
 if(!fleetNumber)return null;
 const mapFields:Record<string,unknown>={};
 for(const [key,value] of Object.entries(bus))if(!MAP_HELD_BACK.includes(key))mapFields[key]=value;
 const status=clean(bus.s);
 return {
  fleet_number:fleetNumber,
  location:clean(bus.l),
  status:KNOWN_STATUS.includes(status)?status:"unknown",
  map_fields:mapFields,
  updated_at:busUpdatedAt(bus,now),
  ...signature(config),
 };
}

/* Everything the record carries that is not filtered on rides in `detail`, so a
   field added to a defect next month reaches the other devices without a
   database migration. */
const DEFECT_COLUMNS=["id","category","issue","state","operability","details","createdAt","completedAt","completedBy"];

export function defectRow(defect:StructuredDefect,fleetNumber:string,config:CloudConfig,now:string):CloudRow|null{
 const defectId=clean(defect?.id);
 if(!defectId||!fleetNumber)return null;
 const detail:Record<string,unknown>={};
 for(const [key,value] of Object.entries(defect))if(!DEFECT_COLUMNS.includes(key))detail[key]=value;
 return {
  defect_id:defectId,
  fleet_number:fleetNumber,
  /* Stored exactly as written. The catalog's renames are read-time by design —
     a defect saved as "System Switches - C/S adjuster switch" still reads as
     the new wording — and normalizing on the way in would throw away the one
     thing that makes those renames safe. */
  category:clean(defect.category),
  issue:clean(defect.issue),
  state:clean(defect.state),
  operability:clean(defect.operability),
  details:clean(defect.details),
  reported_at:clean(defect.createdAt)||null,
  completed_at:clean(defect.completedAt)||null,
  completed_by:clean(defect.completedBy),
  detail,
  updated_at:clean(defect.updatedAt)||clean(defect.createdAt)||now,
  ...signature(config),
 };
}

/* `updatedBy` is deliberately NOT in this list, so it rides in `detail` and
   survives a round trip. The row's own `updated_by` column names the device
   that last PUSHED the entry, which is a different fact from who last worked
   on the repair, and overwriting one with the other would quietly reassign
   somebody's work to whoever synced last. */
const ENTRY_COLUMNS=["id","busId","busNumber","category","repair","section","workflow","shift","priority",
 "operationalStatus","assignmentType","assignedTo","createdAt","completedAt","updatedAt"];

export type SyncEntry={id?:string;busNumber?:string;[key:string]:unknown};

export function downSheetRow(entry:SyncEntry,config:CloudConfig,now:string):CloudRow|null{
 const entryId=clean(entry?.id),fleetNumber=clean(entry?.busNumber);
 if(!entryId||!fleetNumber)return null;
 const detail:Record<string,unknown>={};
 for(const [key,value] of Object.entries(entry))if(!ENTRY_COLUMNS.includes(key))detail[key]=value;
 return {
  entry_id:entryId,
  /* By fleet number, never by busId. An entry points at a bus using the SENDING
     device's id, and the receiving device may call that bus something else. */
  fleet_number:fleetNumber,
  category:clean(entry.category),
  repair:clean(entry.repair),
  section:clean(entry.section),
  workflow:clean(entry.workflow),
  shift:clean(entry.shift),
  priority:clean(entry.priority)||"Routine",
  operational_status:clean(entry.operationalStatus)||"unknown",
  assignment_type:clean(entry.assignmentType),
  assigned_to:clean(entry.assignedTo),
  entry_created_at:clean(entry.createdAt)||null,
  completed_at:clean(entry.completedAt)||null,
  detail,
  updated_at:clean(entry.updatedAt)||now,
  ...signature(config),
 };
}

/* --------------------------------------------------------------- changes */

/* Pushing the whole board on every save would mean a few hundred kilobytes up
   the wire every time somebody drags one bus, on a phone that may be on its
   owner's own data plan. So each row is fingerprinted and only the changed ones
   go.

   FNV-1a over the row's own JSON: small, stable, and it does not need to be
   cryptographic — it is answering "did this change since I last sent it", where
   a collision costs one skipped update and never corrupts anything. */
/* Sorted DEEPLY and by hand, not by handing the key list to JSON.stringify.

   That shortcut looks like it only orders keys. It does not: an array replacer
   is a recursive property allowlist, so every nested object gets filtered
   against the TOP-LEVEL key names and `map_fields` and `detail` both serialize
   as `{}`. Everything a mechanic changes without moving the bus lives in
   map_fields — the assigned mechanic, check engine, no horn, the odometer
   reading — so two rows differing only in that work hashed identically, the
   change was never sent, and the status line said "Synced" with nothing
   waiting. Work that is only on a phone while the app says it is safe is the
   worst failure this module can have. */
function stable(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==="object")
  return Object.keys(value as Record<string,unknown>).sort()
   .map(key=>[key,stable((value as Record<string,unknown>)[key])]);
 return value;
}

export function rowFingerprint(row:CloudRow):string{
 const text=JSON.stringify(stable(row));
 let hash=0x811c9dc5;
 for(let index=0;index<text.length;index++){
  hash^=text.charCodeAt(index);
  hash=Math.imul(hash,0x01000193)>>>0;
 }
 return hash.toString(36);
}

export type SentFingerprints=Record<string,string>;

export function readSentFingerprints(storage:StorageReader):SentFingerprints{
 try{
  const raw=storage.getItem(CLOUD_SENT_STORAGE_KEY);
  const parsed=raw?JSON.parse(raw):null;
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return {};
  const out:SentFingerprints={};
  for(const [key,value] of Object.entries(parsed as Record<string,unknown>))
   if(typeof value==="string")out[key]=value;
  return out;
 }catch{return {}}
}

export function writeSentFingerprints(storage:StorageWriter,fingerprints:SentFingerprints){
 try{storage.setItem(CLOUD_SENT_STORAGE_KEY,JSON.stringify(fingerprints));return true}
 catch{return false}
}

/* Defect records this device folded into another, and when.

   A push only ever sends what a bus still carries, so a record merged away is
   simply not sent — it is not removed anywhere. The row stays live on the
   server, the next GET THE SHOP'S COPY reads it back, and the merge takes
   incoming records it does not have, so all of it returns. The cleanup would
   undo itself on the very next sync, on the device that ran it.

   Hence a ledger. It does two jobs, and both are needed: this device stops
   accepting those records back, and the server is told they are gone, so the
   other devices stop being sent them. It is kept rather than cleared once
   pushed, because a device that is offline for a week will still hand back the
   records it has when it reconnects, and this is what refuses them. */
export const CLOUD_MERGED_STORAGE_KEY="pace-cloud-merged-v1";

export type MergedAwayDefects=Record<string,string>;

export function readMergedAway(storage:StorageReader):MergedAwayDefects{
 try{
  const raw=storage.getItem(CLOUD_MERGED_STORAGE_KEY);
  const parsed=raw?JSON.parse(raw):null;
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))return {};
  const out:MergedAwayDefects={};
  for(const [key,value] of Object.entries(parsed as Record<string,unknown>))
   if(typeof value==="string")out[key]=value;
  return out;
 }catch{return {}}
}

export function writeMergedAway(storage:StorageWriter,merged:MergedAwayDefects){
 try{storage.setItem(CLOUD_MERGED_STORAGE_KEY,JSON.stringify(merged));return true}
 catch{return false}
}

/* Tombstones for the records this device merged away.

   Only the key, the tombstone and the signature. Writing the record's own
   fields back while deleting it would let a stale copy of a repair overwrite
   the version that survived. */
export function mergedAwayRows(merged:MergedAwayDefects,config:CloudConfig,now:string):CloudRow[]{
 return Object.entries(merged).map(([defectId,at])=>({
  defect_id:defectId,
  deleted_at:at||now,
  updated_at:at||now,
  ...signature(config),
 }));
}

/* An incoming payload with the merged-away records taken out.

   The tombstone push handles the server, but not a second device that still
   holds its own copy and pushes it back before anybody presses MERGE DUPES
   there. This is the belt to that braces: whatever arrives, a record this
   device has already folded away does not come back. */
export function withoutMergedAway<P extends {buses?:{defects?:unknown}[]}|null|undefined>(
 payload:P,merged:MergedAwayDefects
):P{
 if(!payload||!Array.isArray(payload.buses)||!Object.keys(merged).length)return payload;
 return {...payload,buses:payload.buses.map(bus=>{
  const defects=Array.isArray(bus?.defects)?bus.defects as {id?:string}[]:null;
  if(!defects)return bus;
  const kept=defects.filter(defect=>!merged[String(defect?.id??"")]);
  return kept.length===defects.length?bus:{...bus,defects:kept};
 })} as P;
}

export function changedRows(rows:CloudRow[],key:string,sent:SentFingerprints){
 const next:SentFingerprints={},changed:CloudRow[]=[];
 for(const row of rows){
  const id=String(row[key]??"");
  if(!id)continue;
  const print=rowFingerprint(row);
  next[id]=print;
  if(sent[id]!==print)changed.push(row);
 }
 return {changed,fingerprints:next};
}

/* ----------------------------------------------------------------- pulls */

/* Rows come back as the very same payload shape a device-to-device transfer
   file has, so a pull can hand them to mergeDefectLog, mergeFleetMap and
   mergeDownSheet unchanged.

   This is the whole point. Those merge rules were argued out against real buses
   and one expensive bug — incoming wins where two devices describe the same
   thing, anything only the receiver has is kept, the map never asserts down
   status, and a bus is found by fleet number. Writing a second set of rules for
   the cloud would mean two things that must agree forever and will not. */
export function fleetMapPayload(rows:CloudRow[],exportedAt:string){
 return {
  kind:"pace-south-fleet-map-transfer",
  version:1,
  exportedAt,
  buses:rows.map(row=>({
   ...(row.map_fields&&typeof row.map_fields==="object"?row.map_fields as Record<string,unknown>:{}),
   /* A bus the receiving device has never seen is ADDED by mergeFleetMap, and
      it needs a name of its own: a record with no id cannot be edited, moved or
      pointed at by a Down Sheet entry. Derived from the fleet number so a
      second pull cannot mint a second id for the same bus. A device that
      already has this bus keeps its own id — the merge holds it deliberately. */
   id:"cloud-"+String(row.fleet_number??""),
   n:String(row.fleet_number??""),
   l:String(row.location??""),
   s:String(row.status??"unknown"),
  })),
 };
}

export function defectLogPayload(rows:CloudRow[],exportedAt:string){
 const byBus=new Map<string,StructuredDefect[]>();
 for(const row of rows){
  const fleetNumber=String(row.fleet_number??"");
  if(!fleetNumber)continue;
  const detail=row.detail&&typeof row.detail==="object"?row.detail as Record<string,unknown>:{};
  const defect={
   ...detail,
   id:String(row.defect_id??""),
   category:String(row.category??""),
   issue:String(row.issue??""),
   state:String(row.state??""),
   operability:String(row.operability??""),
   details:String(row.details??""),
   createdAt:row.reported_at?String(row.reported_at):"",
   completedAt:row.completed_at?String(row.completed_at):"",
   completedBy:String(row.completed_by??""),
   updatedAt:String(row.updated_at??""),
  } as unknown as StructuredDefect;
  const list=byBus.get(fleetNumber)||[];
  list.push(defect);
  byBus.set(fleetNumber,list);
 }
 return {
  kind:"pace-south-defect-log-transfer",
  version:1,
  exportedAt,
  buses:[...byBus.entries()].map(([fleetNumber,defects])=>({n:fleetNumber,defects})),
 };
}

export function downSheetPayload(rows:CloudRow[],exportedAt:string){
 return {
  kind:"pace-south-down-sheet-transfer",
  version:1,
  exportedAt,
  entries:rows.map(row=>{
   const detail=row.detail&&typeof row.detail==="object"?row.detail as Record<string,unknown>:{};
   return {
    ...detail,
    id:String(row.entry_id??""),
    /* Left blank on purpose. mergeDownSheet re-points it by fleet number
       against the receiving device's own buses, which is what makes the order
       of a map and a sheet arriving stop mattering. */
    busId:"",
    busNumber:String(row.fleet_number??""),
    category:String(row.category??""),
    repair:String(row.repair??""),
    section:String(row.section??""),
    workflow:String(row.workflow??""),
    shift:String(row.shift??""),
    priority:String(row.priority??"Routine"),
    operationalStatus:String(row.operational_status??"unknown"),
    assignmentType:String(row.assignment_type??""),
    assignedTo:String(row.assigned_to??""),
    createdAt:row.entry_created_at?String(row.entry_created_at):"",
    completedAt:row.completed_at?String(row.completed_at):"",
    updatedAt:String(row.updated_at??""),
    /* The entry's own author, kept in detail, wins over the device that pushed
       it. Falls back to the pusher only for a row written before this was. */
    updatedBy:String(detail.updatedBy??row.updated_by??""),
   };
  }),
 };
}
