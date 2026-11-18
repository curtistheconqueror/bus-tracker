import {cleanScanNotes,scanNotesPrompt} from "@/src/lib/defects/scan-notes";

export const runtime="edge";

/* Reads the shop's heat check sheet from a photo.

   Same transport as the Down Sheet and sweep scans — one page per request, the
   same size limits, the same model, the same strict JSON answer — with a
   different description of the document.

   THE MODEL IS ASKED TO COPY, NOT TO INTERPRET. The sweep route has the model
   decide what a mark means and return "ok" or "fault"; this one returns the
   result cell as written. The reason is the mark itself: "N/R" reads as "needs
   repair" and as "no repair needed" with equal ease, and a model left to pick
   would pick per row. What N/R means was asked of the shop and is decided once,
   in heat-check-import.ts, which is also where nothing from here is trusted. */

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
  pageNumber:{type:"integer"},
  busNumber:{type:"string"},
  written:{type:"string"},
  struck:{type:"boolean"},
  date:{type:"string"},
  initial:{type:"string"},
  note:{type:"string"},
  confidence:{type:"number",minimum:0,maximum:1},
  reviewNote:{type:"string"},
 },
 required:["pageNumber","busNumber","written","struck","date","initial","note","confidence","reviewNote"],
};

const INSTRUCTIONS=`Read the attached photos of the shop's hand-filled HEAT CHECK sheet, in page order.

THE SHEET. A printed list of bus numbers, repeated in three column groups across the page. Beside each printed bus number are three hand-filled cells, in this order: a RESULT, a DATE, and the checker's INITIALS. The sheet is usually titled as a heat check or inspection and headed BUS LIST; each column group is headed "Bus".

Return ONE ROW FOR EVERY PRINTED BUS NUMBER ON THE PAGE, in reading order down each column group and then across — including the lines where all three cells are empty. An empty line is information: it is a bus nobody has checked yet. Never skip a line and never merge two lines.

FOR EACH ROW:
- busNumber: the printed bus number, read one digit at a time. Bus numbers are five digits. If the edge of the photo cuts a number off, return only the digits you can actually see and say so in reviewNote; never complete a number from the ones around it.
- written: COPY the result cell exactly as it is written — for example "N/R", "NR", "OK", "OKAY". Do not translate it, do not expand it and do not decide what it means. If the cell is empty return an empty string. If something is written that you cannot read, return your best reading, lower confidence and say so in reviewNote.
- date: copy the date cell exactly as written, for example "10/22" or "9/29". The sheet carries no year; do not add one. Empty string if the cell is empty.
- initial: copy the initials cell exactly as written, two or three letters. Empty string if the cell is empty. Initials are never a result.
- struck: true ONLY when a pen line has been drawn through the row — a horizontal stroke crossing the row's cells or its bus number. A struck row usually still shows the result that was written before it was crossed out: still copy that result into written, and set struck to true. Underlines, the printed grid lines and a mark circled beside the row are not strike-throughs.
- note: anything else written on or beside the row — a circled mark, a word in the margin — copied verbatim. Empty string if nothing.
- confidence: how sure you are of the row as a whole, 0 to 1. Use below 0.7 for any row where you had to interpret a bus number, a result or a strike-through rather than read it cleanly.
- reviewNote: why a person should look at this row, or an empty string.

WRITTEN OVER. If a result has been scribbled out and another written beside or over it, copy the one that was left standing and say in reviewNote that it was written over.

NOT A HEAT CHECK SHEET — first decide what the page IS and answer it in "document": "heat" for the sheet described above, or "other". A Vehicle Down Sheet (a numbered list of buses with a reason and a mechanic per line), a farebox or Ventra check-off sheet (tick columns per device), a work order, a parts list, a whiteboard or anything else is "other". For a page that is "other", return NO rows at all — an empty rows array. Bus numbers on another kind of document are not heat findings, and reading them as one files repairs that do not exist.

Never invent a bus, a result, a date or initials.`;

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
 /* The scanner's notes ride behind the fixed instructions, never in front of
    them, so what the sheet is and what a row holds are still decided above. */
 const notes=cleanScanNotes(form.get("notes"));
 const content:Record<string,unknown>[]=[{type:"text",text:INSTRUCTIONS+scanNotesPrompt(notes)}];
 for(const image of images){content.push({type:"text",text:`PAGE ${image.page}`});content.push({type:"image_url",image_url:{url:image.imageUrl,detail:"high"}})}
 const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":"https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site","X-Title":"Fleet Maintenance Bus Tracker"},body:JSON.stringify({model:runtimeEnv.HEAT_SHEET_SCAN_MODEL||runtimeEnv.DOWN_SHEET_SCAN_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content}],response_format:{type:"json_schema",json_schema:{name:"heat_sheet_scan",strict:true,schema:{type:"object",additionalProperties:false,properties:{document:{type:"string",enum:["heat","other"]},rows:{type:"array",items:rowSchema}},required:["document","rows"]}}}})});
 if(!response.ok){
  const detail=await response.text();let upstreamCode="";
  try{const parsed=JSON.parse(detail) as {error?:{code?:string|number;type?:string}};upstreamCode=String(parsed.error?.code||parsed.error?.type||"")}catch{}
  console.error("Heat sheet scan failed",response.status,upstreamCode||"unknown");
  const error=response.status===401?"OpenRouter authorization was rejected.":response.status===402?"Photo processing needs OpenRouter credits.":response.status===429?"Photo processing is temporarily rate limited. Try again in a minute.":"Photo processing failed.";
  return json({error,upstreamStatus:response.status,upstreamCode},502);
 }
 const payload=await response.json() as {choices?:Array<{message?:{content?:string|Array<{type?:string;text?:string}>}}>},messageContent=payload.choices?.[0]?.message?.content,outputText=typeof messageContent==="string"?messageContent:Array.isArray(messageContent)?messageContent.map(part=>part.text||"").join(""):"";
 if(!outputText)return json({error:"No readable rows were returned."},422);
 /* The document verdict travels with the rows. The client decides what to do
    with it — heat-check-import.ts owns that rule — so a page the model calls
    "other" is refused there, not silently here. */
 try{const parsed=JSON.parse(outputText) as {rows?:unknown[];document?:unknown};return json({rows:Array.isArray(parsed.rows)?parsed.rows:[],document:typeof parsed.document==="string"?parsed.document:"unknown"})}catch{return json({error:"The scan result could not be reviewed."},502)}
}
