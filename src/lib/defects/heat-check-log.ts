import {defectShortLabel} from "./repair-catalog.ts";
import {quickFilterDefects} from "./quick-filters.ts";
import {dayStamp,HEAT_CHECK_MAX_AGE_DAYS,heatDateUnplaced,heatLowConfidence,localDay,type HeatFinding,type HeatFleetBus} from "./heat-check-import.ts";

/* WHO CHECKED WHICH BUS FOR HEAT, WHEN, AND WHAT THEY FOUND.

   The heat sheet is not a Down Sheet, and Curtis said why: "the heat sheet
   needs to be shared and verify with multiple mechanics because a mechanic
   could be put on heat sheet duty [...] check buses physically to see [...] if
   the heat has been fixed or [...] if it needs attention, so the functionality
   is a bit different than the down sheet. The down sheet is just a snapshot of
   what currently happening during a shift [...] it doesn't change hands [as]
   frequently."

   So this is not a snapshot that a scan replaces. It is a LOG OF CHECKS, and
   the unit is one person looking at one bus on one day:

   - A CHECK IS AN EVENT. It happened once and is never edited. A bus found cold
     on 10/7 by one mechanic and found warm on 11/3 by another is two checks,
     and both are kept — the second does not overwrite the first, because "who
     found it" and "who confirmed the fix" are both the point.
   - A BUS'S STANDING IS ITS LATEST CHECK, read at the moment somebody asks.
   - TWO PEOPLE WORKING THE SHEET NEVER COLLIDE, for the reason the swap ledger
     gives: where two records describe the same thing this app compares stamps
     and picks a winner; where they are separate events it keeps both. Two
     mechanics on two phones are making separate events, so merging their logs
     is a union and there is nothing to reconcile.

   WHERE THE NO-HEAT BUSES LIVE IS NOT HERE. Curtis: "it would make sense for it
   to be on the defect [log] because they're not necessarily putting the buses
   with no heat on the down list because they're letting them roll every day
   despite being cold because they're trying to make pull out". A cold bus is a
   DEFECT on a bus that still runs, and the Defect Log's No Heat Buses list is
   the one place that says which buses are cold right now. This log never
   decides that. It records that somebody looked, and `heatRoster` sets the two
   side by side.

   A BUS IS A FLEET NUMBER HERE, never a bus id. A bus id is device-local, and
   this log is the part of the feature meant to travel between phones.

   PURE: no rendering. Storage is touched only by the helpers at the bottom,
   each of which is handed it. */

export const HEAT_CHECKS_KEY="pace-heat-checks-v1";

/* One check is about 150 bytes of JSON, so two thousand is about 300KB in a
   LocalStorage that also holds the board. The first sheet photographed had 108
   lines, so that is room for every bus on it to be checked many times over
   across several winters. The cap exists so a log nobody ever clears cannot
   grow until it costs somebody their board, and it drops the OLDEST — the
   reasoning `SHEET_LEDGER_LIMIT` already wrote down. */
export const HEAT_CHECKS_LIMIT=2000;
export const HEAT_CHECK_BY_LIMIT=16;

export type HeatResult="ok"|"no-heat";

export type HeatCheck={
 id:string;
 busNumber:string;
 result:HeatResult;
 /* The calendar day the bus was checked, YYYY-MM-DD. "" only for a line off
    the paper that carried no date: the check happened, nobody wrote when. */
 on:string;
 /* The checker's initials, upper-cased. May be "" off the paper. */
 by:string;
 /* When this device wrote the check down. For a tap in the app that is the
    check itself; for a line off the paper it is when the photo was read, which
    can be weeks after the day in `on`. */
 at:string;
 source:"paper"|"app";
 note?:string;
};

function clean(value:unknown){return typeof value==="string"?value.trim():""}
function digits(value:unknown){return clean(value).replace(/\D/g,"").slice(0,5)}
function validDay(value:unknown){
 const text=clean(value);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(text))return "";
 const back=new Date(dayStamp(text));
 return !Number.isNaN(back.getTime())&&back.toISOString().slice(0,10)===text?text:"";
}
function instant(value:unknown){const stamp=Date.parse(clean(value));return Number.isNaN(stamp)?"":new Date(stamp).toISOString()}

