/* the Fleet Status Report, the forecast and work time. */

import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addBusListEntries, createBusList, setBusListEntryDone, setBusListEntryHours, workTimePeople, workTimeRowsFromFleet, workTimeSummary } from "./helpers/modules.mjs";


test("a day's work time covers Defect Log repairs as well as campaign sweeps",()=>{
 const yesterday="2026-08-26T15:00:00.000Z",today="2026-08-27T15:00:00.000Z";
 let farebox=createBusList("Farebox","rep",today,"s");
 farebox=addBusListEntries(farebox,"17503","a");
 farebox=setBusListEntryDone(farebox,farebox.entries[0].id,true,today,"CURTIS");
 farebox=setBusListEntryHours(farebox,farebox.entries[0].id,"1.5");

 const buses=[
  {id:"a",n:"17549",defects:[
   // repair time only
   {id:"a1",category:"Brakes",issue:"Brake light on",state:"completed",completedAt:today,completedBy:"CURTIS",repairHours:2},
   // diagnostic and repair on the same repair: the day gets both
   {id:"a2",category:"Engine",issue:"Check engine light",state:"completed",completedAt:today,completedBy:"CURTIS",diagnosticHours:1.5,repairHours:0.5},
   // finished with no hours: reported, never counted as zero
   {id:"a3",category:"Lighting","issue":"Headlight out",state:"completed",completedAt:today,completedBy:"CURTIS"},
   // still open, so not work time yet however long it has been sitting
   {id:"a4",category:"Engine",issue:"Check engine light",state:"open",repairHours:9},
  ]},
  // diagnosed but handed on unfixed: still a day's work
  {id:"b",n:"17568",defects:[
   {id:"b1",category:"Engine",issue:"Check engine light",state:"completed",completedAt:yesterday,completedBy:"CURTIS",diagnosticHours:1.25},
   // somebody else's time never lands on this timesheet
   {id:"b2",category:"Brakes",issue:"Air leak",state:"completed",completedAt:today,completedBy:"JT",repairHours:3},
  ]},
 ];

 // both names surface whether their time came from a campaign or a repair
 assert.deepEqual(workTimePeople({lists:[farebox],buses}),["CURTIS","JT"]);
 assert.deepEqual(workTimePeople({buses}),["CURTIS","JT"]);

 const curtis=workTimeSummary({lists:[farebox],buses},"CURTIS");
 // 1.5 swept + 2 repaired + (1.5 diagnosing + 0.5 fixing) + 1.25 diagnosing
 assert.equal(curtis.hours,6.75);
 assert.equal(curtis.entries,4);
 assert.equal(curtis.untimed,1);
 assert.equal(curtis.days.length,2);
 assert.equal(curtis.days[0].hours,5.5);
 assert.equal(curtis.days[1].hours,1.25);

 // the campaign row and the repairs sit in one day, each named by its bus
 assert.deepEqual(curtis.days[0].rows.map(row=>row.label),["Bus 17503","Bus 17549","Bus 17549"]);
 assert.deepEqual(curtis.days[0].rows.map(row=>row.source),["Farebox","Defect Log","Defect Log"]);
 // and the split is carried so 2 hours of fixing never reads as 2 of diagnosing
 assert.deepEqual(curtis.days[0].rows.map(row=>row.note),[undefined,undefined,"incl 1.5 diag"]);
 assert.equal(curtis.days[1].rows[0].note,"diagnosis");

 assert.equal(workTimeSummary({buses},"JT").hours,3);
 // a page with only one kind of record still totals, and neither is required
 assert.equal(workTimeSummary({lists:[farebox]},"CURTIS").hours,1.5);
 assert.equal(workTimeSummary({buses},"CURTIS").hours,5.25);
 assert.deepEqual(workTimeRowsFromFleet([]),[]);
 assert.deepEqual(workTimeRowsFromFleet([{id:"c",n:"17563"}]),[]);
});

test("the STATUS REPORT separates what cannot run from what can",async()=>{
 const {buildFleetStatusReport,statusReportText,DEFAULT_STATUS_REPORT_PICK}=await import("../src/lib/reports/fleet-status-report.ts");
 const at="2026-09-16T04:00:00.000Z";
 const bus=(id,n)=>({id,n,l:"bay-1",s:"out",defects:[]});
 const entry=(id,busId,busNumber,repair,customReason)=>({id,busId,busNumber,category:"",repair,customReason,
  section:"Pending",workflow:"Scheduled",operationalStatus:"out",assignedTo:"",assignmentType:"Mechanic"});
 const fleet=[bus("a","17510"),bus("b","17527"),bus("c","17559"),bus("d","18501")];
 const sheet=[
  entry("e1","a","17510","Driver-reported defect","QUARANTINE DO NOT MOVE (PER SAFETY)"),
  entry("e2","b","17527","Manual entry","HOLD FOR SOUTH HOLLAND, THEY ARE COMING WEDS 7AM TO REPAIR"),
  entry("e3","c","17559","Other brake repair","Short Run Only (Needs Frt. & Rear Brake Job ASAP )"),
  entry("e4","d","18501","Rear main seal","High Oil Usage Hold until Repaired (Rear Main Seal )"),
 ];
 const report=buildFleetStatusReport(fleet,sheet,[],at);
 /* Curtis: "they're on the down sheet, but they can be used... so that way, if
    they're not making pull out, they know what they can possibly run." */
 assert.equal(report.downed,2,"quarantined and held-until-repaired cannot run");
 assert.equal(report.softDowned,2,"South Holland and short-run can");
 assert.equal(report.downedTotal,4,"and the shortage is still four buses");

 const text=statusReportText(report,{...DEFAULT_STATUS_REPORT_PICK});
 /* The order Curtis asked for: hard, soft, then the two added up. */
 assert.ok(text.indexOf("DOWNED BUSES")<text.indexOf("SOFT DOWN"));
 assert.ok(text.indexOf("SOFT DOWN")<text.indexOf("TOTAL DOWN + SOFT"));
 assert.match(text,/SOFT DOWN\s+2/);
 assert.match(text,/TOTAL DOWN \+ SOFT\s+4/);

 /* COUNTED BY BUS ON BOTH SIDES, and the hard row wins. A bus written up twice
    -- once held for another garage, once for a no-start -- does not move, and
    counting it as soft would put it back in service on paper. */
 const twice=buildFleetStatusReport([bus("a","17510")],[
  entry("x1","a","17510","Manual entry","HOLD FOR SOUTH HOLLAND, THEY ARE COMING WEDS 7AM TO REPAIR"),
  entry("x2","a","17510","No crank","No Start"),
 ],[],at);
 assert.equal(twice.downed,1);
 assert.equal(twice.softDowned,0,"the hard row wins, and the bus is counted once");
 assert.equal(twice.downedTotal,1);

 /* AN ORDINARY MORNING READS AS IT ALWAYS DID. Nothing soft on the sheet means
    no SOFT line and no total repeating the number above it. */
 const plain=buildFleetStatusReport([bus("a","17510")],[entry("y1","a","17510","No crank","No Start")],[],at);
 const plainText=statusReportText(plain,{...DEFAULT_STATUS_REPORT_PICK});
 assert.doesNotMatch(plainText,/SOFT DOWN/);
 assert.doesNotMatch(plainText,/TOTAL DOWN/);
});

