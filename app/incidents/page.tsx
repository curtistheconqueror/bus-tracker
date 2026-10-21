"use client";

import {useEffect,useMemo,useState} from "react";
import TrackerNav from "@/src/components/shared/tracker-nav";
import RefreshButton from "@/src/components/shared/refresh-button";
import AppName from "@/src/components/shared/app-name";
import WelcomeGate from "@/src/components/shared/welcome-gate";
import ShopCloudLive from "@/src/components/shared/shop-cloud-live";
import "./incidents.css";
import {CARE_LEVELS,INCIDENT_KINDS,createIncident,editIncident,readIncidents,writeIncidents,type CareLevel,type Incident,type IncidentKind} from "@/src/lib/incidents/incidents";
import {DEFAULT_SHIFT_SETTINGS,readShiftSettings,type ShiftSettings} from "@/src/lib/settings/shift-clock";
import {siteAreaLabels} from "@/src/lib/fleet/site-config";

/* THE AREAS COME FROM site-config, never from a list typed here.

   location-label.ts exists because five copies of this table drifted and all
   five matched on a slot prefix, so every one of the 84 garage spaces read
   "Main Garage" — including Trouble Bays 11 and 12, which the move editor
   treats as separate destinations. A sixth copy would bring that back. These
   are the same names the map writes, so an incident filed in Trouble Bay 12
   says Trouble Bay 12. */
const AREAS=Object.entries(siteAreaLabels()).map(([name,label])=>({name,label}));

/* A `datetime-local` input wants local wall-clock with no zone, and an ISO
   stamp is UTC. Converting through the offset rather than slicing the ISO
   string, because slicing shows a foreman on 3rd shift a time five hours off
   from the clock on the wall — on the one form where the time is the record. */
function toLocalInput(iso:string){
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return "";
 const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);
 return local.toISOString().slice(0,16);
}
function fromLocalInput(value:string){
 if(!value)return "";
 const parsed=new Date(value);
 return Number.isNaN(parsed.getTime())?"":parsed.toISOString();
}

function when(iso:string){
 const date=new Date(iso);
 if(Number.isNaN(date.getTime()))return iso;
 return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(date);
}

const EMPTY={
 what:"",kind:"slip" as IncidentKind,at:"",area:"",busNumber:"",
 people:"",injury:"",care:"" as CareLevel,witnesses:"",reportedTo:"",followUp:"",
};

