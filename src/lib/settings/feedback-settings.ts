/* ANYTHING THE APP DOES THAT YOU CAN HEAR OR FEEL, AND IT IS OFF UNTIL ASKED.

   Curtis: "make sure the sound is off by default ok? Any sounds. Toggleable
   in settings."

   At the time he asked, this app made NO SOUND AT ALL — no AudioContext, no
   Audio element, no audio file in the repository, no speech synthesis. The
   only thing it did that a person could perceive without looking was a short
   vibration when a bus is picked up on the Facility Map, added the same day.

   So there was nothing to switch off, which is exactly why this file exists
   rather than a one-line fix: the thing worth building is not an off switch
   for a sound that does not exist, it is a gate that a sound added in six
   months cannot get around. `tests/settings.test.mjs` reads the whole source
   tree and fails if `navigator.vibrate`, `AudioContext`, `new Audio`, an
   audio file or `speechSynthesis` is named anywhere outside this module. That
   test is the guarantee. This file is just where the guarantee is kept.

   TWO FLAGS, ONE KEY, BOTH OFF. A buzz is not a sound and conflating them
   would answer a question he did not ask: he can have the phone shake in a
   loud garage without it chirping on a quiet one. Both start off because that
   is what he asked for, and because the cost of each default is not
   symmetrical — a phone that stays quiet until somebody wants noise annoys
   nobody, and a phone that chirps in a meeting is uninstalled.

   OFF IS THE SAFE READ, which inverts the rule its neighbour follows.
   `app-mode.ts` resolves an unreadable record to FULL, because taking pages
   away from a mechanic mid-shift over one bad write is worse than showing too
   much. Here the generous reading is the harmful one: a corrupt record must
   not be what makes a phone start making noise. So anything that is not
   EXACTLY the boolean `true` — missing, corrupt, a string "yes", a 1 — reads
   as off, the same spelling discipline `setBusHold` and the ledger's `gap`
   field follow, so a hand-edited file cannot turn this on by accident.

   PER DEVICE, NEVER SYNCED. It describes the phone in somebody's pocket and
   the room they are standing in, for the reason the sweep and the shift hours
   are device-local: a setting that travelled would have one person's quiet
   shift silence another person's. It holds no fleet data, so losing it costs
   one visit to Settings. */

type StorageReader=Pick<Storage,"getItem">;
type StorageWriter=Pick<Storage,"getItem"|"setItem">;

export const FEEDBACK_SETTINGS_KEY="pace-feedback-settings-v1";

export type FeedbackSettings={sound:boolean;vibration:boolean};

/* Both false, and this object is copied rather than handed out, so a caller
   that mutates what it reads cannot turn the default on for everybody else. */
export const DEFAULT_FEEDBACK:FeedbackSettings={sound:false,vibration:false};

export function readFeedbackSettings(raw:string|null):FeedbackSettings{
 try{
  const saved=JSON.parse(raw||"null") as Partial<FeedbackSettings>|null;
  if(!saved||typeof saved!=="object")return {...DEFAULT_FEEDBACK};
  return {sound:saved.sound===true,vibration:saved.vibration===true};
 }catch{return {...DEFAULT_FEEDBACK}}
}

export function serializeFeedbackSettings(settings:FeedbackSettings){
 return JSON.stringify({version:1,sound:settings.sound===true,vibration:settings.vibration===true});
}

export function loadFeedbackSettings(storage:StorageReader):FeedbackSettings{
 try{return readFeedbackSettings(storage.getItem(FEEDBACK_SETTINGS_KEY))}
 catch{return {...DEFAULT_FEEDBACK}}
}

export function saveFeedbackSettings(storage:StorageWriter,settings:FeedbackSettings){
 try{storage.setItem(FEEDBACK_SETTINGS_KEY,serializeFeedbackSettings(settings));return true}
 catch{return false}
}

/* THE ONLY PLACE IN THE APP THAT MAY TOUCH navigator.vibrate.

   Reads the setting at the moment of the buzz rather than taking it as a
   prop: the alternative is plumbing a flag from the page root through every
   component that might ever want to buzz, and a stale copy of it is a phone
   that keeps vibrating after somebody has just turned it off — which is
   precisely the moment they are watching to see whether it worked. One
   LocalStorage read on a gesture a person performs deliberately is not a cost
   worth optimising against that.

   Returns whether it actually buzzed, so a caller can tell "off" from "this
   device cannot" if it ever needs to. Nothing throws: iOS has no vibrate at
   all, and a browser may refuse one without user activation. */
export function buzz(storage:StorageReader,pattern:number|number[]):boolean{
 if(!loadFeedbackSettings(storage).vibration)return false;
 try{
  if(typeof navigator==="undefined"||typeof navigator.vibrate!=="function")return false;
  return navigator.vibrate(pattern)===true;
 }catch{return false}
}

/* The gate for anything AUDIBLE. There is nothing to play yet, so this file
   deliberately does not invent a tone generator nobody asked for — but
   whatever plays the first sound must ask here first, and the test that scans
   the tree for audio APIs is what makes that unavoidable rather than polite. */
export function soundAllowed(storage:StorageReader):boolean{
 return loadFeedbackSettings(storage).sound;
}
