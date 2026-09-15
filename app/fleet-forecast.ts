/* THE FLEET FORECAST — what the next few hours are likely to bring.

   Curtis: "I want to be able to give a forecast of possible status based on
   timing the shifts... What is the number of roadcalls likely within the next
   shift or over the next 2 shifts or select probability by pull out time...
   AC repairs and Check engine lights tend to stay on the longest. Producing a
   higher rate of downsheet stick!" And the hedge, in his words: "not guaranteed
   but based on work flow and probability logistics."

   Pure functions. No storage, no rendering, no clock of its own — the same
   shape fleet-status-report.ts uses, for the same reason: the numbers have to
   be testable without a browser, and the surfaces have to be unable to disagree
   about them.

   THE MODEL, AND WHY EACH PIECE IS THE RIGHT ONE.

   Road calls are independent count events arriving in time, which is what a
   Poisson process describes. The rate is estimated PER SHIFT rather than across
   the day, because a morning pullout spike is real and an all-day average
   erases it. For a window of t hours at rate lambda:

     expected = lambda * t          P(at least one) = 1 - e^(-lambda*t)

   All three windows Curtis asked for — the rest of this shift, the next two,
   or between now and the pullout — are the same estimator with a different t
   off the shift clock, which is why shift-clock.ts owns the windows and this
   module owns nothing about what time it is.

   IT REPORTS A RANGE, NOT A NUMBER. Two weeks of data gives a wide interval,
   and a forecast that says "3.4 road calls" out of eight observations is lying
   about its own precision. When a foreman's own judgement sits inside the
   range, the forecast has told him nothing and should look like it.

   AND IT REFUSES BELOW A THRESHOLD. A number produced from four observations
   is wrong in a way that looks authoritative, one foreman acts on it, and the
   feature is dead the moment it costs somebody a bus. Refusing early is what
   makes the number worth anything later. */

import {isUnresolved,type StructuredDefect} from "./repair-catalog.ts";
import {normalizeRoadCalls} from "./road-calls.ts";
import {normalizeSheetLedger} from "./sheet-ledger.ts";
import {DEFAULT_SHIFT_SETTINGS,clockMinutes,minuteOfDay,nextPullout,shiftAt,windowHours,type ShiftKey,type ShiftSettings} from "./shift-clock.ts";

/* How far back the rate is estimated from. Three weeks rather than the road
   call module's own seven days: seven days of a quiet week is four events, and
   four events cannot carry a rate. Long enough to have something to say, short
   enough that a change in the fleet shows up inside a month. */
export const FORECAST_LOOKBACK_DAYS=21;

/* Below this many road calls in the lookback the forecast says what it is
   waiting for instead of giving a number. Twelve is roughly where the Poisson
   interval stops being wider than the answer. */
export const FORECAST_MIN_ROAD_CALLS=12;

/* And below this many sheet swaps there is no clearance rate to speak of.
   ledgerTempo yields one measurement per PAIR of snapshots, so three swaps is
   two measurements — the fewest that can disagree with each other. */
export const FORECAST_MIN_SWAPS=3;

/* How many repairs of a category before its dwell is worth printing. Two
   observations produce a median that is just one of them. */
export const FORECAST_MIN_DWELL=3;

export const FORECAST_HEDGE="not guaranteed - based on work flow and probability logistics";

export type ForecastBus={
 id:string;
 /* The fleet number. The ledger keys on it, so measuring whether a road-called
    bus later reached the sheet means joining on this and not on the id. */
 n?:string;
 roadcall?:boolean;
 roadCalls?:unknown;
 defects?:Partial<StructuredDefect>[];
};
export type ForecastEntry={busId?:string;busNumber?:string;workflow?:string;category?:string};

export type ForecastRange={low:number;high:number};

export type RoadCallForecast={
 /* Road calls recorded in the SHIFTS THIS WINDOW COVERS, which is what the
    interval is computed from, and `total` is every one in the lookback. The two
    are kept apart because they answer different questions and the first draft
    used the second for both: twenty road calls on record, none of them on the
    shift being forecast, and the report said "0 expected, 0% chance of any" —
    a confident answer drawn from no observations at all, which is the exact
    failure the gate exists to prevent. */
 observed:number;
 total:number;
 /* Enough history overall, but none of it on this shift. Said in those words
    rather than as a zero, because a zero reads as a prediction. */
 quiet:boolean;
 hours:number;
 expected:number;
 range:ForecastRange;
 chance:number;
 enough:boolean;
 need:number;
};

