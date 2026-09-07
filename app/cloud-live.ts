/* Live sync: the shop's changes arriving without anybody pressing anything.

   Two pieces live here, both deliberately free of React and of the network so
   they can be tested against real payloads.

   The design rule this follows is the one already written into cloud-sync.ts:
   there is exactly one set of merge rules, argued out against real buses and one
   expensive bug, and the cloud does not get a second set. So realtime is a
   SIGNAL, never a transport. A change notification says "the shop has news"; the
   news is then fetched and merged down the same path GET THE SHOP'S COPY uses.
   Nothing here decides what a merge means. */

import {mergeDefectLog,mergeDownSheet,mergeFleetMap} from "./section-transfer.ts";
import {reconcileDownSheetMembership} from "./down-sheet-counter.ts";
import {readDownSheetStorage,readFleetStorage,writeDownSheetStorage,writeFleetStorage,DOWN_SHEET_STORAGE_KEY,FLEET_STORAGE_KEY} from "./storage.ts";

export const LIVE_TABLES=["buses","bus_defects","down_sheet_entries"] as const;

/* How long to wait after the first notification before syncing.

   One device pressing SEND MY CHANGES produces a burst — a hundred rows across
   three tables arrive as a hundred notifications. Syncing on each would be a
   hundred full pulls. Waiting a moment turns the burst into one. */
export const LIVE_DEBOUNCE_MS=1500;

export type LiveChange={table:string;deviceLabel:string};

/* Whether a notification is worth acting on.

   A device hears its own writes come back. Merging them is harmless — incoming
   equals what we already have, so the merge is identity — but it is a pointless
   round trip on every push, and on a phone that is somebody's data plan. The row
   carries the label of the device that wrote it, so our own echo is skipped.

   Two devices sharing a label is the one case this gets wrong, and it gets it
   wrong in the safe direction: the change is ignored, and the next sweep or the
   next notification from a differently-named device brings it in anyway. */
export function shouldSyncForChange(change:LiveChange,deviceLabel:string){
 if(!LIVE_TABLES.includes(change.table as typeof LIVE_TABLES[number]))return false;
 const mine=String(deviceLabel||"").trim().toLowerCase();
 const theirs=String(change.deviceLabel||"").trim().toLowerCase();
 if(!mine||!theirs)return true;
 return mine!==theirs;
}

/* Tell THIS tab that storage changed.

   Every page in this app already listens for `storage` to pick up another tab's
   work — the map, the Defect Log, the Down Sheet, Fixed Repairs, the lists page
   and the deferred badge all have the handler. But the browser fires `storage`
   only for OTHER tabs, so a merge performed in this tab is invisible to the page
   sitting in front of the user: the board would be right on disk and stale on
   screen until a reload.

   Dispatching the event ourselves makes a same-tab write look like what it
   actually is to the page — the data underneath changed — and every one of those
   handlers does the correct thing already. That is the whole reason live sync
   needed no change to any page's own code.

   Only the cloud merge calls this. Making every local write announce itself
   would feed each page its own writes back and invite a loop. */
export function announceStoredChange(key:string,value:string|null){
 if(typeof window==="undefined")return false;
 try{
  window.dispatchEvent(new StorageEvent("storage",{key,newValue:value,storageArea:window.localStorage}));
  return true;
 }catch{
  /* Some older WebKit cannot construct a StorageEvent. The merge still landed;
     the screen catches up on the next navigation rather than immediately. */
  return false;
 }
}

export type CloudPullPayload={map:unknown;defects:unknown;sheet:unknown;deleted?:Record<string,string>;removedEntries?:Record<string,string>};
export type ApplyResult={ok:boolean;error:string;dropped:number;droppedEntries:number};

type LiveStorage=Storage;

type TombstoneBus={defects?:unknown};

/* Only the four fields this module reasons about. The entry's real shape lives
   on the Down Sheet page and is nobody else's business here. */
type DownEntryShape={id?:string;busId?:string;workflow?:string;updatedAt?:string;createdAt?:string};

/* Take off this device the records the shop has removed.

   A pull returns live rows only, and the merge keeps whatever the receiver
   alone holds — so a record removed on the phone stayed on the iPad for good,
   with the iPad pushing its copy back up every sweep (harmlessly: the server
   keeps the newest write and the tombstone is newer). Now the tombstones come
   down as ids, and a record this device holds under one of them is dropped —
   UNLESS this device's copy is newer than the deletion. Work done on a record
   after somebody else removed it is real work, and it is what wins: the copy
   stays, its next push resurrects the row, and the removal is undone
   everywhere, which is the honest outcome when two people disagreed. */
export function dropTombstonedDefects<T extends TombstoneBus>(buses:T[],deleted:Record<string,string>|undefined):{buses:T[];dropped:string[]}{
 const dropped:string[]=[];
 if(!deleted||!Object.keys(deleted).length)return {buses,dropped};
 const next=buses.map(bus=>{
  const defects=Array.isArray(bus.defects)?bus.defects as {id?:string;updatedAt?:string;createdAt?:string}[]:[];
  const kept=defects.filter(defect=>{
   const id=String(defect?.id??""),at=id?deleted[id]:undefined;
   if(!at)return true;
   const mine=Date.parse(String(defect?.updatedAt||defect?.createdAt||""));
   if(Number.isFinite(mine)&&mine>Date.parse(at))return true;
   dropped.push(id);
   return false;
  });
  return kept.length===defects.length?bus:{...bus,defects:kept} as T;
 });
 return {buses:next,dropped};
}

