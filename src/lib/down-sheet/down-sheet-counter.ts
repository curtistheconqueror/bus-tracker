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
