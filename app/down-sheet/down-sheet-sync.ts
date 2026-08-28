import {defectSummary,normalizeDefects,normalizeFinding,normalizeRepairHours,type StructuredDefect} from "../repair-catalog.ts";
import {stampOperationalChange} from "../operational-time.ts";
import {statusForLocation} from "../smart-status.ts";

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
function defectTargets(entry:SyncDownEntry,current:StructuredDefect[]){
 const items=(entry.repairItems||[]).filter(item=>clean(item.category)||clean(item.repair)||clean(item.details));
 const legacyIds=[clean(entry.defectId),"downsheet-"+entryKey(entry),"downsheet-"+entry.busId].filter(Boolean);
 const legacy=current.find(defect=>legacyIds.includes(defect.id));
 if(!items.length)return [{id:legacy?.id||legacyIds[0],category:entry.category,repair:entry.repair,details:entry.customReason,done:entry.workflow==="Completed",actionTaken:"",finding:undefined,repairHours:undefined,diagnosticHours:undefined}];
 const taken=new Set<string>();
 return items.map((item,index)=>{
  const own="downsheet-"+entryKey(entry)+"-"+item.id;
  const adopts=index===0&&legacy&&!current.some(defect=>defect.id===own)&&!taken.has(legacy.id);
  const id=adopts?legacy.id:own;
  taken.add(id);
  return {id,category:item.category,repair:item.repair,details:item.details,done:item.done===true,
   actionTaken:item.actionTaken,finding:item.finding,repairHours:item.repairHours,diagnosticHours:item.diagnosticHours};
 });
}

export function applyDownEntryToFleet<T extends SyncFleetBus>(fleet:T[],entry:SyncDownEntry,now=new Date().toISOString()):T[]{
 return fleet.map(bus=>{
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
    repairHours:normalizeRepairHours(target.repairHours)??linked?.repairHours,
    diagnosticHours:normalizeRepairHours(target.diagnosticHours)??linked?.diagnosticHours,
    source:linked?.source||"down-sheet"};
   const at=defects.findIndex(defect=>defect.id===target.id);
   if(at>=0)defects[at]=nextDefect;else defects.push(nextDefect);
  }
  const repairAware={...bus,defects,pendingRepair:defectSummary(defects)};
  const status=statusForLocation(bus.l,entry.operationalStatus,repairAware);
  const next={...repairAware,s:status,
   down:!targets.every(target=>target.done||entryCompleted)&&entry.operationalStatus!=="decommissioned",
   mechanic:entry.assignmentType==="Mechanic"&&entry.assignedTo.trim()?entry.assignedTo.trim():bus.mechanic} as T;
  return stampOperationalChange(bus,next,now) as T;
 });
}
