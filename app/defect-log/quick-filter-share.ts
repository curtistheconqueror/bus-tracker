import {defectLabel} from "../repair-catalog.ts";
import {quickFilterDefects,quickFilterFallbackLabel,type QuickFilterBus,type QuickFilterKey} from "../quick-filters.ts";

export type QuickFilterShareBus=QuickFilterBus&{n:string};

export function quickFilterShareText(label:string,buses:QuickFilterShareBus[],key:QuickFilterKey){
 const heading=label+" — "+buses.length+" bus"+(buses.length===1?"":"es");
 if(!buses.length)return heading+"\nNo buses currently match this filter.";
 return [heading,...buses.map(bus=>{
  const defects=quickFilterDefects(bus,key);
  return "Bus "+bus.n+" — "+(defects.length?defects.map(defectLabel).join("; "):quickFilterFallbackLabel(key));
 })].join("\n");
}
