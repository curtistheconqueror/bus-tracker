import {appendMaintenanceEvent,appendOdometerReading,type MaintenanceEvent,type MaintenanceEventKind,type OdometerReading} from "./domain.ts";
import {checkpointMileageEstimate,type MileageEstimateCheckpoint} from "./mileage-estimate.ts";

export type MaintenanceCompletionBus={s?:string;lastStatusChangeAt?:string;odometerReadings?:unknown;maintenanceEvents?:unknown;mileageEstimate?:unknown};

export type MaintenanceCompletionInput={kind?:MaintenanceEventKind;completedAt:string;odometerMiles:number|string;note?:string;idSeed?:string};

export type MaintenanceCompletion={odometerReadings:OdometerReading[];maintenanceEvents:MaintenanceEvent[];mileageEstimate?:MileageEstimateCheckpoint};

export const COMPLETION_READING_NOTE="Completed inspection reading";

export function maintenanceCompletionError(input:MaintenanceCompletionInput):string|null{
 const miles=Number(input.odometerMiles);
 if(String(input.odometerMiles??"").trim()===""||!Number.isFinite(miles)||miles<0)return "Enter the actual odometer reading recorded at completion.";
 if(Number.isNaN(new Date(String(input.completedAt||"")).getTime()))return "Choose the date and time the maintenance was completed.";
 return null;
}

/* A completion appends two records and never edits earlier ones: the maintenance
   event re-anchors the inspection-due clock, and its actual reading re-anchors the
   mileage estimate. Clearing the saved checkpoint forces the estimate to rebuild
   from the newest reading instead of carrying the previous anchor forward. */
export function recordMaintenanceCompletion(bus:MaintenanceCompletionBus,input:MaintenanceCompletionInput,now=new Date().toISOString()):MaintenanceCompletion|null{
 if(maintenanceCompletionError(input))return null;
 const kind=input.kind||"inspection",miles=Math.round(Number(input.odometerMiles)),completedAt=new Date(String(input.completedAt)).toISOString(),note=String(input.note||"").trim();
 const seed=input.idSeed||Date.parse(completedAt)+"-"+kind;
 const reading:OdometerReading={id:"odometer-"+kind+"-"+seed,miles,recordedAt:completedAt,source:"inspection",note:note||COMPLETION_READING_NOTE};
 const event:MaintenanceEvent={id:"maintenance-"+kind+"-"+seed,kind,completedAt,odometerMiles:miles,note};
 const odometerReadings=appendOdometerReading(bus.odometerReadings,reading),maintenanceEvents=appendMaintenanceEvent(bus.maintenanceEvents,event);
 return {odometerReadings,maintenanceEvents,...checkpointMileageEstimate({...bus,odometerReadings,maintenanceEvents,mileageEstimate:undefined},now)};
}
