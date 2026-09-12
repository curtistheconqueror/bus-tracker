"use client";

/* THE HOLD BADGE, AND THE LIST BEHIND IT.

   Curtis asked for the badge to look like the deferred alarm — "it can look
   just the same, maybe the colour can be different, but it could have that same
   look to it" — so it borrows .work-state-badge, which is what the deferred and
   DS REC badges already are. Amber rather than blue: a hold is somebody else's
   instruction sitting on this bus, which is a different kind of fact from
   anything the shop decided about it.

   PRESSING ONE SHOWS ALL OF THEM. Curtis: "pressing it on one bus, I wanted to
   show all the buses that are being held, and a time." So the badge is a
   button, not a label, and every badge on every screen opens the same list —
   which is also the only place the time appears. He was explicit that the time
   must not be on the badge: "don't just show the time of the expected arrival
   by default, you have to press it to see that information."

   The list is deliberately not a board on the Down Sheet. A held bus is often a
   bus with nothing wrong with it and nothing on the sheet, so it has no
   business in a list of things the sheet is not covering. */

import {useEffect} from "react";
import {heldBuses,holdDetailLabel,holdUntilLabel,heldMinutes,type HoldableBus} from "./bus-hold";
import {elapsedLong} from "./elapsed-label";
import {locationLabel} from "./location-label";
import {lockPageScroll} from "./scroll-lock";

export function HoldBadge({count,onOpen}:{count:number;onOpen:()=>void}){
 return <button type="button" className="work-state-badge bus-hold-badge"
  onClick={event=>{event.stopPropagation();onOpen()}}
  title={count===1?"1 bus is on hold. Press to see every held bus and its time.":count+" buses are on hold. Press to see every held bus and its time."}
  aria-label={"On hold. Show all "+count+" held bus"+(count===1?"":"es")}>HOLD</button>;
}

export default function HoldBoard<T extends HoldableBus&{l?:string}>({fleet,close,onRelease,busy}:{
 fleet:T[];
 close:()=>void;
 /* The page owns its fleet and its save path, so a release is handed back
    rather than written here — the same contract every other board on this app
    has, for the same reason: a refused write has to be reported by the page. */
 onRelease:(busId:string)=>void;
 busy?:boolean;
}){
 const now=new Date();
 const held=heldBuses(fleet,now);
 useEffect(()=>lockPageScroll("bus-hold-open"),[]);
 return <div className="shade bus-hold-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <div className="bus-hold-modal" role="dialog" aria-label="Buses on hold">
   <header className="bus-hold-head"><span><small>ON HOLD</small><h2>{held.length} BUS{held.length===1?"":"ES"}</h2></span>
    <button type="button" onClick={close} aria-label="Close the held bus list">×</button>
   </header>
   {held.length?<div className="bus-hold-list">{held.map(({bus,hold})=>{
    const minutes=heldMinutes(hold,now),until=holdUntilLabel(hold),detail=holdDetailLabel(hold);
    return <article className="bus-hold-row" key={bus.id||bus.n}>
     <span className="bus-hold-number"><small>BUS</small><b>{bus.n}</b></span>
     <span className="bus-hold-detail">
      <b>{locationLabel(bus.l)}</b>
      {/* The time, which exists only here. Blank when nobody set one, and
          saying so rather than leaving an empty line: Curtis asked for the
          time to be optional because "a person may not know it off hand", so
          "no time set" is a normal answer and not a gap. */}
      <small>{until||"NO TIME SET"}{detail?" · "+detail:""}</small>
     </span>
     <span className="bus-hold-elapsed">{minutes===null?"":elapsedLong(minutes)+" HELD"}</span>
     <button type="button" className="bus-hold-release" disabled={busy}
      onClick={()=>{if(confirm("Take Bus "+bus.n+" off hold?"))onRelease(String(bus.id||""))}}>TAKE OFF HOLD</button>
    </article>;
   })}</div>:<div className="bus-hold-empty"><b>No bus is on hold.</b><span>Put one on hold from its card on the Defect Log, or from the bus editor on the Facility Map.</span></div>}
  </div>
 </div>;
}
