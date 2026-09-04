"use client";

import {useEffect,useMemo,useState} from "react";
import {DEFAULT_SETTINGS,FONT_STACKS,type Filter,type LogSettings,SETTINGS_KEY,readSettings} from "./defect-log-settings";
import TrackerNav from "../tracker-nav";
import "./defect-log.css";
import {CHECK_ENGINE_SYMPTOMS,isCheckEngineIssue,hasDiagLightField,normalizeDiagLight,DIAG_LIGHTS,DIAG_LIGHT_LABELS,type DiagLight,isDiagnosticDefect,MINIMUM_DIAGNOSTIC_HOURS,normalizeDiagnosticHours,normalizeRepairHours,defaultDefectOperability,defectCountField,defectLabel,defectNote,defectTsb,defectWorkStates,deferredMinutesElapsed,hasDeferredHistory,brakeTestFailed,brakeTestResult,BRAKE_TEST_KEY,type BrakeTestResult,isDownSheetRecommended,isHeldDeferred,isUnresolved,normalizeFinding,normalizeDefects,REPAIR_OPTION_GROUPS,REPAIR_OPTIONS,repairCategoryLabel,repairGroupDisplayLabel,repairIssueDisplayLabel,setDefectWorkState,setDownSheetRecommendation,WORK_STATES,workStateStampLabel,type DefectOperability,type DefectState,type StructuredDefect,type WorkStateKey} from "../repair-catalog";
import {RECENT_DUPLICATE_WINDOW_LABEL,defectLogRecords,downSheetEntryLabel,groupDefectLogRecords,hideDefectLogRecords,isDefectLogCleanupCandidate,recentDefectDuplicate,returnDefectLogBusToService,saveDefectLogRecord,unexplainedDownSheetEntries,type DefectLogDownEntry,type DefectLogFleetBus,type DefectLogRecord,locationLabel} from "./defect-log-sync";
import {bay12AwarenessBusIds,mysteryBusIds} from "../mystery-buses";
import SweepScanner from "./sweep-scanner";
import {sweepDefect,type SweepFinding} from "./sweep-scan-import";
import QuickFilterMenu from "../quick-filter-menu";
import OfflineBackupReminder from "./offline-backup-reminder";
import {QUICK_FILTERS,quickFilterBusIds,quickFilterDefects,quickFilterFallbackLabel,type QuickFilterKey} from "../quick-filters";
import {lockPageScroll} from "../scroll-lock";
import {candidateBusNumbers,resolveBusNumberList} from "../bus-number-resolver";
import {quickFilterShareFilename,quickFilterShareHtml,quickFilterShareText} from "./quick-filter-share";
import {EMPTY_PARTS_MEMORY,forgetPart,learnPart,readPartsMemory,recallPart,writePartsMemory,type PartMemoryEntry,type PartMemoryScope,type PartsMemory} from "../parts-memory";
import {EMPTY_FINDINGS_MEMORY,findingMatchKey,forgetFinding,learnFinding,readFindingsMemory,recallFindings,writeFindingsMemory,type FindingMemoryEntry,type FindingsMemory} from "../findings-memory";
import {shareOrDownloadFile} from "../share-file";
import SaveAlert from "../save-alert";
import {DeferredNavBadge,DeferredReviewPrompt} from "../deferred-watch";
import {exportFleetBoardBackup} from "../fleet-backup";
import {DOWN_SHEET_STORAGE_KEY as DOWN_KEY,FLEET_STORAGE_KEY as FLEET_KEY,readDownSheetPayload,readFleetPayload,writeFleetStorage,writeFleetStorageResult,writeDownSheetStorageResult,type FleetWriteOptions,type FleetWriteReason,type StorageWriteResult,writeSetting} from "../storage";

import {moveBusToArea,RELOCATION_AREAS,sectionForLocation} from "../facility-areas";
type LogDraft={busId:string;defect:StructuredDefect;quickIssue:string;onDownSheet:boolean;rememberScope?:PartMemoryScope};
type LogUndoSnapshot={fleet:DefectLogFleetBus[];downEntries:DefectLogDownEntry[];label:string};

const BOARD_SETTINGS_KEY="pace-board-settings-v1";
const MYSTERY_COLLAPSED_KEY="pace-defect-log-mystery-collapsed-v1";
/* Absent means closed. A new key rather than a settings field, so a device
   that has never opened the stats does not have to write anything to say so. */
const STATS_OPEN_KEY="pace-defect-log-stats-open-v1";
const STATUS_LABELS:Record<string,string>={service:"In Service",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown"};
const STATE_LABELS:Record<DefectState,string>={open:"OPEN","in-progress":"IN PROGRESS",deferred:"DEFERRED",completed:"FIXED"};

function readFleet(raw:string|null):DefectLogFleetBus[]{const payload=readFleetPayload<DefectLogFleetBus>(raw);return payload.valid?payload.buses.map(bus=>({...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)})):[]}
function readDown(raw:string|null):DefectLogDownEntry[]{const payload=readDownSheetPayload<DefectLogDownEntry>(raw);return payload.valid?payload.entries:[]}
function readMysterySlot(raw:string|null){try{const value=JSON.parse(raw||"{}").visuals?.mysterySlot;return /^#[0-9a-f]{6}$/i.test(String(value))?String(value):"#edf3ff"}catch{return "#edf3ff"}}
function isToday(value:string){return Boolean(value)&&new Date(value).toDateString()===new Date().toDateString()}
function timeLabel(value:string){const date=new Date(value);return Number.isNaN(date.getTime())?"Previous record":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date)}
function newDraft():LogDraft{const now=new Date().toISOString();return {busId:"",quickIssue:"",onDownSheet:false,defect:{id:"defect-log-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),category:"",issue:"",details:"",operability:"service",state:"open",createdAt:now,updatedAt:now,diagnosticNote:"",actionTaken:"",partNumber:"",reportedBy:"",source:"defect-log"}}}
function recordDraft(record:DefectLogRecord):LogDraft{return {busId:record.bus.id,quickIssue:record.defect.issue==="Manual entry"||record.defect.issue==="Unspecified issue"?"":record.defect.issue,onDownSheet:record.onDownSheet,defect:{...record.defect}}}
async function copyText(text:string){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return}catch{/* Use the selection-based fallback below. */}}
 const field=document.createElement("textarea");field.value=text;field.style.position="fixed";field.style.opacity="0";document.body.appendChild(field);field.focus();field.select();const copied=document.execCommand("copy");field.remove();if(!copied)throw new Error("Copy failed");
}

function busGeneration(number:string){const value=number.slice(0,2);return /^\d{2}$/.test(value)?value:"OTHER"}
function generationLabel(value:string){return value==="OTHER"?"OTHER":value+"s"}
function BusSelector({fleet,busId,select}:{fleet:DefectLogFleetBus[];busId:string;select:(busId:string)=>void}){
 const selected=fleet.find(bus=>bus.id===busId),standard=["15","17","18","20"],available=[...new Set(fleet.map(bus=>busGeneration(bus.n)))],generations=[...standard,...available.filter(value=>!standard.includes(value)).sort()];
 const [generation,setGeneration]=useState(selected?busGeneration(selected.n):"");
 const [number,setNumber]=useState(selected?.n||"");
 useEffect(()=>{const bus=fleet.find(item=>item.id===busId);if(bus){setNumber(bus.n);setGeneration(busGeneration(bus.n))}},[busId,fleet]);
 const candidates=[...fleet].filter(bus=>!generation||busGeneration(bus.n)===generation).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true}));
 const chooseGeneration=(next:string)=>{setGeneration(next);const current=fleet.find(bus=>bus.id===busId);if(current&&busGeneration(current.n)!==next)select("");if(!number.startsWith(next))setNumber("")};
 const typeNumber=(raw:string)=>{const digits=raw.replace(/\D/g,"");setNumber(digits);const prefix=digits.slice(0,2);if(digits.length>=2&&generations.includes(prefix))setGeneration(prefix);const exact=fleet.find(bus=>bus.n===digits);select(exact?.id||"")};
 const chooseBus=(id:string)=>{const bus=fleet.find(item=>item.id===id);select(id);setNumber(bus?.n||"");if(bus)setGeneration(busGeneration(bus.n))};
 /* Two boxes, because the old single box was called BUS NUMBER and the first
    thing in it was a row of generations. The chips narrow the fleet; the number
    names one bus. Naming each box for what it does is the whole change.

    They stay wired the way they always were - a generation filters the list AND
    the type-ahead, typing a number lights its generation, picking from the list
    fills the number - so the split is what a person reads, not what the code
    does. */
 return <>
  <fieldset className="wide bus-picker bus-picker-generations"><legend>BUS GENERATIONS</legend>
   <div className="bus-generations" aria-label="Bus generation">{generations.map(value=><button type="button" className={generation===value?"active":""} aria-pressed={generation===value} onClick={()=>chooseGeneration(value)} key={value}>{generationLabel(value)}</button>)}</div>
   <small>{generation?candidates.length+" buses in "+generationLabel(generation):"Narrows the bus list below. Skip it if you know the number."}</small>
  </fieldset>
  <fieldset className="wide bus-picker bus-picker-number"><legend>BUS NUMBER</legend>
   <div className="bus-picker-fields">
    <label>BUS LIST<select value={busId} disabled={!generation} onChange={event=>chooseBus(event.target.value)}><option value="">{generation?"Choose a "+generationLabel(generation)+" bus":"Choose generation first"}</option>{candidates.map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n} - {locationLabel(bus.l)}</option>)}</select></label>
    {/* The typed number is the way in that gets used, so it is the biggest
        thing in the form and it reads in the page's own text colour rather
        than the muted grey every other field uses. */}
    <label className="type-bus-number">TYPE BUS #<input autoFocus inputMode="numeric" value={number} onChange={event=>typeNumber(event.target.value)} list="defect-log-bus-numbers" placeholder="Enter full bus number"/><datalist id="defect-log-bus-numbers">{candidates.map(bus=><option value={bus.n} key={bus.id}/>)}</datalist></label>
   </div>
   {/* The list is disabled until a generation is picked, and that control now
       lives in the box above, so the reason has to be said here or it reads as
       broken. */}
   {!generation&&<small>Pick a generation above to use the bus list, or type the full number.</small>}
  </fieldset>
 </>;
}
function MysteryMoveModal({bus,fleet,move,close}:{bus:DefectLogFleetBus;fleet:DefectLogFleetBus[];move:(area:string)=>boolean;close:()=>void}){
 const [area,setArea]=useState(""),currentArea=sectionForLocation(bus.l),choices=Object.entries(RELOCATION_AREAS).map(([name,slots])=>({name,current:slots.includes(bus.l),open:slots.filter(slot=>!fleet.some(item=>item.l===slot)).length}));
 useEffect(()=>lockPageScroll("mystery-location-open"),[]);
 const submit=(event:React.FormEvent)=>{event.preventDefault();if(area&&move(area))close()};
 return <div className="shade mystery-move-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}><form className="mystery-move-modal" onSubmit={submit}><header className="mystery-move-head"><span><small>MYSTERY BUS</small><h2>Move Bus {bus.n}</h2></span><button type="button" onClick={close} aria-label="Close location editor">×</button></header><div><p><b>CURRENT LOCATION</b><span>{locationLabel(bus.l)}</span></p><label>NEW FACILITY LOCATION<select autoFocus required value={area} onChange={event=>setArea(event.target.value)}><option value="">Choose a section</option>{choices.map(choice=><option value={choice.name} disabled={!choice.current&&!choice.open} key={choice.name}>{choice.name+(choice.current?" — CURRENT":choice.open?" — "+choice.open+" OPEN":" — FULL")}</option>)}</select></label><small>The bus moves to the first open space in that section. Its defects and Down Sheet membership are not changed.</small></div><footer className="mystery-move-actions"><button type="button" onClick={close}>CANCEL</button><button type="submit" disabled={!area||area===currentArea}>MOVE BUS</button></footer></form></div>;
}

