"use client";

import {useEffect, useMemo, useState} from "react";
import {defectCountField,MINIMUM_DIAGNOSTIC_HOURS,normalizeDiagnosticHours,normalizeRepairHours,REPAIR_OPTIONS,repairCategoryLabel} from "../repair-catalog";
import {findingMatchKey,readFindingsMemory,recallFindings} from "../findings-memory";
import {lockPageScroll} from "../scroll-lock";
import {
  aggregateRepairItemEstimates,
  blankRepairItem,
  normalizeRepairItems,
  repairItemsProgress,
  repairItemsReason,
  repairItemsTotal,
  type DownSheetRepairItem,
} from "./down-sheet-repair-items";
import {formatRepairTime, repairTimeTotal, resetCoreRepairEstimate, type RepairTimeEstimate} from "./repair-time-estimates";

type FleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";
type Shift="1st"|"2nd"|"3rd";
type Workflow="Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
type AssignmentType="Mechanic"|"Vendor";
type RepairSection="Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";
type FleetBus={id:string;n:string;s:FleetStatus;l:string};
type RepairHistory={at:string;initials:string;action:string};

export type DownSheetRecord={
  id:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
  repairItems?:DownSheetRepairItem[];
  assignmentType:AssignmentType;assignedTo:string;section:RepairSection;shift:Shift;
  workflow:Workflow;operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";
  timeEstimate:RepairTimeEstimate;
  createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:RepairHistory[];
};

const SECTIONS:RepairSection[]=["Pending","Accident","Scheduled Repair","Inspection","Vendor Repair","Roadcall","Other"];
const WORKFLOWS:Workflow[]=["Scheduled","In Progress","Waiting for Parts","On Hold","Completed","Deferred"];
const STATUS_OPTIONS:[FleetStatus,string][]=[["service","In Service / On Road"],["defect","In Service with Defects"],["shop","Work in Progress"],["out","Out of Service"],["decommissioned","Decommissioned"],["unknown","Unknown"]];
const ESTIMATE_FIELDS:{key:Exclude<keyof RepairTimeEstimate,"notes">;label:string;help:string}[]=[
  {key:"repairMinutes",label:"HANDS-ON REPAIR",help:"Repair, replacement, adjustment, inspection, and verification."},
  {key:"diagnosticMinutes",label:"DIAGNOSIS / VERIFY",help:"Reproduce, inspect, test, isolate, and confirm."},
  {key:"accessMinutes",label:"BUS ACCESS & SETUP",help:"Find and stage the bus, move blockers, jump, air, or push."},
  {key:"complicationMinutes",label:"COMPLICATIONS",help:"Seized parts, stripped hardware, corrosion, or rework."},
  {key:"heatMinutes",label:"HEAT / FATIGUE",help:"Realistic pace for extreme shop or outdoor conditions."},
  {key:"interruptionMinutes",label:"ROADCALL / INTERRUPTIONS",help:"Road calls, reassignment, or waiting on direction."},
  {key:"otherMinutes",label:"OTHER TIME",help:"Parts, vendor coordination, cleanup, paperwork, or retest."},
];

function hoursValue(minutes:number){return Number((minutes/60).toFixed(2))}

