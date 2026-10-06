import {hasWorkState,isDownSheetRecommended,isUnresolved,loggedMinutesElapsed,normalizeDefects,ROAD_CALL_KEY,type StructuredDefect} from "./repair-catalog.ts";
import {hasRecentRoadCall,ROAD_CALL_WINDOW_DAYS,type RoadCallEvent} from "../fleet/road-calls.ts";
import {isFarebox,isIbsVentra} from "../fleet/tech-services.ts";

export type QuickFilterKey="ac"|"check-engine"|"bad-ramp"|"no-horn"|"farebox"|"ibs-ventra"|"leak"|"add-oil"|"no-cabin-heat"|"not-duplicated"|"down-sheet-recommended"|"deferred"|"road-call"|"logged";
export type QuickFilterBus={
 id:string;n?:string;pendingRepair?:string;checkEngine?:boolean;badRampKneeler?:boolean;noHorn?:boolean;farebox?:boolean;ibsVentra?:boolean;defects?:StructuredDefect[];roadCalls?:RoadCallEvent[];
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
 /* This week's breakdowns, and the one list here that empties itself. A bus
    joins the moment it road-calls and leaves on its own as that road call ages
    past seven days: no clearing, no end-of-week reset, and nothing deleted to
    make it happen. The list is a window onto the history, not the history.

    It sits with the other "what is broken" lists rather than at the end,
    because that is the question it answers - the last three are about what
    somebody still has to decide. */
 {key:"road-call",label:"Road Calls (Last "+ROAD_CALL_WINDOW_DAYS+" Days)",shortLabel:"Road Calls"},
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
 /* WHAT GOT WRITTEN DOWN, in the window the drawer is set to — the third list
    Curtis asked to be able to send.

    Curtis: "I just need a snapshot of things that are deferred, recommended for
    the down sheet, or any defects that I logged." Those first two already had
    the window chips; this is the one that did not exist. It is the only filter
    here whose question is WHEN rather than WHAT, which is why the drawer opens
    it on SHIFT instead of ALL — every other filter names a fault and this one
    names a stretch of time.

    OPEN WORK ONLY. Curtis: "anything fixed, I don't need a record of that." A
    defect logged and closed on the same shift is a thing that happened, not a
    thing to hand over, and a handover list padded with finished work is a list
    somebody skims instead of reads. It is also why this is not simply the
    Defect Log's own feed with a date filter on it. */
 {key:"logged",label:"Defects Logged",shortLabel:"Logged"},
];

function quickFilterTextMatch(text:string,key:QuickFilterKey){
 if(key==="ac")return /\b(?:a\/c|ac|hvac|air conditioning)\b/i.test(text);
 if(key==="check-engine")return /\b(?:check|stop)\s+(?:engine|eng)\b|\bengine\s+light\b/i.test(text);
 if(key==="bad-ramp")return /\b(?:ramp|kneeler|wheelchair lift|wheelchair ramp)\b/i.test(text);
 if(key==="no-horn")return /\bhorn\b/i.test(text);
 /* Both of these read the ONE table, in tech-services.ts, rather than keeping
    a regex of their own. The Fleet Status Report needs the same devices counted
    APART — Curtis: "Fairbox and Venture separate" — and two tables that must
    agree about what a Ventra is are two tables that will eventually disagree.

    The CUBIC screens ARE the Ventra hardware — BUS ER and MV ER are the two
    Ventra devices — but neither word appears in their wording, so the filter
    named for them missed every one. Twelve live records at the time of writing;
    the shared table now matches the screen wording itself as well. */
 if(key==="farebox")return isFarebox(text);
 if(key==="ibs-ventra")return isIbsVentra(text);
 if(key==="leak")return /\b(?:leak|leaks|leaking|seep|seeping)\b/i.test(text);
 /* Matched on the repair rather than on the word "heat", which appears in
    Amerex heat sensors, in Overheating, and in half the estimate notes in the
    fleet. A winter list that pulls in an overheating bus is a list somebody
    checks once and then stops trusting. */
 if(key==="no-cabin-heat")return /\bsurge tank\s*-\s*(?:heating side|both sides)\b/i.test(text)||/\bheater\s*\/\s*defroster\b/i.test(text);
 /* None of these five is a wording question. The legacy `pendingRepair` string
    at the bottom of quickFilterDefects is matched through here, and a free-text
    match would put a bus into "logged" on the strength of a sentence that
    carries no date at all. */
 if(key==="not-duplicated"||key==="down-sheet-recommended"||key==="deferred"||key==="road-call"||key==="logged")return false;
 return /\b(?:add(?:ed|ing)?|needs?|low)\s+(?:(?:\d+(?:\.\d+)?\s*)?(?:qt|qts|quart|quarts)\s+(?:of\s+)?)?(?:engine\s+)?oil\b|\b(?:engine\s+)?oil\s+(?:low|needed|required)\b/i.test(text);
}

