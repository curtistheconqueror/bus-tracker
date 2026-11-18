import {defectLabel,type StructuredDefect} from "./repair-catalog.ts";
/* The same words the card on screen uses, because a shared list that says
   "offsite-3" reads as a typo to somebody who does not have the app open.
   Unknown slots stay blank rather than printing the raw id. */
import {knownLocationLabel as shareAreaLabel} from "../fleet/location-label.ts";
/* One string for whose garage this is — it was typed into four share modules. */
import {SITE_ORGANIZATION,SITE_ORGANIZATION_CAPS} from "../settings/site-identity.ts";

/* WHAT GOT FIXED, AS A LIST SOMEBODY CAN SEND.

   Curtis: "where I can share it, the same share ways as we do defects. So any
   repairs I fixed in the past day or two."

   The Defect Log already shares two shapes — one bus with everything on it
   (`bus-share.ts`), and the buses a quick filter matched (`quick-filter-share.ts`).
   This is the third errand at the same size as the second: a window's worth of
   COMPLETED work, which is the thing a foreman is asked for at the end of a
   shift and had no way to send.

   THE WINDOW TRAVELS IN THE HEADING, which `time-window.ts` argues at length
   and this follows: a bare list of six repairs is not the same message as "six
   repairs in the last 24 hours", and the heading is the only part of a pasted
   list its reader can check. The caller resolves the window's words, because
   the page owns the clock and a second resolver here could disagree with the
   bar on screen.

   WHAT THE CALLER RESOLVES AND WHAT THIS DOES. The catalog wording is resolved
   HERE, through the same `defectLabel` the card draws with, so a catalog rename
   moves the share with the screen. The two timestamps are passed IN already
   formatted, the way `bus-share.ts` takes them, because Fixed Repairs owns its
   own date format and a second copy of it would drift from the cards. */
export type FixedShareRepair={
 defect:StructuredDefect;
 busNumber:string;
 location?:string;
 /* The page's own wording for when it was finished and when it was reported. */
 fixed:string;
 logged:string;
};

/* A REPAIR WITH NO FIX DETAILS SAYS SO, rather than printing an empty line.

   The page already badges those cards NEEDS FIX DETAILS, and it is the most
   common thing wrong with this list: a repair closed in a hurry. A share that
   quietly omitted the line would read as a complete record to somebody who
   cannot see the badge, which is worse than admitting the gap. */
const NO_DETAILS="No fix details recorded.";

function repairHeading(repair:FixedShareRepair){
 const area=shareAreaLabel(repair.location);
 return "Bus "+repair.busNumber+(area?"  ·  "+area:"");
}

/* The credit-and-clock line, in the order somebody reads it: who, then when it
   was finished, then when it came in. `Logged` is dropped when it matches
   `Fixed` — on a repair logged and closed in one go the two are the same
   string, and printing it twice makes a short list look padded. */
function repairMeta(repair:FixedShareRepair){
 const by=String(repair.defect.completedBy||"").trim();
 return [by?"Fixed by "+by:"",
  repair.fixed?"Fixed "+repair.fixed:"",
  repair.logged&&repair.logged!==repair.fixed?"Logged "+repair.logged:""]
  .filter(Boolean).join("  ·  ");
}

function indent(value:string){
 return value.split("\n").map(line=>"   "+line.trimEnd()).join("\n");
}

function countLine(repairs:FixedShareRepair[]){
 return repairs.length+" repair"+(repairs.length===1?"":"s");
}

/* ONE HEADING FOR BOTH SHAPES, so a text message and the page that follows it
   do not describe the same list two different ways. `window` is "" for ALL,
   which is how every window module in this app spells "no window": a list with
   no window is just the list, and saying so would be noise. */
/* `scope` is EVERY filter that narrowed the list — the window, the category,
   the search — because the heading is the only part of a pasted list its reader
   can check, and one that names a window while a category silently halved the
   list is the failure this argues against. "" when nothing narrowed it. */
function heading(scope:string,repairs:FixedShareRepair[]){
 return ["Fixed Repairs",scope,countLine(repairs)].filter(Boolean).join(" — ");
}

/* Plain text, for pasting into a message. Numbered so somebody reading the
   message and somebody looking at the screen are pointing at the same thing
   when they say "number three". */
export function fixedShareText(repairs:FixedShareRepair[],window:string,stamp:string){
 const head=heading(window,repairs)+(stamp?"\n"+"Shared "+stamp:"");
 if(!repairs.length)return head+"\n\nNo repairs match this view.";
 return [head,...repairs.map((repair,index)=>{
  const meta=repairMeta(repair);
  return [
   index+1+". "+repairHeading(repair),
   "   "+defectLabel(repair.defect),
   /* EVERY LINE INDENTED, not just the first. `actionTaken` is a free-text
      textarea and goes in raw; indenting only the first line let a note
      containing its own numbered list mint a convincing entry. Measured by a
      cold read: a note holding "99. Bus 9999 ..." produced 62 entries under a
      heading saying 61, with a bus that does not exist. Malice is unlikely; a
      mechanic pasting a numbered list into the box is not, and this text goes
      to a superintendent. */
   indent(String(repair.defect.actionTaken||"").trim()||NO_DETAILS),
   ...(meta?["   "+meta]:[]),
  ].join("\n");
 })].join("\n\n");
}

