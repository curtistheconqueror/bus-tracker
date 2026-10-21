/* the agent read surface: the Shop Cloud's rows, the MCP envelope, and the
   paging that stops an agent describing three quarters of the shop. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { BOARD_TABLES, FALLBACK_PROTOCOL_VERSION, INTERNAL_ERROR, INVALID_PARAMS, METHOD_NOT_FOUND, PAGE, TOOLS, TOOL_NAMES, boardFromRows, busDefects, discrepancies, downSheetView, findBus, fleetCounts, handleRpc, isReadOnlyToolSurface, locateBus, newestStamp, readBoardRows, readLiveRows, textResult } from "./helpers/modules.mjs";

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
 }
});

test("a notification is not answered",async()=>{
 const runner=async()=>textResult({});
 assert.equal(await handleRpc({jsonrpc:"2.0",method:"notifications/initialized"},runner),null);
 assert.equal(await handleRpc({jsonrpc:"2.0",method:"notifications/anything"},runner),null);
 /* No method and no id is not answerable and must not be answered. */
 assert.equal(await handleRpc({jsonrpc:"2.0"},runner),null);
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

/* `serverCap` is the fake project's own PostgREST max-rows, which is NOT the
   same number as the page we ask for and is the whole point of two of these
   tests. `ordered` records what each table was sorted by. */
function pagingClient(rowsByTable,{failOn="",serverCap=PAGE,ordered=[]}={}){
 return {from:table=>({select:()=>({is:()=>({order:(column,options)=>{
  ordered.push({table,column,options});
  return {range:async(from,to)=>{
   if(table===failOn)return {data:null,error:{message:"permission denied for table "+table}};
   const rows=rowsByTable[table]||[];
   const width=Math.min(to-from+1,serverCap);
   return {data:rows.slice(from,from+width),error:null};
  }};
 }})})})};
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
