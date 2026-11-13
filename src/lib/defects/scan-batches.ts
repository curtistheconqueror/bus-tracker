/* Taking a whole scan back out of the Defect Log.

   On Sep 6 the photo of a Vehicle Down Sheet went through SCAN SWEEP instead of
   SCAN SHEET. The sweep scanner read bus numbers off it, called each one a
   Tech Services fault, and FILE APPROVED put 24 records on 23 buses in one
   press. The log went from 178 active defects to 202 and nothing on it said
   which 24 were the mistake.

   Exporting the other device's log and importing it did not remove them, and
   that is by design rather than by accident: a Defect Log import KEEPS every
   record only the receiving device has, because the alternative — an import
   deleting repairs the sender never saw — is the data loss the merge rules
   exist to prevent. An import can never be the way to take records out.

   They can be found, though, and found exactly. Everything a sweep files in
   one press shares ONE creation stamp — the page takes the clock once and hands
   the same value to every record — and every id it mints begins with "sweep-".
   That pair is the fingerprint: a batch is the set of sweep records created at
   the same instant, and there is no other way to get two records with that
   stamp. The 24 carry 2026-09-06T23:30 to the millisecond, and no honest
   record does.

   Two rules, both in the service of never deleting a real repair:

   1. ONLY WHAT NOBODY HAS TOUCHED. A record from the batch that has since been
      marked fixed, deferred, put in progress, ticked, or written on is a record
      somebody looked at and decided was real. It stays, and the removal says so.

   2. THE WAY BACK IS KEPT. What was removed is written down, so it can be put
      back — from the Defect Log, or by the operator — and the records that
      return are stamped as new work so the shop cloud accepts them back over
      the tombstones the removal sent. */

import {defectSummary,isUnresolved,normalizeDefects,repairIdentityKey,type StructuredDefect} from "./repair-catalog.ts";
import {statusAfterDefectChange,type DefectLogFleetBus} from "./defect-log-sync.ts";

export type ScanBatchBus={id:string;n:string;defects?:unknown;pendingRepair?:string};

/* Which scanner filed the batch. A stamp belongs to one press and one press is
   one scanner, so a batch has exactly one. */
export type ScanBatchKind="sweep"|"heat";

export type ScanBatch={
 kind:ScanBatchKind;
 /* The shared creation stamp. Unique to the batch, and the thing a person can
    be shown: "the sweep filed at 6:30 PM". */
 key:string;
 filedAt:string;
 ids:string[];
 /* The subset a removal will actually take out. */
 removableIds:string[];
 keptIds:string[];
 busNumbers:string[];
 checkedBy:string[];
};

export type RemovedScanRecord={busId:string;busNumber:string;defect:StructuredDefect};

/* What a scan's ids begin with — see sweepDefect in sweep-scan-import.ts.
   Two scanners mint it: the farebox / Ventra sweep, and the heat check sheet. */
export const SCAN_BATCH_ID_PREFIX="sweep-";

/* THE HEAT SHEET'S IDS SIT INSIDE THE SWEEP PREFIX, ON PURPOSE.

   A photographed heat sheet can file sixty records in one press, and the way to
   take a wrong scan back out is this module. Giving it a prefix of its own
   would have meant a second finder, a second remover and a second undo, or no
   way back at all — so its ids begin "sweep-heat-", every function here finds
   them unchanged, and `kind` is how anything that DESCRIBES a batch tells the
   two apart.

   That last part is not optional, and a cold read found it missing: with only
   the shared prefix, the operator offered to "remove the 41 Tech Services
   records SCAN SWEEP filed" about forty-one No Heat records SCAN SWEEP had
   never seen. A batch that can be removed has to be named truthfully first.

   A fleet number is digits, so no farebox sweep id — "sweep-17510-dt-…" — can
   begin with this. */
export const HEAT_SCAN_ID_PREFIX=SCAN_BATCH_ID_PREFIX+"heat-";

/* The words for a batch, in one place, so the operator and any screen say the
   same thing about it. */
export function scanBatchWords(batch:Pick<ScanBatch,"kind">){
 return batch.kind==="heat"
  ?{noun:"heat sheet scan",short:"scan",records:"No Heat",filedBy:"the heat sheet scan"}
  :{noun:"scan sweep",short:"sweep",records:"Tech Services",filedBy:"SCAN SWEEP"};
}

