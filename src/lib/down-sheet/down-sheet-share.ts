import {downSheetEntryAgeDays,downSheetFilterLabel,type DownSheetFilterEntry,type DownSheetFilterKey} from "./down-sheet-filters.ts";
/* One string for whose garage this is — it was typed into four share modules. */
import {SITE_ORGANIZATION,SITE_ORGANIZATION_CAPS} from "../settings/site-identity.ts";
import {downSheetGroup,downSheetGroupLabel} from "./down-sheet-view.ts";
/* The same words the app says, from the same table. A shared list that invents
   its own name for Trouble Bay 12 is a list that sends somebody to the wrong
   bay, and five copies of that table have already existed in this repo. */
import {knownLocationLabel} from "../fleet/location-label.ts";

export type DownSheetShareEntry=DownSheetFilterEntry&{busNumber:string};

/* WHAT ONE SHARE COVERS, and why the DECISION lives here rather than in the
   page. The bar sends exactly what is drawn, so the heading is a claim about
   the fleet made to somebody who cannot see the screen it came from. A cold
   read found the first version of this making that claim falsely in four
   different ways, so the rule now has one home: a route asking "what does
   this sheet's share cover" calls the same function the button does.

   THE SHEET IS NOT THE SAME THING AS WHAT IS DRAWN, which is the trap. The
   page hides IDOT-only rows from the bands unconditionally (`bandEntries`),
   on top of the search box, the shift filter, the road filter and FIXED
   TODAY. Measured before this was fixed: a sheet whose three rows were all
   IDOT drew "WHOLE SHEET — 0 of 3" and shared "The sheet is empty." with the
   three buses listed in the IDOT board on the same screen.

   So `dropped` is a COUNT COMPARISON rather than another flag. A list of
   inputs goes stale the moment somebody adds the next row filter; asking
   whether fewer rows were drawn than the sheet holds cannot. */
export type DownSheetShareScope=
 |{kind:"whole"}
 |{kind:"part"}
 |{kind:"with-completed"}
 |{kind:"filter";key:DownSheetFilterKey;narrowed:boolean};

export type DownSheetShareView={
 quickFilter:DownSheetFilterKey|null;
 /* Narrowings the page applies by hand. These cut `shown` itself, so they
    hold whether or not a quick filter is also on. */
 search:string;shiftFiltered:boolean;roadFiltered:boolean;fixedToday:boolean;
 /* SHOW COMPLETED does not hide rows, it ADDS finished ones - so it is not
    "part of" the sheet, and it is not the plain sheet either. It gets its own
    scope rather than being waved through: with it on, a sheet carrying one
    down bus and two repaired ones headed "WHOLE SHEET (3 buses)", which
    contradicts the page's own footer that the down count excludes completed
    repairs. */
 showCompleted:boolean;
 /* What the page DREW, against what the sheet holds before the bands drop
    anything. Only meaningful with no quick filter, because a filter is
    supposed to cut rows. */
 drawn:number;onSheet:number;
};

export function downSheetShareScope(view:DownSheetShareView):DownSheetShareScope{
 const byHand=Boolean(view.search.trim())||view.shiftFiltered||view.roadFiltered||view.fixedToday;
 if(view.quickFilter)return {kind:"filter",key:view.quickFilter,narrowed:byHand};
 if(byHand||view.drawn!==view.onSheet)return {kind:"part"};
 if(view.showCompleted)return {kind:"with-completed"};
 return {kind:"whole"};
}

export function downSheetShareScopeLabel(scope:DownSheetShareScope){
 switch(scope.kind){
  case "whole":return "Whole sheet";
  case "part":return "Part of the sheet";
  case "with-completed":return "Whole sheet plus completed";
  /* "Part of X" rather than "X", because a filtered list that a search has
     cut further still reads as the complete answer to that filter. */
  default:return (scope.narrowed?"Part of ":"")+downSheetFilterLabel(scope.key);
 }
}

/* Nothing to send reads differently in each case, and the wrong one here is a
   false statement about the fleet rather than a cosmetic slip. "The sheet is
   empty" over a view a search had narrowed would report a clear garage; "no
   buses match this filter" is equally false when buses do match and something
   else removed them. */
export function downSheetShareEmptyNote(scope:DownSheetShareScope){
 if(scope.kind==="whole"||scope.kind==="with-completed")return "The sheet is empty.";
 if(scope.kind==="part"||scope.narrowed)return "No buses in this view of the sheet.";
 return "No buses on the sheet match this filter.";
}

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
export function downSheetShareText(scope:DownSheetShareScope,entries:DownSheetShareEntry[],locations:Record<string,string>={},now=new Date().toISOString()){
 const label=downSheetShareScopeLabel(scope);
 const heading="DOWN SHEET — "+label.toUpperCase()+"  ("+entries.length+" bus"+(entries.length===1?"":"es")+")";
 if(!entries.length)return heading+"\n\n"+downSheetShareEmptyNote(scope);
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
export function downSheetShareHtml(scope:DownSheetShareScope,entries:DownSheetShareEntry[],locations:Record<string,string>,stamp:string,now=new Date().toISOString()){
 const label=downSheetShareScopeLabel(scope);
 const cards=entries.length?entries.map(entry=>{
  const context=downSheetShareContext(entry,locations[entry.busId||""]||"",now);
  const lines=downSheetShareLines(entry).map(line=>"<li>"+escapeHtml(line)+"</li>").join("");
  return "<article><header><span class=\"n\">"+escapeHtml(entry.busNumber)+"</span>"+
   (context?"<span class=\"a\">"+escapeHtml(context)+"</span>":"")+"</header><ul>"+lines+"</ul></article>";
 }).join(""):"<p class=\"empty\">"+escapeHtml(downSheetShareEmptyNote(scope))+"</p>";
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"+
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
  "<title>"+escapeHtml(label)+" — "+SITE_ORGANIZATION+" Down Sheet</title><style>"+
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
  "</style></head><body><header class=\"top\"><small>"+SITE_ORGANIZATION_CAPS+" · DOWN SHEET</small>"+
  "<h1>"+escapeHtml(label)+" — "+entries.length+" bus"+(entries.length===1?"":"es")+"</h1>"+
  "<b>"+escapeHtml(stamp)+"</b></header>"+cards+
  "<footer>Snapshot taken when this was shared. It does not update.</footer></body></html>";
}

export function downSheetShareFilename(scope:DownSheetShareScope,now=new Date()){
 const slug=downSheetShareScopeLabel(scope).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"filter";
 return "pace-down-sheet-"+slug+"-"+now.toISOString().slice(0,10)+".html";
}
