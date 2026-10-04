/* Finding a defect by typing it.

   THE PROBLEM THIS SOLVES IS NOT TYPING, IT IS THE CATEGORY GATE. The form asks
   for a category first and only then offers issues, so a mechanic must know that
   a wiper motor lives under Bus Accessories before he can log one. That is ~500
   options behind a 22-way guess, and the guess is the slow part. Search across
   every category at once and the guess disappears: type "wiper motor", pick it,
   and the category fills itself in.

   WHY NOT A SUBSTRING MATCH. This catalog is full of near-identical wordings —
   "Front door will not open" against "Rear door will not open", "Ramp will not
   deploy" against "Ramp will not stow", six kinds of "Stop request INOP". A
   plain `includes()` returns all of them in storage order and makes the mechanic
   read every one. Curtis said it in his own words: "since there's so many
   defects that are similarly spelled, you know this has to be a smart function."

   So the rules below are about TELLING NEAR-IDENTICAL THINGS APART, in this
   order of importance:

     1. Every typed word must appear somewhere. Three words that each match a
        different part of one option beat one word matching it twice.
     2. Word STARTS beat mid-word hits. "mot" finds "motor", not "remote".
     3. Earlier in the text beats later, so the thing you named first wins.
     4. The group is searched with the issue, so "door rear" works even though
        no single option contains both words in that order.

   WHAT IT DELIBERATELY DOES NOT DO is fuzzy or edit-distance matching. On 500
   strings this similar, fuzzy matching produces a confident wrong answer, and a
   confident wrong answer on a defect log is worse than no answer: it is a repair
   filed against the wrong part. A mechanic who mistypes gets an empty list and
   tries again, which costs him two seconds and costs the record nothing.

   Nothing here invents an option. The search is a way to REACH one of the
   catalog's own strings; it never spells a new one. The stored identity is
   still "Group - Item" exactly as REPAIR_OPTIONS holds it. */

import {REPAIR_OPTIONS,REPAIR_OPTION_GROUPS,repairCategoryLabel,repairGroupDisplayLabel,repairIssueDisplayLabel} from "./repair-catalog.ts";

export type CatalogOption={
 /* What gets stored, unchanged: "Group - Item" in a grouped category, or the
    bare issue in a flat one. The picker's old <option value> exactly. */
 value:string;
 category:string;
 /* "" in a flat category. */
 group:string;
 /* What the mechanic reads: the issue on its own line, the group and category
    underneath it. Near-identical issues are told apart by that second line. */
 label:string;
 groupLabel:string;
 categoryLabel:string;
 /* Everything above, lowercased and joined, which is what is actually matched.
    Built once at module load rather than per keystroke. */
 haystack:string;
};

/* One flat list of every option in every category, built once. The catalog is a
   constant, so this never needs rebuilding — and a mechanic on a phone with the
   garage wifi down is searching an array already in memory. */
function buildIndex():CatalogOption[]{
 const rows:CatalogOption[]=[];
 for(const category of Object.keys(REPAIR_OPTIONS)){
  const groups=REPAIR_OPTION_GROUPS[category];
  const categoryLabel=repairCategoryLabel(category);
  if(groups){
   for(const [group,items] of Object.entries(groups)){
    const groupLabel=repairGroupDisplayLabel(group);
    for(const issue of items)rows.push({
     value:group+" - "+issue,category,group,
     label:repairIssueDisplayLabel(issue,group),groupLabel,categoryLabel,
     haystack:(issue+" "+group+" "+category).toLowerCase(),
    });
   }
  }else{
   for(const issue of REPAIR_OPTIONS[category])rows.push({
    value:issue,category,group:"",
    label:repairIssueDisplayLabel(issue),groupLabel:"",categoryLabel,
    haystack:(issue+" "+category).toLowerCase(),
   });
  }
 }
 return rows;
}

export const CATALOG_OPTIONS:CatalogOption[]=buildIndex();

/* Categories are their own small search — 22 rows, same rules. */
export type CategoryOption={value:string;label:string;haystack:string};
export const CATEGORY_OPTIONS:CategoryOption[]=Object.keys(REPAIR_OPTIONS).map(category=>({
 value:category,label:repairCategoryLabel(category),haystack:category.toLowerCase(),
}));