/* THE ID OF A LINE OFF THE PAPER IS WHAT THE LINE SAYS, and that is what makes
   re-photographing a sheet harmless.

   The same sheet gets photographed again every time somebody adds to it, and on
   more than one phone. With a random id every re-scan would log every line a
   second time, and a bus checked once would show three checks. Built from the
   bus, the result, the day and the initials, the same line is the same check
   however many times and wherever it is read, and a merge drops the repeat —
   the property the swap ledger gets from "a file imported twice does not
   double-count".

   A tap in the app is the opposite: two taps are two checks even when
   everything about them matches, so those carry the instant and a random
   tail. */
export function paperCheckId(busNumber:string,result:HeatResult,on:string,by:string,readOn=""){
 /* A LINE WITH NO DATE IS NAMED BY THE DAY IT WAS READ. With nothing but
    "undated" in its place, every undated OK ever written beside a bus was the
    same check: last winter's and this winter's merged into one stamped last
    year, and the bus read NOT CHECKED the week it was scanned OK. Four of the
    77 lines on the first sheet carry no date, so this is not a corner. The
    price is that an undated line re-read on a LATER day logs again — the same
    result twice, which changes no bus's standing, against a real check
    silently dropped, which does. */
 return ["paper",busNumber,result,on||"undated@"+(readOn||"unknown"),(by||"none").toUpperCase()].join("-");
}

/* The day a check counts as having happened. An undated paper line sorts
   BEFORE every dated check on its bus: all that is known is that it was
   written before the photo, and letting the photo's date stand in for it would
   put a weeks-old N/R ahead of last Tuesday's OK. */
function standing(check:HeatCheck){return check.on||"0000-00-00"}

/* Later check wins; the stamp settles two on one day. */
function later(left:HeatCheck,right:HeatCheck){
 const days=standing(left).localeCompare(standing(right));
 return days!==0?days>0:left.at.localeCompare(right.at)>0;
}

/* Anything read from storage, a transfer or another phone passes through here.
   Kept oldest-recorded first, deduped by id keeping the FIRST copy seen — so in
   a merge, a check this device already holds keeps the stamp it was written
   with. Capped to the newest. */
export function normalizeHeatChecks(value:unknown,limit=HEAT_CHECKS_LIMIT):HeatCheck[]{
 if(!Array.isArray(value))return [];
 const out:HeatCheck[]=[],seen=new Set<string>();
 for(const candidate of value){
  if(!candidate||typeof candidate!=="object")continue;
  const raw=candidate as Partial<HeatCheck>;
  const busNumber=digits(raw.busNumber),at=instant(raw.at);
  /* Exactly the two words. Anything else is not a result this log can stand
     behind, and a check that reads "maybe" must not count as either. */
  const result=raw.result==="ok"||raw.result==="no-heat"?raw.result:null;
  if(!busNumber||!at||!result)continue;
  const source=raw.source==="paper"?"paper":"app";
  /* Sixteen, which is what the YOUR NAME box on Fleet Campaigns allows. It was
     six, so "MICHAEL J" was MICHAE on the check and MICHAEL J on the defect
     the same tap opened. */
  const on=validDay(raw.on),by=clean(raw.by).toUpperCase().slice(0,HEAT_CHECK_BY_LIMIT);
  /* An app check with no day is given the day it was recorded; only the paper
     can honestly have none. */
  const day=on||(source==="app"?localDay(at):"");
  const id=clean(raw.id)||(source==="paper"?paperCheckId(busNumber,result,day,by,localDay(at)):"app-"+busNumber+"-"+Date.parse(at));
  if(seen.has(id))continue;
  seen.add(id);
  const check:HeatCheck={id,busNumber,result,on:day,by,at,source};
  const note=clean(raw.note).slice(0,240);
  if(note)check.note=note;
  out.push(check);
 }
 out.sort((left,right)=>left.at.localeCompare(right.at)||left.id.localeCompare(right.id));
 return out.length>limit?out.slice(out.length-limit):out;
}

