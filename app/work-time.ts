import {normalizeBusListHours,type BusList,type BusListEntry} from "./bus-lists.ts";

/* Accrued work time, totalled per person per day.

   This knows nothing about Fleet Campaigns or any other page. It takes rows
   that carry a person, a date and a number of hours, and returns the daily
   totals. Campaigns are simply the first place those rows exist; when the time
   record moves somewhere of its own, or starts drawing on Defect Log repairs
   as well, this module is what it keeps and only its callers change.

   A row with no hours recorded is not a row worked for zero hours. Most of a
   farebox sweep is seconds of work and carries no time at all, so those rows
   are counted separately rather than dragging an average down or implying the
   day was spent on nothing. */

export type WorkTimeRow={person:string;day:string;hours:number;label:string;source:string};

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

export function workTimePeople(lists:BusList[]):string[]{
 const seen=new Set<string>();
 for(const list of lists)for(const entry of list.entries)if(clean(entry.doneBy))seen.add(clean(entry.doneBy));
 return [...seen].sort((left,right)=>left.localeCompare(right));
}

/* How many rows this person ticked without recording time. Reported alongside
   the total so a light-looking day reads as "mostly quick jobs" rather than as
   an hour count that cannot be right. */
function untimedCount(lists:BusList[],person:string){
 let count=0;
 for(const list of lists)for(const entry of list.entries){
  if(clean(entry.doneBy)!==person)continue;
  if(normalizeBusListHours(entry.hours)===undefined)count+=1;
 }
 return count;
}

export function workTimeSummary(lists:BusList[],person:string):WorkTimeSummary{
 const wanted=clean(person);
 const empty:WorkTimeSummary={person:wanted,hours:0,entries:0,untimed:0,days:[]};
 if(!wanted)return empty;
 const byDay=new Map<string,WorkTimeRow[]>();
 for(const row of workTimeRowsFromLists(lists)){
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
  untimed:untimedCount(lists,wanted),
  days,
 };
}

/* Trailing zeros trimmed so a column of times reads evenly: 2, 1.25, 0.5,
   rather than 2 next to 0.50. */
export function formatWorkHours(hours:number){
 return String(Math.round(hours*100)/100);
}
