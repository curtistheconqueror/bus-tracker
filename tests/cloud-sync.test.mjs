/* the Shop Cloud: row shapes, fingerprints and the tombstone ledgers. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { busRow, busUpdatedAt, changedRows, cloudConfigProblem, cloudFailurePhase, cloudStatusLabel, defectLogPayload, defectRow, downSheetPayload, downSheetRow, fleetMapPayload, mergeDefectLog, mergeDownSheet, mergeFleetMap, normalizeCloudConfig, readCloudConfig, readFleetPayload, readSentFingerprints, rowFingerprint, writeCloudConfig } from "./helpers/modules.mjs";
import { memoryStorage } from "./helpers/setup.mjs";

test("a cloud bus row carries the map's fields and none of the Down Sheet's",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"cj",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 const bus={id:"local-1",n:"17549",l:"BAY 12",s:"shop",mechanic:"RM",bay12Watch:true,
  lastLocationChangeAt:"2026-08-30T09:00:00.000Z",lastStatusChangeAt:"2026-08-30T11:00:00.000Z",
  defects:[{id:"d1",category:"Engine",issue:"Overheating",state:"open"}],
  down:true,onDownSheet:true,downSheetReady:true,pendingRepair:"belt"};
 const row=busRow(bus,config,now);
 // The map may not assert whether a bus is down. The buses table has no column
 // for it either, so this is the same rule enforced twice.
 for(const held of ["down","onDownSheet","downSheetReady","defects","pendingRepair"]){
  assert.ok(!(held in row),held+" must not be a column on a bus row");
  assert.ok(!(held in row.map_fields),held+" must not ride along in map_fields");
 }
 // The local id is this device's name for the bus and means nothing elsewhere.
 assert.ok(!("id" in row.map_fields));
 assert.equal(row.fleet_number,"17549");
 assert.equal(row.map_fields.mechanic,"RM");
 assert.equal(row.map_fields.bay12Watch,true);
 // Initials are shouted everywhere in this app, so they are stored shouted.
 assert.equal(row.updated_by,"CJ");
 // A bus carries no updatedAt of its own. Sending "now" would mean the last
 // device to sync always wins, even holding week-old data, so the newest stamp
 // the record does keep is used instead.
 assert.equal(row.updated_at,"2026-08-30T11:00:00.000Z");
 assert.equal(busUpdatedAt({},"2026-01-01T00:00:00.000Z"),"2026-01-01T00:00:00.000Z");
 assert.equal(busRow({n:"  "},config,now),null);
 // A status outside the table's check constraint would be rejected by the
 // database; it becomes unknown here rather than failing the whole push.
 assert.equal(busRow({n:"1",s:"parked"},config,now).status,"unknown");
});

test("cloud rows come back as transfer payloads so the shipped merge rules apply unchanged",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 const cloudBus={id:"sender-1",n:"17549",l:"BAY 12",s:"shop",mechanic:"RM",
  lastStatusChangeAt:"2026-08-30T11:00:00.000Z",defects:[],down:false,onDownSheet:false,downSheetReady:false};
 const cloudDefect={id:"d1",category:"Engine",issue:"Overheating",state:"open",operability:"service",details:"runs hot",repairHours:1.5};
 const cloudEntry={id:"e1",busId:"SENDER-ID",busNumber:"17549",category:"Engine",repair:"Overheating",
  workflow:"Scheduled",priority:"High",updatedAt:"2026-08-30T10:00:00.000Z",timeEstimate:{repairMinutes:60}};

 // The receiving device knows this bus by a different id, has it somewhere
 // else, has its own defect on it, and has it on its own Down Sheet.
 const local=[{id:"other-1",n:"17549",l:"SOUTH LOT",s:"service",
  defects:[{id:"mine",category:"Air Leak",issue:"Leaking air bag - rear",state:"open"}],
  down:true,onDownSheet:true,downSheetReady:true,pendingRepair:""}];

 const afterMap=mergeFleetMap(local,fleetMapPayload([busRow(cloudBus,config,now)],now));
 const merged=afterMap.buses[0];
 assert.equal(merged.l,"BAY 12");
 // A cloud map arriving stale must not strip a badge off a bus whose Down Sheet
 // entry is sitting right there. This is the bug that cost a session once.
 assert.equal(merged.down,true);
 assert.equal(merged.downSheetReady,true);
 // Re-keying the bus would orphan the receiving device's own sheet entries.
 assert.equal(merged.id,"other-1");
 // Sending a map must never be a way of quietly clearing somebody's Defect Log.
 assert.equal(merged.defects.length,1);

 const afterDefects=mergeDefectLog(afterMap.buses,defectLogPayload([defectRow(cloudDefect,"17549",config,now)],now));
 const both=afterDefects.buses[0].defects;
 assert.deepEqual(both.map(defect=>defect.id).sort(),["d1","mine"]);
 // Fields with no column of their own ride in `detail` and come back intact,
 // so a defect gaining a field next month needs no database migration.
 assert.equal(both.find(defect=>defect.id==="d1").repairHours,1.5);

 const afterSheet=mergeDownSheet([],downSheetPayload([downSheetRow(cloudEntry,config,now)],now),afterDefects.buses);
 // The entry arrived carrying the SENDING device's busId, which means nothing
 // here; it is re-pointed by fleet number, the one name both devices agree on.
 assert.equal(afterSheet.entries[0].busId,"other-1");
 assert.equal(afterSheet.entries[0].busNumber,"17549");
 assert.deepEqual(afterSheet.entries[0].timeEstimate,{repairMinutes:60});
});

test("only rows that actually changed are sent again",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"iPad"});
 const now="2026-08-30T12:00:00.000Z";
 const bus={n:"17549",l:"BAY 12",s:"shop",lastStatusChangeAt:now};
 const first=changedRows([busRow(bus,config,now)],"fleet_number",{});
 assert.equal(first.changed.length,1);
 // A quiet shop costs one request that finds nothing, not a whole board upload.
 assert.equal(changedRows([busRow(bus,config,now)],"fleet_number",first.fingerprints).changed.length,0);
 const moved=changedRows([busRow({...bus,l:"WASH RACK"},config,now)],"fleet_number",first.fingerprints);
 assert.equal(moved.changed.length,1);
 // A row with no key cannot be upserted, so it is dropped rather than sent.
 assert.equal(changedRows([{location:"BAY 1"}],"fleet_number",{}).changed.length,0);
});

test("the shop cloud reports what happened and never offers a switch",async()=>{
 assert.equal(cloudStatusLabel({phase:"unconfigured",lastSyncedAt:"",lastError:"",pending:0}),"Not connected");
 assert.equal(cloudStatusLabel({phase:"offline",lastSyncedAt:"",lastError:"",pending:12}),"Offline — 12 changes waiting");
 assert.equal(cloudStatusLabel({phase:"offline",lastSyncedAt:"",lastError:"",pending:1}),"Offline — 1 change waiting");
 assert.equal(cloudStatusLabel({phase:"idle",lastSyncedAt:"",lastError:"",pending:0}),"Connected");
 // A dead network is normal and self-correcting; a broken query needs a person.
 // They are told apart so the words and the behaviour can differ.
 assert.equal(cloudFailurePhase(new Error("TypeError: Failed to fetch")),"offline");
 assert.equal(cloudFailurePhase(new Error("Network request timed out")),"offline");
 assert.equal(cloudFailurePhase(new Error("JWT expired")),"signed-out");
 assert.equal(cloudFailurePhase(new Error("Invalid login credentials")),"signed-out");
 assert.equal(cloudFailurePhase(new Error('column "x" does not exist')),"error");

 // Both files explain in prose why navigator.onLine is the wrong signal, so the
 // check must be that it is never CALLED, not that the words never appear.
 const code=text=>text.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/.*$/gm,"$1");
 const [source,control]=await Promise.all([
  readFile(new URL("../src/lib/cloud/cloud-sync.ts",import.meta.url),"utf8"),
  readFile(new URL("../app/settings/_components/cloud-sync-control.tsx",import.meta.url),"utf8"),
 ]);
 // It only says the wifi is associated. Shop wifi that is up but with no route
 // to the internet reports true, and a sync built on it insists it is online
 // while every push fails.
 assert.doesNotMatch(code(source),/navigator\.onLine/);
 assert.doesNotMatch(code(control),/navigator\.onLine/);
 // Nothing in this app may make signing in a condition of seeing the board.
 assert.doesNotMatch(code(control),/OFFLINE\s*\/\s*ONLINE/i);
});

test("connection details are checked where the message can name the field",async()=>{
 const good={url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"iPad"};
 assert.equal(cloudConfigProblem(normalizeCloudConfig(good)),"");
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,url:"https://supabase.com/dashboard"})),/Supabase Project URL/);
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,anonKey:"short"})),/too short/);
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,email:"nope"})),/sign-in email/);
 // A shared login means the database cannot say who changed a bus, so the row
 // has to. Attribution nobody filled in is worse than none: it looks answered.
 assert.match(cloudConfigProblem(normalizeCloudConfig({...good,initials:""})),/initials/);
 // A trailing slash on the project URL is the ordinary paste mistake.
 assert.equal(normalizeCloudConfig({...good,url:"https://demo.supabase.co/"}).url,"https://demo.supabase.co");

 const store=memoryStorage();
 assert.equal(writeCloudConfig(store,normalizeCloudConfig(good)),true);
 assert.equal(readCloudConfig(store).initials,"CJ");
 // A corrupt or absent store must never throw into the board.
 assert.equal(readCloudConfig(memoryStorage({"pace-cloud-config-v1":"{not json"})).url,"");
 assert.equal(readCloudConfig(memoryStorage()).url,"");
 assert.deepEqual(readSentFingerprints(memoryStorage({"pace-cloud-sent-v1":"[]"})),{});
});

test("work done without moving a bus is still detected and sent",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 const parked={n:"17549",l:"BAY 12",s:"shop",lastStatusChangeAt:"2026-08-30T09:00:00.000Z"};
 // Assigning a mechanic, ticking CHECK ENGINE and NO HORN and recording an
 // odometer reading changes none of the timestamps, because the bus never
 // moved and never changed status. All of it lives in map_fields.
 const worked={...parked,mechanic:"CJ",checkEngine:true,noHorn:true,
  odometerReadings:[{id:"o1",miles:412233,recordedAt:now,source:"manual"}]};
 const before=busRow(parked,config,now),after=busRow(worked,config,now);
 assert.equal(before.updated_at,after.updated_at);
 // Handing the key list to JSON.stringify as a replacer is a RECURSIVE property
 // allowlist, not a key ordering, so map_fields serialized as {} and an
 // afternoon's work hashed identically to no work at all — never sent, while
 // the status line read "Synced" with nothing waiting.
 assert.notEqual(rowFingerprint(before),rowFingerprint(after));
 const sent=changedRows([before],"fleet_number",{}).fingerprints;
 assert.equal(changedRows([after],"fleet_number",sent).changed.length,1);
 assert.equal(changedRows([before],"fleet_number",sent).changed.length,0);
 // Two rows holding the same data written in a different order must still
 // match, or every sweep would resend the whole board.
 const reordered=busRow({s:"shop",noHorn:true,n:"17549",checkEngine:true,mechanic:"CJ",l:"BAY 12",
  lastStatusChangeAt:"2026-08-30T09:00:00.000Z",
  odometerReadings:[{recordedAt:now,id:"o1",source:"manual",miles:412233}]},config,now);
 assert.equal(rowFingerprint(after),rowFingerprint(reordered));
});

test("one wrong clock cannot lock the shop out of its own rows",async()=>{
 const now="2026-08-30T12:00:00.000Z";
 // updated_at is what the database compares to drop an out-of-order push, so a
 // phone a year fast would stamp every bus a year ahead and silently discard
 // everyone else's work from then on, with nothing on screen to say why.
 assert.equal(busUpdatedAt({lastStatusChangeAt:"2027-08-30T12:00:00.000Z"},now),now);
 assert.equal(busUpdatedAt({lastStatusChangeAt:"2026-08-30T09:00:00.000Z"},now),"2026-08-30T09:00:00.000Z");
 assert.equal(busUpdatedAt({lastStatusChangeAt:"not a date"},now),now);
 assert.equal(busUpdatedAt({},now),now);
});

test("a bus that arrives from the cloud is a usable record, and its author survives",async()=>{
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pace.com",initials:"CJ",deviceLabel:"CJ phone"});
 const now="2026-08-30T12:00:00.000Z";
 // A bus the receiving device has never seen is added by mergeFleetMap. Without
 // an id it cannot be edited, moved, or pointed at by a Down Sheet entry.
 const added=mergeFleetMap([],fleetMapPayload([{fleet_number:"20505",location:"SOUTH LOT",
  status:"service",map_fields:{mechanic:"RM"}}],now));
 assert.equal(added.buses.length,1);
 assert.ok(added.buses[0].id,"a bus arriving from the cloud needs an id of its own");
 assert.equal(added.buses[0].n,"20505");
 assert.equal(added.buses[0].mechanic,"RM");
 // Derived from the fleet number, so a second pull cannot mint a second id.
 assert.equal(added.buses[0].id,fleetMapPayload([{fleet_number:"20505"}],now).buses[0].id);

 // The row's updated_by names the device that last PUSHED the entry. Who last
 // worked the repair is a different fact, and overwriting one with the other
 // quietly reassigns somebody's work to whoever synced last.
 const entry={id:"e1",busId:"x",busNumber:"17549",category:"Engine",repair:"Overheating",updatedAt:now,updatedBy:"RM"};
 const row=downSheetRow(entry,config,now);
 assert.equal(row.updated_by,"CJ");
 assert.equal(downSheetPayload([row],now).entries[0].updatedBy,"RM");
});

test("a pull reads past one page and signing out is local to the device",async()=>{
 const client=await readFile(new URL("../src/lib/cloud/cloud-client.ts",import.meta.url),"utf8");
 // PostgREST caps rows per request and the cap is silent — the response looks
 // complete. This fleet plus its defects can reach it in ordinary use.
 assert.match(client,/\.range\(/);
 assert.match(client,/page\.length<PAGE/);
 // The library default for signOut is global, which revokes every refresh token
 // on the account. The whole shop shares one login, so one person signing out
 // of one iPad would sign out every phone with no explanation on any of them.
 assert.match(client,/signOut\(\{scope:"local"\}\)/);
 assert.doesNotMatch(client,/auth\.signOut\(\)/);
});

test("a merge survives the shop cloud instead of being undone by it",async()=>{
 const { mergedAwayRows, withoutMergedAway, readMergedAway, writeMergedAway,
         defectLogPayload, changedRows } = await import("../src/lib/cloud/cloud-sync.ts");

 // A push only ever sends what a bus still carries, so a record folded into
 // another is not deleted anywhere by merging alone. It stays live on the
 // server, the next pull reads it back, and mergeDefectLog takes incoming
 // records it does not have — so all 25 would return, on the very device that
 // ran the cleanup. Two things stop that, and both are tested here.
 const config={url:"https://x.supabase.co",anonKey:"k",email:"a@b.c",initials:"CM",deviceLabel:"Phone (CM)"};
 const merged={"downsheet-repair-scan-1787516955962-16":"2026-08-31T12:00:00.000Z"};

 // 1. The server is told the record is gone.
 const rows=mergedAwayRows(merged,config,"2026-08-31T12:00:00.000Z");
 assert.equal(rows.length,1);
 assert.equal(rows[0].defect_id,"downsheet-repair-scan-1787516955962-16");
 assert.equal(rows[0].deleted_at,"2026-08-31T12:00:00.000Z");
 // A tombstone carries no repair fields: writing them back while deleting the
 // row would let a stale copy overwrite the version that survived.
 assert.equal(rows[0].category,undefined);
 assert.equal(rows[0].issue,undefined);
 assert.equal(rows[0].details,undefined);
 // It still signs itself, so the board can say which device did it.
 assert.equal(rows[0].device_label,"Phone (CM)");

 // 2. And whatever arrives, this device refuses the record back — which covers
 // the second device that has not run the cleanup yet and keeps pushing its
 // own copy.
 const incoming={buses:[{n:"17543",defects:[
  {id:"downsheet-repair-scan-1787409639286-18"},
  {id:"downsheet-repair-scan-1787516955962-16"},
 ]}]};
 const filtered=withoutMergedAway(incoming,merged);
 assert.deepEqual(filtered.buses[0].defects.map(d=>d.id),["downsheet-repair-scan-1787409639286-18"]);
 // Nothing merged away means the payload is handed back untouched.
 assert.equal(withoutMergedAway(incoming,{}),incoming);
 assert.equal(withoutMergedAway(null,merged),null);

 // The ledger round-trips through storage, and survives junk.
 const store=new Map();
 const storage={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>store.set(k,v)};
 writeMergedAway(storage,merged);
 assert.deepEqual(readMergedAway(storage),merged);
 store.set("pace-cloud-merged-v1","not json");
 assert.deepEqual(readMergedAway(storage),{});

 // A tombstone is a change like any other, so it is sent once and then stops
 // being sent — a merged board does not re-upload 25 deletions every sweep.
 const first=changedRows(rows,"defect_id",{});
 assert.equal(first.changed.length,1);
 assert.equal(changedRows(rows,"defect_id",first.fingerprints).changed.length,0);

 // And the pull payload builder is what the filter is applied to, so the shape
 // the filter expects is the shape it actually gets.
 const payload=defectLogPayload([{defect_id:"d1",fleet_number:"17543",category:"Cooling System",
  issue:"Overheating",details:"",state:"open",operability:"down",detail:{}}],"2026-08-31T12:00:00.000Z");
 assert.ok(Array.isArray(payload.buses),"the pull payload must expose buses for the filter to walk");
 assert.equal(withoutMergedAway(payload,{d1:"2026-08-31T12:00:00.000Z"}).buses[0].defects.length,0);
});

test("a merged-away tombstone goes up as an UPDATE by id, never inside an upsert missing its fleet number",async()=>{
 const {defectRow,mergedAwayRows,normalizeCloudConfig}=await import("../src/lib/cloud/cloud-sync.ts");
 const {pushPlan,executePushPlan}=await import("../src/lib/cloud/cloud-client.ts");
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pacesouth.local",initials:"CM",deviceLabel:"Phone"});
 const now="2026-09-06T22:23:15.000Z";
 const live=defectRow({id:"d-live",category:"Brakes",issue:"Air leak",details:"",state:"open",operability:"down"},"17510",config,now);
 const [dead]=mergedAwayRows({"d-dupe":"2026-08-31T03:16:06.000Z"},config,now);

 /* Postgres checks NOT NULL on the insert half of an upsert before it reaches
    the conflict, so a tombstone — which carries no fleet number by design —
    can never be upserted. This is the bug that kept the Phone's status red at
    "62 changes waiting" from Aug 31 to Sep 6 and held the Down Sheet off the
    cloud the whole time. */
 const plan=pushPlan([],[live,dead],[]);
 const step=plan.find(s=>s.table==="bus_defects");
 assert.deepEqual(step.upserts.map(r=>r.defect_id),["d-live"]);
 assert.deepEqual(step.updates.map(r=>r.defect_id),["d-dupe"]);
 for(const s of plan)assert.ok(s.upserts.every(r=>String(r.fleet_number??"").trim()),s.table+" would upsert a row with no fleet number");
 assert.deepEqual(plan.map(s=>s.table),["buses","bus_defects","down_sheet_entries"],"buses go first");

 // A fake server that behaves exactly as the real one did all week.
 const calls=[];
 const fake={from(table){return {
  upsert:async(rows,options)=>{calls.push(["upsert",table,options.onConflict,rows.map(r=>r.defect_id)]);
   return rows.some(r=>!String(r.fleet_number??"").trim())?{error:{message:'null value in column "fleet_number" of relation "'+table+'" violates not-null constraint'}}:{error:null}},
  update:patch=>({eq:async(column,value)=>{calls.push(["update",table,column,value,Object.keys(patch).sort()]);return {error:null}}}),
 }}};
 assert.equal(await executePushPlan(fake,plan),null,"the mixed batch must go through");
 assert.deepEqual(calls,[
  ["upsert","bus_defects","defect_id",["d-live"]],
  ["update","bus_defects","defect_id","d-dupe",["deleted_at","device_label","updated_at","updated_by"]],
 ]);
 // The patch carries the deletion and the signature only — the key rides in eq(), and no repair field is written back.
 // The old shape, tombstone inside the upsert, is exactly what the server rejects, in its own words.
 const old=await executePushPlan(fake,[{table:"bus_defects",conflict:"defect_id",upserts:[live,dead],updates:[]}]);
 assert.match(old.message,/null value in column "fleet_number"/);

 // cloudPush must actually use the planner, or the partition is decoration.
 const client=await readFile(new URL("../src/lib/cloud/cloud-client.ts",import.meta.url),"utf8");
 assert.match(client,/executePushPlan\(supabase,pushPlan\(busChange\.changed,defectChange\.changed,entryChange\.changed\)\)/);
 assert.doesNotMatch(client,/const writes:\[string,CloudRow\[\],string\]\[\]/,"the old upsert-everything loop must be gone");
});

