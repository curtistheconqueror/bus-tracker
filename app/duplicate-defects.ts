/* One fault on a bus should be one record.

   A repair photographed off the Down Sheet mints its defect id from the entry
   it came in on, and a fresh scan of the same paper sheet mints a fresh entry
   id from the clock. So a bus that stayed on the sheet across three scans ended
   up carrying the same fault three times, each under a different id, each
   looking to the app like a separate problem. Measured on the shop's live board:
   328 open defects, and 21 buses carrying 25 records that say nothing the record
   beside them does not already say.

   It is not only scans. Two of the 21 were typed into the Defect Log by hand on
   different days; the 48-hour duplicate guard on that form only looks back two
   days, and the second entry came later than that.

   The cost is not cosmetic. Defect counts drive what a foreman looks at first,
   the shared lists that go out to the crew, and every "how many are down"
   number on the board.

   Two rules govern everything here, and both exist because these are repair
   records rather than display state:

   1. NOTHING IS LOST. Merging folds every field one copy holds and the survivor
      does not into the survivor. The oldest creation stamp wins, because that is
      when the fault was actually first seen. The most severe operability wins,
      so a merge can never quietly put a bus back in service.

   2. ONLY EXACT REPEATS. Records group by category, symptom and details. Two
      genuinely different A/C faults are two faults and are left alone. This
      never guesses that two differently-worded records are "probably" the same
      thing, because being wrong there destroys a real defect and nobody would
      ever know which one. */

import {defectLabel,isUnresolved,normalizeDefects,defectSummary,type StructuredDefect} from "./repair-catalog.ts";
import {downSheetDefectIdCandidates,type SyncDownEntry} from "./down-sheet/down-sheet-sync.ts";

export type DuplicateBus={id:string;n?:string;defects?:StructuredDefect[];pendingRepair?:string};

export type DuplicateGroupReport={
 busId:string;
 busNumber:string;
 label:string;
 keptId:string;
 droppedIds:string[];
 /* True when the surviving record is one an entry still on the sheet will go on
    writing to. Reported so a test — and a person reading the summary — can see
    the anchor rule actually firing rather than trusting that it did. */
 anchored:boolean;
};

export type DuplicateMergeResult<TBus,TEntry>={
 buses:TBus[];
 entries:TEntry[];
 groups:DuplicateGroupReport[];
 removed:number;
 busesAffected:number;
 relinkedEntries:number;
};

/* Category, symptom and details, with case and run-together spacing removed.

   Deliberately NOT the printed label. Two records can print the same line while
   differing in a field the label leaves out, and a printed line is a
   presentation decision that will change again; identity for a stored record
   has to be about what the record says. */
export function defectFingerprint(defect:{category?:string;issue?:string;details?:string}){
 return [defect.category,defect.issue,defect.details]
  .map(value=>String(value??"").trim().toLowerCase().replace(/\s+/g," "))
  .join("|");
}

/* What an untyped defect normalizes to: the catch-all category and symptom the
   app supplies when somebody logs a fault and writes nothing about it.

   Derived by running a blank record through the same normalizer the board uses,
   rather than written out as two string literals, so that changing the
   placeholder upstream cannot silently turn this guard off. */
const PLACEHOLDER_FINGERPRINT=defectFingerprint(
 normalizeDefects([{id:"placeholder",category:"",issue:"",details:"",operability:"service",state:"open"}])[0]);

/* Whether a record says enough about itself to be called a repeat of another.

   Two records that are nothing but the placeholder — no details, no category
   anybody chose, no symptom anybody chose — are indistinguishable, but that is
   not evidence they are the same fault. They are just as likely to be two
   different problems nobody typed up, and collapsing them would delete a real
   defect with no way for anyone to notice. Being indistinguishable is a reason
   to leave them alone, not a licence to merge. */
function comparable(fingerprint:string){
 return /[a-z0-9]/.test(fingerprint)&&fingerprint!==PLACEHOLDER_FINGERPRINT;
}

const STATE_RANK:Record<string,number>={open:1,deferred:2,"in-progress":3};

function text(value:unknown){return String(value??"").trim()}

