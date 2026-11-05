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

   AND IT DOES NOT BLOCK SCROLLING. No `touch-action:none`, no non-passive
   `touchmove`, no `preventDefault`: a vertical drag is left entirely to the
   browser, which is what keeps the panel scrollable. A horizontal drag inside
   a vertical scroller does not scroll it anyway, so there is nothing to
   suppress - the map needed to block scroll because its gesture was vertical
   too, and this one never is. */

import { useRef, useState } from "react";
import { swipeHidesRow, swipeOffsetPx } from "@/src/lib/defects/focus-share-scope";

export default function SwipeAwayRow({
  className,
  onHide,
  hideLabel,
  children,
}: {
  className?: string;
  onHide: () => void;
  hideLabel: string;
  children: React.ReactNode;
}) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [offset, setOffset] = useState(0);

  const end = (commit: boolean) => {
    start.current = null;
    setOffset(0);
    if (commit) onHide();
  };

  return (
    <article
      className={className}
      style={offset ? { transform: "translateX(" + offset + "px)" } : undefined}
      onPointerDown={event => {
        /* A PRIMARY POINTER ONLY. A second finger landing mid-drag would
           otherwise restart the measurement from its own position, which reads
           as a sudden jump back. */
        if (!event.isPrimary) return;
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
    >
      {children}
      <button
        type="button"
        className="focus-hide-defect"
        onClick={onHide}
        /* The gesture is named in the accessible label so somebody using a
           screen reader learns it exists, and so speech input can say it. */
        aria-label={hideLabel}
        title={hideLabel + " — or swipe the row left"}
      >
        <span aria-hidden="true">&times;</span>
        <b>HIDE</b>
      </button>
    </article>
  );
}
