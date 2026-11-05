export type DownSheetCounterBus={id:string;down?:boolean};

export function selectedDownSheetBusIds<T extends DownSheetCounterBus>(buses:T[]){
 return buses.filter(bus=>bus.down===true).map(bus=>bus.id);
}

export function reconcileDownSheetMembership<T extends DownSheetCounterBus>(buses:T[],activeDownSheetBusIds:Iterable<string>):T[]{
 const active=new Set(activeDownSheetBusIds),changed=buses.some(bus=>Boolean(bus.down)!==active.has(bus.id));
 if(!changed)return buses;
 return buses.map(bus=>({...bus,down:active.has(bus.id)}));
}

export function downSheetMembershipMatches<T extends DownSheetCounterBus>(buses:T[],activeDownSheetBusIds:Iterable<string>){
 const active=new Set(activeDownSheetBusIds),selected=new Set(selectedDownSheetBusIds(buses));
 return active.size===selected.size&&[...active].every(id=>selected.has(id));
}
export function downSheetCountLabel(selectedCount:number,activeEntryCount:number){
 return selectedCount===activeEntryCount?String(selectedCount):selectedCount+" / "+activeEntryCount;
}

export function downSheetBadgeBusIds<T extends {id:string}>(buses:T[],activeDownSheetBusIds:Iterable<string>){
 const active=new Set(activeDownSheetBusIds);
 return buses.filter(bus=>active.has(bus.id)).map(bus=>bus.id);
}

/* WHICH BUSES THE FACILITY MAP DRAWS A DS BADGE ON - the WHOLE decision, so
   that the map composes nothing of its own.

   It was two halves: this list, and `showDownSheetBadges?...:[]` written inline
   on the map page. A cold read then chained one `.filter()` onto that inline
   expression - dropping every bus parked at a `road-` slot - and measured the
   badge gone from a bus on the sheet with all 433 tests green, because the gate
   read the file for a NAME instead of driving the RULE. That is exactly what
   Curtis killed `downSheetBadgeView` for: "there should be no way that a bus
   can have its badge removed from the map by simply relocating it."

   So the rule lives here, where a test can hand it a fleet, move every bus and
   insist the answer does not change - and where the MCP route can ask the same
   question the map asks rather than reimplementing it. MEMBERSHIP AND THE SHOW
   SWITCH ARE THE ONLY TWO INPUTS, and `bus.l` is deliberately not one of them:
   this function cannot see where a bus is parked. */
export function mapDownSheetBadgeBusIds<T extends {id:string}>(buses:T[],activeDownSheetBusIds:Iterable<string>,showBadges:boolean){
 return showBadges?downSheetBadgeBusIds(buses,activeDownSheetBusIds):[];
}
