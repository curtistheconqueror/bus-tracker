"use client";

import {useMemo,useState} from "react";

type FleetStatus="service"|"defect"|"shop"|"out"|"decommissioned"|"unknown";
type Shift="1st"|"2nd"|"3rd";
type Workflow="Scheduled"|"In Progress"|"Waiting for Parts"|"On Hold"|"Completed"|"Deferred";
type AssignmentType="Mechanic"|"Vendor";
type RepairSection="Pending"|"Accident"|"Scheduled Repair"|"Inspection"|"Vendor Repair"|"Roadcall"|"Other";
type FleetBus={id:string;n:string;s:FleetStatus;l:string};
type RepairHistory={at:string;initials:string;action:string};

export type DownSheetRecord={
 id:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 assignmentType:AssignmentType;assignedTo:string;section:RepairSection;shift:Shift;
 workflow:Workflow;operationalStatus:FleetStatus;priority:"Routine"|"High"|"Critical";
 createdAt:string;updatedAt:string;updatedBy:string;completedAt:string;history:RepairHistory[];
};

const REPAIR_OPTIONS:Record<string,string[]>={
 "A/C and HVAC":["No cooling","Compressor","Blower motor","Refrigerant leak","Controls / electrical","Heater / defroster","Other A/C repair"],
 "Engine":["Check-engine diagnosis","Loss of power","Oil leak","Abnormal noise","Engine replacement","Internal engine repair","Other engine repair"],
 "Cooling System":["Overheating","Coolant leak","Radiator","Water pump","Cooling fan","Hoses / fittings","Other cooling repair"],
 "Transmission":["Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Other transmission repair"],
 "Suspension":["Air bag","Shock / strut","Ride-height issue","Suspension leak","Bushing / linkage","Other suspension repair"],
 "Steering":["Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Other steering repair"],
 "Brakes":["Brake inspection","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Battery replacement","Battery drain","No crank","Starter","Alternator / charging","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "No Start":["No crank","Cranks / no start","Intermittent no start","Starting-system diagnosis","Fuel-related no start","Electrical no start","Other no-start diagnosis"],
 "Doors, Ramp and Lift":["Front door","Rear door","Wheelchair ramp","Wheelchair lift","Interlock","Door controls","Other accessibility repair"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signals","Interior lights","Warning lights","Mirrors / fixtures","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Glass / windshield","Mirror","Paint","Interior body repair","Other bodywork"],
 "Air System":["Air leak","Air compressor","Air dryer","Air tank / valve","Builds air slowly","Air-system warning","Other air-system repair"],
 "Inspection":["A-6","A-15","B-12","B-18","C-24","Hub / Trans / Diff Refill (Three-Piece)","Valve Adjustment and Spark Plug Refresh"],
 "Preventive Maintenance":["Oil and filter service","Lubrication","Fluid service","Scheduled campaign","Seasonal preparation","Other preventive maintenance"],
 "Miscellaneous":["Driver-reported defect","Roadcall follow-up","Cleaning / sanitation","Noise / vibration","Unknown diagnosis","Other repair"],
};

const SECTIONS:RepairSection[]=["Pending","Accident","Scheduled Repair","Inspection","Vendor Repair","Roadcall","Other"];
const WORKFLOWS:Workflow[]=["Scheduled","In Progress","Waiting for Parts","On Hold","Completed","Deferred"];
const STATUS_OPTIONS:[FleetStatus,string][]=[["service","In Service / On Road"],["defect","In Service with Defects"],["shop","Work in Progress"],["out","Out of Service"],["decommissioned","Decommissioned"],["unknown","Unknown"]];

export default function DownSheetEditor({entry,fleet,entries,defaultInitials,onClose,onSave}:{entry:DownSheetRecord;fleet:FleetBus[];entries:DownSheetRecord[];defaultInitials:string;onClose:()=>void;onSave:(entry:DownSheetRecord)=>void}){
 const [draft,setDraft]=useState(entry);
 const [initials,setInitials]=useState(defaultInitials||entry.updatedBy);
 const update=<K extends keyof DownSheetRecord>(key:K,value:DownSheetRecord[K])=>setDraft(current=>({...current,[key]:value}));
 const availableFleet=useMemo(()=>fleet.filter(bus=>bus.id===draft.busId||!entries.some(other=>other.id!==draft.id&&other.workflow!=="Completed"&&other.busId===bus.id)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})),[fleet,entries,draft.busId,draft.id]);
 const repairs=REPAIR_OPTIONS[draft.category]||[];
 const isNew=!entries.some(item=>item.id===entry.id);
 const submit=(event:React.FormEvent)=>{event.preventDefault();const operator=initials.trim().toUpperCase(),bus=fleet.find(item=>item.id===draft.busId);if(!bus){alert("Select a bus number.");return}if(!draft.category){alert("Select a repair category.");return}if(!draft.repair){alert("Select the specific repair or service.");return}if(!operator){alert("Enter your initials before saving this update.");return}const now=new Date().toISOString(),action=isNew?"Created down-sheet entry":"Updated repair entry - "+draft.workflow,next={...draft,busNumber:bus.n,updatedAt:now,updatedBy:operator,completedAt:draft.workflow==="Completed"?(draft.completedAt||now):"",history:[...draft.history,{at:now,initials:operator,action}]};onSave(next)};

 return <div className="down-shade" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}>
  <form className="repair-editor" onSubmit={submit}>
   <div className="repair-editor-head"><span>DOWN SHEET ENTRY<h2>{isNew?"Add Down Bus":"Bus "+draft.busNumber}</h2></span><button type="button" onClick={onClose}>×</button></div>
   <div className="repair-form">
    <label>BUS NUMBER<select value={draft.busId} onChange={event=>{const bus=fleet.find(item=>item.id===event.target.value);setDraft(current=>({...current,busId:event.target.value,busNumber:bus?.n||"",operationalStatus:bus?.s||current.operationalStatus}))}}><option value="">Select bus</option>{availableFleet.map(bus=><option value={bus.id} key={bus.id}>Bus {bus.n}</option>)}</select><small>Fleet numbers come from the tracker and cannot be typed here.</small></label>
    <label>SECTION<select value={draft.section} onChange={event=>update("section",event.target.value as RepairSection)}>{SECTIONS.map(value=><option key={value}>{value}</option>)}</select></label>
    <label className="wide repair-category">REPAIR CATEGORY<select value={draft.category} onChange={event=>setDraft(current=>({...current,category:event.target.value,repair:""}))}><option value="">Choose a system or service</option>{Object.keys(REPAIR_OPTIONS).map(value=><option key={value}>{value}</option>)}</select><small>Choose the broad repair family first.</small></label>
    <label className="wide repair-specific">SPECIFIC REPAIR / SERVICE<select value={draft.repair} onChange={event=>update("repair",event.target.value)} disabled={!draft.category}><option value="">{draft.category?"Choose a "+draft.category+" item":"Select a repair category first"}</option>{repairs.map(value=><option key={value}>{value}</option>)}</select><small>Only choices from {draft.category||"the selected family"} are shown.</small></label>
    <label className="wide">ADDITIONAL REASON / DETAILS<textarea value={draft.customReason} onChange={event=>update("customReason",event.target.value)} placeholder="Optional details that are specific to this bus"/></label>
    <label>ASSIGNMENT TYPE<select value={draft.assignmentType} onChange={event=>update("assignmentType",event.target.value as AssignmentType)}><option>Mechanic</option><option>Vendor</option></select></label>
    <label>{draft.assignmentType.toUpperCase()} ASSIGNED<input value={draft.assignedTo} onChange={event=>update("assignedTo",event.target.value)} placeholder={draft.assignmentType==="Vendor"?"Vendor or company":"Mechanic name or initials"}/></label>
    <label>SCHEDULED SHIFT<select value={draft.shift} onChange={event=>update("shift",event.target.value as Shift)}><option>1st</option><option>2nd</option><option>3rd</option></select></label>
    <label>REPAIR WORKFLOW<select value={draft.workflow} onChange={event=>update("workflow",event.target.value as Workflow)}>{WORKFLOWS.map(value=><option key={value}>{value}</option>)}</select></label>
    <label>BUS STATUS ON TRACKER<select value={draft.operationalStatus} onChange={event=>update("operationalStatus",event.target.value as FleetStatus)}>{STATUS_OPTIONS.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select><small>This changes status only, never the parking location.</small></label>
    <label>PRIORITY<select value={draft.priority} onChange={event=>update("priority",event.target.value as DownSheetRecord["priority"])}><option>Routine</option><option>High</option><option>Critical</option></select></label>
    <label className="operator-initials">UPDATED BY — INITIALS<input required maxLength={6} autoCapitalize="characters" value={initials} onChange={event=>setInitials(event.target.value.replace(/[^a-z0-9]/gi,""))} placeholder="Initials"/><small>Required for every saved change.</small></label>
   </div>
   {draft.history.length>0&&<section className="repair-history editor-history"><b>RECENT CHANGE HISTORY</b>{draft.history.slice(-5).reverse().map((item,index)=><div key={item.at+index}><strong>{item.initials}</strong><span>{item.action}</span><time>{new Date(item.at).toLocaleString()}</time></div>)}</section>}
   <div className="repair-editor-actions"><button type="button" onClick={onClose}>CANCEL</button><button className="save-repair">{isNew?"ADD TO DOWN SHEET":"SAVE UPDATE"}</button></div>
  </form>
 </div>;
}
