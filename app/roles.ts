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
export type RoleChoice={department:RoleDepartment;role:string};

/* Curtis's own two lists, in his own order — which is the shop's order, from
   the road or the floor upward, not alphabetical:

     "Transportation, it will give you the option between bus operator, then
      dispatch and then superintendent. Now for maintenance, it will be servicer
      then mechanic, foreman, superintendent."

   "Mechanic / Technician" carries both words because he used both for the one
   role ("mechanic/technician" the first time, "mechanic" the second).

   SUPERINTENDENT IS ABBREVIATED because there are two of them. Curtis: "we have
   asst supt, so that is why I want it shortened, so the label can show both like
   Asst Supt & Supt simultaneously." Spelled out, "Assistant Superintendent"
   beside "Superintendent" is two long strings differing by one word at the
   front, which is the hardest pair of all to tell apart at a glance on a phone.
   Both departments get both, since both already had a Superintendent.

   Renaming these strings is safe ONLY because 171 has not published — no device
   holds a role yet. Once it has, a wording change here has to become a read-time
   rename like the repair catalog's, or every device that stored the old spelling
   silently reads as "not set". */
export const ROLE_DEPARTMENTS:{key:RoleDepartment;label:string;roles:string[]}[]=[
 {key:"transportation",label:"Transportation",roles:["Bus Operator","Dispatch","Asst Supt","Supt"]},
 {key:"maintenance",label:"Maintenance",roles:["Servicer","Mechanic / Technician","Foreman","Asst Supt","Supt"]},
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

/* "Maintenance · Foreman", which is the only spelling that tells one
   department's Supt from the other's. */
export function roleLabel(choice:RoleChoice|null){
 return choice?departmentLabel(choice.department)+" · "+choice.role:"";
}
