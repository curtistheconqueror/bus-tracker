/* WHERE THE BUS QUICK VIEW GOES, as arithmetic rather than as three guesses
   scattered through a component.

   The card is `position:fixed` and drawn with `translate(-50%,-100%)` when it
   sits above a bus, so `top` is its BOTTOM edge and `left` is its CENTRE. That
   one fact is what every bug here has come from: its real top is `top-height`,
   and nothing knew the height until the browser had laid the card out.

   Three faults in a row, all measured on a phone and all fixed here:

   1. The horizontal clamp hard-coded a half-width of 100 against a card capped
      at 250, so a bus near the left edge put up to 25px of the card off that
      side and cut the labels off it.
   2. `below` was `rect.top<150` — a guess at the height, made before the card
      existed — so a tall card ran straight off the top. Measured: 628px of
      card with its top 227px above a 390x844 viewport.
   3. The first repair of 2 pinned the card's BOTTOM to the viewport instead of
      its top whenever the card was taller than the screen less its margins,
      which put it off the top again on a 667-tall iPhone SE. The `Math.min`
      doing that was not merely wrong, it was unreachable logic: nothing in
      that branch can push the card past the bottom.

   It is a pure function so those three are arithmetic a test can drive at any
   viewport, rather than something only a browser can answer. */

export const QUICK_MAX_WIDTH=250;
/* The gap between the bus and the card, and the margin the card keeps from the
   edge of the screen. */
const GAP=12,EDGE=10;

export type QuickAnchor={left:number;right:number;top:number;bottom:number};
export type QuickViewport={width:number;height:number};

/* `width` and `height` are the card's REAL measured box. Before it has been
   measured, pass the cap and 0 — the caller places it once from the guess and
   again from the measurement, and only the second one is trusted. */
export function quickViewPosition(anchor:QuickAnchor,card:{width:number;height:number},view:QuickViewport){
 /* THE CARD'S OWN WIDTH, not the cap. `width:max-content` means a short card
    is narrower than 250, and clamping by the cap over-indents it until the
    arrow — `left:50%` of the card — stops pointing at the bus. */
 const half=Math.min(Math.max(card.width,1)/2,Math.max(1,(view.width-EDGE*2)/2));
 const left=Math.min(view.width-half-EDGE,Math.max(half+EDGE,(anchor.left+anchor.right)/2));

 const fitsAbove=anchor.top-GAP-card.height>=EDGE;
 const fitsBelow=anchor.bottom+GAP+card.height<=view.height-EDGE;
 /* ABOVE IF IT FITS, BELOW IF THAT FITS, AND OTHERWISE PINNED BY ITS TOP.
    A card taller than the screen cannot be made to fit — it is
    `pointer-events:none` and can never be scrolled — so the top is what is
    kept, because the bus number, its status and its badges are up there and
    the repair names are the part somebody opens the bus for anyway. */
 const top=fitsAbove?anchor.top-GAP
  :fitsBelow?anchor.bottom+GAP
  :EDGE+card.height;
 return {left,top,below:!fitsAbove&&fitsBelow};
}