/* ONE QUEUE YOU CAN SEE, CONVERTING AT A RATE YOU CAN MEASURE.

   Curtis, on road calls: "if a roll call comes in, just the fact that a bus is
   a roll call, it should add to the probability of more down buses, depending
   on the conversion from roll call to down sheet... if we have 10 roll calls
   and only two of them are converted to the down sheet, then that's a 20%
   chance." And on inspections: "we need inspection also counted in that rate if
   half of them are counted as down buses or become downed buses with PM
   defects. That is a factor we cannot ignore."

   Both are the same shape and neither is visible to an average. The arrival
   rate is measured over past windows, so it carries the TYPICAL conversion of
   both and knows nothing about what is standing on the yard tonight — and the
   queue moves hard: the HOLD block went from three to eight overnight between
   the 13th and the 14th. */
export type QueueTerm={
 /* How many are standing right now. */
 pool:number;
 /* The measured conversion. Per POOL-HOUR for inspections, which sit for days
    and must be scaled to the window; per BUS for road calls, which are a
    pending decision a foreman resolves within a shift rather than a slow burn.
    The units differ because the two things differ, and `expected` is the only
    number a caller should read. */
 rate:number;
 /* What the pool contributes to this window. */
 expected:number;
 enough:boolean;
 need:number;
};

export type DownedForecast={
 now:number;
 range:ForecastRange;
 /* The two queues, kept apart so the number can be taken to pieces. */
 fromInspections:QueueTerm;
 fromRoadCalls:QueueTerm;
 /* THE SINGLE NUMBER, always computed and not shown by default.

    Curtis asked for one number; a range is what seven swaps can honestly
    carry, and he took that — "if it hasn't beaten my judgement yet based on a
    lack of samples then I will go with your recommendation on a range... u can
    build it for single number ability now so we don't have to revisit from
    scratch."

    So it is computed either way and the caller picks the spelling. Switching to
    it later is a parameter, not a rewrite, and nothing has to be recomputed to
    find out what it would have said. */
 expected:number;
 inRange:ForecastRange;
 outRange:ForecastRange;
 enough:boolean;
 need:number;
};

export type DwellRow={category:string;days:number;open:number;total:number};

export type FleetForecast={
 at:string;
 shift:ShiftKey|null;
 /* The window the forecast is FOR, named the way somebody says it: "the 06:00
    pullout", "the rest of 2nd shift". */
 window:{label:string;hours:number};
 roadCalls:RoadCallForecast;
 downed:DownedForecast;
 slowest:DwellRow[];
};

export type ForecastSpan="shift"|"two-shifts"|"pullout";

/* The catalog category an inspection row carries. Named rather than inlined:
   it is the same string `fleet-status-report.ts` fences DOWNED off with. */
export const INSPECTION_CATEGORY="Inspection";

const HOUR=3600000;

function when(value:unknown){
 const stamped=Date.parse(String(value??""));
 return Number.isNaN(stamped)?null:stamped;
}

/* THE RATE, PER SHIFT.

   Every dated road call in the lookback, bucketed by the shift it landed in,
   divided by how many hours of THAT shift the lookback actually contains. A
   shift that is 8.5 hours long gets 8.5 hours a day of denominator whatever
   happened in it — which is the only way a quiet night shift reads as a low
   rate rather than as no data. */
export function roadCallRates(
 fleet:ForecastBus[],
 now=new Date().toISOString(),
 settings:ShiftSettings=DEFAULT_SHIFT_SETTINGS,
 lookbackDays=FORECAST_LOOKBACK_DAYS
){
 const end=when(now)??Date.now();
 const start=end-lookbackDays*24*HOUR;
 const counts:Record<string,number>={};
 let observed=0;
 for(const bus of fleet){
  for(const event of normalizeRoadCalls(bus.roadCalls)){
   const at=when(event.at);
   if(at===null||at<start||at>end)continue;
   const key=shiftAt(new Date(at),settings);
   if(!key)continue;
   counts[key]=(counts[key]||0)+1;
   observed++;
  }
 }
 /* The denominator, from the settings rather than from the data: how many hours
    of each shift the lookback window contains. */
 const rates:Record<string,number>={};
 for(const shift of settings.shifts){
  const from=clockMinutes(shift.start),to=clockMinutes(shift.end);
  if(from===null||to===null)continue;
  const span=(((to-from)%1440)+1440)%1440||1440;
  const hours=(span/60)*lookbackDays;
  rates[shift.key]=hours>0?(counts[shift.key]||0)/hours:0;
 }
 return {observed,counts,rates};
}

