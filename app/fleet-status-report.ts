/* THE FLEET STATUS REPORT: the four answers, computed once, in one place.

   Curtis, on why this exists: a foreman with a clipboard was answering the
   superintendent almost as fast as he was. "If that's the case then paper it is
   not too far behind what we're doing." The app was not losing on accuracy, it
   was losing on RETRIEVAL — the numbers were all there, spread across the Down
   Sheet, the map and the Defect Log, and answering four questions meant
   clicking between three surfaces while somebody waited.

   So this module does no rendering and touches no storage. It takes the fleet
   and the sheet and returns the numbers. The Down Sheet renders them, the share
   sheet sends them, and neither one gets to decide what a downed bus is. */

import {downSheetAvailability,isSoftDownEntry,isEntryInService} from "./down-sheet/down-sheet-availability.ts";
import {mysteryBusIds} from "./mystery-buses.ts";
import {standingRoadCalls} from "./road-calls.ts";
import {defectLabel,type StructuredDefect} from "./repair-catalog.ts";
import {locationLabel} from "./location-label.ts";
import {techServicesGroup,type TechServicesGroup} from "./tech-services.ts";

/* 48 hours, expressed in the unit roadCallsWithin takes. Curtis: "all road
   calls in last 48 hours only". Named rather than inlined as 2 because the
   number is a decision about the report, not a property of road calls — the
   module's own window is seven days and stays that way. */
/* The width every line is built to fit. A lock-screen notification gives you
   roughly this before it truncates, and a report that wraps mid-number is
   exactly as useless as no report. Enforced by a test over every line rather
   than eyeballed, which is how the first draft shipped a 54-character row. */
export const STATUS_REPORT_WIDTH=38;

/* 36 hours, and only calls the bus is STILL out on. Curtis: "only roadcalls
   within the last 36 hours that have not been taken off out of that status
   should show on status report." Both halves matter — clearRoadCall takes the flag
   off and leaves the history, so a bus fixed and returned to service this
   morning still has a dated event from last night and must not be counted. */
export const STATUS_REPORT_ROAD_CALL_HOURS=36;

/* AN INSPECTION IS NOT A DOWNED BUS, and this is the one line that says so.

   Curtis: "the downed number normally does not count inspections if I am not
   mistaken." He was not mistaken, and the app already agreed with him in a
   place nobody had connected to this: down-sheet-replace.ts sends an omitted
   inspection back into service according to its unresolved defects, which is
   only correct if the inspection was never what was holding the bus. A bus in
   for a B-12 is scheduled maintenance; a bus in for brakes is a breakdown. The
   superintendent is asking about the second kind. */
export const INSPECTION_SECTION="Inspection";

export type StatusReportEntry={busId?:string;busNumber?:string;section?:string;workflow?:string;repair?:string;category?:string};
export type StatusReportBus={
 id:string;n:string;l:string;s?:string;
 roadCalls?:unknown;
 defects?:Partial<StructuredDefect>[];
 pendingRepair?:string;
 /* The two tracker flags a bus can carry without any structured repair behind
    them. They are ticked from the map, so a bus can be flagged for a farebox
    before anybody writes the defect up, and a count that only read defects
    would report fewer than the board shows. */
 farebox?:boolean;
 ibsVentra?:boolean;
};

