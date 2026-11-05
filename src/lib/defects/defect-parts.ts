/* MORE THAN ONE PART PER REPAIR.

   The record carried `partsUsed`, `partNumber` and `partName` — exactly one
   part — and Curtis hit the wall from the floor: *"we made a blooper, we
   assumed that each repair only takes one part. I just saved a fix like a bus
   and I was trying to find a way to add a second part."*

   A repair that takes a gasket AND the sensor behind it is ordinary work, and
   one pair of boxes forced a choice between them. So the record grows a
   `parts` array, and the two old fields become A READ OF ITS FIRST ENTRY
   rather than a second place that parts live.

   NOTHING ON DISK IS REWRITTEN. That is the rule this project already follows
   for catalog renames and for `repairItems` on a Down Sheet entry: a defect
   saved with one part reads back as a one-part array, computed at read time,
   and the stored record is left exactly as it was.

   THE FIRST PART IS STILL MIRRORED into `partNumber` and `partName` on save,
   and that is not duplication for its own sake. The Shop Cloud ships every
   field this app has no column for inside the row's `detail` blob, so a device
   on an older release receives `parts` and cannot read it. Mirrored, that
   device still shows the first part instead of none — the same shape the Down
   Sheet keeps by holding both `category`/`repair` and `repairItems`.

   WHY AN ID PER PART. A part is edited and removed by hand while the list is
   on screen, and keying rows by array index makes the row under somebody's
   finger change identity the moment a row above it is removed — which is how a
   list loses the wrong entry. The id is minted on creation and never read as
   meaning anything. */

export type DefectPart = {
  id: string;
  partNumber: string;
  partName?: string;
};

/* The legacy single-part fields, as they are stored on a defect today. */
export type LegacyPartFields = {
  partsUsed?: boolean;
  partNumber?: string;
  partName?: string;
};

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

/* A random tail, for the reason the swap ledger's ids carry one: two rows added
   in the same millisecond must not collide. */
