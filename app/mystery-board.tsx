"use client";

/* MYSTERY BUSES, and the location editor it opens.

   The board used to live on the Defect Log and now sits on the Down Sheet,
   which is where it belongs: every bus it lists is a bus that is NOT on the
   sheet, and the foreman reading the sheet is the one who needs to know a bus
   is sitting in a work area unaccounted for.

   It is a component rather than a block of JSX moved across because the move
   modal did not move with it — the Defect Log still opens the same editor from
   its deferred quick-filter drawer, and two copies of that form would drift.

   The panel's styles live in `globals.css` for the same reason: it is the one
   stylesheet both pages load. */

import {useEffect,useMemo,useState,type FormEvent} from "react";
import {defectLabel,type StructuredDefect} from "./repair-catalog";
import {moveBusToArea,RELOCATION_AREAS,sectionForLocation} from "./facility-areas";
import {lockPageScroll} from "./scroll-lock";
import {bay12AwarenessBusIds,mysteryBusIds} from "./mystery-buses";

/* The board's collapsed state kept its Defect Log name on purpose. The key is
   what a device already has written down, and renaming one silently orphans
   whatever it held — a foreman who had this panel collapsed would find it open
   again with no way to tell why. The name records where the panel used to be;
   the value is still "is this panel collapsed". */
export const MYSTERY_COLLAPSED_KEY="pace-defect-log-mystery-collapsed-v1";

/* The board needs more of a defect than it used to. It showed a COUNT and a
   two-item preview; now a card opens, so it prints each repair — which means
   the fields defectLabel reads have to be here rather than the three the
   preview needed. Still structurally typed rather than importing the page's bus
   type, so the Defect Log and the Down Sheet can both hand theirs over. */
export type MysteryBoardBus={
 id:string;n:string;l:string;s:string;
 bay12Watch?:boolean;
 pendingRepair?:string;
 defects?:Partial<StructuredDefect>[];
};

/* The boards' own name for the same function, kept so the three boards that
   import it do not all have to change; the label itself comes from the one
   copy that resolves a slot through the areas the move editor writes with. */
import {locationLabel as mysteryLocationLabel} from "./location-label";
export {mysteryLocationLabel};

export function MysteryMoveModal<T extends {id:string;n:string;l:string}>({bus,fleet,move,close}:{bus:T;fleet:T[];move:(area:string)=>boolean;close:()=>void}){
 const [area,setArea]=useState(""),currentArea=sectionForLocation(bus.l),choices=Object.entries(RELOCATION_AREAS).map(([name,slots])=>({name,current:slots.includes(bus.l),open:slots.filter(slot=>!fleet.some(item=>item.l===slot)).length}));
 useEffect(()=>lockPageScroll("mystery-location-open"),[]);
 const submit=(event:FormEvent)=>{event.preventDefault();if(area&&move(area))close()};
 return <div className="shade mystery-move-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><form className="mystery-move-modal" onSubmit={submit}><header className="mystery-move-head"><span><small>MYSTERY BUS</small><h2>Move Bus {bus.n}</h2></span><button type="button" onClick={close} aria-label="Close location editor">×</button></header><div><p><b>CURRENT LOCATION</b><span>{mysteryLocationLabel(bus.l)}</span></p><label>NEW FACILITY LOCATION<select autoFocus required value={area} onChange={event=>setArea(event.target.value)}><option value="">Choose a section</option>{choices.map(choice=><option value={choice.name} disabled={!choice.current&&!choice.open} key={choice.name}>{choice.name+(choice.current?" — CURRENT":choice.open?" — "+choice.open+" OPEN":" — FULL")}</option>)}</select></label><small>The bus moves to the first open space in that section. Its defects and Down Sheet membership are not changed.</small></div><footer className="mystery-move-actions"><button type="button" onClick={close}>CANCEL</button><button type="submit" disabled={!area||area===currentArea}>MOVE BUS</button></footer></form></div>;
}

function unresolved(bus:MysteryBoardBus){return (bus.defects||[]).filter(defect=>defect.state!=="completed")}

/* WHY A CARD OPENS AT ALL.

   The card already carried `cursor:pointer`, `border:0` and `text-align:left` —
   every property you give a button — on a <div> that did nothing. Curtis, on
   the board: "I can't click on any of them to get any other details about
   them." A row that looks pressable and is not is worse than one that looks
   inert, because the person tries it, gets nothing, and now distrusts the rest
   of the screen.

   It EXPANDS IN PLACE rather than opening the bus's page. The person reading
   this board is walking the facility with a phone, working down a list of buses
   nobody can account for; navigating away costs them their place in it. The
   repairs are printed straight onto the card and the list stays put. */
function defectLine(defect:Partial<StructuredDefect>){
 /* defectLabel wants a whole defect. A record written by an older version, or
    arriving from a device mid-upgrade, can be missing any of these — and a
    board that throws takes the whole Down Sheet down with it, which is how a
    bus hover once blanked the Facility Map. Filled in rather than trusted. */
 const whole={category:"",issue:"",details:"",operability:"unknown",state:"open",...defect} as StructuredDefect;
 const label=defectLabel(whole).trim();
 return label||"Repair recorded with no description";
}

function reportedOn(defect:Partial<StructuredDefect>){
 const at=Date.parse(String(defect.createdAt||defect.updatedAt||""));
 if(!Number.isFinite(at))return "";
 return new Date(at).toLocaleDateString([],{month:"short",day:"numeric"});
}

