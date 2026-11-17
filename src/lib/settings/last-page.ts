/* REOPEN WHERE YOU LEFT OFF.

   Curtis: "when I leave phone app and go back in I want it to return to the
   tab I was using. Not default back to map. I was using the defect log."

   WHY IT WENT BACK TO THE MAP. The app saved to a home screen starts at the
   address its manifest names, which is "/" - the Facility Map. A phone keeps a
   backgrounded app alive for a while and then closes it without saying so; the
   next tap on the icon is a fresh start at that address. Changing the manifest
   would not reach a phone that already has the icon: iOS reads the start
   address once, when the icon is made.

   So there are two halves, and they run at different moments on purpose:

   - REMEMBERING is `pageMemory`, driven by app/_components/last-page-live.tsx
     from an effect - so only once a page has actually come up. A page that
     never draws is never remembered.
   - REOPENING is `RESUME_SOURCE`, a script the root layout writes at the top
     of every page, which runs before the page is drawn. On a fresh start at
     the map it goes to the remembered page instead.

   IT ONLY EVER TURNS ROUND A FRESH START, and these have to be true together.
   Each one is a way of not bouncing somebody who asked for the map:

   - it is the first page of this run of the app - a mark in sessionStorage,
     which the phone throws away when it closes the app. The mark is written
     and read back first, so storage that will not take it never moves anybody;
   - nothing sent them here - no referrer. A tap on the Map tile is a page
     load from another page of the app and carries one;
   - it is the bare map address, with no ?query and no #part;
   - the app is an INSTALLED copy - on a home screen, or installed from a
     desktop browser. In a browser tab the address bar is somebody's own
     statement of where they want to be, and a bookmark to the map has to keep
     opening the map.

   A REOPENED PAGE IS ON PROBATION UNTIL IT HAS STAYED UP. Before this, closing
   the app and opening it again was the way out of a page that would not draw:
   it landed on the map. Reopening straight into that page takes the way out
   away, so three things stand in front of it:

   - the move is MARKED on the record before it is made (`resuming`), and the
     mark comes off only when the page has stayed up: `PAGE_SETTLE_MS` after
     it was drawn, or when the app is left after that. A fresh start that
     finds the mark still there stays on the map. This is the one that does
     not depend on anything the broken page managed to write - a page that
     never loads its code, a server error, a phone too full to save a crash
     report. The mark came off on the first draw at first, and a cold read
     found what that misses: these pages read their records in effects AFTER
     the first draw, so one that throws on its own data had already been
     cleared;
   - a page whose crash was recorded after it was last remembered is skipped;
   - if the mark cannot be written, nothing moves.

   AND THE NETWORK IS ASKED FIRST. Pages here load network-first, and wifi that
   is joined but dead does not fail a request, it hangs it. Going straight to
   the other page would have doubled that wait behind a hidden screen, with a
   working map underneath. So the script asks for the page's headers, and goes
   only when something answers or the request fails outright (no signal at all
   is quick, and the phone holds every page for that; a phone that already
   says it is offline is not made to ask). A server that answers with a
   failure of its own, 500 or above, is not gone to. If nothing has happened
   in `wait` milliseconds it shows the map and stays for this run. Showing the map and
   still moving later was the other choice, and it takes the screen away from
   somebody who has started using it - so a move that was started and has not
   arrived in another `wait` is STOPPED (`window.stop()`) before the map is
   shown. Where a browser will not stop it, the map can still be taken away
   late; that is the one case left. `stop()` ends more than the move - anything
   the map was still loading, and any request it had in flight, such as a pull
   from the Shop Cloud - and what that costs on the slow network it fires on
   has not been measured.

   THE MAP UNDERNEATH DOES NOT REMEMBER ITSELF. While the script waits, the map
   is loading behind it, and its own remembering would write "the map" over the
   page the person left - so a start that gave up on slow wifi would have
   forgotten the Defect Log for good. The script raises a flag on the window
   when it tries, and a map that was only fallen back to is remembered once
   somebody has touched it and not before.

   THAT HOLDS FOR A START THAT NEVER MOVED. One that started a move and had it
   stopped still carries the mark, so the start after it stays on the map and
   the page is forgotten. Deliberate: whether a stopped move really stopped
   cannot be read back, and the mark is the only thing standing in front of a
   page that arrives late and dead. Forgetting a page costs one tap.

   THE ADDRESS ONLY, never what was open on it: no ?scan=, no search, no form.
   A half-typed defect is gone when the phone closes the app, as it was before.

   Per device and never synced. It holds a page address and two times, and
   nothing about the fleet. Tabs and an installed copy in the same browser
   share it, so the installed copy reopens wherever that browser was last. */

