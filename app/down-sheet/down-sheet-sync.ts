import {defectCountField,defectSummary,normalizeDefects,normalizeFinding,normalizeRepairCount,normalizeRepairHours,type StructuredDefect} from "../repair-catalog.ts";
import {stampOperationalChange} from "../operational-time.ts";
import {hasRequiredInteriorCleaning,hasUnresolvedDefects} from "../smart-status.ts";
import {moveBusToArea,RELOCATION_AREAS} from "../facility-areas.ts";
import {adoptableDefect} from "../defect-identity.ts";

export type SyncFleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";

export type SyncFleetBus={
 id:string;
 l:string;
 s:SyncFleetStatus;
 mechanic?:string;
 down?:boolean;
 pendingRepair?:string;
 defects?:StructuredDefect[];
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
};

export type SyncRepairItem={
 id:string;
 category:string;
 repair:string;
 details:string;
 done?:boolean;
 actionTaken?:string;
 finding?:string;
 quantity?:number;
 repairHours?:number;
 diagnosticHours?:number;
};

export type SyncDownEntry={
 id?:string;
 defectId?:string;
 busId:string;
 category:string;
 repair:string;
 customReason:string;
 repairItems?:SyncRepairItem[];
 assignmentType:"Mechanic"|"Vendor";
 assignedTo:string;
 workflow:string;
 operationalStatus:SyncFleetStatus;
 completedBy?:string;
 /* Where the bus should be parked, by area name, when the sheet is where
    somebody is deciding that.

    A bus's status is derived from where it sits — the CNG lots read out of
    service, a shop bay reads work in progress — so setting a status on the
    sheet without being able to move the bus meant the choice was silently
    overridden and the Defect Log went on showing the old one. Rather than
    weaken that rule, the sheet can now move the bus, which is what a foreman
    putting a bus back in service means anyway: it is leaving the lot.

    Absent means leave it where it is, which is what every entry written before
    this existed says. */
 location?:string;
};

function clean(value:unknown){return String(value??"").trim()}

/* Only a mechanic stands in for the technician. A vendor name in FIXED BY would
   read as somebody in this shop having done the work. */
function assignedMechanic(entry:SyncDownEntry){
 return entry.assignmentType==="Mechanic"?clean(entry.assignedTo).toUpperCase():"";
}

export function downSheetRepairSummary(entry:SyncDownEntry){
 return [entry.category,entry.repair,entry.customReason].map(value=>value.trim()).filter(Boolean).join(" - ");
}

function entryKey(entry:SyncDownEntry){return clean(entry.id)||entry.busId}

/* One repair on the sheet is one defect on the bus.

   It used to be one defect per ENTRY: the first card's category and repair
   became the record and the rest were joined into its details. A bus scheduled
   for brakes, A/C and a door arrived in Fixed Repairs as a single record filed
   under brakes, with the other two buried in a string that could not be
   filtered, counted, or given its own parts and hours.

   Identity is the delicate part. An entry stored before repair cards existed
   gets a freshly generated card id on every read, so keying its defect on that
   id would mint a new defect every time the entry was saved. The first card
   therefore adopts the entry's original defect id where one is already on the
   bus, which keeps every live record's history and stays stable across those
   regenerated ids. Every other card keys on its own id, which is persisted the
   moment a second card is added. */
function carriedItems(entry:SyncDownEntry){
 return (entry.repairItems||[]).filter(item=>clean(item.category)||clean(item.repair)||clean(item.details));
}

function legacyDefectIds(entry:SyncDownEntry){
 return [clean(entry.defectId),"downsheet-"+entryKey(entry),"downsheet-"+entry.busId].filter(Boolean);
}

/* Every defect id this entry can write to or adopt, worked out without needing
   the bus.

   Exported because the duplicate cleanup has to know which of several identical
   records an entry still on the sheet would go on re-creating. Choosing any
   other record as the survivor deletes the one thing that regenerates, so the
   duplicate returns on the next save — which looks exactly like the cleanup
   never having worked.

   It lives here, beside the function that does the writing, rather than being
   restated next to the cleanup, because two copies of this rule would drift and
   the symptom would be silent: duplicates quietly coming back days later. */
export function downSheetDefectIdCandidates(entry:SyncDownEntry){
 return [...legacyDefectIds(entry),...carriedItems(entry).map(item=>"downsheet-"+entryKey(entry)+"-"+item.id)];
}

