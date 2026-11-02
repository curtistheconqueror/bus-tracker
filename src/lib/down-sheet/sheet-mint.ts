/* WHICH BUSES GET A ROW MINTED FOR THEM, and what the sheet's capacity means.

   The Down Sheet writes a row for every fleet bus still flagged `down` that
   has no row already. Two things about that were wrong in the page, and a cold
   read measured both on the built app rather than reading them off the code.

   ONE: THE CAP WAS DESTROYING STORED REPAIR RECORDS. The mint paths ended in
   `.slice(0,MAX_ENTRIES)` over the WHOLE sheet, history included, while every
   other use of that number in the app — the ADD DOWN BUS guard, the scan
   import's refusal, PUT BACK, the button's disabled state, the capacity tile —
   counts only the ACTIVE entries. Measured: seed 100 Completed rows and open
   the page, and 98 come back. `old-98` and `old-99` are gone from storage,
   with no prompt, no alert and no undo copy. CLAUDE.md has one line about
   that: "Never delete or merge repair records to simplify the UI. History is
   the point of the app."

   So nothing stored is ever dropped here. A sheet that is over capacity stays
   over capacity and is somebody's to work through; it is not the load path's
   business to decide which repairs stop existing.

   TWO: A BUS THAT IS GENUINELY DOWN WAS LOSING ITS ROW AND ITS BADGE. Because
   the cap counted history, a sheet holding 96 completed repairs had two mint
   slots left. Measured: 96 Completed rows plus five buses flagged down with no
   entry, and three of the five were dropped — then `reconcileDownSheetMembership`
   cleared their `down` flag, because no active entry existed for them. They
   came off the sheet AND off the map, silently, on a sheet nowhere near its 98
   ACTIVE capacity. The existing capacity alerts could not fire: they count
   active entries, and there were two.

   The cap is on ACTIVE entries now, which is what it means everywhere else,
   and anything left out is RETURNED rather than discarded, so the page can say
   so. A bus that is down and not on the sheet is a bus that goes back out
   broken, and the one unacceptable way for that to happen is quietly.

   Lives here rather than in `app/down-sheet/page.tsx` because it is a decision
   about records: `docs/ARCHITECTURE.md` is explicit that a rule computed
   inside a page has to be written a second time to be answerable from the MCP
   route, and the page already held two copies of this one. */

export type MintOptions<T>={
 /* How many ACTIVE entries the sheet may hold. */
 activeLimit:number;
 isActive:(entry:T)=>boolean;
 busIdOf:(entry:T)=>string;
};

export type MintResult<T>={
 /* Every stored entry, in order, plus whatever was minted. Never shorter than
    what came in. */
 entries:T[];
 added:T[];
 /* Candidates the active cap had no room for. Not an error and not dropped
    silently — these are buses flagged down with nowhere to say so. */
 skipped:T[];
};

export function addMintedEntries<T>(existing:T[],candidates:T[],options:MintOptions<T>):MintResult<T>{
 const entries=existing.slice();
 /* A BUS THAT ALREADY HAS A ROW DOES NOT GET A SECOND ONE, AND A COMPLETED ROW
    IS A ROW. Comparing against the ACTIVE entries alone is what made a bus
    whose only entry was Completed look like a bus with no entry at all, so the
    next load wrote a fresh Scheduled row under a new id and the repair
    re-opened itself. Every entry counts here, whatever its workflow. */
 const known=new Set(existing.map(entry=>options.busIdOf(entry)).filter(Boolean));
 let active=existing.filter(entry=>options.isActive(entry)).length;
 const added:T[]=[],skipped:T[]=[];
 for(const candidate of candidates){
  const busId=options.busIdOf(candidate);
  if(busId&&known.has(busId))continue;
  /* A minted row is always active, so this is the only count that moves. */
  if(active>=options.activeLimit){skipped.push(candidate);continue}
  entries.push(candidate);
  if(busId)known.add(busId);
  added.push(candidate);
  active+=1;
 }
 return {entries,added,skipped};
}

/* What to tell somebody when the sheet had no room. Named here so the two
   callers cannot word it differently, and phrased as the fleet numbers rather
   than a count: "three buses" sends nobody to the right bus. */
export function mintSkippedMessage(skipped:{busNumber?:string;busId?:string}[],activeLimit:number){
 if(!skipped.length)return "";
 const names=skipped.map(entry=>String(entry?.busNumber||entry?.busId||"?").trim()).filter(Boolean);
 return "The active down sheet is full at "+activeLimit+" buses, so "
  +(names.length===1?"bus "+names[0]+" is":"buses "+names.join(", ")+" are")
  +" flagged down with no row on it. Complete or remove a row to make space.";
}
