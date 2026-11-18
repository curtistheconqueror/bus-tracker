import {isGroupedCategory,repairGroupStepLabel,repairIssueStepLabel} from "./repair-catalog.ts";
import {saveRefusal,type SaveRefusalOptions} from "./save-refusal.ts";

/* THE ASSISTANT THAT POINTS AT WHAT IS NEXT.

   Curtis: "as a person transitions through setting a new defect in the log...
   it needs to be like a highlight function that highlights each field that
   they need to address next, so like the bus number being the first thing,
   then after that the defects... and there may be a short message that can pop
   up and kind of point to the optional things that you can do and what would
   be next, in case a person doesn't necessarily want to save a defect and
   recommend it on the down sheet."

   IT POINTS, IT DOES NOT GATE. Nothing here blocks a save, reorders the form
   or refuses a field out of turn. A foreman who has done this four hundred
   times must be able to ignore it completely, which is also why the whole
   thing is off until somebody turns it on.

   WHAT IT SAYS IS BLOCKING IS ASKED OF THE FORM'S OWN REFUSAL RULE, not
   restated here. It was restated here, as hand-written `blocking` flags beside
   a comment listing the form's five refusals, and a cold read found the list
   and the flags had already disagreed on two of them: a RECENT DUPLICATE
   disables all four save buttons and this said "THAT IS ENOUGH TO SAVE", and
   setting WORK STATUS to Fixed makes an ORDINARY save demand initials, which
   the comment explicitly denied. Both were written in the same hour as the
   rule they got wrong.

   So `src/lib/defects/save-refusal.ts` owns it, the form alerts with it, this
   points with it, and `blocking` is now whether that function returned
   something rather than a claim typed here. A sixth refusal added there
   reaches both without anybody remembering to.

   SO THE SPECIFIC DEFECT IS NOT REQUIRED, and the form says so in its own
   placeholder: "or leave it and save the category alone". A first draft of
   this file marked it required and marked REPORTED BY required too; both were
   wrong, and a coach that says a field is needed when it is not is worse than
   no coach, because the person believes it. The issue step is still the second
   stop on the walk — Curtis put it there, "the bus number being the first
   thing then after that the defects" — it just tells the truth about saving
   without it. It is the ONE step not derived from the refusal rule, because it
   is the one stop on the walk that is not a refusal.

   THE ORDER IS THE FORM'S OWN ORDER, read off it rather than invented: the bus
   picker, DEFECT CATEGORY, the group step where a category has one, SPECIFIC
   DEFECT OR SYMPTOM, then whatever the form would actually refuse — a counted
   repair, FIXED BY on a save-as-fixed, a defect already logged — then one
   message about everything else. One message rather than a tour, because a
   tour of nine optional fields is the thing people turn off on day two.

   It lives here rather than in the editor because what a half-filled defect
   still needs is a question about a record, and `docs/ARCHITECTURE.md` is
   explicit that a rule computed inside a `page.tsx` has to be reimplemented in
   the MCP route to be answerable. */

export type CoachStepKey="bus"|"category"|"group"|"issue"|"count"|"initials"|"duplicate"|"ready";

export type CoachStep={
 key:CoachStepKey;
 /* The `data-coach` value on the field this points at. A name rather than a
    selector, so the form can move without this file knowing. */
 target:string;
 title:string;
 message:string;
 /* Whether `saveRefusal` refused. Derived, never typed here. The issue step is
    a stop on the walk rather than a refusal, and is the only false one that is
    not simply "nothing left to refuse". */
 blocking:boolean;
};

export type CoachDraft={
 busId:string;
 category:string;
 /* The live value of SPECIFIC DEFECT OR SYMPTOM, which the editor holds as
    `quickIssue` until a save. */
 issue:string;
 count?:number;
 /* WORK STATUS. "completed" turns an ordinary submit into a save-as-fixed,
    which is one of the two refusals this file used to get wrong. */
 state?:string;
 /* An EDIT of a record that already exists, rather than a first draft. The
    editor is shared between logging and editing and the walk was written for
    logging: `recordDraft` blanks `quickIssue` for a defect saved as "Manual
    entry" or "Unspecified issue", so re-opening a deliberately free-text
    record rang SPECIFIC DEFECT and offered to "save the category on its own"
    — about a record that had already been saved. The refusals still apply to
    an edit; the nudge to fill a field nobody left blank does not. */
 existing?:boolean;
};

