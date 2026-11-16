import {PAPER_DOOR,paperArrival,paperNamed,type PaperKind} from "./paper-kinds.ts";
import {paperNotThisWords} from "./paper-identify.ts";

/* GETTING THE PHOTOS FROM SCAN SHEET TO THE SCANNER THAT READS THEM.

   Two of the three scanners live on the Defect Log and one on the Down Sheet,
   because each sits on the page whose records it changes. So a photo taken
   through SCAN SHEET on one page sometimes has to be read on the other.

   THE PHOTOS TRAVEL IN MEMORY AND NOWHERE ELSE. They are not written to
   LocalStorage, not put in the address, and not sent anywhere to be fetched
   back: a photograph of a shop sheet carries names and initials, and the only
   copy this app has ever kept of one is the one in the camera roll. Memory
   means the hand-off only survives a change of page that does not reload the
   app, which is why SCAN SHEET moves with the router rather than with a link.

   AND WHEN THEY DO NOT ARRIVE, THE PAGE CAN TELL. The address says how many
   were meant to come (`photos=`); what this module hands back says whether
   they did. A reload in between loses them, and the scanner then says so
   instead of opening empty as though nothing had been asked.

   ALL OF THEM OR NONE OF THEM. A hand-off that does not match the count in
   the address is treated as lost outright. Part of a sheet read as the whole
   of it is the one outcome worse than reading nothing, and on the Down Sheet
   part of a sheet would REPLACE the sheet.

   One hand-off at a time, taken once, and only for a couple of minutes: it is
   for the next page, not for later. */

export type HandedPhotos={
 kind:PaperKind;
 files:File[];
 /* How many the address said were coming. More than `files` holds means they
    were lost on the way. */
 expected:number;
 /* How many photos from the same batch SCAN SHEET held back because they
    read as a different sheet. The scanner says so: the first look can be
    wrong, and a page left out of a Down Sheet is a page of buses that would
    come off it. */
 leftOut:number;
};

export const PAPER_HANDOFF_MS=2*60*1000;

type Held={kind:PaperKind;files:File[];leftOut:number;at:number};
let held:Held|null=null;

export function offerPaperPhotos(kind:PaperKind,files:File[],leftOut=0,now=Date.now()):void{
 const mine:Held={kind,files:[...files],leftOut:Math.max(0,Math.floor(Number(leftOut)||0)),at:now};
 held=mine;
 /* Not left holding somebody's photographs after the window has shut. The
    timer is not allowed to keep a process alive by itself, which is what a
    test runner is. */
 const timer=setTimeout(()=>{if(held===mine)held=null},PAPER_HANDOFF_MS+1000) as unknown as {unref?:()=>void};
 timer.unref?.();
}

/* Whatever is held, once. Taking always empties the holder — photos offered
   for one sheet and collected for another are not handed over, and are not
   left lying there for a third request either. */
export function takePaperPhotos(kind:PaperKind,now=Date.now()):{files:File[];leftOut:number}{
 const offered=held,nothing={files:[] as File[],leftOut:0};
 held=null;
 if(!offered||offered.kind!==kind)return nothing;
 const age=now-offered.at;
 return age>=0&&age<=PAPER_HANDOFF_MS?{files:offered.files,leftOut:offered.leftOut}:nothing;
}

/* What the page at `here` has been asked to open, with the photos if they
   made it. Null when the address asks nothing of this page. A request that
   expects no photos — the SCAN HEAT SHEET link on Fleet Campaigns — takes
   nothing, so photos waiting for another scanner are not swallowed by it. */
export function paperHandIn(search:string,here:string,now=Date.now()):HandedPhotos|null{
 const arrival=paperArrival(search,here);
 if(!arrival)return null;
 if(!arrival.expected)return {kind:arrival.kind,files:[],expected:0,leftOut:0};
 const taken=takePaperPhotos(arrival.kind,now),whole=taken.files.length===arrival.expected;
 return {kind:arrival.kind,files:whole?taken.files:[],expected:arrival.expected,leftOut:whole?taken.leftOut:0};
}

/* The photos a scanner should start with, or none: only a hand-off for THAT
   scanner's own sheet counts. */
export function handedFiles(handed:HandedPhotos|null|undefined,kind:PaperKind):File[]{
 return handed&&handed.kind===kind?handed.files:[];
}

/* EVERYTHING A SCANNER NEEDS TO KNOW ABOUT HOW IT WAS OPENED, asked once.

   The photos it starts with, what to say if they were lost on the way, the
   line that says SCAN SHEET opened it, the warning when SCAN SHEET held pages
   back, and whether to start reading by itself — which it does whenever it
   was handed photos, because they only ever arrive whole. */
export type HandedStart={files:File[];lost:string;note:string;warning:string;wrong:string;read:boolean};

export function handedStart(handed:HandedPhotos|null|undefined,kind:PaperKind):HandedStart{
 const files=handedFiles(handed,kind);
 return {files,lost:paperLostWords(handed,kind),note:paperHandedWords(handed,kind),warning:paperHeldBackWords(handed,kind),wrong:paperSentWrongWords(handed,kind),read:files.length>0};
}

/* Said by the scanner when photos were sent and did not arrive. */
export function paperLostWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 if(!handed||handed.kind!==kind||handed.expected<=handed.files.length)return "";
 return (handed.expected===1?"The photo":"The "+handed.expected+" photos")+" did not come across from the other page. Add "+(handed.expected===1?"it":"them")+" again.";
}

/* Said above a scanner that SCAN SHEET opened, so the person can see what the
   photos were taken for and that the read they are watching is not waiting
   for a second press. It names no button: it said "OPENED BY SCAN PAPER", and
   once SCAN SHEET became the door the same line sat inside a box already
   headed SCAN SHEET, telling the person the button they had just pressed had
   opened it. "As" covers both ways of getting here — the look placed it, or
   the person picked it. */
export function paperHandedWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 return handed&&handed.kind===kind&&handed.files.length?"OPENED AS "+paperNamed(kind)+". Your photos are read straight away.":"";
}

/* Said by a scanner that REFUSES photos the door sent it, after its own
   refusal. A scanner that turns a page away tells the person which button
   reads it — and for a Down Sheet that button is the door, which is what sent
   the page here: the same photo gets the same answer, round and round. This
   names the way past the look instead. */
export function paperSentWrongWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 if(!handed||handed.kind!==kind||!handed.files.length)return "";
 return PAPER_DOOR+" sent "+(handed.files.length===1?"this":"these")+" here. If it was wrong, scan "+(handed.files.length===1?"it":"them")+" there again and press \""+paperNotThisWords(kind)+"\".";
}

/* Said when SCAN SHEET held pages of the same batch back. The first look is
   a guess about each page, and this is the only place the person reading the
   result is told the batch they photographed is not all here. */
export function paperHeldBackWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 if(!handed||handed.kind!==kind||!handed.files.length||handed.leftOut<=0)return "";
 const one=handed.leftOut===1;
 return (one?"1 PHOTO WAS":handed.leftOut+" PHOTOS WERE")+" LEFT OUT because "+(one?"it":"they")+" read as a different sheet. If "+(one?"it belongs":"any of them belong")+" to this one, press CHANGE PHOTOS and add "+(one?"it":"them")+" before you approve anything.";
}