function mergedRecord(group:StructuredDefect[],survivor:StructuredDefect,now:string):StructuredDefect{
 const ordered=[survivor,...group.filter(defect=>defect!==survivor)];
 const firstText=(pick:(defect:StructuredDefect)=>unknown)=>{
  for(const defect of ordered){const value=text(pick(defect));if(value)return value}
  return undefined;
 };
 const firstNumber=(pick:(defect:StructuredDefect)=>unknown)=>{
  for(const defect of ordered){const value=pick(defect);if(typeof value==="number"&&Number.isFinite(value))return value}
  return undefined;
 };
 /* Absent means not ticked in this codebase, so a box nobody ticked stays
    absent rather than becoming an explicit false. */
 const anyTrue=(pick:(defect:StructuredDefect)=>unknown)=>group.some(defect=>pick(defect)===true)||undefined;
 const createdAt=group.map(defect=>text(defect.createdAt)).filter(Boolean).sort()[0]||survivor.createdAt;
 const state=group.reduce((best,defect)=>
  (STATE_RANK[defect.state]||0)>(STATE_RANK[best]||0)?defect.state:best,survivor.state);
 /* Every symptom anyone recorded, kept. Symptoms are not part of the
    fingerprint, so two records that match on category, issue and details can
    still differ here, and dropping one would lose a reported symptom. */
 const symptoms=[...new Set(ordered.flatMap(defect=>defect.symptoms||[]).map(text).filter(Boolean))];
 return {
  ...survivor,
  createdAt,
  updatedAt:now,
  /* Severity never softens through a merge. */
  operability:group.some(defect=>defect.operability==="down")?"down":survivor.operability,
  state,
  ...(symptoms.length?{symptoms}:{}),
  diagnosticNote:firstText(defect=>defect.diagnosticNote),
  actionTaken:firstText(defect=>defect.actionTaken),
  shopNotes:firstText(defect=>defect.shopNotes),
  partNumber:firstText(defect=>defect.partNumber),
  partName:firstText(defect=>defect.partName),
  reportedBy:firstText(defect=>defect.reportedBy),
  completedBy:firstText(defect=>defect.completedBy),
  finding:firstText(defect=>defect.finding),
  unit:firstText(defect=>defect.unit),
  quantity:firstNumber(defect=>defect.quantity),
  repairHours:firstNumber(defect=>defect.repairHours),
  diagnosticHours:firstNumber(defect=>defect.diagnosticHours),
  conditionNotDuplicated:anyTrue(defect=>defect.conditionNotDuplicated),
  partsUsed:anyTrue(defect=>defect.partsUsed),
 };
}

/* Which copy survives.

   An entry still on the Down Sheet wins outright, because that entry will write
   its own id back onto the bus the next time anybody saves it. Keeping any other
   copy would delete the one record that regenerates, and the duplicate would be
   back within a shift.

   With nothing anchoring the group, the oldest record wins: it carries the real
   first-seen date and whatever history has accumulated against it. Ties break on
   id so the same board always merges the same way. */
function chooseSurvivor(group:StructuredDefect[],anchored:Set<string>){
 const anchor=group.filter(defect=>anchored.has(defect.id))
  .sort((left,right)=>left.id.localeCompare(right.id))[0];
 if(anchor)return anchor;
 return [...group].sort((left,right)=>
  text(left.createdAt).localeCompare(text(right.createdAt))||left.id.localeCompare(right.id))[0];
}

/* Merge every exact repeat on every bus, and re-point the sheet at what
   survived.

   Entries are rewritten as well as buses. An entry whose defectId named a record
   that has just been folded away would otherwise re-create it, so it is given
   the survivor's id instead. That is what makes this a merge rather than a
   deletion: the sheet and the log go on describing the same repair, through one
   record instead of several. */
