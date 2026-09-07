import {REPAIR_OPTIONS} from "../../repair-catalog";
import {cleanScanNotes,scanNotesPrompt} from "../../scan-notes";

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
 const key=runtimeEnv.OPENROUTER_API_KEY;
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
 /* What the person holding the sheet knows the camera will get wrong. Capped
    here as well as in the box, and framed in the prompt as facts about the
    paper that can correct a reading but never add a bus. */
 const notes=cleanScanNotes(form.get("notes"));
 const catalog=Object.entries(REPAIR_OPTIONS).map(([category,repairs])=>`${category}: ${repairs.join(", ")}`).join("\n");
 const content:Record<string,unknown>[]=[{type:"text",text:`Read the attached maintenance Vehicle Down Sheet photos in page order. Extract only actual bus repair rows. Ignore titles, headers, blank rows, Fleet Review summaries, IDOT summary rows, Bus Total lines, page numbering without a bus, the foreman and shift line at the top, the bay assignment line at the bottom, and other non-bus notes. Preserve the written reason as faithfully as possible. Bus numbers must be five digits.

EVERY bus number written anywhere on the sheet MUST produce a row, and there are two kinds. Rows on the printed numbered lines: report the line number you read in lineNumber, exactly as printed, so gaps can be found. And rows written by hand OUTSIDE the table - pencilled in the margins, squeezed below the last printed line, or added in a corner - which have NO line number: emit them with lineNumber set to "margin". These handwritten rows are as real as the printed ones and are the ones most often left out; a bus written in the margin and not read reaches nobody. Do not skip any row because its reason is short, because the handwriting is faint, or because it looks like a repeat of the line above. A bus number struck through or crossed out has been taken off the sheet: skip that row entirely. A row carrying several bus numbers is several rows — emit one row per bus, each with the same reason, same mechanic and its own bus number, since a line reading "PM'S 17514 17556 17525" is five-digit buses all due the same service.

The mechanic column is headed MECHANIC/LOCATION and holds either. A vendor written there — Bus & Truck, Cummins, Thermo King, Allison — is the sheet saying where the bus is, so use section Vendor Repair and put the vendor in assignedTo. A person's name there is the mechanic who has it. A row may contain several issues; keep the full wording in reason and choose the best single primary catalog category and repair below.

The sheet may be divided into banded sections under headings. A heading is never a bus row: skip it, and apply it to every row beneath it until the next heading. The headings are OFF PROPERTY (rows below are away at a vendor: use section Vendor Repair), SCHEDULED (rows below are assigned to a named mechanic or vendor: use section Scheduled Repair and read the name into assignedTo), UNSCHEDULED (rows below have nobody assigned: use section Pending and leave assignedTo empty unless a name is actually written on the row), and INSPECTIONS & SCHEDULED MAINTENANCE or INSPECTIONS (rows below are inspections, spark plugs or valve adjustments: use section Inspection). A row's own wording still wins over the heading it sits under — a collision repair is Accident and an R/C or towed bus is Roadcall wherever it is written. On a sheet with no headings, or for rows above the first heading, judge each row on its own wording: Vendor Repair for off-property/vendor work, Roadcall for R/C or towed road calls, Inspection for inspection, spark plug or valve adjustment services, Accident for collision work, Scheduled Repair when a mechanic is named, otherwise Pending. A reason that is only a service code — a letter and a number such as A3, A15, A21, B12, B18 or C24 — or the words PM'S or TRANS HUB DIFF is Inspection. PM DEFECTS is the opposite: those are faults found while doing a PM, so the bus is down and the section follows the faults, not the PM. HAZMAT means a biohazard on board - blood, vomit or faeces - so use category Interior Cleaning and repair "Biohazard - blood, vomit or faeces (HAZMAT)"; it is never an unknown diagnosis. Bus numbers are five digits and must be read one digit at a time rather than guessed from a similar number elsewhere on the sheet.

For a margin row, leave assignedTo empty unless a name is written beside that row specifically - a name on the bay-assignment line at the bottom belongs to that line, not to the margin rows near it. Read a handwritten five-digit bus number one digit at a time and set confidence below 0.7 for any row you had to interpret rather than read cleanly, so a person checks it. Use the marked sheet shift when visible; otherwise 1st. Most active down-sheet buses should be out; use shop only when the wording clearly says work is in progress, defect only when it is expressly service-capable, and unknown when illegible. Put uncertainty or handwriting concerns in reviewNote and lower confidence. Never invent a bus or repair.${scanNotesPrompt(notes)}\n\nREPAIR CATALOG\n${catalog}`}];
 for(const image of images){content.push({type:"text",text:`PAGE ${image.page}`});content.push({type:"image_url",image_url:{url:image.imageUrl,detail:"high"}})}
 const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":"https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site","X-Title":"Fleet Maintenance Bus Tracker"},body:JSON.stringify({model:runtimeEnv.DOWN_SHEET_SCAN_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content}],response_format:{type:"json_schema",json_schema:{name:"down_sheet_scan",strict:true,schema:{type:"object",additionalProperties:false,properties:{rows:{type:"array",items:rowSchema}},required:["rows"]}}}})});
 if(!response.ok){
  const detail=await response.text();let upstreamCode="";
  try{const parsed=JSON.parse(detail) as {error?:{code?:string|number;type?:string}};upstreamCode=String(parsed.error?.code||parsed.error?.type||"")}catch{}
  console.error("Down sheet scan failed",response.status,upstreamCode||"unknown");
  const error=response.status===401?"OpenRouter authorization was rejected.":response.status===402?"Photo processing needs OpenRouter credits.":response.status===429?"Photo processing is temporarily rate limited. Try again shortly.":response.status===400?"The photo-processing request was rejected. Please try a clearer JPG photo.":"The photos could not be processed. Please try again.";
  return json({error,upstreamStatus:response.status,upstreamCode},502);
 }
 const payload=await response.json() as {choices?:Array<{message?:{content?:string|Array<{type?:string;text?:string}>}}>},messageContent=payload.choices?.[0]?.message?.content,outputText=typeof messageContent==="string"?messageContent:messageContent?.find(item=>item.type==="text")?.text;
 if(!outputText)return json({error:"No readable rows were returned."},422);
 try{const parsed=JSON.parse(outputText) as {rows?:unknown[]};return json({rows:Array.isArray(parsed.rows)?parsed.rows:[]})}catch{return json({error:"The scan result could not be reviewed."},502)}
}
