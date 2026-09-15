export const ROAD_CAPACITY=75;
export const WEST_CAPACITY=40;

/* THE SHAPE OF THE MAIN GARAGE, IN ONE PLACE, because five places were each
   assuming it separately and they all have to agree.

   The garage is a grid, and a slot id carries its position in that grid
   arithmetically: `garage-N` sits at row `N / COLUMNS`, column `N % COLUMNS`.
   Every question about where a garage slot IS therefore depends on the WIDTH,
   and the width was written as a bare 12 in five different files:
   `GARAGE_STANDARD_SLOTS`, the two trouble-bay lists, the awareness test in
   `mystery-buses.ts`, and the grid the map draws.

   `mystery-buses.ts` is the one that made this worth fixing. It asked
   `slot%12>=10` to mean "the last two columns" - the trouble bays. Change the
   garage to ten wide or fourteen and that expression still runs, still returns
   a boolean, and quietly marks the WRONG buses. No error, no failing test, and
   the wrong answer lands on the awareness board a foreman actually reads.

   This is the `location-label.ts` rule one level down: a location is named
   through one table, and now its geometry comes from one set of numbers. */
export const GARAGE_ROWS=7;
export const GARAGE_COLUMNS=12;
/* The first column that is a TROUBLE BAY rather than a standard space, counted
   from zero. Columns 10 and 11 are the bays a person calls 11 and 12. It is
   stated as "where the trouble bays start" rather than as two separate column
   numbers so that the standard slots and the trouble bays cannot disagree
   about where the boundary is. */
export const GARAGE_TROUBLE_BAY_FIRST_COLUMN=10;
/* Curtis's own divider: BAYS 1-6 READY. Drawn before this column, counted from
   zero, so it separates bays 1-6 from 7-12. Geometry of the same grid, so it
   lives with the rest of it rather than inline in the markup. */
export const GARAGE_READY_BAY_DIVIDER_COLUMN=6;
/* 84 spaces. Derived rather than typed, so it can never drift from the grid it
   is supposed to count. */
export const GARAGE_CAPACITY=GARAGE_ROWS*GARAGE_COLUMNS;
/* Is this garage slot one of the trouble bays? The ONE place that answers it
   from the grid, so a width change moves every caller at once. */
export function isGarageTroubleBayIndex(slot:number){
 return Number.isInteger(slot)&&slot>=0&&slot%GARAGE_COLUMNS>=GARAGE_TROUBLE_BAY_FIRST_COLUMN;
}

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
