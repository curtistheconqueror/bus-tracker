"use client";

/* ONE FIELD THAT IS BOTH THE TYPING AND THE DROP-DOWN.

   Curtis asked for a search field beside each picker and said himself where it
   would go wrong: "just try to make it look clean". Two controls per picker —
   one to type in, one to drop down — is four controls where there were two, on
   a form already dense enough that ADVANCED DETAILS had to be folded away.

   So this is one control doing both jobs, which is what he settled on:

     TAP IT       the whole list opens, exactly as the old <select> did
     TYPE IN IT   the same list narrows as you type

   Nothing is lost by tapping and nothing is gained by having to type.

   THE LIST OPENS IN FLOW, not floating over the form. A floating list is the
   obvious way to build this and it is the wrong way here: on a phone the
   keyboard comes up over the bottom half of the screen, and a list positioned
   under the field lands behind it. Pushing the form down instead means the
   browser scrolls the field into view the way it already does for every other
   input, and the results sit above the keyboard because they sit in the page.
   It also keeps the list out of any z-index argument with the modal it lives in.

   The value is always one of the options. There is no free typing: what you type
   is a way to REACH a catalog string, never a way to spell a new one, because a
   defect log whose wording drifts is a defect log nobody can count. */

import {useEffect,useId,useRef,useState} from "react";

export type ComboOption={
 value:string;
 /* The line the mechanic reads. */
 label:string;
 /* The smaller line under it — the group and category. This is what tells
    "Rear door will not close" from "Rear door open / close switch", so it is
    not decoration and options that have one must show it. */
 hint?:string;
 /* Set on options that come from outside the chosen category, so the list can
    say so rather than silently changing the category under the mechanic. */
 foreign?:boolean;
 /* Carried on the option rather than looked up from its value afterwards. Two
    categories can hold the same wording — the value alone does not say which
    one this row came from, and resolving it by value would quietly move the
    mechanic to whichever the catalog happens to list first. */
 category?:string;
};

