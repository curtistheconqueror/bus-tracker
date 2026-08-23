export const ROAD_CAPACITY=75;
export const WEST_CAPACITY=40;

export function migrateReducedCapacity<T extends {l:string}>(source:T[],prefix:string,capacity:number):T[]{
 const retained=Array.from({length:capacity},(_,index)=>prefix+"-"+index);
 const migrated=source.map(bus=>({...bus})) as T[];
 const occupied=new Set(migrated.filter(bus=>retained.includes(bus.l)).map(bus=>bus.l));
 const displaced=migrated.filter(bus=>bus.l.startsWith(prefix+"-")&&!retained.includes(bus.l))
  .sort((a,b)=>locationOrder(a.l)-locationOrder(b.l));
 displaced.forEach((bus,index)=>{
  const open=retained.find(slot=>!occupied.has(slot));
  if(open){bus.l=open;occupied.add(open)}
  else bus.l=prefix+"-overflow-"+index;
 });
 return migrated;
}

export function migrateBrakeTowCapacities<T extends {l:string}>(source:T[]):T[]{
 const brakeSlots=Array.from({length:3},(_,index)=>"brake-"+index),towSlots=Array.from({length:4},(_,index)=>"tow-"+index),retained=[...brakeSlots,...towSlots];
 const migrated=source.map(bus=>({...bus})) as T[],occupied=new Set(migrated.filter(bus=>retained.includes(bus.l)).map(bus=>bus.l));
 const displaced=migrated.filter(bus=>bus.l==="brake-3"||bus.l.startsWith("brake-overflow-")||bus.l.startsWith("tow-overflow-"))
  .sort((a,b)=>locationOrder(a.l)-locationOrder(b.l));
 displaced.forEach((bus,index)=>{
  const open=["tow-3",...brakeSlots,...towSlots].find(slot=>!occupied.has(slot));
  if(open){bus.l=open;occupied.add(open)}
  else bus.l="tow-overflow-"+index;
 });
 return migrated;
}

function locationOrder(location:string){
 const match=location.match(/-(\d+)$/),index=match?Number(match[1]):0;
 return location.includes("-overflow-")?Number.MAX_SAFE_INTEGER/2+index:index;
}
