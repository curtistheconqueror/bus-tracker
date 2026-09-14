"use client";

/* SEND THE SCOREBOARD — pick the version, then send it.

   Curtis, on why this exists at all: a foreman with a clipboard was answering
   the superintendent almost as fast as he was. The numbers were never the
   problem; RETRIEVAL was. Four answers meant clicking between three surfaces
   while somebody stood waiting.

   "give me the choice to send either one before sending" — so both versions are
   built, the message version is shown in full before it goes, and neither is
   sent until a button is pressed. Nothing is worse than a report that leaves
   before you have read it. */

import {useMemo,useState} from "react";
import {buildScoreboard,scoreboardText,type ScoreboardBus,type ScoreboardEntry} from "./fleet-scoreboard";
import {scoreboardPrintHtml} from "./fleet-scoreboard-print";

export default function ScoreboardModal({fleet,entries,title,close}:{
 fleet:ScoreboardBus[];
 entries:ScoreboardEntry[];
 title?:string;
 close:()=>void;
}){
 const [includeDefects,setIncludeDefects]=useState(false);
 const [status,setStatus]=useState("");
 /* Built once per open, not per render: the stamp on the report is the moment
    it was produced, and a report whose own timestamp moved while somebody read
    it would be lying about when it was true. */
 const at=useMemo(()=>new Date().toISOString(),[]);
 const board=useMemo(()=>buildScoreboard(fleet,entries,at),[fleet,entries,at]);
 const text=useMemo(()=>scoreboardText(board,{includeDefects,title}),[board,includeDefects,title]);

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
  doc.open();doc.write(scoreboardPrintHtml(board,{includeDefects,title}));doc.close();
  const go=()=>{
   try{frame.contentWindow?.focus();frame.contentWindow?.print()}
   catch{setStatus("Printing is not available on this device.")}
   /* Removed on a delay rather than immediately: tearing the iframe out while
      the print sheet is still reading it gives a blank page. */
   window.setTimeout(()=>frame.remove(),60000);
  };
  if(frame.contentWindow?.document.readyState==="complete")go();else frame.onload=go;
 };

 return <div className="shade scoreboard-shade" onMouseDown={event=>{if(event.target===event.currentTarget)close()}}>
  <section className="scoreboard-modal" role="dialog" aria-modal="true" aria-labelledby="scoreboard-title">
   <header className="scoreboard-head">
    <span><small>AFTER THE ROUND</small><h2 id="scoreboard-title">Fleet Scoreboard</h2></span>
    <button type="button" onClick={close} aria-label="Close the scoreboard">&times;</button>
   </header>

   <div className="scoreboard-headline">
    <div><small>DOWNED BUSES</small><b>{board.downed}</b><i>downed buses only</i></div>
    <div><small>INSPECTIONS</small><b>{board.inspections}</b><i>not counted above</i></div>
   </div>

   <label className="scoreboard-defects">
    <input type="checkbox" checked={includeDefects} onChange={event=>setIncludeDefects(event.target.checked)}/>
    <span>Include the defects of each bus<small>Off by default — the short version is the one that gets read.</small></span>
   </label>

   {/* Shown in full, before anything is sent. */}
   <pre className="scoreboard-preview" aria-label="The message that will be sent">{text}</pre>

   <div className="scoreboard-actions">
    <button type="button" className="scoreboard-send-text" onClick={sendText}>SEND AS A MESSAGE</button>
    <button type="button" className="scoreboard-send-pdf" onClick={sendPdf}>SEND AS A PDF</button>
   </div>
   <p className="scoreboard-note">{status||"A message arrives as text somebody can read on a locked phone. A PDF is the one to hand on or keep."}</p>
  </section>
 </div>;
}