export default function ComboField({label,value,display,search,onPick,placeholder,emptyText,disabled,footnote,className}:{
 label:string;
 value:string;
 /* What the closed field shows. Passed in rather than looked up here, because
    a record saved under an old wording still has to read back correctly and
    only the caller knows how to spell it. */
 display:string;
 /* The caller ranks, this owns the interaction. Keeping the query inside the
    field means the page never re-renders on a keystroke it does not care about;
    passing the ranking in means the two pickers can rank differently — the
    defect one has to say which matches came from another category, and the
    category one has nothing like that to say. */
 search:(query:string)=>ComboOption[];
 onPick:(value:string,option:ComboOption|null)=>void;
 placeholder?:string;
 emptyText?:string;
 disabled?:boolean;
 footnote?:string;
 className?:string;
}){
 const [open,setOpen]=useState(false);
 const [query,setQuery]=useState("");
 const [active,setActive]=useState(0);
 const inputRef=useRef<HTMLInputElement|null>(null);
 const listRef=useRef<HTMLUListElement|null>(null);
 const boxRef=useRef<HTMLDivElement|null>(null);
 const id=useId();

 /* Recomputed each render rather than memoised: the whole catalog is 338 rows
    of string matching against an array already in memory, which is nothing next
    to the render it is part of, and a stale memo here would show the mechanic a
    list that does not match what he just typed. */
 const options=search(open?query:"");

 /* A tap outside is a dismissal, and on a phone that is the usual way out —
    there is no Escape key on a bus. */
 useEffect(()=>{
  if(!open)return;
  const away=(event:MouseEvent|TouchEvent)=>{
   if(boxRef.current&&!boxRef.current.contains(event.target as Node)){setOpen(false);setQuery("");}
  };
  document.addEventListener("mousedown",away);
  document.addEventListener("touchstart",away);
  return ()=>{document.removeEventListener("mousedown",away);document.removeEventListener("touchstart",away);};
 },[open]);

 /* OPENING SCROLLS THE WHOLE CONTROL INTO VIEW, not just the input. The list is
    in flow, so opening it makes this box suddenly ~300px taller — and the form
    it lives in scrolls, with a sticky SAVE bar across the bottom. Left alone the
    list's last rows end up under that bar. `block:"nearest"` moves the form only
    as far as it has to, and `.log-form` already sets scroll-padding-block with
    92px at the bottom, so the bar is accounted for without this having to know
    how tall it is.

    It matters more with a phone keyboard up, which is the case that cannot be
    measured in this container: the visible half of the screen is smaller than
    anything Chromium reports here, and scrolling the control into view is what
    keeps the results above the keys. One frame late on purpose — the list has to
    exist before its height can be scrolled to. */
 useEffect(()=>{
  if(!open||!boxRef.current)return;
  const frame=requestAnimationFrame(()=>boxRef.current?.scrollIntoView({block:"nearest"}));
  return ()=>cancelAnimationFrame(frame);
 },[open]);

 /* Keyboard walking has to drag the list with it or the highlight walks off the
    bottom and the mechanic is arrowing through rows he cannot see. */
 useEffect(()=>{
  if(!open||!listRef.current)return;
  const row=listRef.current.children[active] as HTMLElement|undefined;
  row?.scrollIntoView({block:"nearest"});
 },[active,open]);

 const pick=(option:ComboOption)=>{
  onPick(option.value,option);
  setOpen(false);
  setQuery("");
  inputRef.current?.blur();
 };

 const keys=(event:React.KeyboardEvent<HTMLInputElement>)=>{
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
   event.preventDefault();
   if(!open){setOpen(true);setActive(0);return;}
   setActive(current=>{
    const next=event.key==="ArrowDown"?current+1:current-1;
    if(!options.length)return 0;
    return (next+options.length)%options.length;
   });
   return;
  }
  if(event.key==="Enter"){
   /* Only swallow Enter when it is doing something. Otherwise it belongs to the
      form, and a mechanic who has already chosen should be able to submit. */
   if(open&&options[active]){event.preventDefault();pick(options[active]);}
   return;
  }
  if(event.key==="Escape"&&open){event.preventDefault();setOpen(false);setQuery("");}
 };

 return <label className={className?"combo-field "+className:"combo-field"}>
  {label}
  <div className={open?"combo-box open":"combo-box"} ref={boxRef}>
   <input
    ref={inputRef}
    type="text"
    className="combo-input"
    role="combobox"
    aria-expanded={open}
    aria-controls={id+"-list"}
    aria-autocomplete="list"
    aria-activedescendant={open&&options[active]?id+"-option-"+active:undefined}
    autoComplete="off"
    disabled={disabled}
    /* Closed, the field reads as the answer. Open, it is the question. */
    value={open?query:display}
    placeholder={placeholder||"Type or tap to choose"}
    onFocus={()=>{if(!disabled){setOpen(true);setQuery("");setActive(0);}}}
    onChange={event=>{setQuery(event.target.value);setActive(0);if(!open)setOpen(true);}}
    onKeyDown={keys}/>
   {/* Not a submit button and never inside the tab order twice: the input owns
       the interaction, this only says out loud that there is a list behind it. */}
   <span className="combo-caret" aria-hidden="true">▾</span>
   {value&&!open&&!disabled&&<button type="button" className="combo-clear" aria-label={"Clear "+label}
    onClick={event=>{event.preventDefault();onPick("",null);}}>×</button>}
   {open&&<ul className="combo-list" id={id+"-list"} role="listbox" ref={listRef}>
    {options.length===0&&<li className="combo-empty" role="presentation">{emptyText||"Nothing matches that"}</li>}
    {options.map((option,index)=><li
      key={option.value+"|"+index}
      id={id+"-option-"+index}
      role="option"
      aria-selected={index===active}
      className={"combo-option"+(index===active?" active":"")+(option.foreign?" foreign":"")}
      /* mousedown, not click: click fires after blur, and by then the list is
         gone and the tap has landed on whatever moved into its place. */
      onMouseDown={event=>{event.preventDefault();pick(option);}}
      onMouseEnter={()=>setActive(index)}>
      <b>{option.label}</b>
      {option.hint&&<small>{option.hint}</small>}
     </li>)}
   </ul>}
  </div>
  {footnote&&<small className="combo-footnote">{footnote}</small>}
 </label>;
}
