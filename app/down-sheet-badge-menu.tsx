"use client";

import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {DOWN_SHEET_BADGE_VIEWS,type DownSheetBadgeView} from "./down-sheet-badge-view";

export default function DownSheetBadgeMenu({view,counts,enabled,onSelect}:{view:DownSheetBadgeView;counts:Record<DownSheetBadgeView,number>;enabled:boolean;onSelect:(view:DownSheetBadgeView)=>void}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:8,bottom:0});
 const trigger=useRef<HTMLButtonElement>(null),popover=useRef<HTMLDivElement>(null),active=DOWN_SHEET_BADGE_VIEWS.find(item=>item.key===view)!;
 const place=()=>{const rect=trigger.current?.getBoundingClientRect();if(!rect)return;setPosition({left:Math.max(8,Math.min(rect.left,window.innerWidth-232)),bottom:window.innerHeight-rect.top+7})};
 useEffect(()=>{if(!open)return;place();const close=(event:PointerEvent)=>{const target=event.target as Node;if(!trigger.current?.contains(target)&&!popover.current?.contains(target))setOpen(false)},escape=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false)},reposition=()=>place();window.addEventListener("pointerdown",close);window.addEventListener("keydown",escape);window.addEventListener("resize",reposition);return()=>{window.removeEventListener("pointerdown",close);window.removeEventListener("keydown",escape);window.removeEventListener("resize",reposition)}},[open]);
 return <span className="ds-badge-view-control"><button ref={trigger} type="button" className={"ds-badge-view-trigger"+(enabled?" active":"")} aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(value=>!value)}><span>{enabled?"DS: "+active.shortLabel:"DS: Hidden"}</span><b aria-hidden="true">{open?"▴":"▾"}</b></button>{open&&typeof document!=="undefined"&&createPortal(<div ref={popover} className="ds-badge-view-popover" style={{left:position.left,bottom:position.bottom}} role="menu" aria-label="Down Sheet badge view"><header><b>DS BADGES</b><span>DISPLAY ONLY</span></header><div>{DOWN_SHEET_BADGE_VIEWS.map(item=><button type="button" role="menuitemradio" aria-checked={enabled&&view===item.key} className={enabled&&view===item.key?"active":""} onClick={()=>{onSelect(item.key);setOpen(false)}} key={item.key}><span>{item.label}</span><b>{counts[item.key]}</b></button>)}</div><p>Badge view never changes Down Sheet membership.</p></div>,document.body)}</span>
}
