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

   The limits ship as defaults: 1,500 hours or 18 months on plugs, 2,000 hours
   or 24 months on valves, confirmed the same for the L9N as for the ISL G. They
   were deliberately blank while the L9N valve figure was still contested between
   1,000 and 2,000 hours, because a number the app asserts as fact had better be
   one. That question is settled, and staying blank only meant retyping the same
   four figures on every phone and tablet, since these settings live on the
   device rather than on a server.

   Administrative Settings still owns them. Anything saved there wins, a limit
   cleared on purpose stays cleared, and with no limit a service still reports
   hours since its last completion and withholds the overdue verdict.
   Inspections are unaffected and continue to run on mileage. */
export type ServiceKind=Exclude<MaintenanceEventKind,"inspection">;
export type ServiceIntervals={
 sparkPlugs:number|null;
 valveAdjustment:number|null;
 sparkPlugsMonths:number|null;
 valveAdjustmentMonths:number|null;
};

export const DEFAULT_SERVICE_INTERVALS:ServiceIntervals={sparkPlugs:1500,valveAdjustment:2000,sparkPlugsMonths:18,valveAdjustmentMonths:24};
/* Version 108 briefly stored these same property names as mileage limits. The
   unit marker prevents an older mileage value from being silently treated as
   engine hours after the service model changed.

   v2 marks the release where the limits gained defaults. It is needed because
   the board rewrites its whole settings blob on almost every change, so a
   device that never had the limits typed in is not holding an empty record but
   an explicit four nulls, and those nulls would beat any default that shipped
   later. Under v1 a blank meant "never set" and takes the default; under v2 a
   blank means "cleared on purpose" and stays blank. Anything actually entered
   survives either way. */
export const SERVICE_INTERVALS_UNIT="engine-hours-v2";
export const LEGACY_SERVICE_INTERVALS_UNIT="engine-hours-v1";

/* The single place that decides what a stored settings blob means. Both the
   board's own hydrate and its backup import go through it, so an imported
   backup and a device that has been running all along read the same way. */
export function readSavedServiceIntervals(unit:unknown,value:unknown):ServiceIntervals{
 if(unit===SERVICE_INTERVALS_UNIT)return normalizeServiceIntervals(value);
 if(unit!==LEGACY_SERVICE_INTERVALS_UNIT)return {...DEFAULT_SERVICE_INTERVALS};
 const saved=normalizeServiceIntervals(value);
 return {
  sparkPlugs:saved.sparkPlugs??DEFAULT_SERVICE_INTERVALS.sparkPlugs,
  valveAdjustment:saved.valveAdjustment??DEFAULT_SERVICE_INTERVALS.valveAdjustment,
  sparkPlugsMonths:saved.sparkPlugsMonths??DEFAULT_SERVICE_INTERVALS.sparkPlugsMonths,
  valveAdjustmentMonths:saved.valveAdjustmentMonths??DEFAULT_SERVICE_INTERVALS.valveAdjustmentMonths,
 };
}
/* Roughly a week of running on a busy bus: enough warning to plan the work
   without flagging so early that the badge stops meaning anything. */
export const SERVICE_DUE_SOON_HOURS=50;
/* Past the interval by this share of it. Cummins is blunt about what running a
   gas engine long on plugs costs: misfire, unburnt fuel into the exhaust, and a
   three-way catalyst destroyed behind it. A quarter past the interval is not a
   scheduling matter any more. */
export type ServiceSeverity="none"|"due-soon"|"due"|"overdue"|"critical";
export const SERVICE_OVERDUE_FRACTION=0.10;
export const SERVICE_CRITICAL_FRACTION=0.25;

export function serviceSeverity(overdueFraction:number):ServiceSeverity{
 if(overdueFraction>=SERVICE_CRITICAL_FRACTION)return "critical";
 if(overdueFraction>=SERVICE_OVERDUE_FRACTION)return "overdue";
 return "due";
}
export const SERVICE_SEVERITY_LABELS:Record<ServiceSeverity,string>={
 none:"",
 "due-soon":"DUE SOON",
 due:"DUE NOW",
 overdue:"OVERDUE",
 critical:"CRITICAL",
};
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
 /* How bad it is, not just whether it is late. Graded as a share of the
    interval rather than a flat hour count, because 400 hours past a 1,500-hour
    plug interval is a worse state than 400 past a 2,000-hour valve interval. */
 severity:ServiceSeverity;
 overdueFraction?:number;
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

function monthSeverity(monthsSince:number|undefined,intervalMonths:number|null):ServiceSeverity{
 if(monthsSince===undefined||intervalMonths===null||intervalMonths<=0)return "due";
 return serviceSeverity((monthsSince-intervalMonths)/intervalMonths);
}

