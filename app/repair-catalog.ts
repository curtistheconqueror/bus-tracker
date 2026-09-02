export type DefectState="open"|"in-progress"|"deferred"|"completed";
export type DefectOperability="service"|"down";
export type DefectSource="tracker"|"down-sheet"|"defect-log"|"operator"|"scan";

/* How far a repair has got before it is fixed. "Open" and "completed" are the
   only two things the record could say until now, and between them sits most
   of a shop week: a bus looked at, a fault found, a part waiting on the truck.

   The original three were chosen with a warning attached: a fourth invites two
   mechanics to tick different boxes for the same job, and a state can be added
   later far more safely than one already written onto records can be taken
   away. "Diagnosed" deliberately covers a check-engine code and a multiplex
   fault alike: on the floor both mean somebody found the cause and it is not
   fixed yet.

   Two were added later, and the warning does not bite on either, because the
   warning was about OVERLAP. Inspected and diagnosed can blur — both are
   judgements about how far the thinking has got. Test driven and brake test
   are neither judgements nor stages: they are discrete physical acts that
   either happened or did not, and no second mechanic can reasonably record
   the same work under a different one of these boxes.

   Brake test is the only state that carries a RESULT. "Brake test: done" with
   the outcome left to prose is exactly the ambiguity that costs most on a
   safety item, and a failed brake test is the first thing anybody would want
   to pull as a list — which free text cannot answer. */
export type WorkStateKey="inspected"|"diagnosed"|"parts-on-order"|"test-driven"|"brake-test";
export type BrakeTestResult="pass"|"fail";
/* result is only ever set on the brake-test key. Optional everywhere else so
   one stamp shape still covers every state. */
export type WorkStateStamp={at?:string;by?:string;result?:BrakeTestResult};
export const WORK_STATES:{key:WorkStateKey;label:string;short:string;hint:string}[]=[
 {key:"inspected",label:"INSPECTED",short:"INSP",hint:"Looked at, nothing found yet"},
 {key:"diagnosed",label:"DIAGNOSED",short:"DIAG",hint:"Cause found, not fixed yet"},
 {key:"parts-on-order",label:"PARTS ON ORDER",short:"PARTS",hint:"Waiting on a part to arrive"},
 {key:"test-driven",label:"TEST DRIVEN",short:"DRIVEN",hint:"Road tested, details in the notes"},
 {key:"brake-test",label:"BRAKE TEST",short:"BRAKE",hint:"Record the result below"},
];
export const BRAKE_TEST_KEY:WorkStateKey="brake-test";
export function brakeTestResult(defect:StructuredDefect){return defect.workStates?.[BRAKE_TEST_KEY]?.result}
export function brakeTestFailed(defect:StructuredDefect){return brakeTestResult(defect)==="fail"}
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
 /* The HVAC control panel's own diagnostic lamp, and the alarm number it is
    showing. Yellow and red are the two states the panel has and it cannot show
    both, so this is one value rather than two flags — a record can never claim
    a lamp that does not exist. Absent means no lamp was showing, or nobody
    looked; the two are deliberately not distinguished, because a mechanic who
    did not check should not be made to say so. */
 diagLight?:DiagLight;
 /* The two-digit alarm number off that panel, kept as text because 04 and 4
    are different alarms and a number would lose the leading zero. */
 alarmCode?:string;
 reportedLocation?:string;
 defectLogHiddenAt?:string;
 /* Stamped the moment a repair is put into DEFERRED from the Defect Log's own
    toggle — held back from service without going on the Down Sheet. The Down
    Sheet's own "Deferred" workflow writes this same state without ever
    touching this field, so a defect only counts as a held-back B12 bus when
    the caller also confirms it carries no active Down Sheet entry; this field
    alone cannot tell the two apart. Cleared the moment the repair leaves
    DEFERRED, whichever way it leaves. */
 deferredAt?:string;
 /* Set by the evening review prompt when the choice is "keep deferred
    longer" — the prompt will not ask about this bus again until this time
    passes. Absent means no snooze in effect. Cleared alongside deferredAt. */
 deferredUntil?:string;
 /* Stamped the moment a repair leaves DEFERRED by going back into service —
    not fixed, not on the Down Sheet, just returned. A repair that sits open
    for days after that is easy to lose track of once the teal DEF badge is
    gone, so this keeps a quieter, separate memory of it: "this was held back
    before and never got resolved." Cleared the moment that stops being true —
    fixed, put on the Down Sheet, or deferred again — never carried forward
    past whichever of those happens first. */
 deferredReturnedAt?:string;
 symptoms?:string[];
 quantity?:number;
 unit?:string;
 source?:DefectSource;
};

