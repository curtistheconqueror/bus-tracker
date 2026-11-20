// Shared by browser writers and the network client; no environment or network access.
export const PAIR_RECOVERY_KEY="pace-down-sheet-pair-recovery-v1";
export function pairRecoveryPending(storage){try{return storage.getItem(PAIR_RECOVERY_KEY)!=null}catch{return true}}
export function pairWriteAllowed(storage,operationId){
 try{const raw=storage.getItem(PAIR_RECOVERY_KEY);return raw==null||Boolean(operationId&&JSON.parse(raw)?.id===operationId)}catch{return false}
}
export function browserPairRecoveryPending(){try{return typeof localStorage!=="undefined"&&pairRecoveryPending(localStorage)}catch{return true}}
