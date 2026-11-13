import {defaultDefectOperability,defectShortLabel,isUnresolved,normalizeDefects,REPAIR_OPTIONS,type StructuredDefect} from "./repair-catalog.ts";
import {isNoHeatRepair,quickFilterDefects,type QuickFilterBus} from "./quick-filters.ts";
import {HEAT_SCAN_ID_PREFIX} from "./scan-batches.ts";

/* The heat check sheet, read from a photo.

   A printed list of the whole fleet that two people walk in the autumn, one bus
   per line, three hand-filled cells beside each number: the result, the date it
   was checked, and the checker's initials. Curtis: "we need to make a heat/no
   heat log. That can digest this page similarly to how the downsheet is
   cataloged."

   It is the same kind of paper as the farebox and Ventra sweep sheets, and this
   module is `sweep-scan-import.ts` again for a different column: the scan route
   returns what is written, this turns it into things a person can review, and
   NOTHING HERE FILES ANYTHING. It produces findings; the person approves.

   WHAT A MARK MEANS IS DECIDED HERE AND NOT BY THE MODEL, and further than the
   sweep takes it: the model is asked only to copy what is in the cell. "N/R" is
   a shop abbreviation that reads equally well as "needs repair" and as "no
   repair needed", which are opposite facts about a bus going into winter, and
   it was asked rather than guessed. Curtis: "Yes N/R needs repair". A model
   left to interpret it would pick one of the two per row.

   - ok      OK or OKAY — the heat works
   - repair  N/R or NR — the heat needs repair. This is the no-heat bus.
   - blank   nothing in the cell — nobody has checked it yet. NEVER read as
             working; a sheet part-way through the walk is mostly this.
   - unclear anything else — shown to a person, never filed

   A STRUCK-THROUGH ROW IS ITS OWN THING. Curtis: "struck means fixed but I'll
   double check." Until he has, a struck row files nothing and closes nothing —
   it is listed, with whatever the board still holds open against that bus, for
   somebody who knows. Not filing is safe under either reading; closing a repair
   off a pen line is not this module's call under any. */

export type HeatMark="ok"|"repair"|"blank"|"unclear";

export type ScannedHeatRow={
 pageNumber:number;
 busNumber:string;
 /* The result cell exactly as written — "N/R", "OK", "OKAY", "". */
 written:string;
 struck:boolean;
 /* The date cell exactly as written — "10/22". The paper carries no year. */
 date:string;
 initial:string;
 note:string;
 confidence:number;
 reviewNote:string;
};

/* The filter's own bus, with the fleet number required: this module asks a bus
   exactly what No Heat Buses asks it, so it takes exactly what that takes. */
export type HeatFleetBus=QuickFilterBus&{n:string};

/* What the review screen should do with a row.

   file            N/R on a bus the board holds no open heat repair against: a
                   new defect. Arrives ticked, EXCEPT where the board gives a
                   reason to doubt it is new — see `heldBack` below.
   already-tagged  N/R, and the board already says so: adds nothing
   check-board     the paper says OK or the row is struck, and the board still
                   holds an open heat repair — the two disagree and a person
                   settles it
   look            the row could not be used as read: no bus number, a number
                   the board does not have or has twice, a mark that is neither
                   word, a date or initials beside an empty result, or the same
                   bus written twice differently
   nothing         an empty line, or an OK or a struck row on a bus the board
                   has nothing open against */
export type HeatAction="file"|"already-tagged"|"check-board"|"look"|"nothing";

export type HeatFinding={
 key:string;
 busId:string;
 busNumber:string;
 pageNumber:number;
 mark:HeatMark;
 struck:boolean;
 written:string;
 /* The check date as a calendar day, YYYY-MM-DD, or "" when the cell was empty
    or could not be placed in a year. */
 checkedOn:string;
 dateWritten:string;
 initial:string;
 note:string;
 confidence:number;
 reviewNote:string;
 fleetMatch:"matched"|"unknown"|"duplicate";
 /* The reviewer unticked this row themselves. Set and cleared only by
    `tickHeatFinding`; `heatChecksFromFindings` reads it. */
 declined?:boolean;
 /* The open heat repairs the board already holds on this bus, by name. */
 openHeat:string[];
 action:HeatAction;
 /* A row that MAY be filed but arrives unticked, because the board suggests it
    is not new: a heat repair finished on or after the day of this check, or
    words about the heat already typed against the bus. The reason is in
    `reviewNote`. Ticking it is a person's decision and stays possible. */
 heldBack:boolean;
 selected:boolean;
};

