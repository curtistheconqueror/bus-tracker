"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import TrackerNav from "@/src/components/shared/tracker-nav";
import RefreshButton from "@/src/components/shared/refresh-button";
import "./lists.css";
import "./_components/work-time.css";
import "./_components/campaign-board.css";
import WorkTimePanel from "./_components/work-time-panel";
import CampaignBoard from "./_components/campaign-board";
import type {HeatFleetBus} from "@/src/lib/defects/heat-check-import";
import {HEAT_CHECKS_KEY,heatLogProblemWords,readHeatChecks,undoHeatCheck,type HeatCheck,type HeatResult,type HeatRosterRow} from "@/src/lib/defects/heat-check-log";
import {recordHeatTap,type HeatTapOutcome} from "@/src/lib/defects/heat-check-apply";
import type {WorkTimeBus} from "@/src/lib/reports/work-time";
import {REPORT_EXPORT_HINT} from "@/src/lib/storage/fleet-backup";
import {DeferredNavBadge,DeferredReviewPrompt} from "@/src/components/shared/deferred-watch";
import {copyText,shareOrDownloadFile} from "@/src/lib/shared/share-file";
import {FLEET_STORAGE_KEY,readFleetPayload} from "@/src/lib/storage/storage";
import {addBusListEntries,busListColumnCount,busListCounts,busListExportText,busListTemplateOptions,createBusList,deleteBusListTemplate,normalizeBusListTemplates,normalizeBusLists,saveBusListTemplate,setBusListColumns,setBusListEntryCell,setBusListEntryDone,setBusListEntryHours,busListHours,
 BUS_LIST_COLUMN_LIMIT,BUS_LIST_TEMPLATES_STORAGE_KEY,BUS_LISTS_STORAGE_KEY,type BusList,type BusListExportMode,type BusListTemplate} from "@/src/lib/fleet/bus-lists";
import ShopCloudLive from "@/src/components/shared/shop-cloud-live";
import AppName from "@/src/components/shared/app-name";
import WelcomeGate from "@/src/components/shared/welcome-gate";

function readLists(raw:string|null):BusList[]{
 try{return normalizeBusLists(JSON.parse(raw||"[]"))}catch{return []}
}
function writeLists(lists:BusList[]){
 try{localStorage.setItem(BUS_LISTS_STORAGE_KEY,JSON.stringify(lists));return true}catch{return false}
}
/* The fleet as this page borrows it: enough for the timesheet, and enough for
   the campaigns board to ask the Defect Log's own filters about a bus. */
type CampaignBus=WorkTimeBus&HeatFleetBus;
/* What to say when a tap changed nothing, and each says so. The one failure
   that CAN leave something behind — the check refused after NO HEAT had already
   opened its defect — is not in this table: `checkHeat` words it from what the
   tap reports, because "nothing was changed" would be false there. */
const HEAT_TAP_PROBLEM:Record<Exclude<Extract<HeatTapOutcome,{ok:false}>["why"],"check-not-saved">,string>={
 "no-initials":"Enter your initials first, so the check says who made it.",
 "no-bus":"Bus {bus} is not on this device's board any more. Nothing was changed.",
 "two-buses":"Two buses on the board share the number {bus}, so the tap could land on either. Nothing was changed — fix the duplicate on the Facility Map first.",
 unreadable:"This device's board could not be read. Nothing was changed.",
 "not-saved":"The defect could not be saved to this device. Nothing was changed.",
};
function seedId(){return Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7)}
function dayLabel(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(date);
}


