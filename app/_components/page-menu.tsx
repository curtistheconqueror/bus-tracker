"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";

/* The four other surfaces, behind one button.

   They used to sit in the command bar as four separate buttons, and with the
   locator, the quick filters, the badge view, refresh, settings and the
   operator beside them the bar wrapped onto a second row at every width from an
   iPad up to a 1440px desktop — and onto four rows, 208px tall, on an iPad held
   upright. A bar you have to scroll is a bar that has stopped being a bar.

   One trigger, the same shape as QUICK FILTERS next to it, so the pattern is
   learned once. The counts come along, because the reason to glance at this bar
   is to see whether anything is waiting on the other pages. */

export type PageLink={href:string;label:string;count?:number};

export default function PageMenu({pages,placement="above"}:{pages:PageLink[];placement?:"above"|"below"}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:8,top:0,bottom:0});
 const trigger=useRef<HTMLButtonElement>(null),popover=useRef<HTMLDivElement>(null);
 const waiting=pages.reduce((total,page)=>total+(page.count||0),0);
 const place=()=>{
  const rect=trigger.current?.getBoundingClientRect();
  if(!rect)return;
  setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-252)),top:rect.bottom+7,bottom:window.innerHeight-rect.top+7});
 };
 useEffect(()=>{
  if(!open)return;
  place();
  const close=(event:PointerEvent)=>{const target=event.target as Node;if(!trigger.current?.contains(target)&&!popover.current?.contains(target))setOpen(false)};
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)};
  const reposition=()=>place();
  window.addEventListener("pointerdown",close);
  window.addEventListener("keydown",escape);
  window.addEventListener("resize",reposition);
  return()=>{window.removeEventListener("pointerdown",close);window.removeEventListener("keydown",escape);window.removeEventListener("resize",reposition)};
 },[open]);
 return <span className="page-menu-control">
  <button ref={trigger} type="button" className="page-menu-trigger" aria-expanded={open} aria-haspopup="menu"
   aria-label={"Open another page"+(waiting?", "+waiting+" items waiting":"")}
   onClick={()=>setOpen(value=>!value)}>
   <span>PAGES</span>{waiting>0&&<b className="page-menu-waiting">{waiting}</b>}<b aria-hidden="true">{open?"▴":"▾"}</b>
  </button>
  {open&&typeof document!=="undefined"&&createPortal(
   <div ref={popover} className={"page-menu-popover "+placement}
    style={placement==="above"?{left:position.left,bottom:position.bottom}:{left:position.left,top:position.top}}
    role="menu" aria-label="Other pages">
    <header><b>GO TO</b></header>
    <div>{pages.map(page=><button type="button" role="menuitem" key={page.href}
     onClick={()=>{setOpen(false);window.location.assign(page.href)}}>
     <span>{page.label}</span>{page.count!==undefined&&<b>{page.count}</b>}
    </button>)}</div>
   </div>,document.body)}
 </span>;
}
