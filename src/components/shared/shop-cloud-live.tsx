"use client";

/* The shop cloud, running wherever the app is open.

   This exists because the sync did not. Every part of it — the 45-second sweep
   included — lived inside CloudSyncControl, which is mounted on exactly one
   page: Settings. So a mechanic could move buses around the Facility Map for a
   whole shift, or log defects all night, and none of it left the device: the
   only moments anything synced were the moments somebody happened to have the
   Settings page open. The status line said "62 changes waiting" and it was
   telling the truth.

   So the engine moves here, into a component that renders nothing and is
   dropped into all six pages the way the DEFERRED badge already is. Settings
   keeps the buttons, the fields and the status line; it no longer keeps the
   sweep, or there would be two of them racing whenever Settings was open.

   Live sync is then one more trigger on the same engine. A notification from
   another device means "the shop has news", and the news is fetched and merged
   down the ordinary path — the same one GET THE SHOP'S COPY uses, with the same
   merge rules. Realtime is a doorbell, not a delivery.

   Nothing here can gate the board. Every failure is a status line and a retry;
   a shop with no signal, no realtime, or no cloud at all works exactly as it
   does today. */

import {useEffect,useRef} from "react";
import {cloudPull,cloudPush,subscribeToShopCloud} from "@/src/lib/cloud/cloud-client";
import {
 cloudConfigProblem,
 readCloudConfig,
 readCloudState,
 readMergedAway,
 readRemovedEntries,
 readSentFingerprints,
 writeCloudState,
 writeSentFingerprints,
} from "@/src/lib/cloud/cloud-sync";
import {applyCloudPull,LIVE_DEBOUNCE_MS,shouldSyncForChange} from "@/src/lib/cloud/cloud-live";
import {readDownSheetStorage,readFleetStorage} from "@/src/lib/storage/storage";

/* How often a connected device looks for its own unsent work. Long enough that
   a phone on its owner's data plan is not paying for a chatty app, short enough
   that walking from the shop to the lot does not lose an afternoon. Live sync
   does not replace it: a notification only arrives when somebody else writes,
   and this device's OWN work still has to go up. */
export const SWEEP_MS=45000;

