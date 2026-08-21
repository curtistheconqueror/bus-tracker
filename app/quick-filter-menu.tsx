"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {QUICK_FILTERS,type QuickFilterKey} from "./quick-filters";

export default function QuickFilterMenu({active,counts,onSelect,placement="below"}:{active:QuickFilterKey|null;counts:Record<QuickFilterKey,number>;onSelect:(key:QuickFilterKey|null)=>void;placement?:"above"|"below"}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:8,top:0,bottom:0});
 const trigger=useRef<HTMLButtonElement>(null),popover=useRef<HTMLDivElement>(null);
 const activeLabel=QUICK_FILTERS.find(item=>item.key===active)?.shortLabel;
 const place=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-252)),top:rect.bottom+7,bottom:window.innerHeight-rect.top+7})};
 useEffect(()=>{if(!open)return;place();const close=(event:PointerEvent)=>{const target=event.target as Node;if(!trigger.current?.contains(target)&&!popover.current?.contains(target))setOpen(false)},escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)},reposition=()=>place();window.addEventListener("pointerdown",close);window.addEventListener("keydown",escape);window.addEventListener("resize",reposition);return()=>{window.removeEventListener("pointerdown",close);window.removeEventListener("keydown",escape);window.removeEventListener("resize",reposition)}},[open]);
 return <span className="quick-filter-control"><button ref={trigger} type="button" className={"quick-filter-trigger"+(active?" active":"")} aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(value=>!value)}><span>{activeLabel?"FILTER: "+activeLabel:"QUICK FILTERS"}</span><b aria-hidden="true">{open?"▴":"▾"}</b></button>{open&&typeof document!=="undefined"&&createPortal(<div ref={popover} className={"quick-filter-popover "+placement} style={placement==="above"?{left:position.left,bottom:position.bottom}:{left:position.left,top:position.top}} role="menu" aria-label="Quick bus filters"><header><b>QUICK FILTERS</b>{active&&<button type="button" onClick={()=>{onSelect(null);setOpen(false)}}>CLEAR</button>}</header><div>{QUICK_FILTERS.map(item=><button type="button" role="menuitemcheckbox" aria-checked={active===item.key} className={active===item.key?"active":""} onClick={()=>{onSelect(active===item.key?null:item.key);setOpen(false)}} key={item.key}><span>{item.label}</span><b>{counts[item.key]}</b></button>)}</div></div>,document.body)}</span>
}
