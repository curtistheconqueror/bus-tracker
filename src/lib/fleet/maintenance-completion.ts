import {appendEngineHourReading,appendMaintenanceEvent,appendOdometerReading,normalizeEngineHourReadings,normalizeOdometerReadings,type EngineHourReading,type MaintenanceEvent,type MaintenanceEventKind,type OdometerReading} from "./domain.ts";
import {checkpointMileageEstimate,type MileageEstimateCheckpoint} from "./mileage-estimate.ts";
import {engineHourMeterReset,estimateEngineHoursAtMiles} from "./service-intervals.ts";

export type MaintenanceCompletionBus={s?:string;lastStatusChangeAt?:string;odometerReadings?:unknown;engineHourReadings?:unknown;maintenanceEvents?:unknown;mileageEstimate?:unknown};

export type MaintenanceCompletionInput={kind?:MaintenanceEventKind;completedAt:string;odometerMiles?:number|string;engineHours?:number|string;note?:string;idSeed?:string};

export type MaintenanceCompletion={odometerReadings:OdometerReading[];engineHourReadings:EngineHourReading[];maintenanceEvents:MaintenanceEvent[];mileageEstimate?:MileageEstimateCheckpoint};

export const COMPLETION_READING_NOTE="Completed inspection reading";

function latestOdometerMiles(value:unknown){return normalizeOdometerReadings(value).at(-1)?.miles}
function latestEngineHours(value:unknown){return normalizeEngineHourReadings(value).at(-1)?.hours}

export function maintenanceCompletionError(input:MaintenanceCompletionInput):string|null{
 const rawMiles=String(input.odometerMiles??"").trim(),miles=Number(rawMiles);
 if(rawMiles!==""&&(!Number.isFinite(miles)||miles<0))return "Enter a valid odometer reading, or leave mileage blank for a date-only completion.";
 const rawHours=String(input.engineHours??"").trim(),hours=Number(rawHours);
 if(rawHours!==""&&(!Number.isFinite(hours)||hours<0))return "Enter a valid engine-hour reading, or leave hours blank.";
 if(Number.isNaN(new Date(String(input.completedAt||"")).getTime()))return "Choose the date and time the maintenance was completed.";
 return null;
}

/* A completion always appends a maintenance event. When an actual reading is
   available, it also appends that reading and rebuilds the estimate from the new
   anchor. A date-only completion leaves odometer history and mileage untouched.

   Engine hours work the same way and are what spark-plug and valve-adjustment
   tracking counts from, so recording them here is what starts the counter. */
export function recordMaintenanceCompletion(bus:MaintenanceCompletionBus,input:MaintenanceCompletionInput,now=new Date().toISOString()):MaintenanceCompletion|null{
 if(maintenanceCompletionError(input))return null;
 const kind=input.kind||"inspection",rawMiles=String(input.odometerMiles??"").trim(),miles=rawMiles===""?undefined:Math.round(Number(rawMiles)),completedAt=new Date(String(input.completedAt)).toISOString(),note=String(input.note||"").trim();
 const rawHours=String(input.engineHours??"").trim();
 let hours=rawHours===""?undefined:Math.round(Number(rawHours)),estimated=false;
 /* The office logs these services by mileage. When only the odometer is known,
    derive the hours from this bus's own miles-per-hour so the counter can still
    start, and mark the record as an estimate. */
 if(hours===undefined&&miles!==undefined&&kind!=="inspection"){
  const current=latestOdometerMiles(bus.odometerReadings),meter=latestEngineHours(bus.engineHourReadings);
  const guess=estimateEngineHoursAtMiles(current,meter,miles,engineHourMeterReset(bus.engineHourReadings));
  if(guess){hours=guess.hours;estimated=true}
 }
 const seed=input.idSeed||Date.parse(completedAt)+"-"+kind;
 const event:MaintenanceEvent={id:"maintenance-"+kind+"-"+seed,kind,completedAt,...(miles===undefined?{}:{odometerMiles:miles}),...(hours===undefined?{}:{engineHours:hours}),...(estimated?{engineHoursEstimated:true}:{}),note};
 const maintenanceEvents=appendMaintenanceEvent(bus.maintenanceEvents,event);
 const odometerReadings=miles===undefined?normalizeOdometerReadings(bus.odometerReadings):appendOdometerReading(bus.odometerReadings,{id:"odometer-"+kind+"-"+seed,miles,recordedAt:completedAt,source:"inspection",note:note||COMPLETION_READING_NOTE});
 /* Only a reading taken off the meter joins the hour history. An estimate lives
    on the maintenance record alone, so it can never be mistaken later for an
    observed reading or trip the meter-reset check. */
 const engineHourReadings=hours===undefined||estimated?normalizeEngineHourReadings(bus.engineHourReadings):appendEngineHourReading(bus.engineHourReadings,{id:"engine-hours-"+kind+"-"+seed,hours,recordedAt:completedAt,source:"service",note:note||COMPLETION_READING_NOTE});
 if(miles===undefined)return {odometerReadings,engineHourReadings,maintenanceEvents};
 return {odometerReadings,engineHourReadings,maintenanceEvents,...checkpointMileageEstimate({...bus,odometerReadings,maintenanceEvents,mileageEstimate:undefined},now)};
}
