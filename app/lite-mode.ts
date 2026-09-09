/* What LITE draws less of.

   ONE RULE, and it is the constraint the whole feature rests on: nothing in
   this file may ever reach a record. Lite changes what is DRAWN, never what is
   STORED, never what is SYNCED, and never what is READ BACK. A Lite phone and a
   full phone sit side by side on the same Shop Cloud writing the same rows to
   the same keys, and neither can tell what the other is running.

   That is enforced rather than promised: every export here is a boolean about
   a piece of UI, there is no branch on mode inside any save path, and a test
   asserts that no storage-writing function in the app consults the mode. If a
   rule here ever needs to change a record, the design has gone wrong and should
   be stopped rather than worked around.

   It is not a permission either. Anyone holding the device can turn it off in
   Settings. Curtis: "It's not so much a permissions thing as it is a training
   purpose."

   Written as "hidden in lite" rather than "shown in full" on purpose: a feature
   added later is visible everywhere until somebody deliberately hides it, which
   is the safe direction to fail in. */

import type {AppMode} from "./app-mode.ts";

/* Named so the call site reads as a sentence: hiddenInLite(mode,"advancedActions"). */
export const LITE_HIDDEN=[
 /* The whole surface. Fleet Campaigns is planned work read a campaign at a
    time, not something a new person meets on a shift. */
 "campaignsPage",
 /* Both sheets: the controls that are not used on every visit, already grouped
    behind one button in releases 161 and 163. Lite is that judgement taken one
    step further, which is most of why it is cheap. */
 "advancedActions",
 /* DEFERRED, everywhere it appears: the tick in the defect form, the 90-minute
    badge, the evening review prompt and the board on the Down Sheet.

    Curtis: "Deferred feature is definitely not something for Lite." It is a
    judgement about whether a bus can run — held back without being escalated —
    carrying a clock and an alarm and a board of its own. That is a decision
    somebody with standing makes, not workflow a new person is learning.

    A Lite device still STORES a deferred bus exactly as a full device does, and
    still syncs it. It does not draw the controls. */
 "deferred",
 /* The defect form's second half. A new person reports what is wrong with a
    bus; diagnosis, findings, parts, hours and work states are for the person
    who fixes it, and an empty field asked of somebody who does not know the
    answer is how bad data gets entered. */
 "diagnosisFields",
 /* Counting and capacity tiles beyond the ones that answer "how many buses am
    I down". */
 "extraTiles",
 /* Anything that moves or rewrites the whole board: MASTER EXPORT, MASTER
    IMPORT, RESTORE LAST GOOD COPY, the per-section transfers, EXPORT HISTORY
    REPORT. Not because a new person is untrusted — because these are the
    controls where a wrong press is expensive and there is no reason to meet
    them on day one. */
 "bulkDataTools",
 /* UNDO LAST and the other step-back controls. Same reasoning inverted: they
    only make sense once you know what you did. */
 "undoTools",
 /* The wording, colour and font controls. A new person learning the app should
    be looking at the same screen everybody describes to them. */
 "appearanceTools",
 /* Signing the device in or out of Shop Cloud, repointing it, or pulling the
    shop's copy over the top of this one. The engine keeps running — a Lite
    device syncs, which is the whole point of one shop board — but the controls
    that could disconnect it are not on day one either. */
 "cloudConnection",
] as const;
export type LiteHidden=(typeof LITE_HIDDEN)[number];

export function hiddenInLite(mode:AppMode,feature:LiteHidden){return mode==="lite"&&LITE_HIDDEN.includes(feature)}
/* The inverse, because most call sites read better as "show this". */
export function shownIn(mode:AppMode,feature:LiteHidden){return !hiddenInLite(mode,feature)}
