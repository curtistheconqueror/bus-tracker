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
   when, and the list cannot be left on a workbench.

   Each list names its own columns, up to seven, and may name none. The farebox
   sheet carries a farebox ID, a last probed time and a bypass flag; the next
   list will carry something else entirely, so the columns belong to the list
   rather than to this module. With no columns named a row is just a bus and a
   free note, which is all a quick list needs. */

export type BusListEntry={
 id:string;
 busNumber:string;
 /* One cell per named column, in the list's column order. With no columns
    named, the whole remainder of the row sits in the first cell and reads as a
    plain note. Cells beyond the current column count are kept rather than
    dropped, so narrowing the columns and widening them again loses nothing. */
 cells:string[];
 done:boolean;
 doneAt?:string;
 doneBy?:string;
};

export type BusList={
 id:string;
 name:string;
 /* Where the list came from, e.g. "Farebox report 8-27-26". */
 source:string;
 /* Column headings this list uses. Empty means free-form notes. */
 columns:string[];
 createdAt:string;
 updatedAt:string;
 entries:BusListEntry[];
};

export const BUS_LISTS_STORAGE_KEY="pace-bus-lists-v1";
export const BUS_LIST_LIMIT=60;
export const BUS_LIST_ENTRY_LIMIT=500;
/* Seven is what Curtis asked for and about what still reads as a table on a
   phone. Nothing breaks above it; the extra columns simply cannot be named. */
export const BUS_LIST_COLUMN_LIMIT=7;

/* Formats that arrive the same way every time. The farebox report is the one
   we have seen, so its columns are named here exactly as its own sheet heads
   them, which makes checking a row against the paper trivial. Anything else
   Curtis receives he saves himself from a list he has already built, so a new
   report format never waits on a code change. */
export type BusListTemplate={id:string;name:string;columns:string[];builtIn?:boolean};

export const BUS_LIST_TEMPLATES:BusListTemplate[]=[
 {id:"farebox",name:"Farebox Bypass",columns:["Location","Farebox ID","Last Probed Time","Bypass Alarm"],builtIn:true},
];

export const BUS_LIST_TEMPLATES_STORAGE_KEY="pace-bus-list-templates-v1";
export const BUS_LIST_TEMPLATE_LIMIT=30;

function clean(value:unknown){return String(value??"").trim()}
function collapse(value:string){return value.replace(/\s+/g," ").trim()}

/* A bus number as this fleet writes them: four or five digits. Long enough to
   avoid catching a farebox ID's neighbours by accident when a whole row of a
   report is pasted in. */
const BUS_NUMBER=/\b(\d{4,5})\b/;

/* How a pasted row is cut into cells. Tabs and commas are exact, so they win.
   Two or more spaces is how a printed or copied table lines up. A row separated
   by single spaces alone cannot be cut reliably, so it is left whole in the
   first cell rather than guessed at and split in the wrong places. */
function splitCells(row:string):string[]{
 if(row.includes("\t"))return row.split("\t").map(cell=>collapse(cell));
 if(row.includes(","))return row.split(",").map(cell=>collapse(cell));
 if(/ {2,}/.test(row))return row.split(/ {2,}/).map(cell=>collapse(cell));
 return [collapse(row)];
}

export function normalizeBusListColumns(value:unknown):string[]{
 if(!Array.isArray(value))return [];
 const named=value.map(entry=>collapse(clean(entry))).filter(Boolean);
 return named.slice(0,BUS_LIST_COLUMN_LIMIT);
}

/* Accepts what someone actually has to hand: numbers typed with spaces or
   commas, or whole rows pasted out of a report. The first number that looks
   like a bus number is the bus, and what is left is cut into cells. */
export function parseBusListInput(text:unknown):{busNumber:string;cells:string[]}[]{
 const lines=clean(text).split(/[\n\r]+/);
 const found:{busNumber:string;cells:string[]}[]=[];
 for(const line of lines){
  const row=collapse(line);
  if(!row)continue;
  /* A bare run of numbers is a list of buses, not one row with details. */
  if(/^[\d\s,;]+$/.test(row)){
   for(const token of row.split(/[\s,;]+/)){
    const number=clean(token);
    if(number)found.push({busNumber:number,cells:[]});
   }
   continue;
  }
  /* Matched against the original line, not the collapsed one: the run of spaces
     that separates a printed table's columns is the delimiter, and an index
     taken from the collapsed copy lands in the wrong place once it is gone. */
  const match=line.match(BUS_NUMBER);
  if(!match){found.push({busNumber:"",cells:splitCells(row)});continue}
  const busNumber=match[1];
  const at=match.index||0;
  const remainder=line.slice(0,at)+" ".repeat(busNumber.length)+line.slice(at+busNumber.length);
  const cells=splitCells(remainder).filter(cell=>cell!=="");
  found.push({busNumber,cells});
 }
 return found;
}

