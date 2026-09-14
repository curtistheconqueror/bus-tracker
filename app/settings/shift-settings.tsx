"use client";

/* THE GARAGE'S HOURS, EDITABLE HERE RATHER THAN IN A RELEASE.

   Curtis asked for this twice in one breath: "it must be shift aware and pull
   out time aware. Also a settings option to fine tune both of these options in
   case changes need to be made without you writing code."

   Shift boundaries and pullout times belong to this property's contract, not to
   the software. A contract changes on a schedule nobody in this repository
   controls, and a foreman should not be waiting on a deploy to tell the app
   that 2nd shift now starts at half past. */

import {useEffect,useState} from "react";
import {clockMinutes,DEFAULT_SHIFT_SETTINGS,formatClock,nextPullout,readShiftSettings,
 shiftAt,shiftLabel,shiftRemainingMinutes,SHIFT_SETTINGS_KEY,untilLabel,
 type ShiftSettings} from "../shift-clock";

export default function ShiftSettingsPanel(){
 const [settings,setSettings]=useState<ShiftSettings>(DEFAULT_SHIFT_SETTINGS);
 const [problem,setProblem]=useState("");
 /* The clock has to tick, or the "right now" line is only true for the instant
    the page loaded — which is exactly the line somebody opens this panel to
    check. A minute is as fine as anything here reads. */
 const [now,setNow]=useState(()=>new Date());
 useEffect(()=>{setSettings(readShiftSettings(localStorage))},[]);
 useEffect(()=>{const tick=window.setInterval(()=>setNow(new Date()),30000);return()=>window.clearInterval(tick)},[]);

 const save=(next:ShiftSettings)=>{
  setSettings(next);
  try{localStorage.setItem(SHIFT_SETTINGS_KEY,JSON.stringify(next));setProblem("")}
  catch{setProblem("This device could not save the hours. Export a backup and clear space, then try again.")}
 };

 /* Typed into, not committed on every keystroke. A time input hands back "0"
    halfway through somebody typing "06:00", and writing that through would move
    the whole shift under them mid-edit — the same draft-string lesson the hours
    boxes on the Down Sheet cost us. An edge that is not yet a real time is held
    and simply not saved. */
 const setShift=(key:string,edge:"start"|"end",value:string)=>{
  const next={...settings,shifts:settings.shifts.map(shift=>shift.key===key?{...shift,[edge]:value}:shift)};
  setSettings(next);
  if(clockMinutes(value)!==null)save(next);
 };
 const setPullout=(key:string,field:"at"|"label",value:string)=>{
  const next={...settings,pullouts:settings.pullouts.map(item=>item.key===key?{...item,[field]:value}:item)};
  setSettings(next);
  if(field==="label"||clockMinutes(value)!==null)save(next);
 };

 const current=shiftAt(now,settings);
 const remaining=shiftRemainingMinutes(now,settings);
 const pullout=nextPullout(now,settings);
 /* A window with a bad edge is reported rather than silently falling back at
    read time. The person who typed it is standing right here. */
 const broken=settings.shifts.filter(shift=>clockMinutes(shift.start)===null||clockMinutes(shift.end)===null);

 return <section className="settings-group shift-settings" aria-labelledby="shift-settings-heading">
  <h4 id="shift-settings-heading">SHIFTS &amp; PULLOUT TIMES</h4>
  <p className="shift-settings-note">
   These are this garage&rsquo;s hours, not the app&rsquo;s. Change them here whenever the
   contract does. They stay on this device and are never synced, so a property
   running different hours is never overwritten by another one.
  </p>

  <div className="shift-now" role="status">
   <span><small>RIGHT NOW</small><b>{shiftLabel(current)}</b></span>
   {remaining!==null&&<span><small>SHIFT ENDS IN</small><b>{untilLabel(remaining)}</b></span>}
   {pullout&&<span><small>{pullout.label} IN</small><b>{untilLabel(pullout.minutesAway)}</b></span>}
  </div>

  <div className="shift-rows">
   {settings.shifts.map(shift=>
    <label className="shift-row" key={shift.key}>
     <b>{shift.key.toUpperCase()} SHIFT</b>
     <span>
      <input type="time" value={shift.start} aria-label={shift.key+" shift starts"}
       onChange={event=>setShift(shift.key,"start",event.target.value)}/>
      <i aria-hidden="true">to</i>
      <input type="time" value={shift.end} aria-label={shift.key+" shift ends"}
       onChange={event=>setShift(shift.key,"end",event.target.value)}/>
     </span>
    </label>)}
  </div>

  <div className="shift-rows">
   {settings.pullouts.map(item=>
    <label className="shift-row" key={item.key}>
     <b>{item.label}</b>
     <span>
      <input type="time" value={item.at} aria-label={item.label+" time"}
       onChange={event=>setPullout(item.key,"at",event.target.value)}/>
     </span>
    </label>)}
  </div>

  {broken.length>0&&<p className="shift-settings-problem" role="alert">
   {broken.map(shift=>shift.key.toUpperCase()).join(" and ")} {broken.length===1?"has":"have"} a
   time the app cannot read, so {broken.length===1?"it is":"they are"} still running on the
   built-in hours. Put both ends of the window in as a 24-hour time.
  </p>}
  {problem&&<p className="shift-settings-problem" role="alert">{problem}</p>}

  <div className="shift-settings-actions">
   {/* The built-in shift hours are a GUESS — Curtis gave the pullout times and
       never gave the boundaries — so getting back to them has to be one press
       rather than three careful edits. */}
   <button type="button" onClick={()=>save(DEFAULT_SHIFT_SETTINGS)}>USE THE BUILT-IN HOURS</button>
   <small>06:00&ndash;14:00, 14:00&ndash;22:00, 22:00&ndash;06:00, with pullouts at {
    DEFAULT_SHIFT_SETTINGS.pullouts.map(item=>formatClock(clockMinutes(item.at) as number)).join(" and ")}.</small>
  </div>
 </section>;
}
