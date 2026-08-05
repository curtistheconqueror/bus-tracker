import {candidateBusNumbers,resolveBusNumber} from "./bus-number-resolver.ts";
import {REPAIR_OPTIONS,type DefectOperability,type StructuredDefect} from "./repair-catalog.ts";
import {analyzeFleetQuestion,findOperatorArea,type FleetInsightBus} from "./fleet-intelligence.ts";

export type OperatorBus=FleetInsightBus;

export type OperatorArea={name:string;slots:string[]};
export type OperatorSelectionContext={busIds:string[];busNumbers:string[];label:string};

type DefectDraft=Omit<StructuredDefect,"id">;

export type OperatorPlan=
 | {kind:"locate";requiresConfirmation:false;busIds:string[];busNumbers:string[];summary:string}
 | {kind:"analysis";requiresConfirmation:false;busIds:string[];busNumbers:string[];selectionLabel:string;summary:string;response:string}
 | {kind:"inspect";requiresConfirmation:false;busId:string;busNumber:string;summary:string;response:string}
 | {kind:"move";requiresConfirmation:true;busId:string;busNumber:string;areaName:string;summary:string}
 | {kind:"bulkMove";requiresConfirmation:true;busIds:string[];busNumbers:string[];areaName:string;selectionLabel:string;summary:string}
 | {kind:"downsheet";requiresConfirmation:true;busId:string;busNumber:string;selected:boolean;summary:string}
 | {kind:"defect";requiresConfirmation:true;busId:string;busNumber:string;defect:DefectDraft;flag?:"checkEngine"|"noHorn"|"badRampKneeler";summary:string};

export type OperatorPlanningResult=
 | {kind:"plan";plan:OperatorPlan}
 | {kind:"message";message:string};