/* Asked at the moment a repair is closed out with a part on it.

   Two ways forward on purpose, and neither of them is "cancel". A mechanic
   standing at a bus often has the part in his hand and the number on the box,
   and sometimes the box is in the parts room and he is not walking back for it
   right now. Forcing a number would get a made-up one or an abandoned save;
   offering ENTER LATER records the truth — a part went on, the number is still
   outstanding — and the Fixed Repairs card says so until somebody fills it in.

   The number is handed back to the caller rather than written to the record
   here, because the save has to be validated as a whole. */
function PartNumberPrompt({busNumber,suggestion,initial,confirm,close}:{
 busNumber:string;suggestion:string;initial:string;
 confirm:(partNumber:string)=>void;close:()=>void;
}){
 const [number,setNumber]=useState(initial);
 const typed=number.trim();
 /* Escape closes it, the same as the page menu and the phone command panel.
    A layer that traps somebody because the only way out is a button they have
    to find is the one thing a person in a hurry will remember about it. */
 useEffect(()=>{
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.stopPropagation();close()}};
  window.addEventListener("keydown",escape,true);
  return()=>window.removeEventListener("keydown",escape,true);
 },[close]);
 return <div className="part-prompt-shade" role="dialog" aria-modal="true" aria-label="Part number"
  onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <div className="part-prompt">
   <header className="part-prompt-head"><small>SAVING AS FIXED{busNumber?" · BUS "+busNumber:""}</small><b>WHAT PART WENT ON?</b></header>
   <label>PART NUMBER
    <input value={number} autoFocus inputMode="text" autoComplete="off" spellCheck={false}
     placeholder="Type or scan the number"
     onChange={event=>setNumber(event.target.value)}
     onKeyDown={event=>{if(event.key==="Enter"&&typed){event.preventDefault();confirm(typed)}}}/>
   </label>
   {suggestion&&suggestion!==typed&&<button type="button" className="part-prompt-suggestion" onClick={()=>setNumber(suggestion)}>
    <span><b>LAST TIME</b>{suggestion}</span><em>USE THIS</em></button>}
   <div className="part-prompt-actions">
    <button type="button" className="part-prompt-save" disabled={!typed} onClick={()=>confirm(typed)}>SAVE WITH THIS PART</button>
    <button type="button" className="part-prompt-later" onClick={()=>confirm("")}>ENTER LATER</button>
   </div>
   <p className="part-prompt-note">ENTER LATER still saves the repair as fixed. It is marked <b>MISSING PART #</b> on the Fixed Repairs page until the number is added.</p>
   <button type="button" className="part-prompt-cancel" onClick={close}>CANCEL — DO NOT SAVE YET</button>
  </div>
 </div>;
}

