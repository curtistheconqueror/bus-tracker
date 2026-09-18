"use client";

/* THE BUS PICKER, shared.

   Lifted out of the Defect Log unchanged, because the Down Sheet's own "add a
   bus" was a bare <select> over the fleet with no way to type a number at all —
   and the Defect Log had already solved that, twice over, with generation chips
   and a typed box backed by a datalist.

   Copying it across would have made two of them, and this project has paid for
   duplicated logic more than once: five copies of the location table, all five
   carrying the same bug, and two road-call records that had quietly drifted
   apart. So there is one, and both surfaces import it.

   The only things made configurable are the two that genuinely differ: the
   datalist id, because two of these on one page would otherwise share an id,
   and autoFocus, because the Down Sheet's editor opens with other fields above
   this one and stealing focus there moves the page under somebody's thumb. */

import {useEffect,useState} from "react";

import {locationLabel} from "@/src/lib/fleet/location-label";
import "./bus-selector.css";

/* Structurally typed rather than importing either page's bus: the picker needs
   an id, a number and a location, and neither surface should have to reshape
   its records to use it. */
export type PickerBus={id:string;n:string;l:string};

/* The first two digits of a fleet number are its generation at this property —
   15xxx, 17xxx, 18xxx, 20xxx. Lives here with the chips it draws rather than on
   either page, which is where it was. */
export function busGeneration(number:string){const value=String(number??"").slice(0,2);return /^\d{2}$/.test(value)?value:"OTHER"}

function generationLabel(value:string){return value==="OTHER"?"OTHER":value+"s"}
export default function BusSelector({fleet,busId,select,listId="bus-number-options",autoFocus=true}:{fleet:PickerBus[];busId:string;select:(busId:string)=>void;listId?:string;autoFocus?:boolean}){
 const selected=fleet.find(bus=>bus.id===busId),standard=["15","17","18","20"],available=[...new Set(fleet.map(bus=>busGeneration(bus.n)))],generations=[...standard,...available.filter(value=>!standard.includes(value)).sort()];
 const [generation,setGeneration]=useState(selected?busGeneration(selected.n):"");
 const [number,setNumber]=useState(selected?.n||"");
 useEffect(()=>{const bus=fleet.find(item=>item.id===busId);if(bus){setNumber(bus.n);setGeneration(busGeneration(bus.n))}},[busId,fleet]);
 const candidates=[...fleet].filter(bus=>!generation||busGeneration(bus.n)===generation).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true}));
 const chooseGeneration=(next:string)=>{setGeneration(next);const current=fleet.find(bus=>bus.id===busId);if(current&&busGeneration(current.n)!==next)select("");if(!number.startsWith(next))setNumber("")};
 const typeNumber=(raw:string)=>{const digits=raw.replace(/\D/g,"");setNumber(digits);const prefix=digits.slice(0,2);if(digits.length>=2&&generations.includes(prefix))setGeneration(prefix);const exact=fleet.find(bus=>bus.n===digits);select(exact?.id||"")};
 const chooseBus=(id:string)=>{const bus=fleet.find(item=>item.id===id);select(id);setNumber(bus?.n||"");if(bus)setGeneration(busGeneration(bus.n))};
 /* Two boxes, because the old single box was called BUS NUMBER and the first
    thing in it was a row of generations. The chips narrow the fleet; the number
    names one bus. Naming each box for what it does is the whole change.

    They stay wired the way they always were - a generation filters the list AND
    the type-ahead, typing a number lights its generation, picking from the list
    fills the number - so the split is what a person reads, not what the code
    does. */
 return <>
  <fieldset className="wide bus-picker bus-picker-generations"><legend>BUS GENERATIONS</legend>
   <div className="bus-generations" aria-label="Bus generation">{generations.map(value=><button type="button" className={generation===value?"active":""} aria-pressed={generation===value} onClick={()=>chooseGeneration(value)} key={value}>{generationLabel(value)}</button>)}</div>
   <small>{generation?candidates.length+" buses in "+generationLabel(generation):"Narrows the bus list below. Skip it if you know the number."}</small>
  </fieldset>
  <fieldset className="wide bus-picker bus-picker-number"><legend>BUS NUMBER</legend>
   <div className="bus-picker-fields">
    <label>BUS LIST<select value={busId} disabled={!generation} onChange={event=>chooseBus(event.target.value)}><option value="">{generation?"Choose a "+generationLabel(generation)+" bus":"Choose generation first"}</option>{candidates.map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n} - {locationLabel(bus.l)}</option>)}</select></label>
    {/* The typed number is the way in that gets used, so it is the biggest
        thing in the form and it reads in the page's own text colour rather
        than the muted grey every other field uses. */}
    <label className="type-bus-number">TYPE BUS #<input autoFocus={autoFocus} inputMode="numeric" value={number} onChange={event=>typeNumber(event.target.value)} list={listId} placeholder="Enter full bus number"/><datalist id={listId}>{candidates.map(bus=><option value={bus.n} key={bus.id}/>)}</datalist></label>
   </div>
   {/* The list is disabled until a generation is picked, and that control now
       lives in the box above, so the reason has to be said here or it reads as
       broken. */}
   {!generation&&<small>Pick a generation above to use the bus list, or type the full number.</small>}
  </fieldset>
 </>;
}
