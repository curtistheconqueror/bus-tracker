"use client";

/* LOAD SHEETS THE APP NEVER SAW.

   The swap ledger records from the day it ships. Everything before that is
   photographs, and eighteen days of them were transcribed by hand so the
   forecast has something to stand on before the shop has scanned for a month.

   It sits in Settings rather than on the Down Sheet on purpose. A scan is a
   thing a foreman does on a Tuesday morning with a phone; this is a one-time
   administrative load of old paper, and putting it beside IMPORT ALL DATA says
   that better than any amount of warning text on the scan screen would.

   THE PLAN IS SHOWN BEFORE ANYTHING IS WRITTEN. Same rule as the status
   report: you read it, then it happens. */

import {useMemo,useState} from "react";
import {applyBackfill,planBackfill,type BackfillPlan} from "../sheet-ledger-backfill";
import {readSheetLedger} from "../sheet-ledger";

export default function SheetBackfillPanel(){
 const [text,setText]=useState("");
 const [status,setStatus]=useState("");
 /* Recomputed as the box changes, but only ever computed — planBackfill writes
    nothing, so a half-pasted file costs a wasted parse and never a bad merge. */
 const plan=useMemo<BackfillPlan|null>(()=>{
  const trimmed=text.trim();
  if(!trimmed)return null;
  try{return planBackfill(readSheetLedger(localStorage),trimmed)}
  catch{return null}
 },[text]);

 const load=()=>{
  if(!plan?.ok)return;
  const result=applyBackfill(localStorage,plan);
  if(!result.ok){
   setStatus(result.reason==="storage-full"
    ?"This device is out of room. Nothing was loaded."
    :"Could not save it. Nothing was loaded.");
   return;
  }
  setStatus(result.loaded+" swap"+(result.loaded===1?"":"s")+" loaded. The ledger now holds "+plan.next.length+".");
  setText("");
 };

 const onFile=(file:File|undefined)=>{
  if(!file)return;
  setStatus("");
  const reader=new FileReader();
  reader.onload=()=>setText(String(reader.result||""));
  /* A file that will not read is said out loud rather than leaving an empty box
     that looks like nothing happened. */
  reader.onerror=()=>setStatus("Could not read that file.");
  reader.readAsText(file);
 };

 return <section className="sheet-backfill">
  <p className="sheet-backfill-blurb">
   Loads old down sheets into the swap history so the Fleet Forecast has
   something to measure. It <b>only</b> writes the swap history &mdash; it cannot
   touch the live Down Sheet, and a file loaded twice does nothing the second time.
  </p>
  <div className="sheet-backfill-row">
   <label className="sheet-backfill-file">CHOOSE A FILE
    <input type="file" accept=".json,application/json" onChange={event=>onFile(event.target.files?.[0])}/>
   </label>
   <button type="button" className="sheet-backfill-load" disabled={!plan?.ok} onClick={load}>LOAD THE SWAPS</button>
  </div>
  <textarea className="sheet-backfill-text" value={text} spellCheck={false}
   placeholder="…or paste the backfill here"
   aria-label="The backfill to load" onChange={event=>{setText(event.target.value);setStatus("")}}/>

  {plan&&!plan.ok&&<p className="sheet-backfill-problem">{plan.problem}</p>}
  {plan?.ok&&<dl className="sheet-backfill-plan">
   <div><dt>New swaps</dt><dd>{plan.fresh.length}</dd></div>
   {plan.duplicates>0&&<div><dt>Already held</dt><dd>{plan.duplicates}</dd></div>}
   {/* The cap, said before the button rather than discovered afterwards. */}
   {plan.dropped>0&&<div className="sheet-backfill-warn"><dt>Will not fit</dt><dd>{plan.dropped}</dd></div>}
   {plan.gaps>0&&<div><dt>Carry a gap</dt><dd>{plan.gaps}</dd></div>}
   <div><dt>Ledger after</dt><dd>{plan.next.length}</dd></div>
  </dl>}
  {plan?.ok&&plan.dropped>0&&<p className="sheet-backfill-problem">
   The swap history keeps the newest {plan.next.length}. {plan.dropped} of these are older than
   that, so they will not be kept. Export your data first if you want them.
  </p>}
  {plan?.ok&&plan.gaps>0&&<p className="sheet-backfill-note">
   {plan.gaps} of these follow a stretch nobody recorded. They still count toward
   what was on the sheet; they are left out of anything measured per swap, because
   an unknown number of swaps happened inside that stretch.
  </p>}
  <p className="sheet-backfill-note">{status||"Nothing is written until you press LOAD THE SWAPS."}</p>
 </section>;
}
