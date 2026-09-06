/* Road calls: a bus that broke down out on the road, and what the shop still
   needs to know about it a week later.

   A road call was already recorded in two places that could not answer any
   question about it. The Facility Map has a ROADCALL checkbox per bus, which
   says the bus is out on one RIGHT NOW and says nothing once it is back. And
   the fact itself got typed into a defect's description, where it could not be
   counted, filtered, or read off a card.

   So this is history rather than state: every road call is an EVENT, stamped
   with the moment it was recorded, appended to the bus and never rewritten.
   That is the same shape the odometer readings and maintenance events already
   use, for the same reason - a fleet question asked next month is answered from
   what was written down at the time.

   Two windows, and they are different on purpose:

   - The RECENT window is seven days. It is what shows on the Defect Log card
     and what the quick filter lists, because "which buses had a road call this
     week" is the question a foreman actually asks. A bus falls off the list on
     its own as its last road call ages past seven days; nothing is deleted to
     make that happen.

   - The BACKLOG is everything older. It stays on the bus forever. A bus that
     road-called four times in six months is a bus with a pattern, and that
     pattern is only visible because nothing threw the old ones away. */

import type {DurableRecord} from "./domain.ts";
import {moveBusToArea,RELOCATION_AREAS} from "./facility-areas.ts";
import type {MovableRepairBus} from "./smart-status.ts";

export type RoadCallEvent=DurableRecord&{
 /* When the road call was recorded. The event's own identity in time. */
 at:string;
 /* Who recorded it, when initials are set. Optional: a tick with no name is
    still a tick, the same rule the work states follow. */
 by?:string;
 /* The defect the tick came from, so a card can say which fault it was. */
 defectId?:string;
};

export const ROAD_CALL_WINDOW_DAYS=7;
const WINDOW_MS=ROAD_CALL_WINDOW_DAYS*24*60*60*1000;

/* Where a bus goes when it road-calls. It IS on the road at that moment, which
   is the whole meaning of the words, so the board should say so without
   somebody having to drag it there. */
export const ROAD_CALL_AREA="IN SERVICE / ON ROAD";

export type RoadCallBus={id:string;l?:string;roadcall?:boolean;roadCalls?:RoadCallEvent[]};

/* Read back whatever is stored, dropping only what cannot be a road call at
   all: an entry with no usable timestamp. Everything else is kept as written,
   including fields a later release adds, so an older device reading a newer
   board does not quietly strip them.

   Sorted newest first, because every reader here wants the latest one. */
export function normalizeRoadCalls(value:unknown):RoadCallEvent[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((candidate,index)=>{
  if(!candidate||typeof candidate!=="object")return [];
  const event=candidate as Partial<RoadCallEvent>&Record<string,unknown>;
  const at=String(event.at||"");
  if(Number.isNaN(new Date(at).getTime()))return [];
  return [{...event,id:String(event.id||"road-call-imported-"+index),at:new Date(at).toISOString()} as RoadCallEvent];
 }).sort((left,right)=>Date.parse(right.at)-Date.parse(left.at));
}

/* Append-only. A second road call on the same bus is a second event, never an
   overwrite of the first - two breakdowns in a week is exactly the thing the
   count exists to make visible. */
export function appendRoadCall(value:unknown,event:RoadCallEvent):RoadCallEvent[]{
 return normalizeRoadCalls([...normalizeRoadCalls(value),event]);
}

export function roadCallsWithin(value:unknown,now=new Date().toISOString(),days=ROAD_CALL_WINDOW_DAYS){
 const edge=new Date(now).getTime()-days*24*60*60*1000;
 return normalizeRoadCalls(value).filter(event=>Date.parse(event.at)>=edge);
}

/* The seven-day view, and everything behind it. Together they are always the
   whole list: the backlog is what the window does not show, not what was
   dropped. */
export function recentRoadCalls(value:unknown,now=new Date().toISOString()){return roadCallsWithin(value,now)}
export function roadCallBacklog(value:unknown,now=new Date().toISOString()){
 const edge=new Date(now).getTime()-WINDOW_MS;
 return normalizeRoadCalls(value).filter(event=>Date.parse(event.at)<edge);
}

export function latestRoadCall(value:unknown):RoadCallEvent|undefined{return normalizeRoadCalls(value)[0]}
/* The counter that runs in the background: every road call this bus has ever
   had, not just the ones still showing. */
export function roadCallCount(value:unknown){return normalizeRoadCalls(value).length}
export function hasRecentRoadCall(value:unknown,now=new Date().toISOString()){return recentRoadCalls(value,now).length>0}

/* What the card says. One road call reads as a date; more than one leads with
   the count, because two in a week is the finding and the date is the detail. */
export function roadCallNote(value:unknown,now=new Date().toISOString(),format=defaultStamp){
 const recent=recentRoadCalls(value,now);
 if(!recent.length)return "";
 const stamp=format(recent[0].at);
 return recent.length>1?"ROAD CALL ×"+recent.length+" · LATEST "+stamp:"ROAD CALL "+stamp;
}

function defaultStamp(at:string){
 const date=new Date(at);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date);
}

/* Recording a road call, everywhere it has to land at once.

   Three things are true the moment somebody ticks the box, and doing one
   without the others is how the board starts disagreeing with itself:

   1. It happened, and that is permanent - the event is appended.
   2. The bus is out on a road call now - the map's own flag goes on, so the
      orange badge and the pulsing dot appear where the shop is already used to
      looking for them.
   3. The bus is ON THE ROAD - so it is parked there, in whatever space is
      open, rather than sitting in a bay it physically is not in.

   The move goes through the same helper the relocation tools use, so the
   status follows the shop's existing rules rather than a second opinion: a bus
   with a downing defect parked on the road reads Out of Service, which is what
   a broken-down bus is.

   A full road lot is not a failure. The event and the flag still land, and the
   bus keeps its space - losing the record of a breakdown because 75 slots were
   taken would be far worse than a bus parked in the wrong place. */
export function applyRoadCall<T extends RoadCallBus&MovableRepairBus>(
 fleet:T[],busId:string,event:RoadCallEvent,areas:Record<string,string[]>=RELOCATION_AREAS,now=new Date().toISOString()
):{fleet:T[];moved:boolean;target:string}{
 const bus=fleet.find(item=>item.id===busId);
 if(!bus)return {fleet,moved:false,target:""};
 const recorded=fleet.map(item=>item.id===busId
  ?{...item,roadcall:true,roadCalls:appendRoadCall(item.roadCalls,event)}
  :item);
 const move=moveBusToArea(recorded,busId,ROAD_CALL_AREA,areas,now);
 if(move.error)return {fleet:recorded,moved:false,target:""};
 return {fleet:move.fleet,moved:!move.unchanged,target:move.target};
}