test("live sync is a doorbell, not a delivery",async()=>{
 const {shouldSyncForChange,announceStoredChange,LIVE_TABLES,LIVE_DEBOUNCE_MS}=await import("../src/lib/cloud/cloud-live.ts");
 assert.deepEqual([...LIVE_TABLES],["buses","bus_defects","down_sheet_entries"]);

 // Another device's write wakes this one; its own echo does not.
 assert.equal(shouldSyncForChange({table:"buses",deviceLabel:"Phone"},"Ipad"),true);
 assert.equal(shouldSyncForChange({table:"buses",deviceLabel:"Ipad"},"Ipad"),false);
 assert.equal(shouldSyncForChange({table:"buses",deviceLabel:" ipad "},"Ipad"),false,"labels compare trimmed and case-insensitively");
 // An unlabelled row is acted on rather than dropped: a missed change is worse
 // than a wasted request.
 assert.equal(shouldSyncForChange({table:"buses",deviceLabel:""},"Ipad"),true);
 assert.equal(shouldSyncForChange({table:"buses",deviceLabel:"Phone"},""),true);
 // A table we do not sync is never a reason to pull.
 assert.equal(shouldSyncForChange({table:"shop_memory",deviceLabel:"Phone"},"Ipad"),false);

 // The burst from one device's push must collapse into a single sync.
 assert.ok(LIVE_DEBOUNCE_MS>=1000,"a hundred rows must not become a hundred pulls");

 /* Every page already listens for `storage` to pick up another tab's work, but
    the browser fires it only for OTHER tabs — so a merge done in this tab would
    leave the board right on disk and stale on screen. Dispatching it ourselves
    is why live sync needed no change to any page's own code. */
 const client=await readFile(new URL("../src/lib/cloud/cloud-client.ts",import.meta.url),"utf8");
 assert.match(client,/postgres_changes/);
 assert.match(client,/subscribeToShopCloud/);
 // A notification's row is never written to the board; it only triggers a pull.
 assert.equal(/payload\?\.new\?\.(?!device_label)/.test(client),false,"a realtime payload must not become board data");

 const liveSource=await readFile(new URL("../src/lib/cloud/cloud-live.ts",import.meta.url),"utf8");
 assert.match(liveSource,/new StorageEvent\("storage"/);
 // A merge is never a reason to accept a write the bulk-loss guard refuses,
 // and live sync runs with nobody watching. The one thing that lifts it is a
 // tombstone — a person's confirmed removal on another device — and only when
 // one actually applied.
 assert.match(liveSource,/allowBulkDefectLoss:afterTombstones\.dropped\.length>0/);
 assert.doesNotMatch(liveSource,/allowBulkDefectLoss:true/);
 assert.equal(typeof announceStoredChange,"function");
});

test("a scan sweep removed on one device reaches the others, and so does putting it back",async()=>{
 const {dropTombstonedDefects,applyCloudPull}=await import("../src/lib/cloud/cloud-live.ts");
 const {readTombstones}=await import("../src/lib/cloud/cloud-client.ts");
 const {serializeFleetPayload,FLEET_STORAGE_KEY}=await import("../src/lib/storage/storage.ts");
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pacesouth.local",initials:"CM",deviceLabel:"Ipad"});

 /* The row a live record sends now says deleted_at:null out loud. Before, a
    record put back after a removal was upserted without the column, so the
    tombstone stood and every device's pull went on filtering it out — the
    restore looked done on the device that made it and reached nobody. */
 const row=defectRow({id:"sweep-1",category:"Tech Services",issue:"Farebox - No power",details:"",state:"open",operability:"service",createdAt:"2026-09-06T23:30:14.612Z",updatedAt:"2026-09-07T02:00:00.000Z"},"17510",config,"2026-09-07T02:00:00.000Z");
 assert.strictEqual(row.deleted_at,null);
 assert.equal(row.updated_at,"2026-09-07T02:00:00.000Z");

 /* A pull returns live rows only and the merge keeps whatever the receiver
    alone holds, so the iPad's 24 copies would have stayed on the iPad forever.
    Tombstones now come down as ids, and a copy older than its tombstone goes. */
 const STAMP="2026-09-06T23:30:14.612Z";
 const buses=[
  {id:"a",n:"17510",defects:[{id:"hand-1",createdAt:STAMP},{id:"sweep-1",createdAt:STAMP}]},
  /* Edited on this device AFTER the other device removed it: real work, kept,
     and its next push undeletes the row. */
  {id:"b",n:"17512",defects:[{id:"sweep-2",createdAt:STAMP,updatedAt:"2026-09-07T03:00:00.000Z"}]},
  {id:"c",n:"17520",defects:[]},
 ];
 const deleted={"sweep-1":"2026-09-07T01:00:00.000Z","sweep-2":"2026-09-07T01:00:00.000Z","never-here":"2026-09-07T01:00:00.000Z"};
 const dropped=dropTombstonedDefects(buses,deleted);
 assert.deepEqual(dropped.dropped,["sweep-1"]);
 assert.deepEqual(dropped.buses[0].defects.map(d=>d.id),["hand-1"]);
 assert.equal(dropped.buses[1].defects.length,1,"work done after the removal wins");
 assert.strictEqual(dropped.buses[2],buses[2],"an untouched bus is the same object");
 assert.strictEqual(dropTombstonedDefects(buses,{}).buses,buses,"no tombstones, no work");

 /* Through the real merge path, against real storage, with the bulk-loss
    guard that would otherwise refuse 24 records leaving. */
 const many=[];for(let i=0;i<24;i++)many.push({id:"sweep-"+i,category:"Tech Services",issue:"Farebox - No power",details:"",operability:"service",state:"open",createdAt:STAMP,source:"defect-log"});
 const storage=memoryStorage({[FLEET_STORAGE_KEY]:serializeFleetPayload([{id:"a",n:"17510",s:"service",l:"road-0",defects:[{id:"hand-1",category:"Brakes",issue:"Air leak",details:"",operability:"down",state:"open"},...many],pendingRepair:""}])});
 const tomb=Object.fromEntries(many.map(d=>[d.id,"2026-09-07T01:00:00.000Z"]));
 const announced=[];
 const applied=applyCloudPull(storage,{map:fleetMapPayload([],"2026-09-07T02:00:00.000Z"),defects:defectLogPayload([],"2026-09-07T02:00:00.000Z"),sheet:downSheetPayload([],"2026-09-07T02:00:00.000Z"),deleted:tomb},(key,value)=>announced.push([key,Boolean(value)]));
 assert.equal(applied.ok,true,applied.error);
 assert.equal(applied.dropped,24);
 const after=readFleetPayload(storage.value(FLEET_STORAGE_KEY));
 assert.deepEqual(after.buses[0].defects.map(d=>d.id),["hand-1"],"the 24 are gone and the real record is not");
 assert.ok(storage.value("pace-board-recovery-v1"),"the recovery snapshot was taken first — RESTORE LAST GOOD COPY stands behind this");
 assert.ok(announced.some(([key])=>key===FLEET_STORAGE_KEY),"the page in front of the user hears about it");
 // With nothing tombstoned, the guard is exactly as it was: still on.
 const live=await readFile(new URL("../src/lib/cloud/cloud-live.ts",import.meta.url),"utf8");
 assert.match(live,/allowBulkDefectLoss:afterTombstones\.dropped\.length>0/);

 /* The tombstones are read as two columns, paged like everything else, and
    ride on the same pull. */
 const calls=[];
 const fake={from(table){return {select(columns){return {not(column,op,value){calls.push([table,columns,column,op,value]);return {range:async(from,_to)=>({data:from===0?[{defect_id:"sweep-1",deleted_at:"2026-09-07T01:00:00.000Z"},{defect_id:"",deleted_at:"x"}]:[],error:null})}}}}}}};
 const read=await readTombstones(fake,"bus_defects","defect_id");
 assert.deepEqual(read.deleted,{"sweep-1":"2026-09-07T01:00:00.000Z"});
 assert.deepEqual(calls,[["bus_defects","defect_id,deleted_at","deleted_at","is",null]]);
 const client=await readFile(new URL("../src/lib/cloud/cloud-client.ts",import.meta.url),"utf8");
 assert.match(client,/readTombstones\(supabase,"bus_defects","defect_id"\)/);
 assert.match(client,/deleted:deletedRes\.deleted/);
 // Both callers hand the tombstones on; a pull that read them and dropped them would change nothing.
 for(const file of ["../src/components/shared/shop-cloud-live.tsx","../app/settings/_components/cloud-sync-control.tsx"])
  assert.match(await readFile(new URL(file,import.meta.url),"utf8"),/applyCloudPull\(localStorage,\{[^}]*deleted:(?:got|result)\.deleted[,}]/,file);
});

test("a Down Sheet cleared on one device stays cleared, instead of arriving back as nine days of sheets",async()=>{
 const {downSheetRow,removedEntryRows,withoutRemovedEntries,readRemovedEntries,rememberRemovedEntries,forgetRemovedEntries,
        REMOVED_ENTRY_LEDGER_LIMIT,CLOUD_REMOVED_ENTRIES_KEY}=await import("../src/lib/cloud/cloud-sync.ts");
 const {pushPlan,executePushPlan,cloudPush,readTombstones}=await import("../src/lib/cloud/cloud-client.ts");
 const {dropTombstonedEntries,applyCloudPull}=await import("../src/lib/cloud/cloud-live.ts");
 const {serializeFleetPayload,serializeDownSheetPayload,FLEET_STORAGE_KEY,DOWN_SHEET_STORAGE_KEY}=await import("../src/lib/storage/storage.ts");
 const config=normalizeCloudConfig({url:"https://demo.supabase.co",anonKey:"k".repeat(50),email:"shop@pacesouth.local",initials:"CM",deviceLabel:"Phone"});
 const NOW="2026-09-07T04:00:00.000Z",REMOVED="2026-09-07T03:30:00.000Z";

 /* The bug, in one sentence: a push sends what the sheet still carries, so an
    entry taken off was never removed anywhere, and the next pull handed it back.
    A correct 57-bus scan read 92 about fifteen seconds later — one live-sync
    round trip — and clearing the sheet first changed nothing, because clearing
    was exactly the operation that did not travel. */

 // A live entry says out loud that it is not removed, so putting one back clears its tombstone.
 const live=downSheetRow({id:"e-live",busNumber:"17510",category:"Brakes",repair:"Air leak",updatedAt:NOW},config,NOW);
 assert.strictEqual(live.deleted_at,null);
 assert.equal(live.fleet_number,"17510");

 // A tombstone carries the key, the stamp and the signature. Nothing about the repair.
 const [dead]=removedEntryRows({"e-gone":REMOVED},config,NOW);
 assert.deepEqual(Object.keys(dead).sort(),["deleted_at","device_label","entry_id","updated_at","updated_by"]);
 assert.equal(dead.deleted_at,REMOVED);
 assert.equal(dead.updated_at,REMOVED,"stamped when the removal happened, so keep_newest_write compares the right two times");

 /* down_sheet_entries.fleet_number is NOT NULL, and Postgres checks that on the
    INSERT half of an upsert before it ever reaches the conflict on entry_id. So
    a tombstone in an upsert batch takes the whole 200-row chunk down with it —
    the same failure that kept the shop cloud red for a week on bus_defects. */
 const plan=pushPlan([],[],[live,dead]);
 const step=plan.find(s=>s.table==="down_sheet_entries");
 assert.deepEqual(step.upserts.map(r=>r.entry_id),["e-live"]);
 assert.deepEqual(step.updates.map(r=>r.entry_id),["e-gone"]);
 for(const s of plan)assert.ok(s.upserts.every(r=>String(r.fleet_number??"").trim()),s.table+" would upsert a row with no fleet number");

 const calls=[];
 const server={from(table){return {
  upsert:async(rows,options)=>{calls.push(["upsert",table,options.onConflict,rows.map(r=>r.entry_id)]);
   return rows.some(r=>!String(r.fleet_number??"").trim())?{error:{message:'null value in column "fleet_number" of relation "'+table+'" violates not-null constraint'}}:{error:null}},
  update:patch=>({eq:async(column,value)=>{calls.push(["update",table,column,value,Object.keys(patch).sort()]);return {error:null}}}),
 }}};
 assert.equal(await executePushPlan(server,plan),null,"the mixed batch must go through");
 assert.deepEqual(calls,[
  ["upsert","down_sheet_entries","entry_id",["e-live"]],
  ["update","down_sheet_entries","entry_id","e-gone",["deleted_at","device_label","updated_at","updated_by"]],
 ]);
 const old=await executePushPlan(server,[{table:"down_sheet_entries",conflict:"entry_id",upserts:[live,dead],updates:[]}]);
 assert.match(old.message,/null value in column "fleet_number"/);

 /* An entry the sheet still carries is never tombstoned, whatever the ledger
    says — that is what makes UNDO CLEAR safe in the window before the ledger is
    cleared. Two rows go up here, not three: the live entry and one tombstone. */
 const pushed=await cloudPush({buses:[],entries:[{id:"e-live",busNumber:"17510",updatedAt:NOW}],config:{...config,url:"",anonKey:""},now:NOW,sent:{},
  removedEntries:{"e-live":REMOVED,"e-gone":REMOVED}});
 assert.equal(pushed.pending,2,"the live entry's own row plus one tombstone — never a tombstone for a bus still on the sheet");

 /* Dropping locally. Same tie-break as the defects: an entry touched on THIS
    device after the removal is real work and stays, and its next push puts the
    row back for everyone. */
 const held=[
  {id:"e-stale",busId:"a",workflow:"Scheduled",updatedAt:"2026-08-30T19:24:14.189Z"},
  {id:"e-worked",busId:"b",workflow:"Scheduled",updatedAt:"2026-09-07T03:45:00.000Z"},
  {id:"e-mine",busId:"c",workflow:"Scheduled",updatedAt:NOW},
 ];
 const dropped=dropTombstonedEntries(held,{"e-stale":REMOVED,"e-worked":REMOVED,"never-here":REMOVED});
 assert.deepEqual(dropped.dropped,["e-stale"]);
 assert.deepEqual(dropped.entries.map(e=>e.id),["e-worked","e-mine"]);
 assert.strictEqual(dropTombstonedEntries(held,{}).entries,held,"no tombstones, no work");

 // And on the way in, so a second device holding yesterday's sheet cannot re-add them.
 const sheetIn={kind:"pace-south-down-sheet-transfer",version:1,entries:[{id:"e-stale"},{id:"e-mine"}]};
 assert.deepEqual(withoutRemovedEntries(sheetIn,{"e-stale":REMOVED}).entries.map(e=>e.id),["e-mine"]);
 assert.strictEqual(withoutRemovedEntries(sheetIn,{}),sheetIn);

 /* End to end, through the real merge path against real storage: the shop's
    copy still lists the two stale entries, and both are tombstoned. They must
    leave the sheet AND leave the map, because a bus left marked down with no
    entry behind it is not inert — entriesFromFleet mints a brand new entry for
    it under an id nothing has ever tombstoned, which is the "26 other buses"
    message on a sheet that was just cleared. */
 const storage=memoryStorage({
  [FLEET_STORAGE_KEY]:serializeFleetPayload([
   {id:"a",n:"17510",s:"out",l:"bay-1",down:true,defects:[],pendingRepair:""},
   {id:"c",n:"17520",s:"out",l:"bay-2",down:true,defects:[],pendingRepair:""},
  ]),
  [DOWN_SHEET_STORAGE_KEY]:serializeDownSheetPayload([
   {id:"e-stale",busId:"a",busNumber:"17510",workflow:"Scheduled",updatedAt:"2026-08-30T19:24:14.189Z"},
   {id:"e-mine",busId:"c",busNumber:"17520",workflow:"Scheduled",updatedAt:NOW},
  ]),
 });
 const announced=[];
 const applied=applyCloudPull(storage,{
  map:fleetMapPayload([],NOW),
  defects:defectLogPayload([],NOW),
  /* The server still hands the stale row down among the live ones — it was
     tombstoned by another device, and this is the pull that finds out. */
  sheet:downSheetPayload([{entry_id:"e-stale",fleet_number:"17510",updated_at:"2026-08-30T19:24:14.189Z",workflow:"Scheduled"}],NOW),
  deleted:{},
  removedEntries:{"e-stale":REMOVED},
 },(key,value)=>announced.push([key,Boolean(value)]));
 assert.equal(applied.ok,true,applied.error);
 assert.equal(applied.droppedEntries,1);
 assert.deepEqual(JSON.parse(storage.value(DOWN_SHEET_STORAGE_KEY)).entries.map(e=>e.id),["e-mine"],"the merge put it back and the tombstone took it off again");
 const board=readFleetPayload(storage.value(FLEET_STORAGE_KEY));
 assert.deepEqual(board.buses.map(bus=>[bus.n,bus.down===true]),[["17510",false],["17520",true]],"the map follows the sheet, so nothing re-mints the entry");
 assert.ok(announced.some(([key])=>key===DOWN_SHEET_STORAGE_KEY),"the page in front of the user hears about it");

 // The tombstones ride down on the same pull, read as two columns and paged like everything else.
 const reads=[];
 const fake={from(table){return {select(columns){return {not(column,op,value){reads.push([table,columns,column,op,value]);
  return {range:async from=>({data:from===0?[{entry_id:"e-stale",deleted_at:REMOVED},{entry_id:"",deleted_at:"x"}]:[],error:null})}}}}}}};
 const read=await readTombstones(fake,"down_sheet_entries","entry_id");
 assert.deepEqual(read.deleted,{"e-stale":REMOVED});
 assert.deepEqual(reads,[["down_sheet_entries","entry_id,deleted_at","deleted_at","is",null]]);
 const client=await readFile(new URL("../src/lib/cloud/cloud-client.ts",import.meta.url),"utf8");
 assert.match(client,/readTombstones\(supabase,"down_sheet_entries","entry_id"\)/);
 assert.match(client,/removedEntries:removedRes\.deleted/);
 assert.match(client,/sheet:withoutRemovedEntries\(downSheetPayload\(entryRes\.rows,now\),removedEntries\)/);
 for(const file of ["../src/components/shared/shop-cloud-live.tsx","../app/settings/_components/cloud-sync-control.tsx"]){
  const source=await readFile(new URL(file,import.meta.url),"utf8");
  assert.match(source,/removedEntries:readRemovedEntries\(localStorage\)/,file+" must push its removals");
  assert.match(source,/cloudPull\([^;]{0,160}?readRemovedEntries\(localStorage\)\)/,file+" must send them on the pull too");
  assert.match(source,/applyCloudPull\(localStorage,\{[^}]*removedEntries:(?:got|result)\.removedEntries\}\)/,file);
 }

 /* The ledger itself: written where the removals happen, taken back where they
    are undone, and bounded, because a scan a day forever is otherwise a
    LocalStorage key that only grows. */
 const ledger=memoryStorage();
 rememberRemovedEntries(ledger,["e-1","e-2"," "],REMOVED);
 assert.deepEqual(readRemovedEntries(ledger),{"e-1":REMOVED,"e-2":REMOVED});
 forgetRemovedEntries(ledger,["e-1","never-here"]);
 assert.deepEqual(readRemovedEntries(ledger),{"e-2":REMOVED});
 assert.equal(ledger.value(CLOUD_REMOVED_ENTRIES_KEY),JSON.stringify({"e-2":REMOVED}));
 const many=memoryStorage();
 for(let day=0;day<40;day++)
  rememberRemovedEntries(many,Array.from({length:80},(_,i)=>"d"+day+"-"+i),new Date(Date.UTC(2026,0,1+day)).toISOString());
 const capped=readRemovedEntries(many);
 assert.equal(Object.keys(capped).length,REMOVED_ENTRY_LEDGER_LIMIT);
 assert.ok(capped["d39-0"],"the newest removals — the ones that may not have been pushed yet — are the ones kept");
 assert.equal(capped["d0-0"],undefined,"and the oldest, long since landed on the server, are what falls off");
});

