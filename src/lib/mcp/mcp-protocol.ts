/* The MCP wire protocol, with no network and no fleet knowledge in it.

   Separated from `fleet-reads.ts` and from the route for one reason: this is the
   part that can be tested exhaustively and the other two cannot. The route needs
   a Worker and a signed-in Supabase session; the reads need a board. This needs
   a JSON object, so every envelope an agent can send — including the malformed
   ones — gets an assertion rather than an assumption.

   MCP rides on JSON-RPC 2.0. Three methods carry everything Phase 1 needs:
   `initialize` (the handshake), `tools/list` (what can I call) and `tools/call`
   (call it). Notifications — `notifications/initialized` and friends — carry no
   `id` and MUST NOT be answered; returning a response to one is the single most
   common way a server looks broken to a client that is behaving correctly.

   THE TWO KINDS OF FAILURE ARE NOT THE SAME THING, and conflating them is the
   second most common way. A protocol fault — unknown method, missing argument —
   is a JSON-RPC `error`. A tool that ran and could not answer is a SUCCESSFUL
   response whose result carries `isError:true`, because the model is supposed to
   read it, reason about it and try something else. An agent that gets -32603
   because a bus number was not on the board learns nothing it can act on. */

export const JSONRPC="2.0";

/* Echoed from the client when it offers one, so a newer agent is never turned
   away by a version string baked in here, and this constant is the only thing
   to change when the floor moves. */
export const FALLBACK_PROTOCOL_VERSION="2025-06-18";

export const SERVER_INFO={name:"pace-south-fleet",version:"1.0.0"} as const;

export type ToolContent={type:"text";text:string};
export type ToolResult={content:ToolContent[];isError?:boolean};
export type ToolRunner=(name:string,args:Record<string,unknown>)=>Promise<ToolResult>;

export type RpcRequest={jsonrpc?:unknown;id?:unknown;method?:unknown;params?:unknown};
export type RpcResponse={jsonrpc:typeof JSONRPC;id:string|number|null;result?:unknown;error?:{code:number;message:string}};

/* The JSON-RPC codes, named, because -32602 in a route file tells a reader
   nothing and this file is the only place they belong. */
export const PARSE_ERROR=-32700;
export const INVALID_REQUEST=-32600;
export const METHOD_NOT_FOUND=-32601;
export const INVALID_PARAMS=-32602;
export const INTERNAL_ERROR=-32603;

const BUS_ARG={fleet_number:{type:"string",description:"The bus's fleet number as a person says it, e.g. \"17549\". Not an internal id."}};

/* The tool surface, and it is READ-ONLY on purpose.

   Every one of these answers a question. None of them changes a record, and
   there is no fourth file in this directory that does. When writes arrive they
   arrive with per-agent credentials and a scoped database user, which is a
   migration against the live database and therefore a decision rather than a
   commit.

   The descriptions are written for a model, which means they say what the thing
   IS to the shop, not what the function returns. "Buses parked in a working
   area that nobody wrote up" is actionable; "returns mysteryBusIds" is not. */
export const TOOLS=[
 {
  name:"locate_bus",
  description:"Where one bus is right now, by fleet number: the area in the words the shop uses, its status, whether the Down Sheet has it, and how many defects are still open on it.",
  inputSchema:{type:"object",properties:BUS_ARG,required:["fleet_number"],additionalProperties:false},
 },
 {
  name:"bus_defects",
  description:"Every defect logged against one bus. Open ones by default; pass include_completed to see the history too. Each defect comes back with the wording the shop's current catalog uses, not whatever wording it was saved under.",
  inputSchema:{
   type:"object",
   properties:{...BUS_ARG,include_completed:{type:"boolean",description:"Include defects already marked completed. Default false."}},
   required:["fleet_number"],
   additionalProperties:false,
  },
 },
 {
  name:"down_sheet",
  description:"The Down Sheet as the Shop Cloud has it — which buses are written up, for what, by which shift. Completed rows are left out unless asked for. The Down Sheet is the source of truth for whether a bus is down.",
  inputSchema:{
   type:"object",
   properties:{
    section:{type:"string",description:"Limit to one section, e.g. Pending, Roadcall, Inspection, Vendor Repair."},
    shift:{type:"string",description:"Limit to one shift: 1st, 2nd or 3rd."},
    include_completed:{type:"boolean",description:"Include completed rows. Default false."},
   },
   additionalProperties:false,
  },
 },
 {
  name:"fleet_counts",
  description:"The shop's headline numbers: how many buses are down, how many are soft down and still drivable, how many are on the sheet, and how many carry open defects. The same figures the printed Fleet Status Report uses, counted by bus rather than by row.",
  inputSchema:{type:"object",properties:{},additionalProperties:false},
 },
 {
  name:"discrepancies",
  description:"Where the map and the Down Sheet disagree. Mystery buses are parked in a working area — a bay, the pit, the wash, body or paint — with nobody's write-up behind them, which usually means somebody moved a bus for a reason that was never recorded. Bay 12 awareness is the narrower case: a bus flagged for watching, carrying active defects, still not on the sheet.",
  inputSchema:{type:"object",properties:{},additionalProperties:false},
 },
] as const;

