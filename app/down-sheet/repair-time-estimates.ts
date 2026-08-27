export type RepairTimeEstimate={
 repairMinutes:number;
 diagnosticMinutes:number;
 accessMinutes:number;
 complicationMinutes:number;
 heatMinutes:number;
 interruptionMinutes:number;
 otherMinutes:number;
 notes:string;
};

type CoreRepairEstimate=Pick<RepairTimeEstimate,"repairMinutes"|"diagnosticMinutes"|"accessMinutes">;
type EstimateRule={pattern:RegExp;estimate:CoreRepairEstimate};

export const MINIMUM_REPAIR_MINUTES=30;

const CATEGORY_REPAIR_MINUTES:Record<string,number>={
 "A/C and HVAC":90,
 "Engine":240,
 "Cooling System":180,
 "Transmission":240,
 "Suspension":180,
 "Steering":120,
 "Brakes":180,
 "Tires and Wheels":60,
 "Battery, Starting and Charging":90,
 "Electrical / Multiplex":120,
 "Tech Services":90,
 "Amerex":120,
 "Fuel Delivery":180,
 "No Start":30, /* legacy category, kept so an unmigrated read still estimates sensibly */
 "Doors, Ramp and Lift":180,
 "Lights and Fixtures":60,
 "Bodywork":240,
 "Air System":180,
 "Inspection":390,
 "Preventive Maintenance":300,
 "Interior Cleaning":60,
 "Miscellaneous":60,
};

