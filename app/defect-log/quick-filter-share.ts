import {defectLabel} from "../repair-catalog.ts";
import {quickFilterDefects,quickFilterFallbackLabel,type QuickFilterBus,type QuickFilterKey} from "../quick-filters.ts";

export type QuickFilterShareBus=QuickFilterBus&{n:string;l?:string};

/* The same prefixes the Defect Log shows on a card. A list somebody reads on
   their phone in the yard is worth far more when it says where to walk. */
const AREA_LABELS:[string,string][]=[
 ["garage-","Main Garage"],["road-","On Road"],["west-","CNG West"],["east-","CNG East"],
 ["bay-","Shop Bay"],["service-","Service Detail"],["wall","Shop Wall"],["waiting-","Waiting Area"],
 ["offsite-","Off Property"],["paint-","Paint Booth"],["wash-","Wash Rack"],["body-","Body Shop"],
 ["pit-","Pit"],["brake-","Brake Test"],["tow-","Tow / Staging"],["office-","Foreman Office"],
];
export function shareAreaLabel(location:string|undefined){
 const at=String(location??"").trim();
 return at?AREA_LABELS.find(([prefix])=>at.startsWith(prefix))?.[1]||"":"";
}

/* One line per defect, with the exact duplicates collapsed.

   A repair photographed off the Down Sheet on three different days becomes
   three separate records, because each scan mints an id from the clock. When
   two of them carry the same wording, the shared list printed the same sentence
   twice and the person reading it has to work out whether that means two
   problems or one. It means one. */
function defectLines(bus:QuickFilterShareBus,key:QuickFilterKey){
 const defects=quickFilterDefects(bus,key);
 if(!defects.length)return [quickFilterFallbackLabel(key)];
 const seen=new Set<string>(),lines:string[]=[];
 for(const defect of defects){
  const line=defectLabel(defect).trim();
  const fingerprint=line.toLowerCase().replace(/\s+/g," ");
  if(!line||seen.has(fingerprint))continue;
  seen.add(fingerprint);
  lines.push(line);
 }
 return lines.length?lines:[quickFilterFallbackLabel(key)];
}

/* Plain text, for pasting into a message.

   A blank line between buses, because this gets read on a phone as a wall of
   text and the eye needs somewhere to land. The location goes on its own line
   under the number for the same reason: it is the thing somebody acts on. */
export function quickFilterShareText(label:string,buses:QuickFilterShareBus[],key:QuickFilterKey){
 const heading=label+" — "+buses.length+" bus"+(buses.length===1?"":"es");
 if(!buses.length)return heading+"\n\nNo buses currently match this filter.";
 return [heading,...buses.map(bus=>{
  const area=shareAreaLabel(bus.l);
  return ["Bus "+bus.n+(area?"  ·  "+area:""),...defectLines(bus,key).map(line=>"   "+line)].join("\n");
 })].join("\n\n");
}

function escapeHtml(value:string){
 return value.replace(/[&<>"']/g,character=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character] as string);
}

/* The same list as a page, so it opens looking like the cards in the app rather
   than a paragraph of text.

   Everything is inlined — no fonts, no scripts, no network — because this is
   opened from a text message on a phone that may be sitting in a garage with no
   signal, and a page that needs to fetch something is a page that shows nothing.
   It is also why this is a file rather than a link: nobody has to be given an
   account, and it still reads a year from now. */
export function quickFilterShareHtml(label:string,buses:QuickFilterShareBus[],key:QuickFilterKey,stamp:string){
 const cards=buses.length?buses.map(bus=>{
  const area=shareAreaLabel(bus.l);
  const lines=defectLines(bus,key).map(line=>"<li>"+escapeHtml(line)+"</li>").join("");
  return "<article><header><span class=\"n\">"+escapeHtml(bus.n)+"</span>"+
   (area?"<span class=\"a\">"+escapeHtml(area)+"</span>":"")+"</header><ul>"+lines+"</ul></article>";
 }).join(""):"<p class=\"empty\">No buses currently match this filter.</p>";
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"+
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
  "<title>"+escapeHtml(label)+" — Pace South</title><style>"+
  "*{box-sizing:border-box}body{margin:0;background:#eef2f9;color:#12244a;"+
  "font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:14px}"+
  "h1{margin:0;font-size:19px}header.top{background:#0a326e;color:#fff;margin:-14px -14px 14px;padding:16px 14px}"+
  "header.top small{display:block;font-size:11px;letter-spacing:1px;opacity:.8}"+
  "header.top b{display:block;margin-top:6px;font-size:12px;font-weight:400;opacity:.85}"+
  "article{background:#fff;border:1px solid #ccd7ea;border-left:5px solid #0867d5;border-radius:8px;"+
  "margin-bottom:11px;padding:11px 13px}"+
  "article header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:6px}"+
  ".n{font-size:22px;font-weight:800;color:#0b47a1}"+
  ".a{font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#5b6883}"+
  "ul{margin:0;padding-left:18px}li{margin:3px 0}"+
  ".empty{background:#fff;border-radius:8px;padding:16px;text-align:center;color:#5b6883}"+
  "footer{margin-top:16px;font-size:11px;color:#5b6883;text-align:center}"+
  "</style></head><body><header class=\"top\"><small>PACE SOUTH · DEFECT LOG</small>"+
  "<h1>"+escapeHtml(label)+" — "+buses.length+" bus"+(buses.length===1?"":"es")+"</h1>"+
  "<b>"+escapeHtml(stamp)+"</b></header>"+cards+
  "<footer>Snapshot taken when this was shared. It does not update.</footer></body></html>";
}

export function quickFilterShareFilename(label:string,now=new Date()){
 const slug=label.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"filter";
 return "pace-"+slug+"-"+now.toISOString().slice(0,10)+".html";
}
