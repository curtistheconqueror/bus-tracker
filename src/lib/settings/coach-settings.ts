/* IS THE ASSISTANT ON, ON THIS DEVICE.

   Curtis asked for the highlighter "and it should be a toggle off and on for
   it." Off is the default, which is the rule every added-behaviour setting in
   this app follows — sound and vibration shipped off, and ESCAPE CLOSES THE
   BUS EDITOR shipped off — because the people who most need the app to behave
   exactly as it did yesterday are the ones holding it on a shift.

   OFF IS ALSO THE SAFE READ, the way `feedback-settings.ts` reads its flags:
   anything that is not EXACTLY `true` — missing, corrupt, `"yes"`, `1` — is
   off. A coach that turns itself on because a record went strange would be
   putting a panel over somebody's form mid-shift. `app-mode.ts` inverts this
   deliberately and says why; the generous reading is the harmful one here.

   Per device and never synced, like every other appearance and behaviour
   setting here: it describes how one person wants the app to help them. */

export const COACH_SETTINGS_KEY="pace-coach-v1";

export type CoachSettings={on:boolean};

export function readCoachSettings(storage:Pick<Storage,"getItem">|null):CoachSettings{
 if(!storage)return {on:false};
 try{
  const saved=JSON.parse(storage.getItem(COACH_SETTINGS_KEY)||"{}") as Partial<CoachSettings>;
  return {on:saved.on===true};
 }catch{return {on:false}}
}

/* Returns whether it was written. A full device must not be told the switch
   moved when it did not — the discipline the Defect Log's own writes already
   follow. */
export function writeCoachSettings(storage:Pick<Storage,"setItem">|null,settings:CoachSettings){
 if(!storage)return false;
 try{storage.setItem(COACH_SETTINGS_KEY,JSON.stringify({on:settings.on===true}));return true}
 catch{return false}
}