export const REPAIR_OPTIONS:Record<string,string[]>={
 /* Condenser and evaporator fans are counted, not just described. One fan down
    and both fans down are different jobs — the first still cools badly and
    limps, the second does not cool at all — and a single "fan INOP" option
    loses that the moment it is saved. "Semi cold air" sits between No cooling
    and nothing at all: the unit runs, the air is not cold enough, and that is
    what a driver actually reports. */
 "A/C and HVAC":["No cooling","Semi cold air","Compressor","A/C belt","A/C compressor pulley misaligned","Evaporator core","Condenser core","Condenser fan INOP - 1 fan","Condenser fans INOP - both fans","Evaporator fan / motor INOP - 1","Evaporator fans / motors INOP - both","Blower motor","Operator A/C blower","Refrigerant / Freon leak","Bad connection / wiring","Controls / electrical","IntelligAIRE III control panel - screen blank / black","Heater / defroster","Other A/C repair"],
 "Engine":["Check engine light","Stop engine light","Check engine and stop engine light","Engine runs hot (207F+)","Overheating","Overheat shutdown (235-240F)","Coolant leak","Misfire","Loss of power","Oil leak","Rear main seal","Coolant level sensor","Water pump belt","Alternator belt","Water pump pulley","Tensioner pulley","Fan drive pulley","Spark plugs","Valve adjustment","Abnormal noise","Engine replacement","Internal engine repair","Other engine repair"],
 "Cooling System":["Overheating","Coolant leak","Surge tank - engine side low","Surge tank - heating side low","Surge tank - both sides low","Radiator leak","Radiator","Radiator fan(s) out","Radiator fan diagnostic light","Radiator fans constantly running on high","Water pump","Cooling fan","Hoses / fittings","Other cooling repair"],
 "Transmission and Drivetrain":["Check transmission light","Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Driveshaft noise / banging","Driveshaft","U-joints","Carrier bearing","Differential","Axle / axle shaft","Other transmission or drivetrain repair"],
 "Suspension and Steering":["NVH (noise, vibration, harshness)","Shock / strut","Stabilizer link","Dogtracking","Leveling valve","Ride-height issue","Bus leaning - C/S","Bus leaning - R/S","Suspension leak","Bushing / linkage","Loose steering","Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Missing grease fitting (Zerk)","Grease fitting will not take grease","Other suspension or steering repair"],
 "Brakes":["Brake inspection","Front brake pads","Brake rotors","Rear shoes and drums","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Brake mod light","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Jump / boost bus","Battery replacement","Battery drain","Voltage regulator","Alternator failure","No crank","Crank no start","Intermittent no start","Front start INOP","Rear start INOP","Starter","Solid battery light","Flashing battery light","Starting / charging diagnosis","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["MOD light","Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Operator/Driver Controls":["Driver Seat - Seat belt","Driver Seat - Leaking air","Driver Seat - Will not lock","Driver Seat - Adjustment / locking bar","Driver Seat - Controls / buttons","Gauges and Dash - Fuel gauge INOP / false reading","Gauges and Dash - Speedometer","Gauges and Dash - Other gauge / indicator","Gauges and Dash - Front dash damage","Gauges and Dash - Front instrument dash damaged / replacement","System Switches - Kneeler button","System Switches - Ramp power switch","System Switches - Ramp deploy / stow switch","System Switches - Front door open / close switch","System Switches - Rear door open / close switch","System Switches - HVAC / heat controls","System Switches - A/C control panel","System Switches - Blower control","System Switches - Floor heat switch","System Switches - Interior light controls","System Switches - Mirror heater switch - C/S","System Switches - Mirror adjuster switch - C/S","Operating Controls - Turn signals (steering column)","Operating Controls - Turn signals (floor panel)","Operating Controls - Front start button","Operating Controls - Rear start button","Operating Controls - Horn","Operating Controls - Horn / seat alarm will not stop","Operating Controls - High beams stay on","Operating Controls - Red air valve hard to turn","Operating Controls - Parking brake knob will not pull up (apply)","Operating Controls - Parking brake knob will not push down (release)","Operating Controls - Parking brake knob hard to pull or push","Operating Controls - Parking brake knob pops out while driving","Operating Controls - Pedal adjuster","Operating Controls - Steering wheel tilt / telescoping","Operating Controls - Operator light","Operating Controls - Switches broken / loose","Operating Controls - Side control panel damage","Operating Controls - Other bus control defect"],
 /* Grouped the way the shop's own check-off sheets are laid out. The farebox
    sheet checks power, bill transport and coin mech per bus; those three had no
    option, so eleven live records sat on the bare word "Farebox", five of them
    saying "black screen" in free text. The CUBIC screen options already read
    "Group - Item", so they keep their stored identity exactly and the twelve
    live records under them are untouched. Nothing is retired: every old wording
    reads as its new home. */
 "Tech Services":["Farebox - INOP (general)","Farebox - No power","Farebox - Blank / black screen","Farebox - Bill transport INOP","Farebox - Coin mech INOP","Farebox - Coin off line","Farebox - Coin bin missing","Farebox - Unlocked / won't lock","Farebox - Can't unlock top / coin bypass reset","Farebox - Loose from floor mounts","Farebox - Other farebox defect","Ventra - INOP (general)","Ventra - Other Ventra defect","CUBIC Screen - BUS ER","CUBIC Screen - MV ER","CUBIC Screen - Screen black","IBS Screen - INOP (general)","IBS Screen - Screen black","Signs, Cameras and Other - Destination Sign","Signs, Cameras and Other - Dash cam","Signs, Cameras and Other - Camera / DVR system","Signs, Cameras and Other - Other Tech Services"],
 "Amerex":["Fire Suppression - FIRE alarm (system discharged)","Fire Suppression - Heat sensor communication fault","Fire Suppression - Trouble Mod 1 Roof 1","Fire Suppression - Trouble Mod 2 Roof 1","Fire Suppression - Control head no power","Fire Suppression - Other Fire Suppression Trouble","Gas Concentration - Trace","Gas Concentration - Significant Leak","Gas Concentration - Other Gas Concentration Alert","CNG - Check CNG valves light","CNG - PRD cap missing","CNG - PRD leaking","CNG - Other CNG defect"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "Bus Accessories":["Doors - Front door","Doors - Front door will not open","Doors - Front door will not close","Doors - Front door opens / closes slowly","Doors - Rear door","Doors - Rear door will not open","Doors - Rear door will not close","Doors - Rear door opens / closes slowly","Doors - Door controls","Doors - Interlock","Doors - Other door defect","Ramp, Lift and Kneeler - Wheelchair ramp","Ramp, Lift and Kneeler - Ramp not working","Ramp, Lift and Kneeler - Ramp no power","Ramp, Lift and Kneeler - Ramp will not deploy","Ramp, Lift and Kneeler - Ramp will not stow","Ramp, Lift and Kneeler - Kneeler","Ramp, Lift and Kneeler - Kneeler not functioning correctly","Ramp, Lift and Kneeler - Kneeler sits too high","Ramp, Lift and Kneeler - Wheelchair lift","Ramp, Lift and Kneeler - Other ramp, lift or kneeler defect","Wheelchair Securement - Q'STRAINT switch (curbside)","Wheelchair Securement - Q'STRAINT switch (roadside)","Wheelchair Securement - Securement straps / retractor (curbside)","Wheelchair Securement - Securement straps / retractor (roadside)","Wheelchair Securement - Flip-up bench seat (curbside)","Wheelchair Securement - Flip-up bench seat (roadside)","Wheelchair Securement - Occupant lap / shoulder belt","Wheelchair Securement - Other securement defect","Stop Request - Stop request INOP (curbside)","Stop Request - Stop request INOP (roadside)","Stop Request - Stop request INOP (wheelchair area - curbside)","Stop Request - Stop request INOP (wheelchair area - roadside)","Stop Request - Stop request pull cord / line - broken (curbside)","Stop Request - Stop request pull cord / line - broken (roadside)","Stop Request - Stop request chime / tone","Stop Request - Stop request sign / light","Stop Request - Other stop request defect","Bike Rack - Arm replacement","Bike Rack - Loose / pivots"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signal lamps","Interior lights","Back-up alarm","Outside rear view mirror - C/S","Outside rear view mirror - R/S","Interior mirror","Mirror replacement (no body work)","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Bike rack - bent / replacement","Ramp - complete replacement (beyond repair)","IBS screen pole - broken","Glass / windshield cracked or shattered","Mirror damage (body shop)","Interior advertising panel / ad card rack - loose or hanging (C/S)","Interior advertising panel / ad card rack - loose or hanging (R/S)","Passenger seat - loose","Passenger seat - missing","Passenger seat - damaged","Passenger assist handle / hanging strap - loose or broken","Passenger grab rail / stanchion - loose or damaged","Paint","Interior body repair","Other bodywork"],
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
 "Bus Controls":"🎛️","Operator/Driver Controls":"🎛️","Bus Accessories":"♿",
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
 /* Only the two values a brake test can mean. Anything else a hand-edited
    file or a newer build put here is dropped rather than carried, so a result
    can never be a value this app does not know how to show. */
 const raw=String(stamp.result??"").trim().toLowerCase();
 const result:BrakeTestResult|undefined=raw==="pass"||raw==="fail"?raw:undefined;
 return {...(at?{at}:{}),...(by?{by}:{}),...(result?{result}:{})};
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
function stampFor(on:boolean,at:string,by:string,result?:BrakeTestResult):WorkStateStamp|undefined{
 if(!on)return undefined;
 const person=by.trim();
 return {...(at?{at}:{}),...(person?{by:person}:{}),...(result?{result}:{})};
}

/* Ticking a state stamps it; unticking removes the key outright rather than
   leaving a false behind, so a stamp can never outlive the tick that made it
   and read as work somebody did not do. */
export function setDefectWorkState(defect:StructuredDefect,key:WorkStateKey,on:boolean,at:string,by="",result?:BrakeTestResult):StructuredDefect{
 const states={...(defect.workStates||{})};
 /* A supplied result wins; otherwise the stamp keeps the one it already had,
    so re-signing or re-stamping a brake test cannot silently forget whether
    it passed. Unticking clears the whole stamp, result included. */
 const carried=key===BRAKE_TEST_KEY?(result??states[key]?.result):undefined;
 const stamp=stampFor(on,at,by,carried);
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

/* The HVAC panel's diagnostic lamp. Yellow is a fault the unit is still running
   with; red is one it has shut down for. Both carry a two-digit alarm number,
   which is the part that actually tells a technician where to start. */
export type DiagLight="yellow"|"red";
export const DIAG_LIGHTS:readonly DiagLight[]=["yellow","red"];
export const DIAG_LIGHT_LABELS:Record<DiagLight,string>={yellow:"YELLOW DIAG LIGHT",red:"RED DIAG LIGHT"};
/* Offered on the whole A/C category rather than a list of specific repairs.
   Any HVAC fault can put the lamp up, and a whitelist here would be one more
   thing to remember to extend every time an option is added. */
export function hasDiagLightField(category:unknown){return String(category??"").trim()==="A/C and HVAC"}
export function normalizeDiagLight(value:unknown):DiagLight|undefined{
 const text=String(value??"").trim().toLowerCase();
 return (DIAG_LIGHTS as readonly string[]).includes(text)?text as DiagLight:undefined;
}
/* Digits only, and never more than two. A panel showing 07 must not read back
   as 7, so the text is kept exactly as typed rather than parsed to a number,
   and anything a hand-edited file or an older build put here that is not two
   digits is dropped rather than displayed as an alarm that does not exist. */
export function normalizeAlarmCode(value:unknown){
 const digits=String(value??"").replace(/\D/g,"").slice(0,2);
 return digits.length===2?digits:"";
}
export function diagLightLabel(defect:{diagLight?:DiagLight;alarmCode?:string}){
 const light=normalizeDiagLight(defect.diagLight);
 if(!light)return "";
 const code=normalizeAlarmCode(defect.alarmCode);
 return DIAG_LIGHT_LABELS[light]+(code?" alarm "+code:"");
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
 "Operator/Driver Controls":{
  "Driver Seat":["Seat belt","Leaking air","Will not lock","Adjustment / locking bar","Controls / buttons"],
  "Gauges and Dash":["Fuel gauge INOP / false reading","Speedometer","Other gauge / indicator","Front dash damage","Front instrument dash damaged / replacement"],
  "System Switches":["Kneeler button","Ramp power switch","Ramp deploy / stow switch","Front door open / close switch","Rear door open / close switch","HVAC / heat controls","A/C control panel","Blower control","Floor heat switch","Interior light controls","Mirror heater switch - C/S","Mirror adjuster switch - C/S"],
  "Operating Controls":["Turn signals (steering column)","Turn signals (floor panel)","Front start button","Rear start button","Horn","Horn / seat alarm will not stop","High beams stay on","Red air valve hard to turn","Parking brake knob will not pull up (apply)","Parking brake knob will not push down (release)","Parking brake knob hard to pull or push","Parking brake knob pops out while driving","Pedal adjuster","Steering wheel tilt / telescoping","Operator light","Switches broken / loose","Side control panel damage","Other bus control defect"],
 },
 /* Everything a rider touches or rides in. Bus Controls stays the driver's
    station; a strap or a stop request cord is not something the operator
    reaches from the seat, so it is found here instead. Curbside and roadside
    are called out because each side is a separate unit that fails on its own. */
 "Bus Accessories":{
  "Doors":["Front door","Front door will not open","Front door will not close","Front door opens / closes slowly","Rear door","Rear door will not open","Rear door will not close","Rear door opens / closes slowly","Door controls","Interlock","Other door defect"],
  "Ramp, Lift and Kneeler":["Wheelchair ramp","Ramp not working","Ramp no power","Ramp will not deploy","Ramp will not stow","Kneeler","Kneeler not functioning correctly","Kneeler sits too high","Wheelchair lift","Other ramp, lift or kneeler defect"],
  "Wheelchair Securement":["Q'STRAINT switch (curbside)","Q'STRAINT switch (roadside)","Securement straps / retractor (curbside)","Securement straps / retractor (roadside)","Flip-up bench seat (curbside)","Flip-up bench seat (roadside)","Occupant lap / shoulder belt","Other securement defect"],
  "Stop Request":["Stop request INOP (curbside)","Stop request INOP (roadside)","Stop request INOP (wheelchair area - curbside)","Stop request INOP (wheelchair area - roadside)","Stop request pull cord / line - broken (curbside)","Stop request pull cord / line - broken (roadside)","Stop request chime / tone","Stop request sign / light","Other stop request defect"],
  "Bike Rack":["Arm replacement","Loose / pivots"],
 },
 /* "INOP (general)" is the landing spot for a fault known only by its device —
    the bare "Farebox" and "Ventra" records logged before anything more specific
    existed. It sits first in its group, the way "Front door" leads Doors, so a
    mechanic who knows the box is dead but not why still has a plain first
    choice. The CUBIC Screen group keeps the two error wordings the shop already
    uses; the sweep sheet's DT and MV columns are those two devices. */
 "Tech Services":{
  "Farebox":["INOP (general)","No power","Blank / black screen","Bill transport INOP","Coin mech INOP","Coin off line","Coin bin missing","Unlocked / won't lock","Can't unlock top / coin bypass reset","Loose from floor mounts","Other farebox defect"],
  "Ventra":["INOP (general)","Other Ventra defect"],
  "CUBIC Screen":["BUS ER","MV ER","Screen black"],
  "IBS Screen":["INOP (general)","Screen black"],
  "Signs, Cameras and Other":["Destination Sign","Dash cam","Camera / DVR system","Other Tech Services"],
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
 /* Only one option was dropped when Bus Controls split, and only because it
    became two: the single wheelchair-area stop request cannot be assigned a
    side after the fact.

    Four component-named options were nearly dropped with it, on the reasoning
    that a more specific symptom now covers each. The live board said
    otherwise — "Doors - Front door", "Wheelchair ramp" and "Kneeler" were the
    THREE MOST USED options in the category, carrying nine of its ten records.
    They are how a fault gets logged when the door is known and the symptom is
    not yet, so they stay, with the specific symptoms listed under them. */
 "Bus Accessories":["Stop Request - Stop request (wheelchair area)"],
};

/* Categories and options that were merged away. Records are never dropped or
   rewritten in storage: they are moved to their surviving home as they are read,
   so a defect logged under the old No Start category still opens, filters, and
   reports exactly as before. An issue with no clean equivalent keeps its wording. */
const LEGACY_CATEGORY_RENAMES:Record<string,string>={"Operator Controls":"Bus Controls","No Start":"Battery, Starting and Charging","Suspension":"Suspension and Steering","Steering":"Suspension and Steering","Doors, Ramp and Lift":"Bus Accessories","Doors, Ramp and ADA":"Bus Accessories","Transmission":"Transmission and Drivetrain"};
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
 /* Keyed by the category the record has AFTER the split above has run, not the
    one it was stored under. Keeping this as "Bus Controls" left both mirror
    renames silently dead — the category was already "Operator/Driver Controls"
    by the time this line was reached, so the lookup missed every time. */
 "Operator/Driver Controls":{
  /* Both switches are curbside, and "C/S adjuster switch" did not say adjuster
     of WHAT. Named for the mirror they work, and for the side, so neither has
     to be guessed at a year from now. Records logged under the first wording
     read as the new one; nothing stored is rewritten. */
  "System Switches - Mirror heater switch":"System Switches - Mirror heater switch - C/S",
  "System Switches - C/S adjuster switch":"System Switches - Mirror adjuster switch - C/S",
 },
 /* The floor says Freon, the catalog said Refrigerant, and somebody searching
    the Defect Log for "freon" found nothing. Both words are in the wording now
    so either search hits it. Records logged under the old name read as the new
    one; nothing stored is rewritten. */
 "A/C and HVAC":{
  "Refrigerant leak":"Refrigerant / Freon leak",
 },
 /* Tech Services became a grouped category. Every flat wording it had moves to
    its group; the two CUBIC Screen wordings already carried their group and are
    absent here on purpose — they do not move. "Farebox won't lock" and the
    sweep sheet's "says unlock, won't lock" were one fault written two ways, so
    they share a home. A record logged as "MDT Screen" reaches here as "IBS
    Screen" via LEGACY_ISSUE_RENAMES first, then lands like any other. */
 "Tech Services":{
  "Farebox":"Farebox - INOP (general)",
  "Farebox won't lock":"Farebox - Unlocked / won't lock",
  "Ventra":"Ventra - INOP (general)",
  "IBS Screen":"IBS Screen - INOP (general)",
  "Destination Sign":"Signs, Cameras and Other - Destination Sign",
  "Dash cam":"Signs, Cameras and Other - Dash cam",
  "Camera / DVR system":"Signs, Cameras and Other - Camera / DVR system",
  "Other Tech Services":"Signs, Cameras and Other - Other Tech Services",
 },
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

/* Bus Controls became two categories: what a driver touches from the seat, and
   the equipment the bus carries for passengers. Fifty-two options in one list
   was more than anybody could scroll on a phone, and the doors and ramps in it
   duplicated a Doors, Ramp and ADA category that already held the same gear.

   A split cannot be a rename-map entry, because the category alone does not
   say which half a record belongs to — the issue does. So it is a rule, and it
   runs on read like every other migration here. Nothing on disk is rewritten. */
const BUS_CONTROL_TO_ACCESSORY:Record<string,string>={
 "Door, Ramp and Kneeler Failures - Front door will not open":"Doors - Front door will not open",
 "Door, Ramp and Kneeler Failures - Front door will not close":"Doors - Front door will not close",
 "Door, Ramp and Kneeler Failures - Front door opens / closes slowly":"Doors - Front door opens / closes slowly",
 "Door, Ramp and Kneeler Failures - Rear door will not open":"Doors - Rear door will not open",
 "Door, Ramp and Kneeler Failures - Rear door will not close":"Doors - Rear door will not close",
 "Door, Ramp and Kneeler Failures - Rear door opens / closes slowly":"Doors - Rear door opens / closes slowly",
 "Door, Ramp and Kneeler Failures - Ramp not working":"Ramp, Lift and Kneeler - Ramp not working",
 "Door, Ramp and Kneeler Failures - Ramp no power":"Ramp, Lift and Kneeler - Ramp no power",
 "Door, Ramp and Kneeler Failures - Kneeler not functioning correctly":"Ramp, Lift and Kneeler - Kneeler not functioning correctly",
 "Door, Ramp and Kneeler Failures - Kneeler sits too high":"Ramp, Lift and Kneeler - Kneeler sits too high",
 "Bus Accessories - Bike rack - arm replacement":"Bike Rack - Arm replacement",
 "Bus Accessories - Bike rack - loose / pivots":"Bike Rack - Loose / pivots",
};

/* The old stop-request options named the side but never what was wrong with
   it. INOP is what gets said on the floor when a cord is pulled and nothing
   sounds, so that is what the option says now.

   "Stop request (wheelchair area)" is deliberately NOT renamed. It became two
   options, curbside and roadside, and a record logged under the single old one
   does not say which. Guessing a side would put a fact into a record that
   nobody established, so it is retired instead: dropped from the picker, kept
   exactly as written on every record that already carries it, and offered back
   as logged when one of those is opened. */
const ACCESSORY_ISSUE_RENAMES:Record<string,string>={
 "Stop Request - Stop request (curbside)":"Stop Request - Stop request INOP (curbside)",
 "Stop Request - Stop request (roadside)":"Stop Request - Stop request INOP (roadside)",
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
 if(category==="Bus Controls"){
  issue=BUS_CONTROL_ISSUE_GROUPS[issue]||issue;
  const moved=BUS_CONTROL_TO_ACCESSORY[issue];
  if(moved){category="Bus Accessories";issue=moved}
  else category="Operator/Driver Controls";
 }
 if(category==="Bus Accessories"){
  issue=DOOR_RAMP_ISSUE_GROUPS[issue]||issue;
  issue=ACCESSORY_ISSUE_RENAMES[issue]||issue;
 }
 issue=CATEGORY_ISSUE_RENAMES[category]?.[issue]||issue;
 return {category,issue};
}

export function normalizeDefects(value:unknown,legacyText="",identity="bus"):StructuredDefect[]{
 if(Array.isArray(value))return value.filter(item=>item&&typeof item==="object").map((item,index)=>{
  const defect=item as Partial<StructuredDefect>;
  const state:DefectState=defect.state==="completed"?"completed":defect.state==="deferred"?"deferred":defect.state==="in-progress"?"in-progress":"open";
   const {category,issue}=migrateRepairIdentity(defect.category,defect.issue);
  /* Read from the MIGRATED category, not the stored one, so a record moved by a
     rename is judged by where it now lives. The lamp survives only on a
     category that has one, and the alarm number survives only alongside a lamp:
     a number on its own has nothing to belong to and would sit in storage where
     no screen ever displays it. */
  const diagLight=hasDiagLightField(category)?normalizeDiagLight(defect.diagLight):undefined;
  return {...defect,id:defect.id||identity+"-defect-"+index,category,issue,details:defect.details||"",operability:defect.operability==="down"?"down":"service",state,conditionNotDuplicated:Boolean(defect.conditionNotDuplicated),symptoms:normalizedSymptoms(defect.symptoms),quantity:typeof defect.quantity==="number"?defect.quantity:undefined,repairHours:normalizeRepairHours(defect.repairHours),diagnosticHours:normalizeRepairHours(defect.diagnosticHours),workStates:normalizeWorkStates(defect.workStates),downSheetRecommendation:normalizeWorkStateStamp(defect.downSheetRecommendation),finding:normalizeFinding(defect.finding),diagLight:diagLight,alarmCode:diagLight?normalizeAlarmCode(defect.alarmCode)||undefined:undefined} as StructuredDefect;
 });
 const legacy=legacyText.trim();
 return legacy?[{id:identity+"-legacy-defect",category:"Miscellaneous",issue:"Driver-reported defect",details:legacy,operability:"service",state:"open"}]:[];
}

export function isUnresolved(defect:StructuredDefect){return defect.state!=="completed"}
/* A bus genuinely held back from B12 without going on the Down Sheet, as
   opposed to a Down Sheet entry whose own workflow happens to be "Deferred" —
   both write state:"deferred", so the caller passes whether an active Down
   Sheet entry exists for this bus. Only the former carries a timer. */
export function isHeldDeferred(defect:StructuredDefect,onDownSheet:boolean){return defect.state==="deferred"&&!onDownSheet}
export function deferredMinutesElapsed(defect:StructuredDefect,now=new Date()){
 if(defect.state!=="deferred"||!defect.deferredAt)return null;
 const started=new Date(defect.deferredAt).getTime();
 return Number.isFinite(started)?(now.getTime()-started)/60000:null;
}
/* A repair that was deferred, went back into service, and is STILL open —
   not currently deferred (that is isHeldDeferred's job), not fixed, and not
   back under the Down Sheet's own tracking. Down Sheet membership invalidates
   this the same way it invalidates a live hold: once a repair is on the
   sheet, the sheet is the record of what happens to it, and a leftover "was
   deferred" note would just be a second, stale trail for the same repair. */
export function hasDeferredHistory(defect:StructuredDefect,onDownSheet:boolean){
 return Boolean(defect.deferredReturnedAt)&&defect.state!=="deferred"&&isUnresolved(defect)&&!onDownSheet;
}
/* A part went on the bus and nobody has written down which one.

   This is not a new field. PARTS USED ticked with the number left blank has
   always meant exactly this — the PART NUMBER box says "Leave blank if the
   number is unknown" — but nothing ever surfaced it, so the record just looked
   finished. Naming the state lets the Fixed Repairs card say what is still
   outstanding, and it reads correctly on records logged long before there was a
   button for it.

   Ticked with a number is complete. Not ticked means no part was used, which is
   a different thing from an unknown one and must never be flagged. */
export function partNumberMissing(defect:{partsUsed?:boolean;partNumber?:string}){
 return defect.partsUsed===true&&!String(defect.partNumber??"").trim();
}
export function defectSupportingDetails(defect:StructuredDefect){
 const symptoms=normalizedSymptoms(defect.symptoms).filter(symptom=>symptom.toLowerCase()!==defect.issue.trim().toLowerCase()).join(", ");
 /* The lamp and its alarm number lead, ahead of the free text. On a Down Sheet
    "RED DIAG LIGHT alarm 32" is the line that decides what the bus needs, and
    it is no use to anybody sitting in a notes field nobody scrolls to. */
 return [diagLightLabel(defect),symptoms,defect.details.trim()].filter(Boolean).join(" — ");
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
