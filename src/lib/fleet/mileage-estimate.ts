import {latestOdometerReading,normalizeMaintenanceEvents,type MaintenanceEvent} from "./domain.ts";

export const ESTIMATED_MILES_PER_OPERATING_DAY=275;
export const INSPECTION_MILE_INTERVAL=3000;
export const INSPECTION_DAY_INTERVAL=10;
const DAY_MS=86400000;

export type MileageEstimateCheckpoint={
 anchorReadingId:string;
 estimatedMiles:number;
 lastAccruedAt:string;
 rateMilesPerOperatingDay:number;
};

type MileageBus={
 s?:string;
 lastStatusChangeAt?:string;
 odometerReadings?:unknown;
 maintenanceEvents?:unknown;
 mileageEstimate?:unknown;
};

function validDate(value:unknown){const time=Date.parse(String(value||""));return Number.isFinite(time)?time:null}
export function isMileageOperatingStatus(status:unknown){return status==="service"||status==="defect"}

function readCheckpoint(value:unknown,anchorId:string):MileageEstimateCheckpoint|null{
 if(!value||typeof value!=="object")return null;
 const source=value as Partial<MileageEstimateCheckpoint>,estimatedMiles=Number(source.estimatedMiles),lastAccruedAt=String(source.lastAccruedAt||"");
 if(source.anchorReadingId!==anchorId||!Number.isFinite(estimatedMiles)||estimatedMiles<0||validDate(lastAccruedAt)===null)return null;
 return {anchorReadingId:anchorId,estimatedMiles,lastAccruedAt:new Date(lastAccruedAt).toISOString(),rateMilesPerOperatingDay:ESTIMATED_MILES_PER_OPERATING_DAY};
}

export function estimatedMileage(bus:MileageBus,now=new Date().toISOString()):MileageEstimateCheckpoint|null{
 const reading=latestOdometerReading(bus.odometerReadings);
 if(!reading)return null;
 const nowMs=validDate(now)??Date.now(),statusStart=validDate(bus.lastStatusChangeAt),readingMs=Date.parse(reading.recordedAt),saved=readCheckpoint(bus.mileageEstimate,reading.id);
 const baseline=saved??{anchorReadingId:reading.id,estimatedMiles:reading.miles,lastAccruedAt:new Date(Math.max(readingMs,statusStart??readingMs)).toISOString(),rateMilesPerOperatingDay:ESTIMATED_MILES_PER_OPERATING_DAY};
 const lastMs=Math.min(nowMs,Math.max(readingMs,validDate(baseline.lastAccruedAt)??readingMs)),elapsed=isMileageOperatingStatus(bus.s)?Math.max(0,nowMs-lastMs):0;
 return {...baseline,estimatedMiles:Math.max(reading.miles,baseline.estimatedMiles)+(elapsed/DAY_MS)*ESTIMATED_MILES_PER_OPERATING_DAY,lastAccruedAt:new Date(nowMs).toISOString(),rateMilesPerOperatingDay:ESTIMATED_MILES_PER_OPERATING_DAY};
}

export function checkpointMileageEstimate(bus:MileageBus,now=new Date().toISOString()){
 const estimate=estimatedMileage(bus,now);
 return estimate?{mileageEstimate:estimate}:{};
}

export function transitionMileageEstimate(previous:MileageBus,next:MileageBus,now=new Date().toISOString()){
 const previousReading=latestOdometerReading(previous.odometerReadings),nextReading=latestOdometerReading(next.odometerReadings);
 return previousReading?.id===nextReading?.id?checkpointMileageEstimate(previous,now):checkpointMileageEstimate(next,now);
}

function latestInspection(events:MaintenanceEvent[]){return [...events].reverse().find(event=>event.kind==="inspection")}

export type InspectionDueStatus={
 state:"baseline-needed"|"current"|"due-soon"|"due";
 due:boolean;
 baseline?:MaintenanceEvent;
 estimatedMiles?:number;
 dueMiles?:number;
 dueAt?:string;
 milesRemaining?:number;
 daysRemaining?:number;
 reason?:"mileage"|"time"|"both";
};

export function inspectionDueStatus(bus:MileageBus,now=new Date().toISOString()):InspectionDueStatus{
 const baseline=latestInspection(normalizeMaintenanceEvents(bus.maintenanceEvents));
 if(!baseline)return {state:"baseline-needed",due:false};
 const nowMs=validDate(now)??Date.now(),dueAtMs=Date.parse(baseline.completedAt)+INSPECTION_DAY_INTERVAL*DAY_MS,dueAt=new Date(dueAtMs).toISOString(),estimate=estimatedMileage(bus,new Date(nowMs).toISOString()),dueMiles=Number.isFinite(baseline.odometerMiles)?Number(baseline.odometerMiles)+INSPECTION_MILE_INTERVAL:undefined,mileageDue=dueMiles!==undefined&&estimate!==null&&estimate.estimatedMiles>=dueMiles,timeDue=nowMs>=dueAtMs,reason=mileageDue&&timeDue?"both":mileageDue?"mileage":timeDue?"time":undefined,milesRemaining=dueMiles===undefined||!estimate?undefined:Math.max(0,dueMiles-estimate.estimatedMiles),daysRemaining=Math.max(0,(dueAtMs-nowMs)/DAY_MS),due=Boolean(reason),soon=!reason&&((milesRemaining!==undefined&&milesRemaining<=500)||daysRemaining<=2);
 return {state:due?"due":soon?"due-soon":"current",due,baseline,estimatedMiles:estimate?.estimatedMiles,dueMiles,dueAt,milesRemaining,daysRemaining,reason};
}
