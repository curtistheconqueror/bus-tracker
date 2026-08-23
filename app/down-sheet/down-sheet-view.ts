export type DownSheetOrder="number-asc"|"number-desc"|"category";

export type DownSheetViewEntry={
 busNumber:string;category?:string;repair?:string;customReason?:string;assignmentType?:string;assignedTo?:string;section?:string;
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

export function downSheetWorkGroup(entry:DownSheetViewEntry){
 const text=entryText(entry);
 if(/\binspection\b|\b[abc]\s*-?\s*(?:6|12|15|18|24)\b|\bspark\s*plugs?\b|\bvalve\s*adjust(?:ment)?\b/i.test(text))return {rank:3,label:"INSPECTIONS / SCHEDULED MAINTENANCE"};
 if(/\bbody(?:work|\s*shop)?\b|\bcollision\b|\bpaint\s*(?:booth|repair)?\b/i.test(text))return {rank:1,label:"BODY SHOP"};
 const vendors:[[RegExp,string],[RegExp,string],[RegExp,string],[RegExp,string]]=[[/\bcummins\b/i,"CUMMINS"],[/\bbus\s*(?:&|and)\s*truck\b/i,"BUS & TRUCK"],[/\bthermo\s*king\b/i,"THERMO KING"],[/\ballison\b/i,"ALLISON"]];
 const vendor=vendors.find(([pattern])=>pattern.test(text));
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
