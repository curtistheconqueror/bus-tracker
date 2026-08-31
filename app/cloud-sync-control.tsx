"use client";

/* Connect this device to the shop cloud, and say what sync is doing.

   Two deliberate absences.

   There is no OFFLINE/ONLINE switch. A switch is a thing somebody leaves in the
   wrong position — set to offline, a week of work quietly stops syncing and
   nobody finds out until they need it; set to online with no signal, every
   action stalls on a timeout. This reports instead, and the report is a line of
   text nobody has to maintain.

   And this control never gates the board. It lives in Settings, the app opens
   straight to the Facility Map signed in or not, and a mechanic in a dead spot
   sees his buses exactly as he does today. Signing in once on shop wifi leaves a
   session on the device that is restored with no network call at all. */

import {useCallback,useEffect,useRef,useState} from "react";
import {cloudPull,cloudPush,cloudSignIn,cloudSignOut,cloudSignedIn} from "./cloud-client";
import {
 cloudConfigProblem,
 cloudStatusLabel,
 EMPTY_CLOUD_CONFIG,
 readCloudConfig,
 readCloudState,
 readMergedAway,
 readSentFingerprints,
 writeCloudConfig,
 writeCloudState,
 writeSentFingerprints,
 type CloudConfig,
 type CloudState,
} from "./cloud-sync";
import {mergeDefectLog,mergeDownSheet,mergeFleetMap} from "./section-transfer";
import {
 readDownSheetStorage,
 readFleetStorage,
 writeDownSheetStorage,
 writeFleetStorage,
} from "./storage";

/* How often a connected device looks for its own unsent work. Long enough that
   a phone on its owner's data plan is not paying for a chatty app, short enough
   that walking from the shop to the lot does not lose an afternoon. */
const SWEEP_MS=45000;

