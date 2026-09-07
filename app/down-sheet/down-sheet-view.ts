export type DownSheetOrder="number-asc"|"number-desc"|"category";

export type DownSheetViewEntry={
 busId?:string;busNumber:string;category?:string;repair?:string;customReason?:string;assignmentType?:string;assignedTo?:string;section?:string;
 repairItems?:Array<{category?:string;repair?:string;details?:string}>;
};

function entryText(entry:DownSheetViewEntry){return [entry.busNumber,entry.category,entry.repair,entry.customReason,entry.assignmentType,entry.assignedTo,entry.section,...(entry.repairItems||[]).flatMap(item=>[item.category,item.repair,item.details])].filter(Boolean).join(" ").toLowerCase()}
function busNumberCompare(a:DownSheetViewEntry,b:DownSheetViewEntry){return a.busNumber.localeCompare(b.busNumber,undefined,{numeric:true})}

export function matchesDownSheetSearch(entry:DownSheetViewEntry,query:string){
 const term=query.trim().toLowerCase();
 if(!term)return true;
 if(/^\d+$/.test(term))return term.length===2?entry.busNumber.endsWith(term):entry.busNumber.includes(term);
 return entryText(entry).includes(term);
}

/* The four bands the sheet always divides itself into.

   A foreman reading this page is answering two different questions at once —
   how many buses are down, and how many of those are not even on the property —
   and a single ranked list of 40 rows answers neither. These are the bands, in
   the order they are read on the page. */
export type DownSheetGroupKey="off-property"|"scheduled"|"unscheduled"|"inspection";
export type DownSheetGroupDefinition={key:DownSheetGroupKey;label:string;hint:string};
export const DOWN_SHEET_GROUPS:DownSheetGroupDefinition[]=[
 {key:"off-property",label:"OFF PROPERTY",hint:"Away at a vendor or otherwise not in the yard"},
 {key:"scheduled",label:"SCHEDULED",hint:"Down in the yard with a mechanic or vendor named"},
 {key:"unscheduled",label:"UNSCHEDULED",hint:"Down in the yard with nobody assigned yet"},
 {key:"inspection",label:"INSPECTIONS & SCHEDULED MAINTENANCE",hint:"Inspections, spark plugs and valve adjustments"},
];
const GROUP_ORDER=DOWN_SHEET_GROUPS.map(group=>group.key);
export function downSheetGroupRank(key:DownSheetGroupKey){return GROUP_ORDER.indexOf(key)}
export function downSheetGroupLabel(key:DownSheetGroupKey){return DOWN_SHEET_GROUPS.find(group=>group.key===key)?.label||""}

/* Spark plugs and valve adjustments are scheduled maintenance the shop plans
   for, not a bus that broke. They are named here because nobody writing the
   sheet calls them an "inspection", and counting them as breakdowns is exactly
   what made the down count read high.

   Read off a real sheet, and every clause here earns its place on one:

   - The service codes are a letter and a number, and the number is whatever the
     interval is — A3, A15, A21, B12, B18, C24 all appear on one morning's
     sheet. An earlier version of this listed the intervals it had been shown
     (6, 12, 15, 18, 24) and quietly filed A3 and A21 as breakdowns.
   - The letter and number are written together or hyphenated, never separated
     by a bare space. That is the whole reason for `(?:\s*-\s*)?` instead of
     `\s*-?\s*`: "needs a 12 volt battery" is a repair, and the looser spacing
     called it an inspection.
   - **PM'S** heads a row carrying several buses at once. It is the shop's word
     for the service, so it belongs here — but **PM DEFECTS** is the opposite
     thing, the faults found while doing one, and those buses are down. The
     lookahead is what keeps a real breakdown out of the maintenance count.
   - TRANS HUB DIFF is a fluid service written as three assemblies with no
     symptom. All three words are required, because a bus with a roaring
     differential is a repair and says so. */
/* The wording of scheduled work, so that a row carrying ONLY this reads as
   maintenance rather than as a bus being broken.

   The PM half of it was missing and the omission was invisible: `pm's` matched,
   but the catalog wording written beside it did not, so "Other preventive
   maintenance — PM'S" had `pm's` struck out and the words "other preventive
   maintenance" left standing — which reads as somebody having written a
   complaint. Every one of the eight Preventive Maintenance catalog items
   behaved that way, so a PM bus counted as a down bus and sat in UNSCHEDULED
   rather than under INSPECTIONS & SCHEDULED MAINTENANCE.

   These are whole phrases on purpose. A complaint written alongside still
   survives the strip and still reads as a fault: "fluid service" is struck out
   and "fluid leak" is not, and "bike rack bent" keeps its "bent". */
export const DOWN_SHEET_INSPECTION_PATTERN=/\binspections?\b|\b[abc](?:\s*-\s*)?\d{1,2}\b|\bspark\s*plugs?\b|\bvalve\s*adjust(?:ment)?\b|\bpm'?s?\b(?!\s*defects?\b)|\btrans(?:mission)?[\s/,&-]*hubs?[\s/,&-]*diff|\b(?:other\s+)?preventive\s*maintenance\b|\badd\s*engine\s*oil\b|\boil\s*(?:and|&|\/)\s*filter\s*service\b|\blubrication\b|\bfluid\s*service\b|\bscheduled\s*campaign\b|\bseasonal\s*preparation\b|\bbike\s*rack\b[\s\-]*(?:arms?)?[\s/,&-]*pivot\s*adjust(?:ment)?/i;

