"use client";

/* One page list and one compact mobile shell across every surface. The dock
   portals outside headers: their stacking contexts must not trap its menu. */
import {useEffect,useId,useRef,useState,useSyncExternalStore} from "react";
import {createPortal} from "react-dom";
import {TRACKER_PAGES} from "@/src/lib/settings/tracker-pages";
import {useAppMode} from "./welcome-gate";
import {hiddenInLite} from "@/src/lib/settings/lite-mode";
import "./tracker-nav.css";

const subscribe=()=>()=>{};
const clientSnapshot=()=>true;
const serverSnapshot=()=>false;
const PRIMARY=["/","/down-sheet","/defect-log"];
const SHORT_LABELS=["Map","Down Sheet","Defects"];
const ICONS=["\u25a6","\u2637","\u25a4"];

const OPERATOR_HREF="/?operator=1";

export default function TrackerNav({active,className}:{active:string;className?:string}){
 const mode=useAppMode();
 const pages=TRACKER_PAGES.filter(page=>!(page.href==="/lists"&&hiddenInLite(mode,"campaignsPage")));
 const [moreOpen,setMoreOpen]=useState(false);
 const moreButton=useRef<HTMLButtonElement>(null);
 const moreMenu=useRef<HTMLDivElement>(null);
 const menuId=useId();
 const mounted=useSyncExternalStore(subscribe,clientSnapshot,serverSnapshot);
 const morePages=pages.filter(page=>!PRIMARY.includes(page.href));
 const moreCurrent=morePages.some(page=>page.href===active);
 useEffect(()=>{
  if(!moreOpen)return;
  moreMenu.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"],a')?.focus();
  const onKey=(event:KeyboardEvent)=>{
   if(event.key==="Escape"){
    event.preventDefault();setMoreOpen(false);moreButton.current?.focus();
   }
  };
  document.addEventListener("keydown",onKey);
  return ()=>document.removeEventListener("keydown",onKey);
 },[moreOpen]);
 const closeMore=()=>{setMoreOpen(false);moreButton.current?.focus()};
 return <>
  <nav className={className} aria-label="Tracker pages" data-tracker-nav>
   <label className="tracker-page-select"><span>Page</span><select aria-label="Choose page" value={active} onChange={event=>{if(event.target.value!==active)window.location.assign(event.target.value)}}>
    {pages.map(page=><option key={page.href} value={page.href}>{page.label}</option>)}
   </select></label>
   <div className="tracker-desktop-links">{pages.map(page=>{
    const current=page.href===active;
    return <a key={page.href} className={current?"active":undefined} href={page.href} aria-current={current?"page":undefined}>{page.label}</a>;
   })}</div>
  </nav>
  {mounted&&createPortal(<div className="tracker-mobile-shell">
   {moreOpen&&<><button className="tracker-more-scrim" type="button" aria-label="Close more pages" tabIndex={-1} onClick={closeMore}/><div className="tracker-more-menu" id={menuId} ref={moreMenu} role="navigation" aria-label="More tracker pages" onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget)&&event.relatedTarget!==moreButton.current)setMoreOpen(false)}}>
    <div className="tracker-more-heading"><strong>More pages</strong><button type="button" onClick={closeMore} aria-label="Close more pages">Close</button></div>
    {morePages.map(page=><a key={page.href} href={page.href} aria-current={page.href===active?"page":undefined} onClick={()=>setMoreOpen(false)}>{page.label}</a>)}
    {/* THE AI OPERATOR, from every page on a phone (release 210). Wider than
        800px this menu is not drawn and the pages are tiles in the header; a
        ninth tile there is a change to every page's header, not made here, so
        on an iPad or the shop computer the Operator is the map's own button.
        It runs on the
        Facility Map, whose state it acts on, so this is a link there that
        opens it - and the row says so, because Curtis once found himself on
        the map "with no warning". It left the Defect Log's ADVANCED ACTIONS,
        where it read as out of place; the map keeps its own button. */}
    <a className="tracker-more-tool" href={OPERATOR_HREF} onClick={()=>setMoreOpen(false)}><span aria-hidden="true">✦</span> AI OPERATOR<small>opens on the map</small></a>
   </div></>}
   <div className="tracker-bottom-nav" role="navigation" aria-label="Main pages">
    {PRIMARY.map((href,index)=><a key={href} href={href} aria-current={href===active?"page":undefined}><span aria-hidden="true">{ICONS[index]}</span>{SHORT_LABELS[index]}</a>)}
    <button type="button" ref={moreButton} onClick={()=>setMoreOpen(value=>!value)} aria-expanded={moreOpen} aria-controls={moreOpen?menuId:undefined} className={moreCurrent?"tracker-more-current":undefined}><span aria-hidden="true">•••</span>More{moreCurrent&&<span className="tracker-nav-sr-only">, current page group</span>}</button>
   </div>
  </div>,document.body)}
 </>;
}