/* The union IS the history. Mine first, so a check both phones hold keeps this
   device's copy. */
export function mergeHeatChecks(mine:unknown,theirs:unknown,limit=HEAT_CHECKS_LIMIT):HeatCheck[]{
 return normalizeHeatChecks([...normalizeHeatChecks(mine,Infinity),...normalizeHeatChecks(theirs,Infinity)],limit);
}

/* One tap in the app: this person, this bus, now. */
export function recordHeatCheck(checks:unknown,input:{busNumber:string;result:HeatResult;by:string;note?:string},now=new Date().toISOString(),idSeed=Math.random().toString(36).slice(2,8)):HeatCheck[]{
 const busNumber=digits(input.busNumber),at=instant(now);
 if(!busNumber||!at)return normalizeHeatChecks(checks);
 return normalizeHeatChecks([...normalizeHeatChecks(checks,Infinity),
  {id:"app-"+busNumber+"-"+Date.parse(at)+"-"+idSeed,busNumber,result:input.result,on:localDay(at),by:input.by,at,source:"app",note:input.note}]);
}

/* What a reviewed scan adds to the log.

   EVERY LINE THE PAPER MAKES A CLEAR STATEMENT ABOUT, whether or not it files
   anything: an N/R on a bus that is already tagged adds no defect and is still
   somebody checking that bus on that day, and an OK is most of what this log is
   for. What is left out is exactly what the scan could not stand behind — a row
   to look at, a number the board does not have, a blank line — and a struck
   row, which Curtis has said means fixed "but I'll double check"; until he has,
   a pen line is not recorded as anybody's finding. */
export function heatChecksFromFindings(findings:HeatFinding[],now=new Date().toISOString()):HeatCheck[]{
 const at=instant(now);
 if(!at)return [];
 const checks:HeatCheck[]=[];
 for(const finding of findings){
  if(finding.fleetMatch!=="matched"||finding.struck||finding.action==="look")continue;
  if(finding.mark!=="ok"&&finding.mark!=="repair")continue;
  /* A ROW THE REVIEWER TURNED DOWN IS NOT A CHECK. A new no-heat row arrives
     ticked; one that is now unticked, and was not held back by the rules, is
     somebody looking at it and saying no — most often because the bus number
     is wrong. Logging it anyway put a bus the paper never mentioned under
     VERIFY, and the reviewer had no way to stop that short of cancelling the
     whole scan. A HELD-BACK row is different: it arrives unticked by rule, the
     paper's statement about it stands, and VERIFY is exactly where a bus whose
     repair was closed after its check belongs — UNLESS the reviewer has ticked
     it and unticked it again, which `tickHeatFinding` records as `declined`
     and which is the same "no" as on any other row. */
  if(finding.action==="file"&&!finding.selected&&(finding.declined||!finding.heldBack))continue;
  /* An OK takes a bus off the walk, so it has to be a clean read. A shaky N/R
     errs toward somebody going to look; a shaky OK errs toward nobody going,
     and it is the one line on the sheet the review does not ask about. */
  if(finding.mark==="ok"&&heatOkHeldWhy(finding))continue;
  const result:HeatResult=finding.mark==="ok"?"ok":"no-heat",by=finding.initial.toUpperCase();
  checks.push({id:paperCheckId(finding.busNumber,result,finding.checkedOn,by,localDay(at)),busNumber:finding.busNumber,result,on:finding.checkedOn,by,at,source:"paper"});
 }
 return normalizeHeatChecks(checks,Infinity);
}

/* WHY AN OK ON THE SHEET IS NOT LOGGED, in the words the review shows — or ""
   when nothing about the line itself stands in the way.

   An OK takes a bus off the walk, so it is the one result that has to be
   believed before it is written down, and there are two ways it is not:

   - THE READ WAS NOT CLEAN. A shaky N/R errs toward somebody going to look; a
     shaky OK errs toward nobody going.
   - ITS DATE WAS WRITTEN AND COULD NOT BE PLACED. Such a line went on as
     UNDATED, and an undated line counts from the day it was read — so an OK
     dated 10/22/2025, scanned this November, logged as this season's check and
     the bus came off the list on the strength of last winter. An empty date
     cell is still an honest undated line. An N/R with a date like that is
     still filed and logged: that errs toward somebody going to the bus, which
     is the direction an unreadable date should err in.

   The review screen draws this sentence, so it and the log cannot give two
   different reasons. A page the scan does not trust is a third reason and is
   not this function's: that is about the page, and `heatLoggable` owns it. */
