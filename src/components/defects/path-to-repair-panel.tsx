"use client";

import {useState} from "react";
import HoursField from "../shared/hours-field";
import {defectEstimateMinutes} from "@/src/lib/defects/defect-estimates";
import {findPathToRepair,savePathToRepair,writePathToRepairs,MAX_PATH_TO_REPAIR,
 type PathToRepairLibrary} from "@/src/lib/defects/path-to-repair";
import {findRepairMinutes,saveRepairMinutes,writeRepairHoursLedger,
 type RepairHoursLedger} from "@/src/lib/defects/repair-hours-ledger";
import {repairCategoryLabel,type StructuredDefect} from "@/src/lib/defects/repair-catalog";
import {formatRepairTime} from "@/src/lib/down-sheet/repair-time-estimates";
import "./path-to-repair-panel.css";

/* PATH TO REPAIR, AS A COMPONENT, because a second screen now opens it.

   It was written inline on the Defect Log, which was right while the Defect Log
   was the only way in. Fixed Repairs is the other screen where somebody is
   looking at a repair and might want to say how to approach it — a completed
   repair is where the knowledge actually exists — so the panel moved to
   `src/components/defects/`, which `docs/ARCHITECTURE.md` reserves for React
   two or more pages draw.
   NOTHING MOVED ON THE DEFECT LOG. The PTR button is still on the card and
   still in the focus view; this is an additional door into the same room.

   THE LIBRARIES ARE PASSED IN, NOT READ HERE, and that is deliberate rather
   than lazy. The Defect Log's feed reads both — the PTR button says "PTR +"
   when nothing is written, and the hours badge reads the ledger — so the page
   has to hold them anyway, and a component reading its own copy would show a
   saved writeup while the button behind it still said there was none. The
   component owns the DRAFT and whether it is editing, which nothing outside it
   has any use for.

   THE WRITES ARE CHECKED. Both of them return false on a full device, and both
   used to be assumed on the Defect Log before that was fixed; the panel keeps
   that, because showing text it has not stored is how somebody finds out their
   writeup is gone a week later. */
