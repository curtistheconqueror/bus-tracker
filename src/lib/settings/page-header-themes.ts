/* WHICH HEADERS A PAGE THEME IS CURRENTLY DECIDING.

   Three of the eight surfaces carry a whole-page theme — the Facility Map,
   the Defect Log and Fixed Repairs — and a non-default one outranks the app's
   shared header colour (the ladder is in header-theme.ts). That is correct on
   the page and a LIE ON THE SETTINGS SCREEN unless Settings can see it: a row
   reading "following the one above", beside a navy swatch, over a page that
   draws olive, is the panel describing something the app will not do.

   So this reads the two keys those pages already own and answers one
   question: for each surface, what colour is its own theme imposing, if any.
   Nothing here writes, and nothing here is the source of those settings — the
   pages keep owning them. A missing, malformed or default-theme record simply
   yields no entry, which is the same answer as "that page is not deciding".

   The Defect Log and Fixed Repairs share `pace-defect-log-settings-v1`, which
   is not a mistake and not new: their appearance panels were built as one
   shape on purpose. One lookup answers for both. */

import {isHeaderColor,type HeaderSurface} from "./header-theme.ts";
import {THEMES as MAP_THEMES} from "./map-settings.ts";
import {LOG_THEMES} from "../defects/defect-log-settings.ts";

type StorageReader=Pick<Storage,"getItem">;

export const BOARD_SETTINGS_KEY="pace-board-settings-v1";
export const LOG_SETTINGS_KEY="pace-defect-log-settings-v1";

/* "default" on the map, "light" on the other two: the theme a device is on
   before anybody opens those panels, and the only one that defers. */
/* THE THEME TABLE ANSWERS FIRST AND THE STORED PALETTE SECOND, which is the
   other way round from how this was written.

   It read `visuals.header` / `appearance.header` out of the record and gave
   up if they were missing — reasonable, until you notice that those two keys
   hold a DERIVED copy of the theme, written beside the theme name by the
   panel that set it. A record with `theme:"tactical"` and no palette is an
   ordinary thing for an older build or a hand-seeded device to hold, and this
   answered "no theme" for it: measured, the Defect Log's header bar went navy
   while its own drawer, resolved from the page's normalised settings, stayed
   Tactical. The name is the fact; the palette is a copy of it.

   The palette still wins for `custom`, which has no table entry and is the
   one case where the stored colours ARE the decision. */
function themed(saved:unknown,defaultName:string,table:Record<string,string>,read:(record:Record<string,unknown>)=>unknown){
 if(!saved||typeof saved!=="object")return "";
 const record=saved as Record<string,unknown>;
 if(typeof record.theme!=="string"||record.theme===defaultName)return "";
 const named=table[record.theme];
 if(isHeaderColor(named))return named.trim();
 const colour=read(record);
 return isHeaderColor(colour)?colour.trim():"";
}

/* Built from the tables themselves, so a theme added to either one is carried
   here without a second list to keep in step. */
const MAP_HEADERS:Record<string,string>=Object.fromEntries(Object.entries(MAP_THEMES).map(([key,theme])=>[key,theme.visuals.header]));
const PAGE_HEADERS:Record<string,string>=Object.fromEntries(Object.entries(LOG_THEMES).map(([key,theme])=>[key,theme.appearance.header]));
function parse(raw:string|null){
 try{return JSON.parse(raw||"null") as unknown}catch{return null}
}

/* THE RULE, over values rather than over JSON, so the Settings screen can pass
   the live settings it is already holding instead of re-reading the file.

   It held a snapshot read once on mount at first. On that screen the Defect
   Log's own appearance panel is a few rows further down the same page, so
   picking a theme there left these rows describing the theme before it until
   the next visit — the panel going stale about the very thing it exists to
   report. One rule, two callers, no second copy of the state. */
export function pageHeaderThemes(board:unknown,log:unknown):Partial<Record<HeaderSurface,string>>{
 const out:Partial<Record<HeaderSurface,string>>={};
 const map=themed(board,"default",MAP_HEADERS,record=>{
  const visuals=record.visuals;
  return visuals&&typeof visuals==="object"?(visuals as Record<string,unknown>).header:undefined;
 });
 const page=themed(log,"light",PAGE_HEADERS,record=>{
  const appearance=record.appearance;
  return appearance&&typeof appearance==="object"?(appearance as Record<string,unknown>).header:undefined;
 });
 /* Written only when there is one, the absence spelling `setBusHold` and the
    ledger's `gap` use, so `"log" in themes` answers the question directly. */
 if(map)out.map=map;
 if(page){out.log=page;out.fixed=page}
 return out;
}

export function readPageHeaderThemes(board:string|null,log:string|null){
 return pageHeaderThemes(parse(board),parse(log));
}

export function loadPageHeaderThemes(storage:StorageReader):Partial<Record<HeaderSurface,string>>{
 try{return readPageHeaderThemes(storage.getItem(BOARD_SETTINGS_KEY),storage.getItem(LOG_SETTINGS_KEY))}
 catch{return {}}
}
