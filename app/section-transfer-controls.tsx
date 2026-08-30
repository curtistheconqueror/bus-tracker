"use client";
import {useRef,useState} from "react";
import {readTransferPayload,transferFilename,TRANSFER_KINDS,type TransferKind,type TransferPayload} from "./section-transfer";

/* One pair of buttons, used by all three sections, so the Defect Log and the
   Down Sheet and the Fleet Map cannot end up with three different ideas of what
   importing means. Each page supplies only what its own section knows: how to
   build the payload, and what to do with one that arrives. */
export default function SectionTransferControls({kind,buildPayload,applyPayload}:{
 kind:TransferKind;
 buildPayload:()=>TransferPayload;
 applyPayload:(payload:TransferPayload)=>string;
}){
 const fileRef=useRef<HTMLInputElement|null>(null);
 const [status,setStatus]=useState("");
 const label=TRANSFER_KINDS[kind].label;

 const exportSection=async()=>{
  const payload=buildPayload(),filename=transferFilename(kind);
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  /* The share sheet is the whole point on a phone: it puts the file straight
     into a message or AirDrop rather than into a Downloads folder somebody then
     has to go find. Falls back to a download wherever it is unavailable. */
  try{
   const file=new File([blob],filename,{type:"application/json"});
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({title:"Pace South "+label,text:label+" exported "+new Date().toLocaleString(),files:[file]});
    setStatus("Sent.");
    return;
   }
  }catch(error){if(error instanceof DOMException&&error.name==="AbortError")return}
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
  setStatus("Saved as "+filename);
 };

 const importSection=async(event:React.ChangeEvent<HTMLInputElement>)=>{
  const input=event.currentTarget,file=input.files?.[0];
  input.value="";
  if(!file)return;
  const read=readTransferPayload(await file.text(),kind);
  if(!read.ok){setStatus("");alert(read.error);return}
  /* Named rather than counted, because "import 12 buses" reads like a number of
     records while the thing being asked is whether to let another device's work
     land on this one. */
  if(!confirm("Import this "+label+" from another device?\n\nRecords both devices have will take the incoming version. Anything only on this device is kept."))return;
  setStatus(applyPayload(read.payload));
 };

 return <div className="section-transfer">
  <button type="button" onClick={exportSection}>EXPORT {label.toUpperCase()}</button>
  <button type="button" onClick={()=>fileRef.current?.click()}>IMPORT {label.toUpperCase()}</button>
  <input ref={fileRef} type="file" accept="application/json,.json" onChange={importSection} hidden/>
  <small>Moves only the {label} between devices. Records both devices have take the incoming version; anything only here is kept.{status?" — "+status:""}</small>
 </div>;
}