/* The vendors the shop actually sends buses to. Kept as one list because two
   places ask about them: the work-category ordering names which vendor has it,
   and the OFF PROPERTY band asks only whether one does. */
export const DOWN_SHEET_VENDORS:[RegExp,string][]=[[/\bcummins\b/i,"CUMMINS"],[/\bbus\s*(?:&|and)\s*truck\b/i,"BUS & TRUCK"],[/\bthermo\s*king\b/i,"THERMO KING"],[/\ballison\b/i,"ALLISON"]];
export const DOWN_SHEET_OFF_PROPERTY_PATTERN=/\boff[\s-]*(?:property|site)\b/i;

/* What was actually written about the bus, which is not the whole row.

   The bus number, the mechanic and the section are all things ABOUT the entry;
   only these say what is wrong with it. The catalog category is left out on
   purpose — it is a bucket the app picks, not something anybody wrote, and
   "Miscellaneous" sitting in the text would make every row look like it carried
   a complaint. */
/* The app's own stand-ins for "nothing was written here". normalizeEntry stamps
   `Repair required` into the repair field AND into every repair item of any
   entry that arrives without one, so a row whose whole reason is `A15` comes
   back off storage carrying that phrase. Read as a complaint it made every
   inspection look like a bus that broke — the browser said INSPECTIONS 0 where
   the same data said 16 in isolation, which is why this is measured against the
   built app and not only unit-tested. */
const REASON_PLACEHOLDERS=/^(?:repair required|repair|driver-reported defect|miscellaneous|repair required\.?)$/i;
/* Exported because the scan asks the same question before anything is stored:
   a field holding one of these stand-ins is a field nobody wrote in, and a row
   that inherits its neighbour's wording has to know the difference between an
   empty field and a filled one. One definition, two callers. */
export function isDownSheetReasonPlaceholder(value:unknown){
 const text=String(value??"").trim();
 return !text||REASON_PLACEHOLDERS.test(text);
}
function reasonText(entry:DownSheetViewEntry){
 const items=(entry.repairItems||[]).flatMap(item=>[item.repair,item.details]);
 return [entry.repair,entry.customReason,...items]
  .map(value=>String(value||"").trim())
  .filter(value=>value&&!REASON_PLACEHOLDERS.test(value))
  .join(" / ").toLowerCase();
}
const INSPECTION_STRIPPER=new RegExp(DOWN_SHEET_INSPECTION_PATTERN.source,"gi");

/* Is scheduled maintenance ALL this row carries?

   A bus can be on the sheet twice — once for a fault and once because a PM came
   due — and the sheet folds those into the one row a bus is allowed. Asking
   only "does this row mention a PM" then filed a bus with a live misfire under
   inspections, and a real breakdown vanished out of the down count. That is the
   one thing this page must never do.

   So the maintenance wording is struck out and whatever is left is examined. If
   anything with words in it survives, somebody wrote a complaint here and the
   bus is down; leftover punctuation and bus numbers are not a complaint. Both
   facts still show on the row — the reason keeps saying MISFIRES / PM'S — it is
   only the counting that has to pick one, and it picks the fault.

   PM DEFECTS needs no special case here: the maintenance pattern already
   refuses to match it, so those rows never reach this question. */
export function downSheetScheduledOnly(entry:DownSheetViewEntry){
 const written=reasonText(entry);
 if(!written)return entry.section==="Inspection";
 if(!DOWN_SHEET_INSPECTION_PATTERN.test(written))return false;
 const remainder=written.replace(INSPECTION_STRIPPER," ").replace(/[^a-z0-9]+/g," ");
 return !/[a-z]{3}/.test(remainder);
}

/* Out on the road, right now.

   The same test smart-status.ts uses to decide a bus is in service: the map
   owns where a bus is, and a road slot is where it puts one that is out
   working. Written once here so the sheet and the map cannot disagree about
   what "on the road" means. */
export function isDownSheetRoadLocation(location:string){return String(location||"").startsWith("road-")}

/* What a row MENTIONS, which is a different question from which band it lands
   in — and the reason these two are not simply the bands filtered by location.

   The sheet folds a bus into the one row it is allowed, so a bus that came due
   for a PM and is also missing on cylinder 5 has a single row reading
   "PM'S / MISFIRES". The bands must pick one for it and they pick the fault,
   because a bus with a live misfire is a bus that is down. But a foreman
   counting what is out on the road wants that bus in BOTH tallies: somebody
   owes it a PM, and somebody owes it a misfire diagnosis, and neither errand
   disappears because the other exists.

   So these ask what is written rather than where the row was filed. An empty
   row falls back to its section, the same way downSheetScheduledOnly does. */
