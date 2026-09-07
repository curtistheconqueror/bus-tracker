/* What the sheet SAYS beats what the scan GUESSED it meant.

   Line 25 of the 09/6 sheet reads "MISFIRE CYL # 5 / MDT SCREEN" against bus
   15508. The scan kept those words — it always does, verbatim — and then filed
   the row as Engine / Stabilizer link. A stabilizer link is a suspension part;
   nothing on that row mentions one. The catalog was not the problem: Misfire is
   an Engine option and MDT Screen is a Tech Services option, both there to be
   picked.

   Two things were wrong, and they compound:

   1. The pick contradicted itself. "Stabilizer link" is not in the Engine list
      at all, so the answer named a category and a repair that cannot go
      together. An answer that inconsistent is not evidence of anything.

   2. Nothing checked the pick against the words. The reason is the one part of
      the row a person actually wrote, and it was the only field that had it
      right.

   So the words get the final say. The catalog is turned into a set of phrases
   to look for, and when the shop's own wording names a repair, that is the
   repair — unless the scan's own pick is also named there, in which case the
   scan was reading the same words and is left alone.

   Kept deliberately timid, for the same reason the spelling corrector is: a
   confident wrong match is worse than none. Every needle below was read off the
   generated list before this shipped.
   - Under five characters, nothing is matched. Too many collisions.
   - "Other engine repair" and friends are skipped: they are the catalog's own
     "none of the above" and carry no meaning to match on.
   - Six generic Bodywork words are skipped by name — broken, loose, missing,
     damaged, paint, trace. "LOOSE MIRROR" is not a Bodywork/Loose row, and a
     word that describes a condition rather than a part matches everything.
   - Names with brackets are skipped: their tails come out as "curbside)" and
     "roadside)", which are not words anybody writes.
   - Four phrases name two catalog entries each (overheating, coolant leak,
     valve adjustment, screen black). Where the scan's own category is one of
     them it wins the tie; otherwise the first is taken, and both readings of
     those four are the same repair by a different route. */

import {migrateRepairIdentity,REPAIR_OPTIONS} from "../repair-catalog.ts";

export type CatalogPick={category:string;repair:string};

const GENERIC_NEEDLES=new Set(["broken","loose","missing","damaged","paint","trace"]);

/* Both sides of the comparison go through this, so "u-joints" on the sheet and
   "U-Joints" in the catalog meet as "u joints", and "A/C BELT" meets "a c
   belt". Punctuation is where handwriting and a catalog disagree most and mean
   it least. */
function flatten(value:unknown){return String(value??"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}

/* The distinctive tail of a catalog name. "Farebox - No power" is written on a
   sheet as "no power"; nobody writes the category prefix. */
function needleFor(repair:string){
 if(/[()]/.test(repair))return "";
 const tail=repair.includes(" - ")?repair.slice(repair.lastIndexOf(" - ")+3):repair;
 const needle=flatten(tail);
 if(needle.length<5||/^other\b/.test(needle)||GENERIC_NEEDLES.has(needle))return "";
 return needle;
}

type Needle=CatalogPick&{needle:string};

/* Words the shop still writes that the catalog has since renamed.

   The sheet says MDT SCREEN. The catalog renamed that to IBS Screen, so the
   model is handed a catalog with no "MDT" anywhere in it and cannot match the
   phrase however clearly it is written — the crew's word for the thing simply
   is not in the list any more. The app already knows the translation and has
   for years, in the same rename table that reads a stored record back, so it
   is asked rather than copied: one place decides what MDT Screen means. */
const SHOP_ALIASES:[string,string,string][]=[["mdt screen","Tech Services","MDT Screen"]];

const NEEDLES:Needle[]=[
 ...Object.entries(REPAIR_OPTIONS).flatMap(([category,repairs])=>
  repairs.map(repair=>({needle:needleFor(repair),category,repair})).filter(item=>item.needle)),
 ...SHOP_ALIASES.map(([needle,category,written])=>{
  const current=migrateRepairIdentity(category,written);
  return {needle,category:current.category,repair:current.issue};
 }).filter(item=>REPAIR_OPTIONS[item.category]?.includes(item.repair)),
];

/* Whole phrase, not a substring: "no crank" must not fire on "no cranking
   noise", and "misfire" must not fire inside a longer invented word. */
function positionOf(needle:string,written:string){
 const at=new RegExp("(?:^| )"+needle.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"(?: |$)").exec(written);
 return at?at.index:-1;
}

/* Is the scan's own pick one the words support? If so it read the same row a
   person did and nothing here should touch it. */
export function repairNamedInWords(repair:string,reason:string){
 const needle=needleFor(String(repair||""));
 return Boolean(needle)&&positionOf(needle,flatten(reason))>=0;
}

/* The repair the written words name, or null when they name none.

   The EARLIEST phrase wins. A sheet reads "MISFIRE CYL # 5 / MDT SCREEN" and
   the shop writes the fault that matters first; the slash is the crew listing a
   second thing, not correcting the first. Longer beats shorter at the same
   position, so a more specific name is preferred over one contained in it. */
export function catalogPickFromWords(reason:string,preferredCategory=""):CatalogPick|null{
 const written=flatten(reason);
 if(!written)return null;
 let best:{at:number;item:Needle}|null=null;
 for(const item of NEEDLES){
  const at=positionOf(item.needle,written);
  if(at<0)continue;
  if(!best||at<best.at||(at===best.at&&item.needle.length>best.item.needle.length)){best={at,item};continue}
  /* Same words, two catalog homes: the scan's own category breaks the tie. */
  if(at===best.at&&item.needle===best.item.needle&&item.category===preferredCategory)best={at,item};
 }
 return best?{category:best.item.category,repair:best.item.repair}:null;
}

export type ReconciledRepair=CatalogPick&{corrected:boolean};

/* The category and repair a row should carry, given everything about it.

   Order matters. The words come first because they are the only part a person
   wrote. Only if they name nothing does the scan's own pick stand — and then it
   still has to be internally consistent, because a repair that belongs to no
   category at all cannot be shown or filed as one. */
export function reconcileScannedRepair(category:string,repair:string,reason:string):ReconciledRepair{
 const named=String(category||"").trim(),chosen=String(repair||"").trim();
 const list=REPAIR_OPTIONS[named];
 const consistent=Boolean(list&&list.includes(chosen));
 if(!repairNamedInWords(chosen,reason)){
  const fromWords=catalogPickFromWords(reason,named);
  if(fromWords&&(fromWords.category!==named||fromWords.repair!==chosen))return {...fromWords,corrected:true};
 }
 if(consistent||!chosen)return {category:named,repair:chosen,corrected:false};
 /* The pick contradicted itself and the words settled nothing. If some other
    category owns this repair, the category was the wrong half and the repair
    moves to where it lives. If no category owns it, the scan returned a repair
    this app does not have, and inventing a specific one in its place is how a
    review screen ends up showing something the sheet never said. Miscellaneous
    says exactly as much as is actually known, and the written reason — which is
    never touched here — still carries the words. */
 const owner=Object.entries(REPAIR_OPTIONS).find(([,repairs])=>repairs.includes(chosen));
 if(owner)return {category:owner[0],repair:chosen,corrected:true};
 return {category:"Miscellaneous",repair:"Driver-reported defect",corrected:true};
}