export type StatusReportBusLine={id:string;n:string;where:string;note:string;defects:string[]};
export type FleetStatusReport={
 at:string;
 /* Buses with an active sheet entry, minus the ones only there for an
    inspection. The headline number and the reason this page exists. */
 downed:number;
 /* THE BUSES THE SHEET HAS SAID STILL RUN, kept apart from `downed` rather than
    folded into it. Curtis: "they're on the down sheet, but they can be used...
    so that way, if they're not making pull out, they know what they can
    possibly run." Held for another garage's technicians, or written up SHORT
    RUN ONLY — counted against pullout, but a reader has to be able to see which
    of the shortage is still drivable. */
 softDowned:number;
 /* downed + softDowned, printed rather than left to be added in somebody's
    head: "it should just give a total of both of those numbers together. But it
    should be easily distinguished from one another." */
 downedTotal:number;
 /* Kept beside it because the two disagree the moment an inspection lands, and
    a reader who knows the sheet has 32 rows needs to see why the answer is 30
    rather than wonder whether the app is wrong. */
 onSheet:number;
 inspections:number;
 mystery:StatusReportBusLine[];
 /* ROAD CALLS STILL PENDING: broken down inside the window, still in that
    status, and NOT written up on the sheet.

    This was two lists — every road call in the window, and then the ones off
    the sheet marked with a star. Curtis collapsed them by changing the rule
    rather than the report: "any bus that is added to the downsheet while it is
    in roadcall status should not be counted here." On the sheet means somebody
    has it; what is pending is what nobody has written down yet. One list, and
    the star and its footnote go with the second. */
 roadCallsPending:StatusReportBusLine[];
 /* THE TECH SERVICES COUNTS, SEPARATELY.

    Curtis: "now the Ventura and the fare boxes have been moved up to critical
    levels, period. So they need a count of that as well... Fairbox and Venture
    separate. and cubic screen EV or... I'm sorry. MV, bus MV or MREV error."

    Three lists rather than three numbers, so the same include-list that decides
    whether the other sections carry bus numbers decides it here too. Whole
    fleet, not the sheet: a farebox fault does not down a bus, and the count
    somebody is being asked for is how many are out there. */
 tech:Record<Exclude<TechServicesGroup,null>,StatusReportBusLine[]>;
};

function clean(value:unknown){return String(value??"").trim()}
function isActive(entry:StatusReportEntry){return clean(entry.workflow)!=="Completed"}
function isInspection(entry:StatusReportEntry){return clean(entry.section)===INSPECTION_SECTION}

function openDefects(bus:StatusReportBus){
 return (bus.defects||[]).filter(defect=>defect.state!=="completed");
}

/* The repairs as a person would read them. defectLabel wants a whole defect and
   a stored record can be missing any field — a report that throws is worse than
   one that is thin, because it fails at the moment somebody is standing there
   waiting for it. */
function defectLines(bus:StatusReportBus){
 return openDefects(bus).map(defect=>{
  const whole={category:"",issue:"",details:"",operability:"unknown",state:"open",...defect} as StructuredDefect;
  return defectLabel(whole).trim()||"Repair recorded with no description";
 });
}

function busLine(bus:StatusReportBus,note:string):StatusReportBusLine{
 return {id:bus.id,n:clean(bus.n),where:locationLabel(bus.l),note,defects:defectLines(bus)};
}

function byNumber(a:StatusReportBusLine,b:StatusReportBusLine){return a.n.localeCompare(b.n,undefined,{numeric:true})}

