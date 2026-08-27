import {latestEngineHourReading,normalizeEngineHourReadings,latestMaintenanceEvent,type MaintenanceEventKind} from "./domain.ts";

/* Spark-plug and valve-adjustment tracking, counted in ENGINE HOURS.

   Cummins specs both services in hours, not miles, and this fleet is why that
   matters rather than being a technicality. Bus 20505 covers 6.98 miles per
   engine hour; bus 17549 covers 24.41. At any single mileage interval one of
   them runs far past the spec while the other has its plugs changed roughly
   twice as often as it needs. Hours are the same number on every bus no matter
   what route it draws.

   Cummins states the rule as whichever comes first among hours, miles, or
   months, so a calendar limit is tracked alongside the hour limit. A bus that
   sits reaches 18 months before it reaches 1,500 hours.

   Both limits are fleet policy Curtis supplies in Administrative Settings;
   nothing here invents one. With nothing saved a service still reports hours
   since its last completion and withholds the overdue verdict. Inspections are
   unaffected and continue to run on mileage. */
export type ServiceKind=Exclude<MaintenanceEventKind,"inspection">;
export type ServiceIntervals={
 sparkPlugs:number|null;
 valveAdjustment:number|null;
 sparkPlugsMonths:number|null;
 valveAdjustmentMonths:number|null;
};

export const DEFAULT_SERVICE_INTERVALS:ServiceIntervals={sparkPlugs:null,valveAdjustment:null,sparkPlugsMonths:null,valveAdjustmentMonths:null};
/* Roughly a week of running on a busy bus: enough warning to plan the work
   without flagging so early that the badge stops meaning anything. */
export const SERVICE_DUE_SOON_HOURS=50;
export const SERVICE_KINDS:{kind:ServiceKind;label:string;setting:keyof ServiceIntervals;monthsSetting:keyof ServiceIntervals}[]=[
 {kind:"spark-plugs",label:"Spark Plugs",setting:"sparkPlugs",monthsSetting:"sparkPlugsMonths"},
 {kind:"valve-adjustment",label:"Valve Adjustment",setting:"valveAdjustment",monthsSetting:"valveAdjustmentMonths"},
];

export function serviceIntervalHours(value:unknown):number|null{
 const hours=Number(value);
 return Number.isFinite(hours)&&hours>0?Math.round(hours):null;
}

export function normalizeServiceIntervals(value:unknown):ServiceIntervals{
 const source=(value&&typeof value==="object"?value:{}) as Partial<Record<keyof ServiceIntervals,unknown>>;
 return {
  sparkPlugs:serviceIntervalHours(source.sparkPlugs),
  valveAdjustment:serviceIntervalHours(source.valveAdjustment),
  sparkPlugsMonths:serviceIntervalHours(source.sparkPlugsMonths),
  valveAdjustmentMonths:serviceIntervalHours(source.valveAdjustmentMonths),
 };
}

/* Calendar months elapsed, counted the way a shop counts them: the same day of
   a later month is a whole month, a day short is not. */
export function monthsBetween(from:string,to:string):number|undefined{
 const start=new Date(from),end=new Date(to);
 if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime()))return undefined;
 let months=(end.getFullYear()-start.getFullYear())*12+(end.getMonth()-start.getMonth());
 if(end.getDate()<start.getDate())months-=1;
 return Math.max(0,months);
}

/* An ECM swap restarts the hour meter from zero while the odometer keeps
   climbing, which is why some buses here read a few hundred hours against
   300,000 miles. Any reading lower than the one before it is that event. */
export function engineHourMeterReset(readings:unknown):boolean{
 const history=normalizeEngineHourReadings(readings);
 return history.some((reading,index)=>index>0&&reading.hours<history[index-1].hours);
}

type ServiceBus={engineHourReadings?:unknown;maintenanceEvents?:unknown};

export type ServiceIntervalStatus={
 kind:ServiceKind;
 /* baseline-needed  no completion recorded yet
    hours-needed     a completion exists but the hour meter is not readable
                     from it, either because the bus has no reading or because
                     the completion predates hour tracking
    meter-reset      the meter now reads lower than it did at the last service,
                     so hours since cannot be counted and a fresh baseline is
                     required. Never silently treated as zero hours elapsed.
    interval-needed  tracking, but no limit saved to judge against */
 state:"baseline-needed"|"hours-needed"|"meter-reset"|"interval-needed"|"tracking"|"due-soon"|"due";
 due:boolean;
 /* Which limit put it over, when it is over. Cummins words the rule as
    whichever comes first, so the panel can say which one came first. */
 dueBy?:"hours"|"months";
 hoursSince?:number;
 intervalHours?:number;
 hoursRemaining?:number;
 /* How far past the interval the service is, once it is due. Kept separate from
    hoursRemaining so the panel can count down and then count over. */
 hoursOverdue?:number;
 monthsSince?:number;
 intervalMonths?:number;
 monthsOverdue?:number;
 lastCompletedAt?:string;
 lastEngineHours?:number;
 currentEngineHours?:number;
};

