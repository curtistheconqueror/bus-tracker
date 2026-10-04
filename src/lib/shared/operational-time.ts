import {transitionMileageEstimate} from "../fleet/mileage-estimate.ts";

/* WHY `bay-12` IS STILL TESTED BY NAME HERE, AND MUST NOT BE DELETED.

   Checked during Phase 0 of issue #21 and very nearly removed as dead code,
   which would have been a regression. Writing down what was actually found so
   the next person does not have to re-derive it.

   SHOP BAYS is `facilitySlots("bay",9,1)` - `bay-1` through `bay-9`. There is
   no `bay-12` in the layout, and the move editor cannot put a bus there. So the
   check reads like a leftover from when the shop bays ran to 12.

   It is not, because of WHERE the migration lives. `page.tsx` rewrites any bus
   found at `bay-10/11/12` into a retained bay or an overflow slot - but
   `migrateFacilitySlots` is local to that file, is not exported, and only ever
   feeds React state. It never writes the corrected board back to
   `pace-board-v1`. The Defect Log reads the SAME key raw and calls
   `stampOperationalChange` through `defect-log-sync.ts`, so a legacy bus still
   stored at `bay-12` reaches this function without ever passing the migration.

   The name is also two different things in this app, which is the trap that
   made it look dead. The BAY 12 badge on the awareness board means TROUBLE BAY
   11 and 12 - garage grid columns, via `isGarageTroubleBayIndex`. This one
   means the old SHOP bay 12. Same words, different places.

   Deleting this is safe only once the bay migration is persisted rather than
   held in one page's state. That is a change to how the board is written, not a
   tidy-up, and it belongs to Phase 1 rather than here. */
export type OperationalTimeBus={
 l:string;
 s:string;
 parkedAt?:string;
 lastLocationChangeAt?:string;
 lastStatusChangeAt?:string;
 lastMovedFrom?:string;
 bay12Watch?:boolean;
 defects?:{state?:string}[];
 odometerReadings?:unknown;
 maintenanceEvents?:unknown;
 mileageEstimate?:unknown;
};

function validIso(value:string|undefined,fallback:string){
 return value&&Number.isFinite(Date.parse(value))?value:fallback;
}

function activeDefects(bus:OperationalTimeBus){return Boolean(bus.defects?.some(defect=>defect.state!=="completed"))}

export function normalizeOperationalTimestamps<T extends OperationalTimeBus>(bus:T,fallback=new Date().toISOString()):T&{parkedAt:string;lastLocationChangeAt:string;lastStatusChangeAt:string}{
 const legacy=validIso(bus.parkedAt,fallback),lastLocationChangeAt=validIso(bus.lastLocationChangeAt,legacy),lastStatusChangeAt=validIso(bus.lastStatusChangeAt,legacy),operationalAt=Date.parse(lastLocationChangeAt)>=Date.parse(lastStatusChangeAt)?lastLocationChangeAt:lastStatusChangeAt,bay12Watch=activeDefects(bus)&&Boolean(bus.bay12Watch||bus.l==="bay-12");
 return {...bus,bay12Watch,parkedAt:operationalAt,lastLocationChangeAt,lastStatusChangeAt};
}

export function operationalUpdateAt(bus:OperationalTimeBus,fallback=new Date().toISOString()){
 const normalized=normalizeOperationalTimestamps(bus,fallback),locationTime=Date.parse(normalized.lastLocationChangeAt),statusTime=Date.parse(normalized.lastStatusChangeAt);
 return locationTime>=statusTime?normalized.lastLocationChangeAt:normalized.lastStatusChangeAt;
}

export function operationalAgeMs(bus:OperationalTimeBus,now=Date.now()){
 return Math.max(0,now-Date.parse(operationalUpdateAt(bus,new Date(now).toISOString())));
}

export function stampOperationalChange<T extends OperationalTimeBus>(previous:T,next:T,now=new Date().toISOString()):T&{parkedAt:string;lastLocationChangeAt:string;lastStatusChangeAt:string}{
 const moved=previous.l!==next.l,baseline=normalizeOperationalTimestamps(previous,now),lastLocationChangeAt=moved?now:baseline.lastLocationChangeAt,lastStatusChangeAt=previous.s===next.s?baseline.lastStatusChangeAt:now,lastMovedFrom=moved?previous.l:previous.lastMovedFrom,bay12Watch=activeDefects(next)&&Boolean(previous.bay12Watch||previous.l==="bay-12"||next.l==="bay-12");
 const mileage=transitionMileageEstimate(previous,next,now);
 return {...next,...mileage,lastMovedFrom,bay12Watch,parkedAt:Date.parse(lastLocationChangeAt)>=Date.parse(lastStatusChangeAt)?lastLocationChangeAt:lastStatusChangeAt,lastLocationChangeAt,lastStatusChangeAt};
}
