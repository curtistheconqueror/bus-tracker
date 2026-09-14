/* THE FLEET SCOREBOARD: the four answers, computed once, in one place.

   Curtis, on why this exists: a foreman with a clipboard was answering the
   superintendent almost as fast as he was. "If that's the case then paper it is
   not too far behind what we're doing." The app was not losing on accuracy, it
   was losing on RETRIEVAL — the numbers were all there, spread across the Down
   Sheet, the map and the Defect Log, and answering four questions meant
   clicking between three surfaces while somebody waited.

   So this module does no rendering and touches no storage. It takes the fleet
   and the sheet and returns the numbers. The Down Sheet renders them, the share
   sheet sends them, and neither one gets to decide what a downed bus is. */

import {mysteryBusIds} from "./mystery-buses.ts";
import {standingRoadCalls} from "./road-calls.ts";
import {defectLabel,type StructuredDefect} from "./repair-catalog.ts";
import {locationLabel} from "./location-label.ts";

/* 48 hours, expressed in the unit roadCallsWithin takes. Curtis: "all road
   calls in last 48 hours only". Named rather than inlined as 2 because the
   number is a decision about the report, not a property of road calls — the
   module's own window is seven days and stays that way. */
/* The width every line is built to fit. A lock-screen notification gives you
   roughly this before it truncates, and a report that wraps mid-number is
   exactly as useless as no report. Enforced by a test over every line rather
   than eyeballed, which is how the first draft shipped a 54-character row. */
export const SCOREBOARD_WIDTH=38;

/* 36 hours, and only calls the bus is STILL out on. Curtis: "only roadcalls
   within the last 36 hours that have not been taken off out of that status
   should show on scoreboard." Both halves matter — clearRoadCall takes the flag
   off and leaves the history, so a bus fixed and returned to service this
   morning still has a dated event from last night and must not be counted. */
export const SCOREBOARD_ROAD_CALL_HOURS=36;

/* AN INSPECTION IS NOT A DOWNED BUS, and this is the one line that says so.

   Curtis: "the downed number normally does not count inspections if I am not
   mistaken." He was not mistaken, and the app already agreed with him in a
   place nobody had connected to this: down-sheet-replace.ts sends an omitted
   inspection back into service according to its unresolved defects, which is
   only correct if the inspection was never what was holding the bus. A bus in
   for a B-12 is scheduled maintenance; a bus in for brakes is a breakdown. The
   superintendent is asking about the second kind. */
export const INSPECTION_SECTION="Inspection";

export type ScoreboardEntry={busId?:string;busNumber?:string;section?:string;workflow?:string;repair?:string;category?:string};
export type ScoreboardBus={
 id:string;n:string;l:string;s?:string;
 roadCalls?:unknown;
 defects?:Partial<StructuredDefect>[];
 pendingRepair?:string;
};

export type ScoreboardBusLine={id:string;n:string;where:string;note:string;defects:string[]};
export type Scoreboard={
 at:string;
 /* Buses with an active sheet entry, minus the ones only there for an
    inspection. The headline number and the reason this page exists. */
 downed:number;
 /* Kept beside it because the two disagree the moment an inspection lands, and
    a reader who knows the sheet has 32 rows needs to see why the answer is 30
    rather than wonder whether the app is wrong. */
 onSheet:number;
 inspections:number;
 mystery:ScoreboardBusLine[];
 /* ROAD CALLS STILL PENDING: broken down inside the window, still in that
    status, and NOT written up on the sheet.

    This was two lists — every road call in the window, and then the ones off
    the sheet marked with a star. Curtis collapsed them by changing the rule
    rather than the report: "any bus that is added to the downsheet while it is
    in roadcall status should not be counted here." On the sheet means somebody
    has it; what is pending is what nobody has written down yet. One list, and
    the star and its footnote go with the second. */
 roadCallsPending:ScoreboardBusLine[];
};

function clean(value:unknown){return String(value??"").trim()}
function isActive(entry:ScoreboardEntry){return clean(entry.workflow)!=="Completed"}
function isInspection(entry:ScoreboardEntry){return clean(entry.section)===INSPECTION_SECTION}

function openDefects(bus:ScoreboardBus){
 return (bus.defects||[]).filter(defect=>defect.state!=="completed");
}

