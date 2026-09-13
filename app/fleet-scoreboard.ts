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
import {roadCallsWithin} from "./road-calls.ts";
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

export const SCOREBOARD_ROAD_CALL_HOURS=48;
const ROAD_CALL_DAYS=SCOREBOARD_ROAD_CALL_HOURS/24;

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
 roadCalls:ScoreboardBusLine[];
 roadCallsOffSheet:ScoreboardBusLine[];
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
 const mystery=mysteryBusIds(fleet as never,[...activeBusIds])
  .map(id=>byId.get(clean(id)))
  .filter(Boolean)
  .map(bus=>{
   const open=openDefects(bus as ScoreboardBus);
   return busLine(bus as ScoreboardBus,open.length?open.length+" open repair"+(open.length===1?"":"s"):"nothing logged");
  })
  .sort(byNumber);

 /* Every road call inside the window, whether or not the bus is on the sheet —
    and then the ones that are NOT, which is the list somebody has to act on.
    Curtis asked for both: "all road calls in last 48 hours only and road calls
    not on downsheet." */
 const roadCalls:ScoreboardBusLine[]=[];
 const roadCallsOffSheet:ScoreboardBusLine[]=[];
 for(const bus of fleet){
  const recent=roadCallsWithin(bus.roadCalls,now,ROAD_CALL_DAYS);
  if(!recent.length)continue;
  /* The note says only what happened. WHETHER the bus is on the sheet is
     carried by membership of roadCallsOffSheet, and how that gets shown is the
     renderer's business — the first draft spelled it into the note as well and
     the same fact went out twice, 48 characters wide. */
  const line=busLine(bus,recent.length+" road call"+(recent.length===1?"":"s"));
  roadCalls.push(line);
  if(!activeBusIds.has(clean(bus.id)))roadCallsOffSheet.push(line);
 }

 return {
  at:now,
  downed:downedIds.size,
  onSheet:activeBusIds.size,
  inspections:inspectionOnlyIds.size,
  mystery,
  roadCalls:roadCalls.sort(byNumber),
  roadCallsOffSheet:roadCallsOffSheet.sort(byNumber),
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
 const rule="-".repeat(30);
 lines.push(clean(options.title)||"PACE SOUTH");
 const stamp=scoreboardStamp(board.at);
 if(stamp)lines.push(stamp);
 lines.push(rule);
 lines.push("DOWNED BUSES        "+board.downed);
 lines.push("ON THE DOWN SHEET   "+board.onSheet);
 if(board.inspections)lines.push("  (inspections not counted as down: "+board.inspections+")");
 lines.push("");
 /* The count first, the caveat under it. On one line the two ran to 45
    characters and wrapped on a phone — caught by the test that holds every line
    to a lock screen, not by reading it. The number is what somebody is looking
    for, so it goes where the eye lands. */
 lines.push("MYSTERY BUSES       "+board.mystery.length);
 if(board.mystery.length)lines.push("  "+MYSTERY_CAVEAT);
 if(board.mystery.length)for(const bus of board.mystery)lines.push(...busBlock(bus,options.includeDefects));
 lines.push("");
 lines.push("ROAD CALLS (" +SCOREBOARD_ROAD_CALL_HOURS+"H)    "+board.roadCalls.length);
 /* Both facts Curtis asked for, without saying either of them twice. The first
    draft printed "NOT on the sheet" against each bus AND listed the same
    numbers again underneath — 54 characters wide to deliver one fact twice. A
    star against the row and one line explaining it says the same thing in a
    third of the space, and the reader can see at a glance which rows carry it. */
 const offSheet=new Set(board.roadCallsOffSheet.map(bus=>bus.id));
 for(const bus of board.roadCalls)lines.push(...busBlock(bus,options.includeDefects,offSheet.has(bus.id)?" *":""));
 if(board.roadCallsOffSheet.length)lines.push("  * NOT ON THE SHEET \u2014 "+board.roadCallsOffSheet.length);
 return lines.join("\n").replace(/\n{3,}/g,"\n\n").trim();
}

/* Cut to fit, with the ellipsis that says something was cut. Never applied to a
   fleet number: a truncated bus number is a wrong bus number, and every other
   part of the line can be shortened first. */
function fit(text:string,max:number){
 const value=clean(text);
 if(max<=1||value.length<=max)return value;
 return value.slice(0,max-1).trimEnd()+"\u2026";
}

function busBlock(bus:ScoreboardBusLine,includeDefects?:boolean,mark=""){
 /* The number is fixed, the mark is fixed, and the location gives up whatever
    room the note needs — of the three it is the one a reader can infer. */
 const head="  "+bus.n+"  ";
 const note=" ("+bus.note+")";
 const room=SCOREBOARD_WIDTH-head.length-note.length-mark.length;
 const out=[head+fit(bus.where,Math.max(room,4))+note+mark];
 /* Curtis: "have a check mark that says (include defects of each bus) in case
    they request it. Since defects are on buses no matter the status." Off by
    default: the short version is the one that gets read. */
 if(includeDefects)for(const line of bus.defects)out.push("    - "+fit(line,SCOREBOARD_WIDTH-6));
 return out;
}
