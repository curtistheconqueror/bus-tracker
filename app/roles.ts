/* WHO IS HOLDING THE DEVICE, as a label and nothing else yet.

   Curtis: "there will be no special conditions in the app for any of the
   working roles. This is all cosmetic. We will wire that up later."

   So this file stores a name and offers a list, and that is the whole of it.
   NOTHING MAY READ IT TO DECIDE WHAT A PERSON CAN DO. app-mode.ts carries the
   same warning for Lite and it is worth repeating here for a harder reason:
   Lite is obviously a view, whereas a list containing "Foreman" and
   "Superintendent" LOOKS like a permission model, and the day something starts
   gating on it, an unauthenticated string in a phone's LocalStorage — which
   anybody holding the phone can change from this very screen — has quietly
   become the thing standing between a person and a control. There is no login
   in this app. If roles ever need to mean something, that is the conversation
   to have first, not a condition to add here.

   It is also not read to decide what is STORED. A record is a record whoever
   typed it.

   THE SAME ROLE EXISTS IN BOTH DEPARTMENTS. Superintendent is on both lists, so
   the stored answer has to carry the department too — a bare "Superintendent"
   does not say which one, and the two are different people. That is why this is
   a pair rather than a string. */

export const ROLE_STORAGE_KEY="pace-role-v1";

export type RoleDepartment="transportation"|"maintenance";
export type RoleChoice={department:RoleDepartment;role:string};

/* Curtis's own two lists, in his own order — which is the shop's order, from
   the road or the floor upward, not alphabetical:

     "Transportation, it will give you the option between bus operator, then
      dispatch and then superintendent. Now for maintenance, it will be servicer
      then mechanic, foreman, superintendent."

   "Mechanic / Technician" carries both words because he used both for the one
   role ("mechanic/technician" the first time, "mechanic" the second). */
export const ROLE_DEPARTMENTS:{key:RoleDepartment;label:string;roles:string[]}[]=[
 {key:"transportation",label:"Transportation",roles:["Bus Operator","Dispatch","Superintendent"]},
 {key:"maintenance",label:"Maintenance",roles:["Servicer","Mechanic / Technician","Foreman","Superintendent"]},
];

export function departmentRoles(department:RoleDepartment){
 return ROLE_DEPARTMENTS.find(item=>item.key===department)?.roles||[];
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
  /* Validated at READ time against the list, and never written back. A stored
     answer whose wording this build no longer offers reads as "not set" and is
     left exactly as it is on the device — the same rule the repair catalog
     follows for renamed defects, for the same reason: rewriting somebody's
     record to make this build tidier throws away what they actually chose. */
  return departmentRoles(department).includes(String(saved.role))?{department,role:String(saved.role)}:null;
 }catch{return null}
}

export function serializeRole(choice:RoleChoice){
 return JSON.stringify({version:1,department:choice.department,role:choice.role,chosenAt:new Date().toISOString()});
}

/* "Maintenance · Foreman", which is the only spelling that tells the two
   Superintendents apart. */
export function roleLabel(choice:RoleChoice|null){
 return choice?departmentLabel(choice.department)+" · "+choice.role:"";
}
