import {boardFromRows,busDefects,discrepancies,downSheetView,fleetCounts,locateBus} from "@/src/lib/mcp/fleet-reads";
import {readBoardRows,type ReadableClient} from "@/src/lib/mcp/cloud-read";
import {handleRpc,textResult,type ToolResult} from "@/src/lib/mcp/mcp-protocol";
import {createSessionCache,sessionCacheKey} from "@/src/lib/mcp/session-cache";
import {offeredToken,sameSecret} from "@/src/lib/mcp/agent-token";

/* The agent surface: one MCP endpoint over the Shop Cloud, read-only.

   WHY THIS EXISTS AND WHAT IT IS NOT. Curtis wants to plug agents into the
   platform — "log defects, locate buses, find discrepancies between what the
   down sheet shows and what's actually on the map". This is the read half of
   that. It is NOT a way to drive the app: MCP hands an agent tools, not a
   browser, and an agent here is a peer device with no screen rather than a
   mechanic's hands.

   It also cannot see the whole truth, and that is by design rather than by
   omission. The records live in each device's LocalStorage; the Shop Cloud is a
   copy. So this reads what phones have pushed, which is why every answer carries
   `asOf` and `fetchedAt`. The things that deliberately never travel are
   invisible from here and must stay that way: a HOLD is device-local because
   Curtis said so — "if someone is asked to hold a bus then they should know. It
   doesn't need to show up on everybody's screen" — and so are the sweep, the
   roles, the shift hours, PATH TO REPAIR, the repair-hours ledger and every undo
   ledger.

   THE SECURITY MODEL, STATED PLAINLY. Two layers, and neither is the other's
   job. An agent authenticates to THIS ROUTE with a bearer token. The route
   authenticates to Supabase with the shop's own login. The agent therefore never
   holds a database credential, which is the whole reason to put a server in the
   middle: a leaked agent token can do only what the tool list allows, and the
   tool list is five read questions.

   The shop's login CAN write — RLS grants insert and update to anything
   authenticated — so read-only here is a property of there being no write code
   path, not of a policy. That is an honest Phase 1 and it is written down rather
   than implied. Making it a policy means narrowing the rules forty phones write
   through, and a narrowed UPDATE policy returns zero rows and LOOKS LIKE
   SUCCESS, which is the shape of the bug that kept tombstones out of the cloud
   for a week. So that is a migration, and a migration is Curtis's call. */

export const runtime="edge";

function json(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}

/* The token an agent offered, and the length-safe comparison, both in
   `src/lib/mcp/agent-token.ts` — the header-beats-URL precedence is a rule
   worth a test, and this file cannot be run without a Worker. */
function bearer(request:Request){
 return offeredToken(request.headers.get("Authorization")||"",request.url);
}

/* One client per isolate, signed in once — and dropped when a read fails.

   `persistSession` is off because there is no storage here and nothing to
   restore from: the session lives in this instance's memory and dies with the
   isolate, which is correct for a server and means a cold start costs one
   sign-in rather than one per tool call.

   `autoRefreshToken` is off too, which is right for a Worker — a background
   refresh timer in an environment that suspends between requests is a timer
   that fires at nobody. It also means the token behind this client expires on
   its own schedule and nothing renews it, so the cache HAS to let go: see
   `session-cache.ts`, which owns when, and the `sessions.invalidate()` beside
   the read below, which is the case that would otherwise have made this
   endpoint work for an hour of uptime and then stop. */
const sessions=createSessionCache<ReadableClient>();

type Credentials={url:string;anonKey:string;email:string;password:string};

