/* The part that actually talks to Supabase.

   Kept apart from cloud-sync.ts so that everything worth testing can be tested
   without a network, and so that nothing on the board's own code path imports a
   client library it may never use.

   Nothing in here is allowed to throw into the app. A sync that fails is a
   status line, never a broken board. */

import {
 changedRows,
 cloudFailureMessage,
 cloudFailurePhase,
 defectLogPayload,
 defectRow,
 downSheetPayload,
 downSheetRow,
 fleetMapPayload,
 busRow,
 mergedAwayRows,
 withoutMergedAway,
 type MergedAwayDefects,
 type CloudConfig,
 type CloudRow,
 type CloudState,
 type SentFingerprints,
 type SyncBus,
 type SyncEntry,
} from "./cloud-sync.ts";

type SupabaseLike={
 auth:{
  signInWithPassword(credentials:{email:string;password:string}):Promise<{data:unknown;error:{message:string}|null}>;
  signOut(options?:{scope:"local"|"global"}):Promise<{error:{message:string}|null}>;
  getSession():Promise<{data:{session:unknown|null};error:{message:string}|null}>;
 };
 from(table:string):{
  upsert(rows:CloudRow[],options:{onConflict:string}):Promise<{error:{message:string}|null}>;
  update(patch:CloudRow):{eq(column:string,value:string):Promise<{error:{message:string}|null}>};
  select(columns:string):{is(column:string,value:null):{
   range(from:number,to:number):Promise<{data:CloudRow[]|null;error:{message:string}|null}>;
  }};
 };
};

/* PostgREST caps how many rows one request may return, and the cap is silent:
   the response looks complete. This fleet is around four hundred buses and a
   bus can carry several defects, so the cap is reachable in ordinary use, and a
   truncated pull would leave records quietly un-updated on every device that
   pulled. Read in pages until a short page says that was the end. */
const PAGE=1000;

async function readAll(supabase:SupabaseLike,table:string){
 const rows:CloudRow[]=[];
 for(let from=0;;from+=PAGE){
  const {data,error}=await supabase.from(table).select("*").is("deleted_at",null).range(from,from+PAGE-1);
  if(error)return {rows:[],error};
  const page=data||[];
  rows.push(...page);
  if(page.length<PAGE)return {rows,error:null};
 }
}

let client:SupabaseLike|null=null;
let clientKey="";

/* Imported only when a device has actually been connected, so a shop that never
   turns this on never pays for the library. */
export async function cloudClient(config:CloudConfig):Promise<SupabaseLike|null>{
 const key=config.url+"|"+config.anonKey;
 if(!config.url||!config.anonKey)return null;
 if(client&&clientKey===key)return client;
 try{
  const {createClient}=await import("@supabase/supabase-js");
  /* persistSession is what makes signing in survive a closed app and a dead
     network: the session is restored from this device's own storage with no
     request at all. It is the reason the login never has to gate the board. */
  client=createClient(config.url,config.anonKey,{
   auth:{persistSession:true,autoRefreshToken:true,storageKey:"pace-cloud-auth-v1"},
  }) as unknown as SupabaseLike;
  clientKey=key;
  return client;
 }catch{return null}
}

export function forgetCloudClient(){client=null;clientKey=""}

export type CloudOutcome={ok:boolean;phase:CloudState["phase"];message:string};

function failed(error:unknown):CloudOutcome{
 return {ok:false,phase:cloudFailurePhase(error),message:cloudFailureMessage(error)};
}

export async function cloudSignIn(config:CloudConfig,password:string):Promise<CloudOutcome>{
 try{
  const supabase=await cloudClient(config);
  if(!supabase)return {ok:false,phase:"error",message:"The connection details are not usable."};
  const {error}=await supabase.auth.signInWithPassword({email:config.email,password});
  if(error)return failed(new Error(error.message));
  return {ok:true,phase:"idle",message:""};
 }catch(error){return failed(error)}
}

