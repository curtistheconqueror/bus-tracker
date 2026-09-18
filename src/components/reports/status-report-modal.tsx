"use client";

/* SEND THE STATUS REPORT — tick what goes in it, read it, then send it.

   Curtis, on why this exists at all: a foreman with a clipboard was answering
   the superintendent almost as fast as he was. The numbers were never the
   problem; RETRIEVAL was. Four answers meant clicking between three surfaces
   while somebody stood waiting.

   "give me the choice to send either one before sending" — so the message is
   shown in full before it goes, and nothing is sent until a button is pressed.
   Nothing is worse than a report that leaves before you have read it.

   IT STARTED AS TWO FIXED VERSIONS AND THAT WAS THE WRONG SHAPE. Every audience
   wanted a different one and every difference came back here as a code change.
   Curtis: "can we have, like, maybe widen the user interface of it a little bit
   so we can include different things to check mark that I want included... So
   that way I could just pick what I want sent, and it'll auto format to that,
   period. I think that's the better way to do this instead of coming to you and
   getting coding every time I need it done."

   And the concrete case, which is the one that settles it: "when my
   superintendent sends that list out to his superiors, they don't need to know
   about mystery buses. and they don't need to know about inspection buses."
   The report has more than one reader and they are owed different documents. */

import {useEffect,useMemo,useState} from "react";
import {buildFleetStatusReport,normalizeStatusReportPick,statusReportText,DEFAULT_STATUS_REPORT_PICK,STATUS_REPORT_WIDTH,type StatusReportBus,type StatusReportEntry,type StatusReportPick} from "@/src/lib/reports/fleet-status-report";
import {statusReportPrintHtml} from "@/src/lib/reports/fleet-status-report-print";
import {buildFleetForecast,forecastTextLines,FORECAST_HEDGE} from "@/src/lib/reports/fleet-forecast";
import {readShiftSettings} from "@/src/lib/settings/shift-clock";
import {readSheetLedger} from "@/src/lib/down-sheet/sheet-ledger";

/* The selection is remembered, because the whole point of the include list is
   that the same person sends roughly the same report every morning. Making him
   re-tick six boxes daily would be a slower version of the thing it replaced.

   A per-device view-state key, like every other panel-open key in the app: it
   describes what this phone's owner sends, not anything about the fleet, so it
   never syncs and losing it costs one round of ticking. */
export const STATUS_REPORT_PICK_KEY="pace-status-report-picks-v1";

function readPick():StatusReportPick{
 try{return normalizeStatusReportPick(JSON.parse(localStorage.getItem(STATUS_REPORT_PICK_KEY)||"null"))}
 catch{return {...DEFAULT_STATUS_REPORT_PICK}}
}

/* Every switch on the list, in the order they are drawn, with the line under
   each that says what ticking it costs. Held as data rather than as ten copies
   of the same markup — the next one Curtis asks for is a row here. */
const SECTION_PICKS:{key:keyof StatusReportPick;label:string;hint:string}[]=[
 {key:"inspections",label:"Inspections",hint:"The count, and the line saying it is not inside the downed number."},
 {key:"roadCalls",label:"Roadcalls pending",hint:"Broke down, still in that status, and nobody has written it up."},
 {key:"mystery",label:"Mystery buses",hint:"On property with nothing on the sheet to explain it."},
 {key:"farebox",label:"Farebox",hint:"How many buses are carrying a farebox fault."},
 {key:"ventra",label:"Ventra",hint:"Counted apart from the CUBIC screens, not with them."},
 {key:"cubic",label:"CUBIC screens",hint:"BUS ER and MV ER — the two screens, by their own wording."},
 {key:"forecast",label:"Fleet forecast",hint:FORECAST_HEDGE+"."},
];

const DETAIL_PICKS:{key:keyof StatusReportPick;label:string;hint:string}[]=[
 {key:"numbers",label:"Bus numbers",hint:"Off, every section is a count and nothing else."},
 {key:"locations",label:"Locations",hint:"Where each one is standing. Needs bus numbers."},
 {key:"defects",label:"The specific repairs",hint:"Every open repair under its bus. Needs locations."},
];

