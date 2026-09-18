export type FleetPlacement={id:string;n:string;l:string};
export type BusSaveError="number-required"|"number-invalid"|"duplicate-number"|"occupied-location"|null;

export function hasBusNumberConflict(buses:FleetPlacement[],busId:string,originalNumber:string,requestedNumber:string){
 const number=requestedNumber.trim();
 return number!==originalNumber&&buses.some(bus=>bus.id!==busId&&bus.n===number);
}

export function hasLocationConflict(buses:FleetPlacement[],busId:string,location:string){
 return buses.some(bus=>bus.id!==busId&&bus.l===location);
}

export function validateBusUpdate(buses:FleetPlacement[],next:FleetPlacement):BusSaveError{
 const number=next.n.trim(),existing=buses.find(bus=>bus.id===next.id);
 if(!number)return "number-required";
 if(!/^\d+$/.test(number))return "number-invalid";
 if(hasBusNumberConflict(buses,next.id,existing?.n||"",number))return "duplicate-number";
 if(hasLocationConflict(buses,next.id,next.l))return "occupied-location";
 return null;
}