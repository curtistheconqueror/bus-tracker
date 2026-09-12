"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {lockPageScroll} from "../scroll-lock";
import {REPAIR_OPTIONS,repairCategoryLabel} from "../repair-catalog";
import {describeLineGaps,isMarginRow,mergeReviewedRows,normalizedSection,reviewScannedRows,scannedLineGaps,type ReviewedScanRow,type ScanFleetBus,type ScanImportRecord,type ScannedDownSheetRow} from "./down-sheet-scan-import";
import {knownMechanicNames} from "./scan-spelling";
import {downSheetGroup,downSheetGroupLabel} from "./down-sheet-view";
import {scannedSheetRemovals,type ReplaceDownEntry} from "./down-sheet-replace";
import {scanReadyPhoto} from "../scan-photo";
import {readScanNotes,rememberScanNotes,SCAN_NOTES_KEY,SCAN_NOTES_LIMIT} from "../scan-notes";
import {writeSetting} from "../storage";

type SelectedPhoto={file:File;url:string;key:string};

type Props={
 fleet:ScanFleetBus[];
 currentEntries:ReplaceDownEntry[];
 defaultShift:"1st"|"2nd"|"3rd";
 onClose:()=>void;
 onImport:(records:ScanImportRecord[])=>void;
};

const MAX_FILES=6;
/* Below this the model is telling you it had to guess. Handwriting in the
   margins lands here; clean printed rows do not. */
const LOW_CONFIDENCE=0.75;

