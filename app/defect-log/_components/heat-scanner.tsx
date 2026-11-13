"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {scanReadyPhoto} from "@/src/lib/defects/scan-photo";
import {SCAN_NOTES_LIMIT} from "@/src/lib/defects/scan-notes";
import {heatChecksFromFindings,heatOkHeldWhy} from "@/src/lib/defects/heat-check-log";
import {heatLoggable,heatLowConfidence,heatReviewGroups,heatScanReview,heatSummary,tickHeatFinding,type HeatFinding,type HeatFleetBus,type HeatScanPage,type HeatScanReview} from "@/src/lib/defects/heat-check-import";

/* The heat check sheet scanner.

   The same door as the sweep scanner beside it — take a photo or upload one,
   read the pages, review what came back, approve — and the same promise: it
   never touches the Down Sheet, never closes anything, and never files a row
   the reviewer has not ticked.

   What it adds is a second thing approving does. An N/R becomes a No Heat
   defect on its bus; every line the review accepts, OK included, is also
   written to the heat check log as somebody having checked that bus on that
   day.

   EVERY RULE IS ASKED OF heat-check-import.ts AND heat-check-log.ts: what a
   mark means, whether a page is a heat sheet at all, what happens to a page
   the scan is unsure of, whether a bus is already tagged, what may be ticked,
   and which lines count as a check. The state here is the photos, the answer
   that came back, and which boxes are ticked. An earlier version said this and
   then decided three of those in line; a cold read counted them. */

type SelectedPhoto={file:File;url:string;key:string};

type Props={
 fleet:HeatFleetBus[];
 onClose:()=>void;
 /* Every finding, with the reviewer's ticks, and the subset whose page was
    trusted. The page files and logs; this only asks. */
 onFile:(findings:HeatFinding[],loggable:HeatFinding[])=>void;
};

const MAX_FILES=6;