function DefectEditor({draft,fleet,defaultInitials,requireInitials,partsMemory,forgetPart:forgetLearned,findingsMemory,forgetFinding:forgetLearnedFinding,save,saveFixed,close}:{draft:LogDraft;fleet:DefectLogFleetBus[];defaultInitials:string;requireInitials:boolean;partsMemory:PartsMemory;forgetPart:(entry:PartMemoryEntry)=>void;findingsMemory:FindingsMemory;forgetFinding:(entry:FindingMemoryEntry)=>void;save:(draft:LogDraft)=>void;saveFixed:(draft:LogDraft)=>void;close:()=>void}){
 const [value,setValue]=useState(draft);
 /* defaultOpen is not a DOM prop, so this panel stayed shut even on a record
    that already had a diagnosis, an action, or a part recorded. React warned
    about it and the section simply never opened. Held in state instead, seeded
    once from the record, so it opens when there is something to see and the
    mechanic can still collapse it. */
 /* Open only while the part prompt is up. Held here rather than as a separate
    route so closing the editor cannot strand it. */
 const [partPrompt,setPartPrompt]=useState(false);
 const [advancedOpen,setAdvancedOpen]=useState(()=>Boolean(draft.defect.state==="completed"||draft.defect.diagnosticNote||draft.defect.actionTaken||draft.defect.partNumber||draft.defect.completedBy||draft.defect.reportedBy||draft.defect.repairHours!==undefined||draft.defect.diagnosticHours!==undefined));
 useEffect(()=>lockPageScroll("defect-editor-open"),[]);
 const updateDefect=<K extends keyof StructuredDefect>(key:K,next:StructuredDefect[K])=>setValue(current=>({...current,defect:{...current.defect,[key]:next}}));
 const repairs=REPAIR_OPTIONS[value.defect.category]||[];
 /* A record can hold wording the picker no longer offers: a merged category kept
    an issue that had no clean equivalent, or the entry predates a rename. Without
    an option to match it the select falls back to its placeholder and the defect
    looks like it has no issue at all. Offer it as its own choice instead, so what
    was logged stays visible and survives a save untouched. */
 const offCatalogIssue=value.quickIssue&&!repairs.includes(value.quickIssue)?value.quickIssue:"";
 /* A record saved before Stage 6 has a part number but no flag, so treat an
    existing number as parts used rather than hiding it behind an empty box. */
 const partsUsed=value.defect.partsUsed??Boolean(String(value.defect.partNumber||"").trim());
 const remembered=recallPart(partsMemory,value.defect.category,value.defect.issue);
 /* Checking the box offers the remembered part; it never fills anything in
    while a defect is merely being logged, and never overwrites typing. */
 const togglePartsUsed=(checked:boolean)=>setValue(current=>{
  if(!checked)return {...current,defect:{...current.defect,partsUsed:false,partNumber:"",partName:""}};
  const suggestion=recallPart(partsMemory,current.defect.category,current.defect.issue);
  const hasNumber=Boolean(String(current.defect.partNumber||"").trim());
  return {...current,rememberScope:current.rememberScope||"issue",defect:{...current.defect,partsUsed:true,
   partNumber:hasNumber||!suggestion?current.defect.partNumber||"":suggestion.partNumber,
   partName:hasNumber||!suggestion?current.defect.partName||"":suggestion.partName||""}};
 });
 const diagnosticDefect=isDiagnosticDefect(value.defect.category,value.quickIssue||value.defect.issue);
 /* Scoped to the exact symptom on the form right now, so changing the picker
    changes what is offered and a cause never leaks to a defect it was not
    found under. */
 const learnedFindings=recallFindings(findingsMemory,value.defect.category,value.quickIssue||value.defect.issue);
 /* Ticking a state stamps who and when. The name comes from whatever is typed
    into FIXED BY or the device default, so the common case takes one tap; where
    initials are required and none are set, the tick is refused rather than
    stamped anonymously, because "somebody diagnosed this" is worth less than
    knowing who to ask.

    Unticking clears the stamp with the key, so a state can never carry a name
    for work that is no longer claimed. */
 const toggleWorkState=(key:WorkStateKey,on:boolean)=>{
  const by=(value.defect.completedBy||defaultInitials).trim().toUpperCase();
  if(on&&requireInitials&&!by){
   alert("Put your initials or name in FIXED BY before ticking a work state. This is required by the Defect Log setting; turn it off there to make it optional again.");
   return;
  }
  setValue(current=>({...current,defect:setDefectWorkState(current.defect,key,on,new Date().toISOString(),by)}));
 };
 /* A failed brake test takes the bus out of service on the spot.

    The right default on a safety item: the alternative is a record saying the
    brakes failed sitting beside an availability that still says the bus may
    stay in service. The dropdown stays editable, so this is a decision made
    FOR somebody rather than taken away from them — changing it back is
    deliberate and visible.

    Passing never touches availability. A good brake test is not a reason to
    overrule a bus that is down for something else entirely. */
 const setBrakeTestResult=(result:BrakeTestResult)=>{
  const by=(value.defect.completedBy||defaultInitials).trim().toUpperCase();
  setValue(current=>{
   const defect=setDefectWorkState(current.defect,BRAKE_TEST_KEY,true,new Date().toISOString(),by,result);
   return {...current,defect:result==="fail"?{...defect,operability:"down"}:defect};
  });
 };
 /* Held to the same initials rule as a work state. A recommendation is one
    person's judgement that a bus belongs on the sheet, and the list gets handed
    to somebody else, so an unsigned one is a job nobody can ask about. */
 const recommended=isDownSheetRecommended(value.defect),recommendedBy=String(value.defect.downSheetRecommendation?.by||"");
 const toggleDownSheetRecommendation=(on:boolean)=>{
  const by=(value.defect.completedBy||defaultInitials).trim().toUpperCase();
  if(on&&requireInitials&&!by){
   alert("Put your initials or name in FIXED BY before recommending this for the Down Sheet. This is required by the Defect Log setting; turn it off there to make it optional again.");
   return;
  }
  setValue(current=>({...current,defect:setDownSheetRecommendation(current.defect,on,new Date().toISOString(),by)}));
 };
 /* DEFERRED lives beside the Down Sheet boxes rather than in WORK STATUS,
    where it used to be one option among four. It is the same kind of call as
    RECOMMEND or DOWN SHEET — hold this bus back without putting it on the
    sheet — and buried in a diagnostic dropdown it went unnoticed even by the
    person who asked for it. Mutually exclusive with DOWN SHEET: checking one
    clears the other, because a bus cannot be both on the sheet and held back
    off it at once. deferredAt is stamped fresh on every entry into DEFERRED
    so the 90-minute alert and the evening review measure this stay, not a
    prior one. */
 const deferred=value.defect.state==="deferred";
 const hasHistory=hasDeferredHistory(value.defect,value.onDownSheet);
 const toggleDeferred=(on:boolean)=>{
  setValue(current=>({...current,onDownSheet:on?false:current.onDownSheet,defect:{
   ...current.defect,
   state:on?"deferred":(current.defect.state==="deferred"?"open":current.defect.state),
   deferredAt:on?new Date().toISOString():undefined,
   deferredUntil:on?current.defect.deferredUntil:undefined,
   /* Turning DEFERRED off without going to the Down Sheet is exactly the
      "returned to service, still open" moment this stamps. Turning it back
      on starts a fresh stay, so any older stamp is stale and clears too. */
   deferredReturnedAt:on?undefined:(current.defect.state==="deferred"?new Date().toISOString():current.defect.deferredReturnedAt),
  }}));
 };
 const toggleOnDownSheet=(on:boolean)=>{
  setValue(current=>({...current,onDownSheet:on,defect:on?{...current.defect,state:current.defect.state==="deferred"?"open":current.defect.state,deferredAt:undefined,deferredUntil:undefined,deferredReturnedAt:undefined}:current.defect}));
 };
 const selectedSymptoms=value.defect.symptoms||[],checkEngineMode=isCheckEngineIssue(value.defect.category,value.quickIssue);
 const diagLightMode=hasDiagLightField(value.defect.category),diagLight=normalizeDiagLight(value.defect.diagLight),typedAlarmDigits=String(value.defect.alarmCode||"").replace(/\D/g,"").slice(0,2);
 /* Ticking the lamp that is already on clears it, so a lamp recorded by mistake
    can be taken back off without saving the defect and reopening it. Switching
    to the other lamp keeps whatever alarm number was already typed — the panel
    escalating yellow to red on the same alarm is the ordinary case, not a
    reason to make somebody retype the number. */
 const setDiagLight=(light:DiagLight)=>setValue(current=>({...current,defect:{...current.defect,diagLight:normalizeDiagLight(current.defect.diagLight)===light?undefined:light}}));
 /* Whether this repair carries a count, and what that count is called, comes
    from the catalog rather than from a category test written into this form.
    Fans were hard-coded here; air bags would have been a second copy of it. */
 const countField=defectCountField(value.defect.category,value.quickIssue);
 const toggleCheckEngineSymptom=(symptom:string)=>updateDefect("symptoms",selectedSymptoms.includes(symptom)?selectedSymptoms.filter(item=>item!==symptom):[...selectedSymptoms,symptom]);
 const selectedBus=fleet.find(bus=>bus.id===value.busId),saveLabel=draft.defect.createdAt===draft.defect.updatedAt?"SAVE DEFECT":"SAVE UPDATE";
 const recentDuplicate=selectedBus&&value.quickIssue?recentDefectDuplicate(selectedBus,value.defect):null;
 /* Takes an optional patch because the part prompt decides what to store at the
    moment it is confirmed. Setting that on state and then calling this would
    save the defect as it was one render ago — React has not applied the update
    yet — so the part number would be dropped on the very save that asked for
    it. Passing it through means what is validated is what is written. */
 const validateAndSave=(complete:boolean,patch:Partial<StructuredDefect>={})=>{const defect={...value.defect,...patch};const completed=complete||defect.state==="completed";const initials=(defect.reportedBy||defaultInitials).trim().toUpperCase(),completedBy=(defect.completedBy||defaultInitials).trim().toUpperCase(),details=defect.details.trim(),issue=value.quickIssue||defect.issue,count=defect.quantity;if(!selectedBus){alert("Select a bus number.");return}if(!defect.category){alert("Select a repair category.");return}if(countField?.required&&(!count||count<1||count>countField.max)){alert("Select "+countField.label.toLowerCase()+" (1 through "+countField.max+").");return}if(completed&&requireInitials&&!completedBy){alert("Put your initials or name in FIXED BY before saving this as fixed. This is required by the Defect Log setting; turn it off there to make it optional again.");return}if(recentDuplicate){alert("This same defect was already logged "+timeLabel(recentDuplicate.createdAt||recentDuplicate.updatedAt||"")+". Use the existing defect instead. A new report can be logged after "+RECENT_DUPLICATE_WINDOW_LABEL+".");return}const now=new Date().toISOString(),finalIssue=issue&&issue!=="Manual entry"?issue:details?"Manual entry":"Unspecified issue",finalDraft:LogDraft={...value,onDownSheet:completed?false:value.onDownSheet,defect:{...defect,issue:finalIssue,details,reportedBy:initials,completedBy:completed?completedBy:defect.completedBy,state:completed?"completed":defect.state,completedAt:completed?(defect.completedAt||now):"",deferredAt:completed?undefined:defect.deferredAt,deferredUntil:completed?undefined:defect.deferredUntil,deferredReturnedAt:completed?undefined:defect.deferredReturnedAt}};(completed?saveFixed:save)(finalDraft)};
 const submit=(event:React.FormEvent)=>{event.preventDefault();validateAndSave(false)};
 return <div className="log-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  {partPrompt&&<PartNumberPrompt
   busNumber={selectedBus?.n||""}
   suggestion={remembered?.partNumber||""}
   initial={value.defect.partNumber||""}
   close={()=>setPartPrompt(false)}
   confirm={number=>{setPartPrompt(false);validateAndSave(true,{partsUsed:true,partNumber:number});}}/>}
  <form className="log-editor" onSubmit={submit}>
   <header className="log-editor-head"><span><small>REAL-TIME DEFECT</small><h2>{selectedBus?"Bus "+selectedBus.n:"Log Repair"}</h2></span><div className="log-editor-header-actions"><button className="close-log-editor" type="button" onClick={close} aria-label="Close">×</button></div></header>
   <div className="log-form">
    <BusSelector fleet={fleet} busId={value.busId} select={busId=>setValue(current=>({...current,busId}))}/>
    <label>CATEGORY<select value={value.defect.category} onChange={event=>setValue(current=>({...current,quickIssue:"",rememberScope:undefined,defect:{...current.defect,category:event.target.value,issue:"",symptoms:[],quantity:undefined,unit:undefined,operability:"service",partsUsed:false,partNumber:"",partName:""}}))}><option value="">Select category</option>{Object.keys(REPAIR_OPTIONS).map(category=><option value={category} key={category}>{repairCategoryLabel(category)}</option>)}</select></label>
    <label>QUICK SELECT (OPTIONAL)<select value={value.quickIssue} disabled={!value.defect.category} onChange={event=>{const issue=event.target.value,picked=defectCountField(value.defect.category,issue),oilIssue=value.defect.category==="Preventive Maintenance"&&issue==="Add engine oil";setValue(current=>({...current,quickIssue:issue,rememberScope:undefined,defect:{...current.defect,issue,partsUsed:false,partNumber:"",partName:"",symptoms:isCheckEngineIssue(current.defect.category,issue)?current.defect.symptoms||[]:[],quantity:undefined,unit:picked?picked.unit:oilIssue?"quarts":undefined,operability:defaultDefectOperability(current.defect.category,issue)}}))}}><option value="">{value.defect.category?"Save category only or choose an issue":"Select category first"}</option>{offCatalogIssue&&<option value={offCatalogIssue}>{offCatalogIssue} (as logged)</option>}{REPAIR_OPTION_GROUPS[value.defect.category]?Object.entries(REPAIR_OPTION_GROUPS[value.defect.category]).map(([group,items])=><optgroup label={repairGroupDisplayLabel(group)} key={group}>{items.map(entry=><option value={group+" - "+entry} key={entry}>{repairIssueDisplayLabel(entry,group)}</option>)}</optgroup>):repairs.map(repair=><option value={repair} key={repair}>{repairIssueDisplayLabel(repair)}</option>)}</select></label>
    {/* Shown where the choice was just made, not behind Advanced Details. The
        point is to reach somebody standing at the bus before they walk away
        thinking a missing cap is only a missing cap. */}
    {defectNote(value.defect.category,value.quickIssue||value.defect.issue)&&<p className="defect-note"><b>BEFORE YOU CLOSE THIS</b>{defectNote(value.defect.category,value.quickIssue||value.defect.issue)}</p>}
    {/* Directly under the note and deliberately a different colour. The note
        says what to do in the next five minutes; the bulletin says what this
        fleet has learned about the repair. Same size, so neither outranks the
        other, and separate, so neither buries the other. */}
    {defectTsb(value.defect.category,value.quickIssue||value.defect.issue)&&<p className="defect-tsb"><b>TSB — TECHNICAL SERVICE BULLETIN</b>{defectTsb(value.defect.category,value.quickIssue||value.defect.issue)}</p>}
    {recentDuplicate&&<p className="duplicate-defect-warning" role="alert"><b>ALREADY LOGGED</b> {timeLabel(recentDuplicate.createdAt||recentDuplicate.updatedAt||"")} · Use the existing defect. A new report is allowed after {RECENT_DUPLICATE_WINDOW_LABEL}.</p>}
    {checkEngineMode&&<fieldset className="wide engine-symptom-picker"><legend>CHECK ENGINE SYMPTOMS — SELECT ALL THAT APPLY</legend><div>{CHECK_ENGINE_SYMPTOMS.map(symptom=><label className={selectedSymptoms.includes(symptom)?"selected":""} key={symptom}><input type="checkbox" checked={selectedSymptoms.includes(symptom)} onChange={()=>toggleCheckEngineSymptom(symptom)}/><span>{symptom}</span></label>)}</div><small>{selectedSymptoms.length?selectedSymptoms.length+" symptom"+(selectedSymptoms.length===1?"":"s")+" selected":"Choose one or more symptoms if known."} All selections save as one defect record.</small></fieldset>}
    {diagLightMode&&<fieldset className="wide diag-light-picker"><legend>HVAC DIAG LIGHT (OPTIONAL)</legend><div className="diag-light-choices">{DIAG_LIGHTS.map(light=><label className={"diag-light-"+light+(diagLight===light?" selected":"")} key={light}><input type="checkbox" checked={diagLight===light} onChange={()=>setDiagLight(light)}/><span>{DIAG_LIGHT_LABELS[light]}</span></label>)}<label className="diag-alarm-code">ALARM #<input inputMode="numeric" maxLength={2} placeholder="00" value={value.defect.alarmCode||""} onChange={event=>updateDefect("alarmCode",event.target.value.replace(/\D/g,"").slice(0,2))}/></label></div><small className={typedAlarmDigits.length===1?"diag-alarm-warning":undefined}>{
     /* A single digit is the trap. It sits in the field looking entered and
        then does not save, because 4 could be 04 or 40 and only the panel
        knows which. Say so here rather than dropping it quietly on save. */
     typedAlarmDigits.length===1?"Alarm numbers are two digits — type 0"+typedAlarmDigits+" if that is what the panel shows. A single digit will not save."
     :!diagLight?(typedAlarmDigits?"Tick the lamp the panel is showing. An alarm number on its own is not saved, because it belongs to a lamp.":"Tick a lamp only if the panel is showing one. Two digits, so 04 stays 04.")
     :typedAlarmDigits.length===2?"Saved with the defect and shown on the Down Sheet."
     :"Add the two-digit alarm number from the panel if it is showing one."
    }</small></fieldset>}
    {value.defect.category==="Preventive Maintenance"&&value.quickIssue==="Add engine oil"&&<><label>QUANTITY<input type="number" min="0.5" step="0.5" inputMode="decimal" value={value.defect.quantity||""} onChange={event=>updateDefect("quantity",event.target.value?Number(event.target.value):undefined)}/></label><label>UNIT<select value={value.defect.unit||"quarts"} onChange={event=>updateDefect("unit",event.target.value)}><option value="quarts">Quarts</option><option value="gallons">Gallons</option><option value="liters">Liters</option></select></label></>}
    {countField&&<label className="defect-count-field">{countField.label}<select value={value.defect.quantity||""} onChange={event=>setValue(current=>({...current,defect:{...current.defect,quantity:event.target.value?Number(event.target.value):undefined,unit:countField.unit}}))}><option value="">{countField.prompt}</option>{Array.from({length:countField.max},(_,index)=>index+1).map(count=><option value={count} key={count}>{count}</option>)}</select></label>}
    <label className="wide">DESCRIPTION<textarea value={value.defect.details} onChange={event=>updateDefect("details",event.target.value)} placeholder="What was reported, observed, or repaired?"/></label>
    {/* Directly above WORK STATUS, and outside ADVANCED DETAILS on purpose:
        these are what gets ticked mid-job on a phone, by somebody standing at
        the bus, and burying them behind a disclosure is how they would go
        unused. Placed further down the form it opened below the fold on a
        phone, which is the same way the campaign paste box got missed. */}
    <fieldset className="wide work-state-picker"><legend>WORK DONE SO FAR — OPTIONAL</legend>
     <div>{WORK_STATES.map(state=>{
      const stamp=value.defect.workStates?.[state.key],on=Boolean(stamp),who=workStateStampLabel(stamp);
      return <label className={on?"selected":""} key={state.key}>
       <input type="checkbox" checked={on} onChange={event=>toggleWorkState(state.key,event.target.checked)}/>
       <span><b>{state.label}</b><small>{on&&who?who:state.hint}</small></span>
      </label>;
     })}</div>
     {/* Shown only once BRAKE TEST is ticked, and offered as one either/or
         rather than two checkboxes: three independent boxes would let
         somebody record a pass and a fail at once, or a result with no test
         behind it. Neither state is reachable here. */}
     {Boolean(value.defect.workStates?.[BRAKE_TEST_KEY])&&<div className="brake-test-result" role="group" aria-label="Brake test result">
      <b>BRAKE TEST RESULT</b>
      <div>
       {(["pass","fail"] as BrakeTestResult[]).map(result=>{
        const picked=brakeTestResult(value.defect)===result;
        return <button type="button" key={result} className={"brake-test-"+result+(picked?" selected":"")} aria-pressed={picked} onClick={()=>setBrakeTestResult(result)}>{result.toUpperCase()}</button>;
       })}
      </div>
      {/* A pass never puts a bus back in service on its own — that stays a
          deliberate act, including after a mis-tapped FAIL. Said out loud here
          rather than left for somebody to notice later on the board. */}
      <small>{brakeTestFailed(value.defect)?"Recorded as failed — BUS AVAILABILITY was set to Remove From Service. Change it below only if that is wrong.":brakeTestResult(value.defect)==="pass"?(value.defect.operability==="down"?"Recorded as passed. This bus is still set to Remove From Service — change BUS AVAILABILITY below to put it back in service.":"Recorded as passed. Availability is left as it is."):"Record whether it passed or failed. Anything more goes in the notes."}</small>
     </div>}
     <label className="work-state-finding">WHAT WAS FOUND (OPTIONAL)
      <input maxLength={180} value={value.defect.finding||""} onChange={event=>updateDefect("finding",event.target.value)} placeholder="Throttle pedal reference circuit"/>
     </label>
     {/* Causes found under this exact symptom before, offered here and nowhere
         else. Tapping one fills the box; typing something new is always
         allowed. Offering them is what stops the same fault being written five
         ways, which is the whole reason a year of history is readable. */}
     {learnedFindings.length>0&&<div className="learned-findings" aria-label="Causes found before on this defect">
      <small>FOUND BEFORE ON {(repairIssueDisplayLabel(value.quickIssue||value.defect.issue)||"THIS DEFECT").toUpperCase()}</small>
      <div>{learnedFindings.map(entry=>{
       const picked=findingMatchKey(entry.finding)===findingMatchKey(value.defect.finding);
       return <span className={"learned-finding"+(picked?" selected":"")} key={entry.finding}>
        <button type="button" onClick={()=>updateDefect("finding",picked?"":entry.finding)} aria-pressed={picked}>
         {entry.finding}{entry.uses>1?<i>×{entry.uses}</i>:null}
        </button>
        <button type="button" className="forget-finding" title={"Forget "+entry.finding} aria-label={"Forget "+entry.finding} onClick={()=>forgetLearnedFinding(entry)}>×</button>
       </span>;
      })}</div>
     </div>}
     <small>A finding is the cause, in your own words, when it is nothing the list could have offered. It shows on this repair everywhere it appears, including the Down Sheet, so the next person reads what was found and not just what was reported.</small>
    </fieldset>
    <label>WORK STATUS<select value={deferred?"open":value.defect.state} disabled={deferred} onChange={event=>updateDefect("state",event.target.value as DefectState)}><option value="open">Open</option><option value="in-progress">In Progress</option><option value="completed">Fixed</option></select>{deferred&&<small>Set to DEFERRED below. Uncheck it there to pick a work status.</small>}</label>
    <label>BUS AVAILABILITY<select value={value.defect.operability} onChange={event=>updateDefect("operability",event.target.value as DefectOperability)}><option value="service">May Stay In Service</option><option value="down">Remove From Service</option></select></label>
    <div className="save-log-middle-actions" aria-label="Defect form actions">
     <button type="submit" className="save-log-middle" disabled={Boolean(recentDuplicate)}>{saveLabel}</button>
     <button type="button" className="save-fixed-middle" disabled={Boolean(recentDuplicate)} onClick={()=>validateAndSave(true)}>SAVE AS FIXED</button>
     <button type="button" className="save-fixed-part-middle" disabled={Boolean(recentDuplicate)} onClick={()=>setPartPrompt(true)}>SAVE FIXED W/ PART</button>
     <button type="button" className="close-log-middle" onClick={close}>CLOSE</button>
    </div>
    <details className="advanced-defect-details" open={advancedOpen} onToggle={event=>setAdvancedOpen(event.currentTarget.open)}><summary><span><b>ADVANCED DETAILS</b><small>Diagnosis, repair, parts and initials</small></span><em>{advancedOpen?"COLLAPSE":"TAP TO EXPAND"}</em></summary><div className="advanced-defect-grid">
    <label>DIAGNOSIS / TEST / VERIFICATION<textarea value={value.defect.diagnosticNote||""} onChange={event=>updateDefect("diagnosticNote",event.target.value)} placeholder="Tests, codes, findings, or verification"/></label>
    <label>FIX / STEPS TAKEN<textarea value={value.defect.actionTaken||""} onChange={event=>updateDefect("actionTaken",event.target.value)} placeholder="Repair, adjustment, replacement, or temporary action"/></label>
    <div className="parts-used-block">
     <label className="parts-used-toggle"><input type="checkbox" checked={partsUsed} onChange={event=>togglePartsUsed(event.target.checked)}/><span><b>PARTS USED</b><small>Record the part that fixed this defect. Leave it off if none were used.</small></span></label>
     {partsUsed&&<div className="parts-used-fields">
      <label>PART NUMBER<input value={value.defect.partNumber||""} onChange={event=>updateDefect("partNumber",event.target.value)} placeholder="Leave blank if the number is unknown"/></label>
      <label>PART NAME (OPTIONAL)<input value={value.defect.partName||""} onChange={event=>updateDefect("partName",event.target.value)} placeholder="Exact catalog name"/></label>
      <label className="parts-remember-scope"><input type="checkbox" checked={value.rememberScope==="category"} onChange={event=>setValue(current=>({...current,rememberScope:event.target.checked?"category":"issue"}))}/><span><b>REMEMBER FOR EVERY {repairCategoryLabel(value.defect.category||"this category").toUpperCase()} DEFECT</b><small>Off remembers the part for this exact defect only.</small></span></label>
      {remembered&&<p className="parts-remembered"><span><b>REMEMBERED</b>{remembered.partNumber}{remembered.partName?" — "+remembered.partName:""}<small>{remembered.scope==="category"?"Saved for the whole category":"Saved for this exact defect"} · used {remembered.uses}×</small></span><button type="button" onClick={()=>forgetLearned(remembered)}>FORGET</button></p>}
     </div>}
    </div>
    <label>FIXED BY{requireInitials?" — REQUIRED":" (OPTIONAL)"}<input maxLength={12} autoCapitalize="characters" value={value.defect.completedBy||defaultInitials} onChange={event=>updateDefect("completedBy",event.target.value.replace(/[^a-z0-9 .-]/gi,"").toUpperCase())} placeholder="Initials or name"/></label>
    <label>REPORTED BY (OPTIONAL)<input maxLength={12} autoCapitalize="characters" value={value.defect.reportedBy||defaultInitials} onChange={event=>updateDefect("reportedBy",event.target.value.replace(/[^a-z0-9 .-]/gi,"").toUpperCase())} placeholder="Initials or name"/></label>
    <fieldset className={"wide billable-time"+(diagnosticDefect?" diagnostic":"")}><legend>BILLABLE TIME — OPTIONAL</legend>
     <div>
      <label>REPAIR HOURS<input inputMode="decimal" value={value.defect.repairHours===undefined?"":String(value.defect.repairHours)} placeholder=".5" onChange={event=>updateDefect("repairHours",normalizeRepairHours(event.target.value))}/></label>
      <label>DIAGNOSTIC HOURS<input inputMode="decimal" value={value.defect.diagnosticHours===undefined?"":String(value.defect.diagnosticHours)} placeholder={String(MINIMUM_DIAGNOSTIC_HOURS)} onChange={event=>updateDefect("diagnosticHours",normalizeDiagnosticHours(event.target.value))}/></label>
     </div>
     <small>{diagnosticDefect
      ?"This is a diagnostic defect. Record diagnostic hours even when the bus is not fixed — press SAVE DEFECT rather than SAVE AS FIXED and the time is kept against an open repair."
      :"Decimal hours: .5 is half an hour. Diagnostic time starts at "+MINIMUM_DIAGNOSTIC_HOURS+" hour and only goes up. Leave blank if no time is being billed."}</small>
    </fieldset>
    </div></details>
    {/* Both rows stay below ADVANCED DETAILS, where the Down Sheet control has
        always lived and where anyone looking for a Down Sheet thing looks. The
        recommendation goes directly above the escalation rather than up with
        the work states: apart, somebody reaches for the wrong one, because the
        two read almost identically and do very different things. */}
    <label className="wide downsheet-check downsheet-recommend-check"><input type="checkbox" checked={recommended} onChange={event=>toggleDownSheetRecommendation(event.target.checked)}/><span><b>RECOMMEND FOR DOWN SHEET</b><small>{recommended&&recommendedBy?"Put forward by "+recommendedBy+".":"Put it forward for the sheet. Not added yet."}</small></span></label>
    <label className="wide downsheet-check"><input type="checkbox" checked={value.onDownSheet} disabled={value.defect.state==="completed"} onChange={event=>toggleOnDownSheet(event.target.checked)}/><span><b>DOWN SHEET</b><small>Add it to the sheet now.</small></span></label>
    {/* Disabled while the repair is on the sheet, because the Down Sheet has
        a "Deferred" workflow of its own that writes this same state. Left
        enabled, the two boxes both read as ticked and the form claims a
        combination it elsewhere refuses to let anybody make. The tick still
        shows the truth — the record really does say deferred — it just says
        where that came from and what to do about it. */}
    <label className="wide downsheet-check deferred-check"><input type="checkbox" checked={deferred} disabled={value.defect.state==="completed"||value.onDownSheet} onChange={event=>toggleDeferred(event.target.checked)}/><span><b>DEFERRED</b><small>{value.onDownSheet?(deferred?"On the sheet, and the sheet has it deferred.":"Not available while it is on the Down Sheet."):deferred?"Held back since "+timeLabel(value.defect.deferredAt||new Date().toISOString())+".":hasHistory?"Check again to hold it back, or fix it now.":"Hold the bus back from service."}</small></span></label>
    {hasHistory&&<p className="deferred-history-note" role="note"><b>WAS DEFERRED</b>Returned to service {timeLabel(value.defect.deferredReturnedAt||"")}. Still open.</p>}
    <label className="wide downsheet-check condition-not-duplicated-check"><input type="checkbox" checked={Boolean(value.defect.conditionNotDuplicated)} onChange={event=>updateDefect("conditionNotDuplicated",event.target.checked)}/><span><b>DEFECT / CONDITION NOT DUPLICATED</b><small>Could not reproduce the reported condition.</small></span></label>

    {/* Moved off the top of the form. Sitting between the bus and the category
        it read like a field somebody had to deal with; it is only a stamp. */}
    <p className="defect-date-stamp"><b>LOGGED</b> {timeLabel(value.defect.createdAt||new Date().toISOString())}{value.defect.updatedAt&&value.defect.updatedAt!==value.defect.createdAt&&<> · <b>UPDATED</b> {timeLabel(value.defect.updatedAt)}</>}</p>
   </div>
   <footer className="log-editor-actions"><button className="save-log" disabled={Boolean(recentDuplicate)}>{saveLabel}</button><button type="button" className="save-fixed-bottom" disabled={Boolean(recentDuplicate)} onClick={()=>validateAndSave(true)}>SAVE AS FIXED</button><button type="button" className="save-fixed-part-bottom" disabled={Boolean(recentDuplicate)} onClick={()=>setPartPrompt(true)}>SAVE FIXED W/ PART</button><button type="button" onClick={close}>CLOSE</button></footer>
  </form>
 </div>;
}