function text(value:unknown){return String(value??"").trim()}

/* A stamp in the one spelling this module keys a batch by. The shop cloud hands
   the same moment back as `+00:00` where this device wrote `Z`, and a pull
   replaces only the records it carries — so one press could hold both
   spellings, and keyed by text it became two batches: UNDO LAST found one,
   removed half the scan, and `dropScanChecks`, which has always matched by
   instant, took every check. A stamp that is not a date keys as its own text. */
function stampKey(value:unknown){
 const at=Date.parse(text(value));
 return Number.isNaN(at)?text(value):new Date(at).toISOString();
}

/* Two stamps for one moment. Compared as instants, because the shop cloud hands
   a stamp back spelled its own way — `+00:00` where this device wrote `Z` — and
   a pull replaces the local record with that spelling. Two stamps neither of
   which is a date are the same only when they are the same text. */
function sameInstant(left:unknown,right:unknown){
 const a=Date.parse(text(left)),b=Date.parse(text(right));
 return Number.isNaN(a)||Number.isNaN(b)?text(left)===text(right):a===b;
}

/* A record somebody has worked on since it was filed. Every field here is one
   a person has to act to fill: a state change, a ticked box, a note, a part. A
   freshly filed sweep record has none of them. */
export function touchedScanRecord(defect:StructuredDefect){
 if(defect.state!=="open")return true;
 if(defect.workStates&&Object.values(defect.workStates).some(Boolean))return true;
 if(text(defect.completedAt)||text(defect.deferredAt))return true;
 if([defect.shopNotes,defect.actionTaken,defect.diagnosticNote,defect.finding,defect.partNumber].some(text))return true;
 /* SAVED SINCE IT WAS FILED. A scan stamps `createdAt` and `updatedAt` with the
    one clock it took, so a record whose two stamps differ has been through
    somebody's hands — and the list above cannot see the commonest thing those
    hands do to a heat record, which is narrow it: "No heat" becomes "Heater
    boost pump", a line goes into the details, an estimate is set. None of
    those is a field named here, so a cold read watched an edited record come
    back untouched and get removed with its batch, under a panel promising that
    anything written on stays. Erring this way keeps a record that was only
    re-saved; the other way deletes somebody's diagnosis.

    PUT BACK IS NOT SOMEBODY'S HANDS. It has to restamp `updatedAt` — see
    `restoreScanBatch` — and with only the two stamps to go on, every record it
    returned read as worked on: a scan removed, put back, and then wanted out
    again could not be removed at all, under an alert saying its records had
    been "marked fixed, deferred, ticked or written on" when nobody had opened
    one. So PUT BACK writes the stamp it used into `scanRestoredAt`, and a
    record whose `updatedAt` is still that stamp is as untouched as the day it
    was filed. Any save after that moves `updatedAt` on and leaves the marker
    behind, which is the record being worked on. */
 if(text(defect.createdAt)&&text(defect.updatedAt)&&!sameInstant(defect.updatedAt,defect.createdAt)
  &&!(text(defect.scanRestoredAt)&&sameInstant(defect.updatedAt,defect.scanRestoredAt)))return true;
 if(defect.partsUsed===true||defect.conditionNotDuplicated===true)return true;
 /* MARKED AS TAKING THE BUS OUT OF SERVICE. Both scanners file every record as
    able to run. The OPERATIONAL EFFECT select on the Facility Map's bus card
    changes `operability` and nothing else — no state, no stamp — so a scan
    record somebody had set to "must be removed from service" read as untouched
    and left with its batch, taking the bus's OUT status with it. Read off the
    record rather than fixed by stamping in that card's save: the stamp is what
    the shop cloud orders writes by, and this needs no change to how the map
    saves. */
 if(defect.operability==="down")return true;
 return false;
}