/* The record an N/R becomes. A plain NO HEAT, which is the entry Curtis asked
   for in his own words — "I cannot always confirm why there is not heat on the
   spot, but I can confirm the heat doesn't work immediately" — and a walk down
   a list with a clipboard is exactly that: the checker knows the bus is cold
   and nothing about why. */
export const HEAT_CATEGORY="A/C and HVAC" as const;
export const HEAT_ISSUE="Heating - No heat" as const;

function clean(value:unknown){return typeof value==="string"?value.trim():""}
function busDigits(value:unknown){return clean(value).replace(/\D/g,"").slice(0,5)}
function confidence(value:unknown){const n=typeof value==="number"?value:Number(value);return Number.isFinite(n)?Math.min(1,Math.max(0,n)):0}

/* A SCANNED bus number is never cut down to fit.

   The fleet's own numbers are trimmed to five digits because they are the
   fleet's. A number off a photo is a reading, and trimming a reading turns a
   wrong one into a right-looking one: "175111" became 17511 and filed there,
   and a cell holding "17512 / 17514" became 17512 with the second bus gone.
   Every digit is kept, so a reading that is not one bus number matches no bus
   and goes to a person. */
function scannedBus(value:unknown){return (clean(value).match(/\d+/g)||[]).join("").slice(0,12)}

/* What sits in a cell, as text. A value that is not a string is not an empty
   cell — it is the route returning something this module does not understand,
   and reading it as blank would file it under "nobody checked this bus". It is
   not the word it happens to print as, either: an array holding "N/R" prints
   as N/R and is still not a cell somebody read. The leading "?" keeps it out
   of both piles and shows on the review row. */
function cell(value:unknown,limit:number){
 if(value===null||value===undefined)return "";
 return (typeof value==="string"?value:"? "+String(value)).trim().slice(0,limit);
}

/* Spaces and full stops are how the same two letters get written six ways.
   The separator in N/R is whatever the pen did — a slash, a backslash, a bar, a
   dash, or nothing at all, and the first sheet photographed has plain "NR" on
   a good share of its rows. A zero for the O is a camera reading, not a
   different word. */
export function heatMark(written:unknown):HeatMark{
 const text=cell(written,24).toUpperCase().replace(/[\s.]/g,"");
 /* A lone dash is how a model writes "nothing here" when it will not return an
    empty string. Read as unclear, a half-walked sheet — mostly empty cells —
    came back as a page where most of what was "written" was neither word, and
    the whole page was held as not looking like a heat sheet. */
 if(!text||/^[-–—_]+$/.test(text))return "blank";
 if(/^[O0]K(?:AY)?$/.test(text))return "ok";
 if(/^N[\/\\|-]?R$/.test(text))return "repair";
 return "unclear";
}

/* How far back a date with no year is allowed to land. The heat walk is one
   season, so a date that resolves to most of a year ago is a misread month far
   more often than it is a real check — a "10/22" that came back as "12/22" in
   November is last December on the calendar and nonsense on the paper. */
export const HEAT_CHECK_MAX_AGE_DAYS=183;

function ymd(year:number,month:number,day:number){
 return String(year).padStart(4,"0")+"-"+String(month).padStart(2,"0")+"-"+String(day).padStart(2,"0");
}

/* The calendar day an instant falls on, on THIS device's clock. Exported for
   the check log, which must mean the same thing by "today" that this does. */
export function localDay(iso:unknown){
 const at=new Date(String(iso||""));
 return Number.isNaN(at.getTime())?"":ymd(at.getFullYear(),at.getMonth()+1,at.getDate());
}

export function dayStamp(day:string){const [year,month,date]=day.split("-").map(Number);return Date.UTC(year,month-1,date)}

/* "10/22" -> "2026-10-22".

   THE PAPER CARRIES NO YEAR, so the year is the latest one that does not put
   the check in the future: a sheet photographed in January with "11/5" on it
   was checked last November. A written year is taken as written.

   A calendar day and not an instant, on purpose. "Checked 10/22" names a day in
   the garage; stored as midnight UTC it would read as the 21st on every phone
   in the building. "Today" is therefore the day on the clock of the device
   doing the reading, which is the garage's — this is not a function to call
   from a server in another time zone.

   Anything that is not a real day, lands in the future, or lands further back
   than one season returns "" — the row keeps what was written, and an empty
   date is honest where a wrong one would be believed. */
