export type ScanStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";

export type ScanFleetBus={id:string;n:string};

export type ScannedDownSheetRow={
 pageNumber:number;
 lineNumber:string;
 busNumber:string;
 reason:string;
 assignedTo:string;
 category:string;
 repair:string;
 section:string;
 shift:string;
 operationalStatus:string;
 confidence:number;
 reviewNote:string;
};

export type ReviewedScanRow=ScannedDownSheetRow&{
 key:string;
 selected:boolean;
 fleetMatch:"matched"|"unknown"|"duplicate";
 busId:string;
 repeatedCount:number;
};

export type ScanImportRecord={
 busId:string;
 busNumber:string;
 reason:string;
 assignedTo:string;
 category:string;
 repair:string;
 section:"Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";
 shift:"1st"|"2nd"|"3rd";
 operationalStatus:ScanStatus;
};

const SECTIONS=new Set(["Pending","Accident","Scheduled Repair","Inspection","Vendor Repair","Roadcall","Other"]);
const STATUSES=new Set<ScanStatus>(["service","defect","shop","out","decommissioned","unknown"]);

function busDigits(value:string){return value.replace(/\D/g,"").slice(0,5)}
function clean(value:unknown){return typeof value==="string"?value.trim():""}

export function reviewScannedRows(rows:ScannedDownSheetRow[],fleet:ScanFleetBus[]):ReviewedScanRow[]{
 const fleetByNumber=new Map<string,ScanFleetBus[]>();
 for(const bus of fleet){const number=busDigits(bus.n);if(!number)continue;fleetByNumber.set(number,[...(fleetByNumber.get(number)||[]),bus])}
 const scanCounts=new Map<string,number>();
 for(const row of rows){const number=busDigits(row.busNumber);if(number)scanCounts.set(number,(scanCounts.get(number)||0)+1)}
 return rows.map((row,index)=>{
  const busNumber=busDigits(row.busNumber),matches=fleetByNumber.get(busNumber)||[],fleetMatch=matches.length===1?"matched":matches.length>1?"duplicate":"unknown";
  return {...row,busNumber,key:`scan-${row.pageNumber||1}-${row.lineNumber||index+1}-${index}`,selected:fleetMatch==="matched",fleetMatch,busId:fleetMatch==="matched"?matches[0].id:"",repeatedCount:scanCounts.get(busNumber)||1};
 });
}

function normalizedSection(value:string):ScanImportRecord["section"]{
 const exact=clean(value);if(SECTIONS.has(exact))return exact as ScanImportRecord["section"];
 if(/accident/i.test(exact))return "Accident";
 if(/inspect|\b[abc]\s*-?\s*\d+/i.test(exact))return "Inspection";
 if(/vendor|off property/i.test(exact))return "Vendor Repair";
 if(/road\s*call|\br\/?c\b|towed/i.test(exact))return "Roadcall";
 return "Pending";
}

function normalizedShift(value:string):ScanImportRecord["shift"]{
 const text=clean(value).toLowerCase();
 if(text.includes("3")||text.includes("night"))return "3rd";
 if(text.includes("2")||text.includes("pm")||text.includes("evening"))return "2nd";
 return "1st";
}

function normalizedStatus(value:string):ScanStatus{
 const text=clean(value).toLowerCase() as ScanStatus;
 return STATUSES.has(text)?text:"out";
}

function combineUnique(values:string[]){return [...new Set(values.map(clean).filter(Boolean))].join(" / ")}

export function mergeReviewedRows(rows:ReviewedScanRow[]):ScanImportRecord[]{
 const selected=rows.filter(row=>row.selected&&row.fleetMatch==="matched"&&row.busId);
 const grouped=new Map<string,ReviewedScanRow[]>();
 for(const row of selected)grouped.set(row.busId,[...(grouped.get(row.busId)||[]),row]);
 return [...grouped.values()].map(group=>{
  const first=group[0];
  return {
   busId:first.busId,
   busNumber:first.busNumber,
   reason:combineUnique(group.map(row=>row.reason)),
   assignedTo:combineUnique(group.map(row=>row.assignedTo)),
   category:clean(first.category)||"Miscellaneous",
   repair:clean(first.repair)||"Driver-reported defect",
   section:normalizedSection(first.section||first.reason),
   shift:normalizedShift(first.shift),
   operationalStatus:normalizedStatus(first.operationalStatus),
  };
 });
}