export default function ShopCloudLive(){
 const running=useRef(false);
 const timer=useRef<number|undefined>(undefined);
 /* Whether the shop can actually reach this device. Assumed false until the
    channel says SUBSCRIBED, because the expensive mistake is the other way
    round: a device that believes it is being told about changes stops asking,
    and then never hears anything again. */
 const live=useRef(false);
 /* A PULL STAYS OWED UNTIL ONE LANDS. While the channel is live the sweep is
    push-only, so a pull that did not finish was never asked for again: the
    first pull of a page that reopening cut short with window.stop(), one that
    failed on dead wifi, or one a change notification asked for while another
    sync was running (sync returns early then, and the notification was
    simply dropped). CodeRabbit on PR 51. The board then sat on what it had
    until the next notification or a trip away from the app. Owed, the next
    sweep pulls whatever the channel says. */
 const pullOwed=useRef(false);
 /* Pull requests that arrived while a sync was running. A cold read found the
    gap the flag alone left: a pull already under way set the flag itself,
    a notification landing mid-pull set the same flag again, and the pull -
    whose tables were read before that other device's write - then cleared
    it. Counted, a pull pays off only what was asked before it began, and
    anything asked during it runs again as soon as it ends. */
 const askedMidSync=useRef(0);

 useEffect(()=>{
  let stopped=false;
  let unsubscribe:(()=>void)|null=null;

  /* Reads what is ON DISK, never React state. writeFleetStorage refuses a write
     it considers destructive and the board's save effect discards that boolean,
     so pushing from state would upload changes the device itself declined to
     keep — the exact data loss the guard exists to prevent. */
  const sync=async(pullToo:boolean)=>{
   const config=readCloudConfig(localStorage);
   if(cloudConfigProblem(config)||stopped)return;
   if(running.current){if(pullToo){pullOwed.current=true;askedMidSync.current++}return}
   const wantPull=pullToo||pullOwed.current;
   if(wantPull)pullOwed.current=true;
   const askedBefore=askedMidSync.current;
   running.current=true;
   try{
    const fleet=readFleetStorage<Record<string,unknown>>(localStorage);
    const sheet=readDownSheetStorage<Record<string,unknown>>(localStorage);
    const now=new Date().toISOString();
    const pushed=await cloudPush({
     buses:fleet.valid?fleet.buses:[],
     entries:sheet.valid?sheet.entries:[],
     config,now,
     sent:readSentFingerprints(localStorage),
     merged:readMergedAway(localStorage),
     removedEntries:readRemovedEntries(localStorage),
    });
    if(pushed.ok)writeSentFingerprints(localStorage,pushed.sent);
    const before=readCloudState(localStorage);
    writeCloudState(localStorage,{
     phase:pushed.phase,
     lastSyncedAt:pushed.ok&&pushed.pushed?now:before.lastSyncedAt,
     lastError:pushed.message,
     pending:pushed.pending,
    });

    /* Send before receiving, and do not receive if sending failed. A merge takes
       the incoming copy for a bus both devices know, so pulling over unsent work
       would lay the server's older copy on top of it — and the next sweep would
       push that overwritten version up as though it were the truth. */
    if(!wantPull||!pushed.ok||stopped)return;
    const got=await cloudPull(config,new Date().toISOString(),readMergedAway(localStorage),readRemovedEntries(localStorage));
    if(stopped||!got.ok||!got.map||!got.defects||!got.sheet){
     if(!got.ok)writeCloudState(localStorage,{...readCloudState(localStorage),phase:got.phase,lastError:got.message});
     return;
    }
    const applied=applyCloudPull(localStorage,{map:got.map,defects:got.defects,sheet:got.sheet,deleted:got.deleted,removedEntries:got.removedEntries});
    /* Paid only if nobody asked again while it ran. A board that cannot take
       the pull at all - unreadable, or a phone too full to write - is not
       owed another every 45 seconds: the error is on screen, and the next
       notification or return to the app asks again (cold read). */
    if(askedMidSync.current===askedBefore)pullOwed.current=false;
    writeCloudState(localStorage,applied.ok
     ?{phase:"idle",lastSyncedAt:new Date().toISOString(),lastError:"",pending:0}
     :{...readCloudState(localStorage),phase:"error",lastError:applied.error});
   }finally{
    running.current=false;
    if(!stopped&&askedMidSync.current!==askedBefore)window.setTimeout(()=>sync(true),0);
   }
  };

  /* One device pressing SEND MY CHANGES produces a burst — a hundred rows across
     three tables arrive as a hundred notifications. Collapsing them into one
     sync is the difference between a live board and a phone melting. */
  const wake=()=>{
   if(stopped)return;
   window.clearTimeout(timer.current);
   timer.current=window.setTimeout(()=>{if(document.visibilityState!=="hidden")sync(true)},LIVE_DEBOUNCE_MS);
  };

  /* THE SWEEP USED TO PUSH AND NEVER PULL — sync(false) — because receiving
     was realtime's job. That works right up until realtime is not there, and
     then the device is deaf with no way of noticing: it uploads its own work
     every 45 seconds for a whole shift and never once asks what changed.
     Reported from the floor — a phone imported a new Down Sheet, and the iPad
     beside it still showed the previous one sixteen hours later.

     So the sweep pulls whenever the channel is not confirmed live. When it IS
     live the sweep stays push-only, which is the whole reason realtime exists:
     a shop of phones on their owners' data plans should not each be dragging
     the board down every 45 seconds to learn nothing changed. */
  const sweep=()=>{if(document.visibilityState==="visible")sync(!live.current)};
  /* Coming back to the app, or back onto signal, always asks. This is the
     moment a person is actually looking at the board, and it is the cheapest
     possible place to spend a pull. */
  const resume=()=>{if(document.visibilityState==="visible")sync(true)};
  const interval=window.setInterval(sweep,SWEEP_MS);
  document.addEventListener("visibilitychange",resume);
  window.addEventListener("online",resume);
  resume();

  const config=readCloudConfig(localStorage);
  if(!cloudConfigProblem(config))
   subscribeToShopCloud(config,
    change=>{if(shouldSyncForChange(change,config.deviceLabel))wake()},
    /* A channel that drops mid-shift puts the device straight back on pulling
       sweeps, without waiting for anybody to reload the page. */
    isLive=>{live.current=isLive;if(isLive)wake()})
    .then(stop=>{if(stopped)stop?.();else unsubscribe=stop});

  return()=>{
   stopped=true;
   live.current=false;
   window.clearInterval(interval);
   window.clearTimeout(timer.current);
   /* The listeners added were `resume`. These removed `sweep`, which was
      never added, so every page that unmounted this left its two behind. */
   document.removeEventListener("visibilitychange",resume);
   window.removeEventListener("online",resume);
   unsubscribe?.();
  };
 },[]);

 return null;
}
