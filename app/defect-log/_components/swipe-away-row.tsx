"use client";

/* SWIPE A DEFECT OUT OF THE SHARE, with a button that does the same thing.

   Curtis: *"I would like to swipe left to get rid of a defect and have a quick
   undo button to bring it back, and that way I can just share buses with
   selected defects in them."*

   IT IS NOT ONLY A SWIPE, and that is not a liberty. He reads this app on a
   phone and on the shop computer, and a gesture is unreachable with a mouse,
   unreachable from a keyboard, and invisible to anybody who was not told it
   exists. So every row carries a HIDE control that does exactly what the
   gesture does; the swipe is the shortcut, not the only door.

   THE GESTURE DECISION IS NOT IN THIS FILE. Whether a drag counted as a swipe
   is `swipeHidesRow` in src/lib/defects/focus-share-scope.ts, with the three
   conditions and the reason for each. This file reports finger movement and
   draws the result.

   WHY AN AXIS LOCK RATHER THAN A DISTANCE. This panel scrolls vertically under
   the same thumb. The Facility Map already paid for the naive version and
   wrote it down: a plain distance test "carried garage-6 to wall-7 and
   scrolled the page zero pixels". So a drag has to be clearly more sideways
   than vertical before it counts.

   IT NEEDS `touch-action:pan-y` ON THE ROW, AND THE FIRST VERSION OF THIS NOTE
   HAD THAT EXACTLY BACKWARDS. It claimed no `touch-action` was needed because
   "a horizontal drag inside a vertical scroller does not scroll it anyway, so
   there is nothing to suppress". That is not how the browser works: with
   `touch-action:auto` it claims the gesture as soon as a finger moves and
   sends `pointercancel`, which `onPointerCancel` below correctly treats as "not
   a swipe" - so on a phone the swipe NEVER fired. Reproduced with a real CDP
   touch drag at 390px: `pointerdown > pointermove > pointercancel`, three rows
   still there. It worked with a mouse, which is why it looked fine on the shop
   computer. `pan-y` keeps VERTICAL panning with the browser and hands
   horizontal movement to this code; `none` would take the scroll away and is
   what the test bans.

   A MOUSE NEVER STARTS A SWIPE. Selecting the text of a defect with a leftward
   drag is an ordinary thing to do with a mouse, and it would otherwise satisfy
   the same three conditions and silently drop that defect from the share.
   Desktop hides with the button.

   AND IT SAYS WHICH WAY IT WAS HIDDEN. `onHide` is handed "button" or "swipe"
   because the page does different things with them: a press came FROM a control
   that is about to be unmounted, so focus has to be put somewhere or it falls
   to the document body, while a swipe came from a thumb that holds no focus and
   whose panel must not scroll itself to a control nobody asked for. One
   parameter rather than two props, so a caller cannot wire one and forget the
   other. */

import { useRef, useState } from "react";
import { swipeHidesRow, swipeOffsetPx } from "@/src/lib/defects/focus-share-scope";

export default function SwipeAwayRow({
  className,
  onHide,
  hideLabel,
  children,
}: {
  className?: string;
  onHide: (via: "button" | "swipe") => void;
  hideLabel: string;
  children: React.ReactNode;
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);

  const end = (commit: boolean) => {
    start.current = null;
    setOffset(0);
    if (commit) onHide("swipe");
  };

  return (
    <article
      className={className}
      style={offset ? { transform: "translateX(" + offset + "px)" } : undefined}
      onPointerDown={event => {
        /* A PRIMARY TOUCH ONLY. A second finger landing mid-drag would restart
           the measurement from its own position, which reads as a jump back;
           and a mouse drag is text selection, not a gesture. */
        if (!event.isPrimary || event.pointerType === "mouse") return;
        /* CAPTURED, so a drag that leaves the row still reports its end here.
           Without it a gesture ending outside the element never reached
           `onPointerUp` and left the row stuck mid-swipe with its start point
           still armed for the next move. */
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* not fatal */ }
        start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
      }}
      onPointerMove={event => {
        const from = start.current;
        if (!from || from.id !== event.pointerId) return;
        const dx = event.clientX - from.x, dy = event.clientY - from.y;
        /* ONCE IT IS CLEARLY A SCROLL, STOP FOLLOWING THE FINGER. Without this
           the row creeps sideways during a diagonal scroll and then snaps
           back, which looks like a bug even though nothing was hidden. */
        if (Math.abs(dy) > Math.abs(dx)) { setOffset(0); return; }
        setOffset(swipeOffsetPx(dx));
      }}
      onPointerUp={event => {
        const from = start.current;
        if (!from || from.id !== event.pointerId) return end(false);
        end(swipeHidesRow(event.clientX - from.x, event.clientY - from.y));
      }}
      /* A CANCELLED POINTER IS NOT A SWIPE. The browser cancels when it decides
         the gesture belongs to a scroll, which is exactly the case this must
         not treat as a decision to hide something. */
      onPointerCancel={() => end(false)}
      /* AND LOSING THE CAPTURE ENDS IT TOO, so nothing is left armed or
         half-moved if the browser takes the pointer away. */
      onLostPointerCapture={() => { if (start.current) end(false); }}
    >
      {/* BEFORE THE CONTENT, BECAUSE IT IS DRAWN ABOVE IT. The button is
          `position:absolute` in the row's TOP-RIGHT corner, and it used to be
          the last child - so a keyboard reached it after EDIT DEFECT, MARK
          FIXED and PTR, four stops below where it visibly sits. Tab order has
          to follow the eye (WCAG 2.4.3); absolute positioning means moving it
          in the markup costs nothing on screen. */}
      <button
        type="button"
        className="focus-hide-defect"
        onClick={() => onHide("button")}
        /* THE LABEL NAMES THE DEFECT; THE GESTURE RIDES THE TITLE, and the
           comment here used to claim otherwise - that the gesture was "named in
           the accessible label ... so speech input can say it". It is not: a
           `title` beside an `aria-label` becomes the accessible DESCRIPTION,
           and speech input (Voice Control, Dragon) matches the accessible NAME.
           Measured through CDP: name "Hide Brakes from this share",
           description "… — or swipe the row left". A screen reader does reach
           the hint, so the swipe is still discoverable; it is not SAYABLE, and
           the label stays short because four rows of "Hide X from this share —
           or swipe the row left" is what a screen reader would then read on
           every one. */
        aria-label={hideLabel}
        title={hideLabel + " — or swipe the row left"}
      >
        <span aria-hidden="true">&times;</span>
        <b>HIDE</b>
      </button>
      {children}
    </article>
  );
}