test("the STATUS REPORT sends either version, and both tell the same story",async()=>{
 const {buildFleetStatusReport,statusReportText,DEFAULT_STATUS_REPORT_PICK}=await import("../src/lib/reports/fleet-status-report.ts");
 const COUNTS={...DEFAULT_STATUS_REPORT_PICK,locations:false,defects:false};
 const {statusReportPrintHtml}=await import("../src/lib/reports/fleet-status-report-print.ts");
 const modal=await readFile(new URL("../src/components/reports/status-report-modal.tsx",import.meta.url),"utf8");

 const now="2026-09-13T18:00:00.000Z";
 const fleet=[
  {id:"b1",n:"17501",l:"bay-1",s:"defect",defects:[{id:"x",category:"Brakes",issue:"Air leak",state:"open"}]},
  {id:"b2",n:"17502",l:"bay-2",s:"defect",defects:[]},
  /* A MYSTERY bus carrying a defect. It has to be this one: the checkbox can
     only reveal repairs on buses the report actually LISTS, and Curtis asked
     for numbers on the mystery and road-call lists only - "not the entire
     downed bus list". So 17501 being downed with an air leak proves the
     opposite point, and did, when this fixture was wrong. */
  {id:"b3",n:"17504",l:"east-1",s:"unknown",defects:[{id:"y",category:"A/C and HVAC",issue:"No cooling",state:"open"}]},
 ];
 const entries=[{busId:"b1",section:"Pending",workflow:"Scheduled"},{busId:"b2",section:"Inspection",workflow:"Scheduled"}];
 const board=buildFleetStatusReport(fleet,entries,now);

 /* THE TWO VERSIONS MUST NOT DISAGREE. They are built for different jobs - one
    to arrive as a message, one to be handed on - but a superintendent holding
    the PDF and a foreman reading the text have to see the same numbers. */
 const text=statusReportText(board,{title:"PACE SOUTH"});
 const html=statusReportPrintHtml(board,{title:"PACE SOUTH"});
 assert.match(text,/DOWNED BUSES\s+1/);
 assert.match(html,/<dt>Downed buses<\/dt><dd>1<\/dd>/);
 assert.match(text,/INSPECTIONS\s+1/);
 assert.match(html,/<dt>Inspections<\/dt><dd>1<\/dd>/);
 /* "Downed buses only" is gone from both, together. Curtis called it redundant
    "on either version", and the two documents have to stay in step — a PDF
    that still carried it while the message had dropped it is exactly the kind
    of drift this whole test exists to catch. */
 assert.doesNotMatch(html,/Downed buses only/i);
 assert.doesNotMatch(text,/downed buses only/i);
 assert.match(html,/Not counted above/,"the line that says something the heading does not stays on both");
 assert.match(html,/17504/,"and names the mystery bus");
 /* The counts-only version, on both. Bus numbers for the two lists somebody
    has to walk out to, and no locations or repairs anywhere. */
 const counts=statusReportText(board,{pick:COUNTS,title:"PACE SOUTH"});
 const countsHtml=statusReportPrintHtml(board,{pick:COUNTS,title:"PACE SOUTH"});
 assert.match(counts,/DOWNED BUSES\s+1/);
 assert.match(counts,/ROADCALLS PENDING\s+\d/);
 assert.match(counts,/17504/,"a mystery bus is an errand, so it keeps its number");
 assert.equal(counts.includes("Main Garage")||counts.includes("CNG"),false,"and carries no location");
 assert.match(countsHtml,/class="numbers"/,"the PDF prints the same two lists as bare numbers");
 assert.doesNotMatch(countsHtml,/ol class="defects"/,"and never repairs, whatever the defects switch said");

 /* Everything on the page is a value from the board, including free text
    somebody typed into a repair. Written into markup, so it is escaped - an
    unescaped "<" silently eats the rest of a line, which is a report a foreman
    would have to notice rather than an error anybody sees. */
 const nasty=buildFleetStatusReport([{id:"n",n:"17<b>99",l:"east-2",s:"unknown",
  defects:[{id:"d",category:"Engine",issue:'Leak "big" & <fast>',state:"open"}]}],[],now);
 const escaped=statusReportPrintHtml(nasty,{pick:{...DEFAULT_STATUS_REPORT_PICK,defects:true}});
 assert.equal(/<b>99/.test(escaped),false,"a fleet number carrying markup is escaped");
 assert.match(escaped,/17&lt;b&gt;99/);
 assert.match(escaped,/&quot;big&quot; &amp; &lt;fast&gt;/);

 /* Defects are opt-in in BOTH versions, and the checkbox drives both. */
 const withRepairs={...DEFAULT_STATUS_REPORT_PICK,defects:true};
 assert.equal(/No cooling/.test(statusReportPrintHtml(board,{})),false);
 assert.match(statusReportPrintHtml(board,{pick:withRepairs}),/No cooling/);
 assert.equal(/Air leak/.test(statusReportPrintHtml(board,{pick:withRepairs})),false,
  "a DOWNED bus contributes to the count and is never named or itemised");
 assert.equal(/Air leak/.test(statusReportText(board,{pick:withRepairs})),false,"and the text version agrees");

 /* NO PDF LIBRARY. This is an offline-first app with no build step for new
    dependencies, and the browser already knows how to make a PDF from a
    printable page. */
 const pkg=JSON.parse(await readFile(new URL("../package.json",import.meta.url),"utf8"));
 const deps=Object.keys({...pkg.dependencies,...pkg.devDependencies});
 for(const banned of ["jspdf","pdfkit","html2pdf.js","pdfmake","html2canvas"])
  assert.equal(deps.includes(banned),false,"no PDF library was added: "+banned);

 /* Printed through a same-document iframe. window.open leaves the app for
    Safari in standalone mode, which is the trapdoor this app exists to avoid. */
 const modalCode=modal.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.equal(/window\.open/.test(modalCode),false,"never a popup");
 assert.match(modalCode,/createElement\("iframe"\)/);
 assert.match(modalCode,/contentWindow\?\.print\(\)/);

 /* The message version goes as TEXT, not as a file - that is the whole point:
    it arrives as the message body and is readable on a locked phone. */
 assert.match(modalCode,/navigator\.share\(\{text\}\)/);
 assert.match(modalCode,/navigator\.clipboard\.writeText\(text\)/,"and falls back to the clipboard where there is no share sheet");

 /* A share sheet somebody dismissed is not a failure and must not be reported
    as one. */
 assert.match(modalCode,/AbortError/);

 /* Nothing leaves before it has been read. */
 assert.match(modalCode,/<pre className="status-report-preview"/);
 assert.match(modalCode,/SEND AS A MESSAGE/);
 assert.match(modalCode,/SEND AS A PDF/);

 /* The stamp is the moment the report was produced. A report whose own
    timestamp moved while somebody read it would be lying about when it was
    true, so it is fixed on open rather than recomputed per render. */
 assert.match(modalCode,/const at=useMemo\(\(\)=>new Date\(\)\.toISOString\(\),\[\]\)/);

 /* IT NEVER WRITES THE FLEET OR THE SHEET. That has not changed and must not:
    this is a surface somebody opens to ANSWER a question, and a report that can
    edit the board is a report that can lose a mechanic's work while being read.

    What it does write now is the include list itself, and nothing else. Curtis
    sends roughly the same report every morning; making him re-tick six boxes
    daily would be a slower version of the thing the list replaced. So the one
    permitted key is asserted by name — a per-device view-state key, like every
    other panel-open key in the app — and every route to the records stays shut. */
 for(const banned of ["writeFleetStorage","writeDownSheetStorage","BOARD_KEY","DOWN_SHEET_STORAGE_KEY","pace-board-v1","pace-down-sheet-v1"])
  assert.equal(modalCode.includes(banned),false,"the status report must not write the records: "+banned);
 const written=[...modalCode.matchAll(/setItem\(([^,]+),/g)].map(hit=>hit[1].trim());
 assert.deepEqual(written,["STATUS_REPORT_PICK_KEY"],"the only thing it saves is which boxes are ticked");
});

test("the STATUS REPORT is a checkbox list now, and it auto-formats to what is ticked",async()=>{
 const {buildFleetStatusReport,statusReportText,normalizeStatusReportPick,DEFAULT_STATUS_REPORT_PICK}=
  await import("../src/lib/reports/fleet-status-report.ts");
 const {statusReportPrintHtml}=await import("../src/lib/reports/fleet-status-report-print.ts");
 const modal=await readFile(new URL("../src/components/reports/status-report-modal.tsx",import.meta.url),"utf8");

 const now="2026-09-13T18:00:00.000Z";
 const fleet=[
  {id:"b1",n:"17501",l:"bay-1",s:"defect",defects:[{id:"x",category:"Brakes",issue:"Air leak",state:"open"}]},
  {id:"b2",n:"17502",l:"bay-2",s:"defect",defects:[]},
  {id:"b3",n:"17504",l:"east-1",s:"unknown",defects:[{id:"y",category:"A/C and HVAC",issue:"No cooling",state:"open"}]},
 ];
 const entries=[{busId:"b1",section:"Pending",workflow:"Scheduled"},{busId:"b2",section:"Inspection",workflow:"Scheduled"}];
 const board=buildFleetStatusReport(fleet,entries,now);
 const pick=extra=>({...DEFAULT_STATUS_REPORT_PICK,...extra});

 /* THE CASE THAT DECIDED THE WHOLE DESIGN. Curtis: "when my superintendent
    sends that list out to his superiors, they don't need to know about mystery
    buses. and they don't need to know about inspection buses." Both have to
    leave BOTH documents, together — a PDF still carrying a section the message
    had dropped is exactly the drift two sets of switches would produce. */
 const upward=pick({mystery:false,inspections:false});
 const text=statusReportText(board,{pick:upward,title:"PACE SOUTH"});
 const html=statusReportPrintHtml(board,{pick:upward,title:"PACE SOUTH"});
 assert.doesNotMatch(text,/MYSTERY/);
 assert.doesNotMatch(html,/Mystery/);
 assert.doesNotMatch(text,/INSPECTIONS/);
 assert.doesNotMatch(html,/<dt>Inspections<\/dt>/);
 /* And the line that only made sense beside the inspections number leaves with
    it, rather than hanging under nothing. */
 assert.doesNotMatch(text,/not counted above/i);
 assert.doesNotMatch(html,/Not counted above/i);
 assert.doesNotMatch(text,/17504/,"the mystery bus goes with its section");

 /* DOWNED BUSES IS NOT ON THE LIST. It is the question the report answers, and
    it survives every combination of the switches — including all of them off. */
 const nothing=pick({inspections:false,roadCalls:false,mystery:false,farebox:false,ventra:false,cubic:false,numbers:false});
 assert.match(statusReportText(board,{pick:nothing}),/DOWNED BUSES\s+1/);
 assert.match(statusReportPrintHtml(board,{pick:nothing}),/<dt>Downed buses<\/dt><dd>1<\/dd>/);
 for(const key of Object.keys(DEFAULT_STATUS_REPORT_PICK))
  assert.equal(/^downed$/.test(key),false,"downed is never offered as a switch: "+key);

 /* THE THREE DETAIL SWITCHES COMPOSE RATHER THAN BRANCH, and that is what
    replaced the old COUNTS ONLY version outright: it is now just the middle
    row of this table and nothing special-cases it. */
 const bare=statusReportText(board,{pick:pick({numbers:false})});
 assert.match(bare,/MYSTERY BUSES\s+1/,"the count is still there");
 assert.doesNotMatch(bare,/17504/,"but no fleet number anywhere");

 const numbersOnly=statusReportText(board,{pick:pick({locations:false})});
 assert.match(numbersOnly,/17504/,"numbers on their own");
 assert.doesNotMatch(numbersOnly,/East/i,"and no location beside them");

 const located=statusReportText(board,{pick:DEFAULT_STATUS_REPORT_PICK});
 assert.match(located,/17504/);
 assert.match(located,/East/i,"locations bring the where");
 assert.doesNotMatch(located,/No cooling/,"repairs stay off until asked for");
 assert.match(statusReportText(board,{pick:pick({defects:true})}),/No cooling/);

 /* THE LADDER IS ENFORCED IN THE MODAL, not by disabling controls. Locations
    with no bus numbers has nothing to hang off; repairs with no locations is a
    list of repairs with no bus against them. Ticking one brings the ones above
    it, so a person who ticks "the specific repairs" gets them. */
 const modalCode=modal.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.match(modalCode,/if\(key==="numbers"&&!value\)\{next\.locations=false;next\.defects=false\}/);
 assert.match(modalCode,/if\(key==="locations"\)\{if\(value\)next\.numbers=true;else next\.defects=false\}/);
 assert.match(modalCode,/if\(key==="defects"&&value\)\{next\.numbers=true;next\.locations=true\}/);

 /* Every switch in the type is drawn. A key added to the pick and not to the
    list is a section nobody can ever turn on, and it would be invisible. */
 for(const key of Object.keys(DEFAULT_STATUS_REPORT_PICK))
  assert.ok(modalCode.includes('key:"'+key+'"'),"every pick has a checkbox: "+key);

 /* A stored selection from an older build cannot put an undefined into a
    checkbox and turn it into an uncontrolled input mid-session. */
 assert.deepEqual(normalizeStatusReportPick(null),DEFAULT_STATUS_REPORT_PICK);
 assert.deepEqual(normalizeStatusReportPick({mystery:"yes",farebox:false}),
  {...DEFAULT_STATUS_REPORT_PICK,farebox:false},"a non-boolean falls back rather than leaking through");
});

test("the FLEET FORECAST refuses before it can count, and counts open repairs at their age",async()=>{
 const {buildFleetForecast,forecastTextLines,categoryDwell,roadCallRates,FORECAST_MIN_ROAD_CALLS,FORECAST_LOOKBACK_DAYS}=
  await import("../src/lib/reports/fleet-forecast.ts");
 const {STATUS_REPORT_WIDTH}=await import("../src/lib/reports/fleet-status-report.ts");

 /* BUILT FROM LOCAL COMPONENTS, NOT PINNED TO AN INSTANT, and that is the
    whole point of the spelling.

    `shiftAt` resolves a shift through `minuteOfDay`, which reads `getHours()` -
    LOCAL time. So any absolute instant lands in a different shift depending on
    where the runner happens to be, and the test asserts a different window with
    no code having changed. Both earlier spellings had that bug pointing in
    opposite directions: `...Z` is 10:00 only in UTC, so it passed on CI and
    failed on a Central machine; `...-05:00` is 10:00 only in Central, so it
    passed locally and turned CI red.

    `new Date(y,m,d,h,...)` constructs from local time, so this is 10:00
    wherever it runs - which is exactly what the assertion means. 10:00 is 1st
    shift under the shop's hours and the next pullout is 13:00, so the window is
    three hours of 1st shift, in every timezone. */
 const now=new Date(2026,8,14,10,0,0,0).toISOString();
 const hoursAgo=h=>new Date(Date.parse(now)-h*3600000).toISOString();
 const onShift=count=>Array.from({length:count},(unused,index)=>
  ({id:"r"+index,n:String(17600+index),roadCalls:[{id:"e"+index,at:hoursAgo(1+index*24)}],defects:[]}));

 /* THE GATE. Curtis is owed a number he can act on, and a number produced from
    four observations is wrong in a way that looks authoritative. Below the
    threshold the forecast says what it is waiting for instead. */
 const thin=buildFleetForecast(onShift(4),[],{now,downed:14});
 assert.equal(thin.roadCalls.enough,false);
 assert.equal(thin.roadCalls.need,FORECAST_MIN_ROAD_CALLS-4,"and says how many more it needs");
 /* The road-call rate is COMPUTED and no longer PRINTED. Curtis: "So far, I
    only want this one number for the forecast." It stays on the object so
    putting a line back is a display change rather than a rebuild, and this
    test holds that line by asserting the object rather than the text. */
 assert.doesNotMatch(forecastTextLines(thin,STATUS_REPORT_WIDTH).join("\n"),/ROAD CALLS/);

 const ready=buildFleetForecast(onShift(FORECAST_MIN_ROAD_CALLS+4),[],{now,downed:14});
 assert.equal(ready.roadCalls.enough,true);
 assert.equal(ready.window.label,"BEFORE THE 13:00 PULLOUT","the window is named the way somebody says it");
 /* A RANGE, NOT A NUMBER. Two weeks of data gives a wide interval, and "3.4
    road calls" out of a dozen observations is lying about its own precision. */
 assert.ok(ready.roadCalls.range.high>ready.roadCalls.range.low,"the forecast reports a range");
 assert.ok(ready.roadCalls.chance>0&&ready.roadCalls.chance<100,"and a chance that is neither certainty nor nothing");

 /* ENOUGH HISTORY, NONE OF IT ON THIS SHIFT. The first draft gated on the fleet
    total and then quoted the current shift's rate: twenty road calls on record,
    none on the shift being forecast, and the report said "0 expected, 0% chance
    of any" — a confident answer drawn from no observations at all. */
 const elsewhere=Array.from({length:FORECAST_MIN_ROAD_CALLS+4},(unused,index)=>
  ({id:"n"+index,roadCalls:[{id:"x"+index,at:hoursAgo(20+index*24)}],defects:[]}));
 const quiet=buildFleetForecast(elsewhere,[],{now,downed:14});
 assert.equal(quiet.roadCalls.total>=FORECAST_MIN_ROAD_CALLS,true,"the fleet has plenty on record");
 assert.equal(quiet.roadCalls.observed,0,"and none of it on the shift being forecast");
 assert.equal(quiet.roadCalls.enough,false,"so it refuses");
 assert.equal(quiet.roadCalls.quiet,true);
 /* A zero would read as a prediction, so nothing quotes one - and the report
    no longer prints the road-call line at all, which is the strongest form of
    that guarantee. */
 const quietText=forecastTextLines(quiet,STATUS_REPORT_WIDTH).join("\n");
 assert.doesNotMatch(quietText,/CHANCE OF ANY/);
 assert.doesNotMatch(quietText,/0%/);

 /* THE DOWNED HALF NEEDS SHEET SWAPS and says so until it has them. */
 assert.equal(ready.downed.enough,false);
 assert.match(forecastTextLines(ready,STATUS_REPORT_WIDTH).join("\n"),/not yet - \d+ more sheet swaps?/);
 assert.equal(ready.downed.now,14,"and still reports where the fleet stands");

 /* RIGHT-CENSORING, and the reason it is the whole ballgame. Curtis: "AC
    repairs and Check engine lights tend to stay on the longest. Producing a
    higher rate of downsheet stick!"

    Averaging completedAt - createdAt over COMPLETED repairs only would report
    A/C as the FASTEST category here, because the two A/C jobs that stuck are
    not in that average — they are still open. Counted at their current age they
    are exactly what Curtis is describing. This fixture is built so the naive
    implementation gets the answer backwards rather than merely imprecise. */
 const stuck=[{id:"s",n:"17700",defects:[
  {id:"a1",category:"A/C and HVAC",issue:"No cooling",state:"open",createdAt:hoursAgo(24*20)},
  {id:"a2",category:"A/C and HVAC",issue:"No cooling",state:"open",createdAt:hoursAgo(24*18)},
  {id:"a3",category:"A/C and HVAC",issue:"No cooling",state:"completed",createdAt:hoursAgo(24*2),completedAt:hoursAgo(24)},
  {id:"b1",category:"Brakes",issue:"Air leak",state:"completed",createdAt:hoursAgo(48),completedAt:hoursAgo(24)},
  {id:"b2",category:"Brakes",issue:"Air leak",state:"completed",createdAt:hoursAgo(48),completedAt:hoursAgo(24)},
  {id:"b3",category:"Brakes",issue:"Air leak",state:"completed",createdAt:hoursAgo(48),completedAt:hoursAgo(20)},
 ]}];
 const dwell=categoryDwell(stuck,now);
 const ac=dwell.find(row=>row.category==="A/C and HVAC");
 const brakes=dwell.find(row=>row.category==="Brakes");
 assert.ok(ac.days>brakes.days,"A/C sticks and brakes clear, which is what the shop already knows");
 assert.ok(ac.days>=18,"the open jobs are counted at the age they have reached, got "+ac.days);
 assert.equal(ac.open,2,"and the reader is told how many of them are still running");
 assert.equal(ac.total,3);

 /* A category with almost nothing behind it does not get a median: two
    observations produce a median that is just one of them. */
 assert.equal(categoryDwell([{id:"t",defects:[
  {id:"one",category:"Bodywork",issue:"Paint",state:"completed",createdAt:hoursAgo(48),completedAt:hoursAgo(24)},
 ]}],now).length,0);

 /* THE RATE IS PER SHIFT, not per day. A morning pullout spike is real and an
    all-day average erases it, which is the whole reason the shift clock owns
    the windows. */
 const rates=roadCallRates(onShift(FORECAST_MIN_ROAD_CALLS+4),now);
 assert.equal(rates.observed,FORECAST_MIN_ROAD_CALLS+4);
 assert.ok(rates.rates["1st"]>0,"the shift they landed on carries the rate");
 assert.equal(rates.rates["2nd"],0,"and the shifts they did not are not credited with them");
 assert.equal(FORECAST_LOOKBACK_DAYS,21,"seven days of a quiet week is four events, and four events cannot carry a rate");

 /* EVERY LINE STILL HAS TO SURVIVE A LOCK SCREEN. The forecast is appended to
    the same message, and a block that wraps mid-number is exactly as useless as
    no forecast. The first draft put "BEFORE THE 06:00 PULLOUT" in a labelled
    row and ran to 44 characters; this test is what caught it. */
 for(const forecast of [thin,ready,quiet,buildFleetForecast(stuck,[],{now,downed:3})])
  for(const line of forecastTextLines(forecast,STATUS_REPORT_WIDTH))
   assert.ok(line.length<=STATUS_REPORT_WIDTH,"forecast line too wide ("+line.length+"): "+line);

 /* A garage whose hours have been edited into a gap has no window, and a window
    of null is not a window of zero: "0 road calls expected" would be a
    confident answer to a question that was never asked. */
 assert.equal(buildFleetForecast(onShift(20),[],{now,settings:{shifts:[],pullouts:[]}}),null);
 assert.deepEqual(forecastTextLines(null,STATUS_REPORT_WIDTH),[]);
});

test("the FLEET STATUS REPORT counts downed buses the way the shop does",async()=>{
 const {buildFleetStatusReport,statusReportText,mysteryLabel,DEFAULT_STATUS_REPORT_PICK,INSPECTION_SECTION,STATUS_REPORT_ROAD_CALL_HOURS}=
  await import("../src/lib/reports/fleet-status-report.ts");
 /* The two fixed versions are gone; both are now points on the include list.
    Curtis: "I could just pick what I want sent, and it'll auto format to that."
    COUNTS is what the old counts-only version was — numbers, no locations — and
    WITH_REPAIRS is the long one with the defects switch on. */
 const COUNTS={...DEFAULT_STATUS_REPORT_PICK,locations:false,defects:false};
 const WITH_REPAIRS={...DEFAULT_STATUS_REPORT_PICK,defects:true};

 const now="2026-09-13T18:00:00.000Z";
 const hoursAgo=h=>new Date(Date.parse(now)-h*3600000).toISOString();

 /* The five sections actually on the shop's sheet, plus an Inspection - which
    the live sheet has none of today, and which is exactly why it has to be in
    the fixture rather than tested against real data. */
 const fleet=[
  {id:"b1",n:"17501",l:"bay-1",s:"defect",defects:[{id:"x1",category:"Brakes",issue:"Air leak",state:"open"}]},
  {id:"b2",n:"17502",l:"bay-2",s:"defect",defects:[]},
  {id:"b3",n:"17503",l:"bay-3",s:"defect",defects:[]},
  /* On property, in a work area, nothing on the sheet: a mystery. */
  {id:"b4",n:"17504",l:"east-1",s:"unknown",defects:[{id:"x4",category:"A/C and HVAC",issue:"No cooling",state:"open"}]},
  {id:"b5",n:"17505",l:"west-1",s:"unknown",defects:[]},
  /* Road call 6 hours ago and NOT on the sheet - the row somebody must chase. */
  {id:"b6",n:"17506",l:"garage-1",s:"defect",roadcall:true,roadCalls:[{id:"r6",at:hoursAgo(6)}],defects:[]},
  /* Road call 6 hours ago and already written up. */
  {id:"b7",n:"17507",l:"garage-2",s:"defect",roadcall:true,roadCalls:[{id:"r7",at:hoursAgo(6)}],defects:[]},
  /* Road call four days ago: outside the window, and must not appear. */
  {id:"b8",n:"17508",l:"garage-3",s:"defect",roadcall:true,roadCalls:[{id:"r8",at:hoursAgo(96)}],defects:[]},
  /* FIXED AND BACK IN SERVICE: the event is two hours old and inside any
     window, but clearRoadCall took the flag off and left the history. Curtis:
     "only roadcalls ... that have not been taken off out of that status." */
  {id:"b9",n:"17509",l:"garage-4",s:"service",roadcall:false,roadCalls:[{id:"r9",at:hoursAgo(2)}],defects:[]},
 ];
 const entries=[
  {busId:"b1",section:"Pending",workflow:"Scheduled"},
  /* SAME BUS, second write-up. One downed bus, not two. */
  {busId:"b1",section:"Scheduled Repair",workflow:"Scheduled"},
  {busId:"b2",section:"Vendor Repair",workflow:"Scheduled"},
  {busId:"b3",section:INSPECTION_SECTION,workflow:"Scheduled"},
  {busId:"b7",section:"Roadcall",workflow:"Scheduled"},
  /* Completed: off the sheet as far as every count goes. */
  {busId:"b5",section:"Pending",workflow:"Completed"},
 ];
 const board=buildFleetStatusReport(fleet,entries,now);

 /* THE HEADLINE. b1 (twice), b2 and b7 are down; b3 is in for an inspection and
    is not. Curtis: "the downed number normally does not count inspections." */
 assert.equal(board.downed,3,"an inspection is not a downed bus, and one bus written up twice is one bus");
 assert.equal(board.onSheet,4,"the sheet total is still computed, for anyone who needs to reconcile the two");
 assert.equal(board.inspections,1,"and the difference is named rather than left to be worked out");

 /* A bus in for an inspection AND for brakes is DOWN - the brakes are what is
    holding it, and the inspection must not subtract it. */
 const alsoDown=buildFleetStatusReport(fleet,[...entries,{busId:"b3",section:"Pending",workflow:"Scheduled"}],now);
 assert.equal(alsoDown.downed,4,"an inspection alongside a real repair does not excuse the bus");
 assert.equal(alsoDown.inspections,0,"and it stops counting as an inspection-only bus");

 /* MYSTERY: on property, in a work area, nothing active on the sheet. b5's only
    entry is Completed, so it is a mystery too. */
 assert.deepEqual(board.mystery.map(bus=>bus.n),["17504","17505"],"sorted by fleet number, as somebody reads them");
 /* NO OPEN-REPAIR COUNT against them any more. Curtis: "as far as the open
    repair count don't include that." It answered a question nobody asks of
    this list — a mystery bus is one the sheet does not explain, and what is
    already logged against it is a different report. */
 assert.deepEqual(board.mystery.map(bus=>bus.note),["",""],"the row carries the bus and where it is, and nothing else");

 /* Curtis's wording, and the reason for it: a mystery bus is an admission that
    nobody has decided anything about it yet. */
 assert.equal(mysteryLabel(2),"2 PENDING CONFIRMATION OF STATUS");
 assert.equal(mysteryLabel(0),"0","at zero the caveat goes - a zero needs no hedge");

 /* ROAD CALLS: the window is 48 hours and nothing older leaks in. */
 assert.equal(STATUS_REPORT_ROAD_CALL_HOURS,36,"Curtis moved the window from 48 to 36, and confirmed it again");
 /* ONE LIST NOW, not two. It used to report every call in the window and then
    star the ones off the sheet; Curtis collapsed that by changing the rule
    rather than the report — "any bus that is added to the downsheet while it
    is in roadcall status should not be counted here." 17507 is inside the
    window and still in that status, and it is on the sheet, so it is not
    pending: somebody has it. */
 assert.deepEqual(board.roadCallsPending.map(bus=>bus.n),["17506"],
  "the four-day-old call is outside the window, the one taken off that status is excluded though it is two hours old, and the one already written up is somebody's job rather than a pending call");
 assert.equal("roadCallsOffSheet" in board,false,"the second list went with the rule that needed it");

 /* THE LOCK-SCREEN TEXT. */
 const text=statusReportText(board,{title:"PACE SOUTH"});
 /* The two numbers that are not like the others, fenced off rather than
    footnoted - a footnote is what a person skips when somebody is waiting. */
 /* "(downed buses only)" is gone: it repeated the heading back at the reader.
    Curtis: "get rid of the extra redundant (downed buses only) line under
    downed buses. Not necessary on either version." The line under INSPECTIONS
    stays — that one says what the heading does not. */
 assert.match(text,/={10,}\nDOWNED BUSES\s+3\nINSPECTIONS\s+1\n\s+\(not counted above\)\n={10,}/,
  "downed and inspections sit inside a heavy band, so the reader sees the other counts exclude them");
 assert.doesNotMatch(text,/downed buses only/i);
 /* A BLANK LINE between the number and the caveat. Curtis: "put a space in
    between (like a tabbed space so its not so bunced up)". Stacked directly
    the two read as one wrapped sentence. */
 assert.match(text,/MYSTERY BUSES\s+2\n\n\s+PENDING CONFIRMATION OF STATUS/,"the caveat is a note about the number, set apart from it");
 assert.match(text,/ROADCALLS PENDING\s+1\n\s+\(not on the down sheet\)/,
  "named for what it is, with the qualifier said once under the heading");
 assert.doesNotMatch(text,/NOT ON THE SHEET \u2014/,"the star and its footnote went with the second list");
 /* THE TWO VERSIONS RUN IN THE SAME ORDER. Curtis: "also match the reports."
    They had ROADCALLS and MYSTERY in opposite orders, and somebody comparing
    the one they were sent against the one on their screen should not have to
    notice that two blocks swapped places. Pending leads in both: a breakdown
    nobody has written up is a known problem going unrecorded, where a mystery
    bus is still a question. */
 const order=body=>[body.indexOf("ROADCALLS PENDING"),body.indexOf("MYSTERY BUSES")];
 const [fullRoad,fullMystery]=order(text);
 assert.ok(fullRoad>=0&&fullMystery>=0,"both blocks are in the message version");
 assert.ok(fullRoad<fullMystery,"roadcalls pending leads the message version");
 const [shortRoad,shortMystery]=order(statusReportText(board,{pick:COUNTS,title:"PACE SOUTH"}));
 assert.ok(shortRoad<shortMystery,"and leads the counts-only version the same way");

 /* Numbers for MYSTERY and ROAD CALLS only. Curtis: "not the entire downed bus
    list" - thirty fleet numbers would bury the ones that need chasing. */
 assert.ok(text.includes("17504")&&text.includes("17506"),"the two lists somebody must act on name their buses");
 assert.equal(text.includes("17501"),false,"the downed list is a figure, not a roll call");
 assert.equal(text.includes("17502"),false);

 /* Defects are OFF by default and only arrive when asked for. */
 assert.equal(text.includes("Brakes"),false,"the short version is the one that gets read");
 const full=statusReportText(board,{pick:WITH_REPAIRS});
 assert.match(full,/A\/C and HVAC/,"and the checkbox brings the repairs in");

 /* Every line has to survive a phone. */
 const {STATUS_REPORT_WIDTH}=await import("../src/lib/reports/fleet-status-report.ts");
 for(const line of statusReportText(board,{pick:WITH_REPAIRS,title:"PACE SOUTH"}).split("\n"))
  assert.ok(line.length<=STATUS_REPORT_WIDTH,"line too wide for a lock screen ("+line.length+"): "+line);

 /* A long location gives up room before the note does, and a fleet number is
    never cut - a truncated bus number is a wrong bus number. */
 const wordy=buildFleetStatusReport([{id:"w",n:"17588",l:"east-1",s:"unknown",
  defects:[{id:"d",category:"Transmission and Drivetrain",issue:"Will not shift out of second",state:"open"}]}],[],now);
 for(const line of statusReportText(wordy,{pick:WITH_REPAIRS}).split("\n"))
  assert.ok(line.length<=STATUS_REPORT_WIDTH,"wordy record too wide ("+line.length+"): "+line);
 assert.match(statusReportText(wordy),/17588/,"and the number itself survives intact");

 /* A LONG LIST MUST NOT BECOME A WALL OF TEXT. Measured against the real board:
    22 mystery buses became 25 lines and 1,800 characters, which is no longer
    something anybody reads on a lock screen - the format's whole reason for
    existing. The first few keep their location, which is what somebody walking
    out to find them needs; the rest pack across the width. Every number stays,
    because Curtis asked for the numbers and a bare "+14 more" would defeat the
    list. */
 {
  const {STATUS_REPORT_DETAIL_LIMIT,STATUS_REPORT_WIDTH}=await import("../src/lib/reports/fleet-status-report.ts");
  const many=Array.from({length:22},(unused,index)=>({id:"m"+index,n:String(17500+index),l:"east-1",s:"unknown",defects:[]}));
  const crowded=statusReportText(buildFleetStatusReport(many,[],now));
  assert.equal(crowded.split("\n").filter(line=>/^  \d{5}  /.test(line)).length,STATUS_REPORT_DETAIL_LIMIT,
   "only the first few get a line of their own");
  assert.match(crowded,/\+ 14 more:/);
  for(const bus of many)assert.ok(crowded.includes(bus.n),"every fleet number survives the packing: "+bus.n);
  for(const line of crowded.split("\n"))
   assert.ok(line.length<=STATUS_REPORT_WIDTH,"packed line too wide ("+line.length+"): "+line);
  /* The claim is about the SECTION, not the whole report - the headers and the
     fences are there either way. 22 buses have to cost well under 22 lines. */
  const body=crowded.split("\n");
  const start=body.findIndex(line=>line.startsWith("MYSTERY BUSES"));
  const end=body.findIndex((line,index)=>index>start&&/^-{5,}$/.test(line));
  const section=(end<0?body.length:end)-start;
  assert.ok(section<16,"22 mystery buses must cost well under one line each, got "+section);
  assert.ok(section>=STATUS_REPORT_DETAIL_LIMIT,"but the detailed ones are still there");
 }

 /* An empty shop reports zeroes rather than throwing. */
 const quiet=buildFleetStatusReport([],[],now);
 assert.equal(quiet.downed,0);
 assert.match(statusReportText(quiet),/DOWNED BUSES\s+0/);

 /* A record missing the fields defectLabel reads must not take the report down
    at the moment somebody is standing there waiting for it. */
 const thin=buildFleetStatusReport([{id:"t",n:"17599",l:"east-2",s:"unknown",defects:[{id:"d"}]}],[],now);
 assert.equal(thin.mystery.length,1);
 assert.ok(statusReportText(thin,{pick:WITH_REPAIRS}).length>0,"a thin defect record still renders");
});

test("the Fleet Status Report has a way out you can see",async()=>{
 const [modal,css]=await Promise.all([
  readFile(new URL("../src/components/reports/status-report-modal.tsx",import.meta.url),"utf8"),
  readFile(new URL("../app/down-sheet/down-sheet.css",import.meta.url),"utf8"),
 ]);
 const code=modal.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\{\/\*[\s\S]*?\*\/\}/g,"");

 /* Curtis opened the report to send it and could not find the way out: "I don't
    see the X button clearly to close the page."

    MEASURED, the button was never missing — 40x40 and in view at 360, 390, 430
    and 820, with the glyph itself around 8.8:1 against the header. What was
    missing was any sign that it WAS a button: border:0 over a 12% white fill on
    a navy gradient measures 1.42:1 against the header behind it, so what a
    person saw was a bare × floating beside a large white title.

    The border is what fixes it, not the fill. At 45% white the edge measures
    3.72:1 against the header — past the 3:1 a control boundary needs — where
    the fill alone is still only 1.55:1. */
 assert.match(code,/<button type="button" className="status-report-close" onClick=\{close\}>CLOSE<\/button>/,
  "a word rather than a glyph: this is a read-and-dismiss surface, so the label costs nothing");
 assert.equal(/&times;/.test(code),false,"the bare × is gone");

 const rules=css.match(/(?:^|[\s,}])\.status-report-head>button(?=[\s,{])[^{}]*\{[^}]*\}/g)||[];
 assert.ok(rules.length,"the close button still has a rule");
 const base=rules[0];
 assert.equal(/border:0/.test(base),false,"it no longer has border:0, which is what made it invisible");
 assert.match(base,/border:1px solid #ffffff73/,"the edge is what draws the box against the header");
 /* 44px on a phone, because this is the control somebody reaches for with a
    thumb while holding the report open in one hand. */
 assert.ok(rules.some(rule=>/min-height:44px/.test(rule)),"and it is a 44px target on a phone");
});