/* The repairs as a person would read them. defectLabel wants a whole defect and
   a stored record can be missing any field — a report that throws is worse than
   one that is thin, because it fails at the moment somebody is standing there
   waiting for it. */
function defectLines(bus:ScoreboardBus){
 return openDefects(bus).map(defect=>{
  const whole={category:"",issue:"",details:"",operability:"unknown",state:"open",...defect} as StructuredDefect;
  return defectLabel(whole).trim()||"Repair recorded with no description";
 });
}

function busLine(bus:ScoreboardBus,note:string):ScoreboardBusLine{
 return {id:bus.id,n:clean(bus.n),where:locationLabel(bus.l),note,defects:defectLines(bus)};
}

function byNumber(a:ScoreboardBusLine,b:ScoreboardBusLine){return a.n.localeCompare(b.n,undefined,{numeric:true})}

export function buildScoreboard(
 fleet:ScoreboardBus[],
 entries:ScoreboardEntry[],
 now=new Date().toISOString()
):Scoreboard{
 const active=entries.filter(isActive);
 const activeBusIds=new Set(active.map(entry=>clean(entry.busId)).filter(Boolean));

 /* Counted by BUS, not by row. A bus written up three times is one bus the
    superintendent cannot put on the road, and reporting 3 would overstate the
    shortage — the one direction a maintenance number must never be wrong in. */
 const downedIds=new Set(active.filter(entry=>!isInspection(entry)).map(entry=>clean(entry.busId)).filter(Boolean));
 const inspectionOnlyIds=new Set(
  active.filter(isInspection).map(entry=>clean(entry.busId)).filter(id=>id&&!downedIds.has(id))
 );

 const byId=new Map(fleet.map(bus=>[clean(bus.id),bus]));
 /* No open-repair count against each one. Curtis: "as far as the open repair
    count don't include that." It was answering a question nobody asks of this
    list — a mystery bus is one nothing on the sheet explains, and how many
    repairs are already logged against it is a different report. */
 const mystery=mysteryBusIds(fleet as never,[...activeBusIds])
  .map(id=>byId.get(clean(id)))
  .filter(Boolean)
  .map(bus=>busLine(bus as ScoreboardBus,""))
  .sort(byNumber);

 /* The list somebody still has to act on: broke down, still in that status,
    and nobody has written it up. */
 const roadCallsPending:ScoreboardBusLine[]=[];
 for(const bus of fleet){
  const recent=standingRoadCalls(bus,now,SCOREBOARD_ROAD_CALL_HOURS);
  if(!recent.length)continue;
  /* The sheet check is here as well as in the reconciler, on purpose. The
     reconciler takes the flag off the bus record and is the real rule; this
     is the same question asked again at read time, so a board that has not
     been through a sheet write yet — a fresh cloud pull, a device still on an
     older build — cannot report a bus as pending while its row sits on the
     screen underneath. Belt and braces on the one number a superintendent
     acts on. */
  if(activeBusIds.has(clean(bus.id)))continue;
  roadCallsPending.push(busLine(bus,recent.length+" road call"+(recent.length===1?"":"s")));
 }

 return {
  at:now,
  downed:downedIds.size,
  onSheet:activeBusIds.size,
  inspections:inspectionOnlyIds.size,
  mystery,
  roadCallsPending:roadCallsPending.sort(byNumber),
 };
}

/* MYSTERY BUSES ARE "PENDING CONFIRMATION OF STATUS" WHILE ANY REMAIN.

   Curtis's wording, and it is the honest one. A mystery bus is not a category
   of fault, it is an admission: this bus is on property and nothing on the
   sheet explains why. Reporting it as a hard number alongside DOWNED would
   read as though somebody had decided something about those buses. Nobody has
   — that is the entire point of the list. At zero the caveat goes and the
   number stands alone, because "0" needs no hedge. */
export const MYSTERY_CAVEAT="PENDING CONFIRMATION OF STATUS";
export function mysteryLabel(count:number){
 return count?count+" "+MYSTERY_CAVEAT:"0";
}

export function scoreboardStamp(at:string){
 const when=new Date(at);
 if(Number.isNaN(when.getTime()))return "";
 return when.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).toUpperCase();
}