export function mergeDuplicateDefects<TBus extends DuplicateBus,TEntry extends SyncDownEntry>(
 buses:TBus[],entries:TEntry[],now=new Date().toISOString()
):DuplicateMergeResult<TBus,TEntry>{
 const anchoredByBus=new Map<string,Set<string>>();
 for(const entry of entries){
  const set=anchoredByBus.get(entry.busId)||new Set<string>();
  for(const id of downSheetDefectIdCandidates(entry))set.add(id);
  anchoredByBus.set(entry.busId,set);
 }

 const groups:DuplicateGroupReport[]=[];
 const redirect=new Map<string,string>();
 /* busId -> (what a repair says -> the record that now holds it). An entry
    still on the sheet that describes a merged repair is pointed here even when
    it never named a defect id, because the id it WOULD mint is a new record
    saying the same thing. */
 const survivorByText=new Map<string,Map<string,string>>();
 let removed=0;

 const nextBuses=buses.map(bus=>{
  const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  const anchored=anchoredByBus.get(bus.id)||new Set<string>();
  const byFingerprint=new Map<string,StructuredDefect[]>();
  for(const defect of current){
   if(!isUnresolved(defect))continue;
   const fingerprint=defectFingerprint(defect);
   if(!comparable(fingerprint))continue;
   byFingerprint.set(fingerprint,[...(byFingerprint.get(fingerprint)||[]),defect]);
  }
  const dropped=new Set<string>();
  const replacements=new Map<string,StructuredDefect>();
  for(const [fingerprint,group] of byFingerprint){
   if(group.length<2)continue;
   const survivor=chooseSurvivor(group,anchored);
   const byText=survivorByText.get(bus.id)||new Map<string,string>();
   byText.set(fingerprint,survivor.id);
   survivorByText.set(bus.id,byText);
   const merged=mergedRecord(group,survivor,now);
   replacements.set(survivor.id,merged);
   const droppedIds:string[]=[];
   for(const defect of group){
    if(defect===survivor)continue;
    dropped.add(defect.id);
    droppedIds.push(defect.id);
    redirect.set(defect.id,survivor.id);
   }
   removed+=droppedIds.length;
   groups.push({busId:bus.id,busNumber:text(bus.n)||bus.id,label:defectLabel(merged),
    keptId:survivor.id,droppedIds,anchored:anchored.has(survivor.id)});
  }
  if(!dropped.size)return bus;
  /* Survivors keep their position, so a log somebody is looking at does not
     reshuffle itself around them. */
  const defects=current.filter(defect=>!dropped.has(defect.id))
   .map(defect=>replacements.get(defect.id)||defect);
  return {...bus,defects,pendingRepair:defectSummary(defects)};
 });

 let relinkedEntries=0;
 const nextEntries=entries.map(entry=>{
  /* An entry that named one of the folded records now names the survivor. */
  const named=redirect.get(text(entry.defectId));
  if(named){relinkedEntries++;return {...entry,defectId:named}}
  /* And an entry that named nothing, but describes a repair that was just
     merged, is pointed at the survivor too.

     Without this the cleanup undoes itself. An entry mints its defect id from
     its own entry id, so one sitting on the sheet saying exactly what the
     survivor says will write a SECOND record the next time anybody saves it —
     a different id, the same sentence — and the duplicate is back within a
     shift. Naming the survivor makes that save an update.

     Only entries whose single defect comes from the entry's own text: once an
     entry carries repair cards, each card owns a stable id of its own and there
     is nothing here to re-point. */
  const carries=(entry.repairItems||[]).some(item=>
   text(item.category)||text(item.repair)||text(item.details));
  if(carries||text(entry.defectId))return entry;
  const target=survivorByText.get(entry.busId)?.get(
   defectFingerprint({category:entry.category,issue:entry.repair,details:entry.customReason}));
  if(!target)return entry;
  relinkedEntries++;
  return {...entry,defectId:target};
 });

 return {buses:nextBuses,entries:nextEntries,groups,removed,
  busesAffected:new Set(groups.map(group=>group.busId)).size,relinkedEntries};
}

/* What a scan should write to instead of minting a new record.

   This is the half that stops the problem happening again. When a sheet photo
   brings in a repair for a bus, and the bus already carries an unresolved record
   saying exactly that, the scan belongs on the record that is already there.
   Returning its id lets the import adopt it, and the second scan of the same
   paper updates one record rather than adding a second.

   Every one of the 25 duplicates on the live board would have been prevented by
   this. */
export function matchingUnresolvedDefectId(
 bus:DuplicateBus|undefined,record:{category?:string;repair?:string;reason?:string}
){
 if(!bus)return undefined;
 const wanted=defectFingerprint({category:record.category,issue:record.repair,details:record.reason});
 if(!comparable(wanted))return undefined;
 return normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)
  .find(defect=>isUnresolved(defect)&&defectFingerprint(defect)===wanted)?.id;
}
