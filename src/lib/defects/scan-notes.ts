/* Telling the scanner what the camera will get wrong, before it does.

   The photo reader is not pattern matching. It is a vision-language model
   reading the page under written instructions, and it follows a sentence the
   way a person would: "line 23 is 17565", "TIROS means tires", "the margin
   name is Carlos", "HAZMAT means a biohazard on board". The person holding the
   sheet often knows in advance which row is ambiguous — the pencilled margin,
   the smudged digit, the shop's own shorthand — and until now had no way to say
   so except by fixing the row afterwards on the review screen.

   So each scan can carry up to 500 characters of notes, and they go into the
   prompt beside the sheet. Two limits are built in, both deliberate:

   - A note describes the paper. It can correct HOW something written on the
     sheet is read; it can never add a bus, a row or a repair that is not on the
     sheet. The prompt says so, in those words, because a note that invented a
     bus would be indistinguishable from the sheet having had one.
   - Notes worth keeping — the shop's shorthand, the mechanics' names — can be
     remembered on the device so they are not retyped every morning. One-offs
     are not, unless asked. */

export const SCAN_NOTES_LIMIT=500;
export const SCAN_NOTES_KEY="pace-scan-notes-v1";

export type ScanNotesKind="down-sheet"|"sweep";

/* Anything below a space except tab and newline, plus DEL. Written as escapes
   so the file itself carries none of them. */
const CONTROL_CHARACTERS=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/* What reaches the model: trimmed, control characters gone, capped. The cap is
   applied on the server as well as in the box, since the box is only a box. */
export function cleanScanNotes(value:unknown):string{
 if(typeof value!=="string")return "";
 return value.replace(CONTROL_CHARACTERS,"").replace(/\r\n?/g,"\n").trim().slice(0,SCAN_NOTES_LIMIT);
}

/* The block appended to a scan prompt. Empty notes add nothing at all, so a
   scan without them is byte-for-byte the scan it was before. */
export function scanNotesPrompt(notes:string):string{
 const text=cleanScanNotes(notes);
 if(!text)return "";
 return "\n\nNOTES FROM THE PERSON SCANNING - facts about this particular sheet, written by the shop before the photo was read. Use them to read the sheet correctly: a note may say which bus number a line holds, what a word or abbreviation means, who a name is, or which rows are hard to read. A note can correct HOW you read something that is written on the sheet. A note can NEVER add a bus, a row, or a repair that is not written on the sheet: if a note names a bus that appears nowhere on the paper, do not emit a row for it. If a note contradicts what is clearly printed, follow the paper and say so in reviewNote.\n\n"+text;
}

type StoredNotes={version:1;"down-sheet":string;sweep:string};

/* Remembered notes, one text per scanner. Absent or unreadable means none. */
export function readScanNotes(raw:string|null,kind:ScanNotesKind):string{
 if(!raw)return "";
 try{
  const parsed=JSON.parse(raw) as Partial<StoredNotes>;
  return cleanScanNotes(parsed?.[kind]);
 }catch{return ""}
}

/* The text to store after a scan: the notes when the person asked to keep
   them, nothing when they did not — a one-off correction must not come back
   tomorrow as a standing instruction. The other scanner's notes are untouched. */
export function rememberScanNotes(raw:string|null,kind:ScanNotesKind,notes:string,keep:boolean):string{
 const other:ScanNotesKind=kind==="sweep"?"down-sheet":"sweep";
 const stored:StoredNotes={version:1,"down-sheet":"",sweep:""};
 stored[other]=readScanNotes(raw,other);
 stored[kind]=keep?cleanScanNotes(notes):"";
 return JSON.stringify(stored);
}
