/* WHERE A DOWN SHEET ROW CAME FROM, AND WHAT TAKES IT OFF.

   Curtis set the rule: "a bus having a downsheet badge on it is because the
   downsheets that were scanned show the bus on the downsheet. If I upload the
   new sheets, the badge goes away. Simple. We have to assume that it was
   fixed, unless we decide to add the bus to the downsheet from the app
   directly."

   So THE SCANNED SHEET IS THE PREDICATE, not the map. Two consequences, and
   both of them are rules rather than features.

   MARKING A BUS FIXED IS NOT IN THIS FILE, deliberately. `markEntryFixed` in
   `app/down-sheet/page.tsx` already does it and does far more than a row
   edit: it confirms first, completes the BUS'S DEFECT, recomputes the status,
   teaches the findings memory and writes an undo copy before any of it. A
   second, thinner spelling of that action here would be the same two-copies
   mistake this sheet has already been bitten by twice. When the Facility Map
   gets Curtis's shortcut, that function is what has to move into
   `src/lib/down-sheet/` — all of it, not a subset.

   WHAT IS HERE: A ROW THE APP ADDED IS NOT A ROW OFF THE OFFICE SHEET. "If we add it
   directly, it will show the badge. It probably needs to be with an asterisk
   ... a little label or something that says added from app or added manually.
   That way, at least, we'll know that it was not on the downsheet originally.
   Once the new sheet is scanned and then it has the bus on there, we know it
   wasn't fixed, and now it's officially on the master downsheet from the
   office."

   ABSENT MEANS NOTHING IS CLAIMED. Every row already on a device predates this
   field, and there is no way to know now whether it came off paper or was
   typed in. Labelling those would assert something false about the office's
   own sheet, so the label appears only where the app KNOWS it created the row.
   A scan never sets the flag, which is also what makes the promotion Curtis
   describes work on its own: the next scanned sheet replaces the row with one
   that has no flag, and the label goes away because the bus is on the master
   sheet now.

   IT TRAVELS WITHOUT A MIGRATION. `ENTRY_COLUMNS` in `cloud-sync.ts` lists the
   columns an entry has of its own; everything else rides in the row's `detail`
   blob and survives the round trip, which is how `updatedBy` already reaches
   other devices. Nothing here needs a write to the live database. */

export type OriginEntry={addedInApp?:boolean};

/* Only ever `true`, and only ever present when true. A key holding `undefined`
   is still a key to `Object.keys`, and `rowFingerprint` walks exactly that —
   writing `addedInApp:undefined` onto every row would change every row's
   fingerprint and re-push the whole sheet over the garage's data plan to say
   nothing. The spelling `setBusHold` and the ledger's `gap` already use. */
/* Unconstrained on purpose. Constrained to `OriginEntry`, TypeScript infers
   the parameter as that type when it is handed an object literal and then
   excess-property-checks every other field on it, so stamping a brand new
   Down Sheet row — which is exactly the call site this exists for — failed to
   compile. The return type says what is added instead. */
export function markAddedInApp<T>(entry:T):T&{addedInApp:true}{
 return {...entry,addedInApp:true};
}

export function wasAddedInApp(entry:unknown){
 return (entry as OriginEntry)?.addedInApp===true;
}

/* What the row says about itself. Empty for a row off a scanned sheet and for
   every row that predates the field — the label's whole job is to say "this
   was NOT on the office's sheet", so saying nothing is the honest default. */
export const ADDED_IN_APP_LABEL="ADDED MANUALLY";
export function entryOriginLabel(entry:unknown){
 return wasAddedInApp(entry)?ADDED_IN_APP_LABEL:"";
}
