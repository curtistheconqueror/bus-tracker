"use client";

import {type ScanBatch,type ScanBatchUndo} from "./scan-batches";

/* Every scan sweep filed on this device, one press per row, and the way to take
   one back out.

   This exists because a Down Sheet photo went through SCAN SWEEP and 24 records
   landed that nothing on the log could point at. Each row here IS one press of
   FILE APPROVED — the records it filed share one time stamp — so the one that
   was a mistake can be named and removed without touching anything else. */

type Props={
 batches:ScanBatch[];
 undo:ScanBatchUndo|null;
 onRemove:(batch:ScanBatch)=>void;
 onRestore:()=>void;
 onClose:()=>void;
};

function when(iso:string){
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return iso;
 return date.toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}

export default function ScanBatchesPanel({batches,undo,onRemove,onRestore,onClose}:Props){
 return <div className="log-shade" role="dialog" aria-modal="true" aria-labelledby="scan-batches-title">
  <section className="scan-batches-modal">
   <header className="log-editor-head"><div><span>SCAN SWEEP</span><h2 id="scan-batches-title">SCAN BATCHES</h2></div><div className="log-editor-header-actions"><button type="button" onClick={onClose} aria-label="Close">×</button></div></header>
   <div className="scan-batches-body">
    <p className="sweep-intro"><b>EVERYTHING SCAN SWEEP FILED ON THIS DEVICE, ONE PRESS PER ROW</b><span>Every record filed in one press shares one time stamp, so a whole sweep can be taken back out exactly — a Down Sheet photographed through the wrong scanner, for instance. Only records nobody has touched since are removed; anything marked fixed, deferred, ticked or written on stays. The shop cloud is told, and the other devices drop them too.</span></p>
    {undo&&<div className="scan-batch-undo"><span><b>{undo.label.toUpperCase()}</b><small>{undo.records.length} record{undo.records.length===1?"":"s"} · {when(undo.removedAt)} · goes back on the buses it came off</small></span><button type="button" onClick={onRestore}>PUT BACK</button></div>}
    {batches.length?<div className="scan-batch-rows">{batches.map(batch=>{
     const buses=batch.busNumbers.length;
     return <article className="scan-batch-row" key={batch.key}>
      <span>
       <b>{when(batch.filedAt)}</b>
       <small>{batch.ids.length} RECORD{batch.ids.length===1?"":"S"} ON {buses} BUS{buses===1?"":"ES"}{batch.checkedBy.length?" · CHECKED BY "+batch.checkedBy.join(", ").toUpperCase():""}{batch.keptIds.length?" · "+batch.keptIds.length+" WORKED ON SINCE, KEPT":""}</small>
       <em>{batch.busNumbers.join(" · ")}</em>
      </span>
      <button type="button" onClick={()=>onRemove(batch)} disabled={!batch.removableIds.length} title={batch.removableIds.length?"Remove the "+batch.removableIds.length+" untouched record"+(batch.removableIds.length===1?"":"s")+" this sweep filed":"Every record in this sweep has been worked on since"}>REMOVE {batch.removableIds.length}</button>
     </article>;
    })}</div>:<p className="scan-batch-empty">No scan sweep is on this device&apos;s Defect Log.</p>}
   </div>
   <footer className="log-editor-actions"><button type="button" onClick={onClose}>CLOSE</button></footer>
  </section>
 </div>;
}
