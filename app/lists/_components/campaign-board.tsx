"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {quickFilterHref} from "@/src/lib/defects/quick-filters";
import type {HeatFleetBus} from "@/src/lib/defects/heat-check-import";
import {HEAT_STANDING_LABEL,HEAT_TAP_GUARD_MS,heatRoster,heatRosterCounts,heatRosterLane,heatRowDetail,heatScanHref,heatShareText,type HeatCheck,type HeatLane,type HeatResult,type HeatRosterRow} from "@/src/lib/defects/heat-check-log";
import {copyText} from "@/src/lib/shared/share-file";

/* THE CAMPAIGNS BOARD: the seasonal walks, above the working lists.

   Curtis, with a screenshot of this page: "I think the best place for it is
   here. Any campaigns that are being ran 'such as A/C in the spring, and now no
   heat list in the late fall'. So going here should show an organized selection
   of different categories that we have. Place it above what is showing here on
   the UI."

   A campaign here is a STANDING one — the same question asked of the whole
   fleet every year — where the lists below are one-off sheets somebody pasted
   in. They sit on one page because both are "work through these buses", and
   apart because a list is its own record while a campaign is a view of the
   fleet.

   THE CARDS OWN NO COUNT. Who has no heat is the Defect Log's No Heat Buses
   list, and the heat tallies come from `heatRoster`, which asks it. A number
   worked out in this file would be a second definition of that, on the page
   least likely to be checked against the first.

   This component writes nothing. A tap is handed up; the page records the
   check and, for NO HEAT, asks the shared filing rule to put it on the bus. */

type Props={
 fleet:HeatFleetBus[];
 checks:HeatCheck[];
 initials:string;
 onInitials:(value:string)=>void;
 onCheck:(row:HeatRosterRow,result:HeatResult)=>void;
 /* The one tap that can still be taken back, and the way to take it back. */
 lastTap:{busNumber:string;result:HeatResult;filed:boolean}|null;
 onUndo:()=>void;
};

/* Which tab is which, in the order they are drawn. The label and the count are
   both read from heat-check-log.ts; only the order is this file's. */
const LANES:HeatLane[]=["todo","no-heat","verify","unchecked","ok"];