/* Every sweep on this device, newest first. */
export function scanBatches(fleet:ScanBatchBus[]):ScanBatch[]{
 const byStamp=new Map<string,ScanBatch>();
 for(const bus of fleet){
  for(const defect of normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)){
   if(!defect.id.startsWith(SCAN_BATCH_ID_PREFIX))continue;
   if(!text(defect.createdAt))continue;
   const stamp=stampKey(defect.createdAt);
   const batch=byStamp.get(stamp)||{kind:"heat" as ScanBatchKind,key:stamp,filedAt:stamp,ids:[],removableIds:[],keptIds:[],busNumbers:[],checkedBy:[]};
   /* Heat only while EVERY record under the stamp is a heat record. Two
      scanners sharing one millisecond is not a thing that happens, and if it
      ever did, calling the mixture a sweep is the wording that claims less. */
   if(!defect.id.startsWith(HEAT_SCAN_ID_PREFIX))batch.kind="sweep";
   batch.ids.push(defect.id);
   (touchedScanRecord(defect)?batch.keptIds:batch.removableIds).push(defect.id);
   if(!batch.busNumbers.includes(bus.n))batch.busNumbers.push(bus.n);
   const initials=text(defect.reportedBy);
   if(initials&&!batch.checkedBy.includes(initials))batch.checkedBy.push(initials);
   byStamp.set(stamp,batch);
  }
 }
 return [...byStamp.values()]
  .map(batch=>({...batch,busNumbers:[...batch.busNumbers].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))}))
  .sort((a,b)=>b.key.localeCompare(a.key));
}

/* The batch one press filed, found by that press's stamp. By INSTANT: UNDO LAST
   on a heat filing holds the stamp as this device wrote it, and after a pull
   the records carry the cloud's spelling of the same moment. Matched as text,
   the undo answered that the scan was "no longer on this device" while it sat
   on the board in front of whoever pressed it. */
export function findScanBatch(batches:ScanBatch[],stamp:string){
 return batches.find(batch=>batch.key===stampKey(stamp));
}

export function describeScanBatch(batch:ScanBatch,when:(iso:string)=>string=defaultWhen){
 const buses=batch.busNumbers.length;
 return batch.ids.length+(batch.kind==="heat"?" No Heat":"")+" record"+(batch.ids.length===1?"":"s")+" on "+buses+" bus"+(buses===1?"":"es")+" · "+when(batch.filedAt)
  +(batch.checkedBy.length?" · checked by "+batch.checkedBy.join(", "):"")
  +(batch.keptIds.length?" · "+batch.keptIds.length+" worked on since, kept":"");
}

