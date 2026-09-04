/* The Down Sheet's settings as one value: what they are, what they default
   to, how a saved copy is read back, and how one is written. Data only - no
   JSX - so the shared Settings page, the Down Sheet and the test runner can
   all import it.

   The key (pace-down-sheet-settings-v1) holds more than this. The Down Sheet
   also keeps its quick note and its sort order there, written from the sheet
   itself and never shown on the Settings page. That is why the write below
   merges over the stored copy rather than replacing it: changing a default
   shift on the Settings page must not blank a note somebody typed on the
   sheet. */

import {DOWN_SHEET_SETTINGS_STORAGE_KEY,writeSetting} from "../storage.ts";
import {normalizeDownSheetDisplay,type DownSheetDisplaySettings} from "./down-sheet-display-settings.ts";

export type Shift="1st"|"2nd"|"3rd";
export type DownSheetSettings={showCompleted:boolean;defaultInitials:string;defaultShift:Shift;display:DownSheetDisplaySettings};
export const DOWN_SHEET_SETTINGS_KEY=DOWN_SHEET_SETTINGS_STORAGE_KEY;

/* The same reading the Down Sheet does on load, so a value written by the
   Settings page and a value written by the sheet read back identically. */
export function readDownSheetSettings(raw:string|null):DownSheetSettings{
 let saved:Record<string,unknown>={};
 try{saved=JSON.parse(raw||"{}")||{}}catch{saved={}}
 const shift=saved.defaultShift;
 return {
  showCompleted:saved.showCompleted===true,
  defaultInitials:typeof saved.defaultInitials==="string"?saved.defaultInitials:"",
  defaultShift:shift==="2nd"||shift==="3rd"?shift:"1st",
  display:normalizeDownSheetDisplay(saved.display),
 };
}

export function writeDownSheetSettings(storage:Pick<Storage,"getItem"|"setItem">,next:DownSheetSettings){
 let current:Record<string,unknown>={};
 try{current=JSON.parse(storage.getItem(DOWN_SHEET_SETTINGS_KEY)||"{}")||{}}catch{current={}}
 return writeSetting(storage,DOWN_SHEET_SETTINGS_KEY,JSON.stringify({...current,
  showCompleted:next.showCompleted,defaultInitials:next.defaultInitials,defaultShift:next.defaultShift,display:next.display}));
}
