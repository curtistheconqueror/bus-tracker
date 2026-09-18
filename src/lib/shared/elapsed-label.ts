/* "3H 12M". One copy, because there were three.

   The DEFERRED board, the deferred quick-filter row and now the RECOMMENDED
   board all print how long something has been sitting, and each had spelled it
   out for itself — one rounding the minutes, one flooring them, one flooring
   the hours and rounding the remainder. Nobody would ever have noticed them
   disagreeing by a minute, which is exactly why they would have kept drifting.

   Floored at zero on purpose. A device with a wrong clock, or a record synced
   from one, can produce a stamp in the future; "-4M" printed on a board reads
   as a bug in the app rather than a bug in a clock. */
export function elapsedShort(minutes:number|null){
 if(minutes===null)return "";
 const whole=Math.max(0,Math.round(minutes));
 return whole>=60?Math.floor(whole/60)+"H "+(whole%60)+"M":whole+"M";
}

/* Days once it stops being a shift-length number.

   A recommendation can legitimately sit for a week — Curtis: "that bus could be
   in that status for a while, which is fine" — and "193H 40M" is a number
   nobody reads as eight days. Deferrals never get here in practice, so this is
   the recommended list's own reading of the same clock rather than a change to
   what DEFERRED prints. */
export function elapsedLong(minutes:number|null){
 if(minutes===null)return "";
 const whole=Math.max(0,Math.round(minutes));
 if(whole<60*24)return elapsedShort(whole);
 const days=Math.floor(whole/(60*24)),hours=Math.floor((whole%(60*24))/60);
 return days+"D"+(hours?" "+hours+"H":"");
}
