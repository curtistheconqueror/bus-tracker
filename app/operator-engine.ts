import {candidateBusNumbers,resolveBusNumber} from "./bus-number-resolver.ts";
import {REPAIR_OPTIONS,type DefectOperability,type StructuredDefect} from "./repair-catalog.ts";
import {analyzeFleetQuestion,findOperatorArea,findOperatorAreaMentions,type FleetInsightBus} from "./fleet-intelligence.ts";
import type {FleetStatus} from "./smart-status.ts";

export type OperatorBus=FleetInsightBus;

export type OperatorArea={name:string;slots:string[]};
export type OperatorSelectionContext={busIds:string[];busNumbers:string[];label:string};

type DefectDraft=Omit<StructuredDefect,"id">;
export type OperatorBatchItem={busId:string;busNumber:string;areaName?:string;status?:FleetStatus};

export type OperatorPlan=
 | {kind:"locate";requiresConfirmation:false;busIds:string[];busNumbers:string[];summary:string}
 | {kind:"analysis";requiresConfirmation:false;busIds:string[];busNumbers:string[];selectionLabel:string;summary:string;response:string}
 | {kind:"inspect";requiresConfirmation:false;busId:string;busNumber:string;summary:string;response:string}
 | {kind:"move";requiresConfirmation:true;busId:string;busNumber:string;areaName:string;summary:string}
 | {kind:"bulkMove";requiresConfirmation:true;busIds:string[];busNumbers:string[];areaName:string;status?:FleetStatus;selectionLabel:string;summary:string}
 | {kind:"batch";requiresConfirmation:true;items:OperatorBatchItem[];summary:string}
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

function busQueries(command:string){
 const matches=[...command.matchAll(/\b(\d{5}|\d{2})\b/g)];
 return matches.filter(match=>{const before=command.slice(Math.max(0,(match.index||0)-12),match.index||0);return !/\bbay\s*$/i.test(before)}).map(match=>match[1]);
}
function resolveMany(fleet:OperatorBus[],queries:string[]):{buses?:OperatorBus[];message?:string}{
 const buses:OperatorBus[]=[];
 for(const query of queries){
  const resolution=resolveBusNumber(fleet,query);
  if(resolution.kind==="invalid")return {message:"Enter a complete fleet number or exactly two ending digits for "+query+"."};
  if(resolution.kind==="not-found")return {message:"I could not find a bus matching "+query+" on this device."};
  if(resolution.kind==="ambiguous")return {message:query+" matches multiple buses: "+candidateBusNumbers(resolution.matches).join(", ")+". Use the complete fleet number before I make a group change."};
  if(buses.some(bus=>bus.id===resolution.bus.id))return {message:"The command points to Bus "+resolution.bus.n+" more than once. Remove the duplicate number and try again."};
  buses.push(resolution.bus);
 }
 return {buses};
}

function statusFromCommand(command:string):FleetStatus|undefined{
 const text=normalized(command);
 if(/\b(?:decommissioned|down indefinitely|dark gr[ae]y)\b/.test(text))return "decommissioned";
 if(/\b(?:unknown|mystery)\b/.test(text))return "unknown";
 if(/\b(?:out of service|oos|red)\b/.test(text))return "out";
 if(/\b(?:work in progress|wip|yellow)\b/.test(text))return "shop";
 if(/\b(?:in service with defects|serviceable defects|green)\b/.test(text))return "defect";
 if(/\b(?:fully in service|no defects|blue)\b/.test(text))return "service";
 if(/\b(?:mark|set|update|change)\b/.test(text)&&/\bin service\b/.test(text))return "service";
 return undefined;
}
function statusLabel(status:FleetStatus){return STATUS_LABELS[status]||status}

