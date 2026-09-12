"use client";

/* RECOMMENDED FOR DOWN SHEET, the third board, directly under DEFERRED BUSES.

   Curtis asked for it in the same breath as the other two: "a recommended for
   down sheet right in the same section as in the down sheet as mystery buses
   and deferred buses. I want this to go right under both of them, same color
   and everything, same functionality, with the same number count."

   So it is the same component shape and the same stylesheet classes as the two
   boards above it, for the reason MYSTERY and DEFERRED already share them: a
   third board that looked like a different kind of thing would read as a
   different kind of thing. Three boards, one after another, answering one
   question between them — what is this sheet not covering, and why.

   WHAT MAKES IT THE THIRD AND NOT A REPEAT OF THE SECOND. A mystery is
   unexplained. A deferral is a decision, with a clock running on it. A
   recommendation is a QUESTION somebody has asked and nobody has answered, and
   waiting is not a failure — Curtis: "that bus could be in that status for a
   while, which is fine." That is the whole reason nothing here goes overdue,
   nothing flashes, and the elapsed time is reported rather than judged. The
   DEFERRED board turns a badge red at ninety minutes; this one deliberately
   never does.

   The counting rules, and why an already-on-the-sheet bus is not listed, are in
   recommended-counts.ts beside the code that applies them. */

import {useMemo,useState} from "react";
import {recommendedBuses,busRecommendedMinutes} from "./recommended-counts";
import TimeWindowChips from "./time-window-chips";
import {withinTimeWindow,type TimeWindowKey} from "./time-window";
import {elapsedLong} from "./elapsed-label";
/* defectLabel already reads "Category — Issue"; prefixing repairCategoryLabel
   printed the category twice, the same trap the DEFERRED board hit. */
import {defectLabel,workStateStampLabel} from "./repair-catalog";
import {mysteryLocationLabel} from "./mystery-board";
import type {DefectLogDownEntry,DefectLogFleetBus} from "./defect-log/defect-log-sync";
import type {StructuredDefect} from "./repair-catalog";

export const RECOMMENDED_BOARD_COLLAPSED_KEY="pace-down-sheet-recommended-collapsed-v1";

export default function RecommendedBoard({fleet,downEntries,collapsed,onCollapsedChange,onAnswer,busy}:{
 fleet:DefectLogFleetBus[];
 downEntries:DefectLogDownEntry[];
 collapsed:boolean;
 onCollapsedChange:(collapsed:boolean)=>void;
 /* The page owns its fleet and its save path, so the answer is handed back
    rather than written here — the same contract DeferredBoard's onAnswer and
    MysteryBoard's onMoved have, for the same reason: a refused write has to be
    reported by the page. */
 onAnswer:(busId:string,defects:StructuredDefect[],action:"downsheet"|"dismiss")=>void;
 busy?:boolean;
}){
 const now=new Date();
 /* Not named `window`, for the same reason DeferredBoard's is not. */
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
 const all=useMemo(()=>recommendedBuses(fleet,downEntries),[fleet,downEntries]);
 /* Judged on the LONGEST wait on the bus, the same number the card prints —
    so "the last 24 hours" means the bus has been waiting less than a day, not
    that somebody added a second recommendation to a week-old one this
    morning. This board reaches 3D and 7D in normal use where DEFERRED never
    does; Curtis: "that bus could be in that status for a while, which is
    fine." */
 const buses=all.filter(group=>withinTimeWindow(busRecommendedMinutes(group.defects,now),activeWindow));
 return <section className={"mystery-board recommended-board"+(collapsed?" collapsed":"")} aria-label="Buses recommended for the Down Sheet">
  <header className="mystery-head"><span><b>RECOMMENDED FOR DOWN SHEET</b><small>PUT FORWARD BY SOMEBODY, NOT RULED ON YET</small></span>
   <div className="mystery-header-actions"><strong>{buses.length}</strong>
    <button className="mystery-toggle" type="button" aria-expanded={!collapsed} onClick={()=>onCollapsedChange(!collapsed)} aria-label={(collapsed?"Expand":"Collapse")+" RECOMMENDED FOR DOWN SHEET"}>{collapsed?"+":"−"}</button>
   </div>
  </header>
  {/* Inside the collapse, so a collapsed board stays one line. */}
  {!collapsed&&all.length>0&&<TimeWindowChips value={windowKey} onChange={setWindowKey} hidden={all.length-buses.length} label="recommended buses"/>}
  {!collapsed&&(buses.length?<div className="mystery-list">{buses.map(({bus,defects})=>{
   /* Already sorted longest-waiting first inside the bus, so the lead repair is
      the one that has been waiting longest rather than whichever the fleet
      happened to list first. */
   const lead=defects[0];
   const minutes=busRecommendedMinutes(defects,now);
   /* Who asked, where the record knows. On a board whose whole job is "somebody
      put this forward", the somebody is worth printing. */
   const asked=workStateStampLabel(lead?.downSheetRecommendation);
   return <article className="mystery-card recommended-card" key={bus.id}>
    <div className="mystery-card-main">
     <span className="mystery-number"><small>BUS</small><b>{bus.n}</b></span>
     <span className="mystery-detail"><b>{mysteryLocationLabel(bus.l)}</b><small>{lead?defectLabel(lead):"Recommended"}{defects.length>1?" +"+(defects.length-1)+" more":""}</small></span>
     <span className="mystery-badges">{minutes!==null&&<i>{elapsedLong(minutes)} WAITING</i>}{asked&&<i>{asked.toUpperCase()}</i>}</span>
    </div>
    {/* The two answers a recommendation can get, and no third: put it on the
        sheet, or take it back off the list. Deliberately NOT the DEFERRED
        board's RETURN TO SERVICE — a recommendation never took the bus out of
        service, so there is nothing to return it to. */}
    <div className="deferred-card-actions">
     <button type="button" className="deferred-to-sheet" disabled={busy} onClick={()=>onAnswer(bus.id,defects,"downsheet")}>+ PUT ON DOWN SHEET</button>
     <button type="button" className="deferred-return" disabled={busy} onClick={()=>{if(confirm("Take Bus "+bus.n+" off RECOMMENDED FOR DOWN SHEET? The repair"+(defects.length===1?"":"s")+" stay open on the Defect Log — only the recommendation is withdrawn."))onAnswer(bus.id,defects,"dismiss")}}>NOT FOR THE SHEET</button>
    </div>
   </article>})}</div>:<div className="mystery-empty">{all.length?<><b>Nothing this recent.</b><span>{all.length} bus{all.length===1?" is":"es are"} waiting on a decision, all outside this window.</span></>:<><b>Nothing is waiting on a decision.</b><span>No open repair is recommended for the sheet right now.</span></>}</div>)}
 </section>;
}
