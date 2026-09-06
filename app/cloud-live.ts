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

export type CloudPullPayload={map:unknown;defects:unknown;sheet:unknown};
export type ApplyResult={ok:boolean;error:string};

type LiveStorage=Storage;

/* The merge half of a pull, shared by the button and by live sync so the two can
   never drift. Everything it refuses, it refuses without changing anything. */
export function applyCloudPull(storage:LiveStorage,result:CloudPullPayload,announce=announceStoredChange):ApplyResult{
 const fleet=readFleetStorage<Record<string,unknown>>(storage);
 if(!fleet.valid)return {ok:false,error:"This device's board could not be read"};
 const afterMap=mergeFleetMap(fleet.buses,result.map as never);
 const afterDefects=mergeDefectLog(afterMap.buses,result.defects as never);
 /* allowBulkDefectLoss stays false. A merge is never a reason to accept a write
    the guard thinks is destructive, and live sync runs unattended — there is
    nobody watching to notice. */
 if(!writeFleetStorage(storage,afterDefects.buses,{allowBulkDefectLoss:false}))
  return {ok:false,error:"The merged board could not be saved"};
 announce(FLEET_STORAGE_KEY,storage.getItem(FLEET_STORAGE_KEY));
 const sheet=readDownSheetStorage<{id?:string}>(storage);
 const afterSheet=mergeDownSheet(sheet.valid?sheet.entries:[],result.sheet as never,afterDefects.buses);
 writeDownSheetStorage(storage,afterSheet.entries);
 announce(DOWN_SHEET_STORAGE_KEY,storage.getItem(DOWN_SHEET_STORAGE_KEY));
 return {ok:true,error:""};
}
