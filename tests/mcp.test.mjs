/* the agent read surface: the Shop Cloud's rows, the MCP envelope, and the
   paging that stops an agent describing three quarters of the shop. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BOARD_TABLES, FALLBACK_PROTOCOL_VERSION, INTERNAL_ERROR, INVALID_PARAMS, INVALID_REQUEST, METHOD_NOT_FOUND, PAGE, TOOLS, TOOL_NAMES, boardFromRows, busDefects, discrepancies, downSheetView, findBus, fleetCounts, handleRpc, isReadOnlyToolSurface, locateBus, newestStamp, readBoardRows, readLiveRows, textResult, createSessionCache, sessionCacheKey } from "./helpers/modules.mjs";

const FETCHED="2026-10-21T12:00:00.000Z";

function busRow(fleetNumber,location,status,extra={}){
 return {fleet_number:fleetNumber,location,status,map_fields:extra.map_fields||{},updated_at:extra.updated_at||"2026-10-21T09:00:00.000Z"};
}
function defectRow(id,fleetNumber,category,issue,state,details="",at="2026-10-21T09:00:00.000Z"){
 return {defect_id:id,fleet_number:fleetNumber,category,issue,state,details,operability:"",reported_at:at,completed_at:"",completed_by:"",updated_at:at,detail:{}};
}
function entryRow(id,fleetNumber,extra={}){
 return {entry_id:id,fleet_number:fleetNumber,category:extra.category||"Engine",repair:extra.repair||"Oil leak",
  section:extra.section||"Pending",workflow:extra.workflow??"",shift:extra.shift||"1st",priority:"Routine",
  operational_status:extra.operational_status||"out",assignment_type:"",assigned_to:extra.assigned_to||"",
  entry_created_at:"",completed_at:"",updated_at:extra.updated_at||"2026-10-21T09:00:00.000Z",detail:{}};
}

/* THE ONE THAT MATTERS MOST. The Down Sheet owns the DS badge and the map reads
   it back — the cloud's `buses` table has no `down` column at all for exactly
   this reason. A bus row whose map_fields claim down, onDownSheet and
   downSheetReady, with nothing on the sheet behind it, must still come back as
   not on the sheet. An agent that reported otherwise would be asserting the one
   thing the map is forbidden to say. */
test("the map cannot put a bus on the Down Sheet, however its fields are written",()=>{
 const board=boardFromRows(
  [busRow("17549","garage-0","shop",{map_fields:{down:true,onDownSheet:true,downSheetReady:true}})],
  [],[],FETCHED);
 assert.equal(locateBus(board,"17549").onDownSheet,false);
 assert.equal(board.buses[0].down,false);
});

test("an active sheet entry is what puts a bus on the sheet, and a completed one does not",()=>{
 const buses=[busRow("17549","garage-0","shop"),busRow("17550","garage-1","shop")];
 const board=boardFromRows(buses,[],[entryRow("e1","17549"),entryRow("e2","17550",{workflow:"Completed"})],FETCHED);
 assert.equal(locateBus(board,"17549").onDownSheet,true);
 assert.equal(locateBus(board,"17550").onDownSheet,false);
});

/* Five copies of the location table existed and all five named a trouble bay
   "Main Garage". This surface resolves through location-label.ts, so it cannot
   be the sixth. */
test("a trouble bay is named as itself rather than as the garage it sits in",()=>{
 const board=boardFromRows([busRow("17549","garage-11","shop"),busRow("17550","garage-0","shop")],[],[],FETCHED);
 assert.equal(locateBus(board,"17549").location,"Trouble Bay 12");
 assert.equal(locateBus(board,"17550").location,"Main Garage");
 assert.equal(locateBus(board,"17549").locationId,"garage-11");
});

/* A bus id is device-local, so fleet number is the only address this offers —
   and it is exact. A tool that guesses which bus was meant eventually sends
   somebody to the wrong one. */
