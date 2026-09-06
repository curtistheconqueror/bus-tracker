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
export const DOWN_SHEET_INSPECTION_PATTERN=/\binspections?\b|\b[abc](?:\s*-\s*)?\d{1,2}\b|\bspark\s*plugs?\b|\bvalve\s*adjust(?:ment)?\b|\bpm'?s?\b(?!\s*defects?\b)|\btrans(?:mission)?[\s/,&-]*hubs?[\s/,&-]*diff/i;

/* The vendors the shop actually sends buses to. Kept as one list because two
   places ask about them: the work-category ordering names which vendor has it,
   and the OFF PROPERTY band asks only whether one does. */
export const DOWN_SHEET_VENDORS:[RegExp,string][]=[[/\bcummins\b/i,"CUMMINS"],[/\bbus\s*(?:&|and)\s*truck\b/i,"BUS & TRUCK"],[/\bthermo\s*king\b/i,"THERMO KING"],[/\ballison\b/i,"ALLISON"]];
export const DOWN_SHEET_OFF_PROPERTY_PATTERN=/\boff[\s-]*(?:property|site)\b/i;

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
 if(entry.section==="Inspection"||DOWN_SHEET_INSPECTION_PATTERN.test(entryText(entry)))return "inspection";
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