export function heatOkHeldWhy(finding:Pick<HeatFinding,"confidence"|"dateWritten"|"checkedOn">):string{
 if(heatLowConfidence(finding))return "the read was not clean, check the paper";
 if(heatDateUnplaced(finding))return "its date could not be placed in this season, check the paper";
 return "";
}

/* TAKING A SCAN BACK OUT TAKES ITS CHECKS WITH IT.

   SCAN BATCHES removes the defects one press filed, and the scanner's own
   confirm says it "takes the whole scan back out". Measured in a browser before
   this existed: the thirteen defects went and the twenty-two checks stayed, so
   every bus the removed scan had called N/R dropped into VERIFY — "last check
   said no heat, nothing open on the board" — which is the scan still speaking
   after somebody had taken it back.

   A press stamps its checks with the same instant it stamps its defects, so the
   batch's key finds them exactly. Only PAPER checks, and only ones that carry
   that stamp: a line this device had already read on an earlier scan kept the
   earlier stamp when the merge deduped it, so it is not this scan's to remove,
   and a tap in the app is never a scan's. */
export function withoutScanChecks(checks:unknown,stamp:string):{checks:HeatCheck[];removed:number}{
 const all=normalizeHeatChecks(checks,Infinity),at=instant(stamp);
 if(!at)return {checks:all,removed:0};
 const kept=all.filter(check=>!(check.source==="paper"&&check.at===at));
 return {checks:kept,removed:all.length-kept.length};
}

/* Where one bus stands.

   no-heat    the board holds an open heat repair. The board decides this, not
              the log: a bus is cold until its repair is closed, however many
              people have since said it felt warm.
   verify     nothing open on the board, and the last person to check said no
              heat. Either the repair was closed and nobody has gone back to
              confirm it, or the finding never became a defect. This is the
              heat-sheet duty Curtis described: go and physically check
              whether the heat has been fixed.
   ok         nothing open, and the last check this season said the heat works
   unchecked  nothing open, and nobody has checked it this season */
export type HeatStanding="no-heat"|"verify"|"ok"|"unchecked";

export type HeatRosterRow={
 busNumber:string;
 status:HeatStanding;
 /* The open heat repairs on the board, by name. */
 openHeat:string[];
 /* The latest check THIS SEASON, or null. */
 latest:HeatCheck|null;
 /* Every check this log holds for the bus, any season. */
 checks:number;
 /* An open heat repair that somebody has since checked and found working:
    the row to offer "mark the repair fixed" on. Never done automatically. */
 checkedOkWhileOpen:boolean;
};

const RANK:Record<HeatStanding,number>={"no-heat":0,verify:1,unchecked:2,ok:3};

/* A check counts toward where a bus stands for one season. Last winter's OK
   says nothing about this winter's heater, and it is still in the log. An
   undated line counts from the day it was read. */
function thisSeason(check:HeatCheck,today:string){
 const day=check.on||localDay(check.at);
 if(!day||!today)return false;
 const age=(dayStamp(today)-dayStamp(day))/86400000;
 return age>=0&&age<=HEAT_CHECK_MAX_AGE_DAYS;
}

/* The whole fleet, one row per fleet number, what needs somebody first.

   EVERY BUS ON THE BOARD IS A ROW, checked or not, because "not checked yet" is
   a third of what a heat sheet says and a list built from the checks alone
   cannot say it. A check for a number the board does not hold is not a row —
   it stays in the log, and shows the day that bus is added. */