test("a bus is found by its exact fleet number and never guessed at",()=>{
 const board=boardFromRows([busRow("17549","garage-0","shop")],[],[],FETCHED);
 assert.equal(locateBus(board,"17549").found,true);
 assert.equal(locateBus(board," 17549 ").found,true);
 assert.equal(locateBus(board,"1754").found,false);
 assert.equal(locateBus(board,"175491").found,false);
 assert.equal(locateBus(board,"").found,false);
 assert.equal(findBus(board,"1754"),undefined);
});

/* The gap between these two is how stale the shop's own copy is, and a quiet
   morning and a garage with no wifi look identical from here. asOf has to come
   off the rows: quoting the moment of the read would describe every board as
   current, including one nobody has pushed to since Friday. */
test("asOf is the newest stamp the rows carry, not the moment the cloud was read",()=>{
 const board=boardFromRows(
  [busRow("17549","garage-0","shop",{updated_at:"2026-10-21T09:30:00.000Z"})],
  [defectRow("d1","17549","Engine","Oil leak","open","","2026-10-21T10:15:00.000Z")],
  [],FETCHED);
 assert.equal(board.asOf,"2026-10-21T10:15:00.000Z");
 assert.equal(board.fetchedAt,FETCHED);
 assert.equal(locateBus(board,"17549").asOf,"2026-10-21T10:15:00.000Z");
 assert.equal(newestStamp([[],[]]),"");
});

/* The database keeps what was written, because rewriting it would throw away
   the one thing that makes the catalog's renames safe. So the reader migrates:
   a defect stored as "Air System — Leak" reads as Pneumatic System, and the
   structured fields have to agree with the sentence or an agent is handed a
   contradiction it may well repeat out loud. */
test("a defect stored under a renamed category reads as the wording the shop uses now",()=>{
 const board=boardFromRows(
  [busRow("17549","garage-0","shop")],
  [defectRow("d1","17549","Air System","Leak","open","hissing")],
  [],FETCHED);
 const [defect]=busDefects(board,"17549").defects;
 assert.match(defect.label,/^Pneumatic System — Leak/);
 assert.equal(defect.category,"Pneumatic System");
 assert.equal(defect.issue,"Leak");
});

test("completed defects are left out until they are asked for",()=>{
 const board=boardFromRows(
  [busRow("17549","garage-0","shop")],
  [defectRow("d1","17549","Engine","Oil leak","open"),defectRow("d2","17549","Brakes","Brake chamber leaking","completed")],
  [],FETCHED);
 assert.equal(busDefects(board,"17549").defects.length,1);
 assert.equal(busDefects(board,"17549").defects[0].open,true);
 assert.equal(busDefects(board,"17549",true).defects.length,2);
 assert.equal(locateBus(board,"17549").openDefects,1);
 assert.equal(busDefects(board,"99999").found,false);
});

test("the Down Sheet view filters by section and shift and hides completed rows",()=>{
 const buses=[busRow("17549","garage-0","shop"),busRow("17550","garage-1","shop"),busRow("17551","garage-2","shop")];
 const entries=[
  entryRow("e1","17549",{section:"Pending",shift:"1st"}),
  entryRow("e2","17550",{section:"Roadcall",shift:"2nd"}),
  entryRow("e3","17551",{section:"Pending",shift:"1st",workflow:"Completed"}),
 ];
 const board=boardFromRows(buses,[],entries,FETCHED);
 assert.equal(downSheetView(board).total,2);
 assert.equal(downSheetView(board,{includeCompleted:true}).total,3);
 assert.equal(downSheetView(board,{section:"Roadcall"}).total,1);
 assert.equal(downSheetView(board,{section:"roadcall"}).total,1);
 assert.equal(downSheetView(board,{shift:"1st"}).total,1);
 const [row]=downSheetView(board,{section:"Pending"}).entries;
 assert.equal(row.fleetNumber,"17549");
 assert.equal(row.location,"Main Garage");
});

/* The discrepancy Curtis asked for by name: a bus standing in a working area
   that nobody wrote up. The rule lives in mystery-buses.ts; this asserts the
   surface reports it, and the two exclusions that keep it useful. */
