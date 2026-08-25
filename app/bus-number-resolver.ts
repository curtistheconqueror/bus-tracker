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

export type BusNumberListResolution<T extends BusNumberRecord>=
 | {kind:"text";tokens:[];buses:[];ambiguous:[];invalid:[];missing:[]}
 | {kind:"numbers";tokens:string[];buses:T[];ambiguous:Array<{query:string;matches:T[]}>;invalid:string[];missing:string[]};

export function resolveBusNumberList<T extends BusNumberRecord>(fleet:T[],raw:string):BusNumberListResolution<T>{
 const tokens=raw.trim().split(/[\s,]+/).filter(Boolean);
 if(!tokens.length||tokens.some(token=>!/^[0-9]+$/.test(token)))return {kind:"text",tokens:[],buses:[],ambiguous:[],invalid:[],missing:[]};
 const buses:T[]=[],seen=new Set<string>(),ambiguous:Array<{query:string;matches:T[]}>=[],invalid:string[]=[],missing:string[]=[];
 tokens.forEach(query=>{const result=resolveBusNumber(fleet,query);if(result.kind==="exact"||result.kind==="suffix"){if(!seen.has(result.bus.id)){seen.add(result.bus.id);buses.push(result.bus)}return}if(result.kind==="ambiguous"){ambiguous.push({query,matches:result.matches});return}if(result.kind==="invalid")invalid.push(query);else missing.push(query)});
 return {kind:"numbers",tokens,buses,ambiguous,invalid,missing};
}