export default function DownSheetEditor({entry,fleet,entries,defaultInitials,onClose,onSave}:{entry:DownSheetRecord;fleet:FleetBus[];entries:DownSheetRecord[];defaultInitials:string;onClose:()=>void;onSave:(entry:DownSheetRecord)=>void}){
  const [draft,setDraft]=useState(()=>({...entry,repairItems:normalizeRepairItems(entry.repairItems,{category:entry.category,repair:entry.repair,details:entry.customReason,timeEstimate:entry.timeEstimate})}));
  const [initials,setInitials]=useState(defaultInitials||entry.updatedBy);
  const update=<K extends keyof DownSheetRecord>(key:K,value:DownSheetRecord[K])=>setDraft(current=>({...current,[key]:value}));
  const updateItem=(id:string,change:(item:DownSheetRepairItem)=>DownSheetRepairItem)=>setDraft(current=>({...current,repairItems:current.repairItems.map(item=>item.id===id?change(item):item)}));
  const updateEstimateHours=(id:string,key:Exclude<keyof RepairTimeEstimate,"notes">,value:string)=>updateItem(id,item=>({...item,timeEstimate:{...item.timeEstimate,[key]:Math.max(0,Math.round((Number(value)||0)*60))}}));
  const availableFleet=useMemo(()=>fleet.filter(bus=>bus.id===draft.busId||!entries.some(other=>other.id!==draft.id&&other.workflow!=="Completed"&&other.busId===bus.id)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})),[fleet,entries,draft.busId,draft.id]);
  const isNew=!entries.some(item=>item.id===entry.id);
  const estimateTotal=repairItemsTotal(draft.repairItems);

  /* The sheet already knew who had the bus. Dropping it was why every completed
    entry reached Fixed Repairs with nobody's name on it. */
 /* The six buckets that are not the main one. Almost always zero, which is why
    they belong behind a tick rather than in front of every repair. */
 const otherEstimateMinutes=(estimate:RepairTimeEstimate)=>ESTIMATE_FIELDS.filter(field=>field.key!=="repairMinutes").reduce((total,field)=>total+(estimate[field.key]||0),0);
 const [advancedEstimates,setAdvancedEstimates]=useState<Set<string>>(()=>new Set());
 /* Opens by itself where a figure already sits in one of the six, so turning
    this on never hides a number somebody entered. */
 const showBreakdown=(item:DownSheetRepairItem)=>advancedEstimates.has(item.id);
 /* The line carries the whole estimate, so typing into it moves the main bucket
    and leaves whatever the catalog seeded into the other six untouched. */
 const setSimpleTotal=(item:DownSheetRepairItem,value:string)=>
  updateEstimateHours(item.id,"repairMinutes",String(Math.max(0,(Number(value)||0)*60-otherEstimateMinutes(item.timeEstimate))/60));
 const findingsMemory=useMemo(()=>readFindingsMemory(typeof localStorage==="undefined"?null:localStorage),[]);
 const assignedMechanic=draft.assignmentType==="Mechanic"?draft.assignedTo.trim().toUpperCase():"";

 /* The entry's workflow and the cards under it have to agree, and it is the
    cards that know. Ticking the last repair closes the entry, because a bus
    with everything done must not sit on the sheet as active work. Untick one
    and the entry reopens. Setting the entry Completed marks them all, which is
    what keeps closing out ten buses at end of shift a dropdown rather than a
    checklist. */
 const setRepairDone=(id:string,done:boolean)=>setDraft(current=>{
  const repairItems=current.repairItems.map(item=>item.id===id?{...item,done}:item);
  const progress=repairItemsProgress(repairItems);
  const workflow:Workflow=progress.complete?"Completed":current.workflow==="Completed"?"In Progress":current.workflow;
  return {...current,repairItems,workflow};
 });
 const setWorkflow=(workflow:Workflow)=>setDraft(current=>({...current,workflow,
  repairItems:workflow==="Completed"?current.repairItems.map(item=>({...item,done:true})):current.repairItems}));

 const submit=(event:React.FormEvent)=>{
    event.preventDefault();
    const operator=initials.trim().toUpperCase(),bus=fleet.find(item=>item.id===draft.busId);
    if(!bus){alert("Select a bus number.");return}
    if(!operator){alert("Enter your initials before saving this update.");return}
    const now=new Date().toISOString();
    const repairItems=draft.repairItems.filter(item=>item.category||item.repair||item.details||item.estimateEnabled);
    const first=repairItems[0];
    const action=(isNew?"Created down-sheet entry":"Updated repair entry - "+draft.workflow)+(estimateTotal?" - mechanic estimate "+formatRepairTime(estimateTotal):" - no time estimate");
    onSave({
      ...draft,
      busNumber:bus.n,
      category:first?.category||"Miscellaneous",
      repair:first?.repair||"Repair required",
      customReason:repairItems.length===1?(repairItems[0].details||"").trim():repairItemsReason(repairItems),
      repairItems,
      timeEstimate:aggregateRepairItemEstimates(repairItems),
      updatedAt:now,
      updatedBy:operator,
      completedAt:draft.workflow==="Completed"?(draft.completedAt||now):"",
      history:[...draft.history,{at:now,initials:operator,action}],
    });
  };

  /* Hold the page still. Without this a scroll inside the form carried straight
     through to the page behind: 610px of it on a phone, which is what made the
     modal feel like it was fighting back. */
  useEffect(()=>lockPageScroll("down-editor-open"),[]);

  return <div className="down-shade" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
    <form className="repair-editor" onSubmit={submit}>
      <div className="repair-editor-head"><span>DOWN SHEET ENTRY<h2>{isNew?"Add Down Bus":"Bus "+draft.busNumber}</h2></span><button type="button" onClick={onClose}>X</button></div>
      <div className="repair-form">
        <label>BUS NUMBER<select value={draft.busId} onChange={event=>{const bus=fleet.find(item=>item.id===event.target.value);setDraft(current=>({...current,busId:event.target.value,busNumber:bus?.n||"",operationalStatus:bus?.s||current.operationalStatus}))}}><option value="">Select bus</option>{availableFleet.map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n}</option>)}</select><small>Fleet numbers come from the tracker.</small></label>
        <label>SECTION<select value={draft.section} onChange={event=>update("section",event.target.value as RepairSection)}>{SECTIONS.map(value=><option key={value}>{value}</option>)}</select></label>

        <fieldset className="repair-items wide">
          <legend>REPAIRS & ESTIMATES</legend>
          <div className="repair-items-head"><span><b>BUS TOTAL</b><small>Each repair keeps its own optional estimate.</small></span><strong>{estimateTotal?formatRepairTime(estimateTotal):"NOT SET"}</strong></div>
          <div className="repair-item-list">{draft.repairItems.map((item,index)=>{
            const repairs=REPAIR_OPTIONS[item.category]||[];
            const itemTotal=item.estimateEnabled?repairItemsTotal([item]):0;
            return <section className="repair-item-card" key={item.id}>
              <header><b>DEFECT {index+1}</b><span>{item.estimateEnabled?formatRepairTime(itemTotal):"No estimate"}</span>{draft.repairItems.length>1&&<button type="button" onClick={()=>setDraft(current=>({...current,repairItems:current.repairItems.filter(candidate=>candidate.id!==item.id)}))}>REMOVE</button>}</header>
              <label className="repair-item-done"><input type="checkbox" checked={item.done===true} onChange={event=>setRepairDone(item.id,event.target.checked)}/><span>{item.done?"FINISHED":"MARK THIS REPAIR FINISHED"}</span></label>
              <div className="repair-item-fields">
                <label>CATEGORY<select value={item.category} onChange={event=>{const category=event.target.value;updateItem(item.id,current=>({...current,category,repair:"",quantity:undefined,estimateEnabled:Boolean(category),timeEstimate:resetCoreRepairEstimate(current.timeEstimate,category,"")}))}}><option value="">Optional category</option>{Object.keys(REPAIR_OPTIONS).map(value=><option value={value} key={value}>{repairCategoryLabel(value)}</option>)}</select></label>
                <label>SPECIFIC REPAIR<select value={item.repair} onChange={event=>{const repair=event.target.value;updateItem(item.id,current=>({...current,repair,quantity:undefined,estimateEnabled:Boolean(repair||current.category),timeEstimate:resetCoreRepairEstimate(current.timeEstimate,current.category,repair)}));if(item.category==="Interior Cleaning"&&repair==="Cleaning Required")update("operationalStatus","shop")}} disabled={!item.category}><option value="">{item.category?"Optional specific repair":"Select category first"}</option>{item.repair&&!repairs.includes(item.repair)&&<option value={item.repair}>{item.repair} (as logged)</option>}{repairs.map(value=><option key={value}>{value}</option>)}</select></label>
                <label className="wide">DETAILS<textarea value={item.details} onChange={event=>updateItem(item.id,current=>({...current,details:event.target.value}))} placeholder="Optional notes for this repair"/></label>
                {/* Sits with the repair, not inside the completion block: a fan
                    count is what was reported and an air bag count is what the
                    job will take, and both are known before the tick. */}
                {defectCountField(item.category,item.repair)&&(()=>{const field=defectCountField(item.category,item.repair)!;
                 return <label className="repair-item-count">{field.label}<select value={item.quantity===undefined?"":String(item.quantity)} onChange={event=>updateItem(item.id,current=>({...current,quantity:event.target.value?Number(event.target.value):undefined}))}><option value="">{field.prompt}</option>{Array.from({length:field.max},(_,count)=>count+1).map(count=><option value={String(count)} key={count}>{count}</option>)}</select></label>;
                })()}
                {item.done&&<div className="wide item-completion">
                 <b>WHAT WAS DONE — GOES TO FIXED REPAIRS</b>
                 <label className="wide">FIX / STEPS TAKEN<textarea value={item.actionTaken||""} onChange={event=>updateItem(item.id,current=>({...current,actionTaken:event.target.value}))} placeholder="What was repaired, adjusted, replaced or reset?"/></label>
                 <label className="wide">WHAT WAS FOUND (OPTIONAL)<input maxLength={180} value={item.finding||""} onChange={event=>updateItem(item.id,current=>({...current,finding:event.target.value}))} placeholder="Throttle pedal reference circuit"/></label>
                 {recallFindings(findingsMemory,item.category,item.repair).length>0&&<div className="wide learned-findings" aria-label="Causes found before on this repair">
                  <small>FOUND BEFORE ON {(item.repair||"THIS REPAIR").toUpperCase()}</small>
                  <div>{recallFindings(findingsMemory,item.category,item.repair).map(found=>{
                   const picked=findingMatchKey(found.finding)===findingMatchKey(item.finding);
                   return <span className={"learned-finding"+(picked?" selected":"")} key={found.finding}>
                    <button type="button" onClick={()=>updateItem(item.id,current=>({...current,finding:picked?"":found.finding}))} aria-pressed={picked}>{found.finding}{found.uses>1?<i>×{found.uses}</i>:null}</button>
                   </span>;
                  })}</div>
                 </div>}
                 <label>REPAIR HOURS<input inputMode="decimal" value={item.repairHours===undefined?"":String(item.repairHours)} placeholder=".5" onChange={event=>updateItem(item.id,current=>({...current,repairHours:normalizeRepairHours(event.target.value)}))}/></label>
                 <label>DIAGNOSTIC HOURS<input inputMode="decimal" value={item.diagnosticHours===undefined?"":String(item.diagnosticHours)} placeholder={String(MINIMUM_DIAGNOSTIC_HOURS)} onChange={event=>updateItem(item.id,current=>({...current,diagnosticHours:normalizeDiagnosticHours(event.target.value)}))}/><small>{MINIMUM_DIAGNOSTIC_HOURS} hour minimum.</small></label>
                </div>}
              </div>
              <label className="estimate-toggle"><input type="checkbox" checked={item.estimateEnabled} onChange={event=>updateItem(item.id,current=>({...current,estimateEnabled:event.target.checked}))}/><span>ESTIMATE TIME</span><small>Optional. Category and specific repair load a starting allowance.</small></label>
              {item.estimateEnabled&&<div className="item-estimate">
                {/* One line by default. Seven buckets stacked under every repair
                    made an entry with three repairs a page nobody would read,
                    and the other six are almost always zero. The breakdown is
                    still there behind the tick, and the line carries the whole
                    estimate, so keeping it shut hides no number. */}
                <label className="estimate-simple">ESTIMATED HOURS<input type="number" min="0" max="40" step="0.25" inputMode="decimal" value={hoursValue(repairTimeTotal(item.timeEstimate))} onChange={event=>setSimpleTotal(item,event.target.value)}/><small>The whole estimate. Break it down only if the split matters.</small></label>
                <label className="estimate-advanced-toggle"><input type="checkbox" checked={showBreakdown(item)} onChange={event=>setAdvancedEstimates(current=>{const next=new Set(current);if(event.target.checked)next.add(item.id);else next.delete(item.id);return next})}/><span>BREAK THE ESTIMATE DOWN</span></label>
                {showBreakdown(item)&&<>
                <div className="estimate-grid">{ESTIMATE_FIELDS.map(field=><label key={field.key}>{field.label}<span><input type="number" min="0" max="40" step="0.25" inputMode="decimal" value={hoursValue(item.timeEstimate[field.key])} onChange={event=>updateEstimateHours(item.id,field.key,event.target.value)}/><b>HOURS</b></span><small>{field.help}</small></label>)}</div>
                <label className="estimate-notes wide">ESTIMATE NOTES<textarea value={item.timeEstimate.notes} onChange={event=>updateItem(item.id,current=>({...current,timeEstimate:{...current.timeEstimate,notes:event.target.value}}))} placeholder="Optional conditions supporting this estimate"/></label>
                </>}
              </div>}
            </section>;
          })}</div>
          <button className="add-repair-item" type="button" onClick={()=>setDraft(current=>({...current,repairItems:[...current.repairItems,blankRepairItem(current.repairItems.length)]}))}>+ ADD REPAIR</button>
          <p><b>30-MINUTE ABSOLUTE MINIMUM PER ESTIMATED REPAIR.</b> This is a planning forecast, not a flat-rate promise. Include diagnosis, access and staging, blocked buses, failed jumps, airing or pushing, stripped hardware, heat, interruptions, parts, cleanup, and retesting.</p>
        </fieldset>

        <label>ASSIGNMENT TYPE<select value={draft.assignmentType} onChange={event=>update("assignmentType",event.target.value as AssignmentType)}><option>Mechanic</option><option>Vendor</option></select></label>
        <label>{draft.assignmentType.toUpperCase()} ASSIGNED<input value={draft.assignedTo} onChange={event=>update("assignedTo",event.target.value)} placeholder={draft.assignmentType==="Vendor"?"Vendor or company":"Mechanic name or initials"}/></label>
        <label>SCHEDULED SHIFT<select value={draft.shift} onChange={event=>update("shift",event.target.value as Shift)}><option>1st</option><option>2nd</option><option>3rd</option></select></label>
        <label>REPAIR WORKFLOW<select value={draft.workflow} onChange={event=>setWorkflow(event.target.value as Workflow)}>{WORKFLOWS.map(value=><option key={value}>{value}</option>)}</select></label>
        <label>BUS STATUS ON TRACKER<select value={draft.operationalStatus} onChange={event=>update("operationalStatus",event.target.value as FleetStatus)}>{STATUS_OPTIONS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><small>Status only; location stays unchanged.</small></label>
        {repairItemsProgress(draft.repairItems).done>0&&<label className="wide completion-signoff">FIXED BY<input maxLength={12} autoCapitalize="characters" value={draft.completedBy||assignedMechanic} onChange={event=>update("completedBy",event.target.value.replace(/[^a-z0-9 .-]/gi,"").toUpperCase())} placeholder="Initials or name"/><small>{assignedMechanic?"Starts from the assigned mechanic. What was done goes on each repair above.":"Who closed this entry out. What was done goes on each repair above."}</small></label>}
        <label>PRIORITY<select value={draft.priority} onChange={event=>update("priority",event.target.value as DownSheetRecord["priority"])}><option>Routine</option><option>High</option><option>Critical</option></select></label>
        <label className="operator-initials">UPDATED BY - INITIALS<input required maxLength={6} autoCapitalize="characters" value={initials} onChange={event=>setInitials(event.target.value.replace(/[^a-z0-9]/gi,""))} placeholder="Initials"/><small>Required.</small></label>
      </div>
      {draft.history.length>0&&<section className="repair-history editor-history"><b>RECENT CHANGE HISTORY</b>{draft.history.slice(-5).reverse().map((item,index)=><div key={item.at+index}><strong>{item.initials}</strong><span>{item.action}</span><time>{new Date(item.at).toLocaleString()}</time></div>)}</section>}
      <div className="repair-editor-actions"><button type="button" onClick={onClose}>CANCEL</button><button className="save-repair" type="submit">SAVE UPDATE</button></div>
    </form>
  </div>;
}