export default function PathToRepairPanel({category,issue,initials,pathToRepairs,repairHours,
 onPathToRepairs,onRepairHours,onClose}:{
 category:string;
 issue:string;
 /* Stamped onto whichever of the two gets saved. "" is fine — the library
    records "SET BY SOMEONE" rather than refusing the save, for the reason an
    incident's only required field is what happened. */
 initials:string;
 pathToRepairs:PathToRepairLibrary;
 repairHours:RepairHoursLedger;
 onPathToRepairs:(next:PathToRepairLibrary)=>void;
 onRepairHours:(next:RepairHoursLedger)=>void;
 onClose:()=>void;
}){
 const saved=findPathToRepair(pathToRepairs,category,issue);
 /* A REPAIR WITH NOTHING WRITTEN OPENS STRAIGHT INTO THE EDITOR: the empty
    screen's only purpose is to be filled in, and making somebody press EDIT to
    reach a blank page is a tap that teaches nothing.

    Derived from the library on mount rather than passed in, which the caller
    used to do. Two callers each seeding it is two chances for the panel to open
    in the wrong mode — and the answer is a function of the library the panel
    already has. */
 const [editing,setEditing]=useState(!saved);
 const [draft,setDraft]=useState(saved?saved.steps:"");
 const [problem,setProblem]=useState("");

 const savePath=()=>{
  const next=savePathToRepair(pathToRepairs,{category,issue,steps:draft,by:initials});
  if(!writePathToRepairs(localStorage,next)){setProblem("Could not save — this device's storage is full.");return}
  onPathToRepairs(next);
  setEditing(false);
  setProblem("");
 };

 /* Saved on its own, not folded into the steps: a time and a writeup are two
    different claims, and somebody correcting one must not have to re-save the
    other. An empty box removes the shop's figure and the catalog estimate comes
    back — withdrawing a claim is the same gesture as never making it. */
 const saveHours=(hours:string)=>{
  const next=saveRepairMinutes(repairHours,{category,issue,hours,by:initials});
  if(!writeRepairHoursLedger(localStorage,next)){setProblem("Could not save — this device's storage is full.");return}
  onRepairHours(next);
  setProblem("");
 };

 const shop=findRepairMinutes(repairHours,category,issue);
 const fallback=defectEstimateMinutes({id:"ptr",category,issue,details:"",
  operability:"service",state:"open"} as StructuredDefect);

 return <div className="ptr-shade" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <section className="ptr-panel" role="dialog" aria-modal="true" aria-label="Path to repair">
   <div className="ptr-head">
    <span><small>PATH TO REPAIR</small><b>{repairCategoryLabel(category)}</b><i>{issue}</i></span>
    <button className="ptr-close" type="button" onClick={onClose} aria-label="Close path to repair">×</button>
   </div>
   {/* THE SHOP'S TIME, above the steps and always present. It is the one number
       on this screen that the Defect Log's hours badge reads, so it is shown
       whether or not anybody has written steps — a repair can have a time and
       no writeup, or a writeup and no time. */}
   <div className="ptr-hours">
    <label>SHOP TIME FOR THIS REPAIR<HoursField value={shop?Math.round(shop.minutes/60*100)/100:undefined}
     placeholder={String(Math.round(fallback/60*100)/100)} ariaLabel="Shop time for this repair, in hours"
     onChange={hours=>saveHours(hours===undefined?"":String(hours))}/></label>
    <small>{shop
     ?"SET BY "+(shop.updatedBy||"SOMEONE")+" · USED FOR EVERY BUS WITH THIS REPAIR"
     :"NOT SET — ESTIMATING "+formatRepairTime(fallback)+" FROM THE CATALOG. TYPE A NUMBER TO REPLACE IT."}</small>
   </div>
   {editing
    ?<div className="ptr-body">
      <label className="ptr-edit">STEPS — GENERAL DIRECTION, NOT A PROCEDURE
       <textarea value={draft} maxLength={MAX_PATH_TO_REPAIR} rows={9} autoFocus
        placeholder="Add the first checks and useful references to help someone start this repair."
        onChange={event=>setDraft(event.target.value)}/></label>
      <small className="ptr-count">{draft.trim().length} / {MAX_PATH_TO_REPAIR}</small>
      {problem&&<p className="ptr-problem">{problem}</p>}
      <div className="ptr-actions">
       <button type="button" className="ptr-save" onClick={savePath}>{draft.trim()?"SAVE":"CLEAR IT"}</button>
       <button type="button" className="ptr-cancel" onClick={()=>{
        if(saved){setDraft(saved.steps);setEditing(false);setProblem("")}else onClose();
       }}>CANCEL</button>
      </div>
      {/* Said on the screen that writes it, because somebody filling this in is
          entitled to know who will see it. */}
      <p className="ptr-note">This is written once for <b>{repairCategoryLabel(category)} — {issue}</b> and shows on every bus with that repair. It stays on this device; it does not travel to the Shop Cloud yet.</p>
     </div>
    :!saved
     ?<div className="ptr-body">
       <p className="ptr-empty"><b>Nothing written yet for this repair.</b><span>Add the first checks and useful references to help someone start this repair.</span></p>
       <div className="ptr-actions"><button type="button" className="ptr-save" onClick={()=>setEditing(true)}>WRITE IT</button></div>
      </div>
     :<div className="ptr-body">
       <p className="ptr-steps">{saved.steps}</p>
       <div className="ptr-actions"><button type="button" className="ptr-save" onClick={()=>{setDraft(saved.steps);setEditing(true)}}>EDIT</button></div>
       <p className="ptr-note">{saved.updatedBy?"Written by "+saved.updatedBy+", ":"Written "}{saved.updatedAt?ptrTimeLabel(saved.updatedAt):"earlier"} · shows on every bus with this repair</p>
      </div>}
  </section>
 </div>;
}

/* The Defect Log's own `timeLabel`, BYTE FOR BYTE, so this extraction is
   provably a refactor on that page rather than a refactor plus a date format
   nobody asked for. Copied rather than imported because importing a function
   out of a `page.tsx` is the one direction `docs/ARCHITECTURE.md` refuses.

   "Previous record" for an unparseable stamp reads oddly inside this sentence,
   and it is what the Defect Log already prints. Changing it is a separate
   decision from moving the panel. */
function ptrTimeLabel(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"Previous record"
  :new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date);
}
