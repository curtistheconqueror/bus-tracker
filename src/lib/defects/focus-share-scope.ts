/* WHAT A FOCUSED BUS'S SHARE CARRIES, and the two different reasons a defect
   can be missing from it.

   THE SHARE NOW FOLLOWS THE WINDOW, and that reverses an earlier decision with
   Curtis's own words on it. The focus share was built from the UNFILTERED
   records because he asked for exactly that — *"share all the defects with a
   bus"* — and the panel printed a row saying when that was more than the
   screen showed.

   He then hit the other side of it from the floor: *"when I hit like the last
   24 hours of the shift, it gives me buses, but I think it's giving me more
   than the defects that I put down in the last 24 hours or the current
   shift."* Asked which way he wanted it, he chose the window, with a
   per-defect hide on top: *"Follow the window, and add the swipe."* Both
   readings were reasonable; this is the one he picked after seeing what the
   first one produced, and the first one is recorded here rather than deleted
   because it is why the share ever carried the whole bus.

   TWO REASONS, COUNTED APART, because they are not the same statement. A
   defect the WINDOW held back is still on the bus and the share is narrower
   than the bus; a defect somebody SWIPED AWAY is a person saying "not this
   one". A single "hidden" count would blur a filter into a decision.

   NOTHING HERE TOUCHES A DEFECT. An exclusion is a property of this look at
   this bus — it is a set of ids held while the panel is open, never a field on
   a record. That is deliberate and it is not merely tidiness: the Shop Cloud
   ships every field it has no column for inside a defect's `detail` blob, and
   a merge replaces a defect wholesale by id, so a "don't send this one" flag
   stored on the record would reach every other phone in the shop and hide the
   defect on all of them. The same reason a HOLD and a FULL SWEEP never
   travel. */

export type FocusShareCandidate = { defect: { id?: string } };

export type FocusShareScope<T> = {
  /* What the share carries. */
  rows: T[];
  /* Every defect on the bus, whatever the board is set to. */
  total: number;
  /* On the bus but outside what the board is showing - the window, the state
     filter or the search. */
  hiddenByBoard: number;
  /* On screen, and swiped away by hand. */
  hiddenByHand: number;
};

const idOf = (record: FocusShareCandidate) => String(record?.defect?.id || "");

export function focusShareScope<T extends FocusShareCandidate>(
  onScreen: T[],
  all: T[],
  excludedIds: Iterable<string> = [],
): FocusShareScope<T> {
  const excluded = new Set([...excludedIds].map(String));
  const rows = onScreen.filter(record => !excluded.has(idOf(record)));
  return {
    rows,
    total: all.length,
    /* NEVER NEGATIVE. `onScreen` is meant to be a subset of `all`, but the two
       are assembled by different code paths on the page and a future change
       could hand this a wider on-screen list; reporting "-1 held back" would
       be worse than reporting none. */
    hiddenByBoard: Math.max(0, all.length - onScreen.length),
    hiddenByHand: onScreen.length - rows.length,
  };
}

/* THE EXCLUSION LIST IS ORDERED, newest last, which is what makes one PUT BACK
   mean "the one I just swiped" rather than "some one of them". */
export function excludeFromFocusShare(excluded: string[], id: string): string[] {
  const clean = String(id || "");
  if (!clean || excluded.includes(clean)) return excluded;
  return [...excluded, clean];
}

/* PUT BACK TAKES THE LAST ONE OFF, and reports which it was so the page can
   say so. An empty list returns itself rather than a new array, so a stray
   press cannot cause a re-render that does nothing.

   `visibleIds` IS WHAT IS ON SCREEN RIGHT NOW, and passing it does two
   different jobs that a cold read showed are not the same job.

   The first is the one it was added for: a defect swiped away and then taken
   off screen by the window, the filter or a sync leaves an id in the list that
   `hiddenByHand` no longer counts, and popping THAT one restores nothing while
   the button still reads PUT BACK. The press looks broken.

   The second is the one the first fix got wrong. The page did the filtering
   itself and stored the FILTERED list, so pressing PUT BACK threw away every
   off-screen exclusion as a side effect: swipe A and B away, let A leave the
   view, press PUT BACK to restore B, and A is silently un-excluded too - widen
   the window again and A is back in the share although nobody put it back.
   The off-screen ids are kept here; only the last VISIBLE one is removed. */