/* A repair the bus is already carrying is that repair, whoever wrote it down.

   Ids alone were not enough. A card mints its defect id from the entry and the
   card, so a fault already open in the Defect Log — a check engine light, say —
   arrived on the sheet under an id nothing on the bus matched, and the bus ended
   up carrying the same fault twice: once from the log, once from the sheet, each
   looking to the app like a separate problem. Defect counts drive what a foreman
   looks at first and every "how many are down" number on the board, so this is
   not cosmetic.

   The scan already asked this question before writing. Adding it here covers the
   other two ways a repair reaches the sheet — typed in by hand, and pulled on by
   the app when a bus is marked down — so all three behave the same way.

   Only an EXACT repeat is adopted, and only a record still unresolved: a
   genuinely different fault on the same bus is still its own record, and a
   repair completed last month is not reopened by a new one that reads like it.
   A card whose own record already exists keeps it, so editing a card updates
   what it wrote rather than wandering onto a neighbour. */
function defectTargets(entry:SyncDownEntry,current:StructuredDefect[]){
 const items=carriedItems(entry);
 const legacyIds=legacyDefectIds(entry);
 const legacy=current.find(defect=>legacyIds.includes(defect.id));
 const taken=new Set<string>();
 const adopt=(category:string,repair:string,details:string)=>
  adoptableDefect(current,{category,issue:repair,details},taken);
 /* An adopted record keeps its OWN details. It already says what the card says —
    that is what made it a match — and a card built by the app spells a record
    out, folding its lamp, alarm number and reported symptoms in ahead of the
    note. Writing that sentence back into the details field would flatten those
    structured fields into free text and then repeat them: a record whose symptom
    is "Misfire" would start reading "Misfire — Misfire — ...". */
 if(!items.length){
  const adopted=legacy?undefined:adopt(entry.category,entry.repair,entry.customReason);
  const id=legacy?.id||adopted?.id||legacyIds[0];
  return [{id,category:entry.category,repair:entry.repair,details:adopted?adopted.details:entry.customReason,done:entry.workflow==="Completed",actionTaken:"",finding:undefined,quantity:undefined,repairHours:undefined,diagnosticHours:undefined}];
 }
 return items.map((item,index)=>{
  const own="downsheet-"+entryKey(entry)+"-"+item.id;
  const mine=current.some(defect=>defect.id===own);
  const adopts=index===0&&legacy&&!mine&&!taken.has(legacy.id);
  const adopted=adopts||mine?undefined:adopt(item.category,item.repair,item.details);
  const id=adopts?legacy.id:mine?own:adopted?.id||own;
  taken.add(id);
  return {id,category:item.category,repair:item.repair,details:adopted?adopted.details:item.details,done:item.done===true,
   actionTaken:item.actionTaken,finding:item.finding,quantity:item.quantity,repairHours:item.repairHours,diagnosticHours:item.diagnosticHours};
 });
}

/* Which records on the bus this entry is actually writing to.

   Exported so the Defect Log can name the defect that put a bus on the sheet
   using the SHEET'S OWN answer rather than a second rule beside it. The obvious
   second rule — read the entry's stated defectId — is wrong for two of the four
   doors: an entry typed in by hand states no defectId at all, and one carrying
   repair cards writes a record per card. A badge computed that way says "no
   defect on this bus put it on the sheet" while the sheet is writing to one of
   them, which is worse than no badge. Asking defectTargets cannot disagree with
   what the save does, because it IS what the save does. */
export function downSheetDefectIds(entry:SyncDownEntry,defects:StructuredDefect[]){
 return defectTargets(entry,defects).map(target=>target.id).filter(Boolean);
}

