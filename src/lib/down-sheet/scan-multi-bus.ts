/* A LINE THAT NAMES SEVERAL BUSES, and what gets lost reading one.

   Curtis, on the 11/01/2026 AM sheet: "the way they wrote the IDOT line
   confused scanner." Line 48 of that sheet has IDOT in the BUS # column and
   nine bus numbers in the REASON column, each carrying its own state:

     IDOT  15504(FAILED-READY) 18503(READY) 17544(PART IN STOCK)
           17524(FAILED-READY) 17519(ABS LIGHT) 17517 17521
           17536(ABS LIGHT) 17570

   Four lines on that one sheet are written this way — 47 (PM'S, five buses),
   48 (IDOT, nine), 53 (event prep, two) and 55, handwritten with a blank BUS #
   column and three buses that share "No Power to Cameras".

   TWO THINGS GO WRONG WITH THEM, and they are independent.

   THE FIRST IS DATA LOSS AND IT HAPPENS EVERY TIME. The scan prompt says to
   emit one row per bus and REPEAT THE LINE'S WORDING on each. Applied to that
   IDOT line, all nine buses come back reading "IDOT" and every parenthetical
   is gone — the difference between a bus that FAILED its inspection, one that
   is READY, and one waiting on a PART IN STOCK. Those parentheses are the
   entire content of that line; the word IDOT is just its heading.

   THE SECOND IS A LINE NUMBER THAT IS NOT A NAME. Every bus on a multi-bus
   line is told to carry that line's number, so "line 48" names nine buses, and
   `fillPrintedLineSiblings` keys on exactly that number to share wording
   between siblings. One misread digit therefore does not merely mislabel a
   row — it files that bus under another line's work. Curtis's bus 20500,
   written on line 55, arrived on line 44, which on the paper belongs to 18506
   and reads A21.

   So this module does two jobs, both narrow and both testable: pull a bus's
   OWN words back out of a shared line, and find the buses a shared line names
   that no row ever came back for. Neither invents a bus. */

/* Five digits, standing alone. The shop's numbers are all five digits and the
   scan prompt says so; dates (11/2/26), times (8:00AM) and service codes (A21,
   C24, B6) have no five-digit run, so they cannot be mistaken for one. */
const BUS_NUMBER=/\b\d{5}\b/g;

export function busNumbersInText(text:unknown){
 const found=String(text??"").match(BUS_NUMBER)||[];
 return [...new Set(found)];
}

/* `15504(FAILED-READY)` — the state belongs to THAT bus and to no other on the
   line. Square brackets too, because the event-prep line is written
   `[20502 , 20504 – USE IF NEEDED]` and a crew that reaches for one bracket
   will reach for the other. */
function stateFor(text:string,busNumber:string){
 const at=new RegExp("\\b"+busNumber+"\\b\\s*[([]([^)\\]]{1,60})[)\\]]").exec(text);
 return at?at[1].trim():"";
}

/* What a line says about ONE of its buses.

   The other buses' numbers come out, because a row for 15504 that still reads
   "18503(READY) 17544(PART IN STOCK)" is three buses' business on one bus's
   record, and the Down Sheet is read at a glance. This bus's own state stays,
   joined to whatever heading the line carried.

   Returns the reason UNCHANGED when the line names no bus at all, which is
   every ordinary row — the common case must not be rewritten. */
export function perBusReason(reason:unknown,busNumber:unknown){
 const text=String(reason??"").trim();
 const bus=String(busNumber??"").replace(/\D/g,"");
 const numbers=busNumbersInText(text);
 if(!numbers.length)return text;
 const state=bus?stateFor(text,bus):"";
 /* Every number and its own bracket goes, this bus's included: the row already
    says which bus it is, and the state is carried separately below. */
 let heading=text;
 for(const number of numbers)heading=heading.replace(new RegExp("\\b"+number+"\\b\\s*(?:[([][^)\\]]{0,60}[)\\]])?","g"),"");
 /* What is left is punctuation the numbers were strung together with. Dashes
    and commas go from the ends and from runs; a dash INSIDE a word is kept, so
    FAILED-READY and HOLD FOR EVENT PREP survive. */
 heading=heading.replace(/[\s,;]*[-–—]+[\s,;]*/g," ").replace(/[\s,;]+/g," ")
  .replace(/^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g,"").replace(/\(\s*\)|\[\s*\]/g,"").trim();
 if(heading&&state)return heading+" — "+state;
 return heading||state||text;
}

/* THE BUSES A LINE NAMES THAT NOBODY CAME BACK FOR.

   This is the one that matters most. `scannedLineGaps` can only see a PRINTED
   line number that never arrived; it cannot see a line that arrived carrying
   nine bus numbers in its words and one row. Those eight buses are down on
   paper and absent from the app, and the module this sits beside already says
   what that costs: "A bus that is down and not on the sheet is a bus that goes
   back out broken."

   Compared against every row in the scan rather than against the one row, so a
   line the model DID split correctly reports nothing. */
export function unreadBusNumbers(rows:{busNumber?:string;reason?:string}[]){
 const emitted=new Set(rows.map(row=>String(row?.busNumber??"").replace(/\D/g,"")).filter(Boolean));
 const missing=new Map<string,string>();
 for(const row of rows){
  for(const number of busNumbersInText(row?.reason)){
   if(emitted.has(number)||missing.has(number))continue;
   missing.set(number,String(row?.reason??"").trim());
  }
 }
 return [...missing].map(([busNumber,writtenOn])=>({busNumber,writtenOn}));
}

/* A PRINTED LINE WHOSE ROWS DISAGREE IS A COLLISION, NOT A SHARED LINE.

   `fillPrintedLineSiblings` treats one page-and-line number as one piece of
   work and copies wording between its rows. That holds for a line genuinely
   written once over several buses. It does NOT hold when a line number was
   misread, and then the sharing is the damage: a bus inherits another line's
   repair and the review note says so in a tone of reassurance.

   Two different non-placeholder reasons on one printed line is the signature
   of that, and it is cheap to spot. Reported rather than resolved — the paper
   is the only thing that can say which row has the right number. */
export function printedLineConflicts(rows:{pageNumber?:number;lineNumber?:string;reason?:string}[]){
 const byLine=new Map<string,Set<string>>();
 for(const row of rows){
  const line=String(row?.lineNumber??"").replace(/\D/g,"");
  const reason=String(row?.reason??"").trim().toLowerCase();
  if(!line||!reason)continue;
  const key=(row?.pageNumber||1)+"|"+parseInt(line,10);
  byLine.set(key,(byLine.get(key)||new Set()).add(reason));
 }
 return [...byLine].filter(([,reasons])=>reasons.size>1).map(([key])=>{
  const [page,line]=key.split("|");
  return {pageNumber:Number(page),lineNumber:Number(line)};
 });
}
