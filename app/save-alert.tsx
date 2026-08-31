"use client";

/* The board did not save, and the board must say so.

   Every surface here writes to LocalStorage and carries on. The write can be
   refused four different ways, and until now every one of them looked identical
   to success: the change appeared on screen, nothing reached storage, and
   nothing anywhere said a word. The realistic version of that is a foreman
   moving buses all afternoon on a phone that has been full since lunchtime,
   closing the app, and losing the day.

   Three deliberate choices.

   It is a BANNER, not an alert. An alert is dismissed by the person who is busy,
   and then they keep working on a board that is not being saved — which is the
   same outcome as saying nothing, only later. This stays until a save succeeds.

   It names the ANSWER, not the error. "Could not save" tells somebody standing
   at a bus nothing they can do. A full device needs room; a board this build
   cannot read must not be overwritten; the safety stop needs the recovery copy.

   And it offers the way out, because the work is still on screen and still in
   memory. Exporting a backup is what turns "you are about to lose today" into
   "today is on your phone in a file". */

import {useState} from "react";
import type {FleetWriteReason} from "./storage";

const ADVICE:Record<FleetWriteReason,{title:string;detail:string}>={
 "storage-full":{
  title:"NOT SAVED — THIS DEVICE IS FULL",
  detail:"What is on screen has not been written down. Export a backup now, then clear space on the device — old photos usually free the most — and make a change to try again.",
 },
 unreadable:{
  title:"NOT SAVED — THE SAVED BOARD CANNOT BE READ",
  detail:"The copy already on this device is damaged, or was written by a newer version of the app. Nothing has been overwritten, on purpose. Export a backup, then reload. If the board is wrong after reloading, restore the last-known-good copy from Settings.",
 },
 "bulk-loss":{
  title:"NOT SAVED — SAFETY STOP",
  detail:"That change would have removed several records at once, so it was refused and the previous board was kept. Reload the page. If the change was meant, make it in smaller steps.",
 },
 "no-snapshot":{
  title:"NOT SAVED — NO RECOVERY COPY COULD BE MADE",
  detail:"This app writes a recovery copy before it overwrites the board, and that copy could not be written — so the board was left alone rather than replaced without a way back. Export a backup and reload.",
 },
 failed:{
  title:"NOT SAVED",
  detail:"The board could not be written to this device and what is on screen has not been kept. Export a backup now so the work is not lost, then reload.",
 },
};

export default function SaveAlert({reason,onExport}:{
 reason:FleetWriteReason|"";
 /* Handed in rather than reached for, because each surface knows what its own
    board is and this component must not guess. */
 onExport:()=>Promise<void>|void;
}){
 const [busy,setBusy]=useState(false);
 const [saved,setSaved]=useState(false);
 if(!reason)return null;
 const advice=ADVICE[reason]||ADVICE.failed;
 return <div className="save-alert" role="alert">
  <div className="save-alert-text"><b>{advice.title}</b><small>{advice.detail}</small></div>
  <button type="button" disabled={busy} onClick={async()=>{
   setBusy(true);
   try{await onExport();setSaved(true)}
   catch{setSaved(false)}
   finally{setBusy(false)}
  }}>{saved?"BACKUP SAVED — EXPORT AGAIN":busy?"EXPORTING…":"EXPORT A BACKUP NOW"}</button>
 </div>;
}