function defectText(defect:StructuredDefect){
 return [defect.category,defect.issue,...(defect.symptoms||[]),...(defect.fluids||[]),defect.details,defect.diagnosticNote,defect.actionTaken,defect.shopNotes].filter(Boolean).join(" ");
}

/* Whether a work-state stamp falls inside the road-call window. */
function recentStamp(at:string|undefined,now:string){
 const stamped=Date.parse(String(at||""));
 return !Number.isNaN(stamped)&&stamped>=new Date(now).getTime()-ROAD_CALL_WINDOW_DAYS*24*60*60*1000;
}

/* Whether this defect was written down inside the window the drawer is set to.
   `null` means no window, which is ALL. An undated record is out of every
   narrowed window and in ALL, the same rule the time-window module applies to
   an undated deferral, and for the same reason: a row of unknown age must not
   sit in a list whose entire claim is that everything in it is recent. */
function loggedWithin(defect:StructuredDefect,now:string,maxAgeMinutes:number|null){
 if(maxAgeMinutes===null)return true;
 const elapsed=loggedMinutesElapsed(defect,new Date(now));
 return elapsed!==null&&elapsed<=maxAgeMinutes;
}

/* WHOSE WORK THIS IS. Curtis: "key off initials so we don't have the multiple
   day issues."

   NO INITIALS MEANS NO FILTER, and that pairing is the whole safety of this.
   `defaultInitials` ships EMPTY and `requireInitials` only ever gated FIXED BY,
   so a device nobody has set up has none to match and a defect can carry a
   blank `reportedBy` — a hard match there would hand back an empty list every
   time, which reads as "nothing happened this shift" rather than "this is not
   set up". The caller shows everyone AND says so, the same way the shift window
   and its heading degrade together.

   Compared case-folded: a hand-logged defect is upper-cased on save, but a
   defect read off a photographed sheet carries whatever the paper said
   (`sweep-scan-import.ts`), raw. */
function loggedBy(defect:StructuredDefect,initials:string){
 const want=initials.trim().toUpperCase();
 if(!want)return true;
 return String(defect.reportedBy||"").trim().toUpperCase()===want;
}

/* How a `logged` list is narrowed. An object rather than two more positional
   arguments: these are both optional, both only mean anything for one filter,
   and `quickFilterDefects(bus,key,now,null,"")` says nothing to anybody
   reading it. */
export type QuickFilterNarrow={maxAgeMinutes?:number|null;initials?:string};

/* THE NEWEST FIRST, for `logged` only.

   The other lists are ordered longest-waiting-first, because there the age is
   the complaint. Here the age is the news: a handover list is read from the top
   and the thing that just happened is the thing somebody has not heard yet.
   Undated records sort last — they are only ever present under ALL. */
function loggedFirst(a:StructuredDefect,b:StructuredDefect,now:string){
 const at=new Date(now),left=loggedMinutesElapsed(a,at),right=loggedMinutesElapsed(b,at);
 if(left===null&&right===null)return 0;
 if(left===null)return 1;
 if(right===null)return -1;
 return left-right;
}