export default function Lists(){
 const [lists,setLists]=useState<BusList[]>([]);
 const [hydrated,setHydrated]=useState(false);
 const [openId,setOpenId]=useState("");
 const [initials,setInitials]=useState("");
 const [newName,setNewName]=useState("");
 const [newSource,setNewSource]=useState("");
 const [newColumns,setNewColumns]=useState("");
 const [savedTemplates,setSavedTemplates]=useState<BusListTemplate[]>([]);
 const [templateId,setTemplateId]=useState("");
 const [entryText,setEntryText]=useState("");
 const [quickBus,setQuickBus]=useState("");
 const [exportMode,setExportMode]=useState<BusListExportMode>("full");
 const [copyStatus,setCopyStatus]=useState("");
 const addBoxRef=useRef<HTMLTextAreaElement|null>(null);
 /* A BORROWED COPY, and never written back from this page. It is here so the
    work time panel can add up Defect Log repairs and the campaigns board can
    count the fleet. The one thing this page does to the board — a NO HEAT tap
    opening a defect — goes through `recordHeatTap`, which takes STORAGE and
    reads the board fresh at the moment of the tap; this state is re-read
    afterwards and is never the thing that gets saved. */
 const [fleet,setFleet]=useState<CampaignBus[]>([]);
 const [heatChecks,setHeatChecks]=useState<HeatCheck[]>([]);
 /* The one tap that can still be taken back. Held in memory only: it is "the
    thing I just did", and a reload is the end of just. */
 const [lastTap,setLastTap]=useState<{checkId:string;busNumber:string;result:HeatResult;filed:boolean}|null>(null);

 useEffect(()=>{
  setHeatChecks(readHeatChecks(localStorage));
  setLists(readLists(localStorage.getItem(BUS_LISTS_STORAGE_KEY)));
  try{setSavedTemplates(normalizeBusListTemplates(JSON.parse(localStorage.getItem(BUS_LIST_TEMPLATES_STORAGE_KEY)||"[]")))}catch{/* optional */}
  try{setInitials(String(JSON.parse(localStorage.getItem("pace-defect-log-settings-v1")||"{}").defaultInitials||""))}catch{/* optional */}
  try{const saved=readFleetPayload<CampaignBus>(localStorage.getItem(FLEET_STORAGE_KEY));if(saved.valid)setFleet(saved.buses)}catch{/* the timesheet still works without it */}
  setHydrated(true);
 },[]);
 /* The heat sheet is scanned on the Defect Log, often in the tab next to this
    one, so its checks arrive here the way a saved repair does. */
 useEffect(()=>{
  const refresh=(event:StorageEvent)=>{if(event.key===HEAT_CHECKS_KEY)setHeatChecks(readHeatChecks(localStorage))};
  window.addEventListener("storage",refresh);
  return()=>window.removeEventListener("storage",refresh);
 },[]);
 /* A repair saved as fixed in another tab should show up here without a
    reload: the Defect Log and this page are commonly open side by side. */
 useEffect(()=>{
  const refresh=(event:StorageEvent)=>{
   if(event.key!==FLEET_STORAGE_KEY||!event.newValue)return;
   const saved=readFleetPayload<CampaignBus>(event.newValue);
   if(saved.valid)setFleet(saved.buses);
  };
  window.addEventListener("storage",refresh);
  return()=>window.removeEventListener("storage",refresh);
 },[]);
 useEffect(()=>{if(hydrated)writeLists(lists)},[lists,hydrated]);
 useEffect(()=>{if(hydrated)try{localStorage.setItem(BUS_LIST_TEMPLATES_STORAGE_KEY,JSON.stringify(savedTemplates))}catch{/* storage may be full or blocked */}},[savedTemplates,hydrated]);
 const templates=useMemo(()=>busListTemplateOptions(savedTemplates),[savedTemplates]);
 /* Bring the paste box into view when a list opens. The panels stack on a
    phone, so it sits well below the fold and creating a list otherwise looks
    like nothing happened. Not focused: that would throw up the keyboard before
    the mechanic has decided what to paste. */
 useEffect(()=>{
  if(!openId)return;
  const box=addBoxRef.current;
  if(box?.scrollIntoView)box.scrollIntoView({block:"center",behavior:"smooth"});
 },[openId]);

 const open=useMemo(()=>lists.find(list=>list.id===openId),[lists,openId]);
 const counts=open?busListCounts(open):{total:0,done:0,remaining:0};
 /* Every cell that was pasted is shown even where no column was named for it,
    so a value can never disappear from a list someone else is going to act on. */
 const cellCount=open?busListColumnCount(open):0;
 const unnamed=open?Math.max(0,cellCount-open.columns.length):0;
 const exportText=open?busListExportText(open,exportMode):"";

 const touch=(id:string,change:(list:BusList)=>BusList)=>setLists(current=>current.map(list=>
  list.id!==id?list:{...change(list),updatedAt:new Date().toISOString()}));

 const addList=()=>{
  const name=newName.trim();
  if(!name){alert("Give the list a name, such as Farebox — Coin Bypass.");return}
  const list=createBusList(name,newSource,new Date().toISOString(),seedId(),newColumns.split(",").map(part=>part.trim()).filter(Boolean));
  setLists(current=>[list,...current]);
  setOpenId(list.id);setNewName("");setNewSource("");setNewColumns("");setTemplateId("");
 };
 /* One bus, Enter, cleared and ready for the next. The paste box is for a whole
    report; this is for standing at a bus and adding it. */
 const addQuickBus=()=>{
  if(!open||!quickBus.trim())return;
  touch(open.id,list=>addBusListEntries(list,quickBus,seedId()));
  setQuickBus("");
 };
 const addEntries=()=>{
  if(!open||!entryText.trim())return;
  touch(open.id,list=>addBusListEntries(list,entryText,seedId()));
  setEntryText("");
 };
 const removeList=(list:BusList)=>{
  if(!confirm("Delete the list “"+list.name+"” and its "+busListCounts(list).total+" buses? This cannot be undone."))return;
  setLists(current=>current.filter(item=>item.id!==list.id));
  if(openId===list.id)setOpenId("");
 };
 const removeEntry=(entryId:string)=>{
  if(!open)return;
  touch(open.id,list=>({...list,entries:list.entries.filter(entry=>entry.id!==entryId)}));
 };
 const copyList=async()=>{
  try{await copyText(exportText);setCopyStatus("COPIED")}catch{setCopyStatus("COULD NOT COPY")}
  setTimeout(()=>setCopyStatus(""),2200);
 };
 /* ONE TAP ON THE HEAT LIST. Everything it does — who, the defect if there is
    one to open, the check, and in what order — is `recordHeatTap`'s; this asks
    the one question only a person can answer, hands the tap over, and shows
    what came back. The clock is taken AFTER the question, so a confirm left
    open for ten minutes does not date the check ten minutes early. */
 const checkHeat=(row:HeatRosterRow,result:HeatResult)=>{
  if(!initials.trim()){alert(HEAT_TAP_PROBLEM["no-initials"]);return}
  if(result==="no-heat"&&!row.openHeat.length&&!confirm("Log bus "+row.busNumber+" as NO HEAT?\n\nThis opens a No Heat defect on the Defect Log. It is an ordinary defect — add details, or mark it fixed, there."))return;
  const tap=recordHeatTap(localStorage,row.busNumber,result,initials);
  if(!tap.ok&&tap.why==="check-not-saved"){
   /* The board may hold a defect this tap opened, so the page re-reads it
      before saying anything, and the words come from what the tap reports. */
   refreshFromStorage();
   alert("The check could not be saved — "+heatLogProblemWords(tap.log)+"."+(tap.filed?" The No Heat defect WAS opened on the Defect Log for bus "+row.busNumber+", and it is still there.":" Nothing was changed."));
   return;
  }
  if(!tap.ok){alert(HEAT_TAP_PROBLEM[tap.why].replace("{bus}",row.busNumber));return}
  refreshFromStorage();
  setLastTap({checkId:tap.checkId,busNumber:row.busNumber,result,filed:tap.filed});
 };
 /* Taking the last tap back. The CHECK goes; a defect that tap opened does not,
    and the button says so before it is pressed — a defect is the Defect Log's
    to correct, and one that somebody has since added to must not vanish from a
    list on another page. */
 const undoHeatTap=()=>{
  if(!lastTap)return;
  const undone=undoHeatCheck(localStorage,lastTap.checkId);
  if(!undone.ok){alert("The check could not be taken back — "+heatLogProblemWords(undone.why)+".");return}
  setLastTap(null);refreshFromStorage();
 };
 /* The board and the log as they are on disk now. This page never trusts its
    own copy of either after something has written to them. */
 const refreshFromStorage=()=>{
  setHeatChecks(readHeatChecks(localStorage));
  try{const saved=readFleetPayload<CampaignBus>(localStorage.getItem(FLEET_STORAGE_KEY));if(saved.valid)setFleet(saved.buses)}catch{/* the counts catch up on the next read */}
 };
 const downloadList=()=>{
  if(!open)return;
  const blob=new Blob([exportText],{type:"text/plain;charset=utf-8"});
  void shareOrDownloadFile(blob,open.name.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".txt",open.name+" report");
 };

 return <main className="lists-app"><WelcomeGate/><ShopCloudLive/><DeferredNavBadge/><DeferredReviewPrompt/>
  <header className="lists-header"><div><AppName/><span>FLEET MAINTENANCE</span><h1>Fleet Campaigns</h1><p>Working lists you can hand to someone without the app</p></div>
   <TrackerNav active="/lists"/><RefreshButton/>
  </header>

  <CampaignBoard fleet={fleet} checks={heatChecks} initials={initials} onInitials={setInitials} onCheck={checkHeat} lastTap={lastTap} onUndo={undoHeatTap}/>

  <WorkTimePanel lists={lists} buses={fleet} defaultPerson={initials.trim().toUpperCase()}/>

  <section className="lists-layout">
   <aside className="lists-index" aria-label="Saved lists">
    <div className="lists-new">
     <b>NEW LIST</b>
     <label>NAME<input value={newName} onChange={event=>setNewName(event.target.value)} placeholder="Farebox — Coin Bypass"/></label>
     <label>WHERE IT CAME FROM<input value={newSource} onChange={event=>setNewSource(event.target.value)} placeholder="Farebox report 8-27-26"/></label>
     <label>FORMAT<select value={templateId} onChange={event=>{const picked=templates.find(entry=>entry.id===event.target.value);
      setTemplateId(event.target.value);setNewColumns(picked?picked.columns.join(", "):"")}}>
      <option value="">Custom — name your own columns</option>
      {templates.map(entry=><option value={entry.id} key={entry.id}>{entry.name}</option>)}
     </select></label>
     <label>COLUMNS — OPTIONAL<input value={newColumns} onChange={event=>{setNewColumns(event.target.value);setTemplateId("")}} placeholder="Farebox ID, Last Probed, Bypass"/></label>
     <button type="button" onClick={addList}>CREATE LIST</button>
    </div>
    {lists.length?<ul className="lists-saved">{lists.map(list=>{
     const stat=busListCounts(list);
     return <li key={list.id}>
      <button type="button" className={list.id===openId?"active":""} onClick={()=>setOpenId(list.id)}>
       <b>{list.name}</b>
       <small>{stat.remaining} of {stat.total} remaining{list.source?" · "+list.source:""}</small>
       <time>{dayLabel(list.updatedAt)}</time>
      </button>
      <button type="button" className="remove-list" onClick={()=>removeList(list)} aria-label={"Delete list "+list.name}>×</button>
     </li>;
    })}</ul>:<p className="lists-empty">No lists yet. Create one above, then paste in the buses.</p>}
   </aside>

   {open?<div className="list-detail">
    <div className="list-detail-head">
     <span><small>{open.source||"LIST"}</small><b>{open.name}</b></span>
     <span className="list-tally"><strong>{counts.remaining}</strong><small>REMAINING</small></span>
     <span className="list-tally"><strong>{counts.done}</strong><small>CLEARED</small></span>
     {busListHours(open)?<span className="list-tally"><strong>{busListHours(open)}</strong><small>HOURS</small></span>:null}
    </div>

    <details className="list-columns">
     <summary>COLUMNS{open.columns.length?" — "+open.columns.join(", "):" — none, rows are free notes"}</summary>
     <p>Name what each list carries. Up to {BUS_LIST_COLUMN_LIMIT}, and none is fine. Renaming or clearing one never touches what is already written down.</p>
     <div className="list-column-fields">
      {Array.from({length:BUS_LIST_COLUMN_LIMIT},(_ignored,index)=>
       <label key={index}><small>{index+1}</small><input value={open.columns[index]||""} placeholder={index?"":"Farebox ID"}
        onChange={event=>{const next=[...open.columns];while(next.length<=index)next.push("");next[index]=event.target.value;
         touch(open.id,list=>setBusListColumns(list,next))}}/></label>)}
     </div>
     <div className="list-template-actions">
      <button type="button" disabled={!open.columns.length} onClick={()=>{
       const name=prompt("Save these columns as a reusable format. What is this report called?",open.name);
       if(!name||!name.trim())return;
       setSavedTemplates(current=>saveBusListTemplate(current,name,open.columns,seedId()));
      }}>SAVE AS A FORMAT</button>
      {savedTemplates.length?<span className="list-saved-templates">{savedTemplates.map(entry=>
       <button type="button" key={entry.id} onClick={()=>{
        if(!confirm("Delete the saved format “"+entry.name+"”? Lists already using it keep their columns."))return;
        setSavedTemplates(current=>deleteBusListTemplate(current,entry.id));
       }} aria-label={"Delete saved format "+entry.name}>{entry.name} ×</button>)}</span>:null}
     </div>
     {unnamed?<small className="list-column-warn">{unnamed===1?"One value per row has":unnamed+" values per row have"} no column name yet. {unnamed===1?"It is":"They are"} still kept and still exported, just unlabelled.</small>:null}
    </details>

    <div className="list-quick-add">
     <label>ADD ONE BUS<input value={quickBus} inputMode="numeric" placeholder="17503"
      onChange={event=>setQuickBus(event.target.value)}
      onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();addQuickBus()}}}/></label>
     <button type="button" onClick={addQuickBus} disabled={!quickBus.trim()}>ADD</button>
     <small>Type a number and press Enter. Use the box below to paste a whole report.</small>
    </div>

    <div className="list-add">
     <label>PASTE A REPORT<textarea ref={addBoxRef} value={entryText} onChange={event=>setEntryText(event.target.value)}
      placeholder={"Type numbers: 17503, 17504 17506\nOr paste rows straight from the report — the bus number is picked out and the rest is kept as detail."}/></label>
     <div className="list-add-actions">
      <label className="list-initials">YOUR NAME<input value={initials} onChange={event=>setInitials(event.target.value.replace(/[^a-z ]/gi,"").toUpperCase())} maxLength={16} placeholder="CURTIS"/></label>
      <button type="button" onClick={addEntries} disabled={!entryText.trim()}>ADD TO LIST</button>
     </div>
    </div>

    {open.entries.length?<ul className="list-entries">{open.entries.map(entry=><li key={entry.id} className={entry.done?"done":""}>
     <label>
      <input type="checkbox" checked={entry.done} onChange={event=>touch(open.id,list=>setBusListEntryDone(list,entry.id,event.target.checked,new Date().toISOString(),initials))}/>
      <span className="list-entry-bus">{entry.busNumber||"—"}</span>
      <span className="list-entry-cells">
       {cellCount?Array.from({length:cellCount},(_ignored,index)=><span className="list-cell" key={index}>
        <small>{open.columns[index]||"—"}</small>
        <input value={entry.cells[index]||""} aria-label={(open.columns[index]||"Value "+(index+1))+" for bus "+(entry.busNumber||"row")}
         onClick={event=>event.preventDefault()}
         onChange={event=>touch(open.id,list=>setBusListEntryCell(list,entry.id,index,event.target.value))}/>
       </span>):<span className="list-cell empty">No details</span>}
       <span className="list-cell list-hours">
        <small>HOURS</small>
        <input value={entry.hours===undefined?"":String(entry.hours)} inputMode="decimal" placeholder="—"
         aria-label={"Billable hours for bus "+(entry.busNumber||"row")}
         onClick={event=>event.preventDefault()}
         onChange={event=>touch(open.id,list=>setBusListEntryHours(list,entry.id,event.target.value))}/>
       </span>
       {entry.done&&(entry.doneAt||entry.doneBy)?<i>{[dayLabel(entry.doneAt||""),entry.doneBy].filter(Boolean).join(" · ")}</i>:null}
      </span>
     </label>
     <button type="button" className="remove-entry" onClick={()=>removeEntry(entry.id)} aria-label={"Remove bus "+(entry.busNumber||"row")}>×</button>
    </li>)}</ul>:<p className="lists-empty">Nothing on this list yet.</p>}

    <div className="list-export">
     <div className="list-export-modes">
      <b>SHARE</b>
      {([["full","EVERYTHING"],["remaining","REMAINING ONLY"],["numbers","NUMBERS ONLY"]] as [BusListExportMode,string][]).map(([mode,label])=>
       <button type="button" key={mode} className={exportMode===mode?"active":""} onClick={()=>setExportMode(mode)}>{label}</button>)}
     </div>
     <pre className="list-export-preview" aria-label="Export preview">{exportText}</pre>
     <div className="list-export-actions">
      <button type="button" className="copy-list" onClick={copyList}>{copyStatus||"COPY"}</button>
      <button type="button" onClick={downloadList} title={REPORT_EXPORT_HINT}>DOWNLOAD REPORT (.TXT)</button>
     </div>
    </div>
   </div>:<div className="list-detail placeholder"><p>Pick a list on the left, or create one.</p></div>}
  </section>
 </main>;
}
