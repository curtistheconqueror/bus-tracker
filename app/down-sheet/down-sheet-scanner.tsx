"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {REPAIR_OPTIONS} from "../repair-catalog";
import {mergeReviewedRows,reviewScannedRows,type ReviewedScanRow,type ScanFleetBus,type ScanImportRecord,type ScannedDownSheetRow} from "./down-sheet-scan-import";

type ScanMode="merge"|"replace";
type SelectedPhoto={file:File;url:string;key:string};

type Props={
 fleet:ScanFleetBus[];
 defaultShift:"1st"|"2nd"|"3rd";
 onClose:()=>void;
 onImport:(records:ScanImportRecord[],mode:ScanMode)=>void;
};

const MAX_FILES=6;

export default function DownSheetScanner({fleet,defaultShift,onClose,onImport}:Props){
 const [photos,setPhotos]=useState<SelectedPhoto[]>([]);
 const [rows,setRows]=useState<ReviewedScanRow[]>([]);
 const [mode,setMode]=useState<ScanMode>("merge");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const cameraRef=useRef<HTMLInputElement>(null),uploadRef=useRef<HTMLInputElement>(null),photosRef=useRef<SelectedPhoto[]>([]);

 useEffect(()=>{photosRef.current=photos},[photos]);
 useEffect(()=>()=>photosRef.current.forEach(photo=>URL.revokeObjectURL(photo.url)),[]);
 const imports=useMemo(()=>mergeReviewedRows(rows),[rows]);
 const flagged=rows.filter(row=>row.fleetMatch!=="matched").length;

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
  try{
   const form=new FormData();photos.forEach(photo=>form.append("photos",photo.file));
   const response=await fetch("/api/down-sheet-scan",{method:"POST",body:form}),payload=await response.json() as {rows?:ScannedDownSheetRow[];error?:string};
   if(!response.ok)throw new Error(payload.error||"The photos could not be processed.");
   const reviewed=reviewScannedRows(Array.isArray(payload.rows)?payload.rows:[],fleet).map(row=>({...row,shift:row.shift||defaultShift}));
   setRows(reviewed);
   if(!reviewed.length)setError("No bus repair rows were found. Try a clearer photo.");
  }catch(reason){setError(reason instanceof Error?reason.message:"The photos could not be processed.")}finally{setBusy(false)}
 };
 const approve=()=>{
  if(!imports.length){setError("Select at least one fleet-matched row.");return}
  const action=mode==="replace"?"replace the current Down Sheet with":"merge into the Down Sheet:";
  if(!confirm(`Import ${imports.length} bus${imports.length===1?"":"es"} and ${action}\n\n${mode==="replace"?"Current Down Sheet entries will be replaced. Bus locations will not move.":"Existing entries for the same bus will be updated."}`))return;
  onImport(imports,mode);
 };

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
     <button className="scan-read" type="button" onClick={readSheet} disabled={!photos.length||busy}>{busy?"READING…":"READ SHEET"}</button>
    </>}
    {rows.length>0&&<>
     <div className="scan-review-head"><div><b>REVIEW ROWS</b><span>{imports.length} bus{imports.length===1?"":"es"} ready{flagged?` · ${flagged} flagged`:""}</span></div><button type="button" onClick={()=>{setRows([]);setError("")}}>CHANGE PHOTOS</button></div>
     <div className="scan-rows">{rows.map(row=>{
      const repairs=REPAIR_OPTIONS[row.category]||REPAIR_OPTIONS.Miscellaneous;
      return <article className={`scan-row ${row.fleetMatch}`} key={row.key}>
       <label className="scan-select"><input type="checkbox" checked={row.selected} disabled={row.fleetMatch!=="matched"} onChange={event=>updateRow(row.key,{selected:event.target.checked})}/><span/></label>
       <div className="scan-bus"><small>P{row.pageNumber} · L{row.lineNumber||"?"}</small><b>{row.busNumber||"NO BUS"}</b><em>{row.fleetMatch==="matched"?row.repeatedCount>1?`${row.repeatedCount} ROWS · MERGED`:"FLEET MATCH":row.fleetMatch==="duplicate"?"DUPLICATE FLEET NUMBER":"NOT IN FLEET"}</em></div>
       <label className="scan-reason">REASON<input value={row.reason} onChange={event=>updateRow(row.key,{reason:event.target.value})}/>{row.reviewNote&&<small>{row.reviewNote}</small>}</label>
       <label>CATEGORY<select value={row.category in REPAIR_OPTIONS?row.category:"Miscellaneous"} onChange={event=>updateRow(row.key,{category:event.target.value,repair:REPAIR_OPTIONS[event.target.value][0]})}>{Object.keys(REPAIR_OPTIONS).map(category=><option key={category}>{category}</option>)}</select></label>
       <label>REPAIR<select value={repairs.includes(row.repair)?row.repair:repairs[0]} onChange={event=>updateRow(row.key,{repair:event.target.value})}>{repairs.map(repair=><option key={repair}>{repair}</option>)}</select></label>
       <label>MECHANIC / VENDOR<input value={row.assignedTo} onChange={event=>updateRow(row.key,{assignedTo:event.target.value})}/></label>
      </article>})}</div>
     <div className="scan-mode" role="group" aria-label="Import mode"><button type="button" className={mode==="merge"?"active":""} onClick={()=>setMode("merge")}>MERGE</button><button type="button" className={mode==="replace"?"active danger":""} onClick={()=>setMode("replace")}>REPLACE</button><span>{mode==="merge"?"Update matches and keep other rows.":"Replace the current Down Sheet. Locations stay put."}</span></div>
    </>}
    {error&&<p className="scan-error" role="alert">{error}</p>}
   </div>
   <footer className="repair-editor-actions"><button type="button" onClick={onClose}>CANCEL</button>{rows.length>0&&<button className="save-repair" type="button" onClick={approve} disabled={!imports.length}>IMPORT APPROVED ({imports.length})</button>}</footer>
  </section>
 </div>;
}
