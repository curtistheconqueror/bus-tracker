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
import {ROLE_DEPARTMENTS,ROLE_STORAGE_KEY,readRole,roleLabel,serializeRole,type RoleChoice,type RoleDepartment} from "./roles";

export const WELCOME_REQUEST_EVENT="pace-show-welcome";

export default function WelcomeGate(){
 /* Never on the server and never on the first paint: the answer lives in
    localStorage, so rendering this before mount would put a full-screen overlay
    into the HTML of every page for every device, and take it away a frame
    later on the ones that have already answered. */
 const [open,setOpen]=useState(false);
 const [shown,setShown]=useState(false);
 /* A FIRST RUN MUST ANSWER; ANYONE ELSE IS JUST LOOKING.

    Until now the only way off this screen was picking FULL or LITE, which is
    right for a device that has never opened the app and wrong for every other
    time it is opened. Curtis, on tapping the name: "I need to be able to see it
    whenever I want to." Being made to re-answer a question you already answered
    is not seeing it, it is being interrogated by your own home screen.

    So the close exists only when the question is already answered. On a genuine
    first run there is no way past it, which is the whole point of a gate. */
 const [dismissable,setDismissable]=useState(false);
 /* Read on mount for the same reason `open` is: the answer lives in
    localStorage, so a server render knows nothing about it. */
 const [role,setRole]=useState<RoleChoice|null>(null);
 const [roleOpen,setRoleOpen]=useState(false);
 const [department,setDepartment]=useState<RoleDepartment|null>(null);
 useEffect(()=>{try{setRole(readRole(localStorage.getItem(ROLE_STORAGE_KEY)))}catch{}},[]);
 useEffect(()=>{
  if(isFirstRun(localStorage))setOpen(true);
  const onRequest=()=>{setDismissable(!isFirstRun(localStorage));setOpen(true)};
  window.addEventListener(WELCOME_REQUEST_EVENT,onRequest);
  return ()=>window.removeEventListener(WELCOME_REQUEST_EVENT,onRequest);
 },[]);
 /* The reveal runs once the overlay is up rather than on a timer from mount, so
    it cannot half-play behind a page that was still hydrating. */
 useEffect(()=>{if(!open)return;const id=window.requestAnimationFrame(()=>setShown(true));return ()=>{window.cancelAnimationFrame(id);setShown(false)}},[open]);
 useEffect(()=>{if(open)return lockPageScroll("welcome-open")},[open]);
 /* Escape closes it for the same reason the × does, and for nobody who has not
    answered yet. There is no Escape key on a bus, so this is the shop computer's
    way out rather than the phone's — the × is the phone's. */
 useEffect(()=>{
  if(!open||!dismissable)return;
  const key=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
  window.addEventListener("keydown",key);
  return ()=>window.removeEventListener("keydown",key);
 },[open,dismissable]);

 if(!open)return null;
 const chooseRole=(next:RoleChoice)=>{
  /* Same shape as choosing a mode, including the shrug on a failed write: a
     device that cannot store a job title has lost nothing anybody needs, and
     refusing to close the panel over it would be a bigger problem than the one
     being reported. */
  try{localStorage.setItem(ROLE_STORAGE_KEY,serializeRole(next))}catch{}
  setRole(next);setRoleOpen(false);setDepartment(null);
 };
 const clearRole=()=>{
  try{localStorage.removeItem(ROLE_STORAGE_KEY)}catch{}
  setRole(null);setDepartment(null);
 };
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
  {dismissable&&<button type="button" className="welcome-close" aria-label="Close" onClick={()=>setOpen(false)}>×</button>}
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
   {/* THE ROLE PICKER, under the two mode choices and above the footnote.

       Placed there rather than above them because the screen already asks one
       question that has to be answered on a first run, and a second question
       stacked in front of it would turn a gate into a form. FULL or LITE
       decides what the app draws; this decides nothing yet, so it sits below,
       folded away, for whoever wants it.

       Curtis: "a collapsible expandable section placed somewhere sensible on
       the screen where a person could select their role."

       TWO STEPS, because he described two: "this could be broken up into two
       categories, transportation and maintenance, and then if you hit
       transportation it will give you the option between bus operator, then
       dispatch and then superintendent." Picking a department opens its roles;
       picking a role closes the whole panel with the answer showing on the
       summary line. Nothing else in the app changes — see roles.ts, which says
       at some length why nothing else may. */}
   <div className={"welcome-role"+(roleOpen?" open":"")}>
    <button type="button" className="welcome-role-toggle" aria-expanded={roleOpen}
     onClick={()=>{setRoleOpen(!roleOpen);setDepartment(null)}}>
     <span><b>MY ROLE</b><small>{role?roleLabel(role):"Not set — optional"}</small></span>
     <i aria-hidden="true">{roleOpen?"−":"+"}</i>
    </button>
    {roleOpen&&<div className="welcome-role-body">
     {/* The department buttons stay on screen after one is picked, ticked, so
         the way back to the other list is the thing already under your thumb
         rather than a separate BACK control. */}
     <div className="welcome-role-departments">{ROLE_DEPARTMENTS.map(item=>
      <button type="button" key={item.key} className={department===item.key?"selected":""}
       aria-pressed={department===item.key} onClick={()=>setDepartment(department===item.key?null:item.key)}>{item.label}</button>)}
     </div>
     {department&&<div className="welcome-role-roles">{ROLE_DEPARTMENTS.find(item=>item.key===department)?.roles.map(name=>
      <button type="button" key={name} className={role?.department===department&&role.role===name?"selected":""}
       onClick={()=>chooseRole({department,role:name})}>{name}</button>)}
     </div>}
     {!department&&<small className="welcome-role-hint">Pick a department, then a role.{role?" Yours is set to "+roleLabel(role)+".":""}</small>}
     {role&&<button type="button" className="welcome-role-clear" onClick={clearRole}>CLEAR MY ROLE</button>}
    </div>}
   </div>
   <p className="welcome-foot">Nothing here changes what is saved. Both keep the same records and the same Shop Cloud.{dismissable&&" Close this and nothing changes at all."}</p>
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
