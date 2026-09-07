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
import {moveBusToArea,RELOCATION_AREAS,sectionForLocation} from "./facility-areas";
import {lockPageScroll} from "./scroll-lock";
import {bay12AwarenessBusIds,mysteryBusIds} from "./mystery-buses";

/* The board's collapsed state kept its Defect Log name on purpose. The key is
   what a device already has written down, and renaming one silently orphans
   whatever it held — a foreman who had this panel collapsed would find it open
   again with no way to tell why. The name records where the panel used to be;
   the value is still "is this panel collapsed". */
export const MYSTERY_COLLAPSED_KEY="pace-defect-log-mystery-collapsed-v1";

export type MysteryBoardBus={
 id:string;n:string;l:string;s:string;
 bay12Watch?:boolean;
 pendingRepair?:string;
 defects?:{id?:string;state?:string;source?:string}[];
};

export function mysteryLocationLabel(location:string){
 const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["offsite-","Off Property"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["office-","Foreman Office"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];
 const found=labels.find(([prefix])=>location.startsWith(prefix));return found?found[1]:location||"Location not set";
}

export function MysteryMoveModal<T extends {id:string;n:string;l:string}>({bus,fleet,move,close}:{bus:T;fleet:T[];move:(area:string)=>boolean;close:()=>void}){
 const [area,setArea]=useState(""),currentArea=sectionForLocation(bus.l),choices=Object.entries(RELOCATION_AREAS).map(([name,slots])=>({name,current:slots.includes(bus.l),open:slots.filter(slot=>!fleet.some(item=>item.l===slot)).length}));
 useEffect(()=>lockPageScroll("mystery-location-open"),[]);
 const submit=(event:FormEvent)=>{event.preventDefault();if(area&&move(area))close()};
 return <div className="shade mystery-move-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><form className="mystery-move-modal" onSubmit={submit}><header className="mystery-move-head"><span><small>MYSTERY BUS</small><h2>Move Bus {bus.n}</h2></span><button type="button" onClick={close} aria-label="Close location editor">×</button></header><div><p><b>CURRENT LOCATION</b><span>{mysteryLocationLabel(bus.l)}</span></p><label>NEW FACILITY LOCATION<select autoFocus required value={area} onChange={event=>setArea(event.target.value)}><option value="">Choose a section</option>{choices.map(choice=><option value={choice.name} disabled={!choice.current&&!choice.open} key={choice.name}>{choice.name+(choice.current?" — CURRENT":choice.open?" — "+choice.open+" OPEN":" — FULL")}</option>)}</select></label><small>The bus moves to the first open space in that section. Its defects and Down Sheet membership are not changed.</small></div><footer className="mystery-move-actions"><button type="button" onClick={close}>CANCEL</button><button type="submit" disabled={!area||area===currentArea}>MOVE BUS</button></footer></form></div>;
}

function unresolved(bus:MysteryBoardBus){return (bus.defects||[]).filter(defect=>defect.state!=="completed")}

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
    return <article className={"mystery-card"+(awarenessIdSet.has(bus.id)?" bay12-awareness":"")} key={bus.id}>
     <div className="mystery-card-main">
      <span className="mystery-number"><small>BUS</small><b>{bus.n}</b></span><span className="mystery-detail"><b>{mysteryLocationLabel(bus.l)}</b><small>{preview}</small></span>
      <span className="mystery-badges">{bus.s==="unknown"&&<i>UNKNOWN</i>}{awarenessIdSet.has(bus.id)&&<i>BAY 12</i>}{!onDownSheet&&<i>NOT ON DOWN SHEET</i>}{inLog&&<i>DEFECT LOG</i>}</span>
     </div>
     <button className="mystery-move" type="button" onClick={()=>setMovingBusId(bus.id)} aria-label={"Update facility location for Bus "+bus.n}><span aria-hidden="true">↪</span> MOVE / LOCATION</button>
    </article>})}</div>:<div className="mystery-empty"><b>Nothing unaccounted for.</b><span>Every eligible on-site work-area bus is accounted for on the Down Sheet.</span></div>)}
  </section>
  {movingBus&&<MysteryMoveModal bus={movingBus} fleet={fleet} move={moveBus} close={()=>setMovingBusId("")}/>}
 </>;
}
