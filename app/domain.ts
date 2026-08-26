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
