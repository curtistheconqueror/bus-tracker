"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {scanReadyPhoto} from "../scan-photo";
import {normalizeSweepRow,sweepFindings,sweepOkAgainstBoard,SWEEP_COLUMN_LABEL,SWEEP_ISSUE_CHOICES,type ScannedSweepRow,type SweepFinding,type SweepFleetBus,type SweepOkBus} from "./sweep-scan-import";

/* The farebox / Ventra sweep scanner.

   The same door as the Down Sheet scan — take a photo or upload one, read the
   pages, review what came back, approve — but approving here FILES DEFECTS
   onto buses. It never touches the Down Sheet, never closes anything, and
   never files a row the reviewer has not ticked. */

type SelectedPhoto={file:File;url:string;key:string};

type Props={
 fleet:SweepFleetBus[];
 onClose:()=>void;
 onFile:(findings:SweepFinding[])=>void;
};

const MAX_FILES=6;

export default function SweepScanner({fleet,onClose,onFile}:Props){
 const [photos,setPhotos]=useState<SelectedPhoto[]>([]);
 const [rows,setRows]=useState<ScannedSweepRow[]>([]);
 const [findings,setFindings]=useState<SweepFinding[]>([]);
 const [okAgainstBoard,setOkAgainstBoard]=useState<SweepOkBus[]>([]);
 const [read,setRead]=useState(false);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const cameraRef=useRef<HTMLInputElement>(null),uploadRef=useRef<HTMLInputElement>(null),photosRef=useRef<SelectedPhoto[]>([]);

 useEffect(()=>{photosRef.current=photos},[photos]);
 useEffect(()=>()=>photosRef.current.forEach(photo=>URL.revokeObjectURL(photo.url)),[]);
 const approved=useMemo(()=>findings.filter(finding=>finding.selected&&finding.fleetMatch==="matched"&&finding.busId),[findings]);
 const flagged=findings.filter(finding=>finding.fleetMatch!=="matched").length;
 const busesRead=useMemo(()=>new Set(rows.map(row=>row.busNumber).filter(Boolean)).size,[rows]);

 const addPhotos=(files:FileList|null)=>{
  if(!files)return;
  const incoming=Array.from(files).filter(file=>["image/jpeg","image/png","image/webp"].includes(file.type));
  setPhotos(current=>{
   const available=Math.max(0,MAX_FILES-current.length),next=incoming.slice(0,available).map((file,index)=>({file,url:URL.createObjectURL(file),key:`${file.name}-${file.lastModified}-${index}-${Math.random()}`}));
   if(incoming.length>available)setError(`Use no more than ${MAX_FILES} photos.`);else setError("");
   return [...current,...next];
  });
  if(cameraRef.current)cameraRef.current.value="";
  if(uploadRef.current)uploadRef.current.value="";
 };
 const removePhoto=(key:string)=>setPhotos(current=>{const removed=current.find(photo=>photo.key===key);if(removed)URL.revokeObjectURL(removed.url);return current.filter(photo=>photo.key!==key)});
 const updateFinding=(key:string,patch:Partial<SweepFinding>)=>setFindings(current=>current.map(finding=>finding.key===key?{...finding,...patch}:finding));

 const readSheets=async()=>{
  if(!photos.length)return;
  setBusy(true);setError("");
  try{
   const scanned:ScannedSweepRow[]=[];
   for(let index=0;index<photos.length;index++){
    setProgress(`READING PAGE ${index+1} OF ${photos.length}`);
    const prepared=await scanReadyPhoto(photos[index].file,index+1,"sweep-sheet-page"),form=new FormData();form.append("photos",prepared);
    const response=await fetch("/api/sweep-scan",{method:"POST",body:form});
    let payload:{rows?:unknown[];error?:string}={};
    try{payload=await response.json() as typeof payload}catch{}
    if(!response.ok){if(response.status===413)throw new Error(`Page ${index+1} is still too large. Retake it closer to the sheet.`);throw new Error(payload.error||`Page ${index+1} could not be processed.`)}
    scanned.push(...(Array.isArray(payload.rows)?payload.rows:[]).map(row=>normalizeSweepRow(row,index+1)));
   }
   setRows(scanned);
   setFindings(sweepFindings(scanned,fleet));
   setOkAgainstBoard(sweepOkAgainstBoard(scanned,fleet));
   setRead(true);
   if(!scanned.length)setError("No marked bus rows were found. Try a clearer photo, with the whole sheet in frame.");
  }catch(reason){setError(reason instanceof Error?reason.message:"The photos could not be processed.")}finally{setBusy(false);setProgress("")}
 };
 const approve=()=>{
  if(!approved.length){setError("Tick at least one fleet-matched finding.");return}
  if(!confirm(`File ${approved.length} finding${approved.length===1?"":"s"} as open defects on ${new Set(approved.map(finding=>finding.busId)).size} bus${new Set(approved.map(finding=>finding.busId)).size===1?"":"es"}?\n\nEach becomes a Tech Services record on the Defect Log with who checked and which page it came from. Nothing is closed, the Down Sheet is not touched, and UNDO LAST reverses it.`))return;
  onFile(approved);
 };
 const badge=(finding:SweepFinding)=>finding.fleetMatch==="duplicate"?"DUPLICATE FLEET NUMBER":finding.fleetMatch==="unknown"?"NOT IN FLEET":finding.alreadyOpen?"ALREADY ON BOARD":finding.confidence<.6?"LOW CONFIDENCE":"FLEET MATCH";

 return <div className="log-shade" role="dialog" aria-modal="true" aria-labelledby="sweep-title">
  <section className="sweep-modal">
   <header className="log-editor-head"><div><span>PHOTO IMPORT</span><h2 id="sweep-title">SCAN FAREBOX / VENTRA SWEEP</h2></div><div className="log-editor-header-actions"><button type="button" onClick={onClose} aria-label="Close">×</button></div></header>
   <div className="sweep-body">
    {!read&&<>
     <div className="sweep-intro"><b>ADD UP TO 6 PAGES — BOTH SHEET TYPES ARE FINE TOGETHER</b><span>The Ventra sheet and the farebox check-off sheet. A tick or dash is working, ER or X is a fault, blank means nobody looked. Photos are sent for processing only after you press Read Sheets, and nothing is filed until you approve it.</span></div>
     <div className="sweep-pickers">
      <button type="button" onClick={()=>cameraRef.current?.click()}>📷 TAKE PHOTO</button>
      <button type="button" onClick={()=>uploadRef.current?.click()}>⇧ UPLOAD FILE</button>
      <input ref={cameraRef} className="sweep-file-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event=>addPhotos(event.target.files)}/>
      <input ref={uploadRef} className="sweep-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>addPhotos(event.target.files)}/>
     </div>
     <div className="sweep-previews">{photos.map((photo,index)=><figure key={photo.key}><img src={photo.url} alt={`Selected page ${index+1}`}/><figcaption>PAGE {index+1}<button type="button" onClick={()=>removePhoto(photo.key)}>REMOVE</button></figcaption></figure>)}</div>
     <button className="sweep-read" type="button" onClick={readSheets} disabled={!photos.length||busy}>{busy?progress||"READING…":"READ SHEETS"}</button>
    </>}
    {read&&<>
     <div className="sweep-review-head"><div><b>REVIEW FINDINGS</b><span>{busesRead} bus{busesRead===1?"":"es"} read · {findings.length} finding{findings.length===1?"":"s"} · {approved.length} ready to file{flagged?` · ${flagged} flagged`:""}</span></div><button type="button" onClick={()=>{setRead(false);setRows([]);setFindings([]);setOkAgainstBoard([]);setError("")}}>CHANGE PHOTOS</button></div>
     {findings.length>0&&<div className="sweep-rows">{findings.map(finding=><article className={`sweep-row ${finding.fleetMatch}${finding.alreadyOpen?" already":""}`} key={finding.key}>
      <label className="sweep-select"><input type="checkbox" checked={finding.selected} disabled={finding.fleetMatch!=="matched"} onChange={event=>updateFinding(finding.key,{selected:event.target.checked})}/><span/></label>
      <div className="sweep-bus"><small>P{finding.pageNumber}{finding.initial?` · ${finding.initial}`:""}</small><b>{finding.busNumber||"NO BUS"}</b><em>{badge(finding)}</em></div>
      <label>ISSUE<select value={SWEEP_ISSUE_CHOICES.includes(finding.issue)?finding.issue:SWEEP_ISSUE_CHOICES[0]} onChange={event=>updateFinding(finding.key,{issue:event.target.value})}>{SWEEP_ISSUE_CHOICES.map(issue=><option key={issue}>{issue}</option>)}</select></label>
      <label>DETAILS<input value={finding.details} onChange={event=>updateFinding(finding.key,{details:event.target.value})} placeholder={finding.source==="note"?"":"Nothing written on the sheet"}/>{finding.reviewNote&&<small className="sweep-review-note">{finding.reviewNote}</small>}</label>
      <span className={`sweep-source${finding.source==="note"?" note":""}`} title={finding.source==="note"?"From a written note on the sheet":"From the "+SWEEP_COLUMN_LABEL[finding.source]+" column"}>{finding.source==="note"?"NOTE":SWEEP_COLUMN_LABEL[finding.source]}</span>
     </article>)}</div>}
     {!findings.length&&!error&&<p className="sweep-intro"><b>NO FAULTS ON THESE PAGES</b><span>Every marked bus reads as working. Nothing to file.</span></p>}
     {okAgainstBoard.length>0&&<section className="sweep-ok" aria-label="Sheet says OK, board says open">
      <header><span><b>SHEET SAYS OK · BOARD SAYS OPEN</b><small>Checked working on the sheet, still carrying an open record here.</small></span><strong>{okAgainstBoard.length} TO LOOK AT</strong></header>
      <p>Either the fault was fixed and never closed, or it comes and goes and the sweep caught a good day. Nothing here is closed for you — open the bus and decide.</p>
      <div>{okAgainstBoard.map(bus=><span key={bus.busId}><b>BUS {bus.busNumber}</b><small>{bus.openIssues.join(" · ")}</small></span>)}</div>
     </section>}
    </>}
    {error&&<p className="sweep-error" role="alert">{error}</p>}
   </div>
   <footer className="log-editor-actions"><button type="button" onClick={onClose}>CANCEL</button>{read&&findings.length>0&&<button className="save-repair" type="button" onClick={approve} disabled={!approved.length}>FILE APPROVED ({approved.length})</button>}</footer>
  </section>
 </div>;
}
