"use client";
import {useEffect,useState} from "react";
import {exportFleetBoardBackup} from "../fleet-backup";
import {fleetBackupDue,FLEET_BACKUP_INTERVAL} from "../storage";

type BackupStatus={due:boolean;newLogs:number;current:number;interval:number};

export default function OfflineBackupReminder({buses,interval=FLEET_BACKUP_INTERVAL}:{buses:unknown[];interval?:number}){
 const [status,setStatus]=useState<BackupStatus|null>(null);
 /* The interval is a setting now, so a change to it has to re-ask immediately
    rather than at the next save. Lowering it while the banner is hidden should
    bring it straight up, and raising it should send it away. */
 useEffect(()=>{setStatus(fleetBackupDue(localStorage,buses,interval))},[buses,interval]);
 if(!status?.due)return null;
 const exportBackup=async()=>{if(await exportFleetBoardBackup(localStorage,buses))setStatus(fleetBackupDue(localStorage,buses,interval))};
 /* One block, read top to bottom: what is happening, then the thing to press.
    The heading and the button used to sit side by side in two different colours,
    which on a wide screen read as a second box shoved on top of the first. */
 return <aside className="offline-backup-reminder" role="status">
  <b>OFFLINE BACKUP DUE</b>
  <small>{status.newLogs} new Defect Log {status.newLogs===1?"entry has":"entries have"} been saved since the last full backup. Export now so this device&rsquo;s storage is not the only copy.</small>
  <button type="button" onClick={exportBackup}>EXPORT FULL BACKUP</button>
 </aside>;
}
