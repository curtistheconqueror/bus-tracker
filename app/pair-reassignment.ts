import {statusForLocation,type MovableRepairBus} from "./smart-status.ts";
import {stampOperationalChange} from "./operational-time.ts";

export type PairReassignmentError="missing-bus"|"same-bus"|"insufficient-space"|null;

export function reassignBusPair<T extends MovableRepairBus>(fleet:T[],selectedOverride:T,otherId:string,displacedTargetSlots:string[]|null,now=new Date().toISOString()):{fleet:T[];error:PairReassignmentError;displacedLocation:string|null}{
 const selected=fleet.find(bus=>bus.id===selectedOverride.id),other=fleet.find(bus=>bus.id===otherId);
 if(!selected||!other)return {fleet,error:"missing-bus",displacedLocation:null};
 if(selected.id===other.id)return {fleet,error:"same-bus",displacedLocation:null};
 const selectedTarget=other.l,displacedLocation=displacedTargetSlots===null?selected.l:displacedTargetSlots.find(slot=>slot!==selectedTarget&&!fleet.some(bus=>bus.id!==selected.id&&bus.id!==other.id&&bus.l===slot));
 if(!displacedLocation)return {fleet,error:"insufficient-space",displacedLocation:null};
 const selectedMove={...selectedOverride,l:selectedTarget,s:statusForLocation(selectedTarget,selectedOverride.s,selectedOverride)} as T;
 const otherMove={...other,l:displacedLocation,s:statusForLocation(displacedLocation,other.s,other)} as T;
 const nextSelected=stampOperationalChange(selected,selectedMove,now) as T;
 const nextOther=stampOperationalChange(other,otherMove,now) as T;
 return {fleet:fleet.map(bus=>bus.id===selected.id?nextSelected:bus.id===other.id?nextOther:bus),error:null,displacedLocation};
}