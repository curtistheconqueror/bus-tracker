/* Getting the rows out of the Shop Cloud, and nothing else.

   Kept out of the route so the route stays thin and this stays testable: the
   client is a structural interface rather than a Supabase import, so a test can
   hand it a fake that returns pages and assert the paging without a network, an
   account or a key.

   READS ONLY. `select` is the only verb this interface describes. A write would
   need a method that is not on the type, which is a compile error rather than a
   code review. */

import type {CloudRow} from "../cloud/cloud-sync.ts";

export const BOARD_TABLES=["buses","bus_defects","down_sheet_entries"] as const;

/* PostgREST caps how many rows one request returns and THE CAP IS SILENT — the
   response looks complete. This fleet is around four hundred buses and a bus can
   carry several defects, so the cap is reachable in ordinary use, and a
   truncated read would have an agent confidently describing three quarters of
   the shop. Read in pages until a short page says that was the end.

   `cloud-client.ts` pages for the same reason with the same size. That is a
   mechanism rather than a rule, so the two are allowed to be separate: if these
   numbers ever differ, both readers are still correct, because correctness here
   is the loop and not the stride. */
export const PAGE=1000;

type Paged={range(from:number,to:number):Promise<{data:CloudRow[]|null;error:{message:string}|null}>};
export type ReadableClient={from(table:string):{select(columns:string):{is(column:string,value:null):Paged}}};

export type RowsOutcome={rows:CloudRow[];error:string};

/* The live rows of one table: `deleted_at is null`.

   Deleted rows are left behind deliberately. The schema soft-deletes so a
   removal can travel between devices as a tombstone, and an agent has no
   business reading a record the shop has taken off — a deleted defect's fields
   must never come back as current, which is the mistake the tombstone ledgers
   exist to prevent on the devices. */
export async function readLiveRows(client:ReadableClient,table:string):Promise<RowsOutcome>{
 const rows:CloudRow[]=[];
 for(let from=0;;from+=PAGE){
  const {data,error}=await client.from(table).select("*").is("deleted_at",null).range(from,from+PAGE-1);
  if(error)return {rows:[],error:error.message||"The shop cloud could not be read."};
  const page=data||[];
  rows.push(...page);
  if(page.length<PAGE)return {rows,error:""};
 }
}

export type BoardRows={buses:CloudRow[];defects:CloudRow[];entries:CloudRow[];error:string};

/* All three tables, in one place, so a partial read is never mistaken for a
   quiet shop.

   Sequential rather than parallel on purpose: three concurrent paged reads from
   one edge invocation is three times the connections for a board that is read
   in well under a second, and a failure part way through is easier to report
   honestly when there is one place it can happen. If any table fails the whole
   read fails — an agent told "0 buses are down" because the `buses` read was
   refused would be wrong in the worst direction. */
export async function readBoardRows(client:ReadableClient):Promise<BoardRows> {
 /* Destructured from BOARD_TABLES rather than written out again, so the list
    this module exports and the tables it actually reads cannot drift apart.
    Two lists that must agree is this project's most reliably repeated bug —
    five copies of the location table, all five wrong. */
 const [BUSES,DEFECTS,ENTRIES]=BOARD_TABLES;
 const empty={buses:[],defects:[],entries:[]};
 const buses=await readLiveRows(client,BUSES);
 if(buses.error)return {...empty,error:buses.error};
 const defects=await readLiveRows(client,DEFECTS);
 if(defects.error)return {...empty,error:defects.error};
 const entries=await readLiveRows(client,ENTRIES);
 if(entries.error)return {...empty,error:entries.error};
 return {buses:buses.rows,defects:defects.rows,entries:entries.rows,error:""};
}