export default function DownSheetScanner({fleet,currentEntries,defaultShift,onClose,onImport}:Props){
 const [photos,setPhotos]=useState<SelectedPhoto[]>([]);
 const [rows,setRows]=useState<ReviewedScanRow[]>([]);
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 /* What the person holding the sheet knows the camera will get wrong — "line
    23 is 17565", "the margin name is Carlos". Sent with every page. Remembered
    on the device only when asked, so a one-off correction does not come back
    tomorrow as a standing instruction; the box starts with whatever was kept. */
 const [notes,setNotes]=useState("");
 const [keepNotes,setKeepNotes]=useState(false);
 const cameraRef=useRef<HTMLInputElement>(null),uploadRef=useRef<HTMLInputElement>(null),photosRef=useRef<SelectedPhoto[]>([]);

 useEffect(()=>{photosRef.current=photos},[photos]);
 useEffect(()=>()=>photosRef.current.forEach(photo=>URL.revokeObjectURL(photo.url)),[]);
 useEffect(()=>{const kept=readScanNotes(localStorage.getItem(SCAN_NOTES_KEY),"down-sheet");if(kept){setNotes(kept);setKeepNotes(true)}},[]);
 const imports=useMemo(()=>mergeReviewedRows(rows),[rows]);
 const comingOff=useMemo(()=>scannedSheetRemovals(currentEntries,imports.map(record=>record.busId)),[currentEntries,imports]);
 /* Two different doubts, and only one of them was ever shown.

    A row was flagged when its bus number matched no bus in the fleet. But a
    misread digit usually lands on ANOTHER REAL BUS — 17565 came back as 17563,
    which exists — so the row resolved cleanly and looked as certain as a
    printed line. Every row the 09/5 scan got wrong was pencilled into the
    margin, which is exactly where the model is least sure, and it said so in a
    confidence it was never asked for. */
 const flagged=rows.filter(row=>row.fleetMatch!=="matched"||row.confidence<LOW_CONFIDENCE).length;
 /* Which numbered lines never came back. The sheet numbers its rows, so a
    dropped one can be named exactly instead of being noticed a week later when
    the bus goes out broken. Blank lines are normal, so this reports rather
    than blocks. */
 const lineGaps=useMemo(()=>scannedLineGaps(rows),[rows]);

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
 const updateRow=(key:string,patch:Partial<ReviewedScanRow>)=>setRows(current=>current.map(row=>row.key===key?{...row,...patch}:row));
 const readSheet=async()=>{
  if(!photos.length)return;
  setBusy(true);setError("");
  writeSetting(localStorage,SCAN_NOTES_KEY,rememberScanNotes(localStorage.getItem(SCAN_NOTES_KEY),"down-sheet",notes,keepNotes));
  try{
   const scanned:ScannedDownSheetRow[]=[];
   for(let index=0;index<photos.length;index++){
    setProgress(`READING PAGE ${index+1} OF ${photos.length}`);
    const prepared=await scanReadyPhoto(photos[index].file,index+1,"down-sheet-page"),form=new FormData();form.append("photos",prepared);
    if(notes.trim())form.append("notes",notes.trim());
    const response=await fetch("/api/down-sheet-scan",{method:"POST",body:form});
    let payload:{rows?:ScannedDownSheetRow[];error?:string}={};
    try{payload=await response.json() as typeof payload}catch{}
    if(!response.ok){if(response.status===413)throw new Error(`Page ${index+1} is still too large. Retake it closer to the sheet.`);throw new Error(payload.error||`Page ${index+1} could not be processed.`)}
    scanned.push(...(Array.isArray(payload.rows)?payload.rows:[]).map(row=>({...row,pageNumber:index+1})));
   }
   /* The shop's own mechanics, read off the entries this device already holds.
      A fixed word list can turn TIROS into TIRES; only the shop's own history
      can turn CAROS back into CARLOS. */
   const reviewed=reviewScannedRows(scanned,fleet,knownMechanicNames(currentEntries)).map(row=>({...row,shift:row.shift||defaultShift}));
   setRows(reviewed);
   if(!reviewed.length)setError("No bus repair rows were found. Try a clearer photo.");
  }catch(reason){setError(reason instanceof Error?reason.message:"The photos could not be processed.")}finally{setBusy(false);setProgress("")}
 };
 const approve=()=>{
  if(!imports.length){setError("Select at least one fleet-matched row.");return}
  if(!confirm(`Replace the current Down Sheet with ${imports.length} reviewed bus${imports.length===1?"":"es"}?\n\n${comingOff.length} bus${comingOff.length===1?" is":"es are"} coming off the current sheet. Physical locations and saved defects will remain unchanged. Omitted inspections return to service according to their unresolved defects.`))return;
  onImport(imports);
 };

 /* Curtis: "I can't seem to move this page. It only moves what's behind the
    page." Nothing was holding the page still, so a drag scrolled the Down Sheet
    underneath the modal while the modal itself stayed put. Every other dialog
    in this app locks the page; this one was missed. */
 useEffect(()=>lockPageScroll("scan-sheet-open"),[]);
 return <div className="down-shade scan-shade" role="dialog" aria-modal="true" aria-labelledby="scan-title">
  <section className="scan-modal">
   <header className="repair-editor-head"><div><span>PHOTO IMPORT</span><h2 id="scan-title">SCAN SHEET</h2></div><button type="button" onClick={onClose} aria-label="Close">×</button></header>
   <div className="scan-body">
    {!rows.length&&<>
     <div className="scan-intro"><b>ADD UP TO 6 PAGES</b><span>Photos are sent for processing only after you press Read Sheet.</span></div>
     <div className="scan-pickers">
      <button type="button" onClick={()=>cameraRef.current?.click()}>📷 TAKE PHOTO</button>
      <button type="button" onClick={()=>uploadRef.current?.click()}>⇧ UPLOAD FILE</button>
      <input ref={cameraRef} className="scan-file-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event=>addPhotos(event.target.files)}/>
      <input ref={uploadRef} className="scan-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>addPhotos(event.target.files)}/>
     </div>
     <div className="scan-previews">{photos.map((photo,index)=><figure key={photo.key}><img src={photo.url} alt={`Selected page ${index+1}`}/><figcaption>PAGE {index+1}<button type="button" onClick={()=>removePhoto(photo.key)}>REMOVE</button></figcaption></figure>)}</div>
     <label className="scan-notes"><span><b>NOTES FOR THIS SCAN</b><small>{notes.length}/{SCAN_NOTES_LIMIT}</small></span><textarea value={notes} maxLength={SCAN_NOTES_LIMIT} rows={3} onChange={event=>setNotes(event.target.value.slice(0,SCAN_NOTES_LIMIT))} placeholder="Anything the camera might get wrong. Line 23 is 17565. The margin name is Carlos. TIROS means tires. A note can correct how a row is read, never add a bus that is not on the sheet."/></label>
     <label className="scan-notes-keep"><input type="checkbox" checked={keepNotes} onChange={event=>setKeepNotes(event.target.checked)}/><span>Keep these notes on this device for the next scan</span></label>
     <button className="scan-read" type="button" onClick={readSheet} disabled={!photos.length||busy}>{busy?progress||"READING…":"READ SHEET"}</button>
    </>}
    {rows.length>0&&<>
     <div className="scan-review-head"><div><b>REVIEW ROWS</b><span>{imports.length} bus{imports.length===1?"":"es"} ready{flagged?` · ${flagged} flagged`:""}</span></div><button type="button" onClick={()=>{setRows([]);setError("")}}>CHANGE PHOTOS</button></div>
     {lineGaps.length>0&&<p className="scan-line-gaps" role="status"><b>LINES NOT READ: {describeLineGaps(lineGaps)}</b><small>Blank lines on the sheet are normal. Check the paper for any of these that had a bus written on them &mdash; a row missed here does not reach the Down Sheet at all.</small></p>}
     <div className="scan-rows">{rows.map(row=>{
      const repairs=REPAIR_OPTIONS[row.category]||REPAIR_OPTIONS.Miscellaneous;
      /* Which band of the sheet this row is about to land in, shown before the
         import rather than discovered after it. It is read from the same two
         functions the sheet itself uses, so it cannot drift from where the bus
         actually ends up, and it follows MECHANIC / VENDOR as that field is
         typed — which is the field that decides scheduled from unscheduled. */
      const section=normalizedSection(row.section||row.reason);
      const band=downSheetGroup({busNumber:row.busNumber,category:row.category,repair:row.repair,customReason:row.reason,assignmentType:section==="Vendor Repair"?"Vendor":"Mechanic",assignedTo:row.assignedTo,section});
      const unsure=row.confidence<LOW_CONFIDENCE;
      return <article className={`scan-row ${row.fleetMatch}${unsure?" unsure":""}`} key={row.key}>
       <label className="scan-select"><input type="checkbox" checked={row.selected} disabled={row.fleetMatch!=="matched"} onChange={event=>updateRow(row.key,{selected:event.target.checked})}/><span/></label>
       <div className="scan-bus"><small>P{row.pageNumber} · {isMarginRow(row)?"MARGIN":"L"+row.lineNumber}</small><b>{row.busNumber||"NO BUS"}</b><em>{row.fleetMatch==="matched"?row.repeatedCount>1?`${row.repeatedCount} ROWS · MERGED`:"FLEET MATCH":row.fleetMatch==="duplicate"?"DUPLICATE FLEET NUMBER":"NOT IN FLEET"}</em>{unsure&&<u>CHECK THIS ROW &middot; {Math.round(row.confidence*100)}% SURE</u>}</div>
       <label className="scan-reason">REASON<input value={row.reason} onChange={event=>updateRow(row.key,{reason:event.target.value})}/>{row.reviewNote&&<small>{row.reviewNote}</small>}</label>
       <label>CATEGORY<select value={row.category in REPAIR_OPTIONS?row.category:"Miscellaneous"} onChange={event=>updateRow(row.key,{category:event.target.value,repair:REPAIR_OPTIONS[event.target.value][0]})}>{Object.keys(REPAIR_OPTIONS).map(category=><option value={category} key={category}>{repairCategoryLabel(category)}</option>)}</select></label>
       <label>REPAIR<select value={repairs.includes(row.repair)?row.repair:repairs[0]} onChange={event=>updateRow(row.key,{repair:event.target.value})}>{repairs.map(repair=><option key={repair}>{repair}</option>)}</select></label>
       <label>MECHANIC / VENDOR<input value={row.assignedTo} onChange={event=>updateRow(row.key,{assignedTo:event.target.value})}/></label>
       <p className={"scan-band group-"+band}>GOES TO <b>{downSheetGroupLabel(band)}</b></p>
      </article>})}</div>
     <section className="scan-replacement" aria-label="Buses coming off the Down Sheet">
      <header><span><b>AUTHORITATIVE REPLACEMENT</b><small>The reviewed photo becomes the current Down Sheet.</small></span><strong>{comingOff.length} COMING OFF</strong></header>
      {comingOff.length?<><p>These buses are on the current Down Sheet but absent from the reviewed photo. They will come off when you approve the import. Their saved defects and physical locations remain.</p><div>{comingOff.map(entry=><span key={entry.busId}><b>BUS {entry.busNumber}</b><small>{entry.section||"Down Sheet entry"}</small></span>)}</div></>:<p>No current Down Sheet buses are missing from the reviewed photo.</p>}
     </section>
    </>}
    {error&&<p className="scan-error" role="alert">{error}</p>}
   </div>
   <footer className="repair-editor-actions"><button type="button" onClick={onClose}>CANCEL</button>{rows.length>0&&<button className="save-repair" type="button" onClick={approve} disabled={!imports.length}>IMPORT APPROVED ({imports.length})</button>}</footer>
  </section>
 </div>;
}
