export type DefectState="open"|"in-progress"|"deferred"|"completed";
export type DefectOperability="service"|"down";
export type DefectSource="tracker"|"down-sheet"|"defect-log"|"operator"|"scan";

/* How far a repair has got before it is fixed. "Open" and "completed" are the
   only two things the record could say until now, and between them sits most
   of a shop week: a bus looked at, a fault found, a part waiting on the truck.

   Three states and no more. A fourth invites two mechanics to tick different
   boxes for the same job, and a state can be added later far more safely than
   one already written onto records can be taken away. "Diagnosed" deliberately
   covers a check-engine code and a multiplex fault alike: on the floor both
   mean somebody found the cause and it is not fixed yet. */
export type WorkStateKey="inspected"|"diagnosed"|"parts-on-order";
export type WorkStateStamp={at?:string;by?:string};
export const WORK_STATES:{key:WorkStateKey;label:string;short:string;hint:string}[]=[
 {key:"inspected",label:"INSPECTED",short:"INSP",hint:"Looked at, nothing found yet"},
 {key:"diagnosed",label:"DIAGNOSED",short:"DIAG",hint:"Cause found, not fixed yet"},
 {key:"parts-on-order",label:"PARTS ON ORDER",short:"PARTS",hint:"Waiting on a part to arrive"},
];
export const WORK_STATE_KEYS=WORK_STATES.map(state=>state.key);

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
 /* Billable time on this repair, in decimal hours: .5 is half an hour.
    Diagnostic time is kept apart from repair time because they are different
    work and often different visits. A bus can be diagnosed on one shift and
    fixed on another, or diagnosed and handed on without being fixed at all, and
    a single figure would lose that. Both are optional, and blank means no time
    recorded rather than none spent. */
 repairHours?:number;
 diagnosticHours?:number;
 /* An absent key means not ticked. The stamp carries who and when, filled in
    where the settings ask for initials and left empty where they do not. */
 workStates?:Partial<Record<WorkStateKey,WorkStateStamp>>;
 /* Present means somebody has put this repair forward for the Down Sheet.
    Separate from actual Down Sheet membership, which lives in the Down Sheet's
    own records: this is the ask, not the answer. */
 downSheetRecommendation?:WorkStateStamp;
 /* What the diagnosis actually turned up, in the mechanic's own words, when
    the cause is not something the picker could ever have listed: a throttle
    pedal reference circuit, a chafed pin. Free text on purpose, and it travels
    into the label, so the Down Sheet and Fixed Repairs read the finding and
    not only the symptom that was reported. */
 finding?:string;
 reportedLocation?:string;
 defectLogHiddenAt?:string;
 symptoms?:string[];
 quantity?:number;
 unit?:string;
 source?:DefectSource;
};

