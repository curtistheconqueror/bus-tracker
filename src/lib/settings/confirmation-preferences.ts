// Confirmation prompts are per-device operator preferences. Both default to ON, so an
// unset, missing or damaged saved value always restores the safer prompting behavior.
// Import Backup is deliberately not covered here: replacing an entire board must always ask.

export function confirmationPreference(saved:unknown):boolean{return saved!==false}

export function confirmAction(enabled:boolean,message:string,ask:(message:string)=>boolean):boolean{
 return enabled?ask(message):true;
}