/* The window walked in half-hour steps, each step charged at the rate of the
   shift it falls in. A window that crosses a handover is the sum of two
   different rates, and asking shiftAt for every step is how the overlap rule —
   the incoming shift wins — is honoured here without being restated. */
function expectedOver(at:string,hours:number,rates:Record<string,number>,settings:ShiftSettings){
 const from=when(at);
 const shifts=new Set<string>();
 if(from===null||!(hours>0))return {expected:0,shifts};
 const step=0.5;
 let expected=0;
 for(let offset=0;offset<hours;offset+=step){
  const slice=Math.min(step,hours-offset);
  const key=shiftAt(new Date(from+offset*HOUR),settings);
  if(key)shifts.add(key);
  expected+=(key?rates[key]||0:0)*slice;
 }
 return {expected,shifts};
}

/* A Poisson interval on the rate, expressed as the multipliers it puts on any
   count derived from it. Normal approximation on sqrt(N), which is honest at
   the twelve-observation floor and gets tighter as the ledger fills. Never
   narrower than the count itself: with N observations the rate is known to
   roughly 1/sqrt(N), and pretending otherwise is the whole failure this
   function exists to prevent. */
function rateInterval(observed:number){
 if(observed<=0)return {low:0,high:0};
 const spread=1.96*Math.sqrt(observed);
 return {low:Math.max(0,(observed-spread)/observed),high:(observed+spread)/observed};
}

function spanLabel(span:ForecastSpan,at:string,settings:ShiftSettings){
 if(span==="pullout"){
  const pullout=nextPullout(at,settings);
  return pullout?"BEFORE THE "+pullout.at+" PULLOUT":"BEFORE THE NEXT PULLOUT";
 }
 return span==="shift"?"REST OF THIS SHIFT":"THE NEXT TWO SHIFTS";
}

/* HOW LONG A REPAIR OF EACH KIND STAYS OPEN — the "downsheet stick".

   THE TRAP, named because the obvious implementation gets the answer exactly
   backwards. Averaging completedAt - createdAt over COMPLETED repairs ignores
   every repair still open, and the ones still open are precisely the A/C and
   check-engine jobs Curtis is asking about. The naive mean reports that A/C
   clears quickly, because the A/C jobs that stuck are not in it yet.

   An open repair is a RIGHT-CENSORED observation: all that is known is that it
   has lasted at least this long. So it is counted at its current age, which
   pulls the median in the direction the shop already knows it goes. The count
   of censored observations is carried beside each row, because a median where
   most of the observations are still running is a lower bound and a reader is
   owed that. */
export function categoryDwell(fleet:ForecastBus[],now=new Date().toISOString()){
 const end=when(now)??Date.now();
 const ages:Record<string,number[]>={};
 const censored:Record<string,number>={};
 for(const bus of fleet){
  for(const defect of bus.defects||[]){
   const created=when(defect.createdAt);
   if(created===null)continue;
   const category=String(defect.category||"").trim()||"Uncategorised";
   const open=isUnresolved(defect as StructuredDefect);
   const closed=open?null:when(defect.completedAt)??when(defect.updatedAt);
   const until=open?end:closed;
   if(until===null||until<created)continue;
   (ages[category]||=[]).push((until-created)/(24*HOUR));
   if(open)censored[category]=(censored[category]||0)+1;
  }
 }
 const rows:DwellRow[]=[];
 for(const [category,values] of Object.entries(ages)){
  if(values.length<FORECAST_MIN_DWELL)continue;
  const sorted=[...values].sort((a,b)=>a-b);
  const middle=Math.floor(sorted.length/2);
  const median=sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  rows.push({category,days:Math.round(median*10)/10,open:censored[category]||0,total:values.length});
 }
 return rows.sort((a,b)=>b.days-a.days||a.category.localeCompare(b.category));
}

