import {DOWN_SHEET_INSPECTION_PATTERN,DOWN_SHEET_OFF_PROPERTY_PATTERN,DOWN_SHEET_VENDORS,downSheetScheduledOnly,isDownSheetReasonPlaceholder} from "./down-sheet-view.ts";
import {correctScannedText} from "./scan-spelling.ts";

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

/* A row written by hand outside the table. It has no printed line number, which
   is also why it is the kind most often misread: FRONT TIROS, CAROS, and a
   17565 that came back as 17563. Whatever the model says about its own
   certainty, a margin row is one to look at. */
export function isMarginRow(row:{lineNumber?:string}){
 const line=String(row?.lineNumber??"").trim().toLowerCase();
 return line===""||line==="margin";
}

/* One printed line is one line, however many buses are written on it.

   Line 53 on the shop's sheet is a standing example: PM'S with seven bus
   numbers after it, and the crew writes it that way most weeks. The model
   splits it into seven rows correctly, but carries the words "PM'S" on the
   FIRST row only and leaves the rest blank — then stamps those blank rows with
   whatever band heading they happened to sit under. Six buses arrive saying
   nothing, under UNSCHEDULED, and the page has no choice but to read them as
   six buses that are down with nobody assigned. The down count goes up by six
   and the inspection count goes down by six, off one line of a paper sheet.

   Asking the model more firmly is part of the fix and not the load-bearing
   part: the prompt has said "each with the same reason" since multi-bus rows
   were first handled, and this is what came back anyway. So the line itself
   settles it here. Rows that share a page and a PRINTED line number describe
   the same work, and a field nobody filled in takes the value from the sibling
   that has one.

   Margin rows are excluded, and that exclusion is the whole safety of this:
   they carry no line number, so every pencilled row on a page would share one
   key and inherit from whichever came back first — one bus's brake job
   spreading across unrelated handwritten rows. A row with no printed number
   inherits nothing.

   Only blank fields are filled. Two buses on one line that genuinely came back
   with different wording keep it: this can add what was missing, never
   overwrite what was read. */
const LINE_SHARED_FIELDS=["reason","assignedTo","category","repair"] as const;

function printedLineKey(row:ScannedDownSheetRow){
 if(isMarginRow(row))return "";
 const line=String(row.lineNumber??"").replace(/\D/g,"");
 return line?`${row.pageNumber||1}|${parseInt(line,10)}`:"";
}

export function fillPrintedLineSiblings(rows:ScannedDownSheetRow[]):ScannedDownSheetRow[]{
 const byLine=new Map<string,ScannedDownSheetRow[]>();
 for(const row of rows){
  const key=printedLineKey(row);
  if(key)byLine.set(key,[...(byLine.get(key)||[]),row]);
 }
 const shared=new Map<string,Partial<Record<typeof LINE_SHARED_FIELDS[number],string>>>();
 for(const [key,group] of byLine){
  if(group.length<2)continue;
  const values:Partial<Record<typeof LINE_SHARED_FIELDS[number],string>>={};
  for(const field of LINE_SHARED_FIELDS){
   const written=group.map(row=>clean(row[field])).find(value=>!isDownSheetReasonPlaceholder(value));
   if(written)values[field]=written;
  }
  shared.set(key,values);
 }
 return rows.map(row=>{
  const values=shared.get(printedLineKey(row));
  if(!values)return row;
  const filled=LINE_SHARED_FIELDS.filter(field=>values[field]&&isDownSheetReasonPlaceholder(row[field]));
  if(!filled.length)return row;
  const next={...row} as ScannedDownSheetRow;
  for(const field of filled)next[field]=values[field] as string;
  /* Said out loud on the review screen rather than done quietly, so the person
     approving the import can see which rows were read off their line and check
     that line on the paper. */
  const note=`Read from line ${String(row.lineNumber??"").trim()||"?"}, shared with the other buses on it`;
  next.reviewNote=clean(row.reviewNote)?`${clean(row.reviewNote)} · ${note}`:note;
  return next;
 });
}

