export const DOWN_SHEET_CLEAR_UNDO_KEY="pace-down-sheet-clear-undo-v1";

export type ClearableDownEntry={id:string;busId:string;workflow:string};
export type ClearableFleetBus={id:string;down?:boolean};

export type DownSheetClearSnapshot<E extends ClearableDownEntry>={
 version:1;
 clearedAt:string;
 entries:E[];
 downBusIds:string[];
};

export function clearDownSheetState<E extends ClearableDownEntry,F extends ClearableFleetBus>(entries:E[],fleet:F[],clearedAt=new Date().toISOString()){
 const snapshot:DownSheetClearSnapshot<E>={version:1,clearedAt,entries:entries.map(entry=>({...entry})),downBusIds:fleet.filter(bus=>bus.down===true).map(bus=>bus.id)};
 return {entries:[] as E[],fleet:fleet.map(bus=>bus.down?{...bus,down:false} as F:bus),snapshot,clearedEntries:entries.length,uncheckedBuses:snapshot.downBusIds.length};
}

export function restoreDownSheetState<E extends ClearableDownEntry,F extends ClearableFleetBus>(entries:E[],fleet:F[],snapshot:DownSheetClearSnapshot<E>){
 const currentIds=new Set(entries.map(entry=>entry.id)),currentActiveBusIds=new Set(entries.filter(entry=>entry.workflow!=="Completed").map(entry=>entry.busId));
 const restored=snapshot.entries.filter(entry=>!currentIds.has(entry.id)&&(entry.workflow==="Completed"||!currentActiveBusIds.has(entry.busId)));
 const downBusIds=new Set(snapshot.downBusIds),nextEntries=[...restored,...entries],nextFleet=fleet.map(bus=>downBusIds.has(bus.id)&&!bus.down?{...bus,down:true} as F:bus);
 return {entries:nextEntries,fleet:nextFleet,restoredEntries:restored.length,restoredBuses:nextFleet.filter((bus,index)=>bus.down===true&&fleet[index]?.down!==true).length,skippedEntries:snapshot.entries.length-restored.length};
}

export function readDownSheetClearSnapshot<E extends ClearableDownEntry>(raw:string|null):DownSheetClearSnapshot<E>|null{
 if(!raw)return null;
 try{
  const parsed=JSON.parse(raw) as Partial<DownSheetClearSnapshot<E>>;
  if(parsed.version!==1||!Array.isArray(parsed.entries)||!Array.isArray(parsed.downBusIds)||typeof parsed.clearedAt!=="string")return null;
  if(parsed.entries.some(entry=>!entry||typeof entry.id!=="string"||typeof entry.busId!=="string"||typeof entry.workflow!=="string"))return null;
  if(parsed.downBusIds.some(id=>typeof id!=="string"))return null;
  return parsed as DownSheetClearSnapshot<E>;
 }catch{return null}
}