/* ARRIVALS MINUS CLEARANCES, both from the ledger's own measurements.

   The ledger records what a swap added and what it cleared. Per hour between
   swaps, those are the two rates; over the forecast window they are the two
   ends of the arithmetic. No category weighting yet — that is Stage 2 of the
   roadmap and it needs more swaps than the shop has recorded — so this is the
   flat rate, and it says so by refusing until there are swaps to average. */
/* AN INSPECTION IS NOT A DOWNED BUS, AND THE RATE HAS TO AGREE WITH THE BASE.

   The ledger records the whole sheet, inspections included. The number this
   forecast projects is DOWNED buses — the Status Report has drawn that line
   since Curtis drew it first: "the downed number normally does not count
   inspections." Measuring arrivals over the whole sheet and charging them to a
   downed-only base is measuring one population and billing another, and against
   the real baseline it runs the arrival rate 49% hot. */
function snapshots(ledger:unknown){return normalizeSheetLedger(ledger)}
function downedSet(snapshot:{rows:{b:string;c:string}[]}){
 return new Set(snapshot.rows.filter(row=>row.c!==INSPECTION_CATEGORY).map(row=>row.b));
}
function inspectionSet(snapshot:{rows:{b:string;c:string}[]}){
 return new Set(snapshot.rows.filter(row=>row.c===INSPECTION_CATEGORY).map(row=>row.b));
}

/* How long after a road call a write-up still counts as that road call's doing.
   Beyond this the bus went back in service and came down again for something
   else, which is a different event and must not be credited here. */
export const FORECAST_ROAD_CALL_CONVERTS_WITHIN_HOURS=48;

/* Floors below which each queue term says what it is waiting for rather than
   quoting a conversion. Four inspections and six road calls is not much, and
   that is deliberate: these are corrections on a number that already reads, not
   the number itself, so the cost of a thin one is smaller than the cost of
   ignoring a queue that is plainly sitting there. */
export const FORECAST_MIN_INSPECTIONS=4;
export const FORECAST_MIN_CONVERSIONS=6;

function noQueue(pool:number,need:number):QueueTerm{
 return {pool,rate:0,expected:0,enough:false,need};
}

/* THE INSPECTION QUEUE, measured off the ledger alone.

   A PER-HOUR HAZARD, not a flat probability. An inspection sits on the sheet
   for days; applying a whole conversion fraction across a four-hour window to
   the next pullout would claim half the B-18s in the yard turn into brake jobs
   before lunch. Conversions over inspection-hours-at-risk is the unit that
   scales to the window honestly. */
function inspectionQueue(snaps:ReturnType<typeof snapshots>,poolNow:number,hours:number):QueueTerm{
 let converted=0,atRisk=0,seen=0;
 for(let index=1;index<snaps.length;index++){
  const previous=snaps[index-1],current=snaps[index];
  if(current.gap||!(Date.parse(current.at)>Date.parse(previous.at)))continue;
  const span=(Date.parse(current.at)-Date.parse(previous.at))/HOUR;
  const waiting=inspectionSet(previous);
  if(!waiting.size)continue;
  seen+=waiting.size;
  atRisk+=waiting.size*span;
  const nowDown=downedSet(current);
  for(const bus of waiting)if(nowDown.has(bus))converted++;
 }
 if(seen<FORECAST_MIN_INSPECTIONS||atRisk<=0)return noQueue(poolNow,Math.max(0,FORECAST_MIN_INSPECTIONS-seen));
 const rate=converted/atRisk;
 return {pool:poolNow,rate,expected:poolNow*rate*hours,enough:true,need:0};
}

/* THE ROAD-CALL QUEUE, which the sheets alone cannot measure.

   A road call that never converted never appears on any down sheet, so it is
   invisible to the paper — the denominator has to come from the board's own
   roadCalls events and the numerator from the ledger. That asymmetry is the
   whole reason this cannot be done off the photographs.

   A FLAT PROBABILITY PER BUS, unlike the inspections. A standing road call is a
   pending decision rather than a slow burn: a foreman walks the yard and writes
   it up or does not, inside a shift. Curtis put it as "if we have 10 roll calls
   and only two of them are converted to the down sheet, then that's a 20%
   chance", which is a probability per bus and not a rate per hour. */
