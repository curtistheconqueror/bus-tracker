import {defectLabel} from "./repair-catalog.ts";
/* One string for whose garage this is — it was typed into four share modules. */
import {SITE_ORGANIZATION,SITE_ORGANIZATION_CAPS} from "../settings/site-identity.ts";
import {quickFilterDefects,quickFilterFallbackLabel,type QuickFilterBus,type QuickFilterKey} from "./quick-filters.ts";
/* The same name the Defect Log shows on a card — now literally the same
   function, which is how a shared list learned to say Trouble Bay 12. A list
   somebody reads on their phone in the yard is worth far more when it says
   where to walk, and worth less than nothing when it names the wrong bay.

   Unknown slots stay blank here rather than printing the raw id: this text
   gets pasted into a message to somebody who may not have the app open at
   all, and "offsite-3" reads as a typo to them. */
import {knownLocationLabel as shareAreaLabel} from "../fleet/location-label.ts";
export {shareAreaLabel};

export type QuickFilterShareBus=QuickFilterBus&{n:string;l?:string};

/* LEAVING A BUS OUT OF WHAT GETS SHARED.

   Curtis, with the last 24 hours of his own reports open - six buses - and one
   he did not want to send: "there's no way to remove a bus from the list
   before sharing it ... It should only drop it from what gets shared, not
   delete the defect report itself. Make it easy to undo, and make sure the
   count badge updates."

   IT IS A PROPERTY OF THIS LOOK AT THIS LIST, NEVER OF A RECORD. The ids left
   out are held by the page while the drawer is open and nowhere else: not on
   the bus, not on the defect, not in storage. That is the rule the single-bus
   FOCUS share already follows for a swiped-away defect, and for the same
   reason - the Shop Cloud ships every field it has no column for, so a "leave
   this one out" flag on a record would reach every other phone in the shop
   and hide the bus on all of them. Nothing here can delete, close or change a
   defect, because nothing here is handed one to write.

   KEYED ON THE BUS ID, which is the one place in a share that is right. The
   id is device-local and means nothing off this device - and this never
   leaves the device, or even the page. A fleet number would be the legible
   key and the wrong one: two records can carry one number while a mistyped
   bus waits to be merged, and leaving one out must not take the other.

   A BUS LEFT OUT STAYS ON THE LIST AS A SLIM "LEFT OUT" ROW, WITH ITS OWN
   PUT BACK. It vanished at first, with one PUT BACK at the top for the last
   one, and a cold read found what that costs: the rows below slid up, so the
   next bus's LEAVE OUT landed under the finger that had just pressed one, and a
   double tap left out two; and once gone, nothing said WHICH bus was out. A row
   held in place keeps the list still, names the bus, and puts back the one
   meant rather than the last one pressed. Leaving out is `excludeFromFocusShare`
   in focus-share-scope.ts, the FOCUS share's own; putting one back is
   `restoreLeftOutBus` below.

   WHICH LISTS OFFER IT is here and not in the page. Defects Logged is the one
   Curtis asked about. Two of the others already carry row buttons that change
   real records - END DEFERRAL, and REMOVE on the recommended list, which
   takes a bus off that list for good - and a second, harmless "remove" beside
   those is how somebody presses the wrong one. Offering it elsewhere is a
   line here and a decision about those rows. */
const LEAVE_OUT_FILTERS:ReadonlySet<QuickFilterKey>=new Set<QuickFilterKey>(["logged"]);
export function quickFilterCanLeaveOut(key:QuickFilterKey|null|undefined):boolean{
 return !!key&&LEAVE_OUT_FILTERS.has(key);
}

export type QuickFilterShareScope<T>={
 /* What the three outputs carry, and the count says. */
 buses:T[];
 /* The buses on the list that were left out by hand - the very objects, in
    list order, so the drawer can draw a LEFT OUT row in each one's place. */
 out:T[];
 /* Every bus the filter and its window found. */
 total:number;
 /* Of those, how many were left out by hand. An id left out and then taken
    off the list by the window is not counted: it is not on the list to be
    missing from. */
 leftOut:number;
};
export function quickFilterShareScope<T extends {id?:string}>(listed:T[],leftOutIds:Iterable<string>=[]):QuickFilterShareScope<T>{
 /* An empty id is dropped from the set: a bus that has no id must never be
    matched by one, and "" is what a missing id reads as below. */
 const leftOut=new Set([...leftOutIds].map(String).filter(Boolean));
 const buses:T[]=[],out:T[]=[];
 for(const bus of listed)(leftOut.has(String(bus?.id||""))?out:buses).push(bus);
 return {buses,out,total:listed.length,leftOut:out.length};
}

