import {latestEngineHourReading,latestMaintenanceEvent,type MaintenanceEventKind} from "./domain.ts";

/* Spark-plug and valve-adjustment tracking, counted in ENGINE HOURS.

   Cummins specs both services in hours, not miles, and this fleet is why that
   matters rather than being a technicality. Bus 20505 covers 6.98 miles per
   engine hour; bus 17549 covers 24.41. At any single mileage interval one of
   them runs far past the spec while the other has its plugs changed roughly
   twice as often as it needs. Hours are the same number on every bus no matter
   what route it draws.

   The interval itself is still fleet policy Curtis supplies in Administrative
   Settings; nothing here invents one. With no interval saved a service still
   reports hours since its last completion and withholds the overdue verdict.
   Inspections are unaffected and continue to run on mileage. */
export type ServiceKind=Exclude<MaintenanceEventKind,"inspection">;
export type ServiceIntervals={sparkPlugs:number|null;valveAdjustment:number|null};

export const DEFAULT_SERVICE_INTERVALS:ServiceIntervals={sparkPlugs:null,valveAdjustment:null};
/* Roughly a week of running on a busy bus: enough warning to plan the work
   without flagging so early that the badge stops meaning anything. */
export const SERVICE_DUE_SOON_HOURS=50;
export const SERVICE_KINDS:{kind:ServiceKind;label:string;setting:keyof ServiceIntervals}[]=[
 {kind:"spark-plugs",label:"Spark Plugs",setting:"sparkPlugs"},
 {kind:"valve-adjustment",label:"Valve Adjustment",setting:"valveAdjustment"},
];

export function serviceIntervalHours(value:unknown):number|null{
 const hours=Number(value);
 return Number.isFinite(hours)&&hours>0?Math.round(hours):null;
}

export function normalizeServiceIntervals(value:unknown):ServiceIntervals{
 const source=(value&&typeof value==="object"?value:{}) as Partial<Record<keyof ServiceIntervals,unknown>>;
 return {sparkPlugs:serviceIntervalHours(source.sparkPlugs),valveAdjustment:serviceIntervalHours(source.valveAdjustment)};
}

type ServiceBus={engineHourReadings?:unknown;maintenanceEvents?:unknown};

export type ServiceIntervalStatus={
 kind:ServiceKind;
 /* baseline-needed  no completion recorded yet
    hours-needed     a completion exists but the hour meter is not readable
                     from it, either because the bus has no reading or because
                     the completion predates hour tracking
    interval-needed  tracking, but no fleet interval saved to judge against */
 state:"baseline-needed"|"hours-needed"|"interval-needed"|"tracking"|"due-soon"|"due";
 due:boolean;
 hoursSince?:number;
 intervalHours?:number;
 hoursRemaining?:number;
 /* How far past the interval the service is, once it is due. Kept separate from
    hoursRemaining so the panel can count down and then count over. */
 hoursOverdue?:number;
 lastCompletedAt?:string;
 lastEngineHours?:number;
 currentEngineHours?:number;
};

export function serviceIntervalStatus(bus:ServiceBus,kind:ServiceKind,interval:unknown):ServiceIntervalStatus{
 const last=latestMaintenanceEvent(bus.maintenanceEvents,kind);
 if(!last)return {kind,state:"baseline-needed",due:false};
 const baseline=Number(last.engineHours),reading=latestEngineHourReading(bus.engineHourReadings);
 const current=reading?reading.hours:undefined;
 const shared={kind,lastCompletedAt:last.completedAt,
  lastEngineHours:Number.isFinite(baseline)?baseline:undefined,
  currentEngineHours:current};
 if(!Number.isFinite(baseline)||current===undefined)return {...shared,state:"hours-needed",due:false};
 const hoursSince=Math.max(0,Math.round(current-baseline));
 const intervalHours=serviceIntervalHours(interval);
 if(intervalHours===null)return {...shared,hoursSince,state:"interval-needed",due:false};
 const due=hoursSince>=intervalHours;
 const hoursRemaining=Math.max(0,intervalHours-hoursSince),hoursOverdue=Math.max(0,hoursSince-intervalHours);
 const soon=!due&&hoursRemaining<=SERVICE_DUE_SOON_HOURS;
 return {...shared,hoursSince,intervalHours,hoursRemaining,hoursOverdue,state:due?"due":soon?"due-soon":"tracking",due};
}
