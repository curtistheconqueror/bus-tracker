/* The five pages, written down once. Data only - no JSX - so the test runner
   and any page can import it. The rendering lives in tracker-nav.tsx.

   Five copies of this list drifted: the Facility Map called itself FLEET
   TRACKER in its own nav while every other page called it FACILITY MAP, and
   adding a page was five edits, each a chance to get the order or a label
   wrong on one screen and not the others. */

export type TrackerPage={href:string;label:string};

export const TRACKER_PAGES:readonly TrackerPage[]=[
 {href:"/",label:"FACILITY MAP"},
 {href:"/down-sheet",label:"DOWN SHEET"},
 {href:"/defect-log",label:"DEFECT LOG"},
 {href:"/fixed-repairs",label:"FIXED REPAIRS"},
 {href:"/lists",label:"FLEET CAMPAIGNS"},
];

/* The same list minus the page you are on, with whatever counts that page can
   supply. The Facility Map's desktop menu is "the other surfaces, behind one
   button", and the reason to glance at it is to see what is waiting elsewhere. */
export function otherPages(counts:Partial<Record<string,number>>,current="/"){
 return TRACKER_PAGES.filter(page=>page.href!==current)
  .map(page=>({href:page.href,label:page.label,count:counts[page.href]}));
}
