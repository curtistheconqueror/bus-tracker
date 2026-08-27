"use client";

import {useMemo,useState} from "react";
import type {BusList} from "./bus-lists";
import {formatWorkHours,workDayLabel,workTimePeople,workTimeSummary,type WorkTimeBus} from "./work-time";

/* Accrued work time, day by day, for one person.

   Deliberately self-contained: it takes the records and renders, holding only
   which person is picked. It reaches for no storage, no router and nothing
   about the page around it, so moving it to a page of its own later is an
   import and one line of markup. Its styles are namespaced under .work-time
   and travel with it in work-time.css.

   Campaign rows and Defect Log repairs both arrive as props and both count
   toward the same day. Either can be left out by a page that does not have it. */

export default function WorkTimePanel({lists=[],buses=[],defaultPerson=""}:{lists?:BusList[];buses?:WorkTimeBus[];defaultPerson?:string}){
 const source=useMemo(()=>({lists,buses}),[lists,buses]);
 const people=useMemo(()=>workTimePeople(source),[source]);
 const [picked,setPicked]=useState("");
 /* Falls back to whoever this device is set up as, so the common case is one
    tap rather than a choice every time. */
 const person=picked||(people.includes(defaultPerson)?defaultPerson:"");
 const summary=useMemo(()=>workTimeSummary(source,person),[source,person]);

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
    <small>HOURS · {summary.entries} JOB{summary.entries===1?"":"S"}</small>
   </span>:null}
  </div>

  {!people.length?<p className="work-time-empty">No time recorded yet. Put hours on a campaign row, or on a repair when you save it fixed, and it will total here.</p>
   :!person?<p className="work-time-empty">Choose a name to see the hours accrued day by day.</p>
   :!summary.days.length?<p className="work-time-empty">{person} has {summary.untimed?summary.untimed+" job"+(summary.untimed===1?"":"s")+" finished, none with hours recorded yet.":"no recorded hours yet."}</p>
   :<>
    <ul className="work-time-days">{summary.days.map(day=><li key={day.day}>
     <span className="work-time-day"><b>{workDayLabel(day.day)}</b><small>{day.entries} job{day.entries===1?"":"s"}</small></span>
     <span className="work-time-hours">{formatWorkHours(day.hours)}</span>
     {/* One element per job rather than one joined string. Separating them with
         a character did not work: the dot between two jobs looked exactly like
         the dot inside one, so a day read as a single run of numbers.

         The split is worth the room too: 2 hours on a bus reads very
         differently when 1.5 of it was spent finding the fault. */}
     <span className="work-time-detail">{day.rows.map((row,index)=><span className="work-time-job" key={row.source+"|"+row.label+"|"+index}>
      {row.label} · {formatWorkHours(row.hours)}{row.note?" ("+row.note+")":""}
     </span>)}</span>
    </li>)}</ul>
    {summary.untimed?<small className="work-time-note">{summary.untimed} more job{summary.untimed===1?"":"s"} finished with no hours recorded. Those are not counted as zero, they are simply not counted.</small>:null}
   </>}
 </section>;
}
