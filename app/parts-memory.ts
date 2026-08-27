import {migrateRepairIdentity} from "./repair-catalog.ts";

/* Learned Parts Used memory.

   When a mechanic records the part that fixed a defect, the app remembers it and
   offers it the next time the same defect appears. Two scopes: the exact defect
   issue (the default, because "Horn" on Bus Controls is not the same part as
   "Horn" on Electrical), or the whole category, but only when the mechanic asks
   for that explicitly. Memory is a convenience only: it never blocks an entry,
   never overwrites something already typed, and every mapping stays editable. */

export type PartMemoryScope="issue"|"category";

export type PartMemoryEntry={
 scope:PartMemoryScope;
 category:string;
 issue?:string;
 partNumber:string;
 partName?:string;
 uses:number;
 updatedAt:string;
};

export type PartsMemory={entries:PartMemoryEntry[]};

export const PARTS_MEMORY_STORAGE_KEY="pace-parts-memory-v1";
/* A shop learns a few hundred parts, not thousands. The cap keeps a corrupted or
   runaway payload from filling device storage; least recently used goes first. */
export const PARTS_MEMORY_LIMIT=400;

export const EMPTY_PARTS_MEMORY:PartsMemory={entries:[]};

function clean(value:unknown){return String(value??"").trim()}
/* Keys follow the catalog. A mapping learned under a retired category or a bare
   Bus Controls issue still matches after the restructure. */
function settled(category:string,issue?:string){return migrateRepairIdentity(category,issue||"")}

export function partMemoryKey(scope:PartMemoryScope,category:string,issue?:string){
 const moved=settled(clean(category),clean(issue));
 return scope==="category"?"category::"+moved.category.toLowerCase():"issue::"+moved.category.toLowerCase()+"::"+moved.issue.toLowerCase();
}
function entryKey(entry:PartMemoryEntry){return partMemoryKey(entry.scope,entry.category,entry.issue)}

export function normalizePartsMemory(value:unknown):PartsMemory{
 const source=value&&typeof value==="object"&&Array.isArray((value as PartsMemory).entries)?(value as PartsMemory).entries:Array.isArray(value)?value as PartMemoryEntry[]:[];
 const seen=new Map<string,PartMemoryEntry>();
 for(const candidate of source){
  if(!candidate||typeof candidate!=="object")continue;
  const raw=candidate as Partial<PartMemoryEntry>,category=clean(raw.category),partNumber=clean(raw.partNumber);
  const scope:PartMemoryScope=raw.scope==="category"?"category":"issue";
  const issue=clean(raw.issue);
  if(!category||!partNumber||(scope==="issue"&&!issue))continue;
  const uses=Number(raw.uses),updatedAt=clean(raw.updatedAt);
  const entry:PartMemoryEntry={...raw,scope,category,partNumber,
   issue:scope==="issue"?issue:undefined,
   partName:clean(raw.partName)||undefined,
   uses:Number.isFinite(uses)&&uses>0?Math.floor(uses):1,
   updatedAt:Number.isNaN(new Date(updatedAt).getTime())?new Date(0).toISOString():new Date(updatedAt).toISOString()} as PartMemoryEntry;
  seen.set(entryKey(entry),entry);
 }
 const entries=[...seen.values()].sort((left,right)=>Date.parse(right.updatedAt)-Date.parse(left.updatedAt));
 return {entries:entries.slice(0,PARTS_MEMORY_LIMIT)};
}

/* The exact issue wins over its category, so a category-wide default never
   masks a part that was learned for one specific defect. */
export function recallPart(memory:unknown,category:string,issue:string):PartMemoryEntry|undefined{
 const {entries}=normalizePartsMemory(memory);
 const wanted=partMemoryKey("issue",category,issue),fallback=partMemoryKey("category",category);
 return entries.find(entry=>entryKey(entry)===wanted)||entries.find(entry=>entryKey(entry)===fallback);
}

export function learnPart(memory:unknown,input:{category:string;issue:string;partNumber:string;partName?:string;scope?:PartMemoryScope},now=new Date().toISOString()):PartsMemory{
 const category=clean(input.category),issue=clean(input.issue),partNumber=clean(input.partNumber);
 const scope:PartMemoryScope=input.scope==="category"?"category":"issue";
 if(!category||!partNumber||(scope==="issue"&&!issue))return normalizePartsMemory(memory);
 const {entries}=normalizePartsMemory(memory);
 const key=partMemoryKey(scope,category,issue),existing=entries.find(entry=>entryKey(entry)===key);
 const learned:PartMemoryEntry={scope,category,issue:scope==="issue"?issue:undefined,partNumber,
  partName:clean(input.partName)||undefined,
  uses:(existing?.uses??0)+1,
  updatedAt:new Date(now).toISOString()};
 return normalizePartsMemory({entries:[learned,...entries.filter(entry=>entryKey(entry)!==key)]});
}

export function forgetPart(memory:unknown,scope:PartMemoryScope,category:string,issue?:string):PartsMemory{
 const key=partMemoryKey(scope,category,issue);
 return normalizePartsMemory({entries:normalizePartsMemory(memory).entries.filter(entry=>entryKey(entry)!==key)});
}

export function partMemoryLabel(entry:PartMemoryEntry){
 return entry.scope==="category"?entry.category+" — every defect":entry.category+" — "+(entry.issue||"");
}

/* Storage stays defensive: a device with blocked or corrupt storage still logs
   defects, it simply stops remembering parts. */
export function readPartsMemory(storage:Pick<Storage,"getItem">|null|undefined):PartsMemory{
 try{ return normalizePartsMemory(JSON.parse(storage?.getItem(PARTS_MEMORY_STORAGE_KEY)||"null")); }
 catch{ return {entries:[]}; }
}
export function writePartsMemory(storage:Pick<Storage,"setItem">|null|undefined,memory:PartsMemory){
 try{ storage?.setItem(PARTS_MEMORY_STORAGE_KEY,JSON.stringify(normalizePartsMemory(memory))); return true; }
 catch{ return false; }
}
