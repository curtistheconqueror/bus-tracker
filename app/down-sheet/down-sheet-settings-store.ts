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
import {DOWN_SHEET_GROUPS,normalizeDownSheetSectionOrder,type DownSheetGroupKey} from "./down-sheet-view.ts";
export {DOWN_SHEET_GROUPS};
export type {DownSheetGroupKey};

export type Shift="1st"|"2nd"|"3rd";

/* The tiles that are NOT on by default.

   The scoreboard grew to fourteen tiles and became a wall somebody has to read
   past to reach the sheet. Eight of them are what the shop actually reads —
   they are hard-coded in the order Curtis gave, because that order is the
   point. These six are real numbers that most days nobody needs, so they are
   opt-in per device rather than deleted: the count is still computed, it is
   just not on the board unless somebody asked for it. */
export const OPTIONAL_DOWN_TILES=[
 {key:"off-property",label:"OFF PROPERTY"},
 {key:"pending",label:"PENDING"},
 {key:"accident",label:"ACCIDENT"},
 {key:"waiting",label:"WAITING PARTS"},
 {key:"labor",label:"EST. ACTIVE LABOR"},
 {key:"capacity",label:"SHEET CAPACITY"},
] as const;
export type OptionalDownTile=(typeof OPTIONAL_DOWN_TILES)[number]["key"];
const OPTIONAL_TILE_KEYS:string[]=OPTIONAL_DOWN_TILES.map(tile=>tile.key);

export type DownSheetSettings={showCompleted:boolean;defaultInitials:string;defaultShift:Shift;extraTiles:OptionalDownTile[];showQuickNotes:boolean;sectionOrder:DownSheetGroupKey[];display:DownSheetDisplaySettings};
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
  /* Unknown names are dropped rather than carried: a tile that no longer
     exists must not keep a slot on a board that renders by this list. */
  extraTiles:(Array.isArray(saved.extraTiles)?saved.extraTiles:[]).filter((key:unknown):key is OptionalDownTile=>typeof key==="string"&&OPTIONAL_TILE_KEYS.includes(key)),
  /* Off unless somebody turned it on. Distinct from `quickNotes`, which is the
     NOTE ITSELF and has lived in this same blob since before there was a
     switch — reusing that name would have made turning the panel off delete
     what was written in it. */
  showQuickNotes:saved.showQuickNotes===true,
  sectionOrder:normalizeDownSheetSectionOrder(saved.sectionOrder),
  display:normalizeDownSheetDisplay(saved.display),
 };
}

export function writeDownSheetSettings(storage:Pick<Storage,"getItem"|"setItem">,next:DownSheetSettings){
 let current:Record<string,unknown>={};
 try{current=JSON.parse(storage.getItem(DOWN_SHEET_SETTINGS_KEY)||"{}")||{}}catch{current={}}
 return writeSetting(storage,DOWN_SHEET_SETTINGS_KEY,JSON.stringify({...current,
  showCompleted:next.showCompleted,defaultInitials:next.defaultInitials,defaultShift:next.defaultShift,
  extraTiles:next.extraTiles,showQuickNotes:next.showQuickNotes,sectionOrder:next.sectionOrder,display:next.display}));
}
