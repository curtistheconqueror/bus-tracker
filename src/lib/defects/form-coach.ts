import {defectCountField,isGroupedCategory,repairGroupStepLabel,repairIssueStepLabel} from "./repair-catalog.ts";

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

   WHAT IT SAYS IS BLOCKING IS READ OFF THE FORM'S OWN REFUSALS, not off what
   the fields look like. `validateAndSave` refuses exactly five things — no
   bus, no category, a required count out of range, FIXED BY empty on a
   save-as-fixed where the device asks for initials, and a recent duplicate.

   SO THE SPECIFIC DEFECT IS NOT REQUIRED, and the form says so in its own
   placeholder: "or leave it and save the category alone". A first draft of
   this file marked it required and marked REPORTED BY required too; both were
   wrong, and a coach that says a field is needed when it is not is worse than
   no coach, because the person believes it. The issue step is still the second
   stop on the walk — Curtis put it there, "the bus number being the first
   thing then after that the defects" — it just tells the truth about saving
   without it.

   THE ORDER IS THE FORM'S OWN ORDER, read off it rather than invented: the bus
   picker, DEFECT CATEGORY, the group step where a category has one, SPECIFIC
   DEFECT OR SYMPTOM, the count where that repair carries one, then one message
   about everything else. One message rather than a tour, because a tour of
   nine optional fields is the thing people turn off on day two.

   It lives here rather than in the editor because what a half-filled defect
   still needs is a question about a record, and `docs/ARCHITECTURE.md` is
   explicit that a rule computed inside a `page.tsx` has to be reimplemented in
   the MCP route to be answerable. */

export type CoachStepKey="bus"|"category"|"group"|"issue"|"count"|"ready";

export type CoachStep={
 key:CoachStepKey;
 /* The `data-coach` value on the field this points at. A name rather than a
    selector, so the form can move without this file knowing. */
 target:string;
 title:string;
 message:string;
 /* True only where the save will actually be refused without it. The issue
    step is a stop on the walk and is not one of these. */
 blocking:boolean;
};

export type CoachDraft={
 busId:string;
 category:string;
 /* The live value of SPECIFIC DEFECT OR SYMPTOM, which the editor holds as
    `quickIssue` until a save. */
 issue:string;
 count?:number;
};

export type CoachOptions={
 /* The Defect Log's REQUIRE INITIALS setting. It does not gate an ordinary
    save at all — it gates ticking a work status, RECOMMEND FOR DOWN SHEET and
    SAVE AS FIXED — so it only ever changes what the last message says. */
 requireInitials:boolean;
 /* What FIXED BY holds, or the device default that fills it. */
 initials?:string;
};

const blank=(value:unknown)=>!String(value??"").trim();

/* ALWAYS A STEP, never null. "What does this half-filled defect still need"
   always has an answer, and "nothing, it can be saved" is one of them — the
   `ready` step IS that answer rather than its absence. Waving the coach away
   is the form's business and lives there, because it is a fact about one
   person's patience with one editor rather than about the record. */
export function coachStep(draft:CoachDraft,options:CoachOptions):CoachStep{
 if(blank(draft.busId))return {
  key:"bus",target:"bus",blocking:true,
  title:"START WITH THE BUS",
  message:"Tap a generation to shorten the list, or type the fleet number.",
 };
 if(blank(draft.category))return {
  key:"category",target:"category",blocking:true,
  title:"WHAT AREA IS IT",
  message:"Brakes, Engine, A/C — type a word or tap to pick. Or type the fault below and this fills itself in.",
 };
 /* THE GROUP STEP ONLY EXISTS WHERE THE CATEGORY HAS ONE. A/C and HVAC asks
    for the system before the fault; Brakes goes straight to the repair. The
    form draws both steps from the same table, so this reads that table rather
    than keeping a list of which categories are grouped. */
 if(blank(draft.issue))return isGroupedCategory(draft.category)?{
  key:"group",target:"issue",blocking:false,
  title:repairGroupStepLabel(draft.category),
  message:"Pick the system, then the fault inside it. You can also save the category on its own.",
 }:{
  key:"issue",target:"issue",blocking:false,
  title:repairIssueStepLabel(draft.category),
  message:"Type a word and the list narrows. You can also save the category on its own.",
 };
 /* FANS OUT is the one count the save refuses without, so it is the one count
    worth stopping on. Asked of the catalog rather than listed here, the way
    the form asks. */
 const countField=defectCountField(draft.category,draft.issue);
 const count=Number(draft.count||0);
 if(countField?.required&&(!count||count<1||count>countField.max))return {
  key:"count",target:"count",blocking:true,
  title:countField.label,
  message:"This repair is recorded as a number. "+countField.prompt+".",
 };
 /* THE ONE MESSAGE ABOUT EVERYTHING ELSE, and it names the two ways out
    explicitly because the question Curtis asked is what happens "in case a
    person doesn't necessarily want to save a defect and recommend it on the
    down sheet". Saving on its own is a complete action and this says so.

    The initials line is appended only where it will actually stop somebody:
    the setting is on and FIXED BY is empty. Said unconditionally it would be
    a warning about a rule this device does not have. */
 const needsInitials=options.requireInitials&&blank(options.initials);
 return {
  key:"ready",target:"save",blocking:false,
  title:"THAT IS ENOUGH TO SAVE",
  message:"Save it now, or first add details, set a work status, estimate the hours, or tick RECOMMEND FOR DOWN SHEET — all optional."
   +(needsInitials?" A work status, a recommendation or SAVE AS FIXED needs your initials in FIXED BY on this device.":""),
 };
}