export function normalizeBusListEntries(value:unknown):BusListEntry[]{
 if(!Array.isArray(value))return [];
 const seen=new Set<string>();
 const entries:BusListEntry[]=[];
 for(const [index,candidate] of value.entries()){
  if(!candidate||typeof candidate!=="object")continue;
  const raw=candidate as Partial<BusListEntry>&{detail?:unknown};
  const busNumber=clean(raw.busNumber);
  /* Lists written before columns existed stored one free-text detail. */
  const cells=Array.isArray(raw.cells)
   ?raw.cells.map(cell=>collapse(clean(cell)))
   :collapse(clean(raw.detail))?[collapse(clean(raw.detail))]:[];
  while(cells.length&&cells[cells.length-1]==="")cells.pop();
  if(!busNumber&&!cells.length)continue;
  const key=busNumber.toLowerCase()+"::"+cells.join("|").toLowerCase();
  if(busNumber&&seen.has(key))continue;
  if(busNumber)seen.add(key);
  const done=raw.done===true;
  const doneAt=clean(raw.doneAt);
  entries.push({
   id:clean(raw.id)||"list-entry-"+index+"-"+busNumber,
   busNumber,cells,done,
   doneAt:done&&doneAt&&!Number.isNaN(new Date(doneAt).getTime())?new Date(doneAt).toISOString():undefined,
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
  const stamp=(value:string)=>value&&!Number.isNaN(new Date(value).getTime())?new Date(value).toISOString():new Date(0).toISOString();
  lists.push({
   id:clean(raw.id)||"bus-list-"+index,
   name,source:collapse(clean(raw.source)),
   columns:normalizeBusListColumns(raw.columns),
   createdAt:stamp(clean(raw.createdAt)),updatedAt:stamp(clean(raw.updatedAt)||clean(raw.createdAt)),
   entries:normalizeBusListEntries(raw.entries),
  });
 }
 return lists.sort((left,right)=>Date.parse(right.updatedAt)-Date.parse(left.updatedAt)).slice(0,BUS_LIST_LIMIT);
}

export function busListCounts(list:Pick<BusList,"entries">){
 const total=list.entries.length,done=list.entries.filter(entry=>entry.done).length;
 return {total,done,remaining:total-done};
}

export function createBusList(name:string,source:string,now:string,idSeed:string,columns:unknown=[]):BusList{
 return {id:"bus-list-"+idSeed,name:collapse(clean(name))||"Untitled list",source:collapse(clean(source)),
  columns:normalizeBusListColumns(columns),createdAt:now,updatedAt:now,entries:[]};
}

/* Renaming or removing a column never touches the rows. A cell whose column is
   gone stays in storage and reappears if the column comes back, because a list
   being reshaped mid-job must not quietly drop what was already written down. */
export function setBusListColumns(list:BusList,columns:unknown):BusList{
 return {...list,columns:normalizeBusListColumns(columns)};
}

export function addBusListEntries(list:BusList,text:unknown,idSeed:string):BusList{
 const parsed=parseBusListInput(text);
 if(!parsed.length)return list;
 const additions=parsed.map((entry,index)=>({
  id:"list-entry-"+idSeed+"-"+index,
  busNumber:entry.busNumber,cells:entry.cells,done:false,
 }));
 return {...list,entries:normalizeBusListEntries([...list.entries,...additions])};
}

export function setBusListEntryCell(list:BusList,entryId:string,column:number,value:string):BusList{
 return {...list,entries:list.entries.map(entry=>{
  if(entry.id!==entryId)return entry;
  const cells=[...entry.cells];
  while(cells.length<=column)cells.push("");
  cells[column]=collapse(clean(value));
  while(cells.length&&cells[cells.length-1]==="")cells.pop();
  return {...entry,cells};
 })};
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

/* Padding is capped so one long cell cannot push every other line off the side
   of a phone. Content is never cut: a wide value simply runs past its column. */
const MAX_PAD=24;

/* Every cell that was pasted is shown, whether or not its column was named.
   Naming is capped at seven; what a row actually carries is not. A value that
   quietly vanished from a shared list would be worse than an unlabelled one. */
export function busListColumnCount(list:BusList){
 return Math.max(list.columns.length,...list.entries.map(entry=>entry.cells.length),0);
}

function columnWidths(list:BusList,rows:BusListEntry[],count:number){
 return Array.from({length:count},(_ignored,index)=>Math.min(MAX_PAD,
  Math.max((list.columns[index]||"").length,...rows.map(row=>(row.cells[index]||"").length),0)));
}

export function busListExportText(list:BusList,mode:BusListExportMode="full",now=new Date().toISOString()):string{
 const {total,done,remaining}=busListCounts(list);
 const remainingEntries=list.entries.filter(entry=>!entry.done);
 const doneEntries=list.entries.filter(entry=>entry.done);

 if(mode==="numbers")return remainingEntries.map(entry=>entry.busNumber).filter(Boolean).join(", ");

 const busWidth=Math.max(3,...list.entries.map(entry=>(entry.busNumber||"—").length));
 const count=busListColumnCount(list);
 const widths=columnWidths(list,list.entries,count);
 const hasColumns=list.columns.length>0;

 const headingRow=hasColumns
  ?("  "+"BUS".padEnd(busWidth)+"  "+Array.from({length:count},(_ignored,index)=>
    (list.columns[index]||"").toUpperCase().padEnd(widths[index])).join("  ")).trimEnd()
  :"";
 const line=(entry:BusListEntry,suffix="")=>{
  const number=entry.busNumber||"—";
  if(hasColumns){
   const cells=Array.from({length:count},(_ignored,index)=>(entry.cells[index]||"").padEnd(widths[index]));
   return ("  "+number.padEnd(busWidth)+"  "+cells.join("  ")).trimEnd()+suffix;
  }
  const detail=entry.cells.filter(Boolean).join(" · ");
  return "  "+[number,detail].filter(Boolean).join(" — ")+suffix;
 };

 const head=[list.name.toUpperCase()];
 const stamp=[shortDate(now),list.source].filter(Boolean).join(" · ");
 head.push([stamp,total+" bus"+(total===1?"":"es"),done+" cleared",remaining+" remaining"].filter(Boolean).join(" · "));

 const body:string[]=[];
 if(remainingEntries.length){
  body.push("","REMAINING ("+remainingEntries.length+")");
  if(headingRow)body.push(headingRow);
  body.push(...remainingEntries.map(entry=>line(entry)));
 }else if(total){
  body.push("","All "+total+" cleared.");
 }
 if(mode==="full"&&doneEntries.length){
  body.push("","CLEARED ("+doneEntries.length+")");
  if(headingRow)body.push(headingRow);
  body.push(...doneEntries.map(entry=>{
   const marks=[shortDate(entry.doneAt||""),entry.doneBy].filter(Boolean).join(" ");
   return line(entry,marks?"  ["+marks+"]":"");
  }));
 }
 if(!total)body.push("","No buses on this list yet.");
 return [...head,...body].join("\n");
}

export function normalizeBusListTemplates(value:unknown):BusListTemplate[]{
 if(!Array.isArray(value))return [];
 const seen=new Set(BUS_LIST_TEMPLATES.map(entry=>entry.name.toLowerCase()));
 const saved:BusListTemplate[]=[];
 for(const [index,candidate] of value.entries()){
  if(!candidate||typeof candidate!=="object")continue;
  const raw=candidate as Partial<BusListTemplate>;
  const name=collapse(clean(raw.name)),columns=normalizeBusListColumns(raw.columns);
  /* A template with no columns would do nothing, and a built-in name must not
     be shadowed by a saved one or picking it would be ambiguous. */
  if(!name||!columns.length||seen.has(name.toLowerCase()))continue;
  seen.add(name.toLowerCase());
  saved.push({id:clean(raw.id)||"template-"+index+"-"+name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name,columns});
 }
 return saved.slice(0,BUS_LIST_TEMPLATE_LIMIT);
}

export function busListTemplateOptions(saved:unknown):BusListTemplate[]{
 return [...BUS_LIST_TEMPLATES,...normalizeBusListTemplates(saved)];
}

/* Saving is idempotent on the name: saving "Ventra" twice replaces the columns
   rather than leaving two entries that differ by one heading. */
export function saveBusListTemplate(saved:unknown,name:string,columns:unknown,idSeed:string):BusListTemplate[]{
 const cleaned=collapse(clean(name)),wanted=normalizeBusListColumns(columns);
 if(!cleaned||!wanted.length)return normalizeBusListTemplates(saved);
 const rest=normalizeBusListTemplates(saved).filter(entry=>entry.name.toLowerCase()!==cleaned.toLowerCase());
 return normalizeBusListTemplates([{id:"template-"+idSeed,name:cleaned,columns:wanted},...rest]);
}

export function deleteBusListTemplate(saved:unknown,id:string):BusListTemplate[]{
 return normalizeBusListTemplates(saved).filter(entry=>entry.id!==id);
}
