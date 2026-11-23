"use client";

/* THE BUS PICKER, shared by the Defect Log and the Down Sheet's editor.

   ONE BOX NOW, and it is the same control the category and the defect are
   picked with. Curtis's B, from the mockups: the bus used to be three things
   stacked — BUS GENERATIONS chips, a BUS LIST drop-down and a TYPE BUS # box —
   about a third of a phone screen before the defect was even named. He was
   clear about the one thing it must not lose: "I don't want to get rid of the
   flexibility of typing in the bus number."

     TAP BUS        the generations open as rows — 15s, 17s, 18s, 20s, each
                    with how many buses are behind it — and a row opens its
                    buses. A fleet with one generation opens straight on its
                    buses. No keyboard.
     TAP AGAIN      or TYPE: the number pad. A full fleet number picks the bus
                    by itself, because the number pad has no Enter key.
     PICKED         the box reads "Bus 17507 · Main Garage". Tap it to change.
                    Given `onLocation` (the Log Defect form), the place is a
                    button of its own instead: "Bus 17507  [Main Garage]",
                    and tapping the place opens the move window.

   It is ComboField rather than a second copy of its keyboard rules, which were
   fixed twice by a cold read in one day; a bus box with its own copy would
   have needed both fixes again.

   The generations are the first two digits of the fleet number — the four this
   property runs, plus any other prefix actually in the fleet, so one 16xxx bus
   adds a 16s row rather than vanishing. */

import {memo,useMemo,useRef} from "react";

import {locationLabel,shortLocationLabel} from "@/src/lib/fleet/location-label";
import {busGeneration,busPickerDisplay,exactBus,generationLabel,searchBuses,type SearchableBus} from "@/src/lib/fleet/bus-search";
import ComboField,{type ComboOption} from "./combo-field";
import "./bus-selector.css";

/* ONE COLLATOR FOR THE LIFE OF THE PAGE, not one per sort. Measured on 84
   buses: 0.439ms a sort with localeCompare, 0.017ms through a collator made
   once. Numeric collation is what keeps 17509 before 175010. */
const COLLATOR=new Intl.Collator(undefined,{numeric:true});

/* Structurally typed rather than importing either page's bus: the picker needs
   an id, a number and a location, and neither surface should have to reshape
   its records to use it. */
export type PickerBus=SearchableBus;

/* MEMOISED, because the form around it redraws on every character typed in any
   other field and its props — the fleet, the chosen bus id, one callback — do
   not move while somebody types a sentence into DETAILS. The callback has to be
   stable for this to bite; see the useCallback where it is passed. */
/* `coach` names this box for the step-by-step helper to ring. */
/* `onLocation`: THE PLACE IS A BUTTON. Curtis, finding a bus in bay 12 that
   the board still had in CNG East: "if I press the location where it says CNG
   East, that I could select where the bus is right now or where I'm going to
   put it ... all the while preserving the last location". The caller opens its
   move window; the move itself records where the bus came from. */
/* `placeholder`: the Log Defect form passes Curtis's own words for its box.
   The Down Sheet passes none and keeps the old ones. */
function BusSelector({fleet,busId,select,coach,onLocation,placeholder="Tap to pick a bus"}:{fleet:PickerBus[];busId:string;select:(busId:string)=>void;coach?:string;onLocation?:(busId:string)=>void;placeholder?:string}){
 const selected=fleet.find(bus=>bus.id===busId);
 const place=selected?shortLocationLabel(selected.l,"Set location"):"";
 /* THE FLEET DECIDES THESE, AND THE FLEET IS NOT WHAT CHANGES WHILE SOMEBODY
    TYPES. Sorted once per fleet; the picker only asks for rows while its list
    is open. */
 /* By generation first, then number: a numeric sort alone puts a four-digit
    1750 before 15502, and the 17s row would come up above the 15s. */
 const sorted=useMemo(()=>[...fleet].sort((a,b)=>COLLATOR.compare(busGeneration(a.n),busGeneration(b.n))||COLLATOR.compare(a.n,b.n)),[fleet]);
 /* The bus typing let go of, until a pick replaces it or a cancel gives it back. */
 const letGo=useRef("");
 const toOption=(bus:PickerBus,section?:string):ComboOption=>({value:bus.id,label:"Bus "+bus.n,hint:bus.l?locationLabel(bus.l):undefined,section});
 return <ComboField label="BUS" className="wide bus-combo" coach={coach} browseFirst typeAs="numeric"
  value={busId}
  display={selected?(onLocation?"Bus "+selected.n:busPickerDisplay(selected)):""}
  /* In the Tab order, unlike the box's × and arrow: moving the bus is a thing
     of its own that a keyboard has no other way to reach from here. */
  addon={onLocation&&selected?<button type="button" className="bus-place"
   aria-label={"Bus "+selected.n+" is at "+locationLabel(selected.l)+". Move it."}
   title={"Move bus "+selected.n}
   onMouseDown={event=>event.preventDefault()}
   onClick={()=>onLocation(selected.id)}>{place}</button>:undefined}
  placeholder={placeholder}
  emptyText={fleet.length?"No bus has that number":"No buses on the board yet"}
  /* Browsing, the generation is each row's section, so the list opens on one
     title per generation with its count. Typing, the rows are flat and ranked. */
  search={query=>query.trim()
   ?searchBuses(sorted,query).map(bus=>toOption(bus))
   :sorted.map(bus=>toOption(bus,generationLabel(busGeneration(bus.n))))}
  /* TYPING OVER A BUS LETS IT GO, as TYPE BUS # always did: a number that is
     not a bus leaves no bus chosen, and the save says so, rather than keeping
     the old one under the new number (CodeRabbit on PR 54). Opening the list
     or backing out of it keeps the bus. */
  onType={()=>{if(busId){letGo.current=busId;select("")}}}
  /* Backed out without picking - Escape, LIST, the arrow or a tap away - the
     bus typing let go of comes back (SDET review, BT54-F7). */
  onCancel={()=>{const back=letGo.current;letGo.current="";if(back&&!busId&&fleet.some(bus=>bus.id===back))select(back)}}
  exactPick={query=>{const bus=exactBus(fleet,query);return bus?toOption(bus):null}}
  onPick={id=>{letGo.current="";select(id)}}/>;
}

export default memo(BusSelector);