export const TOOL_NAMES=TOOLS.map(tool=>tool.name);

export function isReadOnlyToolSurface(){
 /* Asserted rather than commented, so a write tool cannot be added to the list
    above without a test going red and somebody having to think about RLS. */
 return TOOLS.every(tool=>/^(locate_bus|bus_defects|down_sheet|fleet_counts|discrepancies)$/.test(tool.name));
}

export function textResult(value:unknown,isError=false):ToolResult{
 return {content:[{type:"text",text:typeof value==="string"?value:JSON.stringify(value,null,1)}],isError:isError||undefined};
}

function rpcError(id:string|number|null,code:number,message:string):RpcResponse{
 return {jsonrpc:JSONRPC,id,error:{code,message}};
}

function rpcOk(id:string|number|null,result:unknown):RpcResponse{
 return {jsonrpc:JSONRPC,id,result};
}

/* An id is a string or a number, and absent means notification.

   `null` is a legal JSON-RPC id but is also what we must answer WITH when a
   request was too broken to have one, so the two cases are told apart by
   presence rather than by value. */
function requestId(request:RpcRequest):{present:boolean;id:string|number|null}{
 const raw=request?.id;
 if(typeof raw==="string"||typeof raw==="number")return {present:true,id:raw};
 if(raw===null)return {present:true,id:null};
 return {present:false,id:null};
}

function params(request:RpcRequest):Record<string,unknown>{
 return request?.params&&typeof request.params==="object"&&!Array.isArray(request.params)
  ?request.params as Record<string,unknown>
  :{};
}

/* One envelope in, one envelope out — or null, for a notification.

   The runner is passed in rather than imported so the fleet half can be swapped
   for a fixture in the tests, and so this file never grows a reason to know what
   a bus is. */
export async function handleRpc(request:RpcRequest,runner:ToolRunner):Promise<RpcResponse|null>{
 const {present,id}=requestId(request);
 const method=typeof request?.method==="string"?request.method:"";

 if(!method)return present?rpcError(id,INVALID_REQUEST,"A JSON-RPC request needs a method."):null;

 /* Notifications get no answer, whatever they are. Checked before the method
    switch so an unknown notification is silently correct rather than a
    METHOD_NOT_FOUND nobody asked for. */
 if(!present)return null;

 if(method==="initialize"){
  const offered=params(request).protocolVersion;
  return rpcOk(id,{
   protocolVersion:typeof offered==="string"&&offered?offered:FALLBACK_PROTOCOL_VERSION,
   capabilities:{tools:{}},
   serverInfo:SERVER_INFO,
  });
 }

 if(method==="ping")return rpcOk(id,{});

 if(method==="tools/list")return rpcOk(id,{tools:TOOLS});

 if(method==="tools/call"){
  const callParams=params(request);
  const name=typeof callParams.name==="string"?callParams.name:"";
  if(!name)return rpcError(id,INVALID_PARAMS,"tools/call needs a tool name.");
  if(!TOOL_NAMES.includes(name))return rpcError(id,INVALID_PARAMS,"No such tool: "+name+". Call tools/list for the ones that exist.");
  const args=callParams.arguments&&typeof callParams.arguments==="object"&&!Array.isArray(callParams.arguments)
   ?callParams.arguments as Record<string,unknown>
   :{};
  const schema=TOOLS.find(tool=>tool.name===name)?.inputSchema as {required?:readonly string[]}|undefined;
  for(const required of schema?.required??[]){
   if(!String(args[required]??"").trim())return rpcError(id,INVALID_PARAMS,name+" needs "+required+".");
  }
  try{
   return rpcOk(id,await runner(name,args));
  }catch(error){
   /* A thrown runner is OUR fault, not the agent's, so it is a protocol error
      rather than a tool result. A bus that is simply not on the board is not
      this path — that comes back as a result saying so. */
   return rpcError(id,INTERNAL_ERROR,error instanceof Error?error.message:"The tool failed.");
  }
 }

 return rpcError(id,METHOD_NOT_FOUND,"Unsupported method: "+method);
}