export async function cloudSignOut(config:CloudConfig):Promise<CloudOutcome>{
 try{
  const supabase=await cloudClient(config);
  /* Local scope, explicitly. The library's default is global, which revokes
     every refresh token on the account — and the whole shop shares one login,
     so one person signing out of one iPad would sign out all forty phones and
     none of them would know why. This device forgets its own session and
     nobody else's. */
  if(supabase)await supabase.auth.signOut({scope:"local"});
 }catch{/* signing out locally matters more than telling the server */}
 forgetCloudClient();
 return {ok:true,phase:"signed-out",message:""};
}

/* Whether this device still holds a session. Reads storage, not the network, so
   it answers the same on a plane as it does on shop wifi. */
export async function cloudSignedIn(config:CloudConfig):Promise<boolean>{
 try{
  const supabase=await cloudClient(config);
  if(!supabase)return false;
  const {data}=await supabase.auth.getSession();
  return Boolean(data?.session);
 }catch{return false}
}

export type PushInput={
 buses:SyncBus[];
 entries:SyncEntry[];
 config:CloudConfig;
 now:string;
 sent:SentFingerprints;
 /* Records this device folded into another. Optional so a caller that has
    never merged anything is unchanged. */
 merged?:MergedAwayDefects;
};

export type PushResult=CloudOutcome&{sent:SentFingerprints;pushed:number;pending:number};

/* One table's worth of writes, split by the one distinction Postgres enforces.

   A row carrying its fleet number is a repair and is upserted. A row without
   one is a tombstone — mergedAwayRows deliberately sends only the key, the
   deletion stamp and the signature — and it MUST go as an UPDATE by id, never
   inside an upsert.

   The reason is how ON CONFLICT works. PostgREST's upsert is an INSERT that
   falls through to UPDATE only after the insert half is rejected as a
   duplicate, and NOT NULL checks run on that insert half first. bus_defects
   requires fleet_number, so a tombstone in an upsert batch is refused with
   `null value in column "fleet_number" … violates not-null constraint` before
   the conflict on defect_id is ever reached — and the whole 200-row chunk rolls
   back with it. That is what the shop cloud failed on every 45-second sweep
   from the day MERGE DUPES was first pressed until this was found on Sep 6: the
   Phone's status stuck red at "62 changes waiting", zero tombstones ever
   landed, the 37 duplicate groups it had cleaned locally stayed alive in the
   cloud, and the Down Sheet — queued behind the failing defects — never reached
   the cloud after Aug 31.

   An UPDATE touches no required column, is what the shop's edit policy allows,
   and against an id the server never had it changes nothing, which is right:
   there is nothing to delete. The roadmap always described a delete as "an
   ordinary update"; this is that sentence, kept.

   Buses first. A defect or a sheet entry naming a bus the server has never
   heard of is not an error here — nothing has a foreign key to buses, on
   purpose, because a fleet number is a name both devices already agree on and
   making it a key would let one device's missing bus reject another's work. */
export type PushStep={table:string;conflict:string;upserts:CloudRow[];updates:CloudRow[]};
export function pushPlan(busChanged:CloudRow[],defectChanged:CloudRow[],entryChanged:CloudRow[]):PushStep[]{
 const tombstone=(row:CloudRow)=>!String((row as Record<string,unknown>).fleet_number??"").trim();
 return [
  {table:"buses",conflict:"fleet_number",upserts:busChanged,updates:[]},
  {table:"bus_defects",conflict:"defect_id",upserts:defectChanged.filter(row=>!tombstone(row)),updates:defectChanged.filter(tombstone)},
  {table:"down_sheet_entries",conflict:"entry_id",upserts:entryChanged,updates:[]},
 ];
}

/* Chunked so one bad afternoon on a slow connection does not turn into a
   single request the phone cannot finish. The first error stops everything, and
   the caller leaves the fingerprints un-advanced so the same work is sent again
   next sweep rather than believed to have gone. */
export async function executePushPlan(supabase:SupabaseLike,plan:PushStep[]):Promise<{message:string}|null>{
 for(const step of plan){
  for(let at=0;at<step.upserts.length;at+=200){
   const {error}=await supabase.from(step.table).upsert(step.upserts.slice(at,at+200),{onConflict:step.conflict});
   if(error)return error;
  }
  for(const row of step.updates){
   const record=row as Record<string,unknown>;
   const patch=Object.fromEntries(Object.entries(record).filter(([key])=>key!==step.conflict)) as CloudRow;
   const {error}=await supabase.from(step.table).update(patch).eq(step.conflict,String(record[step.conflict]??""));
   if(error)return error;
  }
 }
 return null;
}

