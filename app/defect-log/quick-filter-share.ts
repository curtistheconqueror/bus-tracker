import {defectLabel,isUnresolved,normalizeDefects} from "../repair-catalog.ts";
import type {QuickFilterKey} from "../quick-filters.ts";

export type QuickFilterShareBus={id:string;n:string;pendingRepair?:string;defects?:unknown};

export function quickFilterShareText(label:string,buses:QuickFilterShareBus[],key?:QuickFilterKey|null){
 const heading=label+" — "+buses.length+" bus"+(buses.length===1?"":"es");
 if(!buses.length)return heading+"\nNo buses currently match this filter.";
 return [heading,...buses.map(bus=>{
  const defects=normalizeDefects(bus.defects,bus.pendingRepair||"",bus.id).filter(defect=>key==="not-duplicated"?Boolean(defect.conditionNotDuplicated):isUnresolved(defect));
  return "Bus "+bus.n+" — "+(defects.length?defects.map(defectLabel).join("; "):"Tracker warning flag");
 })].join("\n");
}
