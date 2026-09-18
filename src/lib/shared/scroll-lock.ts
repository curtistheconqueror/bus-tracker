/* Hold the page still while a full-screen editor is open.

   The Defect Log has carried a lock since it was built, and it never worked.
   It set `overflow:hidden` on <body>, but in this app the element that actually
   scrolls is <html>, so the rule stopped nothing: opening the editor and
   flicking over it dragged the page behind by 2,462px on a phone. The Down
   Sheet had no lock at all and dragged by 610px. Curtis reported the second one
   and it turned out both surfaces had it.

   So the class goes on both elements and the stylesheet targets both. Two lines
   of belt and braces beats reasoning about which element is the scroller on a
   browser nobody here can test.

   The scroll position is captured and restored, because a locked page can
   otherwise reopen at the top and lose a foreman's place in a long sheet. */
/* The caller's own name is kept — it says which dialog is holding the page, and
   two surfaces already style theirs — but the class that DOES the locking is
   this one, defined once in globals.css.

   Because the name was the only thing being added, a caller who passed a name
   with no stylesheet rule behind it got a lock that silently did nothing. Three
   of the five call sites were in that state when this was found: the SCAN SHEET
   modal Curtis reported, the mystery-bus location editor, and the first-run
   welcome. Nobody could have seen it by reading the call site. */
export const PAGE_SCROLL_LOCKED="page-scroll-locked";
export function lockPageScroll(name:string){
 if(typeof document==="undefined")return ()=>{};
 const root=document.documentElement,body=document.body;
 const top=root.scrollTop||body.scrollTop||0;
 root.classList.add(name,PAGE_SCROLL_LOCKED);
 body.classList.add(name,PAGE_SCROLL_LOCKED);
 return ()=>{
  root.classList.remove(name,PAGE_SCROLL_LOCKED);
  body.classList.remove(name,PAGE_SCROLL_LOCKED);
  /* Restoring on the next frame: removing the class has to take effect before
     the page is tall enough to scroll back to where it was. */
  requestAnimationFrame(()=>{root.scrollTop=top;body.scrollTop=top});
 };
}