export function heatCheckDate(written:unknown,now=new Date().toISOString()):string{
 const match=clean(written).match(/^(\d{1,2})\s*[\/.-]\s*(\d{1,2})(?:\s*[\/.-]\s*(\d{4}|\d{2}))?$/);
 if(!match)return "";
 const month=Number(match[1]),day=Number(match[2]);
 const at=new Date(now);
 if(Number.isNaN(at.getTime()))return "";
 const today=Date.UTC(at.getFullYear(),at.getMonth(),at.getDate());
 const real=(year:number)=>{
  const stamp=Date.UTC(year,month-1,day),back=new Date(stamp);
  /* Date.UTC rolls 2/30 forward into March rather than refusing it. */
  return back.getUTCMonth()===month-1&&back.getUTCDate()===day?stamp:NaN;
 };
 let year:number;
 if(match[3])year=match[3].length===2?2000+Number(match[3]):Number(match[3]);
 else{
  year=at.getFullYear();
  const thisYear=real(year);
  if(!Number.isNaN(thisYear)&&thisYear>today)year-=1;
 }
 const stamp=real(year);
 if(Number.isNaN(stamp)||stamp>today)return "";
 if((today-stamp)/86400000>HEAT_CHECK_MAX_AGE_DAYS)return "";
 return ymd(year,month,day);
}

/* Anything the route returns is untrusted until it passes through here.
   `struck` must be exactly true: a row is taken off the filing pile by this
   flag, and "false" as a string is truthy. */
export function normalizeHeatRow(raw:unknown,pageNumber=1):ScannedHeatRow{
 const row=(raw&&typeof raw==="object"?raw:{}) as Record<string,unknown>;
 return {
  pageNumber:typeof row.pageNumber==="number"&&row.pageNumber>0?row.pageNumber:pageNumber,
  busNumber:scannedBus(row.busNumber),
  written:cell(row.written,24),
  struck:row.struck===true,
  /* A lone dash, or "n/a", in the DATE cell is an empty date cell — the same
     filler `heatMark` already reads as a blank result, written by a model that
     will not return an empty string. Kept as text it was "a date that could
     not be placed", which costs an OK its check. */
  date:/^(?:[-–—_]+|n\/?a)$/i.test(clean(row.date))?"":clean(row.date).slice(0,16),
  initial:clean(row.initial).slice(0,6),
  note:clean(row.note).slice(0,240),
  confidence:confidence(row.confidence),
  reviewNote:clean(row.reviewNote).slice(0,240),
 };
}

/* What kind of paper a page turned out to be.

   The sweep scanner learned this the hard way: on Sep 6 a Vehicle Down Sheet
   went through it, the model found 24 bus numbers and called every one a
   fault, and they were filed. The heat route therefore asks the model what the
   page IS before what is on it, and this is where that answer becomes a
   decision.

   "not-a-heat-sheet" is the model's own word that the page is something else.
   Nothing from such a page reaches a reviewer.

   "unsure" is the second signal and does not depend on the model's verdict: on
   the wrong paper the result cell is not empty, it holds whatever that paper
   has there — a repair, a tick, a part number — and none of it is OK or N/R.
   So when most of the WRITTEN results on a page are neither word, the page is
   suspect whatever it was called, and its rows arrive unticked. A real heat
   sheet with a few scribbles stays well under half. */
export type HeatDocument="heat"|"other"|"unknown";
export type HeatPageVerdict="heat"|"not-a-heat-sheet"|"unsure";

export function normalizeHeatDocument(raw:unknown):HeatDocument{
 const text=typeof raw==="string"?raw.trim().toLowerCase():"";
 return text==="heat"||text==="other"?text:"unknown";
}

export function heatPageVerdict(document:HeatDocument,rows:ScannedHeatRow[]):HeatPageVerdict{
 if(document==="other")return "not-a-heat-sheet";
 if(document==="unknown")return "unsure";
 const written=rows.filter(row=>heatMark(row.written)!=="blank");
 const unclear=written.filter(row=>heatMark(row.written)==="unclear").length;
 if(written.length&&unclear*2>written.length)return "unsure";
 return "heat";
}

