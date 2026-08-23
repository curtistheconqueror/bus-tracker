export type MysteryFleetBus={id:string;l:string;s?:string;bay12Watch?:boolean;defects?:{state?:string}[]};

const SHOP_AND_CNG_PREFIXES=["east-","west-","bay-","bay-overflow-","wall-","wall-overflow-","service-","service-overflow-","paint-","wash-","body-","office-","pit-","brake-","tow-"] as const;

export function isMysteryArea(location:string){
 if(SHOP_AND_CNG_PREFIXES.some(prefix=>location.startsWith(prefix)))return true;
 if(!location.startsWith("garage-"))return false;
 const slot=Number(location.slice("garage-".length));
 return Number.isInteger(slot)&&slot>=0&&slot%12>=10;
}

export function hasActiveDefects(bus:MysteryFleetBus){
 return Boolean(bus.defects?.some(defect=>defect.state!=="completed"));
}

export function isBay12AwarenessBus(bus:MysteryFleetBus,activeDownSheetBusIds:Iterable<string>){
 return isMysteryArea(bus.l)&&Boolean(bus.bay12Watch)&&hasActiveDefects(bus)&&!new Set(activeDownSheetBusIds).has(bus.id);
}

export function isMysteryBus(bus:MysteryFleetBus,activeDownSheetBusIds:Iterable<string>){
 const active=new Set(activeDownSheetBusIds);
 return isMysteryArea(bus.l)&&(bus.s==="unknown"||!active.has(bus.id));
}

export function mysteryBusIds<T extends MysteryFleetBus>(fleet:T[],activeDownSheetBusIds:Iterable<string>){
 const active=new Set(activeDownSheetBusIds);
 return fleet.filter(bus=>isMysteryArea(bus.l)&&(bus.s==="unknown"||!active.has(bus.id))).map(bus=>bus.id);
}

export function bay12AwarenessBusIds<T extends MysteryFleetBus>(fleet:T[],activeDownSheetBusIds:Iterable<string>){
 const active=new Set(activeDownSheetBusIds);
 return fleet.filter(bus=>isMysteryArea(bus.l)&&Boolean(bus.bay12Watch)&&hasActiveDefects(bus)&&!active.has(bus.id)).map(bus=>bus.id);
}
