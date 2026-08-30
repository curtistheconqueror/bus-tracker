/* Getting a file off the device it was made on.

   Every export in this app used to build a blob URL, hang it on a detached
   anchor, and click it. That works on a computer and does not work on an iPhone.
   iOS Safari — a Home Screen app especially — treats the click as navigation
   rather than a download: it opens the JSON with `blob:https://<site>/<uuid>` in
   the address bar, which is what "it's saying blob" looks like from the floor.

   Sharing that page then shares the URL, not the file, and a blob URL is scoped
   to the session that created it. On the other device it resolves to
   `https://<site>/<uuid>`, a path that has never existed, and the iPad says the
   only thing it can: not found.

   So the share sheet comes first, with the real File in it, guarded by canShare
   because calling share() with files it will not take is its own failure. The
   anchor is the fallback for browsers with no share sheet, and it is put in the
   document before it is clicked, which Safari has always needed.

   One function, used by every export, so no single one of them can quietly go
   back to being a link nobody can open. */

export type ShareOutcome="shared"|"saved"|"cancelled";

export async function shareOrDownloadFile(blob:Blob,filename:string,title:string):Promise<ShareOutcome>{
 try{
  const file=new File([blob],filename,{type:blob.type||"application/octet-stream"});
  if(typeof navigator!=="undefined"&&navigator.share&&navigator.canShare?.({files:[file]})){
   await navigator.share({title,files:[file]});
   return "shared";
  }
 }catch(error){
  /* Dismissing the share sheet is a decision, not a failure, and must not fall
     through to a download the mechanic did not ask for. */
  if(error instanceof DOMException&&error.name==="AbortError")return "cancelled";
 }
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;
 link.download=filename;
 link.rel="noopener";
 document.body.appendChild(link);
 link.click();
 link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 return "saved";
}

export function shareOutcomeLabel(outcome:ShareOutcome,filename:string){
 return outcome==="shared"?"Sent.":outcome==="cancelled"?"":"Saved as "+filename;
}