export function buildFleetStatusReport(
 fleet:StatusReportBus[],
 entries:StatusReportEntry[],
 now=new Date().toISOString()
):FleetStatusReport{
 const active=entries.filter(isActive);
 const activeBusIds=new Set(active.map(entry=>clean(entry.busId)).filter(Boolean));

 /* Counted by BUS, not by row. A bus written up three times is one bus the
    superintendent cannot put on the road, and reporting 3 would overstate the
    shortage — the one direction a maintenance number must never be wrong in. */
 /* SPLIT IN TWO, and by BUS on both sides so a bus written up twice cannot
    appear in each. A bus is soft only if NOTHING on the sheet has it down:
    two rows, one saying HOLD FOR SOUTH HOLLAND and one saying no start, is a
    bus that does not move, and the hard row has to win. */
 const hardIds=new Set(active.filter(entry=>downSheetAvailability(entry)==="down").map(entry=>clean(entry.busId)).filter(Boolean));
 /* A soft bus the yard has PUT ON A RUN is not part of the shortage, which is
    the whole point of the switch: "they count against pull out but it's a
    switch that should be able to be easily flipped to satisfy pullout as much
    as possible." The report has to follow that decision or the superintendent
    is reading a number the shop has already acted against. */
 const softIds=new Set(
  active.filter(entry=>isSoftDownEntry(entry)&&!isEntryInService(entry)).map(entry=>clean(entry.busId)).filter(id=>id&&!hardIds.has(id))
 );
 /* Every bus the old single number counted, so the report cannot quietly stop
    counting a bus that has merely been reclassified. */
 const downedIds=new Set([...hardIds,...softIds]);
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
  .map(bus=>busLine(bus as StatusReportBus,""))
  .sort(byNumber);

 /* The list somebody still has to act on: broke down, still in that status,
    and nobody has written it up. */
 const roadCallsPending:StatusReportBusLine[]=[];
 for(const bus of fleet){
  const recent=standingRoadCalls(bus,now,STATUS_REPORT_ROAD_CALL_HOURS);
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

 /* Counted off the OPEN repairs, with the tracker flag as a fallback for a bus
    somebody has flagged but not yet written up. One bus with three farebox
    faults is one farebox bus: the question is how many vehicles are affected,
    same as the downed count and for the same reason. */
 const tech:Record<Exclude<TechServicesGroup,null>,StatusReportBusLine[]>={farebox:[],ventra:[],cubic:[],ibs:[]};
 for(const bus of fleet){
  const groups=new Set<Exclude<TechServicesGroup,null>>();
  for(const defect of openDefects(bus)){
   const group=techServicesGroup([defect.category,defect.issue,defect.details,defect.diagnosticNote,defect.shopNotes].filter(Boolean).join(" "));
   if(group)groups.add(group);
  }
  if(!groups.size){
   const group=techServicesGroup(bus.pendingRepair);
   if(group)groups.add(group);
  }
  /* The flags last, and only where the repairs said nothing. A bus with a
     CUBIC Screen - MV ER written up and the IBS/Ventra flag still ticked is
     counted once, under the device the repair actually names. */
  if(bus.farebox&&!groups.has("farebox"))groups.add("farebox");
  if(bus.ibsVentra&&!groups.has("ventra")&&!groups.has("cubic")&&!groups.has("ibs"))groups.add("ventra");
  for(const group of groups)tech[group].push(busLine(bus,""));
 }
 for(const key of Object.keys(tech) as Exclude<TechServicesGroup,null>[])tech[key].sort(byNumber);

 return {
  at:now,
  downed:hardIds.size,
 softDowned:softIds.size,
 downedTotal:hardIds.size+softIds.size,
  onSheet:activeBusIds.size,
  inspections:inspectionOnlyIds.size,
  mystery,
  roadCallsPending:roadCallsPending.sort(byNumber),
  tech,
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

export function statusReportStamp(at:string){
 const when=new Date(at);
 if(Number.isNaN(when.getTime()))return "";
 return when.toLocaleString([],{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).toUpperCase();
}

/* WHAT GOES IN THE REPORT — the include list, and the reason it exists.

   Curtis, after living with two fixed versions: "when I press the status
   report, can we have, like, maybe widen the user interface of it a little bit
   so we can include different things to check mark that I want included... So
   that way I could just pick what I want sent, and it'll auto format to that,
   period. I think that's the better way to do this instead of coming to you and
   getting coding every time I need it done."

   And the reason it is not a preference about tidiness: "when my superintendent
   sends that list out to his superiors, they don't need to know about mystery
   buses. and they don't need to know about inspection buses." The report has
   more than one audience and they are owed different documents. A fixed version
   serves whichever audience it was written for and makes every other one a
   feature request.

   DOWNED BUSES IS NOT ON THE LIST. It is the question the report answers; a
   status report without it is a covering note. Everything else is optional,
   including the inspections line he specifically wants to be able to drop.

   The three detail switches compose rather than branch, which is what replaced
   the old COUNTS ONLY version entirely:

     numbers off                 -> the counts and nothing else
     numbers on, locations off   -> fleet numbers packed across the width
     numbers on, locations on    -> a line each, with where it is
     + repairs                   -> the open repairs under each one

   So the short version somebody was ticking a box for is now just the middle
   row of that table, and nothing special-cases it. */
export type StatusReportPick={
 inspections:boolean;
 roadCalls:boolean;
 mystery:boolean;
 farebox:boolean;
 ventra:boolean;
 cubic:boolean;
 forecast:boolean;
 numbers:boolean;
 locations:boolean;
 defects:boolean;
};

/* What a foreman gets before touching anything: the report as it was sent
   before the include list existed, plus the two counts that have since become
   critical. Repairs stay off — the short version is the one that gets read —
   and so does the forecast, which is a prediction sitting under a page of
   facts and should be asked for rather than assumed. */
export const DEFAULT_STATUS_REPORT_PICK:StatusReportPick={
 inspections:true,
 roadCalls:true,
 mystery:true,
 farebox:true,
 ventra:true,
 cubic:true,
 forecast:false,
 numbers:true,
 locations:true,
 defects:false,
};

/* A stored selection is read back through this, so a key written by an older
   build — or by a hand that edited LocalStorage — cannot put an undefined into
   a checkbox and turn it into an uncontrolled input halfway through a session. */
export function normalizeStatusReportPick(value:unknown):StatusReportPick{
 const source=(value&&typeof value==="object"?value:{}) as Record<string,unknown>;
 const out={...DEFAULT_STATUS_REPORT_PICK};
 for(const key of Object.keys(out) as (keyof StatusReportPick)[])
  if(typeof source[key]==="boolean")out[key]=source[key] as boolean;
 return out;
}

/* THE LOCK-SCREEN VERSION.

   Plain text on purpose, and it is the format that actually beats the clipboard:
   it arrives AS the message rather than as a file somebody has to open, so the
   answer is readable on a locked phone before the superintendent has taken it
   out of his pocket. Kept narrow enough not to wrap on a phone.

   Numbers are never printed for DOWNED or INSPECTIONS. Curtis: "only the
   mystery buses and road call buses should show their numbers. Not the entire
   downed bus list." Those are lists somebody has to go and DO something about;
   the downed count is a figure, and thirty fleet numbers would bury the four
   that need chasing. The include list does not offer it, because offering it
   would be offering the thing he asked to be rid of. */
/* ONE OPTIONS OBJECT, and the selection is a field inside it rather than a
   second positional argument. That was not the first shape: with
   `(board, pick, options)` a caller that had not been updated passed its
   `{title}` where the pick goes, every key read as undefined, and the report
   came out as a bare downed count with no error anywhere — a silently emptier
   document is exactly the failure a status report must not have. A named field
   cannot be got wrong by position. */
export function statusReportText(
 board:FleetStatusReport,
 options:{pick?:StatusReportPick;title?:string;forecast?:string[]}={}
){
 const pick=options.pick||DEFAULT_STATUS_REPORT_PICK;
 const lines:string[]=[];
 /* The heavy band fences the two numbers that are NOT like the others; the
    light rule separates the ordinary ones. Different weights on purpose — a
    reader should be able to see which block is set apart without reading it. */
 const band="=".repeat(STATUS_REPORT_WIDTH-8);
 const rule="-".repeat(STATUS_REPORT_WIDTH-8);
 lines.push(clean(options.title)||"PACE SOUTH");
 const stamp=statusReportStamp(board.at);
 if(stamp)lines.push(stamp);
 /* THE NUMBERS THAT ARE NOT LIKE THE OTHERS, fenced off so nobody has to be
    told twice. Curtis: "The downed bus number and inspection number should be
    separated from the rest of the metrics given and it should be obvious to the
    person reading it. So they know the counts do not include them."

    A heavy rule above and below rather than a footnote, because a footnote is
    the thing a person skips when somebody is standing in front of them. */
 lines.push(band);
 /* No "(downed buses only)" under it. Curtis: "get rid of the extra redundant
    (downed buses only) line under downed buses. Not necessary on either
    version." The heading already says DOWNED BUSES; the line under it repeated
    the heading back. The one under INSPECTIONS says something the heading does
    not — that this number is NOT inside the one above — and so it stays, and it
    leaves with the line it is about rather than hanging under nothing. */
 lines.push(countLine("DOWNED BUSES",board.downed));
 /* SOFT DOWN DIRECTLY UNDER IT, then the two added up, which is the order
    Curtis asked for and the order somebody reads them in: what cannot run, what
    can run with limits, what the shortage adds up to.

    Printed only when there are any. A morning with nothing soft on the sheet
    should read as one number and a total that repeats it, which is noise — so
    on those mornings DOWNED BUSES stands alone exactly as it always did, and
    nobody has to learn a new report to read an ordinary one. */
 if(board.softDowned>0){
  lines.push(countLine("SOFT DOWN",board.softDowned));
  lines.push("  (on the sheet, still usable)");
  lines.push(countLine("TOTAL DOWN + SOFT",board.downedTotal));
 }
 if(pick.inspections){
  lines.push(countLine("INSPECTIONS",board.inspections));
  lines.push("  (not counted above)");
 }
 lines.push(band);
 /* ROADCALLS PENDING FIRST, THEN MYSTERY. Curtis: "also match the reports."
    Pending leads because it is the more urgent errand: a bus that broke down
    and nobody has written up is a known problem going unrecorded, where a
    mystery bus is a question. */
 if(pick.roadCalls){
  lines.push(countLine("ROADCALLS PENDING",board.roadCallsPending.length));
  /* The star and its footnote are gone with the second list. Not on the sheet
     IS the definition now, so it is said once, under the heading, instead of
     against every row and again at the bottom. */
  lines.push("  (not on the down sheet)");
  /* Road calls are not capped: the 36-hour window keeps the list short by
     construction, and each one is a bus somebody has to chase. */
  lines.push(...detail(board.roadCallsPending,pick,false));
 }
 if(pick.mystery){
  if(pick.roadCalls)lines.push(rule);
  lines.push(countLine("MYSTERY BUSES",board.mystery.length));
  /* A blank line between the number and the caveat. Curtis: "put a space in
     between (like a tabbed space so its not so bunced up) in between Mystery
     buses and Pending confirmation of status line." Stacked directly the two
     read as one wrapped sentence; separated, the number is a number and the
     caveat is a note about it. */
  if(board.mystery.length){lines.push("");lines.push("  "+MYSTERY_CAVEAT)}
  lines.push(...detail(board.mystery,pick,true));
 }
 /* THE TECH SERVICES BLOCK, fenced together. Three counts of the same kind of
    thing, and a reader scanning for "how many fareboxes" should find them in
    one place rather than three headings apart. */
 const tech=techSections(board,pick);
 if(tech.length){
  lines.push(rule);
  for(const section of tech){
   lines.push(countLine(section.label,section.buses.length));
   lines.push(...detail(section.buses,pick,true));
  }
 }
 if(pick.forecast&&options.forecast?.length){
  lines.push(rule);
  lines.push(...options.forecast);
 }
 return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

/* A heading and its number, padded to a fixed column so the figures line up
   down the page. The old lines hard-coded their own padding, which is how
   "ROADCALLS PENDING   3" and "DOWNED BUSES        1" stayed in step by hand
   and why a fourth heading could not be added without measuring it. */
const COUNT_COLUMN=20;
function countLine(label:string,count:number){
 return (label.length>=COUNT_COLUMN?label+" ":label.padEnd(COUNT_COLUMN))+count;
}

/* Two spellings of the same heading, because the two documents set type
   differently: the message is upper case throughout, the PDF is sentence case.
   Derived rather than typed twice would give "Cubic screens" — CUBIC is the
   vendor's name and a lower-cased acronym reads as a different word. */
export type StatusReportSection={key:Exclude<TechServicesGroup,null>;label:string;title:string;buses:StatusReportBusLine[]};

/* Which of the three the include list asked for, in the order Curtis named
   them. IBS is not offered: he asked for farebox, Ventra and the CUBIC screens,
   and the IBS screens have not been raised as a level anybody is reporting. The
   group is still read, so the count exists the day it is asked for. */
export function techSections(board:FleetStatusReport,pick:StatusReportPick):StatusReportSection[]{
 const out:StatusReportSection[]=[];
 if(pick.farebox)out.push({key:"farebox",label:"FAREBOX",title:"Farebox",buses:board.tech.farebox});
 if(pick.ventra)out.push({key:"ventra",label:"VENTRA",title:"Ventra",buses:board.tech.ventra});
 if(pick.cubic)out.push({key:"cubic",label:"CUBIC SCREENS",title:"CUBIC screens",buses:board.tech.cubic});
 return out;
}

/* The one place the three detail switches are read. Every section goes through
   it, so a section cannot end up printing locations while its neighbour prints
   numbers because somebody wired one of them by hand. */
function detail(buses:StatusReportBusLine[],pick:StatusReportPick,capped:boolean){
 if(!pick.numbers||!buses.length)return [];
 if(!pick.locations)return numberRows(buses);
 return capped?busList(buses,pick.defects):buses.flatMap(bus=>busBlock(bus,pick.defects));
}

/* Fleet numbers packed across the width, nothing else. Every number is there —
   losing one to a "+6 more" would defeat a list whose entire content is which
   buses to go and find. */
function numberRows(buses:StatusReportBusLine[]){
 const out:string[]=[];
 let row="  ";
 for(const bus of buses){
  if((row+" "+bus.n).length>STATUS_REPORT_WIDTH){out.push(row);row="  "}
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
export const STATUS_REPORT_DETAIL_LIMIT=8;

function busList(buses:StatusReportBusLine[],includeDefects?:boolean){
 const out:string[]=[];
 for(const bus of buses.slice(0,STATUS_REPORT_DETAIL_LIMIT))out.push(...busBlock(bus,includeDefects));
 const rest=buses.slice(STATUS_REPORT_DETAIL_LIMIT);
 if(!rest.length)return out;
 out.push("  + "+rest.length+" more:");
 /* Packed to the width rather than one per line — that is the entire saving. */
 let row="   ";
 for(const bus of rest){
  if((row+" "+bus.n).length>STATUS_REPORT_WIDTH){out.push(row);row="   "}
  row+=" "+bus.n;
 }
 if(row.trim())out.push(row);
 return out;
}

function busBlock(bus:StatusReportBusLine,includeDefects?:boolean,mark=""){
 /* The number is fixed, the mark is fixed, and the location gives up whatever
    room the note needs — of the three it is the one a reader can infer. */
 const head="  "+bus.n+"  ";
 /* An empty note prints nothing at all rather than an empty "()" — mystery
    buses lost their note when the open-repair count went. */
 const note=bus.note?" ("+bus.note+")":"";
 const room=STATUS_REPORT_WIDTH-head.length-note.length-mark.length;
 const out=[head+fit(bus.where,Math.max(room,4))+note+mark];
 /* Curtis: "have a check mark that says (include defects of each bus) in case
    they request it. Since defects are on buses no matter the status." Off by
    default: the short version is the one that gets read. */
 if(includeDefects)for(const line of bus.defects)out.push("    - "+fit(line,STATUS_REPORT_WIDTH-6));
 return out;
}