test("a soft bus the yard puts on a run stops counting against pullout, on every device",async()=>{
 const {setEntryInService,isEntryInService,entryInServiceStamp,countsAgainstPullout,isSoftDownEntry}=
  await import("../src/lib/down-sheet/down-sheet-availability.ts");
 const soft={id:"e1",busId:"b",busNumber:"17527",category:"",repair:"Manual entry",
  customReason:"HOLD FOR SOUTH HOLLAND, THEY ARE COMING WEDS 7AM TO REPAIR"};
 const hard={id:"e2",busId:"c",busNumber:"17510",category:"",repair:"Driver-reported defect",
  customReason:"QUARANTINE DO NOT MOVE (PER SAFETY)"};
 const at="2026-09-16T11:00:00.000Z";

 assert.equal(countsAgainstPullout(soft),true,"a soft bus nobody has used is still short");
 const using=setEntryInService(soft,true,at,"CJ");
 assert.equal(isEntryInService(using),true);
 assert.deepEqual(entryInServiceStamp(using),{at,by:"CJ"},"who decided, and when");
 assert.equal(countsAgainstPullout(using),false,"once it is on a run it is not part of the shortage");
 /* It is still a soft bus. Taking it off the board the moment it is switched on
    would hide the control that switched it. */
 assert.equal(isSoftDownEntry(using),true);

 /* THE SWITCH CANNOT REACH A HARD DOWN BUS. Nothing in the UI offers it, but a
    record hand-edited or arriving from another device could carry the flag, and
    a quarantined bus must not leave the shortage because of a stray field. */
 assert.equal(countsAgainstPullout(setEntryInService(hard,true,at,"CJ")),true,
  "a bus that cannot run is short whatever the flag says");

 /* DELETED, NOT SET TO undefined — the spelling setBusHold uses. A save merges
    with {...existing,...incoming}, where a key written as undefined cannot
    carry a removal, so a bus taken back out of service would come straight
    back on the next read. */
 const off=setEntryInService(using,false,at,"CJ");
 assert.equal("inService" in off,false,"the key is gone, so the removal survives a merge");
 assert.equal(countsAgainstPullout(off),true);

 /* IT TRAVELS, which is the opposite of how a HOLD works and was Curtis's
    explicit call: "1 travel for sure." A hold is one person's note about one
    bus; pullout is the whole shop's number. It rides for free because
    cloud-sync puts every field it has no column for into `detail`. */
 const {downSheetRow}=await import("../src/lib/cloud/cloud-sync.ts");
 const config={project:"p",account:"a",initials:"CJ",device:"phone"};
 const row=downSheetRow(using,config,at);
 assert.ok(row,"the entry makes a row");
 assert.deepEqual(row.detail.inService,{at,by:"CJ"},"and the flag rides in detail rather than being dropped");
 /* The guard that matters: if inService were ever given a column of its own,
    this would still pass while the round trip silently lost it. */
 assert.equal(Object.prototype.hasOwnProperty.call(row,"inService"),false,
  "it is not a column, so nothing has to change in the database for it to travel");
});

