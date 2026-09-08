"use client";

/* DEFERRED, on the Down Sheet, directly under MYSTERY BUSES.

   The two boards answer one question between them. MYSTERY BUSES is "this bus
   is on property and nothing on the sheet says why" — the list somebody walking
   the yard with a clipboard needs. A deferred bus is exactly that shape: held
   back, on property, deliberately NOT on the sheet. So one of the mysteries is
   very often a bus somebody deferred hours ago and nobody wrote down.

   They stay separate rather than merging, and that is the point: a mystery is
   unexplained and a deferral is a decision. Folding them together would take
   the one thing MYSTERY BUSES is for — that nobody knows — and dilute it with
   buses whose reason is on record. Sitting one under the other, the reader can
   cross off the mysteries that are only deferrals without losing either list.

   Same shape and the same stylesheet classes as MYSTERY BUSES on purpose:
   Curtis asked for "the same look and style of the button", and a second board
   that looked like a different kind of thing would read as a different kind of
   thing. */

import {useMemo} from "react";
import {heldDeferredBuses} from "./deferred-counts";
/* defectLabel already reads "Category — Issue"; prefixing repairCategoryLabel
   printed the category twice ("Lighting — Lighting — Headlight out"). */
import {deferredMinutesElapsed,defectLabel} from "./repair-catalog";
import {mysteryLocationLabel} from "./mystery-board";
import type {DefectLogDownEntry,DefectLogFleetBus} from "./defect-log/defect-log-sync";
import type {StructuredDefect} from "./repair-catalog";

export const DEFERRED_BOARD_COLLAPSED_KEY="pace-down-sheet-deferred-collapsed-v1";

function held(minutes:number|null){
 if(minutes===null)return "";
 const whole=Math.max(0,Math.round(minutes));
 return whole>=60?"HELD "+Math.floor(whole/60)+"H "+(whole%60)+"M":"HELD "+whole+"M";
}

export default function DeferredBoard({fleet,downEntries,collapsed,onCollapsedChange,onAnswer,busy}:{
 fleet:DefectLogFleetBus[];
 downEntries:DefectLogDownEntry[];
 collapsed:boolean;
 onCollapsedChange:(collapsed:boolean)=>void;
 /* The page owns its fleet and its save path, so the answer is handed back
    rather than written here — same contract MysteryBoard's onMoved has, for
    the same reason: a refused write has to be reported by the page. */
 onAnswer:(busId:string,defects:StructuredDefect[],action:"downsheet"|"return")=>void;
 busy?:boolean;
}){
 const now=new Date();
 const buses=useMemo(()=>heldDeferredBuses(fleet,downEntries),[fleet,downEntries]);
 return <section className={"mystery-board deferred-board"+(collapsed?" collapsed":"")} aria-label="Deferred buses">
  <header className="mystery-head"><span><b>DEFERRED BUSES</b><small>HELD BACK, ON PROPERTY, NOT ON THE DOWN SHEET</small></span>
   <div className="mystery-header-actions"><strong>{buses.length}</strong>
    <button className="mystery-toggle" type="button" aria-expanded={!collapsed} onClick={()=>onCollapsedChange(!collapsed)} aria-label={(collapsed?"Expand":"Collapse")+" DEFERRED BUSES"}>{collapsed?"+":"−"}</button>
   </div>
  </header>
  {!collapsed&&(buses.length?<div className="mystery-list">{buses.map(({bus,defects})=>{
   /* The longest-held repair leads the card, so the time shown is how long this
      bus has actually been standing rather than whichever defect sorted first. */
   const lead=[...defects].sort((a,b)=>String(a.deferredAt||"").localeCompare(String(b.deferredAt||"")))[0];
   const minutes=lead?deferredMinutesElapsed(lead,now):null;
   return <article className="mystery-card deferred-card" key={bus.id}>
    <div className="mystery-card-main">
     <span className="mystery-number"><small>BUS</small><b>{bus.n}</b></span>
     <span className="mystery-detail"><b>{mysteryLocationLabel(bus.l)}</b><small>{lead?defectLabel(lead):"Deferred"}{defects.length>1?" +"+(defects.length-1)+" more":""}</small></span>
     <span className="mystery-badges">{minutes!==null&&<i className={minutes>=90?"deferred-overdue":""}>{held(minutes)}</i>}</span>
    </div>
    {/* The two ways out, the same two the Defect Log offers, so a foreman who
        has learned one screen has learned both. PUT ON DOWN SHEET escalates it;
        RETURN TO SERVICE sends the bus back out with the repair still open. */}
    <div className="deferred-card-actions">
     <button type="button" className="deferred-to-sheet" disabled={busy} onClick={()=>onAnswer(bus.id,defects,"downsheet")}>+ PUT ON DOWN SHEET</button>
     <button type="button" className="deferred-return" disabled={busy} onClick={()=>{if(confirm("Send Bus "+bus.n+" back into service? The repair"+(defects.length===1?"":"s")+" stay open and it comes off DEFERRED."))onAnswer(bus.id,defects,"return")}}>RETURN TO SERVICE</button>
    </div>
   </article>})}</div>:<div className="mystery-empty"><b>Nothing is being held back.</b><span>No bus is deferred off the sheet right now.</span></div>)}
 </section>;
}
