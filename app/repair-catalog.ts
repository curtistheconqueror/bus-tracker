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
 /* Stage 6 snapshot: what this specific repair used, kept on the record itself so
    later edits to the learned mapping never rewrite history. Attachments stay on
    PartUsage in domain.ts for Stage 7. */
 partsUsed?:boolean;
 partName?:string;
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
 "Transmission and Drivetrain":["Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Driveshaft noise / banging","Driveshaft","U-joints","Carrier bearing","Differential","Axle / axle shaft","Other transmission or drivetrain repair"],
 "Suspension and Steering":["Air bag","Shock / strut","Stabilizer link","Dogtracking","Leveling valve","Ride-height issue","Bus leaning - C/S","Bus leaning - R/S","Suspension leak","Bushing / linkage","Loose steering","Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Missing grease fitting (Zerk)","Grease fitting will not take grease","Other suspension or steering repair"],
 "Brakes":["Brake inspection","Front brake pads","Brake rotors","Rear shoes and drums","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Brake mod light","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Jump / boost bus","Battery replacement","Battery drain","No crank","Crank no start","Intermittent no start","Only front start","Only rear start","Starter","Solid battery light","Flashing battery light","Alternator / charging","Starting / charging diagnosis","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["MOD light","Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Bus Controls":["Driver Seat - Seat belt","Driver Seat - Leaking air","Driver Seat - Will not lock","Driver Seat - Adjustment / locking bar","Driver Seat - Controls / buttons","Gauges and Dash - Fuel gauge INOP / false reading","Gauges and Dash - Speedometer","Gauges and Dash - Other gauge / indicator","Gauges and Dash - Front dash damage","Gauges and Dash - Front instrument dash damaged / replacement","System Switches - Kneeler button","System Switches - Ramp power switch","System Switches - Ramp deploy / stow switch","System Switches - Front door open / close switch","System Switches - Rear door open / close switch","System Switches - HVAC / heat controls","System Switches - A/C control panel","System Switches - Blower control","System Switches - Floor heat switch","System Switches - Interior light controls","Operating Controls - Turn signals (steering column)","Operating Controls - Turn signals (floor panel)","Operating Controls - Start button","Operating Controls - Horn","Operating Controls - Horn / seat alarm will not stop","Operating Controls - High beams stay on","Operating Controls - Red air valve hard to turn","Operating Controls - Pedal adjuster","Operating Controls - Steering wheel tilt / telescoping","Operating Controls - Operator light","Operating Controls - Switches broken / loose","Operating Controls - Side control panel damage","Operating Controls - Other bus control defect"],
 "Tech Services":["Farebox","Farebox won't lock","Ventra","IBS Screen","CUBIC Screen - BUS ER","CUBIC Screen - MV ER","Destination Sign","Dash cam","Camera / DVR system","Other Tech Services"],
 "Amerex":["Fire Suppression - Trouble Mod 1 Roof 1","Fire Suppression - Trouble Mod 2 Roof 1","Fire Suppression - Other Fire Suppression Trouble","Gas Concentration - Trace","Gas Concentration - Significant Leak","Gas Concentration - Other Gas Concentration Alert"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "Doors, Ramp and ADA":["Doors - Front door","Doors - Rear door","Doors - Door controls","Doors - Interlock","Doors - Other door defect","Ramp, Lift and Kneeler - Wheelchair ramp","Ramp, Lift and Kneeler - Ramp will not deploy","Ramp, Lift and Kneeler - Ramp will not stow","Ramp, Lift and Kneeler - Kneeler","Ramp, Lift and Kneeler - Wheelchair lift","Ramp, Lift and Kneeler - Other ramp, lift or kneeler defect","Wheelchair Securement - Q'STRAINT switch (curbside)","Wheelchair Securement - Q'STRAINT switch (roadside)","Wheelchair Securement - Securement straps / retractor (curbside)","Wheelchair Securement - Securement straps / retractor (roadside)","Wheelchair Securement - Flip-up bench seat (curbside)","Wheelchair Securement - Flip-up bench seat (roadside)","Wheelchair Securement - Occupant lap / shoulder belt","Wheelchair Securement - Other securement defect","Stop Request - Stop request (wheelchair area)","Stop Request - Stop request (curbside)","Stop Request - Stop request (roadside)","Stop Request - Stop request chime / tone","Stop Request - Stop request sign / light","Stop Request - Other stop request defect"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signal lamps","Interior lights","Back-up alarm","Outside rear view mirror - C/S","Outside rear view mirror - R/S","Interior mirror","Mirror replacement (no body work)","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Bike rack - bent / replacement","Glass / windshield cracked or shattered","Mirror damage (body shop)","Paint","Interior body repair","Other bodywork"],
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
 "Transmission and Drivetrain":"🕹️",
 Suspension:"🛞",
 Steering:"🛞",
 "Suspension and Steering":"🛞",
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
 "Doors, Ramp and ADA":"♿",
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

/* Wording for the two-step picker a grouped category needs. Amerex keeps the
   language the shop already reads off the panel; every other grouped category
   (Bus Controls today) gets the plain version. Both native pickers call these,
   so the bus editor and the multi-bus tool cannot drift apart again. */
export function repairGroupStepLabel(category:string){
 return category==="Amerex"?"CHOOSE THE AMEREX SYSTEM":"CHOOSE THE GROUP";
}
export function repairGroupPlaceholder(category:string){
 if(category==="Amerex")return "Choose Fire Suppression or Gas Concentration";
 return "Choose one of "+Object.keys(REPAIR_OPTION_GROUPS[category]||{}).length+" groups";
}
export function repairIssueStepLabel(category:string){
 return category==="Amerex"?"CHOOSE THE STATUS OR CODE":"CHOOSE THE DEFECT";
}
export function repairIssuePlaceholder(category:string,group:string){
 return category==="Amerex"?"Choose an Amerex status or code":"Choose a defect in "+group;
}

/* ADA equipment is spread across more than one category on purpose: the ramp is
   in Doors, Ramp and ADA, the switch that runs it is in Bus Controls where the
   operator reaches it. The chair mark restores the connection at a glance
   without moving anything. It is display only. Stored values keep their plain
   text, so nothing already logged has to be rewritten to gain the mark, and a
   record still reads the same in the feed, an export, or a Down Sheet line. */
export const ADA_MARK="♿ ";
const ADA_GROUPS=new Set(["Ramp, Lift and Kneeler","Wheelchair Securement"]);
const ADA_ISSUE=/wheelchair|kneeler|q'straint|securement|\bramp\b/i;

export function repairGroupDisplayLabel(group:string){
 return ADA_GROUPS.has(group)?ADA_MARK+group:group;
}
/* Inside a group that already carries the mark every option would repeat it, so
   the group speaks for its contents and the options stay clean. */
export function repairIssueDisplayLabel(issue:string,group=""){
 if(ADA_GROUPS.has(group))return issue;
 return ADA_ISSUE.test(issue)?ADA_MARK+issue:issue;
}

export const CHECK_ENGINE_SYMPTOMS=["Misfire","Loss of power","Stop engine light"] as const;

function normalizedSymptoms(value:unknown){
 if(!Array.isArray(value))return [];
 return [...new Set(value.map(item=>String(item).trim()).filter(Boolean))];
}

export const REPAIR_OPTION_GROUPS:Record<string,Record<string,string[]>>={
 "Bus Controls":{
  "Driver Seat":["Seat belt","Leaking air","Will not lock","Adjustment / locking bar","Controls / buttons"],
  "Gauges and Dash":["Fuel gauge INOP / false reading","Speedometer","Other gauge / indicator","Front dash damage","Front instrument dash damaged / replacement"],
  "System Switches":["Kneeler button","Ramp power switch","Ramp deploy / stow switch","Front door open / close switch","Rear door open / close switch","HVAC / heat controls","A/C control panel","Blower control","Floor heat switch","Interior light controls"],
  "Operating Controls":["Turn signals (steering column)","Turn signals (floor panel)","Start button","Horn","Horn / seat alarm will not stop","High beams stay on","Red air valve hard to turn","Pedal adjuster","Steering wheel tilt / telescoping","Operator light","Switches broken / loose","Side control panel damage","Other bus control defect"],
 },
 /* Everything a rider touches or rides in. Bus Controls stays the driver's
    station; a strap or a stop request cord is not something the operator
    reaches from the seat, so it is found here instead. Curbside and roadside
    are called out because each side is a separate unit that fails on its own. */
 "Doors, Ramp and ADA":{
  "Doors":["Front door","Rear door","Door controls","Interlock","Other door defect"],
  "Ramp, Lift and Kneeler":["Wheelchair ramp","Ramp will not deploy","Ramp will not stow","Kneeler","Wheelchair lift","Other ramp, lift or kneeler defect"],
  "Wheelchair Securement":["Q'STRAINT switch (curbside)","Q'STRAINT switch (roadside)","Securement straps / retractor (curbside)","Securement straps / retractor (roadside)","Flip-up bench seat (curbside)","Flip-up bench seat (roadside)","Occupant lap / shoulder belt","Other securement defect"],
  "Stop Request":["Stop request (wheelchair area)","Stop request (curbside)","Stop request (roadside)","Stop request chime / tone","Stop request sign / light","Other stop request defect"],
 },
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
/* Categories and options that were merged away. Records are never dropped or
   rewritten in storage: they are moved to their surviving home as they are read,
   so a defect logged under the old No Start category still opens, filters, and
   reports exactly as before. An issue with no clean equivalent keeps its wording. */
const LEGACY_CATEGORY_RENAMES:Record<string,string>={"Operator Controls":"Bus Controls","No Start":"Battery, Starting and Charging","Suspension":"Suspension and Steering","Steering":"Suspension and Steering","Doors, Ramp and Lift":"Doors, Ramp and ADA","Transmission":"Transmission and Drivetrain"};
const LEGACY_ISSUE_RENAMES:Record<string,string>={"MDT Screen":"IBS Screen"};
/* Bus Controls now picks a group first, so a bare issue moves to its group. */
const BUS_CONTROL_ISSUE_GROUPS:Record<string,string>={
 "A/C control panel":"System Switches - A/C control panel",
 "Adjustment / locking bar":"Driver Seat - Adjustment / locking bar",
 "Blower control":"System Switches - Blower control",
 "Controls / buttons":"Driver Seat - Controls / buttons",
 "Driver seat adjustment / locking bar":"Driver Seat - Adjustment / locking bar",
 "Driver seat belt":"Driver Seat - Seat belt",
 "Driver seat controls / buttons":"Driver Seat - Controls / buttons",
 "Driver seat leaking air":"Driver Seat - Leaking air",
 "Driver seat will not lock":"Driver Seat - Will not lock",
 "Floor heat switch":"System Switches - Floor heat switch",
 "Front dash damage":"Gauges and Dash - Front dash damage",
 "Front door open / close switch":"System Switches - Front door open / close switch",
 "Front instrument dash damaged / replacement":"Gauges and Dash - Front instrument dash damaged / replacement",
 "Fuel gauge INOP / false reading":"Gauges and Dash - Fuel gauge INOP / false reading",
 "HVAC / heat controls":"System Switches - HVAC / heat controls",
 "High beams stay on":"Operating Controls - High beams stay on",
 "Horn":"Operating Controls - Horn",
 "Horn / seat alarm will not stop":"Operating Controls - Horn / seat alarm will not stop",
 "Interior light controls":"System Switches - Interior light controls",
 "Kneeler button":"System Switches - Kneeler button",
 "Leaking air":"Driver Seat - Leaking air",
 "Operator light":"Operating Controls - Operator light",
 "Other bus control defect":"Operating Controls - Other bus control defect",
 "Other gauge / indicator":"Gauges and Dash - Other gauge / indicator",
 "Pedal adjuster":"Operating Controls - Pedal adjuster",
 "Ramp deploy / stow switch":"System Switches - Ramp deploy / stow switch",
 "Ramp power switch":"System Switches - Ramp power switch",
 "Rear door open / close switch":"System Switches - Rear door open / close switch",
 "Red air valve hard to turn":"Operating Controls - Red air valve hard to turn",
 "Seat belt":"Driver Seat - Seat belt",
 "Side control panel damage":"Operating Controls - Side control panel damage",
 "Speedometer":"Gauges and Dash - Speedometer",
 "Start button":"Operating Controls - Start button",
 "Steering wheel tilt / telescoping":"Operating Controls - Steering wheel tilt / telescoping",
 "Switches broken / loose":"Operating Controls - Switches broken / loose",
 "Turn signals (floor panel)":"Operating Controls - Turn signals (floor panel)",
 "Turn signals (steering column)":"Operating Controls - Turn signals (steering column)",
 "Will not lock":"Driver Seat - Will not lock",
};
const NO_START_ISSUE_MOVES:Record<string,string>={
 "Cranks / no start":"Crank no start",
 "Starting-system diagnosis":"Starting / charging diagnosis",
 "Other no-start diagnosis":"Other starting or charging repair",
};
/* Renames that only apply inside one category, because the same word means
   different work depending on where it was logged. A mirror in Lights and
   Fixtures is a swap the mechanic does; a mirror in Bodywork is the body shop's
   job. The wording now says which, so the two stop looking like duplicates. */
const CATEGORY_ISSUE_RENAMES:Record<string,Record<string,string>>={
 "Lights and Fixtures":{
  /* The lamps, not the stalk. Bus Controls owns the turn signal switches. */
  "Turn signals":"Turn signal lamps",
  "Mirrors / fixtures":"Mirror replacement (no body work)",
 },
 "Transmission and Drivetrain":{
  "Other transmission repair":"Other transmission or drivetrain repair",
 },
 "Bodywork":{
  "Mirror":"Mirror damage (body shop)",
  "Glass / windshield":"Glass / windshield cracked or shattered",
 },
};
/* Doors, Ramp and Lift picks a group first now, so its bare issues move too. */
const DOOR_RAMP_ISSUE_GROUPS:Record<string,string>={
 "Door controls":"Doors - Door controls",
 "Front door":"Doors - Front door",
 "Interlock":"Doors - Interlock",
 "Kneeler":"Ramp, Lift and Kneeler - Kneeler",
 "Ramp will not deploy":"Ramp, Lift and Kneeler - Ramp will not deploy",
 "Ramp will not stow":"Ramp, Lift and Kneeler - Ramp will not stow",
 "Rear door":"Doors - Rear door",
 "Wheelchair lift":"Ramp, Lift and Kneeler - Wheelchair lift",
 "Wheelchair ramp":"Ramp, Lift and Kneeler - Wheelchair ramp",
};

export function migrateRepairIdentity(rawCategory:unknown,rawIssue:unknown){
 const startedIn=String(rawCategory||"");
 let issue=String(rawIssue||"")||"Driver-reported defect";
 if(LEGACY_ISSUE_RENAMES[issue])issue=LEGACY_ISSUE_RENAMES[issue];
 if(startedIn==="No Start")issue=NO_START_ISSUE_MOVES[issue]||issue;
 let category=LEGACY_CATEGORY_RENAMES[startedIn]||startedIn||"Miscellaneous";
 /* Horn is reported off the operator's controls, so Bus Controls keeps it. */
 if(category==="Electrical / Multiplex"&&issue==="Horn")category="Bus Controls";
 if(category==="Suspension and Steering"&&issue==="Other steering repair")issue="Other suspension or steering repair";
 if(category==="Suspension and Steering"&&issue==="Other suspension repair")issue="Other suspension or steering repair";
 if(category==="Bus Controls")issue=BUS_CONTROL_ISSUE_GROUPS[issue]||issue;
 if(category==="Doors, Ramp and ADA")issue=DOOR_RAMP_ISSUE_GROUPS[issue]||issue;
 issue=CATEGORY_ISSUE_RENAMES[category]?.[issue]||issue;
 return {category,issue};
}

export function normalizeDefects(value:unknown,legacyText="",identity="bus"):StructuredDefect[]{
 if(Array.isArray(value))return value.filter(item=>item&&typeof item==="object").map((item,index)=>{
  const defect=item as Partial<StructuredDefect>;
  const state:DefectState=defect.state==="completed"?"completed":defect.state==="deferred"?"deferred":defect.state==="in-progress"?"in-progress":"open";
   const {category,issue}=migrateRepairIdentity(defect.category,defect.issue);
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