function roadCallQueue(
 fleet:ForecastBus[],
 snaps:ReturnType<typeof snapshots>,
 now:string,
 lookbackDays:number,
 poolNow:number,
):QueueTerm{
 const end=when(now)??Date.now();
 const start=end-lookbackDays*24*HOUR;
 const window=FORECAST_ROAD_CALL_CONVERTS_WITHIN_HOURS*HOUR;
 let converted=0,judged=0;
 for(const bus of fleet){
  const number=String(bus.n??"").trim();
  if(!number)continue;
  for(const event of normalizeRoadCalls(bus.roadCalls)){
   const at=when(event.at);
   if(at===null||at<start||at>end)continue;
   /* Only events a snapshot actually looked at afterwards can be judged. One
      that fell in a hole in the ledger is not a failure to convert, it is a
      failure to observe, and counting it as the former quietly drags the rate
      toward zero. */
   const looked=snaps.filter(snapshot=>{
    const stamp=Date.parse(snapshot.at);
    return stamp>at&&stamp<=at+window;
   });
   if(!looked.length)continue;
   judged++;
   if(looked.some(snapshot=>downedSet(snapshot).has(number)))converted++;
  }
 }
 if(judged<FORECAST_MIN_CONVERSIONS)return noQueue(poolNow,FORECAST_MIN_CONVERSIONS-judged);
 const rate=converted/judged;
 return {pool:poolNow,rate,expected:poolNow*rate,enough:true,need:0};
}

/* ARRIVALS MINUS CLEARANCES, with the two queues taken out of the base so
   nothing is counted twice.

   The base rate is an average over past windows, so it already contains the
   TYPICAL conversion of both queues. Adding the queue terms on top of the raw
   rate would count those arrivals once in the average and again in the queue.
   So an arrival that was an inspection on the previous sheet, or that followed
   a road call inside the conversion window, is removed from the base: the
   average carries what neither queue explains, and each queue carries its own. */
function downedForecast(
 ledger:unknown,
 downedNow:number,
 hours:number,
 fleet:ForecastBus[],
 now:string,
 lookbackDays:number,
 inspectionsNow:number,
 roadCallsPendingNow:number,
){
 const snaps=snapshots(ledger);
 const fromInspections=inspectionQueue(snaps,inspectionsNow,hours);
 const fromRoadCalls=roadCallQueue(fleet,snaps,now,lookbackDays,roadCallsPendingNow);

 /* When a road call landed, by fleet number, so an arrival that followed one
    can be told apart from an arrival that did not. */
 const roadCallStamps=new Map<string,number[]>();
 for(const bus of fleet){
  const number=String(bus.n??"").trim();
  if(!number)continue;
  const stamps=normalizeRoadCalls(bus.roadCalls).map(event=>when(event.at)).filter((value):value is number=>value!==null);
  if(stamps.length)roadCallStamps.set(number,stamps);
 }
 const followedRoadCall=(bus:string,at:number)=>
  (roadCallStamps.get(bus)||[]).some(stamp=>stamp<=at&&at-stamp<=FORECAST_ROAD_CALL_CONVERTS_WITHIN_HOURS*HOUR);

 /* Counted in the same pass that measures them, rather than by a second
    filter spelling the same skip rule. Two places that must agree about which
    pairs are measurable are two places that will eventually disagree, and the
    one that decides `need` is the one a person reads. */
 let added=0,cleared=0,totalHours=0,pairs=0;
 for(let index=1;index<snaps.length;index++){
  const previous=snaps[index-1],current=snaps[index];
  if(current.gap)continue;
  const span=(Date.parse(current.at)-Date.parse(previous.at))/HOUR;
  if(!(span>0))continue;
  pairs++;
  totalHours+=span;
  const before=downedSet(previous),after=downedSet(current);
  const waiting=inspectionSet(previous);
  const stamp=Date.parse(current.at);
  for(const bus of after)
   if(!before.has(bus)&&!waiting.has(bus)&&!followedRoadCall(bus,stamp))added++;
  for(const bus of before)if(!after.has(bus))cleared++;
 }
 if(pairs<FORECAST_MIN_SWAPS-1||totalHours<=0)
  return {now:downedNow,range:{low:downedNow,high:downedNow},expected:downedNow,
   fromInspections,fromRoadCalls,inRange:{low:0,high:0},outRange:{low:0,high:0},
   enough:false,need:Math.max(0,(FORECAST_MIN_SWAPS-1)-pairs)};

 const addedRate=added/totalHours,clearedRate=cleared/totalHours;
 const queue=fromInspections.expected+fromRoadCalls.expected;
 /* THE QUEUES MOVE THE NUMBER WITHOUT WIDENING THE BAND. The interval on the
    arrival side is the sampling error in the RATE, and the queues are not a
    rate — they are a pool that has been counted and a conversion that has
    passed its own floor. Stretching the band by them would say the forecast got
    less certain the moment it learned something it did not know before, which
    is backwards. It does mean the band understates the error a little, since
    the conversions carry sampling error of their own; that is the side to be
    wrong on here, and the floors above are what keep it small. */
 const inBand=rateInterval(added),outBand=rateInterval(cleared);
 const inRange={low:Math.floor(addedRate*hours*inBand.low+queue),high:Math.ceil(addedRate*hours*inBand.high+queue)};
 const outRange={low:Math.floor(clearedRate*hours*outBand.low),high:Math.ceil(clearedRate*hours*outBand.high)};
 return {
  now:downedNow,
  /* The pessimistic end takes the most in and the least out, and the optimistic
     end the reverse. Never below zero: a fleet cannot have minus four buses
     down, and a range whose floor is negative reads as a bug to the one person
     whose job it is to notice. */
  range:{low:Math.max(0,downedNow+inRange.low-outRange.high),high:Math.max(0,downedNow+inRange.high-outRange.low)},
  /* The point estimate is the rates and the queues straight through, rounded —
     buses are whole. Never below zero, for the reason the range's floor is not. */
  expected:Math.max(0,Math.round(downedNow+addedRate*hours+queue-clearedRate*hours)),
  fromInspections,fromRoadCalls,inRange,outRange,enough:true,need:0,
 };
}

