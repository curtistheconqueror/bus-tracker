import {normalizeBusListHours,type BusList,type BusListEntry} from "./bus-lists.ts";
import {normalizeDefects,normalizeRepairHours} from "./repair-catalog.ts";

/* Accrued work time, totalled per person per day.

   This knows nothing about Fleet Campaigns or any other page. It takes rows
   that carry a person, a date and a number of hours, and returns the daily
   totals. Two things produce those rows today: a campaign row ticked off with
   hours against it, and a Defect Log repair saved as fixed with billable time
   on it. Both land in the same day totals, because a shift spent half on a
   farebox sweep and half on a repair is still one shift.

   Adding a third source is a function that returns WorkTimeRow[] and a line in
   sourceRows below. Nothing else here needs to know where a row came from.

   A row with no hours recorded is not a row worked for zero hours. Most of a
   farebox sweep is seconds of work and carries no time at all, and repairs
   fixed before the time field existed carry none either, so those are counted
   separately rather than dragging a total down or implying the day was spent
   on nothing. */

export type WorkTimeRow={person:string;day:string;hours:number;label:string;source:string;note?:string};

/* What a bus has to look like for its repairs to count. Structural on purpose:
   the board's own Bus type carries fifty fields this has no business knowing
   about, and a record with a number and some defects is all a timesheet needs. */
export type WorkTimeBus={id?:string;n?:string;defects?:unknown;pendingRepair?:string};

/* Every record the timesheet draws on. Both are optional so a caller that only
   has one of them passes only that. */
export type WorkTimeSource={lists?:BusList[];buses?:WorkTimeBus[]};

export type WorkTimeDay={day:string;hours:number;entries:number;rows:WorkTimeRow[]};
export type WorkTimeSummary={person:string;hours:number;entries:number;untimed:number;days:WorkTimeDay[]};

function clean(value:unknown){return String(value??"").trim()}

/* The calendar day the work landed on, in the viewer's own timezone. A repair
   ticked at 11pm belongs to that day's timesheet, not to the next one in UTC. */
export function workDayKey(iso:string):string{
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return "";
 const month=String(date.getMonth()+1).padStart(2,"0"),day=String(date.getDate()).padStart(2,"0");
 return date.getFullYear()+"-"+month+"-"+day;
}

export function workDayLabel(day:string):string{
 const date=new Date(day+"T12:00:00");
 return Number.isNaN(date.getTime())?day
  :new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(date);
}

/* Pulled out of campaign rows here, but the shape is deliberately plain so any
   other record with a person, a timestamp and hours can feed the same summary. */
export function workTimeRowsFromLists(lists:BusList[]):WorkTimeRow[]{
 const rows:WorkTimeRow[]=[];
 for(const list of lists){
  for(const entry of list.entries as BusListEntry[]){
   const hours=normalizeBusListHours(entry.hours);
   const person=clean(entry.doneBy);
   const day=workDayKey(clean(entry.doneAt));
   if(hours===undefined||!person||!day)continue;
   rows.push({person,day,hours,label:entry.busNumber?"Bus "+entry.busNumber:"Row",source:list.name});
  }
 }
 return rows;
}

/* Every completed repair reads as one row. Diagnostic and repair time are
   stored apart because they are different work, but a day's total wants them
   added: the shift was spent on both. The split is kept in the note so a long
   day reads as what it was rather than as one unexplained number.

   Only one timestamp exists on a repair, so a bus diagnosed on Monday and
   fixed on Tuesday puts both figures on Tuesday. That is the record's limit,
   not a rounding: saving the diagnosis on the day it was done is what keeps
   the two days honest, and the split in the note makes a lopsided day visible. */
export function workTimeRowsFromFleet(buses:WorkTimeBus[]):WorkTimeRow[]{
 const rows:WorkTimeRow[]=[];
 for(const bus of buses){
  for(const defect of normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id||"bus")){
   if(defect.state!=="completed")continue;
   const person=clean(defect.completedBy),day=workDayKey(clean(defect.completedAt));
   if(!person||!day)continue;
   const repair=normalizeRepairHours(defect.repairHours)||0,diagnostic=normalizeRepairHours(defect.diagnosticHours)||0;
   const hours=Math.round((repair+diagnostic)*100)/100;
   if(!hours)continue;
   rows.push({person,day,hours,label:clean(bus.n)?"Bus "+clean(bus.n):"Repair",source:"Defect Log",
    note:diagnostic&&repair?"incl "+formatWorkHours(diagnostic)+" diag":diagnostic?"diagnosis":undefined});
  }
 }
 return rows;
}

function sourceRows(source:WorkTimeSource):WorkTimeRow[]{
 return [...workTimeRowsFromLists(source.lists||[]),...workTimeRowsFromFleet(source.buses||[])];
}

export function workTimePeople(source:WorkTimeSource):string[]{
 const seen=new Set<string>();
 for(const list of source.lists||[])for(const entry of list.entries)if(clean(entry.doneBy))seen.add(clean(entry.doneBy));
 for(const bus of source.buses||[])for(const defect of normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id||"bus")){
  if(defect.state==="completed"&&clean(defect.completedBy))seen.add(clean(defect.completedBy));
 }
 return [...seen].sort((left,right)=>left.localeCompare(right));
}

/* How many rows this person finished without recording time. Reported alongside
   the total so a light-looking day reads as "mostly quick jobs" rather than as
   an hour count that cannot be right. Repairs closed before the time field
   existed land here too, which is the truthful place for them. */
function untimedCount(source:WorkTimeSource,person:string){
 let count=0;
 for(const list of source.lists||[])for(const entry of list.entries){
  if(clean(entry.doneBy)!==person)continue;
  if(normalizeBusListHours(entry.hours)===undefined)count+=1;
 }
 for(const bus of source.buses||[])for(const defect of normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id||"bus")){
  if(defect.state!=="completed"||clean(defect.completedBy)!==person)continue;
  if(!(normalizeRepairHours(defect.repairHours)||0)&&!(normalizeRepairHours(defect.diagnosticHours)||0))count+=1;
 }
 return count;
}

export function workTimeSummary(source:WorkTimeSource,person:string):WorkTimeSummary{
 const wanted=clean(person);
 const empty:WorkTimeSummary={person:wanted,hours:0,entries:0,untimed:0,days:[]};
 if(!wanted)return empty;
 const byDay=new Map<string,WorkTimeRow[]>();
 for(const row of sourceRows(source)){
  if(row.person!==wanted)continue;
  if(!byDay.has(row.day))byDay.set(row.day,[]);
  byDay.get(row.day)!.push(row);
 }
 const days=[...byDay.entries()]
  .map(([day,rows])=>({day,rows,entries:rows.length,
   hours:Math.round(rows.reduce((total,row)=>total+row.hours,0)*100)/100}))
  /* Most recent first: the day being worked is the one being checked. */
  .sort((left,right)=>right.day.localeCompare(left.day));
 return {
  person:wanted,
  hours:Math.round(days.reduce((total,day)=>total+day.hours,0)*100)/100,
  entries:days.reduce((total,day)=>total+day.entries,0),
  untimed:untimedCount(source,wanted),
  days,
 };
}

/* Trailing zeros trimmed so a column of times reads evenly: 2, 1.25, 0.5,
   rather than 2 next to 0.50. */
export function formatWorkHours(hours:number){
 return String(Math.round(hours*100)/100);
}
