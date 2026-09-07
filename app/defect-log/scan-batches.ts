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

import {defectSummary,normalizeDefects,type StructuredDefect} from "../repair-catalog.ts";

export type ScanBatchBus={id:string;n:string;defects?:unknown;pendingRepair?:string};

export type ScanBatch={
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

/* What a sweep's ids begin with — see sweepDefect in sweep-scan-import.ts.
   Nothing else in the app mints this prefix. */
export const SCAN_BATCH_ID_PREFIX="sweep-";

function text(value:unknown){return String(value??"").trim()}

/* A record somebody has worked on since it was filed. Every field here is one
   a person has to act to fill: a state change, a ticked box, a note, a part. A
   freshly filed sweep record has none of them. */
export function touchedScanRecord(defect:StructuredDefect){
 if(defect.state!=="open")return true;
 if(defect.workStates&&Object.values(defect.workStates).some(Boolean))return true;
 if(text(defect.completedAt)||text(defect.deferredAt))return true;
 if([defect.shopNotes,defect.actionTaken,defect.diagnosticNote,defect.finding,defect.partNumber].some(text))return true;
 if(defect.partsUsed===true||defect.conditionNotDuplicated===true)return true;
 return false;
}

/* Every sweep on this device, newest first. */
export function scanBatches(fleet:ScanBatchBus[]):ScanBatch[]{
 const byStamp=new Map<string,ScanBatch>();
 for(const bus of fleet){
  for(const defect of normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)){
   if(!defect.id.startsWith(SCAN_BATCH_ID_PREFIX))continue;
   const stamp=text(defect.createdAt);
   if(!stamp)continue;
   const batch=byStamp.get(stamp)||{key:stamp,filedAt:stamp,ids:[],removableIds:[],keptIds:[],busNumbers:[],checkedBy:[]};
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

export function describeScanBatch(batch:ScanBatch,when:(iso:string)=>string=defaultWhen){
 const buses=batch.busNumbers.length;
 return batch.ids.length+" record"+(batch.ids.length===1?"":"s")+" on "+buses+" bus"+(buses===1?"":"es")+" · "+when(batch.filedAt)
  +(batch.checkedBy.length?" · checked by "+batch.checkedBy.join(", "):"")
  +(batch.keptIds.length?" · "+batch.keptIds.length+" worked on since, kept":"");
}

function defaultWhen(iso:string){
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return iso;
 return date.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

/* Take one batch out. Only its untouched records go; everything else on every
   bus is exactly as it was, and the bus's summary line is rebuilt from what is
   left. Returns what was removed so it can be written down. */
export function removeScanBatch<T extends ScanBatchBus>(fleet:T[],key:string,now=new Date().toISOString()):{fleet:T[];removed:RemovedScanRecord[];kept:number;removedAt:string}{
 const removed:RemovedScanRecord[]=[];
 let kept=0;
 const next=fleet.map(bus=>{
  const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  const going=current.filter(defect=>defect.id.startsWith(SCAN_BATCH_ID_PREFIX)&&text(defect.createdAt)===key);
  if(!going.length)return bus;
  const goingIds=new Set<string>();
  for(const defect of going){
   if(touchedScanRecord(defect)){kept++;continue}
   goingIds.add(defect.id);
   removed.push({busId:bus.id,busNumber:bus.n,defect});
  }
  if(!goingIds.size)return bus;
  const defects=current.filter(defect=>!goingIds.has(defect.id));
  return {...bus,defects,pendingRepair:defectSummary(defects)} as T;
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
   wins, and the cloud clears the deletion. */
export function restoreScanBatch<T extends ScanBatchBus>(fleet:T[],snapshot:ScanBatchUndo,now=new Date().toISOString()):{fleet:T[];restored:number;missing:number;restoredIds:string[]}{
 const byBus=new Map<string,RemovedScanRecord[]>();
 for(const record of snapshot.records)byBus.set(record.busId,[...(byBus.get(record.busId)||[]),record]);
 const restoredIds:string[]=[];
 const next=fleet.map(bus=>{
  const returning=byBus.get(bus.id);
  if(!returning)return bus;
  byBus.delete(bus.id);
  const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  const have=new Set(current.map(defect=>defect.id));
  const added=returning.filter(record=>!have.has(record.defect.id)).map(record=>({...record.defect,updatedAt:now}));
  if(!added.length)return bus;
  restoredIds.push(...added.map(defect=>defect.id));
  const defects=[...current,...added];
  return {...bus,defects,pendingRepair:defectSummary(defects)} as T;
 });
 const missing=[...byBus.values()].reduce((count,records)=>count+records.length,0);
 return {fleet:next,restored:restoredIds.length,missing,restoredIds};
}