export function serviceIntervalStatus(bus:ServiceBus,kind:ServiceKind,interval:unknown,intervalMonthsInput:unknown=null,now=new Date().toISOString()):ServiceIntervalStatus{
 const last=latestMaintenanceEvent(bus.maintenanceEvents,kind);
 if(!last)return {kind,state:"baseline-needed",due:false,severity:"none"};
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
  return {...shared,state:overByMonths?"due":"hours-needed",due:Boolean(overByMonths),severity:overByMonths?monthSeverity(monthsSince,intervalMonths):"none",...(overByMonths?{dueBy:"months" as const}:{})};
 if(current<baseline)
  return {...shared,state:overByMonths?"due":"meter-reset",due:Boolean(overByMonths),severity:overByMonths?monthSeverity(monthsSince,intervalMonths):"none",...(overByMonths?{dueBy:"months" as const}:{})};

 const hoursSince=Math.round(current-baseline);
 const intervalHours=serviceIntervalHours(interval);
 if(intervalHours===null)
  return {...shared,hoursSince,state:overByMonths?"due":"interval-needed",due:Boolean(overByMonths),severity:overByMonths?monthSeverity(monthsSince,intervalMonths):"none",...(overByMonths?{dueBy:"months" as const}:{})};
 const overByHours=hoursSince>=intervalHours;
 const hoursRemaining=Math.max(0,intervalHours-hoursSince),hoursOverdue=Math.max(0,hoursSince-intervalHours);
 const due=overByHours||overByMonths;
 const soon=!due&&hoursRemaining<=SERVICE_DUE_SOON_HOURS;
 /* When both limits are past, the worse of the two sets the severity. */
 const hourFraction=hoursOverdue/intervalHours;
 const monthFraction=overByMonths?(monthsSince!-intervalMonths!)/intervalMonths!:0;
 const overdueFraction=Math.max(hourFraction,monthFraction);
 return {...shared,hoursSince,intervalHours,hoursRemaining,hoursOverdue,
  state:due?"due":soon?"due-soon":"tracking",due,
  severity:due?serviceSeverity(overdueFraction):soon?"due-soon":"none",
  ...(due?{overdueFraction}:{}),
  ...(due?{dueBy:(overByHours&&hourFraction>=monthFraction?"hours":"months") as "hours"|"months"}:{})};
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

/* The office records these services by mileage, not hours. Given the odometer
   reading at a past service, the hours on the meter at that moment follow from
   the bus's own lifetime miles-per-hour: at a constant rate, the share of total
   miles covered by then is the share of total hours run by then.

   It is an estimate and is stored as one. The rate is a lifetime average, so a
   bus whose route changed will be off, and a bus whose meter was reset has no
   usable rate at all and is refused rather than guessed at. Even so it beats
   the alternative, which is no counter running until the next service comes
   round again. */
export type EngineHourEstimate={hours:number;rate:number;milesSince:number};

export function estimateEngineHoursAtMiles(
 currentMiles:unknown,currentHours:unknown,milesAtService:unknown,meterReset=false):EngineHourEstimate|undefined{
 const miles=Number(currentMiles),hours=Number(currentHours),past=Number(milesAtService);
 if(meterReset)return undefined;
 if(!Number.isFinite(miles)||!Number.isFinite(hours)||!Number.isFinite(past))return undefined;
 if(miles<=0||hours<=0||past<0||past>miles)return undefined;
 const rate=miles/hours;
 if(rate>MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR)return undefined;
 return {hours:Math.round(hours*(past/miles)),rate,milesSince:Math.round(miles-past)};
}

export type FleetDutyCycle={rate?:number;low?:number;high?:number;spread?:number;representative:boolean;buses:number;
 /* Total excluded, split by how certain the exclusion is. A meter that read
    lower than it did before is hard evidence of an ECM swap. A ratio above the
    cutoff is only a guess, and the margin is thinner than it looks: the fastest
    real bus measured here runs 31.46 miles per engine hour against a cutoff of
    45. Reporting the two separately means a wrongly excluded bus is visible
    instead of silently missing from the average. */
 excluded:number;excludedReset:number;excludedImplausible:number};

/* Above this the average stops describing any real bus and starts describing
   the midpoint of two unrelated groups. Curtis's readings sit either side of it:
   the 20-series runs about 7 miles per engine hour and the 17-series about 27,
   so their average of 17 is a speed no bus in the fleet actually runs. */
export const DUTY_CYCLE_BIMODAL_SPREAD=2;

export function fleetDutyCycle(buses:{odometerReadings?:unknown;engineHourReadings?:unknown}[]):FleetDutyCycle{
 let totalMiles=0,totalHours=0,counted=0,excluded=0,excludedReset=0,excludedImplausible=0,low=Infinity,high=0;
 for(const bus of buses){
  const hours=latestEngineHourReading(bus.engineHourReadings),reading=latestOdometer(bus.odometerReadings);
  if(!hours||reading===undefined)continue;
  const rate=milesPerEngineHour(reading,hours.hours);
  if(rate===undefined){excluded+=1;excludedImplausible+=1;continue}
  if(engineHourMeterReset(bus.engineHourReadings)){excluded+=1;excludedReset+=1;continue}
  if(rate>MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR){excluded+=1;excludedImplausible+=1;continue}
  totalMiles+=reading;totalHours+=hours.hours;counted+=1;
  low=Math.min(low,rate);high=Math.max(high,rate);
 }
 if(!counted||totalHours<=0)return {representative:false,buses:counted,excluded,excludedReset,excludedImplausible};
 const spread=low>0?high/low:undefined;
 return {rate:totalMiles/totalHours,low,high,spread,
  representative:spread===undefined||spread<DUTY_CYCLE_BIMODAL_SPREAD,
  buses:counted,excluded,excludedReset,excludedImplausible};
}

function latestOdometer(value:unknown):number|undefined{
 if(!Array.isArray(value))return undefined;
 const readings=value.filter(entry=>entry&&typeof entry==="object"&&Number.isFinite(Number((entry as {miles?:unknown}).miles)))
  .sort((left,right)=>new Date(String((left as {recordedAt?:unknown}).recordedAt)).getTime()-new Date(String((right as {recordedAt?:unknown}).recordedAt)).getTime());
 const last=readings.at(-1) as {miles?:unknown}|undefined;
 return last?Number(last.miles):undefined;
}
