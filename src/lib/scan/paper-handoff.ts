import {paperArrival,paperNamed,type PaperKind} from "./paper-kinds.ts";

/* GETTING THE PHOTOS FROM SCAN PAPER TO THE SCANNER THAT READS THEM.

   Two of the three scanners live on the Defect Log and one on the Down Sheet,
   because each sits on the page whose records it changes. So a photo taken
   through SCAN PAPER on one page sometimes has to be read on the other.

   THE PHOTOS TRAVEL IN MEMORY AND NOWHERE ELSE. They are not written to
   LocalStorage, not put in the address, and not sent anywhere to be fetched
   back: a photograph of a shop sheet carries names and initials, and the only
   copy this app has ever kept of one is the one in the camera roll. Memory
   means the hand-off only survives a change of page that does not reload the
   app, which is why SCAN PAPER moves with the router rather than with a link.

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
 /* How many photos from the same batch SCAN PAPER held back because they
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
   line that says SCAN PAPER opened it, the warning when SCAN PAPER held pages
   back, and whether to start reading by itself — which it does whenever it
   was handed photos, because they only ever arrive whole. */
export type HandedStart={files:File[];lost:string;note:string;warning:string;read:boolean};

export function handedStart(handed:HandedPhotos|null|undefined,kind:PaperKind):HandedStart{
 const files=handedFiles(handed,kind);
 return {files,lost:paperLostWords(handed,kind),note:paperHandedWords(handed,kind),warning:paperHeldBackWords(handed,kind),read:files.length>0};
}

/* Said by the scanner when photos were sent and did not arrive. */
export function paperLostWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 if(!handed||handed.kind!==kind||handed.expected<=handed.files.length)return "";
 return (handed.expected===1?"The photo":"The "+handed.expected+" photos")+" did not come across from the other page. Add "+(handed.expected===1?"it":"them")+" again.";
}

/* Said above a scanner that SCAN PAPER opened, so the person can see what was
   decided for them and by what, and that the read they are watching is not
   waiting for a second press. */
export function paperHandedWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 return handed&&handed.kind===kind&&handed.files.length?"OPENED BY SCAN PAPER AS "+paperNamed(kind)+". The photos taken there are read straight away.":"";
}

/* Said when SCAN PAPER held pages of the same batch back. The first look is
   a guess about each page, and this is the only place the person reading the
   result is told the batch they photographed is not all here. */
export function paperHeldBackWords(handed:HandedPhotos|null|undefined,kind:PaperKind):string{
 if(!handed||handed.kind!==kind||!handed.files.length||handed.leftOut<=0)return "";
 const one=handed.leftOut===1;
 return (one?"1 PHOTO WAS":handed.leftOut+" PHOTOS WERE")+" LEFT OUT because "+(one?"it":"they")+" read as a different sheet. If "+(one?"it belongs":"any of them belong")+" to this one, press CHANGE PHOTOS and add "+(one?"it":"them")+" before you approve anything.";
}
