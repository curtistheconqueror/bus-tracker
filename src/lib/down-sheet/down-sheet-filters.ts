import {downSheetGroup,downSheetMentionsInspection,isDownSheetRoadLocation,type DownSheetViewEntry} from "./down-sheet-view.ts";

/* QUICK FILTERS FOR THE SHEET ITSELF, which is why they are not the Defect
   Log's.

   That page has thirteen of these already and they are all the same shape of
   question: does this BUS carry a defect whose wording mentions a ramp, a
   farebox, a leak. Reusing them here looked obvious and is wrong — the Down
   Sheet's rows are ENTRIES, one per bus, and the questions somebody asks of it
   are about the entry rather than the fault: who has this bus, is it here, is
   anybody on it, how long has it been sitting. Pointing the defect filters at
   entries would have answered a question nobody was asking on this page while
   leaving every one of these unasked.

   Curtis asked for them so the sheet could be SHARED with detail: "we should
   have a quick filters list for that actually so I can share the downsheet with
   someone wanting details." The person on the other end of that message is
   almost never asking for the whole sheet. They are asking which buses are
   waiting on parts, or which ones are off at a vendor, and the answer is worth
   sending only when it is that list and not forty rows. */

export type DownSheetFilterKey=
 "unassigned"|"waiting-parts"|"off-property"|"inspection"|"body-shop"|"road-call"|"on-road"|"aging"|"no-estimate";

export type DownSheetFilterEntry=DownSheetViewEntry&{
 id?:string;workflow?:string;priority?:string;createdAt?:string;
 timeEstimate?:{totalMinutes?:number};
 repairItems?:Array<{category?:string;repair?:string;details?:string;done?:boolean;estimateEnabled?:boolean;timeEstimate?:{totalMinutes?:number}}>;
};

/* How long a bus has to have been on the sheet before it reads as stuck.

   Three days rather than a week. A bus down over a weekend is normal and a bus
   down since Tuesday is a question somebody has to answer, and the point of
   this list is to produce the second one while it can still be acted on. */
export const DOWN_SHEET_AGING_DAYS=3;

/* WHAT QUICK FILTERS OFFERS ON THE SHEET, since release 213: four. Curtis,
   shown all nine: "Get rid of everything under the first 3 options except
   roadcalls." Down 3+ Days, On The Road Right Now, Body Shop / Accident,
   Inspections & Scheduled Maintenance and No Time Estimate Set are no longer
   offered. Their keys stay in the type and in `downSheetFilterMatch`, so a
   saved or linked one is read as no filter rather than as an error, and the
   counts tiles that cover the same ground (INSPECTIONS, the two ON ROAD
   tallies) are untouched. The five watch lists sit above these in the menu
   (`down-sheet-watch-lists.ts`). */
export const DOWN_SHEET_FILTERS:{key:DownSheetFilterKey;label:string;shortLabel:string;hint:string}[]=[
 /* First, because it is the only one of these that names work nobody has picked
    up. Everything else on this list has somebody or somewhere attached to it. */
 {key:"unassigned",label:"Nobody Assigned Yet",shortLabel:"Unassigned",hint:"On the sheet with no mechanic or vendor named"},
 {key:"waiting-parts",label:"Waiting For Parts",shortLabel:"Parts",hint:"Work that cannot move until something arrives"},
 {key:"off-property",label:"Off Property",shortLabel:"Off Property",hint:"At a vendor or otherwise out of the yard"},
 {key:"road-call",label:"Road Calls",shortLabel:"Road Calls",hint:"Rows written up off a road call"},
];

export function downSheetFilterFromValue(value:unknown):DownSheetFilterKey|null{
 return DOWN_SHEET_FILTERS.some(item=>item.key===value)?value as DownSheetFilterKey:null;
}
export function downSheetFilterLabel(key:DownSheetFilterKey){return DOWN_SHEET_FILTERS.find(item=>item.key===key)?.label||""}

function entryWords(entry:DownSheetFilterEntry){
 return [entry.category,entry.repair,entry.customReason,entry.section,entry.assignedTo,
  ...(entry.repairItems||[]).flatMap(item=>[item.category,item.repair,item.details])]
  .filter(Boolean).join(" ");
}

/* Whatever estimate the row carries, from either place it can be written.

   An entry has its own timeEstimate AND one per repair item, and a row estimated
   only on its repairs would have been reported as having none. */
function estimateMinutes(entry:DownSheetFilterEntry){
 return Math.max(0,Number(entry.timeEstimate?.totalMinutes)||0)+
  (entry.repairItems||[]).reduce((total,item)=>total+(item.estimateEnabled===false?0:Math.max(0,Number(item.timeEstimate?.totalMinutes)||0)),0);
}

export function downSheetEntryAgeDays(entry:DownSheetFilterEntry,now=new Date().toISOString()){
 const started=Date.parse(String(entry.createdAt||""));
 if(Number.isNaN(started))return null;
 /* Floored at zero. A device with a clock set ahead writes entries stamped in
    the future, and a negative age would sort them to the top of a list headed
    "down the longest". */
 return Math.max(0,(new Date(now).getTime()-started)/(24*60*60*1000));
}

export function downSheetFilterMatch(entry:DownSheetFilterEntry,location:string,key:DownSheetFilterKey,now=new Date().toISOString()){
 if(key==="unassigned")return downSheetGroup(entry,location)==="unassigned"||!String(entry.assignedTo||"").trim();
 if(key==="waiting-parts")return entry.workflow==="Waiting for Parts";
 if(key==="off-property")return downSheetGroup(entry,location)==="off-property";
 /* Where the bus IS, asked of the map, not of the row. A bus can be out working
    while its entry says Scheduled — that is the whole reason this list exists —
    so the row's own fields can never answer it. */
 if(key==="on-road")return isDownSheetRoadLocation(location);
 if(key==="aging")return (downSheetEntryAgeDays(entry,now)??0)>=DOWN_SHEET_AGING_DAYS;
 if(key==="body-shop")return entry.section==="Accident"||/\bbody(?:work|\s*shop)?\b|\bcollision\b|\bpaint\s*(?:booth|repair)?\b/i.test(entryWords(entry));
 if(key==="road-call")return entry.section==="Roadcall"||/\broad\s*call\b/i.test(entryWords(entry));
 /* The sheet's own reading of what a row carries, not a second copy of it. A
    bus written up for a PM and a misfire counts here, the same way the ROAD
    tallies count it: somebody still owes it the PM. */
 if(key==="inspection")return downSheetMentionsInspection(entry);
 return estimateMinutes(entry)<=0;
}

export function downSheetFilterEntries<T extends DownSheetFilterEntry>(entries:T[],locations:Record<string,string>,key:DownSheetFilterKey,now=new Date().toISOString()){
 return entries.filter(entry=>downSheetFilterMatch(entry,locations[entry.busId||""]||"",key,now));
}

/* Every count in one pass, because the menu draws all of them at once and
   asking one at a time walks the sheet once per filter on a phone. */
export function downSheetFilterCounts<T extends DownSheetFilterEntry>(entries:T[],locations:Record<string,string>={},now=new Date().toISOString()){
 const counts={} as Record<DownSheetFilterKey,number>;
 for(const item of DOWN_SHEET_FILTERS)counts[item.key]=0;
 for(const entry of entries){
  const location=locations[entry.busId||""]||"";
  for(const item of DOWN_SHEET_FILTERS)if(downSheetFilterMatch(entry,location,item.key,now))counts[item.key]++;
 }
 return counts;
}