function ShopNotesEditor({record,label,save}:{record:DefectLogRecord;label:string;save:(record:DefectLogRecord,value:string)=>void}){
 const [value,setValue]=useState(record.defect.shopNotes||"");
 useEffect(()=>setValue(record.defect.shopNotes||""),[record.defect.id,record.defect.shopNotes]);
 return <label className="shop-notes-column" onClick={event=>event.stopPropagation()}>
  <b>{label}</b>
  <textarea value={value} onChange={event=>setValue(event.target.value)} onBlur={()=>{if(value!==(record.defect.shopNotes||""))save(record,value)}} onKeyDown={event=>event.stopPropagation()} placeholder="Add shop note"/>
  <small>{value===(record.defect.shopNotes||"")?"SAVED":"SAVES WHEN YOU LEAVE"}</small>
 </label>;
}


export default function DefectLog(){
 const [fleet,setFleet]=useState<DefectLogFleetBus[]>([]);
 const [downEntries,setDownEntries]=useState<DefectLogDownEntry[]>([]);
 const [settings,setSettings]=useState<LogSettings>(DEFAULT_SETTINGS);
 const [filter,setFilter]=useState<Filter>("all");
 const [search,setSearch]=useState("");
 /* ALL means show me everything, and until now it only meant half of that.
    A tech searched a bus number, tapped into the defect, came back, pressed
    ALL - and still saw one bus, because the search box was still holding the
    board down and nothing on screen said so. The only way out was to notice
    the text and delete it.

    So ALL clears the search as well as the filter. Every other button keeps
    the search, because narrowing a search by state is the point of them. */
 const showEverythingOr=(value:Filter)=>{
  const next=filter===value?"all":value;
  setFilter(next);
  if(next==="all")setSearch("");
 };
 const [quickFilter,setQuickFilter]=useState<QuickFilterKey|null>(null);
 const [quickFilterExpandedBusIds,setQuickFilterExpandedBusIds]=useState<string[]>([]);
 const [downSheetBadgeColors,setDownSheetBadgeColors]=useState({badge:"#7c3aed",text:"#fff"});
 const [quickFilterShareStatus,setQuickFilterShareStatus]=useState<""|"copied"|"shared"|"error">("");
 const [editing,setEditing]=useState<LogDraft|null>(null);
 const [mysterySlot,setMysterySlot]=useState("#edf3ff");
 const [hydrated,setHydrated]=useState(false);
 const [expandedBusIds,setExpandedBusIds]=useState<string[]>([]);
 const [focusedBusId,setFocusedBusId]=useState("");
 const [partsMemory,setPartsMemory]=useState<PartsMemory>(EMPTY_PARTS_MEMORY);
 useEffect(()=>setPartsMemory(readPartsMemory(localStorage)),[]);
 const forgetLearnedPart=(entry:PartMemoryEntry)=>setPartsMemory(current=>{const next=forgetPart(current,entry.scope,entry.category,entry.issue);writePartsMemory(localStorage,next);return next});
 const [findingsMemory,setFindingsMemory]=useState<FindingsMemory>(EMPTY_FINDINGS_MEMORY);
 useEffect(()=>setFindingsMemory(readFindingsMemory(localStorage)),[]);
 const forgetLearnedFinding=(entry:FindingMemoryEntry)=>setFindingsMemory(current=>{const next=forgetFinding(current,entry.category,entry.issue,entry.finding);writeFindingsMemory(localStorage,next);return next});
 const [mysteryCollapsed,setMysteryCollapsed]=useState(false);
 const [statsOpen,setStatsOpen]=useState(false);
 const [movingMysteryBusId,setMovingMysteryBusId]=useState("");
 const [saveProblem,setSaveProblem]=useState<FleetWriteReason|"">("");
 const [undoSnapshot,setUndoSnapshot]=useState<LogUndoSnapshot|null>(null);
 const [sweepOpen,setSweepOpen]=useState(false);

 useEffect(()=>{const nextFleet=readFleet(localStorage.getItem(FLEET_KEY)),nextDown=readDown(localStorage.getItem(DOWN_KEY)),nextSettings=readSettings(localStorage.getItem(SETTINGS_KEY));setFleet(nextFleet);setDownEntries(nextDown);setSettings(nextSettings);try{const visuals=JSON.parse(localStorage.getItem(BOARD_SETTINGS_KEY)||"{}").visuals;if(typeof visuals?.downSheetBadge==="string"&&typeof visuals?.downSheetBadgeText==="string")setDownSheetBadgeColors({badge:visuals.downSheetBadge,text:visuals.downSheetBadgeText})}catch{}setMysterySlot(readMysterySlot(localStorage.getItem(BOARD_SETTINGS_KEY)));setMysteryCollapsed(localStorage.getItem(MYSTERY_COLLAPSED_KEY)==="1");setStatsOpen(localStorage.getItem(STATS_OPEN_KEY)==="1");setFilter(nextSettings.defaultFilter);setHydrated(true)},[]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,SETTINGS_KEY,JSON.stringify(settings))},[settings,hydrated]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,MYSTERY_COLLAPSED_KEY,mysteryCollapsed?"1":"0")},[mysteryCollapsed,hydrated]);
 useEffect(()=>{if(hydrated)writeSetting(localStorage,STATS_OPEN_KEY,statsOpen?"1":"0")},[statsOpen,hydrated]);
 useEffect(()=>{const receive=(event:StorageEvent)=>{if(event.key===FLEET_KEY)setFleet(readFleet(event.newValue));if(event.key===DOWN_KEY)setDownEntries(readDown(event.newValue));if(event.key===BOARD_SETTINGS_KEY)setMysterySlot(readMysterySlot(event.newValue));/* Settings are edited on the shared page now, so a change there has to reach a log that is already open - and it has to reach this page's own state, because this page writes the whole settings object back whenever one of its fields changes and would otherwise put the stale copy over the new one. */if(event.key===SETTINGS_KEY)setSettings(readSettings(event.newValue))};window.addEventListener("storage",receive);return()=>window.removeEventListener("storage",receive)},[]);

 const allRecords=useMemo(()=>defectLogRecords(fleet,downEntries),[fleet,downEntries]);
 const records=useMemo(()=>allRecords.filter(record=>!record.defect.defectLogHiddenAt),[allRecords]);
 const activeDownBusIds=useMemo(()=>downEntries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId),[downEntries]);
 const activeDownBusIdSet=useMemo(()=>new Set(activeDownBusIds),[activeDownBusIds]);
 const mysteryIdSet=useMemo(()=>new Set(mysteryBusIds(fleet,activeDownBusIds)),[fleet,activeDownBusIds]);
 const awarenessIdSet=useMemo(()=>new Set(bay12AwarenessBusIds(fleet,activeDownBusIds)),[fleet,activeDownBusIds]);
 const mysteryBuses=useMemo(()=>fleet.filter(bus=>mysteryIdSet.has(bus.id)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})),[fleet,mysteryIdSet]);
 const busSearch=resolveBusNumberList(fleet,search),busSearchIds=new Set(busSearch.kind==="numbers"?busSearch.buses.map(bus=>bus.id):[]);
 const searchFeedback=busSearch.kind==="numbers"?[...busSearch.ambiguous.map(item=>item.query+" matches "+candidateBusNumbers(item.matches).join(", ")+" — enter the full bus number"),...(busSearch.invalid.length?["Use a full bus number or two ending digits: "+busSearch.invalid.join(", ")]:[]),...(busSearch.missing.length?["No bus matches: "+busSearch.missing.join(", ")]:[])].join(" · "):"";
 const active=records.filter(record=>isUnresolved(record.defect));
 const visible=records.filter(record=>{
  if(!settings.showFixed&&record.defect.state==="completed")return false;
  if(filter==="open"&&!(record.defect.state==="open"||record.defect.state==="deferred"))return false;
  if(filter==="in-progress"&&record.defect.state!=="in-progress")return false;
  if(filter==="fixed"&&!(record.defect.state==="completed"&&isToday(record.defect.completedAt||record.updatedAt)))return false;
  if(filter==="downsheet"&&!activeDownBusIdSet.has(record.bus.id))return false;
  if(busSearch.kind==="numbers")return busSearchIds.has(record.bus.id);
  const query=search.trim().toLowerCase();if(!query)return true;
  return [record.bus.n,record.defect.category,record.defect.issue,...(record.defect.symptoms||[]),record.defect.details,record.defect.diagnosticNote,record.defect.actionTaken,record.defect.shopNotes].some(value=>String(value||"").toLowerCase().includes(query));
 });
 const visibleGroups=groupDefectLogRecords(visible);
 /* Focus reads one bus at arm's length. Editing hands off to the existing
    editor, while completion reuses the same Mark Fixed path as the main log. */
 const focusedGroup=focusedBusId?visibleGroups.find(group=>group.bus.id===focusedBusId):undefined;
 /* "Deferred" is genuinely held-back only when the bus carries no active Down
    Sheet entry — quick-filters.ts has no way to know that, since it never
    sees Down Sheet entries, so the exclusion and the wait-time sort both
    happen here instead. */
 const deferredCandidateIds=useMemo(()=>quickFilterBusIds(fleet,"deferred").filter(id=>!activeDownBusIdSet.has(id)),[fleet,activeDownBusIdSet]);
 const deferredSince=(bus:DefectLogFleetBus)=>{const defect=quickFilterDefects(bus,"deferred").find(item=>isHeldDeferred(item,activeDownBusIdSet.has(bus.id)));return defect?.deferredAt?new Date(defect.deferredAt).getTime():Infinity};
 const quickFilterCounts=Object.fromEntries(QUICK_FILTERS.map(item=>[item.key,item.key==="deferred"?deferredCandidateIds.length:quickFilterBusIds(fleet,item.key).length])) as Record<QuickFilterKey,number>,quickFilterIds=quickFilter?new Set(quickFilter==="deferred"?deferredCandidateIds:quickFilterBusIds(fleet,quickFilter)):new Set<string>(),quickFilterBuses=quickFilter?fleet.filter(bus=>quickFilterIds.has(bus.id)).sort((a,b)=>quickFilter==="deferred"?deferredSince(a)-deferredSince(b):a.n.localeCompare(b.n,undefined,{numeric:true})):[],quickFilterLabel=QUICK_FILTERS.find(item=>item.key===quickFilter)?.label||"Quick Filter";
 const stats={active:active.length,progress:active.filter(record=>record.defect.state==="in-progress").length,downing:active.filter(record=>record.defect.operability==="down").length,fixedToday:records.filter(record=>record.defect.state==="completed"&&isToday(record.defect.completedAt||record.updatedAt)).length,buses:new Set(active.map(record=>record.bus.id)).size};

 /* Reports why nothing was kept instead of returning in silence. The state is
    not advanced on a refusal, on purpose — the screen keeps showing what is
    actually stored rather than a change that did not land. */
 /* Returns the fleet write's result so a caller can tell whether anything was
    actually stored. Every caller here wants the default write, guard and all.
    The one operation whose whole purpose is to end with fewer records than it
    started with — MERGE DUPES — lives on the Settings page now, with the
    guard lifted there and only there. */
 const persist=(nextFleet:DefectLogFleetBus[],nextDown:DefectLogDownEntry[],options:FleetWriteOptions={}):StorageWriteResult=>{
  const written=writeFleetStorageResult(localStorage,nextFleet,options);
  setSaveProblem(written.reason||"");
  if(!written.ok)return written;
  setFleet(nextFleet);setDownEntries(nextDown);
  const sheet=writeDownSheetStorageResult(localStorage,nextDown);
  if(!sheet.ok)setSaveProblem(sheet.reason||"");
  return written;
 };
 const saveShopNotes=(record:DefectLogRecord,value:string)=>{const nextFleet=fleet.map(bus=>bus.id!==record.bus.id?bus:{...bus,defects:normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).map(defect=>defect.id===record.defect.id?{...defect,shopNotes:value}:defect)});persist(nextFleet,downEntries)};
 const closeEditor=()=>{const left=window.scrollX,top=window.scrollY;if(document.activeElement instanceof HTMLElement)document.activeElement.blur();setEditing(null);const restore=()=>window.scrollTo(left,top);window.requestAnimationFrame(()=>{restore();window.requestAnimationFrame(restore)})};
 const persistDraft=(draft:LogDraft,hideCompleted=false)=>{const now=new Date().toISOString(),result=saveDefectLogRecord(fleet,downEntries,draft.busId,draft.defect,draft.onDownSheet,now);if(result.error){alert(result.error==="recent-duplicate"?"This same unresolved defect was logged within the last "+RECENT_DUPLICATE_WINDOW_LABEL+". Use the existing defect instead.":"That bus is no longer available. Refresh and try again.");return}const busNumber=fleet.find(bus=>bus.id===draft.busId)?.n||"selected";if(draft.defect.partsUsed&&String(draft.defect.partNumber||"").trim())setPartsMemory(current=>{const next=learnPart(current,{category:draft.defect.category,issue:draft.defect.issue,partNumber:draft.defect.partNumber||"",partName:draft.defect.partName,scope:draft.rememberScope},now);writePartsMemory(localStorage,next);return next});/* Learned on any save that carries a finding, not only on one marked Diagnosed. Typing a cause is the diagnosis; making the checkbox the trigger would mean a mechanic writes the finding, sees nothing remembered, and never learns why. */if(normalizeFinding(draft.defect.finding))setFindingsMemory(current=>{const next=learnFinding(current,{category:draft.defect.category,issue:draft.defect.issue,finding:draft.defect.finding},now);writeFindingsMemory(localStorage,next);return next});setUndoSnapshot({fleet,downEntries,label:(hideCompleted?"Logged a fix":"Saved a defect")+" for Bus "+busNumber});persist(hideCompleted?hideDefectLogRecords(result.fleet,[draft.defect.id],now):result.fleet,result.downEntries);closeEditor()};
 const saveDraft=(draft:LogDraft)=>persistDraft(draft,false);
 const saveFixedDraft=(draft:LogDraft)=>persistDraft(draft,true);
 const markFixed=(record:DefectLogRecord)=>{const now=new Date().toISOString(),result=saveDefectLogRecord(fleet,downEntries,record.bus.id,{...record.defect,state:"completed",deferredAt:undefined,deferredUntil:undefined,deferredReturnedAt:undefined,reportedBy:record.defect.reportedBy||settings.defaultInitials,completedBy:record.defect.completedBy||settings.defaultInitials},false,now);if(result.error){alert("That bus is no longer available. Refresh and try again.");return}setUndoSnapshot({fleet,downEntries,label:"Marked Bus "+record.bus.n+" fixed"});persist(hideDefectLogRecords(result.fleet,[record.defect.id],now),result.downEntries)};
 /* Files the findings a reviewer approved from a scanned farebox / Ventra
    sweep sheet. Each goes through the same single-record save as LOG DEFECT,
    so the duplicate guard applies to every one: a fault somebody
    already logged this week is skipped, not doubled. The fleet is threaded
    through one save at a time and written once at the end, so a refused write
    leaves the board exactly as it was — and, as with every change here, UNDO
    LAST is the way back. */
 const fileSweep=(findings:SweepFinding[])=>{
  const now=new Date().toISOString();
  let nextFleet=fleet,nextDown=downEntries,filed=0,skipped=0;
  for(const finding of findings){
   const result=saveDefectLogRecord(nextFleet,nextDown,finding.busId,sweepDefect(finding,now),false,now);
   if(result.error){skipped++;continue}
   nextFleet=result.fleet;nextDown=result.downEntries;filed++;
  }
  if(!filed){alert(skipped?"Nothing was filed. Every approved finding was already logged on its bus in the last "+RECENT_DUPLICATE_WINDOW_LABEL+".":"Nothing was filed.");return}
  const written=persist(nextFleet,nextDown);
  if(!written.ok)return;
  setUndoSnapshot({fleet,downEntries,label:"Filed "+filed+" sweep finding"+(filed===1?"":"s")});
  setSweepOpen(false);
  alert(filed+" finding"+(filed===1?"":"s")+" filed as open Tech Services defect"+(filed===1?"":"s")+(skipped?". "+skipped+" skipped — already logged on that bus in the last 48 hours":"")+". UNDO LAST reverses it.");
 };
 const undoLastChange=()=>{if(!undoSnapshot)return;persist(undoSnapshot.fleet,undoSnapshot.downEntries);setUndoSnapshot(null)};
 const backInService=(record:DefectLogRecord)=>{const result=returnDefectLogBusToService(fleet,downEntries,record.bus.id,record.defect.id);if(result.error){alert(result.error==="decommissioned"?"A decommissioned bus cannot be returned to service.":"That repair is no longer available. Refresh and try again.");return}persist(result.fleet,result.downEntries);if(result.status==="out")alert("This bus remains Out of Service because another active downing defect is still present.")};
 const openMysteryBus=(bus:DefectLogFleetBus)=>{const record=records.find(item=>item.bus.id===bus.id&&isUnresolved(item.defect));setEditing(record?recordDraft(record):{...newDraft(),busId:bus.id})};
 const movingMysteryBus=fleet.find(bus=>bus.id===movingMysteryBusId)||null;
 const moveMysteryBus=(area:string)=>{if(!movingMysteryBus)return false;const result=moveBusToArea(fleet,movingMysteryBus.id,area);if(result.error==="insufficient-space"){alert(area+" is full. No bus was moved.");return false}if(result.error){alert("That bus or facility area is no longer available. Refresh and try again.");return false}if(result.unchanged)return true;if(!writeFleetStorage(localStorage,result.fleet))return false;setFleet(result.fleet);return true};

 const removeFromLog=(record:DefectLogRecord)=>{if(!confirm("Remove this repair from the Defect Log only? Bus status, location, defects, and Down Sheet records will stay unchanged."))return;persist(hideDefectLogRecords(fleet,[record.defect.id]),downEntries)};
 const cleanUpLog=()=>{const cleanable=records.filter(record=>isDefectLogCleanupCandidate(record,activeDownBusIdSet));if(!cleanable.length){alert("Nothing is ready for cleanup. Active repairs that started in this log stay until that repair is fixed.");return}if(!confirm("Clean up "+cleanable.length+" fixed, out-of-service, or Down Sheet record"+(cleanable.length===1?"":"s")+"? Repair data and every bus status will stay unchanged."))return;persist(hideDefectLogRecords(fleet,cleanable.map(record=>record.defect.id)),downEntries)};
 const copyQuickFilterList=async()=>{if(!quickFilter)return;try{await copyText(quickFilterShareText(quickFilterLabel,quickFilterBuses,quickFilter));setQuickFilterShareStatus("copied")}catch{setQuickFilterShareStatus("error")}};
