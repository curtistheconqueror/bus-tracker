import type {StructuredDefect} from "./repair-catalog";

export type QuickFilterKey="ac"|"check-engine"|"bad-ramp"|"no-horn"|"farebox"|"ibs-ventra"|"leak"|"add-oil";
export type QuickFilterBus={
 id:string;n?:string;pendingRepair?:string;checkEngine?:boolean;badRampKneeler?:boolean;noHorn?:boolean;farebox?:boolean;ibsVentra?:boolean;defects?:StructuredDefect[];
};

export const QUICK_FILTERS:{key:QuickFilterKey;label:string;shortLabel:string}[]=[
 {key:"ac",label:"A/C Buses",shortLabel:"A/C"},
 {key:"check-engine",label:"Check Engine",shortLabel:"Engine"},
 {key:"bad-ramp",label:"Ramp / Kneeler (ADA)",shortLabel:"ADA"},
 {key:"no-horn",label:"No Horn",shortLabel:"Horn"},
 {key:"farebox",label:"Farebox",shortLabel:"Farebox"},
 {key:"ibs-ventra",label:"IBS & Ventra",shortLabel:"IBS/Ventra"},
 {key:"leak",label:"Leaks",shortLabel:"Leaks"},
 {key:"add-oil",label:"Add Oil",shortLabel:"Oil"},
];

function activeText(bus:QuickFilterBus){
 const defectText=(bus.defects||[]).filter(defect=>defect.state!=="completed").map(defect=>[defect.category,defect.issue,defect.details,defect.diagnosticNote,defect.actionTaken,defect.shopNotes].filter(Boolean).join(" "));
 return [bus.pendingRepair||"",...defectText].join(" ").toLowerCase();
}

export function quickFilterMatch(bus:QuickFilterBus,key:QuickFilterKey){
 const text=activeText(bus);
 if(key==="ac")return /\b(?:a\/c|ac|hvac|air conditioning)\b/i.test(text);
 if(key==="check-engine")return Boolean(bus.checkEngine)||/\b(?:check|stop)\s+(?:engine|eng)\b|\bengine\s+light\b/i.test(text);
 if(key==="bad-ramp")return Boolean(bus.badRampKneeler)||/\b(?:ramp|kneeler|wheelchair lift|wheelchair ramp)\b/i.test(text);
 if(key==="no-horn")return Boolean(bus.noHorn)||/\b(?:no horn|horn (?:inop|inoperative|not working|failed|failure))\b/i.test(text);
 if(key==="farebox")return Boolean(bus.farebox)||/\bfare\s*box\b|\bfarebox\b/i.test(text);
 if(key==="ibs-ventra")return Boolean(bus.ibsVentra)||/\b(?:ibs|ventra)\b/i.test(text);
 if(key==="leak")return /\b(?:leak|leaks|leaking|seep|seeping)\b/i.test(text);
 return /\b(?:add(?:ed|ing)?|needs?|low)\s+(?:(?:\d+(?:\.\d+)?\s*)?(?:qt|qts|quart|quarts)\s+(?:of\s+)?)?(?:engine\s+)?oil\b|\b(?:engine\s+)?oil\s+(?:low|needed|required)\b/i.test(text);
}

export function quickFilterBusIds<T extends QuickFilterBus>(fleet:T[],key:QuickFilterKey){return fleet.filter(bus=>quickFilterMatch(bus,key)).map(bus=>bus.id)}
