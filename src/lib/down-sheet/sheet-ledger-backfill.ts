/* LOADING SHEETS THE APP NEVER SAW.

   The swap ledger starts recording the day it ships, and everything before that
   exists only as photographs on Curtis's phone. Eighteen days of them were
   transcribed by hand; this is the door they come in through.

   THE ONE RULE: IT TOUCHES THE LEDGER AND NOTHING ELSE. A scanned sheet
   REPLACES the live one — that is what a swap IS — and a backfill must not,
   because the sheets being loaded are weeks old and the live sheet is today's.
   Importing history is not the same act as importing a sheet, and the only safe
   way to say so is a path that has no access to `pace-down-sheet-v1` at all.
   There is no code here that can reach it.

   MERGE, NEVER REPLACE, for the reason the master import merges this key: a
   swap is an EVENT that happened once, so the union IS the history. Deduped by
   swap id, so loading the same file twice is a no-op rather than a doubled
   tempo.

   NOTHING LANDS BEFORE IT HAS BEEN READ. `planBackfill` computes the whole
   outcome — what is new, what is a duplicate, what the cap will drop — without
   writing a byte, so the screen can show it and the person can decide. Same
   discipline as the status report: a thing that leaves before you have read it
   is worse than no thing at all. */

import {SHEET_LEDGER_KEY,SHEET_LEDGER_LIMIT,mergeSheetLedgers,normalizeSheetLedger,readSheetLedger,
 type SheetLedger,type SheetSnapshot} from "./sheet-ledger.ts";
import {writeSetting} from "../storage/storage.ts";

export const BACKFILL_KIND="pace-south-sheet-ledger-backfill";

export type BackfillPayload={kind:string;version?:number;snapshots:unknown};

export type BackfillPlan={
 ok:boolean;
 /* Why it cannot be loaded, in the words somebody reads on the screen. Empty
    when ok. */
 problem:string;
 /* Snapshots the file carries that this device does not already hold. */
 fresh:SheetSnapshot[];
 /* Ones it already has, by id. Loading the same file twice is a no-op and the
    screen says so rather than reporting nothing happened. */
 duplicates:number;
 /* THE CAP BITES AT IMPORT TIME AND THIS IS WHERE IT SHOWS.

    The ledger keeps the newest 40 and a backfill is, by definition, the oldest
    thing in it. A device already carrying 35 recorded swaps will drop most of a
    nine-snapshot baseline the instant it merges, and it would do so silently.
    Counted here so the screen can say "4 of these 9 will not fit" BEFORE the
    button is pressed, instead of leaving somebody to wonder where the history
    went. */
 dropped:number;
 /* The ledger as it would stand afterwards. */
 next:SheetLedger;
 /* How many of the fresh ones admit to a gap in front of them. Surfaced because
    it is the difference between a ledger that can quote a per-swap rate and one
    that honestly cannot. */
 gaps:number;
};

function empty(problem:string):BackfillPlan{
 return {ok:false,problem,fresh:[],duplicates:0,dropped:0,next:[],gaps:0};
}

export function parseBackfill(text:string):BackfillPayload|null{
 try{
  const parsed=JSON.parse(text) as Partial<BackfillPayload>;
  if(!parsed||typeof parsed!=="object")return null;
  return {kind:String(parsed.kind??""),version:Number(parsed.version??1),snapshots:parsed.snapshots};
 }catch{return null}
}

export function planBackfill(current:unknown,text:string,limit=SHEET_LEDGER_LIMIT):BackfillPlan{
 const payload=parseBackfill(text);
 if(!payload)return empty("That is not a file this can read. It should be the JSON the backfill was written as.");
 /* The kind is checked before anything else. A master export and a Down Sheet
    transfer are both JSON with a `kind`, and either one loaded here would do
    something other than what the person intended. */
 if(payload.kind!==BACKFILL_KIND)
  return empty("That file is a "+(payload.kind||"file with no kind")+", not a sheet-ledger backfill.");
 const incoming=normalizeSheetLedger(payload.snapshots);
 if(!incoming.length)return empty("That backfill carries no readable swaps.");

 const held=normalizeSheetLedger(current);
 const have=new Set(held.map(snapshot=>snapshot.id));
 const fresh=incoming.filter(snapshot=>!have.has(snapshot.id));
 const merged=mergeSheetLedgers(held,incoming,limit);
 const kept=new Set(merged.map(snapshot=>snapshot.id));
 return {
  ok:true,problem:"",
  fresh,
  duplicates:incoming.length-fresh.length,
  dropped:fresh.filter(snapshot=>!kept.has(snapshot.id)).length,
  next:merged,
  gaps:fresh.filter(snapshot=>snapshot.gap===true).length,
 };
}

/* Applies a plan that was already computed and shown. Takes the PLAN rather
   than the text so the thing written is provably the thing displayed — re-
   parsing here would open the door to the screen describing one outcome and the
   storage receiving another. */
export function applyBackfill(storage:Pick<Storage,"setItem">,plan:BackfillPlan){
 if(!plan.ok)return {ok:false as const,reason:"failed" as const};
 const result=writeSetting(storage,SHEET_LEDGER_KEY,JSON.stringify(plan.next));
 return result.ok?{ok:true as const,loaded:plan.fresh.length-plan.dropped}:{ok:false as const,reason:result.reason};
}

export function readBackfillPlan(storage:Pick<Storage,"getItem">,text:string){
 return planBackfill(readSheetLedger(storage),text);
}
