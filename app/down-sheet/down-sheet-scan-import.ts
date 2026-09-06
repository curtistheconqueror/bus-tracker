import {DOWN_SHEET_INSPECTION_PATTERN,DOWN_SHEET_OFF_PROPERTY_PATTERN,DOWN_SHEET_VENDORS} from "./down-sheet-view.ts";

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

/* Which printed line numbers never came back from the photo.

   The sheet numbers its rows 01..55, which is a gift: OCR cannot be trusted to
   never drop a line, but a missing NUMBER can be detected exactly. On the 09/5
   sheet two buses vanished silently - line 23 (18501, high oil usage) and line
   30 (20504, IDOT-ABS light) - and nothing on screen said so. A bus that is
   down and not on the sheet is a bus that goes back out broken.

   Blank lines are normal on a part-filled sheet, so this reports rather than
   accuses: it says which numbers are absent and lets the foreman glance at the
   paper. Counting stops at the highest line actually read, since nobody knows
   how far down the sheet was filled in. */
export function scannedLineGaps(rows:ScannedDownSheetRow[]):number[]{
 const seen=new Set<number>();
 for(const row of rows){
  const digits=String(row.lineNumber??"").replace(/\D/g,"");
  const line=digits?parseInt(digits,10):NaN;
  if(Number.isFinite(line)&&line>0)seen.add(line);
 }
 if(!seen.size)return [];
 const highest=Math.max(...seen);
 const gaps:number[]=[];
 for(let line=1;line<=highest;line++)if(!seen.has(line))gaps.push(line);
 return gaps;
}

/* "23, 30" and "37-41" rather than eleven separate numbers. */
export function describeLineGaps(gaps:number[]):string{
 const runs:string[]=[];
 for(let at=0;at<gaps.length;){
  let end=at;
  while(end+1<gaps.length&&gaps[end+1]===gaps[end]+1)end++;
  runs.push(end>at+0?gaps[at]+"\u2013"+gaps[end]:String(gaps[at]));
  at=end+1;
 }
 return runs.join(", ");
}

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

/* A banded sheet's headings reach this function as the row's own section text,
   so the words the shop actually writes at the top of a band are named here
   beside the tidy stored values.

   The order is load-bearing in one place: INSPECTIONS & SCHEDULED MAINTENANCE
   contains the word "scheduled", so inspection has to be decided before it.
   UNSCHEDULED needs no such care — the \b before "scheduled" cannot fall inside
   the middle of the word — but it is tested first anyway so the two read as the
   pair they are. */
export function normalizedSection(value:string):ScanImportRecord["section"]{
 const exact=clean(value);if(SECTIONS.has(exact))return exact as ScanImportRecord["section"];
 if(/accident/i.test(exact))return "Accident";
 /* One definition of what an inspection looks like, shared with the sheet
    itself, so a row the scan files under Inspection is the same row the sheet
    would have put in that band on its own. Two copies drifted once already:
    this one took any number after the letter while the sheet's took a list of
    five, so A21 was an inspection to the scanner and a breakdown to the page. */
 if(DOWN_SHEET_INSPECTION_PATTERN.test(exact))return "Inspection";
 if(/vendor|offsite/i.test(exact)||DOWN_SHEET_OFF_PROPERTY_PATTERN.test(exact)||DOWN_SHEET_VENDORS.some(([pattern])=>pattern.test(exact)))return "Vendor Repair";
 if(/road\s*call|\br\/?c\b|towed/i.test(exact))return "Roadcall";
 if(/\bunscheduled\b/i.test(exact))return "Pending";
 if(/\bscheduled\b/i.test(exact))return "Scheduled Repair";
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
