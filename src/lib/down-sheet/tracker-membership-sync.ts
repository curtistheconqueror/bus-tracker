export type TrackerDownSheetBus={
 id:string;n:string;s:string;down:boolean;mechanic?:string;shift?:string;roadcall?:boolean;
 parkedAt?:string;pendingRepair?:string;
};

type StoredEntry={
 id:string;defectId?:string;busId:string;busNumber:string;category:string;repair:string;customReason:string;
 assignmentType:string;assignedTo:string;section:string;shift:string;workflow:string;
 operationalStatus:string;priority:string;createdAt:string;updatedAt:string;updatedBy:string;
 completedAt:string;history:unknown[];
};

function shiftLabel(value?:string){return value==="Evening"?"2nd":value==="Night"?"3rd":"1st"}

export function syncTrackerDownSheetSelection(raw:string|null,bus:TrackerDownSheetBus,now=new Date().toISOString(),updatedBy="",defectId=""){
 let payload:{version:number;entries:StoredEntry[]}={version:1,entries:[]};
 try{const parsed=raw?JSON.parse(raw):null,entries=Array.isArray(parsed)?parsed:parsed?.entries;if(Array.isArray(entries))payload={version:1,entries}}catch{}
 const active=payload.entries.find(entry=>entry.busId===bus.id&&entry.workflow!=="Completed");
 if(bus.down&&!active){
  payload.entries.push({id:"repair-"+bus.id+"-"+now.replace(/\D/g,""),...(defectId?{defectId}:{}),busId:bus.id,busNumber:bus.n,category:"Miscellaneous",repair:bus.pendingRepair?.trim()||"Repair required",customReason:"",assignmentType:"Mechanic",assignedTo:bus.mechanic||"",section:bus.roadcall?"Roadcall":"Pending",shift:shiftLabel(bus.shift),workflow:bus.s==="shop"?"In Progress":"Scheduled",operationalStatus:bus.s,priority:"Routine",createdAt:bus.parkedAt||now,updatedAt:now,updatedBy,completedAt:"",history:[]});
 }
 if(bus.down&&active&&defectId&&!active.defectId){
  payload.entries=payload.entries.map(entry=>entry===active?{...entry,defectId}:entry);
 }
 if(!bus.down&&active){
  payload.entries=payload.entries.map(entry=>entry===active?{...entry,workflow:"Completed",completedAt:now,updatedAt:now,updatedBy:updatedBy||entry.updatedBy}:entry);
 }
 return payload;
}