export const REPAIR_OPTIONS:Record<string,string[]>={
 "A/C and HVAC":["No cooling","Compressor","A/C belt","A/C compressor pulley misaligned","Evaporator core","Condenser core","Blower motor","Operator A/C blower","Refrigerant leak","Controls / electrical","Heater / defroster","Other A/C repair"],
 "Engine":["Check engine light","Stop engine light","Check engine and stop engine light","Engine runs hot (207F+)","Overheating","Overheat shutdown (235-240F)","Coolant leak","Misfire","Loss of power","Oil leak","Rear main seal","Coolant level sensor","Water pump belt","Alternator belt","Water pump pulley","Tensioner pulley","Fan drive pulley","Spark plugs","Valve adjustment","Abnormal noise","Engine replacement","Internal engine repair","Other engine repair"],
 "Cooling System":["Overheating","Coolant leak","Surge tank - engine side low","Surge tank - heating side low","Surge tank - both sides low","Radiator leak","Radiator","Radiator fan(s) out","Radiator fan diagnostic light","Radiator fans constantly running on high","Water pump","Cooling fan","Hoses / fittings","Other cooling repair"],
 "Transmission and Drivetrain":["Check transmission light","Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Driveshaft noise / banging","Driveshaft","U-joints","Carrier bearing","Differential","Axle / axle shaft","Other transmission or drivetrain repair"],
 "Suspension and Steering":["NVH (noise, vibration, harshness)","Shock / strut","Stabilizer link","Dogtracking","Leveling valve","Ride-height issue","Bus leaning - C/S","Bus leaning - R/S","Suspension leak","Bushing / linkage","Loose steering","Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Missing grease fitting (Zerk)","Grease fitting will not take grease","Other suspension or steering repair"],
 "Brakes":["Brake inspection","Front brake pads","Brake rotors","Rear shoes and drums","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Brake mod light","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Jump / boost bus","Battery replacement","Battery drain","Voltage regulator","Alternator failure","No crank","Crank no start","Intermittent no start","Front start INOP","Rear start INOP","Starter","Solid battery light","Flashing battery light","Starting / charging diagnosis","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["MOD light","Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Bus Controls":["Door, Ramp and Kneeler Failures - Front door will not open","Door, Ramp and Kneeler Failures - Front door will not close","Door, Ramp and Kneeler Failures - Front door opens / closes slowly","Door, Ramp and Kneeler Failures - Rear door will not open","Door, Ramp and Kneeler Failures - Rear door will not close","Door, Ramp and Kneeler Failures - Rear door opens / closes slowly","Door, Ramp and Kneeler Failures - Ramp not working","Door, Ramp and Kneeler Failures - Ramp no power","Door, Ramp and Kneeler Failures - Kneeler not functioning correctly","Door, Ramp and Kneeler Failures - Kneeler sits too high","Driver Seat - Seat belt","Driver Seat - Leaking air","Driver Seat - Will not lock","Driver Seat - Adjustment / locking bar","Driver Seat - Controls / buttons","Gauges and Dash - Fuel gauge INOP / false reading","Gauges and Dash - Speedometer","Gauges and Dash - Other gauge / indicator","Gauges and Dash - Front dash damage","Gauges and Dash - Front instrument dash damaged / replacement","System Switches - Kneeler button","System Switches - Ramp power switch","System Switches - Ramp deploy / stow switch","System Switches - Front door open / close switch","System Switches - Rear door open / close switch","System Switches - HVAC / heat controls","System Switches - A/C control panel","System Switches - Blower control","System Switches - Floor heat switch","System Switches - Interior light controls","System Switches - Mirror heater switch","System Switches - C/S adjuster switch","Operating Controls - Turn signals (steering column)","Operating Controls - Turn signals (floor panel)","Operating Controls - Start button","Operating Controls - Horn","Operating Controls - Horn / seat alarm will not stop","Operating Controls - High beams stay on","Operating Controls - Red air valve hard to turn","Operating Controls - Parking brake knob will not pull up (apply)","Operating Controls - Parking brake knob will not push down (release)","Operating Controls - Parking brake knob hard to pull or push","Operating Controls - Parking brake knob pops out while driving","Operating Controls - Pedal adjuster","Operating Controls - Steering wheel tilt / telescoping","Operating Controls - Operator light","Operating Controls - Switches broken / loose","Operating Controls - Side control panel damage","Operating Controls - Other bus control defect"],
 "Tech Services":["Farebox","Farebox won't lock","Ventra","IBS Screen","CUBIC Screen - BUS ER","CUBIC Screen - MV ER","Destination Sign","Dash cam","Camera / DVR system","Other Tech Services"],
 "Amerex":["Fire Suppression - FIRE alarm (system discharged)","Fire Suppression - Heat sensor communication fault","Fire Suppression - Trouble Mod 1 Roof 1","Fire Suppression - Trouble Mod 2 Roof 1","Fire Suppression - Control head no power","Fire Suppression - Other Fire Suppression Trouble","Gas Concentration - Trace","Gas Concentration - Significant Leak","Gas Concentration - Other Gas Concentration Alert","CNG - Check CNG valves light","CNG - PRD cap missing","CNG - PRD leaking","CNG - Other CNG defect"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "Doors, Ramp and ADA":["Doors - Front door","Doors - Rear door","Doors - Door controls","Doors - Interlock","Doors - Other door defect","Ramp, Lift and Kneeler - Wheelchair ramp","Ramp, Lift and Kneeler - Ramp will not deploy","Ramp, Lift and Kneeler - Ramp will not stow","Ramp, Lift and Kneeler - Kneeler","Ramp, Lift and Kneeler - Wheelchair lift","Ramp, Lift and Kneeler - Other ramp, lift or kneeler defect","Wheelchair Securement - Q'STRAINT switch (curbside)","Wheelchair Securement - Q'STRAINT switch (roadside)","Wheelchair Securement - Securement straps / retractor (curbside)","Wheelchair Securement - Securement straps / retractor (roadside)","Wheelchair Securement - Flip-up bench seat (curbside)","Wheelchair Securement - Flip-up bench seat (roadside)","Wheelchair Securement - Occupant lap / shoulder belt","Wheelchair Securement - Other securement defect","Stop Request - Stop request (wheelchair area)","Stop Request - Stop request (curbside)","Stop Request - Stop request (roadside)","Stop Request - Stop request pull cord / line - broken (curbside)","Stop Request - Stop request pull cord / line - broken (roadside)","Stop Request - Stop request chime / tone","Stop Request - Stop request sign / light","Stop Request - Other stop request defect"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signal lamps","Interior lights","Back-up alarm","Outside rear view mirror - C/S","Outside rear view mirror - R/S","Interior mirror","Mirror replacement (no body work)","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Bike rack - bent / replacement","Glass / windshield cracked or shattered","Mirror damage (body shop)","Interior advertising panel / ad card rack - loose or hanging (C/S)","Interior advertising panel / ad card rack - loose or hanging (R/S)","Passenger seat - loose","Passenger seat - missing","Passenger seat - damaged","Passenger assist handle / hanging strap - loose or broken","Passenger grab rail / stanchion - loose or damaged","Paint","Interior body repair","Other bodywork"],
 "Air System":["Air leak","Leaking air bag - Front C/S","Leaking air bag - Front R/S","Leaking air bag - Rear","Air compressor","Air dryer","Air tank / valve","Treadle valve (brake pedal)","R-12 relay valve (C/S rear)","R-14 relay valve (R/S rear)","Builds air slowly","Air-system warning","Other air-system repair"],
 "Inspection":["A-6","A-15","B-12","B-18","C-24","Hub / Trans / Diff Refill (Three-Piece)","Spark Plug Refresh","Valve Adjustment","Valve Adjustment and Spark Plug Refresh"],
 "Preventive Maintenance":["Add engine oil","Oil and filter service","Lubrication","Bike rack - arms / pivot adjustment","Fluid service","Scheduled campaign","Seasonal preparation","Other preventive maintenance"],
 "Interior Cleaning":["Scheduled Cleaning","Cleaning Required"],
 "Miscellaneous":["Missing road hazard triangles (3 required)","Fire extinguisher missing","Driver-reported defect","Roadcall follow-up","Cleaning / sanitation","Noise / vibration","Unknown diagnosis","Manual entry","Other repair"],
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
 return category==="Amerex"?"CHOOSE THE SYSTEM":"CHOOSE THE GROUP";
}
/* Read out rather than counted where a category has few enough groups to name.
   Derived from the groups themselves: this line used to name its two in a
   literal, and adding a third would have left the picker telling a mechanic to
   choose between two of the three options in front of them. */
function namedGroups(names:string[]){
 if(names.length<2)return names[0]||"";
 return names.slice(0,-1).join(", ")+" or "+names[names.length-1];
}
export function repairGroupPlaceholder(category:string){
 const groups=Object.keys(REPAIR_OPTION_GROUPS[category]||{});
 if(category==="Amerex")return "Choose "+namedGroups(groups);
 return "Choose one of "+groups.length+" groups";
}
export function repairIssueStepLabel(category:string){
 return category==="Amerex"?"CHOOSE THE STATUS OR DEFECT":"CHOOSE THE DEFECT";
}
/* Named by its group now that the category holds CNG equipment as well as panel
   codes: "an Amerex status or code" was wrong for a missing PRD cap. */
export function repairIssuePlaceholder(category:string,group:string){
 return category==="Amerex"?"Choose a "+(group||"system")+" status or defect":"Choose a defect in "+group;
}

/* ADA equipment is available through more than one operator path on purpose:
   Doors, Ramp and ADA remains its full equipment home, while Bus Controls leads
   with the frequent whole-system door, ramp, and kneeler failures and keeps the
   switches separate. The chair mark restores the connection at a glance without
   moving or rewriting anything. Stored values remain plain text, so existing
   records keep reading the same in feeds, exports, and Down Sheet lines. */
export const ADA_MARK="♿ ";
export const ADA_MECHANICAL_MARK="♿ ⚙️ ";
const ADA_GROUPS=new Set(["Door, Ramp and Kneeler Failures","Ramp, Lift and Kneeler","Wheelchair Securement"]);
const ADA_ISSUE=/wheelchair|kneeler|q'straint|securement|\bramp\b/i;
const ISSUE_DISPLAY_MARKS:Record<string,string>={"Fire extinguisher missing":"🧯 "};

/* What somebody standing at the bus needs to know at the moment they pick this
   defect, rather than what a manual would say about it afterwards.

   Kept deliberately short and deliberately rare. A note on every entry is a
   wall of text nobody reads, which is worse than none: these are the few where
   the obvious repair is not the whole job, or where what looks like a fix is
   really a way of moving the bus. */
const DEFECT_NOTES:Record<string,Record<string,string>>={
 "A/C and HVAC":{
  "A/C compressor pulley misaligned":"Lay a straight edge across the crank pulley and the compressor pulley before you order a belt. A pulley out of line is what eats belts, so a belt fitted to a misaligned pulley comes back. Note in the description how far out and which way.",
 },
 /* The surge tank on the 17s, 18s and 20s is split, and the two halves do not
    talk to each other. Somebody who does not know that tops up the side they
    can see and walks away from a bus that will have no heat in December. */
 "Cooling System":{
  "Surge tank - heating side low":"This side feeds cabin heat only, and it is independent of the engine side — a full engine side says nothing about this one. Empty here means no cabin heat when the weather turns. The winter list is QUICK FILTERS → No Heat Buses.",
  "Surge tank - both sides low":"Two halves that cannot drain into each other went down together, which points at a leak somewhere they share rather than two separate ones. Worth finding before either side is topped up again.",
 },
 "Suspension and Steering":{
  "NVH (noise, vibration, harshness)":"Say where and when in the description: front or rear, curbside or roadside, turning or straight, and at what speed. A vibration at 45 straight and a clunk on a left turn are different repairs, and the noise itself is rarely where the fault is.",
  "Bus leaning - C/S":"A leaning bus is commonly caused by a leaking air bag or a leveling-valve fault. Note the affected end in the description. Once confirmed, edit this same defect to the exact Air System air-bag leak or Leveling valve repair so the history and replacement count stay together.",
  "Bus leaning - R/S":"A leaning bus is commonly caused by a leaking air bag or a leveling-valve fault. Note the affected end in the description. Once confirmed, edit this same defect to the exact Air System air-bag leak or Leveling valve repair so the history and replacement count stay together.",
 },
 "Amerex":{
  "CNG - PRD cap missing":"Check for a leak before you close this out. Fit a balloon over the vent and watch whether it inflates: the cap being gone can mean gas has been venting past it. If it inflates, log PRD leaking as well.",
  "CNG - PRD leaking":"Confirmed gas escaping from a pressure relief device. This starts as Remove From Service.",
  "Gas Concentration - Significant Leak":"Red on the panel, and this normally puts the bus down. Holding Relay Reset will move it under its own power, but that is getting it off the road, not clearing the fault.",
  "Gas Concentration - Trace":"Amber on the panel. The system can smell something and the bus keeps running while somebody finds it.",
  "Fire Suppression - FIRE alarm (system discharged)":"The system fires on its own with no operator input, so this means the bottles have already gone off. The bus does not move until it is recharged and inspected.",
 },
};
export function defectNote(category:unknown,issue:unknown){
 const moved=migrateRepairIdentity(String(category??"").trim(),String(issue??"").trim());
 return DEFECT_NOTES[moved.category]?.[moved.issue]||"";
}

/* A number that belongs to the repair itself rather than to its description.
   Radiator fans are reported as a count still out; air bags are recorded as a
   count replaced, because the leak shows at one corner while the bags come off
   in pairs, and "how many went on" is the fact nobody can reconstruct later
   from the words.

   Kept as a table so a counted repair is declared beside the defect it belongs
   to, rather than hard-coded into each of the three forms that have to draw the
   field. The ceiling is the axle's, not the bus's: two across the front and
   four across the rear. */
export type DefectCountField={label:string;unit:string;max:number;required:boolean;prompt:string};
const airBagCount=(max:number):DefectCountField=>({label:"AIR BAGS REPLACED",unit:"replaced",max,required:false,prompt:"Optional — how many went on"});
const coolantAdded:DefectCountField={label:"COOLANT ADDED",unit:"quarts",max:12,required:false,prompt:"Optional — quarts added"};
const DEFECT_COUNT_FIELDS:Record<string,Record<string,DefectCountField>>={
 "Cooling System":{
  "Radiator fan(s) out":{label:"FANS OUT",unit:"fans",max:8,required:true,prompt:"Select 1 through 8"},
  /* How much a tank drinks is the only measure of how fast it is losing it.
     Two quarts on Monday and two more on Thursday is a leak; one quart once is
     a top-up, and the words alone cannot tell those apart a month later. */
  "Surge tank - engine side low":coolantAdded,
  "Surge tank - heating side low":coolantAdded,
  "Surge tank - both sides low":coolantAdded,
 },
 "Air System":{
  "Leaking air bag - Front C/S":airBagCount(2),
  "Leaking air bag - Front R/S":airBagCount(2),
  "Leaking air bag - Rear":airBagCount(4),
 },
};
export function defectCountField(category:unknown,issue:unknown){
 const moved=migrateRepairIdentity(String(category??"").trim(),String(issue??"").trim());
 return DEFECT_COUNT_FIELDS[moved.category]?.[moved.issue];
}
/* A whole positive count on a repair that is counted, and nothing anywhere
   else, so a number left over from a repair retyped as something uncounted
   cannot follow it. The ceiling shapes the picker but is not enforced here: a
   count already recorded must not disappear because the table later says the
   axle holds fewer. */
export function normalizeRepairCount(value:unknown,category:unknown,issue:unknown){
 if(!defectCountField(category,issue))return undefined;
 const count=Math.round(Number(value));
 return Number.isFinite(count)&&count>0?count:undefined;
}

export function repairGroupDisplayLabel(group:string){
 if(group==="Door, Ramp and Kneeler Failures")return ADA_MECHANICAL_MARK+group;
 return ADA_GROUPS.has(group)?ADA_MARK+group:group;
}
/* Inside a group that already carries the mark every option would repeat it, so
   the group speaks for its contents and the options stay clean. */
export function repairIssueDisplayLabel(issue:string,group=""){
 if(ADA_GROUPS.has(group))return issue;
 if(ISSUE_DISPLAY_MARKS[issue])return ISSUE_DISPLAY_MARKS[issue]+issue;
 return ADA_ISSUE.test(issue)?ADA_MARK+issue:issue;
}

/* Decimal hours as a mechanic writes them: .5, 1.25. Anything that is not a
   positive number reads as no time recorded, which is not the same as zero. */
export const MAX_REPAIR_HOURS=24;
export function normalizeRepairHours(value:unknown):number|undefined{
 if(value===""||value===null||value===undefined)return undefined;
 const hours=Number(value);
 if(!Number.isFinite(hours)||hours<=0)return undefined;
 return Math.min(MAX_REPAIR_HOURS,Math.round(hours*100)/100);
}

/* Work that is diagnosis before it is repair. Curtis may only get as far as
   reading the fault on a shift, so these always offer a diagnostic time field
   and say so, rather than leaving that work unrecorded because the bus was
   never fixed. Check-engine is the case he named; the rest match how the
   catalog already words its own diagnostic entries. */
/* Shop policy: a diagnosis is never billed under an hour. Finding a fault takes
   an hour before it takes anything else, and a fifteen-minute figure is somebody
   guessing rather than reading a meter.

   Applied where time is typed in, never on read. Running it inside
   normalizeDefects would quietly round every historical half-hour up to one and
   rewrite what those repairs say they cost. */
export const MINIMUM_DIAGNOSTIC_HOURS=1;
export function normalizeDiagnosticHours(value:unknown):number|undefined{
 const hours=normalizeRepairHours(value);
 return hours===undefined?undefined:Math.max(MINIMUM_DIAGNOSTIC_HOURS,hours);
}

export function isDiagnosticDefect(category:unknown,issue:unknown){
 const text=String(category||"")+" "+String(issue||"");
 return /diagnos|check.?engine|check engine|stop engine light|mod light|abs warning|intermittent|unknown/i.test(text);
}

/* Anything that is not one of the three known keys is dropped, and anything
   that is becomes a stamp even if it arrived as a bare `true` from an older
   record or a hand-edited backup. */
export function normalizeWorkStateStamp(value:unknown):WorkStateStamp|undefined{
 if(value===undefined||value===null||value===false)return undefined;
 const stamp=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
 const at=String(stamp.at??"").trim(),by=String(stamp.by??"").trim();
 return {...(at?{at}:{}),...(by?{by}:{})};
}

export function normalizeWorkStates(value:unknown):Partial<Record<WorkStateKey,WorkStateStamp>>|undefined{
 if(!value||typeof value!=="object"||Array.isArray(value))return undefined;
 const source=value as Record<string,unknown>,states:Partial<Record<WorkStateKey,WorkStateStamp>>={};
 let found=false;
 for(const key of WORK_STATE_KEYS){
  const stamp=normalizeWorkStateStamp(source[key]);
  if(!stamp)continue;
  states[key]=stamp;
  found=true;
 }
 return found?states:undefined;
}

/* Stamping a tick, or clearing the whole stamp with it. Shared by the work
   states and the Down Sheet recommendation so a tick means the same thing and
   leaves the same trace wherever it is offered. */
function stampFor(on:boolean,at:string,by:string):WorkStateStamp|undefined{
 if(!on)return undefined;
 const person=by.trim();
 return {...(at?{at}:{}),...(person?{by:person}:{})};
}

/* Ticking a state stamps it; unticking removes the key outright rather than
   leaving a false behind, so a stamp can never outlive the tick that made it
   and read as work somebody did not do. */
export function setDefectWorkState(defect:StructuredDefect,key:WorkStateKey,on:boolean,at:string,by=""):StructuredDefect{
 const states={...(defect.workStates||{})},stamp=stampFor(on,at,by);
 if(stamp)states[key]=stamp;else delete states[key];
 const next={...defect,workStates:Object.keys(states).length?states:undefined};
 if(!next.workStates)delete next.workStates;
 return next;
}

/* Recommending a repair for the Down Sheet is not putting it on the Down Sheet.
   It is one person saying this one belongs there, so that somebody else can be
   handed the list and decide. The two are deliberately separate fields: a
   recommendation that quietly became membership would put buses on the sheet
   nobody agreed to, and membership that cleared the recommendation would erase
   the record of who asked for it. */
export function isDownSheetRecommended(defect:StructuredDefect){return Boolean(defect.downSheetRecommendation)}
export function setDownSheetRecommendation(defect:StructuredDefect,on:boolean,at:string,by=""):StructuredDefect{
 const stamp=stampFor(on,at,by),next={...defect,downSheetRecommendation:stamp};
 if(!stamp)delete next.downSheetRecommendation;
 return next;
}

export function hasWorkState(defect:StructuredDefect,key:WorkStateKey){return Boolean(defect.workStates?.[key])}

/* Ordered as WORK_STATES is, so a record always reads the same way round
   however the boxes were ticked. */
export function defectWorkStates(defect:StructuredDefect){
 return WORK_STATES.filter(state=>hasWorkState(defect,state.key));
}

/* "CJ, Aug 27" where both are known, either alone where one is, and nothing
   where the tick carries neither. */
export function workStateStampLabel(stamp:WorkStateStamp|undefined){
 if(!stamp)return "";
 const by=String(stamp.by||"").trim(),at=String(stamp.at||"").trim();
 const when=at?new Date(at):null;
 const day=when&&!Number.isNaN(when.getTime())
  ?new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(when):"";
 return [by,day].filter(Boolean).join(", ");
}

/* A finding is a cause, not a symptom, so it is marked as one. Without the
   word a reader cannot tell what the driver reported from what the shop
   found, and on a Down Sheet those are very different facts. */
export function normalizeFinding(value:unknown){
 const text=String(value??"").trim();
 return text?text.slice(0,180):undefined;
}
export function findingLabel(finding:unknown){
 const text=normalizeFinding(finding);
 return text?"found: "+text:"";
}

export const CHECK_ENGINE_SYMPTOMS=["Misfire","Loss of power"] as const;

/* The three dash-light entries that carry the symptom picker. Kept as a list so
   a fourth cannot be added to the catalog and quietly lose its symptoms. */
export const CHECK_ENGINE_ISSUES=["Check engine light","Stop engine light","Check engine and stop engine light"] as const;
export function isCheckEngineIssue(category:unknown,issue:unknown){
 return String(category??"")==="Engine"&&(CHECK_ENGINE_ISSUES as readonly string[]).includes(String(issue??""));
}

function normalizedSymptoms(value:unknown){
 if(!Array.isArray(value))return [];
 return [...new Set(value.map(item=>String(item).trim()).filter(Boolean))];
}

export const REPAIR_OPTION_GROUPS:Record<string,Record<string,string[]>>={
 "Bus Controls":{
  "Door, Ramp and Kneeler Failures":["Front door will not open","Front door will not close","Front door opens / closes slowly","Rear door will not open","Rear door will not close","Rear door opens / closes slowly","Ramp not working","Ramp no power","Kneeler not functioning correctly","Kneeler sits too high"],
  "Driver Seat":["Seat belt","Leaking air","Will not lock","Adjustment / locking bar","Controls / buttons"],
  "Gauges and Dash":["Fuel gauge INOP / false reading","Speedometer","Other gauge / indicator","Front dash damage","Front instrument dash damaged / replacement"],
  /* The switch lives here, the thing it switches lives with its own system.
     Lights and Fixtures owns the mirrors themselves, the same way it owns the
     turn signal lamps while the stalk that works them is an Operating Control. */
  "System Switches":["Kneeler button","Ramp power switch","Ramp deploy / stow switch","Front door open / close switch","Rear door open / close switch","HVAC / heat controls","A/C control panel","Blower control","Floor heat switch","Interior light controls","Mirror heater switch","C/S adjuster switch"],
  "Operating Controls":["Turn signals (steering column)","Turn signals (floor panel)","Start button","Horn","Horn / seat alarm will not stop","High beams stay on","Red air valve hard to turn","Parking brake knob will not pull up (apply)","Parking brake knob will not push down (release)","Parking brake knob hard to pull or push","Parking brake knob pops out while driving","Pedal adjuster","Steering wheel tilt / telescoping","Operator light","Switches broken / loose","Side control panel damage","Other bus control defect"],
 },
 /* Everything a rider touches or rides in. Bus Controls stays the driver's
    station; a strap or a stop request cord is not something the operator
    reaches from the seat, so it is found here instead. Curbside and roadside
    are called out because each side is a separate unit that fails on its own. */
 "Doors, Ramp and ADA":{
  "Doors":["Front door","Rear door","Door controls","Interlock","Other door defect"],
  "Ramp, Lift and Kneeler":["Wheelchair ramp","Ramp will not deploy","Ramp will not stow","Kneeler","Wheelchair lift","Other ramp, lift or kneeler defect"],
  "Wheelchair Securement":["Q'STRAINT switch (curbside)","Q'STRAINT switch (roadside)","Securement straps / retractor (curbside)","Securement straps / retractor (roadside)","Flip-up bench seat (curbside)","Flip-up bench seat (roadside)","Occupant lap / shoulder belt","Other securement defect"],
  "Stop Request":["Stop request (wheelchair area)","Stop request (curbside)","Stop request (roadside)","Stop request pull cord / line - broken (curbside)","Stop request pull cord / line - broken (roadside)","Stop request chime / tone","Stop request sign / light","Other stop request defect"],
 },
 "Amerex":{
  "Fire Suppression":["FIRE alarm (system discharged)","Heat sensor communication fault","Trouble Mod 1 Roof 1","Trouble Mod 2 Roof 1","Control head no power","Other Fire Suppression Trouble"],
  "Gas Concentration":["Trace","Significant Leak","Other Gas Concentration Alert"],
  "CNG":["Check CNG valves light","PRD cap missing","PRD leaking","Other CNG defect"],
 },
};
export function defectFromDraft(draft:Omit<StructuredDefect,"id">,mode:"select"|"manual",id="defect-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)):StructuredDefect|null{
 const manual=mode==="manual",details=draft.details.trim(),category=manual?"Miscellaneous":draft.category,issue=manual?"Manual entry":draft.issue;
 if(!category||!issue||manual&&!details)return null;
 const now=new Date().toISOString();
 return {...draft,id,category,issue,details,createdAt:draft.createdAt||now,updatedAt:now,source:draft.source||"tracker"};
}
/* The Amerex Vehicle SafetyNet control head is two systems behind one faceplate,
   and they fail very differently.

   Gas Concentration watches for escaping CNG. Amber Trace means it can smell
   something and the bus keeps running while somebody finds it. Red Significant
   normally puts the bus down; holding Relay Reset will move it under its own
   power, but that is getting it off the road, not clearing the fault.

   Fire Suppression is four heat sensors set in four sections at the rear, where
   the CNG lines run. It fires on its own with no operator input at all, so FIRE
   on this panel means the bottles have already gone off, not that somebody
   needs to decide something. Trouble is the amber one: most often a sensor that
   has stopped answering.

   These two states take the bus off the road on their own, so the picker starts
   them as Remove From Service rather than leaving a mechanic to remember. */
const DOWNING_ISSUES:Record<string,readonly string[]>={
 /* The engine has already taken itself off the road at this point, so the
    picker must not open on May Stay In Service. Running hot is the opposite
    case and stays in service on purpose: eight or ten over finishes the day. */
 "Engine":["Overheat shutdown (235-240F)"],
 "Interior Cleaning":["Cleaning Required"],
 "Amerex":["Gas Concentration - Significant Leak","Fire Suppression - FIRE alarm (system discharged)","CNG - PRD leaking"],
};
export function defaultDefectOperability(category:string,issue:string):DefectOperability{
 return DOWNING_ISSUES[category]?.includes(issue)?"down":"service";
}
/* Retired from the picker, still readable on every record that carries it.

   "Alternator / charging" said one of two different things depending on who
   typed it, and once Voltage regulator and Alternator failure existed it had no
   job left that "Starting / charging diagnosis" and "Other starting or charging
   repair" were not already doing. Two alternator entries in one dropdown is a
   coin flip for somebody standing at a bus.

   It is dropped rather than renamed on purpose. Pointing it at Alternator
   failure would restate every record already logged under it as a confirmed
   failure, and nobody made that call. Stored records keep the exact words they
   were saved with, and every picker offers them back as logged. */
export const RETIRED_ISSUES:Record<string,readonly string[]>={
 "Battery, Starting and Charging":["Alternator / charging"],
 "Suspension and Steering":["Air bag","Front air bag leak","Rear air bag leak"],
};

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
 "Engine":{
  /* The light on the dash is what gets reported. "Diagnosis" described what the
     shop then does about it, which is not the same thing and is not what a
     driver hands in. */
  "Check-engine diagnosis":"Check engine light",
 },
 "Battery, Starting and Charging":{
  /* Crossed on purpose, and this is the whole reason the rename needed care.
     "Only front start" said which half still worked, so the broken half is the
     REAR one. Mapping each old name to the same-sounding new one would silently
     invert every record already logged. */
  "Only front start":"Rear start INOP",
  "Only rear start":"Front start INOP",
 },
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
  return {...defect,id:defect.id||identity+"-defect-"+index,category,issue,details:defect.details||"",operability:defect.operability==="down"?"down":"service",state,conditionNotDuplicated:Boolean(defect.conditionNotDuplicated),symptoms:normalizedSymptoms(defect.symptoms),quantity:typeof defect.quantity==="number"?defect.quantity:undefined,repairHours:normalizeRepairHours(defect.repairHours),diagnosticHours:normalizeRepairHours(defect.diagnosticHours),workStates:normalizeWorkStates(defect.workStates),downSheetRecommendation:normalizeWorkStateStamp(defect.downSheetRecommendation),finding:normalizeFinding(defect.finding)} as StructuredDefect;
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
 /* The stored unit wins, then the one the catalog declares for this repair, and
    only then quarts. Without the middle step a count saved on a record whose
    unit never got written reads as "2 quarts" of air bag. */
 const unit=defect.unit||defectCountField(defect.category,defect.issue)?.unit||"quarts";
 const quantity=typeof defect.quantity==="number"&&defect.quantity>0?defect.quantity+" "+unit:"";
 /* The finding sits ahead of the reported symptoms: once the cause is known it
    is the more useful half of the line, and on a Down Sheet that is often all
    anyone reads before deciding what the bus needs. */
 return [defect.category,defect.issue,quantity,findingLabel(defect.finding),defectSupportingDetails(defect)].map(value=>String(value).trim()).filter(Boolean).join(" — ")
}
export function defectSummary(defects:StructuredDefect[]){return defects.filter(isUnresolved).map(defectLabel).join("; ")}