export function putBackLastExclusion(
  excluded: string[],
  visibleIds?: Iterable<string>,
): { excluded: string[]; restored: string | null } {
  if (!excluded.length) return { excluded, restored: null };
  if (visibleIds === undefined) return { excluded: excluded.slice(0, -1), restored: excluded[excluded.length - 1] };
  const visible = new Set([...visibleIds].map(String));
  for (let at = excluded.length - 1; at >= 0; at--) {
    if (!visible.has(excluded[at])) continue;
    return { excluded: excluded.filter((_, index) => index !== at), restored: excluded[at] };
  }
  /* Nothing on screen is hidden, so there is nothing to put back - and the same
     array comes back, so a stray press is not a re-render. */
  return { excluded, restored: null };
}

/* IS THERE ANYTHING TO SEND?

   Hiding every row and pressing COPY sent, for a bus with three open defects:
   "0 defects — shared …" and then "No defects on this bus." A recipient reads
   that as the bus being clean, which is the most damaging thing this app could
   say about a vehicle. It was unreachable before the share followed the
   window - the share was always the whole bus - and the swipe made it
   reachable.

   The three outputs ask this and refuse rather than send an empty bus. */
export function focusShareIsEmpty(scope: FocusShareScope<FocusShareCandidate>): boolean {
  return scope.rows.length === 0;
}

/* WHAT THE PANEL SAYS ABOVE THE SHARE BUTTONS. Written here rather than in the
   page because it is the one sentence that has to stay true to the two counts
   above, and the two counts are computed here.

   AN EARLIER VERSION OF THIS LINE CLAIMED THE MCP ROUTE ASKS THE SAME QUESTION
   ABOUT A BUS. It does not: PR39's five tools are read-only and none of them
   has a share, a window or an exclusion list. The rule for where this lives is
   the general one and it is enough on its own - a decision written inside a
   `page.tsx` is reachable by that page and nothing else, so the moment anything
   wants it there are two of it. Claiming a caller that does not exist is how a
   reader stops trusting the rest of the comment.

   Silent when the share is the whole bus: a row saying "sharing 3 of 3" is
   noise. */
export function focusShareScopeNote(scope: FocusShareScope<FocusShareCandidate>): string {
  const held: string[] = [];
  if (scope.hiddenByBoard) held.push(scope.hiddenByBoard + " OUTSIDE THIS VIEW");
  if (scope.hiddenByHand) held.push(scope.hiddenByHand + " YOU SWIPED AWAY");
  if (!held.length) return "";
  /* WITH NOTHING LEFT, SAY SO RATHER THAN COUNT. "SHARING 0 OF 3" is a number
     where a person needs an instruction. */
  if (!scope.rows.length) return "NOTHING LEFT TO SHARE — " + held.join(", ");
  return "SHARING " + scope.rows.length + " OF " + scope.total + " — " + held.join(", ");
}

/* DID THAT DRAG MEAN "HIDE THIS", or was somebody scrolling?

   THE FOCUS PANEL SCROLLS VERTICALLY UNDER THE SAME THUMB, which is why this
   is a decision rather than a distance test. The Facility Map learned it the
   expensive way and wrote it down: a bare distance test made every scroll a
   move, because "the map is 4366px tall on a 390px phone and a bus token is
   most of what is under a thumb, so a plain swipe up carried garage-6 to
   wall-7 and scrolled the page zero pixels."

   So THREE conditions, all of them: far enough to be deliberate, LEFT rather
   than right, and clearly more sideways than up - the axis lock. A gesture
   that fails any of them is a scroll, and the row must be left alone.

   LEFT ONLY, because the two directions should not both destroy something and
   Curtis asked for one: "I would like to swipe left to get rid of a defect". */
export const SWIPE_COMMIT_PX = 56;
export const SWIPE_AXIS_RATIO = 1.5;

export function swipeHidesRow(dx: number, dy: number): boolean {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  /* Leftward only. */
  if (dx > -SWIPE_COMMIT_PX) return false;
  /* And the sideways travel has to beat the vertical by a clear margin, so a
     diagonal flick while scrolling does not count. */
  return Math.abs(dx) > Math.abs(dy) * SWIPE_AXIS_RATIO;
}

/* How far to draw the row as having followed the finger, which is capped so a
   long drag does not pull a row off its own panel. Right-ward drag reads as
   zero rather than as a positive offset: there is nothing to the right. */
export function swipeOffsetPx(dx: number): number {
  if (!Number.isFinite(dx) || dx >= 0) return 0;
  return Math.max(dx, -(SWIPE_COMMIT_PX + 24));
}
