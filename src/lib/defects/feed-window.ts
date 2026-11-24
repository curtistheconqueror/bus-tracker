import {activeShift,clockMinutes,formatClock,type ShiftKey,type ShiftSettings,DEFAULT_SHIFT_SETTINGS,shiftLabel} from "../settings/shift-clock.ts";
import {completedMinutesElapsed,loggedByHand,loggedMinutesElapsed,type StructuredDefect} from "./repair-catalog.ts";

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
   is no second code path for a clock-based window to be wrong in.

   PREVIOUS SHIFT IS THE ONE EXCEPTION, added in release 208: the shift before
   this one has ended, so it has a near edge as well. It is still ages in
   minutes - see `feedWindowRange` - and its near edge is THIS SHIFT's far edge,
   so the two windows meet without a gap or an overlap. */

export type FeedWindowKey="all"|"shift"|"previous"|"today"|"24h"|"3d"|"7d"|"30d";

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
 /* THE ONE WINDOW WITH TWO ENDS. Curtis, asking for the feed's ALL button to
    become this drop-down: "select if u want to see all defects from current
    shift, previous, 24 hours, the week". Every other window here reaches back
    from NOW; the shift before this one ended, so it is the one window that
    also has a near edge. See `feedWindowRange`. */
 {key:"previous",label:"PREVIOUS SHIFT"},
 {key:"today",label:"TODAY"},
 {key:"24h",label:"LAST 24H"},
 {key:"3d",label:"LAST 3 DAYS"},
 {key:"7d",label:"LAST 7 DAYS"},
 /* A MONTH, ON BOTH SCREENS, and this used to be a second list.

    It shipped as `FIXED_REPAIR_WINDOWS` — a superset only Fixed Repairs drew —
    on the argument that a month is a reasonable span to ask a HISTORY for and
    a strange one to ask a live board, "where thirty days is every record it
    has". Curtis asked for it on the feed as well, and the argument was wrong
    on the facts anyway: a DEFERRED defect sits on this board for as long as it
    takes, so a board carrying months of held-back work is exactly where this
    narrows something.

    So the two lists collapsed back into one. Two tables that must agree about
    what a window key means are two tables that will eventually disagree — and
    they already had, once: `30d` resolved to a limit through `FIXED_MINUTES`
    and to "" through `feedWindowLabel`, which is a narrowed list under a
    heading claiming no window at all. One table cannot do that. */
 {key:"30d",label:"LAST 30 DAYS"},
];

const FIXED_MINUTES:Partial<Record<FeedWindowKey,number>>={"24h":24*60,"3d":3*24*60,"7d":7*24*60,"30d":30*24*60};

/* THE ONE LIST, for the reason `feedWindowLabel` reads it too: a key the
   exported type and `FIXED_MINUTES` both accept, refused by the exported
   guard, is the second code path the comment above says this file avoids.
   Nothing calls this from `app/` today — which is exactly why it would be
   wrong when something persisting or URL-parsing a window finally does. */
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
 if(key==="previous")return feedWindowRange(key,now,settings)?.max??null;
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

/* AND WHETHER THE WINDOW SOMEBODY PICKED IS ACTUALLY IN FORCE.

   `feedWindowRange` and `feedWindowLabel` degrade TOGETHER to "no window"
   when the clock cannot answer — a shift somebody has edited into a shape with
   no window covering now, or a `now` that cannot be read at all. That pairing
   is deliberate and is the right failure: a narrowed board under a heading
   saying THIS SHIFT is the one outcome this file exists to prevent.

   But it leaves the drop-down reading THIS SHIFT over the WHOLE history with
   nothing on screen saying why, which is its own small lie — the control
   claims a state the list does not have. So the degradation is made askable
   rather than silent, in one function both screens read, because two pages
   each re-deriving "the key is not ALL and the limit came back null" are two
   pages that will eventually disagree about when to warn.

   ALL is never unresolved: it is the absence of a window, not a failure to
   resolve one. */
export function feedWindowUnresolved(key:FeedWindowKey,now:Date=new Date(),settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS){
 return key!=="all"&&feedWindowRange(key,now,settings)===null;
}

