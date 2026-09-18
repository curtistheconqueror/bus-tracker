/* WHO IS HOLDING THE DEVICE, as a label and nothing else yet.

   Curtis: "there will be no special conditions in the app for any of the
   working roles. This is all cosmetic. We will wire that up later."

   So this file stores a name and offers a list, and that is the whole of it.
   NOTHING OUTSIDE THIS MODULE MAY READ IT TO DECIDE WHAT A PERSON CAN DO.
   app-mode.ts carries the same warning for Lite and it is worth repeating here
   for a harder reason: Lite is obviously a view, whereas a list containing
   "Foreman" and "Supt" LOOKS like a permission model, and the day something
   starts gating on it, an unauthenticated string in a phone's LocalStorage —
   which anybody holding the phone can change from this very screen — has
   quietly become the thing standing between a person and a control.

   That day is coming, and it still does not start here; see WHERE THIS IS
   GOING below.

   It is also not read to decide what is STORED. A record is a record whoever
   typed it.

   THE SAME ROLE EXISTS IN BOTH DEPARTMENTS. Supt and Asst Supt are on both
   lists, so the stored answer has to carry the department too — a bare "Supt"
   does not say which one, and the two are different people. That is why this is
   a pair rather than a string.

   WHERE THIS IS GOING, so the next person does not have to guess. Curtis: "the
   distinction will be made on a person's own login... when a person picks one,
   it will determine what they see and have access to. Also when they pick one,
   it will ask them a questionnaire that we have not put together yet. So for
   now, as stated, this is for cosmetic purposes only."

   Read that as the order of construction, not as permission to start early. The
   access rules ride on the LOGIN, once there is one. This key is an
   unauthenticated string in a phone's LocalStorage that anybody holding the
   phone can change from the screen that set it, so it can be the label a login
   confirms — never the thing that decides. Nothing outside this module may read
   it until that login exists, and a test holds that line. */

export const ROLE_STORAGE_KEY="pace-role-v1";

export type RoleDepartment="transportation"|"maintenance";
export type RoleUnit="union"|"non-union";
export type RoleChoice={department:RoleDepartment;unit:RoleUnit;role:string};

/* UNION OR NOT, asked after the department and before the role. Curtis: "I want
   the distinction after they select their dept, transportation or maintenance —
   union or non-union."

   He also asked whether non-union is called "bargain". It is the other way
   round: a BARGAINING UNIT is the group a union represents, so "bargaining"
   names the union side and cannot label the other one. The pairs that are
   actually used are Union / Non-Union, Bargaining / Non-Bargaining, and
   Represented / Non-Represented. The plainest of the three is what a shop floor
   says out loud, so that is what is drawn; the other two are a one-line change
   here if the formal wording is wanted later.

   Union first because most of the building is: operators, servicers and
   mechanics outnumber the superintendents. */
export const ROLE_UNITS:{key:RoleUnit;label:string}[]=[
 {key:"union",label:"Union"},
 {key:"non-union",label:"Non-Union"},
];
export function unitLabel(unit:RoleUnit){
 return ROLE_UNITS.find(item=>item.key===unit)?.label||"";
}

/* Curtis's own two lists, in his own order — which is the shop's order, from
   the road or the floor upward, not alphabetical:

     "Transportation, it will give you the option between bus operator, then
      dispatch and then superintendent. Now for maintenance, it will be servicer
      then mechanic, foreman, superintendent."

   ...later corrected and expanded by him into the union/non-union table below,
   which is the one that is built.

   Mechanic and Mechanic Helper are two rows rather than one: they are two jobs
   on this floor, and the earlier single "Mechanic / Technician" was a guess made
   before Curtis listed the trades out.

   MASTER MECHANIC IS UNION, at the top of the mechanic ladder — confirmed by
   Curtis ("Master mechanic is union, you're correct") rather than left as the
   inference it started as. He had asked only to "add Master Mechanic in
   maintenance" without naming a side, and the title genuinely goes both ways in
   transit: at many properties it is the top classification in the agreement,
   sitting above Mechanic exactly where the ladder Servicer → Mechanic Helper →
   Mechanic already points; at others it is the management title for whoever
   runs the garage, which would have put it beside Foreman. It was placed on the
   ladder because that is the shape of the rest of his union list, and asked
   about because a job on the wrong side does not merely look odd — it cannot be
   chosen at all, since the picker only offers the list for the side you picked.

   SUPERINTENDENT IS ABBREVIATED because there are two of them. Curtis: "we have
   asst supt, so that is why I want it shortened, so the label can show both like
   Asst Supt & Supt simultaneously." Spelled out, "Assistant Superintendent"
   beside "Superintendent" is two long strings differing by one word at the
   front, which is the hardest pair of all to tell apart at a glance on a phone.
   Both departments get both, since both already had a Superintendent.

   THE UNION ANSWER NARROWS THE JOB LIST, because Curtis supplied the actual
   split rather than leaving it to be guessed:

     "The maintenance side will be Servicer, Mechanic Helper, Mechanic, Body &
      Frame, Building Maintenance. The other are non union. For transportation
      it will be Bus Operator, Dispatch, and the rest."

   ...then corrected, which is why the table below is the only thing to read and
   that quote is kept only as history:

     "Yes dispatch is non union. They have a spot under them called Relief
      Supervisor which are union... also add Master Mechanic in maintenance."

   DISPATCH IS NON-UNION and Relief Supervisor is the union spot beneath it.
   That correction is the argument for asking rather than inferring: Dispatch
   was on the union side here for one commit purely because it is union at many
   properties, and being union at many properties is not being union at this
   one.

   So Foreman sits on the non-union side here, which is the one a shop cannot
   assume — it goes either way by contract — and is exactly why this was left
   unfiltered until he said. A list filtered on a guess shows somebody a screen
   with their own job missing from it; a list filtered on the contract shows
   each person only the five or so rows that can possibly be theirs.

   The consequence to know: a combination that is not in this table cannot be
   chosen and does not read back. If the contract changes and a job moves sides,
   it moves HERE, and any device that stored the old pairing reads as "not set"
   until its owner picks again.

   Renaming these strings is safe ONLY because 171 has not published — no device
   holds a role yet. Once it has, a wording change here has to become a read-time
   rename like the repair catalog's, or every device that stored the old spelling
   silently reads as "not set". */
