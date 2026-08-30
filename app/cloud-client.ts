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
  signOut():Promise<{error:{message:string}|null}>;
  getSession():Promise<{data:{session:unknown|null};error:{message:string}|null}>;
 };
 from(table:string):{
  upsert(rows:CloudRow[],options:{onConflict:string}):Promise<{error:{message:string}|null}>;
  select(columns:string):{is(column:string,value:null):Promise<{data:CloudRow[]|null;error:{message:string}|null}>};
 };
};

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
  if(supabase)await supabase.auth.signOut();
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
};

export type PushResult=CloudOutcome&{sent:SentFingerprints;pushed:number;pending:number};

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

 const busChange=changedRows(busRows,"fleet_number",sent);
 const defectChange=changedRows(defectRows,"defect_id",sent);
 const entryChange=changedRows(entryRows,"entry_id",sent);
 const outstanding=busChange.changed.length+defectChange.changed.length+entryChange.changed.length;
 const fingerprints={...busChange.fingerprints,...defectChange.fingerprints,...entryChange.fingerprints};

 if(!outstanding)return {ok:true,phase:"idle",message:"",sent:fingerprints,pushed:0,pending:0};

 try{
  const supabase=await cloudClient(config);
  if(!supabase)return {ok:false,phase:"error",message:"The connection details are not usable.",sent,pushed:0,pending:outstanding};

  /* Buses first. A defect or a sheet entry naming a bus the server has never
     heard of is not an error here — nothing has a foreign key to buses, on
     purpose, because a fleet number is a name both devices already agree on and
     making it a key would let one device's missing bus reject another's work. */
  const writes:[string,CloudRow[],string][]=[
   ["buses",busChange.changed,"fleet_number"],
   ["bus_defects",defectChange.changed,"defect_id"],
   ["down_sheet_entries",entryChange.changed,"entry_id"],
  ];
  for(const [table,rows,conflict] of writes){
   if(!rows.length)continue;
   /* Chunked so one bad afternoon on a slow connection does not turn into a
      single request the phone cannot finish. */
   for(let at=0;at<rows.length;at+=200){
    const {error}=await supabase.from(table).upsert(rows.slice(at,at+200),{onConflict:conflict});
    if(error)return {...failed(new Error(error.message)),sent,pushed:0,pending:outstanding};
   }
  }
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
export async function cloudPull(config:CloudConfig,now:string):Promise<PullResult>{
 const empty={map:null,defects:null,sheet:null};
 try{
  const supabase=await cloudClient(config);
  if(!supabase)return {ok:false,phase:"error",message:"The connection details are not usable.",...empty};
  const [busRes,defectRes,entryRes]=await Promise.all([
   supabase.from("buses").select("*").is("deleted_at",null),
   supabase.from("bus_defects").select("*").is("deleted_at",null),
   supabase.from("down_sheet_entries").select("*").is("deleted_at",null),
  ]);
  const firstError=busRes.error||defectRes.error||entryRes.error;
  if(firstError)return {...failed(new Error(firstError.message)),...empty};
  return {
   ok:true,phase:"idle",message:"",
   map:fleetMapPayload(busRes.data||[],now),
   defects:defectLogPayload(defectRes.data||[],now),
   sheet:downSheetPayload(entryRes.data||[],now),
  };
 }catch(error){return {...failed(error),...empty}}
}
