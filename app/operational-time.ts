export type OperationalTimeBus={
 l:string;
 s:string;
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
};

function validIso(value:string|undefined,fallback:string){
 return value&&Number.isFinite(Date.parse(value))?value:fallback;
}

export function normalizeOperationalTimestamps<T extends OperationalTimeBus>(bus:T,fallback=new Date().toISOString()):T&{parkedAt:string;lastLocationChangeAt:string;lastStatusChangeAt:string}{
 const legacy=validIso(bus.parkedAt,fallback),lastLocationChangeAt=validIso(bus.lastLocationChangeAt,legacy),lastStatusChangeAt=validIso(bus.lastStatusChangeAt,legacy),operationalAt=Date.parse(lastLocationChangeAt)>=Date.parse(lastStatusChangeAt)?lastLocationChangeAt:lastStatusChangeAt;
 return {...bus,parkedAt:operationalAt,lastLocationChangeAt,lastStatusChangeAt};
}

export function operationalUpdateAt(bus:OperationalTimeBus,fallback=new Date().toISOString()){
 const normalized=normalizeOperationalTimestamps(bus,fallback),locationTime=Date.parse(normalized.lastLocationChangeAt),statusTime=Date.parse(normalized.lastStatusChangeAt);
 return locationTime>=statusTime?normalized.lastLocationChangeAt:normalized.lastStatusChangeAt;
}

export function operationalAgeMs(bus:OperationalTimeBus,now=Date.now()){
 return Math.max(0,now-Date.parse(operationalUpdateAt(bus,new Date(now).toISOString())));
}

export function stampOperationalChange<T extends OperationalTimeBus>(previous:T,next:T,now=new Date().toISOString()):T&{parkedAt:string;lastLocationChangeAt:string;lastStatusChangeAt:string}{
 const baseline=normalizeOperationalTimestamps(previous,now),lastLocationChangeAt=previous.l===next.l?baseline.lastLocationChangeAt:now,lastStatusChangeAt=previous.s===next.s?baseline.lastStatusChangeAt:now;
 return {...next,parkedAt:Date.parse(lastLocationChangeAt)>=Date.parse(lastStatusChangeAt)?lastLocationChangeAt:lastStatusChangeAt,lastLocationChangeAt,lastStatusChangeAt};
}