/* THE LOCK-SCREEN VERSION.

   Plain text on purpose, and it is the format that actually beats the clipboard:
   it arrives AS the message rather than as a file somebody has to open, so the
   answer is readable on a locked phone before the superintendent has taken it
   out of his pocket. Kept narrow enough not to wrap on a phone.

   Numbers are printed for MYSTERY and ROAD CALLS only. Curtis: "only the
   mystery buses and road call buses should show their numbers. Not the entire
   downed bus list." Those two are lists somebody has to go and DO something
   about; the downed count is a figure, and thirty fleet numbers would bury the
   four that need chasing. */
export function scoreboardText(board:Scoreboard,options:{includeDefects?:boolean;title?:string}={}){
 const lines:string[]=[];
 /* The heavy band fences the two numbers that are NOT like the others; the
    light rule separates the ordinary ones. Different weights on purpose — a
    reader should be able to see which block is set apart without reading it. */
 const band="=".repeat(SCOREBOARD_WIDTH-8);
 const rule="-".repeat(SCOREBOARD_WIDTH-8);
 lines.push(clean(options.title)||"PACE SOUTH");
 const stamp=scoreboardStamp(board.at);
 if(stamp)lines.push(stamp);
 /* THE TWO NUMBERS THAT ARE NOT LIKE THE OTHERS, fenced off so nobody has to
    be told twice. Curtis: "The downed bus number and inspection number should
    be separated from the rest of the metrics given and it should be obvious to
    the person reading it. So they know the counts do not include them."

    A heavy rule above and below rather than a footnote, because a footnote is
    the thing a person skips when somebody is standing in front of them. Two
    lines, plainly worded, and the parenthetical says what the number IS rather
    than what it excludes — "downed buses only" answers the question before it
    is asked. */
 lines.push(band);
 /* No "(downed buses only)" under it. Curtis: "get rid of the extra redundant
    (downed buses only) line under downed buses. Not necessary on either
    version." The heading already says DOWNED BUSES; the line under it repeated
    the heading back. The one under INSPECTIONS stays, because it says something
    the heading does not — that this number is NOT inside the one above. */
 lines.push("DOWNED BUSES        "+board.downed);
 lines.push("INSPECTIONS         "+board.inspections);
 lines.push("  (not counted above)");
 lines.push(band);
 /* The count first, the caveat under it. On one line the two ran to 45
    characters and wrapped on a phone — caught by the test that holds every line
    to a lock screen, not by reading it. The number is what somebody is looking
    for, so it goes where the eye lands. */
 lines.push("MYSTERY BUSES       "+board.mystery.length);
 /* A blank line between the number and the caveat. Curtis: "put a space in
    between (like a tabbed space so its not so bunced up) in between Mystery
    buses and Pending confirmation of status line." Stacked directly the two
    read as one wrapped sentence; separated, the number is a number and the
    caveat is a note about it. */
 if(board.mystery.length){lines.push("");lines.push("  "+MYSTERY_CAVEAT)}
 /* NOT ONE LINE EACH, PAST A POINT. Measured against the real board: twenty-two
    mystery buses became twenty-five lines and 1,800 characters, which is no
    longer something anybody reads on a lock screen — the format's whole reason
    for existing. So the first few carry their location, which is what somebody
    walking out to find them needs, and the rest arrive as bare fleet numbers
    packed across the width. Every number is still there; Curtis asked for the
    numbers and losing them to a "+14 more" would defeat the list. */
 lines.push(...busList(board.mystery,options.includeDefects));
 lines.push(rule);
 lines.push("ROADCALLS PENDING   "+board.roadCallsPending.length);
 /* The star and its footnote are gone with the second list. Not on the sheet
    IS the definition now, so it is said once, under the heading, instead of
    against every row and again at the bottom. */
 lines.push("  (not on the down sheet)");
 /* Road calls are not capped: the 36-hour window keeps the list short by
    construction, and each one is a bus somebody has to chase. */
 for(const bus of board.roadCallsPending)lines.push(...busBlock(bus,options.includeDefects));
 return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

/* THE SHORT VERSION: four answers and the two lists you have to act on.

   Curtis, after living with the long one: "I think its still too much info...
   place an option above that one with a check box that will just give the
   downed bus count, inspections, and a ROADCALLS PENDING (currently not on
   downsheet) it should have a bus number for this and mystery buses with the
   bus number just these 2 values. Not bus numbers for downed buses and
   inspections."

   So the split is by what the reader DOES with each number. Downed and
   inspections are figures to quote; a list of thirty fleet numbers under them
   is noise. Road calls pending and mystery buses are errands — each one is a
   bus somebody has to walk out to — so those carry their numbers and nothing
   else: no location, no note, no repairs. */
export function scoreboardCountsText(board:Scoreboard,options:{title?:string}={}){
 const lines:string[]=[];
 const band="=".repeat(SCOREBOARD_WIDTH-8);
 lines.push(clean(options.title)||"PACE SOUTH");
 const stamp=scoreboardStamp(board.at);
 if(stamp)lines.push(stamp);
 lines.push(band);
 lines.push("DOWNED BUSES        "+board.downed);
 lines.push("INSPECTIONS         "+board.inspections);
 lines.push("  (not counted above)");
 lines.push(band);
 lines.push("ROADCALLS PENDING   "+board.roadCallsPending.length);
 lines.push("  (not on the down sheet)");
 lines.push(...numberRows(board.roadCallsPending));
 lines.push("");
 lines.push("MYSTERY BUSES       "+board.mystery.length);
 if(board.mystery.length){lines.push("");lines.push("  "+MYSTERY_CAVEAT)}
 lines.push(...numberRows(board.mystery));
 return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

/* Fleet numbers packed across the width, nothing else. Every number is there —
   losing one to a "+6 more" would defeat a list whose entire content is which
   buses to go and find. */
function numberRows(buses:ScoreboardBusLine[]){
 const out:string[]=[];
 let row="  ";
 for(const bus of buses){
  if((row+" "+bus.n).length>SCOREBOARD_WIDTH){out.push(row);row="  "}
  row+=" "+bus.n;
 }
 if(row.trim())out.push(row);
 return out;
}

/* Cut to fit, with the ellipsis that says something was cut. Never applied to a
   fleet number: a truncated bus number is a wrong bus number, and every other
   part of the line can be shortened first. */
function fit(text:string,max:number){
 const value=clean(text);
 if(max<=1||value.length<=max)return value;
 return value.slice(0,max-1).trimEnd()+"\u2026";
}

/* How many buses get a line of their own before the rest are packed into a run
   of numbers. Eight fills about a third of a phone screen, which is as much of
   one list as a reader will take before the next heading has to appear. */
export const SCOREBOARD_DETAIL_LIMIT=8;

function busList(buses:ScoreboardBusLine[],includeDefects?:boolean){
 const out:string[]=[];
 for(const bus of buses.slice(0,SCOREBOARD_DETAIL_LIMIT))out.push(...busBlock(bus,includeDefects));
 const rest=buses.slice(SCOREBOARD_DETAIL_LIMIT);
 if(!rest.length)return out;
 out.push("  + "+rest.length+" more:");
 /* Packed to the width rather than one per line — that is the entire saving. */
 let row="   ";
 for(const bus of rest){
  if((row+" "+bus.n).length>SCOREBOARD_WIDTH){out.push(row);row="   "}
  row+=" "+bus.n;
 }
 if(row.trim())out.push(row);
 return out;
}

function busBlock(bus:ScoreboardBusLine,includeDefects?:boolean,mark=""){
 /* The number is fixed, the mark is fixed, and the location gives up whatever
    room the note needs — of the three it is the one a reader can infer. */
 const head="  "+bus.n+"  ";
 /* An empty note prints nothing at all rather than an empty "()" — mystery
    buses lost their note when the open-repair count went. */
 const note=bus.note?" ("+bus.note+")":"";
 const room=SCOREBOARD_WIDTH-head.length-note.length-mark.length;
 const out=[head+fit(bus.where,Math.max(room,4))+note+mark];
 /* Curtis: "have a check mark that says (include defects of each bus) in case
    they request it. Since defects are on buses no matter the status." Off by
    default: the short version is the one that gets read. */
 if(includeDefects)for(const line of bus.defects)out.push("    - "+fit(line,SCOREBOARD_WIDTH-6));
 return out;
}