/* THE SHIFT BEFORE THIS ONE, as the real instants it began and ended.

   "Before this one" is by START: of every shift start, the latest one earlier
   than the start of the shift that owns now. With the shop's hours that is 1st
   during 2nd, 2nd during 3rd, and 3rd during 1st. `start` and `end` are that
   shift's own hours; the WINDOW stops where this shift starts - see
   `feedWindowRange`.

   BUILT FROM LOCAL DATES rather than by subtracting clock minutes, for the
   reason TODAY is: `new Date(y,m,d,h,mm)` is the real instant that clock time
   happened, on a daylight-saving day too. Null when no shift owns now (hours
   edited into a shape with a gap) or the clock cannot be read - the same
   degradation THIS SHIFT has. */
export function previousShift(now:Date=new Date(),settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS):{key:ShiftKey;start:Date;end:Date}|null{
 const at=now.getTime();
 if(Number.isNaN(at))return null;
 const current=activeShift(now,settings);
 if(!current)return null;
 const runs:{key:ShiftKey;start:Date;end:Date}[]=[];
 for(let day=-2;day<=0;day++)for(const shift of settings.shifts){
  const start=clockMinutes(shift.start),end=clockMinutes(shift.end);
  if(start===null||end===null)continue;
  const from=new Date(now.getFullYear(),now.getMonth(),now.getDate()+day,Math.floor(start/60),start%60);
  let to=new Date(now.getFullYear(),now.getMonth(),now.getDate()+day,Math.floor(end/60),end%60);
  if(to.getTime()<=from.getTime())to=new Date(now.getFullYear(),now.getMonth(),now.getDate()+day+1,Math.floor(end/60),end%60);
  runs.push({key:shift.key,start:from,end:to});
 }
 const started=(run:{start:Date})=>run.start.getTime()<=at;
 const latest=<T extends {start:Date}>(list:T[])=>list.reduce<T|null>((best,run)=>!best||run.start.getTime()>best.start.getTime()?run:best,null);
 const running=latest(runs.filter(run=>run.key===current.key&&started(run)));
 if(!running)return null;
 return latest(runs.filter(run=>run.start.getTime()<running.start.getTime()));
}

/* HOW OLD A DEFECT MAY BE AND STILL BE IN THE WINDOW, as a range of ages in
   minutes: `min` is the near edge and `max` the far one; `min` is left off
   for every window that reaches all the way to now. Null is ALL, or a
   window the clock cannot resolve - see `feedWindowMinutes`, which is `max`.

   Every window but PREVIOUS SHIFT starts at age 0. PREVIOUS SHIFT starts
   exactly where THIS SHIFT stops - at THIS SHIFT's own `since`, measured the
   same way - so a defect is in one of the two and never both.

   THE HANDOVER BELONGS TO THE INCOMING SHIFT, the rule `activeShift` and the
   shift clock already follow and Curtis chose: 14:00-14:30 is 2nd shift's
   half-hour. Ending the window at 1st shift's own 14:30 instead would put a
   defect logged at 14:15 under both THIS SHIFT and PREVIOUS SHIFT. So the
   window is 06:00 to 14:00 and its label says so. Sharing THIS SHIFT's own
   measure also means a daylight-saving night cannot open a gap between them. */
export type FeedWindowRange={min?:number;max:number};
export function feedWindowRange(key:FeedWindowKey,now:Date=new Date(),settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS):FeedWindowRange|null{
 if(key==="previous"){
  const shift=previousShift(now,settings),current=activeShift(now,settings);
  if(!shift||!current)return null;
  const min=current.since;
  return {min,max:Math.max(min,(now.getTime()-shift.start.getTime())/60000)};
 }
 const max=feedWindowMinutes(key,now,settings);
 return max===null?null:{max};
}

/* AND WHAT TO SAY ABOUT IT, here rather than on each screen, for the reason
   `feedWindowLabel` is here: two pages wording the same degradation differently
   is how somebody learns the message is decoration.

   TWO CAUSES AND TWO SENTENCES, because "the shift hours cover no window that
   includes now" and "this device's clock cannot be read" send a person to
   different places — Settings in the first case, the phone itself in the
   second. A single sentence covering both would be wrong half the time, which
   is how a warning stops being read. Only `shift` and `previous` can reach the first; `today`
   is the only other key that can degrade at all, and only on a broken clock. */
export function feedWindowUnresolvedNote(key:FeedWindowKey){
 if(key==="shift"||key==="previous")return "SHIFT HOURS DO NOT COVER NOW — SHOWING EVERY DATE";
 return "THIS DEVICE'S CLOCK CANNOT ANSWER — SHOWING EVERY DATE";
}

