/* The shared nav. The list it draws lives in tracker-pages.ts;

   Every page used to carry its own copy of this nav, and the copies drifted:
   the Facility Map called itself FLEET TRACKER in its own nav while every
   other page called it FACILITY MAP. Five copies also meant adding a page was
   five edits, each one a chance to get the order or the label wrong on one
   screen and not the others.

   The look stays per page on purpose. Each header styles `nav a` in its own
   stylesheet, so this component owns the LIST and the pages own the LOOK. A
   page that wants the shared list in a different shell passes a className. */

import {TRACKER_PAGES} from "./tracker-pages";
import {useAppMode} from "./welcome-gate";
import {hiddenInLite} from "./lite-mode";

export default function TrackerNav({active,className}:{active:string;className?:string}){
 /* One filter in one file, which is most of why hiding a page in Lite is
    cheap: every header in the app draws from this list, and the comment in
    tracker-pages.ts records what the five drifting copies used to cost. */
 const mode=useAppMode();
 const pages=TRACKER_PAGES.filter(page=>!(page.href==="/lists"&&hiddenInLite(mode,"campaignsPage")));
 return <nav className={className} aria-label="Tracker pages">
  {pages.map(page=>{
   const current=page.href===active;
   return <a key={page.href} className={current?"active":undefined} href={page.href} aria-current={current?"page":undefined}>{page.label}</a>;
  })}
 </nav>;
}
