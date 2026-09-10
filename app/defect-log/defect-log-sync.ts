import {defectSupportingDetails,defectSummary,hasWorkState,isUnresolved,normalizeDefects,ROAD_CALL_KEY,type DefectState,type StructuredDefect} from "../repair-catalog.ts";
import {applyRoadCall,clearRoadCall,type RoadCallEvent} from "../road-calls.ts";
import {normalizeRepairTimeEstimate} from "../down-sheet/repair-time-estimates.ts";
import {downSheetDefectIds} from "../down-sheet/down-sheet-sync.ts";
import {roadServiceStatus,statusForLocation,type FleetStatus} from "../smart-status.ts";
import {stampOperationalChange} from "../operational-time.ts";

export type DefectLogFleetBus={
 id:string;n:string;s:FleetStatus;l:string;mechanic?:string;shift?:string;roadcall?:boolean;down?:boolean;
 parkedAt?:string;lastLocationChangeAt?:string;lastStatusChangeAt?:string;pendingRepair?:string;defects?:StructuredDefect[];bay12Watch?:boolean;
 /* Dated breakdowns out on the road, appended and never rewritten. The card
    shows the last seven days of them; the rest stay for the pattern. */
 roadCalls?:RoadCallEvent[];
};

export type DefectLogDownEntry={
 id:string;defectId?:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 /* Carried through because a modern entry writes one record per card, so the
    cards are what say which defects the sheet has. Optional: an entry stored
    before cards existed has none. */
 repairItems?:{id:string;category:string;repair:string;details:string;done?:boolean}[];
 assignmentType:"Mechanic"|"Vendor";assignedTo:string;section:"Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";
 shift:"1st"|"2nd"|"3rd";workflow:"Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
 operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";timeEstimate:ReturnType<typeof normalizeRepairTimeEstimate>;
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:{at:string;initials:string;action:string}[];
};

export type DefectLogRecord={bus:DefectLogFleetBus;defect:StructuredDefect;createdAt:string;updatedAt:string;onDownSheet:boolean;
 /* The entry that has this exact defect on the sheet, when one does. Carried on
    the record so a card can say WHICH defect put the bus on the sheet, and what
    the sheet says about it, without re-deriving the link at render time. */
 downSheetEntry?:DefectLogDownEntry};
export type DefectLogBusGroup={bus:DefectLogFleetBus;records:DefectLogRecord[];updatedAt:string};

export function isPendingDownSheetRecord(record:DefectLogRecord,activeDownBusIds:ReadonlySet<string>){
 if(!isUnresolved(record.defect)||record.onDownSheet||activeDownBusIds.has(record.bus.id))return false;
 const quarantineText=[
  record.defect.category,record.defect.issue,record.defect.details,
  record.defect.diagnosticNote,record.defect.actionTaken,
 ].filter(Boolean).join(" ");
 return record.bus.s==="out"||/\bquarantin(?:e|ed)\b/i.test(quarantineText);
}

export function isDefectLogCleanupCandidate(record:DefectLogRecord,activeDownBusIds:ReadonlySet<string>){
 if(record.defect.defectLogHiddenAt)return false;
 if(record.defect.source==="defect-log"&&isUnresolved(record.defect))return false;
 if(!isUnresolved(record.defect))return true;
 return record.bus.s==="out"||activeDownBusIds.has(record.bus.id);
}

/* Which record on which bus. It used to take bare defect ids and walk the WHOLE
   fleet hiding every match, which is only safe while no two buses can hold the
   same id - and changing a bus number used to make exactly that pair. Curtis
   moved a defect to the right bus, tidied the leftover off the wrong one, and
   the tidy-up reached across and hid the good copy too: two defects on Bus
   17532 the log would not draw and the duplicate check would not let him log
   again. Saying the bus out loud is what stops a removal travelling. */
