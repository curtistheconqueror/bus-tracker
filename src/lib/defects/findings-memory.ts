import {migrateRepairIdentity,normalizeFinding} from "./repair-catalog.ts";

/* Learned causes, remembered under the symptom they were found beneath.

   The picker can only ever list symptoms. A check-engine light is one entry, but
   the things behind it are endless and specific: a throttle pedal reference
   circuit, a chafed pin, an EGR differential pressure sensor. Putting those in
   the catalog would bury the twelve engine choices a mechanic actually picks
   from under a hundred causes that each apply to one bus on one day.

   So a cause is learned where it was found and offered nowhere else. Diagnose a
   check-engine light as a throttle pedal reference circuit, and the next person
   who picks Check engine light is offered it. Somebody picking Brake light
   on never sees it. The main catalog does not grow at all.

   The point is not saving typing, it is stopping the same fault being written
   five ways. "throttle pedal ref circuit" and "Throttle Pedal Reference Circuit"
   are the same fault and should read as one thing in a year's history, so
   matching ignores case, spacing and trailing punctuation, and what was typed
   first is what gets shown.

   Memory is a convenience only. It never blocks an entry, never overwrites
   something already typed, and every cause can be forgotten. */

export type FindingMemoryEntry={
 category:string;
 issue:string;
 finding:string;
 uses:number;
 updatedAt:string;
};

export type FindingsMemory={entries:FindingMemoryEntry[]};

export const FINDINGS_MEMORY_STORAGE_KEY="pace-findings-memory-v1";
/* Higher than the parts cap: one symptom can honestly carry a dozen causes,
   where a defect has one part. Least recently used goes first. */
export const FINDINGS_MEMORY_LIMIT=600;
/* How many to offer under one symptom. Past this the chips stop being a
   shortcut and become a list to read, which is what the free-text box is for. */
export const FINDINGS_PER_SYMPTOM=8;

export const EMPTY_FINDINGS_MEMORY:FindingsMemory={entries:[]};

function clean(value:unknown){return String(value??"").trim()}

/* Keys follow the catalog, so a cause learned under a category that has since
   been merged or an issue that has been renamed still matches. */
export function findingMemoryKey(category:unknown,issue:unknown){
 const moved=migrateRepairIdentity(clean(category),clean(issue));
 return moved.category.toLowerCase()+"::"+moved.issue.toLowerCase();
}

/* Two spellings of one fault must collapse to one entry, or a year of history
   reads as several different faults that each happened once. */
export function findingMatchKey(finding:unknown){
 return clean(finding).toLowerCase().replace(/\s+/g," ").replace(/[.,;:]+$/,"");
}

export function normalizeFindingsMemory(value:unknown):FindingsMemory{
 const source=value&&typeof value==="object"&&Array.isArray((value as FindingsMemory).entries)
  ?(value as FindingsMemory).entries
  :Array.isArray(value)?value as FindingMemoryEntry[]:[];
 const seen=new Map<string,FindingMemoryEntry>();
 for(const candidate of source){
  if(!candidate||typeof candidate!=="object")continue;
  const entry=candidate as Partial<FindingMemoryEntry>;
  const category=clean(entry.category),issue=clean(entry.issue),finding=normalizeFinding(entry.finding);
  if(!category||!issue||!finding)continue;
  const uses=Number(entry.uses);
  const key=findingMemoryKey(category,issue)+"::"+findingMatchKey(finding);
  const kept:FindingMemoryEntry={category,issue,finding,
   uses:Number.isFinite(uses)&&uses>0?Math.round(uses):1,
   updatedAt:clean(entry.updatedAt)};
  const existing=seen.get(key);
  /* A duplicate in a hand-edited or merged payload adds its uses rather than
     silently discarding one side's history. */
  if(existing)seen.set(key,{...existing,uses:existing.uses+kept.uses,updatedAt:kept.updatedAt>existing.updatedAt?kept.updatedAt:existing.updatedAt});
  else seen.set(key,kept);
 }
 const entries=[...seen.values()].sort((left,right)=>right.updatedAt.localeCompare(left.updatedAt));
 return {entries:entries.slice(0,FINDINGS_MEMORY_LIMIT)};
}

/* What has been found under this exact symptom before, most-used first so the
   answer that keeps turning out to be right sits at the front. */
export function recallFindings(memory:unknown,category:unknown,issue:unknown,limit=FINDINGS_PER_SYMPTOM):FindingMemoryEntry[]{
 if(!clean(category)||!clean(issue))return [];
 const wanted=findingMemoryKey(category,issue);
 return normalizeFindingsMemory(memory).entries
  .filter(entry=>findingMemoryKey(entry.category,entry.issue)===wanted)
  .sort((left,right)=>right.uses-left.uses||right.updatedAt.localeCompare(left.updatedAt))
  .slice(0,Math.max(0,limit));
}

export function learnFinding(memory:unknown,input:{category:unknown;issue:unknown;finding:unknown},now=new Date().toISOString()):FindingsMemory{
 const category=clean(input.category),issue=clean(input.issue),finding=normalizeFinding(input.finding);
 const current=normalizeFindingsMemory(memory);
 if(!category||!issue||!finding)return current;
 const key=findingMemoryKey(category,issue)+"::"+findingMatchKey(finding);
 const rest=current.entries.filter(entry=>findingMemoryKey(entry.category,entry.issue)+"::"+findingMatchKey(entry.finding)!==key);
 const previous=current.entries.find(entry=>findingMemoryKey(entry.category,entry.issue)+"::"+findingMatchKey(entry.finding)===key);
 /* The wording that was recorded first is the wording that stays. Letting a
    later spelling win would rewrite what earlier repairs appear to say. */
 return normalizeFindingsMemory({entries:[{category,issue,finding:previous?previous.finding:finding,uses:(previous?.uses||0)+1,updatedAt:now},...rest]});
}

export function forgetFinding(memory:unknown,category:unknown,issue:unknown,finding:unknown):FindingsMemory{
 const key=findingMemoryKey(category,issue)+"::"+findingMatchKey(finding);
 const current=normalizeFindingsMemory(memory);
 return {entries:current.entries.filter(entry=>findingMemoryKey(entry.category,entry.issue)+"::"+findingMatchKey(entry.finding)!==key)};
}

export function readFindingsMemory(storage:Pick<Storage,"getItem">|null|undefined):FindingsMemory{
 try{return normalizeFindingsMemory(JSON.parse(storage?.getItem(FINDINGS_MEMORY_STORAGE_KEY)||"null"))}catch{return EMPTY_FINDINGS_MEMORY}
}

export function writeFindingsMemory(storage:Pick<Storage,"setItem">|null|undefined,memory:FindingsMemory){
 try{storage?.setItem(FINDINGS_MEMORY_STORAGE_KEY,JSON.stringify(normalizeFindingsMemory(memory)));return true}catch{return false}
}