function capacityMessage(area:OperatorArea,needed:number,open:number){return area.name+" has "+open+" open spaces but "+needed+" are needed. Nothing was prepared."+(area.name==="WAITING AREA"?" Clear or reassign buses already in the Waiting Area before trying again.":" Use the WAITING AREA if the buses need to be recorded before you can sort them.")}

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

 const areaMentions=findOperatorAreaMentions(command,areas),baseMoveAction=/\b(move|relocate|place|send|put|transfer|shift|bring|return|move back|put back)\b/.test(text),moveAction=baseMoveAction||(/\badd\b/.test(text)&&areaMentions.length>0),statusAction=/\b(mark|set|update|change)\b/.test(text)&&/\b(status|blue|green|yellow|red|in service|out of service|work in progress|wip|decommissioned|mystery|unknown)\b/.test(text),desiredStatus=statusFromCommand(command),explicitQueries=busQueries(command);
 if(moveAction&&!explicitQueries.length&&areaMentions.length>=2){
  const source=areaMentions[0].area,destination=areaMentions[areaMentions.length-1].area;
  if(source.name===destination.name)return {kind:"message",message:"The source and destination are both "+source.name+". Name a different destination area."};
  const selected=fleet.filter(bus=>source.slots.includes(bus.l)).sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})||a.id.localeCompare(b.id));
  if(!selected.length)return {kind:"message",message:source.name+" is currently empty on this device, so there are no buses to move."};
  const already=selected.filter(bus=>destination.slots.includes(bus.l)).length,needed=selected.length-already,open=destination.slots.filter(slot=>!fleet.some(bus=>bus.l===slot)).length;
  if(open<needed)return {kind:"message",message:capacityMessage(destination,needed,open)};
  return {kind:"plan",plan:{kind:"bulkMove",requiresConfirmation:true,busIds:selected.map(bus=>bus.id),busNumbers:selected.map(bus=>bus.n),areaName:destination.name,status:desiredStatus,selectionLabel:"all buses in "+source.name,summary:"Move all "+selected.length+" buses from "+source.name+" to the first available spaces in "+destination.name+(desiredStatus?" and set status to "+statusLabel(desiredStatus):"")}};
 }
 if(moveAction&&!explicitQueries.length&&/\b(all|every)\b/.test(text)&&areaMentions.length===1)return {kind:"message",message:"I found the destination "+areaMentions[0].area.name+", but I need the source area too. Try: Move all buses from CNG West to the Waiting Area."};
 const repeatedClauses=command.split(/;|,(?=\s*(?:move|relocate|place|send|put|transfer|shift|bring|return|add)\b)/i).map(clause=>clause.trim()).filter(Boolean);
 if(repeatedClauses.length>1&&repeatedClauses.every(clause=>/\b(move|relocate|place|send|put|transfer|shift|bring|return|add)\b/i.test(clause))){
  const items:OperatorBatchItem[]=[];
  for(const clause of repeatedClauses){
   const queries=busQueries(clause),resolved=resolveMany(fleet,queries),area=areaFromCommand(clause,areas),clauseStatus=statusFromCommand(clause);
   if(!queries.length)return {kind:"message",message:"Each movement instruction needs at least one bus number."};
   if(!resolved.buses)return {kind:"message",message:resolved.message||"I could not resolve every bus in that command."};
   if(!area)return {kind:"message",message:"I could not identify the destination in: "+clause+"."};
   items.push(...resolved.buses.map(bus=>({busId:bus.id,busNumber:bus.n,areaName:area.name,status:clauseStatus})));
  }
  if(new Set(items.map(item=>item.busId)).size!==items.length)return {kind:"message",message:"A bus appears in more than one movement instruction. Give each bus only one destination."};
  for(const area of areas){
   const arriving=items.filter(item=>item.areaName===area.name).filter(item=>!area.slots.includes(fleet.find(bus=>bus.id===item.busId)!.l)).length;
   const leaving=items.filter(item=>item.areaName!==area.name).filter(item=>area.slots.includes(fleet.find(bus=>bus.id===item.busId)!.l)).length;
   const open=area.slots.filter(slot=>!fleet.some(bus=>bus.l===slot)).length+leaving;
   if(arriving>open)return {kind:"message",message:capacityMessage(area,arriving,open)};
  }
  const summary=items.map(item=>"Bus "+item.busNumber+" to "+item.areaName+(item.status?" as "+statusLabel(item.status):"")).join("; ");
  return {kind:"plan",plan:{kind:"batch",requiresConfirmation:true,items,summary}};
 }
 if(explicitQueries.length&&(explicitQueries.length>1||statusAction||(moveAction&&Boolean(desiredStatus)))){
  const resolved=resolveMany(fleet,explicitQueries);
  if(!resolved.buses)return {kind:"message",message:resolved.message||"I could not resolve every bus in that command."};
  const area=moveAction?areaFromCommand(command,areas):undefined;
  if(moveAction&&!area)return {kind:"message",message:"I found the buses, but I could not identify the destination area. Try On Road, Main Garage, CNG East, CNG West, or Waiting Area."};
  if(!moveAction&&!desiredStatus)return {kind:"message",message:"Tell me which status to apply to those buses."};
  if(area){
   const already=resolved.buses.filter(bus=>area.slots.includes(bus.l)).length,needed=resolved.buses.length-already,open=area.slots.filter(slot=>!fleet.some(bus=>bus.l===slot)).length;
   if(open<needed)return {kind:"message",message:capacityMessage(area,needed,open)};
  }
  const items=resolved.buses.map(bus=>({busId:bus.id,busNumber:bus.n,areaName:area?.name,status:desiredStatus}));
  const action=area?"Move "+resolved.buses.map(bus=>bus.n).join(", ")+" to "+area.name:"Update "+resolved.buses.map(bus=>bus.n).join(", ");
  return {kind:"plan",plan:{kind:"batch",requiresConfirmation:true,items,summary:action+(desiredStatus?" and set status to "+statusLabel(desiredStatus):"")}};
 }

 const groupMove=moveAction&&(/\b(those|them|these|selected|that group|the group)\b/.test(text)||Boolean(context?.busIds.length&&!busQuery(command)));
 if(groupMove){
  if(!context?.busIds.length)return {kind:"message",message:"I do not have a remembered fleet group yet. Ask a question such as “Which buses have been sitting for 8+ hours?” first."};
  const area=areaFromCommand(command,areas);
  if(!area)return {kind:"message",message:"I remember "+context.busIds.length+" buses, but I could not identify the destination area. Try On Road, CNG East, CNG West, Shop Wall, or Main Garage."};
  const selected=context.busIds.map(id=>fleet.find(bus=>bus.id===id)).filter(Boolean) as OperatorBus[];
  if(selected.length!==context.busIds.length)return {kind:"message",message:"The remembered group changed after the last answer. Ask the fleet question again before relocating it."};
  const already=selected.filter(bus=>area.slots.includes(bus.l)).length,needed=selected.length-already,open=area.slots.filter(slot=>!fleet.some(bus=>bus.l===slot)).length;
  if(open<needed)return {kind:"message",message:capacityMessage(area,needed,open)};
  if(!needed)return {kind:"message",message:"All "+selected.length+" remembered buses are already in "+area.name+"."};
  return {kind:"plan",plan:{kind:"bulkMove",requiresConfirmation:true,busIds:selected.map(bus=>bus.id),busNumbers:selected.map(bus=>bus.n),areaName:area.name,status:desiredStatus,selectionLabel:context.label,summary:"Move "+needed+" of "+selected.length+" remembered buses ("+context.label+") to the first available spaces in "+area.name+(already?" and leave "+already+" already there":"")+(desiredStatus?" and set status to "+statusLabel(desiredStatus):"")}};
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

 if(moveAction){
  const area=areaFromCommand(command,areas);
  if(!area)return {kind:"message",message:"I found Bus "+bus.n+", but I could not identify the destination area. Try a label such as CNG East, Shop Wall, Main Garage, or On Road."};
  if(area.slots.includes(bus.l))return {kind:"message",message:"Bus "+bus.n+" is already in "+area.name+"."};
  if(!area.slots.some(slot=>!fleet.some(item=>item.l===slot)))return {kind:"message",message:area.name+" is full on this device, so I did not prepare a move. Use the WAITING AREA if the bus needs to be recorded before you can sort it."};
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
