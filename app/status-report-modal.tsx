"use client";

/* SEND THE STATUS REPORT — pick the version, then send it.

   Curtis, on why this exists at all: a foreman with a clipboard was answering
   the superintendent almost as fast as he was. The numbers were never the
   problem; RETRIEVAL was. Four answers meant clicking between three surfaces
   while somebody stood waiting.

   "give me the choice to send either one before sending" — so both versions are
   built, the message version is shown in full before it goes, and neither is
   sent until a button is pressed. Nothing is worse than a report that leaves
   before you have read it. */

import {useMemo,useState} from "react";
import {buildFleetStatusReport,statusReportCountsText,statusReportText,type StatusReportBus,type StatusReportEntry} from "./fleet-status-report";
import {statusReportPrintHtml} from "./fleet-status-report-print";

export default function StatusReportModal({fleet,entries,title,close}:{
 fleet:StatusReportBus[];
 entries:StatusReportEntry[];
 title?:string;
 close:()=>void;
}){
 const [includeDefects,setIncludeDefects]=useState(false);
 /* THE SHORT ONE, and it sits ABOVE the defects switch because it decides
    whether that switch means anything. Curtis: "I think its still too much
    info... place an option above that one with a check box that will just give
    the downed bus count, inspections, and a ROADCALLS PENDING." */
 const [countsOnly,setCountsOnly]=useState(false);
 const [status,setStatus]=useState("");
 /* Built once per open, not per render: the stamp on the report is the moment
    it was produced, and a report whose own timestamp moved while somebody read
    it would be lying about when it was true. */
 const at=useMemo(()=>new Date().toISOString(),[]);
 const board=useMemo(()=>buildFleetStatusReport(fleet,entries,at),[fleet,entries,at]);
 const text=useMemo(()=>countsOnly?statusReportCountsText(board,{title}):statusReportText(board,{includeDefects,title}),[board,countsOnly,includeDefects,title]);

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
  doc.open();doc.write(statusReportPrintHtml(board,{includeDefects:countsOnly?false:includeDefects,counts:countsOnly,title}));doc.close();
  const go=()=>{
   try{frame.contentWindow?.focus();frame.contentWindow?.print()}
   catch{setStatus("Printing is not available on this device.")}
   /* Removed on a delay rather than immediately: tearing the iframe out while
      the print sheet is still reading it gives a blank page. */
   window.setTimeout(()=>frame.remove(),60000);
  };
  if(frame.contentWindow?.document.readyState==="complete")go();else frame.onload=go;
 };

 return <div className="shade status-report-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <section className="status-report-modal" role="dialog" aria-modal="true" aria-labelledby="status-report-title">
   <header className="status-report-head">
    <span><small>AFTER THE ROUND</small><h2 id="status-report-title">Fleet Status Report</h2></span>
    <button type="button" onClick={close} aria-label="Close the status report">&times;</button>
   </header>

   {/* No "downed buses only" under the number. It repeated the heading back at
       the reader; "not counted above" under INSPECTIONS stays, because that one
       says something the heading does not. */}
   <div className="status-report-headline">
    <div><small>DOWNED BUSES</small><b>{board.downed}</b></div>
    <div><small>INSPECTIONS</small><b>{board.inspections}</b><i>not counted above</i></div>
   </div>

   <label className="status-report-defects">
    <input type="checkbox" checked={countsOnly} onChange={event=>{setCountsOnly(event.target.checked);setStatus("")}}/>
    <span>Counts only — no locations<small>Downed and inspections as numbers. Bus numbers for roadcalls pending and mystery buses, because those are the two somebody has to go and find.</small></span>
   </label>
   {/* Disabled rather than hidden while COUNTS ONLY is on: a switch that
       vanishes reads as a bug, and a person who ticked it needs to see that the
       other one is still there and still off. */}
   <label className={"status-report-defects"+(countsOnly?" unavailable":"")}>
    <input type="checkbox" checked={includeDefects&&!countsOnly} disabled={countsOnly} onChange={event=>setIncludeDefects(event.target.checked)}/>
    <span>Include the defects of each bus<small>{countsOnly?"Not used by the counts-only version — it carries no repair lines.":"Off by default — the short version is the one that gets read."}</small></span>
   </label>

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
