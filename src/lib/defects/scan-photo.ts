/* Shrinks a phone photo to something the scan route will accept, without
   touching a JPEG that is already small enough. Shared by every sheet scanner
   so the size rule lives in one place: the Down Sheet scan and the farebox /
   Ventra sweep scan send pages through the same door and the same limit. */

export const MAX_SCAN_BYTES=700*1024;

export async function scanReadyPhoto(file:File,page:number,namePrefix="sheet-page"){
 if(file.size<=MAX_SCAN_BYTES&&file.type==="image/jpeg")return file;
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const element=new Image();element.onload=()=>resolve(element);element.onerror=()=>reject(new Error("One selected photo could not be prepared."));element.src=url});
  const longest=Math.max(image.naturalWidth,image.naturalHeight),scale=Math.min(1,2400/longest),canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext("2d");if(!context)throw new Error("One selected photo could not be prepared.");
  context.drawImage(image,0,0,canvas.width,canvas.height);
  let quality=.82,blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
  while(blob&&blob.size>MAX_SCAN_BYTES&&quality>.38){quality-=.07;blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality))}
  if(blob&&blob.size>MAX_SCAN_BYTES){const reduction=Math.min(.92,Math.sqrt(MAX_SCAN_BYTES/blob.size)*.9),width=Math.max(1,Math.round(canvas.width*reduction)),height=Math.max(1,Math.round(canvas.height*reduction)),smaller=document.createElement("canvas");smaller.width=width;smaller.height=height;const smallerContext=smaller.getContext("2d");if(!smallerContext)throw new Error("One selected photo could not be prepared.");smallerContext.drawImage(canvas,0,0,width,height);blob=await new Promise<Blob|null>(resolve=>smaller.toBlob(resolve,"image/jpeg",.72))}
  if(!blob)throw new Error("One selected photo could not be prepared.");
  return new File([blob],`${namePrefix}-${page}.jpg`,{type:"image/jpeg",lastModified:Date.now()});
 }finally{URL.revokeObjectURL(url)}
}