test("discrepancies name the buses parked in a working area with nothing on the sheet",()=>{
 const buses=[
  busRow("17549","bay-1","defect"),
  busRow("17550","bay-2","defect"),
  busRow("17551","bay-3","decommissioned"),
  busRow("17552","garage-0","shop"),
 ];
 const board=boardFromRows(buses,[],[entryRow("e1","17550")],FETCHED);
 const found=discrepancies(board);
 assert.equal(found.mysteryCount,1);
 assert.equal(found.mysteryBuses[0].fleetNumber,"17549");
 assert.equal(found.mysteryBuses[0].location,"Shop Bay");
 const numbers=found.mysteryBuses.map(bus=>bus.fleetNumber);
 assert.ok(!numbers.includes("17550"),"a bus with an active sheet entry is not a mystery");
 assert.ok(!numbers.includes("17551"),"a decommissioned bus is not a mystery");
 assert.ok(!numbers.includes("17552"),"the garage is not a working area");
});

test("the counts come back as the Fleet Status Report's own numbers",()=>{
 const buses=[busRow("17549","garage-0","out"),busRow("17550","garage-1","shop"),busRow("17551","road-0","service")];
 const defects=[defectRow("d1","17550","Engine","Oil leak","open")];
 const board=boardFromRows(buses,defects,[entryRow("e1","17549")],FETCHED);
 const counts=fleetCounts(board,FETCHED);
 assert.equal(counts.fleetSize,3);
 assert.equal(counts.onSheet,1);
 assert.equal(counts.downedTotal,counts.downed+counts.softDowned);
 assert.equal(counts.withOpenDefects,1);
 assert.equal(counts.openDefects,1);
 assert.equal(counts.onDownSheetBadge,1);
});

/* ---- the MCP envelope ---- */

test("the tool surface is the five read questions and carries no write tool",()=>{
 assert.deepEqual(TOOL_NAMES,["locate_bus","bus_defects","down_sheet","fleet_counts","discrepancies"]);
 assert.equal(isReadOnlyToolSurface(),true);
 for(const tool of TOOLS){
  assert.ok(tool.description.length>40,tool.name+" needs a description a model can act on");
  assert.equal(tool.inputSchema.additionalProperties,false,tool.name+" must refuse arguments it does not know");
  assert.ok(!/log_|add_|set_|move_|relocate|update_|delete_|write_|clear_/.test(tool.name),tool.name+" looks like a write tool");
  /* The read-only promise has to reach the AGENT, not just this test. A client
     that cannot see these hints may stop and ask its user before every read. */
  assert.equal(tool.annotations.readOnlyHint,true,tool.name+" must declare itself read-only to the client");
  assert.equal(tool.annotations.destructiveHint,false,tool.name+" must declare itself non-destructive");
  assert.equal(tool.annotations.idempotentHint,true,tool.name+" must declare itself idempotent");
 }
});

test("a notification is not answered",async()=>{
 const runner=async()=>textResult({});
 assert.equal(await handleRpc({jsonrpc:"2.0",method:"notifications/initialized"},runner),null);
 assert.equal(await handleRpc({jsonrpc:"2.0",method:"notifications/anything"},runner),null);
 /* No method and no id is not answerable and must not be answered. */
 assert.equal(await handleRpc({jsonrpc:"2.0"},runner),null);
});

/* A body that is valid JSON but not an object has no id, and an absent id is
   how a notification is recognised — so `null` and `42` came back as 202 with
   an empty body, which the caller cannot tell from "accepted, nothing to say". */
test("a body that is not an object is an invalid request, not a notification",async()=>{
 const runner=async()=>textResult({});
 for(const body of [null,42,"hello",true,[]]){
  const response=await handleRpc(body,runner);
  assert.ok(response,JSON.stringify(body)+" must be answered, not swallowed");
  assert.equal(response.error.code,INVALID_REQUEST,JSON.stringify(body)+" must be -32600");
  assert.equal(response.id,null);
 }
});

