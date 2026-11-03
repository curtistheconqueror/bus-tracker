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

   ALL FOUR CREATION PATHS STAMP, OR NONE SHOULD. The first version stamped
   two of them — ADD DOWN BUS and the row minted from the board's `down`
   flag — and left the map's ON DOWN SHEET tick and the Defect Log's untagged.
   That is worse than stamping none: while absence only described records that
   predate the field it claimed nothing, but once SOME app rows carry the tag,
   a row WITHOUT it reads as having come off the office's sheet — and the
   commonest gesture on the map was writing exactly that falsehood. A cold read
   reproduced it in the browser.

   ABSENT MEANS NOTHING IS CLAIMED, about records older than the field. Every row already on a device predates this
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

export type OriginEntry={addedInApp?:true};

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
export function markAddedInApp<T extends object>(entry:T):T&{addedInApp:true}{
 return {...entry,addedInApp:true};
}

/* THE PAPER CONFIRMS THE BUS, so the row stops being the app's own say-so.

   Curtis: "once the new sheet is scanned and then it has the bus on there, we
   know it wasn't fixed, and now it's officially on the master downsheet from
   the office."

   This existed only as a claim in a comment. A scan does NOT replace a row for
   a bus it names — `importScan` deliberately writes ONTO the active row so the
   defect it carries is not minted twice — and `{...prior}` carried the flag
   straight through, so a row tagged once stayed tagged for good, and the tag
   travelled to every device saying the office had never listed a bus the
   office had just listed.

   DELETED rather than set false. `"addedInApp" in entry` has to become false:
   the cloud fingerprints a row by walking `Object.keys`, so a key holding
   `undefined` is still a key and would move the fingerprint of every row it
   touched. The spelling `setBusHold` and the ledger's `gap` already use. */
export function clearAddedInApp<T extends object>(entry:T):T{
 if(!("addedInApp" in entry))return entry;
 const next={...entry} as T&OriginEntry;
 delete next.addedInApp;
 return next;
}

export function wasAddedInApp(entry:unknown){
 return (entry as OriginEntry)?.addedInApp===true;
}

/* What the row says about itself. Empty for a row off a scanned sheet and for
   every row that predates the field — the label's whole job is to say "this
   was NOT on the office's sheet", so saying nothing is the honest default. */
/* "VIA APP" RATHER THAN "MANUALLY", and Curtis chose between the two wordings
   he had offered once the reason was put to him. The tag goes on two kinds of
   row: one a person typed into ADD DOWN BUS, and one the app MINTED by itself
   because the board said the bus was down. Nobody typed the second, so
   "manually" was simply false about it — while what both rows have in common,
   which is the whole point of the tag, is that neither came off the office's
   scanned sheet. "VIA APP" says that about both. */
export const ADDED_IN_APP_LABEL="ADDED VIA APP";
export function entryOriginLabel(entry:unknown){
 return wasAddedInApp(entry)?ADDED_IN_APP_LABEL:"";
}