test("a hold stays on the phone that was told, and costs the cloud nothing",async()=>{
 /* Curtis, reversing the original build: "If someone is asked to hold a bus
    (like bay 12 guy) then they should know. It doesn't need to show up on
    everybody's screen." A hold is an instruction one person is carrying, not a
    fact about the fleet.

    Two things have to be true for that, and only one of them is obvious. The
    row must not CARRY the hold — and placing a hold must not push AT ALL. If
    busUpdatedAt still counted the hold's stamp, a held bus would push a row
    whose map_fields were byte-identical to the last one but stamped newer:
    traffic that says "newer" while carrying nothing new, which is exactly the
    out-of-order ammunition updated_at exists to deny. */
 const {busUpdatedAt,busRow,rowFingerprint}=await import("../src/lib/cloud/cloud-sync.ts");
 const older="2026-09-10T18:00:00.000Z",newer="2026-09-10T21:30:00.000Z",now="2026-09-10T22:00:00.000Z";
 const config={initials:"CT",deviceLabel:"shop"};
 const plain={id:"b1",n:"18505",l:"road-1",s:"service",parkedAt:older,lastLocationChangeAt:older,lastStatusChangeAt:older};
 const held={...plain,hold:{at:newer,by:"CT"}};

 /* The hold's stamp is ignored: the newest OPERATIONAL stamp still wins. */
 assert.equal(busUpdatedAt(held,now),older,"the hold's own stamp must not move updated_at");
 assert.equal(busUpdatedAt(plain,now),busUpdatedAt(held,now),"holding a bus changes nothing about when it was last updated");

 /* The row does not carry it. */
 const heldRow=busRow(held,config,now);
 assert.equal(Object.keys(heldRow.map_fields).includes("hold"),false,"hold never reaches map_fields");

 /* And the decisive one: the pushed row is INDISTINGUISHABLE from the
    unheld bus, so nothing is queued and no other device ever hears of it. */
 assert.equal(rowFingerprint(heldRow),rowFingerprint(busRow(plain,config,now)),"placing a hold moves no fingerprint, so it pushes nothing");
});
