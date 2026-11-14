"use client";

import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {lockPageScroll} from "@/src/lib/shared/scroll-lock";
import {scanGlancePhoto} from "@/src/lib/defects/scan-photo";
import {PAPER_MAX_PHOTOS,paperKind,paperListWords,paperPageLabel,paperScanHref} from "@/src/lib/scan/paper-kinds";
import {normalizePaperPages,paperAskWords,paperLeftOutWords,paperPagesWords,paperReadsAsWords,paperUnread,paperVerdict,paperWhereWords,type PaperChoice,type PaperPage,type PaperVerdict} from "@/src/lib/scan/paper-identify";
import {offerPaperPhotos,type HandedPhotos} from "@/src/lib/scan/paper-handoff";
import "./scan-paper.css";

/* SCAN PAPER: one door in front of the scanners.

   Take the photo, and the app works out which shop sheet it is, then opens
   THAT sheet's own scanner with the photos already in it. Nobody has to
   remember which button on which page reads which piece of paper.

   IT READS NOTHING AND FILES NOTHING. It asks one question of small copies of
   the photos and hands the originals on. What a row means, what gets ticked
   and what approving does are still each scanner's business.

   IT IS NOT A SECOND CHECK ON EVERY SCANNER. The sweep and heat scanners
   refuse a page that is not their sheet. The Down Sheet scanner has no such
   check, so for a Down Sheet the answer given here is the only one before a
   person reads the rows — see paper-identify.ts.

   EVERY RULE IS ASKED OF src/lib/scan: which sheets exist and what they are
   called, whether the pages agree, what picking a sheet would send and leave
   out, and where each sheet is read. No sheet is named in this file. The
   state here is the photos, what came back, and whether this page is being
   left.

   Drawn by two pages, which is why it lives here and brings its own
   stylesheet: the Defect Log's and the Down Sheet's modal styles are each
   loaded only on their own page. */

type SelectedPhoto={file:File;url:string;key:string};

type Props={
 /* The route this is drawn on, so a sheet read on this page opens in place
    and a sheet read on the other one is sent there. */
 here:string;
 onClose:()=>void;
 /* A sheet this page reads itself. The page closes this and opens its own
    scanner with the photos. */
 onHere:(handed:HandedPhotos)=>void;
};

type Looked={verdict:PaperVerdict;pages:PaperPage[];problem:string;batch:SelectedPhoto[]};

