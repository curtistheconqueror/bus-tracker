/* WHAT THE SHEET LOOKED LIKE LAST TIME, AND THE TIME BEFORE THAT.

   THE PROBLEM THIS EXISTS FOR: the app has been throwing this away. A scanned
   sheet REPLACES the live one, `pace-down-sheet-scan-undo-v1` keeps exactly one
   snapshot so the last import can be taken back, and nothing retains the sheet
   before that. So sheet-to-sheet tempo — what got added, what cleared, what
   stuck, and how fast — has never once been recorded, on a shop that has swapped
   eight or more sheets in a fortnight.

   Curtis: "When downsheets are swapped out, there is a tempo to what gets
   repaired. The type of repairs that are getting done per downsheet update."
   That tempo is the whole input to the Fleet Forecast, and it starts existing
   the day this ships. Everything before it is gone unless the photographs are
   re-scanned through the backfill path.

   THIS MODULE IS PURE. It does no rendering and reaches no storage of its own
   beyond the two read/write helpers at the bottom; the Down Sheet hands it the
   rows and it hands back a ledger. The forecast reads the ledger and nothing
   else, so what "tempo" means is defined once. */

import {shiftAt,type ShiftKey,type ShiftSettings} from "./shift-clock.ts";

export const SHEET_LEDGER_KEY="pace-sheet-ledger-v1";

/* HOW MANY SWAPS ARE KEPT.

   This lives in LocalStorage beside a four-hundred-bus board, the Defect Log
   and two tombstone ledgers, and a forecast is not worth a storage failure that
   costs somebody their board. A sheet carries up to 98 rows; stored as bus id
   and category alone that is roughly 5KB a swap, so forty is about 200KB and
   somewhere near two months at the rate this shop swaps sheets.

   Forty is also more than the forecast can use. Tempo is a recent-weeks
   question — the mix on the sheet in June says nothing about how fast September
   clears — so a bigger cap would cost storage to hold data the model would
   weight to nothing anyway. */
export const SHEET_LEDGER_LIMIT=40;

/* One bus on one sheet, and deliberately only this much.

   Not the whole entry. The repair wording, the mechanic, the estimate and the
   history are all on the live record and none of them is a tempo question; the
   two things that are are WHICH BUS and WHAT KIND OF WORK. Storing more would
   multiply the size of every snapshot to answer questions the Defect Log
   already answers better. */
export type SheetLedgerRow={
 /* The bus. The join key for everything: added, cleared and stuck are all set
    arithmetic over these between two consecutive snapshots. */
 b:string;
 /* The catalog category, which is what "the type of repairs that are getting
    done" means. Kept as the stored identity rather than a display label, so a
    catalog rename reads through the same maps everything else does. */
 c:string;
};

export type SheetSnapshot={
 /* This swap's own identity. A rescan of the same photograph on the same day
    would otherwise land twice and report a tempo of zero added, zero cleared,
    which reads as a quiet shift rather than as a duplicate. */
 id:string;
 at:string;
 /* Which shift the swap happened in, resolved once and stored, rather than
    recomputed later from `at`. If somebody edits the shift hours in six weeks,
    the tempo of a swap that already happened must not silently move to a
    different crew — what shift it WAS is a fact about that morning. */
 shift:ShiftKey|null;
 /* The sheet as it stands AFTER the swap. */
 rows:SheetLedgerRow[];
 /* Buses the swap took OFF, by id. Derivable from the previous snapshot, and
    stored anyway: the first snapshot has no predecessor, and a swap that lands
    after a gap in the ledger would otherwise report every missing bus as
    cleared in one go. */
 off:string[];
};

export type SheetLedger=SheetSnapshot[];

function clean(value:unknown){return String(value??"").trim()}
function when(value:unknown){const parsed=Date.parse(clean(value));return Number.isNaN(parsed)?null:parsed}

export type LedgerSourceEntry={id?:string;busId?:string;category?:string;workflow?:string};

/* Build the snapshot for one swap. Completed rows are left out: the sheet's own
   active/complete distinction is what "on the sheet" means everywhere else in
   this app, and counting a closed row as still on it would report work as stuck
   that somebody had finished. */
export function snapshotFromEntries(
 entries:LedgerSourceEntry[],
 removedBusIds:Iterable<string>,
 at=new Date().toISOString(),
 settings?:ShiftSettings,
 id?:string,
):SheetSnapshot{
 const seen=new Set<string>();
 const rows:SheetLedgerRow[]=[];
 for(const entry of entries||[]){
  if(clean(entry?.workflow)==="Completed")continue;
  const bus=clean(entry?.busId);
  /* One row per BUS, not per entry. The sheet folds a bus into the one row it
     is allowed, but a merge or a half-finished edit can leave two, and counting
     the bus twice would overstate every tempo number it appears in. */
  if(!bus||seen.has(bus))continue;
  seen.add(bus);
  rows.push({b:bus,c:clean(entry?.category)});
 }
 const off=[...new Set([...removedBusIds].map(clean).filter(Boolean))];
 return {
  id:clean(id)||"swap-"+(when(at)??Date.now())+"-"+rows.length,
  at:new Date(when(at)??Date.now()).toISOString(),
  shift:shiftAt(at,settings),
  rows,
  off,
 };
}

/* Read back whatever is stored, dropping only what cannot be a snapshot: no
   usable time, or no rows array. Everything else is kept as written, including
   fields a later release adds, so an older device reading a newer ledger does
   not quietly strip them.

   SORTED OLDEST FIRST, because tempo is read as consecutive pairs and a
   backfilled swap from two weeks ago has to land in its own place rather than
   at the end. */