async function signedInClient(credentials:Credentials):Promise<{client:ReadableClient|null;error:string}>{
 return sessions.get(sessionCacheKey(credentials),async()=>{
  try{
   const {createClient}=await import("@supabase/supabase-js");
   const created=createClient(credentials.url,credentials.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
   const {error}=await created.auth.signInWithPassword({email:credentials.email,password:credentials.password});
   /* The underlying message rides along, because without it "rejected the
      sign-in" is what a WRONG PROJECT URL looks like too — measured, by
      pointing this at a host that does not exist and reading what came back.
      Whoever is wiring the endpoint up is the only person who sees this, they
      are already past the bearer token, and it is about configuration rather
      than about any bus. Sending them after a password that was never wrong is
      the expensive outcome here. */
   if(error)return {client:null,error:"The shop cloud rejected the sign-in: "+(error.message||"no reason given")};
   return {client:created as unknown as ReadableClient,error:""};
  }catch{
   return {client:null,error:"The shop cloud could not be reached."};
  }
 });
}

export async function GET(){
 /* MCP is a POST protocol. Answered rather than left to 404 so somebody opening
    the URL in a browser learns what it is instead of thinking it is missing. */
 return json({error:"This is an MCP endpoint. Send JSON-RPC over POST, with the token either as an Authorization: Bearer header or as ?token= on this URL."},405);
}

export async function POST(request:Request){
 const {env}=await import("cloudflare:workers");
 const runtimeEnv=env as unknown as Record<string,string|undefined>;

 const token=runtimeEnv.MCP_TOKEN;
 const credentials:Credentials={
  url:runtimeEnv.SUPABASE_URL||"",
  anonKey:runtimeEnv.SUPABASE_ANON_KEY||"",
  email:runtimeEnv.SHOP_EMAIL||"",
  password:runtimeEnv.SHOP_PASSWORD||"",
 };

 /* Unconfigured is 503 and says so, the way the scan route does when its key is
    missing. A 401 here would send whoever is wiring this up hunting for a token
    problem that does not exist. */
 if(!token)return json({error:"The agent endpoint is not configured yet."},503);

 const offered=bearer(request);
 if(!offered||!sameSecret(offered,token))return json({error:"Unauthorized."},401);

 /* The shop cloud's credentials are NOT checked here, deliberately.

    `initialize` and `tools/list` touch no data, and an agent that cannot
    complete a handshake cannot tell its user anything useful — it just fails to
    connect. So discovery works whatever state the cloud is in, and a missing
    credential surfaces where it can be read and reasoned about: as a tool
    result saying the records could not be reached. Same principle as a refused
    read, one step earlier. */

 let body:unknown;
 try{body=await request.json()}catch{
  return json({jsonrpc:"2.0",id:null,error:{code:-32700,message:"The request body was not JSON."}},400);
 }

 /* The board is read once per request and shared by every tool call in it, so a
    batch cannot see two different boards — and so an agent asking three
    questions does not read four hundred buses three times. */
 let board:Awaited<ReturnType<typeof loadBoard>>|null=null;
 async function loadBoard(){
  if(!credentials.url||!credentials.anonKey||!credentials.email||!credentials.password)
   return {error:"The agent endpoint has no shop cloud credentials configured.",board:null};
  const signedIn=await signedInClient(credentials);
  if(!signedIn.client)return {error:signedIn.error,board:null};
  const rows=await readBoardRows(signedIn.client);
  /* A read that failed on a client which just signed in successfully has most
     likely lost its session, and nothing here renews one. Dropping the cached
     client means the next request signs in again instead of this isolate
     answering "could not be read" for as long as it lives. A refused read —
     a permission problem rather than an expiry — costs one extra sign-in on a
     request that had already failed, which is the right way round to be wrong. */
  if(rows.error){sessions.invalidate(signedIn.client);return {error:rows.error,board:null}}
  return {error:"",board:boardFromRows(rows.buses,rows.defects,rows.entries,new Date().toISOString())};
 }

 const runner=async(name:string,args:Record<string,unknown>):Promise<ToolResult>=>{
  if(!board)board=await loadBoard();
  /* A cloud that cannot be read is a TOOL result, not a protocol error: the
     agent can say "I could not reach the shop's records" and stop, which is a
     far better outcome than a -32603 it has no way to interpret. */
  if(!board.board)return textResult({error:board.error,readable:false},true);
  const current=board.board;
  const fleetNumber=String(args.fleet_number??"");
  if(name==="locate_bus")return textResult(locateBus(current,fleetNumber));
  if(name==="bus_defects")return textResult(busDefects(current,fleetNumber,args.include_completed===true));
  if(name==="down_sheet")return textResult(downSheetView(current,{
   section:typeof args.section==="string"?args.section:"",
   shift:typeof args.shift==="string"?args.shift:"",
   includeCompleted:args.include_completed===true,
  }));
  if(name==="fleet_counts")return textResult(fleetCounts(current,new Date().toISOString()));
  if(name==="discrepancies")return textResult(discrepancies(current));
  /* Unreachable: handleRpc rejects an unknown name before the runner is called.
     Kept so this function is total rather than relying on that from a distance. */
  return textResult({error:"No such tool: "+name},true);
 };

 /* A batch is a JSON array. Notifications inside one produce no response, so a
    batch of only notifications is answered with 202 and no body, which is what
    the transport expects. */
 if(Array.isArray(body)){
  /* An empty batch is an invalid request, not an empty one. Answered rather
     than 202'd for the same reason a bare `null` is: silence is the one answer
     the caller cannot act on.

     HTTP 200, matching the -32600 that `handleRpc` returns for a non-object
     body. The same error code must not arrive under two different statuses
     from one endpoint, and 200 is the right one: the transport worked, and the
     refusal is in the envelope. The unparseable-body case above stays 400
     because there is no envelope there to put an answer in. */
  if(!body.length)return json({jsonrpc:"2.0",id:null,error:{code:-32600,message:"A JSON-RPC batch must not be empty."}});
  const responses=[];
  for(const item of body){
   const response=await handleRpc(item as Record<string,unknown>,runner);
   if(response)responses.push(response);
  }
  return responses.length?json(responses):new Response(null,{status:202});
 }

 const response=await handleRpc(body as Record<string,unknown>,runner);
 return response?json(response):new Response(null,{status:202});
}