/* The same list as a page rather than a paragraph.

    Text is right for pasting into a group message. It is wrong for a list
    somebody has to read in a garage: fourteen buses of prose is a wall. This
    sends a self-contained file that opens looking like the cards on screen,
    with no fonts, scripts or network of any kind, so it still renders on a
    phone with no signal and still reads a year from now. */
 const shareQuickFilterPage=async()=>{
  if(!quickFilter)return;
  const stamp=new Date().toLocaleString();
  const html=quickFilterShareHtml(quickFilterLabel,quickFilterBuses,quickFilter,stamp);
  const blob=new Blob([html],{type:"text/html"});
  const outcome=await shareOrDownloadFile(blob,quickFilterShareFilename(quickFilterLabel),quickFilterLabel+" bus list");
  setQuickFilterShareStatus(outcome==="cancelled"?null:outcome==="shared"?"shared":"copied");
 };
 const shareQuickFilterList=async()=>{if(!quickFilter)return;const text=quickFilterShareText(quickFilterLabel,quickFilterBuses,quickFilter);if(typeof navigator.share!=="function"){await copyQuickFilterList();return}try{await navigator.share({title:quickFilterLabel+" bus list",text});setQuickFilterShareStatus("shared")}catch(error){if((error as Error).name!=="AbortError")setQuickFilterShareStatus("error")}};
 
 const appStyle={...(settings.groupBorder?{"--log-card-border":settings.groupBorder}:{}),"--log-page":settings.appearance.page,"--log-surface":settings.appearance.surface,"--log-text":settings.appearance.text,"--log-muted":settings.appearance.muted,"--log-header":settings.appearance.header,"--log-header-text":settings.appearance.headerText,"--log-accent":settings.appearance.accent,"--mystery-slot":mysterySlot,"--downsheet-badge":downSheetBadgeColors.badge,"--downsheet-badge-text":downSheetBadgeColors.text,"--log-font":FONT_STACKS[settings.fontFamily],"--log-page-title-color":settings.display.styles.pageTitle.color,"--log-page-title-size":settings.display.styles.pageTitle.fontSize+"px","--log-summary-color":settings.display.styles.summary.color,"--log-summary-size":settings.display.styles.summary.fontSize+"px","--log-mystery-color":settings.display.styles.mystery.color,"--log-mystery-size":settings.display.styles.mystery.fontSize+"px","--log-feed-title-color":settings.display.styles.feedTitle.color,"--log-feed-title-size":settings.display.styles.feedTitle.fontSize+"px","--log-repair-category-color":settings.display.styles.repairCategory.color,"--log-repair-category-size":settings.display.styles.repairCategory.fontSize+"px","--log-repair-details-color":settings.display.styles.repairDetails.color,"--log-repair-details-size":settings.display.styles.repairDetails.fontSize+"px","--log-shop-notes-color":settings.display.styles.shopNotes.color,"--log-shop-notes-size":settings.display.styles.shopNotes.fontSize+"px"} as React.CSSProperties;

 return <main className="defect-log-app" style={appStyle} data-font-size={settings.fontSize} data-group-contrast={settings.groupContrast} data-status-color={settings.statusColor?"on":"off"}><SaveAlert reason={saveProblem} onExport={()=>exportFleetBoardBackup(localStorage,fleet)}/><DeferredNavBadge/><DeferredReviewPrompt/>
  <header className="log-header">
   <div><span>FLEET MAINTENANCE</span><h1>{settings.display.labels.pageTitle||"Real-Time Defect Log"}</h1><p>{settings.display.labels.subtitle}</p></div>
   <TrackerNav active="/defect-log"/>
  </header>
  {/* Closed by default. Five tiles were the first thing the page said, above
      the filters and the button that logs a defect, so a first-time user had
      to scroll past a scoreboard to reach the thing the page is for. The
      numbers still matter to a foreman, so they are one tap away and the
      choice is remembered per device. */}
  <section className={"daily-stats"+(statsOpen?" open":"")}>
   <button type="button" className="daily-stats-toggle" aria-expanded={statsOpen} onClick={()=>setStatsOpen(open=>!open)}>
    <b>DAILY STATS</b><small>{stats.active} {settings.display.labels.active.toLowerCase()} · {stats.buses} {settings.display.labels.buses.toLowerCase()} · {stats.downing} {settings.display.labels.downing.toLowerCase()} · {stats.fixedToday} {settings.display.labels.fixed.toLowerCase()}</small><i aria-hidden="true">{statsOpen?"CLOSE":"OPEN"}</i>
   </button>
   {statsOpen&&<section className="log-summary" aria-label="Defect log summary">
   <div className="primary"><strong>{stats.active}</strong><span>{settings.display.labels.active}</span></div><div><strong>{stats.buses}</strong><span>{settings.display.labels.buses}</span></div><div><strong>{stats.progress}</strong><span>{settings.display.labels.progress}</span></div><div className="downing"><strong>{stats.downing}</strong><span>{settings.display.labels.downing}</span></div><div className="fixed-today"><strong>{stats.fixedToday}</strong><span>{settings.display.labels.fixed}</span></div>
   </section>}
  </section>
  <OfflineBackupReminder buses={fleet} interval={settings.backupInterval}/>
  <section className="log-controls">
   {/* First thing under the header, so the page opens on what it is for. */}
   <button className="log-primary-action" type="button" onClick={()=>setEditing(newDraft())}>+ LOG DEFECT</button>
   {/* OPEN and DOWN SHEET are gone as buttons. OPEN differed from ALL only by
       hiding in-progress and today's fixes, a distinction that reads as noise
       to somebody new; DOWN SHEET has its own page and the DS badge already
       says which buses are on it. Both KEYS still work, so a saved default
       view of either keeps filtering — the button is what was removed, not
       the filter. Pressing the active one clears back to ALL. */}
   <div className="log-filters">{([["all","ALL"],["in-progress","IN PROGRESS"],["fixed","FIXED TODAY"],
    /* OPEN and DOWN SHEET are not offered, but both remain choosable as a saved
       default view. Somebody whose default is one of them would otherwise see a
       filtered board with no button lit and nothing saying why — and no way back
       without opening settings. The button appears only while its own filter is
       the active one, so it explains the view and clears it, without adding two
       buttons back for everybody else. */
    ...(filter==="open"?[["open","OPEN"] as [Filter,string]]:[]),
    ...(filter==="downsheet"?[["downsheet","DOWN SHEET"] as [Filter,string]]:[])] as [Filter,string][]).map(([value,label])=><button className={filter===value?"active":""} aria-pressed={filter===value} onClick={()=>showEverythingOr(value)} key={value}>{label}</button>)}</div>
   <QuickFilterMenu active={quickFilter} counts={quickFilterCounts} onSelect={value=>{setQuickFilter(value);setQuickFilterExpandedBusIds([]);setQuickFilterShareStatus("")}}/><div className="log-search-wrap"><label className="log-search"><span>SEARCH</span><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Bus numbers (space/comma), repair, code, or note" aria-describedby={searchFeedback?"log-search-feedback":undefined}/></label>{searchFeedback&&<small className="log-search-feedback" id="log-search-feedback">{searchFeedback}</small>}</div>
   <button className="log-undo-button" type="button" onClick={undoLastChange} disabled={!undoSnapshot} aria-label={undoSnapshot?"Undo "+undoSnapshot.label:"No recent defect-log change to undo"} title={undoSnapshot?.label||"Undo becomes available after a saved change"}>UNDO LAST</button>
   {/* Stays here with QUICK FILTERS, which is where somebody looks for it — it is
    not a stat and must not collapse with them. A bare gear on its own read as
    decoration, so it carries its name and is shaped like the buttons beside it. */}
   
  </section>
  {quickFilter&&<aside className="quick-filter-drawer" aria-label={quickFilterLabel+" buses"}><header className="quick-filter-head"><span><small>QUICK FILTER</small><b>{quickFilterLabel}</b></span><strong aria-label={quickFilterBuses.length+" buses"}>{quickFilterBuses.length}</strong><button className="quick-filter-close" onClick={()=>setQuickFilter(null)} aria-label="Close quick filter">×</button></header><div className="quick-filter-share-actions"><button type="button" onClick={copyQuickFilterList} aria-label="Copy filtered bus list">{quickFilterShareStatus==="copied"?"COPIED!":"COPY LIST"}</button><button type="button" onClick={shareQuickFilterList} aria-label="Share filtered bus list as text">SHARE</button><button type="button" onClick={shareQuickFilterPage} aria-label="Share filtered bus list as a page">SHARE PAGE</button>{quickFilterShareStatus==="shared"&&<small>SHARED</small>}{quickFilterShareStatus==="error"&&<small>COULD NOT SHARE — TRY COPY LIST</small>}</div><div className="quick-filter-results">{quickFilterBuses.length?quickFilterBuses.map(bus=>{const defects=quickFilterDefects(bus,quickFilter),fallback=quickFilterFallbackLabel(quickFilter),preview=defects.length?defects.slice(0,2).map(defectLabel).join("; "):fallback,expanded=quickFilterExpandedBusIds.includes(bus.id),/* Floored at zero: a device with a wrong clock, or a record synced from
      one, can carry a deferredAt in the future, and "DEFERRED -120M" is the
      kind of number that makes somebody stop trusting every other number on
      the card. The comparisons that matter — the 90-minute alert and the
      evening review — still read the real signed value and correctly ignore
      a stay that has not started yet. */
   deferredMinutes=quickFilter==="deferred"?(()=>{const elapsed=deferredMinutesElapsed(defects[0]||{state:"open"} as StructuredDefect);return elapsed===null?null:Math.max(0,elapsed)})():null;return <article className={"quick-filter-bus-card"+(expanded?" expanded":"")} key={bus.id}><button className="quick-filter-bus" aria-expanded={expanded} onClick={()=>setQuickFilterExpandedBusIds(current=>current.includes(bus.id)?[]:[bus.id])}><span><small>BUS</small><b>{bus.n}</b></span><span><strong>{locationLabel(bus.l)}</strong><small>{preview}</small></span><i>{expanded?"HIDE":"VIEW"}</i></button>{quickFilter==="deferred"&&<div className="quick-filter-deferred-row"><small className={deferredMinutes!==null&&deferredMinutes>=90?"deferred-overdue":""}>DEFERRED {deferredMinutes===null?"":deferredMinutes>=60?Math.floor(deferredMinutes/60)+"H "+Math.round(deferredMinutes%60)+"M":Math.round(deferredMinutes)+"M"}</small><button type="button" className="mystery-move" onClick={()=>setMovingMysteryBusId(bus.id)}>MOVE / LOCATION</button></div>}{expanded&&<div className="quick-filter-defects" aria-label={"Bus "+bus.n+" filtered defects"}>{defects.length?defects.map((defect,index)=><section key={defect.id}><span>{index+1}</span><div><b>{repairCategoryLabel(defect.category)}</b><strong>{defectLabel(defect)}</strong>{defect.conditionNotDuplicated&&<small><b>RESULT:</b> Defect / condition not duplicated</small>}{defect.diagnosticNote&&<small><b>DIAG:</b> {defect.diagnosticNote}</small>}{defect.actionTaken&&<small><b>ACTION:</b> {defect.actionTaken}</small>}{defect.shopNotes&&<small><b>SHOP NOTES:</b> {defect.shopNotes}</small>}</div><i className={"state "+defect.state}>{STATE_LABELS[defect.state]}</i></section>):<p>{fallback}. No matching active defect record is attached yet.</p>}</div>}</article>}):<p>No buses currently match this filter.</p>}</div></aside>}
  <section className={"mystery-board"+(mysteryCollapsed?" collapsed":"")} aria-label="Mystery buses">
   <header className="mystery-head"><span><b>{settings.display.labels.mysteryTitle}</b><small>{settings.display.labels.mysterySubtitle}</small></span><div className="mystery-header-actions"><strong>{mysteryBuses.length}</strong><button className="mystery-toggle" type="button" onClick={()=>setMysteryCollapsed(value=>!value)} aria-expanded={!mysteryCollapsed} aria-label={(mysteryCollapsed?"Expand ":"Collapse ")+settings.display.labels.mysteryTitle}>{mysteryCollapsed?"+":"−"}</button></div></header>
   {!mysteryCollapsed&&(mysteryBuses.length?<div className="mystery-list">{mysteryBuses.map(bus=>{const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isUnresolved),inLog=defects.some(defect=>defect.source==="defect-log"),onDownSheet=activeDownBusIds.includes(bus.id),preview=defects.length?defects.slice(0,2).map(defectLabel).join("; ")+(defects.length>2?" +"+(defects.length-2)+" more":""):"No known defects logged";return <article className={"mystery-card"+(awarenessIdSet.has(bus.id)?" bay12-awareness":"")} key={bus.id}><button className="mystery-card-main" type="button" onClick={()=>openMysteryBus(bus)} aria-label={"Open defects for Bus "+bus.n}>
    <span className="mystery-number"><small>BUS</small><b>{bus.n}</b></span><span className="mystery-detail"><b>{locationLabel(bus.l)}</b><small>{preview}</small></span>
    <span className="mystery-badges">{bus.s==="unknown"&&<i>UNKNOWN</i>}{awarenessIdSet.has(bus.id)&&<i>BAY 12</i>}{!onDownSheet&&<i>NOT ON DOWN SHEET</i>}{inLog&&<i>DEFECT LOG</i>}<small>{STATUS_LABELS[bus.s]||bus.s}</small></span></button>
    <button className="mystery-move" type="button" onClick={()=>setMovingMysteryBusId(bus.id)} aria-label={"Update facility location for Bus "+bus.n}><span aria-hidden="true">↪</span> MOVE / LOCATION</button>
   </article>})}</div>:<div className="mystery-empty"><b>Nothing unaccounted for.</b><span>Every eligible on-site work-area bus is accounted for on the Down Sheet.</span></div>)}
  </section>
  <section className="log-feed">
   <div className="feed-title">{/* LOG DEFECT moved to the top of the controls; it is not repeated here. */}
   <div className="feed-actions"><button className="cleanup-log" onClick={cleanUpLog}>CLEAN UP</button><button className="sweep-scan-button" type="button" onClick={()=>setSweepOpen(true)} disabled={!fleet.length} title="Photograph the farebox and Ventra check-off sheets and file what they found">📷 SCAN SWEEP</button>{sweepOpen&&<SweepScanner fleet={fleet} onClose={()=>setSweepOpen(false)} onFile={fileSweep}/>}<a className="feed-operator" href="/?operator=1"><span aria-hidden="true">&#10022;</span> AI OPERATOR</a></div><span><b>{settings.display.labels.feedTitle}</b><small>{visibleGroups.length} BUS{visibleGroups.length===1?"":"ES"} · {visible.length} DEFECT{visible.length===1?"":"S"}</small></span><label className="feed-status-color"><input type="checkbox" checked={settings.statusColor} onChange={event=>setSettings({...settings,statusColor:event.target.checked})}/><span>SHOW STATUS COLOR</span></label></div>
   {visibleGroups.length?<div className="log-list">{visibleGroups.map(group=>{const primary=group.records[0],expanded=expandedBusIds.includes(group.bus.id),busOnDownSheet=activeDownBusIdSet.has(group.bus.id),groupState:DefectState=group.records.some(record=>record.defect.state==="in-progress")?"in-progress":group.records.some(record=>record.defect.state==="open")?"open":group.records.some(record=>record.defect.state==="deferred")?"deferred":"completed",groupDowning=group.records.some(record=>isUnresolved(record.defect)&&record.defect.operability==="down"),groupHasDeferredHistory=group.records.some(record=>hasDeferredHistory(record.defect,busOnDownSheet)),preview=group.records.slice(0,2).map(record=>defectLabel(record.defect)).join(" · ");return <article className={"log-card log-card-group "+groupState+(groupDowning?" downing":"")+(group.bus.s==="out"?" out-of-service":"")+(expanded?" expanded":"")} key={group.bus.id}>
    <button className="log-focus-button" type="button" title={"Focus bus "+group.bus.n} aria-label={"Focus bus "+group.bus.n+" for easier reading"} onClick={event=>{event.stopPropagation();setFocusedBusId(group.bus.id)}}>FOCUS</button>
    <button className="log-card-main log-group-header" aria-expanded={expanded} onClick={()=>setExpandedBusIds(current=>current.includes(group.bus.id)?current.filter(id=>id!==group.bus.id):[...current,group.bus.id])}>
     {/* No category glyph on the collapsed card. The round icon showed the
         category of whichever defect happened to be first, which on a MULTIPLE
         DEFECTS card is one category standing in for three. Each expanded row
         carries its own emoji, where it is accurate to that row. */}
     <span className="log-bus"><small>BUS</small><span className="log-bus-number" data-status={group.bus.s}><strong>{group.bus.n}</strong></span><em>{locationLabel(group.bus.l)}</em></span>
     {/* Plain text, no inline emoji: the round icon to the left already carries
         the category glyph, and repeating it here made a single-defect title
         start further right than "MULTIPLE DEFECTS" on the card above it. */}
     <span className="log-repair"><b>{group.records.length===1?primary.defect.category:"MULTIPLE DEFECTS"}</b><strong>{preview}</strong>{group.records.length>2&&<small>+{group.records.length-2} more defect{group.records.length-2===1?"":"s"}</small>}</span>
     {/* DS used to sit inside the 64-72px bus-number column on a phone, where a
         five-digit number already fills the space. It spilled past its own
         column and landed on top of the repair description in the next one —
         a bus like 17530 measured the badge overlapping the text by 4px, not a
         near miss. It now sits beside the other purple badge here in the meta
         column, which has the room and reads as the pair of counts it always
         was: how many defects, and whether one is already on the sheet. */}
     {/* Fixed tab stops. Measured before this: OPEN began at x131 on a card with
         DS and ×3, x105 with ×4 alone, x73 with no badges — the same word at
         three different places on three neighbouring cards, and LATEST wrapped
         on two of the four. Each piece now has a slot it always occupies: the
         two badges sit in their own fixed sub-slots (so ×N is at the same x
         with or without DS), the state and status follow, and LATEST and VIEW
         hold the second row at its two ends. An empty slot stays empty; nothing
         slides into it. */}
     <span className="log-meta"><span className="log-badge-slot">{busOnDownSheet&&<b className="inline-ds-badge">DS</b>}{group.records.length>1&&<b className="defect-count-badge">×{group.records.length}</b>}</span><b className={"state "+groupState}>{STATE_LABELS[groupState]}</b><span className="log-status-cell"><small>{STATUS_LABELS[group.bus.s]||group.bus.s}</small>{groupHasDeferredHistory&&<b className="inline-deferred-history-badge" title="Was deferred, returned to service, still open">WAS DEF</b>}</span><time>LATEST {timeLabel(group.updatedAt)}</time><i className="group-toggle">{expanded?"CLOSE":"VIEW"}</i></span>
    </button>
    {expanded&&<div className="grouped-defect-list"><header className="grouped-defect-head"><span><b>BUS {group.bus.n}</b><small>{group.records.length} DEFECT{group.records.length===1?"":"S"}</small></span><button onClick={()=>setEditing({...newDraft(),busId:group.bus.id})}>+ ADD DEFECT</button></header>
     {/* A bus can be on the sheet for work that was never typed into this log —
         scanned off a paper sheet, or logged straight onto the Down Sheet. Then
         the DS badge is true and no defect below carries the banner, which
         reads like the app declining to answer. Naming the entry says it: none
         of these is the one. */}
     {unexplainedDownSheetEntries(group.records,group.bus.id,downEntries).map(entry=><p className="down-sheet-banner elsewhere" key={entry.id}><b>ON THE DOWN SHEET</b><span>{[entry.category,entry.repair,entry.customReason].map(part=>String(part||"").trim()).filter(Boolean).join(" — ")||"Repair required"} — not one of the defects below</span></p>)}{group.records.map((record,index)=><section className={"grouped-defect-row"+(record.onDownSheet?" on-down-sheet":"")} key={record.defect.id}>
     {record.downSheetEntry&&<p className="down-sheet-banner"><b>ON THE DOWN SHEET</b><span>{downSheetEntryLabel(record.downSheetEntry)}</span></p>}
     <button className="grouped-defect-main" onClick={()=>setEditing(recordDraft(record))}><span className="grouped-defect-number">{index+1}</span><span className="log-repair"><b>{repairCategoryLabel(record.defect.category)}</b><strong>{defectLabel(record.defect)}</strong>{record.defect.conditionNotDuplicated&&<small><b>RESULT:</b> Defect / condition not duplicated</small>}{record.defect.diagnosticNote&&<small><b>DIAG:</b> {record.defect.diagnosticNote}</small>}{record.defect.actionTaken&&<small><b>ACTION:</b> {record.defect.actionTaken}</small>}{record.defect.partNumber&&<small><b>PART:</b> {record.defect.partNumber}</small>}</span><span className="log-meta"><b className={"state "+record.defect.state}>{STATE_LABELS[record.defect.state]}</b>{isDownSheetRecommended(record.defect)&&<b className="work-state-badge down-sheet-recommended" title={"Recommended for the Down Sheet"+(workStateStampLabel(record.defect.downSheetRecommendation)?" — "+workStateStampLabel(record.defect.downSheetRecommendation):"")}>DS REC</b>}{hasDeferredHistory(record.defect,activeDownBusIdSet.has(group.bus.id))&&<b className="work-state-badge deferred-history" title={"Was deferred, returned to service "+timeLabel(record.defect.deferredReturnedAt||"")+", still open"}>WAS DEFERRED</b>}{defectWorkStates(record.defect).map(state=>{const who=workStateStampLabel(record.defect.workStates?.[state.key]);return <b className={"work-state-badge "+state.key} key={state.key} title={who?state.label+" — "+who:state.label}>{state.short}</b>})}<time>LOGGED {timeLabel(record.createdAt)}</time>{record.updatedAt!==record.createdAt&&<time>UPDATED {timeLabel(record.updatedAt)}</time>}</span></button>
     <ShopNotesEditor record={record} label={settings.display.labels.shopNotes+(group.records.length>1?" "+(index+1):"")} save={saveShopNotes}/>
     <div className="log-actions">{record.defect.state!=="completed"&&<button className="quick-fix" onClick={()=>markFixed(record)} aria-label={"Mark bus "+record.bus.n+" defect "+(index+1)+" fixed"}><span aria-hidden="true">&#10003;</span><b>MARK FIXED</b></button>}{record.defect.state!=="completed"&&record.bus.s!=="defect"&&record.bus.s!=="decommissioned"&&<button className="back-service" onClick={()=>backInService(record)} aria-label={"Return bus "+record.bus.n+" to service with defect "+(index+1)+" still active"}><span aria-hidden="true">&#8593;</span><b>BACK IN SERVICE</b></button>}<button className="remove-log" onClick={()=>removeFromLog(record)} aria-label={"Remove bus "+record.bus.n+" defect "+(index+1)+" from Defect Log only"}><span aria-hidden="true">×</span><b>REMOVE</b></button></div>
    </section>)}</div>}
   </article>})}</div>:<div className="empty-log"><b>No repairs match this view.</b><span>Use Log Defect to record the next bus finding.</span></div>}
  </section>
  {focusedGroup&&<div className="log-shade log-focus-shade" onMouseDown={event=>{if(event.target===event.currentTarget)setFocusedBusId("")}}>
   <section className="log-focus" role="dialog" aria-modal="true" aria-label={"Bus "+focusedGroup.bus.n+" defects"}>
    <div className="log-focus-head"><span className="log-focus-bus"><small>BUS</small><strong>{focusedGroup.bus.n}</strong></span><span className="log-focus-where"><b>{locationLabel(focusedGroup.bus.l)}</b><small>{STATUS_LABELS[focusedGroup.bus.s]||focusedGroup.bus.s}</small></span><button className="add-log-focus-defect" type="button" onClick={()=>{const busId=focusedGroup.bus.id;setFocusedBusId("");setEditing({...newDraft(),busId})}} aria-label={"Add a defect to bus "+focusedGroup.bus.n}>+ ADD DEFECT</button><button className="close-log-focus" type="button" onClick={()=>setFocusedBusId("")} aria-label="Close focus view">×</button></div>
    <div className="log-focus-body">{focusedGroup.records.map((record,index)=><article className={"log-focus-record "+record.defect.state} key={record.defect.id}>
     <div className="log-focus-record-head"><b>{focusedGroup.records.length>1?index+1+". ":""}{repairCategoryLabel(record.defect.category)}</b><i className={"state "+record.defect.state}>{STATE_LABELS[record.defect.state]}</i></div>
     <p className="log-focus-defect">{defectLabel(record.defect)}</p>
     {/* Spelled out here rather than abbreviated: the focus view is the one a
         foreman reads standing next to somebody, and "DIAGNOSED — CJ, Aug 27"
         answers the question without anybody tapping into the record. */}
     {record.downSheetEntry&&<p className="log-focus-work-states"><b>ON SHEET</b><span><i className="work-state-badge on-down-sheet">THIS DEFECT HAS THE BUS ON THE DOWN SHEET — {downSheetEntryLabel(record.downSheetEntry)}</i></span></p>}
     {isDownSheetRecommended(record.defect)&&<p className="log-focus-work-states"><b>ASKED</b><span><i className="work-state-badge down-sheet-recommended">RECOMMENDED FOR DOWN SHEET{workStateStampLabel(record.defect.downSheetRecommendation)?" — "+workStateStampLabel(record.defect.downSheetRecommendation):""}</i></span></p>}
     {hasDeferredHistory(record.defect,activeDownBusIdSet.has(focusedGroup.bus.id))&&<p className="log-focus-work-states"><b>HISTORY</b><span><i className="work-state-badge deferred-history">WAS DEFERRED — returned to service {timeLabel(record.defect.deferredReturnedAt||"")}, still open</i></span></p>}
     {defectWorkStates(record.defect).length>0&&<p className="log-focus-work-states"><b>DONE</b><span>{defectWorkStates(record.defect).map(state=>{const who=workStateStampLabel(record.defect.workStates?.[state.key]);return <i className={"work-state-badge "+state.key} key={state.key}>{state.label}{who?" — "+who:""}</i>})}</span></p>}
     {record.defect.conditionNotDuplicated&&<p><b>RESULT</b>Defect / condition not duplicated</p>}
     {record.defect.diagnosticNote&&<p><b>DIAG</b>{record.defect.diagnosticNote}</p>}
     {record.defect.actionTaken&&<p><b>ACTION</b>{record.defect.actionTaken}</p>}
     {record.defect.partNumber&&<p><b>PART</b>{record.defect.partNumber}</p>}
     {record.defect.shopNotes&&<p><b>{settings.display.labels.shopNotes.toUpperCase()}</b>{record.defect.shopNotes}</p>}
     <div className="log-focus-record-foot"><time>LOGGED {timeLabel(record.createdAt)}</time><span className="log-focus-record-actions"><button className="edit-log-focus-defect" type="button" onClick={()=>{setFocusedBusId("");setEditing(recordDraft(record))}}>EDIT DEFECT</button>{isUnresolved(record.defect)&&<button className="fix-log-focus-defect" type="button" onClick={()=>markFixed(record)}>MARK FIXED</button>}</span></div>
    </article>)}</div>
   </section>
  </div>}
  {editing&&<DefectEditor draft={editing} fleet={fleet} defaultInitials={settings.defaultInitials} requireInitials={settings.requireInitials} partsMemory={partsMemory} forgetPart={forgetLearnedPart} findingsMemory={findingsMemory} forgetFinding={forgetLearnedFinding} save={saveDraft} saveFixed={saveFixedDraft} close={closeEditor}/>}
  {movingMysteryBus&&<MysteryMoveModal bus={movingMysteryBus} fleet={fleet} move={moveMysteryBus} close={()=>setMovingMysteryBusId("")}/>}
  
 </main>;
}
