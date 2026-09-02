export const runtime="edge";

/* Reads the shop's farebox and Ventra check-off sheets from photos.

   Same transport as the Down Sheet scan — one page per request, the same size
   limits, the same model, the same strict JSON answer — with a different
   description of the document. That description is where the accuracy comes
   from: the model is told which two sheets exist, what their columns are, and
   exactly what each kind of mark means. What a mark means is decided again on
   the client in sweep-scan-import.ts, so nothing here is trusted on its own. */

const MAX_FILES=6;
const MAX_BYTES=8*1024*1024;
const IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp"]);

function json(body:unknown,status=200){return Response.json(body,{status,headers:{"Cache-Control":"no-store"}})}

function arrayBufferToBase64(buffer:ArrayBuffer){
 const bytes=new Uint8Array(buffer);let binary="";
 for(let offset=0;offset<bytes.length;offset+=0x8000)binary+=String.fromCharCode(...bytes.subarray(offset,offset+0x8000));
 return btoa(binary);
}

const MARK={type:"string",enum:["ok","fault","blank","unclear"]};
const rowSchema={
 type:"object",additionalProperties:false,
 properties:{
  pageNumber:{type:"integer"},
  sheet:{type:"string",enum:["ventra","farebox","unknown"]},
  busNumber:{type:"string"},
  dt:MARK,mv:MARK,power:MARK,bills:MARK,coin:MARK,
  initial:{type:"string"},
  note:{type:"string"},
  confidence:{type:"number",minimum:0,maximum:1},
  reviewNote:{type:"string"},
 },
 required:["pageNumber","sheet","busNumber","dt","mv","power","bills","coin","initial","note","confidence","reviewNote"],
};

const INSTRUCTIONS=`Read the attached photos of the shop's hand-marked check-off sheets, in page order. There are exactly two kinds of sheet; tell them apart by the printed title.

SHEET 1 — "Make sure the Ventra is working". Columns per bus: Bus #, DT, MV. The grid repeats three times across the page (three column groups). DT and MV are the two Ventra devices on the bus.

SHEET 2 — "Fareboxes check off sheet". Columns per bus: Bus #, Farebox power, Bills Trans, Coin Mech, Initial. The grid repeats three times across the page. The Initial column is who checked the bus (two or three letters such as Cw, CJ, RL, BB, M) — it is never a mark and never a fault.

Return one row for every printed bus that has ANY mark, word, or note in its cells. Skip rows that are completely blank. On a Ventra sheet set power, bills and coin to "blank". On a farebox sheet set dt and mv to "blank".

WHAT A MARK MEANS — apply exactly:
- "ok": a tick, a check mark, the word OK, or a short horizontal dash. Some checkers tick with a dash; a dash is a check, not a fault. A long single stroke drawn across two cells is a check in both.
- "fault": ER, Er, E R, Bus ER, X, INOP, or a written fault in the cell.
- "blank": nothing in the cell. Blank means nobody checked it. It NEVER means working.
- "unclear": you cannot tell which of the above it is, or the mark is scribbled over. Say why in reviewNote and lower confidence.

WRITTEN WORDS — a phrase written across a row's cells (for example "coin off line", "says unlock won't lock", "blank screen", "coin bin missing", "farebox unlocked") is a fault. Copy the words verbatim into note. Set to "fault" every column those words describe (coin words → coin; bill words → bills; power words → power; a screen or lock fault describes the farebox as a whole → set power to "fault" only if the words say power). Leave other columns as marked or blank.

HANDWRITTEN ADDITIONS — a bus number written by hand outside the printed grid (at the bottom, in a margin, in red) is a real row; return it. A note at the foot of a sheet that begins with a bus number (for example "15506 coin off line") belongs to that bus: return a row for that bus with the note and the described column set to "fault", sheet "farebox".

Bus numbers are five digits. Never invent a bus, a mark, or a fault. When in doubt between "ok" and "fault", answer "unclear" rather than guess.`;

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
 const content:Record<string,unknown>[]=[{type:"text",text:INSTRUCTIONS}];
 for(const image of images){content.push({type:"text",text:`PAGE ${image.page}`});content.push({type:"image_url",image_url:{url:image.imageUrl,detail:"high"}})}
 const response=await fetch("https://openrouter.ai/api/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json","HTTP-Referer":"https://pace-south-bus-tracker.curtistheconqueror.chatgpt.site","X-Title":"Fleet Maintenance Bus Tracker"},body:JSON.stringify({model:runtimeEnv.SWEEP_SCAN_MODEL||runtimeEnv.DOWN_SHEET_SCAN_MODEL||"google/gemini-2.5-flash",messages:[{role:"user",content}],response_format:{type:"json_schema",json_schema:{name:"sweep_sheet_scan",strict:true,schema:{type:"object",additionalProperties:false,properties:{rows:{type:"array",items:rowSchema}},required:["rows"]}}}})});
 if(!response.ok){
  const detail=await response.text();let upstreamCode="";
  try{const parsed=JSON.parse(detail) as {error?:{code?:string|number;type?:string}};upstreamCode=String(parsed.error?.code||parsed.error?.type||"")}catch{}
  console.error("Sweep sheet scan failed",response.status,upstreamCode||"unknown");
  const error=response.status===401?"OpenRouter authorization was rejected.":response.status===402?"Photo processing needs OpenRouter credits.":response.status===429?"Photo processing is temporarily rate limited. Try again in a minute.":"Photo processing failed.";
  return json({error,upstreamStatus:response.status,upstreamCode},502);
 }
 const payload=await response.json() as {choices?:Array<{message?:{content?:string|Array<{type?:string;text?:string}>}}>},messageContent=payload.choices?.[0]?.message?.content,outputText=typeof messageContent==="string"?messageContent:Array.isArray(messageContent)?messageContent.map(part=>part.text||"").join(""):"";
 if(!outputText)return json({error:"No readable rows were returned."},422);
 try{const parsed=JSON.parse(outputText) as {rows?:unknown[]};return json({rows:Array.isArray(parsed.rows)?parsed.rows:[]})}catch{return json({error:"The scan result could not be reviewed."},502)}
}
