"use client";

import {useEffect,useMemo,useState} from "react";
import TrackerNav from "@/src/components/shared/tracker-nav";
import RefreshButton from "@/src/components/shared/refresh-button";
import AppName from "@/src/components/shared/app-name";
import WelcomeGate from "@/src/components/shared/welcome-gate";
import ShopCloudLive from "@/src/components/shared/shop-cloud-live";
import "./shop-talk.css";
import {SHOP_TALK_KINDS,createShopTalkNote,handleShopTalkNote,isHandled,openHazardCount,readShopTalk,reopenShopTalkNote,writeShopTalk,type ShopTalkKind,type ShopTalkNote} from "@/src/lib/shop-talk/shop-talk";
import {readCloudConfig} from "@/src/lib/cloud/cloud-sync";
import {siteAreaLabels} from "@/src/lib/fleet/site-config";

/* Same table the map writes with, never a list typed here — see
   location-label.ts for what five drifting copies of it cost. */
const AREAS=Object.entries(siteAreaLabels()).map(([name,label])=>({name,label}));

function when(iso:string){
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return iso;
 return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date);
}

export default function ShopTalkPage(){
 const [notes,setNotes]=useState<ShopTalkNote[]>([]);
 const [text,setText]=useState("");
 const [kind,setKind]=useState<ShopTalkKind>("hazard");
 const [area,setArea]=useState("");
 const [initials,setInitials]=useState("");
 const [saved,setSaved]=useState("");
 const [showHandled,setShowHandled]=useState(false);
 const [ready,setReady]=useState(false);

 useEffect(()=>{
  setNotes(readShopTalk(localStorage));
  /* The initials this device already knows, rather than a box somebody has to
     fill in every time. Still editable, and still optional — an unsigned
     hazard is a hazard. */
  setInitials(readCloudConfig(localStorage).initials||"");
  setReady(true);
 },[]);

 /* The write REPORTS, the same rule the incident form follows. A board that
    cleared the box over a refused write would throw away the hazard somebody
    just typed while showing them "NOT SAVED" — the report is gone and the
    only copy was in that textarea. */
 function persist(next:ShopTalkNote[],message:string){
  if(!writeShopTalk(localStorage,next)){
   setSaved("NOT SAVED — this device refused the write. Leave the text here and try again.");
   return false;
  }
  setNotes(next);
  setSaved(message);
  return true;
 }

 function post(){
  const note=createShopTalkNote({text,kind,area,by:initials});
  if(!note)return;
  /* Only a write that actually landed empties the box. */
  if(persist([note,...notes],"Posted."))setText("");
 }

 const openHazards=useMemo(()=>openHazardCount(notes),[notes]);
 const visible=useMemo(()=>showHandled?notes:notes.filter(note=>!isHandled(note)),[notes,showHandled]);
 const handledCount=notes.length-notes.filter(note=>!isHandled(note)).length;
 const kindLabel=useMemo(()=>new Map(SHOP_TALK_KINDS.map(entry=>[entry.key,entry.label])),[]);
 const areaLabel=useMemo(()=>new Map(AREAS.map(entry=>[entry.name,entry.label])),[]);

 return <main className="talk-app"><WelcomeGate/><ShopCloudLive/>
  <header className="talk-header"><div><AppName/><span>FLEET MAINTENANCE</span><h1>Shop Talk</h1><p>Hazards, heads ups and suggestions — the things people notice</p></div>
   <TrackerNav active="/shop-talk"/><RefreshButton/>
  </header>

  {/* A hazard board only pays for itself when the next person reads it, so the
      fact that it currently cannot travel is said out loud rather than left
      to be discovered. */}
  <p className="talk-scope">Stays on this device. Carrying it to the Shop Cloud needs a schema change Curtis has to approve, and MASTER EXPORT does not carry it yet either — so a hazard worth keeping is worth telling somebody about too.</p>

  {openHazards>0&&<p className="talk-alarm" role="status">{openHazards} open hazard{openHazards===1?"":"s"} on this board.</p>}

  <section className="talk-post">
   <label className="talk-say">SAY WHAT YOU SAW
    <textarea value={text} rows={2} onChange={event=>setText(event.target.value)}
     placeholder="Oil all over the floor by the pit"/>
   </label>
   <div className="talk-kinds" role="group" aria-label="What kind of note">
    {SHOP_TALK_KINDS.map(entry=>
     <button key={entry.key} type="button" className={kind===entry.key?"active "+entry.key:entry.key}
      aria-pressed={kind===entry.key} onClick={()=>setKind(entry.key)} title={entry.hint}>{entry.label}</button>)}
   </div>
   <div className="talk-row">
    <label>WHERE
     <select value={area} onChange={event=>setArea(event.target.value)}>
      <option value="">Not recorded</option>
      {AREAS.map(entry=><option key={entry.name} value={entry.name}>{entry.label}</option>)}
     </select>
    </label>
    <label>YOUR INITIALS
     <input value={initials} maxLength={4} onChange={event=>setInitials(event.target.value.toUpperCase())} placeholder="Optional"/>
    </label>
    <button type="button" className="talk-send" onClick={post} disabled={!text.trim()}>POST IT</button>
   </div>
  </section>

  {saved&&<p className={"talk-saved"+(saved.startsWith("NOT SAVED")?" failed":"")} role="status">{saved}</p>}

  <section className="talk-board">
   <h2>ON THE BOARD <b>{visible.length}</b>
    {handledCount>0&&<button type="button" onClick={()=>setShowHandled(value=>!value)}>
     {showHandled?"HIDE HANDLED":"SHOW HANDLED ("+handledCount+")"}
    </button>}
   </h2>
   {!ready?null:visible.length===0
    ?<p className="talk-empty">Nothing on the board. Post what you notice — the oil somebody slips on was there first.</p>
    :visible.map(note=><article key={note.id} className={"talk-note "+note.kind+(isHandled(note)?" handled":"")}>
     <header>
      <strong>{kindLabel.get(note.kind)}</strong>
      {note.area&&<span>{areaLabel.get(note.area)||note.area}</span>}
      <time dateTime={note.at}>{when(note.at)}</time>
      {note.by&&<em>{note.by}</em>}
     </header>
     <p>{note.text}</p>
     <footer>
      {isHandled(note)
       ?<><small>Handled {when(note.handledAt||"")}{note.handledBy?" by "+note.handledBy:""}</small>
         <button type="button" onClick={()=>persist(notes.map(item=>item.id===note.id?reopenShopTalkNote(item):item),"Back on the board.")}>STILL THERE</button></>
       :<button type="button" className="talk-handle"
          onClick={()=>persist(notes.map(item=>item.id===note.id?handleShopTalkNote(item,initials):item),"Marked handled.")}>MARK HANDLED</button>}
     </footer>
    </article>)}
  </section>
 </main>;
}
