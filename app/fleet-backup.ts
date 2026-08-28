import {BOARD_SETTINGS_STORAGE_KEY,DEFECT_LOG_SETTINGS_STORAGE_KEY,DOWN_SHEET_SETTINGS_STORAGE_KEY,DOWN_SHEET_STORAGE_KEY,markFleetBackupExported} from "./storage.ts";
import {PARTS_MEMORY_STORAGE_KEY} from "./parts-memory.ts";
import {BUS_LISTS_STORAGE_KEY,BUS_LIST_TEMPLATES_STORAGE_KEY} from "./bus-lists.ts";
import {FINDINGS_MEMORY_STORAGE_KEY} from "./findings-memory.ts";

function readSavedValue(storage:Pick<Storage,"getItem">,key:string){
 try{return JSON.parse(storage.getItem(key)||"null")}catch{return null}
}

export async function exportFleetBoardBackup(storage:Storage,buses:unknown[]){
 const exportedAt=new Date(),filename="fleet-board-"+exportedAt.toISOString().slice(0,10)+".json",payload={kind:"pace-south-fleet-board-backup",version:5,exportedAt:exportedAt.toISOString(),buses,settings:readSavedValue(storage,BOARD_SETTINGS_STORAGE_KEY),downSheet:readSavedValue(storage,DOWN_SHEET_STORAGE_KEY),downSheetSettings:readSavedValue(storage,DOWN_SHEET_SETTINGS_STORAGE_KEY),defectLogSettings:readSavedValue(storage,DEFECT_LOG_SETTINGS_STORAGE_KEY),partsMemory:readSavedValue(storage,PARTS_MEMORY_STORAGE_KEY),busLists:readSavedValue(storage,BUS_LISTS_STORAGE_KEY),busListTemplates:readSavedValue(storage,BUS_LIST_TEMPLATES_STORAGE_KEY),findingsMemory:readSavedValue(storage,FINDINGS_MEMORY_STORAGE_KEY)},contents=JSON.stringify(payload,null,2),blob=new Blob([contents],{type:"application/json"});
 try{
  const file=new File([blob],filename,{type:"application/json"});
  if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:"Fleet Board Backup",text:"Fleet board backup created "+exportedAt.toLocaleString(),files:[file]});markFleetBackupExported(storage,buses,exportedAt.toISOString());return true}
 }catch(error){if(error instanceof DOMException&&error.name==="AbortError")return false}
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);markFleetBackupExported(storage,buses,exportedAt.toISOString());return true;
}