export default function CloudSyncControl(){
 const [config,setConfig]=useState<CloudConfig>(EMPTY_CLOUD_CONFIG);
 const [state,setState]=useState<CloudState>({phase:"unconfigured",lastSyncedAt:"",lastError:"",pending:0});
 const [password,setPassword]=useState("");
 const [open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false);
 const running=useRef(false);

 useEffect(()=>{
  const saved=readCloudConfig(localStorage);
  setConfig(saved);
  setState(readCloudState(localStorage));
  if(!cloudConfigProblem(saved))
   cloudSignedIn(saved).then(signedIn=>setState(current=>{
    const next={...current,phase:signedIn?("idle" as const):("signed-out" as const)};
    writeCloudState(localStorage,next);
    return next;
   }));
 },[]);

 const remember=(next:CloudState)=>{writeCloudState(localStorage,next);setState(next)};

 /* Reads what is ON DISK rather than what the page is holding.

    That is not laziness, it is the safety property. writeFleetStorage refuses a
    write it considers destructive — the bulk-loss guard, a corrupt store, a full
    quota — and returns false, and the Facility Map's save effect discards that
    boolean. Pushing from React state would upload changes the device itself
    declined to keep, propagating the exact data loss the guard exists to
    prevent. LocalStorage only ever holds writes that were accepted, so pushing
    from it cannot send refused work. */
 const push=useCallback(async(quiet:boolean)=>{
  const saved=readCloudConfig(localStorage);
  if(cloudConfigProblem(saved)||running.current)return false;
  running.current=true;
  if(!quiet)remember({...readCloudState(localStorage),phase:"syncing",lastError:""});
  const fleet=readFleetStorage<Record<string,unknown>>(localStorage);
  const sheet=readDownSheetStorage<Record<string,unknown>>(localStorage);
  const result=await cloudPush({
   buses:fleet.valid?fleet.buses:[],
   entries:sheet.valid?sheet.entries:[],
   config:saved,
   now:new Date().toISOString(),
   sent:readSentFingerprints(localStorage),
   /* Tombstones for anything this device folded into another record, so the
      server stops handing the duplicates back to everyone. */
   merged:readMergedAway(localStorage),
  });
  if(result.ok)writeSentFingerprints(localStorage,result.sent);
  const previous=readCloudState(localStorage);
  remember({
   phase:result.phase,
   lastSyncedAt:result.ok&&result.pushed?new Date().toISOString():previous.lastSyncedAt,
   lastError:result.message,
   pending:result.pending,
  });
  running.current=false;
  return result.ok;
 },[]);

 /* A sweep rather than a hook into every save. Each pass sends only what
    changed, so a quiet shop costs one request that finds nothing. */
 /* Depends on a boolean, not on the config object. Depending on the object
    re-subscribed the interval and fired a push on every keystroke in the
    settings fields, because typing replaces the object each time. */
 const ready=!cloudConfigProblem(config);
 useEffect(()=>{
  if(!ready)return;
  const tick=()=>{if(document.visibilityState==="visible")push(true)};
  const timer=window.setInterval(tick,SWEEP_MS);
  document.addEventListener("visibilitychange",tick);
  window.addEventListener("online",tick);
  tick();
  return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",tick);window.removeEventListener("online",tick)};
 },[ready,push]);

 const save=()=>{
  const problem=cloudConfigProblem(config);
  if(problem){alert(problem);return}
  writeCloudConfig(localStorage,config);
  setConfig(readCloudConfig(localStorage));
  remember({...state,phase:"signed-out",lastError:""});
 };

 const signIn=async()=>{
  const problem=cloudConfigProblem(config);
  if(problem){alert(problem);return}
  if(!password){alert("Enter the shop password.");return}
  writeCloudConfig(localStorage,config);
  setBusy(true);
  const result=await cloudSignIn(readCloudConfig(localStorage),password);
  setBusy(false);
  setPassword("");
  remember({...state,phase:result.phase,lastError:result.message});
  if(result.ok)push(false);
  else alert(result.message||"That sign-in did not go through. Check the password and the connection.");
 };

 const signOut=async()=>{
  if(!confirm("Sign this device out of the shop cloud? The board stays on this device and keeps working."))return;
  await cloudSignOut(readCloudConfig(localStorage));
  remember({...state,phase:"signed-out",lastError:""});
 };

 /* Bring the shop's copy down and merge it in, using the very rules a
    device-to-device transfer already uses: incoming wins where two devices
    describe the same thing, anything only this device has is kept, and the map
    never asserts which buses are down. */
 const pull=async()=>{
  const saved=readCloudConfig(localStorage);
  if(cloudConfigProblem(saved))return;
  if(!confirm("Bring down the shop's copy and merge it into this device? Nothing on this device is deleted."))return;
  setBusy(true);
  remember({...state,phase:"syncing",lastError:""});
  /* Send before receiving, and do not receive if sending failed.

     A merge takes the incoming copy for a bus both devices know. So a person
     who moves five buses and presses this inside the 45-second window before
     their own sweep has run would have had the server's older copy laid over
     the top of their work — and the next sweep would then have pushed that
     overwritten version up as though it were the truth. Five moves gone, with
     nothing on screen to say so.

     Pushing first means the server already holds those moves, stamped later
     than anything else, so what comes back down includes them. It is what
     makes "work as long as you like, then refresh, and you are caught up"
     actually true rather than nearly true. */
  if(!await push(true)){
   setBusy(false);
   /* push has already written the offline or error phase, so the status line
      is telling the truth and there is nothing to restore here. */
   alert("This device's own changes could not be sent, so nothing was brought down. Bringing the shop's copy in now could overwrite work that has not left this device yet. Try again when it reconnects.");
   return;
  }
  const result=await cloudPull(saved,new Date().toISOString(),readMergedAway(localStorage));
  setBusy(false);
  if(!result.ok||!result.map||!result.defects||!result.sheet){
   remember({...state,phase:result.phase,lastError:result.message});
   alert(result.message||"The shop's copy could not be reached. Nothing on this device changed.");
   return;
  }
  const fleet=readFleetStorage<Record<string,unknown>>(localStorage);
  /* Every abandoned path below puts the phase back. Returning while it still
     says "syncing" leaves that written to storage, and the status line then
     reads "Syncing…" forever — on a device that is not syncing at all. */
  if(!fleet.valid){
   remember({...state,phase:"error",lastError:"This device's board could not be read"});
   alert("This device's board could not be read, so nothing was merged.");
   return;
  }
  const afterMap=mergeFleetMap(fleet.buses,result.map);
  const afterDefects=mergeDefectLog(afterMap.buses,result.defects);
  if(!writeFleetStorage(localStorage,afterDefects.buses,{allowBulkDefectLoss:false})){
   remember({...state,phase:"error",lastError:"The merged board could not be saved"});
   alert("The merged board could not be saved, so nothing changed on this device.");
   return;
  }
  const sheet=readDownSheetStorage<{id?:string}>(localStorage);
  const afterSheet=mergeDownSheet(sheet.valid?sheet.entries:[],result.sheet,afterDefects.buses);
  writeDownSheetStorage(localStorage,afterSheet.entries);
  remember({phase:"idle",lastSyncedAt:new Date().toISOString(),lastError:"",pending:0});
  alert("The shop's copy was merged in. The tracker will reload now.");
  window.location.reload();
 };

 const set=(key:keyof CloudConfig)=>(event:React.ChangeEvent<HTMLInputElement>)=>
  setConfig(current=>({...current,[key]:event.target.value}));
 const connected=!cloudConfigProblem(config);

 return <div className="cloud-sync">
  <p className={"cloud-status cloud-"+state.phase}><b>{cloudStatusLabel(state)}</b>
   <small>{connected
    ?"This device keeps working with no signal. Anything you change is saved here first and goes up when it can."
    :"Not connected. This device works exactly as it does today; nothing is shared until it is connected."}</small></p>

  <div className="cloud-actions">
   {state.phase==="signed-out"||!connected
    ?<button type="button" onClick={()=>setOpen(true)}>CONNECT TO SHOP CLOUD</button>
    :<>
      <button type="button" onClick={()=>push(false)} disabled={busy}>SEND MY CHANGES{state.pending?" ("+state.pending+")":""}</button>
      <button type="button" onClick={pull} disabled={busy}>GET THE SHOP&rsquo;S COPY</button>
      <button type="button" className="cloud-signout" onClick={signOut}>SIGN OUT</button>
     </>}
   {connected&&<button type="button" onClick={()=>setOpen(value=>!value)}>{open?"HIDE SETTINGS":"CONNECTION SETTINGS"}</button>}
  </div>

  {open&&<div className="cloud-fields">
   <label>PROJECT URL<input value={config.url} onChange={set("url")} placeholder="https://yourproject.supabase.co" autoComplete="off" spellCheck={false}/></label>
   <label>ANON PUBLIC KEY<input value={config.anonKey} onChange={set("anonKey")} placeholder="Paste the anon public key" autoComplete="off" spellCheck={false}/></label>
   <label>SHOP SIGN-IN EMAIL<input value={config.email} onChange={set("email")} placeholder="shop@example.com" autoComplete="username" inputMode="email"/></label>
   <label>YOUR INITIALS<input value={config.initials} onChange={set("initials")} placeholder="CJ" autoComplete="off"/></label>
   <label>THIS DEVICE<input value={config.deviceLabel} onChange={set("deviceLabel")} placeholder="Shop iPad" autoComplete="off"/></label>
   <label>SHOP PASSWORD<input type="password" value={password} onChange={event=>setPassword(event.target.value)} placeholder="Only needed to sign in" autoComplete="current-password"/></label>
   <div className="cloud-field-actions">
    <button type="button" onClick={save}>SAVE DETAILS</button>
    <button type="button" className="cloud-signin" onClick={signIn} disabled={busy}>SIGN IN</button>
   </div>
   <small>Your initials are written on every change this device sends, because
    the whole shop shares one sign-in and the database cannot otherwise say who
    did what. The password is used to sign in and is never stored here.</small>
  </div>}
 </div>;
}