function escapeHtml(value:string){
 return value.replace(/[&<>"']/g,character=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[character] as string);
}

/* The same list as a page.

   Everything inlined — no fonts, no scripts, no network — because this gets
   opened from a text message on a phone that may be standing in a garage with
   no signal, and a page that has to fetch something is a page that shows
   nothing. A file rather than a link for the reason the other two shares are
   files: nobody has to be given an account, and it still reads a year from now.

   `bus-share.ts`'s stylesheet, so three shares arriving in one message thread
   look like they came from the same app — with four deliberate differences, not
   the one an earlier version of this paragraph claimed: the left border and the
   number badge go green because this list is finished work, `.f` carries the
   fix text at 14px rather than bus-share's 11px green flag line, and `.b` is
   new because a repair needs its bus named where a bus share already has it in
   the title. */
export function fixedShareHtml(repairs:FixedShareRepair[],window:string,stamp:string){
 const cards=repairs.length?repairs.map((repair,index)=>{
  const meta=repairMeta(repair);
  return "<article><header><span class=\"i\">"+(index+1)+"</span>"+
   "<span class=\"d\">"+escapeHtml(defectLabel(repair.defect))+"</span></header>"+
   "<p class=\"b\">"+escapeHtml(repairHeading(repair))+"</p>"+
   "<p class=\"f\">"+escapeHtml(String(repair.defect.actionTaken||"").trim()||NO_DETAILS)+"</p>"+
   (meta?"<p class=\"t\">"+escapeHtml(meta)+"</p>":"")+"</article>";
 }).join(""):"<p class=\"empty\">No repairs match this view.</p>";
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"+
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
  "<title>Fixed Repairs — "+SITE_ORGANIZATION+"</title><style>"+
  "*{box-sizing:border-box}body{margin:0;background:#eef2f9;color:#12244a;"+
  "font:15px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:14px}"+
  "h1{margin:0;font-size:30px;font-weight:800}"+
  "header.top{background:#0a326e;color:#fff;margin:-14px -14px 14px;padding:16px 14px}"+
  "header.top small{display:block;font-size:11px;letter-spacing:1px;opacity:.8}"+
  "header.top b{display:block;margin-top:6px;font-size:12px;font-weight:400;opacity:.85}"+
  "article{background:#fff;border:1px solid #ccd7ea;border-left:5px solid #1f7a44;border-radius:8px;"+
  "margin-bottom:11px;padding:11px 13px}"+
  "article header{display:flex;align-items:flex-start;gap:9px;margin-bottom:6px}"+
  ".i{flex:0 0 auto;width:22px;height:22px;border-radius:50%;background:#1f7a44;color:#fff;"+
  "font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center}"+
  ".d{font-size:16px;font-weight:600}"+
  ".b{margin:0 0 4px;font-size:12px;font-weight:800;letter-spacing:.6px;color:#0b47a1}"+
  ".f{margin:0;font-size:14px}"+
  ".t{margin:4px 0 0;font-size:11px;color:#5b6883}"+
  ".empty{background:#fff;border-radius:8px;padding:16px;text-align:center;color:#5b6883}"+
  "footer{margin-top:16px;font-size:11px;color:#5b6883;text-align:center}"+
  "</style></head><body><header class=\"top\"><small>"+SITE_ORGANIZATION_CAPS+" · FIXED REPAIRS</small>"+
  "<h1>Fixed Repairs</h1>"+
  "<b>"+escapeHtml([window,countLine(repairs)].filter(Boolean).join("  ·  "))+"</b>"+
  (stamp?"<b>"+escapeHtml(stamp)+"</b>":"")+"</header>"+cards+
  "<footer>Snapshot taken when this was shared. It does not update.</footer></body></html>";
}

/* THE DATE ON THE WALL CLOCK, NOT UTC. `toISOString()` is UTC and this garage
   is five or six hours behind it: a list shared at seven in the evening came out
   named with TOMORROW's date while the stamp inside said today. Two dates on one
   artifact, and the one in the filename is what somebody sorts by.

   The WINDOW is in the name as well, because these get sent repeatedly and a
   folder of files all called the same thing is a folder nobody can use. */
export function fixedShareFilename(window:string,extension="html",now=new Date()){
 const pad=(value:number)=>String(value).padStart(2,"0");
 const day=now.getFullYear()+"-"+pad(now.getMonth()+1)+"-"+pad(now.getDate());
 const slug=String(window||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
 return ["pace-fixed-repairs",slug,day].filter(Boolean).join("-")+"."+extension;
}
