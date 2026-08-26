import {appendMaintenanceEvent,appendOdometerReading,normalizeOdometerReadings,type MaintenanceEvent,type MaintenanceEventKind,type OdometerReading} from "./domain.ts";
import {checkpointMileageEstimate,type MileageEstimateCheckpoint} from "./mileage-estimate.ts";

export type MaintenanceCompletionBus={s?:string;lastStatusChangeAt?:string;odometerReadings?:unknown;maintenanceEvents?:unknown;mileageEstimate?:unknown};

export type MaintenanceCompletionInput={kind?:MaintenanceEventKind;completedAt:string;odometerMiles?:number|string;note?:string;idSeed?:string};

export type MaintenanceCompletion={odometerReadings:OdometerReading[];maintenanceEvents:MaintenanceEvent[];mileageEstimate?:MileageEstimateCheckpoint};

export const COMPLETION_READING_NOTE="Completed inspection reading";

export function maintenanceCompletionError(input:MaintenanceCompletionInput):string|null{
 const rawMiles=String(input.odometerMiles??"").trim(),miles=Number(rawMiles);
 if(rawMiles!==""&&(!Number.isFinite(miles)||miles<0))return "Enter a valid odometer reading, or leave mileage blank for a date-only completion.";
 if(Number.isNaN(new Date(String(input.completedAt||"")).getTime()))return "Choose the date and time the maintenance was completed.";
 return null;
}

/* A completion always appends a maintenance event. When an actual reading is
   available, it also appends that reading and rebuilds the estimate from the new
   anchor. A date-only completion leaves odometer history and mileage untouched. */
export function recordMaintenanceCompletion(bus:MaintenanceCompletionBus,input:MaintenanceCompletionInput,now=new Date().toISOString()):MaintenanceCompletion|null{
 if(maintenanceCompletionError(input))return null;
 const kind=input.kind||"inspection",rawMiles=String(input.odometerMiles??"").trim(),miles=rawMiles===""?undefined:Math.round(Number(rawMiles)),completedAt=new Date(String(input.completedAt)).toISOString(),note=String(input.note||"").trim();
 const seed=input.idSeed||Date.parse(completedAt)+"-"+kind;
 const event:MaintenanceEvent={id:"maintenance-"+kind+"-"+seed,kind,completedAt,...(miles===undefined?{}:{odometerMiles:miles}),note};
 const maintenanceEvents=appendMaintenanceEvent(bus.maintenanceEvents,event),odometerReadings=miles===undefined?normalizeOdometerReadings(bus.odometerReadings):appendOdometerReading(bus.odometerReadings,{id:"odometer-"+kind+"-"+seed,miles,recordedAt:completedAt,source:"inspection",note:note||COMPLETION_READING_NOTE});
 if(miles===undefined)return {odometerReadings,maintenanceEvents};
 return {odometerReadings,maintenanceEvents,...checkpointMileageEstimate({...bus,odometerReadings,maintenanceEvents,mileageEstimate:undefined},now)};
}