/* Punctuation is a separator, not a character to match: the catalog is full of
   "/" and "-" and a mechanic types neither. "reservoir leaking" has to find
   "Washer reservoir / leaking". */
export function searchTerms(query:string):string[]{
 return query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/* Rule 2 and 3 in one number, per term. A word start scores 4, a mid-word hit
   1, and the position penalty is small enough that it only ever breaks ties
   between hits of the same kind — it must never let a mid-word hit outrank a
   word start, however early it falls. */
function scoreTerm(haystack:string,term:string):number{
 let index=haystack.indexOf(term);
 if(index<0)return 0;
 let best=0;
 while(index>=0){
  const wordStart=index===0||!/[a-z0-9]/.test(haystack[index-1]);
  const score=(wordStart?4:1)-Math.min(index,60)/100;
  if(score>best)best=score;
  /* A word start this far in still beats anything mid-word, so stop looking. */
  if(wordStart&&index<8)break;
  index=haystack.indexOf(term,index+1);
 }
 return best;
}

export function scoreOption(haystack:string,terms:string[]):number{
 let total=0;
 for(const term of terms){
  const score=scoreTerm(haystack,term);
  /* Rule 1: every typed word must appear. One miss and the option is out —
     which is what makes a second word narrow the list instead of widening it. */
  if(!score)return 0;
  total+=score;
 }
 return total;
}

/* An empty query is not "no results", it is "show me everything" — that is the
   whole point of the field opening on a tap. `limit` keeps the list from being
   500 rows long on a phone; the ranking makes the cut meaningful. */
export function searchCatalog(query:string,rows:CatalogOption[]=CATALOG_OPTIONS,limit=40):CatalogOption[]{
 const terms=searchTerms(query);
 if(!terms.length)return rows.slice(0,limit);
 const scored:{row:CatalogOption;score:number;order:number}[]=[];
 rows.forEach((row,order)=>{
  const score=scoreOption(row.haystack,terms);
  if(score)scored.push({row,score,order});
 });
 /* Catalog order breaks every tie, so the same query always returns the same
    list in the same order. A picker that reshuffles is a picker nobody trusts. */
 scored.sort((a,b)=>b.score-a.score||a.order-b.order);
 return scored.slice(0,limit).map(entry=>entry.row);
}

export function searchCategories(query:string,rows:CategoryOption[]=CATEGORY_OPTIONS):CategoryOption[]{
 const terms=searchTerms(query);
 if(!terms.length)return rows;
 const scored:{row:CategoryOption;score:number;order:number}[]=[];
 rows.forEach((row,order)=>{
  const score=scoreOption(row.haystack,terms);
  if(score)scored.push({row,score,order});
 });
 scored.sort((a,b)=>b.score-a.score||a.order-b.order);
 return scored.map(entry=>entry.row);
}

/* WITHIN A CATEGORY FIRST, BUT NEVER ONLY. Once a category is chosen its own
   options lead the list, because that is what the mechanic said he was doing.
   The rest of the catalog follows rather than disappearing: a bus is not a
   filing cabinet, and somebody who chose Bus Controls and then typed "wiper
   motor" wants the wiper motor, not an empty list telling him he is in the
   wrong drawer. Picking one of those carries its category with it. */
export function searchCatalogForCategory(query:string,category:string,limit=40):{inCategory:CatalogOption[];elsewhere:CatalogOption[]}{
 if(!category)return {inCategory:searchCatalog(query,CATALOG_OPTIONS,limit),elsewhere:[]};
 const mine=CATALOG_OPTIONS.filter(row=>row.category===category);
 const others=CATALOG_OPTIONS.filter(row=>row.category!==category);
 const inCategory=searchCatalog(query,mine,limit);
 /* Only worth showing when something was actually typed — an untouched field
    opening on the whole catalog under the chosen category would bury it. */
 const elsewhere=searchTerms(query).length?searchCatalog(query,others,Math.max(0,limit-inCategory.length)):[];
 return {inCategory,elsewhere};
}