export type DefectLogHideTarget={busId:string;defectId:string};
export function hideDefectLogRecords(fleet:DefectLogFleetBus[],targets:Iterable<DefectLogHideTarget>,now=new Date().toISOString()){
 const byBus=new Map<string,Set<string>>();
 for(const target of targets)(byBus.get(target.busId)||byBus.set(target.busId,new Set()).get(target.busId)!).add(target.defectId);
 if(!byBus.size)return fleet;
 return fleet.map(bus=>{
  const hiddenIds=byBus.get(bus.id);
  if(!hiddenIds)return bus;
  const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
  if(!defects.some(defect=>hiddenIds.has(defect.id)))return bus;
  return {...bus,defects:defects.map(defect=>hiddenIds.has(defect.id)?{...defect,defectLogHiddenAt:now}:defect)};
 });
}

/* The bus a record is leaving, if it is leaving one.

   A defect id belongs to exactly ONE bus. Changing the bus number in the editor
   used to COPY rather than move: the save looked for the id on the bus it was
   handed, did not find it, and appended - leaving the original in place on the
   old bus under the same id. Two buses holding one id is corruption everywhere
   it touches, because the Down Sheet link map, the log's hide flag and the
   cloud's own row key are all keyed by defect id alone. */
function busHoldingDefect(fleet:DefectLogFleetBus[],defectId:string,exceptBusId:string){
 return fleet.find(bus=>bus.id!==exceptBusId&&normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).some(defect=>defect.id===defectId));
}
/* Takes the record off the bus it came from and leaves that bus otherwise
   alone. pendingRepair is rebuilt because it is a summary of the defects that
   are left; `s` is deliberately NOT recomputed, because a bus's status is a
   call somebody made about the bus and a repair moving off it is not new
   information about whether it can run. */
function takeDefectOffBus(fleet:DefectLogFleetBus[],busId:string,defectId:string,downEntries:DefectLogDownEntry[]){
 return fleet.map(bus=>{
  if(bus.id!==busId)return bus;
  const kept=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.id!==defectId);
  /* down is re-read off the sheet, never decided here. If the repair that left
     was this bus's only active sheet entry, that entry has gone with it and the
     bus is no longer on the sheet - the DS badge has to follow, or the old bus
     keeps a flag for work now filed under another one. `s` is a different
     matter and is deliberately left alone: a bus's status is a call somebody
     made about the bus, and a repair moving off it is not new information
     about whether it can run. */
  return {...bus,defects:kept,pendingRepair:defectSummary(kept),down:downEntries.some(entry=>entry.busId===bus.id&&entry.workflow!=="Completed")};
 });
}

function shiftFromFleet(value?:string):"1st"|"2nd"|"3rd"{return value==="Evening"?"2nd":value==="Night"?"3rd":"1st"}
function workflowForState(state:DefectState):DefectLogDownEntry["workflow"]{return state==="completed"?"Completed":state==="deferred"?"Deferred":state==="in-progress"?"In Progress":"Scheduled"}

function repairStatus(bus:DefectLogFleetBus,defects:StructuredDefect[],state:DefectState){
 if(bus.s==="decommissioned")return bus.s;
 const repairAware={...bus,defects,pendingRepair:defectSummary(defects)};
 if(state==="in-progress")return "shop";
 if(defects.some(defect=>isUnresolved(defect)&&defect.operability==="down"))return "out";
 const located=statusForLocation(bus.l,bus.s,repairAware);
 if(located!==bus.s||bus.l.startsWith("east-")||bus.l.startsWith("west-")||bus.l.startsWith("road-")||bus.l.startsWith("garage-")||bus.l.startsWith("bay-")||bus.l.startsWith("body-"))return located;
 return bus.s==="service"||bus.s==="defect"?roadServiceStatus(repairAware):bus.s;
}