export default function StatusReportModal({fleet,entries,title,close}:{
 fleet:StatusReportBus[];
 entries:StatusReportEntry[];
 title?:string;
 close:()=>void;
}){
 /* Read once, on mount rather than in the initial state, so a server render
    and the first client render agree. LocalStorage does not exist during the
    former and a hydration mismatch here would swap the whole list under the
    person's finger. */
 const [pick,setPick]=useState<StatusReportPick>(DEFAULT_STATUS_REPORT_PICK);
 const [status,setStatus]=useState("");
 useEffect(()=>{setPick(readPick())},[]);

 const set=(key:keyof StatusReportPick,value:boolean)=>{
  setStatus("");
  setPick(current=>{
   const next={...current,[key]:value};
   /* The three detail switches are a ladder, not three independent choices:
      locations under no bus numbers has nothing to hang off, and repairs under
      no locations is a list of repairs with no bus against them. Turning one
      off takes the ones below it; turning one on brings the ones above. That is
      enforced HERE rather than by disabling the controls, so a person can tick
      "the specific repairs" and get them, which is what they meant. */
   if(key==="numbers"&&!value){next.locations=false;next.defects=false}
   if(key==="locations"){if(value)next.numbers=true;else next.defects=false}
   if(key==="defects"&&value){next.numbers=true;next.locations=true}
   try{localStorage.setItem(STATUS_REPORT_PICK_KEY,JSON.stringify(next))}catch{/* a full device still gets its report */}
   return next;
  });
 };

 /* Built once per open, not per render: the stamp on the report is the moment
    it was produced, and a report whose own timestamp moved while somebody read
    it would be lying about when it was true. */
 const at=useMemo(()=>new Date().toISOString(),[]);
 const board=useMemo(()=>buildFleetStatusReport(fleet,entries,at),[fleet,entries,at]);
 /* The forecast is computed whether or not it is ticked, so the switch is
    instant and so the checkbox can say what it would report. It reads two
    device-local settings — the shop's hours and the swap ledger — and reads
    nothing else. */
 const forecast=useMemo(()=>{
  try{
   return buildFleetForecast(fleet as never,entries as never,{
    now:at,settings:readShiftSettings(localStorage),ledger:readSheetLedger(localStorage),downed:board.downed,
    /* The two queues standing right now, handed over rather than recomputed.
       The report already works both out and is tested on them, and a second
       answer to "is this bus on the sheet" is the drift the location-label
       rule exists to stop. */
    inspections:board.inspections,
    roadCallsPending:board.roadCallsPending.length,
   });
  }catch{return null}
 },[fleet,entries,at,board.downed,board.inspections,board.roadCallsPending]);
 const forecastLines=useMemo(()=>forecastTextLines(forecast,STATUS_REPORT_WIDTH),[forecast]);
 const text=useMemo(()=>statusReportText(board,{pick,title,forecast:forecastLines}),[board,pick,title,forecastLines]);

 /* navigator.share with TEXT rather than a file. That is the whole point of
    this version: it arrives as the message body, so it is readable on a locked
    phone without opening an attachment. Falls back to the clipboard on a
    desktop, which has no share sheet. */
 const sendText=async()=>{
  setStatus("");
  try{
   if(navigator.share){await navigator.share({text});setStatus("Sent.");return}
   await navigator.clipboard.writeText(text);
   setStatus("Copied. Paste it into a message or an email.");
  }catch(error){
   /* A share sheet the person dismissed is not a failure and must not be
      reported as one. */
   if(error instanceof Error&&error.name==="AbortError"){setStatus("");return}
   setStatus("Could not send it from here. Select the text above and copy it.");
  }
 };

 /* Printed through a same-document iframe. window.open would leave the app for
    Safari in standalone mode, which is the trapdoor this whole app avoids, and
    the print sheet needs to come up over the board. iOS Print offers Save to
    Files; a desktop offers Print to PDF. */
 const sendPdf=()=>{
  setStatus("");
  const frame=document.createElement("iframe");
  frame.setAttribute("aria-hidden","true");
  frame.style.cssText="position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0";
  document.body.appendChild(frame);
  const doc=frame.contentDocument;
  if(!doc){frame.remove();setStatus("Printing is not available on this device.");return}
  doc.open();doc.write(statusReportPrintHtml(board,{pick,title,forecast}));doc.close();
  const go=()=>{
   try{frame.contentWindow?.focus();frame.contentWindow?.print()}
   catch{setStatus("Printing is not available on this device.")}
   /* Removed on a delay rather than immediately: tearing the iframe out while
      the print sheet is still reading it gives a blank page. */
   window.setTimeout(()=>frame.remove(),60000);
  };
  if(frame.contentWindow?.document.readyState==="complete")go();else frame.onload=go;
 };

 const switches=(rows:{key:keyof StatusReportPick;label:string;hint:string}[])=>rows.map(row=>
  <label key={row.key} className="status-report-pick">
   <input type="checkbox" checked={pick[row.key]} onChange={event=>set(row.key,event.target.checked)}/>
   <span>{row.label}<small>{row.hint}</small></span>
  </label>
 );

 return <div className="shade status-report-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <section className="status-report-modal" role="dialog" aria-modal="true" aria-labelledby="status-report-title">
   <header className="status-report-head">
    <span><small>AFTER THE ROUND</small><h2 id="status-report-title">Fleet Status Report</h2></span>
    {/* A WORD, NOT A GLYPH, and real button chrome behind it.

        Curtis opened this to send a report and could not find the way out: "I
        don't see the X button clearly to close the page." Measured, the button
        was never missing — 40x40 and in view at every width, with the glyph
        itself at about 8.8:1 against the header. What was missing was any sign
        that it WAS a button. Its background was a 12% white wash on a dark navy
        gradient, which is very nearly no difference at all, so what a person
        actually saw was a bare × floating in the corner beside a large white
        title that pulls the eye straight past it.

        This is a read-and-dismiss surface rather than a dense editor, so a word
        costs nothing and removes the doubt entirely. */}
    <button type="button" className="status-report-close" onClick={close}>CLOSE</button>
   </header>

   {/* No "downed buses only" under the number. It repeated the heading back at
       the reader; "not counted above" under INSPECTIONS stays, because that one
       says something the heading does not.

       DOWNED IS NOT ON THE INCLUDE LIST and so it is not drawn as a switch: it
       is the question the report answers. Inspections sits beside it and
       disappears from the headline when it is unticked, so the modal shows the
       document rather than describing it. */}
   <div className="status-report-headline">
    <div><small>DOWNED BUSES</small><b>{board.downed}</b></div>
    {pick.inspections&&<div><small>INSPECTIONS</small><b>{board.inspections}</b><i>not counted above</i></div>}
   </div>

   <div className="status-report-picks">
    <fieldset>
     <legend>WHAT GOES IN IT</legend>
     {switches(SECTION_PICKS)}
    </fieldset>
    <fieldset>
     <legend>HOW MUCH OF IT</legend>
     {switches(DETAIL_PICKS)}
    </fieldset>
   </div>

   {/* Shown in full, before anything is sent. */}
   <pre className="status-report-preview" aria-label="The message that will be sent">{text}</pre>

   <div className="status-report-actions">
    <button type="button" className="status-report-send-text" onClick={sendText}>SEND AS A MESSAGE</button>
    <button type="button" className="status-report-send-pdf" onClick={sendPdf}>SEND AS A PDF</button>
   </div>
   <p className="status-report-note">{status||"A message arrives as text somebody can read on a locked phone. A PDF is the one to hand on or keep."}</p>
  </section>
 </div>;
}