/* THE ONE RULE FOR "THIS BUS IS ALREADY TAGGED NO HEAT" IS THE NO HEAT BUSES
   FILTER, asked rather than copied.

   Curtis: "There may be buses that are already tagged for no heat that are on
   this list so it needs to be aware of that as well, so it doesn't duplicate."

   A bus is tagged by more than a defect called "No heat": a heater boost pump,
   a heating-side surge tank, a dead floor heat switch and a legacy free-text
   "heater / defroster" are all that bus, and `quick-filters.ts` is where that
   was worked out, twice wrongly first. Matching on HEAT_ISSUE alone would file
   a second, vaguer record on every bus somebody had already diagnosed — the
   duplicate would be the one that knows less. */
function openHeatOn(bus:HeatFleetBus,now:string){
 return quickFilterDefects(bus,"no-cabin-heat",now).map(defectShortLabel);
}

function shortDay(day:string){const [,month,date]=day.split("-").map(Number);return month+"/"+date}

/* A heat repair the board says was FINISHED on or after the day of this check.

   The paper is a snapshot of the day somebody walked past the bus. An N/R dated
   10/8 on a bus whose heat was repaired and closed on 10/20 is most likely the
   fault that repair fixed, with the line not yet struck through — and filing it
   would reopen finished work as a new no-heat bus. It may also be cold again,
   which only a person can know, so this does not refuse the row: it holds it
   back unticked and says why.

   Asked of the same rule that decides an OPEN heat repair, so a boost pump
   finished last week counts and a finished overheat does not. A row with no
   date has no day to compare, so any heat repair finished within this season
   holds it back. A repair with no finish stamp at all says nothing about when,
   and is not evidence either way. */
function finishedHeatSince(bus:HeatFleetBus,checkedOn:string,now:string):string{
 const today=localDay(now);
 let latest="";
 for(const defect of normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id)){
  if(isUnresolved(defect)||!isNoHeatRepair(defect))continue;
  const finished=localDay(defect.completedAt||defect.updatedAt);
  if(!finished)continue;
  const counts=checkedOn?finished>=checkedOn:Boolean(today)&&(dayStamp(today)-dayStamp(finished))/86400000<=HEAT_CHECK_MAX_AGE_DAYS;
  if(counts&&finished>latest)latest=finished;
 }
 return latest;
}

/* WORDS ABOUT THE HEAT ALREADY TYPED AGAINST THE BUS, which the filter does
   not count as a tag.

   No Heat Buses reads the REPAIR, not the prose — deliberately, after a note
   saying "floor heat switch checked and working" put a bus on the winter list.
   So a bus whose only record is a driver report reading "no heat in bus", or a
   legacy board line reading "NO HEAT", is not tagged, and the scan would file a
   second record beside words that already say it.

   This is NOT a second definition of tagged, and it must not become one: it
   never moves a row to `already-tagged` and it never adds a bus to any list. It
   only declines to pre-tick, and quotes the words so the person can judge. The
   pattern is kept to a bus being without heat; "heat" alone is in Amerex heat
   sensors and half the estimate notes in the fleet. */
const HEAT_WORDS=/\bno\s+heat\b|\bheat(?:er)?\s+(?:is\s+)?(?:inop|out|dead|not\s+working)\b/i;
function heatWordsOn(bus:HeatFleetBus):string{
 const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(isUnresolved);
 const texts=defects.length?defects.flatMap(defect=>[defect.details,defect.shopNotes,defect.diagnosticNote]):[bus.pendingRepair];
 const found=texts.map(clean).find(text=>HEAT_WORDS.test(text));
 return found?(found.length>60?found.slice(0,57)+"…":found):"";
}

function note(...parts:string[]){return parts.map(clean).filter(Boolean).join(" · ")}

/* What a row says about its bus, for telling two rows apart. */
function outcome(row:ScannedHeatRow){return row.struck?"struck":heatMark(row.written)}

/* Whether anybody wrote anything on this line at all. */
function touched(row:ScannedHeatRow){return row.struck||heatMark(row.written)!=="blank"||Boolean(row.date)||Boolean(row.initial)}