export function downSheetMentionsInspection(entry:DownSheetViewEntry){
 const written=reasonText(entry);
 if(!written)return entry.section==="Inspection";
 return DOWN_SHEET_INSPECTION_PATTERN.test(written);
}
/* Anything beyond scheduled maintenance is a fault, which is exactly the
   question the bands already answer — asked here from the other side. PM
   DEFECTS lands here rather than in inspections, which is correct: those are
   the faults found while doing a PM. */
export function downSheetMentionsDefect(entry:DownSheetViewEntry){return !downSheetScheduledOnly(entry)}

export type DownSheetRoadKind="inspection"|"down";

export function downSheetRoadMatch(entry:DownSheetViewEntry,location:string,kind:DownSheetRoadKind){
 if(!isDownSheetRoadLocation(location))return false;
 return kind==="inspection"?downSheetMentionsInspection(entry):downSheetMentionsDefect(entry);
}

export function downSheetRoadEntries<T extends DownSheetViewEntry>(entries:T[],locations:Record<string,string>,kind:DownSheetRoadKind){
 return entries.filter(entry=>downSheetRoadMatch(entry,locations[entry.busId||""]||"",kind));
}

/* Both tallies in one pass. A bus carrying an inspection and a fault is counted
   in both, on purpose — see above. */
export function downSheetRoadCounts<T extends DownSheetViewEntry>(entries:T[],locations:Record<string,string>={}){
 let inspection=0,down=0;
 for(const entry of entries){
  if(!isDownSheetRoadLocation(locations[entry.busId||""]||""))continue;
  if(downSheetMentionsInspection(entry))inspection++;
  if(downSheetMentionsDefect(entry))down++;
 }
 return {inspection,down};
}

/* Precedence, which is deliberately NOT the reading order above.

   Where the bus physically is beats everything: a bus sitting at Bus & Truck is
   off property whether it went there for an inspection or a transmission. What
   the work IS comes next, because an inspection is an inspection whether or not
   a name is pencilled beside it. Only then does it come down to who has it —
   which is the question the pencilled-in overflow rows at the bottom of a paper
   sheet never answer, and why those land in UNSCHEDULED rather than vanishing
   into one undifferentiated list. */
export function downSheetGroup(entry:DownSheetViewEntry,location=""):DownSheetGroupKey{
 if(String(location||"").startsWith("offsite-"))return "off-property";
 if(entry.assignmentType==="Vendor"||entry.section==="Vendor Repair")return "off-property";
 /* The paper column is headed MECHANIC/LOCATION, and a vendor's name written
    there is the sheet saying where the bus is, not who is working on it. Only
    that column counts: "waiting on a call back from Cummins" is a note about a
    bus sitting in the yard, and reading vendor names out of the whole row would
    send it off property. */
 if(DOWN_SHEET_VENDORS.some(([pattern])=>pattern.test(String(entry.assignedTo||""))))return "off-property";
 if(DOWN_SHEET_OFF_PROPERTY_PATTERN.test(entryText(entry)))return "off-property";
 if(downSheetScheduledOnly(entry))return "inspection";
 return String(entry.assignedTo||"").trim()?"scheduled":"unscheduled";
}

/* Sections are the structure of the page; ORDER is how rows sit inside one.
   Choosing WORK CATEGORIES re-sorts within each band rather than dissolving the
   bands, so the counts on the dividers never change with the sort. */
export function groupDownSheetEntries<T extends DownSheetViewEntry>(entries:T[],order:DownSheetOrder,locations:Record<string,string>={}){
 const of=(entry:T)=>downSheetGroup(entry,locations[entry.busId||""]||"");
 return DOWN_SHEET_GROUPS.map(group=>({...group,entries:orderDownSheetEntries(entries.filter(entry=>of(entry)===group.key),order)}));
}

export function downSheetWorkGroup(entry:DownSheetViewEntry){
 const text=entryText(entry);
 if(DOWN_SHEET_INSPECTION_PATTERN.test(text))return {rank:3,label:"INSPECTIONS / SCHEDULED MAINTENANCE"};
 if(/\bbody(?:work|\s*shop)?\b|\bcollision\b|\bpaint\s*(?:booth|repair)?\b/i.test(text))return {rank:1,label:"BODY SHOP"};
 const vendor=DOWN_SHEET_VENDORS.find(([pattern])=>pattern.test(text));
 if(vendor)return {rank:2,label:"VENDOR — "+vendor[1]};
 if(entry.assignmentType==="Vendor"||entry.section==="Vendor Repair")return {rank:2,label:"VENDOR — OTHER"};
 return {rank:0,label:"GENERAL REPAIRS"};
}

export function orderDownSheetEntries<T extends DownSheetViewEntry>(entries:T[],order:DownSheetOrder){
 const sorted=[...entries];
 if(order==="number-desc")return sorted.sort((a,b)=>busNumberCompare(b,a));
 if(order==="category")return sorted.sort((a,b)=>{const ag=downSheetWorkGroup(a),bg=downSheetWorkGroup(b);return ag.rank-bg.rank||ag.label.localeCompare(bg.label)||busNumberCompare(a,b)});
 return sorted.sort(busNumberCompare);
}