test("the downed forecast measures the same population it projects",async()=>{
 const {buildFleetForecast,INSPECTION_CATEGORY}=await import("../src/lib/reports/fleet-forecast.ts");

 /* AN INSPECTION IS NOT A DOWNED BUS. The ledger records the whole sheet; the
    number this forecast projects is DOWNED buses, the line Curtis drew himself
    - "the downed number normally does not count inspections". Measuring
    arrivals over the whole sheet and charging them to a downed-only base is
    measuring one population and billing another.

    MEASURED against the real nine-sheet baseline: leaving inspections in runs
    the arrival rate 49% hot (0.330/h against 0.222/h). */
 const at=index=>new Date(Date.parse("2026-09-01T06:00:00.000Z")+index*24*3600000).toISOString();
 const row=(b,c)=>({b,c});
 /* Four repairs sit still across every swap. The only thing that MOVES is a
    stream of inspections coming and going, so a rate that counts them reports
    churn where the downed population never changed at all. */
 const stayers=[row("17510","Engine"),row("17520","Brakes"),row("17530","Engine"),row("17540","Brakes")];
 const ledger=[0,1,2,3].map(index=>({
  id:"swap-"+index,at:at(index),shift:"1st",
  rows:[...stayers,row("9000"+index,INSPECTION_CATEGORY),row("9100"+index,INSPECTION_CATEGORY)],
  off:index?["9000"+(index-1),"9100"+(index-1)]:[],
 }));
 const forecast=buildFleetForecast([],[],{now:at(4),ledger,downed:4,span:"pullout"});
 assert.equal(forecast.downed.enough,true,"four swaps is past the gate");
 assert.deepEqual(forecast.downed.inRange,{low:0,high:0},"no DOWNED bus arrived, so none is forecast");
 assert.deepEqual(forecast.downed.outRange,{low:0,high:0},"and none cleared");
 assert.deepEqual(forecast.downed.range,{low:4,high:4},"the projection holds at the four that never moved");

 /* And the same ledger WITH the inspections counted as downed work reports a
    fleet churning twice a day. This is the mutation the strip exists to stop. */
 const naive=ledger.map(snapshot=>({...snapshot,
  rows:snapshot.rows.map(item=>item.c===INSPECTION_CATEGORY?{...item,c:"Engine"}:item)}));
 const wrong=buildFleetForecast([],[],{now:at(4),ledger:naive,downed:4,span:"pullout"});
 assert.ok(wrong.downed.inRange.high>0,"the fixture really does move once inspections count");
});