export function activeDefectLogCount(fleet:DefectLogFleetBus[]){
 return fleet.reduce((count,bus)=>count+normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.source==="defect-log"&&isUnresolved(defect)&&!defect.defectLogHiddenAt).length,0);
}
/* How far back the form looks before calling a new report a repeat of one the
   bus is already carrying.

   It was 48 hours, and the live board proved that too short: of the 25
   duplicate records found on it, two were typed into this form by hand on
   different days, the second one landing after the two-day window had closed.
   A fault reported Monday and reported again Thursday is the same fault; a
   week is not.

   Widening is safe because the guard only ever matches a record that is STILL
   UNRESOLVED. A repair that was finished and came back does not match - the
   finished one is resolved - so a genuine recurrence still gets its own record
   no matter how soon it returns.

   The label is exported beside the number so the wording a mechanic reads
   cannot drift away from the rule the code enforces. */
export const RECENT_DUPLICATE_WINDOW_HOURS=120;
export const RECENT_DUPLICATE_WINDOW_LABEL="5 days";
const RECENT_DUPLICATE_WINDOW_MS=RECENT_DUPLICATE_WINDOW_HOURS*60*60*1000;
function sameDefectChoice(left:StructuredDefect,right:StructuredDefect){return left.category.trim().toLowerCase()===right.category.trim().toLowerCase()&&left.issue.trim().toLowerCase()===right.issue.trim().toLowerCase()}
export function recentDefectDuplicate(bus:DefectLogFleetBus,incoming:StructuredDefect,now=new Date().toISOString()){const currentTime=Date.parse(now);if(!Number.isFinite(currentTime)||!incoming.category.trim()||!incoming.issue.trim())return null;return normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).find(defect=>{if(defect.id===incoming.id||!isUnresolved(defect)||!sameDefectChoice(defect,incoming))return false;const loggedTime=Date.parse(defect.createdAt||defect.updatedAt||"");const age=currentTime-loggedTime;return Number.isFinite(loggedTime)&&age>=0&&age<RECENT_DUPLICATE_WINDOW_MS})||null}
/* Every defect an active sheet entry is writing to, and the entry doing it.

   It used to read only the entry's STATED defectId, which named at most one
   record and is empty on every entry typed in by hand. A bus could sit on the
   sheet for a fault open in the log and no record would know it. Asking the
   sheet's own downSheetDefectIds covers all four doors — the stated id, the
   ids an entry mints per card, and the record a card adopts because the bus
   already had it. */
function downSheetEntryByDefectId(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]){
 const linked=new Map<string,DefectLogDownEntry>();
 for(const entry of downEntries){
  if(entry.workflow==="Completed")continue;
  const bus=fleet.find(item=>item.id===entry.busId);
  if(!bus)continue;
  for(const id of downSheetDefectIds(entry,normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)))
   /* First entry wins. Two active entries for one bus is already blocked on
      save, so this only decides a tie that should not exist. */
   if(!linked.has(id))linked.set(id,entry);
 }
 return linked;
}

export function defectLogRecords(fleet:DefectLogFleetBus[],downEntries:DefectLogDownEntry[]):DefectLogRecord[]{
 const linked=downSheetEntryByDefectId(fleet,downEntries);
 return fleet.flatMap(bus=>normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>defect.source==="defect-log").map(defect=>{
  const createdAt=defect.createdAt||bus.parkedAt||new Date(0).toISOString();
  const downSheetEntry=linked.get(defect.id);
  return {bus,defect,createdAt,updatedAt:defect.updatedAt||createdAt,onDownSheet:Boolean(downSheetEntry),
   ...(downSheetEntry?{downSheetEntry}:{})};
 })).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

/* What the sheet says about a repair, in one line, for the banner on the
   defect. The workflow leads because it answers "is anybody on it"; the shift
   and the name answer "who". */
export function downSheetEntryLabel(entry:DefectLogDownEntry){
 const who=entry.assignmentType==="Vendor"
  ?(entry.assignedTo.trim()?"Vendor: "+entry.assignedTo.trim():"Vendor")
  :entry.assignedTo.trim().toUpperCase();
 return [entry.workflow,entry.shift?entry.shift+" shift":"",entry.section,who].map(part=>String(part||"").trim()).filter(Boolean).join(" · ");
}

