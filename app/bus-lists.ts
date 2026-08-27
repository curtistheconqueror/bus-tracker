/* Bus lists: a punch list of buses to work through, and a clean way to hand it
   to someone who does not have this app.

   The farebox bypass list is the case this was built from. Another department
   produces it, so the buses on it usually have no defect record here at all and
   nothing about a list depends on one. Curtis walks the yard clearing them and
   marks each off, which is why membership is fixed while progress is not: a
   rule that watched defects would never see a farebox taken out of bypass, and
   a frozen list would lose the ones he already did.

   It also replaces the paper. The sheet gets initialled by hand, and gets lost,
   and sometimes never gets initialled at all. Here the tick records who and
   when, and the list cannot be left on a workbench. */

export type BusListEntry={
 id:string;
 busNumber:string;
 /* Whatever else the source sheet carried for this bus: a farebox ID, a last
    probed time, a note of Curtis's own. Kept as free text rather than modelled
    into columns, because the next list will be Ventra or something else and
    would not fit a farebox-shaped schema. */
 detail:string;
 done:boolean;
 doneAt?:string;
 doneBy?:string;
};

export type BusList={
 id:string;
 name:string;
 /* Where the list came from, e.g. "Farebox report 8-27-26". */
 source:string;
 createdAt:string;
 updatedAt:string;
 entries:BusListEntry[];
};

export const BUS_LISTS_STORAGE_KEY="pace-bus-lists-v1";
export const BUS_LIST_LIMIT=60;
export const BUS_LIST_ENTRY_LIMIT=500;

function clean(value:unknown){return String(value??"").trim()}
function collapse(value:string){return value.replace(/\s+/g," ").trim()}

/* A bus number as this fleet writes them: four or five digits. Long enough to
   avoid catching a farebox ID's neighbours by accident when a whole row of a
   report is pasted in. */
const BUS_NUMBER=/\b(\d{4,5})\b/;

/* Accepts what someone actually has to hand: numbers typed with spaces or
   commas, or whole rows pasted out of a report. For a pasted row the first
   number that looks like a bus number is the bus, and the rest of the line is
   kept as the detail, so a farebox ID and a last-probed time survive without
   this module having to know what either one is. */
export function parseBusListInput(text:unknown):{busNumber:string;detail:string}[]{
 const lines=clean(text).split(/[\n\r]+/);
 const found:{busNumber:string;detail:string}[]=[];
 for(const line of lines){
  const row=collapse(line);
  if(!row)continue;
  /* A bare run of numbers is a list of buses, not one row with details. */
  if(/^[\d\s,;]+$/.test(row)){
   for(const token of row.split(/[\s,;]+/)){
    const number=clean(token);
    if(number)found.push({busNumber:number,detail:""});
   }
   continue;
  }
  const match=row.match(BUS_NUMBER);
  if(!match){found.push({busNumber:"",detail:row});continue}
  const busNumber=match[1];
  const detail=collapse(row.slice(0,match.index)+" "+row.slice((match.index||0)+busNumber.length));
  found.push({busNumber,detail});
 }
 return found;
}

export function normalizeBusListEntries(value:unknown):BusListEntry[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>();
 const entries:BusListEntry[]=[];
 for(const [index,candidate] of value.entries()){
  if(!candidate||typeof candidate!=="object")continue;
  const raw=candidate as Partial<BusListEntry>;
  const busNumber=clean(raw.busNumber),detail=collapse(clean(raw.detail));
  if(!busNumber&&!detail)continue;
  /* The same bus twice on one list is a transcription slip, not two jobs. */
  const key=busNumber.toLowerCase()+"::"+detail.toLowerCase();
  if(busNumber&&seen.has(key))continue;
  if(busNumber)seen.add(key);
  const done=raw.done===true;
  const doneAt=clean(raw.doneAt);
  entries.push({
   id:clean(raw.id)||"list-entry-"+index+"-"+busNumber,
   busNumber,detail,done,
   doneAt:done&&doneAt&&!Number.isNaN(new Date(doneAt).getTime())?new Date(doneAt).toISOString():done?undefined:undefined,
   doneBy:done?clean(raw.doneBy)||undefined:undefined,
  });
 }
 return entries.slice(0,BUS_LIST_ENTRY_LIMIT);
}