/* PUT ONE BUS BACK, the one whose row was pressed. The same array comes back
   when that bus is not left out, so a stray press is not a re-render. */
export function restoreLeftOutBus(leftOutIds:string[],id:string):string[]{
 const clean=String(id||"");
 return clean&&leftOutIds.includes(clean)?leftOutIds.filter(other=>other!==clean):leftOutIds;
}

/* EVERY BUS LEFT OUT IS A REFUSAL, NOT A SHARE. With nothing to send the text
   reads "Defects Logged by CJ - 0 buses" and then "No buses currently match
   this filter." - which is false, and says a shift with six reports had none.
   The three outputs ask this first.

   A list that is empty because nothing MATCHED is not this: that sentence is
   then true, and it has always been shareable. */
export function quickFilterShareIsEmpty(scope:QuickFilterShareScope<unknown>):boolean{
 return scope.leftOut>0&&scope.buses.length===0;
}

/* One line per defect, with the exact duplicates collapsed.

   A repair photographed off the Down Sheet on three different days becomes
   three separate records, because each scan mints an id from the clock. When
   two of them carry the same wording, the shared list printed the same sentence
   twice and the person reading it has to work out whether that means two
   problems or one. It means one. */
/* How much of the window the shared list has to respect.

   `maxAgeMinutes` reaches `quickFilterDefects`, which is what keeps a snapshot
   headed "2ND SHIFT · SINCE 14:00" from printing a defect logged on Monday
   underneath a bus that qualified on something logged at 14:20. The window
   already decided which buses are in the list; without this it would stop at
   the bus and the lines would contradict the heading above them — and the
   heading is the only part of a pasted list a reader can check.

   `initials` rides along for the same reason: a list headed "Defects Logged by
   CJ" that prints somebody else's report is wrong in the one direction a
   shared list cannot afford. */
export type QuickFilterShareOptions={now?:string;maxAgeMinutes?:number|null;initials?:string};

function defectLines(bus:QuickFilterShareBus,key:QuickFilterKey,options:QuickFilterShareOptions={}){
 const defects=quickFilterDefects(bus,key,options.now||new Date().toISOString(),{maxAgeMinutes:options.maxAgeMinutes??null,initials:options.initials||""});
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
export function quickFilterShareText(label:string,buses:QuickFilterShareBus[],key:QuickFilterKey,options:QuickFilterShareOptions={}){
 const heading=label+" — "+buses.length+" bus"+(buses.length===1?"":"es");
 if(!buses.length)return heading+"\n\nNo buses currently match this filter.";
 return [heading,...buses.map(bus=>{
  const area=shareAreaLabel(bus.l);
  return ["Bus "+bus.n+(area?"  ·  "+area:""),...defectLines(bus,key,options).map(line=>"   "+line)].join("\n");
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
export function quickFilterShareHtml(label:string,buses:QuickFilterShareBus[],key:QuickFilterKey,stamp:string,options:QuickFilterShareOptions={}){
 const cards=buses.length?buses.map(bus=>{
  const area=shareAreaLabel(bus.l);
  const lines=defectLines(bus,key,options).map(line=>"<li>"+escapeHtml(line)+"</li>").join("");
  return "<article><header><span class=\"n\">"+escapeHtml(bus.n)+"</span>"+
   (area?"<span class=\"a\">"+escapeHtml(area)+"</span>":"")+"</header><ul>"+lines+"</ul></article>";
 }).join(""):"<p class=\"empty\">No buses currently match this filter.</p>";
 return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">"+
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"+
  "<title>"+escapeHtml(label)+" — "+SITE_ORGANIZATION+"</title><style>"+
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
  "</style></head><body><header class=\"top\"><small>"+SITE_ORGANIZATION_CAPS+" · DEFECT LOG</small>"+
  "<h1>"+escapeHtml(label)+" — "+buses.length+" bus"+(buses.length===1?"":"es")+"</h1>"+
  "<b>"+escapeHtml(stamp)+"</b></header>"+cards+
  "<footer>Snapshot taken when this was shared. It does not update.</footer></body></html>";
}

export function quickFilterShareFilename(label:string,now=new Date()){
 const slug=label.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"filter";
 return "pace-"+slug+"-"+now.toISOString().slice(0,10)+".html";
}
