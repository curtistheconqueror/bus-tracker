export type BusNumberRecord={id:string;n:string};

export type BusNumberResolution<T extends BusNumberRecord>=
 | {kind:"exact"|"suffix";query:string;matches:[T];bus:T}
 | {kind:"ambiguous";query:string;matchType:"exact"|"suffix";matches:T[]}
 | {kind:"not-found"|"invalid";query:string;matches:[]};

export function resolveBusNumber<T extends BusNumberRecord>(fleet:T[],raw:string):BusNumberResolution<T>{
 const query=raw.trim();
 if(!query||!/^\d+$/.test(query))return {kind:"invalid",query,matches:[]};
 const exact=fleet.filter(bus=>bus.n===query);
 if(exact.length===1)return {kind:"exact",query,matches:[exact[0]],bus:exact[0]};
 if(exact.length>1)return {kind:"ambiguous",query,matchType:"exact",matches:exact};
 if(query.length!==2)return {kind:"invalid",query,matches:[]};
 const suffix=fleet.filter(bus=>bus.n.endsWith(query));
 if(suffix.length===1)return {kind:"suffix",query,matches:[suffix[0]],bus:suffix[0]};
 if(suffix.length>1)return {kind:"ambiguous",query,matchType:"suffix",matches:suffix};
 return {kind:"not-found",query,matches:[]};
}

export function candidateBusNumbers<T extends BusNumberRecord>(matches:T[]):string[]{
 return [...new Set(matches.map(bus=>bus.n))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
