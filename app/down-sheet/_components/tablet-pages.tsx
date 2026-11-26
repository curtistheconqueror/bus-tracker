"use client";

import {useEffect,useId,useRef,useState} from "react";
import {hiddenInLite} from "@/src/lib/settings/lite-mode";
import type {AppMode} from "@/src/lib/settings/app-mode";
import {TRACKER_PAGES} from "@/src/lib/settings/tracker-pages";

const TABLET_VIEW="(min-width:761px) and (max-width:1400px) and (min-height:600px) and (any-pointer:coarse)";

export default function TabletPages({mode}:{mode:AppMode}){
 const [open,setOpen]=useState(false);
 const id=useId();
 const root=useRef<HTMLDivElement>(null);
 const button=useRef<HTMLButtonElement>(null);

 useEffect(()=>{
  if(!open)return;
  const view=window.matchMedia(TABLET_VIEW);
  const onViewChange=()=>{if(!view.matches)setOpen(false)};
  const onPointerDown=(event:PointerEvent)=>{
   if(!root.current?.contains(event.target as Node))setOpen(false);
  };
  view.addEventListener("change",onViewChange);
  document.addEventListener("pointerdown",onPointerDown);
  return ()=>{
   view.removeEventListener("change",onViewChange);
   document.removeEventListener("pointerdown",onPointerDown);
  };
 },[open]);

 return <div className="down-tablet-pages" ref={root}
  onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}
  onKeyDown={event=>{
   if(!open||event.key!=="Escape")return;
   event.preventDefault();
   event.stopPropagation();
   setOpen(false);
   button.current?.focus();
  }}>
  <button className="down-header-button down-tablet-pages-toggle" type="button" ref={button}
   aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(value=>!value)}>
   <svg className="down-header-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M10 10v10"/></svg>
   <b>PAGES</b><i aria-hidden="true">{open?"▴":"▾"}</i>
  </button>
  {open&&<nav className="down-tablet-pages-panel" id={id} aria-label="Tracker pages">
   {TRACKER_PAGES.filter(page=>page.href!=="/lists"||!hiddenInLite(mode,"campaignsPage")).map(page=>
    <a key={page.href} href={page.href} aria-current={page.href==="/down-sheet"?"page":undefined}>{page.label}</a>)}
  </nav>}
 </div>;
}