export function heatRoster(fleet:HeatFleetBus[],checks:unknown,now=new Date().toISOString()):HeatRosterRow[]{
 const today=localDay(now),byBus=new Map<string,HeatCheck[]>();
 for(const check of normalizeHeatChecks(checks,Infinity))byBus.set(check.busNumber,[...(byBus.get(check.busNumber)||[]),check]);
 const rows=new Map<string,HeatRosterRow>();
 for(const bus of fleet){
  const busNumber=digits(bus.n);
  if(!busNumber)continue;
  /* A decommissioned bus is not on anybody's walk. Left in, it sat under NOT
     CHECKED for good: the to-do count could never reach zero and the list
     could never say every bus was done. The Down Sheet's mystery board leaves
     them out for the same reason. */
  if(bus.s==="decommissioned")continue;
  const openHeat=quickFilterDefects(bus,"no-cabin-heat",now).map(defectShortLabel);
  const existing=rows.get(busNumber);
  /* Two buses on the board sharing a number are one line on anybody's sheet. */
  if(existing){existing.openHeat=[...new Set([...existing.openHeat,...openHeat])];continue}
  rows.set(busNumber,{busNumber,status:"unchecked",openHeat,latest:null,checks:0,checkedOkWhileOpen:false});
 }
 for(const row of rows.values()){
  const all=byBus.get(row.busNumber)||[];
  row.checks=all.length;
  for(const check of all)if(thisSeason(check,today)&&(!row.latest||later(check,row.latest)))row.latest=check;
  if(row.openHeat.length){row.status="no-heat";row.checkedOkWhileOpen=row.latest?.result==="ok"}
  else row.status=!row.latest?"unchecked":row.latest.result==="ok"?"ok":"verify";
 }
 return [...rows.values()].sort((left,right)=>RANK[left.status]-RANK[right.status]||left.busNumber.localeCompare(right.busNumber,undefined,{numeric:true}));
}

/* `todo` is everything somebody still has to walk up to: the cold ones, the
   ones to verify and the ones nobody has checked. Counted here so the tab that
   shows them and the number on it cannot be worked out two ways. */
export function heatRosterCounts(rows:HeatRosterRow[]){
 const count=(status:HeatStanding)=>rows.filter(row=>row.status===status).length;
 const noHeat=count("no-heat"),verify=count("verify"),unchecked=count("unchecked");
 return {noHeat,verify,unchecked,ok:count("ok"),todo:noHeat+verify+unchecked,total:rows.length};
}

/* The groups the list can be narrowed to, and the one rule for who is in each.
   "todo" is the default: a bus that is fine is not a stop on the walk. */
export type HeatLane="todo"|HeatStanding;
export function heatRosterLane(rows:HeatRosterRow[],lane:HeatLane){
 return rows.filter(row=>lane==="todo"?row.status!=="ok":row.status===lane);
}

/* How long the tap buttons stay dead after a tap, in milliseconds. Long enough
   that a double-tap cannot land on the row that slid up into place, short
   enough that somebody walking a lane of buses never waits on it. */
export const HEAT_TAP_GUARD_MS=700;

/* What a standing is called on screen and in the shared list. */
export const HEAT_STANDING_LABEL:Record<HeatStanding,string>={"no-heat":"NO HEAT",verify:"VERIFY",unchecked:"NOT CHECKED",ok:"HEAT OK"};

/* The line under a bus number: why it stands where it does. A bus with an open
   repair names the repair first, because that is what somebody will act on;
   a bus to verify says the board has nothing open, because that is the
   surprise. */
export function heatRowDetail(row:HeatRosterRow):string{
 const last=lastChecked(row.latest);
 if(row.status==="no-heat")return [row.openHeat.join(" · "),last?(row.checkedOkWhileOpen?"checked "+last+" — repair still open":"last check: "+last):""].filter(Boolean).join(" · ");
 if(row.status==="verify")return "Nothing open on the board · last check: "+last;
 if(row.status==="ok")return "Checked "+last;
 return row.checks?"Not checked this season":"Never checked";
}

function shortDay(day:string){const [,month,date]=day.split("-").map(Number);return month+"/"+date}

function lastChecked(check:HeatCheck|null){
 if(!check)return "";
 return [check.result==="ok"?"OK":"no heat",check.on?shortDay(check.on):"",check.by].filter(Boolean).join(" ");
}