export default function HeatScanner({fleet,onClose,onFile}:Props){
 const [photos,setPhotos]=useState<SelectedPhoto[]>([]);
 const [findings,setFindings]=useState<HeatFinding[]>([]);
 const [held,setHeld]=useState<HeatScanReview["held"]>([]);
 const [read,setRead]=useState(false);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [notes,setNotes]=useState("");
 const cameraRef=useRef<HTMLInputElement>(null),uploadRef=useRef<HTMLInputElement>(null),photosRef=useRef<SelectedPhoto[]>([]);

 useEffect(()=>{photosRef.current=photos},[photos]);
 useEffect(()=>()=>photosRef.current.forEach(photo=>URL.revokeObjectURL(photo.url)),[]);

 const summary=useMemo(()=>heatSummary(findings),[findings]);
 const loggable=useMemo(()=>heatLoggable(findings,held),[findings,held]);
 /* How many lines approving will log, asked of the rule that will log them. */
 const logged=useMemo(()=>heatChecksFromFindings(loggable),[loggable]);
 const loggedBuses=useMemo(()=>new Set(logged.map(check=>check.busNumber)),[logged]);
 const {toFile,tagged,warm,disagree,look,struck}=useMemo(()=>heatReviewGroups(findings),[findings]);

 /* THE PHOTOS AND THE NOTES ARE FROZEN WHILE A READ IS RUNNING. `readSheets`
    works through the photos it was started with; swapping one out mid-read
    left the review showing a removed photo's lines under the new photo's
    picture, ready to approve. */
 const addPhotos=(files:FileList|null)=>{
  if(!files||busy)return;
  const incoming=Array.from(files).filter(file=>["image/jpeg","image/png","image/webp"].includes(file.type));
  setPhotos(current=>{
   const available=Math.max(0,MAX_FILES-current.length),next=incoming.slice(0,available).map((file,index)=>({file,url:URL.createObjectURL(file),key:`${file.name}-${file.lastModified}-${index}-${Math.random()}`}));
   if(incoming.length>available)setError(`Use no more than ${MAX_FILES} photos.`);else setError("");
   return [...current,...next];
  });
  if(cameraRef.current)cameraRef.current.value="";
  if(uploadRef.current)uploadRef.current.value="";
 };
 const removePhoto=(key:string)=>busy?undefined:setPhotos(current=>{const removed=current.find(photo=>photo.key===key);if(removed)URL.revokeObjectURL(removed.url);return current.filter(photo=>photo.key!==key)});

 const readSheets=async()=>{
  if(!photos.length||busy)return;
  setBusy(true);setError("");
  try{
   const pages:HeatScanPage[]=[];
   for(let index=0;index<photos.length;index++){
    setProgress(`READING PAGE ${index+1} OF ${photos.length}`);
    const prepared=await scanReadyPhoto(photos[index].file,index+1,"heat-sheet-page"),form=new FormData();form.append("photos",prepared);
    if(notes.trim())form.append("notes",notes.trim());
    const response=await fetch("/api/heat-sheet-scan",{method:"POST",body:form});
    let payload:{rows?:unknown[];document?:unknown;error?:string}={};
    try{payload=await response.json() as typeof payload}catch{}
    if(!response.ok){if(response.status===413)throw new Error(`Page ${index+1} is still too large. Retake it closer to the sheet.`);throw new Error(payload.error||`Page ${index+1} could not be processed.`)}
    pages.push({document:payload.document,rows:payload.rows});
   }
   const review=heatScanReview(pages,fleet);
   setFindings(review.findings);
   setHeld(review.held);
   setRead(true);
   if(review.held.length===photos.length&&review.held.every(item=>item.verdict==="not-a-heat-sheet"))setError("None of these photos is a heat check sheet, so nothing can be filed from them. A Vehicle Down Sheet goes through SCAN SHEET on the Down Sheet page, and a farebox or Ventra sheet through SCAN SWEEP.");
   else if(!review.findings.length)setError("No bus lines were found. Try a clearer photo, with the whole sheet in frame.");
  }catch(reason){setError(reason instanceof Error?reason.message:"The photos could not be processed.")}finally{setBusy(false);setProgress("")}
 };
 const approve=()=>{
  const files=summary.toFile,checks=logged.length;
  if(!files&&!checks){setError("There is nothing on these pages to file or to log.");return}
  const what=(files?`File ${files} No Heat defect${files===1?"":"s"} on the Defect Log`:"File no defects")+` and log ${checks} heat check${checks===1?"":"s"}?`;
  /* The way back is named only where there is one. A scan that files no
     defects leaves no batch for SCAN BATCHES to find, and the first version
     promised it anyway; what it does have is UNDO LAST, for as long as it is
     the last thing done. */
  const back=files?"Each defect is an ordinary open record on its bus — editable like one logged by hand. Nothing is closed and the Down Sheet is not touched. SCAN BATCHES takes the defects and the checks back out together.":"Nothing is filed on any bus and the Down Sheet is not touched. UNDO LAST takes these checks back out, until the next change on the Defect Log; after that a wrong check is corrected by the next check on that bus.";
  if(!confirm(what+"\n\n"+back))return;
  onFile(findings,loggable);
 };
 const meta=(finding:HeatFinding)=>["P"+finding.pageNumber,finding.written||"blank",finding.dateWritten,finding.initial].filter(Boolean).join(" · ");
 const reset=()=>{setRead(false);setFindings([]);setHeld([]);setError("")};
 const logNote=logged.length===1?"1 check will be logged":logged.length+" checks will be logged";

 return <div className="log-shade" role="dialog" aria-modal="true" aria-labelledby="heat-scan-title">
  <section className="sweep-modal heat-modal">
   <header className="log-editor-head"><div><span>PHOTO IMPORT</span><h2 id="heat-scan-title">SCAN HEAT SHEET</h2></div><div className="log-editor-header-actions"><button type="button" onClick={onClose} aria-label="Close">×</button></div></header>
   <div className="sweep-body">
    {!read&&<>
     <div className="sweep-intro"><b>ADD UP TO 6 PHOTOS OF THE HEAT CHECK SHEET</b><span>N/R is a bus that needs its heat repaired, OK is a bus with heat, and a blank line is a bus nobody has checked yet. Keep the whole sheet in frame, left edge included, so every bus number can be read. Photos are sent for processing only after you press Read Sheet, and nothing is filed until you approve it.</span></div>
     <div className="sweep-pickers">
      <button type="button" disabled={busy} onClick={()=>cameraRef.current?.click()}>📷 TAKE PHOTO</button>
      <button type="button" disabled={busy} onClick={()=>uploadRef.current?.click()}>⇧ UPLOAD FILE</button>
      <input ref={cameraRef} className="sweep-file-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event=>addPhotos(event.target.files)}/>
      <input ref={uploadRef} className="sweep-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>addPhotos(event.target.files)}/>
     </div>
     <div className="sweep-previews">{photos.map((photo,index)=><figure key={photo.key}><img src={photo.url} alt={`Selected page ${index+1}`}/><figcaption>PAGE {index+1}<button type="button" disabled={busy} onClick={()=>removePhoto(photo.key)}>REMOVE</button></figcaption></figure>)}</div>
     <label className="sweep-notes"><span><b>NOTES FOR THIS SCAN</b><small>{notes.length}/{SCAN_NOTES_LIMIT}</small></span><textarea value={notes} disabled={busy} maxLength={SCAN_NOTES_LIMIT} rows={3} onChange={event=>setNotes(event.target.value.slice(0,SCAN_NOTES_LIMIT))} placeholder="Anything the camera might get wrong. The second set of initials is MJ. The left column starts at 15500. A note can correct how a row is read, never add a bus that is not on the sheet."/></label>
     <button className="sweep-read" type="button" onClick={readSheets} disabled={!photos.length||busy}>{busy?progress||"READING…":"READ SHEET"}</button>
    </>}
    {read&&<>
     <div className="sweep-review-head"><div><b>REVIEW THE SHEET</b><span>{findings.length} line{findings.length===1?"":"s"} read · {summary.repair} N/R · {summary.ok} OK · {summary.notChecked} not checked · {summary.toFile} ready to file · {logNote}</span></div><button type="button" onClick={reset}>CHANGE PHOTOS</button></div>
     {held.filter(item=>item.verdict==="not-a-heat-sheet").map(item=><p className="sweep-error" role="alert" key={"held-"+item.page}>PAGE {item.page} IS NOT A HEAT CHECK SHEET. It reads as another document. Nothing from it is shown and nothing from it can be filed here.</p>)}
     {held.filter(item=>item.verdict==="unsure").map(item=><p className="sweep-warning" role="alert" key={"unsure-"+item.page}>PAGE {item.page} DOES NOT LOOK LIKE A HEAT CHECK SHEET. Most of what is written in its result column is neither OK nor N/R, so nothing from it is ticked and none of its lines are logged as checks. Tick a row only if you can see it on the paper.</p>)}

     {toFile.length>0&&<section className="heat-group" aria-label="New no-heat buses">
      <div className="heat-group-head"><b>NEW NO HEAT · {toFile.length}</b><small>N/R on the sheet, and nothing open for heat on the board. A ticked row becomes an open No Heat defect. Untick a row that is wrong and it is neither filed nor logged.</small></div>
      <div className="heat-rows">{toFile.map(finding=><label className={"heat-row"+(finding.heldBack?" held":"")} key={finding.key}>
       <input type="checkbox" checked={finding.selected} onChange={event=>setFindings(current=>tickHeatFinding(current,finding.key,event.target.checked))}/>
       <b>{finding.busNumber}</b>
       <span><small>{meta(finding)}</small>{heatLowConfidence(finding)&&<em>LOW CONFIDENCE — CHECK THE PAPER</em>}{finding.reviewNote&&<i>{finding.reviewNote}</i>}</span>
      </label>)}</div>
     </section>}

     {tagged.length>0&&<section className="heat-group quiet" aria-label="Already tagged no heat">
      <div className="heat-group-head"><b>ALREADY TAGGED · {tagged.length}</b><small>N/R on the sheet, and the board already has an open heat repair. No defect is added to these.</small></div>
      <div className="heat-chips">{tagged.map(finding=><span key={finding.key}><b>{finding.busNumber}</b><small>{finding.openHeat.join(" · ")}</small></span>)}</div>
     </section>}

     {warm.length>0&&<section className="heat-group quiet" aria-label="Buses with heat">
      <div className="heat-group-head"><b>HEAT OK · {warm.length}</b><small>OK on the sheet, and nothing open for heat on the board. Nothing is filed. Each one that is logged comes off the walking list, so a bus here that should not be is worth catching.</small></div>
      <div className="heat-chips">{warm.map(finding=><span className={loggedBuses.has(finding.busNumber)?"":"unlogged"} key={finding.key}><b>{finding.busNumber}</b><small>{meta(finding)}{loggedBuses.has(finding.busNumber)?"":" — NOT LOGGED: "+(heatOkHeldWhy(finding)||"its page is not trusted")}</small></span>)}</div>
     </section>}

     {disagree.length>0&&<section className="heat-group warn" aria-label="Sheet and board disagree">
      <div className="heat-group-head"><b>SHEET AND BOARD DISAGREE · {disagree.length}</b><small>The sheet says OK, or the row is struck through, and the board still holds an open heat repair. Nothing is closed for you — open the bus and decide.</small></div>
      <div className="heat-chips">{disagree.map(finding=><span key={finding.key}><b>{finding.busNumber}</b><small>{finding.struck?"struck through":"OK "+finding.dateWritten} · {finding.openHeat.join(" · ")}</small></span>)}</div>
     </section>}

     {look.length>0&&<section className="heat-group warn" aria-label="Rows to check against the paper">
      <div className="heat-group-head"><b>CHECK THESE AGAINST THE PAPER · {look.length}</b><small>These rows could not be used as read. Nothing is filed or logged from them.</small></div>
      <div className="heat-chips">{look.map(finding=><span key={finding.key}><b>{finding.busNumber||"NO BUS"}</b><small>{meta(finding)} — {finding.reviewNote}</small></span>)}</div>
     </section>}

     {struck.length>0&&<p className="heat-struck"><b>{struck.length} STRUCK-THROUGH ROW{struck.length===1?"":"S"}</b> — {struck.map(finding=>finding.busNumber).join(", ")}. Nothing is filed, closed or logged for a struck row.</p>}
     {!findings.length&&!error&&<p className="sweep-intro"><b>NOTHING WAS READ</b><span>No bus lines came back from these pages.</span></p>}
    </>}
    {error&&<p className="sweep-error" role="alert">{error}</p>}
   </div>
   <footer className="log-editor-actions"><button type="button" onClick={onClose}>CANCEL</button>{read&&findings.length>0&&<button className="save-repair" type="button" onClick={approve} disabled={!summary.toFile&&!logged.length}>{summary.toFile?`FILE ${summary.toFile} · LOG ${logged.length} CHECK${logged.length===1?"":"S"}`:`LOG ${logged.length} CHECK${logged.length===1?"":"S"}`}</button>}</footer>
  </section>
 </div>;
}
