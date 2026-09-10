"use client";

/* The first screen a device ever shows, and the only one that asks a question
   before the app opens.

   It appears in two situations and no others: a device that has never opened
   the app, and a device whose owner pressed SHOW THE WELCOME AGAIN in Settings.
   Nobody mid-shift meets it — everybody in the shop today has a board, and
   isFirstRun checks for one. Curtis asked for the Settings route so he can see
   what a new person sees on his own phone.

   There is no home page yet. This is deliberately the name and two questions,
   nothing else, so that whatever the landing page becomes can absorb it later
   without this having grown a design of its own in the meantime. */

import {useEffect,useState} from "react";
import {APP_NAME} from "./app-name";
import {APP_MODE_STORAGE_KEY,isFirstRun,readAppMode,serializeAppMode,type AppMode} from "./app-mode";
import {lockPageScroll} from "./scroll-lock";

export const WELCOME_REQUEST_EVENT="pace-show-welcome";

export default function WelcomeGate(){
 /* Never on the server and never on the first paint: the answer lives in
    localStorage, so rendering this before mount would put a full-screen overlay
    into the HTML of every page for every device, and take it away a frame
    later on the ones that have already answered. */
 const [open,setOpen]=useState(false);
 const [shown,setShown]=useState(false);
 useEffect(()=>{
  if(isFirstRun(localStorage))setOpen(true);
  const onRequest=()=>setOpen(true);
  window.addEventListener(WELCOME_REQUEST_EVENT,onRequest);
  return ()=>window.removeEventListener(WELCOME_REQUEST_EVENT,onRequest);
 },[]);
 /* The reveal runs once the overlay is up rather than on a timer from mount, so
    it cannot half-play behind a page that was still hydrating. */
 useEffect(()=>{if(!open)return;const id=window.requestAnimationFrame(()=>setShown(true));return ()=>{window.cancelAnimationFrame(id);setShown(false)}},[open]);
 useEffect(()=>{if(open)return lockPageScroll("welcome-open")},[open]);

 if(!open)return null;
 const choose=(mode:AppMode)=>{
  try{localStorage.setItem(APP_MODE_STORAGE_KEY,serializeAppMode({mode,answered:true}))}
  catch{/* A device that cannot store the answer still gets the app it chose for
           this visit, and is asked again next time. Refusing to continue over a
           preference would be worse than asking twice. */}
  setOpen(false);
  /* Whatever is already on screen re-reads the mode without a reload. */
  window.dispatchEvent(new CustomEvent(APP_MODE_STORAGE_KEY));
 };
 return <div className={"welcome-gate"+(shown?" shown":"")} role="dialog" aria-modal="true" aria-label={"Welcome to "+APP_NAME}>
  <div className="welcome-inner">
   {/* One letter per span so the name can resolve in rather than simply appear.
       Each carries its own delay; prefers-reduced-motion drops all of it and
       the name is just there. */}
   <h1 className="welcome-name" aria-label={APP_NAME}>
    {APP_NAME.split("").map((letter,index)=>
     <span aria-hidden="true" key={index} style={{animationDelay:(index*55)+"ms"}}>{letter}</span>)}
   </h1>
   {/* The line under the name is what the app calls ITSELF, not what one garage
       calls itself. Curtis: "take PACE SOUTH off that page and replace it with
       Transit Maintenance Work Solutions."

       "· FLEET MAINTENANCE" went with it rather than being kept alongside: the
       new phrase already says maintenance, and a kicker that reads "Transit
       Maintenance Work Solutions · FLEET MAINTENANCE" says the same word twice
       under a name that is nine letters long.

       His capitalisation, not the old line's. The style here is 9px at 2.4px
       letter-spacing with no text-transform, so the shouting in "PACE SOUTH"
       was literal text — a 33-character phrase set that way reads as a wall.

       This is the only place the shop's own name was on this screen. The one
       other "Pace South" in the app is a download FILENAME in
       section-transfer-controls.tsx, which is a different thing and untouched. */}
   <p className="welcome-kicker">Transit Maintenance Work Solutions</p>
   <div className="welcome-choices">
    <button type="button" className="welcome-choice welcome-full" onClick={()=>choose("full")}>
     <b>FULL</b><small>Every surface and every control. What the shop runs on.</small>
    </button>
    <button type="button" className="welcome-choice welcome-lite" onClick={()=>choose("lite")}>
     <b>LITE</b><small>The same app drawing less of itself, to learn the workflow on. Turn it off in Settings whenever you want.</small>
    </button>
   </div>
   <p className="welcome-foot">Nothing here changes what is saved. Both keep the same records and the same Shop Cloud.</p>
  </div>
 </div>;
}

/* What a page calls to read the mode, and to be told when it changes. Exported
   here rather than in app-mode.ts because that file is data only — no React —
   so the test runner can drive the rules without a DOM. */
export function useAppMode(){
 const [mode,setMode]=useState<AppMode>("full");
 useEffect(()=>{
  const read=()=>setMode(readAppMode(localStorage.getItem(APP_MODE_STORAGE_KEY)).mode);
  read();
  const onStorage=(event:StorageEvent)=>{if(!event.key||event.key===APP_MODE_STORAGE_KEY)read()};
  window.addEventListener("storage",onStorage);
  /* `storage` fires in OTHER tabs only, so the page that changed the mode has
     to be told separately — the same reason the deferred badge listens for its
     own write announcement. */
  window.addEventListener(APP_MODE_STORAGE_KEY,read);
  return ()=>{window.removeEventListener("storage",onStorage);window.removeEventListener(APP_MODE_STORAGE_KEY,read)};
 },[]);
 return mode;
}
