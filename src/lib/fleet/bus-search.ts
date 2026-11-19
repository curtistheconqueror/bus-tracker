/* WHAT THE BUS BOX FINDS, and how it names a bus. No JSX, no storage: the
   picker in `src/components/shared/bus-selector.tsx` draws it, and anything else
   that needs to find a bus by the number somebody typed can call the same rule.

   A bus is found by its FLEET NUMBER, the one name every device agrees on. */

import {locationLabel} from "./location-label.ts";

export type SearchableBus={id:string;n:string;l:string};

/* The first two digits of a fleet number are its generation at this property —
   15xxx, 17xxx, 18xxx, 20xxx. A number that does not start with two digits has
   none, and is filed under OTHER rather than dropped. */
export function busGeneration(number:string){const value=String(number??"").slice(0,2);return /^\d{2}$/.test(value)?value:"OTHER"}
export function generationLabel(value:string){return value==="OTHER"?"OTHER":value+"s"}

/* "Bus 17507 · Main Garage": what the box reads once a bus is chosen. The
   location goes through locationLabel, never a prefix, so TROUBLE BAY 11 is
   not "Main Garage". */
export function busPickerDisplay(bus:SearchableBus){const where=locationLabel(bus.l);return "Bus "+bus.n+(where?" · "+where:"")}

/* WHAT TYPING FINDS. Digits match the fleet number — the start of it first,
   then anywhere in it — and anything typed that is not a digit is ignored, so
   "bus 175" finds what "175" finds. Nothing typed returns the list as given. */
export function searchBuses<T extends SearchableBus>(sorted:T[],query:string):T[]{
 const digits=String(query||"").replace(/\D/g,"");
 if(!digits)return sorted;
 const starts=sorted.filter(bus=>bus.n.startsWith(digits));
 const inside=sorted.filter(bus=>!bus.n.startsWith(digits)&&bus.n.includes(digits));
 return [...starts,...inside];
}

/* A FULL FLEET NUMBER IS THE BUS, picked without a tap: the number pad a phone
   raises for it has no Enter key to confirm with. Exactly one bus, or nothing —
   two sharing a number is a fleet problem and picking either is a guess — and
   not while a longer number still starts with it: with a 1750 and a 17507 in
   the fleet, picking at "1750" would take the box out from under somebody
   halfway through typing the other. */
export function exactBus<T extends SearchableBus>(fleet:T[],query:string):T|null{
 const digits=String(query||"").replace(/\D/g,"");
 if(!digits)return null;
 const matches=fleet.filter(bus=>bus.n===digits);
 if(matches.length!==1||fleet.some(bus=>bus.n!==digits&&bus.n.startsWith(digits)))return null;
 return matches[0];
}
