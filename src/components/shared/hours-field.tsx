"use client";

/* AN HOURS BOX YOU CAN ACTUALLY TYPE IN.

   Curtis: "the hours entered field is janky and doesn't allow u to just simply
   erase all the numbers and the decimal point."

   Two separate faults sat behind that sentence, and they had different causes
   on the two surfaces.

   ERASING. The Down Sheet's estimate boxes rendered `value={hoursValue(minutes)}`
   — a number re-derived from storage, never the characters anybody typed. `""`
   was not in the range of outputs, so the field could not BE empty. Backspacing
   ran `Number("")||0` (twice, on the same keystroke) and the total was then
   floored at thirty minutes, so clearing the box did not even show zero: it
   snapped to 0.5.

   THE DECIMAL POINT. `type="number"` is the trap. Per the HTML value-sanitising
   rule, "1." is not a valid floating-point number, so `event.target.value` reads
   `""` the instant the point is pressed. Coerced to 0, floored, redrawn — the
   character is gone before the next keystroke. `1.5` was untypable.
   The Defect Log's boxes are `type="text"` and still lost it, for the sibling
   reason: `Number("1.")` is 1, so the value round-trips to "1" and deletes the
   point anyway. Typing 1 . 5 there produced FIFTEEN.

   THE FIX IS THE SAME ONE THE DEFECT LOG ALREADY USES ELSEWHERE: hold the
   person's keystrokes as a string and resolve them late. While the box is being
   edited it shows exactly what was typed — "", ".", "1." are all legal
   intermediate states and none of them are a number yet. The parsed value goes
   out on every change so nothing is lost if the form is submitted mid-edit, and
   the draft is dropped on blur so the canonical value takes over.

   Shared, because the decimal fault existed on BOTH surfaces. Fixing it in the
   Down Sheet alone would have left the Defect Log turning 1.5 into 15. */

import {useState} from "react";
/* The rules live in a .ts beside this so they can be tested on their own. */
import {isTypeableHours,parseHours} from "@/src/lib/shared/hours-value";

export default function HoursField({value,onChange,id,placeholder=".5",max,className,ariaLabel}:{
 /* `undefined` means EMPTY and must stay distinguishable from zero — an
    unrecorded hour is not the same claim as "this took none". */
 value:number|undefined;
 onChange:(hours:number|undefined)=>void;
 id?:string;
 placeholder?:string;
 max?:number;
 className?:string;
 ariaLabel?:string;
}){
 /* null means "not being edited" — the box shows the stored value. A string,
    even an empty one, means these are the person's own characters and they win
    until they leave the field. */
 const [draft,setDraft]=useState<string|null>(null);
 const shown=draft!==null?draft:value===undefined?"":String(value);
 return <input
  id={id}
  /* NOT type="number". That is the rule that eats the decimal point. */
  type="text"
  inputMode="decimal"
  autoComplete="off"
  className={className}
  aria-label={ariaLabel}
  placeholder={placeholder}
  value={shown}
  onChange={event=>{
   const raw=event.target.value;
   /* A rejected keystroke leaves the draft untouched rather than rewriting the
      box, so a stray letter does nothing instead of clearing the field. */
   if(!isTypeableHours(raw))return;
   setDraft(raw);
   const parsed=parseHours(raw);
   onChange(max!==undefined&&parsed!==undefined?Math.min(max,parsed):parsed);
  }}
  onBlur={()=>setDraft(null)}
 />;
}
