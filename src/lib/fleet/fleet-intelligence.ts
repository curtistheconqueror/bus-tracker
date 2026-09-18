import {operationalAgeMs} from "../../../app/operational-time.ts";
import {siteAliases} from "./site-config.ts";

export type FleetInsightBus={
 id:string;
 n:string;
 s:string;
 l:string;
 down:boolean;
 pendingRepair?:string;
 checkEngine?:boolean;
 checkTransmission?:boolean;
 noHorn?:boolean;
 badRampKneeler?:boolean;
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
 defects?:Array<{category?:string;issue?:string;details?:string;state?:string}>;
};

export type FleetInsightArea={name:string;slots:string[]};
export type FleetInsight={response:string;busIds:string[];busNumbers:string[];selectionLabel:string};

const STATUS_LABELS:Record<string,string>={service:"In Service / On Road",defect:"In Service with Defects",shop:"Work in Progress",out:"Out of Service",decommissioned:"Decommissioned",unknown:"Unknown / Mystery"};
/* THE PHRASES A PERSON MIGHT SAY, read from `site-config.ts`.

   Issue #21, Phase 1 step 2, the last consumer.

   THE ORDER IS BEHAVIOUR, NOT PRESENTATION, which is why it travels with the
   config rather than being re-sorted here. `findOperatorArea` below walks this
   list and returns the FIRST area one of whose aliases appears in what was
   typed, so two areas with overlapping aliases are decided by which comes
   first. TROUBLE BAY 11 owns "bay 11" and SHOP BAYS owns "service bay", and
   both sit inside "service bay 11" - the trouble bays are listed ahead of the
   shop bays, so it resolves the way somebody standing in the shop means it.
   Sorted any other way it quietly starts answering SHOP BAYS. */
const AREA_ALIASES:[string,string[]][]=siteAliases();