export default function CampaignBoard({fleet,checks,initials,onInitials,onCheck,lastTap,onUndo}:Props){
 const [open,setOpen]=useState(false);
 const [lane,setLane]=useState<HeatLane>("todo");
 const [copied,setCopied]=useState("");
 /* THE SECOND TAP IS NOT FOR THE NEXT BUS. In TO DO a bus tapped HEAT OK leaves
    the list, and the row beneath it slides up under the thumb that is still
    coming down — so a double-tap, or a tap that registered late, marked a bus
    nobody had walked to. Every tap button goes dead for a moment after any
    tap. How long is `HEAT_TAP_GUARD_MS`, beside the rules it protects. */
 const [guarded,setGuarded]=useState(false);
 const guard=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>()=>{if(guard.current)clearTimeout(guard.current)},[]);
 const tap=(row:HeatRosterRow,result:HeatResult)=>{
  if(guarded)return;
  setGuarded(true);
  if(guard.current)clearTimeout(guard.current);
  guard.current=setTimeout(()=>setGuarded(false),HEAT_TAP_GUARD_MS);
  onCheck(row,result);
 };
 const roster=useMemo(()=>heatRoster(fleet,checks),[fleet,checks]);
 const counts=useMemo(()=>heatRosterCounts(roster),[roster]);
 const shown=useMemo(()=>heatRosterLane(roster,lane),[roster,lane]);
 const laneCount:Record<HeatLane,number>={todo:counts.todo,"no-heat":counts.noHeat,verify:counts.verify,unchecked:counts.unchecked,ok:counts.ok};
 const copy=async(mode:"remaining"|"full")=>{
  try{await copyText(heatShareText(roster,mode));setCopied(mode==="full"?"FULL LIST COPIED":"TO-DO LIST COPIED")}catch{setCopied("COULD NOT COPY")}
  setTimeout(()=>setCopied(""),2200);
 };

 return <div className="campaigns" role="region" aria-label="Campaigns">
  <div className="campaigns-head"><b>CAMPAIGNS</b><small>The seasonal walks through the whole fleet. Results land on the Defect Log, never on the Down Sheet.</small></div>
  <div className="campaign-cards">
   <div className={"campaign-card heat"+(open?" open":"")}>
    <div className="campaign-title"><b>NO HEAT</b><small>LATE FALL</small></div>
    <div className="campaign-tallies">
     <span className="hot"><strong>{counts.noHeat}</strong><small>NO HEAT</small></span>
     <span><strong>{counts.verify}</strong><small>VERIFY</small></span>
     <span><strong>{counts.unchecked}</strong><small>NOT CHECKED</small></span>
     <span><strong>{counts.ok}</strong><small>HEAT OK</small></span>
    </div>
    <div className="campaign-actions">
     <a className="campaign-scan" href={heatScanHref()} title="Opens the heat sheet scanner on the Defect Log, where its results are filed">📷 SCAN HEAT SHEET</a>
     <button type="button" aria-expanded={open} onClick={()=>setOpen(current=>!current)}>{open?"CLOSE LIST":"OPEN LIST"}</button>
    </div>
   </div>
   <div className="campaign-card ac">
    <div className="campaign-title"><b>A/C</b><small>SPRING</small></div>
    {/* NO COUNT, ON PURPOSE. The only definition of an A/C bus this app has is
        the Defect Log's A/C Buses filter, and measured in a browser it counts
        every record under the "A/C and HVAC" category — heating repairs
        included, so a board with one cooling fault and two no-heat buses read
        "3 A/C BUSES". Printing that here would put the heat campaign's own
        results on the A/C card. Narrowing that filter is a change to an
        existing list and Curtis's call; until then this card links to the list
        and claims no number. */}
    <p className="campaign-idle">Not running. The A/C walk starts in spring.</p>
    <div className="campaign-actions">
     <a href={quickFilterHref("ac")} title="Opens the A/C Buses list on the Defect Log">OPEN A/C BUSES</a>
    </div>
   </div>
  </div>

  {open&&<div className="heat-list" role="region" aria-label="Heat check list">
   <div className="heat-list-head">
    <label className="heat-initials">YOUR INITIALS<input value={initials} onChange={event=>onInitials(event.target.value.replace(/[^a-z ]/gi,"").toUpperCase())} maxLength={16} placeholder="CD"/></label>
    <div className="heat-share">
     <button type="button" onClick={()=>copy("remaining")}>COPY TO-DO LIST</button>
     <button type="button" onClick={()=>copy("full")}>COPY FULL LIST</button>
     <i role="status">{copied}</i>
    </div>
   </div>
   <p className="heat-list-note">Tap what you found at the bus. <b>NO HEAT</b> opens a No Heat defect on the Defect Log unless the bus already has one. <b>HEAT OK</b> only records that you checked — it never closes a repair. Every tap is kept with your initials and today&apos;s date.</p>
   {lastTap&&<div className="heat-undo" role="status">
    <span>Bus <b>{lastTap.busNumber}</b> recorded as <b>{lastTap.result==="ok"?"HEAT OK":"NO HEAT"}</b>.{lastTap.filed?" The No Heat defect it opened stays on the Defect Log; undo takes back the check only.":""}</span>
    <button type="button" onClick={onUndo}>UNDO THIS TAP</button>
   </div>}
   <div className="heat-lanes" aria-label="Which buses to show">{LANES.map(key=>
    <button type="button" aria-pressed={lane===key} className={lane===key?"active":""} key={key} onClick={()=>setLane(key)}>{key==="todo"?"TO DO":HEAT_STANDING_LABEL[key]} <strong>{laneCount[key]}</strong></button>)}</div>
   {shown.length?<ul className="heat-roster">{shown.map(row=><li className={"standing-"+row.status} key={row.busNumber}>
    <span className="heat-bus"><b>{row.busNumber}</b><em>{HEAT_STANDING_LABEL[row.status]}</em></span>
    <span className="heat-detail">{heatRowDetail(row)}{row.checkedOkWhileOpen&&<a href={quickFilterHref("no-cabin-heat")}>OPEN NO HEAT BUSES TO MARK IT FIXED</a>}</span>
    <span className="heat-taps">
     <button type="button" className="tap-ok" disabled={guarded} onClick={()=>tap(row,"ok")} aria-label={"Bus "+row.busNumber+" has heat"}>HEAT OK</button>
     <button type="button" className="tap-cold" disabled={guarded} onClick={()=>tap(row,"no-heat")} aria-label={"Bus "+row.busNumber+" has no heat"}>NO HEAT</button>
    </span>
   </li>)}</ul>:<p className="heat-list-empty">{roster.length?"No buses in this group.":"There are no buses on this device's board yet."}</p>}
  </div>}
 </div>;
}