test("the forecast is one number, and the single-number spelling is already there",async()=>{
 const {buildFleetForecast,forecastTextLines}=await import("../src/lib/reports/fleet-forecast.ts");
 const {STATUS_REPORT_WIDTH}=await import("../src/lib/reports/fleet-status-report.ts");

 /* Curtis: "Most important number is Forecasted Total Down buses by pullout
    times... So far, I only want this one number for the forecast." */
 /* Twelve hours between swaps, not twenty-four. The window to the next pullout
    can be as little as four hours, and at one net bus a day the projection moves
    less than half a bus across it - which rounds away to nothing and makes a
    real rate look like no rate at all. */
 const at=index=>new Date(Date.parse("2026-09-01T09:00:00.000Z")+index*12*3600000).toISOString();
 /* Four swaps, two buses arriving each day and one clearing, so the rates are
    real and the projection has to rise.

    A STABLE ROSTER THAT SLIDES. The first draft of this fixture minted new bus
    numbers on every snapshot, so every bus read as an arrival AND a clearance
    and the projection rose for a reason that had nothing to do with the rates.
    A fixture that passes for the wrong reason is worse than one that fails. */
 const ledger=[0,1,2,3].map(index=>({
  id:"s"+index,at:at(index),shift:"1st",
  rows:Array.from({length:4+3*index},(unused,n)=>({b:String(17500+index+n),c:"Engine"})),
  off:index?[String(17500+index-1)]:[],
 }));
 const forecast=buildFleetForecast([],[],{now:at(4),ledger,downed:20,span:"pullout"});
 assert.equal(forecast.downed.enough,true);

 const ranged=forecastTextLines(forecast,STATUS_REPORT_WIDTH).join("\n");
 const single=forecastTextLines(forecast,STATUS_REPORT_WIDTH,{style:"single"}).join("\n");

 /* THE RANGE IS THE DEFAULT, because seven swaps cannot carry a decimal point
    and a figure that looks more confident than the data is how a forecast
    stops being believed. Curtis took that: "if it hasn't beaten my judgement
    yet based on a lack of samples then I will go with your recommendation on a
    range." */
 assert.match(ranged,/\d+-\d+/,"the default spells a range");
 /* AND THE SINGLE NUMBER IS ALREADY BUILT, so the switch is a parameter rather
    than a rewrite - "u can build it for single number ability now so we don't
    have to revisit from scratch". */
 assert.doesNotMatch(single,/\d+-\d+/,"the single spelling carries no dash");
 assert.ok(single.includes("  "+forecast.downed.expected+"   (now "),"it prints the point estimate");
 assert.ok(forecast.downed.expected>=forecast.downed.range.low
  &&forecast.downed.expected<=forecast.downed.range.high,"and it sits inside the range it replaces");
 /* AND IT ACTUALLY MOVES WITH THE RATES. Containment alone does not bite: a
    point estimate hard-wired to today's count sits inside its own range every
    time, and the mutation that did exactly that survived until this line. This
    fixture takes two buses a day and clears one, so a figure that does not rise
    above the twenty on the board is not reading the ledger at all. */
 assert.ok(forecast.downed.expected>forecast.downed.now,
  "arrivals beat clearances in this fixture, so the projection has to rise");

 /* BOTH spellings carry the window and where the fleet stands right now. */
 for(const text of [ranged,single]){
  assert.match(text,/DOWNED BUSES/);
  assert.match(text,/PULLOUT/,"the window is named, and it is the next pullout");
  assert.match(text,/\(now 20\)/);
  assert.match(text,/not guaranteed/,"the hedge rides with it every time");
 }

 /* EVERYTHING ELSE IS STILL COMPUTED AND SIMPLY NOT DRAWN, so putting a line
    back is a display change and not a rebuild of the model. */
 assert.equal(typeof forecast.roadCalls.chance,"number");
 assert.ok(Array.isArray(forecast.slowest));
 for(const gone of ["ROAD CALLS","CHANCE OF ANY","SLOWEST ON THE SHEET"])
  assert.equal(ranged.includes(gone),false,"no longer printed: "+gone);

 /* Still a lock screen. */
 for(const text of [ranged,single])
  for(const line of text.split("\n"))
   assert.ok(line.length<=STATUS_REPORT_WIDTH,"too wide ("+line.length+"): "+line);
});

