export type LocatedBus={l:string};

export function sectionBusCount<T extends LocatedBus>(buses:T[],sectionSlots:string[]){
 const prefixes=[...new Set(sectionSlots.map(slot=>slot.split("-")[0]))];
 return buses.filter(bus=>sectionSlots.includes(bus.l)||prefixes.some(prefix=>bus.l.startsWith(prefix+"-overflow-"))).length;
}