import {TRACKER_PAGES} from "./tracker-pages.ts";

export const LAST_PAGE_KEY="pace-last-page-v1";
/* sessionStorage, not LocalStorage: gone when the app is closed, which is the
   whole of what it is for. Named without a version because nothing ever reads
   an old one. */
export const LAUNCH_SEEN_KEY="pace-launch-seen";
/* `CRASH_STORAGE_KEY` in app/_components/crash-guard.tsx, which imports nothing
   on purpose and cannot be imported from here. A test holds the two together. */
export const CRASH_REPORT_KEY="pace-crash-report-v1";

export type ResumeConfig={key:string;seenKey:string;crashKey:string;pages:string[];home:string;wait:number;flag:string};

export const RESUME_CONFIG:ResumeConfig={
 key:LAST_PAGE_KEY,seenKey:LAUNCH_SEEN_KEY,crashKey:CRASH_REPORT_KEY,
 /* The pages the app has, and so the pages the service worker keeps for a
    bay with no signal. Nothing else can be remembered or reopened. */
 pages:TRACKER_PAGES.map(page=>page.href),
 home:"/",
 /* How long the map stays hidden waiting for the network to answer, and then
    how long a move is given to arrive. Long enough for slow wifi, short
    enough that it reads as the app opening. */
 wait:2500,
 /* Raised on the window by the script when it tries to turn a start round,
    and read by the remembering half of the same page. */
 flag:"__paceResumeTried",
};
/* How long a page has to stay up before it counts as having come up. Its
   records are read in effects after the first draw, and a page that throws on
   them does it at once - so this is short. It was four seconds, and what that
   costs is a good page: one reopened, glanced at and pocketed inside the wait,
   on a phone that then closes the app, is still marked and the next start is
   the map. Two seconds halves that and still misses nothing the four caught. */
export const PAGE_SETTLE_MS=2000;
export const SERVICE_WORKER_PATH="/sw.js";

/* "/defect-log/" and "/defect-log" are one page. */
export function pagePath(pathname:unknown){
 const text=String(pathname||"/");
 return text.length>1&&text.endsWith("/")?text.slice(0,-1):text;
}

/* Writes the record for the page the app is on. False when there was nothing
   to remember or the device would not save it.

   `keepMark` carries a reopened page's probation mark over, when the record
   already names this same page. Without it the record is written fresh, which
   is what ends the probation. */
export function rememberPage(storage:Pick<Storage,"getItem"|"setItem">,pathname:unknown,options:{keepMark?:boolean;now?:Date}={}){
 const path=pagePath(pathname);
 if(!RESUME_CONFIG.pages.includes(path))return false;
 try{
  let resuming="";
  if(options.keepMark){
   try{
    const held=JSON.parse(storage.getItem(LAST_PAGE_KEY)||"null");
    if(held&&typeof held==="object"&&held.path===path&&typeof held.resuming==="string")resuming=held.resuming;
   }catch{}
  }
  const record={version:1,path,at:(options.now??new Date()).toISOString(),...(resuming?{resuming}:{})};
  storage.setItem(LAST_PAGE_KEY,JSON.stringify(record));
  return true;
 }catch{return false}
}

/* WHEN a page is remembered, as four moments the page tells this about. The
   component that drives it holds no rule of its own.

   `turnedRound` is the script's flag: this page is a map that a start tried to
   leave. Such a map writes nothing until somebody has used it - see the
   header. Everywhere else:

   - `up`: the page has been drawn. Remembered, keeping any probation mark.
   - `settled`: it has stayed up. Remembered fresh, which ends probation.
   - `left`: the app was left, or the page was brought back by Back without
     being loaded again. Written again so the record names the page on screen
     and carries a time from this visit; the mark is kept unless the page had
     settled.
   - `used`: somebody touched the page. Only matters to a map fallen back to.

   Each answers whether it wrote. */
