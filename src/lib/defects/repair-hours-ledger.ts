import {migrateRepairIdentity,normalizeRepairHours,repairIdentityKey} from "./repair-catalog.ts";

/* WHAT THIS SHOP SAYS A REPAIR TAKES.

   Curtis, after being offered a version that learns from completed work:
   "if that's some type of like adaptive strategy, we can hold off on it as long
   as a person can change the repair times then and then it updates ... that's
   not necessarily an adaptive strategy, but that's more like a fixed ledger."

   So this is a LEDGER, not a learner. Somebody sets a number, that number is
   the estimate for that repair everywhere until somebody changes it, and it
   never moves on its own. Nothing averages, nothing decays, and when a figure
   looks wrong there is exactly one place it came from and one person who put
   it there. The adaptive version stays parked by his decision, and this is the
   thing it would eventually have to beat.

   KEYED PER SPECIFIC REPAIR rather than per category, through the same
   `repairIdentityKey` PATH TO REPAIR uses. "All Brakes = 2h" would price a
   chamber leak and a full reline the same, and the catalog it overrides
   already distinguishes the two. A category-level default is a coarser thing
   that can sit on top of this later without disturbing it. */
export const REPAIR_HOURS_KEY="pace-repair-hours-v1";

export type ShopRepairTime={category:string;issue:string;minutes:number;updatedAt:string;updatedBy?:string};
export type RepairHoursLedger={entries:ShopRepairTime[]};

function text(value:unknown,limit:number){return String(value??"").trim().slice(0,limit)}

/* Stored as MINUTES, typed as HOURS. Everything that consumes an estimate in
   this app is in minutes — the Down Sheet's own totals, `repairTimeTotal`,
   `formatRepairTime` — while a mechanic writes ".5" and "1.25". Converting once
   here, through the same `normalizeRepairHours` the defect editor uses, keeps
   one unit in the data and one in the hand. */
export function hoursToMinutes(hours:unknown){
 const safe=normalizeRepairHours(hours);
 return safe===undefined?null:Math.round(safe*60);
}

export function normalizeRepairHoursLedger(value:unknown):RepairHoursLedger{
 const raw=value&&typeof value==="object"&&Array.isArray((value as RepairHoursLedger).entries)
  ?(value as RepairHoursLedger).entries:[];
 const seen=new Set<string>(),entries:ShopRepairTime[]=[];
 for(const item of raw){
  if(!item||typeof item!=="object")continue;
  const entry=item as Partial<ShopRepairTime>;
  const category=text(entry.category,120),issue=text(entry.issue,200);
  const minutes=Math.round(Number(entry.minutes));
  /* A zero or negative time is not "this repair is instant", it is a cleared
     entry or a corrupt one. Either way there is no number to stand behind. */
  if(!Number.isFinite(minutes)||minutes<=0||(!category&&!issue))continue;
  const key=repairIdentityKey(category,issue);
  if(seen.has(key))continue;
  seen.add(key);
  const normalized:ShopRepairTime={category,issue,minutes,updatedAt:text(entry.updatedAt,40)};
  const by=text(entry.updatedBy,24).toUpperCase();
  if(by)normalized.updatedBy=by;
  entries.push(normalized);
 }
 return {entries};
}

export function readRepairHoursLedger(storage:Pick<Storage,"getItem">):RepairHoursLedger{
 try{return normalizeRepairHoursLedger(JSON.parse(storage.getItem(REPAIR_HOURS_KEY)||"null"))}
 catch{return {entries:[]}}
}

/* Reports whether the write landed. A full device must not take the screen
   down over an estimate, and must not show a number it did not store. */
export function writeRepairHoursLedger(storage:Pick<Storage,"setItem">,ledger:RepairHoursLedger){
 try{storage.setItem(REPAIR_HOURS_KEY,JSON.stringify(normalizeRepairHoursLedger(ledger)));return true}
 catch{return false}
}

export function findRepairMinutes(ledger:RepairHoursLedger,category:unknown,issue:unknown){
 const key=repairIdentityKey(category,issue);
 return normalizeRepairHoursLedger(ledger).entries.find(entry=>repairIdentityKey(entry.category,entry.issue)===key)||null;
}

/* Saving an empty or zero time REMOVES the entry, which is how the shop's
   number is taken back off and the catalog's estimate returns. There is no
   separate delete: an estimate is a claim, and withdrawing it is the same
   gesture as never having made it. */
export function saveRepairMinutes(ledger:RepairHoursLedger,
 input:{category:unknown;issue:unknown;hours:unknown;by?:unknown},now=new Date().toISOString()){
 const identity=migrateRepairIdentity(input.category,input.issue);
 const key=repairIdentityKey(input.category,input.issue);
 const kept=normalizeRepairHoursLedger(ledger).entries.filter(entry=>repairIdentityKey(entry.category,entry.issue)!==key);
 const minutes=hoursToMinutes(input.hours);
 if(minutes===null)return normalizeRepairHoursLedger({entries:kept});
 /* Filed under the RESOLVED wording, so the ledger reads in today's words even
    where it was set in yesterday's. */
 const entry:ShopRepairTime={category:identity.category,issue:identity.issue,minutes,updatedAt:now};
 const by=text(input.by,24).toUpperCase();
 if(by)entry.updatedBy=by;
 return normalizeRepairHoursLedger({entries:[entry,...kept]});
}