/* Zero is a real limit. Standing at 14:00 exactly, the shift is zero minutes
   old and only something logged this minute belongs in it; at 00:00 the same
   is true of TODAY. `if(!limit)` would read either as "no window" and hand back
   the whole board, so the null check is explicit. */
export function withinFeedWindow(minutes:number|null,limit:number|null,floor?:number){
 if(limit===null)return true;
 /* The near edge, only PREVIOUS SHIFT has one. Left off, nothing changes for
    the other windows - including a record a wrong clock stamped in the future,
    which has always counted as new. EXCLUSIVE, because THIS SHIFT's far edge
    is inclusive at the same age: a defect logged the minute this shift began
    is this shift's, and in exactly one of the two windows. */
 if(floor!==undefined&&(minutes===null||minutes<=floor))return false;
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
export function defectWithinFeedWindow(defect:StructuredDefect,limit:number|null,now:Date=new Date(),floor?:number){
 /* A ROW READ OFF A SCANNED SHEET IS OUT OF EVERY NARROWED WINDOW, because its
    `createdAt` is WHEN THE SCAN RAN rather than when anybody logged anything.
    Importing yesterday's paper at 20:00 would drop that whole sheet into TODAY,
    LAST 24H and THIS SHIFT at once, on a list whose entire claim is "this is
    what got logged".

    Curtis, choosing this over marking them: "I have no reason to share
    something off the down sheet because the down sheet is already coming from
    the source... for this particular function, no, just things that were
    logged by hand."

    AND AT THE ONE CALLER THIS FILE HAS TODAY, THE GUARD NEVER FIRES. A cold
    read caught the claim this comment used to make. The Defect Log's feed is
    built by `defectLogRecords`, which filters `defect.source==="defect-log"`
    before anything here sees a record, and `loggedByHand` is `source !==
    "down-sheet"` - so every record reaching this function already satisfies it.
    The line that was removed from here said "ALL still shows them", which was
    the opposite of true: on that screen a scanned row is not in ALL either,
    because it never enters the list at all. The wrong account was more
    dangerous than the dead line, since it described a behaviour somebody could
    go looking for.

    IT STAYS, as a property of the question rather than of today's caller. This
    is the function that answers "is this defect inside this window", for the
    feed and for anything that asks later off a list assembled some other way -
    a whole-fleet read, an export, a route. The filter that currently makes it
    moot lives in a different module and is not this function's to rely on. The
    place the same rule is LIVE is the DEFECTS LOGGED quick filter, which runs
    over the board's own defects. */
 if(limit!==null&&!loggedByHand(defect))return false;
 return withinFeedWindow(loggedMinutesElapsed(defect,now),limit,floor);
}

/* AND FIXED REPAIRS ASKS WHEN IT WAS FINISHED, which is the same window around
   the opposite stamp.

   Curtis: "any repairs I fixed in the past day or two." A repair reported on
   Monday and finished this morning belongs in TODAY, so this cannot be
   `defectWithinFeedWindow` — that one deliberately refuses to follow an edit,
   and a completion is the one edit that IS the event being asked about.

   The comparison itself is `withinFeedWindow`, shared, so there is one place
   that decides what a limit means and one place that decides what an undated
   record does. Only the stamp differs. */
export function fixedWithinFeedWindow(defect:StructuredDefect,limit:number|null,now:Date=new Date(),floor?:number){
 return withinFeedWindow(completedMinutesElapsed(defect,now),limit,floor);
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
 /* Names the shift and both ends of the WINDOW - "1ST SHIFT · 06:00–14:00",
    ending where this shift began, since the handover is this shift's - for
    the reason THIS SHIFT names its start. */
 if(key==="previous"){
  const shift=previousShift(now,settings),current=activeShift(now,settings);
  const clock=(at:Date)=>formatClock(at.getHours()*60+at.getMinutes());
  return shift&&current?shiftLabel(shift.key)+" · "+clock(shift.start)+"–"+current.start:"";
 }
 /* Checked the same way the limit is, so the pair cannot disagree about whether
    there is a window at all. */
 if(key==="today")return Number.isNaN(now.getTime())?"":"TODAY";
 /* THE SAME TABLE THE LIMIT COMES OFF, which is why there is only one of them
    now. Caught by a test rather than by reading, back when there were two:
    `30d` resolved to 1440*30 minutes through `FIXED_MINUTES` and to "" here,
    which is the precise pairing this file's own header calls the one outcome
    worth writing code to prevent. */
 return FEED_WINDOWS.find(item=>item.key===key)?.label||"";
}
