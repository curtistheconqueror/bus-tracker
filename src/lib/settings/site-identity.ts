/* WHOSE GARAGE THIS IS, in one place.

   Curtis: *"when we're ready to ship this app inside of... if we're ready to go
   ahead and give it to like Pace or any other organization where they can
   seamlessly plug it in to their own infrastructure, whether they're beyond
   their private servers or otherwise, we have to always keep that design spec
   in mind."*

   `APP_NAME` in `src/components/shared/app-name.tsx` already does this for the
   PRODUCT's name, with a comment saying changing it is one line plus the
   manifest. The ORGANISATION's name had no such line: it was typed into four
   share modules, each in a `<title>` and again in a header, and a fifth was
   added the day this was written — which is how a string becomes unfindable.

   It lives in `src/lib` rather than beside `APP_NAME` because the four callers
   are domain modules and that file is a `"use client"` component. A `.ts` module
   importing React is the one direction `docs/ARCHITECTURE.md` refuses.

   WHAT THIS IS NOT. It is not a tenant system and does not pretend to be. The
   site's own geometry is still described in six places — see
   `docs/roadmap/facility-config.md`, which measured it — and sixty storage keys
   carry a `pace-` prefix that CLAUDE.md forbids renaming. This is the one string
   a second garage would otherwise find in four files, and it is the first step
   of a list rather than the end of one.

   The two Fleet Status Report modules already take their title as an option and
   fall back to this; they keep doing that, because a report somebody sends to a
   superintendent is a document whose heading they may want to set per send. */
export const SITE_ORGANIZATION="Pace South";

/* THE SHOUTED FORM, for the band across the top of a shared page.

   Derived rather than stored, so the two cannot drift: a second constant
   holding "PACE SOUTH" is exactly the duplication this module exists to
   remove, and `toUpperCase()` is right for every name a garage is likely to
   have. A name that needs different capitals when shouted can take a second
   export then, with a reason written beside it. */
export const SITE_ORGANIZATION_CAPS=SITE_ORGANIZATION.toUpperCase();
