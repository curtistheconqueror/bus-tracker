import {isUnresolved,migrateRepairIdentity,normalizeDefects,REPAIR_OPTIONS,type StructuredDefect} from "../repair-catalog.ts";

/* The farebox / Ventra sweep sheets, read from a photo.

   Two printed check-off grids the shop fills by hand, one per device. The
   Ventra sheet has two mark columns per bus (DT and MV); the farebox sheet has
   three (power, bills, coin) and a column of checkers' initials. The scan route
   returns one row per bus that carries any mark or note; this module turns
   those rows into things a mechanic can review and file.

   What a mark means is decided HERE, in one place, and not left to the model:
   - ok      a tick, a check, OK, or a checker's dash — the device works
   - fault   ER, Er, Bus ER, X, or a written fault — a defect to file
   - blank   nothing in the cell — nobody looked. NEVER read as working.
   - unclear the model could not tell — surfaced for a human, never filed

   Nothing here files anything. It produces findings; the person approves. */

export type SweepMark="ok"|"fault"|"blank"|"unclear";
export type SweepSheet="ventra"|"farebox"|"unknown";
export type SweepColumn="dt"|"mv"|"power"|"bills"|"coin";

export type ScannedSweepRow={
 pageNumber:number;
 sheet:SweepSheet;
 busNumber:string;
 dt:SweepMark;
 mv:SweepMark;
 power:SweepMark;
 bills:SweepMark;
 coin:SweepMark;
 initial:string;
 note:string;
 confidence:number;
 reviewNote:string;
};

export type SweepFleetBus={id:string;n:string;defects?:unknown;pendingRepair?:string};

export type SweepFinding={
 key:string;
 busId:string;
 busNumber:string;
 pageNumber:number;
 /* Which cell produced this — a mark column, or the written note. */
 source:SweepColumn|"note";
 category:"Tech Services";
 issue:string;
 details:string;
 initial:string;
 confidence:number;
 reviewNote:string;
 fleetMatch:"matched"|"unknown"|"duplicate";
 /* The bus already carries an open record with this same wording. Offered
    unticked, so the sweep confirms what is known without doubling it. */
 alreadyOpen:boolean;
 selected:boolean;
};

export type SweepOkBus={busId:string;busNumber:string;openIssues:string[]};

export const SWEEP_CATEGORY="Tech Services" as const;

/* The sheet's five mark columns, and the catalog option a fault in each one is.
   The DT and MV columns are the two Ventra devices and map to the two CUBIC
   screen errors the shop already logs. The reviewer can change any of these on
   the row before filing. */
export const SWEEP_COLUMN_ISSUE:Record<SweepColumn,string>={
 dt:"CUBIC Screen - BUS ER",
 mv:"CUBIC Screen - MV ER",
 power:"Farebox - No power",
 bills:"Farebox - Bill transport INOP",
 coin:"Farebox - Coin mech INOP",
};

export const SWEEP_COLUMN_LABEL:Record<SweepColumn,string>={dt:"DT",mv:"MV",power:"POWER",bills:"BILLS",coin:"COIN"};

const MARKS=new Set<SweepMark>(["ok","fault","blank","unclear"]);
const SHEETS=new Set<SweepSheet>(["ventra","farebox","unknown"]);

function clean(value:unknown){return typeof value==="string"?value.trim():""}
function busDigits(value:unknown){return clean(value).replace(/\D/g,"").slice(0,5)}
function mark(value:unknown):SweepMark{const text=clean(value).toLowerCase();return MARKS.has(text as SweepMark)?text as SweepMark:"blank"}
function confidence(value:unknown){const n=typeof value==="number"?value:Number(value);return Number.isFinite(n)?Math.min(1,Math.max(0,n)):0}

/* Anything the route returns is untrusted until it passes through here. A mark
   that is not one of the four words reads as blank, never as ok. */
