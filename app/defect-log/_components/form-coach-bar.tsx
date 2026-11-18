"use client";

/* THE STEP-BY-STEP HELPER, drawn.

   Curtis asked for "a little assistant highlighter... a highlight function
   that highlights each field that they need to address next", plus "a short
   message that can pop up and kind of point to the optional things that you
   can do and what would be next".

   TWO PARTS, AND ONLY ONE OF THEM MOVES. The message is a bar in a fixed
   place — between the editor's header and the scrolling form — and the ring
   is drawn on the field itself. The alternative, a tooltip floating beside
   each field in turn, was not built, and the reasons are worth keeping:

   - A block inserted above the live field pushes everything below it down, so
     the form jumps on every step. A bar outside the scroller never moves.
   - A floating card has to be measured and re-measured on every scroll of a
     box that scrolls under a thumb, which is the bug the bus quick view was
     just fixed for twice.
   - On a phone the field being pointed at is usually the one with the keyboard
     under it, and a tooltip anchored below the field lands beneath the
     keyboard. At the top of the editor nothing can cover it.

   So the bar says WHAT and the ring says WHERE. If a pop-up beside the field
   is what Curtis actually wants, that is a change to this file and the
   placement maths already exists in `quick-view-position.ts`.

   THE RING IS SET IMPERATIVELY, on an element this component does not own.
   The fields are drawn by shared pickers and by the form; threading an
   `active` prop into each would mean a prop on three shared components and one
   CSS rule per step name, which drifts the moment a step is added. Instead
   every coachable field carries `data-coach="<name>"` and this effect puts
   `data-coach-active` on whichever one the step names — the same shape as
   `header-theme-live.tsx`, which paints from an effect for the same reason.
   React never rendered that attribute, so it will not remove it, and the
   cleanup takes it off before the next step goes on.

   IT POINTS, IT DOES NOT GATE. Nothing here can stop a save, and the × means
   "stop helping me on this form" rather than "turn the feature off" — the
   durable switch is in Settings, which is the reversible place for it. */

import {useEffect,useRef} from "react";

import type {CoachStep} from "@/src/lib/defects/form-coach";

export default function FormCoachBar({step,hide}:{step:CoachStep;hide:()=>void}){
 const bar=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const form=bar.current?.closest("form");
  if(!form)return;
  /* Scanned rather than built into a selector string. The step names are
     literals in `form-coach.ts` today, and there are five fields, so the scan
     costs nothing and cannot be turned into a selector by a future name. */
  const anchor=Array.from(form.querySelectorAll("[data-coach]"))
   .find(element=>element.getAttribute("data-coach")===step.target);
  if(!anchor)return;
  anchor.setAttribute("data-coach-active","");
  return ()=>anchor.removeAttribute("data-coach-active");
 /* THE DEPENDENCY IS THE STEP'S TARGET AND NOT THE NODE, and that is sound
    only because every anchor holds its slot. Each is written `{cond&&<X/>}`
    inside a stable parent, so React keeps the same element across the
    re-renders a keystroke causes rather than re-creating it — if one were ever
    re-mounted while the target name stayed put, the ring would be lost with no
    recovery, since nothing re-checks and there is no observer. Driven and
    measured rather than assumed: bus to category to group to issue to count to
    ready and back again, switching between repairs that add and remove the
    count anchor, 54 keystrokes into ADDITIONAL DETAILS — exactly one ring at
    every point, the right one, and none left after the editor closes. */
 },[step.target]);
 /* `role="status"` rather than `alert`: it is a running commentary on a form
    somebody is filling in, and an assertive live region would interrupt a
    screen reader mid-field on every keystroke that advances the step. */
 return <div className="coach-bar" ref={bar} role="status" data-coach-blocking={step.blocking?"":undefined}>
  <div className="coach-bar-say">
   <b>{step.title}</b>
   <small>{step.message}</small>
  </div>
  <button type="button" className="coach-bar-hide" onClick={hide}
   aria-label="Stop showing the step-by-step helper on this form">×</button>
 </div>;
}