/* Take off this device the Down Sheet entries the shop has taken off.

   Exactly the job dropTombstonedDefects does one table over, and the Down Sheet
   needed it more: mergeDownSheet ADDS every incoming entry the receiver lacks,
   so a sheet cleared on the phone came straight back on the next pull, along
   with every sheet before it. The count a mechanic reads off the top of the page
   was the sum of nine days of sheets rather than the buses actually down.

   Same tie-break as the defects, for the same reason: an entry this device has
   touched SINCE the removal stays. Somebody working a repair after somebody else
   cleared the sheet did real work, and it is the work that wins — its next push
   puts the entry back for everyone, which is the honest outcome when two people
   disagreed about whether a bus was still down. */
export function dropTombstonedEntries<T extends {id?:string;updatedAt?:string;createdAt?:string}>(
 entries:T[],removed:Record<string,string>|undefined
):{entries:T[];dropped:string[]}{
 const dropped:string[]=[];
 if(!removed||!Object.keys(removed).length)return {entries,dropped};
 const kept=entries.filter(entry=>{
  const id=String(entry?.id??""),at=id?removed[id]:undefined;
  if(!at)return true;
  const mine=Date.parse(String(entry?.updatedAt||entry?.createdAt||""));
  if(Number.isFinite(mine)&&mine>Date.parse(at))return true;
  dropped.push(id);
  return false;
 });
 return {entries:kept.length===entries.length?entries:kept,dropped};
}

/* The merge half of a pull, shared by the button and by live sync so the two can
   never drift. Everything it refuses, it refuses without changing anything. */
export function applyCloudPull(storage:LiveStorage,result:CloudPullPayload,announce=announceStoredChange):ApplyResult{
 const fleet=readFleetStorage<Record<string,unknown>>(storage);
 if(!fleet.valid)return {ok:false,error:"This device's board could not be read",dropped:0,droppedEntries:0};
 const afterMap=mergeFleetMap(fleet.buses,result.map as never);
 const afterDefects=mergeDefectLog(afterMap.buses,result.defects as never);
 const afterTombstones=dropTombstonedDefects(afterDefects.buses,result.deleted);

 /* The sheet is merged BEFORE the board is written, though it is saved second,
    because the board's `down` flags have to be reconciled against the sheet
    this pull actually settled on.

    Leaving that to the Down Sheet page is what the code did, and it is why
    clearing the sheet did not stay cleared. A bus left marked down with no entry
    behind it is not inert: entriesFromFleet mints a BRAND NEW entry for it the
    next time that page loads — under an id nothing has ever tombstoned — so a
    removal that had just travelled correctly came straight back wearing a
    different name. That is the "26 other buses" message on an empty sheet.

    The rule is the schema's own: the Down Sheet says which buses are down and
    the map reads it back. Enforced here so it holds on whichever page happens to
    be open when the pull lands. */
 const sheet=readDownSheetStorage<DownEntryShape>(storage);
 const afterSheet=mergeDownSheet(sheet.valid?sheet.entries:[],result.sheet as never,afterTombstones.buses);
 /* AFTER the merge, not before: the entries that have to go are the ones the
    merge would otherwise have just put back. Taking them out of the incoming
    payload alone is not enough — the receiver's own stale copy is the other
    half, and the merge keeps whatever only the receiver has. */
 const afterRemovals=dropTombstonedEntries(afterSheet.entries as DownEntryShape[],result.removedEntries);
 const activeBusIds=afterRemovals.entries.filter(entry=>entry.workflow!=="Completed").map(entry=>String(entry.busId??""));
 const reconciled=reconcileDownSheetMembership(afterTombstones.buses as (Record<string,unknown>&{id:string;down?:boolean})[],activeBusIds);

 /* allowBulkDefectLoss stays false for a merge: a merge is never a reason to
    accept a write the guard thinks is destructive, and live sync runs
    unattended — there is nobody watching to notice. A merge cannot lose a
    record, so the only way this write ends with fewer is the tombstones, and
    those are a person's confirmed removal on another device — the one loss
    that is meant to reach here. The guard is lifted exactly then, and the
    recovery snapshot is still taken first, so RESTORE LAST GOOD COPY stands
    behind it. */
 if(!writeFleetStorage(storage,reconciled,{allowBulkDefectLoss:afterTombstones.dropped.length>0}))
  return {ok:false,error:"The merged board could not be saved",dropped:0,droppedEntries:0};
 announce(FLEET_STORAGE_KEY,storage.getItem(FLEET_STORAGE_KEY));
 writeDownSheetStorage(storage,afterRemovals.entries);
 announce(DOWN_SHEET_STORAGE_KEY,storage.getItem(DOWN_SHEET_STORAGE_KEY));
 return {ok:true,error:"",dropped:afterTombstones.dropped.length,droppedEntries:afterRemovals.dropped.length};
}