export function normalizeBusLists(value:unknown):BusList[]{
 const source=Array.isArray(value)?value:value&&typeof value==="object"&&Array.isArray((value as {lists?:unknown}).lists)?(value as {lists:unknown[]}).lists:[];
 const lists:BusList[]=[];
 for(const [index,candidate] of source.entries()){
  if(!candidate||typeof candidate!=="object")continue;
  const raw=candidate as Partial<BusList>;
  const name=collapse(clean(raw.name));
  if(!name)continue;
  const createdAt=clean(raw.createdAt),updatedAt=clean(raw.updatedAt);
  const stamp=(value:string)=>value&&!Number.isNaN(new Date(value).getTime())?new Date(value).toISOString():new Date(0).toISOString();
  lists.push({
   id:clean(raw.id)||"bus-list-"+index,
   name,source:collapse(clean(raw.source)),
   createdAt:stamp(createdAt),updatedAt:stamp(updatedAt||createdAt),
   entries:normalizeBusListEntries(raw.entries),
  });
 }
 return lists.sort((left,right)=>Date.parse(right.updatedAt)-Date.parse(left.updatedAt)).slice(0,BUS_LIST_LIMIT);
}

export function busListCounts(list:Pick<BusList,"entries">){
 const total=list.entries.length,done=list.entries.filter(entry=>entry.done).length;
 return {total,done,remaining:total-done};
}

export function createBusList(name:string,source:string,now:string,idSeed:string):BusList{
 return {id:"bus-list-"+idSeed,name:collapse(clean(name))||"Untitled list",source:collapse(clean(source)),
  createdAt:now,updatedAt:now,entries:[]};
}

export function addBusListEntries(list:BusList,text:unknown,idSeed:string):BusList{
 const parsed=parseBusListInput(text);
 if(!parsed.length)return list;
 const additions=parsed.map((entry,index)=>({
  id:"list-entry-"+idSeed+"-"+index,
  busNumber:entry.busNumber,detail:entry.detail,done:false,
 }));
 return {...list,entries:normalizeBusListEntries([...list.entries,...additions])};
}

export function setBusListEntryDone(list:BusList,entryId:string,done:boolean,now:string,initials:string):BusList{
 return {...list,entries:list.entries.map(entry=>entry.id!==entryId?entry:{
  ...entry,done,
  doneAt:done?now:undefined,
  doneBy:done?collapse(clean(initials)).toUpperCase()||undefined:undefined,
 })};
}

/* Formatting lives here rather than being scraped off the screen, which is why
   the old copy read like a UI label: it was one. Plain text with real line
   breaks, so it survives a text message, an email, or a paste into Teams. */
export type BusListExportMode="full"|"numbers"|"remaining";

function shortDate(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(date);
}

export function busListExportText(list:BusList,mode:BusListExportMode="full",now=new Date().toISOString()):string{
 const {total,done,remaining}=busListCounts(list);
 const remainingEntries=list.entries.filter(entry=>!entry.done);
 const doneEntries=list.entries.filter(entry=>entry.done);

 if(mode==="numbers")return remainingEntries.map(entry=>entry.busNumber).filter(Boolean).join(", ");

 const line=(entry:BusListEntry)=>{
  const number=entry.busNumber||"(no bus number)";
  return "  "+[number,entry.detail].filter(Boolean).join(" — ");
 };
 const head=[list.name.toUpperCase()];
 const stamp=[shortDate(now),list.source].filter(Boolean).join(" · ");
 head.push([stamp,total+" bus"+(total===1?"":"es"),done+" cleared",remaining+" remaining"].filter(Boolean).join(" · "));

 const body:string[]=[];
 if(remainingEntries.length){
  body.push("","REMAINING ("+remainingEntries.length+")",...remainingEntries.map(line));
 }else if(total){
  body.push("","All "+total+" cleared.");
 }
 if(mode==="full"&&doneEntries.length){
  body.push("","CLEARED ("+doneEntries.length+")",...doneEntries.map(entry=>{
   const marks=[shortDate(entry.doneAt||""),entry.doneBy].filter(Boolean).join(" ");
   return line(entry)+(marks?"  ["+marks+"]":"");
  }));
 }
 if(!total)body.push("","No buses on this list yet.");
 return [...head,...body].join("\n");
}
