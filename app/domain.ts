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
};

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