export function normalizeSweepRow(raw:unknown,pageNumber=1):ScannedSweepRow{
 const row=(raw&&typeof raw==="object"?raw:{}) as Record<string,unknown>;
 const sheet=clean(row.sheet).toLowerCase();
 return {
  pageNumber:typeof row.pageNumber==="number"&&row.pageNumber>0?row.pageNumber:pageNumber,
  sheet:SHEETS.has(sheet as SweepSheet)?sheet as SweepSheet:"unknown",
  busNumber:busDigits(row.busNumber),
  dt:mark(row.dt),mv:mark(row.mv),power:mark(row.power),bills:mark(row.bills),coin:mark(row.coin),
  initial:clean(row.initial).slice(0,6),
  note:clean(row.note).slice(0,240),
  confidence:confidence(row.confidence),
  reviewNote:clean(row.reviewNote).slice(0,240),
 };
}

/* Written notes on the farebox sheet name faults the mark columns cannot. Each
   pattern is a wording the shop actually wrote on 8-29-26. Order matters in one
   place: "can't unlock" must be tested before "unlock", because the second
   pattern would otherwise swallow the first and file the opposite fault. */
const NOTE_ISSUES:Array<{test:RegExp;issue:string;covers?:SweepColumn}>=[
 {test:/coin\s*(?:is\s*)?off\s*-?\s*line|coin\s*offline/i,issue:"Farebox - Coin off line",covers:"coin"},
 {test:/coin\s*bin/i,issue:"Farebox - Coin bin missing",covers:"coin"},
 {test:/can\s*'?\s*t\s*unlock|cannot\s*unlock|coin\s*bypass/i,issue:"Farebox - Can't unlock top / coin bypass reset"},
 {test:/won\s*'?\s*t\s*lock|wont\s*lock|says\s*unlock|unlocked|\bunlock\b/i,issue:"Farebox - Unlocked / won't lock"},
 {test:/blank\s*screen|black\s*screen|screen\s*(?:is\s*)?(?:blank|black|dark)/i,issue:"Farebox - Blank / black screen"},
 {test:/no\s*power|dead|won\s*'?\s*t\s*power/i,issue:"Farebox - No power",covers:"power"},
 {test:/bill|dollar/i,issue:"Farebox - Bill transport INOP",covers:"bills"},
 {test:/loose|mount/i,issue:"Farebox - Loose from floor mounts"},
];

export function noteIssues(note:string):Array<{issue:string;covers?:SweepColumn}>{
 const found:Array<{issue:string;covers?:SweepColumn}>=[];
 for(const entry of NOTE_ISSUES){
  if(!entry.test.test(note))continue;
  if(found.some(item=>item.issue===entry.issue))continue;
  /* "Can't unlock" and "won't lock" are opposite faults; once the first has
     matched, the looser second pattern must not add the other. */
  if(entry.issue==="Farebox - Unlocked / won't lock"&&found.some(item=>item.issue==="Farebox - Can't unlock top / coin bypass reset"))continue;
  found.push({issue:entry.issue,covers:entry.covers});
 }
 return found;
}

function openIssuesOn(bus:SweepFleetBus){
 return normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isUnresolved).map(defect=>migrateRepairIdentity(defect.category,defect.issue)).filter(identity=>identity.category===SWEEP_CATEGORY).map(identity=>identity.issue);
}

function fleetIndex(fleet:SweepFleetBus[]){
 const byNumber=new Map<string,SweepFleetBus[]>();
 for(const bus of fleet){const number=busDigits(bus.n);if(!number)continue;byNumber.set(number,[...(byNumber.get(number)||[]),bus])}
 return byNumber;
}

/* One finding per fault, per bus. A written note beats the mark in the column
   it explains: "coin off line" produces Coin off line, not Coin off line AND a
   generic Coin mech INOP for the same cell. Faults are deduplicated by wording
   within a bus, so two pages that both show 17531 do not file it twice. */
export function sweepFindings(rows:ScannedSweepRow[],fleet:SweepFleetBus[]):SweepFinding[]{
 const byNumber=fleetIndex(fleet),findings:SweepFinding[]=[],seen=new Set<string>();
 rows.forEach((row,index)=>{
  if(!row.busNumber)return;
  const matches=byNumber.get(row.busNumber)||[],fleetMatch=matches.length===1?"matched":matches.length>1?"duplicate":"unknown",bus=fleetMatch==="matched"?matches[0]:null,busId=bus?bus.id:"";
  const open=bus?new Set(openIssuesOn(bus)):new Set<string>();
  const fromNote=noteIssues(row.note),covered=new Set(fromNote.map(item=>item.covers).filter(Boolean));
  const push=(source:SweepFinding["source"],issue:string)=>{
   const dedupe=(busId||row.busNumber)+"|"+issue;
   if(seen.has(dedupe))return;seen.add(dedupe);
   const alreadyOpen=open.has(issue);
   findings.push({key:`sweep-${row.pageNumber}-${row.busNumber}-${source}-${index}`,busId,busNumber:row.busNumber,pageNumber:row.pageNumber,source,category:SWEEP_CATEGORY,issue,details:row.note,initial:row.initial,confidence:row.confidence,reviewNote:row.reviewNote,fleetMatch,alreadyOpen,selected:fleetMatch==="matched"&&!alreadyOpen});
  };
  (["dt","mv","power","bills","coin"] as SweepColumn[]).forEach(column=>{if(row[column]==="fault"&&!covered.has(column))push(column,SWEEP_COLUMN_ISSUE[column])});
  fromNote.forEach(item=>push("note",item.issue));
 });
 return findings;
}

/* Buses the sweep ticked OK on a device that the board still holds an open
   record for. Not filed, not closed — listed, so the person who knows whether
   the fault was fixed or comes and goes can decide. Closing history from a tick
   mark is not this app's call to make. */
export function sweepOkAgainstBoard(rows:ScannedSweepRow[],fleet:SweepFleetBus[]):SweepOkBus[]{
 const byNumber=fleetIndex(fleet),out=new Map<string,SweepOkBus>();
 for(const row of rows){
  const matches=byNumber.get(row.busNumber)||[];if(matches.length!==1)continue;
  const bus=matches[0],ventraOk=row.dt==="ok"||row.mv==="ok",fareboxOk=row.power==="ok"||row.bills==="ok"||row.coin==="ok";
  const anyFault=(["dt","mv","power","bills","coin"] as SweepColumn[]).some(column=>row[column]==="fault")||noteIssues(row.note).length>0;
  if(anyFault)continue;
  const open=openIssuesOn(bus).filter(issue=>(ventraOk&&/^(CUBIC Screen|Ventra|IBS Screen)/.test(issue))||(fareboxOk&&/^Farebox/.test(issue)));
  if(!open.length)continue;
  out.set(bus.id,{busId:bus.id,busNumber:row.busNumber,openIssues:[...new Set([...(out.get(bus.id)?.openIssues||[]),...open])]});
 }
 return [...out.values()];
}

/* The record a finding becomes. Who checked and which page it came from ride in
   the details, so a year from now the record still says where it came from. */
export function sweepDefect(finding:SweepFinding,now=new Date().toISOString()):StructuredDefect{
 const provenance=["Sweep sheet p"+finding.pageNumber+(finding.initial?" · checked by "+finding.initial:"")].join("");
 const details=[finding.details.trim(),provenance].filter(Boolean).join(" — ");
 return {id:"sweep-"+finding.busNumber+"-"+finding.source+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),category:finding.category,issue:finding.issue,details,operability:"service",state:"open",createdAt:now,updatedAt:now,source:"defect-log",reportedBy:finding.initial||undefined} as StructuredDefect;
}

/* Every Tech Services option the reviewer can re-point a finding at. */
export const SWEEP_ISSUE_CHOICES:readonly string[]=REPAIR_OPTIONS[SWEEP_CATEGORY];
