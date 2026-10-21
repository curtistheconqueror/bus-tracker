/* Getting the rows out of the Shop Cloud, and nothing else.

   Kept out of the route so the route stays thin and this stays testable: the
   client is a structural interface rather than a Supabase import, so a test can
   hand it a fake that returns pages and assert the paging without a network, an
   account or a key.

   READS ONLY. `select`, `is`, `order` and `range` are the only verbs this
   interface describes. A write would need a method that is not on the type,
   which is a compile error rather than a code review. */

import type {CloudRow} from "../cloud/cloud-sync.ts";

/* The three tables and the column each is ordered by, in ONE structure.

   The key rides beside the table rather than in a second map, because two
   lists that must agree is this project's most reliably repeated bug — five
   copies of the location table, all five wrong — and `readLiveRows` takes the
   key as a required argument so a caller cannot forget it. */
export const BOARD_TABLES=[
 {table:"buses",key:"fleet_number"},
 {table:"bus_defects",key:"defect_id"},
 {table:"down_sheet_entries",key:"entry_id"},
] as const;

/* PostgREST caps how many rows one request returns and THE CAP IS SILENT — the
   response looks complete. This fleet is around four hundred buses and a bus can
   carry several defects, and `bus_defects` keeps completed ones forever, so the
   cap is reachable in ordinary use and a truncated read would have an agent
   confidently describing part of the shop.

   This is a REQUEST size, not an assumption about the server's. An earlier
   version of this comment claimed "correctness here is the loop and not the
   stride" and that was wrong in a way worth recording: the loop stopped on
   `page.length<PAGE`, so a project whose own `max-rows` is set BELOW this
   number would return a short first page, and the read would end silently
   having seen 500 of 1,600 defects. The stop condition was the stride. It no
   longer is — the walk advances by what came back and ends only on an empty
   page, so any server cap at or below this one is read to the end. */
export const PAGE=1000;

type Paged={range(from:number,to:number):Promise<{data:CloudRow[]|null;error:{message:string}|null}>};
type Ordered={order(column:string,options?:{ascending?:boolean}):Paged};
export type ReadableClient={from(table:string):{select(columns:string):{is(column:string,value:null):Ordered}}};

export type RowsOutcome={rows:CloudRow[];error:string};

/* The live rows of one table: `deleted_at is null`, ordered, in pages.

   ORDERED BECAUSE POSTGRES MAKES NO PROMISE OTHERWISE. Without an `order by`,
   two queries against the same table may return rows in different sequences,
   and `range` is an offset into that sequence. Phones push while this walk is
   half way through, so an updated row can move — and once a table is bigger
   than one page, a row that moves can be read twice or not at all. The symptom
   would be a defect count that is quietly wrong, which is the one direction a
   maintenance number must never be wrong in. Ordering on a unique key makes the
   sequence the same every time.

   Deleted rows are left behind deliberately. The schema soft-deletes so a
   removal can travel between devices as a tombstone, and an agent has no
   business reading a record the shop has taken off — a deleted defect's fields
   must never come back as current, which is the mistake the tombstone ledgers
   exist to prevent on the devices. */
export async function readLiveRows(client:ReadableClient,table:string,key:string):Promise<RowsOutcome>{
 const rows:CloudRow[]=[];
 for(let from=0;;){
  const {data,error}=await client.from(table).select("*").is("deleted_at",null)
   .order(key,{ascending:true}).range(from,from+PAGE-1);
  if(error)return {rows:[],error:error.message||"The shop cloud could not be read."};
  const page=data||[];
  /* Empty is the only end. A SHORT page is not: it is what a server whose own
     cap is smaller than PAGE returns on every request, including the first.

     The cost is one extra request per table that comes back empty — three per
     board read. That is the price of not being able to know the server's cap
     from here, and it is worth paying: the alternative is a read that ends
     early and says it succeeded. */
  if(!page.length)return {rows,error:""};
  rows.push(...page);
  from+=page.length;
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
 const [buses,defects,entries]=BOARD_TABLES;
 const empty={buses:[],defects:[],entries:[]};
 const busRows=await readLiveRows(client,buses.table,buses.key);
 if(busRows.error)return {...empty,error:busRows.error};
 const defectRows=await readLiveRows(client,defects.table,defects.key);
 if(defectRows.error)return {...empty,error:defectRows.error};
 const entryRows=await readLiveRows(client,entries.table,entries.key);
 if(entryRows.error)return {...empty,error:entryRows.error};
 return {buses:busRows.rows,defects:defectRows.rows,entries:entryRows.rows,error:""};
}