/* The active entries for a bus that no defect listed under it accounts for.

   A bus can be on the sheet for something that was never typed into the Defect
   Log — a scan, or a repair logged straight onto the sheet — and in that case
   the DS badge on the card is true while none of the defects under it carries
   the banner. Saying so is the difference between "the app is not telling me
   which one" and "none of these is the one". */
export function unexplainedDownSheetEntries(records:DefectLogRecord[],busId:string,downEntries:DefectLogDownEntry[]){
 const named=new Set(records.filter(record=>record.downSheetEntry).map(record=>record.downSheetEntry!.id));
 return downEntries.filter(entry=>entry.busId===busId&&entry.workflow!=="Completed"&&!named.has(entry.id));
}
export function groupDefectLogRecords(records:DefectLogRecord[]):DefectLogBusGroup[]{
 const groups=new Map<string,DefectLogBusGroup>();
 records.forEach(record=>{
  const current=groups.get(record.bus.id);
  if(current){current.records.push(record);if(record.updatedAt>current.updatedAt)current.updatedAt=record.updatedAt}
  else groups.set(record.bus.id,{bus:record.bus,records:[record],updatedAt:record.updatedAt});
 });
 return [...groups.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
}

export function saveDefectLogRecord(
 fleet:DefectLogFleetBus[],
 downEntries:DefectLogDownEntry[],
 busId:string,
 incoming:StructuredDefect,
 onDownSheet:boolean,
 now=new Date().toISOString(),
){
 const bus=fleet.find(item=>item.id===busId);
 if(!bus)return {fleet,downEntries,error:"missing-bus" as const};
 const duplicate=incoming.issue==="Manual entry"||incoming.issue==="Unspecified issue"?null:recentDefectDuplicate(bus,incoming,now);
 if(duplicate)return {fleet,downEntries,error:"recent-duplicate" as const,duplicate};
 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
 const existing=current.find(defect=>defect.id===incoming.id);
 /* Any OTHER bus still holding this id. Checked on every save, not only when
    the bus number changed, because the invariant is "one bus per defect id"
    and a pair that already went wrong has to be able to heal: saving either
    copy collapses them back to one. Only the arrival is called a move - a
    stray copy being swept up is a repair, not a decision somebody made. */
 const strayOn=busHoldingDefect(fleet,incoming.id,bus.id);
 const leaving=existing?undefined:strayOn;
 const state=incoming.state;
 /* THE TWO FIELDS THAT ARE DELETED RATHER THAN SET TO UNDEFINED are taken from
   the incoming record instead of being left to the spread.

   `{...existing,...incoming}` cannot express "this field is gone". Both
   setDefectWorkState and setDownSheetRecommendation DELETE their key when the
   last tick comes off — deliberately, to keep stored records clean — and a
   missing key does not override the one `existing` still carries. So the value
   came straight back on the next read and the untick looked like it had not
   worked.

   workStates was fixed when it was found; downSheetRecommendation had the same
   bug and was found the same way, by driving the button in a browser and
   reading the record back. Turning RECOMMEND FOR DOWN SHEET off did nothing
   that survived a save — in the editor, and on the two surfaces that list
   recommendations. Anything else added to repair-catalog.ts that deletes its
   key belongs on this line too; grep it for `delete next.`.

   Every caller passes a complete defect built from the record it is editing,
   never a partial patch, so reading these straight off the incoming copy is
   what the callers already mean. A future caller that passes a patch would
   have to carry both fields with it. */
const defect:StructuredDefect={...existing,...incoming,workStates:incoming.workStates,downSheetRecommendation:incoming.downSheetRecommendation,createdAt:existing?.createdAt||incoming.createdAt||now,updatedAt:now,completedAt:state==="completed"?(incoming.completedAt||now):"",reportedLocation:existing?.reportedLocation||incoming.reportedLocation||bus.l,source:incoming.source||existing?.source||"defect-log",...(leaving?{movedFromBusNumber:leaving.n,movedAt:now}:{})},supportingDetails=defectSupportingDetails(defect);
 const defects=existing?current.map(item=>item.id===defect.id?defect:item):[...current,defect];
 const existingDown=downEntries.find(entry=>entry.defectId===defect.id);
 let nextDown=downEntries;
 if(onDownSheet&&state!=="completed"){
  const workflow=workflowForState(state),historyItem={at:now,initials:defect.reportedBy||"",action:existingDown?"Updated from Defect Log":"Added from Defect Log"};
  /* busId as well as busNumber. The update branch renamed the entry's bus and
     left its id pointing at the old one, so a moved repair showed the new
     number on a sheet row still filed under the bus it left. */
  const linked:DefectLogDownEntry=existingDown?{...existingDown,busId:bus.id,busNumber:bus.n,category:defect.category,repair:defect.issue,customReason:supportingDetails,workflow,operationalStatus:defect.operability==="down"?"out":state==="in-progress"?"shop":"defect",updatedAt:now,updatedBy:defect.reportedBy||existingDown.updatedBy,completedAt:"",history:[...(existingDown.history||[]),historyItem]}:{id:"repair-"+defect.id,defectId:defect.id,busId:bus.id,busNumber:bus.n,category:defect.category,repair:defect.issue,customReason:supportingDetails,assignmentType:"Mechanic",assignedTo:bus.mechanic||"",section:bus.roadcall?"Roadcall":"Pending",shift:shiftFromFleet(bus.shift),workflow,operationalStatus:defect.operability==="down"?"out":state==="in-progress"?"shop":"defect",priority:defect.operability==="down"?"High":"Routine",timeEstimate:normalizeRepairTimeEstimate(undefined,defect.category,defect.issue),createdAt:defect.createdAt||now,updatedAt:now,updatedBy:defect.reportedBy||"",completedAt:"",history:[historyItem]};
  nextDown=existingDown?downEntries.map(entry=>entry.id===existingDown.id?linked:entry):[linked,...downEntries];
 }else if(existingDown&&existingDown.workflow!=="Completed"){
  nextDown=downEntries.map(entry=>entry.id===existingDown.id?{...entry,workflow:"Completed",completedAt:now,updatedAt:now,updatedBy:defect.reportedBy||entry.updatedBy,history:[...(entry.history||[]),{at:now,initials:defect.reportedBy||"",action:state==="completed"?"Repair completed from Defect Log":"Removed from active Down Sheet"}]}:entry);
 }
 const hasActiveDown=nextDown.some(entry=>entry.busId===bus.id&&entry.workflow!=="Completed");
 const nextBusBase={...bus,defects,pendingRepair:defectSummary(defects),down:hasActiveDown};
 const nextBus=stampOperationalChange(bus,{...nextBusBase,s:repairStatus(nextBusBase,defects,state)},now) as DefectLogFleetBus;
 const placed=fleet.map(item=>item.id===bus.id?nextBus:item);
 const nextFleet=strayOn?takeDefectOffBus(placed,strayOn.id,defect.id,nextDown):placed;

 /* A road call is recorded the moment the box goes from unticked to ticked,
    and only then.

    The transition is what matters, not the box's state: re-saving a repair
    that road-called last week must not record a second breakdown, or the
    count that makes a pattern visible becomes a count of how many times
    somebody opened the form. `existing` is the record as it was stored before
    this save, which is the only place that answer can come from. */
 const wasRoadCall=Boolean(existing&&hasWorkState(existing,ROAD_CALL_KEY)),isRoadCall=hasWorkState(defect,ROAD_CALL_KEY);
 if(isRoadCall&&!wasRoadCall){
  const applied=applyRoadCall(nextFleet,bus.id,
   {id:"road-call-"+defect.id+"-"+now,at:now,by:defect.reportedBy||undefined,defectId:defect.id},undefined,now);
  return {fleet:applied.fleet,downEntries:nextDown,error:null,roadCall:{moved:applied.moved,target:applied.target}};
 }
 /* Taking the tick back. Inside the undo window the whole thing is withdrawn -
    the event and the move it caused - because a wrong tap never happened.
    Outside it the flag still comes off, but the breakdown stays recorded. */
 if(!isRoadCall&&wasRoadCall){
  const cleared=clearRoadCall(nextFleet,bus.id,now);
  return {fleet:cleared.fleet,downEntries:nextDown,error:null,roadCall:{withdrawn:cleared.withdrawn,restored:cleared.restored}};
 }
 return {fleet:nextFleet,downEntries:nextDown,error:null};
}

export function returnDefectLogBusToService(
 fleet:DefectLogFleetBus[],
 downEntries:DefectLogDownEntry[],
 busId:string,
 defectId:string,
 now=new Date().toISOString(),
){
 const bus=fleet.find(item=>item.id===busId);
 if(!bus)return {fleet,downEntries,status:null,error:"missing-bus" as const};
 if(bus.s==="decommissioned")return {fleet,downEntries,status:bus.s,error:"decommissioned" as const};
 const current=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),target=current.find(defect=>defect.id===defectId);
 if(!target||target.source!=="defect-log")return {fleet,downEntries,status:bus.s,error:"missing-defect" as const};
 const defects=current.map(defect=>defect.id===defectId?{...defect,operability:"service" as const,state:defect.state==="in-progress"?"open" as const:defect.state,updatedAt:now}:defect);
 const status:FleetStatus=defects.some(defect=>isUnresolved(defect)&&defect.operability==="down")?"out":"defect";
 const nextBus=stampOperationalChange(bus,{...bus,s:status,defects,pendingRepair:defectSummary(defects)},now) as DefectLogFleetBus;
 const nextDown=downEntries.map(entry=>entry.busId!==bus.id||entry.workflow==="Completed"?entry:{...entry,operationalStatus:status,updatedAt:now,history:[...(entry.history||[]),{at:now,initials:"",action:"Returned to service from Defect Log"}]});
 return {fleet:fleet.map(item=>item.id===bus.id?nextBus:item),downEntries:nextDown,status,error:null};
}
export function syncLinkedDownEntriesFromFleet<T extends DefectLogDownEntry>(entries:T[],bus:DefectLogFleetBus,now=new Date().toISOString(),updatedBy=""):T[]{
 const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id);
 return entries.map(entry=>{
  if(entry.busId!==bus.id||!entry.defectId)return entry;
  const defect=defects.find(item=>item.id===entry.defectId);if(!defect)return entry;
  const completed=defect.state==="completed",workflow=workflowForState(defect.state),supportingDetails=defectSupportingDetails(defect),changed=entry.workflow!==workflow||entry.category!==defect.category||entry.repair!==defect.issue||entry.customReason!==supportingDetails;
  if(!changed)return entry;
  return {...entry,category:defect.category,repair:defect.issue,customReason:supportingDetails,workflow,operationalStatus:completed?roadServiceStatus({...bus,defects,pendingRepair:defectSummary(defects)}):defect.operability==="down"?"out":defect.state==="in-progress"?"shop":"defect",updatedAt:now,updatedBy:updatedBy||defect.reportedBy||entry.updatedBy,completedAt:completed?(entry.completedAt||now):"",history:[...(entry.history||[]),{at:now,initials:updatedBy||defect.reportedBy||"",action:completed?"Completed from Bus Settings":"Updated from Bus Settings"}]} as T;
 });
}

/* The plain name of a parking space, for reports that leave the app. Lived on
   the Defect Log page; moved here so the report export can be built from the
   shared Settings page as well. */
export function locationLabel(location:string){
 const labels:[string,string][]=[["garage-","Main Garage"],["road-","On Road"],["offsite-","Off Property"],["west-","CNG West"],["east-","CNG East"],["bay-","Shop Bay"],["service-","Service Detail"],["wall-","Shop Wall"],["waiting-","Waiting Area"],["office-","Foreman Office"],["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["body-","Body Shop"],["paint-","Paint Booth"],["wash-","Wash Rack"]];
 const found=labels.find(([prefix])=>location.startsWith(prefix));return found?found[1]:location||"Location not set";
}
