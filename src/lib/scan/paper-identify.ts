import {PAPER_KINDS,isPaperKind,paperKind,paperNamed,paperNamedInSentence,paperPageLabel,type PaperKind} from "./paper-kinds.ts";

/* WHICH SHEET IS THIS, and what to do when that is not one clean answer.

   SCAN PAPER takes a quick first look at every photo before any of them is
   read properly, and this module turns that look into a decision. The look
   itself is a small picture and one question — "what kind of page is this" —
   so it is cheap, and it is wrong sometimes. Everything here is built around
   that second fact:

   - NOTHING THAT COMES BACK IS TRUSTED AS IT ARRIVES. A kind this app does not
     know, a page number that was never sent, a confidence of "high": all of it
     reads as "could not be placed", never as a guess.
   - AN ANSWER THE READER WAS UNSURE OF IS NOT AN ANSWER. Below PAPER_SURE a
     page is unplaced, exactly as if nothing had come back for it.
   - THE APP ONLY DECIDES BY ITSELF WHEN EVERY PAGE AGREES. One unplaced page,
     or two pages that read as different sheets, and the person is asked.
   - A PAGE THE READER WAS SURE IS ANOTHER SHEET IS NOT SENT TO THE SCANNER THAT
     WAS PICKED. It is left out and named, and the scanner is told pages were
     held back. "Sure" is the PAPER_SURE line and nothing softer: a page the
     reader only leaned on, or was sure is no shop sheet at all, is unplaced
     and goes with whatever the person picks — after they have been told which
     page and why, and asked.

   THIS IS A DOOR, NOT A LOCK, AND FOR ONE SHEET IT IS THE ONLY DOOR. The
   sweep and heat scanners each ask their own route what the page is and
   refuse one that is not theirs. The Down Sheet scanner does not — its route
   was never asked that — and its import REPLACES the live sheet. So a page
   this module places as a Down Sheet is checked by nothing else until a
   person reads the rows. */

export type PaperPage={page:number;kind:PaperKind|"other";confidence:number};

/* Below this the reader is telling you it went by the layout alone. */
export const PAPER_SURE=0.6;

function confidenceOf(value:unknown):number{
 return typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;
}

/* One entry per photo that was SENT, in order, whatever came back. A page the
   answer skipped is "other" at zero; an answer for a page that was never sent
   is dropped; if a page is answered twice the first answer stands. */
export function normalizePaperPages(payload:unknown,count:number):PaperPage[]{
 const total=Math.max(0,Math.floor(Number(count)||0));
 const raw=payload&&typeof payload==="object"&&Array.isArray((payload as {pages?:unknown}).pages)?(payload as {pages:unknown[]}).pages:[];
 const seen=new Map<number,PaperPage>();
 for(const item of raw){
  if(!item||typeof item!=="object")continue;
  const record=item as {page?:unknown;document?:unknown;confidence?:unknown},page=record.page;
  if(typeof page!=="number"||!Number.isInteger(page)||page<1||page>total||seen.has(page))continue;
  seen.set(page,{page,kind:isPaperKind(record.document)?record.document:"other",confidence:confidenceOf(record.confidence)});
 }
 return Array.from({length:total},(_,index)=>seen.get(index+1)||{page:index+1,kind:"other" as const,confidence:0});
}

/* The kind a page was placed as, or null. The one place the threshold is
   applied, so "sure enough" cannot mean two things. */
export function paperPlaced(page:PaperPage):PaperKind|null{
 return page.kind!=="other"&&page.confidence>=PAPER_SURE?page.kind:null;
}

/* WHAT PICKING A KIND WOULD SEND.

   Every page except the ones PLACED as a different sheet. A page that was not
   placed goes along, because the person picking has just been told about it
   and has said what it is; a page placed as something else stays behind,
   because sending a heat sheet through the Down Sheet scanner is the mistake
   being prevented. The count left behind travels with the photos, so the
   scanner can say the batch is not all there. */
export type PaperChoice={kind:PaperKind;send:number[];leftOut:{page:number;kind:PaperKind}[]};

export function paperChoice(pages:PaperPage[],kind:PaperKind):PaperChoice{
 const send:number[]=[],leftOut:PaperChoice["leftOut"]=[];
 for(const page of pages){
  const placed=paperPlaced(page);
  if(placed&&placed!==kind)leftOut.push({page:page.page,kind:placed});else send.push(page.page);
 }
 return {kind,send,leftOut};
}

export type PaperAskWhy="mixed"|"unplaced"|"unread";
export type PaperVerdict=
 |{decided:true;choice:PaperChoice}
 |{decided:false;why:PaperAskWhy;choices:PaperChoice[]};

/* Decided only when there is at least one page, every page was placed, and
   they all agree. Otherwise the kinds worth offering, the ones the pages
   actually read as first: a kind that would send no page at all is not
   offered, since there would be nothing for its scanner to read. */
export function paperVerdict(pages:PaperPage[]):PaperVerdict{
 const placed=pages.map(paperPlaced),found=PAPER_KINDS.map(item=>item.kind).filter(kind=>placed.includes(kind));
 if(pages.length&&found.length===1&&placed.every(Boolean))return {decided:true,choice:paperChoice(pages,found[0])};
 const order=[...found,...PAPER_KINDS.map(item=>item.kind).filter(kind=>!found.includes(kind))];
 return {decided:false,why:found.length>1?"mixed":"unplaced",choices:order.map(kind=>paperChoice(pages,kind)).filter(choice=>choice.send.length>0)};
}

/* The first look never happened: no signal, no key on the server, a refused
   request. The person is asked, every kind is offered, and every page goes. */
