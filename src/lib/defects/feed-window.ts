import {activeShift,type ShiftSettings,DEFAULT_SHIFT_SETTINGS,shiftLabel} from "../settings/shift-clock.ts";
import {loggedMinutesElapsed,type StructuredDefect} from "./repair-catalog.ts";

/* "JUST STAY FOCUSED ON TODAY."

   Curtis, on the Defect Log: "I want you to filter everything that's being put
   down ... by the day and by the shift, so in the last 24 hours, or by the
   shift ... it should be like a drop-down somewhere at the work computer."

   THE FEED HAD NO TIME FILTER AT ALL. `time-window.ts` built one, but it is
   drawn only inside the quick-filter drawer and on the two Down Sheet boards —
   lists of BUSES somebody has already ruled on. The LIVE REPAIR FEED, which is
   every defect on the board, could only be narrowed by state or by typing in
   the search box. On a board carrying days of work that is the difference
   between reading today and reading everything.

   EVERY WINDOW HERE IS "N MINUTES BACK FROM NOW", and that is the whole trick.
   A rolling span says so outright; THIS SHIFT is however long the shift has
   been running; TODAY is however long it has been since midnight. Resolving all
   three to one number means the filter itself is a single comparison and there
   is no second code path for a clock-based window to be wrong in. */

export type FeedWindowKey="all"|"shift"|"today"|"24h"|"3d"|"7d";

/* DELIBERATELY NOT `TIME_WINDOWS`, and not added to it.

   That list is drawn by four other lists, and its own header says a chip which
   appears everywhere but means ALL on some screens is the failure to avoid.
   TODAY is exactly such a chip: it needs a clock the Down Sheet boards do not
   ask for. So the feed opts into its own list, the way SHIFT already does, and
   the four existing lists are untouched by anything in this file.

   Shorter than the chip row on purpose. This is a drop-down a foreman opens at
   a desk to answer one question, not a row of thumb targets: 1H, 4H and 8H
   answer "the last few hours", which is what THIS SHIFT already answers better
   on the one screen that can resolve a shift. */
export const FEED_WINDOWS:{key:FeedWindowKey;label:string}[]=[
 {key:"all",label:"ALL"},
 {key:"shift",label:"THIS SHIFT"},
 {key:"today",label:"TODAY"},
 {key:"24h",label:"LAST 24H"},
 {key:"3d",label:"LAST 3 DAYS"},
 {key:"7d",label:"LAST 7 DAYS"},
];

const FIXED_MINUTES:Partial<Record<FeedWindowKey,number>>={"24h":24*60,"3d":3*24*60,"7d":7*24*60};

export function isFeedWindowKey(value:unknown):value is FeedWindowKey{
 return FEED_WINDOWS.some(item=>item.key===value);
}

/* HOW FAR BACK THIS WINDOW REACHES, in minutes, or null for "no limit".

   null means ALL — and it is also what an unresolvable clock degrades to. A
   shift that cannot be resolved (somebody has edited the hours into a shape
   with no window covering now) and a `now` that cannot be read both land here,
   and the label below degrades on the same input, so the feed keeps every
   record and claims no window rather than showing a narrowed board under a
   heading that says THIS SHIFT. That pairing is the one outcome worth writing
   code to prevent, and it is the same rule `time-window.ts` already follows. */
export function feedWindowMinutes(key:FeedWindowKey,now:Date=new Date(),settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS):number|null{
 if(key==="all")return null;
 const fixed=FIXED_MINUTES[key];
 if(fixed!==undefined)return fixed;
 if(key==="shift")return activeShift(now,settings)?.since??null;
 /* TODAY IS THE CALENDAR DAY ON THIS DEVICE, not a rolling 24 hours — they are
    different questions and he asked for both. At 06:00 "today" is six hours of
    work and "the last 24 hours" still carries all of yesterday afternoon.

    MEASURED FROM A REAL LOCAL MIDNIGHT, not from `minuteOfDay`. That function
    is right for the shift clock, which compares clock readings to clock
    readings, and wrong here, where the answer is compared against an ELAPSED
    age. Two ways it goes wrong, both measured rather than argued:

    It floors to the minute while `loggedMinutesElapsed` returns fractions, so
    at 09:30:45 the limit is 570 and a defect logged at 00:00:10 has an age of
    570.58 — logged today and hidden from TODAY.

    And it counts clock minutes rather than real ones, so on a spring-forward
    day 10:00 reads as 600 minutes past midnight when only 540 have passed;
    TODAY would reach a full hour into yesterday. Subtracting a Date built from
    this date's own year, month and day gets both right at once, because that
    Date is the real instant local midnight happened. */
 if(key==="today"){
  const at=now.getTime();
  if(Number.isNaN(at))return null;
  return (at-new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime())/60000;
 }
 return null;
}

/* Zero is a real limit. Standing at 14:00 exactly, the shift is zero minutes
   old and only something logged this minute belongs in it; at 00:00 the same
   is true of TODAY. `if(!limit)` would read either as "no window" and hand back
   the whole board, so the null check is explicit. */
export function withinFeedWindow(minutes:number|null,limit:number|null){
 if(limit===null)return true;
 /* AN UNDATED DEFECT FALLS OUT OF EVERY NARROWED WINDOW and stays in ALL. A
    record read off a photographed sheet by a device with no clock has no age;
    keeping it in "today" would put a row of unknown age in a list whose whole
    claim is that everything in it is recent. The bar above the feed counts it,
    so it is never silently gone. */
 return minutes!==null&&minutes<=limit;
}

/* The feed asks about the defect's OWN age — `createdAt`, when somebody first
   put it down — never `updatedAt`. Curtis asked to filter "everything that's
   being put down"; a defect logged on Monday and edited this morning was still
   logged on Monday, and a window keyed off the edit would quietly refill
   TODAY with last week's work every time somebody touched a record. */
export function defectWithinFeedWindow(defect:StructuredDefect,limit:number|null,now:Date=new Date()){
 return withinFeedWindow(loggedMinutesElapsed(defect,now),limit);
}

/* What the bar above the feed says it is showing. "" for ALL, because a board
   with no window is just the board.

   THIS SHIFT names the shift and its start — "2ND SHIFT · SINCE 14:00" —
   rather than saying "THIS SHIFT", for the same reason the shared list does:
   somebody reading the screen at 23:00 is not on the shift it was narrowed to
   and cannot ask which one it was. */
export function feedWindowLabel(key:FeedWindowKey,now:Date=new Date(),settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS){
 if(key==="all")return "";
 if(key==="shift"){
  const shift=activeShift(now,settings);
  return shift?shiftLabel(shift.key)+" · SINCE "+shift.start:"";
 }
 /* Checked the same way the limit is, so the pair cannot disagree about whether
    there is a window at all. */
 if(key==="today")return Number.isNaN(now.getTime())?"":"TODAY";
 return FEED_WINDOWS.find(item=>item.key===key)?.label||"";
}