/* ONE ROW PER BUS, because a sheet gets photographed more than once.

   The first photo of this sheet cut the left-hand column's bus numbers off at
   the edge, and the retake that fixes it overlaps the two columns that were
   fine. Without this every bus in the overlap arrives twice and an N/R files
   twice in one press — the duplicate Curtis asked not to get, made by the scan
   against itself rather than against the board.

   A blank line never outvotes a written one: the same sheet photographed
   earlier in the walk is the same bus not yet checked.

   ONLY THE SAME LINE READ TWICE COLLAPSES, and "the same line" is strict: the
   same mark, the same date, the same initials, on DIFFERENT photos. The first
   version collapsed any two rows whose marks agreed, and a second cold read
   drove what that does on this sheet, where six lines in ten are N/R: the
   model reads 17518's number as 17519, both lines say N/R, and they merged
   into one finding for 17519 carrying 17518's date and checker — ticked, with
   a note saying only "on the sheet 2 times". The cold bus on 17518 was gone
   from the review entirely. Two adjacent N/R lines is the common case here,
   not the rare one.

   A retake of the same line gives the same date and initials, so requiring
   them costs an honest overlap nothing. Two rows with one bus number on the
   SAME photo cannot be an overlap at all — a page lists each bus once — so
   that is a misread number by definition.

   ROWS THAT DISAGREE ARE NEVER SETTLED HERE. A first version let the later date
   win, on the reasoning that N/R on 10/7 and OK on 11/3 is a bus fixed in
   between. A cold read drove what that actually does: one paper line has one
   date, so two copies of it carrying different dates is a misread digit far
   more often than a re-check — and a struck N/R whose retake missed the pen
   line and read the 7 as a 9 came back unstruck, ticked and ready to file. The
   neighbouring line misread as this bus's number hid an N/R the same way. The
   paper is the only thing that can say which copy is wrong, so every
   disagreement comes back as one unticked row to look at.

   A line with no readable bus number belongs to no group. It is kept on its own
   when anything is written on it, because a mark with no bus beside it is
   exactly what the cut-off edge of a photo produces. */
function sameLine(group:ScannedHeatRow[]){
 const first=group[0],fold=(value:string)=>value.replace(/\s+/g,"").toUpperCase();
 if(new Set(group.map(row=>row.pageNumber)).size!==group.length)return false;
 return group.every(row=>outcome(row)===outcome(first)&&fold(row.date)===fold(first.date)&&fold(row.initial)===fold(first.initial));
}

/* WHICH COPY OF A LINE READ TWICE IS KEPT: one from a page the scan trusts,
   when there is one. It was always the first, so the order two photos were
   added in decided whether a bus could be filed and logged — an unsure page
   first, and the same line read cleanly off the retake was unticked and left
   out of the log; the other way round, it went through. Only among copies
   `sameLine` has already called the same line, so the conflict checks see
   every copy exactly as before. */
function onePerBus(rows:ScannedHeatRow[],unsurePages:ReadonlySet<number>=new Set()):Array<{row:ScannedHeatRow;conflict:boolean;repeated:number}>{
 const slots:Array<{number:string;rows:ScannedHeatRow[]}>=[],byNumber=new Map<string,ScannedHeatRow[]>();
 for(const row of rows){
  if(!row.busNumber){if(touched(row))slots.push({number:"",rows:[row]});continue}
  let group=byNumber.get(row.busNumber);
  if(!group){group=[];byNumber.set(row.busNumber,group);slots.push({number:row.busNumber,rows:group})}
  group.push(row);
 }
 return slots.map(({rows:all})=>{
  const written=all.filter(row=>outcome(row)!=="blank");
  const group=written.length?written:all.filter(touched).slice(0,1);
  if(!group.length)return {row:all[0],conflict:false,repeated:all.length};
  if(group.length===1)return {row:group[0],conflict:false,repeated:all.length};
  if(!sameLine(group))return {row:group[0],conflict:true,repeated:all.length};
  return {row:group.find(row=>!unsurePages.has(row.pageNumber))||group[0],conflict:false,repeated:all.length};
 });
}

/* One finding per bus on the sheet, in the order the sheet has them.

   Blank lines come back too rather than being dropped: "nobody has checked this
   one" is the third thing this sheet says, and a log that only knows the buses
   somebody wrote on cannot answer how far the walk has got. */
