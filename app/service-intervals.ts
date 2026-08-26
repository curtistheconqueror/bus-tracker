import {latestMaintenanceEvent,type MaintenanceEventKind} from "./domain.ts";
import {estimatedMileage} from "./mileage-estimate.ts";

/* Spark-plug and valve-adjustment tracking. The mileage intervals are a fleet
   policy value that Curtis supplies in Administrative Settings; nothing here
   guesses one. With no interval saved a service still reports mileage since its
   last completion and simply withholds the overdue verdict. */
export type ServiceKind=Exclude<MaintenanceEventKind,"inspection">;
export type ServiceIntervals={sparkPlugs:number|null;valveAdjustment:number|null};

export const DEFAULT_SERVICE_INTERVALS:ServiceIntervals={sparkPlugs:null,valveAdjustment:null};
export const SERVICE_DUE_SOON_MILES=500;
export const SERVICE_KINDS:{kind:ServiceKind;label:string;setting:keyof ServiceIntervals}[]=[
 {kind:"spark-plugs",label:"Spark Plugs",setting:"sparkPlugs"},
 {kind:"valve-adjustment",label:"Valve Adjustment",setting:"valveAdjustment"},
];

export function serviceIntervalMiles(value:unknown):number|null{
 const miles=Number(value);
 return Number.isFinite(miles)&&miles>0?Math.round(miles):null;
}

export function normalizeServiceIntervals(value:unknown):ServiceIntervals{
 const source=(value&&typeof value==="object"?value:{}) as Partial<Record<keyof ServiceIntervals,unknown>>;
 return {sparkPlugs:serviceIntervalMiles(source.sparkPlugs),valveAdjustment:serviceIntervalMiles(source.valveAdjustment)};
}

type ServiceBus={s?:string;lastStatusChangeAt?:string;odometerReadings?:unknown;maintenanceEvents?:unknown;mileageEstimate?:unknown};

export type ServiceIntervalStatus={
 kind:ServiceKind;
 state:"baseline-needed"|"interval-needed"|"tracking"|"due-soon"|"due";
 due:boolean;
 milesSince?:number;
 intervalMiles?:number;
 milesRemaining?:number;
 lastCompletedAt?:string;
 lastOdometerMiles?:number;
};

export function serviceIntervalStatus(bus:ServiceBus,kind:ServiceKind,interval:unknown,now=new Date().toISOString()):ServiceIntervalStatus{
 const last=latestMaintenanceEvent(bus.maintenanceEvents,kind);
 if(!last)return {kind,state:"baseline-needed",due:false};
 const baseline=Number(last.odometerMiles),estimate=estimatedMileage(bus,now);
 const milesSince=estimate&&Number.isFinite(baseline)?Math.max(0,Math.round(estimate.estimatedMiles-baseline)):undefined;
 const shared={kind,lastCompletedAt:last.completedAt,lastOdometerMiles:Number.isFinite(baseline)?baseline:undefined,milesSince};
 const intervalMiles=serviceIntervalMiles(interval);
 if(intervalMiles===null)return {...shared,state:"interval-needed",due:false};
 const milesRemaining=milesSince===undefined?undefined:Math.max(0,intervalMiles-milesSince);
 const due=milesSince!==undefined&&milesSince>=intervalMiles,soon=!due&&milesRemaining!==undefined&&milesRemaining<=SERVICE_DUE_SOON_MILES;
 return {...shared,state:due?"due":soon?"due-soon":"tracking",due,intervalMiles,milesRemaining};
}
