"use client";
import {useEffect,useState} from "react";
import {FLEET_RECOVERY_STORAGE_KEY,readFleetPayload,readFleetRecoverySnapshot,writeFleetStorage,type FleetRecoverySnapshot} from "./storage";

function savedLabel(value:string){
 const date=new Date(value);
 return Number.isNaN(date.getTime())?"saved copy":date.toLocaleString();
}

export default function FleetRecoveryControl(){
 const [snapshot,setSnapshot]=useState<FleetRecoverySnapshot|null>(null);
 useEffect(()=>setSnapshot(readFleetRecoverySnapshot(localStorage.getItem(FLEET_RECOVERY_STORAGE_KEY))),[]);
 const restore=()=>{
  if(!snapshot)return;
  const payload=readFleetPayload(snapshot.raw);
  if(!payload.valid||!payload.supported||!confirm("Restore the last-known-good copy from "+savedLabel(snapshot.savedAt)+"? It contains "+snapshot.defectCount+" saved defect"+(snapshot.defectCount===1?"":"s")+" across "+snapshot.busCount+" buses."))return;
  if(!writeFleetStorage(localStorage,payload.buses,{allowBulkDefectLoss:true,skipRecoverySnapshot:true})){alert("The recovery copy could not be restored. Export the current board before trying again.");return}
  alert("The last-known-good copy was restored. The Fleet Tracker will reload now.");
  window.location.reload();
 };
 return <div className="board-recovery"><button type="button" onClick={restore} disabled={!snapshot}>RESTORE LAST GOOD COPY{snapshot?" · "+snapshot.defectCount+" DEFECTS":""}</button><small>{snapshot?"Device-local recovery saved "+savedLabel(snapshot.savedAt)+".":"A recovery copy will appear after the next successful board change."} Browser-data clearing can erase this copy too, so exported files remain the safest offline backup.</small></div>;
}