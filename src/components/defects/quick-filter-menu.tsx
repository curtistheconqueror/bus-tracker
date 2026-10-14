"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {QUICK_FILTERS,type QuickFilterKey} from "@/src/lib/defects/quick-filters";

/* ONE MENU, TWO SETS OF FILTERS.

   The Defect Log's filters ask about a bus's defects; the Down Sheet's ask
   about the entry a bus is on. The lists have nothing in common and the CONTROL
   has everything in common — the popover placement, the outside-press close,
   the escape key, the reposition on resize. A second copy of this file would
   have been a second copy of all four, and this repo has already paid for
   five copies of one table.

   So the items are a prop, defaulting to the Defect Log's so neither of its two
   call sites has to say anything. */
export type QuickFilterMenuItem<K extends string>={key:K;label:string;shortLabel:string};

/* An OPTIONAL control beside one row's count, and optional is the whole point.

   Three screens draw this menu — the Defect Log, the Down Sheet and the
   Facility Map — and exactly one of them has a row whose count means nothing
   until you say over what span. `itemAside` returns nothing for every other row
   and every other screen, so those two render byte-identical markup to before.

   It sits OUTSIDE the row's button rather than inside it: a control nested in a
   button swallows its own clicks, and `role="menuitemcheckbox"` describes one
   thing to press, not a press and a picker. */

/* WHETHER ANYBODY IS LOOKING, for the same one screen and the same one reason.

   A count quoted over a span goes stale on its own, with nothing on the page
   changing — the shift rolls over, the 24 hours move. Keeping such a number
   live costs a render every half minute, and this menu's own screen already
   says in its clock effect that an idle board must not pay that for nothing.

   The resolution is that the count is only ON SCREEN while the popover is, so
   the screen that draws it can tick while it is open and stop when it closes.
   That is a fact only this component knows. `open` is its own state and the
   parent cannot read it, so it is reported out — optional, unused by the other
   two screens, and a no-op for them. */
export default function QuickFilterMenu<K extends string=QuickFilterKey>({active,counts,onSelect,placement="below",items,title="QUICK FILTERS",menuLabel="Quick bus filters",itemAside,onOpenChange}:{active:K|null;counts:Record<K,number>;onSelect:(key:K|null)=>void;placement?:"above"|"below";items?:QuickFilterMenuItem<K>[];title?:string;menuLabel?:string;itemAside?:(key:K)=>React.ReactNode;onOpenChange?:(open:boolean)=>void}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:8,top:0,bottom:0});
 const trigger=useRef<HTMLButtonElement>(null),popover=useRef<HTMLDivElement>(null);
 const options=items||(QUICK_FILTERS as unknown as QuickFilterMenuItem<K>[]);
 const activeLabel=options.find(item=>item.key===active)?.shortLabel;
 /* REPORTED FROM `open` ITSELF rather than from the five places that set it —
    the trigger, the outside press, Escape, CLEAR and picking a row. Four of
    those are closes, and a callback threaded through each by hand is a callback
    one of them eventually forgets; derived from the state, no path can miss it.

    Firing once on mount with `false` is harmless: the parent's flag is already
    false and React bails on a set that changes nothing. `onOpenChange` is
    deliberately out of the dependencies — call sites pass an inline arrow, so
    listing it would re-run this on every parent render to report a value that
    has not moved. */
 useEffect(()=>{onOpenChange?.(open)},[open]);// eslint-disable-line react-hooks/exhaustive-deps
 const place=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-252)),top:rect.bottom+7,bottom:window.innerHeight-rect.top+7})};
 useEffect(()=>{if(!open)return;place();const close=(event:PointerEvent)=>{const target=event.target as Node;if(!trigger.current?.contains(target)&&!popover.current?.contains(target))setOpen(false)},escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)},reposition=()=>place();window.addEventListener("pointerdown",close);window.addEventListener("keydown",escape);window.addEventListener("resize",reposition);return()=>{window.removeEventListener("pointerdown",close);window.removeEventListener("keydown",escape);window.removeEventListener("resize",reposition)}},[open]);
 return <span className="quick-filter-control"><button ref={trigger} type="button" className={"quick-filter-trigger"+(active?" active":"")} aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(value=>!value)}><span>{activeLabel?"FILTER: "+activeLabel:title}</span><b aria-hidden="true">{open?"▴":"▾"}</b></button>{open&&typeof document!=="undefined"&&createPortal(<div ref={popover} className={"quick-filter-popover "+placement} style={placement==="above"?{left:position.left,bottom:position.bottom}:{left:position.left,top:position.top}} role="menu" aria-label={menuLabel}><header><b>{title}</b>{active&&<button type="button" onClick={()=>{onSelect(null);setOpen(false)}}>CLEAR</button>}</header><div>{options.map(item=>{
 const aside=itemAside?.(item.key);
 const row=<button key={item.key} type="button" role="menuitemcheckbox" aria-checked={active===item.key} className={active===item.key?"active":""} onClick={()=>{onSelect(active===item.key?null:item.key);setOpen(false)}}><span>{item.label}</span><b>{counts[item.key]}</b></button>;
 /* NO WRAPPER WHERE THERE IS NO ASIDE. The stylesheet reaches these rows with
    `.quick-filter-popover>div>button`, a DIRECT-child selector, so wrapping
    them unconditionally would have stripped every row on all three screens of
    its border, height and padding while changing nothing anybody asked for.
    The wrapped shape is given its own place in that same selector list. */
 return aside?<div className="quick-filter-row" key={item.key}>{row}{aside}</div>:row;
})}</div></div>,document.body)}</span>
}