/* Only what changed since this device last got through. A phone that has been
   in a basement all morning sends its morning's work and nothing else. */
export async function cloudPush(input:PushInput):Promise<PushResult>{
 const {buses,entries,config,now,sent}=input;
 const busRows=buses.map(bus=>busRow(bus,config,now)).filter(Boolean) as CloudRow[];
 const defectRows=buses.flatMap(bus=>{
  const fleetNumber=String(bus?.n??"").trim();
  const defects=Array.isArray(bus?.defects)?bus.defects:[];
  return defects.map(defect=>defectRow(defect,fleetNumber,config,now)).filter(Boolean) as CloudRow[];
 });
 const entryRows=entries.map(entry=>downSheetRow(entry,config,now)).filter(Boolean) as CloudRow[];
 /* Records this device merged into another go up as tombstones. Without them
    the server keeps handing the duplicates back and the cleanup undoes itself
    on the next pull.

    A record the board still carries is never tombstoned, whatever the ledger
    says. That is what makes UNDO LAST safe even in the window before the ledger
    is cleared, and it means a stale entry can never delete a live repair. */
 const tombstones=mergedAwayRows(input.merged||{},config,now)
  .filter(row=>!defectRows.some(live=>live.defect_id===row.defect_id));

 const busChange=changedRows(busRows,"fleet_number",sent);
 const defectChange=changedRows([...defectRows,...tombstones],"defect_id",sent);
 const entryChange=changedRows(entryRows,"entry_id",sent);
 const outstanding=busChange.changed.length+defectChange.changed.length+entryChange.changed.length;
 const fingerprints={...busChange.fingerprints,...defectChange.fingerprints,...entryChange.fingerprints};

 if(!outstanding)return {ok:true,phase:"idle",message:"",sent:fingerprints,pushed:0,pending:0};

 try{
  const supabase=await cloudClient(config);
  if(!supabase)return {ok:false,phase:"error",message:"The connection details are not usable.",sent,pushed:0,pending:outstanding};

  const error=await executePushPlan(supabase,pushPlan(busChange.changed,defectChange.changed,entryChange.changed));
  if(error)return {...failed(new Error(error.message)),sent,pushed:0,pending:outstanding};
  return {ok:true,phase:"idle",message:"",sent:fingerprints,pushed:outstanding,pending:0};
 }catch(error){
  /* The fingerprints are NOT advanced on failure, so the next attempt sends the
     same work again rather than believing it already went. */
  return {...failed(error),sent,pushed:0,pending:outstanding};
 }
}

export type PullResult=CloudOutcome&{
 map:ReturnType<typeof fleetMapPayload>|null;
 defects:ReturnType<typeof defectLogPayload>|null;
 sheet:ReturnType<typeof downSheetPayload>|null;
};

/* Everything not tombstoned, handed back in the same shape a transfer FILE has
   so the caller can use the merge rules that already shipped. */
export async function cloudPull(config:CloudConfig,now:string,merged:MergedAwayDefects={}):Promise<PullResult>{
 const empty={map:null,defects:null,sheet:null};
 try{
  const supabase=await cloudClient(config);
  if(!supabase)return {ok:false,phase:"error",message:"The connection details are not usable.",...empty};
  const [busRes,defectRes,entryRes]=await Promise.all([
   readAll(supabase,"buses"),
   readAll(supabase,"bus_defects"),
   readAll(supabase,"down_sheet_entries"),
  ]);
  const firstError=busRes.error||defectRes.error||entryRes.error;
  if(firstError)return {...failed(new Error(firstError.message)),...empty};
  return {
   ok:true,phase:"idle",message:"",
   map:fleetMapPayload(busRes.rows,now),
   /* Minus anything this device has already folded into another record. The
      tombstones above clean the server, but a second device that has not run
      the cleanup yet will go on pushing its own copies, and those would arrive
      here and undo the merge. */
   defects:withoutMergedAway(defectLogPayload(defectRes.rows,now),merged),
   sheet:downSheetPayload(entryRes.rows,now),
  };
 }catch(error){return {...failed(error),...empty}}
}
