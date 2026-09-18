import {downSheetEntryAgeDays,downSheetFilterLabel,type DownSheetFilterEntry,type DownSheetFilterKey} from "./down-sheet-filters.ts";
import {downSheetGroup,downSheetGroupLabel} from "./down-sheet-view.ts";
/* The same words the app says, from the same table. A shared list that invents
   its own name for Trouble Bay 12 is a list that sends somebody to the wrong
   bay, and five copies of that table have already existed in this repo. */
import {knownLocationLabel} from "../../src/lib/fleet/location-label.ts";

export type DownSheetShareEntry=DownSheetFilterEntry&{busNumber:string};

/* What is written about the bus, one line per repair.

   Exact duplicates are collapsed. A sheet photographed on three mornings mints
   a fresh record each time, and the same sentence printed twice reads to the
   person on the other end as two problems. It is one. */
export function downSheetShareLines(entry:DownSheetShareEntry){
 const seen=new Set<string>(),lines:string[]=[];
 for(const item of entry.repairItems||[]){
  const line=[item.repair||item.category,item.details].map(value=>String(value||"").trim()).filter(Boolean).join(" — ");
  const fingerprint=line.toLowerCase().replace(/\s+/g," ");
  if(!line||seen.has(fingerprint))continue;
  seen.add(fingerprint);
  lines.push(item.done?line+"  (done)":line);
 }
 if(lines.length)return lines;
 const fallback=[entry.repair,entry.customReason].map(value=>String(value||"").trim()).filter(Boolean).join(" — ");
 return [fallback||"No repair written on this row"];
}

/* The one-line summary under the bus number: where it is, who has it, how long
   it has been there. Each part is dropped when the sheet does not know it,
   rather than printed as a blank or an em dash — this is read on a phone by
   somebody who did not write it, and "Bus 17512 ·  ·  · " reads as a bug. */
export function downSheetShareContext(entry:DownSheetShareEntry,location:string,now=new Date().toISOString()){
 const age=downSheetEntryAgeDays(entry,now),days=age===null?null:Math.floor(age);
 return [
  knownLocationLabel(location)||downSheetGroupLabel(downSheetGroup(entry,location)),
  String(entry.assignedTo||"").trim()?(entry.assignmentType==="Vendor"?"Vendor: ":"")+String(entry.assignedTo).trim():"",
  entry.workflow&&entry.workflow!=="Scheduled"?String(entry.workflow):"",
  days===null?"":days<1?"Since today":days===1?"1 day":days+" days",
 ].filter(Boolean).join("  ·  ");
}

/* Plain text, for pasting into a message. A blank line between buses, because
   this is read on a phone as a wall of text and the eye needs somewhere to
   land. */
export function downSheetShareText(key:DownSheetFilterKey,entries:DownSheetShareEntry[],locations:Record<string,string>={},now=new Date().toISOString()){
 const label=downSheetFilterLabel(key);
 const heading="DOWN SHEET — "+label.toUpperCase()+"  ("+entries.length+" bus"+(entries.length===1?"":"es")+")";
 if(!entries.length)return heading+"\n\nNo buses on the sheet match this filter.";
 return [heading,...entries.map(entry=>{
  const context=downSheetShareContext(entry,locations[entry.busId||""]||"",now);
  return ["Bus "+entry.busNumber+(context?"\n   "+context:""),...downSheetShareLines(entry).map(line=>"   • "+line)].join("\n");
 })].join("\n\n");
}

function escapeHtml(value:string){
 return value.replace(/[&<>"']/g,character=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character] as string);
}

/* The same list as a page, styled like the Down Sheet rather than like the
   Defect Log's — the header band is this page's purple, so somebody holding
   both can tell which one they were sent.

   Everything is inlined: no fonts, no scripts, no network. This is opened from
   a text message on a phone that may be standing in a garage with no signal,
   and a page that has to fetch something is a page that shows nothing. */
export function downSheetShareHtml(key:DownSheetFilterKey,entries:DownSheetShareEntry[],locations:Record<string,string>,stamp:string,now=new Date().toISOString()){
 const label=downSheetFilterLabel(key);
 const cards=entries.length?entries.map(entry=>{
  const context=downSheetShareContext(entry,locations[entry.busId||""]||"",now);
  const lines=downSheetShareLines(entry).map(line=>"<li>"+escapeHtml(line)+"</li>").join("");
  return "<article><header><span class=\"n\">"+escapeHtml(entry.busNumber)+"</span>"+
   (context?"<span class=\"a\">"+escapeHtml(context)+"</span>":"")+"</header><ul>"+lines+"</ul></article>";
 }).join(""):"<p class=\"empty\">No buses on the sheet match this filter.</p>";
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"+
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
  "<title>"+escapeHtml(label)+" — Pace South Down Sheet</title><style>"+
  "*{box-sizing:border-box}body{margin:0;background:#eef2f9;color:#12244a;"+
  "font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:14px}"+
  "h1{margin:0;font-size:19px}header.top{background:#4a2a8c;color:#fff;margin:-14px -14px 14px;padding:16px 14px}"+
  "header.top small{display:block;font-size:11px;letter-spacing:1px;opacity:.8}"+
  "header.top b{display:block;margin-top:6px;font-size:12px;font-weight:400;opacity:.85}"+
  "article{background:#fff;border:1px solid #ccd7ea;border-left:5px solid #6b3fc4;border-radius:8px;"+
  "margin-bottom:11px;padding:11px 13px}"+
  "article header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}"+
  ".n{font-size:22px;font-weight:800;color:#4a2a8c}"+
  ".a{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#5b6883}"+
  "ul{margin:0;padding-left:18px}li{margin:3px 0}"+
  ".empty{background:#fff;border-radius:8px;padding:16px;text-align:center;color:#5b6883}"+
  "footer{margin-top:16px;font-size:11px;color:#5b6883;text-align:center}"+
  "</style></head><body><header class=\"top\"><small>PACE SOUTH · DOWN SHEET</small>"+
  "<h1>"+escapeHtml(label)+" — "+entries.length+" bus"+(entries.length===1?"":"es")+"</h1>"+
  "<b>"+escapeHtml(stamp)+"</b></header>"+cards+
  "<footer>Snapshot taken when this was shared. It does not update.</footer></body></html>";
}

export function downSheetShareFilename(key:DownSheetFilterKey,now=new Date()){
 const slug=downSheetFilterLabel(key).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"filter";
 return "pace-down-sheet-"+slug+"-"+now.toISOString().slice(0,10)+".html";
}