export function quickFilterDefects(bus:QuickFilterBus,key:QuickFilterKey,now=new Date().toISOString(),narrow:QuickFilterNarrow={}){
 const normalized=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),matches=normalized.filter(defect=>
  /* Which repair the bus road-called on, so the list names the fault and not
     only the bus. Fixed ones count here: a bus that broke down on Tuesday and
     was repaired on Wednesday still broke down this week, and hiding it would
     put this list at odds with the badge on the card. */
  key==="road-call"?hasWorkState(defect,ROAD_CALL_KEY)&&recentStamp(defect.workStates?.[ROAD_CALL_KEY]?.at,now)
  :key==="not-duplicated"?Boolean(defect.conditionNotDuplicated)
  /* Only repairs still outstanding. A recommendation on a repair that has since
     been fixed is a job nobody needs scheduled, and leaving it in the list is
     how a shared list stops being trusted. */
  :key==="down-sheet-recommended"?isUnresolved(defect)&&isDownSheetRecommended(defect)
  /* Every currently-deferred defect, on or off the Down Sheet. The caller
     narrows this to genuinely held-back buses — it has to, since telling the
     two apart needs the Down Sheet's own entries, which this module never
     sees. */
  :key==="deferred"?isUnresolved(defect)&&defect.state==="deferred"
  /* Every repair still outstanding, narrowed to the ones written down inside
     the window. The window reaches the LINES here, not only the bus: a bus
     picked for something logged this shift that then printed Monday's defect
     underneath it would put the exact rows Curtis is trying not to send into a
     list headed 2ND SHIFT. The other filters ignore the window on purpose —
     they answer "what is true now", where the age of the record is not the
     question being asked. */
  :key==="logged"?isUnresolved(defect)&&loggedWithin(defect,now,narrow.maxAgeMinutes??null)&&loggedBy(defect,narrow.initials||"")
  :isUnresolved(defect)&&quickFilterTextMatch(defectText(defect),key)),legacy=(bus.pendingRepair||"").trim();
 if(key==="logged")matches.sort((a,b)=>loggedFirst(a,b,now));
 if(matches.length||normalized.length||!legacy||!quickFilterTextMatch(legacy,key))return matches;
 return [{id:bus.id+"-quick-filter-legacy",category:"Miscellaneous",issue:"Manual entry",details:legacy,operability:"service",state:"open"} as StructuredDefect];
}

export function quickFilterFlagMatch(bus:QuickFilterBus,key:QuickFilterKey,now=new Date().toISOString()){
 /* The bus's own road-call history decides this list, not its defects. A road
    call is a fact about the bus and outlives the repair it was ticked on, so a
    defect that is later merged away or removed must not quietly take this
    week's breakdown off the board with it. */
 if(key==="road-call")return hasRecentRoadCall(bus.roadCalls,now);
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
  "road-call":"Road call in the last "+ROAD_CALL_WINDOW_DAYS+" days",
  logged:"Open defect logged in this window",
 } as Record<QuickFilterKey,string>)[key];
}

/* HOW RECENTLY ANYTHING LANDED ON THIS BUS — the smallest elapsed, not the
   largest.

   `busDeferredMinutes` and `busRecommendedMinutes` both take the MAXIMUM,
   because there the question is how long the oldest unresolved thing has been
   waiting. This one is the opposite question and the opposite reduction: a bus
   belongs in this shift's list if ANYTHING was written down on it this shift,
   so the newest stamp decides and an old defect sitting underneath cannot push
   the bus out. Taking the max here would have hidden a bus logged ten minutes
   ago because it also carries something from last Tuesday.

   null when nothing on the bus carries a usable `createdAt`. */
export function busLoggedMinutes(defects:StructuredDefect[],now=new Date()){
 const minutes=defects.map(defect=>loggedMinutesElapsed(defect,now)).filter((value):value is number=>value!==null);
 return minutes.length?Math.min(...minutes):null;
}

export function quickFilterMatch(bus:QuickFilterBus,key:QuickFilterKey,now=new Date().toISOString(),narrow:QuickFilterNarrow={}){
 return quickFilterFlagMatch(bus,key,now)||quickFilterDefects(bus,key,now,narrow).length>0;
}

export function quickFilterBusIds<T extends QuickFilterBus>(fleet:T[],key:QuickFilterKey,now=new Date().toISOString(),narrow:QuickFilterNarrow={}){return fleet.filter(bus=>quickFilterMatch(bus,key,now,narrow)).map(bus=>bus.id)}

/* How the pulsing DEFERRED badge asks the Defect Log to open a filter.

   Two routes, because the badge renders on all six pages — the Defect Log
   included. From another page it is an ordinary link carrying the key in the
   query string. From the Defect Log itself a link points at the page you are
   already standing on, which does nothing visible and is exactly why pressing
   the badge read as broken; there it fires the event instead and the open page
   raises the filter in place. */
export const QUICK_FILTER_PARAM="quick";
export const QUICK_FILTER_EVENT="pace-open-quick-filter";
export function quickFilterFromValue(value:unknown):QuickFilterKey|null{
 return QUICK_FILTERS.some(item=>item.key===value)?value as QuickFilterKey:null;
}
export function quickFilterHref(key:QuickFilterKey,path="/defect-log"){return path+"?"+QUICK_FILTER_PARAM+"="+encodeURIComponent(key)}
