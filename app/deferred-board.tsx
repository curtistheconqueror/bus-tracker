"use client";

/* DEFERRED, on the Down Sheet, directly under MYSTERY BUSES.

   MYSTERY BUSES is "this bus is on property and nothing on the sheet says why"
   — the list somebody walking the yard with a clipboard needs. DEFERRED is a
   different shape and this board used to describe itself as the same one.

   A DEFERRED BUS DOES NOT HAVE TO BE ON PROPERTY. Curtis: "deferred buses do
   not have to be on property, so this way on the Down Sheet right under mystery
   buses it will show the total of deferred buses whether they're here or on the
   road." A deferred bus is one that is NOT on the Down Sheet and that somebody
   is trying to get fixed — and a bus out on a run all afternoon is exactly the
   one most easily forgotten, so leaving it out would empty the list of the
   entries it is most needed for.

   The counting has always been right: heldDeferredRows never looked at a
   location, only at whether the repair is deferred and the bus is off the
   sheet. It was the SUBTITLE that said "ON PROPERTY", which is worse than a
   wrong number — a number somebody would have questioned, whereas a label
   invites the next person to "fix" the code to match it. There is a test on
   the rule now for that reason.

   Where the two boards do still meet: one of the mysteries is very often a bus
   somebody deferred hours ago and nobody wrote down.

   They stay separate rather than merging, and that is the point: a mystery is
   unexplained and a deferral is a decision. RECOMMENDED FOR DOWN SHEET sits
   under both and is a third thing again — a bus somebody has put forward and
   nobody has ruled on, which can sit there for a while quite legitimately.
   Curtis drew that line himself: "the distinction is with the recommended for
   down sheet, because that bus could be in that status for a while, which is
   fine." Folding them together would take
   the one thing MYSTERY BUSES is for — that nobody knows — and dilute it with
   buses whose reason is on record. Sitting one under the other, the reader can
   cross off the mysteries that are only deferrals without losing either list.

   Same shape and the same stylesheet classes as MYSTERY BUSES on purpose:
   Curtis asked for "the same look and style of the button", and a second board
   that looked like a different kind of thing would read as a different kind of
   thing. */

import {useMemo,useState} from "react";
import {busDeferredMinutes,heldDeferredBuses} from "./deferred-counts";
import TimeWindowChips from "./time-window-chips";
import {withinTimeWindow,type TimeWindowKey} from "./time-window";
/* defectLabel already reads "Category — Issue"; prefixing repairCategoryLabel
   printed the category twice ("Lighting — Lighting — Headlight out"). */
import {deferredMinutesElapsed,defectLabel} from "./repair-catalog";
import {mysteryLocationLabel} from "./mystery-board";
import type {DefectLogDownEntry,DefectLogFleetBus} from "./defect-log/defect-log-sync";
import type {StructuredDefect} from "./repair-catalog";

export const DEFERRED_BOARD_COLLAPSED_KEY="pace-down-sheet-deferred-collapsed-v1";

/* The repair whose label the card prints: the one actually held longest, with
   an undated repair used only when nothing else is available. Same ordering as
   leadMinutes, so the sentence and the clock beside it describe one repair. */
function leadDefect(defects:StructuredDefect[],now:Date){
 const dated=defects.filter(defect=>deferredMinutesElapsed(defect,now)!==null);
 if(!dated.length)return defects[0];
 return dated.reduce((oldest,defect)=>(deferredMinutesElapsed(defect,now) as number)>(deferredMinutesElapsed(oldest,now) as number)?defect:oldest);
}

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
 /* Not named `window`: this is a client component, and shadowing the global
    inside a file that may later reach for localStorage is a trap laid for
    somebody else. */
 const [windowKey,setWindowKey]=useState<TimeWindowKey>("all");
 /* COLLAPSING CLEARS THE WINDOW. The chips and the N HIDDEN button live
    inside the collapse; the header count does not. So a board collapsed while
    narrowed showed a reduced number with nothing on screen saying it was
    reduced — and both boards are collapsed by DEFAULT, which makes that the
    resting state rather than an edge. Found by review and measured: three held
    buses, narrowed to one, collapsed, the header still read 1.

    An effect rather than a line in the toggle's onClick, because the page owns
    `collapsed` and restores it from storage on mount; this covers every route
    into the collapsed state, not just the button. Clearing rather than showing
    the unfiltered total, so that expanding never changes the number under
    somebody's eyes either. */
 /* Derived, NOT an effect. An effect runs after the commit, so collapsing
    while narrowed rendered one frame with the reduced count still showing —
    measured at 2 where the board holds 3. Reading it through the collapse
    makes the two impossible to disagree at any point. */
 const activeWindow:TimeWindowKey=collapsed?"all":windowKey;
 const all=useMemo(()=>heldDeferredBuses(fleet,downEntries),[fleet,downEntries]);
 /* The LONGEST-held repair on the bus decides, which is the same repair the
    card already prints its time from. Taking the newest instead would let a
    bus held since Monday reappear in "the last hour" because somebody deferred
    a second repair on it this morning — the bus has been standing since
    Monday, and that is the fact this list is for. */
 const buses=all.filter(group=>withinTimeWindow(busDeferredMinutes(group.defects,now),activeWindow));
 return <section className={"mystery-board deferred-board"+(collapsed?" collapsed":"")} aria-label="Deferred buses">
  <header className="mystery-head"><span><b>DEFERRED BUSES</b><small>HELD BACK AND NOT ON THE DOWN SHEET — HERE OR ON THE ROAD</small></span>
   <div className="mystery-header-actions"><strong>{buses.length}</strong>
    <button className="mystery-toggle" type="button" aria-expanded={!collapsed} onClick={()=>onCollapsedChange(!collapsed)} aria-label={(collapsed?"Expand":"Collapse")+" DEFERRED BUSES"}>{collapsed?"+":"−"}</button>
   </div>
  </header>
  {/* Inside the collapse, so a collapsed board stays one line. */}
  {!collapsed&&all.length>0&&<TimeWindowChips value={windowKey} onChange={setWindowKey} hidden={all.length-buses.length} label="deferred buses"/>}
  {!collapsed&&(buses.length?<div className="mystery-list">{buses.map(({bus,defects})=>{
   /* The longest-held repair leads the card, so the time shown is how long this
      bus has actually been standing rather than whichever defect sorted first. */
   const lead=leadDefect(defects,now);
   const minutes=busDeferredMinutes(defects,now);
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
   </article>})}</div>:<div className="mystery-empty">{all.length?<><b>Nothing this recent.</b><span>{all.length} deferred bus{all.length===1?" is":"es are"} being held back, all outside this window.</span></>:<><b>Nothing is being held back.</b><span>No bus is deferred off the sheet right now.</span></>}</div>)}
 </section>;
}
