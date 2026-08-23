export type DefectState="open"|"in-progress"|"deferred"|"completed";
export type DefectOperability="service"|"down";
export type DefectSource="tracker"|"down-sheet"|"defect-log"|"operator"|"scan";

export type StructuredDefect={
 id:string;
 category:string;
 issue:string;
 details:string;
 operability:DefectOperability;
 state:DefectState;
 createdAt?:string;
 updatedAt?:string;
 completedAt?:string;
 reportedBy?:string;
 diagnosticNote?:string;
 actionTaken?:string;
 shopNotes?:string;
 partNumber?:string;
 reportedLocation?:string;
 defectLogHiddenAt?:string;
 quantity?:number;
 unit?:string;
 source?:DefectSource;
};

export const REPAIR_OPTIONS:Record<string,string[]>={
 "A/C and HVAC":["No cooling","Compressor","Evaporator core","Condenser core","Blower motor","Refrigerant leak","Controls / electrical","Heater / defroster","Other A/C repair"],
 "Engine":["Check-engine diagnosis","Loss of power","Oil leak","Rear main seal","Spark plugs","Valve adjustment","Abnormal noise","Engine replacement","Internal engine repair","Other engine repair"],
 "Cooling System":["Overheating","Coolant leak","Radiator","Water pump","Cooling fan","Hoses / fittings","Other cooling repair"],
 "Transmission":["Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Other transmission repair"],
 "Suspension":["Air bag","Shock / strut","Ride-height issue","Suspension leak","Bushing / linkage","Other suspension repair"],
 "Steering":["Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Other steering repair"],
 "Brakes":["Brake inspection","Front brake pads","Brake rotors","Rear shoes and drums","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Jump / boost bus","Battery replacement","Battery drain","No crank","Starter","Alternator / charging","Starting / charging diagnosis","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["Horn","MOD light","Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Tech Services":["Farebox","Ventra","MDT Screen","Destination Sign","Other Tech Services"],
 "Amerex":["Fire Suppression - Trouble Mod 1 Roof 1","Fire Suppression - Trouble Mod 2 Roof 1","Fire Suppression - Other Fire Suppression Trouble","Gas Concentration - Trace","Gas Concentration - Significant Leak","Gas Concentration - Other Gas Concentration Alert"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "No Start":["No crank","Cranks / no start","Intermittent no start","Starting-system diagnosis","Fuel-related no start","Electrical no start","Other no-start diagnosis"],
 "Doors, Ramp and Lift":["Front door","Rear door","Wheelchair ramp","Wheelchair lift","Interlock","Door controls","Other accessibility repair"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signals","Interior lights","Warning lights","Mirrors / fixtures","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Glass / windshield","Mirror","Paint","Interior body repair","Other bodywork"],
 "Air System":["Air leak","Air compressor","Air dryer","Air tank / valve","Builds air slowly","Air-system warning","Other air-system repair"],
 "Inspection":["A-6","A-15","B-12","B-18","C-24","Hub / Trans / Diff Refill (Three-Piece)","Spark Plug Refresh","Valve Adjustment","Valve Adjustment and Spark Plug Refresh"],
 "Preventive Maintenance":["Add engine oil","Oil and filter service","Lubrication","Fluid service","Scheduled campaign","Seasonal preparation","Other preventive maintenance"],
 "Interior Cleaning":["Scheduled Cleaning","Cleaning Required"],
 "Miscellaneous":["Driver-reported defect","Roadcall follow-up","Cleaning / sanitation","Noise / vibration","Unknown diagnosis","Manual entry","Other repair"],
};

export const REPAIR_OPTION_GROUPS:Record<string,Record<string,string[]>>={
 "Amerex":{
  "Fire Suppression":["Trouble Mod 1 Roof 1","Trouble Mod 2 Roof 1","Other Fire Suppression Trouble"],
  "Gas Concentration":["Trace","Significant Leak","Other Gas Concentration Alert"],
 },
};
export function defectFromDraft(draft:Omit<StructuredDefect,"id">,mode:"select"|"manual",id="defect-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)):StructuredDefect|null{
 const manual=mode==="manual",details=draft.details.trim(),category=manual?"Miscellaneous":draft.category,issue=manual?"Manual entry":draft.issue;
 if(!category||!issue||manual&&!details)return null;
 const now=new Date().toISOString();
 return {...draft,id,category,issue,details,createdAt:draft.createdAt||now,updatedAt:now,source:draft.source||"tracker"};
}
export function defaultDefectOperability(category:string,issue:string):DefectOperability{
 return category==="Interior Cleaning"&&issue==="Cleaning Required"?"down":"service";
}
export function normalizeDefects(value:unknown,legacyText="",identity="bus"):StructuredDefect[]{
 if(Array.isArray(value))return value.filter(item=>item&&typeof item==="object").map((item,index)=>{
  const defect=item as Partial<StructuredDefect>;
  const state:DefectState=defect.state==="completed"?"completed":defect.state==="deferred"?"deferred":defect.state==="in-progress"?"in-progress":"open";
  return {id:defect.id||identity+"-defect-"+index,category:defect.category||"Miscellaneous",issue:defect.issue||"Driver-reported defect",details:defect.details||"",operability:defect.operability==="down"?"down":"service",state,createdAt:defect.createdAt,updatedAt:defect.updatedAt,completedAt:defect.completedAt,reportedBy:defect.reportedBy,diagnosticNote:defect.diagnosticNote,actionTaken:defect.actionTaken,shopNotes:defect.shopNotes,partNumber:defect.partNumber,reportedLocation:defect.reportedLocation,quantity:typeof defect.quantity==="number"?defect.quantity:undefined,unit:defect.unit,defectLogHiddenAt:defect.defectLogHiddenAt,source:defect.source};
 });
 const legacy=legacyText.trim();
 return legacy?[{id:identity+"-legacy-defect",category:"Miscellaneous",issue:"Driver-reported defect",details:legacy,operability:"service",state:"open"}]:[];
}

export function isUnresolved(defect:StructuredDefect){return defect.state!=="completed"}
export function defectLabel(defect:StructuredDefect){
 if(defect.issue.trim().toLowerCase()==="manual entry")return defect.details.trim();
 const quantity=typeof defect.quantity==="number"&&defect.quantity>0?defect.quantity+" "+(defect.unit||"quarts"):"";
 return [defect.category,defect.issue,quantity,defect.details].map(value=>String(value).trim()).filter(Boolean).join(" — ")
}
export function defectSummary(defects:StructuredDefect[]){return defects.filter(isUnresolved).map(defectLabel).join("; ")}
