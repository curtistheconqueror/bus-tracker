export type DownSheetCounterBus={id:string;down?:boolean};

export function selectedDownSheetBusIds<T extends DownSheetCounterBus>(buses:T[]){
 return buses.filter(bus=>bus.down===true).map(bus=>bus.id);
}

export function downSheetCountLabel(selectedCount:number,activeEntryCount:number){
 return selectedCount===activeEntryCount?String(selectedCount):selectedCount+" / "+activeEntryCount;
}