export function serviceIntervalStatus(bus:ServiceBus,kind:ServiceKind,interval:unknown,intervalMonthsInput:unknown=null,now=new Date().toISOString()):ServiceIntervalStatus{
 const last=latestMaintenanceEvent(bus.maintenanceEvents,kind);
 if(!last)return {kind,state:"baseline-needed",due:false};
 const baseline=Number(last.engineHours),reading=latestEngineHourReading(bus.engineHourReadings);
 const current=reading?reading.hours:undefined;
 const monthsSince=monthsBetween(last.completedAt,now);
 const intervalMonths=serviceIntervalHours(intervalMonthsInput);
 const monthsOverdue=monthsSince!==undefined&&intervalMonths!==null?Math.max(0,monthsSince-intervalMonths):undefined;
 const overByMonths=monthsSince!==undefined&&intervalMonths!==null&&monthsSince>=intervalMonths;
 const shared={kind,lastCompletedAt:last.completedAt,
  lastEngineHours:Number.isFinite(baseline)?baseline:undefined,
  currentEngineHours:current,monthsSince,
  ...(intervalMonths===null?{}:{intervalMonths,monthsOverdue})};

 /* The calendar limit still stands when the hour meter cannot be trusted, so a
    bus with a swapped ECM or no reading is not left entirely unwatched. */
 if(!Number.isFinite(baseline)||current===undefined)
  return {...shared,state:overByMonths?"due":"hours-needed",due:Boolean(overByMonths),...(overByMonths?{dueBy:"months" as const}:{})};
 if(current<baseline)
  return {...shared,state:overByMonths?"due":"meter-reset",due:Boolean(overByMonths),...(overByMonths?{dueBy:"months" as const}:{})};

 const hoursSince=Math.round(current-baseline);
 const intervalHours=serviceIntervalHours(interval);
 if(intervalHours===null)
  return {...shared,hoursSince,state:overByMonths?"due":"interval-needed",due:Boolean(overByMonths),...(overByMonths?{dueBy:"months" as const}:{})};
 const overByHours=hoursSince>=intervalHours;
 const hoursRemaining=Math.max(0,intervalHours-hoursSince),hoursOverdue=Math.max(0,hoursSince-intervalHours);
 const due=overByHours||overByMonths;
 const soon=!due&&hoursRemaining<=SERVICE_DUE_SOON_HOURS;
 return {...shared,hoursSince,intervalHours,hoursRemaining,hoursOverdue,
  state:due?"due":soon?"due-soon":"tracking",due,
  ...(due?{dueBy:(overByHours?"hours":"months") as "hours"|"months"}:{})};
}

/* Miles per engine hour, the number that makes a fleet-wide mileage interval
   visibly unworkable. A bus whose meter was reset is excluded rather than
   averaged in: 300,000 miles against 500 hours is 600 mi/hr, which would drag
   any fleet average into nonsense. */
export const MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR=45;

export function milesPerEngineHour(miles:unknown,hours:unknown):number|undefined{
 const distance=Number(miles),runtime=Number(hours);
 if(!Number.isFinite(distance)||!Number.isFinite(runtime)||runtime<=0||distance<0)return undefined;
 return distance/runtime;
}

export type FleetDutyCycle={rate?:number;low?:number;high?:number;spread?:number;representative:boolean;buses:number;excluded:number};

/* Above this the average stops describing any real bus and starts describing
   the midpoint of two unrelated groups. Curtis's readings sit either side of it:
   the 20-series runs about 7 miles per engine hour and the 17-series about 27,
   so their average of 17 is a speed no bus in the fleet actually runs. */
export const DUTY_CYCLE_BIMODAL_SPREAD=2;

export function fleetDutyCycle(buses:{odometerReadings?:unknown;engineHourReadings?:unknown}[]):FleetDutyCycle{
 let totalMiles=0,totalHours=0,counted=0,excluded=0,low=Infinity,high=0;
 for(const bus of buses){
  const hours=latestEngineHourReading(bus.engineHourReadings),reading=latestOdometer(bus.odometerReadings);
  if(!hours||reading===undefined)continue;
  const rate=milesPerEngineHour(reading,hours.hours);
  if(rate===undefined||rate>MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR||engineHourMeterReset(bus.engineHourReadings)){excluded+=1;continue}
  totalMiles+=reading;totalHours+=hours.hours;counted+=1;
  low=Math.min(low,rate);high=Math.max(high,rate);
 }
 if(!counted||totalHours<=0)return {representative:false,buses:counted,excluded};
 const spread=low>0?high/low:undefined;
 return {rate:totalMiles/totalHours,low,high,spread,
  representative:spread===undefined||spread<DUTY_CYCLE_BIMODAL_SPREAD,
  buses:counted,excluded};
}

function latestOdometer(value:unknown):number|undefined{
 if(!Array.isArray(value))return undefined;
 const readings=value.filter(entry=>entry&&typeof entry==="object"&&Number.isFinite(Number((entry as {miles?:unknown}).miles)))
  .sort((left,right)=>new Date(String((left as {recordedAt?:unknown}).recordedAt)).getTime()-new Date(String((right as {recordedAt?:unknown}).recordedAt)).getTime());
 const last=readings.at(-1) as {miles?:unknown}|undefined;
 return last?Number(last.miles):undefined;
}
