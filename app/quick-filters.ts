import {isDownSheetRecommended,isUnresolved,normalizeDefects,type StructuredDefect} from "./repair-catalog.ts";

export type QuickFilterKey="ac"|"check-engine"|"bad-ramp"|"no-horn"|"farebox"|"ibs-ventra"|"leak"|"add-oil"|"no-cabin-heat"|"not-duplicated"|"down-sheet-recommended"|"deferred";
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
 /* The winter list. It is built in the warm months on purpose: the heating side
    of a split surge tank can sit empty all summer without anybody noticing,
    because nothing about the bus is wrong until the first cold morning, and by
    then the list is a queue rather than a plan. */
 {key:"no-cabin-heat",label:"No Heat Buses",shortLabel:"No Heat Buses"},
 {key:"not-duplicated",label:"Defect / Condition Not Duplicated",shortLabel:"Not Duplicated"},
 /* First in the list is tempting and wrong: the others answer "what is broken",
    this one answers "what am I asking somebody to schedule". It sits at the end
    where a foreman looks for it deliberately rather than falling onto it while
    reaching for Check Engine. */
 {key:"down-sheet-recommended",label:"Recommended for Down Sheet",shortLabel:"DS Rec"},
 /* Held back from B12 without going on the Down Sheet yet. Sits last, next to
    DS Rec, for the same reason: this answers "what am I about to forget",
    not "what is broken". */
 {key:"deferred",label:"Deferred (Held from Service)",shortLabel:"Deferred"},
];

function quickFilterTextMatch(text:string,key:QuickFilterKey){
 if(key==="ac")return /\b(?:a\/c|ac|hvac|air conditioning)\b/i.test(text);
 if(key==="check-engine")return /\b(?:check|stop)\s+(?:engine|eng)\b|\bengine\s+light\b/i.test(text);
 if(key==="bad-ramp")return /\b(?:ramp|kneeler|wheelchair lift|wheelchair ramp)\b/i.test(text);
 if(key==="no-horn")return /\bhorn\b/i.test(text);
 if(key==="farebox")return /\bfare\s*box\b|\bfarebox\b/i.test(text);
 if(key==="ibs-ventra")return /\b(?:ibs|ventra)\b/i.test(text);
 if(key==="leak")return /\b(?:leak|leaks|leaking|seep|seeping)\b/i.test(text);
 /* Matched on the repair rather than on the word "heat", which appears in
    Amerex heat sensors, in Overheating, and in half the estimate notes in the
    fleet. A winter list that pulls in an overheating bus is a list somebody
    checks once and then stops trusting. */
 if(key==="no-cabin-heat")return /\bsurge tank\s*-\s*(?:heating side|both sides)\b/i.test(text)||/\bheater\s*\/\s*defroster\b/i.test(text);
 if(key==="not-duplicated"||key==="down-sheet-recommended"||key==="deferred")return false;
 return /\b(?:add(?:ed|ing)?|needs?|low)\s+(?:(?:\d+(?:\.\d+)?\s*)?(?:qt|qts|quart|quarts)\s+(?:of\s+)?)?(?:engine\s+)?oil\b|\b(?:engine\s+)?oil\s+(?:low|needed|required)\b/i.test(text);
}

function defectText(defect:StructuredDefect){
 return [defect.category,defect.issue,...(defect.symptoms||[]),defect.details,defect.diagnosticNote,defect.actionTaken,defect.shopNotes].filter(Boolean).join(" ");
}

export function quickFilterDefects(bus:QuickFilterBus,key:QuickFilterKey){
 const normalized=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),matches=normalized.filter(defect=>
  key==="not-duplicated"?Boolean(defect.conditionNotDuplicated)
  /* Only repairs still outstanding. A recommendation on a repair that has since
     been fixed is a job nobody needs scheduled, and leaving it in the list is
     how a shared list stops being trusted. */
  :key==="down-sheet-recommended"?isUnresolved(defect)&&isDownSheetRecommended(defect)
  /* Every currently-deferred defect, on or off the Down Sheet. The caller
     narrows this to genuinely held-back buses — it has to, since telling the
     two apart needs the Down Sheet's own entries, which this module never
     sees. */
  :key==="deferred"?isUnresolved(defect)&&defect.state==="deferred"
  :isUnresolved(defect)&&quickFilterTextMatch(defectText(defect),key)),legacy=(bus.pendingRepair||"").trim();
 if(matches.length||normalized.length||!legacy||!quickFilterTextMatch(legacy,key))return matches;
 return [{id:bus.id+"-quick-filter-legacy",category:"Miscellaneous",issue:"Manual entry",details:legacy,operability:"service",state:"open"} as StructuredDefect];
}

export function quickFilterFlagMatch(bus:QuickFilterBus,key:QuickFilterKey){
 if(key==="check-engine")return Boolean(bus.checkEngine);
 if(key==="bad-ramp")return Boolean(bus.badRampKneeler);
 if(key==="no-horn")return Boolean(bus.noHorn);
 if(key==="farebox")return Boolean(bus.farebox);
 if(key==="ibs-ventra")return Boolean(bus.ibsVentra);
 return false;
}

export function quickFilterFallbackLabel(key:QuickFilterKey){
 return ({
  ac:"A/C tracker flag",
  "check-engine":"Check-engine tracker flag",
  "bad-ramp":"Ramp / kneeler tracker flag",
  "no-horn":"No-horn tracker flag",
  farebox:"Farebox tracker flag",
  "ibs-ventra":"IBS / Ventra tracker flag",
  leak:"Leak tracker flag",
  "add-oil":"Add-oil tracker flag",
  "no-cabin-heat":"Cabin-heat tracker flag",
  "not-duplicated":"Defect / condition not duplicated",
  "down-sheet-recommended":"Recommended for the Down Sheet",
  deferred:"Deferred, held back from service",
 } as Record<QuickFilterKey,string>)[key];
}

export function quickFilterMatch(bus:QuickFilterBus,key:QuickFilterKey){
 return quickFilterFlagMatch(bus,key)||quickFilterDefects(bus,key).length>0;
}

export function quickFilterBusIds<T extends QuickFilterBus>(fleet:T[],key:QuickFilterKey){return fleet.filter(bus=>quickFilterMatch(bus,key)).map(bus=>bus.id)}
