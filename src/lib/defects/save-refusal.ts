import {defectCountField} from "./repair-catalog.ts";

/* WHAT THE DEFECT FORM WILL REFUSE TO SAVE, in one place.

   This existed twice and the two copies had already disagreed. The rule lived
   inline in `validateAndSave` — five `if(...)alert(...)` clauses on one line of
   `app/defect-log/page.tsx` — and the step-by-step helper then RE-STATED it as
   a set of `blocking` flags written by hand in `form-coach.ts`. A cold read
   found both divergences on the first pass:

     - A RECENT DUPLICATE disables all four save buttons, and the helper said
       "THAT IS ENOUGH TO SAVE · Save it now". The one moment the helper is
       most needed is the moment it pointed the wrong way.
     - `completed` is `complete||defect.state==="completed"`, so setting WORK
       STATUS to Fixed makes an ORDINARY save demand initials. The helper's own
       comment said REQUIRE INITIALS "does not gate an ordinary save at all".

   Two copies of one rule is exactly what `docs/ARCHITECTURE.md` says to avoid,
   and the MCP constraint in CLAUDE.md says why: a rule written inside a
   `page.tsx` has to be written a second time anywhere else that needs it, and
   then there are two of it. There is now one, the form alerts with it, the
   helper points with it, and a sixth refusal added here reaches both without
   anybody remembering to.

   IT RETURNS THE REFUSAL, NOT A BOOLEAN. The message is the one the form has
   always shown, word for word, and `field` is what the helper rings. */

export type SaveRefusalKey="bus"|"category"|"count"|"initials"|"duplicate";

export type SaveRefusal={
 key:SaveRefusalKey;
 /* The `data-coach` anchor to point at. */
 field:string;
 /* What the form says when somebody presses save. */
 message:string;
 /* A heading for the helper, which has a line of its own to fill. */
 title:string;
};

export type SaveRefusalDraft={
 busId:string;
 category:string;
 /* The live value of SPECIFIC DEFECT OR SYMPTOM, held as `quickIssue` until a
    save. The issue is NOT one of the refusals — the form's own placeholder
    says "or leave it and save the category alone" — but the counted-repair
    table is keyed on it, so it is needed to answer the count. */
 issue:string;
 count?:number;
 /* The work status on the draft. "completed" makes an ordinary submit a
    save-as-fixed, which is the refusal that was missed. */
 state?:string;
};

export type SaveRefusalOptions={
 /* True when the press was SAVE AS FIXED rather than SAVE DEFECT. */
 savingAsFixed?:boolean;
 requireInitials:boolean;
 /* What FIXED BY holds, or the device default that fills it. */
 completedBy?:string;
 /* Already logged recently, so all four save buttons are disabled. The form
    finds it; this only has to know whether there is one, and when it was, for
    the message. */
 duplicateAt?:string;
 /* The form spells these two, because the wording a person reads has to be the
    wording the form has always shown and this module cannot format a date. */
 duplicateWhen?:string;
 duplicateWindow?:string;
};

const blank=(value:unknown)=>!String(value??"").trim();

export function saveRefusal(draft:SaveRefusalDraft,options:SaveRefusalOptions):SaveRefusal|null{
 if(blank(draft.busId))return {key:"bus",field:"bus",title:"START WITH THE BUS",
  message:"Select a bus number."};
 if(blank(draft.category))return {key:"category",field:"category",title:"WHAT AREA IS IT",
  message:"Select a repair category."};
 const countField=defectCountField(draft.category,draft.issue);
 const count=Number(draft.count||0);
 if(countField?.required&&(!count||count<1||count>countField.max))return {
  key:"count",field:"count",title:countField.label,
  message:"Select "+countField.label.toLowerCase()+" (1 through "+countField.max+")."};
 /* THE ONE THE HELPER GOT WRONG. An ordinary submit becomes a save-as-fixed
    the moment WORK STATUS reads Fixed, so this gate is not reserved for the
    SAVE AS FIXED button the way the helper's comment claimed. */
 const completed=Boolean(options.savingAsFixed)||draft.state==="completed";
 if(completed&&options.requireInitials&&blank(options.completedBy))return {
  key:"initials",field:"initials",title:"WHO IS SIGNING IT OFF",
  message:"Put your initials or name in FIXED BY before saving this as fixed. This is required by the Defect Log setting; turn it off there to make it optional again."};
 /* LAST, as it always was: a duplicate is only worth raising once everything
    else about the record is sayable. */
 if(options.duplicateAt)return {key:"duplicate",field:"duplicate",title:"THIS ONE IS ALREADY LOGGED",
  message:"This same defect was already logged "+(options.duplicateWhen||"")+". Use the existing defect instead. A new report can be logged after "+(options.duplicateWindow||"")+"."};
 return null;
}