export function buildFleetForecast(
 fleet:ForecastBus[],
 entries:ForecastEntry[],
 options:{
  now?:string;
  settings?:ShiftSettings;
  ledger?:unknown;
  span?:ForecastSpan;
  downed?:number;
  /* The two queues standing right now. Passed in rather than recomputed: the
     Status Report already works both out and is tested on them, and a second
     implementation of "is this bus on the sheet" is the kind of drift the
     location-label rule exists to stop. */
  inspections?:number;
  roadCallsPending?:number;
 }={}
):FleetForecast|null{
 const now=options.now||new Date().toISOString();
 const settings=options.settings||DEFAULT_SHIFT_SETTINGS;
 const span=options.span||"pullout";
 /* No clock, no forecast. A garage whose shift settings have been edited into
    a gap can legitimately produce this, and a window of null is not a window of
    zero — reporting "0 road calls expected" for it would be a confident answer
    to a question that was never asked. */
 const hours=windowHours(now,span,settings);
 if(hours===null||!(hours>0)||minuteOfDay(now)===null)return null;

 const {observed:total,counts,rates}=roadCallRates(fleet,now,settings);
 const {expected,shifts}=expectedOver(now,hours,rates,settings);
 /* The interval comes off the observations that actually feed this window. A
    wide range from two observations is the forecast telling the truth about
    itself; borrowing the precision of twenty events recorded on other shifts
    would not be. */
 const observed=[...shifts].reduce((sum,key)=>sum+(counts[key]||0),0);
 const band=rateInterval(observed);
 const quiet=total>=FORECAST_MIN_ROAD_CALLS&&observed===0;
 const roadCalls:RoadCallForecast={
  observed,total,quiet,hours,
  expected:Math.round(expected*10)/10,
  range:{low:Math.floor(expected*band.low),high:Math.ceil(expected*band.high)},
  chance:Math.round((1-Math.exp(-expected))*100),
  enough:total>=FORECAST_MIN_ROAD_CALLS&&observed>0,
  need:Math.max(0,FORECAST_MIN_ROAD_CALLS-total),
 };

 const downedNow=typeof options.downed==="number"
  ?options.downed
  :new Set(entries.filter(entry=>String(entry.workflow??"")!=="Completed").map(entry=>String(entry.busId??"").trim()).filter(Boolean)).size;

 return {
  at:now,
  shift:shiftAt(now,settings),
  window:{label:spanLabel(span,now,settings),hours:Math.round(hours*10)/10},
  roadCalls,
  downed:downedForecast(options.ledger,downedNow,hours,fleet,now,FORECAST_LOOKBACK_DAYS,
   typeof options.inspections==="number"?options.inspections:0,
   typeof options.roadCallsPending==="number"?options.roadCallsPending:0),
  /* Only what is actually on the sheet right now. The slowest categories in the
     whole fleet's history is a different report; what a foreman is being told
     here is which of the work IN FRONT OF HIM is the work that sticks. */
  slowest:categoryDwell(fleet,now).slice(0,3),
 };
}