test("the forecast adds the two queues it can see, and counts neither twice",async()=>{
 const {buildFleetForecast,INSPECTION_CATEGORY,FORECAST_MIN_INSPECTIONS,FORECAST_MIN_CONVERSIONS,
  FORECAST_ROAD_CALL_CONVERTS_WITHIN_HOURS}=await import("../src/lib/reports/fleet-forecast.ts");
 const modal=await readFile(new URL("../src/components/reports/status-report-modal.tsx",import.meta.url),"utf8");

 const at=index=>new Date(Date.parse("2026-09-01T09:00:00.000Z")+index*12*3600000).toISOString();
 const down=(...buses)=>buses.map(b=>({b,c:"Engine"}));
 const insp=(...buses)=>buses.map(b=>({b,c:INSPECTION_CATEGORY}));

 /* THE INSPECTION QUEUE. Four swaps; on each one a pair of inspections that sat
    on the previous sheet comes back as a downed bus. Curtis: "we need inspection
    also counted in that rate if half of them are counted as down buses or become
    downed buses with PM defects. That is a factor we cannot ignore." */
 const ledger=[0,1,2,3].map(index=>({
  id:"s"+index,at:at(index),shift:"1st",off:[],
  rows:[...down("17500","17501"),
   /* last swap's inspections, now written up */
   ...(index?down(String(17600+index-1),String(17700+index-1)):[]),
   ...insp(String(17600+index),String(17700+index))],
 }));
 const quiet=buildFleetForecast([],[],{now:at(4),ledger,downed:10,inspections:0,roadCallsPending:0});
 const queued=buildFleetForecast([],[],{now:at(4),ledger,downed:10,inspections:8,roadCallsPending:0});
 assert.equal(queued.downed.fromInspections.enough,true,"four swaps of inspections is past the floor");
 assert.equal(queued.downed.fromInspections.pool,8,"and it carries the queue standing right now");
 assert.ok(queued.downed.fromInspections.expected>0,"eight waiting inspections contribute");
 assert.ok(queued.downed.expected>quiet.downed.expected,
  "the same shop with eight inspections queued forecasts MORE than one with none");
 /* THE QUEUE IS WHY, not the base rate: an empty yard and a full one share a
    ledger, so anything that moved between them came from the pool. */
 assert.equal(quiet.downed.fromInspections.expected,0);

 /* A HANDFUL OF INSPECTIONS IS NOT A RATE. Below the floor it says what it is
    waiting for and contributes nothing, rather than quoting a conversion off
    two observations. */
 const thin=buildFleetForecast([],[],{now:at(2),inspections:8,roadCallsPending:0,
  ledger:[{id:"a",at:at(0),shift:"1st",off:[],rows:[...down("17500"),...insp("17600")]},
          {id:"b",at:at(1),shift:"1st",off:[],rows:down("17500","17600")}]});
 assert.equal(thin.downed.fromInspections.enough,false);
 assert.equal(thin.downed.fromInspections.expected,0,"and contributes nothing while it is thin");
 assert.equal(thin.downed.fromInspections.need,FORECAST_MIN_INSPECTIONS-1);

 /* THE ROAD-CALL QUEUE, which the sheets alone cannot measure - a road call
    that never converted never appears on one. The denominator comes off the
    board's own events and the numerator off the ledger.

    Eight buses road-call; six of them show up on the next sheet. Curtis: "if we
    have 10 roll calls and only two of them are converted to the down sheet,
    then that's a 20% chance." */
 const called=[];
 const rcLedger=[{id:"r0",at:at(0),shift:"1st",off:[],rows:down("17500")}];
 for(let index=0;index<8;index++){
  const number=String(17800+index);
  called.push({id:"rc"+index,n:number,roadCalls:[{id:"e"+index,at:at(0)}]});
  if(index<6)rcLedger.push({id:"r"+(index+1),at:at(1),shift:"1st",off:[],rows:down(number)});
 }
 /* One snapshot per converted bus would double the swap count, so they share a
    stamp - the conversion check asks whether ANY snapshot inside the window saw
    the bus, not how many did. */
 /* TWO EVENTS NO SNAPSHOT EVER LOOKED AT. They fell in a hole in the ledger,
    which is a failure to OBSERVE and not a failure to convert - counting them as
    the latter quietly drags the rate toward zero every time the shop goes a few
    days without scanning. They must not appear in the denominator at all. */
 called.push({id:"rcOld",n:"17899",roadCalls:[{id:"eOld",at:new Date(Date.parse(at(0))-30*24*3600000).toISOString()}]});
 called.push({id:"rcOld2",n:"17898",roadCalls:[{id:"eOld2",at:new Date(Date.parse(at(0))-20*24*3600000).toISOString()}]});
 const rc=buildFleetForecast(called,[],{now:at(2),ledger:rcLedger,downed:10,inspections:0,roadCallsPending:5});
 assert.equal(Math.round(rc.downed.fromRoadCalls.rate*100),75,
  "six of the EIGHT judged converted; the two nobody looked at are not in the denominator");
 assert.equal(rc.downed.fromRoadCalls.enough,true,"eight judged events is past the floor");
 assert.equal(rc.downed.fromRoadCalls.pool,5);
 assert.ok(rc.downed.fromRoadCalls.rate>0.5&&rc.downed.fromRoadCalls.rate<1,
  "six of eight converted, so the rate sits between a half and certainty: "+rc.downed.fromRoadCalls.rate);
 assert.equal(Math.round(rc.downed.fromRoadCalls.expected),Math.round(5*rc.downed.fromRoadCalls.rate),
  "five standing at that rate is what the queue contributes");
 assert.equal(FORECAST_MIN_CONVERSIONS,6);
 assert.ok(FORECAST_ROAD_CALL_CONVERTS_WITHIN_HOURS>0);

 /* AND NEITHER IS COUNTED TWICE. The base rate is an average over past windows,
    so it already carries the TYPICAL conversion of both queues; adding the queue
    terms on top of the RAW rate would count those arrivals once in the average
    and again in the queue. An arrival that was an inspection on the previous
    sheet is taken out of the base, so a ledger made entirely of such arrivals
    has a base rate of nothing at all. */
 const allFromInspections=buildFleetForecast([],[],{now:at(4),ledger,downed:10,inspections:0,roadCallsPending:0});
 assert.deepEqual(allFromInspections.downed.inRange,{low:0,high:0},
  "every arrival in this ledger converted from an inspection, so the base carries none of them");

 /* The pools are handed over by the report rather than worked out twice. */
 const modalCode=modal.replace(/\/\*[\s\S]*?\*\//g,"");
 assert.match(modalCode,/inspections:board\.inspections/);
 assert.match(modalCode,/roadCallsPending:board\.roadCallsPending\.length/);
});