export function applyDownEntryToFleet<T extends SyncFleetBus>(fleet:T[],entry:SyncDownEntry,now=new Date().toISOString()):T[]{
 /* Moved first, so everything below sees the space the bus is going to be in.
    The status is derived from the location, so doing this the other way round
    would compute the status for where the bus used to be and then move it.

    moveBusToArea picks the first free slot in the area and swaps if it has to,
    the same as dragging a bus on the map. An area with no room leaves the bus
    where it is rather than failing the whole save — the repair details are
    worth more than the move. */
 const relocated=entry.location?moveBusToArea(fleet,entry.busId,entry.location,RELOCATION_AREAS,now).fleet:fleet;
 return relocated.map(bus=>{
  if(bus.id!==entry.busId)return bus;
  const entryCompleted=entry.workflow==="Completed";
  /* The entry's workflow still describes the bus. A repair carries its own,
     because repairs on one bus do not finish together. */
  const openState:StructuredDefect["state"]=entry.workflow==="Deferred"?"deferred":entry.workflow==="In Progress"?"in-progress":"open";
  const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  const targets=defectTargets(entry,current);
  /* A card taken off the sheet does not delete its defect. Coming off a sheet
     is not being repaired, and the bus still has the fault. */
  const defects=[...current];
  for(const target of targets){
   const linked=defects.find(defect=>defect.id===target.id);
   const completed=target.done||entryCompleted;
   const state:StructuredDefect["state"]=completed?"completed":openState;
   const nextDefect:StructuredDefect={...linked,
    id:target.id,
    category:target.category||"Miscellaneous",
    issue:target.repair||"Repair required",
    details:clean(target.details),
    operability:entry.operationalStatus==="out"?"down":"service",
    state,
    createdAt:linked?.createdAt||now,
    updatedAt:now,
    completedAt:completed?(linked?.completedAt||now):"",
    /* Everything this repair learned goes onto the record Fixed Repairs reads.
       Falling back to the assigned mechanic is the important half: the sheet
       already knew who had the bus and used to drop it, so every completed
       entry arrived unattributed. */
    completedBy:completed?(clean(entry.completedBy)||linked?.completedBy||assignedMechanic(entry)):linked?.completedBy,
    actionTaken:clean(target.actionTaken)||linked?.actionTaken,
    finding:normalizeFinding(target.finding)||linked?.finding,
    /* The unit travels with the count. Written from the catalog rather than
       carried on the card, so the record reads "2 replaced" and never falls
       back to the quarts the oil entry taught the label. */
    quantity:normalizeRepairCount(target.quantity,target.category,target.repair)??linked?.quantity,
    unit:defectCountField(target.category,target.repair)?.unit||linked?.unit,
    repairHours:normalizeRepairHours(target.repairHours)??linked?.repairHours,
    diagnosticHours:normalizeRepairHours(target.diagnosticHours)??linked?.diagnosticHours,
    source:linked?.source||"down-sheet"};
   const at=defects.findIndex(defect=>defect.id===target.id);
   if(at>=0)defects[at]=nextDefect;else defects.push(nextDefect);
  }
  const repairAware={...bus,defects,pendingRepair:defectSummary(defects)};
  /* The status a person chose on the sheet stands, whether or not the bus has
     been driven anywhere yet.

     It used to be recomputed from the parking space on every save, which meant
     a bus in a CNG lot read "out of service" no matter what was picked — mark a
     bus back in service, get sidetracked before anyone physically moves it, and
     the board still said out of service with nothing to show the work was done.
     The paperwork changes before the bus does, and the sheet is the paperwork.

     Location still governs MOVEMENT: dragging a bus on the map, or using MOVE
     BUS TO above, re-derives the status from where it lands. So a bus parked
     into a CNG lot still goes out of service on its own; it is only being told
     so from the sheet that no longer overrides a person.

     Two rules survive, because they describe the CONDITION of the bus rather
     than a fact about where it is parked, and both were bundled into the
     location check only by accident of where they were written:

       - a bus that needs interior cleaning is in the shop;
       - a bus with unresolved defects is not plainly "in service", it is in
         service WITH DEFECTS. The status exists precisely to say that, and a
         board reading "In Service" for a bus carrying an open fault would be
         the same class of lie this change is meant to remove. */
  const chosen=entry.operationalStatus;
  const status=chosen==="decommissioned"?chosen
   :hasRequiredInteriorCleaning(repairAware)?"shop"
   :chosen==="service"&&hasUnresolvedDefects(repairAware)?"defect"
   :chosen;
  const next={...repairAware,s:status,
   down:!targets.every(target=>target.done||entryCompleted)&&entry.operationalStatus!=="decommissioned",
   mechanic:entry.assignmentType==="Mechanic"&&entry.assignedTo.trim()?entry.assignedTo.trim():bus.mechanic} as T;
  return stampOperationalChange(bus,next,now) as T;
 });
}
