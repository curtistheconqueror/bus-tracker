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

export type MaintenanceEventKind="inspection"|"spark-plugs"|"valve-adjustment";

export type MaintenanceEvent=DurableRecord&{
 kind:MaintenanceEventKind;
 completedAt:IsoDateTime;
 odometerMiles?:number;
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
  return [{...event,id:String(event.id||"maintenance-imported-"+index),kind:event.kind as MaintenanceEventKind,completedAt:new Date(completedAt).toISOString(),odometerMiles:Number.isFinite(odometerMiles)&&Number(odometerMiles)>=0?Math.round(Number(odometerMiles)):undefined,note:String(event.note||"")} as MaintenanceEvent];
 }).sort((left,right)=>Date.parse(left.completedAt)-Date.parse(right.completedAt));
}

export function latestMaintenanceEvent(value:unknown,kind:MaintenanceEventKind){
 return normalizeMaintenanceEvents(value).filter(event=>event.kind===kind).at(-1);
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
