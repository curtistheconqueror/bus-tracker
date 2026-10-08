import {migrateRepairIdentity} from "./repair-catalog.ts";

/* PATH TO REPAIR — what somebody should try first, written once per repair.

   Curtis: "basically steps, general steps to point people in the right
   direction of how to get it repaired ... refer to Cummins INSIGHT, or check
   the oil first, or check the wires for corrosion in this spot". Not a
   diagnosis and not a procedure: "that's gonna be a different app".

   KEYED TO THE REPAIR, NOT TO THE DEFECT, and that was his call when asked.
   A writeup for "A/C and HVAC - No cooling" shows on every bus that ever gets
   that fault, which is the only version that accumulates into something worth
   reading. Keyed per defect instance it would be retyped on every bus and
   would never become the library he described. */
export const PATH_TO_REPAIR_KEY="pace-ptr-v1";

/* Long enough for a few steps and a manual reference, short enough that one
   entry cannot fill a phone's storage on its own. pace-scan-notes-v1 caps at
   500 for a single note; this holds steps, so it gets more room. */
export const MAX_PATH_TO_REPAIR=2000;

export type PathToRepair={category:string;issue:string;steps:string;updatedAt:string;updatedBy?:string};
export type PathToRepairLibrary={entries:PathToRepair[]};

/* THE KEY GOES THROUGH THE CATALOG'S OWN RENAME MAPS.

   `migrateRepairIdentity` is what every stored defect is read through, so a
   defect saved as "Air System - Leak" reads back as "Pneumatic System - Leak"
   today. A PTR keyed on the raw wording would stop matching that defect the
   moment a category is renamed — the writeup would still be in storage and
   would simply never appear again, which is the silent half of the failure.
   Resolving both sides through the same function means a rename moves the
   defect and its PTR together, and nothing on disk is rewritten to do it.

   Case and spacing folded because these are wordings people type and read, not
   identifiers. */
export function pathToRepairKey(category:unknown,issue:unknown){
 const identity=migrateRepairIdentity(category,issue);
 return (identity.category+" — "+identity.issue).toLowerCase().replace(/\s+/g," ").trim();
}

function text(value:unknown,limit:number){
 return String(value??"").replace(/\r\n/g,"\n").trim().slice(0,limit);
}

export function normalizePathToRepairs(value:unknown):PathToRepairLibrary{
 const raw=value&&typeof value==="object"&&Array.isArray((value as PathToRepairLibrary).entries)
  ?(value as PathToRepairLibrary).entries:[];
 const seen=new Set<string>(),entries:PathToRepair[]=[];
 for(const item of raw){
  if(!item||typeof item!=="object")continue;
  const entry=item as Partial<PathToRepair>;
  const steps=text(entry.steps,MAX_PATH_TO_REPAIR);
  const category=text(entry.category,120),issue=text(entry.issue,200);
  /* An entry with no steps is not a PTR, it is a blank somebody cleared. */
  if(!steps||(!category&&!issue))continue;
  const key=pathToRepairKey(category,issue);
  /* First wins, so a file imported twice does not double the library and the
     newest write (which is unshifted on save) survives a round trip. */
  if(seen.has(key))continue;
  seen.add(key);
  const normalized:PathToRepair={category,issue,steps,updatedAt:text(entry.updatedAt,40)};
  const by=text(entry.updatedBy,24).toUpperCase();
  if(by)normalized.updatedBy=by;
  entries.push(normalized);
 }
 return {entries};
}

export function readPathToRepairs(storage:Pick<Storage,"getItem">):PathToRepairLibrary{
 try{return normalizePathToRepairs(JSON.parse(storage.getItem(PATH_TO_REPAIR_KEY)||"null"))}
 catch{return {entries:[]}}
}

/* Reports whether the write landed rather than throwing into a render. A full
   device must not take the screen down over a note; the caller shows the
   failure instead. */
export function writePathToRepairs(storage:Pick<Storage,"setItem">,library:PathToRepairLibrary){
 try{storage.setItem(PATH_TO_REPAIR_KEY,JSON.stringify(normalizePathToRepairs(library)));return true}
 catch{return false}
}

export function findPathToRepair(library:PathToRepairLibrary,category:unknown,issue:unknown){
 const key=pathToRepairKey(category,issue);
 return normalizePathToRepairs(library).entries.find(entry=>pathToRepairKey(entry.category,entry.issue)===key)||null;
}

/* Saving empty REMOVES the entry, which is how a writeup is cleared — there is
   no separate delete. Guidance is not a repair record: the rule that nothing
   in this app deletes history is about defects and the work done on them, and
   a cleared PTR is somebody saying the advice was wrong. */
export function savePathToRepair(library:PathToRepairLibrary,
 input:{category:unknown;issue:unknown;steps:unknown;by?:unknown},now=new Date().toISOString()){
 const identity=migrateRepairIdentity(input.category,input.issue);
 const key=pathToRepairKey(input.category,input.issue);
 const kept=normalizePathToRepairs(library).entries.filter(entry=>pathToRepairKey(entry.category,entry.issue)!==key);
 const steps=text(input.steps,MAX_PATH_TO_REPAIR);
 if(!steps)return normalizePathToRepairs({entries:kept});
 /* Stored under the RESOLVED wording, so the library reads in today's words
    even where it was written in yesterday's. */
 const entry:PathToRepair={category:identity.category,issue:identity.issue,steps,updatedAt:now};
 const by=text(input.by,24).toUpperCase();
 if(by)entry.updatedBy=by;
 /* Newest first: the list somebody scrolls is the list they just added to. */
 return normalizePathToRepairs({entries:[entry,...kept]});
}
