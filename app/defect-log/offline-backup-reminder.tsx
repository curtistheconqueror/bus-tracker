"use client";
import {useEffect,useState} from "react";
import {exportFleetBoardBackup} from "../fleet-backup";
import {fleetBackupDue} from "../storage";

type BackupStatus={due:boolean;newLogs:number;current:number;interval:number};

export default function OfflineBackupReminder({buses}:{buses:unknown[]}){
 const [status,setStatus]=useState<BackupStatus|null>(null);
 const refresh=()=>setStatus(fleetBackupDue(localStorage,buses));
 useEffect(refresh,[buses]);
 if(!status?.due)return null;
 const exportBackup=async()=>{if(await exportFleetBoardBackup(localStorage,buses))refresh()};
 return <aside className="offline-backup-reminder" role="status"><span><b>OFFLINE BACKUP DUE</b><small>{status.newLogs} new Defect Log entries have been saved since the last full backup. Export now so Safari storage is not the only copy.</small></span><button type="button" onClick={exportBackup}>EXPORT FULL BACKUP</button></aside>;
}