export default function IncidentsPage(){
 const [incidents,setIncidents]=useState<Incident[]>([]);
 const [shiftSettings,setShiftSettings]=useState<ShiftSettings>(DEFAULT_SHIFT_SETTINGS);
 const [draft,setDraft]=useState({...EMPTY});
 /* Open by default. Somebody who taps INCIDENTS has something to report; a
    collapsed form would make the first action on this page "find the form". */
 const [formOpen,setFormOpen]=useState(true);
 const [editing,setEditing]=useState<string|null>(null);
 const [saved,setSaved]=useState("");
 const [ready,setReady]=useState(false);

 useEffect(()=>{
  setIncidents(readIncidents(localStorage));
  setShiftSettings(readShiftSettings(localStorage));
  setReady(true);
 },[]);

 /* The only thing that can stop a save. Everything else on this form is
    optional on purpose — Curtis: "don't make any of the fields except for the
    ones that matter mandatory to save the incident". */
 const canSave=draft.what.trim().length>0;

 const set=<K extends keyof typeof EMPTY>(key:K)=>(value:(typeof EMPTY)[K])=>setDraft(current=>({...current,[key]:value}));

 function persist(next:Incident[],message:string){
  /* The write REPORTS. An incident form that cleared itself over a refused
     write would lose the report while looking like it saved — which on this
     page costs somebody their record of being hurt. */
  if(!writeIncidents(localStorage,next)){
   setSaved("NOT SAVED — this device refused the write. Write it down before leaving this screen.");
   return false;
  }
  setIncidents(next);
  setSaved(message);
  return true;
 }

 function save(){
  if(!canSave)return;
  const at=fromLocalInput(draft.at);
  if(editing){
   const current=incidents.find(incident=>incident.id===editing);
   if(!current)return;
   const next=editIncident(current,{...draft,at:at||current.at});
   if(!next)return;
   if(persist(incidents.map(incident=>incident.id===editing?next:incident),"Incident updated."))
    {setEditing(null);setDraft({...EMPTY})}
   return;
  }
  const incident=createIncident({...draft,at:at||undefined},shiftSettings);
  if(!incident)return;
  if(persist([incident,...incidents],"Incident recorded. Tell your supervisor too — this does not report it for you."))
   setDraft({...EMPTY});
 }

 function beginEdit(incident:Incident){
  setEditing(incident.id);
  setFormOpen(true);
  setDraft({
   what:incident.what,kind:incident.kind,at:toLocalInput(incident.at),area:incident.area,
   busNumber:incident.busNumber,people:incident.people,injury:incident.injury,care:incident.care,
   witnesses:incident.witnesses,reportedTo:incident.reportedTo,followUp:incident.followUp,
  });
  scrollTo(0,0);
 }

 const kindLabel=useMemo(()=>new Map(INCIDENT_KINDS.map(kind=>[kind.key,kind.label])),[]);
 const areaLabel=useMemo(()=>new Map(AREAS.map(area=>[area.name,area.label])),[]);

 return <main className="incidents-app"><WelcomeGate/><ShopCloudLive/>
  <header className="incidents-header"><div><AppName/><span>FLEET MAINTENANCE</span><h1>Incidents</h1><p>What happened, where, and when — people and places, not buses</p></div>
   <TrackerNav active="/incidents"/><RefreshButton/>
  </header>

  {/* Said once, at the top, because somebody filing their first incident
      should not have to wonder. This app is a record, not a reporting
      channel, and it stays on this phone. */}
  <p className="incidents-scope">Stays on this device. It is not sent to the Shop Cloud and nobody else&rsquo;s phone can see it — tell your supervisor as well.</p>

  <section className="incident-form-shell">
   <h2>
    <button type="button" onClick={()=>setFormOpen(open=>!open)} aria-expanded={formOpen}>
     {editing?"EDIT THIS INCIDENT":"FILE AN INCIDENT"}
    </button>
   </h2>
   {formOpen&&<div className="incident-form">
    {/* First, biggest, and the only one that blocks the save. */}
    <label className="incident-what">WHAT HAPPENED
     <textarea value={draft.what} onChange={event=>set("what")(event.target.value)} rows={3}
      placeholder="Slipped on oil walking past the pit" autoFocus={!editing}/>
    </label>

    <div className="incident-row">
     <label>WHEN
      <input type="datetime-local" value={draft.at} onChange={event=>set("at")(event.target.value)}/>
      <small>Leave blank for right now</small>
     </label>
     <label>WHAT KIND
      <select value={draft.kind} onChange={event=>set("kind")(event.target.value as IncidentKind)}>
       {INCIDENT_KINDS.map(kind=><option key={kind.key} value={kind.key}>{kind.label}</option>)}
      </select>
     </label>
    </div>

    <div className="incident-row">
     <label>WHERE
      <select value={draft.area} onChange={event=>set("area")(event.target.value)}>
       <option value="">Not recorded</option>
       {AREAS.map(area=><option key={area.name} value={area.name}>{area.label}</option>)}
      </select>
     </label>
     <label>BUS, IF ONE WAS INVOLVED
      <input inputMode="numeric" value={draft.busNumber} placeholder="17549"
       onChange={event=>set("busNumber")(event.target.value.replace(/\D/g,""))}/>
     </label>
    </div>

    <details className="incident-more">
     <summary>MORE DETAIL — all optional</summary>
     <div className="incident-row">
      <label>WHO WAS INVOLVED
       <input value={draft.people} onChange={event=>set("people")(event.target.value)} placeholder="Names or initials"/>
      </label>
      <label>WITNESSES
       <input value={draft.witnesses} onChange={event=>set("witnesses")(event.target.value)}/>
      </label>
     </div>
     <div className="incident-row">
      <label>INJURY
       <input value={draft.injury} onChange={event=>set("injury")(event.target.value)} placeholder="Bruised hip, no break"/>
      </label>
      <label>CARE
       <select value={draft.care} onChange={event=>set("care")(event.target.value as CareLevel)}>
        {CARE_LEVELS.map(level=><option key={level.key} value={level.key}>{level.label}</option>)}
       </select>
      </label>
     </div>
     <div className="incident-row">
      <label>REPORTED TO
       <input value={draft.reportedTo} onChange={event=>set("reportedTo")(event.target.value)} placeholder="Supervisor"/>
      </label>
      <label>FOLLOW UP
       <input value={draft.followUp} onChange={event=>set("followUp")(event.target.value)} placeholder="Floor was degreased"/>
      </label>
     </div>
    </details>

    <div className="incident-actions">
     <button type="button" className="incident-save" onClick={save} disabled={!canSave}>
      {editing?"SAVE CHANGES":"RECORD IT"}
     </button>
     {editing&&<button type="button" onClick={()=>{setEditing(null);setDraft({...EMPTY})}}>CANCEL</button>}
     {!canSave&&<small>Say what happened and this saves — everything else can wait.</small>}
    </div>
   </div>}
  </section>

  {saved&&<p className={"incident-saved"+(saved.startsWith("NOT SAVED")?" failed":"")} role="status">{saved}</p>}

  <section className="incident-list">
   <h2>RECORDED <b>{incidents.length}</b></h2>
   {!ready?null:incidents.length===0
    ?<p className="incident-empty">Nothing recorded on this device. That is worth keeping true.</p>
    :incidents.map(incident=><article key={incident.id} className={"incident-card kind-"+incident.kind}>
     <header>
      <strong>{kindLabel.get(incident.kind)}</strong>
      <time dateTime={incident.at}>{when(incident.at)}</time>
      {incident.shift&&<em>{incident.shift} shift</em>}
     </header>
     <p className="incident-what-said">{incident.what}</p>
     <dl>
      {incident.area&&<div><dt>Where</dt><dd>{areaLabel.get(incident.area)||incident.area}</dd></div>}
      {incident.busNumber&&<div><dt>Bus</dt><dd>{incident.busNumber}</dd></div>}
      {incident.people&&<div><dt>Involved</dt><dd>{incident.people}</dd></div>}
      {incident.injury&&<div><dt>Injury</dt><dd>{incident.injury}</dd></div>}
      {incident.care&&<div><dt>Care</dt><dd>{CARE_LEVELS.find(level=>level.key===incident.care)?.label}</dd></div>}
      {incident.witnesses&&<div><dt>Witnesses</dt><dd>{incident.witnesses}</dd></div>}
      {incident.reportedTo&&<div><dt>Reported to</dt><dd>{incident.reportedTo}</dd></div>}
      {incident.followUp&&<div><dt>Follow up</dt><dd>{incident.followUp}</dd></div>}
     </dl>
     <footer>
      {/* The gap between happening and filing is itself a fact about how a
          report came to exist, so it is shown rather than hidden. */}
      <small>Filed {when(incident.filedAt)}{incident.editedAt?" · edited "+when(incident.editedAt):""}</small>
      <button type="button" onClick={()=>beginEdit(incident)}>EDIT</button>
     </footer>
    </article>)}
  </section>
 </main>;
}
