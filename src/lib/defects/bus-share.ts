import {defectLabel,type StructuredDefect} from "./repair-catalog.ts";
/* The same words the card on screen uses, because a shared list that says
   "offsite-3" reads as a typo to somebody who does not have the app open.
   Unknown slots stay blank rather than printing the raw id. */
import {knownLocationLabel as shareAreaLabel} from "../fleet/location-label.ts";
/* One string for whose garage this is — it was typed into four share modules. */
import {SITE_ORGANIZATION,SITE_ORGANIZATION_CAPS} from "../settings/site-identity.ts";

/* ONE BUS, EVERYTHING ON IT.

   Curtis: "I want this is per bus in case I wanna send somebody a picture or
   share all the defects with a bus quickly and efficiently."

   The drawer's share answers "which buses match this filter"; this answers
   "what is wrong with THIS bus", which is the question somebody asks when they
   are standing at it or being asked about it over the phone. Both offer the
   same two shapes — text to paste into a message, a page to look at — because
   they are the same errand at two sizes and a second idiom would be a second
   thing to learn.

   WHAT THE CALLER RESOLVES AND WHAT THIS DOES. The catalog wording is resolved
   HERE, through the same `defectLabel` the card draws with, so a catalog rename
   moves the share with the screen and cannot drift from it. The state wording
   and the two timestamps are passed IN, because the Defect Log already owns
   both — a second copy of its state table is exactly the duplication this
   project has paid for before.

   ONE LABEL PER DEFECT, NOT A CATEGORY AND THEN A LABEL. `defectLabel` already
   leads with the category, so prefixing it with `repairCategoryLabel` printed
   "Brakes — Brakes — Will not open". Caught by reading the real share text out
   of a browser rather than off the code. The card on screen shows both because
   they sit at different sizes and the eye reads them as heading and detail; a
   line in a text message has no such thing. */
export type BusShareBus={n:string;l?:string;status?:string};
export type BusShareDefect={
 defect:StructuredDefect;
 /* "OPEN", "DEFERRED", "FIXED" — the page's own wording, handed over. */
 state:string;
 logged:string;
 updated:string;
 /* Kept because it changes what the reader does: a defect already on the Down
    Sheet is somebody else's column, not a new job to raise. */
 onSheet?:boolean;
};

function busHeading(bus:BusShareBus){
 const area=shareAreaLabel(bus.l);
 return "Bus "+bus.n+[area,bus.status].filter(Boolean).map(part=>"  ·  "+part).join("");
}

function countLine(defects:BusShareDefect[]){
 return defects.length+" defect"+(defects.length===1?"":"s");
}

/* The two lines under a defect, in the order somebody reads them: what state it
   is in, then when it happened. `UPDATED` is dropped when it matches `LOGGED` —
   on a record nobody has touched since it was written the two are the same
   string, and printing it twice makes a short list look like a long one. */
function defectMeta(entry:BusShareDefect){
 const flags=[entry.state,entry.onSheet?"ON SHEET":""].filter(Boolean).join("  ·  ");
 const times="Logged "+entry.logged+(entry.updated&&entry.updated!==entry.logged?"  ·  Updated "+entry.updated:"");
 return [flags,times];
}

/* Plain text, for pasting into a message. Numbered the way the focus view
   numbers them, so somebody reading the message and somebody looking at the
   screen are pointing at the same thing when they say "number three". */
export function busShareText(bus:BusShareBus,defects:BusShareDefect[],stamp:string){
 const head=[busHeading(bus),countLine(defects)+" — shared "+stamp];
 if(!defects.length)return head.join("\n")+"\n\nNo defects on this bus.";
 return [head.join("\n"),...defects.map((entry,index)=>{
  const [flags,times]=defectMeta(entry);
  return [
   index+1+". "+defectLabel(entry.defect),
   "   "+flags,
   "   "+times,
  ].join("\n");
 })].join("\n\n");
}

function escapeHtml(value:string){
 return value.replace(/[&<>"']/g,character=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character] as string);
}

/* The same bus as a page.

   Everything inlined — no fonts, no scripts, no network — because this gets
   opened from a text message on a phone that may be standing in a garage with
   no signal, and a page that has to fetch something is a page that shows
   nothing. It is a file rather than a link for the same reason the drawer's is:
   nobody has to be given an account, and it still reads a year from now.

   Deliberately the drawer's stylesheet, down to the colours, so two shares that
   arrive in the same message thread look like they came from the same app. */
export function busShareHtml(bus:BusShareBus,defects:BusShareDefect[],stamp:string){
 const area=shareAreaLabel(bus.l);
 const cards=defects.length?defects.map((entry,index)=>{
  const [flags,times]=defectMeta(entry);
  return "<article><header><span class=\"i\">"+(index+1)+"</span>"+
   "<span class=\"d\">"+escapeHtml(defectLabel(entry.defect))+"</span></header>"+
   "<p class=\"f\">"+escapeHtml(flags)+"</p>"+
   "<p class=\"t\">"+escapeHtml(times)+"</p></article>";
 }).join(""):"<p class=\"empty\">No defects on this bus.</p>";
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"+
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
  "<title>Bus "+escapeHtml(bus.n)+" — "+SITE_ORGANIZATION+"</title><style>"+
  "*{box-sizing:border-box}body{margin:0;background:#eef2f9;color:#12244a;"+
  "font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:14px}"+
  "h1{margin:0;font-size:30px;font-weight:800}"+
  "header.top{background:#0a326e;color:#fff;margin:-14px -14px 14px;padding:16px 14px}"+
  "header.top small{display:block;font-size:11px;letter-spacing:1px;opacity:.8}"+
  "header.top b{display:block;margin-top:6px;font-size:12px;font-weight:400;opacity:.85}"+
  "article{background:#fff;border:1px solid #ccd7ea;border-left:5px solid #0867d5;border-radius:8px;"+
  "margin-bottom:11px;padding:11px 13px}"+
  "article header{display:flex;align-items:flex-start;gap:9px;margin-bottom:6px}"+
  ".i{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:#0b47a1;color:#fff;"+
  "font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}"+
  ".d{font-size:16px;font-weight:600}"+
  ".f{margin:0;font-size:11px;font-weight:800;letter-spacing:.6px;color:#1f7a44}"+
  ".t{margin:3px 0 0;font-size:11px;color:#5b6883}"+
  ".empty{background:#fff;border-radius:8px;padding:16px;text-align:center;color:#5b6883}"+
  "footer{margin-top:16px;font-size:11px;color:#5b6883;text-align:center}"+
  "</style></head><body><header class=\"top\"><small>"+SITE_ORGANIZATION_CAPS+" · DEFECT LOG</small>"+
  "<h1>Bus "+escapeHtml(bus.n)+"</h1>"+
  "<b>"+escapeHtml([area,bus.status,countLine(defects)].filter(Boolean).join("  ·  "))+"</b>"+
  "<b>"+escapeHtml(stamp)+"</b></header>"+cards+
  "<footer>Snapshot taken when this was shared. It does not update.</footer></body></html>";
}

/* THE DATE ON THE WALL CLOCK, NOT UTC. `toISOString()` is UTC, and this garage
   is five or six hours behind it: a bus shared at seven in the evening came out
   named with TOMORROW's date while the stamp inside the file said today. Two
   dates on one artifact, and the one in the filename is what somebody sorts by. */
export function busShareFilename(busNumber:string,now=new Date()){
 const slug=String(busNumber||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"bus";
 const pad=(value:number)=>String(value).padStart(2,"0");
 const day=now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate());
 return "pace-bus-"+slug+"-"+day+".html";
}
