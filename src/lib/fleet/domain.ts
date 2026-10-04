export type RecordId=string;
export type IsoDateTime=string;

export type DurableRecord={
 id:RecordId;
 createdAt?:IsoDateTime;
 updatedAt?:IsoDateTime;
};

export type OdometerReading=DurableRecord&{
 miles:number;
 recordedAt:IsoDateTime;
 source:"manual"|"inspection";
 note?:string;
};

/* Engine hours, read off the dash the same way the odometer is. Cummins specs
   spark plugs and valve lash in hours, and on this fleet miles cannot stand in
   for them: bus 20505 runs 6.98 miles per engine hour and bus 17549 runs 24.41,
   so one mileage interval would leave the first badly overdue while changing
   plugs on the second twice as often as needed. Hours are recorded as their own
   append-only history so a mis-keyed reading is corrected by adding the right
   one, never by editing what was already written down. */
export type EngineHourReading=DurableRecord&{
 hours:number;
 recordedAt:IsoDateTime;
 source:"manual"|"service";
 note?:string;
};

export type MaintenanceEventKind="inspection"|"spark-plugs"|"valve-adjustment";

export type MaintenanceEvent=DurableRecord&{
 kind:MaintenanceEventKind;
 completedAt:IsoDateTime;
 odometerMiles?:number;
 /* The hour-meter reading when the work was done. Absent on anything logged
    before hour tracking existed, which is why the status can report that a
    service needs a fresh baseline instead of guessing one. */
 engineHours?:number;
 /* True when the hours were derived from the odometer reading rather than read
    off the meter, because the office records these services by mileage. The
    counter runs on it either way; the record says which it was so nobody reads
    an estimate as a measurement. */
 engineHoursEstimated?:boolean;
 note?:string;
};

export type PartAttachment=DurableRecord&{
 storagePath:string;
 fileName:string;
 mimeType:string;
};

export type PartUsage=DurableRecord&{
 partNumber:string;
 partName?:string;
 quantity?:number;
 attachments?:PartAttachment[];
};

export type FutureBusMaintenanceFields={
 odometerReadings?:OdometerReading[];
 engineHourReadings?:EngineHourReading[];
 maintenanceEvents?:MaintenanceEvent[];
 mileageEstimate?:{anchorReadingId:string;estimatedMiles:number;lastAccruedAt:IsoDateTime;rateMilesPerOperatingDay:number};
};

export function normalizeMaintenanceEvents(value:unknown):MaintenanceEvent[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((candidate,index)=>{
  if(!candidate||typeof candidate!=="object")return [];
  const event=candidate as Partial<MaintenanceEvent>&Record<string,unknown>,completedAt=String(event.completedAt||"");
  if(!["inspection","spark-plugs","valve-adjustment"].includes(String(event.kind))||Number.isNaN(new Date(completedAt).getTime()))return [];
  const odometerMiles=event.odometerMiles===undefined?undefined:Number(event.odometerMiles);
  const engineHours=event.engineHours===undefined?undefined:Number(event.engineHours);
  return [{...event,id:String(event.id||"maintenance-imported-"+index),kind:event.kind as MaintenanceEventKind,completedAt:new Date(completedAt).toISOString(),odometerMiles:Number.isFinite(odometerMiles)&&Number(odometerMiles)>=0?Math.round(Number(odometerMiles)):undefined,engineHours:Number.isFinite(engineHours)&&Number(engineHours)>=0?Math.round(Number(engineHours)):undefined,engineHoursEstimated:event.engineHoursEstimated===true||undefined,note:String(event.note||"")} as MaintenanceEvent];
 }).sort((left,right)=>Date.parse(left.completedAt)-Date.parse(right.completedAt));
}

export function maintenanceEventsOfKind(value:unknown,kind:MaintenanceEventKind):MaintenanceEvent[]{
 return normalizeMaintenanceEvents(value).filter(event=>event.kind===kind);
}

export function latestMaintenanceEvent(value:unknown,kind:MaintenanceEventKind){
 return maintenanceEventsOfKind(value,kind).at(-1);
}

export function appendMaintenanceEvent(value:unknown,event:MaintenanceEvent):MaintenanceEvent[]{
 return normalizeMaintenanceEvents([...normalizeMaintenanceEvents(value),event]);
}

export type FutureRepairPartFields={
 partsUsed?:boolean;
 parts?:PartUsage[];
};

export function normalizeOdometerReadings(value:unknown):OdometerReading[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((candidate,index)=>{
  if(!candidate||typeof candidate!=="object")return [];
  const reading=candidate as Partial<OdometerReading>&Record<string,unknown>;
  const miles=Number(reading.miles),recordedAt=String(reading.recordedAt||"");
  if(!Number.isFinite(miles)||miles<0||Number.isNaN(new Date(recordedAt).getTime()))return [];
  return [{
   ...reading,
   id:String(reading.id||"odometer-imported-"+index),
   miles:Math.round(miles),
   recordedAt:new Date(recordedAt).toISOString(),
   source:reading.source==="inspection"?"inspection":"manual",
   note:String(reading.note||""),
  } as OdometerReading];
 }).sort((left,right)=>new Date(left.recordedAt).getTime()-new Date(right.recordedAt).getTime());
}

export function latestOdometerReading(value:unknown):OdometerReading|undefined{
 return normalizeOdometerReadings(value).at(-1);
}

export function appendOdometerReading(value:unknown,reading:OdometerReading):OdometerReading[]{
 return normalizeOdometerReadings([...normalizeOdometerReadings(value),reading]);
}

export function normalizeEngineHourReadings(value:unknown):EngineHourReading[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((candidate,index)=>{
  if(!candidate||typeof candidate!=="object")return [];
  const reading=candidate as Partial<EngineHourReading>&Record<string,unknown>;
  const hours=Number(reading.hours),recordedAt=String(reading.recordedAt||"");
  if(!Number.isFinite(hours)||hours<0||Number.isNaN(new Date(recordedAt).getTime()))return [];
  return [{
   ...reading,
   id:String(reading.id||"engine-hours-imported-"+index),
   hours:Math.round(hours),
   recordedAt:new Date(recordedAt).toISOString(),
   source:reading.source==="service"?"service":"manual",
   note:String(reading.note||""),
  } as EngineHourReading];
 }).sort((left,right)=>new Date(left.recordedAt).getTime()-new Date(right.recordedAt).getTime());
}

export function latestEngineHourReading(value:unknown):EngineHourReading|undefined{
 return normalizeEngineHourReadings(value).at(-1);
}

export function appendEngineHourReading(value:unknown,reading:EngineHourReading):EngineHourReading[]{
 return normalizeEngineHourReadings([...normalizeEngineHourReadings(value),reading]);
}
