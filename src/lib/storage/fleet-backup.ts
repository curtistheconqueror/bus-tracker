import {BOARD_SETTINGS_STORAGE_KEY,DEFECT_LOG_SETTINGS_STORAGE_KEY,DOWN_SHEET_SETTINGS_STORAGE_KEY,DOWN_SHEET_STORAGE_KEY,markFleetBackupExported} from "./storage.ts";
import {PARTS_MEMORY_STORAGE_KEY} from "../defects/parts-memory.ts";
import {BUS_LISTS_STORAGE_KEY,BUS_LIST_TEMPLATES_STORAGE_KEY} from "../fleet/bus-lists.ts";
import {FINDINGS_MEMORY_STORAGE_KEY} from "../defects/findings-memory.ts";
import {PATH_TO_REPAIR_KEY} from "../defects/path-to-repair.ts";
import {REPAIR_HOURS_KEY} from "../defects/repair-hours-ledger.ts";
import {shareOrDownloadFile} from "../shared/share-file.ts";

/* Three buttons in this app write a file that CANNOT be read back in, and one
   writes the file that can. They used to be named the same way — EXPORT LOG
   next to EXPORT / SHARE BACKUP — and the difference only shows up on the day
   somebody tries to restore a phone from the wrong one and finds out it was a
   report all along.

   The word REPORT in every one of those three labels is what carries that, and
   this hint is the long version behind them. It lives beside the backup itself
   so the two can never be described inconsistently. */
import {SHEET_LEDGER_KEY} from "../down-sheet/sheet-ledger.ts";

export const REPORT_EXPORT_HINT="Report only — a snapshot to read or send to somebody. This file cannot be imported back into the app. To move this section to another device use the transfer above it; to back the whole app up use MASTER EXPORT in Settings.";

function readSavedValue(storage:Pick<Storage,"getItem">,key:string){
 try{return JSON.parse(storage.getItem(key)||"null")}catch{return null}
}

/* THIS FILE CARRIES A BUS'S `hold` AND THAT IS DELIBERATE — do not add a
   filter here to match section-transfer's MAP_EXCLUDED.

   A hold is device-local: it is held back from the Shop Cloud and from a
   section transfer, because those SHARE one person's instruction with
   everybody. Curtis: "If someone is asked to hold a bus (like bay 12 guy) then
   they should know. It doesn't need to show up on everybody's screen."

   MASTER EXPORT is not sharing. It is a device CLONE — it already carries the
   board settings, the Down Sheet settings, the Defect Log settings, parts
   memory and findings memory, every one of which CLAUDE.md lists as per-device
   and never synced, and MASTER IMPORT is the one import in the app that
   REPLACES rather than merges. A foreman whose phone died should arrive on the
   new one with the holds he was told about, along with everything else that
   made it his device. Stripping `hold` here while keeping the rest would be
   the inconsistent choice, not the careful one. */
/* VERSION 6 ADDS THE TWO THINGS THE SHOP WRITES ABOUT A REPAIR: the PATH TO
   REPAIR writeups and the hours this shop says a repair takes.

   They were missing for the two releases they have existed, and the omission
   was an oversight rather than a decision. CLAUDE.md files them under "what the
   shop has taught it", beside parts memory and findings memory — and both of
   those have ridden this file from the start. Being DEVICE-LOCAL is not what
   keeps a key out of here, as the note above says in as many words: a device
   clone carries five keys that are per-device and never synced.

   It matters more for these two than for the memories beside them. A part
   number re-learns itself the next time somebody types it; a PTR writeup is
   somebody's account of how to approach a repair, written once, and nothing
   regenerates it. For PATH TO REPAIR this file is also the ONLY carrier there
   is — the Shop Cloud cannot take it without a `shop_memory` schema migration,
   which is Curtis's call and not done. */
export async function exportFleetBoardBackup(storage:Storage,buses:unknown[]){
 const exportedAt=new Date(),filename="fleet-board-"+exportedAt.toISOString().slice(0,10)+".json",payload={kind:"pace-south-fleet-board-backup",version:6,exportedAt:exportedAt.toISOString(),buses,settings:readSavedValue(storage,BOARD_SETTINGS_STORAGE_KEY),downSheet:readSavedValue(storage,DOWN_SHEET_STORAGE_KEY),downSheetSettings:readSavedValue(storage,DOWN_SHEET_SETTINGS_STORAGE_KEY),defectLogSettings:readSavedValue(storage,DEFECT_LOG_SETTINGS_STORAGE_KEY),partsMemory:readSavedValue(storage,PARTS_MEMORY_STORAGE_KEY),busLists:readSavedValue(storage,BUS_LISTS_STORAGE_KEY),busListTemplates:readSavedValue(storage,BUS_LIST_TEMPLATES_STORAGE_KEY),findingsMemory:readSavedValue(storage,FINDINGS_MEMORY_STORAGE_KEY),pathToRepairs:readSavedValue(storage,PATH_TO_REPAIR_KEY),repairHours:readSavedValue(storage,REPAIR_HOURS_KEY),sheetLedger:readSavedValue(storage,SHEET_LEDGER_KEY)},contents=JSON.stringify(payload,null,2),blob=new Blob([contents],{type:"application/json"});
 const outcome=await shareOrDownloadFile(blob,filename,"Fleet Board Backup");
 if(outcome==="cancelled")return false;
 markFleetBackupExported(storage,buses,exportedAt.toISOString());
 return true;
}
