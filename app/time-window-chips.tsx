"use client";

import {TIME_WINDOWS,type TimeWindowKey} from "./time-window";

/* The chip row itself, drawn identically on all four lists that carry it — the
   two boards on the Down Sheet and the two quick-filter drawers on the Defect
   Log. One component rather than four copies for the reason elapsed-label.ts
   exists: four copies of a control this small drift without anybody noticing,
   and here the drift would be a window that means something different on the
   screen you filtered from than on the list you sent.

   IT SAYS WHAT IT IS HIDING. A filtered list that looks like the whole list is
   the failure this control can actually cause: a foreman narrows to the last
   four hours, walks away, comes back, and reads six buses as the total. So the
   count of what fell outside the window is printed beside the chips whenever
   anything did, and it is a button — the way out is the same size as the way
   in.

   Not persisted anywhere on purpose, and this is the one decision in here
   worth arguing with. A remembered filter is friendlier on every screen where
   being wrong costs a scroll. These two lists are buses nobody has ruled on
   yet, and a window silently restored from yesterday would open the board
   already hiding them. It resets to ALL every time the page loads. */
export default function TimeWindowChips({value,onChange,hidden,label}:{
 value:TimeWindowKey;
 onChange:(value:TimeWindowKey)=>void;
 /* How many rows the window is holding back right now. */
 hidden:number;
 /* Named for the screen reader, since two of these can be on one page. */
 label:string;
}){
 return <div className="time-window-chips" role="group" aria-label={"Filter "+label+" by how recent"}>
  <small>SHOW</small>
  {/* `item`, not `window`: the two boards that draw this both carry a comment
      saying the global must not be shadowed, and a rule that holds in two
      files and not the third is not a rule. */}
  <div className="time-window-row">{TIME_WINDOWS.map(item=>
   <button type="button" key={item.key} className={"time-window-chip"+(item.key===value?" on":"")}
    aria-pressed={item.key===value}
    aria-label={item.key==="all"?"Show every "+label:"Show "+label+" from the last "+item.label}
    onClick={()=>onChange(item.key)}>{item.label}</button>)}
  </div>
  {/* "HIDDEN", not "OLDER HIDDEN" — measured in the browser and corrected
      there. A row with no stamp at all is held back by every narrowed window
      too, and it is not older than anything; it has no age. Calling it old
      would be a small lie on the one line whose job is to be trusted. */}
  {hidden>0&&<button type="button" className="time-window-hidden" onClick={()=>onChange("all")}
   aria-label={"Show all — "+hidden+" hidden by this window"}>{hidden} HIDDEN · SHOW ALL</button>}
 </div>;
}