/* THE FORECAST IS ONE NUMBER.

   Curtis: "Most important number is Forecasted Total Down buses by pullout
   times... So far, I only want this one number for the forecast. I'll let you
   know if I'm gonna add more lines or details."

   So the road-call rate, the chance-of-any and the per-category dwell are all
   still COMPUTED — they are on the FleetForecast object and the tests hold them
   — and none of them is printed. Adding a line back is a display change here
   rather than a rebuild of the model, which is the whole reason they stay.

   WHICH PULLOUT is not a rule this module needs. Curtis described it as "if
   numbers was updated on 2nd shift then a forecast for am pullout... if it's
   first shift then a pm pullout number", and that is exactly what
   `nextPullout` already returns from the shift clock — 2nd shift to 06:00, 1st
   to 13:00, 3rd to 06:00. No second table to keep in step. */
export type ForecastStyle="range"|"single";

export function forecastTextLines(
 forecast:FleetForecast|null,
 width:number,
 options:{style?:ForecastStyle}={}
){
 if(!forecast)return [];
 const lines:string[]=["FLEET FORECAST"];
 /* The hedge rides with the heading, every time, wrapped to the width rather
    than trusted to fit. Curtis asked for it in those words and it is not a
    disclaimer to be tucked at the bottom: it is what the section IS.

    Wrapped well short of the width on purpose. At the full width the break
    lands between "work" and "flow", which reads as a typo rather than a wrap;
    at 26 the three lines break where the phrase does. One bracket around the
    whole thing, opened on the first line and closed on the last. */
 const hedge=wrap(FORECAST_HEDGE,26);
 hedge.forEach((part,index)=>lines.push((index?"   ":"  (")+part+(index===hedge.length-1?")":"")));
 lines.push("");
 lines.push("DOWNED BUSES");
 /* The window on its own line rather than as a labelled row. "BEFORE THE 06:00
    PULLOUT" against a 20-character heading column runs to 44 and wraps on the
    very phone this width exists for — caught by the test that holds every line
    to a lock screen, which is the only reason it was ever caught. */
 lines.push(fitText(forecast.window.label,width));
 if(!forecast.downed.enough){
  lines.push("  not yet - "+forecast.downed.need+" more sheet swap"+(forecast.downed.need===1?"":"s"));
  return lines;
 }
 const figure=options.style==="single"
  ?String(forecast.downed.expected)
  :rangeLabel(forecast.downed.range);
 /* NOT through fitText, which trims: the leading indent is what puts this line
    under the heading with every other indented line in the block, and trimming
    it left the one number flush against the margin. The content cannot overflow
    38 anyway — two three-digit figures and "(now NNN)" is twenty-two. */
 lines.push("  "+figure+"   (now "+forecast.downed.now+")");
 return lines;
}

export function rangeLabel(range:ForecastRange){
 return range.low===range.high?String(range.low):range.low+"-"+range.high;
}

function fitText(text:string,max:number){
 const value=String(text||"").trim();
 if(max<=1||value.length<=max)return value;
 return value.slice(0,max-1).trimEnd()+"…";
}

function wrap(text:string,width:number){
 const out:string[]=[];
 let row="";
 for(const word of String(text||"").split(/\s+/).filter(Boolean)){
  if(row&&(row+" "+word).length>width){out.push(row);row=word}
  else row=row?row+" "+word:word;
 }
 if(row)out.push(row);
 return out;
}