export function pageMemory(storage:Pick<Storage,"getItem"|"setItem">,pathname:()=>unknown,turnedRound:boolean){
 let hasSettled=false,wasUsed=false;
 const fellBack=()=>turnedRound&&pagePath(pathname())===RESUME_CONFIG.home;
 const write=(keepMark:boolean)=>rememberPage(storage,pathname(),{keepMark});
 return {
  up(){return fellBack()?false:write(true)},
  settled(){hasSettled=true;return fellBack()?false:write(false)},
  left(){return fellBack()?(wasUsed?write(false):false):write(!hasSettled)},
  used(){
   if(wasUsed)return false;
   wasUsed=true;
   return fellBack()?write(false):false;
  },
 };
}

/* THE SCRIPT, AS TEXT, because text is what a page is sent.

   It was a function first, written into the page with `toString()`. A cold
   read found what that costs: the build re-prints a function, so the text the
   tests ran was not the text a phone received, and a build step that keeps
   function names does it by wrapping each one in a helper that would not be on
   the page. A string is carried through a build as it is, so what is tested
   here is what is sent.

   So: nothing checks this as code but the tests, which run it. It may name its
   two arguments and the language's own globals and nothing else. It is written
   in the oldest JavaScript that will do, and it holds no backtick, no
   backslash and no "<", so that it can sit in this file and in a script tag.

   What each part is for is in the header above. Everything in it that can
   fail is inside a `try`: a script that fails must leave the page as it found
   it, shown. Once
   the page is hidden, every way on from there ends in `show` or in leaving:
   `stay` at `wait` if nothing answered, and `giveUp` at another `wait` if a
   move was started. */
export const RESUME_SOURCE=`function(config,win){
 var doc=win.document,loc=win.location,root=doc.documentElement;
 var clean=function(path){var text=String(path||"/");return text.length>1&&text.charAt(text.length-1)==="/"?text.slice(0,-1):text};
 var record=function(key){try{var value=JSON.parse(win.localStorage.getItem(key)||"null");return value&&typeof value==="object"?value:null}catch(error){return null}};
 var show=function(){try{root.style.visibility=""}catch(error){}};
 try{
  var fresh=false;
  try{
   if(win.sessionStorage.getItem(config.seenKey)===null){
    win.sessionStorage.setItem(config.seenKey,"1");
    fresh=win.sessionStorage.getItem(config.seenKey)==="1";
   }
  }catch(error){fresh=false}
  var installed=win.navigator.standalone===true||!!(win.matchMedia&&win.matchMedia("(display-mode: standalone)").matches);
  if(!fresh||!installed||clean(loc.pathname)!==config.home||loc.search||loc.hash||doc.referrer)return "stayed";
  var last=record(config.key);
  if(!last||typeof last.path!=="string"||config.pages.indexOf(last.path)===-1||last.path===config.home||last.resuming)return "stayed";
  var since=Date.parse(last.at);
  if(!(since>=0))since=0;
  var crash=record(config.crashKey);
  if(crash&&clean(crash.url)===last.path&&Date.parse(crash.at)>=since)return "stayed";
  var settled=false;
  var stay=function(){if(!settled){settled=true;show()}};
  var giveUp=function(){try{win.stop()}catch(error){}show()};
  var go=function(){
   if(settled)return;
   settled=true;
   try{
    win.localStorage.setItem(config.key,JSON.stringify({version:1,path:last.path,at:last.at,resuming:new Date().toISOString()}));
    var marked=record(config.key);
    if(!marked||!marked.resuming||marked.path!==last.path){show();return}
    try{loc.replace(last.path)}catch(error){
     try{win.localStorage.setItem(config.key,JSON.stringify({version:1,path:last.path,at:last.at}))}catch(ignored){}
     show();
     return;
    }
    win.setTimeout(giveUp,config.wait);
   }catch(error){show()}
  };
  win[config.flag]=true;
  root.style.visibility="hidden";
  win.setTimeout(stay,config.wait);
  if(win.navigator.onLine===false||typeof win.fetch!=="function")go();
  else win.fetch(last.path,{method:"HEAD",cache:"no-store"}).then(function(answer){if(answer&&answer.status>=500)stay();else go()},go);
  return "resuming";
 }catch(error){
  show();
  return "stayed";
 }
}`;

/* The text the root layout writes into every page. `<` is spelled out in the
   settings so that nothing in them can read as the end of the script tag. */
export function resumeScriptText(config:ResumeConfig=RESUME_CONFIG){
 return "("+RESUME_SOURCE+")("+JSON.stringify(config).replace(/</g,"\\u003c")+",window)";
}