function normalized(value:string){return value.toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ")}
function ordered(buses:FleetInsightBus[]){return [...buses].sort((a,b)=>a.n.localeCompare(b.n,undefined,{numeric:true})||a.id.localeCompare(b.id))}
function plural(count:number,singular:string,pluralForm=singular+"s"){return count+" "+(count===1?singular:pluralForm)}
function selection(buses:FleetInsightBus[],response:string,label:string):FleetInsight{return {response,busIds:buses.map(bus=>bus.id),busNumbers:buses.map(bus=>bus.n),selectionLabel:label}}
function ageLabel(milliseconds:number){const minutes=Math.floor(milliseconds/60000),hours=Math.floor(minutes/60),days=Math.floor(hours/24);if(days)return days+"d "+hours%24+"h";if(hours)return hours+"h "+minutes%60+"m";return Math.max(0,minutes)+"m"}
function listWithAges(buses:FleetInsightBus[],now:number){const visible=buses.slice(0,12).map(bus=>"Bus "+bus.n+" ("+ageLabel(operationalAgeMs(bus,now))+")"),remaining=buses.length-visible.length;return visible.join(", ")+(remaining?", plus "+remaining+" more":"")}
function simpleList(buses:FleetInsightBus[]){const visible=buses.slice(0,16).map(bus=>bus.n),remaining=buses.length-visible.length;return visible.join(", ")+(remaining?", plus "+remaining+" more":"")}

export function findOperatorArea(command:string,areas:FleetInsightArea[]){
 const haystack=normalized(command);
 for(const [canonical,aliases] of AREA_ALIASES){
  const area=areas.find(item=>item.name===canonical);
  if(area&&aliases.some(alias=>haystack.includes(normalized(alias))))return area;
 }
 return [...areas].sort((a,b)=>normalized(b.name).length-normalized(a.name).length).find(area=>haystack.includes(normalized(area.name)));
}
export function findOperatorAreaMentions(command:string,areas:FleetInsightArea[]){
 const haystack=normalized(command),mentions:{area:FleetInsightArea;index:number}[]=[];
 const remember=(area:FleetInsightArea,phrase:string)=>{const index=haystack.indexOf(normalized(phrase));if(index>=0)mentions.push({area,index})};
 for(const [canonical,aliases] of AREA_ALIASES){
  const area=areas.find(item=>item.name===canonical);
  if(area)aliases.forEach(alias=>remember(area,alias));
 }
 areas.forEach(area=>remember(area,area.name));
 const pairedTroubleBays=haystack.match(/\bbays? 11 (?:and|plus) (?:bay )?12\b/);
 if(pairedTroubleBays?.index!==undefined){
  const bay11=areas.find(area=>area.name==="TROUBLE BAY 11"),bay12=areas.find(area=>area.name==="TROUBLE BAY 12");
  if(bay11)mentions.push({area:bay11,index:pairedTroubleBays.index});
  if(bay12)mentions.push({area:bay12,index:pairedTroubleBays.index+pairedTroubleBays[0].lastIndexOf("12")});
 }
 const earliest=new Map<string,{area:FleetInsightArea;index:number}>();
 mentions.forEach(mention=>{const current=earliest.get(mention.area.name);if(!current||mention.index<current.index)earliest.set(mention.area.name,mention)});
 return [...earliest.values()].sort((a,b)=>a.index-b.index);
}

function statusQuestion(text:string){
 if(/\bdecommissioned\b/.test(text))return "decommissioned";
 if(/\b(?:unknown|mystery)\b/.test(text))return "unknown";
 if(/\b(?:work in progress|wip)\b/.test(text))return "shop";
 if(/\b(?:out of service|oos)\b/.test(text))return "out";
 if(/\b(?:in service with defects|serviceable defects|green buses?)\b/.test(text))return "defect";
 if(/\b(?:blue buses?|fully in service)\b/.test(text))return "service";
 return "";
}

function hasAcIssue(bus:FleetInsightBus){
 const repair=[bus.pendingRepair,...(bus.defects||[]).flatMap(defect=>[defect.category,defect.issue,defect.details])].filter(Boolean).join(" ");
 return /\b(?:a\/c|ac|hvac|air conditioning)\b/i.test(repair);
}

export function analyzeFleetQuestion(command:string,fleet:FleetInsightBus[],areas:FleetInsightArea[],now=Date.now()):FleetInsight|null{
 const text=normalized(command),asks=/\b(?:how many|count|which|show|list|longest|oldest|duplicate|repeated|fleet total|total buses)\b/.test(text);
 if(!asks)return null;

 if(/\b(?:duplicate|duplicates|duplicated|repeated|repeat numbers?)\b/.test(text)){
  const groups=new Map<string,FleetInsightBus[]>();
  fleet.forEach(bus=>groups.set(bus.n,[...(groups.get(bus.n)||[]),bus]));
  const duplicateGroups=[...groups.entries()].filter(([,buses])=>buses.length>1).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true})),duplicates=ordered(duplicateGroups.flatMap(([,buses])=>buses)),extra=duplicateGroups.reduce((sum,[,buses])=>sum+buses.length-1,0);
  if(!extra)return selection([],"This device contains "+plural(fleet.length,"bus","buses")+" and no duplicate fleet numbers.","duplicate fleet records");
  const details=duplicateGroups.map(([number,buses])=>number+" ("+buses.length+" records)").join(", ");
  return selection(duplicates,"This device contains "+fleet.length+" records representing "+groups.size+" unique buses. I found "+plural(extra,"extra duplicate record")+" across "+plural(duplicateGroups.length,"repeated fleet number")+": "+details+".","duplicate fleet records");
 }

 const timeQuestion=/\b(?:sitting|unmoved|not moved|no location|no status|operational update)\b/.test(text);
 const hourMatch=command.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:\+|plus|or more)?\s*(?:hours?|hrs?|hr|h)\b/);
 if(timeQuestion&&hourMatch){
  const hours=Number(hourMatch[1]),minimum=hours*3600000,matched=ordered(fleet.filter(bus=>operationalAgeMs(bus,now)>=minimum)).sort((a,b)=>operationalAgeMs(b,now)-operationalAgeMs(a,now));
  const response=matched.length?plural(matched.length,"bus","buses")+" have had no location or status change for "+hours+"+ hours. "+listWithAges(matched,now)+".":"No buses have gone "+hours+"+ hours without a location or status change.";
  return selection(matched,response,"buses unchanged for "+hours+"+ hours");
 }

 if(/\b(?:longest|oldest)\b/.test(text)&&timeQuestion){
  const countMatch=text.match(/\b(?:top|show|list)?\s*(\d+)\s+(?:longest|oldest)\b/),count=Math.min(25,Math.max(1,Number(countMatch?.[1]||5))),matched=[...fleet].sort((a,b)=>operationalAgeMs(b,now)-operationalAgeMs(a,now)).slice(0,count);
  return selection(matched,"The "+plural(matched.length,"longest-unmoved bus","longest-unmoved buses")+" are: "+listWithAges(matched,now)+". Time is measured from the latest location or status change.","longest-unmoved buses");
 }

 const area=findOperatorArea(command,areas);
 if(area&&/\b(?:how many|count|which|show|list)\b/.test(text)){
  const matched=ordered(fleet.filter(bus=>area.slots.includes(bus.l))),response=plural(matched.length,"bus","buses")+" are currently in "+area.name+(matched.length?": "+simpleList(matched)+".":".");
  return selection(matched,response,"buses in "+area.name);
 }

 let matched:FleetInsightBus[]|null=null,label="";
 if(/\b(?:down sheet|downsheet)\b/.test(text)){matched=fleet.filter(bus=>bus.down);label="buses marked on the down sheet"}
 else if(/\b(?:check engine|check engines)\b/.test(text)){matched=fleet.filter(bus=>bus.checkEngine);label="buses with check-engine reports"}
 else if(/\b(?:check transmission|transmission light|transmission lights)\b/.test(text)){matched=fleet.filter(bus=>bus.checkTransmission);label="buses with check-transmission reports"}
 else if(/\b(?:no horn|horn issue|horn issues)\b/.test(text)){matched=fleet.filter(bus=>bus.noHorn);label="buses with horn reports"}
 else if(/\b(?:ramp|kneeler|ada)\b/.test(text)){matched=fleet.filter(bus=>bus.badRampKneeler);label="buses with ramp or kneeler reports"}
 else if(/\b(?:ac issue|ac issues|air conditioning|hvac)\b/.test(text)){matched=fleet.filter(hasAcIssue);label="buses with A/C issues"}
 else if(/\b(?:pending repair|pending repairs|defect|defects)\b/.test(text)){matched=fleet.filter(bus=>Boolean(bus.pendingRepair?.trim())||(bus.defects||[]).some(defect=>defect.state!=="completed"));label="buses with unresolved repairs"}
 if(matched){matched=ordered(matched);return selection(matched,plural(matched.length,"bus","buses")+" match "+label+(matched.length?": "+simpleList(matched)+".":"."),label)}

 const status=statusQuestion(text);
 if(status){const statusBuses=ordered(fleet.filter(bus=>bus.s===status)),labelText=STATUS_LABELS[status]||status;return selection(statusBuses,plural(statusBuses.length,"bus","buses")+" currently have status "+labelText+(statusBuses.length?": "+simpleList(statusBuses)+".":"."),"buses with status "+labelText)}

 if(/\b(?:how many (?:total )?buses|fleet count|total buses|buses total)\b/.test(text))return selection([],"This device currently contains "+plural(fleet.length,"bus","buses")+" on the tracker.","complete fleet");
 return null;
}