const STATUS_LABELS:Record<string,string>={service:"In Service / On Road",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown / Mystery"};

function normalized(value:string){return value.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}

function busQuery(command:string){
 const explicit=command.match(/\bbus\s*(?:number|no\.?|#)?\s*(\d+)\b/i);
 if(explicit)return explicit[1];
 const fallback=command.match(/\b(\d{2}|\d{5})\b/);
 return fallback?.[1]||"";
}

function resolveOne(fleet:OperatorBus[],command:string):{bus?:OperatorBus;query:string;message?:string}{
 const query=busQuery(command);
 if(!query)return {query,message:"Tell me which bus you mean. Use the full fleet number or its last two digits."};
 const resolution=resolveBusNumber(fleet,query);
 if(resolution.kind==="invalid")return {query,message:"Enter a complete fleet number or exactly two ending digits."};
 if(resolution.kind==="not-found")return {query,message:"I could not find a bus matching "+query+" on this device."};
 if(resolution.kind==="ambiguous")return {query,message:query+" matches multiple buses: "+candidateBusNumbers(resolution.matches).join(", ")+". Use the complete fleet number before I make a change."};
 return {query,bus:resolution.bus};
}

function areaFromCommand(command:string,areas:OperatorArea[]){
 return findOperatorArea(command,areas);
}

const DEFECT_CHOICES=Object.entries(REPAIR_OPTIONS).flatMap(([category,issues])=>issues.map(issue=>({category,issue,key:normalized(issue)}))).sort((a,b)=>b.key.length-a.key.length);

function defectFromCommand(command:string):{defect:DefectDraft;flag?:"checkEngine"|"noHorn"|"badRampKneeler"}|null{
 const text=normalized(command);
 const special=text.includes("check engine")?{category:"Engine",issue:"Check-engine diagnosis",flag:"checkEngine" as const}:text.includes("no horn")||/\bhorn\b/.test(text)?{category:"Electrical / Multiplex",issue:"Horn",flag:"noHorn" as const}:text.includes("bad ramp")||text.includes("kneeler")?{category:"Doors, Ramp and Lift",issue:"Wheelchair ramp",flag:"badRampKneeler" as const}:null;
 const matched=special||DEFECT_CHOICES.find(choice=>text.includes(choice.key));
 if(!matched)return null;
 const downing=/\b(downing|must be removed|out of service|unsafe)\b/.test(text);
 return {defect:{category:matched.category,issue:matched.issue,details:"",operability:(downing?"down":"service") as DefectOperability,state:"open"},flag:matched.flag};
}

function areaLabel(bus:OperatorBus,areas:OperatorArea[]){return areas.find(area=>area.slots.includes(bus.l))?.name||"an unassigned or overflow location"}

export function planOperatorCommand(command:string,fleet:OperatorBus[],areas:OperatorArea[],context:OperatorSelectionContext|null=null,now=Date.now()):OperatorPlanningResult{
 const text=normalized(command);
 if(!text)return {kind:"message",message:"Type a command, such as “Locate bus 25” or “Move bus 17525 to CNG East.”"};

 const groupMove=/\b(move|relocate|place|send|put)\b/.test(text)&&(/\b(those|them|these|selected|that group|the group)\b/.test(text)||Boolean(context?.busIds.length&&!busQuery(command)));
 if(groupMove){
  if(!context?.busIds.length)return {kind:"message",message:"I do not have a remembered fleet group yet. Ask a question such as “Which buses have been sitting for 8+ hours?” first."};
  const area=areaFromCommand(command,areas);
  if(!area)return {kind:"message",message:"I remember "+context.busIds.length+" buses, but I could not identify the destination area. Try On Road, CNG East, CNG West, Shop Wall, or Main Garage."};
  const selected=context.busIds.map(id=>fleet.find(bus=>bus.id===id)).filter(Boolean) as OperatorBus[];
  if(selected.length!==context.busIds.length)return {kind:"message",message:"The remembered group changed after the last answer. Ask the fleet question again before relocating it."};
  const already=selected.filter(bus=>area.slots.includes(bus.l)).length,needed=selected.length-already,open=area.slots.filter(slot=>!fleet.some(bus=>bus.l===slot)).length;
  if(open<needed)return {kind:"message",message:area.name+" has "+open+" open spaces but "+needed+" are needed for the remembered group. Nothing was prepared."};
  if(!needed)return {kind:"message",message:"All "+selected.length+" remembered buses are already in "+area.name+"."};
  return {kind:"plan",plan:{kind:"bulkMove",requiresConfirmation:true,busIds:selected.map(bus=>bus.id),busNumbers:selected.map(bus=>bus.n),areaName:area.name,selectionLabel:context.label,summary:"Move "+needed+" of "+selected.length+" remembered buses ("+context.label+") to the first available spaces in "+area.name+(already?" and leave "+already+" already there":"")}};
 }

 const insight=analyzeFleetQuestion(command,fleet,areas,now);
 if(insight)return {kind:"plan",plan:{kind:"analysis",requiresConfirmation:false,summary:"Analyze "+insight.selectionLabel,response:insight.response,busIds:insight.busIds,busNumbers:insight.busNumbers,selectionLabel:insight.selectionLabel}};

 const resolved=resolveOne(fleet,command);
 const isLocate=/\b(locate|find|highlight)\b/.test(text);
 if(isLocate){
  const query=resolved.query;
  if(!query)return {kind:"message",message:resolved.message||"Tell me which bus to locate."};
  const resolution=resolveBusNumber(fleet,query);
  if(resolution.kind==="invalid"||resolution.kind==="not-found")return {kind:"message",message:resolved.message||"I could not find that bus."};
  const matches=resolution.kind==="ambiguous"?resolution.matches:[resolution.bus];
  const numbers=candidateBusNumbers(matches);
  return {kind:"plan",plan:{kind:"locate",requiresConfirmation:false,busIds:matches.map(bus=>bus.id),busNumbers:numbers,summary:matches.length===1?"Locate Bus "+numbers[0]:"Highlight all matches: "+numbers.join(", ")}};
 }

 if(!resolved.bus)return {kind:"message",message:resolved.message||"Tell me which bus you mean."};
 const bus=resolved.bus;

 if(/\b(move|relocate|place|send|put)\b/.test(text)){
  const area=areaFromCommand(command,areas);
  if(!area)return {kind:"message",message:"I found Bus "+bus.n+", but I could not identify the destination area. Try a label such as CNG East, Shop Wall, Main Garage, or On Road."};
  if(area.slots.includes(bus.l))return {kind:"message",message:"Bus "+bus.n+" is already in "+area.name+"."};
  if(!area.slots.some(slot=>!fleet.some(item=>item.l===slot)))return {kind:"message",message:area.name+" is full on this device, so I did not prepare a move."};
  return {kind:"plan",plan:{kind:"move",requiresConfirmation:true,busId:bus.id,busNumber:bus.n,areaName:area.name,summary:"Move Bus "+bus.n+" from "+areaLabel(bus,areas)+" to the first open space in "+area.name}};
 }

 if(text.includes("down sheet")||text.includes("downsheet")){
  const remove=/\b(remove|take|clear|complete|off)\b/.test(text);
  const selected=!remove;
  if(bus.down===selected)return {kind:"message",message:"Bus "+bus.n+(selected?" is already marked on the down sheet.":" is already off the active down sheet.")};
  return {kind:"plan",plan:{kind:"downsheet",requiresConfirmation:true,busId:bus.id,busNumber:bus.n,selected,summary:(selected?"Add Bus ":"Complete and remove Bus ")+bus.n+(selected?" on the active down sheet":" from the active down sheet")}};
 }

 if(/\b(defect|issue|check engine|horn|ramp|kneeler)\b/.test(text)){
  const selected=defectFromCommand(command);
  if(!selected)return {kind:"message",message:"I found Bus "+bus.n+", but I could not match the requested repair to the approved defect catalog. Try a specific item such as Check-engine diagnosis, Horn, No cooling, ABS warning, or Wheelchair ramp."};
  return {kind:"plan",plan:{kind:"defect",requiresConfirmation:true,busId:bus.id,busNumber:bus.n,defect:selected.defect,flag:selected.flag,summary:"Add "+selected.defect.category+" — "+selected.defect.issue+" to Bus "+bus.n+(selected.defect.operability==="down"?" as a downing defect":" as a serviceable defect")}};
 }

 if(/\b(where|status|inspect|tell|what)\b/.test(text)){
  const repair=bus.pendingRepair?.trim()?" Pending repair: "+bus.pendingRepair.trim()+".":" No pending repair is recorded.";
  return {kind:"plan",plan:{kind:"inspect",requiresConfirmation:false,busId:bus.id,busNumber:bus.n,summary:"Inspect Bus "+bus.n,response:"Bus "+bus.n+" is in "+areaLabel(bus,areas)+" with status “"+(STATUS_LABELS[bus.s]||bus.s)+".”"+repair+(bus.down?" It is on the active down sheet.":" It is not marked on the active down sheet.")}};
 }

 return {kind:"message",message:"I found Bus "+bus.n+", but I need an action. I can answer fleet questions, inspect or locate buses, move them to an area, add a catalog defect, or add/remove them from the down sheet."};
}