/* The refusal rule's own options, plus the one thing only the walk needs. The
   two are the same shape on purpose: the helper must not be able to ask the
   refusal rule a different question than the form asks it. */
export type CoachOptions=SaveRefusalOptions&{
 /* True once somebody has walked past the finishing message. Nothing here
    reads it today; the form hides the whole bar instead. */
 readyDismissed?:boolean;
};

const blank=(value:unknown)=>!String(value??"").trim();

/* The guidance each refusal gets. The REFUSAL supplies what the form will say
   and which field it is about; this supplies the sentence underneath, because
   an alert is written to stop somebody and a helper is written to move them
   along. The duplicate is the exception and keeps the form's own words: there
   is nothing to do to the form that fixes it, and "use the existing defect"
   is the whole of the advice. */
const GUIDANCE:Record<string,string>={
 bus:"Tap a generation to shorten the list, or type the fleet number.",
 category:"Brakes, Engine, A/C — type a word or tap to pick. Or type the fault below and this fills itself in.",
 count:"This repair is recorded as a number.",
 initials:"WORK STATUS is set to Fixed, so this saves as a completed repair and this device asks who signed it off.",
};

/* ALWAYS A STEP, never null. "What does this half-filled defect still need"
   always has an answer, and "nothing, it can be saved" is one of them — the
   `ready` step IS that answer rather than its absence. Waving the coach away
   is the form's business and lives there, because it is a fact about one
   person's patience with one editor rather than about the record. */
export function coachStep(draft:CoachDraft,options:CoachOptions):CoachStep{
 const refusal=saveRefusal(draft,options);
 /* The first two stops are refusals and come in the refusal rule's own order. */
 if(refusal&&(refusal.key==="bus"||refusal.key==="category"))return {
  key:refusal.key,target:refusal.field,blocking:true,
  title:refusal.title,message:GUIDANCE[refusal.key],
 };
 /* THE GROUP STEP ONLY EXISTS WHERE THE CATEGORY HAS ONE. A/C and HVAC asks
    for the system before the fault; Brakes goes straight to the repair, and
    `isGroupedCategory` reads `REPAIR_OPTION_GROUPS` — the same table the
    picker groups its rows by — so the two cannot disagree about which.

    The HEADINGS come from `repairGroupStepLabel` / `repairIssueStepLabel`,
    which the Facility Map's three-stage native picker uses. An earlier comment
    here said the LOG DEFECT form draws its two steps from them as well; it
    does not — that form draws one ComboField which presents the groups inside
    itself. The words are borrowed so the two surfaces say the same thing to a
    mechanic, which is worth doing, but it is not the form reading a table. */
 if(blank(draft.issue)&&!draft.existing)return isGroupedCategory(draft.category)?{
  key:"group",target:"issue",blocking:false,
  title:repairGroupStepLabel(draft.category),
  message:"Pick the system, then the fault inside it. You can also save the category on its own.",
 }:{
  key:"issue",target:"issue",blocking:false,
  title:repairIssueStepLabel(draft.category),
  message:"Type a word and the list narrows. You can also save the category on its own.",
 };
 /* EVERYTHING THE FORM WILL STILL REFUSE, in the order it refuses it, and
    without this file knowing what that list is. The count, FIXED BY on a save
    that has become a save-as-fixed, and a defect already logged — the last two
    of which this file used to miss entirely. */
 if(refusal)return {
  key:refusal.key,target:refusal.field,blocking:true,
  title:refusal.title,
  message:refusal.key==="duplicate"?refusal.message
   :GUIDANCE[refusal.key]?GUIDANCE[refusal.key]+" "+refusal.message:refusal.message,
 };
 /* THE ONE MESSAGE ABOUT EVERYTHING ELSE, and it names the two ways out
    explicitly because the question Curtis asked is what happens "in case a
    person doesn't necessarily want to save a defect and recommended on the
    down sheet". Saving on its own is a complete action and this says so.

    The initials line is appended only where it will actually stop somebody —
    a work status or a RECOMMEND tick, neither of which is a refusal of the
    save itself, so neither reaches `saveRefusal` and both belong here. */
 const needsInitials=options.requireInitials&&blank(options.completedBy);
 return {
  key:"ready",target:"save",blocking:false,
  title:"THAT IS ENOUGH TO SAVE",
  message:"Save it now, or first add details, set a work status, estimate the hours, or tick RECOMMEND FOR DOWN SHEET — all optional."
   +(needsInitials?" A work status, a recommendation or SAVE AS FIXED needs your initials in FIXED BY on this device.":""),
 };
}
