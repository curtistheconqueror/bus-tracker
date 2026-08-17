import {REPAIR_OPTIONS} from "../../repair-catalog";

export const runtime="edge";

const MAX_FILES=6;
const MAX_BYTES=8*1024*1024;
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function json(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}

function arrayBufferToBase64(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer);let binary="";
 for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
 return btoa(binary);
}

const rowSchema={
 type:"object",additionalProperties:false,
 properties:{
  pageNumber:{type:"integer"},lineNumber:{type:"string"},busNumber:{type:"string"},reason:{type:"string"},assignedTo:{type:"string"},
  category:{type:"string"},repair:{type:"string"},section:{type:"string",enum:["Pending","Accident","Scheduled Repair","Inspection","Vendor Repair","Roadcall","Other"]},
  shift:{type:"string",enum:["1st","2nd","3rd"]},operationalStatus:{type:"string",enum:["service","defect","shop","out","decommissioned","unknown"]},
  confidence:{type:"number",minimum:0,maximum:1},reviewNote:{type:"string"},
 },
 required:["pageNumber","lineNumber","busNumber","reason","assignedTo","category","repair","section","shift","operationalStatus","confidence","reviewNote"],
};

export async function POST(request:Request){
 const {env}=await import("cloudflare:workers");
 const runtimeEnv=env as unknown as Record<string,string|undefined>;
 const key=runtimeEnv.OPENAI_API_KEY;
 if(!key)return json({error:"Photo processing is not configured yet."},503);
 let form:FormData;
 try{form=await request.formData()}catch{return json({error:"The upload could not be read."},400)}
 const files=form.getAll("photos").filter((value):value is File=>value instanceof File);
 if(!files.length)return json({error:"Choose at least one photo."},400);
 if(files.length>MAX_FILES)return json({error:`Choose no more than ${MAX_FILES} photos at once.`},400);
 for(const file of files){
  if(!IMAGE_TYPES.has(file.type))return json({error:"Use a JPG, PNG, or WEBP image."},400);
  if(file.size>MAX_BYTES)return json({error:"Each photo must be 8 MB or smaller."},400);
 }
 const images=await Promise.all(files.map(async(file,index)=>({imageUrl:`data:${file.type};base64,${arrayBufferToBase64(await file.arrayBuffer())}`,page:index+1})));
 const catalog=Object.entries(REPAIR_OPTIONS).map(([category,repairs])=>`${category}: ${repairs.join(", ")}`).join("\n");
 const content:Record<string,unknown>[]=[{type:"input_text",text:`Read the attached maintenance Vehicle Down Sheet photos in page order. Extract only actual bus repair rows. Ignore titles, headers, blank rows, Fleet Review summaries, IDOT summary rows, Bus Total lines, page numbering without a bus, and other non-bus notes. Preserve the written reason as faithfully as possible. Bus numbers must be five digits. A row may contain several issues; keep the full wording in reason and choose the best single primary catalog category and repair below. Use section Vendor Repair for off-property/vendor work, Roadcall for R/C or towed road calls, Inspection for inspection services, Accident for collision work, otherwise Pending. Use the marked sheet shift when visible; otherwise 1st. Most active down-sheet buses should be out; use shop only when the wording clearly says work is in progress, defect only when it is expressly service-capable, and unknown when illegible. Put uncertainty or handwriting concerns in reviewNote and lower confidence. Never invent a bus or repair.\n\nREPAIR CATALOG\n${catalog}`}];
 for(const image of images){content.push({type:"input_text",text:`PAGE ${image.page}`});content.push({type:"input_image",image_url:image.imageUrl,detail:"high"})}
 const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:runtimeEnv.DOWN_SHEET_SCAN_MODEL||"gpt-5.4-mini",store:false,input:[{role:"user",content}],text:{format:{type:"json_schema",name:"down_sheet_scan",strict:true,schema:{type:"object",additionalProperties:false,properties:{rows:{type:"array",items:rowSchema}},required:["rows"]}}}})});
 if(!response.ok){const detail=await response.text();console.error("Down sheet scan failed",response.status,detail.slice(0,500));return json({error:"The photos could not be processed. Please try again."},502)}
 const payload=await response.json() as {output_text?:string;output?:Array<{content?:Array<{type?:string;text?:string}>}>},outputText=payload.output_text||payload.output?.flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;
 if(!outputText)return json({error:"No readable rows were returned."},422);
 try{const parsed=JSON.parse(outputText) as {rows?:unknown[]};return json({rows:Array.isArray(parsed.rows)?parsed.rows:[]})}catch{return json({error:"The scan result could not be reviewed."},502)}
}
