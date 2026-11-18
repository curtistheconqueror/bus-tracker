"use client";

/* Tells the page memory when this page was drawn, stayed up, was used and was
   left. WHAT it then remembers is `pageMemory` in
   src/lib/settings/last-page.ts; there is no rule in this file.

   FROM AN EFFECT, AND THAT IS THE POINT. It sits inside the crash boundary
   beside the page. A page that throws while it is being drawn never runs
   this; one that throws a moment later, on the records it reads after its
   first draw, takes this down with it before the timer below has fired. Either
   way a reopened page stays on probation.

   It follows the route as well as the load, because one move in the app
   changes the page without loading one (the photographs going from SCAN SHEET
   to the scanner that reads them).

   It also asks for the offline worker. The map did that alone, and until this
   every fresh start loaded the map; a fresh start that is turned round may
   not. Asking twice is harmless: the browser keeps one registration per
   address. */

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {PAGE_SETTLE_MS,RESUME_CONFIG,SERVICE_WORKER_PATH,pageMemory} from "@/src/lib/settings/last-page";

export default function LastPageLive(){
 const pathname=usePathname();
 useEffect(()=>{
  let memory:ReturnType<typeof pageMemory>;
  try{
   const turnedRound=(window as unknown as Record<string,unknown>)[RESUME_CONFIG.flag]===true;
   memory=pageMemory(window.localStorage,()=>window.location.pathname,turnedRound);
  }catch{return}
  const left=()=>{if(document.visibilityState==="hidden")memory.left()};
  const back=(event:PageTransitionEvent)=>{if(event.persisted)memory.left()};
  const used=()=>{memory.used()};
  memory.up();
  const timer=window.setTimeout(()=>{
   memory.settled();
   (window as unknown as Record<string,unknown>)[RESUME_CONFIG.ready]=true;
   window.dispatchEvent(new Event(RESUME_CONFIG.ready));
  },PAGE_SETTLE_MS);
  document.addEventListener("visibilitychange",left);
  window.addEventListener("pageshow",back);
  window.addEventListener("pointerdown",used,true);
  window.addEventListener("keydown",used,true);
  return()=>{
   (window as unknown as Record<string,unknown>)[RESUME_CONFIG.ready]=false;
   window.clearTimeout(timer);
   document.removeEventListener("visibilitychange",left);
   window.removeEventListener("pageshow",back);
   window.removeEventListener("pointerdown",used,true);
   window.removeEventListener("keydown",used,true);
  };
 },[pathname]);
 useEffect(()=>{
  try{if("serviceWorker" in navigator)navigator.serviceWorker.register(SERVICE_WORKER_PATH).catch(()=>{})}catch{}
 },[]);
 return null;
}