/* THE LIST TO HAND TO WHOEVER IS ON HEAT DUTY, as plain text.

   Fleet Campaigns exists for "working lists you can hand to someone without the
   app", and most of the people who will walk this list do not have it. So the
   loop has to close on paper: this goes out as a text or a printout, the marks
   come back on the sheet, and the sheet is photographed in.

   Plain text with real line breaks, for the reason `busListExportText` gives —
   it has to survive a text message. OK buses are left off by default: the list
   is for the person doing the walking, and a bus that is fine is not a stop. */
export type HeatShareMode="remaining"|"full";

export function heatShareText(rows:HeatRosterRow[],mode:HeatShareMode="remaining",now=new Date().toISOString()):string{
 const counts=heatRosterCounts(rows),day=localDay(now);
 const lines=["HEAT CHECK"+(day?" · "+shortDay(day):""),
  [counts.noHeat+" no heat",counts.verify+" to verify",counts.unchecked+" not checked",counts.ok+" OK"].join(" · ")];
 const of=(status:HeatStanding)=>rows.filter(row=>row.status===status);
 const section=(title:string,list:HeatRosterRow[],line:(row:HeatRosterRow)=>string)=>{
  if(!list.length)return;
  lines.push("",title+" ("+list.length+")",...list.map(row=>"  "+line(row)));
 };
 section("NO HEAT",of("no-heat"),row=>[row.busNumber,row.openHeat.join("; "),row.checkedOkWhileOpen?"checked "+lastChecked(row.latest)+" — repair still open":""].filter(Boolean).join(" — "));
 section("REPAIRED OR NEVER LOGGED — VERIFY",of("verify"),row=>[row.busNumber,"last check: "+lastChecked(row.latest)].join(" — "));
 const unchecked=of("unchecked");
 if(unchecked.length)lines.push("","NOT CHECKED ("+unchecked.length+")","  "+unchecked.map(row=>row.busNumber).join(", "));
 if(mode==="full")section("HEAT OK",of("ok"),row=>[row.busNumber,lastChecked(row.latest)].join(" — "));
 if(!rows.length)lines.push("","No buses on the board.");
 else if(mode==="remaining"&&!counts.noHeat&&!counts.verify&&!counts.unchecked)lines.push("","Every bus has been checked and has heat.");
 return lines.join("\n");
}

/* How another page asks the Defect Log to open the heat sheet scanner.

   The scanner lives on the Defect Log because that is where its results land
   and where the board is saved, undone and taken back out; Fleet Campaigns is
   where the heat campaign is run from. So the campaign's SCAN button is a link,
   and this is its address — one definition, so the link and the page that
   reads it cannot drift. */
export const HEAT_SCAN_PARAM="scan";
export const HEAT_SCAN_VALUE="heat";
export function heatScanHref(){return "/defect-log?"+HEAT_SCAN_PARAM+"="+HEAT_SCAN_VALUE}

/* ADDING CHECKS TO THE LOG ON DISK: read, merge, write, in one place.

   Three callers add checks — a filed scan, a tap, a restore — and each used to
   spell this out. One of them replacing the log instead of merging it would
   pass every test that only watched the function it called, which a cold read
   proved by doing it. `added` is how many are NEW to this device, which is the
   number worth telling somebody: a sheet scanned a second time reads sixty
   lines and adds none. */
export function addHeatChecks(storage:LogStorage,checks:unknown):{ok:boolean;why?:HeatLogProblem;added:number;total:number}{
 const before=readHeatChecks(storage),merged=mergeHeatChecks(before,checks);
 /* COUNTED BY ID, NOT BY LENGTH. At the cap the log does not get longer when a
    check goes in — the oldest drops out to make room — so `merged.length -
    before.length` read zero, nothing was written, and the scan's alert said
    every line "was already in the log". A log that had reached two thousand
    would never have taken another check off the paper: the swap ledger's
    "never learns anything after its fortieth swap", found here by a cold
    read. */
 const had=new Set(before.map(check=>check.id));
 const added=merged.filter(check=>!had.has(check.id)).length;
 if(!added)return {ok:true,added:0,total:merged.length};
 const written=writeHeatChecks(storage,merged);
 return {...written,added,total:merged.length};
}