export function heatFindings(rows:ScannedHeatRow[],fleet:HeatFleetBus[],now=new Date().toISOString(),unsurePages:ReadonlySet<number>=new Set()):HeatFinding[]{
 const byNumber=new Map<string,HeatFleetBus[]>();
 for(const bus of fleet){const number=busDigits(bus.n);if(!number)continue;byNumber.set(number,[...(byNumber.get(number)||[]),bus])}
 return onePerBus(rows,unsurePages).map(({row,conflict,repeated},index)=>{
  const matches=byNumber.get(row.busNumber)||[];
  const fleetMatch:HeatFinding["fleetMatch"]=matches.length===1?"matched":matches.length>1?"duplicate":"unknown";
  const bus=fleetMatch==="matched"?matches[0]:null;
  const mark=heatMark(row.written),openHeat=bus?openHeatOn(bus,now):[];
  const checkedOn=heatCheckDate(row.date,now);
  let action:HeatAction,why="",heldBack=false;
  if(!touched(row))action="nothing";
  else if(!row.busNumber){action="look";why="No bus number could be read on this line"}
  else if(conflict){action="look";why="This bus number was read "+repeated+" times and the lines do not match — one of them is probably another bus. Check the paper"}
  else if(!bus){action="look";why=fleetMatch==="duplicate"?"Two buses on the board share this number":"Not a bus number on the board"}
  /* A decommissioned bus is on nobody's walk — `heatRoster` leaves it out — so
     a line that lands on one is far more likely a misread number than a
     finding. It arrived ticked and logged a check on a bus the heat list
     never shows, with a defect filed on a bus that does not run. To a
     person, like every other number the scan cannot stand behind. */
  else if(bus.s==="decommissioned"){action="look";why="This bus is decommissioned on the board — check the number"}
  /* Struck is tested BEFORE the mark, and that order is the safety: a struck
     row usually still shows the N/R it was struck through, and reading the
     mark first would file a no-heat defect on a bus the paper says is done. */
  else if(row.struck)action=openHeat.length?"check-board":"nothing";
  else if(mark==="unclear"){action="look";why="The result is neither OK nor N/R"}
  /* Somebody dated or initialled the line, so somebody checked the bus — and
     the one cell that says what they found came back empty. That is a missed
     mark, not an unchecked bus. */
  else if(mark==="blank"){action="look";why="A date or initials with no result — check the paper"}
  else if(mark==="ok")action=openHeat.length?"check-board":"nothing";
  else if(openHeat.length)action="already-tagged";
  else{
   action="file";
   const words=heatWordsOn(bus),finished=finishedHeatSince(bus,checkedOn,now);
   if(words)why="The board already has \""+words+"\" on this bus — tick it only if this is a separate report";
   else if(finished)why="A heat repair on this bus was finished "+shortDay(finished)+", "+(checkedOn?"on or after this check":"and this row has no date")+" — tick it only if the heat is out again";
   heldBack=Boolean(why);
  }
  const dateNote=clean(row.date)&&!checkedOn?"Date \""+clean(row.date)+"\" could not be placed":"";
  return {
   key:"heat-"+row.pageNumber+"-"+(row.busNumber||"none")+"-"+index,
   busId:bus?bus.id:"",busNumber:row.busNumber,pageNumber:row.pageNumber,
   mark,struck:row.struck,written:row.written,checkedOn,dateWritten:row.date,initial:row.initial,note:row.note,
   confidence:row.confidence,
   reviewNote:note(row.reviewNote,why,dateNote,!conflict&&repeated>1?"On the sheet "+repeated+" times, read once":""),
   fleetMatch,openHeat,action,heldBack,selected:action==="file"&&!heldBack,
  };
 });
}

/* A date was written on the line and could not be placed: in the future, more
   than a season old, or not a date. NOT the same as an empty date cell, and
   `heatChecksFromFindings` is where the difference matters. */
export function heatDateUnplaced(finding:Pick<HeatFinding,"dateWritten"|"checkedOn">){
 return Boolean(clean(finding.dateWritten))&&!finding.checkedOn;
}

/* How sure the reading has to be before a row is taken at its word. The route
   is told to answer below this for any row it had to interpret rather than
   read cleanly, so the number is the same one on both sides of the wire. */
export const HEAT_LOW_CONFIDENCE=0.7;
export function heatLowConfidence(finding:Pick<HeatFinding,"confidence">){return finding.confidence<HEAT_LOW_CONFIDENCE}

/* WHAT ONE PRESS OF "READ SHEET" COMES TO: every page's answer, turned into
   the findings a person reviews.

   These three decisions were made inside the scanner component, under a
   heading that said the component decided nothing, and a cold read pointed out
   that a test could only pin the string in the component rather than the
   behaviour:

   - a page that is NOT A HEAT SHEET contributes no rows at all. Not unticked
     rows — none. A tick box beside another document's bus numbers is how the
     sweep scanner filed 24 records that did not exist.
   - a page the scan is UNSURE of contributes its rows unticked, so filing from
     it takes a deliberate tick per row.
   - and an unsure page is NEVER LOGGED. `loggable` is the findings whose page
     was trusted; an OK nobody is sure was read off a heat sheet is not somebody
     having checked that bus.

   Rows are numbered by the page they were sent as. Each photo goes to the
   route alone, so the model calls every one of them page 1. */