export function blankDefectPart(): DefectPart {
  return { id: "part-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8), partNumber: "" };
}

/* EVERY PART ON A REPAIR, READ RATHER THAN STORED.

   An array wins when it has entries. Otherwise the legacy pair is read as the
   one part it describes — and `partsUsed` alone, with no number typed, still
   counts as one blank part so the form has a row to type into rather than
   appearing to have lost the box. */
export function normalizeDefectParts(value: unknown, legacy: LegacyPartFields = {}): DefectPart[] {
  if (Array.isArray(value)) {
    const parts = value
      .map((raw, index) => {
        const source = raw && typeof raw === "object" ? raw as Partial<DefectPart> : {};
        const partNumber = clean(source.partNumber);
        const partName = clean(source.partName);
        const id = clean(source.id) || "part-" + index;
        /* `delete`-style spelling: an absent name is absent, not an empty
           string, so a record does not grow a field that means nothing. */
        return partName ? { id, partNumber, partName } : { id, partNumber };
      })
      /* A row with neither a number nor a name is not a part. A row with only
         a NAME is kept: "the long bolt behind the alternator" is how a part
         gets recorded when nobody can find its number, and refusing it would
         throw away the only thing somebody knew. */
      .filter(part => Boolean(part.partNumber || part.partName));
    if (parts.length) return parts;
  }
  const partNumber = clean(legacy.partNumber);
  const partName = clean(legacy.partName);
  if (partNumber || partName) {
    const one: DefectPart = { id: "part-0", partNumber };
    if (partName) one.partName = partName;
    return [one];
  }
  /* PARTS USED was ticked and nothing was typed. The old record is exactly
     that shape, and `partNumberMissing` below is what flags it. */
  return legacy.partsUsed === true ? [{ ...blankDefectPart(), id: "part-0" }] : [];
}

/* WHAT GETS WRITTEN BACK, so one save cannot leave the array and the mirrored
   pair disagreeing. Blank rows are dropped here rather than stored — somebody
   pressing ADD PART and changing their mind must not leave an empty part on a
   repair's history. */
export function defectPartFields(parts: DefectPart[]): LegacyPartFields & { parts?: DefectPart[] } {
  const kept = parts.filter(part => Boolean(clean(part.partNumber) || clean(part.partName)));
  if (!kept.length) return { partsUsed: false, partNumber: "", partName: "" };
  const first = kept[0];
  const fields: LegacyPartFields & { parts?: DefectPart[] } = {
    partsUsed: true,
    partNumber: clean(first.partNumber),
    partName: clean(first.partName),
  };
  /* ONE PART STORES NO ARRAY AT ALL. The mirrored pair already says everything
     a single part can say, and a record that grew a `parts:[…]` for every
     one-part repair would move its own cloud fingerprint — `rowFingerprint`
     walks `Object.keys` — on a save that changed nothing a person could see. */
  if (kept.length > 1) fields.parts = kept;
  return fields;
}

/* THE RECORD, WITH THESE PARTS ON IT - the one place a defect's part fields are
   assembled, so a form cannot write the array and the mirrored pair out of step.
   `parts` is DELETED rather than set to undefined when a repair is back down to
   one, the spelling `setBusHold` and the swap ledger's `gap` already use: it is
   the only way `"parts" in defect` reads false, and `rowFingerprint` walks
   `Object.keys`, so a key holding undefined would still move the row's
   fingerprint on a push carrying nothing new. */
export function withDefectParts<T extends LegacyPartFields & {parts?:unknown}>(defect:T,parts:DefectPart[]):T{
 const next={...defect} as T & {parts?:DefectPart[]};
 delete next.parts;
 return Object.assign(next,defectPartFields(parts)) as T;
}

/* Does this repair claim parts and fail to name any of them?
   Replaces the single-part `partNumberMissing`, and keeps its answer for a
   one-part record: PARTS USED ticked with nothing typed is still the thing
   worth flagging on a Fixed Repairs card. A row carrying only a NAME is not
   missing — somebody recorded what they knew. */
export function defectPartsMissing(defect: LegacyPartFields & { parts?: unknown }): boolean {
  if (defect.partsUsed !== true) return false;
  const parts = normalizeDefectParts(defect.parts, defect);
  if (!parts.length) return true;
  return parts.every(part => !clean(part.partNumber) && !clean(part.partName));
}

/* How many of the named parts are still missing a number, for the form to say
   so beside the row rather than only on the card afterwards. */
export function partsWithoutNumbers(parts: DefectPart[]): DefectPart[] {
  return parts.filter(part => !clean(part.partNumber) && Boolean(clean(part.partName)));
}

/* ONE LINE OF PARTS, for a share, a card and the MCP's answers alike.
   Number first because that is what gets ordered; the name is the human check
   on it. */
export function defectPartsText(parts: DefectPart[]): string {
  return parts
    .map(part => {
      const number = clean(part.partNumber), name = clean(part.partName);
      if (number && name) return number + " (" + name + ")";
      return number || name;
    })
    .filter(Boolean)
    .join(", ");
}

/* THE LIST EDITS, kept here rather than in the form, because the Defect Log
   and Fixed Repairs both draw this list and a rule written twice drifts. Each
   returns a new array; none of them mutates. */
export function addDefectPart(parts: DefectPart[]): DefectPart[] {
  return [...parts, blankDefectPart()];
}

export function updateDefectPart(parts: DefectPart[], id: string, patch: Partial<Omit<DefectPart, "id">>): DefectPart[] {
  return parts.map(part => {
    if (part.id !== id) return part;
    const next: DefectPart = { ...part, ...patch };
    /* An emptied name is removed rather than kept as "", the spelling
       `setBusHold` uses, so a cleared box cannot read as a stored blank. */
    if (!clean(next.partName)) delete next.partName;
    return next;
  });
}

/* REMOVING THE LAST ROW LEAVES ONE BLANK ROW, not an empty list: the list is
   only on screen because PARTS USED is ticked, and an empty list would show a
   section with nothing in it and no way to type. Untick PARTS USED to say no
   parts were used. */
export function removeDefectPart(parts: DefectPart[], id: string): DefectPart[] {
  const kept = parts.filter(part => part.id !== id);
  return kept.length ? kept : [blankDefectPart()];
}

/* Which parts COULD be taught to the shop's memory: the ones carrying a
   number, since the memory is keyed on the number and a name alone teaches it
   nothing it could suggest later. Deduplicated, because two rows holding the
   same number are one part typed twice and must not count as two uses. */
export function partsToLearn(parts: DefectPart[]): DefectPart[] {
  const seen = new Set<string>();
  return parts.filter(part => {
    const number = clean(part.partNumber);
    if (!number || seen.has(number)) return false;
    seen.add(number);
    return true;
  });
}

/* AND THE ONE THE MEMORY ACTUALLY TAKES, which is the FIRST of them.

   This corrects a claim I made and a reviewer disproved. Both forms reduced
   `learnPart` over every numbered part and the change described that as "the
   shop learns every part now". `learnPart` keeps ONE entry per
   scope+category+issue and REPLACES it, so reducing over [HX-99, ZZ-1] leaves
   a single entry holding ZZ-1 with `uses:2` - the shop was taught the LAST
   part and the count was inflated, which is worse than teaching it one.

   So one part is learned, and it is the first row because that is the one the
   suggestion offers back. Teaching the memory more than one part per repair
   means giving it more than one slot per key, which changes what
   `pace-parts-memory-v1` holds and what `recallPart` can return - a different
   change, on the shop's own data, and not one to smuggle in here. */
export function partToLearn(parts: DefectPart[]): DefectPart | null {
  return partsToLearn(parts)[0] || null;
}
