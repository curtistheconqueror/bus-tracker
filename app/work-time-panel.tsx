"use client";

import {useMemo,useState} from "react";
import type {BusList} from "./bus-lists";
import {formatWorkHours,workDayLabel,workTimePeople,workTimeSummary} from "./work-time";

/* Accrued work time, day by day, for one person.

   Deliberately self-contained: it takes the records and renders, holding only
   which person is picked. It reaches for no storage, no router and nothing
   about the page around it, so moving it to a page of its own later is an
   import and one line of markup. Its styles are namespaced under .work-time
   and travel with it in work-time.css. */

export default function WorkTimePanel({lists,defaultPerson=""}:{lists:BusList[];defaultPerson?:string}){
 const people=useMemo(()=>workTimePeople(lists),[lists]);
 const [picked,setPicked]=useState("");
 /* Falls back to whoever this device is set up as, so the common case is one
    tap rather than a choice every time. */
 const person=picked||(people.includes(defaultPerson)?defaultPerson:"");
 const summary=useMemo(()=>workTimeSummary(lists,person),[lists,person]);

 return <section className="work-time" aria-label="Accrued work time">
  <div className="work-time-head">
   <label>WORK TIME
    <select value={person} onChange={event=>setPicked(event.target.value)}>
     <option value="">Choose a name</option>
     {people.map(entry=><option value={entry} key={entry}>{entry}</option>)}
    </select>
   </label>
   {person?<span className="work-time-total">
    <strong>{formatWorkHours(summary.hours)}</strong>
    <small>HOURS · {summary.entries} REPAIR{summary.entries===1?"":"S"}</small>
   </span>:null}
  </div>

  {!people.length?<p className="work-time-empty">No time recorded yet. Tick a repair off a campaign and put its hours in, and it will total here.</p>
   :!person?<p className="work-time-empty">Choose a name to see the hours accrued day by day.</p>
   :!summary.days.length?<p className="work-time-empty">{person} has {summary.untimed?summary.untimed+" repair"+(summary.untimed===1?"":"s")+" ticked off, none with hours recorded yet.":"no recorded hours yet."}</p>
   :<>
    <ul className="work-time-days">{summary.days.map(day=><li key={day.day}>
     <span className="work-time-day"><b>{workDayLabel(day.day)}</b><small>{day.entries} repair{day.entries===1?"":"s"}</small></span>
     <span className="work-time-hours">{formatWorkHours(day.hours)}</span>
     <span className="work-time-detail">{day.rows.map(row=>row.label+" · "+formatWorkHours(row.hours)).join("  ·  ")}</span>
    </li>)}</ul>
    {summary.untimed?<small className="work-time-note">{summary.untimed} more repair{summary.untimed===1?"":"s"} ticked off with no hours recorded. Those are not counted as zero, they are simply not counted.</small>:null}
   </>}
 </section>;
}