export type HeatScanPage={document:unknown;rows:unknown};
export type HeatScanReview={
 findings:HeatFinding[];
 held:{page:number;verdict:HeatPageVerdict}[];
 loggable:HeatFinding[];
};

export function heatScanReview(pages:HeatScanPage[],fleet:HeatFleetBus[],now=new Date().toISOString()):HeatScanReview{
 const scanned:ScannedHeatRow[]=[],held:HeatScanReview["held"]=[];
 pages.forEach((page,index)=>{
  const number=index+1;
  const rows=(Array.isArray(page.rows)?page.rows:[]).map(row=>({...normalizeHeatRow(row,number),pageNumber:number}));
  const verdict=heatPageVerdict(normalizeHeatDocument(page.document),rows);
  if(verdict!=="heat")held.push({page:number,verdict});
  if(verdict!=="not-a-heat-sheet")scanned.push(...rows);
 });
 const unsure=new Set(held.filter(item=>item.verdict==="unsure").map(item=>item.page));
 const findings=heatFindings(scanned,fleet,now,unsure).map(finding=>unsure.has(finding.pageNumber)?{...finding,selected:false}:finding);
 return {findings,held,loggable:heatLoggable(findings,held)};
}

/* Which findings may be considered for the check log: those whose page was
   trusted. Asked again after the reviewer has ticked and unticked, since the
   ticks are part of what the log reads. */
export function heatLoggable(findings:HeatFinding[],held:HeatScanReview["held"]):HeatFinding[]{
 const unsure=new Set(held.filter(item=>item.verdict==="unsure").map(item=>item.page));
 return findings.filter(finding=>!unsure.has(finding.pageNumber));
}

/* THE REVIEW'S GROUPS, and the one rule for which finding is in which.

   `warm` is the group the first version left out: buses the sheet says have
   heat and the board has nothing against. They file nothing, so they were
   drawn as a count — and every one is logged as HEAT OK and comes off the
   walking list, which makes them the rows a reviewer most needs to see. A
   struck row is listed under `struck` whatever else it is. */
export function heatReviewGroups(findings:HeatFinding[]){
 const by=(action:HeatAction)=>findings.filter(finding=>finding.action===action);
 return {
  toFile:by("file"),tagged:by("already-tagged"),disagree:by("check-board"),look:by("look"),
  warm:findings.filter(finding=>finding.action==="nothing"&&finding.mark==="ok"&&!finding.struck),
  struck:findings.filter(finding=>finding.struck),
 };
}

/* A tick is the reviewer's, and only ever lands on a row the rules say may be
   filed. Everything else keeps the tick it has.

   AN UNTICK BY HAND IS RECORDED AS ONE, in `declined`. A held-back row arrives
   unticked BY RULE and its check is still logged, which is right — but nothing
   told that apart from a reviewer ticking it, thinking again, and unticking
   it, so a row somebody had looked at and turned down was logged anyway, under
   a heading promising that an unticked wrong row is neither filed nor logged.
   Ticking it again clears the flag. */
export function tickHeatFinding(findings:HeatFinding[],key:string,selected:boolean):HeatFinding[]{
 return findings.map(finding=>finding.key===key&&canFileHeatFinding(finding)?{...finding,selected,declined:!selected}:finding);
}

/* WHETHER A FINDING MAY BECOME A DEFECT AT ALL — here, and not in the page.

   The review screen can tick and untick; it cannot decide this. The first
   version left it to `selected`, which a screen flips, and `heatDefect` would
   mint an open No Heat record for a struck row, an already-tagged bus or a
   number the board does not have if handed one. CLAUDE.md's own rule: a
   decision that lives in a page component is invisible to everything else that
   reads the app. Only an N/R on one known bus with no open heat repair is ever
   fileable; a held-back row is, because holding back is advice. */
export function canFileHeatFinding(finding:HeatFinding){
 return finding.action==="file"&&finding.fleetMatch==="matched"&&Boolean(finding.busId)&&!finding.struck&&finding.mark==="repair";
}

export type HeatSummary={
 /* What the paper says, one bus each. */
 ok:number;repair:number;struck:number;notChecked:number;unclear:number;
 /* What an import would do about it as the findings stand. */
 toFile:number;heldBack:number;alreadyTagged:number;checkBoard:number;look:number;
};

