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

import {Fragment,useEffect,useId,useRef,useState} from "react";
import "./combo-field.css";

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
 /* The heading this row sits under — "Tech Services · Farebox". A heading is
    drawn each time this CHANGES from the row above, which reproduces exactly
    what a native <optgroup> drew and is why it exists: the old picker divided a
    long list into named sections, and flattening it lost that. Curtis: "it was
    almost like a background faded lettering... each was kinda divided in the
    sections that had a lot of different defect options. I noticed it's not
    separated like that anymore." */
 section?:string;
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
 /* WHICH GROUP IS OPEN, while browsing. Empty means the list is showing its
    group titles and nothing else — see the row builder below. */
 const [browseGroup,setBrowseGroup]=useState("");
 const [active,setActive]=useState(0);
 const inputRef=useRef<HTMLInputElement|null>(null);
 const listRef=useRef<HTMLUListElement|null>(null);
 const boxRef=useRef<HTMLDivElement|null>(null);
 const id=useId();

 /* Recomputed each render rather than memoised: the whole catalog is 357 rows
    of string matching against an array already in memory, which is nothing next
    to the render it is part of, and a stale memo here would show the mechanic a
    list that does not match what he just typed. */
 /* NOTHING IS RANKED FOR A LIST NOBODY IS LOOKING AT.

    This ran on every render whether the list was open or shut, which is once
    per character typed anywhere else in the same form — and once the browse
    stopped being capped at forty rows, a shut picker was building the whole
    catalog, 357 rows, for a keystroke in the DETAILS box.

    Measured at 6x, 162 characters into DETAILS at phone width, it buys less
    than the row count suggests: median 33.6ms to 32.6ms, p95 50.2ms to 47.7ms,
    and the characters over 50ms down from 9 to 4. The ranking was never the
    bulk of the cost — the form redrawing around the field is — so this is the
    small, certain part of it rather than the fix.

    Safe because every reader of it is already behind `open`: the list itself,
    the group count, the rows, and the three keyboard branches that act. */
 const options=open?search(query):[];

 /* TITLES FIRST, DEFECTS SECOND.

    Curtis: "when the person presses that the sub category I only need those
    titles to show first those main titles so it's a lot more organized and you
    can get to what you need faster instead of scrolling through all the
    defects."

    Tapping this field used to open the whole catalog — every defect in the
    chosen category, divided by light-grey headings you scrolled past. Now
    browsing opens the HEADINGS, each one a row you press to see what is under
    it. Typing is untouched: a query still searches every wording in one ranked
    flat list, because that is the fast path for somebody who knows the words.

    And he asked for it everywhere rather than only where the groups are many:
    "if you should just be all seamless and look the same then just do it for
    everything regardless even if they only have two sub categories just to keep
    a consistent looking feel." So the shape is decided by whether the rows carry
    groups at all, not by how many — which also leaves the CATEGORY picker, whose
    rows carry none, exactly as it was.

    A ROW WITHOUT A GROUP STAYS WHERE IT IS, and that is not a detail. Browsing,
    the Defect Log puts the wording a record was saved under at the top of the
    list when the catalog no longer offers it — the one row that keeps an old
    record reachable and editable. It has no group, so grouping must not swallow
    it: section-less rows are drawn as themselves, in their own place, beside the
    titles. */
 const browsing=!query.trim();
 const groupCounts=new Map<string,number>();
 if(browsing)for(const option of options)if(option.section)groupCounts.set(option.section,(groupCounts.get(option.section)||0)+1);
 type Row=
  |{kind:"group";name:string;count:number}
  |{kind:"option";option:ComboOption};
 const rows:Row[]=(()=>{
  /* Typing: the ranked flat list, exactly as before. */
  if(!browsing)return options.map(option=>({kind:"option",option}));
  /* Inside a group: its defects. The way back out is drawn above them and is
     NOT one of these rows — see the row it renders for why. */
  if(browseGroup)return options.filter(option=>option.section===browseGroup).map(option=>({kind:"option" as const,option}));
  /* The top of the browse: one row per group, in catalog order, with anything
     ungrouped left in place. Built in one pass over the options so the order is
     the catalog's rather than a Set's. */
  const built:Row[]=[];
  const seen=new Set<string>();
  for(const option of options){
   if(!option.section){built.push({kind:"option",option});continue}
   if(seen.has(option.section))continue;
   seen.add(option.section);
   built.push({kind:"group",name:option.section,count:groupCounts.get(option.section)||0});
  }
  return built;
 })();
 /* WHETHER THIS LIST IS A DRILL-DOWN AT ALL. False for the CATEGORY picker,
    whose rows carry no groups. Asked of the OPTIONS rather than of the rows,
    because inside a group the rows are all defects and the question "is this a
    grouped list" has to keep the same answer one level down. */
 const grouped=browsing&&options.some(option=>option.section);

 /* A tap outside is a dismissal, and on a phone that is the usual way out —
    there is no Escape key on a bus. */
 useEffect(()=>{
  if(!open)return;
  const away=(event:MouseEvent|TouchEvent)=>{
   if(boxRef.current&&!boxRef.current.contains(event.target as Node)){setOpen(false);setQuery("");}
  };
  /* CAPTURE, AND THE REASON IS A RACE THIS CHANGE CREATED.

     React 18 flushes a discrete event like mousedown SYNCHRONOUSLY, so pressing
     a group title replaced the rows before this listener — on the bubble phase,
     after React's — ever ran. By then the `<li>` that was pressed is detached
     from the document, `boxRef.contains(it)` is false, and the list closed
     itself on a tap that landed inside it. It never showed before because every
     row press closed the list anyway; the drill-down is the first row that
     leaves it open. Capture runs ahead of React, where the target is still
     where the finger put it. */
  document.addEventListener("mousedown",away,true);
  document.addEventListener("touchstart",away,true);
  return ()=>{document.removeEventListener("mousedown",away,true);document.removeEventListener("touchstart",away,true);};
 },[open]);

 /* A SHUT LIST REMEMBERS NOTHING. Reopening starts at the titles, because the
    group somebody browsed into last time is not where the next defect lives. */
 useEffect(()=>{if(!open)setBrowseGroup("")},[open]);

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
  /* NOT children[active]: the headings are list items too, so the nth child and
     the nth OPTION stopped being the same thing the moment sections went in. */
  /* `.combo-row` is on every PICKABLE row — a group, the way back, an option —
     while the plain headings drawn while typing are not pickable and are not
     counted. Keyed on `.combo-option` this walked off by one for every group
     row on screen. */
  const row=listRef.current.querySelectorAll(".combo-row")[active] as HTMLElement|undefined;
  row?.scrollIntoView({block:"nearest"});
 },[active,open]);

 const pick=(option:ComboOption)=>{
  onPick(option.value,option);
  setOpen(false);
  setQuery("");
  setBrowseGroup("");
  inputRef.current?.blur();
 };

 /* WHAT PRESSING A ROW DOES, in one place, because three things can be pressed
    now and the keyboard and the thumb must agree about all three. Entering a
    group lands on its first defect rather than on the way back out: the back row
    is index 0, so starting there would make the first ArrowDown undo the tap. */
 const choose=(row:Row)=>{
  if(row.kind==="option"){pick(row.option);return}
  setBrowseGroup(row.name);
  setActive(0);
 };
 const leaveGroup=()=>{setBrowseGroup("");setActive(0)};

 const keys=(event:React.KeyboardEvent<HTMLInputElement>)=>{
  if(event.key==="ArrowDown"||event.key==="ArrowUp"){
   event.preventDefault();
   if(!open){setOpen(true);setActive(0);return;}
   setActive(current=>{
    const next=event.key==="ArrowDown"?current+1:current-1;
    if(!rows.length)return 0;
    return (next+rows.length)%rows.length;
   });
   return;
  }
  if(event.key==="Enter"){
   /* Only swallow Enter when it is doing something. Otherwise it belongs to the
      form, and a mechanic who has already chosen should be able to submit. */
   if(open&&rows[active]){event.preventDefault();choose(rows[active]);}
   return;
  }
  /* ESCAPE STEPS BACK OUT OF A GROUP BEFORE IT CLOSES THE LIST, which is what
     a person expects of a list they went one level into. */
  if(event.key==="Escape"&&open){
   event.preventDefault();
   if(browseGroup){leaveGroup();return}
   setOpen(false);setQuery("");
  }
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
    aria-activedescendant={open&&rows[active]?id+"-option-"+active:undefined}
    autoComplete="off"
    disabled={disabled}
    /* Closed, the field reads as the answer. Open, it is the question. */
    value={open?query:display}
    placeholder={placeholder||"Type or tap to choose"}
    onFocus={()=>{if(!disabled){setOpen(true);setQuery("");setBrowseGroup("");setActive(0);}}}
    /* TYPING LEAVES THE GROUP. A query searches every wording in the catalog,
       so staying inside one group would quietly hide most of what matched. */
    onChange={event=>{setQuery(event.target.value);setActive(0);setBrowseGroup("");if(!open)setOpen(true);}}
    onKeyDown={keys}/>
   {/* A REAL BUTTON, because it was a span with pointer-events:none and it looked
       exactly like a control. The list has one opener -- the input's onFocus --
       and a tap on an already-focused input fires no second focus event, so any
       state that leaves the field focused with the list shut is a dead end you
       can only escape by tapping somewhere else first. Curtis: "if I accidentally
       pressed the field twice for input then it's hard to get the list to
       regenerate. So the small arrow will always provide a quick way to do it."

       It toggles rather than only opening, so the same arrow that asks for the
       list puts it away. Still out of the tab order -- the input owns the
       keyboard, where ArrowDown already opens the list -- so this adds a touch
       target without adding a tab stop. */}
   <button
    type="button"
    className="combo-caret"
    aria-label={(open?"Hide ":"Show ")+label+" choices"}
    aria-expanded={open}
    aria-controls={id+"-list"}
    tabIndex={-1}
    disabled={disabled}
    /* mousedown with preventDefault, matching the options below: click lands
       after the focus/blur dance, and holding focus still is what stops onFocus
       from reopening the list this tap just closed. Opening focuses the input so
       typing narrows straight away; when it is already focused that is a no-op
       and fires no second onFocus. */
    onMouseDown={event=>{
     event.preventDefault();
     if(disabled)return;
     if(open){setOpen(false);setQuery("");return;}
     setOpen(true);setQuery("");setBrowseGroup("");setActive(0);
     inputRef.current?.focus();
    }}>▾</button>
   {value&&!open&&!disabled&&<button type="button" className="combo-clear" aria-label={"Clear "+label}
    onClick={event=>{event.preventDefault();onPick("",null);}}>×</button>}
   {open&&<ul className={grouped?"combo-list grouped":"combo-list"} id={id+"-list"} role="listbox" ref={listRef}>
    {/* THE WAY BACK IS A HEADER, NOT A ROW THE KEYBOARD WALKS, and that was
        found by driving the keyboard rather than the thumb. As a walkable row it
        sat at index 0, so entering a group with Enter left the highlight on the
        way OUT: the next Enter undid the one before it and no defect could be
        reached by keyboard at all. Taking it out of the walk means arrows move
        over defects and Escape is the way back, which is what a keyboard
        already expects — and a thumb still has a full-width row to press.

        Sticky like the headings it replaces, so it stays reachable after
        scrolling into a long group. */}
    {grouped&&browseGroup&&<li className="combo-back" role="presentation"
     onMouseDown={event=>{event.preventDefault();leaveGroup();}}>
     <b>← ALL GROUPS</b><small>{browseGroup}</small>
    </li>}
    {rows.length===0&&<li className="combo-empty" role="presentation">{emptyText||"Nothing matches that"}</li>}
    {rows.map((row,index)=>{
     const selected=index===active;
     /* mousedown, not click, on every row: click fires after blur, and by then
        the list is gone and the tap has landed on whatever moved into its
        place. */
     const press=(event:React.MouseEvent)=>{event.preventDefault();choose(row);};

     /* A GROUP TITLE IS A ROW YOU PRESS, so it is a real option in the listbox
        rather than the presentational heading it used to be — it is what the
        keyboard walks and what the thumb lands on at this level. Bigger than
        the headings were, because it is now the first thing on screen and the
        thing being chosen. The count says what is behind it, which is the
        difference between pressing a title hopefully and pressing it knowing. */
     if(row.kind==="group")return <li
      key={"group|"+row.name}
      id={id+"-option-"+index}
      role="option"
      aria-selected={selected}
      className={"combo-row combo-group"+(selected?" active":"")}
      onMouseDown={press}
      onMouseEnter={()=>setActive(index)}>
      <b>{row.name}</b>
      <span aria-hidden="true">{row.count}</span>
     </li>;

     const option=row.option;
     return <Fragment key={option.value+"|"+index}>
      {/* HEADINGS ONLY WHERE THEY STILL DIVIDE SOMETHING: while typing, where
          the ranked rows come from everywhere. Browsing, the group is the row
          above or the one you pressed to get here, so repeating it over every
          defect is the noise the drill-down just removed. */}
      {!browsing&&option.section&&option.section!==(rows[index-1]?.kind==="option"?(rows[index-1] as {option:ComboOption}).option.section:undefined)&&
       <li className="combo-section" role="presentation">{option.section}</li>}
      <li
       id={id+"-option-"+index}
       role="option"
       aria-selected={selected}
       className={"combo-row combo-option"+(selected?" active":"")+(option.foreign?" foreign":"")}
       onMouseDown={press}
       onMouseEnter={()=>setActive(index)}>
       <b>{option.label}</b>
       {option.hint&&<small>{option.hint}</small>}
      </li>
     </Fragment>;
    })}
   </ul>}
  </div>
  {footnote&&<small className="combo-footnote">{footnote}</small>}
 </label>;
}