export default function ScanPaper({here,onClose,onHere}:Props){
 const router=useRouter();
 const [photos,setPhotos]=useState<SelectedPhoto[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [looked,setLooked]=useState<Looked|null>(null);
 /* Set once this page is being left, and never unset: the photos have been
    handed over and the move has started, so nothing here can call it back —
    CANCEL included, which is why CANCEL goes dead rather than pretending. */
 const [leaving,setLeaving]=useState("");
 const cameraRef=useRef<HTMLInputElement>(null),uploadRef=useRef<HTMLInputElement>(null),photosRef=useRef<SelectedPhoto[]>([]);
 /* CANCEL MEANS CANCEL. A look is a request that outlives the press that
    started it; without these two, closing the box while it said WORKING left
    the look running, and when the answer came back it opened a scanner and
    sent the full-size photos to be read — after the person had backed out.
    Closing aborts the request and anything already past it is ignored. */
 const open=useRef(true),request=useRef<AbortController|null>(null);

 useEffect(()=>{photosRef.current=photos},[photos]);
 useEffect(()=>{open.current=true;return()=>{open.current=false;request.current?.abort();photosRef.current.forEach(photo=>URL.revokeObjectURL(photo.url))}},[]);
 useEffect(()=>lockPageScroll("scan-paper-open"),[]);

 /* THE PHOTOS ARE FROZEN WHILE THE LOOK IS RUNNING, the rule the heat scanner
    learned: what comes back is about the photos the look was started with. */
 const addPhotos=(files:FileList|null)=>{
  if(!files||busy||leaving)return;
  const incoming=Array.from(files).filter(file=>["image/jpeg","image/png","image/webp"].includes(file.type));
  setPhotos(current=>{
   const available=Math.max(0,PAPER_MAX_PHOTOS-current.length),next=incoming.slice(0,available).map((file,index)=>({file,url:URL.createObjectURL(file),key:`${file.name}-${file.lastModified}-${index}-${Math.random()}`}));
   if(incoming.length>available)setError(`Use no more than ${PAPER_MAX_PHOTOS} photos.`);else setError("");
   return [...current,...next];
  });
  if(cameraRef.current)cameraRef.current.value="";
  if(uploadRef.current)uploadRef.current.value="";
 };
 const removePhoto=(key:string)=>busy||leaving?undefined:setPhotos(current=>{const removed=current.find(photo=>photo.key===key);if(removed)URL.revokeObjectURL(removed.url);return current.filter(photo=>photo.key!==key)});

 /* Hand the chosen pages to the scanner that reads them, with the count of
    pages held back so the scanner can say the batch is not all there.

    On this page that is a callback. On the other page the photos are left in
    memory for it and the router moves there without reloading the app, which
    is the only way they survive the trip. WHEN THAT MOVE FAILS — no signal for
    the page it has to fetch — the router itself falls back to an ordinary page
    load, and the scanner that opens says the photos were lost. That fallback
    is the router's, not this function's: `push` returns before the move
    happens, so the catch below only ever sees an address it refuses outright. */
 const send=(choice:PaperChoice,batch:SelectedPhoto[])=>{
  if(!open.current||leaving)return;
  const files=choice.send.map(page=>batch[page-1]?.file).filter((file):file is File=>Boolean(file));
  if(!files.length){setError("There is no page to send to that scanner.");return}
  if(paperKind(choice.kind).route===here){onHere({kind:choice.kind,files,expected:files.length,leftOut:choice.leftOut.length});return}
  const href=paperScanHref(choice.kind,files.length);
  setLeaving(paperPageLabel(choice.kind));
  offerPaperPhotos(choice.kind,files,choice.leftOut.length);
  try{router.push(href)}catch{window.location.assign(href)}
 };

 const look=async()=>{
  if(!photos.length||busy||leaving)return;
  const batch=photos,asking=new AbortController();
  request.current=asking;
  setBusy(true);setError("");
  let verdict:PaperVerdict,pages:PaperPage[],problem="";
  try{
   const form=new FormData();
   for(let index=0;index<batch.length;index++)form.append("photos",await scanGlancePhoto(batch[index].file,index+1));
   const response=await fetch("/api/scan-identify",{method:"POST",body:form,signal:asking.signal});
   let payload:{pages?:unknown[];error?:string}={};
   try{payload=(await response.json() as typeof payload)||{}}catch{}
   if(!response.ok)throw new Error(payload.error||"the reader did not answer");
   pages=normalizePaperPages(payload,batch.length);
   verdict=paperVerdict(pages);
  }catch(reason){
   /* No first look is not a dead end: the person knows what they are
      holding. They are asked, and the scanner they pick reports its own
      trouble if the trouble is still there. A dropped connection is said as
      one — the browser's own words for it are "Failed to fetch". */
   problem=reason instanceof TypeError?"no connection to the reader":reason instanceof Error?reason.message:"";
   pages=normalizePaperPages(null,batch.length);
   verdict=paperUnread(batch.length);
  }
  /* Closed while it was working: nothing that came back is acted on. */
  if(!open.current||asking.signal.aborted)return;
  setBusy(false);
  /* Every page agrees and this page reads that sheet: straight through. */
  if(verdict.decided&&paperKind(verdict.choice.kind).route===here){send(verdict.choice,batch);return}
  setLooked({verdict,pages,problem,batch});
 };

 const total=looked?.batch.length||0;
 /* Which pages a choice takes, said whenever there is more than one page —
    including when it takes all of them, because a page the reader could not
    place goes along and the person should see that it does. */
 const pagesNote=(choice:PaperChoice)=>total>1?paperPagesWords(choice.send)+" · ":"";

 return <div className="paper-shade" role="dialog" aria-modal="true" aria-labelledby="scan-paper-title">
  <section className="paper-modal">
   <div className="paper-head"><div><span>PHOTO IMPORT</span><h2 id="scan-paper-title">SCAN PAPER</h2></div><button type="button" onClick={onClose} disabled={Boolean(leaving)} aria-label="Close">×</button></div>
   <div className="paper-body">
    {!looked&&<>
     <div className="paper-intro"><b>PHOTOGRAPH ANY SHOP SHEET — UP TO {PAPER_MAX_PHOTOS} PAGES OF THE SAME ONE</b><span>{paperListWords()}. The app works out which it is and opens that sheet&apos;s own scanner with your photos in it. Photos are sent for processing only after you press Read Sheet, and nothing is filed or changed until you have reviewed and approved it there.</span></div>
     <div className="paper-pickers">
      <button type="button" disabled={busy} onClick={()=>cameraRef.current?.click()}>📷 TAKE PHOTO</button>
      <button type="button" disabled={busy} onClick={()=>uploadRef.current?.click()}>⇧ UPLOAD FILE</button>
      <input ref={cameraRef} className="paper-file-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event=>addPhotos(event.target.files)}/>
      <input ref={uploadRef} className="paper-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={event=>addPhotos(event.target.files)}/>
     </div>
     <div className="paper-previews">{photos.map((photo,index)=><figure key={photo.key}><img src={photo.url} alt={`Selected page ${index+1}`}/><figcaption>PAGE {index+1}<button type="button" disabled={busy} onClick={()=>removePhoto(photo.key)}>REMOVE</button></figcaption></figure>)}</div>
     <button className="paper-read" type="button" onClick={look} disabled={!photos.length||busy}>{busy?"WORKING OUT WHICH SHEET THIS IS…":"READ SHEET"}</button>
    </>}

    {looked&&looked.verdict.decided&&<>
     <div className="paper-found"><b>{paperReadsAsWords(looked.verdict.choice.kind)}</b><span>It is read on the {paperPageLabel(looked.verdict.choice.kind)} page, where what it changes is saved and can be undone. Opening it leaves this page and takes your photo{total===1?"":"s"} along.</span></div>
     <button className="paper-read" type="button" disabled={Boolean(leaving)} onClick={()=>looked.verdict.decided&&send(looked.verdict.choice,looked.batch)}>{leaving?`OPENING THE ${leaving}…`:`OPEN IT ON THE ${paperPageLabel(looked.verdict.choice.kind)}`}</button>
    </>}

    {looked&&!looked.verdict.decided&&<>
     <div className="paper-ask"><b>WHICH SHEET IS THIS?</b><span>{paperAskWords(looked.verdict,looked.pages,looked.problem)}</span></div>
     <div className="paper-choices">{looked.verdict.choices.map(choice=><button type="button" key={choice.kind} disabled={Boolean(leaving)} onClick={()=>send(choice,looked.batch)}>
      <b>{paperKind(choice.kind).label}</b>
      <small>{pagesNote(choice)}{paperWhereWords(choice.kind,here)}</small>
      {paperLeftOutWords(choice)&&<em>{paperLeftOutWords(choice)}</em>}
     </button>)}</div>
     {leaving&&<p className="paper-leaving" role="status">OPENING THE {leaving}…</p>}
    </>}

    {looked&&!leaving&&<button className="paper-back" type="button" onClick={()=>{setLooked(null);setError("")}}>CHANGE PHOTOS</button>}
    {error&&<p className="paper-error" role="alert">{error}</p>}
   </div>
   <div className="paper-actions"><button type="button" onClick={onClose} disabled={Boolean(leaving)}>CANCEL</button></div>
  </section>
 </div>;
}