export function paperUnread(count:number):PaperVerdict{
 const pages=normalizePaperPages(null,count);
 return {decided:false,why:"unread",choices:PAPER_KINDS.map(item=>paperChoice(pages,item.kind))};
}

/* ---- the words, here so the screen and anything else that reports a scan say
   the same thing ---- */

export function paperPagesWords(pages:number[]):string{
 if(!pages.length)return "NO PAGES";
 if(pages.length===1)return "PAGE "+pages[0];
 return "PAGES "+pages.slice(0,-1).join(", ")+" AND "+pages[pages.length-1];
}

function sheetWords(kind:PaperKind):string{return paperNamedInSentence(kind)}

/* The heading over a sheet the first look placed. */
export function paperReadsAsWords(kind:PaperKind):string{return "THIS READS AS "+paperNamed(kind)}

/* Why the person is being asked, as one sentence they can act on. */
export function paperAskWords(verdict:PaperVerdict,pages:PaperPage[],problem=""):string{
 if(verdict.decided)return "";
 if(verdict.why==="unread")return "The photos could not be looked at first"+(problem?" ("+problem.replace(/[.\s]+$/,"")+")":"")+", so pick the sheet yourself.";
 const unplaced=unplacedWords(pages);
 if(verdict.why==="mixed"){
  const byKind=PAPER_KINDS.map(item=>({kind:item.kind,pages:pages.filter(page=>paperPlaced(page)===item.kind).map(page=>page.page)})).filter(item=>item.pages.length);
  const parts=byKind.map((item,index)=>paperPagesWords(item.pages).toLowerCase()+(index?" as ":item.pages.length===1?" reads as ":" read as ")+sheetWords(item.kind));
  return "These photos are not all the same sheet: "+parts.slice(0,-1).join(", ")+" and "+parts[parts.length-1]+"."+(unplaced?" "+unplaced:"")+" Each kind is read on its own, so pick which to read now.";
 }
 return unplaced+(pages.length===1?" Pick the sheet it is.":" Pick the sheet these are. Every page named here goes with the one you pick.");
}

/* WHY EACH UNPLACED PAGE WAS NOT PLACED, because the three reasons are not
   the same thing and the person is about to send these pages somewhere. The
   reader being SURE a page is no shop sheet, the reader LEANING towards a
   sheet without being sure, and the reader making nothing of it at all were
   one sentence — "could not be placed" — which threw away the lean and hid
   the one case where the reader was confident. */
function unplacedWords(pages:PaperPage[]):string{
 const out:string[]=[],numbers=(match:(page:PaperPage)=>boolean)=>pages.filter(page=>!paperPlaced(page)&&match(page)).map(page=>page.page);
 const notASheet=numbers(page=>page.kind==="other"&&page.confidence>=PAPER_SURE);
 if(notASheet.length)out.push(paperPagesWords(notASheet)+(notASheet.length===1?" does":" do")+" not look like any of these sheets.");
 for(const item of PAPER_KINDS){
  const lean=numbers(page=>page.kind===item.kind);
  if(lean.length)out.push(paperPagesWords(lean)+" might be "+sheetWords(item.kind)+", but the reader was not sure.");
 }
 const nothing=numbers(page=>page.kind==="other"&&page.confidence<PAPER_SURE);
 if(nothing.length)out.push(paperPagesWords(nothing)+" could not be made out.");
 return out.join(" ");
}

/* What a choice leaves behind, or "" when it leaves nothing. It says what the
   page READS AS and no more: an earlier wording told the person to "scan it on
   its own next", which is the wrong advice exactly when the first look was
   wrong and the page belongs to the sheet they just picked. What to do about
   a held-back page is said by the scanner, where the photos can be changed. */
export function paperLeftOutWords(choice:PaperChoice):string{
 if(!choice.leftOut.length)return "";
 const kinds=PAPER_KINDS.map(item=>item.kind).filter(kind=>choice.leftOut.some(item=>item.kind===kind));
 const parts=kinds.map(kind=>{const pages=choice.leftOut.filter(item=>item.kind===kind).map(item=>item.page);return paperPagesWords(pages)+", which "+(pages.length===1?"reads":"read")+" as "+sheetWords(kind)});
 return "LEAVES OUT "+parts.join(", AND ")+".";
}

/* Where a kind is read, said from the page somebody is standing on. */
export function paperWhereWords(kind:PaperKind,here:string):string{
 return paperKind(kind).route===here?"READ HERE":"READ ON THE "+paperPageLabel(kind)+" PAGE";
}

/* THE QUESTION THE FIRST LOOK ASKS, built from the table of kinds so a new
   sheet cannot be added to the app and forgotten in the prompt. */
export const PAPER_DOCUMENT_VALUES:readonly string[]=[...PAPER_KINDS.map(item=>item.kind),"other"];

export function paperIdentifyPrompt():string{
 return "Look at the attached photos, in page order, and say what KIND of document each one is. Do not read the rows and do not return any bus numbers: only identify each page.\n\nTHE KINDS:\n"
  +PAPER_KINDS.map(item=>"- \""+item.kind+"\": "+item.looksLike).join("\n")
  +"\n- \"other\": anything else — a work order, a parts list, a whiteboard, a photo of a bus, or a page too blurred, dark or cropped to tell.\n\n"
  +"Every one of these sheets is a list of five-digit bus numbers, so the bus numbers decide nothing. Go by the PRINTED TITLE first, then by the printed column headings, then by what kind of mark fills the cells.\n\n"
  +"Return exactly one entry per photo, carrying the page number it was labelled with, the kind, and your confidence in that answer from 0 to 1. Use confidence below "+PAPER_SURE+" whenever you could not read a title or a column heading and went by the layout alone. Never answer a kind because it is the likeliest of them: a page that does not match a description is \"other\".";
}
