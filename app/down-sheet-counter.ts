export type DownSheetCounterBus={id:string;down?:boolean};

export function selectedDownSheetBusIds<T extends DownSheetCounterBus>(buses:T[]){
 return buses.filter(bus=>bus.down===true).map(bus=>bus.id);
}

export function downSheetCountLabel(selectedCount:number,activeEntryCount:number){
 return selectedCount===activeEntryCount?String(selectedCount):selectedCount+" / "+activeEntryCount;
}

export type ReadyDownSheetBus={id:string;l:string};

export function isReadyUseLocation(location:string){
 return location.startsWith("garage-")||location.startsWith("road-");
}

export function readyDownSheetBusIds<T extends ReadyDownSheetBus>(buses:T[],activeDownSheetBusIds:Iterable<string>){
 const active=new Set(activeDownSheetBusIds);
 return buses.filter(bus=>active.has(bus.id)&&isReadyUseLocation(bus.l)).map(bus=>bus.id);
}
