"use client";

/* REFRESH, on every page.

   Saved to a home screen the app runs standalone, with no browser chrome: no
   address bar, no reload. There is no way to make the app pick up a new version
   — or to shake off a page that has got itself into a bad state — except to
   close and reopen it, and even that does not force the service worker to look
   for an update.

   The Facility Map had this button in its command bar and the other five pages
   had nothing. This is that same button, made shareable rather than copied, so
   there is one definition of what refreshing means: ask the service worker to
   check for a new version FIRST, then reload — a bare reload would just serve
   the cached shell again and look like the button did nothing.

   The map passes its own class so it keeps the command-bar look it already had;
   everywhere else takes the header shape. */

import {useState} from "react";

/* The behaviour, separately from the button, because the Facility Map offers
   refreshing from its phone menu as well and one of the two would otherwise
   drift. Returns false when the reload never happened, which is the only case a
   caller has to do anything about. */
export async function refreshTrackerApp():Promise<boolean>{
 try{
  if("serviceWorker" in navigator){
   const registration=await navigator.serviceWorker.getRegistration();
   await registration?.update();
  }
  window.location.reload();
  return true;
 }catch{
  alert("The app could not check for an update. Confirm that this device is online and try again.");
  return false;
 }
}

export default function RefreshButton({className}:{className?:string}){
 const [refreshing,setRefreshing]=useState(false);
 /* Cleared again only on failure: after a successful reload this component is
    gone, and leaving a button stuck on UPDATING would look like a freeze. */
 const refresh=async()=>{if(refreshing)return;setRefreshing(true);if(!await refreshTrackerApp())setRefreshing(false)};
 return <button className={className||"app-refresh"} type="button" onClick={refresh} disabled={refreshing} aria-label="Refresh and check for app updates">
  <span aria-hidden="true">&#8635;</span>{refreshing?"UPDATING":"REFRESH"}
 </button>;
}