const SPECIFIC_ESTIMATE_RULES:EstimateRule[]=[
 {pattern:/A\/C and HVAC - (Compressor|Evaporator core|Condenser core)$/i,estimate:{repairMinutes:900,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/A\/C and HVAC - /i,estimate:{repairMinutes:90,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/Engine - Check-engine diagnosis$/i,estimate:{repairMinutes:120,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/Engine - Rear main seal$/i,estimate:{repairMinutes:900,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/(Engine - Spark plugs|Inspection - Spark Plug Refresh)$/i,estimate:{repairMinutes:300,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/(Engine - Valve adjustment|Inspection - Valve Adjustment)$/i,estimate:{repairMinutes:360,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Inspection - Valve Adjustment and Spark Plug Refresh$/i,estimate:{repairMinutes:660,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Inspection - (A-6|A-15|B-12|B-18)$/i,estimate:{repairMinutes:390,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Inspection - C-24$/i,estimate:{repairMinutes:720,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Tires and Wheels - (Flat \/ air leak|Tire replacement|Tire wear)$/i,estimate:{repairMinutes:60,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Battery, Starting and Charging - Jump \/ boost bus$/i,estimate:{repairMinutes:30,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Battery, Starting and Charging - Battery replacement$/i,estimate:{repairMinutes:120,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Battery, Starting and Charging - Starting \/ charging diagnosis$/i,estimate:{repairMinutes:0,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/Battery, Starting and Charging - (Battery drain|No crank)$/i,estimate:{repairMinutes:30,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/Battery, Starting and Charging - (Crank no start|Intermittent no start|Only front start|Only rear start|Fuel-related no start|Electrical no start)$/i,estimate:{repairMinutes:30,diagnosticMinutes:90,accessMinutes:0}},
 /* Records logged before No Start merged into Battery, Starting and Charging. */
 {pattern:/No Start - (Cranks \/ no start|Intermittent no start|Starting-system diagnosis|Fuel-related no start|Electrical no start|Other no-start diagnosis)$/i,estimate:{repairMinutes:30,diagnosticMinutes:90,accessMinutes:0}},
 {pattern:/Brakes - Front brake pads$/i,estimate:{repairMinutes:180,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Brakes - (Brake rotors|Rotor \/ drum)$/i,estimate:{repairMinutes:480,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Brakes - Rear shoes and drums$/i,estimate:{repairMinutes:720,diagnosticMinutes:0,accessMinutes:0}},
 {pattern:/Brakes - ABS warning$/i,estimate:{repairMinutes:60,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/Electrical \/ Multiplex - MOD light$/i,estimate:{repairMinutes:60,diagnosticMinutes:60,accessMinutes:0}},
 {pattern:/Engine - Engine replacement$/i,estimate:{repairMinutes:960,diagnosticMinutes:60,accessMinutes:60}},
 {pattern:/Engine - Internal engine repair$/i,estimate:{repairMinutes:720,diagnosticMinutes:60,accessMinutes:60}},
 {pattern:/Transmission - Transmission replacement$/i,estimate:{repairMinutes:720,diagnosticMinutes:60,accessMinutes:60}},
 {pattern:/Bodywork - Accident damage$/i,estimate:{repairMinutes:600,diagnosticMinutes:30,accessMinutes:60}},
 {pattern:/Tires and Wheels - Wheel-end repair$/i,estimate:{repairMinutes:300,diagnosticMinutes:30,accessMinutes:30}},
 {pattern:/Doors, Ramp and Lift - (Wheelchair ramp|Wheelchair lift)$/i,estimate:{repairMinutes:300,diagnosticMinutes:60,accessMinutes:30}},
 {pattern:/Inspection - Hub \/ Trans \/ Diff Refill \(Three-Piece\)$/i,estimate:{repairMinutes:360,diagnosticMinutes:0,accessMinutes:30}},
];

const DIAGNOSTIC_PATTERN=/diagnos|intermittent|unknown|warning|no start|no crank|loss of power|communication|multiplex|drain|noise|vibration|smell|leak|will not|won't|controls|electrical/i;

function safeMinutes(value:unknown,fallback:number){
 const parsed=typeof value==="number"?value:Number(value);
 return Number.isFinite(parsed)?Math.max(0,Math.min(2400,Math.round(parsed))):fallback;
}

export function recommendedCoreEstimate(category:string,repair:string):CoreRepairEstimate{
 const description=[category,repair].filter(Boolean).join(" - ");
 if(!description)return {repairMinutes:MINIMUM_REPAIR_MINUTES,diagnosticMinutes:0,accessMinutes:0};
 const exact=SPECIFIC_ESTIMATE_RULES.find(rule=>rule.pattern.test(description));
 if(exact)return {...exact.estimate};
 const heavy=/replacement|internal engine|transmission|bodywork|accident|wheel-end/i.test(description);
 return {
  repairMinutes:CATEGORY_REPAIR_MINUTES[category]??60,
  diagnosticMinutes:DIAGNOSTIC_PATTERN.test(description)?60:0,
  accessMinutes:heavy?60:30,
 };
}

export function recommendedRepairMinutes(category:string,repair:string){
 return recommendedCoreEstimate(category,repair).repairMinutes;
}

export function recommendedDiagnosticMinutes(category:string,repair:string){
 return recommendedCoreEstimate(category,repair).diagnosticMinutes;
}

export function recommendedAccessMinutes(category:string,repair:string){
 return recommendedCoreEstimate(category,repair).accessMinutes;
}

export function normalizeRepairTimeEstimate(value:unknown,category:string,repair:string):RepairTimeEstimate{
 const source=value&&typeof value==="object"?value as Partial<RepairTimeEstimate>:{};
 const recommended=recommendedCoreEstimate(category,repair);
 return {
  repairMinutes:safeMinutes(source.repairMinutes,recommended.repairMinutes),
  diagnosticMinutes:safeMinutes(source.diagnosticMinutes,recommended.diagnosticMinutes),
  accessMinutes:safeMinutes(source.accessMinutes,recommended.accessMinutes),
  complicationMinutes:safeMinutes(source.complicationMinutes,0),
  heatMinutes:safeMinutes(source.heatMinutes,0),
  interruptionMinutes:safeMinutes(source.interruptionMinutes,0),
  otherMinutes:safeMinutes(source.otherMinutes,0),
  notes:typeof source.notes==="string"?source.notes:"",
 };
}

export function resetCoreRepairEstimate(current:RepairTimeEstimate,category:string,repair:string):RepairTimeEstimate{
 const recommended=normalizeRepairTimeEstimate(undefined,category,repair);
 return {...current,repairMinutes:recommended.repairMinutes,diagnosticMinutes:recommended.diagnosticMinutes,accessMinutes:recommended.accessMinutes};
}

export function repairTimeTotal(estimate:RepairTimeEstimate){
 const total=estimate.repairMinutes+estimate.diagnosticMinutes+estimate.accessMinutes+estimate.complicationMinutes+estimate.heatMinutes+estimate.interruptionMinutes+estimate.otherMinutes;
 return Math.max(MINIMUM_REPAIR_MINUTES,total);
}

export function formatRepairTime(minutes:number){
 const safe=Math.max(0,Math.round(minutes));
 const hours=Math.floor(safe/60),remainder=safe%60;
 if(!hours)return remainder+"m";
 return remainder?hours+"h "+remainder+"m":hours+"h";
}