function defaultWhen(iso:string){
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return iso;
 return date.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

/* A bus after records came off it or went back on. The summary line is rebuilt
   from what it now carries, and its status follows by the one rule a save uses
   — `statusAfterDefectChange` says when, and when not. A bus handed in without
   a status or a location (a test's, or a caller that only has the defects) gets
   the defects and the summary and nothing else. */
function settle<T extends ScanBatchBus>(bus:T,before:StructuredDefect[],after:StructuredDefect[],now:string):T{
 const full=bus as unknown as DefectLogFleetBus;
 if(typeof full.s!=="string"||typeof full.l!=="string")return {...bus,defects:after,pendingRepair:defectSummary(after)} as T;
 return statusAfterDefectChange(full,before,after,now) as unknown as T;
}

/* Take one batch out. Only its untouched records go; every other record on
   every bus is exactly as it was, the bus's summary line is rebuilt from what
   is left, and its status follows — filing moved it, so taking the filing back
   moves it back. Returns what was removed so it can be written down. */
export function removeScanBatch<T extends ScanBatchBus>(fleet:T[],key:string,now=new Date().toISOString()):{fleet:T[];removed:RemovedScanRecord[];kept:number;removedAt:string}{
 const removed:RemovedScanRecord[]=[];
 let kept=0;
 const next=fleet.map(bus=>{
  const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  const going=current.filter(defect=>defect.id.startsWith(SCAN_BATCH_ID_PREFIX)&&text(defect.createdAt)&&stampKey(defect.createdAt)===stampKey(key));
  if(!going.length)return bus;
  const goingIds=new Set<string>();
  for(const defect of going){
   if(touchedScanRecord(defect)){kept++;continue}
   goingIds.add(defect.id);
   removed.push({busId:bus.id,busNumber:bus.n,defect});
  }
  if(!goingIds.size)return bus;
  return settle(bus,current,current.filter(defect=>!goingIds.has(defect.id)),now);
 });
 return {fleet:next,removed,kept,removedAt:now};
}

/* The way back, kept on the device so it survives a reload and can be used
   from the map's operator as well as from the Defect Log. One snapshot: the
   last removal. A second removal replaces it, which is the same rule the Down
   Sheet's UNDO CLEAR follows. */
export const SCAN_BATCH_UNDO_KEY="pace-scan-batch-undo-v1";

export type ScanBatchUndo={version:1;removedAt:string;label:string;records:RemovedScanRecord[]};

export function scanBatchUndoSnapshot(removed:RemovedScanRecord[],label:string,now:string):ScanBatchUndo{
 return {version:1,removedAt:now,label,records:removed};
}

export function readScanBatchUndo(raw:string|null):ScanBatchUndo|null{
 if(!raw)return null;
 try{
  const parsed=JSON.parse(raw) as Partial<ScanBatchUndo>;
  if(!parsed||parsed.version!==1||!Array.isArray(parsed.records))return null;
  const records=parsed.records.filter(record=>record&&typeof record==="object"&&text(record.busId)&&record.defect&&typeof record.defect==="object"&&text(record.defect.id)) as RemovedScanRecord[];
  if(!records.length)return null;
  return {version:1,removedAt:text(parsed.removedAt),label:text(parsed.label)||"Removed a scan sweep",records};
 }catch{return null}
}

/* Put a removed batch back on the buses that still exist.

   Each record goes back stamped updatedAt:now. That stamp is not cosmetic. The
   removal told the shop cloud these records were deleted, and the cloud keeps
   the newest write: a record put back with its old stamp would lose to its own
   tombstone and stay gone on every other device. Newer than the tombstone, it
   wins, and the cloud clears the deletion. The same stamp goes into
   `scanRestoredAt`, which is how `touchedScanRecord` tells this from somebody
   editing the record.

   A RECORD THE BUS ALREADY HAS AN OPEN COPY OF DOES NOT GO BACK. The removal's
   own alert says to scan the sheet again, and a scan read after a removal files
   every repair afresh under new ids — so PUT BACK after that, matching on id
   alone, gave each bus the same open repair twice. Matched on the repair, the
   way PATH TO REPAIR names one, and only against what the bus holds now: two
   records returning together are both the scan's and both go back. `duplicate`
   counts what was left off, so the screen can say so. */
export function restoreScanBatch<T extends ScanBatchBus>(fleet:T[],snapshot:ScanBatchUndo,now=new Date().toISOString()):{fleet:T[];restored:number;missing:number;duplicate:number;restoredIds:string[]}{
 const byBus=new Map<string,RemovedScanRecord[]>();
 for(const record of snapshot.records)byBus.set(record.busId,[...(byBus.get(record.busId)||[]),record]);
 const restoredIds:string[]=[];
 let duplicate=0;
 const next=fleet.map(bus=>{
  const returning=byBus.get(bus.id);
  if(!returning)return bus;
  byBus.delete(bus.id);
  const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  const have=new Set(current.map(defect=>defect.id));
  const open=new Set(current.filter(isUnresolved).map(defect=>repairIdentityKey(defect.category,defect.issue)));
  const added:StructuredDefect[]=[];
  for(const record of returning){
   if(have.has(record.defect.id))continue;
   if(open.has(repairIdentityKey(record.defect.category,record.defect.issue))){duplicate++;continue}
   added.push({...record.defect,updatedAt:now,scanRestoredAt:now});
  }
  if(!added.length)return bus;
  restoredIds.push(...added.map(defect=>defect.id));
  return settle(bus,current,[...current,...added],now);
 });
 const missing=[...byBus.values()].reduce((count,records)=>count+records.length,0);
 return {fleet:next,restored:restoredIds.length,missing,duplicate,restoredIds};
}

/* What PUT BACK says about the records it did not return, for both screens
   that can put a scan back. */
export function scanRestoreLeftOff(result:{duplicate:number}){
 return result.duplicate?"; "+result.duplicate+" "+(result.duplicate===1?"was":"were")+" left off because the bus already has that repair open":"";
}
