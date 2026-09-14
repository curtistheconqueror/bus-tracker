/* THE PAPER HALF OF THE SCOREBOARD.

   Curtis asked for both: "Will build both out PDF and on the lock screen
   version and give me the choice to send either one before sending."

   They are not the same document at two sizes. The lock-screen version is built
   to 38 characters so it arrives AS the message and can be read without
   unlocking anything; this one is built to be handed over — a superintendent
   forwarding it, or a copy going in a folder — so it can afford a header, real
   type and white space the text version cannot.

   NO PDF LIBRARY. This is an offline-first app with no build step for new
   dependencies, and the browser already knows how to make a PDF out of a
   printable page: iOS Print gives Save to Files, and a desktop gives Print to
   PDF. So this returns HTML and the caller prints it, rather than pulling in
   three hundred kilobytes to draw the same glyphs a second way.

   Rendered into a same-document IFRAME rather than a popup. In standalone mode
   window.open leaves the app and lands in Safari, which is exactly the trapdoor
   this app exists to avoid — and the print sheet has to come up over the board,
   not somewhere else. */

import {mysteryLabel,scoreboardStamp,SCOREBOARD_ROAD_CALL_HOURS,type Scoreboard,type ScoreboardBusLine} from "./fleet-scoreboard.ts";

/* Everything that reaches the page is a value from the board — fleet numbers,
   locations, catalog wording, and free text somebody typed into a repair. It is
   written into markup, so it is escaped. A bus whose details field contains a
   "<" is not a security problem here, but it IS a report that silently loses
   half a line, which is the same failure a foreman would have to notice. */
function escapeHtml(value:unknown){
 return String(value??"")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function busRows(buses:ScoreboardBusLine[],includeDefects?:boolean){
 if(!buses.length)return '<p class="none">None.</p>';
 return '<ul class="buses">'+buses.map(bus=>{
  const head='<b>'+escapeHtml(bus.n)+'</b><span>'+escapeHtml(bus.where)+'</span><em>'+escapeHtml(bus.note)+'</em>';
  const defects=includeDefects&&bus.defects.length
   ?'<ol class="defects">'+bus.defects.map(line=>'<li>'+escapeHtml(line)+'</li>').join("")+'</ol>'
   :"";
  return '<li>'+head+defects+'</li>';
 }).join("")+'</ul>';
}

/* The counts-only version's two lists: fleet numbers and nothing else. Same
   split the text version makes — downed and inspections are figures to quote,
   these two are errands, and an errand needs the number and not the paragraph. */
function numberList(buses:ScoreboardBusLine[]){
 if(!buses.length)return '<p class="none">None.</p>';
 return '<p class="numbers">'+buses.map(bus=>escapeHtml(bus.n)).join("  \u00b7  ")+'</p>';
}

export function scoreboardPrintHtml(board:Scoreboard,options:{includeDefects?:boolean;counts?:boolean;title?:string}={}){
 const title=escapeHtml(String(options.title||"PACE SOUTH").trim()||"PACE SOUTH");
 const stamp=escapeHtml(scoreboardStamp(board.at));
 /* One list, and the "NOT ON THE SHEET" tag against each row is gone with it:
    not on the sheet is the definition of pending now, said once in the heading
    rather than repeated against every bus. */
 const counts=options.counts===true;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>${title} — Fleet Scoreboard</title>
<style>
 @page{margin:14mm}
 *{box-sizing:border-box}
 body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#112657;font-size:12pt;line-height:1.45}
 header{border-bottom:3px solid #06275c;padding-bottom:8px;margin-bottom:16px}
 h1{margin:0;font-size:20pt;font-weight:900;letter-spacing:.01em;color:#06275c}
 .stamp{margin:3px 0 0;font-size:10pt;font-weight:700;color:#5b6b85;letter-spacing:.05em}
 /* The two numbers that are not like the others, fenced the same way the text
    version fences them, so the two documents cannot tell different stories. */
 .headline{border:3px solid #06275c;border-radius:6px;padding:12px 16px;margin:0 0 18px;display:flex;gap:28px;flex-wrap:wrap}
 .headline div{min-width:150px}
 .headline dt{margin:0;font-size:9pt;font-weight:900;letter-spacing:.1em;color:#5b6b85;text-transform:uppercase}
 .headline dd{margin:2px 0 0;font-size:30pt;font-weight:900;line-height:1;color:#06275c}
 .headline small{display:block;margin-top:3px;font-size:8.5pt;font-weight:700;color:#5b6b85}
 h2{margin:18px 0 6px;font-size:11pt;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#06275c;border-bottom:1px solid #9cadd1;padding-bottom:4px}
 .caveat{margin:0 0 6px;font-size:9pt;font-weight:800;letter-spacing:.06em;color:#9a5416;text-transform:uppercase}
 ul.buses{list-style:none;margin:0;padding:0}
 ul.buses>li{padding:5px 0;border-bottom:1px dotted #c6cee0;page-break-inside:avoid}
 ul.buses b{display:inline-block;min-width:66px;font-size:12pt;font-weight:900;font-variant-numeric:tabular-nums}
 ul.buses span{display:inline-block;min-width:130px;font-size:10.5pt}
 ul.buses em{font-style:normal;font-size:9.5pt;color:#5b6b85}
 ol.defects{margin:3px 0 2px 72px;padding:0 0 0 14px;font-size:9.5pt;color:#33415c}
 .none{margin:2px 0 0;font-size:10pt;color:#5b6b85}
 .numbers{margin:2px 0 0;font-size:13pt;font-weight:900;line-height:1.7;font-variant-numeric:tabular-nums;color:#112657}
 footer{margin-top:22px;padding-top:8px;border-top:1px solid #c6cee0;font-size:8.5pt;color:#7f8ca6}
 @media print{body{font-size:11pt}}
</style></head><body>
<header><h1>${title} — FLEET SCOREBOARD</h1><p class="stamp">${stamp}</p></header>
<dl class="headline">
 <div><dt>Downed buses</dt><dd>${board.downed}</dd></div>
 <div><dt>Inspections</dt><dd>${board.inspections}</dd><small>Not counted above</small></div>
</dl>
<h2>Roadcalls pending — last ${SCOREBOARD_ROAD_CALL_HOURS} hours — ${board.roadCallsPending.length}</h2>
<p class="caveat">Currently not on the down sheet</p>
${counts?numberList(board.roadCallsPending):busRows(board.roadCallsPending,options.includeDefects)}
<h2>Mystery buses — ${escapeHtml(mysteryLabel(board.mystery.length))}</h2>
${board.mystery.length?'<p class="caveat">Pending confirmation of status</p>':""}
${counts?numberList(board.mystery):busRows(board.mystery,options.includeDefects)}
<footer>${board.onSheet} bus${board.onSheet===1?"":"es"} on the down sheet in total, inspections included. Downed excludes inspections.</footer>
</body></html>`;
}
