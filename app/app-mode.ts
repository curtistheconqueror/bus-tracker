/* Full or Lite, per device, and whether this device has ever been asked.

   Lite is a VIEW, never a data shape. A Lite device writes the same records to
   the same keys and syncs the same way; it draws less of itself. Nothing in
   this file may ever be read to decide what is STORED — only what is DRAWN. If
   a rule here starts affecting a record, the design has gone wrong.

   It is also not a permission. Curtis: "It's not so much a permissions thing as
   it is a training purpose." Anyone holding the device can turn it on or off,
   and nothing about it stops a person doing anything. */

export const APP_MODE_STORAGE_KEY="pace-app-mode-v1";
export const FLEET_STORAGE_KEY_FOR_FIRST_RUN="pace-board-v1";

export type AppMode="full"|"lite";
export type AppModeState={mode:AppMode;answered:boolean};
export const DEFAULT_APP_MODE:AppModeState={mode:"full",answered:false};

/* Full when nothing is stored, and when anything stored is unreadable.

   Somebody who never answers, or whose device loses the answer, keeps every
   surface. The other default would take pages away from a mechanic mid-shift
   because a write failed once, which is the kind of thing that ends trust in an
   app rather than in a setting. */
export function readAppMode(raw:string|null):AppModeState{
 try{
  const saved=JSON.parse(raw||"null") as Partial<AppModeState>|null;
  if(!saved||typeof saved!=="object")return {...DEFAULT_APP_MODE};
  return {mode:saved.mode==="lite"?"lite":"full",answered:saved.answered===true};
 }catch{return {...DEFAULT_APP_MODE}}
}
export function serializeAppMode(state:AppModeState){
 return JSON.stringify({version:1,mode:state.mode,answered:state.answered,answeredAt:new Date().toISOString()});
}

/* A device nobody has ever opened the app on.

   Read through getItem rather than readFleetStorage, and that is the whole
   point of this function: a MISSING pace-board-v1 and a SAVED board holding
   zero buses come back identically from the payload reader (storage.ts returns
   {items:[],valid:true} for both), so asking it "is the board empty" would put
   the welcome in front of somebody who had simply cleared theirs.

   Two conditions, not one. No answer on file, AND no board on file: everybody
   in the shop today has a board, so nobody mid-shift meets a screen asking them
   to choose something they never asked for. They reach it from Settings, which
   is also how Curtis sees what a new person sees on his own phone.

   What this cannot know is WHO. There is no login, so cleared site data, a
   private window, a second browser, or a reinstalled home-screen app all look
   like a new device. That is why this asks a question once rather than
   inferring anything: the worst outcome of a false positive is being asked
   again, which is a shrug. */
export function isFirstRun(storage:Pick<Storage,"getItem">){
 try{
  return storage.getItem(APP_MODE_STORAGE_KEY)===null&&storage.getItem(FLEET_STORAGE_KEY_FOR_FIRST_RUN)===null;
 }catch{return false}
}