/* TAKING A SCAN'S CHECKS OFF THE LOG ON DISK, for every door that removes a
   scan. It lived in the Defect Log's page first, which is exactly why the AI
   Operator — the other way to remove a scan — took the defects and left every
   check behind. A sweep logs no checks, so for one this does nothing. */
export function dropScanChecks(storage:LogStorage,batch:{kind:string;key:string}):{ok:boolean;why?:HeatLogProblem;removed:number}{
 if(batch.kind!=="heat")return {ok:true,removed:0};
 /* A log that cannot be read is not "no checks to remove". It read as empty,
    so this answered success with nothing removed, and the screen said the scan
    was out while its checks sat in a log nobody could see into. */
 if(!storedHeatChecks(storage).readable)return {ok:false,why:"unreadable",removed:0};
 const cut=withoutScanChecks(readHeatChecks(storage),batch.key);
 if(!cut.removed)return {ok:true,removed:0};
 return {...writeHeatChecks(storage,cut.checks),removed:cut.removed};
}

/* Taking ONE check back: the last tap, made on the wrong bus. A check is an
   event and is never edited, but a tap that never should have happened is not
   an event — and without this the only way to correct a stray HEAT OK was to
   tap NO HEAT, which opens a defect on a bus nobody found cold. */
export function undoHeatCheck(storage:LogStorage,id:string):{ok:boolean;why?:HeatLogProblem;removed:boolean}{
 const all=readHeatChecks(storage),kept=all.filter(check=>check.id!==id);
 if(kept.length===all.length)return {ok:true,removed:false};
 return {...writeHeatChecks(storage,kept),removed:true};
}

type LogStorage=Pick<Storage,"getItem"|"setItem">;

/* What is under the key, and whether this code can read it. Nothing stored is
   an empty log and readable; a value that is there and is not a list of checks
   is NOT an empty log, and the difference is the whole point of asking. */
function storedHeatChecks(storage:Pick<Storage,"getItem">):{readable:boolean;checks:HeatCheck[]}{
 let raw:string|null;
 try{raw=storage.getItem(HEAT_CHECKS_KEY)}catch{return {readable:false,checks:[]}}
 if(raw===null||raw===undefined||!String(raw).trim())return {readable:true,checks:[]};
 try{
  const parsed=JSON.parse(raw);
  return Array.isArray(parsed)?{readable:true,checks:normalizeHeatChecks(parsed)}:{readable:false,checks:[]};
 }catch{return {readable:false,checks:[]}}
}

/* For DRAWING: a log that cannot be read draws as empty, because a list that
   refuses to render helps nobody at a bus. Writing is where it is refused. */
export function readHeatChecks(storage:Pick<Storage,"getItem">):HeatCheck[]{
 return storedHeatChecks(storage).checks;
}

/* Why a write to the log did not happen. */
export type HeatLogProblem="full"|"unreadable";

/* The words for it, in one place, for every screen that has to say so. */
export function heatLogProblemWords(why:HeatLogProblem|undefined){
 return why==="unreadable"
  ?"the heat check log on this device could not be read, so it was left alone rather than written over"
  :"this device's storage is full";
}

/* Reported, not thrown. The caller is in the middle of filing a scan or
   recording a tap, and decides what a refused write means there.

   A LOG THAT CANNOT BE READ IS NOT WRITTEN OVER. Every writer here reads,
   changes and writes back, and an unreadable log reads as empty — so the next
   tap replaced whatever was stored with a log of one check. The board has
   always refused to save over a store it could not read; this is the same rule
   for the same reason, and it matters most for the case that is not corruption
   at all: a newer version of this app keeping the log in a shape this one does
   not know, on a phone still running the old page out of its cache. */
export function writeHeatChecks(storage:LogStorage,checks:HeatCheck[]):{ok:true}|{ok:false;why:HeatLogProblem}{
 if(!storedHeatChecks(storage).readable)return {ok:false,why:"unreadable"};
 try{storage.setItem(HEAT_CHECKS_KEY,JSON.stringify(normalizeHeatChecks(checks)));return {ok:true}}
 catch{return {ok:false,why:"full"}}
}