/* The counts the sheet answers at a glance, and the ones an import would act
   on, kept apart because they are different questions: how many need repair is
   the paper's, and how many of those are new to file against how many the
   board already knew is this device's. `toFile` counts what is TICKED, so it
   moves as the reviewer ticks; `heldBack` is what arrived unticked for a
   reason. */
export function heatSummary(findings:HeatFinding[]):HeatSummary{
 const count=(test:(finding:HeatFinding)=>boolean)=>findings.filter(test).length;
 return {
  ok:count(finding=>!finding.struck&&finding.mark==="ok"),
  repair:count(finding=>!finding.struck&&finding.mark==="repair"),
  struck:count(finding=>finding.struck),
  notChecked:count(finding=>!finding.struck&&finding.mark==="blank"&&finding.action==="nothing"),
  unclear:count(finding=>!finding.struck&&(finding.mark==="unclear"||(finding.mark==="blank"&&finding.action==="look"))),
  toFile:count(finding=>finding.selected&&canFileHeatFinding(finding)),
  heldBack:count(finding=>finding.heldBack),
  alreadyTagged:count(finding=>finding.action==="already-tagged"),
  checkBoard:count(finding=>finding.action==="check-board"),
  look:count(finding=>finding.action==="look"),
 };
}

/* The record a finding becomes, or null for a finding that may not be filed.

   THE ID BEGINS WITH THE HEAT SCAN PREFIX AND THE CALLER PASSES ONE `now` FOR
   THE WHOLE PRESS, which together are what SCAN BATCHES finds a scan by. One
   photographed heat sheet can file sixty records in a single press; that is the
   Sep 6 mistake at more than twice the size, and the way to take it back out
   has to exist before the first one is filed rather than after.

   So `createdAt` is when the scan was FILED, not the day on the paper — the
   shared stamp is the batch's fingerprint and a per-row date would break it.
   The day the bus was actually checked rides in the details WITH ITS YEAR when
   the date could be placed, because "10/28" alone stops meaning anything the
   following autumn; the mark as written and who checked it ride beside it.

   Whether a no-heat bus may still run is the catalog's answer, asked here and
   not typed here.

   Initials are stored upper-cased, the way a hand-logged defect's are on save
   and the way the check log stores the same person — "Cw" on the defect and
   "CW" on the check would be two people to anything that groups by them. */
export function heatDefect(finding:HeatFinding,now=new Date().toISOString()):StructuredDefect|null{
 if(!canFileHeatFinding(finding))return null;
 const day=finding.checkedOn?shortDay(finding.checkedOn)+"/"+finding.checkedOn.slice(0,4):finding.dateWritten;
 const checked=[day?"checked "+day:"",finding.initial?"by "+finding.initial:""].filter(Boolean).join(" ");
 const provenance=note("Heat check sheet p"+finding.pageNumber,finding.written?"marked "+finding.written:"",checked);
 const details=[finding.note.trim(),provenance].filter(Boolean).join(" — ");
 return {id:HEAT_SCAN_ID_PREFIX+finding.busNumber+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),category:HEAT_CATEGORY,issue:HEAT_ISSUE,details,operability:defaultDefectOperability(HEAT_CATEGORY,HEAT_ISSUE),state:"open",createdAt:now,updatedAt:now,source:"defect-log",reportedBy:finding.initial.toUpperCase()||undefined} as StructuredDefect;
}

/* Everything one press of FILE would put on the board: the ticked findings
   that may be filed, each with the bus it goes on, all under one stamp. The
   page calls this and writes what comes back; it decides nothing. */
export function heatFiling(findings:HeatFinding[],now=new Date().toISOString()):Array<{busId:string;busNumber:string;defect:StructuredDefect}>{
 const filing:Array<{busId:string;busNumber:string;defect:StructuredDefect}>=[];
 for(const finding of findings){
  if(!finding.selected)continue;
  const defect=heatDefect(finding,now);
  if(defect)filing.push({busId:finding.busId,busNumber:finding.busNumber,defect});
 }
 return filing;
}

/* Whether the catalog still holds the entry an N/R is filed as. A test reads
   this; a rename of "Heating - No heat" that forgot this module would otherwise
   file sixty records under a name the picker cannot draw. */
export function heatIssueInCatalog(){return (REPAIR_OPTIONS[HEAT_CATEGORY]||[]).includes(HEAT_ISSUE)}
