"use client";

/* Starts `watchPage` when a page has been drawn, and stops it when the page
   goes. Everything it does - remembering the page, telling the reopening
   script the map is up, the probation timer - is in
   src/lib/settings/last-page.ts. THERE IS NO RULE IN THIS FILE, and that is
   deliberate: it held the "map is ready" signal for one release, where the
   only thing checking it was a test that read this file's text, and a review
   switched the signal off without a single test noticing.

   FROM AN EFFECT, AND THAT IS THE POINT. It sits inside the crash boundary
   beside the page. A page that throws while it is being drawn never runs
   this; one that throws a moment later, on the records it reads after its
   first draw, takes this down with it and the cleanup stops the timer. Either
   way a reopened page stays on probation.

   It follows the route as well as the load, because one move in the app
   changes the page without loading one (the photographs going from SCAN SHEET
   to the scanner that reads them).

   It also asks for the offline worker. The map did that alone, and until
   release 197 every fresh start loaded the map; a fresh start that is turned
   round may not. Asking twice is harmless: the browser keeps one registration
   per address. */

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {SERVICE_WORKER_PATH,watchPage} from "@/src/lib/settings/last-page";

export default function LastPageLive(){
 const pathname=usePathname();
 useEffect(()=>watchPage(window),[pathname]);
 useEffect(()=>{
  try{if("serviceWorker" in navigator)navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch(()=>{})}catch{}
 },[]);
 return null;
}
