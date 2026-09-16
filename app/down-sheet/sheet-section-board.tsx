"use client";

import {locationLabel} from "../location-label";
import {downSheetReasonWords} from "./down-sheet-availability";
import type {DownSheetViewEntry} from "./down-sheet-view";

/* A SECTION OF THE DOWN SHEET THAT IS NOT A BAND.

   The four bands answer "where is this bus and who has it". These two answer
   something else — can it still run, and is a state inspection coming due — and
   a bus can be in any band and still be either. Curtis's three South Holland
   holds are the case that settles it: they are filed Vendor Repair, so a SOFT
   *band* would pull them out of OFF PROPERTY and lose where the bus is.

   So they are boards, sitting beside MYSTERY BUSES, DEFERRED and RECOMMENDED,
   which is the shape this page already uses for "here is a list worth having
   that is not the sheet itself". Collapsed by default for the same reason those
   are, and the reason Curtis gave for anything new here: "the default can be a
   minimum amount of options." */

export default function SheetSectionBoard<T extends DownSheetViewEntry&{id?:string;busId?:string}>({
 title,hint,entries,collapsed,onCollapsedChange,locations,className,action,
}:{
 title:string;
 hint:string;
 entries:T[];
 collapsed:boolean;
 onCollapsedChange:(collapsed:boolean)=>void;
 locations:Record<string,string>;
 className:string;
 /* The page owns the fleet and the save path, so a row's control is handed in
    rather than built here — the same contract the three boards above this one
    have, and for the same reason: only the page can report a refused write. */
 action?:(entry:T)=>React.ReactNode;
}){
 return <section className={"mystery-board "+className+(collapsed?" collapsed":"")} aria-label={title}>
  <header className="mystery-head"><span><b>{title}</b><small>{hint}</small></span>
   <div className="mystery-header-actions"><strong>{entries.length}</strong>
    <button className="mystery-toggle" type="button" aria-expanded={!collapsed} onClick={()=>onCollapsedChange(!collapsed)} aria-label={(collapsed?"Expand":"Collapse")+" "+title}>{collapsed?"+":"−"}</button>
   </div>
  </header>
  {!collapsed&&(entries.length?<div className="mystery-list">{entries.map(entry=>
   <article className="mystery-card sheet-section-card" key={entry.id||entry.busId||entry.busNumber}>
    <div className="mystery-card-main">
     <span className="mystery-bus"><small>BUS</small><b>{entry.busNumber}</b></span>
     <span className="mystery-detail">
      <b>{locationLabel(locations[entry.busId||""]||"")||"Location not set"}</b>
      {/* The row's own words, which is what somebody is scanning this list for —
          "HOLD FOR SOUTH HOLLAND, THEY ARE COMING WEDS 7AM" says more than any
          label this board could put in its place. */}
      <small>{downSheetReasonWords(entry)||"No reason written"}</small>
     </span>
    </div>
    {action?<div className="deferred-card-actions">{action(entry)}</div>:null}
   </article>)}
  </div>:<div className="mystery-empty"><b>Nothing here right now.</b></div>)}
 </section>;
}