export function reviewScannedRows(rows:ScannedDownSheetRow[],fleet:ScanFleetBus[],vocabulary:string[]=[]):ReviewedScanRow[]{
 const fleetByNumber=new Map<string,ScanFleetBus[]>();
 for(const bus of fleet){const number=busDigits(bus.n);if(!number)continue;fleetByNumber.set(number,[...(fleetByNumber.get(number)||[]),bus])}
 const scanCounts=new Map<string,number>();
 for(const row of rows){const number=busDigits(row.busNumber);if(number)scanCounts.set(number,(scanCounts.get(number)||0)+1)}
 /* Before anything else reads a row, so the reviewer sees the filled-in
    wording on screen and approves what will actually be imported. */
 return fillPrintedLineSiblings(rows).map((row,index)=>{
  const busNumber=busDigits(row.busNumber),matches=fleetByNumber.get(busNumber)||[],fleetMatch=matches.length===1?"matched":matches.length>1?"duplicate":"unknown";
  /* Corrected before anybody reads it, and still editable afterwards. A margin
     row is capped below the review threshold whatever the model claimed: it was
     handwritten and unnumbered, and those are the rows that come back wrong. */
  const confidence=isMarginRow(row)?Math.min(Number(row.confidence)||0,0.6):row.confidence;
  return {...row,busNumber,confidence,
   reason:correctScannedText(row.reason,vocabulary),
   assignedTo:correctScannedText(row.assignedTo,vocabulary),key:`scan-${row.pageNumber||1}-${row.lineNumber||index+1}-${index}`,selected:fleetMatch==="matched",fleetMatch,busId:fleetMatch==="matched"?matches[0].id:"",repeatedCount:scanCounts.get(busNumber)||1};
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

/* The row's own wording beats the band heading it sat under.

   The prompt has always said so — "a row's own wording still wins over the
   heading it sits under" — but nothing enforced it: normalizedSection takes a
   valid section name and returns it before the reason is ever consulted, so a
   PM'S row written under the UNSCHEDULED heading came back Pending and stayed
   Pending. The paper is not wrong to be laid out that way; a foreman writes the
   week's PMs wherever there is room.

   Only the three headings that describe WHO HAS THE BUS can be overruled, and
   that follows the precedence the page itself documents: where a bus physically
   is outranks what the work is, and what the work is outranks who has it. So
   Vendor Repair, Accident and Roadcall stand — a bus at Cummins for a PM is off
   property, and a bus that was towed is a road call whatever else is written on
   it.

   The question asked is downSheetScheduledOnly, the same predicate the bands
   use, rather than "does an inspection word appear anywhere". A bus carrying a
   misfire AND a PM is a bus that is down, and this must not quietly file it as
   maintenance — which testing "does it mention a PM" would do. */
const HEADING_SECTIONS=new Set(["Pending","Scheduled Repair","Other"]);
export function sectionForScannedRow(section:string,reason:string):ScanImportRecord["section"]{
 const chosen=normalizedSection(clean(section)||reason);
 if(!HEADING_SECTIONS.has(chosen))return chosen;
 return downSheetScheduledOnly({busNumber:"",customReason:reason,section:chosen})?"Inspection":chosen;
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
  /* Everything written about the bus decides its section, not only the first
     row's share of it. A bus that is on the sheet twice — once for a PM and
     once for a fault — must be filed by the fault, and reading only the first
     row would file it by whichever the model happened to return first. */
  const reason=combineUnique(group.map(row=>row.reason));
  return {
   busId:first.busId,
   busNumber:first.busNumber,
   reason,
   assignedTo:combineUnique(group.map(row=>row.assignedTo)),
   category:clean(first.category)||"Miscellaneous",
   repair:clean(first.repair)||"Driver-reported defect",
   section:sectionForScannedRow(first.section,reason),
   shift:normalizedShift(first.shift),
   operationalStatus:normalizedStatus(first.operationalStatus),
  };
 });
}