export const ROLE_DEPARTMENTS:{key:RoleDepartment;label:string;roles:Record<RoleUnit,string[]>}[]=[
 {key:"transportation",label:"Transportation",roles:{
  union:["Bus Operator","Relief Supervisor"],
  "non-union":["Dispatch","Asst Supt","Supt"],
 }},
 {key:"maintenance",label:"Maintenance",roles:{
  union:["Servicer","Mechanic Helper","Mechanic","Master Mechanic","Body & Frame","Building Maintenance"],
  "non-union":["Foreman","Asst Supt","Supt"],
 }},
];

export function departmentRoles(department:RoleDepartment,unit:RoleUnit){
 return ROLE_DEPARTMENTS.find(item=>item.key===department)?.roles[unit]||[];
}
/* Every job in a department, both sides, for anything that needs the whole set
   rather than one person's slice. */
export function allDepartmentRoles(department:RoleDepartment){
 const found=ROLE_DEPARTMENTS.find(item=>item.key===department);
 return found?[...found.roles.union,...found.roles["non-union"]]:[];
}
export function departmentLabel(department:RoleDepartment){
 return ROLE_DEPARTMENTS.find(item=>item.key===department)?.label||"";
}

/* Nothing on file, or anything unreadable, means no role — never a default.

   Guessing one would be worse than leaving it blank: a device that quietly
   decided somebody was a Foreman would be putting a word on a screen that
   nobody chose, and this exists precisely so the person says it themselves. */
export function readRole(raw:string|null):RoleChoice|null{
 try{
  const saved=JSON.parse(raw||"null") as Partial<RoleChoice>|null;
  if(!saved||typeof saved!=="object")return null;
  const department=saved.department==="transportation"||saved.department==="maintenance"?saved.department:null;
  if(!department)return null;
  /* All three or nothing. A half-answered role — a department and a job with no
     union status — is a record that looks complete on the summary line and is
     not, and there is no honest way to guess the missing third. Safe to require
     because 171 has not published and no device holds a role yet; once one does,
     an older two-part answer would have to be read forward rather than dropped. */
  const unit=saved.unit==="union"||saved.unit==="non-union"?saved.unit:null;
  if(!unit)return null;
  /* Validated at READ time against the list, and never written back. A stored
     answer whose wording this build no longer offers reads as "not set" and is
     left exactly as it is on the device — the same rule the repair catalog
     follows for renamed defects, for the same reason: rewriting somebody's
     record to make this build tidier throws away what they actually chose. */
  /* Validated against the PAIR, not the department alone: a Supt stored as
     union is a combination the picker cannot produce, so it came from a
     hand-edited backup or a build whose table said something else. */
  return departmentRoles(department,unit).includes(String(saved.role))?{department,unit,role:String(saved.role)}:null;
 }catch{return null}
}

export function serializeRole(choice:RoleChoice){
 return JSON.stringify({version:1,department:choice.department,unit:choice.unit,role:choice.role,chosenAt:new Date().toISOString()});
}

/* "Maintenance · Foreman", which is the only spelling that tells one
   department's Supt from the other's.

   The union status is deliberately NOT in this string. Three parts joined by
   dots runs past the width of a phone's summary line, where the longest of them
   — "Transportation · Non-Union · Mechanic / Technician" — would be truncated
   at exactly the end that identifies the person. It is drawn as its own tag
   beside this instead, which also matches what it is: an attribute of the
   person, not part of their job title. */
export function roleLabel(choice:RoleChoice|null){
 return choice?departmentLabel(choice.department)+" · "+choice.role:"";
}
