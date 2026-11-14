import {PAPER_MAX_PHOTOS} from "@/src/lib/scan/paper-kinds";
import {PAPER_DOCUMENT_VALUES,paperIdentifyPrompt} from "@/src/lib/scan/paper-identify";

export const runtime="edge";

/* The first look SCAN PAPER takes: which sheet is each photo.

   Same transport as the three scan routes beside it — the same key, the same
   model unless one is named for this, the same strict JSON answer — and a much
   smaller job. It reads no rows and returns no bus numbers. It answers one
   word per page, from small copies of the photos, all in one request.

   WHAT THE SHEETS LOOK LIKE IS NOT WRITTEN HERE. The question is built from
   the table of sheets in src/lib/scan/paper-kinds.ts, which is also what the
   screen and the hand-off read, so a fourth sheet added to the app is in this
   prompt the moment it is in the table.

   AND NOTHING HERE IS A DECISION. The answer goes back as it came; whether a
   page was placed, whether the pages agree and what the person is asked are
   all decided on the client in paper-identify.ts, which trusts none of it.

   The transport below is the fourth copy of the one in down-sheet-scan,
   sweep-scan and heat-sheet-scan. It is kept the same shape on purpose so the
   four can be lifted into one module together, by somebody holding a key to
   prove the three working ones still read a real sheet afterwards. */

const MAX_BYTES=2*1024*1024;
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function json(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}

function arrayBufferToBase64(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer);let binary="";
 for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
 return btoa(binary);
}

const pageSchema={
 type:"object",additionalProperties:false,
 properties:{
  page:{type:"integer"},
  document:{type:"string",enum:[...PAPER_DOCUMENT_VALUES]},
  confidence:{type:"number",minimum:0,maximum:1},
 },
 required:["page","document","confidence"],
};

export async function POST(request:Request){
 const {env}=await import("cloudflare:workers");
 const runtimeEnv=env as unknown as Record<string,string|undefined>;
 const key=runtimeEnv.OPENROUTER_API_KEY;
 if(!key)return json({error:"Photo processing is not configured yet."},503);
 let form:FormData;
 try{form=await request.formData()}catch{return json({error:"The upload could not be read."},400)}
 const files=form.getAll("photos").filter((value):value is File=>value instanceof File);
 if(!files.length)return json({error:"Choose at least one photo."},400);
 if(files.length>PAPER_MAX_PHOTOS)return json({error:`Choose no more than ${PAPER_MAX_PHOTOS} photos at once.`},400);
 for(const file of files){
  if(!IMAGE_TYPES.has(file.type))return json({error:"Use a JPG, PNG, or WEBP image."},400);
  /* Far under the scan routes' 8 MB: these are the small copies, and a full
     photo arriving here means the caller skipped the shrink. */
  if(file.size>MAX_BYTES)return json({error:"Each photo must be 2 MB or smaller for the first look."},413);
 }
 const images=await Promise.all(files.map(async(file,index)=>({imageUrl:`data:${file.type};base64,${arrayBufferToBase64(await file.arrayBuffer())}`,page:index+1})));
 const content:Record<string,unknown>[]=[{type:"text",text:paperIdentifyPrompt()}];
 for(const image of images){content.push({type:"text",text:`PAGE ${image.page}`});content.push({type:"image_url",image_url:{url:image.imageUrl}})}
 const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":"https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site","X-Title":"Fleet Maintenance Bus Tracker"},body:JSON.stringify({model:runtimeEnv.SCAN_IDENTIFY_MODEL||runtimeEnv.DOWN_SHEET_SCAN_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content}],response_format:{type:"json_schema",json_schema:{name:"paper_identify",strict:true,schema:{type:"object",additionalProperties:false,properties:{pages:{type:"array",items:pageSchema}},required:["pages"]}}}})});
 if(!response.ok){
  const detail=await response.text();let upstreamCode="";
  try{const parsed=JSON.parse(detail) as {error?:{code?:string|number;type?:string}};upstreamCode=String(parsed.error?.code||parsed.error?.type||"")}catch{}
  console.error("Paper identify failed",response.status,upstreamCode||"unknown");
  const error=response.status===401?"OpenRouter authorization was rejected.":response.status===402?"Photo processing needs OpenRouter credits.":response.status===429?"Photo processing is temporarily rate limited.":"The first look failed.";
  return json({error,upstreamStatus:response.status,upstreamCode},502);
 }
 const payload=await response.json() as {choices?:Array<{message?:{content?:string|Array<{type?:string;text?:string}>}}>},messageContent=payload.choices?.[0]?.message?.content,outputText=typeof messageContent==="string"?messageContent:Array.isArray(messageContent)?messageContent.map(part=>part.text||"").join(""):"";
 if(!outputText)return json({error:"The first look returned nothing."},422);
 try{const parsed=JSON.parse(outputText) as {pages?:unknown[]};return json({pages:Array.isArray(parsed.pages)?parsed.pages:[]})}catch{return json({error:"The first look could not be understood."},502)}
}
