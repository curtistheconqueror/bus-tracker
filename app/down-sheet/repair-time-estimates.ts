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

const CATEGORY_REPAIR_MINUTES:Record<string,number>={
 "A/C and HVAC":240,
 "Engine":300,
 "Cooling System":240,
 "Transmission":300,
 "Suspension":240,
 "Steering":180,
 "Brakes":240,
 "Tires and Wheels":120,
 "Battery, Starting and Charging":150,
 "Electrical / Multiplex":210,
 "Tech Services":150,
 "Amerex":210,
 "Fuel Delivery":210,
 "No Start":210,
 "Doors, Ramp and Lift":240,
 "Lights and Fixtures":120,
 "Bodywork":300,
 "Air System":240,
 "Inspection":240,
 "Preventive Maintenance":300,
 "Miscellaneous":180,
};

const LONG_REPAIR_RULES:[RegExp,number][]=[
 [/engine replacement/i,960],
 [/internal engine repair/i,720],
 [/transmission replacement/i,720],
 [/accident damage/i,600],
 [/body panel|interior body repair|paint/i,480],
 [/wheel-end repair/i,300],
 [/wheelchair ramp|wheelchair lift/i,300],
 [/three-piece|hub.*trans.*diff/i,360],
 [/valve adjustment|spark plug/i,360],
];

const DIAGNOSTIC_PATTERN=/diagnos|intermittent|unknown|warning|no start|no crank|loss of power|communication|multiplex|drain|noise|vibration|smell|leak|will not|won't|controls|electrical/i;

function safeMinutes(value:unknown,fallback:number){
 const parsed=typeof value==="number"?value:Number(value);
 return Number.isFinite(parsed)?Math.max(0,Math.min(2400,Math.round(parsed))):fallback;
}

export function recommendedRepairMinutes(category:string,repair:string){
 if(!category&&!repair)return 0;
 const description=[category,repair].filter(Boolean).join(" - ");
 const specific=LONG_REPAIR_RULES.find(([pattern])=>pattern.test(description));
 return specific?.[1]??CATEGORY_REPAIR_MINUTES[category]??180;
}

export function recommendedDiagnosticMinutes(category:string,repair:string){
 if(!category&&!repair)return 0;
 return DIAGNOSTIC_PATTERN.test([category,repair].join(" - "))?90:45;
}

export function recommendedAccessMinutes(category:string,repair:string){
 if(!category&&!repair)return 0;
 const description=[category,repair].join(" - ");
 return /replacement|internal engine|transmission|bodywork|accident|wheel-end/i.test(description)?90:60;
}

export function normalizeRepairTimeEstimate(value:unknown,category:string,repair:string):RepairTimeEstimate{
 const source=value&&typeof value==="object"?value as Partial<RepairTimeEstimate>:{};
 return {
  repairMinutes:safeMinutes(source.repairMinutes,recommendedRepairMinutes(category,repair)),
  diagnosticMinutes:safeMinutes(source.diagnosticMinutes,recommendedDiagnosticMinutes(category,repair)),
  accessMinutes:safeMinutes(source.accessMinutes,recommendedAccessMinutes(category,repair)),
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
 return estimate.repairMinutes+estimate.diagnosticMinutes+estimate.accessMinutes+estimate.complicationMinutes+estimate.heatMinutes+estimate.interruptionMinutes+estimate.otherMinutes;
}

export function formatRepairTime(minutes:number){
 const safe=Math.max(0,Math.round(minutes));
 const hours=Math.floor(safe/60),remainder=safe%60;
 if(!hours)return remainder+"m";
 return remainder?hours+"h "+remainder+"m":hours+"h";
}