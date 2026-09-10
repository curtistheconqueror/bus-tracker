/* "JUST THE LAST FEW HOURS OF THIS LIST."

   Curtis: "let's say there's 20 buses on either list, if those 20 buses were
   collected over the period of three days, I wanna be able to filter it down to
   just the most recent 24 hours, so the most recent five hours or whatever the
   case may be — if I don't want to send that whole list to somebody."

   THE PURPOSE IS THE SHARE, and that decides two things about how this behaves.
   The list a foreman copies out of the app is read by somebody who cannot see
   the screen it came from, so the window has to travel with it in the heading —
   a bare list of six buses is not the same message as "six buses in the last
   four hours". And the window narrows the SHARED list too, not just the drawn
   one; a filter that tidies the screen and then pastes all twenty anyway is
   worse than no filter, because it lies at the only moment that matters.

   BOTH LISTS AND ONLY THESE TWO. DEFERRED and RECOMMENDED FOR DOWN SHEET are
   the two that accumulate — each row carries a stamp of when somebody made a
   decision, and both can run for days. Curtis: "only as it relates to these two
   fields." The other quick filters answer "what is true right now" (down,
   mystery, parts on order), where the age of the record is not what is being
   asked, and offering a window there would invite somebody to hide a bus that
   is down today because it went down on Monday. */

export type TimeWindowKey="all"|"1h"|"4h"|"8h"|"24h"|"3d"|"7d";

/* Short enough to sit in one row on a 360px phone, and spaced the way a shift
   is actually thought about: the last hour, half a shift, a shift, a day, then
   two spans that only the recommended list normally reaches. */
export const TIME_WINDOWS:{key:TimeWindowKey;label:string;minutes:number}[]=[
 {key:"all",label:"ALL",minutes:0},
 {key:"1h",label:"1H",minutes:60},
 {key:"4h",label:"4H",minutes:4*60},
 {key:"8h",label:"8H",minutes:8*60},
 {key:"24h",label:"24H",minutes:24*60},
 {key:"3d",label:"3D",minutes:3*24*60},
 {key:"7d",label:"7D",minutes:7*24*60},
];

export function timeWindowMinutes(key:TimeWindowKey){
 return TIME_WINDOWS.find(window=>window.key===key)?.minutes||0;
}

/* AN UNDATED ROW FALLS OUT OF EVERY NARROWED WINDOW, and stays in ALL.

   A recommendation stamped before the field carried an `at`, or by a device
   with no clock, has no age at all. Keeping it in "the last 4 hours" would put
   a row of unknown age into a list whose entire claim is that everything in it
   is recent; dropping it from ALL would hide a real bus. So it is in the list
   that promises nothing and out of the ones that promise something, and the
   count beside the chips is what says how many that cost.

   Elapsed is compared as given, including a negative: a stamp in the future
   comes from a wrong clock, and such a row is newer than anything real rather
   than older. The boards floor the DISPLAYED number at zero, which is a
   separate decision about not printing "-4M" at somebody. */
export function withinTimeWindow(minutes:number|null,key:TimeWindowKey){
 const limit=timeWindowMinutes(key);
 if(!limit)return true;
 return minutes!==null&&minutes<=limit;
}

/* What the heading of a shared list says. "" for ALL, because a list with no
   window is just the list and saying so would be noise. */
export function timeWindowLabel(key:TimeWindowKey){
 const window=TIME_WINDOWS.find(item=>item.key===key);
 return !window||!window.minutes?"":"LAST "+window.label;
}
