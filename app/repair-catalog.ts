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
 completedBy?:string;
 conditionNotDuplicated?:boolean;
 reportedBy?:string;
 diagnosticNote?:string;
 actionTaken?:string;
 shopNotes?:string;
 partNumber?:string;
 reportedLocation?:string;
 defectLogHiddenAt?:string;
 symptoms?:string[];
 quantity?:number;
 unit?:string;
 source?:DefectSource;
};

export const REPAIR_OPTIONS:Record<string,string[]>={
 "A/C and HVAC":["No cooling","Compressor","Evaporator core","Condenser core","Blower motor","Refrigerant leak","Controls / electrical","Heater / defroster","Other A/C repair"],
 "Engine":["Check-engine diagnosis","Misfire","Loss of power","Stop engine light","Oil leak","Rear main seal","Coolant level sensor","Spark plugs","Valve adjustment","Abnormal noise","Engine replacement","Internal engine repair","Other engine repair"],
 "Cooling System":["Overheating","Coolant leak","Radiator leak","Radiator","Radiator fan(s) out","Radiator fan diagnostic light","Radiator fans constantly running on high","Water pump","Cooling fan","Hoses / fittings","Other cooling repair"],
 "Transmission":["Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Other transmission repair"],
 "Suspension":["Air bag","Shock / strut","Stabilizer link","Dogtracking","Leveling valve","Ride-height issue","Bus leaning - C/S","Bus leaning - R/S","Suspension leak","Bushing / linkage","Other suspension repair"],
 "Steering":["Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Other steering repair"],
 "Brakes":["Brake inspection","Front brake pads","Brake rotors","Rear shoes and drums","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Brake mod light","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Jump / boost bus","Battery replacement","Battery drain","No crank","Starter","Alternator / charging","Starting / charging diagnosis","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["Horn","MOD light","Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Bus Controls":["Turn signals (steering column)","Turn signals (floor panel)","Fuel gauge INOP / false reading","Speedometer","Other gauge / indicator","Front dash damage","Front instrument dash damaged / replacement","Kneeler button","Ramp power switch","Ramp deploy / stow switch","Front door open / close switch","Rear door open / close switch","Operator light","HVAC / heat controls","A/C control panel","Blower control","Pedal adjuster","Floor heat switch","Interior light controls","Start button","Red air valve hard to turn","High beams stay on","Switches broken / loose","Side control panel damage","Steering wheel tilt / telescoping","Driver seat belt","Driver seat leaking air","Driver seat will not lock","Driver seat adjustment / locking bar","Driver seat controls / buttons","Horn","Horn / seat alarm will not stop","Other bus control defect"],
 "Tech Services":["Farebox","Farebox won't lock","Ventra","IBS Screen","CUBIC Screen - BUS ER","CUBIC Screen - MV ER","Destination Sign","Other Tech Services"],
 "Amerex":["Fire Suppression - Trouble Mod 1 Roof 1","Fire Suppression - Trouble Mod 2 Roof 1","Fire Suppression - Other Fire Suppression Trouble","Gas Concentration - Trace","Gas Concentration - Significant Leak","Gas Concentration - Other Gas Concentration Alert"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "No Start":["No crank","Cranks / no start","Intermittent no start","Starting-system diagnosis","Fuel-related no start","Electrical no start","Other no-start diagnosis"],
 "Doors, Ramp and Lift":["Front door","Rear door","Wheelchair ramp","Kneeler","Wheelchair lift","Interlock","Door controls","Other accessibility repair"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signals","Interior lights","Warning lights","Outside rear view mirror - C/S","Outside rear view mirror - R/S","Mirrors / fixtures","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Bike rack - bent / replacement","Glass / windshield","Mirror","Paint","Interior body repair","Other bodywork"],
 "Air System":["Air leak","Air compressor","Air dryer","Air tank / valve","Builds air slowly","Air-system warning","Other air-system repair"],
 "Inspection":["A-6","A-15","B-12","B-18","C-24","Hub / Trans / Diff Refill (Three-Piece)","Spark Plug Refresh","Valve Adjustment","Valve Adjustment and Spark Plug Refresh"],
 "Preventive Maintenance":["Add engine oil","Oil and filter service","Lubrication","Bike rack - arms / pivot adjustment","Fluid service","Scheduled campaign","Seasonal preparation","Other preventive maintenance"],
 "Interior Cleaning":["Scheduled Cleaning","Cleaning Required"],
 "Miscellaneous":["Driver-reported defect","Roadcall follow-up","Cleaning / sanitation","Noise / vibration","Unknown diagnosis","Manual entry","Other repair"],
};

export const REPAIR_CATEGORY_EMOJI:Record<string,string>={
 "A/C and HVAC":"❄️",
 Engine:"⚙️",
 "Cooling System":"🌡️",
 Transmission:"🕹️",
 Suspension:"🛞",
 Steering:"🛞",
 Brakes:"🛑",
 "Tires and Wheels":"🛞",
 "Battery, Starting and Charging":"🔋",
 "Electrical / Multiplex":"⚡",
 "Bus Controls":"🎛️",
 "Tech Services":"🖥️",
 Amerex:"🧯",
 "Fuel Delivery":"⛽",
 "No Start":"🚫",
 "Doors, Ramp and Lift":"🚪",
 "Lights and Fixtures":"💡",
 Bodywork:"🚌",
 "Air System":"💨",
 Inspection:"🔍",
 "Preventive Maintenance":"🛠️",
 "Interior Cleaning":"🧽",
 Miscellaneous:"🔧",
};

export function repairCategoryLabel(category:string){return repairCategoryEmoji(category)+" "+category}

export function repairCategoryEmoji(category:string){return REPAIR_CATEGORY_EMOJI[category]||REPAIR_CATEGORY_EMOJI.Miscellaneous}

export const CHECK_ENGINE_SYMPTOMS=["Misfire","Loss of power","Stop engine light"] as const;

function normalizedSymptoms(value:unknown){
 if(!Array.isArray(value))return [];
 return [...new Set(value.map(item=>String(item).trim()).filter(Boolean))];
}

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
  const issue=defect.issue==="MDT Screen"?"IBS Screen":defect.issue||"Driver-reported defect",category=defect.category==="Operator Controls"?"Bus Controls":defect.category||"Miscellaneous";
  return {...defect,id:defect.id||identity+"-defect-"+index,category,issue,details:defect.details||"",operability:defect.operability==="down"?"down":"service",state,conditionNotDuplicated:Boolean(defect.conditionNotDuplicated),symptoms:normalizedSymptoms(defect.symptoms),quantity:typeof defect.quantity==="number"?defect.quantity:undefined} as StructuredDefect;
 });
 const legacy=legacyText.trim();
 return legacy?[{id:identity+"-legacy-defect",category:"Miscellaneous",issue:"Driver-reported defect",details:legacy,operability:"service",state:"open"}]:[];
}

export function isUnresolved(defect:StructuredDefect){return defect.state!=="completed"}
export function defectSupportingDetails(defect:StructuredDefect){
 const symptoms=normalizedSymptoms(defect.symptoms).filter(symptom=>symptom.toLowerCase()!==defect.issue.trim().toLowerCase()).join(", ");
 return [symptoms,defect.details.trim()].filter(Boolean).join(" — ");
}
export function defectLabel(defect:StructuredDefect){
 if(defect.issue.trim().toLowerCase()==="manual entry")return defect.details.trim();
 const quantity=typeof defect.quantity==="number"&&defect.quantity>0?defect.quantity+" "+(defect.unit||"quarts"):"";
 return [defect.category,defect.issue,quantity,defectSupportingDetails(defect)].map(value=>String(value).trim()).filter(Boolean).join(" — ")
}
export function defectSummary(defects:StructuredDefect[]){return defects.filter(isUnresolved).map(defectLabel).join("; ")}
