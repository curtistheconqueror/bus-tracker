/* What makes two repair records the same repair.

   This used to live inside the duplicate cleanup, because cleaning up
   afterwards was the only thing that asked the question. The Down Sheet now
   asks it BEFORE it writes — a repair a bus is already carrying gets updated
   rather than recorded a second time — and the cleanup imports the sheet, so
   the rule cannot live in either file without the two importing each other.

   It is one copy on purpose. Two would drift, and the symptom would be silent:
   duplicates quietly coming back on a board nobody is auditing. */

import {defectSupportingDetails,isUnresolved,normalizeDefects,type StructuredDefect} from "./repair-catalog.ts";

export type DuplicateBus={id:string;n?:string;defects?:StructuredDefect[];pendingRepair?:string};

/* Category, symptom and details, with case and run-together spacing removed.

   Deliberately NOT the printed label. Two records can print the same line while
   differing in a field the label leaves out, and a printed line is a
   presentation decision that will change again; identity for a stored record
   has to be about what the record says. */
export function defectFingerprint(defect:{category?:string;issue?:string;details?:string}){
 return [defect.category,defect.issue,defect.details]
  .map(value=>String(value??"").trim().toLowerCase().replace(/\s+/g," "))
  .join("|");
}

/* What an untyped defect normalizes to: the catch-all category and symptom the
   app supplies when somebody logs a fault and writes nothing about it.

   Derived by running a blank record through the same normalizer the board uses,
   rather than written out as two string literals, so that changing the
   placeholder upstream cannot silently turn this guard off. */
const PLACEHOLDER_FINGERPRINT=defectFingerprint(
 normalizeDefects([{id:"placeholder",category:"",issue:"",details:"",operability:"service",state:"open"}])[0]);

/* Whether a record says enough about itself to be called a repeat of another.

   Two records that are nothing but the placeholder — no details, no category
   anybody chose, no symptom anybody chose — are indistinguishable, but that is
   not evidence they are the same fault. They are just as likely to be two
   different problems nobody typed up, and collapsing them would delete a real
   defect with no way for anyone to notice. Being indistinguishable is a reason
   to leave them alone, not a licence to merge. */
export function comparableFingerprint(fingerprint:string){
 return /[a-z0-9]/.test(fingerprint)&&fingerprint!==PLACEHOLDER_FINGERPRINT;
}

/* The two ways one stored record gets written down on a sheet.

   A repair card the app builds from a defect carries that defect's SUPPORTING
   text — the diagnostic lamp and its alarm number, then the reported symptoms,
   then the free-text note — rather than the bare details field, because on a
   Down Sheet that is the line that decides what the bus needs. Both spellings
   describe the same record, so a card matches either one. Without the second, a
   bus the app itself pulls onto the sheet comes back carrying its own defects a
   second time, which is the exact failure this is here to stop.

   Still exact text either way. Nothing here guesses that two differently worded
   records are "probably" the same thing. */
function writtenFingerprints(defect:StructuredDefect){
 const stored=defectFingerprint(defect);
 const supporting=defectFingerprint({category:defect.category,issue:defect.issue,details:defectSupportingDetails(defect)});
 return stored===supporting?[stored]:[stored,supporting];
}

/* The record already on the bus that a repair about to be written IS, if there
   is one.

   Only an exact repeat matches, so a genuinely different fault on the same bus
   still becomes its own record. `taken` holds ids already claimed earlier in the
   same save, so two cards on one entry can never both land on one record. */
export function adoptableDefect(
 defects:StructuredDefect[],
 repair:{category?:string;issue?:string;details?:string},
 taken?:ReadonlySet<string>
){
 const wanted=defectFingerprint(repair);
 if(!comparableFingerprint(wanted))return undefined;
 return defects.find(defect=>
  isUnresolved(defect)&&!taken?.has(defect.id)&&writtenFingerprints(defect).includes(wanted));
}

/* What a scan should write to instead of minting a new record.

   When a sheet photo brings in a repair for a bus, and the bus already carries
   an unresolved record saying exactly that, the scan belongs on the record that
   is already there. Returning its id lets the import adopt it, and the second
   scan of the same paper updates one record rather than adding a second.

   Every one of the 25 duplicates found on the live board would have been
   prevented by this. */
export function matchingUnresolvedDefectId(
 bus:DuplicateBus|undefined,record:{category?:string;repair?:string;reason?:string}
){
 if(!bus)return undefined;
 return adoptableDefect(
  normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id),
  {category:record.category,issue:record.repair,details:record.reason})?.id;
}
