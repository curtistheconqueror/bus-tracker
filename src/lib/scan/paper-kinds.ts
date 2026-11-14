import {TRACKER_PAGES} from "../settings/tracker-pages.ts";

/* THE PAPER THIS SHOP PHOTOGRAPHS, in one table.

   Three sheets get scanned, through three buttons on two pages, and the person
   holding the paper had to know which button reads which sheet. Getting it
   wrong was not a cosmetic mistake: a Vehicle Down Sheet once went through the
   farebox scanner and filed 24 records that did not exist.

   SCAN PAPER is one door in front of the three. It needs to know, for every
   kind of paper: what to call it, which page reads it, and how to tell it from
   the other two. That is this table and nothing else is. The cheap first read
   builds its question from `looksLike`, the screen draws `label`, and the
   address a page is sent to comes from `route` — so a fourth sheet is one row
   here plus its own scanner, not a hunt through a route, a component and two
   pages.

   WHAT IT DOES NOT HOLD. How a sheet is READ stays with that sheet's own
   scanner and its own route: what an N/R means, what a tick means, which rows
   are real. This table only says which of them a page belongs to. */

export type PaperKind="down-sheet"|"sweep"|"heat";

export type PaperKindInfo={
 kind:PaperKind;
 /* What the sheet is called in a sentence, capitals where a person puts them. */
 name:string;
 /* The same name shouted, for a heading or a button. Derived below, never
    typed: a second string holding "VEHICLE DOWN SHEET" is the duplication
    `SITE_ORGANIZATION_CAPS` was written to avoid. */
 label:string;
 /* The page whose scanner reads it. A route, never a page name: the name is
    looked up in the one table that owns page names. */
 route:string;
 /* How to tell it from the others, in the words given to the reader. All
    three are lists of five-digit bus numbers, so each description leads with
    what is printed on the page rather than what is written on it. */
 looksLike:string;
};

const SHEETS:readonly Omit<PaperKindInfo,"label">[]=[
 {kind:"down-sheet",name:"Vehicle Down Sheet",route:"/down-sheet",
  looksLike:"A Vehicle Down Sheet: a table of numbered lines, each holding a bus number, a written reason the bus is down, and a mechanic or location. It may be banded under headings such as OFF PROPERTY, SCHEDULED, UNSCHEDULED or INSPECTIONS, with a foreman and shift line at the top. Each line is a sentence of handwriting, not a tick."},
 {kind:"sweep",name:"farebox / Ventra sweep",route:"/defect-log",
  looksLike:"A farebox or Ventra check-off sheet: a printed grid of bus numbers repeated in three column groups, with narrow cells holding ticks, dashes, ER or X. Its title reads \"Make sure the Ventra is working\" (columns Bus #, DT, MV) or \"Fareboxes check off sheet\" (columns Bus #, Farebox power, Bills Trans, Coin Mech, Initial)."},
 {kind:"heat",name:"heat check sheet",route:"/defect-log",
  looksLike:"A heat check sheet: a printed list of bus numbers repeated in three column groups, headed BUS LIST with each group headed Bus. Beside each number are three hand-filled cells: a result written as OK or N/R, a date, and the checker's initials."},
];

export const PAPER_KINDS:readonly PaperKindInfo[]=SHEETS.map(sheet=>({...sheet,label:sheet.name.toUpperCase()}));

/* No more photos than any one scanner will take, so a hand-off can never be
   cut short on arrival. Every scanner's own limit is this number. */
export const PAPER_MAX_PHOTOS=6;

export function isPaperKind(value:unknown):value is PaperKind{return PAPER_KINDS.some(item=>item.kind===value)}

/* A kind that is not in the table is a bug in the caller, and it is thrown
   rather than answered. This fell back to the first row once, and the first
   row is the Down Sheet: the one scanner whose import replaces a record was
   the default for a kind nobody had heard of. */
export function paperKind(kind:PaperKind):PaperKindInfo{
 const found=PAPER_KINDS.find(item=>item.kind===kind);
 if(!found)throw new Error("Unknown kind of paper: "+String(kind));
 return found;
}

/* A sheet's name with its article. Shouted for a heading: "A VEHICLE DOWN
   SHEET". In a sentence: "a farebox / Ventra sweep". */
function article(name:string){return /^[aeiou]/i.test(name)?"an ":"a "}
export function paperNamed(kind:PaperKind):string{const {label}=paperKind(kind);return article(label).toUpperCase()+label}
export function paperNamedInSentence(kind:PaperKind):string{const {name}=paperKind(kind);return article(name)+name}

/* Every sheet SCAN PAPER takes, as the start of a sentence: "A Vehicle Down
   Sheet, a farebox / Ventra sweep, or a heat check sheet". The screen's own
   introduction is this, so a sheet added to the table is in it. */
export function paperListWords():string{
 const names=PAPER_KINDS.map(item=>paperNamedInSentence(item.kind)),last=names.length-1;
 const list=names.length<3?names.join(" or "):names.slice(0,last).join(", ")+", or "+names[last];
 return list.charAt(0).toUpperCase()+list.slice(1);
}

/* The name of the page that reads a kind, from the table every nav draws. A
   route this app has no page for reads as the route itself, which is ugly and
   is meant to be: it is the sign somebody added a kind and no page. */
export function paperPageLabel(kind:PaperKind):string{
 const route=paperKind(kind).route;
 return TRACKER_PAGES.find(page=>page.href===route)?.label||route;
}

/* HOW ONE PAGE ASKS ANOTHER TO OPEN A SCANNER.

   `?scan=heat` was already how Fleet Campaigns opens the heat scanner on the
   Defect Log. This is that address for every kind, so there is one spelling of
   it. `photos` says how many photographs are meant to arrive with the request:
   they travel in memory, not in the address, and the number is how the page
   that receives the request can tell "nobody sent any" from "they were sent
   and did not make it". */
export const PAPER_SCAN_PARAM="scan";
export const PAPER_PHOTOS_PARAM="photos";

export function paperScanHref(kind:PaperKind,photos=0):string{
 const count=Math.max(0,Math.min(PAPER_MAX_PHOTOS,Math.floor(Number(photos)||0)));
 return paperKind(kind).route+"?"+PAPER_SCAN_PARAM+"="+kind+(count?"&"+PAPER_PHOTOS_PARAM+"="+count:"");
}

/* What an address is asking the page at `here` to do, or null when it asks
   nothing of that page. A kind this page does not read is nothing: the Down
   Sheet opened with `?scan=heat` has no heat scanner to open, and opening the
   wrong one is the mistake this whole module exists to stop. */
export function paperArrival(search:string,here:string):{kind:PaperKind;expected:number}|null{
 let params:URLSearchParams;
 try{params=new URLSearchParams(search)}catch{return null}
 const kind=params.get(PAPER_SCAN_PARAM);
 if(!isPaperKind(kind)||paperKind(kind).route!==here)return null;
 const raw=params.get(PAPER_PHOTOS_PARAM)||"",count=/^\d{1,2}$/.test(raw)?Number(raw):0;
 return {kind,expected:Math.min(PAPER_MAX_PHOTOS,count)};
}
