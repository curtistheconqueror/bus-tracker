export type DefectState="open"|"deferred"|"completed";
export type DefectOperability="service"|"down";

export type StructuredDefect={
 id:string;
 category:string;
 issue:string;
 details:string;
 operability:DefectOperability;
 state:DefectState;
};

export const REPAIR_OPTIONS:Record<string,string[]>={
 "A/C and HVAC":["No cooling","Compressor","Blower motor","Refrigerant leak","Controls / electrical","Heater / defroster","Other A/C repair"],
 "Engine":["Check-engine diagnosis","Loss of power","Oil leak","Abnormal noise","Engine replacement","Internal engine repair","Other engine repair"],
 "Cooling System":["Overheating","Coolant leak","Radiator","Water pump","Cooling fan","Hoses / fittings","Other cooling repair"],
 "Transmission":["Will not shift","Slipping","Transmission leak","Control / communication fault","Transmission replacement","Other transmission repair"],
 "Suspension":["Air bag","Shock / strut","Ride-height issue","Suspension leak","Bushing / linkage","Other suspension repair"],
 "Steering":["Steering pull","Power steering leak","Steering gear","Tie rod / linkage","Alignment","Other steering repair"],
 "Brakes":["Brake inspection","Pads / shoes","Rotor / drum","Air brake fault","ABS warning","Parking brake","Other brake repair"],
 "Tires and Wheels":["Flat / air leak","Tire replacement","Wheel / rim","Wheel-end repair","Tire wear","Other tire repair"],
 "Battery, Starting and Charging":["Battery replacement","Battery drain","No crank","Starter","Alternator / charging","Cables / terminals","Other starting or charging repair"],
 "Electrical / Multiplex":["Horn","Multiplex fault","Communication fault","Wiring repair","Fuse / relay","Module replacement","Intermittent electrical","Other electrical repair"],
 "Tech Services":["Farebox","Ventra","MDT Screen","Destination Sign","Other Tech Services"],
 "Fuel Delivery":["Fuel leak","Low fuel pressure","Fuel pump","Injector","Fuel filter","Fuel control fault","Other fuel repair"],
 "No Start":["No crank","Cranks / no start","Intermittent no start","Starting-system diagnosis","Fuel-related no start","Electrical no start","Other no-start diagnosis"],
 "Doors, Ramp and Lift":["Front door","Rear door","Wheelchair ramp","Wheelchair lift","Interlock","Door controls","Other accessibility repair"],
 "Lights and Fixtures":["Headlights","Brake / tail lights","Turn signals","Interior lights","Warning lights","Mirrors / fixtures","Other light or fixture"],
 "Bodywork":["Accident damage","Body panel","Bumper","Glass / windshield","Mirror","Paint","Interior body repair","Other bodywork"],
 "Air System":["Air leak","Air compressor","Air dryer","Air tank / valve","Builds air slowly","Air-system warning","Other air-system repair"],
 "Inspection":["A-6","A-15","B-12","B-18","C-24","Hub / Trans / Diff Refill (Three-Piece)","Valve Adjustment and Spark Plug Refresh"],
 "Preventive Maintenance":["Oil and filter service","Lubrication","Fluid service","Scheduled campaign","Seasonal preparation","Other preventive maintenance"],
 "Miscellaneous":["Driver-reported defect","Roadcall follow-up","Cleaning / sanitation","Noise / vibration","Unknown diagnosis","Manual entry","Other repair"],
};

export function normalizeDefects(value:unknown,legacyText="",identity="bus"):StructuredDefect[]{
 if(Array.isArray(value))return value.filter(item=>item&&typeof item==="object").map((item,index)=>{
  const defect=item as Partial<StructuredDefect>;
  return {id:defect.id||identity+"-defect-"+index,category:defect.category||"Miscellaneous",issue:defect.issue||"Driver-reported defect",details:defect.details||"",operability:defect.operability==="down"?"down":"service",state:defect.state==="completed"?"completed":defect.state==="deferred"?"deferred":"open"};
 });
 const legacy=legacyText.trim();
 return legacy?[{id:identity+"-legacy-defect",category:"Miscellaneous",issue:"Driver-reported defect",details:legacy,operability:"service",state:"open"}]:[];
}

export function isUnresolved(defect:StructuredDefect){return defect.state!=="completed"}
export function defectLabel(defect:StructuredDefect){return [defect.category,defect.issue,defect.details].map(value=>value.trim()).filter(Boolean).join(" — ")}
export function defectSummary(defects:StructuredDefect[]){return defects.filter(isUnresolved).map(defectLabel).join("; ")}