export default function MysteryBoard<T extends MysteryBoardBus>({fleet,activeDownBusIds,title,subtitle,collapsed,onCollapsedChange,onMoved,describe}:{
 fleet:T[];
 activeDownBusIds:string[];
 title:string;
 subtitle:string;
 collapsed:boolean;
 onCollapsedChange:(collapsed:boolean)=>void;
 /* The page owns its fleet, so the move is handed back rather than written
    here — the Down Sheet has a save path of its own and this must not go
    around it. Returning false leaves the modal open with the choice intact. */
 onMoved:(fleet:T[])=>boolean;
 describe?:(bus:T)=>string;
}){
 const [movingBusId,setMovingBusId]=useState("");
 /* One card open at a time. The list is read top to bottom while walking, and
    several open at once turns it back into the wall of text the collapse exists
    to prevent. */
 const [openBusId,setOpenBusId]=useState("");
 const mysteryIdSet=useMemo(()=>new Set(mysteryBusIds(fleet,activeDownBusIds)),[fleet,activeDownBusIds]);
 const awarenessIdSet=useMemo(()=>new Set(bay12AwarenessBusIds(fleet,activeDownBusIds)),[fleet,activeDownBusIds]);
 const buses=useMemo(()=>fleet.filter(bus=>mysteryIdSet.has(bus.id)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})),[fleet,mysteryIdSet]);
 const movingBus=fleet.find(bus=>bus.id===movingBusId)||null;
 const moveBus=(area:string)=>{
  if(!movingBus)return false;
  const result=moveBusToArea(fleet,movingBus.id,area);
  if(result.error)return false;
  return onMoved(result.fleet);
 };
 return <>
  <section className={"mystery-board"+(collapsed?" collapsed":"")} aria-label="Mystery buses">
   <header className="mystery-head"><span><b>{title}</b><small>{subtitle}</small></span><div className="mystery-header-actions"><strong>{buses.length}</strong><button className="mystery-toggle" type="button" onClick={()=>onCollapsedChange(!collapsed)} aria-expanded={!collapsed} aria-label={(collapsed?"Expand ":"Collapse ")+title}>{collapsed?"+":"−"}</button></div></header>
   {!collapsed&&(buses.length?<div className="mystery-list">{buses.map(bus=>{
    const defects=unresolved(bus),inLog=defects.some(defect=>defect.source==="defect-log"),onDownSheet=activeDownBusIds.includes(bus.id);
    const preview=describe?describe(bus):(defects.length?defects.length+" open defect"+(defects.length===1?"":"s"):"No known defects logged");
    const open=openBusId===bus.id;
    return <article className={"mystery-card"+(awarenessIdSet.has(bus.id)?" bay12-awareness":"")+(open?" open":"")} key={bus.id}>
     {/* A real <button>, which is what the styling already assumed. Keyboard,
         focus ring and screen-reader role all arrive with the element rather
         than having to be bolted onto a div with a click handler. */}
     <button className="mystery-card-main" type="button" aria-expanded={open} aria-controls={"mystery-detail-"+bus.id} onClick={()=>setOpenBusId(open?"":bus.id)}>
      <span className="mystery-number"><small>BUS</small><b>{bus.n}</b></span><span className="mystery-detail"><b>{mysteryLocationLabel(bus.l)}</b><small>{preview}</small></span>
      <span className="mystery-badges">{bus.s==="unknown"&&<i>UNKNOWN</i>}{awarenessIdSet.has(bus.id)&&<i>BAY 12</i>}{!onDownSheet&&<i>NOT ON DOWN SHEET</i>}{inLog&&<i>DEFECT LOG</i>}</span>
      <span className="mystery-chevron" aria-hidden="true">{open?"\u2212":"+"}</span>
     </button>
     <div className="mystery-card-detail" id={"mystery-detail-"+bus.id} hidden={!open}>
      {defects.length
       ?<ul className="mystery-defect-list">{defects.map((defect,index)=>{
         const on=reportedOn(defect);
         return <li key={String(defect.id||index)}>
          <b>{defectLine(defect)}</b>
          <small>{[defect.operability&&defect.operability!=="unknown"?String(defect.operability).toUpperCase():"",on?"Reported "+on:"",defect.reportedBy?"by "+defect.reportedBy:""].filter(Boolean).join(" \u00b7 ")||"No further detail recorded"}</small>
         </li>})}</ul>
       /* Not an error, and the wording says so. A mystery bus with no defects
          is the most interesting row on the board — it is on property with
          nothing at all explaining why — so this line is the answer to the
          question the person just asked, not an empty state. */
       :<p className="mystery-detail-none">Nothing is logged against this bus. It is on property with no repair on record and no Down Sheet entry.</p>}
      <p className="mystery-detail-where"><b>{mysteryLocationLabel(bus.l)}</b><span>{bus.pendingRepair?"Pending: "+bus.pendingRepair:"No pending repair noted"}</span></p>
     </div>
     <button className="mystery-move" type="button" onClick={()=>setMovingBusId(bus.id)} aria-label={"Update facility location for Bus "+bus.n}><span aria-hidden="true">↪</span> MOVE / LOCATION</button>
    </article>})}</div>:<div className="mystery-empty"><b>Nothing unaccounted for.</b><span>Every eligible on-site work-area bus is accounted for on the Down Sheet.</span></div>)}
  </section>
  {movingBus&&<MysteryMoveModal bus={movingBus} fleet={fleet} move={moveBus} close={()=>setMovingBusId("")}/>}
 </>;
}
