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
const MAX_SCAN_BYTES=700*1024;

async function scanReadyPhoto(file:File,page:number){
 if(file.size<=MAX_SCAN_BYTES&&file.type==="image/jpeg")return file;
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const element=new Image();element.onload=()=>resolve(element);element.onerror=()=>reject(new Error("One selected photo could not be prepared."));element.src=url});
  const longest=Math.max(image.naturalWidth,image.naturalHeight),scale=Math.min(1,2400/longest),canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext("2d");if(!context)throw new Error("One selected photo could not be prepared.");
  context.drawImage(image,0,0,canvas.width,canvas.height);
  let quality=.82,blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
  while(blob&&blob.size>MAX_SCAN_BYTES&&quality>.38){quality-=.07;blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality))}
  if(blob&&blob.size>MAX_SCAN_BYTES){const reduction=Math.min(.92,Math.sqrt(MAX_SCAN_BYTES/blob.size)*.9),width=Math.max(1,Math.round(canvas.width*reduction)),height=Math.max(1,Math.round(canvas.height*reduction)),smaller=document.createElement("canvas");smaller.width=width;smaller.height=height;const smallerContext=smaller.getContext("2d");if(!smallerContext)throw new Error("One selected photo could not be prepared.");smallerContext.drawImage(canvas,0,0,width,height);blob=await new Promise<Blob|null>(resolve=>smaller.toBlob(resolve,"image/jpeg",.72))}
  if(!blob)throw new Error("One selected photo could not be prepared.");
  return new File([blob],`down-sheet-page-${page}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
 }finally{URL.revokeObjectURL(url)}
}

export default function DownSheetScanner({fleet,defaultShift,onClose,onImport}:Props){
 const [photos,setPhotos]=useState<SelectedPhoto[]>([]);
 const [rows,setRows]=useState<ReviewedScanRow[]>([]);
 const [mode,setMode]=useState<ScanMode>("merge");
 const [busy,setBusy]=useState(false);
 const [progress,setProgress]=useState("");
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
   const scanned:ScannedDownSheetRow[]=[];
   for(let index=0;index<photos.length;index++){
    setProgress(`READING PAGE ${index+1} OF ${photos.length}`);
    const prepared=await scanReadyPhoto(photos[index].file,index+1),form=new FormData();form.append("photos",prepared);
    const response=await fetch("/api/down-sheet-scan",{method:"POST",body:form});
    let payload:{rows?:ScannedDownSheetRow[];error?:string}={};
    try{payload=await response.json() as typeof payload}catch{}
    if(!response.ok){if(response.status===413)throw new Error(`Page ${index+1} is still too large. Retake it closer to the sheet.`);throw new Error(payload.error||`Page ${index+1} could not be processed.`)}
    scanned.push(...(Array.isArray(payload.rows)?payload.rows:[]).map(row=>({...row,pageNumber:index+1})));
   }
   const reviewed=reviewScannedRows(scanned,fleet).map(row=>({...row,shift:row.shift||defaultShift}));
   setRows(reviewed);
   if(!reviewed.length)setError("No bus repair rows were found. Try a clearer photo.");
  }catch(reason){setError(reason instanceof Error?reason.message:"The photos could not be processed.")}finally{setBusy(false);setProgress("")}
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
     <button className="scan-read" type="button" onClick={readSheet} disabled={!photos.length||busy}>{busy?progress||"READING…":"READ SHEET"}</button>
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