test("initialize echoes the version the client offered and falls back when it offers none",async()=>{
 const runner=async()=>textResult({});
 const echoed=await handleRpc({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2099-01-01"}},runner);
 assert.equal(echoed.result.protocolVersion,"2099-01-01");
 assert.deepEqual(echoed.result.capabilities,{tools:{}});
 const fallback=await handleRpc({jsonrpc:"2.0",id:2,method:"initialize",params:{}},runner);
 assert.equal(fallback.result.protocolVersion,FALLBACK_PROTOCOL_VERSION);
 const ping=await handleRpc({jsonrpc:"2.0",id:3,method:"ping"},runner);
 assert.deepEqual(ping.result,{});
});

test("tools/list returns the schemas and an unknown method is refused",async()=>{
 const runner=async()=>textResult({});
 const listed=await handleRpc({jsonrpc:"2.0",id:1,method:"tools/list"},runner);
 assert.equal(listed.result.tools.length,5);
 const unknown=await handleRpc({jsonrpc:"2.0",id:2,method:"resources/read"},runner);
 assert.equal(unknown.error.code,METHOD_NOT_FOUND);
});

/* A protocol fault is a JSON-RPC error; a tool that ran and could not answer is
   a successful response carrying isError. An agent handed -32603 because a bus
   number was not on the board learns nothing it can act on. */
test("a bad call is a protocol error and a failed tool is a result",async()=>{
 const runner=async()=>textResult({});
 const noName=await handleRpc({jsonrpc:"2.0",id:1,method:"tools/call",params:{}},runner);
 assert.equal(noName.error.code,INVALID_PARAMS);
 const noSuchTool=await handleRpc({jsonrpc:"2.0",id:2,method:"tools/call",params:{name:"delete_everything"}},runner);
 assert.equal(noSuchTool.error.code,INVALID_PARAMS);
 assert.match(noSuchTool.error.message,/tools\/list/);
 const missingArg=await handleRpc({jsonrpc:"2.0",id:3,method:"tools/call",params:{name:"locate_bus",arguments:{}}},runner);
 assert.equal(missingArg.error.code,INVALID_PARAMS);
 assert.match(missingArg.error.message,/fleet_number/);
 const thrown=await handleRpc({jsonrpc:"2.0",id:4,method:"tools/call",params:{name:"fleet_counts",arguments:{}}},
  async()=>{throw new Error("the shop cloud fell over")});
 assert.equal(thrown.error.code,INTERNAL_ERROR);
 assert.match(thrown.error.message,/fell over/);
 const failed=await handleRpc({jsonrpc:"2.0",id:5,method:"tools/call",params:{name:"fleet_counts",arguments:{}}},
  async()=>textResult({error:"unreachable"},true));
 assert.equal(failed.error,undefined);
 assert.equal(failed.result.isError,true);
});

test("a tool call reaches the runner with its arguments",async()=>{
 const seen=[];
 const runner=async(name,args)=>{seen.push([name,args]);return textResult({ok:true})};
 const response=await handleRpc({jsonrpc:"2.0",id:1,method:"tools/call",
  params:{name:"bus_defects",arguments:{fleet_number:"17549",include_completed:true}}},runner);
 assert.deepEqual(seen,[["bus_defects",{fleet_number:"17549",include_completed:true}]]);
 assert.equal(response.result.content[0].type,"text");
 assert.deepEqual(JSON.parse(response.result.content[0].text),{ok:true});
});

/* ---- paging ---- */

/* A keyset-aware fake of the Shop Cloud.

   `serverCap` is the fake project's own PostgREST row cap, which is NOT the
   page we ask for — the difference is the point of one of these tests.
   `afterFirstPage` rewrites the table between pages, which is what makes the
   two concurrency tests regression tests rather than restatements of the
   implementation: the rows genuinely move under the walk, the way they do when
   a phone pushes mid-read. */
function pagingClient(rowsByTable,{failOn="",serverCap=PAGE,ordered=[],afterFirstPage=null}={}){
 const tables=new Map(Object.entries(rowsByTable).map(([table,rows])=>[table,rows.slice()]));
 let requests=0;
 const sorted=(rows,key)=>rows.slice().sort((a,b)=>
  String(a[key])<String(b[key])?-1:String(a[key])>String(b[key])?1:0);
 return {from:table=>({select:()=>({is:()=>{
  const serve=after=>({order:(column,options)=>{
   ordered.push({table,column,options});
   return {limit:async count=>{
    if(table===failOn)return {data:null,error:{message:"permission denied for table "+table}};
    const rows=sorted(tables.get(table)||[],column);
    const eligible=after===undefined?rows:rows.filter(row=>String(row[column])>String(after));
    const page=eligible.slice(0,Math.min(count,serverCap));
    requests+=1;
    if(requests===1&&afterFirstPage)tables.set(table,afterFirstPage(tables.get(table)||[]));
    return {data:page,error:null};
   }};
  }});
  return Object.assign(serve(undefined),{gt:(column,value)=>serve(value)});
 }})})};
}

const TABLE_NAMES=BOARD_TABLES.map(entry=>entry.table);
const BUSES=BOARD_TABLES[0];

/* PostgREST's row cap is silent — the response looks complete. A reader that
   takes the first page at face value has an agent confidently describing part
   of the shop, which is worse than an error. */
test("a table larger than one page is read to the end",async()=>{
 const rows=Array.from({length:PAGE+7},(unused,index)=>({fleet_number:String(20000+index)}));
 const {rows:read,error}=await readLiveRows(pagingClient({buses:rows}),BUSES.table,BUSES.key);
 assert.equal(error,"");
 assert.equal(read.length,PAGE+7);
 assert.equal(read[PAGE+6].fleet_number,String(20000+PAGE+6));
});

/* THE ONE THE OLD LOOP GOT WRONG. A project whose own max-rows is set below
   the page we ask for returns a short page on EVERY request, including the
   first. Stopping on a short page therefore ended the read at the server's cap
   and reported success — 500 of 1,600 defects, silently. The walk now advances
   by what came back and stops only on an empty page. */
test("a project whose own row cap is smaller than the page size is still read to the end",async()=>{
 const rows=Array.from({length:PAGE+7},(unused,index)=>({fleet_number:String(20000+index)}));
 for(const serverCap of [1,7,499,500,PAGE-1]){
  const {rows:read,error}=await readLiveRows(pagingClient({buses:rows},{serverCap}),BUSES.table,BUSES.key);
  assert.equal(error,"");
  assert.equal(read.length,PAGE+7,"a cap of "+serverCap+" must not truncate the read");
 }
});

/* Postgres promises no row order without an `order by`, and `range` is an
   offset into that order. Phones push while this walk is half way through, so
   an unordered read can see a moved row twice or never. */
test("every table is paged in a stable order, by a unique key",async()=>{
 const ordered=[];
 const rowsByTable={buses:[{fleet_number:"17549"}],bus_defects:[{defect_id:"d1"}],down_sheet_entries:[{entry_id:"e1"}]};
 await readBoardRows(pagingClient(rowsByTable,{ordered}));
 /* Asserted per table rather than as a call list, because the number of calls
    is not the point and is not fixed: every table costs one extra request that
    comes back empty, which is what ending on an empty page buys. What must
    hold is that each table was ordered, only ever by its own key, ascending. */
 const columnsByTable=new Map();
 for(const call of ordered){
  assert.equal(call.options.ascending,true,call.table+" must be ordered ascending");
  columnsByTable.set(call.table,(columnsByTable.get(call.table)||new Set()).add(call.column));
 }
 assert.deepEqual([...columnsByTable.keys()],TABLE_NAMES,"every board table must be ordered");
 for(const {table,key} of BOARD_TABLES)
  assert.deepEqual([...columnsByTable.get(table)],[key],table+" must page by "+key+" and nothing else");
});

/* THE CASE ORDERING ALONE DID NOT FIX. A phone soft-deletes a row behind the
   walk: it leaves the result set, everything after it shifts up one, and an
   offset-based next page starts one row too far — a live row never read, with
   error:"" reported. A keyset walk resumes after the last key it SAW, so what
   happens elsewhere in the table cannot move it. */
test("a row soft-deleted behind the walk does not cost a live row",async()=>{
 const rows=["a","b","c","d","e"].map(id=>({fleet_number:id}));
 const {rows:read,error}=await readLiveRows(
  pagingClient({buses:rows},{serverCap:2,afterFirstPage:live=>live.filter(row=>row.fleet_number!=="a")}),
  BUSES.table,BUSES.key);
 assert.equal(error,"");
 const numbers=read.map(row=>row.fleet_number);
 for(const survivor of ["b","c","d","e"])
  assert.equal(numbers.filter(number=>number===survivor).length,1,survivor+" must be read exactly once");
});

/* The mirror case: an insert behind the walk shifts an offset DOWN one and a
   row is read twice, so the board would hold two copies of one defect and
   report a bus somebody then goes looking for. */
test("a row inserted behind the walk is not read twice",async()=>{
 const rows=["b","c","d","e","f"].map(id=>({fleet_number:id}));
 const {rows:read,error}=await readLiveRows(
  pagingClient({buses:rows},{serverCap:2,afterFirstPage:live=>[{fleet_number:"a"},...live]}),
  BUSES.table,BUSES.key);
 assert.equal(error,"");
 const numbers=read.map(row=>row.fleet_number);
 assert.equal(numbers.length,new Set(numbers).size,"no row may be read twice: "+numbers.join(","));
});

/* A row with no key would make the next request ask for everything greater
   than undefined — the whole table, forever — in an edge function that would
   spin until it was killed. The columns are NOT NULL so Postgres cannot
   produce this; it is refused anyway. */
test("a row missing its page key fails the read instead of looping",async()=>{
 const {rows,error}=await readLiveRows(
  pagingClient({buses:[{fleet_number:"a"},{}]},{serverCap:2}),BUSES.table,BUSES.key);
 assert.deepEqual(rows,[]);
 assert.match(error,/missing its fleet_number/);
});

test("a refused read returns no rows and says why",async()=>{
 const {rows,error}=await readLiveRows(pagingClient({buses:[]},{failOn:"buses"}),BUSES.table,BUSES.key);
 assert.deepEqual(rows,[]);
 assert.match(error,/permission denied/);
});

/* An agent told "nothing is down" because the buses read was refused would be
   wrong in the worst direction, so one failed table fails the whole board. */
test("one unreadable table fails the whole board rather than half of it",async()=>{
 const rowsByTable={buses:[{fleet_number:"17549"}],bus_defects:[{defect_id:"d1"}],down_sheet_entries:[{entry_id:"e1"}]};
 const ok=await readBoardRows(pagingClient(rowsByTable));
 assert.equal(ok.error,"");
 assert.equal(ok.buses.length,1);
 assert.equal(ok.defects.length,1);
 assert.equal(ok.entries.length,1);
 for(const table of TABLE_NAMES){
  const failed=await readBoardRows(pagingClient(rowsByTable,{failOn:table}));
  assert.match(failed.error,new RegExp(table),table+" failing must be reported");
  assert.deepEqual(failed.buses,[]);
  assert.deepEqual(failed.defects,[]);
  assert.deepEqual(failed.entries,[]);
 }
});

/* ---- the route's own promises, read out of its source ---- */

/* Read-only is a property of there being no write code path, so the assertion
   has to be about the source rather than about a return value. If somebody adds
   an insert to the route, this is what stops it going out as "Phase 1". */
test("the agent route holds no write call and no hard-coded secret",async()=>{
 const source=await readFile(new URL("../app/api/mcp/route.ts",import.meta.url),"utf8");
 for(const write of [".insert(",".upsert(",".update(",".delete(",".rpc("]){
  assert.ok(!source.includes(write),"the read-only agent route must not contain "+write);
 }
 /* Every secret arrives from the Worker environment. A literal key or password
    in here would be committed, which this project forbids outright. */
 for(const name of ["MCP_TOKEN","SUPABASE_URL","SUPABASE_ANON_KEY","SHOP_EMAIL","SHOP_PASSWORD"]){
  assert.match(source,new RegExp("runtimeEnv\\."+name),name+" must come from the environment");
 }
 assert.ok(!/eyJ[A-Za-z0-9_-]{20,}/.test(source),"no JWT-shaped literal may be committed in the route");
 /* A bearer compared with === leaks how much of it was right. */
 assert.ok(source.includes("sameSecret"),"the token comparison must be the length-safe one");
 assert.ok(!/offered===token|token===offered/.test(source),"the token must not be compared with ===");
});

/* ---- the signed-in client cache ---- */

/* The whole value of this cache is in when it LETS GO. Nothing renews the
   token behind a cached client — no storage, no refresh timer — so a cache
   that held on forever would answer "the shop cloud could not be read" for as
   long as the isolate lived, which is an endpoint that works for an hour of
   uptime and then stops. */
test("a signed-in client is reused for the same credentials and re-signed-in after a failure",async()=>{
 let signIns=0;
 const signIn=async()=>{signIns+=1;return {client:{id:signIns},error:""}};
 const cache=createSessionCache();
 const key=sessionCacheKey({url:"u",anonKey:"a",email:"e",password:"p"});

 const first=await cache.get(key,signIn);
 assert.equal(first.client.id,1);
 assert.equal(cache.isWarm(),true);
 /* Warm: the same credentials must not pay for a second round trip. */
 assert.equal((await cache.get(key,signIn)).client.id,1);
 assert.equal(signIns,1);

 /* A read failed, so the client is suspect and goes. */
 cache.invalidate();
 assert.equal(cache.isWarm(),false);
 assert.equal((await cache.get(key,signIn)).client.id,2);
 assert.equal(signIns,2);
});

/* Keyed on the URL and email alone, a rotated password would leave a warm
   isolate serving from the old session and the rotation would look like it had
   not taken. */
test("changing any credential, the password included, re-signs in",async()=>{
 const base={url:"u",anonKey:"a",email:"e",password:"p"};
 const keys=new Set([
  sessionCacheKey(base),
  sessionCacheKey({...base,url:"u2"}),
  sessionCacheKey({...base,anonKey:"a2"}),
  sessionCacheKey({...base,email:"e2"}),
  sessionCacheKey({...base,password:"p2"}),
 ]);
 assert.equal(keys.size,5,"every credential must take part in the key");

 let signIns=0;
 const signIn=async()=>{signIns+=1;return {client:{id:signIns},error:""}};
 const cache=createSessionCache();
 await cache.get(sessionCacheKey(base),signIn);
 await cache.get(sessionCacheKey({...base,password:"rotated"}),signIn);
 assert.equal(signIns,2,"a rotated password must not be served from the old session");
});

/* A bad minute must not be inherited by every later request in this isolate. */
test("a failed sign-in is not cached",async()=>{
 let attempts=0;
 const signIn=async()=>{
  attempts+=1;
  return attempts===1?{client:null,error:"the shop cloud rejected the sign-in"}:{client:{ok:true},error:""};
 };
 const cache=createSessionCache();
 const key=sessionCacheKey({url:"u",anonKey:"a",email:"e",password:"p"});
 const failed=await cache.get(key,signIn);
 assert.equal(failed.client,null);
 assert.match(failed.error,/rejected/);
 assert.equal(cache.isWarm(),false);
 const recovered=await cache.get(key,signIn);
 assert.deepEqual(recovered.client,{ok:true});
 assert.equal(recovered.error,"");
 assert.equal(attempts,2);
});

/* A sign-in that resolves with neither a client nor a reason still has to say
   something an agent can read. */
test("a sign-in that fails without a message still reports one",async()=>{
 const cache=createSessionCache();
 const {client,error}=await cache.get("k",async()=>({client:null,error:""}));
 assert.equal(client,null);
 assert.ok(error.length>0);
});

/* The route must actually drop the client when a read fails, not merely own a
   cache that could. Asserted against the source, because the alternative needs
   a Worker and a live project. */
test("the route invalidates the cached session when a board read fails",async()=>{
 const source=await readFile(new URL("../app/api/mcp/route.ts",import.meta.url),"utf8");
 assert.match(source,/if\(rows\.error\)\{sessions\.invalidate\(\)/,
  "a failed board read must drop the cached client");
 assert.ok(!source.includes("let clientKey"),"the hand-rolled cache must be gone");
 assert.match(source,/sessionCacheKey\(credentials\)/,"the cache key must come from session-cache.ts");
});
