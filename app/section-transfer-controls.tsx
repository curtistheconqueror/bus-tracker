"use client";
import {useRef,useState} from "react";
import {shareOrDownloadFile,shareOutcomeLabel} from "./share-file";
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
     has to go find, and on iOS a download link is not a download at all. */
  setStatus(shareOutcomeLabel(await shareOrDownloadFile(blob,filename,"Pace South "+label),filename));
 };

 const importSection=async(event:React.ChangeEvent<HTMLInputElement>)=>{
  const input=event.currentTarget,file=input.files?.[0];
  input.value="";
  if(!file)return;
  const read=readTransferPayload(await file.text(),kind);
  if(!read.ok){setStatus("");alert(read.error);return}
  /* Named rather than counted, because "import 12 buses" reads like a number of
     records while the thing being asked is whether to let another device's work
     land on this one.

     The second line differs by section and has to. A Defect Log or Down Sheet
     file now carries the sender's tombstones, so importing one CAN take records
     off this device — and a prompt that still said "anything only on this device
     is kept" would be asking for consent to something other than what happens.
     A Fleet Map file carries no tombstones, because a bus is moved and never
     removed, so that promise is still true there and is still made. */
  const removalNote=TRANSFER_KINDS[kind].carriesRemovals
   ?"Records both devices have will take the incoming version, and records the other device REMOVED will be taken off this one. Anything else only on this device is kept."
   :"Records both devices have will take the incoming version. Anything only on this device is kept.";
  if(!confirm("Import this "+label+" from another device?\n\n"+removalNote))return;
  setStatus(applyPayload(read.payload));
 };

 return <div className="section-transfer">
  <button type="button" onClick={exportSection}>EXPORT {label.toUpperCase()}</button>
  <button type="button" onClick={()=>fileRef.current?.click()}>IMPORT {label.toUpperCase()}</button>
  <input ref={fileRef} type="file" accept="application/json,.json" onChange={importSection} hidden/>
  <small>Moves only the {label} between devices. Records both devices have take the incoming version; {TRANSFER_KINDS[kind].carriesRemovals?"records the other device removed are taken off here too, and anything else only here is kept":"anything only here is kept"}.{status?" — "+status:""}</small>
 </div>;
}