export function normalizeSheetLedger(value:unknown):SheetLedger{
 if(!Array.isArray(value))return [];
 const out:SheetSnapshot[]=[];
 const seen=new Set<string>();
 for(const candidate of value){
  if(!candidate||typeof candidate!=="object")continue;
  const snapshot=candidate as Partial<SheetSnapshot>;
  const at=when(snapshot.at);
  if(at===null||!Array.isArray(snapshot.rows))continue;
  const rows=snapshot.rows
   .filter(row=>row&&typeof row==="object"&&clean((row as SheetLedgerRow).b))
   .map(row=>({...row,b:clean((row as SheetLedgerRow).b),c:clean((row as SheetLedgerRow).c)}));
  const id=clean(snapshot.id)||"swap-"+at+"-"+rows.length;
  if(seen.has(id))continue;
  seen.add(id);
  out.push({...snapshot,id,at:new Date(at).toISOString(),shift:snapshot.shift??null,rows,
   off:Array.isArray(snapshot.off)?[...new Set(snapshot.off.map(clean).filter(Boolean))]:[]} as SheetSnapshot);
 }
 return out.sort((left,right)=>Date.parse(left.at)-Date.parse(right.at));
}

/* Add a swap, in time order, and drop the oldest past the cap.

   The cap drops from the FRONT because the front is the oldest. Dropping the
   newest to make room would keep a ledger that never learns anything after its
   fortieth swap, which is the failure mode a naive `if(length>=LIMIT)return`
   produces and is very hard to notice from outside. */
export function appendSnapshot(ledger:unknown,snapshot:SheetSnapshot,limit=SHEET_LEDGER_LIMIT):SheetLedger{
 const next=normalizeSheetLedger([...normalizeSheetLedger(ledger),snapshot]);
 return next.length>limit?next.slice(next.length-limit):next;
}

export type SwapTempo={
 at:string;
 shift:ShiftKey|null;
 /* Hours since the previous swap. Null for the first snapshot in the ledger,
    and for one that lands after a gap the caller cannot vouch for. A rate needs
    a denominator, and inventing one is how a forecast starts lying. */
 sinceHours:number|null;
 added:number;
 cleared:number;
 stuck:number;
 /* What KIND of work came on and came off, by catalog category. Curtis: "AC
    repairs and Check engine lights tend to stay on the longest. Producing a
    higher rate of downsheet stick!" — which is a statement about these two
    tallies diverging per category, and cannot be checked without them. */
 addedBy:Record<string,number>;
 clearedBy:Record<string,number>;
 stuckBy:Record<string,number>;
};

function tally(rows:SheetLedgerRow[],pick:(row:SheetLedgerRow)=>boolean){
 const out:Record<string,number>={};
 for(const row of rows)if(pick(row))out[row.c||"Uncategorised"]=(out[row.c||"Uncategorised"]||0)+1;
 return out;
}

/* One entry per swap that HAS a predecessor, so a ledger of N snapshots yields
   N-1 tempos. The first snapshot is a photograph of a sheet, not a measurement
   of a change, and reporting it as "98 added" would put a spike at the start of
   every fresh ledger. */
export function ledgerTempo(value:unknown):SwapTempo[]{
 const ledger=normalizeSheetLedger(value);
 const out:SwapTempo[]=[];
 for(let index=1;index<ledger.length;index++){
  const previous=ledger[index-1],current=ledger[index];
  const before=new Map(previous.rows.map(row=>[row.b,row]));
  const afterIds=new Set(current.rows.map(row=>row.b));
  const added=current.rows.filter(row=>!before.has(row.b));
  const stuck=current.rows.filter(row=>before.has(row.b));
  /* Cleared is what the swap itself said came off, intersected with what was
     actually there. `off` can name a bus the previous snapshot never held — a
     backfilled gap, or a row removed by hand between swaps — and counting it
     would credit the shift with clearing work it never had. */
  const cleared=previous.rows.filter(row=>current.off.includes(row.b)&&!afterIds.has(row.b));
  const gap=Date.parse(current.at)-Date.parse(previous.at);
  out.push({
   at:current.at,
   shift:current.shift,
   sinceHours:gap>0?gap/3600000:null,
   added:added.length,cleared:cleared.length,stuck:stuck.length,
   addedBy:tally(added,()=>true),
   clearedBy:tally(cleared,()=>true),
   stuckBy:tally(stuck,()=>true),
  });
 }
 return out;
}

export function readSheetLedger(storage:Pick<Storage,"getItem">):SheetLedger{
 try{return normalizeSheetLedger(JSON.parse(storage.getItem(SHEET_LEDGER_KEY)||"[]"))}
 catch{return []}
}

/* BEST EFFORT, AND THAT IS THE WHOLE CONTRACT.

   This is called from the middle of a sheet import. Losing one swap's tempo is
   a rounding error in a forecast; failing an import because a history file
   could not be written would cost a foreman the sheet he just photographed. So
   a failure is reported to the caller and the caller is expected to carry on —
   unlike the undo copy beside it, which genuinely must stop the import. */
export function writeSheetLedger(storage:Pick<Storage,"setItem">,ledger:SheetLedger){
 try{storage.setItem(SHEET_LEDGER_KEY,JSON.stringify(ledger));return {ok:true as const}}
 catch{return {ok:false as const}}
}

export function recordSheetSwap(
 storage:Pick<Storage,"getItem"|"setItem">,
 entries:LedgerSourceEntry[],
 removedBusIds:Iterable<string>,
 at=new Date().toISOString(),
 settings?:ShiftSettings,
 id?:string,
){
 const snapshot=snapshotFromEntries(entries,removedBusIds,at,settings,id);
 const ledger=appendSnapshot(readSheetLedger(storage),snapshot);
 return {...writeSheetLedger(storage,ledger),snapshot,ledger};
}
